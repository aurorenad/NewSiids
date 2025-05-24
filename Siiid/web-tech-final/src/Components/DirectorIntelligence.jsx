import React, { useState } from 'react';
import {
    Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField
} from "@mui/material";
import { Description, Check, Close, Search } from "@mui/icons-material";
import { Link, useNavigate } from 'react-router-dom';

const DirectorIntelligence = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [cases, setCases] = useState([
        {
            id: 'CS001/25',
            delegate: '100111',
            reportedDate: '21/09/2025',
            status: 'Report received from Intelligence Officer',
            reason: ''
        },
        {
            id: 'CS002/25',
            delegate: '100114',
            reportedDate: '22/09/2025',
            status: 'Received from Surveillance Officer',
            reason: ''
        }
    ]);

    const navigate = useNavigate();

    const [closeDialogOpen, setCloseDialogOpen] = useState(false);
    const [selectedCaseIndex, setSelectedCaseIndex] = useState(null);
    const [reasonInput, setReasonInput] = useState('');

    const handleApprove = (index) => {
        const updatedCases = [...cases];
        updatedCases[index] = {
            ...updatedCases[index],
            status: 'Sent to Assistant Commissioner',
            reason: ''
        };
        setCases(updatedCases);
        setTimeout(() => {
            navigate('/assistant-commissioner');
        }, 3000);
    };

    const handleOpenCloseDialog = (index) => {
        setSelectedCaseIndex(index);
        setReasonInput('');
        setCloseDialogOpen(true);
    };

    const handleConfirmClose = () => {
        const updatedCases = [...cases];
        updatedCases[selectedCaseIndex] = {
            ...updatedCases[selectedCaseIndex],
            status: 'Case Closed',
            reason: reasonInput
        };
        setCases(updatedCases);
        setCloseDialogOpen(false);
    };

    const handleDelegateChange = (e, index) => {
        const updatedCases = [...cases];
        updatedCases[index] = {
            ...updatedCases[index],
            delegate: e.target.value
        };
        setCases(updatedCases);
    };

    const filteredCases = cases.filter(
        (item) =>
            item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.delegate.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="page-container" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                    <TextField
                        size="small"
                        placeholder="Search"
                        variant="outlined"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <IconButton>
                        <Search />
                    </IconButton>
                </div>
            </div>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow style={{ backgroundColor: "#cfd8dc" }}>
                            <TableCell>Case Id</TableCell>
                            <TableCell>Delegate</TableCell>
                            <TableCell>Reported Date</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredCases.map((caseItem, index) => (
                            <TableRow key={caseItem.id}>
                                <TableCell>{caseItem.id}</TableCell>
                                <TableCell>
                                    <input
                                        type="text"
                                        value={caseItem.delegate}
                                        onChange={(e) => handleDelegateChange(e, index)}
                                        style={{
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            width: '100%',
                                            fontSize: '14px'
                                        }}
                                    />
                                </TableCell>
                                <TableCell>{caseItem.reportedDate}</TableCell>
                                <TableCell style={{
                                    color: caseItem.status === "Sent to Assistant Commissioner" ? "green" :
                                        caseItem.status === "Case Closed" ? "red" : "#555",
                                    fontWeight: "bold"
                                }}>
                                    {caseItem.status === "Case Closed" && caseItem.reason
                                        ? `${caseItem.status} - ${caseItem.reason}`
                                        : caseItem.status}
                                </TableCell>
                                <TableCell>
                                    <Link to="/intelligence-officer/view">
                                        <IconButton color="primary">
                                            <Description />
                                        </IconButton>
                                    </Link>

                                    <IconButton color="success" onClick={() => handleApprove(index)}>
                                        <Check />
                                    </IconButton>

                                    <IconButton color="error" onClick={() => handleOpenCloseDialog(index)}>
                                        <Close />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Close Reason Dialog */}
            <Dialog open={closeDialogOpen} onClose={() => setCloseDialogOpen(false)}>
                <DialogTitle>Reason for Case Closure</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        value={reasonInput}
                        onChange={(e) => setReasonInput(e.target.value)}
                        placeholder="Enter reason..."
                        variant="outlined"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCloseDialogOpen(false)} color="secondary">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmClose}
                        variant="contained"
                        color="primary"
                        disabled={!reasonInput.trim()}
                    >
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default DirectorIntelligence;
