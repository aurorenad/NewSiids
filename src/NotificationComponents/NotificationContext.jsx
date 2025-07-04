import React, { createContext, useState, useEffect } from 'react';
import { connectWebSocket, disconnectWebSocket } from '../../websocket.js';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children, employeeId }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        // Fetch initial notifications
        fetch(`/api/notifications/employee/${employeeId}`)
            .then(res => res.json())
            .then(data => {
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.read).length);
            })
            .catch(err => console.error('Fetch error:', err));

        // Setup WebSocket
        connectWebSocket(
            employeeId,
            (notification) => {
                setNotifications(prev => [notification, ...prev]);
                setUnreadCount(prev => prev + 1);
            },
            (error) => console.error(error)
        );

        return () => disconnectWebSocket();
    }, [employeeId]);

    const markAsRead = async (id) => {
        try {
            await fetch(`/api/notifications/${id}/read`, {
                method: 'PUT',
                headers: { 'employee_id': employeeId }
            });

            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, read: true } : n)
            );
            setUnreadCount(prev => prev - 1);
        } catch (error) {
            console.error('Mark as read error:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await fetch(`/api/notifications/employee/${employeeId}/read-all`, {
                method: 'PUT',
                headers: { 'employee_id': employeeId }
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