import React, { useState } from 'react';
import { stockApi } from '../../api/stockApi';
import { toast } from 'sonner';

import Portal from './Portal';

const ReleaseGoodsModal = ({ isOpen, onClose, onSuccess, seizureId }) => {
  const [formData, setFormData] = useState({
    releaseReason: '',
    recipientName: '',
    recipientIdPassport: '',
    releaseDestination: 'Owner Justified'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.releaseReason || !formData.recipientName || !formData.recipientIdPassport) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await stockApi.releaseFromTemp(seizureId, formData);
      toast.success('Goods successfully released to owner');
      onSuccess();
    } catch (err) {
      console.error('Failed to release goods:', err);
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to release goods');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Portal>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-card" onClick={e => e.stopPropagation()}>
          <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--gray-100)' }}>
            <h2 style={{ font: '600 18px var(--font-display)', margin: 0, color: '#003DA5' }}>Release Goods to Owner</h2>
            <p style={{ margin: '8px 0 0', color: 'var(--gray-500)', fontSize: 14 }}>
              Please provide the justification details for releasing these items from temporary stock.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ padding: 24 }}>
              <div className="form-field">
                <label className="form-label">Recipient Name <span className="required">*</span></label>
                <input 
                  className="form-control" 
                  value={formData.recipientName} 
                  onChange={e => setFormData({...formData, recipientName: e.target.value})} 
                  placeholder="Full Name"
                />
              </div>
              
              <div className="form-field">
                <label className="form-label">Recipient ID / Passport <span className="required">*</span></label>
                <input 
                  className="form-control" 
                  value={formData.recipientIdPassport} 
                  onChange={e => setFormData({...formData, recipientIdPassport: e.target.value})} 
                  placeholder="National ID or Passport number"
                />
              </div>

              <div className="form-field">
                <label className="form-label">Justification / Release Reason <span className="required">*</span></label>
                <textarea 
                  className="form-control" 
                  value={formData.releaseReason} 
                  onChange={e => setFormData({...formData, releaseReason: e.target.value})} 
                  rows={4}
                  placeholder="Explain why the goods are being released back to the owner"
                />
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button type="button" className="btn-ghost" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" className="btn-success" disabled={isSubmitting}>
                {isSubmitting ? 'Processing...' : 'Confirm Release'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
};

export default ReleaseGoodsModal;
