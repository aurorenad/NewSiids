import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { SplitWorkspaceLayout } from '../../components/ui/SplitWorkspaceLayout';
import { GlassMetricCard } from '../../components/ui/GlassMetricCard';
import { StatusBadgeSystem } from '../../components/ui/StatusBadgeSystem';
import { TimelineActivityFeed } from '../../components/ui/TimelineActivityFeed';
import { AppShell } from '../../components/layout/AppShell';
import { useAuth } from '../../context/AuthContext';
import { 
  ShieldAlert, UserCheck, RefreshCw, Layers, Check, 
  X, AlertCircle, Sparkles, Send, Award 
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './PrsoDashboard.css';

export const PrsoDashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('RELEASES'); // RELEASES, RETURNS, DELEGATIONS
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Action reason states
  const [actionType, setActionType] = useState(null); // SEND_BACK, EXCEPTION
  const [actionReason, setActionReason] = useState('');

  // Delegation active local state simulator
  const [delegationActive, setDelegationActive] = useState(false);

  // Fetch Inventory items
  const { data: goodsResponse, isLoading } = useQuery({
    queryKey: ['goods'],
    queryFn: () => apiClient.get('/stock/goods')
  });
  const goodsList = goodsResponse?.data?.data || [];

  // Filter queues
  const releaseRequests = goodsList.filter(i => i.status === 'RELEASE_REQUEST_PENDING');
  const returnedGoods = goodsList.filter(i => i.status === 'RETURNED');

  // KPI metrics
  const activeRequestsCount = releaseRequests.length;
  const returnedReviewCount = returnedGoods.length;

  // Chart data
  const trendData = [
    { name: 'Week 1', value: 4 },
    { name: 'Week 2', value: 7 },
    { name: 'Week 3', value: 12 },
    { name: 'Week 4', value: activeRequestsCount + 5 }
  ];

  // Release Approval Mutation
  const approveReleaseMutation = useMutation({
    mutationFn: (id) => apiClient.post(`/stock/goods/${id}/approve-release`),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['goods']);
      setSelectedItem(null);
    }
  });

  // Deputy Send Back Mutation
  const sendBackMutation = useMutation({
    mutationFn: ({ id, reason }) => apiClient.patch(`/stock/goods/${id}/deputy-send-back`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries(['goods']);
      setSelectedItem(null);
      setActionType(null);
      setActionReason('');
    }
  });

  // Deputy Move to Exception Mutation
  const moveToExceptionMutation = useMutation({
    mutationFn: ({ id, reason }) => apiClient.patch(`/stock/goods/${id}/exception-case`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries(['goods']);
      setSelectedItem(null);
      setActionType(null);
      setActionReason('');
    }
  });

  // Create Delegation Mutation
  const createDelegationMutation = useMutation({
    mutationFn: (payload) => apiClient.post('/delegations', payload),
    onSuccess: () => {
      setDelegationActive(true);
    }
  });

  const handleApprove = (id) => {
    approveReleaseMutation.mutate(id);
  };

  const handleActionSubmit = (e) => {
    e.preventDefault();
    if (actionType === 'SEND_BACK') {
      sendBackMutation.mutate({ id: selectedItem.id, reason: actionReason });
    } else if (actionType === 'EXCEPTION') {
      moveToExceptionMutation.mutate({ id: selectedItem.id, reason: actionReason });
    }
  };

  const toggleDelegation = () => {
    if (!delegationActive) {
      createDelegationMutation.mutate({
        granteeId: 202,
        granteeName: 'Fidelis Karangwa - Deputy PRSO',
        permission: 'RELEASE_APPROVAL'
      });
    } else {
      setDelegationActive(false);
    }
  };

  // LEFT COLUMN VIEW
  const leftPaneView = (
    <div className="prso-left-workspace">
      {/* Metric KPI rows */}
      <div className="metrics-grid-row">
        <GlassMetricCard title="Release Requests" value={activeRequestsCount} icon={<Layers size={16} />} />
        <GlassMetricCard title="Returned Reviews" value={returnedReviewCount} icon={<ShieldAlert size={16} />} />
        <GlassMetricCard 
          title="Delegation Status" 
          value={delegationActive ? 'ACTIVE' : 'INACTIVE'} 
          subtitle={delegationActive ? 'Deputy Authorized' : 'Direct Supervisor Only'}
          icon={<Award size={16} />} 
        />
      </div>

      {/* Tabs selector */}
      <div className="prso-tab-navbar glass-panel">
        <button 
          className={`prso-tab-btn ${activeTab === 'RELEASES' ? 'active' : ''}`}
          onClick={() => { setActiveTab('RELEASES'); setSelectedItem(null); }}
        >
          Release Requests ({activeRequestsCount})
        </button>
        <button 
          className={`prso-tab-btn ${activeTab === 'RETURNS' ? 'active' : ''}`}
          onClick={() => { setActiveTab('RETURNS'); setSelectedItem(null); }}
        >
          Returned Goods Review ({returnedReviewCount})
        </button>
        {user?.role === 'PRSO' && (
          <button 
            className={`prso-tab-btn ${activeTab === 'DELEGATIONS' ? 'active' : ''}`}
            onClick={() => { setActiveTab('DELEGATIONS'); setSelectedItem(null); }}
          >
            PRSO Delegation Settings
          </button>
        )}
      </div>

      {/* Data grids based on active tabs */}
      {activeTab === 'RELEASES' && (
        <div className="main-stock-table-card glass-panel">
          <table className="siids-virtual-table">
            <thead>
              <tr>
                <th>PV Reference</th>
                <th>Description</th>
                <th>Proposed Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="table-loader-cell">Loading requests...</td></tr>
              ) : releaseRequests.length === 0 ? (
                <tr><td colSpan={4} className="table-empty-cell">No pending release approvals in queue.</td></tr>
              ) : (
                releaseRequests.map(item => {
                  const isLowEstimate = item.releaseDetails?.auctionEstimate < 1000000;
                  return (
                    <tr 
                      key={item.id} 
                      className={`virtual-row-item ${selectedItem?.id === item.id ? 'row-selected' : ''}`}
                      onClick={() => setSelectedItem(item)}
                    >
                      <td className="desc-cell-title">{item.pvNumber}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>{item.goodsDescription}</span>
                          {isLowEstimate && <span style={{ color: '#F5A800', fontWeight: 'bold', fontSize: '9px', display: 'flex', alignItems: 'center', gap: '2px' }}>⚠️ Low Estimate Flagged</span>}
                        </div>
                      </td>
                      <td><strong>{item.releaseDetails?.auctionEstimate?.toLocaleString()} RWF</strong></td>
                      <td><StatusBadgeSystem status={item.status} /></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'RETURNS' && (
        <div className="main-stock-table-card glass-panel">
          <table className="siids-virtual-table">
            <thead>
              <tr>
                <th>PV Reference</th>
                <th>Description</th>
                <th>Return Reason</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="table-loader-cell">Loading returned files...</td></tr>
              ) : returnedGoods.length === 0 ? (
                <tr><td colSpan={4} className="table-empty-cell">No returned items requiring review.</td></tr>
              ) : (
                returnedGoods.map(item => (
                  <tr 
                    key={item.id} 
                    className={`virtual-row-item ${selectedItem?.id === item.id ? 'row-selected' : ''}`}
                    onClick={() => setSelectedItem(item)}
                  >
                    <td className="desc-cell-title">{item.pvNumber}</td>
                    <td>{item.goodsDescription}</td>
                    <td><span className="return-reason-badge">{item.returnDetails?.reasonType?.replace(/_/g, ' ')}</span></td>
                    <td><StatusBadgeSystem status={item.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'DELEGATIONS' && (
        <div className="delegation-setting-view glass-panel">
          <h3>Release Approval Authority Delegation</h3>
          <p className="delegation-desc">
            Authorize your Deputy PRSO to sign-off and approve Release Requests from the Stock Manager. Toggling this delegates all notification streams and route endpoints automatically. You can revoke this setting at any time.
          </p>

          <div className="delegation-toggle-card glass-panel">
            <div>
              <strong>Fidelis Karangwa (Deputy PRSO)</strong>
              <p>Authorize approval status: {delegationActive ? 'Granted' : 'Revoked'}</p>
            </div>
            <button 
              className={`delegation-toggle-btn ${delegationActive ? 'active' : ''}`}
              onClick={toggleDelegation}
            >
              {delegationActive ? 'Revoke Authority' : 'Delegate Authority'}
            </button>
          </div>
        </div>
      )}

      {/* Recharts Area analytics */}
      <div className="stock-analytics-panel glass-panel">
        <h3>Release Approval Volumes (YTD Trends)</h3>
        <div className="chart-container-panel">
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#64748B" fontSize={11} />
              <YAxis stroke="#64748B" fontSize={11} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#0D47A1" fill="rgba(13, 71, 161, 0.08)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  // RIGHT COLUMN VIEW
  const rightPaneView = (
    <div className="prso-right-workspace">
      {selectedItem && (
        <div className="workspace-inspector-panel">
          <div className="inspector-panel-header">
            <h3>Supervisor review File</h3>
            <button className="panel-close-trigger" onClick={() => setSelectedItem(null)}><X size={16} /></button>
          </div>

          <div className="inspector-details-card">
            <h2>{selectedItem.goodsDescription}</h2>
            <div className="detail-meta-table">
              <div className="meta-row"><span className="meta-lbl">PV Number:</span> <strong>{selectedItem.pvNumber}</strong></div>
              <div className="meta-row"><span className="meta-lbl">Storage Location:</span> <span>{selectedItem.location}</span></div>
              <div className="meta-row"><span className="meta-lbl">Category:</span> <span>{selectedItem.goodsType}</span></div>
              <div className="meta-row"><span className="meta-lbl">Owner Name:</span> <span>{selectedItem.ownerName || 'Unknown'}</span></div>
            </div>

            {/* A. If viewing Release Approvals queue */}
            {selectedItem.status === 'RELEASE_REQUEST_PENDING' && (
              <div className="release-approval-action-block">
                {selectedItem.releaseDetails?.auctionEstimate < 1000000 && (
                  <div className="evidence-disclaimer-card glass-panel" style={{ borderLeft: '4px solid #F5A800', background: '#FFFDF5', padding: '12px', borderRadius: '6px', marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <AlertCircle size={18} style={{ color: '#F5A800' }} />
                    <div style={{ fontSize: '11px' }}>
                      <h4 style={{ margin: 0, fontWeight: 'bold', color: '#F5A800' }}>Valuation Warning Issued</h4>
                      <p style={{ margin: 0, color: '#64748b' }}>Proposed auction estimate is below 1,000,000 RWF. Supervisor audit recommended before sign-off.</p>
                    </div>
                  </div>
                )}

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

                <div className="action-buttons-group">
                  <button className="btn-action-approve" onClick={() => handleApprove(selectedItem.id)}>
                    <Check size={14} />
                    <span>Approve Release</span>
                  </button>
                  <button className="btn-action-reject" onClick={() => setSelectedItem(null)}>
                    <X size={14} />
                    <span>Reject Request</span>
                  </button>
                </div>
              </div>
            )}

            {/* B. If viewing Returned Goods queue */}
            {selectedItem.status === 'RETURNED' && !actionType && (
              <div className="return-goods-action-block">
                <div className="release-details-summary-panel glass-panel">
                  <h4>Stock Return Information</h4>
                  <div className="detail-meta-table">
                    <div className="meta-row"><span className="meta-lbl">Return Reason:</span> <strong>{selectedItem.returnDetails?.reasonType?.replace(/_/g, ' ')}</strong></div>
                    {selectedItem.returnDetails?.conflictFields && (
                      <div className="meta-row"><span className="meta-lbl">Mismatch Fields:</span> <span>{selectedItem.returnDetails.conflictFields.join(', ')}</span></div>
                    )}
                    <div className="meta-row"><span className="meta-lbl">Correction Notes:</span> <span className="notes-block-preview">{selectedItem.returnDetails?.description}</span></div>
                  </div>
                </div>

                <div className="action-buttons-group flex-column-layout">
                  <button className="btn-send-back-officer" onClick={() => setActionType('SEND_BACK')}>
                    Send Back to Surveillance Officer for correction
                  </button>
                  <button className="btn-move-exception" onClick={() => setActionType('EXCEPTION')}>
                    Move to Exception Case (Appeals/Reduced Fines)
                  </button>
                </div>
              </div>
            )}

            {/* Decision Reason Action Form (Slide In overlay) */}
            {actionType && (
              <form onSubmit={handleActionSubmit} className="action-reason-overlay-form glass-panel">
                <div className="form-reason-header">
                  <h4>{actionType === 'SEND_BACK' ? 'Correction Mandate' : 'Exception Case Setup'}</h4>
                  <button type="button" onClick={() => setActionType(null)} className="panel-close-trigger">×</button>
                </div>
                
                <div className="form-input-group">
                  <label>Mandatory Audit Reason / Notes</label>
                  <textarea
                    required
                    placeholder="Enter justification details for this supervisor action."
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                  />
                </div>

                <div className="action-form-buttons">
                  <button type="submit" className="btn-form-confirm-action">
                    <Send size={12} />
                    <span>Submit Decision</span>
                  </button>
                  <button type="button" onClick={() => setActionType(null)} className="btn-form-cancel">Cancel</button>
                </div>
              </form>
            )}

            {/* Logs display */}
            <div className="inspector-history-section">
              <h3>Supervisor Trace logs</h3>
              <TimelineActivityFeed 
                activities={[
                  { actorName: 'Olivier Nsengimana - Surveillance Officer', message: 'Seizure note entry generated.', timestamp: selectedItem.seizedAt, correlationId: 'cl-r8a0e1b' },
                  selectedItem.status === 'RETURNED' && { actorName: 'Claver Gatete - Stock Manager', message: 'Mismatch found. Goods returned to supervisor review.', timestamp: new Date().toISOString(), correlationId: 'cl-c9028e1' }
                ].filter(Boolean)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedItem && (
        <div className="inspector-empty-state-card">
          <ShieldAlert size={48} className="empty-state-icon" />
          <h3>No Action Item Selected</h3>
          <p>Select a pending release request or returned stock file from the active queues to inspect details and authorize actions.</p>
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

export default PrsoDashboard;
