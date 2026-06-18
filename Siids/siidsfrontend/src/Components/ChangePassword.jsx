import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Lock, Visibility, VisibilityOff } from '@mui/icons-material';
import axios from '../api/axios.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import { ROUTES } from '../constants/routes';
import AuthLayout from './ui/AuthLayout.jsx';

const ChangePassword = () => {
  const navigate = useNavigate();
  const { markPasswordChanged } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (formData.newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    if (formData.currentPassword === formData.newPassword) {
      setError('New password must be different from your temporary/current password.');
      return;
    }

    try {
      setLoading(true);
      await axios.post('/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      markPasswordChanged();
      navigate(ROUTES.HOME, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout maxWidth="xs">
      <Card
        elevation={4}
        sx={{
          width: '100%',
          maxWidth: 420,
          mx: 'auto',
          borderRadius: 4,
          background: 'rgba(255,255,255,0.96)',
          boxShadow: '0 22px 56px rgba(21,101,192,0.14), 0 8px 20px rgba(15,23,42,0.08)',
        }}
      >
        <CardContent sx={{ px: { xs: 3, sm: 4 }, py: { xs: 3.5, sm: 4.5 } }}>
          <Stack spacing={2.5}>
            <Box textAlign="center">
              <Typography variant="h5" fontWeight={800} gutterBottom>
                Change Your Password
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your account is using a temporary password. Create a private password before continuing.
              </Typography>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="Current temporary password"
                  name="currentPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="action" fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="New password"
                  name="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                  helperText="Use at least 8 characters."
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="action" fontSize="small" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword((current) => !current)}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="Confirm new password"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="action" fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
                <Button type="submit" disabled={loading} fullWidth sx={{ py: 1.2 }}>
                  {loading ? <CircularProgress size={22} color="inherit" /> : 'Change Password'}
                </Button>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </AuthLayout>
  );
};

export default ChangePassword;
