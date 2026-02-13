import React, { useState, useEffect } from 'react';
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
    Box,
    Tooltip,
    List,
    ListItem,
    ListItemText,
    Divider,
    Chip,
    Tabs,
    Tab
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
    Refresh
} from "@mui/icons-material";
import { useNavigate, Link } from "react-router-dom";
import { ReportApi, InvestigationApi } from './../api/Axios/caseApi';

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

    // New state for investigation report functionalities
    const [investigationReportDialogOpen, setInvestigationReportDialogOpen] = useState(false);
    const [investigationReportRejectDialogOpen, setInvestigationReportRejectDialogOpen] = useState(false);
    const [investigationReportReturnDialogOpen, setInvestigationReportReturnDialogOpen] = useState(false);
    const [currentInvestigationReport, setCurrentInvestigationReport] = useState(null);
    const [investigationRejectionReason, setInvestigationRejectionReason] = useState('');
    const [investigationReturnReason, setInvestigationReturnReason] = useState('');
    const [selectedCaseForInvestigationReport, setSelectedCaseForInvestigationReport] = useState(null);
    const [activeTab, setActiveTab] = useState(0); // 0: All Cases, 1: Pending Review, 2: Investigation Reports

    const navigate = useNavigate();

    useEffect(() => {
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
                    reportedDate: new Date(report.createdAt).toLocaleDateString(),
                    status: report.status || 'Approved by Assistant Commissioner',
                    reason: report.rejectionReason || '',
                    reportId: report.id,
                    caseId: report.relatedCase?._id,
                    isAssigned: !!report.investigationOfficer,
                    hasFindings: report.findings || report.recommendations ||
                        (report.findingsAttachmentPaths && report.findingsAttachmentPaths.length > 0),
                    hasCasePlan: report.casePlan ||
                        (report.findingsAttachmentPaths && report.findingsAttachmentPaths.length > 0) ||
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
                    email: officer.email || '',
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

        fetchData();
    }, []);

    const getCasePlanStatus = (status) => {
        if (!status) return 'none';
        if (status.includes('CASE_PLAN_SUBMITTED') || status.includes('CASE_PLAN_SENT')) return 'submitted';
        if (status.includes('CASE_PLAN_APPROVED')) return 'approved';
        if (status.includes('CASE_PLAN_REJECTED')) return 'rejected';
        if (status.includes('CASE_PLAN_SENT_TO_ASSISTANT_COMMISSIONER')) return 'sent_to_commissioner';
        if (status.includes('CASE_PLAN_APPROVED_BY_ASSISTANT_COMMISSIONER')) return 'commissioner_approved';
        if (status.includes('CASE_PLAN_REJECTED_BY_ASSISTANT_COMMISSIONER')) return 'commissioner_rejected';
        return 'none';
    };

    const getInvestigationReportStatus = (status) => {
        if (!status) return 'none';
        if (status.includes('FINDINGS_SUBMITTED') || status.includes('INVESTIGATION_REPORT_SUBMITTED')) return 'submitted';
        if (status.includes('INVESTIGATION_REPORT_APPROVED')) return 'approved';
        if (status.includes('INVESTIGATION_REPORT_REJECTED')) return 'rejected';
        if (status.includes('INVESTIGATION_REPORT_RETURNED')) return 'returned';
        if (status.includes('INVESTIGATION_COMPLETED')) return 'completed';
        return 'none';
    };

    const getCaseCategory = (report) => {
        const status = report.status || '';
        if (status.includes('INVESTIGATION_REPORT_SUBMITTED') ||
            status.includes('FINDINGS_SUBMITTED') ||
            (report.findings && report.investigationOfficer)) {
            return 'investigation_report';
        } else if (status.includes('CASE_PLAN')) {
            return 'case_plan';
        } else if (report.investigationOfficer && !status.includes('APPROVED') && !status.includes('REJECTED')) {
            return 'assigned';
        } else {
            return 'general';
        }
    };

    const handleAssignOfficer = async (reportId, officerId, notes) => {
        if (!officerId) {
            setSnackbar({
                open: true,
                message: 'Please select an officer first',
                severity: 'warning'
            });
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
                    status: 'Assigned to Officer',
                    assignmentNotes: notes || '',
                    investigationOfficer: assignedOfficer,
                    category: 'assigned'
                } : c
            ));

            setSnackbar({
                open: true,
                message: 'Officer assigned successfully with instructions',
                severity: 'success'
            });
        } catch (err) {
            console.error('Error:', err);
            setSnackbar({
                open: true,
                message: err.response?.data?.message || 'Failed to assign officer',
                severity: 'error'
            });
        } finally {
            setOfficersLoading(false);
            setAssignmentNotes('');
            setSelectedOfficer(null);
            setAssignDialogOpen(false);
        }
    };

    const handleApprove = async (reportId) => {
        try {
            setOfficersLoading(true);

            // Get the case item to check its status
            const caseItem = cases.find(c => c.reportId === reportId);
            if (!caseItem) {
                setSnackbar({
                    open: true,
                    message: 'Case not found',
                    severity: 'error'
                });
                return;
            }

            // Check what type of approval is needed
            if (caseItem.investigationReportStatus === 'submitted' ||
                caseItem.status?.includes('INVESTIGATION_REPORT') ||
                caseItem.status?.includes('FINDINGS_SUBMITTED')) {
                // This is an investigation report approval
                await ReportApi.approveInvestigationReport(reportId);

                setCases(prevCases => prevCases.map(c =>
                    c.reportId === reportId ? {
                        ...c,
                        status: 'INVESTIGATION_REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION',
                        investigationReportStatus: 'approved',
                        reason: ''
                    } : c
                ));

                setSnackbar({
                    open: true,
                    message: 'Investigation report approved successfully',
                    severity: 'success'
                });
            } else if (caseItem.casePlanStatus === 'submitted') {
                // This is a case plan approval
                await ReportApi.approveCasePlan(reportId);

                setCases(prevCases => prevCases.map(c =>
                    c.reportId === reportId ? {
                        ...c,
                        status: 'CASE_PLAN_APPROVED_BY_DIRECTOR_INVESTIGATION',
                        casePlanStatus: 'approved',
                        reason: ''
                    } : c
                ));

                setSnackbar({
                    open: true,
                    message: 'Case plan approved successfully',
                    severity: 'success'
                });
            } else {
                // This is a regular report approval
                await ReportApi.approveReport(reportId);

                setCases(prevCases => prevCases.map(c =>
                    c.reportId === reportId ? {
                        ...c,
                        status: 'Approved by Director of Investigation',
                        reason: ''
                    } : c
                ));

                setSnackbar({
                    open: true,
                    message: 'Report approved successfully',
                    severity: 'success'
                });
            }
        } catch (err) {
            console.error('Error:', err);
            setSnackbar({
                open: true,
                message: err.response?.data?.message || 'Failed to approve',
                severity: 'error'
            });
        } finally {
            setOfficersLoading(false);
        }
    };

    const handleReject = async () => {
        if (!selectedCase) return;

        try {
            const caseItem = selectedCase;

            // Check what type of rejection is needed
            if (caseItem.investigationReportStatus === 'submitted' ||
                caseItem.status?.includes('INVESTIGATION_REPORT') ||
                caseItem.status?.includes('FINDINGS_SUBMITTED')) {
                // This is an investigation report rejection
                await ReportApi.rejectInvestigationReport(caseItem.reportId, rejectionReason);

                setCases(prevCases => prevCases.map(c =>
                    c.reportId === caseItem.reportId ? {
                        ...c,
                        status: 'INVESTIGATION_REPORT_REJECTED_BY_DIRECTOR_INVESTIGATION',
                        investigationReportStatus: 'rejected',
                        reason: rejectionReason
                    } : c
                ));

                setSnackbar({
                    open: true,
                    message: 'Investigation report rejected successfully',
                    severity: 'success'
                });
            } else if (caseItem.casePlanStatus === 'submitted') {
                // This is a case plan rejection
                await ReportApi.rejectCasePlan(caseItem.reportId, rejectionReason);

                setCases(prevCases => prevCases.map(c =>
                    c.reportId === caseItem.reportId ? {
                        ...c,
                        status: 'CASE_PLAN_REJECTED_BY_DIRECTOR_INVESTIGATION',
                        casePlanStatus: 'rejected',
                        reason: rejectionReason
                    } : c
                ));

                setSnackbar({
                    open: true,
                    message: 'Case plan rejected successfully',
                    severity: 'success'
                });
            } else {
                // This is a regular report rejection
                await ReportApi.rejectReport(caseItem.reportId, rejectionReason);

                setCases(prevCases => prevCases.map(c =>
                    c.reportId === caseItem.reportId ? {
                        ...c,
                        status: 'Rejected by Director of Investigation',
                        reason: rejectionReason
                    } : c
                ));

                setSnackbar({
                    open: true,
                    message: 'Report rejected successfully',
                    severity: 'success'
                });
            }

            setRejectDialogOpen(false);
            setRejectionReason('');
        } catch (err) {
            console.error('Error:', err);
            setSnackbar({
                open: true,
                message: err.response?.data?.message || 'Failed to reject',
                severity: 'error'
            });
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
            console.error('Error fetching findings:', err);
            setSnackbar({
                open: true,
                message: err.response?.data?.message || 'Failed to load findings',
                severity: 'error'
            });
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
            console.error('Error fetching report:', err);
            setSnackbar({
                open: true,
                message: 'Failed to load report',
                severity: 'error'
            });
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
            console.error('Error fetching case plan:', err);
            setSnackbar({
                open: true,
                message: err.response?.data?.message || 'Failed to load case plan',
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    // Investigation Report Functions
    const handleViewInvestigationReport = async (caseItem) => {
        try {
            setLoading(true);
            const response = await ReportApi.getFindings(caseItem.reportId);
            setCurrentInvestigationReport({
                findings: response.data.findings || '',
                recommendations: response.data.recommendations || '',
                attachments: response.data.findingsAttachmentPaths || [],
                reportId: caseItem.reportId,
                caseId: caseItem.id,
                status: response.data.status || '',
                investigationOfficer: caseItem.investigationOfficer || null,
                delegateName: caseItem.delegateName || ''
            });
            setSelectedCaseForInvestigationReport(caseItem);
            setInvestigationReportDialogOpen(true);
        } catch (err) {
            console.error('Error fetching investigation report:', err);
            setSnackbar({
                open: true,
                message: err.response?.data?.message || 'Failed to load investigation report',
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleApproveInvestigationReport = async (reportId) => {
        try {
            setOfficersLoading(true);
            await ReportApi.approveInvestigationReport(reportId);

            setCases(prevCases => prevCases.map(c =>
                c.reportId === reportId ? {
                    ...c,
                    status: 'INVESTIGATION_REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION',
                    investigationReportStatus: 'approved',
                    reason: ''
                } : c
            ));

            setSnackbar({
                open: true,
                message: 'Investigation report approved successfully',
                severity: 'success'
            });
            setInvestigationReportDialogOpen(false);
        } catch (err) {
            console.error('Error:', err);
            setSnackbar({
                open: true,
                message: err.response?.data?.message || 'Failed to approve investigation report',
                severity: 'error'
            });
        } finally {
            setOfficersLoading(false);
        }
    };

    const handleRejectInvestigationReport = async () => {
        if (!selectedCaseForInvestigationReport || !investigationRejectionReason.trim()) return;

        try {
            await ReportApi.rejectInvestigationReport(
                selectedCaseForInvestigationReport.reportId,
                investigationRejectionReason
            );

            setCases(prevCases => prevCases.map(c =>
                c.reportId === selectedCaseForInvestigationReport.reportId ? {
                    ...c,
                    status: 'INVESTIGATION_REPORT_REJECTED_BY_DIRECTOR_INVESTIGATION',
                    investigationReportStatus: 'rejected',
                    reason: investigationRejectionReason
                } : c
            ));

            setSnackbar({
                open: true,
                message: 'Investigation report rejected successfully',
                severity: 'success'
            });
            setInvestigationReportRejectDialogOpen(false);
            setInvestigationReportDialogOpen(false);
            setInvestigationRejectionReason('');
        } catch (err) {
            console.error('Error:', err);
            setSnackbar({
                open: true,
                message: err.response?.data?.message || 'Failed to reject investigation report',
                severity: 'error'
            });
        }
    };

    const handleReturnInvestigationReport = async () => {
        if (!selectedCaseForInvestigationReport || !investigationReturnReason.trim()) return;

        try {
            await ReportApi.returnInvestigationReport(
                selectedCaseForInvestigationReport.reportId,
                investigationReturnReason
            );

            setCases(prevCases => prevCases.map(c =>
                c.reportId === selectedCaseForInvestigationReport.reportId ? {
                    ...c,
                    status: 'INVESTIGATION_REPORT_RETURNED_TO_OFFICER',
                    investigationReportStatus: 'returned',
                    reason: investigationReturnReason
                } : c
            ));

            setSnackbar({
                open: true,
                message: 'Investigation report returned successfully for revision',
                severity: 'success'
            });
            setInvestigationReportReturnDialogOpen(false);
            setInvestigationReportDialogOpen(false);
            setInvestigationReturnReason('');
        } catch (err) {
            console.error('Error:', err);
            setSnackbar({
                open: true,
                message: err.response?.data?.message || 'Failed to return investigation report',
                severity: 'error'
            });
        }
    };

    const handleOpenInvestigationReportRejectDialog = () => {
        setInvestigationReportRejectDialogOpen(true);
        setInvestigationRejectionReason('');
    };

    const handleOpenInvestigationReportReturnDialog = () => {
        setInvestigationReportReturnDialogOpen(true);
        setInvestigationReturnReason('');
    };

    const handleApproveCasePlan = async (reportId) => {
        try {
            setOfficersLoading(true);
            await ReportApi.approveCasePlan(reportId);

            setCases(prevCases => prevCases.map(c =>
                c.reportId === reportId ? {
                    ...c,
                    status: 'Case Plan Approved by Director of Investigation',
                    casePlanStatus: 'approved',
                    hasFindings: true
                } : c
            ));

            setSnackbar({
                open: true,
                message: 'Case plan approved successfully',
                severity: 'success'
            });
            setViewCasePlanDialogOpen(false);
        } catch (err) {
            console.error('Error:', err);
            setSnackbar({
                open: true,
                message: err.response?.data?.message || 'Failed to approve case plan',
                severity: 'error'
            });
        } finally {
            setOfficersLoading(false);
        }
    };

    const handleSendToAssistantCommissioner = async (reportId) => {
        try {
            setOfficersLoading(true);
            await ReportApi.sendCasePlanToDirectorInvestigation(reportId);

            setCases(prevCases => prevCases.map(c =>
                c.reportId === reportId ? {
                    ...c,
                    status: 'Case Plan Sent to Assistant Commissioner',
                    casePlanStatus: 'sent_to_commissioner',
                    casePlanSentToCommissioner: true
                } : c
            ));

            setSnackbar({
                open: true,
                message: 'Case plan sent to Assistant Commissioner for approval',
                severity: 'success'
            });
        } catch (err) {
            console.error('Error:', err);
            setSnackbar({
                open: true,
                message: err.response?.data?.message || 'Failed to send to Assistant Commissioner',
                severity: 'error'
            });
        } finally {
            setOfficersLoading(false);
            setSendToCommissionerDialogOpen(false);
            setSelectedCaseForCommissioner(null);
        }
    };

    const handleRejectCasePlan = async () => {
        if (!currentCasePlan) return;

        try {
            await ReportApi.rejectCasePlan(currentCasePlan.reportId, casePlanRejectionReason);

            setCases(prevCases => prevCases.map(c =>
                c.reportId === currentCasePlan.reportId ? {
                    ...c,
                    status: 'Case Plan Rejected by Director of Investigation',
                    casePlanStatus: 'rejected',
                    reason: casePlanRejectionReason
                } : c
            ));

            setSnackbar({
                open: true,
                message: 'Case plan rejected successfully',
                severity: 'success'
            });
            setViewCasePlanDialogOpen(false);
            setCasePlanRejectDialogOpen(false);
            setCasePlanRejectionReason('');
        } catch (err) {
            console.error('Error:', err);
            setSnackbar({
                open: true,
                message: err.response?.data?.message || 'Failed to reject case plan',
                severity: 'error'
            });
        }
    };

    const handleDownloadAttachment = async (reportId, attachmentIndex) => {
        try {
            setDownloadLoading(true);
            setDownloadAttachmentIndex(attachmentIndex);

            const filename = currentFindings?.attachments?.[attachmentIndex] ||
                currentCasePlan?.attachments?.[attachmentIndex] ||
                currentInvestigationReport?.attachments?.[attachmentIndex];
            const response = await ReportApi.downloadFindingsAttachment(reportId, filename);

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            const contentDisposition = response.headers['content-disposition'];
            let downloadFilename = filename;
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                if (filenameMatch) downloadFilename = filenameMatch[1];
            }

            link.setAttribute('download', downloadFilename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error downloading attachment:', err);
            setSnackbar({
                open: true,
                message: 'Failed to download attachment',
                severity: 'error'
            });
        } finally {
            setDownloadLoading(false);
            setDownloadAttachmentIndex(null);
        }
    };

    const handleOpenAssignDialog = (caseItem) => {
        setSelectedCase(caseItem);
        setSelectedOfficer(caseItem.delegate || '');
        setAssignmentNotes(caseItem.assignmentNotes || '');
        setAssignDialogOpen(true);
    };

    const handleOpenSendToCommissionerDialog = (caseItem) => {
        setSelectedCaseForCommissioner(caseItem);
        setSendToCommissionerDialogOpen(true);
    };

    // Helper functions for filtering
    const shouldShowInvestigationReportActions = (caseItem) => {
        if (!caseItem) return false;

        return caseItem.investigationReportStatus === 'submitted' ||
            caseItem.status?.includes('FINDINGS_SUBMITTED') ||
            caseItem.status?.includes('INVESTIGATION_REPORT_SUBMITTED');
    };

    const getFilteredCases = () => {
        let filtered = cases.filter(caseItem =>
            caseItem.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            caseItem.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
            caseItem.delegateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (caseItem.assignmentNotes && caseItem.assignmentNotes.toLowerCase().includes(searchQuery.toLowerCase()))
        );

        switch (activeTab) {
            case 1: // Pending Review
                filtered = filtered.filter(c =>
                    c.investigationReportStatus === 'submitted' ||
                    c.casePlanStatus === 'submitted'
                );
                break;
            case 2: // Investigation Reports
                filtered = filtered.filter(c => c.category === 'investigation_report');
                break;
            case 3: // Case Plans
                filtered = filtered.filter(c => c.category === 'case_plan');
                break;
            default:
                // All cases
                break;
        }

        return filtered;
    };

    const filteredCases = getFilteredCases();

    if (loading && !viewFindingsDialogOpen && !viewReportDialogOpen && !viewCasePlanDialogOpen && !investigationReportDialogOpen) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <div style={{ padding: "20px" }}>
            <Typography variant="h4" gutterBottom>
                Director of Investigation - Case Management
            </Typography>

            {/* Tabs for filtering */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
                    <Tab label="All Cases" />
                    <Tab label="Pending Review" />
                    <Tab label="Investigation Reports" />
                    <Tab label="Case Plans" />
                </Tabs>
            </Box>

            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <TextField
                    label="Search cases, officers, or instructions"
                    variant="outlined"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: <Search />,
                    }}
                    sx={{ minWidth: 300 }}
                />
                <Typography variant="body2" color="text.secondary">
                    Showing: {filteredCases.length} of {cases.length} cases
                </Typography>
                {activeTab === 1 && (
                    <Chip
                        label={`${filteredCases.length} Pending Review`}
                        color="warning"
                        variant="outlined"
                    />
                )}
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow style={{ backgroundColor: "#f5f5f5" }}>
                            <TableCell><strong>Case ID</strong></TableCell>
                            <TableCell><strong>Assign Officer</strong></TableCell>
                            <TableCell><strong>Current Officer</strong></TableCell>
                            <TableCell><strong>Reported Date</strong></TableCell>
                            <TableCell><strong>Status</strong></TableCell>
                            <TableCell><strong>Case Plan</strong></TableCell>
                            <TableCell><strong>Investigation Report</strong></TableCell>
                            <TableCell><strong>Assignment Notes</strong></TableCell>
                            <TableCell><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredCases.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} align="center">
                                    <Typography variant="body1" color="text.secondary">
                                        No cases found
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredCases.map((caseItem) => (
                                <TableRow key={caseItem.id}>
                                    <TableCell>{caseItem.id}</TableCell>
                                    <TableCell>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Select Officer</InputLabel>
                                            <Select
                                                value={caseItem.delegate || ''}
                                                onChange={(e) => {
                                                    setCases(prev => prev.map(c =>
                                                        c.reportId === caseItem.reportId ? {
                                                            ...c,
                                                            delegate: e.target.value
                                                        } : c
                                                    ));
                                                }}
                                                disabled={caseItem.status.includes("Approved") ||
                                                    caseItem.status.includes("Rejected") ||
                                                    caseItem.status.includes("INVESTIGATION_COMPLETED") ||
                                                    caseItem.casePlanSentToCommissioner ||
                                                    caseItem.investigationReportStatus === 'approved'}
                                            >
                                                <MenuItem value=""><em>None</em></MenuItem>
                                                {officers.map((officer) => (
                                                    <MenuItem key={officer._id} value={officer._id}>
                                                        {officer.name}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </TableCell>
                                    <TableCell>
                                        {caseItem.isAssigned ? (
                                            <Typography color="success.main" fontWeight="bold">
                                                {caseItem.delegateName}
                                            </Typography>
                                        ) : (
                                            <Typography color="text.secondary">Not assigned</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>{caseItem.reportedDate}</TableCell>
                                    <TableCell>
                                        <Typography
                                            sx={{
                                                color: caseItem.status.includes("Approved") ? "green" :
                                                    caseItem.status.includes("Rejected") ? "red" :
                                                        caseItem.status.includes("INVESTIGATION_COMPLETED") ? "blue" :
                                                            caseItem.status.includes("Assigned") ? "orange" :
                                                                caseItem.status.includes("CASE_PLAN") ? "#9c27b0" :
                                                                    caseItem.status.includes("SENT_TO_ASSISTANT_COMMISSIONER") ? "#ff9800" :
                                                                        caseItem.status.includes("COMMISSIONER") ? "#673ab7" :
                                                                            caseItem.status.includes("FINDINGS") ? "#2196f3" :
                                                                                caseItem.status.includes("INVESTIGATION_REPORT") ? "#3f51b5" : "inherit",
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {caseItem.status}
                                        </Typography>
                                        {caseItem.reason && (
                                            <Typography variant="caption" color="error">
                                                Reason: {caseItem.reason}
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {caseItem.casePlanStatus === 'submitted' && (
                                            <Chip
                                                icon={<TaskAlt />}
                                                label="Submitted"
                                                color="primary"
                                                variant="outlined"
                                                size="small"
                                            />
                                        )}
                                        {caseItem.casePlanStatus === 'approved' && (
                                            <Chip
                                                icon={<Check />}
                                                label="Approved"
                                                color="success"
                                                size="small"
                                            />
                                        )}
                                        {caseItem.casePlanStatus === 'rejected' && (
                                            <Chip
                                                icon={<Close />}
                                                label="Rejected"
                                                color="error"
                                                size="small"
                                            />
                                        )}
                                        {caseItem.casePlanStatus === 'none' && (
                                            <Typography variant="body2" color="text.secondary">
                                                Not submitted
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {caseItem.investigationReportStatus === 'submitted' && (
                                            <Chip
                                                icon={<Description />}
                                                label="Submitted"
                                                color="warning"
                                                variant="outlined"
                                                size="small"
                                            />
                                        )}
                                        {caseItem.investigationReportStatus === 'approved' && (
                                            <Chip
                                                icon={<Check />}
                                                label="Approved"
                                                color="success"
                                                size="small"
                                            />
                                        )}
                                        {caseItem.investigationReportStatus === 'rejected' && (
                                            <Chip
                                                icon={<Close />}
                                                label="Rejected"
                                                color="error"
                                                size="small"
                                            />
                                        )}
                                        {caseItem.investigationReportStatus === 'returned' && (
                                            <Chip
                                                icon={<Refresh />}
                                                label="Returned"
                                                color="warning"
                                                size="small"
                                            />
                                        )}
                                        {caseItem.investigationReportStatus === 'none' && (
                                            <Typography variant="body2" color="text.secondary">
                                                Not submitted
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {caseItem.assignmentNotes ? (
                                            <Tooltip title={caseItem.assignmentNotes}>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        maxWidth: 200,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {caseItem.assignmentNotes}
                                                </Typography>
                                            </Tooltip>
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">
                                                No instructions
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Box display="flex" gap={1} flexWrap="wrap">
                                            <Tooltip title="View Report">
                                                <IconButton
                                                    color="primary"
                                                    size="small"
                                                    onClick={() => handleViewReport(caseItem)}
                                                >
                                                    <Description />
                                                </IconButton>
                                            </Tooltip>

                                            {caseItem.hasFindings && (
                                                <Tooltip title="View Findings">
                                                    <IconButton
                                                        color="info"
                                                        size="small"
                                                        onClick={() => handleViewFindings(caseItem)}
                                                    >
                                                        <Visibility />
                                                    </IconButton>
                                                </Tooltip>
                                            )}

                                            {shouldShowInvestigationReportActions(caseItem) && (
                                                <Tooltip title="Review Investigation Report">
                                                    <IconButton
                                                        color="warning"
                                                        size="small"
                                                        onClick={() => handleViewInvestigationReport(caseItem)}
                                                    >
                                                        <Assignment />
                                                    </IconButton>
                                                </Tooltip>
                                            )}

                                            {caseItem.hasCasePlan && caseItem.casePlanStatus === 'submitted' && (
                                                <Tooltip title="View Case Plan">
                                                    <IconButton
                                                        color="secondary"
                                                        size="small"
                                                        onClick={() => handleViewCasePlan(caseItem)}
                                                    >
                                                        <TaskAlt />
                                                    </IconButton>
                                                </Tooltip>
                                            )}

                                            <Tooltip title="Approve Report">
                                                <IconButton
                                                    color="success"
                                                    size="small"
                                                    onClick={() => {
                                                        if (caseItem.reportId) {
                                                            handleApprove(caseItem.reportId);
                                                        } else {
                                                            console.error('Report ID is undefined for case:', caseItem);
                                                            setSnackbar({
                                                                open: true,
                                                                message: 'Cannot approve: Report ID is missing',
                                                                severity: 'error'
                                                            });
                                                        }
                                                    }}
                                                    disabled={caseItem.status.includes("Approved") ||
                                                        caseItem.status.includes("Rejected") ||
                                                        caseItem.status.includes("INVESTIGATION_COMPLETED") ||
                                                        caseItem.casePlanSentToCommissioner ||
                                                        caseItem.investigationReportStatus === 'approved' ||
                                                        caseItem.casePlanStatus === 'approved' ||
                                                        !(
                                                            caseItem.status?.includes('APPROVED_BY_ASSISTANT_COMMISSIONER') ||
                                                            caseItem.status?.includes('ASSIGNED_TO_INVESTIGATION_OFFICER') ||
                                                            caseItem.investigationReportStatus === 'submitted' ||
                                                            caseItem.casePlanStatus === 'submitted'
                                                        )}
                                                >
                                                    <Check />
                                                </IconButton>
                                            </Tooltip>

                                            <Tooltip title="Assign Officer">
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    onClick={() => handleOpenAssignDialog(caseItem)}
                                                    disabled={!caseItem.delegate ||
                                                        caseItem.status.includes("Approved") ||
                                                        caseItem.status.includes("Rejected") ||
                                                        caseItem.status.includes("INVESTIGATION_COMPLETED") ||
                                                        caseItem.casePlanSentToCommissioner ||
                                                        caseItem.investigationReportStatus === 'approved' ||
                                                        caseItem.casePlanStatus === 'approved'}
                                                >
                                                    Assign
                                                </Button>
                                            </Tooltip>

                                            <Tooltip title="Reject Report">
                                                <IconButton
                                                    color="error"
                                                    size="small"
                                                    onClick={() => {
                                                        setSelectedCase(caseItem);
                                                        setRejectDialogOpen(true);
                                                    }}
                                                    disabled={
                                                        caseItem.status.includes("Approved") ||
                                                        caseItem.status.includes("Rejected") ||
                                                        caseItem.status.includes("INVESTIGATION_COMPLETED") ||
                                                        caseItem.casePlanSentToCommissioner ||
                                                        caseItem.investigationReportStatus === 'approved' ||
                                                        caseItem.investigationReportStatus === 'rejected' ||
                                                        caseItem.casePlanStatus === 'approved' ||
                                                        caseItem.casePlanStatus === 'rejected' ||
                                                        !(
                                                            caseItem.status?.includes('APPROVED_BY_ASSISTANT_COMMISSIONER') ||
                                                            caseItem.status?.includes('ASSIGNED_TO_INVESTIGATION_OFFICER') ||
                                                            caseItem.investigationReportStatus === 'submitted' ||
                                                            caseItem.casePlanStatus === 'submitted'
                                                        )
                                                    }
                                                >
                                                    <Close />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Investigation Report Dialog */}
            <Dialog
                open={investigationReportDialogOpen}
                onClose={() => setInvestigationReportDialogOpen(false)}
                fullWidth
                maxWidth="lg"
            >
                <DialogTitle>
                    Investigation Report - Case {selectedCaseForInvestigationReport?.id || 'Unknown'}
                    {selectedCaseForInvestigationReport?.delegateName && (
                        <Typography variant="subtitle1" color="text.secondary">
                            Submitted by: {selectedCaseForInvestigationReport.delegateName}
                        </Typography>
                    )}
                </DialogTitle>
                <DialogContent>
                    {loading ? (
                        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                            <CircularProgress />
                        </Box>
                    ) : (
                        <>
                            {currentInvestigationReport?.findings && (
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                                        Investigation Findings
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    <Paper elevation={0} sx={{ p: 2, backgroundColor: '#f9f9f9', borderRadius: 2 }}>
                                        <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                                            {currentInvestigationReport.findings}
                                        </Typography>
                                    </Paper>
                                </Box>
                            )}

                            {currentInvestigationReport?.recommendations && (
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                                        Recommendations
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    <Paper elevation={0} sx={{ p: 2, backgroundColor: '#f9f9f9', borderRadius: 2 }}>
                                        <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                                            {currentInvestigationReport.recommendations}
                                        </Typography>
                                    </Paper>
                                </Box>
                            )}

                            {currentInvestigationReport?.attachments?.length > 0 && (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                                        Supporting Attachments ({currentInvestigationReport.attachments.length})
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    <List>
                                        {currentInvestigationReport.attachments.map((attachment, index) => (
                                            <ListItem
                                                key={index}
                                                sx={{
                                                    border: '1px solid #e0e0e0',
                                                    borderRadius: 1,
                                                    mb: 1,
                                                    '&:hover': { backgroundColor: '#f5f5f5' }
                                                }}
                                                secondaryAction={
                                                    <Tooltip title="Download Attachment">
                                                        <IconButton
                                                            edge="end"
                                                            onClick={() => handleDownloadAttachment(currentInvestigationReport.reportId, index)}
                                                            disabled={downloadLoading && downloadAttachmentIndex === index}
                                                        >
                                                            {downloadLoading && downloadAttachmentIndex === index ?
                                                                <CircularProgress size={24} /> :
                                                                <Download />}
                                                        </IconButton>
                                                    </Tooltip>
                                                }
                                            >
                                                <ListItemText
                                                    primary={
                                                        <Typography variant="body1">
                                                            {attachment.substring(attachment.indexOf('_') + 1)}
                                                        </Typography>
                                                    }
                                                    secondary={`Attachment ${index + 1}`}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                </Box>
                            )}
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setInvestigationReportDialogOpen(false)}>
                        Close
                    </Button>
                    {selectedCaseForInvestigationReport && shouldShowInvestigationReportActions(selectedCaseForInvestigationReport) && (
                        <>
                            <Button
                                onClick={handleOpenInvestigationReportReturnDialog}
                                color="warning"
                                variant="outlined"
                                startIcon={<AssignmentReturned />}
                            >
                                Return for Revision
                            </Button>
                            <Button
                                onClick={handleOpenInvestigationReportRejectDialog}
                                color="error"
                                variant="outlined"
                                startIcon={<ThumbDown />}
                            >
                                Reject Report
                            </Button>
                            <Button
                                onClick={() => handleApproveInvestigationReport(currentInvestigationReport.reportId)}
                                color="success"
                                variant="contained"
                                disabled={officersLoading}
                                startIcon={<ThumbUp />}
                            >
                                {officersLoading ? <CircularProgress size={24} /> : 'Approve Report'}
                            </Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>

            {/* Investigation Report Reject Dialog */}
            <Dialog open={investigationReportRejectDialogOpen} onClose={() => setInvestigationReportRejectDialogOpen(false)}>
                <DialogTitle>Reject Investigation Report</DialogTitle>
                <DialogContent>
                    <Typography gutterBottom>Case ID: {selectedCaseForInvestigationReport?.id || 'Unknown'}</Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        Please provide a detailed reason for rejecting this investigation report.
                    </Typography>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Rejection Reason"
                        placeholder="Provide detailed reason for rejecting the investigation report..."
                        fullWidth
                        multiline
                        rows={4}
                        value={investigationRejectionReason}
                        onChange={(e) => setInvestigationRejectionReason(e.target.value)}
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setInvestigationReportRejectDialogOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleRejectInvestigationReport}
                        color="error"
                        variant="contained"
                        disabled={!investigationRejectionReason.trim()}
                    >
                        Reject Report
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Investigation Report Return Dialog */}
            <Dialog open={investigationReportReturnDialogOpen} onClose={() => setInvestigationReportReturnDialogOpen(false)}>
                <DialogTitle>Return Investigation Report for Revision</DialogTitle>
                <DialogContent>
                    <Typography gutterBottom>Case ID: {selectedCaseForInvestigationReport?.id || 'Unknown'}</Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        This will return the report to the investigation officer for revision.
                    </Typography>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Return Reason"
                        placeholder="Specify what needs to be revised or added..."
                        fullWidth
                        multiline
                        rows={4}
                        value={investigationReturnReason}
                        onChange={(e) => setInvestigationReturnReason(e.target.value)}
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setInvestigationReportReturnDialogOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleReturnInvestigationReport}
                        color="warning"
                        variant="contained"
                        disabled={!investigationReturnReason.trim()}
                        startIcon={<AssignmentReturned />}
                    >
                        Return for Revision
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Assign Officer Dialog */}
            <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    Assign Investigation Officer - Case {selectedCase?.id}
                </DialogTitle>
                <DialogContent>
                    <Typography gutterBottom variant="h6" color="primary">
                        Selected Officer: {officers.find(o => o._id === selectedOfficer)?.name || 'None selected'}
                    </Typography>

                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Select Investigation Officer</InputLabel>
                        <Select
                            value={selectedOfficer || ''}
                            onChange={(e) => setSelectedOfficer(e.target.value)}
                            label="Select Investigation Officer"
                        >
                            <MenuItem value=""><em>None</em></MenuItem>
                            {officers.map((officer) => (
                                <MenuItem key={officer._id} value={officer._id}>
                                    {officer.name} ({officer.email})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <TextField
                        autoFocus
                        margin="dense"
                        label="Assignment Instructions"
                        placeholder="Provide detailed instructions for the investigation officer..."
                        fullWidth
                        multiline
                        rows={6}
                        value={assignmentNotes}
                        onChange={(e) => setAssignmentNotes(e.target.value)}
                        sx={{ mt: 3 }}
                        helperText="These instructions will be saved and visible to the assigned investigation officer"
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setAssignDialogOpen(false);
                            setAssignmentNotes('');
                            setSelectedOfficer(null);
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => {
                            handleAssignOfficer(selectedCase.reportId, selectedOfficer, assignmentNotes);
                        }}
                        color="primary"
                        variant="contained"
                        disabled={!selectedOfficer || officersLoading}
                    >
                        {officersLoading ? <CircularProgress size={24} /> : 'Assign Officer'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Send to Assistant Commissioner Dialog */}
            <Dialog open={sendToCommissionerDialogOpen} onClose={() => setSendToCommissionerDialogOpen(false)}>
                <DialogTitle>Send Case Plan to Assistant Commissioner</DialogTitle>
                <DialogContent>
                    <Typography gutterBottom variant="h6" color="primary">
                        Case ID: {selectedCaseForCommissioner?.id}
                    </Typography>
                    <Typography variant="body1" paragraph>
                        Are you sure you want to send this case plan to the Assistant Commissioner for approval?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        Once sent, the Assistant Commissioner will review and can either approve or reject the case plan.
                    </Typography>
                    <Typography variant="body2" color="warning.main" sx={{ fontWeight: 'bold' }}>
                        Note: This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setSendToCommissionerDialogOpen(false);
                        setSelectedCaseForCommissioner(null);
                    }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={() => handleSendToAssistantCommissioner(selectedCaseForCommissioner.reportId)}
                        color="secondary"
                        variant="contained"
                        disabled={officersLoading}
                    >
                        {officersLoading ? <CircularProgress size={24} /> : 'Send to Assistant Commissioner'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)}>
                <DialogTitle>Reject Report</DialogTitle>
                <DialogContent>
                    <Typography gutterBottom>Case ID: {selectedCase?.id}</Typography>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Rejection Reason"
                        placeholder="Provide detailed reason for rejection..."
                        fullWidth
                        multiline
                        rows={4}
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setRejectDialogOpen(false);
                        setRejectionReason('');
                    }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleReject}
                        color="error"
                        variant="contained"
                        disabled={!rejectionReason.trim()}
                    >
                        Reject Report
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Report Details Dialog */}
            <Dialog
                open={viewReportDialogOpen}
                onClose={() => setViewReportDialogOpen(false)}
                fullWidth
                maxWidth="md"
            >
                <DialogTitle>Report Details - Case {selectedCase?.id}</DialogTitle>
                <DialogContent>
                    {loading ? (
                        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                            <CircularProgress />
                        </Box>
                    ) : (
                        <>
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6" gutterBottom>Description:</Typography>
                                <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                                    {currentReport?.description || 'No description available'}
                                </Typography>
                            </Box>

                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6" gutterBottom>Status:</Typography>
                                <Typography variant="body1">
                                    {currentReport?.status || 'No status available'}
                                </Typography>
                            </Box>

                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6" gutterBottom>Created By:</Typography>
                                <Typography variant="body1">
                                    {currentReport?.createdBy || 'Unknown'}
                                </Typography>
                            </Box>

                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6" gutterBottom>Created At:</Typography>
                                <Typography variant="body1">
                                    {currentReport?.createdAt ? new Date(currentReport.createdAt).toLocaleString() : 'Unknown'}
                                </Typography>
                            </Box>

                            {currentReport?.attachmentPaths && currentReport.attachmentPaths.length > 0 && (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="h6" gutterBottom>Attachments:</Typography>
                                    {currentReport.attachmentPaths.map((attachment, index) => (
                                        <Button
                                            key={index}
                                            variant="outlined"
                                            startIcon={<Download />}
                                            onClick={() => {
                                                ReportApi.downloadAttachment(currentReport.id, attachment);
                                            }}
                                            disabled={downloadLoading}
                                            sx={{ mr: 1, mb: 1 }}
                                        >
                                            Download {index + 1}
                                        </Button>
                                    ))}
                                </Box>
                            )}
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setViewReportDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Findings Dialog */}
            <Dialog
                open={viewFindingsDialogOpen}
                onClose={() => setViewFindingsDialogOpen(false)}
                fullWidth
                maxWidth="lg"
            >
                <DialogTitle>
                    Investigation Findings - Case {selectedCase?.id}
                </DialogTitle>
                <DialogContent>
                    {loading ? (
                        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                            <CircularProgress />
                        </Box>
                    ) : (
                        <>
                            {currentFindings?.assignmentNotes && (
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                        Assignment Instructions
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    <Paper elevation={1} sx={{ p: 2, backgroundColor: '#f0f7ff', borderRadius: 2 }}>
                                        <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                                            {currentFindings.assignmentNotes}
                                        </Typography>
                                    </Paper>
                                </Box>
                            )}

                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                                    Investigation Findings
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                                {currentFindings?.findings ? (
                                    <Paper elevation={0} sx={{ p: 2, backgroundColor: '#f9f9f9', borderRadius: 2 }}>
                                        <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                                            {currentFindings.findings}
                                        </Typography>
                                    </Paper>
                                ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                        No findings submitted
                                    </Typography>
                                )}
                            </Box>

                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                                    Recommendations
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                                {currentFindings?.recommendations ? (
                                    <Paper elevation={0} sx={{ p: 2, backgroundColor: '#f9f9f9', borderRadius: 2 }}>
                                        <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                                            {currentFindings.recommendations}
                                        </Typography>
                                    </Paper>
                                ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                        No recommendations submitted
                                    </Typography>
                                )}
                            </Box>

                            {currentFindings?.attachments?.length > 0 && (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                                        Supporting Attachments ({currentFindings.attachments.length})
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    <List>
                                        {currentFindings.attachments.map((attachment, index) => (
                                            <ListItem
                                                key={index}
                                                sx={{
                                                    border: '1px solid #e0e0e0',
                                                    borderRadius: 1,
                                                    mb: 1,
                                                    '&:hover': {
                                                        backgroundColor: '#f5f5f5'
                                                    }
                                                }}
                                                secondaryAction={
                                                    <Tooltip title="Download Attachment">
                                                        <IconButton
                                                            edge="end"
                                                            onClick={() => handleDownloadAttachment(selectedCase.reportId, index)}
                                                            disabled={downloadLoading && downloadAttachmentIndex === index}
                                                        >
                                                            {downloadLoading && downloadAttachmentIndex === index ?
                                                                <CircularProgress size={24} /> :
                                                                <Download />}
                                                        </IconButton>
                                                    </Tooltip>
                                                }
                                            >
                                                <ListItemText
                                                    primary={
                                                        <Typography variant="body1">
                                                            {attachment.substring(attachment.indexOf('_') + 1)}
                                                        </Typography>
                                                    }
                                                    secondary={`Attachment ${index + 1}`}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                </Box>
                            )}
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setViewFindingsDialogOpen(false)}
                        variant="contained"
                        color="primary"
                    >
                        Close Findings
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Case Plan Dialog */}
            <Dialog
                open={viewCasePlanDialogOpen}
                onClose={() => setViewCasePlanDialogOpen(false)}
                fullWidth
                maxWidth="lg"
            >
                <DialogTitle>
                    Case Plan - Report #{selectedCase?.id}
                </DialogTitle>
                <DialogContent>
                    {loading ? (
                        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                            <CircularProgress />
                        </Box>
                    ) : (
                        <>
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                                    Case Plan Details
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                                {currentCasePlan?.casePlan ? (
                                    <Paper elevation={0} sx={{ p: 2, backgroundColor: '#f9f9f9', borderRadius: 2 }}>
                                        <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                                            {currentCasePlan.casePlan}
                                        </Typography>
                                    </Paper>
                                ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                        No case plan details provided
                                    </Typography>
                                )}
                            </Box>

                            {currentCasePlan?.attachments?.length > 0 && (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                                        Supporting Attachments ({currentCasePlan.attachments.length})
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    <List>
                                        {currentCasePlan.attachments.map((attachment, index) => (
                                            <ListItem
                                                key={index}
                                                sx={{
                                                    border: '1px solid #e0e0e0',
                                                    borderRadius: 1,
                                                    mb: 1,
                                                    '&:hover': { backgroundColor: '#f5f5f5' }
                                                }}
                                                secondaryAction={
                                                    <Tooltip title="Download Attachment">
                                                        <IconButton
                                                            edge="end"
                                                            onClick={() => handleDownloadAttachment(currentCasePlan.reportId, index)}
                                                            disabled={downloadLoading && downloadAttachmentIndex === index}
                                                        >
                                                            {downloadLoading && downloadAttachmentIndex === index ?
                                                                <CircularProgress size={24} /> :
                                                                <Download />}
                                                        </IconButton>
                                                    </Tooltip>
                                                }
                                            >
                                                <ListItemText
                                                    primary={
                                                        <Typography variant="body1">
                                                            {attachment.substring(attachment.indexOf('_') + 1)}
                                                        </Typography>
                                                    }
                                                    secondary={`Attachment ${index + 1}`}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                </Box>
                            )}
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setViewCasePlanDialogOpen(false)}
                        color="primary"
                    >
                        Cancel
                    </Button>
                    {currentCasePlan?.status &&
                        currentCasePlan.status.includes('CASE_PLAN_SENT_TO_DIRECTOR_INVESTIGATION') && (
                            <>
                                <Button
                                    onClick={() => {
                                        setCasePlanRejectDialogOpen(true);
                                        setCasePlanRejectionReason('');
                                    }}
                                    color="error"
                                    variant="outlined"
                                >
                                    Reject Case Plan
                                </Button>
                                <Button
                                    onClick={() => handleApproveCasePlan(currentCasePlan.reportId)}
                                    color="success"
                                    variant="contained"
                                    disabled={officersLoading}
                                >
                                    {officersLoading ? <CircularProgress size={24} /> : 'Approve Case Plan'}
                                </Button>
                            </>
                        )}
                </DialogActions>
            </Dialog>

            {/* Case Plan Reject Dialog */}
            <Dialog open={casePlanRejectDialogOpen} onClose={() => setCasePlanRejectDialogOpen(false)}>
                <DialogTitle>Reject Case Plan</DialogTitle>
                <DialogContent>
                    <Typography gutterBottom>Report ID: {selectedCase?.id}</Typography>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Rejection Reason"
                        placeholder="Provide detailed reason for rejecting the case plan..."
                        fullWidth
                        multiline
                        rows={4}
                        value={casePlanRejectionReason}
                        onChange={(e) => setCasePlanRejectionReason(e.target.value)}
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setCasePlanRejectDialogOpen(false);
                        setCasePlanRejectionReason('');
                    }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleRejectCasePlan}
                        color="error"
                        variant="contained"
                        disabled={!casePlanRejectionReason.trim()}
                    >
                        Reject Case Plan
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </div>
    );
};

export default DirectorInvestigation;