"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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
            </form>
        </div>
    );
}
