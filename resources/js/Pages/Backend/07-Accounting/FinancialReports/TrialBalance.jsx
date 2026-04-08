import React, { useEffect, useState, useCallback } from 'react';
import { Head, Link } from '@inertiajs/react';
import * as XLSX from 'xlsx';
import AdminLayout from '../../components/AdminLayout';
import { apiService } from '../../../../services/api';

export default function TrialBalance() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [lang, setLang] = useState('en');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/reports/trial-balance');
      setData(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch trial balance:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key.toLowerCase() === 'a') {
        setLang(prev => prev === 'ar' ? 'en' : 'ar');
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const formatNumber = (num) => {
    if (num === 0) return '-';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const translateAccountName = (code, name) => {
    if (lang === 'ar') return name;
    
    const translations = {
      '1': 'Assets',
      '2': 'Liabilities',
      '3': 'Equity',
      '4': 'Income',
      '5': 'Cost of Goods Sold',
      '6': 'Expenses'
    };
    
    return translations[code] || name;
  };

  const t = {
    ar: {
      title: 'ميزان المراجعة',
      accountName: 'اسم الحساب',
      beginning: 'رصيد أول المدة',
      current: 'الحركة',
      balance: 'الرصيد النهائي',
      debit: 'مدين',
      credit: 'دائن',
      total: 'الإجمالي',
      loading: 'جاري التحميل...',
      noData: 'لا توجد بيانات متاحة',
      subtitle: "اضغط على حرف 'a' للتحويل للغة الإنجليزية",
      exportExcel: 'تصدير إكسل'
    },
    en: {
      title: 'Trial Balance',
      accountName: 'ACCOUNT NAME',
      beginning: 'Beginning Balances',
      current: 'CURRENT',
      balance: 'BALANCE (Ending Balance)',
      debit: 'Debit',
      credit: 'Credit',
      total: 'Total',
      loading: 'Loading...',
      noData: 'No data available',
      subtitle: "Press 'a' to toggle language",
      exportExcel: 'Export Excel'
    }
  };

  const currentLang = t[lang];

  const handleAccountClick = (row) => {
    if (row.AccType !== 1) return;
    
    // Construct path to general ledger based on current location
    const currentPath = window.location.pathname;
    const glPath = currentPath.replace('trial-balance', 'general-ledger');
    
    // Open in a new tab with the accountId as a query parameter
    const fullUrl = `${glPath}?accountId=${row.AccID}`;
    window.open(fullUrl, '_blank');
  };

  const handleExportExcel = () => {
    if (data.length === 0) return;

    const workbook = XLSX.utils.book_new();
    
    // Prepare headers
    const headers = [
      [currentLang.title],
      [''],
      [
        currentLang.accountName, 
        currentLang.beginning + ' (' + currentLang.debit + ')',
        currentLang.beginning + ' (' + currentLang.credit + ')',
        currentLang.current + ' (' + currentLang.debit + ')',
        currentLang.current + ' (' + currentLang.credit + ')',
        currentLang.balance + ' (' + currentLang.debit + ')',
        currentLang.balance + ' (' + currentLang.credit + ')'
      ]
    ];

    // Prepare rows
    const rows = data.map(row => {
      const indentation = '  '.repeat(row.depth);
      const name = (row.AccType === 0 ? (lang === 'ar' ? 'إجمالي ' : 'Total ') : '') + 
                   row.AccCode + ' - ' + translateAccountName(row.AccCode, row.AccName);
      
      return [
        indentation + name,
        row.beginning_debit || 0,
        row.beginning_credit || 0,
        row.current_debit || 0,
        row.current_credit || 0,
        row.ending_debit || 0,
        row.ending_credit || 0
      ];
    });

    // Add Grand Total row
    rows.push([
      lang === 'ar' ? 'الإجمالي النهائي' : 'GRAND TOTAL',
      grandTotals.beginning_debit || 0,
      grandTotals.beginning_credit || 0,
      grandTotals.current_debit || 0,
      grandTotals.current_credit || 0,
      grandTotals.ending_debit || 0,
      grandTotals.ending_credit || 0
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([...headers, ...rows]);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 50 }, // Account Name
      { wch: 15 }, // Beg Debit
      { wch: 15 }, // Beg Credit
      { wch: 15 }, // Curr Debit
      { wch: 15 }, // Curr Credit
      { wch: 15 }, // End Debit
      { wch: 15 }  // End Credit
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Trial Balance');
    XLSX.writeFile(workbook, `Trial_Balance_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const grandTotals = data.reduce((acc, row) => {
    // Only sum top-level accounts to get the grand total (to avoid double counting)
    if (row.depth === 0) {
      acc.beginning_debit += row.beginning_debit || 0;
      acc.beginning_credit += row.beginning_credit || 0;
      acc.current_debit += row.current_debit || 0;
      acc.current_credit += row.current_credit || 0;
      acc.ending_debit += row.ending_debit || 0;
      acc.ending_credit += row.ending_credit || 0;
    }
    return acc;
  }, {
    beginning_debit: 0,
    beginning_credit: 0,
    current_debit: 0,
    current_credit: 0,
    ending_debit: 0,
    ending_credit: 0
  });

  return (
    <AdminLayout activeMenu="Financial Reports">
      <div className={`financial-reports-page trial-balance-page ${lang === 'ar' ? 'rtl' : 'ltr'}`}>
        <Head title={`${currentLang.title} - ZodicERP`} />

        <div className="report-header">
          <div className="report-header__title-section">
            <h1>{currentLang.title}</h1>
            <p className="subtitle">{currentLang.subtitle}</p>
          </div>
          <div className="report-header__actions">
             <button 
                 className="btn btn-outline" 
                 onClick={handleExportExcel} 
                 disabled={loading || data.length === 0}
                 style={{ 
                   marginRight: '12px', 
                   borderColor: '#4caf50', 
                   color: '#4caf50', 
                   display: 'flex', 
                   alignItems: 'center', 
                   gap: '8px',
                   opacity: (loading || data.length === 0) ? 0.6 : 1,
                   cursor: (loading || data.length === 0) ? 'not-allowed' : 'pointer'
                 }}
              >
                <i className="material-icons-outlined">file_download</i>
                <span>{currentLang.exportExcel}</span>
             </button>
             <button className="btn btn-primary" onClick={() => window.print()}>
                {lang === 'ar' ? 'طباعة' : 'Print'}
             </button>
          </div>
        </div>

        <div className="report-table-card">
          <div className="table-responsive">
            <table className="report-table trial-balance-table">
              <thead>
                <tr className="main-header">
                  <th rowSpan="2" className="account-col">{currentLang.accountName}</th>
                  <th colSpan="2">{currentLang.beginning}</th>
                  <th colSpan="2">{currentLang.current}</th>
                  <th colSpan="2">{currentLang.balance}</th>
                </tr>
                <tr className="sub-header">
                  <th>{currentLang.debit}</th>
                  <th>{currentLang.credit}</th>
                  <th>{currentLang.debit}</th>
                  <th>{currentLang.credit}</th>
                  <th>{currentLang.debit}</th>
                  <th>{currentLang.credit}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-10">{currentLang.loading}</td>
                  </tr>
                ) : data.length > 0 ? (
                  data.map((row) => (
                    <tr key={row.AccID} className={row.AccType === 0 ? 'row-parent' : 'row-account'}>
                      <td 
                        className={`account-cell ${row.AccType === 1 ? 'clickable-account' : ''}`} 
                        onClick={() => handleAccountClick(row)}
                        style={{ 
                          paddingInlineStart: `${row.depth * 25 + 15}px`,
                          fontWeight: row.AccType === 0 ? 'bold' : 'normal',
                          cursor: row.AccType === 1 ? 'pointer' : 'default'
                        }}
                      >
                        {row.AccType === 0 && <span className="total-label">{lang === 'ar' ? 'إجمالي ' : 'Total '}</span>}
                        {row.AccCode} - {translateAccountName(row.AccCode, row.AccName)}
                      </td>
                      <td className="text-right amount-cell">{formatNumber(row.beginning_debit)}</td>
                      <td className="text-right amount-cell">{formatNumber(row.beginning_credit)}</td>
                      <td className="text-right amount-cell">{formatNumber(row.current_debit)}</td>
                      <td className="text-right amount-cell">{formatNumber(row.current_credit)}</td>
                      <td className="text-right amount-cell font-bold">{formatNumber(row.ending_debit)}</td>
                      <td className="text-right amount-cell font-bold">{formatNumber(row.ending_credit)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-10">{currentLang.noData}</td>
                  </tr>
                )}
              </tbody>
              {data.length > 0 && !loading && (
                <tfoot>
                  <tr className="grand-total-row">
                    <td className="account-cell font-bold text-center">
                      {lang === 'ar' ? 'الإجمالي النهائي' : 'GRAND TOTAL'}
                    </td>
                    <td className="text-right amount-cell font-bold">{formatNumber(grandTotals.beginning_debit)}</td>
                    <td className="text-right amount-cell font-bold">{formatNumber(grandTotals.beginning_credit)}</td>
                    <td className="text-right amount-cell font-bold">{formatNumber(grandTotals.current_debit)}</td>
                    <td className="text-right amount-cell font-bold">{formatNumber(grandTotals.current_credit)}</td>
                    <td className="text-right amount-cell font-bold">{formatNumber(grandTotals.ending_debit)}</td>
                    <td className="text-right amount-cell font-bold">{formatNumber(grandTotals.ending_credit)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      <style jsx>{`
        .trial-balance-page.rtl { direction: rtl; text-align: right; }
        .trial-balance-page.ltr { direction: ltr; text-align: left; }
        
        .report-table-card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          overflow: hidden;
          border: 1px solid #e2e8f0;
        }

        .table-responsive {
          overflow-x: auto;
        }
        
        .trial-balance-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        
        .trial-balance-table th, 
        .trial-balance-table td {
          border: 1px solid #e2e8f0;
          padding: 10px 15px;
        }
        
        .trial-balance-table thead th {
          background-color: #f8fafc;
          font-weight: 600;
          text-align: center;
          color: #475569;
        }
        
        .main-header th {
          background-color: #f1f5f9;
          color: #1e293b;
          font-size: 14px;
        }
        
        .sub-header th {
          font-size: 11px;
          text-transform: uppercase;
          background-color: #f8fafc;
        }
        
        .row-parent {
          background-color: #f8fafc;
        }

        .grand-total-row {
          background-color: #f1f5f9;
          color: #0f172a;
        }

        .grand-total-row td {
          border-top: 2px solid #94a3b8;
        }
        
        .row-account:hover {
          background-color: #f1f5f9;
        }

        .account-col {
          min-width: 300px;
          text-align: inherit !important;
        }

        .account-cell {
          text-align: inherit;
        }
        
        .clickable-account:hover {
          color: #2196F3;
          text-decoration: underline;
        }
        
        .amount-cell {
          width: 120px;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }

        .total-label {
          color: #64748b;
          font-size: 0.9em;
        }
        
        .text-right { text-align: right !important; }
        .text-center { text-align: center !important; }
        .font-bold { font-weight: 700; }
        .py-10 { padding-top: 2.5rem; padding-bottom: 2.5rem; }

        @media print {
          .report-header__actions, .subtitle { display: none; }
          .financial-reports-page { padding: 0; }
          .report-table-card { border: none; box-shadow: none; }
          .trial-balance-table th { background-color: #eee !important; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </AdminLayout>
  );
}
