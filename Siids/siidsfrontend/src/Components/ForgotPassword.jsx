import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import {
    Grid,
    Link,
    TextField,
    Button,
    Typography,
    Box,
    CircularProgress,
    Alert,
    Paper
} from '@mui/material';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [step, setStep] = useState(1); // 1: request OTP, 2: verify OTP, 3: reset password
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
            const response = await axios.post('/verify-otp', {
                username: email,
                otp
            });
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
            const response = await axios.post('/reset-password', {
                username: email,
                otp,
                newPassword
            });
            setSuccess(response.data.message || 'Password reset successfully. You can now login.');
            setTimeout(() => navigate('/'), 2000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to reset password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                bgcolor: 'background.default',
                p: 2
            }}
        >
            <Paper
                elevation={3}
                sx={{
                    p: 4,
                    width: '100%',
                    maxWidth: 500,
                    borderRadius: 2
                }}
            >
                <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 4 }}>
                    {step === 1 ? 'Forgot Password' :
                        step === 2 ? 'Verify OTP' :
                            'Reset Password'}
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}

                {success && (
                    <Alert severity="success" sx={{ mb: 3 }}>
                        {success}
                    </Alert>
                )}

                {step === 1 && (
                    <form onSubmit={handleRequestOtp}>
                        <TextField
                            fullWidth
                            label="Employee ID/Username"
                            variant="outlined"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            margin="normal"
                            required
                            disabled={loading}
                        />
                        <Button
                            fullWidth
                            variant="contained"
                            type="submit"
                            disabled={loading}
                            sx={{ mt: 3, mb: 2 }}
                        >
                            {loading ? <CircularProgress size={24} /> : 'Send OTP'}
                        </Button>
                        <Grid container justifyContent="flex-end">
                            <Grid item>
                                <Link href="/" variant="body2">
                                    Remember your password? Login
                                </Link>
                            </Grid>
                        </Grid>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleVerifyOtp}>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                            We've sent a 6-digit OTP to your registered email address.
                        </Typography>
                        <TextField
                            fullWidth
                            label="OTP"
                            variant="outlined"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            margin="normal"
                            required
                            disabled={loading}
                            inputProps={{ maxLength: 6 }}
                        />
                        <Button
                            fullWidth
                            variant="contained"
                            type="submit"
                            disabled={loading}
                            sx={{ mt: 3, mb: 2 }}
                        >
                            {loading ? <CircularProgress size={24} /> : 'Verify OTP'}
                        </Button>
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => setStep(1)}
                            disabled={loading}
                            sx={{ mb: 2 }}
                        >
                            Back
                        </Button>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleResetPassword}>
                        <TextField
                            fullWidth
                            label="New Password"
                            type="password"
                            variant="outlined"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            margin="normal"
                            required
                            disabled={loading}
                        />
                        <TextField
                            fullWidth
                            label="Confirm New Password"
                            type="password"
                            variant="outlined"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            margin="normal"
                            required
                            disabled={loading}
                        />
                        <Button
                            fullWidth
                            variant="contained"
                            type="submit"
                            disabled={loading}
                            sx={{ mt: 3, mb: 2 }}
                        >
                            {loading ? <CircularProgress size={24} /> : 'Reset Password'}
                        </Button>
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => setStep(2)}
                            disabled={loading}
                            sx={{ mb: 2 }}
                        >
                            Back
                        </Button>
                    </form>
                )}
            </Paper>
        </Box>
    );
};

export default ForgotPassword;