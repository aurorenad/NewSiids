import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import './OTPVerificationWizard.css';

export const OTPVerificationWizard = ({ phone, context, onSuccess, onSkip, ownerKnown = true }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes expiry countdown
  const [isResending, setIsResending] = useState(false);

  // Expiry Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const sendOtp = async () => {
    setIsResending(true);
    setError(null);
    try {
      await apiClient.post('/otp/send', { phoneNumber: phone, context });
      setTimeLeft(600); // Reset timer
    } catch (err) {
      setError(err.error?.message || 'Failed to dispatch verification code.');
    } finally {
      setIsResending(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Verification code must contain exactly 6 digits.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/otp/verify', {
        phoneNumber: phone,
        context,
        code
      });
      onSuccess(response.data.data.verificationToken);
    } catch (err) {
      setError(err.error?.message || 'The verification code entered is incorrect.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!ownerKnown) {
    return (
      <div className="otp-wizard-container glass-panel">
        <h4 className="otp-title">Owner Details Unidentified</h4>
        <p className="otp-desc">Owner verification skipped because the owner identity is unknown. An audited record will be created logging this bypass.</p>
        <button type="button" className="otp-btn-secondary" onClick={onSkip}>
          Confirm & Bypass OTP
        </button>
      </div>
    );
  }

  return (
    <div className="otp-wizard-container glass-panel">
      <h4 className="otp-title">Owner Receipt Verification</h4>
      <p className="otp-desc">
        A 6-digit confirmation security code has been dispatched to <strong>{phone}</strong>.
      </p>

      <form onSubmit={handleVerify} className="otp-form">
        <div className="otp-input-row">
          <input
            type="text"
            className="otp-code-input"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            disabled={loading || timeLeft <= 0}
          />
          <button
            type="submit"
            className="otp-btn-primary"
            disabled={loading || code.length !== 6 || timeLeft <= 0}
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
        </div>

        {error && <div className="otp-error-alert">{error}</div>}

        <div className="otp-meta-row">
          <span className="otp-timer-count">
            {timeLeft > 0 ? `Code expires in: ${formatTime(timeLeft)}` : 'Code expired'}
          </span>
          <button
            type="button"
            className="otp-resend-btn"
            disabled={isResending || timeLeft > 540} // Allow resend after 1 min
            onClick={sendOtp}
          >
            {isResending ? 'Resending...' : 'Resend SMS'}
          </button>
        </div>
      </form>
    </div>
  );
};
