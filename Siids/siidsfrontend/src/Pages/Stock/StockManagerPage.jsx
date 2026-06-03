import React, { useContext, useState, useEffect, useMemo } from 'react';
import { stockApi } from '../../api/stockApi';
import RightDrawer from '../../Components/ui/RightDrawer';
import ConfirmDialog from '../../Components/ui/ConfirmDialog';
import RequestReleaseModal from '../../Components/ui/RequestReleaseModal';
import { toast, Toaster } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Box, Typography, Paper, Grid, TextField, MenuItem, Button, 
  IconButton, InputAdornment, Chip, CircularProgress, Tooltip,
  Tabs, Tab, Divider, TablePagination
} from '@mui/material';
import { 
  Search, Description, KeyboardReturn, Share, Inventory, 
  Download, Gavel, Info, CheckCircle, HourglassEmpty, 
  LocalShipping, Warning
} from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';
import { hasPermission } from '../../utils/authorization';

const StockManagerPage = () => {
  const { authState } = useContext(AuthContext);
  const [stockList, setStockList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0); 
  
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [releaseModalOpen, setReleaseModalOpen] = useState(false);
  const [returnDialog, setReturnDialog] = useState(false);
  const [approveDialog, setApproveDialog] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const canManageStock = hasPermission(authState, 'STOCK_MANAGE');

  const fetchStock = async () => {
    try {
      setIsLoading(true);
      const res = await stockApi.getMainStock();
      setStockList(res.data || []);
    } catch (err) {
      toast.error('Failed to load main stock inventory');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    fetchStock(); 
  }, []);

  const filteredByStatus = useMemo(() => {
    switch(activeTab) {
      case 0: 
        return stockList.filter(i => 
          i.status === 'PENDING_REVIEW' || 
          i.status === 'RETURNED' || 
          i.status === 'ESCALATED' || 
          i.status === 'RETURNED_FOR_CORRECTION' ||
          i.status === 'IN_TEMPORARY_STOCK' ||
          i.status === 'PENDING_JUSTIFICATION'
        );
      case 1: 
        return stockList.filter(i => 
          i.status === 'IN_STOCK' || 
          i.status === 'IN_MAIN_STOCK' ||
          (!['PENDING_REVIEW', 'RETURNED', 'ESCALATED', 'RETURNED_FOR_CORRECTION', 'PENDING_RELEASE', 'PENDING_PRSO_RELEASE_APPROVAL', 'RELEASED', 'RELEASED_FROM_MAIN', 'IN_TEMPORARY_STOCK', 'PENDING_JUSTIFICATION'].includes(i.status))
        );
      case 2: 
        return stockList.filter(i => 
          i.status === 'PENDING_RELEASE' || 
          i.status === 'PENDING_PRSO_RELEASE_APPROVAL' ||
          i.status === 'PENDING_PRSO_EDIT_APPROVAL'
        );
      case 3: 
        return stockList.filter(i => 
          i.status === 'RELEASED' || 
          i.status === 'RELEASED_FROM_MAIN'
        );
      default: return stockList;
    }
  }, [stockList, activeTab]);

  const processedStock = useMemo(() => {
    let list = [...filteredByStatus];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item => 
        item.seizureNumber?.toLowerCase().includes(q) ||
        item.taxpayerName?.toLowerCase().includes(q) ||
        item.goodsDescription?.toLowerCase().includes(q) ||
        item.pvNumber?.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.dateTimeSeized || 0);
      const dateB = new Date(b.createdAt || b.dateTimeSeized || 0);
      if (sortBy === 'date_desc') return dateB - dateA;
      if (sortBy === 'date_asc') return dateA - dateB;
      return 0;
    });

    return list;
  }, [filteredByStatus, searchQuery, sortBy]);

  const paginatedStock = useMemo(() => {
    return processedStock.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [processedStock, page, rowsPerPage]);

  const handleActionSuccess = () => {
    setReleaseModalOpen(false);
    setReturnDialog(false);
    setApproveDialog(false);
    setDrawerOpen(false);
    fetchStock();
  };

  const handleDownloadPV = async (item) => {
    if (!item.pvNumber) {
        toast.error('PV Document is not yet established for this item.');
        return;
    }
    const loadingToast = toast.loading('Generating PV Document...');
    try {
      const response = await stockApi.downloadPVPdf(item.id);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${item.pvNumber.replace(/\//g, '-')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.dismiss(loadingToast);
      toast.success('PV Document downloaded successfully');
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error('Failed to download PV');
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'PENDING_REVIEW': return <Chip size="small" icon={<HourglassEmpty fontSize="small"/>} label="Pending Review" color="warning" variant="outlined" />;
      case 'RETURNED': return <Chip size="small" icon={<Warning fontSize="small"/>} label="Returned" color="error" variant="outlined" />;
      case 'IN_STOCK': return <Chip size="small" icon={<CheckCircle fontSize="small"/>} label="In Warehouse" color="success" variant="outlined" />;
      case 'PENDING_RELEASE': return <Chip size="small" icon={<HourglassEmpty fontSize="small"/>} label="Awaiting Release" color="info" variant="outlined" />;
      case 'RELEASED': return <Chip size="small" icon={<LocalShipping fontSize="small"/>} label="Released" color="success" />;
      case 'ESCALATED': return <Chip size="small" icon={<HourglassEmpty fontSize="small"/>} label="Escalated" color="warning" variant="outlined" />;
      default: return <Chip size="small" label={status?.replace(/_/g, ' ')} variant="outlined" />;
    }
  };

  return (
    <Box sx={{ p: 4, bgcolor: 'var(--surface-page)', minHeight: '100vh' }}>
      <Toaster position="top-right" richColors />
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="var(--gray-900)">Warehouse Operations</Typography>
          <Typography variant="body1" color="var(--gray-500)">
            Total Inventory: <strong>{stockList.length}</strong> items tracked
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            size="small"
            placeholder="Search TIN, PV, or goods..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" sx={{ color: 'var(--gray-400)' }} />
                </InputAdornment>
              ),
            }}
            sx={{ width: 320, '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'white' } }}
          />
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, val) => { setActiveTab(val); setPage(0); }} aria-label="stock tabs">
          <Tab label={`Pending Review (${stockList.filter(i => i.status === 'PENDING_REVIEW' || i.status === 'RETURNED' || i.status === 'ESCALATED' || i.status === 'RETURNED_FOR_CORRECTION' || i.status === 'IN_TEMPORARY_STOCK' || i.status === 'PENDING_JUSTIFICATION').length})`} sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab label="In Warehouse" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab label="Pending Release" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab label="Released" sx={{ textTransform: 'none', fontWeight: 600 }} />
        </Tabs>
      </Box>

      <Paper sx={{ 
        borderRadius: 4, overflow: 'hidden', background: 'rgba(255, 255, 255, 0.7)', 
        backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.08)'
      }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress sx={{ color: 'var(--rra-blue)' }} /></Box>
        ) : processedStock.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <Inventory sx={{ fontSize: 64, color: 'var(--gray-200)', mb: 2 }} />
            <Typography variant="h6" color="var(--gray-400)">{searchQuery ? 'No matching items found' : 'No items in this section'}</Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(0, 61, 165, 0.03)' }}>
                    <th style={{ padding: '16px 24px', textAlign: 'left' }} className="type-caption uppercase bold gray-500">References</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left' }} className="type-caption uppercase bold gray-500">Taxpayer</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left' }} className="type-caption uppercase bold gray-500">Goods Description</th>
                    {activeTab === 2 && <th style={{ padding: '16px 24px', textAlign: 'left' }} className="type-caption uppercase bold gray-500">Requested At</th>}
                    {activeTab === 3 && <th style={{ padding: '16px 24px', textAlign: 'left' }} className="type-caption uppercase bold gray-500">Auction Info</th>}
                    <th style={{ padding: '16px 24px', textAlign: 'center' }} className="type-caption uppercase bold gray-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStock.map(item => (
                    <tr key={item.id} style={{ borderTop: '1px solid rgba(0,0,0,0.05)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '16px 24px' }}>
                        <Typography 
                          onClick={() => { setSelectedItem(item); setDrawerOpen(true); }}
                          sx={{ cursor: 'pointer', color: 'var(--rra-blue)', fontWeight: 700, '&:hover': { textDecoration: 'underline' } }}
                        >
                          {item.pvNumber || 'PENDING PV'}
                        </Typography>
                        <Typography variant="caption" color="var(--gray-400)">SN: {item.seizureNumber}</Typography>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <Typography variant="body2" fontWeight={600}>{item.taxpayerName}</Typography>
                        <Typography variant="caption" color="var(--gray-500)">TIN: {item.taxpayerTin}</Typography>
                      </td>
                      <td style={{ padding: '16px 24px', maxWidth: 300 }}>
                        <Typography variant="body2" noWrap sx={{ color: 'var(--gray-700)' }}>{item.goodsDescription}</Typography>
                        {getStatusBadge(item.status)}
                      </td>
                      {activeTab === 2 && (
                        <td style={{ padding: '16px 24px' }}>
                          <Typography variant="body2">
                            {item.releaseRequestedAt ? format(new Date(item.releaseRequestedAt), 'dd MMM yyyy HH:mm') : (item.updatedAt ? format(new Date(item.updatedAt), 'dd MMM yyyy HH:mm') : '---')}
                          </Typography>
                          <Typography variant="caption" color="var(--rra-red)">
                            Waiting: {item.releaseRequestedAt ? formatDistanceToNow(new Date(item.releaseRequestedAt)) : (item.updatedAt ? formatDistanceToNow(new Date(item.updatedAt)) : 'N/A')}
                          </Typography>
                        </td>
                      )}
                      {activeTab === 3 && (
                        <td style={{ padding: '16px 24px' }}>
                          <Typography variant="body2" fontWeight={600}>{item.auctionWinner || 'N/A'}</Typography>
                          <Typography variant="caption" color="var(--green-600)" fontWeight={700}>RWF {item.auctionAmount?.toLocaleString() || '0'}</Typography>
                        </td>
                      )}
                      <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                        <Box display="flex" gap={1} justifyContent="center" alignItems="center">
                          {canManageStock && activeTab === 0 && (item.status !== 'RETURNED' && item.status !== 'RETURNED_FOR_CORRECTION') && (
                            <>
                              <Button size="small" variant="contained" color="success" onClick={() => { setSelectedItem(item); setApproveDialog(true); }}>Approve</Button>
                              <Button size="small" variant="outlined" color="error" onClick={() => { setSelectedItem(item); setReturnDialog(true); }}>Return</Button>
                            </>
                          )}
                          {canManageStock && activeTab === 1 && (
                            <Button 
                              size="small" 
                              variant="contained" 
                              startIcon={<Share />} 
                              onClick={() => { 
                                setSelectedItem(item); 
                                setReleaseModalOpen(true); 
                              }}
                            >
                              Request Release
                            </Button>
                          )}
                          {activeTab === 2 && <Chip label="In Review" size="small" variant="outlined" color="info" />}

                          {item.pvNumber && (
                            <Tooltip title="Download Statement of Offence (PV)">
                              <IconButton 
                                onClick={() => handleDownloadPV(item)} 
                                sx={{ 
                                  color: 'var(--rra-blue)', 
                                  bgcolor: 'rgba(0, 61, 165, 0.05)',
                                  '&:hover': { bgcolor: 'rgba(0, 61, 165, 0.12)' }
                                }}
                              >
                                <Download fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={processedStock.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(e, p) => setPage(p)}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              sx={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}
            />
          </>
        )}
      </Paper>

      {/* Item Drawer */}
      <RightDrawer
        isOpen={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={`Goods Record: ${selectedItem?.seizureNumber}`}
        footerActions={
            <>
              {canManageStock && activeTab === 0 && (selectedItem?.status !== 'RETURNED' && selectedItem?.status !== 'RETURNED_FOR_CORRECTION') && (
                  <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
                      <Button fullWidth variant="outlined" color="error" onClick={() => { setDrawerOpen(false); setReturnDialog(true); }}>Return</Button>
                      <Button fullWidth variant="contained" color="success" onClick={() => { setDrawerOpen(false); setApproveDialog(true); }}>Approve</Button>
                  </Box>
              )}
              {canManageStock && activeTab === 1 && (
                  <Button fullWidth variant="contained" startIcon={<Share />} onClick={() => { setDrawerOpen(false); setReleaseModalOpen(true); }} sx={{ bgcolor: 'var(--rra-blue)' }}>Request Release</Button>
              )}
            </>
        }
      >
        {selectedItem && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
             <Box>
                <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--rra-blue)', mb: 2, textTransform: 'uppercase', fontWeight: 700 }}>
                    <Info fontSize="small" /> Seizure Context
                </Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Typography variant="caption" color="var(--gray-500)">TAXPAYER ENTITY</Typography>
                        <Typography variant="body1" fontWeight={700}>{selectedItem.taxpayerName}</Typography>
                        <Typography variant="body2" color="var(--gray-500)">TIN: {selectedItem.taxpayerTin}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="caption" color="var(--gray-500)">GOODS DESCRIPTION</Typography>
                        <Paper variant="outlined" sx={{ p: 2, mt: 0.5, bgcolor: '#f9fafb', borderRadius: 2 }}>
                            <Typography variant="body2" fontWeight={600}>{selectedItem.goodsDescription}</Typography>
                        </Paper>
                    </Grid>
                </Grid>
             </Box>

             <Box>
                <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--rra-blue)', mb: 2, textTransform: 'uppercase', fontWeight: 700 }}>
                    <Gavel fontSize="small" /> Workflow Timeline
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box display="flex" justifyContent="space-between">
                        <Typography variant="caption">Seizure Date:</Typography>
                        <Typography variant="caption" fontWeight={700}>{selectedItem.dateTimeSeized ? format(new Date(selectedItem.dateTimeSeized), 'dd MMM yyyy') : '---'}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                        <Typography variant="caption">System Intake:</Typography>
                        <Typography variant="caption" fontWeight={700}>{selectedItem.createdAt ? format(new Date(selectedItem.createdAt), 'dd MMM yyyy') : '---'}</Typography>
                    </Box>
                    {selectedItem.approvedAt && (
                        <Box display="flex" justifyContent="space-between">
                            <Typography variant="caption">Intake Approved:</Typography>
                            <Typography variant="caption" fontWeight={700}>{format(new Date(selectedItem.approvedAt), 'dd MMM yyyy')}</Typography>
                        </Box>
                    )}
                    {selectedItem.releaseRequestedAt && (
                        <Box display="flex" justifyContent="space-between">
                            <Typography variant="caption">Release Requested:</Typography>
                            <Typography variant="caption" fontWeight={700}>{format(new Date(selectedItem.releaseRequestedAt), 'dd MMM yyyy')}</Typography>
                        </Box>
                    )}
                    {selectedItem.releasedAt && (
                        <Box display="flex" justifyContent="space-between">
                            <Typography variant="caption">Final Release:</Typography>
                            <Typography variant="caption" fontWeight={700} color="var(--green-600)">{format(new Date(selectedItem.releasedAt), 'dd MMM yyyy')}</Typography>
                        </Box>
                    )}
                </Box>
             </Box>
          </Box>
        )}
      </RightDrawer>

      <ConfirmDialog
        isOpen={approveDialog}
        onClose={() => setApproveDialog(false)}
        onConfirm={async () => {
          try {
            await stockApi.approveIntake(selectedItem.id);
            toast.success('Goods approved into Main Stock');
            handleActionSuccess();
          } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to approve intake');
          }
        }}
        title="Approve Warehouse Intake"
        body="This will formally accept the goods into Main Stock based on the established PV Document."
        confirmLabel="Approve Intake"
      />

      <ConfirmDialog
        isOpen={returnDialog}
        onClose={() => setReturnDialog(false)}
        onConfirm={async (reason) => {
          try {
            await stockApi.returnGoods(selectedItem.id, reason);
            toast.success('Seizure note returned to officer');
            handleActionSuccess();
          } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to return goods');
          }
        }}
        title="Return for Correction"
        body="Provide a detailed reason for returning this seizure note. The Surveillance Officer will be notified to correct and resubmit."
        variant="danger"
        requiresReason={true}
        confirmLabel="Return to Officer"
      />

      <RequestReleaseModal
        isOpen={releaseModalOpen}
        onClose={() => setReleaseModalOpen(false)}
        seizureNumber={selectedItem?.seizureNumber}
        onConfirm={async (data) => {
          try {
            await stockApi.requestReleaseMachine(selectedItem.id, data);
            toast.success('Release request submitted to PRSO');
            handleActionSuccess();
          } catch (err) {
            toast.error('Failed to request release');
          }
        }}
      />

    </Box>
  );
};

export default StockManagerPage;
