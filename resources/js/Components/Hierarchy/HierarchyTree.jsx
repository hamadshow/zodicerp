import React, { memo } from 'react';
import HierarchyRowItem from './HierarchyRowItem';

const HierarchyTree = ({ 
    data, 
    onSelect, 
    activeNode,
    config,
    onAction,
    isRtl
}) => {
    console.log("[HierarchyTree] Flat list data length:", data.length);

    return (
        <div className="hierarchy-row-list">
            {data.length > 0 ? (
                data.map((node, index) => (
                    <HierarchyRowItem 
                        key={node.id}
                        node={node}
                        index={index}
                        onSelect={onSelect}
                        activeNode={activeNode}
                        config={config}
                        onAction={onAction}
                        isRtl={isRtl}
                    />
                ))
            ) : (
                <div className="hierarchy-empty-state">
                    <i className="fas fa-sitemap d-block mb-3 text-muted" style={{ fontSize: '3rem' }} />
                    <p className="mb-3 text-muted">{isRtl ? 'لا توجد مواقع' : 'No Locations Found'}</p>
                    <button 
                        className="btn btn-primary"
                        onClick={() => onAction('add_root')}
                    >
                        {isRtl ? 'أنشئ أول موقع' : 'Create First Location'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default memo(HierarchyTree);
