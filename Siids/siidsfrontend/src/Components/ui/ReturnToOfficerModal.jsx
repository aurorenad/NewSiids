import React, { useState } from 'react';
import { stockApi } from '../../api/stockApi';
import { toast } from 'sonner';

import Portal from './Portal';

const ReturnToOfficerModal = ({ isOpen, onClose, onSuccess, pvId, pvNumber }) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Please provide a reason for the edit request');
      return;
    }

    setIsSubmitting(true);
    try {
      await stockApi.returnToOfficer(pvId, { reason });
      toast.success('Goods returned to Surveillance Officer for correction');
      onSuccess();
    } catch (err) {
      console.error('Failed to return goods:', err);
      toast.error(err.response?.data?.message || 'Failed to return goods');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Portal>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-card" onClick={e => e.stopPropagation()}>
          <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--gray-100)' }}>
            <h2 style={{ font: '600 18px var(--font-display)', margin: 0, color: 'var(--rra-blue)' }}>Return to Officer</h2>
            <p style={{ margin: '8px 0 0', color: 'var(--gray-500)', fontSize: 14 }}>
              Returning goods for <strong style={{color: 'var(--gray-900)'}}>{pvNumber}</strong>. Please explain the discrepancy or correction needed so the Surveillance Officer can resubmit.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ padding: 24 }}>
              <div className="form-field">
                <label className="form-label">Reason for Return <span className="required">*</span></label>
                <textarea 
                  className="form-control" 
                  value={reason} 
                  onChange={e => setReason(e.target.value)} 
                  rows={4}
                  placeholder="Describe why this PV Document needs to be edited (e.g., mismatch in quantity, incorrect goods description...)"
                />
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button type="button" className="btn-ghost" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Returning...' : 'Return to Officer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
};

export default ReturnToOfficerModal;
