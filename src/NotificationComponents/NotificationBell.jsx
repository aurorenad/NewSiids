import React, { useState, useContext } from 'react';
import { NotificationContext } from './NotificationContext';

export const NotificationBell = () => {
    const [open, setOpen] = useState(false);
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useContext(NotificationContext);

    return (
        <div className="notification-bell">
            <button onClick={() => setOpen(!open)} className="bell-button">
                <span className="bell-icon">🔔</span>
                {unreadCount > 0 && (
                    <span className="badge">{unreadCount}</span>
                )}
            </button>

            {open && (
                <div className="notification-dropdown">
                    <div className="dropdown-header">
                        <h3>Notifications</h3>
                        {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="mark-all-btn">
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="notification-list">
                        {notifications.length === 0 ? (
                            <div className="empty">No notifications</div>
                        ) : (
                            notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={`notification-item ${notification.read ? '' : 'unread'}`}
                                    onClick={() => markAsRead(notification.id)}
                                >
                                    <div className="message">{notification.message}</div>
                                    <div className="meta">
                    <span className="time">
                      {new Date(notification.createdAt).toLocaleString()}
                    </span>
                                        <span className="sender">{notification.senderName}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};