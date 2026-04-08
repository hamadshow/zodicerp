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
      companyName: 'شركة زد إي آر بي (ZodicERP)',
      noData: 'لا توجد بيانات متاحة لهذه الفترة',
    },
    en: {
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
      <div className={`financial-reports-page cash-flow-page ${isAr ? 'rtl' : 'ltr'}`}>
        <Head title={`${currentLang.title} - ZodicERP`} />

        <div className="report-header no-print flex justify-between items-center p-4 bg-gray-50 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{currentLang.title}</h1>
            <p className="text-sm text-gray-500">{currentLang.subtitle}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded border-gray-300 p-1 text-sm" />
              <span>{currentLang.to}</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded border-gray-300 p-1 text-sm" />
            </div>
            <button onClick={handleExportExcel} className="flex items-center px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50">
              <span className="material-icons-outlined text-base mr-1">file_download</span>{currentLang.exportExcel}
            </button>
            <button onClick={() => window.print()} className="flex items-center px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">
              <span className="material-icons-outlined text-base mr-1">print</span>{currentLang.print}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <span className="ml-3 text-lg text-gray-600">{currentLang.loading}</span>
          </div>
        ) : data ? (
          <div className="report-container print-section shadow-lg bg-white rounded-lg overflow-hidden max-w-5xl mx-auto my-8">
            <div className="report-top-banner p-8 border-b border-gray-100 text-center">
              <h2 className="text-3xl font-bold text-indigo-700 uppercase tracking-wider">{currentLang.companyName}</h2>
              <h3 className="text-xl font-semibold text-gray-700 mt-2 uppercase">{currentLang.title}</h3>
              <p className="text-gray-500 mt-1 font-medium">{currentLang.period}: {startDate} {currentLang.to}: {endDate}</p>
            </div>

            <div className="report-body p-8 space-y-8">
              {/* Operating */}
              <section>
                <h4 className="font-bold text-blue-900 border-b pb-2 mb-4 text-sm uppercase tracking-wider">{currentLang.operating}</h4>
                <table className="w-full">
                  <tbody>
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
                  </tbody>
                </table>
              </section>

              {/* Investing */}
              <section>
                <h4 className="font-bold text-blue-900 border-b pb-2 mb-4 text-sm uppercase tracking-wider">{currentLang.investing}</h4>
                <table className="w-full">
                  <tbody>
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
                  </tbody>
                </table>
              </section>

              {/* Financing */}
              <section>
                <h4 className="font-bold text-blue-900 border-b pb-2 mb-4 text-sm uppercase tracking-wider">{currentLang.financing}</h4>
                <table className="w-full">
                  <tbody>
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
                  </tbody>
                </table>
              </section>

              {/* Summary */}
              <section className="pt-6 border-t-2 border-gray-300 space-y-3">
                <div className="flex justify-between font-bold text-sm">
                  <span className="uppercase">{currentLang.netChange}</span>
                  <span className={data.net_change < 0 ? 'text-red-600' : 'text-gray-900'}>{formatNumber(data.net_change)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{currentLang.beginningCash}</span>
                  <span className="font-mono border-b border-gray-400">{formatNumber(data.beginning_cash)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg text-blue-900 pt-2">
                  <span>{currentLang.endingCash}</span>
                  <span className="font-mono border-b-4 border-double border-gray-900">{formatNumber(data.ending_cash)}</span>
                </div>
              </section>
            </div>
          </div>
        ) : (
          <div className="text-center p-20 text-gray-500 bg-white rounded-lg shadow-sm m-8">{currentLang.noData}</div>
        )}
      </div>
    </AdminLayout>
  );
}
