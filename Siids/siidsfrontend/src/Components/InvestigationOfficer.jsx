import React, { useContext, useState, useEffect } from "react";
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    TextField, IconButton, Button, Typography, Box, CircularProgress,
    Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
    MenuItem, Tooltip, Chip, Tabs, Tab, List, ListItem, ListItemIcon, ListItemText
} from "@mui/material";
import {
    Search, Description, Send, Check, AttachFile, Delete, NoteAdd,
    Visibility, Download, Edit, History, Refresh, Assignment, Assessment, InfoOutlined
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { ReportApi } from "./../api/Axios/caseApi";
import { AuthContext } from "../context/AuthContext";
import { hasPermission } from "../utils/authorization";

const InvestigationOfficer = () => {
    const { authState } = useContext(AuthContext);
    const navigate = useNavigate();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState(0);
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

    // Dialog States
    const [casePlanDialog, setCasePlanDialog] = useState({ open: false, report: null, text: "", file: null });
    const [findingsDialog, setFindingsDialog] = useState({ open: false, report: null, text: "", recs: "", principleAmount: "", penaltiesAmount: "", files: [] });
    const canCreateReport = hasPermission(authState, 'REPORT_CREATE');

    useEffect(() => { fetchReports(); }, [activeTab]);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const response = activeTab === 0 
                ? await ReportApi.getActiveReportsForInvestigationOfficer()
                : await ReportApi.getAllReportsForInvestigationOfficer();
            
            setReports(response.data.map(r => ({
                ...r,
                caseId: r.relatedCase?.caseNum || 'N/A',
                status: r.relatedCase?.status || 'PENDING'
            })));
        } catch (err) {
            setSnackbar({ open: true, message: "Failed to fetch reports", severity: "error" });
        } finally {
            setLoading(false);
        }
    };

    const handleCasePlanSubmit = async () => {
        try {
            const formData = new FormData();
            formData.append("casePlanText", casePlanDialog.text);
            if (casePlanDialog.file) formData.append("casePlanAttachment", casePlanDialog.file);
            
            // Submit the plan for review
            await ReportApi.submitCasePlan(casePlanDialog.report.id, formData);
            
            setSnackbar({ open: true, message: "Case plan submitted for review", severity: "success" });
            fetchReports();
            setCasePlanDialog({ open: false, report: null, text: "", file: null });
        } catch (err) { 
            const errorMsg = typeof err === 'string' ? err : "Failed to transmit case plan";
            setSnackbar({ open: true, message: errorMsg, severity: "error" }); 
        }
    };

    const handleFinalReportSubmit = async () => {
        try {
            const formData = new FormData();
            formData.append("findingsData", JSON.stringify({
                findings: findingsDialog.text,
                recommendations: findingsDialog.recs,
                principleAmount: parseFloat(findingsDialog.principleAmount) || 0,
                penaltiesAmount: parseFloat(findingsDialog.penaltiesAmount) || 0
            }));
            findingsDialog.files.forEach(f => formData.append("attachments", f));
            await ReportApi.submitFindings(findingsDialog.report.id, formData);
            setSnackbar({ open: true, message: "Report submitted successfully", severity: "success" });
            fetchReports();
            setFindingsDialog({ open: false, report: null, text: "", recs: "", principleAmount: "", penaltiesAmount: "", files: [] });
        } catch (err) { setSnackbar({ open: true, message: "Failed to submit report", severity: "error" }); }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
                Investigation Officer Dashboard
            </Typography>

            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
                <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
                    <Tab label="Active Cases" />
                    <Tab label="History" />
                </Tabs>
                <Button startIcon={<Refresh />} onClick={fetchReports}>Refresh</Button>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                            <TableCell>Case ID</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Date Assigned</TableCell>
                            <TableCell align="center">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={4} align="center"><CircularProgress /></TableCell></TableRow>
                        ) : reports.length === 0 ? (
                            <TableRow><TableCell colSpan={4} align="center">No cases found</TableCell></TableRow>
                        ) : reports.map((r) => (
                            <TableRow key={r.id}>
                                <TableCell sx={{ fontWeight: 'bold' }}>{r.caseId}</TableCell>
                                <TableCell>
                                    <Chip label={r.status.replace(/_/g, ' ')} size="small" color="primary" variant="outlined" />
                                </TableCell>
                                <TableCell>{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                                <TableCell align="center">
                                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                        <Tooltip title="View Details">
                                            <IconButton color="info" onClick={() => navigate(`/view-report/${r.id}`)}><Visibility /></IconButton>
                                        </Tooltip>
                                        
                                        {canCreateReport && (
                                            <Tooltip title="Create/Edit Plan">
                                                <IconButton color="primary" onClick={() => setCasePlanDialog({ open: true, report: r, text: r.casePlanDescription || "", file: null })}><NoteAdd /></IconButton>
                                            </Tooltip>
                                        )}

                                        {canCreateReport && (
                                            <Button
                                                variant="contained"
                                                color="success"
                                                size="small"
                                                startIcon={<Assessment />}
                                                onClick={() => setFindingsDialog({ open: true, report: r, text: "", recs: "", principleAmount: "", penaltiesAmount: "", files: [] })}
                                                sx={{ ml: 1, textTransform: 'none', fontWeight: 'bold', boxShadow: 2 }}
                                            >
                                                Create Final Report
                                            </Button>
                                        )}
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={casePlanDialog.open} onClose={() => setCasePlanDialog({ ...casePlanDialog, open: false })} fullWidth>
                <DialogTitle sx={{ bgcolor: '#1976d2', color: '#fff' }}>Case Plan - {casePlanDialog.report?.caseId}</DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <TextField 
                        fullWidth 
                        multiline 
                        rows={6} 
                        label="Plan Details" 
                        placeholder="Detail your strategy for this investigation..."
                        value={casePlanDialog.text} 
                        onChange={(e) => setCasePlanDialog({ ...casePlanDialog, text: e.target.value })} 
                        sx={{ mt: 1, mb: 2 }} 
                    />
                    
                    <Box sx={{ p: 2, border: '1px dashed #ccc', borderRadius: 2, bgcolor: '#f9f9f9' }}>
                        <Typography variant="subtitle2" gutterBottom>Plan Attachment (Optional)</Typography>
                        <Button variant="outlined" component="label" fullWidth startIcon={<AttachFile />}>
                            {casePlanDialog.file ? casePlanDialog.file.name : "Select File"}
                            <input type="file" hidden onChange={(e) => setCasePlanDialog({ ...casePlanDialog, file: e.target.files[0] })} />
                        </Button>
                        {casePlanDialog.file && (
                            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                                <Typography variant="caption" sx={{ flexGrow: 1 }}>{casePlanDialog.file.name}</Typography>
                                <IconButton size="small" color="error" onClick={() => setCasePlanDialog({ ...casePlanDialog, file: null })}><Delete fontSize="small" /></IconButton>
                            </Box>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setCasePlanDialog({ ...casePlanDialog, open: false })}>Cancel</Button>
                    <Button 
                        onClick={handleCasePlanSubmit} 
                        variant="contained" 
                        color="primary"
                        startIcon={<Send />}
                        disabled={!casePlanDialog.text}
                        sx={{ fontWeight: 'bold' }}
                    >
                        Save & Send to Director
                    </Button>
                </DialogActions>
            </Dialog>

            {/* FINDINGS DIALOG */}
            <Dialog open={findingsDialog.open} onClose={() => setFindingsDialog({ ...findingsDialog, open: false })} fullWidth maxWidth="md">
                <DialogTitle sx={{ backgroundColor: '#2e7d32', color: 'white' }}>Final Investigation Report - {findingsDialog.report?.caseId}</DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2, mb: 2, mt: 1 }}>
                        <TextField 
                            fullWidth 
                            type="number" 
                            label="Principle Amount (RWF)" 
                            value={findingsDialog.principleAmount} 
                            onChange={(e) => setFindingsDialog({ ...findingsDialog, principleAmount: e.target.value })} 
                        />
                        <TextField 
                            fullWidth 
                            type="number" 
                            label="Penalties Amount (RWF)" 
                            value={findingsDialog.penaltiesAmount} 
                            onChange={(e) => setFindingsDialog({ ...findingsDialog, penaltiesAmount: e.target.value })} 
                        />
                    </Box>
                    <TextField 
                        fullWidth multiline rows={6} 
                        label="Investigation Findings" 
                        placeholder="Detail what you investigated and found..."
                        value={findingsDialog.text} 
                        onChange={(e) => setFindingsDialog({ ...findingsDialog, text: e.target.value })} 
                        sx={{ mb: 2 }} 
                    />
                    <TextField 
                        fullWidth multiline rows={3} 
                        label="Recommendations" 
                        placeholder="Proposed actions or next steps..."
                        value={findingsDialog.recs} 
                        onChange={(e) => setFindingsDialog({ ...findingsDialog, recs: e.target.value })} 
                    />
                    
                    <Box sx={{ mt: 3, p: 2, border: '1px dashed #ccc', borderRadius: 2, bgcolor: '#f9f9f9' }}>
                        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>Evidence & Attachments</Typography>
                        <Button variant="outlined" component="label" fullWidth startIcon={<AttachFile />} sx={{ mb: 1 }}>
                            Attach Files
                            <input 
                                type="file" 
                                hidden 
                                multiple 
                                onChange={(e) => setFindingsDialog({ 
                                    ...findingsDialog, 
                                    files: [...findingsDialog.files, ...Array.from(e.target.files)] 
                                })} 
                            />
                        </Button>
                        <List dense>
                            {findingsDialog.files && findingsDialog.files.map((f, i) => (
                                <ListItem 
                                    key={i} 
                                    secondaryAction={
                                        <IconButton edge="end" color="error" onClick={() => {
                                            const newFiles = [...findingsDialog.files];
                                            newFiles.splice(i, 1);
                                            setFindingsDialog({ ...findingsDialog, files: newFiles });
                                        }}>
                                            <Delete />
                                        </IconButton>
                                    }
                                >
                                    <ListItemIcon><Description color="primary" /></ListItemIcon>
                                    <ListItemText primary={f.name} />
                                </ListItem>
                            ))}
                        </List>
                        <Typography variant="caption" color="textSecondary">Supported formats: PDF, Word, Excel, Images</Typography>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setFindingsDialog({ ...findingsDialog, open: false })}>Cancel</Button>
                    <Button 
                        onClick={handleFinalReportSubmit} 
                        variant="contained" 
                        color="success"
                        disabled={!findingsDialog.text}
                        sx={{ px: 4, fontWeight: 'bold' }}
                    >
                        Submit Report
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
                <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
};

export default InvestigationOfficer;
