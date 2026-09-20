'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '../../../../components/DashboardHeader';

export default function ReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadReports() {
      try {
        const res = await fetch('/api/reports/candidate');
        const data = await res.json();

        if (!active) return;

        if (!res.ok || !data.success) {
          setError(data.message || 'Unable to load reports.');
          return;
        }

        setReports(data.reports || []);
      } catch (err) {
        console.error('Candidate reports load failed', err);
        if (active) setError('Unable to load reports.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadReports();
    return () => { active = false; };
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f1623 0%, #121826 40%, #182235 70%, #1a2540 100%)', color: '#E2E8F0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <DashboardHeader />
      <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '2rem 2rem 4rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.2em', color: '#94A3B8', marginBottom: '0.75rem' }}>CANDIDATE REPORTS</div>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: '#F8FAFC' }}>Approved evaluation reports and review history</h1>
          <p style={{ margin: '0.75rem 0 0', maxWidth: '720px', color: '#94A3B8', lineHeight: 1.8 }}>
            Track the status of your submitted evaluations and access the approved or modified report once your assessment has been reviewed.
          </p>
        </div>

        <div style={{ padding: '1.5rem', borderRadius: '24px', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>
          {loading ? (
            <div style={{ padding: '2rem', color: '#94A3B8' }}>Loading reports...</div>
          ) : error ? (
            <div style={{ padding: '2rem', borderRadius: '18px', background: 'rgba(248,113,113,0.1)', color: '#FECACA' }}>{error}</div>
          ) : !reports.length ? (
            <div style={{ padding: '2rem', color: '#94A3B8' }}>No reports are available yet. Check back once your submission has been reviewed.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#94A3B8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                    <th style={{ padding: '18px 16px 12px', textAlign: 'left' }}>Scenario</th>
                    <th style={{ padding: '18px 16px 12px', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '18px 16px 12px', textAlign: 'left' }}>Reviewed Date</th>
                    <th style={{ padding: '18px 16px 12px', textAlign: 'left' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.submissionId} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={{ padding: '16px', verticalAlign: 'middle', color: '#E2E8F0' }}>{report.scenario}</td>
                      <td style={{ padding: '16px', verticalAlign: 'middle' }}><StatusBadge status={report.status} /></td>
                      <td style={{ padding: '16px', verticalAlign: 'middle', color: '#94A3B8' }}>{report.reviewedAt ? new Date(report.reviewedAt).toLocaleString() : 'Pending review'}</td>
                      <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                        <button
                          onClick={() => router.push(`/dashboard/candidate/reports/${report.submissionId}`)}
                          disabled={['PROCESSING', 'FAILED', 'PENDING'].includes(report.status?.toUpperCase())}
                          style={{
                            padding: '10px 18px',
                            borderRadius: '12px',
                            border: 'none',
                            fontWeight: 700,
                            cursor: ['PROCESSING', 'FAILED', 'PENDING'].includes(report.status?.toUpperCase()) ? 'not-allowed' : 'pointer',
                            background: report.status?.toUpperCase() === 'REJECT' ? 'rgba(248,113,113,0.18)' : 'rgba(59,130,246,0.18)',
                            color: report.status?.toUpperCase() === 'REJECT' ? '#FECACA' : '#BFDBFE',
                            opacity: ['PROCESSING', 'FAILED', 'PENDING'].includes(report.status?.toUpperCase()) ? 0.5 : 1,
                          }}
                        >
                          {report.status?.toUpperCase() === 'PROCESSING' ? 'Processing' : report.status?.toUpperCase() === 'FAILED' ? 'Unavailable' : report.status?.toUpperCase() === 'REJECT' ? 'View Reason' : 'View Report'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const upper = (status || '').toUpperCase();
  const config = {
    PROCESSING: { label: 'Processing', background: 'rgba(251,191,36,0.12)', color: '#FCD34D', border: '1px solid rgba(251,191,36,0.25)' },
    COMPLETED: { label: 'Ready for Review', background: 'rgba(59,130,246,0.12)', color: '#BFDBFE', border: '1px solid rgba(59,130,246,0.25)' },
    PENDING: { label: 'Under Review', background: 'rgba(148,163,184,0.12)', color: '#CBD5E1', border: '1px solid rgba(148,163,184,0.25)' },
    FAILED: { label: 'Evaluation Failed', background: 'rgba(248,113,113,0.12)', color: '#FECACA', border: '1px solid rgba(248,113,113,0.25)' },
    APPROVE: { label: 'Approved', background: 'rgba(16,185,129,0.12)', color: '#A7F3D0', border: '1px solid rgba(16,185,129,0.25)' },
    MODIFY: { label: 'Modified', background: 'rgba(59,130,246,0.12)', color: '#BFDBFE', border: '1px solid rgba(59,130,246,0.25)' },
    REJECT: { label: 'Rejected', background: 'rgba(248,113,113,0.12)', color: '#FECACA', border: '1px solid rgba(248,113,113,0.25)' },
  };
  const entry = config[upper] || { label: upper || 'Unknown', background: 'rgba(148,163,184,0.12)', color: '#CBD5E1', border: '1px solid rgba(148,163,184,0.25)' };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '9px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', background: entry.background, color: entry.color, border: entry.border }}>
      {entry.label}
    </span>
  );
}