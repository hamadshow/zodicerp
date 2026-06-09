import React, { useState } from 'react';

const Notification = ({ notification, onClose }) => {
    const { message, type } = notification;
    const [isExiting, setIsExiting] = useState(false);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(onClose, 300); // Match animation duration
    };

    const getIcon = () => {
        switch (type) {
            case 'success':
                return 'check_circle';
            case 'error':
                return 'error';
            case 'warning':
                return 'warning';
            case 'info':
            default:
                return 'info';
        }
    };

    return (
        <div className={`notification-item ${type} ${isExiting ? 'exit' : ''}`} role="alert" aria-live="polite">
            <div className="notification-icon">
                <span className="material-icons-outlined">{getIcon()}</span>
            </div>
            <div className="notification-content">
                <p>{message}</p>
            </div>
            <button className="notification-close" onClick={handleClose} aria-label="Close">
                <span className="material-icons-outlined">close</span>
            </button>
        </div>
    );
};

export default Notification;
