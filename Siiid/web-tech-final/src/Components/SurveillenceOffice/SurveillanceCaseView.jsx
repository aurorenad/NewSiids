import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Divider,
    Grid,
    CircularProgress,
    Alert,
    Button,
    Chip,
    Paper,
    Avatar,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    IconButton
} from '@mui/material';
import {
    ArrowBack,
    Person,
    Assignment,
    Business,
    Home,
    Description,
    DateRange,
    AttachFile,
    Send,
    Edit
} from '@mui/icons-material';
import { CaseService } from '../../api/Axios/caseApi.jsx';

const STATUS_MAP = {
    case_created: { label: 'Case Created', color: 'primary' },
    open: { label: 'Open', color: 'info' },
    in_progress: { label: 'In Progress', color: 'warning' },
    closed: { label: 'Closed', color: 'success' },
    sent_to_director: { label: 'Sent to Director', color: 'secondary' },
    pending: { label: 'Pending', color: 'default' }
};

const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
};

const CaseDetailItem = ({ icon, label, value, secondary }) => (
    <ListItem>
        <ListItemAvatar>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
                {icon}
            </Avatar>
        </ListItemAvatar>
        <ListItemText
            primary={label}
            secondary={secondary ? secondary : value || 'Not specified'}
        />
    </ListItem>
);

const SurveillanceCaseView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [caseData, setCaseData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCase = async () => {
            try {
                const response = await CaseService.getCase(id);
                setCaseData(response.data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load case details');
                console.error('Error fetching case:', err);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchCase();
        else setLoading(false);
    }, [id]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading case details...</Typography>
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
                    onClick={() => navigate(-1)}
                >
                    Back to List
                </Button>
            </Box>
        );
    }

    if (!caseData) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="warning" sx={{ mb: 2 }}>
                    No case data found!
                </Alert>
                <Button
                    variant="contained"
                    startIcon={<ArrowBack />}
                    onClick={() => navigate(-1)}
                >
                    Return to List
                </Button>
            </Box>
        );
    }

    const statusInfo = STATUS_MAP[caseData.status?.toLowerCase()] || STATUS_MAP.pending;

    return (
        <Box sx={{ p: 3 }}>
            {/* Header with Back Button */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Button
                    variant="outlined"
                    startIcon={<ArrowBack />}
                    onClick={() => navigate('/surveillence-officer')}
                    sx={{ mb: 2 }}
                >
                    Back to Cases
                </Button>

                <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="h4" component="h1">
                        Case: {caseData.caseNumber || 'Unassigned'}
                    </Typography>
                    <Chip
                        label={statusInfo.label}
                        color={statusInfo.color}
                        size="medium"
                        sx={{ fontWeight: 'bold' }}
                    />
                </Box>
            </Box>

            <Grid container spacing={3}>
                {/* Case Summary Card */}
                <Grid item xs={12} md={4}>
                    <Card elevation={3}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                <Assignment sx={{ mr: 1 }} /> Case Summary
                            </Typography>
                            <Divider sx={{ mb: 2 }} />

                            <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                                <List dense>
                                    <CaseDetailItem
                                        icon={<Person />}
                                        label="Reporting Officer"
                                        value={caseData.reportingOfficer}
                                    />
                                    <CaseDetailItem
                                        icon={<DateRange />}
                                        label="Reported Date"
                                        value={formatDate(caseData.reportedDate)}
                                    />
                                    <CaseDetailItem
                                        icon={<Description />}
                                        label="Status"
                                        value={statusInfo.label}
                                        secondary={`Last updated: ${formatDate(caseData.updatedAt)}`}
                                    />
                                </List>
                            </Paper>

                            <Box display="flex" justifyContent="space-between" mt={2}>
                                <Button
                                    variant="contained"
                                    startIcon={<Send />}
                                    onClick={() => navigate(`/Director-Investigation/${id}`)}
                                >
                                    Forward
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<Edit />}
                                    onClick={() => navigate(`/surveillence-officer/edit/${id}`)}
                                >
                                    Edit
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Taxpayer Information Card */}
                <Grid item xs={12} md={4}>
                    <Card elevation={3}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                <Business sx={{ mr: 1 }} /> Taxpayer Information
                            </Typography>
                            <Divider sx={{ mb: 2 }} />

                            <List dense>
                                <CaseDetailItem
                                    icon={<Person />}
                                    label="Taxpayer Name"
                                    value={caseData.taxPayerName}
                                />
                                <CaseDetailItem
                                    icon={<Assignment />}
                                    label="TIN Number"
                                    value={caseData.tin}
                                />
                                <CaseDetailItem
                                    icon={<Home />}
                                    label="Address"
                                    value={caseData.taxPayerAddress}
                                />
                                <CaseDetailItem
                                    icon={<Description />}
                                    label="Tax Type"
                                    value={caseData.taxPayerType}
                                />
                                <CaseDetailItem
                                    icon={<DateRange />}
                                    label="Tax Period"
                                    value={caseData.taxPeriod}
                                />
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Informer & Details Card */}
                <Grid item xs={12} md={4}>
                    <Card elevation={3}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                <Person sx={{ mr: 1 }} /> Informer Details
                            </Typography>
                            <Divider sx={{ mb: 2 }} />

                            <List dense>
                                <CaseDetailItem
                                    icon={<Person />}
                                    label="Informer ID"
                                    value={caseData.informerId}
                                />
                                <CaseDetailItem
                                    icon={<Assignment />}
                                    label="Informer Name"
                                    value={caseData.informerName}
                                />
                            </List>

                            <Typography variant="h6" gutterBottom sx={{ mt: 3, display: 'flex', alignItems: 'center' }}>
                                <Description sx={{ mr: 1 }} /> Case Description
                            </Typography>
                            <Divider sx={{ mb: 2 }} />

                            <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50' }}>
                                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                                    {caseData.summaryOfInformationCase || 'No description provided.'}
                                </Typography>
                            </Paper>

                            <Box display="flex" justifyContent="flex-end" mt={2}>
                                <Button
                                    variant="outlined"
                                    startIcon={<AttachFile />}
                                    onClick={() => navigate(`/surveillence/attachment/${id}`)}
                                >
                                    View Attachments
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default SurveillanceCaseView;