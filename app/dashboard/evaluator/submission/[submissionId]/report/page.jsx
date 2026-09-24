'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import DashboardHeader from '../../../../../../components/DashboardHeader';
import EvaluatorReportDashboard from '../../../../../../components/EvaluatorReportDashboard';

const RejectModal = dynamic(() => import('../../../../../../components/RejectModal'), {
  ssr: false,
});

const ModifyReportModal = dynamic(() => import('../../../../../../components/ModifyReportModal'), {
  ssr: false,
});

export default function EvaluatorReportPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params.submissionId;

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [showModifyBox, setShowModifyBox] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const handleReportAction = async (action, comment = '', confirmReject = false) => {
    if (action === 'REJECT' && !confirmReject) {
      setShowRejectBox(true);
      return;
    }

    if (action === 'MODIFY') {
      setShowModifyBox(true);
      return;
    }

    try {
      const res = await fetch('/api/reports/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: report.id, action, evaluatorComment: comment }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Report ${action} Successfully`);
        router.push('/dashboard/evaluator');
      } else {
        alert(data.message || 'Action Failed');
      }
    } catch (error) {
      console.error(error);
      alert('Action Failed');
    }
  };

  const handleModifyReport = async (modifiedContent) => {
    try {
      // Create modified report by copying reportData and replacing editable fields
      const modifiedReport = {
        ...report.reportData,
        capabilityTraits: modifiedContent.capabilityTraits,
        strengths: modifiedContent.strengths,
        improvements: modifiedContent.improvements,
        recommendations: modifiedContent.recommendations,
      };

      const res = await fetch('/api/reports/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: report.id,
          action: 'MODIFY',
          evaluatorComment: report.evaluatorComment || '',
          modifiedReport,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert('Report Modified Successfully');
        setShowModifyBox(false);
        router.push('/dashboard/evaluator');
      } else {
        alert(data.message || 'Modification Failed');
      }
    } catch (error) {
      console.error('Modify error:', error);
      alert('Failed to modify report');
    }
  };

  useEffect(() => {
    let mounted = true;

    async function loadReport(isInitialLoad = false) {
      try {
        const res = await fetch(`/api/reports/submission/${submissionId}`);
        const data = await res.json();
        if (!mounted) return;
        if (data.success) {
          setReport(data.report);
          setError(null);
        } else if (isInitialLoad) {
          setError(data.message || data.error || 'Unable to load report');
        }
      } catch (error) {
        if (!mounted) return;
        console.error('REPORT LOAD ERROR:', error);
        if (isInitialLoad) setError(error.message || 'Unable to load report');
      } finally {
        if (mounted && isInitialLoad) setLoading(false);
      }
    }

    loadReport(true);

    return () => {
      mounted = false;
    };
  }, [submissionId]);

  const reportStatus = report?.status?.toUpperCase();
  const hasReportData = report?.reportData !== null && report?.reportData !== undefined;

  useEffect(() => {
    const shouldPoll = reportStatus === 'PROCESSING' || (reportStatus === 'PENDING' && !hasReportData);
    if (!shouldPoll) return undefined;

    let mounted = true;
    let polling = false;
    let timeoutId;

    const poll = async () => {
      if (!mounted || polling) return;
      polling = true;
      try {
        const res = await fetch(`/api/reports/submission/${submissionId}`);
        const data = await res.json();
        if (mounted && data.success) {
          setReport(data.report);
        }
      } catch (pollError) {
        console.error('REPORT POLL ERROR:', pollError);
      } finally {
        polling = false;
        if (mounted) timeoutId = setTimeout(poll, 3000);
      }
    };

    timeoutId = setTimeout(poll, 3000);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [hasReportData, reportStatus, submissionId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f1623 0%, #121826 40%, #182235 70%, #1a2540 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#94A3B8' }}>Loading report...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f1623 0%, #121826 40%, #182235 70%, #1a2540 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#FECACA' }}>{error}</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f1623 0%, #121826 40%, #182235 70%, #1a2540 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#FECACA' }}>Report not found</div>
      </div>
    );
  }

  if (reportStatus === 'PROCESSING' || (reportStatus === 'PENDING' && !hasReportData)) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f1623 0%, #121826 40%, #182235 70%, #1a2540 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#FCD34D' }}>Evaluation is processing. This page will update automatically.</div>
      </div>
    );
  }

  if (reportStatus === 'FAILED') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f1623 0%, #121826 40%, #182235 70%, #1a2540 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#FECACA' }}>Evaluation failed. Refresh the page or contact an administrator.</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f1623 0%, #121826 40%, #182235 70%, #1a2540 100%)', color: '#E2E8F0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <DashboardHeader />
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 2rem 4rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.5rem' }}>Evaluation Report</h1>
          <p style={{ margin: 0, color: '#94A3B8', fontSize: '14px' }}>Submission #{submissionId}</p>
        </div>

        <EvaluatorReportDashboard 
          report={report} 
          submissionId={submissionId}
          showActions={true}
          onAction={handleReportAction}
        />

        <button
          onClick={() => router.push('/dashboard/evaluator')}
          style={{ marginTop: '2rem', padding: '12px 24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(15,23,42,0.8)', color: '#E2E8F0', fontWeight: 700, cursor: 'pointer' }}
        >
          ← Back to Submissions
        </button>

        {showRejectBox && (
          <RejectModal
            show
            reason={rejectReason}
            onReasonChange={setRejectReason}
            onCancel={() => {
              setShowRejectBox(false);
              setRejectReason('');
            }}
            onConfirm={() => {
              handleReportAction('REJECT', rejectReason, true);
              setShowRejectBox(false);
              setRejectReason('');
            }}
          />
        )}

        {showModifyBox && (
          <ModifyReportModal
            report={report}
            isOpen
            onClose={() => setShowModifyBox(false)}
            onSave={handleModifyReport}
          />
        )}
      </div>
    </div>
  );
}
