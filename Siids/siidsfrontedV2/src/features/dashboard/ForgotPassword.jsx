import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { OTPVerificationWizard } from '../../components/ui/OTPVerificationWizard';
import { Shield, KeyRound, Mail, User, ShieldCheck, ArrowLeft, AlertCircle } from 'lucide-react';
import './ForgotPassword.css';

export const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Reset Password, 4: Success
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!username || !email) {
      setError('Please input your username and email address.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/auth/forgot-password', { username, email });
      setStep(2); // Go to OTP verification step
    } catch (err) {
      setError(err.error?.message || 'Failed to dispatch reset code. Verify your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSuccess = () => {
    setStep(3); // Go to new password setup step
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/auth/reset-password', { username, password: newPassword });
      setStep(4); // Go to final success check step
    } catch (err) {
      setError(err.error?.message || 'Password update failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="siids-forgot-pw-page">
      <div className="forgot-pw-visual-card glass-panel">
        <div className="forgot-pw-brand-header">
          <img src="/Images/HomeLogo.jpeg" alt="RRA Logo" className="forgot-pw-brand-logo-img" />
          <h1>SIIDS</h1>
          <p>Account Security Recovery Hub</p>
        </div>

        {/* STEP 1: Enter Username & Email */}
        {step === 1 && (
          <form onSubmit={handleRequestReset} className="forgot-pw-form">
            <div className="input-group">
              <label>RRA Username</label>
              <div className="input-field-wrapper">
                <User size={16} className="input-icon" />
                <input
                  type="text"
                  required
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="input-group">
              <label>Registered RRA Email</label>
              <div className="input-field-wrapper">
                <Mail size={16} className="input-icon" />
                <input
                  type="email"
                  required
                  placeholder="name@rra.gov.rw"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="forgot-pw-error-wrapper">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="forgot-pw-submit-btn" disabled={loading}>
              {loading ? 'Sending Code...' : 'Request Password Reset'}
            </button>

            <Link to="/login" className="back-login-link">
              <ArrowLeft size={12} />
              <span>Back to Login</span>
            </Link>
          </form>
        )}

        {/* STEP 2: Input Verification Code */}
        {step === 2 && (
          <div className="otp-reset-wrapper">
            <OTPVerificationWizard
              phone={email}
              context="PASSWORD_RESET"
              onSuccess={handleOtpSuccess}
              onSkip={handleOtpSuccess}
              ownerKnown={true}
            />
            <button type="button" className="back-link-btn" onClick={() => setStep(1)}>
              <ArrowLeft size={12} />
              <span>Back to step 1</span>
            </button>
          </div>
        )}

        {/* STEP 3: Setup New Password */}
        {step === 3 && (
          <form onSubmit={handleResetSubmit} className="forgot-pw-form">
            <div className="input-group">
              <label>New Password</label>
              <div className="input-field-wrapper">
                <KeyRound size={16} className="input-icon" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="input-group">
              <label>Confirm New Password</label>
              <div className="input-field-wrapper">
                <KeyRound size={16} className="input-icon" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="forgot-pw-error-wrapper">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="forgot-pw-submit-btn" disabled={loading}>
              {loading ? 'Updating Password...' : 'Save New Password'}
            </button>
          </form>
        )}

        {/* STEP 4: Success confirmation */}
        {step === 4 && (
          <div className="forgot-pw-success-screen">
            <ShieldCheck size={48} className="success-badge-icon" />
            <h3>Password Reset Completed</h3>
            <p>Your RRA account security credentials have been successfully updated. You can now login with your new password.</p>
            <button className="forgot-pw-login-btn" onClick={() => navigate('/login')}>
              Return to Sign In
            </button>
          </div>
        )}

        <div className="forgot-pw-footer-info">
          If you encounter issues resetting your security credentials, contact the RRA SIIDS Support Desk (+250 250 500).
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
