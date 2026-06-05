import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReportApi } from './../api/Axios/caseApi';
import {
    Card,
    CircularProgress,
    Typography,
    Button,
    Box,
    Grid,
    Paper,
    Snackbar,
    Alert
} from '@mui/material';
import { Refresh as RefreshIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import AppTable from './ui/AppTable.jsx';

const ROWS_PER_PAGE = 10;

const FinesReport = () => {
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [withFinesPage, setWithFinesPage] = useState(0);
    const [withoutFinesPage, setWithoutFinesPage] = useState(0);
    const navigate = useNavigate();
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success'
    });

    useEffect(() => {
        fetchFinesReport();
    }, []);

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbar({ ...snackbar, open: false });
    };

    const showSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    const fetchFinesReport = async () => {
        try {
            setLoading(true);
            const response = await ReportApi.getFinesReportForAssistantCommissioner();
            setReportData(response.data);
        } catch (error) {
            showSnackbar(`Failed to fetch fines report: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => `${(amount || 0).toFixed(2)}`;

    const formatDate = (value) => {
        if (!value) return '-';
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
    };

    const reportColumns = useMemo(() => [
        { key: 'id', label: 'Report ID', render: (report) => report.id },
        { key: 'caseNum', label: 'Case Number', render: (report) => report.relatedCase?.caseNum || 'N/A' },
        { key: 'principleAmount', label: 'Principle Amount (FRW)', render: (report) => formatCurrency(report.principleAmount) },
        { key: 'penaltiesAmount', label: 'Penalties Amount (FRW)', render: (report) => formatCurrency(report.penaltiesAmount) },
        {
            key: 'total',
            label: 'Total (FRW)',
            render: (report) => formatCurrency((report.principleAmount || 0) + (report.penaltiesAmount || 0))
        },
        { key: 'createdAt', label: 'Created At', render: (report) => formatDate(report.createdAt) }
    ], []);

    const reportsWithFines = reportData?.reportsWithFines || [];
    const reportsWithoutFines = reportData?.reportsWithoutFines || [];
    const pagedReportsWithFines = reportsWithFines.slice(
        withFinesPage * ROWS_PER_PAGE,
        withFinesPage * ROWS_PER_PAGE + ROWS_PER_PAGE
    );
    const pagedReportsWithoutFines = reportsWithoutFines.slice(
        withoutFinesPage * ROWS_PER_PAGE,
        withoutFinesPage * ROWS_PER_PAGE + ROWS_PER_PAGE
    );

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>

            {/* Summary Card */}
            <Card sx={{ p: 3, mb: 3 }}>
                <Typography variant="h5" gutterBottom>
                    Fines Report Summary
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                    {/*<Button*/}
                    {/*    variant="contained"*/}
                    {/*    startIcon={<DownloadIcon />}*/}
                    {/*    onClick={downloadPdfReport}*/}
                    {/*    disabled={pdfLoading}*/}
                    {/*>*/}
                    {/*    {pdfLoading ? 'Exporting...' : 'Export as PDF'}*/}
                    {/*</Button>*/}
                    <Button
                        variant="outlined"
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate(-1)}
                    >
                        Go Back
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={fetchFinesReport}
                    >
                        Refresh Data
                    </Button>
                </Box>

                {reportData && (
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="subtitle2">Reports with Fines:</Typography>
                                <Typography variant="h6">{reportData.reportsWithFinesCount}</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="subtitle2">Reports without Fines:</Typography>
                                <Typography variant="h6">{reportData.reportsWithoutFinesCount}</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="subtitle2">Total Principle:</Typography>
                                <Typography variant="h6">
                                    ${reportData.totalPrincipleAmount?.toFixed(2)}
                                </Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="subtitle2">Total Penalties:</Typography>
                                <Typography variant="h6">
                                    ${reportData.totalPenaltiesAmount?.toFixed(2)}
                                </Typography>
                            </Paper>
                        </Grid>
                    </Grid>
                )}
            </Card>

            {/* Reports with Fines Table */}
            <Card sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Reports with Fines
                </Typography>
                <AppTable
                    columns={reportColumns}
                    rows={pagedReportsWithFines}
                    loading={loading}
                    emptyMessage="No reports with fines found"
                    page={withFinesPage}
                    rowsPerPage={ROWS_PER_PAGE}
                    totalRows={reportsWithFines.length}
                    onPageChange={(event, nextPage) => setWithFinesPage(nextPage)}
                    minWidth={900}
                />
            </Card>

            {/* Reports without Fines Table */}
            <Card sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Reports without Fines
                </Typography>
                <AppTable
                    columns={reportColumns}
                    rows={pagedReportsWithoutFines}
                    loading={loading}
                    emptyMessage="No reports without fines found"
                    page={withoutFinesPage}
                    rowsPerPage={ROWS_PER_PAGE}
                    totalRows={reportsWithoutFines.length}
                    onPageChange={(event, nextPage) => setWithoutFinesPage(nextPage)}
                    minWidth={900}
                />
            </Card>
        </Box>
    );
};

export default FinesReport;
