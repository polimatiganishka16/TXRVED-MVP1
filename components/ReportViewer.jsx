'use client';

export default function ReportViewer({ report, submissionId, scenario, showActions, onAction }) {
  if (!report || !report.reportData) {
    return (
      <div style={{ padding: '2rem', borderRadius: '20px', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.06)', color: '#94A3B8' }}>
        No report data available.
      </div>
    );
  }

  // Use modifiedReport if status is MODIFIED, otherwise use original reportData
  const statusKey = (report.status || 'PENDING').toUpperCase();
  const data = statusKey === 'MODIFY' && report.modifiedReport ? report.modifiedReport : report.reportData;
  const statusConfig = {
    APPROVE: { label: 'Approved', icon: '🟢', accent: '#10B981', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' },
    MODIFY: { label: 'Modified', icon: '🔵', accent: '#3B82F6', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)' },
    COMPLETED: { label: 'Ready for Review', icon: '🔵', accent: '#3B82F6', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)' },
    PENDING: { label: 'Under Review', icon: '🟠', accent: '#F59E0B', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' },
    REJECT: { label: 'Rejected', icon: '🔴', accent: '#EF4444', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)' },
  };
  const statusEntry = statusConfig[statusKey] || statusConfig.PENDING;
  const reviewedAtLabel = report.reviewedAt ? new Date(report.reviewedAt).toLocaleString() : null;

  const statusMessage = statusKey === 'REJECT'
    ? {
        title: 'Report Requires Improvement',
        description: "Your submission has been reviewed by the evaluator. While it does not meet the required evaluation criteria at this time, the evaluator's remarks and AI insights below highlight the key areas for improvement to help you continue developing your engineering capabilities.",
      }
    : {
        title: 'Good work!',
        description: 'Congratulations! 🎉 Your submission has been reviewed and approved. Your responses demonstrated strong understanding and decision-making capabilities. Keep up the good work and continue building on your strengths.',
      };

  const extractText = (item) => {
    if (!item) return '';
    if (typeof item === 'string') return item;
    if (typeof item === 'object') {
      return item.text || item.recommendation || item.description || item.value || '';
    }
    return '';
  };

  const capabilityTraits = Array.isArray(data.capabilityTraits)
    ? data.capabilityTraits.map((trait) => (typeof trait === 'string' ? trait : trait.traitName || trait.trait_name || trait.name || extractText(trait))).filter(Boolean)
    : [];

  const strengths = Array.isArray(data.strengths)
    ? data.strengths.map(extractText).filter(Boolean)
    : [];

  const improvements = Array.isArray(data.improvements)
    ? data.improvements.map(extractText).filter(Boolean)
    : [];

  const recommendations = Array.isArray(data.recommendations)
    ? data.recommendations.map(extractText).filter(Boolean)
    : [];

  const getTraitIcon = (label) => {
    const lower = label.toLowerCase();
    if (lower.includes('analytical')) return '🧠';
    if (lower.includes('decision')) return '🎯';
    if (lower.includes('risk')) return '⚠️';
    if (lower.includes('strategic')) return '📈';
    if (lower.includes('collaborat') || lower.includes('team')) return '🤝';
    if (lower.includes('communicat') || lower.includes('voice')) return '🗣️';
    return '🌟';
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem', padding: '2rem', borderRadius: '28px', background: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(15,23,42,0.95) 40%, rgba(31,41,55,0.95) 100%)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 80px rgba(0,0,0,0.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ minWidth: '90px', minHeight: '90px', display: 'grid', placeItems: 'center', borderRadius: '24px', background: statusEntry.background, color: statusEntry.accent, fontSize: '2.2rem', border: statusEntry.border }}>
            {statusEntry.icon}
          </div>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.2em', color: '#94A3B8', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Report Status</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: '#F8FAFC' }}>{statusEntry.label}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0.55rem 0.9rem', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{statusKey}</span>
            </div>
            <p style={{ margin: '1rem 0 0', color: '#94A3B8', maxWidth: '720px', lineHeight: 1.75 }}>{statusMessage.description}</p>
          </div>
        </div>
      </div>

      {statusKey === 'REJECT' && (
        <div style={{ marginBottom: '2rem', padding: '1.75rem', borderRadius: '24px', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.2em', color: '#FCA5A5', marginBottom: '1rem', textTransform: 'uppercase' }}>Evaluator Remarks</div>
          <div style={{ fontSize: '1rem', color: '#F8FAFC', lineHeight: 1.8, marginBottom: reviewedAtLabel ? '1rem' : 0 }}>{report.evaluatorComment || 'No additional remarks were provided.'}</div>
          {reviewedAtLabel && (
            <div style={{ fontSize: '0.95rem', color: '#FECACA' }}><strong>Reviewed on:</strong> {reviewedAtLabel}</div>
          )}
        </div>
      )}

      <div style={{ marginBottom: '2rem', padding: '1.75rem', borderRadius: '24px', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.30)' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.2em', color: '#94A3B8', marginBottom: '1.5rem', textTransform: 'uppercase' }}>You are : </div>
        {capabilityTraits.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {capabilityTraits.map((trait) => (
              <div key={trait} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '1.25rem 1.5rem', borderRadius: '999px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)', color: '#E2E8F0', fontSize: '1rem', fontWeight: 700, minHeight: '72px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '44px', minHeight: '44px', borderRadius: '16px', background: 'rgba(255,255,255,0.06)', color: '#93C5FD', fontSize: '1.35rem' }}>{getTraitIcon(trait)}</span>
                <span>{trait}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#94A3B8' }}>No AI capability traits are available for this report.</div>
        )}
      </div>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <div style={{ padding: '1.75rem', borderRadius: '24px', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.30)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.2em', color: '#94A3B8', marginBottom: '1rem', textTransform: 'uppercase' }}>Strengths</div>
          {strengths.length ? (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {strengths.map((item, index) => (
                <div key={`${item}-${index}`} style={{ padding: '1.25rem', borderRadius: '20px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)', color: '#D1FAE5', display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '1rem', lineHeight: 1.7 }}>
                  <span style={{ fontSize: '1.2rem' }}>✅</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#94A3B8' }}>No strengths are currently available.</div>
          )}
        </div>

        <div style={{ padding: '1.75rem', borderRadius: '24px', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.30)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.2em', color: '#94A3B8', marginBottom: '1rem', textTransform: 'uppercase' }}>Improvement Areas</div>
          {improvements.length ? (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {improvements.map((item, index) => (
                <div key={`${item}-${index}`} style={{ padding: '1.25rem', borderRadius: '20px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)', color: '#FDE68A', display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '1rem', lineHeight: 1.7 }}>
                  <span style={{ fontSize: '1.2rem' }}>📈</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#94A3B8' }}>No improvement areas are currently available.</div>
          )}
        </div>

        <div style={{ padding: '1.75rem', borderRadius: '24px', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.30)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.2em', color: '#94A3B8', marginBottom: '1rem', textTransform: 'uppercase' }}>Recommendations</div>
          {recommendations.length ? (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {recommendations.map((item, index) => (
                <div key={`${item}-${index}`} style={{ padding: '1.5rem', borderRadius: '24px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)', color: '#E2E8F0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', fontWeight: 700, color: '#C7D2FE' }}>
                    <span style={{ fontSize: '1.2rem' }}>💡</span>
                    <span>Recommendation {index + 1}</span>
                  </div>
                  <div style={{ fontSize: '1rem', lineHeight: 1.8, color: '#CBD5E1' }}>{item}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#94A3B8' }}>No recommendations are currently available.</div>
          )}
        </div>
      </div>
    </div>
  );
}
