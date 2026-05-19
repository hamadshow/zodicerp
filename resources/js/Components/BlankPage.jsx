import React from 'react';
import NavigationLink from './NavigationLink';

/**
 * BlankPage Component - A universal container for ERP pages
 * 
 * @param {Array} breadcrumbs - Array of { label, href, onClick }
 * @param {React.ReactNode} stats - StatsCards component or similar
 * @param {React.ReactNode} filters - FilterTabs component or similar
 * @param {React.ReactNode} children - The main content (tables, forms, etc.)
 * @param {string} className - Additional CSS classes
 */
const BlankPage = ({ 
    breadcrumbs = [], 
    stats, 
    filters, 
    children, 
    className = "" 
}) => {
    return (
        <div className={`blank-page-wrapper ${className}`}>
            {/* Breadcrumbs Section */}
            {breadcrumbs.length > 0 && (
                <NavigationLink links={breadcrumbs} className="mb-6" />
            )}

            {/* Statistics Section */}
            {stats && (
                <div className="page-stats-section mb-6">
                    {stats}
                </div>
            )}

            {/* Filters/Tabs Section */}
            {filters && (
                <div className="page-filters-section mb-6">
                    {filters}
                </div>
            )}

            {/* Main Content Area */}
            <div className="page-content-area">
                {children}
            </div>
        </div>
    );
};

export default BlankPage;
