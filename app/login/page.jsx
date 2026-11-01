"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const url = new URL(window.location.href);
        const googleError = url.searchParams.get('google_error');
        const messages = {
            candidate_only: 'Google login is available for candidate accounts only. Please use your regular login.',
            unavailable: 'Google sign-in is not configured. Please use your regular login.',
            failed: 'Google sign-in could not be completed. Please try again.',
        };

        if (googleError) {
            if (messages[googleError]) {
                window.setTimeout(() => setError(messages[googleError]), 0);
            }
            url.searchParams.delete('google_error');
            window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
        }
    }, []);

    function validate() {
        if (!email || !password) return 'Email/Candidate Code and password are required.';
        return null;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        const v = validate();
        if (v) {
            setError(v); return;
        }
        setLoading(true);
        try {
            const loginEndpoint = new URL('/api/auth/login', window.location.origin).toString();
            const res = await fetch(loginEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
                cache: 'no-store'
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data?.message || 'Login failed');
                setLoading(false);
                return;
            }

            // success: redirect based on role
            const role = data?.user?.role;
            // persist user in localStorage
            try { const { setAuthUser } = await import('../../components/auth/auth'); setAuthUser(data.user); } catch (e) { /* ignore */ }

            if (role === 'ADMIN') router.push('/dashboard/admin');
            else if (role === 'EVALUATOR') router.push('/dashboard/evaluator');
            else router.push('/dashboard/candidate');
        } catch (err) {
            console.error(err);
            setError('Unexpected error');
        } finally { setLoading(false); }
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f1623 0%, #121826 40%, #182235 70%, #1a2540 100%)', padding: '3rem' }}>
            <div style={{ position: 'absolute', top: '2rem', left: '2rem' }}>
                <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.8)', color: '#E2E8F0', fontWeight: 500, fontSize: '14px', cursor: 'pointer' }}>← Back to Home</button>
            </div>
            <form onSubmit={handleSubmit} style={{ width: '420px', background: 'linear-gradient(145deg,#0f172a,#111827)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h2 style={{ fontFamily: "'Playfair Display', serif", color: '#F8FAFC', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Sign in</h2>
                <p style={{ color: '#94A3B8', marginBottom: '1rem' }}>Enter your credentials to continue.</p>
                {error && <div style={{ marginBottom: '12px', padding: '10px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', color: '#FCA5A5' }}>{error}</div>}

                <label style={{ display: 'block', color: '#94A3B8', marginBottom: '6px' }}>Email or Candidate Code</label>
                <input value={email} onChange={e => setEmail(e.target.value)} className="w-full mb-3 p-3 rounded-lg bg-slate-900/40 border border-white/6 text-slate-200" placeholder="name@example.com or CAND0001" />

                <label style={{ display: 'block', color: '#94A3B8', marginBottom: '6px' }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full mb-4 p-3 rounded-lg bg-slate-900/40 border border-white/6 text-slate-200" />

                <button type="button" onClick={() => router.push('/forgot-password')} style={{ width: '100%', marginBottom: '12px', padding: '8px', background: 'transparent', border: 'none', color: '#818CF8', textAlign: 'left', fontSize: '14px', fontWeight: 500 }}>Forgot Password?</button>

                <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'linear-gradient(135deg,#6366F1,#7C3AED)', color: '#fff', fontWeight: 700 }}>{loading ? 'Signing in...' : 'Sign in'}</button>

                <div style={{ margin: '16px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }} />

                <a href="/api/auth/google/start" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', color: '#E2E8F0', fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}>
                    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0012 23z" />
                        <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 010-4.2V7.06H2.18a11 11 0 000 9.88l3.66-2.84z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 00-9.82 6.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z" />
                    </svg>
                    Continue with Google
                </a>
            </form>
        </div>
    );
}
