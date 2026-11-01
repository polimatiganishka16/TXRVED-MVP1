const crypto = require('crypto');

const CALLBACK_PATH = '/api/auth/google/callback';
const COOKIE_PATH = '/api/auth/google';
const COOKIE_MAX_AGE = 10 * 60;
const COOKIE_NAMES = {
    state: 'txrv_google_state',
    nonce: 'txrv_google_nonce',
    verifier: 'txrv_google_verifier',
};

function getApplicationOrigin() {
    const configuredOrigin = process.env.NEXT_PUBLIC_BASE_URL;
    if (!configuredOrigin) {
        throw new Error('Application origin is not configured');
    }

    let url;
    try {
        url = new URL(configuredOrigin);
    } catch {
        throw new Error('Application origin is invalid');
    }

    const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
    if (
        (url.protocol !== 'https:' && !(url.protocol === 'http:' && localHosts.has(url.hostname))) ||
        url.pathname !== '/' ||
        url.search ||
        url.hash ||
        url.username ||
        url.password
    ) {
        throw new Error('Application origin must be a canonical origin');
    }

    return {
        origin: url.origin,
        secure: url.protocol === 'https:',
    };
}

function getGoogleOAuthConfig(application) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        throw new Error('Google OAuth credentials are not configured');
    }

    return {
        ...application,
        clientId,
        clientSecret,
        redirectUri: new URL(CALLBACK_PATH, application.origin).toString(),
    };
}

function createRandomValue() {
    return crypto.randomBytes(32).toString('base64url');
}

function createCodeChallenge(verifier) {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
}

function setOAuthCookies(response, values, secure) {
    for (const [key, value] of Object.entries(values)) {
        response.cookies.set(COOKIE_NAMES[key], value, {
            httpOnly: true,
            secure,
            sameSite: 'lax',
            path: COOKIE_PATH,
            maxAge: COOKIE_MAX_AGE,
        });
    }
}

function clearOAuthCookies(response, secure) {
    for (const name of Object.values(COOKIE_NAMES)) {
        response.cookies.set(name, '', {
            httpOnly: true,
            secure,
            sameSite: 'lax',
            path: COOKIE_PATH,
            maxAge: 0,
        });
    }
}

function timingSafeStringEqual(left, right) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

module.exports = {
    CALLBACK_PATH,
    COOKIE_NAMES,
    clearOAuthCookies,
    createCodeChallenge,
    createRandomValue,
    getApplicationOrigin,
    getGoogleOAuthConfig,
    setOAuthCookies,
    timingSafeStringEqual,
};
