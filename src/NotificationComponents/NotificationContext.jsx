import React, { createContext, useState, useEffect } from 'react';
import { connectWebSocket, disconnectWebSocket } from '../../websocket.js';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children, employeeId }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        // Fetch initial notifications with better error handling
        const fetchNotifications = async () => {
            try {
                const response = await fetch(`/api/notifications/employee/${employeeId}`);

                // Check if response is ok and content-type is JSON
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('Response is not JSON');
                }

                const data = await response.json();
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
            const response = await fetch(`/api/notifications/${id}/read`, {
                method: 'PUT',
                headers: {
                    'employee_id': employeeId,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

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
            const response = await fetch(`/api/notifications/employee/${employeeId}/read-all`, {
                method: 'PUT',
                headers: {
                    'employee_id': employeeId,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

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