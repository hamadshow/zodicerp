import React, { useEffect, useRef, useState } from 'react';

const cx = (...classes) => classes.filter(Boolean).join(' ');

export default function ReportHeader({
  title,
  subtitle,
  children,
  headerClassName,
  headerContentClassName,
  titleClassName,
  subtitleClassName,
  filtersCardClassName,
  filtersGridClassName,
  actionsClassName,
  exportButtonClassName,
  exportMenuClassName,
  exportMenuItemsClassName,
  exportMenuItemClassName,
  printButtonClassName,
  onExportExcel,
  onExportPdf,
  onPrint,
  showPrint,
  exportExcelLabel,
  exportPdfLabel,
  exportButtonLabel,
  printButtonLabel,
  exportExcelDisabled,
  exportPdfDisabled,
  printDisabled,
  exportDropdownDisabled,
}) {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);
  const hasFilters = React.Children.count(children) > 0;
  const hasExcel = typeof onExportExcel === 'function';
  const hasPdf = typeof onExportPdf === 'function';
  const hasPrint = typeof onPrint === 'function';
  const showExportBtn = hasExcel || hasPdf;
  const shouldRenderPrint = hasPrint || Boolean(showPrint);

  const _exportExcelLabel = exportExcelLabel ?? (typeof window !== 'undefined' && document?.dir === 'rtl' ? 'تصدير إكسل' : 'Export to Excel');
  const _exportPdfLabel = exportPdfLabel ?? (typeof window !== 'undefined' && document?.dir === 'rtl' ? 'تصدير PDF' : 'Export to PDF');
  const _exportButtonLabel = exportButtonLabel ?? (typeof window !== 'undefined' && document?.dir === 'rtl' ? 'تصدير' : 'Export');
  const _printButtonLabel = printButtonLabel ?? (typeof window !== 'undefined' && document?.dir === 'rtl' ? 'طباعة' : 'Print');

  useEffect(() => {
    if (!exportMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setExportMenuOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setExportMenuOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [exportMenuOpen]);

  const runExport = (handler) => {
    try {
      handler?.();
    } finally {
      setExportMenuOpen(false);
    }
  };

  return (
    <>
      <div className={cx(headerClassName ?? 'report-header')}>
        <div className={cx(headerClassName ? '' : 'report-header__content', headerContentClassName ?? '')}>
          {title && <h1 className={cx(headerClassName ? '' : 'report-header__title', titleClassName ?? '')}>{title}</h1>}
          {subtitle && <p className={cx(headerClassName ? '' : 'report-header__subtitle', subtitleClassName ?? '')}>{subtitle}</p>}
        </div>

        {(showExportBtn || hasPrint) && (
          <div className={cx(actionsClassName ?? 'report-header__actions')}>
            {showExportBtn && (
              <div ref={exportMenuRef} className={cx('report-header__export', exportMenuClassName ?? '')}>
                <button
                  type="button"
                  disabled={exportDropdownDisabled}
                  className={cx('report-header__btn', 'report-header__btn--export', exportButtonClassName ?? '')}
                  aria-haspopup="menu"
                  aria-expanded={exportMenuOpen}
                  onClick={() => setExportMenuOpen((open) => !open)}
                >
                  <span>{_exportButtonLabel}</span>
                  <span className={cx('material-icons-outlined', 'report-header__chevron', exportMenuOpen && 'report-header__chevron--open')} aria-hidden="true">expand_more</span>
                </button>

                {exportMenuOpen && (
                  <div className={cx('report-header__export-menu', exportMenuItemsClassName ?? '')} role="menu">
                    {hasExcel && (
                      <button
                        type="button"
                        role="menuitem"
                        disabled={exportExcelDisabled}
                        onClick={() => runExport(onExportExcel)}
                        className={cx('report-header__export-menu-item', exportMenuItemClassName ?? '')}
                      >
                        <span className="material-icons-outlined report-header__export-menu-icon" aria-hidden="true">description</span>
                        <span>{_exportExcelLabel}</span>
                      </button>
                    )}
                    {hasPdf && (
                      <button
                        type="button"
                        role="menuitem"
                        disabled={exportPdfDisabled}
                        onClick={() => runExport(onExportPdf)}
                        className={cx('report-header__export-menu-item', exportMenuItemClassName ?? '')}
                      >
                        <span className="material-icons-outlined report-header__export-menu-icon" aria-hidden="true">picture_as_pdf</span>
                        <span>{_exportPdfLabel}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {shouldRenderPrint && (
              <button
                type="button"
                onClick={() => onPrint?.()}
                disabled={printDisabled || !hasPrint}
                className={cx('report-header__btn', 'report-header__btn--print', printButtonClassName ?? '')}
              >
                <span className="material-icons-outlined report-header__print-icon" aria-hidden="true">print</span>
                <span>{_printButtonLabel}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {hasFilters && (
        <div className={cx(filtersCardClassName ?? 'report-header__filters-card')}>
          <div className={cx(filtersGridClassName ?? 'report-header__filters-grid')}>
            {children}
          </div>
        </div>
      )}
    </>
  );
}

export function ReportFormGroup({ label, htmlFor, className, labelClassName, children }) {
  return (
    <div className={cx(className ?? 'report-header__form-group')}>
      {label && <label htmlFor={htmlFor} className={labelClassName ?? ''}>{label}</label>}
      {children}
    </div>
  );
}

export function ReportFormActions({ className, children }) {
  return <div className={cx(className ?? 'report-header__form-actions')}>{children}</div>;
}