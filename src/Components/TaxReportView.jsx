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
        // TODO: Optionally update status in backend here
    };

    if (loading) return <p>Loading cases...</p>;
    if (error) return <p>{error}</p>;

    return (
        <div style={{ padding: "20px" }}>
            {/* Search and New Case Button */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                    <TextField size="small" placeholder="Search" variant="outlined" />
                    <IconButton>
                        <Search />
                    </IconButton>
                </div>
                <Link to="/intelligence-officer/newCase">
                    <Button variant="contained" color="primary" startIcon={<Add />}>
                        New
                    </Button>
                </Link>
            </div>

            {/* Case Table */}
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
                                    {/* Send to Director */}
                                    <Link to="/Director-intelligence">
                                        <IconButton onClick={() => handleSend(index)} color="primary">
                                            <SendIcon />
                                        </IconButton>
                                    </Link>

                                    {/* View Case (passes caseId via route param) */}
                                    <Link to={`/intelligence-officer/view-case/${caseItem.caseNum}`}>
                                        <IconButton color="primary">
                                            <Description />
                                        </IconButton>
                                    </Link>

                                    {/* Placeholder Add action */}
                                    <IconButton color="success">
                                        <Add />
                                    </IconButton>

                                    {/* Attachments */}
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
