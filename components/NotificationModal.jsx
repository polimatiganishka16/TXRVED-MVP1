"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationModal({ isOpen, onClose, onUnreadCountChange }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/notifications');
            if (response.ok) {
                const data = await response.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    const markAsRead = async (notificationId) => {
        try {
            const response = await fetch(`/api/notifications/${notificationId}`, {
                method: 'PATCH',
            });

            if (response.ok) {
                setNotifications(
                    notifications.map((n) =>
                        n.id === notificationId ? { ...n, isRead: true } : n
                    )
                );
                const newUnreadCount = Math.max(0, unreadCount - 1);
                setUnreadCount(newUnreadCount);
                if (onUnreadCountChange) {
                    onUnreadCountChange(newUnreadCount);
                }
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const unreadNotifications = notifications.filter((n) => !n.isRead);

            for (const notification of unreadNotifications) {
                await fetch(`/api/notifications/${notification.id}`, {
                    method: 'PATCH',
                });
            }

            setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
            setUnreadCount(0);
            if (onUnreadCountChange) {
                onUnreadCountChange(0);
            }
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        key="overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0, 0, 0, 0.5)',
                            backdropFilter: 'blur(4px)',
                            zIndex: 999,
                        }}
                    />

                    <motion.div
                        key="modal"
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            position: 'fixed',
                            top: '72px',
                            right: '20px',
                            width: '400px',
                            maxHeight: '500px',
                            background: 'rgba(18, 24, 38, 0.95)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                            zIndex: 1000,
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        {/* Header */}
                        <div
                            style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            <div>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#F8FAFC' }}>
                                    Notifications
                                </h3>
                                {unreadCount > 0 && (
                                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94A3B8' }}>
                                        {unreadCount} unread
                                    </p>
                                )}
                            </div>

                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#6366F1',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        transition: 'background 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.background = 'rgba(99, 102, 241, 0.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.background = 'transparent';
                                    }}
                                >
                                    Mark all as read
                                </button>
                            )}
                        </div>

                        {/* Content */}
                        <div
                            style={{
                                flex: 1,
                                overflowY: 'auto',
                                padding: '8px',
                            }}
                        >
                            {loading ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8' }}>
                                    <p>Loading notifications...</p>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
                                    <p style={{ color: '#94A3B8', fontSize: '14px', margin: 0 }}>
                                        No notifications yet
                                    </p>
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <motion.div
                                        key={notification.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        onClick={() => markAsRead(notification.id)}
                                        style={{
                                            padding: '12px',
                                            margin: '4px 0',
                                            background: notification.isRead
                                                ? 'rgba(255, 255, 255, 0.02)'
                                                : 'rgba(99, 102, 241, 0.1)',
                                            border: notification.isRead
                                                ? '1px solid rgba(255, 255, 255, 0.05)'
                                                : '1px solid rgba(99, 102, 241, 0.3)',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            position: 'relative',
                                        }}
                                        whileHover={{
                                            background: notification.isRead
                                                ? 'rgba(255, 255, 255, 0.05)'
                                                : 'rgba(99, 102, 241, 0.15)',
                                        }}
                                    >
                                        {!notification.isRead && (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    left: '8px',
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    width: '8px',
                                                    height: '8px',
                                                    background: '#6366F1',
                                                    borderRadius: '50%',
                                                }}
                                            />
                                        )}

                                        <div style={{ marginLeft: notification.isRead ? 0 : '16px' }}>
                                            <h4
                                                style={{
                                                    margin: '0 0 4px 0',
                                                    fontSize: '14px',
                                                    fontWeight: 600,
                                                    color: notification.isRead ? '#CBD5E1' : '#F8FAFC',
                                                }}
                                            >
                                                {notification.title}
                                            </h4>
                                            <p
                                                style={{
                                                    margin: 0,
                                                    fontSize: '12px',
                                                    color: notification.isRead ? '#94A3B8' : '#B0BCCA',
                                                    lineHeight: '1.4',
                                                }}
                                            >
                                                {notification.message}
                                            </p>
                                            <p
                                                style={{
                                                    margin: '6px 0 0 0',
                                                    fontSize: '11px',
                                                    color: '#64748B',
                                                }}
                                            >
                                                {formatDate(notification.createdAt)}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div
                            style={{
                                padding: '12px 20px',
                                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                                textAlign: 'center',
                            }}
                        >
                            <button
                                onClick={onClose}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#94A3B8',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    transition: 'color 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.color = '#F8FAFC';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.color = '#94A3B8';
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
