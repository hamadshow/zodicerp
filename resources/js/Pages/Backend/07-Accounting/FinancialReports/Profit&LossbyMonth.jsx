import React, { useEffect, useState, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import * as XLSX from 'xlsx';
import AdminLayout from '../../components/AdminLayout';
import { apiService } from '../../../../services/api';

export default function ProfitLossByMonth() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [lang, setLang] = useState(document.documentElement.lang || 'ar');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.get(`/reports/profit-loss-month?start_date=${startDate}&end_date=${endDate}`);
      setData(response.data.main);
    } catch (error) {
      console.error('Failed to fetch profit & loss by month:', error);
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
      dashboard: 'لوحة التحكم',
      accounting: 'المحاسبة',
      financialReports: 'التقارير المالية',
      title: 'الأرباح والخسائل حسب الشهر',
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
      companyName: 'شركة زد إي آر بير (ZodicERP)',
      noData: 'لا توجد بيانات متاحة لهذه الفترة',
      month: 'الشهر',
    },
    en: {
      dashboard: 'Dashboard',
      accounting: 'Accounting',
      financialReports: 'Financial Reports',
      title: 'Profit & Loss by Month',
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
      month: 'Month',
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

    XLSX.utils.book_append_sheet(workbook, worksheet, 'P&L by Month');
    XLSX.writeFile(workbook, `Profit_Loss_by_Month_${startDate}_to_${endDate}.xlsx`);
  };

  return (
    <AdminLayout activeMenu="Financial Reports">
      <Head title={`${currentLang.title} - ZodicERP`} />
      <div className={`fr-page profit-loss-page ${isAr ? 'rtl' : 'ltr'}`}>
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
              <label htmlFor="fr-start">{currentLang.period}</label>
              <input
                id="fr-start"
                type="date"
                className="fr-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="fr-form-group">
              <label htmlFor="fr-end">{currentLang.to}</label>
              <input
                id="fr-end"
                type="date"
                className="fr-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
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
              {data.months && (
                <section className="mb-12">
                  <h4 className="section-header-pill bg-blue-50 text-blue-700 px-4 py-2 rounded-full inline-block font-bold mb-4">
                    {currentLang.month}
                  </h4>
                  <table className="fr-table">
                    <thead>
                      <tr>
                        <th className="fr-th">{currentLang.month}</th>
                        <th className="fr-th fr-amount-header">{currentLang.totalIncome}</th>
                        <th className="fr-th fr-amount-header">{currentLang.totalCogs}</th>
                        <th className="fr-th fr-amount-header">{currentLang.totalExpenses}</th>
                        <th className="fr-th fr-amount-header">{currentLang.netIncome}</th>
                      </tr>
                    </thead>
                    <tbody className="fr-table-body">
                      {Object.entries(data.months).map(([month, monthData]) => (
                        <tr key={month}>
                          <td className="py-3 font-mono">{month}</td>
                          <td className="py-3 text-right">{formatNumber(monthData.total_income)}</td>
                          <td className="py-3 text-right">{formatNumber(monthData.total_cogs)}</td>
                          <td className="py-3 text-right">{formatNumber(monthData.total_expenses)}</td>
                          <td className="py-3 text-right font-bold">{formatNumber(monthData.net_income)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}
              <div className="space-y-12">
                {/* Income Section */}
                <div>
                  <h4 className="section-header-pill bg-green-50 text-green-700 px-4 py-2 rounded-full inline-block font-bold mb-4">
                    {currentLang.income}
                  </h4>
                  <table className="fr-table">
                    <thead>
                      <tr>
                        <th className="fr-th">{currentLang.accountName}</th>
                        <th className="fr-th fr-amount-header">{currentLang.balance}</th>
                      </tr>
                    </thead>
                    <tbody className="fr-table-body">
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
                  <table className="fr-table">
                    <thead>
                      <tr>
                        <th className="fr-th">{currentLang.accountName}</th>
                        <th className="fr-th fr-amount-header">{currentLang.balance}</th>
                      </tr>
                    </thead>
                    <tbody className="fr-table-body">
                      {renderAccountRows(data.cogs)}
                      <tr className="total-row-sub font-bold text-gray-800 bg-gray-50">
                        <td className="py-3 px-4">{currentLang.totalCogs}</td>
                        <td className="py-3 px-4 text-right">{formatNumber(data.total_cogs)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Gross Profit */}
                <div className="bg-gray-100 p-4 rounded-lg">
                  <span className="text-lg font-bold text-gray-700">{currentLang.grossProfit}</span>
                  <span className={`text-xl font-bold ${data.gross_profit < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {formatNumber(data.gross_profit)}
                  </span>
                </div>

                {/* Expenses Section */}
                <div>
                  <h4 className="section-header-pill bg-red-50 text-red-700 px-4 py-2 rounded-full inline-block font-bold mb-4">
                    {currentLang.expenses}
                  </h4>
                  <table className="fr-table">
                    <thead>
                      <tr>
                        <th className="fr-th">{currentLang.accountName}</th>
                        <th className="fr-th fr-amount-header">{currentLang.balance}</th>
                      </tr>
                    </thead>
                    <tbody className="fr-table-body">
                      {renderAccountRows(data.expenses)}
                      <tr className="total-row-sub font-bold text-gray-800 bg-gray-50">
                        <td className="py-3 px-4">{currentLang.totalExpenses}</td>
                        <td className="py-3 px-4 text-right">{formatNumber(data.total_expenses)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Net Income */}
                <div className="bg-indigo-600 text-white p-6 rounded-xl shadow-md flex justify-between items-center">
                  <span className="text-2xl font-bold uppercase tracking-wider">{currentLang.netIncome}</span>
                  <span className="text-3xl font-mono font-bold">{formatNumber(data.net_income)}</span>
                </div>
              </div>
            </div>
            <div className="report-footer p-8 border-t border-gray-100 bg-gray-50/50">
              <div className="flex justify-between text-xs text-gray-400">
                <span>{new Date().toLocaleString(isAr ? 'ar-SA' : 'en-US')}</span>
                <span>ZodicERP Financial Reports</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="fr-empty-state">
            <span className="material-icons-outlined">sync</span>
            <p>{currentLang.noData}</p>
          </div>
        )}
      </div>

      <style jsx>{`{
        .profit-loss-page { padding: 40px; background-color: #f9fafb; min-height: 100vh; }
        .rtl { direction: rtl; text-align: right; }
        .ltr { direction: ltr; text-align: left; }
        .fr-breadcrumb { margin-bottom: 16px; }
        .fr-header-card { margin-bottom: 18px; }
        .fr-filters-card { margin-bottom: 18px; }
        .fr-filters-grid { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; align-items: flex-end; }
        .fr-form-group label { font-size: 0.8rem; font-weight: 500; }
        .fr-input { font-size: 0.85rem; }
        .fr-form-actions { justify-content: flex-start; gap: 8px; }
        .account-cell { padding: 8px 12px; font-size: 0.9rem; color: #4b5563; }
        .balance-cell { font-family: 'Courier New', Courier, monospace; font-weight: 500; }
        .font-bold .acc-name { font-weight: 700; color: #111827; }
        .section-header-pill { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .fr-table { font-size: 0.85rem; }
        .fr-table th, .fr-table td { padding: 8px 10px; }
        .fr-table .fr-amount-header { text-align: right; }
        .fr-table .fr-amount { text-align: right; font-variant-numeric: tabular-nums; }
        @media print {
          .fr-page { padding: 0; background: white; }
          .fr-breadcrumb, .fr-header-card, .fr-filters-card, .fr-form-actions { display: none !important; }
          .fr-table-card { box-shadow: none !important; margin: 0 !important; width: 100% !important; max-width: none !important; padding: 0 !important; }
          body { background: white !important; }
          .report-container { border: none !important; }
          .report-body { padding: 0 !important; }
          .section-header-pill {
            border: 1px solid #e5e7eb !important;
            -webkit-print-color-adjust: exact;
          }
        }
        .rtl .fr-breadcrumb { direction: rtl; }
        .rtl .text-left { text-align: right !important; }
        .rtl .text-right { text-align: left !important; }
      `}</style>
    </AdminLayout>
  );
}
