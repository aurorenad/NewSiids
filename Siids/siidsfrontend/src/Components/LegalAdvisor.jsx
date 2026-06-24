// LEGAL ADVISOR DASHBOARD - UPDATED WITH RETURN TO INVESTIGATION OFFICER FUNCTIONALITY
import React, { useContext, useState, useEffect, useMemo } from 'react';
import {
    Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, Snackbar, TextField, Typography, Alert, Tooltip, Chip
} from '@mui/material';

import {
    PictureAsPdf, Search as SearchIcon, Visibility as VisibilityIcon, Gavel as LegalIcon,
    Undo as ReturnIcon, Refresh as RefreshIcon
} from '@mui/icons-material';

import { Link } from 'react-router-dom';
import { ReportApi } from '../api/Axios/caseApi';
import { AuthContext } from '../context/AuthContext';
import { hasPermission } from '../utils/authorization';
import { PERMISSIONS } from '../constants/permissions';
import { routeTo } from '../constants/routes';
import AppTable from './ui/AppTable.jsx';

const ROWS_PER_PAGE = 10;
const legalAdvisorRequestCache = {
    key: '',
    promise: null,
    data: null,
    timestamp: 0
};

const getLegalAdvisorReportsOnce = async (params) => {
    const key = JSON.stringify(params);
    const now = Date.now();

    if (legalAdvisorRequestCache.key === key && legalAdvisorRequestCache.promise) {
        return legalAdvisorRequestCache.promise;
    }

    if (
        legalAdvisorRequestCache.key === key &&
        legalAdvisorRequestCache.data &&
        now - legalAdvisorRequestCache.timestamp < 1000
    ) {
        return legalAdvisorRequestCache.data;
    }

    legalAdvisorRequestCache.key = key;
    legalAdvisorRequestCache.promise = ReportApi.getReportsForLegalAdvisor(params)
        .then((response) => {
            legalAdvisorRequestCache.data = response;
            legalAdvisorRequestCache.timestamp = Date.now();
            return response;
        })
        .finally(() => {
            legalAdvisorRequestCache.promise = null;
        });

    return legalAdvisorRequestCache.promise;
};

const LegalAdvisorDashboard = () => {
    const { authState } = useContext(AuthContext);
    const [reports, setReports] = useState([]);
    const [totalReports, setTotalReports] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);
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
    const canLegalReview = hasPermission(authState, PERMISSIONS.LEGAL_REVIEW);
    useEffect(() => {
        fetchLegalAdvisorReports();
    }, [page, searchTerm]);

    const fetchLegalAdvisorReports = async () => {
        try {
            setLoading(true);
            setError(null);

            console.log('Fetching legal advisor reports...');

            const response = await getLegalAdvisorReportsOnce({
                page,
                size: ROWS_PER_PAGE,
                search: searchTerm,
            });

            console.log('API Response:', response);
            console.log('Response data:', response.data);

            const pageData = response.data || {};
            const content = pageData.content || [];

            if (!Array.isArray(content)) {
                console.error('Invalid response data:', response.data);
                setError('Invalid data received from server');
                setReports([]);
                setTotalReports(0);
                return;
            }

            // Map reports with proper data extraction
            const mapped = content.map(r => {
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
            setTotalReports(pageData.totalElements || 0);

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
            setTotalReports(0);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchChange = (value) => {
        setSearchTerm(value);
        setPage(0);
    };

    const handleViewPdf = async (reportId, filename) => {
        try {
            // Set loading state for this specific report
            setPdfLoading(prev => ({ ...prev, [reportId]: true }));

            console.log(`Downloading PDF for report ${reportId}:`, filename);

            if (!filename) {
                throw new Error('No filename provided');
            }

            await ReportApi.downloadAttachment(reportId, filename);

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
            await ReportApi.returnToAssistantCommissioner(selectedReport.id, returnReason);

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
                message: error.response?.data?.message || error.message || 'Failed to return report',
                severity: 'error'
            });
        }
    };

    const canReturnReport = (report) => {
        // Allow return if report is with legal advisor or recently completed investigation
        return report.status === 'REPORT_SENT_TO_LEGAL_TEAM' ||
            report.status === 'INVESTIGATION_COMPLETED';
    };

    const formatDate = (value) => {
        if (!value) return 'N/A';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'N/A';
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const tableColumns = useMemo(() => [
        {
            key: 'id',
            label: 'Report ID',
            render: (report) => <Typography fontWeight="bold">#{report.id}</Typography>
        },
        {
            key: 'caseNum',
            label: 'Case Number',
            render: (report) => report.caseNum || '-'
        },
        {
            key: 'createdBy',
            label: 'Submitted By',
            render: (report) => report.createdBy || '-'
        },
        {
            key: 'createdAt',
            label: 'Date Submitted',
            render: (report) => formatDate(report.createdAt)
        },
        {
            key: 'status',
            label: 'Status',
            render: (report) => (
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
            )
        },
        {
            key: 'actions',
            label: 'Actions',
            headerStyle: { textAlign: 'center' },
            cellStyle: { textAlign: 'center', minWidth: 220 },
            render: (report) => {
                const hasPDFs = report.findingsAttachmentPaths && report.findingsAttachmentPaths.length > 0;
                const isLoading = pdfLoading[report.id];
                const canReturn = canReturnReport(report);

                return (
                    <Box display="flex" gap={1} alignItems="center" justifyContent="center" flexWrap="wrap">
                        <Tooltip title="View Full Findings Details">
                            <IconButton
                                color="primary"
                                component={Link}
                                to={routeTo.reportFindings(report.id)}
                                size="small"
                            >
                                <VisibilityIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>

                        {canLegalReview && canReturn && (
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

                        {hasPDFs && report.findingsAttachmentPaths.map((filename, index) => (
                            <Tooltip key={filename || index} title={`Download PDF ${index + 1}`}>
                                <IconButton
                                    color="secondary"
                                    onClick={() => handleViewPdf(report.id, filename)}
                                    size="small"
                                    disabled={isLoading}
                                >
                                    {isLoading ? <CircularProgress size={20} /> : <PictureAsPdf fontSize="small" />}
                                </IconButton>
                            </Tooltip>
                        ))}

                        {hasPDFs && (
                            <Typography variant="caption" color="textSecondary" sx={{ width: '100%' }}>
                                {report.findingsAttachmentPaths.length} PDF file(s)
                            </Typography>
                        )}
                    </Box>
                );
            }
        }
    ], [pdfLoading, canLegalReview]);

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

            <Box display="flex" gap={2} alignItems="center" mb={2} flexWrap="wrap">
                <TextField
                    size="small"
                    placeholder="Search reports by ID, case number, status..."
                    value={searchTerm}
                    onChange={(event) => handleSearchChange(event.target.value)}
                    InputProps={{
                        startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
                    }}
                    sx={{ width: { xs: '100%', sm: 400 } }}
                />
                <Typography variant="body2" color="textSecondary">
                    Showing {reports.length} of {totalReports} reports
                </Typography>
            </Box>

            <AppTable
                columns={tableColumns}
                rows={reports}
                loading={loading}
                emptyMessage={reports.length === 0 ? 'No reports assigned to you yet' : 'No reports match your search'}
                page={page}
                rowsPerPage={ROWS_PER_PAGE}
                totalRows={totalReports}
                onPageChange={(event, nextPage) => setPage(nextPage)}
                minWidth={1100}
            />

            {/* Return Report Dialog */}
            <Dialog
                open={returnDialogOpen}
                onClose={(e, reason) => {
                    if (reason !== 'backdropClick') {
                        setReturnDialogOpen(false);
                    }
                }}
                maxWidth="sm"
                fullWidth
                disableEnforceFocus
                disableRestoreFocus
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
