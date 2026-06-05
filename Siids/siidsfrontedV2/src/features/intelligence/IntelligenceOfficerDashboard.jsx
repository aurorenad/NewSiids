import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { SplitWorkspaceLayout } from '../../components/ui/SplitWorkspaceLayout';
import { GlassMetricCard } from '../../components/ui/GlassMetricCard';
import { StatusBadgeSystem } from '../../components/ui/StatusBadgeSystem';
import { AppShell } from '../../components/layout/AppShell';
import { 
  FileText, ClipboardList, CheckCircle, AlertTriangle, 
  X, AlertCircle, Plus, Edit, Send, Save, ArrowRight, ShieldCheck,
  UploadCloud, File, Trash2, Calendar, User, Clock, Search,
  Filter, Download, Database, Gavel, FileCheck, Layers,
  TrendingUp, TrendingDown, ExternalLink, Eye, ChevronLeft, ChevronRight
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid, Legend 
} from 'recharts';
import { generateRRAPdf } from '../../utils/generateRRAPdf';
import './IntelligenceOfficerDashboard.css';

export const IntelligenceOfficerDashboard = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, ASSIGNED, RETURNED, SUBMITTED, FINALISED
  const [selectedCase, setSelectedCase] = useState(null);
  const [showIntakeForm, setShowIntakeForm] = useState(false);
  const [showReportWizard, setShowReportWizard] = useState(false);
  
  // Wizard Selector Search & Filter States
  const [wizardSearchTerm, setWizardSearchTerm] = useState('');
  const [wizardFilterStatus, setWizardFilterStatus] = useState('ALL'); // ALL, ASSIGNED, RETURNED
  const [isEditingRightPane, setIsEditingRightPane] = useState(false);
  
  // Reports ledger states
  const [selectedReportIds, setSelectedReportIds] = useState([]);
  const [filterMonth, setFilterMonth] = useState('All');
  const [filterYear, setFilterYear] = useState('All');
  
  // Right-pane tab state: DOCUMENT, EVIDENCE, TIMELINE
  const [inspectorTab, setInspectorTab] = useState('DOCUMENT');

  // Search, Filter, Sort States
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('DATE_DESC'); // DATE_DESC, DATE_ASC, REF_ASC

  // Case Intake Form State ("Information Received")
  const [tin, setTin] = useState('');
  const [taxPayerName, setTaxPayerName] = useState('');
  const [taxPayerAddress, setTaxPayerAddress] = useState('');
  const [taxType, setTaxType] = useState('None');
  const [taxPeriod, setTaxPeriod] = useState('2026-Q1');
  const [summaryOfInformationCase, setSummaryOfInformationCase] = useState('');
  const [informerType, setInformerType] = useState('anonymous');
  const [informerName, setInformerName] = useState('');
  const [informerPhoneNum, setInformerPhoneNum] = useState('');
  const [informerNationalId, setInformerNationalId] = useState('');
  const [informerIdType, setInformerIdType] = useState('NATIONAL_ID'); // NATIONAL_ID | PASSPORT
  // Enhanced detailed intake states
  const [estimatedEvasionAmount, setEstimatedEvasionAmount] = useState('');
  const [intakeChannel, setIntakeChannel] = useState('Whistleblower Portal');
  const [priorityClassification, setPriorityClassification] = useState('MEDIUM');
  // Simulated OTP signature states
  const [otpCode, setOtpCode] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSending, setOtpSending] = useState(false);

  // Inline validation error states
  const [tinError, setTinError] = useState('');
  const [nationalIdError, setNationalIdError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [summaryError, setSummaryError] = useState('');
  const [amountError, setAmountError] = useState('');

  // Findings Report form state
  const [reportTitle, setReportTitle] = useState('');
  const [reportSubject, setReportSubject] = useState('');
  const [reportBody, setReportBody] = useState('');
  
  // Dynamic report sections
  const [reportSections, setReportSections] = useState([{ subject: '', text: '' }]);
  // Evidence upload state
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [fileInputKey, setFileInputKey] = useState(Date.now());

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
  
  // Mock Evidence Attachments State (stored in-memory for interactivity)
  const [evidenceAttachments, setEvidenceAttachments] = useState({
    'RRA-INTEL-2026-0041': [
      { id: 1, name: 'bank_statement_Q1_consolidated.pdf', size: '2.4 MB', description: 'Consolidated bank statement for Q1 showing undocumented transactions.', uploadedBy: 'Eric Gatera', date: '2026-05-26' },
      { id: 2, name: 'customs_clearance_manifest_R12.png', size: '1.8 MB', description: 'Customs declaration manifest showing undervalued assets.', uploadedBy: 'Eric Gatera', date: '2026-05-27' }
    ]
  });
  const [newFileName, setNewFileName] = useState('');
  // ── Draft Save State (persists per case ID across tab switches) ────────────
  const [savedDraftsByCase, setSavedDraftsByCase] = useState({});
  const [draftSavedAt, setDraftSavedAt] = useState(null); // timestamp of last save
  const [reportSubmitting, setReportSubmitting] = useState(false);
  
  // Pagination states
  const [casesPage, setCasesPage] = useState(1);
  const [casesPageSize, setCasesPageSize] = useState(10);
  const [reportsPage, setReportsPage] = useState(1);
  const [reportsPageSize, setReportsPageSize] = useState(10);
  
  // Location hook to read route path
  const location = useLocation();
  const navigate = useNavigate();
  const isReportsView = location.pathname === '/intelligence-officer/reports';

  // Reports Dashboard local state
  const [timeframe, setTimeframe] = useState('MONTHLY');
  const [reportsFilterType, setReportsFilterType] = useState('ALL');
  const [reportsFilterStatus, setReportsFilterStatus] = useState('ALL');
  const [reportsSearchQuery, setReportsSearchQuery] = useState('');
  const [reportsToast, setReportsToast] = useState(null);
  const [filterWithReportsOnly, setFilterWithReportsOnly] = useState(false);
  const [specificDateFilter, setSpecificDateFilter] = useState('');
  const [viewingReportCase, setViewingReportCase] = useState(null);

  const handleSpecificDateChange = (val) => {
    if (!val) {
      setSpecificDateFilter('');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    if (val > today) {
      setSpecificDateFilter('');
      setReportsToast("Validation Error: Cannot select a future date.");
      setTimeout(() => setReportsToast(null), 3000);
    } else {
      setSpecificDateFilter(val);
      setTimeframeFilter('ALL');
      setSelectedReportIds([]);
    }
  };

  // Mock data for Recharts area charts
  const monthlyChartData = [
    { name: 'Q1', approved: 240, returned: 45 },
    { name: 'Q2', approved: 380, returned: 70 },
    { name: 'Q3', approved: 510, returned: 30 },
    { name: 'Q4', approved: 620, returned: 85 }
  ];

  const weeklyChartData = [
    { name: 'Week 1', approved: 85, returned: 12 },
    { name: 'Week 2', approved: 98, returned: 15 },
    { name: 'Week 3', approved: 76, returned: 8 },
    { name: 'Week 4', approved: 110, returned: 22 }
  ];

  const initialReportsLog = [
    { id: '#RPT-2026-0041', type: 'Customs Fraud Analysis', author: 'Eric Gatera', date: '2026-05-28', confidence: 96, status: 'Approved' },
    { id: '#RPT-2026-0038', type: 'Corporate Evasion Audit', author: 'Alphonse Mugisha', date: '2026-05-24', confidence: 89, status: 'Approved' },
    { id: '#RPT-2026-0035', type: 'Under-Valuation Investigation', author: 'Eric Gatera', date: '2026-05-21', confidence: 94, status: 'Approved' },
    { id: '#RPT-2026-0031', type: 'Smuggling Ingress Assessment', author: 'Eric Gatera', date: '2026-05-18', confidence: 78, status: 'Returned for Revision' },
    { id: '#RPT-2026-0027', type: 'Asset Siphoning Profiling', author: 'Jane Mutoni', date: '2026-05-15', confidence: 92, status: 'Approved' },
    { id: '#RPT-2026-0022', type: 'Transit Leakage Mapping', author: 'Eric Gatera', date: '2026-05-10', confidence: 85, status: 'Draft' }
  ];

  const filteredReportsLog = initialReportsLog.filter(rpt => {
    const matchesSearch = rpt.id.toLowerCase().includes(reportsSearchQuery.toLowerCase()) || 
      rpt.type.toLowerCase().includes(reportsSearchQuery.toLowerCase());
    const matchesType = reportsFilterType === 'ALL' || rpt.type === reportsFilterType;
    const matchesStatus = reportsFilterStatus === 'ALL' || rpt.status === reportsFilterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const triggerReportsDownload = () => {
    setReportsToast('Downloading aggregated PDF digest...');
    setTimeout(() => setReportsToast(null), 3000);
  };

  const triggerSingleReportSave = (reportId) => {
    setReportsToast(`Report ${reportId} successfully archived to RRA secure storage.`);
    setTimeout(() => setReportsToast(null), 3000);
  };

  // Mock cases database matching the screen screenshot
  const excelMockCases = [
    { caseNum: 'CS/26/03/1', reportId: '1', taxpayerName: 'Aurore', tin: '107881619', taxType: 'PAYEE', taxPeriod: 'March 2025', status: 'REPORT_SUBMITTED', createdDate: '2026-03-24', lastUpdated: '2026-03-24', daysOpen: 1, referringOfficer: 'N/A', returnReason: 'N/A' },
    { caseNum: 'CS/26/04/7', reportId: '7', taxpayerName: 'asdfgh', tin: '987654322', taxType: 'None', taxPeriod: 'N/A', status: 'REPORT_RETURNED_ASSISTANT_COMMISSIONER', createdDate: '2026-04-18', lastUpdated: '2026-04-18', daysOpen: 1, referringOfficer: 'N/A', returnReason: 'N/A' },
    { caseNum: 'CS/26/04/8', reportId: 'No Report', taxpayerName: 'Aurore', tin: '101212', taxType: 'Income Tax', taxPeriod: 'N/A', status: 'CASE_CREATED', createdDate: '2026-04-26', lastUpdated: '2026-04-26', daysOpen: 1, referringOfficer: 'N/A', returnReason: 'N/A' },
    { caseNum: 'CS/26/05/30', reportId: '21', taxpayerName: 'Pierre', tin: '123412342', taxType: 'VAT', taxPeriod: 'March 2026', status: 'REPORT_REJECTED_BY_DIRECTOR', createdDate: '2026-05-25', lastUpdated: '2026-05-25', daysOpen: 1, referringOfficer: 'N/A', returnReason: 'N/A' },
    { caseNum: 'CS/26/05/10', reportId: 'No Report', taxpayerName: 'Jesse', tin: '887766554', taxType: 'Income Tax', taxPeriod: 'March 2026', status: 'CASE_CREATED', createdDate: '2026-05-09', lastUpdated: '2026-05-09', daysOpen: 1, referringOfficer: 'N/A', returnReason: 'N/A' },
    { caseNum: 'CS/26/05/22', reportId: '13', taxpayerName: 'Paul', tin: '123123123', taxType: 'Property Tax', taxPeriod: 'Q2 2025', status: 'REPORT_SUBMITTED_TO_DIRECTOR', createdDate: '2026-05-21', lastUpdated: '2026-05-21', daysOpen: 1, referringOfficer: 'N/A', returnReason: 'N/A' },
    { caseNum: 'CS/26/05/17', reportId: 'No Report', taxpayerName: 'test1', tin: '123456789', taxType: 'PAYEE', taxPeriod: 'March 2026', status: 'CASE_CREATED', createdDate: '2026-05-21', lastUpdated: '2026-05-21', daysOpen: 1, referringOfficer: 'N/A', returnReason: 'N/A' },
    { caseNum: 'CS/26/05/18', reportId: '9', taxpayerName: 'Racia', tin: '444432167', taxType: 'VAT', taxPeriod: 'March 2026', status: 'REPORT_SUBMITTED_TO_DIRECTOR', createdDate: '2026-05-21', lastUpdated: '2026-05-21', daysOpen: 1, referringOfficer: 'N/A', returnReason: 'N/A' },
    { caseNum: 'CS/26/05/19', reportId: '10', taxpayerName: 'Paul', tin: '222222222', taxType: 'PAYEE', taxPeriod: 'March 2026', status: 'REPORT_SUBMITTED_TO_DIRECTOR', createdDate: '2026-05-21', lastUpdated: '2026-05-21', daysOpen: 1, referringOfficer: 'N/A', returnReason: 'N/A' },
    { caseNum: 'CS/26/05/23', reportId: '14', taxpayerName: 'Shema', tin: '123424132', taxType: 'PAYEE', taxPeriod: 'March 2026', status: 'REPORT_SUBMITTED_TO_DIRECTOR', createdDate: '2026-05-21', lastUpdated: '2026-05-21', daysOpen: 1, referringOfficer: 'N/A', returnReason: 'N/A' },
    { caseNum: 'CS/26/05/20', reportId: '11', taxpayerName: 'Paul', tin: '222222222', taxType: 'PAYEE', taxPeriod: 'March 2026', status: 'REPORT_SUBMITTED_TO_DIRECTOR', createdDate: '2026-05-21', lastUpdated: '2026-05-21', daysOpen: 1, referringOfficer: 'N/A', returnReason: 'N/A' },
    { caseNum: 'CS/26/05/21', reportId: '12', taxpayerName: 'Clarisse', tin: '123213123', taxType: 'VAT', taxPeriod: 'March 2026', status: 'REPORT_SUBMITTED_TO_DIRECTOR', createdDate: '2026-05-21', lastUpdated: '2026-05-21', daysOpen: 1, referringOfficer: 'N/A', returnReason: 'N/A' },
    { caseNum: 'CS/26/05/24', reportId: '15', taxpayerName: 'Paul', tin: '123242113', taxType: 'PAYEE', taxPeriod: 'Q2 2025', status: 'REPORT_SUBMITTED_TO_DIRECTOR', createdDate: '2026-05-21', lastUpdated: '2026-05-21', daysOpen: 1, referringOfficer: 'N/A', returnReason: 'N/A' },
    { caseNum: 'CS/26/05/9', reportId: '8', taxpayerName: 'test1', tin: '123456789', taxType: 'VAT', taxPeriod: 'March 2026', status: 'REPORT_RETURNED_TO_DIRECTOR', createdDate: '2026-05-06', lastUpdated: '2026-05-22', daysOpen: 16, referringOfficer: 'N/A', returnReason: 'N/A' },
    { caseNum: 'CS/26/05/29', reportId: '20', taxpayerName: 'Collins', tin: '112131231', taxType: 'PAYEE', taxPeriod: 'March 2026', status: 'INVESTIGATION_REPORT_APPROVED', createdDate: '2026-05-22', lastUpdated: '2026-05-25', daysOpen: 3, referringOfficer: 'N/A', returnReason: 'N/A' },
    { caseNum: 'CS/26/05/31', reportId: '22', taxpayerName: 'Celestin', tin: '342343242', taxType: 'Corporate Tax', taxPeriod: 'Q2 2025', status: 'REPORT_SUBMITTED_TO_DIRECTOR', createdDate: '2026-05-25', lastUpdated: '2026-05-25', daysOpen: 1, referringOfficer: 'N/A', returnReason: 'N/A' },
    { caseNum: 'CS/26/05/26', reportId: '17', taxpayerName: 'Paul', tin: '435234523', taxType: 'PAYEE', taxPeriod: 'March 2026', status: 'CASE_PLAN_APPROVED_BY_ASSISTANT_COMMISSIONER', createdDate: '2026-05-22', lastUpdated: '2026-05-25', daysOpen: 3, referringOfficer: 'N/A', returnReason: 'N/A' },
    { caseNum: 'CS/26/05/25', reportId: '16', taxpayerName: 'Paul', tin: '213424324', taxType: 'VAT', taxPeriod: 'March 2026', status: 'REPORT_SUBMITTED_TO_INTELLIGENCE_OFFICER', createdDate: '2026-05-22', lastUpdated: '2026-05-24', daysOpen: 2, referringOfficer: 'N/A', returnReason: 'N/A' },
    { caseNum: 'CS/26/05/28', reportId: '19', taxpayerName: 'Paul', tin: '222222222', taxType: 'VAT', taxPeriod: 'March 2026', status: 'REPORT_SUBMITTED_TO_DIRECTOR', createdDate: '2026-05-24', lastUpdated: '2026-05-25', daysOpen: 1, referringOfficer: 'N/A', returnReason: 'N/A' },
    { caseNum: 'CS/26/05/27', reportId: '18', taxpayerName: 'Gisa', tin: '123412341', taxType: 'VAT', taxPeriod: 'March 2026', status: 'REPORT_SUBMITTED_TO_DIRECTOR', createdDate: '2026-05-25', lastUpdated: '2026-05-25', daysOpen: 1, referringOfficer: 'N/A', returnReason: 'N/A' },
    { caseNum: 'CS/26/05/38', reportId: '27', taxpayerName: 'Paul', tin: '123412341', taxType: 'Income Tax', taxPeriod: 'March 2026', status: 'INVESTIGATION_REPORT_APPROVED', createdDate: '2026-05-25', lastUpdated: '2026-05-25', daysOpen: 1, referringOfficer: 'N/A', returnReason: 'N/A' },
    { caseNum: 'CS/26/05/35', reportId: '24', taxpayerName: 'Paul', tin: '222222222', taxType: 'VAT', taxPeriod: 'March 2026', status: 'INVESTIGATION_REPORT_APPROVED', createdDate: '2026-05-25', lastUpdated: '2026-05-25', daysOpen: 1, referringOfficer: 'N/A', returnReason: 'N/A' },
    { caseNum: 'CS/26/05/34', reportId: '23', taxpayerName: 'Racia', tin: '433333333', taxType: 'None', taxPeriod: 'N/A', status: 'REPORT_RETURNED_TO_DIRECTOR', createdDate: '2026-05-25', lastUpdated: '2026-05-25', daysOpen: 1, referringOfficer: 'N/A', returnReason: 'N/A' },
    { caseNum: 'CS/26/05/32', reportId: '23', taxpayerName: 'Viateur', tin: '999999999', taxType: 'None', taxPeriod: 'N/A', status: 'REPORT_RETURNED_TO_DIRECTOR', createdDate: '2026-05-25', lastUpdated: '2026-05-25', daysOpen: 1, referringOfficer: 'N/A', returnReason: 'N/A' },
    { caseNum: 'CS/26/05/37', reportId: '28', taxpayerName: 'Jesse', tin: '434534253', taxType: 'None', taxPeriod: 'N/A', status: 'REPORT_SUBMITTED_TO_DIRECTOR', createdDate: '2026-05-25', lastUpdated: '2026-05-25', daysOpen: 1, referringOfficer: 'N/A', returnReason: 'N/A' },
    { caseNum: 'CS/26/05/33', reportId: '26', taxpayerName: 'souvere', tin: '444444444', taxType: 'None', taxPeriod: 'N/A', status: 'REPORT_SUBMITTED_TO_DIRECTOR', createdDate: '2026-05-25', lastUpdated: '2026-05-25', daysOpen: 1, referringOfficer: 'N/A', returnReason: 'N/A' },
    { caseNum: 'CS/26/05/36', reportId: '27', taxpayerName: 'Shema', tin: '34234523', taxType: 'None', taxPeriod: 'N/A', status: 'REPORT_REJECTED_BY_DIRECTOR', createdDate: '2026-05-25', lastUpdated: '2026-05-25', daysOpen: 1, referringOfficer: 'N/A', returnReason: 'N/A' }
  ];

  // Filter mock cases based on all UI criteria
  const filteredExportCases = excelMockCases.filter(c => {
    let matchesTime = true;
    const itemDate = new Date(c.createdDate);
    if (filterMonth !== 'All') {
       matchesTime = matchesTime && (itemDate.getMonth() + 1).toString() === filterMonth;
    }
    if (filterYear !== 'All') {
       matchesTime = matchesTime && itemDate.getFullYear().toString() === filterYear;
    }
    if (!matchesTime) return false;

    // 2. Search query
    if (reportsSearchQuery) {
      const q = reportsSearchQuery.toLowerCase();
      const match = 
        c.caseNum.toLowerCase().includes(q) ||
        c.reportId?.toString().toLowerCase().includes(q) ||
        c.taxpayerName.toLowerCase().includes(q) ||
        c.tin?.toString().toLowerCase().includes(q) ||
        c.taxType?.toLowerCase().includes(q) ||
        c.status?.toLowerCase().includes(q);
      if (!match) return false;
    }

    // 3. Status filter
    if (reportsFilterStatus !== 'ALL') {
      if (reportsFilterStatus === 'Approved' && !c.status.includes('APPROVED')) return false;
      if (reportsFilterStatus === 'Returned for Revision' && !(c.status.includes('RETURNED') || c.status.includes('REJECTED'))) return false;
      if (reportsFilterStatus === 'Draft' && !c.status.includes('CREATED') && !c.status.includes('ASSIGNED')) return false;
    }

    // 4. Type filter
    if (reportsFilterType !== 'ALL') {
      if (c.taxType !== reportsFilterType) return false;
    }

    // 5. Specific Date Filter (Validation enforced: past/today only)
    if (specificDateFilter) {
      if (c.createdDate !== specificDateFilter) return false;
    }

    return true;
  });

  const totalReportsPages = Math.max(1, Math.ceil(filteredExportCases.length / reportsPageSize));
  const activeReportsPage = Math.min(reportsPage, totalReportsPages);
  const paginatedReports = filteredExportCases.slice(
    (activeReportsPage - 1) * reportsPageSize,
    (activeReportsPage - 1) * reportsPageSize + reportsPageSize
  );

  const handleToggleSelectAll = () => {
    if (selectedReportIds.length === filteredExportCases.length) {
      setSelectedReportIds([]);
    } else {
      setSelectedReportIds(filteredExportCases.map(c => c.caseNum));
    }
  };

  const handleToggleSelectRow = (caseNum) => {
    setSelectedReportIds(prev => 
      prev.includes(caseNum) 
        ? prev.filter(id => id !== caseNum) 
        : [...prev, caseNum]
    );
  };

  const handleExportToExcel = () => {
    const targetCases = selectedReportIds.length > 0
      ? excelMockCases.filter(c => selectedReportIds.includes(c.caseNum))
      : filteredExportCases;

    if (targetCases.length === 0) {
      setReportsToast("No reports selected or available to export.");
      setTimeout(() => setReportsToast(null), 3000);
      return;
    }

    const headers = [
      "Case Number", "Report ID", "Taxpayer Name", "TIN", "Tax Type", 
      "Tax Period", "Status", "Created Date", "Last Updated", "Days Open", 
      "Referring Officer", "Return Reason"
    ];
    
    let csvContent = "\ufeff"; // Add BOM for Excel UTF-8
    
    // Add Sheet title & Timestamp
    csvContent += `"RRA SIIDS INTELLIGENCE REPORT EXPORT (${targetCases.length} records)"\n`;
    csvContent += `"Export timeframe: ${timeframeFilter}"\n`;
    csvContent += `"Generated on: ${new Date().toLocaleString()}"\n\n`;
    
    // Add Headers
    csvContent += headers.map(h => `"${h}"`).join(",") + "\n";
    
    // Add Rows
    targetCases.forEach(c => {
      const row = [
        c.caseNum, c.reportId, c.taxpayerName, c.tin, c.taxType,
        c.taxPeriod, c.status, c.createdDate, c.lastUpdated,
        c.daysOpen, c.referringOfficer, c.returnReason
      ];
      csvContent += row.map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(",") + "\n";
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const encodedUri = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const fileName = `RRA_Intelligence_Reports_${timeframeFilter.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Revoke blob URL to prevent memory leak
    setTimeout(() => URL.revokeObjectURL(encodedUri), 100);

    setReportsToast(`✅ Successfully exported ${targetCases.length} reports to ${fileName}`);
    setTimeout(() => setReportsToast(null), 4000);
  };

  // Fetch Cases
  const { data: casesResponse, isLoading: isCasesLoading } = useQuery({
    queryKey: ['cases'],
    queryFn: () => apiClient.get('/cases').catch(() => ({ data: { data: [] } }))
  });
  const casesList = casesResponse?.data?.data || [];

  // Fetch Reports
  const { data: reportsResponse } = useQuery({
    queryKey: ['reports'],
    queryFn: () => apiClient.get('/reports')
  });
  const reportsList = reportsResponse?.data?.data || [];

  // KPI calculations based on fetched lists
  // Case formatting helpers
  const formatCaseId = (id) => {
    if (!id) return '';
    if (id.startsWith('CS/')) return id;
    const match = id.match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[1]);
      return `CS/26/05/${num}`;
    }
    return id;
  };

  const formatReportId = (item, index) => {
    if (item.reportId) return item.reportId;
    return 20 + (index % 10);
  };

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

  // Grouping status definitions for aligned counting and filtering
  const isPendingReview = (item) => {
    return item.status === 'REPORT_SUBMITTED' || 
           item.status === 'PENDING_AC_SIGNATURE' || 
           item.status === 'PENDING_DIRECTOR_SIGNATURE' || 
           item.status === 'REPORT_SUBMITTED_TO_DIRECTOR' ||
           (item.status?.includes('SUBMITTED') && item.status !== 'REPORT_SUBMITTED_TO_INTELLIGENCE_OFFICER');
  };

  const isReturned = (item) => {
    return item.status?.includes('RETURNED') || 
           item.status?.includes('REJECTED') || 
           item.status === 'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER' ||
           item.status === 'REPORT_RETURNED_TO_DIRECTOR' ||
           item.status === 'REPORT_REJECTED_BY_DIRECTOR';
  };

  const isInProgress = (item) => {
    return item.status === 'ASSIGNED' || 
           item.status === 'CREATED' || 
           item.status === 'CASE_CREATED' || 
           item.status === 'REPORT_SUBMITTED_TO_INTELLIGENCE_OFFICER' ||
           item.status === 'CASE_PLAN_APPROVED_BY_ASSISTANT_COMMISSIONER' ||
           item.status === 'REPORT_ASSIGNED_TO_INVESTIGATION_OFFICER';
  };

  // KPI/Tab counts calculations
  const allCount = casesList.length;
  const createdCount = casesList.filter(isInProgress).length;
  const pendingReviewCount = casesList.filter(isPendingReview).length;
  
  const returnedCases = casesList.filter(isReturned);
  const returnedCount = returnedCases.length;
  const approvedCount = casesList.filter(c => c.status === 'FINALISED' || c.status?.includes('APPROVED')).length;
  const closedCount = casesList.filter(c => c.status === 'CLOSED' || c.status === 'INVESTIGATION_COMPLETED').length;
  const withReportsCount = casesList.filter(item => !!item.reportId || reportsList.some(r => r.caseId === item.id)).length;

  const highPriorityCasesList = casesList.filter(c => c.status === 'ASSIGNED').slice(0, 2);
  const attentionItems = [
    ...returnedCases.map(c => ({ ...c, attentionType: 'RETURNED' })),
    ...highPriorityCasesList.map(c => ({ ...c, attentionType: 'HIGH_PRIORITY' }))
  ];

  // Secondary sub-metrics for UI Navigation cards
  const acPendingCount = casesList.filter(c => c.status === 'PENDING_AC_SIGNATURE').length;
  const directorPendingCount = casesList.filter(c => c.status === 'PENDING_DIRECTOR_SIGNATURE' || c.status === 'REPORT_SUBMITTED_TO_DIRECTOR' || c.status === 'REPORT_SUBMITTED').length;
  const urgentReturnedCount = casesList.filter(c => isReturned(c) && (c.priorityClassification === 'URGENT' || c.priorityClassification === 'HIGH')).length;
  const newAssignmentsCount = casesList.filter(c => isInProgress(c) && !c.reportId).length;
  const draftsInProgressCount = casesList.filter(c => isInProgress(c) && !!c.reportId).length;

  // Filter & Search & Sort Logic for Case Queue
  const processedCases = casesList
    .filter(item => {
      // 1. Tab Filter
      if (activeTab === 'CREATED') return isInProgress(item);
      if (activeTab === 'PENDING_REVIEW') return isPendingReview(item);
      if (activeTab === 'RETURNED') return isReturned(item);
      if (activeTab === 'APPROVED') return item.status === 'FINALISED' || item.status?.includes('APPROVED');
      if (activeTab === 'CLOSED') return item.status === 'CLOSED' || item.status === 'INVESTIGATION_COMPLETED';
      if (activeTab === 'WITH_REPORTS') return !!item.reportId || reportsList.some(r => r.caseId === item.id);
      return true; // ALL
    })
    .filter(item => {
      // 2. Filter with reports only
      if (filterWithReportsOnly) {
        return !!item.reportId || reportsList.some(r => r.caseId === item.id);
      }
      return true;
    })
    .filter(item => {
      // 3. Search Filter
      const searchLower = searchTerm.toLowerCase();
      const caseIdMatch = item.id?.toString().toLowerCase().includes(searchLower) || false;
      const caseNumMatch = item.caseNum?.toLowerCase().includes(searchLower) || false;
      const subjectMatch = (item.subject || item.summaryOfInformationCase || '').toLowerCase().includes(searchLower);
      const tinMatch = item.taxPayer?.taxPayerTIN?.toLowerCase().includes(searchLower) || false;
      const taxPayerMatch = item.taxPayer?.taxPayerName?.toLowerCase().includes(searchLower) || false;
      return caseIdMatch || caseNumMatch || subjectMatch || tinMatch || taxPayerMatch;
    })
    .sort((a, b) => {
      // 4. Sort Order
      if (sortOrder === 'DATE_DESC') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortOrder === 'DATE_ASC') return new Date(a.createdAt) - new Date(b.createdAt);
      return 0;
    });

  const totalCasesPages = Math.max(1, Math.ceil(processedCases.length / casesPageSize));
  const activeCasesPage = Math.min(casesPage, totalCasesPages);
  const paginatedCases = processedCases.slice(
    (activeCasesPage - 1) * casesPageSize,
    (activeCasesPage - 1) * casesPageSize + casesPageSize
  );

  // Filter cases eligible for Report Generation Wizard
  const eligibleCases = casesList.filter(c => {
    const isEligibleStatus = c.status === 'ASSIGNED' || c.status?.includes('RETURNED') || c.status === 'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER';
    
    const matchesSearch = !wizardSearchTerm ? true : (
      c.id?.toString().toLowerCase().includes(wizardSearchTerm.toLowerCase()) ||
      (c.caseNum || '').toLowerCase().includes(wizardSearchTerm.toLowerCase()) ||
      (c.taxPayer?.taxPayerName || '').toLowerCase().includes(wizardSearchTerm.toLowerCase()) ||
      (c.taxPayer?.taxPayerTIN || '').toLowerCase().includes(wizardSearchTerm.toLowerCase())
    );

    let matchesStatus = true;
    if (wizardFilterStatus === 'ASSIGNED') {
      matchesStatus = c.status === 'ASSIGNED';
    } else if (wizardFilterStatus === 'RETURNED') {
      matchesStatus = c.status?.includes('RETURNED') || c.status === 'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER';
    }

    return isEligibleStatus && matchesSearch && matchesStatus;
  });

  // Create Case Mutation (Intake Form)
  const createCaseMutation = useMutation({
    mutationFn: (payload) => apiClient.post('/cases', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['cases']);
      resetIntakeForm();
      setShowIntakeForm(false);
    }
  });

  // Create Report Mutation
  const createReportMutation = useMutation({
    mutationFn: (payload) => apiClient.post('/reports', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['reports']);
      queryClient.invalidateQueries(['cases']);
      setSelectedCase(null);
      resetReportForm();
      setShowReportWizard(false);
      setIsEditingRightPane(false);
    }
  });

  // Edit/Re-submit Report Mutation
  const editReportMutation = useMutation({
    mutationFn: ({ id, payload }) => apiClient.put(`/reports/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['reports']);
      queryClient.invalidateQueries(['cases']);
      setSelectedCase(null);
      resetReportForm();
      setShowReportWizard(false);
      setIsEditingRightPane(false);
    }
  });

  const resetReportForm = () => {
    setReportTitle('');
    setReportSubject('');
    setReportBody('');
    setReportSections([{ subject: '', text: '' }]);
  };

  // ── Validation helpers ─────────────────────────────────────────────────────
  const validateTIN = (val) => {
    const clean = val.trim();
    if (!clean) return 'TIN is required.';
    if (!/^\d{9}$/.test(clean)) return 'TIN must be exactly 9 numeric digits.';
    return '';
  };

  const validateNationalId = (val) => {
    const clean = val.trim();
    if (!clean) return 'National ID is required.';
    if (!/^\d{16}$/.test(clean)) return 'National ID must be exactly 16 numeric digits.';
    return '';
  };

  const validatePassport = (val) => {
    const clean = val.trim();
    if (!clean) return 'Passport number is required.';
    if (!/^[A-Za-z0-9]{1,16}$/.test(clean)) return 'Passport must be 1–16 alphanumeric characters.';
    return '';
  };

  const validatePhone = (val) => {
    const clean = val.trim();
    if (!clean) return 'Phone number is required.';
    // Accepts: +250XXXXXXXXX (12 chars) or 07XXXXXXXX (10 digits)
    if (!/^(\+250\d{9}|07\d{8})$/.test(clean)) {
      return 'Enter a valid Rwanda number: +250XXXXXXXXX or 07XXXXXXXX.';
    }
    return '';
  };

  // ── Full Intake Form Reset ──────────────────────────────────────────────────
  const resetIntakeForm = () => {
    setTin('');
    setTaxPayerName('');
    setTaxPayerAddress('');
    setTaxType('None');
    setTaxPeriod('2026-Q1');
    setSummaryOfInformationCase('');
    setInformerType('anonymous');
    setInformerName('');
    setInformerPhoneNum('');
    setInformerNationalId('');
    setInformerIdType('NATIONAL_ID');
    setEstimatedEvasionAmount('');
    setIntakeChannel('Whistleblower Portal');
    setPriorityClassification('MEDIUM');
    setOtpCode('');
    setOtpInput('');
    setIsOtpSent(false);
    setIsOtpVerified(false);
    setOtpError('');
    setOtpSending(false);
    // Clear validation errors
    setTinError('');
    setNationalIdError('');
    setPhoneError('');
    setSummaryError('');
    setAmountError('');
  };

  const handleSendIntakeOtp = () => {
    const phoneErr = validatePhone(informerPhoneNum);
    if (phoneErr) {
      setPhoneError(phoneErr);
      setOtpError(phoneErr);
      return;
    }
    setOtpSending(true);
    setOtpError('');

    // Simulate SMS delay
    setTimeout(() => {
      const generatedCode = Math.floor(1000 + Math.random() * 9000).toString();
      setOtpCode(generatedCode);
      setIsOtpSent(true);
      setOtpSending(false);
      setReportsToast(`[SMS GATEWAY MOCK] Verification OTP sent to ${informerPhoneNum}: ${generatedCode}`);
      setTimeout(() => setReportsToast(null), 10000);
    }, 1000);
  };

  const handleVerifyIntakeOtp = () => {
    if (!otpInput || otpInput.length !== 4) {
      setOtpError('Please enter the 4-digit verification code.');
      return;
    }
    if (otpInput === otpCode) {
      setIsOtpVerified(true);
      setOtpError('');
      setReportsToast('✅ OTP digital signature verified successfully.');
      setTimeout(() => setReportsToast(null), 3000);
    } else {
      setOtpError('Invalid verification code. Please try again.');
    }
  };

  const handleIntakeSubmit = (e) => {
    e.preventDefault();

    // ── Run all field validations ────────────────────────────────────────────
    let hasErrors = false;

    const tinErr = validateTIN(tin);
    setTinError(tinErr);
    if (tinErr) hasErrors = true;

    if (!summaryOfInformationCase.trim() || summaryOfInformationCase.trim().length < 20) {
      setSummaryError('Summary must be at least 20 characters.');
      hasErrors = true;
    } else {
      setSummaryError('');
    }

    if (estimatedEvasionAmount && (isNaN(estimatedEvasionAmount) || Number(estimatedEvasionAmount) <= 0)) {
      setAmountError('Estimated amount must be a positive number.');
      hasErrors = true;
    } else {
      setAmountError('');
    }

    if (informerType === 'identified') {
      const phoneErr = validatePhone(informerPhoneNum);
      setPhoneError(phoneErr);
      if (phoneErr) hasErrors = true;

      const idErr = informerIdType === 'NATIONAL_ID'
        ? validateNationalId(informerNationalId)
        : validatePassport(informerNationalId);
      setNationalIdError(idErr);
      if (idErr) hasErrors = true;

      if (!isOtpVerified) {
        setOtpError('Identified informers must complete OTP signature verification before submitting.');
        hasErrors = true;
      }
    }

    if (hasErrors) return;

    const payload = {
      tin: tin.trim(),
      taxPayerName: taxPayerName.trim(),
      taxPayerAddress: taxPayerAddress.trim(),
      taxType,
      taxPeriod,
      summaryOfInformationCase: summaryOfInformationCase.trim(),
      informerType,
      informerName: informerType === 'anonymous' ? 'Anonymous' : informerName.trim(),
      informerPhoneNum: informerType === 'anonymous' ? '' : informerPhoneNum.trim(),
      informerNationalId: informerType === 'anonymous' ? '' : informerNationalId.trim(),
      informerIdType: informerType === 'anonymous' ? null : informerIdType,
      referringDepartment: 'Strategic Intelligence Division',
      estimatedEvasionAmount: estimatedEvasionAmount ? parseInt(estimatedEvasionAmount) : 0,
      intakeChannel,
      priorityClassification,
      isOtpVerified: informerType === 'identified'
    };

    createCaseMutation.mutate(payload);
  };


  const parseReportBody = (bodyText) => {
    if (!bodyText) return [{ subject: '', text: '' }];
    const parts = bodyText.split(/(?=### )/g);
    const sections = [];
    parts.forEach(part => {
      const match = part.match(/^### (.*?)\n([\s\S]*)/);
      if (match) {
        sections.push({ subject: match[1].trim(), text: match[2].trim() });
      } else {
        const trimmed = part.trim();
        if (trimmed) {
          sections.push({ subject: '', text: trimmed });
        }
      }
    });
    return sections.length > 0 ? sections : [{ subject: '', text: '' }];
  };

  const handleReportSubmit = (e) => {
    e.preventDefault();
    if (!selectedCase) return;

    const currentAttachments = evidenceAttachments[selectedCase.id] || [];

    // Compile dynamic paragraphs into a single markdown-like string
    const compiledBody = reportSections.map(s => {
      if (s.subject.trim()) {
        return `### ${s.subject.trim()}\n${s.text.trim()}`;
      }
      return s.text.trim();
    }).filter(Boolean).join('\n\n');

    const payload = {
      caseId: selectedCase.id,
      title: reportTitle,
      subject: reportSubject,
      body: compiledBody,
      attachments: currentAttachments,
      submittedTo: 'INTELLIGENCE_DIRECTOR',
      recipientTitle: 'Director of Intelligence'
    };

    if (selectedCase.reportId) {
      editReportMutation.mutate({
        id: selectedCase.reportId,
        payload: {
          ...payload,
          editorName: 'Eric Gatera - Intelligence Officer',
          status: 'PENDING_DIRECTOR_SIGNATURE'
        }
      });
    } else {
      createReportMutation.mutate(payload);
    }

    // Clear saved draft for this case once officially sent
    const key = selectedCase.id || selectedCase.caseNum;
    setSavedDraftsByCase(prev => { const n = {...prev}; delete n[key]; return n; });
    setDraftSavedAt(null);
  };

  const loadReportForEditing = (caseItem) => {
    const draftKey = caseItem.id || caseItem.caseNum;
    const savedDraft = savedDraftsByCase[draftKey];
    if (savedDraft) {
      setReportTitle(savedDraft.title);
      setReportSubject(savedDraft.subject);
      setReportSections(savedDraft.sections);
      setReportBody('');
      return;
    }
    const matchedReport = reportsList.find(r => r.caseId === caseItem.id || r.id === caseItem.reportId);
    if (matchedReport) {
      setReportTitle(matchedReport.title);
      setReportSubject(matchedReport.subject);
      const parsed = parseReportBody(matchedReport.body);
      setReportSections(parsed);
      setReportBody(matchedReport.body);
    } else {
      setReportTitle(`Intelligence Findings: ${caseItem.caseNum || caseItem.id}`);
      setReportSubject(caseItem.taxPayer?.taxPayerName || caseItem.subject || 'Suspected Infraction');
      const text = caseItem.summaryOfInformationCase || caseItem.description || '';
      setReportSections([{ subject: '', text }]);
      setReportBody(text);
    }
  };

  const handleAddEvidence = (e) => {
    e.preventDefault();
    if (!evidenceFile || !selectedCase) return;

    const newFile = {
      id: Date.now(),
      name: evidenceFile.name,
      size: `${(evidenceFile.size / (1024 * 1024)).toFixed(2)} MB`,
      description: evidenceDescription.trim() || 'No description provided',
      uploadedBy: 'Eric Gatera',
      date: new Date().toISOString().split('T')[0]
    };

    setEvidenceAttachments({
      ...evidenceAttachments,
      [selectedCase.id]: [...(evidenceAttachments[selectedCase.id] || []), newFile]
    });
    setEvidenceFile(null);
    setEvidenceDescription('');
    setFileInputKey(Date.now());
  };

  const handleDeleteEvidence = (fileId) => {
    if (!selectedCase) return;
    setEvidenceAttachments({
      ...evidenceAttachments,
      [selectedCase.id]: (evidenceAttachments[selectedCase.id] || []).filter(f => f.id !== fileId)
    });
  };

  const handleAddParagraph = () => {
    setReportSections([...reportSections, { subject: '', text: '' }]);
  };

  const handleUpdateParagraph = (index, field, value) => {
    const updated = reportSections.map((s, idx) => {
      if (idx === index) {
        return { ...s, [field]: value };
      }
      return s;
    });
    setReportSections(updated);
  };

  const handleRemoveParagraph = (index) => {
    if (reportSections.length === 1) return;
    setReportSections(reportSections.filter((_, idx) => idx !== index));
  };

  const handleViewCaseDocument = (caseItem) => {
    if (isReportsView) {
      setViewingReportCase(caseItem);
    } else {
      let matchedCase = casesList.find(c => c.id === caseItem.caseNum || c.id === caseItem.id || c.caseNum === caseItem.caseNum);
      if (!matchedCase) {
        matchedCase = {
          id: caseItem.caseNum,
          caseNum: caseItem.caseNum,
          taxPayer: {
            taxPayerTIN: caseItem.tin,
            taxPayerName: caseItem.taxpayerName,
            taxPayerAddress: 'N/A'
          },
          taxPeriod: caseItem.taxPeriod,
          taxType: caseItem.taxType,
          status: caseItem.status,
          createdAt: caseItem.createdDate || new Date().toISOString(),
          summaryOfInformationCase: 'Findings compiled from aggregated database.',
          reportId: caseItem.reportId === 'No Report' ? null : caseItem.reportId
        };
      }
      setSelectedCase(matchedCase);
      setIsEditingRightPane(false);
      loadReportForEditing(matchedCase);
      setInspectorTab('DOCUMENT');
    }
  };

  const handleDownloadCaseReport = (caseItem) => {
    const hasReport = (caseItem.reportId && caseItem.reportId !== 'No Report') || reportsList.some(r => r.caseId === caseItem.id);
    const draft = savedDraftsByCase[caseItem.id || caseItem.caseNum];
    const sections = draft?.sections || reportSections;
    const title = draft?.title || reportTitle || `Intelligence Findings: ${caseItem.caseNum || caseItem.id}`;
    const subject = draft?.subject || reportSubject || caseItem.taxPayer?.taxPayerName || 'Suspected Infraction';
    const summary = caseItem.summaryOfInformationCase || caseItem.description || '';
    const attachments = evidenceAttachments[caseItem.id] || [];

    if (hasReport || draft) {
      generateAndDownloadPDF(caseItem, title, subject, sections, summary, attachments);
    } else {
      setReportsToast(`No report draft registered for Case ${caseItem.caseNum || caseItem.id}. Please create a report first.`);
      setTimeout(() => setReportsToast(null), 4000);
    }
  };

  // ── Save Findings Draft (locally, no API call) ────────────────────────────
  const handleSaveDraft = () => {
    if (!selectedCase) return;
    const key = selectedCase.id || selectedCase.caseNum;
    setSavedDraftsByCase(prev => ({
      ...prev,
      [key]: {
        title: reportTitle,
        subject: reportSubject,
        sections: reportSections,
        savedAt: new Date().toISOString()
      }
    }));
    const now = new Date();
    setDraftSavedAt(now);
    setReportsToast(`✅ Draft saved locally — ${now.toLocaleTimeString()}. You can continue editing and submit later.`);
    setTimeout(() => setReportsToast(null), 4000);
  };

  // ── Send Report to Intelligence Director ──────────────────────────────────
  const handleSendToDirector = (e) => {
    e.preventDefault();
    if (!selectedCase) return;
    if (!reportTitle.trim() || !reportSubject.trim()) {
      setReportsToast('⚠️ Please fill in Report Title and Subject before sending.');
      setTimeout(() => setReportsToast(null), 4000);
      return;
    }
    const hasContent = reportSections.some(s => s.text.trim().length > 0);
    if (!hasContent) {
      setReportsToast('⚠️ At least one findings paragraph must have content before sending.');
      setTimeout(() => setReportsToast(null), 4000);
      return;
    }

    const currentAttachments = evidenceAttachments[selectedCase.id] || [];
    const compiledBody = reportSections.map(s => {
      if (s.subject.trim()) return `### ${s.subject.trim()}\n${s.text.trim()}`;
      return s.text.trim();
    }).filter(Boolean).join('\n\n');

    const payload = {
      caseId: selectedCase.id,
      title: reportTitle,
      subject: reportSubject,
      body: compiledBody,
      attachments: currentAttachments,
      submittedTo: 'INTELLIGENCE_DIRECTOR',
      recipientTitle: 'Director of Intelligence'
    };

    setReportSubmitting(true);

    if (selectedCase.reportId) {
      editReportMutation.mutate({
        id: selectedCase.reportId,
        payload: {
          ...payload,
          editorName: 'Eric Gatera - Intelligence Officer',
          status: 'PENDING_DIRECTOR_SIGNATURE'
        }
      }, {
        onSettled: () => setReportSubmitting(false)
      });
    } else {
      createReportMutation.mutate(payload, {
        onSettled: () => setReportSubmitting(false)
      });
    }
    // Clear saved draft for this case once officially sent
    const key = selectedCase.id || selectedCase.caseNum;
    setSavedDraftsByCase(prev => { const n = {...prev}; delete n[key]; return n; });
    setDraftSavedAt(null);
  };

  // ── PDF Generation — Opens report in new window and prints/saves ────────────
  // ── Unified RRA PDF Download (saves directly to disk — no print dialog) ──
  const generateAndDownloadPDF = (caseItem, title, subject, sections, summary, attachments) => {
    if (!caseItem) return;

    const isAcSigned  = caseItem.signatures?.some(s => s.role === 'AC') ||
                        ['PENDING_DIRECTOR_SIGNATURE','FINALISED','INVESTIGATION_COMPLETED']
                          .includes(caseItem.status) ||
                        caseItem.status?.includes('APPROVED');
    const isDoiSigned = caseItem.signatures?.some(s => s.role === 'DIRECTOR_OF_INTELLIGENCE') ||
                        ['FINALISED','INVESTIGATION_COMPLETED'].includes(caseItem.status) ||
                        caseItem.status?.includes('APPROVED');

    const taxpayerName = caseItem?.taxPayer?.taxPayerName || caseItem?.taxpayerName || '—';
    const tin          = caseItem?.taxPayer?.taxPayerTIN  || caseItem?.tin          || '—';
    const caseRef      = caseItem?.caseNum || `CASE-${caseItem?.id || 'UNKNOWN'}`;

    generateRRAPdf({
      reportId:       caseRef,
      caseRef,
      title:          title   || 'Intelligence Findings Report',
      subject:        subject || taxpayerName,
      taxpayerName,
      tin,
      dateCompiled:   new Date().toLocaleDateString('en-RW', { year: 'numeric', month: 'long', day: 'numeric' }),
      preparedBy:     'Eric Gatera',
      preparedByRole: 'Intelligence Officer',
      status:         caseItem?.status || '',
      body:           summary || '',
      sections:       (sections || []).map(sec => ({ subject: sec.subject || '', text: sec.text || '' })),
      attachments:    (attachments || []).map(att => ({
                        name:        att.name        || '',
                        size:        att.size        || '',
                        description: att.description || '',
                      })),
      acSignature:  { signed: isAcSigned,  name: 'AC Ronald Niwenshuti' },
      dirSignature: { signed: isDoiSigned, name: 'Director Christian Mugunga' },
      rejectionReason: caseItem?.rejectionReason || null,
      returnReason:    caseItem?.returnReason    || null,
    });

    setReportsToast('✅ PDF saved to your Downloads folder.');
    setTimeout(() => setReportsToast(null), 4000);
  };

  const getTimelineEvents = (caseItem) => {
    const events = [
      { 
        title: 'Information Received', 
        desc: 'Incoming intelligence registered by System Intake Engine.', 
        operator: 'System Intake Engine', 
        date: caseItem.createdAt, 
        type: 'intake' 
      }
    ];

    if (caseItem.status !== 'ASSIGNED') {
      events.push({ 
        title: 'Assigned to Officer', 
        desc: 'Case assigned to Eric Gatera for detailed investigation.', 
        operator: 'AC Ronald Niwenshuti', 
        date: caseItem.createdAt, 
        type: 'assign' 
      });
    }

    if (caseItem.reportId || caseItem.status === 'REPORT_SUBMITTED' || caseItem.status?.includes('SIGNATURE') || caseItem.status === 'FINALISED') {
      events.push({ 
        title: 'Draft Report Prepared', 
        desc: 'Report document created and findings details compiled.', 
        operator: 'Eric Gatera (Intelligence Officer)', 
        date: caseItem.createdAt, 
        type: 'draft' 
      });
    }

    if (caseItem.status === 'REPORT_SUBMITTED' || caseItem.status?.includes('SIGNATURE') || caseItem.status === 'FINALISED') {
      events.push({ 
        title: 'Submitted for Approval', 
        desc: 'Intelligence folder dispatched to AC for review.', 
        operator: 'Eric Gatera (Intelligence Officer)', 
        date: new Date(caseItem.createdAt).getTime() + 3600000, 
        type: 'submit' 
      });
    }

    if (caseItem.status === 'PENDING_DIRECTOR_SIGNATURE' || caseItem.status === 'FINALISED') {
      events.push({ 
        title: 'Co-Signed by AC', 
        desc: 'Assistant Commissioner Ronald Niwenshuti signed and validated details.', 
        operator: 'AC Ronald Niwenshuti', 
        date: new Date(caseItem.createdAt).getTime() + 7200000, 
        type: 'ac_sign' 
      });
    }

    if (caseItem.status === 'FINALISED') {
      events.push({ 
        title: 'Finalised & Locked', 
        desc: 'Director Christian Mugunga signed and closed the investigation file.', 
        operator: 'Director Christian Mugunga', 
        date: new Date(caseItem.createdAt).getTime() + 14400000, 
        type: 'doi_sign' 
      });
    }

    if (caseItem.status?.includes('RETURNED') || caseItem.status === 'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER') {
      events.push({ 
        title: 'Returned for Revision', 
        desc: caseItem.returnReason || 'Revision requested: verification documents missing.', 
        operator: 'Director Christian Mugunga', 
        date: new Date().toISOString(), 
        type: 'return' 
      });
    }

    return events.reverse();
  };

  // LEFT COLUMN VIEW
  const leftPaneView = (
    <div className="intel-off-left-workspace custom-scrollbar">
      {/* Navigation & Action Overview Cards */}
      <div className="intel-overview-cards-strip">
        {/* Card 1: Pending Approval */}
        <div 
          className={`intel-nav-card card-blue ${activeTab === 'PENDING_REVIEW' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab(activeTab === 'PENDING_REVIEW' ? 'ALL' : 'PENDING_REVIEW');
            setSelectedCase(null);
          }}
        >
          <div className="nav-card-main-row">
            <div className="nav-card-icon-container">
              <Clock size={20} />
            </div>
            <div className="nav-card-counter">{pendingReviewCount}</div>
          </div>
          <div className="nav-card-details">
            <span className="nav-card-title">Pending Approval</span>
            <span className="nav-card-subtitle">Awaiting supervisor sign-off</span>
          </div>
          <div className="nav-card-metrics-row">
            <span className="nav-card-badge badge-blue">
              {acPendingCount} AC | {directorPendingCount} Dir
            </span>
            <span className="nav-card-percentage">
              {Math.round((pendingReviewCount / (casesList.length || 1)) * 100)}% of queue
            </span>
          </div>
        </div>

        {/* Card 2: Returned for Revision */}
        <div 
          className={`intel-nav-card card-orange ${activeTab === 'RETURNED' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab(activeTab === 'RETURNED' ? 'ALL' : 'RETURNED');
            setSelectedCase(null);
          }}
        >
          <div className="nav-card-main-row">
            <div className="nav-card-icon-container">
              <AlertTriangle size={20} />
            </div>
            <div className="nav-card-counter">{returnedCount}</div>
          </div>
          <div className="nav-card-details">
            <span className="nav-card-title">Returned Files</span>
            <span className="nav-card-subtitle">Reports requiring revision</span>
          </div>
          <div className="nav-card-metrics-row">
            <span className={`nav-card-badge badge-orange ${urgentReturnedCount > 0 ? 'blink-badge' : ''}`}>
              {urgentReturnedCount > 0 ? `${urgentReturnedCount} Urgent Attention` : 'Revision requested'}
            </span>
            <span className="nav-card-percentage">
              {Math.round((returnedCount / (casesList.length || 1)) * 100)}% of queue
            </span>
          </div>
        </div>

        {/* Card 3: In Progress & Drafts */}
        <div 
          className={`intel-nav-card card-slate ${activeTab === 'CREATED' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab(activeTab === 'CREATED' ? 'ALL' : 'CREATED');
            setSelectedCase(null);
          }}
        >
          <div className="nav-card-main-row">
            <div className="nav-card-icon-container">
              <Edit size={20} />
            </div>
            <div className="nav-card-counter">{createdCount}</div>
          </div>
          <div className="nav-card-details">
            <span className="nav-card-title">In Progress & Drafts</span>
            <span className="nav-card-subtitle">Unsubmitted case files</span>
          </div>
          <div className="nav-card-metrics-row">
            <span className="nav-card-badge badge-slate">
              {newAssignmentsCount} Assigned | {draftsInProgressCount} Drafts
            </span>
            <span className="nav-card-percentage">
              {Math.round((createdCount / (casesList.length || 1)) * 100)}% of queue
            </span>
          </div>
        </div>
      </div>

      <div className="intel-left-main-grid">
        {showIntakeForm ? (
          /* 2. InformationReceived Intake Form */
          <div className="intake-form-card glass-panel border-l-brand">
            <div className="intake-card-header">
              <h3>
                <Plus size={16} />
                <span>Information Received Intake Form</span>
              </h3>
              <button 
                type="button" 
                className="btn-intake-close" 
                onClick={() => { resetIntakeForm(); setShowIntakeForm(false); }}
                title="Return to case list"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleIntakeSubmit} className="intake-form-body">
              {/* SECTION 1: TARGET TAXPAYER PROFILE */}
              <div className="intake-form-section">
                <h4 className="intake-section-title">I. Target Taxpayer Profile</h4>
                
                <div className="form-grid-2">
                  <div className="form-input-group">
                    <label>Taxpayer TIN <span className="req">*</span></label>
                    <input 
                      type="text" 
                      required
                      maxLength={9}
                      placeholder="e.g. 100293841 (9 digits)"
                      value={tin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 9);
                        setTin(val);
                        setTinError(val.length > 0 && val.length < 9 ? 'TIN must be exactly 9 digits.' : '');
                      }}
                      style={{ borderColor: tinError ? '#ef4444' : '' }}
                    />
                    {tinError && <span className="field-error-msg"><AlertCircle size={11} /> {tinError}</span>}
                  </div>

                  <div className="form-input-group">
                    <label>Taxpayer Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Align Traders Ltd"
                      value={taxPayerName}
                      onChange={(e) => setTaxPayerName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-input-group">
                    <label>Taxpayer Address</label>
                    <input 
                      type="text" 
                      placeholder="City, District, Sector"
                      value={taxPayerAddress}
                      onChange={(e) => setTaxPayerAddress(e.target.value)}
                    />
                  </div>

                  <div className="form-input-group">
                    <label>Tax Period</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 2026-Q1"
                      value={taxPeriod}
                      onChange={(e) => setTaxPeriod(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-grid-3">
                  <div className="form-input-group">
                    <label>Tax Type</label>
                    <select value={taxType} onChange={(e) => setTaxType(e.target.value)}>
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
                  </div>

                  <div className="form-input-group">
                    <label>Intake Source / Channel</label>
                    <select value={intakeChannel} onChange={(e) => setIntakeChannel(e.target.value)}>
                      <option value="Whistleblower Portal">Whistleblower Portal</option>
                      <option value="Walk-in Consultation">Walk-in Consultation</option>
                      <option value="Audits Referral">Audits Referral</option>
                      <option value="Hotline Channel">Hotline Channel</option>
                    </select>
                  </div>

                  <div className="form-input-group">
                    <label>Priority Classification</label>
                    <select value={priorityClassification} onChange={(e) => setPriorityClassification(e.target.value)}>
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="URGENT">URGENT</option>
                    </select>
                  </div>
                </div>

                <div className="form-input-group">
                  <label>Estimated Evasion Amount (RWF)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 15000000"
                    min={1}
                    value={estimatedEvasionAmount}
                    onChange={(e) => {
                      setEstimatedEvasionAmount(e.target.value);
                      setAmountError(e.target.value && Number(e.target.value) <= 0 ? 'Amount must be a positive number.' : '');
                    }}
                    style={{ borderColor: amountError ? '#ef4444' : '' }}
                  />
                  {amountError && <span className="field-error-msg"><AlertCircle size={11} /> {amountError}</span>}
                </div>
              </div>

              {/* SECTION 2: INFORMER IDENTITY & DIGITAL VERIFICATION */}
              <div className="intake-form-section">
                <h4 className="intake-section-title">II. Informer Identity & Digital Verification</h4>
                
                <div className="form-input-group">
                  <label>Informer Classification</label>
                  <div className="radio-group-modern">
                    <label className={`radio-card-option ${informerType === 'anonymous' ? 'active' : ''}`}>
                      <input 
                        type="radio" 
                        value="anonymous" 
                        checked={informerType === 'anonymous'} 
                        onChange={() => {
                          setInformerType('anonymous');
                          setIsOtpVerified(false);
                          setIsOtpSent(false);
                          setOtpError('');
                        }} 
                      />
                      <div className="radio-card-content">
                        <strong>Anonymous Source</strong>
                        <span>Protections applied under Whistleblower Act.</span>
                      </div>
                    </label>
                    
                    <label className={`radio-card-option ${informerType === 'identified' ? 'active' : ''}`}>
                      <input 
                        type="radio" 
                        value="identified" 
                        checked={informerType === 'identified'} 
                        onChange={() => setInformerType('identified')} 
                      />
                      <div className="radio-card-content">
                        <strong>Identified Informer</strong>
                        <span>Verification signature OTP required.</span>
                      </div>
                    </label>
                  </div>
                </div>

                {informerType === 'anonymous' ? (
                  <div className="whistleblower-alert-box glass-panel border-l-warning">
                    <ShieldCheck size={16} className="alert-shield-icon" />
                    <div>
                      <h5>Anonymous Informer Protection Enabled</h5>
                      <p>Informer credentials will not be saved or registered. Information is treated under strictly confidential classification guidelines.</p>
                    </div>
                  </div>
                ) : (
                  <div className="informer-details-subform glass-panel">
                    <div className="form-grid-3">
                      <div className="form-input-group">
                        <label>Informer Name <span className="req">*</span></label>
                        <input 
                          type="text" 
                          required
                          minLength={3}
                          placeholder="Full Name (min. 3 characters)"
                          value={informerName}
                          onChange={(e) => setInformerName(e.target.value)}
                        />
                      </div>
                      <div className="form-input-group">
                        <label>Phone Number <span className="req">*</span></label>
                        <input 
                          type="text" 
                          required
                          placeholder="+250XXXXXXXXX or 07XXXXXXXX"
                          value={informerPhoneNum}
                          onChange={(e) => {
                            setInformerPhoneNum(e.target.value);
                            setPhoneError('');
                          }}
                          style={{ borderColor: phoneError ? '#ef4444' : '' }}
                        />
                        {phoneError && <span className="field-error-msg"><AlertCircle size={11} /> {phoneError}</span>}
                      </div>
                      <div className="form-input-group">
                        <label>Document Type <span className="req">*</span></label>
                        <select 
                          value={informerIdType} 
                          onChange={(e) => { setInformerIdType(e.target.value); setInformerNationalId(''); setNationalIdError(''); }}
                        >
                          <option value="NATIONAL_ID">National ID (16 digits)</option>
                          <option value="PASSPORT">Passport (up to 16 chars)</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-input-group" style={{ marginTop: '4px' }}>
                      <label>
                        {informerIdType === 'NATIONAL_ID' ? 'National ID Number' : 'Passport Number'}
                        <span className="req">*</span>
                        <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '6px' }}>
                          {informerIdType === 'NATIONAL_ID' ? '(exactly 16 digits)' : '(1–16 alphanumeric)'}
                        </span>
                      </label>
                      <input 
                        type="text" 
                        required
                        maxLength={16}
                        placeholder={informerIdType === 'NATIONAL_ID' ? 'e.g. 1199080012345678' : 'e.g. RW1234567'}
                        value={informerNationalId}
                        onChange={(e) => {
                          const val = informerIdType === 'NATIONAL_ID' 
                            ? e.target.value.replace(/\D/g, '').slice(0, 16)
                            : e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 16);
                          setInformerNationalId(val);
                          setNationalIdError('');
                        }}
                        style={{ borderColor: nationalIdError ? '#ef4444' : '' }}
                      />
                      {nationalIdError && <span className="field-error-msg"><AlertCircle size={11} /> {nationalIdError}</span>}
                    </div>

                    {/* OTP Send / Verify Actions */}
                    <div className="otp-signature-box">
                      {isOtpVerified ? (
                        <div className="otp-verified-banner">
                          <CheckCircle size={16} />
                          <span>Digital Co-Signature Applied: VERIFIED</span>
                        </div>
                      ) : (
                        <div className="otp-actions-wrapper">
                          {!isOtpSent ? (
                            <button 
                              type="button" 
                              className="btn-send-otp-signature"
                              onClick={handleSendIntakeOtp}
                              disabled={otpSending || !informerPhoneNum}
                            >
                              {otpSending ? 'Sending Signature Code...' : 'Send Verification OTP Signature'}
                            </button>
                          ) : (
                            <div className="otp-verification-input-row">
                              <input 
                                type="text" 
                                placeholder="Enter 4-digit code"
                                maxLength={4}
                                value={otpInput}
                                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                className="input-otp-code"
                              />
                              <button 
                                type="button" 
                                className="btn-verify-otp-signature"
                                onClick={handleVerifyIntakeOtp}
                              >
                                Verify & Sign
                              </button>
                              <button 
                                type="button" 
                                className="btn-resend-otp-link"
                                onClick={handleSendIntakeOtp}
                              >
                                Resend
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {otpError && (
                        <div className="otp-error-message">
                          <AlertCircle size={12} />
                          <span>{otpError}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 3: REPORTED INFRACTION SUMMARY */}
              <div className="intake-form-section">
                <h4 className="intake-section-title">III. Evasion Details & Evidence Summary</h4>
                
                <div className="form-input-group">
                  <label>Summary of Information Received <span className="req">*</span></label>
                  <textarea 
                    required
                    rows={4}
                    minLength={20}
                    placeholder="Log details of the smuggling activities, evasion patterns, or audit gaps reported (min. 20 characters)..."
                    value={summaryOfInformationCase}
                    onChange={(e) => { 
                      setSummaryOfInformationCase(e.target.value); 
                      setSummaryError(e.target.value.trim().length > 0 && e.target.value.trim().length < 20 ? 'Summary must be at least 20 characters.' : '');
                    }}
                    style={{ borderColor: summaryError ? '#ef4444' : '' }}
                  />
                  {summaryError && <span className="field-error-msg"><AlertCircle size={11} /> {summaryError}</span>}
                  <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                    {summaryOfInformationCase.trim().length} / 20 minimum characters
                  </span>
                </div>
              </div>

              <div className="intake-form-actions">
                <button 
                  type="submit" 
                  className="btn-create-case-submit" 
                  disabled={createCaseMutation.isLoading || (informerType === 'identified' && !isOtpVerified)}
                >
                  <Database size={14} />
                  <span>{createCaseMutation.isLoading ? 'Recording Intel File...' : 'Create Intelligence File'}</span>
                </button>
              </div>
            </form>
          </div>
        ) : showReportWizard ? (
          /* Report Generation Wizard */
          <div className="intake-form-card glass-panel border-l-brand">
            <div className="intake-card-header">
              <h3>
                <FileText size={16} />
                <span>{selectedCase ? 'Draft Intelligence Report' : 'Select Case for Report'}</span>
              </h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {selectedCase && (
                  <button 
                    type="button" 
                    className="btn-form-cancel"
                    style={{ padding: '4px 8px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'white', fontWeight: 600 }}
                    onClick={() => {
                      setSelectedCase(null);
                      resetReportForm();
                    }}
                  >
                    Change Case
                  </button>
                )}
                <button 
                  type="button" 
                  className="btn-intake-close" 
                  onClick={() => {
                    setShowReportWizard(false);
                  }}
                  title="Return to case list"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="wizard-body custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              {!selectedCase ? (
                /* 1. Case Search & Selector Grid */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ fontSize: '11.5px', color: '#64748b' }}>
                    Choose an assigned or returned case from the list below to begin compiling the findings report.
                  </p>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div className="search-box-wrapper" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 10px', backgroundColor: 'white' }}>
                      <Search size={14} style={{ color: '#94a3b8' }} />
                      <input 
                        type="text" 
                        placeholder="Search by ID, TIN, or Taxpayer..." 
                        value={wizardSearchTerm}
                        onChange={(e) => setWizardSearchTerm(e.target.value)}
                        style={{ border: 'none', outline: 'none', fontSize: '12px', width: '100%' }}
                      />
                    </div>
                    
                    <select 
                      value={wizardFilterStatus} 
                      onChange={(e) => setWizardFilterStatus(e.target.value)}
                      style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', color: '#334155', backgroundColor: 'white' }}
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="ASSIGNED">Assigned Only</option>
                      <option value="RETURNED">Returned Only</option>
                    </select>
                  </div>

                  <div className="wizard-case-selector-grid custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                    {eligibleCases.length === 0 ? (
                      <div className="wizard-select-tip glass-panel" style={{ padding: '20px', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                        No eligible cases match your search filters.
                      </div>
                    ) : (
                      eligibleCases.map((c) => {
                        const isReturned = c.status?.includes('RETURNED') || c.status === 'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER';
                        return (
                          <div 
                            key={c.id} 
                            className={`wizard-case-card glass-panel`}
                            onClick={() => {
                              setSelectedCase(c);
                              setInspectorTab('DOCUMENT');
                              loadReportForEditing(c);
                            }}
                            style={{
                              padding: '12px',
                              borderRadius: '8px',
                              border: '1px solid #e2e8f0',
                              borderLeft: isReturned ? '4px solid #E05C00' : '4px solid #003DA5',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              backgroundColor: 'white',
                              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span className="font-mono" style={{ fontWeight: 700, fontSize: '11px', color: '#003DA5' }}>
                                {formatCaseId(c.caseNum || c.id)}
                              </span>
                              <span className={`status-pill-lbl`} style={{ 
                                fontSize: '9px', 
                                fontWeight: 700, 
                                padding: '2px 6px', 
                                borderRadius: '4px',
                                textTransform: 'uppercase',
                                backgroundColor: isReturned ? '#FFF3EB' : '#EEF2F6',
                                color: isReturned ? '#E05C00' : '#475569'
                              }}>
                                {c.status?.replace(/_/g, ' ')}
                              </span>
                            </div>
                            
                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>
                              {c.taxPayer?.taxPayerName || 'Unknown Taxpayer'}
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                              <span>TIN: <strong className="font-mono">{c.taxPayer?.taxPayerTIN || 'N/A'}</strong></span>
                              <span>{c.taxType?.replace(/_/g, ' ') || 'Tax Evasion'}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                /* 2. Unified Report drafting form & evidence mapping */
                <form onSubmit={handleReportSubmit} className="wizard-report-details-form" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="wizard-selected-case-summary" style={{ padding: '10px', borderRadius: '6px', border: '1px solid rgba(0, 61, 165, 0.1)', backgroundColor: 'rgba(0, 61, 165, 0.02)', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="font-mono" style={{ fontWeight: 700, color: 'var(--primary-brand)' }}>
                        {formatCaseId(selectedCase.caseNum || selectedCase.id)}
                      </span>
                      <span style={{ color: '#64748b' }}>
                        TIN: <strong className="font-mono">{selectedCase.taxPayer?.taxPayerTIN || 'N/A'}</strong>
                      </span>
                    </div>
                    <div style={{ fontWeight: '700', color: '#334155' }}>
                      Taxpayer: {selectedCase.taxPayer?.taxPayerName || 'Unknown'}
                    </div>
                  </div>

                  <div className="form-input-group">
                    <label>Report Title <span className="req">*</span></label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Findings Report: Customs Duty evasion CS/26/05/xx"
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                    />
                  </div>

                  <div className="form-input-group">
                    <label>Subject / Taxpayer TIN <span className="req">*</span></label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Align Traders Ltd - TIN 100293841"
                      value={reportSubject}
                      onChange={(e) => setReportSubject(e.target.value)}
                    />
                  </div>

                  <div className="wizard-sections-container" style={{ display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', backgroundColor: '#f8fafc' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary-brand)', display: 'block' }}>
                      Section II: Executive Findings & Legal Description (Dynamic Sections)
                    </label>
                    {reportSections.map((sec, idx) => (
                      <div key={idx} className="paragraph-section-card" style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Paragraph #{idx + 1}</span>
                          {reportSections.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveParagraph(idx)}
                              style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '10px', fontWeight: 700 }}
                            >
                              <Trash2 size={12} />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="Section Subheading / Topic (Optional, e.g. Legal Contravention)"
                          value={sec.subject}
                          onChange={(e) => handleUpdateParagraph(idx, 'subject', e.target.value)}
                          style={{ padding: '6px 8px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
                        />
                        <textarea
                          required
                          rows={3}
                          placeholder="Describe finding details and observations..."
                          value={sec.text}
                          onChange={(e) => handleUpdateParagraph(idx, 'text', e.target.value)}
                          style={{ padding: '6px 8px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', resize: 'vertical' }}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddParagraph}
                      style={{
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--primary-brand)',
                        backgroundColor: '#ffffff',
                        border: '1px dashed var(--primary-brand)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        alignSelf: 'flex-start'
                      }}
                    >
                      <Plus size={12} />
                      <span>Add Paragraph Section</span>
                    </button>
                  </div>

                  {/* Inline Evidence Attachments & Findings linking */}
                  <div className="wizard-evidence-inline-section" style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '12px', marginTop: '4px' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary-brand)', marginBottom: '8px' }}>
                      <UploadCloud size={15} />
                      <span>Section III: Admissible Evidence Inventory ({evidenceAttachments[selectedCase.id]?.length || 0})</span>
                    </h4>

                    {(!evidenceAttachments[selectedCase.id] || evidenceAttachments[selectedCase.id].length === 0) ? (
                      <div style={{ fontSize: '11px', color: '#94a3b8', padding: '12px', border: '1px dashed #e2e8f0', borderRadius: '6px', textAlign: 'center', marginBottom: '8px', backgroundColor: '#f8fafc' }}>
                        No evidence files linked to this findings document. Use the block below to link files.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                        {evidenceAttachments[selectedCase.id].map((file) => (
                          <div key={file.id} style={{ display: 'flex', flexDirection: 'column', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#f8fafc', fontSize: '11px', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <File size={12} style={{ color: 'var(--primary-brand)' }} />
                                <span style={{ fontWeight: 600, color: '#334155' }}>{file.name}</span>
                                <span style={{ color: '#94a3b8' }}>({file.size})</span>
                              </div>
                              <button 
                                type="button" 
                                onClick={() => handleDeleteEvidence(file.id)}
                                style={{ color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                                title="Delete Attachment"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                            {file.description && (
                              <div style={{ color: '#64748b', fontStyle: 'italic', paddingLeft: '18px' }}>
                                Description: {file.description}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', backgroundColor: '#ffffff' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input 
                          key={fileInputKey}
                          type="file" 
                          onChange={(e) => setEvidenceFile(e.target.files[0])}
                          style={{ flex: 1, fontSize: '11.5px', color: '#475569' }}
                        />
                        {evidenceFile && (
                          <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 600 }}>Ready</span>
                        )}
                      </div>
                      <input 
                        type="text" 
                        placeholder="File Description (e.g. Bank statement showing wire transfers)"
                        value={evidenceDescription}
                        onChange={(e) => setEvidenceDescription(e.target.value)}
                        style={{ padding: '6px 8px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
                      />
                      <button 
                        type="button" 
                        onClick={handleAddEvidence}
                        disabled={!evidenceFile}
                        style={{ 
                          padding: '6px 12px', 
                          fontSize: '11px', 
                          fontWeight: 700, 
                          color: 'white', 
                          backgroundColor: evidenceFile ? 'var(--primary-brand)' : '#cbd5e1', 
                          border: 'none', 
                          borderRadius: '6px', 
                          cursor: evidenceFile ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}
                      >
                        <Plus size={12} />
                        <span>Link Selected File</span>
                      </button>
                    </div>
                    <span style={{ display: 'block', fontSize: '9.5px', color: '#94a3b8', marginTop: '4px' }}>
                      Linked files will be cataloged and printed in Section III of the report template.
                    </span>
                  </div>

                  <div className="form-action-buttons-wizard" style={{ display: 'flex', gap: '10px', marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                    <button 
                      type="submit" 
                      className="btn-create-case-submit" 
                      style={{ flex: 1, backgroundColor: 'var(--success-color)', marginTop: 0 }}
                      disabled={createReportMutation.isLoading || editReportMutation.isLoading}
                    >
                      <Send size={14} />
                      <span>{createReportMutation.isLoading || editReportMutation.isLoading ? 'Sending...' : selectedCase.reportId ? 'Re-Send to Intelligence Director' : 'Send to Intelligence Director'}</span>
                    </button>
                    <button 
                      type="button" 
                      className="btn-form-cancel"
                      style={{ padding: '8px 16px', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', backgroundColor: 'transparent', fontWeight: 600 }}
                      onClick={() => {
                        setShowReportWizard(false);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>
        ) : (
          /* 3. Case Queue Workspace */
          <div className="queue-list-card">
            {/* Tab Navbar exactly matching screenshot */}
            <div className="cases-tab-navbar glass-panel">
              <button 
                className={`cases-tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
                onClick={() => { setActiveTab('ALL'); setSelectedCase(null); }}
              >
                All ({allCount})
              </button>
              <button 
                className={`cases-tab-btn ${activeTab === 'CREATED' ? 'active' : ''}`}
                onClick={() => { setActiveTab('CREATED'); setSelectedCase(null); }}
              >
                Created ({createdCount})
              </button>
              <button 
                className={`cases-tab-btn ${activeTab === 'PENDING_REVIEW' ? 'active' : ''}`}
                onClick={() => { setActiveTab('PENDING_REVIEW'); setSelectedCase(null); }}
              >
                Pending Review ({pendingReviewCount})
              </button>
              <button 
                className={`cases-tab-btn ${activeTab === 'RETURNED' ? 'active' : ''}`}
                onClick={() => { setActiveTab('RETURNED'); setSelectedCase(null); }}
              >
                <span className="tab-label-with-badge">
                  Returned
                  {returnedCount > 0 && <span className="tab-badge-accent">{returnedCount}</span>}
                </span>
              </button>
              <button 
                className={`cases-tab-btn ${activeTab === 'APPROVED' ? 'active' : ''}`}
                onClick={() => { setActiveTab('APPROVED'); setSelectedCase(null); }}
              >
                Approved ({approvedCount})
              </button>
              <button 
                className={`cases-tab-btn ${activeTab === 'CLOSED' ? 'active' : ''}`}
                onClick={() => { setActiveTab('CLOSED'); setSelectedCase(null); }}
              >
                Closed ({closedCount})
              </button>
              <button 
                className={`cases-tab-btn ${activeTab === 'WITH_REPORTS' ? 'active' : ''}`}
                onClick={() => { setActiveTab('WITH_REPORTS'); setSelectedCase(null); }}
              >
                With Reports ({withReportsCount})
              </button>
            </div>

            {/* Filter and Action Row */}
            <div className="queue-search-sort-bar">
              <div className="search-box-wrapper">
                <Search size={14} />
                <input 
                  type="text" 
                  placeholder="Search all cases..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="filters-and-actions">
                <button 
                  className={`sort-action-btn ${sortOrder !== 'DATE_DESC' ? 'active' : ''}`}
                  onClick={() => setSortOrder(prev => prev === 'DATE_DESC' ? 'DATE_ASC' : 'DATE_DESC')}
                >
                  <span>Date</span>
                  <span>{sortOrder === 'DATE_DESC' ? ' ↓' : ' ↑'}</span>
                </button>

                <button 
                  className={`filter-action-btn ${filterWithReportsOnly ? 'active' : ''}`}
                  onClick={() => setFilterWithReportsOnly(prev => !prev)}
                >
                  With Reports
                </button>

                <button 
                  className="btn-new-case-trigger"
                  onClick={() => setShowIntakeForm(true)}
                >
                  <Plus size={14} />
                  <span>New Case</span>
                </button>

                <button 
                  className="btn-generate-report-trigger"
                  onClick={() => {
                    setShowReportWizard(true);
                    setShowIntakeForm(false);
                    if (selectedCase) {
                      setInspectorTab('DOCUMENT');
                      loadReportForEditing(selectedCase);
                    }
                  }}
                >
                  <FileText size={14} />
                  <span>Generate Report</span>
                </button>
              </div>
            </div>

            {/* Info category header */}
            <div className="info-banner-bar glass-panel">
              <AlertCircle size={14} className="info-icon" />
              <span>Showing <strong>{processedCases.length}</strong> cases in <strong>{activeTab === 'ALL' ? 'All Cases' : activeTab.replace(/_/g, ' ').toLowerCase()}</strong> category</span>
            </div>

            {/* Virtual Table */}
            <div className="table-wrapper custom-scrollbar">
              <div style={{ flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
                <table className="siids-virtual-table">
                <thead>
                  <tr>
                    <th>Case ID</th>
                    <th>Report ID</th>
                    <th>Taxpayer</th>
                    <th>TIN</th>
                    <th>Tax Type</th>
                    <th>Tax Period</th>
                    <th>Created Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isCasesLoading ? (
                    <tr><td colSpan={9} className="table-loader-cell">Fetching case registers...</td></tr>
                  ) : processedCases.length === 0 ? (
                    <tr><td colSpan={9} className="table-empty-cell">No cases matched query parameters.</td></tr>
                  ) : (
                    paginatedCases.map((item, index) => {
                      const hasReport = !!item.reportId || reportsList.some(r => r.caseId === item.id);
                      const rptId = hasReport ? formatReportId(item, index) : '—';
                      const taxpayerName = item.taxPayer?.taxPayerName || 'N/A';
                      const taxpayerTin = item.taxPayer?.taxPayerTIN || 'N/A';
                      const createdDateFormatted = new Date(item.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      });

                      return (
                        <tr 
                          key={item.id} 
                          className={`virtual-row-item ${selectedCase?.id === item.id ? 'row-selected' : ''}`}
                          onClick={() => {
                            setSelectedCase(item);
                            setIsEditingRightPane(false);
                            loadReportForEditing(item);
                          }}
                        >
                          <td className="desc-cell-title font-mono">{formatCaseId(item.caseNum || item.id)}</td>
                          <td>
                            {hasReport ? (
                              <span className="table-report-badge">{rptId}</span>
                            ) : (
                              <span className="table-report-placeholder">—</span>
                            )}
                          </td>
                          <td><strong>{taxpayerName}</strong></td>
                          <td className="font-mono">{taxpayerTin}</td>
                          <td>{item.taxType?.replace(/_/g, ' ') || 'Tax Evasion'}</td>
                          <td>{item.taxPeriod || '2026-Q1'}</td>
                          <td className="table-date-cell">{createdDateFormatted}</td>
                          <td>
                            <div className="table-status-pill-wrapper">
                              <FileText size={11} className="status-pill-icon" />
                              <span className={`status-pill-lbl status-${item.status?.toLowerCase().replace(/_/g, '-')}`}>
                                {item.status || 'ASSIGNED'}
                              </span>
                            </div>
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className="table-row-actions" style={{ display: 'flex', gap: '6px' }}>
                              {!hasReport && isInProgress(item) ? (
                                <button
                                  type="button"
                                  className="btn-create-report-action"
                                  title="Compile Findings Report"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCase(item);
                                    setShowReportWizard(true);
                                    setShowIntakeForm(false);
                                    setInspectorTab('DOCUMENT');
                                    loadReportForEditing(item);
                                  }}
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: 'white',
                                    backgroundColor: 'var(--primary-brand)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  <FileText size={11} />
                                  <span>Create Report</span>
                                </button>
                              ) : (
                                <>
                                  <button 
                                    type="button"
                                    className="table-action-btn-inspect" 
                                    title="View Report Preview"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewCaseDocument(item);
                                    }}
                                    style={{ padding: '4px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  >
                                    <Eye size={12} />
                                  </button>
                                  <button 
                                    type="button"
                                    className="table-action-btn-inspect" 
                                    title="Download Report PDF"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadCaseReport(item);
                                    }}
                                    style={{ padding: '4px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  >
                                    <Download size={12} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              </div>
              {renderPagination(casesPage, processedCases.length, casesPageSize, setCasesPage, setCasesPageSize)}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // RIGHT COLUMN VIEW
  const rightPaneView = (
    <div className="intel-off-right-workspace">
      {selectedCase ? (
        <div className="workspace-inspector-panel glass-panel">
          <div className="inspector-panel-header">
            <div className="header-brand-title">
              <span className="case-ref-header">{selectedCase.caseNum || `CASE-${selectedCase.id}`}</span>
              <h2>{selectedCase.taxPayer?.taxPayerName || selectedCase.subject}</h2>
            </div>
            <button className="panel-close-trigger" onClick={() => setSelectedCase(null)}><X size={16} /></button>
          </div>

          {/* Inspector Tabs Bar */}
          <div className="inspector-tabs-navbar">
            <button 
              className={`inspector-tab-btn ${inspectorTab === 'DOCUMENT' ? 'active' : ''}`}
              onClick={() => setInspectorTab('DOCUMENT')}
            >
              <FileText size={14} />
              <span>Findings Document</span>
            </button>
            <button 
              className={`inspector-tab-btn ${inspectorTab === 'EVIDENCE' ? 'active' : ''}`}
              onClick={() => setInspectorTab('EVIDENCE')}
            >
              <UploadCloud size={14} />
              <span>Evidence Attachments</span>
            </button>
            <button 
              className={`inspector-tab-btn ${inspectorTab === 'TIMELINE' ? 'active' : ''}`}
              onClick={() => setInspectorTab('TIMELINE')}
            >
              <Clock size={14} />
              <span>Audit Timeline</span>
            </button>
          </div>

          <div className="inspector-tab-content custom-scrollbar">
            {/* TAB 1: FINDINGS DOCUMENT */}
            {inspectorTab === 'DOCUMENT' && (
              <div className="tab-pane-document">
                {/* 
                  LOGIC:
                  - showPreview = true  → show PDF preview
                  - showPreview = false → show the editable form
                  
                  showPreview is true when:
                    • Case has a submitted/returned/approved/finalised status AND user is NOT in editing mode
                  showPreview is false (show form) when:
                    • Case is in-progress (CASE_CREATED, ASSIGNED, etc.) – let officer fill/create report
                    • OR isEditingRightPane is explicitly true (user clicked "Edit Findings")
                */}
                {(() => {
                  const hasSubmittedStatus = 
                    selectedCase.status === 'REPORT_SUBMITTED' ||
                    selectedCase.status === 'PENDING_AC_SIGNATURE' ||
                    selectedCase.status === 'PENDING_DIRECTOR_SIGNATURE' ||
                    selectedCase.status === 'FINALISED' ||
                    selectedCase.status === 'INVESTIGATION_COMPLETED' ||
                    selectedCase.status === 'INVESTIGATION_REPORT_APPROVED' ||
                    selectedCase.status?.includes('SUBMITTED') ||
                    selectedCase.status?.includes('APPROVED') ||
                    selectedCase.status?.includes('RETURNED') ||
                    selectedCase.status?.includes('REJECTED');

                  const showPdfPreview = hasSubmittedStatus && !isEditingRightPane;

                  if (showPdfPreview) return (
                  <div className="intelligence-pdf-preview glass-panel">
                    {/* Top actions/download bar inside the preview */}
                    <div className="pdf-actions-row" style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginBottom: '10px', gap: '8px' }}>
                      {/* Allow editing for returned/rejected cases */}
                      {(selectedCase.status?.includes('RETURNED') || 
                        selectedCase.status?.includes('REJECTED') || 
                        selectedCase.status === 'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER') && (
                        <button 
                          type="button" 
                          className="btn-download-preview"
                          onClick={() => {
                            setIsEditingRightPane(true);
                          }}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#F5A800',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Edit size={10} />
                          <span>Edit Findings</span>
                        </button>
                      )}
                      <button 
                        type="button" 
                        className="btn-download-preview"
                        onClick={() => {
                          generateAndDownloadPDF(
                            selectedCase,
                            reportTitle,
                            reportSubject,
                            reportSections,
                            selectedCase.summaryOfInformationCase || '',
                            evidenceAttachments[selectedCase.id] || []
                          );
                        }}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: 'var(--primary-brand)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Download size={10} />
                        <span>Download PDF</span>
                      </button>
                    </div>

                    <div className="pdf-letterhead">
                      <img src="/Images/HomeLogo.jpeg" alt="RRA Crest" className="pdf-crest-img" />
                      <h4>RWANDA REVENUE AUTHORITY</h4>
                      <span>Intelligence & Enforcement Division</span>
                      <p className="classification-banner">RESTRICTED // INTERNAL USE ONLY</p>
                    </div>

                    <div className="pdf-metadata-block">
                      <div className="pdf-meta-row"><strong>Title:</strong> <span>{reportTitle || 'Intelligence Case Report'}</span></div>
                      <div className="pdf-meta-row"><strong>Subject:</strong> <span>{reportSubject || selectedCase.subject}</span></div>
                      <div className="pdf-meta-row"><strong>Date:</strong> <span>{new Date(selectedCase.createdAt).toLocaleDateString()}</span></div>
                      <div className="pdf-meta-row"><strong>TIN Reference:</strong> <span className="font-mono">{selectedCase.taxPayer?.taxPayerTIN || 'N/A'}</span></div>
                      <div className="pdf-meta-row"><strong>Status:</strong> <span className="status-indicator-badge">{selectedCase.status?.replace(/_/g, ' ')}</span></div>
                    </div>

                    <div className="pdf-document-body">
                      <h5>I. Executive Summary</h5>
                      <p>{selectedCase.summaryOfInformationCase || selectedCase.description || 'No intake summary.'}</p>
                      
                      <h5>II. Detailed Findings & Legal Basis</h5>
                      {reportSections.map((sec, idx) => (
                        <div key={idx} style={{ marginBottom: '12px' }}>
                          {sec.subject && <h6 style={{ fontSize: '11.5px', fontWeight: 700, color: '#1e293b', margin: '4px 0' }}>{sec.subject}</h6>}
                          <p style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '11px', lineHeight: '1.5' }}>{sec.text || 'No findings reported.'}</p>
                        </div>
                      ))}

                      {evidenceAttachments[selectedCase.id]?.length > 0 && (
                        <>
                          <h5>III. Admissible Evidence Inventory</h5>
                          <table className="pdf-evidence-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginTop: '6px' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                                <th style={{ padding: '6px', fontWeight: 700 }}>Tag ID</th>
                                <th style={{ padding: '6px', fontWeight: 700 }}>File Name</th>
                                <th style={{ padding: '6px', fontWeight: 700 }}>Size</th>
                                <th style={{ padding: '6px', fontWeight: 700 }}>Description</th>
                              </tr>
                            </thead>
                            <tbody>
                              {evidenceAttachments[selectedCase.id].map((file, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                  <td style={{ padding: '6px', fontFamily: 'monospace' }}>TAG-{idx+101}</td>
                                  <td style={{ padding: '6px', fontWeight: 600 }}>
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadAttachment(file)}
                                      style={{ background: 'none', border: 'none', color: '#003DA5', textDecoration: 'underline', cursor: 'pointer', padding: 0, font: 'inherit' }}
                                      title="Download Evidence File"
                                    >
                                      <Download size={12} style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }} />
                                      <span style={{ verticalAlign: 'middle' }}>{file.name}</span>
                                    </button>
                                  </td>
                                  <td style={{ padding: '6px' }}>{file.size}</td>
                                  <td style={{ padding: '6px', color: '#475569', fontStyle: 'italic' }}>{file.description || 'No description provided'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </>
                      )}
                    </div>

                    <div className="pdf-signature-blocks">
                      <div className="sig-block">
                        <span>Prepared By</span>
                        <strong className="sig-signed-name">Eric Gatera</strong>
                        <span className="sig-designation">Intelligence Officer</span>
                        <span className="sig-line-stamp">✓ Verified Electronic Stamp</span>
                      </div>

                      <div className="sig-block">
                        <span>Assistant Commissioner</span>
                        <span className="sig-line">
                          {selectedCase.status === 'PENDING_DIRECTOR_SIGNATURE' || selectedCase.status === 'FINALISED' || selectedCase.status === 'INVESTIGATION_COMPLETED' || selectedCase.status?.includes('APPROVED')
                            ? <strong className="sig-signed-name">AC Ronald Niwenshuti</strong> 
                            : 'Awaiting Validation...'}
                        </span>
                        {selectedCase.status === 'PENDING_DIRECTOR_SIGNATURE' || selectedCase.status === 'FINALISED' || selectedCase.status === 'INVESTIGATION_COMPLETED' || selectedCase.status?.includes('APPROVED') ? (
                          <span className="sig-line-stamp text-success">✓ Signed / Co-Signed</span>
                        ) : null}
                      </div>

                      <div className="sig-block">
                        <span>Director of Intelligence</span>
                        <span className="sig-line">
                          {selectedCase.status === 'FINALISED' || selectedCase.status === 'INVESTIGATION_COMPLETED' || selectedCase.status?.includes('APPROVED')
                            ? <strong className="sig-signed-name">Director Christian Mugunga</strong> 
                            : 'Awaiting Final Approval...'}
                        </span>
                        {selectedCase.status === 'FINALISED' || selectedCase.status === 'INVESTIGATION_COMPLETED' || selectedCase.status?.includes('APPROVED') ? (
                          <span className="sig-line-stamp text-success">✓ Final Sign-off Locked</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );

                  // FORM VIEW: in-progress cases (CASE_CREATED / ASSIGNED / etc.) or explicitly editing
                  return (
                    <form onSubmit={handleSendToDirector} className="inspector-details-card edit-report-form">
                      {selectedCase.status?.includes('RETURNED') && (
                        <div className="return-reason-alert glass-panel">
                          <AlertTriangle size={18} className="warning-icon text-danger" />
                          <div>
                            <h4>Correction Request Notes</h4>
                            <p>{selectedCase.returnReason || 'Verify that the informer references match declarations.'}</p>
                          </div>
                        </div>
                      )}

                      <div className="form-input-group">
                        <label>Report Title</label>
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. Cross-Border Customs Evasion Report"
                          value={reportTitle}
                          onChange={(e) => setReportTitle(e.target.value)}
                        />
                      </div>

                      <div className="form-input-group">
                        <label>Subject</label>
                        <input 
                          type="text" 
                          required
                          placeholder="Subject of the report"
                          value={reportSubject}
                          onChange={(e) => setReportSubject(e.target.value)}
                        />
                      </div>

                      <div className="form-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontWeight: 700, color: 'var(--primary-brand)' }}>Findings Paragraph Sections</label>
                        {reportSections.map((sec, idx) => (
                          <div key={idx} className="paragraph-section-card" style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Paragraph #{idx + 1}</span>
                              {reportSections.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveParagraph(idx)}
                                  style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '10px', fontWeight: 700 }}
                                >
                                  <Trash2 size={12} />
                                  <span>Remove</span>
                                </button>
                              )}
                            </div>
                            <input
                              type="text"
                              placeholder="Section Subheading / Topic (Optional, e.g. Legal Contravention)"
                              value={sec.subject}
                              onChange={(e) => handleUpdateParagraph(idx, 'subject', e.target.value)}
                              style={{ padding: '6px 8px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', backgroundColor: '#ffffff' }}
                            />
                            <textarea
                              required
                              rows={3}
                              placeholder="Describe finding details and observations..."
                              value={sec.text}
                              onChange={(e) => handleUpdateParagraph(idx, 'text', e.target.value)}
                              style={{ padding: '6px 8px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', resize: 'vertical', backgroundColor: '#ffffff' }}
                            />
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={handleAddParagraph}
                          style={{
                            padding: '6px 12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'var(--primary-brand)',
                            backgroundColor: '#ffffff',
                            border: '1px dashed var(--primary-brand)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            alignSelf: 'flex-start'
                          }}
                        >
                          <Plus size={12} />
                          <span>Add Paragraph Section</span>
                        </button>
                      </div>

                      {/* Live Preview toggle */}
                      <details style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0', marginTop: '4px', overflow: 'hidden' }}>
                        <summary style={{ padding: '8px 12px', cursor: 'pointer', fontWeight: 700, fontSize: '11.5px', color: 'var(--primary-brand)', backgroundColor: '#f0f4ff', userSelect: 'none', listStyle: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Eye size={13} />
                          <span>Preview Report Document</span>
                        </summary>
                        <div style={{ padding: '14px 16px', backgroundColor: '#ffffff' }}>
                          <div style={{ fontFamily: 'Georgia, serif', fontSize: '11px', lineHeight: 1.7, color: '#1e293b' }}>
                            <div style={{ textAlign: 'center', borderBottom: '2px solid #003DA5', paddingBottom: '10px', marginBottom: '12px' }}>
                              <strong style={{ fontSize: '13px', display: 'block', color: '#003DA5' }}>RWANDA REVENUE AUTHORITY</strong>
                              <span style={{ fontSize: '10px', color: '#64748b' }}>Intelligence & Enforcement Division — RESTRICTED</span>
                            </div>
                            <div style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '4px', fontSize: '10.5px' }}>
                              <div><strong>Title:</strong> {reportTitle || '—'}</div>
                              <div><strong>Subject:</strong> {reportSubject || '—'}</div>
                              <div><strong>TIN:</strong> {selectedCase.taxPayer?.taxPayerTIN || 'N/A'}</div>
                              <div><strong>Date:</strong> {new Date().toLocaleDateString()}</div>
                            </div>
                            <div style={{ marginBottom: '8px' }}>
                              <strong style={{ fontSize: '11px', display: 'block', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px', marginBottom: '6px' }}>I. Executive Summary</strong>
                              <p style={{ margin: 0 }}>{selectedCase.summaryOfInformationCase || 'No intake summary.'}</p>
                            </div>
                            <div>
                              <strong style={{ fontSize: '11px', display: 'block', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px', marginBottom: '6px' }}>II. Detailed Findings</strong>
                              {reportSections.map((sec, idx) => (
                                <div key={idx} style={{ marginBottom: '10px' }}>
                                  {sec.subject && <strong style={{ fontSize: '11px', display: 'block', color: '#003DA5' }}>{sec.subject}</strong>}
                                  <p style={{ margin: '2px 0', whiteSpace: 'pre-wrap' }}>{sec.text || '—'}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </details>

                      <div className="action-buttons-group" style={{ display: 'flex', gap: '8px', width: '100%', flexWrap: 'wrap' }}>
                        {/* Draft Save */}
                        <button 
                          type="button" 
                          onClick={handleSaveDraft} 
                          className="btn-save-draft-findings"
                          style={{ 
                            flex: '1 1 auto', 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center',
                            gap: '4px',
                            padding: '8px 12px'
                          }}
                        >
                          <Save size={14} />
                          <span>Save Draft{draftSavedAt ? ` (${draftSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''}</span>
                        </button>

                        {/* Send to Director */}
                        <button 
                          type="submit" 
                          className="btn-send-to-director" 
                          style={{ 
                            flex: '2 1 auto', 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px'
                          }}
                          disabled={reportSubmitting}
                        >
                          <Send size={14} />
                          <span>{reportSubmitting ? 'Sending...' : selectedCase.reportId ? 'Re-Send to Intelligence Director' : 'Send to Intelligence Director'}</span>
                        </button>

                        {/* Cancel */}
                        <button 
                          type="button" 
                          className="btn-form-cancel"
                          onClick={() => {
                            setIsEditingRightPane(false);
                            setSelectedCase(null);
                          }}
                          style={{
                            padding: '8px 16px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            backgroundColor: 'transparent',
                            fontWeight: 600,
                            flex: '1 1 auto'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  );
                })()}
              </div>
            )}

            {/* TAB 2: EVIDENCE & ATTACHMENTS */}
            {inspectorTab === 'EVIDENCE' && (
              <div className="tab-pane-evidence">
                {/* Enforcement Disclaimer */}
                <div className="evidence-disclaimer-card glass-panel border-l-warning">
                  <AlertCircle size={18} className="text-warning-accent" />
                  <div>
                    <h4>Evidence-Only Attachments Enforced</h4>
                    <p>All attachments linked to this case file must contain legally admissible audit trails. Non-evidence records are strictly restricted from uploading. Refer to RRA Security Protocol Section 8.4.</p>
                  </div>
                </div>

                {/* Evidence List */}
                <div className="evidence-list-container">
                  <h4>Case Evidence File Tags ({evidenceAttachments[selectedCase.id]?.length || 0})</h4>
                  {(!evidenceAttachments[selectedCase.id] || evidenceAttachments[selectedCase.id].length === 0) ? (
                    <div className="evidence-empty-list">No evidence attachments linked to this case. Use upload zone to attach records.</div>
                  ) : (
                    <div className="evidence-cards-grid">
                      {evidenceAttachments[selectedCase.id].map((file) => (
                        <div key={file.id} className="evidence-item-card glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', padding: '10px', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="evidence-icon-wrapper">
                              <File size={20} className="text-brand" />
                            </div>
                            <div className="evidence-text-details" style={{ flex: 1 }}>
                              <h5>{file.name}</h5>
                              <div className="evidence-meta-row">
                                <span>{file.size}</span>
                                <span className="dot">•</span>
                                <span>Uploaded by {file.uploadedBy}</span>
                                <span className="dot">•</span>
                                <span>{file.date}</span>
                              </div>
                            </div>
                            
                            {/* Only allow deleting if not submitted or finalised */}
                            {(selectedCase.status === 'ASSIGNED' || selectedCase.status?.includes('RETURNED')) && (
                              <button 
                                onClick={() => handleDeleteEvidence(file.id)}
                                className="btn-delete-evidence"
                                title="Delete Attachment"
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                          {file.description && (
                            <div style={{ paddingLeft: '40px', fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                              Description: {file.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Upload Form - only if editable */}
                {(selectedCase.status === 'ASSIGNED' || selectedCase.status?.includes('RETURNED')) && (
                  <form onSubmit={handleAddEvidence} className="evidence-upload-form glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h4>Attach New Evidence Tag</h4>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input 
                        key={fileInputKey}
                        type="file" 
                        onChange={(e) => setEvidenceFile(e.target.files[0])}
                        style={{ flex: 1, fontSize: '11.5px', color: '#475569' }}
                      />
                      {evidenceFile && (
                        <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 600 }}>Ready</span>
                      )}
                    </div>
                    <input 
                      type="text" 
                      placeholder="File Description (e.g. Bank statement showing wire transfers)"
                      value={evidenceDescription}
                      onChange={(e) => setEvidenceDescription(e.target.value)}
                      style={{ padding: '8px 10px', fontSize: '12px', border: '1px solid rgba(203, 213, 225, 0.8)', borderRadius: '6px', outline: 'none' }}
                    />
                    <button 
                      type="submit" 
                      disabled={!evidenceFile}
                      className="btn-upload-file-submit"
                      style={{ 
                        padding: '8px 14px', 
                        borderRadius: '6px', 
                        fontWeight: 700, 
                        fontSize: '12px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        gap: '6px', 
                        color: 'white',
                        backgroundColor: evidenceFile ? 'var(--primary-brand)' : '#cbd5e1', 
                        border: 'none',
                        cursor: evidenceFile ? 'pointer' : 'not-allowed'
                      }}
                    >
                      <UploadCloud size={14} />
                      <span>Link Selected File</span>
                    </button>
                    <span className="upload-hint">Link verified Excel manifests, declaration PDFs, or photo evidence folders.</span>
                  </form>
                )}
              </div>
            )}

            {/* TAB 3: AUDIT TIMELINE */}
            {inspectorTab === 'TIMELINE' && (
              <div className="tab-pane-timeline">
                <h4>Operational Trace Audit Logs</h4>
                <p className="timeline-subtitle">Unified tamper-proof event timestamps linked to employee token credentials.</p>
                
                <div className="timeline-trail-container">
                  {getTimelineEvents(selectedCase).map((evt, idx) => (
                    <div key={idx} className="timeline-trail-item">
                      <div className="timeline-trail-marker">
                        <div className={`trail-dot dot-${evt.type}`}>
                          {evt.type === 'intake' && <Plus size={10} />}
                          {evt.type === 'assign' && <User size={10} />}
                          {evt.type === 'draft' && <Edit size={10} />}
                          {evt.type === 'submit' && <Send size={10} />}
                          {evt.type === 'ac_sign' && <ShieldCheck size={10} />}
                          {evt.type === 'doi_sign' && <CheckCircle size={10} />}
                          {evt.type === 'return' && <AlertTriangle size={10} />}
                        </div>
                        {idx !== getTimelineEvents(selectedCase).length - 1 && <div className="trail-line"></div>}
                      </div>
                      <div className="timeline-trail-content glass-panel">
                        <div className="timeline-trail-header">
                          <h5>{evt.title}</h5>
                          <span className="trail-time"><Clock size={10} /> {new Date(evt.date).toLocaleString()}</span>
                        </div>
                        <p>{evt.desc}</p>
                        {evt.operator && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9.5px', color: 'var(--primary-brand)', fontWeight: 700, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                            <User size={10} />
                            <span>Operator: {evt.operator}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="inspector-empty-state-card glass-panel">
          <FileText size={48} className="empty-state-icon" />
          <h3>Intelligence Officer Console</h3>
          <p>Select any case file in the active queue to prepare report drafts, attach evidence documentation, or view the tamper-proof timeline.</p>
          <div className="empty-state-footer">
            <span className="classification-pill">SECURE DIVISION</span>
          </div>
        </div>
      )}
    </div>
  );

  const reportsDashboardView = (
    <div className="reports-dashboard-container custom-scrollbar">
      {reportsToast && (
        <div className="reports-toast-banner glass-panel">
          <CheckCircle size={16} className="toast-success-icon" />
          <span>{reportsToast}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="reports-dashboard-header">
        <div>
          <h1>Operational Intelligence Reports</h1>
          <p className="subtitle-desc">Aggregated performance analytics and case status synchronization.</p>
        </div>
        <button className="btn-download-reports-all" onClick={triggerReportsDownload}>
          <Download size={16} />
          <span>Download Filtered Reports</span>
        </button>
      </div>

      {/* Top row: Summary + Chart */}
      <div className="reports-top-row">
        {/* Metric Summary */}
        <div className="reports-summary-card glass-panel">
          <h3>Metric Summary</h3>
          
          <div className="summary-stat-box">
            <div className="stat-icon-wrapper circle-blue">
              <CheckCircle size={20} />
            </div>
            <div className="stat-text-info">
              <span className="stat-label">Cases Completed (Month)</span>
              <div className="stat-value-row">
                <span className="stat-val">1,248</span>
                <span className="trend-badge positive">
                  <TrendingUp size={12} />
                  <span>+12.5%</span>
                </span>
              </div>
            </div>
          </div>

          <div className="summary-stat-box">
            <div className="stat-icon-wrapper circle-amber">
              <Calendar size={20} />
            </div>
            <div className="stat-text-info">
              <span className="stat-label">Cases Completed (Week)</span>
              <div className="stat-value-row">
                <span className="stat-val">312</span>
                <span className="trend-badge negative">
                  <TrendingDown size={12} />
                  <span>-2.1%</span>
                </span>
              </div>
            </div>
          </div>

          <a href="#trends" className="view-efficiency-link" onClick={(e) => { e.preventDefault(); triggerReportsDownload(); }}>
            <span>View efficiency trends</span>
            <ExternalLink size={12} />
          </a>
        </div>

        {/* Approved vs Returned Comparison Chart */}
        <div className="reports-chart-card glass-panel">
          <div className="chart-card-header">
            <h3>Approved vs. Returned Comparison</h3>
            <div className="chart-toggle-row">
              <button 
                className={`chart-toggle-btn ${timeframe === 'MONTHLY' ? 'active' : ''}`}
                onClick={() => setTimeframe('MONTHLY')}
              >
                Monthly
              </button>
              <button 
                className={`chart-toggle-btn ${timeframe === 'WEEKLY' ? 'active' : ''}`}
                onClick={() => setTimeframe('WEEKLY')}
              >
                Weekly
              </button>
            </div>
          </div>

          <div className="chart-render-area">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={timeframe === 'MONTHLY' ? monthlyChartData : weeklyChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#003DA5" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#003DA5" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorReturned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E05C00" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#E05C00" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '10px' }} />
                <Area type="monotone" name="Approved" dataKey="approved" stroke="#003DA5" strokeWidth={2} fillOpacity={1} fill="url(#colorApproved)" />
                <Area type="monotone" name="Returned" dataKey="returned" stroke="#E05C00" strokeWidth={2} fillOpacity={1} fill="url(#colorReturned)" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="chart-custom-legend">
              <span className="legend-item"><span className="legend-dot approved"></span> Approved Cases</span>
              <span className="legend-item"><span className="legend-dot returned"></span> Returned for Revision</span>
            </div>
          </div>
        </div>
      </div>

      {/* Process Transition Efficiency Pipeline */}
      <div className="reports-efficiency-section glass-panel">
        <div className="section-header-row">
          <h3>Process Transition Efficiency</h3>
          <span className="info-badge">INTELLIGENCE PROCESSING TIME</span>
        </div>
        <div className="efficiency-steps-pipeline">
          <div className="efficiency-pipeline-step">
            <div className="step-number-circle">01</div>
            <div className="step-pipeline-details">
              <span className="step-pipeline-label">INTAKE TO ANALYSIS</span>
              <div className="step-pipeline-val">1.2 Days</div>
              <div className="step-pipeline-progress">
                <div className="step-progress-fill animate-progress-70"></div>
              </div>
            </div>
          </div>
          
          <div className="pipeline-connector-arrow">&#10142;</div>

          <div className="efficiency-pipeline-step">
            <div className="step-number-circle">02</div>
            <div className="step-pipeline-details">
              <span className="step-pipeline-label">ANALYSIS TO REPORT</span>
              <div className="step-pipeline-val">2.4 Days</div>
              <div className="step-pipeline-progress">
                <div className="step-progress-fill animate-progress-85"></div>
              </div>
            </div>
          </div>

          <div className="pipeline-connector-arrow">&#10142;</div>

          <div className="efficiency-pipeline-step">
            <div className="step-number-circle">03</div>
            <div className="step-pipeline-details">
              <span className="step-pipeline-label">REPORT TO APPROVAL</span>
              <div className="step-pipeline-val">0.8 Days</div>
              <div className="step-pipeline-progress">
                <div className="step-progress-fill animate-progress-40"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reports & Export Ledger */}
      <div className="reports-log-card glass-panel">
        <div className="log-card-header">
          <div className="header-titles">
            <h3>Intelligence Cases & Reports Export Center</h3>
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
              onClick={handleExportToExcel}
              disabled={filteredExportCases.length === 0}
            >
              <Download size={14} />
              <span>{selectedReportIds.length > 0 ? 'Export Selected to Excel' : 'Export Current View'}</span>
            </button>
          </div>
        </div>

        {/* Filters control bar */}
        <div className="ledger-filters-bar">
          <div className="left-filters">
            {/* Timeframe pills */}
            <div className="table-dropdown-filters" style={{ display: 'flex', gap: '8px' }}>
              <select className="log-filter-select" style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setSelectedReportIds([]); }}>
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
              <select className="log-filter-select" style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} value={filterYear} onChange={e => { setFilterYear(e.target.value); setSelectedReportIds([]); }}>
                <option value="All">All Years</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </div>

            {/* Type selector */}
            <select 
              className="ledger-filter-select"
              value={reportsFilterType}
              onChange={(e) => { setReportsFilterType(e.target.value); setSelectedReportIds([]); }}
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

            {/* Status selector */}
            <select 
              className="ledger-filter-select"
              value={reportsFilterStatus}
              onChange={(e) => { setReportsFilterStatus(e.target.value); setSelectedReportIds([]); }}
            >
              <option value="ALL">All Statuses</option>
              <option value="Approved">Approved</option>
              <option value="Returned for Revision">Returned/Rejected</option>
              <option value="Draft">Draft/Created</option>
            </select>

            {/* Specific Date Filter */}
            <div className="date-filter-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0 8px', height: '28px' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Date:</span>
              <input 
                type="date" 
                className="ledger-date-input"
                value={specificDateFilter}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => handleSpecificDateChange(e.target.value)}
                style={{ border: 'none', outline: 'none', fontSize: '11.5px', color: '#334155', cursor: 'pointer', fontFamily: 'inherit' }}
              />
              {specificDateFilter && (
                <button 
                  type="button" 
                  onClick={() => { setSpecificDateFilter(''); setSelectedReportIds([]); }}
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
                value={reportsSearchQuery}
                onChange={(e) => { setReportsSearchQuery(e.target.value); setSelectedReportIds([]); }}
              />
              {reportsSearchQuery && (
                <button type="button" className="clear-search-btn" onClick={() => { setReportsSearchQuery(''); setSelectedReportIds([]); }}>
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Ledger table wrapper */}
        <div className="reports-log-table-wrapper custom-scrollbar">
          <table className="rra-ledger-table">
            <thead>
              <tr>
                <th className="checkbox-cell">
                  <input 
                    type="checkbox"
                    checked={filteredExportCases.length > 0 && selectedReportIds.length === filteredExportCases.length}
                    onChange={handleToggleSelectAll}
                    disabled={filteredExportCases.length === 0}
                  />
                </th>
                <th>CASE NUMBER</th>
                <th>REPORT ID</th>
                <th>TAXPAYER NAME</th>
                <th>TIN</th>
                <th>TAX TYPE</th>
                <th>TAX PERIOD</th>
                <th>STATUS</th>
                <th>CREATED DATE</th>
                <th>DAYS OPEN</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredExportCases.length === 0 ? (
                <tr>
                  <td colSpan={10} className="table-empty-cell">
                    No intelligence records found matching active filters.
                  </td>
                </tr>
              ) : (
                paginatedReports.map((c) => {
                  const isChecked = selectedReportIds.includes(c.caseNum);
                  
                  // Status pill color resolver
                  let statusClass = "status-created";
                  if (c.status.includes("APPROVED")) statusClass = "status-approved";
                  else if (c.status.includes("RETURNED") || c.status.includes("REJECTED")) statusClass = "status-returned";
                  else if (c.status.includes("SUBMITTED")) statusClass = "status-pending";

                  return (
                    <tr key={c.caseNum} className={isChecked ? 'row-selected' : ''}>
                      <td className="checkbox-cell">
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectRow(c.caseNum)}
                        />
                      </td>
                      <td className="case-num-col">{c.caseNum}</td>
                      <td className="report-id-col">
                        {c.reportId === 'No Report' ? (
                          <span className="no-report-badge">No Report</span>
                        ) : (
                          <span className="report-badge">#{c.reportId}</span>
                        )}
                      </td>
                      <td className="taxpayer-name-col"><strong>{c.taxpayerName}</strong></td>
                      <td><code>{c.tin}</code></td>
                      <td>{c.taxType}</td>
                      <td>{c.taxPeriod}</td>
                      <td>
                        <span className={`ledger-status-badge ${statusClass}`}>
                          {c.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>{c.createdDate}</td>
                      <td className="text-center">{c.daysOpen}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="table-row-actions" style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button 
                            type="button"
                            className="table-action-btn-inspect" 
                            title="View Document"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewCaseDocument(c);
                            }}
                            style={{ padding: '4px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Eye size={12} />
                          </button>
                          <button 
                            type="button"
                            className="table-action-btn-inspect" 
                            title="Download Report PDF"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadCaseReport(c);
                            }}
                            style={{ padding: '4px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Download size={12} />
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
        {renderPagination(reportsPage, filteredExportCases.length, reportsPageSize, setReportsPage, setReportsPageSize)}
        <div className="ledger-table-footer">
          {selectedReportIds.length > 0 && (
            <span className="footer-selected-info">
              {selectedReportIds.length} row(s) selected for export.
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <AppShell>
      {isReportsView ? (
        reportsDashboardView
      ) : (
        <SplitWorkspaceLayout 
          leftPane={leftPaneView} 
          rightPane={rightPaneView} 
          isItemSelected={!!selectedCase}
        />
      )}

      {/* PDF View Modal Overlay */}
      {viewingReportCase && (
        <div className="pdf-preview-modal-overlay" onClick={() => setViewingReportCase(null)}>
          <div className="pdf-preview-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Report Document Preview</h3>
              <div className="modal-header-actions">
                <button 
                  type="button" 
                  className="btn-download-pdf-modal"
                  onClick={() => handleDownloadCaseReport(viewingReportCase)}
                >
                  <Download size={14} />
                  <span>Download PDF</span>
                </button>
                <button 
                  type="button" 
                  className="btn-close-modal"
                  onClick={() => setViewingReportCase(null)}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            
            <div className="modal-body custom-scrollbar">
              <div className="intelligence-pdf-preview modal-pdf-layout">
                <div className="pdf-letterhead">
                  <img src="/Images/HomeLogo.jpeg" alt="RRA Crest" className="pdf-crest-img" />
                  <h4>RWANDA REVENUE AUTHORITY</h4>
                  <span>Intelligence & Enforcement Division</span>
                  <p className="classification-banner">RESTRICTED // INTERNAL USE ONLY</p>
                </div>

                <div className="pdf-metadata-block">
                  <div className="pdf-meta-row"><strong>Title:</strong> <span>Intelligence Findings: {viewingReportCase.caseNum || viewingReportCase.id}</span></div>
                  <div className="pdf-meta-row"><strong>Subject:</strong> <span>{viewingReportCase.taxpayerName || viewingReportCase.subject || 'Suspected Infraction'}</span></div>
                  <div className="pdf-meta-row"><strong>Date:</strong> <span>{viewingReportCase.createdDate || new Date(viewingReportCase.createdAt).toLocaleDateString()}</span></div>
                  <div className="pdf-meta-row"><strong>TIN Reference:</strong> <span className="font-mono">{viewingReportCase.tin || (viewingReportCase.taxPayer?.taxPayerTIN) || 'N/A'}</span></div>
                  <div className="pdf-meta-row"><strong>Status:</strong> <span className="status-indicator-badge">{viewingReportCase.status?.replace(/_/g, ' ')}</span></div>
                </div>

                <div className="pdf-document-body">
                  <h5>I. Executive Summary</h5>
                  <p>{viewingReportCase.summaryOfInformationCase || 'Findings compiled from strategic customs and whistleblower registries.'}</p>
                  
                  <h5>II. Detailed Findings & Legal Basis</h5>
                  {(() => {
                    const matchedReport = reportsList.find(r => r.caseId === viewingReportCase.id || r.id === viewingReportCase.reportId || r.caseId === viewingReportCase.caseNum);
                    const bodyText = matchedReport?.body || 'The taxpayer is under investigation for potential declarations non-compliance. Evidence records indicate inconsistencies in Q1 invoices.';
                    const sections = parseReportBody(bodyText);
                    return sections.map((sec, idx) => (
                      <div key={idx} style={{ marginBottom: '12px' }}>
                        {sec.subject && <h6 style={{ fontSize: '11.5px', fontWeight: 700, color: '#1e293b', margin: '4px 0' }}>{sec.subject}</h6>}
                        <p style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '11px', lineHeight: '1.5' }}>{sec.text}</p>
                      </div>
                    ));
                  })()}

                  {((evidenceAttachments[viewingReportCase.id] || evidenceAttachments[viewingReportCase.caseNum])?.length > 0) && (
                    <>
                      <h5>III. Admissible Evidence Inventory</h5>
                      <table className="pdf-evidence-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginTop: '6px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                            <th style={{ padding: '6px', fontWeight: 700 }}>Tag ID</th>
                            <th style={{ padding: '6px', fontWeight: 700 }}>File Name</th>
                            <th style={{ padding: '6px', fontWeight: 700 }}>Size</th>
                            <th style={{ padding: '6px', fontWeight: 700 }}>Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(evidenceAttachments[viewingReportCase.id] || evidenceAttachments[viewingReportCase.caseNum]).map((file, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '6px', fontFamily: 'monospace' }}>TAG-{idx+101}</td>
                              <td style={{ padding: '6px', fontWeight: 600 }}>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadAttachment(file)}
                                  style={{ background: 'none', border: 'none', color: '#003DA5', textDecoration: 'underline', cursor: 'pointer', padding: 0, font: 'inherit' }}
                                  title="Download Evidence File"
                                >
                                  <Download size={12} style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }} />
                                  <span style={{ verticalAlign: 'middle' }}>{file.name}</span>
                                </button>
                              </td>
                              <td style={{ padding: '6px' }}>{file.size}</td>
                              <td style={{ padding: '6px', color: '#475569', fontStyle: 'italic' }}>{file.description || 'No description provided'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>

                <div className="pdf-signature-blocks">
                  <div className="sig-block">
                    <span>Prepared By</span>
                    <strong className="sig-signed-name">Eric Gatera</strong>
                    <span className="sig-designation">Intelligence Officer</span>
                    <span className="sig-line-stamp">✓ Verified Electronic Stamp</span>
                  </div>

                  <div className="sig-block">
                    <span>Assistant Commissioner</span>
                    <span className="sig-line">
                      {viewingReportCase.status === 'PENDING_DIRECTOR_SIGNATURE' || viewingReportCase.status === 'FINALISED' || viewingReportCase.status === 'INVESTIGATION_COMPLETED' || viewingReportCase.status?.includes('APPROVED')
                        ? <strong className="sig-signed-name">AC Ronald Niwenshuti</strong> 
                        : 'Awaiting Validation...'}
                    </span>
                    {viewingReportCase.status === 'PENDING_DIRECTOR_SIGNATURE' || viewingReportCase.status === 'FINALISED' || viewingReportCase.status === 'INVESTIGATION_COMPLETED' || viewingReportCase.status?.includes('APPROVED') ? (
                      <span className="sig-line-stamp text-success">✓ Signed / Co-Signed</span>
                    ) : null}
                  </div>

                  <div className="sig-block">
                    <span>Director of Intelligence</span>
                    <span className="sig-line">
                      {viewingReportCase.status === 'FINALISED' || viewingReportCase.status === 'INVESTIGATION_COMPLETED' || viewingReportCase.status?.includes('APPROVED')
                        ? <strong className="sig-signed-name">Director Christian Mugunga</strong> 
                        : 'Awaiting Final Approval...'}
                    </span>
                    {viewingReportCase.status === 'FINALISED' || viewingReportCase.status === 'INVESTIGATION_COMPLETED' || viewingReportCase.status?.includes('APPROVED') ? (
                      <span className="sig-line-stamp text-success">✓ Final Sign-off Locked</span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default IntelligenceOfficerDashboard;
