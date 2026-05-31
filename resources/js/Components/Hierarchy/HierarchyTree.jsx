import React, { memo } from 'react';
import HierarchyNode from './HierarchyNode';

const HierarchyTree = ({ 
    data, 
    expandedNodes, 
    onToggle, 
    onSelect, 
    selectedNode, 
    config,
    onAction
}) => {
    return (
        <div className="tree-content">
            {data.map(node => (
                <HierarchyNode 
                    key={node.id}
                    node={node}
                    level={0}
                    expandedNodes={expandedNodes}
                    onToggle={onToggle}
                    onSelect={onSelect}
                    selectedNode={selectedNode}
                    config={config}
                    onAction={onAction}
                />
            ))}
            
            {/* Root Add New Button */}
            {config.canAddRoot && (
                <div 
                    className="add-new-node-btn mt-2"
                    onClick={() => onAction('add_root')}
                >
                    <i className="fas fa-plus-square me-2" />
                    <span>{config.getAddRootLabel?.().replace('+ Add ', 'أضف ') || 'أضف جديد'}</span>
                </div>
            )}

            {data.length === 0 && (
                <div className="text-center py-5 text-muted opacity-50">
                    <i className="fas fa-sitemap d-block mb-3" style={{ fontSize: '3rem' }} />
                    <p>No records found</p>
                </div>
            )}
        </div>
    );
};

export default memo(HierarchyTree);
