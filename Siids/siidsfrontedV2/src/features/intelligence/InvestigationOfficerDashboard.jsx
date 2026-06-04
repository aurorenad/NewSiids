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
  FileText, ShieldCheck, Check, X, Layers, UserPlus, Eye, Reply, ChevronLeft, ChevronRight, Search, Briefcase, Filter, FolderOpen, Activity, Download, Settings, ClipboardList
} from 'lucide-react';
import { generateRRAPdf } from '../../utils/generateRRAPdf';
import './DoiDashboard.css'; 

const INVESTIGATION_OFFICERS = [
  { id: 'inv-gakwaya', name: 'Maj. J. Gakwaya', role: 'Investigation Officer' },
  { id: 'inv-musoni', name: 'Insp. S. Musoni', role: 'Investigation Officer' },
  { id: 'inv-kagabo', name: 'Insp. D. Kagabo', role: 'Investigation Officer' },
  { id: 'inv-uwera', name: 'Insp. R. Uwera', role: 'Investigation Officer' },
  { id: 'inv-officer', name: 'Officer Alphonse', role: 'Investigation Officer' }
];

export const InvestigationOfficerDashboard = () => {
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('ASSIGNED'); 
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [filterMonth, setFilterMonth] = useState('All');
  const [filterYear, setFilterYear] = useState('All');
  
  const [reportsPage, setReportsPage] = useState(1);
  const [reportsPageSize] = useState(10);

  const [activeInvestTab, setActiveInvestTab] = useState('OVERVIEW'); 
  
  const [casePlanBody, setCasePlanBody] = useState('');
  const [reportTitle, setReportTitle] = useState('');
  const [reportSubject, setReportSubject] = useState('');
  const [reportBody, setReportBody] = useState('');

  const [toastMessage, setToastMessage] = useState(null);
  const triggerToast = (msg, duration = 3000) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), duration);
  };

  const { data: casesResponse, isLoading: casesLoading } = useQuery({
    queryKey: ['cases'],
    queryFn: () => apiClient.get('/cases').catch(() => ({ data: { data: [] } }))
  });
  const casesList = casesResponse?.data?.data || [];

  const { data: reportsResponse } = useQuery({
    queryKey: ['reports'],
    queryFn: () => apiClient.get('/reports').catch(() => ({ data: { data: [] } }))
  });
  const reportsList = reportsResponse?.data?.data || [];

  // Display all cases assigned to any officer (in real app, this would be scoped to logged in user)
  const myCases = casesList.filter(c => c.assignedTo && c.assignedTo.startsWith('inv-'));

  const filterByTimeframe = (itemDateStr) => {
    if (!itemDateStr) return true;
    const itemDate = new Date(itemDateStr);
    let matches = true;
    if (filterMonth !== 'All') matches = matches && (itemDate.getMonth() + 1).toString() === filterMonth;
    if (filterYear !== 'All') matches = matches && itemDate.getFullYear().toString() === filterYear;
    return matches;
  };

  const getFilteredList = () => {
    let list = [];
    if (activeTab === 'ASSIGNED') {
      list = myCases.filter(c => ['ASSIGNED_TO_INVESTIGATION_OFFICER', 'CASE_PLAN_RETURNED'].includes(c.status));
    } else if (activeTab === 'ACTIVE') {
      list = myCases.filter(c => ['INVESTIGATION_IN_PROGRESS', 'REPORT_RETURNED'].includes(c.status));
    } else if (activeTab === 'PENDING_REVIEW') {
      list = myCases.filter(c => ['CASE_PLAN_SUBMITTED', 'REPORT_SUBMITTED'].includes(c.status));
    } else if (activeTab === 'COMPLETED') {
      list = myCases.filter(c => ['REPORT_APPROVED', 'SENT_TO_AC', 'AC_APPROVED', 'AC_RETURNED', 'AC_REJECTED', 'REPORT_REJECTED', 'CASE_PLAN_REJECTED'].includes(c.status));
    } else if (activeTab === 'ALL_CASES') {
      list = myCases;
    }
    return list.filter(item => {
      const matchesSearch = !searchTerm || (item.title || item.subject || item.id || '').toString().toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch && filterByTimeframe(item.createdAt);
    });
  };

  const currentList = getFilteredList();

  const countAssigned = myCases.filter(c => ['ASSIGNED_TO_INVESTIGATION_OFFICER', 'CASE_PLAN_RETURNED'].includes(c.status)).length;
  const countActive = myCases.filter(c => ['INVESTIGATION_IN_PROGRESS', 'REPORT_RETURNED'].includes(c.status)).length;
  const countPending = myCases.filter(c => ['CASE_PLAN_SUBMITTED', 'REPORT_SUBMITTED'].includes(c.status)).length;
  const countCompleted = myCases.filter(c => ['REPORT_APPROVED', 'SENT_TO_AC', 'AC_APPROVED', 'AC_RETURNED', 'AC_REJECTED', 'REPORT_REJECTED', 'CASE_PLAN_REJECTED'].includes(c.status)).length;
  const countAllCases = myCases.length;

  const totalPages = Math.max(1, Math.ceil(currentList.length / reportsPageSize));
  const activePage = Math.min(reportsPage, totalPages);
  const paginatedList = currentList.slice((activePage - 1) * reportsPageSize, (activePage - 1) * reportsPageSize + reportsPageSize);

  // Mutations
  const submitCasePlanMutation = useMutation({
    mutationFn: ({ caseId, body }) => apiClient.post(`/reports`, {
      caseId,
      isCasePlan: true,
      title: `Case Plan for ${caseId}`,
      subject: `Investigation Strategy`,
      body
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['cases']);
      queryClient.invalidateQueries(['reports']);
      setSelectedItem(null);
      triggerToast('✓ Case Plan Submitted for Approval.');
    }
  });

  const resubmitCasePlanMutation = useMutation({
    mutationFn: ({ reportId, body }) => apiClient.put(`/reports/${reportId}`, {
      body,
      status: 'CASE_PLAN_SUBMITTED'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['cases']);
      queryClient.invalidateQueries(['reports']);
      setSelectedItem(null);
      triggerToast('✓ Case Plan Resubmitted for Approval.');
    }
  });

  const submitReportMutation = useMutation({
    mutationFn: ({ caseId, title, subject, body }) => apiClient.post(`/reports`, {
      caseId,
      isCasePlan: false,
      title,
      subject,
      body
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['cases']);
      queryClient.invalidateQueries(['reports']);
      setSelectedItem(null);
      triggerToast('✓ Final Report Submitted for Approval.');
    }
  });

  const resubmitReportMutation = useMutation({
    mutationFn: ({ reportId, title, subject, body }) => apiClient.put(`/reports/${reportId}`, {
      title,
      subject,
      body,
      status: 'PENDING_DIRECTOR_SIGNATURE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['cases']);
      queryClient.invalidateQueries(['reports']);
      setSelectedItem(null);
      triggerToast('✓ Final Report Resubmitted for Approval.');
    }
  });

  const handleActionClick = (e, item) => {
    e.stopPropagation();
    setSelectedItem(item);
    
    // Pre-fill forms if draft exists
    const draftPlan = reportsList.find(r => (r.caseId === item.id || r.caseNum === item.id) && r.generationType === 'CASE_PLAN');
    const draftReport = reportsList.find(r => (r.caseId === item.id || r.caseNum === item.id) && r.generationType !== 'CASE_PLAN');
    
    if (draftPlan) setCasePlanBody(draftPlan.body);
    else setCasePlanBody('');
    
    if (draftReport) {
      setReportTitle(draftReport.title);
      setReportSubject(draftReport.subject);
      setReportBody(draftReport.body);
    } else {
      setReportTitle('');
      setReportSubject('');
      setReportBody('');
    }

    if (['ASSIGNED_TO_INVESTIGATION_OFFICER', 'CASE_PLAN_RETURNED'].includes(item.status)) setActiveInvestTab('CASE_PLAN');
    else if (['INVESTIGATION_IN_PROGRESS', 'REPORT_RETURNED'].includes(item.status)) setActiveInvestTab('INVESTIGATION_REPORT');
    else setActiveInvestTab('OVERVIEW');
  };

  const getDaysActive = (dateString) => {
    const diff = new Date() - new Date(dateString);
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + ' days';
  };

  const getCasePlanStatus = (item) => {
    if (item.status === 'ASSIGNED_TO_INVESTIGATION_OFFICER') return 'Drafting';
    if (item.status === 'CASE_PLAN_SUBMITTED') return 'Pending';
    if (item.status === 'CASE_PLAN_RETURNED') return 'Returned';
    if (item.status === 'CASE_PLAN_REJECTED') return 'Rejected';
    return 'Approved';
  };

  const getReportStatus = (item) => {
    if (['ASSIGNED_TO_INVESTIGATION_OFFICER', 'CASE_PLAN_SUBMITTED', 'CASE_PLAN_RETURNED', 'CASE_PLAN_REJECTED', 'INVESTIGATION_IN_PROGRESS'].includes(item.status)) return 'Not Started';
    if (item.status === 'REPORT_SUBMITTED') return 'Pending';
    if (item.status === 'REPORT_RETURNED') return 'Returned';
    if (item.status === 'REPORT_REJECTED') return 'Rejected';
    return 'Approved';
  };

  const leftWorkspaceView = (
    <div className="doi-left-workspace">
      <div className="metrics-grid-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px' }}>
        <div className={`intel-nav-card card-blue ${activeTab === 'ASSIGNED' ? 'active' : ''}`} onClick={() => {setActiveTab('ASSIGNED'); setReportsPage(1);}}>
          <div className="nav-card-main-row"><div className="nav-card-icon-container"><FolderOpen size={20} /></div><div className="nav-card-counter">{countAssigned}</div></div>
          <div className="nav-card-details"><span className="nav-card-title">Assigned Cases</span><span className="nav-card-subtitle">Needs Case Plan</span></div>
        </div>
        <div className={`intel-nav-card card-green ${activeTab === 'ACTIVE' ? 'active' : ''}`} onClick={() => {setActiveTab('ACTIVE'); setReportsPage(1);}}>
          <div className="nav-card-main-row"><div className="nav-card-icon-container"><Activity size={20} /></div><div className="nav-card-counter">{countActive}</div></div>
          <div className="nav-card-details"><span className="nav-card-title">Active</span><span className="nav-card-subtitle">Investigations</span></div>
        </div>
        <div className={`intel-nav-card card-orange ${activeTab === 'PENDING_REVIEW' ? 'active' : ''}`} onClick={() => {setActiveTab('PENDING_REVIEW'); setReportsPage(1);}}>
          <div className="nav-card-main-row"><div className="nav-card-icon-container"><FileText size={20} /></div><div className="nav-card-counter">{countPending}</div></div>
          <div className="nav-card-details"><span className="nav-card-title">Pending Review</span><span className="nav-card-subtitle">Sent to Director</span></div>
        </div>
        <div className={`intel-nav-card card-purple ${activeTab === 'COMPLETED' ? 'active' : ''}`} onClick={() => {setActiveTab('COMPLETED'); setReportsPage(1);}}>
          <div className="nav-card-main-row"><div className="nav-card-icon-container"><ShieldCheck size={20} /></div><div className="nav-card-counter">{countCompleted}</div></div>
          <div className="nav-card-details"><span className="nav-card-title">Completed</span><span className="nav-card-subtitle">Finalized</span></div>
        </div>
        <div className={`intel-nav-card ${activeTab === 'ALL_CASES' ? 'active' : ''}`} style={{ background: activeTab === 'ALL_CASES' ? '#334155' : '#475569', color: 'white', cursor: 'pointer', borderRadius: '8px', padding: '15px' }} onClick={() => { setActiveTab('ALL_CASES'); setSelectedItem(null); setReportsPage(1); }}>
          <div className="nav-card-main-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}><div className="nav-card-icon-container" style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '6px' }}><Briefcase size={20} /></div><div className="nav-card-counter" style={{ fontSize: '24px', fontWeight: 'bold' }}>{countAllCases}</div></div>
          <div className="nav-card-details" style={{ display: 'flex', flexDirection: 'column' }}><span className="nav-card-title" style={{ fontWeight: 'bold', fontSize: '13px' }}>All Cases</span><span className="nav-card-subtitle" style={{ fontSize: '11px', opacity: 0.8 }}>View Everything</span></div>
        </div>
      </div>

      <div className="table-filter-toolbar glass-panel doi-workspace-filter-bar" style={{ marginTop: '20px' }}>
        <div className="workspace-tab-filters">
           <span style={{ fontWeight: 'bold', color: '#0f172a', paddingLeft: '10px' }}>
            {activeTab === 'ASSIGNED' && 'Assigned Cases / Draft Case Plans'}
            {activeTab === 'ACTIVE' && 'Active Investigations'}
            {activeTab === 'PENDING_REVIEW' && 'Awaiting Director Review'}
            {activeTab === 'COMPLETED' && 'Completed Investigations'}
            {activeTab === 'ALL_CASES' && 'All Cases'}
           </span>
        </div>
        <div className="workspace-right-controls" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select 
            value={filterMonth} 
            onChange={(e) => setFilterMonth(e.target.value)}
            style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
          >
            <option value="All">All Months</option>
            {Array.from({length: 12}, (_, i) => (<option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('en', {month: 'long'})}</option>))}
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
            <Search size={14} className="bar-search-icon" style={{ position: 'absolute', left: '10px', top: '8px', color: '#64748b' }} />
            <input type="text" placeholder="Search references..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setReportsPage(1); }} style={{ width: '100%', padding: '6px 6px 6px 30px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
            {searchTerm && (<button type="button" style={{ position: 'absolute', right: '5px', top: '8px', border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }} onClick={() => { setSearchTerm(''); setReportsPage(1); }}><X size={12} /></button>)}
          </div>
        </div>
      </div>

      <div className="table-wrapper custom-scrollbar" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
          <table className="siids-virtual-table">
            <thead>
              <tr>
                <th>CASE REF</th>
                <th>CASE PLAN</th>
                <th>FINAL REPORT</th>
                <th>DAYS ACTIVE</th>
                <th style={{textAlign: 'center'}}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedList.length === 0 ? (
                <tr><td colSpan={5} className="table-empty-cell">No cases match the current filters.</td></tr>
              ) : (
                paginatedList.map(item => (
                  <tr key={item.id} className={`virtual-row-item ${selectedItem?.id === item.id ? 'row-selected' : ''}`} onClick={(e) => handleActionClick(e, item)}>
                    <td className="desc-cell-title">#{item.id}</td>
                    <td><span style={{ padding: '4px 8px', borderRadius: '4px', background: '#dcfce7', color: '#166534', fontSize: '11px', fontWeight: 'bold' }}>{getCasePlanStatus(item)}</span></td>
                    <td><span style={{ padding: '4px 8px', borderRadius: '4px', background: '#fef9c3', color: '#854d0e', fontSize: '11px', fontWeight: 'bold' }}>{getReportStatus(item)}</span></td>
                    <td>{getDaysActive(item.createdAt)}</td>
                    <td align="center"><button className="btn-icon" onClick={(e) => handleActionClick(e, item)} title="View Document"><Eye size={16} /></button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const rightWorkspaceView = (
    <div className="doi-right-workspace">
      {selectedItem && (() => {
        const displayCase = selectedItem;
        const displayPlan = reportsList.find(r => (r.caseId === displayCase.id || r.caseNum === displayCase.id) && r.generationType === 'CASE_PLAN');
        const displayReport = reportsList.find(r => (r.caseId === displayCase.id || r.caseNum === displayCase.id) && r.generationType !== 'CASE_PLAN');
        
        return (
          <div className="workspace-inspector-panel">
            <div className="inspector-panel-header">
              <h3>Case Dashboard: {displayCase.id}</h3>
              <button className="panel-close-trigger" onClick={() => setSelectedItem(null)}><X size={16} /></button>
            </div>
            
            <div className="inspector-tabs-nav" style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '20px', gap: '20px' }}>
              {['OVERVIEW', 'CASE_PLAN', 'INVESTIGATION_REPORT', 'EVIDENCE', 'AUDIT_TRAIL'].map(tab => {
                const disabled = tab === 'INVESTIGATION_REPORT' && (!displayReport && displayCase.status !== 'INVESTIGATION_IN_PROGRESS' && displayCase.status !== 'REPORT_RETURNED');
                return (
                  <button 
                    key={tab}
                    className={`inspector-tab-btn ${activeInvestTab === tab ? 'active' : ''}`}
                    onClick={() => !disabled && setActiveInvestTab(tab)}
                    disabled={disabled}
                    style={{ padding: '10px 0', background: 'none', border: 'none', borderBottom: activeInvestTab === tab ? '2px solid #005A9C' : '2px solid transparent', color: disabled ? '#cbd5e1' : activeInvestTab === tab ? '#005A9C' : '#64748b', fontWeight: activeInvestTab === tab ? 'bold' : 'normal', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '12px' }}
                  >
                    {tab.replace('_', ' ')}
                  </button>
                );
              })}
            </div>

            <div className="inspector-content-scrollable">
              {activeInvestTab === 'OVERVIEW' && (
                <div className="inspector-details-card">
                  <WorkflowStepper 
                    steps={['Assigned', 'Case Plan', 'In Progress', 'Report Submitted']} 
                    activeStep={
                      ['REPORT_SUBMITTED', 'REPORT_APPROVED', 'SENT_TO_AC', 'AC_APPROVED', 'AC_RETURNED', 'AC_REJECTED'].includes(displayCase.status) ? 3 :
                      ['INVESTIGATION_IN_PROGRESS', 'CASE_PLAN_APPROVED'].includes(displayCase.status) ? 2 :
                      ['CASE_PLAN_SUBMITTED', 'CASE_PLAN_RETURNED', 'CASE_PLAN_REJECTED'].includes(displayCase.status) ? 1 : 
                      0
                    } 
                  />
                  
                  <div className="detail-meta-table glass-panel" style={{ marginTop: '20px' }}>
                    <div className="meta-row"><span className="meta-lbl">Assigned Officer:</span> <strong>{INVESTIGATION_OFFICERS.find(o => o.id === displayCase.assignedTo)?.name || displayCase.assignedTo}</strong></div>
                    <div className="meta-row"><span className="meta-lbl">Status:</span> <strong><StatusBadgeSystem status={displayCase.status} /></strong></div>
                    <div className="meta-row"><span className="meta-lbl">Case Subject:</span> <strong>{displayCase.subject}</strong></div>
                    <div className="meta-row"><span className="meta-lbl">Date Initiated:</span> <strong>{new Date(displayCase.createdAt).toLocaleString()}</strong></div>
                  </div>

                  <div className="case-description-box glass-panel" style={{ marginTop: '20px' }}>
                    <h4>Initial Case Details</h4>
                    <p style={{ whiteSpace: 'pre-line' }}>{displayCase.description}</p>
                  </div>
                </div>
              )}

              {activeInvestTab === 'CASE_PLAN' && (
                <div className="case-plan-view">
                  {['ASSIGNED_TO_INVESTIGATION_OFFICER', 'CASE_PLAN_RETURNED'].includes(displayCase.status) ? (
                    <div className="edit-report-form glass-panel" style={{ padding: '20px', background: 'white' }}>
                      <h4 style={{ color: '#0f172a', margin: '0 0 15px' }}>Draft Case Plan</h4>
                      {displayCase.status === 'CASE_PLAN_RETURNED' && (
                        <div style={{ background: '#fef3c7', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #f59e0b' }}>
                          <strong style={{ color: '#b45309' }}>⚠ Returned for Correction</strong>
                          <p style={{ margin: '5px 0 0', fontSize: '13px', color: '#92400e' }}>{displayPlan?.returnReason || 'Please amend the strategy.'}</p>
                        </div>
                      )}
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        if (displayPlan) resubmitCasePlanMutation.mutate({ reportId: displayPlan.id, body: casePlanBody });
                        else submitCasePlanMutation.mutate({ caseId: displayCase.id, body: casePlanBody });
                      }}>
                        <div className="form-input-group" style={{ marginBottom: '15px' }}>
                          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>Strategy & Methodology</label>
                          <textarea required rows={10} value={casePlanBody} onChange={e => setCasePlanBody(e.target.value)} style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} placeholder="Detail the investigation scope, activities, and timeline..." />
                        </div>
                        <button type="submit" disabled={submitCasePlanMutation.isPending || resubmitCasePlanMutation.isPending} style={{ width: '100%', padding: '12px', background: '#009A44', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                          Submit Case Plan to Director
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="intelligence-pdf-preview glass-panel">
                      <div className="pdf-metadata-block">
                        <div className="pdf-meta-row"><strong>Title:</strong> <span>Case Plan for {displayCase.id}</span></div>
                        <div className="pdf-meta-row"><strong>Status:</strong> <span>{getCasePlanStatus(displayCase)}</span></div>
                      </div>
                      <div className="pdf-document-body" style={{ whiteSpace: 'pre-line' }}>
                        {displayPlan?.body || casePlanBody || 'No case plan drafted.'}
                      </div>
                      {['CASE_PLAN_SUBMITTED'].includes(displayCase.status) && (
                        <div style={{ marginTop: '20px', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <FileText size={20} color="#64748b" />
                          <span style={{ color: '#475569', fontWeight: 'bold' }}>Awaiting Director Validation</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeInvestTab === 'INVESTIGATION_REPORT' && (
                <div className="case-plan-view">
                  {['INVESTIGATION_IN_PROGRESS', 'REPORT_RETURNED'].includes(displayCase.status) ? (
                    <div className="edit-report-form glass-panel" style={{ padding: '20px', background: 'white' }}>
                      <h4 style={{ color: '#0f172a', margin: '0 0 15px' }}>Draft Final Investigation Report</h4>
                      {displayCase.status === 'REPORT_RETURNED' && (
                        <div style={{ background: '#fef3c7', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #f59e0b' }}>
                          <strong style={{ color: '#b45309' }}>⚠ Returned for Correction</strong>
                          <p style={{ margin: '5px 0 0', fontSize: '13px', color: '#92400e' }}>{displayReport?.returnReason || 'Please amend the findings.'}</p>
                        </div>
                      )}
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        if (displayReport) resubmitReportMutation.mutate({ reportId: displayReport.id, title: reportTitle, subject: reportSubject, body: reportBody });
                        else submitReportMutation.mutate({ caseId: displayCase.id, title: reportTitle, subject: reportSubject, body: reportBody });
                      }}>
                        <div className="form-input-group" style={{ marginBottom: '15px' }}>
                          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>Report Title</label>
                          <input required type="text" value={reportTitle} onChange={e => setReportTitle(e.target.value)} style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                        </div>
                        <div className="form-input-group" style={{ marginBottom: '15px' }}>
                          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>Subject</label>
                          <input required type="text" value={reportSubject} onChange={e => setReportSubject(e.target.value)} style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                        </div>
                        <div className="form-input-group" style={{ marginBottom: '15px' }}>
                          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>Findings & Conclusion</label>
                          <textarea required rows={10} value={reportBody} onChange={e => setReportBody(e.target.value)} style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                        </div>
                        <button type="submit" disabled={submitReportMutation.isPending || resubmitReportMutation.isPending} style={{ width: '100%', padding: '12px', background: '#009A44', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                          Submit Report to Director
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="intelligence-pdf-preview glass-panel">
                      <div className="pdf-metadata-block">
                        <div className="pdf-meta-row"><strong>Title:</strong> <span>{displayReport?.title || reportTitle}</span></div>
                        <div className="pdf-meta-row"><strong>Status:</strong> <span>{getReportStatus(displayCase)}</span></div>
                      </div>
                      <div className="pdf-document-body" style={{ whiteSpace: 'pre-line' }}>
                        {displayReport?.body || reportBody || 'No report drafted.'}
                      </div>
                      {['REPORT_SUBMITTED'].includes(displayCase.status) && (
                        <div style={{ marginTop: '20px', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <ShieldCheck size={20} color="#64748b" />
                          <span style={{ color: '#475569', fontWeight: 'bold' }}>Awaiting Director Signature</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {!selectedItem && (
        <div className="inspector-empty-state-card glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px' }}>
          <FolderOpen size={48} color="#cbd5e1" style={{ marginBottom: '20px' }} />
          <h3 style={{ color: '#334155', margin: '0 0 10px 0' }}>Officer Workspace</h3>
          <p style={{ color: '#64748b', maxWidth: '300px' }}>Select an assigned case from the table to draft case plans and compile investigation reports.</p>
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
    </AppShell>
  );
};

export default InvestigationOfficerDashboard;
