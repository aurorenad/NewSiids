import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LogoImage from '../../public/Images/HomeLogo.jpeg'
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
import { ArrowBack, Edit, Send, PictureAsPdf } from '@mui/icons-material';
import { CaseService } from '../api/Axios/caseApi.jsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const STATUS_MAP = {
    case_created: { label: 'Case Created', color: 'primary' },
    open: { label: 'Open', color: 'info' },
    in_progress: { label: 'In Progress', color: 'warning' },
    closed: { label: 'Closed', color: 'success' },
    sent_to_director: { label: 'Sent to Director', color: 'secondary' },
    report_submitted_to_director_of_intelligence: { label: 'Sent to Director', color: 'secondary' }
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
    const navigate = useNavigate();
    const location = useLocation();
    const [caseData, setCaseData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const reportRef = useRef();

    const getCaseIdFromPath = () => {
        const pathname = location.pathname;
        const basePath = '/intelligence-officer/view-case/';
        if (pathname.startsWith(basePath)) {
            return pathname.substring(basePath.length);
        }
        return null;
    };

    const caseId = getCaseIdFromPath();

    const fetchCaseDetails = async () => {
        if (!caseId) {
            setError('No case ID provided');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError('');
            const response = await CaseService.getCase(caseId);
            const caseInfo = {
                ...response.data,
                caseNum: response.data.caseNum || response.data.id,
                intelligenceOfficer: response.data.createdByName || 'N/A',
                reportedDate: response.data.createdAt || 'N/A',
                taxPayerName: response.data.taxPayer?.name || 'N/A',
                taxPayerTIN: response.data.taxPayer?.tin || 'N/A',
                taxPayerAddress: response.data.taxPayer?.address || 'N/A',
                taxPayerType: response.data.taxType || 'N/A',
                informerId: response.data.informer?.informerId || 'N/A',
                informerName: response.data.informer?.name || 'N/A',
                informerNationalId: response.data.informer?.nationalId || 'N/A'
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
            await CaseService.updateCaseStatus(caseData.id || caseData.caseNum, 'REPORT_SUBMITTED_TO_DIRECTOR_OF_INTELLIGENCE');
            setCaseData(prev => ({
                ...prev,
                status: 'REPORT_SUBMITTED_TO_DIRECTOR_OF_INTELLIGENCE'
            }));
            navigate('/intelligence-officer');
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

    const handleDownloadPDF = async () => {
        const input = reportRef.current;
        const canvas = await html2canvas(input, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');

        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Tax_Report_${caseData.caseNum}.pdf`);
    };

    useEffect(() => {
        fetchCaseDetails();
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
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                <Box display="flex" gap={2}>
                    <Button variant="contained" startIcon={<ArrowBack />} onClick={() => navigate('/intelligence-officer')}>
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
                <Button variant="contained" startIcon={<ArrowBack />} onClick={() => navigate('/intelligence-officer')}>
                    Back to Cases
                </Button>
            </Box>
        );
    }

    const { label: statusLabel, color: statusColor } = getStatusProps(caseData.status);

    return (
        <div>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, mb: 2, mr: 5 }}>
                <Button
                    variant="contained"
                    color="#3BDEDE"
                    startIcon={<PictureAsPdf />}
                    onClick={handleDownloadPDF}
                >
                    Download PDF
                </Button>
            </Box>

            <Paper elevation={3} sx={{
                p: 3,
                width: '80%',
                margin: 'auto',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
                   ref={reportRef}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Typography variant="h6" fontWeight="bold">
                        <div style={{ width: "100px", margin: "auto" }}>
                            <img src="/Images/HomeLogo.jpeg" alt="logo" style={{ width: '100%' }} />
                        </div>
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

                <Grid container justifyContent="space-between" sx={{ mb: 3 }}>
                    <Grid item>
                        <Typography variant="body2"><strong>Case Reference:</strong> {caseData.caseNum || 'N/A'}</Typography>
                    </Grid>
                    <Grid item>
                        <Typography variant="body2"><strong>Date:</strong> {formatDate(caseData.reportedDate)}</Typography>
                    </Grid>
                </Grid>

                <Typography variant="h5" align="center" sx={{ mb: 3, fontWeight: 'bold' }}>
                    Tax Case Report
                </Typography>

                <Table sx={{ mb: 3 }}>
                    <TableBody>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', width: '30%' }}>Case Status</TableCell>
                            <TableCell><Chip label={statusLabel} color={statusColor} size="small" /></TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Intelligence Officer</TableCell>
                            <TableCell>{caseData.intelligenceOfficer}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>

                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Taxpayer Information</Typography>
                <Table sx={{ mb: 3 }}>
                    <TableBody>
                        <TableRow><TableCell sx={{ fontWeight: 'bold', width: '30%' }}>Taxpayer Name</TableCell><TableCell>{caseData.taxPayerName}</TableCell></TableRow>
                        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>TIN</TableCell><TableCell>{caseData.taxPayerTIN}</TableCell></TableRow>
                        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>Tax Type</TableCell><TableCell>{caseData.taxPayerType}</TableCell></TableRow>
                        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>Address</TableCell><TableCell>{caseData.taxPayerAddress}</TableCell></TableRow>
                    </TableBody>
                </Table>

                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Informer Information</Typography>
                <Table sx={{ mb: 3 }}>
                    <TableBody>
                        <TableRow><TableCell sx={{ fontWeight: 'bold', width: '30%' }}>Informer Name</TableCell><TableCell>{caseData.informerName}</TableCell></TableRow>
                        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>Informer ID</TableCell><TableCell>{caseData.informerId}</TableCell></TableRow>
                        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>National ID</TableCell><TableCell>{caseData.informerNationalId}</TableCell></TableRow>
                    </TableBody>
                </Table>

                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Case Summary</Typography>
                <Paper elevation={0} sx={{ p: 2, backgroundColor: 'grey.50', border: '1px solid', borderColor: 'grey.200', mb: 3 }}>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {caseData.summaryOfInformationCase || 'No summary provided'}
                    </Typography>
                </Paper>

                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" sx={{ mb: 1 }}><strong>Prepared by:</strong> {caseData.intelligenceOfficer}</Typography>
                <Typography variant="body2" sx={{ mb: 1 }}><strong>Date Prepared:</strong> {formatDate(caseData.reportedDate)}</Typography>

                <Typography variant="h6" align="center" sx={{ mb: 1, fontWeight: 'bold' }}>HEREFOR YOU TO SERVE</Typography>
                <Typography variant="body2" align="center" sx={{ fontStyle: 'italic' }}>
                    Kicukiro-Sonatube-Silverback Mall, P.O.Box 3987 Kigali, Rwanda
                </Typography>
                <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                    3004 www.rra.gov.tw @rainfo
                </Typography>
            </Paper>
        </div>
    );
};

export default TaxReportView;
