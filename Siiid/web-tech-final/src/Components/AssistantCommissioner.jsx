import React, { useState } from 'react';
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
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
} from "@mui/material";
import {
    Add,
    Search,
    Description,
    Check,
    Close
} from "@mui/icons-material";
import SendIcon from "@mui/icons-material/Send";
import { Link } from 'react-router-dom';

const AssistantCommissioner = () => {
    const [status, setStatus] = useState("Submitted to Director Officer");
    const [closeDialogOpen, setCloseDialogOpen] = useState(false);
    const [closeReason, setCloseReason] = useState("");

    const handleSuccess = () => {
        setStatus("Legal action taking place");
    };

    const handleCloseCase = () => {
        setCloseDialogOpen(true);
    };

    const handleDialogClose = () => {
        setCloseDialogOpen(false);
    };

    const handleConfirmClose = () => {
        setStatus(`Case Closed: ${closeReason}`);
        setCloseDialogOpen(false);
        setCloseReason("");
    };

    return (
        <div style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                    <TextField size="small" placeholder="Search" variant="outlined" />
                    <IconButton>
                        <Search />
                    </IconButton>
                </div>
            </div>

            {/* Table */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow style={{ backgroundColor: "#cfd8dc" }}>
                            <TableCell>Case Id</TableCell>
                            <TableCell>Tin Number</TableCell>
                            <TableCell>Period</TableCell>
                            <TableCell>Tax Type</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow>
                            <TableCell>CS001/25</TableCell>
                            <TableCell>100111</TableCell>
                            <TableCell>1</TableCell>
                            <TableCell>Land Tax</TableCell>
                            <TableCell style={{ fontSize: "12px", color: "#555" }}>
                                {status}
                            </TableCell>
                            <TableCell>
                                <Link to={"/Director-Investigation"}>
                                    <IconButton color={"inherit"}>
                                        <SendIcon />
                                    </IconButton>
                                </Link>
                                <Link to={"/intelligence-officer/view"}>
                                    <IconButton color="default">
                                        <Description />
                                    </IconButton>
                                </Link>

                                <IconButton color="success" onClick={handleSuccess}>
                                    <Check />
                                </IconButton>

                                <IconButton color={"error"} onClick={handleCloseCase}>
                                    <Close />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Dialog for Close Reason */}
            <Dialog open={closeDialogOpen} onClose={handleDialogClose}>
                <DialogTitle>Reason for Case Closure</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        value={closeReason}
                        onChange={(e) => setCloseReason(e.target.value)}
                        placeholder="Enter reason..."
                        variant="outlined"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDialogClose} color="secondary">Cancel</Button>
                    <Button onClick={handleConfirmClose} variant="contained" color="primary" disabled={!closeReason.trim()}>
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default AssistantCommissioner;
