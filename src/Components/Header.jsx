import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import { NotificationBell } from './../NotificationComponents/NotificationBell.jsx';
import { NotificationProvider } from './../NotificationComponents/NotificationContext';
import 'font-awesome/css/font-awesome.min.css';
import '../styles/Header.css';

const Header = () => {
    const { currentUser, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="app-header">
            <div className="header">
                <h1 className="header-title">
                    Strategic Intelligence & Investigation Division System (SIIDS)
                </h1>
                <div className="header-actions">
                    <div className="user-profile">
                        <i className="fa fa-user"></i>
                    </div>
                    {currentUser?.employeeId && (
                        <NotificationProvider employeeId={currentUser.employeeId}>
                            <NotificationBell />
                        </NotificationProvider>
                    )}
                    <button className="logout-btn" onClick={handleLogout}>
                        <i className="fa fa-sign-out"></i>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;