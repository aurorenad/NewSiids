import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import SignatureCanvas from 'react-signature-canvas';
import { stockApi } from '../../api/stockApi';
import { CaseService } from '../../api/Axios/caseApi';
import { toast } from 'sonner';
import { MagnifyingGlassIcon, ClipboardIcon } from '@heroicons/react/24/outline';

import Portal from './Portal';

const CreateSeizureNoteModal = ({ isOpen, onClose, onSuccess, initialCaseRef }) => {
  const [step, setStep] = useState(1);
  const [signatureData, setSignatureData] = useState(null);
  const sigCanvas = useRef(null);

  const [cases, setCases] = useState([]);
  const [isLoadingCases, setIsLoadingCases] = useState(false);
  const [formData, setFormData] = useState({
    caseRef: initialCaseRef || '',
    taxpayerTin: '',
    taxpayerName: '',
    goodsDescription: '',
    seizureReason: '',
    dateTimeSeized: new Date().toISOString().split('T')[0],
  });
  const [nextRef, setNextRef] = useState('');
  const [caseSearch, setCaseSearch] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      const fetchInitialData = async () => {
        try {
          setIsLoadingCases(true);
          const [casesRes, refRes] = await Promise.all([
            CaseService.getMyCases(),
            stockApi.getNextReference()
          ]);
          setCases(casesRes.data || []);
          setNextRef(refRes.data?.nextReference || '');
        } catch (err) {
          console.error('Failed to fetch initial data:', err);
        } finally {
          setIsLoadingCases(false);
        }
      };
      fetchInitialData();
    }
  }, [isOpen]);

  // Keep formData in sync if initialCaseRef changes while modal is closed
  React.useEffect(() => {
    if (initialCaseRef && cases.length > 0) {
      const selectedCase = cases.find(c => c.caseNum === initialCaseRef);
      if (selectedCase) {
        setFormData(prev => ({
          ...prev,
          caseRef: initialCaseRef,
          taxpayerTin: selectedCase.taxPayer?.tin || prev.taxpayerTin,
          taxpayerName: selectedCase.taxPayer?.name || prev.taxpayerName,
          seizureReason: selectedCase.summaryOfInformationCase || prev.seizureReason
        }));
      } else {
        setFormData(prev => ({ ...prev, caseRef: initialCaseRef }));
      }
    }
  }, [initialCaseRef, cases]);

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
    if (!formData.goodsDescription) {
      toast.error('Please provide a Goods Description');
      return;
    }
    if (!saveSignature()) return;
    
    try {
      await stockApi.createSeizureNote({
        ...formData,
        dateTimeSeized: `${formData.dateTimeSeized}T00:00:00`,
        officerSignatureBase64: sigCanvas.current.getCanvas().toDataURL('image/png')
      });
      toast.success('Seizure Note created successfully');
      onSuccess();
    } catch (err) {
      console.error('Failed to create Seizure Note:', err.response?.data || err);
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to create Seizure Note');
    }
  };

  const filteredCases = cases.filter(c => 
    c.caseNum.toLowerCase().includes(caseSearch.toLowerCase()) ||
    (c.taxPayer?.name || '').toLowerCase().includes(caseSearch.toLowerCase()) ||
    (c.taxPayer?.tin || '').toLowerCase().includes(caseSearch.toLowerCase())
  );

  return (
    <Portal>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-card" onClick={e => e.stopPropagation()}>
          <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--gray-100)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ font: '600 18px var(--font-display)', margin: 0 }}>Create Seizure Note</h2>
              {nextRef && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--rra-blue-tint)', padding: '4px 10px', borderRadius: 6 }}>
                  <ClipboardIcon style={{ width: 14, height: 14, color: 'var(--rra-blue)' }} />
                  <span style={{ font: '600 12px var(--font-mono)', color: 'var(--rra-blue)' }}>{nextRef}</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <div style={{ flex: 1, height: 4, background: 'var(--rra-blue)', borderRadius: 2 }} />
              <div style={{ flex: 1, height: 4, background: step === 2 ? 'var(--rra-blue)' : 'var(--gray-200)', borderRadius: 2 }} />
            </div>
          </div>

          <div style={{ padding: 24 }}>
            {step === 1 && (
              <>
                <div className="form-field">
                  <label className="form-label">Search & Link Investigation Case (Smart Lookup)</label>
                  <div style={{ position: 'relative', marginBottom: 8 }}>
                    <MagnifyingGlassIcon style={{ position: 'absolute', left: 12, top: 11, width: 16, color: 'var(--gray-400)' }} />
                    <input 
                      type="text"
                      placeholder="Search by case number, taxpayer name or TIN..."
                      className="form-control"
                      style={{ paddingLeft: 36, fontSize: '13px' }}
                      value={caseSearch}
                      onChange={e => setCaseSearch(e.target.value)}
                    />
                  </div>
                  <select 
                    className="form-control" 
                    value={formData.caseRef} 
                    onChange={e => {
                      const selectedCaseNum = e.target.value;
                      const selectedCase = cases.find(c => c.caseNum === selectedCaseNum);
                      setFormData({
                        ...formData, 
                        caseRef: selectedCaseNum,
                        taxpayerTin: selectedCase?.taxPayer?.tin || '',
                        taxpayerName: selectedCase?.taxPayer?.name || '',
                        seizureReason: selectedCase?.summaryOfInformationCase || ''
                      });
                    }}
                  >
                    <option value="">-- Select from results --</option>
                    {filteredCases.map(c => (
                      <option key={c.id} value={c.caseNum}>
                        {c.caseNum} - {c.taxPayer?.name || 'Unknown'}
                      </option>
                    ))}
                  </select>
                  {isLoadingCases && <p style={{ fontSize: 11, color: 'var(--rra-blue)', marginTop: 4 }}>Loading cases...</p>}
                  {!isLoadingCases && filteredCases.length === 0 && caseSearch && (
                    <p style={{ fontSize: 11, color: 'var(--rra-orange)', marginTop: 4 }}>No cases match your search.</p>
                  )}
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
                <div className="form-field">
                  <label className="form-label">Date Seized <span className="required">*</span></label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={formData.dateTimeSeized} 
                    onChange={e => setFormData({...formData, dateTimeSeized: e.target.value})} 
                    max={new Date().toISOString().split('T')[0]}
                  />
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
    </Portal>
  );
};

export default CreateSeizureNoteModal;
