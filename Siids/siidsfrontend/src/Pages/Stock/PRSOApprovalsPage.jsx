import React, { useState, useEffect, useMemo } from 'react';
import { stockApi } from '../../api/stockApi';
import RightDrawer from '../../Components/ui/RightDrawer';
import ConfirmDialog from '../../Components/ui/ConfirmDialog';
import { toast, Toaster } from 'sonner';
import { format } from 'date-fns';
import { 
  InboxIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  EyeIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArchiveBoxIcon,
  ClockIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';

const ITEMS_PER_PAGE = 10;

const PRSOApprovalsPage = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingRequests, setPendingRequests] = useState([]);
  const [mainStock, setMainStock] = useState([]);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Interaction State
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [approveDialog, setApproveDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setCurrentPage(1); // Reset page on tab change
      if (activeTab === 'pending') {
        const res = await stockApi.getPendingApprovals();
        setPendingRequests(res.data || []);
      } else if (activeTab === 'inventory') {
        const res = await stockApi.getMainStock();
        setMainStock(res.data || []);
      } else if (activeTab === 'history') {
        const res = await stockApi.getApprovalHistory();
        setHistory(res.data || []);
      }
    } catch (err) {
      toast.error('Failed to fetch data');
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
      fetchData();
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
      fetchData();
    } catch (err) {
      toast.error('Failed to reject');
    }
  };

  const downloadFile = async (type, id) => {
    try {
      let res;
      let filename;
      if (type === 'seizure') {
        res = await stockApi.downloadSeizureNote(id);
        filename = `SeizureNote-${id}.pdf`;
      } else if (type === 'pv') {
        res = await stockApi.downloadPVPdf(id);
        filename = `PV-Document-${id}.pdf`;
      } else if (type === 'release') {
        res = await stockApi.downloadReleaseNotePdf(id);
        filename = `ReleaseNote-${id}.pdf`;
      }

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error('Failed to download document');
    }
  };

  // Filtering Logic
  const filteredData = useMemo(() => {
    const data = activeTab === 'pending' ? pendingRequests : activeTab === 'inventory' ? mainStock : history;
    if (!searchQuery) return data;
    
    const query = searchQuery.toLowerCase();
    return data.filter(item => {
      const pvNum = (item.pvNumber || item.pvDocument?.pvNumber || '').toLowerCase();
      const snNum = (item.seizureNote?.seizureNumber || '').toLowerCase();
      const owner = (item.seizureNote?.taxpayerName || '').toLowerCase();
      return pvNum.includes(query) || snNum.includes(query) || owner.includes(query);
    });
  }, [activeTab, pendingRequests, mainStock, history, searchQuery]);

  // Pagination Logic
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  return (
    <div style={{ padding: '32px 40px', background: 'var(--surface-page)', minHeight: '100vh' }}>
      <Toaster position="top-right" richColors />
      
      <div style={{ marginBottom: 32 }}>
        <h1 className="type-page-title">Physical Stock Operations (PRSO)</h1>
        <p className="type-body" style={{ color: 'var(--gray-500)' }}>Manage inventory, approve releases, and view transaction history</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 32, borderBottom: '1px solid var(--gray-200)', marginBottom: 24 }}>
        <TabButton 
          label="Pending Approvals" 
          active={activeTab === 'pending'} 
          onClick={() => setActiveTab('pending')} 
          count={pendingRequests.length}
          icon={<ClockIcon style={{ width: 20 }} />}
        />
        <TabButton 
          label="Main Stock Inventory" 
          active={activeTab === 'inventory'} 
          onClick={() => setActiveTab('inventory')} 
          icon={<ArchiveBoxIcon style={{ width: 20 }} />}
        />
        <TabButton 
          label="Approval History" 
          active={activeTab === 'history'} 
          onClick={() => setActiveTab('history')} 
          icon={<CheckCircleIcon style={{ width: 20 }} />}
        />
      </div>

      {/* Filters & Search */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: 320 }}>
          <MagnifyingGlassIcon style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 18, color: 'var(--gray-400)' }} />
          <input 
            type="text" 
            placeholder="Search by PV, SN or Owner..." 
            className="input-base"
            style={{ paddingLeft: 40 }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="type-small" style={{ color: 'var(--gray-500)' }}>
          Showing {paginatedData.length} of {filteredData.length} items
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <p style={{ textAlign: 'center', padding: 40, color: 'var(--gray-500)' }}>Loading...</p>
        ) : filteredData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <InboxIcon style={{ width: 48, height: 48, color: 'var(--gray-300)', margin: '0 auto 16px' }} />
            <p className="type-body" style={{ color: 'var(--gray-500)' }}>No records found.</p>
          </div>
        ) : (
          <div className="stock-table">
            <table>
              <thead>
                <tr>
                  <th>{activeTab === 'pending' || activeTab === 'history' ? 'RN Number' : 'PV Number'}</th>
                  <th>Owner / Taxpayer</th>
                  <th>Date</th>
                  {activeTab === 'history' && <th>Status</th>}
                  {activeTab === 'history' && <th>PRSO</th>}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map(item => (
                  <tr key={item.id}>
                    <td className="ref" onClick={() => { setSelectedItem(item); setDrawerOpen(true); }}>
                      {activeTab === 'inventory' ? item.pvNumber : item.releaseNumber}
                    </td>
                    <td>{item.seizureNote?.taxpayerName || item.pvDocument?.seizureNote?.taxpayerName || 'N/A'}</td>
                    <td className="date">
                      {(() => {
                        const dateVal = activeTab === 'history' 
                          ? (item.prsoApprovalDate || item.createdAt) 
                          : (item.createdAt || item.transferDate);
                        try {
                          return dateVal ? format(new Date(dateVal), 'dd MMM yyyy') : 'N/A';
                        } catch (e) {
                          return 'N/A';
                        }
                      })()}
                    </td>
                    {activeTab === 'history' && (
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span className={`badge ${item.status === 'APPROVED' ? 'badge-green' : 'badge-red'}`} style={{ width: 'fit-content' }}>
                            {item.status}
                          </span>
                          {item.status === 'REJECTED' && item.rejectionReason && (
                            <span className="type-body-sm" style={{ color: 'var(--rra-red)', fontStyle: 'italic', display: 'block', maxWidth: '200px', wordBreak: 'break-word', marginTop: 2 }}>
                              Reason: {item.rejectionReason}
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    {activeTab === 'history' && (
                      <td>
                        {item.prsoApprover 
                          ? `${item.prsoApprover.givenName || ''} ${item.prsoApprover.familyName || ''}`.trim() 
                          : 'N/A'}
                      </td>
                    )}
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button 
                          className="btn-ghost" 
                          title="View Details"
                          style={{ padding: 6 }}
                          onClick={() => { setSelectedItem(item); setDrawerOpen(true); }}
                        >
                          <EyeIcon style={{ width: 18, color: 'var(--rra-blue)' }} />
                        </button>
                        
                        {activeTab === 'pending' && (
                          <>
                            <button 
                              className="btn-ghost" 
                              title="Approve"
                              style={{ padding: 6 }}
                              onClick={() => { setSelectedItem(item); setApproveDialog(true); }}
                            >
                              <CheckCircleIcon style={{ width: 18, color: 'var(--green-600)' }} />
                            </button>
                            <button 
                              className="btn-ghost" 
                              title="Reject"
                              style={{ padding: 6 }}
                              onClick={() => { setSelectedItem(item); setRejectDialog(true); }}
                            >
                              <XCircleIcon style={{ width: 18, color: 'var(--red-600)' }} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {filteredData.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 24 }}>
          <button 
            className="btn-base btn-ghost btn-sm" 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          >
            <ChevronLeftIcon style={{ width: 20 }} />
          </button>
          <span className="type-small">Page {currentPage} of {Math.max(1, totalPages)}</span>
          <button 
            className="btn-base btn-ghost btn-sm" 
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          >
            <ChevronRightIcon style={{ width: 20 }} />
          </button>
        </div>
      )}

      {/* Detail Drawer */}
      <RightDrawer
        isOpen={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={activeTab === 'inventory' ? 'Inventory Item Details' : 'Release Request Details'}
        footerActions={
          activeTab === 'pending' && (
            <>
              <button className="btn-base btn-outline-red" onClick={() => setRejectDialog(true)}>Reject</button>
              <button className="btn-base btn-primary" onClick={() => setApproveDialog(true)}>Approve</button>
            </>
          )
        }
      >
        {selectedItem && (
          <div className="drawer-content">
            {(() => {
              const seizureNote = selectedItem.seizureNote || selectedItem.pvDocument?.seizureNote;
              const pvId = activeTab === 'inventory' ? selectedItem.id : selectedItem.pvDocument?.id;
              
              return (
                <>
                  <div className="drawer-section">
                    <h3 className="drawer-section-title">Record Information</h3>
                    <div className="drawer-field">
                      <span className="drawer-field-label">System Ref</span>
                      <span className="drawer-field-value" style={{ fontWeight: 600, color: 'var(--rra-blue)' }}>
                        {activeTab === 'inventory' ? selectedItem.pvNumber : selectedItem.releaseNumber}
                      </span>
                    </div>
                    {activeTab !== 'inventory' && (
                      <div className="drawer-field">
                        <span className="drawer-field-label">Status</span>
                        <span className={`badge ${selectedItem.status === 'APPROVED' ? 'badge-green' : selectedItem.status === 'REJECTED' ? 'badge-red' : 'badge-orange'}`}>
                          {selectedItem.status || 'PENDING'}
                        </span>
                      </div>
                    )}
                    {selectedItem.rejectionReason && (
                      <div className="drawer-field">
                        <span className="drawer-field-label" style={{ color: 'var(--red-600)' }}>Rejection Reason</span>
                        <span className="drawer-field-value" style={{ fontStyle: 'italic' }}>{selectedItem.rejectionReason}</span>
                      </div>
                    )}
                  </div>

                  <div className="drawer-section">
                    <h3 className="drawer-section-title">Confiscated Goods</h3>
                    <div className="drawer-field">
                      <span className="drawer-field-label">Owner</span>
                      <span className="drawer-field-value">{seizureNote?.taxpayerName || 'N/A'}</span>
                    </div>
                    <div className="drawer-field">
                      <span className="drawer-field-label">Description</span>
                      <span className="drawer-field-value">{seizureNote?.goodsDescription || 'N/A'}</span>
                    </div>
                    <div className="drawer-field">
                      <span className="drawer-field-label">Seizure Date</span>
                      <span className="drawer-field-value">
                        {seizureNote?.dateTimeSeized ? format(new Date(seizureNote.dateTimeSeized), 'PPP p') : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="drawer-section">
                    <h3 className="drawer-section-title">Available Documents</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <DocLink 
                        label="Seizure Note" 
                        onClick={() => downloadFile('seizure', seizureNote?.id)} 
                        exists={!!seizureNote}
                      />
                      <DocLink 
                        label="PV Document" 
                        onClick={() => downloadFile('pv', pvId)} 
                        exists={!!pvId}
                      />
                      {(activeTab === 'pending' || activeTab === 'history') && (
                        <DocLink 
                          label="Release Note" 
                          onClick={() => downloadFile('release', selectedItem.id)} 
                          exists={true}
                        />
                      )}
                    </div>
                  </div>
                  
                  {(activeTab === 'pending' || activeTab === 'history') && (
                    <div className="drawer-section">
                      <h3 className="drawer-section-title">Release Context</h3>
                      <div className="drawer-field"><span className="drawer-field-label">Destination</span><span className="drawer-field-value">{selectedItem.releaseDestination}</span></div>
                      <div className="drawer-field"><span className="drawer-field-label">Reason</span><span className="drawer-field-value">{selectedItem.releaseReason}</span></div>
                      <div className="drawer-field"><span className="drawer-field-label">Recipient</span><span className="drawer-field-value">{selectedItem.recipientName} ({selectedItem.recipientIdPassport})</span></div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </RightDrawer>
      
      <ConfirmDialog
        isOpen={approveDialog}
        onClose={() => setApproveDialog(false)}
        onConfirm={handleApprove}
        title="Approve Release"
        body="This will permanently authorize the goods to leave the warehouse."
        variant="success"
        confirmLabel="Approve"
      />

      <ConfirmDialog
        isOpen={rejectDialog}
        onClose={() => setRejectDialog(false)}
        onConfirm={handleReject}
        title="Reject Release"
        body="Please provide a reason for rejecting this release request."
        variant="danger"
        requiresReason={true}
        confirmLabel="Reject"
      />
    </div>
  );
};

// Sub-components
const TabButton = ({ label, active, onClick, count, icon }) => (
  <button 
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '12px 4px',
      border: 'none',
      background: 'none',
      borderBottom: active ? '2px solid var(--rra-blue)' : '2px solid transparent',
      color: active ? 'var(--rra-blue)' : 'var(--gray-500)',
      fontWeight: active ? 600 : 400,
      cursor: 'pointer',
      transition: 'all 0.2s'
    }}
  >
    {icon}
    <span>{label}</span>
    {count !== undefined && (
      <span style={{ 
        background: active ? 'var(--rra-blue)' : 'var(--gray-200)', 
        color: active ? 'white' : 'var(--gray-600)',
        padding: '2px 8px',
        borderRadius: 12,
        fontSize: 12
      }}>
        {count}
      </span>
    )}
  </button>
);

const DocLink = ({ label, onClick, exists }) => (
  <button 
    disabled={!exists}
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 16px',
      background: exists ? 'var(--rra-blue-tint)' : 'var(--gray-50)',
      border: '1px solid',
      borderColor: exists ? 'var(--rra-blue-tint-2)' : 'var(--gray-200)',
      borderRadius: 10,
      width: '100%',
      cursor: exists ? 'pointer' : 'not-allowed',
      opacity: exists ? 1 : 0.6,
      transition: 'all 0.2s',
      textAlign: 'left'
    }}
    onMouseEnter={(e) => exists && (e.currentTarget.style.borderColor = 'var(--rra-blue)')}
    onMouseLeave={(e) => exists && (e.currentTarget.style.borderColor = 'var(--rra-blue-tint-2)')}
  >
    <div style={{ 
      background: exists ? 'white' : 'transparent',
      padding: 6,
      borderRadius: 6,
      display: 'flex',
      boxShadow: exists ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
    }}>
      <DocumentArrowDownIcon style={{ width: 20, color: exists ? 'var(--rra-blue)' : 'var(--gray-400)' }} />
    </div>
    <span className="type-body-sm" style={{ fontWeight: 600, color: exists ? 'var(--gray-900)' : 'var(--gray-400)' }}>{label}</span>
  </button>
);

export default PRSOApprovalsPage;
