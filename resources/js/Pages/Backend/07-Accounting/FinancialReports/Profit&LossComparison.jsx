import React, { useEffect, useState, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import * as XLSX from 'xlsx';
import AdminLayout from '../../components/AdminLayout';
import { apiService } from '../../../../services/api';

export default function ProfitLossComparison() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [lang, setLang] = useState(document.documentElement.lang || 'ar');
  
  // Current Period
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Comparison Period
  const [compareStartDate, setCompareStartDate] = useState('2023-01-01');
  const [compareEndDate, setCompareEndDate] = useState('2023-12-31');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.get(`/reports/profit-loss-comparison?start_date=${startDate}&end_date=${endDate}&compare_start_date=${compareStartDate}&compare_end_date=${compareEndDate}`);
      setData(response.data.main);
      setComparisonData(response.data.comparison);
    } catch (error) {
      console.error('Failed to fetch profit & loss comparison:', error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, compareStartDate, compareEndDate]);

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

  const calculateChange = (current, previous) => {
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  const t = {
    ar: {
      title: 'مقارنة الأرباح والخسائر',
      period: 'الفترة الحالية',
      comparePeriod: 'فترة المقارنة',
      from: 'من',
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
      current: 'الحالي',
      previous: 'السابق',
      change: 'التغيير %',
      loading: 'جاري التحميل...',
      exportExcel: 'تصدير إكسل',
      print: 'طباعة',
      subtitle: "اضغط على حرف 'a' للتحويل للغة الإنجليزية",
      companyName: 'شركة زد إي آر بي (ZodicERP)',
      noData: 'لا توجد بيانات متاحة لهذه الفترة',
    },
    en: {
      title: 'Profit & Loss Comparison',
      period: 'Current Period',
      comparePeriod: 'Comparison Period',
      from: 'From',
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
      current: 'Current',
      previous: 'Previous',
      change: 'Change %',
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

  const findComparisonNode = (nodes, code) => {
    if (!nodes) return null;
    for (const node of nodes) {
      if (node.AccCode === code) return node;
      if (node.children) {
        const found = findComparisonNode(node.children, code);
        if (found) return found;
      }
    }
    return null;
  };

  const renderAccountRows = (nodes, compNodes, depth = 0) => {
    return nodes.map((node) => {
      const compNode = findComparisonNode(compNodes, node.AccCode);
      const compBalance = compNode ? compNode.balance : 0;
      const change = calculateChange(node.balance, compBalance);

      return (
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
            <td className="text-right font-mono text-sm py-2 px-4 text-gray-900">
              {node.balance !== 0 ? formatNumber(node.balance) : '-'}
            </td>
            <td className="text-right font-mono text-sm py-2 px-4 text-gray-500">
              {compBalance !== 0 ? formatNumber(compBalance) : '-'}
            </td>
            <td className={`text-right font-mono text-xs py-2 px-4 ${
              change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-400'
            }`}>
              {change !== 0 ? `${change > 0 ? '+' : ''}${change.toFixed(1)}%` : '0%'}
            </td>
          </tr>
          {node.children && node.children.length > 0 && renderAccountRows(node.children, compNodes, depth + 1)}
        </React.Fragment>
      );
    });
  };

  const handleExportExcel = () => {
    if (!data) return;

    const workbook = XLSX.utils.book_new();
    const rows = [];
    
    rows.push([currentLang.companyName]);
    rows.push([currentLang.title]);
    rows.push([`${currentLang.period}: ${startDate} - ${endDate}`]);
    rows.push([`${currentLang.comparePeriod}: ${compareStartDate} - ${compareEndDate}`]);
    rows.push([]);
    rows.push([currentLang.accountName, currentLang.current, currentLang.previous, currentLang.change]);
    
    const flatten = (nodes, compNodes, depth = 0) => {
      nodes.forEach(n => {
        const compNode = findComparisonNode(compNodes, n.AccCode);
        const compBalance = compNode ? compNode.balance : 0;
        const change = calculateChange(n.balance, compBalance);
        const indent = '    '.repeat(depth);
        rows.push([
          indent + n.AccCode + ' - ' + n.AccName, 
          n.balance, 
          compBalance, 
          `${change.toFixed(2)}%`
        ]);
        if (n.children && n.children.length > 0) {
          flatten(n.children, compNodes, depth + 1);
        }
      });
    };

    // Income
    rows.push([currentLang.income.toUpperCase()]);
    flatten(data.income, comparisonData?.income);
    rows.push([currentLang.totalIncome, data.total_income, comparisonData?.total_income, `${calculateChange(data.total_income, comparisonData?.total_income).toFixed(2)}%`]);
    rows.push([]);

    // COGS
    rows.push([currentLang.cogs.toUpperCase()]);
    flatten(data.cogs, comparisonData?.cogs);
    rows.push([currentLang.totalCogs, data.total_cogs, comparisonData?.total_cogs, `${calculateChange(data.total_cogs, comparisonData?.total_cogs).toFixed(2)}%`]);
    rows.push([]);

    // Gross Profit
    rows.push([currentLang.grossProfit.toUpperCase(), data.gross_profit, comparisonData?.gross_profit, `${calculateChange(data.gross_profit, comparisonData?.gross_profit).toFixed(2)}%`]);
    rows.push([]);

    // Expenses
    rows.push([currentLang.expenses.toUpperCase()]);
    flatten(data.expenses, comparisonData?.expenses);
    rows.push([currentLang.totalExpenses, data.total_expenses, comparisonData?.total_expenses, `${calculateChange(data.total_expenses, comparisonData?.total_expenses).toFixed(2)}%`]);
    rows.push([]);

    // Net Income
    rows.push([currentLang.netIncome.toUpperCase(), data.net_income, comparisonData?.net_income, `${calculateChange(data.net_income, comparisonData?.net_income).toFixed(2)}%`]);

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet['!cols'] = [{ wch: 50 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'P&L Comparison');
    XLSX.writeFile(workbook, `Profit_Loss_Comparison_${endDate}.xlsx`);
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
          <div className="report-header__right flex-col gap-3">
            <div className="flex gap-6">
              <div className="date-picker-group">
                <label className="text-xs font-bold text-indigo-600 uppercase mb-1 block">{currentLang.period}</label>
                <div className="flex items-center gap-2">
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="form-input text-xs" />
                  <span className="text-gray-400">{currentLang.to}</span>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="form-input text-xs" />
                </div>
              </div>
              <div className="date-picker-group">
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{currentLang.comparePeriod}</label>
                <div className="flex items-center gap-2">
                  <input type="date" value={compareStartDate} onChange={(e) => setCompareStartDate(e.target.value)} className="form-input text-xs" />
                  <span className="text-gray-400">{currentLang.to}</span>
                  <input type="date" value={compareEndDate} onChange={(e) => setCompareEndDate(e.target.value)} className="form-input text-xs" />
                </div>
              </div>
            </div>
            <div className="button-group self-end">
              <button onClick={handleExportExcel} className="btn-secondary py-1.5 px-3 text-sm">
                <span className="material-icons-outlined text-base mr-1">file_download</span>
                {currentLang.exportExcel}
              </button>
              <button onClick={() => window.print()} className="btn-primary py-1.5 px-3 text-sm ml-2">
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
          <div className="report-container print-section shadow-lg bg-white rounded-lg overflow-hidden max-w-6xl mx-auto">
            <div className="report-top-banner p-8 border-b border-gray-100 text-center">
              <h2 className="text-3xl font-bold text-indigo-700 uppercase tracking-wider">{currentLang.companyName}</h2>
              <h3 className="text-xl font-semibold text-gray-700 mt-2 uppercase">{currentLang.title}</h3>
              <div className="flex justify-center gap-8 mt-2 text-sm text-gray-500 font-medium">
                <p>{currentLang.period}: {startDate} {currentLang.to} {endDate}</p>
                <p className="border-l pl-8 border-gray-200">{currentLang.comparePeriod}: {compareStartDate} {currentLang.to} {compareEndDate}</p>
              </div>
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
                      <tr className="border-b-2 border-gray-100 text-gray-400 text-[10px] uppercase tracking-wider">
                        <th className="text-left py-3 font-semibold">{currentLang.accountName}</th>
                        <th className="text-right py-3 font-semibold w-32">{currentLang.current}</th>
                        <th className="text-right py-3 font-semibold w-32">{currentLang.previous}</th>
                        <th className="text-right py-3 font-semibold w-24">{currentLang.change}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {renderAccountRows(data.income, comparisonData?.income)}
                      <tr className="total-row-sub font-bold text-gray-800 bg-gray-50">
                        <td className="py-3 px-4 rounded-l-md">{currentLang.totalIncome}</td>
                        <td className="py-3 px-4 text-right">{formatNumber(data.total_income)}</td>
                        <td className="py-3 px-4 text-right text-gray-500">{formatNumber(comparisonData?.total_income)}</td>
                        <td className={`py-3 px-4 text-right rounded-r-md ${calculateChange(data.total_income, comparisonData?.total_income) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {calculateChange(data.total_income, comparisonData?.total_income).toFixed(1)}%
                        </td>
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
                      <tr className="border-b-2 border-gray-100 text-gray-400 text-[10px] uppercase tracking-wider">
                        <th className="text-left py-3 font-semibold">{currentLang.accountName}</th>
                        <th className="text-right py-3 font-semibold w-32">{currentLang.current}</th>
                        <th className="text-right py-3 font-semibold w-32">{currentLang.previous}</th>
                        <th className="text-right py-3 font-semibold w-24">{currentLang.change}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {renderAccountRows(data.cogs, comparisonData?.cogs)}
                      <tr className="total-row-sub font-bold text-gray-800 bg-gray-50">
                        <td className="py-3 px-4 rounded-l-md">{currentLang.totalCogs}</td>
                        <td className="py-3 px-4 text-right">{formatNumber(data.total_cogs)}</td>
                        <td className="py-3 px-4 text-right text-gray-500">{formatNumber(comparisonData?.total_cogs)}</td>
                        <td className={`py-3 px-4 text-right rounded-r-md ${calculateChange(data.total_cogs, comparisonData?.total_cogs) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {calculateChange(data.total_cogs, comparisonData?.total_cogs).toFixed(1)}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Gross Profit */}
                <div className="flex justify-between items-center bg-gray-100 p-4 rounded-lg">
                  <span className="text-lg font-bold text-gray-700">{currentLang.grossProfit}</span>
                  <div className="flex gap-12 items-center">
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 uppercase">{currentLang.current}</p>
                      <p className="text-xl font-bold">{formatNumber(data.gross_profit)}</p>
                    </div>
                    <div className="text-right border-l pl-12">
                      <p className="text-[10px] text-gray-400 uppercase">{currentLang.previous}</p>
                      <p className="text-xl font-bold text-gray-500">{formatNumber(comparisonData?.gross_profit)}</p>
                    </div>
                  </div>
                </div>

                {/* Expenses Section */}
                <div>
                  <h4 className="section-header-pill bg-red-50 text-red-700 px-4 py-2 rounded-full inline-block font-bold mb-4">
                    {currentLang.expenses}
                  </h4>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-100 text-gray-400 text-[10px] uppercase tracking-wider">
                        <th className="text-left py-3 font-semibold">{currentLang.accountName}</th>
                        <th className="text-right py-3 font-semibold w-32">{currentLang.current}</th>
                        <th className="text-right py-3 font-semibold w-32">{currentLang.previous}</th>
                        <th className="text-right py-3 font-semibold w-24">{currentLang.change}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {renderAccountRows(data.expenses, comparisonData?.expenses)}
                      <tr className="total-row-sub font-bold text-gray-800 bg-gray-50">
                        <td className="py-3 px-4 rounded-l-md">{currentLang.totalExpenses}</td>
                        <td className="py-3 px-4 text-right">{formatNumber(data.total_expenses)}</td>
                        <td className="py-3 px-4 text-right text-gray-500">{formatNumber(comparisonData?.total_expenses)}</td>
                        <td className={`py-3 px-4 text-right rounded-r-md ${calculateChange(data.total_expenses, comparisonData?.total_expenses) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {calculateChange(data.total_expenses, comparisonData?.total_expenses).toFixed(1)}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Net Income */}
                <div className="bg-indigo-600 text-white p-8 rounded-2xl shadow-xl flex justify-between items-center">
                  <span className="text-3xl font-bold uppercase tracking-widest">{currentLang.netIncome}</span>
                  <div className="flex gap-16 items-center">
                    <div className="text-right">
                      <p className="text-xs text-indigo-200 uppercase mb-1">{currentLang.current}</p>
                      <p className="text-4xl font-mono font-bold">{formatNumber(data.net_income)}</p>
                    </div>
                    <div className="text-right border-l border-indigo-500 pl-16">
                      <p className="text-xs text-indigo-200 uppercase mb-1">{currentLang.previous}</p>
                      <p className="text-4xl font-mono font-bold text-indigo-200">{formatNumber(comparisonData?.net_income)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="report-footer p-8 border-t border-gray-100 bg-gray-50/50">
              <div className="flex justify-between text-xs text-gray-400">
                <span>{new Date().toLocaleString(isAr ? 'ar-SA' : 'en-US')}</span>
                <span>ZodicERP Financial Reports - Comparison Analysis</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow-sm">
            <p className="text-gray-500 italic">{currentLang.noData}</p>
          </div>
        )}

        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            .no-print { display: none !important; }
            .print-section { 
              box-shadow: none !important; 
              margin: 0 !important; 
              padding: 0 !important; 
              width: 100% !important;
              max-width: none !important;
            }
            body { background: white !important; }
            .report-container { border: none !important; }
            .section-header-pill { 
              border: 1px solid #e5e7eb !important;
              -webkit-print-color-adjust: exact;
            }
            .bg-indigo-600 { background-color: #4f46e5 !important; -webkit-print-color-adjust: exact; }
          }
          .row-depth-0 { font-weight: 600; }
          .row-depth-1 td.account-cell { padding-left: 2rem; }
          .row-depth-2 td.account-cell { padding-left: 3.5rem; }
          .rtl .row-depth-1 td.account-cell { padding-right: 2rem; padding-left: 0.75rem; }
          .rtl .row-depth-2 td.account-cell { padding-right: 3.5rem; padding-left: 0.75rem; }
          .form-input { 
            padding: 0.25rem 0.5rem;
            border-radius: 0.375rem;
            border: 1px solid #d1d5db;
          }
        ` }} />
      </div>
    </AdminLayout>
  );
}
