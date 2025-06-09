import React, { useState, useEffect } from 'react';
import {
    Button,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    CircularProgress,
    Snackbar,
    Alert,
    Box
} from "@mui/material";
import { Add, Description, Search } from "@mui/icons-material";
import SendIcon from "@mui/icons-material/Send";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import { useNavigate } from 'react-router-dom';
import { CaseService } from '../api/Axios/caseApi';

const IntelligenceOfficer = () => {
    const [cases, setCases] = useState([]);
    const [filteredCases, setFilteredCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'info'
    });

    const navigate = useNavigate();

    useEffect(() => {
        const fetchCases = async () => {
            const employeeId = localStorage.getItem('employeeId')?.trim();
            console.log("🔍 Loaded employeeId from localStorage:", employeeId);

            if (!employeeId) {
                setError('Missing employee ID. Please log in again.');
                showSnackbar('Missing employee ID. Please log in again.', 'error');
                setLoading(false);
                return;
            }

            try {
                const response = await CaseService.getMyCases();
                console.log("✅ Fetched cases:", response.data);

                setCases(response.data);
                setFilteredCases(response.data);
            } catch (err) {
                console.error('❌ Failed to fetch cases:', err);
                setError(err.response?.data?.message || 'Failed to fetch cases');
                showSnackbar('Failed to fetch cases', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchCases();
    }, []);

    useEffect(() => {
        const results = cases.filter(caseItem =>
            Object.values(caseItem).some(
                value =>
                    value &&
                    value.toString().toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
        setFilteredCases(results);
    }, [searchTerm, cases]);

    const handleSend = async (caseId) => {
        try {
            await CaseService.updateCaseStatus(caseId, 'SENT_TO_DIRECTOR');
            setCases(prevCases =>
                prevCases.map(c =>
                    c.caseNum === caseId ? { ...c, status: 'SENT_TO_DIRECTOR' } : c
                )
            );
            showSnackbar('Case sent successfully', 'success');
        } catch (err) {
            console.error('❌ Failed to update case status:', err);
            showSnackbar('Failed to send case', 'error');
        }
    };

    const showSnackbar = (message, severity) => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'CASE_CREATED': return '#1976d2';
            case 'SENT_TO_DIRECTOR': return '#2e7d32';
            case 'REJECTED': return '#d32f2f';
            case 'APPROVED': return '#4caf50';
            default: return '#757575';
        }
    };

    const formatStatusText = (status) => {
        return status.toLowerCase().replace(/_/g, ' ');
    };

    if (loading) {
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
                mb={2}
            >
                <Box display="flex" alignItems="center">
                    <TextField
                        size="small"
                        placeholder="Search cases..."
                        variant="outlined"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            endAdornment: (
                                <IconButton>
                                    <Search />
                                </IconButton>
                            ),
                        }}
                    />
                </Box>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Add />}
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
                            <TableCell sx={{ fontWeight: 'bold' }}>Tax Type</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Taxpayer Name</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredCases.length > 0 ? (
                            filteredCases.map((caseItem) => (
                                <TableRow key={caseItem.caseNum} hover>
                                    <TableCell>{caseItem.caseNum}</TableCell>
                                    <TableCell>{caseItem.tin || '-'}</TableCell>
                                    <TableCell>{caseItem.taxPeriod || '-'}</TableCell>
                                    <TableCell>{caseItem.taxPayerType || '-'}</TableCell>
                                    <TableCell>{caseItem.taxPayerName || '-'}</TableCell>

                                    <TableCell>
                                        <Box
                                            component="span"
                                            sx={{
                                                color: getStatusColor(caseItem.status),
                                                fontWeight: 'medium'
                                            }}
                                        >
                                            {formatStatusText(caseItem.status)}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <IconButton
                                            onClick={() => handleSend(caseItem.caseNum)}
                                            color="primary"
                                            disabled={caseItem.status !== 'CASE_CREATED'}
                                            title="Send to Director"
                                        >
                                            <SendIcon />
                                        </IconButton>
                                        <IconButton
                                            color="primary"
                                            onClick={() => navigate(`/intelligence-officer/view-case/${caseItem.caseNum}`)}
                                            title="View Details"
                                        >
                                            <Description />
                                        </IconButton>
                                        <IconButton
                                            color="primary"
                                            onClick={() => navigate(`/intelligence-officer/attachment/${caseItem.caseNum}`)}
                                            title="Attachments"
                                        >
                                            <AttachFileIcon />
                                        </IconButton>
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
            </TableContainer>

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
