import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { jsPDF } from 'jspdf';
import { Edit, Trash2, Download } from 'lucide-react';
import '../styles/StockManagement.css'; // We will create this CSS file

const StockManagement = () => {
    const { authState } = useContext(AuthContext);
    const [stocks, setStocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [currentStock, setCurrentStock] = useState(null);
    const [formData, setFormData] = useState({
        ownerName: '',
        takeoverName: '',
        seizureNumber: '',
        pvNumber: '',
        takenDate: '',
        receivedDate: '',
        item: 'FOOD',
        itemName: '',
        quantity: '',
        dateReleased: '',
        reason: ''
    });
    const [documentFile, setDocumentFile] = useState(null);
    const [anotherDocumentFile, setAnotherDocumentFile] = useState(null);

    const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
    const API_URL = `${BASE_URL}/api/stock`;

    useEffect(() => {
        fetchStocks();
    }, []);

    const fetchStocks = async () => {
        try {
            const response = await fetch(API_URL, {
                headers: {
                    'Authorization': `Bearer ${authState.token}`,
                    'employee_id': authState.employeeId
                }
            });
            if (response.ok) {
                const data = await response.json();
                setStocks(data);
            } else {
                console.error('Failed to fetch stocks');
            }
        } catch (error) {
            console.error('Error fetching stocks:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const { name, files } = e.target;
        if (name === 'document') {
            setDocumentFile(files[0]);
        } else if (name === 'anotherDocument') {
            setAnotherDocumentFile(files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation Logic
        if (new Date(formData.receivedDate) < new Date(formData.takenDate)) {
            alert('Received Date cannot be before Taken Date.');
            return;
        }

        if (formData.dateReleased) {
            // If Released, check for Reason and Release Document
            if (!formData.reason || formData.reason.trim() === '') {
                alert('Reason is required when Date Released is set.');
                return;
            }
            // Check for document: either a new file is uploaded OR (we are editing AND there is an existing path)
            const hasReleaseDoc = anotherDocumentFile || (currentStock && currentStock.anotherDocumentPath);
            if (!hasReleaseDoc) {
                alert('Release Document is required when Date Released is set.');
                return;
            }
            if (new Date(formData.dateReleased) < new Date(formData.receivedDate)) {
                alert('Date Released cannot be before Received Date.');
                return;
            }
        }

        if (!documentFile && !currentStock?.documentPath) {
            alert('Seizure Document is mandatory.');
            return;
        }

        const data = new FormData();

        // Create the JSON part
        const stockData = {
            ownerName: formData.ownerName,
            takeoverName: formData.takeoverName,
            seizureNumber: formData.seizureNumber,
            pvNumber: formData.pvNumber,
            takenDate: formData.takenDate || null,
            receivedDate: formData.receivedDate || null,
            item: formData.item,
            itemName: formData.itemName,
            quantity: parseInt(formData.quantity) || 0,
            dateReleased: formData.dateReleased || null,
            reason: formData.reason
        };

        data.append('stockData', new Blob([JSON.stringify(stockData)], { type: 'application/json' }));
        if (documentFile) data.append('document', documentFile);
        if (anotherDocumentFile) data.append('anotherDocument', anotherDocumentFile);

        try {
            const url = currentStock ? `${API_URL}/${currentStock.id}` : API_URL;
            const method = currentStock ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${authState.token}`,
                    'employee_id': authState.employeeId
                    // Content-Type is set automatically for FormData
                },
                body: data
            });

            if (response.ok) {
                fetchStocks();
                closeModal();
            } else {
                console.error('Failed to save stock');
                alert('Failed to save stock. Please check inputs and try again.');
            }
        } catch (error) {
            console.error('Error saving stock:', error);
            alert('Error saving stock');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this stock item?')) return;

        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authState.token}`,
                    'employee_id': authState.employeeId
                }
            });

            if (response.ok) {
                fetchStocks();
            } else {
                console.error('Failed to delete stock');
            }
        } catch (error) {
            console.error('Error deleting stock:', error);
        }
    };

    const openEditModal = (stock) => {
        setCurrentStock(stock);
        setFormData({
            ownerName: stock.ownerName || '',
            takeoverName: stock.takeoverName || '',
            seizureNumber: stock.seizureNumber || '',
            pvNumber: stock.pvNumber || '',
            takenDate: stock.takenDate || '',
            receivedDate: stock.receivedDate || '',
            item: stock.item || 'FOOD',
            itemName: stock.itemName || '',
            quantity: stock.quantity || '',
            dateReleased: stock.dateReleased || '',
            reason: stock.reason || ''
        });
        setShowModal(true);
    };

    const openCreateModal = () => {
        setCurrentStock(null);
        setFormData({
            ownerName: '',
            takeoverName: '',
            seizureNumber: '',
            pvNumber: '',
            takenDate: '',
            receivedDate: '',
            item: 'FOOD',
            itemName: '',
            quantity: '',
            dateReleased: '',
            reason: ''
        });
        setDocumentFile(null);
        setAnotherDocumentFile(null);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setCurrentStock(null);
    };

    const downloadDocument = async (id, type) => {
        const endpoint = type === 'document' ? 'document' : 'another-document';
        try {
            const response = await fetch(`${API_URL}/${id}/${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${authState.token}`,
                    'employee_id': authState.employeeId
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const fileURL = window.URL.createObjectURL(blob);
                window.open(fileURL, '_blank');
            } else {
                alert('Document not found or error opening.');
            }
        } catch (error) {
            console.error('Error opening document:', error);
        }
    };

    const generateStockPdf = (stock) => {
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text('Stock Information', 105, 20, { align: 'center' });

        doc.setFontSize(12);
        let y = 40;
        const lineHeight = 10;

        const addField = (label, value) => {
            doc.setFont('helvetica', 'bold');
            doc.text(`${label}:`, 20, y);
            doc.setFont('helvetica', 'normal');
            doc.text(`${value}`, 80, y);
            y += lineHeight;
        };

        addField('Owner Name', stock.ownerName);
        addField('Takeover Name', stock.takeoverName);
        addField('Seizure Number', stock.seizureNumber);
        addField('PV Number', stock.pvNumber);
        addField('Taken Date', stock.takenDate);
        addField('Received Date', stock.receivedDate);
        addField('Item Type', stock.item);
        addField('Item Name', stock.itemName);
        addField('Quantity', stock.quantity);

        if (stock.dateReleased) {
            addField('Date Released', stock.dateReleased);
            addField('Reason', stock.reason);
        }

        doc.save(`Stock-Info-${stock.id}.pdf`);
    };

    return (
        <div className="stock-container">
            <div className="stock-header">
                <h2>Stock Management</h2>
                <button className="add-btn" onClick={openCreateModal}>Add New Stock</button>
            </div>

            {loading ? <p>Loading...</p> : (
                <div className="table-responsive">
                    <table className="stock-table">
                        <thead>
                            <tr>
                                <th>Owner</th>
                                <th>Item Name</th>
                                <th>Type</th>
                                <th>Qty</th>
                                <th>Taken Date</th>
                                <th>Stored Documents</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stocks.map(stock => (
                                <tr key={stock.id}>
                                    <td>{stock.ownerName}</td>
                                    <td>{stock.itemName}</td>
                                    <td>{stock.item}</td>
                                    <td>{stock.quantity}</td>
                                    <td>{stock.takenDate}</td>
                                    <td>
                                        {stock.documentPath && (
                                            <button className="link-btn" onClick={() => downloadDocument(stock.id, 'document')}>Doc 1</button>
                                        )}
                                        {stock.anotherDocumentPath && (
                                            <button className="link-btn" onClick={() => downloadDocument(stock.id, 'another')}>Doc 2</button>
                                        )}
                                    </td>
                                    <td className="actions-cell">
                                        <button className="icon-btn edit-btn" onClick={() => openEditModal(stock)} title="Edit">
                                            <Edit size={18} />
                                        </button>
                                        <button className="icon-btn delete-btn" onClick={() => handleDelete(stock.id)} title="Delete">
                                            <Trash2 size={18} />
                                        </button>
                                        <button className="icon-btn download-btn" onClick={() => generateStockPdf(stock)} title="Download Info">
                                            <Download size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>{currentStock ? 'Edit Stock' : 'Add New Stock'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-grid">
                                {/* Mandatory Fields Group A */}
                                <div className="form-group">
                                    <label>Owner Name *</label>
                                    <input type="text" name="ownerName" value={formData.ownerName || ''} onChange={handleInputChange} required />
                                </div>
                                <div className="form-group">
                                    <label>Takeover Name *</label>
                                    <input type="text" name="takeoverName" value={formData.takeoverName || ''} onChange={handleInputChange} required />
                                </div>
                                <div className="form-group">
                                    <label>Seizure Number *</label>
                                    <input type="text" name="seizureNumber" value={formData.seizureNumber || ''} onChange={handleInputChange} required />
                                </div>
                                <div className="form-group">
                                    <label>PV Number *</label>
                                    <input type="text" name="pvNumber" value={formData.pvNumber || ''} onChange={handleInputChange} required />
                                </div>
                                <div className="form-group">
                                    <label>Taken Date *</label>
                                    <input type="date" name="takenDate" value={formData.takenDate || ''} onChange={handleInputChange} required />
                                </div>
                                <div className="form-group">
                                    <label>Received Date *</label>
                                    <input type="date" name="receivedDate" value={formData.receivedDate || ''} onChange={handleInputChange} min={formData.takenDate} required />
                                </div>
                                <div className="form-group">
                                    <label>Item Name *</label>
                                    <input type="text" name="itemName" value={formData.itemName || ''} onChange={handleInputChange} required />
                                </div>
                                <div className="form-group">
                                    <label>Item Type *</label>
                                    <select name="item" value={formData.item || 'FOOD'} onChange={handleInputChange}>
                                        <option value="FOOD">Food</option>
                                        <option value="DRINKS">Drinks</option>
                                        <option value="CLOTHING">Clothing</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Quantity *</label>
                                    <input type="number" name="quantity" value={formData.quantity || ''} onChange={handleInputChange} required />
                                </div>
                                <div className="form-group">
                                    <label>Seizure Document (PDF) *</label>
                                    <input type="file" name="document" accept=".pdf" onChange={handleFileChange} required={!currentStock} />
                                    {currentStock && currentStock.documentPath && <small>Current: Attached</small>}
                                </div>

                                {/* Conditional / Optional Logic for Release */}
                                <div className="form-group">
                                    <label>Date Released</label>
                                    <input type="date" name="dateReleased" value={formData.dateReleased || ''} onChange={handleInputChange} min={formData.receivedDate} />
                                </div>
                                <div className="form-group full-width">
                                    <label>Reason {formData.dateReleased ? '*' : ''}</label>
                                    <textarea name="reason" value={formData.reason || ''} onChange={handleInputChange} required={!!formData.dateReleased} />
                                </div>
                                <div className="form-group">
                                    <label>Release Document (PDF) {formData.dateReleased ? '*' : ''}</label>
                                    <input type="file" name="anotherDocument" accept=".pdf" onChange={handleFileChange} required={!!formData.dateReleased && (!currentStock || !currentStock.anotherDocumentPath)} />
                                    {currentStock && currentStock.anotherDocumentPath && <small>Current: Attached</small>}
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={closeModal}>Cancel</button>
                                <button type="submit" className="save-btn">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockManagement;
