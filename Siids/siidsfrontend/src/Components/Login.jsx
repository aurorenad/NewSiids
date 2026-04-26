import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import axios from '../api/axios.jsx';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    CircularProgress,
    FormControlLabel,
    IconButton,
    InputAdornment,
    Link,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { Person, Lock, Visibility, VisibilityOff } from '@mui/icons-material';
import AuthLayout from './ui/AuthLayout.jsx';

const Login = () => {
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, authState } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        if (authState?.token) {
            navigate('/home', { replace: true });
        }
    }, [authState, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await axios.post('/login', {
                username: userId.trim(),
                password: password
            });

            const data = response.data;

            if (data?.token) {
                try {
                    const employeeId = data.employeeId || data.employee_id || userId.trim();
                    const name = data.name || '';
                    const role = data.role || '';

                    login(userId.trim(), data.token, employeeId, name, rememberMe, role);
                    // Navigation happens in useEffect
                } catch (loginError) {
                    console.error('Login context error:', loginError);
                    setError('Internal authentication error. Please try again.');
                }
            } else {
                setError(data?.error || data?.message || 'Invalid login response - missing token');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError(err.response?.data?.error || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout maxWidth="xs">
            <Card
                elevation={4}
                sx={{
                    borderRadius: 4,
                    border: 'none',
                    boxShadow: '0 8px 40px rgba(21,101,192,0.12), 0 2px 8px rgba(0,0,0,0.06)',
                    overflow: 'visible',
                }}
            >
                <CardContent sx={{ p: 4 }}>
                    <Stack spacing={3}>
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <Box
                                component="img"
                                src="/Images/HomeLogo.jpeg"
                                alt="Home Logo"
                                sx={{
                                    width: 90,
                                    height: 90,
                                    borderRadius: '50%',
                                    objectFit: 'contain',
                                    border: '3px solid',
                                    borderColor: 'primary.light',
                                    bgcolor: '#fff',
                                    p: 0.5,
                                    boxShadow: '0 4px 14px rgba(21,101,192,0.15)',
                                }}
                            />
                        </Box>

                        <Box textAlign="center">
                            <Typography variant="h6" fontWeight={700} gutterBottom>
                                Strategic Intelligence & Investigation Division System
                            </Typography>
                            <Typography variant="body2" color="text.secondary">(SIIDs)</Typography>
                        </Box>

                        {error && <Alert severity="error">{error}</Alert>}

                        <Box component="form" onSubmit={handleSubmit}>
                            <Stack spacing={2}>
                                <TextField
                                    id="userId"
                                    label="User ID"
                                    value={userId}
                                    onChange={(e) => setUserId(e.target.value)}
                                    required
                                    disabled={loading}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Person color="action" fontSize="small" />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                                <TextField
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    label="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Lock color="action" fontSize="small" />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    edge="end"
                                                    size="small"
                                                >
                                                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            id="rememberMe"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            disabled={loading}
                                            size="small"
                                        />
                                    }
                                    label={<Typography variant="body2">Remember me</Typography>}
                                />
                                <Button type="submit" disabled={loading} fullWidth sx={{ py: 1.2 }}>
                                    {loading ? <CircularProgress size={22} color="inherit" /> : 'Login'}
                                </Button>
                                <Box textAlign="center">
                                    <Link href="/forgot-password" variant="body2" underline="hover">
                                        Forgot password?
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

export default Login;