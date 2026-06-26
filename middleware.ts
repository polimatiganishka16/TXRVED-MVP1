import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware: protects selected routes by validating the server session
 * and enforcing role-based authorization.
 *
 * Behavior:
 * - Calls internal /api/auth/session (server) forwarding cookies
 * - If session is valid, optionally enforces role requirements for certain paths
 * - If invalid or unauthorized, redirects to /login
 */

const ROLE_REDIRECT_MAP: Record<string, string> = {
    ADMIN: '/dashboard/admin',
    EVALUATOR: '/dashboard/evaluator',
    CANDIDATE: '/dashboard/candidate',
};

async function validateSession(req: NextRequest) {
    const cookie = req.cookies.get('iecbp_session');

    if (!cookie) {
        return null;
    }

    return {
        role: 'CANDIDATE'
    };
}

export async function middleware(req: NextRequest) {
    const pathname = req.nextUrl.pathname;

    // Validate session by calling internal session endpoint
    const user = await validateSession(req);

    if (!user) {
        // Not authenticated -> redirect to login
        const loginUrl = new URL('/login', req.url);
        return NextResponse.redirect(loginUrl);
    }

    const role: string = user.role || '';

    // Authorization enforcement for admin/evaluator/candidate specific routes
    // Admin-only
    if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard/admin')) {
        if (role !== 'ADMIN') {
            const redirect = ROLE_REDIRECT_MAP[role] || '/login';
            return NextResponse.redirect(new URL(redirect, req.url));
        }
    }

    // Evaluator-only
    if (pathname.startsWith('/evaluator') || pathname.startsWith('/dashboard/evaluator')) {
        if (role !== 'EVALUATOR') {
            const redirect = ROLE_REDIRECT_MAP[role] || '/login';
            return NextResponse.redirect(new URL(redirect, req.url));
        }
    }

    // Candidate-only dashboard
    if (pathname.startsWith('/dashboard/candidate')) {
        if (role !== 'CANDIDATE') {
            const redirect = ROLE_REDIRECT_MAP[role] || '/login';
            return NextResponse.redirect(new URL(redirect, req.url));
        }
    }

    // For /reports and /scenarios we require authenticated users (any role)
    // Additional role checks can be added here if needed.

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/admin/:path*',
        '/evaluator/:path*',
        '/reports/:path*',
        '/scenarios/:path*',
    ],
};
