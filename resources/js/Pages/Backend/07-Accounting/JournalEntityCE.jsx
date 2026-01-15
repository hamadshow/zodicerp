import React, { useEffect, useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import '../../../../css/backend/JournalEntityCE.css';
import AdminLayout from '../components/AdminLayout';
import { apiService } from '../../../services/api';

const emptyLine = () => ({
  QaidBodyAccID: '',
  QaidBodyD1: '',
  QaidBodyM1: '',
  QaidBodyDetails: '',
});

export default function JournalEntityCE() {
  const { url } = usePage();
  const isCreate = url === '/admin/journals/create';
  const isEdit = !isCreate && /\/admin\/journals\/.+\/edit$/u.test(url);
  const viewMatch = !isCreate ? url.match(/\/admin\/journals\/([^/]+)$/u) : null;
  const codeFromUrl = isEdit
    ? url.replace('/admin/journals/', '').replace('/edit', '')
    : viewMatch
      ? decodeURIComponent(viewMatch[1])
      : null;
  const readOnly = !!(codeFromUrl && !isEdit);

  const [header, setHeader] = useState({
    QaidCode: '',
    QaidDate: '',
    QaidType: '',
    QaidRef: '',
    QaidDetails: '',
    QaidStatus: 'UnPost',
  });
  const [lines, setLines] = useState([emptyLine()]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadAccounts = async (extraIds = []) => {
    try {
      const isEditMode = Array.isArray(extraIds) && extraIds.length > 0;
      const params = {};
      
      if (isEditMode) {
        // In edit mode, we want to load specifically the accounts used
        // We do NOT restrict by type or postable_only to ensure we see what was saved
        params.ids = extraIds.join(',');
      } else {
        // In create mode (or initial load), we show only postable accounts of type 1
        params.type = 1;
        params.postable_only = true;
      }

      const response = await apiService.get('/accounts', params);
      const data = Array.isArray(response.data) ? response.data : [];
      setAccounts(data);
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
        QaidCode: nextCode ? String(nextCode) : '1',
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
        QaidCode: headerData.QaidCode || '',
        QaidDate: headerData.QaidDate || '',
        QaidType: headerData.QaidType || '',
        QaidRef: headerData.QaidRef || '',
        QaidDetails: headerData.QaidDetails || '',
        QaidStatus: headerData.QaidStatus || 'UnPost',
      });
      setLines(
        lineData.length > 0
          ? lineData.map((l) => ({
              QaidBodyAccID:
                (l.AccountAccID ?? l.QaidBodyAccID)?.toString() || '',
              QaidBodyD1: l.QaidBodyD1?.toString() || '',
              QaidBodyM1: l.QaidBodyM1?.toString() || '',
              QaidBodyDetails: l.QaidBodyDetails || '',
            }))
          : [emptyLine()],
      );
      if (ensureAccounts && lineData.length > 0) {
        const usedIds = lineData
          .map((l) => l.AccountAccID ?? l.QaidBodyAccID)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleHeaderChange = (field, value) => {
    if (readOnly && field !== 'QaidStatus') return;
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
      debit += Number(line.QaidBodyD1 || 0);
      credit += Number(line.QaidBodyM1 || 0);
    });
    return {
      debit,
      credit,
      balanced: Math.round(debit * 100) === Math.round(credit * 100),
    };
  }, [lines]);

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
            l.QaidBodyAccID &&
            (Number(l.QaidBodyD1 || 0) > 0 || Number(l.QaidBodyM1 || 0) > 0),
        )
        .map((l) => ({
          QaidBodyAccID: Number(l.QaidBodyAccID),
          QaidBodyD1: Number(l.QaidBodyD1 || 0),
          QaidBodyM1: Number(l.QaidBodyM1 || 0),
          QaidBodyDetails: l.QaidBodyDetails || null,
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
    } finally {
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
                  value={header.QaidCode}
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
                  value={header.QaidDate}
                  onChange={(e) =>
                    handleHeaderChange('QaidDate', e.target.value)
                  }
                  disabled={readOnly}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="qaid-type">
                  Journal Type
                </label>
                <input
                  id="qaid-type"
                  type="text"
                  className="form-control"
                  value={header.QaidType}
                  onChange={(e) =>
                    handleHeaderChange('QaidType', e.target.value)
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
                  value={header.QaidRef}
                  onChange={(e) =>
                    handleHeaderChange('QaidRef', e.target.value)
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
                  value={header.QaidDetails}
                  onChange={(e) =>
                    handleHeaderChange('QaidDetails', e.target.value)
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
                    <th>Debit</th>
                    <th>Credit</th>
                    <th>Description</th>
                    {!readOnly && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>
                        <select
                          className="form-control"
                          value={line.QaidBodyAccID}
                          onChange={(e) =>
                            handleLineChange(index, 'QaidBodyAccID', e.target.value)
                          }
                          disabled={readOnly}
                          required
                        >
                          <option value="">Select account</option>
                          {accounts.map((acc) => (
                            <option key={acc.AccID} value={acc.AccID}>
                              {acc.AccCode} - {acc.AccName}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="form-control"
                          value={line.QaidBodyD1}
                          onChange={(e) =>
                            handleLineChange(index, 'QaidBodyD1', e.target.value)
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
                          value={line.QaidBodyM1}
                          onChange={(e) =>
                            handleLineChange(index, 'QaidBodyM1', e.target.value)
                          }
                          disabled={readOnly}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          value={line.QaidBodyDetails}
                          onChange={(e) =>
                            handleLineChange(
                              index,
                              'QaidBodyDetails',
                              e.target.value,
                            )
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

