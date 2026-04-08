import React, { useEffect, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import * as XLSX from 'xlsx';
import AdminLayout from '../../components/AdminLayout';
import Pagination from '../../components/Pagination';
import { apiService } from '../../../../services/api';

const STATUS_OPTIONS = [
  { value: 'posted', label: 'مرحل فقط' },
  { value: 'unposted', label: 'غير مرحل فقط' },
  { value: 'all', label: 'الكل' },
];

const BALANCE_STATUS_OPTIONS = [
  { value: 'balanced', label: 'متوازن' },
  { value: 'unbalanced', label: 'غير متوازن' },
  { value: 'all', label: 'الكل' },
];

export default function JournalReport() {
  const { props } = usePage();
  const localization = props?.localization;
  const locale = localization?.current_locale || 'ar';
  const isAr = locale === 'ar';

  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    search: '',
    status: 'all',
    balanceStatus: 'all',
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(15);
  const [totalRecords, setTotalRecords] = useState(0);

  const getQueryFilters = () => {
    const params = new URLSearchParams(window.location.search || '');
    const search = params.get('search') || '';
    const dateFrom = params.get('dateFrom') || '';
    const dateTo = params.get('dateTo') || '';
    const status = params.get('status') || 'all';
    const balanceStatus = params.get('balanceStatus') || 'all';
    const page = parseInt(params.get('page') || '1', 10);
    return { search, dateFrom, dateTo, status, balanceStatus, page };
  };

  const loadJournals = async (overrideFilters, pageNum = 1) => {
    const f = overrideFilters ?? filters;
    setLoading(true);
    setError('');

    try {
      const urlParams = new URLSearchParams();
      if (f.search) urlParams.set('search', f.search);
      if (f.dateFrom) urlParams.set('dateFrom', f.dateFrom);
      if (f.dateTo) urlParams.set('dateTo', f.dateTo);
      if (f.status) urlParams.set('status', f.status);
      if (f.balanceStatus) urlParams.set('balanceStatus', f.balanceStatus);
      if (pageNum > 1) urlParams.set('page', String(pageNum));

      const nextUrl =
        urlParams.toString() === ''
          ? window.location.pathname
          : `${window.location.pathname}?${urlParams.toString()}`;
      window.history.replaceState(null, '', nextUrl);

      const response = await apiService.get('/journals', {
        search: f.search || undefined,
        date_from: f.dateFrom || undefined,
        date_to: f.dateTo || undefined,
        status: f.status === 'all' ? undefined : f.status,
        balance_status: f.balanceStatus === 'all' ? undefined : f.balanceStatus,
        page: pageNum,
        per_page: perPage,
        with_lines: true,
      });

      const data = response.data;
      if (Array.isArray(data.data)) {
        setJournals(data.data);
        setCurrentPage(data.current_page);
        setTotalRecords(data.total);
      } else if (Array.isArray(data)) {
        setJournals(data);
        setTotalRecords(data.length);
      }
    } catch (e) {
      const message = e?.response?.data?.message || (isAr ? 'فشل تحميل تقرير اليومية.' : 'Failed to load journal report.');
      setError(message);
      setJournals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const q = getQueryFilters();
    setFilters((prev) => ({
      ...prev,
      search: q.search,
      dateFrom: q.dateFrom,
      dateTo: q.dateTo,
      status: q.status,
    }));
    setCurrentPage(q.page);
    loadJournals(q, q.page);
  }, []);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    loadJournals(filters, newPage);
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    loadJournals(filters, 1);
  };

  const handleJournalClick = (code) => {
    if (!code) return;
    router.get(route('admin.journal-entries', {
      country: localization?.country_code || 'sa',
      lang: localization?.current_locale || 'ar',
      code: code,
      mode: 'view'
    }));
  };

  const handleExportExcel = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await apiService.get('/journals', {
        search: filters.search || undefined,
        date_from: filters.dateFrom || undefined,
        date_to: filters.dateTo || undefined,
        status: filters.status === 'all' ? undefined : filters.status,
        all: true,
        with_lines: true,
      });

      const allData = response.data || [];
      const rows = [];

      allData.forEach((entry) => {
        const isBalanced = Math.abs((Number(entry.total_debit) || 0) - (Number(entry.total_credit) || 0)) < 0.001;
        const balanceStatusText = isAr ? (isBalanced ? 'متوازن' : 'غير متوازن') : (isBalanced ? 'Balanced' : 'Unbalanced');
        const statusText = isAr && entry.status === 'Post' ? 'مرحل' : isAr && entry.status === 'UnPost' ? 'غير مرحل' : entry.status;

        const lines = entry.lines || [];
        if (lines.length === 0) {
          rows.push({
            [isAr ? 'التاريخ' : 'Date']: entry.date,
            [isAr ? 'رمز القيد' : 'Entry Code']: entry.entry_code,
            [isAr ? 'الوصف' : 'Description']: entry.description,
            [isAr ? 'المرجع' : 'Reference']: entry.reference || '',
            [isAr ? 'النوع' : 'Type']: entry.entry_type,
            [isAr ? 'التوازن' : 'Balance']: balanceStatusText,
            [isAr ? 'الحالة' : 'Status']: statusText,
            [isAr ? 'الحساب' : 'Account']: '',
            [isAr ? 'مدين' : 'Debit']: 0,
            [isAr ? 'دائن' : 'Credit']: 0,
          });
        } else {
          lines.forEach((line, index) => {
            rows.push({
              [isAr ? 'التاريخ' : 'Date']: index === 0 ? entry.date : '',
              [isAr ? 'رمز القيد' : 'Entry Code']: index === 0 ? entry.entry_code : '',
              [isAr ? 'الوصف' : 'Description']: index === 0 ? entry.description : line.description || '',
              [isAr ? 'المرجع' : 'Reference']: index === 0 ? (entry.reference || '') : '',
              [isAr ? 'النوع' : 'Type']: index === 0 ? entry.entry_type : '',
              [isAr ? 'التوازن' : 'Balance']: index === 0 ? balanceStatusText : '',
              [isAr ? 'الحالة' : 'Status']: index === 0 ? statusText : '',
              [isAr ? 'الحساب' : 'Account']: line.account_name || line.account_id,
              [isAr ? 'مدين' : 'Debit']: line.debit || 0,
              [isAr ? 'دائن' : 'Credit']: line.credit || 0,
            });
          });
        }
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, isAr ? 'تقرير اليومية' : 'Journal Report');
      
      worksheet['!cols'] = [
        { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 30 },
        { wch: 10 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 30 }
      ];

      const fileName = `Journal_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error('Export failed:', err);
      setError(isAr ? 'فشل تصدير ملف Excel.' : 'Failed to export Excel.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout activeMenu="Financial Reports">
      <Head title={isAr ? 'تقرير اليومية - ZodicERP' : 'Journal Report - ZodicERP'} />
      <div className="JournalReport-page" style={{ padding: '20px', direction: isAr ? 'rtl' : 'ltr' }}>
        <div className="breadcrumb" style={{ marginBottom: '20px', fontSize: '14px', color: '#666' }}>
          <a href="#" style={{ color: '#007bff', textDecoration: 'none' }}>{isAr ? 'لوحة التحكم' : 'Dashboard'}</a>
          <span style={{ margin: '0 8px' }}>/</span>
          <a href="#" style={{ color: '#007bff', textDecoration: 'none' }}>{isAr ? 'المحاسبة' : 'Accounting'}</a>
          <span style={{ margin: '0 8px' }}>/</span>
          <a href="/sa/ar/admin/financial-reports" style={{ color: '#007bff', textDecoration: 'none' }}>{isAr ? 'التقارير المالية' : 'Financial Reports'}</a>
          <span style={{ margin: '0 8px' }}>/</span>
          <span>{isAr ? 'اليومية' : 'Journal'}</span>
        </div>

        <div className="gl-header" style={{ marginBottom: '30px' }}>
          <h1 className="gl-title" style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>{isAr ? 'تقرير اليومية' : 'Journal Report'}</h1>
          <p className="gl-subtitle" style={{ color: '#666' }}>
            {isAr ? 'قائمة بجميع قيود اليومية وخطوط المعاملات المقابلة لها.' : 'List of all journal entries and their corresponding transaction lines.'}
          </p>
        </div>

        <div className="gl-filters-card" style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
          <div className="gl-filters-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', alignItems: 'end' }}>
            <div className="gl-form-group">
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>{isAr ? 'بحث' : 'Search'}</label>
              <input
                type="text"
                className="gl-input"
                placeholder={isAr ? 'رمز القيد، المرجع...' : 'Entry code, reference...'}
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div className="gl-form-group">
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>{isAr ? 'من تاريخ' : 'Date from'}</label>
              <input
                type="date"
                className="gl-input"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div className="gl-form-group">
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>{isAr ? 'إلى تاريخ' : 'Date to'}</label>
              <input
                type="date"
                className="gl-input"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div className="gl-form-group">
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>{isAr ? 'الحالة' : 'Status'}</label>
              <select
                className="gl-input"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {isAr ? opt.label : opt.value.charAt(0).toUpperCase() + opt.value.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="gl-form-group">
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>{isAr ? 'حالة التوازن' : 'Balance Status'}</label>
              <select
                className="gl-input"
                value={filters.balanceStatus}
                onChange={(e) => handleFilterChange('balanceStatus', e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                {BALANCE_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {isAr ? opt.label : opt.value.charAt(0).toUpperCase() + opt.value.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="gl-form-actions" style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleApplyFilters}
                disabled={loading}
                style={{ padding: '8px 16px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <span className="material-icons-outlined" style={{ fontSize: '18px' }}>filter_alt</span>
                {isAr ? 'تطبيق' : 'Apply'}
              </button>
              <button
                type="button"
                className="btn btn-excel"
                onClick={handleExportExcel}
                disabled={loading || journals.length === 0}
                style={{ padding: '8px 16px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <span className="material-icons-outlined" style={{ fontSize: '18px' }}>description</span>
                {isAr ? 'تصدير' : 'Export'}
              </button>
            </div>
          </div>
        </div>

        {error && <div className="error-banner" style={{ padding: '12px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '20px' }}>{error}</div>}

        <div className="gl-table-card" style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <table className="gl-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8f9fa' }}>
              <tr>
                <th style={{ padding: '12px', textAlign: isAr ? 'right' : 'left', borderBottom: '2px solid #dee2e6' }}>{isAr ? 'التاريخ / الرمز' : 'Date / Code'}</th>
                <th style={{ padding: '12px', textAlign: isAr ? 'right' : 'left', borderBottom: '2px solid #dee2e6' }}>{isAr ? 'الوصف' : 'Description'}</th>
                <th style={{ padding: '12px', textAlign: isAr ? 'right' : 'left', borderBottom: '2px solid #dee2e6' }}>{isAr ? 'الحساب' : 'Account'}</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>{isAr ? 'مدين' : 'Debit'}</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>{isAr ? 'دائن' : 'Credit'}</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>{isAr ? 'التوازن' : 'Balance'}</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>{isAr ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} style={{ padding: '20px', textAlign: 'center' }}>{isAr ? 'جاري التحميل...' : 'Loading...'}</td>
                </tr>
              )}
              {!loading && journals.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '20px', textAlign: 'center' }}>{isAr ? 'لم يتم العثور على قيود يومية.' : 'No journal entries found.'}</td>
                </tr>
              )}
              {!loading && journals.map((entry) => {
                const isBalanced = Math.abs((Number(entry.total_debit) || 0) - (Number(entry.total_credit) || 0)) < 0.001;
                return (
                  <React.Fragment key={entry.entry_code}>
                    <tr style={{ backgroundColor: '#f1f3f5', fontWeight: 'bold' }}>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #dee2e6', textAlign: isAr ? 'right' : 'left' }}>
                        <div style={{ fontSize: '12px', color: '#666' }}>{entry.date}</div>
                        <button
                          type="button"
                          onClick={() => handleJournalClick(entry.entry_code)}
                          style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', padding: 0, fontWeight: 'bold', fontSize: '14px' }}
                        >
                          {entry.entry_code}
                        </button>
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #dee2e6', textAlign: isAr ? 'right' : 'left' }}>
                        <div>{entry.description}</div>
                        <div style={{ fontSize: '11px', color: '#888' }}>{isAr ? 'مرجع' : 'Ref'}: {entry.reference || '-'} | {isAr ? 'نوع' : 'Type'}: {entry.entry_type}</div>
                      </td>
                      <td colSpan={3} style={{ borderBottom: '1px solid #dee2e6' }}></td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', backgroundColor: isBalanced ? '#d4edda' : '#f8d7da', color: isBalanced ? '#155724' : '#721c24' }}>
                          {isAr ? (isBalanced ? 'متوازن' : 'غير متوازن') : (isBalanced ? 'Balanced' : 'Unbalanced')}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', backgroundColor: entry.status === 'Post' ? '#d4edda' : '#fff3cd', color: entry.status === 'Post' ? '#155724' : '#856404' }}>
                          {isAr && entry.status === 'Post' ? 'مرحل' : isAr && entry.status === 'UnPost' ? 'غير مرحل' : entry.status}
                        </span>
                      </td>
                    </tr>
                    {entry.lines && entry.lines.map((line, idx) => (
                      <tr key={`${entry.entry_code}-line-${idx}`}>
                        <td style={{ borderBottom: '1px solid #eee' }}></td>
                        <td style={{ padding: '8px 12px', fontSize: '13px', color: '#555', borderBottom: '1px solid #eee', textAlign: isAr ? 'right' : 'left' }}>
                          {line.description}
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: '13px', borderBottom: '1px solid #eee', textAlign: isAr ? 'right' : 'left' }}>
                          {line.account_name || (isAr ? `معرف الحساب: ${line.account_id}` : `Account ID: ${line.account_id}`)}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: '13px', borderBottom: '1px solid #eee' }}>
                          {line.debit > 0 ? Number(line.debit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: '13px', borderBottom: '1px solid #eee' }}>
                          {line.credit > 0 ? Number(line.credit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                        </td>
                        <td colSpan={2} style={{ borderBottom: '1px solid #eee' }}></td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {totalRecords > perPage && (
            <div style={{ padding: '20px', borderTop: '1px solid #dee2e6' }}>
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(totalRecords / perPage)}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
