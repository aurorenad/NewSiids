import React, { useContext, useEffect, useState } from 'react';
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
    TableRow,
    IconButton
} from '@mui/material';
import { ArrowBack, Edit, ContactPage, HistoryEdu, Info, Business } from '@mui/icons-material';
import { CaseService } from '../../api/Axios/caseApi.jsx';
import { AuthContext } from '../../context/AuthContext.jsx';
import { hasPermission } from '../../utils/authorization.js';
import { format } from 'date-fns';

const STATUS_MAP = {
    CASE_CREATED: { label: 'Case Created', color: '#1976d2', bg: '#e3f2fd' },
    SENT_TO_INVESTIGATION: { label: 'Sent to Investigation', color: '#4caf50', bg: '#e8f5e9' },
    IN_PROGRESS: { label: 'In Progress', color: '#ff9800', bg: '#fff3e0' },
    CLOSED: { label: 'Closed', color: '#f44336', bg: '#ffebee' },
    SENT_TO_DIRECTOR: { label: 'Sent to Director', color: '#9c27b0', bg: '#f3e5f5' },
    REPORT_SUBMITTED: { label: 'Report Submitted', color: '#003DA5', bg: '#e3f2fd' }
};

const getStatusStyle = (status) => {
    return STATUS_MAP[status] || { label: status || 'Unknown', color: '#757575', bg: '#f5f5f5' };
};

const SurveillanceCaseView = () => {
    const { authState } = useContext(AuthContext);
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

            if (!response?.data) {
                throw new Error('Case not found');
            }

            const mappedData = {
                ...response.data,
                caseNum: response.data.caseNum || decodedCaseNum,
                surveillanceOfficer: response.data.createdByName || 'N/A',
                taxPayerAddress: response.data.taxPayer?.address || 'Not available',
                summaryOfInformationCase: response.data.summaryOfInformationCase || 'No summary provided',
                taxPayerName: response.data.taxPayer?.name || 'N/A',
                tin: response.data.taxPayer?.tin || 'N/A',
                taxType: response.data.taxType || 'N/A',
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
            <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress sx={{ color: 'var(--rra-blue)' }} />
                <Typography variant="body2" color="var(--gray-500)" sx={{ mt: 2 }}>Loading case details...</Typography>
            </Box>
        );
    }

    if (error || !caseData) {
        return (
            <Box sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
                <Alert severity={error ? "error" : "warning"} variant="outlined" sx={{ mb: 4, borderRadius: 2 }}>
                    {error || 'Case details not found.'}
                </Alert>
                <Button
                    variant="contained"
                    startIcon={<ArrowBack />}
                    onClick={() => navigate('/surveillence-officer')}
                    sx={{ bgcolor: 'var(--rra-blue)', borderRadius: 2 }}
                >
                    Back to Dashboard
                </Button>
            </Box>
        );
    }

    const statusStyle = getStatusStyle(caseData.status);
    const canUpdateCase = hasPermission(authState, 'CASE_UPDATE');

    return (
        <Box sx={{ p: 4, bgcolor: 'var(--surface-page)', minHeight: '100vh' }}>
            <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
                
                {/* Navigation Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconButton onClick={() => navigate(-1)} sx={{ bgcolor: 'white', border: '1px solid var(--gray-200)' }}>
                            <ArrowBack fontSize="small" />
                        </IconButton>
                        <Box>
                            <Typography variant="h5" fontWeight={700} color="var(--gray-900)">
                                Case Details
                            </Typography>
                            <Typography variant="body2" color="var(--gray-500)">
                                Viewing Ref: <strong>{caseData.caseNum}</strong>
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        {canUpdateCase && (caseData.status === 'CASE_CREATED' || caseData.status === 'REPORT_SUBMITTED') && (
                            <Button
                                variant="outlined"
                                startIcon={<Edit />}
                                onClick={handleEdit}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                            >
                                Edit Case
                            </Button>
                        )}
                        <Chip 
                            label={statusStyle.label} 
                            sx={{ 
                                bgcolor: statusStyle.bg, 
                                color: statusStyle.color, 
                                fontWeight: 700, 
                                height: 40, 
                                px: 1,
                                borderRadius: 2,
                                border: `1px solid ${statusStyle.color}40`
                            }} 
                        />
                    </Box>
                </Box>

                <Paper sx={{ 
                    p: 6, 
                    borderRadius: 4, 
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.1)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Watermark Decoration */}
                    <Box sx={{ position: 'absolute', top: -50, right: -50, opacity: 0.03 }}>
                        <HistoryEdu sx={{ fontSize: 300, transform: 'rotate(-20deg)' }} />
                    </Box>

                    {/* RRA Branding */}
                    <Box sx={{ textAlign: 'center', mb: 6 }}>
                        <Typography variant="h6" fontWeight={800} color="var(--rra-blue)" sx={{ letterSpacing: 1.5 }}>
                            RWANDA REVENUE AUTHORITY
                        </Typography>
                        <Typography variant="caption" fontWeight={700} color="var(--green-600)" sx={{ textTransform: 'uppercase', display: 'block', mb: 1 }}>
                            TAXES FOR GROWTH AND DEVELOPMENT
                        </Typography>
                        <Divider sx={{ width: 100, mx: 'auto', borderBottomWidth: 3, borderColor: 'var(--rra-blue)', mb: 2 }} />
                        <Typography variant="h5" fontWeight={700} sx={{ mt: 3, textTransform: 'uppercase' }}>
                            Surveillance & Intelligence Report
                        </Typography>
                    </Box>

                    <Grid container spacing={6}>
                        {/* Left Column: Core Info */}
                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--rra-blue)', mb: 3, textTransform: 'uppercase', fontWeight: 700 }}>
                                <ContactPage fontSize="small" /> Taxpayer Information
                            </Typography>
                            
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Box>
                                    <Typography variant="caption" color="var(--gray-500)" sx={{ textTransform: 'uppercase' }}>Name / Entity</Typography>
                                    <Typography variant="body1" fontWeight={600}>{caseData.taxPayerName}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="var(--gray-500)" sx={{ textTransform: 'uppercase' }}>TIN Number</Typography>
                                    <Typography variant="body1" fontWeight={700} color="var(--rra-blue)">{caseData.tin}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="var(--gray-500)" sx={{ textTransform: 'uppercase' }}>Tax Type & Period</Typography>
                                    <Typography variant="body1">{caseData.taxType} | {caseData.taxPeriod || 'N/A'}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="var(--gray-500)" sx={{ textTransform: 'uppercase' }}>Business Address</Typography>
                                    <Typography variant="body1">{caseData.taxPayerAddress}</Typography>
                                </Box>
                            </Box>
                        </Grid>

                        {/* Right Column: Submission Details */}
                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--rra-blue)', mb: 3, textTransform: 'uppercase', fontWeight: 700 }}>
                                <Info fontSize="small" /> Operation Metadata
                            </Typography>
                            
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Box>
                                    <Typography variant="caption" color="var(--gray-500)" sx={{ textTransform: 'uppercase' }}>Date Reported</Typography>
                                    <Typography variant="body1">{caseData.reportedDate ? format(new Date(caseData.reportedDate), 'PPPP') : 'N/A'}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="var(--gray-500)" sx={{ textTransform: 'uppercase' }}>Recording Officer</Typography>
                                    <Typography variant="body1" fontWeight={600}>{caseData.surveillanceOfficer}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="var(--gray-500)" sx={{ textTransform: 'uppercase' }}>Source Type</Typography>
                                    <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                                        {caseData.informer ? 'Identified Informer' : (caseData.referringDepartment ? 'Departmental Referral' : 'Anonymous Tip')}
                                    </Typography>
                                </Box>
                            </Box>
                        </Grid>

                        {/* Full Width: Summary */}
                        <Grid item xs={12}>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--rra-blue)', mb: 2, mt: 2, textTransform: 'uppercase', fontWeight: 700 }}>
                                <HistoryEdu fontSize="small" /> Intelligence Summary
                            </Typography>
                            <Paper elevation={0} sx={{ p: 3, bgcolor: '#f9fafb', border: '1px solid var(--gray-200)', borderRadius: 2 }}>
                                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: 'var(--gray-800)' }}>
                                    {caseData.summaryOfInformationCase}
                                </Typography>
                            </Paper>
                        </Grid>
                    </Grid>

                    {/* Footer Signature Block */}
                    <Box sx={{ mt: 8, pt: 4, borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <Box>
                            <Typography variant="caption" color="var(--gray-500)" sx={{ textTransform: 'uppercase', display: 'block', mb: 1 }}>
                                Prepared and Submitted By:
                            </Typography>
                            <Typography variant="body1" fontWeight={700}>{caseData.surveillanceOfficer.toUpperCase()}</Typography>
                            <Typography variant="caption" color="var(--gray-500)">Surveillance Unit, SIID</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" color="var(--gray-500)" sx={{ display: 'block' }}>
                                Generated on {format(new Date(), 'dd/MM/yyyy HH:mm')}
                            </Typography>
                            <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'var(--gray-400)' }}>
                                This is a system-generated document from SIIDS.
                            </Typography>
                        </Box>
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
};

export default SurveillanceCaseView;
