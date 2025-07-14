import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    Button,
    CircularProgress,
    Alert,
    Card,
    CardContent,
    Divider,
    Chip
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { ReportApi } from '../api/Axios/caseApi.jsx';

const ReportView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchReport = async () => {
        try {
            setLoading(true);
            const response = await ReportApi.getReport(id);
            setReport(response.data);
        } catch (err) {
            console.error('Failed to fetch report:', err);
            setError('Failed to load report details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [id]);

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
                <Button
                    variant="contained"
                    startIcon={<ArrowBack />}
                    onClick={() => navigate(-1)}
                    sx={{ mt: 2 }}
                >
                    Go Back
                </Button>
            </Box>
        );
    }

    if (!report) {
        return (
            <Box p={3}>
                <Alert severity="warning">Report not found</Alert>
                <Button
                    variant="contained"
                    startIcon={<ArrowBack />}
                    onClick={() => navigate(-1)}
                    sx={{ mt: 2 }}
                >
                    Go Back
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => navigate(-1)}
                >
                    Back
                </Button>
                <Typography variant="h4">Report Details</Typography>
            </Box>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                        Basic Information
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
                        <Box>
                            <Typography variant="subtitle2" color="textSecondary">
                                Report ID
                            </Typography>
                            <Typography variant="body1">{report.id}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="subtitle2" color="textSecondary">
                                Status
                            </Typography>
                            <Chip
                                label={report.status}
                                color={
                                    report.status === 'APPROVED' ? 'success' :
                                        report.status === 'REJECTED' ? 'error' : 'default'
                                }
                            />
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                        Report Content
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
                            {report.description || 'No description provided'}
                        </Typography>
                    </Paper>
                </CardContent>
            </Card>

            {report.attachmentPath && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom color="primary">
                            Attachment
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Button
                            variant="contained"
                            onClick={() => window.open(`/api/reports/${report.id}/attachment`, '_blank')}
                        >
                            Download Attachment
                        </Button>
                    </CardContent>
                </Card>
            )}
        </Box>
    );
};

export default ReportView;