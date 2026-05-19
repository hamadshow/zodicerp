import React from 'react';
import { usePage } from '@inertiajs/react';
import '../../css/backend/components/_page-content-area.scss';

/**
 * PageContentArea Component - A standard container for page content with animations and layout
 * 
 * @param {React.ReactNode} children - Content to be displayed
 * @param {string} className - Additional CSS classes
 * @param {boolean} animate - Whether to apply the fade-in animation
 * @param {string|React.ReactNode} title - Title or left-side content for the card
 * @param {React.ReactNode} leftContent - Additional content for the left side
 * @param {React.ReactNode} action - Primary action buttons for the right side
 * @param {Function} onBack - Function to handle back button click
 * @param {string} backText - Custom text for back button
 */
const PageContentArea = ({ 
    children, 
    className = "", 
    animate = true,
    title,
    leftContent,
    action,
    onBack,
    backText
}) => {
    const { props } = usePage();
    const localization = props.localization;
    const isRtl = localization?.current_locale === 'ar';

    return (
        <div className={`page-content-container ${animate ? 'fade-in' : ''} ${className}`}>
            {(title || leftContent || action || onBack) && (
                <div className="content-card">
                    <div className="card-header">
                        <div className="header-left">
                            {title && (typeof title === 'string' ? <h2 className="card-title">{title}</h2> : title)}
                            {leftContent}
                        </div>
                        
                        <div className="header-right">
                            {action && <div className="header-action">{action}</div>}
                            {onBack && (
                                <button className="btn btn-outline btn-sm back-button" onClick={onBack}>
                                    <span className="material-icons-outlined" style={{ transform: isRtl ? 'rotate(180deg)' : 'none' }}>
                                        arrow_back
                                    </span>
                                    <span>{backText || (isRtl ? 'رجوع' : 'Back')}</span>
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="card-body">
                        {children}
                    </div>
                </div>
            )}
            {!title && !leftContent && !action && !onBack && children}
        </div>
    );
};

export default PageContentArea;
