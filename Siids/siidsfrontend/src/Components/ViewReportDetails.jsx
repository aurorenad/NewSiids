import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Typography, Paper, Button, CircularProgress,
    Alert, Chip, Divider
} from '@mui/material';
import { ArrowBack, PictureAsPdf, Download, Visibility } from '@mui/icons-material';
import { ReportApi } from '../api/Axios/caseApi';
import { displayNameFromStored } from '../utils/fileUtils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import AppTable from './ui/AppTable.jsx';

const detailColumns = [
    {
        key: 'label',
        label: 'Field',
        cellStyle: { fontWeight: 'bold', width: '30%', background: 'var(--gray-50)' },
    },
    {
        key: 'value',
        label: 'Value',
        render: (row) => row.value,
    },
];

const DetailTable = ({ rows }) => (
    <Box sx={{ mb: 4 }}>
        <AppTable
            columns={detailColumns}
            rows={rows}
            rowKey={(row) => row.label}
            totalRows={rows.length}
            minWidth={560}
            showHeader={false}
            showPagination={false}
            emptyMessage="No details available"
        />
    </Box>
);

const ViewReportDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const reportRef = useRef();

    useEffect(() => {
        const fetchReportDetails = async () => {
            try {
                setLoading(true);
                const response = await ReportApi.getReport(id);
                console.log('Report data received:', {
                    id: response.data.id,
                    attachmentPaths: response.data.attachmentPaths,
                    hasAttachmentPath: response.data.attachmentPath,
                    allData: response.data
                });
                setReport(response.data);
                setError(null);
            } catch (err) {
                console.error('Error fetching report:', err);
                setError(err.response?.data?.message || 'Failed to fetch report details');
            } finally {
                setLoading(false);
            }
        };

        fetchReportDetails();
    }, [id]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE': return 'success';
            case 'REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE': return 'error';
            case 'REPORT_RETURNED_ASSISTANT_COMMISSIONER': return 'warning';
            case 'REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE': return 'info';
            default: return 'default';
        }
    };

    const getStatusText = (status) => {
        const statusMap = {
            'REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE': 'Approved by Director Intelligence',
            'REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE': 'Rejected by Director',
            'REPORT_RETURNED_ASSISTANT_COMMISSIONER': 'Returned to Assistant Commissioner',
            'REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE': 'Submitted to Director',
            'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER': 'Returned to Intelligence Officer',
            'REPORT_RETURNED_TO_DIRECTOR_INTELLIGENCE': 'Returned to Director Intelligence',
            'REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER': 'Approved by Assistant Commissioner',
            'REPORT_SUBMITTED_TO_DIRECTOR_INVESTIGATION': 'Submitted to Director Investigation',
            'REPORT_PENDING_DIRECTOR_INTELLIGENCE': 'Pending Director Review',
            'REPORT_DRAFT': 'Draft',
            'REPORT_SUBMITTED': 'Submitted'
        };
        return statusMap[status] || status?.replace(/_/g, ' ').toLowerCase() || 'Unknown';
    };

    const handleDownloadAttachment = async (attachmentPath) => {
        if (!attachmentPath || typeof attachmentPath !== 'string' || attachmentPath.trim() === '') return;
        try {
            await ReportApi.downloadAttachment(id, attachmentPath);
        } catch (err) {
            console.error('Download error details:', err);
            setError(err?.response?.data?.message || 'Attachment download failed');
        }
    };

    const handleViewAttachment = async (attachmentPath) => {
        if (!attachmentPath || typeof attachmentPath !== 'string' || attachmentPath.trim() === '') return;

        try {
            await ReportApi.viewAttachment(id, attachmentPath);
        } catch (err) {
            console.error('View attachment error:', err);
            setError(err.response?.data?.message || 'Failed to open attachment');
        }
    };

    const handleDownloadPDF = async () => {
        if (!reportRef.current) return;

        try {
            const input = reportRef.current;
            const canvas = await html2canvas(input, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');

            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Report_Details_${report.id}.pdf`);
        } catch {
            setError('Failed to generate PDF');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    };

    // Helper function to check if taxPayer info exists
    const hasTaxPayerInfo = () => {
        return report?.relatedCase?.tin?.taxPayerName ||
            report?.relatedCase?.tin?.taxPayerTIN ||
            report?.relatedCase?.tin?.taxPayerAddress ||
            report?.relatedCase?.tin?.taxPayerContact;
    };

    const hasInformerInfo = () => {
        return report?.relatedCase?.informerId?.informerName ||
            report?.relatedCase?.informerId?.informerPhoneNum ||
            report?.relatedCase?.informerId?.informerId;
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress size={50} />
            </Box>
        );
    }

    return (
        <Box padding={2}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => navigate(-1)}
                >
                    Back to Report
                </Button>

                <Box display="flex" gap={2}>


                    <Button
                        variant="contained"
                        startIcon={<PictureAsPdf />}
                        onClick={handleDownloadPDF}
                        sx={{ backgroundColor: '#3b74de', '&:hover': { backgroundColor: '#6dbff1' } }}
                    >
                        Download PDF
                    </Button>
                </Box>
            </Box>

            {error && (
                <Box mb={2}>
                    <Alert severity="error" onClose={() => setError(null)}>
                        {error}
                    </Alert>
                </Box>
            )}

            {report && (
                <Paper
                    elevation={3}
                    sx={{
                        p: 3,
                        width: "80%",
                        margin: "auto",
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                    ref={reportRef}
                >
                    {/* Header Section */}
                    <Box sx={{ textAlign: 'center', mb: 4 }}>
                        <Typography variant="h6" fontWeight="bold">
                            <Box
                                component="div"
                                sx={{
                                    width: "100px",
                                    margin: "auto",
                                    mb: 1
                                }}
                            >
                                <img
                                    src="/Images/HomeLogo.jpeg"
                                    alt="logo"
                                    style={{ width: '100%' }}
                                />
                            </Box>
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

                    {/* Report Title and Status */}
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                        <Typography variant="h4">Report Details</Typography>
                        <Chip
                            label={getStatusText(report.status)}
                            color={getStatusColor(report.status)}
                            size="medium"
                        />
                    </Box>

                    <Divider sx={{ my: 3 }} />

                    {/* Report Information Table */}
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                        Report Information
                    </Typography>
                    <DetailTable rows={[
                        { label: 'Report ID', value: report.id },
                        { label: 'Case Number', value: report.relatedCase?.caseNum || '-' },
                        { label: 'Created By', value: report.createdBy || '-' },
                        { label: 'Employee ID', value: report.createdByEmployeeId || '-' },
                        { label: 'Created Date', value: formatDate(report.createdAt) },
                        { label: 'Last Updated', value: formatDate(report.updatedAt) },
                        { label: 'Current Recipient', value: report.currentRecipient || '-' },
                    ]} />

                    {/* Tax Payer Information (if exists) */}
                    {hasTaxPayerInfo() && (
                        <>
                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                                Tax Payer Information
                            </Typography>
                            <DetailTable rows={[
                                { label: 'Tax Payer Name', value: report.relatedCase?.tin?.taxPayerName || '-' },
                                { label: 'TIN', value: report.relatedCase?.tin?.taxPayerTIN || '-' },
                                { label: 'Address', value: report.relatedCase?.tin?.taxPayerAddress || '-' },
                                { label: 'Contact', value: report.relatedCase?.tin?.taxPayerContact || '-' },
                                { label: 'Tax Type', value: report.relatedCase?.taxType || '-' },
                                { label: 'Tax Period', value: report.relatedCase?.taxPeriod || '-' },
                            ]} />
                        </>
                    )}
                    {hasInformerInfo() && (
                        <>
                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                                Informer Information
                            </Typography>
                            <DetailTable rows={[
                                { label: 'Informer Name', value: report.relatedCase?.informerId?.informerName || '-' },
                                { label: 'Informer ID', value: report.relatedCase?.informerId?.informerId || '-' },
                                { label: 'Phone Number', value: report.relatedCase?.informerId?.informerPhoneNum || '-' },
                                { label: 'Email', value: report.relatedCase?.informerId?.informerEmail || '-' },
                                { label: 'Address', value: report.relatedCase?.informerId?.informerAddress || '-' },
                                { label: 'National ID', value: report.relatedCase?.informerId?.nationalId || '-' },
                            ]} />
                        </>
                    )}

                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                        Description
                    </Typography>
                    <Paper elevation={0} sx={{
                        p: 2,
                        backgroundColor: 'grey.50',
                        border: '1px solid',
                        borderColor: 'grey.200',
                        mb: 4,
                        minHeight: '100px'
                    }}>
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                            {report.description || 'No description provided'}
                        </Typography>
                    </Paper>

                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                        Attachments
                    </Typography>
                    <Box sx={{ mb: 4 }}>
                        {report.attachmentPaths && report.attachmentPaths.length > 0 ? (
                            <Box>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                    Number of attachments: {report.attachmentPaths.length}
                                </Typography>
                                <Box display="flex" gap={1.5} flexWrap="wrap">
                                    {report.attachmentPaths.map((attachmentPath, index) => (
                                        <Box
                                            key={`${attachmentPath}-${index}`}
                                            display="flex"
                                            gap={1}
                                            alignItems="center"
                                            sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                                        >
                                            <Typography variant="body2" sx={{ maxWidth: 260, overflowWrap: 'anywhere' }}>
                                                {displayNameFromStored(attachmentPath) || `Attachment ${index + 1}`}
                                            </Typography>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<Visibility />}
                                                onClick={() => handleViewAttachment(attachmentPath)}
                                                
                                            >
                                                View
                                            </Button>
                                            <Button
                                                size="small"
                                                variant="contained"
                                                startIcon={<Download />}
                                                onClick={() => handleDownloadAttachment(attachmentPath)}
                                            >
                                                Download
                                            </Button>
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                        ) : (
                            <Typography variant="body1">No attachments</Typography>
                        )}
                    </Box>

                    <Divider sx={{ my: 3 }} />
                    <Box sx={{ textAlign: 'center', mt: 4 }}>
                        <Typography variant="h6" align="center" sx={{ mb: 1, fontWeight: 'bold' }}>
                            HERE FOR YOU TO SERVE
                        </Typography>
                        <Typography variant="body2" align="center" sx={{ fontStyle: 'italic' }}>
                            Kicukiro-Sonatube-Silverback Mall, P.O.Box 3987 Kigali, Rwanda
                        </Typography>
                        <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                            3004 www.rra.gov.tw @rainfo
                        </Typography>
                    </Box>
                </Paper>
            )}
        </Box>
    );
};

export default ViewReportDetails;
