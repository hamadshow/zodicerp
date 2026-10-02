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
      dashboard: 'لوحة التحكم',
      accounting: 'المحاسبة',
      financialReports: 'التقارير المالية',
      yes: 'نعم',
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
      dashboard: 'Dashboard',
      accounting: 'Accounting',
      financialReports: 'Financial Reports',
      yes: 'Yes',
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
      <Head title={`${currentLang.title} - ZodicERP`} />
      <div className={`fr-page balance-sheet-page ${isAr ? 'rtl' : 'ltr'}`}>
        <div className="fr-breadcrumb">
          <a href="#">{currentLang.dashboard}</a>
          <span className="fr-sep">/</span>
          <a href="#">{currentLang.accounting}</a>
          <span className="fr-sep">/</span>
          <a href="#">{currentLang.financialReports}</a>
          <span className="fr-sep">/</span>
          <span className="fr-current">{currentLang.title}</span>
        </div>

        <div className="fr-header-card">
          <div>
            <h1 className="fr-title">{currentLang.title}</h1>
            <p className="fr-subtitle">{currentLang.subtitle}</p>
          </div>
        </div>

        <div className="fr-filters-card">
          <div className="fr-filters-grid">
            <div className="fr-form-group">
              <label htmlFor="fr-date1">{currentLang.date1}</label>
              <input
                id="fr-date1"
                type="date"
                className="fr-input"
                value={date1}
                onChange={(e) => setDate1(e.target.value)}
              />
            </div>
            <div className="fr-form-group">
              <label htmlFor="fr-date2">{currentLang.date2}</label>
              <input
                id="fr-date2"
                type="date"
                className="fr-input"
                value={date2}
                onChange={(e) => setDate2(e.target.value)}
              />
            </div>
            <div className="fr-form-group">
              <label htmlFor="fr-compare">{currentLang.compareToOpening}</label>
              <select id="fr-compare" className="fr-input" value={compareToOpening ? '1' : '0'} onChange={(e) => setCompareToOpening(e.target.value === '1')}>
                <option value="0">{currentLang.compareToOpening}</option>
                <option value="1">{currentLang.yes}</option>
              </select>
            </div>
          </div>
          <div className="fr-form-actions">
            <button
              type="button"
              className="btn btn-excel fr-btn"
              onClick={handleExportExcel}
            >
              <span className="material-icons-outlined">description</span>
              <span>{currentLang.exportExcel}</span>
            </button>
            <button
              type="button"
              className="btn btn-primary fr-btn"
              onClick={() => window.print()}
            >
              <span className="material-icons-outlined">print</span>
              <span>{currentLang.print}</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="fr-loading-banner">
            <span className="material-icons-outlined">sync</span>
            <span>{currentLang.loading}</span>
          </div>
        ) : data ? (
          <div className="fr-table-card">
            <div className="fr-table-wrapper">
              <table className="fr-table">
                <thead>
                  <tr>
                    <th className="fr-th">{currentLang.accountName}</th>
                    <th className="fr-th fr-amount-header">{date1}</th>
                    <th className="fr-th fr-amount-header">{compareToOpening ? currentLang.compareToOpening : date2}</th>
                    <th className="fr-th fr-amount-header">{currentLang.change}</th>
                    <th className="fr-th fr-amount-header">{currentLang.percentage}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-indigo-50/50">
                    <td colSpan="5" className="py-2 px-4 font-bold text-indigo-700 text-sm">{currentLang.assets}</td>
                  </tr>
                  {renderComparisonRows(data.main.assets, data.comparison)}
                  <tr className="bg-indigo-600 text-white font-bold">
                    <td className="py-3 px-4">{currentLang.totalAssets}</td>
                    <td className="py-3 px-4 text-right">{formatNumber(data.main.total_assets)}</td>
                    <td className="py-3 px-4 text-right text-indigo-200">{formatNumber(data.comparison.total_assets)}</td>
                    <td className="py-3 px-4 text-right">{(data.main.total_assets - data.comparison.total_assets) >= 0 ? '+' : ''}{formatNumber(data.main.total_assets - data.comparison.total_assets)}</td>
                    <td className="py-3 px-4 text-right text-xs">{formatPercentage(data.main.total_assets, data.comparison.total_assets)}</td>
                  </tr>

                  <tr className="h-8"></tr>
                  <tr className="bg-red-50/50">
                    <td colSpan="5" className="py-2 px-4 font-bold text-red-700 text-sm">{currentLang.liabilities}</td>
                  </tr>
                  {renderComparisonRows(data.main.liabilities, data.comparison)}
                  <tr className="bg-gray-100 text-gray-800 font-bold">
                    <td className="py-3 px-4">{currentLang.totalLiabilities}</td>
                    <td className="py-3 px-4 text-right">{formatNumber(data.main.total_liabilities)}</td>
                    <td className="py-3 px-4 text-right text-gray-500">{formatNumber(data.comparison.total_liabilities)}</td>
                    <td className="py-3 px-4 text-right">{formatNumber(data.main.total_liabilities - data.comparison.total_liabilities)}</td>
                    <td className="py-3 px-4 text-right text-xs">{formatPercentage(data.main.total_liabilities, data.comparison.total_liabilities)}</td>
                  </tr>

                  <tr className="h-8"></tr>
                  <tr className="bg-green-50/50">
                    <td colSpan="5" className="py-2 px-4 font-bold text-green-700 text-sm">{currentLang.equity}</td>
                  </tr>
                  {renderComparisonRows(data.main.equity, data.comparison)}
                  <tr className="bg-gray-100 text-gray-800 font-bold border-b-2 border-gray-800">
                    <td className="py-3 px-4">{currentLang.totalEquity}</td>
                    <td className="py-3 px-4 text-right">{formatNumber(data.main.total_equity)}</td>
                    <td className="py-3 px-4 text-right text-gray-500">{formatNumber(data.comparison.total_equity)}</td>
                    <td className="py-3 px-4 text-right">{formatNumber(data.main.total_equity - data.comparison.total_equity)}</td>
                    <td className="py-3 px-4 text-right text-xs">{formatPercentage(data.main.total_equity, data.comparison.total_equity)}</td>
                  </tr>

                  <tr className="bg-gray-800 text-white font-bold text-lg">
                    <td className="py-4 px-4">{currentLang.totalLiabilitiesEquity}</td>
                    <td className="py-4 px-4 text-right">{formatNumber(totalMainLE)}</td>
                    <td className="py-4 px-4 text-right text-gray-400">{formatNumber(data.comparison.total_liabilities + data.comparison.total_equity)}</td>
                    <td className="py-4 px-4 text-right">{formatNumber(totalMainLE - (data.comparison.total_liabilities + data.comparison.total_equity))}</td>
                    <td className="py-4 px-4 text-right text-sm">{formatPercentage(totalMainLE, data.comparison.total_liabilities + data.comparison.total_equity)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Validation Message */}
              <div className={`fr-error-banner mt-4 ${isBalanced ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
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
        ) : (
          <div className="fr-empty-state">
            <span className="material-icons-outlined">search_off</span>
            <p className="mt-4">{currentLang.noData}</p>
          </div>
        )}
      </div>

      <style jsx>{`{
        .balance-sheet-page { padding: 40px; background-color: #f9fafb; min-height: 100vh; }
        .rtl { direction: rtl; text-align: right; }
        .ltr { direction: ltr; text-align: left; }
        .fr-breadcrumb { margin-bottom: 16px; }
        .fr-header-card { margin-bottom: 18px; }
        .fr-filters-card { margin-bottom: 18px; }
        .fr-filters-grid { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; align-items: flex-end; }
        .fr-form-group label { font-size: 0.8rem; font-weight: 500; }
        .fr-input { font-size: 0.85rem; }
        .fr-form-actions { justify-content: flex-start; gap: 8px; }
        .account-cell { padding: 8px 12px; font-size: 0.9rem; }
        .balance-cell { font-family: 'Courier New', Courier, monospace; font-weight: 500; }
        .font-bold .acc-name { font-weight: 700; color: #111827; }
        .fr-table { font-size: 0.85rem; }
        .fr-table th, .fr-table td { padding: 8px 10px; }
        .fr-table .fr-amount-header { text-align: right; }
        .fr-table .fr-amount { text-align: right; font-variant-numeric: tabular-nums; }
        @media print {
          .fr-page { padding: 0; background: white; }
          .fr-breadcrumb, .fr-header-card, .fr-filters-card, .fr-form-actions { display: none !important; }
          .fr-table-card { box-shadow: none !important; margin: 0 !important; width: 100% !important; max-width: none !important; }
          .print-section { box-shadow: none !important; margin: 0 !important; width: 100% !important; max-width: none !important; }
          body { background: white !important; }
          .report-container { border: none !important; }
          .report-body { padding: 0 !important; }
        }
        .rtl .fr-breadcrumb { direction: rtl; }
        .rtl .text-left { text-align: right !important; }
        .rtl .text-right { text-align: left !important; }
      `}</style>
    </AdminLayout>
  );
}
