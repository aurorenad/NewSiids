import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import { Description, Search } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ReportApi } from '../api/Axios/caseApi';
import { routeTo } from '../constants/routes';
import AppTable from './ui/AppTable.jsx';

const ROWS_PER_PAGE = 10;

const STATUS_OPTIONS = [
    { value: 'all', label: 'All Statuses' },
    { value: 'INVESTIGATION_COMPLETED', label: 'Investigation Completed' },
    { value: 'REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE', label: 'Approved' },
    { value: 'REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE', label: 'Rejected' },
    { value: 'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER', label: 'Returned' },
    { value: 'REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE', label: 'Submitted' },
    { value: 'REPORT_ASSIGNED_TO_INVESTIGATION_OFFICER', label: 'Assigned to Investigation Officer' }
];

const DirectorIntelligenceCaseReports = () => {
    const [reports, setReports] = useState([]);
    const [totalReports, setTotalReports] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        fetchCaseReports();
    }, [page, searchQuery]);

    const fetchCaseReports = async () => {
        try {
            setLoading(true);
            const response = await ReportApi.getReportsForDirectorIntelligence({
                page,
                size: ROWS_PER_PAGE,
                search: searchQuery,
                sort: 'desc'
            });

            const pageData = response.data || {};
            const rows = Array.isArray(pageData) ? pageData : pageData.content || [];
            setReports(rows);
            setTotalReports(Array.isArray(pageData) ? pageData.length : pageData.totalElements || rows.length);
            setError(null);
        } catch (err) {
            setReports([]);
            setTotalReports(0);
            setError(err.response?.data?.message || 'Failed to fetch case reports');
        } finally {
            setLoading(false);
        }
    };

    const handleSearchChange = (value) => {
        setSearchQuery(value);
        setPage(0);
    };

    const handleStatusChange = (event) => {
        setStatusFilter(event.target.value);
        setPage(0);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'CASE_CREATED': return 'primary';
            case 'INVESTIGATION_COMPLETED': return 'success';
            case 'REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE': return 'success';
            case 'REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE': return 'error';
            case 'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER': return 'warning';
            case 'REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE': return 'info';
            default: return 'default';
        }
    };

    const getStatusText = (status) => {
        const statusMap = {
            CASE_CREATED: 'Case Created',
            INVESTIGATION_COMPLETED: 'Investigation Completed',
            REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE: 'Approved',
            REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE: 'Rejected',
            REPORT_RETURNED_TO_INTELLIGENCE_OFFICER: 'Returned',
            REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE: 'Submitted',
            REPORT_ASSIGNED_TO_INVESTIGATION_OFFICER: 'Assigned to Investigation Officer'
        };
        return statusMap[status] || status?.replace(/_/g, ' ') || 'Unknown Status';
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
    };

    const visibleReports = useMemo(() => {
        if (statusFilter === 'all') return reports;
        return reports.filter((report) => report?.status === statusFilter);
    }, [reports, statusFilter]);

    const tableColumns = useMemo(() => [
        {
            key: 'caseNumber',
            label: 'Case Number',
            render: (report) => report.relatedCase?.caseNum || '-'
        },
        {
            key: 'taxPeriod',
            label: 'Tax Period',
            render: (report) => report.relatedCase?.taxPeriod || '-'
        },
        {
            key: 'description',
            label: 'Description',
            render: (report) => report.description || '-'
        },
        {
            key: 'createdBy',
            label: 'Created By',
            render: (report) => report.createdBy || '-'
        },
        {
            key: 'status',
            label: 'Status',
            render: (report) => (
                <Chip
                    label={getStatusText(report.status)}
                    color={getStatusColor(report.status)}
                    size="small"
                />
            )
        },
        {
            key: 'createdAt',
            label: 'Created Date',
            render: (report) => formatDate(report.createdAt || report.createdDate || report.dateCreated)
        },
        {
            key: 'actions',
            label: 'Actions',
            headerStyle: { textAlign: 'center' },
            cellStyle: { textAlign: 'center' },
            render: (report) => (
                <Tooltip title="View Details">
                    <IconButton
                        onClick={() => navigate(routeTo.reportDetails(report.id))}
                        size="small"
                    >
                        <Description fontSize="small" />
                    </IconButton>
                </Tooltip>
            )
        }
    ], [navigate]);

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

            <Box display="flex" justifyContent="space-between" alignItems="center" gap={2} mb={2} flexWrap="wrap">
                <TextField
                    size="small"
                    variant="outlined"
                    placeholder="Search by Case Number, Tax Type, or Description"
                    value={searchQuery}
                    onChange={(event) => handleSearchChange(event.target.value)}
                    InputProps={{
                        startAdornment: <Search fontSize="small" style={{ marginRight: 8 }} />
                    }}
                    sx={{ minWidth: { xs: '100%', sm: 320 } }}
                />

                <FormControl size="small" sx={{ minWidth: 240 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                        value={statusFilter}
                        onChange={handleStatusChange}
                        label="Status"
                        MenuProps={{
                            PaperProps: {
                                sx: { zIndex: 5000 }
                            }
                        }}
                    >
                        {STATUS_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {loading && (
                    <Box display="flex" alignItems="center" gap={1} color="text.secondary">
                        <CircularProgress size={18} />
                        <Typography variant="body2">Loading reports...</Typography>
                    </Box>
                )}
            </Box>

            <AppTable
                columns={tableColumns}
                rows={visibleReports}
                loading={loading}
                emptyMessage="No case reports found"
                page={page}
                rowsPerPage={ROWS_PER_PAGE}
                totalRows={statusFilter === 'all' ? totalReports : visibleReports.length}
                onPageChange={(event, nextPage) => setPage(nextPage)}
                minWidth={1100}
            />
        </Box>
    );
};

export default DirectorIntelligenceCaseReports;
