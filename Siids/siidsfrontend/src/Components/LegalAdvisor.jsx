// LEGAL ADVISOR DASHBOARD - UPDATED WITH RETURN TO INVESTIGATION OFFICER FUNCTIONALITY
import React, { useState, useEffect } from 'react';
import {
    Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, Paper, Snackbar, Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, TextField, Typography, Alert, Tooltip, Chip
} from '@mui/material';

import {
    PictureAsPdf, Search as SearchIcon, Visibility as VisibilityIcon, Gavel as LegalIcon,
    Undo as ReturnIcon, Refresh as RefreshIcon
} from '@mui/icons-material';

import { Link } from 'react-router-dom';
import { ReportApi } from '../api/Axios/caseApi';

const LegalAdvisorDashboard = () => {
    const [reports, setReports] = useState([]);
    const [filteredReports, setFilteredReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [pdfLoading, setPdfLoading] = useState({});
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'info'
    });

    // Return dialog states
    const [returnDialogOpen, setReturnDialogOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [returnReason, setReturnReason] = useState('');
    useEffect(() => {
        fetchLegalAdvisorReports();
    }, []);

    const fetchLegalAdvisorReports = async () => {
        try {
            setLoading(true);
            setError(null);

            console.log('Fetching legal advisor reports...');

            const response = await ReportApi.getReportsForLegalAdvisor();

            console.log('API Response:', response);
            console.log('Response data:', response.data);

            if (!response.data || !Array.isArray(response.data)) {
                console.error('Invalid response data:', response.data);
                setError('Invalid data received from server');
                setReports([]);
                setFilteredReports([]);
                return;
            }

            // Map reports with proper data extraction
            const mapped = response.data.map(r => {
                console.log(`Processing report ${r.id}:`, {
                    findingsAttachmentPaths: r.findingsAttachmentPaths,
                    attachments: r.attachmentPaths,
                    findings: r.findings,
                    principleAmount: r.principleAmount,
                    penaltiesAmount: r.penaltiesAmount,
                    status: r.status,
                    relatedCase: r.relatedCase
                });

                // Determine if report has findings (check multiple possible fields)
                const hasFindings = Boolean(
                    r.findings ||
                    r.recommendations ||
                    (r.findingsAttachmentPaths && r.findingsAttachmentPaths.length > 0) ||
                    (r.findingsAttachmentPaths && Array.isArray(r.findingsAttachmentPaths) && r.findingsAttachmentPaths.length > 0) ||
                    r.principleAmount ||
                    r.penaltiesAmount
                );

                // Get case number safely
                const caseNum = r.relatedCase?.caseNum ||
                    (r.relatedCase && typeof r.relatedCase === 'object' ? r.relatedCase.caseNum : 'N/A');

                return {
                    ...r,
                    id: r.id || r.reportId || 'Unknown',
                    caseNum: caseNum,
                    createdBy: r.createdBy || 'Unknown',
                    createdAt: r.createdAt || new Date().toISOString(),
                    status: r.status || 'UNKNOWN',
                    hasFindings: hasFindings,
                    // Ensure findingsAttachmentPaths is always an array
                    findingsAttachmentPaths: Array.isArray(r.findingsAttachmentPaths)
                        ? r.findingsAttachmentPaths
                        : (r.findingsAttachmentPaths ? [r.findingsAttachmentPaths] : []),
                    // Also check regular attachments
                    attachments: Array.isArray(r.attachmentPaths)
                        ? r.attachmentPaths
                        : (r.attachmentPath ? [r.attachmentPath] : [])
                };
            });

            console.log('Mapped reports:', mapped);

            setReports(mapped);
            setFilteredReports(mapped);

            // Show summary
            const reportsWithFindings = mapped.filter(r => r.hasFindings).length;
            const reportsWithPDFs = mapped.filter(r =>
                r.findingsAttachmentPaths && r.findingsAttachmentPaths.length > 0
            ).length;

            console.log(`Summary: ${mapped.length} total reports, ${reportsWithFindings} with findings, ${reportsWithPDFs} with PDFs`);

        } catch (err) {
            console.error('Error fetching reports:', err);
            setError(err.response?.data?.message || err.message || 'Failed to load reports');
            setReports([]);
            setFilteredReports([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let results = reports;

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            results = results.filter(report => {
                const searchableText = [
                    report.id?.toString(),
                    report.caseNum,
                    report.createdBy,
                    report.status,
                    report.findings,
                    report.recommendations
                ].filter(Boolean).join(' ').toLowerCase();

                return searchableText.includes(term);
            });
        }

        setFilteredReports(results);
    }, [searchTerm, reports]);

    const handleViewPdf = async (reportId, filename) => {
        try {
            // Set loading state for this specific report
            setPdfLoading(prev => ({ ...prev, [reportId]: true }));

            console.log(`Downloading PDF for report ${reportId}:`, filename);

            if (!filename) {
                throw new Error('No filename provided');
            }

            await ReportApi.downloadFindingsAttachment(reportId, filename);

            setSnackbar({
                open: true,
                message: 'PDF download started',
                severity: 'success'
            });
        } catch (err) {
            console.error('Error downloading PDF:', err);

            // Try alternative download method if the first fails
            try {
                await ReportApi.downloadAttachment(reportId, filename);
            } catch (fallbackErr) {
                console.error('Fallback download also failed:', fallbackErr);

                setSnackbar({
                    open: true,
                    message: `Failed to download PDF: ${err.message || 'Unknown error'}`,
                    severity: 'error'
                });
            }
        } finally {
            setPdfLoading(prev => ({ ...prev, [reportId]: false }));
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'REPORT_SENT_TO_LEGAL_TEAM':
            case 'INVESTIGATION_COMPLETED':
                return '#ff9800'; // Orange - pending
            case 'REPORT_APPROVED_BY_LEGAL_ADVISOR':
                return '#4caf50'; // Green - approved
            case 'REPORT_REJECTED_BY_LEGAL_ADVISOR':
                return '#f44336'; // Red - rejected
            case 'REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER':
                return '#2196f3'; // Blue - approved by commissioner
            case 'REPORT_RETURNED_TO_INVESTIGATION_OFFICER':
                return '#9c27b0'; // Purple - returned
            default:
                return '#757575'; // Gray - other
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'REPORT_SENT_TO_LEGAL_TEAM':
            case 'INVESTIGATION_COMPLETED':
                return 'Pending Legal Review';
            case 'REPORT_APPROVED_BY_LEGAL_ADVISOR':
                return 'Legally Approved';
            case 'REPORT_REJECTED_BY_LEGAL_ADVISOR':
                return 'Legally Rejected';
            case 'REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER':
                return 'Approved by Commissioner';
            case 'REPORT_SUBMITTED_TO_ASSISTANT_COMMISSIONER':
                return 'With Commissioner';
            case 'REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION':
                return 'Approved by Director (Inv)';
            case 'REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE':
                return 'Approved by Director (Intel)';
            case 'REPORT_RETURNED_TO_INVESTIGATION_OFFICER':
                return 'Returned to Investigation';
            default:
                return status?.replace(/_/g, ' ') || 'Unknown Status';
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const handleRefresh = () => {
        fetchLegalAdvisorReports();
    };

    // Return report functions
    const handleReturnClick = (report) => {
        setSelectedReport(report);
        setReturnReason('');
        setReturnDialogOpen(true);
    };

    const handleReturnSubmit = async () => {
        if (!selectedReport || !returnReason.trim()) {
            setSnackbar({
                open: true,
                message: 'Please provide a return reason',
                severity: 'error'
            });
            return;
        }

        try {
            // Create the request body
            const requestBody = {
                returnReason: returnReason
            };

            // Call the API - updated to return to Assistant Commissioner
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/reports/${selectedReport.id}/return-to-assistant-commissioner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`,
                    'employee_id': localStorage.getItem('employeeId') || sessionStorage.getItem('employeeId')
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            setSnackbar({
                open: true,
                message: 'Report returned to Assistant Commissioner successfully',
                severity: 'success'
            });

            // Refresh the reports list
            fetchLegalAdvisorReports();
            setReturnDialogOpen(false);
        } catch (error) {
            console.error('Error returning report:', error);
            setSnackbar({
                open: true,
                message: error.message || 'Failed to return report',
                severity: 'error'
            });
        }
    };

    const canReturnReport = (report) => {
        // Allow return if report is with legal advisor or recently completed investigation
        return report.status === 'REPORT_SENT_TO_LEGAL_TEAM' ||
            report.status === 'INVESTIGATION_COMPLETED';
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading legal advisor reports...</Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box p={3}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
                <Button variant="contained" onClick={fetchLegalAdvisorReports}>
                    Retry
                </Button>
            </Box>
        );
    }

    return (
        <Box p={3}>
            {/* Header */}
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                <Box display="flex" alignItems="center" gap={2}>
                    <LegalIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                    <Box>
                        <Typography variant="h4">Legal Advisor Dashboard</Typography>
                        <Typography variant="body2" color="textSecondary">
                            Review and analyze investigation reports
                        </Typography>
                    </Box>
                </Box>
                <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={handleRefresh}
                >
                    Refresh All
                </Button>
            </Box>
            <Box display="flex" gap={2} alignItems="center" mb={2}>
                <TextField
                    size="small"
                    placeholder="Search reports by ID, case number, status..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
                    }}
                    sx={{ width: 400 }}
                />
                <Typography variant="body2" color="textSecondary">
                    Showing {filteredReports.length} of {reports.length} reports
                </Typography>
            </Box>

            {/* Reports Table */}
            <TableContainer component={Paper} sx={{ maxHeight: 600, overflow: 'auto' }}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell><strong>Report ID</strong></TableCell>
                            <TableCell><strong>Case Number</strong></TableCell>
                            <TableCell><strong>Submitted By</strong></TableCell>
                            <TableCell><strong>Date Submitted</strong></TableCell>
                            <TableCell><strong>Status</strong></TableCell>
                            <TableCell><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {filteredReports.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                    <Typography color="textSecondary">
                                        {reports.length === 0
                                            ? 'No reports assigned to you yet'
                                            : 'No reports match your search'}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredReports.map((report) => {
                                const hasPDFs = report.findingsAttachmentPaths &&
                                    report.findingsAttachmentPaths.length > 0;
                                const isLoading = pdfLoading[report.id];
                                const canReturn = canReturnReport(report);

                                return (
                                    <TableRow
                                        key={report.id}
                                        hover
                                        sx={{
                                            backgroundColor: report.hasFindings ? '#f9f9f9' : 'inherit',
                                            '&:hover': {
                                                backgroundColor: '#f0f0f0'
                                            }
                                        }}
                                    >
                                        <TableCell>
                                            <Typography fontWeight="bold">
                                                #{report.id}
                                            </Typography>
                                        </TableCell>

                                        <TableCell>
                                            <Typography variant="body2">
                                                {report.caseNum}
                                            </Typography>
                                        </TableCell>

                                        <TableCell>
                                            <Typography variant="body2">
                                                {report.createdBy}
                                            </Typography>
                                        </TableCell>

                                        <TableCell>
                                            <Typography variant="body2">
                                                {report.createdAt
                                                    ? new Date(report.createdAt).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })
                                                    : 'N/A'}
                                            </Typography>
                                        </TableCell>

                                        <TableCell>
                                            <Chip
                                                label={getStatusText(report.status)}
                                                size="small"
                                                sx={{
                                                    backgroundColor: getStatusColor(report.status),
                                                    color: 'white',
                                                    fontWeight: 'bold',
                                                    minWidth: 150
                                                }}
                                            />
                                        </TableCell>

                                        <TableCell>
                                            <Box display="flex" gap={1} alignItems="center">
                                                {/* View Findings Button */}
                                                <Tooltip title="View Full Findings Details">
                                                    <IconButton
                                                        color="primary"
                                                        component={Link}
                                                        to={`/reports/${report.id}/findings`}
                                                        size="small"
                                                    >
                                                        <VisibilityIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>

                                                {/* Return Button */}
                                                {canReturn && (
                                                    <Tooltip title="Return to Assistant Commissioner">
                                                        <IconButton
                                                            color="warning"
                                                            onClick={() => handleReturnClick(report)}
                                                            size="small"
                                                        >
                                                            <ReturnIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}

                                                {/* PDF Download Buttons */}
                                                {hasPDFs && (
                                                    <Box display="flex" gap={0.5}>
                                                        {report.findingsAttachmentPaths.map((filename, index) => (
                                                            <Tooltip key={index} title={`Download PDF ${index + 1}`}>
                                                                <IconButton
                                                                    color="secondary"
                                                                    onClick={() => handleViewPdf(report.id, filename, index)}
                                                                    size="small"
                                                                    disabled={isLoading}
                                                                >
                                                                    {isLoading ? (
                                                                        <CircularProgress size={20} />
                                                                    ) : (
                                                                        <PictureAsPdf fontSize="small" />
                                                                    )}
                                                                </IconButton>
                                                            </Tooltip>
                                                        ))}
                                                    </Box>
                                                )}
                                            </Box>

                                            {/* Display number of PDFs if available */}
                                            {hasPDFs && (
                                                <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
                                                    {report.findingsAttachmentPaths.length} PDF file(s) available
                                                </Typography>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Return Report Dialog */}
            <Dialog
                open={returnDialogOpen}
                onClose={() => setReturnDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <ReturnIcon color="warning" />
                        Return Report to Assistant Commissioner
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                            Report Details
                        </Typography>
                        <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                            <Typography variant="body2">
                                <strong>Report ID:</strong> #{selectedReport?.id}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Case Number:</strong> {selectedReport?.caseNum}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Submitted By:</strong> {selectedReport?.createdBy}
                            </Typography>
                        </Box>

                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label="Return Reason"
                            value={returnReason}
                            onChange={(e) => setReturnReason(e.target.value)}
                            placeholder="Please explain why you are returning this report to the Assistant Commissioner."
                            required
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setReturnDialogOpen(false)} color="inherit">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleReturnSubmit}
                        variant="contained"
                        color="warning"
                        startIcon={<ReturnIcon />}
                        disabled={!returnReason.trim()}
                    >
                        Return Report
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
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