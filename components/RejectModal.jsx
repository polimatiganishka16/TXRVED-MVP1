'use client';

export default function RejectModal({ show, reason, onReasonChange, onCancel, onConfirm }) {
  if (!show) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: '#1e293b',
          padding: '24px',
          borderRadius: '12px',
          width: '450px',
        }}
      >
        <h3
          style={{
            color: '#F8FAFC',
            marginBottom: '12px',
            fontSize: '20px',
            fontWeight: '600',
          }}
        >
          Reject Report
        </h3>
        <p
          style={{
            color: '#CBD5E1',
            marginBottom: '8px',
            fontSize: '14px',
          }}
        >
          Please provide a reason for rejecting this report.
        </p>
        <textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="Enter rejection reason..."
          style={{
            width: '100%',
            minHeight: '120px',
            marginTop: '12px',
            padding: '12px',
            background: '#0f172a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#F8FAFC',
            fontSize: '14px',
            outline: 'none',
            resize: 'vertical',
          }}
        />

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            marginTop: '15px',
          }}
        >
          <button
            onClick={onCancel}
            style={{
              background: '#334155',
              color: '#F8FAFC',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Confirm Reject
          </button>
        </div>
      </div>
    </div>
  );
}
