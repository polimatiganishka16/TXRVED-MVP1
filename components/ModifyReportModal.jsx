'use client';

import { useState, useEffect } from 'react';

export default function ModifyReportModal({ report, isOpen, onClose, onSave }) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    capabilityTraits: [],
    strengths: [],
    improvements: [],
    recommendations: [],
  });

  // Update formData when modal opens or report changes
  useEffect(() => {
    if (isOpen && report) {
      const data = report.modifiedReport || report.reportData;
      setFormData({
        capabilityTraits: Array.isArray(data.capabilityTraits) 
          ? data.capabilityTraits.map(t => typeof t === 'string' ? t : t.traitName || t.name || '')
          : [],
        strengths: Array.isArray(data.strengths) ? data.strengths : [],
        improvements: Array.isArray(data.improvements) ? data.improvements : [],
        recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
      });
    }
  }, [isOpen, report]);

  if (!isOpen) return null;

  const handleAddItem = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const handleRemoveItem = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (field, index, value) => {
    setFormData(prev => {
      const updated = [...prev[field]];
      updated[index] = value;
      return { ...prev, [field]: updated };
    });
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const cleanedData = {
        capabilityTraits: formData.capabilityTraits.filter(t => t.trim()),
        strengths: formData.strengths.filter(s => s.trim()),
        improvements: formData.improvements.filter(i => i.trim()),
        recommendations: formData.recommendations.filter(r => r.trim()),
      };

      await onSave(cleanedData);
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save modified report');
    } finally {
      setIsLoading(false);
    }
  };

  const modalStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '2rem',
    overflowY: 'auto',
  };

  const modalContentStyle = {
    background: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(20,31,48,0.98) 100%)',
    borderRadius: '24px',
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '2.5rem',
    maxWidth: '1000px',
    width: '100%',
    boxShadow: '0 50px 100px rgba(0,0,0,0.5)',
    color: '#E2E8F0',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  const sectionStyle = {
    marginBottom: '2rem',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.2em',
    color: '#94A3B8',
    marginBottom: '1rem',
    textTransform: 'uppercase',
  };

  const itemContainerStyle = {
    display: 'grid',
    gap: '0.75rem',
    marginBottom: '1rem',
  };

  const itemInputStyle = {
    padding: '0.875rem 1rem',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(15,23,42,0.7)',
    color: '#E2E8F0',
    fontSize: '13px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    resize: 'vertical',
    minHeight: '60px',
  };

  const buttonContainerStyle = {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    marginTop: '0.5rem',
  };

  const removeButtonStyle = {
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid rgba(239,68,68,0.3)',
    background: 'rgba(239,68,68,0.1)',
    color: '#FECACA',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  };

  const addButtonStyle = {
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    border: '1px solid rgba(34,197,94,0.3)',
    background: 'rgba(34,197,94,0.1)',
    color: '#BBF7D0',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  };

  const renderEditableList = (field, title) => (
    <div style={sectionStyle}>
      <label style={labelStyle}>{title}</label>
      <div style={itemContainerStyle}>
        {formData[field].map((item, idx) => (
          <div key={idx}>
            <textarea
              value={item}
              onChange={(e) => handleItemChange(field, idx, e.target.value)}
              style={itemInputStyle}
              placeholder={`Enter ${title.toLowerCase()} item ${idx + 1}`}
              disabled={isLoading}
            />
            <div style={buttonContainerStyle}>
              <button
                onClick={() => handleRemoveItem(field, idx)}
                style={removeButtonStyle}
                disabled={isLoading}
                onMouseEnter={(e) => e.target.style.background = 'rgba(239,68,68,0.2)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(239,68,68,0.1)'}
              >
                🗑 Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => handleAddItem(field)}
        style={addButtonStyle}
        disabled={isLoading}
        onMouseEnter={(e) => e.target.style.background = 'rgba(34,197,94,0.2)'}
        onMouseLeave={(e) => e.target.style.background = 'rgba(34,197,94,0.1)'}
      >
        + Add {title}
      </button>
    </div>
  );

  return (
    <div style={modalStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalContentStyle}>
        {/* Header */}
        <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.5rem' }}>
            ✎ Modify Report Content
          </h2>
          <p style={{ margin: 0, color: '#94A3B8', fontSize: '13px' }}>
            Edit the AI-generated report content. Evaluation scores and metrics remain unchanged.
          </p>
        </div>

        {/* Edit Form */}
        <div style={{ maxHeight: 'calc(100vh - 400px)', overflowY: 'auto', paddingRight: '1rem' }}>
          {renderEditableList('capabilityTraits', 'AI Capability Traits')}
          {renderEditableList('strengths', 'Strengths')}
          {renderEditableList('improvements', 'Improvement Areas')}
          {renderEditableList('recommendations', 'Recommendations')}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            onClick={handleSave}
            disabled={isLoading}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              border: 'none',
              background: isLoading ? 'rgba(16,185,129,0.5)' : 'linear-gradient(135deg, #10B981, #059669)',
              color: '#fff',
              fontWeight: 700,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: isLoading ? 0.7 : 1,
            }}
            onMouseEnter={(e) => !isLoading && (e.target.style.boxShadow = '0 10px 25px rgba(16,185,129,0.3)')}
            onMouseLeave={(e) => (e.target.style.boxShadow = 'none')}
          >
            {isLoading ? '💾 Saving...' : '💾 Save Modified Report'}
          </button>
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(15,23,42,0.5)',
              color: '#E2E8F0',
              fontWeight: 700,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: isLoading ? 0.5 : 1,
            }}
            onMouseEnter={(e) => !isLoading && (e.target.style.background = 'rgba(15,23,42,0.8)')}
            onMouseLeave={(e) => (e.target.style.background = 'rgba(15,23,42,0.5)')}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
