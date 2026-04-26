import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Typography, Paper, Button, CircularProgress,
    Alert, Chip, Divider, Table, TableBody, TableCell, TableRow
} from '@mui/material';
import { Description, ArrowBack, PictureAsPdf } from '@mui/icons-material';
import { ReportApi } from '../api/Axios/caseApi';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
            'REPORT_PENDING_DIRECTOR_INTELLIGENCE': 'Pending Director Review',
            'REPORT_DRAFT': 'Draft',
            'REPORT_SUBMITTED': 'Submitted'
        };
        return statusMap[status] || status.replace(/_/g, ' ').toLowerCase();
    };

    const handleDownloadAttachment = async () => {
        try {
            if (!report?.attachmentPaths || report.attachmentPaths.length === 0) {
                setError('No attachment available');
                return;
            }

            // Get the first attachment
            const attachmentPath = report.attachmentPaths[0];

            // Check if it's a valid filename
            if (!attachmentPath || typeof attachmentPath !== 'string' || attachmentPath.trim() === '') {
                setError('Invalid attachment filename');
                return;
            }

            console.log('Downloading attachment:', {
                reportId: id,
                filename: attachmentPath,
                allAttachments: report.attachmentPaths
            });

            // Use the stored filename directly (it should be the UUID_filename.pdf format)
            await ReportApi.downloadAttachment(id, attachmentPath);

        } catch (err) {
            console.error('Download error details:', {
                error: err,
                response: err.response,
                message: err.message
            });

            // Try to extract more specific error message
            let errorMessage = 'Failed to download attachment';
            if (err.response) {
                if (err.response.status === 404) {
                    errorMessage = 'File not found on server';
                } else if (err.response.status === 403) {
                    errorMessage = 'Permission denied to download this file';
                } else if (err.response.status === 500) {
                    errorMessage = 'Server error while downloading file';
                } else if (err.response.data?.message) {
                    errorMessage = err.response.data.message;
                }
            } else if (err.message) {
                errorMessage = err.message;
            }

            setError(errorMessage);
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
                    Back to Reports
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
                    <Table sx={{ mb: 4 }}>
                        <TableBody>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', width: '30%' }}>Report ID</TableCell>
                                <TableCell>{report.id}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Case Number</TableCell>
                                <TableCell>{report.relatedCase?.caseNum || '-'}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Created By</TableCell>
                                <TableCell>{report.createdBy || '-'}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Employee ID</TableCell>
                                <TableCell>{report.createdByEmployeeId || '-'}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Created Date</TableCell>
                                <TableCell>{formatDate(report.createdAt)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Last Updated</TableCell>
                                <TableCell>{formatDate(report.updatedAt)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Current Recipient</TableCell>
                                <TableCell>{report.currentRecipient || '-'}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>

                    {/* Tax Payer Information (if exists) */}
                    {hasTaxPayerInfo() && (
                        <>
                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                                Tax Payer Information
                            </Typography>
                            <Table sx={{ mb: 4 }}>
                                <TableBody>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold', width: '30%' }}>Tax Payer Name</TableCell>
                                        <TableCell>{report.relatedCase?.tin?.taxPayerName || '-'}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold' }}>TIN</TableCell>
                                        <TableCell>{report.relatedCase?.tin?.taxPayerTIN || '-'}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Address</TableCell>
                                        <TableCell>{report.relatedCase?.tin?.taxPayerAddress || '-'}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Contact</TableCell>
                                        <TableCell>{report.relatedCase?.tin?.taxPayerContact || '-'}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Tax Type</TableCell>
                                        <TableCell>{report.relatedCase?.taxType || '-'}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Tax Period</TableCell>
                                        <TableCell>{report.relatedCase?.taxPeriod || '-'}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </>
                    )}
                    {hasInformerInfo() && (
                        <>
                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                                Informer Information
                            </Typography>
                            <Table sx={{ mb: 4 }}>
                                <TableBody>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold', width: '30%' }}>Informer Name</TableCell>
                                        <TableCell>{report.relatedCase?.informerId?.informerName || '-'}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Informer ID</TableCell>
                                        <TableCell>{report.relatedCase?.informerId?.informerId || '-'}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Phone Number</TableCell>
                                        <TableCell>{report.relatedCase?.informerId?.informerPhoneNum || '-'}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                                        <TableCell>{report.relatedCase?.informerId?.informerEmail || '-'}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Address</TableCell>
                                        <TableCell>{report.relatedCase?.informerId?.informerAddress || '-'}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold' }}>National ID</TableCell>
                                        <TableCell>{report.relatedCase?.informerId?.nationalId || '-'}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
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
                                <Typography variant="body2" sx={{ mb: 2, fontFamily: 'monospace', backgroundColor: '#f5f5f5', p: 1, borderRadius: 1 }}>
                                    Filename: {report.attachmentPaths[0]}
                                </Typography>
                                <Button
                                    variant="outlined"
                                    startIcon={<Description />}
                                    onClick={handleDownloadAttachment}
                                >
                                    Download Attachment
                                </Button>
                            </Box>
                        ) : (
                            <Typography variant="body1">No attachments</Typography>
                        )}
                    </Box>

                    <Divider sx={{ my: 3 }} />
                    <Box sx={{ textAlign: 'center', mt: 4 }}>
                        <Typography variant="h6" align="center" sx={{ mb: 1, fontWeight: 'bold' }}>
                            HEREFOR YOU TO SERVE
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