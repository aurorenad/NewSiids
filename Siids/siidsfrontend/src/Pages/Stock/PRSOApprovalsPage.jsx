import React, { useState, useEffect } from 'react';
import { stockApi } from '../../api/stockApi';
import RightDrawer from '../../Components/ui/RightDrawer';
import ConfirmDialog from '../../Components/ui/ConfirmDialog';
import { toast, Toaster } from 'sonner';
import { format } from 'date-fns';
import { InboxIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { TablePagination } from '@mui/material';

const PRSOApprovalsPage = () => {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [approveDialog, setApproveDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      setIsLoading(true);
      const res = await stockApi.getPendingApprovals();
      setRequests(res.data || []);
    } catch (err) {
      toast.error('Failed to fetch approvals');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      await stockApi.approveRelease(selectedItem.id);
      toast.success('Release Approved');
      setApproveDialog(false);
      setDrawerOpen(false);
      fetchApprovals();
    } catch (err) {
      toast.error('Failed to approve');
    }
  };

  const handleReject = async (reason) => {
    try {
      await stockApi.rejectRelease(selectedItem.id, reason);
      toast.success('Release Rejected');
      setRejectDialog(false);
      setDrawerOpen(false);
      fetchApprovals();
    } catch (err) {
      toast.error('Failed to reject');
    }
  };

  return (
    <div style={{ padding: '32px 40px', background: 'var(--surface-page)', minHeight: '100vh' }}>
      <Toaster position="top-right" richColors />
      <div style={{ marginBottom: 24 }}>
        <h1 className="type-page-title">PRSO Approvals</h1>
        <p className="type-body" style={{ color: 'var(--gray-500)' }}>Review and approve pending warehouse releases</p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <p style={{ textAlign: 'center', padding: 40, color: 'var(--gray-500)' }}>Loading...</p>
        ) : requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <InboxIcon style={{ width: 48, height: 48, color: 'var(--gray-300)', margin: '0 auto 16px' }} />
            <p className="type-body" style={{ color: 'var(--gray-500)' }}>No pending approvals.</p>
          </div>
        ) : (
          <div className="stock-table">
            <table>
              <thead>
                <tr>
                  <th>PV Number</th>
                  <th>Request Type</th>
                  <th>Requester</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(item => {
                  return (
                    <tr key={item.id}>
                      <td className="ref" onClick={() => { setSelectedItem(item); setDrawerOpen(true); }}>
                        {item.pvNumber}
                      </td>
                      <td>
                        <span className={`badge badge-orange`}>
                          Release Request
                        </span>
                      </td>
                      <td>{item.pvInCharge?.givenName || 'Stock Manager'}</td>
                      <td className="date">{format(new Date(item.createdAt || item.transferDate), 'dd MMM yyyy HH:mm')}</td>
                      <td>
                        <button 
                          className="btn-ghost" 
                          style={{ padding: '4px 8px', color: 'var(--rra-blue)' }}
                          onClick={() => { setSelectedItem(item); setDrawerOpen(true); }}
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <TablePagination
              component="div"
              count={requests.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </div>
        )}
      </div>

      <RightDrawer
        isOpen={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Review Approval Request"
        footerActions={
          <>
            <button className="btn-base btn-outline-red" onClick={() => setRejectDialog(true)}>Reject</button>
            <button className="btn-base btn-primary" onClick={() => setApproveDialog(true)}>Approve</button>
          </>
        }
      >
        {selectedItem && (
          <div>
            <div className="drawer-section">
              <h3 className="drawer-section-title">Request Context</h3>
              <div className="drawer-field">
                <span className="drawer-field-label">Type</span>
                <span className="drawer-field-value" style={{ fontWeight: 600, color: 'var(--orange-600)' }}>
                  WAREHOUSE RELEASE
                </span>
              </div>
              <div className="drawer-field">
                <span className="drawer-field-label">Reason Provided</span>
                <span className="drawer-field-value" style={{ fontStyle: 'italic', color: 'var(--gray-900)' }}>
                  {selectedItem.pendingEditReason || 'See release details...'}
                </span>
              </div>
            </div>

            <div className="drawer-section">
              <h3 className="drawer-section-title">Confiscated Item Details</h3>
              <div className="drawer-field"><span className="drawer-field-label">PV Ref</span><span className="drawer-field-value">{selectedItem.pvNumber}</span></div>
              <div className="drawer-field"><span className="drawer-field-label">Taxpayer</span><span className="drawer-field-value">{selectedItem.seizureNote?.taxpayerName}</span></div>
              <div className="drawer-field"><span className="drawer-field-label">Goods</span><span className="drawer-field-value">{selectedItem.seizureNote?.goodsDescription}</span></div>
            </div>
          </div>
        )}
      </RightDrawer>
      
      <ConfirmDialog
        isOpen={approveDialog}
        onClose={() => setApproveDialog(false)}
        onConfirm={handleApprove}
        title="Approve Release"
        body="This will permanently release the goods from Main Stock."
        variant="success"
        confirmLabel="Approve"
      />

      <ConfirmDialog
        isOpen={rejectDialog}
        onClose={() => setRejectDialog(false)}
        onConfirm={handleReject}
        title="Reject Release"
        body="Provide a reason for rejecting this release request."
        variant="danger"
        requiresReason={true}
        confirmLabel="Reject Request"
      />
    </div>
  );
};

export default PRSOApprovalsPage;
