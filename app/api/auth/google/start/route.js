const { NextResponse } = require('next/server');
const {
    createCodeChallenge,
    createRandomValue,
    getApplicationOrigin,
    getGoogleOAuthConfig,
    setOAuthCookies,
} = require('../../../../../lib/googleOAuth');

export async function GET() {
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
        const loginUrl = new URL('/login', application.origin);
        loginUrl.searchParams.set('google_error', 'unavailable');
        return NextResponse.redirect(loginUrl);
    }

    const state = createRandomValue();
    const nonce = createRandomValue();
    const verifier = createRandomValue();
    const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authorizationUrl.search = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        nonce,
        code_challenge: createCodeChallenge(verifier),
        code_challenge_method: 'S256',
    }).toString();

    const response = NextResponse.redirect(authorizationUrl);
    setOAuthCookies(response, { state, nonce, verifier }, config.secure);
    return response;
}
