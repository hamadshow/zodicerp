import React, { memo } from 'react';
import HierarchyActions from './HierarchyActions';

const HierarchyRowItem = ({ 
    node, 
    index,
    onSelect, 
    activeNode,
    config,
    onAction,
    isRtl
}) => {
    const isActive = activeNode?.id === node.id;
    const hasChildren = (node.children_count ?? 0) > 0;

    const handleRowClick = (e) => {
        // Navigate deeper into this node if it has children
        if (hasChildren && !e.target.closest('.row-actions')) {
            onAction('navigate_to', node);
        }
        onSelect(node, e.ctrlKey || e.metaKey);
    };

    const getIcon = () => {
        if (config.getIcon) return config.getIcon(node, false);
        return hasChildren ? 'fas fa-folder' : 'far fa-folder';
    };

    // Zebra striping: odd rows get gray background
    const rowClass = index % 2 === 1 ? 'row-striped' : '';

    return (
        <div 
            className={`hierarchy-row-item ${rowClass} ${isActive ? 'active' : ''}`}
            onClick={handleRowClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                minHeight: '64px',
                boxSizing: 'border-box'
            }}
        >
            {/* Left: Actions Menu */}
            <div className="row-actions-left">
                <div className="action-menu-btn" onClick={e => e.stopPropagation()}>
                    <HierarchyActions 
                        node={node} 
                        onAction={onAction} 
                        config={config} 
                        isRtl={isRtl}
                    />
                </div>
            </div>

            {/* Right: Icon, Name, Type */}
            <div className="row-content">
                <div className="row-icon">
                    <i className={getIcon()} />
                </div>
                
                <div className="row-info">
                    <div className="row-name">
                        {node.name_json?.[isRtl ? 'ar' : 'en'] || node.name}
                    </div>
                    {node.location_type && (
                        <div className="row-type">
                            ({node.location_type})
                        </div>
                    )}
                </div>

                {/* Optional: Show folder icon if has children */}
                {hasChildren && (
                    <div className="row-folder-icon">
                        <i className="fas fa-folder" style={{ color: '#0066cc' }} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default memo(HierarchyRowItem);
