import React, { memo } from 'react';
import HierarchyTree from './HierarchyTree';

const HierarchyManager = ({ 
    title,
    data,
    onSelect,
    activeNode,
    config,
    onAction,
    locale = 'ar'
}) => {
    const isRtl = locale === 'ar';

    return (
        <div className={`hierarchy-manager-full-width ${isRtl ? 'rtl' : 'ltr'}`}>
            {/* Header with Back Button */}
            <div className="hierarchy-header">
                <button 
                    className="btn btn-light border btn-back"
                    onClick={() => onAction('navigate_back')}
                    style={{ fontSize: '14px', padding: '8px 16px' }}
                >
                    <i className="fas fa-arrow-left me-2" />
                    {isRtl ? 'رجوع' : 'Back'}
                </button>
            </div>

            {/* Full Width Row List Container */}
            <div className="hierarchy-row-list-container">
                {/* Title Section */}
                <div className="row-list-title">
                    <h3>{title}</h3>
                </div>

                {/* Row List */}
                <HierarchyTree 
                    data={data}
                    onSelect={onSelect}
                    activeNode={activeNode}
                    config={config}
                    onAction={onAction}
                    isRtl={isRtl}
                />

                {/* Footer Add Button */}
                {data.length > 0 && config.canAddRoot && (
                    <div className="row-list-footer">
                        <button
                            className="btn btn-add-item"
                            onClick={() => onAction('add_root')}
                        >
                            <i className="fas fa-plus me-2" />
                            {config.getAddRootLabel?.() || (isRtl ? 'إضافة جديد' : 'Add State')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default memo(HierarchyManager);
