import React, { useEffect, useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import '../../../../css/backend/ChartOfAccounts.scss';
import AdminLayout from '../components/AdminLayout';
import { apiService } from '../../../services/api';

const ACCOUNT_TYPES = [
  { value: 0, label: 'Main' },
  { value: 1, label: 'Sub' },
];

const DM_TYPES = [
  { value: 0, label: 'Debit' },
  { value: 1, label: 'Credit' },
];

const NATURE_OPTIONS = [
  'asset', 'Inventory','Accounts Receivable','cash', 'bank', 'expense', 'COGs', 'liability', 'equity', 'income'
];

const getAccountTypeLabel = (value) => {
  const found = ACCOUNT_TYPES.find((t) => t.value === Number(value));
  return found ? found.label : '';
};

const flattenTree = (nodes, list = []) => {
  nodes.forEach((node) => {
    list.push(node);
    if (Array.isArray(node.children) && node.children.length > 0) {
      flattenTree(node.children, list);
    }
  });
  return list;
};

const filterTree = (nodes, term) => {
  const trimmed = term.trim().toLowerCase();
  if (!trimmed) return nodes;

  const filterNode = (node) => {
    const code = String(node.AccCode ?? '').toLowerCase();
    const name = String(node.AccName ?? '').toLowerCase();
    const typeLabel = getAccountTypeLabel(node.AccType).toLowerCase();
    const note = String(node.AccNote ?? '').toLowerCase();

    const matches =
      code.includes(trimmed) ||
      name.includes(trimmed) ||
      typeLabel.includes(trimmed) ||
      note.includes(trimmed);

    const children = Array.isArray(node.children)
      ? node.children
          .map((child) => filterNode(child))
          .filter((child) => child !== null)
      : [];

    if (matches || children.length > 0) {
      return {
        ...node,
        children,
      };
    }

    return null;
  };

  return nodes
    .map((node) => filterNode(node))
    .filter((node) => node !== null);
};

export default function ChartOfAccounts() {
  const [tree, setTree] = useState([]);
  const [allAccounts, setAllAccounts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAccount, setCurrentAccount] = useState(null);
  const [form, setForm] = useState({
    AccCode: '',
    AccName: '',
    AccType: 0,
    AccParent: '',
    AccDmType: 0,
    Nature: '',
    AccFinal: false,
    AccMaxLimt: '',
    AccMaxDuration: '',
    AccBranch: '',
    AccNote: '',
    AccStopped: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
  });
  const [expanded, setExpanded] = useState({});
  const [parentOptionsRemote, setParentOptionsRemote] = useState(null);

  const loadAccounts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.get('/accounts/tree');
      const data = Array.isArray(response.data) ? response.data : [];
      setTree(data);
      const flat = flattenTree(data, []);
      setAllAccounts(flat);
    } catch (e) {
      console.error('Failed to load accounts', e);
      setError('Failed to load accounts.');
      setTree([]);
      setAllAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    const total = allAccounts.length;
    const inactive = allAccounts.filter((a) => a.AccStopped).length;
    const active = total - inactive;
    setStats({ total, active, inactive });
  }, [allAccounts]);

  const visibleTree = useMemo(
    () => filterTree(tree, searchTerm),
    [tree, searchTerm],
  );

  const accountCodesSet = useMemo(() => {
    return new Set(allAccounts.map((a) => String(a.AccCode ?? '')));
  }, [allAccounts]);

  const deriveParentCode = React.useCallback(
    (codeInput) => {
      const s = String(codeInput ?? '').trim();
      if (!s) return '';
      for (let i = s.length - 1; i >= 1; i--) {
        const candidate = s.slice(0, i);
        if (accountCodesSet.has(candidate)) {
          return candidate;
        }
      }
      return '';
    },
    [accountCodesSet],
  );

  const findNodeByCode = React.useCallback((nodes, code) => {
    if (!Array.isArray(nodes) || !code) return null;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (String(n.AccCode) === String(code)) return n;
      const child = findNodeByCode(n.children || [], code);
      if (child) return child;
    }
    return null;
  }, []);

  const collectDescendantsCodes = React.useCallback((node) => {
    const result = new Set();
    const walk = (n) => {
      if (!n) return;
      if (n.children && n.children.length > 0) {
        for (const c of n.children) {
          result.add(String(c.AccCode));
          walk(c);
        }
      }
    };
    walk(node);
    return result;
  }, []);

  const descendantSet = useMemo(() => {
    if (!currentAccount) return new Set();
    const node = findNodeByCode(tree, currentAccount.AccCode);
    if (!node) return new Set();
    return collectDescendantsCodes(node);
  }, [tree, currentAccount, findNodeByCode, collectDescendantsCodes]);

  const parentOptions = useMemo(() => {
    const currentCode = currentAccount?.AccCode != null ? Number(currentAccount.AccCode) : null;
    return [...allAccounts]
      .filter((a) => {
        const code = Number(a.AccCode ?? 0);
        if (!code) return false;
        if (currentCode != null && code === currentCode) return false;
        if (descendantSet.has(String(code))) return false;
        return true;
      })
      .sort((a, b) => Number(a.AccCode || 0) - Number(b.AccCode || 0));
  }, [allAccounts, currentAccount, descendantSet]);

  useEffect(() => {
    if (!isModalOpen) return;
    const code = currentAccount?.AccCode ?? form.AccCode;
    if (!code) return;
    const params = { code: Number(code) };
    if (form.AccBranch && Number(form.AccBranch) > 0) {
      params.branch = Number(form.AccBranch);
    }
    apiService
      .get('/accounts/valid-parents', params)
      .then((resp) => {
        const data = Array.isArray(resp.data) ? resp.data : [];
        setParentOptionsRemote(data);
      })
      .catch(() => {
        setParentOptionsRemote(null);
      });
  }, [isModalOpen, currentAccount, form.AccCode, form.AccBranch]);

  const toggleNode = (id) => {
    setExpanded((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const openModal = (account = null) => {
    if (account) {
      setCurrentAccount(account);
      const hasExplicitParent =
        account.AccParent != null && Number(account.AccParent) > 0;
      const suggestedParent = hasExplicitParent
        ? String(account.AccParent)
        : deriveParentCode(account.AccCode);
      setForm({
        AccCode: account.AccCode ?? '',
        AccName: account.AccName ?? '',
        AccType: Number(account.AccType ?? 0),
        AccParent: suggestedParent,
        AccDmType: Number(account.AccDmType ?? 0),
        Nature: account.Nature ?? '',
        AccFinal: Number(account.AccFinal ?? 0) === 1,
        AccMaxLimt: account.AccMaxLimt != null ? String(account.AccMaxLimt) : '',
        AccMaxDuration: account.AccMaxDuration != null ? String(account.AccMaxDuration) : '',
        AccBranch: account.AccBranch != null ? String(account.AccBranch) : '',
        AccNote: account.AccNote ?? '',
        AccStopped: Boolean(account.AccStopped),
      });
    } else {
      setCurrentAccount(null);
      setForm({
        AccCode: '',
        AccName: '',
        AccType: 0,
        AccParent: '',
        AccDmType: 0,
        Nature: '',
        AccFinal: false,
        AccMaxLimt: '',
        AccMaxDuration: '',
        AccBranch: '',
        AccNote: '',
        AccStopped: false,
      });
    }
    setParentOptionsRemote(null);
    setError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentAccount(null);
    setError('');
  };

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  useEffect(() => {
    if (!isModalOpen) return;
    const codeStr = form.AccCode != null ? String(form.AccCode) : '';
    if (!form.AccParent && codeStr) {
      const derived = deriveParentCode(codeStr);
      if (derived) {
        setForm((prev) => ({ ...prev, AccParent: derived }));
      }
    }
  }, [isModalOpen, form.AccCode, form.AccParent, deriveParentCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.AccCode || !form.AccName) {
      setError('Account code and name are required.');
      return;
    }
    const payload = {
      AccCode: Number(form.AccCode),
      AccName: form.AccName,
      AccType: Number(form.AccType),
      AccParent: form.AccParent !== '' ? Number(form.AccParent) : null,
      AccDmType: form.AccDmType === 0 ? 1 : 2,
      Nature: form.Nature || null,
      AccFinal: Boolean(form.AccFinal),
      AccMaxLimt: form.AccMaxLimt !== '' ? Number(form.AccMaxLimt) : null,
      AccMaxDuration: form.AccMaxDuration !== '' ? Number(form.AccMaxDuration) : null,
      AccBranch:
        form.AccBranch !== '' && Number(form.AccBranch) > 0
          ? Number(form.AccBranch)
          : null,
      AccNote: form.AccNote || null,
      AccStopped: Boolean(form.AccStopped),
    };
    try {
      setLoading(true);
      setError('');
      if (currentAccount && currentAccount.AccID != null) {
        await apiService.put(`/accounts/${currentAccount.AccID}`, payload);
      } else {
        await apiService.post('/accounts', payload);
      }
      closeModal();
      await loadAccounts();
    } catch (e) {
      console.error('Failed to save account', e);
      const resp = e?.response;
      if (resp?.status === 422 && resp?.data?.errors) {
        const errs = resp.data.errors;
        const messages = Object.values(errs)
          .flat()
          .join(' ');
        setError(messages || 'Validation error.');
      } else {
        const message = resp?.data?.message || 'Failed to save account.';
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (account) => {
    if (!account || account.AccID == null) return;
    const confirmDelete = window.confirm('Are you sure you want to delete this account?');
    if (!confirmDelete) return;
    try {
      setLoading(true);
      await apiService.delete(`/accounts/${account.AccID}`);
      await loadAccounts();
    } catch (e) {
      console.error('Failed to delete account', e);
      const message =
        e?.response?.data?.message || 'Failed to delete account.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async (account) => {
    if (!account || account.AccID == null) return;
    const confirmStop = window.confirm(
      'Stopping this account will prevent future postings. Continue?',
    );
    if (!confirmStop) return;
    try {
      setLoading(true);
      setError('');
      await apiService.patch(`/accounts/${account.AccID}/stop`);
      await loadAccounts();
    } catch (e) {
      console.error('Failed to stop account', e);
      const message =
        e?.response?.data?.message || 'Failed to stop account.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const renderRows = (nodes, depth = 0) => {
    if (!Array.isArray(nodes) || nodes.length === 0) return null;

    return nodes.flatMap((account) => {
      const stopped = Boolean(account.AccStopped);
      const hasChildren = Array.isArray(account.children) && account.children.length > 0;
      const isExpanded =
        expanded[account.AccID] !== undefined ? expanded[account.AccID] : false;
      const isFinal = Number(account.AccFinal ?? 0) === 1;
      const finalValue = Number(account.AccFinal ?? 0);
      const finalLabel = finalValue === 0 ? 'Balance' : 'P&L';
      const finalClass = finalValue === 0 ? 'final-balance' : 'final-pl';
      const isSubType = Number(account.AccType ?? 0) === 1;

      const row = (
        <tr
          key={account.AccID ?? `${account.AccCode}-${account.AccName}`}
          className={`account-row ${stopped ? 'account-row-stopped' : ''}`}
        >
          <td>
            <div
              className="account-code-cell"
              style={{ paddingLeft: `${depth * 16}px` }}
            >
              {hasChildren ? (
                <button
                  type="button"
                  className="account-toggle-btn"
                  onClick={() => toggleNode(account.AccID)}
                >
                  <span className="material-icons-outlined">
                    {isExpanded ? 'expand_more' : 'chevron_right'}
                  </span>
                </button>
              ) : (
                <span className="account-toggle-placeholder" />
              )}
              <span className="material-icons-outlined account-node-icon">
                {isFinal ? 'insert_drive_file' : 'folder'}
              </span>
              <span>{account.AccCode}</span>
            </div>
          </td>
          <td>
            <div className="account-info">
              <div className="account-name">
                <span>{account.AccName}</span>
              </div>
              {account.AccNote && (
                <div className="account-note">{account.AccNote}</div>
              )}
            </div>
          </td>
          <td>
            <span
              className={`account-type-pill ${
                isSubType ? 'account-type-sub' : ''
              }`}
            >
              {getAccountTypeLabel(account.AccType)}
            </span>
          </td>
          <td>
            {account.Nature ? (
              <span>
                {account.Nature.charAt(0).toUpperCase() + account.Nature.slice(1)}
              </span>
            ) : (
              '-'
            )}
          </td>
          <td>
            <span className={`account-final-pill ${finalClass}`}>
              {finalLabel}
            </span>
          </td>
          <td>
            <span
              className={
                stopped
                  ? 'account-status status-inactive'
                  : 'account-status status-active'
              }
            >
              {stopped ? 'Inactive' : 'Active'}
            </span>
          </td>
          <td>
            <button
              type="button"
              className="icon-btn edit"
              onClick={() => openModal(account)}
            >
              <span className="material-icons-outlined">edit</span>
            </button>
            {!stopped && (
              <button
                type="button"
                className="icon-btn stop"
                onClick={() => handleStop(account)}
              >
                <span className="material-icons-outlined">block</span>
              </button>
            )}
            <button
              type="button"
              className="icon-btn delete"
              onClick={() => handleDelete(account)}
            >
              <span className="material-icons-outlined">delete</span>
            </button>
          </td>
        </tr>
      );

      if (!hasChildren || !isExpanded) {
        return [row];
      }

      return [row, renderRows(account.children, depth + 1)];
    });
  };

  return (
    <AdminLayout activeMenu="Chart of Accounts">
      <div className="ChartOfAccounts-page">
        <Head title="Chart of Accounts - ZodicERP" />
        <div className="breadcrumb">
        <a href="#">Dashboard</a>
        <span>/</span>
        <a href="#">Accounting</a>
        <span>/</span>
        <span>Chart of Accounts</span>
      </div>
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--primary-color)' }}>
            <span className="material-icons-outlined">account_tree</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Accounts</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--success-color)' }}>
            <span className="material-icons-outlined">check_circle</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.active}</div>
            <div className="stat-label">Active Accounts</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--gray-color)' }}>
            <span className="material-icons-outlined">pause_circle</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.inactive}</div>
            <div className="stat-label">Inactive Accounts</div>
          </div>
        </div>
      </div>
      <div className="accounts-card fade-in">
        <div className="card-header">
          <div className="accounts-actions">
            <div className="search-bar light">
              <input
                type="text"
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button type="button">
                <span className="material-icons-outlined">search</span>
              </button>
            </div>
          </div>
          <div className="actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => openModal()}
            >
              <span className="material-icons-outlined">add</span>
              <span>Add Account</span>
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={loadAccounts}
            >
              <span className="material-icons-outlined">refresh</span>
              <span>Refresh</span>
            </button>
          </div>
        </div>
        {error && <div className="error-banner">{error}</div>}
        <div className="table-container">
          <table className="accounts-table">
            <thead>
              <tr>
                <th>CODE</th>
                <th>ACCOUNT</th>
                <th>TYPE</th>
                <th>NATURE</th>
                <th>FINAL</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
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
              {!loading && visibleTree.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center">
                    No accounts found.
                  </td>
                </tr>
              )}
              {!loading && renderRows(visibleTree)}
            </tbody>
          </table>
        </div>
      </div>
      <div
        className={`modal-overlay ${isModalOpen ? 'active' : ''}`}
        onClick={(e) => {
          if (String(e.target.className).includes('modal-overlay')) {
            closeModal();
          }
        }}
      >
        <div className="modal">
          <div className="modal-header">
            <div className="modal-title">
              {currentAccount ? 'Edit Account' : 'Add New Account'}
            </div>
            <button
              type="button"
              className="modal-close"
              onClick={closeModal}
            >
              <span className="material-icons-outlined">close</span>
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && (
                <div
                  className="error-banner"
                  style={{
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    borderRadius: '0.375rem',
                    border: '1px solid #fecaca',
                  }}
                >
                  {error}
                </div>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="acc-code">
                    Account Code
                  </label>
                  <input
                    id="acc-code"
                    name="AccCode"
                    type="number"
                    className="form-control"
                    value={form.AccCode}
                    onChange={(e) => handleFieldChange('AccCode', e.target.value)}
                    required
                    aria-required="true"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="acc-name">
                    Account Name
                  </label>
                  <input
                    id="acc-name"
                    name="AccName"
                    type="text"
                    className="form-control"
                    value={form.AccName}
                    onChange={(e) => handleFieldChange('AccName', e.target.value)}
                    required
                    aria-required="true"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="acc-type">
                    Account Type
                  </label>
                  <select
                    id="acc-type"
                    name="AccType"
                    className="form-control"
                    value={form.AccType}
                    onChange={(e) => handleFieldChange('AccType', e.target.value)}
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="acc-parent">
                    Parent Account
                  </label>
                  <select
                    id="acc-parent"
                    name="AccParent"
                    className="form-control"
                    value={form.AccParent}
                    onChange={(e) => handleFieldChange('AccParent', e.target.value)}
                  >
                    <option value="">None</option>
                    {(parentOptionsRemote ?? parentOptions).map((a) => (
                      <option key={a.AccID} value={String(a.AccCode)}>
                        {a.AccCode} - {a.AccName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="acc-dmtype">
                    Debit / Credit Nature
                  </label>
                  <select
                    id="acc-dmtype"
                    name="AccDmType"
                    className="form-control"
                    value={form.AccDmType}
                    onChange={(e) => handleFieldChange('AccDmType', Number(e.target.value))}
                  >
                    {DM_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="acc-nature">
                    Nature Account
                  </label>
                  <select
                    id="acc-nature"
                    name="Nature"
                    className="form-control"
                    value={form.Nature}
                    onChange={(e) => handleFieldChange('Nature', e.target.value)}
                  >
                    <option value="">Select Nature</option>
                    {NATURE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="acc-final">
                    Final Account
                  </label>
                  <input
                    id="acc-final"
                    name="AccFinal"
                    type="number"
                    className="form-control"
                    value={form.AccFinal ? 1 : 0}
                    onChange={(e) =>
                      handleFieldChange('AccFinal', Number(e.target.value) === 1)
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="acc-max-limit">
                    Max Limit
                  </label>
                  <input
                    id="acc-max-limit"
                    name="AccMaxLimt"
                    type="number"
                    className="form-control"
                    value={form.AccMaxLimt}
                    onChange={(e) => handleFieldChange('AccMaxLimt', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="acc-max-duration">
                    Max Duration
                  </label>
                  <input
                    id="acc-max-duration"
                    name="AccMaxDuration"
                    type="number"
                    className="form-control"
                    value={form.AccMaxDuration}
                    onChange={(e) =>
                      handleFieldChange('AccMaxDuration', e.target.value)
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="acc-branch">
                    Branch
                  </label>
                  <input
                    id="acc-branch"
                    name="AccBranch"
                    type="number"
                    className="form-control"
                    value={form.AccBranch}
                    onChange={(e) => handleFieldChange('AccBranch', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="acc-note">
                  Notes
                </label>
                <textarea
                  id="acc-note"
                  name="AccNote"
                  className="form-control form-textarea"
                  value={form.AccNote}
                  onChange={(e) => handleFieldChange('AccNote', e.target.value)}
                  placeholder="Enter account description or internal notes..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    className="toggle-input"
                    checked={!form.AccStopped}
                    onChange={(e) => handleFieldChange('AccStopped', !e.target.checked ? true : false)}
                    aria-label="Toggle account status"
                  />
                  <span className="toggle-slider" />
                  <span className="toggle-label">
                    {form.AccStopped ? 'Inactive' : 'Active'}
                  </span>
                </label>
              </div>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {currentAccount ? 'Update Account' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
      </div>
    </AdminLayout>
  );
}
