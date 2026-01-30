import React, { useEffect, useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import '../../../../css/backend/JournalEntityCE.scss';
import AdminLayout from '../components/AdminLayout';
import SearchableComboBox from '../components/SearchableComboBox';
import { apiService } from '../../../services/api';

const emptyLine = () => ({
  account_id: '',
  debit: '',
  credit: '',
  description: '',
});

export default function JournalEntityCE() {
  const { url } = usePage();
  const pathname = (() => {
    try {
      return new URL(url, window.location.origin).pathname;
    } catch {
      return typeof window !== 'undefined' ? window.location.pathname : url;
    }
  })();
  const isCreate = pathname === '/admin/journals/create';
  const matchEdit = pathname.match(/^\/admin\/journals\/([^/]+)\/edit$/u);
  const matchView = pathname.match(/^\/admin\/journals\/([^/]+)$/u);
  const isEdit = !!matchEdit;
  const codeFromUrl = matchEdit
    ? decodeURIComponent(matchEdit[1])
    : isCreate
    ? null
    : matchView
    ? decodeURIComponent(matchView[1])
    : null;
  const readOnly = !!(codeFromUrl && !isEdit);

  const [header, setHeader] = useState({
    entry_code: '',
    date: new Date().toISOString().split('T')[0],
    reference: '',
    description: '',
    status: 'UnPost',
  });
  const [lines, setLines] = useState([emptyLine()]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      // Merge unique by AccID
      const byId = new Map();
      [...typeData, ...extras].forEach((acc) => {
        const key = acc.AccID ?? acc.AccCode ?? Math.random();
        if (!byId.has(key)) {
          byId.set(key, acc);
        }
      });
      setAccounts(Array.from(byId.values()));
    } catch (e) {
      console.error('Failed to load accounts', e);
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
    } catch (e) {
      console.error('Failed to fetch next journal code', e);
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
      setHeader({
        entry_code: headerData.entry_code || '',
        date: headerData.date || '',
        reference: headerData.reference || '',
        description: headerData.description || '',
        status: headerData.status || 'UnPost',
      });
      setLines(
        lineData.length > 0
          ? lineData.map((l) => ({
              account_id:
                (l.AccountAccID ?? l.account_id)?.toString() || '',
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
      console.error('Failed to load journal entry', e);
      const message =
        e?.response?.data?.message || 'Failed to load journal entry.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (codeFromUrl) {
      loadExisting(codeFromUrl, true);
    } else {
      loadAccounts();
      loadNextCode();
    }
  }, []);

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
      if (codeFromUrl && isEdit) {
        await apiService.put(`/journals/${encodeURIComponent(codeFromUrl)}`, payload);
      } else {
        await apiService.post('/journals', payload);
      }
      router.get('/admin/journals');
    } catch (e) {
      console.error('Failed to save journal entry', e);
      const message =
        e?.response?.data?.message || 'Failed to save journal entry.';
      setError(message);
      setLoading(false);
    }
  };

  const pageTitle = readOnly
    ? 'View Journal Entry'
    : isEdit
      ? 'Edit Journal Entry'
      : 'New Journal Entry';

  return (
    <AdminLayout activeMenu="Journal Entries">
      <Head title={`${pageTitle} - ZodicERP`} />
      <div className="journal-ce-page">
        <div className="breadcrumb">
          <a href="#">Dashboard</a>
          <span>/</span>
          <a href="#">Accounting</a>
          <span>/</span>
          <a href="#" onClick={() => router.get('/admin/journals')}>
            Journal Entries
          </a>
          <span>/</span>
          <span>{pageTitle}</span>
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
                <input
                  id="qaid-date"
                  type="date"
                  className="form-control"
                  value={header.date}
                  onChange={(e) =>
                    handleHeaderChange('date', e.target.value)
                  }
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
              onClick={() => router.get('/admin/journals')}
            >
              Cancel
            </button>
            {!readOnly && (
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !totals.balanced}
              >
                {isEdit ? 'Update Journal' : 'Save Journal'}
              </button>
            )}
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
