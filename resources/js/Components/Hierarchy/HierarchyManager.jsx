import React, { memo } from 'react';
import HierarchyTree from './HierarchyTree';
import HierarchyDetails from './HierarchyDetails';

const HierarchyManager = ({ 
    title,
    data,
    expandedNodes,
    onToggle,
    onSelect,
    selectedNodes,
    activeNode,
    config,
    onAction,
    searchQuery,
    onSearchChange,
    filters,
    onFilterChange,
    loadingNodes,
    locale = 'ar'
}) => {
    const isRtl = locale === 'ar';

    return (
        <div className={`hierarchy-manager ${isRtl ? 'rtl' : 'ltr'}`}>
            {/* Details Panel (Left Column in LTR, Right Column in RTL) */}
            <HierarchyDetails 
                selectedNode={activeNode} 
                onAction={onAction}
                config={config} 
                isRtl={isRtl}
            />

            {/* Tree Panel */}
            <div className="hierarchy-tree-panel">
                <div className="panel-header">
                    <h3>{title}</h3>
                    <div className="d-flex gap-1">
                        <button className="btn btn-xs btn-light border p-1" onClick={() => onAction('expand_all')} title={isRtl ? 'توسيع الكل' : 'Expand All'}>
                            <i className="fas fa-expand-alt" style={{ fontSize: '10px' }} />
                        </button>
                        <button className="btn btn-xs btn-light border p-1" onClick={() => onAction('collapse_all')} title={isRtl ? 'طي الكل' : 'Collapse All'}>
                            <i className="fas fa-compress-alt" style={{ fontSize: '10px' }} />
                        </button>
                    </div>
                </div>

                <div className="tree-search">
                    <div className="d-flex gap-2">
                        <input 
                            type="text" 
                            className="search-input" 
                            placeholder={isRtl ? 'بحث...' : 'Search...'} 
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                        <select 
                            className="form-select form-select-sm" 
                            style={{ width: 'auto', fontSize: '11px' }}
                            value={filters?.status || 'all'}
                            onChange={(e) => onFilterChange({ status: e.target.value })}
                        >
                            <option value="all">{isRtl ? 'الكل' : 'All'}</option>
                            <option value="active">{isRtl ? 'نشط' : 'Active'}</option>
                            <option value="inactive">{isRtl ? 'غير نشط' : 'Inactive'}</option>
                        </select>
                    </div>
                </div>

                <HierarchyTree 
                    data={data}
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
            </div>
        </div>
    );
};

export default memo(HierarchyManager);
