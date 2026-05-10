import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import SignatureCanvas from 'react-signature-canvas';
import { stockApi } from '../../api/stockApi';
import { toast } from 'sonner';

const CreateSeizureNoteModal = ({ isOpen, onClose, onSuccess, initialCaseRef }) => {
  const [step, setStep] = useState(1);
  const [signatureData, setSignatureData] = useState(null);
  const sigCanvas = useRef(null);

  const [formData, setFormData] = useState({
    caseRef: initialCaseRef || '',
    taxpayerTin: '',
    taxpayerName: '',
    goodsDescription: '',
    seizureReason: '',
  });

  // Keep formData in sync if initialCaseRef changes while modal is closed
  React.useEffect(() => {
    if (initialCaseRef) {
      setFormData(prev => ({ ...prev, caseRef: initialCaseRef }));
    }
  }, [initialCaseRef]);

  if (!isOpen) return null;

  const handleNext = () => setStep(2);
  const handleBack = () => setStep(1);

  const clearSignature = () => {
    sigCanvas.current.clear();
    setSignatureData(null);
  };

  const saveSignature = () => {
    if (sigCanvas.current.isEmpty()) {
      toast.error('Please provide a signature');
      return false;
    }
    const dataUrl = sigCanvas.current.getCanvas().toDataURL('image/png');
    setSignatureData(dataUrl);
    return true;
  };

  const handleSubmit = async () => {
    if (!formData.caseRef || !formData.goodsDescription) {
      toast.error('Please fill in all required fields (Case Reference and Goods Description)');
      return;
    }
    if (!saveSignature()) return;
    
    try {
      // Send the date exactly as Jackson expects it
      const localDateTimeStr = new Date().toISOString().substring(0, 19);
      
      await stockApi.createSeizureNote({
        ...formData,
        dateTimeSeized: localDateTimeStr,
        officerSignatureBase64: sigCanvas.current.getCanvas().toDataURL('image/png')
      });
      toast.success('Seizure Note created successfully');
      onSuccess();
    } catch (err) {
      console.error('Failed to create Seizure Note:', err.response?.data || err);
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to create Seizure Note');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--gray-100)' }}>
          <h2 style={{ font: '600 18px var(--font-display)', margin: 0 }}>Create Seizure Note</h2>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <div style={{ flex: 1, height: 4, background: 'var(--rra-blue)', borderRadius: 2 }} />
            <div style={{ flex: 1, height: 4, background: step === 2 ? 'var(--rra-blue)' : 'var(--gray-200)', borderRadius: 2 }} />
          </div>
        </div>

        <div style={{ padding: 24 }}>
          {step === 1 && (
            <>
              <div className="form-field">
                <label className="form-label">Case Reference <span className="required">*</span></label>
                <input className="form-control" value={formData.caseRef} onChange={e => setFormData({...formData, caseRef: e.target.value})} placeholder="e.g. CS/23/10/45" />
              </div>
              <div className="form-grid-2">
                <div className="form-field">
                  <label className="form-label">Taxpayer TIN</label>
                  <input className="form-control" value={formData.taxpayerTin} onChange={e => setFormData({...formData, taxpayerTin: e.target.value})} />
                </div>
                <div className="form-field">
                  <label className="form-label">Taxpayer Name</label>
                  <input className="form-control" value={formData.taxpayerName} onChange={e => setFormData({...formData, taxpayerName: e.target.value})} />
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">Goods Description <span className="required">*</span></label>
                <textarea className="form-control" value={formData.goodsDescription} onChange={e => setFormData({...formData, goodsDescription: e.target.value})} rows={3} />
              </div>
              <div className="form-field">
                <label className="form-label">Seizure Reason</label>
                <input className="form-control" value={formData.seizureReason} onChange={e => setFormData({...formData, seizureReason: e.target.value})} />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p style={{ font: '14px var(--font-body)', color: 'var(--gray-500)', marginBottom: 16 }}>
                Please review the details and sign below to officially register these goods into Temporary Stock.
              </p>
              <div style={{ border: '1px solid var(--gray-300)', borderRadius: 8, background: '#FFF' }}>
                <SignatureCanvas 
                  ref={sigCanvas} 
                  penColor="#0D47A1"
                  canvasProps={{ width: 550, height: 200, className: 'sigCanvas' }} 
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="btn-ghost btn-sm" onClick={clearSignature}>Clear Signature</button>
              </div>
            </>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between' }}>
          <button className="btn-ghost" onClick={step === 1 ? onClose : handleBack}>
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          {step === 1 ? (
            <button className="btn-primary" onClick={handleNext}>Next: Signature</button>
          ) : (
            <button className="btn-success" onClick={handleSubmit}>Submit Seizure Note</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateSeizureNoteModal;
