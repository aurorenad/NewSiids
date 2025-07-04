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
    FilterList as FilterListIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { CaseService, ReportApi } from '../api/Axios/caseApi';

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

    const navigate = useNavigate();

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

    const handleSendClick = (caseItem) => {
        console.log('Send button clicked for case:', caseItem);

        if (!caseItem.reportId) {
            showSnackbar('This case has no associated report', 'error');
            return;
        }
        setSelectedReport({
            caseId: caseItem.caseNum,
            reportId: caseItem.reportId,
            currentStatus: caseItem.status
        });
        setDialogOpen(true);
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

    const canSendReport = (caseItem) => {
        if (!caseItem.reportId) {
            return false;
        }

        const allowedStatuses = ['CASE_CREATED', 'REPORT_SUBMITTED'];
        return allowedStatuses.includes(caseItem.status);
    };

    const getButtonDisabledReason = (caseItem) => {
        if (!caseItem.reportId) return "No report created yet";
        if (!['CASE_CREATED', 'REPORT_SUBMITTED'].includes(caseItem.status)) {
            return `Cannot send - status is ${caseItem.status}`;
        }
        return "Send to Director";
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
                            <TableCell sx={{ fontWeight: 'bold' }}>Report ID</TableCell>
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
                                    </TableCell>
                                    <TableCell>{caseItem.tin || '-'}</TableCell>
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
                                            <Tooltip title={getButtonDisabledReason(caseItem)}>
                                                <span>
                                                    <IconButton
                                                        onClick={() => handleSendClick(caseItem)}
                                                        color="primary"
                                                        disabled={!canSendReport(caseItem)}
                                                    >
                                                        <SendIcon />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            <IconButton
                                                onClick={() => navigate(`/intelligence-officer/view-case/${caseItem.caseNum}`)}
                                                title="View Details"
                                            >
                                                <DescriptionIcon />
                                            </IconButton>
                                            <IconButton
                                                onClick={() => navigate(`/intelligence-officer/claim-form/${caseItem.caseNum}`)}
                                                title="Make report and Attachment"
                                            >
                                                <AttachFileIcon />
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