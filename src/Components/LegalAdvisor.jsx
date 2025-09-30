import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Paper,
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    Alert,
    Tooltip,
    Card,
    CardContent,
    Chip
} from '@mui/material';
import {
    Description as DescriptionIcon,
    Search as SearchIcon,
    PictureAsPdf,
    CheckCircle as ApproveIcon,
    Cancel as RejectIcon,
    Gavel as LegalIcon,
    FilterList as FilterListIcon
} from '@mui/icons-material';
import { ReportApi } from '../api/Axios/caseApi';

const LegalAdvisorDashboard = () => {
    const [reports, setReports] = useState([]);
    const [filteredReports, setFilteredReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedReport, setSelectedReport] = useState(null);
    const [actionDialogOpen, setActionDialogOpen] = useState(false);
    const [actionType, setActionType] = useState(''); // 'approve' or 'reject'
    const [rejectionReason, setRejectionReason] = useState('');
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'info'
    });
    const [reportDialogOpen, setReportDialogOpen] = useState(false);
    const [currentReport, setCurrentReport] = useState(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        fetchLegalAdvisorReports();
    }, []);

    const fetchLegalAdvisorReports = async () => {
        try {
            setLoading(true);
            const response = await ReportApi.getReportsForLegalAdvisor();
            console.log('Fetched legal advisor reports:', response.data);
            setReports(response.data);
            setFilteredReports(response.data);
        } catch (err) {
            console.error('Failed to load legal advisor reports:', err);
            setError(err.response?.data?.message || 'Failed to load reports');
            showSnackbar('Failed to load reports', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let results = reports;

        // Search filter
        if (searchTerm) {
            results = results.filter(report =>
                Object.values(report).some(
                    value => value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
                ) ||
                (report.relatedCase && report.relatedCase.caseNum &&
                    report.relatedCase.caseNum.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }
        if (statusFilter !== 'all') {
            results = results.filter(report =>
                report.relatedCase?.status === statusFilter
            );
        }

        setFilteredReports(results);
    }, [searchTerm, reports, statusFilter]);

    const showSnackbar = (message, severity) => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    const handleViewReport = async (report) => {
        try {
            // Fetch the complete report with findings data
            const fullReport = await ReportApi.getFindings(report.id);
            setCurrentReport(fullReport.data);
            setReportDialogOpen(true);
        } catch (error) {
            console.error('Error fetching report:', error);
            // If findings fetch fails, show basic report data
            setCurrentReport(report);
            setReportDialogOpen(true);
            showSnackbar('Could not load full report details, showing basic information', 'warning');
        }
    };

    const handleViewPdf = async (reportId, filename) => {
        try {
            setPdfLoading(true);
            await ReportApi.downloadFindingsAttachment(reportId, filename);
            // Note: The download will trigger automatically via the API
        } catch (error) {
            console.error('Error loading PDF:', error);
            showSnackbar(error.response?.data?.message || 'Failed to load PDF', 'error');
        } finally {
            setPdfLoading(false);
        }
    };

    const handleApproveClick = (report) => {
        setSelectedReport(report);
        setActionType('approve');
        setActionDialogOpen(true);
    };

    const handleRejectClick = (report) => {
        setSelectedReport(report);
        setActionType('reject');
        setRejectionReason('');
        setActionDialogOpen(true);
    };

    const handleLegalAction = async () => {
        if (!selectedReport) return;

        try {
            if (actionType === 'approve') {
                await ReportApi.approveReport(selectedReport.id);
                showSnackbar('Report approved successfully', 'success');
            } else if (actionType === 'reject') {
                if (!rejectionReason.trim()) {
                    showSnackbar('Please provide a rejection reason', 'warning');
                    return;
                }
                await ReportApi.rejectReport(selectedReport.id, rejectionReason);
                showSnackbar('Report rejected successfully', 'success');
            }

            // Refresh reports list
            fetchLegalAdvisorReports();

        } catch (err) {
            console.error(`Failed to ${actionType} report:`, err);
            showSnackbar(err.response?.data?.message || `Failed to ${actionType} report`, 'error');
        } finally {
            setActionDialogOpen(false);
            setSelectedReport(null);
            setRejectionReason('');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'REPORT_SENT_TO_LEGAL_ADVISOR':
                return '#ff9800'; // Orange - pending review
            case 'REPORT_APPROVED_BY_LEGAL_ADVISOR':
                return '#4caf50'; // Green - approved
            case 'REPORT_REJECTED_BY_LEGAL_ADVISOR':
                return '#f44336'; // Red - rejected
            case 'REPORT_RETURNED_TO_LEGAL_ADVISOR':
                return '#9c27b0'; // Purple - returned
            default:
                return '#757575'; // Grey - default
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'REPORT_SENT_TO_LEGAL_ADVISOR':
                return 'Pending Legal Review';
            case 'REPORT_APPROVED_BY_LEGAL_ADVISOR':
                return 'Legally Approved';
            case 'REPORT_REJECTED_BY_LEGAL_ADVISOR':
                return 'Legally Rejected';
            case 'REPORT_RETURNED_TO_LEGAL_ADVISOR':
                return 'Returned for Revision';
            default:
                return status;
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box p={3}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    return (
        <Box p={3}>
            {/* Header */}
            <Box display="flex" alignItems="center" mb={3} gap={2}>
                <LegalIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                <Box>
                    <Typography variant="h4" component="h1" gutterBottom>
                        Legal Advisor Dashboard
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary">
                        Review and provide legal assessment for investigation reports
                    </Typography>
                </Box>
            </Box>

            <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={3}
                gap={2}
            >
                <Box display="flex" alignItems="center" gap={2} flex={1}>
                    <TextField
                        size="small"
                        placeholder="Search reports..."
                        variant="outlined"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <IconButton edge="start">
                                    <SearchIcon />
                                </IconButton>
                            ),
                        }}
                        sx={{ minWidth: 300 }}
                    />
                </Box>
            </Box>

            {/* Reports Table */}
            <TableContainer component={Paper} elevation={3}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: 'grey.100' }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>Report ID</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Case ID</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Submitted By</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Submission Date</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Legal Assessment</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredReports.length > 0 ? (
                            filteredReports.map((report) => (
                                <TableRow
                                    key={report.id}
                                    hover
                                    sx={{
                                        backgroundColor: report.relatedCase?.status === 'REPORT_SENT_TO_LEGAL_ADVISOR'
                                            ? '#fff3e0'
                                            : 'inherit'
                                    }}
                                >
                                    <TableCell>{report.id}</TableCell>
                                    <TableCell>{report.relatedCase?.caseNum || '-'}</TableCell>
                                    <TableCell>
                                        {report.createdBy || 'Unknown'}
                                    </TableCell>
                                    <TableCell>
                                        {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={getStatusText(report.relatedCase?.status)}
                                            size="small"
                                            sx={{
                                                backgroundColor: getStatusColor(report.relatedCase?.status),
                                                color: 'white',
                                                fontWeight: 'bold'
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {report.legalAssessment || 'Pending'}
                                    </TableCell>
                                    <TableCell>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            {/* View Report */}
                                            <Tooltip title="View Report Details">
                                                <IconButton
                                                    onClick={() => handleViewReport(report)}
                                                    color="primary"
                                                >
                                                    <DescriptionIcon />
                                                </IconButton>
                                            </Tooltip>

                                            {/* View Findings PDF - Only show if findings attachments exist */}
                                            {report.findingsAttachmentPaths && report.findingsAttachmentPaths.length > 0 && (
                                                <Tooltip title="View Findings PDF">
                                                    <span>
                                                        <IconButton
                                                            onClick={() => handleViewPdf(report.id, report.findingsAttachmentPaths[0])}
                                                            disabled={pdfLoading}
                                                            color="secondary"
                                                        >
                                                            {pdfLoading ? <CircularProgress size={24} /> : <PictureAsPdf />}
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            )}

                                            {/* Action Buttons - Only show for pending reviews */}
                                            {report.relatedCase?.status === 'REPORT_SENT_TO_LEGAL_ADVISOR' && (
                                                <>
                                                    <Tooltip title="Approve Report">
                                                        <IconButton
                                                            onClick={() => handleApproveClick(report)}
                                                            color="success"
                                                        >
                                                            <ApproveIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Reject Report">
                                                        <IconButton
                                                            onClick={() => handleRejectClick(report)}
                                                            color="error"
                                                        >
                                                            <RejectIcon />
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
                                    <Typography variant="body1" color="text.secondary" py={3}>
                                        No reports found matching your criteria
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Action Confirmation Dialog */}
            <Dialog open={actionDialogOpen} onClose={() => setActionDialogOpen(false)}>
                <DialogTitle>
                    {actionType === 'approve' ? 'Approve Report' : 'Reject Report'}
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 2 }}>
                        {actionType === 'approve'
                            ? `Are you sure you want to approve report ${selectedReport?.id}?`
                            : `Are you sure you want to reject report ${selectedReport?.id}?`
                        }
                    </Typography>

                    {actionType === 'reject' && (
                        <TextField
                            fullWidth
                            label="Rejection Reason"
                            multiline
                            rows={3}
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Please provide the reason for rejection..."
                            sx={{ mt: 2 }}
                        />
                    )}

                    <Alert
                        severity={actionType === 'approve' ? 'success' : 'warning'}
                        sx={{ mt: 2 }}
                    >
                        {actionType === 'approve'
                            ? 'This report will be marked as legally compliant and proceed to the next stage.'
                            : 'This report will be returned to the sender with your feedback.'
                        }
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setActionDialogOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleLegalAction}
                        variant="contained"
                        color={actionType === 'approve' ? 'success' : 'error'}
                        startIcon={actionType === 'approve' ? <ApproveIcon /> : <RejectIcon />}
                        disabled={actionType === 'reject' && !rejectionReason.trim()}
                    >
                        {actionType === 'approve' ? 'Approve' : 'Reject'}
                    </Button>
                </DialogActions>
            </Dialog>

            {currentReport && (
                <Dialog
                    open={reportDialogOpen}
                    onClose={() => {
                        setReportDialogOpen(false);
                        setCurrentReport(null);
                    }}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle>
                        Report Details - #{currentReport.id}
                    </DialogTitle>
                    <DialogContent>
                        <Box sx={{ mt: 2 }}>
                            {/* Basic Information */}
                            <Card variant="outlined" sx={{ mb: 3 }}>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Case Information
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Case ID: {currentReport.relatedCase?.caseNum || 'N/A'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Status: {getStatusText(currentReport.relatedCase?.status)}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Submitted: {currentReport.createdAt ? new Date(currentReport.createdAt).toLocaleString() : 'N/A'}
                                    </Typography>
                                </CardContent>
                            </Card>

                            {/* Description */}
                            {currentReport.description && (
                                <Card variant="outlined" sx={{ mb: 3 }}>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            Description
                                        </Typography>
                                        <Typography variant="body1">
                                            {currentReport.description}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Findings */}
                            {currentReport.findings && (
                                <Card variant="outlined" sx={{ mb: 3 }}>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            Investigation Findings
                                        </Typography>
                                        <Typography variant="body1">
                                            {currentReport.findings}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Recommendations */}
                            {currentReport.recommendations && (
                                <Card variant="outlined" sx={{ mb: 3 }}>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            Recommendations
                                        </Typography>
                                        <Typography variant="body1">
                                            {currentReport.recommendations}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Financial Assessment */}
                            {(currentReport.principleAmount || currentReport.penaltiesAmount) && (
                                <Card variant="outlined" sx={{ mb: 3 }}>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            Financial Assessment
                                        </Typography>
                                        {currentReport.principleAmount && (
                                            <Typography variant="body2">
                                                Principle Amount: ${currentReport.principleAmount.toLocaleString()}
                                            </Typography>
                                        )}
                                        {currentReport.penaltiesAmount && (
                                            <Typography variant="body2">
                                                Penalties Amount: ${currentReport.penaltiesAmount.toLocaleString()}
                                            </Typography>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Findings Attachments */}
                            {currentReport.findingsAttachmentPaths && currentReport.findingsAttachmentPaths.length > 0 && (
                                <Card variant="outlined">
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            Findings Attachments
                                        </Typography>
                                        <Box display="flex" flexDirection="column" gap={1}>
                                            {currentReport.findingsAttachmentPaths.map((attachment, index) => (
                                                <Button
                                                    key={index}
                                                    variant="outlined"
                                                    startIcon={<PictureAsPdf />}
                                                    onClick={() => handleViewPdf(currentReport.id, attachment)}
                                                    sx={{ justifyContent: 'flex-start' }}
                                                >
                                                    View Findings PDF {index + 1}
                                                </Button>
                                            ))}
                                        </Box>
                                    </CardContent>
                                </Card>
                            )}
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => {
                            setReportDialogOpen(false);
                            setCurrentReport(null);
                        }}>
                            Close
                        </Button>
                    </DialogActions>
                </Dialog>
            )}

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default LegalAdvisorDashboard;