// ViewReportDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Typography, Paper, Button, CircularProgress,
    Alert, Chip, Divider, List, ListItem, ListItemText
} from '@mui/material';
import { Description, ArrowBack } from '@mui/icons-material';
import { ReportApi } from '../api/Axios/caseApi';

const ViewReportDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchReportDetails = async () => {
            try {
                setLoading(true);
                const response = await ReportApi.getReport(id);
                setReport(response.data);
                setError(null);
            } catch (err) {
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
            await ReportApi.downloadAttachment(id);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to download attachment');
        }
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
            <Button
                startIcon={<ArrowBack />}
                onClick={() => navigate(-1)}
                sx={{ mb: 2 }}
            >
                Back to Reports
            </Button>

            {error && (
                <Box mb={2}>
                    <Alert severity="error" onClose={() => setError(null)}>
                        {error}
                    </Alert>
                </Box>
            )}

            {report && (
                <Paper sx={{ p: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h4">Report Details</Typography>
                        <Chip
                            label={getStatusText(report.status)}
                            color={getStatusColor(report.status)}
                        />
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <List>
                        <ListItem>
                            <ListItemText
                                primary="Report ID"
                                secondary={report.id}
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemText
                                primary="Case Number"
                                secondary={report.relatedCase?.caseNum || '-'}
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemText
                                primary="Created By"
                                secondary={report.createdBy || '-'}
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemText
                                primary="Employee ID"
                                secondary={report.createdByEmployeeId || '-'}
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemText
                                primary="Created Date"
                                secondary={new Date(report.createdAt).toLocaleString()}
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemText
                                primary="Description"
                                secondary={report.description || '-'}
                                secondaryTypographyProps={{ whiteSpace: 'pre-line' }}
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemText
                                primary="Attachment"
                                secondary={
                                    report.attachmentPath ? (
                                        <Button
                                            variant="outlined"
                                            startIcon={<Description />}
                                            onClick={handleDownloadAttachment}
                                        >
                                            Download Attachment
                                        </Button>
                                    ) : 'No attachment'
                                }
                            />
                        </ListItem>
                    </List>

                    {report.rejectionReason && (
                        <>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="h6">Rejection Details</Typography>
                            <List>
                                <ListItem>
                                    <ListItemText
                                        primary="Rejected By"
                                        secondary={report.rejectedBy || '-'}
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemText
                                        primary="Rejection Date"
                                        secondary={report.rejectedAt ? new Date(report.rejectedAt).toLocaleString() : '-'}
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemText
                                        primary="Rejection Reason"
                                        secondary={report.rejectionReason || '-'}
                                        secondaryTypographyProps={{ whiteSpace: 'pre-line' }}
                                    />
                                </ListItem>
                            </List>
                        </>
                    )}

                    {report.returnReason && (
                        <>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="h6">Return Details</Typography>
                            <List>
                                <ListItem>
                                    <ListItemText
                                        primary="Returned By"
                                        secondary={report.returnedBy || '-'}
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemText
                                        primary="Returned To"
                                        secondary={report.returnedToEmployeeId || '-'}
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemText
                                        primary="Return Date"
                                        secondary={report.returnedAt ? new Date(report.returnedAt).toLocaleString() : '-'}
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemText
                                        primary="Return Reason"
                                        secondary={report.returnReason || '-'}
                                        secondaryTypographyProps={{ whiteSpace: 'pre-line' }}
                                    />
                                </ListItem>
                            </List>
                        </>
                    )}
                </Paper>
            )}
        </Box>
    );
};

export default ViewReportDetails;