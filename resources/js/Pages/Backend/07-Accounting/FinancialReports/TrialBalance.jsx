import React, { useState, useCallback } from 'react';
import { Head, usePage } from '@inertiajs/react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import AdminLayout from '../../components/AdminLayout';
import ReportHeader, { ReportFormActions, ReportFormGroup } from '../../components/ReportHeader';
import { apiService } from '../../../../services/api';
import PrintReport from '../../../../Components/PrintReport';
import { exportReportToExcel } from '../../../../Components/ExportReportExcel';

const parseIsoDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
};

const formatIsoDate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function TrialBalance() {
  const { props } = usePage();
  const localization = props.localization || {};
  const translations = localization.translations || {};
  const currentLocale = localization.current_locale || 'en';

  const t = useCallback((key, fallback) => {
    return translations[`TrialBalance.${key}`] || fallback;
  }, [translations]);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [reportError, setReportError] = useState('');
  const [exportError, setExportError] = useState('');
  const [hasAppliedReport, setHasAppliedReport] = useState(false);
  const [appliedPeriod, setAppliedPeriod] = useState(null);
  const [appliedFilters, setAppliedFilters] = useState(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchData = useCallback(async (selectedFromDate = '', selectedToDate = '') => {
    try {
      setLoading(true);
      setReportError('');
      setExportError('');
      const params = new URLSearchParams();

      if (selectedFromDate) {
        params.set('start_date', selectedFromDate);
      }

      if (selectedToDate) {
        params.set('as_of_date', selectedToDate);
      }

      const queryString = params.toString();
      const response = await apiService.get(
        queryString ? `/reports/trial-balance?${queryString}` : '/reports/trial-balance',
      );
      const reportData = Array.isArray(response.data) ? response.data : [];
      const appliedFrom = response.headers?.['x-trial-balance-start-date'] || selectedFromDate;
      const appliedTo = response.headers?.['x-trial-balance-as-of-date'] || selectedToDate;
      const displayedFrom = selectedFromDate || appliedFrom || '';
      const displayedTo = selectedToDate || appliedTo || '';
      setData(reportData);
      setHasAppliedReport(true);
      setAppliedPeriod({
        from: appliedFrom,
        to: appliedTo,
      });
      setFromDate(displayedFrom);
      setToDate(displayedTo);
      setAppliedFilters({ from: displayedFrom, to: displayedTo });
      setReportError('');
      setExportError('');
    } catch (error) {
      console.error('Failed to fetch trial balance:', error);
      setData([]);
      setHasAppliedReport(false);
      setAppliedPeriod(null);
      setAppliedFilters(null);
      setReportError(t('load_error', 'Unable to load the Trial Balance report. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const handleApplyFilters = () => {
    if (!fromDate && !toDate) {
      fetchData();
      return;
    }

    if (!fromDate || !toDate) {
      window.alert(t('date_range_required', 'Please select both From Date and To Date.'));
      return;
    }

    if (!parseIsoDate(fromDate) || !parseIsoDate(toDate)) {
      window.alert(t('invalid_date', 'Please enter valid dates.'));
      return;
    }

    if (fromDate > toDate) {
      window.alert(t('date_range_invalid', 'From Date cannot be after To Date.'));
      return;
    }

    fetchData(fromDate, toDate);
  };

  const handleResetFilters = () => {
    setFromDate('');
    setToDate('');
    setData([]);
    setHasAppliedReport(false);
    setAppliedPeriod(null);
    setAppliedFilters(null);
    setReportError('');
    setExportError('');
  };

  const formatNumber = (num) => {
    if (num === 0) return '-';
    return new Intl.NumberFormat(currentLocale === 'ar' ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const translateAccountName = useCallback((code, name) => {
    const accountTranslations = {
      '1': t('assets', 'Assets'),
      '2': t('liabilities', 'Liabilities'),
      '3': t('equity', 'Equity'),
      '4': t('income', 'Income'),
      '5': t('cost_of_goods_sold', 'Cost of Goods Sold'),
      '6': t('expenses', 'Expenses')
    };
    
    return String(currentLocale).toLowerCase().startsWith('ar')
      ? name
      : (accountTranslations[code] || name);
  }, [currentLocale, t]);

  const handleAccountClick = (row) => {
    if (row.AccType !== 1) return;
    
    const currentPath = window.location.pathname;
    const glPath = currentPath.replace('trial-balance', 'general-ledger');
    
    const fullUrl = `${glPath}?accountId=${row.AccID}`;
    window.open(fullUrl, '_blank');
  };

  const grandTotals = data.reduce((acc, row) => {
    if (row.depth === 0) {
      acc.beginning_debit += Number(row.beginning_debit || 0);
      acc.beginning_credit += Number(row.beginning_credit || 0);
      acc.current_debit += Number(row.current_debit || 0);
      acc.current_credit += Number(row.current_credit || 0);
      acc.ending_debit += Number(row.ending_debit || 0);
      acc.ending_credit += Number(row.ending_credit || 0);
    }
    return acc;
  }, {
    beginning_debit: 0,
    beginning_credit: 0,
    current_debit: 0,
    current_credit: 0,
    ending_debit: 0,
    ending_credit: 0
  });

  const filtersChangedSinceReport = !appliedFilters
    || fromDate !== appliedFilters.from
    || toDate !== appliedFilters.to;

  const handleExportExcel = useCallback(() => {
    setExportError('');

    if (data.length === 0) {
      setExportError(t('no_data_to_export', 'There is no Trial Balance data to export.'));
      return;
    }

    const periodFrom = appliedPeriod?.from || t('default_period', 'Report default');
    const periodTo = appliedPeriod?.to || t('default_period', 'Report default');
    const columns = [
      { header: t('account_code', 'Account Code'), width: 12 },
      { header: t('account_name', 'Account Name'), width: 50 },
      { header: `${t('beginning', 'Beginning Balances')} (${t('debit', 'Debit')})`, width: 18 },
      { header: `${t('beginning', 'Beginning Balances')} (${t('credit', 'Credit')})`, width: 18 },
      { header: `${t('current', 'CURRENT')} (${t('debit', 'Debit')})`, width: 18 },
      { header: `${t('current', 'CURRENT')} (${t('credit', 'Credit')})`, width: 18 },
      { header: `${t('balance', 'BALANCE (Ending Balance)')} (${t('debit', 'Debit')})`, width: 18 },
      { header: `${t('balance', 'BALANCE (Ending Balance)')} (${t('credit', 'Credit')})`, width: 18 },
    ];
    const rows = data.map((row) => {
      const indentation = '  '.repeat(Math.max(0, Number(row.depth) || 0));
      const accountName = translateAccountName(row.AccCode, row.AccName);
      const name = row.AccType === 0
        ? `${t('total', 'Total')} ${accountName}`
        : accountName;

      return {
        values: [
          row.AccCode,
          indentation + name,
          Number(row.beginning_debit ?? 0),
          Number(row.beginning_credit ?? 0),
          Number(row.current_debit ?? 0),
          Number(row.current_credit ?? 0),
          Number(row.ending_debit ?? 0),
          Number(row.ending_credit ?? 0),
        ],
      };
    });
    const totalsRow = {
      label: '',
      values: [
        t('grand_total', 'GRAND TOTAL'),
        grandTotals.beginning_debit,
        grandTotals.beginning_credit,
        grandTotals.current_debit,
        grandTotals.current_credit,
        grandTotals.ending_debit,
        grandTotals.ending_credit,
      ],
    };

    const filename = appliedPeriod?.from && appliedPeriod?.to
      ? `Trial_Balance_${appliedPeriod.from}_to_${appliedPeriod.to}.xlsx`
      : `Trial_Balance_${new Date().toISOString().slice(0, 10)}.xlsx`;

    const workbook = exportReportToExcel({
      title: t('title', 'Trial Balance'),
      metaRows: [
        [`${t('from_date', 'From Date')}: ${periodFrom}`, `${t('to_date', 'To Date')}: ${periodTo}`],
      ],
      columns,
      rows,
      totalsRow,
      sheetName: 'Trial Balance',
      filename,
      onError: () => setExportError(t('export_error', 'Unable to export the Trial Balance. Please try again.')),
    });
    if (!workbook) console.error('Failed to export trial balance workbook');
  }, [data, appliedPeriod, grandTotals, t, translateAccountName]);

  const handleExportPdf = useCallback(async () => {
    setExportError('');

    if (data.length === 0) {
      setExportError(t('no_data_to_export', 'There is no Trial Balance data to export.'));
      return;
    }

    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.getElementById('trial-balance-report');
      if (!element) throw new Error('Report element not found');

      const filename = appliedPeriod?.from && appliedPeriod?.to
        ? `Trial_Balance_${appliedPeriod.from}_to_${appliedPeriod.to}.pdf`
        : `Trial_Balance_${new Date().toISOString().slice(0, 10)}.pdf`;

      const worker = html2pdf().set({
        margin: 10,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      });

      await worker.from(element).save();
    } catch (error) {
      console.error('Failed to export trial balance PDF:', error);
      setExportError(t('pdf_export_error', 'Unable to export the Trial Balance PDF. Please try again.'));
    }
  }, [data, appliedPeriod, t]);

  return (
    <AdminLayout activeMenu="Financial Reports">
      <Head title={`${t('title', 'Trial Balance')} - ZodicERP`} />
      <div className={`fr-page trial-balance-page ${String(currentLocale).toLowerCase().startsWith('ar') ? 'rtl' : 'ltr'}`}>
        <div className="fr-breadcrumb">
          <a href="#">{t('dashboard', 'Dashboard')}</a>
          <span className="fr-sep">/</span>
          <a href="#">{t('accounting', 'Accounting')}</a>
          <span className="fr-sep">/</span>
          <a href="#">{t('financial_reports', 'Financial Reports')}</a>
          <span className="fr-sep">/</span>
          <span className="fr-current">{t('title', 'Trial Balance')}</span>
        </div>

        <ReportHeader
          title={t('title', 'Trial Balance')}
          subtitle={t('subtitle', "Trial balance summary of debit and credit balances by account.")}
          onExportExcel={handleExportExcel}
          onExportPdf={handleExportPdf}
          onPrint={() => window.print()}
          printDisabled={loading || !hasAppliedReport}
          exportExcelLabel={t('export_excel', 'Export Excel')}
          exportPdfLabel={t('export_pdf', 'Export Report (PDF)')}
          printButtonLabel={t('print', 'Print')}
          exportExcelDisabled={loading || data.length === 0 || filtersChangedSinceReport}
          exportPdfDisabled={loading || data.length === 0 || filtersChangedSinceReport}
          exportDropdownDisabled={loading}
          filtersGridClassName="report-header__filters-grid trial-balance-filters-grid"
        >
          <ReportFormGroup
            className="report-header__form-group trial-balance-date-filter"
            label={t('from_date', 'From Date')}
            htmlFor="tb-date-from"
          >
            <DatePicker
              id="tb-date-from"
              selected={parseIsoDate(fromDate)}
              onChange={(date) => setFromDate(formatIsoDate(date))}
              dateFormat="dd/MM/yyyy"
              placeholderText="DD/MM/YYYY"
              className="report-header__form-control"
              autoComplete="off"
              disabled={loading}
            />
          </ReportFormGroup>

          <ReportFormGroup
            className="report-header__form-group trial-balance-date-filter"
            label={t('to_date', 'To Date')}
            htmlFor="tb-date-to"
          >
            <DatePicker
              id="tb-date-to"
              selected={parseIsoDate(toDate)}
              onChange={(date) => setToDate(formatIsoDate(date))}
              dateFormat="dd/MM/yyyy"
              placeholderText="DD/MM/YYYY"
              className="report-header__form-control"
              autoComplete="off"
              disabled={loading}
            />
          </ReportFormGroup>

          <ReportFormActions className="report-header__form-actions trial-balance-filter-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleApplyFilters}
              disabled={loading}
            >
              <span className="material-icons-outlined">filter_alt</span>
              <span>{t('apply', 'Apply')}</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleResetFilters}
              disabled={loading}
            >
              <span>{t('reset', 'Reset')}</span>
            </button>
          </ReportFormActions>
        </ReportHeader>

        {reportError && <div className="fr-error-banner" role="alert">{reportError}</div>}
        {exportError && <div className="fr-error-banner" role="alert">{exportError}</div>}

        {hasAppliedReport && <PrintReport
          companyInfo={props.printCompany}
          companyLogo={props.printCompany?.logo_url}
          reportTitle={t('title', 'Trial Balance')}
          dateFrom={appliedPeriod?.from || undefined}
          dateTo={appliedPeriod?.to || undefined}
          locale={currentLocale}
        >
          <div className="fr-table-card" id="trial-balance-report">
          <div className="fr-table-wrapper">
            <table className="fr-table">
              <thead>
                <tr className="main-header">
                  <th rowSpan="2" className="account-col">{t('account_name', 'Account Name')}</th>
                  <th colSpan="2">{t('beginning', 'Beginning Balances')}</th>
                  <th colSpan="2">{t('current', 'CURRENT')}</th>
                  <th colSpan="2">{t('balance', 'BALANCE (Ending Balance)')}</th>
                </tr>
                <tr className="sub-header">
                  <th>{t('debit', 'Debit')}</th>
                  <th>{t('credit', 'Credit')}</th>
                  <th>{t('debit', 'Debit')}</th>
                  <th>{t('credit', 'Credit')}</th>
                  <th>{t('debit', 'Debit')}</th>
                  <th>{t('credit', 'Credit')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-10">{t('loading', 'Loading...')}</td>
                  </tr>
                ) : data.length > 0 ? (
                  data.map((row) => (
                    <tr key={row.AccID} className={row.AccType === 0 ? 'row-parent' : 'row-account'}>
                      <td 
                        className={`account-cell ${row.AccType === 1 ? 'clickable-account' : ''}`} 
                        onClick={() => handleAccountClick(row)}
                        style={{ 
                          paddingInlineStart: `${row.depth * 25 + 15}px`,
                          fontWeight: row.AccType === 0 ? 'bold' : 'normal',
                          cursor: row.AccType === 1 ? 'pointer' : 'default'
                        }}
                      >
                        {row.AccType === 0 && <span className="total-label">{t('total', 'Total')} </span>}
                        {row.AccCode} - {translateAccountName(row.AccCode, row.AccName)}
                      </td>
                      <td className="text-right amount-cell">{formatNumber(row.beginning_debit)}</td>
                      <td className="text-right amount-cell">{formatNumber(row.beginning_credit)}</td>
                      <td className="text-right amount-cell">{formatNumber(row.current_debit)}</td>
                      <td className="text-right amount-cell">{formatNumber(row.current_credit)}</td>
                      <td className="text-right amount-cell font-bold">{formatNumber(row.ending_debit)}</td>
                      <td className="text-right amount-cell font-bold">{formatNumber(row.ending_credit)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-10">{t('no_data', 'No data available')}</td>
                  </tr>
                )}
              </tbody>
              {data.length > 0 && !loading && (
                <tfoot>
                  <tr className="grand-total-row">
                    <td className="account-cell font-bold text-center">
                      {t('grand_total', 'GRAND TOTAL')}
                    </td>
                    <td className="text-right amount-cell font-bold">{formatNumber(grandTotals.beginning_debit)}</td>
                    <td className="text-right amount-cell font-bold">{formatNumber(grandTotals.beginning_credit)}</td>
                    <td className="text-right amount-cell font-bold">{formatNumber(grandTotals.current_debit)}</td>
                    <td className="text-right amount-cell font-bold">{formatNumber(grandTotals.current_credit)}</td>
                    <td className="text-right amount-cell font-bold">{formatNumber(grandTotals.ending_debit)}</td>
                    <td className="text-right amount-cell font-bold">{formatNumber(grandTotals.ending_credit)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
        </PrintReport>}
      </div>

      <style jsx>{`
        .trial-balance-page.rtl { direction: rtl; text-align: right; }
        .trial-balance-page.ltr { direction: ltr; text-align: left; }

        .trial-balance-filters-grid {
          grid-template-columns: repeat(2, minmax(180px, 1fr)) auto;
        }

        .trial-balance-date-filter { min-width: 0; }

        .trial-balance-date-filter .react-datepicker-wrapper,
        .trial-balance-date-filter .react-datepicker__input-container {
          display: block;
          width: 100%;
        }

        .trial-balance-date-filter .report-header__form-control {
          box-sizing: border-box;
          min-width: 0;
          width: 100%;
        }

        .trial-balance-filter-actions {
          align-self: end;
          flex-wrap: wrap;
          padding-bottom: 1px;
        }

        @media (max-width: 760px) {
          .trial-balance-filters-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .trial-balance-filter-actions {
            grid-column: 1 / -1;
            justify-content: flex-end;
          }
        }

        @media (max-width: 480px) {
          .trial-balance-filters-grid {
            grid-template-columns: minmax(0, 1fr);
          }

          .trial-balance-filter-actions { grid-column: auto; }
        }
        
        .main-header th {
          background-color: #f1f5f9;
          color: #1e293b;
          font-size: 14px;
        }
        
        .sub-header th {
          font-size: 11px;
          text-transform: uppercase;
          background-color: #f8fafc;
        }
        
        .row-parent {
          background-color: #f8fafc;
        }

        .grand-total-row {
          background-color: #f1f5f9;
          color: #0f172a;
        }

        .grand-total-row td {
          border-top: 2px solid #94a3b8;
        }
        
        .row-account:hover {
          background-color: #f1f5f9;
        }

        .account-col {
          min-width: 300px;
          text-align: inherit !important;
        }

        .account-cell {
          text-align: inherit;
        }
        
        .clickable-account:hover {
          color: #2196F3;
          text-decoration: underline;
        }
        
        .amount-cell {
          width: 120px;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }

        .total-label {
          color: #64748b;
          font-size: 0.9em;
        }
        
        .text-right { text-align: right !important; }
        .text-center { text-align: center !important; }
        .font-bold { font-weight: 700; }
        .py-10 { padding-top: 2.5rem; padding-bottom: 2.5rem; }

        /* Overrides the shared 'size: A4 portrait' from PrintReport.scss for
           this wide 7-column report. This style tag renders after the shared
           stylesheet in the document, so its @page rule wins the cascade
           while the shared 12mm margin still applies. @page only affects
           paged media, so screen rendering is unchanged, and other reports
           keep the shared portrait default. */
        @page {
          size: A4 landscape;
        }

        @media print {
          .fr-error-banner { display: none !important; }

          .trial-balance-page .fr-table-card {
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .trial-balance-page .fr-table { font-size: 9pt; }

          .trial-balance-page .fr-table th,
          .trial-balance-page .fr-table td { padding: 4px 6px; }

          .trial-balance-page .amount-cell { width: auto; }

          .trial-balance-page .account-col { min-width: 0; }

          .trial-balance-page .main-header th { font-size: 11px; }

          .trial-balance-page .sub-header th { font-size: 9px; }
        }
      `}</style>
    </AdminLayout>
  );
}
