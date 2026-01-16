import React, { useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import '../../../../css/backend/FinancialReports.css';
import AdminLayout from '../components/AdminLayout';

const REPORT_CATEGORIES = [
  {
    id: 'core',
    title: 'Core Financial Statements',
    description: 'High-level view of your company’s financial position and performance.',
    reports: [
      {
        key: 'balance-sheet',
        name: 'Statement of Financial Position',
        shortName: 'Balance Sheet',
        description: 'Snapshot of assets, liabilities, and equity at a specific date.',
        icon: 'account_balance',
        routeName: 'admin.reports.balance-sheet',
      },
      {
        key: 'income-statement',
        name: 'Income Statement',
        shortName: 'Profit & Loss',
        description: 'Summarizes revenue and expenses over a period.',
        icon: 'show_chart',
        routeName: 'admin.reports.income-statement',
      },
      {
        key: 'cash-flow',
        name: 'Cash Flow Statement',
        shortName: 'Cash Flow',
        description: 'Tracks operating, investing, and financing cash movements.',
        icon: 'waterfall_chart',
        routeName: 'admin.reports.cash-flow',
      },
    ],
  },
  {
    id: 'ledger',
    title: 'Ledger & Control Reports',
    description: 'Detailed ledger-level reports for reconciliation and audit support.',
    reports: [
      {
        key: 'trial-balance',
        name: 'Trial Balance',
        shortName: 'Trial Balance',
        description: 'Summarized debit and credit balances across all accounts.',
        icon: 'balance',
        routeName: 'admin.reports.trial-balance',
      },
      {
        key: 'general-ledger',
        name: 'General Ledger',
        shortName: 'General Ledger',
        description: 'Line-by-line posting history for selected accounts.',
        icon: 'menu_book',
        routeName: 'admin.reports.general-ledger',
      },
      {
        key: 'account-statement',
        name: 'Account Statement',
        shortName: 'Account Statement',
        description: 'Running balance and movements for a single account.',
        icon: 'description',
        routeName: 'admin.reports.account-statement',
      },
    ],
  },
  {
    id: 'receivables-payables',
    title: 'Receivables & Payables',
    description: 'Monitor outstanding customer and supplier balances with aging analysis.',
    reports: [
      {
        key: 'ar-aging',
        name: 'Accounts Receivable Aging',
        shortName: 'AR Aging',
        description: 'Breakdown of customer balances by aging bucket.',
        icon: 'receipt_long',
        routeName: 'admin.reports.ar-aging',
      },
      {
        key: 'ap-aging',
        name: 'Accounts Payable Aging',
        shortName: 'AP Aging',
        description: 'Breakdown of supplier balances by aging bucket.',
        icon: 'request_quote',
        routeName: 'admin.reports.ap-aging',
      },
    ],
  },
];

const findReportByKey = (key) => {
  if (!key) return null;
  for (const category of REPORT_CATEGORIES) {
    const report = category.reports.find((r) => r.key === key);
    if (report) {
      return { category, report };
    }
  }
  return null;
};

export default function FinancialReports({ activeReport }) {
  const activeSelection = useMemo(
    () => findReportByKey(activeReport),
    [activeReport],
  );

  return (
    <AdminLayout activeMenu="Financial Reports">
      <div className="FinancialReports-page">
        <Head title="Financial Reports - ZodicERP" />

        <div className="breadcrumb">
          <a href="#">Dashboard</a>
          <span>/</span>
          <a href="#">Accounting</a>
          <span>/</span>
          <span>Financial Reports</span>
        </div>

        <div className="reports-header">
          <div>
            <h1 className="reports-title">Financial Reports</h1>
            <p className="reports-subtitle">
              Central hub for core financial statements, ledger controls, and aging reports.
            </p>
          </div>
        </div>

        <div className="reports-layout">
          <div className="reports-grid">
            {REPORT_CATEGORIES.map((category) => (
              <section key={category.id} className="report-category">
                <div className="report-category-header">
                  <h2 className="report-category-title">{category.title}</h2>
                  <p className="report-category-description">
                    {category.description}
                  </p>
                </div>
                <div className="report-cards">
                  {category.reports.map((report) => {
                    const href =
                      typeof route === 'function'
                        ? route(report.routeName)
                        : '#';
                    const isActive =
                      activeSelection?.report?.key === report.key;

                    return (
                      <Link
                        key={report.key}
                        href={href}
                        className={`report-card ${
                          isActive ? 'report-card-active' : ''
                        }`}
                      >
                        <div className="report-card-main">
                          <div className="report-icon">
                            <span className="material-icons-outlined">
                              {report.icon}
                            </span>
                          </div>
                          <div className="report-content">
                            <div className="report-heading">
                              <span className="report-name">
                                {report.name}
                              </span>
                              <span className="report-badge">
                                {report.shortName}
                              </span>
                            </div>
                            <p className="report-description">
                              {report.description}
                            </p>
                          </div>
                        </div>
                        <div className="report-card-footer">
                          <span className="report-link-label">
                            Open report
                          </span>
                          <span className="material-icons-outlined">
                            arrow_forward
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <aside className="report-sidebar">
            <div className="report-sidebar-card">
              <h3 className="report-sidebar-title">Selected report</h3>
              {activeSelection ? (
                <>
                  <div className="report-sidebar-badge">
                    {activeSelection.category.title}
                  </div>
                  <div className="report-sidebar-name">
                    {activeSelection.report.name}
                  </div>
                  <p className="report-sidebar-description">
                    {activeSelection.report.description}
                  </p>
                  <div className="report-sidebar-meta">
                    <div className="report-sidebar-meta-item">
                      <span className="material-icons-outlined">
                        schedule
                      </span>
                      <span>Period and filters configured on report pages.</span>
                    </div>
                    <div className="report-sidebar-meta-item">
                      <span className="material-icons-outlined">
                        cloud_download
                      </span>
                      <span>Export to Excel or PDF from the report view.</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="report-sidebar-description">
                    Choose a report from the list to see a short summary here
                    and continue to the detailed report page.
                  </p>
                  <ul className="report-sidebar-hints">
                    <li>Start with Trial Balance to validate postings.</li>
                    <li>
                      Use Balance Sheet and Income Statement for period-end
                      closing.
                    </li>
                    <li>
                      Monitor overdue balances via AR/AP aging reports.
                    </li>
                  </ul>
                </>
              )}
            </div>
          </aside>
        </div>
      </div>
    </AdminLayout>
  );
}
