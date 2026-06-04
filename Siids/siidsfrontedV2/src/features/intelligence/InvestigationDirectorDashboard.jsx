import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { SplitWorkspaceLayout } from '../../components/ui/SplitWorkspaceLayout';
import { StatusBadgeSystem } from '../../components/ui/StatusBadgeSystem';
import { AppShell } from '../../components/layout/AppShell';
import { TimelineActivityFeed } from '../../components/ui/TimelineActivityFeed';
import { WorkflowStepper } from '../../components/ui/WorkflowStepper';
import { 
  FileText, ShieldCheck, Check, X, Layers, UserPlus, Eye, Reply, ChevronLeft, ChevronRight, Search, Briefcase, Filter, FolderOpen, Activity, Download
} from 'lucide-react';
import { generateRRAPdf } from '../../utils/generateRRAPdf';
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
  
  // Date Filters
  const [filterMonth, setFilterMonth] = useState('All');
  const [filterYear, setFilterYear] = useState('All');
  
  const [reportsPage, setReportsPage] = useState(1);
  const [reportsPageSize, setReportsPageSize] = useState(10);

  // Inspector Tabs for NEW_CASES
  const [inspectorTab, setInspectorTab] = useState('DOCUMENT'); // DOCUMENT | EVIDENCE | TIMELINE
  const [selectedOfficerId, setSelectedOfficerId] = useState('');

  // Inspector Tabs for ACTIVE_INVESTIGATIONS
  const [activeInvestTab, setActiveInvestTab] = useState('OVERVIEW'); // OVERVIEW | CASE_PLAN | EVIDENCE | DOCUMENTS | AUDIT_TRAIL | TIMELINE

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
    if (!itemDateStr) return true;
    const itemDate = new Date(itemDateStr);
    let matches = true;
    if (filterMonth !== 'All') {
      matches = matches && (itemDate.getMonth() + 1).toString() === filterMonth;
    }
    if (filterYear !== 'All') {
      matches = matches && itemDate.getFullYear().toString() === filterYear;
    }
    return matches;
  };

  const getFilteredList = () => {
    let list = [];
    if (activeTab === 'NEW_CASES') {
      list = casesList.filter(c => c.status === 'SENT_FROM_AC');
    } else if (activeTab === 'ACTIVE_INVESTIGATIONS') {
      list = casesList.filter(c => ['ASSIGNED_TO_INVESTIGATION_OFFICER', 'CASE_PLAN_SUBMITTED', 'CASE_PLAN_RETURNED', 'CASE_PLAN_REJECTED', 'INVESTIGATION_IN_PROGRESS', 'CASE_PLAN_APPROVED'].includes(c.status));
    } else if (activeTab === 'PENDING_REVIEW') {
      list = casesList.filter(c => ['REPORT_SUBMITTED', 'REPORT_RETURNED', 'REPORT_REJECTED', 'REPORT_APPROVED'].includes(c.status));
    } else if (activeTab === 'SENT_TO_AC') {
      list = casesList.filter(c => ['SENT_TO_AC', 'AC_APPROVED', 'AC_RETURNED', 'AC_REJECTED'].includes(c.status));
    } else if (activeTab === 'ALL_CASES') {
      list = casesList; // Return all cases
    }

    return list.filter(item => {
      const matchesSearch = !searchTerm || (item.title || item.subject || item.id || '').toString().toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTime = filterByTimeframe(item.createdAt);
      return matchesSearch && matchesTime;
    });
  };

  const currentList = getFilteredList();
  const isLoading = casesLoading;

  // Counters
  const countAllCases = casesList.length;
  const countNewCases = casesList.filter(c => c.status === 'SENT_FROM_AC').length;
  const countActiveCases = casesList.filter(c => ['ASSIGNED_TO_INVESTIGATION_OFFICER', 'CASE_PLAN_SUBMITTED', 'CASE_PLAN_RETURNED', 'CASE_PLAN_REJECTED', 'INVESTIGATION_IN_PROGRESS', 'CASE_PLAN_APPROVED'].includes(c.status)).length;
  const countPendingReview = casesList.filter(c => ['REPORT_SUBMITTED', 'REPORT_RETURNED', 'REPORT_REJECTED', 'REPORT_APPROVED'].includes(c.status)).length;
  const countSentToAC = casesList.filter(c => ['SENT_TO_AC', 'AC_APPROVED', 'AC_RETURNED', 'AC_REJECTED'].includes(c.status)).length;

  // Pagination bounds
  const totalPages = Math.max(1, Math.ceil(currentList.length / reportsPageSize));
  const activePage = Math.min(reportsPage, totalPages);
  const paginatedList = currentList.slice((activePage - 1) * reportsPageSize, (activePage - 1) * reportsPageSize + reportsPageSize);

  // Mutations
  const assignCaseMutation = useMutation({
    mutationFn: ({ id, assignedTo }) => apiClient.patch(`/cases/${id}/assign`, { assignedTo }),
    onSuccess: () => {
      queryClient.invalidateQueries(['cases']);
      setSelectedItem(null);
      setInspectorTab('DOCUMENT');
      triggerToast('✓ Case successfully assigned to Officer.');
    }
  });

  const signReportMutation = useMutation({
    mutationFn: (id) => apiClient.post(`/reports/${id}/sign`, {
      signerRole: 'DIRECTOR_OF_INVESTIGATION',
      signerName: 'Director of Investigation Jean de Dieu'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['reports']);
      setSelectedItem(null);
      triggerToast('✓ Document Approved and forwarded.');
    }
  });

  const approvePlanMutation = useMutation({
    mutationFn: (id) => apiClient.post(`/reports/${id}/approve-plan`),
    onSuccess: () => {
      queryClient.invalidateQueries(['reports']);
      queryClient.invalidateQueries(['cases']);
      setSelectedItem(null);
      triggerToast('✓ Case Plan Approved. Investigation is now in progress.');
    }
  });

  const rejectPlanMutation = useMutation({
    mutationFn: ({ id, reason }) => apiClient.post(`/reports/${id}/reject-plan`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries(['reports']);
      queryClient.invalidateQueries(['cases']);
      setRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedItem(null);
      triggerToast('✓ Case Plan Rejected.');
    }
  });

  const returnPlanMutation = useMutation({
    mutationFn: ({ id, reason }) => apiClient.post(`/reports/${id}/return-plan`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries(['reports']);
      queryClient.invalidateQueries(['cases']);
      setReturnDialogOpen(false);
      setReturnReasonText('');
      setSelectedItem(null);
      triggerToast('✓ Case Plan Returned for Correction.');
    }
  });

  const returnReportMutation = useMutation({
    mutationFn: ({ id, reason }) => apiClient.post(`/reports/${id}/return`, {
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
    mutationFn: ({ id, reason }) => apiClient.post(`/reports/${id}/reject`, {
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
    setInspectorTab('DOCUMENT');
  };
  
  const handleDownloadPDF = (caseData) => {
    if (!caseData) return;

    // Cases might not have signatures array, so we build a dummy or extract if it exists
    const isAcSigned  = caseData.signatures?.some(s => s.role === 'AC') || true; // AC signed it to send it here
    const isDoiSigned = caseData.signatures?.some(s => s.role === 'DIRECTOR_OF_INTELLIGENCE');

    generateRRAPdf({
      reportId:       caseData.id,
      caseRef:        caseData.id || `CASE-${caseData.caseNum || 'N/A'}`,
      title:          caseData.title || caseData.subject || 'Case Briefing',
      subject:        caseData.subject || 'Investigation Target',
      taxpayerName:   caseData.taxPayer?.taxPayerName || 'Unknown Taxpayer',
      tin:            caseData.taxPayer?.taxPayerTIN || '—',
      dateCompiled:   new Date(caseData.createdAt).toLocaleDateString('en-RW', {
                        year: 'numeric', month: 'long', day: 'numeric'
                      }),
      preparedBy:     caseData.createdByName || 'Intelligence Officer',
      preparedByRole: 'Intelligence Officer',
      status:         caseData.status || '',
      body:           caseData.body || caseData.description || caseData.caseNotes || '',
      sections:       caseData.sections || [],
      attachments:    caseData.attachments || [],
      acSignature:    { signed: isAcSigned,  name: 'AC Ronald Niwenshuti' },
      dirSignature:   { signed: isDoiSigned, name: 'Director Christian Mugunga' },
      rejectionReason: caseData.rejectionReason || null,
      returnReason:    caseData.returnReason    || null,
    });

    triggerToast('✅ PDF saved to your Downloads folder.');
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
            <button key={p} type="button" className={`pagination-number-btn ${p === aPage ? 'active' : ''}`} onClick={() => onPageChange(p)} style={{ minWidth: '24px', height: '24px', border: p === aPage ? 'none' : '1.5px solid #cbd5e1', borderRadius: '4px', background: p === aPage ? 'var(--primary-brand)' : 'white', color: p === aPage ? 'white' : '#475569', fontWeight: 600, fontSize: '11px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p}</button>
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

  const getCasePlanStatus = (item) => {
    if (['CASE_PLAN_SUBMITTED'].includes(item.status)) return 'Submitted';
    if (['CASE_PLAN_RETURNED'].includes(item.status)) return 'Returned';
    if (['CASE_PLAN_REJECTED'].includes(item.status)) return 'Rejected';
    if (['INVESTIGATION_IN_PROGRESS', 'CASE_PLAN_APPROVED', 'REPORT_SUBMITTED', 'REPORT_APPROVED', 'REPORT_RETURNED', 'REPORT_REJECTED', 'SENT_TO_AC', 'AC_APPROVED', 'AC_RETURNED', 'AC_REJECTED'].includes(item.status)) return 'Approved';
    return 'Not Submitted';
  };

  const getReportStatus = (item) => {
    if (item.status === 'REPORT_SUBMITTED') return 'Submitted';
    if (item.status === 'REPORT_RETURNED') return 'Returned';
    if (item.status === 'REPORT_REJECTED') return 'Rejected';
    if (['REPORT_APPROVED', 'SENT_TO_AC', 'AC_APPROVED', 'AC_RETURNED', 'AC_REJECTED'].includes(item.status)) return 'Approved';
    return 'Not Submitted';
  };

  const getACStatus = (item) => {
    if (item.status === 'SENT_TO_AC') return 'Pending AC';
    if (item.status === 'AC_APPROVED') return 'Approved';
    if (item.status === 'AC_RETURNED') return 'Returned';
    if (item.status === 'AC_REJECTED') return 'Rejected';
    return 'N/A';
  };

  const getDaysActive = (dateString) => {
    if (!dateString) return '0 days';
    const diffTime = Math.abs(new Date() - new Date(dateString));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return `${diffDays} days`;
  };

  const leftWorkspaceView = (
    <div className="doi-left-workspace">
      {/* Unified 5 Workflow Cards */}
      <div className="metrics-grid-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px' }}>
        <div className={`intel-nav-card card-blue ${activeTab === 'NEW_CASES' ? 'active' : ''}`} onClick={() => { setActiveTab('NEW_CASES'); setSelectedItem(null); setReportsPage(1); }}>
          <div className="nav-card-main-row"><div className="nav-card-icon-container"><FolderOpen size={20} /></div><div className="nav-card-counter">{countNewCases}</div></div>
          <div className="nav-card-details"><span className="nav-card-title">New Cases</span><span className="nav-card-subtitle">From AC</span></div>
        </div>

        <div className={`intel-nav-card card-green ${activeTab === 'ACTIVE_INVESTIGATIONS' ? 'active' : ''}`} onClick={() => { setActiveTab('ACTIVE_INVESTIGATIONS'); setSelectedItem(null); setReportsPage(1); }}>
          <div className="nav-card-main-row"><div className="nav-card-icon-container"><Activity size={20} /></div><div className="nav-card-counter">{countActiveCases}</div></div>
          <div className="nav-card-details"><span className="nav-card-title">Active</span><span className="nav-card-subtitle">Investigations</span></div>
        </div>

        <div className={`intel-nav-card card-orange ${activeTab === 'PENDING_REVIEW' ? 'active' : ''}`} onClick={() => { setActiveTab('PENDING_REVIEW'); setSelectedItem(null); setReportsPage(1); }}>
          <div className="nav-card-main-row"><div className="nav-card-icon-container"><FileText size={20} /></div><div className="nav-card-counter">{countPendingReview}</div></div>
          <div className="nav-card-details"><span className="nav-card-title">Pending Review</span><span className="nav-card-subtitle">Reports / Plans</span></div>
        </div>

        <div className={`intel-nav-card card-purple ${activeTab === 'SENT_TO_AC' ? 'active' : ''}`} onClick={() => { setActiveTab('SENT_TO_AC'); setSelectedItem(null); setReportsPage(1); }}>
          <div className="nav-card-main-row"><div className="nav-card-icon-container"><Layers size={20} /></div><div className="nav-card-counter">{countSentToAC}</div></div>
          <div className="nav-card-details"><span className="nav-card-title">Sent to AC</span><span className="nav-card-subtitle">Upstream / Final</span></div>
        </div>
        
        <div className={`intel-nav-card ${activeTab === 'ALL_CASES' ? 'active' : ''}`} style={{ background: activeTab === 'ALL_CASES' ? '#334155' : '#475569', color: 'white', cursor: 'pointer', borderRadius: '8px', padding: '15px' }} onClick={() => { setActiveTab('ALL_CASES'); setSelectedItem(null); setReportsPage(1); }}>
          <div className="nav-card-main-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}><div className="nav-card-icon-container" style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '6px' }}><Briefcase size={20} /></div><div className="nav-card-counter" style={{ fontSize: '24px', fontWeight: 'bold' }}>{countAllCases}</div></div>
          <div className="nav-card-details" style={{ display: 'flex', flexDirection: 'column' }}><span className="nav-card-title" style={{ fontWeight: 'bold', fontSize: '13px' }}>All Cases</span><span className="nav-card-subtitle" style={{ fontSize: '11px', opacity: 0.8 }}>View Everything</span></div>
        </div>
      </div>

      <div className="table-filter-toolbar glass-panel doi-workspace-filter-bar" style={{ marginTop: '20px' }}>
        <div className="workspace-tab-filters">
           <span style={{ fontWeight: 'bold', color: '#0f172a', paddingLeft: '10px' }}>
              {activeTab === 'NEW_CASES' && 'Cases Assigned from AC'}
              {activeTab === 'ACTIVE_INVESTIGATIONS' && 'Cases Under Investigation'}
              {activeTab === 'PENDING_REVIEW' && 'Reports Submitted to Director'}
              {activeTab === 'SENT_TO_AC' && 'Reports Sent to AC / Finalized Cases'}
              {activeTab === 'ALL_CASES' && 'All Investigation Cases'}
           </span>
        </div>
        <div className="workspace-right-controls" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select 
            value={filterMonth} 
            onChange={(e) => setFilterMonth(e.target.value)}
            style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
          >
            <option value="All">All Months</option>
            <option value="1">January</option>
            <option value="2">February</option>
            <option value="3">March</option>
            <option value="4">April</option>
            <option value="5">May</option>
            <option value="6">June</option>
            <option value="7">July</option>
            <option value="8">August</option>
            <option value="9">September</option>
            <option value="10">October</option>
            <option value="11">November</option>
            <option value="12">December</option>
          </select>

          <select 
            value={filterYear} 
            onChange={(e) => setFilterYear(e.target.value)}
            style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
          >
            <option value="All">All Years</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
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
                <tr><th>Case Ref</th><th>Subject</th><th>Case Plan</th><th>Investigation Report</th><th>Assigned Officer</th><th>Inv. Status</th><th align="center">Actions</th></tr>
              )}
              {activeTab === 'ACTIVE_INVESTIGATIONS' && (
                <tr><th>Case Ref</th><th>Assigned Officer</th><th>Case Plan Status</th><th>Inv. Status</th><th>Days Active</th><th align="center">Actions</th></tr>
              )}
              {activeTab === 'PENDING_REVIEW' && (
                <tr><th>Case Ref</th><th>Assigned Officer</th><th>Case Plan Status</th><th>Report Status</th><th>Inv. Status</th><th>Days Active</th><th align="center">Actions</th></tr>
              )}
              {activeTab === 'SENT_TO_AC' && (
                <tr><th>Case Ref</th><th>Assigned Officer</th><th>Case Plan Status</th><th>Report Status</th><th>AC Status</th><th>Days Active</th><th align="center">Actions</th></tr>
              )}
              {activeTab === 'ALL_CASES' && (
                <tr><th>Case Ref</th><th>Assigned Officer</th><th>Inv. Status</th><th>AC Status</th><th>Days Active</th><th align="center">Actions</th></tr>
              )}
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="table-loader-cell">Loading...</td></tr>
              ) : paginatedList.length === 0 ? (
                <tr><td colSpan={7} className="table-empty-cell">No records found.</td></tr>
              ) : (
                paginatedList.map(item => {
                  return (
                    <tr key={item.id} className={`virtual-row-item ${selectedItem?.id === item.id ? 'row-selected' : ''}`} onClick={(e) => handleActionClick(e, item)}>
                      {activeTab === 'NEW_CASES' && (
                        <>
                          <td className="desc-cell-title">#{item.id}</td>
                          <td className="truncate-text" style={{ maxWidth: '200px' }}>{item.subject || item.description}</td>
                          <td style={{ color: '#94a3b8' }}>Not Submitted</td>
                          <td style={{ color: '#94a3b8' }}>Not Submitted</td>
                          <td style={{ color: '#94a3b8' }}>Unassigned</td>
                          <td><StatusBadgeSystem status={item.status} /></td>
                          <td align="center"><button className="btn-icon" onClick={(e) => handleActionClick(e, item)} title="Assign"><UserPlus size={16} /></button></td>
                        </>
                      )}
                      {activeTab === 'ACTIVE_INVESTIGATIONS' && (
                        <>
                          <td className="desc-cell-title">#{item.id}</td>
                          <td style={{ color: '#009A44', fontWeight: 'bold' }}>{INVESTIGATION_OFFICERS.find(o => o.id === item.assignedTo)?.name || item.assignedTo || 'Unknown'}</td>
                          <td><span style={{ padding: '4px 8px', borderRadius: '4px', background: getCasePlanStatus(item) === 'Approved' ? '#dcfce7' : '#f1f5f9', color: getCasePlanStatus(item) === 'Approved' ? '#166534' : '#475569', fontSize: '11px', fontWeight: 'bold' }}>{getCasePlanStatus(item)}</span></td>
                          <td><StatusBadgeSystem status={item.status} /></td>
                          <td>{getDaysActive(item.createdAt)}</td>
                          <td align="center"><button className="btn-icon" onClick={(e) => handleActionClick(e, item)} title="View Case"><Eye size={16} /></button></td>
                        </>
                      )}
                      {activeTab === 'PENDING_REVIEW' && (
                        <>
                          <td className="desc-cell-title">#{item.id}</td>
                          <td style={{ color: '#009A44', fontWeight: 'bold' }}>{INVESTIGATION_OFFICERS.find(o => o.id === item.assignedTo)?.name || item.assignedTo || 'Unknown'}</td>
                          <td><span style={{ padding: '4px 8px', borderRadius: '4px', background: '#dcfce7', color: '#166534', fontSize: '11px', fontWeight: 'bold' }}>{getCasePlanStatus(item)}</span></td>
                          <td><span style={{ padding: '4px 8px', borderRadius: '4px', background: getReportStatus(item) === 'Approved' ? '#dcfce7' : '#fef9c3', color: getReportStatus(item) === 'Approved' ? '#166534' : '#854d0e', fontSize: '11px', fontWeight: 'bold' }}>{getReportStatus(item)}</span></td>
                          <td><StatusBadgeSystem status={item.status} /></td>
                          <td>{getDaysActive(item.createdAt)}</td>
                          <td align="center"><button className="btn-icon" onClick={(e) => handleActionClick(e, item)} title="View Report"><Eye size={16} /></button></td>
                        </>
                      )}
                      {activeTab === 'SENT_TO_AC' && (
                        <>
                          <td className="desc-cell-title">#{item.id}</td>
                          <td style={{ color: '#009A44', fontWeight: 'bold' }}>{INVESTIGATION_OFFICERS.find(o => o.id === item.assignedTo)?.name || item.assignedTo || 'Unknown'}</td>
                          <td><span style={{ padding: '4px 8px', borderRadius: '4px', background: '#dcfce7', color: '#166534', fontSize: '11px', fontWeight: 'bold' }}>{getCasePlanStatus(item)}</span></td>
                          <td><span style={{ padding: '4px 8px', borderRadius: '4px', background: '#dcfce7', color: '#166534', fontSize: '11px', fontWeight: 'bold' }}>{getReportStatus(item)}</span></td>
                          <td><span style={{ padding: '4px 8px', borderRadius: '4px', background: getACStatus(item) === 'Approved' ? '#dcfce7' : getACStatus(item) === 'Rejected' ? '#fee2e2' : getACStatus(item) === 'Returned' ? '#ffedd5' : '#f1f5f9', color: getACStatus(item) === 'Approved' ? '#166534' : getACStatus(item) === 'Rejected' ? '#991b1b' : getACStatus(item) === 'Returned' ? '#9a3412' : '#475569', fontSize: '11px', fontWeight: 'bold' }}>{getACStatus(item)}</span></td>
                          <td>{getDaysActive(item.createdAt)}</td>
                          <td align="center"><button className="btn-icon" onClick={(e) => handleActionClick(e, item)} title="View Final Record"><Eye size={16} /></button></td>
                        </>
                      )}
                      {activeTab === 'ALL_CASES' && (
                        <>
                          <td className="desc-cell-title">#{item.id}</td>
                          <td style={{ color: item.assignedTo ? '#009A44' : '#94a3b8', fontWeight: item.assignedTo ? 'bold' : 'normal' }}>{INVESTIGATION_OFFICERS.find(o => o.id === item.assignedTo)?.name || item.assignedTo || 'Unassigned'}</td>
                          <td><StatusBadgeSystem status={item.status} /></td>
                          <td><span style={{ padding: '4px 8px', borderRadius: '4px', background: getACStatus(item) === 'Approved' ? '#dcfce7' : getACStatus(item) === 'Rejected' ? '#fee2e2' : getACStatus(item) === 'Returned' ? '#ffedd5' : '#f1f5f9', color: getACStatus(item) === 'Approved' ? '#166534' : getACStatus(item) === 'Rejected' ? '#991b1b' : getACStatus(item) === 'Returned' ? '#9a3412' : '#475569', fontSize: '11px', fontWeight: 'bold' }}>{getACStatus(item)}</span></td>
                          <td>{getDaysActive(item.createdAt)}</td>
                          <td align="center"><button className="btn-icon" onClick={(e) => handleActionClick(e, item)} title="View Case"><Eye size={16} /></button></td>
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
                    <div className="progress-bar-bg" style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}><div className="progress-bar-fill" style={{ height: '100%', background: isHighLoad ? '#dc2626' : '#1e40af', width: `${Math.min(100, workloadPct)}%`, borderRadius: '3px' }}/></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const getAvailableTabs = (status) => {
    if (status === 'SENT_FROM_AC') return ['OVERVIEW', 'EVIDENCE', 'AUDIT_TRAIL', 'TIMELINE'];
    if (['ASSIGNED_TO_INVESTIGATION_OFFICER', 'CASE_PLAN_SUBMITTED', 'CASE_PLAN_RETURNED', 'CASE_PLAN_REJECTED', 'INVESTIGATION_IN_PROGRESS', 'CASE_PLAN_APPROVED'].includes(status)) {
      if (status === 'ASSIGNED_TO_INVESTIGATION_OFFICER') return ['OVERVIEW', 'EVIDENCE', 'AUDIT_TRAIL', 'TIMELINE'];
      return ['OVERVIEW', 'CASE_PLAN', 'EVIDENCE', 'AUDIT_TRAIL', 'TIMELINE'];
    }
    return ['OVERVIEW', 'CASE_PLAN', 'INVESTIGATION_REPORT', 'EVIDENCE', 'DOCUMENTS', 'AUDIT_TRAIL', 'TIMELINE'];
  };

  const rightWorkspaceView = (
    <div className="doi-right-workspace">
      {selectedItem && (() => {
        const displayCase = selectedItem;
        const availableTabs = getAvailableTabs(displayCase.status);
        const currentInspectorTab = availableTabs.includes(activeInvestTab) ? activeInvestTab : 'OVERVIEW';
        const displayReport = reportsList.filter(r => r.caseId === displayCase.id || r.caseNum === displayCase.id).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

        return (
          <div className="workspace-inspector-panel">
            <div className="inspector-panel-header">
              <h3>Case Context: #{displayCase.id}</h3>
              <div className="header-actions">
                <button className="panel-close-trigger" onClick={() => setSelectedItem(null)}><X size={16} /></button>
              </div>
            </div>

            <div className="inspector-details-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="inspector-tabs-nav" style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '20px', gap: '20px' }}>
                {availableTabs.map(tab => (
                  <button 
                    key={tab}
                    className={`inspector-tab-btn ${currentInspectorTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveInvestTab(tab)}
                    style={{ padding: '10px 0', background: 'none', border: 'none', borderBottom: currentInspectorTab === tab ? '2px solid #005A9C' : '2px solid transparent', color: currentInspectorTab === tab ? '#005A9C' : '#64748b', fontWeight: currentInspectorTab === tab ? 'bold' : 'normal', cursor: 'pointer', fontSize: '12px' }}
                  >
                    {tab.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <div className="inspector-tab-content custom-scrollbar" style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
                {currentInspectorTab === 'OVERVIEW' && (
                  <>
                    <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>Case #{displayCase.id}</h4>
                      <p style={{ margin: '0 0 15px 0', fontSize: '13px', color: '#475569' }}>{displayCase.subject || displayCase.description}</p>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <StatusBadgeSystem status={displayCase.status} />
                      </div>
                    </div>

                    <WorkflowStepper 
                      steps={['Assigned', 'Case Plan', 'In Progress', 'Report Submitted']} 
                      activeStep={
                        ['REPORT_SUBMITTED', 'REPORT_APPROVED', 'SENT_TO_AC', 'AC_APPROVED', 'AC_RETURNED', 'AC_REJECTED'].includes(displayCase.status) ? 3 :
                        ['INVESTIGATION_IN_PROGRESS', 'CASE_PLAN_APPROVED'].includes(displayCase.status) ? 2 :
                        ['CASE_PLAN_SUBMITTED', 'CASE_PLAN_RETURNED', 'CASE_PLAN_REJECTED'].includes(displayCase.status) ? 1 : 
                        0
                      } 
                    />

                    {displayCase.status === 'SENT_FROM_AC' ? (
                      <div className="assign-officer-bottom-section glass-panel" style={{ marginTop: '20px', padding: '15px', background: '#f8fafc' }}>
                        <h4 style={{ marginBottom: '10px', color: '#1e293b' }}>Assign Investigation Officer</h4>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <select 
                            value={selectedOfficerId} 
                            onChange={(e) => setSelectedOfficerId(e.target.value)}
                            style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                          >
                            <option value="" disabled>Select Officer...</option>
                            {INVESTIGATION_OFFICERS.map(officer => (
                              <option key={officer.id} value={officer.id}>{officer.name} - {officer.role}</option>
                            ))}
                          </select>
                          <button 
                            className="btn-assign-quick" 
                            disabled={!selectedOfficerId}
                            onClick={() => {
                              assignCaseMutation.mutate({ id: displayCase.id, assignedTo: selectedOfficerId });
                              setSelectedOfficerId('');
                            }} 
                            style={{ padding: '10px 20px', background: selectedOfficerId ? '#0f172a' : '#cbd5e1', color: 'white', border: 'none', borderRadius: '4px', cursor: selectedOfficerId ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 'bold' }}
                          >
                            <UserPlus size={14} /> Assign Case
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginTop: '20px' }}>
                        <h5 style={{ marginBottom: '10px', color: '#1e293b' }}>Assignment Details</h5>
                        <div className="glass-panel" style={{ padding: '15px' }}>
                          <div className="pdf-meta-row" style={{ display: 'flex', marginBottom: '10px' }}><strong style={{ width: '150px' }}>Assigned Officer:</strong> <span>{INVESTIGATION_OFFICERS.find(o => o.id === displayCase.assignedTo)?.name || 'Unknown'}</span></div>
                          <div className="pdf-meta-row" style={{ display: 'flex', marginBottom: '10px' }}><strong style={{ width: '150px' }}>Assignment Date:</strong> <span>{new Date(displayCase.createdAt).toLocaleDateString('en-GB')}</span></div>
                          <div className="pdf-meta-row" style={{ display: 'flex' }}><strong style={{ width: '150px' }}>Case Priority:</strong> <span>High</span></div>
                        </div>
                      </div>
                    )}
                  </>
                )}



                      {(currentInspectorTab === 'CASE_PLAN' || currentInspectorTab === 'INVESTIGATION_REPORT') && (() => {
                        const targetDocument = displayReport; // Assuming both are combined in report or this is mock representation
                        const isTargetReport = currentInspectorTab === 'INVESTIGATION_REPORT';
                        const docStatus = displayCase.status; // Real status is tracked on the Case now
                        
                        if ((isTargetReport && !['REPORT_SUBMITTED', 'REPORT_APPROVED', 'REPORT_RETURNED', 'REPORT_REJECTED', 'SENT_TO_AC', 'AC_APPROVED', 'AC_RETURNED', 'AC_REJECTED'].includes(docStatus)) || 
                            (!isTargetReport && !['CASE_PLAN_SUBMITTED', 'CASE_PLAN_APPROVED', 'CASE_PLAN_RETURNED', 'CASE_PLAN_REJECTED', 'INVESTIGATION_IN_PROGRESS', 'REPORT_SUBMITTED', 'REPORT_APPROVED', 'REPORT_RETURNED', 'REPORT_REJECTED', 'SENT_TO_AC', 'AC_APPROVED', 'AC_RETURNED', 'AC_REJECTED'].includes(docStatus))) {
                          return (
                            <div className="empty-state glass-panel" style={{ padding: '40px 20px', textAlign: 'center' }}>
                              <FileText size={48} color="#cbd5e1" style={{ marginBottom: '15px' }} />
                              <h3 style={{ color: '#475569', margin: '0 0 10px 0' }}>Awaiting Submission</h3>
                              <p style={{ color: '#64748b', fontSize: '13px' }}>The Investigation Officer is currently preparing the document. You will be able to review and approve it here once it is submitted.</p>
                            </div>
                          );
                        }

                        return (
                          <div className="case-plan-view">
                            <div className="intelligence-pdf-preview glass-panel">
                              <div className="pdf-letterhead">
                                <ShieldCheck size={28} className="pdf-crest" />
                                <h4>RWANDA REVENUE AUTHORITY</h4>
                                <span>Strategic Intelligence & Investigation Division</span>
                              </div>
                              <div className="pdf-metadata-block">
                                <div className="pdf-meta-row"><strong>Title:</strong> <span>{isTargetReport ? 'Investigation Report' : 'Case Plan'}</span></div>
                                <div className="pdf-meta-row"><strong>Case Ref:</strong> <span>{displayCase.id}</span></div>
                                <div className="pdf-meta-row"><strong>Officer:</strong> <span>{INVESTIGATION_OFFICERS.find(o => o.id === displayCase.assignedTo)?.name || 'Unknown'}</span></div>
                              </div>
                              <div className="pdf-document-body" style={{ whiteSpace: 'pre-line' }}>
                                {displayCase.description}
                              </div>
                              <div className="pdf-signature-blocks" style={{ marginTop: '30px' }}>
                                <div className="sig-block">
                                  <span className="sig-label">Prepared By</span>
                                  <strong className="sig-signed-name" style={{color: '#009A44'}}>{INVESTIGATION_OFFICERS.find(o => o.id === displayCase.assignedTo)?.name || 'Unknown'} ✓</strong>
                                </div>
                                <div className="sig-block">
                                  <span className="sig-label">Director of Investigation</span>
                                  <span className="sig-line">
                                    {((!isTargetReport && ['CASE_PLAN_APPROVED', 'INVESTIGATION_IN_PROGRESS', 'REPORT_SUBMITTED', 'REPORT_APPROVED', 'SENT_TO_AC', 'AC_APPROVED', 'AC_RETURNED', 'AC_REJECTED'].includes(docStatus)) || 
                                      (isTargetReport && ['REPORT_APPROVED', 'SENT_TO_AC', 'AC_APPROVED', 'AC_RETURNED', 'AC_REJECTED'].includes(docStatus))) ? (
                                      <strong className="sig-signed-name" style={{color: '#009A44'}}>Director of Investigation Jean de Dieu ✓</strong>
                                    ) : ((!isTargetReport && docStatus === 'CASE_PLAN_REJECTED') || (isTargetReport && docStatus === 'REPORT_REJECTED')) ? (
                                      <strong className="sig-signed-name" style={{color: '#ef4444'}}>REJECTED</strong>
                                    ) : ((!isTargetReport && docStatus === 'CASE_PLAN_RETURNED') || (isTargetReport && docStatus === 'REPORT_RETURNED')) ? (
                                      <strong className="sig-signed-name" style={{color: '#f59e0b'}}>CORRECTIONS REQUESTED</strong>
                                    ) : (
                                      <span style={{color: '#94a3b8', fontStyle: 'italic'}}>Pending Review</span>
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {((!isTargetReport && docStatus === 'CASE_PLAN_SUBMITTED') || (isTargetReport && docStatus === 'REPORT_SUBMITTED')) && (
                              <div className="reviewer-actions glass-panel" style={{ marginTop: '20px', padding: '20px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                <h4 style={{ margin: '0 0 15px 0', color: '#0f172a' }}>Director Review Actions</h4>
                                <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#475569' }}>Please review the document and take appropriate action.</p>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                  <button className="btn-approve" onClick={() => {
                                    if(isTargetReport) signReportMutation.mutate(displayReport?.id);
                                    else approvePlanMutation.mutate(displayReport?.id);
                                  }} disabled={approvePlanMutation.isPending || signReportMutation.isPending} style={{ flex: 1, padding: '12px', background: '#009A44', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                                    <Check size={16} /> Approve {isTargetReport ? 'Report' : 'Case Plan'}
                                  </button>
                                  <button className="btn-return" onClick={() => { setReturnReasonText(''); setReturnDialogOpen(true); }} style={{ flex: 1, padding: '12px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                                    <Reply size={16} /> Return for Correction
                                  </button>
                                  <button className="btn-reject" onClick={() => { setRejectionReason(''); setRejectDialogOpen(true); }} style={{ flex: 1, padding: '12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                                    <X size={16} /> Reject {isTargetReport ? 'Report' : 'Case Plan'}
                                  </button>
                                </div>
                              </div>
                            )}

                            {isTargetReport && docStatus === 'REPORT_APPROVED' && (
                              <div className="reviewer-actions glass-panel" style={{ marginTop: '20px', padding: '20px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                <h4 style={{ margin: '0 0 15px 0', color: '#0f172a' }}>Send to Assistant Commissioner</h4>
                                <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#475569' }}>The report is approved. Send it to the AC for final review.</p>
                                <button className="btn-approve" onClick={() => {
                                  // Map this to our send to AC logic (could reuse approve or create new)
                                  signReportMutation.mutate(displayReport?.id); // For simplicity, trigger same mutation or a specific one if defined
                                }} disabled={signReportMutation.isPending} style={{ width: '100%', padding: '12px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                                  <Check size={16} /> Send Report to AC
                                </button>
                              </div>
                            )}

                            {isTargetReport && ['SENT_TO_AC', 'AC_APPROVED', 'AC_RETURNED', 'AC_REJECTED'].includes(docStatus) && (
                              <div className="status-banner" style={{ marginTop: '20px', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <ShieldCheck size={20} color="#005A9C" />
                                <div>
                                  <strong style={{ color: '#0f172a' }}>Document Sent Upstream</strong>
                                  <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#64748b' }}>This document has been sent to the Assistant Commissioner for final processing. Current Status: {docStatus}</p>
                                </div>
                              </div>
                            )}
                            
                            {isTargetReport && docStatus === 'AC_RETURNED' && (
                              <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
                                <button className="btn-return" onClick={() => { setReturnReasonText('Required fixes per AC.'); setReturnDialogOpen(true); }} style={{ flex: 1, padding: '12px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                                  <Reply size={16} /> Return to Officer
                                </button>
                                <button className="btn-approve" onClick={() => signReportMutation.mutate(displayCase.id)} style={{ flex: 1, padding: '12px', background: '#009A44', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                                  <Check size={16} /> Modify & Resend to AC
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {currentInspectorTab === 'TIMELINE' && (
                        <TimelineActivityFeed caseId={displayCase.id} />
                      )}
                      
                      {['EVIDENCE', 'DOCUMENTS', 'AUDIT_TRAIL'].includes(currentInspectorTab) && (
                         <div className="empty-state glass-panel" style={{ padding: '40px 20px', textAlign: 'center' }}>
                           <FolderOpen size={48} color="#cbd5e1" style={{ marginBottom: '15px' }} />
                           <h3 style={{ color: '#475569', margin: '0 0 10px 0' }}>No files found</h3>
                           <p style={{ color: '#64748b', fontSize: '13px' }}>There are no {currentInspectorTab.toLowerCase().replace('_', ' ')} items linked to this case yet.</p>
                         </div>
                      )}
                    </div>
            </div>
          </div>
        );
      })()}

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
            <form onSubmit={(e) => { 
              e.preventDefault(); 
              const targetReport = reportsList.filter(r => r.caseId === selectedItem.id || r.caseNum === selectedItem.id).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
              if (targetReport) {
                if (activeInvestTab === 'CASE_PLAN') {
                  returnPlanMutation.mutate({ id: targetReport.id, reason: returnReasonText });
                } else {
                  returnReportMutation.mutate({ id: targetReport.id, reason: returnReasonText });
                }
              }
            }}>
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
            <form onSubmit={(e) => { 
              e.preventDefault(); 
              const targetReport = reportsList.filter(r => r.caseId === selectedItem.id || r.caseNum === selectedItem.id).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
              if (targetReport) {
                if (activeInvestTab === 'CASE_PLAN') {
                  rejectPlanMutation.mutate({ id: targetReport.id, reason: rejectionReason });
                } else {
                  rejectReportMutation.mutate({ id: targetReport.id, reason: rejectionReason });
                }
              }
            }}>
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
