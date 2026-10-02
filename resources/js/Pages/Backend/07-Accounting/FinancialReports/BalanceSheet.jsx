import React, { useEffect, useState, useCallback } from 'react';
import { Head, usePage } from '@inertiajs/react';
import * as XLSX from 'xlsx';
import AdminLayout from '../../components/AdminLayout';
import { apiService } from '../../../../services/api';

export default function BalanceSheet() {
  const { props } = usePage();
  const localization = props.localization || {};
  const translations = localization.translations || {};
  const currentLocale = localization.current_locale || route().params.lang || 'ar';
  const financialReportsRoute = () => route('admin.financial-reports.index', {
    country: localization.country_code || route().params.country || 'sa',
    lang: currentLocale,
  });

  const t = (key, fallback) => {
    return translations[`FinancialReports.${key}`] || translations[key] || fallback;
  };

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  // lang is read from the route during initial render and passed to formatNumber via currentLocale
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
      <Head title={`${t('balance_sheet', 'Balance Sheet')} - ZodicERP`} />
      <div className="fr-page">
        <div className="fr-breadcrumb">
          <a href="#">{t('dashboard', 'Dashboard')}</a>
          <span className="fr-sep">/</span>
          <a href="#">{t('accounting', 'Accounting')}</a>
          <span className="fr-sep">/</span>
          <a href={financialReportsRoute()}>{t('financial_reports', 'Financial Reports')}</a>
          <span className="fr-sep">/</span>
          <span className="fr-current">{t('balance_sheet', 'Balance Sheet')}</span>
        </div>

        <div className="fr-header-card">
          <div>
            <h1 className="fr-title">{t('balance_sheet', 'Balance Sheet')}</h1>
            <p className="fr-subtitle">
              {t('balance_sheet_desc', 'Statement of assets, liabilities, and equity as of a specific date.')}
            </p>
          </div>
        </div>

        <div className="fr-filters-card">
          <div className="fr-filters-grid">
            <div className="fr-form-group">
              <label htmlFor="fr-asof">{t('as_of', 'As of')}</label>
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
              className="btn btn-primary fr-btn"
              onClick={fetchData}
            >
              <span className="material-icons-outlined">refresh</span>
              <span>{t('run_report', 'Run report')}</span>
            </button>
            <button
              type="button"
              className="btn btn-excel fr-btn"
              onClick={handleExportExcel}
            >
              <span className="material-icons-outlined">description</span>
              <span>{t('export_excel', 'Export Excel')}</span>
            </button>
          </div>
        </div>

        {loading && <div className="fr-loading-banner fr-error-banner">{t('loading_data', 'Loading your financial data...')}</div>}

        <div className="fr-table-card">
          <div className="fr-table-wrapper">
            <table className="fr-table">
              <thead>
                <tr>
                  <th className="fr-th">{t('account_name', 'Account Name')}</th>
                  <th className="fr-th fr-amount-header">{t('balance', 'Balance')}</th>
                </tr>
              </thead>
              <tbody>
                {/* ASSETS SECTION */}
                <tr className="section-header-row">
                  <td colSpan="2">{t('assets', 'ASSETS')}</td>
                </tr>
                {renderAccountRows(data?.assets)}
                {data?.assets && (
                  <tr className="grand-total-row">
                    <td className="name-cell">{t('total_assets', 'Total Assets')}</td>
                    <td className="balance-cell">{formatNumber(data.total_assets)}</td>
                  </tr>
                )}

                <tr className="spacer-row"></tr>

                {/* LIABILITIES SECTION */}
                <tr className="section-header-row">
                  <td colSpan="2">{t('liabilities', 'LIABILITIES')}</td>
                </tr>
                {renderAccountRows(data?.liabilities)}
                {data?.liabilities && (
                  <tr className="grand-total-row sub-grand">
                    <td className="name-cell">{t('total_liabilities', 'Total Liabilities')}</td>
                    <td className="balance-cell">{formatNumber(data.total_liabilities)}</td>
                  </tr>
                )}

                <tr className="spacer-row"></tr>

                {/* EQUITY SECTION */}
                <tr className="section-header-row">
                  <td colSpan="2">{t('equity', 'EQUITY')}</td>
                </tr>
                {renderAccountRows(data?.equity)}
                {data?.equity && (
                  <tr className="grand-total-row sub-grand">
                    <td className="name-cell">{t('total_equity', 'Total Equity')}</td>
                    <td className="balance-cell">{formatNumber(data.total_equity)}</td>
                  </tr>
                )}

                <tr className="spacer-row"></tr>

                {/* TOTAL L+E */}
                {data && (
                  <tr className="grand-total-row final-total">
                    <td className="name-cell">{t('total_liabilities_equity', 'TOTAL LIABILITIES AND EQUITY')}</td>
                    <td className="balance-cell">{formatNumber(totalLiabilitiesEquity)}</td>
                  </tr>
                )}
              </tbody>
            </table>
            {!isBalanced && (
              <div className="fr-error-banner">
                <span className="material-icons-outlined">warning</span>
                <span>{t('unbalanced_msg', 'The balance sheet is out of balance by')}: {formatNumber(diff)}</span>
              </div>
            )}
          </div>
        </div>

        {!loading && data && !isBalanced && (
          <div className="fr-error-banner">
            <span className="material-icons-outlined">warning</span>
            <span>{t('unbalanced_msg', 'The balance sheet is out of balance by')}: {formatNumber(diff)}</span>
          </div>
        )}

        {!loading && data && isBalanced && (
          <div className="fr-empty-state">
            <span className="material-icons-outlined">check_circle</span>
            <p>{t('balanced', 'The balance sheet is balanced.')}</p>
          </div>
        )}
      </div>

      <style jsx global>{`{
        /* Financial Reports design tokens */
        --fr-surface: #ffffff;
        --fr-surface-alt: #f8fafc;
        --fr-border: #e2e8f0;
        --fr-border-strong: #cbd5e1;
        --fr-text: #1e293b;
        --fr-text-light: #64748b;
        --fr-text-lighter: #94a3b8;
        --fr-accent: #1e88e5;
        --fr-success: #2e7d32;
        --fr-shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1);
        --fr-shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
        --fr-radius: 10px;
        --fr-input-height: 36px;
        --fr-btn-height: 36px;
        --fr-font-mono: SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
      }
      .fr-page {
        padding: 24px;
        background-color: #f8fafc;
        min-height: 100vh;
      }
      .fr-breadcrumb {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.85rem;
        color: var(--fr-text-light);
        margin-bottom: 16px;
      }
      .fr-breadcrumb a {
        color: var(--primary-color);
        font-weight: 500;
        text-decoration: none;
      }
      .fr-breadcrumb a:hover {
        text-decoration: underline;
      }
      .fr-breadcrumb .fr-sep {
        color: var(--fr-text-lighter);
      }
      .fr-breadcrumb .fr-current {
        font-weight: 600;
        color: var(--fr-text);
      }
      .fr-header-card {
        background-color: var(--fr-surface);
        border-radius: var(--fr-radius);
        box-shadow: var(--fr-shadow-md);
        border: 1px solid var(--fr-border);
        padding: 16px 18px;
        margin-bottom: 18px;
      }
      .fr-header-card .fr-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--fr-text);
        margin: 0 0 4px;
      }
      .fr-header-card .fr-subtitle {
        font-size: 0.9rem;
        color: var(--fr-text-light);
        margin: 0;
      }
      .fr-filters-card {
        background-color: var(--fr-surface);
        border-radius: var(--fr-radius);
        box-shadow: var(--fr-shadow-md);
        border: 1px solid var(--fr-border);
        padding: 16px 18px;
        margin-bottom: 18px;
      }
      .fr-filters-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 16px;
        align-items: flex-end;
      }
      .fr-form-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .fr-form-group label {
        font-size: 0.8rem;
        font-weight: 500;
        color: var(--fr-text);
      }
      .fr-input {
        width: 100%;
        padding: 8px 10px;
        border-radius: 6px;
        border: 1px solid var(--fr-border-strong);
        font-size: 0.85rem;
      }
      .fr-form-actions {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        gap: 8px;
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px solid var(--fr-border);
      }
      .fr-table-card {
        background-color: var(--fr-surface);
        border-radius: var(--fr-radius);
        box-shadow: var(--fr-shadow-md);
        border: 1px solid var(--fr-border);
        padding: 16px;
        margin-bottom: 18px;
      }
      .fr-table-wrapper {
        overflow-x: auto;
      }
      .fr-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85rem;
      }
      .fr-table th,
      .fr-table td {
        padding: 8px 10px;
        border-bottom: 1px solid var(--fr-border);
      }
      .fr-table th {
        text-align: left;
        background-color: var(--fr-surface-alt);
        font-weight: 600;
        color: #0f172a;
      }
      .fr-table .section-header-row td {
        padding: 16px 8px 12px 8px;
        font-weight: 800;
        font-size: 15px;
        color: #0f172a;
      }
      .fr-table .grand-total-row td {
        padding: 16px 8px;
        font-weight: 800;
        font-size: 15px;
        border-top: 2px solid #0f172a;
        border-bottom: 2px solid #0f172a;
      }
      .fr-table .final-total td {
        font-size: 18px;
        border-bottom: 4px double #0f172a;
        padding: 20px 8px;
      }
      .fr-table .spacer-row {
        height: 24px;
      }
      .fr-table .fr-amount-header {
        text-align: right;
      }
      .fr-table .balance-cell,
      .fr-table .fr-amount {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
      .fr-table .balance-cell.negative,
      .fr-table .balance-cell .negative {
        color: #d52b1e;
      }
      .fr-table .report-row {
        transition: background 0.15s;
      }
      .fr-table .report-row:hover {
        background: #f9fafb;
      }
      .fr-table .report-row td {
        padding: 10px 8px;
        font-size: 14px;
      }
      .fr-table .parent-row {
        font-weight: 700;
      }
      .fr-table .summary-row td {
        padding: 12px 8px;
        font-size: 14px;
        font-weight: 700;
        border-top: 1px solid var(--fr-border);
      }
      .fr-table .summary-label {
        font-style: normal;
      }
      .fr-loading-banner {
        padding: 16px;
        text-align: center;
        color: var(--fr-text-light);
        background: var(--fr-surface);
        border: 1px solid var(--fr-border);
        border-radius: var(--fr-radius);
        margin-bottom: 18px;
        font-size: 0.85rem;
      }
      .fr-error-banner {
        padding: 12px 16px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: var(--fr-radius);
        margin-bottom: 18px;
        font-size: 0.85rem;
        color: #991b1b;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .fr-empty-state {
        padding: 40px 16px;
        text-align: center;
        color: var(--fr-text-light);
        background: var(--fr-surface);
        border: 1px solid var(--fr-border);
        border-radius: var(--fr-radius);
        margin-bottom: 18px;
      }
      .fr-empty-state .material-icons-outlined {
        font-size: 48px;
        color: var(--fr-text-lighter);
        margin-bottom: 8px;
      }
      .fr-table-wrapper .report-row .name-cell,
      .fr-table-wrapper .report-row .balance-cell {
        padding: 8px 8px;
      }
      .fr-table-wrapper .report-row .acc-name {
        font-size: 0.85rem;
      }
      .fr-table-wrapper .report-row .toggle-btn {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        color: var(--fr-text-lighter);
        display: flex;
        align-items: center;
        transition: color 0.2s;
      }
      .fr-table-wrapper .report-row .toggle-btn:hover {
        color: var(--primary-color);
      }
      @media (max-width: 768px) {
        .fr-filters-card {
          padding: 12px 14px;
        }
        .fr-filters-grid {
          gap: 12px;
        }
        .fr-table-card {
          padding: 12px;
        }
        .fr-table th,
        .fr-table td {
          padding: 6px 8px;
        }
        .fr-header-card {
          padding: 14px 16px;
        }
        .fr-form-actions {
          flex-direction: column;
        }
      }
      @media print {
        .fr-page { padding: 0; background: #fff; }
        .fr-filters-card, .fr-form-actions, .fr-loading-banner, .fr-error-banner, .fr-table-card .report-row .toggle-btn, .no-print { display: none !important; }
        .fr-header-card, .fr-table-card { border: none; box-shadow: none; padding: 0; }
        .fr-table { border-collapse: collapse; }
        .fr-table th, .fr-table td { border: 1px solid var(--fr-border); }
      }
      `}</style>
    </AdminLayout>
  );
}
