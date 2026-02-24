import React from 'react';
import { usePage } from '@inertiajs/react';

const Pagination = ({
  currentPage,
  totalPages,
  totalRecords,
  recordsPerPage,
  onPageChange,
  onRecordsPerPageChange,
}) => {
  const { props } = usePage();
  const localization = props?.localization;
  const isRtl = localization?.is_rtl;
  const translations = localization?.translations || {};

  // Translation helpers
  const t = (key, fallback) => translations[key] || fallback;

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
      if (currentPage > 3) {
        pages.push(1);
        if (currentPage > 4) pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        if (currentPage < totalPages - 3) pages.push('...');
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
          value={recordsPerPage}
          onChange={(e) => onRecordsPerPageChange(Number(e.target.value))}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span>
          {t('pagination.show_from', 'Show from')} {(currentPage - 1) * recordsPerPage + 1} {t('pagination.to', 'to')}{' '}
          {Math.min(currentPage * recordsPerPage, totalRecords)} {t('pagination.in', 'in')}{' '}
          <span className="record-count-badge">{totalRecords}</span> {t('pagination.records', 'records')}
        </span>
      </div>
      <div className="pagination-controls">
        <button
          className={`page-btn ${currentPage === 1 ? 'disabled' : ''}`}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          {isRtl ? '»' : '«'} {t('pagination.previous', 'Previous')}
        </button>

        {getPageNumbers().map((page, index) => (
          <button
            key={index}
            className={`page-btn ${page === currentPage ? 'active' : ''} ${page === '...' ? 'ellipsis' : ''}`}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            disabled={page === '...'}
          >
            {page}
          </button>
        ))}

        <button
          className={`page-btn ${currentPage === totalPages ? 'disabled' : ''}`}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          {t('pagination.next', 'Next')} {isRtl ? '«' : '»'}
        </button>
      </div>
    </div>
  );
};

export default Pagination;
