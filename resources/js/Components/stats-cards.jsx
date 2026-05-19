import React from 'react';

/**
 * StatsCards Component - Renders a grid of statistic cards
 * 
 * @param {Array} items - Array of objects: { icon: string, bgColor: string, value: string|number, label: string }
 * @param {string} className - Additional CSS classes for the container
 */
const StatsCards = ({ items = [], className = "" }) => {
    if (!items || items.length === 0) return null;

    return (
        <div className={`stats-cards ${className}`}>
            {items.map((item, index) => (
                <div key={index} className="stat-card">
                    <div 
                        className="stat-icon" 
                        style={{ backgroundColor: item.bgColor || 'var(--info-color)' }}
                    >
                        <span className="material-icons-outlined">{item.icon}</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{item.value}</div>
                        <div className="stat-label">{item.label}</div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default StatsCards;
