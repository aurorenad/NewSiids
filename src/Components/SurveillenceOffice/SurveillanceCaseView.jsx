import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Card, CardContent, Typography, Divider, Grid,
    CircularProgress, Alert, Button, Chip, Avatar,
    List, ListItem, ListItemAvatar, ListItemText, Paper
} from '@mui/material';
import {
    ArrowBack, Person, Assignment, DateRange,
    Business, Home // Added missing icons
} from '@mui/icons-material';
import { CaseService } from '../../api/Axios/caseApi.jsx';

const STATUS_MAP = {
    CASE_CREATED: { label: 'Case Created', color: 'primary' },
    SENT_TO_INVESTIGATION: { label: 'Sent to Investigation', color: 'secondary' },
    IN_PROGRESS: { label: 'In Progress', color: 'warning' },
    CLOSED: { label: 'Closed', color: 'success' }
};

const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    try {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch {
        return 'Invalid date';
    }
};

const CaseDetailItem = ({ icon, label, value }) => (
    <ListItem>
        <ListItemAvatar>
            <Avatar sx={{ bgcolor: 'primary.main' }}>{icon}</Avatar>
        </ListItemAvatar>
        <ListItemText primary={label} secondary={value || 'Not specified'} />
    </ListItem>
);

const SurveillanceCaseView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [caseData, setCaseData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchCase = async () => {
        const caseId = parseInt(id);
        if (isNaN(caseId)) {
            setError('Invalid case ID');
            setLoading(false);
            return;
        }
        try {
            const response = await CaseService.getCase(caseId);
            console.log('API Response:', response); // Debug log

            if (!response?.data) {
                throw new Error('Case not found');
            }

            // Map API response to expected frontend structure
            const mappedData = {
                ...response.data,
                // Ensure all required fields have fallbacks
                taxPayerAddress: response.data.taxPayerAddress || 'Not available',
                summaryOfInformationCase: response.data.summaryOfInformationCase || 'No summary provided'
            };

            setCaseData(mappedData);
        } catch (err) {
            console.error('Error loading case:', err);
            setError(err.response?.data?.message || err.message || 'Failed to load case');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!id || isNaN(Number(id))) {
            setError('Invalid case ID');
            setLoading(false);
            return;
        }
        fetchCase();
    }, [id]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
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

    if (!caseData) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="warning">Case not found</Alert>
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

    const statusInfo = STATUS_MAP[caseData.status] || { label: caseData.status, color: 'default' };

    return (
        <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Button
                    variant="outlined"
                    startIcon={<ArrowBack />}
                    onClick={() => navigate('/surveillence-officer')}
                >
                    Back to Cases
                </Button>
                <Typography variant="h4">Case Details</Typography>
                <Chip label={statusInfo.label} color={statusInfo.color} />
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Case Summary</Typography>
                            <Divider sx={{ mb: 2 }} />
                            <List>
                                <CaseDetailItem
                                    icon={<Person />}
                                    label="Created By"
                                    value={caseData.createdByName}
                                />
                                <CaseDetailItem
                                    icon={<DateRange />}
                                    label="Reported Date"
                                    value={formatDate(caseData.reportedDate)}
                                />
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Taxpayer Information</Typography>
                            <Divider sx={{ mb: 2 }} />
                            <List>
                                <CaseDetailItem
                                    icon={<Person />}
                                    label="Name"
                                    value={caseData.taxPayerName}
                                />
                                <CaseDetailItem
                                    icon={<Assignment />}
                                    label="TIN"
                                    value={caseData.tin}
                                />
                                <CaseDetailItem
                                    icon={<Business />}
                                    label="Type"
                                    value={caseData.taxPayerType}
                                />
                                <CaseDetailItem
                                    icon={<Home />}
                                    label="Address"
                                    value={caseData.taxPayerAddress}
                                />
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Summary of Information</Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50' }}>
                                <Typography>
                                    {caseData.summaryOfInformationCase}
                                </Typography>
                            </Paper>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default SurveillanceCaseView;