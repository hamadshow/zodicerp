import React from 'react';
import { usePage } from '@inertiajs/react';

const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  totalRecords = 0,
  recordsPerPage = 10,
  onPageChange,
  onRecordsPerPageChange,
}) => {
  const { props } = usePage();

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
  const isRtl = localization?.is_rtl;
  const translations = localization?.translations || {};

  // Translation helpers
  const t = (key, fallback) => translations[`common.${key}`] || translations[`Table.${key}`] || fallback;

  // Determine effective values
  const effectiveCurrentPage = onPageChange ? currentPage : internalCurrentPage;
  const effectiveRecordsPerPage = onRecordsPerPageChange ? recordsPerPage : internalRecordsPerPage;

  const handlePageChange = (page) => {
    if (!onPageChange) {
      setInternalCurrentPage(page);
    }
    onPageChange?.(page);
  };

  const handleRecordsPerPageChange = (size) => {
    if (!onRecordsPerPageChange) {
      setInternalRecordsPerPage(size);
      setInternalCurrentPage(1);
    }
    onRecordsPerPageChange?.(size);
  };

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first page, current page, and last page with ellipsis if needed
      if (effectiveCurrentPage > 3) {
        pages.push(1);
        if (effectiveCurrentPage > 4) pages.push('...');
      }

      const start = Math.max(2, effectiveCurrentPage - 1);
      const end = Math.min(totalPages - 1, effectiveCurrentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (effectiveCurrentPage < totalPages - 2) {
        if (effectiveCurrentPage < totalPages - 3) pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className={`pagination ${isRtl ? 'is-rtl' : ''}`}>
      <div className="pagination-info">
        <select
          className="select-dropdown"
          value={effectiveRecordsPerPage}
          onChange={(e) => handleRecordsPerPageChange(Number(e.target.value))}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span>
          {totalRecords > 0 ? (
            <>
              {t('pagination_show_from', t('show_from', 'Show from'))} {(effectiveCurrentPage - 1) * effectiveRecordsPerPage + 1} {t('pagination_to', t('to', 'to'))}{' '}
              {Math.min(effectiveCurrentPage * effectiveRecordsPerPage, totalRecords)} {t('pagination_in', t('in', 'in'))}{' '}
              <span className="record-count-badge">{totalRecords}</span> {t('pagination_records', t('records', 'records'))}
            </>
          ) : (
            t('no_data', 'No data available')
          )}
        </span>
      </div>
      <div className="pagination-controls">
        <button
          className={`page-btn ${effectiveCurrentPage === 1 ? 'disabled' : ''}`}
          onClick={() => handlePageChange(effectiveCurrentPage - 1)}
          disabled={effectiveCurrentPage === 1}
        >
          {isRtl ? '»' : '«'} {t('pagination_previous', t('previous', 'Previous'))}
        </button>

        {getPageNumbers().map((page, index) => (
          <button
            key={index}
            className={`page-btn ${page === effectiveCurrentPage ? 'active' : ''} ${page === '...' ? 'ellipsis' : ''}`}
            onClick={() => typeof page === 'number' && handlePageChange(page)}
            disabled={page === '...'}
          >
            {page}
          </button>
        ))}

        <button
          className={`page-btn ${effectiveCurrentPage === totalPages ? 'disabled' : ''}`}
          onClick={() => handlePageChange(effectiveCurrentPage + 1)}
          disabled={effectiveCurrentPage === totalPages || totalPages === 0}
        >
          {t('pagination_next', t('next', 'Next'))} {isRtl ? '«' : '»'}
        </button>
      </div>
    </div>
  );
};

export default Pagination;
