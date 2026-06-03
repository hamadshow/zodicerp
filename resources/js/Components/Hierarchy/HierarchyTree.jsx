import React, { memo } from 'react';
import HierarchyNode from './HierarchyNode';

const HierarchyTree = ({ 
    data, 
    expandedNodes, 
    loadingNodes,
    onToggle, 
    onSelect, 
    selectedNodes, 
    activeNode,
    config,
    onAction,
    isRtl
}) => {
    console.log("[HierarchyTree] Loading data from database, data length:", data.length);

    return (
        <div className="tree-content d-flex flex-column">
            {data.map(node => (
                <HierarchyNode 
                    key={node.id}
                    node={node}
                    level={0}
                    expandedNodes={expandedNodes}
                    loadingNodes={loadingNodes}
                    onToggle={onToggle}
                    onSelect={onSelect}
                    selectedNodes={selectedNodes}
                    activeNode={activeNode}
                    config={config}
                    onAction={onAction}
                    isRtl={isRtl}
                />
            ))}
            
            {/* Root Add New Button */}
            {data.length > 0 && config.canAddRoot && (
                <div 
                    className="add-new-node-btn mt-3 mx-3"
                    onClick={() => onAction('add_root')}
                    style={{
                        border: '1px dashed #ccc',
                        padding: '12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        color: '#666',
                        fontSize: '13px'
                    }}
                >
                    <i className="fas fa-plus-square me-2" />
                    <span>{config.getAddRootLabel?.() || (isRtl ? 'أضف جديد' : 'Add New')}</span>
                </div>
            )}

            {data.length === 0 && (
                <div className="text-center py-5">
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
