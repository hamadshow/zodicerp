import React, { memo, useState, useRef, useEffect } from 'react';

const HierarchyActions = ({ node, onAction, config }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleActionClick = (action, e) => {
        e.preventDefault();
        e.stopPropagation();
        onAction(action, node);
        setIsOpen(false);
    };

    return (
        <div className="dropdown" ref={dropdownRef}>
            <button 
                className="btn btn-link btn-sm p-0 text-muted border-0 shadow-none" 
                type="button" 
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
            >
                <i className="fas fa-ellipsis-v" />
            </button>
            
            <ul className={`dropdown-menu dropdown-menu-end shadow-sm border-1 ${isOpen ? 'show' : ''}`} 
                style={{ 
                    display: isOpen ? 'block' : 'none',
                    margin: 0,
                    padding: '5px 0',
                    listStyle: 'none',
                    backgroundColor: '#fff',
                    zIndex: 1050
                }}
            >
                {config.canAddChild?.(node) && (
                    <li>
                        <a className="dropdown-item py-2 d-flex align-items-center" href="#" onClick={(e) => handleActionClick('add_child', e)}>
                            <i className="fas fa-plus-circle text-primary" style={{ width: '20px' }} /> 
                            <span>{config.getAddChildLabel?.(node).replace('+ Add ', 'أضف ') || 'إضافة عنصر'}</span>
                        </a>
                    </li>
                )}
                <li>
                    <a className="dropdown-item py-2 d-flex align-items-center" href="#" onClick={(e) => handleActionClick('edit', e)}>
                        <i className="fas fa-edit text-info" style={{ width: '20px' }} /> 
                        <span>تعديل</span>
                    </a>
                </li>
                <li>
                    <a className="dropdown-item py-2 d-flex align-items-center" href="#" onClick={(e) => handleActionClick('duplicate', e)}>
                        <i className="fas fa-copy text-secondary" style={{ width: '20px' }} /> 
                        <span>نسخ</span>
                    </a>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                    <a className="dropdown-item py-2 d-flex align-items-center" href="#" onClick={(e) => handleActionClick(node.status ? 'deactivate' : 'activate', e)}>
                        <i className={`fas ${node.status ? 'fa-ban text-warning' : 'fa-check-circle text-success'}`} style={{ width: '20px' }} /> 
                        <span>{node.status ? 'تعطيل' : 'تفعيل'}</span>
                    </a>
                </li>
                <li>
                    <a className="dropdown-item py-2 d-flex align-items-center text-danger" href="#" onClick={(e) => handleActionClick('delete', e)}>
                        <i className="fas fa-trash-alt" style={{ width: '20px' }} /> 
                        <span>حذف</span>
                    </a>
                </li>
            </ul>
        </div>
    );
};

export default memo(HierarchyActions);
