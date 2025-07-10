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
    Snackbar
} from "@mui/material";
import { Search, Description, Check, Close } from "@mui/icons-material";
import { Link } from 'react-router-dom';
import { ReportApi } from '../api/Axios/caseApi';

const AssistantCommissioner = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [closeDialogOpen, setCloseDialogOpen] = useState(false);
    const [closeReason, setCloseReason] = useState("");
    const [selectedReport, setSelectedReport] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [actionLoading, setActionLoading] = useState({});
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const response = await ReportApi.getReportsForAssistantCommissioner();
                const approvedReports = response.data.filter(report =>
                    report.status === "REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE"
                );
                setReports(approvedReports);
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
            setError(err.response?.data?.message || 'Failed to approve report');
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
            setError(err.response?.data?.message || 'Failed to reject report');
            showSnackbar("Rejection failed.", "error");
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
        if (status.startsWith("REPORT_APPROVED")) return "Approved";
        if (status.startsWith("REPORT_REJECTED")) return "Rejected";
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
                                            report.status.includes("REJECTED") ? "red" : "#555",
                                        fontWeight: "bold"
                                    }}>
                                        {formatStatus(report.status)}
                                    </TableCell>
                                    <TableCell>
                                        <Box display="flex" gap={1}>
                                            <Link to={`/reports/${report.id}`}>
                                                <IconButton color="primary">
                                                    <Description />
                                                </IconButton>
                                            </Link>

                                            <IconButton
                                                color="success"
                                                onClick={() => handleApprove(report.id)}
                                                disabled={report.status === "REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER" || actionLoading[report.id]}
                                            >
                                                <Check />
                                            </IconButton>

                                            <IconButton
                                                color="error"
                                                onClick={() => handleReject(report)}
                                                disabled={report.status.includes("REJECTED") || actionLoading[report.id]}
                                            >
                                                <Close />
                                            </IconButton>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    No approved reports found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

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
