import React from 'react';
import './PrintReport.scss';

const formatDate = (value, locale) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(locale || 'en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

export function PrintReportButton({ children, className = 'print-report__button', disabled = false, ...props }) {
  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      onClick={() => window.print()}
      {...props}
    >
      {children || 'Print'}
    </button>
  );
}

export default function PrintReport({
  companyName,
  companyLogo,
  reportTitle,
  dateFrom,
  dateTo,
  locale = 'en',
  printedAt = new Date(),
  children,
  className = '',
}) {
  const isArabic = String(locale).toLowerCase().startsWith('ar');
  const printedDate = formatDate(printedAt, locale);
  const fromLabel = isArabic ? 'من' : 'From';
  const toLabel = isArabic ? 'إلى' : 'To';
  const printedLabel = isArabic ? 'تاريخ الطباعة' : 'Printed on';

  return (
    <section className={`print-report ${className}`.trim()} dir={isArabic ? 'rtl' : 'ltr'}>
      <header className="print-report__header">
        <div className="print-report__brand">
          {companyLogo && (
            <img className="print-report__logo" src={companyLogo} alt={companyName || 'Company logo'} />
          )}
          <div className="print-report__company">{companyName || (isArabic ? 'الشركة' : 'Company')}</div>
        </div>
        <div className="print-report__title-block">
          <h1 className="print-report__title">{reportTitle}</h1>
          <div className="print-report__date-range">
            {dateFrom || dateTo ? (
              <>
                {dateFrom && <span>{fromLabel}: {formatDate(dateFrom, locale)}</span>}
                {dateTo && <span>{toLabel}: {formatDate(dateTo, locale)}</span>}
              </>
            ) : (
              <span>{printedLabel}: {printedDate}</span>
            )}
          </div>
        </div>
        <div className="print-report__printed-at">{printedDate}</div>
      </header>
      <div className="print-report__content">{children}</div>
    </section>
  );
}