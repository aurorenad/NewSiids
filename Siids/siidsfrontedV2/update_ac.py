import sys

def main():
    try:
        with open('scratch_ac.txt', 'r', encoding='utf-16') as f:
            lines = f.readlines()
        
        start_idx = -1
        end_idx = -1
        for i, line in enumerate(lines):
            if line.strip().startswith('const rightWorkspaceView = ('):
                start_idx = i
            if line.strip().startswith('const reportsMetricsView = ('):
                end_idx = i
                break
                
        if start_idx == -1 or end_idx == -1:
            print('Could not find bounds')
            return

        new_right_pane = """  const rightWorkspaceView = (
    <div className="ac-right-workspace">
      {selectedItem && (
        <div className="workspace-inspector-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="inspector-panel-header">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                {activeTab === 'UNROUTED_CASES' ? `CASE-${selectedItem.id}` : `REPORT-${selectedItem.id}`}
              </span>
              <h3 style={{ margin: '4px 0 0 0', fontSize: '15px' }}>{selectedItem.subject || selectedItem.title}</h3>
            </div>
            <button className="panel-close-trigger" onClick={() => setSelectedItem(null)}><X size={16} /></button>
          </div>

          <div className="inspector-tabs-navbar">
            <button className={`inspector-tab-btn ${inspectorTab === 'DOCUMENT' ? 'active' : ''}`} onClick={() => setInspectorTab('DOCUMENT')}>
              <FileText size={14} />
              <span>Findings Document</span>
            </button>
            <button className={`inspector-tab-btn ${inspectorTab === 'EVIDENCE' ? 'active' : ''}`} onClick={() => setInspectorTab('EVIDENCE')}>
              <UploadCloud size={14} />
              <span>Evidence Attachments</span>
            </button>
            <button className={`inspector-tab-btn ${inspectorTab === 'TIMELINE' ? 'active' : ''}`} onClick={() => setInspectorTab('TIMELINE')}>
              <Clock size={14} />
              <span>Audit Timeline</span>
            </button>
          </div>

          <div className="inspector-tab-content custom-scrollbar" style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            {inspectorTab === 'DOCUMENT' && (
              <>
                {activeTab !== 'PENDING_REPORTS' ? (
                  <div className="inspector-details-card">
                    <h2>{selectedItem.id}: {selectedItem.subject}</h2>
                    <div className="detail-meta-table">
                      <div className="meta-row"><span className="meta-lbl">Created At:</span> <span>{new Date(selectedItem.createdAt).toLocaleString()}</span></div>
                      <div className="meta-row"><span className="meta-lbl">Taxpayer:</span> <span>{selectedItem.taxpayerName || '-'} (TIN: {selectedItem.tin || '-'})</span></div>
                      <div className="meta-row"><span className="meta-lbl">Priority:</span> <span style={{ fontWeight: 'bold', color: selectedItem.priority === 'HIGH' ? '#D32F2F' : '#F5A800' }}>{selectedItem.priority || 'NORMAL'}</span></div>
                      <div className="meta-row"><span className="meta-lbl">Current Status:</span> <StatusBadgeSystem status={selectedItem.status} labelOverride={getDescriptiveState(selectedItem.status, selectedItem.routedTo)} /></div>
                    </div>

                    <div className="case-description-box glass-panel">
                      <h4>Intake Overview Notes</h4>
                      <p>{selectedItem.description}</p>
                    </div>

                    {activeTab === 'UNROUTED_CASES' && (
                      !showRouteModal ? (
                        <button className="btn-action-route-trigger" onClick={() => setShowRouteModal(true)}>
                          <Compass size={14} />
                          <span>Route Case to Investigation</span>
                        </button>
                      ) : (
                        <form onSubmit={handleRouteSubmit} className="route-selection-panel glass-panel">
                          <h4>Select Routing Destination</h4>
                          <div className="form-input-group">
                            <label>Target Department</label>
                            <select value={routeForm.routedTo} onChange={(e) => setRouteForm({ ...routeForm, routedTo: e.target.value })}>
                              <option value="DIRECTOR_OF_INVESTIGATION">Director of Investigation (T2)</option>
                              <option value="PROSECUTION">Prosecution Division</option>
                              <option value="ENFORCEMENT">Enforcement Division</option>
                              <option value="COLLECTION">Collection Division</option>
                              <option value="OTHER">Other Department</option>
                            </select>
                          </div>
                          {routeForm.routedTo === 'OTHER' && (
                            <div className="form-input-group">
                              <label>Department Name</label>
                              <input type="text" required placeholder="Enter department name" value={routeForm.departmentName} onChange={(e) => setRouteForm({ ...routeForm, departmentName: e.target.value })} />
                            </div>
                          )}
                          <div className="action-form-buttons">
                            <button type="submit" className="btn-form-confirm">Confirm Dispatch</button>
                            <button type="button" className="btn-form-cancel" onClick={() => setShowRouteModal(false)}>Cancel</button>
                          </div>
                        </form>
                      )
                    )}
                  </div>
                ) : (
                  <div className="inspector-details-card" style={{ padding: '0', background: 'transparent', boxShadow: 'none' }}>
                    <div className="pdf-actions-bar" style={{ marginBottom: '10px' }}>
                      <button className="btn-action-download-pdf" onClick={handlePdfExport}>
                        <Download size={14} />
                        <span>Print / Download PDF</span>
                      </button>
                    </div>
                    
                    <div className="intelligence-pdf-preview" style={{ padding: '30px', background: 'white', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
                      <div className="pdf-letterhead">
                        <img src="/Images/HomeLogo.jpeg" alt="RRA Logo" className="pdf-crest-img" style={{ height: '35px', marginBottom: '8px' }} />
                        <h4>RWANDA REVENUE AUTHORITY</h4>
                        <h5>STRATEGIC INTELLIGENCE &amp; INVESTIGATION DIVISION</h5>
                      </div>

                      <div className="pdf-report-metadata">
                        <div className="meta-row"><strong>Case Ref:</strong> <span>{selectedItem.caseNum || selectedItem.id}</span></div>
                        <div className="meta-row"><strong>Date:</strong> <span>{new Date(selectedItem.createdAt).toLocaleDateString()}</span></div>
                        <div className="meta-row"><strong>Subject:</strong> <span>{selectedItem.subject || selectedItem.title}</span></div>
                      </div>

                      <div className="pdf-report-body">
                        <h5>I. Executive Summary</h5>
                        <p>{selectedItem.description || selectedItem.body || 'Report details attached.'}</p>
                        
                        {selectedItem.sections && selectedItem.sections.map((sec, i) => (
                          <div key={i}>
                            <h5>{sec.title}</h5>
                            <p>{sec.content}</p>
                          </div>
                        ))}

                        <div className="pdf-signature-blocks">
                          <div className="sig-block">
                            <span className="role">Intelligence Officer</span>
                            <span className="sig-line">
                              <strong className="sig-signed-name">{selectedItem.createdByName} ✓</strong>
                            </span>
                          </div>
                          <div className="sig-block">
                            <span className="role">Director of Intelligence</span>
                            <span className="sig-line">
                              {selectedItem.signatures?.some(s => s.role === 'DIRECTOR_OF_INTELLIGENCE') ? (
                                <strong className="sig-signed-name">Director Christian ✓</strong>
                              ) : (
                                <span className="sig-pending-label">Pending Approval</span>
                              )}
                            </span>
                          </div>
                          <div className="sig-block">
                            <span className="role">Assistant Commissioner</span>
                            <span className="sig-line">
                              {selectedItem.signatures?.some(s => s.role === 'AC') ? (
                                <strong className="sig-signed-name">AC Ronald Niwenshuti ✓</strong>
                              ) : (
                                <span className="sig-pending-label">Awaiting AC Stamp</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons Group */}
                    <div className="action-buttons-group">
                      <button 
                        type="button"
                        className="btn-action-sign-report" 
                        onClick={() => handleSignReport(selectedItem.id)}
                        disabled={!selectedIsPendingACAction || selectedItem.signatures?.some(s => s.role === 'AC')}
                        title={!selectedIsPendingACAction ? 'Report cannot be approved in its current state.' : 'Sign and approve this report'}
                        style={{ opacity: !selectedIsPendingACAction ? 0.45 : 1, cursor: !selectedIsPendingACAction ? 'not-allowed' : 'pointer' }}
                      >
                        <Check size={14} />
                        <span>Sign &amp; Approve</span>
                      </button>

                      <button 
                        type="button"
                        className="btn-action-reject-trigger"
                        disabled={!selectedIsPendingACAction}
                        title={!selectedIsPendingACAction ? 'Report cannot be rejected in its current state.' : 'Reject this report'}
                        style={{ opacity: !selectedIsPendingACAction ? 0.45 : 1, cursor: !selectedIsPendingACAction ? 'not-allowed' : 'pointer' }}
                        onClick={() => { setRejectionReason(''); setRejectDialogOpen(true); }}
                      >
                        <X size={14} />
                        <span>Reject</span>
                      </button>

                      <button 
                        type="button"
                        className="btn-action-return-trigger"
                        disabled={!selectedIsPendingACAction}
                        title={!selectedIsPendingACAction ? 'Report cannot be returned in its current state.' : 'Return report to Director for corrections'}
                        style={{ opacity: !selectedIsPendingACAction ? 0.45 : 1, cursor: !selectedIsPendingACAction ? 'not-allowed' : 'pointer' }}
                        onClick={() => { setReturnReasonText(''); setReturnDialogOpen(true); }}
                      >
                        <AlertCircle size={14} />
                        <span>Return for Correction</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {inspectorTab === 'EVIDENCE' && (
              <div className="tab-pane-evidence">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ margin: 0, color: '#1e293b', fontSize: '14px' }}>Admissible Evidence Attachments</h4>
                </div>
                
                {(!selectedItem.attachments || selectedItem.attachments.length === 0) ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    No evidence files linked to this case document.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedItem.attachments.map((file, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc', fontSize: '12px', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <FileText size={16} style={{ color: 'var(--primary-brand)' }} />
                            <span style={{ fontWeight: 600, color: '#334155' }}>{file.name}</span>
                            <span style={{ color: '#94a3b8' }}>({file.size})</span>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => handleDownloadAttachment(file)}
                            style={{ color: '#003DA5', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'underline', fontWeight: '500' }}
                          >
                            <Download size={14} />
                            Download
                          </button>
                        </div>
                        {file.description && (
                          <div style={{ color: '#64748b', fontStyle: 'italic', paddingLeft: '24px' }}>
                            {file.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {inspectorTab === 'TIMELINE' && (
              <div className="tab-pane-timeline">
                <h4 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '14px' }}>Case Audit Timeline</h4>
                <div style={{ borderLeft: '2px solid #e2e8f0', paddingLeft: '16px', marginLeft: '8px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-21px', top: '2px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#003DA5' }}></div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>{new Date(selectedItem.createdAt).toLocaleString()}</div>
                    <div style={{ fontSize: '13px', color: '#0f172a', marginTop: '2px' }}>Case Initialized</div>
                    <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>Created by {selectedItem.createdByName || 'System'}</div>
                  </div>

                  {selectedItem.routedTo && selectedItem.routedTo !== 'PENDING' && (
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '-21px', top: '2px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#003DA5' }}></div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>-</div>
                      <div style={{ fontSize: '13px', color: '#0f172a', marginTop: '2px' }}>Routed to Investigation Division</div>
                      <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>Action by AC Ronald Niwenshuti</div>
                    </div>
                  )}

                  {selectedItem.signatures && selectedItem.signatures.map((sig, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '-21px', top: '2px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#059669' }}></div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>{sig.signedAt ? new Date(sig.signedAt).toLocaleString() : '-'}</div>
                      <div style={{ fontSize: '13px', color: '#0f172a', marginTop: '2px' }}>Document Signed & Approved</div>
                      <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>By {sig.signedBy} ({sig.role})</div>
                    </div>
                  ))}

                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-21px', top: '2px', width: '10px', height: '10px', borderRadius: '50%', border: '2px solid #cbd5e1', backgroundColor: 'white' }}></div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>Current Status</div>
                    <div style={{ fontSize: '13px', color: '#0f172a', marginTop: '2px', fontWeight: 600 }}><StatusBadgeSystem status={selectedItem.status} /></div>
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!selectedItem && (
        <div className="inspector-empty-state-card">
          <Activity size={48} className="empty-state-icon" />
          <h3>AC Executive Console</h3>
          <p>Select a case to direct workflow to Investigation, or review and co-sign reports.</p>
        </div>
      )}
    </div>
  );
"""

        lines = lines[:start_idx] + [new_right_pane] + lines[end_idx:]
        
        # Inject inspectorTab into state declarations
        for i, line in enumerate(lines):
            if 'const [activeTab, setActiveTab]' in line:
                lines.insert(i + 2, '  const [inspectorTab, setInspectorTab] = useState(\'DOCUMENT\');\n')
                break

        # Also add missing imports UploadCloud, Clock to lucide-react line if needed
        import_line_idx = -1
        for i, line in enumerate(lines):
            if 'FileSpreadsheet' in line and 'lucide-react' not in line:
                import_line_idx = i
                break
        
        if import_line_idx != -1:
            if 'UploadCloud' not in lines[import_line_idx]:
                lines[import_line_idx] = lines[import_line_idx].replace('FileSpreadsheet,', 'FileSpreadsheet, UploadCloud, Clock,')

        with open('src/features/intelligence/AcDashboard.jsx', 'w', encoding='utf-8') as f:
            f.writelines(lines)
            
        print('Successfully replaced rightWorkspaceView')

    except Exception as e:
        print('Error:', e)

main()
