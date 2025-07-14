import React, { useState, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    TextField,
    IconButton,
    Button,
    Typography,
    Box,
    CircularProgress,
    Snackbar,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    MenuItem,
    Tooltip,
    Chip
} from "@mui/material";
import { Search, Description, Send, Check, ArrowBack } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { ReportApi } from "./../api/Axios/caseApi";

const InvestigationOfficer = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
    const [selectedReport, setSelectedReport] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [statusUpdate, setStatusUpdate] = useState("");
    const [notes, setNotes] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAssignedReports = async () => {
            try {
                setLoading(true);
                const response = await ReportApi.getAssignedReportsForInvestigationOfficer();
                const formattedReports = response.data.map(report => ({
                    id: report.id || '',
                    caseId: report.caseId || 'N/A',
                    status: report.status || 'Pending',
                    reportedDate: report.reportedDate || 'N/A',
                    notes: report.notes || '',
                    ...report
                }));
                setReports(formattedReports);
            } catch (err) {
                console.error("Error fetching assigned reports:", err);
                setError(err.message);
                setSnackbar({
                    open: true,
                    message: "Failed to fetch assigned reports",
                    severity: "error"
                });
            } finally {
                setLoading(false);
            }
        };

        fetchAssignedReports();
    }, []);

    const handleStatusUpdate = async () => {
        if (!selectedReport || !statusUpdate) return;

        try {
            await ReportApi.updateInvestigationStatus(
                selectedReport.id,
                statusUpdate,
                notes
            );

            setSnackbar({
                open: true,
                message: "Status updated successfully",
                severity: "success"
            });

            setReports(prev =>
                prev.map(report =>
                    report.id === selectedReport.id
                        ? { ...report, status: statusUpdate, notes }
                        : report
                )
            );

            handleCloseDialog();
        } catch (err) {
            console.error("Error updating status:", err);
            setSnackbar({
                open: true,
                message: "Failed to update status",
                severity: "error"
            });
        }
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setStatusUpdate("");
        setNotes("");
    };

    const filteredReports = reports.filter(report => {
        const searchTerm = searchQuery.toLowerCase();
        return (
            (report.caseId?.toString().toLowerCase() || '').includes(searchTerm) ||
            (report.status?.toString().toLowerCase() || '').includes(searchTerm)
        );
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'Investigation Completed': return 'success';
            case 'Investigation In Progress': return 'warning';
            case 'Investigation On Hold': return 'error';
            default: return 'default';
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <Alert severity="error">Error loading reports: {error}</Alert>
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => window.location.reload()}
                    sx={{ ml: 2 }}
                >
                    Retry
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" gutterBottom>
                        Investigation Officer Dashboard
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary">
                        Assigned Cases
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TextField
                        label="Search cases"
                        variant="outlined"
                        size="small"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: <Search fontSize="small" />,
                        }}
                    />
                    <Chip
                        label={`${filteredReports.length} cases`}
                        color="primary"
                        variant="outlined"
                    />
                </Box>
            </Box>

            <TableContainer component={Paper} elevation={3}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: 'grey.100' }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>Case ID</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Reported Date</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredReports.length > 0 ? (
                            filteredReports.map((report) => (
                                <TableRow key={report.id}>
                                    <TableCell>{report.caseId}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={report.status}
                                            color={getStatusColor(report.status)}
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>{report.reportedDate}</TableCell>
                                    <TableCell>
                                        <Box display="flex" gap={1}>
                                            <Tooltip title="View Report">
                                                <IconButton
                                                    onClick={() => navigate(`/reports/${report.id}`)}
                                                    color="primary"
                                                >
                                                    <Description />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Update Status">
                                                <IconButton
                                                    color="secondary"
                                                    onClick={() => {
                                                        setSelectedReport(report);
                                                        setStatusUpdate(report.status || "");
                                                        setNotes(report.notes || "");
                                                        setDialogOpen(true);
                                                    }}
                                                >
                                                    <Send />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Mark as Completed">
                                                <IconButton
                                                    color="success"
                                                    onClick={() => {
                                                        setSelectedReport(report);
                                                        setStatusUpdate("Investigation Completed");
                                                        setNotes(report.notes || "");
                                                        setDialogOpen(true);
                                                    }}
                                                >
                                                    <Check />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} align="center">
                                    No assigned cases found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Status Update Dialog */}
            <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="sm">
                <DialogTitle>
                    Update Investigation Status
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ my: 2 }}>
                        <Typography variant="subtitle1">Case ID: {selectedReport?.caseId || 'N/A'}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Current Status: {selectedReport?.status || 'N/A'}
                        </Typography>
                    </Box>
                    <TextField
                        select
                        fullWidth
                        label="New Status"
                        value={statusUpdate}
                        onChange={(e) => setStatusUpdate(e.target.value)}
                        sx={{ mb: 2 }}
                    >
                        <MenuItem value="Investigation In Progress">Investigation In Progress</MenuItem>
                        <MenuItem value="Investigation Completed">Investigation Completed</MenuItem>
                        <MenuItem value="Investigation On Hold">Investigation On Hold</MenuItem>
                    </TextField>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Investigation Notes"
                        placeholder="Enter detailed investigation notes..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button
                        onClick={handleStatusUpdate}
                        variant="contained"
                        color="primary"
                        disabled={!statusUpdate}
                    >
                        Update Status
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default InvestigationOfficer;