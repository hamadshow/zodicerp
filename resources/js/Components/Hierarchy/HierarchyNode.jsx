import React, { memo } from 'react';
import HierarchyActions from './HierarchyActions';

const HierarchyNode = ({ 
    node, 
    level, 
    expandedNodes, 
    onToggle, 
    onSelect, 
    selectedNode, 
    config,
    onAction
}) => {
    const isExpanded = expandedNodes.has(node.id);
    const isActive = selectedNode?.id === node.id;
    const hasChildren = node.children && node.children.length > 0;
    
    return (
        <div className={`node-container ${isExpanded && hasChildren ? 'has-children-expanded' : ''}`}>
            <div 
                className={`tree-row ${isActive ? 'active' : ''}`}
                onClick={() => onSelect(node)}
            >
                <div 
                    className={`row-expander ${isExpanded ? 'expanded' : ''}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (hasChildren || node.has_children) onToggle(node.id);
                    }}
                >
                    {(hasChildren || node.has_children) ? (
                        <i className="fas fa-caret-right" />
                    ) : null}
                </div>

                <div className="row-icon">
                    <i className={isExpanded ? 'fas fa-folder-open' : (hasChildren ? 'fas fa-folder' : 'far fa-folder')} />
                </div>

                <div className="row-label">
                    {node.name}
                </div>

                <div className={`row-status ${node.status ? 'active' : 'inactive'}`} />

                <div className="row-actions" onClick={e => e.stopPropagation()}>
                    <HierarchyActions 
                        node={node} 
                        onAction={onAction} 
                        config={config} 
                    />
                </div>
            </div>

            {isExpanded && hasChildren && (
                <div className="child-nodes expanded">
                    {node.children.map(child => (
                        <HierarchyNode 
                            key={child.id}
                            node={child}
                            level={level + 1}
                            expandedNodes={expandedNodes}
                            onToggle={onToggle}
                            onSelect={onSelect}
                            selectedNode={selectedNode}
                            config={config}
                            onAction={onAction}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default memo(HierarchyNode);
