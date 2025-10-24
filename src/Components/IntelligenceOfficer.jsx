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
    TablePagination,
    TextField,
    Typography,
    Alert,
    Tooltip
} from '@mui/material';
import {
    Add as AddIcon,
    Description as DescriptionIcon,
    Search as SearchIcon,
    Send as SendIcon,
    FilterList as FilterListIcon,
    PictureAsPdf,
    NavigateBefore,
    NavigateNext,
    Edit as EditIcon,
    ArrowUpward,
    ArrowDownward
} from '@mui/icons-material';
import { Document, Page } from 'react-pdf';
import { useNavigate, useLocation } from 'react-router-dom';
import { CaseService, ReportApi } from '../api/Axios/caseApi';

const IntelligenceOfficer = () => {
    const [cases, setCases] = useState([]);
    const [filteredCases, setFilteredCases] = useState([]);
    const [loading, setLoading] = useState({ cases: true, directors: false });
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
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingReport, setEditingReport] = useState(null);
    const [reportFormData, setReportFormData] = useState({
        returnReason: '',
        description: '',
        relatedCase: { caseNum: '' }
    });

    // ✅ Pagination state
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // ✅ Sorting state - using createdAt field
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [casesResponse] = await Promise.all([CaseService.getMyCases()]);
                setCases(casesResponse.data);
                setFilteredCases(casesResponse.data);
            } catch (err) {
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
        let results = [...cases];

        // Apply search filter
        if (searchTerm) {
            results = results.filter(caseItem =>
                Object.values(caseItem).some(
                    value => value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
                )
            );
        }

        // Apply report filter
        if (showOnlyWithReports) {
            results = results.filter(caseItem => caseItem.reportId);
        }

        // Apply sorting by createdAt field
        results.sort((a, b) => {
            const dateA = new Date(a.createdAt);
            const dateB = new Date(b.createdAt);

            if (sortOrder === 'desc') {
                return dateB - dateA; // newest first
            } else {
                return dateA - dateB; // oldest first
            }
        });

        setFilteredCases(results);
        setPage(0); // reset pagination on filter/search/sort change
    }, [searchTerm, cases, showOnlyWithReports, sortOrder]);

    const showSnackbar = (message, severity) => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    // ✅ Sort handler
    const handleSortByDate = () => {
        const newSortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
        setSortOrder(newSortOrder);
        setSortBy('createdAt');
    };

    const confirmSendReport = async () => {
        if (!selectedReport) {
            showSnackbar('No report selected', 'error');
            return;
        }

        try {
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
            showSnackbar(err.response?.data?.message || 'Failed to send report', 'error');
        } finally {
            setDialogOpen(false);
            setSelectedReport(null);
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
            showSnackbar(error.response?.data?.message || 'Failed to load PDF', 'error');
        } finally {
            setPdfLoading(false);
        }
    };

    const handleEditReturnedReport = (caseItem) => {
        if (!caseItem.reportId) return;

        setReportLoading(true);
        ReportApi.getReport(caseItem.reportId)
            .then(response => {
                setEditingReport(response.data);
                setReportFormData({
                    description: response.data.description,
                    relatedCase: { caseNum: response.data.relatedCase.caseNum }
                });
                setEditDialogOpen(true);
            })
            .catch(error => {
                showSnackbar(error.response?.data?.message || 'Failed to load report', 'error');
            })
            .finally(() => setReportLoading(false));
    };

    const handleUpdateReturnedReport = async () => {
        if (!editingReport) return;

        try {
            await ReportApi.updateReturnedReport(editingReport.id, reportFormData);

            setCases(prevCases =>
                prevCases.map(c =>
                    c.caseNum === editingReport.relatedCase.caseNum
                        ? {
                            ...c,
                            status: 'REPORT_SUBMITTED',
                            reportId: editingReport.id
                        }
                        : c
                )
            );

            showSnackbar('Report updated and resubmitted successfully', 'success');
            setEditDialogOpen(false);
            setEditingReport(null);
        } catch (error) {
            showSnackbar(error.response?.data?.message || 'Failed to update report', 'error');
        }
    };

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
        setPageNumber(1);
    };

    const handlePreviousPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
    const handleNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages));

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'CASE_CREATED': return '#1976d2';
            case 'REPORT_SUBMITTED': return '#ff9800';
            case 'REPORT_SUBMITTED_TO_DIRECTOR_OF_INTELLIGENCE': return '#4caf50';
            case 'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER': return '#f44336';
            case 'REJECTED': return '#d32f2f';
            case 'APPROVED': return '#2e7d32';
            case 'REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER': return '#2e7d32';
            default: return '#757575';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return '-';
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
            {/* Top Bar */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
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

                    {/* Sort by Date Button */}
                    <Tooltip title={`Sort by creation date (${sortOrder === 'desc' ? 'newest first' : 'oldest first'})`}>
                        <Button
                            variant="outlined"
                            onClick={handleSortByDate}
                            startIcon={sortOrder === 'desc' ? <ArrowDownward /> : <ArrowUpward />}
                        >
                            Created Date {sortOrder === 'desc' ? '↓' : '↑'}
                        </Button>
                    </Tooltip>

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

            {/* Table */}
            <TableContainer component={Paper} elevation={3}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: 'grey.100' }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>Case ID</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Report ID</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>TIN</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Tax Period</TableCell>
                            <TableCell
                                sx={{
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    '&:hover': { backgroundColor: 'grey.200' }
                                }}
                                onClick={handleSortByDate}
                            >
                                <Box display="flex" alignItems="center" gap={1}>
                                    Created Date
                                    {sortOrder === 'desc' ? <ArrowDownward fontSize="small" /> : <ArrowUpward fontSize="small" />}
                                </Box>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredCases.length > 0 ? (
                            filteredCases
                                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                .map((caseItem) => (
                                    <TableRow
                                        key={caseItem.caseNum}
                                        hover
                                        sx={{ backgroundColor: caseItem.reportId ? '#f0f9ff' : 'inherit' }}
                                    >
                                        <TableCell>{caseItem.caseNum}</TableCell>
                                        <TableCell>{caseItem.reportId || '-'}</TableCell>
                                        <TableCell>{caseItem.taxPayer?.tin || '-'}</TableCell>
                                        <TableCell>{caseItem.taxPeriod || '-'}</TableCell>
                                        <TableCell>
                                            {formatDate(caseItem.createdAt)}
                                        </TableCell>
                                        <TableCell>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: getStatusColor(caseItem.status), fontWeight: 'medium' }}
                                            >
                                                {caseItem.status}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                {caseItem.reportId ? (
                                                    caseItem.status === 'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER' && (
                                                        <Button
                                                            variant="contained"
                                                            color="warning"
                                                            startIcon={<EditIcon />}
                                                            onClick={() => handleEditReturnedReport(caseItem)}
                                                            disabled={reportLoading}
                                                        >
                                                            Update
                                                        </Button>
                                                    )
                                                ) : (
                                                    <Button
                                                        variant="outlined"
                                                        startIcon={<AddIcon />}
                                                        onClick={() => navigate(`/intelligence-officer/claim-form/${encodeURIComponent(caseItem.caseNum)}`)}
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
                                <TableCell colSpan={7} align="center">
                                    No cases found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                {/* ✅ Pagination */}
                <TablePagination
                    component="div"
                    count={filteredCases.length}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                />
            </TableContainer>

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