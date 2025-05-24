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
    TextField
} from "@mui/material";
import {Add, Description, Search} from "@mui/icons-material";
import SendIcon from "@mui/icons-material/Send";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import { Link, Outlet } from 'react-router-dom';

const IntelligenceOfficer = () => {
    const [cases, setCases] = useState([
        {
            id: 'CS001/25',
            tin: '100111',
            period: '1',
            taxType: 'Land Tax',
            status: 'submitted to director for review'
        }
    ]);

    const handleSend = (index) => {
        const updatedCases = [...cases];
        updatedCases[index].status = 'sent to director';
        setCases(updatedCases);
    };

    return (
        <div style={{ padding: "20px" }}>
            {/* Search Bar & New Button */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                    <TextField size="small" placeholder="Search" variant="outlined" />
                        <IconButton>
                            <Search />
                        </IconButton>
                </div>
                <Link to={"/intelligence-officer/newCase"}>
                    <Button variant="contained" color="primary" startIcon={<Add />}>
                        New
                    </Button>
                </Link>
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
                        {cases.map((caseItem, index) => (
                            <TableRow key={caseItem.id}>
                                <TableCell>{caseItem.id}</TableCell>
                                <TableCell>{caseItem.tin}</TableCell>
                                <TableCell>{caseItem.period}</TableCell>
                                <TableCell>{caseItem.taxType}</TableCell>
                                <TableCell style={{ fontSize: "12px", color: "#555" }}>
                                    {caseItem.status}
                                </TableCell>
                                <TableCell>
                                    <Link to="/Director-intelligence">
                                        <IconButton onClick={() => handleSend(index)} color="primary">
                                            <SendIcon />
                                        </IconButton>
                                    </Link>

                                    <Link to={"/intelligence-officer/view"}>
                                        <IconButton color="primary">
                                            <Description />
                                        </IconButton>
                                    </Link>
                                    <IconButton color="success">
                                        <Add />
                                    </IconButton>
                                    <Link to="/intelligence-officer/attachment">
                                        <IconButton>
                                            <AttachFileIcon />
                                        </IconButton>
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </div>
    );
};

export default IntelligenceOfficer;
