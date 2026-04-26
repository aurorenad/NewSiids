import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import { NotificationBell } from './../NotificationComponents/NotificationBell.jsx';
import {
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Avatar,
    Box,
    Tooltip,
} from '@mui/material';
import { Logout, Person } from '@mui/icons-material';

const Header = () => {
    const { currentUser, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <AppBar position="sticky" sx={{ zIndex: (t) => t.zIndex.drawer - 1 }}>
            <Toolbar sx={{ gap: 2 }}>
                <Typography
                    variant="subtitle1"
                    sx={{ flexGrow: 1, fontWeight: 600, color: 'text.primary' }}
                >
                    Strategic Intelligence & Investigation Division System (SIIDS)
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {currentUser?.name && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.875rem' }}>
                                {currentUser.name.charAt(0).toUpperCase()}
                            </Avatar>
                            <Typography variant="body2" fontWeight={500} color="text.primary">
                                {currentUser.name}
                            </Typography>
                        </Box>
                    )}

                    {currentUser?.employeeId && <NotificationBell />}

                    <Tooltip title="Logout">
                        <IconButton onClick={handleLogout} size="small" sx={{ color: 'text.secondary' }}>
                            <Logout fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Header;