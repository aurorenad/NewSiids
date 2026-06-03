import React, { useContext, useState, useEffect, useMemo } from 'react';
import { stockApi } from '../../api/stockApi';
import RightDrawer from '../../Components/ui/RightDrawer';
import ConfirmDialog from '../../Components/ui/ConfirmDialog';
import { toast, Toaster } from 'sonner';
import { format } from 'date-fns';
import { 
  Box, Typography, Paper, Grid, TextField, Button, 
  IconButton, InputAdornment, Chip, CircularProgress, Tooltip,
  Tabs, Tab, Divider, Alert, TablePagination
} from '@mui/material';
import { 
  Search, CheckCircle, Cancel, Visibility, Download, 
  Gavel, Info, Description, LocalShipping, HourglassEmpty,
  History, HistoryEdu, Person, MonetizationOn
} from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';
import { hasPermission } from '../../utils/authorization';
import { PERMISSIONS } from '../../constants/permissions';

const PRSOApprovalsPage = () => {
  const { authState } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState(0); // 0: Pending Release, 1: Approval History
  const [goodsList, setGoodsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [approveDialog, setApproveDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const canApproveRelease = hasPermission(authState, PERMISSIONS.STOCK_APPROVE_RELEASE);

  const fetchGoods = async () => {
    try {
      setIsLoading(true);
      const res = await stockApi.getMainStock();
      setGoodsList(res.data || []);
    } catch (err) {
      toast.error('Failed to load stock data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    fetchGoods(); 
  }, []);

  const filteredGoods = useMemo(() => {
    let list = activeTab === 0 
      ? goodsList.filter(i => i.status === 'PENDING_RELEASE' || i.status === 'PENDING_PRSO_RELEASE_APPROVAL')
      : goodsList.filter(i => i.status === 'RELEASED' || i.status === 'RELEASED_FROM_MAIN');

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item => 
        item.pvNumber?.toLowerCase().includes(q) ||
        item.taxpayerName?.toLowerCase().includes(q) ||
        item.goodsDescription?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [goodsList, activeTab, searchQuery]);

  const paginatedGoods = useMemo(() => {
    return filteredGoods.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredGoods, page, rowsPerPage]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

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

  return (
    <Box sx={{ p: 4, bgcolor: 'var(--surface-page)', minHeight: '100vh' }}>
      <Toaster position="top-right" richColors />
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800} color="var(--gray-900)">PRSO Verification Dashboard</Typography>
        <Typography variant="body1" color="var(--gray-500)">Final authorization and legal verification for confiscated goods disposal</Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, val) => { setActiveTab(val); setPage(0); }}>
          <Tab label={`Pending Authorization (${goodsList.filter(i => i.status === 'PENDING_RELEASE' || i.status === 'PENDING_PRSO_RELEASE_APPROVAL').length})`} sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab label="Release History" sx={{ textTransform: 'none', fontWeight: 600 }} />
        </Tabs>
        
        <TextField
          size="small"
          placeholder="Search items..."
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" sx={{ color: 'var(--gray-400)' }} />
              </InputAdornment>
            ),
          }}
          sx={{ width: 300, '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'white' } }}
        />
      </Box>

      <Paper sx={{ 
        borderRadius: 4, overflow: 'hidden', background: 'rgba(255, 255, 255, 0.7)', 
        backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.08)'
      }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
        ) : filteredGoods.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <HistoryEdu sx={{ fontSize: 64, color: 'var(--gray-200)', mb: 2 }} />
            <Typography variant="h6" color="var(--gray-400)">No pending authorizations found</Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(0, 61, 165, 0.03)' }}>
                    <th style={{ padding: '16px 24px', textAlign: 'left' }} className="type-caption uppercase bold gray-500">References</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left' }} className="type-caption uppercase bold gray-500">Taxpayer Entity</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left' }} className="type-caption uppercase bold gray-500">Verification Status</th>
                    <th style={{ padding: '16px 24px', textAlign: 'center' }} className="type-caption uppercase bold gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedGoods.map(item => (
                    <tr key={item.id} style={{ borderTop: '1px solid rgba(0,0,0,0.05)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '16px 24px' }}>
                        <Typography variant="body2" fontWeight={700} color="var(--rra-blue)">{item.pvNumber || 'N/A'}</Typography>
                        <Typography variant="caption" color="var(--gray-400)">SN: {item.seizureNumber}</Typography>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <Typography variant="body2" fontWeight={600}>{item.taxpayerName}</Typography>
                        <Typography variant="caption" color="var(--gray-500)">TIN: {item.taxpayerTin}</Typography>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        {item.status === 'RELEASED' ? (
                           <Chip label="Authorized" color="success" size="small" icon={<CheckCircle fontSize="small"/>} />
                        ) : (
                          <Chip label="Pending Verification" color="warning" size="small" variant="outlined" icon={<HourglassEmpty fontSize="small"/>} />
                        )}
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'center' }}>
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredGoods.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}
            />
          </>
        )}
      </Paper>

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
