import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { jsPDF } from 'jspdf';
import { Edit, Trash2, Download, FileSpreadsheet, Search, X, Plus } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import '../styles/StockManagement.css';

const EMPTY_ITEM = { itemName: '', item: '', quantity: '', measurementUnit: '' };

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
        items: [{ ...EMPTY_ITEM }],
        dateReleased: '',
        releasedItem: '',
        quantityReleased: '',
        soldAmount: '',
        reason: ''
    });
    const [documentFile, setDocumentFile] = useState(null);
    const [anotherDocumentFile, setAnotherDocumentFile] = useState(null);

    // Backend-driven dropdown options
    const [itemTypes, setItemTypes] = useState([]);
    const [measurementUnits, setMeasurementUnits] = useState([]);

    // Search & filter state
    const [searchOwner, setSearchOwner] = useState('');
    const [searchItemName, setSearchItemName] = useState('');
    const [searchTakenDate, setSearchTakenDate] = useState('');
    const [releaseFilter, setReleaseFilter] = useState('all');

    const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
    const API_URL = `${BASE_URL}/api/stock`;

    useEffect(() => {
        fetchStocks();
        fetchItemTypes();
        fetchMeasurementUnits();
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

    const fetchItemTypes = async () => {
        try {
            const response = await fetch(`${API_URL}/item-types`, {
                headers: {
                    'Authorization': `Bearer ${authState.token}`,
                    'employee_id': authState.employeeId
                }
            });
            if (response.ok) {
                const data = await response.json();
                setItemTypes(data);
            }
        } catch (error) {
            console.error('Error fetching item types:', error);
        }
    };

    const fetchMeasurementUnits = async () => {
        try {
            const response = await fetch(`${API_URL}/measurement-units`, {
                headers: {
                    'Authorization': `Bearer ${authState.token}`,
                    'employee_id': authState.employeeId
                }
            });
            if (response.ok) {
                const data = await response.json();
                setMeasurementUnits(data);
            }
        } catch (error) {
            console.error('Error fetching measurement units:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleItemChange = (index, field, value) => {
        setFormData(prev => {
            const newItems = [...prev.items];
            newItems[index] = { ...newItems[index], [field]: value };
            return { ...prev, items: newItems };
        });
    };

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { ...EMPTY_ITEM, item: itemTypes[0] || '', measurementUnit: measurementUnits[0] || '' }]
        }));
    };

    const removeItem = (index) => {
        if (formData.items.length <= 1) return;
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const handleFileChange = (e) => {
        const { name, files } = e.target;
        if (name === 'document') {
            setDocumentFile(files[0]);
        } else if (name === 'anotherDocument') {
            setAnotherDocumentFile(files[0]);
        }
    };

    const getTotalQuantity = () => {
        return formData.items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
    };

    const getMaxReleasedQuantity = () => {
        if (!formData.releasedItem || formData.releasedItem === 'ALL') {
            return getTotalQuantity();
        }
        const selectedItem = formData.items.find(i => i.itemName === formData.releasedItem);
        return selectedItem ? (parseInt(selectedItem.quantity) || 0) : 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate dates
        if (new Date(formData.receivedDate) < new Date(formData.takenDate)) {
            alert('Received Date cannot be before Taken Date.');
            return;
        }

        // Validate items
        for (let i = 0; i < formData.items.length; i++) {
            const item = formData.items[i];
            if (!item.itemName || item.itemName.trim() === '') {
                alert(`Item Name is required for item ${i + 1}.`);
                return;
            }
            if (!item.item) {
                alert(`Item Type is required for item ${i + 1}.`);
                return;
            }
            const qty = parseInt(item.quantity);
            if (!qty || qty <= 0) {
                alert(`Quantity must be greater than zero for item ${i + 1}.`);
                return;
            }
            if (!item.measurementUnit) {
                alert(`Measurement Unit is required for item ${i + 1}.`);
                return;
            }
        }

        // Validate release logic
        if (formData.dateReleased) {
            if (!formData.reason || formData.reason.trim() === '') {
                alert('Reason is required when Date Released is set.');
                return;
            }
            const hasReleaseDoc = anotherDocumentFile || (currentStock && currentStock.anotherDocumentPath);
            if (!hasReleaseDoc) {
                alert('Release Document is required when Date Released is set.');
                return;
            }
            if (new Date(formData.dateReleased) < new Date(formData.receivedDate)) {
                alert('Date Released cannot be before Received Date.');
                return;
            }
            if (!formData.releasedItem) {
                alert('Please select which item was released.');
                return;
            }
            const qtyReleased = parseInt(formData.quantityReleased);
            if (!qtyReleased || qtyReleased <= 0) {
                alert('Quantity Released must be greater than zero when Date Released is set.');
                return;
            }
            const maxQty = getMaxReleasedQuantity();
            if (qtyReleased > maxQty) {
                alert(`Quantity Released (${qtyReleased}) cannot exceed available quantity (${maxQty}).`);
                return;
            }
        }

        if (!documentFile && !currentStock?.documentPath) {
            alert('Seizure Document is mandatory.');
            return;
        }

        const data = new FormData();

        const stockData = {
            ownerName: formData.ownerName,
            takeoverName: formData.takeoverName,
            seizureNumber: formData.seizureNumber,
            pvNumber: formData.pvNumber,
            takenDate: formData.takenDate || null,
            receivedDate: formData.receivedDate || null,
            items: formData.items.map(item => ({
                itemName: item.itemName,
                item: item.item,
                quantity: parseInt(item.quantity) || 0,
                measurementUnit: item.measurementUnit
            })),
            dateReleased: formData.dateReleased || null,
            releasedItem: formData.dateReleased ? (formData.releasedItem || null) : null,
            quantityReleased: formData.dateReleased ? (parseInt(formData.quantityReleased) || null) : null,
            soldAmount: formData.dateReleased ? (parseFloat(formData.soldAmount) || null) : null,
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
                },
                body: data
            });

            if (response.ok) {
                fetchStocks();
                closeModal();
            } else {
                const errorText = await response.text();
                console.error('Failed to save stock:', errorText);
                alert(errorText || 'Failed to save stock. Please check inputs and try again.');
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
        const items = (stock.items && stock.items.length > 0)
            ? stock.items.map(item => ({
                itemName: item.itemName || '',
                item: item.item || (itemTypes[0] || ''),
                quantity: item.quantity || '',
                measurementUnit: item.measurementUnit || (measurementUnits[0] || '')
            }))
            : [{ ...EMPTY_ITEM, item: itemTypes[0] || '', measurementUnit: measurementUnits[0] || '' }];

        setFormData({
            ownerName: stock.ownerName || '',
            takeoverName: stock.takeoverName || '',
            seizureNumber: stock.seizureNumber || '',
            pvNumber: stock.pvNumber || '',
            takenDate: stock.takenDate || '',
            receivedDate: stock.receivedDate || '',
            items: items,
            dateReleased: stock.dateReleased || '',
            releasedItem: stock.releasedItem || '',
            quantityReleased: stock.quantityReleased || '',
            soldAmount: stock.soldAmount || '',
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
            items: [{ ...EMPTY_ITEM, item: itemTypes[0] || '', measurementUnit: measurementUnits[0] || '' }],
            dateReleased: '',
            releasedItem: '',
            quantityReleased: '',
            soldAmount: '',
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

    // Helper to format items for display
    const formatItemsDisplay = (items) => {
        if (!items || items.length === 0) return 'No items';
        if (items.length === 1) return items[0].itemName;
        return `${items[0].itemName} (+${items.length - 1} more)`;
    };

    const formatTotalQuantity = (items) => {
        if (!items || items.length === 0) return 0;
        return items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    };

    // --- Filtering logic ---
    const isFilterActive = searchOwner || searchItemName || searchTakenDate || releaseFilter !== 'all';

    const filteredStocks = useMemo(() => {
        return stocks.filter(stock => {
            if (searchOwner && !(stock.ownerName || '').toLowerCase().includes(searchOwner.toLowerCase())) {
                return false;
            }
            if (searchItemName) {
                const itemNames = (stock.items || []).map(i => (i.itemName || '').toLowerCase()).join(' ');
                if (!itemNames.includes(searchItemName.toLowerCase())) {
                    return false;
                }
            }
            if (searchTakenDate && stock.takenDate !== searchTakenDate) {
                return false;
            }
            if (releaseFilter === 'released' && !stock.dateReleased) {
                return false;
            }
            if (releaseFilter === 'not_released' && stock.dateReleased) {
                return false;
            }
            return true;
        });
    }, [stocks, searchOwner, searchItemName, searchTakenDate, releaseFilter]);

    // --- Excel download ---
    const downloadExcel = () => {
        const excelData = filteredStocks.map(stock => ({
            'Owner Name': stock.ownerName || '',
            'Takeover Name': stock.takeoverName || '',
            'Seizure Number': stock.seizureNumber || '',
            'PV Number': stock.pvNumber || '',
            'Items': (stock.items || []).map(i => `${i.itemName} (${i.quantity} ${i.measurementUnit})`).join(', '),
            'Item Types': (stock.items || []).map(i => i.item).join(', '),
            'Total Quantity': formatTotalQuantity(stock.items),
            'Taken Date': stock.takenDate || '',
            'Received Date': stock.receivedDate || '',
            'Date Released': stock.dateReleased || '',
            'Released Item': stock.releasedItem || '',
            'Quantity Released': stock.quantityReleased || '',
            'Sold Amount': stock.soldAmount || '',
            'Reason': stock.reason || '',
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock List');

        const colWidths = Object.keys(excelData[0] || {}).map(key => ({
            wch: Math.max(key.length, ...excelData.map(row => String(row[key]).length)) + 2
        }));
        worksheet['!cols'] = colWidths;

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Stock-List-${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const clearAllFilters = () => {
        setSearchOwner('');
        setSearchItemName('');
        setSearchTakenDate('');
        setReleaseFilter('all');
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

        // Items section
        y += 5;
        doc.setFont('helvetica', 'bold');
        doc.text('Items:', 20, y);
        y += lineHeight;

        (stock.items || []).forEach((item, idx) => {
            doc.setFont('helvetica', 'normal');
            doc.text(`  ${idx + 1}. ${item.itemName} - ${item.item} - ${item.quantity} ${item.measurementUnit}`, 20, y);
            y += lineHeight;
        });

        addField('Total Quantity', String(formatTotalQuantity(stock.items)));

        if (stock.dateReleased) {
            addField('Date Released', stock.dateReleased);
            addField('Released Item', stock.releasedItem === 'ALL' ? 'All Items' : (stock.releasedItem || ''));
            addField('Quantity Released', String(stock.quantityReleased || ''));
            addField('Sold Amount', stock.soldAmount ? String(stock.soldAmount) : 'N/A');
            addField('Reason', stock.reason);
        }

        doc.save(`Stock-Info-${stock.id}.pdf`);
    };

    // Format a measurement unit for display (e.g., "KG" -> "Kg")
    const formatUnit = (unit) => {
        if (!unit) return '';
        return unit.charAt(0) + unit.slice(1).toLowerCase();
    };

    return (
        <div className="stock-container">
            <div className="stock-header">
                <h2>Stock Management</h2>
                <button className="add-btn" onClick={openCreateModal}>Add New Stock</button>
            </div>

            {/* Search & Filter Bar */}
            <div className="search-filter-bar">
                <div className="search-input-group">
                    <Search size={16} className="search-icon" />
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search by Owner..."
                        value={searchOwner}
                        onChange={(e) => setSearchOwner(e.target.value)}
                    />
                </div>
                <div className="search-input-group">
                    <Search size={16} className="search-icon" />
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search by Item Name..."
                        value={searchItemName}
                        onChange={(e) => setSearchItemName(e.target.value)}
                    />
                </div>
                <div className="search-input-group">
                    <input
                        type="date"
                        className="search-input date-input"
                        title="Search by Taken Date"
                        value={searchTakenDate}
                        onChange={(e) => setSearchTakenDate(e.target.value)}
                    />
                </div>
                <select
                    className="filter-select"
                    value={releaseFilter}
                    onChange={(e) => setReleaseFilter(e.target.value)}
                >
                    <option value="all">All Status</option>
                    <option value="released">Released</option>
                    <option value="not_released">Not Released</option>
                </select>

                {isFilterActive && (
                    <>
                        <button className="clear-filters-btn" onClick={clearAllFilters} title="Clear all filters">
                            <X size={16} /> Clear
                        </button>
                        <button className="download-excel-btn" onClick={downloadExcel} title="Download filtered list as Excel">
                            <FileSpreadsheet size={16} /> Download Excel
                        </button>
                    </>
                )}

                {isFilterActive && (
                    <span className="results-count">
                        {filteredStocks.length} result{filteredStocks.length !== 1 ? 's' : ''} found
                    </span>
                )}
            </div>

            {loading ? <p>Loading...</p> : (
                <div className="table-responsive">
                    <table className="stock-table">
                        <thead>
                            <tr>
                                <th>Owner</th>
                                <th>Items</th>
                                <th>Total Qty</th>
                                <th>Taken Date</th>
                                <th>Released Date</th>
                                <th>Qty Released</th>
                                <th>Sold Amount</th>
                                <th>Stored Documents</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStocks.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="no-results">No stock items found matching your criteria.</td>
                                </tr>
                            ) : (
                                filteredStocks.map(stock => (
                                    <tr key={stock.id}>
                                        <td>{stock.ownerName}</td>
                                        <td title={(stock.items || []).map(i => `${i.itemName} (${i.item})`).join(', ')}>
                                            {formatItemsDisplay(stock.items)}
                                        </td>
                                        <td>{formatTotalQuantity(stock.items)}</td>
                                        <td>{stock.takenDate}</td>
                                        <td>
                                            {stock.dateReleased ? (
                                                <span className="released-badge">{stock.dateReleased}</span>
                                            ) : (
                                                <span className="not-released-badge">Not Released</span>
                                            )}
                                        </td>
                                        <td>{stock.quantityReleased || '-'}</td>
                                        <td>{stock.soldAmount ? `${stock.soldAmount} RWF` : '-'}</td>
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
                                ))
                            )}
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
                                {/* Mandatory Fields */}
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
                                    <label>Seizure Document (PDF) *</label>
                                    <input type="file" name="document" accept=".pdf" onChange={handleFileChange} required={!currentStock} />
                                    {currentStock && currentStock.documentPath && <small>Current: Attached</small>}
                                </div>
                            </div>

                            {/* Items Section */}
                            <div className="items-section">
                                <h4>Items *</h4>
                                {formData.items.map((item, index) => (
                                    <div key={index} className="item-row">
                                        <div className="item-fields">
                                            <div className="item-field">
                                                <label>Item Name *</label>
                                                <input
                                                    type="text"
                                                    value={item.itemName}
                                                    onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="item-field">
                                                <label>Item Type *</label>
                                                <select
                                                    value={item.item}
                                                    onChange={(e) => handleItemChange(index, 'item', e.target.value)}
                                                    required
                                                >
                                                    <option value="">Select Type</option>
                                                    {itemTypes.map(type => (
                                                        <option key={type} value={type}>{formatUnit(type)}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="item-field">
                                                <label>Quantity *</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="item-field">
                                                <label>Measurement *</label>
                                                <select
                                                    value={item.measurementUnit}
                                                    onChange={(e) => handleItemChange(index, 'measurementUnit', e.target.value)}
                                                    required
                                                >
                                                    <option value="">Select Unit</option>
                                                    {measurementUnits.map(unit => (
                                                        <option key={unit} value={unit}>{formatUnit(unit)}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            {formData.items.length > 1 && (
                                                <button
                                                    type="button"
                                                    className="remove-item-btn"
                                                    onClick={() => removeItem(index)}
                                                    title="Remove this item"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <button type="button" className="add-item-btn" onClick={addItem}>
                                    <Plus size={16} /> Add Another Item
                                </button>
                            </div>

                            {/* Release Section */}
                            <div className="form-grid" style={{ marginTop: '15px' }}>
                                <div className="form-group">
                                    <label>Date Released</label>
                                    <input type="date" name="dateReleased" value={formData.dateReleased || ''} onChange={handleInputChange} min={formData.receivedDate} />
                                </div>

                                {formData.dateReleased && (
                                    <>
                                        <div className="form-group">
                                            <label>Released Item *</label>
                                            <select
                                                name="releasedItem"
                                                value={formData.releasedItem || ''}
                                                onChange={handleInputChange}
                                                required
                                            >
                                                <option value="">Select Item</option>
                                                <option value="ALL">All Items</option>
                                                {formData.items.filter(i => i.itemName).map((item, idx) => (
                                                    <option key={idx} value={item.itemName}>{item.itemName}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Quantity Released * <small>(max: {getMaxReleasedQuantity()})</small></label>
                                            <input
                                                type="number"
                                                name="quantityReleased"
                                                min="1"
                                                max={getMaxReleasedQuantity()}
                                                value={formData.quantityReleased || ''}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Sold Amount (RWF)</label>
                                            <input
                                                type="number"
                                                name="soldAmount"
                                                min="0"
                                                step="0.01"
                                                value={formData.soldAmount || ''}
                                                onChange={handleInputChange}
                                                placeholder="Enter amount if sold"
                                            />
                                        </div>
                                    </>
                                )}

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
