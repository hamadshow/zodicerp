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
  const isAr = locale === 'ar';
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
            [t('account', 'Account')]: '',
            [t('debit', 'Debit')]: 0,
            [t('credit', 'Credit')]: 0,
          });
        } else {
          lines.forEach((line, index) => {
            rows.push({
              [t('date', 'Date')]: index === 0 ? entry.date : '',
              [t('entry_code', 'Entry Code')]: index === 0 ? entry.entry_code : '',
              [t('description', 'Description')]: index === 0 ? entry.description : line.description || '',
              [t('reference', 'Reference')]: index === 0 ? (entry.reference || '') : '',
              [t('type', 'Type')]: index === 0 ? entry.entry_type : '',
              [t('balance', 'Balance')]: index === 0 ? balanceStatusText : '',
              [t('status', 'Status')]: index === 0 ? statusText : '',
              [t('account', 'Account')]: line.account_name || line.account_id,
              [t('debit', 'Debit')]: line.debit || 0,
              [t('credit', 'Credit')]: line.credit || 0,
            });
          });
        }
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, t('title', 'Journal Report'));
      
      worksheet['!cols'] = [
        { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 30 },
        { wch: 10 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 30 }
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
      <div className={`qbo-report-page ${isAr ? 'rtl' : 'ltr'}`}>
        <Head title={`${t('title', 'Journal Report')} - ZodicERP`} />

        {/* 1. Breadcrumbs & Top Actions */}
        <div className="report-top-nav no-print">
          <div className="breadcrumb">
            <span className="item">{t('reports', 'Reports')}</span>
            <span className="sep material-icons-outlined">chevron_right</span>
            <span className="item active">{t('journal', 'Journal')}</span>
          </div>
          <div className="top-actions">
            <button className="action-link" onClick={() => router.get(financialReportsRoute())}>
              {t('back_to_report_list', 'Back to report list')}
            </button>
          </div>
        </div>

        {/* 2. Main Title Area */}
        <div className="report-header-area no-print">
          <h1 className="report-title">{t('title', 'Journal Report')}</h1>
          <div className="header-buttons">
            <button className="btn-outline">{t('customize', 'Customize')}</button>
            <button className="btn-primary">{t('save_customization', 'Save customization')}</button>
          </div>
        </div>

        {/* 3. Filter/Action Bar */}
        <div className="report-filter-bar no-print">
          <div className="filter-group">
            <div className="field">
              <label>{t('search', 'Search')}</label>
              <input
                type="text"
                className="qbo-input"
                placeholder={t('entry_code_ref', 'Entry code, reference...')}
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
            <div className="field">
              <label>{t('date_from', 'Date from')}</label>
              <input
                type="date"
                className="qbo-date-input"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>
            <div className="field">
              <label>{t('date_to', 'Date to')}</label>
              <input
                type="date"
                className="qbo-date-input"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>
            <div className="field">
              <label>{t('status', 'Status')}</label>
              <select
                className="qbo-select"
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
          </div>
          <div className="bar-actions">
            <button className="btn-run" onClick={handleApplyFilters}>{t('run_report', 'Run report')}</button>
          </div>
        </div>

        {/* 4. The "Paper" Report Container */}
        <div className="report-paper-container">
          <div className="report-paper-actions no-print">
            <div className="left-tools">
              {/* Journal specific tools can go here */}
            </div>
            <div className="right-tools">
              <button title={t('print', 'Print')} onClick={() => window.print()}>
                <span className="material-icons-outlined">print</span>
              </button>
              <button title={t('export', 'Export')} onClick={handleExportExcel}>
                <span className="material-icons-outlined">ios_share</span>
              </button>
              <button title={t('settings', 'Settings')}>
                <span className="material-icons-outlined">settings</span>
              </button>
            </div>
          </div>

          <div className="report-content-paper shadow-xl">
            {/* Report Header (Inside Paper) */}
            <div className="inner-header">
              <h2 className="company-name">{t('company_name', 'ZodicERP Company')}</h2>
              <h3 className="report-type">{t('title', 'Journal Report')}</h3>
              <p className="report-date">
                {filters.dateFrom && filters.dateTo 
                  ? `${t('from', 'From')} ${filters.dateFrom} ${t('to', 'To')} ${filters.dateTo}`
                  : t('all_dates', 'All Dates')}
              </p>
            </div>

            {error && <div className="unbalanced-warning no-print">{error}</div>}

            {loading ? (
              <div className="report-loading">
                <div className="spinner"></div>
                <p>{t('loading_data', 'Loading your financial data...')}</p>
              </div>
            ) : journals.length > 0 ? (
              <div className="report-table-wrapper">
                <table className="qbo-table journal-table">
                  <thead>
                    <tr>
                      <th className="name-col">{t('date_code', 'Date / Code')}</th>
                      <th>{t('description', 'Description')}</th>
                      <th>{t('account', 'Account')}</th>
                      <th className="total-col">{t('debit', 'Debit')}</th>
                      <th className="total-col">{t('credit', 'Credit')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {journals.map((entry) => {
                      const isBalanced = Math.abs((Number(entry.total_debit) || 0) - (Number(entry.total_credit) || 0)) < 0.001;
                      return (
                        <React.Fragment key={entry.entry_code}>
                          <tr className="entry-header-row">
                            <td className="date-code-cell">
                              <div className="entry-date">{entry.date}</div>
                              <button
                                type="button"
                                className="entry-code-link"
                                onClick={() => handleJournalClick(entry.entry_code)}
                              >
                                {entry.entry_code}
                              </button>
                            </td>
                            <td className="entry-desc-cell">
                              <div className="main-desc">{entry.description}</div>
                              <div className="meta-desc">
                                {t('ref', 'Ref')}: {entry.reference || '-'} | {t('type', 'Type')}: {entry.entry_type}
                              </div>
                            </td>
                            <td colSpan="1"></td>
                            <td className="status-cell" colSpan="2">
                              <div className="flex justify-end gap-2">
                                <span className={`badge ${isBalanced ? 'badge-success' : 'badge-danger'}`}>
                                  {isBalanced ? t('balanced', 'Balanced') : t('unbalanced', 'Unbalanced')}
                                </span>
                                <span className={`badge ${entry.status === 'Post' ? 'badge-success' : 'badge-warning'}`}>
                                  {entry.status === 'Post' ? t('posted', 'Posted') : entry.status === 'UnPost' ? t('unposted', 'Unposted') : entry.status}
                                </span>
                              </div>
                            </td>
                          </tr>
                          {entry.lines && entry.lines.map((line, idx) => (
                            <tr key={`${entry.entry_code}-line-${idx}`} className="line-row">
                              <td></td>
                              <td className="line-desc">{line.description}</td>
                              <td className="line-acc">
                                {line.account?.AccName || line.account_name || t('account_id', `Account ID: ${line.account_id}`, { id: line.account_id })}
                              </td>
                              <td className="balance-cell">
                                {line.debit > 0 ? Number(line.debit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                              </td>
                              <td className="balance-cell">
                                {line.credit > 0 ? Number(line.credit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                              </td>
                            </tr>
                          ))}
                          <tr className="entry-spacer"></tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>

                {totalRecords > perPage && (
                  <div className="no-print mt-8 flex justify-center">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={Math.ceil(totalRecords / perPage)}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="no-data-msg">
                {t('no_journal_entries', 'No journal entries found.')}
              </div>
            )}

            <div className="inner-footer">
              <p>{new Date().toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', { dateStyle: 'full', timeStyle: 'short' })}</p>
              <p>{t('accrual_basis', 'Accrual Basis')}</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        /* QuickBooks Online 2026 - Journal Redesign */
        :root {
          --qbo-green: #2ca01c;
          --qbo-blue: #0077c5;
          --qbo-gray-bg: #f4f5f8;
          --qbo-border: #d4d7dc;
          --qbo-text: #393a3d;
          --qbo-text-light: #6b6c72;
          --qbo-negative: #d52b1e;
          --paper-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
        }

        .qbo-report-page {
          background-color: var(--qbo-gray-bg);
          min-height: 100vh;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: var(--qbo-text);
          padding-bottom: 80px;
        }

        .report-top-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 32px;
          background: #fff;
          border-bottom: 1px solid var(--qbo-border);
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .report-top-nav .breadcrumb { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--qbo-text-light); }
        .report-top-nav .breadcrumb .active { font-weight: 600; color: var(--qbo-text); }
        .report-top-nav .action-link { color: var(--qbo-blue); font-weight: 600; font-size: 13px; background: none; border: none; cursor: pointer; }

        .report-header-area {
          padding: 32px 32px 24px 32px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          max-width: 1200px;
          margin: 0 auto;
        }
        .report-title { font-size: 28px; font-weight: 300; margin: 0; }
        .header-buttons { display: flex; gap: 12px; }
        
        .btn-outline { padding: 8px 20px; border: 1px solid var(--qbo-border); border-radius: 20px; font-weight: 600; background: #fff; cursor: pointer; font-size: 14px; }
        .btn-primary { padding: 8px 24px; background: var(--qbo-green); color: #fff; border: none; border-radius: 20px; font-weight: 600; cursor: pointer; font-size: 14px; }

        .report-filter-bar {
          margin: 0 32px 32px 32px;
          background: #fff;
          padding: 24px;
          border-radius: 8px;
          border: 1px solid var(--qbo-border);
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          max-width: 1200px;
          margin-left: auto;
          margin-right: auto;
        }
        .filter-group { display: flex; gap: 24px; flex-wrap: wrap; }
        .filter-group .field { display: flex; flex-direction: column; gap: 6px; }
        .filter-group label { font-size: 11px; font-weight: 700; color: var(--qbo-text-light); text-transform: uppercase; }
        
        .qbo-input, .qbo-select, .qbo-date-input { 
          padding: 8px 12px; border: 1px solid #babec5; border-radius: 4px; min-width: 160px; font-size: 14px; 
        }

        .btn-run { padding: 10px 32px; border: 1px solid #babec5; border-radius: 20px; font-weight: 700; background: #fff; cursor: pointer; font-size: 14px; }

        .report-paper-container { margin: 0 32px; max-width: 1100px; margin-left: auto; margin-right: auto; }
        .report-paper-actions { display: flex; justify-content: space-between; margin-bottom: 12px; }
        .right-tools { display: flex; gap: 16px; }
        .right-tools button { background: none; border: none; color: var(--qbo-text-light); cursor: pointer; padding: 4px; }

        .report-content-paper {
          background: #fff;
          padding: 60px 80px;
          min-height: 1000px;
          box-shadow: var(--paper-shadow);
          border-radius: 2px;
        }

        .inner-header { text-align: center; margin-bottom: 48px; }
        .company-name { font-size: 20px; font-weight: 800; margin-bottom: 6px; }
        .report-type { font-size: 24px; font-weight: 400; margin-bottom: 6px; }
        .report-date { font-size: 15px; color: var(--qbo-text-light); }

        .qbo-table { width: 100%; border-collapse: collapse; }
        .qbo-table th { 
          border-bottom: 1px solid var(--qbo-text); 
          padding: 12px 8px; 
          font-size: 12px; 
          font-weight: 800; 
          text-align: right; 
          text-transform: uppercase;
        }
        .qbo-table .name-col { text-align: left; width: 15%; }
        
        .entry-header-row { background-color: #f9f9f9; }
        .entry-header-row td { padding: 16px 8px; border-bottom: 1px solid var(--qbo-border); }
        
        .date-code-cell .entry-date { font-size: 12px; color: var(--qbo-text-light); }
        .entry-code-link { background: none; border: none; color: var(--qbo-blue); font-weight: 700; padding: 0; cursor: pointer; }
        
        .main-desc { font-weight: 700; font-size: 14px; }
        .meta-desc { font-size: 11px; color: var(--qbo-text-light); margin-top: 4px; }
        
        .line-row td { padding: 10px 8px; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
        .balance-cell { text-align: right; white-space: nowrap; font-family: 'Inter', monospace; }
        
        .badge { padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
        .badge-success { background: #d4edda; color: #155724; }
        .badge-danger { background: #f8d7da; color: #721c24; }
        .badge-warning { background: #fff3cd; color: #856404; }

        .entry-spacer { height: 24px; }

        .inner-footer { margin-top: 80px; border-top: 1px solid var(--qbo-border); padding-top: 24px; font-size: 13px; color: var(--qbo-text-light); display: flex; justify-content: space-between; }

        .rtl { direction: rtl; }
        .rtl .qbo-table th, .rtl .qbo-table td { text-align: right; }
        .rtl .qbo-table .name-col { text-align: right; }
        .rtl .balance-cell { text-align: left; }
        .rtl .qbo-table th.total-col { text-align: left; }

        @media print {
          .no-print { display: none !important; }
          .qbo-report-page { background: #fff; padding: 0; }
          .report-content-paper { box-shadow: none; padding: 20px; }
        }

        .report-loading { text-align: center; padding: 150px 0; }
        .spinner { width: 50px; height: 50px; border: 3px solid rgba(44, 160, 28, 0.1); border-top: 3px solid var(--qbo-green); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 20px auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </AdminLayout>
  );
}
