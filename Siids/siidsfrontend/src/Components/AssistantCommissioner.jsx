import React, { useState, useEffect, useContext } from 'react';
import {
    Button, Paper, TextField, Dialog, DialogActions, DialogContent, DialogTitle,
    Box, Alert, Snackbar, Tooltip, Typography, Chip, Tabs, Tab
} from "@mui/material";
import {
    Description, Check, Undo, Refresh, Assignment, Assessment,
    DriveFileRenameOutline, Download
} from "@mui/icons-material";

import { useNavigate } from 'react-router-dom';
import { routeTo } from '../constants/routes';
import { ReportApi } from '../api/Axios/caseApi';
import { AuthContext } from '../context/AuthContext';
import { hasPermission } from '../utils/authorization';
import { PERMISSIONS } from '../constants/permissions';
import ReportSignatureDialog from './ui/ReportSignatureDialog.jsx';
import AppTable from './ui/AppTable.jsx';

const ROWS_PER_PAGE = 10;
const TAB_VIEWS = ['INTAKE', 'CASE_PLAN', 'INVESTIGATION'];

const AssistantCommissioner = () => {
    const { authState } = useContext(AuthContext);
    const [rows, setRows] = useState([]);
    const [totalRows, setTotalRows] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState(0); // 0: Case Intake, 1: Strategic Plans, 2: Investigation Results
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
    
    // Action States
    const [closeDialogOpen, setCloseDialogOpen] = useState(false);
    const [closeReason, setCloseReason] = useState("");
    const [selectedReport, setSelectedReport] = useState(null);
    const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);

    const navigate = useNavigate();
    const canApproveAssistantCommissioner = hasPermission(authState, PERMISSIONS.REPORT_APPROVE_ASSISTANT_COMMISSIONER);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const params = { page, size: ROWS_PER_PAGE, search: searchQuery };
            const response = activeTab === 1
                ? await ReportApi.getCasePlansForAssistantCommissioner(params)
                : await ReportApi.getReportsForAssistantCommissioner({
                    ...params,
                    view: TAB_VIEWS[activeTab]
                });
            const pageData = response.data;
            setRows(pageData?.content || []);
            setTotalRows(pageData?.totalElements || 0);
        } catch (err) {
            setSnackbar({ open: true, message: "Failed to synchronize with central command", severity: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAllData(); }, [activeTab, page, searchQuery]);

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

    const handleApproveAction = async (report) => {
        try {
            setSubmitting(true);
            if (activeTab === 1) {
                await ReportApi.approveCasePlanByAssistantCommissioner(report.id);
            } else {
                await ReportApi.approveReport(report.id);
            }
            showSnackbar("Operational approval granted");
            await fetchAllData();
        } catch (err) { 
            const errorMsg = err.response?.data || "Approval failed";
            showSnackbar(typeof errorMsg === 'string' ? errorMsg : "Approval failed", "error"); 
        } finally {
            setSubmitting(false);
        }
    };

    const handleRejectFinal = async () => {
        try {
            setSubmitting(true);
            if (activeTab === 2 && selectedReport.directorInvestigationId) {
                // Reject Investigation Results -> Send back to Director of Investigation
                await ReportApi.returnReport(selectedReport.id, selectedReport.directorInvestigationId, closeReason);
                showSnackbar("Investigation results returned to Director of Investigation");
            } else if (selectedReport.directorIntelligenceId) {
                // Reject Case Intake -> Send back to Director of Intelligence
                await ReportApi.returnReport(selectedReport.id, selectedReport.directorIntelligenceId, closeReason);
                showSnackbar("Dossier returned to Director of Intelligence");
            } else {
                // Fallback: Full rejection and closure
                await ReportApi.rejectReport(selectedReport.id, closeReason);
                showSnackbar("Dossier rejected and closed");
            }
            setCloseDialogOpen(false);
            await fetchAllData();
        } catch (err) { 
            const errorMsg = err.response?.data || "Action failed";
            showSnackbar(typeof errorMsg === 'string' ? errorMsg : "Action failed", "error");
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
                <Tabs value={activeTab} onChange={handleTabChange} sx={{ px: 2, pt: 1, backgroundColor: '#fff' }}>
                    <Tab icon={<Description />} label="Case Intake" iconPosition="start" sx={{ fontWeight: 700 }} />
                    <Tab icon={<Assignment />} label="Strategic Plans" iconPosition="start" sx={{ fontWeight: 700 }} />
                    <Tab icon={<Assessment />} label="Investigation Results" iconPosition="start" sx={{ fontWeight: 700 }} />
                </Tabs>

                <Box sx={{ p: 3 }}>
                    <AppTable
                        columns={columns}
                        rows={rows}
                        loading={loading}
                        emptyMessage="No records pending in this sector"
                        searchValue={searchQuery}
                        searchPlaceholder="Search operational IDs..."
                        onSearchChange={handleSearchChange}
                        page={page}
                        rowsPerPage={ROWS_PER_PAGE}
                        totalRows={totalRows}
                        onPageChange={(event, nextPage) => setPage(nextPage)}
                        minWidth={1100}
                    />
                </Box>
            </Paper>

            {/* Rejection Portal */}
            <Dialog open={closeDialogOpen} onClose={() => setCloseDialogOpen(false)} fullWidth>
                <DialogTitle sx={{ bgcolor: '#ef4444', color: '#fff' }}>Rejection of Operational Dossier</DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <TextField fullWidth multiline rows={4} label="Reason for Rejection" value={closeReason} onChange={(e) => setCloseReason(e.target.value)} />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setCloseDialogOpen(false)}>Abort</Button>
                    <Button onClick={handleRejectFinal} variant="contained" color="error" disabled={submitting}>Confirm Rejection</Button>
                </DialogActions>
            </Dialog>

            <ReportSignatureDialog
                open={signatureDialogOpen}
                report={selectedReport}
                role="ASSISTANT_COMMISSIONER"
                title="Assistant Commissioner Signature"
                onClose={() => setSignatureDialogOpen(false)}
                onSigned={(updatedReport) => {
                    updateReportInState(updatedReport);
                    showSnackbar("Report signed successfully");
                }}
            />

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
                <Alert severity={snackbar.severity} sx={{ width: '100%', fontWeight: 700 }}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
};

export default AssistantCommissioner;
