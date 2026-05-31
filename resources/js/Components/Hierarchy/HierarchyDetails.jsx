import React, { memo } from 'react';
import HierarchyActions from './HierarchyActions';

const HierarchyDetails = ({ selectedNode, onAction, config, isRtl }) => {
    if (!selectedNode) {
        return (
            <div className="empty-details">
                <i className="fas fa-folder-open" />
                <p>{isRtl ? 'اختر عنصراً من الشجرة لعرض تفاصيله' : 'Select an item from the tree to view its details'}</p>
            </div>
        );
    }

    const displayNodes = [selectedNode, ...(selectedNode.children || [])];

    return (
        <div className="hierarchy-details-panel">
            <div className="details-header">
                <h4>{isRtl ? 'تفاصيل الحساب' : 'Account Details'}</h4>
            </div>

            <div className="details-content">
                {displayNodes.map(node => (
                    <div key={node.id} className="account-card hm-animate-fade">
                        <div className="card-action-bar">
                            <HierarchyActions 
                                node={node} 
                                onAction={onAction} 
                                config={config} 
                            />
                        </div>
                        <div className="card-body">
                            <div className="card-stats">
                                <div className="val">{node.children_count || node.children?.length || 0}</div>
                                <div className="lbl">{isRtl ? 'عنصر' : 'items'}</div>
                            </div>
                            <div className="card-info">
                                <div className="name">{node.name_json?.[isRtl ? 'ar' : 'en'] || node.name}</div>
                                <div className="code">#{node.id}</div>
                            </div>
                            <div className="card-icon">
                                <i className={(node.children_count > 0 || node.children?.length > 0) ? 'fas fa-folder' : 'far fa-folder'} />
                            </div>
                        </div>
                    </div>
                ))}

                {config.canAddChild?.(selectedNode) && (
                    <div 
                        className="add-account-bar"
                        onClick={() => onAction('add_child', selectedNode)}
                        style={{ 
                            border: '1px dashed var(--hierarchy-primary)', 
                            borderRadius: '4px', 
                            padding: '15px', 
                            textAlign: isRtl ? 'right' : 'left',
                            color: 'var(--hierarchy-primary)',
                            fontWeight: '800',
                            cursor: 'pointer'
                        }}
                    >
                        <i className={`fas fa-plus-square ${isRtl ? 'ml-2' : 'mr-2'}`} />
                        <span>{isRtl ? 'أضف عنصر جديد' : 'Add New Item'}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default memo(HierarchyDetails);
