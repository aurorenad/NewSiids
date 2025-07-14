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
    MenuItem
} from "@mui/material";
import { Search, Description, Send, Check } from "@mui/icons-material";
import { Link } from "react-router-dom";
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
                <Typography color="error">Error loading reports: {error}</Typography>
            </Box>
        );
    }

    return (
        <div style={{ padding: "20px" }}>
            <Typography variant="h4" gutterBottom>
                Investigation Officer Dashboard
            </Typography>
            <Typography variant="subtitle1" gutterBottom>
                Assigned Cases
            </Typography>

            {/* Search Bar */}
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
                    Assigned Cases: {filteredReports.length}
                </Typography>
            </Box>

            {/* Reports Table */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow style={{ backgroundColor: "#f5f5f5" }}>
                            <TableCell><strong>Case ID</strong></TableCell>
                            <TableCell><strong>Status</strong></TableCell>
                            <TableCell><strong>Reported Date</strong></TableCell>
                            <TableCell><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredReports.length > 0 ? (
                            filteredReports.map((report) => (
                                <TableRow key={report.id}>
                                    <TableCell>{report.caseId}</TableCell>
                                    <TableCell>
                                        <Typography
                                            sx={{
                                                color: report.status.includes("Completed") ? "green" :
                                                    report.status.includes("Rejected") ? "red" : "#555",
                                                fontWeight: "bold"
                                            }}
                                        >
                                            {report.status}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{report.reportedDate}</TableCell>
                                    <TableCell>
                                        <Box display="flex" gap={1}>
                                            <Link to={`/report/${report.id}`}>
                                                <IconButton color="primary" size="small">
                                                    <Description />
                                                </IconButton>
                                            </Link>
                                            <IconButton
                                                color="secondary"
                                                size="small"
                                                onClick={() => {
                                                    setSelectedReport(report);
                                                    setStatusUpdate(report.status || "");
                                                    setNotes(report.notes || "");
                                                    setDialogOpen(true);
                                                }}
                                            >
                                                <Send />
                                            </IconButton>
                                            <IconButton
                                                color="success"
                                                size="small"
                                                onClick={() => {
                                                    setSelectedReport(report);
                                                    setStatusUpdate("Investigation Completed");
                                                    setNotes(report.notes || "");
                                                    setDialogOpen(true);
                                                }}
                                            >
                                                <Check />
                                            </IconButton>
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
            <Dialog open={dialogOpen} onClose={handleCloseDialog}>
                <DialogTitle>
                    Update Case Status: {selectedReport?.caseId || 'N/A'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2, mb: 3 }}>
                        <Typography variant="body1" gutterBottom>
                            Current Status: <strong>{selectedReport?.status || 'N/A'}</strong>
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
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </div>
    );
};

export default InvestigationOfficer;
