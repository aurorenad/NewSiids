import React, { useState, useEffect } from 'react';
import {
    Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Typography,
    Box, CircularProgress, Alert, TextField,
    Chip, Select, MenuItem, FormControl, InputLabel,
    Button, IconButton, Tooltip
} from '@mui/material';
import { Search, Description, Info } from '@mui/icons-material';
import { ReportApi } from '../api/Axios/caseApi';
import { useNavigate } from 'react-router-dom';

const DirectorIntelligenceCaseReports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [taxTypeFilter, setTaxTypeFilter] = useState('all');
    const navigate = useNavigate();

    useEffect(() => {
        fetchCaseReports();
    }, []);

    const fetchCaseReports = async () => {
        try {
            setLoading(true);
            const response = await ReportApi.getReportsForDirectorIntelligence();
            setReports(response.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch case reports');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'CASE_CREATED': return 'primary';
            case 'INVESTIGATION_COMPLETED': return 'success';
            case 'REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE': return 'success';
            case 'REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE': return 'error';
            case 'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER': return 'warning';
            default: return 'default';
        }
    };

    const getStatusText = (status) => {
        const statusMap = {
            'CASE_CREATED': 'Case Created',
            'INVESTIGATION_COMPLETED': 'Investigation Completed',
            'REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE': 'Approved',
            'REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE': 'Rejected',
            'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER': 'Returned',
            'REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE': 'Submitted'
        };
        return statusMap[status] || status?.replace(/_/g, ' ') || 'Unknown Status';
    };

    const filteredReports = reports.filter(report => {
        if (!report) return false;

        // Safely access properties
        const caseNum = report.relatedCase?.caseNum?.toLowerCase() || '';
        const taxType = report.relatedCase?.taxType?.toLowerCase() || '';
        const description = report.description?.toLowerCase() || '';
        const status = report.status || '';
        const currentTaxType = report.relatedCase?.taxType || '';

        // Search filter
        const matchesSearch = searchQuery === '' ||
            caseNum.includes(searchQuery.toLowerCase()) ||
            taxType.includes(searchQuery.toLowerCase()) ||
            description.includes(searchQuery.toLowerCase());

        // Status filter
        const matchesStatus = statusFilter === 'all' || status === statusFilter;

        // Tax type filter
        const matchesTaxType = taxTypeFilter === 'all' || currentTaxType === taxTypeFilter;

        return matchesSearch && matchesStatus && matchesTaxType;
    });

    const uniqueTaxTypes = [...new Set(reports.map(report => report.relatedCase?.taxType).filter(Boolean))];

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                <CircularProgress size={50} />
            </Box>
        );
    }

    return (
        <Box padding={2}>
            <Typography variant="h4" gutterBottom>
                Director of Intelligence - Case Reports
            </Typography>

            {error && (
                <Box mb={2}>
                    <Alert severity="error" onClose={() => setError(null)}>
                        {error}
                    </Alert>
                </Box>
            )}

            <Box display="flex" gap={2} mb={3} flexWrap="wrap">
                <TextField
                    size="small"
                    variant="outlined"
                    placeholder="Search by Case Number, Tax Type, or Description"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: <Search fontSize="small" style={{ marginRight: 8 }} />
                    }}
                    sx={{ minWidth: 300 }}
                />

                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        label="Status"
                    >
                        <MenuItem value="all">All Statuses</MenuItem>
                        <MenuItem value="CASE_CREATED">Case Created</MenuItem>
                        <MenuItem value="INVESTIGATION_COMPLETED">Investigation Completed</MenuItem>
                        <MenuItem value="REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE">Approved</MenuItem>
                        <MenuItem value="REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE">Rejected</MenuItem>
                        <MenuItem value="REPORT_RETURNED_TO_INTELLIGENCE_OFFICER">Returned</MenuItem>
                    </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Tax Type</InputLabel>
                    <Select
                        value={taxTypeFilter}
                        onChange={(e) => setTaxTypeFilter(e.target.value)}
                        label="Tax Type"
                    >
                        <MenuItem value="all">All Tax Types</MenuItem>
                        {uniqueTaxTypes.map(type => (
                            <MenuItem key={type} value={type}>{type}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Case Number</TableCell>
                            <TableCell>Tax Period</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell>Created By</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Created Date</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredReports.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
                                    <Typography variant="body2" color="text.secondary">
                                        No case reports found
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredReports.map((report) => (
                                <TableRow key={report.id}>
                                    <TableCell>{report.relatedCase?.caseNum || '-'}</TableCell>
                                    <TableCell>{report.relatedCase?.taxPeriod
                                        || '-'}</TableCell>
                                    <TableCell>{report.description || '-'}</TableCell>
                                    <TableCell>{report.createdBy || '-'}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={getStatusText(report.status)}
                                            color={getStatusColor(report.status)}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Box display="flex" gap={1}>
                                            <Tooltip title="View Details">
                                                <IconButton
                                                    onClick={() => navigate(`/view-report/${report.id}`)}
                                                    size="small"
                                                >
                                                    <Description fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="More Info">
                                                <IconButton
                                                    onClick={() => navigate(`/reports/${report.id}`)}
                                                    size="small"
                                                >
                                                    <Info fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default DirectorIntelligenceCaseReports;