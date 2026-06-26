"use client";
import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { fetchSession, logout as performLogout, clearAuthUser, getAuthUser } from './auth/auth';

export default function ProfileMenu() {
    const [open, setOpen] = useState(false);
    const [user, setUser] = useState(null);
    const ref = useRef();
    const router = useRouter();

    useEffect(() => {
        let mounted = true;
        async function load() {
            const s = await fetchSession();
            if (mounted) setUser(s || getAuthUser());
        }
        load();
        const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('click', onDoc);
        return () => { mounted = false; document.removeEventListener('click', onDoc); };
    }, []);

    const initials = (user?.name || user?.email || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    const handleLogout = async () => {
        try { await performLogout(); } catch (e) { }
        try { clearAuthUser(); } catch (e) { }
        router.push('/');
    };

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button onClick={() => setOpen(o => !o)} aria-label="Profile" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)', color: '#fff' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>{initials}</div>
                <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{user?.name || 'User'}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>{user?.role || ''}</div>
                </div>
            </button>

            {open && (
                <div style={{ position: 'absolute', right: 0, marginTop: 8, width: 220, background: 'linear-gradient(145deg,#0b1020,#0f1726)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, boxShadow: '0 8px 28px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                    <div style={{ padding: 12, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <div style={{ fontWeight: 700 }}>{user?.name || user?.email}</div>
                        <div style={{ fontSize: 12, color: '#94A3B8' }}>{user?.email}</div>
                        <div style={{ marginTop: 6, fontSize: 12, color: '#94A3B8' }}>Role: {user?.role || '—'}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <button onClick={() => { setOpen(false); router.push('/dashboard/' + (user?.role === 'ADMIN' ? 'admin' : user?.role === 'EVALUATOR' ? 'evaluator' : 'candidate')); }} style={{ padding: '10px 12px', background: 'transparent', border: 'none', textAlign: 'left', color: '#fff' }}>Dashboard</button>
                        <button onClick={() => { setOpen(false); router.push('/profile'); }} style={{ padding: '10px 12px', background: 'transparent', border: 'none', textAlign: 'left', color: '#fff' }}>Profile</button>
                        <button
    onClick={() => {
        setOpen(false);
        router.push('/dashboard/candidate/reports');
    }}
    style={{
        padding: '10px 12px',
        background: 'transparent',
        border: 'none',
        textAlign: 'left',
        color: '#fff'
    }}
>
    Reports
</button>
                        <hr style={{ border: 'none', height: 1, background: 'rgba(255,255,255,0.03)', margin: '8px 0' }} />
                        <button onClick={handleLogout} style={{ padding: '10px 12px', background: 'transparent', border: 'none', textAlign: 'left', color: '#fff' }}>Logout</button>
                    </div>
                </div>
            )}
        </div>
    );
}
