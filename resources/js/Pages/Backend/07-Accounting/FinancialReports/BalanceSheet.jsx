import React, { useEffect, useState, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import * as XLSX from 'xlsx';
import AdminLayout from '../../components/AdminLayout';
import { apiService } from '../../../../services/api';

export default function BalanceSheet() {
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
      console.error('Failed to fetch balance sheet:', error);
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
      title: 'الميزانية العمومية',
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
      balanced: 'الميزانية متوازنة',
      unbalanced: 'الميزانية غير متوازنة!',
      diff: 'الفرق',
      companyName: 'شركة زد إي آر بي (ZodicERP)',
      noData: 'لا توجد بيانات متاحة لهذا التاريخ',
    },
    en: {
      title: 'Balance Sheet',
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
      balanced: 'Balance Sheet is Balanced',
      unbalanced: 'Balance Sheet is Unbalanced!',
      diff: 'Difference',
      companyName: 'ZodicERP Company',
      noData: 'No data available for this date',
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
    rows.push([`${currentLang.asOf}: ${asOfDate}`]);
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
    
    // Set column widths
    worksheet['!cols'] = [{ wch: 60 }, { wch: 20 }];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Balance Sheet');
    XLSX.writeFile(workbook, `Balance_Sheet_${asOfDate}.xlsx`);
  };

  const totalLiabilitiesEquity = (data?.total_liabilities || 0) + (data?.total_equity || 0);
  const diff = (data?.total_assets || 0) - totalLiabilitiesEquity;
  const isBalanced = Math.abs(diff) < 0.01;

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
            <div className="date-picker-group">
              <label className="text-sm font-medium text-gray-700">{currentLang.asOf}</label>
              <input 
                type="date" 
                value={asOfDate} 
                onChange={(e) => setAsOfDate(e.target.value)}
                className="form-input rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
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
              <p className="text-gray-500 mt-1 font-medium">{currentLang.asOf}: {asOfDate}</p>
            </div>

            <div className="report-body p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Left Side: Assets */}
                <div className="assets-column">
                  <h4 className="section-header-pill bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full inline-block font-bold mb-4">
                    {currentLang.assets}
                  </h4>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-100 text-gray-400 text-xs uppercase tracking-wider">
                        <th className="text-left py-3 font-semibold">{currentLang.accountName}</th>
                        <th className="text-right py-3 font-semibold">{currentLang.balance}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {renderAccountRows(data.assets)}
                      <tr className="total-row-highlight bg-indigo-600 text-white font-bold">
                        <td className="py-4 px-4 rounded-l-md">{currentLang.totalAssets}</td>
                        <td className="py-4 px-4 text-right rounded-r-md">{formatNumber(data.total_assets)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Right Side: Liabilities & Equity */}
                <div className="liabilities-equity-column">
                  <h4 className="section-header-pill bg-red-50 text-red-700 px-4 py-2 rounded-full inline-block font-bold mb-4">
                    {currentLang.liabilities}
                  </h4>
                  <table className="w-full mb-8">
                    <tbody className="divide-y divide-gray-50">
                      {renderAccountRows(data.liabilities)}
                      <tr className="total-row-sub font-bold text-gray-800 bg-gray-50">
                        <td className="py-3 px-4">{currentLang.totalLiabilities}</td>
                        <td className="py-3 px-4 text-right">{formatNumber(data.total_liabilities)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <h4 className="section-header-pill bg-green-50 text-green-700 px-4 py-2 rounded-full inline-block font-bold mb-4">
                    {currentLang.equity}
                  </h4>
                  <table className="w-full">
                    <tbody className="divide-y divide-gray-50">
                      {renderAccountRows(data.equity)}
                      <tr className="total-row-sub font-bold text-gray-800 bg-gray-50">
                        <td className="py-3 px-4">{currentLang.totalEquity}</td>
                        <td className="py-3 px-4 text-right">{formatNumber(data.total_equity)}</td>
                      </tr>
                      <tr className="h-8"></tr>
                      <tr className="total-row-highlight bg-gray-800 text-white font-bold">
                        <td className="py-4 px-4 rounded-l-md">{currentLang.totalLiabilitiesEquity}</td>
                        <td className="py-4 px-4 text-right rounded-r-md">{formatNumber(totalLiabilitiesEquity)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

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
                      <p className="text-red-600 text-sm">{currentLang.diff}: {formatNumber(diff)}</p>
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
          .balance-sheet-page { padding: 0 !important; background: white !important; }
          .AdminLayout__Sidebar, .AdminLayout__Header { display: none !important; }
          body { background: white !important; }
          .report-container { border: none !important; }
          .report-body { padding: 0 !important; }
          .grid { display: block !important; }
          .assets-column, .liabilities-equity-column { width: 100% !important; margin-bottom: 40px; }
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
