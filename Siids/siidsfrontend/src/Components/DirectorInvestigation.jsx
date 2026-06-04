import React, { useState, useEffect, useMemo, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import {
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    CircularProgress,
    Snackbar,
    Alert,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Typography,
    Autocomplete,
    Box,
    Tooltip,
    List,
    ListItem,
    ListItemText,
    Divider,
    Chip,
    Tabs,
    Tab,
    Grid,
    InputAdornment,
    TablePagination
} from "@mui/material";
import {
    Check,
    Close,
    Description,
    Search,
    Visibility,
    Download,
    Assignment,
    TaskAlt,
    Send,
    AssignmentReturned,
    ThumbUp,
    ThumbDown,
    Refresh,
    FilterList,
    CalendarToday,
    PersonAdd
} from "@mui/icons-material";
import { Link } from "react-router-dom";
import { ReportApi, InvestigationApi } from './../api/Axios/caseApi';
import { format } from 'date-fns';

const STATUS_LABELS = {
    'CASE_CREATED': 'Case Created',
    'REPORT_SUBMITTED': 'Report Submitted',
    'REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE': 'Submitted to Dir Intelligence',
    'REPORT_SUBMITTED_TO_DIRECTOR_INVESTIGATION': 'Report Submitted',
    'REPORT_SUBMITTED_TO_ASSISTANT_COMMISSIONER': 'Submitted to AC',
    'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER': 'Returned to Intel Officer',
    'REPORT_RETURNED_TO_DIRECTOR_INVESTIGATION': 'Returned to Dir Investigation',
    'REPORT_RETURNED_TO_DIRECTOR_INTELLIGENCE': 'Returned to Dir Intelligence',
    'REPORT_RETURNED_ASSISTANT_COMMISSIONER': 'Returned from AC',
    'REPORT_APPROVED': 'Approved',
    'REPORT_REJECTED': 'Rejected',
    'REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE': 'Rejected by Dir Intelligence',
    'REPORT_REJECTED_BY_DIRECTOR_INVESTIGATION': 'Rejected',
    'REPORT_REJECTED_BY_ASSISTANT_COMMISSIONER': 'Rejected by AC',
    'REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE': 'Approved by Dir Intelligence',
    'REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION': 'Approved',
    'REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER': 'Approved by AC',
    'REPORT_ASSIGNED_TO_INVESTIGATION_OFFICER': 'Assigned to Inv Officer',
    'INVESTIGATION_IN_PROGRESS': 'Investigation In Progress',
    'INVESTIGATION_COMPLETED': 'Investigation Completed',
    'CASE_DELETED': 'Case Deleted',
    'ATTACHMENT_DOWNLOADED': 'Attachment Downloaded',
    'INVESTIGATION_FINDINGS_SUBMITTED': 'Findings Submitted',
    'REPORT_SENT_TO_FINANCE': 'Sent to Finance',
    'REPORT_SENT_TO_LEGAL_SERVICES_AND_BOARD_AFFAIRS': 'Sent to Legal Services',
    'REPORT_SENT_TO_CUSTOMS_SERVICES': 'Sent to Customs',
    'REPORT_SENT_TO_STRATEGIC_AND_RISK_ANALYSIS': 'Sent to Strategic Analysis',
    'REPORT_SENT_TO_INTERNAL_AUDIT_AND_INTEGRITY': 'Sent to Internal Audit',
    'REPORT_SENT_TO_IT_AND_DIGITAL_TRANSFORMATION': 'Sent to IT',
    'REPORT_SENT_TO_DOMESTIC_TAXES': 'Sent to Domestic Taxes',
    'REPORT_SENT_TO_LEGAL_TEAM': 'Sent to Legal Team',
    'REPORT_RETURNED_TO_INVESTIGATION_OFFICER': 'Returned to Inv Officer',
    'CASE_PLAN_SUBMITTED': 'Case Plan Submitted',
    'CASE_PLAN_SENT_TO_DIRECTOR_INVESTIGATION': 'Case Plan Submitted',
    'CASE_PLAN_APPROVED_BY_DIRECTOR_INVESTIGATION': 'Case Plan Approved',
    'CASE_PLAN_REJECTED_BY_DIRECTOR_INVESTIGATION': 'Case Plan Rejected',
    'INVESTIGATION_REPORT_SENT_TO_DIRECTOR_INVESTIGATION': 'Inv Report Submitted',
    'INVESTIGATION_REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION': 'Inv Report Approved',
    'INVESTIGATION_REPORT_REJECTED_BY_DIRECTOR_INVESTIGATION': 'Inv Report Rejected',
    'INVESTIGATION_REPORT_REJECTED_BY_ASSISTANT_COMMISSIONER': 'Inv Report Rejected by AC',
    'INVESTIGATION_REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER': 'Inv Report Approved by AC',
    'CASE_PLAN_SENT_TO_ASSISTANT_COMMISSIONER': 'Case Plan Sent to AC',
    'CASE_PLAN_APPROVED_BY_ASSISTANT_COMMISSIONER': 'Case Plan Approved by AC',
    'CASE_PLAN_REJECTED_BY_ASSISTANT_COMMISSIONER': 'Case Plan Rejected by AC',
    'CASE_RECEIVED_BY_INVESTIGATION_OFFICER': 'Received by Officer',
    'TAX_ASSESSMENT_IN_PROGRESS': 'Tax Assessment In Progress',
    'REWARD_MEMO_SUBMITTED': 'Reward Memo Submitted',
    'REWARD_MEMO_SENT_TO_DIRECTOR_INTELLIGENCE': 'Reward Memo Sent to Dir Intel',
    'REWARD_MEMO_SENT_TO_ASSISTANT_COMMISSIONER': 'Reward Memo Sent to AC',
    'REWARD_MEMO_APPROVED_BY_ASSISTANT_COMMISSIONER': 'Reward Memo Approved by AC',
    'REWARD_MEMO_SENT_TO_FINANCE': 'Reward Memo Sent to Finance',
    'REWARD_PAYMENT_COMPLETED': 'Reward Payment Completed',
    'REWARD_MEMO_REJECTED': 'Reward Memo Rejected',
    'CLOSED': 'Closed',
    'IN_PROGRESS': 'In Progress',
    'PARTIAL_DONE': 'Partially Done',
    'FULL_DONE': 'Completed',
    'SURVEILLANCE_REPORT_SUBMITTED': 'Surveillance Submitted',
    'SURVEILLANCE_REPORT_APPROVED_BY_PRSO': 'Surveillance Approved',
    'SURVEILLANCE_REPORT_SENT_TO_AC': 'Surveillance Sent to AC',
    'SEARCH_WARRANT_ISSUED': 'Search Warrant Issued',
    'SEIZURE_NOTE_ISSUED': 'Seizure Note Issued'
};

const getStatusColor = (status) => {
    if (!status) return 'default';
    if (status.includes('APPROVED')) return 'success';
    if (status.includes('REJECTED')) return 'error';
    if (status.includes('SUBMITTED') || status.includes('SENT')) return 'primary';
    if (status.includes('PROGRESS') || status.includes('RETURNED')) return 'warning';
    if (status.includes('COMPLETED')) return 'success';
    if (status.includes('ASSIGNED')) return 'secondary';
    return 'default';
};

const DirectorInvestigation = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [cases, setCases] = useState([]);
    const [officers, setOfficers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [officersLoading, setOfficersLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [selectedCase, setSelectedCase] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [viewFindingsDialogOpen, setViewFindingsDialogOpen] = useState(false);
    const [viewReportDialogOpen, setViewReportDialogOpen] = useState(false);
    const [viewCasePlanDialogOpen, setViewCasePlanDialogOpen] = useState(false);
    const [currentFindings, setCurrentFindings] = useState(null);
    const [currentReport, setCurrentReport] = useState(null);
    const [currentCasePlan, setCurrentCasePlan] = useState(null);
    const [downloadLoading, setDownloadLoading] = useState(false);
    const [downloadAttachmentIndex, setDownloadAttachmentIndex] = useState(null);
    const [assignmentNotes, setAssignmentNotes] = useState('');
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [selectedOfficer, setSelectedOfficer] = useState(null);
    const [casePlanRejectDialogOpen, setCasePlanRejectDialogOpen] = useState(false);
    const [casePlanRejectionReason, setCasePlanRejectionReason] = useState('');
    const [sendToCommissionerDialogOpen, setSendToCommissionerDialogOpen] = useState(false);
    const [selectedCaseForCommissioner, setSelectedCaseForCommissioner] = useState(null);

    // Signature states
    const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
    const [actionToConfirm, setActionToConfirm] = useState(null);
    const sigCanvas = useRef({});

    // Filter states
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // New state for investigation report functionalities
    const [investigationReportDialogOpen, setInvestigationReportDialogOpen] = useState(false);
    const [investigationReportRejectDialogOpen, setInvestigationReportRejectDialogOpen] = useState(false);
    const [investigationReportReturnDialogOpen, setInvestigationReportReturnDialogOpen] = useState(false);
    const [currentInvestigationReport, setCurrentInvestigationReport] = useState(null);
    const [investigationRejectionReason, setInvestigationRejectionReason] = useState('');
    const [investigationReturnReason, setInvestigationReturnReason] = useState('');
    const [selectedCaseForInvestigationReport, setSelectedCaseForInvestigationReport] = useState(null);
    const [activeTab, setActiveTab] = useState(0); // 0: All Operations, 1: Pending Assignment, 2: Investigation Reports Review, 3: Strategic Plans Review

    // Pagination state
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Reset page when tab or search changes
    useEffect(() => {
        setPage(0);
    }, [activeTab, searchQuery, statusFilter, startDate, endDate]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [reportsResponse, officersResponse] = await Promise.all([
                ReportApi.getReportsForDirectorInvestigation(),
                InvestigationApi.getAvailableOfficers()
            ]);

            const mappedCases = reportsResponse.data.map(report => ({
                id: report.relatedCase?.caseNum || `CS${report.id}`,
                delegate: report.investigationOfficer?.employeeId || '',
                delegateName: report.investigationOfficer ?
                    `${report.investigationOfficer.givenName} ${report.investigationOfficer.familyName}` : '',
                reportedDate: report.createdAt,
                status: report.status || 'REPORT_SUBMITTED_TO_DIRECTOR_INVESTIGATION',
                reason: report.rejectionReason || '',
                reportId: report.id,
                caseId: report.relatedCase?._id || report.relatedCase?.id,
                isAssigned: !!report.investigationOfficer,
                hasFindings: report.findings || report.recommendations ||
                    (report.findingsAttachmentPaths && report.findingsAttachmentPaths.length > 0) ||
                    report.status?.includes('INVESTIGATION_REPORT') ||
                    report.status?.includes('FINDINGS'),
                hasCasePlan: report.casePlan ||
                    report.status?.includes('CASE_PLAN'),
                assignmentNotes: report.assignmentNotes || '',
                investigationOfficer: report.investigationOfficer,
                currentRecipient: report.currentRecipient,
                casePlan: report.casePlan,
                casePlanStatus: getCasePlanStatus(report.status),
                casePlanSentToCommissioner: report.status?.includes('CASE_PLAN_SENT_TO_ASSISTANT_COMMISSIONER') ||
                    report.status?.includes('CASE_PLAN_APPROVED_BY_ASSISTANT_COMMISSIONER') ||
                    report.status?.includes('CASE_PLAN_REJECTED_BY_ASSISTANT_COMMISSIONER'),
                investigationReportStatus: getInvestigationReportStatus(report.status),
                findings: report.findings,
                recommendations: report.recommendations,
                findingsAttachments: report.findingsAttachmentPaths || [],
                createdAt: report.createdAt,
                updatedAt: report.updatedAt,
                category: getCaseCategory(report)
            }));

            const mappedOfficers = officersResponse.data.map(officer => ({
                _id: officer.employeeId,
                name: `${officer.givenName} ${officer.familyName}`,
                email: officer.workEmail || officer.personalEmail || officer.email || '',
                ...officer
            }));

            setCases(mappedCases);
            setOfficers(mappedOfficers);
        } catch (err) {
            console.error('Error:', err);
            const message = (err.response && err.response.status === 403)
                ? 'You do not have permission to access these investigations.'
                : (err.response?.data?.message || 'Failed to load data');
            setSnackbar({
                open: true,
                message: message,
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    function getCasePlanStatus(status) {
        if (!status) return 'none';
        if (status.includes('CASE_PLAN_APPROVED')) return 'approved';
        if (status.includes('CASE_PLAN_REJECTED')) return 'rejected';
        if (status.includes('CASE_PLAN_SUBMITTED') || status.includes('CASE_PLAN_SENT')) return 'submitted';
        return 'none';
    }

    function getInvestigationReportStatus(status) {
        if (!status) return 'none';
        if (status.includes('INVESTIGATION_REPORT_APPROVED')) return 'approved';
        if (status.includes('INVESTIGATION_REPORT_REJECTED')) return 'rejected';
        if (status.includes('INVESTIGATION_REPORT_RETURNED')) return 'returned';
        if (status.includes('FINDINGS_SUBMITTED') || 
            status.includes('INVESTIGATION_REPORT_SUBMITTED') || 
            status === 'INVESTIGATION_REPORT_SENT_TO_DIRECTOR_INVESTIGATION') return 'submitted';
        return 'none';
    }

    function getCaseCategory(report) {
        const status = report.status || '';
        if (status.includes('INVESTIGATION_REPORT') || status.includes('FINDINGS_SUBMITTED') || status === 'INVESTIGATION_COMPLETED' || report.findings) {
            return 'investigation_report';
        }
        if (status.includes('CASE_PLAN') || report.casePlan) {
            return 'case_plan';
        }
        if (report.investigationOfficer) {
            return 'assigned';
        }
        return 'general';
    }

    // Filter Logic
    const filteredCases = useMemo(() => {
        return cases.filter(caseItem => {
            // Tab filtering
            if (activeTab === 1 && caseItem.isAssigned) return false;
            if (activeTab === 2 && caseItem.investigationReportStatus !== 'submitted') return false;
            if (activeTab === 3 && caseItem.casePlanStatus !== 'submitted') return false;

            // Search filtering
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = 
                caseItem.id.toLowerCase().includes(searchLower) ||
                (STATUS_LABELS[caseItem.status] || caseItem.status).toLowerCase().includes(searchLower) ||
                caseItem.delegateName.toLowerCase().includes(searchLower) ||
                (caseItem.assignmentNotes && caseItem.assignmentNotes.toLowerCase().includes(searchLower));
            
            if (!matchesSearch) return false;

            // Status filter
            if (statusFilter !== 'ALL' && caseItem.status !== statusFilter) return false;

            // Date filtering
            if (startDate) {
                const caseDate = new Date(caseItem.reportedDate);
                const filterStart = new Date(startDate);
                if (caseDate < filterStart) return false;
            }
            if (endDate) {
                const caseDate = new Date(caseItem.reportedDate);
                const filterEnd = new Date(endDate);
                filterEnd.setHours(23, 59, 59, 999);
                if (caseDate > filterEnd) return false;
            }

            return true;
        });
    }, [cases, activeTab, searchQuery, statusFilter, startDate, endDate]);

    // Counts for tabs
    const tabCounts = useMemo(() => {
        return {
            total: cases.length,
            pendingAssignment: cases.filter(c => !c.isAssigned).length,
            investigationReports: cases.filter(c => c.investigationReportStatus === 'submitted').length,
            strategicPlans: cases.filter(c => c.casePlanStatus === 'submitted').length
        };
    }, [cases]);

    // Unique statuses for the status filter
    const uniqueStatuses = useMemo(() => {
        const statuses = [...new Set(cases.map(c => c.status))];
        return statuses.sort();
    }, [cases]);

    const handleAssignOfficer = async (reportId, officerId, notes) => {
        if (!officerId) {
            setSnackbar({ open: true, message: 'Please select an officer first', severity: 'warning' });
            return;
        }

        try {
            setOfficersLoading(true);
            await ReportApi.assignToInvestigationOfficer(reportId, officerId, notes);

            const assignedOfficer = officers.find(o => o._id === officerId);
            setCases(prevCases => prevCases.map(c =>
                c.reportId === reportId ? {
                    ...c,
                    delegate: officerId,
                    delegateName: assignedOfficer?.name || '',
                    isAssigned: true,
                    status: 'REPORT_ASSIGNED_TO_INVESTIGATION_OFFICER',
                    assignmentNotes: notes || '',
                    investigationOfficer: assignedOfficer,
                    category: 'assigned'
                } : c
            ));

            setSnackbar({ open: true, message: 'Officer assigned successfully', severity: 'success' });
        } catch (err) {
            setSnackbar({ open: true, message: err.response?.data?.message || 'Failed to assign officer', severity: 'error' });
        } finally {
            setOfficersLoading(false);
            setAssignmentNotes('');
            setSelectedOfficer(null);
            setAssignDialogOpen(false);
        }
    };

    const handleApprove = (reportId) => {
        setActionToConfirm({ type: 'approve', reportId });
        setSignatureDialogOpen(true);
    };

    const executeApprove = async () => {
        if (sigCanvas.current.isEmpty()) {
            setSnackbar({ open: true, message: 'Please provide a signature first.', severity: 'error' });
            return;
        }
        
        const signatureBase64 = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
        setSignatureDialogOpen(false);
        const reportId = actionToConfirm.reportId;

        try {
            setOfficersLoading(true);
            const caseItem = cases.find(c => c.reportId === reportId);
            if (!caseItem) return;
            
            const payload = { signatureBase64: signatureBase64 };

            if (caseItem.investigationReportStatus === 'submitted') {
                await ReportApi.approveInvestigationReport(reportId, payload);
                setCases(prev => prev.map(c => c.reportId === reportId ? { ...c, status: 'INVESTIGATION_REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION', investigationReportStatus: 'approved' } : c));
                setSnackbar({ open: true, message: 'Investigation report approved successfully', severity: 'success' });
            } else if (caseItem.casePlanStatus === 'submitted') {
                await ReportApi.approveCasePlan(reportId, payload);
                setCases(prev => prev.map(c => c.reportId === reportId ? { ...c, status: 'CASE_PLAN_APPROVED_BY_DIRECTOR_INVESTIGATION', casePlanStatus: 'approved' } : c));
                setSnackbar({ open: true, message: 'Case plan approved successfully', severity: 'success' });
            } else {
                await ReportApi.approveReport(reportId, payload);
                setCases(prev => prev.map(c => c.reportId === reportId ? { ...c, status: 'REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION' } : c));
                setSnackbar({ open: true, message: 'Report approved successfully', severity: 'success' });
            }
        } catch (err) {
            setSnackbar({ open: true, message: err.response?.data?.message || 'Failed to approve', severity: 'error' });
        } finally {
            setOfficersLoading(false);
            setActionToConfirm(null);
            if(viewFindingsDialogOpen) setViewFindingsDialogOpen(false);
            if(viewCasePlanDialogOpen) setViewCasePlanDialogOpen(false);
        }
    };
    
    const clearSignature = () => {
        sigCanvas.current.clear();
    };

    const [returnDialogOpen, setReturnDialogOpen] = useState(false);
    const [returnReason, setReturnReason] = useState('');

    const handleReject = async () => {
        if (!selectedCase) return;
        try {
            if (selectedCase.investigationReportStatus === 'submitted') {
                await ReportApi.rejectInvestigationReport(selectedCase.reportId, rejectionReason);
                setCases(prev => prev.map(c => c.reportId === selectedCase.reportId ? { ...c, status: 'INVESTIGATION_REPORT_REJECTED_BY_DIRECTOR_INVESTIGATION', investigationReportStatus: 'rejected', reason: rejectionReason } : c));
            } else if (selectedCase.casePlanStatus === 'submitted') {
                await ReportApi.rejectCasePlan(selectedCase.reportId, rejectionReason);
                setCases(prev => prev.map(c => c.reportId === selectedCase.reportId ? { ...c, status: 'CASE_PLAN_REJECTED_BY_DIRECTOR_INVESTIGATION', casePlanStatus: 'rejected', reason: rejectionReason } : c));
            } else {
                await ReportApi.rejectReport(selectedCase.reportId, rejectionReason);
                setCases(prev => prev.map(c => c.reportId === selectedCase.reportId ? { ...c, status: 'REPORT_REJECTED_BY_DIRECTOR_INVESTIGATION', reason: rejectionReason } : c));
            }
            setRejectDialogOpen(false);
            setRejectionReason('');
            setSnackbar({ open: true, message: 'Successfully rejected', severity: 'success' });
        } catch (err) {
            setSnackbar({ open: true, message: err.response?.data?.message || 'Failed to reject', severity: 'error' });
        }
    };

    const handleReturn = async () => {
        if (!selectedCase || !returnReason.trim()) return;
        try {
            if (selectedCase.investigationReportStatus === 'submitted') {
                await ReportApi.returnInvestigationReport(selectedCase.reportId, returnReason);
                setCases(prev => prev.map(c => c.reportId === selectedCase.reportId ? { ...c, status: 'INVESTIGATION_REPORT_RETURNED_TO_OFFICER', investigationReportStatus: 'returned', reason: returnReason } : c));
                setSnackbar({ open: true, message: 'Investigation report returned for revision', severity: 'success' });
            } else {
                // Generic return if needed
                await ReportApi.returnReport(selectedCase.reportId, selectedCase.delegate, returnReason);
                setCases(prev => prev.map(c => c.reportId === selectedCase.reportId ? { ...c, status: 'REPORT_RETURNED_TO_INVESTIGATION_OFFICER', reason: returnReason } : c));
                setSnackbar({ open: true, message: 'Report returned successfully', severity: 'success' });
            }
            setReturnDialogOpen(false);
            setReturnReason('');
        } catch (err) {
            setSnackbar({ open: true, message: err.response?.data?.message || 'Failed to return', severity: 'error' });
        }
    };

    const handleViewFindings = async (caseItem) => {
        try {
            setLoading(true);
            const response = await ReportApi.getFindings(caseItem.reportId);
            setCurrentFindings({
                findings: response.data.findings,
                recommendations: response.data.recommendations,
                attachments: response.data.findingsAttachmentPaths || [],
                assignmentNotes: caseItem.assignmentNotes || response.data.assignmentNotes
            });
            setSelectedCase(caseItem);
            setViewFindingsDialogOpen(true);
        } catch (err) {
            setSnackbar({ open: true, message: 'Failed to load findings', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleViewReport = async (caseItem) => {
        try {
            setLoading(true);
            const response = await ReportApi.getReport(caseItem.reportId);
            setCurrentReport(response.data);
            setSelectedCase(caseItem);
            setViewReportDialogOpen(true);
        } catch (err) {
            setSnackbar({ open: true, message: 'Failed to load report', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleViewCasePlan = async (caseItem) => {
        try {
            setLoading(true);
            const response = await ReportApi.getCasePlan(caseItem.reportId);
            setCurrentCasePlan({
                casePlan: response.data.casePlan,
                attachments: response.data.findingsAttachmentPaths || [],
                reportId: caseItem.reportId,
                status: response.data.status
            });
            setSelectedCase(caseItem);
            setViewCasePlanDialogOpen(true);
        } catch (err) {
            setSnackbar({ open: true, message: 'Failed to load case plan', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadAttachment = async (reportId, attachmentIndex) => {
        try {
            setDownloadLoading(true);
            setDownloadAttachmentIndex(attachmentIndex);
            const filename = currentFindings?.attachments?.[attachmentIndex] ||
                currentCasePlan?.attachments?.[attachmentIndex] ||
                currentInvestigationReport?.attachments?.[attachmentIndex];
            await ReportApi.downloadFindingsAttachment(reportId, filename);
        } catch (err) {
            setSnackbar({ open: true, message: 'Failed to download attachment', severity: 'error' });
        } finally {
            setDownloadLoading(false);
            setDownloadAttachmentIndex(null);
        }
    };

    if (loading && !viewFindingsDialogOpen && !viewReportDialogOpen && !viewCasePlanDialogOpen && !investigationReportDialogOpen) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    const paginatedCases = filteredCases.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <Box sx={{ width: '100%', p: 3, bgcolor: '#f8fafc', minHeight: '100vh' }}>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                    Director of Investigation
                    <Typography component="span" variant="h6" sx={{ ml: 2, color: '#64748b', fontWeight: 500 }}>
                        Case Management Dashboard
                    </Typography>
                </Typography>
                <Button 
                    variant="outlined" 
                    startIcon={<Refresh />} 
                    onClick={fetchData}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                    Refresh Data
                </Button>
            </Box>

            {/* Tabs with Counts */}
            <Paper sx={{ mb: 3, borderRadius: 3, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                <Tabs 
                    value={activeTab} 
                    onChange={(e, newValue) => setActiveTab(newValue)}
                    sx={{
                        '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
                        '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.95rem', py: 2 }
                    }}
                >
                    <Tab label={`All Operations (${tabCounts.total})`} />
                    <Tab label={`Pending Assignment (${tabCounts.pendingAssignment})`} />
                    <Tab label={`Investigation Reports Review (${tabCounts.investigationReports})`} />
                    <Tab label={`Strategic Plans Review (${tabCounts.strategicPlans})`} />
                </Tabs>
            </Paper>

            {/* Filters Row */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                    <TextField
                        fullWidth
                        placeholder="Search Case ID, Officer, Status, or Notes..."
                        variant="outlined"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        size="small"
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search sx={{ color: '#64748b' }} />
                                </InputAdornment>
                            ),
                            sx: { borderRadius: 2, bgcolor: 'white' }
                        }}
                    />
                </Grid>
                <Grid item xs={12} md={2}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Status Filter</InputLabel>
                        <Select
                            value={statusFilter}
                            label="Status Filter"
                            onChange={(e) => setStatusFilter(e.target.value)}
                            sx={{ borderRadius: 2, bgcolor: 'white' }}
                        >
                            <MenuItem value="ALL">All Statuses</MenuItem>
                            {uniqueStatuses.map(status => (
                                <MenuItem key={status} value={status}>
                                    {STATUS_LABELS[status] || status}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                    <TextField
                        fullWidth
                        type="date"
                        label="From Date"
                        size="small"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        InputProps={{ 
                            startAdornment: <CalendarToday sx={{ fontSize: 18, mr: 1, color: '#64748b' }} />,
                            sx: { borderRadius: 2, bgcolor: 'white' } 
                        }}
                    />
                </Grid>
                <Grid item xs={12} md={3}>
                    <TextField
                        fullWidth
                        type="date"
                        label="To Date"
                        size="small"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        InputProps={{ 
                            startAdornment: <CalendarToday sx={{ fontSize: 18, mr: 1, color: '#64748b' }} />,
                            sx: { borderRadius: 2, bgcolor: 'white' } 
                        }}
                    />
                </Grid>
            </Grid>

            <Paper sx={{ borderRadius: 3, boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', overflow: 'hidden' }}>
                <TableContainer sx={{ maxHeight: '65vh' }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5, px: 1, bgcolor: '#f1f5f9' }}>Case ID</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5, px: 1, bgcolor: '#f1f5f9' }}>Current Officer</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5, px: 1, bgcolor: '#f1f5f9' }}>Reported Date</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5, px: 1, bgcolor: '#f1f5f9', width: 140 }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5, px: 1, bgcolor: '#f1f5f9' }}>Case Plan</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5, px: 1, bgcolor: '#f1f5f9' }}>Assignment Notes</TableCell>
                                <TableCell 
                                    align="right" 
                                    sx={{ 
                                        fontWeight: 700, 
                                        color: '#475569', 
                                        py: 1.5, 
                                        px: 1, 
                                        bgcolor: '#f1f5f9',
                                        position: 'sticky',
                                        right: 0,
                                        zIndex: 11,
                                        boxShadow: 'inset 1px 0 0 #e2e8f0'
                                    }}
                                >
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedCases.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 10 }}>
                                        <Box sx={{ opacity: 0.5 }}>
                                            <FilterList sx={{ fontSize: 48, mb: 1 }} />
                                            <Typography variant="h6">No matching cases found</Typography>
                                            <Typography variant="body2">Try adjusting your search or filters</Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedCases.map((caseItem) => (
                                    <TableRow key={caseItem.reportId} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell sx={{ py: 1, px: 1 }}>
                                            <Link 
                                                to={`/view-report/${caseItem.reportId}`}
                                                style={{ textDecoration: 'none', color: '#2563eb', fontWeight: 600 }}
                                            >
                                                {caseItem.id}
                                            </Link>
                                        </TableCell>
                                        <TableCell sx={{ py: 1, px: 1 }}>
                                            {caseItem.isAssigned ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#22c55e' }} />
                                                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.85rem' }}>{caseItem.delegateName}</Typography>
                                                </Box>
                                            ) : (
                                                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.85rem' }}>Unassigned</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell sx={{ py: 1, px: 1, fontSize: '0.85rem' }}>
                                            {caseItem.reportedDate ? format(new Date(caseItem.reportedDate), 'dd/MM/yyyy') : 'N/A'}
                                        </TableCell>
                                        <TableCell sx={{ py: 1, px: 1 }}>
                                            <Chip 
                                                label={STATUS_LABELS[caseItem.status] || caseItem.status}
                                                size="small"
                                                color={getStatusColor(caseItem.status)}
                                                sx={{ fontWeight: 600, fontSize: '0.7rem', borderRadius: 1.5, maxWidth: 130 }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ py: 1, px: 1 }}>
                                            {caseItem.casePlanStatus === 'none' ? (
                                                <Typography variant="caption" color="text.secondary">No Plan</Typography>
                                            ) : (
                                                <Chip 
                                                    label={caseItem.casePlanStatus.charAt(0).toUpperCase() + caseItem.casePlanStatus.slice(1)}
                                                    size="small"
                                                    variant="outlined"
                                                    color={caseItem.casePlanStatus === 'approved' ? 'success' : caseItem.casePlanStatus === 'rejected' ? 'error' : 'primary'}
                                                    sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell sx={{ py: 1, px: 1 }}>
                                            {caseItem.assignmentNotes ? (
                                                <Tooltip title={caseItem.assignmentNotes} arrow>
                                                    <Typography variant="body2" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                                                        {caseItem.assignmentNotes}
                                                    </Typography>
                                                </Tooltip>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell 
                                            align="right" 
                                            sx={{ 
                                                py: 0.5, 
                                                px: 1,
                                                position: 'sticky',
                                                right: 0,
                                                bgcolor: 'white',
                                                zIndex: 10,
                                                boxShadow: 'inset 1px 0 0 #e2e8f0',
                                                '& .MuiButton-root': { fontSize: '0.75rem', py: 0.25 }
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    startIcon={<Visibility sx={{ fontSize: '1rem !important' }} />}
                                                    onClick={() => handleViewReport(caseItem)}
                                                    sx={{ textTransform: 'none', borderRadius: 1.5 }}
                                                >
                                                    View
                                                </Button>

                                                {!caseItem.isAssigned && (
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        color="primary"
                                                        startIcon={<PersonAdd sx={{ fontSize: '1rem !important' }} />}
                                                        onClick={() => {
                                                            setSelectedCase(caseItem);
                                                            setAssignDialogOpen(true);
                                                        }}
                                                        sx={{ textTransform: 'none', borderRadius: 1.5, boxShadow: 'none' }}
                                                    >
                                                        Assign
                                                    </Button>
                                                )}

                                                {caseItem.investigationReportStatus === 'submitted' && (
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        color="info"
                                                        startIcon={<Assignment sx={{ fontSize: '1rem !important' }} />}
                                                        onClick={() => handleViewFindings(caseItem)}
                                                        sx={{ textTransform: 'none', borderRadius: 1.5, boxShadow: 'none' }}
                                                    >
                                                        Review
                                                    </Button>
                                                )}

                                                {caseItem.casePlanStatus === 'submitted' && (
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        color="secondary"
                                                        startIcon={<TaskAlt sx={{ fontSize: '1rem !important' }} />}
                                                        onClick={() => handleViewCasePlan(caseItem)}
                                                        sx={{ textTransform: 'none', borderRadius: 1.5, boxShadow: 'none' }}
                                                    >
                                                        Plan
                                                    </Button>
                                                )}

                                                {(caseItem.investigationReportStatus === 'submitted' || caseItem.casePlanStatus === 'submitted') && (
                                                    <>
                                                        <Button
                                                            size="small"
                                                            variant="contained"
                                                            color="success"
                                                            startIcon={<Check sx={{ fontSize: '1rem !important' }} />}
                                                            onClick={() => handleApprove(caseItem.reportId)}
                                                            sx={{ textTransform: 'none', borderRadius: 1.5, boxShadow: 'none' }}
                                                        >
                                                            Approve
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            variant="contained"
                                                            color="error"
                                                            startIcon={<Close sx={{ fontSize: '1rem !important' }} />}
                                                            onClick={() => {
                                                                setSelectedCase(caseItem);
                                                                setRejectDialogOpen(true);
                                                            }}
                                                            sx={{ textTransform: 'none', borderRadius: 1.5, boxShadow: 'none' }}
                                                        >
                                                            Reject
                                                        </Button>
                                                    </>
                                                )}
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[10, 25, 50]}
                    component="div"
                    count={filteredCases.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    sx={{ borderTop: '1px solid #e2e8f0' }}
                />
            </Paper>

            {/* Findings Dialog */}
            <Dialog open={viewFindingsDialogOpen} onClose={() => setViewFindingsDialogOpen(false)} fullWidth maxWidth="lg">
                <DialogTitle sx={{ fontWeight: 700 }}>Investigation Findings - Case {selectedCase?.id}</DialogTitle>
                <DialogContent dividers>
                    {currentFindings && (
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700, mb: 1 }}>Findings</Typography>
                                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc', whiteSpace: 'pre-wrap' }}>
                                    {currentFindings.findings || 'No findings provided'}
                                </Paper>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700, mb: 1 }}>Recommendations</Typography>
                                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc', whiteSpace: 'pre-wrap' }}>
                                    {currentFindings.recommendations || 'No recommendations provided'}
                                </Paper>
                            </Grid>
                            {currentFindings.attachments?.length > 0 && (
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Attachments</Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {currentFindings.attachments.map((file, idx) => (
                                            <Chip
                                                key={idx}
                                                icon={<Download />}
                                                label={file.split('_').slice(1).join('_') || file}
                                                onClick={() => handleDownloadAttachment(selectedCase.reportId, idx)}
                                                variant="outlined"
                                                sx={{ borderRadius: 1 }}
                                            />
                                        ))}
                                    </Box>
                                </Grid>
                            )}
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setViewFindingsDialogOpen(false)}>Close</Button>
                    {selectedCase?.investigationReportStatus === 'submitted' && (
                        <>
                            <Button variant="contained" color="warning" onClick={() => { setViewFindingsDialogOpen(false); setReturnDialogOpen(true); }}>Return</Button>
                            <Button variant="contained" color="error" onClick={() => { setViewFindingsDialogOpen(false); setRejectDialogOpen(true); }}>Reject</Button>
                            <Button variant="contained" color="success" onClick={() => { setViewFindingsDialogOpen(false); handleApprove(selectedCase.reportId); }}>Approve</Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>

            {/* Return Dialog */}
            <Dialog open={returnDialogOpen} onClose={() => setReturnDialogOpen(false)}>
                <DialogTitle sx={{ fontWeight: 700 }}>Return for Revision</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Please provide a reason or instructions for the revision of <strong>{selectedCase?.id}</strong>.
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Reason for Return"
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        variant="outlined"
                        autoFocus
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setReturnDialogOpen(false)}>Cancel</Button>
                    <Button 
                        variant="contained" 
                        color="warning" 
                        onClick={handleReturn}
                        disabled={!returnReason.trim()}
                    >
                        Confirm Return
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Case Plan Dialog */}
            <Dialog open={viewCasePlanDialogOpen} onClose={() => setViewCasePlanDialogOpen(false)} fullWidth maxWidth="md">
                <DialogTitle sx={{ fontWeight: 700 }}>Strategic Plan Review - Case {selectedCase?.id}</DialogTitle>
                <DialogContent dividers>
                    {currentCasePlan && (
                        <Box>
                            <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700, mb: 1 }}>Plan Details</Typography>
                            <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc', whiteSpace: 'pre-wrap', mb: 3 }}>
                                {currentCasePlan.casePlan || 'No details provided'}
                            </Paper>
                            {currentCasePlan.attachments?.length > 0 && (
                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Supporting Documents</Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {currentCasePlan.attachments.map((file, idx) => (
                                            <Chip
                                                key={idx}
                                                icon={<Download />}
                                                label={file.split('_').slice(1).join('_') || file}
                                                onClick={() => handleDownloadAttachment(selectedCase.reportId, idx)}
                                                variant="outlined"
                                                sx={{ borderRadius: 1 }}
                                            />
                                        ))}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setViewCasePlanDialogOpen(false)}>Close</Button>
                    {selectedCase?.casePlanStatus === 'submitted' && (
                        <>
                            <Button variant="contained" color="error" onClick={() => { setViewCasePlanDialogOpen(false); setRejectDialogOpen(true); }}>Reject Plan</Button>
                            <Button variant="contained" color="success" onClick={() => { setViewCasePlanDialogOpen(false); handleApprove(selectedCase.reportId); }}>Approve Plan</Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>

            {/* Assign Officer Dialog */}
            <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>Assign Investigation Officer</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Select an officer to handle <strong>Case {selectedCase?.id}</strong>. You can also provide specific investigation instructions.
                    </Typography>
                    
                    <Autocomplete
                        options={officers}
                        getOptionLabel={(option) => option.name || ''}
                        renderInput={(params) => <TextField {...params} label="Select Officer" variant="outlined" size="small" />}
                        onChange={(e, value) => setSelectedOfficer(value?._id || null)}
                        sx={{ mb: 3 }}
                    />

                    <TextField
                        fullWidth
                        label="Assignment Notes / Instructions"
                        multiline
                        rows={4}
                        variant="outlined"
                        value={assignmentNotes}
                        onChange={(e) => setAssignmentNotes(e.target.value)}
                        placeholder="Provide detailed instructions for the investigation..."
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
                    <Button 
                        variant="contained" 
                        color="primary" 
                        onClick={() => handleAssignOfficer(selectedCase.reportId, selectedOfficer, assignmentNotes)}
                        disabled={!selectedOfficer || officersLoading}
                    >
                        {officersLoading ? <CircularProgress size={24} /> : 'Confirm Assignment'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)}>
                <DialogTitle sx={{ fontWeight: 700 }}>Provide Rejection Reason</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        You are rejecting the 
                        {selectedCase?.investigationReportStatus === 'submitted' ? ' Investigation Report ' : 
                         selectedCase?.casePlanStatus === 'submitted' ? ' Strategic Plan ' : ' Case '}
                        for <strong>{selectedCase?.id}</strong>.
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Reason for Rejection"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        variant="outlined"
                        autoFocus
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
                    <Button 
                        variant="contained" 
                        color="error" 
                        onClick={handleReject}
                        disabled={!rejectionReason.trim()}
                    >
                        Confirm Rejection
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Report Details Dialog (Internal Report) */}
            <Dialog open={viewReportDialogOpen} onClose={() => setViewReportDialogOpen(false)} fullWidth maxWidth="md">
                <DialogTitle sx={{ fontWeight: 700 }}>Case Detail - {selectedCase?.id}</DialogTitle>
                <DialogContent dividers>
                    {currentReport && (
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Description</Typography>
                                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>{currentReport.description}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Status</Typography>
                                <Chip label={STATUS_LABELS[currentReport.status] || currentReport.status} size="small" color={getStatusColor(currentReport.status)} />
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Reported By</Typography>
                                <Typography variant="body1">{currentReport.createdBy || 'N/A'}</Typography>
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setViewReportDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert severity={snackbar.severity} sx={{ borderRadius: 2 }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            {/* Signature Dialog */}
            <Dialog open={signatureDialogOpen} onClose={() => setSignatureDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>Provide Digital Signature</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        By signing, you are granting operational approval. This signature will be permanently attached to the dossier.
                    </Typography>
                    <Box sx={{ border: '2px dashed #ccc', borderRadius: 2, bgcolor: '#fafafa', p: 1 }}>
                        <SignatureCanvas 
                            ref={sigCanvas} 
                            penColor="black" 
                            canvasProps={{ width: 500, height: 200, className: 'sigCanvas' }} 
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setSignatureDialogOpen(false)}>Cancel</Button>
                    <Button onClick={clearSignature} color="error">Clear</Button>
                    <Button onClick={executeApprove} variant="contained" color="primary">Submit Signature</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default DirectorInvestigation;