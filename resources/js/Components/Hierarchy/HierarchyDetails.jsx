import React, { memo } from 'react';
import HierarchyActions from './HierarchyActions';

const HierarchyDetails = ({ selectedNode, onAction, config }) => {
    if (!selectedNode) {
        return (
            <div className="empty-details">
                <i className="fas fa-folder-open" />
                <p>اختر عنصراً من الشجرة لعرض تفاصيله</p>
            </div>
        );
    }

    // Determine nodes to display in the card grid
    // If a node is selected, show it and its immediate children as cards
    const displayNodes = [selectedNode, ...(selectedNode.children || [])];

    return (
        <div className="hierarchy-details-panel">
            <div className="details-header">
                <h4>تفاصيل الحساب</h4>
            </div>

            {displayNodes.map(node => (
                <div key={node.id} className="account-card hm-animate-fade">
                    <div className="card-actions-left">
                        <HierarchyActions 
                            node={node} 
                            onAction={onAction} 
                            config={config} 
                        />
                    </div>
                    <div className="card-main-content">
                        <div className="card-value-area">
                            <div className="value">{node.children_count || node.children?.length || 0}</div>
                            <div className="label">عنصر</div>
                        </div>
                        <div className="card-info-area">
                            <div className="text-meta">
                                <div className="name">{node.name}</div>
                                <div className="code">#{node.code}</div>
                            </div>
                            <div className="icon-folder">
                                <i className={node.children?.length > 0 ? 'fas fa-folder' : 'far fa-folder'} />
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {config.canAddChild?.(selectedNode) && (
                <div 
                    className="add-account-bar"
                    onClick={() => onAction('add_child', selectedNode)}
                >
                    <i className="fas fa-plus-square" />
                    <span>أضف {config.getAddChildLabel?.(selectedNode).replace('+ Add ', '') || 'عنصر'}</span>
                </div>
            )}
        </div>
    );
};

export default memo(HierarchyDetails);
