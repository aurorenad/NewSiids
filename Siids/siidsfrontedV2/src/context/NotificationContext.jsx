import React, { createContext, useState, useContext, useEffect } from 'react';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);

  // Toast trigger utility
  const triggerToast = (message, severity = 'INFO', actionUrl = null) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast = { id, message, severity, actionUrl, timestamp: new Date() };
    
    setToasts((prev) => [...prev, newToast]);
    setNotifications((prev) => [newToast, ...prev]);

    // Automatically remove toast alert card after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  useEffect(() => {
    const isMock = import.meta.env.DEV; // Check if running Vite local development

    if (!isMock) {
      // Connect to live backend SSE stream
      const eventSource = new EventSource('/api/v1/notifications/stream');

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          triggerToast(payload.message, payload.severity, payload.actionUrl);
        } catch (e) {
          console.error('Failed to parse SSE payload', e);
        }
      };

      eventSource.onerror = (err) => {
        console.error('SSE connection error, attempting retry...', err);
      };

      return () => {
        eventSource.close();
      };
    } else {
      // Offline/Mock mode simulation: poll local MSW notifications endpoint
      const pollNotifications = async () => {
        try {
          const response = await fetch('/api/v1/notifications');
          const data = await response.json();
          if (data.success && data.data) {
            const fetchedNotifs = data.data;
            
            setNotifications(prev => {
              // Only trigger toasts for new notifications we haven't seen yet
              const newItems = fetchedNotifs.filter(fn => !prev.some(pn => pn.id === fn.id));
              
              newItems.forEach(item => {
                // Use a slight delay to avoid React batching the toast states
                setTimeout(() => triggerToast(item.message, item.severity, item.actionUrl), 100);
              });
              
              if (newItems.length > 0) {
                // Prepend new items to keep the dropdown list sorted newest-first
                return [...newItems, ...prev];
              }
              return prev;
            });
          }
        } catch (e) {
          console.error('Failed to poll notifications', e);
        }
      };

      const interval = setInterval(pollNotifications, 5000); // Poll every 5 seconds
      
      return () => clearInterval(interval);
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{ notifications, toasts, triggerToast, removeToast, clearNotifications }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used inside a NotificationProvider');
  }
  return context;
};
