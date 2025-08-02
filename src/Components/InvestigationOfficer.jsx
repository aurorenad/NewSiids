import React, { useState, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    TextField,
    IconButton,
    Button,
    Typography,
    Box,
    CircularProgress,
    Snackbar,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    MenuItem,
    Tooltip,
    Chip,
    DialogContentText,
    Input,
    FormControl,
    InputLabel,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider
} from "@mui/material";
import {
    Search,
    Description,
    Send,
    Check,
    ArrowBack,
    AttachFile,
    Delete,
    NoteAdd
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { ReportApi } from "./../api/Axios/caseApi";

const InvestigationOfficer = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: "",
        severity: "success"
    });
    const [selectedReport, setSelectedReport] = useState(null);
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [statusUpdate, setStatusUpdate] = useState("");
    const [notes, setNotes] = useState("");
    const [findingsDialogOpen, setFindingsDialogOpen] = useState(false);
    const [findings, setFindings] = useState("");
    const [recommendations, setRecommendations] = useState("");
    const [attachments, setAttachments] = useState([]);
    const [attachmentPreviews, setAttachmentPreviews] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAssignedReports = async () => {
            try {
                setLoading(true);
                const response = await ReportApi.getAssignedReportsForInvestigationOfficer();
                const formattedReports = response.data.map(report => ({
                    id: report.id || '',
                    caseId: report.relatedCase?.caseNum || 'N/A',
                    status: report.relatedCase?.status || 'Pending',
                    reportedDate: report.createdAt || 'N/A',
                    principleAmount: report.principleAmount || 0,
                    penaltiesAmount: report.penaltiesAmount || 0,
                    notes: report.notes || '',
                    ...report
                }));
                setReports(formattedReports);
            } catch (err) {
                console.error("Error fetching assigned reports:", err);
                setError(err.message);
                setSnackbar({
                    open: true,
                    message: "Failed to fetch assigned reports",
                    severity: "error"
                });
            } finally {
                setLoading(false);
            }
        };

        fetchAssignedReports();

        return () => {
            // Clean up object URLs
            attachmentPreviews.forEach(preview => {
                if (preview.url) URL.revokeObjectURL(preview.url);
            });
        };
    }, []);

    const handleStatusUpdate = async () => {
        if (!selectedReport || !statusUpdate) return;

        try {
            await ReportApi.updateInvestigationStatus(
                selectedReport.id,
                statusUpdate,
                notes
            );

            setSnackbar({
                open: true,
                message: "Status updated successfully",
                severity: "success"
            });

            setReports(prev =>
                prev.map(report =>
                    report.id === selectedReport.id
                        ? {
                            ...report,
                            status: statusUpdate,
                            notes,
                            relatedCase: {
                                ...report.relatedCase,
                                status: statusUpdate
                            }
                        }
                        : report
                )
            );

            handleCloseStatusDialog();
        } catch (err) {
            console.error("Error updating status:", err);
            setSnackbar({
                open: true,
                message: "Failed to update status",
                severity: "error"
            });
        }
    };

    const handleOpenFindingsDialog = (report) => {
        setSelectedReport(report);
        setFindingsDialogOpen(true);
    };

    const handleCloseFindingsDialog = () => {
        setFindingsDialogOpen(false);
        setFindings("");
        setRecommendations("");
        setAttachments([]);
        setAttachmentPreviews([]);
    };

    const handleCloseStatusDialog = () => {
        setStatusDialogOpen(false);
        setStatusUpdate("");
        setNotes("");
    };

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        setAttachments([...attachments, ...files]);

        // Create previews for images
        const newPreviews = files.map(file => {
            if (file.type.startsWith('image/')) {
                return {
                    name: file.name,
                    url: URL.createObjectURL(file),
                    type: 'image'
                };
            }
            return {
                name: file.name,
                url: null,
                type: 'file'
            };
        });
        setAttachmentPreviews([...attachmentPreviews, ...newPreviews]);
    };

    const removeAttachment = (index) => {
        const newAttachments = [...attachments];
        newAttachments.splice(index, 1);
        setAttachments(newAttachments);

        const newPreviews = [...attachmentPreviews];
        if (newPreviews[index]?.url) {
            URL.revokeObjectURL(newPreviews[index].url);
        }
        newPreviews.splice(index, 1);
        setAttachmentPreviews(newPreviews);
    };

    const submitFindings = async () => {
        if (!selectedReport || !findings) {
            setSnackbar({
                open: true,
                message: "Findings are required",
                severity: "error"
            });
            return;
        }

        try {
            const formData = new FormData();
            formData.append("findingsData", JSON.stringify({
                findings,
                recommendations,
                principleAmount: selectedReport.principleAmount,
                penaltiesAmount: selectedReport.penaltiesAmount
            }));

            attachments.forEach(file => {
                formData.append("attachments", file);
            });

            await ReportApi.submitFindings(selectedReport.id, formData);

            setSnackbar({
                open: true,
                message: "Findings submitted successfully",
                severity: "success"
            });

            // Update local state
            setReports(prev =>
                prev.map(report =>
                    report.id === selectedReport.id
                        ? {
                            ...report,
                            status: "INVESTIGATION_COMPLETED",
                            relatedCase: {
                                ...report.relatedCase,
                                status: "INVESTIGATION_COMPLETED"
                            }
                        }
                        : report
                )
            );

            handleCloseFindingsDialog();
        } catch (err) {
            console.error("Error submitting findings:", err);
            setSnackbar({
                open: true,
                message: "Failed to submit findings",
                severity: "error"
            });
        }
    };

    const filteredReports = reports.filter(report => {
        const searchTerm = searchQuery.toLowerCase();
        return (
            (report.caseId?.toString().toLowerCase() || '').includes(searchTerm) ||
            (report.status?.toString().toLowerCase() || '').includes(searchTerm)
        );
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'INVESTIGATION_COMPLETED': return 'success';
            case 'REPORT_ASSIGNED_TO_INVESTIGATION_OFFICER':
            case 'INVESTIGATION_IN_PROGRESS': return 'warning';
            case 'INVESTIGATION_ON_HOLD': return 'error';
            default: return 'default';
        }
    };

    const formatStatus = (status) => {
        return status
            .split('_')
            .map(word => word.charAt(0) + word.slice(1).toLowerCase())
            .join(' ');
    };

    const formatCurrency = (amount) => {
        return amount ? `$${amount.toFixed(2)}` : '$0.00';
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <Alert severity="error">Error loading reports: {error}</Alert>
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => window.location.reload()}
                    sx={{ ml: 2 }}
                >
                    Retry
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" gutterBottom>
                        Investigation Officer Dashboard
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary">
                        Assigned Cases
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TextField
                        label="Search cases"
                        variant="outlined"
                        size="small"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: <Search fontSize="small" />,
                        }}
                    />
                    <Chip
                        label={`${filteredReports.length} cases`}
                        color="primary"
                        variant="outlined"
                    />
                </Box>
            </Box>

            <TableContainer component={Paper} elevation={3}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: 'grey.100' }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>Case ID</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Reported Date</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Principle</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Penalties</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredReports.length > 0 ? (
                            filteredReports.map((report) => (
                                <TableRow key={report.id}>
                                    <TableCell>{report.caseId}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={formatStatus(report.status)}
                                            color={getStatusColor(report.status)}
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {new Date(report.reportedDate).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        {formatCurrency(report.principleAmount)}
                                    </TableCell>
                                    <TableCell>
                                        {formatCurrency(report.penaltiesAmount)}
                                    </TableCell>
                                    <TableCell>
                                        {formatCurrency(report.principleAmount + report.penaltiesAmount)}
                                    </TableCell>
                                    <TableCell>
                                        <Box display="flex" gap={1}>
                                            <Tooltip title="View Report">
                                                <IconButton
                                                    onClick={() => navigate(`/reports/${report.id}`)}
                                                    color="primary"
                                                >
                                                    <Description />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Update Status">
                                                <IconButton
                                                    color="secondary"
                                                    onClick={() => {
                                                        setSelectedReport(report);
                                                        setStatusUpdate(report.status || "");
                                                        setNotes(report.notes || "");
                                                        setStatusDialogOpen(true);
                                                    }}
                                                >
                                                    <Send />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Submit Findings">
                                                <IconButton
                                                    color="primary"
                                                    onClick={() => handleOpenFindingsDialog(report)}
                                                >
                                                    <NoteAdd />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
                                    No assigned cases found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Status Update Dialog */}
            <Dialog open={statusDialogOpen} onClose={handleCloseStatusDialog} fullWidth maxWidth="sm">
                <DialogTitle>
                    Update Investigation Status
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ my: 2 }}>
                        <Typography variant="subtitle1">Case ID: {selectedReport?.caseId || 'N/A'}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Current Status: {selectedReport?.status ? formatStatus(selectedReport.status) : 'N/A'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Principle Amount: {formatCurrency(selectedReport?.principleAmount)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Penalties: {formatCurrency(selectedReport?.penaltiesAmount)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Total: {formatCurrency((selectedReport?.principleAmount || 0) + (selectedReport?.penaltiesAmount || 0))}
                        </Typography>
                    </Box>
                    <TextField
                        select
                        fullWidth
                        label="New Status"
                        value={statusUpdate}
                        onChange={(e) => setStatusUpdate(e.target.value)}
                        sx={{ mb: 2 }}
                    >
                        <MenuItem value="INVESTIGATION_IN_PROGRESS">
                            {formatStatus("INVESTIGATION_IN_PROGRESS")}
                        </MenuItem>
                        <MenuItem value="INVESTIGATION_COMPLETED">
                            {formatStatus("INVESTIGATION_COMPLETED")}
                        </MenuItem>
                        <MenuItem value="INVESTIGATION_ON_HOLD">
                            {formatStatus("INVESTIGATION_ON_HOLD")}
                        </MenuItem>
                    </TextField>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Investigation Notes"
                        placeholder="Enter detailed investigation notes..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseStatusDialog}>Cancel</Button>
                    <Button
                        onClick={handleStatusUpdate}
                        variant="contained"
                        color="primary"
                        disabled={!statusUpdate}
                    >
                        Update Status
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Findings Submission Dialog */}
            <Dialog
                open={findingsDialogOpen}
                onClose={handleCloseFindingsDialog}
                fullWidth
                maxWidth="md"
            >
                <DialogTitle>Submit Investigation Findings</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Case ID: {selectedReport?.caseId || 'N/A'}
                    </DialogContentText>

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2">Financial Details</Typography>
                        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                            <TextField
                                label="Principle Amount"
                                type="number"
                                value={selectedReport?.principleAmount || 0}
                                onChange={(e) => {
                                    setSelectedReport(prev => ({
                                        ...prev,
                                        principleAmount: parseFloat(e.target.value) || 0
                                    }));
                                }}
                                InputProps={{
                                    startAdornment: '$',
                                }}
                            />
                            <TextField
                                label="Penalties Amount"
                                type="number"
                                value={selectedReport?.penaltiesAmount || 0}
                                onChange={(e) => {
                                    setSelectedReport(prev => ({
                                        ...prev,
                                        penaltiesAmount: parseFloat(e.target.value) || 0
                                    }));
                                }}
                                InputProps={{
                                    startAdornment: '$',
                                }}
                            />
                            <TextField
                                label="Total"
                                disabled
                                value={(selectedReport?.principleAmount || 0) + (selectedReport?.penaltiesAmount || 0)}
                                InputProps={{
                                    startAdornment: '$',
                                }}
                            />
                        </Box>
                    </Box>

                    <TextField
                        fullWidth
                        multiline
                        rows={6}
                        label="Detailed Findings *"
                        value={findings}
                        onChange={(e) => setFindings(e.target.value)}
                        sx={{ mb: 3 }}
                        helperText="Provide detailed investigation findings"
                    />

                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Recommendations"
                        value={recommendations}
                        onChange={(e) => setRecommendations(e.target.value)}
                        sx={{ mb: 3 }}
                        helperText="Provide recommendations based on your findings"
                    />

                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel htmlFor="attachment-upload">Attachments</InputLabel>
                        <Input
                            id="attachment-upload"
                            type="file"
                            inputProps={{
                                multiple: true,
                                accept: "image/*,.pdf,.doc,.docx,.xls,.xlsx"
                            }}
                            onChange={handleFileUpload}
                            startAdornment={<AttachFile />}
                        />
                    </FormControl>

                    {attachmentPreviews.length > 0 && (
                        <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Attachments ({attachmentPreviews.length})
                            </Typography>
                            <List dense>
                                {attachmentPreviews.map((file, index) => (
                                    <React.Fragment key={index}>
                                        <ListItem
                                            secondaryAction={
                                                <IconButton
                                                    edge="end"
                                                    onClick={() => removeAttachment(index)}
                                                >
                                                    <Delete />
                                                </IconButton>
                                            }
                                        >
                                            <ListItemIcon>
                                                {file.type === 'image' ? (
                                                    <img
                                                        src={file.url}
                                                        alt={file.name}
                                                        style={{
                                                            width: 50,
                                                            height: 50,
                                                            objectFit: 'cover',
                                                            borderRadius: 1
                                                        }}
                                                    />
                                                ) : (
                                                    <Description fontSize="large" />
                                                )}
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={file.name}
                                                secondary={file.type === 'image' ? "Image" : "Document"}
                                            />
                                        </ListItem>
                                        {index < attachmentPreviews.length - 1 && <Divider />}
                                    </React.Fragment>
                                ))}
                            </List>
                        </Paper>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseFindingsDialog}>Cancel</Button>
                    <Button
                        onClick={submitFindings}
                        variant="contained"
                        color="primary"
                        disabled={!findings}
                        startIcon={<Check />}
                    >
                        Submit Findings
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default InvestigationOfficer;