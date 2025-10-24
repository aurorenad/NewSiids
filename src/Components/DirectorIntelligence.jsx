import React, { useState, useEffect, useMemo } from 'react';
import {
    Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, CircularProgress, Alert, Box,
    Tooltip, MenuItem, Select, FormControl, InputLabel,
    Typography, Chip,
    TablePagination
} from "@mui/material";
import {
    Description, Check, Close, Search, Reply,
    Person, Assignment, Info, ListAlt,
    ArrowUpward, ArrowDownward
} from "@mui/icons-material";
import { useNavigate } from 'react-router-dom';
import { ReportApi } from '../api/Axios/caseApi';

const DirectorIntelligence = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoadingReports, setActionLoadingReports] = useState(new Set());
    const [currentUser] = useState("Current User"); // Replace with actual context/state

    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [returnDialogOpen, setReturnDialogOpen] = useState(false);
    const [infoDialogOpen, setInfoDialogOpen] = useState(false);

    const [selectedReport, setSelectedReport] = useState(null);

    const [rejectionReason, setRejectionReason] = useState('');
    const [returnEmployeeId, setReturnEmployeeId] = useState('');
    const [returnReason, setReturnReason] = useState('');
    const [returnType, setReturnType] = useState('creator');

    // ✅ Pagination state
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // ✅ Sorting state
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'

    const navigate = useNavigate();

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const response = await ReportApi.getReportsForDirectorIntelligence();
            // Ensure all reports have createdAt field for sorting
            const reportsWithDate = response.data.map(report => ({
                ...report,
                createdAt: report.createdAt || report.createdDate || report.dateCreated || new Date().toISOString()
            }));
            setReports(reportsWithDate);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch reports');
        } finally {
            setLoading(false);
        }
    };

    const setReportLoading = (reportId, isLoading) => {
        setActionLoadingReports(prev => {
            const newSet = new Set(prev);
            if (isLoading) {
                newSet.add(reportId);
            } else {
                newSet.delete(reportId);
            }
            return newSet;
        });
    };

    // ✅ Sort handler
    const handleSortByDate = () => {
        const newSortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
        setSortOrder(newSortOrder);
        setSortBy('createdAt');
    };

    // ✅ Pagination handlers
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleApprove = async (report) => {
        setReportLoading(report.id, true);
        try {
            await ReportApi.approveReport(report.id);
            setReports(prev => prev.map(r =>
                r.id === report.id ? {
                    ...r,
                    status: 'REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE',
                    approvedAt: new Date().toISOString(),
                    approvedBy: currentUser
                } : r
            ));
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to approve report');
        } finally {
            setReportLoading(report.id, false);
        }
    };

    const handleOpenRejectDialog = (report) => {
        setSelectedReport(report);
        setRejectionReason('');
        setRejectDialogOpen(true);
    };

    const closeRejectDialog = () => {
        setRejectDialogOpen(false);
        setRejectionReason('');
        setSelectedReport(null);
    };

    const handleConfirmReject = async () => {
        if (!rejectionReason.trim()) {
            setError('Rejection reason is required');
            return;
        }

        if (!selectedReport) {
            setError('No report selected');
            return;
        }

        setReportLoading(selectedReport.id, true);
        try {
            await ReportApi.rejectReport(selectedReport.id, rejectionReason);
            setReports(prev => prev.map(r =>
                r.id === selectedReport.id ? {
                    ...r,
                    status: 'REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE',
                    rejectionReason,
                    rejectedAt: new Date().toISOString(),
                    rejectedBy: currentUser
                } : r
            ));
            closeRejectDialog();
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reject report');
        } finally {
            setReportLoading(selectedReport.id, false);
        }
    };

    const handleOpenReturnDialog = (report) => {
        setSelectedReport(report);
        setReturnEmployeeId('');
        setReturnReason('');
        setReturnType('creator');
        setReturnDialogOpen(true);
    };

    const closeReturnDialog = () => {
        setReturnDialogOpen(false);
        setReturnEmployeeId('');
        setReturnReason('');
        setSelectedReport(null);
    };

    const handleConfirmReturn = async () => {
        if (!returnReason.trim()) {
            setError('Return reason is required');
            return;
        }

        if (!selectedReport) {
            setError('No report selected');
            return;
        }

        let targetEmployeeId = returnEmployeeId;
        if (returnType === 'creator') {
            targetEmployeeId = selectedReport.createdByEmployeeId;
        }

        if (!targetEmployeeId?.trim()) {
            setError('Target employee ID is required');
            return;
        }

        setReportLoading(selectedReport.id, true);
        try {
            await ReportApi.returnReport(selectedReport.id, targetEmployeeId, returnReason);
            setReports(prev => prev.map(r =>
                r.id === selectedReport.id ? {
                    ...r,
                    status: 'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER',
                    returnReason,
                    returnedAt: new Date().toISOString(),
                    returnedBy: currentUser,
                    returnedToEmployeeId: targetEmployeeId
                } : r
            ));
            closeReturnDialog();
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to return report');
        } finally {
            setReportLoading(selectedReport.id, false);
        }
    };

    const handleOpenInfoDialog = (report) => {
        setSelectedReport(report);
        setInfoDialogOpen(true);
    };

    const closeInfoDialog = () => {
        setInfoDialogOpen(false);
        setSelectedReport(null);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE': return 'success';
            case 'REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE': return 'error';
            case 'REPORT_RETURNED_ASSISTANT_COMMISSIONER': return 'warning';
            case 'REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE': return 'info';
            default: return 'default';
        }
    };

    const getStatusText = (status) => {
        const statusMap = {
            'REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE': 'Approved by Director Intelligence',
            'REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE': 'Rejected by Director',
            'REPORT_RETURNED_ASSISTANT_COMMISSIONER': 'Returned to Assistant Commissioner',
            'REPORT_RETURNED_INTELLIGENCE_OFFICER': 'Returned to intelligent officer',
            'REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE': 'Submitted to Director intelligence',
            'REPORT_SUBMITTED': 'Submitted'
        };
        return statusMap[status] || status.replace(/_/g, ' ').toLowerCase();
    };

    const isActionDisabled = (report) => {
        const disabledStatuses = [
            'REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE',
            'REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE',
            'REPORT_RETURNED_ASSISTANT_COMMISSIONER'
        ];
        return disabledStatuses.includes(report.status) || actionLoadingReports.has(report.id);
    };

    const isReportLoading = (reportId) => {
        return actionLoadingReports.has(reportId);
    };

    // ✅ Filter, sort and paginate reports
    const filteredAndSortedReports = useMemo(() => {
        let results = reports;

        // Apply search filter
        if (searchQuery) {
            const searchString = searchQuery.toLowerCase();
            results = results.filter((report) => {
                const id = report.id?.toString().toLowerCase() || '';
                const caseNum = report.relatedCase?.caseNum?.toLowerCase() || '';
                const createdBy = report.createdBy?.toLowerCase() || '';
                const createdByEmployeeId = report.createdByEmployeeId?.toLowerCase() || '';

                return id.includes(searchString) ||
                    caseNum.includes(searchString) ||
                    createdBy.includes(searchString) ||
                    createdByEmployeeId.includes(searchString);
            });
        }

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
    }, [reports, searchQuery, sortOrder]);

    // ✅ Get current page reports for display
    const currentPageReports = useMemo(() => {
        const startIndex = page * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        return filteredAndSortedReports.slice(startIndex, endIndex);
    }, [filteredAndSortedReports, page, rowsPerPage]);

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
        } catch (error) {
            return '-';
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress size={50} />
            </Box>
        );
    }

    return (
        <Box padding={2}>
            <Typography variant="h4" gutterBottom>
                Director of Intelligence - Report Management
            </Typography>

            {error && (
                <Box mb={2}>
                    <Alert severity="error" onClose={() => setError(null)}>
                        {error}
                    </Alert>
                </Box>
            )}

            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box display="flex" gap={1} alignItems="center">
                    <TextField
                        size="small"
                        variant="outlined"
                        placeholder="Search by ID, Case Number, or Creator"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: <Search fontSize="small" style={{ marginRight: 8 }} />
                        }}
                        sx={{ minWidth: 300 }}
                    />

                    {/* Sort by Date Button */}
                    <Tooltip title={`Sort by creation date (${sortOrder === 'desc' ? 'newest first' : 'oldest first'})`}>
                        <Button
                            variant="outlined"
                            onClick={handleSortByDate}
                            startIcon={sortOrder === 'desc' ? <ArrowDownward /> : <ArrowUpward />}
                        >
                            Date {sortOrder === 'desc' ? '↓' : '↑'}
                        </Button>
                    </Tooltip>

                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<ListAlt />}
                        onClick={() => navigate('/director-intelligence/case-reports')}
                        sx={{ ml: 1 }}
                    >
                        Case Reports
                    </Button>
                </Box>
                <Typography variant="body2" color="text.secondary">
                    {filteredAndSortedReports.length} report{filteredAndSortedReports.length !== 1 ? 's' : ''} found
                </Typography>
            </Box>

            <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Report ID</TableCell>
                            <TableCell>Case Number</TableCell>
                            <TableCell>Created By</TableCell>
                            <TableCell
                                sx={{
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
                            <TableCell align="center">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {currentPageReports.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    <Typography variant="body2" color="text.secondary">
                                        No reports found
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            currentPageReports.map((report) => (
                                <TableRow key={report.id}>
                                    <TableCell>{report.id}</TableCell>
                                    <TableCell>{report.relatedCase?.caseNum || '-'}</TableCell>
                                    <TableCell>{report.createdBy || '-'}</TableCell>
                                    <TableCell>
                                        {formatDate(report.createdAt)}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={getStatusText(report.status)}
                                            color={getStatusColor(report.status)}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Box display="flex" gap={0.5} justifyContent="center">
                                            <Tooltip title="View Details">
                                                <IconButton
                                                    onClick={() => navigate(`/view-report/${report.id}`)}
                                                    size="small"
                                                >
                                                    <Description fontSize="small" />
                                                </IconButton>
                                            </Tooltip>

                                            <Tooltip title="Approve">
                                                <span>
                                                    <IconButton
                                                        disabled={isActionDisabled(report)}
                                                        onClick={() => handleApprove(report)}
                                                        size="small"
                                                        color="success"
                                                    >
                                                        {isReportLoading(report.id) ? (
                                                            <CircularProgress size={16} />
                                                        ) : (
                                                            <Check fontSize="small" />
                                                        )}
                                                    </IconButton>
                                                </span>
                                            </Tooltip>

                                            <Tooltip title="Closed">
                                                <span>
                                                    <IconButton
                                                        disabled={isActionDisabled(report)}
                                                        onClick={() => handleOpenRejectDialog(report)}
                                                        size="small"
                                                        color="error"
                                                    >
                                                        <Close fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>

                                            <Tooltip title="Return">
                                                <span>
                                                    <IconButton
                                                        disabled={isActionDisabled(report)}
                                                        onClick={() => handleOpenReturnDialog(report)}
                                                        size="small"
                                                        color="warning"
                                                    >
                                                        <Reply fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))
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

            {/* Reject Dialog */}
            <Dialog open={rejectDialogOpen} onClose={closeRejectDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Reject Report</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Report ID: {selectedReport?.id}
                    </Typography>
                    <TextField
                        fullWidth
                        label="Rejection Reason"
                        multiline
                        rows={4}
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        margin="normal"
                        required
                        placeholder="Please provide a detailed reason for rejection..."
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeRejectDialog}>Cancel</Button>
                    <Button
                        onClick={handleConfirmReject}
                        color="error"
                        disabled={!rejectionReason.trim() || (selectedReport && isReportLoading(selectedReport.id))}
                    >
                        {selectedReport && isReportLoading(selectedReport.id) ? (
                            <CircularProgress size={20} />
                        ) : (
                            'Reject'
                        )}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Return Dialog */}
            <Dialog open={returnDialogOpen} onClose={closeReturnDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Return Report</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Report ID: {selectedReport?.id}
                    </Typography>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Return To</InputLabel>
                        <Select
                            value={returnType}
                            onChange={(e) => setReturnType(e.target.value)}
                            label="Return To"
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
                            label="Employee ID"
                            value={returnEmployeeId}
                            onChange={(e) => setReturnEmployeeId(e.target.value)}
                            margin="normal"
                            required
                            placeholder="Enter employee ID to return the report to"
                        />
                    )}

                    <TextField
                        fullWidth
                        label="Return Reason"
                        multiline
                        rows={4}
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        margin="normal"
                        required
                        placeholder="Please provide a reason for returning this report..."
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeReturnDialog}>Cancel</Button>
                    <Button
                        onClick={handleConfirmReturn}
                        color="warning"
                        disabled={!returnReason.trim() || (selectedReport && isReportLoading(selectedReport.id))}
                    >
                        {selectedReport && isReportLoading(selectedReport.id) ? (
                            <CircularProgress size={20} />
                        ) : (
                            'Return'
                        )}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Info Dialog */}
            <Dialog open={infoDialogOpen} onClose={closeInfoDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Report Information</DialogTitle>
                <DialogContent>
                    <Box sx={{ '& > *': { mb: 1 } }}>
                        <Typography variant="body2">
                            <strong>Report ID:</strong> {selectedReport?.id || '-'}
                        </Typography>
                        <Typography variant="body2">
                            <strong>Case Number:</strong> {selectedReport?.relatedCase?.caseNum || '-'}
                        </Typography>
                        <Typography variant="body2">
                            <strong>Created By:</strong> {selectedReport?.createdBy || '-'}
                        </Typography>
                        <Typography variant="body2">
                            <strong>Employee ID:</strong> {selectedReport?.createdByEmployeeId || '-'}
                        </Typography>
                        <Typography variant="body2">
                            <strong>Created Date:</strong> {selectedReport?.createdAt ? formatDate(selectedReport.createdAt) : '-'}
                        </Typography>
                        <Typography variant="body2">
                            <strong>Status:</strong> {selectedReport ? getStatusText(selectedReport.status) : '-'}
                        </Typography>
                        {selectedReport?.approvedBy && (
                            <Typography variant="body2">
                                <strong>Approved By:</strong> {selectedReport.approvedBy} on {formatDate(selectedReport.approvedAt)}
                            </Typography>
                        )}
                        {selectedReport?.rejectedBy && (
                            <Typography variant="body2">
                                <strong>Rejected By:</strong> {selectedReport.rejectedBy} on {formatDate(selectedReport.rejectedAt)}
                            </Typography>
                        )}
                        {selectedReport?.rejectionReason && (
                            <Typography variant="body2">
                                <strong>Rejection Reason:</strong> {selectedReport.rejectionReason}
                            </Typography>
                        )}
                        {selectedReport?.returnedBy && (
                            <Typography variant="body2">
                                <strong>Returned By:</strong> {selectedReport.returnedBy} on {formatDate(selectedReport.returnedAt)}
                            </Typography>
                        )}
                        {selectedReport?.returnReason && (
                            <Typography variant="body2">
                                <strong>Return Reason:</strong> {selectedReport.returnReason}
                            </Typography>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeInfoDialog}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default DirectorIntelligence;