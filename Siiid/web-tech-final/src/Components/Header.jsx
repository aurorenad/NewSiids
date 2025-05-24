import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import 'font-awesome/css/font-awesome.min.css';
import '../styles/Header.css';

const Header = () => {
    const { currentUser, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const [notifications, setNotifications] = useState([
        { id: 1, message: 'New case assigned' },
        { id: 2, message: 'System update at 10PM' },
    ]);
    const [isOpen, setIsOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const toggleDropdown = () => {
        setIsOpen(!isOpen);
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
                    <div className="notifications" onClick={toggleDropdown}>
                        <i className="fa fa-bell"></i>
                        {notifications.length > 0 && (
                            <span className="notification-badge">{notifications.length}</span>
                        )}
                        {isOpen && (
                            <div className="notification-dropdown">
                                {notifications.map((n) => (
                                    <div key={n.id} className="notification-item">
                                        {n.message}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>
                        <i className="fa fa-sign-out"></i>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
