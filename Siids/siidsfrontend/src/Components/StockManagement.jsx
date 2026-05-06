import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { jsPDF } from 'jspdf';
import { Edit, Trash2, Download, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import '../styles/StockManagement.css';
import {
    Box, Typography, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, MenuItem, Select,
    FormControl, IconButton, Chip, Tooltip, CircularProgress,
    InputAdornment,
} from '@mui/material';
import { FilterListOff, FileDownloadOutlined } from '@mui/icons-material';


const StockManagement = () => {
    const { authState } = useContext(AuthContext);
    const today = useMemo(() => new Date().toISOString().split('T')[0], []);
    const [stocks, setStocks] = useState([]);
    const [loading, setLoading] = useState(true);

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
                    const hasApprovedRelease = (stock.releases || []).some(r => 
                        r.status === 'APPROVED' && (r.releasedItemName === item.itemName || r.releasedItemName === 'ALL')
                    );
                    const hasLegacyApprovedRelease = (!stock.releases || stock.releases.length === 0) && stock.dateReleased && stock.status !== 'REJECTED' && stock.status !== 'PENDING';
                    
                    return hasApprovedRelease || hasLegacyApprovedRelease;
                });
            } else if (releaseFilter === 'not_released') {
                filteredItems = filteredItems.filter(item => {
                    const hasApprovedRelease = (stock.releases || []).some(r => 
                        r.status === 'APPROVED' && (r.releasedItemName === item.itemName || r.releasedItemName === 'ALL')
                    );
                    const hasLegacyApprovedRelease = (!stock.releases || stock.releases.length === 0) && stock.dateReleased && stock.status !== 'REJECTED' && stock.status !== 'PENDING';
                    
                    return !hasApprovedRelease && !hasLegacyApprovedRelease;
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
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                <Typography variant="h5" fontWeight={700}>Stock Management</Typography>
            </Box>

            {/* Search & Filter Bar */}
            <Paper sx={{ p: 2, mb: 2.5, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                <TextField
                    size="small"
                    placeholder="Search by Owner..."
                    value={searchOwner}
                    onChange={(e) => setSearchOwner(e.target.value)}
                    fullWidth={false}
                    sx={{ flex: 1, minWidth: 200, maxWidth: 300 }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment> }}
                />
                <TextField
                    size="small"
                    placeholder="Search by Item Name..."
                    value={searchItemName}
                    onChange={(e) => setSearchItemName(e.target.value)}
                    fullWidth={false}
                    sx={{ flex: 1, minWidth: 200, maxWidth: 300 }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment> }}
                />
                <TextField
                    size="small"
                    type="date"
                    title="Search by Taken Date"
                    value={searchTakenDate}
                    onChange={(e) => setSearchTakenDate(e.target.value)}
                    fullWidth={false}
                    sx={{ flex: 1, minWidth: 160, maxWidth: 200 }}
                />
                <FormControl size="small" sx={{ flex: 1, minWidth: 160, maxWidth: 200 }}>
                    <Select
                        value={releaseFilter}
                        onChange={(e) => setReleaseFilter(e.target.value)}
                        displayEmpty
                        sx={{ borderRadius: '10px' }}
                    >
                        <MenuItem value="all">All Status</MenuItem>
                        <MenuItem value="released">Released</MenuItem>
                        <MenuItem value="not_released">Not Released</MenuItem>
                        <MenuItem value="damaged">Damaged</MenuItem>
                    </Select>
                </FormControl>

                {isFilterActive && (
                    <>
                        <Button variant="outlined" color="error" size="small" startIcon={<FilterListOff />} onClick={clearAllFilters}>
                            Clear
                        </Button>
                        <Button variant="contained" color="success" size="small" startIcon={<FileDownloadOutlined />} onClick={downloadExcel}>
                            Report
                        </Button>
                    </>
                )}

                {isFilterActive && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', fontStyle: 'italic' }}>
                        {filteredStocks.length} result{filteredStocks.length !== 1 ? 's' : ''} found
                    </Typography>
                )}
            </Paper>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
            ) : (
                <TableContainer component={Paper}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Owner</TableCell>
                                <TableCell>Items</TableCell>
                                <TableCell>Rem. Qty</TableCell>
                                <TableCell>Taken Date</TableCell>
                                <TableCell>Released Date</TableCell>
                                <TableCell>Qty Released</TableCell>
                                <TableCell>Sold Amount</TableCell>
                                <TableCell>Documents</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredStocks.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} sx={{ textAlign: 'center', py: 4, color: 'text.secondary', fontStyle: 'italic' }}>
                                        No stock items found matching your criteria.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredStocks.map(stock => (
                                    <TableRow key={stock.id}>
                                        <TableCell>{stock.ownerName}</TableCell>
                                        <TableCell>
                                            <Tooltip title={((stock.displayItems || stock.items) || []).map(i => `${i.itemName} (${i.item})`).join(', ')}>
                                                <span>{formatItemsDisplay(stock.displayItems || stock.items)}</span>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell>{getRemainingQuantity(stock)}</TableCell>
                                        <TableCell>{stock.takenDate}</TableCell>
                                        <TableCell>
                                            {stock.releases && stock.releases.length > 0 ? (
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                    {stock.releases.map((r, i) => (
                                                        <Box key={i}>
                                                            <Chip label={r.dateReleased} size="small" color="success" variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />
                                                            {r.status === 'REJECTED' && <Typography variant="caption" color="error" display="block">REJECTED: {r.rejectionReason}</Typography>}
                                                            {(!r.status || r.status === 'PENDING') && <Typography variant="caption" color="warning.main" display="block">PENDING</Typography>}
                                                            {r.status === 'APPROVED' && <Typography variant="caption" color="success.main" display="block">APPROVED</Typography>}
                                                        </Box>
                                                    ))}
                                                </Box>
                                            ) : stock.dateReleased ? (
                                                <Box>
                                                    <Chip label={stock.dateReleased} size="small" color="success" variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />
                                                    {stock.status === 'REJECTED' && <Typography variant="caption" color="error" display="block">REJECTED</Typography>}
                                                </Box>
                                            ) : (
                                                <Chip label="Not Released" size="small" color="warning" variant="filled" sx={{ fontSize: '0.7rem', height: 22 }} />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {stock.releases && stock.releases.length > 0 ? (
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                    {stock.releases.map((r, i) => <Typography key={i} variant="body2">{r.quantityReleased}</Typography>)}
                                                </Box>
                                            ) : stock.quantityReleased || '-'}
                                        </TableCell>
                                        <TableCell>
                                            {stock.releases && stock.releases.length > 0 ? (
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                    {stock.releases.map((r, i) => <Typography key={i} variant="body2">{r.soldAmount ? `${r.soldAmount} RWF` : '-'}</Typography>)}
                                                </Box>
                                            ) : stock.soldAmount ? `${stock.soldAmount} RWF` : '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                {stock.documentPaths && stock.documentPaths.map((path, idx) => (
                                                    <Chip
                                                        key={idx}
                                                        label={`Doc ${idx + 1}`}
                                                        size="small"
                                                        color="primary"
                                                        variant="outlined"
                                                        onClick={() => downloadDocument(stock.id, idx)}
                                                        sx={{ cursor: 'pointer', fontSize: '0.7rem', height: 24 }}
                                                    />
                                                ))}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                 <Tooltip title="Delete">
                                                    <IconButton size="small" color="error" onClick={() => handleDelete(stock.id)}>
                                                        <Trash2 size={16} />
                                                    </IconButton>
                                                </Tooltip>
                                                {stock.releases && stock.releases.length > 0 ? (
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                                                        {stock.releases.map((r, i) => (
                                                            r.status === 'APPROVED' ? (
                                                                <Tooltip key={i} title={`Download Release ${i + 1}`}>
                                                                    <IconButton size="small" color="primary" onClick={() => downloadGeneratedReleaseDoc(stock.id, i)}>
                                                                        <Download size={14} />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            ) : (
                                                                <Typography key={i} variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>
                                                                    {r.status || 'PENDING'}
                                                                </Typography>
                                                            )
                                                        ))}
                                                    </Box>
                                                ) : stock.dateReleased ? (
                                                    <Tooltip title="Download Release Note">
                                                        <IconButton size="small" color="primary" onClick={() => downloadGeneratedReleaseDoc(stock.id)}>
                                                            <Download size={16} />
                                                        </IconButton>
                                                    </Tooltip>
                                                ) : (
                                                    <Tooltip title="Download Stock Info">
                                                        <IconButton size="small" color="primary" onClick={() => generateStockPdf(stock)}>
                                                            <Download size={16} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}


        </Box>
    );
};

export default StockManagement;
