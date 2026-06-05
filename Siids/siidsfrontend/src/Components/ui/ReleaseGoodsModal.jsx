import React, { useState } from 'react';
import { stockApi } from '../../api/stockApi';
import { toast } from 'sonner';

import Portal from './Portal';

const ReleaseGoodsModal = ({ isOpen, onClose, onSuccess, seizureId, seizureItem }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    releaseReason: '',
    recipientName: '',
    recipientIdPassport: '',
    releaseDestination: 'Owner Justified'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [mockOtpMessage, setMockOtpMessage] = useState('');
  const [generatedMockOtp, setGeneratedMockOtp] = useState('');

  if (!isOpen) return null;

  const handleSendOtp = async () => {
    // Pure frontend mockup
    const mockCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedMockOtp(mockCode);
    setIsOtpSent(true);
    setMockOtpMessage(`[MOCK OTP SERVER]: Sent code ${mockCode} to phone ${seizureItem?.taxpayerContact || 'UNKNOWN'}`);
    toast.success('Mock OTP Sent Successfully');
  };

  const handleVerifyOtp = async () => {
    if (otpCode === generatedMockOtp) {
      return true;
    } else {
      toast.error('Invalid OTP');
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 1) {
      if (!formData.releaseReason || !formData.recipientName || !formData.recipientIdPassport) {
        toast.error('Please fill in all required fields');
        return;
      }
      if (seizureItem?.taxpayerContact) {
        setStep(2);
      } else {
        // If no contact, just submit
        submitRelease();
      }
    } else if (step === 2) {
      if (!isOtpSent) {
        toast.error('Please send the OTP first');
        return;
      }
      const verified = await handleVerifyOtp();
      if (verified) {
        submitRelease();
      }
    }
  };

  const submitRelease = async () => {
    setIsSubmitting(true);
    try {
      await stockApi.releaseFromTemporaryStock(seizureId, formData);
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
              {step === 1 && (
                <>
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
                </>
              )}

              {step === 2 && (
                <div style={{ background: '#fdf8f6', padding: 20, borderRadius: 12, border: '1px solid #fbd5c8' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 600, color: '#9a3412' }}>Owner Acknowledgment (OTP)</h4>
                  <p style={{ margin: '0 0 16px 0', fontSize: 13, color: '#c2410c' }}>
                    Send an OTP to the recipient's phone ({seizureItem?.taxpayerContact}) for digital handover authorization.
                  </p>
                  
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <button type="button" className="btn-base" style={{ background: '#ea580c', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }} onClick={handleSendOtp}>
                      {isOtpSent ? 'Resend OTP' : 'Send OTP via SMS'}
                    </button>
                    {isOtpSent && (
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Enter 6-digit OTP" 
                        style={{ width: 160 }}
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value)}
                      />
                    )}
                  </div>
                  
                  {mockOtpMessage && (
                    <div style={{ marginTop: 12, padding: 10, background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: 6, color: '#0369a1', fontSize: 13 }}>
                      <strong>Mock Mode:</strong> {mockOtpMessage}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              {step === 2 && (
                <button type="button" className="btn-ghost" onClick={() => setStep(1)} disabled={isSubmitting}>
                  Back
                </button>
              )}
              <button type="button" className="btn-ghost" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" className="btn-success" disabled={isSubmitting}>
                {isSubmitting ? 'Processing...' : (step === 1 && seizureItem?.taxpayerContact ? 'Next: OTP Verification' : 'Confirm Release')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
};

export default ReleaseGoodsModal;
