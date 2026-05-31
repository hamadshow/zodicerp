import React, { memo, useState } from 'react';

const HierarchyFormDrawer = ({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    onSubmit, 
    loading,
    tabs = []
}) => {
    const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'general');

    if (!isOpen) return null;

    return (
        <div className="hierarchy-drawer-overlay" onClick={onClose}>
            <div className="hierarchy-drawer" onClick={e => e.stopPropagation()}>
                <div className="drawer-header">
                    <h3>{title}</h3>
                    <button className="close-btn" onClick={onClose}>
                        <i className="fas fa-times" />
                    </button>
                </div>

                {tabs.length > 0 && (
                    <div className="drawer-tabs">
                        {tabs.map(tab => (
                            <div 
                                key={tab.id}
                                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.label}
                            </div>
                        ))}
                    </div>
                )}

                <div className="drawer-body">
                    {typeof children === 'function' ? children(activeTab) : children}
                </div>

                <div className="drawer-footer">
                    <button className="btn btn-light" onClick={onClose}>Cancel</button>
                    <button 
                        className="btn btn-primary px-4" 
                        onClick={onSubmit}
                        disabled={loading}
                    >
                        {loading ? <i className="fas fa-spinner fa-spin me-2" /> : null}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default memo(HierarchyFormDrawer);
