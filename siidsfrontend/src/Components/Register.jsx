import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from './../api/axios.jsx';
import {
    Container,
    TextField,
    Button,
    Typography,
    Box,
    Link,
    Alert,
    Paper,
    Grid
} from '@mui/material';
import { LockOutlined } from '@mui/icons-material';

const Register = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(false);
        setLoading(true);

        try {
            if (!formData.username || !formData.password || !formData.role) {
                throw new Error('Employee ID and password are required');
            }

            const response = await axios.post('/register', formData);

            if (response.data) {
                setSuccess(true);
                try {
                    const loginResponse = await axios.post('/login', {
                        username: formData.username,
                        password: formData.password
                    });

                    if (loginResponse.data.token) {
                        localStorage.setItem('token', loginResponse.data.token);
                        localStorage.setItem('employeeId', loginResponse.data.employeeId);
                        localStorage.setItem('role', loginResponse.data.role);
                        localStorage.setItem('name', loginResponse.data.name);
                        setTimeout(() => {
                            navigate('/home');
                        }, 2000);
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

    return (
        <Container component="main" maxWidth="xs">
            <Paper elevation={3} sx={{ mt: 8, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <LockOutlined color="primary" sx={{ fontSize: 40, mb: 2 }} />
                <Typography component="h1" variant="h5">
                    Create Account
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ width: '100%', mt: 2, mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {success && (
                    <Alert severity="success" sx={{ width: '100%', mt: 2, mb: 2 }}>
                        Registration successful! Redirecting to dashboard...
                    </Alert>
                )}

                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3, width: '100%' }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                id="username"
                                label="Employee ID"
                                name="username"
                                autoComplete="employee-id"
                                autoFocus
                                value={formData.username}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                name="password"
                                label="Password"
                                type="password"
                                id="password"
                                autoComplete="new-password"
                                value={formData.password}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                name="role"
                                label="role"
                                type="role"
                                id="role"
                                autoComplete="role"
                                value={formData.role}
                                onChange={handleChange}
                            />
                        </Grid>
                    </Grid>

                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                        disabled={loading}
                    >
                        {loading ? 'Registering...' : 'Register'}
                    </Button>

                    <Grid container justifyContent="flex-end">
                        <Grid item>
                            <Link href="/" variant="body2">
                                Already have an account? Sign in
                            </Link>
                        </Grid>
                    </Grid>
                </Box>
            </Paper>
        </Container>
    );
};

export default Register;