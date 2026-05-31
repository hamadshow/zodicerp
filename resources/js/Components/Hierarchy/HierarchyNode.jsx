import React, { memo } from 'react';
import HierarchyActions from './HierarchyActions';

const HierarchyNode = ({ 
    node, 
    level, 
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
    const isExpanded = expandedNodes.has(node.id);
    const isLoading = loadingNodes?.has(node.id);
    const isActive = activeNode?.id === node.id;
    const isSelected = selectedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const childrenCount = node.children_count || node.children?.length || 0;

    const handleNodeClick = (e) => {
        onSelect(node, e.ctrlKey || e.metaKey);
    };

    const getIcon = () => {
        if (isLoading) return 'fas fa-spinner fa-spin';
        if (config.getIcon) return config.getIcon(node, isExpanded);
        return isExpanded ? 'fas fa-folder-open' : (hasChildren || node.children_count > 0 ? 'fas fa-folder' : 'far fa-folder');
    };

    return (
        <div className={`node-container ${isExpanded && hasChildren ? 'has-children-expanded' : ''} ${level > 0 ? 'is-child' : 'is-root'}`}>
            <div 
                className={`tree-row ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={handleNodeClick}
                style={{ 
                    paddingLeft: isRtl ? '15px' : `${level > 0 ? 15 : 15}px`,
                    paddingRight: isRtl ? `${level > 0 ? 15 : 15}px` : '15px'
                }}
            >
                {/* Horizontal line connector for children */}
                {level > 0 && <div className="child-connector-line"></div>}

                <div className="row-id">#{node.id}</div>

                <div className="row-icon">
                    <i className={getIcon()} />
                </div>

                <div className="row-label">
                    <span className="main-text">{node.name_json?.[isRtl ? 'ar' : 'en'] || node.name}</span>
                    {node.location_type && <span className="sub-text">({node.location_type})</span>}
                </div>

                <div className="row-meta">
                    <span className="badge">{childrenCount}</span>
                    <span className="ms-1">{isRtl ? 'عناصر' : 'ITEMS'}</span>
                </div>

                <div 
                    className={`row-expander ${isExpanded ? 'expanded' : ''}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (node.children_count > 0 || hasChildren) onToggle(node.id);
                    }}
                >
                    {(node.children_count > 0 || hasChildren) ? (
                        <i className={isLoading ? 'fas fa-circle-notch fa-spin' : `fas ${isRtl ? 'fa-caret-left' : 'fa-caret-right'}`} />
                    ) : null}
                </div>

                <div className="row-actions" onClick={e => e.stopPropagation()}>
                    <HierarchyActions 
                        node={node} 
                        onAction={onAction} 
                        config={config} 
                        isRtl={isRtl}
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
                </div>
            )}
        </div>
    );
};

export default memo(HierarchyNode);
