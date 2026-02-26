import React, { useEffect, useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '../../components/AdminLayout';
import SearchableComboBox from '../../components/SearchableComboBox';
import { apiService } from '../../../../services/api';

const STATUS_OPTIONS = [
  { value: 'posted', label: 'Posted only' },
  { value: 'unposted', label: 'Unposted only' },
  { value: 'all', label: 'All' },
];

export default function GeneralLedger() {
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
    return { accountId, dateFrom, dateTo, status };
  };

  const loadLedger = async (overrideFilters) => {
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
      });
      setLedger(response.data);
    } catch (e) {
      const message =
        e?.response?.data?.message || 'Failed to load general ledger.';
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
      ...q,
    }));
    loadAccounts();
    if (q.accountId) {
      loadLedger(q);
    }
  }, []);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleJournalClick = (code) => {
    if (!code) return;
    router.get(`/admin/journals/${encodeURIComponent(code)}`);
  };

  const rowsWithOpening = useMemo(() => {
    if (!ledger) return [];
    const result = [...ledger.entries];
    if (ledger.opening_balance !== 0) {
      result.unshift({
        isOpening: true,
        date: '',
        journal_code: '',
        reference: '',
        description: 'Opening balance',
        debit: 0,
        credit: 0,
        running_balance: ledger.opening_balance,
        status: '',
      });
    }
    return result;
  }, [ledger]);

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
      <Head title="General Ledger - ZodicERP" />
      <div className="GeneralLedger-page">
        <div className="breadcrumb">
          <a href="#">Dashboard</a>
          <span>/</span>
          <a href="#">Accounting</a>
          <span>/</span>
          <a href="/reports">Financial Reports</a>
          <span>/</span>
          <span>General Ledger</span>
        </div>

        <div className="gl-header">
          <div>
            <h1 className="gl-title">General Ledger</h1>
            <p className="gl-subtitle">
              Detailed posting history with running balance by account.
            </p>
          </div>
        </div>

        <div className="gl-filters-card">
          <div className="gl-filters-grid">
            <div className="gl-form-group">
              <label htmlFor="gl-account">Account</label>
              <SearchableComboBox
                options={accountOptions}
                value={filters.accountId}
                onChange={(val) => handleFilterChange('accountId', val)}
                placeholder="Select account"
              />
            </div>
            <div className="gl-form-group">
              <label htmlFor="gl-date-from">Date from</label>
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
              <label htmlFor="gl-date-to">Date to</label>
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
              <label htmlFor="gl-status">Journal status</label>
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
                onClick={() => loadLedger()}
                disabled={!filters.accountId || loading}
              >
                <span className="material-icons-outlined">filter_alt</span>
                <span>Apply filters</span>
              </button>
            </div>
          </div>
        </div>

        {ledger && (
          <div className="gl-summary">
            <div className="gl-summary-item">
              <span className="gl-summary-label">Account</span>
              <span className="gl-summary-value">{accountLabel}</span>
            </div>
            <div className="gl-summary-item">
              <span className="gl-summary-label">Nature</span>
              <span className="gl-summary-value">{natureLabel}</span>
            </div>
            <div className="gl-summary-item">
              <span className="gl-summary-label">Opening balance</span>
              <span className="gl-summary-value">
                {Math.abs(ledger.opening_balance).toFixed(2)}
              </span>
            </div>
            <div className="gl-summary-item">
              <span className="gl-summary-label">Closing balance</span>
              <span className="gl-summary-value">
                {Math.abs(ledger.closing_balance).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}

        <div className="gl-table-card">
          <table className="gl-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Journal code</th>
                <th>Reference</th>
                <th>Description</th>
                <th className="gl-amount-header">Debit</th>
                <th className="gl-amount-header">Credit</th>
                <th className="gl-amount-header">Running balance</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="text-center">
                    Loading...
                  </td>
                </tr>
              )}
              {!loading && (!ledger || rowsWithOpening.length === 0) && (
                <tr>
                  <td colSpan={7} className="text-center">
                    No ledger entries found for current filters.
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
                    <td>
                      {row.journal_code ? (
                        <button
                          type="button"
                          className="gl-link-button"
                          onClick={() => handleJournalClick(row.journal_code)}
                        >
                          {row.journal_code}
                        </button>
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
                      {Math.abs(row.running_balance).toFixed(2)}
                    </td>
                  </tr>
                ))}
            </tbody>
            {ledger && (
              <tfoot>
                <tr>
                  <td colSpan={4} className="gl-total-label">
                    Totals
                  </td>
                  <td className="gl-amount gl-amount-debit">
                    {ledger.total_debit.toFixed(2)}
                  </td>
                  <td className="gl-amount gl-amount-credit">
                    {ledger.total_credit.toFixed(2)}
                  </td>
                  <td className="gl-amount">
                    {Math.abs(ledger.closing_balance).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
