import React, { useState } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

const VARIANT_COLORS = {
  success: { icon: CheckCircleIcon, iconColor: '#009A44', btnClass: 'btn-success' },
  danger:  { icon: ExclamationTriangleIcon, iconColor: '#E05C00', btnClass: 'btn-danger' },
  warning: { icon: InformationCircleIcon, iconColor: '#F5A800', btnClass: 'btn-warning' },
};

const ConfirmDialog = ({
  isOpen, onClose, onConfirm,
  title, body, variant = 'warning',
  confirmLabel = 'Confirm',
  requiresReason = false
}) => {
  const [reason, setReason] = useState('');
  const canConfirm = !requiresReason || reason.trim().length >= 15;

  if (!isOpen) return null;

  const cfg = VARIANT_COLORS[variant] || VARIANT_COLORS.warning;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '24px 24px 0', textAlign: 'center' }}>
          <cfg.icon style={{ width: 40, height: 40, color: cfg.iconColor, margin: '0 auto 12px' }} />
          <h3 style={{ font: '600 16px var(--font-display)', color: 'var(--gray-900)' }}>{title}</h3>
          <p style={{ font: '14px var(--font-body)', color: 'var(--gray-500)', marginTop: 8 }}>{body}</p>
        </div>
        
        {requiresReason && (
          <div style={{ padding: '16px 24px 0' }}>
            <label className="form-label">Reason <span className="required">*</span></label>
            <textarea className="form-control" rows={3}
              placeholder="Provide a clear reason (min. 15 characters)…"
              value={reason} onChange={e => setReason(e.target.value)} />
            <p style={{ font: '12px var(--font-body)', color: 'var(--gray-400)', marginTop: 4 }}>
              {reason.length} / 15 minimum characters
            </p>
          </div>
        )}
        
        <div style={{ padding: '16px 24px 20px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className={`btn-base ${cfg.btnClass}`}
            disabled={!canConfirm}
            onClick={() => {
              onConfirm(requiresReason ? reason : undefined);
              if (requiresReason) setReason('');
            }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
