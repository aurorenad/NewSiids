import React, { useState, useEffect, useContext, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import {
    Button, Paper, TextField, Dialog, DialogActions, DialogContent, DialogTitle,
    Box, Alert, Snackbar, Tooltip, Typography, Chip, Tabs, Tab
} from "@mui/material";
import {
    Search, Description, Check, Undo, Refresh, Assignment, Assessment, AccountBalance
} from "@mui/icons-material";

import { useNavigate } from 'react-router-dom';
import { ReportApi } from '../api/Axios/caseApi';
import { AuthContext } from '../context/AuthContext';

const AssistantCommissioner = () => {
    const { authState } = useContext(AuthContext);
    const [reports, setReports] = useState([]);
    const [casePlans, setCasePlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState(0); // 0: Case Intake, 1: Strategic Plans, 2: Investigation Results
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
    
    // Action States
    const [closeDialogOpen, setCloseDialogOpen] = useState(false);
    const [closeReason, setCloseReason] = useState("");
    const [selectedReport, setSelectedReport] = useState(null);

    // Signature States
    const sigCanvas = useRef({});
    const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
    const [reportToApprove, setReportToApprove] = useState(null);
    const [approvalTab, setApprovalTab] = useState(0);
    const [routingDialogOpen, setRoutingDialogOpen] = useState(false);
    const [routeDepartment, setRouteDepartment] = useState("Director of Investigation");

    const navigate = useNavigate();
    const routeOptions = [
        { value: "Director of Investigation", label: "Director of Investigation", caption: "Investigation director review" },
        { value: "Legal Advisor", label: "Legal Advisor", caption: "Legal review and advice" },
        { value: "Prosecution", label: "Prosecution", caption: "Prosecution handling" },
        { value: "Enforcement", label: "Enforcement", caption: "Enforcement follow-up" },
        { value: "Collection", label: "Collection", caption: "Collection follow-up" },
        { value: "To be filled", label: "To be filled", caption: "Hold for later routing" },
        { value: "Other Departments", label: "Other Departments", caption: "Enter a custom destination" }
    ];

    const fetchAllData = async (showError = true) => {
        try {
            setLoading(true);
            const [reportsRes, plansRes] = await Promise.all([
                ReportApi.getAllReportsForAssistantCommissioner(),
                ReportApi.getCasePlansForAssistantCommissioner({ size: 100 })
            ]);
            setReports(reportsRes.data?.content || reportsRes.data || []);
            setCasePlans(plansRes.data?.content || plansRes.data || []);
        } catch {
            if (showError) {
                setSnackbar({ open: true, message: "Failed to synchronize with central command", severity: "error" });
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAllData(); }, []);

    const showSnackbar = (message, severity = "success") => {
        setSnackbar({ open: true, message, severity });
    };

    const formatStatus = (status) => {
        const map = {
            "REPORT_SUBMITTED_TO_ASSISTANT_COMMISSIONER": "Initial Review",
            "REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE": "Intelligence Approved",
            "INVESTIGATION_REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION": "Investigation for Review",
            "CASE_PLAN_SENT_TO_ASSISTANT_COMMISSIONER": "Plan Pending",
            "REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER": "Finalized",
            "INVESTIGATION_REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER": "Approved"
        };
        return map[status] || status?.replace(/_/g, ' ') || 'Unknown';
    };

    const getErrorMessage = (err, fallback = "Action failed") => {
        const data = err.response?.data;
        if (typeof data === 'string') return data;
        if (data?.message) return data.message;
        return fallback;
    };

    const handleApproveClick = (report) => {
        if (submitting || !isPending(report.status)) return;
        if (activeTab === 0) {
            setReportToApprove(report);
            setApprovalTab(activeTab);
            setRouteDepartment("Director of Investigation");
            setCustomDepartment("");
            setRoutingNotes("");
            setRoutingDialogOpen(true);
            return;
        }

        triggerApprove(report);
    };

    const isPending = (status) => {
        return status === 'REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE' ||
               status === 'CASE_PLAN_SENT_TO_ASSISTANT_COMMISSIONER' ||
               status === 'INVESTIGATION_REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION';
    };

    const triggerApprove = (report) => {
        setReportToApprove(report);
        setApprovalTab(activeTab);
        setSignatureDialogOpen(true);
        window.setTimeout(() => sigCanvas.current?.clear?.(), 0);
    };

    const handleRouteConfirm = () => {
        const selectedDepartment = routeDepartment === "Other Departments"
            ? customDepartment.trim()
            : routeDepartment;

        if (!selectedDepartment) {
            showSnackbar("Please enter the destination department", "warning");
            return;
        }

        setRoutingDialogOpen(false);
        setSignatureDialogOpen(true);
        window.setTimeout(() => sigCanvas.current?.clear?.(), 0);
    };

    const handleApproveAction = async () => {
        if (!reportToApprove || submitting) return;
        if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
            showSnackbar("Please provide a signature first", "error");
            return;
        }

        const report = reportToApprove;
        let approvalSucceeded = false;

        try {
            setSubmitting(true);
            const signatureBase64 = sigCanvas.current
                .getTrimmedCanvas()
                .toDataURL('image/png')
                .replace(/^data:image\/png;base64,/, '');

            if (approvalTab === 1) {
                await ReportApi.signReport(report.id, signatureBase64, 'ASSISTANT_COMMISSIONER');
                await ReportApi.approveCasePlanByAssistantCommissioner(report.id);
            } else if (approvalTab === 2) {
                await ReportApi.signReport(report.id, signatureBase64, 'ASSISTANT_COMMISSIONER');
                await ReportApi.approveReport(report.id);
            } else {
                const selectedDepartment = routeDepartment === "Other Departments"
                    ? customDepartment.trim()
                    : routeDepartment;
                await ReportApi.signReport(report.id, signatureBase64, 'ASSISTANT_COMMISSIONER');
                await ReportApi.approveAndRouteByAssistantCommissioner(report.id, selectedDepartment, routingNotes);
            }

            approvalSucceeded = true;
            setSignatureDialogOpen(false);
            
            if (approvalTab === 0) {
                const selectedDepartment = routeDepartment === "Other Departments"
                    ? customDepartment.trim()
                    : routeDepartment;
                showSnackbar(`Case intake approved and routed to ${selectedDepartment}`);
            } else if (approvalTab === 1) {
                showSnackbar("Case plan approved and returned to Investigation Officer");
            } else {
                showSnackbar("Investigation report approved");
            }

            try {
                await fetchAllData(false);
            } catch {
                // Approval already succeeded; do not replace the success notification with a refresh error.
            }
        } catch (err) { 
            showSnackbar(getErrorMessage(err, "Approval failed"), "error"); 
        } finally {
            setSubmitting(false);
            if (approvalSucceeded) {
                setReportToApprove(null);
                setApprovalTab(0);
                setRouteDepartment("Director of Investigation");
                setCustomDepartment("");
                setRoutingNotes("");
            }
        }
    };
    
    const clearSignature = () => {
        sigCanvas.current?.clear?.();
    };

    const handleRejectFinal = async () => {
        if (!selectedReport) {
            showSnackbar("No report selected", "error");
            return;
        }

        if (!closeReason.trim()) {
            showSnackbar("Rejection reason is required", "warning");
            return;
        }

        try {
            setSubmitting(true);
            if (activeTab === 1) {
                await ReportApi.rejectCasePlanByAssistantCommissioner(selectedReport.id, closeReason);
                showSnackbar("Case plan rejected and returned to Investigation Officer");
            } else if (activeTab === 2) {
                if (selectedReport.directorInvestigationId) {
                    await ReportApi.returnReport(selectedReport.id, selectedReport.directorInvestigationId, closeReason);
                    showSnackbar("Investigation report returned to Director of Investigation");
                } else {
                    await ReportApi.rejectReport(selectedReport.id, closeReason);
                    showSnackbar("Investigation report rejected using fallback handling");
                }
            } else {
                if (selectedReport.directorIntelligenceId) {
                    await ReportApi.returnReport(selectedReport.id, selectedReport.directorIntelligenceId, closeReason);
                    showSnackbar("Case intake returned to Director Intelligence");
                } else {
                    await ReportApi.rejectReport(selectedReport.id, closeReason);
                    showSnackbar("Case intake rejected using fallback handling");
                }
            }
            setCloseDialogOpen(false);
            setSelectedReport(null);
            setCloseReason("");
            await fetchAllData();
        } catch (err) { 
            showSnackbar(getErrorMessage(err), "error");
        } finally {
            setSubmitting(false);
        }
    };

    const updateReportInState = (updatedReport) => {
        setRows(prev => prev.map(report => report.id === updatedReport.id ? { ...report, ...updatedReport } : report));
    };

    const handleOpenSignatureDialog = (report) => {
        setSelectedReport(report);
        setSignatureDialogOpen(true);
    };

    const handleDownloadInvestigationReport = async (report) => {
        try {
            setSubmitting(true);
            const response = await ReportApi.downloadInvestigationReportPdf(report.id);
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `investigation-report-${report.id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Failed to download investigation report";
            showSnackbar(typeof errorMsg === 'string' ? errorMsg : "Failed to download investigation report", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleTabChange = (event, nextTab) => {
        setActiveTab(nextTab);
        setPage(0);
    };

    const handleSearchChange = (value) => {
        setSearchQuery(value);
        setPage(0);
    };

    const columns = [
        {
            key: 'operationalId',
            label: 'Operational ID',
            render: (r) => (
                <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{r.relatedCase?.caseNum || r.id}</Typography>
                    <Typography variant="caption" color="text.secondary">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'N/A'}</Typography>
                </Box>
            )
        },
        {
            key: 'leadPersonnel',
            label: 'Lead Personnel',
            render: (r) => r.investigationOfficer?.givenName || r.createdBy || 'N/A'
        },
        {
            key: 'workflowState',
            label: 'Workflow State',
            render: (r) => (
                <Chip
                    label={formatStatus(r.status)}
                    size="small"
                    sx={{ fontWeight: 700 }}
                    color={r.status?.includes('APPROVED') ? 'success' : 'primary'}
                />
            )
        },
        {
            key: 'summary',
            label: 'Intelligence Summary',
            render: (r) => (
                <Typography variant="body2" sx={{ maxWidth: 250 }} noWrap>
                    {r.description || r.casePlanDescription || 'N/A'}
                </Typography>
            )
        },
        {
            key: 'actions',
            label: 'Critical Actions',
            cellStyle: { textAlign: 'center' },
            render: (r) => (
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Button
                        variant="outlined"
                        color="primary"
                        size="small"
                        startIcon={<Description />}
                        onClick={() => navigate(routeTo.reportDetails(r.id))}
                        sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                        View
                    </Button>

                    {canApproveAssistantCommissioner && (
                        <Button
                            variant="contained"
                            color="success"
                            size="small"
                            startIcon={<Check />}
                            onClick={() => handleApproveAction(r)}
                            disabled={submitting}
                            sx={{ textTransform: 'none', fontWeight: 700 }}
                        >
                            Approve
                        </Button>
                    )}

                    {canApproveAssistantCommissioner && activeTab === 2 && (
                        <Button
                            variant={r.acSigned ? "outlined" : "contained"}
                            color="primary"
                            size="small"
                            startIcon={<DriveFileRenameOutline />}
                            onClick={() => handleOpenSignatureDialog(r)}
                            disabled={submitting}
                            sx={{ textTransform: 'none', fontWeight: 700 }}
                        >
                            {r.acSigned ? 'Re-sign' : 'Sign'}
                        </Button>
                    )}

                    {activeTab === 2 && (
                        <Tooltip title={r.finalised ? 'Download final investigation report' : 'Both signatures are required before final PDF download'}>
                            <span>
                                <Button
                                    variant="outlined"
                                    color="primary"
                                    size="small"
                                    startIcon={<Download />}
                                    onClick={() => handleDownloadInvestigationReport(r)}
                                    disabled={submitting || !r.finalised}
                                    sx={{ textTransform: 'none', fontWeight: 700 }}
                                >
                                    PDF
                                </Button>
                            </span>
                        </Tooltip>
                    )}

                    {canApproveAssistantCommissioner && (
                        <Button
                            variant="contained"
                            color="error"
                            size="small"
                            startIcon={<Undo />}
                            onClick={() => {
                                setSelectedReport(r);
                                setCloseReason("");
                                setCloseDialogOpen(true);
                            }}
                            disabled={submitting}
                            sx={{ textTransform: 'none', fontWeight: 700 }}
                        >
                            Reject
                        </Button>
                    )}
                </Box>
            )
        }
    ];

    return (
        <Box sx={{ p: 4, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h3" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>Command Overview</Typography>
                    <Typography variant="body1" color="text.secondary">Strategic oversight for Assistant Commissioner: <strong>{authState?.name || 'Personnel'}</strong></Typography>
                </Box>
                <Button startIcon={<Refresh />} onClick={fetchAllData} variant="contained" sx={{ borderRadius: 2, px: 3 }}>Sync Operations</Button>
            </Box>

            <Paper sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ px: 2, pt: 1, backgroundColor: '#fff' }}>
                    <Tab icon={<Description />} label="Case Intake" iconPosition="start" sx={{ fontWeight: 700 }} />
                    <Tab icon={<Assignment />} label="Strategic Plans" iconPosition="start" sx={{ fontWeight: 700 }} />
                    <Tab icon={<Assessment />} label="Investigation Results" iconPosition="start" sx={{ fontWeight: 700 }} />
                </Tabs>

                <Box sx={{ p: 3, display: 'flex', gap: 2 }}>
                    <TextField 
                        size="small" 
                        placeholder="Search operational IDs..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{ startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} /> }}
                        sx={{ width: 400 }}
                    />
                </Box>

                <TableContainer>
                    <Table>
                        <TableHead sx={{ backgroundColor: '#f1f5f9' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Operational ID</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Lead Personnel</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Workflow State</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Intelligence Summary</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="center">Critical Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 8 }}><CircularProgress /></TableCell></TableRow>
                            ) : getFilteredData().length === 0 ? (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 8 }}><Typography color="text.secondary">No records pending in this sector</Typography></TableCell></TableRow>
                            ) : getFilteredData().map((r) => (
                                <TableRow key={r.id} hover>
                                    <TableCell>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{r.relatedCase?.caseNum || r.id}</Typography>
                                        <Typography variant="caption" color="text.secondary">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'N/A'}</Typography>
                                    </TableCell>
                                    <TableCell>{r.investigationOfficer?.givenName || r.createdBy || 'N/A'}</TableCell>
                                    <TableCell>
                                        <Chip label={formatStatus(r.status)} size="small" sx={{ fontWeight: 700 }} color={r.status?.includes('APPROVED') ? 'success' : 'primary'} />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ maxWidth: 250 }} noWrap>{r.description || r.casePlanDescription || 'N/A'}</Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', alignItems: 'center' }}>
                                            <Button
                                                variant="outlined"
                                                color="primary"
                                                size="small"
                                                startIcon={<Description />}
                                                onClick={() => navigate(`/view-report/${r.id}`)}
                                                sx={{ textTransform: 'none', fontWeight: 700 }}
                                            >
                                                View
                                            </Button>

                                            <Button
                                                variant="contained"
                                                color="success"
                                                size="small"
                                                startIcon={<Check />}
                                                onClick={() => handleApproveClick(r)}
                                                disabled={submitting || !isPending(r.status)}
                                                sx={{ textTransform: 'none', fontWeight: 700 }}
                                            >
                                                Approve
                                            </Button>
                                            
                                            <Button
                                                variant="contained"
                                                color="error"
                                                size="small"
                                                startIcon={<Undo />}
                                                onClick={() => {
                                                    setSelectedReport(r);
                                                    setCloseReason("");
                                                    setCloseDialogOpen(true);
                                                }}
                                                disabled={submitting || !isPending(r.status)}
                                                sx={{ textTransform: 'none', fontWeight: 700 }}
                                            >
                                                Reject
                                            </Button>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Rejection Portal */}
            <Dialog open={closeDialogOpen} onClose={() => setCloseDialogOpen(false)} fullWidth>
                <DialogTitle sx={{ bgcolor: '#ef4444', color: '#fff' }}>Rejection of Operational Dossier</DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <TextField fullWidth multiline rows={4} label="Reason for Rejection" value={closeReason} onChange={(e) => setCloseReason(e.target.value)} />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setCloseDialogOpen(false)} disabled={submitting}>Abort</Button>
                    <Button onClick={handleRejectFinal} variant="contained" color="error" disabled={submitting || !closeReason.trim()}>Confirm Rejection</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={routingDialogOpen} onClose={() => !submitting && setRoutingDialogOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle sx={{ fontWeight: 700 }}>Route Case Intake</DialogTitle>
                <DialogContent sx={{ mt: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <AccountBalance color="primary" />
                        <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                                {reportToApprove?.relatedCase?.caseNum || `Report #${reportToApprove?.id || ''}`}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Select the destination before signing this case intake.
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.25 }}>
                        {routeOptions.map((option) => {
                            const selected = routeDepartment === option.value;
                            return (
                                <Button
                                    key={option.value}
                                    onClick={() => setRouteDepartment(option.value)}
                                    variant={selected ? "contained" : "outlined"}
                                    color={selected ? "primary" : "inherit"}
                                    sx={{
                                        justifyContent: 'flex-start',
                                        alignItems: 'flex-start',
                                        textAlign: 'left',
                                        minHeight: 72,
                                        p: 1.5,
                                        borderRadius: 2,
                                        textTransform: 'none'
                                    }}
                                >
                                    <Box>
                                        <Typography variant="body2" sx={{ fontWeight: 800 }}>{option.label}</Typography>
                                        <Typography variant="caption" sx={{ opacity: selected ? 0.9 : 0.7 }}>{option.caption}</Typography>
                                    </Box>
                                </Button>
                            );
                        })}
                    </Box>
                    {routeDepartment === "Other Departments" && (
                        <TextField
                            fullWidth
                            label="Department name"
                            value={customDepartment}
                            onChange={(e) => setCustomDepartment(e.target.value)}
                            sx={{ mt: 2 }}
                            inputProps={{ maxLength: 120 }}
                        />
                    )}
                    <TextField
                        fullWidth
                        multiline
                        minRows={3}
                        label="Routing Notes (optional)"
                        placeholder="Add any instructions, context, or routing comments..."
                        value={routingNotes}
                        onChange={(e) => setRoutingNotes(e.target.value)}
                        sx={{ mt: 2 }}
                        inputProps={{ maxLength: 1000 }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setRoutingDialogOpen(false)} disabled={submitting}>Cancel</Button>
                    <Button
                        onClick={handleRouteConfirm}
                        variant="contained"
                        disabled={submitting || (routeDepartment === "Other Departments" && !customDepartment.trim())}
                    >
                        Continue
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={signatureDialogOpen} onClose={() => !submitting && setSignatureDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>Provide Digital Signature</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        By signing, you are granting operational approval. This signature will be permanently attached to the dossier.
                    </Typography>
                    <Box sx={{ border: '2px dashed #ccc', borderRadius: 2, bgcolor: '#fafafa', p: 1 }}>
                        <SignatureCanvas 
                            ref={sigCanvas} 
                            penColor="black" 
                            canvasProps={{ width: 500, height: 200, className: 'sigCanvas' }} 
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setSignatureDialogOpen(false)} disabled={submitting}>Cancel</Button>
                    <Button onClick={clearSignature} color="error" disabled={submitting}>Clear</Button>
                    <Button onClick={handleApproveAction} variant="contained" color="primary" disabled={submitting}>
                        {submitting ? "Submitting..." : "Submit Signature"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
                <Alert severity={snackbar.severity} sx={{ width: '100%', fontWeight: 700 }}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
};

export default AssistantCommissioner;
