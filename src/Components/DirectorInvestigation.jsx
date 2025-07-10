import React, { useState, useEffect } from 'react';
import {
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    CircularProgress,
    Snackbar,
    Alert
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { Check, Close, Description, Search } from "@mui/icons-material";
import { ReportApi } from './../api/Axios/caseApi';// try

const DirectorInvestigation = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const navigate = useNavigate();
    const [closeDialogOpen, setCloseDialogOpen] = useState(false);
    const [selectedCase, setSelectedCase] = useState(null);
    const [reasonInput, setReasonInput] = useState('');

    useEffect(() => {
        const fetchApprovedReports = async () => {
            try {
                setLoading(true);
                const response = await ReportApi.getReportsForDirectorInvestigation();

                // Map API response to your frontend structure
                const mappedCases = response.data.map(report => ({
                    id: report.relatedCase?.caseNum || `CS${report.id}`,
                    delegate: report.currentRecipient?.employeeId || '',
                    reportedDate: new Date(report.createdAt).toLocaleDateString(),
                    status: report.status || 'Approved by Assistant Commissioner',
                    reason: report.rejectionReason || '',
                    reportId: report.id // Store the report ID for API calls
                }));

                setCases(mappedCases);
            } catch (err) {
                setError(err.message);
                setSnackbar({
                    open: true,
                    message: err.response?.data?.message || 'Failed to fetch reports',
                    severity: 'error'
                });
            } finally {
                setLoading(false);
            }
        };

        fetchApprovedReports();
    }, []);

    const handleApprove = async (reportId) => {
        try {
            await ReportApi.approveReport(reportId);

            // Update local state
            setCases(cases.map(c =>
                c.reportId === reportId ? {
                    ...c,
                    status: 'Approved by Director of Investigation',
                    reason: ''
                } : c
            ));

            setSnackbar({
                open: true,
                message: 'Report approved successfully',
                severity: 'success'
            });
        } catch (err) {
            setSnackbar({
                open: true,
                message: err.response?.data?.message || 'Failed to approve report',
                severity: 'error'
            });
        }
    };

    const handleReject = async () => {
        if (!selectedCase || !reasonInput.trim()) return;

        try {
            await ReportApi.rejectReport(selectedCase.reportId, reasonInput);

            // Update local state
            setCases(cases.map(c =>
                c.reportId === selectedCase.reportId ? {
                    ...c,
                    status: 'Rejected by Director of Investigation',
                    reason: reasonInput
                } : c
            ));

            setCloseDialogOpen(false);
            setSnackbar({
                open: true,
                message: 'Report rejected successfully',
                severity: 'success'
            });
        } catch (err) {
            setSnackbar({
                open: true,
                message: err.response?.data?.message || 'Failed to reject report',
                severity: 'error'
            });
        }
    };

    const handleOpenRejectDialog = (caseItem) => {
        setSelectedCase(caseItem);
        setReasonInput('');
        setCloseDialogOpen(true);
    };

    const filteredCases = cases.filter(
        (item) =>
            item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.delegate.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="page-container" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                    <TextField
                        size="small"
                        placeholder="Search"
                        variant="outlined"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <IconButton>
                        <Search />
                    </IconButton>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                    <CircularProgress />
                </div>
            ) : error ? (
                <Alert severity="error">{error}</Alert>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow style={{ backgroundColor: "#cfd8dc" }}>
                                <TableCell>Case Id</TableCell>
                                <TableCell>Delegate</TableCell>
                                <TableCell>Reported Date</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredCases.map((caseItem) => (
                                <TableRow key={caseItem.id}>
                                    <TableCell>{caseItem.id}</TableCell>
                                    <TableCell>
                                        <TextField
                                            size="small"
                                            value={caseItem.delegate}
                                            onChange={(e) => {
                                                const updatedCases = cases.map(c =>
                                                    c.id === caseItem.id ? { ...c, delegate: e.target.value } : c
                                                );
                                                setCases(updatedCases);
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>{caseItem.reportedDate}</TableCell>
                                    <TableCell style={{
                                        color: caseItem.status.includes("Approved") ? "green" :
                                            caseItem.status.includes("Rejected") ? "red" : "#555",
                                        fontWeight: "bold"
                                    }}>
                                        {caseItem.status}
                                        {caseItem.reason && ` - ${caseItem.reason}`}
                                    </TableCell>
                                    <TableCell>
                                        <Link to={`/report/${caseItem.reportId}`}>
                                            <IconButton color="primary">
                                                <Description />
                                            </IconButton>
                                        </Link>
                                        <IconButton
                                            color="success"
                                            onClick={() => handleApprove(caseItem.reportId)}
                                            disabled={caseItem.status.includes("Approved") || caseItem.status.includes("Rejected")}
                                        >
                                            <Check />
                                        </IconButton>
                                        <IconButton
                                            color="error"
                                            onClick={() => handleOpenRejectDialog(caseItem)}
                                            disabled={caseItem.status.includes("Approved") || caseItem.status.includes("Rejected")}
                                        >
                                            <Close />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Dialog for rejecting a report */}
            <Dialog open={closeDialogOpen} onClose={() => setCloseDialogOpen(false)}>
                <DialogTitle>Reason for Rejection</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        value={reasonInput}
                        onChange={(e) => setReasonInput(e.target.value)}
                        placeholder="Enter reason for rejection..."
                        variant="outlined"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCloseDialogOpen(false)} color="secondary">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleReject}
                        variant="contained"
                        color="primary"
                        disabled={!reasonInput.trim()}
                    >
                        Confirm Rejection
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </div>
    );
};

export default DirectorInvestigation;