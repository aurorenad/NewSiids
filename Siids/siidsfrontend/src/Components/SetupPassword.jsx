import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from '../api/axios';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Lock, Visibility, VisibilityOff } from '@mui/icons-material';
import AuthLayout from './ui/AuthLayout.jsx';

const SetupPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Invalid setup link. Please request a new password setup email.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/setup-password', { token, newPassword });
      setSuccess(response.data.message || 'Password created successfully. You can now login.');
      setTimeout(() => navigate(ROUTES.LOGIN), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create password. Please request a new setup link.');
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
              Create Your SIIDS Password
            </Typography>

            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}

            <form onSubmit={handleSubmit}>
              <Stack spacing={2}>
                {!token && (
                  <Alert severity="warning">
                    This setup link is missing its security token. Please use the link from your email.
                  </Alert>
                )}
                <TextField
                  label="New Password"
                  helperText="Use at least 8 characters."
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
                        <IconButton onClick={() => setShowPassword((prev) => !prev)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="Confirm Password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <Button type="submit" fullWidth disabled={loading || !token} sx={{ py: 1.2 }}>
                  {loading ? <CircularProgress size={22} color="inherit" /> : 'Create Password'}
                </Button>
                <Box textAlign="center">
                  <Link href="/" variant="body2" underline="hover">
                    Back to login
                  </Link>
                </Box>
              </Stack>
            </form>
          </Stack>
        </CardContent>
      </Card>
    </AuthLayout>
  );
};

export default SetupPassword;
