import React, { useState } from 'react';
import { stockApi } from '../../api/stockApi';
import { toast } from 'sonner';

import Portal from './Portal';

const EscalatePVModal = ({ isOpen, onClose, onSuccess, seizureId, seizureNumber }) => {
  const [formData, setFormData] = useState({
    applicableLawReference: '',
    formalStatementText: '',
    reason: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.applicableLawReference || !formData.formalStatementText || !formData.reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await stockApi.escalateToMain(seizureId, formData);
      toast.success('Successfully created PV Document and escalated to Main Stock');
      onSuccess();
    } catch (err) {
      console.error('Failed to escalate goods:', err);
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to escalate to Main Stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Portal>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-card" onClick={e => e.stopPropagation()}>
          <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--gray-100)' }}>
            <h2 style={{ font: '600 18px var(--font-display)', margin: 0, color: 'var(--rra-red)' }}>Escalate to Main Stock (PV Document)</h2>
            <p style={{ margin: '8px 0 0', color: 'var(--gray-500)', fontSize: 14 }}>
              Escalating <strong style={{color: 'var(--gray-900)'}}>{seizureNumber}</strong> will automatically generate a Procès-Verbal (PV) Document and permanently transfer these goods to the Main Stock warehouse.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ padding: 24 }}>
              <div className="form-field">
                <label className="form-label">Applicable Law Reference <span className="required">*</span></label>
                <input 
                  className="form-control" 
                  value={formData.applicableLawReference} 
                  onChange={e => setFormData({...formData, applicableLawReference: e.target.value})} 
                  placeholder="e.g. Customs Act 2024, Article 42"
                />
              </div>

              <div className="form-field">
                <label className="form-label">Formal Statement / Circumstances <span className="required">*</span></label>
                <textarea 
                  className="form-control" 
                  value={formData.formalStatementText} 
                  onChange={e => setFormData({...formData, formalStatementText: e.target.value})} 
                  rows={3}
                  placeholder="Formal declaration of the context surrounding the escalation..."
                />
              </div>
              
              <div className="form-field">
                <label className="form-label">Reason for Escalation <span className="required">*</span></label>
                <textarea 
                  className="form-control" 
                  value={formData.reason} 
                  onChange={e => setFormData({...formData, reason: e.target.value})} 
                  rows={2}
                  placeholder="Explain why the owner failed to justify the goods in time"
                />
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button type="button" className="btn-ghost" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" className="btn-danger" disabled={isSubmitting}>
                {isSubmitting ? 'Processing...' : 'Generate PV Document'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
};

export default EscalatePVModal;
