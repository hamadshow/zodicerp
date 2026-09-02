import React, { useEffect, useState, useCallback } from 'react';
import { Head, Link } from '@inertiajs/react';
import * as XLSX from 'xlsx';
import AdminLayout from '../../components/AdminLayout';
import { apiService } from '../../../../services/api';

export default function BalanceSheetComparison() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [lang, setLang] = useState(document.documentElement.lang || 'ar');
  const [date1, setDate1] = useState(new Date().toISOString().split('T')[0]);
  const [date2, setDate2] = useState(new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0]);
  const [compareToOpening, setCompareToOpening] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.get(`/reports/balance-sheet?date=${date1}&compare_date=${date2}&compare_to_opening=${compareToOpening}`);
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch comparison data:', error);
    } finally {
      setLoading(false);
    }
  }, [date1, date2, compareToOpening]);

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

  const formatPercentage = (current, previous) => {
    if (!previous) return 'N/A';
    return `${((current - previous) / Math.abs(previous) * 100).toFixed(1)}%`;
  };

  const t = {
    ar: {
      title: 'مقارنة الميزانية العمومية',
      date1: 'التاريخ الحالي',
      date2: 'تاريخ المقارنة',
      compareToOpening: 'المقارنة مع الرصيد الافتتاحي',
      assets: 'الأصول',
      liabilities: 'الالتزامات',
      equity: 'حقوق الملكية',
      totalAssets: 'إجمالي الأصول',
      totalLiabilities: 'إجمالي الالتزامات',
      totalEquity: 'إجمالي حقوق الملكية',
      totalLiabilitiesEquity: 'إجمالي الالتزامات وحقوق الملكية',
      accountName: 'اسم الحساب',
      loading: 'جاري التحميل...',
      exportExcel: 'تصدير إكسل',
      print: 'طباعة',
      change: 'التغير',
      percentage: '%',
      subtitle: "اضغط على حرف 'a' للتحويل للغة الإنجليزية",
      companyName: 'شركة زد إي آر بي (ZodicERP)',
      balanced: 'الميزانية متوازنة',
      unbalanced: 'الميزانية غير متوازنة!',
      diff: 'الفرق',
      noData: 'لا توجد بيانات متاحة لهذا التاريخ',
    },
    en: {
      title: 'Balance Sheet Comparison',
      date1: 'Current Date',
      date2: 'Comparison Date',
      compareToOpening: 'Compare to Opening Balance',
      assets: 'Assets',
      liabilities: 'Liabilities',
      equity: 'Equity',
      totalAssets: 'Total Assets',
      totalLiabilities: 'Total Liabilities',
      totalEquity: 'Total Equity',
      totalLiabilitiesEquity: 'Total Liabilities & Equity',
      accountName: 'Account Name',
      loading: 'Loading...',
      exportExcel: 'Export Excel',
      print: 'Print',
      change: 'Change',
      percentage: '%',
      subtitle: "Press 'a' to toggle language",
      companyName: 'ZodicERP Company',
      balanced: 'Balance Sheet is Balanced',
      unbalanced: 'Balance Sheet is Unbalanced!',
      diff: 'Difference',
      noData: 'No data available for these dates',
    }
  };

  const currentLang = t[lang];
  const isAr = lang === 'ar';

  const findAccountInTree = (nodes, code) => {
    if (!nodes) return null;
    for (const node of nodes) {
      if (node.AccCode === code) return node;
      if (node.children) {
        const found = findAccountInTree(node.children, code);
        if (found) return found;
      }
    }
    return null;
  };

  const renderComparisonRows = (mainNodes, compData, depth = 0) => {
    return mainNodes.map((node) => {
      const mainBal = node.balance;
      
      // Find same account in comparison data
      let compBal = 0;
      const accCodeStr = String(node.AccCode || '');
      const compSection = accCodeStr.startsWith('1') ? compData.assets : 
                         (accCodeStr.startsWith('2') ? compData.liabilities : compData.equity);
      const compNode = findAccountInTree(compSection, node.AccCode);
      if (compNode) compBal = compNode.balance;

      const diff = mainBal - compBal;
      const pct = compBal !== 0 ? (diff / Math.abs(compBal)) * 100 : (mainBal !== 0 ? 100 : 0);

      return (
        <React.Fragment key={node.AccCode}>
          <tr className={`row-depth-${depth} ${node.AccType === 0 ? 'font-bold bg-gray-50/50' : ''} hover:bg-gray-50 transition-colors`}>
            <td className="account-cell py-3" style={{ 
              paddingLeft: isAr ? '12px' : `${depth * 24 + 12}px`, 
              paddingRight: isAr ? `${depth * 24 + 12}px` : '12px' 
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
            <td className="text-right balance-cell font-mono text-sm py-3 px-4">{formatNumber(mainBal)}</td>
            <td className="text-right balance-cell font-mono text-sm py-3 px-4 text-gray-400">{formatNumber(compBal)}</td>
            <td className={`text-right font-mono text-sm py-3 px-4 ${diff > 0 ? 'text-green-600 font-bold' : diff < 0 ? 'text-red-600 font-bold' : 'text-gray-300'}`}>
              {diff !== 0 ? (diff > 0 ? '+' : '') + formatNumber(diff) : '-'}
            </td>
            <td className={`text-right text-[10px] font-bold py-3 px-4 ${diff > 0 ? 'text-green-500' : diff < 0 ? 'text-red-500' : 'text-gray-300'}`}>
              {pct !== 0 ? pct.toFixed(1) + '%' : '-'}
            </td>
          </tr>
          {node.children && node.children.length > 0 && renderComparisonRows(node.children, compData, depth + 1)}
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
    rows.push([`${currentLang.date1}: ${date1} | ${currentLang.date2}: ${compareToOpening ? currentLang.compareToOpening : date2}`]);
    rows.push([]);
    
    rows.push([currentLang.accountName, date1, compareToOpening ? currentLang.compareToOpening : date2, currentLang.change, currentLang.percentage]);

    const flatten = (nodes, compData, depth = 0) => {
      nodes.forEach(n => {
        const mainBal = n.balance;
        const accCodeStr = String(n.AccCode || '');
        const compSection = accCodeStr.startsWith('1') ? compData.assets : 
                           (accCodeStr.startsWith('2') ? compData.liabilities : compData.equity);
        const compNode = findAccountInTree(compSection, n.AccCode);
        const compBal = compNode ? compNode.balance : 0;
        const diff = mainBal - compBal;
        const pct = compBal !== 0 ? (diff / Math.abs(compBal)) * 100 : (mainBal !== 0 ? 100 : 0);

        rows.push([
          '    '.repeat(depth) + accCodeStr + ' - ' + n.AccName, 
          mainBal, 
          compBal, 
          diff, 
          pct.toFixed(1) + '%'
        ]);
        if (n.children && n.children.length > 0) {
          flatten(n.children, compData, depth + 1);
        }
      });
    };

    rows.push([currentLang.assets.toUpperCase()]);
    flatten(data.main.assets, data.comparison);
    rows.push([currentLang.totalAssets, data.main.total_assets, data.comparison.total_assets]);
    rows.push([]);

    rows.push([currentLang.liabilities.toUpperCase()]);
    flatten(data.main.liabilities, data.comparison);
    rows.push([currentLang.totalLiabilities, data.main.total_liabilities, data.comparison.total_liabilities]);
    rows.push([]);

    rows.push([currentLang.equity.toUpperCase()]);
    flatten(data.main.equity, data.comparison);
    rows.push([currentLang.totalEquity, data.main.total_equity, data.comparison.total_equity]);

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 50 }, // Account Name
      { wch: 15 }, // Date 1
      { wch: 15 }, // Date 2
      { wch: 15 }, // Change
      { wch: 10 }  // Percentage
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Comparison');
    XLSX.writeFile(workbook, `BS_Comparison_${date1}_vs_${date2}.xlsx`);
  };

  const totalMainLE = (data?.main?.total_liabilities || 0) + (data?.main?.total_equity || 0);
  const mainDiff = (data?.main?.total_assets || 0) - totalMainLE;
  const isBalanced = Math.abs(mainDiff) < 0.01;

  return (
    <AdminLayout activeMenu="Financial Reports">
      <div className={`financial-reports-page balance-sheet-page ${isAr ? 'rtl' : 'ltr'}`}>
        <Head title={`${currentLang.title} - ZodicERP`} />

        <div className="report-header no-print">
          <div className="report-header__left">
            <h1 className="text-2xl font-bold text-gray-800">{currentLang.title}</h1>
            <p className="text-sm text-gray-500 mt-1">{currentLang.subtitle}</p>
          </div>
          <div className="report-header__right">
            <div className="date-picker-group flex items-center gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">{currentLang.date1}</label>
                <input type="date" value={date1} onChange={(e) => setDate1(e.target.value)} className="form-input rounded-md border-gray-300 text-sm" />
              </div>
              
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-500">{currentLang.date2}</label>
                  <label className="inline-flex items-center cursor-pointer ml-2">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={compareToOpening}
                      onChange={(e) => setCompareToOpening(e.target.checked)}
                    />
                    <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                    <span className="ml-1 text-[10px] text-gray-400">{currentLang.compareToOpening}</span>
                  </label>
                </div>
                <input 
                  type="date" 
                  value={date2} 
                  onChange={(e) => setDate2(e.target.value)} 
                  disabled={compareToOpening}
                  className={`form-input rounded-md border-gray-300 text-sm ${compareToOpening ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`} 
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
          <div className="report-container print-section shadow-lg bg-white rounded-lg overflow-hidden max-w-6xl mx-auto">
            <div className="report-top-banner p-8 border-b border-gray-100 text-center">
              <h2 className="text-3xl font-bold text-indigo-700 uppercase tracking-wider">{currentLang.companyName}</h2>
              <h3 className="text-xl font-semibold text-gray-700 mt-2 uppercase">{currentLang.title}</h3>
              <p className="text-gray-500 mt-1 font-medium">
                <span className="text-indigo-600 font-bold">{date1}</span> vs <span className="text-gray-400">{compareToOpening ? currentLang.compareToOpening : date2}</span>
              </p>
            </div>

            <div className="report-body p-8">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-100 text-gray-400 text-xs uppercase tracking-wider">
                    <th className="text-left py-4 font-semibold w-2/5">{currentLang.accountName}</th>
                    <th className="text-right py-4 font-semibold text-indigo-600">{date1}</th>
                    <th className="text-right py-4 font-semibold">{compareToOpening ? currentLang.compareToOpening : date2}</th>
                    <th className="text-right py-4 font-semibold">{currentLang.change}</th>
                    <th className="text-right py-4 font-semibold">{currentLang.percentage}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <tr className="bg-indigo-50/50"><td colSpan="5" className="py-2 px-4 font-bold text-indigo-700 text-sm">{currentLang.assets}</td></tr>
                  {renderComparisonRows(data.main.assets, data.comparison)}
                  <tr className="bg-indigo-600 text-white font-bold">
                    <td className="py-3 px-4">{currentLang.totalAssets}</td>
                    <td className="py-3 px-4 text-right">{formatNumber(data.main.total_assets)}</td>
                    <td className="py-3 px-4 text-right text-indigo-200">{formatNumber(data.comparison.total_assets)}</td>
                    <td className="py-3 px-4 text-right">{(data.main.total_assets - data.comparison.total_assets) >= 0 ? '+' : ''}{formatNumber(data.main.total_assets - data.comparison.total_assets)}</td>
                    <td className="py-3 px-4 text-right text-xs">
                      {formatPercentage(data.main.total_assets, data.comparison.total_assets)}
                    </td>
                  </tr>

                  <tr className="h-8"></tr>
                  <tr className="bg-red-50/50"><td colSpan="5" className="py-2 px-4 font-bold text-red-700 text-sm">{currentLang.liabilities}</td></tr>
                  {renderComparisonRows(data.main.liabilities, data.comparison)}
                  <tr className="bg-gray-100 text-gray-800 font-bold">
                    <td className="py-3 px-4">{currentLang.totalLiabilities}</td>
                    <td className="py-3 px-4 text-right">{formatNumber(data.main.total_liabilities)}</td>
                    <td className="py-3 px-4 text-right text-gray-500">{formatNumber(data.comparison.total_liabilities)}</td>
                    <td className="py-3 px-4 text-right">{formatNumber(data.main.total_liabilities - data.comparison.total_liabilities)}</td>
                    <td className="py-3 px-4 text-right text-xs">
                      {formatPercentage(data.main.total_liabilities, data.comparison.total_liabilities)}
                    </td>
                  </tr>

                  <tr className="h-8"></tr>
                  <tr className="bg-green-50/50"><td colSpan="5" className="py-2 px-4 font-bold text-green-700 text-sm">{currentLang.equity}</td></tr>
                  {renderComparisonRows(data.main.equity, data.comparison)}
                  <tr className="bg-gray-100 text-gray-800 font-bold border-b-2 border-gray-800">
                    <td className="py-3 px-4">{currentLang.totalEquity}</td>
                    <td className="py-3 px-4 text-right">{formatNumber(data.main.total_equity)}</td>
                    <td className="py-3 px-4 text-right text-gray-500">{formatNumber(data.comparison.total_equity)}</td>
                    <td className="py-3 px-4 text-right">{formatNumber(data.main.total_equity - data.comparison.total_equity)}</td>
                    <td className="py-3 px-4 text-right text-xs">
                      {formatPercentage(data.main.total_equity, data.comparison.total_equity)}
                    </td>
                  </tr>

                  <tr className="bg-gray-800 text-white font-bold text-lg">
                    <td className="py-4 px-4">{currentLang.totalLiabilitiesEquity}</td>
                    <td className="py-4 px-4 text-right">{formatNumber(totalMainLE)}</td>
                    <td className="py-4 px-4 text-right text-gray-400">{formatNumber(data.comparison.total_liabilities + data.comparison.total_equity)}</td>
                    <td className="py-4 px-4 text-right">{formatNumber(totalMainLE - (data.comparison.total_liabilities + data.comparison.total_equity))}</td>
                    <td className="py-4 px-4 text-right text-sm">
                      {formatPercentage(totalMainLE, data.comparison.total_liabilities + data.comparison.total_equity)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Validation Message */}
              <div className="mt-12 no-print">
                <div className={`p-4 rounded-lg flex items-center ${isBalanced ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <span className={`material-icons-outlined mr-3 ${isBalanced ? 'text-green-500' : 'text-red-500'}`}>
                    {isBalanced ? 'check_circle' : 'warning'}
                  </span>
                  <div>
                    <p className={`font-bold ${isBalanced ? 'text-green-800' : 'text-red-800'}`}>
                      {isBalanced ? currentLang.balanced : currentLang.unbalanced}
                    </p>
                    {!isBalanced && (
                      <p className="text-red-600 text-sm">{currentLang.diff}: {formatNumber(mainDiff)}</p>
                    )}
                  </div>
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
        .balance-sheet-page { padding: 40px; background-color: #f9fafb; min-height: 100vh; }
        .rtl { direction: rtl; }
        .ltr { direction: ltr; }
        .report-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px; }
        .report-header__right { display: flex; align-items: flex-end; }
        .btn-secondary { display: flex; align-items: center; padding: 8px 16px; background: white; border: 1px solid #d1d5db; border-radius: 6px; font-weight: 500; color: #374151; transition: all 0.2s; }
        .btn-primary { display: flex; align-items: center; padding: 8px 16px; background: #4f46e5; border: 1px solid #4338ca; border-radius: 6px; font-weight: 500; color: white; transition: all 0.2s; }
        
        .account-cell { padding: 8px 12px; font-size: 0.9rem; color: #4b5563; }
        .balance-cell { font-family: 'Courier New', Courier, monospace; font-weight: 500; }
        .font-bold .acc-name { font-weight: 700; color: #111827; }
        
        @media print {
          .no-print { display: none !important; }
          .print-section { box-shadow: none !important; margin: 0 !important; width: 100% !important; max-width: none !important; }
          .balance-sheet-page { padding: 0 !important; background: white !important; }
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
