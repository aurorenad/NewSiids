import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { SplitWorkspaceLayout } from '../../components/ui/SplitWorkspaceLayout';
import { GlassMetricCard } from '../../components/ui/GlassMetricCard';
import { WorkflowStepper } from '../../components/ui/WorkflowStepper';
import { StatusBadgeSystem } from '../../components/ui/StatusBadgeSystem';
import { OTPVerificationWizard } from '../../components/ui/OTPVerificationWizard';
import { TimelineActivityFeed } from '../../components/ui/TimelineActivityFeed';
import { AppShell } from '../../components/layout/AppShell';
import { 
  Layers, CheckSquare, Coins, ArrowUpRight, Search, 
  X, Check, Hand, ShieldCheck, Filter, FileText
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './StockManagerDashboard.css';

export const StockManagerDashboard = () => {
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortDimension, setSortDimension] = useState('date');
  
  // Release Form State
  const [showReleaseForm, setShowReleaseForm] = useState(false);
  const [releaseForm, setReleaseForm] = useState({
    auctionEstimate: '',
    proposedAuctionDate: '',
    buyerCategory: 'REGISTERED_RECYCLER',
    smNotes: ''
  });

  // Handover Form State
  const [showHandoverWizard, setShowHandoverWizard] = useState(false);
  const [winnerData, setWinnerData] = useState({ name: '', phone: '' });
  const [showHandoverOtp, setShowHandoverOtp] = useState(false);

  // Fetch Main Stock inventory
  const { data: goodsResponse, isLoading } = useQuery({
    queryKey: ['goods'],
    queryFn: () => apiClient.get('/stock/goods')
  });
  const goodsList = goodsResponse?.data?.data || [];
  
  // Filter for items in Main Stock sequence (excluding temporary DRAFTs/SEIZED)
  const mainStockItems = goodsList.filter(item => 
    item.status !== 'DRAFT' && item.status !== 'SEIZED' && item.status !== 'OTP_VERIFICATION_PENDING'
  );

  // Sort and filter logic
  const filteredItems = mainStockItems.filter(item => 
    item.goodsDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.pvNumber && item.pvNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a, b) => {
    if (sortDimension === 'pv') {
      return (a.pvNumber || '').localeCompare(b.pvNumber || '');
    }
    if (sortDimension === 'type') {
      return a.goodsType.localeCompare(b.goodsType);
    }
    return b.seizedAt.localeCompare(a.seizedAt); // default sort by intake date
  });

  // Dashboard Aggregates
  const { data: metricsResponse } = useQuery({
    queryKey: ['metrics'],
    queryFn: () => apiClient.get('/finance/summary')
  });
  const metrics = metricsResponse?.data?.data || {
    mainStockCount: 0,
    pendingReleaseCount: 0,
    auctionRevenueRwf: 0
  };

  // Warehouse occupancy metrics configuration
  const occupancyChartData = [
    { name: 'Gikondo Whse', occupancy: 72 },
    { name: 'Rubavu Port', occupancy: 45 },
    { name: 'Rusizi Border', occupancy: 30 },
    { name: 'Kagitumba', occupancy: 15 }
  ];

  // Request Release Mutation
  const requestReleaseMutation = useMutation({
    mutationFn: (payload) => apiClient.post('/stock/release-notes', payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['goods']);
      queryClient.invalidateQueries(['metrics']);
      setSelectedItem(data.data.data);
      setShowReleaseForm(false);
    }
  });

  // Verify Handover Mutation
  const verifyHandoverMutation = useMutation({
    mutationFn: (id) => apiClient.post(`/stock/goods/${id}/approve-release`), // simulates handover state commit
    onSuccess: () => {
      queryClient.invalidateQueries(['goods']);
      queryClient.invalidateQueries(['metrics']);
      // Update local state to match HANDED_OVER mock behavior
      setSelectedItem(prev => ({
        ...prev,
        status: 'HANDED_OVER',
        winnerName: winnerData.name,
        winnerPhone: winnerData.phone
      }));
      setShowHandoverWizard(false);
      setShowHandoverOtp(false);
      setWinnerData({ name: '', phone: '' });
    }
  });

  const handleReleaseSubmit = (e) => {
    e.preventDefault();
    requestReleaseMutation.mutate({
      goodsId: selectedItem.id,
      ...releaseForm
    });
  };

  const handleHandoverConfirm = (e) => {
    e.preventDefault();
    setShowHandoverOtp(true);
  };

  const getActiveStep = (status) => {
    switch (status) {
      case 'MAIN_STOCK': return 0;
      case 'RELEASE_REQUEST_PENDING': return 1;
      case 'RELEASE_APPROVED': return 2;
      case 'HANDED_OVER': return 3;
      default: return 0;
    }
  };

  // LEFT COLUMN VIEW
  const leftPaneView = (
    <div className="stock-manager-left-workspace">
      {/* Metrics Row */}
      <div className="metrics-grid-row">
        <GlassMetricCard title="Main Inventory" value={metrics.mainStockCount} icon={<Layers size={16} />} />
        <GlassMetricCard title="Release Pending" value={metrics.pendingReleaseCount} icon={<CheckSquare size={16} />} />
        <GlassMetricCard 
          title="Auction Proceeds" 
          value={`${metrics.auctionRevenueRwf.toLocaleString()} RWF`} 
          icon={<Coins size={16} />} 
          subtitle="Total Collected YTD"
        />
      </div>

      {/* Filter toolbar */}
      <div className="table-filter-toolbar glass-panel">
        <div className="search-bar-wrapper">
          <Search size={14} className="bar-search-icon" />
          <input 
            type="text" 
            placeholder="Search PV reference number..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filters-group-row">
          <div className="filter-select-wrapper">
            <Filter size={14} className="filter-icon" />
            <select value={sortDimension} onChange={(e) => setSortDimension(e.target.value)}>
              <option value="date">Sort by Intake Date</option>
              <option value="pv">Sort by PV reference</option>
              <option value="type">Sort by category</option>
            </select>
          </div>
        </div>
      </div>

      {/* Inventory table */}
      <div className="main-stock-table-card glass-panel">
        <table className="siids-virtual-table">
          <thead>
            <tr>
              <th>PV Number</th>
              <th>Goods Description</th>
              <th>Category</th>
              <th>Warehouse</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="table-loader-cell">Loading main stock...</td></tr>
            ) : filteredItems.length === 0 ? (
              <tr><td colSpan={5} className="table-empty-cell">No items in main stock matching filters.</td></tr>
            ) : (
              filteredItems.map(item => (
                <tr 
                  key={item.id} 
                  className={`virtual-row-item ${selectedItem?.id === item.id ? 'row-selected' : ''}`}
                  onClick={() => {
                    setSelectedItem(item);
                    setShowReleaseForm(false);
                    setShowHandoverWizard(false);
                    setShowHandoverOtp(false);
                  }}
                >
                  <td className="desc-cell-title">{item.pvNumber || 'Pending'}</td>
                  <td>{item.goodsDescription}</td>
                  <td>{item.goodsType}</td>
                  <td>{item.location}</td>
                  <td><StatusBadgeSystem status={item.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Recharts Bar Chart panel */}
      <div className="stock-analytics-panel glass-panel">
        <h3>Warehouse Capacity & Occupancy Analysis</h3>
        <div className="chart-container-panel">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={occupancyChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#64748B" fontSize={11} />
              <YAxis stroke="#64748B" fontSize={11} unit="%" />
              <Tooltip />
              <Bar dataKey="occupancy" fill="#003DA5" radius={[4, 4, 0, 0]} name="Occupancy %" barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  // RIGHT COLUMN VIEW
  const rightPaneView = (
    <div className="stock-manager-right-workspace">
      {/* 1. Request Release Form */}
      {showReleaseForm && (
        <div className="workspace-inspector-panel">
          <div className="inspector-panel-header">
            <h3>Initiate Release Request</h3>
            <button className="panel-close-trigger" onClick={() => setShowReleaseForm(false)}><X size={16} /></button>
          </div>

          <form onSubmit={handleReleaseSubmit} className="wizard-form-body">
            <div className="form-input-group">
              <label>Goods Item</label>
              <input type="text" readOnly value={selectedItem.goodsDescription} className="input-disabled-preview" />
            </div>

            <div className="form-row-inputs">
              <div className="form-input-group">
                <label>Estimated Auction Price (RWF)</label>
                <input 
                  type="number" 
                  required 
                  placeholder="e.g. 3500000"
                  value={releaseForm.auctionEstimate}
                  onChange={(e) => setReleaseForm({ ...releaseForm, auctionEstimate: e.target.value })}
                />
              </div>

              <div className="form-input-group">
                <label>Proposed Auction Date</label>
                <input 
                  type="date" 
                  required 
                  value={releaseForm.proposedAuctionDate}
                  onChange={(e) => setReleaseForm({ ...releaseForm, proposedAuctionDate: e.target.value })}
                />
              </div>
            </div>

            <div className="form-input-group">
              <label>Buyer Category</label>
              <select value={releaseForm.buyerCategory} onChange={(e) => setReleaseForm({ ...releaseForm, buyerCategory: e.target.value })}>
                <option value="REGISTERED_RECYCLER">Registered Recycler</option>
                <option value="GENERAL_PUBLIC">General Public Auction</option>
                <option value="GOVERNMENT_DEPARTMENT">Government Org Handover</option>
              </select>
            </div>

            <div className="form-input-group">
              <label>Applicable Law Reference</label>
              <input type="text" readOnly value="EACCMA Act Section 201" className="input-disabled-preview" />
            </div>

            <div className="form-input-group">
              <label>Stock Manager Notes</label>
              <textarea 
                required 
                placeholder="Details on condition of release approval."
                value={releaseForm.smNotes}
                onChange={(e) => setReleaseForm({ ...releaseForm, smNotes: e.target.value })}
              />
            </div>

            <button type="submit" className="wizard-submit-btn" disabled={requestReleaseMutation.isLoading}>
              {requestReleaseMutation.isLoading ? 'Submitting Request...' : 'Submit Release Request'}
            </button>
          </form>
        </div>
      )}

      {/* 2. Detail Inspector Pane */}
      {selectedItem && !showReleaseForm && (
        <div className="workspace-inspector-panel">
          <div className="inspector-panel-header">
            <h3>Inventory file</h3>
            <button className="panel-close-trigger" onClick={() => setSelectedItem(null)}><X size={16} /></button>
          </div>

          <div className="inspector-details-card">
            <h2>{selectedItem.goodsDescription}</h2>
            <div className="detail-meta-table">
              <div className="meta-row"><span className="meta-lbl">PV Number:</span> <strong>{selectedItem.pvNumber || 'Pending'}</strong></div>
              <div className="meta-row"><span className="meta-lbl">Storage Location:</span> <span>{selectedItem.location}</span></div>
              <div className="meta-row"><span className="meta-lbl">Category:</span> <span>{selectedItem.goodsType}</span></div>
              <div className="meta-row"><span className="meta-lbl">Owner Name:</span> <span>{selectedItem.ownerName || 'Unknown'}</span></div>
            </div>

            {/* Stepper display */}
            <div className="inspector-workflow-step-wrapper">
              <WorkflowStepper 
                steps={['MAIN_STOCK', 'RELEASE_REQ', 'RELEASE_APPROVED', 'HANDED_OVER']} 
                activeStep={getActiveStep(selectedItem.status)}
              />
            </div>

            {/* Release metadata parameters display */}
            {selectedItem.releaseDetails && (
              <div className="release-details-summary-panel glass-panel" style={{ padding: '20px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '15px' }}>
                <div className="pdf-letterhead" style={{ textAlign: 'center', borderBottom: '2px solid #003DA5', paddingBottom: '10px', marginBottom: '15px' }}>
                  <img src="/Images/HomeLogo.jpeg" alt="RRA Crest" className="pdf-crest-img" style={{ width: '45px', height: '45px', borderRadius: '50%', marginBottom: '5px' }} />
                  <h4 style={{ margin: 0, color: '#003DA5', fontSize: '13px', fontWeight: 'bold' }}>RWANDA REVENUE AUTHORITY</h4>
                  <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Customs Stock Control & Escrow Services</span>
                  <p className="classification-banner" style={{ margin: '5px 0 0', fontSize: '9px', fontWeight: 'bold', color: '#D32F2F' }}>DISPOSAL & RELEASE PROPOSAL // FORM RP-202</p>
                </div>

                <div className="pdf-metadata-block" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '10px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '8px', marginBottom: '10px' }}>
                  <div><strong>PV Number:</strong> <span className="font-mono">{selectedItem.pvNumber}</span></div>
                  <div><strong>Proposed Date:</strong> <span>{selectedItem.releaseDetails.proposedAuctionDate}</span></div>
                  <div><strong>Valuation Estimate:</strong> <strong style={{ color: '#009A44' }}>{selectedItem.releaseDetails.auctionEstimate?.toLocaleString()} RWF</strong></div>
                  <div><strong>Buyer Category:</strong> <span>{selectedItem.releaseDetails.buyerCategory?.replace(/_/g, ' ')}</span></div>
                </div>

                <div className="pdf-document-body" style={{ fontSize: '10px', lineHeight: '1.4', marginBottom: '10px' }}>
                  <h5 style={{ color: '#003DA5', margin: '0 0 4px', fontSize: '11px' }}>I. Goods Description</h5>
                  <p style={{ margin: '0 0 8px', background: '#f8fafc', padding: '5px', borderRadius: '4px' }}>{selectedItem.goodsDescription}</p>

                  <h5 style={{ color: '#003DA5', margin: '0 0 4px', fontSize: '11px' }}>II. Stock Manager Justification</h5>
                  <p style={{ margin: 0, fontStyle: 'italic' }}>"{selectedItem.releaseDetails.smNotes}"</p>
                </div>

                <div className="pdf-signature-blocks" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '9px', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                  <div className="sig-block" style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: '#64748b' }}>Submitted By</span>
                    <strong className="sig-signed-name" style={{ color: '#003DA5', marginTop: '2px' }}>Claver Gatete</strong>
                    <span>Stock Manager</span>
                    <span style={{ color: '#009A44', fontWeight: 'bold', fontSize: '8px' }}>✓ Verified Electronic Stamp</span>
                  </div>

                  <div className="sig-block" style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: '#64748b' }}>PRSO Authorization</span>
                    <span style={{ marginTop: '2px' }}>
                      {selectedItem.status === 'RELEASE_APPROVED' || selectedItem.status === 'HANDED_OVER' ? (
                        <strong className="sig-signed-name" style={{ color: '#009A44' }}>Authorized ✓</strong>
                      ) : (
                        <span style={{ color: '#F5A800', fontWeight: 'bold' }}>Awaiting PRSO Sign-off...</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons based on status */}
            {selectedItem.status === 'MAIN_STOCK' && (
              <button className="btn-action-initiate-release" onClick={() => setShowReleaseForm(true)}>
                <ArrowUpRight size={14} />
                <span>Request Release Authorization</span>
              </button>
            )}

            {selectedItem.status === 'RELEASE_APPROVED' && !showHandoverWizard && (
              <button className="btn-action-handover" onClick={() => setShowHandoverWizard(true)}>
                <Hand size={14} />
                <span>Initiate Auction Winner Handover</span>
              </button>
            )}

            {/* Handover Winner OTP verification form */}
            {showHandoverWizard && (
              <div className="owner-return-flow-panel glass-panel">
                <h4>Auction Winner Handover Form</h4>
                <form onSubmit={handleHandoverConfirm} className="return-meta-form">
                  <div className="form-input-group">
                    <label>Winner Name</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="Winner name"
                      value={winnerData.name}
                      onChange={(e) => setWinnerData({ ...winnerData, name: e.target.value })}
                    />
                  </div>

                  <div className="form-input-group">
                    <label>Winner Phone Number</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="+250788000000"
                      value={winnerData.phone}
                      onChange={(e) => setWinnerData({ ...winnerData, phone: e.target.value })}
                    />
                  </div>

                  <div className="action-form-buttons">
                    <button type="submit" className="btn-form-confirm">Disburse Handover OTP</button>
                    <button type="button" className="btn-form-cancel" onClick={() => setShowHandoverWizard(false)}>Cancel</button>
                  </div>
                </form>

                {showHandoverOtp && (
                  <div className="otp-wizard-wrapper">
                    <OTPVerificationWizard 
                      phone={winnerData.phone} 
                      context="AUCTION_HANDOVER"
                      onSuccess={handleOtpSuccess}
                      onSkip={handleOtpSuccess}
                      ownerKnown={true}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Verification log trail */}
            {selectedItem.status === 'HANDED_OVER' && (
              <div className="handover-success-panel glass-panel">
                <ShieldCheck size={20} className="success-icon" />
                <div>
                  <strong>Goods Handed Over</strong>
                  <p>OTP verified. Winner Name: {selectedItem.winnerName || winnerData.name}</p>
                </div>
              </div>
            )}

            <div className="inspector-history-section">
              <h3>Action Trace Logs</h3>
              <TimelineActivityFeed 
                activities={[
                  { actorName: 'Jean Paul - Investigation Officer', message: 'Escalated from temporary stock. PV record generated.', timestamp: selectedItem.seizedAt, correlationId: 'cl-f0a82b1' },
                  selectedItem.releaseDetails && { actorName: 'Claver Gatete - Stock Manager', message: 'Release Request submitted to PRSO.', timestamp: new Date(Date.now() - 3600000).toISOString(), correlationId: 'cl-r81a2e1' },
                  selectedItem.status === 'RELEASE_APPROVED' && { actorName: 'PRSO Richard Tusabe', message: 'Release request authorized.', timestamp: new Date().toISOString(), correlationId: 'cl-a083d11' },
                  selectedItem.status === 'HANDED_OVER' && { actorName: 'Claver Gatete - Stock Manager', message: 'Auction Winner OTP confirmed. Handed over.', timestamp: new Date().toISOString(), correlationId: 'cl-h774b88' }
                ].filter(Boolean)}
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. Empty State Pane */}
      {!showReleaseForm && !selectedItem && (
        <div className="inspector-empty-state-card">
          <Layers size={48} className="empty-state-icon" />
          <h3>No Inventory Selected</h3>
          <p>Choose an escalated PV record to draft release requests, verify auction winner receipts, or inspect historical movement logs.</p>
        </div>
      )}
    </div>
  );

  return (
    <AppShell>
      <SplitWorkspaceLayout 
        leftPane={leftPaneView} 
        rightPane={rightPaneView} 
        isItemSelected={showReleaseForm || !!selectedItem}
      />
    </AppShell>
  );
};

export default StockManagerDashboard;
