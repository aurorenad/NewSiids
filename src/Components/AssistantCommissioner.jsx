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
    TablePagination
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
    ForwardToInbox,
    Gavel as GavelIcon,
    ArrowUpward,
    ArrowDownward
} from "@mui/icons-material";

import { useNavigate, Link } from 'react-router-dom';
import { ReportApi } from '../api/Axios/caseApi';

const AssistantCommissioner = () => {
    const [reports, setReports] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [returnDialogOpen, setReturnDialogOpen] = useState(false);
    const [returnReason, setReturnReason] = useState('');
    const [loading, setLoading] = useState(true);
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

    // ✅ Sorting state
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'

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
                    // Ensure we have a createdAt field for sorting
                    createdAt: report.createdAt || report.createdDate || report.dateCreated || new Date().toISOString()
                }));
                setReports(mappedReports);
            } catch (err) {
                console.error('Failed to fetch reports:', err);
                setError(err.response?.data?.message || 'Failed to fetch reports');
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, []);

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

    // ✅ Sort handler
    const handleSortByDate = () => {
        const newSortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
        setSortOrder(newSortOrder);
        setSortBy('createdAt');
    };

    // ✅ Filter and sort reports
    const filteredAndSortedReports = React.useMemo(() => {
        let results = reports.filter(report => {
            const searchLower = searchQuery.toLowerCase();
            return (
                report.id.toString().includes(searchLower) ||
                (report.relatedCase?.caseNum?.toLowerCase().includes(searchLower)) ||
                (report.createdBy?.toLowerCase().includes(searchLower))
            );
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
    }, [reports, searchQuery, sortOrder]);

    // ✅ Pagination handlers
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleApprove = async (reportId) => {
        setActionLoading(prev => ({ ...prev, [reportId]: true }));
        try {
            await ReportApi.approveReport(reportId);
            setReports(prev => prev.map(r =>
                r.id === reportId ? { ...r, status: "REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER" } : r
            ));
            showSnackbar("Report approved successfully.");
        } catch (err) {
            console.error('Failed to approve report:', err);
            showSnackbar(err.response?.data?.message || "Approval failed.", "error");
        } finally {
            setActionLoading(prev => ({ ...prev, [reportId]: false }));
        }
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
        setReturnReason('');
    };

    const handleConfirmReturn = async () => {
        if (!returnReason.trim()) {
            showSnackbar("Return reason is required", "error");
            return;
        }

        try {
            setActionLoading(prev => ({ ...prev, [selectedReport.id]: true }));
            await ReportApi.returnReport(
                selectedReport.id,
                selectedReport.createdByEmployeeId,
                returnReason
            );

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
        } catch (err) {
            console.error('Failed to fetch fines report:', err);
            showSnackbar("Failed to load fines report", "error");
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
            "REPORT_SUBMITTED_TO_ASSISTANT_COMMISSIONER": "Submitted for Review",
            "REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE": "Approved by Director",
            "REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER": "Approved",
            "REPORT_REJECTED_BY_ASSISTANT_COMMISSIONER": "Rejected",
            "REPORT_RETURNED_TO_DIRECTOR_INTELLIGENCE": "Returned",
            "REPORT_SENT_TO_LEGAL_SERVICES_AND_BOARD_AFFAIRS": "Sent to Legal Services",
            "REPORT_SENT_TO_CUSTOMS_SERVICES": "Sent to Customs",
            "REPORT_SENT_TO_FINANCE": "Sent to Finance",
            "REPORT_SENT_TO_STRATEGIC_AND_RISK_ANALYSIS": "Sent to Strategic and Risk Analysis",
            "REPORT_SENT_TO_INTERNAL_AUDIT_AND_INTEGRITY": "Sent to Internal Audit",
            "REPORT_SENT_TO_IT_AND_DIGITAL_TRANSFORMATION": "Sent to IT",
            "REPORT_SENT_TO_LEGAL_TEAM": "Sent to Legal Advisor",
        };
        return statusMap[status] || status.replace(/_/g, ' ').toLowerCase();
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
        } catch (error) {
            return '-';
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
        <div style={{ padding: "20px" }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} gap={2}>
                <Box display="flex" alignItems="center" gap={2} flex={1}>
                    <TextField
                        size="small"
                        placeholder="Search reports..."
                        variant="outlined"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
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
                </Box>

                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Article />}
                    onClick={handleViewFinesReport}
                >
                    View Fines Report
                </Button>
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
                                                        <Tooltip title="Approve">
                                                            <IconButton
                                                                color="success"
                                                                onClick={() => handleApprove(report.id)}
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

                                                        <Tooltip title="Send to Department">
                                                            <IconButton
                                                                color="secondary"
                                                                onClick={(e) => handleMenuOpen(e, report)}
                                                            >
                                                                <Send />
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
                                <TableCell colSpan={6} align="center">
                                    No reports found
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

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
            >
                {departments.length > 0 ? (
                    departments.map(dept => (
                        <MenuItem
                            key={dept.id || dept.structureId || dept.departmentId}
                            onClick={() => handleSendToDepartment(
                                dept.name || dept.structureName || dept.departmentName
                            )}
                        >
                            {dept.name || dept.structureName || dept.departmentName}
                        </MenuItem>
                    ))
                ) : (
                    <MenuItem disabled>No departments available</MenuItem>
                )}
            </Menu>

            <Dialog open={returnDialogOpen} onClose={handleCloseReturnDialog}>
                <DialogTitle>Return Report to Director of Intelligence</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        placeholder="Enter reason for returning this report..."
                        variant="outlined"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseReturnDialog} color="secondary">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmReturn}
                        variant="contained"
                        color="warning"
                        disabled={!returnReason.trim() || actionLoading[selectedReport?.id]}
                    >
                        {actionLoading[selectedReport?.id] ? <CircularProgress size={24} /> : "Confirm Return"}
                    </Button>
                </DialogActions>
            </Dialog>

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