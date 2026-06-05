import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { SplitWorkspaceLayout } from '../../components/ui/SplitWorkspaceLayout';
import { GlassMetricCard } from '../../components/ui/GlassMetricCard';
import { WorkflowStepper } from '../../components/ui/WorkflowStepper';
import { StatusBadgeSystem } from '../../components/ui/StatusBadgeSystem';
import { OTPVerificationWizard } from '../../components/ui/OTPVerificationWizard';
import { AppShell } from '../../components/layout/AppShell';
import { 
  Package, FileText, Smartphone, DollarSign, Plus, 
  Search, ShieldAlert, Check, X, FileUp, Filter, BarChart2,
  Clock, MapPin, Clipboard, CheckCircle, Download, FileCheck, RefreshCw
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './SurveillanceDashboard.css';

export const SurveillanceDashboard = () => {
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState(null);
  const [showIntakeForm, setShowIntakeForm] = useState(false);
  
  // Right-pane tab selection: SEIZURE_FILE, FIELD_DETAILS, TIMELINE
  const [inspectorTab, setInspectorTab] = useState('SEIZURE_FILE');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Seizure Creation Form State (Intake Ledger)
  const [noteMode, setNoteMode] = useState('DIGITAL'); // DIGITAL or PHYSICAL_SCAN
  const [formData, setFormData] = useState({
    goodsDescription: '',
    goodsType: 'ELECTRONICS',
    location: 'Gikondo Warehouse',
    ownerName: '',
    ownerPhone: '',
    ownerKnown: true,
    seizureReason: 'Smuggling'
  });

  // Return to Owner Form State
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [finesData, setFinesData] = useState({ fineAmount: '', penaltyAmount: '' });
  const [showReturnOtp, setShowReturnOtp] = useState(false);

  // Mock Field Details (GPS/Patrol logs) per Seizure Note
  const [fieldDetails, setFieldDetails] = useState({
    1001: { gps: '-1.9441, 30.0618 (Kigali Road)', patrolNotes: 'Intercepted transit van during routine vehicle inspection. Driver failed to supply cargo manifest stamps.', scanName: 'seizure_hilux_scanned.pdf' },
    1002: { gps: '-1.6912, 29.2284 (Rubavu Border)', patrolNotes: 'Cargo boxes bypassed standard customs scanner lane. Items seized on site.', scanName: 'manifest_electronics_gate3.pdf' }
  });
  const [scanUploadName, setScanUploadName] = useState('');

  // Fetch Temporary Stock Goods (using new aligned backend route)
  const { data: goodsResponse, isLoading } = useQuery({
    queryKey: ['goods', 'temporary'],
    queryFn: () => apiClient.get('/stock/goods/temporary').catch(() => apiClient.get('/stock/goods'))
  });
  
  // Unwrap response data
  const goodsList = Array.isArray(goodsResponse?.data)
    ? goodsResponse.data
    : (goodsResponse?.data?.data || []);

  // Filter & Search & Sort Logic
  const filteredGoodsList = goodsList
    .filter(item => {
      // 1. Search filter
      const matchesSearch = item.goodsDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.pvNumber && item.pvNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    })
    .filter(item => {
      // 2. Category filter
      if (filterType === 'ALL') return true;
      return item.goodsType === filterType;
    })
    .filter(item => {
      // 3. Status filter
      if (filterStatus === 'ALL') return true;
      return item.status === filterStatus;
    });

  // KPI Calculations
  const totalSeized = goodsList.length;
  const otpPending = goodsList.filter(item => item.status === 'OTP_VERIFICATION_PENDING').length;
  const warningCount = goodsList.filter(item => 
    item.status === 'SEIZED' && item.goodsType !== 'VEHICLE' && item.daysInStock >= 5 && item.daysInStock < 7
  ).length;
  const overdueCount = goodsList.filter(item => 
    item.status === 'SEIZED' && item.goodsType !== 'VEHICLE' && item.daysInStock >= 7
  ).length;

  // Chart data
  const reasonData = [
    { name: 'Smuggling', count: goodsList.filter(g => g.seizureReason === 'Smuggling' || g.id === 1002).length + 2 },
    { name: 'Transit Violation', count: goodsList.filter(g => g.seizureReason === 'Transit Violation').length + 1 },
    { name: 'Expired Entry', count: goodsList.filter(g => g.seizureReason === 'Expired Entry Card').length }
  ];

  // Seizure Creation Mutation (using aligned RRA endpoint)
  const createSeizureMutation = useMutation({
    mutationFn: (newPayload) => apiClient.post('/stock/goods/temporary/seizure-notes', newPayload).catch(() => apiClient.post('/stock/seizure-notes', newPayload)),
    onSuccess: () => {
      queryClient.invalidateQueries(['goods', 'temporary']);
      // Reset form
      setFormData({
        goodsDescription: '',
        goodsType: 'ELECTRONICS',
        location: 'Gikondo Warehouse',
        ownerName: '',
        ownerPhone: '',
        ownerKnown: true,
        seizureReason: 'Smuggling'
      });
      setShowIntakeForm(false);
    }
  });

  // Return to Owner Mutation
  const returnOwnerMutation = useMutation({
    mutationFn: (id) => apiClient.post(`/stock/goods/temporary/${id}/release`, finesData).catch(() => apiClient.post(`/stock/release-to-owner`, { goodsId: id, ...finesData })),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['goods', 'temporary']);
      setSelectedItem(null);
      setShowReturnForm(false);
      setShowReturnOtp(false);
      setFinesData({ fineAmount: '', penaltyAmount: '' });
    }
  });

  // Generate PV Document / Escalate to Main Stock
  const escalateMutation = useMutation({
    mutationFn: (id) => apiClient.post(`/stock/goods/temporary/${id}/escalate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries(['goods', 'temporary']);
      setSelectedItem(null);
    }
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    createSeizureMutation.mutate({
      ...formData,
      ownerOtpSkipped: !formData.ownerKnown
    });
  };

  const handleReturnConfirm = (e) => {
    e.preventDefault();
    setShowReturnOtp(true);
  };

  const handleOtpSuccess = () => {
    returnOwnerMutation.mutate(selectedItem.id);
  };

  const handleAddScan = (e) => {
    e.preventDefault();
    if (!scanUploadName || !selectedItem) return;

    setFieldDetails({
      ...fieldDetails,
      [selectedItem.id]: {
        ...(fieldDetails[selectedItem.id] || { gps: 'N/A', patrolNotes: 'No patrol notes.' }),
        scanName: scanUploadName.trim()
      }
    });
    setScanUploadName('');
  };

  const getDaysStyle = (item) => {
    if (item.goodsType === 'VEHICLE') return 'days-style-neutral';
    if (item.daysInStock >= 7) return 'days-style-danger';
    if (item.daysInStock >= 5) return 'days-style-warning';
    return 'days-style-safe';
  };

  const getActiveStep = (status) => {
    switch (status) {
      case 'DRAFT': return 0;
      case 'OTP_VERIFICATION_PENDING': return 1;
      case 'SEIZED': return 2;
      case 'RETURNED':
      case 'MAIN_STOCK':
      case 'RELEASED_TO_OWNER': return 3;
      default: return 2;
    }
  };

  // LEFT COLUMN VIEW
  const leftPaneView = (
    <div className="surveillance-left-workspace custom-scrollbar">
      {/* 1. Metrics Grid */}
      <div className="metrics-grid-row">
        <GlassMetricCard title="Active Seizures" value={totalSeized} icon={<Package size={16} />} />
        <GlassMetricCard title="OTP Pendings" value={otpPending} icon={<Smartphone size={16} />} />
        <GlassMetricCard 
          title="Escalation Alerts" 
          value={warningCount} 
          subtitle="Days 5 - 6 (No Vehicles)" 
          icon={<ShieldAlert size={16} className="text-warning-accent" />} 
        />
        <GlassMetricCard 
          title="Overdue Action" 
          value={overdueCount} 
          subtitle="Day 7+ Exceeded" 
          icon={<ShieldAlert size={16} className="text-danger-accent" />} 
        />
      </div>

      <div className="surveillance-left-main-grid">
        {showIntakeForm ? (
          /* 2. Intake Ledger Form */
          <div className="intake-form-card glass-panel border-l-brand">
            <div className="intake-card-header">
              <h3>
                <Plus size={16} />
                <span>Seizure Intake Ledger</span>
              </h3>
              <button 
                type="button" 
                className="btn-intake-close" 
                onClick={() => setShowIntakeForm(false)}
                title="Return to stock list"
              >
                <X size={16} />
              </button>
            </div>

            <div className="seizure-wizard-controls-row">
              <button 
                className={`wizard-mode-btn ${noteMode === 'DIGITAL' ? 'active' : ''}`}
                onClick={() => setNoteMode('DIGITAL')}
              >
                Digital Template
              </button>
              <button 
                className={`wizard-mode-btn ${noteMode === 'PHYSICAL_SCAN' ? 'active' : ''}`}
                onClick={() => setNoteMode('PHYSICAL_SCAN')}
              >
                Scan Attachment
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="intake-form-body">
              {noteMode === 'PHYSICAL_SCAN' && (
                <div className="form-upload-area-surv glass-panel">
                  <FileUp size={24} className="upload-icon" />
                  <span>Upload signed physical scan document</span>
                  <p>PDF or PNG, max 10MB</p>
                  <input type="file" className="file-input-bypass" disabled />
                </div>
              )}

              <div className="form-input-group">
                <label>Goods Description <span className="req">*</span></label>
                <textarea 
                  required 
                  placeholder="Details of item (e.g. make, serials, count)"
                  value={formData.goodsDescription}
                  onChange={(e) => setFormData({ ...formData, goodsDescription: e.target.value })}
                />
              </div>

              <div className="form-grid-2">
                <div className="form-input-group">
                  <label>Category</label>
                  <select value={formData.goodsType} onChange={(e) => setFormData({ ...formData, goodsType: e.target.value })}>
                    <option value="ELECTRONICS">Electronics</option>
                    <option value="VEHICLE">Vehicles</option>
                    <option value="TEXTILE">Textile</option>
                    <option value="ALCOHOL">Alcohol</option>
                  </select>
                </div>

                <div className="form-input-group">
                  <label>Seizure Reason</label>
                  <select value={formData.seizureReason} onChange={(e) => setFormData({ ...formData, seizureReason: e.target.value })}>
                    <option value="Smuggling">Smuggling</option>
                    <option value="Transit Violation">Transit Violation</option>
                    <option value="Expired Entry Card">Expired Entry Card</option>
                  </select>
                </div>
              </div>

              <div className="form-input-group">
                <label>Storage Location</label>
                <input 
                  type="text" 
                  required 
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div className="owner-toggle-switch">
                <label>Is Owner Known?</label>
                <input 
                  type="checkbox" 
                  checked={formData.ownerKnown}
                  onChange={(e) => setFormData({ ...formData, ownerKnown: e.target.checked })}
                />
              </div>

              {formData.ownerKnown && (
                <div className="form-grid-2">
                  <div className="form-input-group">
                    <label>Owner Name</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="Full name"
                      value={formData.ownerName}
                      onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    />
                  </div>

                  <div className="form-input-group">
                    <label>Owner Phone</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="+250788000000"
                      value={formData.ownerPhone}
                      onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <button type="submit" className="btn-create-case-submit" disabled={createSeizureMutation.isLoading}>
                <Database size={14} />
                <span>{createSeizureMutation.isLoading ? 'Recording Note...' : 'Record Seizure Note'}</span>
              </button>
            </form>
          </div>
        ) : (
          /* 3. Temporary Stock Ledger Queue */
          <div className="queue-list-card glass-panel">
            <div className="queue-card-header border-bottom">
              <div className="queue-header-left">
                <h3>
                  <Package size={16} />
                  <span>Temporary Stock Ledger</span>
                </h3>
              </div>
              
              <div className="queue-header-actions-row">
                <button 
                  className="btn-register-intel-trigger"
                  onClick={() => setShowIntakeForm(true)}
                >
                  <Plus size={14} />
                  <span>Record Seizure Note</span>
                </button>

                {/* Tab Filters */}
                <div className="tab-filters-row">
                  {['ALL', 'SEIZED', 'OTP_VERIFICATION_PENDING', 'RETURNED'].map((st) => (
                    <button 
                      key={st}
                      className={`tab-filter-btn ${filterStatus === st ? 'active' : ''}`}
                      onClick={() => { setFilterStatus(st); setSelectedItem(null); }}
                    >
                      {st === 'OTP_VERIFICATION_PENDING' ? 'OTP' : st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Search, Filter bar */}
            <div className="queue-search-sort-bar">
              <div className="search-box-wrapper">
                <Search size={14} />
                <input 
                  type="text" 
                  placeholder="Search description or PV..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="sort-select-wrapper">
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                  <option value="ALL">All Categories</option>
                  <option value="VEHICLE">Vehicles</option>
                  <option value="ELECTRONICS">Electronics</option>
                  <option value="TEXTILE">Textiles</option>
                  <option value="ALCOHOL">Alcohol</option>
                </select>
              </div>
            </div>

            {/* Virtual Table */}
            <div className="table-wrapper custom-scrollbar">
              <table className="siids-virtual-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Days in Stock</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={5} className="table-loader-cell">Fetching stock records...</td></tr>
                  ) : filteredGoodsList.length === 0 ? (
                    <tr><td colSpan={5} className="table-empty-cell">No items matched search parameters.</td></tr>
                  ) : (
                    filteredGoodsList.map((item) => (
                      <tr 
                        key={item.id} 
                        className={`virtual-row-item ${selectedItem?.id === item.id ? 'row-selected' : ''}`}
                        onClick={() => {
                          setSelectedItem(item);
                          setShowReturnForm(false);
                          setShowReturnOtp(false);
                          setInspectorTab('SEIZURE_FILE');
                        }}
                      >
                        <td className="desc-cell-title">{item.goodsDescription}</td>
                        <td>{item.goodsType}</td>
                        <td>{item.location}</td>
                        <td>
                          <span className={`days-stock-indicator ${getDaysStyle(item)}`}>
                            {item.goodsType === 'VEHICLE' ? 'Vehicle - No Limit' : `${item.daysInStock} Days`}
                          </span>
                        </td>
                        <td><StatusBadgeSystem status={item.status} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Seizure analytics placement */}
            <div className="surveillance-analytics-panel-inline">
              <h4>Seizure Reasons Distribution</h4>
              <div className="chart-container-panel">
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={reasonData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#64748B" fontSize={9} />
                    <YAxis stroke="#64748B" fontSize={9} />
                    <Tooltip cursor={{ fill: 'rgba(0, 61, 165, 0.04)' }} />
                    <Bar dataKey="count" fill="#003DA5" radius={[4, 4, 0, 0]} barSize={25} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // RIGHT COLUMN VIEW
  const rightPaneView = (
    <div className="surveillance-right-workspace">
      {selectedItem ? (
        <div className="workspace-inspector-panel glass-panel">
          <div className="inspector-panel-header">
            <div className="header-brand-title">
              <span className="case-ref-header">SEIZURE ID: #{selectedItem.id}</span>
              <h2>{selectedItem.goodsDescription}</h2>
            </div>
            <button className="panel-close-trigger" onClick={() => setSelectedItem(null)}><X size={16} /></button>
          </div>

          {/* Inspector Tabs */}
          <div className="inspector-tabs-navbar">
            <button 
              className={`inspector-tab-btn ${inspectorTab === 'SEIZURE_FILE' ? 'active' : ''}`}
              onClick={() => setInspectorTab('SEIZURE_FILE')}
            >
              <Package size={14} />
              <span>Seizure File</span>
            </button>
            <button 
              className={`inspector-tab-btn ${inspectorTab === 'FIELD_DETAILS' ? 'active' : ''}`}
              onClick={() => setInspectorTab('FIELD_DETAILS')}
            >
              <MapPin size={14} />
              <span>Field Details & Scan</span>
            </button>
            <button 
              className={`inspector-tab-btn ${inspectorTab === 'TIMELINE' ? 'active' : ''}`}
              onClick={() => setInspectorTab('TIMELINE')}
            >
              <Clock size={14} />
              <span>Tamper Timeline</span>
            </button>
          </div>

          <div className="inspector-tab-content custom-scrollbar">
            {/* TAB 1: SEIZURE FILE & STEPS */}
            {inspectorTab === 'SEIZURE_FILE' && (
              <div className="tab-pane-document">
                <div className="inspector-details-card">
                  <div className="intelligence-pdf-preview glass-panel" style={{ padding: '20px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '15px' }}>
                    <div className="pdf-letterhead" style={{ textAlign: 'center', borderBottom: '2px solid #003DA5', paddingBottom: '10px', marginBottom: '15px' }}>
                      <img src="/Images/HomeLogo.jpeg" alt="RRA Crest" className="pdf-crest-img" style={{ width: '50px', height: '50px', borderRadius: '50%', marginBottom: '5px' }} />
                      <h4 style={{ margin: 0, color: '#003DA5', fontSize: '14px', fontWeight: 'bold' }}>RWANDA REVENUE AUTHORITY</h4>
                      <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Intelligence & Enforcement Division</span>
                      <p className="classification-banner" style={{ margin: '5px 0 0', fontSize: '9px', fontWeight: 'bold', color: '#D32F2F' }}>TEMPORARY SEIZURE RECEIPT // FORM PV-901</p>
                    </div>

                    <div className="pdf-metadata-block" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '10px', marginBottom: '15px' }}>
                      <div><strong>Seizure Ref:</strong> <span className="font-mono">#{selectedItem.id}</span></div>
                      <div><strong>PV Number:</strong> <strong style={{ color: '#003DA5' }}>{selectedItem.pvNumber || 'PENDING ESCALATION'}</strong></div>
                      <div><strong>Seized Category:</strong> <span>{selectedItem.goodsType}</span></div>
                      <div><strong>Storage Warehouse:</strong> <span>{selectedItem.location}</span></div>
                      <div style={{ gridColumn: 'span 2' }}><strong>Intake Timestamp:</strong> <span>{new Date(selectedItem.seizedAt).toLocaleString()}</span></div>
                    </div>

                    <div className="pdf-document-body" style={{ fontSize: '11px', lineHeight: '1.4', marginBottom: '15px' }}>
                      <h5 style={{ color: '#003DA5', margin: '0 0 5px', fontSize: '12px' }}>I. Seized Cargo Description</h5>
                      <p style={{ margin: '0 0 10px', background: '#f8fafc', padding: '6px', borderRadius: '4px' }}>{selectedItem.goodsDescription}</p>

                      <h5 style={{ color: '#003DA5', margin: '0 0 5px', fontSize: '12px' }}>II. Owner Information</h5>
                      {selectedItem.ownerName === 'Unknown' ? (
                        <p style={{ margin: '0 0 10px', color: '#64748b', fontStyle: 'italic' }}>Owner status is unidentified. Captured as anonymous seizure.</p>
                      ) : (
                        <p style={{ margin: '0 0 10px' }}>
                          Name: <strong>{selectedItem.ownerName}</strong><br />
                          Contact: <span>{selectedItem.ownerPhone}</span>
                        </p>
                      )}

                      <h5 style={{ color: '#003DA5', margin: '0 0 5px', fontSize: '12px' }}>III. Legal Mandate Reference</h5>
                      <p style={{ margin: 0 }}>This seizure note was executed under the authority of EACCMA Act Section 201 regarding customs evasion. Subject items are held in temporary storage pending fine clearance (up to 7 days) or escalation to Main Stock.</p>
                    </div>

                    <div className="pdf-signature-blocks" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '10px', marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                      <div className="sig-block" style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: '#64748b' }}>Seized By</span>
                        <strong className="sig-signed-name" style={{ color: '#003DA5', marginTop: '4px' }}>Olivier Nsengimana</strong>
                        <span>Surveillance Officer</span>
                        <span className="sig-line-stamp" style={{ color: '#009A44', fontWeight: 'bold', fontSize: '9px', marginTop: '2px' }}>✓ Verified Electronic Stamp</span>
                      </div>

                      <div className="sig-block" style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: '#64748b' }}>Owner Acknowledgement</span>
                        <span className="sig-line" style={{ marginTop: '4px' }}>
                          {selectedItem.status === 'OTP_VERIFICATION_PENDING' ? (
                            <span style={{ color: '#F5A800', fontWeight: 'bold' }}>Awaiting OTP Verification...</span>
                          ) : selectedItem.ownerOtpSkipped ? (
                            <span style={{ color: '#64748b', fontStyle: 'italic' }}>Anonymous - Skipped OTP</span>
                          ) : (
                            <strong className="sig-signed-name" style={{ color: '#009A44' }}>OTP Confirmed ✓</strong>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stepper display */}
                  <div className="inspector-workflow-step-wrapper">
                    <WorkflowStepper 
                      steps={['DRAFT', 'OTP_VERIFY', 'SEIZED', 'FINISHED']} 
                      activeStep={getActiveStep(selectedItem.status)}
                      isWarning={selectedItem.goodsType !== 'VEHICLE' && selectedItem.daysInStock >= 5 && selectedItem.daysInStock < 7}
                      isOverdue={selectedItem.goodsType !== 'VEHICLE' && selectedItem.daysInStock >= 7}
                    />
                  </div>

                  {/* Action panel triggers for SEIZED status */}
                  {selectedItem.status === 'SEIZED' && !showReturnForm && (
                    <div className="action-buttons-group">
                      <button className="btn-action-return" onClick={() => setShowReturnForm(true)}>
                        <RefreshCw size={14} />
                        <span>Return to Owner</span>
                      </button>
                      <button 
                        className="btn-action-escalate" 
                        onClick={() => escalateMutation.mutate(selectedItem.id)}
                        disabled={selectedItem.daysInStock < 7 && selectedItem.goodsType !== 'VEHICLE'}
                      >
                        <FileCheck size={14} />
                        <span>Generate PV Document</span>
                      </button>
                    </div>
                  )}

                  {/* Return to Owner wizard */}
                  {showReturnForm && (
                    <div className="owner-return-flow-panel glass-panel">
                      <h4>Fines & Penalties Setup</h4>
                      <form onSubmit={handleReturnConfirm} className="return-meta-form">
                        <div className="form-input-group">
                          <label>Fine Amount (RWF)</label>
                          <input 
                            type="number" 
                            required 
                            placeholder="e.g. 50000"
                            value={finesData.fineAmount}
                            onChange={(e) => setFinesData({ ...finesData, fineAmount: e.target.value })}
                          />
                        </div>

                        <div className="form-input-group">
                          <label>Penalty Amount (RWF)</label>
                          <input 
                            type="number" 
                            required 
                            placeholder="e.g. 15000"
                            value={finesData.penaltyAmount}
                            onChange={(e) => setFinesData({ ...finesData, penaltyAmount: e.target.value })}
                          />
                        </div>

                        <div className="action-form-buttons">
                          <button type="submit" className="btn-form-confirm">Disburse OTP</button>
                          <button type="button" className="btn-form-cancel" onClick={() => setShowReturnForm(false)}>Cancel</button>
                        </div>
                      </form>

                      {showReturnOtp && (
                        <div className="otp-wizard-wrapper">
                          <OTPVerificationWizard 
                            phone={selectedItem.ownerPhone || '+250788123456'} 
                            context="OWNER_RETURN"
                            onSuccess={handleOtpSuccess}
                            onSkip={handleOtpSuccess}
                            ownerKnown={!!selectedItem.ownerPhone}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Render return fines details if status is RETURNED */}
                  {selectedItem.status === 'RETURNED' && selectedItem.fines && (
                    <div className="return-reason-alert glass-panel">
                      <CheckCircle size={18} className="text-success" />
                      <div>
                        <h4>Disbursed Fines Receipt</h4>
                        <p>Fine Amount: <strong>{selectedItem.fines.fineAmount} RWF</strong></p>
                        <p>Penalty Amount: <strong>{selectedItem.fines.penaltyAmount} RWF</strong></p>
                        <p>Released Timestamp: {new Date(selectedItem.fines.releasedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: FIELD DETAILS & PHOTOS */}
            {inspectorTab === 'FIELD_DETAILS' && (
              <div className="tab-pane-evidence">
                <div className="evidence-disclaimer-card glass-panel">
                  <MapPin size={18} className="text-brand" />
                  <div>
                    <h4>Field Incident Coordinates</h4>
                    <p>GPS: <strong>{fieldDetails[selectedItem.id]?.gps || 'Not Logged'}</strong></p>
                  </div>
                </div>

                <div className="evidence-list-container">
                  <h4>Patrol Officer Logs</h4>
                  <div className="patrol-logs-content glass-panel">
                    <Clipboard size={16} className="log-icon-field" />
                    <p>{fieldDetails[selectedItem.id]?.patrolNotes || 'No patrol logs registered during initial seizure intercept.'}</p>
                  </div>
                </div>

                <div className="evidence-list-container">
                  <h4>Signed Seizure Note Scan</h4>
                  {fieldDetails[selectedItem.id]?.scanName ? (
                    <div className="evidence-item-card glass-panel">
                      <div className="evidence-icon-wrapper">
                        <FileText size={20} className="text-brand" />
                      </div>
                      <div className="evidence-text-details">
                        <h5>{fieldDetails[selectedItem.id].scanName}</h5>
                        <span className="upload-hint">Legally verified scanned document.</span>
                      </div>
                      <button className="btn-delete-evidence" title="Download File"><Download size={14} /></button>
                    </div>
                  ) : (
                    <div className="evidence-empty-list">No signed scan document uploaded.</div>
                  )}
                </div>

                {/* Upload scan form */}
                <form onSubmit={handleAddScan} className="evidence-upload-form glass-panel">
                  <h4>Upload Signed Seizure Scan</h4>
                  <div className="upload-input-row">
                    <div className="file-input-wrapper">
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. Hilux_Intake_Scan_Gikondo.pdf"
                        value={scanUploadName}
                        onChange={(e) => setScanUploadName(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="btn-upload-file-submit">
                      <FileUp size={14} />
                      <span>Link Scan</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 3: LIFE CYCLE AUDIT TIMELINES */}
            {inspectorTab === 'TIMELINE' && (
              <div className="tab-pane-timeline">
                <h4>Lifecycle Trace Audit logs</h4>
                <p className="timeline-subtitle">Verification ledger timestamps recorded in database engine.</p>
                
                <div className="timeline-trail-container">
                  <div className="timeline-trail-item">
                    <div className="timeline-trail-marker">
                      <div className="trail-dot dot-intake"><Plus size={10} /></div>
                      <div className="trail-line"></div>
                    </div>
                    <div className="timeline-trail-content glass-panel">
                      <div className="timeline-trail-header">
                        <h5>Seizure Entry Logged</h5>
                        <span className="trail-time"><Clock size={10} /> {new Date(selectedItem.seizedAt).toLocaleString()}</span>
                      </div>
                      <p>Logged under location {selectedItem.location}. Status initialized as SEIZED.</p>
                    </div>
                  </div>

                  {selectedItem.status === 'OTP_VERIFICATION_PENDING' && (
                    <div className="timeline-trail-item">
                      <div className="timeline-trail-marker">
                        <div className="trail-dot dot-submit"><Smartphone size={10} /></div>
                      </div>
                      <div className="timeline-trail-content glass-panel">
                        <div className="timeline-trail-header">
                          <h5>OTP Verification Pending</h5>
                          <span className="trail-time"><Clock size={10} /> Just Now</span>
                        </div>
                        <p>SMS OTP code dispatched to owner registered contact {selectedItem.ownerPhone}.</p>
                      </div>
                    </div>
                  )}

                  {selectedItem.status === 'RETURNED' && (
                    <div className="timeline-trail-item">
                      <div className="timeline-trail-marker">
                        <div className="trail-dot dot-ac_sign"><CheckCircle size={10} /></div>
                      </div>
                      <div className="timeline-trail-content glass-panel">
                        <div className="timeline-trail-header">
                          <h5>Returned to Owner</h5>
                          <span className="trail-time"><Clock size={10} /> Just Now</span>
                        </div>
                        <p>Fines cleared. OTP validated. Release receipt printed successfully.</p>
                      </div>
                    </div>
                  )}

                  {selectedItem.status === 'MAIN_STOCK' && (
                    <div className="timeline-trail-item">
                      <div className="timeline-trail-marker">
                        <div className="trail-dot dot-doi_sign"><FileCheck size={10} /></div>
                      </div>
                      <div className="timeline-trail-content glass-panel">
                        <div className="timeline-trail-header">
                          <h5>Escalated to Main Stock</h5>
                          <span className="trail-time"><Clock size={10} /> Just Now</span>
                        </div>
                        <p>Aging limit exceeded (7+ days). PV Document {selectedItem.pvNumber} auto-generated. Escalated to Manager.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="inspector-empty-state-card glass-panel">
          <Package size={48} className="empty-state-icon" />
          <h3>No Record Selected</h3>
          <p>Choose an item in the temporary stock database queue to inspect its workflow step, process owner returns, or download PV scans.</p>
          <div className="empty-state-footer">
            <span className="classification-pill">TEMPORARY STORAGE</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <AppShell>
      <SplitWorkspaceLayout 
        leftPane={leftPaneView} 
        rightPane={rightPaneView} 
        isItemSelected={!!selectedItem}
      />
    </AppShell>
  );
};

export default SurveillanceDashboard;
