import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from '../api/axios.jsx';
import {
    Container, Typography, Button, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField, Alert, Box, Chip
} from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import { hasPermission } from '../utils/authorization.js';
import { PERMISSIONS } from '../constants/permissions';
import AppTable from './ui/AppTable.jsx';

const ROWS_PER_PAGE = 10;

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
    
    const { authState } = useContext(AuthContext);
    const canApproveRelease = hasPermission(authState, PERMISSIONS.STOCK_APPROVE_RELEASE);

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

    const releases = useMemo(() => stocks.flatMap((stock) =>
        (stock.releases || []).map((release, index) => ({
            ...release,
            stockId: stock.id,
            seizureNumber: stock.seizureNumber,
            releaseIndex: index
        }))
    ), [stocks]);

    const pagedReleases = useMemo(() => {
        const start = page * ROWS_PER_PAGE;
        return releases.slice(start, start + ROWS_PER_PAGE);
    }, [releases, page]);

    const tableColumns = useMemo(() => [
        { key: 'seizureNumber', label: 'Stock Seizure No', render: (release) => release.seizureNumber || '-' },
        { key: 'dateReleased', label: 'Release Date', render: (release) => release.dateReleased || '-' },
        { key: 'releasedItemName', label: 'Item Name', render: (release) => release.releasedItemName || '-' },
        { key: 'quantityReleased', label: 'Quantity', render: (release) => release.quantityReleased || '-' },
        {
            key: 'status',
            label: 'Status',
            render: (release) => (
                <Chip
                    label={release.status || 'PENDING'}
                    color={release.status === 'APPROVED' ? 'success' : (release.status === 'REJECTED' ? 'error' : 'warning')}
                    size="small"
                />
            )
        },
        {
            key: 'actions',
            label: 'Actions',
            cellStyle: { minWidth: 240 },
            render: (release) => (
                <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
                    {canApproveRelease && (!release.status || release.status === 'PENDING') && (
                        <>
                            <Button
                                variant="contained"
                                color="success"
                                size="small"
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
                </Box>
            )
        }
    ], [canApproveRelease]);

    if (loading) return <Typography>Loading...</Typography>;

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" component="h1">
                    PRSO - Pending Releases
                </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <AppTable
                columns={tableColumns}
                rows={pagedReleases}
                loading={loading}
                emptyMessage="No pending releases found"
                page={page}
                rowsPerPage={ROWS_PER_PAGE}
                totalRows={releases.length}
                onPageChange={(event, nextPage) => setPage(nextPage)}
                minWidth={900}
            />

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
