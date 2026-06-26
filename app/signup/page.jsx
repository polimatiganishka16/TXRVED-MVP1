"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    function validate() {
        if (!name || !email) return 'All fields are required.';
        // simple email check
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email address.';
        return null;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        const v = validate();
        if (v) {
            setError(v);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data?.message || 'Signup failed');
                setLoading(false);
                return;
            }

            setShowSuccess(true);
        } catch (err) {
            console.error(err);
            setError('Unexpected error');
            setLoading(false);
        }
    }

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f1623 0%, #121826 40%, #182235 70%, #1a2540 100%)',
            padding: '3rem'
        }}>
            <div style={{ position: 'absolute', top: '2rem', left: '2rem' }}>
                <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.8)', color: '#E2E8F0', fontWeight: 500, fontSize: '14px', cursor: 'pointer' }}>← Back to Home</button>
            </div>
            {!showSuccess ? (
                <form onSubmit={handleSubmit} style={{ width: '420px', background: 'linear-gradient(145deg,#0f172a,#111827)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <h2 style={{ fontFamily: "'Playfair Display', serif", color: '#F8FAFC', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Create account</h2>
                    <p style={{ color: '#94A3B8', marginBottom: '1rem' }}>Sign up as a candidate to start assessments.</p>

                    {error && <div style={{ marginBottom: '12px', padding: '10px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', color: '#FCA5A5' }}>{error}</div>}

                    <label style={{ display: 'block', color: '#94A3B8', marginBottom: '6px' }}>Full name</label>
                    <input value={name} onChange={e => setName(e.target.value)} className="w-full mb-3 p-3 rounded-lg bg-slate-900/40 border border-white/6 text-slate-200" />

                    <label style={{ display: 'block', color: '#94A3B8', marginBottom: '6px' }}>Email</label>
                    <input value={email} onChange={e => setEmail(e.target.value)} className="w-full mb-4 p-3 rounded-lg bg-slate-900/40 border border-white/6 text-slate-200" />

                    <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'linear-gradient(135deg,#6366F1,#7C3AED)', color: '#fff', fontWeight: 700 }}>{loading ? 'Creating...' : 'Create account'}</button>

                </form>
            ) : (
                <div style={{
                    position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.5)', zIndex: 999, padding: '3rem'
                }}>
                    <div style={{
                        background: 'linear-gradient(145deg,#0f172a,#111827)', padding: '2.5rem', borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.06)', maxWidth: '480px', textAlign: 'center'
                    }}>
                        <div style={{
                            fontSize: '48px', marginBottom: '1.5rem', display: 'inline-flex',
                            alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px',
                            background: 'rgba(34,197,94,0.12)', borderRadius: '50%', color: '#86EFAC'
                        }}>
                            ✓
                        </div>

                        <h2 style={{
                            fontFamily: "'Playfair Display', serif", color: '#F8FAFC',
                            fontSize: '1.5rem', marginBottom: '1rem', fontWeight: 700
                        }}>Account Created Successfully!</h2>

                        <p style={{
                            color: '#CBD5E1', fontSize: '1rem', lineHeight: 1.6, marginBottom: '1.5rem'
                        }}>
                            Your account has been created successfully. Please check your registered email for:
                        </p>

                        <div style={{
                            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                            borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'left',
                            color: '#E2E8F0', fontSize: '14px', lineHeight: 1.8
                        }}>
                            <div style={{ marginBottom: '8px' }}>✓ Your <strong>Candidate Code</strong> (username)</div>
                            <div style={{ marginBottom: '8px' }}>✓ Your <strong>Temporary Password</strong></div>
                            <div>✓ <strong>Verification Link</strong> to activate your account</div>
                        </div>

                        <button
                            onClick={() => router.push('/login')}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '10px',
                                background: 'linear-gradient(135deg,#6366F1,#7C3AED)', color: '#fff',
                                fontWeight: 700, fontSize: '16px', border: 'none', cursor: 'pointer'
                            }}
                        >
                            Go to Sign In
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
