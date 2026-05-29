import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import * as XLSX from 'xlsx';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import AdminLayout from '@/Pages/Backend/components/AdminLayout';
import BlankPage from '@/Components/BlankPage';
import '../../../../css/backend/main.scss';
import SearchableComboBox from '@/Pages/Backend/components/SearchableComboBox';
import Table from '@/Pages/Backend/components/Table';
import { apiService } from '../../../services/api';

const normalizeDate = (val) => {
  if (val === null || val === undefined || val === '') return '';

  if (val instanceof Date) {
    if (Number.isNaN(val.getTime())) return '';
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const day = String(val.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const serial = Number(val);
  if (
    !Number.isNaN(serial) &&
    typeof val !== 'boolean' &&
    String(val).trim() !== '' &&
    !String(val).includes('-') &&
    !String(val).includes('/')
  ) {
    if (serial > 10000 && serial < 100000) {
      const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  const s = String(val).trim();
  if (s.includes('T')) return s.split('T')[0];

  const slashParts = s.split(/[/-]/);
  if (slashParts.length === 3) {
    let [p1, p2, p3] = slashParts;
    if (p1.length === 4) {
      return `${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`;
    }

    if (p3.length === 2) {
      p3 = `20${p3}`;
    }

    return `${p3}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}`;
  }

  return s;
};

const formatDisplayDate = (val) => {
  if (!val) return '';
  const d = normalizeDate(val);
  const parts = d.split('-');
  if (parts.length !== 3) return d;
  const [y, m, day] = parts;
  return `${day}/${m}/${y}`;
};

const emptyLine = () => ({
  account_id: '',
  debit: '',
  credit: '',
  description: '',
});

const todayIsoLocal = () => new Date().toISOString().slice(0, 10);

export default function JournalEntity() {
  const { props } = usePage();

  const [mode, setMode] = useState('list');
  const [selectedCode, setSelectedCode] = useState(null);
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const readOnly = mode === 'list' ? false : mode === 'view';

  // Table Columns Configuration
  const columns = useMemo(
    () => [
      { header: 'Journal Code', key: 'entry_code', sortable: true },
      { header: 'Type', key: 'entry_type', sortable: true },
      { header: 'Details', key: 'description', sortable: true },
      {
        header: 'Date',
        key: 'date',
        sortable: true,
        render: (row) => formatDisplayDate(row.date),
      },
      {
        header: 'Total Amount',
        key: 'total_amount',
        sortable: true,
        render: (row) => Number(row.total_amount || 0).toFixed(2),
      },
      {
        header: 'Status',
        key: 'status',
        sortable: true,
        render: (row) => (
          <span
            className={`journal-status-pill ${
              row.status === 'Post' || row.status === 'Posted'
                ? 'status-posted'
                : 'status-unpost'
            }`}
          >
            {row.status}
          </span>
        ),
      },
    ],
    [],
  );

  // Import System State
  const [showImport, setShowImport] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importError, setImportError] = useState(null);
  const [showExcelMenu, setShowExcelMenu] = useState(false);
  const [processingQueue, setProcessingQueue] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const cancelRef = useRef(false);
  const fileInputRef = useRef(null);
  const excelMenuRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const urlMode = params.get('mode');
    
    if (code) {
      setSelectedCode(code);
      setMode(urlMode || 'view');
    }
  }, []);

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
      'account_id', 'debit', 'credit', 'line_description', 'related_id_name', 'cost_center_code'
    ];
    
    // Instruction Sheet
    const instructions = [
      ['Journal Entry Import Template - Instructions'],
      [''],
      ['Field', 'Required', 'Description', 'Example'],
      ['entry_code', 'Yes', 'Unique code for the journal entry. Rows with the same code are grouped into one entry.', 'QID-10001'],
      ['date', 'Yes', 'Date of the entry (YYYY-MM-DD).', '2024-03-30'],
      ['reference', 'No', 'External reference or document number.', 'REF-001'],
      ['header_description', 'No', 'Overall description for the journal entry.', 'Monthly Payroll'],
      ['status', 'No', 'Entry status: UnPost or Post (Default: UnPost).', 'UnPost'],
      ['entry_type', 'No', 'Type of entry: Manual, System, etc. (Default: Manual).', 'Manual'],
      ['account_id', 'Yes', 'Account ID, Code, or Name.', '1001 or Cash'],
      ['debit', 'Yes', 'Debit amount (Numeric).', '1500.00'],
      ['credit', 'Yes', 'Credit amount (Numeric).', '0.00'],
      ['line_description', 'No', 'Description for the specific line.', 'Salary payment'],
      ['related_id_name', 'No', 'Related entity (Supplier/Customer name).', 'John Doe'],
      ['cost_center_code', 'No', 'Cost center identifier.', 'CC-01'],
      [''],
      ['Important Notes:'],
      ['- Total Debit must equal Total Credit for each entry_code.'],
      ['- Dates should be in YYYY-MM-DD format or Excel date format.'],
      ['- Account ID must exist in the system and not be stopped.'],
    ];

    const sample = [
      'QID-10001', '2024-03-30', 'REF-001', 'Sample Balanced Entry', 'UnPost', 'Manual',
      '1', '100', '0', 'Line 1 Description', 'Supplier-01', 'CC-01'
    ];
    const sample2 = [
      'QID-10001', '2024-03-30', 'REF-001', 'Sample Balanced Entry', 'UnPost', 'Manual',
      '2', '0', '100', 'Line 2 Description', '', 'CC-01'
    ];

    const wb = XLSX.utils.book_new();
    
    // Create Data Sheet
    const wsData = XLSX.utils.aoa_to_sheet([headers, sample, sample2]);
    XLSX.utils.book_append_sheet(wb, wsData, "Import Data");
    
    // Create Instructions Sheet
    const wsInst = XLSX.utils.aoa_to_sheet(instructions);
    XLSX.utils.book_append_sheet(wb, wsInst, "Instructions");
    
    // Column widths for data sheet
    wsData['!cols'] = headers.map(() => ({ wch: 15 }));
    wsData['!cols'][3] = { wch: 30 }; // header_description
    wsData['!cols'][9] = { wch: 30 }; // line_description

    XLSX.writeFile(wb, "Journal_Import_Template.xlsx");
  };

  const handleFileUpload = (files) => {
    if (!files || files.length === 0) return;
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        // Use cellDates: false to get raw strings/numbers from XLSX
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Use raw: true to get the exact value from the cell (string or number)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          raw: true,
          defval: '' // Provide default value for empty cells
        });

        const newRows = jsonData.map((row, index) => ({
          id: Math.random().toString(36).substr(2, 9),
          fileName: file.name,
          rowIndex: index + 2, // Excel row index
          status: 'pending',
          error: null,
          data: {
            entry_code: row.entry_code || '',
            date: row.date || '',
            reference: row.reference || '',
            header_description: row.header_description || '',
            status: row.status || 'UnPost',
            entry_type: row.entry_type || 'Manual',
            account_id: row.account_id || '',
            debit: row.debit || 0,
            credit: row.credit || 0,
            line_description: row.line_description || '',
            related_id_name: row.related_id_name || '',
            cost_center_code: row.cost_center_code || ''
          }
        }));

        setProcessingQueue(prev => [...prev, ...newRows]);
      };
      reader.readAsArrayBuffer(file);
    });

    setImportError(null);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setImportError(null);
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
    );
    
    if (files.length > 0) {
      handleFileUpload(files);
    } else {
      setImportError('Please upload valid Excel files (.xlsx, .xls)');
    }
  };

  const processAndUploadRows = async (entryRows) => {
    try {
      const response = await apiService.post('/journals/bulk-import', {
        rows: entryRows.map(r => r.data)
      });
      
      if (response.data && response.data.success) {
        return { success: true };
      } else {
        throw new Error(response.data?.message || 'Import failed');
      }
    } catch (err) {
      return { 
        success: false, 
        error: err.response?.data?.message || err.message || 'Failed to import entry'
      };
    }
  };

  const startProcessing = async () => {
    if (processingQueue.length === 0 || isProcessing) return;
    
    setIsProcessing(true);
    cancelRef.current = false;

    const queue = [...processingQueue];
    const pendingRows = queue.filter(r => r.status === 'pending');
    
    // Group pending rows by entry_code
    const groups = pendingRows.reduce((acc, row) => {
      const code = row.data.entry_code || 'manual';
      if (!acc[code]) acc[code] = [];
      acc[code].push(row);
      return acc;
    }, {});

    const entryCodes = Object.keys(groups);
    let totalProcessed = 0;
    let failCount = 0;

    for (const code of entryCodes) {
      if (cancelRef.current) break;
      
      const rowsToProcess = groups[code];
      const rowIds = rowsToProcess.map(r => r.id);

      // Update status to processing for these rows
      queue.forEach(r => {
        if (rowIds.includes(r.id)) r.status = 'processing';
      });
      setProcessingQueue([...queue]);

      const result = await processAndUploadRows(rowsToProcess);

      if (cancelRef.current) break;

      if (result.success) {
        // Mark as completed
        queue.forEach(r => {
          if (rowIds.includes(r.id)) r.status = 'completed';
        });
      } else {
        // Mark as failed
        queue.forEach(r => {
          if (rowIds.includes(r.id)) {
            r.status = 'failed';
            r.error = result.error;
          }
        });
        failCount++;
      }

      totalProcessed++;
      const progress = Math.round((totalProcessed / entryCodes.length) * 100);
      setImportProgress(progress);
      setProcessingQueue([...queue]);
    }

    setIsProcessing(false);
    
    if (!cancelRef.current) {
      if (failCount === 0) {
        toast.success('All entries processed successfully');
        handlePageChange(1);
      } else {
        toast.warning(`Processing finished with ${failCount} failed entries`);
        handlePageChange(1);
      }
    }
  };

  const resetImport = () => {
    cancelRef.current = true;
    setIsProcessing(false);
    setProcessingQueue([]);
    setImportProgress(0);
    setImportError(null);
  };

  const [showPostDropdown, setShowPostDropdown] = useState(false);

  const handlePostToPostings = async () => {
    if (loading) return;
    setLoading(true);
    setShowPostDropdown(false);
    try {
      const response = await apiService.post('/reports/post-journal');
      if (response.data) {
        toast.success(response.data.message || 'Data posted successfully');
        loadJournals(currentPage, perPage); // Refresh to see updated status
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Post failed');
    } finally {
      setLoading(false);
    }
  };

  const handleUnpostFromPostings = async () => {
    if (loading) return;
    setLoading(true);
    setShowPostDropdown(false);
    try {
      const response = await apiService.post('/reports/unpost-journal');
      if (response.data) {
        toast.success(response.data.message || 'Data unposted successfully');
        loadJournals(currentPage, perPage); // Refresh to see updated status
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unpost failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setLoading(true);
      // We can add filters here in the future
      const response = await apiService.get('/journals', {
        with_lines: true,
        all: true,
        search,
      });
      const journalsWithLines = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      
      const dataToExport = [];
      journalsWithLines.forEach(journal => {
        const journalLines = journal.lines || [];
        if (journalLines.length > 0) {
          journalLines.forEach(line => {
            dataToExport.push({
              'Entry Code': journal.entry_code,
              'Date': journal.date ? String(journal.date).split('T')[0] : '',
              'Reference': journal.reference || '',
              'Header Description': journal.description || '',
              'Status': journal.status,
              'Entry Type': journal.entry_type || 'Manual',
              'Account ID': line.account_id,
              'Account Code': line.account?.AccCode || '',
              'Account Name': line.account?.AccName || '',
              'Debit': Number(line.debit || 0),
              'Credit': Number(line.credit || 0),
              'Line Description': line.description || '',
              'Related Entity': line.related_id_name || '',
              'Cost Center': line.cost_center_code || ''
            });
          });
        }
      });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Journal Entries");

      // Professional Column Widths
      const wscols = [
        { wch: 15 }, // Entry Code
        { wch: 12 }, // Date
        { wch: 15 }, // Reference
        { wch: 35 }, // Header Description
        { wch: 10 }, // Status
        { wch: 12 }, // Entry Type
        { wch: 10 }, // Account ID
        { wch: 15 }, // Account Code
        { wch: 25 }, // Account Name
        { wch: 12 }, // Debit
        { wch: 12 }, // Credit
        { wch: 35 }, // Line Description
        { wch: 20 }, // Related Entity
        { wch: 15 }  // Cost Center
      ];
      worksheet['!cols'] = wscols;

      // Add simple number formatting for Debit/Credit columns
      // Note: XLSX doesn't support complex styling in the basic version easily, 
      // but we can set the cell types to number.
      
      XLSX.writeFile(workbook, `Journal_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Data exported successfully');
    } catch {
      toast.error('Export failed');
    } finally {
      setLoading(false);
    }
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
    const normalized = normalizeDate(val);
    if (!normalized) return null;
    
    // Handle YYYY-MM-DD manually to avoid timezone shifts
    if (typeof normalized === 'string' && normalized.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [y, m, d] = normalized.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date(normalized);
  };

  const loadJournals = async (page = currentPage, recordsPerPage = perPage) => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.get('/journals', {
        search,
        page,
        per_page: recordsPerPage,
      });
      
      const responseData = response.data || {};
      const journalList = Array.isArray(responseData.data) ? responseData.data : [];
      
      setJournals(journalList);
      setTotalRecords(responseData.total || 0);
      setTotalPages(responseData.last_page || 0);
      setCurrentPage(responseData.current_page || 1);
    } catch {
      setError('Failed to load journal entries.');
      setJournals([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    loadJournals(newPage, perPage);
  };

  const handleRecordsPerPageChange = (newPerPage) => {
    setPerPage(newPerPage);
    setCurrentPage(1);
    loadJournals(1, newPerPage);
  };

  useEffect(() => {
    if (mode !== 'list') return;
    handlePageChange(1);
  }, [mode]);

  const didInitSearchRef = useRef(false);
  useEffect(() => {
    if (mode !== 'list') return;
    if (!didInitSearchRef.current) {
      didInitSearchRef.current = true;
      return;
    }
    const timeoutId = window.setTimeout(() => {
      handlePageChange(1);
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [mode, search]);

  useEffect(() => {
    loadAccounts();
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
      toast.success('Journal entry deleted successfully.');
      handlePageChange(1);
    } catch (e) {
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
      handlePageChange(1);
    } catch (e) {
      const message =
        e?.response?.data?.message || 'Failed to save journal entry.';
      setError(message);
      setLoading(false);
    }
  };

  const removeFileFromQueue = (id) => {
    if (isProcessing) return;
    setProcessingQueue(prev => prev.filter(item => item.id !== id));
  };

  const handleCloseImport = () => {
    if (isProcessing) {
      if (window.confirm('A process is running. Are you sure you want to cancel and close?')) {
        resetImport();
        setShowImport(false);
      }
    } else {
      resetImport();
      setShowImport(false);
    }
  };

  const downloadErrorReport = () => {
    const failedRows = processingQueue.filter(r => r.status === 'failed');
    if (failedRows.length === 0) {
      toast.info('No failed rows to export');
      return;
    }

    const data = failedRows.map(r => ({
      ...r.data,
      import_error: r.error
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Failed Imports");
    XLSX.writeFile(wb, `Import_Error_Report_${new Date().getTime()}.xlsx`);
  };

  const retryFailed = () => {
    setProcessingQueue(prev => prev.map(r => 
      r.status === 'failed' ? { ...r, status: 'pending', error: null } : r
    ));
    setImportProgress(0);
  };

  const renderImportModal = () => {
    if (!showImport) return null;

    const completedCount = processingQueue.filter(f => f.status === 'completed').length;
    const failedCount = processingQueue.filter(f => f.status === 'failed').length;
    const totalCount = processingQueue.length;
    
    // Requirement: Initially display all selected Row.
    // When a Row is successfully imported: Remove it immediately from the DataGridView.
    // Failed files: Keep them, move them to the bottom, highlight in red.
    const displayQueue = processingQueue
      .filter(f => f.status !== 'completed') // Remove successfully imported rows
      .sort((a, b) => {
        // Move failed rows to the bottom
        if (a.status === 'failed' && b.status !== 'failed') return 1;
        if (a.status !== 'failed' && b.status === 'failed') return -1;
        return 0;
      });

    return (
      <div className="modal-overlay active" onClick={handleCloseImport}>
        <div className="modal import-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">Excel Import System</h3>
            <button className="modal-close" onClick={handleCloseImport}>&times;</button>
          </div>

          <div className="modal-body">
            {processingQueue.length === 0 ? (
              <div 
                className="drop-zone"
                onDragOver={e => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={e => handleFileUpload(e.target.files)} 
                  accept=".xlsx, .xls"
                  multiple
                  className="import-file-input"
                />
                <i className="material-icons-outlined drop-zone-icon">cloud_upload</i>
                <p>Click to upload or drag and drop files here</p>
                <span>Select multiple Excel files (.xlsx, .xls)</span>
                <button
                  className="btn btn-outline drop-zone-template-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadTemplate();
                  }}
                >
                  Download Template
                </button>
              </div>
            ) : (
              <div className="import-system-container">
                <div className="import-status-header">
                  <div className="status-stats">
                    <div className="stat-item">
                      <span className="label">Total Rows:</span>
                      <span className="value">{totalCount}</span>
                    </div>
                    <div className="stat-item success">
                      <span className="label">Imported:</span>
                      <span className="value">{completedCount}</span>
                    </div>
                    <div className="stat-item failed">
                      <span className="label">Failed:</span>
                      <span className="value">{failedCount}</span>
                    </div>
                  </div>
                  {!isProcessing && (
                    <div className="header-actions">
                      {failedCount > 0 && (
                        <>
                          <button className="btn btn-outline btn-sm" onClick={downloadErrorReport} title="Download Excel with errors">
                            <i className="material-icons-outlined import-action-icon">download</i>
                            Error Report
                          </button>
                          <button className="btn btn-primary btn-sm" onClick={retryFailed}>
                            <i className="material-icons-outlined import-action-icon">refresh</i>
                            Retry Failed
                          </button>
                        </>
                      )}
                      <button className="btn btn-outline btn-sm" onClick={() => fileInputRef.current?.click()}>
                        Add More
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={resetImport}>
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                <div className="import-progress-section">
                  <div className="progress-bar-wrapper">
                    <div className="progress-bar">
                      <div 
                        className="progress-bar__fill" 
                        style={{ width: `${importProgress}%` }}
                      ></div>
                    </div>
                    <div className="progress-details">
                      <span>{isProcessing ? `Processing Entries...` : 'Ready to process'}</span>
                      <span>{importProgress}%</span>
                    </div>
                  </div>
                </div>

                <div className="import-queue-table-wrapper">
                  <h4>Import Data Grid</h4>
                  <div className="table-responsive import-queue-scroll">
                    <table className="data-table queue-table">
                      <thead>
                        <tr>
                          <th>Entry Code</th>
                          <th>Date</th>
                          <th>Account</th>
                          <th className="text-right">Debit</th>
                          <th className="text-right">Credit</th>
                          <th>Status</th>
                          <th>Error Message</th>
                          {!isProcessing && <th className="text-center">Action</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {displayQueue.length === 0 && completedCount > 0 && (
                          <tr>
                            <td colSpan={isProcessing ? "7" : "8"} className="text-center queue-empty">
                              All rows processed successfully!
                            </td>
                          </tr>
                        )}
                        {displayQueue.map((item) => (
                          <tr
                            key={item.id}
                            className={`queue-row ${
                              item.status === 'failed' ? 'queue-row--failed' : ''
                            }`}
                          >
                            <td>{item.data.entry_code}</td>
                            <td>{formatDisplayDate(item.data.date)}</td>
                            <td>{item.data.account_id}</td>
                            <td className="text-right">{Number(item.data.debit || 0).toFixed(2)}</td>
                            <td className="text-right">{Number(item.data.credit || 0).toFixed(2)}</td>
                            <td>
                              <span
                                className={`queue-status ${
                                  item.status === 'processing'
                                    ? 'queue-status--processing'
                                    : item.status === 'failed'
                                      ? 'queue-status--failed'
                                      : item.status === 'pending'
                                        ? 'queue-status--pending'
                                        : 'queue-status--completed'
                                }`}
                              >
                                {item.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="queue-error-cell" title={item.error || ''}>
                              {item.error}
                            </td>
                            {!isProcessing && (
                              <td className="text-center">
                                <button 
                                  className="btn-remove" 
                                  onClick={() => removeFileFromQueue(item.id)}
                                >
                                  &times;
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="import-instructions">
                  <p>
                    <strong>Note:</strong> Rows belonging to the same <em>Entry Code</em> will be processed together as one Journal Entry.
                  </p>
                </div>
              </div>
            )}

            {importError && (
              <div className="alert alert--error import-error-banner">
                {importError}
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button className="btn btn-outline" onClick={handleCloseImport}>
              {isProcessing ? 'Cancel' : 'Close'}
            </button>
            <button 
              className="btn btn-primary" 
              onClick={startProcessing}
              disabled={processingQueue.length === 0 || isProcessing || processingQueue.every(f => f.status === 'completed')}
            >
              {isProcessing ? 'Processing...' : 'Start Import'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout activeMenu="Journal Entries">
      <Head title="Journal Entries - ZodicERP" />
      <div className="journal-page-container">
        {mode === 'list' && (
          <BlankPage
            className="journal-page"
            breadcrumbs={[
              { label: 'Dashboard' },
              { label: 'Accounting' },
              { label: 'Journal Entries' },
            ]}
          >
            <div className="journal-header">
              <div className="journal-header-left">
                <h1 className="journal-title">Journal Entries</h1>
                <p className="journal-subtitle">
                  Review, create, and manage general ledger journal entries.
                </p>
              </div>
            </div>

            {error && <div className="error-banner">{error}</div>}

            <div className="journal-table-card fade-in">
              <Table
                tableData={journals}
                columns={columns}
                currentPage={currentPage}
                totalPages={totalPages}
                totalRecords={totalRecords}
                recordsPerPage={perPage}
                onPageChange={handlePageChange}
                onRecordsPerPageChange={handleRecordsPerPageChange}
                onView={(row) => {
                  setSelectedCode(row.entry_code);
                  setMode('view');
                }}
                onEdit={(row) => {
                  setSelectedCode(row.entry_code);
                  setMode('edit');
                }}
                onDelete={(row) => handleDelete(row.entry_code)}
                showToolbar={true}
                toolbarSearch={true}
                toolbarSearchPlaceholder="Search by code, type, reference..."
                toolbarSearchValue={search}
                onToolbarSearch={setSearch}
                showRefreshButton={true}
                onRefresh={() => handlePageChange(1)}
                toolbarActions={
                  <div className="journal-toolbar-actions">
                    <div className="excel-dropdown-container">
                      <button
                        type="button"
                        className="btn-excel-main btn-post-unpost"
                        onClick={() => setShowPostDropdown(!showPostDropdown)}
                        disabled={loading}
                      >
                        <i className="material-icons-outlined">send</i>
                        <span>Post/Unpost</span>
                        <i className={`material-icons-outlined arrow ${showPostDropdown ? 'up' : ''}`}>
                          expand_more
                        </i>
                      </button>

                      {showPostDropdown && (
                        <div className="excel-dropdown-menu">
                          <button type="button" className="dropdown-item" onClick={handlePostToPostings}>
                            <i className="material-icons-outlined post-icon">check_circle</i>
                            <div className="item-content">
                              <span className="title">Post All</span>
                              <span className="desc">Aggregate all entries to postings</span>
                            </div>
                          </button>
                          <button type="button" className="dropdown-item" onClick={handleUnpostFromPostings}>
                            <i className="material-icons-outlined unpost-icon">undo</i>
                            <div className="item-content">
                              <span className="title">Unpost All</span>
                              <span className="desc">Remove from postings & reset status</span>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="excel-dropdown-container" ref={excelMenuRef}>
                      <button
                        type="button"
                        className="btn-excel-main"
                        onClick={() => setShowExcelMenu(!showExcelMenu)}
                      >
                        <i className="material-icons-outlined">file_download</i>
                        <span>Excel</span>
                        <i className={`material-icons-outlined arrow ${showExcelMenu ? 'up' : ''}`}>
                          expand_more
                        </i>
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
                            <i className="material-icons-outlined">upload_file</i>
                            <div className="item-content">
                              <span className="title">Import from Excel</span>
                              <span className="desc">Bulk upload journal entries</span>
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
                }
              />
            </div>
          </BlankPage>
        )}

        {mode !== 'list' && (
          <BlankPage
            className="journal-ce-page"
            breadcrumbs={[
              { label: 'Dashboard' },
              { label: 'Accounting' },
              { label: 'Journal Entries', onClick: () => setMode('list') },
              {
                label: readOnly
                  ? 'View Journal Entry'
                  : mode === 'edit'
                    ? 'Edit Journal Entry'
                    : 'New Journal Entry',
              },
            ]}
          >
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
          </BlankPage>
        )}

        {renderImportModal()}
        <ToastContainer position="bottom-right" />
      </div>
    </AdminLayout>
  );
}
