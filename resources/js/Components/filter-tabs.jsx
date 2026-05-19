import React from 'react';

/**
 * FilterTabs Component - Renders a horizontal list of clickable tabs
 * 
 * @param {Array} tabs - Array of objects: { id: string|number, label: string }
 * @param {string|number} activeTab - The ID of the currently active tab
 * @param {Function} onTabChange - Callback function when a tab is clicked
 * @param {string} className - Additional CSS classes for the container
 */
const FilterTabs = ({ tabs = [], activeTab, onTabChange, className = "" }) => {
    if (!tabs || tabs.length === 0) return null;

    return (
        <div className={`filter-tabs ${className}`}>
            {tabs.map((tab) => (
                <div
                    key={tab.id}
                    className={`filter-tab ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => onTabChange && onTabChange(tab.id)}
                >
                    {tab.label}
                </div>
            ))}
        </div>
    );
};

export default FilterTabs;
