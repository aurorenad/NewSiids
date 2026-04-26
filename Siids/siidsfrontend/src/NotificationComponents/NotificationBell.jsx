import React, { useState, useContext, useRef, useEffect } from 'react';
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
} from '@mui/material';
import { NotificationsOutlined, DoneAll } from '@mui/icons-material';

export const NotificationBell = () => {
    const [open, setOpen] = useState(false);
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useContext(NotificationContext);
    const ref = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <Box ref={ref} sx={{ position: 'relative' }}>
            <IconButton
                onClick={() => setOpen(!open)}
                size="small"
                aria-label="Notifications"
                sx={{
                    color: 'text.secondary',
                    '&:hover': { bgcolor: 'action.hover' },
                }}
            >
                <Badge
                    badgeContent={unreadCount}
                    color="error"
                    max={99}
                    sx={{
                        '& .MuiBadge-badge': {
                            fontSize: '0.65rem',
                            minWidth: 18,
                            height: 18,
                            fontWeight: 700,
                        },
                    }}
                >
                    <NotificationsOutlined fontSize="small" />
                </Badge>
            </IconButton>

            <Fade in={open}>
                <Paper
                    elevation={8}
                    sx={{
                        position: 'absolute',
                        right: 0,
                        top: 'calc(100% + 8px)',
                        width: 360,
                        maxHeight: 420,
                        overflow: 'hidden',
                        display: open ? 'flex' : 'none',
                        flexDirection: 'column',
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        zIndex: 1300,
                    }}
                >
                    {/* Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1.5 }}>
                        <Typography variant="subtitle1" fontWeight={700}>Notifications</Typography>
                        {unreadCount > 0 && (
                            <Button
                                size="small"
                                startIcon={<DoneAll fontSize="small" />}
                                onClick={markAllAsRead}
                                sx={{ fontSize: '0.75rem' }}
                            >
                                Mark all as read
                            </Button>
                        )}
                    </Box>
                    <Divider />

                    {/* List */}
                    <Box sx={{ overflowY: 'auto', flex: 1 }}>
                        {notifications.length === 0 ? (
                            <Box sx={{ py: 4, textAlign: 'center' }}>
                                <NotificationsOutlined sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                                <Typography variant="body2" color="text.secondary">No notifications</Typography>
                            </Box>
                        ) : (
                            notifications.map((notification) => (
                                <Box
                                    key={notification.id}
                                    onClick={() => markAsRead(notification.id)}
                                    sx={{
                                        px: 2,
                                        py: 1.5,
                                        cursor: 'pointer',
                                        borderBottom: '1px solid',
                                        borderColor: 'divider',
                                        bgcolor: notification.read ? 'transparent' : 'rgba(21,101,192,0.04)',
                                        transition: 'background-color 0.15s',
                                        '&:hover': { bgcolor: 'action.hover' },
                                        borderLeft: notification.read ? 'none' : '3px solid',
                                        borderLeftColor: notification.read ? 'transparent' : 'primary.main',
                                    }}
                                >
                                    <Typography variant="body2" fontWeight={notification.read ? 400 : 600} sx={{ mb: 0.5, lineHeight: 1.4 }}>
                                        {notification.message}
                                    </Typography>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="caption" color="text.secondary">
                                            {new Date(notification.createdAt).toLocaleString()}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {notification.senderName}
                                        </Typography>
                                    </Box>
                                </Box>
                            ))
                        )}
                    </Box>

                    {notifications.length > 0 && (
                        <>
                            <Divider />
                            <Box sx={{ textAlign: 'center', py: 1 }}>
                                <Typography variant="caption" color="text.secondary">
                                    Showing {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                                </Typography>
                            </Box>
                        </>
                    )}
                </Paper>
            </Fade>
        </Box>
    );
};