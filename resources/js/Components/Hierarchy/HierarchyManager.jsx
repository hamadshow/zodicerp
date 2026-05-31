import React, { memo } from 'react';
import HierarchyTree from './HierarchyTree';
import HierarchyDetails from './HierarchyDetails';

const HierarchyManager = ({ 
    title,
    data,
    expandedNodes,
    onToggle,
    onSelect,
    selectedNode,
    config,
    onAction,
    searchQuery,
    onSearchChange
}) => {
    return (
        <div className="hierarchy-manager">
            {/* Left Panel: Details Workspace (Large Cards) */}
            <HierarchyDetails 
                selectedNode={selectedNode} 
                onAction={onAction}
                config={config} 
            />

            {/* Right Panel: Hierarchy Tree */}
            <div className="hierarchy-tree-panel">
                <div className="panel-header d-flex justify-content-between align-items-center">
                    <h3 className="m-0">{title}</h3>
                    <div className="d-flex gap-1">
                        <button className="btn btn-xs btn-light border p-1" onClick={() => onAction('expand_all')} title="Expand All">
                            <i className="fas fa-expand-alt" style={{ fontSize: '10px' }} />
                        </button>
                        <button className="btn btn-xs btn-light border p-1" onClick={() => onAction('collapse_all')} title="Collapse All">
                            <i className="fas fa-compress-alt" style={{ fontSize: '10px' }} />
                        </button>
                    </div>
                </div>

                <div className="tree-search">
                    <input 
                        type="text" 
                        className="search-input" 
                        placeholder="بحث..." 
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>

                <HierarchyTree 
                    data={data}
                    expandedNodes={expandedNodes}
                    onToggle={onToggle}
                    onSelect={onSelect}
                    selectedNode={selectedNode}
                    config={config}
                    onAction={onAction}
                />
            </div>
        </div>
    );
};

export default memo(HierarchyManager);
