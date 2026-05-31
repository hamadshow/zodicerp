import React, { memo, useState, useRef, useEffect } from 'react';

const HierarchyActions = ({ node, onAction, config, isRtl }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
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
            'add': 'إضافة',
            'confirm_deactivate': 'هل تريد فعلاً تعطيل هذا العنصر؟',
            'confirm_delete': 'هل تريد فعلاً حذف هذا العنصر؟ سيتم حذف جميع العناصر الفرعية أيضاً.',
            'yes': 'نعم، تابع',
            'cancel': 'إلغاء'
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
            'add': 'Add',
            'confirm_deactivate': 'Are you sure you want to deactivate this item?',
            'confirm_delete': 'Are you sure you want to delete this item? All sub-items will also be deleted.',
            'yes': 'Yes, Continue',
            'cancel': 'Cancel'
        }
    };

    const t = (key) => typeTranslations[isRtl ? 'ar' : 'en'][key] || key;

    const getAddLabel = () => {
        if (!config.canAddChild?.(node)) return '';
        const rawLabel = config.getAddChildLabel?.(node) || '';
        const type = rawLabel.toLowerCase().replace('+ add ', '').trim();
        const translatedType = t(type);
        return isRtl ? `${t('add')} ${translatedType}` : `${t('add')} ${translatedType}`;
    };

    const handleActionClick = (action, e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Require confirmation for dangerous actions
        if (action === 'delete' || action === 'deactivate') {
            setConfirmAction(action);
        } else {
            onAction(action, node);
            setIsOpen(false);
        }
    };

    const handleConfirm = (e) => {
        e?.preventDefault();
        e?.stopPropagation();
        if (confirmAction) {
            onAction(confirmAction, node);
            setConfirmAction(null);
            setIsOpen(false);
        }
    };

    const handleCancel = (e) => {
        e?.preventDefault();
        e?.stopPropagation();
        setConfirmAction(null);
    };

    // Action list ordered by frequency of use
    const actions = [
        // Most used actions first
        config.canAddChild?.(node) && {
            id: 'add_child',
            label: getAddLabel(),
            icon: 'fas fa-plus-circle',
            className: 'action-add',
            isDanger: false
        },
        {
            id: 'edit',
            label: t('edit'),
            icon: 'fas fa-edit',
            className: 'action-edit',
            isDanger: false
        },
        {
            id: 'duplicate',
            label: t('duplicate'),
            icon: 'fas fa-copy',
            className: 'action-duplicate',
            isDanger: false
        },
        // Separator
        'divider',
        // Status toggle
        {
            id: node.status ? 'deactivate' : 'activate',
            label: node.status ? t('deactivate') : t('activate'),
            icon: node.status ? 'fas fa-ban' : 'fas fa-check-circle',
            className: node.status ? 'action-deactivate' : 'action-activate',
            isDanger: node.status
        },
        // Dangerous action last
        {
            id: 'delete',
            label: t('delete'),
            icon: 'fas fa-trash-alt',
            className: 'action-delete',
            isDanger: true
        }
    ].filter(Boolean);

    return (
        <div className={`hierarchy-dropdown ${isOpen ? 'is-open' : ''}`} ref={dropdownRef}>
            <button 
                className="dropdown-toggle-btn" 
                type="button" 
                title={isRtl ? 'خيارات' : 'Actions'}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
            >
                <i className="fas fa-ellipsis-v" />
            </button>
            
            {isOpen && !confirmAction && (
                <ul className={`dropdown-content-menu ${isRtl ? 'rtl' : 'ltr'}`}>
                    {actions.map((action, idx) => {
                        if (action === 'divider') {
                            return <li key={`divider-${idx}`} className="divider"></li>;
                        }
                        return (
                            <li key={action.id}>
                                <a 
                                    href="#" 
                                    className={`action-item ${action.className} ${action.isDanger ? 'is-danger' : ''}`}
                                    onClick={(e) => handleActionClick(action.id, e)}
                                >
                                    <i className={action.icon} /> 
                                    <span>{action.label}</span>
                                </a>
                            </li>
                        );
                    })}
                </ul>
            )}

            {confirmAction && (
                <div className="confirmation-dialog">
                    <div className="dialog-content">
                        <div className="dialog-icon">
                            <i className={confirmAction === 'delete' ? 'fas fa-exclamation-triangle' : 'fas fa-question-circle'} />
                        </div>
                        <div className="dialog-text">
                            <p className="dialog-message">
                                {confirmAction === 'delete' ? t('confirm_delete') : t('confirm_deactivate')}
                            </p>
                        </div>
                        <div className="dialog-actions">
                            <button 
                                className="btn btn-sm btn-outline-secondary"
                                onClick={handleCancel}
                            >
                                {t('cancel')}
                            </button>
                            <button 
                                className={`btn btn-sm ${confirmAction === 'delete' ? 'btn-danger' : 'btn-warning'}`}
                                onClick={handleConfirm}
                            >
                                {t('yes')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default memo(HierarchyActions);
