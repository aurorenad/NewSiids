import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Container,
    Divider,
    Grid,
    IconButton,
    List,
    ListItem,
    ListItemSecondaryAction,
    ListItemText,
    Paper,
    Snackbar,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import {
    ArrowBack,
    CloudUpload,
    Delete,
    Description,
    Download,
    Save,
    Visibility,
} from '@mui/icons-material';
import { ReportApi } from '../api/Axios/caseApi';
import { ROUTES } from '../constants/routes';

const FIELD_SX = {
    '& .MuiInputBase-input': { fontSize: '0.8125rem' },
    '& .MuiInputLabel-root': { fontSize: '0.75rem' },
};

const ReadOnlyField = ({ label, value, ...props }) => (
    <TextField
        fullWidth
        size="small"
        label={label}
        value={value ?? '-'}
        InputProps={{ readOnly: true }}
        sx={FIELD_SX}
        {...props}
    />
);

const EditReport = () => {
    const { reportId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [report, setReport] = useState(null);
    const [editPermission, setEditPermission] = useState(null);
    const [attachments, setAttachments] = useState([]);
    const [formData, setFormData] = useState({
        subject: '',
        description: '',
        legalBasis: '',
    });

    useEffect(() => {
        const loadEditContext = async () => {
            try {
                setLoading(true);
                const [permissionResponse, reportResponse] = await Promise.all([
                    ReportApi.getEditPermission(reportId).catch(() => ({ data: null })),
                    ReportApi.getReport(reportId),
                ]);

                const reportData = reportResponse.data;
                setEditPermission(permissionResponse.data);
                setReport(reportData);
                setFormData({
                    subject: reportData.subject || '',
                    description: reportData.description || '',
                    legalBasis: reportData.legalBasis || '',
                });
                setAttachments(reportData.attachmentPaths || []);
                setError(null);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load returned report');
            } finally {
                setLoading(false);
            }
        };

        loadEditContext();
    }, [reportId]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileUpload = (event) => {
        const files = Array.from(event.target.files || []);
        const validFiles = files.filter(file => {
            const isValid = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
            if (!isValid) {
                setError('Only PDF files are allowed');
            }
            return isValid;
        });

        if (validFiles.length > 0) {
            setAttachments(prev => [
                ...prev,
                ...validFiles.map(file => ({ name: file.name, file, isNew: true })),
            ]);
        }

        event.target.value = '';
    };

    const handleRemoveAttachment = (index) => {
        setAttachments(prev => prev.filter((_, currentIndex) => currentIndex !== index));
    };

    const handleFullEdit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const formDataToSend = new FormData();
            formDataToSend.append('reportData', JSON.stringify({
                subject: formData.subject,
                description: formData.description,
                legalBasis: formData.legalBasis,
                caseNum: report?.relatedCase?.caseNum,
            }));

            attachments
                .filter(attachment => attachment.isNew && attachment.file)
                .forEach(attachment => {
                    formDataToSend.append('attachments', attachment.file);
                });

            await ReportApi.editReport(reportId, formDataToSend);
            setError(null);
            setSuccess('Report saved and resubmitted successfully.');
            setTimeout(() => navigate(ROUTES.INTELLIGENCE_OFFICER), 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update report');
        } finally {
            setSaving(false);
        }
    };

    const downloadAttachment = async (filename) => {
        try {
            await ReportApi.downloadAttachment(reportId, filename);
        } catch (err) {
            if (err.response?.status === 404) {
                setError('Attachment file was not found on the server');
            } else if (err.response?.status === 403) {
                setError('You do not have permission to download this attachment');
            } else {
                setError(err.response?.data?.message || 'Failed to download attachment');
            }
        }
    };

    const viewAttachment = async (filename) => {
        try {
            await ReportApi.viewAttachment(reportId, filename);
        } catch (err) {
            if (err.response?.status === 404) {
                setError('Attachment file was not found on the server');
            } else if (err.response?.status === 403) {
                setError('You do not have permission to open this attachment');
            } else {
                setError(err.response?.data?.message || 'Failed to open attachment');
            }
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleString();
        } catch {
            return dateString;
        }
    };

    const formatReturnedBy = () => {
        if (!report?.returnedBy) return '-';
        if (typeof report.returnedBy === 'string') return report.returnedBy;
        return `${report.returnedBy.givenName || ''} ${report.returnedBy.familyName || ''}`.trim() || '-';
    };

    const attachmentName = (attachment, index) => {
        const name = attachment?.name || attachment;
        return typeof name === 'string' ? name.split('/').pop() : `Attachment ${index + 1}`;
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="320px">
                <CircularProgress size={28} />
            </Box>
        );
    }

    if (error && !report) {
        return (
            <Container maxWidth="sm" sx={{ mt: 3 }}>
                <Alert severity="error" sx={{ fontSize: '0.8125rem' }}>{error}</Alert>
                <Button size="small" startIcon={<ArrowBack fontSize="small" />} onClick={() => navigate(ROUTES.INTELLIGENCE_OFFICER)} sx={{ mt: 1.5 }}>
                    Back to dashboard
                </Button>
            </Container>
        );
    }

    if (editPermission && !editPermission.canEdit) {
        return (
            <Container maxWidth="sm" sx={{ mt: 3 }}>
                <Alert severity="error" sx={{ fontSize: '0.8125rem' }}>
                    This report can't be edited because it isn't in a returned status.
                </Alert>
                <Button size="small" startIcon={<ArrowBack fontSize="small" />} onClick={() => navigate(ROUTES.INTELLIGENCE_OFFICER)} sx={{ mt: 1.5 }}>
                    Back to dashboard
                </Button>
            </Container>
        );
    }

    return (
        <Container maxWidth="md" sx={{ mt: 2, mb: 3 }}>
            <Button
                size="small"
                startIcon={<ArrowBack fontSize="small" />}
                onClick={() => navigate(ROUTES.INTELLIGENCE_OFFICER)}
                sx={{ mb: 1.5, color: 'text.secondary' }}
            >
                Back to dashboard
            </Button>

            <Paper
                variant="outlined"
                sx={{
                    p: { xs: 2, sm: 2.5 },
                    borderRadius: 2,
                    borderColor: 'divider',
                }}
            >
                {/* Header */}
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1.5} mb={2}>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
                            Edit returned report
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            #{reportId}{report?.relatedCase?.caseNum ? ` · Case ${report.relatedCase.caseNum}` : ''}
                        </Typography>
                    </Box>
                    <Chip size="small" label={report?.status || 'Returned'} color="warning" sx={{ fontWeight: 600 }} />
                </Box>

            {/* Director Intelligence Message */}
<Alert
    severity="warning"
    variant="outlined"
    sx={{ mb: 2, py: 1, '& .MuiAlert-message': { width: '100%' } }}
>
    <Typography
        variant="caption"
        fontWeight={700}
        sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}
    >
        Director Intelligence Message
    </Typography>

    <Typography
        variant="body2"
        sx={{
            whiteSpace: 'pre-wrap',
            mt: 0.25,
            mb: 0.5,
            fontSize: '0.8125rem'
        }}
    >
        {report?.returnReason || 'No return message provided.'}
    </Typography>

    <Typography variant="caption" color="text.secondary">
        Returned by {formatReturnedBy()} on {formatDate(report?.returnedAt)}
    </Typography>

    {editPermission?.editGuidance && (
        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
            {editPermission.editGuidance}
        </Typography>
    )}
</Alert>

                {/* Case context — compact grid */}
                <Grid container spacing={1} sx={{ mb: 2.5 }}>
                    <Grid item xs={6} sm={3}>
                        <ReadOnlyField label="Case number" value={report?.relatedCase?.caseNum} />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <ReadOnlyField label="Taxpayer" value={report?.relatedCase?.tin?.taxPayerName} />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <ReadOnlyField label="TIN" value={report?.relatedCase?.tin?.taxPayerTIN} />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <ReadOnlyField label="Tax type" value={report?.relatedCase?.taxType} />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <ReadOnlyField label="Tax period" value={report?.relatedCase?.taxPeriod} />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <ReadOnlyField label="Current recipient" value={report?.currentRecipient} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <ReadOnlyField label="Taxpayer address" value={report?.relatedCase?.tin?.taxPayerAddress} />
                    </Grid>
                </Grid>

                <form onSubmit={handleFullEdit}>
                    <Stack spacing={2}>
                        <TextField
                            fullWidth
                            size="small"
                            label="Subject"
                            name="subject"
                            value={formData.subject}
                            onChange={handleInputChange}
                            sx={FIELD_SX}
                        />
                        <TextField
                            fullWidth
                            multiline
                            minRows={4}
                            size="small"
                            label="Report description"
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            required
                            helperText="Update this text to address the return reason above."
                            sx={FIELD_SX}
                        />
                        <TextField
                            fullWidth
                            multiline
                            minRows={2}
                            size="small"
                            label="Legal basis"
                            name="legalBasis"
                            value={formData.legalBasis}
                            onChange={handleInputChange}
                            sx={FIELD_SX}
                        />

                        {(report?.findings || report?.recommendations || report?.principleAmount || report?.penaltiesAmount) && (
                            <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
                                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                    <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' }}>
                                        Existing investigation details
                                    </Typography>
                                    <Grid container spacing={1} sx={{ mt: 0.5 }}>
                                        <Grid item xs={12} sm={6}>
                                            <ReadOnlyField label="Findings" value={report?.findings} multiline minRows={2} />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <ReadOnlyField label="Recommendations" value={report?.recommendations} multiline minRows={2} />
                                        </Grid>
                                        <Grid item xs={6}>
                                            <ReadOnlyField label="Principal amount" value={report?.principleAmount} />
                                        </Grid>
                                        <Grid item xs={6}>
                                            <ReadOnlyField label="Penalties amount" value={report?.penaltiesAmount} />
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        )}

                        <Box>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                                <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' }}>
                                    Attachments
                                </Typography>
                                <Button
                                    size="small"
                                    component="label"
                                    startIcon={<CloudUpload fontSize="small" />}
                                    sx={{ fontSize: '0.75rem' }}
                                >
                                    Add PDF
                                    <input type="file" hidden multiple accept=".pdf,application/pdf" onChange={handleFileUpload} />
                                </Button>
                            </Box>

                            {attachments.length > 0 ? (
                                <List dense disablePadding sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                                    {attachments.map((attachment, index) => (
                                        <ListItem
                                            key={`${attachmentName(attachment, index)}-${index}`}
                                            divider={index < attachments.length - 1}
                                            sx={{ py: 0.5 }}
                                        >
                                            <Description fontSize="small" sx={{ mr: 1.5, color: 'primary.main' }} />
                                            <ListItemText
                                                primary={attachmentName(attachment, index)}
                                                secondary={attachment.isNew ? 'New' : 'Existing'}
                                                primaryTypographyProps={{ fontSize: '0.8125rem' }}
                                                secondaryTypographyProps={{ fontSize: '0.6875rem' }}
                                            />
                                            <ListItemSecondaryAction>
                                                {!attachment.isNew ? (
                                                    <Stack direction="row" spacing={0}>
                                                        <IconButton size="small" title="View" onClick={() => viewAttachment(attachment.name || attachment)}>
                                                            <Visibility fontSize="small" />
                                                        </IconButton>
                                                        <IconButton size="small" title="Download" onClick={() => downloadAttachment(attachment.name || attachment)}>
                                                            <Download fontSize="small" />
                                                        </IconButton>
                                                    </Stack>
                                                ) : (
                                                    <IconButton size="small" onClick={() => handleRemoveAttachment(index)} color="error">
                                                        <Delete fontSize="small" />
                                                    </IconButton>
                                                )}
                                            </ListItemSecondaryAction>
                                        </ListItem>
                                    ))}
                                </List>
                            ) : (
                                <Typography variant="caption" color="text.secondary">
                                    No attachments on this report yet.
                                </Typography>
                            )}
                        </Box>
                    </Stack>

                    <Divider sx={{ my: 2 }} />

                    <Box display="flex" justifyContent="flex-end" gap={1}>
                        <Button size="small" variant="outlined" onClick={() => navigate(ROUTES.INTELLIGENCE_OFFICER)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button
                            size="small"
                            variant="contained"
                            color="secondary"
                            type="submit"
                            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save fontSize="small" />}
                            disabled={saving}
                        >
                            {saving ? 'Saving…' : 'Save and resubmit'}
                        </Button>
                    </Box>
                </form>
            </Paper>

            <Snackbar
                open={Boolean(success)}
                autoHideDuration={3000}
                onClose={() => setSuccess(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert severity="success" onClose={() => setSuccess(null)} sx={{ fontSize: '0.8125rem' }}>
                    {success || 'Report updated successfully.'}
                </Alert>
            </Snackbar>

            <Snackbar
                open={!!error}
                autoHideDuration={6000}
                onClose={() => setError(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert severity="error" onClose={() => setError(null)} sx={{ fontSize: '0.8125rem' }}>
                    {error}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default EditReport;