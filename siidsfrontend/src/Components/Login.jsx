import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import axios from '../api/axios.jsx';
import '../styles/Login.css';
import { Grid, Link } from '@mui/material';

const Login = () => {
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
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
            console.log('Attempting login with userId:', userId.trim());

            const response = await axios.post('/login', {
                username: userId.trim(),
                password: password
            });

            const data = response.data;
            console.log('Login response:', data);

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
        <div className="login-container">
            <div className="login-card">
                <div className="logo-container">
                    <img src="/Images/HomeLogo.jpeg" alt="Home Logo" />
                </div>

                <h2 className="system-title">
                    Strategic Intelligence & Investigation Division System
                </h2>
                <h3 className="system-subtitle">(SIIDs)</h3>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="userId">
                            <i className="fa fa-user"></i> User ID
                        </label>
                        <input
                            type="text"
                            id="userId"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">
                            <i className="fa fa-lock"></i> Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="remember-me">
                        <input
                            type="checkbox"
                            id="rememberMe"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            disabled={loading}
                        />
                        <label htmlFor="rememberMe">Remember me</label>
                    </div>

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>

                    <div className="forgot-password">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                                <Link href="/forgot-password" variant="body2">
                                    Forgot password?
                                </Link>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;