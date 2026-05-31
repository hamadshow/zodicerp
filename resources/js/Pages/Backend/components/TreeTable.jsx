import React from 'react';
import { usePage } from '@inertiajs/react';

/**
 * TreeTable Component - A reusable component for hierarchical data display
 * 
 * @param {Array} tableData - Hierarchical data array
 * @param {Array} columns - Column configuration
 * @param {Function} onToggle - Callback when a node is toggled
 * @param {Set} expandedNodes - Set of expanded node IDs
 * @param {Function} onEdit - Callback for edit action
 * @param {Function} onDelete - Callback for delete action
 * @param {Function} onStop - Callback for stop/block action
 * @param {Boolean} showToolbar - Whether to show the toolbar
 * @param {String} toolbarSearchPlaceholder - Placeholder for search input
 * @param {String} toolbarSearchValue - Current search value
 * @param {Function} onToolbarSearch - Callback for search input change
 * @param {String} addButtonText - Text for the add button
 * @param {Function} onAdd - Callback for add button click
 * @param {Function} onRefresh - Callback for refresh button click
 * @param {React.ReactNode} toolbarActions - Additional toolbar actions
 */
const TreeTable = ({
    tableData = [],
    columns = [],
    onToggle,
    expandedNodes = new Set(),
    
    onEdit,
    onDelete,
    onStop,

    // Toolbar Props
    showToolbar = false,
    toolbarSearch = false,
    toolbarSearchPlaceholder = '',
    toolbarSearchValue = '',
    onToolbarSearch,
    showRefreshButton = false,
    onRefresh,
    showAddButton = false,
    addButtonText = 'Add',
    onAdd,
    showExportButton = false,
    onExport,
    toolbarActions = null,
    toolbarClassName = '',
}) => {
    const { props } = usePage();
    const [showExportDropdown, setShowExportDropdown] = React.useState(false);
    const exportDropdownRef = React.useRef(null);

    const localization = props?.localization;
    const isArabic = localization?.current_locale === 'ar';
    const isRtl = localization?.is_rtl;

    const translations = localization?.translations || {};

    const t = (key, fallback) =>
        translations[`Table.${key}`] || translations[`common.${key}`] || fallback;

    // Handle click outside for export dropdown
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
                setShowExportDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const renderRows = (nodes, level = 0) => {
        return nodes.map((node) => {
            const isExpanded = expandedNodes.has(node.id);
            const hasChildren = node.children && node.children.length > 0;

            return (
                <React.Fragment key={node.id}>
                    <tr className={`account-row ${isExpanded ? 'expanded' : ''}`}>
                        {columns.map((column, index) => (
                            <td key={index} style={column.style || {}}>
                                {column.key === 'code' ? (
                                    <div 
                                        className="account-code-cell" 
                                        style={{ paddingLeft: `${level * 20}px` }}
                                    >
                                        {hasChildren ? (
                                            <button 
                                                type="button" 
                                                className="account-toggle-btn"
                                                onClick={() => onToggle?.(node.id)}
                                            >
                                                <span className="material-icons-outlined">
                                                    {isExpanded ? 'expand_more' : 'chevron_right'}
                                                </span>
                                            </button>
                                        ) : (
                                            <span className="account-toggle-spacer"></span>
                                        )}
                                        <span className="material-icons-outlined account-node-icon">
                                            {hasChildren ? 'folder' : 'insert_drive_file'}
                                        </span>
                                        <span>{node.code}</span>
                                    </div>
                                ) : column.render ? (
                                    column.render(node)
                                ) : (
                                    node[column.key] ?? '-'
                                )}
                            </td>
                        ))}

                        {(onEdit || onStop || onDelete) && (
                            <td>
                                <div className="actions-cell">
                                    {onEdit && (
                                        <button 
                                            type="button" 
                                            className="icon-btn edit"
                                            onClick={() => onEdit(node)}
                                        >
                                            <span className="material-icons-outlined">edit</span>
                                        </button>
                                    )}
                                    {onStop && (
                                        <button 
                                            type="button" 
                                            className="icon-btn stop"
                                            onClick={() => onStop(node)}
                                        >
                                            <span className="material-icons-outlined">block</span>
                                        </button>
                                    )}
                                    {onDelete && (
                                        <button 
                                            type="button" 
                                            className="icon-btn delete"
                                            onClick={() => onDelete(node)}
                                        >
                                            <span className="material-icons-outlined">delete</span>
                                        </button>
                                    )}
                                </div>
                            </td>
                        )}
                    </tr>
                    {isExpanded && hasChildren && renderRows(node.children, level + 1)}
                </React.Fragment>
            );
        });
    };

    return (
        <div className={`table-wrapper tree-table-wrapper ${isRtl ? 'rtl' : ''}`}>
            {/* Toolbar Section */}
            {showToolbar && (
                <div className={`table-toolbar ${toolbarClassName}`}>
                    <div className="table-toolbar-left">
                        {toolbarSearch && (
                            <div className="table-search">
                                <span className="material-icons-outlined search-icon">search</span>
                                <input
                                    type="text"
                                    placeholder={toolbarSearchPlaceholder || t('search_placeholder', isArabic ? 'بحث...' : 'Search...')}
                                    value={toolbarSearchValue}
                                    onChange={(e) => onToolbarSearch?.(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    <div className="table-toolbar-right">
                        {toolbarActions}

                        {showExportButton && (
                            <div className="excel-dropdown-container" ref={exportDropdownRef}>
                                <button
                                    type="button"
                                    className="btn-excel-main"
                                    onClick={() => setShowExportDropdown(!showExportDropdown)}
                                >
                                    <span className="material-icons-outlined">table_view</span>
                                    <span>{t('excel', isArabic ? 'خيارات إكسل' : 'Excel Options')}</span>
                                    <span className={`material-icons-outlined arrow ${showExportDropdown ? 'up' : ''}`}>
                                        expand_more
                                    </span>
                                </button>
                                {showExportDropdown && (
                                    <div className="excel-dropdown-menu">
                                        <button
                                            type="button"
                                            className="dropdown-item export"
                                            onClick={() => {
                                                onExport?.();
                                                setShowExportDropdown(false);
                                            }}
                                        >
                                            <span className="material-icons-outlined">download</span>
                                            <div className="item-content">
                                                <span className="title">{t('export_excel', isArabic ? 'تصدير إكسل' : 'Export Excel')}</span>
                                                <span className="desc">{t('export_desc', isArabic ? 'تحميل كافة السجلات' : 'Download all records')}</span>
                                            </div>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {showAddButton && (
                            <button
                                type="button"
                                className="btn-toolbar btn-primary"
                                onClick={onAdd}
                            >
                                <span className="material-icons-outlined">add</span>
                                <span>{addButtonText}</span>
                            </button>
                        )}

                        {showRefreshButton && (
                            <button
                                type="button"
                                className="btn-toolbar btn-refresh"
                                onClick={onRefresh}
                                title={t('refresh', isArabic ? 'تحديث' : 'Refresh')}
                            >
                                <span className="material-icons-outlined">refresh</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Table Section */}
            <div className="table-container">
                <table className="table-custom tree-table-custom">
                    <thead>
                        <tr>
                            {columns.map((column, index) => (
                                <th 
                                    key={index} 
                                    style={{ width: column.width || 'auto', textAlign: column.textAlign || 'left' }}
                                >
                                    {column.header}
                                </th>
                            ))}
                            {(onEdit || onStop || onDelete) && (
                                <th style={{ width: '150px', textAlign: 'center' }}>
                                    {t('operations', isArabic ? 'العمليات' : 'OPERATIONS')}
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.length > 0 ? (
                            renderRows(tableData)
                        ) : (
                            <tr>
                                <td
                                    colSpan={columns.length + (onEdit || onStop || onDelete ? 1 : 0)}
                                    className="empty-state-row"
                                >
                                    <span className="material-icons-outlined empty-icon">inventory_2</span>
                                    <div>{t('no_data', isArabic ? 'لا توجد بيانات متاحة' : 'No data available')}</div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TreeTable;
