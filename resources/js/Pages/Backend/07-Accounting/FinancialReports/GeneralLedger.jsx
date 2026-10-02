import React, { useEffect, useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import * as XLSX from 'xlsx';
import AdminLayout from '../../components/AdminLayout';
import SearchableComboBox from '../../components/SearchableComboBox';
import Pagination from '../../components/Pagination';
import { apiService } from '../../../../services/api';

const STATUS_OPTIONS = [
  { value: 'posted', label: 'Posted only' },
  { value: 'unposted', label: 'Unposted only' },
  { value: 'all', label: 'All' },
];

/**
 * Audit Phase 5: a balance is a magnitude AND a Debit/Credit direction.
 * The backend computes the signed value from the account's nature — for a
 * Debit-nature account the sign is debit − credit (positive ⇒ Debit), for
 * a Credit-nature account it is credit − debit (positive ⇒ Credit). The
 * old `Math.abs(...)` rendering kept the magnitude but hid the direction
 * entirely. The direction label comes from the API's `account.dm_label`
 * (the same value the Nature summary card shows).
 */
export const formatBalanceWithDirection = (value, natureLabel) => {
  const amount = Math.abs(Number(value) || 0).toFixed(2);
  const isCreditNature = natureLabel === 'Credit';
  // A non-negative balance carries the account's own nature; a negative
  // balance overflows the natural side and flips the direction.
  const direction = (Number(value) < 0) === isCreditNature ? 'Debit' : 'Credit';
  return `${amount} ${direction}`;
};

export default function GeneralLedger() {
  const { props } = usePage();
  const localization = props?.localization || {};
  const translations = localization?.translations || {};
  const locale = localization?.current_locale || route().params.lang || 'ar';

  const t = (key, fallback, replacements = {}) => {
    let message = translations[`Journal.${key}`] || translations[`FinancialReports.${key}`] || translations[key] || fallback;
    Object.keys(replacements).forEach((r) => {
      message = message.replace(`:${r}`, replacements[r]);
    });
    return message;
  };

  const financialReportsRoute = () => route('admin.financial-reports.index', {
    country: localization?.country_code || route().params.country || 'sa',
    lang: locale,
  });

  STATUS_OPTIONS[0].label = t('posted_only', 'Posted Only');
  STATUS_OPTIONS[1].label = t('unposted_only', 'Unposted Only');
  STATUS_OPTIONS[2].label = t('all', 'All');

  const [accounts, setAccounts] = useState([]);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    accountId: '',
    status: 'posted',
  });
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 15;
  const [totalRecords, setTotalRecords] = useState(0);

  const loadAccounts = async () => {
    try {
      const response = await apiService.get('/accounts', { type: 1 });
      const data = Array.isArray(response.data) ? response.data : [];
      setAccounts(data);
    } catch {
      setAccounts([]);
    }
  };

  const getQueryFilters = () => {
    const params = new URLSearchParams(window.location.search || '');
    const accountId =
      params.get('accountId') || params.get('account_id') || '';
    const dateFrom = params.get('dateFrom') || params.get('date_from') || '';
    const dateTo = params.get('dateTo') || params.get('date_to') || '';
    const status = params.get('status') || 'posted';
    const page = parseInt(params.get('page') || '1', 10);
    return { accountId, dateFrom, dateTo, status, page };
  };

  const loadLedger = async (overrideFilters, pageNum = 1) => {
    const f = overrideFilters ?? filters;
    if (!f.accountId) {
      setLedger(null);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const urlParams = new URLSearchParams();
      if (f.accountId) urlParams.set('accountId', String(f.accountId));
      if (f.dateFrom) urlParams.set('dateFrom', f.dateFrom);
      if (f.dateTo) urlParams.set('dateTo', f.dateTo);
      if (f.status) urlParams.set('status', f.status);
      if (pageNum > 1) urlParams.set('page', String(pageNum));

      const nextUrl =
        urlParams.toString() === ''
          ? window.location.pathname
          : `${window.location.pathname}?${urlParams.toString()}`;
      window.history.replaceState(null, '', nextUrl);

      const response = await apiService.get('/reports/general-ledger', {
        account_id: Number(f.accountId),
        date_from: f.dateFrom || undefined,
        date_to: f.dateTo || undefined,
        status: f.status || undefined,
        page: pageNum,
        per_page: perPage,
      });

      setLedger(response.data);
      if (response.data.pagination) {
        setCurrentPage(response.data.pagination.current_page);
        setTotalRecords(response.data.pagination.total);
      }
    } catch (e) {
      const message =
        e?.response?.data?.message || t('failed_to_load', 'Failed to load general ledger.');
      setError(message);
      setLedger(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const q = getQueryFilters();
    setFilters((prev) => ({
      ...prev,
      accountId: q.accountId,
      dateFrom: q.dateFrom,
      dateTo: q.dateTo,
      status: q.status,
    }));
    setCurrentPage(q.page);
    loadAccounts();
    if (q.accountId) {
      loadLedger(q, q.page);
    }
  }, []);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    loadLedger(filters, newPage);
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    loadLedger(filters, 1);
  };

  const handleExportExcel = async () => {
    if (!filters.accountId || loading) return;
    
    setLoading(true);
    try {
      const response = await apiService.get('/reports/general-ledger', {
        account_id: Number(filters.accountId),
        date_from: filters.dateFrom || undefined,
        date_to: filters.dateTo || undefined,
        status: filters.status || undefined,
        per_page: -1,
      });

      const data = response.data;
      const entries = data.entries || [];
      
      const rows = [];
      // Add Opening Balance
      rows.push({
        'Date': '',
        'Posted At': '',
        'Journal Code': '',
        'Reference': '',
        'Description': t('opening_balance', 'Opening balance'),
        'Debit': 0,
        'Credit': 0,
        // Phase 5: same direction-explicit presentation as the screen.
        'Running Balance': formatBalanceWithDirection(data.opening_balance, natureLabel)
      });

      // Add Entries
      entries.forEach(entry => {
        rows.push({
          'Date': entry.date,
          // Audit Phase 3: same field the screen renders — actual posting
          // time, or an em-dash for historical rows with no posted_at.
          'Posted At': entry.posted_at ?? '—',
          'Journal Code': entry.journal_code,
          'Reference': entry.reference,
          'Description': entry.description,
          'Debit': entry.debit || 0,
          'Credit': entry.credit || 0,
          'Running Balance': formatBalanceWithDirection(entry.running_balance, natureLabel),
          'Status': entry.is_balanced === 0 ? t('unbalanced', 'Unbalanced') : ''
        });
      });

      // Add Totals
      rows.push({
        'Date': '',
        'Posted At': '',
        'Journal Code': '',
        'Reference': '',
        'Description': t('totals', 'Totals'),
        'Debit': data.total_debit,
        'Credit': data.total_credit,
        'Running Balance': formatBalanceWithDirection(data.closing_balance, natureLabel)
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'General Ledger');
      
      // Column widths
      worksheet['!cols'] = [
        { wch: 15 }, // Date
        { wch: 20 }, // Posted At
        { wch: 15 }, // Journal Code
        { wch: 15 }, // Reference
        { wch: 40 }, // Description
        { wch: 12 }, // Debit
        { wch: 12 }, // Credit
        { wch: 20 }, // Running Balance (amount + Debit/Credit direction)
        { wch: 15 }  // Status
      ];

      const fileName = `${t('general_ledger_file_prefix', 'General_Ledger')}_${accountLabel.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error('Export failed:', err);
      setError(t('failed_to_export', 'Failed to export Excel.'));
    } finally {
      setLoading(false);
    }
  };

  const handleJournalClick = (code) => {
    if (!code) return;
    router.get(route('admin.journal-entries', {
      country: localization?.country_code || 'sa',
      lang: localization?.current_locale || 'ar',
      code: code,
      mode: 'view'
    }));
  };

  const rowsWithOpening = useMemo(() => {
    if (!ledger) return [];
    const result = [...ledger.entries];
    // Only show opening balance row on the first page
    if (currentPage === 1 && ledger.opening_balance !== 0) {
      result.unshift({
        isOpening: true,
        date: '',
        posted_at: '',
        journal_code: '',
        reference: '',
        description: t('opening_balance', 'Opening balance'),
        debit: 0,
        credit: 0,
        running_balance: ledger.opening_balance,
        status: '',
      });
    }
    return result;
  }, [ledger, currentPage]);

  const accountLabel = useMemo(() => {
    if (!ledger?.account) return '';
    return `${ledger.account.code} - ${ledger.account.name}`;
  }, [ledger]);

  const natureLabel = useMemo(() => {
    if (!ledger?.account) return '';
    return ledger.account.dm_label;
  }, [ledger]);

  const accountOptions = useMemo(
    () =>
      accounts.map((acc) => ({
        value: String(acc.AccID),
        label: `${acc.AccCode} - ${acc.AccName}`,
      })),
    [accounts],
  );

  return (
    <AdminLayout activeMenu="Financial Reports">
      <Head title={t('general_ledger_title', 'General Ledger - ZodicERP')} />
      <div className="GeneralLedger-page">
        <div className="breadcrumb">
          <a href="#">{t('dashboard', 'Dashboard')}</a>
          <span>/</span>
          <a href="#">{t('accounting', 'Accounting')}</a>
          <span>/</span>
          <a href={financialReportsRoute()}>{t('financial_reports', 'Financial Reports')}</a>
          <span>/</span>
          <span>{t('general_ledger', 'General Ledger')}</span>
        </div>

        <div className="gl-header">
          <div>
            <h1 className="gl-title">{t('general_ledger', 'General Ledger')}</h1>
            <p className="gl-subtitle">
              {t('general_ledger_desc', 'Detailed posting history with running balance by account.')}
            </p>
          </div>
        </div>

        <div className="gl-filters-card">
          <div className="gl-filters-grid">
            <div className="gl-form-group">
              <label htmlFor="gl-account">{t('account', 'Account')}</label>
              <SearchableComboBox
                options={accountOptions}
                value={filters.accountId}
                onChange={(val) => handleFilterChange('accountId', val)}
                placeholder={t('select_account', 'Select account')}
              />
            </div>
            <div className="gl-form-group">
              <label htmlFor="gl-date-from">{t('date_from', 'Date from')}</label>
              <input
                id="gl-date-from"
                type="date"
                className="gl-input"
                value={filters.dateFrom}
                onChange={(e) =>
                  handleFilterChange('dateFrom', e.target.value)
                }
              />
            </div>
            <div className="gl-form-group">
              <label htmlFor="gl-date-to">{t('date_to', 'Date to')}</label>
              <input
                id="gl-date-to"
                type="date"
                className="gl-input"
                value={filters.dateTo}
                onChange={(e) =>
                  handleFilterChange('dateTo', e.target.value)
                }
              />
            </div>
            <div className="gl-form-group">
              <label htmlFor="gl-status">{t('journal_status', 'Journal status')}</label>
              <select
                id="gl-status"
                className="gl-input"
                value={filters.status}
                onChange={(e) =>
                  handleFilterChange('status', e.target.value)
                }
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="gl-form-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleApplyFilters}
                disabled={!filters.accountId || loading}
                style={{ marginRight: '8px' }}
              >
                <span className="material-icons-outlined">filter_alt</span>
                <span>{t('apply_filters', 'Apply filters')}</span>
              </button>
              <button
                type="button"
                className="btn btn-excel"
                onClick={handleExportExcel}
                disabled={!filters.accountId || loading || !ledger}
                style={{
                  backgroundColor: '#4caf50',
                  color: 'white',
                  borderColor: '#4caf50',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: (!filters.accountId || loading || !ledger) ? 'not-allowed' : 'pointer',
                  opacity: (!filters.accountId || loading || !ledger) ? 0.6 : 1
                }}
              >
                <span className="material-icons-outlined">description</span>
                <span>{t('export_excel', 'Export Excel')}</span>
              </button>
            </div>
          </div>
        </div>

        {ledger && (
          <div className="gl-summary">
            <div className="gl-summary-item">
              <span className="gl-summary-label">{t('account', 'Account')}</span>
              <span className="gl-summary-value">{accountLabel}</span>
            </div>
            <div className="gl-summary-item">
              <span className="gl-summary-label">{t('nature', 'Nature')}</span>
              <span className="gl-summary-value">{natureLabel}</span>
            </div>
            <div className="gl-summary-item">
              <span className="gl-summary-label">{t('opening_balance', 'Opening balance')}</span>
              <span className="gl-summary-value">
                {formatBalanceWithDirection(ledger.opening_balance, natureLabel)}
              </span>
            </div>
            <div className="gl-summary-item">
              <span className="gl-summary-label">{t('closing_balance', 'Closing balance')}</span>
              <span className="gl-summary-value">
                {formatBalanceWithDirection(ledger.closing_balance, natureLabel)}
              </span>
            </div>
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}

        <div className="gl-table-card">
          <table className="gl-table">
            <thead>
              <tr>
                <th>{t('date', 'Date')}</th>
                <th>{t('posted_at', 'Posted at')}</th>
                <th>{t('journal_code', 'Journal code')}</th>
                <th>{t('reference', 'Reference')}</th>
                <th>{t('description', 'Description')}</th>
                <th className="gl-amount-header">{t('debit', 'Debit')}</th>
                <th className="gl-amount-header">{t('credit', 'Credit')}</th>
                <th className="gl-amount-header">{t('running_balance', 'Running balance')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="text-center">
                    {t('loading_ledger', 'Loading...')}
                  </td>
                </tr>
              )}
              {!loading && (!ledger || rowsWithOpening.length === 0) && (
                <tr>
                  <td colSpan={8} className="text-center">
                    {t('no_ledger_entries', 'No ledger entries found for current filters.')}
                  </td>
                </tr>
              )}
              {!loading &&
                rowsWithOpening.map((row, index) => (
                  <tr
                    key={`${row.journal_code || 'opening'}-${index}`}
                    className={row.isOpening ? 'gl-opening-row' : ''}
                  >
                    <td>{row.date}</td>
                    {/* Audit Phase 3: the real posting timestamp — an em-dash
                        for historical journals with no posted_at, never a
                        fabricated value. Synthetic opening row is empty. */}
                    <td>{row.posted_at ?? '—'}</td>
                    <td>
                      {row.journal_code ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            className="gl-link-button"
                            onClick={() => handleJournalClick(row.journal_code)}
                          >
                            {row.journal_code}
                          </button>
                          {!row.isOpening && row.is_balanced === 0 && (
                            <span 
                              className="material-icons-outlined" 
                              style={{ color: '#c62828', fontSize: '16px' }}
                              title={t('unbalanced_journal_entry', 'Unbalanced Journal Entry')}
                            >
                              error_outline
                            </span>
                          )}
                        </div>
                      ) : (
                        ''
                      )}
                    </td>
                    <td>{row.reference}</td>
                    <td>{row.description}</td>
                    <td className="gl-amount gl-amount-debit">
                      {row.debit ? row.debit.toFixed(2) : ''}
                    </td>
                    <td className="gl-amount gl-amount-credit">
                      {row.credit ? row.credit.toFixed(2) : ''}
                    </td>
                    <td className="gl-amount">
                      {formatBalanceWithDirection(row.running_balance, natureLabel)}
                    </td>
                  </tr>
                ))}
            </tbody>
            {ledger && (
              <tfoot>
                <tr>
                  <td colSpan={5} className="gl-total-label">
                    {t('totals', 'Totals')}
                  </td>
                  <td className="gl-amount gl-amount-debit">
                    {ledger.total_debit.toFixed(2)}
                  </td>
                  <td className="gl-amount gl-amount-credit">
                    {ledger.total_credit.toFixed(2)}
                  </td>
                  <td className="gl-amount">
                    {formatBalanceWithDirection(ledger.closing_balance, natureLabel)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
          
          {ledger && totalRecords > perPage && (
            <div className="gl-pagination-wrapper" style={{ padding: '1rem' }}>
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(totalRecords / perPage)}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
