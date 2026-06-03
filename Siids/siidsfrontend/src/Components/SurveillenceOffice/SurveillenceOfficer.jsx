import React, { useContext, useEffect, useState, useMemo } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Paper,
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    Alert,
    Tooltip,
    IconButton,
    Chip,
    Grid,
    Card,
    CardContent,
    TablePagination
} from '@mui/material';
import {
    Add as AddIcon,
    Description as DescriptionIcon,
    Search as SearchIcon,
    FilterList as FilterListIcon,
    Inventory as InventoryIcon,
    Assignment as AssignmentIcon,
    CheckCircle as CheckCircleIcon,
    Gavel as GavelIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { CaseService } from '../../api/Axios/caseApi.jsx';
import { stockApi } from '../../api/stockApi';
import { AuthContext } from '../../context/AuthContext.jsx';
import { hasPermission } from '../../utils/authorization.js';

const SurveillanceOfficer = () => {
    const { authState } = useContext(AuthContext);
    const [cases, setCases] = useState([]);
    const [filteredCases, setFilteredCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    const [showOnlyCreated, setShowOnlyCreated] = useState(false);
    const [tempStock, setTempStock] = useState([]);
    
    // Pagination state
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const navigate = useNavigate();
    const location = useLocation();
    const canCreateSurveillance = hasPermission(authState, 'SURVEILLANCE_CREATE');
    const canUpdateCase = hasPermission(authState, 'CASE_UPDATE');
    const canViewStock = hasPermission(authState, 'STOCK_VIEW');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [casesRes, tempStockRes] = await Promise.all([
                    CaseService.getMyCases(),
                    stockApi.getTemporaryStock()
                ]);
                setCases(casesRes.data || []);
                setFilteredCases(casesRes.data || []);
                setTempStock(tempStockRes.data || []);
            } catch (err) {
                console.error('Failed to load data:', err);
                setError(err.response?.data?.message || 'Failed to load data');
                showSnackbar('Failed to load data', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        if (location.state?.newCase) {
            const { newCase } = location.state;
            setCases(prevCases => [...prevCases, newCase]);
            showSnackbar(`Case ${newCase.caseNum} created successfully`, 'success');
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, navigate, location.pathname]);

    useEffect(() => {
        let results = cases;
        if (searchTerm) {
            results = results.filter(caseItem =>
                Object.values(caseItem).some(
                    value => value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
                ));
        }
        if (showOnlyCreated) {
            results = results.filter(caseItem => caseItem.status === 'CASE_CREATED');
        }
        setFilteredCases(results);
        setPage(0); // Reset to page 1 when filter changes
    }, [searchTerm, cases, showOnlyCreated]);

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const paginatedCases = useMemo(() => {
        return filteredCases.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }, [filteredCases, page, rowsPerPage]);

    const showSnackbar = (message, severity) => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'CASE_CREATED': return { bg: '#e3f2fd', color: '#1976d2' };
            case 'SENT_TO_INVESTIGATION': return { bg: '#e8f5e9', color: '#4caf50' };
            case 'IN_PROGRESS': return { bg: '#fff3e0', color: '#ff9800' };
            case 'CLOSED': return { bg: '#ffebee', color: '#f44336' };
            default: return { bg: '#f5f5f5', color: '#757575' };
        }
    };

    // Calculate Summary Stats
    const stats = useMemo(() => {
        return {
            total: cases.length,
            active: cases.filter(c => c.status === 'CASE_CREATED' || c.status === 'IN_PROGRESS').length,
            sent: cases.filter(c => c.status === 'SENT_TO_INVESTIGATION').length,
            closed: cases.filter(c => c.status === 'CLOSED').length
        };
    }, [cases]);

    const calculateDaysLeft = (dateSeized) => {
        if (!dateSeized) return null;
        const seizedDate = new Date(dateSeized);
        const dueDate = new Date(seizedDate);
        dueDate.setDate(dueDate.getDate() + 30);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        const diffTime = dueDate - today;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const dashboardAlerts = useMemo(() => {
        const returned = tempStock.filter(item => item.status === 'RETURNED_FOR_CORRECTION');
        const critical = tempStock.filter(item => {
            if (item.status !== 'IN_TEMPORARY_STOCK' && item.status !== 'RETURNED_FOR_CORRECTION') return false;
            const days = calculateDaysLeft(item.dateTimeSeized);
            return days !== null && days <= 5;
        });
        return { returned, critical };
    }, [tempStock]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
                <CircularProgress sx={{ color: '#003DA5' }} />
            </Box>
        );
    }

    if (error) {
        return (
            <Box p={3}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    return (
        <Box p={3} sx={{ backgroundColor: '#f8f9fa', minHeight: '100vh', fontFamily: "'Outfit', sans-serif" }}>
            
            {/* Header Section */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h4" sx={{ fontFamily: "'DM Serif Display', serif", color: '#003DA5', mb: 1 }}>
                        Surveillance Dashboard
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Manage your operational missions and track seized goods.
                    </Typography>
                </Box>
                <Box display="flex" gap={2}>
                    {canViewStock && (
                        <Button
                            variant="outlined"
                            startIcon={<InventoryIcon />}
                            onClick={() => navigate('/pv/temporary-stock')}
                            sx={{ 
                                color: '#003DA5', 
                                borderColor: '#003DA5',
                                textTransform: 'none',
                                fontWeight: 600,
                                borderRadius: 2
                            }}
                        >
                            View Temporary Stock
                        </Button>
                    )}
                    {canCreateSurveillance && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => navigate('/surveillence-officer/new')}
                            sx={{ 
                                backgroundColor: '#009A44', 
                                '&:hover': { backgroundColor: '#007a33' },
                                textTransform: 'none',
                                fontWeight: 600,
                                borderRadius: 2,
                                boxShadow: '0 4px 6px rgba(0, 154, 68, 0.2)'
                            }}
                        >
                            New Case
                        </Button>
                    )}
                </Box>
            </Box>

            {/* Action Required Banner */}
            {(dashboardAlerts.returned.length > 0 || dashboardAlerts.critical.length > 0) && (
                <Alert 
                    severity="warning" 
                    sx={{ 
                        mb: 4, 
                        borderRadius: 3, 
                        boxShadow: '0 4px 12px rgba(245, 168, 0, 0.1)',
                        borderLeft: '5px solid #F5A800',
                        backgroundColor: '#fffbeb',
                        fontFamily: "'Outfit', sans-serif",
                        '& .MuiAlert-message': {
                            width: '100%'
                        }
                    }}
                >
                    <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                        <Box>
                            <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#b45309', fontFamily: "'Outfit', sans-serif" }}>
                                Action Required in Temporary Stock
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#d97706', mt: 0.5, fontFamily: "'Outfit', sans-serif" }}>
                                {dashboardAlerts.returned.length > 0 && `• You have ${dashboardAlerts.returned.length} seizure note(s) returned for correction.`}
                                {dashboardAlerts.returned.length > 0 && dashboardAlerts.critical.length > 0 && <br />}
                                {dashboardAlerts.critical.length > 0 && `• You have ${dashboardAlerts.critical.length} item(s) nearing their 30-day justification deadline.`}
                            </Typography>
                        </Box>
                        <Button 
                            variant="contained" 
                            size="small"
                            onClick={() => navigate('/pv/temporary-stock')}
                            sx={{ 
                                backgroundColor: '#F5A800', 
                                color: '#fff',
                                '&:hover': { backgroundColor: '#d99400' },
                                textTransform: 'none',
                                fontWeight: 600,
                                borderRadius: 1.5,
                                fontFamily: "'Outfit', sans-serif"
                            }}
                        >
                            Go to Temporary Stock
                        </Button>
                    </Box>
                </Alert>
            )}

            {/* Summary Cards */}
            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} md={3}>
                    <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', borderLeft: '5px solid #003DA5' }}>
                        <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">TOTAL MISSIONS</Typography>
                                    <Typography variant="h3" sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, mt: 1 }}>{stats.total}</Typography>
                                </Box>
                                <AssignmentIcon sx={{ fontSize: 40, color: 'rgba(0, 61, 165, 0.2)' }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', borderLeft: '5px solid #F5A800' }}>
                        <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">ACTIVE / IN PROGRESS</Typography>
                                    <Typography variant="h3" sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, mt: 1 }}>{stats.active}</Typography>
                                </Box>
                                <GavelIcon sx={{ fontSize: 40, color: 'rgba(245, 168, 0, 0.2)' }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', borderLeft: '5px solid #4caf50' }}>
                        <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">SENT TO INVESTIGATION</Typography>
                                    <Typography variant="h3" sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, mt: 1 }}>{stats.sent}</Typography>
                                </Box>
                                <CheckCircleIcon sx={{ fontSize: 40, color: 'rgba(76, 175, 80, 0.2)' }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', borderLeft: '5px solid #f44336' }}>
                        <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">CLOSED CASES</Typography>
                                    <Typography variant="h3" sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, mt: 1 }}>{stats.closed}</Typography>
                                </Box>
                                <CheckCircleIcon sx={{ fontSize: 40, color: 'rgba(244, 67, 54, 0.2)' }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Table Area */}
            <Paper elevation={0} sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <Box p={3} borderBottom="1px solid #eee" display="flex" justifyContent="space-between" alignItems="center" bgcolor="#fff">
                    <Typography variant="h6" sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600 }}>
                        Recent Operations
                    </Typography>
                    <Box display="flex" alignItems="center" gap={2}>
                        <TextField
                            size="small"
                            placeholder="Search operations..."
                            variant="outlined"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <IconButton edge="start" size="small">
                                        <SearchIcon fontSize="small" />
                                    </IconButton>
                                ),
                                sx: { borderRadius: 2, backgroundColor: '#f5f5f5', '& fieldset': { border: 'none' } }
                            }}
                        />
                        <Tooltip title={showOnlyCreated ? "Show all" : "Show active only"}>
                            <IconButton 
                                onClick={() => setShowOnlyCreated(!showOnlyCreated)}
                                sx={{ backgroundColor: showOnlyCreated ? '#e3f2fd' : '#f5f5f5', color: showOnlyCreated ? '#003DA5' : 'inherit' }}
                            >
                                <FilterListIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: '#fafafa' }}>
                                <TableCell sx={{ fontWeight: 600, color: '#555' }}>Case Ref</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#555' }}>TIN</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#555' }}>Taxpayer Name</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#555' }}>Status</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600, color: '#555' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedCases.length > 0 ? (
                                paginatedCases.map((caseItem) => {
                                    const statusStyle = getStatusColor(caseItem.status);
                                    return (
                                        <TableRow key={caseItem.caseNum} hover>
                                            <TableCell sx={{ fontWeight: 500 }}>{caseItem.caseNum}</TableCell>
                                            <TableCell>{caseItem.taxPayer?.tin || '-'}</TableCell>
                                            <TableCell>{caseItem.taxPayer?.name || '-'}</TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={caseItem.status.replace(/_/g, ' ')} 
                                                    size="small" 
                                                    sx={{ 
                                                        backgroundColor: statusStyle.bg, 
                                                        color: statusStyle.color,
                                                        fontWeight: 600,
                                                        fontSize: '0.75rem'
                                                    }} 
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <Box display="flex" justifyContent="flex-end" alignItems="center" gap={1}>
                                                    {canUpdateCase && (caseItem.status === 'CASE_CREATED' || caseItem.status === 'REPORT_SUBMITTED') && (
                                                        <Tooltip title="Edit Case">
                                                            <IconButton
                                                                onClick={() => navigate('/surveillence-officer/edit-case', { state: { caseData: caseItem } })}
                                                                size="small"
                                                                sx={{ color: 'var(--rra-blue)', backgroundColor: 'rgba(0, 61, 165, 0.05)' }}
                                                            >
                                                                <AssignmentIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                    {canCreateSurveillance && canViewStock && (
                                                        <Button
                                                            variant="contained"
                                                            size="small"
                                                            startIcon={<InventoryIcon fontSize="small" />}
                                                            onClick={() => navigate('/pv/temporary-stock', { state: { caseRef: caseItem.caseNum } })}
                                                            sx={{ 
                                                                backgroundColor: '#F5A800', 
                                                                color: '#fff',
                                                                '&:hover': { backgroundColor: '#d99400' },
                                                                textTransform: 'none',
                                                                boxShadow: 'none',
                                                                borderRadius: 1.5
                                                            }}
                                                        >
                                                            Seize
                                                        </Button>
                                                    )}
                                                    <Tooltip title="View Case">
                                                        <IconButton
                                                            onClick={() => navigate(`/surveillence-officer/view/${encodeURIComponent(caseItem.caseNum)}`)}
                                                            size="small"
                                                            sx={{ color: '#003DA5', backgroundColor: 'rgba(0, 61, 165, 0.1)' }}
                                                        >
                                                            <DescriptionIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                                        <Typography variant="body1" color="text.secondary">
                                            {cases.length === 0 ? 'No active surveillance cases found.' : 'No matching cases found.'}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[10, 20, 50, 100]}
                    component="div"
                    count={filteredCases.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    sx={{
                        borderTop: '1px solid #eee',
                        '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                            fontFamily: "'Outfit', sans-serif",
                            fontWeight: 500
                        }
                    }}
                />
            </Paper>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default SurveillanceOfficer;
