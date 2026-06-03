import React, { useState, useEffect, useContext } from 'react';
import axios from '../api/axios.jsx';
import {
    Container, Typography, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Button, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField, Alert, Box, Chip, TablePagination
} from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import { hasPermission } from '../utils/authorization.js';

const PrsoReleases = () => {
    const [stocks, setStocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Modal state
    const [openReject, setOpenReject] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [selectedRelease, setSelectedRelease] = useState(null); // { stockId, releaseIndex }
    
    // Pagination state
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    
    const { authState } = useContext(AuthContext);
    const canApproveRelease = hasPermission(authState, 'STOCK_APPROVE_RELEASE');

    useEffect(() => {
        fetchStocks();
    }, []);

    const fetchStocks = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/stock', {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Filter stocks to only include ones that have releases
            const stockWithReleases = response.data.filter(s => s.releases && s.releases.length > 0);
            setStocks(stockWithReleases);
            setPage(0);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching stock:', err);
            setError('Failed to fetch releases.');
            setLoading(false);
        }
    };

    const handleApprove = async (stockId, releaseIndex) => {
        if (!canApproveRelease) return;
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/stock/${stockId}/release/${releaseIndex}/status`, 
            { 
                status: 'APPROVED', 
                prsoApprovedBy: authState.name || authState.employeeId 
            }, 
            { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchStocks();
        } catch (err) {
            setError(err.response?.data || 'Error approving release');
        }
    };

    const handleRejectOpen = (stockId, releaseIndex) => {
        if (!canApproveRelease) return;
        setSelectedRelease({ stockId, releaseIndex });
        setRejectionReason('');
        setOpenReject(true);
    };

    const handleRejectSubmit = async () => {
        if (!selectedRelease) return;
        if (!rejectionReason.trim()) {
            setError('Rejection reason is required.');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/stock/${selectedRelease.stockId}/release/${selectedRelease.releaseIndex}/status`, 
            { 
                status: 'REJECTED', 
                rejectionReason: rejectionReason,
                prsoApprovedBy: authState.name || authState.employeeId 
            }, 
            { headers: { Authorization: `Bearer ${token}` } }
            );
            setOpenReject(false);
            fetchStocks();
        } catch (err) {
            setError(err.response?.data || 'Error rejecting release');
        }
    };

    if (loading) return <Typography>Loading...</Typography>;

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" component="h1">
                    PRSO - Pending Releases
                </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Stock Seizure No</TableCell>
                            <TableCell>Release Date</TableCell>
                            <TableCell>Item Name</TableCell>
                            <TableCell>Quantity</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {stocks.flatMap((stock) => 
                            stock.releases.map((release, index) => ({ ...release, stockId: stock.id, seizureNumber: stock.seizureNumber, releaseIndex: index }))
                        )
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((release) => (
                            <TableRow key={`${release.stockId}-${release.releaseIndex}`}>
                                <TableCell>{release.seizureNumber}</TableCell>
                                <TableCell>{release.dateReleased}</TableCell>
                                <TableCell>{release.releasedItemName}</TableCell>
                                <TableCell>{release.quantityReleased}</TableCell>
                                <TableCell>
                                    <Chip 
                                        label={release.status || 'PENDING'} 
                                        color={release.status === 'APPROVED' ? 'success' : (release.status === 'REJECTED' ? 'error' : 'warning')} 
                                        size="small" 
                                    />
                                </TableCell>
                                <TableCell>
                                    {canApproveRelease && (!release.status || release.status === 'PENDING') && (
                                        <>
                                            <Button 
                                                variant="contained" 
                                                color="success" 
                                                size="small" 
                                                sx={{ mr: 1 }}
                                                onClick={() => handleApprove(release.stockId, release.releaseIndex)}
                                            >
                                                Approve
                                            </Button>
                                            <Button 
                                                variant="contained" 
                                                color="error" 
                                                size="small"
                                                onClick={() => handleRejectOpen(release.stockId, release.releaseIndex)}
                                            >
                                                Reject
                                            </Button>
                                        </>
                                    )}
                                    {release.status === 'REJECTED' && (
                                        <Typography variant="caption" color="error">
                                            Reason: {release.rejectionReason}
                                        </Typography>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <TablePagination
                    rowsPerPageOptions={[10, 20, 50, 100]}
                    component="div"
                    count={stocks.reduce((acc, stock) => acc + (stock.releases?.length || 0), 0)}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                />
            </TableContainer>

            {/* Reject Dialog */}
            <Dialog open={openReject} onClose={() => setOpenReject(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Reject Release</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Reason for Rejection"
                        type="text"
                        fullWidth
                        multiline
                        rows={4}
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        required
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenReject(false)}>Cancel</Button>
                    <Button onClick={handleRejectSubmit} variant="contained" color="error" disabled={!canApproveRelease}>
                        Confirm Rejection
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default PrsoReleases;
