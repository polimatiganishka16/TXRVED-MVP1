'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardHeader from '../../../../../../components/DashboardHeader';
import { fetchSession, redirectPathForRole } from '../../../../../../components/auth/auth';

export default function QuestionScoresPage() {
  const { submissionId } = useParams();
  const router = useRouter();
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openEvidence, setOpenEvidence] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const sessionUser = await fetchSession();
      if (!sessionUser) {
        router.replace('/login');
        return;
      }
      if (sessionUser.role !== 'EVALUATOR') {
        router.replace(redirectPathForRole(sessionUser.role));
        return;
      }

      try {
        const res = await fetch(`/api/evaluator/submission/${submissionId}`);
        const data = await res.json();
        if (!mounted) return;
        if (!res.ok || !data.success) {
          setError(data.message || data.error || 'Unable to load question scores');
          return;
        }

        const payload = await fetch(`/api/evaluator/submission/${submissionId}/question-scores`);
        const scoreData = await payload.json();
        if (!mounted) return;
        if (!payload.ok || !scoreData.success) {
          setError(scoreData.message || scoreData.error || 'Unable to load question-wise scores');
          return;
        }

        setScores(scoreData.questionScores || []);
      } catch (err) {
        if (!mounted) return;
        setError(err.message || 'Unable to load question-wise scores');
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [submissionId, router]);

  const evidence = openEvidence ? openEvidence.evidence : null;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f1623 0%, #121826 40%, #182235 70%, #1a2540 100%)',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      position: 'relative',
      overflowX: 'hidden',
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '-10%', width: '700px', height: '700px', background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)', borderRadius: '50%' }} />
      </div>

      <DashboardHeader />
      <main style={{ position: 'relative', zIndex: 1, padding: '3rem 2.5rem 3rem', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.9rem, 3vw, 2.6rem)', fontWeight: 700, color: '#F8FAFC', margin: '0 0 0.5rem', lineHeight: 1.1 }}>Question wise scores</h1>
            <p style={{ fontSize: '14px', color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>Review each question score with evidence for all five signals.</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={() => router.push(`/dashboard/evaluator/submission/${submissionId}`)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#E2E8F0', borderRadius: '12px', padding: '10px 16px', cursor: 'pointer' }}>← Back to submission</button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', borderRadius: '20px', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.06)', color: '#CBD5E1' }}>Loading question scores...</div>
        ) : error ? (
          <div style={{ padding: '2rem', borderRadius: '20px', background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(248,113,113,0.25)', color: '#FBCFE8' }}>{error}</div>
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div style={{ background: 'linear-gradient(145deg, #1B273A, #22314A)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '1.75rem', boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {scores.map((question) => (
                  <div key={question.id} style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '18px', padding: '1.5rem', display: 'grid', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                      <div>
                        <div style={{ color: '#94A3B8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Question {question.questionNumber ?? question.questionId}</div>
                        <div style={{ color: '#F8FAFC', fontSize: '1.25rem', fontWeight: 700 }}>{question.questionText || `Question ${question.questionNumber ?? question.questionId}`}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '14px 18px', color: '#F8FAFC', fontWeight: 700 }}>{Math.round((question.score || 0) * 2) / 2}/5</div>
                        <button onClick={() => setOpenEvidence(openEvidence?.id === question.id ? null : question)} style={{ background: 'linear-gradient(135deg, #6366F1, #7C3AED)', color: '#fff', border: 'none', borderRadius: '12px', padding: '10px 16px', cursor: 'pointer' }}>View evidence</button>
                      </div>
                    </div>
                    {openEvidence?.id === question.id && (
                      <div style={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '1rem', display: 'grid', gap: '1rem' }}>
                        {['understandingEvidence', 'awarenessEvidence', 'decisionEvidence', 'actionabilityEvidence', 'clarityEvidence'].map((signalKey) => {
                          const signalLabel = signalKey.replace('Evidence', '');
                          const items = question[signalKey] || [];
                          return (
                            <div key={signalKey} style={{ background: 'rgba(15,23,42,0.9)', borderRadius: '14px', padding: '1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
                                <div style={{ color: '#A5B4FC', fontWeight: 700, textTransform: 'capitalize' }}>{signalLabel}</div>
                                <button onClick={() => setOpenEvidence(null)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: '#E2E8F0', padding: '6px 12px', cursor: 'pointer' }}>Close</button>
                              </div>
                              {items.length === 0 ? (
                                <div style={{ color: '#94A3B8' }}>No evidence available.</div>
                              ) : (
                                <div style={{ display: 'grid', gap: '0.75rem' }}>
                                  {items.map((item, index) => (
                                    <div key={index} style={{ background: '#111827', borderRadius: '14px', padding: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                      {item.keyword && <div style={{ color: '#82AAFF', fontWeight: 700, marginBottom: '0.4rem' }}>{item.keyword}</div>}
                                      <div style={{ color: '#CBD5E1', lineHeight: 1.7 }}>{item.sentence || JSON.stringify(item)}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* AI MISSED EVIDENCE SECTION */}
                        <div style={{ background: 'rgba(45, 31, 59, 0.6)', borderRadius: '14px', padding: '1rem', border: '1px solid rgba(168,85,247,0.2)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
                            <div style={{ color: '#E9D5FF', fontWeight: 700 }}>AI Missed Evidence Suggestions</div>
                            <button onClick={() => setOpenEvidence(null)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: '#E2E8F0', padding: '6px 12px', cursor: 'pointer' }}>Close</button>
                          </div>
                          {!question.aiMissedEvidence || question.aiMissedEvidence.length === 0 ? (
                            <div style={{ color: '#94A3B8' }}>No AI missed evidence suggestions available.</div>
                          ) : (
                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                              {question.aiMissedEvidence.map((item, index) => (
                                <div key={index} style={{ background: '#111827', borderRadius: '14px', padding: '12px', border: '1px solid rgba(168,85,247,0.15)' }}>
                                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                                    <div style={{ background: 'linear-gradient(135deg, #A855F7, #7C3AED)', borderRadius: '6px', padding: '4px 8px', color: '#F3E8FF', fontSize: '11px', fontWeight: 600 }}>
                                      Q{item.questionId}
                                    </div>
                                    <div style={{ background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.4)', borderRadius: '6px', padding: '4px 8px', color: '#E9D5FF', fontSize: '11px', fontWeight: 600 }}>
                                      {item.type}
                                    </div>
                                  </div>
                                  <div style={{ color: '#E2E8F0', fontSize: '13px', lineHeight: 1.5, fontStyle: 'italic', marginBottom: '0.5rem' }}>
                                    {item.sentence}
                                  </div>
                                  <div style={{ color: '#CBD5E1', fontSize: '12px', lineHeight: 1.4 }}>
                                    <span style={{ color: '#94A3B8', fontWeight: 600 }}>Reason:</span> {item.reason}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
