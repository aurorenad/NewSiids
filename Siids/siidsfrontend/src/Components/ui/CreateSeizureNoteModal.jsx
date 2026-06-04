import React, { useState, useEffect } from 'react';
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
  'Smuggling',
  'Transit Violation',
  'Expired Entry Card',
  'Other (Specify)'
];

const QUANTITY_TYPES = [
  'Bags',
  'Packages',
  'Cartons',
  'Boxes',
  'Kg',
  'Liters',
  'Numbers / Units',
  'Tons',
  'Other'
];

const CreateSeizureNoteModal = ({ isOpen, onClose, onSuccess, initialCaseRef, editItem }) => {
  const [step, setStep] = useState(1);
  const [cases, setCases] = useState([]);
  const [isLoadingCases, setIsLoadingCases] = useState(false);
  
  const [selectedGoodsType, setSelectedGoodsType] = useState('');
  const [selectedSeizureReason, setSelectedSeizureReason] = useState('');

  const [scanMode, setScanMode] = useState('DIGITAL'); // 'DIGITAL' or 'PHYSICAL'
  const [scanAttachmentUrl, setScanAttachmentUrl] = useState('');
  
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [ownerOtpSkipped, setOwnerOtpSkipped] = useState(false);
  const [mockOtpMessage, setMockOtpMessage] = useState('');
  const [generatedMockOtp, setGeneratedMockOtp] = useState('');

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
    quantity: '',
    quantityType: '',
    fullDescription: '',
    locationOfSeizure: '',
    conditionOfGoods: '',
    conveyanceMeans: '',
    conveyanceRegistration: '',
    seizureReason: '',
    estimatedValue: '',
    dateTimeSeized: new Date().toISOString().split('T')[0],
    authorizationPassword: '',
  });

  const [showRep, setShowRep] = useState(false);
  const [nextRef, setNextRef] = useState('');
  const [caseSearch, setCaseSearch] = useState('');
  const [isLookingUpTin, setIsLookingUpTin] = useState(false);
  const [tinFound, setTinFound] = useState(false);

  // Fetch Cases and Next Reference
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      const fetchInitialData = async () => {
        try {
          setIsLoadingCases(true);
          const [casesRes, refRes] = await Promise.all([
            CaseService.getMyCases(),
            editItem ? Promise.resolve({ data: { nextReference: editItem.seizureNumber } }) : stockApi.getNextReference()
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

      if (editItem) {
        setFormData({
          caseRef: editItem.relatedCase?.caseNum || '',
          taxpayerType: editItem.taxpayerType || 'KNOWN',
          taxpayerTin: editItem.taxpayerTin || '',
          taxpayerName: editItem.taxpayerName || '',
          taxpayerAddress: editItem.taxpayerAddress || '',
          taxpayerContact: editItem.taxpayerContact || '',
          nationalId: editItem.nationalId || '',
          physicalDescription: editItem.physicalDescription || '',
          representativeName: editItem.representativeName || '',
          representativeContact: editItem.representativeContact || '',
          goodsDescription: editItem.goodsDescription || '',
          quantity: editItem.quantity || '',
          quantityType: editItem.quantityType || '',
          fullDescription: editItem.fullDescription || '',
          locationOfSeizure: editItem.locationOfSeizure || '',
          conditionOfGoods: editItem.conditionOfGoods || '',
          conveyanceMeans: editItem.conveyanceMeans || '',
          conveyanceRegistration: editItem.conveyanceRegistration || '',
          seizureReason: editItem.seizureReason || '',
          estimatedValue: editItem.estimatedValue || '',
          dateTimeSeized: editItem.dateTimeSeized ? editItem.dateTimeSeized.split('T')[0] : new Date().toISOString().split('T')[0],
          authorizationPassword: '',
        });

        // Initialize Goods Type dropdown
        if (GOODS_TYPES.includes(editItem.goodsDescription)) {
          setSelectedGoodsType(editItem.goodsDescription);
        } else if (editItem.goodsDescription) {
          setSelectedGoodsType('Other (Specify)');
        } else {
          setSelectedGoodsType('');
        }

        // Initialize Seizure Reason dropdown
        if (SEIZURE_REASONS.includes(editItem.seizureReason)) {
          setSelectedSeizureReason(editItem.seizureReason);
        } else if (editItem.seizureReason) {
          setSelectedSeizureReason('Other (Specify)');
        } else {
          setSelectedSeizureReason('');
        }

        if (editItem.taxpayerTin) {
          setTinFound(true);
        }
        if (editItem.representativeName || editItem.representativeContact) {
          setShowRep(true);
        } else {
          setShowRep(false);
        }
      } else {
        // Clear form for creation mode
        setFormData({
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
          quantity: '',
          quantityType: '',
          fullDescription: '',
          locationOfSeizure: '',
          conditionOfGoods: '',
          conveyanceMeans: '',
          conveyanceRegistration: '',
          seizureReason: '',
          estimatedValue: '',
          dateTimeSeized: new Date().toISOString().split('T')[0],
          authorizationPassword: '',
        });
        setSelectedGoodsType('');
        setSelectedSeizureReason('');
        setTinFound(false);
        setShowRep(false);
      }
    }
  }, [isOpen, editItem, initialCaseRef]);

  // Sync formData and dropdown states on initialCaseRef or cases change (only for non-edit mode)
  useEffect(() => {
    if (initialCaseRef && cases.length > 0 && !editItem) {
      const selectedCase = cases.find(c => c.caseNum === initialCaseRef);
      if (selectedCase) {
        const initialReason = selectedCase.summaryOfInformationCase || '';
        setFormData(prev => ({
          ...prev,
          caseRef: initialCaseRef,
          taxpayerTin: selectedCase.taxPayer?.tin || prev.taxpayerTin,
          taxpayerName: selectedCase.taxPayer?.name || prev.taxpayerName,
          taxpayerAddress: selectedCase.taxPayer?.address || prev.taxpayerAddress,
          taxpayerContact: selectedCase.taxPayer?.contact || prev.taxpayerContact,
          seizureReason: initialReason
        }));
        if (selectedCase.taxPayer?.tin) setTinFound(true);

        // Pre-fill Seizure Reason Dropdown
        if (SEIZURE_REASONS.includes(initialReason)) {
          setSelectedSeizureReason(initialReason);
        } else if (initialReason) {
          setSelectedSeizureReason('Other (Specify)');
        }
      } else {
        setFormData(prev => ({ ...prev, caseRef: initialCaseRef }));
      }
    }
  }, [initialCaseRef, cases, editItem]);

  // Sync Dropdown Options to description/reason fields
  const handleGoodsTypeChange = (val) => {
    setSelectedGoodsType(val);
    if (val !== 'Other (Specify)') {
      setFormData(prev => ({ ...prev, goodsDescription: val }));
    } else {
      setFormData(prev => ({ ...prev, goodsDescription: '' }));
    }
  };

  const handleSeizureReasonChange = (val) => {
    setSelectedSeizureReason(val);
    if (val !== 'Other (Specify)') {
      setFormData(prev => ({ ...prev, seizureReason: val }));
    } else {
      setFormData(prev => ({ ...prev, seizureReason: '' }));
    }
  };

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

  const handleNext = () => {
    if (step === 1) {
      // Validations
      if (formData.taxpayerType === 'KNOWN' && !formData.taxpayerTin) {
        toast.error('Taxpayer TIN is required');
        return;
      }
      if (formData.taxpayerType === 'UNKNOWN' && !formData.physicalDescription) {
        toast.error('Physical Description is required for unknown taxpayer');
        return;
      }
      if (!formData.goodsDescription) {
        toast.error('Please specify the Goods Category');
        return;
      }
      if (!formData.quantity || !formData.quantityType) {
        toast.error('Please specify the Quantity and Unit');
        return;
      }
      if (!formData.fullDescription) {
        toast.error('Please provide a Full Description of the goods');
        return;
      }
      if (!formData.locationOfSeizure) {
        toast.error('Please specify the Location of Seizure');
        return;
      }
      if (!formData.conditionOfGoods) {
        toast.error('Please select the Condition of Goods');
        return;
      }
      if (!formData.seizureReason) {
        toast.error('Please specify the Seizure Reason');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
  };

  const handleSendOtp = async () => {
    // Pure frontend mockup
    const mockCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedMockOtp(mockCode);
    setIsOtpSent(true);
    setMockOtpMessage(`[MOCK OTP SERVER]: Sent code ${mockCode} to phone ${formData.taxpayerContact || 'UNKNOWN'}`);
    toast.success('Mock OTP Sent Successfully');
  };

  const handleVerifyOtp = async () => {
    if (otpCode === generatedMockOtp) {
      toast.success('Owner OTP Verified Successfully!');
      return true;
    } else {
      toast.error('Invalid OTP');
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!formData.authorizationPassword) {
      toast.error('Please enter your password to authorize');
      return;
    }

    if (!ownerOtpSkipped && scanMode === 'DIGITAL' && formData.taxpayerContact) {
      if (!isOtpSent) {
        toast.error('Please send and verify the Owner OTP first, or skip it.');
        return;
      }
      const isVerified = await handleVerifyOtp();
      if (!isVerified) return;
    }
    
    try {
      const payload = {
        ...formData,
        dateTimeSeized: `${formData.dateTimeSeized}T00:00:00`,
        scanAttachmentUrl: scanMode === 'PHYSICAL' ? scanAttachmentUrl : null,
        ownerOtpSkipped: ownerOtpSkipped
      };
      if (editItem) {
        await stockApi.updateSeizureNote(editItem.id, payload);
        toast.success('Seizure Note updated successfully');
      } else {
        await stockApi.createSeizureNote(payload);
        toast.success('Seizure Note created successfully');
      }
      onSuccess();
    } catch (err) {
      console.error('Failed to save Seizure Note:', err.response?.data || err);
      const msg = err.response?.data?.message || err.response?.data?.error || err.response?.data || 'Failed to save Seizure Note';
      toast.error(typeof msg === 'string' ? msg : 'Failed to save Seizure Note');
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
          {/* Modal Header */}
          <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--gray-100)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ font: '600 18px var(--font-display)', margin: 0 }}>{editItem ? 'Edit Seizure Note' : 'Create Seizure Note'}</h2>
              {nextRef && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--rra-blue-tint)', padding: '4px 10px', borderRadius: 6 }}>
                  <ClipboardIcon style={{ width: 14, height: 14, color: 'var(--rra-blue)' }} />
                  <span style={{ font: '600 12px var(--font-mono)', color: 'var(--rra-blue)' }}>{nextRef}</span>
                </div>
              )}
            </div>
            {/* Steps Visual Tracker */}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <div style={{ flex: 1, height: 4, background: 'var(--rra-blue)', borderRadius: 2 }} />
              <div style={{ flex: 1, height: 4, background: step >= 2 ? 'var(--rra-blue)' : 'var(--gray-200)', borderRadius: 2 }} />
              <div style={{ flex: 1, height: 4, background: step === 3 ? 'var(--rra-blue)' : 'var(--gray-200)', borderRadius: 2 }} />
            </div>
          </div>

          {/* Modal Content */}
          <div style={{ padding: 24, maxHeight: '60vh', overflowY: 'auto' }}>
            
            {/* STEP 1: Details Intake Form */}
            {step === 1 && (
              <>
                <div style={{ display: 'flex', gap: 16, marginBottom: 24, padding: 4, background: 'var(--gray-100)', borderRadius: 10 }}>
                  <button 
                    onClick={() => setScanMode('DIGITAL')}
                    style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 8, fontWeight: 600, background: scanMode === 'DIGITAL' ? '#fff' : 'transparent', color: scanMode === 'DIGITAL' ? 'var(--rra-blue)' : 'var(--gray-500)', boxShadow: scanMode === 'DIGITAL' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                  >
                    Digital Workflow
                  </button>
                  <button 
                    onClick={() => setScanMode('PHYSICAL')}
                    style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 8, fontWeight: 600, background: scanMode === 'PHYSICAL' ? '#fff' : 'transparent', color: scanMode === 'PHYSICAL' ? 'var(--rra-blue)' : 'var(--gray-500)', boxShadow: scanMode === 'PHYSICAL' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                  >
                    Physical Scan Upload
                  </button>
                </div>

                {scanMode === 'PHYSICAL' && (
                  <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '2px dashed var(--rra-blue-tint)', marginBottom: 24, textAlign: 'center' }}>
                    <ClipboardIcon style={{ width: 32, height: 32, color: 'var(--rra-blue)', margin: '0 auto 12px' }} />
                    <h4 style={{ margin: '0 0 8px 0', color: 'var(--gray-900)' }}>Upload Physical Seizure Note</h4>
                    <p style={{ margin: '0 0 16px 0', fontSize: 13, color: 'var(--gray-500)' }}>Scan and upload the signed physical document (PDF/JPG)</p>
                    <input 
                      type="file" 
                      accept=".pdf,.jpg,.png"
                      onChange={(e) => {
                        // Mock upload for now
                        setScanAttachmentUrl(URL.createObjectURL(e.target.files[0]));
                        toast.success('Document attached successfully');
                      }}
                      style={{ display: 'block', margin: '0 auto', fontSize: 13 }}
                    />
                  </div>
                )}

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none', background: 'var(--gray-50)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--gray-200)' }}>
                    <input 
                      type="checkbox" 
                      style={{ width: 18, height: 18, accentColor: 'var(--rra-blue)' }}
                      checked={formData.taxpayerType === 'KNOWN'} 
                      onChange={e => setFormData({...formData, taxpayerType: e.target.checked ? 'KNOWN' : 'UNKNOWN'})} 
                    />
                    <div>
                      <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--gray-900)' }}>Does the Taxpayer (Owner) exist?</span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--gray-500)' }}>Uncheck this if the owner escaped or is completely unknown.</span>
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
                          const initialReason = selectedCase?.summaryOfInformationCase || '';
                          setFormData({
                            ...formData, 
                            caseRef: selectedCaseNum,
                            taxpayerTin: selectedCase?.taxPayer?.tin || '',
                            taxpayerName: selectedCase?.taxPayer?.name || '',
                            taxpayerAddress: selectedCase?.taxPayer?.address || '',
                            taxpayerContact: selectedCase?.taxPayer?.contact || '',
                            seizureReason: initialReason
                          });
                          
                          if (SEIZURE_REASONS.includes(initialReason)) {
                            setSelectedSeizureReason(initialReason);
                          } else if (initialReason) {
                            setSelectedSeizureReason('Other (Specify)');
                          }
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
                    <p style={{ fontSize: 13, color: 'var(--rra-orange-dark)', fontWeight: 600, marginBottom: 12 }}>Owner Escaped / Unknown Details</p>
                    <div className="form-field" style={{ marginBottom: 0 }}>
                      <label className="form-label">Circumstances of Escape / Physical Description <span className="required">*</span></label>
                      <textarea 
                        className="form-control" 
                        placeholder="e.g. Owner abandoned the goods and escaped into the forest..." 
                        value={formData.physicalDescription} 
                        onChange={e => setFormData({...formData, physicalDescription: e.target.value})} 
                        rows={3}
                      />
                    </div>
                  </div>
                )}

                {/* Goods Type Dropdown */}
                <div className="form-grid-2">
                  <div className="form-field">
                    <label className="form-label">Goods Type / Category <span className="required">*</span></label>
                    <select 
                      className="form-control"
                      value={selectedGoodsType}
                      onChange={e => handleGoodsTypeChange(e.target.value)}
                    >
                      <option value="">-- Select Category --</option>
                      {GOODS_TYPES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Seizure Reason <span className="required">*</span></label>
                    <select 
                      className="form-control"
                      value={selectedSeizureReason}
                      onChange={e => handleSeizureReasonChange(e.target.value)}
                    >
                      <option value="">-- Select Reason --</option>
                      {SEIZURE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    {selectedSeizureReason === 'Other (Specify)' && (
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
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label className="form-label">Quantity <span className="required">*</span></label>
                    <input 
                      type="number"
                      className="form-control" 
                      placeholder="e.g. 50" 
                      value={formData.quantity} 
                      onChange={e => setFormData({...formData, quantity: e.target.value})} 
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Quantity Type <span className="required">*</span></label>
                    <select 
                      className="form-control"
                      value={formData.quantityType}
                      onChange={e => setFormData({...formData, quantityType: e.target.value})}
                    >
                      <option value="">-- Select Unit --</option>
                      {QUANTITY_TYPES.map(q => <option key={q} value={q}>{q}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">Full Description of Goods <span className="required">*</span></label>
                  <textarea 
                    className="form-control" 
                    placeholder="Enter detailed description including brands, colors, models..." 
                    value={formData.fullDescription} 
                    onChange={e => setFormData({...formData, fullDescription: e.target.value})} 
                    rows={3} 
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label className="form-label">Location of Seizure <span className="required">*</span></label>
                    <input 
                      type="text"
                      className="form-control" 
                      placeholder="e.g. Gatuna Border" 
                      value={formData.locationOfSeizure} 
                      onChange={e => setFormData({...formData, locationOfSeizure: e.target.value})} 
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Condition of Goods <span className="required">*</span></label>
                    <select 
                      className="form-control"
                      value={formData.conditionOfGoods}
                      onChange={e => setFormData({...formData, conditionOfGoods: e.target.value})}
                    >
                      <option value="">-- Select Condition --</option>
                      <option value="Good">Good / New</option>
                      <option value="Damaged">Damaged</option>
                      <option value="Perishable">Perishable</option>
                      <option value="Used">Used</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label className="form-label">Means of Conveyance</label>
                    <input 
                      type="text"
                      className="form-control" 
                      placeholder="e.g. Truck, Motorbike, Manual" 
                      value={formData.conveyanceMeans} 
                      onChange={e => setFormData({...formData, conveyanceMeans: e.target.value})} 
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Conveyance Registration <span style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 'normal' }}>(Optional)</span></label>
                    <input 
                      type="text"
                      className="form-control" 
                      placeholder="e.g. Plate Number (if known)" 
                      value={formData.conveyanceRegistration} 
                      onChange={e => setFormData({...formData, conveyanceRegistration: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label className="form-label">Estimated Value (RWF) <span style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 'normal' }}>(Optional)</span></label>
                    <input 
                      type="number"
                      className="form-control" 
                      placeholder="e.g. 500000" 
                      value={formData.estimatedValue} 
                      onChange={e => setFormData({...formData, estimatedValue: e.target.value})} 
                    />
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
                </div>
              </>
            )}

            {/* STEP 2: Live Written Document Preview */}
            {step === 2 && (
              <div>
                <p style={{ margin: '0 0 16px 0', fontSize: 13, color: 'var(--gray-500)' }}>
                  Review the seizure note styled as an official RRA Notice of Seizure before digital authorization:
                </p>
                <div style={{
                  background: '#ffffff',
                  border: '1px solid var(--gray-200)',
                  borderRadius: 12,
                  padding: '30px 40px',
                  fontFamily: "'Times New Roman', Times, serif",
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                  color: '#1a1a1a',
                  lineHeight: '1.6',
                  fontSize: '14px',
                  textAlign: 'justify'
                }}>
                  {/* Official Letterhead */}
                  <div style={{ textAlign: 'center', borderBottom: '2px solid var(--rra-blue)', paddingBottom: 8, marginBottom: 12 }}>
                    <h3 style={{ margin: '0 0 4px 0', color: 'var(--rra-blue)', font: '700 16px var(--font-display)', letterSpacing: '0.5px' }}>RWANDA REVENUE AUTHORITY</h3>
                    <span style={{ color: 'var(--rra-green)', font: '600 9px var(--font-display)', textTransform: 'uppercase', letterSpacing: '1px' }}>Taxes for Growth and Development</span>
                  </div>
                  
                  {/* Decorative Banner Stripes */}
                  <div style={{ display: 'flex', height: 4, width: '100%', marginBottom: 15 }}>
                    <div style={{ flex: 3, background: 'var(--rra-blue)' }} />
                    <div style={{ flex: 2, background: 'var(--rra-green)' }} />
                    <div style={{ flex: 3, background: 'var(--rra-blue)' }} />
                    <div style={{ flex: 2, background: '#E05C00' }} />
                  </div>

                  <div style={{ textAlign: 'right', font: '600 12px var(--font-mono)', color: 'var(--rra-red)', marginBottom: 15 }}>
                    Serial N°: <span style={{ textDecoration: 'underline' }}>{nextRef || 'SN-2026-PENDING'}</span>
                  </div>

                  <h4 style={{ textAlign: 'center', textTransform: 'uppercase', textDecoration: 'underline', font: '700 15px var(--font-display)', margin: '15px 0' }}>Notice of Seizure</h4>

                  <div style={{ marginBottom: 15, fontSize: '13px' }}>
                    <strong>To:</strong> <span style={{ borderBottom: '1px dotted #333', display: 'inline-block', minWidth: '220px', paddingLeft: 5, fontWeight: 'bold' }}>{formData.taxpayerName || '____________________'}</span>
                    <br />
                    <strong>of:</strong> <span style={{ borderBottom: '1px dotted #333', display: 'inline-block', minWidth: '220px', paddingLeft: 5, fontWeight: 'bold' }}>
                      {formData.taxpayerType === 'KNOWN' ? (formData.taxpayerTin || '____________________') : 'UNKNOWN TAXPAYER'}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px' }}>
                    <p style={{ margin: '0 0 10px 0' }}>1. Take notice that the following goods / items:</p>
                    <div style={{ background: '#fafafa', border: '1px solid #ddd', padding: '10px 15px', fontWeight: 'bold', fontStyle: 'italic', margin: '10px 0', whiteSpace: 'pre-wrap', borderLeft: '4px solid var(--rra-green)' }}>
                      {formData.quantity && formData.quantityType ? `${formData.quantity} ${formData.quantityType} - ` : ''}
                      {formData.goodsDescription ? `[${formData.goodsDescription}] ` : ''}
                      {formData.fullDescription || 'No goods specified.'}
                    </div>
                    <p style={{ margin: '10px 0' }}>
                      have been seized and are liable to forfeiture in accordance with the provisions of the East African Community Customs Management Act, on the following grounds:
                    </p>
                    
                    <div style={{ margin: '15px 0', padding: '10px 15px', borderLeft: '4px solid var(--rra-blue)', background: 'var(--rra-blue-tint)', fontStyle: 'italic' }}>
                      <strong>GROUNDS / REASON:</strong><br />
                      {formData.seizureReason || 'No grounds specified.'}
                    </div>

                    <p style={{ margin: '10px 0 20px 0' }}>
                      2. If you claim or intend to claim that the things seized are not liable to forfeiture you should, within one calendar month from the date of this notice, give notice in writing of your claim in accordance with the provisions of section 214 of the Act.
                    </p>

                    <div style={{ marginTop: 25, borderTop: '1px dashed var(--gray-200)', paddingTop: 15, display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontStyle: 'italic', color: 'var(--gray-500)', fontSize: '11px' }}>Offender / Representative Signature</div>
                        <div style={{ height: 30, borderBottom: '1px solid var(--gray-300)', width: 140, marginTop: 5 }} />
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontStyle: 'italic', color: 'var(--gray-500)', fontSize: '11px' }}>Authorized Proper Officer</div>
                        <div style={{ font: '600 12px var(--font-display)', color: 'var(--rra-blue)', marginTop: 5 }}>[Digitally Signed via Password]</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Document Authorization (Password confirmation) */}
            {step === 3 && (
              <>
                {scanMode === 'DIGITAL' && formData.taxpayerContact && (
                  <div style={{ background: '#fdf8f6', padding: 20, borderRadius: 12, border: '1px solid #fbd5c8', marginBottom: 20 }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 600, color: '#9a3412' }}>Owner Acknowledgment (OTP)</h4>
                    <p style={{ margin: '0 0 16px 0', fontSize: 13, color: '#c2410c' }}>
                      Send an OTP to the owner's phone ({formData.taxpayerContact}) for digital signature.
                    </p>
                    
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
                      <button className="btn-base" style={{ background: '#ea580c', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }} onClick={handleSendOtp}>
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
                    
                    <div style={{ marginTop: 16 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={ownerOtpSkipped} onChange={e => setOwnerOtpSkipped(e.target.checked)} />
                        <span style={{ fontSize: 13, color: '#9a3412' }}>Owner is not present / Skip OTP</span>
                      </label>
                    </div>
                  </div>
                )}

                <div style={{ background: 'var(--rra-blue-tint)', padding: 20, borderRadius: 12, border: '1px solid var(--rra-blue-tint-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ClipboardIcon style={{ width: 20, color: 'var(--rra-blue)' }} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--gray-900)' }}>Officer Authorization</h4>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-500)' }}>Enter your account password to digitally sign this seizure note</p>
                    </div>
                  </div>

                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <label className="form-label">Account Password <span className="required">*</span></label>
                    <input 
                      type="password" 
                      className="form-control" 
                      placeholder="••••••••"
                      value={formData.authorizationPassword} 
                      onChange={e => setFormData({...formData, authorizationPassword: e.target.value})} 
                    />
                    <p style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 6, fontStyle: 'italic' }}>
                      By entering your password, you acknowledge and authorize the seizure of goods as described in the previous step.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Modal Footer Controls */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn-ghost" onClick={step === 1 ? onClose : handleBack}>
              {step === 1 ? 'Cancel' : 'Back'}
            </button>
            {step < 3 ? (
              <button className="btn-primary" onClick={handleNext}>
                {step === 1 ? 'Next: Review Preview' : 'Next: Sign'}
              </button>
            ) : (
              <button className="btn-success" onClick={handleSubmit}>
                {editItem ? 'Update Seizure Note' : 'Submit Seizure Note'}
              </button>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default CreateSeizureNoteModal;
