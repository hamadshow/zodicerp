import React, { createContext, useState, useCallback } from 'react';
import NotificationContainer from './NotificationContainer';

export const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const addNotification = useCallback((message, type = 'info', timeout = 5000) => {
        const id = Math.random().toString(36).substring(2, 9);
        
        const newNotification = {
            id,
            message,
            type,
            timeout
        };

        setNotifications((prev) => [...prev, newNotification]);

        if (timeout > 0) {
            setTimeout(() => {
                removeNotification(id);
            }, timeout);
        }

        return id;
    }, []);

    const removeNotification = useCallback((id) => {
        setNotifications((prev) => prev.filter((notification) => notification.id !== id));
    }, []);

    const showSuccess = useCallback((message, timeout) => addNotification(message, 'success', timeout), [addNotification]);
    const showError = useCallback((message, timeout) => addNotification(message, 'error', timeout), [addNotification]);
    const showWarning = useCallback((message, timeout) => addNotification(message, 'warning', timeout), [addNotification]);
    const showInfo = useCallback((message, timeout) => addNotification(message, 'info', timeout), [addNotification]);

    const value = {
        showSuccess,
        showError,
        showWarning,
        showInfo,
        removeNotification
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
            <NotificationContainer 
                notifications={notifications} 
                onClose={removeNotification} 
            />
        </NotificationContext.Provider>
    );
};
