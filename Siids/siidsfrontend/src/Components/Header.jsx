import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import { USER_ROLES } from '../constants/roles';
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
import { Logout } from '@mui/icons-material';

const roleLabels = USER_ROLES.reduce((labels, role) => {
    labels[role.value] = role.label;
    return labels;
}, {});

const Header = () => {
    const { currentUser, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const userRole = currentUser?.role ? roleLabels[currentUser.role] || currentUser.role : '';

    const handleLogout = () => {
        logout();
        navigate(ROUTES.LOGIN, { replace: true });
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.1, minWidth: 0 }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.875rem' }}>
                                {currentUser?.name?.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
                                <Typography
                                    variant="body2"
                                    fontWeight={600}
                                    color="text.primary"
                                    noWrap
                                    sx={{ maxWidth: { xs: 130, sm: 220 } }}
                                >
                                    {currentUser?.name}
                                </Typography>
                                {userRole && (
                                    <Typography
                                        component="span"
                                        sx={{
                                            mt: 0.25,
                                            px: 0.75,
                                            py: 0.15,
                                            maxWidth: { xs: 130, sm: 220 },
                                            borderRadius: 999,
                                            bgcolor: 'rgba(25, 118, 210, 0.08)',
                                            color: 'primary.main',
                                            fontSize: '0.6875rem',
                                            fontWeight: 700,
                                            lineHeight: 1.35,
                                            letterSpacing: 0,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                    >
                                        {userRole}
                                    </Typography>
                                )}
                            </Box>
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
