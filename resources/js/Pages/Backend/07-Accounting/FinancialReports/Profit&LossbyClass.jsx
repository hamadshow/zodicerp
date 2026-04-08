import React, { useEffect, useState, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import * as XLSX from 'xlsx';
import AdminLayout from '../../components/AdminLayout';
import { apiService } from '../../../../services/api';

export default function ProfitLossByClass() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [lang, setLang] = useState(document.documentElement.lang || 'ar');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.get(`/reports/profit-loss-class?start_date=${startDate}&end_date=${endDate}`);
      setData(response.data.main);
    } catch (error) {
      console.error('Failed to fetch profit & loss by class:', error);
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
      title: 'الأرباح والخسائر حسب الفئة',
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
      class: 'الفئة',
    },
    en: {
      title: 'Profit & Loss by Class',
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
      class: 'Class',
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

    XLSX.utils.book_append_sheet(workbook, worksheet, 'P&L by Class');
    XLSX.writeFile(workbook, `Profit_Loss_by_Class_${startDate}_to_${endDate}.xlsx`);
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
                        <td className="py-3 px-4 text-right">{formatNumber(data.total_income)}</td>
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
                    <tbody className="divide-y divide-gray-50">
                      {renderAccountRows(data.cogs)}
                      <tr className="total-row-sub font-bold text-gray-800 bg-gray-50">
                        <td className="py-3 px-4">{currentLang.totalCogs}</td>
                        <td className="py-3 px-4 text-right">{formatNumber(data.total_cogs)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Gross Profit Row */}
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <table className="w-full">
                    <tbody>
                      <tr className="font-bold text-indigo-900 text-lg">
                        <td>{currentLang.grossProfit}</td>
                        <td className="text-right">{formatNumber(data.gross_profit)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Expenses Section */}
                <div>
                  <h4 className="section-header-pill bg-red-50 text-red-700 px-4 py-2 rounded-full inline-block font-bold mb-4">
                    {currentLang.expenses}
                  </h4>
                  <table className="w-full">
                    <tbody className="divide-y divide-gray-50">
                      {renderAccountRows(data.expenses)}
                      <tr className="total-row-sub font-bold text-gray-800 bg-gray-50">
                        <td className="py-3 px-4">{currentLang.totalExpenses}</td>
                        <td className="py-3 px-4 text-right">{formatNumber(data.total_expenses)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Net Income Section */}
                <div className="total-row-highlight bg-indigo-600 text-white font-bold p-6 rounded-lg shadow-inner">
                  <table className="w-full">
                    <tbody>
                      <tr className="text-2xl">
                        <td>{currentLang.netIncome}</td>
                        <td className="text-right">{formatNumber(data.net_income)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <span className="material-icons-outlined text-6xl text-gray-300">search_off</span>
            <p className="mt-4 text-xl text-gray-500">{currentLang.noData}</p>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .profit-loss-page { padding: 40px; background-color: #f9fafb; min-height: 100vh; }
        .rtl { direction: rtl; }
        .ltr { direction: ltr; }
        .report-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px; }
        .report-header__right { display: flex; align-items: flex-end; }
        .date-picker-group { display: flex; flex-direction: column; gap: 4px; }
        .date-picker-group input { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; }
        .btn-secondary { display: flex; align-items: center; padding: 8px 16px; background: white; border: 1px solid #d1d5db; border-radius: 6px; font-weight: 500; color: #374151; transition: all 0.2s; }
        .btn-secondary:hover { background: #f3f4f6; }
        .btn-primary { display: flex; align-items: center; padding: 8px 16px; background: #4f46e5; border: 1px solid #4338ca; border-radius: 6px; font-weight: 500; color: white; transition: all 0.2s; }
        .btn-primary:hover { background: #4338ca; }
        
        .account-cell { padding: 8px 12px; font-size: 0.9rem; color: #4b5563; }
        .balance-cell { font-family: 'Courier New', Courier, monospace; font-weight: 500; }
        .font-bold .acc-name { font-weight: 700; color: #111827; }
        
        .total-row-highlight { font-size: 1.1rem; }
        .section-header-pill { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; }
        
        @media print {
          .no-print { display: none !important; }
          .print-section { box-shadow: none !important; margin: 0 !important; width: 100% !important; max-width: none !important; }
          .profit-loss-page { padding: 0 !important; background: white !important; }
          .AdminLayout__Sidebar, .AdminLayout__Header { display: none !important; }
          body { background: white !important; }
          .report-container { border: none !important; }
          .report-body { padding: 0 !important; }
        }

        .rtl .report-header__left { text-align: right; }
        .rtl .text-left { text-align: right !important; }
        .rtl .text-right { text-align: left !important; }
        .rtl .btn-primary, .rtl .btn-secondary { flex-direction: row-reverse; }
        .rtl .material-icons-outlined { margin-left: 4px; margin-right: 0; }
        .rtl .ml-4 { margin-left: 0; margin-right: 1rem; }
        .rtl .ml-2 { margin-left: 0; margin-right: 0.5rem; }
      ` }} />
    </AdminLayout>
  );
}
