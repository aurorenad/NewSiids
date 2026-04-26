import React, { useState, useEffect } from 'react';
import {
    Button,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Box,
    CircularProgress,
    Alert,
    Snackbar,
    Tooltip,
    Menu,
    MenuItem,
    TablePagination,
    Typography,
    Chip,
    Tabs,
    Tab,
    FormControl,
    InputLabel,
    Select,
    LinearProgress
} from "@mui/material";
import {
    Search,
    Description,
    Check,
    Close,
    Undo,
    Visibility,
    Article,
    Send,
    Gavel as GavelIcon,
    ArrowUpward,
    ArrowDownward,
    Assessment,
    ReceiptLong,
    ThumbUp,
    ThumbDown,
    Assignment,
    Checklist,
    CloudUpload,
    Delete
} from "@mui/icons-material";

import { useNavigate, Link } from 'react-router-dom';
import { ReportApi } from '../api/Axios/caseApi';

const AssistantCommissioner = () => {
    const [reports, setReports] = useState([]);
    const [casePlans, setCasePlans] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [returnDialogOpen, setReturnDialogOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [casePlansLoading, setCasePlansLoading] = useState(false);
    const [error, setError] = useState(null);
    const [closeDialogOpen, setCloseDialogOpen] = useState(false);
    const [closeReason, setCloseReason] = useState("");
    const [selectedReport, setSelectedReport] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [actionLoading, setActionLoading] = useState({});
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
    const [anchorEl, setAnchorEl] = useState(null);
    const [menuReport, setMenuReport] = useState(null);

    // ✅ Pagination state
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // ✅ Case Plans pagination
    const [casePlansPage, setCasePlansPage] = useState(0);
    const [casePlansRowsPerPage, setCasePlansRowsPerPage] = useState(10);

    // ✅ Sorting state
    const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'

    // ✅ Case Plans sorting
    const [casePlansSortOrder, setCasePlansSortOrder] = useState('desc');

    // ✅ Filter state
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [activeTab, setActiveTab] = useState(0); // 0 for Reports, 1 for Case Plans
    const [casePlanActionDialogOpen, setCasePlanActionDialogOpen] = useState(false);
    const [selectedCasePlan, setSelectedCasePlan] = useState(null);
    const [casePlanActionType, setCasePlanActionType] = useState(''); // 'approve' or 'reject'
    const [casePlanActionReason, setCasePlanActionReason] = useState('');

    // ✅ New return dialog state variables
    const [returnType, setReturnType] = useState('creator');
    const [returnEmployeeId, setReturnEmployeeId] = useState('');
    const [returnReasonText, setReturnReasonText] = useState('');
    const [returnAttachment, setReturnAttachment] = useState(null);
    const [attachmentError, setAttachmentError] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);

    const navigate = useNavigate();

    // Fetch reports
    useEffect(() => {
        const fetchReports = async () => {
            try {
                const response = await ReportApi.getReportsForAssistantCommissioner();
                const mappedReports = response.data.map(report => ({
                    ...report,
                    hasFindings: report.findings || report.recommendations ||
                        (report.findingsAttachmentPaths && report.findingsAttachmentPaths.length > 0),
                    hasFines: report.fines && report.fines.length > 0,
                    hasPenalties: report.penalties && report.penalties.length > 0,
                    // Ensure we have a createdAt field for sorting
                    createdAt: report.createdAt || report.createdDate || report.dateCreated || new Date().toISOString()
                }));
                setReports(mappedReports);
            } catch (err) {
                console.error('Failed to fetch reports:', err);
                if (err.response && err.response.status === 403) {
                    setError('You do not have permission to access these reports. Please contact your administrator if you believe this is a mistake.');
                } else {
                    setError(err.response?.data?.message || 'Failed to fetch reports');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, []);

    // Fetch case plans from real backend API
    const fetchCasePlans = async () => {
        setCasePlansLoading(true);
        try {
            // Use real API method to fetch case plans for assistant commissioner
            const response = await ReportApi.getCasePlansForAssistantCommissioner();
            const mappedCasePlans = response.data.map(report => ({
                ...report,
                // Map report properties to case plan display properties
                id: report.id,
                caseNumber: report.relatedCase?.caseNum || `CP-${report.id}`,
                createdBy: report.createdBy,
                createdAt: report.createdAt || new Date().toISOString(),
                status: report.relatedCase?.status || report.status,
                approvalStatus: getApprovalStatus(report.relatedCase?.status || report.status),
                riskAssessment: report.casePlan ? { level: "HIGH" } : {}, // Example mapping
                investigationPlan: report.casePlan ? ["Investigation steps here"] : [],
                hasRiskAssessment: report.casePlan && report.casePlan.includes("risk"),
                hasInvestigationPlan: report.casePlan && report.casePlan.length > 0,
                // Additional fields from report for display
                description: report.description,
                relatedCase: report.relatedCase,
                currentRecipient: report.currentRecipient,
                casePlan: report.casePlan
            }));
            setCasePlans(mappedCasePlans);
        } catch (err) {
            console.error('Failed to fetch case plans:', err);
            showSnackbar(err.response?.data?.message || 'Failed to fetch case plans', 'error');
        } finally {
            setCasePlansLoading(false);
        }
    };

    // Helper function to determine approval status
    const getApprovalStatus = (status) => {
        if (!status) return 'PENDING';
        const statusStr = status.toString();
        if (statusStr.includes('APPROVED')) return 'APPROVED';
        if (statusStr.includes('REJECTED')) return 'REJECTED';
        if (statusStr.includes('SENT') || statusStr.includes('SUBMITTED') || statusStr.includes('PENDING')) return 'PENDING';
        return 'PENDING';
    };

    useEffect(() => {
        if (activeTab === 1) { // Case Plans tab is active
            fetchCasePlans();
        }
    }, [activeTab]);

    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const response = await ReportApi.getDepartments();
                console.log('Departments response:', response.data);
                setDepartments(response.data);
            } catch (err) {
                console.error("Failed to load departments:", err);
                console.error("Error details:", err.response?.data);
                setDepartments([]);
            }
        };
        fetchDepartments();
    }, []);

    const showSnackbar = (message, severity = "success") => {
        setSnackbar({ open: true, message, severity });
    };

    // ✅ Sort handler for reports
    const handleSortByDate = () => {
        const newSortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
        setSortOrder(newSortOrder);
    };

    // ✅ Sort handler for case plans
    const handleCasePlansSortByDate = () => {
        const newSortOrder = casePlansSortOrder === 'desc' ? 'asc' : 'desc';
        setCasePlansSortOrder(newSortOrder);
    };

    // ✅ File upload handler for return dialog
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = [
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/pdf',
            'text/plain'
        ];

        const fileExtension = file.name.split('.').pop().toLowerCase();
        const allowedExtensions = ['doc', 'docx', 'pdf', 'txt'];

        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
            setAttachmentError('Invalid file type. Please upload .doc, .docx, .pdf, or .txt files.');
            return;
        }

        // Validate file size (10MB max)
        const maxSize = 10 * 1024 * 1024; // 10MB in bytes
        if (file.size > maxSize) {
            setAttachmentError('File size exceeds 10MB limit.');
            return;
        }

        setAttachmentError('');
        setReturnAttachment(file);

        // Simulate upload progress
        setUploadProgress(0);
        const interval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return prev + 10;
            });
        }, 100);
    };

    const handleRemoveAttachment = () => {
        setReturnAttachment(null);
        setAttachmentError('');
        setUploadProgress(0);
    };

    // ✅ Filter and sort reports
    const filteredAndSortedReports = React.useMemo(() => {
        let results = reports.filter(report => {
            const searchLower = searchQuery.toLowerCase();

            // Search filter
            const matchesSearch = (
                report.id.toString().includes(searchLower) ||
                (report.relatedCase?.caseNum?.toLowerCase().includes(searchLower)) ||
                (report.createdBy?.toLowerCase().includes(searchLower))
            );

            if (!matchesSearch) return false;

            // Status filter
            if (filterStatus !== 'ALL' && report.status !== filterStatus) {
                return false;
            }

            return true;
        });

        // Apply sorting by date
        results.sort((a, b) => {
            const dateA = new Date(a.createdAt);
            const dateB = new Date(b.createdAt);

            if (sortOrder === 'desc') {
                return dateB - dateA; // newest first
            } else {
                return dateA - dateB; // oldest first
            }
        });

        return results;
    }, [reports, searchQuery, sortOrder, filterStatus]);

    // ✅ Filter and sort case plans
    const filteredAndSortedCasePlans = React.useMemo(() => {
        let results = [...casePlans];

        // Apply sorting by date
        results.sort((a, b) => {
            const dateA = new Date(a.createdAt);
            const dateB = new Date(b.createdAt);

            if (casePlansSortOrder === 'desc') {
                return dateB - dateA; // newest first
            } else {
                return dateA - dateB; // oldest first
            }
        });

        return results;
    }, [casePlans, casePlansSortOrder]);

    // ✅ Pagination handlers for reports
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // ✅ Pagination handlers for case plans
    const handleCasePlansChangePage = (event, newPage) => {
        setCasePlansPage(newPage);
    };

    const handleCasePlansChangeRowsPerPage = (event) => {
        setCasePlansRowsPerPage(parseInt(event.target.value, 10));
        setCasePlansPage(0);
    };

    // ✅ Status filter handler
    const handleStatusFilterChange = (status) => {
        setFilterStatus(status);
        setPage(0);
    };

    // ✅ Fines filter handler
    // ✅ Tab change handler
    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    // ✅ Case Plan Approval/Rejection handlers
    const handleApproveCasePlan = (casePlan) => {
        setSelectedCasePlan(casePlan);
        setCasePlanActionType('approve');
        setCasePlanActionDialogOpen(true);
    };

    const handleRejectCasePlan = (casePlan) => {
        setSelectedCasePlan(casePlan);
        setCasePlanActionType('reject');
        setCasePlanActionDialogOpen(true);
    };

    const handleCasePlanActionDialogClose = () => {
        setCasePlanActionDialogOpen(false);
        setSelectedCasePlan(null);
        setCasePlanActionReason('');
        setCasePlanActionType('');
    };

    // Handle case plan approval/rejection using real API
    const handleConfirmCasePlanAction = async () => {
        if (!selectedCasePlan) return;

        setActionLoading(prev => ({ ...prev, [selectedCasePlan.id]: true }));

        try {
            if (casePlanActionType === 'approve') {
                // Use real API method for approval
                await ReportApi.approveCasePlanByAssistantCommissioner(
                    selectedCasePlan.id,
                    casePlanActionReason || undefined
                );

                // Update local state
                setCasePlans(prev => prev.map(plan =>
                    plan.id === selectedCasePlan.id ? {
                        ...plan,
                        status: 'CASE_PLAN_APPROVED_BY_ASSISTANT_COMMISSIONER',
                        approvalStatus: 'APPROVED'
                    } : plan
                ));

                showSnackbar("Case plan approved successfully");
            } else if (casePlanActionType === 'reject') {
                // Use real API method for rejection
                await ReportApi.rejectCasePlanByAssistantCommissioner(
                    selectedCasePlan.id,
                    casePlanActionReason || ''
                );

                // Update local state
                setCasePlans(prev => prev.map(plan =>
                    plan.id === selectedCasePlan.id ? {
                        ...plan,
                        status: 'CASE_PLAN_REJECTED_BY_ASSISTANT_COMMISSIONER',
                        approvalStatus: 'REJECTED'
                    } : plan
                ));

                showSnackbar("Case plan rejected");
            }

            handleCasePlanActionDialogClose();
        } catch (err) {
            console.error(`Failed to ${casePlanActionType} case plan:`, err);
            showSnackbar(err.response?.data?.message || `Failed to ${casePlanActionType} case plan`, "error");
        } finally {
            setActionLoading(prev => ({ ...prev, [selectedCasePlan.id]: false }));
        }
    };

    const handleApprove = (e, report) => {
        // Instead of immediate approval, open the "Send to Department" menu
        // as requested by the user.
        handleMenuOpen(e, report);
    };

    const handleReject = (report) => {
        setSelectedReport(report);
        setCloseDialogOpen(true);
    };

    const handleDialogClose = () => {
        setCloseDialogOpen(false);
        setSelectedReport(null);
        setCloseReason("");
    };

    const handleConfirmReject = async () => {
        setActionLoading(prev => ({ ...prev, [selectedReport.id]: true }));
        try {
            await ReportApi.rejectReport(selectedReport.id, closeReason);
            setReports(prev => prev.map(r =>
                r.id === selectedReport.id ? {
                    ...r,
                    status: `REPORT_REJECTED_BY_ASSISTANT_COMMISSIONER - ${closeReason}`
                } : r
            ));
            showSnackbar("Report rejected.");
            handleDialogClose();
        } catch (err) {
            console.error('Failed to reject report:', err);
            showSnackbar(err.response?.data?.message || "Rejection failed.", "error");
        } finally {
            setActionLoading(prev => ({ ...prev, [selectedReport.id]: false }));
        }
    };

    const handleOpenReturnDialog = (report) => {
        setSelectedReport(report);
        setReturnDialogOpen(true);
    };

    const handleCloseReturnDialog = () => {
        setReturnDialogOpen(false);
        setReturnType('creator');
        setReturnEmployeeId('');
        setReturnReasonText('');
        setReturnAttachment(null);
        setAttachmentError('');
        setUploadProgress(0);
        setSelectedReport(null);
    };

    const handleConfirmReturn = async () => {
        // Validate that either text reason or attachment is provided
        if (!returnAttachment && !returnReasonText.trim()) {
            showSnackbar("Please provide either a text reason or upload a document.", "error");
            return;
        }

        // Validate employee ID if return type is 'employeeId'
        if (returnType === 'employeeId' && !returnEmployeeId.trim()) {
            showSnackbar("Please enter an employee ID.", "error");
            return;
        }

        // Determine recipient
        let recipientId;
        if (returnType === 'creator') {
            recipientId = selectedReport.createdByEmployeeId || selectedReport.createdBy;
        } else {
            recipientId = returnEmployeeId;
        }

        try {
            setActionLoading(prev => ({ ...prev, [selectedReport.id]: true }));

            console.log('Sending return request with:', {
                reportId: selectedReport.id,
                recipientId: recipientId,
                returnReason: returnReasonText,
                hasAttachment: !!returnAttachment
            });

            // Call the API with proper parameters
            await ReportApi.returnReportWithAttachment(
                selectedReport.id,      // reportId (should be a number)
                recipientId,            // returnToEmployeeId
                returnReasonText || '', // returnReason
                returnAttachment        // returnDocument (file or null)
            );

            // Update local state
            setReports(prev => prev.map(r =>
                r.id === selectedReport.id ? {
                    ...r,
                    status: "REPORT_RETURNED_TO_DIRECTOR_INTELLIGENCE"
                } : r
            ));

            showSnackbar("Report returned successfully");
            handleCloseReturnDialog();
        } catch (err) {
            console.error('Failed to return report:', err);
            console.error('Error details:', err.response);
            showSnackbar(err.response?.data?.message || 'Failed to return report', "error");
        } finally {
            setActionLoading(prev => ({ ...prev, [selectedReport.id]: false }));
        }
    };

    const handleSendToLegalAdvisor = async (report) => {
        try {
            setActionLoading(prev => ({ ...prev, [report.id]: true }));

            await ReportApi.sendReportToLegalAdvisor(report.id);

            setReports(prev => prev.map(r =>
                r.id === report.id ? {
                    ...r,
                    status: "REPORT_SENT_TO_LEGAL_TEAM"
                } : r
            ));

            showSnackbar("Report sent to Legal Advisor successfully");
        } catch (err) {
            console.error('Failed to send report to Legal Advisor:', err);
            showSnackbar(err.response?.data?.message || 'Failed to send report to Legal Advisor', "error");
        } finally {
            setActionLoading(prev => ({ ...prev, [report.id]: false }));
        }
    };

    const handleViewFinesReport = async () => {
        try {
            const response = await ReportApi.getFinesReportForAssistantCommissioner();
            console.log('Fines report:', response.data);
            showSnackbar("Fines report loaded successfully");

            navigate('/assistant-commissioner/fines-report', {
                state: { finesReport: response.data }
            });
        } catch (err) {
            console.error('Failed to fetch fines report:', err);
            showSnackbar("Failed to load fines report", "error");
        }
    };

    const handleViewPenaltiesReport = async () => {
        try {
            const response = await ReportApi.getPenaltiesReportForAssistantCommissioner();
            console.log('Penalties report:', response.data);
            showSnackbar("Penalties report loaded successfully");

            navigate('/assistant-commissioner/penalties-report', {
                state: { penaltiesReport: response.data }
            });
        } catch (err) {
            console.error('Failed to fetch penalties report:', err);
            showSnackbar("Failed to load penalties report", "error");
        }
    };

    const handleMenuOpen = (event, report) => {
        setAnchorEl(event.currentTarget);
        setMenuReport(report);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setMenuReport(null);
    };

    const handleSendToDepartment = async (departmentName) => {
        try {
            setActionLoading(prev => ({ ...prev, [menuReport.id]: true }));
            console.log('Sending to department:', departmentName);

            await ReportApi.sendReport(menuReport.id, departmentName);

            setReports(prev => prev.map(r =>
                r.id === menuReport.id ? {
                    ...r,
                    status: `REPORT_SENT_TO_${departmentName.toUpperCase().replace(/\s+/g, '_')}`
                } : r
            ));
            showSnackbar(`Report sent to ${departmentName} successfully`);
        } catch (err) {
            console.error("Failed to send report:", err);
            console.error("Error response:", err.response?.data);
            showSnackbar(err.response?.data?.message || "Failed to send report", "error");
        } finally {
            setActionLoading(prev => ({ ...prev, [menuReport.id]: false }));
            handleMenuClose();
        }
    };

    const formatStatus = (status) => {
        const statusMap = {
            // Report Statuses
            "REPORT_SUBMITTED_TO_ASSISTANT_COMMISSIONER": "Submitted for Review",
            "REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE": "Approved by Director Intelligence",
            "REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER": "Approved by AC",
            "REPORT_REJECTED_BY_ASSISTANT_COMMISSIONER": "Rejected",
            "REPORT_RETURNED_TO_DIRECTOR_INTELLIGENCE": "Returned",
            "REPORT_SENT_TO_LEGAL_SERVICES_AND_BOARD_AFFAIRS": "Sent to Legal Services",
            "REPORT_SENT_TO_CUSTOMS_SERVICES": "Sent to Customs",
            "REPORT_SENT_TO_FINANCE": "Sent to Finance",
            "REPORT_SENT_TO_STRATEGIC_AND_RISK_ANALYSIS": "Sent to Strategic and Risk Analysis",
            "REPORT_SENT_TO_INTERNAL_AUDIT_AND_INTEGRITY": "Sent to Internal Audit",
            "REPORT_SENT_TO_IT_AND_DIGITAL_TRANSFORMATION": "Sent to IT",
            "REPORT_SENT_TO_LEGAL_TEAM": "Sent to Legal Advisor",
            // Case Plan Statuses
            "CASE_PLAN_SUBMITTED": "Case Plan Submitted",
            "CASE_PLAN_SENT_TO_DIRECTOR_INVESTIGATION": "Sent to Director of Investigation",
            "CASE_PLAN_APPROVED_BY_DIRECTOR_INVESTIGATION": "Approved by Director of Investigation",
            "CASE_PLAN_REJECTED_BY_DIRECTOR_INVESTIGATION": "Rejected by Director of Investigation",
            "CASE_PLAN_SENT_TO_ASSISTANT_COMMISSIONER": "Pending Assistant Commissioner Approval",
            "CASE_PLAN_APPROVED_BY_ASSISTANT_COMMISSIONER": "Approved by Assistant Commissioner",
            "CASE_PLAN_REJECTED_BY_ASSISTANT_COMMISSIONER": "Rejected by Assistant Commissioner",
            // Generic Statuses
            "PENDING_APPROVAL": "Pending Approval",
            "SUBMITTED": "Submitted",
            "APPROVED": "Approved",
            "REJECTED": "Rejected",
            "DRAFT": "Draft",
            "INVESTIGATION_IN_PROGRESS": "Investigation in Progress",
            "INVESTIGATION_COMPLETED": "Investigation Completed"
        };
        return statusMap[status] || status?.replace(/_/g, ' ')?.toLowerCase() || 'Unknown';
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return '-';
        }
    };

    // Get unique statuses for filter
    const uniqueStatuses = ['ALL', ...new Set(reports.map(r => r.status))];

    if (loading && activeTab === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
            </Box>
        );
    }

    if (error && activeTab === 0) {
        return (
            <Box p={3}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    return (
        <div style={{ padding: "20px" }}>
            <Typography variant="h5" gutterBottom>
                Assistant Commissioner Dashboard
            </Typography>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={activeTab} onChange={handleTabChange}>
                    <Tab icon={<Description />} label="Reports" />
                    <Tab icon={<Assignment />} label="Case Plans" />
                </Tabs>
            </Box>

            {activeTab === 0 ? (
                // REPORTS TAB
                <>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} gap={2}>
                        <Box display="flex" alignItems="center" gap={2} flex={1}>
                            <TextField
                                size="small"
                                placeholder="Search reports..."
                                variant="outlined"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                InputProps={{
                                    startAdornment: <Search fontSize="small" sx={{ mr: 1 }} />
                                }}
                            />

                            {/* Sort by Date Button */}
                            <Tooltip title={`Sort by creation date (${sortOrder === 'desc' ? 'newest first' : 'oldest first'})`}>
                                <Button
                                    variant="outlined"
                                    onClick={handleSortByDate}
                                    startIcon={sortOrder === 'desc' ? <ArrowDownward /> : <ArrowUpward />}
                                >
                                    Created Date {sortOrder === 'desc' ? '↓' : '↑'}
                                </Button>
                            </Tooltip>

                            {/* Status Filter */}
                            <Tooltip title="Filter by status">
                                <TextField
                                    select
                                    size="small"
                                    value={filterStatus}
                                    onChange={(e) => handleStatusFilterChange(e.target.value)}
                                    SelectProps={{ native: true }}
                                    variant="outlined"
                                    sx={{ minWidth: 200 }}
                                >
                                    {uniqueStatuses.map((status) => (
                                        <option key={status} value={status}>
                                            {status === 'ALL' ? 'All Statuses' : formatStatus(status)}
                                        </option>
                                    ))}
                                </TextField>
                            </Tooltip>

                        </Box>

                        <Box display="flex" gap={2}>
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<Article />}
                                onClick={handleViewFinesReport}
                            >
                                Fines Report
                            </Button>
                            <Button
                                variant="contained"
                                color="secondary"
                                startIcon={<Assessment />}
                                onClick={handleViewPenaltiesReport}
                            >
                                Penalties Report
                            </Button>
                        </Box>
                    </Box>



                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow style={{ backgroundColor: "#cfd8dc" }}>
                                    <TableCell>Report ID</TableCell>
                                    <TableCell>Case Number</TableCell>
                                    <TableCell>Created By</TableCell>
                                    <TableCell
                                        style={{
                                            cursor: 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                        onClick={handleSortByDate}
                                    >
                                        <Box display="flex" alignItems="center" gap={1}>
                                            Created Date
                                            {sortOrder === 'desc' ? <ArrowDownward fontSize="small" /> : <ArrowUpward fontSize="small" />}
                                        </Box>
                                    </TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Fines/Penalties</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredAndSortedReports.length > 0 ? (
                                    filteredAndSortedReports
                                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                        .map((report) => (
                                            <TableRow key={report.id}>
                                                <TableCell>{report.id}</TableCell>
                                                <TableCell>{report.relatedCase?.caseNum || 'N/A'}</TableCell>
                                                <TableCell>{report.createdBy}</TableCell>
                                                <TableCell>
                                                    {formatDate(report.createdAt)}
                                                </TableCell>
                                                <TableCell style={{
                                                    color: report.status.includes("APPROVED") ? "green" :
                                                        report.status.includes("REJECTED") ? "red" :
                                                            report.status.includes("RETURNED") ? "orange" : "#555",
                                                    fontWeight: "bold"
                                                }}>
                                                    {formatStatus(report.status)}
                                                </TableCell>
                                                <TableCell>
                                                    <Box display="flex" gap={1}>
                                                        {report.hasFines && (
                                                            <Chip
                                                                label="Fines"
                                                                size="small"
                                                                color="warning"
                                                                variant="outlined"
                                                            />
                                                        )}
                                                        {report.hasPenalties && (
                                                            <Chip
                                                                label="Penalties"
                                                                size="small"
                                                                color="error"
                                                                variant="outlined"
                                                            />
                                                        )}
                                                        {!report.hasFines && !report.hasPenalties && (
                                                            <Typography variant="caption" color="textSecondary">
                                                                None
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Box display="flex" gap={1}>
                                                        <Tooltip title="View Report">
                                                            <IconButton
                                                                onClick={() => navigate(`/reports/${report.id}/findings`)}
                                                                color="primary"
                                                            >
                                                                <Description />
                                                            </IconButton>
                                                        </Tooltip>

                                                        {report.hasFindings && (
                                                            <Tooltip title="View Full Findings">
                                                                <IconButton
                                                                    color="info"
                                                                    size="small"
                                                                    component={Link}
                                                                    to={`/reports/${report.id}/findings`}
                                                                >
                                                                    <Visibility />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}

                                                        {["REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE", "REPORT_SUBMITTED_TO_ASSISTANT_COMMISSIONER", "REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER"].includes(report.status) && (
                                                            <>
                                                                <Tooltip title="Approve & Send to Department">
                                                                    <IconButton
                                                                        color="success"
                                                                        onClick={(e) => handleApprove(e, report)}
                                                                        disabled={report.status === "REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER" || actionLoading[report.id]}
                                                                    >
                                                                        {actionLoading[report.id] ? <CircularProgress size={24} /> : <Check />}
                                                                    </IconButton>
                                                                </Tooltip>

                                                                <Tooltip title="Return">
                                                                    <IconButton
                                                                        color="warning"
                                                                        onClick={() => handleOpenReturnDialog(report)}
                                                                        disabled={actionLoading[report.id]}
                                                                    >
                                                                        <Undo />
                                                                    </IconButton>
                                                                </Tooltip>

                                                                <Tooltip title="Reject">
                                                                    <IconButton
                                                                        color="error"
                                                                        onClick={() => handleReject(report)}
                                                                        disabled={report.status.includes("REJECTED") || actionLoading[report.id]}
                                                                    >
                                                                        <Close />
                                                                    </IconButton>
                                                                </Tooltip>

                                                                <Tooltip title="Send to Legal Advisor">
                                                                    <IconButton
                                                                        color="primary"
                                                                        onClick={() => handleSendToLegalAdvisor(report)}
                                                                        disabled={actionLoading[report.id]}
                                                                    >
                                                                        <GavelIcon />
                                                                    </IconButton>
                                                                </Tooltip>

                                                            </>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center">
                                            No reports found matching your criteria
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        {/* ✅ Pagination */}
                        <TablePagination
                            component="div"
                            count={filteredAndSortedReports.length}
                            page={page}
                            onPageChange={handleChangePage}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                            rowsPerPageOptions={[5, 10, 25, 50]}
                        />
                    </TableContainer>
                </>
            ) : (
                // CASE PLANS TAB
                <>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                        <Typography variant="h6">
                            Case Plans Pending Approval
                        </Typography>
                        <Box display="flex" gap={2}>
                            <Tooltip title={`Sort by creation date (${casePlansSortOrder === 'desc' ? 'newest first' : 'oldest first'})`}>
                                <Button
                                    variant="outlined"
                                    onClick={handleCasePlansSortByDate}
                                    startIcon={casePlansSortOrder === 'desc' ? <ArrowDownward /> : <ArrowUpward />}
                                >
                                    Sort by Date {casePlansSortOrder === 'desc' ? '↓' : '↑'}
                                </Button>
                            </Tooltip>
                            <Button
                                variant="outlined"
                                onClick={fetchCasePlans}
                                startIcon={<Checklist />}
                            >
                                Refresh
                            </Button>
                        </Box>
                    </Box>

                    {casePlansLoading ? (
                        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                            <CircularProgress />
                        </Box>
                    ) : (
                        <>
                            <Box display="flex" gap={2} mb={3}>
                                <Chip
                                    label={`Total Case Plans: ${casePlans.length}`}
                                    color="default"
                                    variant="outlined"
                                />
                                <Chip
                                    label={`Pending Approval: ${casePlans.filter(cp =>
                                        cp.status === 'CASE_PLAN_SENT_TO_ASSISTANT_COMMISSIONER' ||
                                        cp.status.includes('SENT') ||
                                        cp.status.includes('PENDING')
                                    ).length}`}
                                    color="warning"
                                    variant="outlined"
                                />
                                <Chip
                                    label={`With Case Plan: ${casePlans.filter(cp => cp.casePlan).length}`}
                                    color="info"
                                    variant="outlined"
                                />
                                <Chip
                                    label={`Approved: ${casePlans.filter(cp =>
                                        cp.status.includes('APPROVED') ||
                                        cp.approvalStatus === 'APPROVED'
                                    ).length}`}
                                    color="success"
                                    variant="outlined"
                                />
                            </Box>

                            <TableContainer component={Paper}>
                                <Table>
                                    <TableHead>
                                        <TableRow style={{ backgroundColor: "#cfd8dc" }}>
                                            <TableCell>Report ID</TableCell>
                                            <TableCell>Case Number</TableCell>
                                            <TableCell>Created By</TableCell>
                                            <TableCell
                                                style={{
                                                    cursor: 'pointer',
                                                    fontWeight: 'bold'
                                                }}
                                                onClick={handleCasePlansSortByDate}
                                            >
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    Created Date
                                                    {casePlansSortOrder === 'desc' ? <ArrowDownward fontSize="small" /> : <ArrowUpward fontSize="small" />}
                                                </Box>
                                            </TableCell>
                                            <TableCell>Status</TableCell>
                                            <TableCell>Case Plan Details</TableCell>
                                            <TableCell>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredAndSortedCasePlans.length > 0 ? (
                                            filteredAndSortedCasePlans
                                                .slice(casePlansPage * casePlansRowsPerPage, casePlansPage * casePlansRowsPerPage + casePlansRowsPerPage)
                                                .map((casePlan) => {
                                                    const isPendingApproval =
                                                        casePlan.status === 'CASE_PLAN_SENT_TO_ASSISTANT_COMMISSIONER' ||
                                                        casePlan.status.includes('SENT') ||
                                                        casePlan.status.includes('PENDING');

                                                    const isApproved =
                                                        casePlan.status.includes('APPROVED') ||
                                                        casePlan.approvalStatus === 'APPROVED';

                                                    const isRejected =
                                                        casePlan.status.includes('REJECTED') ||
                                                        casePlan.approvalStatus === 'REJECTED';

                                                    return (
                                                        <TableRow key={casePlan.id}>
                                                            <TableCell>{casePlan.id}</TableCell>
                                                            <TableCell>{casePlan.caseNumber || 'N/A'}</TableCell>
                                                            <TableCell>
                                                                {typeof casePlan.createdBy === 'string'
                                                                    ? casePlan.createdBy
                                                                    : `${casePlan.createdBy?.givenName || ''} ${casePlan.createdBy?.familyName || ''}`.trim() || 'Unknown'}
                                                            </TableCell>
                                                            <TableCell>
                                                                {formatDate(casePlan.createdAt)}
                                                            </TableCell>
                                                            <TableCell style={{
                                                                color: isApproved ? "green" :
                                                                    isRejected ? "red" :
                                                                        isPendingApproval ? "blue" : "#555",
                                                                fontWeight: "bold"
                                                            }}>
                                                                {formatStatus(casePlan.status)}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Box display="flex" gap={1}>
                                                                    {casePlan.casePlan && (
                                                                        <Chip
                                                                            label="Has Case Plan"
                                                                            size="small"
                                                                            color="primary"
                                                                            variant="outlined"
                                                                        />
                                                                    )}
                                                                    {casePlan.description && (
                                                                        <Tooltip title={casePlan.description}>
                                                                            <Chip
                                                                                label="Description"
                                                                                size="small"
                                                                                color="info"
                                                                                variant="outlined"
                                                                            />
                                                                        </Tooltip>
                                                                    )}
                                                                    {!casePlan.casePlan && (
                                                                        <Typography variant="caption" color="textSecondary">
                                                                            No details
                                                                        </Typography>
                                                                    )}
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Box display="flex" gap={1}>
                                                                    <Tooltip title="View Report Details">
                                                                        <IconButton
                                                                            onClick={() => navigate(`/reports/${casePlan.id}`)}
                                                                            color="primary"
                                                                        >
                                                                            <Visibility />
                                                                        </IconButton>
                                                                    </Tooltip>

                                                                    {isPendingApproval && (
                                                                        <>
                                                                            <Tooltip title="Approve Case Plan">
                                                                                <IconButton
                                                                                    color="success"
                                                                                    onClick={() => handleApproveCasePlan(casePlan)}
                                                                                    disabled={actionLoading[casePlan.id]}
                                                                                >
                                                                                    {actionLoading[casePlan.id] ? <CircularProgress size={24} /> : <ThumbUp />}
                                                                                </IconButton>
                                                                            </Tooltip>

                                                                            <Tooltip title="Reject Case Plan">
                                                                                <IconButton
                                                                                    color="error"
                                                                                    onClick={() => handleRejectCasePlan(casePlan)}
                                                                                    disabled={actionLoading[casePlan.id]}
                                                                                >
                                                                                    <ThumbDown />
                                                                                </IconButton>
                                                                            </Tooltip>
                                                                        </>
                                                                    )}
                                                                </Box>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={7} align="center">
                                                    No case plans pending approval
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>

                                {/* ✅ Case Plans Pagination */}
                                <TablePagination
                                    component="div"
                                    count={filteredAndSortedCasePlans.length}
                                    page={casePlansPage}
                                    onPageChange={handleCasePlansChangePage}
                                    rowsPerPage={casePlansRowsPerPage}
                                    onRowsPerPageChange={handleCasePlansChangeRowsPerPage}
                                    rowsPerPageOptions={[5, 10, 25, 50]}
                                />
                            </TableContainer>
                        </>
                    )}
                </>
            )}

            {/* Dialogs */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
            >
                {/* Special Addition: Investigation Department */}
                <MenuItem onClick={() => handleSendToDepartment('Investigation')}>
                    Approve & Send to Investigation
                </MenuItem>
                
                {departments && departments.length > 0 ? (
                    departments.map((dept) => (
                        <MenuItem 
                            key={dept.id || dept.structureId || dept.departmentId}
                            onClick={() => handleSendToDepartment(
                                dept.name || dept.structureName || dept.departmentName
                            )}
                        >
                            Approve & Send to {dept.name || dept.structureName || dept.departmentName}
                        </MenuItem>
                    ))
                ) : (
                    <MenuItem disabled>No other departments available</MenuItem>
                )}
            </Menu>

            {/* Report Return Dialog */}
            <Dialog open={returnDialogOpen} onClose={handleCloseReturnDialog} maxWidth="md" fullWidth>
                <DialogTitle>Return Report</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Report ID: {selectedReport?.id}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Case Number: {selectedReport?.relatedCase?.caseNum || 'N/A'}
                    </Typography>

                    <FormControl fullWidth margin="normal">
                        <InputLabel>Return To *</InputLabel>
                        <Select
                            value={returnType}
                            onChange={(e) => setReturnType(e.target.value)}
                            label="Return To *"
                        >
                            <MenuItem value="creator">Original Creator</MenuItem>
                            <MenuItem value="employeeId">Specific Employee</MenuItem>
                        </Select>
                    </FormControl>

                    {returnType === 'creator' && selectedReport && (
                        <TextField
                            fullWidth
                            label="Original Creator"
                            value={selectedReport.createdByEmployeeId || selectedReport.createdBy || ''}
                            margin="normal"
                            disabled
                            helperText="Report will be returned to the original creator"
                        />
                    )}

                    {returnType === 'employeeId' && (
                        <TextField
                            fullWidth
                            label="Employee ID *"
                            value={returnEmployeeId}
                            onChange={(e) => setReturnEmployeeId(e.target.value)}
                            margin="normal"
                            required
                            placeholder="Enter employee ID to return the report to"
                        />
                    )}

                    <TextField
                        fullWidth
                        label="Return Reason (Optional Text)"
                        multiline
                        rows={3}
                        value={returnReasonText}
                        onChange={(e) => setReturnReasonText(e.target.value)}
                        margin="normal"
                        placeholder="You can provide a brief text reason or upload a Word document..."
                    />

                    {/* Document Upload Section */}
                    <Box sx={{
                        mt: 3,
                        mb: 2,
                        p: 2,
                        border: '1px dashed',
                        borderColor: 'divider',
                        borderRadius: 1
                    }}>
                        <Typography variant="subtitle2" gutterBottom>
                            Upload Return Document (Optional)
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                            Supported formats: .doc, .docx, .pdf, .txt (Max 10MB)
                        </Typography>

                        {!returnAttachment ? (
                            <Box sx={{ mt: 2 }}>
                                <input
                                    accept=".doc,.docx,.pdf,.txt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                    style={{ display: 'none' }}
                                    id="return-attachment-upload"
                                    type="file"
                                    onChange={handleFileUpload}
                                />
                                <label htmlFor="return-attachment-upload">
                                    <Button
                                        variant="outlined"
                                        component="span"
                                        startIcon={<CloudUpload />}
                                        fullWidth
                                    >
                                        Choose File
                                    </Button>
                                </label>
                            </Box>
                        ) : (
                            <Box sx={{
                                mt: 2,
                                p: 2,
                                bgcolor: 'action.hover',
                                borderRadius: 1
                            }}>
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Description />
                                        <Box>
                                            <Typography variant="body2">
                                                {returnAttachment.name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {(returnAttachment.size / 1024).toFixed(2)} KB
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <IconButton
                                        size="small"
                                        onClick={handleRemoveAttachment}
                                        color="error"
                                    >
                                        <Delete />
                                    </IconButton>
                                </Box>
                            </Box>
                        )}

                        {attachmentError && (
                            <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                                {attachmentError}
                            </Typography>
                        )}

                        {uploadProgress > 0 && (
                            <Box sx={{ mt: 2 }}>
                                <LinearProgress variant="determinate" value={uploadProgress} />
                                <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                                    Uploading: {uploadProgress}%
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="caption">
                            Note: You must provide either a text reason or upload a document. Both can be provided for more detail.
                        </Typography>
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseReturnDialog}>Cancel</Button>
                    <Button
                        onClick={handleConfirmReturn}
                        color="warning"
                        variant="contained"
                        disabled={
                            (!returnAttachment && !returnReasonText.trim()) ||
                            (selectedReport && actionLoading[selectedReport.id]) ||
                            (returnType === 'employeeId' && !returnEmployeeId.trim())
                        }
                    >
                        {selectedReport && actionLoading[selectedReport.id] ? (
                            <CircularProgress size={20} color="inherit" />
                        ) : (
                            'Return Report'
                        )}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Report Rejection Dialog */}
            <Dialog open={closeDialogOpen} onClose={handleDialogClose}>
                <DialogTitle>Reason for Rejection</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        value={closeReason}
                        onChange={(e) => setCloseReason(e.target.value)}
                        placeholder="Enter reason for rejection..."
                        variant="outlined"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDialogClose} color="secondary">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmReject}
                        variant="contained"
                        color="primary"
                        disabled={!closeReason.trim() || actionLoading[selectedReport?.id]}
                    >
                        {actionLoading[selectedReport?.id] ? <CircularProgress size={24} /> : "Confirm Rejection"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Case Plan Action Dialog */}
            <Dialog open={casePlanActionDialogOpen} onClose={handleCasePlanActionDialogClose}>
                <DialogTitle>
                    {casePlanActionType === 'approve' ? 'Approve Case Plan' : 'Reject Case Plan'}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" gutterBottom>
                        Report ID: {selectedCasePlan?.id}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                        Case Number: {selectedCasePlan?.caseNumber || 'N/A'}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                        Created By: {typeof selectedCasePlan?.createdBy === 'string'
                            ? selectedCasePlan.createdBy
                            : `${selectedCasePlan?.createdBy?.givenName || ''} ${selectedCasePlan?.createdBy?.familyName || ''}`.trim() || 'Unknown'}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                        Current Status: {formatStatus(selectedCasePlan?.status)}
                    </Typography>
                    {selectedCasePlan?.description && (
                        <Typography variant="body2" gutterBottom>
                            Description: {selectedCasePlan.description.length > 100
                                ? selectedCasePlan.description.substring(0, 100) + '...'
                                : selectedCasePlan.description}
                        </Typography>
                    )}
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        value={casePlanActionReason}
                        onChange={(e) => setCasePlanActionReason(e.target.value)}
                        placeholder={casePlanActionType === 'approve' ?
                            "Enter comments for approval (optional)..." :
                            "Enter reason for rejection (required)..."
                        }
                        variant="outlined"
                        sx={{ mt: 2 }}
                        required={casePlanActionType === 'reject'}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCasePlanActionDialogClose} color="secondary">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmCasePlanAction}
                        variant="contained"
                        color={casePlanActionType === 'approve' ? "success" : "error"}
                        disabled={casePlanActionType === 'reject' && !casePlanActionReason.trim()}
                    >
                        {actionLoading[selectedCasePlan?.id] ? (
                            <CircularProgress size={24} color="inherit" />
                        ) : casePlanActionType === 'approve' ? 'Approve' : 'Reject'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                message={snackbar.message}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            />
        </div>
    );
};

export default AssistantCommissioner;