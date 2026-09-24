'use client';
import { isGarbageInput } from "../../utils/validation";
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QuestionRenderer from './QuestionRenderer';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const QUESTION_TIMER_SECONDS = 300;

function isAnswered(answer) {
  if (answer === undefined || answer === null) return false;
  if (typeof answer === 'string') return answer.trim().length > 0;
  if (Array.isArray(answer)) return answer.length > 0;
  if (
    typeof answer === 'object' &&
    'choice' in answer &&
    'reasoning' in answer
  ) {
    return (
      answer.choice &&
      answer.reasoning &&
      answer.reasoning.trim().length > 0
    );
  }
  if (typeof answer === 'object') return Object.keys(answer).length > 0;
  return Boolean(answer);
}

export default function AssessmentShell({ meta, questions, answers, onAnswer, onFinish }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [questionTimings, setQuestionTimings] = useState({});
  const [timeLeft, setTimeLeft] = useState(meta.minutes * 60);
  const [showWarning, setShowWarning] = useState(false);

  const [questionTimers, setQuestionTimers] = useState(() =>
    Object.fromEntries(
      questions.map((_, index) => [index, QUESTION_TIMER_SECONDS])
    )
  );
  const [direction, setDirection] = useState(1);
  const [validationError, setValidationError] = useState('');
  const [hasFinished, setHasFinished] = useState(false);

  const totalQuestions = questions.length;

  const levelThemes = {
    Beginner: { primary: '#22C55E', secondary: '#2DD4BF', accent: '#67E8F9', glow: '#A7F3D0' },
    Intermediate: { primary: '#3B82F6', secondary: '#06B6D4', accent: '#8B5CF6', glow: '#93C5FD' },
    Advanced: { primary: '#F97316', secondary: '#EC4899', accent: '#7C3AED', glow: '#6366F1' },
  };

  const theme = levelThemes[meta.level] || levelThemes.Advanced;
  const currentQuestion = questions[currentIndex];
  const answeredCount = questions.filter((q) => isAnswered(answers[q.id])).length;
  const isLast = currentIndex === totalQuestions - 1;
  const questionTimeLeft = questionTimers[currentIndex] ?? QUESTION_TIMER_SECONDS;
  const isQuestionTimeLow = questionTimeLeft <= 120;

  useEffect(() => {
    if (!currentQuestion) return;

    const interval = setInterval(() => {
      setQuestionTimers((prev) => {
        const currentValue = prev[currentIndex] ?? QUESTION_TIMER_SECONDS;

        if (currentValue <= 1) {
          clearInterval(interval);

          if (isLast) {
            if (!hasFinished) {
              setHasFinished(true);
              const finalTimeSpent = Math.floor(
                (Date.now() - questionStartTime) / 1000
              );

              onFinish({
                answers,
                questionTimings: {
                  ...questionTimings,
                  [currentQuestion.id]: finalTimeSpent
                }
              });
            }

            return { ...prev, [currentIndex]: 0 };
          }

          const nextIndex = currentIndex + 1;
          setDirection(1);
          setCurrentIndex(nextIndex);
          return { ...prev, [currentIndex]: 0, [nextIndex]: QUESTION_TIMER_SECONDS };
        }

        return { ...prev, [currentIndex]: currentValue - 1 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentIndex, currentQuestion, isLast, onFinish]);

  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentIndex]);
  // ── Validate current answer ──
  const validateCurrent = useCallback(() => {
    const answer = answers[currentQuestion.id];

    if (!isAnswered(answer)) {
      return 'Please answer this question before continuing.';
    }

    // SHORT TEXT
    if (currentQuestion.type === 'short_text') {
      const text = String(answer).trim().toLowerCase();
      const words = text.split(/\s+/).filter(Boolean);

      if (words.length < 15) {
        return 'Minimum 15 words required.';
      }

      if (words.length > 40) {
        return 'Maximum 40 words allowed.';
      }

      const uniqueWords = new Set(words);
      const repetitionRatio = uniqueWords.size / words.length;

      if (repetitionRatio < 0.65) {
        return 'Response is too repetitive.';
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
        return 'Meaningful professional response required.';
      }

      if (isGarbageInput(text)) {
        return 'Please enter a meaningful answer.';
      }
    }

    // YES / NO
    if (currentQuestion.type === 'yes_no') {
      const reasoning = String(answer.reasoning || '').trim().toLowerCase();
      const words = reasoning.split(/\s+/).filter(Boolean);

      if (words.length < 15) {
        return 'Minimum 15 words required for reasoning.';
      }

      if (words.length > 40) {
        return 'Maximum 40 words allowed for reasoning.';
      }

      if (isGarbageInput(reasoning)) {
        return 'Please enter meaningful reasoning.';
      }
    }

    // MULTI SELECT
    if (currentQuestion.type === 'multi_select') {
      const requiredSelections = currentQuestion.maxSelections || 1;

      if (!Array.isArray(answer) || answer.length !== requiredSelections) {
        return `Please select exactly ${requiredSelections} options.`;
      }
    }

    return null;
  }, [answers, currentQuestion]);

  // ── Next / Submit ──
  const goNext = useCallback(() => {
    console.log('goNext', { currentIndex, currentQuestionId: currentQuestion?.id, answer: answers[currentQuestion?.id], currentQuestionType: currentQuestion?.type });
    const error = validateCurrent();
    if (error) {
      setValidationError(error);
      setTimeout(() => setValidationError(''), 3000);
      return;
    }

    setValidationError('');
    const timeSpent = Math.floor(
      (Date.now() - questionStartTime) / 1000
    );

    setQuestionTimings(prev => ({
      ...prev,
      [currentQuestion.id]: timeSpent
    }));

    console.log("All Timings:", {
      ...questionTimings,
      [currentQuestion.id]: timeSpent
    });
    if (isLast) {
      if (!hasFinished) {
        setHasFinished(true);
        onFinish({
          answers,
          questionTimings: {
            ...questionTimings,
            [currentQuestion.id]: timeSpent
          }
        });
      }
      return;
    }

    setDirection(1);
    setCurrentIndex(currentIndex + 1);
  }, [validateCurrent, isLast, onFinish, currentIndex]);

  // ── Prev ──
  const goPrev = useCallback(() => {
    if (currentIndex === 0) return;
    setHasFinished(false);
    setDirection(-1);
    setCurrentIndex(currentIndex - 1);
    setValidationError('');
  }, [currentIndex]);

  // ── Jump ──
  const jumpTo = useCallback((index) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
    setValidationError('');
  }, [currentIndex]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ── NAVBAR ── */}
      <nav
        style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: 'rgba(18,24,38,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(99,102,241,0.12)',
          padding: '0 2rem', height: '64px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(124,58,237,0.15))',
            border: '1.5px solid rgba(99,102,241,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 14px rgba(99,102,241,0.2)',
          }}>
            <span style={{
              fontWeight: 700, fontSize: '10px',
              background: 'linear-gradient(135deg, #a5b4fc, #F97316)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>IE</span>
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.2px' }}>
              IECBP Evaluation
            </div>
            <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 400 }}>
              {meta.category}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ flex: 1, maxWidth: '480px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
              Question {currentIndex + 1} of {totalQuestions}
            </span>
            <span style={{ fontSize: '11px', color: '#6366F1', fontWeight: 600 }}>
              {answeredCount}/{totalQuestions} answered
            </span>
          </div>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
            <motion.div
              style={{
                height: '100%',
                background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})`,
                borderRadius: '999px',
              }}
              animate={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Question timer only */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '7px 14px', borderRadius: '999px',
          background: isQuestionTimeLow ? 'rgba(239,68,68,0.12)' : 'rgba(15,23,42,0.9)',
          border: isQuestionTimeLow ? '1px solid rgba(239,68,68,0.35)' : '1px solid rgba(148,163,184,0.18)',
          color: isQuestionTimeLow ? '#FCA5A5' : '#E2E8F0',
          flexShrink: 0,
          transition: 'all 0.25s ease',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke={isQuestionTimeLow ? '#F87171' : '#6366F1'} strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          <span style={{ fontSize: '11px', color: isQuestionTimeLow ? '#FCA5A5' : '#A5B4FC', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.35px' }}>Question</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: isQuestionTimeLow ? '#FCA5A5' : '#E2E8F0', fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(questionTimeLeft)}
          </span>
        </div>
      </nav>

      {/* ── BODY ── */}
      <div style={{
        flex: 1, maxWidth: '1100px', width: '100%',
        margin: '0 auto', padding: '2.5rem 2rem',
        display: 'flex', gap: '2rem', alignItems: 'flex-start',
      }}>
        {/* MAIN QUESTION AREA */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Question header card */}
          <motion.div style={{
            background: 'linear-gradient(145deg, #1E2A40, #24324A)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '24px', padding: '2.25rem',
            marginBottom: '1.5rem', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px',
              background: `linear-gradient(90deg, transparent, ${theme.primary}88, transparent)`,
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 18px ${theme.primary}55`, flexShrink: 0,
              }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>
                  Q{currentQuestion.number}
                </span>
              </div>
              <QuestionTypeBadge type={currentQuestion.type} />
            </div>

            <AnimatePresence mode="wait">
              <motion.h2
                key={currentQuestion.id}
                initial={{ opacity: 0, x: direction * 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -20 }}
                transition={{ duration: 0.35 }}
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 'clamp(1.1rem, 2vw, 1.35rem)',
                  fontWeight: 700, color: '#F8FAFC',
                  lineHeight: 1.55, margin: 0, letterSpacing: '-0.2px',
                }}
              >
                {currentQuestion.question}
              </motion.h2>
            </AnimatePresence>
          </motion.div>

          {/* Answer area */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, delay: 0.05 }}
            >
              <QuestionRenderer
                question={currentQuestion}
                value={answers[currentQuestion.id]}
                onChange={(val) => onAnswer(currentQuestion.id, val)}
                readOnly={questionTimeLeft <= 0}
              />
            </motion.div>
          </AnimatePresence>

          {/* Validation error */}
          <AnimatePresence>
            {validationError && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  marginTop: '1rem', padding: '12px 16px',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: '12px',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}
              >
                <span style={{ fontSize: '14px' }}>⚠️</span>
                <span style={{ fontSize: '13px', color: '#FCA5A5', fontWeight: 500 }}>
                  {validationError}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation buttons */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.75rem' }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={goPrev}
              disabled={currentIndex === 0}
              style={{
                padding: '13px 24px',
                background: currentIndex === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px', cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: '14px', fontWeight: 600,
                color: currentIndex === 0 ? '#334155' : '#94A3B8',
                display: 'flex', alignItems: 'center', gap: '8px',
                transition: 'all 0.2s ease',
                opacity: currentIndex === 0 ? 0.5 : 1,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
              </svg>
              Previous
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, boxShadow: `0 0 28px ${theme.primary}66` }}
              whileTap={{ scale: 0.97 }}
              onClick={goNext}
              style={{
                flex: 1, padding: '13px 24px',
                background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                border: 'none', borderRadius: '14px', cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: '14px', fontWeight: 700, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: `0 6px 24px ${theme.primary}50`,
              }}
            >
              {isLast ? 'Review & Submit' : 'Next Question'}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                {isLast
                  ? <polyline points="20 6 9 17 4 12" />
                  : <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>}
              </svg>
            </motion.button>
          </div>
        </div>

        {/* SIDEBAR */}
        <div style={{
          background: 'linear-gradient(145deg, #1E2A40, #24324A)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '20px', padding: '1.5rem',
          width: '200px', flexShrink: 0,
          position: 'sticky', top: '80px',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.7px', color: '#64748B', marginBottom: '1.25rem' }}>
            QUESTIONS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {questions.map((q, i) => {
              const answered = isAnswered(answers[q.id]);
              const active = i === currentIndex;
              return (
                <motion.button
                  key={q.id}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => jumpTo(i)}
                  style={{
                    width: '100%', aspectRatio: '1',
                    borderRadius: '10px', cursor: 'pointer',
                    background: active
                      ? `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`
                      : answered ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.04)',
                    border: active ? 'none'
                      : answered ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(255,255,255,0.06)',
                    color: active ? '#fff' : answered ? '#4ADE80' : '#475569',
                    fontSize: '13px', fontWeight: 700,
                    boxShadow: active ? `0 0 16px ${theme.primary}66` : 'none',
                    transition: 'all 0.2s ease',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  {i + 1}
                </motion.button>
              );
            })}
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { bg: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`, label: 'Current' },
              { bg: 'rgba(74,222,128,0.3)', border: '1px solid rgba(74,222,128,0.4)', label: 'Answered' },
              { bg: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', label: 'Unanswered' },
            ].map(({ bg, border, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: bg, border }} />
                <span style={{ fontSize: '11px', color: '#64748B' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuestionTypeBadge({ type }) {
  const map = {
    short_text: { label: 'Short Answer', color: '#60A5FA' },
    mcq: { label: 'Multiple Choice', color: '#A78BFA' },
    drag_rank: { label: 'Priority Ranking', color: '#F59E0B' },
    audio: { label: 'Audio Question', color: '#34D399' },
    yes_no: { label: 'Yes / No', color: '#F472B6' },
    video: { label: 'Video Question', color: '#FB923C' },
    multi_select: { label: 'Multi-Select', color: '#818CF8' },
  };
  const meta = map[type] || { label: 'Question', color: '#94A3B8' };
  return (
    <div style={{
      padding: '3px 12px', borderRadius: '999px',
      background: `${meta.color}15`,
      border: `1px solid ${meta.color}35`,
      fontSize: '11px', fontWeight: 600,
      color: meta.color, letterSpacing: '0.4px',
    }}>
      {meta.label.toUpperCase()}
    </div>
  );
}