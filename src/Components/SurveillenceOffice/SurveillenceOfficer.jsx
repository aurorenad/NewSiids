import React, { useEffect, useState } from 'react';
import {
  Button, IconButton, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Chip,
  Box, Typography, CircularProgress, Alert, Snackbar
} from "@mui/material";
import { Add, Description, Search } from "@mui/icons-material";
import SendIcon from "@mui/icons-material/Send";
import { Link, useNavigate } from 'react-router-dom';
import { CaseService } from '../../api/Axios/caseApi.jsx';

const STATUS_COLOR_MAP = {
  CASE_CREATED: { color: 'default', label: 'Created' },
  SENT_TO_INVESTIGATION: { color: 'success', label: 'Sent to Investigation' },
  IN_PROGRESS: { color: 'warning', label: 'In Progress' },
  CLOSED: { color: 'error', label: 'Closed' }
};

const SurveillanceOfficer = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const navigate = useNavigate();

  const fetchCases = async () => {
    try {
      setLoading(true);
      const response = await CaseService.getMyCases();

      if (!response?.data) {
        throw new Error('Invalid response from server');
      }

      setCases(response.data);
    } catch (err) {
      console.error('Failed to fetch cases:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch cases');
      showSnackbar('Failed to fetch cases', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleSendToInvestigation = async (caseId) => {
    try {
      if (!caseId) throw new Error('No case ID provided');

      await CaseService.updateCaseStatus(caseId, 'SENT_TO_INVESTIGATION');
      setCases(prev => prev.map(c =>
          c.caseNum === caseId ? { ...c, status: 'SENT_TO_INVESTIGATION' } : c
      ));
      showSnackbar('Case sent to investigation successfully', 'success');
    } catch (err) {
      console.error('Failed to update case status:', err);
      showSnackbar(err.response?.data?.message || 'Failed to send case', 'error');
    }
  };

  const filteredCases = cases.filter(caseItem => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
        caseItem.caseNum?.toString().includes(searchTerm) ||
        caseItem.tin?.toLowerCase().includes(searchTermLower) ||
        caseItem.taxPayerName?.toLowerCase().includes(searchTermLower)
    );
  });

  useEffect(() => { fetchCases(); }, []);

  if (loading) {
    return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress size={60} />
        </Box>
    );
  }

  if (error) {
    return (
        <Box sx={{ p: 3 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
            <Button variant="text" color="inherit" onClick={fetchCases} sx={{ ml: 2 }}>
              Retry
            </Button>
          </Alert>
        </Box>
    );
  }

  return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <TextField
                size="small"
                placeholder="Search cases..."
                variant="outlined"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ width: 300 }}
            />
            <IconButton><Search /></IconButton>
          </Box>
          <Link to="/surveillence-officer/new" style={{ textDecoration: 'none' }}>
            <Button variant="contained" startIcon={<Add />}>New Case</Button>
          </Link>
        </Box>

        <TableContainer component={Paper} elevation={3}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell><strong>Case #</strong></TableCell>
                <TableCell><strong>TIN</strong></TableCell>
                <TableCell><strong>Taxpayer</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCases.length > 0 ? (
                  filteredCases.map((caseItem) => (
                      <TableRow key={caseItem.caseNum} hover>
                        <TableCell>{caseItem.caseNum || '-'}</TableCell>
                        <TableCell>{caseItem.tin || '-'}</TableCell>
                        <TableCell>{caseItem.taxPayerName || '-'}</TableCell>
                        <TableCell>
                          <Chip
                              label={STATUS_COLOR_MAP[caseItem.status]?.label || caseItem.status}
                              color={STATUS_COLOR_MAP[caseItem.status]?.color || 'default'}
                          />
                        </TableCell>
                        <TableCell sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                              onClick={() => handleSendToInvestigation(caseItem.caseNum)}
                              color="primary"
                              disabled={caseItem.status === 'SENT_TO_INVESTIGATION'}
                              title="Send to Investigation"
                          >
                            <SendIcon fontSize="small" />
                          </IconButton>
                          <Link to={`/surveillence-officer/view/${caseItem.caseNum}`}>
                            <IconButton color="primary" title="View Details">
                              <Description fontSize="small" />
                            </IconButton>
                          </Link>
                        </TableCell>
                      </TableRow>
                  ))
              ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        {cases.length === 0 ? 'No cases found' : 'No matching cases found'}
                      </Typography>
                      {cases.length === 0 && (
                          <Button
                              variant="text"
                              startIcon={<Add />}
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

        <Snackbar
            open={snackbar.open}
            autoHideDuration={6000}
            onClose={handleCloseSnackbar}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
  );
};

export default SurveillanceOfficer;