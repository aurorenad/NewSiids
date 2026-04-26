import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Paper,
    Typography,
    Grid,
    Button,
    Chip,
    Divider,
    Box,
    CircularProgress,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableRow
} from '@mui/material';
import { ArrowBack, Edit, Send } from '@mui/icons-material';
import { CaseService } from '../../api/Axios/caseApi.jsx';

const STATUS_MAP = {
    CASE_CREATED: { label: 'Case Created', color: 'primary' },
    SENT_TO_INVESTIGATION: { label: 'Sent to Investigation', color: 'secondary' },
    IN_PROGRESS: { label: 'In Progress', color: 'warning' },
    CLOSED: { label: 'Closed', color: 'success' },
    SENT_TO_DIRECTOR: { label: 'Sent to Director', color: 'secondary' }
};

const getStatusProps = (status) => {
    return STATUS_MAP[status] || { label: status || 'Unknown', color: 'default' };
};

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch {
        return dateString;
    }
};

const SurveillanceCaseView = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [caseData, setCaseData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const caseNum = location.pathname.split('/view/')[1];

    const fetchCase = async () => {
        try {
            setLoading(true);
            setError('');
            const decodedCaseNum = decodeURIComponent(caseNum);
            const response = await CaseService.getCase(decodedCaseNum);
            console.log('API Response:', response);

            if (!response?.data) {
                throw new Error('Case not found');
            }

            const mappedData = {
                ...response.data,
                caseNum: response.data.caseNum || caseNum,
                surveillanceOfficer: response.data.createdByName || 'N/A',
                taxPayerAddress: response.data.taxPayerAddress || 'Not available',
                summaryOfInformationCase: response.data.summaryOfInformationCase || 'No summary provided',
                taxPayerName: response.data.taxPayerName || 'N/A',
                tin: response.data.tin || 'N/A',
                taxPayerType: response.data.taxPayerType || 'N/A',
                reportedDate: response.data.createdAt || 'N/A'
            };

            setCaseData(mappedData);
        } catch (err) {
            console.error('Error loading case:', err);
            setError(err.response?.data?.message || err.message || 'Failed to load case');
        } finally {
            setLoading(false);
        }
    };



    const handleEdit = () => {
        navigate('/surveillence-officer/edit-case', {
            state: { caseData }
        });
    };

    useEffect(() => {
        if (caseNum) {
            fetchCase();
        }
    }, [caseNum]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
                <Typography variant="h6" sx={{ ml: 2 }}>Loading case details...</Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
                <Box display="flex" gap={2}>
                    <Button
                        variant="contained"
                        startIcon={<ArrowBack />}
                        onClick={() => navigate('/surveillence-officer')}
                    >
                        Back to Cases
                    </Button>
                    <Button variant="outlined" onClick={fetchCase}>
                        Retry
                    </Button>
                </Box>
            </Box>
        );
    }

    if (!caseData) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Case not found
                </Alert>
                <Button
                    variant="contained"
                    startIcon={<ArrowBack />}
                    onClick={() => navigate('/surveillence-officer')}
                >
                    Back to Cases
                </Button>
            </Box>
        );
    }

    const { label: statusLabel, color: statusColor } = getStatusProps(caseData.status);

    return (
        <Paper elevation={3} sx={{ p: 3, maxWidth: 1000, margin: 'auto' }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight="bold">
                    RWANDA REVENUE AUTHORITY
                </Typography>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    TAXES FOR GROWTH AND DEVELOPMENT
                </Typography>
                <Typography variant="subtitle2" sx={{
                    backgroundColor: 'grey.200',
                    p: 0.5,
                    display: 'inline-block',
                    fontWeight: 'bold'
                }}>
                    INTERNAL
                </Typography>
            </Box>

            {/* Case Reference */}
            <Grid container justifyContent="space-between" sx={{ mb: 3 }}>
                <Grid item>
                    <Typography variant="body2">
                        <strong>Case Reference:</strong> {caseData.caseNum || 'N/A'}
                    </Typography>
                </Grid>
                <Grid item>
                    <Typography variant="body2">
                        <strong>Date:</strong> {formatDate(caseData.reportedDate)}
                    </Typography>
                </Grid>
            </Grid>

            {/* Title */}
            <Typography variant="h5" align="center" sx={{ mb: 3, fontWeight: 'bold' }}>
                Surveillance Case Report
            </Typography>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 3 }}>
                <Button
                    variant="outlined"
                    startIcon={<Edit />}
                    onClick={handleEdit}
                    disabled={caseData.status === 'SENT_TO_DIRECTOR'}
                >
                    Edit Case
                </Button>

            </Box>

            {/* Case Details Table */}
            <Table sx={{ mb: 3 }}>
                <TableBody>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold', width: '30%' }}>Case Status</TableCell>
                        <TableCell>
                            <Chip label={statusLabel} color={statusColor} size="small" />
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Surveillance Officer</TableCell>
                        <TableCell>{caseData.surveillanceOfficer}</TableCell>
                    </TableRow>
                </TableBody>
            </Table>

            {/* Taxpayer Information Section */}
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                Taxpayer Information
            </Typography>
            <Table sx={{ mb: 3 }}>
                <TableBody>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold', width: '30%' }}>Taxpayer Name</TableCell>
                        <TableCell>{caseData.taxPayerName}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>TIN</TableCell>
                        <TableCell>{caseData.tin}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Tax Type</TableCell>
                        <TableCell>{caseData.taxPayerType}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Address</TableCell>
                        <TableCell>{caseData.taxPayerAddress}</TableCell>
                    </TableRow>
                </TableBody>
            </Table>

            {/* Case Summary Section */}
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                Case Summary
            </Typography>
            <Paper
                elevation={0}
                sx={{
                    p: 2,
                    backgroundColor: 'grey.50',
                    border: '1px solid',
                    borderColor: 'grey.200',
                    mb: 3
                }}
            >
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {caseData.summaryOfInformationCase}
                </Typography>
            </Paper>

            {/* Footer */}
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Prepared by:</strong> {caseData.surveillanceOfficer}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Date Prepared:</strong> {formatDate(caseData.reportedDate)}
            </Typography>

            <Typography variant="h6" align="center" sx={{ mb: 1, fontWeight: 'bold' }}>
                HEREFOR YOU TO SERVE
            </Typography>
            <Typography variant="body2" align="center" sx={{ fontStyle: 'italic' }}>
                Kicukiro-Sonatube-Silverback Mall, P.O.Box 3987 Kigali, Rwanda
            </Typography>
            <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                3004 www.rra.gov.tw @rainfo
            </Typography>
        </Paper>
    );
};

export default SurveillanceCaseView;