import React, { useEffect, useState, useCallback } from 'react';
import { Head, Link } from '@inertiajs/react';
import * as XLSX from 'xlsx';
import AdminLayout from '../../components/AdminLayout';
import { apiService } from '../../../../services/api';

export default function BalanceSheetDetail() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [lang, setLang] = useState(document.documentElement.lang || 'ar');
  const [asOfDate, setAsOfDate] = useState('2024-12-31');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.get(`/reports/balance-sheet?date=${asOfDate}`);
      setData(response.data.main);
    } catch (error) {
      console.error('Failed to fetch balance sheet detail:', error);
    } finally {
      setLoading(false);
    }
  }, [asOfDate]);

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
      dashboard: 'لوحة التحكم',
      accounting: 'المحاسبة',
      financialReports: 'التقارير المالية',
      title: 'تفاصيل الميزانية العمومية',
      asOf: 'كما في تاريخ',
      assets: 'الأصول',
      liabilities: 'الالتزامات',
      equity: 'حقوق الملكية',
      totalAssets: 'إجمالي الأصول',
      totalLiabilities: 'إجمالي الالتزامات',
      totalEquity: 'إجمالي حقوق الملكية',
      totalLiabilitiesEquity: 'إجمالي الالتزامات وحقوق الملكية',
      accountName: 'اسم الحساب',
      balance: 'الرصيد',
      loading: 'جاري التحميل...',
      exportExcel: 'تصدير إكسل',
      print: 'طباعة',
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
      title: 'Balance Sheet Detail',
      asOf: 'As of Date',
      assets: 'Assets',
      liabilities: 'Liabilities',
      equity: 'Equity',
      totalAssets: 'Total Assets',
      totalLiabilities: 'Total Liabilities',
      totalEquity: 'Total Equity',
      totalLiabilitiesEquity: 'Total Liabilities & Equity',
      accountName: 'Account Name',
      balance: 'Balance',
      loading: 'Loading...',
      exportExcel: 'Export Excel',
      print: 'Print',
      subtitle: "Press 'a' to toggle language",
      companyName: 'ZodicERP Company',
      balanced: 'Balance Sheet is Balanced',
      unbalanced: 'Balance Sheet is Unbalanced!',
      diff: 'Difference',
      noData: 'No data available for this date',
    }
  };

  const currentLang = t[lang];
  const isAr = lang === 'ar';

  const renderAccountRows = (nodes, depth = 0) => {
    return nodes.map((node) => (
      <React.Fragment key={node.AccCode}>
        <tr className={`row-depth-${depth} ${node.AccType === 0 ? 'font-bold bg-gray-50/50' : ''} hover:bg-gray-50 transition-colors`}>
          <td className="account-cell py-3" style={{
            paddingLeft: isAr ? '16px' : `${depth * 28 + 16}px`,
            paddingRight: isAr ? `${depth * 28 + 16}px` : '16px'
          }}>
            <div className="flex items-center">
              <span className={`acc-code text-xs font-mono px-2 py-0.5 rounded ${
                node.AccType === 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
              } ${isAr ? 'ml-3' : 'mr-3'}`}>
                {node.AccCode}
              </span>
              <span className={`acc-name ${node.AccType === 0 ? 'text-gray-900 font-bold' : 'text-gray-600'}`}>
                {node.AccName}
              </span>
            </div>
          </td>
          <td className={`text-right balance-cell font-mono py-3 px-6 ${
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

    // Header Info
    rows.push([currentLang.companyName]);
    rows.push([currentLang.title]);
    rows.push([`${currentLang.asOf}: ${asOfDate}`]);
    rows.push([]);

    // Table Header
    rows.push([currentLang.accountName, currentLang.balance]);

    const flatten = (nodes, depth = 0) => {
      nodes.forEach(n => {
        const indent = '    '.repeat(depth);
        rows.push([indent + n.AccCode + ' - ' + n.AccName, n.balance]);
        if (n.children && n.children.length > 0) {
          flatten(n.children, depth + 1);
        }
      });
    };

    // Assets
    rows.push([currentLang.assets.toUpperCase()]);
    flatten(data.assets);
    rows.push([currentLang.totalAssets, data.total_assets]);
    rows.push([]);

    // Liabilities
    rows.push([currentLang.liabilities.toUpperCase()]);
    flatten(data.liabilities);
    rows.push([currentLang.totalLiabilities, data.total_liabilities]);
    rows.push([]);

    // Equity
    rows.push([currentLang.equity.toUpperCase()]);
    flatten(data.equity);
    rows.push([currentLang.totalEquity, data.total_equity]);
    rows.push([]);

    // Total L+E
    rows.push([currentLang.totalLiabilitiesEquity, data.total_liabilities + data.total_equity]);

    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    worksheet['!cols'] = [{ wch: 60 }, { wch: 20 }];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Balance Sheet Detail');
    XLSX.writeFile(workbook, `BS_Detail_${asOfDate}.xlsx`);
  };

  const totalLiabilitiesEquity = (data?.total_liabilities || 0) + (data?.total_equity || 0);
  const diff = (data?.total_assets || 0) - totalLiabilitiesEquity;
  const isBalanced = Math.abs(diff) < 0.01;

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
              <label htmlFor="fr-asof">{currentLang.asOf}</label>
              <input
                id="fr-asof"
                type="date"
                className="fr-input"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
              />
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
                    <th className="fr-th fr-amount-header">{currentLang.balance}</th>
                  </tr>
                </thead>
                <tbody className="fr-table-body">
                  {/* Assets Section */}
                  <tr className="bg-indigo-50/50">
                    <td colSpan="2" className="py-2 px-4 font-bold text-indigo-700 text-sm uppercase">{currentLang.assets}</td>
                  </tr>
                  {renderAccountRows(data.assets)}
                  <tr className="bg-indigo-600 text-white font-bold">
                    <td className="py-3 px-4">{currentLang.totalAssets}</td>
                    <td className="py-3 px-4 text-right">{formatNumber(data.total_assets)}</td>
                  </tr>

                  <tr className="h-8"></tr>

                  {/* Liabilities Section */}
                  <tr className="bg-red-50/50">
                    <td colSpan="2" className="py-2 px-4 font-bold text-red-700 text-sm uppercase">{currentLang.liabilities}</td>
                  </tr>
                  {renderAccountRows(data.liabilities)}
                  <tr className="bg-gray-100 text-gray-800 font-bold">
                    <td className="py-3 px-4">{currentLang.totalLiabilities}</td>
                    <td className="py-3 px-4 text-right">{formatNumber(data.total_liabilities)}</td>
                  </tr>

                  <tr className="h-8"></tr>

                  {/* Equity Section */}
                  <tr className="bg-green-50/50">
                    <td colSpan="2" className="py-2 px-4 font-bold text-green-700 text-sm uppercase">{currentLang.equity}</td>
                  </tr>
                  {renderAccountRows(data.equity)}
                  <tr className="bg-gray-100 text-gray-800 font-bold border-b-2 border-gray-800">
                    <td className="py-3 px-4">{currentLang.totalEquity}</td>
                    <td className="py-3 px-4 text-right">{formatNumber(data.total_equity)}</td>
                  </tr>

                  <tr className="bg-gray-800 text-white font-bold text-lg">
                    <td className="py-4 px-4">{currentLang.totalLiabilitiesEquity}</td>
                    <td className="py-4 px-4 text-right">{formatNumber(totalLiabilitiesEquity)}</td>
                  </tr>
                </tbody>
              </table>

              <div className={`fr-error-banner mt-4 ${isBalanced ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <span className={`material-icons-outlined mr-3 ${isBalanced ? 'text-green-500' : 'text-red-500'}`}>
                  {isBalanced ? 'check_circle' : 'warning'}
                </span>
                <div>
                  <p className={`font-bold ${isBalanced ? 'text-green-800' : 'text-red-800'}`}>
                    {isBalanced ? currentLang.balanced : currentLang.unbalanced}
                  </p>
                  {!isBalanced && (
                    <p className="text-red-600 text-sm">{currentLang.diff}: {formatNumber(diff)}</p>
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
