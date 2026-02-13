import React, { useState, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    TextField,
    IconButton,
    Button,
    Typography,
    Box,
    CircularProgress,
    Snackbar,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    MenuItem,
    Tooltip,
    Chip,
    DialogContentText,
    Input,
    FormControl,
    InputLabel,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
    Collapse,
    Card,
    CardContent,
    CardActions,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Stepper,
    Step,
    StepLabel,
    Tabs,
    Tab,
    Grid
} from "@mui/material";
import {
    Search,
    Description,
    Send,
    Check,
    ArrowBack,
    AttachFile,
    Delete,
    NoteAdd,
    ExpandMore,
    ExpandLess,
    Upload,
    Visibility,
    Task,
    ChevronRight,
    Download,
    Edit,
    History,
    Refresh,
    Warning,
    CheckCircle,
    Cancel,
    PlayArrow,
    Pause,
    HourglassEmpty
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { ReportApi } from "./../api/Axios/caseApi";

const InvestigationOfficer = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: "",
        severity: "success"
    });
    const [selectedReport, setSelectedReport] = useState(null);
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [statusUpdate, setStatusUpdate] = useState("");
    const [notes, setNotes] = useState("");
    const [findingsDialogOpen, setFindingsDialogOpen] = useState(false);
    const [findings, setFindings] = useState("");
    const [recommendations, setRecommendations] = useState("");
    const [attachments, setAttachments] = useState([]);
    const [attachmentPreviews, setAttachmentPreviews] = useState([]);
    const [expandedRows, setExpandedRows] = useState({});

    // Case Plan States
    const [casePlanDialogOpen, setCasePlanDialogOpen] = useState(false);
    const [casePlanText, setCasePlanText] = useState("");
    const [casePlanAttachment, setCasePlanAttachment] = useState(null);
    const [casePlanAttachmentPreview, setCasePlanAttachmentPreview] = useState(null);
    const [casePlanActiveStep, setCasePlanActiveStep] = useState(0);
    const [viewCasePlanDialogOpen, setViewCasePlanDialogOpen] = useState(false);
    const [selectedCasePlan, setSelectedCasePlan] = useState(null);

    // New states for enhanced functionality
    const [activeTab, setActiveTab] = useState(0); // 0: Active, 1: Historical
    const [historicalReports, setHistoricalReports] = useState([]);
    const [loadingHistorical, setLoadingHistorical] = useState(false);

    const navigate = useNavigate();

    const canOfficerContinueWorking = (report) => {
        if (!report || !report.relatedCase || !report.relatedCase.status) return false;

        const activeStatuses = [
            'REPORT_ASSIGNED_TO_INVESTIGATION_OFFICER',
            'INVESTIGATION_IN_PROGRESS',
            'CASE_PLAN_SUBMITTED',
            'CASE_PLAN_SENT_TO_DIRECTOR_INVESTIGATION',
            'CASE_PLAN_APPROVED_BY_DIRECTOR_INVESTIGATION',
            'CASE_PLAN_REJECTED_BY_DIRECTOR_INVESTIGATION',
            'REPORT_RETURNED_TO_INVESTIGATION_OFFICER',
            'REPORT_RETURNED_TO_DIRECTOR_INVESTIGATION',
            'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER',
            'INVESTIGATION_SENT_TO_DIRECTOR_INVESTIGATION'
        ];

        return activeStatuses.includes(report.relatedCase.status);
    };

    // Helper function to determine if case plan needs revision
    const needsCasePlanRevision = (report) => {
        if (!report || !report.relatedCase || !report.relatedCase.status) return false;
        return report.relatedCase.status === 'CASE_PLAN_REJECTED_BY_DIRECTOR_INVESTIGATION' ||
            report.relatedCase.status === 'REPORT_RETURNED_TO_INVESTIGATION_OFFICER';
    };

    // Helper function to determine if findings can be submitted
    const canSubmitFindings = (report) => {
        if (!report || !report.relatedCase || !report.relatedCase.status) return false;
        return report.relatedCase.status === 'CASE_PLAN_APPROVED_BY_DIRECTOR_INVESTIGATION' ||
            report.relatedCase.status === 'INVESTIGATION_IN_PROGRESS' ||
            report.relatedCase.status === 'REPORT_ASSIGNED_TO_INVESTIGATION_OFFICER';
    };

    // Helper function to check if case plan exists
    const hasCasePlan = (report) => {
        if (!report || !report.relatedCase) return false;

        // Check if status indicates case plan exists OR casePlan field has content
        const hasCasePlanStatus = [
            'CASE_PLAN_SUBMITTED',
            'CASE_PLAN_APPROVED_BY_DIRECTOR_INVESTIGATION',
            'CASE_PLAN_REJECTED_BY_DIRECTOR_INVESTIGATION',
            'CASE_PLAN_SENT_TO_DIRECTOR_INVESTIGATION'
        ].includes(report.relatedCase.status);

        const hasCasePlanContent = !!report.casePlan || !!report.casePlanDescription;
        return hasCasePlanStatus || hasCasePlanContent;
    };

    // Helper function to get case plan status display
    const getCasePlanStatus = (report) => {
        if (!report || !report.relatedCase || !hasCasePlan(report)) return null;

        const status = report.relatedCase.status;
        switch (status) {
            case 'CASE_PLAN_SUBMITTED':
                return { label: 'Submitted', color: 'info', variant: 'outlined' };
            case 'CASE_PLAN_APPROVED_BY_DIRECTOR_INVESTIGATION':
                return { label: 'Approved', color: 'success', variant: 'filled' };
            case 'CASE_PLAN_REJECTED_BY_DIRECTOR_INVESTIGATION':
                return { label: 'Rejected', color: 'error', variant: 'filled' };
            case 'CASE_PLAN_SENT_TO_DIRECTOR_INVESTIGATION':
                return { label: 'Sent for Review', color: 'warning', variant: 'outlined' };
            default:
                return report.casePlan || report.casePlanDescription ?
                    { label: 'Draft', color: 'default', variant: 'outlined' } :
                    null;
        }
    };

    useEffect(() => {
        fetchActiveReports();

        // Clean up object URLs
        return () => {
            attachmentPreviews.forEach(preview => {
                if (preview.url) URL.revokeObjectURL(preview.url);
            });
            if (casePlanAttachmentPreview?.url) {
                URL.revokeObjectURL(casePlanAttachmentPreview.url);
            }
        };
    }, []);

    const fetchActiveReports = async () => {
        try {
            setLoading(true);
            // Try new endpoint first, fallback to old one
            let response;
            try {
                response = await ReportApi.getActiveReportsForInvestigationOfficer?.();
            } catch (err) {
                console.log("New endpoint not available, falling back to old endpoint");
                response = await ReportApi.getAssignedReportsForInvestigationOfficer();
            }

            const formattedReports = response.data.map(report => ({
                id: report.id || '',
                caseId: report.relatedCase?.caseNum || 'N/A',
                status: report.relatedCase?.status || 'Pending',
                reportedDate: report.createdAt || 'N/A',
                principleAmount: report.principleAmount || 0,
                penaltiesAmount: report.penaltiesAmount || 0,
                notes: report.notes || '',
                assignmentNotes: report.assignmentNotes || 'No assignment instructions provided',
                casePlan: report.casePlan || null,
                casePlanDescription: report.casePlanDescription || report.casePlan || null,
                casePlanExists: hasCasePlan(report),
                casePlanSubmitted: report.relatedCase?.status === 'CASE_PLAN_SUBMITTED',
                casePlanSent: report.relatedCase?.status === 'CASE_PLAN_SENT_TO_DIRECTOR_INVESTIGATION',
                casePlanApproved: report.relatedCase?.status === 'CASE_PLAN_APPROVED_BY_DIRECTOR_INVESTIGATION',
                casePlanRejected: report.relatedCase?.status === 'CASE_PLAN_REJECTED_BY_DIRECTOR_INVESTIGATION',
                canContinueWorking: canOfficerContinueWorking(report),
                needsRevision: needsCasePlanRevision(report),
                canSubmitFindings: canSubmitFindings(report),
                relatedCase: report.relatedCase || {},
                ...report
            }));
            setReports(formattedReports);
        } catch (err) {
            console.error("Error fetching assigned reports:", err);
            setError(err.message);
            setSnackbar({
                open: true,
                message: "Failed to fetch assigned reports",
                severity: "error"
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchHistoricalReports = async () => {
        try {
            setLoadingHistorical(true);
            const response = await ReportApi.getAllReportsForInvestigationOfficer?.();
            if (response?.data) {
                const formattedReports = response.data.map(report => ({
                    id: report.id || '',
                    caseId: report.relatedCase?.caseNum || 'N/A',
                    status: report.relatedCase?.status || 'Completed',
                    reportedDate: report.createdAt || 'N/A',
                    completedDate: report.updatedAt || 'N/A',
                    principleAmount: report.principleAmount || 0,
                    penaltiesAmount: report.penaltiesAmount || 0,
                    findings: report.findings || '',
                    recommendations: report.recommendations || '',
                    casePlan: report.casePlan || null,
                    casePlanDescription: report.casePlanDescription || report.casePlan || null,
                    casePlanExists: hasCasePlan(report),
                    relatedCase: report.relatedCase || {},
                    ...report
                }));
                setHistoricalReports(formattedReports);
            }
        } catch (err) {
            console.error("Error fetching historical reports:", err);
            setSnackbar({
                open: true,
                message: "Failed to fetch historical reports",
                severity: "error"
            });
        } finally {
            setLoadingHistorical(false);
        }
    };

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
        if (newValue === 1 && historicalReports.length === 0) {
            fetchHistoricalReports();
        }
    };

    const handleStatusUpdate = async () => {
        if (!selectedReport || !statusUpdate) return;

        try {
            await ReportApi.updateInvestigationStatus(
                selectedReport.id,
                statusUpdate,
                notes
            );

            setSnackbar({
                open: true,
                message: "Status updated successfully",
                severity: "success"
            });

            // Update local state
            setReports(prev =>
                prev.map(report =>
                    report.id === selectedReport.id
                        ? {
                            ...report,
                            status: statusUpdate,
                            notes,
                            relatedCase: {
                                ...report.relatedCase,
                                status: statusUpdate
                            },
                            canContinueWorking: canOfficerContinueWorking({
                                ...report,
                                relatedCase: { ...report.relatedCase, status: statusUpdate }
                            }),
                            canSubmitFindings: canSubmitFindings({
                                ...report,
                                relatedCase: { ...report.relatedCase, status: statusUpdate }
                            }),
                            casePlanExists: hasCasePlan({
                                ...report,
                                relatedCase: { ...report.relatedCase, status: statusUpdate }
                            })
                        }
                        : report
                )
            );

            handleCloseStatusDialog();
        } catch (err) {
            console.error("Error updating status:", err);
            setSnackbar({
                open: true,
                message: "Failed to update status",
                severity: "error"
            });
        }
    };

    const handleOpenFindingsDialog = (report) => {
        setSelectedReport(report);
        setFindings(report.findings || "");
        setRecommendations(report.recommendations || "");
        setAttachments([]);
        setAttachmentPreviews([]);
        setFindingsDialogOpen(true);
    };

    const handleCloseFindingsDialog = () => {
        setFindingsDialogOpen(false);
        setFindings("");
        setRecommendations("");
        setAttachments([]);
        setAttachmentPreviews([]);
    };

    const handleCloseStatusDialog = () => {
        setStatusDialogOpen(false);
        setStatusUpdate("");
        setNotes("");
    };

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        setAttachments([...attachments, ...files]);

        // Create previews for images
        const newPreviews = files.map(file => {
            if (file.type.startsWith('image/')) {
                return {
                    name: file.name,
                    url: URL.createObjectURL(file),
                    type: 'image'
                };
            }
            return {
                name: file.name,
                url: null,
                type: 'file'
            };
        });
        setAttachmentPreviews([...attachmentPreviews, ...newPreviews]);
    };

    const removeAttachment = (index) => {
        const newAttachments = [...attachments];
        newAttachments.splice(index, 1);
        setAttachments(newAttachments);

        const newPreviews = [...attachmentPreviews];
        if (newPreviews[index]?.url) {
            URL.revokeObjectURL(newPreviews[index].url);
        }
        newPreviews.splice(index, 1);
        setAttachmentPreviews(newPreviews);
    };

    const submitFindings = async () => {
        if (!selectedReport || !findings.trim()) {
            setSnackbar({
                open: true,
                message: "Findings are required",
                severity: "error"
            });
            return;
        }

        try {
            setLoading(true);

            // Prepare the findings data
            const findingsData = {
                findings: findings.trim(),
                recommendations: recommendations.trim(),
                principleAmount: parseFloat(selectedReport.principleAmount || 0),
                penaltiesAmount: parseFloat(selectedReport.penaltiesAmount || 0)
            };

            // Create FormData
            const formData = new FormData();
            formData.append("findingsData", JSON.stringify(findingsData));

            // Add attachments
            attachments.forEach((file, index) => {
                formData.append(`attachments`, file);
            });

            // Submit findings
            const response = await ReportApi.submitFindings(selectedReport.id, formData);

            if (response.data) {
                setSnackbar({
                    open: true,
                    message: "Findings submitted successfully! Sent to Director of Investigation for review.",
                    severity: "success"
                });

                // Update the local state
                setReports(prevReports =>
                    prevReports.map(report =>
                        report.id === selectedReport.id
                            ? {
                                ...report,
                                status: "INVESTIGATION_REPORT_SENT_TO_DIRECTOR_INVESTIGATION",
                                findings: findingsData.findings,
                                recommendations: findingsData.recommendations,
                                principleAmount: findingsData.principleAmount,
                                penaltiesAmount: findingsData.penaltiesAmount,
                                relatedCase: {
                                    ...report.relatedCase,
                                    status: "INVESTIGATION_REPORT_SENT_TO_DIRECTOR_INVESTIGATION"
                                },
                                canContinueWorking: false,
                                canSubmitFindings: false,
                                updatedAt: new Date().toISOString()
                            }
                            : report
                    )
                );
            }

            // Close the dialog
            handleCloseFindingsDialog();

        } catch (err) {
            console.error("Error submitting findings:", err);

            let errorMessage = "Failed to submit findings";
            if (err.response) {
                if (err.response.status === 403) {
                    errorMessage = "You are not authorized to submit findings for this report";
                } else if (err.response.status === 400) {
                    errorMessage = err.response.data?.message || "Invalid findings data";
                }
            }

            setSnackbar({
                open: true,
                message: errorMessage,
                severity: "error"
            });
        } finally {
            setLoading(false);
        }
    };

    // Case Plan Functions
    const handleOpenCasePlanDialog = (report) => {
        setSelectedReport(report);
        // Use casePlanDescription if available, otherwise fall back to casePlan
        setCasePlanText(report.casePlanDescription || report.casePlan || "");
        setCasePlanAttachment(null);
        setCasePlanAttachmentPreview(null);
        setCasePlanActiveStep(0);
        setCasePlanDialogOpen(true);
    };

    const handleCloseCasePlanDialog = () => {
        setCasePlanDialogOpen(false);
        setCasePlanText("");
        setCasePlanAttachment(null);
        setCasePlanAttachmentPreview(null);
        setCasePlanActiveStep(0);
    };

    const handleCasePlanFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setCasePlanAttachment(file);

            // Create preview for PDF files
            if (file.type === 'application/pdf') {
                const url = URL.createObjectURL(file);
                setCasePlanAttachmentPreview({
                    name: file.name,
                    url: url,
                    type: 'pdf'
                });
            } else if (file.type.startsWith('image/')) {
                const url = URL.createObjectURL(file);
                setCasePlanAttachmentPreview({
                    name: file.name,
                    url: url,
                    type: 'image'
                });
            } else {
                setCasePlanAttachmentPreview({
                    name: file.name,
                    url: null,
                    type: 'document'
                });
            }
        }
    };

    const handleNextCasePlanStep = () => {
        setCasePlanActiveStep((prevStep) => prevStep + 1);
    };

    const handleBackCasePlanStep = () => {
        setCasePlanActiveStep((prevStep) => prevStep - 1);
    };

    const submitCasePlan = async () => {
        if (!selectedReport) return;

        try {
            const formData = new FormData();

            // Use "casePlanDescription" as the form field name to match backend
            if (casePlanText && casePlanText.trim()) {
                formData.append("casePlanDescription", casePlanText);
            }

            if (casePlanAttachment) {
                formData.append("casePlanAttachment", casePlanAttachment);
            }

            await ReportApi.submitCasePlan(selectedReport.id, formData);

            setSnackbar({
                open: true,
                message: "Case plan submitted successfully",
                severity: "success"
            });

            // Update local state
            setReports(prev =>
                prev.map(report =>
                    report.id === selectedReport.id
                        ? {
                            ...report,
                            casePlan: casePlanText,
                            casePlanDescription: casePlanText,
                            casePlanExists: true,
                            casePlanSubmitted: true,
                            casePlanSent: false,
                            casePlanApproved: false,
                            casePlanRejected: false,
                            relatedCase: {
                                ...report.relatedCase,
                                status: "CASE_PLAN_SUBMITTED"
                            },
                            canContinueWorking: true,
                            needsRevision: false
                        }
                        : report
                )
            );

            handleCloseCasePlanDialog();
        } catch (err) {
            console.error("Error submitting case plan:", err);
            setSnackbar({
                open: true,
                message: "Failed to submit case plan",
                severity: "error"
            });
        }
    };

    const sendCasePlanToDirectorInvestigation = async (report) => {
        try {
            await ReportApi.sendCasePlanToDirectorInvestigation(report.id);

            setSnackbar({
                open: true,
                message: "Case plan sent to Director of Investigation",
                severity: "success"
            });
            setReports(prev =>
                prev.map(r =>
                    r.id === report.id
                        ? {
                            ...r,
                            casePlanSent: true,
                            casePlanApproved: false,
                            casePlanRejected: false,
                            relatedCase: {
                                ...r.relatedCase,
                                status: "CASE_PLAN_SENT_TO_DIRECTOR_INVESTIGATION"
                            },
                            canContinueWorking: true
                        }
                        : r
                )
            );

            // Close view dialog if open
            if (viewCasePlanDialogOpen) {
                setViewCasePlanDialogOpen(false);
            }
        } catch (err) {
            console.error("Error sending case plan:", err);
            setSnackbar({
                open: true,
                message: "Failed to send case plan",
                severity: "error"
            });
        }
    };

    const viewCasePlan = (report) => {
        setSelectedCasePlan(report);
        setViewCasePlanDialogOpen(true);
    };

    const toggleRowExpansion = (reportId) => {
        setExpandedRows(prev => ({
            ...prev,
            [reportId]: !prev[reportId]
        }));
    };

    const handleRefresh = () => {
        if (activeTab === 0) {
            fetchActiveReports();
        } else {
            fetchHistoricalReports();
        }
    };

    const filteredReports = activeTab === 0 ?
        reports.filter(report => {
            if (!report) return false;
            const searchTerm = searchQuery.toLowerCase();
            return (
                (report.caseId?.toString().toLowerCase() || '').includes(searchTerm) ||
                (report.status?.toString().toLowerCase() || '').includes(searchTerm) ||
                (report.assignmentNotes?.toLowerCase() || '').includes(searchTerm) ||
                (report.casePlan?.toLowerCase() || '').includes(searchTerm) ||
                (report.casePlanDescription?.toLowerCase() || '').includes(searchTerm)
            );
        }) :
        historicalReports.filter(report => {
            if (!report) return false;
            const searchTerm = searchQuery.toLowerCase();
            return (
                (report.caseId?.toString().toLowerCase() || '').includes(searchTerm) ||
                (report.status?.toString().toLowerCase() || '').includes(searchTerm) ||
                (report.findings?.toLowerCase() || '').includes(searchTerm) ||
                (report.casePlanDescription?.toLowerCase() || '').includes(searchTerm)
            );
        });

    const getStatusColor = (status) => {
        if (!status) return 'default';

        switch (status) {
            case 'INVESTIGATION_REPORT_SENT_TO_DIRECTOR_INVESTIGATION':
            case 'CASE_PLAN_APPROVED_BY_DIRECTOR_INVESTIGATION':
                return 'success';
            case 'CASE_PLAN_SUBMITTED':
            case 'CASE_PLAN_SENT_TO_DIRECTOR_INVESTIGATION':
                return 'info';
            case 'REPORT_ASSIGNED_TO_INVESTIGATION_OFFICER':
            case 'INVESTIGATION_IN_PROGRESS':
                return 'warning';
            case 'CASE_PLAN_REJECTED_BY_DIRECTOR_INVESTIGATION':
            case 'REPORT_RETURNED_TO_INVESTIGATION_OFFICER':
                return 'error';
            case 'INVESTIGATION_ON_HOLD':
                return 'secondary';
            default:
                return 'default';
        }
    };

    const getStatusIcon = (status) => {
        if (!status) return <HourglassEmpty fontSize="small" />;

        switch (status) {
            case 'INVESTIGATION_REPORT_SENT_TO_DIRECTOR_INVESTIGATION':
            case 'CASE_PLAN_APPROVED_BY_DIRECTOR_INVESTIGATION':
                return <CheckCircle fontSize="small" />;
            case 'CASE_PLAN_REJECTED_BY_DIRECTOR_INVESTIGATION':
            case 'REPORT_RETURNED_TO_INVESTIGATION_OFFICER':
                return <Cancel fontSize="small" />;
            case 'INVESTIGATION_IN_PROGRESS':
                return <PlayArrow fontSize="small" />;
            case 'INVESTIGATION_ON_HOLD':
                return <Pause fontSize="small" />;
            default:
                return <HourglassEmpty fontSize="small" />;
        }
    };

    const formatStatus = (status) => {
        if (!status) return 'Unknown';

        // Special formatting for case plan statuses
        const casePlanStatuses = {
            'CASE_PLAN_SUBMITTED': 'Case Plan Submitted',
            'CASE_PLAN_APPROVED_BY_DIRECTOR_INVESTIGATION': 'Case Plan Approved',
            'CASE_PLAN_REJECTED_BY_DIRECTOR_INVESTIGATION': 'Case Plan Rejected',
            'CASE_PLAN_SENT_TO_DIRECTOR_INVESTIGATION': 'Case Plan Sent for Review'
        };

        if (casePlanStatuses[status]) {
            return casePlanStatuses[status];
        }

        // Default formatting for other statuses
        return status
            .split('_')
            .map(word => word.charAt(0) + word.slice(1).toLowerCase())
            .join(' ');
    };

    const formatCurrency = (amount) => {
        return amount ? `FRW ${parseFloat(amount).toFixed(2)}` : 'FRW 0.00';
    };

    const truncateText = (text, maxLength = 50) => {
        if (!text) return 'N/A';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    const renderActiveReportsTable = () => (
        <TableContainer component={Paper} elevation={3}>
            <Table>
                <TableHead>
                    <TableRow sx={{ backgroundColor: 'grey.100' }}>
                        <TableCell sx={{ fontWeight: 'bold' }}>Case ID</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Reported Date</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Assignment Instructions</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Case Plan</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Principle</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Penalties</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {filteredReports.length > 0 ? (
                        filteredReports.map((report) => {
                            // Safety check for null report
                            if (!report) return null;

                            const casePlanStatus = getCasePlanStatus(report);
                            const hasPlan = report.casePlanExists || hasCasePlan(report);

                            return (
                                <React.Fragment key={report.id || `report-${Math.random()}`}>
                                    <TableRow>
                                        <TableCell>{report.caseId || 'N/A'}</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Chip
                                                    icon={getStatusIcon(report.status)}
                                                    label={formatStatus(report.status)}
                                                    color={getStatusColor(report.status)}
                                                    variant="outlined"
                                                    size="small"
                                                />

                                                {/* Case Plan Status Badge */}
                                                {casePlanStatus && (
                                                    <Chip
                                                        label={casePlanStatus.label}
                                                        size="small"
                                                        variant="filled"
                                                        color={casePlanStatus.color}
                                                        sx={{ fontSize: '0.7rem', height: 20 }}
                                                    />
                                                )}

                                                {report.canContinueWorking && report.needsRevision && (
                                                    <Chip
                                                        label="Needs Revision"
                                                        color="error"
                                                        size="small"
                                                        variant="filled"
                                                        icon={<Warning />}
                                                        sx={{ fontSize: '0.7rem', height: 20 }}
                                                    />
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            {report.reportedDate ? new Date(report.reportedDate).toLocaleDateString() : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant="body2">
                                                    {truncateText(report.assignmentNotes, 60)}
                                                </Typography>
                                                {report.assignmentNotes && report.assignmentNotes.length > 60 && (
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => toggleRowExpansion(report.id)}
                                                    >
                                                        {expandedRows[report.id] ? <ExpandLess /> : <ExpandMore />}
                                                    </IconButton>
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            {/* FIXED: Check hasPlan instead of just report.casePlan */}
                                            {hasPlan ? (
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    {/* Case Plan Status Badge */}
                                                    {casePlanStatus ? (
                                                        <Chip
                                                            icon={<Task />}
                                                            label={casePlanStatus.label}
                                                            color={casePlanStatus.color}
                                                            size="small"
                                                            variant={casePlanStatus.variant}
                                                            sx={{
                                                                fontWeight: report.relatedCase?.status === 'CASE_PLAN_APPROVED_BY_DIRECTOR_INVESTIGATION' ? 'bold' : 'normal'
                                                            }}
                                                        />
                                                    ) : (
                                                        <Chip
                                                            icon={<Task />}
                                                            label="Has Case Plan"
                                                            color="info"
                                                            size="small"
                                                            variant="outlined"
                                                        />
                                                    )}

                                                    {/* View Button - Always available if case plan exists */}
                                                    <Tooltip title="View Case Plan">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => viewCasePlan(report)}
                                                            color="primary"
                                                        >
                                                            <Visibility fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>

                                                    {/* Edit/Revise Button - Only show when appropriate */}
                                                    {(report.needsRevision ||
                                                        (report.relatedCase?.status === 'CASE_PLAN_REJECTED_BY_DIRECTOR_INVESTIGATION') ||
                                                        (report.relatedCase?.status === 'CASE_PLAN_SENT_TO_DIRECTOR_INVESTIGATION') ||
                                                        (!casePlanStatus && (report.casePlan || report.casePlanDescription))) && (
                                                            <Tooltip title={
                                                                report.relatedCase?.status === 'CASE_PLAN_REJECTED_BY_DIRECTOR_INVESTIGATION' ?
                                                                    "Revise Rejected Plan" :
                                                                    "Edit Case Plan"
                                                            }>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleOpenCasePlanDialog(report)}
                                                                    color={
                                                                        report.relatedCase?.status === 'CASE_PLAN_REJECTED_BY_DIRECTOR_INVESTIGATION' ?
                                                                            "error" : "secondary"
                                                                    }
                                                                >
                                                                    <Edit fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}

                                                    {/* Send to Director Button - Only show for submitted but not sent */}
                                                    {report.relatedCase?.status === 'CASE_PLAN_SUBMITTED' && (
                                                        <Tooltip title="Send to Director for Approval">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => sendCasePlanToDirectorInvestigation(report)}
                                                                color="warning"
                                                            >
                                                                <Send fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}

                                                    {/* Approval Status Icon */}
                                                    {report.relatedCase?.status === 'CASE_PLAN_APPROVED_BY_DIRECTOR_INVESTIGATION' && (
                                                        <CheckCircle fontSize="small" color="success" />
                                                    )}
                                                    {report.relatedCase?.status === 'CASE_PLAN_REJECTED_BY_DIRECTOR_INVESTIGATION' && (
                                                        <Cancel fontSize="small" color="error" />
                                                    )}
                                                </Box>
                                            ) : (
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    startIcon={<Upload />}
                                                    onClick={() => handleOpenCasePlanDialog(report)}
                                                    color="primary"
                                                >
                                                    Create Plan
                                                </Button>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {formatCurrency(report.principleAmount)}
                                        </TableCell>
                                        <TableCell>
                                            {formatCurrency(report.penaltiesAmount)}
                                        </TableCell>
                                        <TableCell>
                                            {formatCurrency(report.principleAmount + report.penaltiesAmount)}
                                        </TableCell>
                                        <TableCell>
                                            <Box display="flex" gap={1} flexWrap="wrap">
                                                {/* View Report Button - Always visible */}
                                                <Tooltip title="View Report">
                                                    <IconButton
                                                        onClick={() => navigate(`/view-report/${report.id}`)}
                                                        color="primary"
                                                        size="small"
                                                    >
                                                        <Description fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>

                                                {/* Primary Action Buttons - Contextual based on status */}
                                                <Box display="flex" gap={0.5}>
                                                    {/* Update Status Button - Always available for active cases */}
                                                    {report.canContinueWorking && (
                                                        <Tooltip title="Update Investigation Status">
                                                            <IconButton
                                                                color="secondary"
                                                                size="small"
                                                                onClick={() => {
                                                                    setSelectedReport(report);
                                                                    setStatusUpdate(report.status || "");
                                                                    setNotes(report.notes || "");
                                                                    setStatusDialogOpen(true);
                                                                }}
                                                            >
                                                                <Send fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}

                                                    {/* Submit Findings Button - Based on conditions */}
                                                    {report.canSubmitFindings && (
                                                        <Tooltip title="Submit Findings">
                                                            <IconButton
                                                                color="primary"
                                                                size="small"
                                                                onClick={() => handleOpenFindingsDialog(report)}
                                                            >
                                                                <NoteAdd fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}

                                                    {/* Case Plan Action Buttons - Contextual */}
                                                    {report.canContinueWorking && (
                                                        <>
                                                            {/* Create New Case Plan - Only show if no case plan exists */}
                                                            {!hasPlan && (
                                                                <Tooltip title="Create Case Plan">
                                                                    <IconButton
                                                                        color="info"
                                                                        size="small"
                                                                        onClick={() => handleOpenCasePlanDialog(report)}
                                                                    >
                                                                        <Task fontSize="small" />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            )}

                                                            {/* Send Case Plan for Approval */}
                                                            {report.relatedCase?.status === 'CASE_PLAN_SUBMITTED' && (
                                                                <Tooltip title="Send Case Plan to Director">
                                                                    <IconButton
                                                                        color="warning"
                                                                        size="small"
                                                                        onClick={() => sendCasePlanToDirectorInvestigation(report)}
                                                                    >
                                                                        <Send fontSize="small" />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            )}

                                                            {/* Revise Rejected Case Plan */}
                                                            {(report.needsRevision ||
                                                                report.relatedCase?.status === 'CASE_PLAN_REJECTED_BY_DIRECTOR_INVESTIGATION') && (
                                                                    <Tooltip title="Revise Case Plan">
                                                                        <IconButton
                                                                            color="error"
                                                                            size="small"
                                                                            onClick={() => handleOpenCasePlanDialog(report)}
                                                                        >
                                                                            <Edit fontSize="small" />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                )}
                                                        </>
                                                    )}
                                                </Box>
                                            </Box>
                                        </TableCell>
                                    </TableRow>

                                    {/* Expanded row for full assignment notes and case plan summary */}
                                    {expandedRows[report.id] && (
                                        <TableRow>
                                            <TableCell colSpan={9} sx={{ backgroundColor: 'grey.50', py: 2 }}>
                                                <Grid container spacing={2}>
                                                    <Grid item xs={12} md={6}>
                                                        <Box sx={{ pl: 2 }}>
                                                            <Typography variant="subtitle2" color="primary" gutterBottom>
                                                                Full Assignment Instructions:
                                                            </Typography>
                                                            <Paper elevation={0} sx={{ p: 2, backgroundColor: 'white', borderRadius: 1 }}>
                                                                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                                                                    {report.assignmentNotes}
                                                                </Typography>
                                                            </Paper>
                                                        </Box>
                                                    </Grid>

                                                    {/* Case Plan Summary Section */}
                                                    {hasPlan && (
                                                        <Grid item xs={12} md={6}>
                                                            <Box sx={{ pl: 2 }}>
                                                                <Typography variant="subtitle2" color="primary" gutterBottom>
                                                                    Case Plan Summary:
                                                                </Typography>
                                                                <Paper elevation={0} sx={{ p: 2, backgroundColor: 'white', borderRadius: 1 }}>
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                                        {casePlanStatus ? (
                                                                            <Chip
                                                                                label={casePlanStatus.label}
                                                                                size="small"
                                                                                color={casePlanStatus.color}
                                                                            />
                                                                        ) : (
                                                                            <Chip
                                                                                label="Has Case Plan"
                                                                                size="small"
                                                                                color="info"
                                                                            />
                                                                        )}
                                                                    </Box>
                                                                    <Typography variant="body2" sx={{
                                                                        whiteSpace: 'pre-line',
                                                                        maxHeight: '150px',
                                                                        overflow: 'auto'
                                                                    }}>
                                                                        {report.casePlanDescription || report.casePlan ||
                                                                            "Case plan has been submitted. Click 'View Full Plan' for details."}
                                                                    </Typography>
                                                                    <Button
                                                                        size="small"
                                                                        startIcon={<Visibility />}
                                                                        onClick={() => viewCasePlan(report)}
                                                                        sx={{ mt: 1 }}
                                                                    >
                                                                        View Full Plan
                                                                    </Button>
                                                                </Paper>
                                                            </Box>
                                                        </Grid>
                                                    )}
                                                </Grid>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            );
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={9} align="center">
                                No active cases found
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );

    const renderHistoricalReportsTable = () => (
        <TableContainer component={Paper} elevation={3}>
            <Table>
                <TableHead>
                    <TableRow sx={{ backgroundColor: 'grey.100' }}>
                        <TableCell sx={{ fontWeight: 'bold' }}>Case ID</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Final Status</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Reported Date</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Completed Date</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Principle</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Penalties</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {filteredReports.length > 0 ? (
                        filteredReports.map((report) => {
                            if (!report) return null;

                            const casePlanStatus = getCasePlanStatus(report);
                            const hasPlan = report.casePlanExists || hasCasePlan(report);

                            return (
                                <TableRow key={report.id || `historical-${Math.random()}`}>
                                    <TableCell>{report.caseId || 'N/A'}</TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Chip
                                                icon={getStatusIcon(report.status)}
                                                label={formatStatus(report.status)}
                                                color={getStatusColor(report.status)}
                                                variant="outlined"
                                                size="small"
                                            />
                                            {hasPlan && (
                                                <Chip
                                                    label="Has Case Plan"
                                                    size="small"
                                                    variant="filled"
                                                    color="info"
                                                    sx={{ fontSize: '0.7rem', height: 20 }}
                                                />
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        {report.reportedDate ? new Date(report.reportedDate).toLocaleDateString() : 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        {report.completedDate ?
                                            new Date(report.completedDate).toLocaleDateString() : 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        {formatCurrency(report.principleAmount)}
                                    </TableCell>
                                    <TableCell>
                                        {formatCurrency(report.penaltiesAmount)}
                                    </TableCell>
                                    <TableCell>
                                        {formatCurrency(report.principleAmount + report.penaltiesAmount)}
                                    </TableCell>
                                    <TableCell>
                                        <Box display="flex" gap={1}>
                                            <Tooltip title="View Report">
                                                <IconButton
                                                    onClick={() => navigate(`/reports/${report.id}`)}
                                                    color="primary"
                                                    size="small"
                                                >
                                                    <Description fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="View Findings">
                                                <IconButton
                                                    onClick={() => {
                                                        setSelectedReport(report);
                                                        setFindings(report.findings || "");
                                                        setRecommendations(report.recommendations || "");
                                                        setFindingsDialogOpen(true);
                                                    }}
                                                    color="info"
                                                    size="small"
                                                >
                                                    <Visibility fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            {hasPlan && (
                                                <Tooltip title="View Case Plan">
                                                    <IconButton
                                                        onClick={() => viewCasePlan(report)}
                                                        color="secondary"
                                                        size="small"
                                                    >
                                                        <Task fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={8} align="center">
                                No historical cases found
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );

    if (loading && activeTab === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (error && activeTab === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <Alert severity="error">Error loading reports: {error}</Alert>
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => window.location.reload()}
                    sx={{ ml: 2 }}
                >
                    Retry
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" gutterBottom>
                        Investigation Officer Dashboard
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary">
                        Manage Your Cases
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TextField
                        label="Search cases, status, or instructions"
                        variant="outlined"
                        size="small"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: <Search fontSize="small" />,
                        }}
                    />
                    <Chip
                        label={`${filteredReports.length} ${activeTab === 0 ? 'active' : 'historical'} cases`}
                        color="primary"
                        variant="outlined"
                    />
                    <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={handleRefresh}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<Description />}
                        onClick={() => navigate('/reports/t3-officers')}
                    >
                        T3 Reports
                    </Button>
                </Box>
            </Box>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={activeTab} onChange={handleTabChange}>
                    <Tab
                        icon={<PlayArrow />}
                        label="Active Cases"
                        iconPosition="start"
                        sx={{ minHeight: 60 }}
                    />
                    <Tab
                        icon={<History />}
                        label="Historical Cases"
                        iconPosition="start"
                        sx={{ minHeight: 60 }}
                    />
                </Tabs>
            </Box>

            {activeTab === 0 ? renderActiveReportsTable() : renderHistoricalReportsTable()}

            {/* Status Update Dialog */}
            <Dialog open={statusDialogOpen} onClose={handleCloseStatusDialog} fullWidth maxWidth="sm">
                <DialogTitle>
                    Update Investigation Status
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ my: 2 }}>
                        <Typography variant="subtitle1">Case ID: {selectedReport?.caseId || 'N/A'}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Current Status: {selectedReport?.status ? formatStatus(selectedReport.status) : 'N/A'}
                        </Typography>

                        {/* Show Case Plan Status in Status Dialog */}
                        {selectedReport?.casePlanExists && (
                            <Box sx={{ mt: 2, mb: 1 }}>
                                <Typography variant="subtitle2" color="primary" gutterBottom>
                                    Case Plan Status:
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {(() => {
                                        const casePlanStatus = getCasePlanStatus(selectedReport);
                                        return casePlanStatus ? (
                                            <Chip
                                                label={casePlanStatus.label}
                                                size="small"
                                                color={casePlanStatus.color}
                                                variant="filled"
                                            />
                                        ) : (
                                            <Chip
                                                label="Has Case Plan"
                                                size="small"
                                                color="info"
                                                variant="filled"
                                            />
                                        );
                                    })()}
                                </Box>
                            </Box>
                        )}

                        {/* Show Assignment Instructions in Status Dialog */}
                        {selectedReport?.assignmentNotes && (
                            <Box sx={{ mt: 2, mb: 2 }}>
                                <Typography variant="subtitle2" color="primary" gutterBottom>
                                    Assignment Instructions:
                                </Typography>
                                <Paper elevation={0} sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                                        {selectedReport.assignmentNotes}
                                    </Typography>
                                </Paper>
                            </Box>
                        )}

                        <Typography variant="body2" color="text.secondary">
                            Principle Amount: {formatCurrency(selectedReport?.principleAmount)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Penalties: {formatCurrency(selectedReport?.penaltiesAmount)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Total: {formatCurrency((selectedReport?.principleAmount || 0) + (selectedReport?.penaltiesAmount || 0))}
                        </Typography>
                    </Box>
                    <TextField
                        select
                        fullWidth
                        label="New Status"
                        value={statusUpdate}
                        onChange={(e) => setStatusUpdate(e.target.value)}
                        sx={{ mb: 2 }}
                    >
                        <MenuItem value="INVESTIGATION_IN_PROGRESS">
                            {formatStatus("INVESTIGATION_IN_PROGRESS")}
                        </MenuItem>
                        <MenuItem value="INVESTIGATION_COMPLETED">
                            {formatStatus("INVESTIGATION_COMPLETED")}
                        </MenuItem>
                        <MenuItem value="INVESTIGATION_ON_HOLD">
                            {formatStatus("INVESTIGATION_ON_HOLD")}
                        </MenuItem>
                    </TextField>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Investigation Notes"
                        placeholder="Enter detailed investigation notes..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseStatusDialog}>Cancel</Button>
                    <Button
                        onClick={handleStatusUpdate}
                        variant="contained"
                        color="primary"
                        disabled={!statusUpdate}
                    >
                        Update Status
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Findings Dialog */}
            <Dialog
                open={findingsDialogOpen}
                onClose={handleCloseFindingsDialog}
                fullWidth
                maxWidth="md"
            >
                <DialogTitle>
                    {activeTab === 0 ? "Submit Investigation Findings" : "View Investigation Findings"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Case ID: {selectedReport?.caseId || 'N/A'}
                    </DialogContentText>

                    {/* Show Case Plan Status in Findings Dialog */}
                    {selectedReport?.casePlanExists && (
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" color="primary" gutterBottom>
                                Case Plan Status:
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {(() => {
                                    const casePlanStatus = getCasePlanStatus(selectedReport);
                                    return casePlanStatus ? (
                                        <Chip
                                            label={casePlanStatus.label}
                                            size="small"
                                            color={casePlanStatus.color}
                                            variant="filled"
                                        />
                                    ) : (
                                        <Chip
                                            label="Has Case Plan"
                                            size="small"
                                            color="info"
                                            variant="filled"
                                        />
                                    );
                                })()}
                            </Box>
                        </Box>
                    )}

                    {/* Show Assignment Instructions in Findings Dialog */}
                    {selectedReport?.assignmentNotes && activeTab === 0 && (
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle2" color="primary" gutterBottom>
                                Assignment Instructions:
                            </Typography>
                            <Paper elevation={1} sx={{ p: 2, backgroundColor: '#f0f7ff', borderRadius: 1 }}>
                                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                                    {selectedReport.assignmentNotes}
                                </Typography>
                            </Paper>
                        </Box>
                    )}

                    {activeTab === 0 && (
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle2">Financial Details</Typography>
                            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                                <TextField
                                    label="Principle Amount (FRW)"
                                    type="number"
                                    value={selectedReport?.principleAmount || 0}
                                    onChange={(e) => {
                                        setSelectedReport(prev => ({
                                            ...prev,
                                            principleAmount: parseFloat(e.target.value) || 0
                                        }));
                                    }}
                                />
                                <TextField
                                    label="Penalties Amount (FRW)"
                                    type="number"
                                    value={selectedReport?.penaltiesAmount || 0}
                                    onChange={(e) => {
                                        setSelectedReport(prev => ({
                                            ...prev,
                                            penaltiesAmount: parseFloat(e.target.value) || 0
                                        }));
                                    }}
                                />
                                <TextField
                                    label="Total (FRW)"
                                    disabled
                                    value={(selectedReport?.principleAmount || 0) + (selectedReport?.penaltiesAmount || 0)}
                                />
                            </Box>
                        </Box>
                    )}

                    <TextField
                        fullWidth
                        multiline
                        rows={6}
                        label="Detailed Findings"
                        value={findings}
                        onChange={(e) => setFindings(e.target.value)}
                        sx={{ mb: 3 }}
                        helperText={activeTab === 0 ? "Provide detailed investigation findings" : ""}
                        disabled={activeTab === 1}
                        InputProps={{
                            readOnly: activeTab === 1
                        }}
                    />

                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Recommendations"
                        value={recommendations}
                        onChange={(e) => setRecommendations(e.target.value)}
                        sx={{ mb: 3 }}
                        helperText={activeTab === 0 ? "Provide recommendations based on your findings" : ""}
                        disabled={activeTab === 1}
                        InputProps={{
                            readOnly: activeTab === 1
                        }}
                    />

                    {activeTab === 0 && (
                        <>
                            <FormControl fullWidth sx={{ mb: 2 }}>
                                <InputLabel htmlFor="attachment-upload">Attachments</InputLabel>
                                <Input
                                    id="attachment-upload"
                                    type="file"
                                    inputProps={{
                                        multiple: true,
                                        accept: "image/*,.pdf,.doc,.docx,.xls,.xlsx"
                                    }}
                                    onChange={handleFileUpload}
                                    startAdornment={<AttachFile />}
                                />
                            </FormControl>

                            {attachmentPreviews.length > 0 && (
                                <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Attachments ({attachmentPreviews.length})
                                    </Typography>
                                    <List dense>
                                        {attachmentPreviews.map((file, index) => (
                                            <React.Fragment key={index}>
                                                <ListItem
                                                    secondaryAction={
                                                        <IconButton
                                                            edge="end"
                                                            onClick={() => removeAttachment(index)}
                                                        >
                                                            <Delete />
                                                        </IconButton>
                                                    }
                                                >
                                                    <ListItemIcon>
                                                        {file.type === 'image' ? (
                                                            <img
                                                                src={file.url}
                                                                alt={file.name}
                                                                style={{
                                                                    width: 50,
                                                                    height: 50,
                                                                    objectFit: 'cover',
                                                                    borderRadius: 1
                                                                }}
                                                            />
                                                        ) : (
                                                            <Description fontSize="large" />
                                                        )}
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={file.name}
                                                        secondary={file.type === 'image' ? "Image" : "Document"}
                                                    />
                                                </ListItem>
                                                {index < attachmentPreviews.length - 1 && <Divider />}
                                            </React.Fragment>
                                        ))}
                                    </List>
                                </Paper>
                            )}
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseFindingsDialog}>
                        {activeTab === 1 ? "Close" : "Cancel"}
                    </Button>
                    {activeTab === 0 && (
                        <Button
                            onClick={submitFindings}
                            variant="contained"
                            color="primary"
                            disabled={!findings}
                            startIcon={<Check />}
                        >
                            Submit Findings
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Case Plan Dialog */}
            <Dialog
                open={casePlanDialogOpen}
                onClose={handleCloseCasePlanDialog}
                fullWidth
                maxWidth="md"
            >
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Task />
                        <Typography variant="h6">
                            {selectedReport?.needsRevision ? "Revise" : "Create"} Case Plan for Case #{selectedReport?.caseId}
                        </Typography>
                    </Box>
                </DialogTitle>

                <DialogContent>
                    <Stepper activeStep={casePlanActiveStep} sx={{ mb: 3 }}>
                        <Step>
                            <StepLabel>Plan Details</StepLabel>
                        </Step>
                        <Step>
                            <StepLabel>Attachments</StepLabel>
                        </Step>
                        <Step>
                            <StepLabel>Review & Submit</StepLabel>
                        </Step>
                    </Stepper>

                    {casePlanActiveStep === 0 && (
                        <Box>
                            <Typography variant="subtitle2" gutterBottom>
                                Investigation Plan Details
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                rows={10}
                                label="Detailed Case Plan *"
                                value={casePlanText}
                                onChange={(e) => setCasePlanText(e.target.value)}
                                helperText="Outline your investigation strategy, methods, timeline, and objectives"
                                placeholder="1. Investigation Objectives:
• Determine [specific objectives]
• Identify [key individuals/entities]
• Collect [evidence types]

2. Methodology:
• [Data collection methods]
• [Analysis techniques]
• [Timeline]

3. Resources Required:
• [Tools/software needed]
• [Personnel requirements]
• [Budget considerations]

4. Risk Assessment:
• [Potential challenges]
• [Mitigation strategies]"
                            />
                        </Box>
                    )}

                    {casePlanActiveStep === 1 && (
                        <Box>
                            <Typography variant="subtitle2" gutterBottom>
                                Attach Supporting Documents
                            </Typography>
                            <FormControl fullWidth sx={{ mb: 2 }}>
                                <InputLabel htmlFor="case-plan-attachment">
                                    Attachment (Optional)
                                </InputLabel>
                                <Input
                                    id="case-plan-attachment"
                                    type="file"
                                    inputProps={{
                                        accept: ".pdf,.doc,.docx,.xls,.xlsx,image/*"
                                    }}
                                    onChange={handleCasePlanFileUpload}
                                    startAdornment={<AttachFile />}
                                />
                            </FormControl>

                            {casePlanAttachmentPreview && (
                                <Card variant="outlined" sx={{ mt: 2 }}>
                                    <CardContent>
                                        <Typography variant="subtitle2">
                                            Selected File: {casePlanAttachmentPreview.name}
                                        </Typography>
                                        {casePlanAttachmentPreview.type === 'pdf' && (
                                            <iframe
                                                src={casePlanAttachmentPreview.url}
                                                title="PDF Preview"
                                                width="100%"
                                                height="300"
                                                style={{ border: 'none' }}
                                            />
                                        )}
                                        {casePlanAttachmentPreview.type === 'image' && (
                                            <img
                                                src={casePlanAttachmentPreview.url}
                                                alt="Preview"
                                                style={{
                                                    maxWidth: '100%',
                                                    maxHeight: '300px',
                                                    marginTop: '10px'
                                                }}
                                            />
                                        )}
                                    </CardContent>
                                    <CardActions>
                                        <Button
                                            size="small"
                                            onClick={() => {
                                                setCasePlanAttachment(null);
                                                setCasePlanAttachmentPreview(null);
                                            }}
                                            startIcon={<Delete />}
                                        >
                                            Remove
                                        </Button>
                                    </CardActions>
                                </Card>
                            )}
                        </Box>
                    )}

                    {casePlanActiveStep === 2 && (
                        <Box>
                            <Typography variant="subtitle2" gutterBottom>
                                Review Your Case Plan
                            </Typography>

                            <Accordion defaultExpanded>
                                <AccordionSummary expandIcon={<ExpandMore />}>
                                    <Typography>Case Plan Description</Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50' }}>
                                        <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                                            {casePlanText || "No case plan description provided"}
                                        </Typography>
                                    </Paper>
                                </AccordionDetails>
                            </Accordion>

                            {casePlanAttachmentPreview && (
                                <Accordion sx={{ mt: 2 }}>
                                    <AccordionSummary expandIcon={<ExpandMore />}>
                                        <Typography>Attachment: {casePlanAttachmentPreview.name}</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Typography variant="body2" color="text.secondary">
                                            File attached for reference
                                        </Typography>
                                    </AccordionDetails>
                                </Accordion>
                            )}
                        </Box>
                    )}
                </DialogContent>

                <DialogActions>
                    <Button onClick={handleCloseCasePlanDialog}>
                        Cancel
                    </Button>
                    <Box flexGrow={1} />
                    {casePlanActiveStep > 0 && (
                        <Button onClick={handleBackCasePlanStep}>
                            Back
                        </Button>
                    )}
                    {casePlanActiveStep < 2 ? (
                        <Button
                            onClick={handleNextCasePlanStep}
                            variant="contained"
                            disabled={casePlanActiveStep === 0 && !casePlanText.trim()}
                        >
                            Next
                        </Button>
                    ) : (
                        <Button
                            onClick={submitCasePlan}
                            variant="contained"
                            color="primary"
                            startIcon={<Check />}
                        >
                            {selectedReport?.needsRevision ? "Resubmit Case Plan" : "Submit Case Plan"}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* View Case Plan Dialog */}
            <Dialog
                open={viewCasePlanDialogOpen}
                onClose={() => setViewCasePlanDialogOpen(false)}
                fullWidth
                maxWidth="lg"
            >
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Task />
                        <Typography variant="h6">
                            Case Plan for Case #{selectedCasePlan?.caseId}
                        </Typography>
                    </Box>
                </DialogTitle>

                <DialogContent dividers>
                    {/* Case Plan Status Header */}
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" gutterBottom color="primary">
                            Case Plan Details
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {(() => {
                                const casePlanStatus = getCasePlanStatus(selectedCasePlan);
                                return casePlanStatus ? (
                                    <Chip
                                        label={casePlanStatus.label}
                                        size="medium"
                                        color={casePlanStatus.color}
                                        variant="filled"
                                    />
                                ) : (
                                    <Chip
                                        label="Has Case Plan"
                                        size="medium"
                                        color="info"
                                        variant="filled"
                                    />
                                );
                            })()}
                            <Typography variant="body2" color="text.secondary">
                                Last Updated: {selectedCasePlan?.updatedAt ? new Date(selectedCasePlan.updatedAt).toLocaleDateString() : 'N/A'}
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" gutterBottom color="primary">
                            Investigation Plan
                        </Typography>
                        <Paper elevation={2} sx={{ p: 3, bgcolor: '#f8f9fa' }}>
                            <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                                {selectedCasePlan?.casePlanDescription || selectedCasePlan?.casePlan ||
                                    (selectedCasePlan?.casePlanExists ?
                                        "Case plan details are available in the system." :
                                        "No case plan available")}
                            </Typography>
                        </Paper>
                    </Box>

                    {selectedCasePlan?.attachments?.length > 0 && (
                        <Box sx={{ mt: 3 }}>
                            <Typography variant="subtitle1" gutterBottom color="primary">
                                Attachments
                            </Typography>
                            <List>
                                {selectedCasePlan.attachments.map((attachment, index) => (
                                    <ListItem key={index}>
                                        <ListItemIcon>
                                            <Description />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={attachment.name}
                                            secondary={`Size: ${(attachment.size / 1024).toFixed(2)} KB`}
                                        />
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            startIcon={<Download />}
                                            onClick={() => {/* Add download logic */ }}
                                        >
                                            Download
                                        </Button>
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    )}
                </DialogContent>

                <DialogActions>
                    <Button onClick={() => setViewCasePlanDialogOpen(false)}>
                        Close
                    </Button>
                    {selectedCasePlan?.casePlanExists &&
                        selectedCasePlan?.relatedCase?.status === 'CASE_PLAN_SUBMITTED' && (
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<Send />}
                                onClick={() => {
                                    sendCasePlanToDirectorInvestigation(selectedCasePlan);
                                }}
                            >
                                Send to Director
                            </Button>
                        )}
                    {selectedCasePlan?.needsRevision && (
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<Edit />}
                            onClick={() => {
                                setViewCasePlanDialogOpen(false);
                                handleOpenCasePlanDialog(selectedCasePlan);
                            }}
                        >
                            Revise Plan
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default InvestigationOfficer;