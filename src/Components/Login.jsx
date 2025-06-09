import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import axios from '../api/axios.jsx';
import '../styles/Login.css';

const Login = () => {
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(true);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

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

            // Check if we have the required data (token is required, employeeId might come from user data)
            if (data?.token) {
                try {
                    // Use employeeId from response or fallback to userId
                    const employeeId = data.employeeId || data.employee_id || userId.trim();

                    console.log('Login data:', {
                        token: !!data.token,
                        employeeId: employeeId,
                        userId: userId.trim(),
                        fullResponse: data
                    });

                    // Store auth data using the context
                    login(userId.trim(), data.token, employeeId, rememberMe);

                    console.log('Login successful, navigating to /intelligence-officer');

                    // Add a small delay to ensure context updates
                    setTimeout(() => {
                        navigate('/intelligence-officer', { replace: true });
                    }, 100);

                } catch (loginError) {
                    console.error('Login context error:', loginError);
                    setError('Internal authentication error. Please try again.');
                }
            } else {
                console.error('Missing required login data:', {
                    token: !!data?.token,
                    employeeId: !!data?.employeeId,
                    fullResponse: data
                });
                setError(data?.error || data?.message || 'Invalid login response - missing token');
            }
        } catch (err) {
            console.error('Login error:', err);

            let errorMessage = 'Login failed. Please try again.';
            if (err.response) {
                // Server responded with error status
                errorMessage = err.response.data?.error ||
                    err.response.data?.message ||
                    `Server error: ${err.response.status}`;
            } else if (err.request) {
                // Request was made but no response received
                errorMessage = 'No response from server. Check your connection.';
            } else {
                // Something else happened
                errorMessage = err.message || 'Unexpected error occurred';
            }

            setError(errorMessage);
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
                        <a href="/forgot-password">Forgot Password</a>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;