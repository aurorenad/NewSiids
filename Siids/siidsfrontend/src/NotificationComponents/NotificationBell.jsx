import React, { useState, useContext, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationContext } from './NotificationContext';
import {
    IconButton,
    Badge,
    Paper,
    Typography,
    Box,
    Button,
    Divider,
    Fade,
    Chip,
} from '@mui/material';
import { 
    NotificationsOutlined, 
    DoneAll, 
    Inventory, 
    AssignmentReturn, 
    LocalShipping, 
    CheckCircleOutline, 
    ErrorOutline,
    InfoOutlined,
    Close
} from '@mui/icons-material';

export const NotificationBell = () => {
    const [open, setOpen] = useState(false);
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useContext(NotificationContext);
    const ref = useRef(null);
    const navigate = useNavigate();

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = async (notification) => {
        // Mark as read
        if (!notification.read) {
            await markAsRead(notification.id);
        }

        // Navigation logic based on notification type
        switch (notification.notificationType) {
            case 'NEW_INTAKE':
            case 'INTAKE_CORRECTED':
                navigate('/stock/inventory');
                break;
            case 'SEIZURE_RETURNED':
            case 'INTAKE_APPROVED':
                navigate('/pv/temporary-stock');
                break;
            case 'RELEASE_REQUESTED':
                navigate('/prso/approvals');
                break;
            case 'RELEASE_APPROVED':
            case 'RELEASE_REJECTED':
                navigate('/stock/inventory');
                break;
            case 'REPORT_UPDATE':
            case 'DEPARTMENT_NOTIFICATION':
                if (notification.reportId) {
                    navigate(`/view-report/${notification.reportId}`);
                }
                break;
            default:
                break;
        }

        // Close the notification bar
        setOpen(false);
    };

    const getIconForType = (type) => {
        switch (type) {
            case 'NEW_INTAKE':
            case 'INTAKE_CORRECTED':
                return <Inventory color="primary" fontSize="small" />;
            case 'SEIZURE_RETURNED':
                return <AssignmentReturn color="warning" fontSize="small" />;
            case 'RELEASE_REQUESTED':
                return <LocalShipping color="info" fontSize="small" />;
            case 'RELEASE_APPROVED':
            case 'INTAKE_APPROVED':
                return <CheckCircleOutline color="success" fontSize="small" />;
            case 'RELEASE_REJECTED':
                return <ErrorOutline color="error" fontSize="small" />;
            default:
                return <InfoOutlined color="action" fontSize="small" />;
        }
    };

    const formatMessage = (message) => {
        if (message.includes('Action Required:')) {
            const parts = message.split('Action Required:');
            return (
                <>
                    <Typography component="span" variant="body2" color="error.main" fontWeight={800}>
                        Action Required:
                    </Typography>
                    {parts[1]}
                </>
            );
        }
        if (message.includes('Authorization Required:')) {
            const parts = message.split('Authorization Required:');
            return (
                <>
                    <Typography component="span" variant="body2" color="warning.main" fontWeight={800}>
                        Authorization Required:
                    </Typography>
                    {parts[1]}
                </>
            );
        }
        return message;
    };

    return (
        <Box ref={ref} sx={{ position: 'relative' }}>
            <IconButton
                onClick={() => setOpen(!open)}
                size="small"
                aria-label="Notifications"
                sx={{
                    color: unreadCount > 0 ? '#dc2626' : 'text.secondary',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': { 
                        bgcolor: 'action.hover',
                        transform: 'scale(1.1)'
                    },
                }}
            >
                <Badge
                    badgeContent={unreadCount}
                    color="error"
                    max={99}
                    sx={{
                        '& .MuiBadge-badge': {
                            fontSize: '0.7rem',
                            minWidth: 20,
                            height: 20,
                            fontWeight: 800,
                            border: '2px solid white',
                            boxShadow: '0 0 0 2px rgba(220, 38, 38, 0.2)',
                            animation: unreadCount > 0 ? 'pulse 2s infinite' : 'none',
                        },
                        '@keyframes pulse': {
                            '0%': { boxShadow: '0 0 0 0 rgba(220, 38, 38, 0.4)' },
                            '70%': { boxShadow: '0 0 0 10px rgba(220, 38, 38, 0)' },
                            '100%': { boxShadow: '0 0 0 0 rgba(220, 38, 38, 0)' },
                        }
                    }}
                >
                    <NotificationsOutlined fontSize="medium" />
                </Badge>
            </IconButton>

            <Fade in={open}>
                <Paper
                    elevation={12}
                    sx={{
                        position: 'absolute',
                        right: 0,
                        top: 'calc(100% + 12px)',
                        width: 400,
                        maxHeight: 550,
                        overflow: 'hidden',
                        display: open ? 'flex' : 'none',
                        flexDirection: 'column',
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        zIndex: 1300,
                        boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)',
                    }}
                >
                    {/* Header */}
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        px: 2.5, 
                        py: 2,
                        background: 'linear-gradient(to right, #f8fafc, #ffffff)'
                    }}>
                        <Typography variant="h6" fontSize="1.1rem" fontWeight={800} color="text.primary">
                            Notifications
                            {unreadCount > 0 && (
                                <Chip 
                                    label={`${unreadCount} New`} 
                                    size="small" 
                                    color="error" 
                                    sx={{ ml: 1.5, height: 20, fontSize: '0.65rem', fontWeight: 700 }} 
                                />
                            )}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {unreadCount > 0 && (
                                <Button
                                    size="small"
                                    startIcon={<DoneAll fontSize="small" />}
                                    onClick={markAllAsRead}
                                    sx={{ 
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        textTransform: 'none',
                                        borderRadius: 2
                                    }}
                                >
                                    Mark all
                                </Button>
                            )}
                            <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: 'text.disabled' }}>
                                <Close fontSize="small" />
                            </IconButton>
                        </Box>
                    </Box>
                    <Divider />

                    {/* List */}
                    <Box sx={{ overflowY: 'auto', flex: 1, bgcolor: '#fdfdfd' }}>
                        {notifications.length === 0 ? (
                            <Box sx={{ py: 8, textAlign: 'center' }}>
                                <NotificationsOutlined sx={{ fontSize: 50, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
                                <Typography variant="body1" fontWeight={500} color="text.secondary">All caught up!</Typography>
                                <Typography variant="body2" color="text.disabled">No new notifications to show</Typography>
                            </Box>
                        ) : (
                            notifications.map((notification) => (
                                <Box
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    sx={{
                                        px: 2.5,
                                        py: 2,
                                        cursor: 'pointer',
                                        borderBottom: '1px solid',
                                        borderColor: 'divider',
                                        bgcolor: notification.read ? 'transparent' : 'rgba(21,101,192,0.03)',
                                        transition: 'all 0.2s',
                                        position: 'relative',
                                        '&:hover': { 
                                            bgcolor: 'rgba(0,0,0,0.02)',
                                            pl: 3
                                        },
                                        borderLeft: notification.read ? 'none' : '4px solid',
                                        borderLeftColor: 'primary.main',
                                    }}
                                >
                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        <Box sx={{ mt: 0.5 }}>
                                            {getIconForType(notification.notificationType)}
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography 
                                                variant="body2" 
                                                fontWeight={notification.read ? 400 : 700} 
                                                sx={{ 
                                                    mb: 0.75, 
                                                    lineHeight: 1.5,
                                                    color: notification.read ? 'text.secondary' : 'text.primary'
                                                }}
                                            >
                                                {formatMessage(notification.message)}
                                            </Typography>
                                            
                                            {notification.relatedReference && (
                                                <Chip 
                                                    label={notification.relatedReference} 
                                                    size="small" 
                                                    variant="outlined"
                                                    sx={{ 
                                                        height: 20, 
                                                        fontSize: '0.65rem', 
                                                        fontWeight: 600, 
                                                        mb: 1,
                                                        borderColor: 'divider'
                                                    }} 
                                                />
                                            )}

                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 500 }}>
                                                    {new Date(notification.createdAt).toLocaleString(undefined, {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </Typography>
                                                {notification.senderName && (
                                                    <Typography variant="caption" sx={{ 
                                                        color: 'primary.main', 
                                                        fontWeight: 700,
                                                        bgcolor: 'rgba(25, 118, 210, 0.08)',
                                                        px: 1,
                                                        py: 0.25,
                                                        borderRadius: 1
                                                    }}>
                                                        {notification.senderName}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>
                                    </Box>
                                </Box>
                            ))
                        )}
                    </Box>

                    <Divider />
                    <Box sx={{ p: 1.5, textAlign: 'center', bgcolor: '#f8fafc' }}>
                        <Button 
                            variant="outlined" 
                            size="small" 
                            fullWidth
                            onClick={() => setOpen(false)}
                            startIcon={<Close fontSize="small" />}
                            sx={{ 
                                borderRadius: 2, 
                                textTransform: 'none', 
                                fontWeight: 700,
                                color: 'text.secondary',
                                borderColor: 'divider',
                                '&:hover': {
                                    borderColor: 'text.disabled',
                                    bgcolor: 'white'
                                }
                            }}
                        >
                            Dismiss Window
                        </Button>
                    </Box>
                </Paper>
            </Fade>
        </Box>
    );
};