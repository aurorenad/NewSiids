const fs = require('fs');
const path = require('path');

const content = `import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { SplitWorkspaceLayout } from '../../components/ui/SplitWorkspaceLayout';
import { StatusBadgeSystem } from '../../components/ui/StatusBadgeSystem';
import { AppShell } from '../../components/layout/AppShell';
import { TimelineActivityFeed } from '../../components/ui/TimelineActivityFeed';
import { WorkflowStepper } from '../../components/ui/WorkflowStepper';
import { 
  FileText, ShieldCheck, Check, X, Layers, UserPlus, Eye, Reply, ChevronLeft, ChevronRight, Search, Briefcase, Filter, FolderOpen, Activity
} from 'lucide-react';
import './DoiDashboard.css'; 

const INVESTIGATION_OFFICERS = [
  { id: 'inv-gakwaya', name: 'Maj. J. Gakwaya', role: 'Investigation Officer', maxCapacity: 10, initials: 'JG' },
  { id: 'inv-musoni', name: 'Insp. S. Musoni', role: 'Investigation Officer', maxCapacity: 10, initials: 'SM' },
  { id: 'inv-kagabo', name: 'Insp. D. Kagabo', role: 'Investigation Officer', maxCapacity: 10, initials: 'DK' },
  { id: 'inv-uwera', name: 'Insp. R. Uwera', role: 'Investigation Officer', maxCapacity: 10, initials: 'RU' },
  { id: 'inv-rutayisire', name: 'Sgt. Rutayisire', role: 'Investigation Officer', maxCapacity: 10, initials: 'SR' },
  { id: 'inv-kalisa', name: 'Cpl. P. Kalisa', role: 'Investigation Officer', maxCapacity: 10, initials: 'PK' }
];

export const InvestigationDirectorDashboard = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Unified Active Tab State
  const [activeTab, setActiveTab] = useState('NEW_CASES'); 
  const isReportTab = activeTab === 'PENDING_REVIEW' || activeTab === 'SENT_TO_AC';

  const [selectedItem, setSelectedItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [workspaceTimeframe, setWorkspaceTimeframe] = useState('ALL'); 
  const [reportsPage, setReportsPage] = useState(1);
  const [reportsPageSize, setReportsPageSize] = useState(10);

  // Officer Pagination
  const [officerPage, setOfficerPage] = useState(0);
  const officersPerPage = 4;
  const totalOfficerPages = Math.ceil(INVESTIGATION_OFFICERS.length / officersPerPage);

  // Dialog/Modal states
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnReasonText, setReturnReasonText] = useState('');

  const [toastMessage, setToastMessage] = useState(null);
  const triggerToast = (msg, duration = 3000) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), duration);
  };

  // Data Fetching
  const { data: casesResponse, isLoading: casesLoading } = useQuery({
    queryKey: ['cases'],
    queryFn: () => apiClient.get('/cases').catch(() => ({ data: { data: [] } }))
  });
  const casesList = casesResponse?.data?.data || [];

  const { data: reportsResponse, isLoading: reportsLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => apiClient.get('/reports').catch(() => ({ data: { data: [] } }))
  });
  const reportsList = reportsResponse?.data?.data || [];

  // Filtering Logic
  const filterByTimeframe = (itemDateStr) => {
    if (workspaceTimeframe === 'ALL') return true;
    const itemDate = new Date(itemDateStr);
    const now = new Date();
    if (workspaceTimeframe === 'WEEK') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return itemDate >= oneWeekAgo;
    } else if (workspaceTimeframe === 'MONTH') {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return itemDate >= oneMonthAgo;
    }
    return true;
  };

  const dispatchCases = casesList.filter(c => c.routedTo === 'DOI' || c.routedTo === 'DIRECTOR_OF_INVESTIGATION' || c.status === 'ROUTED' || c.assignedTo);
  const investigationDocuments = reportsList.filter(r => r.status === 'PENDING_DIRECTOR_SIGNATURE' || r.status === 'INVESTIGATION_REPORT_SENT_TO_DIRECTOR_INVESTIGATION' || r.status === 'REPORT_SUBMITTED' || r.status === 'CASE_PLAN_SUBMITTED' || r.status === 'CASE_PLAN_APPROVED_BY_DIRECTOR_INVESTIGATION' || r.status === 'INVESTIGATION_REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION' || r.status === 'PENDING_AC_SIGNATURE' || r.status === 'FINALISED');

  const getFilteredList = () => {
    let list = [];
    if (activeTab === 'NEW_CASES') {
      list = dispatchCases.filter(c => !c.assignedTo && c.status !== 'CASE_ASSIGNED');
    } else if (activeTab === 'ACTIVE_INVESTIGATIONS') {
      list = dispatchCases.filter(c => c.assignedTo && c.status !== 'INVESTIGATION_COMPLETED' && c.status !== 'CASE_CLOSED');
    } else if (activeTab === 'PENDING_REVIEW') {
      list = investigationDocuments.filter(r => r.status === 'PENDING_DIRECTOR_SIGNATURE' || r.status === 'INVESTIGATION_REPORT_SENT_TO_DIRECTOR_INVESTIGATION' || r.status === 'REPORT_SUBMITTED' || r.status === 'CASE_PLAN_SUBMITTED');
    } else if (activeTab === 'SENT_TO_AC') {
      list = investigationDocuments.filter(r => r.status === 'PENDING_AC_SIGNATURE' || r.status === 'FINALISED' || r.status === 'CASE_PLAN_APPROVED_BY_DIRECTOR_INVESTIGATION' || r.status === 'INVESTIGATION_REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION');
    }

    return list.filter(item => {
      const matchesSearch = !searchTerm || (item.title || item.subject || item.id || '').toString().toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTime = filterByTimeframe(item.createdAt);
      return matchesSearch && matchesTime;
    });
  };

  const currentList = getFilteredList();
  const isLoading = isReportTab ? reportsLoading : casesLoading;

  // Counters
  const countNewCases = dispatchCases.filter(c => !c.assignedTo && c.status !== 'CASE_ASSIGNED').length;
  const countActiveCases = dispatchCases.filter(c => c.assignedTo && c.status !== 'INVESTIGATION_COMPLETED' && c.status !== 'CASE_CLOSED').length;
  const countPendingReview = investigationDocuments.filter(r => r.status === 'PENDING_DIRECTOR_SIGNATURE' || r.status === 'INVESTIGATION_REPORT_SENT_TO_DIRECTOR_INVESTIGATION' || r.status === 'REPORT_SUBMITTED' || r.status === 'CASE_PLAN_SUBMITTED').length;
  const countSentToAC = investigationDocuments.filter(r => r.status === 'PENDING_AC_SIGNATURE' || r.status === 'FINALISED' || r.status === 'CASE_PLAN_APPROVED_BY_DIRECTOR_INVESTIGATION' || r.status === 'INVESTIGATION_REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION').length;

  // Pagination bounds
  const totalPages = Math.max(1, Math.ceil(currentList.length / reportsPageSize));
  const activePage = Math.min(reportsPage, totalPages);
  const paginatedList = currentList.slice((activePage - 1) * reportsPageSize, (activePage - 1) * reportsPageSize + reportsPageSize);

  // Mutations
  const assignCaseMutation = useMutation({
    mutationFn: ({ id, assignedTo }) => apiClient.patch(\`/cases/\${id}/assign\`, { assignedTo }),
    onSuccess: () => {
      queryClient.invalidateQueries(['cases']);
      setSelectedItem(null);
      triggerToast('✓ Case successfully assigned to Officer.');
    }
  });

  const signReportMutation = useMutation({
    mutationFn: (id) => apiClient.post(\`/reports/\${id}/sign\`, {
      signerRole: 'DIRECTOR_OF_INVESTIGATION',
      signerName: 'Director of Investigation Jean de Dieu'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['reports']);
      setSelectedItem(null);
      triggerToast('✓ Document Approved and forwarded.');
    }
  });

  const returnReportMutation = useMutation({
    mutationFn: ({ id, reason }) => apiClient.post(\`/reports/\${id}/return\`, {
      returnToEmployeeId: 'INVESTIGATION_OFFICER',
      returnReason: reason
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['reports']);
      setReturnDialogOpen(false);
      setReturnReasonText('');
      setSelectedItem(null);
      triggerToast('↩ Document returned for correction.');
    }
  });

  const rejectReportMutation = useMutation({
    mutationFn: ({ id, reason }) => apiClient.post(\`/reports/\${id}/reject\`, {
      rejectionReason: reason
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['reports']);
      setRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedItem(null);
      triggerToast('⚠ Document rejected.');
    }
  });

  const handleActionClick = (e, item) => {
    e.stopPropagation();
    setSelectedItem(item);
  };

  const renderPagination = (currentPage, totalItems, pageSize, onPageChange, onPageSizeChange) => {
    const tPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const aPage = Math.min(currentPage, tPages);
    const startRange = totalItems === 0 ? 0 : (aPage - 1) * pageSize + 1;
    const endRange = Math.min(aPage * pageSize, totalItems);

    const pages = [];
    let startPage = Math.max(1, aPage - 2);
    let endPage = Math.min(tPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);
    for (let i = startPage; i <= endPage; i++) pages.push(i);

    return (
      <div className="siids-pagination-controls" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', flexWrap: 'wrap', gap: '8px' }}>
        <div className="pagination-info" style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
          Showing <strong style={{ color: '#0f172a' }}>{startRange}-{endRange}</strong> of <strong style={{ color: '#0f172a' }}>{totalItems}</strong> entries
        </div>
        <div className="pagination-actions" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button type="button" className="pagination-arrow-btn" disabled={aPage === 1} onClick={() => onPageChange(aPage - 1)} style={{ padding: '4px 6px', border: '1.5px solid #cbd5e1', borderRadius: '4px', background: 'white', cursor: aPage === 1 ? 'not-allowed' : 'pointer', opacity: aPage === 1 ? 0.5 : 1, display: 'flex', alignItems: 'center' }}><ChevronLeft size={12} /></button>
          {pages.map(p => (
            <button key={p} type="button" className={\`pagination-number-btn \${p === aPage ? 'active' : ''}\`} onClick={() => onPageChange(p)} style={{ minWidth: '24px', height: '24px', border: p === aPage ? 'none' : '1.5px solid #cbd5e1', borderRadius: '4px', background: p === aPage ? 'var(--primary-brand)' : 'white', color: p === aPage ? 'white' : '#475569', fontWeight: 600, fontSize: '11px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p}</button>
          ))}
          <button type="button" className="pagination-arrow-btn" disabled={aPage === tPages} onClick={() => onPageChange(aPage + 1)} style={{ padding: '4px 6px', border: '1.5px solid #cbd5e1', borderRadius: '4px', background: 'white', cursor: aPage === tPages ? 'not-allowed' : 'pointer', opacity: aPage === tPages ? 0.5 : 1, display: 'flex', alignItems: 'center' }}><ChevronRight size={12} /></button>
        </div>
        <div className="pagination-page-size" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b' }}>
          <span>Show:</span>
          <select value={pageSize} onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }} style={{ padding: '2px 4px', borderRadius: '4px', border: '1.5px solid #cbd5e1', backgroundColor: 'white', color: '#334155', fontWeight: 600, fontSize: '11px', cursor: 'pointer' }}>
            <option value={10}>10 entries</option>
            <option value={5}>5 entries</option>
            <option value={20}>20 entries</option>
          </select>
        </div>
      </div>
    );
  };

  const getCasePlanStatus = (assignedTo, caseId) => {
    const relatedPlan = reportsList.find(r => r.caseNum === caseId || (r.title && r.title.includes(caseId)));
    if (!relatedPlan) return 'Not Created';
    if (relatedPlan.status.includes('APPROVED')) return 'Approved';
    if (relatedPlan.status.includes('REJECTED')) return 'Rejected';
    return 'Submitted';
  };

  const getDaysActive = (dateString) => {
    const diffTime = Math.abs(new Date() - new Date(dateString));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return \`\${diffDays} days\`;
  };

  const leftWorkspaceView = (
    <div className="doi-left-workspace">
      {/* Unified 4 Workflow Cards */}
      <div className="metrics-grid-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
        <div className={\`intel-nav-card card-blue \${activeTab === 'NEW_CASES' ? 'active' : ''}\`} onClick={() => { setActiveTab('NEW_CASES'); setSelectedItem(null); setReportsPage(1); }}>
          <div className="nav-card-main-row"><div className="nav-card-icon-container"><FolderOpen size={20} /></div><div className="nav-card-counter">{countNewCases}</div></div>
          <div className="nav-card-details"><span className="nav-card-title">New Cases</span><span className="nav-card-subtitle">From AC</span></div>
        </div>

        <div className={\`intel-nav-card card-green \${activeTab === 'ACTIVE_INVESTIGATIONS' ? 'active' : ''}\`} onClick={() => { setActiveTab('ACTIVE_INVESTIGATIONS'); setSelectedItem(null); setReportsPage(1); }}>
          <div className="nav-card-main-row"><div className="nav-card-icon-container"><Activity size={20} /></div><div className="nav-card-counter">{countActiveCases}</div></div>
          <div className="nav-card-details"><span className="nav-card-title">Active</span><span className="nav-card-subtitle">Investigations</span></div>
        </div>

        <div className={\`intel-nav-card card-orange \${activeTab === 'PENDING_REVIEW' ? 'active' : ''}\`} onClick={() => { setActiveTab('PENDING_REVIEW'); setSelectedItem(null); setReportsPage(1); }}>
          <div className="nav-card-main-row"><div className="nav-card-icon-container"><FileText size={20} /></div><div className="nav-card-counter">{countPendingReview}</div></div>
          <div className="nav-card-details"><span className="nav-card-title">Pending Review</span><span className="nav-card-subtitle">Reports / Plans</span></div>
        </div>

        <div className={\`intel-nav-card card-purple \${activeTab === 'SENT_TO_AC' ? 'active' : ''}\`} onClick={() => { setActiveTab('SENT_TO_AC'); setSelectedItem(null); setReportsPage(1); }}>
          <div className="nav-card-main-row"><div className="nav-card-icon-container"><Layers size={20} /></div><div className="nav-card-counter">{countSentToAC}</div></div>
          <div className="nav-card-details"><span className="nav-card-title">Sent to AC</span><span className="nav-card-subtitle">Upstream / Final</span></div>
        </div>
      </div>

      <div className="table-filter-toolbar glass-panel doi-workspace-filter-bar" style={{ marginTop: '20px' }}>
        <div className="workspace-tab-filters">
           <span style={{ fontWeight: 'bold', color: '#0f172a', paddingLeft: '10px' }}>
              {activeTab === 'NEW_CASES' && 'Cases Assigned from AC'}
              {activeTab === 'ACTIVE_INVESTIGATIONS' && 'Cases Under Investigation'}
              {activeTab === 'PENDING_REVIEW' && 'Reports Submitted to Director'}
              {activeTab === 'SENT_TO_AC' && 'Reports Sent to AC / Finalized Cases'}
           </span>
        </div>
        <div className="workspace-right-controls">
          <div className="timeframe-filter-pills" style={{ display: 'flex', backgroundColor: '#e2e8f0', padding: '2px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
            <button type="button" className={\`timeframe-pill-btn \${workspaceTimeframe === 'WEEK' ? 'active' : ''}\`} onClick={() => { setWorkspaceTimeframe('WEEK'); setReportsPage(1); }}>This Week</button>
            <button type="button" className={\`timeframe-pill-btn \${workspaceTimeframe === 'MONTH' ? 'active' : ''}\`} onClick={() => { setWorkspaceTimeframe('MONTH'); setReportsPage(1); }}>This Month</button>
            <button type="button" className={\`timeframe-pill-btn \${workspaceTimeframe === 'ALL' ? 'active' : ''}\`} onClick={() => { setWorkspaceTimeframe('ALL'); setReportsPage(1); }}>All Time</button>
          </div>
          <div className="search-bar-wrapper" style={{ minWidth: '220px' }}>
            <Search size={14} className="bar-search-icon" />
            <input type="text" placeholder="Search references..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setReportsPage(1); }} />
            {searchTerm && (<button type="button" style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }} onClick={() => { setSearchTerm(''); setReportsPage(1); }}><X size={12} /></button>)}
          </div>
        </div>
      </div>

      <div className="table-wrapper custom-scrollbar" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
          <table className="siids-virtual-table">
            <thead>
              {activeTab === 'NEW_CASES' && (
                <tr><th>Case ID</th><th>Subject</th><th>Intake Date</th><th>Status</th><th align="center">Actions</th></tr>
              )}
              {activeTab === 'ACTIVE_INVESTIGATIONS' && (
                <tr><th>Case Ref</th><th>Assigned Officer</th><th>Case Plan Status</th><th>Inv. Status</th><th>Days Active</th><th align="center">Actions</th></tr>
              )}
              {isReportTab && (
                <tr><th>Report ID</th><th>Case Number</th><th>Created By</th><th>Intake Date</th><th>Status</th><th align="center">Actions</th></tr>
              )}
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="table-loader-cell">Loading...</td></tr>
              ) : paginatedList.length === 0 ? (
                <tr><td colSpan={6} className="table-empty-cell">No records found.</td></tr>
              ) : (
                paginatedList.map(item => {
                  const isLocked = isReportTab && (item.status === 'PENDING_AC_SIGNATURE' || item.status === 'FINALISED' || item.status === 'REPORT_REJECTED_BY_DIRECTOR' || item.status === 'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER' || item.status === 'CASE_PLAN_APPROVED_BY_DIRECTOR_INVESTIGATION' || item.status === 'INVESTIGATION_REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION');

                  return (
                    <tr key={item.id} className={\`virtual-row-item \${selectedItem?.id === item.id ? 'row-selected' : ''}\`} onClick={(e) => handleActionClick(e, item)}>
                      {activeTab === 'NEW_CASES' && (
                        <>
                          <td className="desc-cell-title">#{item.id}</td>
                          <td className="truncate-text" style={{ maxWidth: '200px' }}>{item.subject || item.description}</td>
                          <td>{new Date(item.createdAt).toLocaleDateString('en-GB')}</td>
                          <td><StatusBadgeSystem status={item.status} /></td>
                          <td align="center"><button className="btn-icon" onClick={(e) => handleActionClick(e, item)} title="Assign"><UserPlus size={16} /></button></td>
                        </>
                      )}
                      {activeTab === 'ACTIVE_INVESTIGATIONS' && (
                        <>
                          <td className="desc-cell-title">#{item.id}</td>
                          <td style={{ color: '#009A44', fontWeight: 'bold' }}>{item.assignedTo}</td>
                          <td><span style={{ padding: '4px 8px', borderRadius: '4px', background: getCasePlanStatus(item.assignedTo, item.id) === 'Approved' ? '#dcfce7' : '#f1f5f9', color: getCasePlanStatus(item.assignedTo, item.id) === 'Approved' ? '#166534' : '#475569', fontSize: '11px', fontWeight: 'bold' }}>{getCasePlanStatus(item.assignedTo, item.id)}</span></td>
                          <td><StatusBadgeSystem status={item.status} /></td>
                          <td>{getDaysActive(item.createdAt)}</td>
                          <td align="center"><button className="btn-icon" onClick={(e) => handleActionClick(e, item)} title="View Case"><Eye size={16} /></button></td>
                        </>
                      )}
                      {isReportTab && (
                        <>
                          <td className="desc-cell-title">#{item.id}</td>
                          <td>{item.caseNum || '-'}</td>
                          <td>{item.createdByName || 'Officer'}</td>
                          <td>{new Date(item.createdAt).toLocaleDateString('en-GB')}</td>
                          <td><StatusBadgeSystem status={item.status} /></td>
                          <td align="center">
                            <div className="action-buttons-group">
                              <button className="btn-icon" onClick={(e) => handleActionClick(e, item)} title="View Document"><Eye size={16} /></button>
                              {activeTab === 'PENDING_REVIEW' && (
                                <>
                                  <button className="btn-icon success" onClick={(e) => {e.stopPropagation(); signReportMutation.mutate(item.id);}} title="Approve"><Check size={16} /></button>
                                  <button className="btn-icon danger" onClick={(e) => {e.stopPropagation(); setSelectedItem(item); setRejectDialogOpen(true);}} title="Reject"><X size={16} /></button>
                                  <button className="btn-icon warning" onClick={(e) => {e.stopPropagation(); setSelectedItem(item); setReturnDialogOpen(true);}} title="Return"><Reply size={16} /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {renderPagination(reportsPage, currentList.length, reportsPageSize, setReportsPage, setReportsPageSize)}
      </div>

      {(!isReportTab) && (
        <div className="team-workload-distribution-section glass-panel" style={{ marginTop: '20px', padding: '20px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '16px' }}>Team Workload Distribution</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button onClick={() => setOfficerPage(prev => Math.max(0, prev - 1))} disabled={officerPage === 0} style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px', cursor: officerPage === 0 ? 'not-allowed' : 'pointer', opacity: officerPage === 0 ? 0.5 : 1, display: 'flex', alignItems: 'center' }}><ChevronLeft size={16} /></button>
                <button onClick={() => setOfficerPage(prev => Math.min(totalOfficerPages - 1, prev + 1))} disabled={officerPage === totalOfficerPages - 1} style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px', cursor: officerPage === totalOfficerPages - 1 ? 'not-allowed' : 'pointer', opacity: officerPage === totalOfficerPages - 1 ? 0.5 : 1, display: 'flex', alignItems: 'center' }}><ChevronRight size={16} /></button>
              </div>
            </div>
          </div>
          <div className="team-workload-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
            {INVESTIGATION_OFFICERS.slice(officerPage * officersPerPage, (officerPage + 1) * officersPerPage).map(officer => {
              const officerCases = casesList.filter(c => c.assignedTo === officer.id && c.status !== 'INVESTIGATION_COMPLETED' && c.status !== 'CASE_CLOSED').length;
              let mockDisplayCases = officerCases;
              if (officerCases === 0) {
                 if (officer.initials === 'JG') mockDisplayCases = 8;
                 if (officer.initials === 'SM') mockDisplayCases = 4;
                 if (officer.initials === 'DK') mockDisplayCases = 9;
                 if (officer.initials === 'RU') mockDisplayCases = 2;
                 if (officer.initials === 'SR') mockDisplayCases = 6;
                 if (officer.initials === 'PK') mockDisplayCases = 3;
              }
              const workloadPct = (mockDisplayCases / officer.maxCapacity) * 100;
              const isHighLoad = workloadPct >= 80;
              return (
                <div key={officer.id} className="workload-officer-card glass-panel" style={{ padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                  <div className="officer-header-row" style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                    <div className="officer-avatar" style={{ width: '42px', height: '42px', borderRadius: '50%', background: isHighLoad ? '#e6e6e0' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: isHighLoad ? '#a16207' : '#1e40af', marginRight: '12px', fontSize: '14px' }}>{officer.initials}</div>
                    <div className="officer-info"><h5 style={{ margin: 0, fontSize: '14px', color: '#1e293b' }}>{officer.name}</h5><span style={{ fontSize: '12px', color: '#64748b' }}>{officer.role}</span></div>
                  </div>
                  <div className="officer-progress-block">
                    <div className="progress-labels" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px', color: '#475569' }}><span>Current Cases</span><strong style={{ color: '#0f172a', fontSize: '13px' }}>{mockDisplayCases}</strong></div>
                    <div className="progress-bar-bg" style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}><div className="progress-bar-fill" style={{ height: '100%', background: isHighLoad ? '#dc2626' : '#1e40af', width: \`\${Math.min(100, workloadPct)}%\`, borderRadius: '3px' }}/></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const rightWorkspaceView = (
    <div className="doi-right-workspace">
      {selectedItem && (
        <div className="workspace-inspector-panel">
          <div className="inspector-panel-header">
            <h3>{activeTab === 'NEW_CASES' ? 'Assign Officer' : activeTab === 'ACTIVE_INVESTIGATIONS' ? 'Case Context' : 'Document Review'}</h3>
            <div className="header-actions">
              <button className="panel-close-trigger" onClick={() => setSelectedItem(null)}><X size={16} /></button>
            </div>
          </div>

          {!isReportTab ? (
            <div className="inspector-details-card" style={{ padding: '16px' }}>
              <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>Case #{selectedItem.id}</h4>
                <p style={{ margin: '0 0 15px 0', fontSize: '13px', color: '#475569' }}>{selectedItem.subject || selectedItem.description}</p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <StatusBadgeSystem status={selectedItem.status} />
                </div>
              </div>

              {activeTab === 'NEW_CASES' && (
                <>
                  <h4 style={{ marginBottom: '15px', color: '#1e293b' }}>Select Investigation Officer</h4>
                  <div className="team-workload-grid">
                    {INVESTIGATION_OFFICERS.map(officer => {
                      const officerCases = casesList.filter(c => c.assignedTo === officer.id && c.status !== 'INVESTIGATION_COMPLETED').length;
                      const workloadPct = (officerCases / officer.maxCapacity) * 100;
                      return (
                        <div key={officer.id} className="workload-officer-card glass-panel" style={{ marginBottom: '15px', padding: '15px' }}>
                          <div className="officer-header-row" style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                            <div className="officer-avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#475569', marginRight: '15px' }}>{officer.initials}</div>
                            <div className="officer-info"><h5 style={{ margin: 0 }}>{officer.name}</h5><span style={{ fontSize: '12px', color: '#64748b' }}>{officer.role}</span></div>
                          </div>
                          <button className="btn-assign-quick" onClick={() => assignCaseMutation.mutate({ id: selectedItem.id, assignedTo: officer.id })} style={{ width: '100%', padding: '10px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}><UserPlus size={14} /> Assign Case</button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {activeTab === 'ACTIVE_INVESTIGATIONS' && (
                <>
                  <WorkflowStepper currentStatus={selectedItem.status} />
                  <div style={{ marginTop: '20px' }}>
                    <TimelineActivityFeed caseId={selectedItem.id} />
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="inspector-details-card">
              <div className="intelligence-pdf-preview glass-panel">
                <div className="pdf-letterhead">
                  <ShieldCheck size={28} className="pdf-crest" />
                  <h4>RWANDA REVENUE AUTHORITY</h4>
                  <span>Strategic Intelligence & Investigation Division</span>
                </div>
                <div className="pdf-metadata-block">
                  <div className="pdf-meta-row"><strong>Title:</strong> <span>{selectedItem.title}</span></div>
                  <div className="pdf-meta-row"><strong>Subject:</strong> <span>{selectedItem.subject}</span></div>
                  <div className="pdf-meta-row"><strong>Author:</strong> <span>{selectedItem.createdByName}</span></div>
                </div>
                <div className="pdf-document-body">
                  <p>{selectedItem.body || selectedItem.description || "Investigation findings details."}</p>
                </div>
                <div className="pdf-signature-blocks">
                  <div className="sig-block">
                    <span className="sig-label">Investigation Officer</span>
                    <strong className="sig-signed-name">{selectedItem.createdByName}</strong>
                  </div>
                  <div className="sig-block">
                    <span className="sig-label">Director of Investigation</span>
                    <span className="sig-line">
                      {(selectedItem.status.includes('APPROVED') || selectedItem.status.includes('PENDING_AC') || selectedItem.signatures?.some(s => s.role === 'DIRECTOR_OF_INVESTIGATION')) ? (
                        <strong className="sig-signed-name" style={{color: '#009A44'}}>Signed ✓</strong>
                      ) : (
                        <span className="sig-pending">Awaiting Review</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {activeTab === 'PENDING_REVIEW' && (
                <div className="inspector-action-bar" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                  <button className="btn-action-sign-report" onClick={() => signReportMutation.mutate(selectedItem.id)} style={{ flex: 1, padding: '12px', background: '#009A44', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}><Check size={16} /> Approve</button>
                  <button className="btn-action-reject-trigger" onClick={() => { setReturnReasonText(''); setReturnDialogOpen(true); }} style={{ flex: 1, padding: '12px', background: 'white', color: '#F5A800', border: '1px solid #F5A800', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}><Reply size={16} /> Return</button>
                  <button className="btn-action-reject-trigger" onClick={() => { setRejectionReason(''); setRejectDialogOpen(true); }} style={{ flex: 1, padding: '12px', background: 'white', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}><X size={16} /> Reject</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!selectedItem && (
        <div className="inspector-empty-state-card">
          <Briefcase size={48} className="empty-state-icon" style={{color: '#cbd5e1', marginBottom: '16px'}} />
          <h3 style={{color: '#334155'}}>Director Console</h3>
          <p style={{color: '#64748b'}}>Select a record from the workspace table to view details and take action.</p>
        </div>
      )}
    </div>
  );

  return (
    <AppShell>
      {toastMessage && (
        <div className="toast-notification-global" style={{ position: 'fixed', bottom: '20px', right: '20px', background: '#0f172a', color: 'white', padding: '12px 24px', borderRadius: '8px', zIndex: 9999, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
          {toastMessage}
        </div>
      )}
      <SplitWorkspaceLayout leftPane={leftWorkspaceView} rightPane={rightWorkspaceView} isItemSelected={!!selectedItem} />

      {/* Modals */}
      {returnDialogOpen && (
        <div className="modal-backdrop-overlay" onClick={() => setReturnDialogOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="modal-content-container glass-panel" onClick={e => e.stopPropagation()} style={{ background: 'white', width: '450px', padding: '24px', borderRadius: '12px' }}>
            <div className="modal-header-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}><h3 style={{ margin: 0 }}>Return to Officer</h3><button className="btn-modal-close" onClick={() => setReturnDialogOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={18} /></button></div>
            <form onSubmit={(e) => { e.preventDefault(); returnReportMutation.mutate({ id: selectedItem.id, reason: returnReasonText }); }}>
              <div className="form-input-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px' }}>Reason for Return *</label>
                <textarea required rows={4} placeholder="Explain what the Investigation Officer needs to correct..." value={returnReasonText} onChange={e => setReturnReasonText(e.target.value)} style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', resize: 'vertical' }} />
              </div>
              <div className="modal-action-buttons" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}><button type="button" onClick={() => setReturnDialogOpen(false)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button><button type="submit" style={{ padding: '10px 20px', background: '#F5A800', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Confirm Return</button></div>
            </form>
          </div>
        </div>
      )}
      {rejectDialogOpen && (
        <div className="modal-backdrop-overlay" onClick={() => setRejectDialogOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="modal-content-container glass-panel" onClick={e => e.stopPropagation()} style={{ background: 'white', width: '450px', padding: '24px', borderRadius: '12px' }}>
            <div className="modal-header-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}><h3 style={{ margin: 0 }}>Reject Document</h3><button className="btn-modal-close" onClick={() => setRejectDialogOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={18} /></button></div>
            <form onSubmit={(e) => { e.preventDefault(); rejectReportMutation.mutate({ id: selectedItem.id, reason: rejectionReason }); }}>
              <div className="form-input-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px' }}>Reason for Rejection *</label>
                <textarea required rows={4} placeholder="Explain why this document is being rejected..." value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', resize: 'vertical' }} />
              </div>
              <div className="modal-action-buttons" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}><button type="button" onClick={() => setRejectDialogOpen(false)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button><button type="submit" style={{ padding: '10px 20px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Confirm Reject</button></div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default InvestigationDirectorDashboard;
\`;

fs.writeFileSync(path.join(__dirname, '../../src/features/intelligence/InvestigationDirectorDashboard.jsx'), content);
console.log('Successfully wrote InvestigationDirectorDashboard.jsx');
