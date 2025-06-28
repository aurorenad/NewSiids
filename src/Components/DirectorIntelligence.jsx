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

    const navigate = useNavigate();

    const [closeDialogOpen, setCloseDialogOpen] = useState(false);
    const [selectedReportIndex, setSelectedReportIndex] = useState(null);
    const [reasonInput, setReasonInput] = useState('');

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
            await ReportApi.sendToAssistantCommissioner(report.id);

            setReports(prev => prev.map((r, i) =>
                i === index ? { ...r, status: 'REPORT_SUBMITTED_TO_ASSISTANT_COMMISSIONER' } : r
            ));

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

    const handleOpenCloseDialog = (index) => {
        setSelectedReportIndex(index);
        setReasonInput('');
        setCloseDialogOpen(true);
    };

    const handleConfirmClose = async () => {
        setActionLoading(true);
        try {
            const report = reports[selectedReportIndex];
            await ReportApi.returnReport(report.id, report.createdBy.employeeId);

            setReports(prev => prev.map((r, i) =>
                i === selectedReportIndex ? {
                    ...r,
                    status: 'REPORT_RETURNED',
                    reason: reasonInput
                } : r
            ));

            setCloseDialogOpen(false);
        } catch (err) {
            console.error('Failed to close report:', err);
            setError(err.response?.data?.message || 'Failed to close report');
        } finally {
            setActionLoading(false);
        }
    };

    const searchString = searchQuery.toLowerCase();
    const filteredReports = reports.filter((report) => {
        const id = report.id?.toString().toLowerCase() || '';
        const caseNum = report.relatedCase?.caseNum?.toLowerCase() || '';
        const givenName = report.createdBy?.givenName?.toLowerCase() || '';
        const familyName = report.createdBy?.familyName?.toLowerCase() || '';
        return id.includes(searchString) || caseNum.includes(searchString) || givenName.includes(searchString) || familyName.includes(searchString);
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
                                        {report.createdBy?.givenName} {report.createdBy?.familyName}
                                    </TableCell>
                                    <TableCell style={{
                                        color: report.status === "REPORT_SUBMITTED_TO_ASSISTANT_COMMISSIONER" ? "green" :
                                            report.status === "REPORT_RETURNED" ? "red" : "#555",
                                        fontWeight: "bold"
                                    }}>
                                        {report.status === "REPORT_RETURNED" && report.reason
                                            ? `${report.status} - ${report.reason}`
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
                                                disabled={report.status === "REPORT_SUBMITTED_TO_ASSISTANT_COMMISSIONER" || actionLoading}
                                            >
                                                <Check />
                                            </IconButton>

                                            <IconButton
                                                color="error"
                                                onClick={() => handleOpenCloseDialog(index)}
                                                disabled={report.status === "REPORT_RETURNED" || actionLoading}
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

            {/* Close Reason Dialog */}
            <Dialog open={closeDialogOpen} onClose={() => setCloseDialogOpen(false)}>
                <DialogTitle>Reason for Returning Report</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        value={reasonInput}
                        onChange={(e) => setReasonInput(e.target.value)}
                        placeholder="Enter reason for returning..."
                        variant="outlined"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCloseDialogOpen(false)} color="secondary">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmClose}
                        variant="contained"
                        color="primary"
                        disabled={!reasonInput.trim() || actionLoading}
                    >
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default DirectorIntelligence;
