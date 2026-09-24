'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchSession, redirectPathForRole } from '../../../components/auth/auth';
import DashboardHeader from '../../../components/DashboardHeader';
import RejectModal from '../../../components/RejectModal';
import { motion, AnimatePresence } from 'framer-motion';

export default function EvaluatorDashboardPage() {
    const router = useRouter();
    const [submissions, setSubmissions] = useState([]);
    const [rejectSubmissionId, setRejectSubmissionId] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectBox, setShowRejectBox] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortDir, setSortDir] = useState('desc');
    const [user, setUser] = useState(null);
    const updateReportStatus = async (
        submissionId,
        action,
        comment = ''
    ) => {
        try {
            const reportRes = await fetch(
                `/api/reports/submission/${submissionId}`
            );

            const reportData = await reportRes.json();

            if (!reportData.success) {
                alert('Report not found');
                return;
            }

            const reviewRes = await fetch('/api/reports/review', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    reportId: reportData.report.id,
                    action,
                    evaluatorComment: comment
                })
            });

            const result = await reviewRes.json();

            if (result.success) {
                alert(`${action} successful`);

                const res = await fetch('/api/evaluator/submissions');
                const data = await res.json();

                if (data.success) {
                    setSubmissions(data.submissions);
                }
            }
        } catch (error) {
            console.error(error);
            alert('Operation failed');
        }
    };

    useEffect(() => {
        let mounted = true;

        async function init() {
            const sessionUser = await fetchSession();
            if (!sessionUser) {
                router.replace('/login');
                return;
            }
            const u = sessionUser;
            if (u.role !== 'EVALUATOR') {
                router.replace(redirectPathForRole(u.role));
                return;
            }
            if (mounted) setUser(u);

            try {
                const res = await fetch('/api/evaluator/submissions');
                const data = await res.json();
                if (mounted && res.ok && data.success) {
                    setSubmissions(data.submissions || []);
                }
            } catch (error) {
                console.error('Failed to load submissions', error);
            }
        }

        init();

        return () => { mounted = false; };
    }, [router]);

    const filtered = submissions
        .filter(s => {
            const query = searchTerm.toLowerCase();
            return (s.candidateCode.toLowerCase().includes(query) ||
                s.scenario.toLowerCase().includes(query));
        })
        .filter(s => {
            if (statusFilter === 'all') return true;
            return s.status?.toUpperCase() === statusFilter.toUpperCase();
        })
        .sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return sortDir === 'desc' ? dateB - dateA : dateA - dateB;
        });

    const stats = {
        total: submissions.length,
        pending: submissions.filter(s => s.status?.toUpperCase() === 'PENDING').length,
        approved: submissions.filter(s => s.status?.toUpperCase() === 'APPROVE').length,
    };

    // Compute attempt number per submission based on candidateCode + scenario grouping.
    // This derives the ordinal (1..N) by ordering submissions by date (oldest first).
    const attemptNumberBySubmissionId = (() => {
        const map = new Map();
        const groups = {};
        for (const s of submissions) {
            const key = `${(s.candidateCode || '').toLowerCase()}||${(s.scenario || '')}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(s);
        }
        for (const key of Object.keys(groups)) {
            groups[key].sort((a, b) => new Date(a.date) - new Date(b.date));
            groups[key].forEach((s, idx) => map.set(s.id, idx + 1));
        }
        return map;
    })();

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f1623 0%, #121826 40%, #182235 70%, #1a2540 100%)',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            position: 'relative',
            overflowX: 'hidden',
        }}>
            <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

            {/* Ambient background orbs */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
                <div style={{
                    position: 'absolute', top: '-10%', left: '-5%',
                    width: '600px', height: '600px',
                    background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)',
                    borderRadius: '50%',
                }} />
                <div style={{
                    position: 'absolute', bottom: '10%', right: '-10%',
                    width: '700px', height: '700px',
                    background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)',
                    borderRadius: '50%',
                }} />
            </div>

            <DashboardHeader user={user} />

            <main style={{ position: 'relative', zIndex: 1 }}>
                {/* HEADER */}
                <div style={{
                    padding: '3rem 2.5rem 2rem',
                    maxWidth: '1280px', margin: '0 auto',
                }}>
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 style={{
                            fontFamily: "'Playfair Display', serif",
                            fontSize: 'clamp(1.8rem, 3vw, 2.5rem)',
                            fontWeight: 700, color: '#F8FAFC',
                            margin: '0 0 0.5rem', lineHeight: 1.2,
                            letterSpacing: '-0.5px',
                        }}>
                            Candidate Submissions
                        </h1>
                        <p style={{
                            fontSize: '14px', color: '#94A3B8', lineHeight: 1.6,
                            margin: 0, fontWeight: 400,
                        }}>
                            Review and evaluate candidate submissions across all scenarios
                        </p>
                    </motion.div>
                </div>

                {/* STATS CARDS */}
                <div style={{
                    maxWidth: '1280px', margin: '0 auto',
                    padding: '0 2.5rem 2rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '1.5rem',
                }}>
                    {[
                        { label: 'Total Submissions', value: stats.total, color: '#6366F1' },
                        { label: 'Pending Review', value: stats.pending, color: '#F97316' },
                        { label: 'Approved', value: stats.approved, color: '#4ADE80' },
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                            style={{
                                background: 'linear-gradient(145deg, #1B273A, #22314A)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: '16px',
                                padding: '1.5rem',
                                boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
                            }}
                        >
                            <div style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 500, letterSpacing: '0.5px' }}>
                                {stat.label.toUpperCase()}
                            </div>
                            <div style={{
                                fontSize: '2rem', fontWeight: 700, color: stat.color,
                                marginTop: '0.5rem',
                            }}>
                                {stat.value}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* CANDIDATES TABLE */}
                <div style={{
                    maxWidth: '1280px', margin: '0 auto',
                    padding: '0 2.5rem 3rem',
                }}>
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        style={{
                            background: 'linear-gradient(145deg, #1B273A, #22314A)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '20px',
                            overflow: 'hidden',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
                        }}
                    >
                        {/* Header with controls */}
                        <div style={{
                            padding: '1.5rem',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                            flexWrap: 'wrap',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '200px' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search by name, email, or scenario..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{
                                        flex: 1,
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '8px',
                                        padding: '8px 12px',
                                        color: '#F8FAFC',
                                        fontSize: '13px',
                                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                                        outline: 'none',
                                    }}
                                    onFocus={(e) => e.target.style.border = '1px solid rgba(99,102,241,0.3)'}
                                    onBlur={(e) => e.target.style.border = '1px solid rgba(255,255,255,0.08)'}
                                />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '8px',
                                        padding: '8px 12px',
                                        color: '#94A3B8',
                                        fontSize: '13px',
                                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                                        cursor: 'pointer',
                                        outline: 'none',
                                    }}
                                >
                                    <option value="all">All Status</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="APPROVE">Approved</option>
                                    <option value="MODIFY">Modified</option>
                                    <option value="REJECT">Rejected</option>
                                </select>

                                <button
                                    onClick={() => setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')}
                                    style={{
                                        background: 'linear-gradient(135deg, #6366F1, #7C3AED)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '8px 12px',
                                        color: '#fff',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                                        cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                    }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2l6 8h-4v6h-4v-6H6l6-8z" />
                                        <path d="M12 22l-6-8h4v-6h4v6h4l-6 8z" />
                                    </svg>
                                    {sortDir === 'asc' ? 'Oldest' : 'Newest'}
                                </button>
                            </div>
                        </div>

                        {/* Table */}
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                fontSize: '13px',
                            }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                        <th style={{
                                            padding: '1.25rem',
                                            textAlign: 'left',
                                            color: '#94A3B8',
                                            fontWeight: 600,
                                            letterSpacing: '0.3px',
                                            fontSize: '11px',
                                            textTransform: 'uppercase',
                                        }}>Candidate Code</th>
                                        <th style={{
                                            padding: '1.25rem',
                                            textAlign: 'left',
                                            color: '#94A3B8',
                                            fontWeight: 600,
                                            letterSpacing: '0.3px',
                                            fontSize: '11px',
                                            textTransform: 'uppercase',
                                        }}>Scenario</th>
                                        <th style={{
                                            padding: '1.25rem',
                                            textAlign: 'left',
                                            color: '#94A3B8',
                                            fontWeight: 600,
                                            letterSpacing: '0.3px',
                                            fontSize: '11px',
                                            textTransform: 'uppercase',
                                        }}>Submission Date</th>
                                        <th style={{
                                            padding: '1.25rem',
                                            textAlign: 'left',
                                            color: '#94A3B8',
                                            fontWeight: 600,
                                            letterSpacing: '0.3px',
                                            fontSize: '11px',
                                            textTransform: 'uppercase',
                                        }}>Status</th>
                                        <th style={{
                                            padding: '1.25rem',
                                            textAlign: 'left',
                                            color: '#94A3B8',
                                            fontWeight: 600,
                                            letterSpacing: '0.3px',
                                            fontSize: '11px',
                                            textTransform: 'uppercase',
                                        }}>Capability</th>
                                        <th style={{
                                            padding: '1.25rem',
                                            textAlign: 'left',
                                            color: '#94A3B8',
                                            fontWeight: 600,
                                            letterSpacing: '0.3px',
                                            fontSize: '11px',
                                            textTransform: 'uppercase',
                                        }}>Confidence</th>
                                        <th style={{
                                            padding: '1.25rem',
                                            textAlign: 'left',
                                            color: '#94A3B8',
                                            fontWeight: 600,
                                            letterSpacing: '0.3px',
                                            fontSize: '11px',
                                            textTransform: 'uppercase',
                                        }}>Coverage</th>
                                        <th style={{
                                            padding: '1.25rem',
                                            textAlign: 'left',
                                            color: '#94A3B8',
                                            fontWeight: 600,
                                            letterSpacing: '0.3px',
                                            fontSize: '11px',
                                            textTransform: 'uppercase',
                                        }}>
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence>
                                        {filtered.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>
                                                    No submissions found
                                                </td>
                                            </tr>
                                        ) : (
                                            filtered.map((submission, idx) => (
                                                <motion.tr
                                                    key={submission.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                                                    style={{
                                                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                        cursor: 'pointer',
                                                        transition: 'background-color 0.2s ease',
                                                    }}
                                                    onClick={() => router.push(`/dashboard/evaluator/submission/${submission.id}`)}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.08)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                >
                                                    <td style={{ padding: '1.25rem', color: '#F8FAFC', fontWeight: 500 }}>
                                                        <div>{submission.candidateCode}</div>
                                                    </td>
                                                    <td style={{ padding: '1.25rem', color: '#CBD5E1' }}>
                                                        <div>{submission.scenario}</div>
                                                        <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '6px' }}>Attempt #{attemptNumberBySubmissionId.get(submission.id) ?? 1}</div>
                                                    </td>
                                                    <td style={{ padding: '1.25rem', color: '#CBD5E1' }}>
                                                        {new Date(submission.date).toLocaleDateString()} {new Date(submission.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                    <td style={{ padding: '1.25rem' }}>
                                                        <StatusBadge status={submission.status} />
                                                    </td>
                                                    <td style={{ padding: '1.25rem', color: '#F8FAFC', fontWeight: 500 }}>
                                                        {submission.capabilityIndex != null ? submission.capabilityIndex : '--'}
                                                    </td>
                                                    <td style={{ padding: '1.25rem', color: '#F8FAFC', fontWeight: 500 }}>
                                                        {submission.confidenceIndex != null ? submission.confidenceIndex : '--'}
                                                    </td>
                                                    <td style={{ padding: '1.25rem', color: '#F8FAFC', fontWeight: 500 }}>
                                                        {submission.coverageIndex != null ? submission.coverageIndex : '--'}
                                                    </td>
                                                    <td style={{ padding: '1.25rem' }}>
                                                        {['pending', 'completed'].includes(submission.status?.toLowerCase()) && (
                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    gap: '8px',
                                                                    flexWrap: 'wrap'
                                                                }}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <button
                                                                    onClick={() =>
                                                                        updateReportStatus(submission.id, 'APPROVE')
                                                                    }
                                                                    style={{
                                                                        background: '#16a34a',
                                                                        color: '#fff',
                                                                        border: 'none',
                                                                        padding: '6px 12px',
                                                                        borderRadius: '6px',
                                                                        cursor: 'pointer',
                                                                        fontSize: '12px'
                                                                    }}
                                                                >
                                                                    Approve
                                                                </button>

                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        updateReportStatus(submission.id, 'MODIFY');
                                                                    }}
                                                                    style={{
                                                                        background: '#2563eb',
                                                                        color: '#fff',
                                                                        border: 'none',
                                                                        padding: '6px 12px',
                                                                        borderRadius: '6px',
                                                                        cursor: 'pointer',
                                                                        fontSize: '12px'
                                                                    }}
                                                                >
                                                                    Modify
                                                                </button>

                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setRejectSubmissionId(submission.id);
                                                                        setShowRejectBox(true);
                                                                    }}
                                                                    style={{
                                                                        background: '#dc2626',
                                                                        color: '#fff',
                                                                        border: 'none',
                                                                        padding: '6px 12px',
                                                                        borderRadius: '6px',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    Reject
                                                                </button>
                                                            </div>
                                                        )}

                                                        {submission.status?.toLowerCase() !== 'pending' && (
                                                            <span
                                                                style={{
                                                                    color: '#94A3B8',
                                                                    fontSize: '12px'
                                                                }}
                                                            >
                                                                Reviewed
                                                            </span>
                                                        )}
                                                    </td>
                                                </motion.tr>
                                            ))
                                        )}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '1rem 1.5rem',
                            borderTop: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            fontSize: '12px', color: '#94A3B8',
                        }}>
                            <div>Showing {filtered.length} of {submissions.length} submissions</div>
                        </div>
                    </motion.div>
                </div>
            </main>
            <RejectModal
                show={showRejectBox}
                reason={rejectReason}
                onReasonChange={setRejectReason}
                onCancel={() => {
                    setShowRejectBox(false);
                    setRejectReason('');
                }}
                onConfirm={() => {
                    updateReportStatus(rejectSubmissionId, 'REJECT', rejectReason);
                    setShowRejectBox(false);
                    setRejectReason('');
                }}
            />
        </div>
    );
}

function StatusBadge({ status }) {
    const normalizedStatus = (status || '').toLowerCase();
    const statusConfig = {
        pending: { bg: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)', color: '#FDBA74', icon: '⏳' },
        approve: { bg: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ADE80', icon: '✓' },
        modify: { bg: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#A5B4FC', icon: '✎' },
        reject: { bg: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5', icon: '✕' },
    };

    const config = statusConfig[normalizedStatus] || statusConfig.pending;
    const displayLabel = (status || 'PENDING').toUpperCase();

    return (
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '6px',
            background: config.bg,
            border: config.border,
            color: config.color,
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.3px',
        }}>
            <span>{config.icon}</span>
            {displayLabel}
        </div>
    );
}

