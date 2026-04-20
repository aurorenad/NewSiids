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
        seizureReasonCategory: '',
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
    const [paymentProofFile, setPaymentProofFile] = useState(null);

    // Backend-driven dropdown options
    const [itemTypes, setItemTypes] = useState([]);
    const [measurementUnits, setMeasurementUnits] = useState([]);
    const [releaseReasons, setReleaseReasons] = useState([]);
    const [seizureReasons, setSeizureReasons] = useState([]);
    const [isAddingNewSeizureReason, setIsAddingNewSeizureReason] = useState(false);

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
            fetchSeizureReasons();
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

    const fetchSeizureReasons = async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/seizure-reasons`);
            if (response.ok) {
                const data = await response.json();
                setSeizureReasons(data);
            }
        } catch (error) {
            console.error('Error fetching seizure reasons:', error);
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

    const getItemRemainingQuantity = (itemName) => {
        const item = formData.items.find(i => i.itemName === itemName);
        if (!item) return 0;
        const total = parseInt(item.quantity) || 0;
        
        // Sum up quantities from past releases for this specific item
        const released = (currentStock?.releases || [])
            .filter(r => r.releasedItemName === itemName || r.releasedItemName === 'ALL')
            .reduce((sum, r) => sum + (parseInt(r.quantityReleased) || 0), 0);
            
        return Math.max(0, total - released);
    };

    const getMaxReleasedQuantity = () => {
        if (!formData.releasedItem || formData.releasedItem === 'ALL') {
             const total = getTotalQuantity();
             const released = (currentStock?.releases || []).reduce((sum, r) => sum + (parseInt(r.quantityReleased) || 0), 0);
             return Math.max(0, total - released);
        }
        return getItemRemainingQuantity(formData.releasedItem);
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

        if (!formData.seizureReasonCategory || formData.seizureReasonCategory.trim() === '') {
            alert('Reason for taking item is required.');
            return;
        }

        if (!formData.seizureReason || formData.seizureReason.trim() === '') {
            alert('Details for taking item(s) is required.');
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
            seizureReasonCategory: formData.seizureReasonCategory || null,
            items: formData.items.map(item => {
                const category = item.item === 'OTHER' ? (item.newCategory || 'OTHER').toUpperCase() : item.item;
                const unit = item.measurementUnit === 'OTHER' ? (item.newUnit || 'OTHER').toUpperCase() : item.measurementUnit;
                return {
                    itemName: item.itemName,
                    item: category,
                    quantity: parseInt(item.quantity) || 0,
                    measurementUnit: unit,
                    plateNumber: category === 'VEHICLE' ? item.plateNumber : null,
                    chassisNumber: category === 'VEHICLE' ? item.chassisNumber : null,
                    vehicleType: category === 'VEHICLE' ? item.vehicleType : null
                };
            }),
            releases: [
                ...(currentStock?.releases || []),
                ...(formData.dateReleased ? [{
                    dateReleased: formData.dateReleased,
                    releasedItemName: formData.releasedItem,
                    quantityReleased: parseInt(formData.quantityReleased) || null,
                    soldAmount: formData.releaseReason === 'CYAMUNARA' ? (parseFloat(formData.soldAmount) || null) : null,
                    reason: formData.reason,
                    releaseReason: formData.releaseReason,
                    newPlateNumber: formData.releaseReason === 'MUTATION' ? formData.newPlateNumber : null,
                    newOwner: formData.releaseReason === 'MUTATION' ? formData.newOwner : null,
                    releasedBy: localStorage.getItem('name') || sessionStorage.getItem('name') || authState.name || ''
                }] : [])
            ],
            addedBy: currentStock ? currentStock.addedBy : (localStorage.getItem('name') || sessionStorage.getItem('name') || authState.name || '')
        };

        data.append('stockData', new Blob([JSON.stringify(stockData)], { type: 'application/json' }));
        documentFiles.forEach(file => data.append('documents', file));
        if (anotherDocumentFile) data.append('anotherDocument', anotherDocumentFile);
        if (paymentProofFile) data.append('paymentProof', paymentProofFile);

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
                    downloadGeneratedReleaseDoc(savedStock.id, (savedStock.releases?.length || 1) - 1);
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
            seizureReasonCategory: stock.seizureReasonCategory || '',
            dateReleased: '',
            releasedItem: '',
            quantityReleased: '',
            soldAmount: '',
            reason: '',
            releaseReason: '',
            newPlateNumber: '',
            newOwner: ''
        });
        setIsAddingNewSeizureReason(false);
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
            seizureReasonCategory: '',
            dateReleased: '',
            releasedItem: '',
            quantityReleased: '',
            soldAmount: '',
            reason: '',
            releaseReason: '',
            newPlateNumber: '',
            newOwner: ''
        });
        setIsAddingNewSeizureReason(false);
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

    const downloadGeneratedReleaseDoc = async (id, index = 0) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/${id}/release-document/${index}`);

            if (response.ok) {
                const blob = await response.blob();
                const fileURL = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = fileURL;
                link.setAttribute('download', `ReleaseNote-${id}-Release${index + 1}.pdf`);
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
        let releasedTotal = (stock.releases || []).reduce((sum, r) => sum + (parseInt(r.quantityReleased) || 0), 0);
        
        // Handle legacy data: if no releases but there's a legacy quantityReleased
        if (releasedTotal === 0 && stock.quantityReleased) {
            releasedTotal = parseInt(stock.quantityReleased) || 0;
        }
        
        return Math.max(0, total - releasedTotal);
    };

    // --- Filtering logic ---
    const getStockItemRemainingQuantity = (stock, itemName) => {
        const item = (stock.items || []).find(i => i.itemName === itemName);
        if (!item) return 0;
        const total = parseInt(item.quantity) || 0;
        let releasedForThisItem = (stock.releases || [])
            .filter(r => r.releasedItemName === itemName || r.releasedItemName === 'ALL')
            .reduce((sum, r) => sum + (parseInt(r.quantityReleased) || 0), 0);
            
        // Handle legacy data
        if (releasedForThisItem === 0 && stock.quantityReleased) {
            if (stock.releasedItem === itemName || stock.releasedItem === 'ALL' || !stock.releasedItem) {
                releasedForThisItem = parseInt(stock.quantityReleased) || 0;
            }
        }

        return Math.max(0, total - releasedForThisItem);
    };

    const isFilterActive = searchOwner || searchItemName || searchTakenDate || releaseFilter !== 'all';

    const filteredStocks = useMemo(() => {
        return stocks.map(stock => {
            if (searchOwner && !(stock.ownerName || '').toLowerCase().includes(searchOwner.toLowerCase())) return null;
            
            if (searchItemName) {
                const itemNames = (stock.items || []).map(i => (i.itemName || '').toLowerCase()).join(' ');
                if (!itemNames.includes(searchItemName.toLowerCase())) return null;
            }
            
            if (searchTakenDate && stock.takenDate !== searchTakenDate) return null;
            
            let filteredItems = [...(stock.items || [])];
            
            if (releaseFilter === 'released') {
                filteredItems = filteredItems.filter(item => {
                    const remaining = getStockItemRemainingQuantity(stock, item.itemName);
                    const original = parseInt(item.quantity) || 0;
                    return remaining < original || stock.dateReleased; // It has some released quantity or legacy flag
                });
            } else if (releaseFilter === 'not_released') {
                filteredItems = filteredItems.filter(item => {
                    const remaining = getStockItemRemainingQuantity(stock, item.itemName);
                    const original = parseInt(item.quantity) || 0;
                    return remaining === original && !stock.dateReleased; // It has ZERO releases computationally
                });
            } else if (releaseFilter === 'damaged') {
                filteredItems = filteredItems.filter(item => {
                    const hasDamagedRelease = (stock.releases || []).some(r => 
                        r.releaseReason === 'DAMAGED' && (r.releasedItemName === item.itemName || r.releasedItemName === 'ALL')
                    );
                    return hasDamagedRelease || stock.status === 'DAMAGED';
                });
            }
            
            if (releaseFilter !== 'all' && filteredItems.length === 0) {
                return null;
            }
            
            return {
                ...stock,
                displayItems: filteredItems
            };
        }).filter(Boolean);
    }, [stocks, searchOwner, searchItemName, searchTakenDate, releaseFilter]);

    // --- Excel download ---
    const downloadExcel = () => {
        const excelData = filteredStocks.map(stock => {
            const relevantItems = stock.displayItems || stock.items;
            
            // Deduplicate item names and types
            const uniqueItemNames = [...new Set((relevantItems || []).map(i => i.itemName))];
            const uniqueItemTypes = [...new Set((relevantItems || []).map(i => i.item))];

            const data = {
                'Owner Name': stock.ownerName || '',
                'Takeover Name': stock.takeoverName || '',
                'Seizure Number': stock.seizureNumber || '',
                'PV Number': stock.pvNumber || '',
                'Items': uniqueItemNames.map(name => {
                    const item = (relevantItems || []).find(i => i.itemName === name);
                    return `${name} (${item.quantity} ${item.measurementUnit})`;
                }).join(', '),
                'Item Types': uniqueItemTypes.join(', '),
                'Total Taken Qty': formatTotalQuantity(stock.items), // Always show full stock total
                'Remaining Qty': getRemainingQuantity(stock),
                'Taken Date': stock.takenDate || '',
                'Received Date': stock.receivedDate || ''
            };
            
            if (releaseFilter === 'damaged') {
                const damagedReleases = (stock.releases || []).filter(r => 
                    r.releaseReason === 'DAMAGED' && 
                    ((relevantItems || []).some(i => i.itemName === r.releasedItemName) || r.releasedItemName === 'ALL')
                );
                const uniqueDamagedNames = [...new Set(damagedReleases.map(r => r.releasedItemName))];
                data['Damaged Items'] = uniqueDamagedNames.length > 0 ? uniqueDamagedNames.join(', ') : (stock.status === 'DAMAGED' ? 'ALL' : '');
                data['Damaged Qty'] = damagedReleases.length > 0 ? damagedReleases.reduce((sum, r) => sum + (parseInt(r.quantityReleased) || 0), 0) : (stock.status === 'DAMAGED' ? formatTotalQuantity(stock.items) : '');
                data['Reason for release'] = 'DAMAGED';
            } else if (releaseFilter !== 'not_released' && releaseFilter !== 'all') {
                const releasedNames = [...new Set((stock.releases || []).map(r => r.releasedItemName))];
                data['Date Released'] = stock.dateReleased || (stock.releases && stock.releases.length > 0 ? stock.releases[0].dateReleased : '');
                data['Released Item'] = stock.releasedItem || (stock.releases && stock.releases.length > 0 ? releasedNames.join(', ') : '');
                data['Quantity Released'] = stock.quantityReleased || (stock.releases && stock.releases.length > 0 ? stock.releases.reduce((sum, r) => sum + (parseInt(r.quantityReleased) || 0), 0) : '');
                data['Sold Amount'] = stock.soldAmount || (stock.releases && stock.releases.length > 0 ? stock.releases.reduce((sum, r) => sum + (parseFloat(r.soldAmount) || 0), 0) : '');
                data['Reason for release'] = stock.releaseReason || (stock.releases && stock.releases.length > 0 ? stock.releases[0].releaseReason : '');
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
            addField('Reason for release', stock.releaseReason || stock.reason);
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
                                        <td title={((stock.displayItems || stock.items) || []).map(i => `${i.itemName} (${i.item})`).join(', ')}>
                                            {formatItemsDisplay(stock.displayItems || stock.items)}
                                        </td>
                                        <td>{getRemainingQuantity(stock)}</td>
                                        <td>{stock.takenDate}</td>
                                        <td>
                                            {stock.releases && stock.releases.length > 0 ? (
                                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                                    {stock.releases.map((r, i) => (
                                                        <div key={i} style={{display: 'flex', flexDirection: 'column'}}>
                                                            <span className="released-badge" style={{fontSize: '0.75rem', padding: '2px 6px'}}>{r.dateReleased}</span>
                                                            {r.status === 'REJECTED' && <span style={{fontSize: '0.7rem', color: 'red'}}>REJECTED: {r.rejectionReason}</span>}
                                                            {(!r.status || r.status === 'PENDING') && <span style={{fontSize: '0.7rem', color: 'orange'}}>PENDING</span>}
                                                            {r.status === 'APPROVED' && <span style={{fontSize: '0.7rem', color: 'green'}}>APPROVED</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : stock.dateReleased ? (
                                                <div style={{display: 'flex', flexDirection: 'column'}}>
                                                    <span className="released-badge">{stock.dateReleased}</span>
                                                    {stock.status === 'REJECTED' && <span style={{fontSize: '0.7rem', color: 'red'}}>REJECTED</span>}
                                                </div>
                                            ) : (
                                                <span className="not-released-badge">Not Released</span>
                                            )}
                                        </td>
                                        <td>
                                            {stock.releases && stock.releases.length > 0 ? (
                                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                                    {stock.releases.map((r, i) => <div key={i}>{r.quantityReleased}</div>)}
                                                </div>
                                            ) : stock.quantityReleased || '-'}
                                        </td>
                                        <td>
                                            {stock.releases && stock.releases.length > 0 ? (
                                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                                    {stock.releases.map((r, i) => <div key={i}>{r.soldAmount ? `${r.soldAmount} RWF` : '-'}</div>)}
                                                </div>
                                            ) : stock.soldAmount ? `${stock.soldAmount} RWF` : '-'}
                                        </td>
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
                                            
                                            {stock.releases && stock.releases.length > 0 ? (
                                                <div style={{display: 'flex', flexDirection: 'column', gap: '2px'}}>
                                                    {stock.releases.map((r, i) => (
                                                        r.status === 'APPROVED' ? (
                                                            <button key={i} className="icon-btn download-btn" onClick={() => downloadGeneratedReleaseDoc(stock.id, i)} title={`Download Release ${i + 1}`}>
                                                                <Download size={16} /><span style={{fontSize: '9px', fontWeight:'bold'}}>{i+1}</span>
                                                            </button>
                                                        ) : (
                                                            <span key={i} style={{fontSize: '10px', color: 'gray'}}>
                                                                {r.status || 'PENDING'}
                                                            </span>
                                                        )
                                                    ))}
                                                </div>
                                            ) : stock.dateReleased ? (
                                                <button className="icon-btn download-btn" onClick={() => downloadGeneratedReleaseDoc(stock.id)} title="Download Release Note">
                                                    <Download size={18} />
                                                </button>
                                            ) : (
                                                <button className="icon-btn download-btn" onClick={() => generateStockPdf(stock)} title="Download Stock Info">
                                                    <Download size={18} />
                                                </button>
                                            )}
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
                                    <input type="text" name="ownerName" value={formData.ownerName || ''} onChange={handleInputChange} disabled={currentStock?.releases?.length > 0} required />
                                </div>
                                <div className="form-group">
                                    <label>Takeover Name *</label>
                                    <input type="text" name="takeoverName" value={formData.takeoverName || ''} onChange={handleInputChange} disabled={currentStock?.releases?.length > 0} required />
                                </div>
                                <div className="form-group">
                                    <label>Seizure Number *</label>
                                    <input type="text" name="seizureNumber" value={formData.seizureNumber || ''} onChange={handleInputChange} disabled={currentStock?.releases?.length > 0} required />
                                </div>
                                <div className="form-group">
                                    <label>PV Number</label>
                                    <input type="text" name="pvNumber" value={formData.pvNumber || ''} onChange={handleInputChange} disabled={currentStock?.releases?.length > 0} />
                                </div>
                                <div className="form-group">
                                    <label>Taken Date *</label>
                                    <input type="date" name="takenDate" value={formData.takenDate || ''} onChange={handleInputChange} max={today} disabled={currentStock?.releases?.length > 0} required />
                                </div>
                                <div className="form-group">
                                    <label>Received Date *</label>
                                    <input type="date" name="receivedDate" value={formData.receivedDate || ''} onChange={handleInputChange} min={formData.takenDate} max={today} disabled={currentStock?.releases?.length > 0} required />
                                </div>
                                <div className="form-group full-width">
                                    <label>Upload Documents (PDF) *</label>
                                    <input type="file" name="documents" accept=".pdf" onChange={handleFileChange} multiple disabled={currentStock?.releases?.length > 0} />
                                    
                                    {/* Existing Stored Documents */}
                                    {currentStock && currentStock.documentPaths && currentStock.documentPaths.length > 0 && (
                                        <div className="document-list" style={{ marginTop: '10px' }}>
                                            <small style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Existing Documents:</small>
                                            {currentStock.documentPaths.map((path, idx) => (
                                                <div key={idx} className="document-item">
                                                    <span>{path.split(/[\/\\]/).pop()}</span>
                                                    <button type="button" className="remove-doc-btn" onClick={() => handleRemoveExistingDocument(currentStock.id, idx)} disabled={currentStock?.releases?.length > 0}>
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
                                                    <button type="button" className="remove-doc-btn" onClick={() => handleRemoveNewDocument(idx)} disabled={currentStock?.releases?.length > 0}>
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label>Reason for taking item *</label>
                                    <select
                                        name="seizureReasonCategory"
                                        value={isAddingNewSeizureReason ? 'OTHER' : (formData.seizureReasonCategory || '')}
                                        onChange={(e) => {
                                            if (e.target.value === 'OTHER') {
                                                setIsAddingNewSeizureReason(true);
                                                setFormData(prev => ({ ...prev, seizureReasonCategory: '' }));
                                            } else {
                                                setIsAddingNewSeizureReason(false);
                                                setFormData(prev => ({ ...prev, seizureReasonCategory: e.target.value }));
                                            }
                                        }}
                                        disabled={currentStock?.releases?.length > 0}
                                        required
                                    >
                                        <option value="">Select Reason</option>
                                        {seizureReasons.map(r => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                        {!seizureReasons.includes('SMUGGLING') && <option value="SMUGGLING">SMUGGLING</option>}
                                        <option value="OTHER">OTHER (Add New...)</option>
                                    </select>
                                </div>
                                {isAddingNewSeizureReason && (
                                    <div className="form-group">
                                        <label>New Reason Name *</label>
                                        <input
                                            type="text"
                                            value={formData.seizureReasonCategory || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, seizureReasonCategory: e.target.value.toUpperCase() }))}
                                            placeholder="Enter new reason..."
                                            disabled={currentStock?.releases?.length > 0}
                                            required
                                        />
                                    </div>
                                )}
                                <div className="form-group full-width">
                                    <label>Details for taking item(s) *</label>
                                    <textarea name="seizureReason" value={formData.seizureReason || ''} onChange={handleInputChange} placeholder="Explain why the items were seized/taken..." disabled={currentStock?.releases?.length > 0} required />
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
                                                        disabled={currentStock?.releases?.length > 0}
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
                                                            disabled={currentStock?.releases?.length > 0}
                                                            required
                                                            placeholder="Enter category name..."
                                                        />
                                                    </div>
                                                )}
                                                {item.item === 'VEHICLE' && (
                                                    <div className="item-field">
                                                        <label>Vehicle Type *</label>
                                                        <select
                                                            value={item.vehicleType}
                                                            onChange={(e) => handleItemChange(index, 'vehicleType', e.target.value)}
                                                            disabled={currentStock?.releases?.length > 0}
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
                                                )}

                                                <div className="item-field">
                                                    <label>Item Name *</label>
                                                    <input
                                                        type="text"
                                                        value={item.itemName}
                                                        onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                                                        disabled={currentStock?.releases?.length > 0}
                                                        required
                                                        placeholder={item.item === 'VEHICLE' ? "Enter Vehicle Model/Brand (e.g. Toyota Hilux)" : "Enter Item Name"}
                                                    />
                                                </div>
                                            </div>

                                            {item.item === 'VEHICLE' && (
                                                <div className="item-main-row">
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
                                                            disabled={currentStock?.releases?.length > 0}
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
                                                            disabled={currentStock?.releases?.length > 0}
                                                            placeholder="Enter Chassis Number"
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="item-sub-row">
                                                <div className="item-field quantity-field">
                                                    <label>Quantity *</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                        disabled={currentStock?.releases?.length > 0}
                                                        required
                                                    />
                                                </div>
                                                <div className="item-field measurement-field">
                                                    <label>Measurement *</label>
                                                    <select
                                                        value={item.measurementUnit}
                                                        onChange={(e) => handleItemChange(index, 'measurementUnit', e.target.value)}
                                                        disabled={currentStock?.releases?.length > 0}
                                                        required
                                                    >
                                                        <option value="">Select Unit</option>
                                                        {measurementUnits.map(unit => (
                                                            <option key={unit} value={unit}>{formatUnit(unit)}</option>
                                                        ))}
                                                        <option value="OTHER">OTHER (Add New...)</option>
                                                    </select>
                                                </div>
                                                {item.measurementUnit === 'OTHER' && (
                                                    <div className="item-field">
                                                        <label>New Unit *</label>
                                                        <input
                                                            type="text"
                                                            value={item.newUnit || ''}
                                                            onChange={(e) => handleItemChange(index, 'newUnit', e.target.value)}
                                                            disabled={currentStock?.releases?.length > 0}
                                                            required
                                                            placeholder="Enter unit..."
                                                        />
                                                    </div>
                                                )}
                                                {formData.items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        className="remove-item-btn"
                                                        onClick={() => removeItem(index)}
                                                        disabled={currentStock?.releases?.length > 0}
                                                        title="Remove this item"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {!(currentStock?.releases?.length > 0) && (
                                    <button type="button" className="add-item-btn" onClick={addItem}>
                                        <Plus size={16} /> Add Another Item
                                    </button>
                                )}
                            </div>

                            {/* Existing Releases Section */}
                            {currentStock && currentStock.releases && currentStock.releases.length > 0 && (
                                <div className="existing-releases-section" style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                                    <h4 style={{marginBottom: '10px'}}>Past Releases</h4>
                                    <table className="content-table" style={{width: '100%', fontSize: '13px', borderCollapse: 'collapse'}}>
                                        <thead>
                                            <tr>
                                                <th style={{padding: '8px', borderBottom: '2px solid #ddd', textAlign: 'left'}}>Date</th>
                                                <th style={{padding: '8px', borderBottom: '2px solid #ddd', textAlign: 'left'}}>Item</th>
                                                <th style={{padding: '8px', borderBottom: '2px solid #ddd', textAlign: 'left'}}>Qty</th>
                                                <th style={{padding: '8px', borderBottom: '2px solid #ddd', textAlign: 'left'}}>Reason</th>
                                                <th style={{padding: '8px', borderBottom: '2px solid #ddd', textAlign: 'left'}}>By</th>
                                                <th style={{padding: '8px', borderBottom: '2px solid #ddd', textAlign: 'left'}}>Proof</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentStock.releases.map((r, i) => (
                                                <tr key={i}>
                                                    <td style={{padding: '8px', borderBottom: '1px solid #eee'}}>{r.dateReleased}</td>
                                                    <td style={{padding: '8px', borderBottom: '1px solid #eee'}}>{r.releasedItemName}</td>
                                                    <td style={{padding: '8px', borderBottom: '1px solid #eee'}}>{r.quantityReleased}</td>
                                                    <td style={{padding: '8px', borderBottom: '1px solid #eee'}}>
                                                        <div>{r.releaseReason}</div>
                                                        <div style={{fontSize: '10px', color: r.status === 'APPROVED' ? 'green' : (r.status === 'REJECTED' ? 'red' : 'orange')}}>
                                                            {r.status || 'PENDING'}
                                                            {r.status === 'REJECTED' && ` - ${r.rejectionReason}`}
                                                        </div>
                                                    </td>
                                                    <td style={{padding: '8px', borderBottom: '1px solid #eee'}}>{r.releasedBy}</td>
                                                    <td style={{padding: '8px', borderBottom: '1px solid #eee'}}>
                                                        {r.paymentProofPath ? (
                                                            <button 
                                                                type="button" 
                                                                className="link-btn" 
                                                                style={{padding:0, fontSize:'12px', border:'none', background:'none', color:'rgb(0, 112, 192)', cursor:'pointer', textDecoration:'underline'}} 
                                                                onClick={() => {
                                                                    fetchWithAuth(`${API_URL}/${currentStock.id}/payment-proof/${i}`)
                                                                    .then(res => res.blob())
                                                                    .then(blob => window.open(window.URL.createObjectURL(blob), '_blank'));
                                                                }}
                                                            >View</button>
                                                        ) : '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Release Section (For Adding New) */}
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
                                    <label htmlFor="releaseCheckbox" style={{ cursor: 'pointer', marginBottom: 0, fontWeight: 'bold' }}>Add a new partial release of items?</label>
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
                                                {(() => {
                                                    // Determine if ALL items have any remaining balance
                                                    const total = getTotalQuantity();
                                                    const released = (currentStock?.releases || []).reduce((sum, r) => sum + (parseInt(r.quantityReleased) || 0), 0);
                                                    const allRemaining = Math.max(0, total - released);
                                                    return allRemaining > 0 ? <option value="ALL">All Items</option> : null;
                                                })()}
                                                {formData.items.filter(i => {
                                                    if (!i.itemName) return false;
                                                    // Exclude items that have no remaining quantity left
                                                    return getItemRemainingQuantity(i.itemName) > 0;
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
                                        {formData.releaseReason === 'CLEARED' && (
                                            <div className="form-group" style={{gridColumn: '1 / -1'}}>
                                                <label>Upload Payment Proof *</label>
                                                <input
                                                    type="file"
                                                    onChange={(e) => setPaymentProofFile(e.target.files[0])}
                                                    accept=".pdf, image/*"
                                                    required
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
