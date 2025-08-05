// src/components/T3OfficersReports.jsx
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
    IconButton
} from "@mui/material";
import { ArrowBack, Search } from "@mui/icons-material";
import { ReportApi } from "./../api/Axios/caseApi";
import { useNavigate } from "react-router-dom";

const T3OfficersReports = () => {
    const [officersReports, setOfficersReports] = useState([]);
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
                const response = await ReportApi.getReportsByT3Officers();
                setOfficersReports(response.data);
            } catch (err) {
                console.error("Error fetching T3 officers reports:", err);
                setError(err.message);
                setSnackbar({
                    open: true,
                    message: "Failed to fetch T3 officers reports",
                    severity: "error"
                });
            } finally {
                setLoading(false);
            }
        };

        fetchReports();
    }, []);

    const filteredReports = officersReports.filter(officer => {
        const searchTerm = searchQuery.toLowerCase();
        return (
            officer.officerName.toLowerCase().includes(searchTerm) ||
            officer.officerId.toLowerCase().includes(searchTerm) ||
            officer.reports.some(report =>
                report.caseNum.toLowerCase().includes(searchTerm))
        );
    });

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    const formatCurrency = (amount) => {
        return amount ? `$${amount.toFixed(2)}` : '$0.00';
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
                        Reports created by investigation officers
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TextField
                        label="Search officers or cases"
                        variant="outlined"
                        size="small"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: <Search fontSize="small" />,
                        }}
                    />
                    <Chip
                        label={`${filteredReports.length} officers`}
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

            {filteredReports.length > 0 ? (
                filteredReports.map((officer) => (
                    <Box key={officer.officerId} sx={{ mb: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" sx={{ mr: 2 }}>
                                {officer.officerName}
                            </Typography>
                            <Chip
                                label={`ID: ${officer.officerId}`}
                                size="small"
                                variant="outlined"
                                sx={{ mr: 2 }}
                            />
                            <Chip
                                label={`${officer.reports.length} reports`}
                                color="primary"
                                size="small"
                            />
                        </Box>

                        <TableContainer component={Paper} elevation={2} sx={{ mb: 3 }}>
                            <Table size="small">
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
                                    {officer.reports.map((report) => (
                                        <TableRow key={report.id}>
                                            <TableCell>{report.caseNum}</TableCell>
                                            <TableCell>{formatDate(report.createdAt)}</TableCell>
                                            <TableCell>{formatCurrency(report.principleAmount)}</TableCell>
                                            <TableCell>{formatCurrency(report.penaltiesAmount)}</TableCell>
                                            <TableCell>
                                                {formatCurrency(
                                                    (report.principleAmount || 0) +
                                                    (report.penaltiesAmount || 0)
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={report.status}
                                                    color={
                                                        report.status === 'INVESTIGATION_COMPLETED'
                                                            ? 'success'
                                                            : 'default'
                                                    }
                                                    size="small"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                ))
            ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1">
                        No reports found for T3 investigation officers
                    </Typography>
                </Box>
            )}

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