import React, { useEffect, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import * as XLSX from 'xlsx';
import AdminLayout from '../../components/AdminLayout';
import Pagination from '../../components/Pagination';
import { apiService } from '../../../../services/api';
import ReportHeader, { ReportFormGroup, ReportFormActions } from '../../components/ReportHeader';

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

  const formatJournalDate = (value) => {
    if (value === null || value === undefined || value === '') return '';

    const pad2 = (n) => String(n).padStart(2, '0');

    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return '';
      return `${pad2(value.getDate())}-${pad2(value.getMonth() + 1)}-${value.getFullYear()}`;
    }

    const raw = String(value);
    const cleaned = raw
      .replace(/\*\*/g, '')
      .replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, '')
      .trim();

    const ymd = cleaned.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (ymd) return `${pad2(ymd[3])}-${pad2(ymd[2])}-${ymd[1]}`;

    const dmy = cleaned.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
    if (dmy) return `${pad2(dmy[1])}-${pad2(dmy[2])}-${dmy[3]}`;

    const parsed = new Date(cleaned);
    if (Number.isNaN(parsed.getTime())) return '';
    return `${pad2(parsed.getDate())}-${pad2(parsed.getMonth() + 1)}-${parsed.getFullYear()}`;
  };

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
  const [appliedFilters, setAppliedFilters] = useState(null);

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
      balanceStatus: q.balanceStatus,
    }));
    setCurrentPage(q.page);
  }, []);

  const handlePageChange = (newPage) => {
    if (!appliedFilters) return;

    setCurrentPage(newPage);
    loadJournals(appliedFilters, newPage);
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleApplyFilters = () => {
    const selectedFilters = { ...filters };
    setAppliedFilters(selectedFilters);
    setCurrentPage(1);
    loadJournals(selectedFilters, 1);
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
            [t('date', 'Date')]: formatJournalDate(entry.date),
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
              [t('date', 'Date')]: index === 0 ? formatJournalDate(entry.date) : '',
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

        <ReportHeader
          title={t('title', 'Journal Report')}
          subtitle={t('subtitle', 'List of all journal entries and their corresponding transaction lines.')}
          onExportExcel={handleExportExcel}
          exportExcelDisabled={loading || journals.length === 0}
          exportDropdownDisabled={loading}
          showPrint={true}
          printDisabled={true}
        >
          <ReportFormGroup
            label={t('date_from', 'Date from')}
            htmlFor="jr-date-from"
          >
            <input
              id="jr-date-from"
              type="date"
              className="report-header__form-control"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />
          </ReportFormGroup>

          <ReportFormGroup
            label={t('date_to', 'Date to')}
            htmlFor="jr-date-to"
          >
            <input
              id="jr-date-to"
              type="date"
              className="report-header__form-control"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
          </ReportFormGroup>

          <ReportFormActions>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleApplyFilters}
            >
              <span className="material-icons-outlined">filter_alt</span>
              <span>{t('apply', 'Apply filters')}</span>
            </button>
          </ReportFormActions>
        </ReportHeader>

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
                                <span className="entry-date">{formatJournalDate(entry.date)}</span>
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
          <p>{formatJournalDate(new Date())}</p>
          <p>{t('accrual_basis', 'Accrual Basis')}</p>
        </div>
      </div>
    </AdminLayout>
  );
}
