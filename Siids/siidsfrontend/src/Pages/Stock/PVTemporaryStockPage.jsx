import React, { useContext, useState, useEffect, useMemo } from 'react';
import { TablePagination } from '@mui/material';
import { PlusIcon, MagnifyingGlassIcon, InboxArrowDownIcon } from '@heroicons/react/24/outline';
import { stockApi } from '../../api/stockApi';
import CreateSeizureNoteModal from '../../Components/ui/CreateSeizureNoteModal';
import RightDrawer from '../../Components/ui/RightDrawer';
import ReleaseGoodsModal from '../../Components/ui/ReleaseGoodsModal';
import EscalatePVModal from '../../Components/ui/EscalatePVModal';
import { toast, Toaster } from 'sonner';
import { format } from 'date-fns';

import { useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { hasPermission } from '../../utils/authorization';
import { PERMISSIONS } from '../../constants/permissions';

const PVTemporaryStockPage = () => {
  const { authState } = useContext(AuthContext);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL', 'ESCALATED', 'RETURNED'
  const [stockList, setStockList] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  
  const [escalateDialog, setEscalateDialog] = useState(false);
  const [releaseDialog, setReleaseDialog] = useState(false);
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const canCreateSurveillance = hasPermission(authState, PERMISSIONS.SURVEILLANCE_CREATE);
  const canManageTempStock = hasPermission(authState, PERMISSIONS.TEMP_STOCK_MANAGE);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      if (activeTab === 'active') {
        const res = await stockApi.getTemporaryStock();
        setStockList(res.data || []);
      } else {
        const res = await stockApi.getSeizureHistory();
        setHistoryList(res.data || []);
      }
    } catch (err) {
      toast.error('Failed to load stock data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
    if (location.state?.caseRef) {
      setCreateModalOpen(true);
    }
  }, [location.state, activeTab]);

  // Handled directly by modals now
  const handleModalSuccess = () => {
    setEscalateDialog(false);
    setReleaseDialog(false);
    setDrawerOpen(false);
    fetchData();
  };

  const displayList = useMemo(() => {
    let list = activeTab === 'active' ? stockList : historyList;
    
    // Apply filtering ONLY to Operation History as requested
    if (activeTab === 'history' && filterStatus !== 'ALL') {
      if (filterStatus === 'ESCALATED') {
        list = list.filter(item => item.status === 'ESCALATED' || item.status === 'IN_MAIN_STOCK' || item.status === 'PENDING_REVIEW' || item.status === 'IN_STOCK');
      } else if (filterStatus === 'RETURNED') {
        list = list.filter(item => item.status === 'RETURNED_FOR_CORRECTION' || item.status === 'RETURNED');
      } else if (filterStatus === 'RELEASED') {
        list = list.filter(item => item.status.includes('RELEASED'));
      }
    }
    return list;
  }, [activeTab, stockList, historyList, filterStatus]);

  const filteredStock = useMemo(() => {
    return displayList.filter(item => 
      item.seizureNumber?.toLowerCase().includes(search.toLowerCase()) ||
      item.taxpayerName?.toLowerCase().includes(search.toLowerCase())
    );
  }, [displayList, search]);

  useEffect(() => {
    setPage(0);
    // Reset filter status when switching tabs if needed, or keep it.
    // User wants it on history, so let's keep it separate.
  }, [search, activeTab]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedStock = useMemo(() => {
    return filteredStock.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredStock, page, rowsPerPage]);

  const handleDownloadSeizureNote = async (item) => {
    try {
      const response = await stockApi.downloadSeizureNote(item.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SeizureNote-${item.seizureNumber.replace(/\//g, '-')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error('Failed to download seizure note');
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'IN_TEMPORARY_STOCK':
        return { background: 'var(--rra-yellow-tint)', color: 'var(--rra-yellow-dark)' };
      case 'RETURNED_FOR_CORRECTION':
        return { background: 'rgba(239, 68, 68, 0.1)', color: 'rgb(220, 38, 38)' };
      case 'RELEASED_FROM_TEMP':
      case 'RELEASED_FROM_MAIN':
        return { background: 'var(--green-100)', color: 'var(--green-700)' };
      case 'ESCALATED':
      case 'IN_MAIN_STOCK':
        return { background: 'var(--blue-100)', color: 'var(--blue-700)' };
      default:
        return { background: 'var(--gray-100)', color: 'var(--gray-600)' };
    }
  };

  const getOutcome = (status) => {
    if (status.includes('RELEASED')) return 'RELEASED';
    if (status === 'ESCALATED' || status.includes('MAIN_STOCK') || status.includes('PRSO')) return 'ESCALATED';
    if (status === 'RETURNED_FOR_CORRECTION') return 'RETURNED';
    return 'PENDING';
  };

  const calculateDaysLeft = (dateSeized) => {
    if (!dateSeized) return null;
    const seizedDate = new Date(dateSeized);
    const dueDate = new Date(seizedDate);
    dueDate.setDate(dueDate.getDate() + 30);
    const today = new Date();
    
    // Reset hours to compare dates only
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getDaysLeftStyle = (days) => {
    if (days === null) return { background: 'var(--gray-100)', color: 'var(--gray-600)' };
    if (days > 20) return { background: '#DCFCE7', color: '#166534' }; // Green background
    if (days >= 10) return { background: '#F5F3FF', color: '#7C3AED' }; // Violet background
    return { background: '#FEE2E2', color: '#991B1B' }; // Red background for < 10
  };

  const returnedItems = useMemo(() => {
    if (activeTab !== 'active') return [];
    return stockList.filter(item => item.status === 'RETURNED_FOR_CORRECTION');
  }, [stockList, activeTab]);

  const criticalItems = useMemo(() => {
    if (activeTab !== 'active') return [];
    return stockList.filter(item => {
      if (item.status !== 'IN_TEMPORARY_STOCK' && item.status !== 'RETURNED_FOR_CORRECTION') return false;
      const daysLeft = calculateDaysLeft(item.dateTimeSeized);
      return daysLeft !== null && daysLeft <= 5;
    });
  }, [stockList, activeTab]);

  return (
    <div style={{ padding: '32px 40px', background: 'var(--surface-page)', minHeight: '100vh' }}>
      <Toaster position="top-right" richColors />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="type-page-title">Surveillance Officer Dashboard</h1>
          <p className="type-body" style={{ color: 'var(--gray-500)' }}>Manage seized goods and track operation history</p>
        </div>
        {canCreateSurveillance && (
          <button className="btn-base btn-primary" onClick={() => setCreateModalOpen(true)}>
            <PlusIcon style={{ width: 16, height: 16 }} />
            New Seizure Note
          </button>
        )}
      </div>

      {/* Alert Banners ... */}
      {activeTab === 'active' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {returnedItems.map(item => (
            <div 
              key={item.id} 
              style={{ 
                background: 'rgba(239, 68, 68, 0.08)', 
                border: '1px solid rgba(239, 68, 68, 0.25)', 
                borderRadius: 12, 
                padding: '16px 20px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.03)',
                animation: 'slideIn 0.3s ease-out'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ 
                  width: 36, 
                  height: 36, 
                  borderRadius: '50%', 
                  background: 'rgba(239, 68, 68, 0.15)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: 'rgb(239, 68, 68)'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 20, height: 20 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 7.5h.008v.008H12v-.008Z" />
                  </svg>
                </div>
                <div>
                  <span style={{ display: 'block', font: '600 14px var(--font-display)', color: 'rgb(185, 28, 28)' }}>
                    Seizure Note Returned for Correction: <span style={{ fontFamily: 'var(--font-mono)' }}>{item.seizureNumber}</span>
                  </span>
                  <span style={{ display: 'block', font: '400 13px var(--font-body)', color: 'rgb(220, 38, 38)', marginTop: 2 }}>
                    Reason: <strong>{item.returnReason || 'No details provided'}</strong>
                  </span>
                </div>
              </div>
              {canCreateSurveillance && (
                <button 
                  className="btn-base" 
                  style={{ 
                    padding: '6px 14px', 
                    fontSize: '12px', 
                    color: '#ffffff', 
                    background: 'rgb(220, 38, 38)',
                    border: 'none',
                    borderRadius: 6,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)'
                  }}
                  onClick={() => setEditItem(item)}
                >
                  Edit & Resubmit
                </button>
              )}
            </div>
          ))}

          {criticalItems.map(item => {
            const days = calculateDaysLeft(item.dateTimeSeized);
            return (
              <div 
                key={item.id} 
                style={{ 
                  background: 'rgba(245, 158, 11, 0.08)', 
                  border: '1px solid rgba(245, 158, 11, 0.25)', 
                  borderRadius: 12, 
                  padding: '16px 20px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.03)',
                  animation: 'slideIn 0.3s ease-out'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: '50%', 
                    background: 'rgba(245, 158, 11, 0.15)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: 'rgb(245, 158, 11)'
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 20, height: 20 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </div>
                  <div>
                    <span style={{ display: 'block', font: '600 14px var(--font-display)', color: 'rgb(180, 83, 9)' }}>
                      Justification Deadline Approaching: <span style={{ fontFamily: 'var(--font-mono)' }}>{item.seizureNumber}</span>
                    </span>
                    <span style={{ display: 'block', font: '400 13px var(--font-body)', color: 'rgb(217, 119, 6)', marginTop: 2 }}>
                      This item must be released or escalated to main stock within <strong>{days} {days === 1 ? 'day' : 'days'}</strong> (30-day limit).
                    </span>
                  </div>
                </div>
                <button 
                  className="btn-base" 
                  style={{ 
                    padding: '6px 14px', 
                    fontSize: '12px', 
                    color: '#ffffff', 
                    background: 'rgb(217, 119, 6)',
                    border: 'none',
                    borderRadius: 6,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(217, 119, 6, 0.2)'
                  }}
                  onClick={() => { setSelectedItem(item); setDrawerOpen(true); }}
                >
                  Action Item
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={() => { setActiveTab('active'); setFilterStatus('ALL'); }}
            className={`btn-base ${activeTab === 'active' ? 'btn-primary' : ''}`}
            style={activeTab !== 'active' ? { 
              background: 'transparent', 
              color: 'var(--rra-blue)', 
              border: '1px solid var(--rra-blue)' 
            } : {}}
          >
            Temporary Stock
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`btn-base ${activeTab === 'history' ? 'btn-primary' : ''}`}
            style={activeTab !== 'history' ? { 
              background: 'transparent', 
              color: 'var(--rra-blue)', 
              border: '1px solid var(--rra-blue)' 
            } : {}}
          >
            Operation History
          </button>
        </div>

        {activeTab === 'history' && (
          <div style={{ display: 'flex', gap: 8, background: 'var(--gray-50)', padding: 4, borderRadius: 8, border: '1px solid var(--gray-200)' }}>
            <button 
              onClick={() => setFilterStatus('ALL')}
              style={{ 
                padding: '6px 12px', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600,
                background: filterStatus === 'ALL' ? 'white' : 'transparent',
                color: filterStatus === 'ALL' ? 'var(--rra-blue)' : 'var(--gray-500)',
                boxShadow: filterStatus === 'ALL' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer'
              }}
            >
              All
            </button>
            <button 
              onClick={() => setFilterStatus('ESCALATED')}
              style={{ 
                padding: '6px 12px', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600,
                background: filterStatus === 'ESCALATED' ? 'white' : 'transparent',
                color: filterStatus === 'ESCALATED' ? 'var(--rra-blue)' : 'var(--gray-500)',
                boxShadow: filterStatus === 'ESCALATED' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer'
              }}
            >
              Escalated
            </button>
            <button 
              onClick={() => setFilterStatus('RETURNED')}
              style={{ 
                padding: '6px 12px', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600,
                background: filterStatus === 'RETURNED' ? 'white' : 'transparent',
                color: filterStatus === 'RETURNED' ? 'var(--rra-blue)' : 'var(--gray-500)',
                boxShadow: filterStatus === 'RETURNED' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer'
              }}
            >
              Returned
            </button>
            <button 
              onClick={() => setFilterStatus('RELEASED')}
              style={{ 
                padding: '6px 12px', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600,
                background: filterStatus === 'RELEASED' ? 'white' : 'transparent',
                color: filterStatus === 'RELEASED' ? 'var(--rra-blue)' : 'var(--gray-500)',
                boxShadow: filterStatus === 'RELEASED' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer'
              }}
            >
              Released
            </button>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          <div style={{ position: 'relative', width: 320 }}>
            <MagnifyingGlassIcon style={{ position: 'absolute', left: 12, top: 10, width: 18, color: 'var(--gray-400)' }} />
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search reference or taxpayer..." 
              style={{ paddingLeft: 38 }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <p style={{ textAlign: 'center', padding: 40, color: 'var(--gray-500)' }}>Loading...</p>
        ) : filteredStock.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <InboxArrowDownIcon style={{ width: 48, height: 48, color: 'var(--gray-300)', margin: '0 auto 16px' }} />
            <p className="type-body" style={{ color: 'var(--gray-500)' }}>No items found.</p>
          </div>
        ) : (
          <div className="stock-table">
            <table>
              <thead>
                <tr>
                  <th>Seizure Ref</th>
                  <th>Taxpayer</th>
                  <th>{activeTab === 'active' ? 'Status' : 'Outcome'}</th>
                  <th>Date Seized</th>
                  {activeTab === 'active' && <th>Days Left</th>}
                  {activeTab === 'history' && <th>Date Actioned</th>}
                  <th style={{ textAlign: 'center' }}>Seizure Note</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStock.map(item => {
                  const daysLeft = activeTab === 'active' ? calculateDaysLeft(item.dateTimeSeized) : null;
                  
                  return (
                    <tr key={item.id}>
                      <td className="ref" onClick={() => { setSelectedItem(item); setDrawerOpen(true); }}>
                        {item.seizureNumber}
                      </td>
                      <td>{item.taxpayerName || 'Unknown'}</td>
                      <td>
                        <span style={{
                          padding: '4px 8px', borderRadius: 4, 
                          ...getStatusStyle(item.status),
                          font: '600 11px var(--font-display)', textTransform: 'uppercase'
                        }}>
                          {activeTab === 'active' ? item.status.replace(/_/g, ' ') : getOutcome(item.status)}
                        </span>
                      </td>
                      <td className="date">{item.dateTimeSeized ? format(new Date(item.dateTimeSeized), 'dd MMM yyyy') : '-'}</td>
                      {activeTab === 'active' && (
                        <td>
                          <span style={{ 
                            padding: '4px 10px', 
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            display: 'inline-block',
                            minWidth: '70px',
                            textAlign: 'center',
                            ...getDaysLeftStyle(daysLeft)
                          }}>
                            {daysLeft !== null ? (daysLeft > 0 ? `${daysLeft} days` : 'Overdue') : '-'}
                          </span>
                        </td>
                      )}
                      {activeTab === 'history' && (
                        <td className="date">
                          {item.actionedAt ? format(new Date(item.actionedAt), 'dd MMM yyyy') : '-'}
                        </td>
                      )}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                          {canCreateSurveillance && item.status === 'RETURNED_FOR_CORRECTION' && (
                            <button 
                              className="btn-base" 
                              style={{ 
                                padding: '6px 12px', 
                                fontSize: '12px', 
                                color: 'rgb(220, 38, 38)', 
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                background: 'rgba(239, 68, 68, 0.05)',
                                fontWeight: 600
                              }}
                              onClick={() => setEditItem(item)}
                            >
                              Correct
                            </button>
                          )}
                          <button 
                            className="btn-base" 
                            style={{ 
                              padding: '6px 12px', 
                              fontSize: '12px', 
                              color: 'var(--rra-blue)', 
                              border: '1px solid var(--rra-blue-tint)',
                              background: 'var(--rra-blue-tint-light)'
                            }}
                            onClick={() => handleDownloadSeizureNote(item)}
                          >
                            Download PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <TablePagination
              rowsPerPageOptions={[10, 20, 50, 100]}
              component="div"
              count={filteredStock.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{
                borderTop: '1px solid var(--gray-200)',
                fontFamily: 'var(--font-body)',
                '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                  fontFamily: 'var(--font-display)',
                  fontWeight: 500,
                  fontSize: '13px'
                }
              }}
            />
          </div>
        )}
      </div>

      <CreateSeizureNoteModal 
        isOpen={canCreateSurveillance && (isCreateModalOpen || !!editItem)} 
        onClose={() => { setCreateModalOpen(false); setEditItem(null); }} 
        onSuccess={() => { setCreateModalOpen(false); setEditItem(null); fetchData(); }}
        initialCaseRef={location.state?.caseRef}
        editItem={editItem}
      />

      <RightDrawer
        isOpen={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={`Item ${selectedItem?.seizureNumber}`}
        footerActions={
          canManageTempStock && selectedItem?.status === 'IN_TEMPORARY_STOCK' ? (
            <>
              <button className="btn-base btn-success" onClick={() => { setDrawerOpen(false); setReleaseDialog(true); }}>Release to Owner</button>
              <button className="btn-base btn-danger" onClick={() => { setDrawerOpen(false); setEscalateDialog(true); }}>Escalate to Main Stock</button>
            </>
          ) : canCreateSurveillance && selectedItem?.status === 'RETURNED_FOR_CORRECTION' ? (
            <button 
              className="btn-base btn-primary" 
              onClick={() => { setDrawerOpen(false); setEditItem(selectedItem); }}
            >
              Correct / Edit Seizure Note
            </button>
          ) : null
        }
      >
        {selectedItem && (
          <div>
            <div className="drawer-section">
              <h3 className="drawer-section-title">Details</h3>
              <div className="drawer-field"><span className="drawer-field-label">Taxpayer</span><span className="drawer-field-value">{selectedItem.taxpayerName || 'Unknown'}</span></div>
              <div className="drawer-field"><span className="drawer-field-label">Goods</span><span className="drawer-field-value">{selectedItem.goodsDescription}</span></div>
              <div className="drawer-field"><span className="drawer-field-label">Reason</span><span className="drawer-field-value">{selectedItem.seizureReason}</span></div>
              <div className="drawer-field"><span className="drawer-field-label">Current Status</span><span className="drawer-field-value">{selectedItem.status.replace(/_/g, ' ')}</span></div>
              {selectedItem.status === 'RETURNED_FOR_CORRECTION' && selectedItem.returnReason && (
                <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: 12, borderRadius: 8, borderLeft: '4px solid rgb(220, 38, 38)', marginTop: 12, marginBottom: 12 }}>
                  <div style={{ font: '600 12px var(--font-display)', color: 'rgb(185, 28, 28)', marginBottom: 4 }}>Return Reason</div>
                  <div style={{ font: '400 13px var(--font-body)', color: 'rgb(220, 38, 38)' }}>{selectedItem.returnReason}</div>
                </div>
              )}
              {selectedItem.actionedAt && (
                <div className="drawer-field"><span className="drawer-field-label">Date Actioned</span><span className="drawer-field-value">{format(new Date(selectedItem.actionedAt), 'dd MMM yyyy HH:mm')}</span></div>
              )}
            </div>
          </div>
        )}
      </RightDrawer>

      <ReleaseGoodsModal
        isOpen={releaseDialog}
        onClose={() => setReleaseDialog(false)}
        onSuccess={handleModalSuccess}
        seizureId={selectedItem?.id}
      />

      <EscalatePVModal
        isOpen={escalateDialog}
        onClose={() => setEscalateDialog(false)}
        onSuccess={handleModalSuccess}
        seizureId={selectedItem?.id}
        seizureNumber={selectedItem?.seizureNumber}
      />

    </div>
  );
};

export default PVTemporaryStockPage;
