import React, { useEffect, useState, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import * as XLSX from 'xlsx';
import AdminLayout from '../../components/AdminLayout';
import { apiService } from '../../../../services/api';

export default function CashFlowStatement() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [lang, setLang] = useState(document.documentElement.lang || 'ar');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.get(`/reports/cash-flow?start_date=${startDate}&end_date=${endDate}`);
      setData(response.data.main);
    } catch (error) {
      console.error('Failed to fetch cash flow statement:', error);
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
      title: 'قائمة التدفقات النقدية',
      period: 'الفترة من',
      to: 'إلى',
      operating: 'الأنشطة التشغيلية',
      investing: 'الأنشطة الاستثمارية',
      financing: 'الأنشطة التمويلية',
      netCashOperating: 'صافي النقد من الأنشطة التشغيلية',
      netCashInvesting: 'صافي النقد من الأنشطة الاستثمارية',
      netCashFinancing: 'صافي النقد من الأنشطة التمويلية',
      netIncome: 'صافي الدخل',
      adjustments: 'التعديلات لتسوية صافي الدخل',
      toNetCash: 'إلى صافي النقد الناتج عن الأنشطة التشغيلية:',
      netChange: 'صافي التغير في النقد',
      beginningCash: 'النقد في بداية الفترة',
      endingCash: 'النقد في نهاية الفترة',
      accountName: 'اسم الحساب',
      amount: 'المبلغ',
      loading: 'جاري التحميل...',
      exportExcel: 'تصدير إكسل',
      print: 'طباعة',
      subtitle: "اضغط على حرف 'a' للتحويل للغة الإنجليزية",
      companyName: 'شركة زد إي آر بير (ZodicERP)',
      noData: 'لا توجد بيانات متاحة لهذه الفترة',
    },
    en: {
      dashboard: 'Dashboard',
      accounting: 'Accounting',
      financialReports: 'Financial Reports',
      title: 'Cash Flow Statement',
      period: 'Period From',
      to: 'To',
      operating: 'Operating Activities',
      investing: 'Investing Activities',
      financing: 'Financing Activities',
      netCashOperating: 'Net Cash from Operating Activities',
      netCashInvesting: 'Net Cash from Investing Activities',
      netCashFinancing: 'Net Cash from Financing Activities',
      netIncome: 'Net Income',
      adjustments: 'Adjustments to reconcile Net Income',
      toNetCash: 'to net cash provided by operations:',
      netChange: 'Net Change in Cash',
      beginningCash: 'Cash at Beginning of Period',
      endingCash: 'Cash at End of Period',
      accountName: 'Account Name',
      amount: 'Amount',
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

  const handleExportExcel = () => {
    if (!data) return;
    const workbook = XLSX.utils.book_new();
    const rows = [
      [currentLang.companyName],
      [currentLang.title],
      [`${currentLang.period}: ${startDate} ${currentLang.to}: ${endDate}`],
      [],
      [currentLang.accountName, currentLang.amount]
    ];

    const addSection = (title, items, totalLabel, totalValue) => {
      rows.push([title.toUpperCase()]);
      items.forEach(item => rows.push([item.AccName || item.name, item.amount]));
      rows.push([totalLabel, totalValue]);
      rows.push([]);
    };

    addSection(currentLang.operating, data.operating || [], currentLang.netCashOperating, data.net_operating);
    addSection(currentLang.investing, data.investing || [], currentLang.netCashInvesting, data.net_investing);
    addSection(currentLang.financing, data.financing || [], currentLang.netCashFinancing, data.net_financing);

    rows.push([currentLang.netChange, data.net_change]);
    rows.push([currentLang.beginningCash, data.beginning_cash]);
    rows.push([currentLang.endingCash, data.ending_cash]);

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cash Flow');
    XLSX.writeFile(workbook, `Cash_Flow_${startDate}_to_${endDate}.xlsx`);
  };

  return (
    <AdminLayout activeMenu="Financial Reports">
      <Head title={`${currentLang.title} - ZodicERP`} />
      <div className={`fr-page cash-flow-page ${isAr ? 'rtl' : 'ltr'}`}>
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
              <table className="fr-table">
                <thead>
                  <tr>
                    <th className="fr-th">{currentLang.accountName}</th>
                    <th className="fr-th fr-amount-header">{currentLang.amount}</th>
                  </tr>
                </thead>
                <tbody className="fr-table-body">
                  {/* Operating */}
                  <tr>
                    <td colSpan="2" className="fr-table-section-header">{currentLang.operating}</td>
                  </tr>
                  <tr className="font-medium">
                    <td className={`py-2 ${isAr ? 'pr-4' : 'pl-4'}`}>{currentLang.netIncome}</td>
                    <td className="text-right py-2 px-4 font-mono">{formatNumber(data.net_income)}</td>
                  </tr>
                  <tr className="text-gray-600 italic text-sm">
                    <td colSpan="2" className={`py-1 ${isAr ? 'pr-8' : 'pl-8'}`}>{currentLang.adjustments}</td>
                  </tr>
                  <tr className="text-gray-600 italic text-sm">
                    <td colSpan="2" className={`pb-2 ${isAr ? 'pr-8' : 'pl-8'}`}>{currentLang.toNetCash}</td>
                  </tr>
                  {data.operating.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className={`py-1 text-sm text-gray-700 ${isAr ? 'pr-12' : 'pl-12'}`}>
                        <div className="flex items-center">
                          <span className="text-[10px] text-gray-400 font-mono mr-2">{item.AccCode}</span>
                          {item.name}
                        </div>
                      </td>
                      <td className={`text-right py-1 px-4 font-mono text-sm ${item.amount < 0 ? 'text-red-500' : 'text-gray-700'}`}>
                        {formatNumber(item.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-bold border-t border-gray-200 mt-2">
                    <td className={`py-3 ${isAr ? 'pr-4' : 'pl-4'}`}>{currentLang.netCashOperating}</td>
                    <td className="text-right py-3 px-4 font-mono border-t border-gray-900">{formatNumber(data.net_operating)}</td>
                  </tr>

                  {/* Investing */}
                  <tr className="h-8"></tr>
                  <tr>
                    <td colSpan="2" className="fr-table-section-header">{currentLang.investing}</td>
                  </tr>
                  {data.investing.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className={`py-1 text-sm text-gray-700 ${isAr ? 'pr-12' : 'pl-12'}`}>
                        <div className="flex items-center">
                          <span className="text-[10px] text-gray-400 font-mono mr-2">{item.AccCode}</span>
                          {item.name}
                        </div>
                      </td>
                      <td className={`text-right py-1 px-4 font-mono text-sm ${item.amount < 0 ? 'text-red-500' : 'text-gray-700'}`}>
                        {formatNumber(item.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-bold border-t border-gray-200">
                    <td className={`py-3 ${isAr ? 'pr-4' : 'pl-4'}`}>{currentLang.netCashInvesting}</td>
                    <td className="text-right py-3 px-4 font-mono border-t border-gray-900">{formatNumber(data.net_investing)}</td>
                  </tr>

                  {/* Financing */}
                  <tr className="h-8"></tr>
                  <tr>
                    <td colSpan="2" className="fr-table-section-header">{currentLang.financing}</td>
                  </tr>
                  {data.financing.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className={`py-1 text-sm text-gray-700 ${isAr ? 'pr-12' : 'pl-12'}`}>
                        <div className="flex items-center">
                          <span className="text-[10px] text-gray-400 font-mono mr-2">{item.AccCode}</span>
                          {item.name}
                        </div>
                      </td>
                      <td className={`text-right py-1 px-4 font-mono text-sm ${item.amount < 0 ? 'text-red-500' : 'text-gray-700'}`}>
                        {formatNumber(item.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-bold border-t border-gray-200">
                    <td className={`py-3 ${isAr ? 'pr-4' : 'pl-4'}`}>{currentLang.netCashFinancing}</td>
                    <td className="text-right py-3 px-4 font-mono border-t border-gray-900">{formatNumber(data.net_financing)}</td>
                  </tr>

                  {/* Summary */}
                  <tr className="h-8"></tr>
                  <tr className="font-bold border-t-2 border-gray-300">
                    <td className={`py-3 ${isAr ? 'pr-4' : 'pl-4'}`}>{currentLang.netChange}</td>
                    <td className="text-right py-3 px-4 font-mono">{formatNumber(data.net_change)}</td>
                  </tr>
                  <tr className="font-medium">
                    <td className={`py-3 ${isAr ? 'pr-4' : 'pl-4'}`}>{currentLang.beginningCash}</td>
                    <td className="text-right py-3 px-4 font-mono">{formatNumber(data.beginning_cash)}</td>
                  </tr>
                  <tr className="font-bold text-lg">
                    <td className={`py-3 ${isAr ? 'pr-4' : 'pl-4'}`}>{currentLang.endingCash}</td>
                    <td className="text-right py-3 px-4 font-mono">{formatNumber(data.ending_cash)}</td>
                  </tr>
                </tbody>
              </table>
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
        .cash-flow-page { padding: 40px; background-color: #f9fafb; min-height: 100vh; }
        .rtl { direction: rtl; text-align: right; }
        .ltr { direction: ltr; text-align: left; }
        .fr-breadcrumb { margin-bottom: 16px; }
        .fr-header-card { margin-bottom: 18px; }
        .fr-filters-card { margin-bottom: 18px; }
        .fr-filters-grid { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; align-items: flex-end; }
        .fr-form-group label { font-size: 0.8rem; font-weight: 500; }
        .fr-input { font-size: 0.85rem; }
        .fr-form-actions { justify-content: flex-start; gap: 8px; }
        .fr-table-section-header {
          background-color: #eef2ff;
          color: #4338ca;
          font-weight: 700;
          padding: 8px 12px;
          font-size: 0.85rem;
        }
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
        }
        .rtl .fr-breadcrumb { direction: rtl; }
        .rtl .text-left { text-align: right !important; }
        .rtl .text-right { text-align: left !important; }
      `}</style>
    </AdminLayout>
  );
}
