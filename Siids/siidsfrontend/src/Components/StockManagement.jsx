import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { jsPDF } from 'jspdf';
import { Edit, Trash2, Download, FileSpreadsheet, Search, X, Plus } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import '../styles/StockManagement.css';

const EMPTY_ITEM = { itemName: '', item: '', quantity: '', measurementUnit: '', plateNumber: '', chassisNumber: '', vehicleType: '' };

const StockManagement = () => {
    const { authState } = useContext(AuthContext);
    const today = useMemo(() => new Date().toISOString().split('T')[0], []);
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
        seizureReason: '',
        dateReleased: '',
        releasedItem: '',
        quantityReleased: '',
        soldAmount: '',
        reason: '',
        releaseReason: '',
        newPlateNumber: '',
        newOwner: ''
    });
    const [documentFiles, setDocumentFiles] = useState([]);
    const [anotherDocumentFile, setAnotherDocumentFile] = useState(null);

    // Backend-driven dropdown options
    const [itemTypes, setItemTypes] = useState([]);
    const [measurementUnits, setMeasurementUnits] = useState([]);
    const [releaseReasons, setReleaseReasons] = useState([]);

    // Search & filter state
    const [searchOwner, setSearchOwner] = useState('');
    const [searchItemName, setSearchItemName] = useState('');
    const [searchTakenDate, setSearchTakenDate] = useState('');
    const [releaseFilter, setReleaseFilter] = useState('all');

    const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:2005';
    const API_URL = `${BASE_URL}/api/stock`;

    // Always read the freshest token from storage to avoid stale closure issues
    const getAuthHeaders = () => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token') || authState.token;
        const employeeId = localStorage.getItem('employeeId') || sessionStorage.getItem('employeeId') || authState.employeeId;
        return {
            'Authorization': `Bearer ${token}`,
            'employee_id': employeeId
        };
    };

    // Wrapper around fetch that auto-refreshes the token on 401
    const fetchWithAuth = async (url, options = {}) => {
        const headers = { ...getAuthHeaders(), ...(options.headers || {}) };
        let response = await fetch(url, { ...options, headers });

        if (response.status === 401) {
            // Try to refresh the token
            try {
                const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
                if (refreshToken) {
                    const refreshResponse = await fetch(`${BASE_URL}/api/auth/refresh`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ refreshToken })
                    });
                    if (refreshResponse.ok) {
                        const data = await refreshResponse.json();
                        // Store the new token
                        if (localStorage.getItem('token')) {
                            localStorage.setItem('token', data.token);
                        } else {
                            sessionStorage.setItem('token', data.token);
                        }
                        // Retry the original request with new token
                        const newHeaders = { ...getAuthHeaders(), ...(options.headers || {}) };
                        response = await fetch(url, { ...options, headers: newHeaders });
                    }
                }
            } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
            }
        }
        return response;
    };

    useEffect(() => {
        if (authState.token) {
            fetchStocks();
            fetchItemTypes();
            fetchMeasurementUnits();
            fetchReleaseReasons();
        }
    }, [authState.token]);

    const fetchStocks = async () => {
        try {
            const response = await fetchWithAuth(API_URL);
            if (response.ok) {
                const data = await response.json();
                setStocks(data);
            } else if (response.status === 401) {
                console.error('Unauthorized: Token may be expired. Please log in again.');
                alert('Session expired. Please log in again.');
            } else {
                const errorText = await response.text();
                console.error('Failed to fetch stocks:', errorText);
            }
        } catch (error) {
            console.error('Error fetching stocks:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchItemTypes = async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/item-types`);
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
            const response = await fetchWithAuth(`${API_URL}/measurement-units`);
            if (response.ok) {
                const data = await response.json();
                setMeasurementUnits(data);
            }
        } catch (error) {
            console.error('Error fetching measurement units:', error);
        }
    };

    const fetchReleaseReasons = async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/release-reasons`);
            if (response.ok) {
                const data = await response.json();
                setReleaseReasons(data);
            }
        } catch (error) {
            console.error('Error fetching release reasons:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleRemoveExistingDocument = async (id, index) => {
        if (window.confirm('Are you sure you want to remove this document?')) {
            try {
                const response = await fetchWithAuth(`${API_URL}/${id}/document/${index}`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    setStocks(prev => prev.map(s => {
                        if (s.id === id) {
                            return { ...s, documentPaths: s.documentPaths.filter((_, i) => i !== index) };
                        }
                        return s;
                    }));
                    if (currentStock && currentStock.id === id) {
                        setCurrentStock(prev => ({
                            ...prev,
                            documentPaths: prev.documentPaths.filter((_, i) => i !== index)
                        }));
                    }
                } else {
                    alert('Failed to remove document');
                }
            } catch (error) {
                console.error('Error removing document:', error);
                alert('An error occurred while removing the document');
            }
        }
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
        if (name === 'documents') {
            const newFiles = Array.from(files);
            setDocumentFiles(prev => {
                // Filter out duplicates (optional but good for UX)
                const existingNames = prev.map(f => f.name);
                const uniqueNewFiles = newFiles.filter(f => !existingNames.includes(f.name));
                return [...prev, ...uniqueNewFiles];
            });
            // Reset input value to allow selecting same files again if needed
            e.target.value = '';
        } else if (name === 'anotherDocument') {
            setAnotherDocumentFile(files[0]);
        }
    };

    const handleRemoveNewDocument = (index) => {
        setDocumentFiles(prev => prev.filter((_, i) => i !== index));
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
        if (formData.receivedDate > today) {
            alert('Received Date cannot be in the future.');
            return;
        }
        if (formData.takenDate > today) {
            alert('Taken Date cannot be in the future.');
            return;
        }
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
                alert('Reason is required when item is released.');
                return;
            }
            if (!formData.releaseReason) {
                alert('Reason for Release is required.');
                return;
            }
/*
            const hasReleaseDoc = anotherDocumentFile || (currentStock && currentStock.anotherDocumentPath);
            if (!hasReleaseDoc) {
                alert('Release Document is required when item is released.');
                return;
            }
            */
            if (!formData.releasedItem) {
                alert('Please select which item was released.');
                return;
            }
            const qtyReleased = parseInt(formData.quantityReleased);
            if (!qtyReleased || qtyReleased <= 0) {
                alert('Quantity Released must be greater than zero.');
                return;
            }
            const maxQty = getMaxReleasedQuantity();
            if (qtyReleased > maxQty) {
                alert(`Quantity Released (${qtyReleased}) cannot exceed available quantity (${maxQty}).`);
                return;
            }
        }

        const hasSeizureDocs = documentFiles.length > 0 || (currentStock && currentStock.documentPaths && currentStock.documentPaths.length > 0);
        if (!hasSeizureDocs) {
            alert('At least one Seizure Document is mandatory.');
            return;
        }

        if (!formData.seizureReason || formData.seizureReason.trim() === '') {
            alert('Reason for taking items is required.');
            return;
        }

        const data = new FormData();

        const stockData = {
            ownerName: formData.ownerName,
            takeoverName: formData.takeoverName,
            seizureNumber: formData.seizureNumber,
            pvNumber: formData.pvNumber || null,
            takenDate: formData.takenDate || null,
            receivedDate: formData.receivedDate || null,
            seizureReason: formData.seizureReason || null,
            items: formData.items.map(item => {
                const category = item.item === 'OTHER' ? (item.newCategory || 'OTHER').toUpperCase() : item.item;
                return {
                    itemName: item.itemName,
                    item: category,
                    quantity: parseInt(item.quantity) || 0,
                    measurementUnit: item.measurementUnit,
                    plateNumber: category === 'VEHICLE' ? item.plateNumber : null,
                    chassisNumber: category === 'VEHICLE' ? item.chassisNumber : null,
                    vehicleType: category === 'VEHICLE' ? item.vehicleType : null
                };
            }),
            dateReleased: formData.dateReleased || null,
            releasedItem: formData.dateReleased ? (formData.releasedItem || null) : null,
            quantityReleased: formData.dateReleased ? (parseInt(formData.quantityReleased) || null) : null,
            soldAmount: formData.dateReleased && formData.releaseReason === 'CYAMUNARA' ? (parseFloat(formData.soldAmount) || null) : null,
            reason: formData.reason,
            releaseReason: formData.releaseReason,
            newPlateNumber: formData.releaseReason === 'MUTATION' ? formData.newPlateNumber : null,
            newOwner: formData.releaseReason === 'MUTATION' ? formData.newOwner : null,
            releasedBy: formData.dateReleased ? (localStorage.getItem('name') || sessionStorage.getItem('name') || authState.name || '') : null,
            addedBy: currentStock ? currentStock.addedBy : (localStorage.getItem('name') || sessionStorage.getItem('name') || authState.name || '')
        };

        data.append('stockData', new Blob([JSON.stringify(stockData)], { type: 'application/json' }));
        documentFiles.forEach(file => data.append('documents', file));
        if (anotherDocumentFile) data.append('anotherDocument', anotherDocumentFile);

        try {
            const url = currentStock ? `${API_URL}/${currentStock.id}` : API_URL;
            const method = currentStock ? 'PUT' : 'POST';

            const response = await fetchWithAuth(url, {
                method: method,
                body: data
            });

            if (response.ok) {
                const savedStock = await response.json();
                fetchStocks();
                closeModal();
                
                // If a release was just added during this submission (edit or create), auto-download the release note
                if (formData.dateReleased) {
                    downloadGeneratedReleaseDoc(savedStock.id);
                }
            } else if (response.status === 401) {
                alert('Session expired. Please log in again.');
            } else {
                const errorText = await response.text();
                console.error('Failed to save stock:', errorText);
                alert(errorText || 'Failed to save stock.');
            }
        } catch (error) {
            console.error('Error saving stock:', error);
            alert('Network error: Could not connect to the server.');
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
                measurementUnit: item.measurementUnit || (measurementUnits[0] || ''),
                plateNumber: item.plateNumber || '',
                chassisNumber: item.chassisNumber || '',
                vehicleType: item.vehicleType || ''
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
            seizureReason: stock.seizureReason || '',
            dateReleased: '',
            releasedItem: '',
            quantityReleased: '',
            soldAmount: '',
            reason: '',
            releaseReason: '',
            newPlateNumber: '',
            newOwner: ''
        });
        setDocumentFiles([]);
        setAnotherDocumentFile(null);
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
            seizureReason: '',
            dateReleased: '',
            releasedItem: '',
            quantityReleased: '',
            soldAmount: '',
            reason: '',
            releaseReason: '',
            newPlateNumber: '',
            newOwner: ''
        });
        setDocumentFiles([]);
        setAnotherDocumentFile(null);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setCurrentStock(null);
    };

    const downloadDocument = async (id, index) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/${id}/document/${index}`);

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

    const downloadGeneratedReleaseDoc = async (id) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/${id}/release-document`);

            if (response.ok) {
                const blob = await response.blob();
                const fileURL = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = fileURL;
                link.setAttribute('download', `ReleaseNote-${id}.pdf`);
                document.body.appendChild(link);
                link.click();
                link.parentNode.removeChild(link);
            } else {
                const errorText = await response.text();
                console.error('Release document error:', response.status, errorText);
                alert('Error generating release document: ' + errorText);
            }
        } catch (error) {
            console.error('Error generating document:', error);
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

    const getRemainingQuantity = (stock) => {
        const total = formatTotalQuantity(stock.items);
        const released = (stock.releases || []).reduce((sum, r) => sum + (r.amount || 0), 0);
        return total - released;
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
            if (releaseFilter === 'damaged' && stock.status !== 'DAMAGED') {
                return false;
            }
            return true;
        });
    }, [stocks, searchOwner, searchItemName, searchTakenDate, releaseFilter]);

    // --- Excel download ---
    const downloadExcel = () => {
        const excelData = filteredStocks.map(stock => {
            const data = {
                'Owner Name': stock.ownerName || '',
                'Takeover Name': stock.takeoverName || '',
                'Seizure Number': stock.seizureNumber || '',
                'PV Number': stock.pvNumber || '',
                'Items': (stock.items || []).map(i => `${i.itemName} (${i.quantity} ${i.measurementUnit})`).join(', '),
                'Item Types': (stock.items || []).map(i => i.item).join(', '),
                'Total Taken Qty': formatTotalQuantity(stock.items),
                'Remaining Qty': getRemainingQuantity(stock),
                'Taken Date': stock.takenDate || '',
                'Received Date': stock.receivedDate || ''
            };
            
            if (releaseFilter !== 'not_released') {
                data['Date Released'] = stock.dateReleased || '';
                data['Released Item'] = stock.releasedItem || '';
                data['Quantity Released'] = stock.quantityReleased || '';
                data['Sold Amount'] = stock.soldAmount || '';
                data['Reason'] = stock.reason || '';
            }
            return data;
        });

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
                    <option value="damaged">Damaged</option>
                </select>

                {isFilterActive && (
                    <>
                        <button className="clear-filters-btn" onClick={clearAllFilters} title="Clear all filters">
                            <X size={16} /> Clear
                        </button>
                        <button className="download-excel-btn" onClick={downloadExcel} title="Download filtered list as report">
                            <FileSpreadsheet size={16} /> Report
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
                                <th>Rem. Qty</th>
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
                                    <td colSpan="8" className="no-results">No stock items found matching your criteria.</td>
                                </tr>
                            ) : (
                                filteredStocks.map(stock => (
                                    <tr key={stock.id}>
                                        <td>{stock.ownerName}</td>
                                        <td title={(stock.items || []).map(i => `${i.itemName} (${i.item})`).join(', ')}>
                                            {formatItemsDisplay(stock.items)}
                                        </td>
                                        <td>{getRemainingQuantity(stock)}</td>
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
                                            {stock.documentPaths && stock.documentPaths.map((path, idx) => (
                                                <button key={idx} className="link-btn" onClick={() => downloadDocument(stock.id, idx)}>Doc {idx + 1}</button>
                                            ))}
                                        </td>
                                        <td className="actions-cell">
                                            <button className="icon-btn edit-btn" onClick={() => openEditModal(stock)} title="Edit">
                                                <Edit size={18} />
                                            </button>
                                            <button className="icon-btn delete-btn" onClick={() => handleDelete(stock.id)} title="Delete">
                                                <Trash2 size={18} />
                                            </button>
                                            <button 
                                                className="icon-btn download-btn" 
                                                onClick={() => stock.dateReleased ? downloadGeneratedReleaseDoc(stock.id) : generateStockPdf(stock)} 
                                                title={stock.dateReleased ? "Download Release Note" : "Download Stock Info"}
                                            >
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
                    <div class="modal-content">
                        <h3>{currentStock ? 'Edit Stock' : 'Add New Stock'}</h3>
                        {currentStock && currentStock.addedBy && (
                            <p className="added-by-info">Added by: <strong>{currentStock.addedBy}</strong></p>
                        )}
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
                                    <label>PV Number</label>
                                    <input type="text" name="pvNumber" value={formData.pvNumber || ''} onChange={handleInputChange} />
                                </div>
                                <div className="form-group">
                                    <label>Taken Date *</label>
                                    <input type="date" name="takenDate" value={formData.takenDate || ''} onChange={handleInputChange} max={today} required />
                                </div>
                                <div className="form-group">
                                    <label>Received Date *</label>
                                    <input type="date" name="receivedDate" value={formData.receivedDate || ''} onChange={handleInputChange} min={formData.takenDate} max={today} required />
                                </div>
                                <div className="form-group full-width">
                                    <label>Upload Documents (PDF) *</label>
                                    <input type="file" name="documents" accept=".pdf" onChange={handleFileChange} multiple />
                                    
                                    {/* Existing Stored Documents */}
                                    {currentStock && currentStock.documentPaths && currentStock.documentPaths.length > 0 && (
                                        <div className="document-list" style={{ marginTop: '10px' }}>
                                            <small style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Existing Documents:</small>
                                            {currentStock.documentPaths.map((path, idx) => (
                                                <div key={idx} className="document-item">
                                                    <span>{path.split(/[\/\\]/).pop()}</span>
                                                    <button type="button" className="remove-doc-btn" onClick={() => handleRemoveExistingDocument(currentStock.id, idx)}>
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {documentFiles.length > 0 && (
                                        <div className="document-list" style={{ marginTop: '10px' }}>
                                            {documentFiles.map((file, idx) => (
                                                <div key={idx} className="document-item new-file">
                                                    <span>{file.name}</span>
                                                    <button type="button" className="remove-doc-btn" onClick={() => handleRemoveNewDocument(idx)}>
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="form-group full-width">
                                    <label>Reason for Taking Items *</label>
                                    <textarea name="seizureReason" value={formData.seizureReason || ''} onChange={handleInputChange} placeholder="Explain why the items were seized/taken..." required />
                                </div>
                            </div>

                            {/* Items Section */}
                            <div className="items-section">
                                <h4>Items *</h4>
                                {formData.items.map((item, index) => (
                                    <div key={index} className="item-row">
                                        <div className="item-fields-container">
                                            <div className="item-main-row">
                                                <div className="item-field">
                                                    <label>Item Category *</label>
                                                    <select
                                                        value={item.item}
                                                        onChange={(e) => handleItemChange(index, 'item', e.target.value)}
                                                        required
                                                    >
                                                        <option value="">Select Category</option>
                                                        {itemTypes.map(type => (
                                                            <option key={type} value={type}>{formatUnit(type)}</option>
                                                        ))}
                                                        <option value="OTHER">OTHER (Add New...)</option>
                                                    </select>
                                                </div>
                                                {item.item === 'OTHER' && (
                                                    <div className="item-field">
                                                        <label>New Category Name *</label>
                                                        <input
                                                            type="text"
                                                            value={item.newCategory || ''}
                                                            onChange={(e) => handleItemChange(index, 'newCategory', e.target.value)}
                                                            required
                                                            placeholder="Enter category name..."
                                                        />
                                                    </div>
                                                )}
                                                <div className="item-field">
                                                    <label>Item Name *</label>
                                                    <input
                                                        type="text"
                                                        value={item.itemName}
                                                        onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                                                        required
                                                    />
                                                </div>
                                                {item.item === 'VEHICLE' && (
                                                    <>
                                                        <div className="item-field">
                                                            <label>Vehicle Type *</label>
                                                            <select
                                                                value={item.vehicleType}
                                                                onChange={(e) => handleItemChange(index, 'vehicleType', e.target.value)}
                                                                required
                                                            >
                                                                <option value="">Select Type</option>
                                                                <option value="CAR">Car</option>
                                                                <option value="MOTO">Moto Vehicle</option>
                                                                <option value="TRUCK">Truck</option>
                                                                <option value="VAN">Van</option>
                                                                <option value="OTHER">Other</option>
                                                            </select>
                                                        </div>
                                                        <div className="item-field">
                                                            <label>Plate Number *</label>
                                                            <input
                                                                type="text"
                                                                value={item.plateNumber}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                                                                    if (val.length <= 7) {
                                                                        handleItemChange(index, 'plateNumber', val);
                                                                    }
                                                                }}
                                                                placeholder="AAA123A"
                                                                required
                                                            />
                                                            <small>Format: 3 chars, 3 nums, 1 char</small>
                                                        </div>
                                                        <div className="item-field">
                                                            <label>Chassis Number *</label>
                                                            <input
                                                                type="text"
                                                                value={item.chassisNumber}
                                                                onChange={(e) => handleItemChange(index, 'chassisNumber', e.target.value.toUpperCase())}
                                                                placeholder="Enter Chassis Number"
                                                                required
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            <div className="item-sub-row">
                                                <div className="item-field quantity-field">
                                                    <label>Quantity *</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                        required
                                                    />
                                                </div>
                                                <div className="item-field measurement-field">
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
                                    </div>
                                ))}
                                <button type="button" className="add-item-btn" onClick={addItem}>
                                    <Plus size={16} /> Add Another Item
                                </button>
                            </div>

                            {/* Release Section */}
                            <div className="release-section" style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                                <div className="form-group" style={{ marginBottom: '15px', flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                                    <input
                                        type="checkbox"
                                        id="releaseCheckbox"
                                        checked={!!formData.dateReleased}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setFormData(prev => ({ ...prev, dateReleased: new Date().toISOString().split('T')[0] }));
                                            } else {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    dateReleased: '',
                                                    releasedItem: '',
                                                    quantityReleased: '',
                                                    soldAmount: '',
                                                    reason: '',
                                                    releaseReason: ''
                                                }));
                                            }
                                        }}
                                        style={{ width: 'auto', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="releaseCheckbox" style={{ cursor: 'pointer', marginBottom: 0 }}>Do you want to release an item?</label>
                                </div>

                                {formData.dateReleased && (
                                    <div className="form-grid">
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
                                                {formData.items.filter(i => {
                                                    if (!i.itemName) return false;
                                                    // Exclude items that have already been released
                                                    const alreadyReleased = (currentStock?.releases || []).map(r => r.releasedItemName);
                                                    return !alreadyReleased.includes(i.itemName);
                                                }).map((item, idx) => (
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
                                            <label>Reason for Release *</label>
                                            <select
                                                name="releaseReason"
                                                value={formData.releaseReason || ''}
                                                onChange={handleInputChange}
                                                required
                                            >
                                                <option value="">Select Reason</option>
                                                {releaseReasons.map(r => (
                                                    <option key={r} value={r}>{formatUnit(r)}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {formData.releaseReason === 'CYAMUNARA' && (
                                            <div className="form-group">
                                                <label>Sold Amount (RWF) *</label>
                                                <input
                                                    type="number"
                                                    name="soldAmount"
                                                    min="0"
                                                    step="0.01"
                                                    value={formData.soldAmount || ''}
                                                    onChange={handleInputChange}
                                                    required
                                                    placeholder="Enter sold amount"
                                                />
                                            </div>
                                        )}
                                        {formData.releaseReason === 'MUTATION' && (
                                            <>
                                                <div className="form-group">
                                                    <label>New Plate Number *</label>
                                                    <input
                                                        type="text"
                                                        name="newPlateNumber"
                                                        value={formData.newPlateNumber || ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                                                            if (val.length <= 7) {
                                                                setFormData(prev => ({ ...prev, newPlateNumber: val }));
                                                            }
                                                        }}
                                                        placeholder="AAA123A"
                                                        required
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>New Owner *</label>
                                                    <input
                                                        type="text"
                                                        name="newOwner"
                                                        value={formData.newOwner || ''}
                                                        onChange={handleInputChange}
                                                        placeholder="Enter New Owner Name"
                                                        required
                                                    />
                                                </div>
                                            </>
                                        )}
                                        <div className="form-group full-width">
                                            <label>Release Details / Remarks *</label>
                                            <textarea
                                                name="reason"
                                                value={formData.reason || ''}
                                                onChange={handleInputChange}
                                                required
                                                placeholder="Enter any additional details about the release..."
                                            />
                                        </div>
                                    </div>
                                )}
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
