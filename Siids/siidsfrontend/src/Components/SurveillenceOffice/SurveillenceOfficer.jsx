import React, { useEffect, useState, useContext, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Plus, X } from 'lucide-react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  Tooltip,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Description as DescriptionIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { CaseService } from '../../api/Axios/caseApi.jsx';

const EMPTY_ITEM = { itemName: '', item: '', quantity: '', measurementUnit: '', plateNumber: '', chassisNumber: '', vehicleType: '' };

const SurveillanceOfficer = () => {
    const { authState } = useContext(AuthContext);
    const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [cases, setCases] = useState([]);
  const [filteredCases, setFilteredCases] = useState([]);
  const [loading, setLoading] = useState({
    cases: true,
  });
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [showOnlyCreated, setShowOnlyCreated] = useState(false);

  // Add Stock State
  const [showStockModal, setShowStockModal] = useState(false);
  const [formData, setFormData] = useState({
      ownerName: '', takeoverName: '', seizureNumber: '', pvNumber: '',
      takenDate: today, receivedDate: today, items: [{ ...EMPTY_ITEM }],
      seizureReason: '', seizureReasonCategory: '', dateReleased: '',
      releasedItem: '', quantityReleased: '', soldAmount: '',
      reason: '', releaseReason: '', newPlateNumber: '', newOwner: ''
  });
  const [documentFiles, setDocumentFiles] = useState([]);
  const [anotherDocumentFile, setAnotherDocumentFile] = useState(null);
  const [paymentProofFile, setPaymentProofFile] = useState(null);
  const [itemTypes, setItemTypes] = useState([]);
  const [measurementUnits, setMeasurementUnits] = useState([]);
  const [releaseReasons, setReleaseReasons] = useState([]);
  const [seizureReasons, setSeizureReasons] = useState([]);
  const [isAddingNewSeizureReason, setIsAddingNewSeizureReason] = useState(false);

  const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:2005';
  const STOCK_API_URL = `${BASE_URL}/api/stock`;

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await CaseService.getMyCases();
        console.log('Fetched cases:', response.data);
        setCases(response.data);
        setFilteredCases(response.data);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError(err.response?.data?.message || 'Failed to load data');
        showSnackbar('Failed to load data', 'error');
      } finally {
        setLoading(prev => ({ ...prev, cases: false }));
      }
    };

    fetchData();

    if (authState.token) {
        fetchItemTypes();
        fetchMeasurementUnits();
        fetchReleaseReasons();
        fetchSeizureReasons();
    }
  }, [authState.token]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || authState.token;
    const employeeId = localStorage.getItem('employeeId') || sessionStorage.getItem('employeeId') || authState.employeeId;
    return { 'Authorization': `Bearer ${token}`, 'employee_id': employeeId };
  };

  const fetchWithAuth = async (url, options = {}) => {
    const headers = { ...getAuthHeaders(), ...(options.headers || {}) };
    let response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
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
                    if (localStorage.getItem('token')) localStorage.setItem('token', data.token);
                    else sessionStorage.setItem('token', data.token);
                    const newHeaders = { ...getAuthHeaders(), ...(options.headers || {}) };
                    response = await fetch(url, { ...options, headers: newHeaders });
                }
            }
        } catch (err) { console.error('Token refresh failed:', err); }
    }
    return response;
  };

  const fetchItemTypes = async () => {
    try {
        const res = await fetchWithAuth(`${STOCK_API_URL}/item-types`);
        if (res.ok) setItemTypes(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchMeasurementUnits = async () => {
    try {
        const res = await fetchWithAuth(`${STOCK_API_URL}/measurement-units`);
        if (res.ok) setMeasurementUnits(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchReleaseReasons = async () => {
    try {
        const res = await fetchWithAuth(`${STOCK_API_URL}/release-reasons`);
        if (res.ok) setReleaseReasons(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchSeizureReasons = async () => {
    try {
        const res = await fetchWithAuth(`${STOCK_API_URL}/seizure-reasons`);
        if (res.ok) setSeizureReasons(await res.json());
    } catch (err) { console.error(err); }
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
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (name === 'documents') {
        const newFiles = Array.from(files);
        setDocumentFiles(prev => {
            const existingNames = prev.map(f => f.name);
            return [...prev, ...newFiles.filter(f => !existingNames.includes(f.name))];
        });
        e.target.value = '';
    } else if (name === 'anotherDocument') {
        setAnotherDocumentFile(files[0]);
    }
  };

  const handleRemoveNewDocument = (index) => {
    setDocumentFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatUnit = (unit) => {
    if (!unit) return '';
    return unit.charAt(0) + unit.slice(1).toLowerCase();
  };

  const handleStockSubmit = async (e) => {
    e.preventDefault();

    if (formData.receivedDate > today) { alert('Received Date cannot be in the future.'); return; }
    if (formData.takenDate > today) { alert('Taken Date cannot be in the future.'); return; }
    if (new Date(formData.receivedDate) < new Date(formData.takenDate)) { alert('Received Date cannot be before Taken Date.'); return; }

    for (let i = 0; i < formData.items.length; i++) {
        const item = formData.items[i];
        if (!item.itemName?.trim()) { alert(`Item Name is required for item ${i + 1}.`); return; }
        if (!item.item) { alert(`Item Type is required for item ${i + 1}.`); return; }
        if (!parseInt(item.quantity) || parseInt(item.quantity) <= 0) { alert(`Quantity must be greater than zero for item ${i + 1}.`); return; }
        if (!item.measurementUnit) { alert(`Measurement Unit is required for item ${i + 1}.`); return; }
    }

    if (documentFiles.length === 0) { alert('At least one Seizure Document is mandatory.'); return; }
    if (!formData.seizureReasonCategory?.trim()) { alert('Reason for taking item is required.'); return; }
    if (!formData.seizureReason?.trim()) { alert('Details for taking item(s) is required.'); return; }

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
                itemName: item.itemName, item: category,
                quantity: parseInt(item.quantity) || 0,
                measurementUnit: unit,
                plateNumber: category === 'VEHICLE' ? item.plateNumber : null,
                chassisNumber: category === 'VEHICLE' ? item.chassisNumber : null,
                vehicleType: category === 'VEHICLE' ? item.vehicleType : null
            };
        }),
        releases: [],
        addedBy: localStorage.getItem('name') || sessionStorage.getItem('name') || authState.name || ''
    };

    data.append('stockData', new Blob([JSON.stringify(stockData)], { type: 'application/json' }));
    documentFiles.forEach(file => data.append('documents', file));
    if (anotherDocumentFile) data.append('anotherDocument', anotherDocumentFile);
    if (paymentProofFile) data.append('paymentProof', paymentProofFile);

    try {
        const response = await fetchWithAuth(STOCK_API_URL, { method: 'POST', body: data });
        if (response.ok) {
            showSnackbar('Stock added successfully!', 'success');
            setShowStockModal(false);
        } else if (response.status === 401) {
            alert('Session expired. Please log in again.');
        } else {
            alert((await response.text()) || 'Failed to save stock.');
        }
    } catch (err) {
        console.error('Error saving stock:', err);
        alert('Network error: Could not connect to the server.');
    }
  };

  const openStockModal = () => {
    setFormData({
        ownerName: '', takeoverName: '', seizureNumber: '', pvNumber: '',
        takenDate: today, receivedDate: today, items: [{ ...EMPTY_ITEM }],
        seizureReason: '', seizureReasonCategory: '', dateReleased: '',
        releasedItem: '', quantityReleased: '', soldAmount: '',
        reason: '', releaseReason: '', newPlateNumber: '', newOwner: ''
    });
    setDocumentFiles([]);
    setAnotherDocumentFile(null);
    setIsAddingNewSeizureReason(false);
    setShowStockModal(true);
  };

  useEffect(() => {
    if (location.state?.newCase) {
      const { newCase } = location.state;
      setCases(prevCases => [...prevCases, newCase]);
      showSnackbar(`Case ${newCase.caseNum} created successfully`, 'success');
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  useEffect(() => {
    let results = cases;
    if (searchTerm) {
      results = results.filter(caseItem =>
          Object.values(caseItem).some(
              value => value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
          ));
    }
    if (showOnlyCreated) {
      results = results.filter(caseItem => caseItem.status === 'CASE_CREATED');
    }
    setFilteredCases(results);
  }, [searchTerm, cases, showOnlyCreated]);

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'CASE_CREATED': return '#1976d2';
      case 'SENT_TO_INVESTIGATION': return '#4caf50';
      case 'IN_PROGRESS': return '#ff9800';
      case 'CLOSED': return '#f44336';
      case 'REJECTED': return '#d32f2f';
      case 'APPROVED': return '#2e7d32';
      default: return '#757575';
    }
  };

  if (loading.cases) {
    return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
    );
  }

  if (error) {
    return (
        <Box p={3}>
          <Alert severity="error">{error}</Alert>
        </Box>
    );
  }

  return (
      <Box p={3}>
        <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={3}
        >
          <Box display="flex" alignItems="center" width="50%" gap={2}>
            <TextField
                fullWidth
                size="small"
                placeholder="Search cases..."
                variant="outlined"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                      <IconButton edge="start">
                        <SearchIcon />
                      </IconButton>
                  ),
                }}
            />
            <Tooltip title={showOnlyCreated ? "Show all cases" : "Show only created cases"}>
              <Button
                  variant={showOnlyCreated ? "contained" : "outlined"}
                  onClick={() => setShowOnlyCreated(!showOnlyCreated)}
                  startIcon={<FilterListIcon />}
                  color={showOnlyCreated ? "primary" : "inherit"}
              >
                {showOnlyCreated ? "All Cases" : "Created Only"}
              </Button>
            </Tooltip>
          </Box>
          <Box display="flex" alignItems="center" gap={2}>
            <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={openStockModal}
            >
              Add New Stock
            </Button>
            <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => navigate('/surveillence-officer/new')}
            >
              New Case
            </Button>
          </Box>
        </Box>

        <TableContainer component={Paper} elevation={3}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'grey.100' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Case ID</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Report ID</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>TIN</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Taxpayer Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Tax Period</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCases.length > 0 ? (
                  filteredCases.map((caseItem) => (
                      <TableRow
                          key={caseItem.caseNum}
                          hover
                          sx={{
                            backgroundColor: caseItem.status === 'SENT_TO_INVESTIGATION' ? '#f0f9ff' : 'inherit'
                          }}
                      >
                        <TableCell>{caseItem.caseNum}</TableCell>
                        <TableCell>{caseItem.reportId || '-'}</TableCell>
                        <TableCell>{caseItem.taxPayer?.tin || caseItem.tin || '-'}</TableCell>
                        <TableCell>{caseItem.taxPayer?.name || caseItem.taxPayerName || '-'}</TableCell>
                        <TableCell>{caseItem.taxPeriod || '-'}</TableCell>
                        <TableCell>
                          <Typography
                              variant="body2"
                              sx={{
                                color: getStatusColor(caseItem.status),
                                fontWeight: 'medium'
                              }}
                          >
                            {caseItem.status}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Button
                                variant="outlined"
                                color="primary"
                                onClick={() => navigate(`/surveillence-officer/sclaim-form/${encodeURIComponent(caseItem.caseNum)}`)}
                            >
                              Create Report
                            </Button>
                            <IconButton
                                onClick={() => navigate(`/surveillence-officer/view/${encodeURIComponent(caseItem.caseNum)}`)}
                                title="View Details"
                            >
                              <DescriptionIcon />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                  ))
              ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body1" color="text.secondary" sx={{ py: 4 }}>
                        {cases.length === 0 ? 'No cases found' : 'No matching cases found'}
                      </Typography>
                      {cases.length === 0 && (
                          <Button
                              variant="text"
                              startIcon={<AddIcon />}
                              onClick={() => navigate('/surveillence-officer/new')}
                              sx={{ mt: 1 }}
                          >
                            Create New Case
                          </Button>
                      )}
                    </TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Snackbar */}
        <Snackbar
            open={snackbar.open}
            autoHideDuration={6000}
            onClose={handleCloseSnackbar}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert
              onClose={handleCloseSnackbar}
              severity={snackbar.severity}
              sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        {/* Add Stock Modal */}
        {showStockModal && (
            <div className="modal-overlay" style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1500
            }}>
                <div className="modal-content" style={{
                    backgroundColor: '#fff',
                    padding: '25px',
                    borderRadius: '12px',
                    width: '90%',
                    maxWidth: '900px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h5" fontWeight={700}>Add New Stock</Typography>
                        <IconButton onClick={() => setShowStockModal(false)}><X /></IconButton>
                    </Box>
                    <form onSubmit={handleStockSubmit}>
                        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Owner Name *</label>
                                <input style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} type="text" name="ownerName" value={formData.ownerName} onChange={handleInputChange} required />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Takeover Name *</label>
                                <input style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} type="text" name="takeoverName" value={formData.takeoverName} onChange={handleInputChange} required />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Seizure Number *</label>
                                <input style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} type="text" name="seizureNumber" value={formData.seizureNumber} onChange={handleInputChange} required />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>PV Number</label>
                                <input style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} type="text" name="pvNumber" value={formData.pvNumber} onChange={handleInputChange} />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Taken Date *</label>
                                <input style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} type="date" name="takenDate" value={formData.takenDate} onChange={handleInputChange} max={today} required />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Received Date *</label>
                                <input style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} type="date" name="receivedDate" value={formData.receivedDate} onChange={handleInputChange} min={formData.takenDate} max={today} required />
                            </div>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Upload Documents (PDF) *</label>
                                <input type="file" name="documents" accept=".pdf" onChange={handleFileChange} multiple />
                                {documentFiles.length > 0 && (
                                    <Box mt={1} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {documentFiles.map((file, idx) => (
                                            <Chip key={idx} label={file.name} onDelete={() => handleRemoveNewDocument(idx)} size="small" />
                                        ))}
                                    </Box>
                                )}
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Reason for taking item *</label>
                                <select
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
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
                                    required
                                >
                                    <option value="">Select Reason</option>
                                    {seizureReasons.map(r => <option key={r} value={r}>{r}</option>)}
                                    {!seizureReasons.includes('SMUGGLING') && <option value="SMUGGLING">SMUGGLING</option>}
                                    <option value="OTHER">OTHER (Add New...)</option>
                                </select>
                            </div>
                            {isAddingNewSeizureReason && (
                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>New Reason Name *</label>
                                    <input
                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                                        type="text"
                                        value={formData.seizureReasonCategory || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, seizureReasonCategory: e.target.value.toUpperCase() }))}
                                        placeholder="Enter new reason..."
                                        required
                                    />
                                </div>
                            )}
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Details for taking item(s) *</label>
                                <textarea 
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minHeight: '80px' }}
                                    name="seizureReason" 
                                    value={formData.seizureReason} 
                                    onChange={handleInputChange} 
                                    placeholder="Explain why the items were seized/taken..." 
                                    required 
                                />
                            </div>
                        </div>

                        {/* Items Section */}
                        <Box mt={3} p={2} sx={{ backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                            <Typography variant="h6" mb={2}>Items *</Typography>
                            {formData.items.map((item, index) => (
                                <Box key={index} mb={3} p={2} sx={{ border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
                                    <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={2} mb={2}>
                                        <div className="item-field">
                                            <label style={{ display: 'block', marginBottom: '3px', fontSize: '13px' }}>Category *</label>
                                            <select style={{ width: '100%', padding: '6px' }} value={item.item} onChange={(e) => handleItemChange(index, 'item', e.target.value)} required>
                                                <option value="">Select Category</option>
                                                {itemTypes.map(type => <option key={type} value={type}>{formatUnit(type)}</option>)}
                                                <option value="OTHER">OTHER (Add New...)</option>
                                            </select>
                                        </div>
                                        {item.item === 'OTHER' && (
                                            <div className="item-field">
                                                <label style={{ display: 'block', marginBottom: '3px', fontSize: '13px' }}>New Category *</label>
                                                <input style={{ width: '100%', padding: '6px' }} type="text" value={item.newCategory || ''} onChange={(e) => handleItemChange(index, 'newCategory', e.target.value)} required placeholder="Enter category name..." />
                                            </div>
                                        )}
                                        {item.item === 'VEHICLE' && (
                                            <div className="item-field">
                                                <label style={{ display: 'block', marginBottom: '3px', fontSize: '13px' }}>Vehicle Type *</label>
                                                <select style={{ width: '100%', padding: '6px' }} value={item.vehicleType} onChange={(e) => handleItemChange(index, 'vehicleType', e.target.value)} required>
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
                                            <label style={{ display: 'block', marginBottom: '3px', fontSize: '13px' }}>Item Name *</label>
                                            <input style={{ width: '100%', padding: '6px' }} type="text" value={item.itemName} onChange={(e) => handleItemChange(index, 'itemName', e.target.value)} required placeholder="Item Name" />
                                        </div>
                                    </Box>
                                    
                                    {item.item === 'VEHICLE' && (
                                        <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={2} mb={2}>
                                            <div className="item-field">
                                                <label style={{ display: 'block', marginBottom: '3px', fontSize: '13px' }}>Plate Number *</label>
                                                <input style={{ width: '100%', padding: '6px' }} type="text" value={item.plateNumber} onChange={(e) => { const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (val.length <= 7) handleItemChange(index, 'plateNumber', val); }} placeholder="AAA123A" required />
                                            </div>
                                            <div className="item-field">
                                                <label style={{ display: 'block', marginBottom: '3px', fontSize: '13px' }}>Chassis Number *</label>
                                                <input style={{ width: '100%', padding: '6px' }} type="text" value={item.chassisNumber} onChange={(e) => handleItemChange(index, 'chassisNumber', e.target.value.toUpperCase())} placeholder="Chassis Number" required />
                                            </div>
                                        </Box>
                                    )}

                                    <Box display="flex" gap={2} alignItems="flex-end">
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', marginBottom: '3px', fontSize: '13px' }}>Quantity *</label>
                                            <input style={{ width: '100%', padding: '6px' }} type="number" min="1" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} required />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', marginBottom: '3px', fontSize: '13px' }}>Measurement *</label>
                                            <select style={{ width: '100%', padding: '6px' }} value={item.measurementUnit} onChange={(e) => handleItemChange(index, 'measurementUnit', e.target.value)} required>
                                                <option value="">Select Unit</option>
                                                {measurementUnits.map(unit => <option key={unit} value={unit}>{formatUnit(unit)}</option>)}
                                                <option value="OTHER">OTHER (Add New...)</option>
                                            </select>
                                        </div>
                                        {item.measurementUnit === 'OTHER' && (
                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: 'block', marginBottom: '3px', fontSize: '13px' }}>New Unit *</label>
                                                <input style={{ width: '100%', padding: '6px' }} type="text" value={item.newUnit || ''} onChange={(e) => handleItemChange(index, 'newUnit', e.target.value)} required placeholder="Unit..." />
                                            </div>
                                        )}
                                        {formData.items.length > 1 && (
                                            <IconButton color="error" onClick={() => removeItem(index)}><X size={18} /></IconButton>
                                        )}
                                    </Box>
                                </Box>
                            ))}
                            <Button startIcon={<Plus size={16} />} onClick={addItem} size="small" variant="outlined">Add Another Item</Button>
                        </Box>

                        <Box mt={3} display="flex" justifyContent="flex-end" gap={2}>
                            <Button onClick={() => setShowStockModal(false)} variant="outlined">Cancel</Button>
                            <Button type="submit" variant="contained" color="primary">Save Stock</Button>
                        </Box>
                    </form>
                </div>
            </div>
        )}
      </Box>
  );
};

export default SurveillanceOfficer;