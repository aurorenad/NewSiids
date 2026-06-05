import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { SplitWorkspaceLayout } from '../../components/ui/SplitWorkspaceLayout';
import { StatusBadgeSystem } from '../../components/ui/StatusBadgeSystem';
import { AppShell } from '../../components/layout/AppShell';
import { 
  FileText, Route, Landmark, FileCheck, Check, 
  X, Compass, ShieldCheck, Eye, Activity, Download,
  Layers, Search, Filter, Calendar, FileSpreadsheet, UploadCloud, Clock, ChevronLeft, ChevronRight, AlertCircle, Edit, CheckSquare
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, Legend
} from 'recharts';
import { generateRRAPdf } from '../../utils/generateRRAPdf';
import './AcDashboard.css';

const DEPARTMENT_PERSONNEL = {
  'DIRECTOR_OF_INVESTIGATION': [
    { id: 't2_director', name: 'Jean de Dieu (Director of Investigation)' }
  ],
  'PROSECUTION': [
    { id: 'pros_director', name: 'Alice (Prosecution Director)' }
  ],
  'ENFORCEMENT': [
    { id: 'enf_director', name: 'Patrick (Enforcement Director)' }
  ],
  'COLLECTION': [
    { id: 'col_director', name: 'Grace (Collection Manager)' }
  ],
  'OTHER': []
};

const PIE_COLORS = ['#009A44', '#F5A800', '#1565C0', '#D32F2F'];

// Helper to mock future backend endpoint data
const useACAnalyticsData = (casesList, reportsList) => {
  return useMemo(() => {
    const baseValue = casesList.length * 500000 || 45200000;
    const approvedBase = reportsList.filter(r => r.status === 'APPROVED' || r.status === 'ROUTED').length * 400000 || 32500000;
    
    // 1. Current Year Fines by Month
    const finesByMonth = [
      { month: 'Jan', revenue: baseValue * 0.1 }, { month: 'Feb', revenue: baseValue * 0.15 },
      { month: 'Mar', revenue: baseValue * 0.18 }, { month: 'Apr', revenue: baseValue * 0.25 },
      { month: 'May', revenue: baseValue * 0.35 }, { month: 'Jun', revenue: baseValue * 0.5 },
      { month: 'Jul', revenue: baseValue * 0.6 }, { month: 'Aug', revenue: baseValue * 0.75 },
      { month: 'Sep', revenue: baseValue * 0.8 }, { month: 'Oct', revenue: baseValue * 0.85 },
      { month: 'Nov', revenue: baseValue * 0.95 }, { month: 'Dec', revenue: baseValue }
    ];

    // 2. Yearly Trend
    const finesByYear = [
      { year: '2021', revenue: baseValue * 0.4 },
      { year: '2022', revenue: baseValue * 0.6 },
      { year: '2023', revenue: baseValue * 0.85 },
      { year: '2024', revenue: baseValue * 1.1 },
      { year: '2025', revenue: baseValue * 1.3 },
      { year: '2026', revenue: baseValue }
    ];

    // 3. Case Classification
    const caseClassification = [
      { name: 'Pending Approval', value: reportsList.filter(r => r.status === 'PENDING_AC_SIGNATURE').length || 12 },
      { name: 'Pending Dispatch', value: reportsList.filter(r => r.status === 'APPROVED').length || 8 },
      { name: 'Routed Cases', value: reportsList.filter(r => r.status === 'ROUTED').length || 24 }
    ];

    return {
      totalPenaltiesGenerated: baseValue,
      totalPenaltiesApproved: approvedBase,
      pendingPenalties: baseValue - approvedBase,
      avgProcessingTime: `${Math.max(2, Math.floor(casesList.length / 5))} Days`,
      routeChartData: [
        { name: 'Investigation', count: casesList.filter(c => c.routedTo === 'DIRECTOR_OF_INVESTIGATION').length || 15 },
        { name: 'Prosecution', count: 5 },
        { name: 'Enforcement', count: 8 },
        { name: 'Collection', count: 3 }
      ],
      investigationWorkload: [
        { name: 'Off. Kalisa', cases: Math.floor(casesList.length * 0.4) || 12 },
        { name: 'Off. Mugisha', cases: Math.floor(casesList.length * 0.3) || 9 },
        { name: 'Off. Uwera', cases: Math.floor(casesList.length * 0.2) || 6 }
      ],
      returnedVsApproved: [
        { name: 'Approved', value: reportsList.filter(r => r.status === 'APPROVED' || r.status === 'ROUTED').length || 85 },
        { name: 'Returned', value: reportsList.filter(r => r.status === 'REPORT_RETURNED').length || 15 }
      ],
      finesByMonth,
      finesByYear,
      caseClassification
    };
  }, [casesList, reportsList]);
};

export const AcDashboard = () => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();

  const getDescriptiveState = (status, routedTo) => {
    if (routedTo && routedTo !== 'PENDING') {
      return `Routed to ${routedTo.replace(/_/g, ' ')}`;
    }
    switch (status) {
      case 'ASSIGNED': return 'Surveillance Intake Ready for Routing';
      case 'PENDING_AC_SIGNATURE': return 'Report Submitted by Director Intelligence';
      case 'REPORT_RETURNED': return 'Report Returned to Director Intelligence';
      case 'REJECTED': return 'Report Permanently Rejected';
      case 'FINALISED': return 'Report Co-Signed & Finalised';
      default: return status ? status.replace(/_/g, ' ') : '';
    }
  };
  
  const isReportsView = location.pathname === '/ac/analytics';

  // Workspace State
  const [activeTab, setActiveTab] = useState('INCOMING_REPORTS'); 
  const [selectedItem, setSelectedItem] = useState(null);
  const [inspectorTab, setInspectorTab] = useState('DOCUMENT');
  const [hubSearch, setHubSearch] = useState('');
  const [hubFilterMonth, setHubFilterMonth] = useState('All');
  const [hubFilterYear, setHubFilterYear] = useState('All');
  const [hubRoutingFilter, setHubRoutingFilter] = useState('All Statuses');
  const [hubSourceFilter, setHubSourceFilter] = useState('All Sources');
  
  // Modals & Action State
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [returnReasonText, setReturnReasonText] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const [routeForm, setRouteForm] = useState({
    routedTo: 'DIRECTOR_OF_INVESTIGATION',
    departmentName: '',
    assignedPersonnel: ''
  });
  
  // Pagination State
  const [workspacePage, setWorkspacePage] = useState(1);
  const [workspacePageSize, setWorkspacePageSize] = useState(10);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerPageSize, setLedgerPageSize] = useState(10);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerSelection, setLedgerSelection] = useState([]);
  const [ledgerFilterMonth, setLedgerFilterMonth] = useState('All');
  const [ledgerFilterYear, setLedgerFilterYear] = useState('All');
  const [ledgerRoutingFilter, setLedgerRoutingFilter] = useState('All Statuses');
  const [ledgerSourceFilter, setLedgerSourceFilter] = useState('All Sources');

  // Data Fetching
  const { data: casesResponse } = useQuery({
    queryKey: ['cases'],
    queryFn: () => apiClient.get('/cases').catch(() => ({ data: { data: [] } }))
  });
  const { data: reportsResponse } = useQuery({
    queryKey: ['reports'],
    queryFn: () => apiClient.get('/reports')
  });

  const casesList = casesResponse?.data?.data || [];
  const reportsList = reportsResponse?.data?.data || [];

  const incomingReports = reportsList.filter(r => r.status === 'PENDING_AC_SIGNATURE');
  const approvedReports = reportsList.filter(r => r.status === 'APPROVED');
  const routedReports = reportsList.filter(r => r.status === 'ROUTED');

  const ledgerData = casesList.filter(c => {
    let matchesSearch = true;
    if (ledgerSearch) {
      matchesSearch = c.id.toString().includes(ledgerSearch) || 
                      c.subject?.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                      c.tin?.toString().includes(ledgerSearch);
    }
    
    let matchesTime = true;
    const itemDate = new Date(c.createdAt);
    if (ledgerFilterMonth !== 'All') {
       matchesTime = matchesTime && (itemDate.getMonth() + 1).toString() === ledgerFilterMonth;
    }
    if (ledgerFilterYear !== 'All') {
       matchesTime = matchesTime && itemDate.getFullYear().toString() === ledgerFilterYear;
    }

    let matchesStatus = true;
    if (ledgerRoutingFilter === 'Routed') matchesStatus = !!c.routedTo && c.routedTo !== 'PENDING';
    else if (ledgerRoutingFilter === 'Unrouted') matchesStatus = !c.routedTo || c.routedTo === 'PENDING';

    let matchesSource = true;
    if (ledgerSourceFilter === 'Intelligence') matchesSource = c.referringDepartment?.includes('Intelligence') || c.id.includes('INTEL');
    else if (ledgerSourceFilter === 'Enforcement') matchesSource = c.referringDepartment?.includes('Enforcement');

    return matchesSearch && matchesTime && matchesStatus && matchesSource;
  });

  const analytics = useACAnalyticsData(casesList, reportsList);

  const selectedIsPendingACAction = selectedItem?.status === 'PENDING_AC_SIGNATURE';

  // Mutations
  const routeCaseMutation = useMutation({
    mutationFn: ({ id, payload }) => apiClient.patch(`/cases/${id}/route`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['cases']);
      setSelectedItem(null);
      setShowRouteModal(false);
      showToast('Case routed successfully.');
    }
  });

  const signReportMutation = useMutation({
    mutationFn: (reportId) => apiClient.post(`/reports/${reportId}/sign`, {
      signerRole: 'AC', 
      signerName: 'AC Ronald Niwenshuti'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['reports']);
      setSelectedItem(null);
      showToast('Report successfully co-signed and finalized.');
    }
  });

  const returnReportMutation = useMutation({
    mutationFn: (payload) => apiClient.post(`/reports/${payload.id}/return`, {
      returnToEmployeeId: 'DIRECTOR_OF_INTELLIGENCE',
      returnReason: payload.reason
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['reports']);
      setReturnDialogOpen(false);
      setSelectedItem(null);
      showToast('Report returned to Director of Intelligence for corrections.');
    }
  });

  const rejectReportMutation = useMutation({
    mutationFn: (payload) => apiClient.post(`/reports/${payload.id}/reject`, {
      rejectionReason: payload.reason
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['reports']);
      setRejectDialogOpen(false);
      setSelectedItem(null);
      showToast('Report permanently rejected.');
    }
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleRouteSubmit = (e) => {
    e.preventDefault();
    routeCaseMutation.mutate({ id: selectedItem.caseId || selectedItem.id, payload: routeForm });
  };

  const handleSignReport = (id) => {
    signReportMutation.mutate(id);
  };

  const handleReturnSubmit = (e) => {
    e.preventDefault();
    if (!returnReasonText.trim()) return;
    returnReportMutation.mutate({ id: selectedItem.id, reason: returnReasonText });
  };

  const handleRejectSubmit = (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) return;
    rejectReportMutation.mutate({ id: selectedItem.id, reason: rejectionReason });
  };

  const handleDownloadAttachment = (attachment) => {
    const content = `[CONFIDENTIAL EVIDENCE]\n\nType: ${attachment.type}\nFile Name: ${attachment.name}\nSize: ${attachment.size}\n\n(Simulated binary content)`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = attachment.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePdfExport = () => {
    generateRRAPdf({
      reportId:       selectedItem.id,
      caseRef:        selectedItem.caseNum || `CASE-${selectedItem.caseId || 'N/A'}`,
      title:          selectedItem.title,
      subject:        selectedItem.subject,
      taxpayerName:   selectedItem.taxpayerName || selectedItem.createdByName || '-',
      tin:            selectedItem.tin || '-',
      dateCompiled:   new Date(selectedItem.createdAt).toLocaleDateString('en-RW', {
                        year: 'numeric', month: 'long', day: 'numeric'
                      }),
      preparedBy:     selectedItem.createdByName || 'Intelligence Officer',
      preparedByRole: 'Intelligence Officer',
      status:         selectedItem.status || '',
      body:           selectedItem.body || '',
      sections:       selectedItem.sections || [],
      attachments:    selectedItem.attachments || [],
      signatures:     selectedItem.signatures || []
    });
  };

  const exportLedgerToCsv = () => {
    const dataToExport = ledgerSelection.length > 0 
      ? ledgerData.filter(c => ledgerSelection.includes(c.id))
      : ledgerData;

    const headers = ["Reference ID", "Subject", "Date Created", "Status", "Routed To"];
    const csvRows = dataToExport.map(c => [
      c.id, `"${c.subject}"`, new Date(c.createdAt).toLocaleDateString(), c.status, c.routedTo || 'N/A'
    ].join(","));

    const csvContent = "\uFEFF" + [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ac_operational_ledger_${new Date().getTime()}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  // Pagination Helper
  const getPaginatedData = (data, page, size) => data.slice((page - 1) * size, page * size);
  const renderPagination = (currentPage, setPage, pageSize, setPageSize, totalItems) => {
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    return (
      <div className="siids-pagination-footer glass-panel">
        <span className="pagination-info">Showing {totalItems === 0 ? 0 : startIndex + 1} to {endIndex} of {totalItems} entries</span>
        <div className="pagination-controls">
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="pagination-size-select">
            <option value={5}>5 per page</option><option value={10}>10 per page</option><option value={20}>20 per page</option>
          </select>
          <div className="page-nav-buttons">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft size={16} /></button>
            <span className="page-indicator">Page {currentPage} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>
    );
  };

  // --- VIEWS ---
  
  const leftWorkspaceView = (
    <div className="ac-left-workspace">
      <div className="intel-nav-cards-row">
        <div className={`intel-nav-card card-blue ${activeTab === 'INCOMING_REPORTS' ? 'active' : ''}`} onClick={() => { setActiveTab('INCOMING_REPORTS'); setSelectedItem(null); setWorkspacePage(1); }}>
          <div className="nav-card-main-row"><div className="nav-card-icon-container"><Route size={20} /></div><div className="nav-card-counter">{incomingReports.length}</div></div>
          <div className="nav-card-details"><span className="nav-card-title">Incoming Reports</span><span className="nav-card-subtitle">Submitted by Directors of Intelligence</span></div>
          <div className="nav-card-metrics-row"><span className="nav-card-metric">{incomingReports.length} pending action</span></div>
        </div>

        <div className={`intel-nav-card card-purple ${activeTab === 'APPROVED_REPORTS' ? 'active' : ''}`} onClick={() => { setActiveTab('APPROVED_REPORTS'); setSelectedItem(null); setWorkspacePage(1); }}>
          <div className="nav-card-main-row"><div className="nav-card-icon-container"><FileCheck size={20} /></div><div className="nav-card-counter">{approvedReports.length}</div></div>
          <div className="nav-card-details"><span className="nav-card-title">Approved Reports</span><span className="nav-card-subtitle">Pending dispatch to departments</span></div>
          <div className="nav-card-metrics-row"><span className="nav-card-metric">{approvedReports.length} approved reports</span></div>
        </div>

        <div className={`intel-nav-card card-green ${activeTab === 'ROUTED_REPORTS' ? 'active' : ''}`} onClick={() => { setActiveTab('ROUTED_REPORTS'); setSelectedItem(null); setWorkspacePage(1); }}>
          <div className="nav-card-main-row"><div className="nav-card-icon-container"><Compass size={20} /></div><div className="nav-card-counter">{routedReports.length}</div></div>
          <div className="nav-card-details"><span className="nav-card-title">Routed Cases</span><span className="nav-card-subtitle">Sent to Investigation or other departments</span></div>
          <div className="nav-card-metrics-row"><span className="nav-card-metric">{routedReports.length} dispatched cases</span></div>
        </div>
      </div>

      <div className="table-wrapper glass-panel">
        <div className="ledger-filters-bar" style={{ borderBottom: '1px solid #e2e8f0', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', padding: '16px', background: 'transparent' }}>
          <div className="table-dropdown-filters" style={{ display: 'flex', gap: '8px' }}>
            <select className="log-filter-select" style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} value={hubFilterMonth} onChange={e => setHubFilterMonth(e.target.value)}>
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
            <select className="log-filter-select" style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} value={hubFilterYear} onChange={e => setHubFilterYear(e.target.value)}>
              <option value="All">All Years</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>
          <div className="table-dropdown-filters" style={{ display: 'flex', gap: '8px' }}>
            <select className="log-filter-select" style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} value={hubSourceFilter} onChange={e => setHubSourceFilter(e.target.value)}>
              <option value="All Sources">All Sources</option>
              <option value="TAXPAYER_PORTAL">Taxpayer Portal</option>
              <option value="WHISTLEBLOWER">Whistleblower</option>
              <option value="INTERNAL_AUDIT">Internal Audit</option>
            </select>
            <select className="log-filter-select" style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} value={hubRoutingFilter} onChange={e => setHubRoutingFilter(e.target.value)}>
              <option value="All Statuses">All Statuses</option>
              <option value="PENDING">Pending Action</option>
              <option value="ROUTED">Routed / Dispatched</option>
            </select>
          </div>
          <div className="ledger-search-box">
            <Search size={14} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={hubSearch}
              onChange={(e) => { setHubSearch(e.target.value); setWorkspacePage(1); }}
            />
          </div>
        </div>
        <div className="scrollable-table-container">
          <table className="siids-virtual-table">
            <thead>
              <tr>
                <th>Operational ID</th>
                <th>Lead Personnel</th>
                <th>Workflow State</th>
                <th>Intelligence Summary</th>
                <th>Critical Actions</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                let data = activeTab === 'INCOMING_REPORTS' ? incomingReports : activeTab === 'APPROVED_REPORTS' ? approvedReports : routedReports;
                
                data = data.filter(item => {
                  let matchesSearch = true;
                  if (hubSearch) {
                    matchesSearch = item.id?.toString().includes(hubSearch) || 
                                    item.subject?.toLowerCase().includes(hubSearch.toLowerCase()) ||
                                    item.title?.toLowerCase().includes(hubSearch.toLowerCase());
                  }
                  
                  let matchesTime = true;
                  const itemDate = new Date(item.createdAt);
                  if (hubFilterMonth !== 'All') {
                     matchesTime = matchesTime && (itemDate.getMonth() + 1).toString() === hubFilterMonth;
                  }
                  if (hubFilterYear !== 'All') {
                     matchesTime = matchesTime && itemDate.getFullYear().toString() === hubFilterYear;
                  }

                  let matchesStatus = true;
                  if (hubRoutingFilter !== 'All Statuses') {
                    if (hubRoutingFilter === 'PENDING') matchesStatus = item.status === 'PENDING_AC_ACTION';
                    else matchesStatus = item.status === hubRoutingFilter;
                  }

                  let matchesSource = true;
                  if (hubSourceFilter !== 'All Sources') {
                    matchesSource = item.source === hubSourceFilter;
                  }

                  return matchesSearch && matchesTime && matchesStatus && matchesSource;
                });

                const paginated = getPaginatedData(data, workspacePage, workspacePageSize);
                
                if (data.length === 0) return <tr><td colSpan={5} className="table-empty-cell">No records found.</td></tr>;

                return paginated.map(item => (
                  <tr key={item.id} className={`virtual-row-item ${selectedItem?.id === item.id ? 'row-selected' : ''}`} onClick={() => setSelectedItem(item)}>
                    <td className="desc-cell-title">{item.id}</td>
                    <td>{item.createdByName || item.createdBy || 'Intelligence Officer'}</td>
                    <td><div className="table-status-pill-wrapper"><StatusBadgeSystem status={item.status} labelOverride={getDescriptiveState(item.status, item.routedTo)} /></div></td>
                    <td style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.subject || item.title}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button className="icon-action-btn" onClick={() => setSelectedItem(item)}>
                        {activeTab === 'APPROVED_REPORTS' ? <FileText size={16} /> : <Eye size={16} />}
                        <span style={{ fontSize: '11px', marginLeft: '4px' }}>View</span>
                      </button>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
        {renderPagination(workspacePage, setWorkspacePage, workspacePageSize, setWorkspacePageSize, 
          activeTab === 'INCOMING_REPORTS' ? incomingReports.length : activeTab === 'APPROVED_REPORTS' ? approvedReports.length : routedReports.length
        )}
      </div>
    </div>
  );

  const rightWorkspaceView = (
    <div className="ac-right-workspace">
      {selectedItem && (
        <div className="workspace-inspector-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="inspector-panel-header">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                {activeTab === 'INCOMING_REPORTS' ? `CASE-${selectedItem.id}` : `REPORT-${selectedItem.id}`}
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
                    {activeTab === 'INCOMING_REPORTS' && (
                      <div className="action-buttons-group">
                        <button 
                          type="button"
                          className="btn-action-sign-report" 
                          onClick={() => handleSignReport(selectedItem.id)}
                        >
                          <Check size={14} />
                          <span>Sign &amp; Approve</span>
                        </button>

                        <button 
                          type="button"
                          className="btn-action-reject-trigger"
                          onClick={() => { setRejectionReason(''); setRejectDialogOpen(true); }}
                        >
                          <X size={14} />
                          <span>Reject</span>
                        </button>

                        <button 
                          type="button"
                          className="btn-action-return-trigger"
                          onClick={() => { setReturnReasonText(''); setReturnDialogOpen(true); }}
                        >
                          <AlertCircle size={14} />
                          <span>Return for Correction</span>
                        </button>
                      </div>
                    )}

                    {activeTab === 'APPROVED_REPORTS' && (
                      <div style={{ marginTop: '20px' }}>
                        {!showRouteModal ? (
                          <button className="btn-action-route-trigger" onClick={() => setShowRouteModal(true)}>
                            <Compass size={14} />
                            <span>Route Case to External Department</span>
                          </button>
                        ) : (
                          <form onSubmit={handleRouteSubmit} className="route-selection-panel glass-panel">
                            <h4>Select Routing Destination</h4>
                            <div className="form-input-group">
                              <label>Target Department</label>
                              <select value={routeForm.routedTo} onChange={(e) => setRouteForm({ ...routeForm, routedTo: e.target.value, assignedPersonnel: '' })}>
                                <option value="DIRECTOR_OF_INVESTIGATION">Director of Investigation (T2)</option>
                                <option value="PROSECUTION">Prosecution Division</option>
                                <option value="ENFORCEMENT">Enforcement Division</option>
                                <option value="COLLECTION">Collection Division</option>
                                <option value="OTHER">Other Department</option>
                              </select>
                            </div>
                            {routeForm.routedTo === 'OTHER' && (
                              <div className="form-input-group" style={{ marginTop: '12px' }}>
                                <label>Department Name</label>
                                <input type="text" required placeholder="Enter department name" value={routeForm.departmentName} onChange={(e) => setRouteForm({ ...routeForm, departmentName: e.target.value })} />
                              </div>
                            )}
                            {DEPARTMENT_PERSONNEL[routeForm.routedTo] && DEPARTMENT_PERSONNEL[routeForm.routedTo].length > 0 && (
                              <div className="form-input-group" style={{ marginTop: '12px' }}>
                                <label>Target Personnel Assignee</label>
                                <select required value={routeForm.assignedPersonnel} onChange={(e) => setRouteForm({ ...routeForm, assignedPersonnel: e.target.value })}>
                                  <option value="" disabled>Select Director / Assignee</option>
                                  {DEPARTMENT_PERSONNEL[routeForm.routedTo].map(person => (
                                    <option key={person.id} value={person.name}>{person.name}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                            <div className="action-form-buttons" style={{ marginTop: '16px' }}>
                              <button type="submit" className="btn-form-confirm">Confirm Dispatch</button>
                              <button type="button" className="btn-form-cancel" onClick={() => setShowRouteModal(false)}>Cancel</button>
                            </div>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
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
  const reportsMetricsView = (
    <div className="reports-dashboard-container ac-reports-metrics-page glass-panel">
      <div className="analytics-header-row">
        <h2 className="analytics-page-title">Command Operational Analytics</h2>
        <span className="analytics-disclaimer-badge"><AlertCircle size={14} /> Metrics represent operational indications, not audited financial figures.</span>
      </div>
      
      <div className="analytics-charts-grid">
        <div className="chart-panel">
          <h3>Fines &amp; Penalties (Current Year)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={analytics.finesByMonth} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="month" stroke="#64748B" fontSize={11} />
              <YAxis stroke="#64748B" fontSize={11} tickFormatter={(val) => `${val/1000000}M`} />
              <Tooltip formatter={(val) => `${(val/1000000).toFixed(1)}M RWF`} />
              <Area type="monotone" dataKey="revenue" stroke="#009A44" fill="#009A44" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-panel">
          <h3>Fines &amp; Penalties (Yearly Trend)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={analytics.finesByYear} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="year" stroke="#64748B" fontSize={11} />
              <YAxis stroke="#64748B" fontSize={11} tickFormatter={(val) => `${val/1000000}M`} />
              <Tooltip formatter={(val) => `${(val/1000000).toFixed(1)}M RWF`} />
              <Area type="monotone" dataKey="revenue" stroke="#2563EB" fill="#2563EB" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-panel">
          <h3>Case Classification by State</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={analytics.caseClassification} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
                {analytics.caseClassification.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

      </div>

      <div className="reports-log-card">
        <div className="log-card-header">
          <div className="header-titles">
            <h3>Operational Cases & Reports Ledger</h3>
            <span>Comprehensive record of intelligence routing and actions</span>
          </div>
          <button className="btn-export-excel" onClick={exportLedgerToCsv}>
            <FileSpreadsheet size={16} /> Export Selected to Excel
          </button>
        </div>

        <div className="ledger-filters-bar">
          <div className="table-dropdown-filters" style={{ display: 'flex', gap: '8px' }}>
            <select className="log-filter-select" style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} value={ledgerFilterMonth} onChange={e => setLedgerFilterMonth(e.target.value)}>
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
            <select className="log-filter-select" style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} value={ledgerFilterYear} onChange={e => setLedgerFilterYear(e.target.value)}>
              <option value="All">All Years</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>
          <div className="table-dropdown-filters" style={{ display: 'flex', gap: '8px' }}>
            <select className="log-filter-select" style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} value={ledgerSourceFilter} onChange={e => setLedgerSourceFilter(e.target.value)}>
              <option value="All Sources">All Sources</option>
              <option value="Intelligence">Intelligence Dept</option>
              <option value="Enforcement">Enforcement Dept</option>
            </select>
            <select className="log-filter-select" style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} value={ledgerRoutingFilter} onChange={e => setLedgerRoutingFilter(e.target.value)}>
              <option value="All Statuses">All Statuses</option>
              <option value="Unrouted">Pending Routing</option>
              <option value="Routed">Routed to Investigation</option>
            </select>
          </div>
          <div className="ledger-search-box">
            <Search size={14} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search by ID, TIN, or Subject..." 
              value={ledgerSearch}
              onChange={(e) => { setLedgerSearch(e.target.value); setLedgerPage(1); }}
            />
          </div>
        </div>

        <div className="reports-log-table-wrapper custom-scrollbar">
          <table className="rra-ledger-table">
            <thead>
              <tr>
                <th width="40">
                  <input 
                    type="checkbox" 
                    onChange={(e) => setLedgerSelection(e.target.checked ? ledgerData.map(c => c.id) : [])}
                    checked={ledgerData.length > 0 && ledgerSelection.length === ledgerData.length}
                  />
                </th>
                <th>Reference ID</th>
                <th>Subject</th>
                <th>Date</th>
                <th>Status</th>
                <th>Routed To</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getPaginatedData(ledgerData, ledgerPage, ledgerPageSize).length === 0 ? (
                <tr><td colSpan={7} className="table-empty-cell">No records match your search.</td></tr>
              ) : (
                getPaginatedData(ledgerData, ledgerPage, ledgerPageSize).map(item => (
                  <tr key={item.id} className={ledgerSelection.includes(item.id) ? 'row-selected' : ''}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={ledgerSelection.includes(item.id)}
                        onChange={(e) => {
                          if (e.target.checked) setLedgerSelection([...ledgerSelection, item.id]);
                          else setLedgerSelection(ledgerSelection.filter(id => id !== item.id));
                        }}
                      />
                    </td>
                    <td className="desc-cell-title">{item.id}</td>
                    <td>{item.subject}</td>
                    <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td><div className="table-status-pill-wrapper"><StatusBadgeSystem status={item.status} /></div></td>
                    <td>{item.routedTo ? item.routedTo.replace(/_/g, ' ') : '-'}</td>
                    <td>
                      <button className="icon-action-btn" title="View Case" onClick={() => { navigate('/ac'); setSelectedItem(item); }}>
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {renderPagination(ledgerPage, setLedgerPage, ledgerPageSize, setLedgerPageSize, ledgerData.length)}
      </div>
    </div>
  );

  return (
    <AppShell>
      {/* Toast Alert Indicator */}
      {toastMessage && (
        <div className="toast-card toast-success glass-panel" style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 }}>
          <div className="toast-body">
            <span className="toast-icon"><CheckSquare size={16} /></span>
            <p className="toast-text" style={{ fontSize: '12px', margin: 0 }}>{toastMessage}</p>
          </div>
        </div>
      )}

      {isReportsView ? reportsMetricsView : (
        <SplitWorkspaceLayout 
          leftPane={leftWorkspaceView} 
          rightPane={rightWorkspaceView} 
          isItemSelected={!!selectedItem} 
        />
      )}

      {/* Reject Dialog Overlay */}
      {rejectDialogOpen && (
        <div className="modal-backdrop-overlay" onClick={() => setRejectDialogOpen(false)}>
          <div className="modal-content-container glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Reject Intelligence Report</h3>
              <button className="btn-modal-close" onClick={() => setRejectDialogOpen(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleRejectSubmit} className="modal-form-wrapper">
              <p className="modal-description-text">
                Permanent rejection halts the workflow. Provide clear justification for this action.
              </p>
              <div className="form-input-group">
                <label>Rejection Justification *</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="State the reason for rejecting this report..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
              <div className="modal-action-buttons">
                <button type="button" className="btn-form-cancel" onClick={() => setRejectDialogOpen(false)}>Cancel</button>
                <button type="submit" className="btn-form-confirm btn-danger">Confirm Rejection</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Dialog Overlay */}
      {returnDialogOpen && (
        <div className="modal-backdrop-overlay" onClick={() => setReturnDialogOpen(false)}>
          <div className="modal-content-container glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Return Intelligence Report</h3>
              <button className="btn-modal-close" onClick={() => setReturnDialogOpen(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleReturnSubmit} className="modal-form-wrapper">
              <p className="modal-description-text">
                Returning this report to the Director of Intelligence for mandatory corrections before co-signing.
              </p>
              <div className="form-input-group">
                <label>Correction Instructions *</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Provide explicit instructions for the Director to correct..."
                  value={returnReasonText}
                  onChange={(e) => setReturnReasonText(e.target.value)}
                />
              </div>
              <div className="modal-action-buttons">
                <button type="button" className="btn-form-cancel" onClick={() => setReturnDialogOpen(false)}>Cancel</button>
                <button type="submit" className="btn-form-confirm btn-warning">Confirm Return</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default AcDashboard;

