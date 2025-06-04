import React, { useState, useEffect } from 'react';
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
import { Add, Description, Search } from "@mui/icons-material";
import SendIcon from "@mui/icons-material/Send";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import { Link } from 'react-router-dom';
import { CaseService } from '../api/Axios/caseApi.jsx';

const IntelligenceOfficer = () => {
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCases = async () => {
            try {
                const response = await CaseService.getAllCases();
                setCases(response.data);
            } catch (err) {
                console.error('Failed to fetch cases:', err);
                setError('Failed to fetch cases');
            } finally {
                setLoading(false);
            }
        };

        fetchCases();
    }, []);

    const handleSend = (index) => {
        const updatedCases = [...cases];
        updatedCases[index].status = 'sent to director';
        setCases(updatedCases);
        // Optionally update on the backend here
    };

    if (loading) return <p>Loading cases...</p>;
    if (error) return <p>{error}</p>;

    return (
        <div style={{ padding: "20px" }}>
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

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow style={{ backgroundColor: "#cfd8dc" }}>
                            <TableCell>Case Id</TableCell>
                            <TableCell>TIN</TableCell>
                            <TableCell>Period</TableCell>
                            <TableCell>Tax Type</TableCell>

                            <TableCell>Reported Date</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {cases.map((caseItem, index) => (
                            <TableRow key={caseItem.caseNum || index}>
                                <TableCell>{caseItem.caseNum}</TableCell>
                                <TableCell>{caseItem.tin}</TableCell>
                                <TableCell>{caseItem.taxPeriod}</TableCell>
                                <TableCell>{caseItem.taxPayerType}</TableCell>
                                <TableCell>{caseItem.reportedDate}</TableCell>
                                <TableCell style={{ fontSize: "12px", color: "#555" }}>
                                    {caseItem.status}
                                </TableCell>
                                <TableCell>
                                    <Link to="/Director-intelligence">
                                        <IconButton onClick={() => handleSend(index)} color="primary">
                                            <SendIcon />
                                        </IconButton>
                                    </Link>
                                    <Link to={`/intelligence-officer/view-case/${caseItem.caseNum}`}>
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
