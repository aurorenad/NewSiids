import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import SignatureCanvas from 'react-signature-canvas';
import { stockApi } from '../../api/stockApi';
import { CaseService } from '../../api/Axios/caseApi';
import { toast } from 'sonner';
import { MagnifyingGlassIcon, ClipboardIcon } from '@heroicons/react/24/outline';

import Portal from './Portal';
import { CheckCircleIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

const GOODS_TYPES = [
  'Electronics',
  'Vehicles',
  'Textiles / Clothing',
  'Food / Perishables',
  'Construction Materials',
  'Spare Parts',
  'Other (Specify)'
];

const SEIZURE_REASONS = [
  'Undeclared Goods',
  'Under-invoicing',
  'Misclassification',
  'Prohibited Items',
  'Counterfeit Goods',
  'Expired Permits',
  'Other (Specify)'
];

const CreateSeizureNoteModal = ({ isOpen, onClose, onSuccess, initialCaseRef }) => {
  const [step, setStep] = useState(1);
  const [signatureData, setSignatureData] = useState(null);
  const sigCanvas = useRef(null);

  const [cases, setCases] = useState([]);
  const [isLoadingCases, setIsLoadingCases] = useState(false);
  const [formData, setFormData] = useState({
    caseRef: initialCaseRef || '',
    taxpayerType: 'KNOWN',
    taxpayerTin: '',
    taxpayerName: '',
    taxpayerAddress: '',
    taxpayerContact: '',
    nationalId: '',
    physicalDescription: '',
    representativeName: '',
    representativeContact: '',
    goodsDescription: '',
    seizureReason: '',
    dateTimeSeized: new Date().toISOString().split('T')[0],
  });
  const [showRep, setShowRep] = useState(false);
  const [nextRef, setNextRef] = useState('');
  const [caseSearch, setCaseSearch] = useState('');
  const [isLookingUpTin, setIsLookingUpTin] = useState(false);
  const [tinFound, setTinFound] = useState(false);

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
          taxpayerAddress: selectedCase.taxPayer?.address || prev.taxpayerAddress,
          taxpayerContact: selectedCase.taxPayer?.contact || prev.taxpayerContact,
          seizureReason: selectedCase.summaryOfInformationCase || prev.seizureReason
        }));
        if (selectedCase.taxPayer?.tin) setTinFound(true);
      } else {
        setFormData(prev => ({ ...prev, caseRef: initialCaseRef }));
      }
    }
  }, [initialCaseRef, cases]);

  const handleTinLookup = async (tin) => {
    if (!tin || tin.length < 9) return;
    try {
      setIsLookingUpTin(true);
      const res = await CaseService.findTaxPayerByTIN(tin);
      if (res.data) {
        setFormData(prev => ({
          ...prev,
          taxpayerName: res.data.taxPayerName || '',
          taxpayerAddress: res.data.taxPayerAddress || '',
          taxpayerContact: res.data.taxPayerContact || ''
        }));
        setTinFound(true);
        toast.success('Taxpayer details auto-filled');
      }
    } catch (err) {
      console.log('TIN not found in local registry');
      setTinFound(false);
    } finally {
      setIsLookingUpTin(false);
    }
  };

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
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none', background: 'var(--gray-50)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--gray-200)' }}>
                    <input 
                      type="checkbox" 
                      style={{ width: 18, height: 18, accentColor: 'var(--rra-blue)' }}
                      checked={formData.taxpayerType === 'KNOWN'} 
                      onChange={e => setFormData({...formData, taxpayerType: e.target.checked ? 'KNOWN' : 'UNKNOWN'})} 
                    />
                    <div>
                      <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--gray-900)' }}>Taxpayer is Known</span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--gray-500)' }}>Check this if the taxpayer has a TIN or is registered in our system</span>
                    </div>
                  </label>
                </div>

                {formData.taxpayerType === 'KNOWN' ? (
                  <>
                    <div className="form-field">
                      <label className="form-label">Search & Link Investigation Case (Optional)</label>
                      <div style={{ position: 'relative', marginBottom: 8 }}>
                        <MagnifyingGlassIcon style={{ position: 'absolute', left: 12, top: 11, width: 16, color: 'var(--gray-400)' }} />
                        <input 
                          type="text"
                          placeholder="Search cases..."
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
                            taxpayerAddress: selectedCase?.taxPayer?.address || '',
                            taxpayerContact: selectedCase?.taxPayer?.contact || '',
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
                    </div>

                    <div style={{ background: 'var(--rra-blue-tint)', padding: 16, borderRadius: 12, marginBottom: 20, border: '1px solid var(--rra-blue-tint-2)' }}>
                      <div className="form-field">
                        <label className="form-label">Taxpayer TIN <span className="required">*</span></label>
                        <div style={{ position: 'relative' }}>
                          <input 
                            className="form-control" 
                            placeholder="Enter 9-digit TIN"
                            value={formData.taxpayerTin} 
                            onChange={e => {
                              const val = e.target.value;
                              setFormData({...formData, taxpayerTin: val});
                              if (val.length === 9) handleTinLookup(val);
                              else setTinFound(false);
                            }} 
                            onBlur={() => handleTinLookup(formData.taxpayerTin)}
                          />
                          <div style={{ position: 'absolute', right: 12, top: 11 }}>
                            {isLookingUpTin && <ArrowPathIcon className="animate-spin" style={{ width: 18, color: 'var(--rra-blue)' }} />}
                            {tinFound && !isLookingUpTin && <CheckCircleIcon style={{ width: 18, color: 'var(--rra-green)' }} />}
                          </div>
                        </div>
                      </div>

                      <div className="form-grid-2">
                        <div className="form-field">
                          <label className="form-label">Taxpayer Name</label>
                          <input className="form-control" value={formData.taxpayerName} onChange={e => setFormData({...formData, taxpayerName: e.target.value})} />
                        </div>
                        <div className="form-field">
                          <label className="form-label">National ID / Passport</label>
                          <input className="form-control" placeholder="ID Number" value={formData.nationalId} onChange={e => setFormData({...formData, nationalId: e.target.value})} />
                        </div>
                      </div>
                      
                      <div className="form-grid-2">
                        <div className="form-field" style={{ marginBottom: 0 }}>
                          <label className="form-label">Contact / Phone</label>
                          <input className="form-control" value={formData.taxpayerContact} onChange={e => setFormData({...formData, taxpayerContact: e.target.value})} />
                        </div>
                        <div className="form-field" style={{ marginBottom: 0 }}>
                          <label className="form-label">Address</label>
                          <input className="form-control" value={formData.taxpayerAddress} onChange={e => setFormData({...formData, taxpayerAddress: e.target.value})} />
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                        <input type="checkbox" checked={showRep} onChange={e => setShowRep(e.target.checked)} />
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-700)' }}>Add Representative / Agent details</span>
                      </label>
                      {showRep && (
                        <div style={{ marginTop: 12, padding: 14, border: '1px dashed var(--gray-300)', borderRadius: 8 }}>
                          <div className="form-grid-2">
                            <div className="form-field" style={{ marginBottom: 0 }}>
                              <label className="form-label">Rep. Name</label>
                              <input className="form-control btn-sm" value={formData.representativeName} onChange={e => setFormData({...formData, representativeName: e.target.value})} />
                            </div>
                            <div className="form-field" style={{ marginBottom: 0 }}>
                              <label className="form-label">Rep. Contact</label>
                              <input className="form-control btn-sm" value={formData.representativeContact} onChange={e => setFormData({...formData, representativeContact: e.target.value})} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ background: 'var(--rra-orange-tint)', padding: 16, borderRadius: 12, marginBottom: 20, border: '1px solid var(--rra-orange-dark)', borderWidth: '0 0 0 4px' }}>
                    <p style={{ fontSize: 13, color: 'var(--rra-orange-dark)', fontWeight: 600, marginBottom: 12 }}>Unknown Person - Identification Details</p>
                    <div className="form-field">
                      <label className="form-label">National ID (if partially available)</label>
                      <input 
                        className="form-control" 
                        placeholder="ID number or N/A" 
                        value={formData.nationalId} 
                        onChange={e => setFormData({...formData, nationalId: e.target.value})} 
                      />
                    </div>
                    <div className="form-field" style={{ marginBottom: 0 }}>
                      <label className="form-label">Physical Description <span className="required">*</span></label>
                      <textarea 
                        className="form-control" 
                        placeholder="e.g. Estimated age, height, clothing, identifying marks..." 
                        value={formData.physicalDescription} 
                        onChange={e => setFormData({...formData, physicalDescription: e.target.value})} 
                        rows={3}
                      />
                    </div>
                  </div>
                )}

                <div className="form-field">
                  <label className="form-label">Goods Type / Description <span className="required">*</span></label>
                  <select 
                    className="form-control"
                    value={GOODS_TYPES.includes(formData.goodsDescription) ? formData.goodsDescription : (formData.goodsDescription ? 'Other (Specify)' : '')}
                    onChange={e => {
                      const val = e.target.value;
                      if (val !== 'Other (Specify)') {
                        setFormData({...formData, goodsDescription: val});
                      } else {
                        setFormData({...formData, goodsDescription: ''});
                      }
                    }}
                  >
                    <option value="">-- Select Goods Type --</option>
                    {GOODS_TYPES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  {(!GOODS_TYPES.includes(formData.goodsDescription) || formData.goodsDescription === 'Other (Specify)') && (
                    <div style={{ marginTop: 10 }}>
                      <textarea 
                        className="form-control" 
                        placeholder="Please specify goods details..." 
                        value={formData.goodsDescription} 
                        onChange={e => setFormData({...formData, goodsDescription: e.target.value})} 
                        rows={2} 
                      />
                    </div>
                  )}
                </div>

                <div className="form-field">
                  <label className="form-label">Seizure Reason <span className="required">*</span></label>
                  <select 
                    className="form-control"
                    value={SEIZURE_REASONS.includes(formData.seizureReason) ? formData.seizureReason : (formData.seizureReason ? 'Other (Specify)' : '')}
                    onChange={e => {
                      const val = e.target.value;
                      if (val !== 'Other (Specify)') {
                        setFormData({...formData, seizureReason: val});
                      } else {
                        setFormData({...formData, seizureReason: ''});
                      }
                    }}
                  >
                    <option value="">-- Select Reason --</option>
                    {SEIZURE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  {(!SEIZURE_REASONS.includes(formData.seizureReason) || formData.seizureReason === 'Other (Specify)') && (
                    <div style={{ marginTop: 10 }}>
                      <input 
                        className="form-control" 
                        placeholder="Please describe the reason..." 
                        value={formData.seizureReason} 
                        onChange={e => setFormData({...formData, seizureReason: e.target.value})} 
                      />
                    </div>
                  )}
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
