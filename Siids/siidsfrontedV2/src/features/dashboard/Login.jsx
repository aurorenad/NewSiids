import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield, KeyRound, User, AlertCircle } from 'lucide-react';
import './Login.css';

export const Login = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please input your credentials.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const userProfile = await login(username, password);
      // Route dynamically depending on user profiles
      if (userProfile.role === 'SURVEILLANCE_OFFICER') {
        navigate('/surveillance');
      } else if (userProfile.role === 'STOCK_MANAGER') {
        navigate('/stock-manager');
      } else if (userProfile.role === 'PRSO' || userProfile.role === 'DEPUTY_PRSO') {
        navigate('/prso');
      } else if (userProfile.role === 'ASSISTANT_COMMISSIONER') {
        navigate('/ac');
      } else if (userProfile.role === 'DIRECTOR_OF_INTELLIGENCE') {
        navigate('/doi');
      } else if (userProfile.role === 'DIRECTOR_OF_INVESTIGATION') {
        navigate('/investigation-director');
      } else if (userProfile.role === 'INVESTIGATION_OFFICER') {
        navigate('/investigation-officer');
      } else if (userProfile.role === 'INTELLIGENCE_OFFICER') {
        navigate('/intelligence-officer');
      } else if (userProfile.role === 'Admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.error?.message || 'Login attempt failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="siids-login-page">
      <div className="login-visual-card glass-panel">
        <div className="login-brand-header">
          <img src="/Images/HomeLogo.jpeg" alt="RRA Logo" className="login-brand-logo-img" />
          <h1>SIIDS</h1>
          <p>Rwanda Revenue Authority · Intelligence & Enforcement Division</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label>Username</label>
            <div className="input-field-wrapper">
              <User size={16} className="input-icon" />
              <input
                type="text"
                placeholder="Enter RRA username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="input-group">
            <div className="label-row">
              <label>Password</label>
              <Link to="/forgot-password" className="forgot-pw-btn">Forgot Password?</Link>
            </div>
            <div className="input-field-wrapper">
              <KeyRound size={16} className="input-icon" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="login-error-wrapper">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer-info">
          Authorized personnel only. All access and transactions are monitored and audited.
        </div>
      </div>
    </div>
  );
};
export default Login;
