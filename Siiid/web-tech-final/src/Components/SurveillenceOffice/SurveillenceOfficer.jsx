import React, { useEffect, useState } from 'react';
import {
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Chip,
  Box,
  Typography,
  CircularProgress,
  Alert
} from "@mui/material";
import { Add, Description, Search } from "@mui/icons-material";
import SendIcon from "@mui/icons-material/Send";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import { Link } from 'react-router-dom';
import { CaseService } from '../../api/Axios/caseApi.jsx';

const STATUS_COLOR_MAP = {
  'sent to investigation': 'success',
  pending: 'default',
  open: 'info',
  closed: 'error',
};

const SurveillanceOfficer = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const response = await CaseService.getAllCases();
        setCases(response.data);
      } catch (err) {
        console.error('Failed to fetch cases:', err);
        setError(err.message || 'Failed to fetch cases');
      } finally {
        setLoading(false);
      }
    };
    fetchCases();
  }, []);

  const handleSend = async (caseId) => {
    try {
      await CaseService.updateCaseStatus(caseId, 'sent to investigation');
      setCases(prev =>
          prev.map(c =>
              c.id === caseId ? { ...c, status: 'sent to investigation' } : c
          )
      );
    } catch (err) {
      console.error('Failed to update case status:', err);
      setError('Failed to update case status');
    }
  };

  const filteredCases = cases.filter(caseItem =>
      caseItem.caseNumber?.toString().includes(searchTerm) ||
      caseItem.tin?.toString().includes(searchTerm) ||
      caseItem.taxPayerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caseItem.taxPayerType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <TextField
                size="small"
                placeholder="Search"
                variant="outlined"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <IconButton>
              <Search />
            </IconButton>
          </Box>
          <Link to="/surveillence-officer/New">
            <Button variant="contained" startIcon={<Add />}>
              New Case
            </Button>
          </Link>
        </Box>

        {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
        ) : error ? (
            <Alert severity="error">{error}</Alert>
        ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#eceff1' }}>
                    <TableCell><strong>Case Number</strong></TableCell>
                    <TableCell><strong>TIN</strong></TableCell>
                    <TableCell><strong>Period</strong></TableCell>
                    <TableCell><strong>Tax Type</strong></TableCell>
                    <TableCell><strong>Reported Date</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCases.length > 0 ? (
                      filteredCases.map((caseItem, index) => (
                          <TableRow key={caseItem.caseNum || index}>
                            <TableCell>{caseItem.caseNum }</TableCell>
                            <TableCell>{caseItem.tin || 'N/A'}</TableCell>
                            <TableCell>{caseItem.taxPeriod || 'N/A'}</TableCell>
                            <TableCell>{caseItem.taxPayerType || 'N/A'}</TableCell>

                            <TableCell>{caseItem.reportedDate}</TableCell>
                            <TableCell>
                              <Chip
                                  size="small"
                                  label={caseItem.status || 'Pending'}
                                  color={STATUS_COLOR_MAP[caseItem.status] || 'default'}
                              />
                            </TableCell>
                            <TableCell>
                              <IconButton
                                  onClick={() => handleSend(caseItem.id)}
                                  color="primary"
                                  disabled={caseItem.status === 'sent to investigation'}
                              >
                                <SendIcon />
                              </IconButton>

                              <Link to={`/surveillence-officer/view/${caseItem.id}`}>
                                <IconButton color="primary">
                                  <Description />
                                </IconButton>
                              </Link>

                              <Link to={`/surveillence-officer/add-evidence/${caseItem.id}`}>
                                <IconButton color="success">
                                  <Add />
                                </IconButton>
                              </Link>

                              <Link to={`/surveillence-officer/attachment/${caseItem.id}`}>
                                <IconButton>
                                  <AttachFileIcon />
                                </IconButton>
                              </Link>
                            </TableCell>
                          </TableRow>
                      ))
                  ) : (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Typography textAlign="center" color="text.secondary">
                            No cases match your search.
                          </Typography>
                        </TableCell>
                      </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
        )}
      </Box>
  );
};

export default SurveillanceOfficer;
