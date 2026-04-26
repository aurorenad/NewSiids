// EditReport.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Button, TextField, Typography, Paper, Alert,
    CircularProgress, Snackbar, Container, Card, CardContent,
    Grid, FormControl, InputLabel, Select, MenuItem, Chip,
    IconButton, List, ListItem, ListItemText, ListItemSecondaryAction
} from '@mui/material';
import { ArrowBack, Save, Delete, CloudUpload, Description } from '@mui/icons-material';
import { ReportApi } from '../api/Axios/caseApi';

const EditReport = () => {
    const { reportId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [report, setReport] = useState(null);
    const [editPermission, setEditPermission] = useState(null);
    const [attachments, setAttachments] = useState([]);

    const [formData, setFormData] = useState({
        description: '',
        findings: '',
        recommendations: '',
        principleAmount: '',
        penaltiesAmount: ''
    });

    useEffect(() => {
        checkEditPermission();
        fetchReport();
    }, [reportId]);

    const checkEditPermission = async () => {
        try {
            const response = await ReportApi.getEditPermission(reportId);
            setEditPermission(response.data);
        } catch (err) {
            console.error('Error checking edit permission:', err);
        }
    };

    const fetchReport = async () => {
        try {
            setLoading(true);
            const response = await ReportApi.getReport(reportId);
            const reportData = response.data;

            setReport(reportData);
            setFormData({
                description: reportData.description || '',
                findings: reportData.findings || '',
                recommendations: reportData.recommendations || '',
                principleAmount: reportData.principleAmount || '',
                penaltiesAmount: reportData.penaltiesAmount || ''
            });

            // Initialize attachments from report data
            if (reportData.attachmentPaths && reportData.attachmentPaths.length > 0) {
                setAttachments(reportData.attachmentPaths);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load report');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileUpload = async (event) => {
        const files = Array.from(event.target.files);
        const validFiles = files.filter(file => {
            const isValid = file.type === 'application/pdf';
            if (!isValid) {
                setError('Only PDF files are allowed');
            }
            return isValid;
        });

        if (validFiles.length === 0) return;

        // In a real implementation, you would upload files here
        // For now, we'll just add them to state
        const newAttachments = validFiles.map(file => ({
            name: file.name,
            file: file,
            isNew: true
        }));

        setAttachments(prev => [...prev, ...newAttachments]);
    };

    const handleRemoveAttachment = (attachment, index) => {
        // Remove from current attachments
        const newAttachments = [...attachments];
        newAttachments.splice(index, 1);
        setAttachments(newAttachments);
    };

    const handleFullEdit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const formDataToSend = new FormData();

            // Add report data as JSON
            const reportData = {
                description: formData.description,
                // Include other fields if needed
            };
            formDataToSend.append('reportData', JSON.stringify(reportData));

            // Add new attachments
            attachments
                .filter(att => att.isNew && att.file)
                .forEach((att) => {
                    formDataToSend.append(`attachments`, att.file);
                });

            // Call the edit endpoint
            await ReportApi.editReport(reportId, formDataToSend);

            setSuccess(true);
            setTimeout(() => {
                navigate('/intelligence-officer');
            }, 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update report');
        } finally {
            setSaving(false);
        }
    };

    const downloadAttachment = async (filename) => {
        try {
            await ReportApi.downloadAttachment(reportId, filename);
        } catch {
            setError('Failed to download attachment');
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (error && !report) {
        return (
            <Container maxWidth="md" sx={{ mt: 4 }}>
                <Alert severity="error">{error}</Alert>
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => navigate('/intelligence-officer')}
                    sx={{ mt: 2 }}
                >
                    Back to Dashboard
                </Button>
            </Container>
        );
    }

    if (editPermission && !editPermission.canEdit) {
        return (
            <Container maxWidth="md" sx={{ mt: 4 }}>
                <Alert severity="error">
                    You are not authorized to edit this report. This report is not in a returned status.
                </Alert>
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => navigate('/intelligence-officer')}
                    sx={{ mt: 2 }}
                >
                    Back to Dashboard
                </Button>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Button
                startIcon={<ArrowBack />}
                onClick={() => navigate('/intelligence-officer')}
                sx={{ mb: 3 }}
            >
                Back to Dashboard
            </Button>

            <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h4" gutterBottom>
                    Edit Returned Report #{reportId}
                </Typography>

                {report?.relatedCase?.caseNum && (
                    <Typography variant="subtitle1" color="textSecondary" gutterBottom>
                        Case: {report.relatedCase.caseNum}
                    </Typography>
                )}

                {/* Return Reason Information */}
                {report?.returnReason && (
                    <Card sx={{ mb: 3, bgcolor: 'warning.light' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                📋 Return Reason
                            </Typography>
                            <Typography variant="body1" paragraph>
                                {report.returnReason}
                            </Typography>
                            {report.returnedBy && (
                                <Typography variant="body2" color="textSecondary">
                                    Returned by: {report.returnedBy.givenName} {report.returnedBy.familyName} •
                                    {new Date(report.returnedAt).toLocaleDateString()}
                                </Typography>
                            )}
                            {editPermission?.editGuidance && (
                                <Alert severity="info" sx={{ mt: 2 }}>
                                    <Typography variant="subtitle2">Edit Guidance:</Typography>
                                    {editPermission.editGuidance}
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                )}

                <form onSubmit={handleFullEdit}>
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={6}
                                label="Report Description *"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                required
                                margin="normal"
                                variant="outlined"
                                helperText="Update the report description to address return reason"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        📎 Attachments
                                    </Typography>
                                    {attachments.length > 0 && (
                                        <List>
                                            {attachments.map((attachment, index) => (
                                                <ListItem key={index}>
                                                    <Description sx={{ mr: 2, color: 'primary.main' }} />
                                                    <ListItemText
                                                        primary={attachment.name || attachment}
                                                        secondary={attachment.isNew ? 'New attachment' : 'Existing attachment'}
                                                    />
                                                    <ListItemSecondaryAction>
                                                        {!attachment.isNew && (
                                                            <IconButton
                                                                edge="end"
                                                                onClick={() => downloadAttachment(attachment.name || attachment)}
                                                            >
                                                                <CloudUpload />
                                                            </IconButton>
                                                        )}
                                                        <IconButton
                                                            edge="end"
                                                            onClick={() => handleRemoveAttachment(attachment, index)}
                                                            color="error"
                                                        >
                                                            <Delete />
                                                        </IconButton>
                                                    </ListItemSecondaryAction>
                                                </ListItem>
                                            ))}
                                        </List>
                                    )}
                                    <Button
                                        variant="outlined"
                                        component="label"
                                        startIcon={<CloudUpload />}
                                        sx={{ mt: 2 }}
                                    >
                                        Add PDF Attachments
                                        <input
                                            type="file"
                                            hidden
                                            multiple
                                            accept=".pdf,application/pdf"
                                            onChange={handleFileUpload}
                                        />
                                    </Button>
                                    <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                                        Only PDF files are allowed
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    <Box display="flex" justifyContent="flex-end" gap={2} mt={4}>
                        <Button
                            variant="outlined"
                            onClick={() => navigate('/intelligence-officer')}
                            disabled={saving}
                        >
                            Cancel
                        </Button>

                        <Button
                            variant="contained"
                            color="secondary"
                            type="submit"
                            startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : 'Save & Resubmit'}
                        </Button>
                    </Box>
                </form>
            </Paper>

            <Snackbar
                open={success}
                autoHideDuration={3000}
                onClose={() => setSuccess(false)}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert severity="success" onClose={() => setSuccess(false)}>
                    Report updated successfully!
                </Alert>
            </Snackbar>

            <Snackbar
                open={!!error}
                autoHideDuration={6000}
                onClose={() => setError(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert severity="error" onClose={() => setError(null)}>
                    {error}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default EditReport;