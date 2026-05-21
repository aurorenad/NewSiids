import React, { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, InboxIcon } from '@heroicons/react/24/outline';
import { stockApi } from '../../api/stockApi';
import RightDrawer from '../../Components/ui/RightDrawer';
import ConfirmDialog from '../../Components/ui/ConfirmDialog';
import RequestEditModal from '../../Components/ui/RequestEditModal';
import { toast, Toaster } from 'sonner';
import { format } from 'date-fns';

const StockManagerPage = () => {
  const [stockList, setStockList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [releaseDialog, setReleaseDialog] = useState(false);
  const [returnDialog, setReturnDialog] = useState(false);
  
  // Search and Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const employeeId = localStorage.getItem('employeeId') || sessionStorage.getItem('employeeId');

  const fetchStock = async () => {
    try {
      setIsLoading(true);
      const res = await stockApi.getMainStock();
      setStockList(res.data || []);
    } catch (err) {
      toast.error('Failed to load main stock');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    fetchStock(); 
  }, [employeeId]);

  // Derived filtered and sorted list
  const getProcessedStock = () => {
    let list = [...stockList];

    // Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item => 
        item.pvNumber?.toLowerCase().includes(q) ||
        item.seizureNote?.taxpayerName?.toLowerCase().includes(q) ||
        item.seizureNote?.goodsDescription?.toLowerCase().includes(q) ||
        item.applicableLawReference?.toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.transferDate || 0) - new Date(a.transferDate || 0);
      if (sortBy === 'date_asc') return new Date(a.transferDate || 0) - new Date(b.transferDate || 0);
      if (sortBy === 'alpha') return (a.pvNumber || '').localeCompare(b.pvNumber || '');
      return 0;
    });

    return list;
  };

  const processedStock = getProcessedStock();
  const totalPages = Math.max(1, Math.ceil(processedStock.length / pageSize));
  const paginatedStock = processedStock.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, sortBy, pageSize]);

  const handleModalSuccess = () => {
    setReleaseDialog(false);
    setReturnDialog(false);
    setDrawerOpen(false);
    fetchStock();
  };

  const handleDownloadPV = async (item) => {
    try {
      const response = await stockApi.downloadPVPdf(item.id);
      
      // Safety check for response data
      if (!response.data || response.data.size === 0) {
        throw new Error('Received empty file');
      }

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      
      // Safety check for PV Number formatting
      const safePvNumber = (item.pvNumber || `PV-DOC-${item.id}`).replace(/\//g, '-');
      link.setAttribute('download', `${safePvNumber}.pdf`);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      toast.error('Failed to download PV document. Please try again.');
    }
  };

  return (
    <div style={{ padding: '32px 40px', background: 'var(--surface-page)', minHeight: '100vh' }}>
      <Toaster position="top-right" richColors />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <h1 className="type-page-title">Main Stock Inventory</h1>
          <p className="type-body" style={{ color: 'var(--gray-500)' }}>Manage official RRA warehouse stock</p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <MagnifyingGlassIcon style={{ position: 'absolute', left: 12, top: 10, width: 18, color: 'var(--gray-400)' }} />
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search PV, taxpayer, goods..." 
              style={{ width: 280, paddingLeft: 38 }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <select 
            className="form-control" 
            style={{ width: 180 }}
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First (Aged)</option>
            <option value="alpha">PV Number (A-Z)</option>
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        {isLoading ? (
          <p style={{ textAlign: 'center', padding: 40, color: 'var(--gray-500)' }}>Loading...</p>
        ) : processedStock.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <InboxIcon style={{ width: 48, height: 48, color: 'var(--gray-300)', margin: '0 auto 16px' }} />
            <p className="type-body" style={{ color: 'var(--gray-500)' }}>{searchQuery ? 'No items match your search.' : 'Warehouse is empty.'}</p>
          </div>
        ) : (
          <div className="stock-table" style={{ maxHeight: 520, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>PV Number</th>
                  <th>Taxpayer</th>
                  <th>Date In</th>
                  <th>Law Reference</th>
                  <th style={{ textAlign: 'center' }}>PV Document</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStock.map(item => (
                  <tr key={item.id}>
                    <td className="ref" onClick={() => { setSelectedItem(item); setDrawerOpen(true); }}>
                      {item.pvNumber}
                    </td>
                    <td>{item.seizureNote?.taxpayerName || 'Unknown'}</td>
                    <td className="date">{item.transferDate ? format(new Date(item.transferDate), 'dd MMM yyyy') : '-'}</td>
                    <td>{item.applicableLawReference}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        className="btn-base" 
                        style={{ 
                          padding: '6px 12px', 
                          fontSize: '12px', 
                          color: 'var(--rra-blue)', 
                          border: '1px solid var(--rra-blue-tint)',
                          background: 'var(--rra-blue-tint-light)'
                        }}
                        onClick={() => handleDownloadPV(item)}
                      >
                        Download PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px', borderTop: '1px solid var(--gray-200)', marginTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>Rows per page:</span>
            <select
              className="form-control"
              style={{ width: 70, padding: '2px 6px', fontSize: 12, height: 28 }}
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            >
              <option value={10}>10</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>
              {processedStock.length === 0 ? '0' : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, processedStock.length)}`} of {processedStock.length}
            </span>
            <button
              style={{ padding: '3px 10px', fontSize: 12, border: '1px solid var(--gray-300)', borderRadius: 4, background: 'white', color: currentPage === 1 ? 'var(--gray-300)' : 'var(--gray-700)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
              onClick={() => setCurrentPage(p => p - 1)}
              disabled={currentPage === 1}
            >Prev</button>
            <span style={{ fontSize: 12 }}>{currentPage} / {totalPages}</span>
            <button
              style={{ padding: '3px 10px', fontSize: 12, border: '1px solid var(--gray-300)', borderRadius: 4, background: 'white', color: currentPage >= totalPages ? 'var(--gray-300)' : 'var(--gray-700)', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer' }}
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage >= totalPages}
            >Next</button>
          </div>
        </div>
      </div>

      <RightDrawer
        isOpen={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={`PV Document ${selectedItem?.pvNumber}`}
        footerActions={
          <>
            <button className="btn-base btn-danger" onClick={() => { setDrawerOpen(false); setReturnDialog(true); }}>Return for Correction</button>
            <button className="btn-base btn-primary" onClick={() => { setDrawerOpen(false); setReleaseDialog(true); }}>Request Release</button>
          </>
        }
      >
        {selectedItem && (
          <div>
            <div className="drawer-section">
              <h3 className="drawer-section-title">Legal Details</h3>
              <div className="drawer-field"><span className="drawer-field-label">Law Ref</span><span className="drawer-field-value">{selectedItem.applicableLawReference}</span></div>
              <div className="drawer-field"><span className="drawer-field-label">Transfer Date</span><span className="drawer-field-value">{selectedItem.transferDate ? format(new Date(selectedItem.transferDate), 'dd MMM yyyy HH:mm') : '-'}</span></div>
              <div className="drawer-field" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <span className="drawer-field-label">Formal Statement</span>
                <span className="drawer-field-value" style={{ marginTop: 4, fontStyle: 'italic', fontSize: 13 }}>{selectedItem.formalStatementText}</span>
              </div>
            </div>

            <div className="drawer-section">
              <h3 className="drawer-section-title">Original Seizure Info</h3>
              <div className="drawer-field"><span className="drawer-field-label">Seizure Ref</span><span className="drawer-field-value">{selectedItem.seizureNote?.seizureNumber}</span></div>
              <div className="drawer-field"><span className="drawer-field-label">Taxpayer</span><span className="drawer-field-value">{selectedItem.seizureNote?.taxpayerName} ({selectedItem.seizureNote?.taxpayerTin})</span></div>
              <div className="drawer-field"><span className="drawer-field-label">Goods</span><span className="drawer-field-value">{selectedItem.seizureNote?.goodsDescription}</span></div>
              <div className="drawer-field"><span className="drawer-field-label">Reason</span><span className="drawer-field-value">{selectedItem.seizureNote?.seizureReason}</span></div>
              <div className="drawer-field"><span className="drawer-field-label">Date Seized</span><span className="drawer-field-value">{selectedItem.seizureNote?.dateTimeSeized ? format(new Date(selectedItem.seizureNote.dateTimeSeized), 'dd MMM yyyy') : '-'}</span></div>
            </div>
          </div>
        )}
      </RightDrawer>

      <ConfirmDialog
        isOpen={releaseDialog}
        onClose={() => setReleaseDialog(false)}
        onConfirm={async (reason) => {
          try {
            await stockApi.requestRelease(selectedItem.id, { 
              releaseReason: reason,
              releaseDestination: 'Auction',
              recipientName: selectedItem.seizureNote?.taxpayerName || 'Unknown',
              recipientIdPassport: selectedItem.seizureNote?.taxpayerTin || 'N/A'
            });
            toast.success('Release request sent to PRSO');
            handleModalSuccess();
          } catch (err) {
            toast.error('Failed to request release');
          }
        }}
        title="Request Release Approval"
        body="This will submit a formal release request to the PRSO. The goods will remain in stock until approved."
        variant="warning"
        requiresReason={true}
        confirmLabel="Send Request to PRSO"
        extraButton={
          <button 
            className="btn-base" 
            style={{ border: '1px solid var(--gray-300)', background: 'white', color: 'var(--gray-700)' }}
            onClick={async (reason) => {
              try {
                const res = await stockApi.previewReleaseNotePdf({
                  pvId: selectedItem.id,
                  releaseReason: reason,
                  releaseDestination: 'Auction',
                  recipientName: selectedItem.seizureNote?.taxpayerName || 'Unknown',
                  recipientIdPassport: selectedItem.seizureNote?.taxpayerTin || 'N/A'
                });
                const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `Draft-ReleaseNote-${selectedItem.pvNumber}.pdf`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                toast.success('Draft release note created');
              } catch (err) {
                toast.error('Failed to create draft release note');
              }
            }}
          >
            Create Release Note
          </button>
        }
      />

      <ConfirmDialog
        isOpen={returnDialog}
        onClose={() => setReturnDialog(false)}
        onConfirm={async (reason) => {
          try {
            await stockApi.returnForCorrection(selectedItem.id, reason);
            toast.success('Seizure note returned to officer for correction');
            handleModalSuccess();
          } catch (err) {
            toast.error('Failed to return for correction');
          }
        }}
        title="Return for Correction"
        body="This will move the item back to Temporary Stock and notify the Surveillance Officer to correct the seizure note. The current PV Document will be deleted."
        variant="danger"
        requiresReason={true}
        confirmLabel="Return to Officer"
      />

    </div>
  );
};

export default StockManagerPage;
