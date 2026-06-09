import React from 'react';
import Notification from './Notification';
import './notification.scss';

const NotificationContainer = ({ notifications, onClose }) => {
    return (
        <div className="notification-container">
            {notifications.map((notification) => (
                <Notification
                    key={notification.id}
                    notification={notification}
                    onClose={() => onClose(notification.id)}
                />
            ))}
        </div>
    );
};

export default NotificationContainer;
