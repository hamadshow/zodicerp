<?php

namespace Database\Seeders;

use App\Models\FinancialReport;
use Illuminate\Database\Seeder;

class FinancialReportsSeeder extends Seeder
{
    public function run(): void
    {
        $definitions = [
            [
                'category' => 'Company & Financial Reports',
                'reports' => [
                    ['key' => 'balance-sheet', 'name' => 'Balance Sheet', 'route' => 'admin.reports.balance-sheet'],
                    ['key' => 'balance-sheet-comparison', 'name' => 'Balance Sheet Comparison', 'route' => '#'],
                    ['key' => 'balance-sheet-detail', 'name' => 'Balance Sheet Detail', 'route' => '#'],
                    ['key' => 'cash-flow', 'name' => 'Cash Flow Statement', 'route' => 'admin.reports.cash-flow'],
                    ['key' => 'profit-loss', 'name' => 'Profit & Loss', 'route' => 'admin.reports.income-statement'],
                    ['key' => 'profit-loss-comparison', 'name' => 'Profit & Loss Comparison', 'route' => '#'],
                    ['key' => 'profit-loss-class', 'name' => 'Profit & Loss by Class', 'route' => '#'],
                    ['key' => 'profit-loss-customer', 'name' => 'Profit & Loss by Customer', 'route' => '#'],
                    ['key' => 'profit-loss-month', 'name' => 'Profit & Loss by Month', 'route' => '#'],
                    ['key' => 'profit-loss-detail', 'name' => 'Profit & Loss Detail', 'route' => '#'],
                    ['key' => 'equity-change', 'name' => 'Statement of Changes in Equity', 'route' => '#'],
                    ['key' => 'trial-balance', 'name' => 'Trial Balance', 'route' => 'admin.reports.trial-balance'],
                    ['key' => 'trial-balance-detail', 'name' => 'Trial Balance Detail', 'route' => '#'],
                ],
            ],
            [
                'category' => 'Banking Reports',
                'reports' => [
                    ['key' => 'bank-reconciliation-summary', 'name' => 'Bank Reconciliation Summary', 'route' => '#'],
                    ['key' => 'bank-reconciliation-detail', 'name' => 'Bank Reconciliation Detail', 'route' => '#'],
                    ['key' => 'check-detail', 'name' => 'Check Detail', 'route' => '#'],
                    ['key' => 'check-summary', 'name' => 'Check Summary', 'route' => '#'],
                    ['key' => 'deposit-detail', 'name' => 'Deposit Detail', 'route' => '#'],
                    ['key' => 'deposit-summary', 'name' => 'Deposit Summary', 'route' => '#'],
                    ['key' => 'missing-checks', 'name' => 'Missing Checks', 'route' => '#'],
                    ['key' => 'voided-transactions', 'name' => 'Voided / Deleted Transactions', 'route' => '#'],
                ],
            ],
            [
                'category' => 'Customers & Receivables Reports (A/R)',
                'reports' => [
                    ['key' => 'ar-aging-detail', 'name' => 'Accounts Receivable Aging Detail', 'route' => '#'],
                    ['key' => 'ar-aging', 'name' => 'Accounts Receivable Aging Summary', 'route' => 'admin.reports.ar-aging'],
                    ['key' => 'customer-balance-detail', 'name' => 'Customer Balance Detail', 'route' => '#'],
                    ['key' => 'customer-balance-summary', 'name' => 'Customer Balance Summary', 'route' => '#'],
                    ['key' => 'customer-contact-list', 'name' => 'Customer Contact List', 'route' => '#'],
                    ['key' => 'customer-income-summary', 'name' => 'Customer Income Summary', 'route' => '#'],
                    ['key' => 'invoice-list', 'name' => 'Invoice List', 'route' => '#'],
                    ['key' => 'open-invoices', 'name' => 'Open Invoices', 'route' => '#'],
                    ['key' => 'payments-received', 'name' => 'Payments Received', 'route' => '#'],
                    ['key' => 'sales-customer-detail', 'name' => 'Sales by Customer Detail', 'route' => '#'],
                    ['key' => 'sales-customer-summary', 'name' => 'Sales by Customer Summary', 'route' => '#'],
                    ['key' => 'sales-item', 'name' => 'Sales by Item', 'route' => '#'],
                    ['key' => 'sales-rep', 'name' => 'Sales by Sales Rep', 'route' => '#'],
                    ['key' => 'unbilled-charges', 'name' => 'Unbilled Charges', 'route' => '#'],
                ],
            ],
            [
                'category' => 'Sales Reports',
                'reports' => [
                    ['key' => 'daily-sales', 'name' => 'Daily Sales Summary', 'route' => '#'],
                    ['key' => 'sales-product', 'name' => 'Sales by Product / Service', 'route' => '#'],
                    ['key' => 'sales-customer', 'name' => 'Sales by Customer', 'route' => '#'],
                    ['key' => 'sales-class', 'name' => 'Sales by Class', 'route' => '#'],
                    ['key' => 'sales-location', 'name' => 'Sales by Location', 'route' => '#'],
                    ['key' => 'sales-payment', 'name' => 'Sales by Payment Method', 'route' => '#'],
                    ['key' => 'sales-tax-liability', 'name' => 'Sales Tax Liability', 'route' => '#'],
                    ['key' => 'sales-tax-revenue', 'name' => 'Sales Tax Revenue Summary', 'route' => '#'],
                ],
            ],
            [
                'category' => 'Expenses & Payables Reports (A/P)',
                'reports' => [
                    ['key' => 'ap-aging-detail', 'name' => 'Accounts Payable Aging Detail', 'route' => '#'],
                    ['key' => 'ap-aging', 'name' => 'Accounts Payable Aging Summary', 'route' => 'admin.reports.ap-aging'],
                    ['key' => 'bill-detail', 'name' => 'Bill Detail', 'route' => '#'],
                    ['key' => 'bill-summary', 'name' => 'Bill Summary', 'route' => '#'],
                    ['key' => 'bills-payments', 'name' => 'Bills and Applied Payments', 'route' => '#'],
                    ['key' => 'expenses-vendor-detail', 'name' => 'Expenses by Vendor Detail', 'route' => '#'],
                    ['key' => 'expenses-vendor-summary', 'name' => 'Expenses by Vendor Summary', 'route' => '#'],
                    ['key' => 'unpaid-bills', 'name' => 'Unpaid Bills', 'route' => '#'],
                ],
            ],
            [
                'category' => 'Vendors & Purchases Reports',
                'reports' => [
                    ['key' => 'vendor-balance-detail', 'name' => 'Vendor Balance Detail', 'route' => '#'],
                    ['key' => 'vendor-balance-summary', 'name' => 'Vendor Balance Summary', 'route' => '#'],
                    ['key' => 'vendor-contact-list', 'name' => 'Vendor Contact List', 'route' => '#'],
                    ['key' => 'purchases-vendor-detail', 'name' => 'Purchases by Vendor Detail', 'route' => '#'],
                    ['key' => 'purchases-vendor-summary', 'name' => 'Purchases by Vendor Summary', 'route' => '#'],
                    ['key' => 'purchases-product', 'name' => 'Purchases by Product / Service', 'route' => '#'],
                ],
            ],
            [
                'category' => 'Payroll Reports',
                'reports' => [
                    ['key' => 'employee-details', 'name' => 'Employee Details', 'route' => '#'],
                    ['key' => 'employee-earnings', 'name' => 'Employee Earnings Summary', 'route' => '#'],
                    ['key' => 'payroll-summary', 'name' => 'Payroll Summary', 'route' => '#'],
                    ['key' => 'payroll-detail', 'name' => 'Payroll Detail', 'route' => '#'],
                    ['key' => 'payroll-tax-liability', 'name' => 'Payroll Tax Liability', 'route' => '#'],
                    ['key' => 'payroll-tax-payments', 'name' => 'Payroll Tax Payments', 'route' => '#'],
                    ['key' => 'time-activities', 'name' => 'Time Activities by Employee', 'route' => '#'],
                    ['key' => 'vacation-sick', 'name' => 'Vacation and Sick Leave', 'route' => '#'],
                ],
            ],
            [
                'category' => 'Inventory Reports',
                'reports' => [
                    ['key' => 'inventory-valuation-summary', 'name' => 'Inventory Valuation Summary', 'route' => '#'],
                    ['key' => 'inventory-valuation-detail', 'name' => 'Inventory Valuation Detail', 'route' => '#'],
                    ['key' => 'inventory-stock-status', 'name' => 'Inventory Stock Status by Item', 'route' => '#'],
                    ['key' => 'physical-inventory', 'name' => 'Physical Inventory Worksheet', 'route' => '#'],
                    ['key' => 'product-list', 'name' => 'Product / Service List', 'route' => '#'],
                    ['key' => 'sales-product-inv', 'name' => 'Sales by Product', 'route' => '#'],
                    ['key' => 'purchases-product-inv', 'name' => 'Purchases by Product', 'route' => '#'],
                ],
            ],
            [
                'category' => 'Accountant & Taxes Reports',
                'reports' => [
                    ['key' => 'chart-of-accounts', 'name' => 'Chart of Accounts', 'route' => 'admin.reports.chart-of-accounts'],
                    ['key' => 'audit-log', 'name' => 'Audit Log', 'route' => '#'],
                    ['key' => 'general-ledger', 'name' => 'General Ledger', 'route' => 'admin.reports.general-ledger'],
                    ['key' => 'journal', 'name' => 'Journal', 'route' => 'admin.journals.index'],
                    ['key' => 'transaction-detail', 'name' => 'Transaction Detail by Account', 'route' => 'admin.reports.account-statement'],
                    ['key' => 'transaction-list-date', 'name' => 'Transaction List by Date', 'route' => '#'],
                    ['key' => 'transaction-list-vendor', 'name' => 'Transaction List by Vendor', 'route' => '#'],
                    ['key' => 'transaction-list-splits', 'name' => 'Transaction List with Splits', 'route' => '#'],
                    ['key' => 'tax-summary', 'name' => 'Tax Summary', 'route' => '#'],
                    ['key' => 'tax-detail', 'name' => 'Tax Detail', 'route' => '#'],
                ],
            ],
            [
                'category' => 'Budget & Planning Reports',
                'reports' => [
                    ['key' => 'budget-overview', 'name' => 'Budget Overview', 'route' => '#'],
                    ['key' => 'budget-actual', 'name' => 'Budget vs Actual', 'route' => '#'],
                    ['key' => 'budget-actual-class', 'name' => 'Budget vs Actual by Class', 'route' => '#'],
                ],
            ],
        ];

        foreach ($definitions as $definition) {
            $category = $definition['category'];

            foreach ($definition['reports'] as $index => $report) {
                FinancialReport::updateOrCreate(
                    ['report_key' => $report['key']],
                    [
                        'report_name' => $report['name'],
                        'category' => $category,
                        'route_name' => $report['route'],
                        'sort_order' => $index + 1,
                        'is_active' => true,
                    ],
                );
            }
        }
    }
}
