import { useEffect, useState } from 'react';
import './../Styles/History.css';
import { AuditApi } from "../api/Axios/caseApi.jsx";
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    CircularProgress,
    Alert,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    Button,
    Pagination,
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

const History = () => {
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [filterAction, setFilterAction] = useState('');
    const [availableActions, setAvailableActions] = useState([]);

    useEffect(() => {
        const fetchAuditLogs = async () => {
            try {
                const response = await AuditApi.getAuditLogs();
                // Sort by timestamp descending (newest first)
                const sortedLogs = response.data.sort((a, b) =>
                    new Date(b.timestamp) - new Date(a.timestamp)
                );
                setAuditLogs(sortedLogs);
                const actions = [...new Set(sortedLogs.map(log => log.action))].sort();
                setAvailableActions(actions);
                setLoading(false);
            } catch (err) {
                console.error('Failed to fetch audit logs:', err);
                setError(err.response?.data?.message || 'Failed to fetch audit logs');
                setLoading(false);
            }
        };

        fetchAuditLogs();
    }, []);

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

    const filteredLogs = filterAction
        ? auditLogs.filter(log => log.action === filterAction)
        : auditLogs;

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

    const handlePageChange = (event, value) => {
        setCurrentPage(value);
    };
    const handleFilterChange = (event) => {
        setFilterAction(event.target.value);
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setFilterAction('');
        setCurrentPage(1);
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

            {/* Results Count */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary">
                    Showing {currentItems.length} of {filteredLogs.length} audit logs
                    {filterAction && (
                        <Chip
                            label={`Filtered by: ${filterAction}`}
                            color="primary"
                            variant="outlined"
                            size="small"
                            sx={{ ml: 1 }}
                            onDelete={clearFilters}
                        />
                    )}
                </Typography>
            </Box>
            {currentItems.length === 0 ? (
                <Alert severity="info" sx={{ mt: 3 }}>
                    {filterAction
                        ? `No audit logs found for action "${filterAction}"`
                        : 'No audit logs found.'
                    }
                </Alert>
            ) : (
                <>
                    <TableContainer component={Paper} id="auditTable" sx={{ mb: 3 }}>
                        <Table sx={{ minWidth: 650 }} aria-label="audit logs table">
                            <TableHead sx={{ backgroundColor: 'primary.main' }}>
                                <TableRow>
                                    <TableCell sx={{ color: 'black', fontWeight: 'bold' }}>Timestamp</TableCell>
                                    <TableCell sx={{ color: 'black', fontWeight: 'bold' }}>Action</TableCell>
                                    <TableCell sx={{ color: 'black', fontWeight: 'bold' }}>Description</TableCell>
                                    <TableCell sx={{ color: 'black', fontWeight: 'bold' }}>Performed By</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {currentItems.map((log) => (
                                    <TableRow
                                        key={log.id}
                                        sx={{
                                            '&:nth-of-type(odd)': { backgroundColor: 'action.hover' },
                                            '&:last-child td, &:last-child th': { border: 0 }
                                        }}
                                    >
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                                {formatDateTime(log.timestamp)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={log.action}
                                                variant="filled"
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {log.description}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {log.performedBy?.firstName} {log.performedBy?.lastName}
                                                {log.performedBy?.employeeId && (
                                                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                                        ({log.performedBy.employeeId})
                                                    </Typography>
                                                )}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <Box display="flex" justifyContent="center" sx={{ mt: 3 }}>
                            <Pagination
                                count={totalPages}
                                page={currentPage}
                                onChange={handlePageChange}
                                color="primary"
                                size="large"
                                showFirstButton
                                showLastButton
                                sx={{
                                    '& .MuiPaginationItem-root': {
                                        fontSize: '1.1rem',
                                        minWidth: '40px',
                                        height: '40px'
                                    }
                                }}
                            />
                        </Box>
                    )}
                </>
            )}
        </Box>
    );
};

export default History;
