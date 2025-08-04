import React, { useState, useEffect } from 'react';
import { ReportApi } from './../api/Axios/caseApi';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
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
import { Download as DownloadIcon, Refresh as RefreshIcon } from '@mui/icons-material';

const FinesReport = () => {
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pdfLoading, setPdfLoading] = useState(false);
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

    const downloadPdfReport = async () => {
        try {
            setPdfLoading(true);
            const response = await ReportApi.getFinesReportPdfForAssistantCommissioner();

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `fines-report-${new Date().toISOString().split('T')[0]}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            showSnackbar('PDF report downloaded successfully');
        } catch (error) {
            showSnackbar(`Failed to download PDF report: ${error.message}`, 'error');
        } finally {
            setPdfLoading(false);
        }
    };

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
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Report ID</TableCell>
                                <TableCell>Case Number</TableCell>
                                <TableCell>Principle Amount</TableCell>
                                <TableCell>Penalties Amount</TableCell>
                                <TableCell>Total</TableCell>
                                <TableCell>Created At</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {reportData?.reportsWithFines?.map((report) => (
                                <TableRow key={report.id}>
                                    <TableCell>{report.id}</TableCell>
                                    <TableCell>{report.relatedCase?.caseNum || 'N/A'}</TableCell>
                                    <TableCell>${report.principleAmount?.toFixed(2) || '0.00'}</TableCell>
                                    <TableCell>${report.penaltiesAmount?.toFixed(2) || '0.00'}</TableCell>
                                    <TableCell>
                                        ${((report.principleAmount || 0) + (report.penaltiesAmount || 0)).toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                        {new Date(report.createdAt).toLocaleDateString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            {/* Reports without Fines Table */}
            <Card sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Reports without Fines
                </Typography>
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Report ID</TableCell>
                                <TableCell>Case Number</TableCell>
                                <TableCell>Principle Amount</TableCell>
                                <TableCell>Penalties Amount</TableCell>
                                <TableCell>Total</TableCell>
                                <TableCell>Created At</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {reportData?.reportsWithoutFines?.map((report) => (
                                <TableRow key={report.id}>
                                    <TableCell>{report.id}</TableCell>
                                    <TableCell>{report.relatedCase?.caseNum || 'N/A'}</TableCell>
                                    <TableCell>${report.principleAmount?.toFixed(2) || '0.00'}</TableCell>
                                    <TableCell>${report.penaltiesAmount?.toFixed(2) || '0.00'}</TableCell>
                                    <TableCell>
                                        ${((report.principleAmount || 0) + (report.penaltiesAmount || 0)).toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                        {new Date(report.createdAt).toLocaleDateString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>
        </Box>
    );
};

export default FinesReport;