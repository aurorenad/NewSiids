import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Paper,
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    Alert,
    Chip,
    Tooltip
} from '@mui/material';
import {
    Add as AddIcon,
    Description as DescriptionIcon,
    Search as SearchIcon,
    Send as SendIcon,
    AttachFile as AttachFileIcon,
    FilterList as FilterListIcon,
    PictureAsPdf,
    NavigateBefore,
    NavigateNext
} from '@mui/icons-material';
import { Document, Page } from 'react-pdf';
import { useNavigate, useLocation } from 'react-router-dom';
import { CaseService, ReportApi } from '../api/Axios/caseApi';
// import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
// import 'react-pdf/dist/esm/Page/TextLayer.css';

const IntelligenceOfficer = () => {
    const [cases, setCases] = useState([]);
    const [filteredCases, setFilteredCases] = useState([]);
    const [loading, setLoading] = useState({
        cases: true,
        directors: false
    });
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedReport, setSelectedReport] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'info'
    });
    const [showOnlyWithReports, setShowOnlyWithReports] = useState(false);
    const [reportDialogOpen, setReportDialogOpen] = useState(false);
    const [currentReport, setCurrentReport] = useState(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [pdfLoading, setPdfLoading] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [casesResponse] = await Promise.all([
                    CaseService.getMyCases()
                ]);

                console.log('Fetched cases:', casesResponse.data);
                setCases(casesResponse.data);
                setFilteredCases(casesResponse.data);
            } catch (err) {
                console.error('Failed to load data:', err);
                setError(err.response?.data?.message || 'Failed to load data');
                showSnackbar('Failed to load data', 'error');
            } finally {
                setLoading(prev => ({ ...prev, cases: false }));
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        if (location.state?.newReport) {
            const { newReport, caseNum } = location.state;
            setCases(prevCases =>
                prevCases.map(c =>
                    c.caseNum === caseNum
                        ? { ...c, reportId: newReport.id }
                        : c
                )
            );
            showSnackbar(`Report ${newReport.id} created successfully`, 'success');
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, navigate, location.pathname]);

    useEffect(() => {
        let results = cases;
        if (searchTerm) {
            results = results.filter(caseItem =>
                Object.values(caseItem).some(
                    value => value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
                )
            );
        }
        if (showOnlyWithReports) {
            results = results.filter(caseItem => caseItem.reportId);
        }
        setFilteredCases(results);
    }, [searchTerm, cases, showOnlyWithReports]);


    const showSnackbar = (message, severity) => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    const confirmSendReport = async () => {
        if (!selectedReport) {
            showSnackbar('No report selected', 'error');
            return;
        }

        try {
            console.log('Attempting to send report:', selectedReport.reportId);
            await ReportApi.sendToDirectorIntelligence(selectedReport.reportId);

            setCases(prevCases =>
                prevCases.map(c =>
                    c.caseNum === selectedReport.caseId
                        ? { ...c, status: 'REPORT_SUBMITTED_TO_DIRECTOR_OF_INTELLIGENCE' }
                        : c
                )
            );

            showSnackbar('Report successfully sent to Director of Intelligence', 'success');
        } catch (err) {
            console.error('Failed to send report:', err);
            console.log('Error details:', err.response);
            showSnackbar(err.response?.data?.message || 'Failed to send report', 'error');
        } finally {
            setDialogOpen(false);
            setSelectedReport(null);
        }
    };

    const handleViewReport = async (caseItem) => {
        try {
            if (!caseItem.reportId) {
                showSnackbar('No report available for this case', 'warning');
                return;
            }

            setReportLoading(true);
            const response = await ReportApi.getReport(caseItem.reportId);
            setCurrentReport(response.data);
            setReportDialogOpen(true);
        } catch (error) {
            console.error('Error fetching report:', error);
            showSnackbar(error.response?.data?.message || 'Failed to load report', 'error');
        } finally {
            setReportLoading(false);
        }
    };

    const handleViewPdf = async (reportId) => {
        try {
            setPdfLoading(true);
            const response = await ReportApi.downloadAttachment(reportId);
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
            setReportDialogOpen(true);
        } catch (error) {
            console.error('Error loading PDF:', error);
            showSnackbar(error.response?.data?.message || 'Failed to load PDF', 'error');
        } finally {
            setPdfLoading(false);
        }
    };

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
        setPageNumber(1);
    };

    const handlePreviousPage = () => {
        setPageNumber(prev => Math.max(prev - 1, 1));
    };

    const handleNextPage = () => {
        setPageNumber(prev => Math.min(prev + 1, numPages));
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'CASE_CREATED': return '#1976d2';
            case 'REPORT_SUBMITTED': return '#ff9800';
            case 'REPORT_SUBMITTED_TO_DIRECTOR_OF_INTELLIGENCE': return '#4caf50';
            case 'REJECTED': return '#d32f2f';
            case 'APPROVED': return '#2e7d32';
            default: return '#757575';
        }
    };

    if (loading.cases) {
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
        <Box p={3}>
            <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={3}
            >
                <Box display="flex" alignItems="center" width="50%" gap={2}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Search cases..."
                        variant="outlined"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <IconButton edge="start">
                                    <SearchIcon />
                                </IconButton>
                            ),
                        }}
                    />
                    <Tooltip title={showOnlyWithReports ? "Show all cases" : "Show only cases with reports"}>
                        <Button
                            variant={showOnlyWithReports ? "contained" : "outlined"}
                            onClick={() => setShowOnlyWithReports(!showOnlyWithReports)}
                            startIcon={<FilterListIcon />}
                            color={showOnlyWithReports ? "primary" : "inherit"}
                        >
                            {showOnlyWithReports ? "All Cases" : "With Reports"}
                        </Button>
                    </Tooltip>
                </Box>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/intelligence-officer/newCase')}
                >
                    New Case
                </Button>
            </Box>

            <TableContainer component={Paper} elevation={3}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: 'grey.100' }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>Case ID</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>TIN</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Tax Period</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredCases.length > 0 ? (
                            filteredCases.map((caseItem) => (
                                <TableRow
                                    key={caseItem.caseNum}
                                    hover
                                    sx={{
                                        backgroundColor: caseItem.reportId ? '#f0f9ff' : 'inherit'
                                    }}
                                >
                                    <TableCell>{caseItem.caseNum}</TableCell>
                                    <TableCell>{caseItem.taxPayer?.tin || '-'}</TableCell>
                                    <TableCell>{caseItem.taxPeriod || '-'}</TableCell>
                                    <TableCell>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: getStatusColor(caseItem.status),
                                                fontWeight: 'medium'
                                            }}
                                        >
                                            {caseItem.status}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            {caseItem.reportId ? (
                                                <>
                                                    <Chip
                                                        label={caseItem.reportId}
                                                        size="small"
                                                        color="primary"
                                                        variant="outlined"
                                                    />
                                                    <IconButton
                                                        onClick={() => navigate(`/reports/${encodeURIComponent(caseItem.caseNum)}`)}
                                                        title="View Report"
                                                    >
                                                        <DescriptionIcon />
                                                    </IconButton>
                                                </>
                                            ) : (
                                                <Button
                                                    variant="outlined"
                                                    startIcon={<AddIcon />}
                                                    onClick={() => navigate(`/intelligence-officer/claim-form/${encodeURIComponent(caseItem.caseNum)}`)}
                                                    disabled={loading.reports}
                                                >
                                                    Create Report
                                                </Button>
                                            )}
                                        </Box>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Tooltip title="View Report PDF">
                                                <span>
                                                    <IconButton
                                                        onClick={() => handleViewPdf(caseItem.reportId)}
                                                        disabled={!caseItem.reportId || pdfLoading}
                                                    >
                                                        {pdfLoading ? <CircularProgress size={24} /> : <PictureAsPdf />}
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            <IconButton
                                                onClick={() => navigate(`/intelligence-officer/view-case/${caseItem.caseNum}`)}
                                                title="View Details"
                                            >
                                                <DescriptionIcon />
                                            </IconButton>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    No cases found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Confirmation Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
                <DialogTitle>Confirm Report Submission</DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 2 }}>
                        Are you sure you want to send report <strong>{selectedReport?.reportId}</strong> to the Director of Intelligence?
                    </Typography>
                    <Alert severity="info" sx={{ mt: 2 }}>
                        This report will be forwarded to the Director of Intelligence for review and approval.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setDialogOpen(false);
                            setSelectedReport(null);
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={confirmSendReport}
                        variant="contained"
                        color="primary"
                        startIcon={<SendIcon />}
                        disabled={!selectedReport}
                    >
                        Send to Director
                    </Button>
                </DialogActions>
            </Dialog>

            {/* PDF Viewer Dialog */}
            <Dialog
                open={reportDialogOpen}
                onClose={() => {
                    setReportDialogOpen(false);
                    if (pdfUrl) {
                        URL.revokeObjectURL(pdfUrl);
                        setPdfUrl(null);
                    }
                }}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Report PDF Viewer</DialogTitle>
                <DialogContent>
                    {pdfUrl ? (
                        <Box sx={{ mt: 2 }}>
                            <Document
                                file={pdfUrl}
                                onLoadSuccess={onDocumentLoadSuccess}
                                loading={<CircularProgress />}
                            >
                                <Page pageNumber={pageNumber} />
                            </Document>
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 2 }}>
                                <IconButton
                                    onClick={handlePreviousPage}
                                    disabled={pageNumber <= 1}
                                >
                                    <NavigateBefore />
                                </IconButton>
                                <Typography variant="body2" sx={{ mx: 2 }}>
                                    Page {pageNumber} of {numPages || '--'}
                                </Typography>
                                <IconButton
                                    onClick={handleNextPage}
                                    disabled={pageNumber >= (numPages || 1)}
                                >
                                    <NavigateNext />
                                </IconButton>
                            </Box>
                        </Box>
                    ) : (
                        <Box display="flex" justifyContent="center" py={4}>
                            <CircularProgress />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setReportDialogOpen(false);
                        if (pdfUrl) {
                            URL.revokeObjectURL(pdfUrl);
                            setPdfUrl(null);
                        }
                    }}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Report Details Dialog */}
            {currentReport && (
                <Dialog
                    open={!!currentReport && !pdfUrl}
                    onClose={() => setCurrentReport(null)}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle>Report Details</DialogTitle>
                    <DialogContent>
                        <Box>
                            <Typography variant="h6" gutterBottom>
                                Case ID: {currentReport.relatedCase.caseNum}
                            </Typography>
                            <Typography variant="subtitle1" gutterBottom>
                                Status: {currentReport.relatedCase.status}
                            </Typography>
                            <Typography variant="body1" paragraph sx={{ mt: 2 }}>
                                {currentReport.description || 'No description available'}
                            </Typography>

                            {currentReport.attachmentPath && (
                                <Box sx={{ mt: 3 }}>
                                    <Typography variant="subtitle2">Attachment:</Typography>
                                    <Button
                                        variant="outlined"
                                        startIcon={<PictureAsPdf />}
                                        onClick={() => handleViewPdf(currentReport.id)}
                                        sx={{ mt: 1 }}
                                    >
                                        View PDF
                                    </Button>
                                </Box>
                            )}

                            {currentReport.findings && (
                                <Box sx={{ mt: 3 }}>
                                    <Typography variant="subtitle2">Findings:</Typography>
                                    <Typography variant="body1" paragraph>
                                        {currentReport.findings}
                                    </Typography>
                                </Box>
                            )}

                            {currentReport.recommendations && (
                                <Box sx={{ mt: 3 }}>
                                    <Typography variant="subtitle2">Recommendations:</Typography>
                                    <Typography variant="body1" paragraph>
                                        {currentReport.recommendations}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setCurrentReport(null)}>Close</Button>
                    </DialogActions>
                </Dialog>
            )}

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default IntelligenceOfficer;