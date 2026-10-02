import React, { useEffect, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import * as XLSX from 'xlsx';
import AdminLayout from '../../components/AdminLayout';
import Pagination from '../../components/Pagination';
import { apiService } from '../../../../services/api';

export default function JournalReport() {
  const { props } = usePage();
  const localization = props?.localization || {};
  const translations = localization?.translations || {};
  const locale = localization?.current_locale || route().params.lang || 'ar';
  const financialReportsRoute = () => route('admin.financial-reports.index', {
    country: localization?.country_code || route().params.country || 'sa',
    lang: locale,
  });

  const t = (key, fallback, replacements = {}) => {
    let message = translations[`Journal.${key}`] || translations[`FinancialReports.${key}`] || translations[key] || fallback;
    Object.keys(replacements).forEach(r => {
      message = message.replace(`:${r}`, replacements[r]);
    });
    return message;
  };

  const STATUS_OPTIONS = [
    { value: 'posted', label: t('posted_only', 'Posted Only') },
    { value: 'unposted', label: t('unposted_only', 'Unposted Only') },
    { value: 'all', label: t('all', 'All') },
  ];

  const BALANCE_STATUS_OPTIONS = [
    { value: 'balanced', label: t('balanced', 'Balanced') },
    { value: 'unbalanced', label: t('unbalanced', 'Unbalanced') },
    { value: 'all', label: t('all', 'All') },
  ];

  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    search: '',
    status: 'all',
    balanceStatus: 'all',
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(15);
  const [totalRecords, setTotalRecords] = useState(0);

  const getQueryFilters = () => {
    const params = new URLSearchParams(window.location.search || '');
    const search = params.get('search') || '';
    const dateFrom = params.get('dateFrom') || '';
    const dateTo = params.get('dateTo') || '';
    const status = params.get('status') || 'all';
    const balanceStatus = params.get('balanceStatus') || 'all';
    const page = parseInt(params.get('page') || '1', 10);
    return { search, dateFrom, dateTo, status, balanceStatus, page };
  };

  const loadJournals = async (overrideFilters, pageNum = 1) => {
    const f = overrideFilters ?? filters;
    setLoading(true);
    setError('');

    try {
      const urlParams = new URLSearchParams();
      if (f.search) urlParams.set('search', f.search);
      if (f.dateFrom) urlParams.set('dateFrom', f.dateFrom);
      if (f.dateTo) urlParams.set('dateTo', f.dateTo);
      if (f.status) urlParams.set('status', f.status);
      if (f.balanceStatus) urlParams.set('balanceStatus', f.balanceStatus);
      if (pageNum > 1) urlParams.set('page', String(pageNum));

      const nextUrl =
        urlParams.toString() === ''
          ? window.location.pathname
          : `${window.location.pathname}?${urlParams.toString()}`;
      window.history.replaceState(null, '', nextUrl);

      const response = await apiService.get('/journals', {
        search: f.search || undefined,
        date_from: f.dateFrom || undefined,
        date_to: f.dateTo || undefined,
        status: f.status === 'all' ? undefined : f.status,
        balance_status: f.balanceStatus === 'all' ? undefined : f.balanceStatus,
        page: pageNum,
        per_page: perPage,
        with_lines: true,
      });

      const data = response.data;
      if (Array.isArray(data.data)) {
        setJournals(data.data);
        setCurrentPage(data.current_page);
        setTotalRecords(data.total);
      } else if (Array.isArray(data)) {
        setJournals(data);
        setTotalRecords(data.length);
      }
    } catch (e) {
      const message = e?.response?.data?.message || t('failed_to_load', 'Failed to load journal report.');
      setError(message);
      setJournals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const q = getQueryFilters();
    setFilters((prev) => ({
      ...prev,
      search: q.search,
      dateFrom: q.dateFrom,
      dateTo: q.dateTo,
      status: q.status,
    }));
    setCurrentPage(q.page);
    loadJournals(q, q.page);
  }, []);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    loadJournals(filters, newPage);
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    loadJournals(filters, 1);
  };

  // Real Chart-of-Accounts code (accounts.AccCode) resolved through the
  // eager-loaded line.account relation. Never derived from indexes/ids/names.
  const lineAccountCode = (line) => {
    const code = line?.account?.AccCode ?? line?.account_code;
    return code === null || code === undefined || code === '' ? null : String(code);
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

  const handleExportExcel = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await apiService.get('/journals', {
        search: filters.search || undefined,
        date_from: filters.dateFrom || undefined,
        date_to: filters.dateTo || undefined,
        status: filters.status === 'all' ? undefined : filters.status,
        all: true,
        with_lines: true,
      });

      const allData = response.data || [];
      const rows = [];

      allData.forEach((entry) => {
        const isBalanced = Math.abs((Number(entry.total_debit) || 0) - (Number(entry.total_credit) || 0)) < 0.001;
        const balanceStatusText = isBalanced ? t('balanced', 'Balanced') : t('unbalanced', 'Unbalanced');
        const statusText = entry.status === 'Post' ? t('posted', 'Posted') : entry.status === 'UnPost' ? t('unposted', 'Unposted') : entry.status;

        const lines = entry.lines || [];
        if (lines.length === 0) {
          rows.push({
            [t('date', 'Date')]: entry.date,
            [t('entry_code', 'Entry Code')]: entry.entry_code,
            [t('description', 'Description')]: entry.description,
            [t('reference', 'Reference')]: entry.reference || '',
            [t('type', 'Type')]: entry.entry_type,
            [t('balance', 'Balance')]: balanceStatusText,
            [t('status', 'Status')]: statusText,
            [t('account_code', 'Account Code')]: '',
            [t('account_name', 'Account Name')]: '',
            [t('line_description', 'Line Description')]: '',
            [t('debit', 'Debit')]: 0,
            [t('credit', 'Credit')]: 0,
          });
        } else {
          lines.forEach((line, index) => {
            rows.push({
              [t('date', 'Date')]: index === 0 ? entry.date : '',
              [t('entry_code', 'Entry Code')]: index === 0 ? entry.entry_code : '',
              [t('description', 'Description')]: index === 0 ? entry.description : '',
              [t('reference', 'Reference')]: index === 0 ? (entry.reference || '') : '',
              [t('type', 'Type')]: index === 0 ? entry.entry_type : '',
              [t('balance', 'Balance')]: index === 0 ? balanceStatusText : '',
              [t('status', 'Status')]: index === 0 ? statusText : '',
              [t('account_code', 'Account Code')]: lineAccountCode(line) ?? '',
              [t('account_name', 'Account Name')]: line.account?.AccName || line.account_name || line.account_id,
              [t('line_description', 'Line Description')]: line.description || '',
              [t('debit', 'Debit')]: line.debit || 0,
              [t('credit', 'Credit')]: line.credit || 0,
            });
          });

          // Journal Total: SUM of THIS entry's lines only (from the same
          // withSum aggregates the report displays), labeled in the Date and
          // Entry Code columns so the total stays grouped with its journal.
          rows.push({
            [t('date', 'Date')]: '',
            [t('entry_code', 'Entry Code')]: entry.entry_code,
            [t('description', 'Description')]: '',
            [t('reference', 'Reference')]: '',
            [t('type', 'Type')]: '',
            [t('balance', 'Balance')]: '',
            [t('status', 'Status')]: '',
            [t('account_code', 'Account Code')]: '',
            [t('account_name', 'Account Name')]: '',
            [t('line_description', 'Line Description')]: t('journal_total', 'Journal Total'),
            [t('debit', 'Debit')]: Number(entry.total_debit) || 0,
            [t('credit', 'Credit')]: Number(entry.total_credit) || 0,
          });
        }
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, t('title', 'Journal Report'));

      worksheet['!cols'] = [
        { wch: 14 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 10 },
        { wch: 10 }, { wch: 25 }, { wch: 14 }, { wch: 30 }, { wch: 30 },
        { wch: 12 }, { wch: 12 }
      ];

      const fileName = `Journal_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error('Export failed:', err);
      setError(t('failed_to_export', 'Failed to export Excel.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout activeMenu="Financial Reports">
      <Head title={`${t('title', 'Journal Report')} - ZodicERP`} />
      <div className="fr-page">
        <div className="fr-breadcrumb">
          <a href="#">{t('dashboard', 'Dashboard')}</a>
          <span className="fr-sep">/</span>
          <a href="#">{t('accounting', 'Accounting')}</a>
          <span className="fr-sep">/</span>
          <a href={financialReportsRoute()}>{t('financial_reports', 'Financial Reports')}</a>
          <span className="fr-sep">/</span>
          <span className="fr-current">{t('journal', 'Journal')}</span>
        </div>

        <div className="fr-header-card">
          <div>
            <h1 className="fr-title">{t('title', 'Journal Report')}</h1>
            <p className="fr-subtitle">{t('subtitle', 'List of all journal entries and their corresponding transaction lines.')}</p>
          </div>
        </div>

        <div className="fr-filters-card">
          <div className="fr-filters-grid">
            <div className="fr-form-group">
              <label htmlFor="fr-search">{t('search', 'Search')}</label>
              <input
                id="fr-search"
                type="text"
                className="fr-input"
                placeholder={t('entry_code_ref', 'Entry code, reference...')}
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
            <div className="fr-form-group">
              <label htmlFor="fr-date-from">{t('date_from', 'Date from')}</label>
              <input
                id="fr-date-from"
                type="date"
                className="fr-input"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>
            <div className="fr-form-group">
              <label htmlFor="fr-date-to">{t('date_to', 'Date to')}</label>
              <input
                id="fr-date-to"
                type="date"
                className="fr-input"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>
            <div className="fr-form-group">
              <label htmlFor="fr-status">{t('status', 'Status')}</label>
              <select
                id="fr-status"
                className="fr-input"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="fr-form-group">
              <label htmlFor="fr-balance-status">{t('balance_status', 'Balance Status')}</label>
              <select
                id="fr-balance-status"
                className="fr-input"
                value={filters.balanceStatus}
                onChange={(e) => handleFilterChange('balanceStatus', e.target.value)}
              >
                {BALANCE_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="fr-form-actions">
            <button
              type="button"
              className="btn btn-primary fr-btn"
              onClick={handleApplyFilters}
            >
              <span className="material-icons-outlined">filter_alt</span>
              <span>{t('apply', 'Apply filters')}</span>
            </button>
            <button
              type="button"
              className="btn btn-excel fr-btn"
              onClick={handleExportExcel}
            >
              <span className="material-icons-outlined">description</span>
              <span>{t('export', 'Export Excel')}</span>
            </button>
          </div>
        </div>

        {error && <div className="fr-error-banner">{error}</div>}

        {loading ? (
          <div className="fr-loading-banner">
            <span className="material-icons-outlined">sync</span>
            <span>{t('loading', 'Loading...')}</span>
          </div>
        ) : journals.length > 0 ? (
          <div className="fr-table-card">
            <div className="fr-table-wrapper">
              <table className="fr-table">
                <thead>
                  <tr>
                    <th className="fr-th">{t('account_code', 'Account Code')}</th>
                    <th className="fr-th">{t('account_name', 'Account Name')}</th>
                    <th className="fr-th">{t('description', 'Description')}</th>
                    <th className="fr-th fr-amount-header">{t('debit', 'Debit')}</th>
                    <th className="fr-th fr-amount-header">{t('credit', 'Credit')}</th>
                  </tr>
                </thead>
                <tbody>
                  {journals.map((entry) => {
                    const isBalanced = Math.abs((Number(entry.total_debit) || 0) - (Number(entry.total_credit) || 0)) < 0.001;
                    return (
                      <React.Fragment key={entry.entry_code}>
                        <tr className="entry-header-row">
                          <td colSpan="5">
                            <div className="entry-header-inner">
                              <div className="entry-header-main">
                                <span className="entry-date">{entry.date}</span>
                                <button
                                  type="button"
                                  className="entry-code-link"
                                  onClick={() => handleJournalClick(entry.entry_code)}
                                >
                                  {entry.entry_code}
                                </button>
                                <span className="main-desc">{entry.description}</span>
                              </div>
                              <div className="entry-header-meta">
                                <span>{t('ref', 'Ref')}: {entry.reference || '-'}</span>
                                <span>{t('type', 'Type')}: {entry.entry_type}</span>
                                <span className={`fr-badge ${isBalanced ? 'fr-badge-success' : 'fr-badge-danger'}`}>
                                  {isBalanced ? t('balanced', 'Balanced') : t('unbalanced', 'Unbalanced')}
                                </span>
                                <span className={`fr-badge ${entry.status === 'Post' ? 'fr-badge-success' : 'fr-badge-warning'}`}>
                                  {entry.status === 'Post' ? t('posted', 'Posted') : entry.status === 'UnPost' ? t('unposted', 'Unposted') : entry.status}
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                        {entry.lines && entry.lines.map((line, idx) => (
                          <tr key={`${entry.entry_code}-line-${idx}`} className="line-row">
                            <td className="line-acc-code" dir="ltr">
                              {lineAccountCode(line) ?? '—'}
                            </td>
                            <td className="line-acc">
                              {line.account?.AccName || line.account_name || t('account_id', `Account ID: ${line.account_id}`, { id: line.account_id })}
                            </td>
                            <td className="line-desc">{line.description}</td>
                            <td className="fr-amount fr-amount-debit">
                              {line.debit > 0 ? Number(line.debit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                            </td>
                            <td className="fr-amount fr-amount-credit">
                              {line.credit > 0 ? Number(line.credit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                            </td>
                          </tr>
                        ))}
                        <tr className="entry-total-row">
                          <td colSpan="3" className="entry-total-label">
                            {t('journal_total', 'Journal Total')}
                          </td>
                          <td className="fr-amount fr-amount-debit">
                            {(Number(entry.total_debit) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="fr-amount fr-amount-credit">
                            {(Number(entry.total_credit) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr className="entry-spacer"></tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
                {totalRecords > perPage && (
                  <tbody className="no-print mt-8 flex justify-center">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={Math.ceil(totalRecords / perPage)}
                      onPageChange={handlePageChange}
                    />
                  </tbody>
                )}
              </table>
            </div>
          </div>
        ) : (
          <div className="fr-empty-state">
            <span className="material-icons-outlined">description</span>
            <p className="mt-4">{t('no_journal_entries', 'No journal entries found.')}</p>
          </div>
        )}

        <div className="fr-footer-row">
          <p>{new Date().toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', { dateStyle: 'full', timeStyle: 'short' })}</p>
          <p>{t('accrual_basis', 'Accrual Basis')}</p>
        </div>
      </div>

      <style jsx global>{`{
        /* Financial Reports design tokens */
        --fr-surface: #ffffff;
        --fr-surface-alt: #f8fafc;
        --fr-border: #e2e8f0;
        --fr-border-strong: #cbd5e1;
        --fr-text: #1e293b;
        --fr-text-light: #64748b;
        --fr-text-lighter: #94a3b8;
        --fr-accent: #1e88e5;
        --fr-success: #2e7d32;
        --fr-shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1);
        --fr-radius: 10px;
        --fr-input-height: 36px;
        --fr-btn-height: 36px;
      }
      .fr-page {
        padding: 24px;
        background-color: #f8fafc;
        min-height: 100vh;
      }
      .fr-breadcrumb {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.85rem;
        color: var(--fr-text-light);
        margin-bottom: 16px;
      }
      .fr-breadcrumb a {
        color: var(--primary-color);
        font-weight: 500;
        text-decoration: none;
      }
      .fr-breadcrumb a:hover {
        text-decoration: underline;
      }
      .fr-breadcrumb .fr-sep {
        color: var(--fr-text-lighter);
      }
      .fr-breadcrumb .fr-current {
        font-weight: 600;
        color: var(--fr-text);
      }
      .fr-header-card {
        background-color: var(--fr-surface);
        border-radius: var(--fr-radius);
        box-shadow: var(--fr-shadow-md);
        border: 1px solid var(--fr-border);
        padding: 16px 18px;
        margin-bottom: 18px;
      }
      .fr-header-card .fr-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--fr-text);
        margin: 0 0 4px;
      }
      .fr-header-card .fr-subtitle {
        font-size: 0.9rem;
        color: var(--fr-text-light);
        margin: 0;
      }
      .fr-filters-card {
        background-color: var(--fr-surface);
        border-radius: var(--fr-radius);
        box-shadow: var(--fr-shadow-md);
        border: 1px solid var(--fr-border);
        padding: 16px 18px;
        margin-bottom: 18px;
      }
      .fr-filters-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 16px;
        align-items: flex-end;
      }
      .fr-form-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .fr-form-group label {
        font-size: 0.8rem;
        font-weight: 500;
        color: var(--fr-text);
      }
      .fr-input {
        width: 100%;
        padding: 8px 10px;
        border-radius: 6px;
        border: 1px solid var(--fr-border-strong);
        font-size: 0.85rem;
      }
      .fr-form-actions {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        gap: 8px;
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px solid var(--fr-border);
      }
      .fr-table-card {
        background-color: var(--fr-surface);
        border-radius: var(--fr-radius);
        box-shadow: var(--fr-shadow-md);
        border: 1px solid var(--fr-border);
        padding: 16px;
        margin-bottom: 18px;
      }
      .fr-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85rem;
      }
      .fr-table th,
      .fr-table td {
        padding: 8px 10px;
        border-bottom: 1px solid var(--fr-border);
      }
      .fr-table th {
        text-align: left;
        background-color: var(--fr-surface-alt);
        font-weight: 600;
        color: #0f172a;
      }
      .fr-table .fr-amount-header {
        text-align: right;
      }
      .fr-table .fr-amount {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
      .fr-table .fr-amount-debit {
        color: #1e88e5;
        font-weight: 600;
      }
      .fr-table .fr-amount-credit {
        color: #2e7d32;
        font-weight: 600;
      }
      .fr-table tfoot tr {
        background-color: #f9fafb;
      }
      .entry-header-row { background-color: #f9f9f9; }
      .entry-header-row td { padding: 12px 8px; border-bottom: 1px solid var(--fr-border); }
      .entry-header-inner { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
      .entry-header-main { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
      .entry-header-meta { display: flex; align-items: center; gap: 12px; font-size: 11px; color: var(--fr-text-light); flex-wrap: wrap; }
      .entry-date { font-size: 12px; color: var(--fr-text-light); }
      .entry-code-link { background: none; border: none; color: var(--primary-color); font-weight: 700; padding: 0; cursor: pointer; }
      .main-desc { font-weight: 700; font-size: 14px; }
      .entry-total-row td { padding: 10px 8px; font-size: 13px; border-top: 2px solid #0f172a; border-bottom: 1px solid var(--fr-border); background: #f9f9f9; }
      .entry-total-label { font-weight: 800; text-transform: uppercase; font-size: 11px; color: var(--fr-text); text-align: right; }
      .entry-total-debit, .entry-total-credit { font-weight: 800; }
      .line-row td { padding: 10px 8px; font-size: 13px; border-bottom: 1px solid var(--fr-border); }
      .line-acc-code {
        white-space: nowrap;
        font-family: 'Inter', monospace;
        direction: ltr;
        unicode-bidi: isolate;
        color: var(--fr-text-light);
      }
      .fr-badge {
        padding: 2px 10px;
        border-radius: 12px;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
      }
      .fr-badge-success { background: #d4edda; color: #155724; }
      .fr-badge-danger { background: #f8d7da; color: #721c24; }
      .fr-badge-warning { background: #fff3cd; color: #856404; }
      .entry-spacer { height: 24px; }
      .fr-footer-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 24px 0 0;
        border-top: 1px solid var(--fr-border);
        font-size: 13px;
        color: var(--fr-text-light);
        margin-top: 80px;
      }
      .rtl { direction: rtl; }
      .rtl .fr-table th, .rtl .fr-table td { text-align: right; }
      .rtl .fr-table .fr-amount { text-align: left; }
      .rtl .fr-table th.fr-amount-header { text-align: left; }
      .rtl .fr-table td.entry-total-label { text-align: left; }
      @media print {
        .fr-breadcrumb, .fr-header-card, .fr-filters-card, .fr-form-actions, .fr-footer-row { display: none !important; }
        .fr-page { background: #fff; padding: 0; }
        .fr-table-card { box-shadow: none; padding: 20px; }
      }
      .fr-loading-banner {
        padding: 16px;
        text-align: center;
        color: var(--fr-text-light);
        background: var(--fr-surface);
        border: 1px solid var(--fr-border);
        border-radius: var(--fr-radius);
        margin-bottom: 18px;
        font-size: 0.85rem;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .fr-empty-state {
        padding: 40px 16px;
        text-align: center;
        color: var(--fr-text-light);
        background: var(--fr-surface);
        border: 1px solid var(--fr-border);
        border-radius: var(--fr-radius);
        margin-bottom: 18px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }
      .fr-empty-state .material-icons-outlined {
        font-size: 48px;
        color: var(--fr-text-lighter);
      }
      .fr-error-banner {
        padding: 12px 16px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: var(--fr-radius);
        margin-bottom: 18px;
        font-size: 0.85rem;
        color: #991b1b;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .fr-table-wrapper .report-row .name-cell,
      .fr-table-wrapper .report-row .balance-cell {
        padding: 8px 8px;
      }
      .fr-table-wrapper .report-row .acc-name {
        font-size: 0.85rem;
      }
      .fr-table-wrapper .report-row .toggle-btn {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        color: var(--fr-text-lighter);
        display: flex;
        align-items: center;
        transition: color 0.2s;
      }
      .fr-table-wrapper .report-row .toggle-btn:hover {
        color: var(--primary-color);
      }
      @media (max-width: 768px) {
        .fr-filters-card {
          padding: 12px 14px;
        }
        .fr-filters-grid {
          gap: 12px;
        }
        .fr-table-card {
          padding: 12px;
        }
        .fr-header-card {
          padding: 14px 16px;
        }
        .fr-form-actions {
          flex-direction: column;
        }
      }
      `}</style>
    </AdminLayout>
  );
}
