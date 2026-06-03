import React, { useState, useEffect } from 'react';
import axios from '../api/axios.jsx';
import {
    Container,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Alert,
    Box,
    Chip,
    CircularProgress,
} from '@mui/material';
import { PersonAdd } from '@mui/icons-material';

const ROLES = [
    { value: 'Admin', label: 'Admin' },
    { value: 'IntelligenceOfficer', label: 'Intelligence Officer' },
    { value: 'Surveillance', label: 'Surveillance Officer' },
    { value: 'InvestigationOfficer', label: 'Investigation Officer' },
    { value: 'DirectorIntelligence', label: 'Director Intelligence' },
    { value: 'DirectorInvestigation', label: 'Director Investigation' },
    { value: 'AssistantCommissioner', label: 'Assistant Commissioner' },
    { value: 'legalAdvisor', label: 'Legal Advisor' },
    { value: 'StockManager', label: 'Stock Manager' },
    { value: 'PRSO', label: 'PRSO' },
];

const SystemAdmin = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [openRegister, setOpenRegister] = useState(false);
    const [openRole, setOpenRole] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [formData, setFormData] = useState({ username: '', role: '' });
    const [newRole, setNewRole] = useState('');

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/users', { headers: { Authorization: `Bearer ${token}` } });
            setUsers(response.data);
        } catch (err) {
            console.error('Error fetching users:', err);
            setError('Failed to fetch users.');
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterToggle = () => {
        setOpenRegister(!openRegister);
        setFormData({ username: '', role: '' });
        setError('');
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const token = localStorage.getItem('token');
            await axios.post('/admin/register-user', formData, { headers: { Authorization: `Bearer ${token}` } });
            alert('Registration Successful! An email with an OTP to set their password has been sent to the new user.');
            handleRegisterToggle();
            fetchUsers();
            setFormData({ username: '', role: '' });
        } catch (err) {
            setError(err.response?.data?.error || 'Error registering user.');
        }
    };

    const toggleStatus = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/users/${id}/deactivate`, {}, { headers: { Authorization: `Bearer ${token}` } });
            fetchUsers();
        } catch {
            setError('Error updating status.');
        }
    };

    const handleRoleUpdateOpen = (user) => {
        setSelectedUser(user);
        setNewRole(user.role);
        setOpenRole(true);
    };

    const handleRoleUpdateSubmit = async () => {
        if (!selectedUser) return;
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/users/${selectedUser.id}/role`, { role: newRole }, { headers: { Authorization: `Bearer ${token}` } });
            setOpenRole(false);
            fetchUsers();
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.message || 'Error updating role.');
        }
    };

    const totalPages = Math.max(1, Math.ceil(users.length / pageSize));
    const paginatedUsers = users.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" py={6}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" fontWeight={700}>
                    System Admin — User Management
                </Typography>
                <Button startIcon={<PersonAdd />} onClick={handleRegisterToggle}>
                    Add New User
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <TableContainer component={Paper} sx={{ maxHeight: 520, overflow: 'auto' }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Employee ID</TableCell>
                            <TableCell>Role</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedUsers.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>{user.id}</TableCell>
                                <TableCell>{user.username}</TableCell>
                                <TableCell>{user.role}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={user.active !== false ? 'Active' : 'Deactivated'}
                                        color={user.active !== false ? 'success' : 'error'}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Button variant="outlined" size="small" sx={{ mr: 1 }} onClick={() => handleRoleUpdateOpen(user)}>
                                        Edit Role
                                    </Button>
                                    <Button
                                        variant="contained"
                                        color={user.active !== false ? 'error' : 'success'}
                                        size="small"
                                        onClick={() => toggleStatus(user.id)}
                                    >
                                        {user.active !== false ? 'Deactivate' : 'Activate'}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Pagination Controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1, px: 1, py: 0.5, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" color="text.secondary">Rows per page:</Typography>
                    <Select
                        value={pageSize}
                        onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                        size="small"
                        sx={{ fontSize: '0.75rem', height: 28, '.MuiSelect-select': { py: '2px' } }}
                    >
                        <MenuItem value={10}>10</MenuItem>
                        <MenuItem value={30}>30</MenuItem>
                        <MenuItem value={50}>50</MenuItem>
                    </Select>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                        {users.length === 0 ? '0' : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, users.length)}`} of {users.length}
                    </Typography>
                    <Button size="small" variant="outlined" sx={{ minWidth: 0, px: 1.5, py: 0.25, fontSize: '0.75rem', lineHeight: 1.5 }}
                        onClick={() => setCurrentPage(p => p - 1)}
                        disabled={currentPage === 1}
                    >Prev</Button>
                    <Typography variant="caption">{currentPage} / {totalPages}</Typography>
                    <Button size="small" variant="outlined" sx={{ minWidth: 0, px: 1.5, py: 0.25, fontSize: '0.75rem', lineHeight: 1.5 }}
                        onClick={() => setCurrentPage(p => p + 1)}
                        disabled={currentPage >= totalPages}
                    >Next</Button>
                </Box>
            </Box>

            {/* Register Dialog */}
            <Dialog
                open={openRegister}
                onClose={handleRegisterToggle}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 700, pb: 0 }}>Register New User</DialogTitle>
                <form onSubmit={handleRegisterSubmit}>
                    <DialogContent sx={{ pt: 1 }}>
                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                        <TextField
                            margin="dense"
                            label="Employee ID (Username)"
                            name="username"
                            value={formData.username}
                            onChange={handleFormChange}
                            fullWidth
                            required
                            autoFocus
                        />
                        <FormControl fullWidth margin="dense" required>
                            <InputLabel>Role</InputLabel>
                            <Select name="role" value={formData.role} label="Role" onChange={handleFormChange} MenuProps={{ sx: { zIndex: 99999 } }}>
                                {ROLES.map((r) => (
                                    <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button onClick={handleRegisterToggle} variant="outlined">Cancel</Button>
                        <Button type="submit" variant="contained">Register</Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Edit Role Dialog */}
            <Dialog
                open={openRole}
                onClose={() => setOpenRole(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 700, pb: 0 }}>Update User Role</DialogTitle>
                <DialogContent sx={{ pt: 1 }}>
                    <FormControl fullWidth margin="dense" sx={{ mt: 1 }}>
                        <InputLabel>Role</InputLabel>
                        <Select value={newRole} label="Role" onChange={(e) => setNewRole(e.target.value)} MenuProps={{ sx: { zIndex: 99999 } }}>
                            {ROLES.map((r) => (
                                <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setOpenRole(false)} variant="outlined">Cancel</Button>
                    <Button onClick={handleRoleUpdateSubmit} variant="contained">Save</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SystemAdmin;