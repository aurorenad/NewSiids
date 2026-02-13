import React, { createContext, useState, useEffect } from 'react';
import { connectWebSocket, disconnectWebSocket } from '../websocket.js';
import caseApi from '../api/Axios/caseApi';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children, employeeId }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        // Fetch initial notifications with better error handling
        const fetchNotifications = async () => {
            if (!employeeId) return;
            try {
                const response = await caseApi.get(`/api/notifications/employee/${employeeId}`);
                const data = response.data;
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
                setNotifications(prev => [notification, ...prev]);
                setUnreadCount(prev => prev + 1);
            },
            (error) => console.error('WebSocket error:', error)
        );

        return () => disconnectWebSocket();
    }, [employeeId]);

    const markAsRead = async (id) => {
        try {
            await caseApi.put(`/api/notifications/${id}/read`, {}, {
                headers: {
                    'employee_id': employeeId
                }
            });

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
            await caseApi.put(`/api/notifications/employee/${employeeId}/read-all`, {}, {
                headers: {
                    'employee_id': employeeId
                }
            });

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