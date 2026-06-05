import React, { useState } from 'react';

const LocationTreeNode = ({ node, activeNode, onSelect, locale, level = 0 }) => {
    const [isExpanded, setIsExpanded] = useState(level < 1); // Expand first level by default
    const hasChildren = node.children && node.children.length > 0;
    const isActive = activeNode?.id === node.id;

    const handleToggle = (e) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    const handleSelect = () => {
        onSelect(node);
    };

    return (
        <div className="location-tree-node">
            <div 
                className={`location-tree-node__item ${isActive ? 'location-tree-node__item--active' : ''}`}
                onClick={handleSelect}
            >
                {hasChildren ? (
                    <i 
                        className={`fa-solid ${isExpanded ? 'fa-folder-open' : 'fa-folder'}`}
                        onClick={handleToggle}
                    ></i>
                ) : (
                    <i className="fa-solid fa-city"></i>
                )}
                <span>{node.name_json?.[locale] || node.name}</span>
            </div>

            {hasChildren && isExpanded && (
                <div className="location-tree-node__children">
                    {node.children.map(child => (
                        <LocationTreeNode 
                            key={child.id}
                            node={child}
                            activeNode={activeNode}
                            onSelect={onSelect}
                            locale={locale}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default React.memo(LocationTreeNode);
