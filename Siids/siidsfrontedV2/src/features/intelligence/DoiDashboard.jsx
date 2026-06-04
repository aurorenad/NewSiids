import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { SplitWorkspaceLayout } from '../../components/ui/SplitWorkspaceLayout';
import { GlassMetricCard } from '../../components/ui/GlassMetricCard';
import { TimelineActivityFeed } from '../../components/ui/TimelineActivityFeed';
import { AppShell } from '../../components/layout/AppShell';
import { 
  FileText, ShieldCheck, Edit, Check, X, 
  Layers, Search, FileUp, Sparkles, Filter,
  Reply, Eye, ArrowUpDown, ChevronLeft, ChevronRight, Download, BarChart2,
  AlertTriangle, CheckSquare, ClipboardCheck, Trash2, Calendar,
  CheckCircle, TrendingUp, TrendingDown, ExternalLink
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { generateRRAPdf } from '../../utils/generateRRAPdf';
import './DoiDashboard.css';

export const DoiDashboard = () => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  
  const isReportsView = location.pathname === '/doi/reports';

  // Workspace active tab filter: ALL | PENDING | REVIEWED | SENT_TO_AC
  const [activeTab, setActiveTab] = useState('ALL');
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [workspaceTimeframe, setWorkspaceTimeframe] = useState('ALL'); // ALL | WEEK | MONTH
  // Pagination states
  const [reportsPage, setReportsPage] = useState(1);
  const [reportsPageSize, setReportsPageSize] = useState(10);

  // Edit/Modify draft state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', subject: '', body: '', reason: '' });
  const [inspectorTab, setInspectorTab] = useState('DOCUMENT'); // DOCUMENT | CASE_AUDIT | REVISIONS

  // Dialog/Modal states
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedReportForAction, setSelectedReportForAction] = useState(null);

  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnType, setReturnType] = useState('creator'); // creator | employeeId
  const [returnEmployeeId, setReturnEmployeeId] = useState('');
  const [returnReasonText, setReturnReasonText] = useState('');
  const [returnAttachment, setReturnAttachment] = useState(null);

  // Reports Ledger page states (reports view only)
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerFilterType, setLedgerFilterType] = useState('ALL');
  const [ledgerFilterStatus, setLedgerFilterStatus] = useState('ALL');
  const [filterMonth, setFilterMonth] = useState('All');
  const [filterYear, setFilterYear] = useState('All');
  const [specificDateFilter, setSpecificDateFilter] = useState('');
  const [selectedReportIds, setSelectedReportIds] = useState([]);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerPageSize, setLedgerPageSize] = useState(10);
  const [previewModalReport, setPreviewModalReport] = useState(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState(null);
  const triggerToast = (msg, duration = 3000) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), duration);
  };
  // Fetch Reports
  const { data: reportsResponse, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => apiClient.get('/reports')
  });
  const reportsList = reportsResponse?.data?.data || [];

  // Fetch Cases
  const { data: casesResponse } = useQuery({
    queryKey: ['cases'],
    queryFn: () => apiClient.get('/cases')
  });
  const casesList = casesResponse?.data?.data || [];

  // Filter reports for workspace (/doi)
  const filteredWorkspaceReports = reportsList.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.toString().includes(searchTerm) ||
      (r.caseNum || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.tin || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.taxpayerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.createdByName || '').toLowerCase().includes(searchTerm.toLowerCase());

    let matchesTab = true;
    if (activeTab === 'PENDING') {
      matchesTab = r.status === 'PENDING_DIRECTOR_SIGNATURE' || r.status === 'REPORT_SUBMITTED_TO_DIRECTOR';
    } else if (activeTab === 'REVIEWED') {
      matchesTab = r.status === 'FINALISED' || r.status === 'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER' || r.status === 'REPORT_REJECTED_BY_DIRECTOR';
    } else if (activeTab === 'SENT_TO_AC') {
      matchesTab = r.status === 'PENDING_AC_SIGNATURE';
    }

    let matchesTimeframe = true;
    if (workspaceTimeframe !== 'ALL') {
      const reportDate = new Date(r.createdAt);
      const now = new Date();
      if (workspaceTimeframe === 'WEEK') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesTimeframe = reportDate >= oneWeekAgo;
      } else if (workspaceTimeframe === 'MONTH') {
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesTimeframe = reportDate >= oneMonthAgo;
      }
    }
    
    return matchesSearch && matchesTab && matchesTimeframe;
  });

  // Pagination bounds calculation for workspace table
  const workspaceTotalPages = Math.max(1, Math.ceil(filteredWorkspaceReports.length / reportsPageSize));
  const activeWorkspacePage = Math.min(reportsPage, workspaceTotalPages);
  const paginatedWorkspaceReports = filteredWorkspaceReports.slice(
    (activeWorkspacePage - 1) * reportsPageSize,
    (activeWorkspacePage - 1) * reportsPageSize + reportsPageSize
  );

  // Filter reports for ledger (/doi/reports)
  const filteredLedgerReports = reportsList.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(ledgerSearch.toLowerCase()) || 
      r.id.toString().includes(ledgerSearch) ||
      (r.caseNum || '').toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      (r.tin || '').toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      (r.taxpayerName || '').toLowerCase().includes(ledgerSearch.toLowerCase());

    const matchesType = ledgerFilterType === 'ALL' || (r.taxType === ledgerFilterType);
    
    let matchesStatus = true;
    if (ledgerFilterStatus !== 'ALL') {
      if (ledgerFilterStatus === 'Approved') matchesStatus = r.status === 'FINALISED';
      else if (ledgerFilterStatus === 'Rejected') matchesStatus = r.status === 'REPORT_REJECTED_BY_DIRECTOR';
      else if (ledgerFilterStatus === 'Returned') matchesStatus = r.status === 'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER';
      else if (ledgerFilterStatus === 'Pending') matchesStatus = r.status === 'PENDING_DIRECTOR_SIGNATURE' || r.status === 'REPORT_SUBMITTED_TO_DIRECTOR' || r.status === 'PENDING_AC_SIGNATURE';
    }

    let matchesTimeframe = true;
    const reportDate = new Date(r.createdAt);
    if (filterMonth !== 'All') {
      matchesTimeframe = matchesTimeframe && (reportDate.getMonth() + 1).toString() === filterMonth;
    }
    if (filterYear !== 'All') {
      matchesTimeframe = matchesTimeframe && reportDate.getFullYear().toString() === filterYear;
    }

    const matchesDate = !specificDateFilter || (r.createdAt && r.createdAt.startsWith(specificDateFilter));

    return matchesSearch && matchesType && matchesStatus && matchesTimeframe && matchesDate;
  });

  // Pagination bounds for ledger table
  const ledgerTotalPages = Math.max(1, Math.ceil(filteredLedgerReports.length / ledgerPageSize));
  const activeLedgerPage = Math.min(ledgerPage, ledgerTotalPages);
  const paginatedLedgerReports = filteredLedgerReports.slice(
    (activeLedgerPage - 1) * ledgerPageSize,
    (activeLedgerPage - 1) * ledgerPageSize + ledgerPageSize
  );

  // KPI Calculations
  const reportsToSign = reportsList.filter(r => r.status === 'PENDING_DIRECTOR_SIGNATURE' || r.status === 'REPORT_SUBMITTED_TO_DIRECTOR').length;
  const dirSignatureCount = reportsList.filter(r => r.status === 'PENDING_DIRECTOR_SIGNATURE').length;
  const submittedToDirCount = reportsList.filter(r => r.status === 'REPORT_SUBMITTED_TO_DIRECTOR').length;
  const finalizedCount = reportsList.filter(r => r.status === 'FINALISED').length;
  const sentToAcCount = reportsList.filter(r => r.status === 'PENDING_AC_SIGNATURE').length;
  const reviewedCount = reportsList.filter(r => r.status === 'FINALISED' || r.status === 'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER' || r.status === 'REPORT_REJECTED_BY_DIRECTOR').length;
  const returnedCount = reportsList.filter(r => r.status === 'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER').length;
  const rejectedCount = reportsList.filter(r => r.status === 'REPORT_REJECTED_BY_DIRECTOR').length;
  const autoGeneratedCount = reportsList.filter(r => r.generationType === 'AUTO_GENERATED').length;

  // ─── Logical State Management for Selected Item Actions ───────────────────
  // A report can only be actioned (Approve / Reject / Return / Modify) when it
  // is sitting in the director's inbox awaiting their decision.
  // Reports already forwarded to AC or already in a terminal state must be locked.
  const selectedIsPendingDirectorAction = !!selectedItem && (
    selectedItem.status === 'PENDING_DIRECTOR_SIGNATURE' ||
    selectedItem.status === 'REPORT_SUBMITTED_TO_DIRECTOR'
  );
  const selectedIsLockedForAction = !!selectedItem && (
    selectedItem.status === 'PENDING_AC_SIGNATURE' ||
    selectedItem.status === 'FINALISED' ||
    selectedItem.status === 'REPORT_REJECTED_BY_DIRECTOR' ||
    selectedItem.status === 'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER'
  );
  // Lock label shown inside the inspector panel when actions are disabled
  const getActionLockedReason = () => {
    if (!selectedItem) return '';
    if (selectedItem.status === 'PENDING_AC_SIGNATURE') return 'This report has already been forwarded to the Assistant Commissioner. No further actions can be taken until AC completes their review.';
    if (selectedItem.status === 'FINALISED') return 'This report has been finalised and signed. The document is now locked.';
    if (selectedItem.status === 'REPORT_REJECTED_BY_DIRECTOR') return 'This report was rejected and returned. Awaiting officer revisions.';
    if (selectedItem.status === 'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER') return 'This report was returned to the officer for corrections. No further actions until resubmitted.';
    return '';
  };

  // Chart trend data
  const finalTrendData = [
    { name: 'Jan', value: 5, pending: 2 },
    { name: 'Feb', value: 8, pending: 4 },
    { name: 'Mar', value: 14, pending: 3 },
    { name: 'Apr', value: finalizedCount + 2, pending: reportsToSign }
  ];

  // Revisions Edit Mutation
  const editReportMutation = useMutation({
    mutationFn: ({ id, payload }) => apiClient.put(`/reports/${id}`, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['reports']);
      setSelectedItem(data.data.data);
      setIsEditing(false);
      triggerToast('✓ Report revisions successfully committed.');
    }
  });

  // Sign/Approve Report Mutation
  const signReportMutation = useMutation({
    mutationFn: (id) => apiClient.post(`/reports/${id}/sign`, {
      signerRole: 'DIRECTOR_OF_INTELLIGENCE',
      signerName: 'Director Christian Mugunga'
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['reports']);
      setSelectedItem(data.data.data);
      triggerToast('✓ Document signed and finalized.');
    }
  });

  // Reject Report Mutation
  const rejectReportMutation = useMutation({
    mutationFn: ({ id, reason }) => apiClient.post(`/reports/${id}/reject`, { rejectionReason: reason }),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['reports']);
      setSelectedItem(data.data.data);
      setRejectDialogOpen(false);
      setRejectionReason('');
      triggerToast('⚠ Report draft rejected.');
    }
  });

  // Return Report Mutation
  const returnReportMutation = useMutation({
    mutationFn: ({ id, payload }) => apiClient.post(`/reports/${id}/return`, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['reports']);
      setSelectedItem(data.data.data);
      setReturnDialogOpen(false);
      setReturnEmployeeId('');
      setReturnReasonText('');
      setReturnAttachment(null);
      triggerToast('↩ Report returned to officer for revisions.');
    }
  });
  const handleCloseReportModal = () => {
    setSelectedReport(null);
  };

  const handleDownloadAttachment = (att) => {
    const content = `[RRA SIIDS SYSTEM] - ADMISSIBLE EVIDENCE FILE\n\nFile Name: ${att.name}\nTag ID: ${att.id || 'N/A'}\nDescription: ${att.description || 'No description provided'}\nUploaded By: ${att.uploadedBy || 'System'}\nDate: ${att.date || new Date().toLocaleDateString()}\n\n---\n[Simulation: This file represents the securely stored evidentiary document.]`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Evidence_${att.name}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleEditClick = () => {
    setEditForm({
      title: selectedItem.title,
      subject: selectedItem.subject,
      body: selectedItem.body,
      reason: ''
    });
    setIsEditing(true);
    setRejectDialogOpen(false);
    setReturnDialogOpen(false);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editForm.reason || !editForm.reason.trim()) {
      triggerToast('⚠ Reason for modification is mandatory.');
      return;
    }
    editReportMutation.mutate({
      id: selectedItem.id,
      payload: { ...editForm, editorName: 'Director Christian Mugunga' }
    });
  };
  const handleSignReport = (id) => {
    signReportMutation.mutate(id);
  };

  const handleRejectSubmit = (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) return;
    rejectReportMutation.mutate({ id: selectedReportForAction.id, reason: rejectionReason });
  };

  const handleReturnSubmit = (e) => {
    e.preventDefault();
    if (returnType === 'employeeId' && !returnEmployeeId.trim()) return;

    let targetEmployee = returnEmployeeId;
    if (returnType === 'creator') {
      targetEmployee = selectedReportForAction.createdByName || 'Eric Gatera';
    }

    const payload = {
      returnToEmployeeId: targetEmployee,
      returnReason: returnReasonText || 'Please review findings and correct discrepancies.',
      returnDocumentPath: returnAttachment ? `/uploads/returns/${returnAttachment.name}` : null
    };

    returnReportMutation.mutate({ id: selectedReportForAction.id, payload });
  };

  const getCaseTimelineEvents = (reportItem) => {
    const caseItem = casesList.find(c => c.id === reportItem.caseId || c.reportId === reportItem.id || c.caseNum === reportItem.caseNum);
    if (caseItem) {
      const events = [
        { 
          title: 'Information Received', 
          desc: 'Incoming intelligence registered by System Intake Engine.', 
          operator: 'System Intake Engine', 
          date: caseItem.createdAt, 
          type: 'intake' 
        }
      ];

      events.push({ 
        title: 'Assigned to Officer', 
        desc: `Case assigned to ${reportItem.createdByName || 'Intelligence Officer'} for detailed investigation.`, 
        operator: 'AC Ronald Niwenshuti', 
        date: caseItem.createdAt, 
        type: 'assign' 
      });

      events.push({ 
        title: 'Draft Report Prepared', 
        desc: 'Report document created and findings details compiled.', 
        operator: reportItem.createdByName || 'Eric Gatera', 
        date: reportItem.createdAt, 
        type: 'draft' 
      });

      if (reportItem.status !== 'PENDING_DIRECTOR_SIGNATURE' && reportItem.status !== 'REPORT_SUBMITTED_TO_DIRECTOR') {
        events.push({ 
          title: 'Submitted for Approval', 
          desc: 'Intelligence folder dispatched to AC for review.', 
          operator: reportItem.createdByName || 'Eric Gatera', 
          date: new Date(reportItem.createdAt).getTime() + 3600000, 
          type: 'submit' 
        });
      }

      if (reportItem.signatures?.some(s => s.role === 'AC') || reportItem.status === 'FINALISED' || reportItem.status === 'PENDING_DIRECTOR_SIGNATURE') {
        events.push({ 
          title: 'Co-Signed by AC', 
          desc: 'Assistant Commissioner Ronald Niwenshuti signed and validated details.', 
          operator: 'AC Ronald Niwenshuti', 
          date: new Date(reportItem.createdAt).getTime() + 7200000, 
          type: 'ac_sign' 
        });
      }

      if (reportItem.status === 'FINALISED') {
        events.push({ 
          title: 'Finalised & Locked', 
          desc: 'Director Christian Mugunga signed and closed the investigation file.', 
          operator: 'Director Christian Mugunga', 
          date: new Date(reportItem.createdAt).getTime() + 14400000, 
          type: 'doi_sign' 
        });
      }

      if (reportItem.status === 'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER') {
        events.push({ 
          title: 'Returned for Revision', 
          desc: reportItem.returnReason || 'Revision requested: verification documents missing.', 
          operator: 'Director Christian Mugunga', 
          date: new Date(reportItem.createdAt).getTime() + 10800000, 
          type: 'return' 
        });
      }

      if (reportItem.status === 'REPORT_REJECTED_BY_DIRECTOR') {
        events.push({ 
          title: 'Rejected by Director', 
          desc: reportItem.rejectionReason || 'Case report draft rejected.', 
          operator: 'Director Christian Mugunga', 
          date: new Date(reportItem.createdAt).getTime() + 10800000, 
          type: 'reject' 
        });
      }

      return events.reverse();
    } else {
      const events = [
        {
          title: 'Information Received',
          desc: 'Case data registered automatically.',
          operator: 'System Intake Engine',
          date: reportItem.createdAt,
          type: 'intake'
        },
        {
          title: 'Draft Report Prepared',
          desc: 'Intelligence findings compiled.',
          operator: reportItem.createdByName || 'Intelligence Officer',
          date: reportItem.createdAt,
          type: 'draft'
        }
      ];
      if (reportItem.status === 'FINALISED') {
        events.push({
          title: 'Finalised & Locked',
          desc: 'Approved and sealed by Director.',
          operator: 'Director Christian Mugunga',
          date: new Date(reportItem.createdAt).getTime() + 14400000,
          type: 'doi_sign'
        });
      }
      return events.reverse();
    }
  };

  // ── Unified RRA PDF Download (saves directly to disk — no print dialog) ──
  const handleDownloadPDF = (report) => {
    if (!report) return;

    const isAcSigned  = report.signatures?.some(s => s.role === 'AC');
    const isDoiSigned = report.signatures?.some(s => s.role === 'DIRECTOR_OF_INTELLIGENCE');

    generateRRAPdf({
      reportId:       report.id,
      caseRef:        report.caseNum || `CASE-${report.caseId || 'N/A'}`,
      title:          report.title,
      subject:        report.subject,
      taxpayerName:   report.taxpayerName || report.createdByName || '—',
      tin:            report.tin || '—',
      dateCompiled:   new Date(report.createdAt).toLocaleDateString('en-RW', {
                        year: 'numeric', month: 'long', day: 'numeric'
                      }),
      preparedBy:     report.createdByName || 'Intelligence Officer',
      preparedByRole: 'Intelligence Officer',
      status:         report.status || '',
      body:           report.body || '',
      sections:       report.sections || [],
      attachments:    report.attachments || [],
      acSignature:    { signed: isAcSigned,  name: 'AC Ronald Niwenshuti' },
      dirSignature:   { signed: isDoiSigned, name: 'Director Christian Mugunga' },
      rejectionReason: report.rejectionReason || null,
      returnReason:    report.returnReason    || null,
    });

    triggerToast('✅ PDF saved to your Downloads folder.');
  };

  const handleExportLedgerToCSV = () => {
    const listToExport = selectedReportIds.length > 0 
      ? reportsList.filter(r => selectedReportIds.includes(r.id))
      : filteredLedgerReports;

    if (listToExport.length === 0) {
      triggerToast('⚠ No reports available for export.');
      return;
    }

    let csvContent = "\uFEFFReport ID,Case Number,Title,Subject,Author,Created Date,Status\r\n";
    listToExport.forEach(r => {
      const row = [
        r.id,
        r.caseNum || 'N/A',
        `"${r.title.replace(/"/g, '""')}"`,
        `"${r.subject.replace(/"/g, '""')}"`,
        `"${r.createdByName}"`,
        new Date(r.createdAt).toLocaleDateString(),
        r.status
      ];
      csvContent += row.join(",") + "\r\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `DOI_Intelligence_Reports_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
    triggerToast('✅ Excel-compatible reports ledger exported.');
  };

  // Reusable Pagination Renderer
  const renderPagination = (currentPage, totalItems, pageSize, onPageChange, onPageSizeChange) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const activePage = Math.min(currentPage, totalPages);
    const startRange = totalItems === 0 ? 0 : (activePage - 1) * pageSize + 1;
    const endRange = Math.min(activePage * pageSize, totalItems);

    const pages = [];
    let startPage = Math.max(1, activePage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="siids-pagination-controls" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', flexWrap: 'wrap', gap: '8px' }}>
        <div className="pagination-info" style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
          Showing <strong style={{ color: '#0f172a' }}>{startRange}-{endRange}</strong> of <strong style={{ color: '#0f172a' }}>{totalItems}</strong> entries
        </div>
        
        <div className="pagination-actions" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button 
            type="button"
            className="pagination-arrow-btn"
            disabled={activePage === 1}
            onClick={() => onPageChange(activePage - 1)}
            style={{
              padding: '4px 6px',
              border: '1.5px solid #cbd5e1',
              borderRadius: '4px',
              background: 'white',
              cursor: activePage === 1 ? 'not-allowed' : 'pointer',
              opacity: activePage === 1 ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ChevronLeft size={12} />
          </button>

          {pages.map(p => (
            <button
              key={p}
              type="button"
              className={`pagination-number-btn ${p === activePage ? 'active' : ''}`}
              onClick={() => onPageChange(p)}
              style={{
                minWidth: '24px',
                height: '24px',
                border: p === activePage ? 'none' : '1.5px solid #cbd5e1',
                borderRadius: '4px',
                background: p === activePage ? 'var(--primary-brand)' : 'white',
                color: p === activePage ? 'white' : '#475569',
                fontWeight: 600,
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {p}
            </button>
          ))}

          <button 
            type="button"
            className="pagination-arrow-btn"
            disabled={activePage === totalPages}
            onClick={() => onPageChange(activePage + 1)}
            style={{
              padding: '4px 6px',
              border: '1.5px solid #cbd5e1',
              borderRadius: '4px',
              background: 'white',
              cursor: activePage === totalPages ? 'not-allowed' : 'pointer',
              opacity: activePage === totalPages ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ChevronRight size={12} />
          </button>
        </div>

        <div className="pagination-page-size" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b' }}>
          <span>Show:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            style={{
              padding: '2px 4px',
              borderRadius: '4px',
              border: '1.5px solid #cbd5e1',
              backgroundColor: 'white',
              color: '#334155',
              fontWeight: 600,
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            <option value={10}>10 entries</option>
            <option value={5}>5 entries</option>
            <option value={20}>20 entries</option>
            <option value={30}>30 entries</option>
          </select>
        </div>
      </div>
    );
  };


  // 1. WORKSPACE VIEW (/doi)
  const leftWorkspaceView = (
    <div className="doi-left-workspace">
      {/* Metric Cards Navigation */}
      <div className="metrics-grid-row">
        <div 
          className={`intel-nav-card card-blue ${activeTab === 'PENDING' ? 'active' : ''}`}
          onClick={() => { setActiveTab(activeTab === 'PENDING' ? 'ALL' : 'PENDING'); setSelectedItem(null); setReportsPage(1); }}
        >
          <div className="nav-card-main-row">
            <div className="nav-card-icon-container"><FileText size={20} /></div>
            <div className="nav-card-counter">{reportsToSign}</div>
          </div>
          <div className="nav-card-details">
            <span className="nav-card-title">Pending Action</span>
            <span className="nav-card-subtitle">Reports requiring signature</span>
          </div>
          <div className="nav-card-metrics-row">
            <span className="nav-card-badge badge-blue">
              {dirSignatureCount} to Sign | {submittedToDirCount} Submitted
            </span>
            <span className="nav-card-percentage">
              {Math.round((reportsToSign / (reportsList.length || 1)) * 100)}% of queue
            </span>
          </div>
        </div>

        <div 
          className={`intel-nav-card card-green ${activeTab === 'REVIEWED' ? 'active' : ''}`}
          onClick={() => { setActiveTab(activeTab === 'REVIEWED' ? 'ALL' : 'REVIEWED'); setSelectedItem(null); setReportsPage(1); }}
        >
          <div className="nav-card-main-row">
            <div className="nav-card-icon-container"><ShieldCheck size={20} /></div>
            <div className="nav-card-counter">{reviewedCount}</div>
          </div>
          <div className="nav-card-details">
            <span className="nav-card-title">Reviewed & Signed</span>
            <span className="nav-card-subtitle">Finalized, returned, or rejected</span>
          </div>
          <div className="nav-card-metrics-row">
            <span className="nav-card-badge badge-green">
              {finalizedCount} Signed | {returnedCount} Returned | {rejectedCount} Rejected
            </span>
            <span className="nav-card-percentage">
              {Math.round((reviewedCount / (reportsList.length || 1)) * 100)}% of queue
            </span>
          </div>
        </div>

        <div 
          className={`intel-nav-card card-purple ${activeTab === 'SENT_TO_AC' ? 'active' : ''}`}
          onClick={() => { setActiveTab(activeTab === 'SENT_TO_AC' ? 'ALL' : 'SENT_TO_AC'); setSelectedItem(null); setReportsPage(1); }}
        >
          <div className="nav-card-main-row">
            <div className="nav-card-icon-container"><Layers size={20} /></div>
            <div className="nav-card-counter">{sentToAcCount}</div>
          </div>
          <div className="nav-card-details">
            <span className="nav-card-title">Sent to AC</span>
            <span className="nav-card-subtitle">Reports awaiting AC validation</span>
          </div>
          <div className="nav-card-metrics-row">
            <span className="nav-card-badge badge-purple">
              {sentToAcCount} Awaiting AC
            </span>
            <span className="nav-card-percentage">
              {Math.round((sentToAcCount / (reportsList.length || 1)) * 100)}% of queue
            </span>
          </div>
        </div>
      </div>      {/* Filter toolbar — Tab filters + Timeframe pills + Search */}
      <div className="table-filter-toolbar glass-panel doi-workspace-filter-bar">
        {/* Status tab filters */}
        <div className="workspace-tab-filters">
          <button
            type="button"
            className={`workspace-tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
            onClick={() => { setActiveTab('ALL'); setSelectedItem(null); setReportsPage(1); }}
          >
            All Reports
            <span className="tab-count-badge">{reportsList.length}</span>
          </button>
          <button
            type="button"
            className={`workspace-tab-btn tab-pending ${activeTab === 'PENDING' ? 'active' : ''}`}
            onClick={() => { setActiveTab(activeTab === 'PENDING' ? 'ALL' : 'PENDING'); setSelectedItem(null); setReportsPage(1); }}
          >
            Pending Review
            <span className="tab-count-badge badge-orange">{reportsToSign}</span>
          </button>
          <button
            type="button"
            className={`workspace-tab-btn tab-ac ${activeTab === 'SENT_TO_AC' ? 'active' : ''}`}
            onClick={() => { setActiveTab(activeTab === 'SENT_TO_AC' ? 'ALL' : 'SENT_TO_AC'); setSelectedItem(null); setReportsPage(1); }}
          >
            Sent to AC
            <span className="tab-count-badge badge-purple">{sentToAcCount}</span>
          </button>
          <button
            type="button"
            className={`workspace-tab-btn tab-reviewed ${activeTab === 'REVIEWED' ? 'active' : ''}`}
            onClick={() => { setActiveTab(activeTab === 'REVIEWED' ? 'ALL' : 'REVIEWED'); setSelectedItem(null); setReportsPage(1); }}
          >
            Reviewed &amp; Signed
            <span className="tab-count-badge badge-green">{reviewedCount}</span>
          </button>
        </div>

        {/* Right controls: timeframe + search */}
        <div className="workspace-right-controls">
          {/* Timeframe Filter Pills */}
          <div className="timeframe-filter-pills" style={{ display: 'flex', backgroundColor: '#e2e8f0', padding: '2px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
            <button 
              type="button"
              className={`timeframe-pill-btn ${workspaceTimeframe === 'WEEK' ? 'active' : ''}`}
              onClick={() => { setWorkspaceTimeframe('WEEK'); setReportsPage(1); }}
            >
              This Week
            </button>
            <button 
              type="button"
              className={`timeframe-pill-btn ${workspaceTimeframe === 'MONTH' ? 'active' : ''}`}
              onClick={() => { setWorkspaceTimeframe('MONTH'); setReportsPage(1); }}
            >
              This Month
            </button>
            <button 
              type="button"
              className={`timeframe-pill-btn ${workspaceTimeframe === 'ALL' ? 'active' : ''}`}
              onClick={() => { setWorkspaceTimeframe('ALL'); setReportsPage(1); }}
            >
              All Time
            </button>
          </div>

          {/* Search box */}
          <div className="search-bar-wrapper" style={{ minWidth: '220px' }}>
            <Search size={14} className="bar-search-icon" />
            <input 
              type="text" 
              placeholder="Search taxpayer, TIN, case ref..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setReportsPage(1); }}
            />
            {searchTerm && (
              <button type="button" style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }} onClick={() => { setSearchTerm(''); setReportsPage(1); }}>
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table grid */}
      <div className="table-wrapper custom-scrollbar" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
          <table className="siids-virtual-table">
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Case Number</th>
                <th>Created By</th>
                <th>Intake Date</th>
                <th>Status</th>
                <th align="center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="table-loader-cell">Loading reports...</td></tr>
              ) : paginatedWorkspaceReports.length === 0 ? (
                <tr><td colSpan={6} className="table-empty-cell">No reports found matching filters.</td></tr>
              ) : (
                paginatedWorkspaceReports.map(item => {
                  const isRowPendingDirector = item.status === 'PENDING_DIRECTOR_SIGNATURE' || item.status === 'REPORT_SUBMITTED_TO_DIRECTOR';
                  return (
                    <tr 
                      key={item.id} 
                      className={`virtual-row-item ${selectedItem?.id === item.id ? 'row-selected' : ''}`}
                      onClick={() => {
                        setSelectedItem(item);
                        setIsEditing(false);
                        setInspectorTab('DOCUMENT');
                        setRejectDialogOpen(false);
                        setReturnDialogOpen(false);
                      }}
                    >
                      <td>#{item.id}</td>
                      <td>{item.caseNum || '-'}</td>
                      <td className="desc-cell-title">{item.createdByName}</td>
                      <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className={`table-status-pill-wrapper status-${item.status?.toLowerCase().replace(/_/g, '-')}`}>
                          <FileText size={11} className="status-pill-icon" />
                          <span className="status-pill-lbl">
                            {item.status?.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </td>
                      <td align="center" onClick={(e) => e.stopPropagation()}>
                        <div className="actions-cell-row">
                          <button 
                            className="action-tbl-btn view-btn"
                            title="View Details"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setSelectedItem(item); 
                              setIsEditing(false); 
                              setInspectorTab('DOCUMENT');
                              setRejectDialogOpen(false);
                              setReturnDialogOpen(false);
                            }}
                          >
                            <Eye size={12} />
                          </button>
                          
                          <button 
                            className="action-tbl-btn approve-btn" 
                            title="Approve / Sign"
                            disabled={!isRowPendingDirector}
                            onClick={(e) => { e.stopPropagation(); handleSignReport(item.id); }}
                          >
                            <Check size={12} />
                          </button>
                          
                          <button 
                            className="action-tbl-btn reject-btn"
                            title="Reject Report"
                            disabled={!isRowPendingDirector}
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setSelectedReportForAction(item); 
                              setRejectionReason(''); 
                              setRejectDialogOpen(true); 
                              setIsEditing(false);
                              setReturnDialogOpen(false);
                            }}
                          >
                            <X size={12} />
                          </button>

                          <button 
                            className="action-tbl-btn return-btn"
                            title="Return to Officer"
                            disabled={!isRowPendingDirector}
                            onClick={(e) => { 
                              e.stopPropagation();
                              setSelectedReportForAction(item); 
                              setReturnEmployeeId(''); 
                              setReturnReasonText(''); 
                              setReturnAttachment(null); 
                              setReturnType('creator');
                              setReturnDialogOpen(true); 
                              setIsEditing(false);
                              setRejectDialogOpen(false);
                            }}
                          >
                            <Reply size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination at the bottom */}
        {filteredWorkspaceReports.length > 0 && renderPagination(
          activeWorkspacePage,
          filteredWorkspaceReports.length,
          reportsPageSize,
          setReportsPage,
          setReportsPageSize
        )}
      </div>
    </div>
  );
  const rightWorkspaceView = (
    <div className="doi-right-workspace">
      {selectedItem ? (
        <div className="workspace-inspector-panel">
          <div className="inspector-panel-header" style={{ borderBottom: '1px solid rgba(226,232,240,0.8)', paddingBottom: '12px' }}>
            <h3>Intelligence Review Panel (Ref: #{selectedItem.id})</h3>
            <button className="panel-close-trigger" onClick={() => setSelectedItem(null)}><X size={16} /></button>
          </div>

          {/* Sub-navigation tabs */}
          <div className="inspector-tabs-header" style={{ display: 'flex', borderBottom: '1px solid rgba(226,232,240,0.8)', background: '#f8fafc', position: 'sticky', top: 0, zIndex: 100, flexShrink: 0 }}>
            <button 
              type="button"
              className={`inspector-tab-btn ${inspectorTab === 'DOCUMENT' ? 'active' : ''}`}
              onClick={() => setInspectorTab('DOCUMENT')}
              style={{
                flex: 1,
                padding: '12px 0',
                fontSize: '11.5px',
                fontWeight: 700,
                textAlign: 'center',
                color: inspectorTab === 'DOCUMENT' ? 'var(--primary-brand)' : '#64748b',
                borderBottom: inspectorTab === 'DOCUMENT' ? '3px solid var(--primary-brand)' : 'none',
                background: inspectorTab === 'DOCUMENT' ? 'rgba(0, 61, 165, 0.02)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Document Preview
            </button>
            <button 
              type="button"
              className={`inspector-tab-btn ${inspectorTab === 'CASE_AUDIT' ? 'active' : ''}`}
              onClick={() => setInspectorTab('CASE_AUDIT')}
              style={{
                flex: 1,
                padding: '12px 0',
                fontSize: '11.5px',
                fontWeight: 700,
                textAlign: 'center',
                color: inspectorTab === 'CASE_AUDIT' ? 'var(--primary-brand)' : '#64748b',
                borderBottom: inspectorTab === 'CASE_AUDIT' ? '3px solid var(--primary-brand)' : 'none',
                background: inspectorTab === 'CASE_AUDIT' ? 'rgba(0, 61, 165, 0.02)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Case Audit Trail
            </button>
            <button 
              type="button"
              className={`inspector-tab-btn ${inspectorTab === 'REVISIONS' ? 'active' : ''}`}
              onClick={() => setInspectorTab('REVISIONS')}
              style={{
                flex: 1,
                padding: '12px 0',
                fontSize: '11.5px',
                fontWeight: 700,
                textAlign: 'center',
                color: inspectorTab === 'REVISIONS' ? 'var(--primary-brand)' : '#64748b',
                borderBottom: inspectorTab === 'REVISIONS' ? '3px solid var(--primary-brand)' : 'none',
                background: inspectorTab === 'REVISIONS' ? 'rgba(0, 61, 165, 0.02)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Modification Log
            </button>
          </div>

          <div className="inspector-details-card" style={{ padding: '16px 0' }}>
            {inspectorTab === 'DOCUMENT' && (
              <div className="tab-pane-content" style={{ padding: '0 16px' }}>
                {isEditing ? (
                  <form onSubmit={handleEditSubmit} className="doi-edit-form-wrapper">
                    <div className="form-input-group">
                      <label>Document Title</label>
                      <input 
                        type="text" 
                        required 
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      />
                    </div>

                    <div className="form-input-group">
                      <label>Document Subject</label>
                      <input 
                        type="text" 
                        required 
                        value={editForm.subject}
                        onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                      />
                    </div>

                    <div className="form-input-group">
                      <label>Report Content</label>
                      <textarea 
                        required 
                        rows={12}
                        value={editForm.body}
                        onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                      />
                    </div>

                    {/* Data Integrity Warning */}
                    <div className="audit-warning-banner" style={{ background: 'rgba(224,92,0,0.06)', border: '1px solid #E05C00', padding: '10px', borderRadius: '6px', fontSize: '11px', display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '14px' }}>
                      <AlertTriangle size={15} style={{ color: '#E05C00', flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <strong style={{ color: '#E05C00' }}>System Integrity Warning:</strong>
                        <p style={{ margin: '2px 0 0', color: '#475569', lineHeight: '1.4' }}>This operation is highly audited. You are modifying a case findings report. Providing a detailed justification is mandatory to preserve audit trail integrity.</p>
                      </div>
                    </div>

                    <div className="form-input-group" style={{ marginBottom: '16px' }}>
                      <label>Reason for Modification *</label>
                      <textarea 
                        required 
                        rows={3}
                        placeholder="E.g. Corrected taxpayer tin mismatch and re-tabulated overall estimated evasion figures based on custom checks."
                        value={editForm.reason}
                        onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                      />
                    </div>

                    <div className="action-form-buttons">
                      <button type="submit" className="btn-form-confirm">Commit Revision</button>
                      <button type="button" className="btn-form-cancel" onClick={() => setIsEditing(false)}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="intelligence-pdf-preview glass-panel">
                      <div className="pdf-letterhead">
                        <img src="/Images/HomeLogo.jpeg" alt="RRA Logo" className="pdf-crest-img" style={{ height: '35px', marginBottom: '8px' }} />
                        <h4>RWANDA REVENUE AUTHORITY</h4>
                        <span>Intelligence & Enforcement Division</span>
                      </div>

                      <div className="pdf-metadata-block">
                        <div className="pdf-meta-row"><strong>Title:</strong> <span>{selectedItem.title}</span></div>
                        <div className="pdf-meta-row"><strong>Subject:</strong> <span>{selectedItem.subject}</span></div>
                        <div className="pdf-meta-row"><strong>Date:</strong> <span>{new Date(selectedItem.createdAt).toLocaleDateString()}</span></div>
                        <div className="pdf-meta-row"><strong>Author:</strong> <span>{selectedItem.createdByName}</span></div>
                        <div className="pdf-meta-row">
                          <strong>Status:</strong> 
                          <span style={{ 
                            fontWeight: 'bold', 
                            textTransform: 'uppercase',
                            color: selectedItem.status === 'FINALISED' ? '#009A44' : 
                                   selectedItem.status === 'REPORT_REJECTED_BY_DIRECTOR' ? '#D32F2F' : 
                                   selectedItem.status === 'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER' ? '#E05C00' : '#003DA5'
                          }}>
                            {selectedItem.status?.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>

                      <div className="pdf-document-body">
                        {/* Executive Summary */}
                        {selectedItem.body && (
                          <div style={{ marginBottom: '16px' }}>
                            <h5 style={{ color: '#003DA5', fontSize: '12px', marginBottom: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>I. Executive Summary</h5>
                            {selectedItem.body.split('\n\n').map((paragraph, index) => {
                              if (paragraph.startsWith('### ')) {
                                return <h5 key={index} style={{ color: '#003DA5', marginTop: '10px', marginBottom: '4px', fontSize: '11.5px' }}>{paragraph.replace('### ', '')}</h5>;
                              }
                              return <p key={index} style={{ marginBottom: '8px', fontSize: '11px', lineHeight: '1.5' }}>{paragraph}</p>;
                            })}
                          </div>
                        )}

                        {/* Detailed Findings & Legal Basis */}
                        {selectedItem.sections?.length > 0 && (
                          <div style={{ marginBottom: '16px' }}>
                            <h5 style={{ color: '#003DA5', fontSize: '12px', marginBottom: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>II. Detailed Findings & Legal Basis</h5>
                            {selectedItem.sections.map((sec, index) => (
                              <div key={index} style={{ marginBottom: '10px' }}>
                                {sec.subject && <h6 style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>{index + 1}. {sec.subject}</h6>}
                                <p style={{ margin: 0, fontSize: '11px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{sec.text || '—'}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Evidence Inventory */}
                        {selectedItem.attachments?.length > 0 && (
                          <div style={{ marginBottom: '16px' }}>
                            <h5 style={{ color: '#003DA5', fontSize: '12px', marginBottom: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>III. Admissible Evidence Inventory</h5>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                              <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                                  <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Tag ID</th>
                                  <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>File Name</th>
                                  <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Size</th>
                                  <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Description</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedItem.attachments.map((att, index) => (
                                  <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '6px 8px', fontWeight: 600, color: '#003DA5' }}>TAG-{101 + index}</td>
                                    <td style={{ padding: '6px 8px', fontWeight: 600, color: '#0f172a' }}>
                                      <button
                                        type="button"
                                        onClick={() => handleDownloadAttachment(att)}
                                        style={{ background: 'none', border: 'none', color: '#003DA5', textDecoration: 'underline', cursor: 'pointer', padding: 0, font: 'inherit' }}
                                        title="Download Evidence File"
                                      >
                                        <Download size={12} style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }} />
                                        <span style={{ verticalAlign: 'middle' }}>{att.name}</span>
                                      </button>
                                    </td>
                                    <td style={{ padding: '6px 8px', color: '#64748b' }}>{att.size}</td>
                                    <td style={{ padding: '6px 8px', color: '#64748b', fontStyle: 'italic' }}>{att.description || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {selectedItem.status === 'REPORT_REJECTED_BY_DIRECTOR' && selectedItem.rejectionReason && (
                        <div className="rejection-notes-alert" style={{ background: 'rgba(211,47,47,0.06)', border: '1px solid #D32F2F', padding: '10px', borderRadius: '6px', marginTop: '12px', fontSize: '11px' }}>
                          <strong style={{ color: '#D32F2F' }}>⚠ Rejection Notes:</strong>
                          <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '10px', lineHeight: '1.3' }}>
                            {selectedItem.rejectionReason}
                          </p>
                        </div>
                      )}
                      
                      {selectedItem.status === 'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER' && selectedItem.returnReason && (
                        <div className="returned-notes-alert" style={{ background: 'rgba(224,92,0,0.06)', border: '1px solid #E05C00', padding: '10px', borderRadius: '6px', marginTop: '12px', fontSize: '11px' }}>
                          <strong style={{ color: '#E05C00' }}>↩ Return Comments:</strong>
                          <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '10px', lineHeight: '1.3' }}>
                            {selectedItem.returnReason}
                          </p>
                        </div>
                      )}

                      <div className="pdf-signature-blocks">
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
                        <div className="sig-block">
                          <span className="role">Director of Intelligence</span>
                          <span className="sig-line">
                            {selectedItem.signatures?.some(s => s.role === 'DIRECTOR_OF_INTELLIGENCE') ? (
                              <strong className="sig-signed-name">Director Christian Mugunga ✓</strong>
                            ) : (
                              <span className="sig-pending-label">Awaiting Director Sign-off</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Edit & Sign Actions row — state-aware restrictions */}
                    {selectedIsLockedForAction && (
                      <div className="action-locked-banner" style={{
                        background: 'rgba(100,116,139,0.07)',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '10px 14px',
                        fontSize: '11px',
                        color: '#475569',
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'flex-start',
                        marginBottom: '10px'
                      }}>
                        <AlertTriangle size={14} style={{ color: '#64748b', flexShrink: 0, marginTop: '1px' }} />
                        <span style={{ lineHeight: 1.5 }}>{getActionLockedReason()}</span>
                      </div>
                    )}

                    <div className="action-buttons-group">
                      {/* Modify Draft — only when pending director action */}
                      <button
                        type="button"
                        className="btn-action-edit-trigger"
                        disabled={!selectedIsPendingDirectorAction}
                        title={!selectedIsPendingDirectorAction ? 'Report cannot be modified in its current state.' : 'Modify report draft content'}
                        onClick={handleEditClick}
                        style={{ opacity: !selectedIsPendingDirectorAction ? 0.45 : 1, cursor: !selectedIsPendingDirectorAction ? 'not-allowed' : 'pointer' }}
                      >
                        <Edit size={14} />
                        <span>Modify Draft</span>
                      </button>

                      {/* Sign & Approve — only when pending director action */}
                      <button 
                        type="button"
                        className="btn-action-sign-report" 
                        onClick={() => handleSignReport(selectedItem.id)}
                        disabled={!selectedIsPendingDirectorAction || selectedItem.signatures?.some(s => s.role === 'DIRECTOR_OF_INTELLIGENCE')}
                        title={!selectedIsPendingDirectorAction ? 'Report cannot be approved in its current state.' : 'Sign and approve this report'}
                        style={{ opacity: !selectedIsPendingDirectorAction ? 0.45 : 1, cursor: !selectedIsPendingDirectorAction ? 'not-allowed' : 'pointer' }}
                      >
                        <Check size={14} />
                        <span>Sign &amp; Approve</span>
                      </button>

                      {/* Reject — only when pending director action */}
                      <button 
                        type="button"
                        className="btn-action-reject-trigger"
                        disabled={!selectedIsPendingDirectorAction}
                        title={!selectedIsPendingDirectorAction ? 'Report cannot be rejected in its current state.' : 'Reject this report draft'}
                        style={{ opacity: !selectedIsPendingDirectorAction ? 0.45 : 1, cursor: !selectedIsPendingDirectorAction ? 'not-allowed' : 'pointer' }}
                        onClick={() => { 
                          if (!selectedIsPendingDirectorAction) return;
                          setSelectedReportForAction(selectedItem); 
                          setRejectionReason(''); 
                          setRejectDialogOpen(true);
                          setIsEditing(false);
                          setReturnDialogOpen(false);
                        }}
                      >
                        <X size={14} />
                        <span>Reject</span>
                      </button>

                      {/* Return — only when pending director action */}
                      <button 
                        type="button"
                        className="btn-action-return-trigger"
                        disabled={!selectedIsPendingDirectorAction}
                        title={!selectedIsPendingDirectorAction ? 'Report cannot be returned in its current state.' : 'Return report to officer for corrections'}
                        style={{ opacity: !selectedIsPendingDirectorAction ? 0.45 : 1, cursor: !selectedIsPendingDirectorAction ? 'not-allowed' : 'pointer' }}
                        onClick={() => { 
                          if (!selectedIsPendingDirectorAction) return;
                          setSelectedReportForAction(selectedItem); 
                          setReturnEmployeeId(''); 
                          setReturnReasonText(''); 
                          setReturnAttachment(null); 
                          setReturnType('creator');
                          setReturnDialogOpen(true);
                          setIsEditing(false);
                          setRejectDialogOpen(false);
                        }}
                      >
                        <Reply size={14} />
                        <span>Return</span>
                      </button>

                      {/* Download PDF — always available */}
                      <button type="button" className="btn-action-download-pdf" onClick={() => handleDownloadPDF(selectedItem)}>
                        <Download size={14} />
                        <span>Download PDF</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {inspectorTab === 'CASE_AUDIT' && (
              <div className="tab-pane-content" style={{ padding: '0 16px' }}>
                <div className="case-audit-panel-header" style={{ marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>System Audit Trail (Case Ref: {selectedItem.caseNum || 'Linked Case'})</h4>
                  <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', margin: '2px 0 0' }}>Tamper-proof operational logs automatically registered by the system intake engine.</p>
                </div>
                <div className="inspector-history-section" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                  <TimelineActivityFeed 
                    activities={getCaseTimelineEvents(selectedItem).map(evt => ({
                      actorName: evt.operator,
                      message: `${evt.title}: ${evt.desc}`,
                      timestamp: evt.date,
                      correlationId: `sys-evt-${evt.type || 'auto'}`
                    }))}
                  />
                </div>
              </div>
            )}

            {inspectorTab === 'REVISIONS' && (
              <div className="tab-pane-content" style={{ padding: '0 16px' }}>
                <div className="revisions-panel-header" style={{ marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>Document Version History</h4>
                  <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', margin: '2px 0 0' }}>Traceability log tracking manual report revisions, supervisor rejections, and signature approvals.</p>
                </div>
                <div className="inspector-history-section" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                  <TimelineActivityFeed 
                    activities={[
                      { actorName: selectedItem.createdByName || 'Eric Gatera', message: 'Report draft created.', timestamp: selectedItem.createdAt, correlationId: 'cl-r0a82b1' },
                      ...selectedItem.revisions.map(rev => ({
                        actorName: rev.revisedBy,
                        message: rev.revisionContent?.action 
                          ? `${rev.revisionContent.action}: ${rev.revisionContent.reason || 'No comments'}`
                          : 'Modified draft paragraphs.',
                        timestamp: rev.revisedAt,
                        correlationId: `rev-${rev.id}`
                      }))
                    ]}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="inspector-empty-state-card">
          <FileText size={48} className="empty-state-icon" />
          <h3>Director Review Workspace</h3>
          <p>Choose an intelligence report file from the table to view, edit content draft details (saves revisions logs), and register final approval signatures.</p>
        </div>
      )}
    </div>
  );
  const pieData = [
    { name: 'Pending Sign', value: reportsToSign },
    { name: 'Approved', value: finalizedCount },
  ];
  const PIE_COLORS = ['#E05C00', '#009A44'];

  // 2. REPORTS & METRICS VIEW (/doi/reports)
  const reportsMetricsView = (
    <div className="doi-reports-metrics-page">
      {/* Top row: Summary + Chart */}
      <div className="reports-top-row" style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Metric Summary */}
        <div className="reports-summary-card glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#003DA5', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '20px' }}>Metric Summary</h3>
          
          <div className="summary-stat-box" style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#fff', border: '1px solid #f1f5f9', borderRadius: '8px', padding: '16px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div className="stat-icon-wrapper circle-blue" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0,61,165,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#003DA5' }}>
              <CheckCircle size={20} />
            </div>
            <div className="stat-text-info" style={{ flex: 1 }}>
              <span className="stat-label" style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Reports Approved (Month)</span>
              <div className="stat-value-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="stat-val" style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{finalizedCount * 4 + 14}</span>
                <span className="trend-badge positive" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                  <TrendingUp size={12} />
                  <span>+12.5%</span>
                </span>
              </div>
            </div>
          </div>

          <div className="summary-stat-box" style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#fff', border: '1px solid #f1f5f9', borderRadius: '8px', padding: '16px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div className="stat-icon-wrapper circle-amber" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(245,168,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E05C00' }}>
              <Calendar size={20} />
            </div>
            <div className="stat-text-info" style={{ flex: 1 }}>
              <span className="stat-label" style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Reports Approved (Week)</span>
              <div className="stat-value-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="stat-val" style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{finalizedCount + 2}</span>
                <span className="trend-badge negative" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fee2e2', color: '#991b1b', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                  <TrendingDown size={12} />
                  <span>-2.1%</span>
                </span>
              </div>
            </div>
          </div>

          <a href="#" className="efficiency-link" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#003DA5', textDecoration: 'none', transition: 'all 0.2s' }}>
            View efficiency trends <ExternalLink size={12} />
          </a>
        </div>

        {/* Analytics Main Panel */}
        <div className="stock-analytics-panel glass-panel" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '24px' }}>
          <div className="chart-wrapper-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#003DA5', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Finalised Reports (YTD Trend)</h3>
            <div className="chart-container-panel" style={{ flex: 1, minHeight: '220px', marginTop: '16px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={finalTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#cbd5e1" fontSize={11} tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <YAxis stroke="#cbd5e1" fontSize={11} tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <defs>
                    <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#003DA5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#003DA5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke="#003DA5" fill="url(#colorApproved)" strokeWidth={3} name="Finalised" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-wrapper-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#003DA5', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Report Backlog vs Signed</h3>
            <div className="chart-container-panel" style={{ flex: 1, minHeight: '220px', marginTop: '16px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => <span style={{ color: '#475569', fontSize: '11px', fontWeight: 600 }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Reports & Export Ledger */}
      <div className="reports-log-card glass-panel" style={{ marginTop: '20px' }}>
        <div className="log-card-header">
          <div className="header-titles">
            <h3>Intelligence Reports Ledger Database</h3>
            <p className="subtitle-desc">Select and filter intelligence report files to export into spreadsheet format.</p>
          </div>
          
          <div className="batch-export-actions">
            {selectedReportIds.length > 0 && (
              <span className="selected-count-badge">
                {selectedReportIds.length} selected
              </span>
            )}
            <button 
              type="button"
              className="btn-export-excel" 
              onClick={handleExportLedgerToCSV}
              disabled={filteredLedgerReports.length === 0}
            >
              <Download size={14} />
              <span>{selectedReportIds.length > 0 ? 'Export Selected to Excel' : 'Export Current View'}</span>
            </button>
            <div className="table-dropdown-filters" style={{ display: 'flex', gap: '8px' }}>
              <select className="log-filter-select" style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setLedgerPage(1); setSelectedReportIds([]); }}>
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
              <select className="log-filter-select" style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} value={filterYear} onChange={e => { setFilterYear(e.target.value); setLedgerPage(1); setSelectedReportIds([]); }}>
                <option value="All">All Years</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filters control bar */}
        <div className="ledger-filters-bar">
          <div className="left-filters">
            <select 
              className="ledger-filter-select" 
              value={ledgerFilterType} 
              onChange={(e) => { setLedgerFilterType(e.target.value); setLedgerPage(1); setSelectedReportIds([]); }}
            >
              <option value="ALL">All Tax Types</option>
              <option value="None">None</option>
              <option value="PAYEE">PAYEE</option>
              <option value="VAT">VAT</option>
              <option value="Income Tax">Income Tax</option>
              <option value="Corporate Tax">Corporate Tax</option>
              <option value="Withholding Tax">Withholding Tax</option>
              <option value="Property Tax">Property Tax</option>
              <option value="Capital gains">Capital gains</option>
              <option value="Consumption Tax">Consumption Tax</option>
              <option value="Immovable Property Tax">Immovable Property Tax</option>
              <option value="Payroll Tax">Payroll Tax</option>
              <option value="Trading Tax">Trading Tax</option>
            </select>

            <select 
              className="ledger-filter-select" 
              value={ledgerFilterStatus} 
              onChange={(e) => { setLedgerFilterStatus(e.target.value); setLedgerPage(1); setSelectedReportIds([]); }}
            >
              <option value="ALL">All Statuses</option>
              <option value="Approved">Approved / Finalised</option>
              <option value="Rejected">Rejected</option>
              <option value="Returned">Returned</option>
              <option value="Pending">Pending Signatures</option>
            </select>

            <div className="date-filter-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0 8px', height: '28px' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Date:</span>
              <input 
                type="date"
                className="ledger-date-input"
                max={new Date().toISOString().split('T')[0]}
                value={specificDateFilter}
                onChange={(e) => { setSpecificDateFilter(e.target.value); setLedgerPage(1); setSelectedReportIds([]); }}
                style={{ border: 'none', outline: 'none', fontSize: '11.5px', color: '#334155', cursor: 'pointer', fontFamily: 'inherit' }}
              />
              {specificDateFilter && (
                <button 
                  type="button" 
                  onClick={() => { setSpecificDateFilter(''); setLedgerPage(1); setSelectedReportIds([]); }}
                  style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                  title="Clear date filter"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="right-search">
            <div className="ledger-search-box">
              <Search size={14} className="ledger-search-icon" />
              <input 
                type="text" 
                placeholder="Search case, TIN, taxpayer..." 
                value={ledgerSearch}
                onChange={(e) => { setLedgerSearch(e.target.value); setLedgerPage(1); setSelectedReportIds([]); }}
              />
              {ledgerSearch && (
                <button type="button" className="clear-search-btn" onClick={() => { setLedgerSearch(''); setLedgerPage(1); setSelectedReportIds([]); }}>
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Ledger Table Wrapper */}
        <div className="reports-log-table-wrapper custom-scrollbar">
          <table className="rra-ledger-table">
            <thead>
              <tr>
                <th className="checkbox-cell" width="40">
                  <input 
                    type="checkbox"
                    checked={paginatedLedgerReports.length > 0 && paginatedLedgerReports.every(r => selectedReportIds.includes(r.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const pageIds = paginatedLedgerReports.map(r => r.id);
                        setSelectedReportIds(prev => Array.from(new Set([...prev, ...pageIds])));
                      } else {
                        const pageIds = paginatedLedgerReports.map(r => r.id);
                        setSelectedReportIds(prev => prev.filter(id => !pageIds.includes(id)));
                      }
                    }}
                  />
                </th>
                <th>Report ID</th>
                <th>Case Number</th>
                <th>Title</th>
                <th>Author</th>
                <th>Created Date</th>
                <th>Status</th>
                <th align="center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLedgerReports.length === 0 ? (
                <tr><td colSpan={8} className="table-empty-cell">No matching reports found in database logs.</td></tr>
              ) : (
                paginatedLedgerReports.map(r => (
                  <tr key={r.id} className={selectedReportIds.includes(r.id) ? 'row-selected' : ''}>
                    <td className="checkbox-cell">
                      <input 
                        type="checkbox"
                        checked={selectedReportIds.includes(r.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedReportIds(prev => [...prev, r.id]);
                          else setSelectedReportIds(prev => prev.filter(id => id !== r.id));
                        }}
                      />
                    </td>
                    <td>#{r.id}</td>
                    <td className="case-num-col">{r.caseNum || '-'}</td>
                    <td className="desc-cell-title">{r.title}</td>
                    <td>{r.createdByName}</td>
                    <td className="table-date-cell">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className={`table-status-pill-wrapper status-${r.status?.toLowerCase().replace(/_/g, '-')}`}>
                        <FileText size={11} className="status-pill-icon" />
                        <span className="status-pill-lbl">
                          {r.status?.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </td>
                    <td align="center" onClick={(e) => e.stopPropagation()}>
                      <div className="actions-cell-row">
                        <button className="action-tbl-btn view-btn" title="Quick View" onClick={(e) => { e.stopPropagation(); setPreviewModalReport(r); }}>
                          <Eye size={12} />
                        </button>
                        <button className="action-tbl-btn download-btn" title="Download PDF" onClick={(e) => { e.stopPropagation(); handleDownloadPDF(r); }}>
                          <Download size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Ledger Pagination */}
        {filteredLedgerReports.length > 0 && renderPagination(
          activeLedgerPage,
          filteredLedgerReports.length,
          ledgerPageSize,
          setLedgerPage,
          setLedgerPageSize
        )}
      </div>

      {/* Floating Modal Previewer */}
      {previewModalReport && (
        <div className="pdf-preview-modal-overlay" onClick={() => setPreviewModalReport(null)}>
          <div className="pdf-preview-modal-container glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h4>Intelligence Report Preview Modal</h4>
              <button className="panel-close-trigger" onClick={() => setPreviewModalReport(null)}><X size={16} /></button>
            </div>
            
            <div className="pdf-modal-body-scrollbox" style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '5px' }}>
              <div className="intelligence-pdf-preview" style={{ border: 'none', background: 'transparent', padding: 0 }}>
                <div className="pdf-letterhead">
                  <img src="/Images/HomeLogo.jpeg" alt="RRA Logo" className="pdf-crest-img" style={{ height: '35px', marginBottom: '8px' }} />
                  <h4>RWANDA REVENUE AUTHORITY</h4>
                  <span>Strategic Intelligence Directorate</span>
                </div>
                <div className="pdf-metadata-block">
                  <div className="pdf-meta-row"><strong>Title:</strong> <span>{previewModalReport.title}</span></div>
                  <div className="pdf-meta-row"><strong>Subject:</strong> <span>{previewModalReport.subject}</span></div>
                  <div className="pdf-meta-row"><strong>Author:</strong> <span>{previewModalReport.createdByName}</span></div>
                  <div className="pdf-meta-row"><strong>Status:</strong> <span>{previewModalReport.status}</span></div>
                </div>
                <div className="pdf-document-body" style={{ fontSize: '11px' }}>
                  {previewModalReport.body?.split('\n\n').map((paragraph, index) => {
                    if (paragraph.startsWith('### ')) {
                      return <h5 key={index} style={{ color: '#003DA5', marginTop: '10px', marginBottom: '3px' }}>{paragraph.replace('### ', '')}</h5>;
                    }
                    return <p key={index} style={{ marginBottom: '6px' }}>{paragraph}</p>;
                  })}
                </div>
              </div>
            </div>

            <div className="modal-footer-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px', borderTop: '1px solid rgba(226,232,240,0.8)', paddingTop: '10px' }}>
              <button className="btn-action-download-pdf" onClick={() => handleDownloadPDF(previewModalReport)} style={{ margin: 0 }}>
                <Download size={14} />
                <span>Print / Download PDF</span>
              </button>
              <button className="btn-form-cancel" onClick={() => setPreviewModalReport(null)} style={{ margin: 0 }}>Close</button>
            </div>
          </div>
        </div>
      )}
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
              <h3>Reject Intelligence Report Draft</h3>
              <button className="btn-modal-close" onClick={() => setRejectDialogOpen(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleRejectSubmit} className="modal-form-wrapper">
              <p className="modal-description-text">
                Provide a mandatory reason for rejecting this report. This action is audited in the document revisions history.
              </p>
              <div className="form-input-group">
                <label>Rejection Reason *</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="E.g. Discrepancies detected in asset valuation amounts. Please revise case figures."
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
              <h3>Return Intelligence Report to Officer</h3>
              <button className="btn-modal-close" onClick={() => setReturnDialogOpen(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleReturnSubmit} className="modal-form-wrapper">
              <p className="modal-description-text">
                Specify who to return the report to, and provide corrections instructions. Optionally attach a word/pdf file.
              </p>
              
              <div className="form-input-group">
                <label>Return Destination *</label>
                <select value={returnType} onChange={(e) => setReturnType(e.target.value)}>
                  <option value="creator">Original Creator ({selectedReportForAction?.createdByName || 'Intelligence Officer'})</option>
                  <option value="employeeId">Specific Employee ID</option>
                </select>
              </div>

              {returnType === 'employeeId' && (
                <div className="form-input-group">
                  <label>Employee ID / Name *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Enter Employee ID (e.g. Eric Gatera)" 
                    value={returnEmployeeId}
                    onChange={(e) => setReturnEmployeeId(e.target.value)}
                  />
                </div>
              )}

              <div className="form-input-group">
                <label>Corrections Request Note *</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="E.g. Missing semiconductor scan documents. Please re-attach scan under Rubavu customs references."
                  value={returnReasonText}
                  onChange={(e) => setReturnReasonText(e.target.value)}
                />
              </div>

              {/* Simulated attachment selector */}
              <div className="form-input-group">
                <label>Upload Corrections Document (Optional)</label>
                <div className="simulated-upload-box">
                  <input 
                    type="file" 
                    id="return-file-picker" 
                    style={{ display: 'none' }} 
                    accept=".doc,.docx,.pdf,.txt"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setReturnAttachment({ name: file.name, size: `${(file.size / 1024).toFixed(1)} KB` });
                      }
                    }}
                  />
                  {!returnAttachment ? (
                    <label htmlFor="return-file-picker" className="btn-choose-file">
                      <FileUp size={16} />
                      <span>Choose Word/PDF attachment</span>
                    </label>
                  ) : (
                    <div className="chosen-file-row">
                      <FileText size={16} />
                      <span className="file-name">{returnAttachment.name} ({returnAttachment.size})</span>
                      <button type="button" className="btn-remove-file" onClick={() => setReturnAttachment(null)}><X size={14} /></button>
                    </div>
                  )}
                </div>
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

export default DoiDashboard;
