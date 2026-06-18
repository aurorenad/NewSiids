import React, { createContext, useState, useEffect, useRef } from 'react';
import { connectWebSocket, disconnectWebSocket } from '../websocket.js';
import caseApi from '../api/Axios/caseApi';
import { toast } from 'sonner';

export const NotificationContext = createContext();

const notificationRequestCache = {
    employeeId: '',
    promise: null,
    data: null,
    timestamp: 0
};

const fetchNotificationsOnce = async (employeeId) => {
    const now = Date.now();

    if (notificationRequestCache.employeeId === employeeId && notificationRequestCache.promise) {
        return notificationRequestCache.promise;
    }

    if (
        notificationRequestCache.employeeId === employeeId &&
        notificationRequestCache.data &&
        now - notificationRequestCache.timestamp < 1000
    ) {
        return notificationRequestCache.data;
    }

    notificationRequestCache.employeeId = employeeId;
    notificationRequestCache.promise = caseApi.get(`/api/notifications/employee/${employeeId}`)
        .then((response) => {
            notificationRequestCache.data = response.data || [];
            notificationRequestCache.timestamp = Date.now();
            return notificationRequestCache.data;
        })
        .finally(() => {
            notificationRequestCache.promise = null;
        });

    return notificationRequestCache.promise;
};

export const NotificationProvider = ({ children, employeeId }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const seenNotificationIds = useRef(new Set());

    useEffect(() => {
        // Fetch initial notifications with better error handling
        const fetchNotifications = async () => {
            if (!employeeId) return;
            try {
                const data = await fetchNotificationsOnce(employeeId);
                seenNotificationIds.current = new Set(data.map(item => item.id).filter(Boolean));
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.read).length);
            } catch (err) {
                console.error('Failed to fetch notifications:', err);
                // Set empty array as fallback
                setNotifications([]);
                setUnreadCount(0);
            }
        };

        fetchNotifications();

        // Setup WebSocket
        connectWebSocket(
            employeeId,
            (notification) => {
                if (notification.id && seenNotificationIds.current.has(notification.id)) {
                    return;
                }
                if (notification.id) {
                    seenNotificationIds.current.add(notification.id);
                }
                setNotifications(prev => {
                    return [notification, ...prev];
                });
                if (!notification.read) {
                    setUnreadCount(prev => prev + 1);
                }
                
                // Trigger toast notification
                toast.info(notification.message, {
                    description: notification.senderName ? `From: ${notification.senderName}` : '',
                    duration: 5000,
                });
            },
            (error) => console.error('WebSocket error:', error)
        );

        return () => disconnectWebSocket();
    }, [employeeId]);

    const markAsRead = async (id) => {
        if (!id) return;
        try {
            await caseApi.put(`/api/notifications/${id}/read`, {});

            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Mark as read error:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await caseApi.put(`/api/notifications/employee/${employeeId}/read-all`, {});

            setNotifications(prev =>
                prev.map(n => ({ ...n, read: true }))
            );
            setUnreadCount(0);
        } catch (error) {
            console.error('Mark all as read error:', error);
        }
    };

    return (
        <NotificationContext.Provider
            value={{ notifications, unreadCount, markAsRead, markAllAsRead }}
        >
            {children}
        </NotificationContext.Provider>
    );
};
