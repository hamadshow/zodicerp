import React, { useEffect, useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/main.scss';
import SearchableComboBox from '../components/SearchableComboBox';
import { apiService } from '../../../services/api';

export default function JournalEntity() {
  const [mode, setMode] = useState('list');
  const [selectedCode, setSelectedCode] = useState(null);
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ column: '', direction: '' });
  const readOnly = mode === 'view';

  const emptyLine = () => ({
    account_id: '',
    debit: '',
    credit: '',
    description: '',
  });

  const normalizeDate = (val) => {
    if (!val) return '';
    if (val.includes('T')) return val.split('T')[0];
    if (val.includes('/')) {
      const [d, m, y] = val.split('/');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return val;
  };

  const formatDisplayDate = (val) => {
    if (!val) return '';
    const d = normalizeDate(val);
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  const todayIsoLocal = () => {
    return new Date().toISOString().slice(0, 10);
  };

  const [header, setHeader] = useState({
    entry_code: '',
    date: todayIsoLocal(),
    reference: '',
    description: '',
    status: 'UnPost',
  });
  const [lines, setLines] = useState([emptyLine()]);
  const [accounts, setAccounts] = useState([]);

  const parseDate = (val) => {
    if (!val) return null;
    // Handle YYYY-MM-DD manually to avoid timezone shifts
    if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [y, m, d] = val.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date(val);
  };

  const loadJournals = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.get('/journals', {
        search,
        sort_column: sort.column || undefined,
        sort_direction: sort.direction || undefined,
      });
      const data = Array.isArray(response.data) ? response.data : [];
      setJournals(data);
    } catch (e) {
      console.error('Failed to load journals', e);
      setError('Failed to load journal entries.');
      setJournals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    setSort((prev) => {
      if (prev.column === field) {
        if (prev.direction === 'asc') {
          return { column: field, direction: 'desc' };
        }
        if (prev.direction === 'desc') {
          return { column: '', direction: '' };
        }
      }
      return { column: field, direction: 'asc' };
    });
  };

  const sortedJournals = useMemo(() => {
    const data = [...journals];
    if (!sort.column || !sort.direction) {
      return data;
    }
    return data.sort((a, b) => {
      const direction = sort.direction === 'asc' ? 1 : -1;
      if (sort.column === 'total_amount') {
        const aNum = Number(a.total_amount || 0);
        const bNum = Number(b.total_amount || 0);
        if (aNum < bNum) return -1 * direction;
        if (aNum > bNum) return 1 * direction;
        return 0;
      }
      const aVal = a[sort.column] ?? '';
      const bVal = b[sort.column] ?? '';
      const aStr = aVal.toString().toLowerCase();
      const bStr = bVal.toString().toLowerCase();
      if (aStr < bStr) return -1 * direction;
      if (aStr > bStr) return 1 * direction;
      return 0;
    });
  }, [journals, sort]);

  useEffect(() => {
    loadJournals();
  }, []);

  const loadAccounts = async (extraIds = []) => {
    try {
      const ids = Array.isArray(extraIds) ? extraIds.filter(Boolean) : [];
      const typeRespPromise = apiService.get('/accounts');
      let extras = [];
      if (ids.length > 0) {
        const extrasResp = await apiService.get('/accounts', { ids: ids.join(',') });
        extras = Array.isArray(extrasResp.data) ? extrasResp.data : [];
      }
      const typeResp = await typeRespPromise;
      const typeData = Array.isArray(typeResp.data) ? typeResp.data : [];
      const byId = new Map();
      [...typeData, ...extras].forEach((acc) => {
        const key = acc.AccID ?? acc.AccCode ?? Math.random();
        if (!byId.has(key)) {
          byId.set(key, acc);
        }
      });
      setAccounts(Array.from(byId.values()));
    } catch {
      setAccounts([]);
    }
  };

  const loadNextCode = async () => {
    try {
      const response = await apiService.get('/journals/next-code');
      const nextCode = response?.data?.next_code;
      setHeader((prev) => ({
        ...prev,
        entry_code: nextCode ? String(nextCode) : 'QID-10001',
      }));
    } catch {
      setHeader((prev) => ({ ...prev }));
    }
  };

  const loadExisting = async (qaidCode, ensureAccounts = false) => {
    if (!qaidCode) return;
    setLoading(true);
    setError('');
    try {
      const response = await apiService.get(`/journals/${encodeURIComponent(qaidCode)}`);
      const data = response.data || {};
      const headerData = data.header || {};
      const lineData = Array.isArray(data.lines) ? data.lines : [];
      
      console.log('Incoming header date:', headerData.date);

      setHeader({
        entry_code: headerData.entry_code || '',
        date: normalizeDate(headerData.date),
        reference: headerData.reference || '',
        description: headerData.description || '',
        status: headerData.status || 'UnPost',
      });
      setLines(
        lineData.length > 0
          ? lineData.map((l) => ({
              account_id: (l.AccountAccID ?? l.account_id)?.toString() || '',
              debit: l.debit?.toString() || '',
              credit: l.credit?.toString() || '',
              description: l.description || '',
            }))
          : [emptyLine()],
      );
      if (ensureAccounts && lineData.length > 0) {
        const usedIds = lineData
          .map((l) => l.AccountAccID ?? l.account_id)
          .filter((id) => id != null && id !== '');
        await loadAccounts(usedIds);
      }
    } catch (e) {
      const message =
        e?.response?.data?.message || 'Failed to load journal entry.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode === 'create') {
      setHeader({
        entry_code: '',
        date: todayIsoLocal(),
        reference: '',
        description: '',
        status: 'UnPost',
      });
      setLines([emptyLine()]);
      loadAccounts();
      loadNextCode();
    }
    if ((mode === 'edit' || mode === 'view') && selectedCode) {
      loadExisting(selectedCode, true);
    }
  }, [mode, selectedCode]);

  const handleDelete = async (qaidCode) => {
    if (!qaidCode) return;
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this journal entry? This action cannot be undone.',
    );
    if (!confirmDelete) return;
    try {
      setLoading(true);
      setError('');
      await apiService.delete(`/journals/${encodeURIComponent(qaidCode)}`);
      await loadJournals();
    } catch (e) {
      console.error('Failed to delete journal entry', e);
      const message =
        e?.response?.data?.message || 'Failed to delete journal entry.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleHeaderChange = (field, value) => {
    if (readOnly && field !== 'status') return;
    setHeader((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLineChange = (index, field, value) => {
    if (readOnly) return;
    setLines((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value,
      };
      return next;
    });
  };

  const handleAddLine = () => {
    if (readOnly) return;
    setLines((prev) => [...prev, emptyLine()]);
  };

  const handleRemoveLine = (index) => {
    if (readOnly) return;
    setLines((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const totals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    lines.forEach((line) => {
      debit += Number(line.debit || 0);
      credit += Number(line.credit || 0);
    });
    return {
      debit,
      credit,
      balanced: Math.round(debit * 100) === Math.round(credit * 100),
    };
  }, [lines]);

  const accountOptions = useMemo(
    () =>
      accounts.map((acc) => ({
        value: String(acc.AccID),
        label: `${acc.AccCode} - ${acc.AccName}`,
      })),
    [accounts],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (readOnly) return;
    if (!totals.balanced) {
      setError('Journal entry is not balanced. Total Debit must equal Total Credit.');
      return;
    }
    const payload = {
      ...header,
      lines: lines
        .filter(
          (l) =>
            l.account_id &&
            (Number(l.debit || 0) > 0 || Number(l.credit || 0) > 0),
        )
        .map((l) => ({
          account_id: Number(l.account_id),
          debit: Number(l.debit || 0),
          credit: Number(l.credit || 0),
          description: l.description || null,
        })),
    };

    if (!payload.lines.length) {
      setError('At least one valid journal line is required.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      if (mode === 'edit' && selectedCode) {
        await apiService.put(`/journals/${encodeURIComponent(selectedCode)}`, payload);
      } else {
        await apiService.post('/journals', payload);
      }
      setMode('list');
      await loadJournals();
    } catch (e) {
      const message =
        e?.response?.data?.message || 'Failed to save journal entry.';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <AdminLayout activeMenu="Journal Entries">
      <Head title="Journal Entries - ZodicERP" />
      {mode === 'list' && (
        <div className="journal-page">
          <div className="breadcrumb">
            <a href="#">Dashboard</a>
            <span>/</span>
            <a href="#">Accounting</a>
            <span>/</span>
            <span>Journal Entries</span>
          </div>

          <div className="journal-header">
            <div className="journal-header-left">
              <h1 className="journal-title">Journal Entries</h1>
              <p className="journal-subtitle">
                Review, create, and manage general ledger journal entries.
              </p>
            </div>
            <div className="journal-header-right">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setSelectedCode(null);
                  setMode('create');
                }}
              >
                <span className="material-icons-outlined">add</span>
                <span>New Journal Entry</span>
              </button>
            </div>
          </div>

          <div className="journal-toolbar">
            <div className="search-bar light">
              <input
                type="text"
                placeholder="Search by code, type, reference..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="button" onClick={loadJournals}>
                <span className="material-icons-outlined">search</span>
              </button>
            </div>
            <button
              type="button"
              className="btn btn-outline"
              onClick={loadJournals}
            >
              <span className="material-icons-outlined">refresh</span>
              <span>Refresh</span>
            </button>
          </div>

          {error && <div className="error-banner">{error}</div>}

          <div className="journal-table-card fade-in">
            <table className="journal-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('entry_code')}>
                    <span className="sortable-header">
                      <span>Journal Code</span>
                      <span className="sort-icons">
                        <span
                          className={
                            'sort-icon' +
                            (sort.column === 'entry_code' &&
                            sort.direction === 'asc'
                              ? ' active'
                              : '')
                          }
                        >
                          ▲
                        </span>
                        <span
                          className={
                            'sort-icon' +
                            (sort.column === 'entry_code' &&
                            sort.direction === 'desc'
                              ? ' active'
                              : '')
                          }
                        >
                          ▼
                        </span>
                      </span>
                    </span>
                  </th>
                  <th onClick={() => handleSort('entry_type')}>
                    <span className="sortable-header">
                      <span>Type</span>
                      <span className="sort-icons">
                        <span
                          className={
                            'sort-icon' +
                            (sort.column === 'entry_type' &&
                            sort.direction === 'asc'
                              ? ' active'
                              : '')
                          }
                        >
                          ▲
                        </span>
                        <span
                          className={
                            'sort-icon' +
                            (sort.column === 'entry_type' &&
                            sort.direction === 'desc'
                              ? ' active'
                              : '')
                          }
                        >
                          ▼
                        </span>
                      </span>
                    </span>
                  </th>
                  <th onClick={() => handleSort('description')}>
                    <span className="sortable-header">
                      <span>Details</span>
                      <span className="sort-icons">
                        <span
                          className={
                            'sort-icon' +
                            (sort.column === 'description' &&
                            sort.direction === 'asc'
                              ? ' active'
                              : '')
                          }
                        >
                          ▲
                        </span>
                        <span
                          className={
                            'sort-icon' +
                            (sort.column === 'description' &&
                            sort.direction === 'desc'
                              ? ' active'
                              : '')
                          }
                        >
                          ▼
                        </span>
                      </span>
                    </span>
                  </th>
                  <th onClick={() => handleSort('date')}>
                    <span className="sortable-header">
                      <span>Date</span>
                      <span className="sort-icons">
                        <span
                          className={
                            'sort-icon' +
                            (sort.column === 'date' &&
                            sort.direction === 'asc'
                              ? ' active'
                              : '')
                          }
                        >
                          ▲
                        </span>
                        <span
                          className={
                            'sort-icon' +
                            (sort.column === 'date' &&
                            sort.direction === 'desc'
                              ? ' active'
                              : '')
                          }
                        >
                          ▼
                        </span>
                      </span>
                    </span>
                  </th>
                  <th onClick={() => handleSort('total_amount')}>
                    <span className="sortable-header">
                      <span>Total Amount</span>
                      <span className="sort-icons">
                        <span
                          className={
                            'sort-icon' +
                            (sort.column === 'total_amount' &&
                            sort.direction === 'asc'
                              ? ' active'
                              : '')
                          }
                        >
                          ▲
                        </span>
                        <span
                          className={
                            'sort-icon' +
                            (sort.column === 'total_amount' &&
                            sort.direction === 'desc'
                              ? ' active'
                              : '')
                          }
                        >
                          ▼
                        </span>
                      </span>
                    </span>
                  </th>
                  <th onClick={() => handleSort('status')}>
                    <span className="sortable-header">
                      <span>Status</span>
                      <span className="sort-icons">
                        <span
                          className={
                            'sort-icon' +
                            (sort.column === 'status' &&
                            sort.direction === 'asc'
                              ? ' active'
                              : '')
                          }
                        >
                          ▲
                        </span>
                        <span
                          className={
                            'sort-icon' +
                            (sort.column === 'status' &&
                            sort.direction === 'desc'
                              ? ' active'
                              : '')
                          }
                        >
                          ▼
                        </span>
                      </span>
                    </span>
                  </th>
                  <th>Actions</th>
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
                {!loading && journals.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center">
                      No journal entries found.
                    </td>
                  </tr>
                )}
                {!loading &&
                  sortedJournals.map((journal) => (
                    <tr key={journal.id}>
                      <td>{journal.entry_code}</td>
                      <td>{journal.entry_type}</td>
                      <td>{journal.description}</td>
                      <td>
                        {formatDisplayDate(journal.date)}
                      </td>
                      <td>{Number(journal.total_amount || 0).toFixed(2)}</td>
                      <td>
                        <span
                          className={`journal-status-pill ${
                            journal.status === 'Post' ||
                            journal.status === 'Posted'
                              ? 'status-posted'
                              : 'status-unpost'
                          }`}
                        >
                          {journal.status}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="icon-btn view"
                          onClick={() => {
                            setSelectedCode(journal.entry_code);
                            setMode('view');
                          }}
                        >
                          <span className="material-icons-outlined">visibility</span>
                        </button>
                        <button
                          type="button"
                          className="icon-btn edit"
                          onClick={() => {
                            setSelectedCode(journal.entry_code);
                            setMode('edit');
                          }}
                        >
                          <span className="material-icons-outlined">edit</span>
                        </button>
                        <button
                          type="button"
                          className="icon-btn delete"
                          onClick={() => handleDelete(journal.entry_code)}
                        >
                          <span className="material-icons-outlined">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {mode !== 'list' && (
        <div className="journal-ce-page">
          <div className="breadcrumb">
            <a href="#">Dashboard</a>
            <span>/</span>
            <a href="#">Accounting</a>
            <span>/</span>
            <a href="#" onClick={() => setMode('list')}>
              Journal Entries
            </a>
            <span>/</span>
            <span>
              {readOnly ? 'View Journal Entry' : mode === 'edit' ? 'Edit Journal Entry' : 'New Journal Entry'}
            </span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="journal-ce-header-card">
              <div className="journal-ce-header-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="qaid-code">
                    Journal Code
                  </label>
                  <input
                    id="qaid-code"
                    type="text"
                    className="form-control"
                    value={header.entry_code}
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="qaid-date">
                    Journal Date
                  </label>
                  <DatePicker
                    id="qaid-date"
                    selected={parseDate(header.date)}
                    onChange={(date) => {
                      if (!date) {
                        handleHeaderChange('date', '');
                        return;
                      }
                      const y = date.getFullYear();
                      const m = String(date.getMonth() + 1).padStart(2, '0');
                      const d = String(date.getDate()).padStart(2, '0');
                      handleHeaderChange('date', `${y}-${m}-${d}`);
                    }}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="DD/MM/YYYY"
                    className="form-control"
                    disabled={readOnly}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="qaid-ref">
                    Reference
                  </label>
                  <input
                    id="qaid-ref"
                    type="text"
                    className="form-control"
                    value={header.reference}
                    onChange={(e) =>
                      handleHeaderChange('reference', e.target.value)
                    }
                    disabled={readOnly}
                  />
                </div>
              </div>
              <div className="journal-ce-header-row">
                <div className="form-group full-width">
                  <label className="form-label" htmlFor="qaid-details">
                    Description
                  </label>
                  <textarea
                    id="qaid-details"
                    className="form-control form-textarea"
                    value={header.description}
                    onChange={(e) =>
                      handleHeaderChange('description', e.target.value)
                    }
                    disabled={readOnly}
                  />
                </div>
              </div>
            </div>

            <div className="journal-ce-lines-card">
              <div className="journal-ce-lines-header">
                <h2>Journal Lines</h2>
                {!readOnly && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleAddLine}
                  >
                    <span className="material-icons-outlined">add</span>
                    <span>Add Line</span>
                  </button>
                )}
              </div>

              <div className="journal-ce-lines-table-wrapper">
                <table className="journal-ce-lines-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Account</th>
                      <th>Description</th>
                      <th>Debit</th>
                      <th>Credit</th>
                      {!readOnly && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, index) => (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td>
                          <div className="account-select-cell">
                            <SearchableComboBox
                              options={accountOptions}
                              value={line.account_id}
                              onChange={(val) =>
                                handleLineChange(index, 'account_id', val)
                              }
                              disabled={readOnly}
                              placeholder="Select account"
                            />
                          </div>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control"
                            value={line.description}
                            onChange={(e) =>
                              handleLineChange(
                                index,
                                'description',
                                e.target.value,
                              )
                            }
                            disabled={readOnly}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="form-control"
                            value={line.debit}
                            onChange={(e) =>
                              handleLineChange(index, 'debit', e.target.value)
                            }
                            disabled={readOnly}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="form-control"
                            value={line.credit}
                            onChange={(e) =>
                              handleLineChange(index, 'credit', e.target.value)
                            }
                            disabled={readOnly}
                          />
                        </td>
                        {!readOnly && (
                          <td>
                            <button
                              type="button"
                              className="icon-btn delete"
                              onClick={() => handleRemoveLine(index)}
                            >
                              <span className="material-icons-outlined">delete</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="journal-ce-totals">
                <div className="totals-row">
                  <div>
                    <span>Total Debit: </span>
                    <strong>{totals.debit.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span>Total Credit: </span>
                    <strong>{totals.credit.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span>Balance: </span>
                    <strong
                      className={
                        totals.balanced ? 'balance-ok' : 'balance-mismatch'
                      }
                    >
                      {totals.balanced
                        ? 'Balanced'
                        : (totals.debit - totals.credit).toFixed(2)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {error && <div className="error-banner">{error}</div>}

            <div className="journal-ce-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setMode('list')}
              >
                Cancel
              </button>
              {!readOnly && (
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || !totals.balanced}
                >
                  {mode === 'edit' ? 'Update Journal' : 'Save Journal'}
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  );
}
