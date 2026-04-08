import React, { useEffect, useState, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import * as XLSX from 'xlsx';
import AdminLayout from '../../components/AdminLayout';
import { apiService } from '../../../../services/api';

export default function ProfitLossDetail() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [lang, setLang] = useState(document.documentElement.lang || 'ar');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.get(`/reports/profit-loss-detail?start_date=${startDate}&end_date=${endDate}`);
      setData(response.data.main);
    } catch (error) {
      console.error('Failed to fetch profit & loss detail:', error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

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
    if (num === 0 || num === null || num === undefined) return '0.00';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const t = {
    ar: {
      title: 'تفاصيل الأرباح والخسائر',
      period: 'الفترة من',
      to: 'إلى',
      income: 'الإيرادات',
      cogs: 'تكلفة المبيعات',
      expenses: 'المصروفات',
      totalIncome: 'إجمالي الإيرادات',
      totalCogs: 'إجمالي تكلفة المبيعات',
      totalExpenses: 'إجمالي المصروفات',
      grossProfit: 'إجمالي الربح',
      netIncome: 'صافي الدخل',
      accountName: 'اسم الحساب',
      balance: 'الرصيد',
      loading: 'جاري التحميل...',
      exportExcel: 'تصدير إكسل',
      print: 'طباعة',
      subtitle: "اضغط على حرف 'a' للتحويل للغة الإنجليزية",
      companyName: 'شركة زد إي آر بي (ZodicERP)',
      noData: 'لا توجد بيانات متاحة لهذه الفترة',
    },
    en: {
      title: 'Profit & Loss Detail',
      period: 'Period From',
      to: 'To',
      income: 'Income',
      cogs: 'Cost of Goods Sold',
      expenses: 'Expenses',
      totalIncome: 'Total Income',
      totalCogs: 'Total Cost of Goods Sold',
      totalExpenses: 'Total Expenses',
      grossProfit: 'Gross Profit',
      netIncome: 'Net Income',
      accountName: 'Account Name',
      balance: 'Balance',
      loading: 'Loading...',
      exportExcel: 'Export Excel',
      print: 'Print',
      subtitle: "Press 'a' to toggle language",
      companyName: 'ZodicERP Company',
      noData: 'No data available for this period',
    }
  };

  const currentLang = t[lang];
  const isAr = lang === 'ar';

  const renderAccountRows = (nodes, depth = 0) => {
    return nodes.map((node) => (
      <React.Fragment key={node.AccCode}>
        <tr className={`row-depth-${depth} ${node.AccType === 0 ? 'font-bold bg-gray-50/50' : ''} hover:bg-gray-50 transition-colors`}>
          <td className="account-cell py-2" style={{ 
            paddingLeft: isAr ? '12px' : `${depth * 20 + 12}px`, 
            paddingRight: isAr ? `${depth * 20 + 12}px` : '12px' 
          }}>
            <div className="flex items-center">
              <span className={`acc-code text-[10px] font-mono px-1.5 py-0.5 rounded ${
                node.AccType === 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'
              } ${isAr ? 'ml-2' : 'mr-2'}`}>
                {node.AccCode}
              </span>
              <span className={`acc-name text-sm ${node.AccType === 0 ? 'text-gray-900 font-bold' : 'text-gray-600'}`}>
                {node.AccName}
              </span>
            </div>
          </td>
          <td className={`text-right balance-cell font-mono text-sm py-2 px-4 ${
            node.balance < 0 ? 'text-red-600' : node.balance > 0 ? 'text-gray-900' : 'text-gray-300'
          }`}>
            {node.balance !== 0 ? formatNumber(node.balance) : '-'}
          </td>
        </tr>
        {node.children && node.children.length > 0 && renderAccountRows(node.children, depth + 1)}
      </React.Fragment>
    ));
  };

  const handleExportExcel = () => {
    if (!data) return;

    const workbook = XLSX.utils.book_new();
    const rows = [];
    
    rows.push([currentLang.companyName]);
    rows.push([currentLang.title]);
    rows.push([`${currentLang.period}: ${startDate} ${currentLang.to}: ${endDate}`]);
    rows.push([]);
    
    const flatten = (nodes, depth = 0) => {
      nodes.forEach(n => {
        const indent = '    '.repeat(depth);
        rows.push([indent + n.AccCode + ' - ' + n.AccName, n.balance]);
        if (n.children && n.children.length > 0) {
          flatten(n.children, depth + 1);
        }
      });
    };

    // Income
    rows.push([currentLang.income.toUpperCase()]);
    flatten(data.income);
    rows.push([currentLang.totalIncome, data.total_income]);
    rows.push([]);

    // COGS
    rows.push([currentLang.cogs.toUpperCase()]);
    flatten(data.cogs);
    rows.push([currentLang.totalCogs, data.total_cogs]);
    rows.push([]);

    // Gross Profit
    rows.push([currentLang.grossProfit.toUpperCase(), data.gross_profit]);
    rows.push([]);

    // Expenses
    rows.push([currentLang.expenses.toUpperCase()]);
    flatten(data.expenses);
    rows.push([currentLang.totalExpenses, data.total_expenses]);
    rows.push([]);

    // Net Income
    rows.push([currentLang.netIncome.toUpperCase(), data.net_income]);

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet['!cols'] = [{ wch: 60 }, { wch: 20 }];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Profit & Loss Detail');
    XLSX.writeFile(workbook, `Profit_Loss_Detail_${startDate}_to_${endDate}.xlsx`);
  };

  return (
    <AdminLayout activeMenu="Financial Reports">
      <div className={`financial-reports-page profit-loss-page ${isAr ? 'rtl' : 'ltr'}`}>
        <Head title={`${currentLang.title} - ZodicERP`} />

        <div className="report-header no-print">
          <div className="report-header__left">
            <h1 className="text-2xl font-bold text-gray-800">{currentLang.title}</h1>
            <p className="text-sm text-gray-500 mt-1">{currentLang.subtitle}</p>
          </div>
          <div className="report-header__right">
            <div className="date-picker-group">
              <label className="text-sm font-medium text-gray-700">{currentLang.period}</label>
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="form-input rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                <span className="text-gray-500">{currentLang.to}</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="form-input rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>
            <div className="button-group ml-4">
              <button onClick={handleExportExcel} className="btn-secondary">
                <span className="material-icons-outlined text-base mr-1">file_download</span>
                {currentLang.exportExcel}
              </button>
              <button onClick={() => window.print()} className="btn-primary ml-2">
                <span className="material-icons-outlined text-base mr-1">print</span>
                {currentLang.print}
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <span className="ml-3 text-lg text-gray-600">{currentLang.loading}</span>
          </div>
        ) : data ? (
          <div className="report-container print-section shadow-lg bg-white rounded-lg overflow-hidden max-w-5xl mx-auto">
            <div className="report-top-banner p-8 border-b border-gray-100 text-center">
              <h2 className="text-3xl font-bold text-indigo-700 uppercase tracking-wider">{currentLang.companyName}</h2>
              <h3 className="text-xl font-semibold text-gray-700 mt-2 uppercase">{currentLang.title}</h3>
              <p className="text-gray-500 mt-1 font-medium">{currentLang.period}: {startDate} {currentLang.to}: {endDate}</p>
            </div>

            <div className="report-body p-8">
              <div className="space-y-12">
                {/* Income Section */}
                <div>
                  <h4 className="section-header-pill bg-green-50 text-green-700 px-4 py-2 rounded-full inline-block font-bold mb-4">
                    {currentLang.income}
                  </h4>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-100 text-gray-400 text-xs uppercase tracking-wider">
                        <th className="text-left py-3 font-semibold">{currentLang.accountName}</th>
                        <th className="text-right py-3 font-semibold">{currentLang.balance}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {renderAccountRows(data.income)}
                      <tr className="total-row-sub font-bold text-gray-800 bg-gray-50">
                        <td className="py-3 px-4">{currentLang.totalIncome}</td>
                        <td className="py-3 px-4 text-right text-indigo-600">{formatNumber(data.total_income)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* COGS Section */}
                <div>
                  <h4 className="section-header-pill bg-orange-50 text-orange-700 px-4 py-2 rounded-full inline-block font-bold mb-4">
                    {currentLang.cogs}
                  </h4>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-100 text-gray-400 text-xs uppercase tracking-wider">
                        <th className="text-left py-3 font-semibold">{currentLang.accountName}</th>
                        <th className="text-right py-3 font-semibold">{currentLang.balance}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {renderAccountRows(data.cogs)}
                      <tr className="total-row-sub font-bold text-gray-800 bg-gray-50">
                        <td className="py-3 px-4">{currentLang.totalCogs}</td>
                        <td className="py-3 px-4 text-right text-orange-600">{formatNumber(data.total_cogs)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Gross Profit Row */}
                <div className="bg-indigo-700 rounded-lg p-6 flex justify-between items-center text-white shadow-md">
                  <span className="text-xl font-bold uppercase tracking-wide">{currentLang.grossProfit}</span>
                  <span className="text-2xl font-mono">{formatNumber(data.gross_profit)}</span>
                </div>

                {/* Expenses Section */}
                <div>
                  <h4 className="section-header-pill bg-red-50 text-red-700 px-4 py-2 rounded-full inline-block font-bold mb-4">
                    {currentLang.expenses}
                  </h4>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-100 text-gray-400 text-xs uppercase tracking-wider">
                        <th className="text-left py-3 font-semibold">{currentLang.accountName}</th>
                        <th className="text-right py-3 font-semibold">{currentLang.balance}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {renderAccountRows(data.expenses)}
                      <tr className="total-row-sub font-bold text-gray-800 bg-gray-50">
                        <td className="py-3 px-4">{currentLang.totalExpenses}</td>
                        <td className="py-3 px-4 text-right text-red-600">{formatNumber(data.total_expenses)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Net Income Row */}
                <div className={`rounded-lg p-8 flex justify-between items-center text-white shadow-lg ${
                  data.net_income >= 0 ? 'bg-emerald-600' : 'bg-rose-600'
                }`}>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium uppercase opacity-80 mb-1">{currentLang.companyName}</span>
                    <span className="text-2xl font-bold uppercase tracking-widest">{currentLang.netIncome}</span>
                  </div>
                  <span className="text-4xl font-mono font-bold tracking-tighter">
                    {formatNumber(data.net_income)}
                  </span>
                </div>
              </div>
            </div>

            <div className="report-footer p-8 border-t border-gray-100 bg-gray-50 flex justify-between text-xs text-gray-400 font-mono">
              <span>{new Date().toLocaleString()}</span>
              <span>ZodicERP Financial Management System</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg shadow-sm border border-gray-100">
            <span className="material-icons-outlined text-4xl text-gray-300 mb-2">find_in_page</span>
            <p className="text-gray-500 font-medium">{currentLang.noData}</p>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-section { 
            box-shadow: none !important; 
            margin: 0 !important; 
            max-width: 100% !important; 
            padding: 0 !important;
          }
          body { background: white !important; }
          .report-container { border: none !important; }
        }
        .row-depth-0 { background-color: rgba(249, 250, 251, 0.5); }
        .financial-reports-page {
          padding: 2rem;
          min-height: 100vh;
          background-color: #f8fafc;
        }
        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        .report-header__right {
          display: flex;
          align-items: flex-end;
        }
        .date-picker-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .btn-primary {
          display: flex;
          align-items: center;
          padding: 0.5rem 1rem;
          background-color: #4f46e5;
          color: white;
          border-radius: 0.375rem;
          font-weight: 500;
          transition: background-color 0.2s;
        }
        .btn-primary:hover { background-color: #4338ca; }
        .btn-secondary {
          display: flex;
          align-items: center;
          padding: 0.5rem 1rem;
          background-color: white;
          color: #374151;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-weight: 500;
          transition: background-color 0.2s;
        }
        .btn-secondary:hover { background-color: #f9fafb; }
        .section-header-pill {
          letter-spacing: 0.05em;
          text-transform: uppercase;
          font-size: 0.75rem;
        }
        .rtl { direction: rtl; }
        .ltr { direction: ltr; }
      `}</style>
    </AdminLayout>
  );
}
