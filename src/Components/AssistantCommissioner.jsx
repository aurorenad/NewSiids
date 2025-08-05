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
    Tooltip
} from "@mui/material";
import { Search, Description, Check, Close, Undo, Visibility, Article } from "@mui/icons-material";
import { useNavigate, Link } from 'react-router-dom';
import { ReportApi } from '../api/Axios/caseApi';

const AssistantCommissioner = () => {
    const [reports, setReports] = useState([]);
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
    const navigate = useNavigate();

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const response = await ReportApi.getReportsForAssistantCommissioner();
                const mappedReports = response.data.map(report => ({
                    ...report,
                    hasFindings: report.findings || report.recommendations ||
                        (report.findingsAttachmentPaths && report.findingsAttachmentPaths.length > 0)
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

    const showSnackbar = (message, severity = "success") => {
        setSnackbar({ open: true, message, severity });
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
            showSnackbar("Approval failed.", "error");
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
            showSnackbar("Rejection failed.", "error");
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

    const filteredReports = reports.filter(report => {
        const searchLower = searchQuery.toLowerCase();
        return (
            report.id.toString().includes(searchLower) ||
            (report.relatedCase?.caseNum?.toLowerCase().includes(searchLower)) ||
            (report.createdBy?.toLowerCase().includes(searchLower))
        );
    });

    const formatStatus = (status) => {
        const statusMap = {
            "REPORT_SUBMITTED_TO_ASSISTANT_COMMISSIONER": "Submitted for Review",
            "REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE": "Approved by Director",
            "REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER": "Approved",
            "REPORT_REJECTED_BY_ASSISTANT_COMMISSIONER": "Rejected",
            "REPORT_RETURNED_TO_DIRECTOR_INTELLIGENCE": "Returned",
            "REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION": "Approved by Investigation Director",
            "REPORT_REJECTED_BY_DIRECTOR_INVESTIGATION": "Rejected by Investigation Director"
        };

        if (statusMap[status]) {
            return statusMap[status];
        }

        // Fallback for any unexpected statuses
        return status.replace(/_/g, ' ').toLowerCase();
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
            <Box display="flex" justifyContent="space-between" mb={2}>
                <TextField
                    size="small"
                    placeholder="Search reports..."
                    variant="outlined"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') e.preventDefault();
                    }}
                />
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Article />}
                    onClick={() => navigate('/assistant-commissioner/fines-report')}
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
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredReports.length > 0 ? (
                            filteredReports.map((report) => (
                                <TableRow key={report.id}>
                                    <TableCell>{report.id}</TableCell>
                                    <TableCell>{report.relatedCase?.caseNum || 'N/A'}</TableCell>
                                    <TableCell>{report.createdBy}</TableCell>
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
                                                        to={{
                                                            pathname: `/reports/${report.id}/findings`,
                                                            state: { employeeId: localStorage.getItem('employeeId') || sessionStorage.getItem('employeeId') }
                                                        }}
                                                    >
                                                        <Visibility />
                                                    </IconButton>
                                                </Tooltip>
                                            )}

                                            {report.status === "REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE" && (
                                                <>
                                                    <IconButton
                                                        color="success"
                                                        onClick={() => handleApprove(report.id)}
                                                        disabled={report.status === "REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER" || actionLoading[report.id]}
                                                    >
                                                        <Check />
                                                    </IconButton>

                                                    <IconButton
                                                        color="warning"
                                                        onClick={() => handleOpenReturnDialog(report)}
                                                        disabled={actionLoading[report.id]}
                                                    >
                                                        <Undo />
                                                    </IconButton>

                                                    <IconButton
                                                        color="error"
                                                        onClick={() => handleReject(report)}
                                                        disabled={report.status.includes("REJECTED") || actionLoading[report.id]}
                                                    >
                                                        <Close />
                                                    </IconButton>
                                                </>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    No reports found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

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
                        Confirm Return
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
                        Confirm Rejection
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