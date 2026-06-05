import { useEffect, useMemo, useState } from 'react';
import './../Styles/History.css';
import { AuditApi } from "../api/Axios/caseApi.jsx";
import {
    Box,
    Typography,
    CircularProgress,
    Alert,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    Button,
    Chip,
    Card,
    CardContent,
    Grid
} from '@mui/material';
import {
    FilterList,
    Clear
} from '@mui/icons-material';

import jsPDF from "jspdf";
import "jspdf-autotable";
import html2canvas from "html2canvas";
import AppTable from './ui/AppTable.jsx';

const ROWS_PER_PAGE = 10;

const History = () => {
    const [auditLogs, setAuditLogs] = useState([]);
    const [totalLogs, setTotalLogs] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [filterAction, setFilterAction] = useState('');
    const [availableActions, setAvailableActions] = useState([]);

    useEffect(() => {
        fetchAuditActions();
    }, []);

    useEffect(() => {
        fetchAuditLogs();
    }, [page, filterAction]);

    const fetchAuditActions = async () => {
        try {
            const response = await AuditApi.getAuditActions();
            setAvailableActions(response.data || []);
        } catch (err) {
            console.error('Failed to fetch audit actions:', err);
        }
    };

    const fetchAuditLogs = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await AuditApi.getAuditLogs({
                page,
                size: ROWS_PER_PAGE,
                action: filterAction || undefined,
            });
            const pageData = response.data || {};
            setAuditLogs(pageData.content || []);
            setTotalLogs(pageData.totalElements || 0);
        } catch (err) {
            console.error('Failed to fetch audit logs:', err);
            setError(err.response?.data?.message || 'Failed to fetch audit logs');
            setAuditLogs([]);
            setTotalLogs(0);
        } finally {
            setLoading(false);
        }
    };

    const formatDateTime = (dateTimeString) => {
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };
        return new Date(dateTimeString).toLocaleDateString(undefined, options);
    };

    const handleFilterChange = (event) => {
        setFilterAction(event.target.value);
        setPage(0);
    };

    const clearFilters = () => {
        setFilterAction('');
        setPage(0);
    };

    const exportStyledPDF = () => {
        const input = document.getElementById("auditTable");

        html2canvas(input).then((canvas) => {
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF("p", "mm", "a4");
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
            pdf.save("audit_logs.pdf");
        });
    };

    const tableColumns = useMemo(() => [
        {
            key: 'timestamp',
            label: 'Timestamp',
            render: (log) => (
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {formatDateTime(log.timestamp)}
                </Typography>
            )
        },
        {
            key: 'action',
            label: 'Action',
            render: (log) => (
                <Chip
                    label={log.action}
                    variant="filled"
                    size="small"
                />
            )
        },
        {
            key: 'description',
            label: 'Description',
            render: (log) => log.description || '-'
        },
        {
            key: 'performedBy',
            label: 'Performed By',
            render: (log) => (
                <Typography variant="body2">
                    {log.performedBy?.firstName} {log.performedBy?.lastName}
                    {log.performedBy?.employeeId && (
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            ({log.performedBy.employeeId})
                        </Typography>
                    )}
                </Typography>
            )
        }
    ], []);

    if (loading) {
        return (
            <Box className="page-container" display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
                <Typography variant="h6" sx={{ ml: 2 }}>Loading audit logs...</Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box className="page-container">
                <Alert severity="error" sx={{ mb: 2 }}>
                    Error: {error}
                </Alert>
            </Box>
        );
    }

    return (
        <Box className="page-container" sx={{ p: 3 }}>
            <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main', mb: 3 }}>
                Audit Logs
            </Typography>

            <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
                <Button variant="outlined" color="primary" onClick={exportStyledPDF}>
                    Download PDF (Styled)
                </Button>
            </Box>

            {/* Filter Section */}
            <Card sx={{ mb: 3, backgroundColor: 'grey.50' }}>
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={4}>
                            <FormControl fullWidth variant="outlined">
                                <InputLabel id="action-filter-label">Filter by Action</InputLabel>
                                <Select
                                    labelId="action-filter-label"
                                    id="actionFilter"
                                    value={filterAction}
                                    onChange={handleFilterChange}
                                    label="Filter by Action"
                                    startAdornment={<FilterList sx={{ mr: 1, color: 'action.active' }} />}
                                >
                                    <MenuItem value="">
                                        <em>All Actions</em>
                                    </MenuItem>
                                    {availableActions.map(action => (
                                        <MenuItem key={action} value={action}>
                                            {action}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6} md={2}>
                            <Button
                                variant="outlined"
                                onClick={clearFilters}
                                disabled={!filterAction}
                                startIcon={<Clear />}
                                fullWidth
                                sx={{ height: '56px' }}
                            >
                                Clear Filter
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {filterAction && (
                <Box sx={{ mb: 2 }}>
                    <Chip
                        label={`Filtered by: ${filterAction}`}
                        color="primary"
                        variant="outlined"
                        size="small"
                        onDelete={clearFilters}
                    />
                </Box>
            )}

            <Box id="auditTable">
                <AppTable
                    columns={tableColumns}
                    rows={auditLogs}
                    loading={loading}
                    emptyMessage={filterAction ? `No audit logs found for action "${filterAction}"` : 'No audit logs found.'}
                    page={page}
                    rowsPerPage={ROWS_PER_PAGE}
                    totalRows={totalLogs}
                    onPageChange={(event, nextPage) => setPage(nextPage)}
                    minWidth={900}
                />
            </Box>
        </Box>
    );
};

export default History;
