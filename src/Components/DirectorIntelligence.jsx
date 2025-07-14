import React, { useState, useEffect } from 'react';
import {
    Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, CircularProgress, Alert, Box
} from "@mui/material";
import { Description, Check, Close, Search } from "@mui/icons-material";
import { Link, useNavigate } from 'react-router-dom';
import { ReportApi } from '../api/Axios/caseApi';

const DirectorIntelligence = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Dialog states
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [selectedReportIndex, setSelectedReportIndex] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');

    const navigate = useNavigate();

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const response = await ReportApi.getReportsForDirectorIntelligence();
                setReports(response.data);
            } catch (err) {
                console.error('Failed to fetch reports:', err);
                setError(err.response?.data?.message || 'Failed to fetch reports');
            } finally {
                setLoading(false);
            }
        };

        fetchReports();
    }, []);

    const handleApprove = async (index) => {
        setActionLoading(true);
        try {
            const report = reports[index];
            await ReportApi.approveReport(report.id);

            setReports(prev => prev.map((r, i) =>
                i === index ? { ...r, status: 'REPORT_APPROVED' } : r
            ));

            // Optional: navigate after approval
            setTimeout(() => {
                navigate('/assistant-commissioner');
            }, 3000);
        } catch (err) {
            console.error('Failed to approve report:', err);
            setError(err.response?.data?.message || 'Failed to approve report');
        } finally {
            setActionLoading(false);
        }
    };

    const handleOpenRejectDialog = (index) => {
        setSelectedReportIndex(index);
        setRejectionReason('');
        setRejectDialogOpen(true);
    };

    const handleConfirmReject = async () => {
        setActionLoading(true);
        try {
            const report = reports[selectedReportIndex];
            await ReportApi.rejectReport(report.id, rejectionReason);

            setReports(prev => prev.map((r, i) =>
                i === selectedReportIndex ? {
                    ...r,
                    status: 'REPORT_REJECTED',
                    rejectionReason: rejectionReason
                } : r
            ));

            setRejectDialogOpen(false);
        } catch (err) {
            console.error('Failed to reject report:', err);
            setError(err.response?.data?.message || 'Failed to reject report');
        } finally {
            setActionLoading(false);
        }
    };

    const searchString = searchQuery.toLowerCase();
    const filteredReports = reports.filter((report) => {
        const id = report.id?.toString().toLowerCase() || '';
        const caseNum = report.relatedCase?.caseNum?.toLowerCase() || '';
        const Name = report.createdBy?.toLowerCase() || '';
        return id.includes(searchString) || caseNum.includes(searchString) || Name.includes(searchString);
    });

    // Sort newest reports first (by ID descending)
    const sortedReports = [...filteredReports].sort((a, b) => b.id - a.id);

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
        <div className="page-container" style={{ padding: "20px" }}>
            <Box display="flex" justifyContent="space-between" mb={2}>
                <Box display="flex" alignItems="center">
                    <TextField
                        size="small"
                        placeholder="Search reports..."
                        variant="outlined"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <IconButton>
                        <Search />
                    </IconButton>
                </Box>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow style={{ backgroundColor: "#cfd8dc" }}>
                            <TableCell>Report ID</TableCell>
                            <TableCell>Case ID</TableCell>
                            <TableCell>Created By</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedReports.length > 0 ? (
                            sortedReports.map((report, index) => (
                                <TableRow key={report.id}>
                                    <TableCell>{report.id}</TableCell>
                                    <TableCell>{report.relatedCase?.caseNum || 'N/A'}</TableCell>
                                    <TableCell>
                                        {report.createdBy}
                                    </TableCell>
                                    <TableCell style={{
                                        color: report.status === "REPORT_APPROVED" ? "green" :
                                            report.status === "REPORT_REJECTED" ? "red" : "#555",
                                        fontWeight: "bold"
                                    }}>
                                        {report.status === "REPORT_REJECTED" && report.rejectionReason
                                            ? `REJECTED - ${report.rejectionReason}`
                                            : report.status}
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
                                                onClick={() => handleApprove(index)}
                                                disabled={
                                                    report.status === "REPORT_APPROVED" ||
                                                    report.status === "REPORT_REJECTED" ||
                                                    actionLoading
                                                }
                                            >
                                                <Check />
                                            </IconButton>

                                            <IconButton
                                                color="error"
                                                onClick={() => handleOpenRejectDialog(index)}
                                                disabled={
                                                    report.status === "REPORT_APPROVED" ||
                                                    report.status === "REPORT_REJECTED" ||
                                                    actionLoading
                                                }
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
                                    No reports found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Reject Dialog */}
            <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)}>
                <DialogTitle>Reject Report</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="rejectionReason"
                        label="Rejection Reason"
                        type="text"
                        fullWidth
                        variant="standard"
                        multiline
                        rows={4}
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Please provide a detailed reason for rejecting this report..."
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setRejectDialogOpen(false)}
                        color="secondary"
                        disabled={actionLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmReject}
                        color="error"
                        variant="contained"
                        disabled={!rejectionReason.trim() || actionLoading}
                    >
                        {actionLoading ? <CircularProgress size={24} /> : "Confirm Rejection"}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default DirectorIntelligence;