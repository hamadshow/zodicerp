import React, { useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import '../../../../css/backend/FinancialReports.css';
import AdminLayout from '../components/AdminLayout';

const REPORT_CATEGORIES = [
  {
    id: 'company-financial',
    title: 'Company & Financial Reports',
    description: 'Core accounting & financial statements',
    reports: [
      { key: 'balance-sheet', name: 'Balance Sheet', shortName: 'Balance Sheet', description: 'Snapshot of assets, liabilities, and equity.', icon: 'account_balance', routeName: 'admin.reports.balance-sheet' },
      { key: 'balance-sheet-comparison', name: 'Balance Sheet Comparison', shortName: 'BS Comparison', description: 'Compare balance sheets across periods.', icon: 'compare_arrows', routeName: '#' },
      { key: 'balance-sheet-detail', name: 'Balance Sheet Detail', shortName: 'BS Detail', description: 'Detailed view of balance sheet accounts.', icon: 'list_alt', routeName: '#' },
      { key: 'cash-flow', name: 'Cash Flow Statement', shortName: 'Cash Flow', description: 'Tracks operating, investing, and financing cash movements.', icon: 'waterfall_chart', routeName: 'admin.reports.cash-flow' },
      { key: 'profit-loss', name: 'Profit & Loss', shortName: 'P&L', description: 'Summarizes revenue and expenses over a period.', icon: 'show_chart', routeName: 'admin.reports.income-statement' },
      { key: 'profit-loss-comparison', name: 'Profit & Loss Comparison', shortName: 'P&L Comparison', description: 'Compare P&L across different periods.', icon: 'trending_up', routeName: '#' },
      { key: 'profit-loss-class', name: 'Profit & Loss by Class', shortName: 'P&L by Class', description: 'Profit and loss segmented by class.', icon: 'category', routeName: '#' },
      { key: 'profit-loss-customer', name: 'Profit & Loss by Customer', shortName: 'P&L by Customer', description: 'Profit and loss segmented by customer.', icon: 'people', routeName: '#' },
      { key: 'profit-loss-month', name: 'Profit & Loss by Month', shortName: 'P&L by Month', description: 'Monthly breakdown of profit and loss.', icon: 'calendar_today', routeName: '#' },
      { key: 'profit-loss-detail', name: 'Profit & Loss Detail', shortName: 'P&L Detail', description: 'Detailed view of P&L accounts.', icon: 'view_list', routeName: '#' },
      { key: 'equity-change', name: 'Statement of Changes in Equity', shortName: 'Equity Changes', description: 'Movements in equity over a period.', icon: 'history_edu', routeName: '#' },
      { key: 'trial-balance', name: 'Trial Balance', shortName: 'Trial Balance', description: 'Summarized debit and credit balances.', icon: 'balance', routeName: 'admin.reports.trial-balance' },
      { key: 'trial-balance-detail', name: 'Trial Balance Detail', shortName: 'TB Detail', description: 'Detailed trial balance with transaction level data.', icon: 'fact_check', routeName: '#' },
    ],
  },
  {
    id: 'banking',
    title: 'Banking Reports',
    description: 'Bank reconciliation and transaction summaries',
    reports: [
      { key: 'bank-reconciliation-summary', name: 'Bank Reconciliation Summary', shortName: 'Recon Summary', description: 'Summary of bank reconciliations.', icon: 'account_balance_wallet', routeName: '#' },
      { key: 'bank-reconciliation-detail', name: 'Bank Reconciliation Detail', shortName: 'Recon Detail', description: 'Detailed bank reconciliation report.', icon: 'receipt', routeName: '#' },
      { key: 'check-detail', name: 'Check Detail', shortName: 'Check Detail', description: 'Details of checks issued.', icon: 'fact_check', routeName: '#' },
      { key: 'check-summary', name: 'Check Summary', shortName: 'Check Summary', description: 'Summary of checks issued.', icon: 'summarize', routeName: '#' },
      { key: 'deposit-detail', name: 'Deposit Detail', shortName: 'Deposit Detail', description: 'Details of deposits made.', icon: 'savings', routeName: '#' },
      { key: 'deposit-summary', name: 'Deposit Summary', shortName: 'Deposit Summary', description: 'Summary of deposits made.', icon: 'account_balance', routeName: '#' },
      { key: 'missing-checks', name: 'Missing Checks', shortName: 'Missing Checks', description: 'Identify missing check numbers.', icon: 'rule', routeName: '#' },
      { key: 'voided-transactions', name: 'Voided / Deleted Transactions', shortName: 'Voided Trans', description: 'List of voided or deleted transactions.', icon: 'delete_sweep', routeName: '#' },
    ],
  },
  {
    id: 'receivables',
    title: 'Customers & Receivables Reports (A/R)',
    description: 'Monitor customer balances and invoices',
    reports: [
      { key: 'ar-aging-detail', name: 'Accounts Receivable Aging Detail', shortName: 'AR Aging Detail', description: 'Detailed aging of receivables.', icon: 'history', routeName: '#' },
      { key: 'ar-aging', name: 'Accounts Receivable Aging Summary', shortName: 'AR Aging', description: 'Breakdown of customer balances by aging bucket.', icon: 'receipt_long', routeName: 'admin.reports.ar-aging' },
      { key: 'customer-balance-detail', name: 'Customer Balance Detail', shortName: 'Cust Bal Detail', description: 'Detailed customer balances.', icon: 'person_search', routeName: '#' },
      { key: 'customer-balance-summary', name: 'Customer Balance Summary', shortName: 'Cust Bal Summary', description: 'Summary of customer balances.', icon: 'group', routeName: '#' },
      { key: 'customer-contact-list', name: 'Customer Contact List', shortName: 'Contact List', description: 'Contact information for customers.', icon: 'contacts', routeName: '#' },
      { key: 'customer-income-summary', name: 'Customer Income Summary', shortName: 'Income Summary', description: 'Income generated per customer.', icon: 'monetization_on', routeName: '#' },
      { key: 'invoice-list', name: 'Invoice List', shortName: 'Invoice List', description: 'List of all invoices.', icon: 'description', routeName: '#' },
      { key: 'open-invoices', name: 'Open Invoices', shortName: 'Open Invoices', description: 'Invoices that have not been paid.', icon: 'pending_actions', routeName: '#' },
      { key: 'payments-received', name: 'Payments Received', shortName: 'Payments', description: 'List of payments received.', icon: 'payment', routeName: '#' },
      { key: 'sales-customer-detail', name: 'Sales by Customer Detail', shortName: 'Sales Cust Detail', description: 'Detailed sales by customer.', icon: 'point_of_sale', routeName: '#' },
      { key: 'sales-customer-summary', name: 'Sales by Customer Summary', shortName: 'Sales Cust Summary', description: 'Summary of sales by customer.', icon: 'summarize', routeName: '#' },
      { key: 'sales-item', name: 'Sales by Item', shortName: 'Sales by Item', description: 'Sales broken down by item.', icon: 'inventory_2', routeName: '#' },
      { key: 'sales-rep', name: 'Sales by Sales Rep', shortName: 'Sales by Rep', description: 'Sales performance by representative.', icon: 'badge', routeName: '#' },
      { key: 'unbilled-charges', name: 'Unbilled Charges', shortName: 'Unbilled', description: 'Charges not yet invoiced.', icon: 'money_off', routeName: '#' },
    ],
  },
  {
    id: 'sales',
    title: 'Sales Reports',
    description: 'Sales performance and analysis',
    reports: [
      { key: 'daily-sales', name: 'Daily Sales Summary', shortName: 'Daily Sales', description: 'Sales summary by day.', icon: 'today', routeName: '#' },
      { key: 'sales-product', name: 'Sales by Product / Service', shortName: 'Sales Prod', description: 'Sales by product or service.', icon: 'shopping_bag', routeName: '#' },
      { key: 'sales-customer', name: 'Sales by Customer', shortName: 'Sales Cust', description: 'Sales analysis by customer.', icon: 'face', routeName: '#' },
      { key: 'sales-class', name: 'Sales by Class', shortName: 'Sales Class', description: 'Sales segmented by class.', icon: 'class', routeName: '#' },
      { key: 'sales-location', name: 'Sales by Location', shortName: 'Sales Loc', description: 'Sales segmented by location.', icon: 'place', routeName: '#' },
      { key: 'sales-payment', name: 'Sales by Payment Method', shortName: 'Sales Payment', description: 'Sales by payment method.', icon: 'credit_card', routeName: '#' },
      { key: 'sales-tax-liability', name: 'Sales Tax Liability', shortName: 'Tax Liability', description: 'Sales tax liability report.', icon: 'gavel', routeName: '#' },
      { key: 'sales-tax-revenue', name: 'Sales Tax Revenue Summary', shortName: 'Tax Revenue', description: 'Summary of sales tax revenue.', icon: 'account_balance', routeName: '#' },
    ],
  },
  {
    id: 'payables',
    title: 'Expenses & Payables Reports (A/P)',
    description: 'Manage vendor balances and expenses',
    reports: [
      { key: 'ap-aging-detail', name: 'Accounts Payable Aging Detail', shortName: 'AP Aging Detail', description: 'Detailed aging of payables.', icon: 'history_toggle_off', routeName: '#' },
      { key: 'ap-aging', name: 'Accounts Payable Aging Summary', shortName: 'AP Aging', description: 'Breakdown of supplier balances by aging bucket.', icon: 'request_quote', routeName: 'admin.reports.ap-aging' },
      { key: 'bill-detail', name: 'Bill Detail', shortName: 'Bill Detail', description: 'Detailed list of bills.', icon: 'receipt', routeName: '#' },
      { key: 'bill-summary', name: 'Bill Summary', shortName: 'Bill Summary', description: 'Summary of bills.', icon: 'summarize', routeName: '#' },
      { key: 'bills-payments', name: 'Bills and Applied Payments', shortName: 'Bills & Payments', description: 'Bills and their payments.', icon: 'price_check', routeName: '#' },
      { key: 'expenses-vendor-detail', name: 'Expenses by Vendor Detail', shortName: 'Exp Vend Detail', description: 'Detailed expenses by vendor.', icon: 'person', routeName: '#' },
      { key: 'expenses-vendor-summary', name: 'Expenses by Vendor Summary', shortName: 'Exp Vend Summary', description: 'Summary of expenses by vendor.', icon: 'group', routeName: '#' },
      { key: 'unpaid-bills', name: 'Unpaid Bills', shortName: 'Unpaid Bills', description: 'List of unpaid bills.', icon: 'money_off_csred', routeName: '#' },
    ],
  },
  {
    id: 'vendors',
    title: 'Vendors & Purchases Reports',
    description: 'Vendor management and purchase analysis',
    reports: [
      { key: 'vendor-balance-detail', name: 'Vendor Balance Detail', shortName: 'Vend Bal Detail', description: 'Detailed vendor balances.', icon: 'account_box', routeName: '#' },
      { key: 'vendor-balance-summary', name: 'Vendor Balance Summary', shortName: 'Vend Bal Summary', description: 'Summary of vendor balances.', icon: 'contact_page', routeName: '#' },
      { key: 'vendor-contact-list', name: 'Vendor Contact List', shortName: 'Vend Contacts', description: 'Contact information for vendors.', icon: 'contacts', routeName: '#' },
      { key: 'purchases-vendor-detail', name: 'Purchases by Vendor Detail', shortName: 'Purch Vend Detail', description: 'Detailed purchases by vendor.', icon: 'shopping_cart', routeName: '#' },
      { key: 'purchases-vendor-summary', name: 'Purchases by Vendor Summary', shortName: 'Purch Vend Summary', description: 'Summary of purchases by vendor.', icon: 'summarize', routeName: '#' },
      { key: 'purchases-product', name: 'Purchases by Product / Service', shortName: 'Purch Prod', description: 'Purchases by product or service.', icon: 'inventory', routeName: '#' },
    ],
  },
  {
    id: 'payroll',
    title: 'Payroll Reports',
    description: 'Employee and payroll information',
    reports: [
      { key: 'employee-details', name: 'Employee Details', shortName: 'Emp Details', description: 'Detailed employee information.', icon: 'badge', routeName: '#' },
      { key: 'employee-earnings', name: 'Employee Earnings Summary', shortName: 'Emp Earnings', description: 'Summary of employee earnings.', icon: 'attach_money', routeName: '#' },
      { key: 'payroll-summary', name: 'Payroll Summary', shortName: 'Payroll Summary', description: 'Summary of payroll.', icon: 'request_quote', routeName: '#' },
      { key: 'payroll-detail', name: 'Payroll Detail', shortName: 'Payroll Detail', description: 'Detailed payroll report.', icon: 'receipt_long', routeName: '#' },
      { key: 'payroll-tax-liability', name: 'Payroll Tax Liability', shortName: 'Tax Liability', description: 'Payroll tax liability.', icon: 'gavel', routeName: '#' },
      { key: 'payroll-tax-payments', name: 'Payroll Tax Payments', shortName: 'Tax Payments', description: 'Payroll tax payments made.', icon: 'payment', routeName: '#' },
      { key: 'time-activities', name: 'Time Activities by Employee', shortName: 'Time Activities', description: 'Time tracking by employee.', icon: 'timer', routeName: '#' },
      { key: 'vacation-sick', name: 'Vacation and Sick Leave', shortName: 'Leave', description: 'Vacation and sick leave balances.', icon: 'sick', routeName: '#' },
    ],
  },
  {
    id: 'inventory',
    title: 'Inventory Reports',
    description: 'Stock status and valuation',
    reports: [
      { key: 'inventory-valuation-summary', name: 'Inventory Valuation Summary', shortName: 'Valuation Summary', description: 'Summary of inventory valuation.', icon: 'inventory', routeName: '#' },
      { key: 'inventory-valuation-detail', name: 'Inventory Valuation Detail', shortName: 'Valuation Detail', description: 'Detailed inventory valuation.', icon: 'list_alt', routeName: '#' },
      { key: 'inventory-stock-status', name: 'Inventory Stock Status by Item', shortName: 'Stock Status', description: 'Stock status per item.', icon: 'warehouse', routeName: '#' },
      { key: 'physical-inventory', name: 'Physical Inventory Worksheet', shortName: 'Physical Worksheet', description: 'Worksheet for physical inventory count.', icon: 'assignment', routeName: '#' },
      { key: 'product-list', name: 'Product / Service List', shortName: 'Prod List', description: 'List of products and services.', icon: 'list', routeName: '#' },
      { key: 'sales-product-inv', name: 'Sales by Product', shortName: 'Sales Prod', description: 'Sales performance by product.', icon: 'sell', routeName: '#' },
      { key: 'purchases-product-inv', name: 'Purchases by Product', shortName: 'Purch Prod', description: 'Purchases by product.', icon: 'shopping_bag', routeName: '#' },
    ],
  },
  {
    id: 'accountant',
    title: 'Accountant & Taxes Reports',
    description: 'Tools for accountants and tax reporting',
    reports: [
      { key: 'chart-of-accounts', name: 'Chart of Accounts', shortName: 'COA', description: 'List of all accounts.', icon: 'account_tree', routeName: 'admin.reports.chart-of-accounts' },
      { key: 'audit-log', name: 'Audit Log', shortName: 'Audit Log', description: 'Log of system activities.', icon: 'history', routeName: '#' },
      { key: 'general-ledger', name: 'General Ledger', shortName: 'General Ledger', description: 'Line-by-line posting history.', icon: 'menu_book', routeName: 'admin.reports.general-ledger' },
      { key: 'journal', name: 'Journal', shortName: 'Journal', description: 'Journal entries.', icon: 'book', routeName: 'admin.journals.index' },
      { key: 'transaction-detail', name: 'Transaction Detail by Account', shortName: 'Trans Detail', description: 'Detailed transactions by account.', icon: 'receipt', routeName: 'admin.reports.account-statement' },
      { key: 'transaction-list-date', name: 'Transaction List by Date', shortName: 'Trans by Date', description: 'Transactions sorted by date.', icon: 'calendar_today', routeName: '#' },
      { key: 'transaction-list-vendor', name: 'Transaction List by Vendor', shortName: 'Trans by Vendor', description: 'Transactions sorted by vendor.', icon: 'person', routeName: '#' },
      { key: 'transaction-list-splits', name: 'Transaction List with Splits', shortName: 'Trans Splits', description: 'Transactions with split details.', icon: 'call_split', routeName: '#' },
      { key: 'tax-summary', name: 'Tax Summary', shortName: 'Tax Summary', description: 'Summary of taxes.', icon: 'summarize', routeName: '#' },
      { key: 'tax-detail', name: 'Tax Detail', shortName: 'Tax Detail', description: 'Detailed tax report.', icon: 'description', routeName: '#' },
    ],
  },
  {
    id: 'budget',
    title: 'Budget & Planning Reports',
    description: 'Budgeting and variance analysis',
    reports: [
      { key: 'budget-overview', name: 'Budget Overview', shortName: 'Budget Overview', description: 'Overview of the budget.', icon: 'pie_chart', routeName: '#' },
      { key: 'budget-actual', name: 'Budget vs Actual', shortName: 'Budget vs Actual', description: 'Comparison of budget vs actuals.', icon: 'compare', routeName: '#' },
      { key: 'budget-actual-class', name: 'Budget vs Actual by Class', shortName: 'Budget Class', description: 'Budget vs actuals by class.', icon: 'class', routeName: '#' },
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
                      report.routeName === '#'
                        ? '#'
                        : typeof route === 'function'
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
      </div>
    </AdminLayout>
  );
}
