import React, { useContext, useState, useEffect } from 'react';
import { stockApi } from '../../api/stockApi';
import RightDrawer from '../../Components/ui/RightDrawer';
import ConfirmDialog from '../../Components/ui/ConfirmDialog';
import RequestReleaseModal from '../../Components/ui/RequestReleaseModal';
import { toast, Toaster } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Box, Typography, Paper, Grid, MenuItem, Button,
  IconButton, Chip, Tooltip,
  Tabs, Tab, Divider
} from '@mui/material';
import { 
  Description, KeyboardReturn, Share,
  Download, Gavel, Info, CheckCircle, HourglassEmpty, 
  LocalShipping, Warning
} from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';
import { hasPermission } from '../../utils/authorization';
import { PERMISSIONS } from '../../constants/permissions';
import AppTable from '../../Components/ui/AppTable';

const ROWS_PER_PAGE = 10;
const TAB_VIEWS = ['PENDING_REVIEW', 'IN_WAREHOUSE', 'PENDING_RELEASE', 'RELEASED'];

const StockManagerPage = () => {
  const { authState } = useContext(AuthContext);
  const [stockList, setStockList] = useState([]);
  const [totalStock, setTotalStock] = useState(0);
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
  const canManageStock = hasPermission(authState, PERMISSIONS.STOCK_MANAGE);

  const fetchStock = async () => {
    try {
      setIsLoading(true);
      const res = await stockApi.getMainStock({
        page,
        size: ROWS_PER_PAGE,
        search: searchQuery,
        view: TAB_VIEWS[activeTab],
        sort: sortBy
      });
      setStockList(res.data?.content || []);
      setTotalStock(res.data?.totalElements || 0);
    } catch (err) {
      toast.error('Failed to load main stock inventory');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, [activeTab, page, searchQuery, sortBy]);

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

  const columns = [
    {
      key: 'references',
      label: 'References',
      render: (item) => (
        <Box>
          <Typography
            onClick={() => { setSelectedItem(item); setDrawerOpen(true); }}
            sx={{ cursor: 'pointer', color: 'var(--rra-blue)', fontWeight: 700, '&:hover': { textDecoration: 'underline' } }}
          >
            {item.pvNumber || 'PENDING PV'}
          </Typography>
          <Typography variant="caption" color="var(--gray-400)">SN: {item.seizureNumber}</Typography>
        </Box>
      )
    },
    {
      key: 'taxpayer',
      label: 'Taxpayer',
      render: (item) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>{item.taxpayerName}</Typography>
          <Typography variant="caption" color="var(--gray-500)">TIN: {item.taxpayerTin}</Typography>
        </Box>
      )
    },
    {
      key: 'goodsDescription',
      label: 'Goods Description',
      render: (item) => (
        <Box sx={{ maxWidth: 320 }}>
          <Typography variant="body2" noWrap sx={{ color: 'var(--gray-700)' }}>{item.goodsDescription}</Typography>
          {getStatusBadge(item.status)}
        </Box>
      )
    },
    ...(activeTab === 2 ? [{
      key: 'requestedAt',
      label: 'Requested At',
      render: (item) => (
        <Box>
          <Typography variant="body2">
            {item.releaseRequestedAt ? format(new Date(item.releaseRequestedAt), 'dd MMM yyyy HH:mm') : (item.updatedAt ? format(new Date(item.updatedAt), 'dd MMM yyyy HH:mm') : '---')}
          </Typography>
          <Typography variant="caption" color="var(--rra-red)">
            Waiting: {item.releaseRequestedAt ? formatDistanceToNow(new Date(item.releaseRequestedAt)) : (item.updatedAt ? formatDistanceToNow(new Date(item.updatedAt)) : 'N/A')}
          </Typography>
        </Box>
      )
    }] : []),
    ...(activeTab === 3 ? [{
      key: 'auctionInfo',
      label: 'Auction Info',
      render: (item) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>{item.auctionWinner || 'N/A'}</Typography>
          <Typography variant="caption" color="var(--green-600)" fontWeight={700}>RWF {item.auctionAmount?.toLocaleString() || '0'}</Typography>
        </Box>
      )
    }] : []),
    {
      key: 'actions',
      label: 'Action',
      cellStyle: { textAlign: 'center' },
      render: (item) => (
        <Box display="flex" gap={1} justifyContent="center" alignItems="center" flexWrap="wrap">
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
      )
    }
  ];

  return (
    <Box sx={{ p: 4, bgcolor: 'var(--surface-page)', minHeight: '100vh' }}>
      <Toaster position="top-right" richColors />
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="var(--gray-900)">Warehouse Operations</Typography>
          <Typography variant="body1" color="var(--gray-500)">
            Total Inventory: <strong>{totalStock}</strong> items tracked
          </Typography>
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, val) => { setActiveTab(val); setPage(0); }} aria-label="stock tabs">
          <Tab label="Pending Review" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab label="In Warehouse" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab label="Pending Release" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab label="Released" sx={{ textTransform: 'none', fontWeight: 600 }} />
        </Tabs>
      </Box>

      <AppTable
        columns={columns}
        rows={stockList}
        loading={isLoading}
        emptyMessage={searchQuery ? 'No matching items found' : 'No items in this section'}
        searchValue={searchQuery}
        searchPlaceholder="Search TIN, PV, or goods..."
        onSearchChange={(value) => { setSearchQuery(value); setPage(0); }}
        page={page}
        rowsPerPage={ROWS_PER_PAGE}
        totalRows={totalStock}
        onPageChange={(event, nextPage) => setPage(nextPage)}
        minWidth={1100}
      />

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
