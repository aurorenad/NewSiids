import React, { useContext, useState, useEffect, useMemo } from 'react';
import {
    IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, CircularProgress, Alert, Box,
    Tooltip, MenuItem, Select, FormControl, InputLabel,
    Typography, Chip,
    LinearProgress
} from "@mui/material";
import {
    Description, Check, Close, Reply,
    ListAlt,
    ArrowUpward, ArrowDownward, CloudUpload,
    Download, Delete, DriveFileRenameOutline
} from "@mui/icons-material";
import { useNavigate } from 'react-router-dom';
import { ROUTES, routeTo } from '../constants/routes';
import { ReportApi } from '../api/Axios/caseApi';
import { AuthContext } from '../context/AuthContext';
import { hasPermission } from '../utils/authorization';
import { PERMISSIONS } from '../constants/permissions';
import ReportSignatureDialog from './ui/ReportSignatureDialog.jsx';
import AppTable from './ui/AppTable.jsx';

const DirectorIntelligence = () => {
    const { authState } = useContext(AuthContext);
    const [searchQuery, setSearchQuery] = useState('');
    const [reports, setReports] = useState([]);
    const [totalReports, setTotalReports] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoadingReports, setActionLoadingReports] = useState(new Set());
    const [currentUser] = useState("Current User");
    const [uploadProgress, setUploadProgress] = useState(0);

    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [returnDialogOpen, setReturnDialogOpen] = useState(false);
    const [infoDialogOpen, setInfoDialogOpen] = useState(false);
    const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);

    const [selectedReport, setSelectedReport] = useState(null);

    const [rejectionReason, setRejectionReason] = useState('');
    const [returnEmployeeId, setReturnEmployeeId] = useState('');
    const [returnReasonText, setReturnReasonText] = useState('');
    const [returnType, setReturnType] = useState('creator');

    // Document attachment states
    const [returnAttachment, setReturnAttachment] = useState(null);
    const [attachmentError, setAttachmentError] = useState('');

    // Pagination state
    const [page, setPage] = useState(0);
    const rowsPerPage = 10;

    // Sorting state
    const [sortOrder, setSortOrder] = useState('desc');

    const navigate = useNavigate();
    const canApproveIntelligence = hasPermission(authState, PERMISSIONS.REPORT_APPROVE_INTELLIGENCE);
    const canReturnReport = hasPermission(authState, PERMISSIONS.REPORT_APPROVE_INTELLIGENCE);

    useEffect(() => {
        fetchReports();
    }, [page, searchQuery, sortOrder]);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const response = await ReportApi.getReportsForDirectorIntelligence({
                page,
                size: rowsPerPage,
                search: searchQuery,
                sort: sortOrder
            });

            const pageData = response.data || {};
            const reportsWithDate = (pageData.content || []).map(report => ({
                ...report,
                createdAt: report.createdAt || report.createdDate || report.dateCreated || new Date().toISOString()
            }));
            setReports(reportsWithDate);
            setTotalReports(pageData.totalElements || 0);
        } catch (err) {
            if (err.response && err.response.status === 403) {
                setError('You do not have permission to access these reports. Please contact your administrator if you believe this is a mistake.');
            } else {
                setError(err.response?.data?.message || 'Failed to fetch reports');
            }
        } finally {
            setLoading(false);
        }
    };

    const setReportLoading = (reportId, isLoading) => {
        setActionLoadingReports(prev => {
            const newSet = new Set(prev);
            if (isLoading) {
                newSet.add(reportId);
            } else {
                newSet.delete(reportId);
            }
            return newSet;
        });
    };

    const handleSortByDate = () => {
        const newSortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
        setSortOrder(newSortOrder);
        setPage(0);
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleApprove = async (report) => {
        setReportLoading(report.id, true);
        try {
            await ReportApi.approveReport(report.id);

            setReports(prev => prev.map(r =>
                r.id === report.id ? {
                    ...r,
                    status: 'REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE',
                    approvedAt: new Date().toISOString(),
                    approvedBy: currentUser
                } : r
            ));
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to approve report');
        } finally {
            setReportLoading(report.id, false);
        }
    };

    const handleOpenRejectDialog = (report) => {
        setSelectedReport(report);
        setRejectionReason('');
        setRejectDialogOpen(true);
    };

    const closeRejectDialog = () => {
        setRejectDialogOpen(false);
        setRejectionReason('');
        setSelectedReport(null);
    };

    const handleConfirmReject = async () => {
        if (!rejectionReason.trim()) {
            setError('Rejection reason is required');
            return;
        }

        if (!selectedReport) {
            setError('No report selected');
            return;
        }

        setReportLoading(selectedReport.id, true);
        try {
            await ReportApi.rejectReport(selectedReport.id, rejectionReason);

            setReports(prev => prev.map(r =>
                r.id === selectedReport.id ? {
                    ...r,
                    status: 'REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE',
                    rejectionReason,
                    rejectedAt: new Date().toISOString(),
                    rejectedBy: currentUser
                } : r
            ));
            closeRejectDialog();
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reject report');
        } finally {
            setReportLoading(selectedReport.id, false);
        }
    };

    const handleOpenReturnDialog = (report) => {
        setSelectedReport(report);
        setReturnEmployeeId('');
        setReturnReasonText('');
        setReturnType('creator');
        setReturnAttachment(null);
        setAttachmentError('');
        setReturnDialogOpen(true);
    };

    const closeReturnDialog = () => {
        setReturnDialogOpen(false);
        setReturnEmployeeId('');
        setReturnReasonText('');
        setReturnAttachment(null);
        setAttachmentError('');
        setUploadProgress(0);
        setSelectedReport(null);
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        const validTypes = [
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/pdf',
            'text/plain'
        ];

        const fileType = file.type;
        const fileName = file.name.toLowerCase();
        const fileExtension = fileName.split('.').pop();

        const validExtensions = ['doc', 'docx', 'pdf', 'txt'];

        if (!validTypes.includes(fileType) && !validExtensions.includes(fileExtension)) {
            setAttachmentError('Please upload a Word document (.doc, .docx), PDF, or text file');
            setReturnAttachment(null);
            return;
        }

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            setAttachmentError('File size must be less than 10MB');
            setReturnAttachment(null);
            return;
        }

        setAttachmentError('');
        setReturnAttachment(file);
    };

    const handleRemoveAttachment = () => {
        setReturnAttachment(null);
        setAttachmentError('');
    };

    const handleDownloadReturnDocument = async (reportId) => {
        try {
            const response = await ReportApi.downloadReturnDocument(reportId);

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // Try to get filename from content-disposition header
            const disposition = response.headers['content-disposition'];
            let filename = 'return-document';
            if (disposition) {
                const filenameMatch = disposition.match(/filename="?(.+)"?/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }

            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            setError('Failed to download return document');
        }
    };

    const handleOpenSignatureDialog = (report) => {
        setSelectedReport(report);
        setSignatureDialogOpen(true);
    };

    const handleSignedReport = (updatedReport) => {
        setReports(prev => prev.map(report =>
            report.id === updatedReport.id ? { ...report, ...updatedReport } : report
        ));
        setError(null);
    };

    const handleDownloadInvestigationReport = async (report) => {
        setReportLoading(report.id, true);
        try {
            const response = await ReportApi.downloadInvestigationReportPdf(report.id);
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `investigation-report-${report.id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to download investigation report');
        } finally {
            setReportLoading(report.id, false);
        }
    };

    const handleConfirmReturn = async () => {
        // Validate that either text or document is provided
        if (!returnAttachment && !returnReasonText.trim()) {
            setError('Please provide either a text reason or upload a document');
            return;
        }

        if (!selectedReport) {
            setError('No report selected');
            return;
        }

        let targetEmployeeId = returnEmployeeId;
        if (returnType === 'creator') {
            targetEmployeeId = selectedReport.createdByEmployeeId || selectedReport.createdBy || '';
        }

        if (!targetEmployeeId?.trim()) {
            setError('Target employee ID is required');
            return;
        }

        setReportLoading(selectedReport.id, true);
        setUploadProgress(0);

        try {
            const responseData = await ReportApi.returnReportWithAttachment(
                selectedReport.id,
                targetEmployeeId,
                returnReasonText || 'Document attached',
                returnAttachment,
                {
                    onUploadProgress: (progressEvent) => {
                        const percentCompleted = progressEvent.total
                            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
                            : 100;
                        setUploadProgress(percentCompleted);
                    }
                }
            );

            // Update local state
            setReports(prev => prev.map(r =>
                r.id === selectedReport.id ? {
                    ...r,
                    status: 'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER',
                    returnReason: returnReasonText || 'Document attached',
                    returnedAt: new Date().toISOString(),
                    returnedBy: currentUser,
                    returnedToEmployeeId: targetEmployeeId,
                    hasReturnDocument: !!returnAttachment,
                    returnDocumentPath: responseData?.returnDocumentPath || null
                } : r
            ));

            closeReturnDialog();
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data || 'Failed to return report');
        } finally {
            setReportLoading(selectedReport.id, false);
            setUploadProgress(0);
        }
    };

    const closeInfoDialog = () => {
        setInfoDialogOpen(false);
        setSelectedReport(null);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE': return 'success';
            case 'REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE': return 'error';
            case 'REPORT_RETURNED_ASSISTANT_COMMISSIONER': return 'warning';
            case 'REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE': return 'info';
            case 'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER': return 'warning';
            default: return 'default';
        }
    };

    const getStatusText = (status) => {
        const statusMap = {
            'REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE': 'Approved by Director Intelligence',
            'REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE': 'Rejected by Director',
            'REPORT_RETURNED_ASSISTANT_COMMISSIONER': 'Returned to Assistant Commissioner',
            'REPORT_RETURNED_INTELLIGENCE_OFFICER': 'Returned to Intelligence Officer',
            'REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE': 'Submitted to Director Intelligence',
            'REPORT_SUBMITTED': 'Submitted',
            'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER': 'Returned'
        };
        return statusMap[status] || status?.replace(/_/g, ' ').toLowerCase() || 'Unknown';
    };

    const isActionDisabled = (report) => {
        const disabledStatuses = [
            'REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE',
            'REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE',
            'REPORT_RETURNED_ASSISTANT_COMMISSIONER',
            'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER'
        ];
        return disabledStatuses.includes(report.status) || actionLoadingReports.has(report.id);
    };

    const isReportLoading = (reportId) => {
        return actionLoadingReports.has(reportId);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return '-';
        }
    };

    const tableColumns = useMemo(() => [
        { key: 'id', label: 'Report ID', render: (report) => report.id },
        { key: 'caseNumber', label: 'Case Number', render: (report) => report.relatedCase?.caseNum || '-' },
        { key: 'createdBy', label: 'Created By', render: (report) => report.createdBy || '-' },
        {
            key: 'createdAt',
            label: 'Created Date',
            render: (report) => formatDate(report.createdAt)
        },
        {
            key: 'status',
            label: 'Status',
            render: (report) => (
                <>
                    <Chip
                        label={getStatusText(report.status)}
                        color={getStatusColor(report.status)}
                        size="small"
                    />
                    {report.hasReturnDocument && (
                        <Tooltip title="Has return document">
                            <Description fontSize="small" sx={{ ml: 1, color: 'action.active' }} />
                        </Tooltip>
                    )}
                </>
            )
        },
        {
            key: 'actions',
            label: 'Actions',
            headerStyle: { textAlign: 'center' },
            cellStyle: { textAlign: 'center' },
            render: (report) => (
                <Box display="flex" gap={0.5} justifyContent="center">
                    <Tooltip title="View Details">
                        <IconButton onClick={() => navigate(routeTo.reportDetails(report.id))} size="small">
                            <Description fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    {canApproveIntelligence && (
                        <Tooltip title="Approve">
                            <span>
                                <IconButton
                                    disabled={isActionDisabled(report)}
                                    onClick={() => handleApprove(report)}
                                    size="small"
                                    color="success"
                                >
                                    {isReportLoading(report.id) ? <CircularProgress size={16} /> : <Check fontSize="small" />}
                                </IconButton>
                            </span>
                        </Tooltip>
                    )}

                    {canApproveIntelligence && (
                        <Tooltip title="Close">
                            <span>
                                <IconButton
                                    disabled={isActionDisabled(report)}
                                    onClick={() => handleOpenRejectDialog(report)}
                                    size="small"
                                    color="error"
                                >
                                    <Close fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                    )}

                    {canReturnReport && (
                        <Tooltip title="Return">
                            <span>
                                <IconButton
                                    disabled={isActionDisabled(report)}
                                    onClick={() => handleOpenReturnDialog(report)}
                                    size="small"
                                    color="warning"
                                >
                                    <Reply fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                    )}

                    {canApproveIntelligence && (
                        <Tooltip title={report.directorSigned ? 'Update director signature' : 'Sign as Director Intelligence'}>
                            <span>
                                <IconButton
                                    disabled={isReportLoading(report.id)}
                                    onClick={() => handleOpenSignatureDialog(report)}
                                    size="small"
                                    color="primary"
                                >
                                    <DriveFileRenameOutline fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                    )}

                    {report.finalised && (
                        <Tooltip title="Download final investigation report">
                            <span>
                                <IconButton
                                    disabled={isReportLoading(report.id)}
                                    onClick={() => handleDownloadInvestigationReport(report)}
                                    size="small"
                                    color="primary"
                                >
                                    <Download fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                    )}

                    {report.returnDocumentPath && (
                        <Tooltip title="Download Return Document">
                            <IconButton onClick={() => handleDownloadReturnDocument(report.id)} size="small" color="primary">
                                <Download fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            )
        }
    ], [reports, actionLoadingReports, canApproveIntelligence, canReturnReport, sortOrder]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress size={50} />
            </Box>
        );
    }

    return (
        <Box padding={2}>
            <Typography variant="h4" gutterBottom>
                Director of Intelligence - Report Management
            </Typography>

            {error && (
                <Box mb={2}>
                    <Alert severity="error" onClose={() => setError(null)}>
                        {error}
                    </Alert>
                </Box>
            )}

            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box display="flex" gap={1} alignItems="center">
                    <Tooltip title={`Sort by creation date (${sortOrder === 'desc' ? 'newest first' : 'oldest first'})`}>
                        <Button
                            variant="outlined"
                            onClick={handleSortByDate}
                            startIcon={sortOrder === 'desc' ? <ArrowDownward /> : <ArrowUpward />}
                        >
                            Date {sortOrder === 'desc' ? '↓' : '↑'}
                        </Button>
                    </Tooltip>

                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<ListAlt />}
                        onClick={() => navigate(ROUTES.DIRECTOR_INTELLIGENCE_CASE_REPORTS)}
                        sx={{ ml: 1 }}
                    >
                        Case Reports
                    </Button>
                </Box>
                <Typography variant="body2" color="text.secondary">
                    {totalReports} report{totalReports !== 1 ? 's' : ''} found
                </Typography>
            </Box>

            <AppTable
                columns={tableColumns}
                rows={reports}
                loading={loading}
                emptyMessage="No reports found"
                searchValue={searchQuery}
                searchPlaceholder="Search by ID, Case Number, Creator, or Status"
                onSearchChange={(value) => {
                    setSearchQuery(value);
                    setPage(0);
                }}
                page={page}
                rowsPerPage={rowsPerPage}
                totalRows={totalReports}
                onPageChange={handleChangePage}
                minWidth={980}
            />

            {/* Reject Dialog */}
            <Dialog open={rejectDialogOpen} onClose={closeRejectDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Reject Report</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Report ID: {selectedReport?.id}
                    </Typography>
                    <TextField
                        fullWidth
                        label="Rejection Reason *"
                        multiline
                        rows={4}
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        margin="normal"
                        required
                        placeholder="Please provide a detailed reason for rejection..."
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeRejectDialog}>Cancel</Button>
                    <Button
                        onClick={handleConfirmReject}
                        color="error"
                        disabled={!rejectionReason.trim() || (selectedReport && isReportLoading(selectedReport.id))}
                    >
                        {selectedReport && isReportLoading(selectedReport.id) ? (
                            <CircularProgress size={20} />
                        ) : (
                            'Reject'
                        )}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Return Dialog */}
            <Dialog open={returnDialogOpen} onClose={closeReturnDialog} maxWidth="md" fullWidth>
                <DialogTitle>Return Report</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Report ID: {selectedReport?.id}
                    </Typography>

                    <FormControl fullWidth margin="normal">
                        <InputLabel>Return To *</InputLabel>
                        <Select
                            value={returnType}
                            onChange={(e) => setReturnType(e.target.value)}
                            label="Return To *"
                        >
                            <MenuItem value="creator">Original Creator</MenuItem>
                            <MenuItem value="employeeId">Specific Employee</MenuItem>
                        </Select>
                    </FormControl>

                    {returnType === 'creator' && selectedReport && (
                        <TextField
                            fullWidth
                            label="Original Creator"
                            value={selectedReport.createdByEmployeeId || selectedReport.createdBy || ''}
                            margin="normal"
                            disabled
                            helperText="Report will be returned to the original creator"
                        />
                    )}

                    {returnType === 'employeeId' && (
                        <TextField
                            fullWidth
                            label="Employee ID *"
                            value={returnEmployeeId}
                            onChange={(e) => setReturnEmployeeId(e.target.value)}
                            margin="normal"
                            required
                            placeholder="Enter employee ID to return the report to"
                        />
                    )}

                    <TextField
                        fullWidth
                        label="Return Reason (Optional Text)"
                        multiline
                        rows={3}
                        value={returnReasonText}
                        onChange={(e) => setReturnReasonText(e.target.value)}
                        margin="normal"
                        placeholder="You can provide a brief text reason or upload a Word document..."
                    />

                    {/* Document Upload Section */}
                    <Box sx={{ mt: 3, mb: 2, p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            Upload Return Document (Optional)
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                            Supported formats: .doc, .docx, .pdf, .txt (Max 10MB)
                        </Typography>

                        {!returnAttachment ? (
                            <Box sx={{ mt: 2 }}>
                                <input
                                    accept=".doc,.docx,.pdf,.txt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                    style={{ display: 'none' }}
                                    id="return-attachment-upload"
                                    type="file"
                                    onChange={handleFileUpload}
                                />
                                <label htmlFor="return-attachment-upload">
                                    <Button
                                        variant="outlined"
                                        component="span"
                                        startIcon={<CloudUpload />}
                                        fullWidth
                                    >
                                        Choose File
                                    </Button>
                                </label>
                            </Box>
                        ) : (
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Description />
                                        <Box>
                                            <Typography variant="body2">
                                                {returnAttachment.name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {(returnAttachment.size / 1024).toFixed(2)} KB
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <IconButton
                                        size="small"
                                        onClick={handleRemoveAttachment}
                                        color="error"
                                    >
                                        <Delete />
                                    </IconButton>
                                </Box>
                            </Box>
                        )}

                        {attachmentError && (
                            <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                                {attachmentError}
                            </Typography>
                        )}

                        {uploadProgress > 0 && (
                            <Box sx={{ mt: 2 }}>
                                <LinearProgress variant="determinate" value={uploadProgress} />
                                <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                                    Uploading: {uploadProgress}%
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="caption">
                            Note: You must provide either a text reason or upload a document. Both can be provided for more detail.
                        </Typography>
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeReturnDialog}>Cancel</Button>
                    <Button
                        onClick={handleConfirmReturn}
                        color="warning"
                        variant="contained"
                        disabled={
                            (!returnAttachment && !returnReasonText.trim()) ||
                            (selectedReport && isReportLoading(selectedReport.id)) ||
                            (returnType === 'employeeId' && !returnEmployeeId.trim())
                        }
                    >
                        {selectedReport && isReportLoading(selectedReport.id) ? (
                            <CircularProgress size={20} color="inherit" />
                        ) : (
                            'Return Report'
                        )}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Info Dialog */}
            <Dialog open={infoDialogOpen} onClose={closeInfoDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Report Information</DialogTitle>
                <DialogContent>
                    <Box sx={{ '& > *': { mb: 1 } }}>
                        <Typography variant="body2">
                            <strong>Report ID:</strong> {selectedReport?.id || '-'}
                        </Typography>
                        <Typography variant="body2">
                            <strong>Case Number:</strong> {selectedReport?.relatedCase?.caseNum || '-'}
                        </Typography>
                        <Typography variant="body2">
                            <strong>Created By:</strong> {selectedReport?.createdBy || '-'}
                        </Typography>
                        <Typography variant="body2">
                            <strong>Employee ID:</strong> {selectedReport?.createdByEmployeeId || '-'}
                        </Typography>
                        <Typography variant="body2">
                            <strong>Created Date:</strong> {selectedReport?.createdAt ? formatDate(selectedReport.createdAt) : '-'}
                        </Typography>
                        <Typography variant="body2">
                            <strong>Status:</strong> {selectedReport ? getStatusText(selectedReport.status) : '-'}
                        </Typography>
                        {selectedReport?.approvedBy && (
                            <Typography variant="body2">
                                <strong>Approved By:</strong> {selectedReport.approvedBy} on {formatDate(selectedReport.approvedAt)}
                            </Typography>
                        )}
                        {selectedReport?.rejectedBy && (
                            <Typography variant="body2">
                                <strong>Rejected By:</strong> {selectedReport.rejectedBy} on {formatDate(selectedReport.rejectedAt)}
                            </Typography>
                        )}
                        {selectedReport?.rejectionReason && (
                            <Typography variant="body2">
                                <strong>Rejection Reason:</strong> {selectedReport.rejectionReason}
                            </Typography>
                        )}
                        {selectedReport?.returnedBy && (
                            <Typography variant="body2">
                                <strong>Returned By:</strong> {selectedReport.returnedBy} on {formatDate(selectedReport.returnedAt)}
                            </Typography>
                        )}
                        {selectedReport?.returnReason && (
                            <Typography variant="body2">
                                <strong>Return Reason:</strong> {selectedReport.returnReason}
                            </Typography>
                        )}
                        {selectedReport?.hasReturnDocument && (
                            <Typography variant="body2">
                                <strong>Return Document:</strong> Available for download
                            </Typography>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeInfoDialog}>Close</Button>
                </DialogActions>
            </Dialog>

            <ReportSignatureDialog
                open={signatureDialogOpen}
                report={selectedReport}
                role="DIRECTOR_INTELLIGENCE"
                title="Director Intelligence Signature"
                onClose={() => setSignatureDialogOpen(false)}
                onSigned={handleSignedReport}
            />
        </Box>
    );
};

export default DirectorIntelligence;
