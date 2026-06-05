import React, { useContext, useState, useEffect } from 'react';
import { stockApi } from '../../api/stockApi';
import RightDrawer from '../../Components/ui/RightDrawer';
import ConfirmDialog from '../../Components/ui/ConfirmDialog';
import { toast, Toaster } from 'sonner';
import { format } from 'date-fns';
import {
  Box, Typography, Paper, Grid, Button,
  IconButton, Chip, Tooltip,
  Tabs, Tab, Divider, Alert
} from '@mui/material';
import { 
  CheckCircle, Cancel, Visibility, Download,
  Gavel, Info, Description, LocalShipping, HourglassEmpty,
  History, HistoryEdu, Person, MonetizationOn
} from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';
import { hasPermission } from '../../utils/authorization';
import { PERMISSIONS } from '../../constants/permissions';
import AppTable from '../../Components/ui/AppTable';

const ROWS_PER_PAGE = 10;
const TAB_VIEWS = ['PENDING_RELEASE', 'RELEASED'];

const PRSOApprovalsPage = () => {
  const { authState } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState(0); // 0: Pending Release, 1: Approval History
  const [goodsList, setGoodsList] = useState([]);
  const [totalGoods, setTotalGoods] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [approveDialog, setApproveDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [page, setPage] = useState(0);
  const canApproveRelease = hasPermission(authState, PERMISSIONS.STOCK_APPROVE_RELEASE);

  const fetchGoods = async () => {
    try {
      setIsLoading(true);
      const res = await stockApi.getMainStock({
        page,
        size: ROWS_PER_PAGE,
        search: searchQuery,
        view: TAB_VIEWS[activeTab]
      });
      setGoodsList(res.data?.content || []);
      setTotalGoods(res.data?.totalElements || 0);
    } catch (err) {
      toast.error('Failed to load stock data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoods();
  }, [activeTab, page, searchQuery]);

  const handleActionSuccess = () => {
    setApproveDialog(false);
    setRejectDialog(false);
    setDrawerOpen(false);
    fetchGoods();
  };

  const handleApproveRelease = async () => {
    try {
      await stockApi.approveReleaseMachine(selectedItem.id);
      toast.success('Release Authorized successfully');
      handleActionSuccess();
    } catch (err) {
      toast.error('Failed to authorize release');
    }
  };

  const handleRejectRelease = async (reason) => {
    try {
      await stockApi.rejectReleaseMachine(selectedItem.id, reason);
      toast.success('Release Request Rejected');
      handleActionSuccess();
    } catch (err) {
      toast.error('Failed to reject release');
    }
  };

  const downloadDoc = async (type, id, ref) => {
    if (!id) return;
    const loadingToast = toast.loading(`Generating document...`);
    try {
      let res;
      if (type === 'sn') res = await stockApi.downloadSeizureNote(id);
      else if (type === 'pv') res = await stockApi.downloadPVPdf(id);
      
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type.toUpperCase()}-${ref.replace(/\//g, '-')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.dismiss(loadingToast);
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error('Download failed');
    }
  };

  const columns = [
    {
      key: 'references',
      label: 'References',
      render: (item) => (
        <Box>
          <Typography variant="body2" fontWeight={700} color="var(--rra-blue)">{item.pvNumber || 'N/A'}</Typography>
          <Typography variant="caption" color="var(--gray-400)">SN: {item.seizureNumber}</Typography>
        </Box>
      )
    },
    {
      key: 'taxpayer',
      label: 'Taxpayer Entity',
      render: (item) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>{item.taxpayerName}</Typography>
          <Typography variant="caption" color="var(--gray-500)">TIN: {item.taxpayerTin}</Typography>
        </Box>
      )
    },
    {
      key: 'status',
      label: 'Verification Status',
      render: (item) => item.status === 'RELEASED' || item.status === 'RELEASED_FROM_MAIN' ? (
        <Chip label="Authorized" color="success" size="small" icon={<CheckCircle fontSize="small" />} />
      ) : (
        <Chip label="Pending Verification" color="warning" size="small" variant="outlined" icon={<HourglassEmpty fontSize="small" />} />
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      cellStyle: { textAlign: 'center' },
      render: (item) => (
        <Box display="flex" gap={1} justifyContent="center">
          <Tooltip title="Examine Evidence">
            <IconButton onClick={() => { setSelectedItem(item); setDrawerOpen(true); }} sx={{ color: 'var(--rra-blue)', bgcolor: 'rgba(0, 61, 165, 0.05)' }}>
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          {canApproveRelease && (item.status === 'PENDING_RELEASE' || item.status === 'PENDING_PRSO_RELEASE_APPROVAL') && (
            <>
              <Tooltip title="Authorize Release">
                <IconButton onClick={() => { setSelectedItem(item); setApproveDialog(true); }} sx={{ color: 'var(--green-600)', bgcolor: 'rgba(22, 101, 52, 0.05)' }}>
                  <CheckCircle fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Deny Authorization">
                <IconButton onClick={() => { setSelectedItem(item); setRejectDialog(true); }} sx={{ color: 'var(--rra-red)', bgcolor: 'rgba(185, 28, 28, 0.05)' }}>
                  <Cancel fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      )
    }
  ];

  return (
    <Box sx={{ p: 4, bgcolor: 'var(--surface-page)', minHeight: '100vh' }}>
      <Toaster position="top-right" richColors />
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800} color="var(--gray-900)">PRSO Verification Dashboard</Typography>
        <Typography variant="body1" color="var(--gray-500)">Final authorization and legal verification for confiscated goods disposal</Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, val) => { setActiveTab(val); setPage(0); }}>
          <Tab label="Pending Authorization" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab label="Release History" sx={{ textTransform: 'none', fontWeight: 600 }} />
        </Tabs>
      </Box>

      <AppTable
        columns={columns}
        rows={goodsList}
        loading={isLoading}
        emptyMessage={activeTab === 0 ? 'No pending authorizations found' : 'No release history found'}
        searchValue={searchQuery}
        searchPlaceholder="Search items..."
        onSearchChange={(value) => { setSearchQuery(value); setPage(0); }}
        page={page}
        rowsPerPage={ROWS_PER_PAGE}
        totalRows={totalGoods}
        onPageChange={(event, nextPage) => setPage(nextPage)}
        minWidth={900}
      />

      {/* Details Drawer */}
      <RightDrawer
        isOpen={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={`Legal Audit: ${selectedItem?.pvNumber || selectedItem?.seizureNumber}`}
        footerActions={
          canApproveRelease && (selectedItem?.status === 'PENDING_RELEASE' || selectedItem?.status === 'PENDING_PRSO_RELEASE_APPROVAL') && (
            <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
              <Button 
                fullWidth variant="outlined" color="error" startIcon={<Cancel />} 
                onClick={() => { setDrawerOpen(false); setRejectDialog(true); }}
              >
                Deny
              </Button>
              <Button 
                fullWidth variant="contained" color="success" startIcon={<CheckCircle />} 
                onClick={() => { setDrawerOpen(false); setApproveDialog(true); }}
                sx={{ bgcolor: '#009A44' }}
              >
                Authorize Release
              </Button>
            </Box>
          )
        }
      >
        {selectedItem && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Verification step required. Review original Seizure Note and established Statement of Offence (PV) before final authorization.
            </Alert>

            <Box>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--rra-blue)', mb: 2, textTransform: 'uppercase', fontWeight: 700 }}>
                <HistoryEdu fontSize="small" /> Evidence & Confiscation
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                <Typography variant="caption" color="var(--gray-500)" display="block" sx={{ mb: 0.5 }}>LEGAL BASIS</Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>{selectedItem.formalStatementText || 'Standard Confiscation Record'}</Typography>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="caption" color="var(--gray-500)" display="block" sx={{ mb: 0.5 }}>INVENTORIED GOODS</Typography>
                <Typography variant="body2" fontWeight={700} sx={{ color: '#92400E' }}>{selectedItem.goodsDescription}</Typography>
              </Paper>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--rra-blue)', mb: 2, textTransform: 'uppercase', fontWeight: 700 }}>
                <Description fontSize="small" /> Document Inspection
              </Typography>
              <Box display="flex" flexDirection="column" gap={1.5}>
                 <Button fullWidth variant="outlined" startIcon={<Download />} onClick={() => downloadDoc('sn', selectedItem.id, selectedItem.seizureNumber)}>Review Seizure Note (SN)</Button>
                 {selectedItem.pvNumber && (
                    <Button fullWidth variant="outlined" startIcon={<Download />} onClick={() => downloadDoc('pv', selectedItem.id, selectedItem.pvNumber)}>Review Statement of Offence (PV)</Button>
                 )}
              </Box>
            </Box>

            {(selectedItem.status === 'PENDING_RELEASE' || selectedItem.status === 'PENDING_PRSO_RELEASE_APPROVAL' || selectedItem.status === 'RELEASED') && (
              <Box>
                <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--green-600)', mb: 2, textTransform: 'uppercase', fontWeight: 700 }}>
                  <MonetizationOn fontSize="small" /> Disposal & Auction Details
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                  <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="caption">Winner / Recipient:</Typography>
                    <Typography variant="body2" fontWeight={700}>{selectedItem.recipientName || 'N/A'}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="caption">Contact / ID:</Typography>
                    <Typography variant="body2">{selectedItem.recipientPhone || selectedItem.recipientIdPassport || 'N/A'}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="caption">Total Proceeds:</Typography>
                    <Typography variant="body2" fontWeight={700} color="var(--green-700)">RWF {selectedItem.auctionAmount?.toLocaleString()}</Typography>
                  </Box>
                </Paper>
              </Box>
            )}
          </Box>
        )}
      </RightDrawer>

      {/* specialized Approval Modal */}
      <ConfirmDialog
        isOpen={approveDialog}
        onClose={() => setApproveDialog(false)}
        onConfirm={handleApproveRelease}
        title="Approve Release Authorization"
        body={`By approving, you authorize the physical release of these goods to ${selectedItem?.recipientName || 'the recipient'}. This action is irreversible.`}
        variant="success"
        confirmLabel="Authorize Release"
      />

      <ConfirmDialog
        isOpen={rejectDialog}
        onClose={() => setRejectDialog(false)}
        onConfirm={handleRejectRelease}
        title="Deny Release Authorization"
        body="Provide a formal legal or administrative reason for denying this release request."
        variant="danger"
        requiresReason={true}
        confirmLabel="Deny Authorization"
      />

    </Box>
  );
};

export default PRSOApprovalsPage;
