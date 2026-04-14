import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Head, router, usePage, Link } from '@inertiajs/react';
import * as XLSX from 'xlsx';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/main.scss';
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
  const { props } = usePage();
  const localization = props.localization || {};
  const translations = localization.translations || {};

  const t = (key, fallback) => {
    return translations[`ChartOfAccounts.${key}`] || fallback;
  };

  const ACCOUNT_TYPES = [
    { value: 0, label: t('main', 'Main') },
    { value: 1, label: t('sub', 'Sub') },
  ];

  const DM_TYPES = [
    { value: 0, label: t('debit', 'Debit') },
    { value: 1, label: t('credit', 'Credit') },
  ];

  const NATURE_OPTIONS = [
    'asset', 'Inventory','Accounts Receivable','cash', 'bank', 'expense', 'COGs', 'liability', 'equity', 'income'
  ];

  const [tree, setTree] = useState([]);
  const [allAccounts, setAllAccounts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
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
  const [branches, setBranches] = useState([]);

  // Import System State
  const [showImport, setShowImport] = useState(false);
  const [excelRows, setExcelRows] = useState([]);
  const [invalidRows, setInvalidRows] = useState([]);
  const [importSummary, setImportSummary] = useState({});
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importError, setImportError] = useState(null);
  const [showExcelMenu, setShowExcelMenu] = useState(false);
  const fileInputRef = useRef(null);
  const excelMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (excelMenuRef.current && !excelMenuRef.current.contains(event.target)) {
        setShowExcelMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (props.flash?.success) {
      toast.success(props.flash.success);
      setShowImport(false);
      setExcelRows([]);
      setInvalidRows([]);
      setImportSummary({});
      loadAccounts();
    }
    if (props.flash?.error) {
      toast.error(props.flash.error);
    }
  }, [props.flash]);

  const downloadTemplate = () => {
    const headers = ['AccCode', 'AccName', 'AccType', 'AccParent', 'AccDmType', 'Nature', 'AccFinal', 'AccBranch', 'AccNote', 'AccStopped'];
    const sample = ['1001', 'Cash in Hand', '1', '10', '0', 'cash', '1', '1', 'General cash account', '0'];
    const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "chart_of_accounts_template.xlsx");
  };

  const handleFileUpload = (file) => {
    if (!file) return;
    setImportLoading(true);
    setImportError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        processExcelData(jsonData);
      } catch (err) {
        setImportError(err?.message || 'Error reading file');
        setImportLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setImportError(null);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      handleFileUpload(file);
    } else {
      setImportError('Please upload a valid Excel file (.xlsx, .xls)');
    }
  };

  const processExcelData = (rows) => {
    if (rows.length < 2) {
      setImportError('File is empty or missing headers');
      setImportLoading(false);
      return;
    }

    const headers = rows[0].map(h => String(h).trim());
    const dataRows = rows.slice(1);
    const valid = [];
    const invalid = [];

    // Column mapping
    const map = {
      'AccCode': headers.indexOf('AccCode'),
      'AccName': headers.indexOf('AccName'),
      'AccType': headers.indexOf('AccType'),
      'AccParent': headers.indexOf('AccParent'),
      'AccDmType': headers.indexOf('AccDmType'),
      'Nature': headers.indexOf('Nature'),
      'AccFinal': headers.indexOf('AccFinal'),
      'AccBranch': headers.indexOf('AccBranch'),
      'AccNote': headers.indexOf('AccNote'),
      'AccStopped': headers.indexOf('AccStopped'),
    };

    dataRows.forEach((row) => {
      const getVal = (key) => {
        const colIdx = map[key];
        return colIdx !== -1 && row[colIdx] !== undefined ? String(row[colIdx]).trim() : '';
      };

      const item = {
        AccCode: getVal('AccCode'),
        AccName: getVal('AccName'),
        AccType: getVal('AccType'),
        AccParent: getVal('AccParent'),
        AccDmType: getVal('AccDmType'),
        Nature: getVal('Nature'),
        AccFinal: getVal('AccFinal'),
        AccBranch: getVal('AccBranch'),
        AccNote: getVal('AccNote'),
        AccStopped: getVal('AccStopped'),
        _errors: []
      };

      // Client-side Validation
      if (!item.AccCode) item._errors.push('Account Code is required');
      if (!item.AccName) item._errors.push('Account Name is required');
      
      // Check duplicates in current batch
      if (valid.find(v => v.AccCode === item.AccCode && item.AccCode)) {
        item._errors.push('Duplicate Account Code in file');
      }

      if (item._errors.length > 0) {
        invalid.push(item);
      } else {
        valid.push(item);
      }
    });

    setExcelRows(valid);
    setInvalidRows(invalid);
    setImportSummary({
      total: dataRows.length,
      valid: valid.length,
      invalid: invalid.length
    });
    setImportLoading(false);
  };

  const removeImportRow = (index) => {
    const rows = [...excelRows];
    rows.splice(index, 1);
    setExcelRows(rows);
    setImportSummary(prev => ({ ...prev, valid: rows.length }));
  };

  const submitImport = async () => {
    if (excelRows.length === 0) return;
    setImportError(null);
    setImportLoading(true);
    setImportProgress(0);

    const totalRows = excelRows.length;
    const batchSize = 50; // Process 50 rows at a time
    const batches = [];
    
    for (let i = 0; i < totalRows; i += batchSize) {
      batches.push(excelRows.slice(i, i + batchSize));
    }

    try {
      for (let i = 0; i < batches.length; i++) {
        await new Promise((resolve, reject) => {
          router.post(route('admin.accounts.bulkImport'), {
            rows: batches[i],
          }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
              const progress = Math.min(Math.round(((i + 1) / batches.length) * 100), 100);
              setImportProgress(progress);
              resolve();
            },
            onError: (err) => {
              reject(err);
            }
          });
        });
      }
      
      // Final success handling (since the last batch success triggers this)
      setShowImport(false);
      setExcelRows([]);
      setInvalidRows([]);
      setImportSummary({});
      setImportProgress(0);
      loadAccounts();
    } catch (err) {
      setImportError('Failed to import. Some rows may not have been processed.');
      console.error(err);
    } finally {
      setImportLoading(false);
    }
  };

  const handleExportExcel = () => {
    try {
      // Flatten the current visible tree for export
      const dataToExport = flattenTree(visibleTree).map(account => ({
        'Account Code': account.AccCode,
        'Account Name': account.AccName,
        'Type': account.AccType === 0 ? 'Main' : 'Sub',
        'Parent Code': account.AccParent || '',
        'Nature': account.Nature || '',
        'Final': account.AccFinal ? 'Yes' : 'No',
        'Status': account.AccStopped ? 'Stopped' : 'Active',
        'Note': account.AccNote || ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Chart of Accounts");

      // Apply some basic styling to columns
      const wscols = [
        { wch: 15 }, // Code
        { wch: 30 }, // Name
        { wch: 10 }, // Type
        { wch: 15 }, // Parent
        { wch: 15 }, // Nature
        { wch: 10 }, // Final
        { wch: 10 }, // Status
        { wch: 40 }  // Note
      ];
      worksheet['!cols'] = wscols;

      XLSX.writeFile(workbook, `ChartOfAccounts_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('تم تصدير البيانات بنجاح');
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('فشل عملية التصدير');
    }
  };

  const renderImportModal = () => {
    if (!showImport) return null;

    return (
      <div className="modal-overlay active" onClick={() => !importLoading && setShowImport(false)}>
        <div className="modal import-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">Import Chart of Accounts from Excel</h3>
            <button className="modal-close" onClick={() => setShowImport(false)}>&times;</button>
          </div>

          <div className="modal-body">
            {!excelRows.length && !invalidRows.length ? (
              <div 
                className="drop-zone"
                onDragOver={e => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={e => handleFileUpload(e.target.files[0])} 
                  accept=".xlsx, .xls"
                  style={{ display: 'none' }}
                />
                <i className="icon-upload-cloud" style={{ fontSize: '48px', color: '#3b82f6' }}></i>
                <p>Click to upload or drag and drop</p>
                <span>Excel files only (.xlsx, .xls)</span>
                <button className="btn-template" onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}>
                  Download Template
                </button>
              </div>
            ) : (
              <div className="import-preview-container">
                <div className="preview-stats">
                  <span className="stat-badge total">Total: {importSummary.total}</span>
                  <span className="stat-badge valid">Valid: {importSummary.valid}</span>
                  <span className="stat-badge invalid">Invalid: {importSummary.invalid}</span>
                  <button className="btn-reset" onClick={() => { setExcelRows([]); setInvalidRows([]); }}>
                    Upload Different File
                  </button>
                </div>

                {importLoading && (
                  <div className="progress-bar-container">
                    <div className="progress-bar">
                      <div 
                        className="progress-bar__fill" 
                        style={{ width: `${importProgress}%` }}
                      ></div>
                    </div>
                    <div className="progress-text">جاري الاستيراد: {importProgress}%</div>
                  </div>
                )}

                <div className="import-tables">
                  {excelRows.length > 0 && (
                    <div className="import-section">
                      <h4>Valid Rows ({excelRows.length})</h4>
                      <div className="table-responsive">
                        <table className="data-table preview-table">
                          <thead>
                            <tr>
                              <th>Code</th>
                              <th>Name</th>
                              <th>Type</th>
                              <th>Parent</th>
                              <th>Nature</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {excelRows.map((row, idx) => (
                              <tr key={idx}>
                                <td>{row.AccCode}</td>
                                <td>{row.AccName}</td>
                                <td>{row.AccType === '0' ? 'Main' : 'Sub'}</td>
                                <td>{row.AccParent || '-'}</td>
                                <td>{row.Nature || '-'}</td>
                                <td>
                                  <button className="btn-remove" onClick={() => removeImportRow(idx)}>&times;</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {invalidRows.length > 0 && (
                    <div className="import-section invalid">
                      <h4>Invalid Rows ({invalidRows.length})</h4>
                      <div className="table-responsive">
                        <table className="data-table preview-table">
                          <thead>
                            <tr>
                              <th>Code</th>
                              <th>Name</th>
                              <th>Errors</th>
                            </tr>
                          </thead>
                          <tbody>
                            {invalidRows.map((row, idx) => (
                              <tr key={idx} className="invalid-row">
                                <td>{row.AccCode || '-'}</td>
                                <td>{row.AccName || '-'}</td>
                                <td>
                                  {row._errors.map((err, i) => (
                                    <span key={i} className="row-error">{err}</span>
                                  ))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {importError && (
              <div className="alert alert--error" style={{ marginTop: '20px' }}>
                {importError}
              </div>
            )}

            <div className="import-instructions">
              <h4>Instructions:</h4>
              <ul>
                <li>Download the template to ensure correct column mapping.</li>
                <li><b>AccCode:</b> Required. Must be unique.</li>
                <li><b>AccName:</b> Required.</li>
                <li><b>AccType:</b> 0 for Main, 1 for Sub.</li>
                <li><b>AccParent:</b> Parent account code (optional for root accounts).</li>
                <li><b>AccDmType:</b> 0 for Debit, 1 for Credit.</li>
                <li><b>AccFinal:</b> 0 for Balance Sheet, 1 for P&L.</li>
                <li><b>AccStopped:</b> 0 for Active, 1 for Stopped.</li>
              </ul>
            </div>
          </div>

          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => setShowImport(false)}>Cancel</button>
            <button 
              className="btn-primary" 
              onClick={submitImport}
              disabled={excelRows.length === 0 || importLoading}
            >
              {importLoading ? 'Importing...' : `Import ${excelRows.length} Accounts`}
            </button>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    setShowForm(isModalOpen);
  }, [isModalOpen]);

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

  const loadBranches = async () => {
    try {
      const response = await apiService.get('/branches');
      setBranches(Array.isArray(response.data) ? response.data : []);
    } catch (e) {
      console.error('Failed to load branches', e);
    }
  };

  useEffect(() => {
    loadAccounts();
    loadBranches();
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
    const confirmDelete = window.confirm(t('confirm_delete', 'Are you sure you want to delete this account?'));
    if (!confirmDelete) return;
    try {
      setLoading(true);
      await apiService.delete(`/accounts/${account.AccID}`);
      await loadAccounts();
    } catch (e) {
      console.error('Failed to delete account', e);
      const message =
        e?.response?.data?.message || t('failed_delete', 'Failed to delete account.');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async (account) => {
    if (!account || account.AccID == null) return;
    const confirmStop = window.confirm(
      t('confirm_stop', 'Stopping this account will prevent future postings. Continue?'),
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
        e?.response?.data?.message || t('failed_stop', 'Failed to stop account.');
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
      const finalLabel = finalValue === 0 ? t('balance_sheet', 'Balance') : t('pl', 'P&L');
      const finalClass = finalValue === 0 ? 'final-balance' : 'final-pl';
      const isSubType = Number(account.AccType ?? 0) === 1;

      // Localized labels for better UI in RTL
      const localizedType = Number(account.AccType ?? 0) === 0 ? t('main', 'Main') : t('sub', 'Sub');
      const natureKey = (account.Nature || '').toLowerCase().replace(/ /g, '_');
      const localizedNature = t(natureKey, account.Nature || '-');

      const row = (
        <tr
          key={account.AccID ?? `${account.AccCode}-${account.AccName}`}
          className={`account-row ${stopped ? 'account-row-stopped' : ''}`}
        >
          <td>
            <div
              className="account-code-cell"
              style={{ [localization?.is_rtl ? 'paddingRight' : 'paddingLeft']: `${depth * 20}px` }}
            >
              {hasChildren ? (
                <button
                  type="button"
                  className="account-toggle-btn"
                  onClick={() => toggleNode(account.AccID)}
                >
                  <span className="material-icons-outlined">
                    {isExpanded ? 'expand_more' : (localization?.is_rtl ? 'chevron_left' : 'chevron_right')}
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
          <td style={{ textAlign: localization?.is_rtl ? 'right' : 'left' }}>
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
              {localizedType}
            </span>
          </td>
          <td>
            {account.Nature ? (
              <span>
                {localizedNature}
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
              {stopped ? t('inactive', 'Inactive') : t('active', 'Active')}
            </span>
          </td>
          <td>
            <button
              type="button"
              className="icon-btn edit"
              onClick={() => {
                setShowForm(true);
                openModal(account);
              }}
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
        <Head title={`${t('coa', 'Chart of Accounts')} - ZodicERP`} />
        <div className="breadcrumb">
        <Link href={route('admin.dashboard', { country: localization?.country_code || 'sa', lang: localization?.current_locale || 'ar' })}>{t('dashboard', 'Dashboard')}</Link>
        <span>/</span>
        <span>{t('accounting', 'Accounting')}</span>
        <span>/</span>
        <span>{t('coa', 'Chart of Accounts')}</span>
      </div>
      {!showForm && (
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--primary-color)' }}>
              <span className="material-icons-outlined">account_tree</span>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">{t('total_accounts', 'Total Accounts')}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--success-color)' }}>
              <span className="material-icons-outlined">check_circle</span>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.active}</div>
              <div className="stat-label">{t('active_accounts', 'Active Accounts')}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--gray-color)' }}>
              <span className="material-icons-outlined">pause_circle</span>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.inactive}</div>
              <div className="stat-label">{t('inactive_accounts', 'Inactive Accounts')}</div>
            </div>
          </div>
        </div>
      )}
      {!showForm && (
        <div className="accounts-card fade-in">
          <div className="card-header">
            <div className="accounts-actions">
              <div className="search-bar light">
                <input
                  type="text"
                  placeholder={t('search_accounts', 'Search accounts...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button type="button">
                  <span className="material-icons-outlined">search</span>
                </button>
              </div>
            </div>
            <div className="actions">
              <div className="excel-dropdown-container" ref={excelMenuRef}>
                <button
                  type="button"
                  className="btn-excel-main"
                  onClick={() => setShowExcelMenu(!showExcelMenu)}
                >
                  <span className="material-icons-outlined">table_view</span>
                  <span>{t('excel', 'Excel Options')}</span>
                  <span className={`material-icons-outlined arrow ${showExcelMenu ? 'up' : ''}`}>expand_more</span>
                </button>
                {showExcelMenu && (
                  <div className="excel-dropdown-menu">
                    <button
                      type="button"
                      className="dropdown-item import"
                      onClick={() => {
                        setShowImport(true);
                        setShowExcelMenu(false);
                      }}
                    >
                      <span className="material-icons-outlined">upload_file</span>
                      <div className="item-content">
                        <span className="title">{t('import_excel', 'Import Excel')}</span>
                        <span className="desc">{t('instructions', 'Upload bulk accounts')}</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="dropdown-item export"
                      onClick={() => {
                        handleExportExcel();
                        setShowExcelMenu(false);
                      }}
                    >
                      <span className="material-icons-outlined">download</span>
                      <div className="item-content">
                        <span className="title">{t('export_excel', 'Export Excel')}</span>
                        <span className="desc">{t('instructions', 'Download all accounts')}</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setShowForm(true);
                  openModal();
                }}
              >
                <span className="material-icons-outlined">add</span>
                <span>{t('add_account', 'Add Account')}</span>
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={loadAccounts}
              >
                <span className="material-icons-outlined">refresh</span>
                <span>{t('refresh', 'Refresh')}</span>
              </button>
            </div>
          </div>
          {error && <div className="error-banner">{error}</div>}
          {renderImportModal()}
          <ToastContainer position="top-right" autoClose={3000} />
          <div className="table-container">
            <table className="accounts-table">
              <thead>
                <tr>
                  <th>{t('code', 'CODE')}</th>
                  <th>{t('name', 'ACCOUNT')}</th>
                  <th>{t('type', 'TYPE')}</th>
                  <th>{t('nature', 'NATURE')}</th>
                  <th>{t('final', 'FINAL')}</th>
                  <th>{t('status', 'STATUS')}</th>
                  <th>{t('actions', 'ACTIONS')}</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="text-center">
                      {t('loading', 'Loading...')}
                    </td>
                  </tr>
                )}
                {!loading && visibleTree.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center">
                      {t('no_accounts_found', 'No accounts found.')}
                    </td>
                  </tr>
                )}
                {!loading && renderRows(visibleTree)}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {showForm && (
        <div className="accounts-card account-form-card fade-in">
          <div className="card-header">
            <div className="card-title">
              {currentAccount ? t('edit_account', 'Edit Account') : t('add_account', 'Add New Account')}
            </div>
            <div className="actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setShowForm(false);
                  closeModal();
                }}
              >
                {t('back', 'Back')}
              </button>
            </div>
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
                    {t('code', 'Account Code')}
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
                    {t('name', 'Account Name')}
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
                    {t('type', 'Account Type')}
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
                    {t('parent', 'Parent Account')}
                  </label>
                  <select
                    id="acc-parent"
                    name="AccParent"
                    className="form-control"
                    value={form.AccParent}
                    onChange={(e) => handleFieldChange('AccParent', e.target.value)}
                  >
                    <option value="">{t('none', 'None')}</option>
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
                    {t('dm_type', 'Debit / Credit Nature')}
                  </label>
                  <select
                    id="acc-dmtype"
                    name="AccDmType"
                    className="form-control"
                    value={form.AccDmType}
                    onChange={(e) =>
                      handleFieldChange('AccDmType', Number(e.target.value))
                    }
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
                    {t('nature', 'Nature Account')}
                  </label>
                  <select
                    id="acc-nature"
                    name="Nature"
                    className="form-control"
                    value={form.Nature}
                    onChange={(e) => handleFieldChange('Nature', e.target.value)}
                  >
                    <option value="">{t('select_nature', 'Select Nature')}</option>
                    {NATURE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {t(opt.toLowerCase().replace(' ', '_'), opt)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="acc-final">
                    {t('final', 'Final Account Type')}
                  </label>
                  <select
                    id="acc-final"
                    name="AccFinal"
                    className="form-control"
                    value={form.AccFinal ? 1 : 0}
                    onChange={(e) =>
                      handleFieldChange('AccFinal', Number(e.target.value) === 1)
                    }
                  >
                    <option value={0}>{t('balance_sheet', 'Balance Sheet')}</option>
                    <option value={1}>{t('pl', 'P&L')}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="acc-max-limit">
                    {t('max_limit', 'Max Limit')}
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
                    {t('max_duration', 'Max Duration')}
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
                    {t('branch', 'Branch')}
                  </label>
                  <select
                    id="acc-branch"
                    name="AccBranch"
                    className="form-control"
                    value={form.AccBranch}
                    onChange={(e) => handleFieldChange('AccBranch', e.target.value)}
                  >
                    <option value="">{t('all_branches', 'Global (All Branches)')}</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.branch_name} ({b.branch_code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="acc-note">
                  {t('note', 'Notes')}
                </label>
                <textarea
                  id="acc-note"
                  name="AccNote"
                  className="form-control form-textarea"
                  value={form.AccNote}
                  onChange={(e) => handleFieldChange('AccNote', e.target.value)}
                  placeholder={t('note_placeholder', 'Enter account description or internal notes...')}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('status', 'Status')}</label>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    className="toggle-input"
                    checked={!form.AccStopped}
                    onChange={(e) =>
                      handleFieldChange(
                        'AccStopped',
                        !e.target.checked ? true : false,
                      )
                    }
                    aria-label="Toggle account status"
                  />
                  <span className="toggle-slider" />
                  <span className="toggle-label">
                    {form.AccStopped ? t('inactive', 'Inactive') : t('active', 'Active')}
                  </span>
                </label>
              </div>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setShowForm(false);
                  closeModal();
                }}
              >
                {t('cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? t('saving', 'Saving...') : (currentAccount ? t('save', 'Update Account') : t('save', 'Create Account'))}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="modal-overlay active">
          <div className="modal" style={{ maxWidth: '900px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{t('import_coa_excel', 'Import Chart of Accounts from Excel')}</h3>
              <button className="modal-close" onClick={() => setShowImport(false)}>×</button>
            </div>
            <div className="modal-body">
              {!excelRows.length && !invalidRows.length ? (
                <div 
                  className="drop-zone"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    hidden 
                    accept=".xlsx, .xls"
                    onChange={(e) => handleFileUpload(e.target.files[0])}
                  />
                  <span className="material-icons-outlined" style={{ fontSize: '48px', marginBottom: '10px' }}>cloud_upload</span>
                  <p>{t('click_to_upload', 'Click to upload or drag and drop Excel file')}</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '5px' }}>{t('supported_formats', 'Supported formats: .xlsx, .xls')}</p>
                </div>
              ) : (
                <div className="import-preview-container">
                  <div className="preview-stats">
                    <span className="stat-badge total">{t('total', 'Total')}: {importSummary.total}</span>
                    <span className="stat-badge valid">{t('valid', 'Valid')}: {importSummary.valid}</span>
                    <span className="stat-badge invalid">{t('invalid', 'Invalid')}: {importSummary.invalid}</span>
                  </div>

                  {importLoading && (
                    <div className="progress-bar">
                      <div className="progress-bar__fill"></div>
                    </div>
                  )}

                  {importError && (
                    <div className="alert alert--error">{importError}</div>
                  )}

                  <div className="table-responsive import-preview">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>{t('code', 'Code')}</th>
                          <th>{t('name', 'Name')}</th>
                          <th>{t('type', 'Type')}</th>
                          <th>{t('parent', 'Parent')}</th>
                          <th>{t('errors', 'Errors')}</th>
                          <th>{t('action', 'Action')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Valid Rows */}
                        {excelRows.map((row, idx) => (
                          <tr key={`valid-${idx}`}>
                            <td>{row.AccCode}</td>
                            <td>{row.AccName}</td>
                            <td>{row.AccType}</td>
                            <td>{row.AccParent}</td>
                            <td className="text-success">{t('ready', 'Ready')}</td>
                            <td>
                              <button className="btn-icon delete" onClick={() => removeImportRow(idx)}>
                                <span className="material-icons-outlined">delete</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                        {/* Invalid Rows */}
                        {invalidRows.map((row, idx) => (
                          <tr key={`invalid-${idx}`} className="invalid-row">
                            <td>{row.AccCode}</td>
                            <td>{row.AccName}</td>
                            <td>{row.AccType}</td>
                            <td>{row.AccParent}</td>
                            <td>
                              {row._errors.map((err, eIdx) => (
                                <span key={eIdx} className="row-error">• {err}</span>
                              ))}
                            </td>
                            <td>-</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="import-instructions" style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '10px', fontSize: '0.95rem' }}>{t('instructions_title', 'Instructions')}:</h4>
                <ul style={{ fontSize: '0.85rem', color: '#64748b', paddingLeft: '20px' }}>
                  <li>{t('instruction_template', 'Download the template to see required columns.')}</li>
                  <li><strong>AccCode</strong> {t('and', 'and')} <strong>AccName</strong> {t('are_mandatory', 'are mandatory')}.</li>
                  <li><strong>AccType</strong>: 0 {t('for_main', 'for Main')}, 1 {t('for_sub', 'for Sub')}.</li>
                  <li><strong>AccDmType</strong>: 0 {t('for_debit', 'for Debit')}, 1 {t('for_credit', 'for Credit')}.</li>
                  <li><strong>AccStopped</strong>: 0 {t('for_active', 'for Active')}, 1 {t('for_inactive', 'for Inactive')}.</li>
                </ul>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={downloadTemplate}>
                <span className="material-icons-outlined">download</span> {t('download_template', 'Download Template')}
              </button>
              <button className="btn btn-secondary" onClick={() => { setExcelRows([]); setInvalidRows([]); setImportError(null); }}>
                {t('clear', 'Clear')}
              </button>
              <button 
                className="btn btn-primary" 
                onClick={submitImport}
                disabled={excelRows.length === 0 || importLoading}
              >
                {importLoading ? t('importing', 'Importing...') : `${t('import', 'Import')} ${excelRows.length} ${t('accounts', 'Accounts')}`}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
}
