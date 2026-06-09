import { useContext } from 'react';
import { NotificationContext } from './NotificationProvider';

/**
 * Custom hook to use the notification system.
 * Returns functions to show different types of notifications.
 */
export const useNotification = () => {
    const context = useContext(NotificationContext);

    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }

    return context;
};
