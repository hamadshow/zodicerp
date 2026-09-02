import React, { useEffect, useState, useCallback } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import * as XLSX from 'xlsx';
import AdminLayout from '../../components/AdminLayout';
import { apiService } from '../../../../services/api';

export default function BalanceSheet() {
  const { props } = usePage();
  const localization = props.localization || {};
  const translations = localization.translations || {};
  const currentLocale = localization.current_locale || 'ar';
  
  const t = (key, fallback) => {
    // Try to find the key in FinancialReports first, then fall back to the provided fallback
    return translations[`FinancialReports.${key}`] || translations[key] || fallback;
  };

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [lang] = useState(currentLocale);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [collapsedNodes, setCollapsedNodes] = useState({});

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

  const toggleNode = (code) => {
    setCollapsedNodes(prev => ({
      ...prev,
      [code]: !prev[code]
    }));
  };

  const formatNumber = (num) => {
    if (num === 0 || num === null || num === undefined) return '-';
    return new Intl.NumberFormat(currentLocale === 'ar' ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const isAr = lang === 'ar';

  const renderAccountRows = (nodes, depth = 0) => {
    if (!nodes) return null;
    return nodes.map((node) => {
      const isParent = node.children && node.children.length > 0;
      const isCollapsed = collapsedNodes[node.AccCode];
      const hasBalance = node.balance !== 0;

      return (
        <React.Fragment key={node.AccCode}>
          <tr className={`
            report-row 
            depth-${depth} 
            ${isParent ? 'parent-row' : 'leaf-row'} 
            ${depth === 0 ? 'root-row' : ''}
          `}>
            <td 
              className="name-cell" 
              style={{ 
                paddingInlineStart: `${depth * 24 + (isParent ? 0 : 32)}px` 
              }}
            >
              <div className="flex items-center gap-2">
                {isParent && (
                  <button 
                    onClick={() => toggleNode(node.AccCode)}
                    className="toggle-btn"
                  >
                    <span className="material-icons-outlined text-sm">
                      {isCollapsed ? 'chevron_right' : 'expand_more'}
                    </span>
                  </button>
                )}
                <span className="acc-name">{node.AccName}</span>
              </div>
            </td>
            <td className={`balance-cell ${node.balance < 0 ? 'negative' : ''}`}>
              {hasBalance ? formatNumber(node.balance) : ''}
            </td>
          </tr>
          {isParent && !isCollapsed && renderAccountRows(node.children, depth + 1)}
          
          {/* Summary Row for Parents */}
          {isParent && !isCollapsed && (
            <tr className={`summary-row depth-${depth}`}>
              <td className="name-cell" style={{ paddingInlineStart: `${depth * 24 + 32}px` }}>
                <span className="summary-label">{t('total', 'Total')} {node.AccName}</span>
              </td>
              <td className={`balance-cell summary-balance ${node.balance < 0 ? 'negative' : ''}`}>
                {formatNumber(node.balance)}
              </td>
            </tr>
          )}
        </React.Fragment>
      );
    });
  };

  const handleExportExcel = () => {
    if (!data) return;
    const workbook = XLSX.utils.book_new();
    const rows = [];
    rows.push([t('company_name', 'ZodicERP Company')]);
    rows.push([t('balance_sheet', 'Balance Sheet')]);
    rows.push([`${t('as_of', 'As of')}: ${asOfDate}`]);
    rows.push([]);
    
    const flatten = (nodes, depth = 0) => {
      nodes.forEach(n => {
        const indent = '    '.repeat(depth);
        rows.push([indent + n.AccName, n.balance]);
        if (n.children && n.children.length > 0) {
          flatten(n.children, depth + 1);
        }
      });
    };

    rows.push([t('assets', 'Assets').toUpperCase()]);
    flatten(data.assets);
    rows.push([t('total_assets', 'Total Assets'), data.total_assets]);
    rows.push([]);
    rows.push([t('liabilities', 'Liabilities').toUpperCase()]);
    flatten(data.liabilities);
    rows.push([t('total_liabilities', 'Total Liabilities'), data.total_liabilities]);
    rows.push([]);
    rows.push([t('equity', 'Equity').toUpperCase()]);
    flatten(data.equity);
    rows.push([t('total_equity', 'Total Equity'), data.total_equity]);

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Balance Sheet');
    XLSX.writeFile(workbook, `Balance_Sheet_${asOfDate}.xlsx`);
  };

  const totalLiabilitiesEquity = (data?.total_liabilities || 0) + (data?.total_equity || 0);
  const diff = (data?.total_assets || 0) - totalLiabilitiesEquity;
  const isBalanced = Math.abs(diff) < 0.01;

  return (
    <AdminLayout activeMenu="Financial Reports">
      <div className={`qbo-report-page ${isAr ? 'rtl' : 'ltr'}`}>
        <Head title={`${t('balance_sheet', 'Balance Sheet')} - ZodicERP`} />

        {/* 1. Breadcrumbs & Top Actions */}
        <div className="report-top-nav no-print">
          <div className="breadcrumb">
            <span className="item">{t('reports', 'Reports')}</span>
            <span className="sep material-icons-outlined">chevron_right</span>
            <span className="item active">{t('balance_sheet', 'Balance Sheet')}</span>
          </div>
          <div className="top-actions">
            <button className="action-link" onClick={() => router.get(route('admin.accounting.financial-reports'))}>
              {t('back_to_report_list', 'Back to report list')}
            </button>
          </div>
        </div>

        {/* 2. Main Title Area */}
        <div className="report-header-area no-print">
          <h1 className="report-title">{t('balance_sheet', 'Balance Sheet')}</h1>
          <div className="header-buttons">
            <button className="btn-outline">{t('customize', 'Customize')}</button>
            <button className="btn-primary">{t('save_customization', 'Save customization')}</button>
          </div>
        </div>

        {/* 3. Filter/Action Bar */}
        <div className="report-filter-bar no-print">
          <div className="filter-group">
            <div className="field">
              <label>{t('report_period', 'Report period')}</label>
              <select defaultValue="Custom" className="qbo-select">
                <option value="All">{t('all_dates', 'All Dates')}</option>
                <option value="Custom">{t('custom', 'Custom')}</option>
                <option value="This Month">{t('this_month', 'This Month')}</option>
                <option value="This Year">{t('this_year', 'This Year')}</option>
              </select>
            </div>
            <div className="field">
              <label>{t('as_of', 'As of')}</label>
              <input 
                type="date" 
                className="qbo-date-input"
                value={asOfDate} 
                onChange={(e) => setAsOfDate(e.target.value)} 
              />
            </div>
          </div>
          <div className="bar-actions">
            <button className="btn-run" onClick={fetchData}>{t('run_report', 'Run report')}</button>
          </div>
        </div>

        {/* 4. The "Paper" Report Container */}
        <div className="report-paper-container">
          <div className="report-paper-actions no-print">
            <div className="left-tools">
              <button onClick={() => setCollapsedNodes({})}>{t('expand_all', 'Expand all')}</button>
              <button onClick={() => {
                const all = {};
                const walk = (nodes) => nodes.forEach(n => { if(n.children) { all[n.AccCode] = true; walk(n.children); }});
                if(data) { walk(data.assets); walk(data.liabilities); walk(data.equity); }
                setCollapsedNodes(all);
              }}>{t('collapse_all', 'Collapse all')}</button>
            </div>
            <div className="right-tools">
              <button title={t('print', 'Print')} onClick={() => window.print()}>
                <span className="material-icons-outlined">print</span>
              </button>
              <button title={t('export', 'Export')} onClick={handleExportExcel}>
                <span className="material-icons-outlined">ios_share</span>
              </button>
              <button title={t('settings', 'Settings')}>
                <span className="material-icons-outlined">settings</span>
              </button>
            </div>
          </div>

          <div className="report-content-paper shadow-xl">
            {/* Report Header (Inside Paper) */}
            <div className="inner-header">
              <h2 className="company-name">{t('company_name', 'ZodicERP Company')}</h2>
              <h3 className="report-type">{t('balance_sheet', 'Balance Sheet')}</h3>
              <p className="report-date">{t('as_of', 'As of')} {asOfDate}</p>
            </div>

            {loading ? (
              <div className="report-loading">
                <div className="spinner"></div>
                <p>{t('loading_data', 'Loading your financial data...')}</p>
              </div>
            ) : data ? (
              <div className="report-table-wrapper">
                <table className="qbo-table">
                  <thead>
                    <tr>
                      <th className="name-col"></th>
                      <th className="total-col">{t('total_column', 'TOTAL')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* ASSETS SECTION */}
                    <tr className="section-header-row">
                      <td colSpan="2">{t('assets', 'ASSETS')}</td>
                    </tr>
                    {renderAccountRows(data.assets)}
                    <tr className="grand-total-row">
                      <td className="name-cell">{t('total_assets', 'Total Assets')}</td>
                      <td className="balance-cell">{formatNumber(data.total_assets)}</td>
                    </tr>

                    <tr className="spacer-row"></tr>

                    {/* LIABILITIES SECTION */}
                    <tr className="section-header-row">
                      <td colSpan="2">{t('liabilities', 'LIABILITIES')}</td>
                    </tr>
                    {renderAccountRows(data.liabilities)}
                    <tr className="grand-total-row sub-grand">
                      <td className="name-cell">{t('total_liabilities', 'Total Liabilities')}</td>
                      <td className="balance-cell">{formatNumber(data.total_liabilities)}</td>
                    </tr>

                    <tr className="spacer-row"></tr>

                    {/* EQUITY SECTION */}
                    <tr className="section-header-row">
                      <td colSpan="2">{t('equity', 'EQUITY')}</td>
                    </tr>
                    {renderAccountRows(data.equity)}
                    <tr className="grand-total-row sub-grand">
                      <td className="name-cell">{t('total_equity', 'Total Equity')}</td>
                      <td className="balance-cell">{formatNumber(data.total_equity)}</td>
                    </tr>

                    <tr className="spacer-row"></tr>

                    {/* TOTAL L+E */}
                    <tr className="grand-total-row final-total">
                      <td className="name-cell">{t('total_liabilities_equity', 'TOTAL LIABILITIES AND EQUITY')}</td>
                      <td className="balance-cell">{formatNumber(totalLiabilitiesEquity)}</td>
                    </tr>
                  </tbody>
                </table>

                {!isBalanced && (
                  <div className="unbalanced-warning no-print">
                    <span className="material-icons-outlined">warning</span>
                    <span>{t('unbalanced_msg', 'The balance sheet is out of balance by')}: {formatNumber(diff)}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-data-msg">
                {t('no_data_found', 'No data found for the selected period.')}
              </div>
            )}

            <div className="inner-footer">
              <p>{new Date().toLocaleString(currentLocale === 'ar' ? 'ar-SA' : 'en-US', { dateStyle: 'full', timeStyle: 'short' })}</p>
              <p>{t('accrual_basis', 'Accrual Basis')}</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        /* QuickBooks Online 2026 - Ultra Clean Redesign */
        :root {
          --qbo-green: #2ca01c;
          --qbo-blue: #0077c5;
          --qbo-gray-bg: #f4f5f8;
          --qbo-border: #d4d7dc;
          --qbo-text: #393a3d;
          --qbo-text-light: #6b6c72;
          --qbo-negative: #d52b1e;
          --paper-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
        }

        .qbo-report-page {
          background-color: var(--qbo-gray-bg);
          min-height: 100vh;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: var(--qbo-text);
          padding-bottom: 80px;
        }

        /* 1. Top Navigation Bar */
        .report-top-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 32px;
          background: #fff;
          border-bottom: 1px solid var(--qbo-border);
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .report-top-nav .breadcrumb { 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          font-size: 13px; 
          color: var(--qbo-text-light);
        }
        .report-top-nav .breadcrumb .sep { color: #babec5; }
        .report-top-nav .breadcrumb .active { font-weight: 600; color: var(--qbo-text); }
        .report-top-nav .action-link { 
          color: var(--qbo-blue); 
          font-weight: 600; 
          font-size: 13px; 
          text-decoration: none;
          background: none;
          border: none;
          cursor: pointer;
        }
        .report-top-nav .action-link:hover { text-decoration: underline; }

        /* 2. Header Area */
        .report-header-area {
          padding: 32px 32px 24px 32px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          max-width: 1200px;
          margin: 0 auto;
        }
        .report-title { 
          font-size: 28px; 
          font-weight: 300; 
          color: var(--qbo-text); 
          margin: 0;
        }
        .header-buttons { display: flex; gap: 12px; }
        
        .btn-outline { 
          padding: 8px 20px; 
          border: 1px solid var(--qbo-border); 
          border-radius: 20px; 
          font-weight: 600; 
          background: #fff; 
          color: var(--qbo-text);
          cursor: pointer; 
          font-size: 14px;
          transition: all 0.2s;
        }
        .btn-outline:hover { background: #f4f5f8; border-color: #babec5; }
        
        .btn-primary { 
          padding: 8px 24px; 
          background: var(--qbo-green); 
          color: #fff; 
          border: none; 
          border-radius: 20px; 
          font-weight: 600; 
          cursor: pointer; 
          font-size: 14px;
          transition: background 0.2s;
        }
        .btn-primary:hover { background: #238416; }

        /* 3. Filter Bar - Modernized */
        .report-filter-bar {
          margin: 0 32px 32px 32px;
          background: #fff;
          padding: 24px;
          border-radius: 8px;
          border: 1px solid var(--qbo-border);
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          max-width: 1200px;
          margin-left: auto;
          margin-right: auto;
        }
        .filter-group { display: flex; gap: 32px; flex-wrap: wrap; }
        .filter-group .field { display: flex; flex-direction: column; gap: 6px; }
        .filter-group label { font-size: 11px; font-weight: 700; color: var(--qbo-text-light); text-transform: uppercase; letter-spacing: 0.5px; }
        
        .filter-group select, .filter-group input[type="date"] { 
          padding: 10px 12px; 
          border: 1px solid #babec5; 
          border-radius: 4px; 
          min-width: 180px; 
          font-size: 14px;
          outline: none;
        }
        .filter-group select:focus, .filter-group input:focus { border-color: var(--qbo-blue); box-shadow: 0 0 0 2px rgba(0,119,197,0.1); }
        
        .radio-group { display: flex; border: 1px solid #babec5; border-radius: 4px; overflow: hidden; background: #fff; }
        .radio-group label { 
          padding: 10px 20px; 
          cursor: pointer; 
          font-size: 14px; 
          margin: 0; 
          background: #f4f5f8; 
          border-right: 1px solid #babec5; 
          color: var(--qbo-text); 
          font-weight: 400;
          transition: all 0.2s;
        }
        .radio-group label:last-child { border-right: none; }
        .radio-group label.active { background: #fff; font-weight: 700; color: var(--qbo-blue); }
        .radio-group input { display: none; }

        .btn-run { 
          padding: 10px 32px; 
          border: 1px solid #babec5; 
          border-radius: 20px; 
          font-weight: 700; 
          background: #fff; 
          cursor: pointer; 
          font-size: 14px;
          color: var(--qbo-text);
          transition: all 0.2s;
        }
        .btn-run:hover { background: #f4f5f8; border-color: var(--qbo-text); }

        /* 4. Paper Container */
        .report-paper-container {
          margin: 0 32px;
          max-width: 1100px;
          margin-left: auto;
          margin-right: auto;
        }
        .report-paper-actions {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          padding: 0 8px;
        }
        .left-tools button { 
          background: none; 
          border: none; 
          color: var(--qbo-blue); 
          font-size: 14px; 
          margin-right: 20px; 
          cursor: pointer; 
          font-weight: 600;
          padding: 0;
        }
        .left-tools button:hover { text-decoration: underline; }
        
        .right-tools { display: flex; gap: 16px; }
        .right-tools button { 
          background: none; 
          border: none; 
          color: var(--qbo-text-light); 
          cursor: pointer; 
          display: flex; 
          align-items: center;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s;
        }
        .right-tools button:hover { color: var(--qbo-text); background: rgba(0,0,0,0.05); }

        .report-content-paper {
          background: #fff;
          padding: 60px 80px;
          min-height: 1000px;
          position: relative;
          box-shadow: var(--paper-shadow);
          border-radius: 2px;
        }

        .inner-header { text-align: center; margin-bottom: 48px; }
        .company-name { font-size: 20px; font-weight: 800; margin-bottom: 6px; color: #000; }
        .report-type { font-size: 24px; font-weight: 400; margin-bottom: 6px; color: var(--qbo-text); }
        .report-date { font-size: 15px; color: var(--qbo-text-light); }

        /* Table Styling - Clean & Modern */
        .qbo-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
        .qbo-table th { 
          border-bottom: 1px solid var(--qbo-text); 
          padding: 12px 8px; 
          font-size: 12px; 
          font-weight: 800; 
          text-align: right; 
          color: var(--qbo-text);
          text-transform: uppercase;
        }
        .qbo-table .name-col { text-align: left; width: 75%; }
        
        .section-header-row td { 
          padding: 32px 8px 12px 8px; 
          font-weight: 800; 
          font-size: 15px; 
          text-transform: uppercase;
          color: #000;
        }
        
        .report-row { transition: background 0.15s; }
        .report-row:hover { background: #f9f9f9; }
        .report-row td { padding: 10px 8px; font-size: 14px; border-bottom: 1px solid #f0f0f0; }
        .parent-row { font-weight: 700; }
        .balance-cell { text-align: right; white-space: nowrap; font-family: 'Inter', monospace; }
        .balance-cell.negative { color: var(--qbo-negative); }
        
        .summary-row td { 
          padding: 12px 8px; 
          font-size: 14px; 
          font-weight: 700; 
          border-top: 1px solid var(--qbo-border); 
          color: var(--qbo-text);
        }
        .summary-label { font-style: normal; }
        
        .grand-total-row td { 
          padding: 20px 8px; 
          font-weight: 800; 
          font-size: 15px; 
          border-top: 1px solid var(--qbo-text); 
          border-bottom: 2px solid var(--qbo-text); 
          color: #000;
        }
        .final-total td { 
          font-size: 18px; 
          border-bottom: 4px double var(--qbo-text); 
          padding: 24px 8px;
        }
        .spacer-row { height: 32px; }

        .toggle-btn { 
          background: none; 
          border: none; 
          padding: 0; 
          cursor: pointer; 
          color: var(--qbo-text-light); 
          display: flex; 
          align-items: center;
          transition: color 0.2s;
        }
        .toggle-btn:hover { color: var(--qbo-blue); }

        .inner-footer { 
          margin-top: 80px; 
          border-top: 1px solid var(--qbo-border); 
          padding-top: 24px; 
          font-size: 13px; 
          color: var(--qbo-text-light); 
          display: flex; 
          justify-content: space-between;
        }

        .unbalanced-warning {
          margin: 32px 0; 
          padding: 16px; 
          background: #fff8f8; 
          border: 1px solid var(--qbo-negative);
          color: var(--qbo-negative); 
          border-radius: 8px; 
          display: flex; 
          align-items: center; 
          gap: 12px; 
          font-weight: 700;
          font-size: 15px;
        }

        /* RTL Specifics - Perfected */
        .rtl { direction: rtl; }
        .rtl .qbo-table .name-col { text-align: right; }
        .rtl .qbo-table .total-col { text-align: left; }
        .rtl .balance-cell { text-align: left; }
        .rtl .left-tools button { margin-right: 0; margin-left: 24px; }
        .rtl .toggle-btn span { transform: rotate(180deg); }
        .rtl .toggle-btn[style*="expand_more"] span { transform: rotate(0deg); }
        
        .rtl .breadcrumb .sep { transform: rotate(180deg); }

        @media print {
          .no-print { display: none !important; }
          .qbo-report-page { padding: 0; background: #fff; }
          .report-paper-container { margin: 0; width: 100%; max-width: none; }
          .report-content-paper { box-shadow: none !important; padding: 40px; }
          .inner-header { margin-top: 0; }
          .report-top-nav { display: none; }
        }

        /* Spinner Modern */
        .report-loading { text-align: center; padding: 150px 0; }
        .spinner { 
          width: 50px; height: 50px; 
          border: 3px solid rgba(44, 160, 28, 0.1); 
          border-top: 3px solid var(--qbo-green); 
          border-radius: 50%; 
          animation: spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite; 
          margin: 0 auto 20px auto;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </AdminLayout>
  );
}
