import React, { useEffect, useState } from 'react';
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
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Description as DescriptionIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { CaseService } from '../../api/Axios/caseApi.jsx';

const SurveillanceOfficer = () => {
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
  }, []);

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
          <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => navigate('/surveillence-officer/new')}
          >
            New Case
          </Button>
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
      </Box>
  );
};

export default SurveillanceOfficer;