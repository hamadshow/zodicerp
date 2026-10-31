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
  companyInfo,
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
  const localizedCompanyName = [
    isArabic ? companyInfo?.company_name : companyInfo?.english_name,
    companyInfo?.company_name,
    companyInfo?.english_name,
    companyName,
  ].find((value) => typeof value === 'string' && value.trim())?.trim()
    || (isArabic ? 'الشركة' : 'Company');
  const mobile = typeof companyInfo?.mobile === 'string' || typeof companyInfo?.mobile === 'number'
    ? String(companyInfo.mobile).trim()
    : '';
  const location = [companyInfo?.country, companyInfo?.city, companyInfo?.area]
    .map((value) => (typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''))
    .filter(Boolean)
    .join(' - ');
  const vatNumber = typeof companyInfo?.vat_number === 'string' || typeof companyInfo?.vat_number === 'number'
    ? String(companyInfo.vat_number).trim()
    : '';
  const fromLabel = isArabic ? 'من' : 'From';
  const toLabel = isArabic ? 'إلى' : 'To';
  const printedLabel = isArabic ? 'تاريخ الطباعة' : 'Printed on';

  return (
    <section className={`print-report ${className}`.trim()} dir={isArabic ? 'rtl' : 'ltr'}>
      <header className="print-report__header">
        <div className="print-report__metadata">
          <div className="print-report__printed-at" dir="auto">
            {printedLabel}: {printedDate}
          </div>
        </div>
        <div className="print-report__company-block">
          {companyLogo && (
            <img
              className="print-report__logo"
              src={companyLogo}
              alt={localizedCompanyName}
              onError={(event) => {
                event.currentTarget.hidden = true;
              }}
            />
          )}
          <div className="print-report__company-info">
            <div className="print-report__company" dir="auto">{localizedCompanyName}</div>
            {location && <div className="print-report__company-detail" dir="auto">{location}</div>}
            {mobile && <div className="print-report__company-detail" dir="ltr">{mobile}</div>}
            {vatNumber && <div className="print-report__company-detail" dir="ltr">{vatNumber}</div>}
          </div>
        </div>
        <div className="print-report__title-block">
          <h1 className="print-report__title">{reportTitle}</h1>
          {(dateFrom || dateTo) && (
            <div className="print-report__date-range">
              {dateFrom && <span>{fromLabel}: {formatDate(dateFrom, locale)}</span>}
              {dateTo && <span>{toLabel}: {formatDate(dateTo, locale)}</span>}
            </div>
          )}
        </div>
      </header>
      <div className="print-report__content">{children}</div>
    </section>
  );
}