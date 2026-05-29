import React from 'react';
import { usePage } from '@inertiajs/react';

const Table = ({
    tableData = [],
    columns = [],
    currentPage = 1,
    totalPages = 1,
    totalRecords = 0,
    recordsPerPage = 10,

    handleRowSelect,
    selectAll,
    handleSelectAll,

    onPageChange,
    onRecordsPerPageChange,

    onView,
    onEdit,
    onDelete,

    viewTitle = 'View',
    editTitle = 'Edit',
    deleteTitle = 'Delete',

    disabled = false,

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

    // Internal state for pagination if not handled by parent
    const [internalCurrentPage, setInternalCurrentPage] = React.useState(currentPage);
    const [internalRecordsPerPage, setInternalRecordsPerPage] = React.useState(recordsPerPage);

    // Sync internal state with props
    React.useEffect(() => {
        setInternalCurrentPage(currentPage);
    }, [currentPage]);

    React.useEffect(() => {
        setInternalRecordsPerPage(recordsPerPage);
    }, [recordsPerPage]);

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

    /* =========================================
       PAGINATION LOGIC
    ========================================= */

    // Determine if we should handle pagination internally
    // If no handlers are provided, we assume we should slice the data ourselves
    const isInternallyPaginated = !onPageChange && !onRecordsPerPageChange;

    const effectiveCurrentPage = isInternallyPaginated ? internalCurrentPage : currentPage;
    const effectiveRecordsPerPage = isInternallyPaginated ? internalRecordsPerPage : recordsPerPage;
    
    const effectiveTotalRecords = isInternallyPaginated ? tableData.length : totalRecords;
    const effectiveTotalPages = isInternallyPaginated 
        ? Math.ceil(tableData.length / effectiveRecordsPerPage) 
        : totalPages;

    const displayData = isInternallyPaginated
        ? tableData.slice(
              (effectiveCurrentPage - 1) * effectiveRecordsPerPage,
              effectiveCurrentPage * effectiveRecordsPerPage
          )
        : tableData;

    const handlePageChange = (page) => {
        if (isInternallyPaginated) {
            setInternalCurrentPage(page);
        }
        onPageChange?.(page);
    };

    const handleRecordsPerPageChange = (size) => {
        if (isInternallyPaginated) {
            setInternalRecordsPerPage(size);
            setInternalCurrentPage(1);
        }
        onRecordsPerPageChange?.(size);
    };

    const getPageNumbers = () => {
        const pages = [];
        const maxPagesToShow = 5;

        if (effectiveTotalPages <= maxPagesToShow) {
            for (let i = 1; i <= effectiveTotalPages; i++) {
                pages.push(i);
            }
        } else {
            if (effectiveCurrentPage > 3) {
                pages.push(1);

                if (effectiveCurrentPage > 4) {
                    pages.push('...');
                }
            }

            const start = Math.max(2, effectiveCurrentPage - 1);
            const end = Math.min(effectiveTotalPages - 1, effectiveCurrentPage + 1);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (effectiveCurrentPage < effectiveTotalPages - 2) {
                if (effectiveCurrentPage < effectiveTotalPages - 3) {
                    pages.push('...');
                }

                pages.push(effectiveTotalPages);
            }
        }

        return pages;
    };

    return (
        <div className={`table-wrapper ${isRtl ? 'rtl' : ''}`}>
            {/* =========================
                TOOLBAR
            ========================== */}
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

            {/* =========================
                TABLE
            ========================== */}

            <div className="table-container">
                <table className="table-custom">
                    <thead>
                        <tr>
                            <th
                                style={{
                                    width: '50px',
                                    textAlign: 'center',
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectAll}
                                    onChange={handleSelectAll}
                                />
                            </th>

                            {columns.map((column, index) => (
                                <th
                                    key={index}
                                    style={{
                                        width: column.width || 'auto',
                                    }}
                                >
                                    <div className="table-header-content">
                                        <span>{column.header}</span>

                                        {column.sortable && (
                                            <span className="material-icons-outlined table-header-icon">
                                                unfold_more
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}

                            {(onView || onEdit || onDelete) && (
                                <th
                                    style={{
                                        width: '150px',
                                        textAlign: 'center',
                                    }}
                                >
                                    {t('operations', isArabic ? 'العمليات' : 'OPERATIONS')}
                                </th>
                            )}
                        </tr>
                    </thead>

                    <tbody>
                        {displayData.length > 0 ? (
                            displayData.map((row, rowIndex) => (
                                <tr key={row.id || rowIndex}>
                                    <td
                                        style={{
                                            textAlign: 'center',
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={
                                                row.selected || false
                                            }
                                            onChange={() =>
                                                handleRowSelect?.(
                                                    row.id || rowIndex
                                                )
                                            }
                                        />
                                    </td>

                                    {columns.map(
                                        (column, colIndex) => (
                                            <td key={colIndex}>
                                                {column.render
                                                    ? column.render(
                                                          row
                                                      )
                                                    : row[
                                                          column.key
                                                      ] ?? '-'}
                                            </td>
                                        )
                                    )}

                                    {(onView ||
                                        onEdit ||
                                        onDelete) && (
                                        <td>
                                            <div className="actions-cell">
                                                {onView && (
                                                    <button
                                                        type="button"
                                                        className="action-btn"
                                                        title={viewTitle}
                                                        onClick={() =>
                                                            onView(
                                                                row
                                                            )
                                                        }
                                                        disabled={
                                                            disabled
                                                        }
                                                    >
                                                        <span className="material-icons-outlined">
                                                            visibility
                                                        </span>
                                                    </button>
                                                )}

                                                {onEdit && (
                                                    <button
                                                        type="button"
                                                        className="action-btn success"
                                                        title={editTitle}
                                                        onClick={() =>
                                                            onEdit(
                                                                row
                                                            )
                                                        }
                                                        disabled={
                                                            disabled
                                                        }
                                                    >
                                                        <span className="material-icons-outlined">
                                                            edit
                                                        </span>
                                                    </button>
                                                )}

                                                {onDelete && (
                                                    <button
                                                        type="button"
                                                        className="action-btn delete"
                                                        title={
                                                            deleteTitle
                                                        }
                                                        onClick={() =>
                                                            onDelete(
                                                                row
                                                            )
                                                        }
                                                        disabled={
                                                            disabled
                                                        }
                                                    >
                                                        <span className="material-icons-outlined">
                                                            delete
                                                        </span>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td
                                    colSpan={
                                        columns.length +
                                        (onView ||
                                        onEdit ||
                                        onDelete
                                            ? 2
                                            : 1)
                                    }
                                    className="empty-state-row"
                                >
                                    <span className="material-icons-outlined empty-icon">
                                        inventory_2
                                    </span>

                                    <div>
                                        {t('no_data', isArabic ? 'لا توجد بيانات متاحة' : 'No data available')}
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* =========================
                PAGINATION
            ========================== */}

            <div className="pagination">
                <div className="pagination-info">
                    <select
                        className="select-dropdown"
                        value={effectiveRecordsPerPage}
                        onChange={(e) =>
                            handleRecordsPerPageChange(
                                Number(e.target.value)
                            )
                        }
                    >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>

                    <span>
                        {effectiveTotalRecords > 0 ? (
                            <>
                                {t('show_from', 'Show from')}{' '}
                                {(effectiveCurrentPage - 1) *
                                    effectiveRecordsPerPage +
                                    1}{' '}
                                {t('to', 'to')}{' '}
                                {Math.min(
                                    effectiveCurrentPage *
                                        effectiveRecordsPerPage,
                                    effectiveTotalRecords
                                )}{' '}
                                {t('in', 'in')}{' '}
                                <span className="record-count-badge">
                                    {effectiveTotalRecords}
                                </span>{' '}
                                {t('records', 'records')}
                            </>
                        ) : (
                            t('no_data', 'No data available')
                        )}
                    </span>
                </div>

                <div className="pagination-controls">
                    <button
                        className={`page-btn ${
                            effectiveCurrentPage === 1
                                ? 'disabled'
                                : ''
                        }`}
                        onClick={() =>
                            handlePageChange(effectiveCurrentPage - 1)
                        }
                        disabled={effectiveCurrentPage === 1}
                    >
                        {isRtl ? '»' : '«'}{' '}
                        {t('previous', 'Previous')}
                    </button>

                    {getPageNumbers().map(
                        (page, index) => (
                            <button
                                key={index}
                                className={`page-btn ${
                                    page === effectiveCurrentPage
                                        ? 'active'
                                        : ''
                                } ${
                                    page === '...'
                                        ? 'ellipsis'
                                        : ''
                                }`}
                                onClick={() =>
                                    typeof page ===
                                        'number' &&
                                    handlePageChange(page)
                                }
                                disabled={page === '...'}
                            >
                                {page}
                            </button>
                        )
                    )}

                    <button
                        className={`page-btn ${
                            effectiveCurrentPage === effectiveTotalPages
                                ? 'disabled'
                                : ''
                        }`}
                        onClick={() =>
                            handlePageChange(effectiveCurrentPage + 1)
                        }
                        disabled={
                            effectiveCurrentPage === effectiveTotalPages || effectiveTotalPages === 0
                        }
                    >
                        {t('next', 'Next')}{' '}
                        {isRtl ? '«' : '»'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Table;