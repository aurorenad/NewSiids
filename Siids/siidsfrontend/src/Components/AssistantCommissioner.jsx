import React, { useState, useEffect, useContext } from 'react';
import {
    Button, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, TextField, Dialog, DialogActions, DialogContent, DialogTitle,
    Box, CircularProgress, Alert, Snackbar, Tooltip, Menu, MenuItem,
    Typography, Chip, Tabs, Tab, Divider
} from "@mui/material";
import {
    Search, Description, Check, Close, Undo, Visibility, Refresh, Assignment, Assessment
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
    const [anchorEl, setAnchorEl] = useState(null);
    const [menuReport, setMenuReport] = useState(null);
    const [closeDialogOpen, setCloseDialogOpen] = useState(false);
    const [closeReason, setCloseReason] = useState("");
    const [selectedReport, setSelectedReport] = useState(null);

    const navigate = useNavigate();

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const [reportsRes, plansRes] = await Promise.all([
                ReportApi.getReportsForAssistantCommissioner(),
                ReportApi.getCasePlansForAssistantCommissioner()
            ]);
            setReports(reportsRes.data);
            setCasePlans(plansRes.data);
        } catch (err) {
            setSnackbar({ open: true, message: "Failed to synchronize with central command", severity: "error" });
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

    const handleMenuOpen = (e, r) => { setAnchorEl(e.currentTarget); setMenuReport(r); };
    const handleMenuClose = () => setAnchorEl(null);

    const getFilteredData = () => {
        const query = searchQuery.toLowerCase();
        if (activeTab === 1) return casePlans.filter(p => p.relatedCase?.caseNum?.toLowerCase().includes(query));
        
        return reports.filter(r => {
            if (activeTab === 0) return !r.status.includes('INVESTIGATION') && !r.status.includes('CASE_PLAN');
            return r.status.includes('INVESTIGATION');
        }).filter(r => r.relatedCase?.caseNum?.toLowerCase().includes(query) || r.id.toString().includes(query));
    };

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
                                        <Typography variant="caption" color="text.secondary">{new Date(r.createdAt).toLocaleDateString()}</Typography>
                                    </TableCell>
                                    <TableCell>{r.investigationOfficer?.givenName || r.createdBy || 'N/A'}</TableCell>
                                    <TableCell>
                                        <Chip label={formatStatus(r.status)} size="small" sx={{ fontWeight: 700 }} color={r.status.includes('APPROVED') ? 'success' : 'primary'} />
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
                                                onClick={() => handleApproveAction(r)}
                                                disabled={submitting}
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
                                                disabled={submitting}
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

            {/* Decision Menus */}
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                <MenuItem onClick={handleApproveAction}>Finalize Approval</MenuItem>
                <Divider />
                <MenuItem onClick={() => handleSendToDept('Investigation')}>Approve & Assign Investigation</MenuItem>
                <MenuItem onClick={() => handleSendToDept('Legal')}>Refer to Legal Counsel</MenuItem>
                <MenuItem onClick={() => handleSendToDept('Finance')}>Refer to Finance Unit</MenuItem>
            </Menu>

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

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
                <Alert severity={snackbar.severity} sx={{ width: '100%', fontWeight: 700 }}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
};

export default AssistantCommissioner;