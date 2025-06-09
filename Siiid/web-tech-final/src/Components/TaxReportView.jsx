import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Paper,
    Typography,
    Grid,
    Card,
    CardContent,
    Button,
    Chip,
    Divider,
    Box,
    CircularProgress,
    Alert
} from '@mui/material';
import { ArrowBack, Edit, Send } from '@mui/icons-material';
import { CaseService } from '../api/Axios/caseApi.jsx';

const STATUS_MAP = {
    case_created: { label: 'Case Created', color: 'primary' },
    open: { label: 'Open', color: 'info' },
    in_progress: { label: 'In Progress', color: 'warning' },
    closed: { label: 'Closed', color: 'success' },
    sent_to_director: { label: 'Sent to Director', color: 'secondary' }
};

const getStatusProps = (status) => {
    const key = status?.toLowerCase()?.replace(/\s/g, '_');
    return STATUS_MAP[key] || { label: status || 'Unknown', color: 'default' };
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

const TaxReportView = () => {
    const { caseId } = useParams();
    const navigate = useNavigate();
    const [caseData, setCaseData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchCaseDetails = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await CaseService.getCase(caseId);
            const caseInfo = {
                ...response.data,
                caseNum: response.data.caseNum || response.data.id,
                intelligenceOfficer: response.data.reportingOfficer,
            };
            setCaseData(caseInfo);
        } catch (err) {
            console.error('Failed to fetch case:', err);
            setError('Failed to load case details');
        } finally {
            setLoading(false);
        }
    };

    const handleSendToDirector = async () => {
        try {
            const updatedCase = {
                ...caseData,
                status: 'sent_to_director'
            };
            await CaseService.updateCase(caseData.caseNum || caseData.id, updatedCase);
            setCaseData(updatedCase);
            navigate('/Director-intelligence');
        } catch (err) {
            console.error('Error sending case to director:', err);
            setError('Failed to send case to director');
        }
    };

    const handleEdit = () => {
        navigate('/intelligence-officer/newCase', {
            state: { caseData }
        });
    };

    useEffect(() => {
        if (caseId) {
            fetchCaseDetails();
        }
    }, [caseId]);

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
                        onClick={() => navigate('/intelligence-officer/view')}
                    >
                        Back to Cases
                    </Button>
                    <Button variant="outlined" onClick={fetchCaseDetails}>
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
                    onClick={() => navigate('/intelligence-officer/view')}
                >
                    Back to Cases
                </Button>
            </Box>
        );
    }

    const { label: statusLabel, color: statusColor } = getStatusProps(caseData.status);

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Button
                        startIcon={<ArrowBack />}
                        onClick={() => navigate('/intelligence-officer/view')}
                        sx={{ mr: 2 }}
                    >
                        Back
                    </Button>
                    <Typography variant="h4" component="h1">
                        Case Details
                    </Typography>
                </Box>
                <Box>
                    <Button
                        variant="outlined"
                        startIcon={<Edit />}
                        onClick={handleEdit}
                        sx={{ mr: 1 }}
                        disabled={caseData.status === 'sent_to_director'}
                    >
                        Edit Case
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<Send />}
                        onClick={handleSendToDirector}
                        disabled={caseData.status === 'sent_to_director'}
                    >
                        {caseData.status === 'sent_to_director' ? 'Sent to Director' : 'Send to Director'}
                    </Button>
                </Box>
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom color="primary">
                                Case Information
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="textSecondary">
                                        Case Number
                                    </Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                        {caseData.caseNum || 'N/A'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="textSecondary">
                                        Status
                                    </Typography>
                                    <Chip
                                        label={statusLabel}
                                        color={statusColor}
                                        size="small"
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="textSecondary">
                                        Reported Date
                                    </Typography>
                                    <Typography variant="body1">
                                        {formatDate(caseData.reportedDate)}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="textSecondary">
                                        Intelligence Officer
                                    </Typography>
                                    <Typography variant="body1">
                                        {caseData.intelligenceOfficer}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom color="primary">
                                Taxpayer Information
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="textSecondary">
                                        Name
                                    </Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                        {caseData.taxPayerName || 'N/A'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="textSecondary">
                                        TIN
                                    </Typography>
                                    <Typography variant="body1">
                                        {caseData.tin || 'N/A'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="textSecondary">
                                        Type
                                    </Typography>
                                    <Typography variant="body1">
                                        {caseData.taxPayerType || 'N/A'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="textSecondary">
                                        Address
                                    </Typography>
                                    <Typography variant="body1">
                                        {caseData.taxPayerAddress || 'N/A'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="textSecondary">
                                        Tax Period
                                    </Typography>
                                    <Typography variant="body1">
                                        {caseData.taxPeriod || 'N/A'}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom color="primary">
                                Informer Information
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="textSecondary">
                                        Informer ID
                                    </Typography>
                                    <Typography variant="body1">
                                        {caseData.informerId || 'N/A'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="textSecondary">
                                        Informer Name
                                    </Typography>
                                    <Typography variant="body1">
                                        {caseData.informerName || 'N/A'}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom color="primary">
                                Summary of Information
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2,
                                    backgroundColor: 'grey.50',
                                    border: '1px solid',
                                    borderColor: 'grey.200'
                                }}
                            >
                                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                                    {caseData.summaryOfInformationCase || 'No summary provided'}
                                </Typography>
                            </Paper>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default TaxReportView;
