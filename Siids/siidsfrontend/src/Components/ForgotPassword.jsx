import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import {
    Link,
    TextField,
    Button,
    Typography,
    Box,
    CircularProgress,
    Alert,
    Card,
    CardContent,
    Stack,
    Stepper,
    Step,
    StepLabel,
    InputAdornment,
    IconButton,
} from '@mui/material';
import { Person, Pin, Lock, Visibility, VisibilityOff } from '@mui/icons-material';
import AuthLayout from './ui/AuthLayout.jsx';

const STEPS = ['Request OTP', 'Verify OTP', 'Reset Password'];

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleRequestOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const response = await axios.post('/forgot-password', { username: email });
            setSuccess(response.data.message || 'OTP sent to your registered email');
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const response = await axios.post('/verify-otp', { username: email, otp });
            setSuccess(response.data.message || 'OTP verified successfully');
            setStep(3);
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }
        try {
            const response = await axios.post('/reset-password', { username: email, otp, newPassword });
            setSuccess(response.data.message || 'Password reset successfully. You can now login.');
            setTimeout(() => navigate('/'), 2000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to reset password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout maxWidth="sm">
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 4 }}>
                    <Stack spacing={3}>
                        <Typography variant="h6" textAlign="center" fontWeight={700}>
                            {step === 1 ? 'Forgot Password' : step === 2 ? 'Verify OTP' : 'Reset Password'}
                        </Typography>

                        <Stepper activeStep={step - 1} alternativeLabel>
                            {STEPS.map((label) => (
                                <Step key={label}>
                                    <StepLabel>{label}</StepLabel>
                                </Step>
                            ))}
                        </Stepper>

                        {error && <Alert severity="error">{error}</Alert>}
                        {success && <Alert severity="success">{success}</Alert>}

                        {step === 1 && (
                            <form onSubmit={handleRequestOtp}>
                                <Stack spacing={2}>
                                    <TextField
                                        label="Employee ID / Username"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
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
                                    <Button type="submit" fullWidth disabled={loading} sx={{ py: 1.2 }}>
                                        {loading ? <CircularProgress size={22} color="inherit" /> : 'Send OTP'}
                                    </Button>
                                    <Box textAlign="center">
                                        <Link href="/" variant="body2" underline="hover">
                                            Remember your password? Login
                                        </Link>
                                    </Box>
                                </Stack>
                            </form>
                        )}

                        {step === 2 && (
                            <form onSubmit={handleVerifyOtp}>
                                <Stack spacing={2}>
                                    <Typography variant="body2" color="text.secondary">
                                        We've sent a 6-digit OTP to your registered email address.
                                    </Typography>
                                    <TextField
                                        label="OTP"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        required
                                        disabled={loading}
                                        inputProps={{ maxLength: 6 }}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Pin color="action" fontSize="small" />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                    <Button type="submit" fullWidth disabled={loading} sx={{ py: 1.2 }}>
                                        {loading ? <CircularProgress size={22} color="inherit" /> : 'Verify OTP'}
                                    </Button>
                                    <Button variant="outlined" fullWidth onClick={() => setStep(1)} disabled={loading}>
                                        Back
                                    </Button>
                                </Stack>
                            </form>
                        )}

                        {step === 3 && (
                            <form onSubmit={handleResetPassword}>
                                <Stack spacing={2}>
                                    <TextField
                                        label="New Password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
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
                                                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                                                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                    <TextField
                                        label="Confirm New Password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        disabled={loading}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Lock color="action" fontSize="small" />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                    <Button type="submit" fullWidth disabled={loading} sx={{ py: 1.2 }}>
                                        {loading ? <CircularProgress size={22} color="inherit" /> : 'Reset Password'}
                                    </Button>
                                    <Button variant="outlined" fullWidth onClick={() => setStep(2)} disabled={loading}>
                                        Back
                                    </Button>
                                </Stack>
                            </form>
                        )}
                    </Stack>
                </CardContent>
            </Card>
        </AuthLayout>
    );
};

export default ForgotPassword;