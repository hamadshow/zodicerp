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
import Pagination from '../components/Pagination';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const readOnly = mode === 'view';

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
      console.error('Post failed:', err);
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
      console.error('Unpost failed:', err);
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
        sort_column: sort.column || undefined,
        sort_direction: sort.direction || undefined,
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
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Export failed');
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
    if (val === null || val === undefined || val === '') return '';
    
    // Handle Date objects
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return '';
      const year = val.getFullYear();
      const month = String(val.getMonth() + 1).padStart(2, '0');
      const day = String(val.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // Handle Excel serial numbers (numeric)
    const serial = Number(val);
    if (!isNaN(serial) && typeof val !== 'boolean' && String(val).trim() !== '' && !String(val).includes('-') && !String(val).includes('/')) {
      if (serial > 10000 && serial < 100000) {
        // Simple conversion for Excel dates (base date is Dec 30, 1899)
        const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }

    const s = String(val).trim();
    if (s.includes('T')) return s.split('T')[0];
    
    // Handle DD/MM/YYYY or DD-MM-YYYY
    const slashParts = s.split(/[/-]/);
    if (slashParts.length === 3) {
      let [p1, p2, p3] = slashParts;
      // If first part is 4 digits, assume YYYY-MM-DD
      if (p1.length === 4) {
        return `${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`;
      }
      
      // If third part is 2 digits, fix to 4 digits (e.g., 25 -> 2025)
      if (p3.length === 2) {
        p3 = `20${p3}`;
      }

      // Otherwise assume DD/MM/YYYY or MM/DD/YYYY
      // In this ERP we prefer DD/MM/YYYY
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
        sort_column: sort.column || undefined,
        sort_direction: sort.direction || undefined,
        page,
        per_page: recordsPerPage,
      });
      
      const responseData = response.data || {};
      const journalList = Array.isArray(responseData.data) ? responseData.data : [];
      
      setJournals(journalList);
      setTotalRecords(responseData.total || 0);
      setTotalPages(responseData.last_page || 0);
      setCurrentPage(responseData.current_page || 1);
    } catch (e) {
      console.error('Failed to load journals', e);
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

  const handleSort = (field) => {
    setSort((prev) => {
      let newSort;
      if (prev.column === field) {
        if (prev.direction === 'asc') {
          newSort = { column: field, direction: 'desc' };
        } else if (prev.direction === 'desc') {
          newSort = { column: '', direction: '' };
        } else {
          newSort = { column: field, direction: 'asc' };
        }
      } else {
        newSort = { column: field, direction: 'asc' };
      }
      
      // We'll let the useEffect handle the loading
      return newSort;
    });
    setCurrentPage(1);
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
    loadJournals(currentPage, perPage);
  }, [sort]);

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
      toast.success('Journal entry deleted successfully.');
      handlePageChange(1);
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
        <div className="modal import-modal" style={{ maxWidth: '1000px' }} onClick={e => e.stopPropagation()}>
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
                  style={{ display: 'none' }}
                />
                <i className="material-icons-outlined" style={{ fontSize: '48px', color: '#3b82f6' }}>cloud_upload</i>
                <p>Click to upload or drag and drop files here</p>
                <span>Select multiple Excel files (.xlsx, .xls)</span>
                <button className="btn btn-outline" onClick={(e) => { e.stopPropagation(); downloadTemplate(); }} style={{ marginTop: '10px' }}>
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
                            <i className="material-icons-outlined" style={{ fontSize: '16px' }}>download</i>
                            Error Report
                          </button>
                          <button className="btn btn-primary btn-sm" onClick={retryFailed}>
                            <i className="material-icons-outlined" style={{ fontSize: '16px' }}>refresh</i>
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
                  <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
                    <table className="data-table queue-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ backgroundColor: '#f9fafb', position: 'sticky', top: 0, zIndex: 1 }}>
                        <tr>
                          <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Entry Code</th>
                          <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Date</th>
                          <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Account</th>
                          <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Debit</th>
                          <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Credit</th>
                          <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                          <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Error Message</th>
                          {!isProcessing && <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Action</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {displayQueue.length === 0 && completedCount > 0 && (
                          <tr>
                            <td colSpan={isProcessing ? "7" : "8"} className="text-center" style={{ padding: '20px' }}>All rows processed successfully!</td>
                          </tr>
                        )}
                        {displayQueue.map((item) => (
                          <tr key={item.id} style={{ 
                            borderBottom: '1px solid #e5e7eb',
                            backgroundColor: item.status === 'failed' ? '#fee2e2' : 'transparent' // Highlight failed in red
                          }}>
                            <td style={{ padding: '10px' }}>{item.data.entry_code}</td>
                            <td style={{ padding: '10px' }}>{formatDisplayDate(item.data.date)}</td>
                            <td style={{ padding: '10px' }}>{item.data.account_id}</td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>{Number(item.data.debit || 0).toFixed(2)}</td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>{Number(item.data.credit || 0).toFixed(2)}</td>
                            <td style={{ padding: '10px' }}>
                              <span style={{ 
                                padding: '2px 8px', 
                                borderRadius: '12px', 
                                fontSize: '0.7rem', 
                                fontWeight: '600',
                                backgroundColor: item.status === 'processing' ? '#dbeafe' : item.status === 'failed' ? '#fecaca' : '#f3f4f6',
                                color: item.status === 'processing' ? '#1e40af' : item.status === 'failed' ? '#991b1b' : '#374151'
                              }}>
                                {item.status.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: '10px', color: '#dc2626', fontSize: '0.8rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.error}>
                              {item.error}
                            </td>
                            {!isProcessing && (
                              <td style={{ padding: '10px', textAlign: 'center' }}>
                                <button 
                                  className="btn-remove" 
                                  onClick={() => removeFileFromQueue(item.id)}
                                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}
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

                <div className="import-instructions" style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: '0.8rem', color: '#475569', margin: 0 }}>
                    <strong>Note:</strong> Rows belonging to the same <em>Entry Code</em> will be processed together as one Journal Entry.
                  </p>
                </div>
              </div>
            )}

            {importError && (
              <div className="alert alert--error" style={{ marginTop: '20px', color: 'red', textAlign: 'center' }}>
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
              <div className="excel-dropdown-container">
                <button 
                  type="button" 
                  className="btn-excel-main"
                  onClick={() => setShowPostDropdown(!showPostDropdown)}
                  disabled={loading}
                  style={{ 
                    backgroundColor: '#2196F3',
                    borderColor: '#2196F3',
                    marginRight: '12px'
                  }}
                >
                  <i className="material-icons-outlined">send</i>
                  <span>Post/Unpost</span>
                  <i className={`material-icons-outlined arrow ${showPostDropdown ? 'up' : ''}`}>expand_more</i>
                </button>
                
                {showPostDropdown && (
                  <div className="excel-dropdown-menu">
                    <button type="button" className="dropdown-item" onClick={handlePostToPostings}>
                      <i className="material-icons-outlined" style={{ color: '#4caf50' }}>check_circle</i>
                      <div className="item-content">
                        <span className="title">Post All</span>
                        <span className="desc">Aggregate all entries to postings</span>
                      </div>
                    </button>
                    <button type="button" className="dropdown-item" onClick={handleUnpostFromPostings}>
                      <i className="material-icons-outlined" style={{ color: '#f44336' }}>undo</i>
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handlePageChange(1);
                  }
                }}
              />
              <button type="button" onClick={() => handlePageChange(1)}>
                <span className="material-icons-outlined">search</span>
              </button>
            </div>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => handlePageChange(1)}
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
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalRecords={totalRecords}
              recordsPerPage={perPage}
              onPageChange={handlePageChange}
              onRecordsPerPageChange={handleRecordsPerPageChange}
            />
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
