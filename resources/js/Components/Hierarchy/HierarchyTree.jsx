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
            {config.canAddRoot && (
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
                <div className="text-center py-5 text-muted opacity-50">
                    <i className="fas fa-sitemap d-block mb-3" style={{ fontSize: '3rem' }} />
                    <p>{isRtl ? 'لا توجد بيانات' : 'No records found'}</p>
                </div>
            )}
        </div>
    );
};

export default memo(HierarchyTree);
