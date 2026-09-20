'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardHeader from '../../../../../components/DashboardHeader';
import ReportViewer from '../../../../../components/ReportViewer';

export default function CandidateReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params.submissionId;

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    let poll;
    let attempts = 0;

    async function loadReport() {
      try {
        const res = await fetch(`/api/reports/candidate/submission/${submissionId}`);
        const data = await res.json();

        if (!active) return;

        if (!res.ok || !data.success) {
          setError(data.message || 'Unable to load report');
          return;
        }

        setReport(data.report);

        const status = data.report?.status?.toUpperCase();
        if (status === 'PROCESSING' && attempts < 40) {
          attempts += 1;
          poll = setTimeout(loadReport, 3000);
        }
      } catch (err) {
        console.error('Candidate report detail load failed', err);
        if (active) setError('Unable to load report');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadReport();
    return () => {
      active = false;
      if (poll) clearTimeout(poll);
    };
  }, [submissionId]);

  const statusText = report?.status?.toUpperCase();

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f1623 0%, #121826 40%, #182235 70%, #1a2540 100%)', color: '#E2E8F0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <DashboardHeader />
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 2rem 4rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.5rem' }}>
          <button
            onClick={() => router.push('/dashboard/candidate/reports')}
            style={{
              border: '1px solid rgba(148,163,184,0.18)',
              background: 'rgba(15,23,42,0.75)',
              color: '#E2E8F0',
              padding: '10px 16px',
              borderRadius: '12px',
              cursor: 'pointer',
            }}
          >
            ← Back to reports
          </button>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.2em', color: '#94A3B8', marginBottom: '6px' }}>EVALUATION REPORT</div>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: '#F8FAFC' }}>Your Evaluation Report</h1>
            <p style={{ margin: '0.75rem 0 0', color: '#94A3B8', maxWidth: '720px', lineHeight: 1.75 }}></p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', borderRadius: '20px', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}>Loading report...</div>
        ) : error ? (
          <div style={{ padding: '2rem', borderRadius: '20px', background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.35)', color: '#FECACA' }}>{error}</div>
        ) : !report ? (
          <div style={{ padding: '2rem', borderRadius: '20px', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}>Report not found.</div>
        ) : statusText === 'PROCESSING' ? (
          <div style={{ padding: '2rem', borderRadius: '20px', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(251,191,36,0.25)', color: '#FCD34D' }}>
            Evaluation is processing. This page will update automatically.
          </div>
        ) : statusText === 'FAILED' ? (
          <div style={{ padding: '2rem', borderRadius: '20px', background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.35)', color: '#FECACA' }}>
            Evaluation failed. Please refresh the page or contact an administrator.
          </div>
        ) : (
          <ReportViewer 
            report={report} 
            showActions={false}
          />
        )}
      </div>
    </div>
  );
}
