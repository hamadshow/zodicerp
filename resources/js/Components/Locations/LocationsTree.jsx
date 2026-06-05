import React from 'react';
import LocationTreeNode from './LocationTreeNode';

const LocationsTree = ({ treeData, activeNode, onSelect, locale }) => {
    return (
        <div className="locations-tree-card">
            <div className="locations-tree-card__header">
                <h2>
                    <i className="fa-solid fa-folder-tree"></i>
                    {locale === 'ar' ? 'الهيكل الهرمي' : 'Hierarchical Structure'}
                </h2>
            </div>

            <div className="locations-tree-card__content">
                <div className="location-tree">
                    <div className="location-tree__root-badge">
                        <i className="fa-solid fa-globe"></i>
                        <span>{locale === 'ar' ? 'الدول' : 'Countries'}</span>
                    </div>

                    <div className="location-tree__nodes">
                        {treeData.map(node => (
                            <LocationTreeNode 
                                key={node.id}
                                node={node}
                                activeNode={activeNode}
                                onSelect={onSelect}
                                locale={locale}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(LocationsTree);
