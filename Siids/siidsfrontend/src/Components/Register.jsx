import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from './../api/axios.jsx';
import {
    TextField,
    Button,
    Typography,
    Box,
    Link,
    Alert,
    Card,
    CardContent,
    Stack,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    InputAdornment,
    IconButton,
    CircularProgress,
} from '@mui/material';
import { Person, Lock, Visibility, VisibilityOff, Badge } from '@mui/icons-material';
import AuthLayout from './ui/AuthLayout.jsx';

const Register = () => {
    const [formData, setFormData] = useState({ username: '', password: '', role: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(false);
        setLoading(true);

        try {
            if (!formData.username || !formData.password || !formData.role) {
                throw new Error('Employee ID, password, and role are required');
            }

            const response = await axios.post('/register', formData);

            if (response.data) {
                setSuccess(true);
                try {
                    const loginResponse = await axios.post('/login', {
                        username: formData.username,
                        password: formData.password,
                    });

                    if (loginResponse.data.token) {
                        localStorage.setItem('token', loginResponse.data.token);
                        localStorage.setItem('employeeId', loginResponse.data.employeeId);
                        localStorage.setItem('role', loginResponse.data.role);
                        localStorage.setItem('name', loginResponse.data.name);
                        setTimeout(() => navigate('/home'), 2000);
                    }
                } catch (loginError) {
                    console.error('Auto-login failed:', loginError);
                    setSuccess(true);
                }
            }
        } catch (err) {
            console.error('Registration error:', err);
            setError(err.response?.data?.message || err.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const roles = [
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

    return (
        <AuthLayout title="Create Account" maxWidth="xs">
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 3 }}>
                    <Stack spacing={2.5}>
                        {error && <Alert severity="error">{error}</Alert>}
                        {success && <Alert severity="success">Registration successful! Redirecting to dashboard...</Alert>}

                        <Box component="form" onSubmit={handleSubmit}>
                            <Stack spacing={2}>
                                <TextField
                                    required
                                    id="username"
                                    label="Employee ID"
                                    name="username"
                                    autoComplete="employee-id"
                                    autoFocus
                                    value={formData.username}
                                    onChange={handleChange}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Person color="action" fontSize="small" />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                                <TextField
                                    required
                                    name="password"
                                    label="Password"
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    autoComplete="new-password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Lock color="action" fontSize="small" />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                                                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                                <FormControl fullWidth required size="small">
                                    <InputLabel id="role-label">Role</InputLabel>
                                    <Select
                                        labelId="role-label"
                                        id="role"
                                        name="role"
                                        value={formData.role}
                                        label="Role"
                                        onChange={handleChange}
                                        sx={{ borderRadius: '10px' }}
                                    >
                                        {roles.map((r) => (
                                            <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <Button type="submit" fullWidth disabled={loading} sx={{ py: 1.2 }}>
                                    {loading ? <CircularProgress size={22} color="inherit" /> : 'Register'}
                                </Button>

                                <Box textAlign="center">
                                    <Link href="/" variant="body2" underline="hover">
                                        Already have an account? Sign in
                                    </Link>
                                </Box>
                            </Stack>
                        </Box>
                    </Stack>
                </CardContent>
            </Card>
        </AuthLayout>
    );
};

export default Register;