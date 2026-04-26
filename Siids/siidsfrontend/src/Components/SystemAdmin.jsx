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

    const handleRegisterToggle = () => setOpenRegister(!openRegister);

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
        } catch {
            setError('Error updating role.');
        }
    };

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

            <TableContainer component={Paper}>
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
                        {users.map((user) => (
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

            {/* Register Dialog */}
            <Dialog open={openRegister} onClose={handleRegisterToggle} maxWidth="xs" fullWidth>
                <DialogTitle>Register New User</DialogTitle>
                <form onSubmit={handleRegisterSubmit}>
                    <DialogContent>
                        <TextField
                            margin="dense"
                            label="Employee ID (Username)"
                            name="username"
                            value={formData.username}
                            onChange={handleFormChange}
                            fullWidth
                            required
                        />
                        <FormControl fullWidth margin="dense" required>
                            <InputLabel>Role</InputLabel>
                            <Select name="role" value={formData.role} label="Role" onChange={handleFormChange}>
                                {ROLES.map((r) => (
                                    <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleRegisterToggle} variant="outlined">Cancel</Button>
                        <Button type="submit">Register</Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Edit Role Dialog */}
            <Dialog open={openRole} onClose={() => setOpenRole(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Update User Role</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth margin="dense" sx={{ mt: 1 }}>
                        <InputLabel>Role</InputLabel>
                        <Select value={newRole} label="Role" onChange={(e) => setNewRole(e.target.value)}>
                            {ROLES.map((r) => (
                                <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenRole(false)} variant="outlined">Cancel</Button>
                    <Button onClick={handleRoleUpdateSubmit}>Save</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SystemAdmin;
