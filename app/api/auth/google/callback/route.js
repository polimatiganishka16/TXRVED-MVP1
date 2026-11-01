const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { NextResponse } = require('next/server');
const { parseCookies, serializeCookie, signToken } = require('../../../../../lib/session');
const {
    COOKIE_NAMES,
    clearOAuthCookies,
    getApplicationOrigin,
    getGoogleOAuthConfig,
    timingSafeStringEqual,
} = require('../../../../../lib/googleOAuth');

const prisma = new PrismaClient();
const GOOGLE_JWKS_URL = new URL('https://www.googleapis.com/oauth2/v3/certs');
let googleJwks;

function redirectToLogin(application, errorCode) {
    const loginUrl = new URL('/login', application.origin);
    loginUrl.searchParams.set('google_error', errorCode);
    const response = NextResponse.redirect(loginUrl);
    clearOAuthCookies(response, application.secure);
    return response;
}

async function verifyGoogleIdToken(idToken, config, expectedNonce) {
    const { createRemoteJWKSet, jwtVerify } = await import('jose');
    if (!googleJwks) {
        googleJwks = createRemoteJWKSet(GOOGLE_JWKS_URL);
    }

    const { payload } = await jwtVerify(idToken, googleJwks, {
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
        audience: config.clientId,
        requiredClaims: ['exp', 'iss', 'sub', 'aud', 'nonce', 'email', 'email_verified'],
    });

    if (
        typeof payload.exp !== 'number' ||
        payload.exp <= Math.floor(Date.now() / 1000) ||
        typeof payload.sub !== 'string' ||
        !timingSafeStringEqual(String(payload.nonce), expectedNonce) ||
        payload.email_verified !== true ||
        typeof payload.email !== 'string'
    ) {
        throw new Error('Google identity token claims are invalid');
    }

    const email = payload.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Google identity email is invalid');
    }

    return {
        email,
        name: typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim() : null,
    };
}

async function findUserByNormalizedEmail(email) {
    return prisma.user.findFirst({
        where: {
            email: {
                equals: email,
                mode: 'insensitive',
            },
        },
    });
}

async function createCandidateAccount(identity) {
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const password = await bcrypt.hash(randomPassword, 10);

    return prisma.$transaction(async (transaction) => {
        const user = await transaction.user.create({
            data: {
                name: identity.name,
                email: identity.email,
                password,
                role: 'CANDIDATE',
                isVerified: true,
            },
        });

        await transaction.candidate.create({
            data: {
                userId: user.id,
                candidate_code: `CAND${String(user.id).padStart(4, '0')}`,
                name: user.name || 'Candidate',
            },
        });

        return user;
    });
}

export async function GET(request) {
    let application;
    try {
        application = getApplicationOrigin();
    } catch {
        return new Response('Google sign-in is unavailable', { status: 500 });
    }

    let config;
    try {
        config = getGoogleOAuthConfig(application);
    } catch {
        return redirectToLogin(application, 'unavailable');
    }

    const cookies = parseCookies(request.headers.get('cookie'));
    const stateCookie = cookies[COOKIE_NAMES.state];
    const nonceCookie = cookies[COOKIE_NAMES.nonce];
    const verifierCookie = cookies[COOKIE_NAMES.verifier];
    const query = new URL(request.url).searchParams;

    if (
        !stateCookie ||
        !nonceCookie ||
        !verifierCookie ||
        !query.get('state') ||
        !timingSafeStringEqual(query.get('state'), stateCookie)
    ) {
        return redirectToLogin(application, 'failed');
    }

    if (query.has('error')) {
        return redirectToLogin(application, 'failed');
    }

    const code = query.get('code');
    if (!code) {
        return redirectToLogin(application, 'failed');
    }

    try {
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: config.clientId,
                client_secret: config.clientSecret,
                code,
                code_verifier: verifierCookie,
                grant_type: 'authorization_code',
                redirect_uri: config.redirectUri,
            }),
            cache: 'no-store',
            signal: AbortSignal.timeout(10000),
        });

        if (!tokenResponse.ok) {
            return redirectToLogin(application, 'failed');
        }

        const tokenData = await tokenResponse.json();
        if (typeof tokenData.id_token !== 'string') {
            return redirectToLogin(application, 'failed');
        }

        const identity = await verifyGoogleIdToken(tokenData.id_token, config, nonceCookie);
        let user = await findUserByNormalizedEmail(identity.email);

        if (user && user.role !== 'CANDIDATE') {
            return redirectToLogin(application, 'candidate_only');
        }

        if (!user) {
            try {
                user = await createCandidateAccount(identity);
            } catch (error) {
                if (error?.code !== 'P2002') {
                    throw error;
                }

                user = await findUserByNormalizedEmail(identity.email);
                if (!user) {
                    throw error;
                }
                if (user.role !== 'CANDIDATE') {
                    return redirectToLogin(application, 'candidate_only');
                }
            }
        }

        if (user.role !== 'CANDIDATE') {
            return redirectToLogin(application, 'candidate_only');
        }

        const safeUser = { id: user.id, email: user.email, role: user.role, name: user.name };
        const response = NextResponse.redirect(new URL('/dashboard/candidate', application.origin));
        clearOAuthCookies(response, application.secure);
        response.headers.append('Set-Cookie', serializeCookie(signToken(safeUser)));
        return response;
    } catch {
        console.error('GOOGLE OAUTH CALLBACK ERROR');
        return redirectToLogin(application, 'failed');
    }
}
