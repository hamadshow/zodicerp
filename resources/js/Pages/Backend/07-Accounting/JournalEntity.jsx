import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Head, usePage } from '@inertiajs/react';
import * as XLSX from 'xlsx';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/main.scss';
import SearchableComboBox from '../components/SearchableComboBox';
import { apiService } from '../../../services/api';

export default function JournalEntity() {
  const { props } = usePage();
  const [mode, setMode] = useState('list');
  const [selectedCode, setSelectedCode] = useState(null);
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ column: '', direction: '' });
  const readOnly = mode === 'view';

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
    if (props.flash?.error) {
      toast.error(props.flash.error);
    }
  }, [props.flash]);

  const downloadTemplate = () => {
    const headers = [
      'entry_code', 'date', 'reference', 'header_description', 'status', 'entry_type',
      'account_id', 'debit', 'credit', 'line_description', 'related_id_name'
    ];
    const sample = [
      'QID-10001', '2024-03-30', 'REF-001', 'Header Description', 'UnPost', 'Manual',
      '1', '100', '0', 'Line 1 Description', 'Supplier-01'
    ];
    const sample2 = [
      'QID-10001', '2024-03-30', 'REF-001', 'Header Description', 'UnPost', 'Manual',
      '2', '0', '100', 'Line 2 Description', ''
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, sample, sample2]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Journal Template");
    XLSX.writeFile(wb, "journal_entries_template.xlsx");
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

    const headers = rows[0].map(h => String(h).trim().toLowerCase());
    const dataRows = rows.slice(1);
    const valid = [];
    const invalid = [];

    // Column mapping
    const map = {
      'entry_code': headers.indexOf('entry_code'),
      'date': headers.indexOf('date'),
      'reference': headers.indexOf('reference'),
      'header_description': headers.indexOf('header_description'),
      'status': headers.indexOf('status'),
      'entry_type': headers.indexOf('entry_type'),
      'account_id': headers.indexOf('account_id'),
      'debit': headers.indexOf('debit'),
      'credit': headers.indexOf('credit'),
      'line_description': headers.indexOf('line_description'),
      'related_id_name': headers.indexOf('related_id_name'),
    };

    dataRows.forEach((row) => {
      const getVal = (key) => {
        const colIdx = map[key];
        return colIdx !== -1 && row[colIdx] !== undefined ? String(row[colIdx]).trim() : '';
      };

      const item = {
        entry_code: getVal('entry_code'),
        date: getVal('date'),
        reference: getVal('reference'),
        header_description: getVal('header_description'),
        status: getVal('status'),
        entry_type: getVal('entry_type'),
        account_id: getVal('account_id'),
        debit: getVal('debit'),
        credit: getVal('credit'),
        line_description: getVal('line_description'),
        related_id_name: getVal('related_id_name'),
        _errors: []
      };

      // Client-side Validation
      if (!item.entry_code) item._errors.push('Entry Code is required');
      if (!item.account_id) item._errors.push('Account ID is required');
      
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

    // Group rows by entry_code to ensure full journal entries are sent together
    const grouped = {};
    excelRows.forEach(row => {
      const code = row.entry_code || 'manual';
      if (!grouped[code]) grouped[code] = [];
      grouped[code].push(row);
    });

    const journalEntries = Object.values(grouped);
    const batchSize = 20; // Fewer entries per batch since each has multiple lines
    const batches = [];
    
    for (let i = 0; i < journalEntries.length; i += batchSize) {
      // Flatten the batch of journal entries back into a single array of rows
      const batchRows = journalEntries.slice(i, i + batchSize).flat();
      batches.push(batchRows);
    }

    try {
      for (let i = 0; i < batches.length; i++) {
        const response = await apiService.post('/journals/bulk-import', {
          rows: batches[i],
        });
        
        if (response.data && response.data.success) {
          const progress = Math.min(Math.round(((i + 1) / batches.length) * 100), 100);
          setImportProgress(progress);
        } else {
          throw new Error(response.data?.message || 'Import failed in one of the batches');
        }
      }
      
      setShowImport(false);
      setExcelRows([]);
      setInvalidRows([]);
      setImportSummary({});
      setImportProgress(0);
      loadJournals();
      toast.success('Data imported successfully');
    } catch (err) {
      setImportError(err.message || 'Failed to import. Some rows may not have been processed.');
      console.error(err);
    } finally {
      setImportLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/journals', {
        with_lines: true,
        search,
        sort_column: sort.column || undefined,
        sort_direction: sort.direction || undefined,
      });
      const journalsWithLines = Array.isArray(response.data) ? response.data : [];
      
      const dataToExport = [];
      journalsWithLines.forEach(journal => {
        if (journal.lines && journal.lines.length > 0) {
          journal.lines.forEach(line => {
            dataToExport.push({
              'entry_code': journal.entry_code,
              'date': journal.date ? String(journal.date).split('T')[0] : '',
              'reference': journal.reference || '',
              'header_description': journal.description || '',
              'status': journal.status,
              'entry_type': journal.entry_type || 'Manual',
              'account_id': line.account_id,
              'debit': line.debit,
              'credit': line.credit,
              'line_description': line.description || '',
              'related_id_name': line.related_id_name || ''
            });
          });
        } else {
          // Export at least the header if no lines (though shouldn't happen)
          dataToExport.push({
            'entry_code': journal.entry_code,
            'date': journal.date ? String(journal.date).split('T')[0] : '',
            'reference': journal.reference || '',
            'header_description': journal.description || '',
            'status': journal.status,
            'entry_type': journal.entry_type || 'Manual',
            'account_id': '',
            'debit': 0,
            'credit': 0,
            'line_description': '',
            'related_id_name': ''
          });
        }
      });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Journal Entries");

      const wscols = [
        { wch: 15 }, // entry_code
        { wch: 15 }, // date
        { wch: 15 }, // reference
        { wch: 30 }, // header_description
        { wch: 10 }, // status
        { wch: 10 }, // entry_type
        { wch: 15 }, // account_id
        { wch: 10 }, // debit
        { wch: 10 }, // credit
        { wch: 30 }, // line_description
        { wch: 20 }  // related_id_name
      ];
      worksheet['!cols'] = wscols;

      XLSX.writeFile(workbook, `JournalEntries_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('تم تصدير البيانات بنجاح');
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('فشل عملية التصدير');
    } finally {
      setLoading(false);
    }
  };

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

  const renderImportModal = () => {
    if (!showImport) return null;

    return (
      <div className="modal-overlay active" onClick={() => !importLoading && setShowImport(false)}>
        <div className="modal import-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">Import Journal Entries from Excel</h3>
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
                <i className="material-icons-outlined" style={{ fontSize: '48px', color: '#3b82f6' }}>cloud_upload</i>
                <p>Click to upload or drag and drop</p>
                <span>Excel files only (.xlsx, .xls)</span>
                <button className="btn btn-outline" onClick={(e) => { e.stopPropagation(); downloadTemplate(); }} style={{ marginTop: '10px' }}>
                  Download Template
                </button>
              </div>
            ) : (
              <div className="import-preview-container">
                <div className="preview-stats">
                  <span className="stat-badge total">Total: {importSummary.total}</span>
                  <span className="stat-badge valid">Valid: {importSummary.valid}</span>
                  <span className="stat-badge invalid">Invalid: {importSummary.invalid}</span>
                  <button className="btn btn-outline btn-sm" onClick={() => { setExcelRows([]); setInvalidRows([]); }}>
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
                    <div className="progress-text">Importing: {importProgress}%</div>
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
                              <th>Date</th>
                              <th>Account</th>
                              <th>Debit</th>
                              <th>Credit</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {excelRows.map((row, idx) => (
                              <tr key={idx}>
                                <td>{row.entry_code}</td>
                                <td>{row.date}</td>
                                <td>{row.account_id}</td>
                                <td>{row.debit}</td>
                                <td>{row.credit}</td>
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
                              <th>Account</th>
                              <th>Errors</th>
                            </tr>
                          </thead>
                          <tbody>
                            {invalidRows.map((row, idx) => (
                              <tr key={idx} className="invalid-row">
                                <td>{row.entry_code || '-'}</td>
                                <td>{row.account_id || '-'}</td>
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
              <div className="alert alert--error" style={{ marginTop: '20px', color: 'red' }}>
                {importError}
              </div>
            )}

            <div className="import-instructions">
              <h4>Instructions:</h4>
              <ul style={{ fontSize: '0.9rem', color: '#666' }}>
                <li>Download the template to ensure correct column mapping.</li>
                <li><b>entry_code:</b> Required. Use same code to group lines into one journal entry.</li>
                <li><b>account_id:</b> Required. Account ID or Code.</li>
                <li><b>debit/credit:</b> Numbers. Each entry must be balanced (Total Debit = Total Credit).</li>
                <li><b>date:</b> YYYY-MM-DD format.</li>
              </ul>
            </div>
          </div>

          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setShowImport(false)}>Cancel</button>
            <button 
              className="btn btn-primary" 
              onClick={submitImport}
              disabled={excelRows.length === 0 || importLoading}
            >
              {importLoading ? 'Importing...' : `Import ${excelRows.length} Rows`}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout activeMenu="Journal Entries">
      <div className="journal-page-container">
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
              <div className="excel-dropdown-container" ref={excelMenuRef}>
                <button 
                  type="button" 
                  className="btn-excel-main"
                  onClick={() => setShowExcelMenu(!showExcelMenu)}
                >
                  <i className="material-icons-outlined">file_download</i>
                  <span>Excel</span>
                  <i className={`material-icons-outlined arrow ${showExcelMenu ? 'up' : ''}`}>expand_more</i>
                </button>
                
                {showExcelMenu && (
                  <div className="excel-dropdown-menu">
                    <button type="button" className="dropdown-item import" onClick={() => { setShowImport(true); setShowExcelMenu(false); }}>
                      <i className="material-icons-outlined">upload_file</i>
                      <div className="item-content">
                        <span className="title">Import from Excel</span>
                        <span className="desc">Bulk upload journal entries</span>
                      </div>
                    </button>
                    <button type="button" className="dropdown-item export" onClick={() => { handleExportExcel(); setShowExcelMenu(false); }}>
                      <i className="material-icons-outlined">download</i>
                      <div className="item-content">
                        <span className="title">Export to Excel</span>
                        <span className="desc">Download all entries</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>

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
      {renderImportModal()}
      <ToastContainer position="bottom-right" />
      </div>
    </AdminLayout>
  );
}
