// src/components/Login.jsx
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import '../styles/Login.css';

const Login = () => {
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        login(userId);
        navigate('home');
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="logo-container">
                    <img src="/public/Images/HomeLogo.jpeg" alt="Home" />
                </div>

                <h2 className="system-title">Strategic Intelligence & Investigation Division System</h2>
                <h3 className="system-subtitle">(SIIDs)</h3>

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
                        />
                    </div>

                    <div className="remember-me">
                        <input
                            type="checkbox"
                            id="rememberMe"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                        />
                        <label htmlFor="rememberMe">Remember Me</label>
                    </div>

                    <button type="submit" className="login-btn">Login</button>

                    <div className="forgot-password">
                        <a href="/forgot-password">Forgot Password</a>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;