'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { isGarbageInput } from "../../utils/validation";


// ── Mirrors AssessmentShell validation ──
// REPLACE the current validateAnswer with this
function validateAnswer(question, answer) {
  if (!isAnswered(answer)) {
    return `Q${question.number}: Answer is required`;
  }

  // SHORT TEXT VALIDATION
  if (question.type === 'short_text') {
    const text = String(answer).trim().toLowerCase();

    if (!text) {
      return `Q${question.number}: Answer is required`;
    }

    const words = text.split(/\s+/).filter(Boolean);

    if (words.length < 15) {
      return `Q${question.number}: Minimum 15 words required.`;
    }

    if (words.length > 40) {
      return `Q${question.number}: Maximum 40 words allowed.`;
    }

    // repeated word spam
    const uniqueWords = new Set(words);
    const repetitionRatio = uniqueWords.size / words.length;

    if (repetitionRatio < 0.65) {
      return `Q${question.number}: Answer is too repetitive. Please provide a meaningful response.`;
    }

    // spam/chat words
    const spamWords = [
      'hey',
      'hi',
      'hii',
      'hehe',
      'haha',
      'lol',
      'test',
      'asdf',
      'qwerty',
      'check',
      'checking',
      'error',
      'hello'
    ];

    const spamCount = words.filter(word =>
      spamWords.some(spam => word.includes(spam))
    ).length;

    if (spamCount >= 3) {
      return `Q${question.number}: Casual or spam-like responses are not allowed.`;
    }

    if (isGarbageInput(text)) {
      return `Q${question.number}: Please enter a meaningful answer.`;
    }
    // MULTI SELECT VALIDATION
    // MULTI SELECT VALIDATION
    // MULTI SELECT VALIDATION
    if (question.type === 'multi_select') {
      if (!Array.isArray(answer)) {
        return `Q${question.number}: Please select required options.`;
      }

      const requiredSelections = question.maxSelections || 1;

      if (answer.length < requiredSelections) {
        return `Q${question.number}: Please select exactly ${requiredSelections} options.`;
      }

      if (answer.length > requiredSelections) {
        return `Q${question.number}: You can select only ${requiredSelections} options.`;
      }
    }
  }

  // YES/NO REASON VALIDATION
  if (question.type === 'yes_no') {
    const reasoning = String(answer.reasoning || '').trim().toLowerCase();
    const words = reasoning.split(/\s+/).filter(Boolean);

    if (words.length < 15) {
      return `Q${question.number}: Minimum 15 words required for reasoning.`;
    }

    if (words.length > 40) {
      return `Q${question.number}: Maximum 40 words allowed for reasoning.`;
    }

    const uniqueWords = new Set(words);
    const repetitionRatio = uniqueWords.size / words.length;

    if (repetitionRatio < 0.65) {
      return `Q${question.number}: Reasoning is too repetitive.`;
    }

    const spamWords = [
      'hey',
      'hi',
      'hii',
      'hehe',
      'haha',
      'lol',
      'test',
      'asdf',
      'check',
      'error'
    ];

    const spamCount = words.filter(word =>
      spamWords.some(spam => word.includes(spam))
    ).length;

    if (spamCount >= 3) {
      return `Q${question.number}: Meaningful reasoning required.`;
    }
  }

  // MULTI SELECT VALIDATION
  if (question.type === 'multi_select') {
    if (!Array.isArray(answer)) {
      return `Q${question.number}: Please select required options.`;
    }

    const minRequired = question.minSelections || 1;

    if (answer.length < minRequired) {
      return `Q${question.number}: Select at least ${minRequired} options.`;
    }
  }

  // AUDIO / VIDEO
  if (question.type === 'audio' || question.type === 'video') {
    if (!answer?.response || String(answer.response).trim() === '') {
      return `Q${question.number}: Response required`;
    }
  }

  return null;
}
function revalidateAll(questions, answers) {
  const errors = [];
  const normalizedAnswers = {};

  for (const q of questions) {
    const answer = answers[q.id];

    const err = validateAnswer(q, answer);
    if (err) {
      errors.push(err);
      continue;
    }

    // only compare text answers
    if (q.type === 'short_text') {
      const normalized = String(answer)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');

      if (normalizedAnswers[normalized]) {
        errors.push(
          `Q${q.number}: Same answer already used in Q${normalizedAnswers[normalized]}`
        );
      } else {
        normalizedAnswers[normalized] = q.number;
      }
    }
  }

  return errors;
}
function isAnswered(answer) {
  if (answer === undefined || answer === null) return false;
  if (typeof answer === 'string') return answer.trim().length > 0;
  if (Array.isArray(answer)) return answer.length > 0;
  // FIXED - checks yes_no has both choice AND non-empty reasoning
  if (
    typeof answer === 'object' &&
    'choice' in answer &&
    'reasoning' in answer
  ) {
    return answer.choice && answer.reasoning && answer.reasoning.trim().length > 0;
  }
  if (typeof answer === 'object') return Object.keys(answer).length > 0;
  return Boolean(answer);
}

const TYPE_LABELS = {
  short_text: 'Short Answer',
  mcq: 'Multiple Choice',
  drag_rank: 'Priority Ranking',
  audio: 'Audio Question',
  yes_no: 'Yes / No',
  video: 'Video Question',
  multi_select: 'Multi-Select',
};

const TYPE_COLORS = {
  short_text: '#60A5FA',
  mcq: '#A78BFA',
  drag_rank: '#F59E0B',
  audio: '#34D399',
  yes_no: '#F472B6',
  video: '#FB923C',
  multi_select: '#818CF8',
};

function getAnswerPreview(question, answer) {
  if (!isAnswered(answer)) return null;

  switch (question.type) {
    case 'short_text':
      return typeof answer === 'string'
        ? answer.slice(0, 120) + (answer.length > 120 ? '…' : '')
        : null;

    case 'mcq': {
      const opt = question.options?.find((o) => o.key === answer);
      return opt ? `${opt.key}. ${opt.text.slice(0, 80)}${opt.text.length > 80 ? '…' : ''}` : `Option ${answer}`;
    }

    case 'yes_no':
      return answer.choice
        ? `${answer.choice.toUpperCase()}${answer.reasoning?.trim() ? ' — ' + answer.reasoning.slice(0, 80) + (answer.reasoning.length > 80 ? '…' : '') : ''}`
        : null;

    case 'multi_select':
      return Array.isArray(answer) ? `Selected: ${answer.join(', ')}` : null;

    case 'drag_rank':
      return Array.isArray(answer)
        ? answer
          .map((id, i) => {
            const item = question.items?.find((it) => it.id === id);
            return `${i + 1}. ${item?.label || id}`;
          })
          .join(' → ')
        : null;

    case 'audio':
      return answer?.response
        ? answer.response.slice(0, 120) + (answer.response.length > 120 ? '…' : '')
        : null;

    case 'video':
      return answer?.response
        ? answer.response.slice(0, 120) + (answer.response.length > 120 ? '…' : '')
        : null;

    default:
      return null;
  }
}

export default function SubmitScreen({ meta, questions, answers, onRestart, onBack, attemptId, questionTimings }) {
  const [phase, setPhase] = useState('review'); // 'review' | 'confirm' | 'success'
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const answeredCount = questions.filter((q) => isAnswered(answers[q.id])).length;
  const unansweredCount = questions.length - answeredCount;
  const completionPct = Math.round((answeredCount / questions.length) * 100);
  const [showFastSubmitWarning, setShowFastSubmitWarning] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  const handleSubmit = async () => {


    // ── Revalidate answers ──
    const errors = revalidateAll(questions, answers);

    if (errors.length > 0) {
      setValidationErrors(errors);
      setSubmitting(false);
      return;
    }

    setValidationErrors([]);

    setSubmitting(true);
    setSubmitError('');

    try {
      let attemptToUse = attemptId || sessionStorage.getItem('iecbp_attemptId');

      if (!attemptToUse) {
        // fallback: create a new attempt if missing
        const startRes = await fetch('/api/assessment/start', { method: 'POST' });
        const startData = await startRes.json();
        console.log('START API RESPONSE:', startData);
        if (startData && startData.attemptId) {
          attemptToUse = startData.attemptId;
          sessionStorage.setItem('iecbp_attemptId', String(attemptToUse));
          console.log('ATTEMPT ID STORED:', attemptToUse);
        }
      }

      console.log("ATTEMPT ID USED:", attemptToUse);
      console.log('SUBMISSION PAYLOAD:', { attemptId: attemptToUse, scenarioId: meta.id, answers });

      // STEP 1 — Save answers + evaluation
      const saveRes = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scenarioId: meta.id,
          answers,
          attemptId: attemptToUse,
          questionTimings
        })
      });

      const saveData = await saveRes.json();

      console.log("SUBMISSION RESPONSE:", saveData);

      if (!saveRes.ok || !saveData.success) {

        setSubmitError(
          saveData.message || 'Failed to save answers'
        );

        setSubmitting(false);
        return;
      }
      // STEP 3 — redirect while background evaluation is processing
      setPhase('success');

    } catch (err) {

      console.log(err);

      setSubmitError(
        'Unexpected error during submission'
      );

    } finally {

      setSubmitting(false);
    }
  };


  const handleForceSubmit = async () => {


    try {
      setSubmitting(true);

      let attemptToUse = attemptId || sessionStorage.getItem('iecbp_attemptId');
      if (!attemptToUse) {
        const startRes = await fetch('/api/assessment/start', { method: 'POST' });
        const startData = await startRes.json();
        console.log('START API RESPONSE:', startData);
        if (startData && startData.attemptId) {
          attemptToUse = startData.attemptId;
          sessionStorage.setItem('iecbp_attemptId', String(attemptToUse));
          console.log('ATTEMPT ID STORED:', attemptToUse);
        }
      }

      console.log("ATTEMPT ID USED:", attemptToUse);
      console.log('SUBMISSION PAYLOAD:', { attemptId: attemptToUse, scenarioId: meta.id, answers });

      // STEP 1 — Save answers + evaluation
      const saveRes = await fetch('/api/submissions', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          scenarioId: meta.id,
          answers,
          attemptId: attemptToUse,
          questionTimings
        })
      });

      const saveData = await saveRes.json();

      console.log("FORCE SUBMIT RESPONSE:", saveData);

      if (!saveRes.ok || !saveData.success) {

        setSubmitError(
          saveData.message || 'Failed to save answers'
        );

        setSubmitting(false);
        return;
      }

      setShowFastSubmitWarning(false);

      // STEP 2 — redirect to results page
      window.location.href =
        `/results?submissionId=${saveData.submissionId}`;

    } catch (err) {

      console.log(err);

      setSubmitError(
        'Unexpected error during submission'
      );

    } finally {

      setSubmitting(false);
    }
  };
  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Navbar */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(18,24,38,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(99,102,241,0.12)',
        padding: '0 2rem', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(124,58,237,0.15))',
            border: '1.5px solid rgba(99,102,241,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 14px rgba(99,102,241,0.2)',
          }}>
            <span style={{
              fontWeight: 700, fontSize: '10px',
              background: 'linear-gradient(135deg, #a5b4fc, #7c3aed)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>IE</span>
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#F8FAFC' }}>IECBP Evaluation</div>
            <div style={{ fontSize: '10px', color: '#64748B' }}>{meta.category}</div>
          </div>
        </div>

        <div style={{
          padding: '4px 14px', borderRadius: '999px',
          background: phase === 'success' ? 'rgba(74,222,128,0.1)' : 'rgba(99,102,241,0.1)',
          border: phase === 'success' ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(99,102,241,0.2)',
          fontSize: '12px',
          color: phase === 'success' ? '#4ADE80' : '#818CF8',
          fontWeight: 600,
          transition: 'all 0.4s ease',
        }}>
          {phase === 'success' ? '✓ Submitted' : 'Review & Submit'}
        </div>
      </nav>

      <AnimatePresence mode="wait">

        {/* ── SUCCESS SCREEN ── */}
        {phase === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            style={{
              maxWidth: '680px', margin: '0 auto',
              padding: '4rem 2rem',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              textAlign: 'center',
            }}
          >
            {/* success ring */}
            <div style={{ position: 'relative', marginBottom: '2rem' }}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
                style={{
                  width: '120px', height: '120px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(74,222,128,0.15), rgba(52,211,153,0.08))',
                  border: '2px solid rgba(74,222,128,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 60px rgba(74,222,128,0.25)',
                }}
              >
                <motion.svg
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  width="52" height="52" viewBox="0 0 24 24"
                  fill="none" stroke="#4ADE80" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </motion.svg>
              </motion.div>
              {/* orbit ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                style={{
                  position: 'absolute', inset: '-12px',
                  borderRadius: '50%',
                  border: '1px dashed rgba(74,222,128,0.2)',
                }}
              />
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <h2 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '2rem', fontWeight: 700,
                color: '#F8FAFC', margin: '0 0 0.75rem',
                letterSpacing: '-0.3px',
              }}>
                Assessment Submitted
              </h2>
              <p style={{ fontSize: '15px', color: '#94A3B8', lineHeight: 1.7, margin: '0 0 2.5rem' }}>
                Your responses for{' '}
                <span style={{ color: '#818CF8', fontWeight: 600 }}>{meta.title}</span>{' '}
                have been recorded. Your assessment has been submitted successfully. Results will be updated in your profile within 48 hours.
              </p>
            </motion.div>

            {/* summary pills */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem', flexWrap: 'wrap', justifyContent: 'center' }}
            >
              {[
                { label: 'Questions Answered', value: `${answeredCount}/${questions.length}`, color: '#4ADE80' },
                { label: 'Completion', value: `${completionPct}%`, color: '#6366F1' },
                { label: 'Scenario', value: `#${meta.id}`, color: '#FB923C' },
              ].map((s, i) => (
                <div key={i} style={{
                  padding: '1rem 1.5rem', borderRadius: '16px',
                  background: 'linear-gradient(145deg, #1E2A40, #24324A)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  textAlign: 'center', minWidth: '130px',
                }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, marginBottom: '4px' }}>{s.value}</div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500, letterSpacing: '0.4px' }}>
                    {s.label.toUpperCase()}
                  </div>
                </div>
              ))}
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              whileHover={{ scale: 1.03, boxShadow: '0 0 28px rgba(99,102,241,0.35)' }}
              whileTap={{ scale: 0.97 }}
              onClick={onRestart}
              style={{
                padding: '13px 32px',
                background: 'linear-gradient(135deg, #6366F1, #7C3AED)',
                border: 'none', borderRadius: '14px', cursor: 'pointer',
                fontSize: '14px', fontWeight: 700,
                color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif",
                boxShadow: '0 8px 28px rgba(99,102,241,0.3)',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}
            >
              Return to Scenarios
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </motion.button>
          </motion.div>
        )}

        {/* ── CONFIRM DIALOG ── */}
        {phase === 'confirm' && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.35 }}
            style={{
              maxWidth: '560px', margin: '4rem auto',
              padding: '0 2rem',
            }}
          >
            <div style={{
              background: 'linear-gradient(145deg, #1E2A40, #243450)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: '24px',
              padding: '2.5rem',
              textAlign: 'center',
              boxShadow: '0 30px 80px rgba(0,0,0,0.4)',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)',
              }} />

              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(124,58,237,0.1))',
                border: '1.5px solid rgba(99,102,241,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.5rem',
                boxShadow: '0 0 30px rgba(99,102,241,0.2)',
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>

              <h3 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.5rem', fontWeight: 700,
                color: '#F8FAFC', margin: '0 0 0.75rem',
              }}>
                Ready to Submit?
              </h3>
              <p style={{ fontSize: '14px', color: '#94A3B8', lineHeight: 1.7, margin: '0 0 0.5rem' }}>
                You have answered{' '}
                <span style={{ color: '#F8FAFC', fontWeight: 700 }}>{answeredCount}</span> of{' '}
                <span style={{ color: '#F8FAFC', fontWeight: 700 }}>{questions.length}</span> questions.
              </p>
              {unansweredCount > 0 && (
                <p style={{ fontSize: '13px', color: '#F87171', marginBottom: '0' }}>
                  ⚠️ {unansweredCount} question{unansweredCount > 1 ? 's are' : ' is'} unanswered.
                  You can still submit but unanswered items will be marked incomplete.
                </p>
              )}
              {validationErrors.length > 0 && (
                <div style={{
                  marginTop: '1.25rem',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: 'rgba(248,113,113,0.07)',
                  border: '1px solid rgba(248,113,113,0.22)',
                  textAlign: 'left',
                }}>
                  <div style={{
                    fontSize: '11px', fontWeight: 700,
                    color: '#F87171', marginBottom: '8px', letterSpacing: '0.5px',
                  }}>
                    ⚠ FIX BEFORE SUBMITTING
                  </div>
                  <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {validationErrors.map((err, i) => (
                      <li key={i} style={{ fontSize: '13px', color: '#FCA5A5', lineHeight: 1.5 }}>
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {submitError && (
                <div
                  style={{
                    marginTop: '1rem',
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'rgba(248,113,113,0.08)',
                    border: '1px solid rgba(248,113,113,0.2)',
                    color: '#F87171',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  ⚠ {submitError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setPhase('review'); setValidationErrors([]); setSubmitError(''); }}
                  style={{
                    flex: 1, padding: '13px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '14px', cursor: 'pointer',
                    fontSize: '14px', fontWeight: 600,
                    color: '#94A3B8',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  Go Back
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(99,102,241,0.45)' }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    flex: 1, padding: '13px',
                    background: submitting
                      ? 'rgba(99,102,241,0.4)'
                      : 'linear-gradient(135deg, #6366F1, #7C3AED)',
                    border: 'none', borderRadius: '14px', cursor: submitting ? 'wait' : 'pointer',
                    fontSize: '14px', fontWeight: 700,
                    color: '#fff',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    boxShadow: '0 6px 24px rgba(99,102,241,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}
                >
                  {submitting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                        style={{
                          width: '16px', height: '16px', borderRadius: '50%',
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTopColor: '#fff',
                        }}
                      />
                      Submitting…
                    </>
                  ) : (
                    <>
                      Confirm Submit
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── REVIEW SCREEN ── */}
        {phase === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            style={{ maxWidth: '900px', margin: '0 auto', padding: '2.5rem 2rem' }}
          >
            {/* header */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '5px 14px', borderRadius: '999px',
                background: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.2)',
                marginBottom: '1.25rem',
              }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6366F1', boxShadow: '0 0 8px #6366F1' }} />
                <span style={{ fontSize: '11px', color: '#818CF8', fontWeight: 600, letterSpacing: '0.5px' }}>
                  ASSESSMENT REVIEW
                </span>
              </div>

              <h2 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 'clamp(1.4rem, 3vw, 2rem)',
                fontWeight: 700, color: '#F8FAFC',
                margin: '0 0 0.75rem', letterSpacing: '-0.3px',
              }}>
                Review Your Responses
              </h2>
              <p style={{ fontSize: '14px', color: '#94A3B8', margin: 0 }}>
                Check all answers before final submission. You can still go back to the assessment to edit.
              </p>
            </div>

            {/* summary stats row */}
            <div style={{
              display: 'flex',
              flex: 1,
              gap: '1rem', marginBottom: '2rem',
            }}>
              {[
                {
                  label: 'Answered',
                  value: answeredCount,
                  total: questions.length,
                  color: '#4ADE80',
                  bg: 'rgba(74,222,128,0.08)',
                  border: 'rgba(74,222,128,0.2)',
                  icon: '✓',
                },
                {
                  label: 'Unanswered',
                  value: unansweredCount,
                  total: questions.length,
                  color: unansweredCount > 0 ? '#F87171' : '#475569',
                  bg: unansweredCount > 0 ? 'rgba(248,113,113,0.08)' : 'rgba(255,255,255,0.03)',
                  border: unansweredCount > 0 ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.06)',
                  icon: unansweredCount > 0 ? '!' : '–',
                },
                {
                  label: 'Completion',
                  value: `${completionPct}%`,
                  color: completionPct === 100 ? '#4ADE80' : '#6366F1',
                  bg: 'rgba(99,102,241,0.08)',
                  border: 'rgba(99,102,241,0.2)',
                  icon: '◉',
                },
              ].map((stat, i) => (
                <div key={i} style={{
                  padding: '1.25rem',
                  background: stat.bg,
                  border: `1px solid ${stat.border}`,
                  borderRadius: '16px',
                  display: 'flex', alignItems: 'center', gap: '1rem',
                }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                    background: `${stat.color}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px', color: stat.color,
                    border: `1px solid ${stat.color}30`,
                  }}>
                    {stat.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stat.color, lineHeight: 1 }}>
                      {stat.value}
                      {stat.total && <span style={{ fontSize: '14px', color: '#475569', fontWeight: 500 }}>/{stat.total}</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500, marginTop: '3px', letterSpacing: '0.4px' }}>
                      {stat.label.toUpperCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* completion progress bar */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Overall Completion</span>
                <span style={{ fontSize: '12px', color: completionPct === 100 ? '#4ADE80' : '#6366F1', fontWeight: 700 }}>
                  {completionPct}%
                </span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                  style={{
                    height: '100%', borderRadius: '999px',
                    background: completionPct === 100
                      ? 'linear-gradient(90deg, #4ADE80, #34D399)'
                      : 'linear-gradient(90deg, #6366F1, #7C3AED)',
                    boxShadow: completionPct === 100
                      ? '0 0 10px rgba(74,222,128,0.5)'
                      : '0 0 10px rgba(99,102,241,0.4)',
                  }}
                />
              </div>
            </div>

            {/* question review list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '2rem' }}>
              {questions.map((q, i) => {
                const answered = isAnswered(answers[q.id]);
                const preview = getAnswerPreview(q, answers[q.id]);
                const typeColor = TYPE_COLORS[q.type] || '#94A3B8';

                return (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{
                      background: answered
                        ? 'linear-gradient(145deg, #1c2c46, #20324e)'
                        : 'rgba(15,22,35,0.6)',
                      border: answered
                        ? '1px solid rgba(74,222,128,0.15)'
                        : '1px solid rgba(248,113,113,0.15)',
                      borderRadius: '16px',
                      padding: '1.1rem 1.25rem',
                      display: 'flex', alignItems: 'flex-start', gap: '1rem',
                    }}
                  >
                    {/* Q number + status */}
                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: '34px', height: '34px', borderRadius: '10px',
                        background: answered
                          ? 'linear-gradient(135deg, #6366F1, #7C3AED)'
                          : 'rgba(248,113,113,0.1)',
                        border: answered ? 'none' : '1px solid rgba(248,113,113,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: answered ? '0 0 14px rgba(99,102,241,0.3)' : 'none',
                      }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: answered ? '#fff' : '#F87171' }}>
                          {answered ? '✓' : q.number}
                        </span>
                      </div>
                    </div>

                    {/* content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#CBD5E1' }}>Q{q.number}</span>
                        <div style={{
                          padding: '2px 8px', borderRadius: '999px',
                          background: `${typeColor}12`,
                          border: `1px solid ${typeColor}30`,
                          fontSize: '10px', color: typeColor, fontWeight: 600, letterSpacing: '0.4px',
                        }}>
                          {TYPE_LABELS[q.type] || q.type}
                        </div>
                        {!answered && (
                          <div style={{
                            padding: '2px 8px', borderRadius: '999px',
                            background: 'rgba(248,113,113,0.1)',
                            border: '1px solid rgba(248,113,113,0.25)',
                            fontSize: '10px', color: '#F87171', fontWeight: 600,
                          }}>
                            UNANSWERED
                          </div>
                        )}
                      </div>

                      <p style={{
                        fontSize: '13px', color: '#94A3B8', margin: '0 0 6px',
                        lineHeight: 1.5, fontWeight: 400,
                      }}>
                        {q.question.slice(0, 100)}{q.question.length > 100 ? '…' : ''}
                      </p>

                      {preview && (
                        <div style={{
                          fontSize: '12px', color: '#CBD5E1',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          lineHeight: 1.5, fontStyle: 'italic',
                        }}>
                          {preview}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* bottom action */}
            <div style={{
              background: 'linear-gradient(145deg, #1E2A40, #24324A)',
              border: '1px solid rgba(99,102,241,0.18)',
              borderRadius: '20px',
              padding: '1.75rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: '1rem', flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#F8FAFC', marginBottom: '4px' }}>
                  {completionPct === 100 ? 'All questions answered — ready to submit!' : `${unansweredCount} question${unansweredCount > 1 ? 's' : ''} still unanswered`}
                </div>
                <div style={{ fontSize: '13px', color: '#64748B' }}>
                  {completionPct === 100
                    ? 'Your assessment is complete. Click submit to finalize.'
                    : 'You can submit now or go back to complete remaining questions.'}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end',
                }}
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onBack}
                  style={{
                    padding: '13px 24px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#CBD5E1',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  ← Back to Assessment
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03, boxShadow: '0 0 32px rgba(99,102,241,0.45)' }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setPhase('confirm')}
                  style={{
                    padding: '13px 28px',
                    flexShrink: 0,
                    background: 'linear-gradient(135deg, #6366F1, #7C3AED)',
                    border: 'none',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#fff',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    boxShadow: '0 6px 24px rgba(99,102,241,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  Submit Assessment
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {showFastSubmitWarning && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: 'linear-gradient(180deg, #1E293B 0%, #111827 100%)',
              border: '1px solid rgba(251,191,36,0.25)',
              borderRadius: '24px',
              padding: '32px',
              width: '430px',
              boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'rgba(251,191,36,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: '34px',
              }}
            >
              ⚠️
            </div>

            <h3
              style={{
                color: '#fff',
                fontSize: '24px',
                fontWeight: 700,
                marginBottom: '14px',
              }}
            >
              Quick Submission?
            </h3>

            <p
              style={{
                color: '#CBD5E1',
                fontSize: '15px',
                lineHeight: 1.7,
                marginBottom: '28px',
              }}
            >
              You completed this assessment unusually quickly.
              <br />
              Are you sure you want to submit now?
            </p>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '14px',
              }}
            >
              <button
                onClick={() => setShowFastSubmitWarning(false)}
                style={{
                  padding: '12px 22px',
                  borderRadius: '14px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#E2E8F0',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Go Back
              </button>

              <button
                onClick={handleForceSubmit}
                style={{
                  padding: '12px 22px',
                  borderRadius: '14px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #F59E0B, #F97316)',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 10px 25px rgba(249,115,22,0.35)',
                }}
              >
                Submit Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}