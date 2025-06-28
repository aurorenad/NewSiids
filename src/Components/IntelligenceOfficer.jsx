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
    MenuItem,
    Paper,
    Select,
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    Alert
} from '@mui/material';
import {
    Add as AddIcon,
    Description as DescriptionIcon,
    Search as SearchIcon,
    Send as SendIcon,
    AttachFile as AttachFileIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { CaseService, ReportApi } from '../api/Axios/caseApi';

const IntelligenceOfficer = () => {
    const [cases, setCases] = useState([]);
    const [filteredCases, setFilteredCases] = useState([]);
    const [directors, setDirectors] = useState([]);
    const [loading, setLoading] = useState({
        cases: true,
        directors: true
    });
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDirector, setSelectedDirector] = useState('');
    const [selectedReport, setSelectedReport] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'info'
    });

    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [casesResponse] = await Promise.all([
                    CaseService.getMyCases()
                ]);

                setCases(casesResponse.data);
                setFilteredCases(casesResponse.data);
            } catch (err) {
                console.error('Failed to load data:', err);
                setError(err.response?.data?.message || 'Failed to load data');
                showSnackbar('Failed to load data', 'error');
            } finally {
                setLoading({ cases: false, directors: false });
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        const results = cases.filter(caseItem =>
            Object.values(caseItem).some(
                value => value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
        setFilteredCases(results);
    }, [searchTerm, cases]);

    const showSnackbar = (message, severity) => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    const handleSendClick = (caseItem) => {
        if (!caseItem.reportId) {
            showSnackbar('This case has no associated report', 'error');
            return;
        }
        setSelectedReport({
            caseId: caseItem.caseNum,
            reportId: caseItem.reportId
        });
        setDialogOpen(true);
    };

    const confirmSendReport = async () => {
        try {
            await ReportApi.sendToDirectorIntelligence(selectedReport.reportId, selectedDirector);

            setCases(prevCases =>
                prevCases.map(c =>
                    c.caseNum === selectedReport.caseId
                        ? { ...c, status: 'CASE_SUBMITTED_TO_DIRECTOR' }
                        : c
                )
            );

            showSnackbar('Report successfully sent to director', 'success');
        } catch (err) {
            console.error('Failed to send report:', err);
            showSnackbar(err.response?.data?.message || 'Failed to send report', 'error');
        } finally {
            setDialogOpen(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'CASE_CREATED': return '#1976d2';
            case 'REPORT_SUBMITTED': return '#ff9800';
            case 'CASE_SUBMITTED_TO_DIRECTOR': return '#4caf50';
            case 'REJECTED': return '#d32f2f';
            case 'APPROVED': return '#2e7d32';
            default: return '#757575';
        }
    };

    const formatStatusText = (status) => {
        return status.toLowerCase().replace(/_/g, ' ');
    };

    if (loading.cases || loading.directors) {
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
                <Box display="flex" alignItems="center" width="50%">
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
                </Box>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/intelligence-officer/new-case')}
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
                                <TableRow key={caseItem.caseNum} hover>
                                    <TableCell>{caseItem.caseNum}</TableCell>
                                    <TableCell>
                                        {caseItem.reportId || 'N/A'}
                                    </TableCell>
                                    <TableCell>{caseItem.tin || '-'}</TableCell>
                                    <TableCell>{caseItem.taxPeriod || '-'}</TableCell>
                                    <TableCell>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: getStatusColor(caseItem.status),
                                                fontWeight: 'medium',
                                                textTransform: 'capitalize'
                                            }}
                                        >
                                            {formatStatusText(caseItem.status)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Box display="flex" alignItems="center" gap={1}>



                                            <IconButton
                                                onClick={() => handleSendClick(caseItem)}
                                                color="#01010"
                                                // disabled={caseItem.status !== 'CASE_CREATED' || !selectedDirector}
                                                title="Send to Director"
                                            >
                                                <SendIcon />
                                            </IconButton>
                                            <IconButton
                                                onClick={() => navigate(`/intelligence-officer/view-case/${caseItem.caseNum}`)}
                                                title="View Details"
                                            >
                                                <DescriptionIcon />
                                            </IconButton>
                                            <IconButton
                                                onClick={() => navigate(`/intelligence-officer/claim-form/${caseItem.caseNum}`)}
                                                title="Attachments"
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
                    <Typography>
                        Are you sure you want to send report <strong>{selectedReport?.reportId}</strong> to the selected director?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={confirmSendReport}
                        variant="contained"
                        color="primary"
                        startIcon={<SendIcon />}
                    >
                        Confirm Send
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