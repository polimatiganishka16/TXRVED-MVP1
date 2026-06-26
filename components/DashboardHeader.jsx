"use client";
import React, { useState, useEffect } from 'react';
import ProfileMenu from './ProfileMenu';
import NotificationModal from './NotificationModal';

export default function DashboardHeader() {
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const fetchUnreadCount = async () => {
            try {
                const response = await fetch('/api/notifications');
                if (response.ok) {
                    const data = await response.json();
                    setUnreadCount(data.unreadCount || 0);
                }
            } catch (error) {
                console.error('Error fetching unread count:', error);
            }
        };

        fetchUnreadCount();

        const interval = setInterval(fetchUnreadCount, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <>
            <header style={{
                position: 'sticky', top: 0, zIndex: 100,
                background: 'rgba(18,24,38,0.75)',
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                padding: '10px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                height: '72px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src="/logo.jpeg" alt="IECBP" style={{ width: 44, height: 44, objectFit: 'contain' }} />
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC' }}>IECBP Evaluation System</div>
                        <div style={{ fontSize: 12, color: '#94A3B8' }}>Scenario-Based Candidate Evaluation Platform</div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ position: 'relative' }}>
                        <button
                            aria-label="Notifications"
                            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: 10,
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid rgba(255,255,255,0.03)',
                                color: '#94A3B8',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                position: 'relative',
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.background = 'rgba(255,255,255,0.05)';
                                e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                                e.target.style.color = '#F8FAFC';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'rgba(255,255,255,0.02)';
                                e.target.style.borderColor = 'rgba(255,255,255,0.03)';
                                e.target.style.color = '#94A3B8';
                            }}
                        >
                            🔔 Notifications
                            {unreadCount > 0 && (
                                <span style={{
                                    position: 'absolute',
                                    top: '-5px',
                                    right: '-5px',
                                    background: '#EF4444',
                                    color: 'white',
                                    borderRadius: '50%',
                                    width: '20px',
                                    height: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    minWidth: '20px',
                                }}>
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </button>
                    </div>
                    <ProfileMenu />
                </div>
            </header>
            <NotificationModal isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} onUnreadCountChange={setUnreadCount} />

            <NotificationModal isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} />
        </>
    );
}
