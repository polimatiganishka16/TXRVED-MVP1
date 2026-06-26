"use client";
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ResetPasswordPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [validationErrors, setValidationErrors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const passwordRequirements = [
        { regex: /.{8,}/, label: 'At least 8 characters' },
        { regex: /[A-Z]/, label: 'At least 1 uppercase letter' },
        { regex: /[a-z]/, label: 'At least 1 lowercase letter' },
        { regex: /[0-9]/, label: 'At least 1 number' },
        { regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, label: 'At least 1 special character' },
    ];

    useEffect(() => {
        const t = searchParams.get('token');
        if (!t) {
            setError('Invalid or missing reset token.');
            return;
        }
        setToken(t);
    }, [searchParams]);

    function validatePasswordStrength(pwd) {
        const errors = [];
        passwordRequirements.forEach(req => {
            if (!req.regex.test(pwd)) {
                errors.push(req.label);
            }
        });
        return errors;
    }

    function handleNewPasswordChange(e) {
        const pwd = e.target.value;
        setNewPassword(pwd);
        if (pwd) {
            setValidationErrors(validatePasswordStrength(pwd));
        } else {
            setValidationErrors([]);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setMessage('');
        setValidationErrors([]);

        if (!newPassword || !confirmPassword) {
            setError('Both password fields are required.');
            return;
        }

        const pwdErrors = validatePasswordStrength(newPassword);
        if (pwdErrors.length > 0) {
            setValidationErrors(pwdErrors);
            setError('Password does not meet security requirements.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword, confirmPassword }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data?.message || 'Unable to reset password');
                setLoading(false);
                return;
            }
            setMessage(data?.message || 'Password reset successfully!');
            setTimeout(() => router.push('/login'), 2000);
        } catch (err) {
            console.error(err);
            setError('Unexpected error');
            setLoading(false);
        }
    }

    if (!token) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #0f1623 0%, #121826 40%, #182235 70%, #1a2540 100%)',
                padding: '3rem'
            }}>
                <div style={{ width: '420px', background: 'linear-gradient(145deg,#0f172a,#111827)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', color: '#FCA5A5' }}>Invalid or missing reset token.</div>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f1623 0%, #121826 40%, #182235 70%, #1a2540 100%)',
            padding: '3rem'
        }}>
            <form onSubmit={handleSubmit} style={{ width: '420px', background: 'linear-gradient(145deg,#0f172a,#111827)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h2 style={{ fontFamily: "'Playfair Display', serif", color: '#F8FAFC', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Reset Password</h2>
                <p style={{ color: '#94A3B8', marginBottom: '1rem' }}>Enter your new password below.</p>

                {error && <div style={{ marginBottom: '12px', padding: '10px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', color: '#FCA5A5' }}>{error}</div>}
                {message && <div style={{ marginBottom: '12px', padding: '10px', borderRadius: '8px', background: 'rgba(34,197,94,0.12)', color: '#86EFAC' }}>{message}</div>}

                <label style={{ display: 'block', color: '#94A3B8', marginBottom: '6px' }}>New Password</label>
                <div style={{ position: 'relative', marginBottom: '8px' }}>
                    <input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={handleNewPasswordChange} className="w-full p-3 rounded-lg bg-slate-900/40 border border-white/6 text-slate-200" style={{ paddingRight: '40px' }} />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '18px', padding: 0 }}>
                        {showNewPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                </div>

                {newPassword && (
                    <div style={{ marginBottom: '12px', padding: '10px', borderRadius: '8px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                        <div style={{ fontSize: '12px', color: '#93C5FD', fontWeight: 600, marginBottom: '6px' }}>Password Requirements:</div>
                        {passwordRequirements.map((req, i) => {
                            const isMet = req.regex.test(newPassword);
                            return (
                                <div key={i} style={{
                                    fontSize: '12px', color: isMet ? '#86EFAC' : '#FCA5A5',
                                    marginBottom: i < passwordRequirements.length - 1 ? '3px' : 0
                                }}>
                                    {isMet ? '✓' : '✗'} {req.label}
                                </div>
                            );
                        })}
                    </div>
                )}

                <label style={{ display: 'block', color: '#94A3B8', marginBottom: '6px' }}>Confirm New Password</label>
                <div style={{ position: 'relative', marginBottom: '16px' }}>
                    <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-3 rounded-lg bg-slate-900/40 border border-white/6 text-slate-200" style={{ paddingRight: '40px' }} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '18px', padding: 0 }}>
                        {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                </div>

                <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'linear-gradient(135deg,#6366F1,#7C3AED)', color: '#fff', fontWeight: 700 }}>{loading ? 'Resetting...' : 'Reset Password'}</button>
            </form>
        </div>
    );
}

const ResetPasswordPageFallback = (
    <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f1623 0%, #121826 40%, #182235 70%, #1a2540 100%)',
    }}>
        <div style={{ color: '#94A3B8' }}>Loading...</div>
    </div>
);

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={ResetPasswordPageFallback}>
            <ResetPasswordPageContent />
        </Suspense>
    );
}
