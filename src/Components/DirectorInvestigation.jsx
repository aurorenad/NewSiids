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
    Alert,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Typography,
    Box
} from "@mui/material";
import { Link } from "react-router-dom";
import { Check, Close, Description, Search } from "@mui/icons-material";
import { ReportApi, InvestigationApi } from './../api/Axios/caseApi';

const DirectorInvestigation = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [cases, setCases] = useState([]);
    const [officers, setOfficers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [officersLoading, setOfficersLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [selectedCase, setSelectedCase] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [reportsResponse, officersResponse] = await Promise.all([
                    ReportApi.getReportsForDirectorInvestigation(),
                    InvestigationApi.getAvailableOfficers()
                ]);

                const mappedCases = reportsResponse.data.map(report => ({
                    id: report.relatedCase?.caseNum || `CS${report.id}`,
                    delegate: report.assignedOfficer?.employeeId || '',
                    delegateName: report.assignedOfficer ?
                        `${report.assignedOfficer.givenName} ${report.assignedOfficer.familyName}` : '',
                    reportedDate: new Date(report.createdAt).toLocaleDateString(),
                    status: report.status || 'Approved by Assistant Commissioner',
                    reason: report.rejectionReason || '',
                    reportId: report.id,
                    caseId: report.relatedCase?._id,
                    isAssigned: !!report.assignedOfficer
                }));

                const mappedOfficers = officersResponse.data.map(officer => ({
                    _id: officer.employeeId,
                    name: `${officer.givenName} ${officer.familyName}`,
                    email: officer.email || '',
                    ...officer
                }));

                setCases(mappedCases);
                setOfficers(mappedOfficers);
            } catch (err) {
                console.error('Error:', err);
                setSnackbar({
                    open: true,
                    message: err.response?.data?.message || 'Failed to load data',
                    severity: 'error'
                });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleAssignOfficer = async (reportId, officerId) => {
        if (!officerId) {
            setSnackbar({
                open: true,
                message: 'Please select an officer first',
                severity: 'warning'
            });
            return;
        }

        try {
            setOfficersLoading(true);
            await ReportApi.assignToInvestigationOfficer(reportId, officerId);

            const assignedOfficer = officers.find(o => o._id === officerId);
            setCases(prevCases => prevCases.map(c =>
                c.reportId === reportId ? {
                    ...c,
                    delegate: officerId,
                    delegateName: assignedOfficer?.name || '',
                    isAssigned: true,
                    status: 'Assigned to Officer'
                } : c
            ));

            setSnackbar({
                open: true,
                message: 'Officer assigned successfully',
                severity: 'success'
            });
        } catch (err) {
            console.error('Error:', err);
            setSnackbar({
                open: true,
                message: err.response?.data?.message || 'Failed to assign officer',
                severity: 'error'
            });
        } finally {
            setOfficersLoading(false);
        }
    };

    const handleApprove = async (reportId) => {
        try {
            setOfficersLoading(true);
            await ReportApi.approveReport(reportId);

            setCases(prevCases => prevCases.map(c =>
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
            console.error('Error:', err);
            setSnackbar({
                open: true,
                message: err.response?.data?.message || 'Failed to approve report',
                severity: 'error'
            });
        } finally {
            setOfficersLoading(false);
        }
    };

    const handleReject = async () => {
        if (!selectedCase) return;

        try {
            await ReportApi.rejectReport(selectedCase.reportId, rejectionReason);

            setCases(prevCases => prevCases.map(c =>
                c.reportId === selectedCase.reportId ? {
                    ...c,
                    status: 'Rejected by Director of Investigation',
                    reason: rejectionReason
                } : c
            ));

            setSnackbar({
                open: true,
                message: 'Report rejected successfully',
                severity: 'success'
            });
            setRejectDialogOpen(false);
        } catch (err) {
            console.error('Error:', err);
            setSnackbar({
                open: true,
                message: err.response?.data?.message || 'Failed to reject report',
                severity: 'error'
            });
        }
    };

    const filteredCases = cases.filter(caseItem =>
        caseItem.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        caseItem.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
        caseItem.delegateName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <div style={{ padding: "20px" }}>
            <Typography variant="h4" gutterBottom>
                Director of Investigation - Case Management
            </Typography>

            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <TextField
                    label="Search cases"
                    variant="outlined"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: <Search />,
                    }}
                    sx={{ minWidth: 300 }}
                />
                <Typography variant="body2" color="text.secondary">
                    Total Cases: {filteredCases.length}
                </Typography>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow style={{ backgroundColor: "#f5f5f5" }}>
                            <TableCell><strong>Case ID</strong></TableCell>
                            <TableCell><strong>Assign Officer</strong></TableCell>
                            <TableCell><strong>Current Officer</strong></TableCell>
                            <TableCell><strong>Reported Date</strong></TableCell>
                            <TableCell><strong>Status</strong></TableCell>
                            <TableCell><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredCases.map((caseItem) => (
                            <TableRow key={caseItem.id}>
                                <TableCell>{caseItem.id}</TableCell>
                                <TableCell>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Select Officer</InputLabel>
                                        <Select
                                            value={caseItem.delegate}
                                            onChange={(e) => {
                                                setCases(prev => prev.map(c =>
                                                    c.reportId === caseItem.reportId ? {
                                                        ...c,
                                                        delegate: e.target.value
                                                    } : c
                                                ));
                                            }}
                                            disabled={caseItem.status.includes("Approved") || caseItem.status.includes("Rejected")}
                                        >
                                            <MenuItem value=""><em>None</em></MenuItem>
                                            {officers.map((officer) => (
                                                <MenuItem key={officer._id} value={officer._id}>
                                                    {officer.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </TableCell>
                                <TableCell>
                                    {caseItem.isAssigned ? (
                                        <Typography color="success.main">{caseItem.delegateName}</Typography>
                                    ) : (
                                        <Typography color="text.secondary">Not Assigned</Typography>
                                    )}
                                </TableCell>
                                <TableCell>{caseItem.reportedDate}</TableCell>
                                <TableCell>
                                    <Typography
                                        sx={{
                                            color: caseItem.status.includes("Approved") ? "green" :
                                                caseItem.status.includes("Rejected") ? "red" : "inherit",
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        {caseItem.status}
                                    </Typography>
                                    {caseItem.reason && (
                                        <Typography variant="caption" color="error">
                                            Reason: {caseItem.reason}
                                        </Typography>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Box display="flex" gap={1}>
                                        <Link to={`/report/${caseItem.reportId}`}>
                                            <IconButton color="primary" size="small">
                                                <Description />
                                            </IconButton>
                                        </Link>
                                        <IconButton
                                            color="success"
                                            size="small"
                                            onClick={() => handleApprove(caseItem.reportId)}
                                            disabled={caseItem.status.includes("Approved") || caseItem.status.includes("Rejected")}
                                        >
                                            <Check />
                                        </IconButton>
                                        <IconButton
                                            color="secondary"
                                            size="small"
                                            onClick={() => handleAssignOfficer(caseItem.reportId, caseItem.delegate)}
                                            disabled={!caseItem.delegate || caseItem.status.includes("Approved") || caseItem.status.includes("Rejected")}
                                        >
                                            Assign
                                        </IconButton>
                                        <IconButton
                                            color="error"
                                            size="small"
                                            onClick={() => {
                                                setSelectedCase(caseItem);
                                                setRejectDialogOpen(true);
                                            }}
                                            disabled={caseItem.status.includes("Approved") || caseItem.status.includes("Rejected")}
                                        >
                                            <Close />
                                        </IconButton>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)}>
                <DialogTitle>Reject Report</DialogTitle>
                <DialogContent>
                    <Typography gutterBottom>Case ID: {selectedCase?.id}</Typography>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Rejection Reason"
                        fullWidth
                        multiline
                        rows={4}
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleReject}
                        color="error"
                        disabled={!rejectionReason.trim()}
                    >
                        Reject
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({...snackbar, open: false})}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar({...snackbar, open: false})}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </div>
    );
};

export default DirectorInvestigation;