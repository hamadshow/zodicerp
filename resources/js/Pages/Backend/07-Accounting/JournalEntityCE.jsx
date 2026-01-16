import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

const highlightText = (label, term) => {
  if (!term) return label;
  const lowerLabel = label.toLowerCase();
  const lowerTerm = term.toLowerCase();
  const index = lowerLabel.indexOf(lowerTerm);
  if (index === -1) return label;
  const before = label.slice(0, index);
  const match = label.slice(index, index + term.length);
  const after = label.slice(index + term.length);
  return (
    <>
      {before}
      <span className="searchable-combobox-highlight">{match}</span>
      {after}
    </>
  );
};

function SearchableComboBox({
  options,
  value,
  onChange,
  disabled = false,
  placeholder = 'Select',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownRect, setDropdownRect] = useState(null);

  const filteredOptions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const limited = options;
    if (!term) {
      return limited;
    }
    return limited.filter((opt) =>
      String(opt.label || '').toLowerCase().includes(term),
    );
  }, [options, searchTerm]);

  useEffect(() => {
    const current = options.find(
      (opt) => String(opt.value) === String(value ?? ''),
    );
    if (current) {
      setSearchTerm(current.label || '');
    } else {
      setSearchTerm('');
    }
  }, [value, options]);

  useEffect(() => {
    if (!isOpen) {
      setHighlightedIndex(-1);
      return;
    }
    if (filteredOptions.length > 0 && highlightedIndex < 0) {
      setHighlightedIndex(0);
    }
  }, [isOpen, filteredOptions, highlightedIndex]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const container = containerRef.current;
      const dropdownEl = dropdownRef.current;
      if (!container && !dropdownEl) return;
      const isInsideContainer =
        container && container.contains(event.target);
      const isInsideDropdown =
        dropdownEl && dropdownEl.contains(event.target);
      if (isInsideContainer || isInsideDropdown) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const updateDropdownPosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownRect({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    updateDropdownPosition();
    const handleReposition = () => {
      updateDropdownPosition();
    };
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [isOpen]);

  const handleInputChange = (e) => {
    if (disabled) return;
    setSearchTerm(e.target.value);
    setIsOpen(true);
    updateDropdownPosition();
  };

  const handleInputFocus = () => {
    if (disabled) return;
    setIsOpen(true);
    updateDropdownPosition();
  };

  const handleWrapperClick = () => {
    if (disabled) return;
    if (inputRef.current) {
      inputRef.current.focus();
    }
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        updateDropdownPosition();
      }
      return next;
    });
  };

  const selectOption = (opt) => {
    if (!opt) return;
    onChange(opt.value);
    setSearchTerm(opt.label || '');
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      setIsOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredOptions.length === 0) return;
      setHighlightedIndex((prev) => {
        const next = prev + 1;
        if (next >= filteredOptions.length) return 0;
        return next;
      });
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredOptions.length === 0) return;
      setHighlightedIndex((prev) => {
        const next = prev - 1;
        if (next < 0) return filteredOptions.length - 1;
        return next;
      });
      return;
    }
    if (e.key === 'Enter') {
      if (!isOpen) return;
      e.preventDefault();
      const opt = filteredOptions[highlightedIndex];
      if (opt) {
        selectOption(opt);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      return;
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (disabled) return;
    onChange('');
    setSearchTerm('');
    setIsOpen(false);
  };

  const isBrowser = typeof document !== 'undefined';

  const dropdown =
    isOpen && filteredOptions
      ? (
        <div
          className="searchable-combobox-dropdown"
          ref={dropdownRef}
          style={
            isBrowser && dropdownRect
              ? {
                  top: dropdownRect.top,
                  left: dropdownRect.left,
                  width: dropdownRect.width,
                  right: 'auto',
                }
              : undefined
          }
        >
          {filteredOptions.length === 0 ? (
            <div className="searchable-combobox-no-results">
              No results found
            </div>
          ) : (
            filteredOptions.map((opt, index) => (
              <div
                key={opt.value}
                className={`searchable-combobox-option${
                  index === highlightedIndex ? ' active' : ''
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectOption(opt);
                }}
              >
                {highlightText(opt.label || '', searchTerm)}
              </div>
            ))
          )}
        </div>
        )
      : null;

  return (
    <div className="searchable-combobox" ref={containerRef}>
      <div
        className={`searchable-combobox-input-wrapper${
          disabled ? ' is-disabled' : ''
        }`}
        onClick={handleWrapperClick}
      >
        <input
          type="text"
          ref={inputRef}
          className="form-control searchable-combobox-input"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
        />
        {value && !disabled && (
          <button
            type="button"
            className="searchable-combobox-clear"
            onClick={handleClear}
          >
            ×
          </button>
        )}
        <span className="searchable-combobox-arrow">▾</span>
      </div>
      {dropdown &&
        (isBrowser ? createPortal(dropdown, document.body) : dropdown)}
      <select
        className="searchable-combobox-hidden-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required
      >
        <option value="">Select</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

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
    QaidCode: '',
    QaidDate: '',
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
        params.ids = extraIds.join(',');
      } else {
        params.type = 1;
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
        QaidCode: nextCode ? String(nextCode) : 'QID-10001',
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
                        <div className="account-select-cell">
                          <SearchableComboBox
                            options={accountOptions}
                            value={line.QaidBodyAccID}
                            onChange={(val) =>
                              handleLineChange(index, 'QaidBodyAccID', val)
                            }
                            disabled={readOnly}
                            placeholder="Select account"
                          />
                        </div>
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

