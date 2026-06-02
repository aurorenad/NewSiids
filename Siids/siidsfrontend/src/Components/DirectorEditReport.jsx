import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Button, TextField, Typography, Paper, Alert,
    CircularProgress, Snackbar, Container, Grid
} from '@mui/material';
import { ArrowBack, Save, Info } from '@mui/icons-material';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const DirectorEditReport = () => {
    const { reportId } = useParams();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    
    const [report, setReport] = useState(null);
    const [revisedFindings, setRevisedFindings] = useState('');
    const [revisedRecommendations, setRevisedRecommendations] = useState('');
    const [revisionNotes, setRevisionNotes] = useState('');

    useEffect(() => {
        fetchReportDetails();
    }, [reportId]);

    const fetchReportDetails = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const employeeId = localStorage.getItem('employeeId') || sessionStorage.getItem('employeeId');
            
            // First fetch the general report details
            const reportResponse = await axios.get(`${BASE_URL}/api/reports/${reportId}`, {
                headers: { 'Authorization': `Bearer ${token}`, 'employee_id': employeeId }
            });
            setReport(reportResponse.data);

            // Then fetch the findings and recommendations
            const findingsResponse = await axios.get(`${BASE_URL}/api/reports/${reportId}/findings`, {
                headers: { 'Authorization': `Bearer ${token}`, 'employee_id': employeeId }
            });
            
            const details = findingsResponse.data;
            setRevisedFindings(details.findings || '');
            setRevisedRecommendations(details.recommendations || '');
            setRevisionNotes('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch report details for editing.');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmEdit = async (e) => {
        e.preventDefault();
        if (!revisedFindings.trim() || !revisedRecommendations.trim() || !revisionNotes.trim()) {
            setError('All fields are required to submit a revision.');
            return;
        }
        
        setSaving(true);
        setError(null);
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const employeeId = localStorage.getItem('employeeId') || sessionStorage.getItem('employeeId');
            
            await axios.post(`${BASE_URL}/api/reports/${reportId}/revise`, {
                revisedFindings,
                revisedRecommendations,
                revisionNotes
            }, {
                headers: { 'Authorization': `Bearer ${token}`, 'employee_id': employeeId }
            });
            
            setSuccess(true);
            setTimeout(() => {
                navigate('/director-intelligence');
            }, 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to revise report');
        } finally {
            setSaving(false);
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
                    onClick={() => navigate('/director-intelligence')}
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
                onClick={() => navigate('/director-intelligence')}
                sx={{ mb: 3 }}
            >
                Back to Dashboard
            </Button>

            <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                    Edit Report #{reportId}
                </Typography>

                {report?.relatedCase?.caseNum && (
                    <Typography variant="subtitle1" color="textSecondary" gutterBottom>
                        Case Number: {report.relatedCase.caseNum}
                    </Typography>
                )}

                <Alert severity="warning" icon={<Info fontSize="inherit" />} sx={{ mb: 4 }}>
                    Note: Any modifications made here will be tracked in the report's revision history as "Revised by Director". Once the report is signed, further edits will be locked out.
                </Alert>

                <form onSubmit={handleConfirmEdit}>
                    <Grid container spacing={4}>
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom color="primary.main">
                                Report Findings
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                rows={8}
                                value={revisedFindings}
                                onChange={(e) => setRevisedFindings(e.target.value)}
                                variant="outlined"
                                required
                                placeholder="Enter revised findings here..."
                                sx={{ backgroundColor: '#f8fafc' }}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom color="primary.main">
                                Recommendations
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                rows={6}
                                value={revisedRecommendations}
                                onChange={(e) => setRevisedRecommendations(e.target.value)}
                                variant="outlined"
                                required
                                placeholder="Enter revised recommendations here..."
                                sx={{ backgroundColor: '#f8fafc' }}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom color="primary.main">
                                Revision Notes
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                value={revisionNotes}
                                onChange={(e) => setRevisionNotes(e.target.value)}
                                variant="outlined"
                                required
                                placeholder="Explain why you are making these modifications..."
                                helperText="This explanation will be logged in the audit trail."
                            />
                        </Grid>
                    </Grid>

                    <Box display="flex" justifyContent="flex-end" gap={2} mt={5}>
                        <Button
                            variant="outlined"
                            onClick={() => navigate('/director-intelligence')}
                            disabled={saving}
                            size="large"
                        >
                            Cancel
                        </Button>

                        <Button
                            variant="contained"
                            color="primary"
                            type="submit"
                            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
                            disabled={saving || !revisedFindings.trim() || !revisedRecommendations.trim() || !revisionNotes.trim()}
                            size="large"
                        >
                            {saving ? 'Saving Revision...' : 'Save Revisions'}
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
                    Report revised successfully! Redirecting...
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

export default DirectorEditReport;
