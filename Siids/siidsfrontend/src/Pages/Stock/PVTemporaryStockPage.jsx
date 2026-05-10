import React, { useState, useEffect } from 'react';
import { PlusIcon, MagnifyingGlassIcon, InboxArrowDownIcon } from '@heroicons/react/24/outline';
import { stockApi } from '../../api/stockApi';
import CreateSeizureNoteModal from '../../Components/ui/CreateSeizureNoteModal';
import RightDrawer from '../../Components/ui/RightDrawer';
import ReleaseGoodsModal from '../../Components/ui/ReleaseGoodsModal';
import EscalatePVModal from '../../Components/ui/EscalatePVModal';
import { toast, Toaster } from 'sonner';
import { format } from 'date-fns';

import { useLocation } from 'react-router-dom';

const PVTemporaryStockPage = () => {
  const location = useLocation();
  const [stockList, setStockList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  
  const [escalateDialog, setEscalateDialog] = useState(false);
  const [releaseDialog, setReleaseDialog] = useState(false);

  const fetchStock = async () => {
    try {
      setIsLoading(true);
      const res = await stockApi.getTemporaryStock();
      setStockList(res.data || []);
    } catch (err) {
      toast.error('Failed to load temporary stock');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    fetchStock(); 
    if (location.state?.caseRef) {
      setCreateModalOpen(true);
    }
  }, [location.state]);

  // Handled directly by modals now
  const handleModalSuccess = () => {
    setEscalateDialog(false);
    setReleaseDialog(false);
    setDrawerOpen(false);
    fetchStock();
  };

  const filteredStock = stockList.filter(item => 
    item.seizureNumber?.toLowerCase().includes(search.toLowerCase()) ||
    item.taxpayerName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '32px 40px', background: 'var(--surface-page)', minHeight: '100vh' }}>
      <Toaster position="top-right" richColors />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="type-page-title">Temporary Stock</h1>
          <p className="type-body" style={{ color: 'var(--gray-500)' }}>Manage seized goods pending justification</p>
        </div>
        <button className="btn-base btn-primary" onClick={() => setCreateModalOpen(true)}>
          <PlusIcon style={{ width: 16, height: 16 }} />
          New Seizure Note
        </button>
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
            <p className="type-body" style={{ color: 'var(--gray-500)' }}>No items in temporary stock.</p>
          </div>
        ) : (
          <div className="stock-table">
            <table>
              <thead>
                <tr>
                  <th>Seizure Ref</th>
                  <th>Taxpayer</th>
                  <th>Status</th>
                  <th>Date Seized</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.map(item => (
                  <tr key={item.id}>
                    <td className="ref" onClick={() => { setSelectedItem(item); setDrawerOpen(true); }}>
                      {item.seizureNumber}
                    </td>
                    <td>{item.taxpayerName || 'Unknown'}</td>
                    <td>
                      <span style={{
                        padding: '4px 8px', borderRadius: 4, 
                        background: item.status === 'IN_TEMPORARY_STOCK' ? 'var(--rra-yellow-tint)' : 'var(--gray-100)',
                        color: item.status === 'IN_TEMPORARY_STOCK' ? 'var(--rra-yellow-dark)' : 'var(--gray-600)',
                        font: '600 11px var(--font-display)', textTransform: 'uppercase'
                      }}>
                        {item.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="date">{item.dateTimeSeized ? format(new Date(item.dateTimeSeized), 'dd MMM yyyy') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateSeizureNoteModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
        onSuccess={() => { setCreateModalOpen(false); fetchStock(); }}
        initialCaseRef={location.state?.caseRef}
      />

      <RightDrawer
        isOpen={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={`Item ${selectedItem?.seizureNumber}`}
        footerActions={
          selectedItem?.status === 'IN_TEMPORARY_STOCK' ? (
            <>
              <button className="btn-base btn-success" onClick={() => setReleaseDialog(true)}>Release to Owner</button>
              <button className="btn-base btn-danger" onClick={() => setEscalateDialog(true)}>Escalate to Main Stock</button>
            </>
          ) : null
        }
      >
        {selectedItem && (
          <div>
            <div className="drawer-section">
              <h3 className="drawer-section-title">Details</h3>
              <div className="drawer-field"><span className="drawer-field-label">Taxpayer</span><span className="drawer-field-value">{selectedItem.taxpayerName}</span></div>
              <div className="drawer-field"><span className="drawer-field-label">Goods</span><span className="drawer-field-value">{selectedItem.goodsDescription}</span></div>
              <div className="drawer-field"><span className="drawer-field-label">Reason</span><span className="drawer-field-value">{selectedItem.seizureReason}</span></div>
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
