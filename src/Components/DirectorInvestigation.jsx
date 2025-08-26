import React, { useState, useEffect } from 'react';
import {
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    CircularProgress,
    Snackbar,
    Alert,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Typography,
    Box,
    Tooltip,
    List,
    ListItem,
    ListItemText,
    Divider
} from "@mui/material";
import { Check, Close, Description, Search, Visibility, Download } from "@mui/icons-material";
import { useNavigate, Link } from "react-router-dom";
import { ReportApi, InvestigationApi } from './../api/Axios/caseApi';

const DirectorInvestigation = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [cases, setCases] = useState([]);
    const [officers, setOfficers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [officersLoading, setOfficersLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [selectedCase, setSelectedCase] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [viewFindingsDialogOpen, setViewFindingsDialogOpen] = useState(false);
    const [viewReportDialogOpen, setViewReportDialogOpen] = useState(false);
    const [currentFindings, setCurrentFindings] = useState(null);
    const [currentReport, setCurrentReport] = useState(null);
    const [downloadLoading, setDownloadLoading] = useState(false);
    const [downloadAttachmentIndex, setDownloadAttachmentIndex] = useState(null);
    const [assignmentNotes, setAssignmentNotes] = useState('');
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [selectedOfficer, setSelectedOfficer] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [reportsResponse, officersResponse] = await Promise.all([
                    ReportApi.getReportsForDirectorInvestigation(),
                    InvestigationApi.getAvailableOfficers()
                ]);

                const mappedCases = reportsResponse.data.map(report => ({
                    id: report.relatedCase?.caseNum || `CS${report.id}`,
                    delegate: report.assignedOfficer?.employeeId || '',
                    delegateName: report.assignedOfficer ?
                        `${report.assignedOfficer.givenName} ${report.assignedOfficer.familyName}` : '',
                    reportedDate: new Date(report.createdAt).toLocaleDateString(),
                    status: report.status || 'Approved by Assistant Commissioner',
                    reason: report.rejectionReason || '',
                    reportId: report.id,
                    caseId: report.relatedCase?._id,
                    isAssigned: !!report.assignedOfficer,
                    hasFindings: report.findings || report.recommendations ||
                        (report.findingsAttachmentPaths && report.findingsAttachmentPaths.length > 0),
                    assignmentNotes: report.assignmentNotes || ''
                }));

                const mappedOfficers = officersResponse.data.map(officer => ({
                    _id: officer.employeeId,
                    name: `${officer.givenName} ${officer.familyName}`,
                    email: officer.email || '',
                    ...officer
                }));

                setCases(mappedCases);
                setOfficers(mappedOfficers);
            } catch (err) {
                console.error('Error:', err);
                setSnackbar({
                    open: true,
                    message: err.response?.data?.message || 'Failed to load data',
                    severity: 'error'
                });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleAssignOfficer = async (reportId, officerId, notes) => {
        if (!officerId) {
            setSnackbar({
                open: true,
                message: 'Please select an officer first',
                severity: 'warning'
            });
            return;
        }

        try {
            setOfficersLoading(true);
            await ReportApi.assignToInvestigationOfficer(reportId, officerId, notes);

            const assignedOfficer = officers.find(o => o._id === officerId);
            setCases(prevCases => prevCases.map(c =>
                c.reportId === reportId ? {
                    ...c,
                    delegate: officerId,
                    delegateName: assignedOfficer?.name || '',
                    isAssigned: true,
                    status: 'Assigned to Officer',
                    assignmentNotes: notes || ''
                } : c
            ));

            setSnackbar({
                open: true,
                message: 'Officer assigned successfully',
                severity: 'success'
            });
        } catch (err) {
            console.error('Error:', err);
            setSnackbar({
                open: true,
                message: err.response?.data?.message || 'Failed to assign officer',
                severity: 'error'
            });
        } finally {
            setOfficersLoading(false);
            setAssignmentNotes('');
            setSelectedOfficer(null);
        }
    };

    const handleApprove = async (reportId) => {
        try {
            setOfficersLoading(true);
            await ReportApi.approveReport(reportId);

            setCases(prevCases => prevCases.map(c =>
                c.reportId === reportId ? {
                    ...c,
                    status: 'Approved by Director of Investigation',
                    reason: ''
                } : c
            ));

            setSnackbar({
                open: true,
                message: 'Report approved successfully',
                severity: 'success'
            });
        } catch (err) {
            console.error('Error:', err);
            setSnackbar({
                open: true,
                message: err.response?.data?.message || 'Failed to approve report',
                severity: 'error'
            });
        } finally {
            setOfficersLoading(false);
        }
    };

    const handleReject = async () => {
        if (!selectedCase) return;

        try {
            await ReportApi.rejectReport(selectedCase.reportId, rejectionReason);

            setCases(prevCases => prevCases.map(c =>
                c.reportId === selectedCase.reportId ? {
                    ...c,
                    status: 'Rejected by Director of Investigation',
                    reason: rejectionReason
                } : c
            ));

            setSnackbar({
                open: true,
                message: 'Report rejected successfully',
                severity: 'success'
            });
            setRejectDialogOpen(false);
        } catch (err) {
            console.error('Error:', err);
            setSnackbar({
                open: true,
                message: err.response?.data?.message || 'Failed to reject report',
                severity: 'error'
            });
        }
    };

    const handleViewFindings = async (caseItem) => {
        try {
            setLoading(true);
            const response = await ReportApi.getFindings(caseItem.reportId, {
                headers: {
                    'employee_id': localStorage.getItem('employeeId') || sessionStorage.getItem('employeeId')
                }
            });
            setCurrentFindings({
                findings: response.data.findings,
                recommendations: response.data.recommendations,
                attachments: response.data.findingsAttachmentPaths || []
            });
            setSelectedCase(caseItem);
            setViewFindingsDialogOpen(true);
        } catch (err) {
            console.error('Error fetching findings:', err);
            setSnackbar({
                open: true,
                message: err.response?.data?.message || 'Failed to load findings',
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleViewReport = async (caseItem) => {
        try {
            setLoading(true);
            const response = await ReportApi.getReport(caseItem.reportId);
            setCurrentReport(response.data);
            setSelectedCase(caseItem);
            setViewReportDialogOpen(true);
        } catch (err) {
            console.error('Error fetching report:', err);
            setSnackbar({
                open: true,
                message: 'Failed to load report',
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadAttachment = async (reportId, attachmentIndex) => {
        try {
            setDownloadLoading(true);
            setDownloadAttachmentIndex(attachmentIndex);

            const filename = currentFindings.attachments[attachmentIndex];
            const response = await ReportApi.downloadFindingsAttachment(reportId, filename);

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // Extract filename from content disposition if available
            const contentDisposition = response.headers['content-disposition'];
            let downloadFilename = filename;
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                if (filenameMatch) downloadFilename = filenameMatch[1];
            }

            link.setAttribute('download', downloadFilename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error downloading attachment:', err);

        } finally {
            setDownloadLoading(false);
            setDownloadAttachmentIndex(null);
        }
    };

    const filteredCases = cases.filter(caseItem =>
        caseItem.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        caseItem.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
        caseItem.delegateName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading && !viewFindingsDialogOpen && !viewReportDialogOpen) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <div style={{ padding: "20px" }}>
            <Typography variant="h4" gutterBottom>
                Director of Investigation - Case Management
            </Typography>

            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <TextField
                    label="Search cases"
                    variant="outlined"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: <Search />,
                    }}
                    sx={{ minWidth: 300 }}
                />
                <Typography variant="body2" color="text.secondary">
                    Total Cases: {filteredCases.length}
                </Typography>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow style={{ backgroundColor: "#f5f5f5" }}>
                            <TableCell><strong>Case ID</strong></TableCell>
                            <TableCell><strong>Assign Officer</strong></TableCell>
                            <TableCell><strong>Current Officer</strong></TableCell>
                            <TableCell><strong>Reported Date</strong></TableCell>
                            <TableCell><strong>Status</strong></TableCell>
                            <TableCell><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredCases.map((caseItem) => (
                            <TableRow key={caseItem.id}>
                                <TableCell>{caseItem.id}</TableCell>
                                <TableCell>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Select Officer</InputLabel>
                                        <Select
                                            value={caseItem.delegate}
                                            onChange={(e) => {
                                                setCases(prev => prev.map(c =>
                                                    c.reportId === caseItem.reportId ? {
                                                        ...c,
                                                        delegate: e.target.value
                                                    } : c
                                                ));
                                            }}
                                            disabled={caseItem.status.includes("Approved") ||
                                                caseItem.status.includes("Rejected") ||
                                                caseItem.status.includes("INVESTIGATION_COMPLETED")}
                                        >
                                            <MenuItem value=""><em>None</em></MenuItem>
                                            {officers.map((officer) => (
                                                <MenuItem key={officer._id} value={officer._id}>
                                                    {officer.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </TableCell>
                                <TableCell>
                                    {caseItem.isAssigned ? (
                                        <Typography color="success.main">{caseItem.delegateName}</Typography>
                                    ) : (
                                        <Typography color="text.secondary">{caseItem.investigationOfficer}</Typography>
                                    )}
                                </TableCell>
                                <TableCell>{caseItem.reportedDate}</TableCell>
                                <TableCell>
                                    <Typography
                                        sx={{
                                            color: caseItem.status.includes("Approved") ? "green" :
                                                caseItem.status.includes("Rejected") ? "red" :
                                                    caseItem.status.includes("INVESTIGATION_COMPLETED") ? "blue" : "inherit",
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        {caseItem.status}
                                    </Typography>
                                    {caseItem.reason && (
                                        <Typography variant="caption" color="error">
                                            Reason: {caseItem.reason}
                                        </Typography>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Box display="flex" gap={1}>
                                        <Tooltip title="View Report">
                                            <IconButton
                                                color="primary"
                                                size="small"
                                                onClick={() => handleViewReport(caseItem)}
                                            >
                                                <Description />
                                            </IconButton>
                                        </Tooltip>
                                        {caseItem.hasFindings && (
                                            <Tooltip title="View Findings">
                                                <IconButton
                                                    color="info"
                                                    size="small"
                                                    onClick={() => handleViewFindings(caseItem)}
                                                >
                                                    <Visibility />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        <IconButton
                                            color="success"
                                            size="small"
                                            onClick={() => handleApprove(caseItem.reportId)}
                                            disabled={caseItem.status.includes("Approved") ||
                                                caseItem.status.includes("Rejected") ||
                                                caseItem.status.includes("INVESTIGATION_COMPLETED")}
                                        >
                                            <Check />
                                        </IconButton>
                                        <IconButton
                                            color="primary"
                                            size="small"
                                            onClick={() => {
                                                setSelectedCase(caseItem);
                                                setSelectedOfficer(caseItem.delegate);
                                                setAssignDialogOpen(true);
                                            }}
                                            disabled={!caseItem.delegate ||
                                                caseItem.status.includes("Approved") ||
                                                caseItem.status.includes("Rejected") ||
                                                caseItem.status.includes("INVESTIGATION_COMPLETED")}
                                        >
                                            Assign
                                        </IconButton>
                                        <IconButton
                                            color="error"
                                            size="small"
                                            onClick={() => {
                                                setSelectedCase(caseItem);
                                                setRejectDialogOpen(true);
                                            }}
                                            disabled={caseItem.status.includes("Approved") ||
                                                caseItem.status.includes("Rejected") ||
                                                caseItem.status.includes("INVESTIGATION_COMPLETED")}
                                        >
                                            <Close />
                                        </IconButton>
                                        <Tooltip title="View Full Findings">
                                            <IconButton
                                                color="info"
                                                size="small"
                                                component={Link}
                                                to={`/reports/${caseItem.reportId}/findings`}
                                            >
                                                <Visibility />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Assign Officer Dialog */}
            <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)}>
                <DialogTitle>Assign Investigation Officer</DialogTitle>
                <DialogContent>
                    <Typography gutterBottom>Case ID: {selectedCase?.id}</Typography>

                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Select Officer</InputLabel>
                        <Select
                            value={selectedOfficer || ''}
                            onChange={(e) => setSelectedOfficer(e.target.value)}
                            label="Select Officer"
                        >
                            <MenuItem value=""><em>None</em></MenuItem>
                            {officers.map((officer) => (
                                <MenuItem key={officer._id} value={officer._id}>
                                    {officer.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <TextField
                        autoFocus
                        margin="dense"
                        label="Assignment Instructions"
                        fullWidth
                        multiline
                        rows={4}
                        value={assignmentNotes}
                        onChange={(e) => setAssignmentNotes(e.target.value)}
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setAssignDialogOpen(false);
                        setAssignmentNotes('');
                        setSelectedOfficer(null);
                    }}>Cancel</Button>
                    <Button
                        onClick={() => {
                            handleAssignOfficer(selectedCase.reportId, selectedOfficer, assignmentNotes);
                            setAssignDialogOpen(false);
                        }}
                        color="primary"
                        disabled={!selectedOfficer}
                    >
                        Assign
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)}>
                <DialogTitle>Reject Report</DialogTitle>
                <DialogContent>
                    <Typography gutterBottom>Case ID: {selectedCase?.id}</Typography>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Rejection Reason"
                        fullWidth
                        multiline
                        rows={4}
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleReject}
                        color="error"
                        disabled={!rejectionReason.trim()}
                    >
                        Reject
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Report Details Dialog */}
            <Dialog
                open={viewReportDialogOpen}
                onClose={() => setViewReportDialogOpen(false)}
                fullWidth
                maxWidth="md"
            >
                <DialogTitle>Report Details - Case {selectedCase?.id}</DialogTitle>
                <DialogContent>
                    {loading ? (
                        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                            <CircularProgress />
                        </Box>
                    ) : (
                        <>
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6" gutterBottom>Description:</Typography>
                                <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                                    {currentReport?.description || 'No description available'}
                                </Typography>
                            </Box>

                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6" gutterBottom>Status:</Typography>
                                <Typography variant="body1">
                                    {currentReport?.status || 'No status available'}
                                </Typography>
                            </Box>

                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6" gutterBottom>Created By:</Typography>
                                <Typography variant="body1">
                                    {currentReport?.createdBy || 'Unknown'}
                                </Typography>
                            </Box>

                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6" gutterBottom>Created At:</Typography>
                                <Typography variant="body1">
                                    {currentReport?.createdAt ? new Date(currentReport.createdAt).toLocaleString() : 'Unknown'}
                                </Typography>
                            </Box>

                            {currentReport?.attachmentPath && (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="h6" gutterBottom>Attachment:</Typography>
                                    <Button
                                        variant="outlined"
                                        startIcon={<Download />}
                                        onClick={() => {
                                            const filename = currentReport.attachmentPath.split('/').pop();
                                            ReportApi.downloadAttachment(currentReport.id, filename);
                                        }}
                                        disabled={downloadLoading}
                                    >
                                        {downloadLoading ? 'Downloading...' : 'Download Attachment'}
                                    </Button>
                                </Box>
                            )}
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setViewReportDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={viewFindingsDialogOpen}
                onClose={() => setViewFindingsDialogOpen(false)}
                fullWidth
                maxWidth="md"
            >
                <DialogTitle>
                    Investigation Findings - Case {selectedCase?.id}
                </DialogTitle>
                <DialogContent>
                    {loading ? (
                        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                            <CircularProgress />
                        </Box>
                    ) : (
                        <>
                            {selectedCase?.assignmentNotes && (
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                                        Assignment Instructions
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    <Paper elevation={0} sx={{ p: 2, backgroundColor: '#f9f9f9', borderRadius: 2 }}>
                                        <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                                            {selectedCase.assignmentNotes}
                                        </Typography>
                                    </Paper>
                                </Box>
                            )}

                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                                    Findings
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                                {currentFindings?.findings ? (
                                    <Paper elevation={0} sx={{ p: 2, backgroundColor: '#f9f9f9', borderRadius: 2 }}>
                                        <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                                            {currentFindings.findings}
                                        </Typography>
                                    </Paper>
                                ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                        No findings submitted
                                    </Typography>
                                )}
                            </Box>

                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                                    Recommendations
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                                {currentFindings?.recommendations ? (
                                    <Paper elevation={0} sx={{ p: 2, backgroundColor: '#f9f9f9', borderRadius: 2 }}>
                                        <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                                            {currentFindings.recommendations}
                                        </Typography>
                                    </Paper>
                                ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                        No recommendations submitted
                                    </Typography>
                                )}
                            </Box>

                            {currentFindings?.attachments?.length > 0 && (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                                        Attachments ({currentFindings.attachments.length})
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    <List>
                                        {currentFindings.attachments.map((attachment, index) => (
                                            <ListItem
                                                key={index}
                                                sx={{
                                                    border: '1px solid #e0e0e0',
                                                    borderRadius: 1,
                                                    mb: 1,
                                                    '&:hover': {
                                                        backgroundColor: '#f5f5f5'
                                                    }
                                                }}
                                                secondaryAction={
                                                    <Tooltip title="Download">
                                                        <IconButton
                                                            edge="end"
                                                            onClick={() => handleDownloadAttachment(selectedCase.reportId, index)}
                                                            disabled={downloadLoading && downloadAttachmentIndex === index}
                                                        >
                                                            {downloadLoading && downloadAttachmentIndex === index ?
                                                                <CircularProgress size={24} /> :
                                                                <Download />
                                                            }
                                                        </IconButton>
                                                    </Tooltip>
                                                }
                                            >
                                                <ListItemText
                                                    primary={
                                                        <Typography variant="body1">
                                                            {attachment.substring(attachment.indexOf('_') + 1)}
                                                        </Typography>
                                                    }
                                                    secondary={`Attachment ${index + 1}`}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                </Box>
                            )}
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setViewFindingsDialogOpen(false)}
                        variant="contained"
                        color="primary"
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({...snackbar, open: false})}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar({...snackbar, open: false})}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </div>
    );
};

export default DirectorInvestigation;