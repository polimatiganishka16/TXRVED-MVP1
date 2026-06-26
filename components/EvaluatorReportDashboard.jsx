'use client';

import { useRouter } from 'next/navigation';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export default function EvaluatorReportDashboard({ report, submissionId, showActions, onAction }) {
  const router = useRouter();

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
  const candidateInfo = data.candidateInfo || {};
  const indices = data.capabilityIndices || {};
  const evaluationScores = data.evaluationScores || {};
  const traits = data.capabilityTraits || [];
  const strengths = data.strengths || [];
  const improvements = data.improvements || [];
  const recommendations = data.recommendations || [];

  // Extract real signal scores from evaluationScores
  const signalNames = ['Understanding', 'Awareness', 'Decision', 'Actionability', 'Clarity'];
  const signalKeys = ['understanding', 'awareness', 'decision', 'actionability', 'clarity'];
  const signalValues = signalKeys.map(key => evaluationScores[key] || 0);
  
  // Convert signal values from 0-100 scale to 1-5 scale for display
  const displaySignalValues = signalValues.map(value => (value / 100) * 4 + 1);

  const radarData = signalNames.map((name, idx) => ({
    name,
    value: displaySignalValues[idx],
    fullMark: 5,
  }));

  const scoreCardStyle = {
    padding: '1.5rem',
    borderRadius: '20px',
    background: 'rgba(15,23,42,0.9)',
    border: '1px solid rgba(255,255,255,0.06)',
    textAlign: 'center',
  };

  const sectionTitleStyle = {
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.2em',
    color: '#94A3B8',
    marginBottom: '1.25rem',
    textTransform: 'uppercase',
  };

  const sectionContainerStyle = {
    marginBottom: '2rem',
    padding: '1.75rem',
    borderRadius: '24px',
    background: 'rgba(15,23,42,0.9)',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
  };

  return (
    <div style={{ color: '#E2E8F0' }}>
      {/* SECTION 1: CANDIDATE INFORMATION */}
      <div style={sectionContainerStyle}>
        <div style={sectionTitleStyle}>Candidate Information</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '0.5rem', fontWeight: 600 }}>CANDIDATE CODE</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#F8FAFC' }}>{candidateInfo.candidateCode || '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '0.5rem', fontWeight: 600 }}>SUBMISSION ID</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#F8FAFC' }}>{submissionId}</div>
          </div>
        </div>
      </div>

      {/* SECTION 2: OVERALL EVALUATION */}
      <div style={sectionContainerStyle}>
        <div style={sectionTitleStyle}>Evaluation Indices</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          <div style={{...scoreCardStyle, background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(79, 70, 229, 0.1))', border: '1px solid rgba(99, 102, 241, 0.2)'}}>
            <div style={{ fontSize: '11px', color: '#A5B4FC', fontWeight: 600, marginBottom: '0.5rem' }}>CAPABILITY INDEX</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#A5B4FC' }}>{(indices.capabilityIndex || 0).toFixed(2)}</div>
          </div>
          <div style={{...scoreCardStyle, background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))', border: '1px solid rgba(16, 185, 129, 0.2)'}}>
            <div style={{ fontSize: '11px', color: '#A7F3D0', fontWeight: 600, marginBottom: '0.5rem' }}>CONFIDENCE INDEX</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#A7F3D0' }}>{(indices.confidenceIndex || 0).toFixed(2)}</div>
          </div>
          <div style={{...scoreCardStyle, background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.1))', border: '1px solid rgba(245, 158, 11, 0.2)'}}>
            <div style={{ fontSize: '11px', color: '#FCD34D', fontWeight: 600, marginBottom: '0.5rem' }}>COVERAGE INDEX</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#FCD34D' }}>{(indices.coverageIndex || 0).toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* SECTION 3: SIGNAL ANALYSIS */}
      <div style={sectionContainerStyle}>
        <div style={sectionTitleStyle}>Signal Analysis</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {signalNames.map((name, idx) => {
            const displayValue = displaySignalValues[idx];
            const colors = ['#A5B4FC', '#A7F3D0', '#FCD34D', '#F87171', '#FB923C'];
            const color = colors[idx];
            return (
              <div key={name} style={{ padding: '1.25rem', borderRadius: '16px', background: 'rgba(10,14,23,0.5)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#F8FAFC' }}>{name}</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color }}>{displayValue.toFixed(2)}</div>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min((displayValue / 5) * 100, 100)}%`, background: color, transition: 'width 0.3s ease' }} />
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '0.5rem' }}>Scale: 1 - 5</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 4: RADAR CHART */}
      <div style={sectionContainerStyle}>
        <div style={sectionTitleStyle}>Signal Overview</div>
        <div style={{ height: '400px', width: '100%', display: 'flex', justifyContent: 'center' }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis dataKey="name" stroke="#94A3B8" />
              <PolarRadiusAxis angle={90} domain={[0, 5]} stroke="#64748B" />
              <Radar name="Score" dataKey="value" stroke="#6366F1" fill="#6366F1" fillOpacity={0.3} />
              <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#E2E8F0' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECTION 5: QUESTION WISE ANALYSIS */}
      <div style={sectionContainerStyle}>
        <div style={sectionTitleStyle}>Detailed Analysis</div>
        <button
          onClick={() => router.push(`/dashboard/evaluator/submission/${submissionId}/question-scores`)}
          style={{
            width: '100%',
            padding: '1rem',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, #6366F1, #7C3AED)',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          📊 View Question Wise Analysis
        </button>
      </div>

      {/* SECTION 6: AI CAPABILITY ANALYSIS */}
      {traits && traits.length > 0 && (
        <div style={sectionContainerStyle}>
          <div style={sectionTitleStyle}>Capability Traits</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {traits.map((trait, idx) => (
              <div key={idx} style={{ padding: '1.25rem', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))', border: '1px solid rgba(139,92,246,0.3)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🧠</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#F8FAFC', marginBottom: '0.5rem' }}>{trait.traitName || 'Trait'}</div>
                <div style={{ fontSize: '12px', color: '#A5B4FC', fontWeight: 700 }}>{((trait.confidence || 0) * 100).toFixed(0)}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 7: STRENGTHS */}
      {strengths && strengths.length > 0 && (
        <div style={sectionContainerStyle}>
          <div style={sectionTitleStyle}>Strengths</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {strengths.map((strength, idx) => (
              <div key={idx} style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#A7F3D0' }}>
                <div style={{ fontSize: '13px', lineHeight: 1.6 }}>✓ {strength}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 8: IMPROVEMENTS */}
      {improvements && improvements.length > 0 && (
        <div style={sectionContainerStyle}>
          <div style={sectionTitleStyle}>Areas for Improvement</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {improvements.map((improvement, idx) => (
              <div key={idx} style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)', color: '#FED7AA' }}>
                <div style={{ fontSize: '13px', lineHeight: 1.6 }}>↗ {improvement}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 9: RECOMMENDATIONS */}
      {recommendations && recommendations.length > 0 && (
        <div style={sectionContainerStyle}>
          <div style={sectionTitleStyle}>Recommendations</div>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {recommendations.map((rec, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '1rem', padding: '1rem', borderRadius: '12px', background: 'rgba(10,14,23,0.5)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '32px', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(99,102,241,0.2)', color: '#A5B4FC', fontWeight: 700 }}>
                  {idx + 1}
                </div>
                <div style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: 1.6 }}>{rec}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 10: REPORT STATUS */}
      <div style={sectionContainerStyle}>
        <div style={sectionTitleStyle}>Report Status</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '0.5rem', fontWeight: 600 }}>CURRENT STATUS</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#F8FAFC' }}>{(report.status || 'PENDING').toUpperCase()}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '0.5rem', fontWeight: 600 }}>REVIEWED AT</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#F8FAFC' }}>{report.reviewedAt ? new Date(report.reviewedAt).toLocaleString() : '—'}</div>
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS - Only show for evaluator */}
      {showActions && onAction && (
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          <button
            onClick={() => onAction('APPROVE')}
            style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
          >
            ✓ Approve Report
          </button>
          <button
            onClick={() => onAction('MODIFY')}
            style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
          >
            ✎ Modify Report
          </button>
          <button
            onClick={() => onAction('REJECT')}
            style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #EF4444, #DC2626)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
          >
            ✕ Reject Report
          </button>
        </div>
      )}
    </div>
  );
}
