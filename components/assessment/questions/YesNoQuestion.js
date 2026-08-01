'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAssessmentInputProtection } from './useAssessmentInputProtection';

export default function YesNoQuestion({ question, value, onChange, readOnly = false }) {
  const [focused, setFocused] = useState(false);
  const { handleRestriction, handleKeyDown, toast } = useAssessmentInputProtection(readOnly);

  const selected = value?.choice || null;
  const reasoning = value?.reasoning || '';

  const handleChoice = (choice) => {
    if (readOnly) return;
    onChange({ choice, reasoning });
  };

  const handleReasoning = (text) => {
    if (readOnly) return;
    onChange({ choice: selected, reasoning: text });
  };

  const wordCount = reasoning ? reasoning.trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* YES / NO cards */}
      <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.75rem' }}>
        {[
          {
            key: 'yes',
            label: 'Yes',
            icon: '✓',
            flex: 1,
            desc: 'I agree with this approach',
            color: '#4ADE80',
            bg: 'rgba(74,222,128,0.08)',
            border: 'rgba(74,222,128,0.35)',
            glow: 'rgba(74,222,128,0.18)',
          },
          {
            key: 'no',
            label: 'No',
            icon: '✕',
            flex: 1,
            desc: 'I disagree with this approach',
            color: '#F87171',
            bg: 'rgba(248,113,113,0.08)',
            border: 'rgba(248,113,113,0.35)',
            glow: 'rgba(248,113,113,0.18)',
          },
        ].map((option) => {
          const isSelected = selected === option.key;
          return (
            <motion.div
              key={option.key}
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleChoice(option.key)}
              style={{
                padding: '2rem 1.5rem',
                background: isSelected ? option.bg : 'rgba(22,32,50,0.7)',
                border: isSelected
                  ? `1.5px solid ${option.border}`
                  : '1px solid rgba(255,255,255,0.07)',
                borderRadius: '20px',
                cursor: readOnly ? 'not-allowed' : 'pointer',
                textAlign: 'center',
                transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                boxShadow: isSelected
                  ? `0 0 36px ${option.glow}, 0 10px 30px rgba(0,0,0,0.25)`
                  : '0 4px 20px rgba(0,0,0,0.15)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* top shimmer */}
              {isSelected && (
                <div style={{
                  position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px',
                  background: `linear-gradient(90deg, transparent, ${option.color}80, transparent)`,
                }} />
              )}

              {/* icon circle */}
              <motion.div
                animate={{
                  background: isSelected ? option.color : 'rgba(255,255,255,0.05)',
                  boxShadow: isSelected ? `0 0 20px ${option.glow}` : 'none',
                }}
                transition={{ duration: 0.3 }}
                style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  margin: '0 auto 1rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `2px solid ${isSelected ? option.color : 'rgba(255,255,255,0.08)'}`,
                  transition: 'border 0.3s ease',
                }}
              >
                <span style={{
                  fontSize: '26px', fontWeight: 800,
                  color: isSelected ? '#fff' : option.color,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  transition: 'color 0.3s ease',
                }}>
                  {option.icon}
                </span>
              </motion.div>

              <div style={{
                fontSize: '22px', fontWeight: 800,
                fontFamily: "'Playfair Display', serif",
                color: isSelected ? option.color : '#94A3B8',
                marginBottom: '0.4rem',
                transition: 'color 0.3s ease',
              }}>
                {option.label}
              </div>

              <div style={{
                fontSize: '12px', color: isSelected ? option.color : '#475569',
                fontWeight: 500, opacity: isSelected ? 0.85 : 1,
                transition: 'color 0.3s ease',
                lineHeight: 1.4,
              }}>
                {option.desc}
              </div>

              {/* selected checkmark */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  style={{
                    position: 'absolute', top: '12px', right: '12px',
                    width: '22px', height: '22px', borderRadius: '50%',
                    background: option.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Reasoning textarea — appears after choice */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: 10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <div style={{
              padding: '1.5rem',
              background: 'linear-gradient(145deg, #1a2a42, #1e3050)',
              border: '1px solid rgba(99,102,241,0.15)',
              borderRadius: '18px',
              marginBottom: '0.75rem',
            }}>
              <div style={{
                fontSize: '11px', fontWeight: 600, letterSpacing: '0.6px',
                color: '#6366F1', marginBottom: '1rem',
              }}>
                EXPLAIN YOUR REASONING
              </div>

              <div style={{ position: 'relative' }}>
                {focused && (
                  <div style={{
                    position: 'absolute', inset: '-2px', borderRadius: '14px',
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(249,115,22,0.1))',
                    pointerEvents: 'none', zIndex: 0,
                  }} />
                )}
                <textarea
                  value={reasoning}
                  onChange={(e) => handleReasoning(e.target.value)}
                  disabled={readOnly}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onPaste={handleRestriction}
                  onCopy={handleRestriction}
                  onCut={handleRestriction}
                  onContextMenu={handleRestriction}
                  onKeyDown={handleKeyDown}
                  placeholder={question.reasoningPlaceholder || 'Explain your reasoning in detail…'}
                  rows={5}
                  style={{
                    position: 'relative', zIndex: 1,
                    width: '100%', boxSizing: 'border-box',
                    background: focused ? 'rgba(28,40,62,0.98)' : 'rgba(18,28,46,0.8)',
                    border: focused
                      ? '1.5px solid rgba(99,102,241,0.55)'
                      : '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '12px',
                    padding: '1.1rem 1.3rem',
                    color: '#F8FAFC',
                    fontSize: '14px',
                    lineHeight: '1.8',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    resize: 'vertical',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    caretColor: '#818CF8',
                  }}
                />
              </div>

              <div style={{
                display: 'flex', justifyContent: 'space-between',
                marginTop: '0.75rem', padding: '0 0.1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <motion.div
                    animate={{
                      background: reasoning.trim().length > 0 ? '#4ADE80' : '#334155',
                      boxShadow: reasoning.trim().length > 0 ? '0 0 8px rgba(74,222,128,0.5)' : 'none',
                    }}
                    style={{ width: '6px', height: '6px', borderRadius: '50%' }}
                  />
                  <span style={{
                    fontSize: '12px', fontWeight: 500,
                    color: reasoning.trim().length > 0 ? '#4ADE80' : '#475569',
                    transition: 'color 0.3s ease',
                  }}>
                    {reasoning.trim().length > 0 ? 'Reasoning recorded' : 'Awaiting reasoning'}
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: '#64748B', fontVariantNumeric: 'tabular-nums' }}>
                  {wordCount} words
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {toast}
      {/* overall status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', paddingLeft: '0.25rem' }}>
        <motion.div
          animate={{
            background: selected ? '#4ADE80' : '#334155',
            boxShadow: selected ? '0 0 8px rgba(74,222,128,0.6)' : 'none',
          }}
          style={{ width: '7px', height: '7px', borderRadius: '50%' }}
        />
        <span style={{
          fontSize: '12px', fontWeight: 500,
          color: selected ? '#4ADE80' : '#475569',
          transition: 'color 0.3s ease',
        }}>
          {!selected
            ? 'Select Yes or No to continue'
            : `You selected: ${selected.toUpperCase()}${reasoning.trim().length > 0 ? ' · Reasoning added' : ' · Add your reasoning below'}`}
        </span>
      </div>
    </motion.div>
  );
}