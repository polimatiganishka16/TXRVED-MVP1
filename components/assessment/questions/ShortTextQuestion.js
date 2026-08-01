'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAssessmentInputProtection } from './useAssessmentInputProtection';

export default function ShortTextQuestion({ question, value, onChange, readOnly = false }) {
  const [focused, setFocused] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const { handleRestriction, handleKeyDown, toast } = useAssessmentInputProtection(readOnly);
  const wordCount = value ? value.trim().split(/\s+/).filter(Boolean).length : 0;
  const hasContent = value && value.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* writing area wrapper */}
      <div style={{ position: 'relative' }}>

        {/* outer glow ring when focused */}
        {focused && (
          <div
            style={{
              position: 'absolute', inset: '-2px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(249,115,22,0.15))',
              pointerEvents: 'none', zIndex: 0,
            }}
          />
        )}

        <textarea
          value={value || ''}
          onChange={(e) => {
            console.log('ShortTextQuestion onChange', e.target.value);
            !readOnly && onChange(e.target.value);
          }}
          disabled={readOnly}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onPaste={handleRestriction}
          onCopy={handleRestriction}
          onCut={handleRestriction}
          onContextMenu={handleRestriction}
          onKeyDown={handleKeyDown}
          placeholder={question.placeholder}
          rows={7}
          style={{
            position: 'relative', zIndex: 1,
            width: '100%', boxSizing: 'border-box',
            background: focused
              ? 'rgba(28, 40, 62, 0.98)'
              : 'rgba(22, 32, 50, 0.85)',
            border: focused
              ? '1.5px solid rgba(99,102,241,0.6)'
              : '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '1.4rem 1.6rem',
            color: '#F8FAFC',
            fontSize: '15px',
            lineHeight: '1.85',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 400,
            resize: 'vertical',
            outline: 'none',
            transition: 'all 0.3s ease',
            boxShadow: focused
              ? '0 0 0 3px rgba(99,102,241,0.1), 0 12px 40px rgba(0,0,0,0.3)'
              : '0 4px 20px rgba(0,0,0,0.2)',
            caretColor: '#818CF8',
          }}
        />

        {/* pen icon top-right */}
        <div
          style={{
            position: 'absolute', top: '1rem', right: '1rem', zIndex: 2,
            opacity: focused ? 0.6 : 0.2,
            transition: 'opacity 0.3s ease',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </div>
      </div>

      {/* status bar */}
      <div
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: '0.875rem', padding: '0 0.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <motion.div
            animate={{
              background: hasContent ? '#4ADE80' : '#334155',
              boxShadow: hasContent ? '0 0 8px rgba(74,222,128,0.6)' : 'none',
            }}
            transition={{ duration: 0.3 }}
            style={{ width: '7px', height: '7px', borderRadius: '50%' }}
          />
          <span
            style={{
              fontSize: '12px', fontWeight: 500,
              color: hasContent ? '#4ADE80' : '#475569',
              transition: 'color 0.3s ease',
            }}
          >
            {hasContent ? 'Response recorded' : 'Awaiting your response'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {question.isFinal && (
            <span style={{
              fontSize: '11px', color: '#F97316', fontWeight: 600,
              padding: '2px 10px', borderRadius: '999px',
              background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)',
            }}>
              Final Question
            </span>
          )}
          <span style={{ fontSize: '12px', color: '#64748B', fontVariantNumeric: 'tabular-nums' }}>
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </span>
        </div>
      </div>
      {toast}
      {validationMessage && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginTop: '0.75rem',
            padding: '10px 14px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '13px' }}>⚠️</span>
          <span style={{ fontSize: '12px', color: '#FCA5A5', fontWeight: 500 }}>
            {validationMessage}
          </span>
        </motion.div>
      )}
      {/* writing prompt hint */}
      {!hasContent && !focused && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{
            marginTop: '0.75rem',
            padding: '10px 14px',
            background: 'rgba(99,102,241,0.05)',
            border: '1px solid rgba(99,102,241,0.1)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}
        >
          <span style={{ fontSize: '13px' }}>💡</span>
          <span style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.5 }}>
            Click the field above and share your thoughts. Write between 15 and 40 meaningful words — think thoroughly.
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}