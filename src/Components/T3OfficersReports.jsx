import React, { useState, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    Box,
    CircularProgress,
    Snackbar,
    Alert,
    Button,
    Chip,
    TextField,
    Tooltip
} from "@mui/material";
import { ArrowBack, Search } from "@mui/icons-material";
import { ReportApi } from "./../api/Axios/caseApi";
import { useNavigate } from "react-router-dom";

const T3OfficersReports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: "",
        severity: "success"
    });
    const [searchQuery, setSearchQuery] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const fetchReports = async () => {
            try {
                setLoading(true);
                const response = await ReportApi.getReportsAssignedToInvestigationOfficers();
                setReports(response.data);
            } catch (err) {
                if (err.response?.status === 403) {
                    setError("You don't have permission to view these reports");
                } else {
                    setError(err.message);
                }
                setSnackbar({
                    open: true,
                    message: "Failed to fetch reports",
                    severity: "error"
                });
            } finally {
                setLoading(false);
            }
        };

        fetchReports();
    }, []);

    const filteredReports = reports.filter(report => {
        const searchTerm = searchQuery.toLowerCase();
        return (
            report.investigationOfficer?.givenName?.toLowerCase().includes(searchTerm) ||
            report.investigationOfficer?.familyName?.toLowerCase().includes(searchTerm) ||
            report.relatedCase?.caseNum?.toLowerCase().includes(searchTerm) ||
            report.status?.toLowerCase().includes(searchTerm)
        );
    });

    const formatDate = (dateString) => {
        return dateString ? new Date(dateString).toLocaleDateString() : 'N/A';
    };

    const formatCurrency = (amount) => {
        return amount ? `$${amount.toFixed(2)}` : '$0.00';
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'INVESTIGATION_COMPLETED': return 'success';
            case 'REPORT_ASSIGNED_TO_INVESTIGATION_OFFICER':
            case 'INVESTIGATION_IN_PROGRESS': return 'warning';
            case 'INVESTIGATION_ON_HOLD': return 'error';
            default: return 'default';
        }
    };

    const formatStatus = (status) => {
        if (!status) return 'Unknown';
        return status
            .split('_')
            .map(word => word.charAt(0) + word.slice(1).toLowerCase())
            .join(' ');
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
                        T3 Officers Reports
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary">
                        All reports assigned to investigation officers
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TextField
                        label="Search reports"
                        variant="outlined"
                        size="small"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: <Search fontSize="small" />,
                        }}
                    />
                    <Chip
                        label={`${filteredReports.length} reports`}
                        color="primary"
                        variant="outlined"
                    />
                    <Button
                        variant="outlined"
                        startIcon={<ArrowBack />}
                        onClick={() => navigate(-1)}
                    >
                        Back to Dashboard
                    </Button>
                </Box>
            </Box>

            {searchQuery && filteredReports.length === 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    No reports match your search.
                </Alert>
            )}

            <TableContainer component={Paper} elevation={3}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: 'grey.100' }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>Case ID</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Report Date</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Principle</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Penalties</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredReports.length > 0 ? (
                            filteredReports.map((report) => (
                                <TableRow key={report.id}>
                                    <TableCell>
                                        <Tooltip title={report.relatedCase?.caseNum || 'N/A'}>
                                            <span>{report.relatedCase?.caseNum || 'N/A'}</span>
                                        </Tooltip>
                                    </TableCell>

                                    <TableCell>{formatDate(report.createdAt)}</TableCell>
                                    <TableCell>{formatCurrency(report.principleAmount)}</TableCell>
                                    <TableCell>{formatCurrency(report.penaltiesAmount)}</TableCell>
                                    <TableCell>
                                        {formatCurrency(
                                            (report.principleAmount || 0) + (report.penaltiesAmount || 0)
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={formatStatus(report.status)}
                                            color={getStatusColor(report.status)}
                                            size="small"
                                        />
                                    </TableCell>

                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
                                    No reports found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

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

export default T3OfficersReports;
