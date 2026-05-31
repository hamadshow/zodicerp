import React, { memo, useState, useRef, useEffect } from 'react';

const HierarchyActions = ({ node, onAction, config, isRtl }) => {
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

    const typeTranslations = {
        'ar': {
            'country': 'دولة',
            'state': 'محافظة',
            'city': 'مدينة',
            'district': 'حي',
            'area': 'منطقة',
            'edit': 'تعديل',
            'duplicate': 'نسخ',
            'activate': 'تفعيل',
            'deactivate': 'تعطيل',
            'delete': 'حذف',
            'add': 'أضف'
        },
        'en': {
            'country': 'Country',
            'state': 'State',
            'city': 'City',
            'district': 'District',
            'area': 'Area',
            'edit': 'Edit',
            'duplicate': 'Duplicate',
            'activate': 'Activate',
            'deactivate': 'Deactivate',
            'delete': 'Delete',
            'add': 'Add'
        }
    };

    const t = (key) => typeTranslations[isRtl ? 'ar' : 'en'][key] || key;

    const getAddLabel = () => {
        if (!config.canAddChild?.(node)) return '';
        const rawLabel = config.getAddChildLabel?.(node) || '';
        // Extract type from raw label "+ Add Type"
        const type = rawLabel.toLowerCase().replace('+ add ', '').trim();
        const translatedType = t(type);
        return isRtl ? `${t('add')} ${translatedType}` : `${t('add')} ${translatedType}`;
    };

    return (
        <div className={`hierarchy-dropdown ${isOpen ? 'is-open' : ''}`} ref={dropdownRef}>
            <button 
                className="dropdown-toggle-btn" 
                type="button" 
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
            >
                <i className="fas fa-ellipsis-v" />
            </button>
            
            {isOpen && (
                <ul className={`dropdown-content-menu ${isRtl ? 'rtl' : 'ltr'}`}>
                    {config.canAddChild?.(node) && (
                        <li>
                            <a href="#" onClick={(e) => handleActionClick('add_child', e)}>
                                <i className="fas fa-plus-circle text-primary" /> 
                                <span>{getAddLabel()}</span>
                            </a>
                        </li>
                    )}
                    <li>
                        <a href="#" onClick={(e) => handleActionClick('edit', e)}>
                            <i className="fas fa-edit text-info" /> 
                            <span>{t('edit')}</span>
                        </a>
                    </li>
                    <li>
                        <a href="#" onClick={(e) => handleActionClick('duplicate', e)}>
                            <i className="fas fa-copy text-secondary" /> 
                            <span>{t('duplicate')}</span>
                        </a>
                    </li>
                    <li className="divider"></li>
                    <li>
                        <a href="#" onClick={(e) => handleActionClick(node.status ? 'deactivate' : 'activate', e)}>
                            <i className={`fas ${node.status ? 'fa-ban text-warning' : 'fa-check-circle text-success'}`} /> 
                            <span>{node.status ? t('deactivate') : t('activate')}</span>
                        </a>
                    </li>
                    <li>
                        <a href="#" className="text-danger" onClick={(e) => handleActionClick('delete', e)}>
                            <i className="fas fa-trash-alt" /> 
                            <span>{t('delete')}</span>
                        </a>
                    </li>
                </ul>
            )}
        </div>
    );
};

export default memo(HierarchyActions);
