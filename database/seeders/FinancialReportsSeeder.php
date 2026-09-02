<?php

namespace Database\Seeders;

use App\Models\FinancialReport;
use Illuminate\Database\Seeder;

class FinancialReportsSeeder extends Seeder
{
    public function run(): void
    {
        \Illuminate\Support\Facades\DB::statement('UPDATE financial_reports SET company_id = NULL WHERE 1=1');

        $definitions = [
            [
                'category' => 'Company & Financial Reports',
                'category_ar' => 'تقارير الشركة والمالية',
                'reports' => [
                    ['key' => 'balance-sheet', 'name' => 'Balance Sheet', 'name_ar' => 'الميزانية العمومية', 'desc' => 'Shows company assets, liabilities, and equity at a specific date.', 'desc_ar' => 'يعرض أصول الشركة وخصومها وحقوق الملكية في تاريخ محدد.', 'route' => 'admin.financial-reports.balance-sheet', 'icon' => 'account_balance'],
                    ['key' => 'balance-sheet-comparison', 'name' => 'Balance Sheet Comparison', 'name_ar' => 'مقارنة الميزانية العمومية', 'desc' => 'Compare balance sheets across two different periods.', 'desc_ar' => 'قارن الميزانيات العمومية عبر فترتين مختلفتين.', 'route' => 'admin.financial-reports.balance-sheet-comparison', 'icon' => 'compare_arrows'],
                    ['key' => 'balance-sheet-detail', 'name' => 'Balance Sheet Detail', 'name_ar' => 'تفاصيل الميزانية العمومية', 'desc' => 'Detailed breakdown of all balance sheet accounts.', 'desc_ar' => 'تفصيل تفصيلي لجميع حسابات الميزانية العمومية.', 'route' => 'admin.financial-reports.balance-sheet-detail', 'icon' => 'list_alt'],
                    ['key' => 'cash-flow', 'name' => 'Cash Flow Statement', 'name_ar' => 'قائمة التدفقات النقدية', 'desc' => 'Track cash inflows and outflows from operating, investing, and financing activities.', 'desc_ar' => 'تتبع التدفقات النقدية الداخلة والخارجة من الأنشطة التشغيلية والاستثمارية والتمويلية.', 'route' => 'admin.financial-reports.cash-flow', 'icon' => 'payments'],
                    ['key' => 'profit-loss', 'name' => 'Profit & Loss', 'name_ar' => 'الأرباح والخسائر', 'desc' => 'Summary of revenues, costs, and expenses for a specific period.', 'desc_ar' => 'ملخص الإيرادات والتكاليف والمصروفات لفترة محددة.', 'route' => 'admin.financial-reports.profit-loss', 'icon' => 'trending_up'],
                    ['key' => 'profit-loss-comparison', 'name' => 'Profit & Loss Comparison', 'name_ar' => 'مقارنة الأرباح والخسائر', 'desc' => 'Compare P&L results across multiple financial periods.', 'desc_ar' => 'قارن نتائج الأرباح والخسائر عبر فترات مالية متعددة.', 'route' => 'admin.financial-reports.profit-loss-comparison', 'icon' => 'bar_chart'],
                    ['key' => 'profit-loss-class', 'name' => 'Profit & Loss by Class', 'name_ar' => 'الأرباح والخسائر حسب الفئة', 'desc' => 'Analyze profitability segmented by class or department.', 'desc_ar' => 'تحليل الربحية مقسمة حسب الفئة أو القسم.', 'route' => 'admin.financial-reports.profit-loss-class', 'icon' => 'category'],
                    ['key' => 'profit-loss-customer', 'name' => 'Profit & Loss by Customer', 'name_ar' => 'الأرباح والخسائر حسب العميل', 'desc' => 'Profitability analysis for each customer account.', 'desc_ar' => 'تحليل الربحية لكل حساب عميل.', 'route' => 'admin.financial-reports.profit-loss-customer', 'icon' => 'person'],
                    ['key' => 'profit-loss-month', 'name' => 'Profit & Loss by Month', 'name_ar' => 'الأرباح والخسائر حسب الشهر', 'desc' => 'Monthly breakdown of income and expenses.', 'desc_ar' => 'تفصيل شهري للإيرادات والمصروفات.', 'route' => 'admin.financial-reports.profit-loss-month', 'icon' => 'calendar_month'],
                    ['key' => 'profit-loss-detail', 'name' => 'Profit & Loss Detail', 'name_ar' => 'تفاصيل الأرباح والخسائر', 'desc' => 'Detailed line-by-line P&L report with account-level detail.', 'desc_ar' => 'تقرير أرباح وخسائر تفصيلي سطر بسطر مع تفاصيل مستوى الحساب.', 'route' => 'admin.financial-reports.profit-loss-detail', 'icon' => 'description'],
                    ['key' => 'equity-change', 'name' => 'Statement of Changes in Equity', 'name_ar' => 'قائمة التغيرات في حقوق الملكية', 'desc' => 'Details changes in shareholders equity over the period.', 'desc_ar' => 'يُفصّل التغيرات في حقوق الملكية خلال الفترة.', 'route' => '#', 'icon' => 'monitoring'],
                    ['key' => 'trial-balance', 'name' => 'Trial Balance', 'name_ar' => 'ميزان المراجعة', 'desc' => 'List of all account debit and credit balances to verify equality.', 'desc_ar' => 'قائمة بجميع أرصدة المدينة والدائنة للحسابات للتحقق من المساواة.', 'route' => 'admin.financial-reports.trial-balance', 'icon' => 'balance'],
                    ['key' => 'trial-balance-detail', 'name' => 'Trial Balance Detail', 'name_ar' => 'تفاصيل ميزان المراجعة', 'desc' => 'Detailed trial balance with transaction-level breakdown.', 'desc_ar' => 'ميزان مراجعة مفصل مع تفصيل مستوى المعاملات.', 'route' => '#', 'icon' => 'menu_book'],
                ],
            ],
            [
                'category' => 'Banking Reports',
                'category_ar' => 'تقارير البنوك',
                'reports' => [
                    ['key' => 'bank-reconciliation-summary', 'name' => 'Bank Reconciliation Summary', 'name_ar' => 'ملخص التسوية البنكية', 'desc' => 'Summary of reconciled vs unreconciled bank balances.', 'desc_ar' => 'ملخص الأرصدة البنكية المسوية وغير المسوية.', 'route' => '#', 'icon' => 'savings'],
                    ['key' => 'bank-reconciliation-detail', 'name' => 'Bank Reconciliation Detail', 'name_ar' => 'تفاصيل التسوية البنكية', 'desc' => 'Full transaction detail for bank reconciliation.', 'desc_ar' => 'تفاصيل المعاملات الكاملة للتسوية البنكية.', 'route' => '#', 'icon' => 'receipt_long'],
                    ['key' => 'check-detail', 'name' => 'Check Detail', 'name_ar' => 'تفاصيل الشيكات', 'desc' => 'Detailed listing of all checks issued and received.', 'desc_ar' => 'قائمة تفصيلية بجميع الشيكات المصدرة والمستلمة.', 'route' => '#', 'icon' => 'checkbook'],
                    ['key' => 'check-summary', 'name' => 'Check Summary', 'name_ar' => 'ملخص الشيكات', 'desc' => 'Summary totals of checks by status.', 'desc_ar' => 'إجمالي ملخص الشيكات حسب الحالة.', 'route' => '#', 'icon' => 'summarize'],
                    ['key' => 'deposit-detail', 'name' => 'Deposit Detail', 'name_ar' => 'تفاصيل الإيداعات', 'desc' => 'Detailed record of all bank deposits.', 'desc_ar' => 'سجل تفصيلي لجميع الإيداعات البنكية.', 'route' => '#', 'icon' => 'point_of_sale'],
                    ['key' => 'deposit-summary', 'name' => 'Deposit Summary', 'name_ar' => 'ملخص الإيداعات', 'desc' => 'Summary of deposits by account or date.', 'desc_ar' => 'ملخص الإيداعات حسب الحساب أو التاريخ.', 'route' => '#', 'icon' => 'inventory_2'],
                    ['key' => 'missing-checks', 'name' => 'Missing Checks', 'name_ar' => 'الشيكات المفقودة', 'desc' => 'Identify gaps in check number sequences.', 'desc_ar' => 'تحديد الفجوات في تسلسل أرقام الشيكات.', 'route' => '#', 'icon' => 'find_in_page'],
                    ['key' => 'voided-transactions', 'name' => 'Voided / Deleted Transactions', 'name_ar' => 'المعاملات الملغاة / المحذوفة', 'desc' => 'Audit trail of voided and deleted banking transactions.', 'desc_ar' => 'مسار تدقيق للمعاملات البنكية الملغاة والمحذوفة.', 'route' => '#', 'icon' => 'delete_sweep'],
                ],
            ],
            [
                'category' => 'Customers & Receivables Reports (A/R)',
                'category_ar' => 'تقارير العملاء والذمم المدينة',
                'reports' => [
                    ['key' => 'ar-aging-detail', 'name' => 'Accounts Receivable Aging Detail', 'name_ar' => 'تفاصيل تقادم الذمم المدينة', 'desc' => 'Detail of unpaid customer invoices grouped by age brackets.', 'desc_ar' => 'تفاصيل فواتير العملاء غير المدفوعة مجمعة حسب فئات التقادم.', 'route' => '#', 'icon' => 'schedule'],
                    ['key' => 'ar-aging', 'name' => 'Accounts Receivable Aging Summary', 'name_ar' => 'ملخص تقادم الذمم المدينة', 'desc' => 'Summary of customer balances grouped by aging periods.', 'desc_ar' => 'ملخص أرصدة العملاء مجمعة حسب فترات التقادم.', 'route' => 'admin.reports.ar-aging', 'icon' => 'history_toggle_off'],
                    ['key' => 'customer-balance-detail', 'name' => 'Customer Balance Detail', 'name_ar' => 'تفاصيل رصيد العميل', 'desc' => 'Individual transactions making up customer balances.', 'desc_ar' => 'المعاملات الفردية المكونة لأرصدة العملاء.', 'route' => '#', 'icon' => 'receipt'],
                    ['key' => 'customer-balance-summary', 'name' => 'Customer Balance Summary', 'name_ar' => 'ملخص رصيد العميل', 'desc' => 'Current balances owed by each customer.', 'desc_ar' => 'الأرصدة الحالية المستحقة من كل عميل.', 'route' => '#', 'icon' => 'account_balance_wallet'],
                    ['key' => 'customer-contact-list', 'name' => 'Customer Contact List', 'name_ar' => 'قائمة جهات اتصال العملاء', 'desc' => 'Complete directory of customer contact information.', 'desc_ar' => 'دليل كامل لمعلومات اتصال العملاء.', 'route' => '#', 'icon' => 'contacts'],
                    ['key' => 'customer-income-summary', 'name' => 'Customer Income Summary', 'name_ar' => 'ملخص دخل العملاء', 'desc' => 'Revenue generated from each customer.', 'desc_ar' => 'الإيرادات المتحققة من كل عميل.', 'route' => '#', 'icon' => 'paid'],
                    ['key' => 'invoice-list', 'name' => 'Invoice List', 'name_ar' => 'قائمة الفواتير', 'desc' => 'Complete list of all sales invoices.', 'desc_ar' => 'قائمة كاملة بجميع فواتير المبيعات.', 'route' => '#', 'icon' => 'text_snippet'],
                    ['key' => 'open-invoices', 'name' => 'Open Invoices', 'name_ar' => 'الفواتير المفتوحة', 'desc' => 'List of unpaid and partially paid invoices.', 'desc_ar' => 'قائمة الفواتير غير المدفوعة والمدفوعة جزئياً.', 'route' => '#', 'icon' => 'mark_email_unread'],
                    ['key' => 'payments-received', 'name' => 'Payments Received', 'name_ar' => 'المدفوعات المستلمة', 'desc' => 'Record of all payments collected from customers.', 'desc_ar' => 'سجل جميع المدفوعات المحصلة من العملاء.', 'route' => '#', 'icon' => 'download'],
                    ['key' => 'sales-customer-detail', 'name' => 'Sales by Customer Detail', 'name_ar' => 'تفاصيل المبيعات حسب العميل', 'desc' => 'Detailed sales transactions per customer.', 'desc_ar' => 'معاملات المبيعات التفصيلية لكل عميل.', 'route' => '#', 'icon' => 'shopping_cart_checkout'],
                    ['key' => 'sales-customer-summary', 'name' => 'Sales by Customer Summary', 'name_ar' => 'ملخص المبيعات حسب العميل', 'desc' => 'Sales totals summarized by customer.', 'desc_ar' => 'إجماليات المبيعات ملخصة حسب العميل.', 'route' => '#', 'icon' => 'groups'],
                    ['key' => 'sales-item', 'name' => 'Sales by Item', 'name_ar' => 'المبيعات حسب الصنف', 'desc' => 'Sales performance for each product or service item.', 'desc_ar' => 'أداء المبيعات لكل منتج أو خدمة.', 'route' => '#', 'icon' => 'inventory'],
                    ['key' => 'sales-rep', 'name' => 'Sales by Sales Rep', 'name_ar' => 'المبيعات حسب مندوب المبيعات', 'desc' => 'Sales metrics broken down by sales representative.', 'desc_ar' => 'مقاييس المبيعات موزعة حسب مندوب المبيعات.', 'route' => '#', 'icon' => 'supervised_user_circle'],
                    ['key' => 'unbilled-charges', 'name' => 'Unbilled Charges', 'name_ar' => 'المصاريف غير المفوترة', 'desc' => 'Charges that have not yet been invoiced to customers.', 'desc_ar' => 'المصاريف التي لم يتم فوترتها بعد للعملاء.', 'route' => '#', 'icon' => 'pending_actions'],
                ],
            ],
            [
                'category' => 'Sales Reports',
                'category_ar' => 'تقارير المبيعات',
                'reports' => [
                    ['key' => 'daily-sales', 'name' => 'Daily Sales Summary', 'name_ar' => 'ملخص المبيعات اليومية', 'desc' => 'Daily aggregated sales totals and trends.', 'desc_ar' => 'إجماليات واتجاهات المبيعات المجمعة يومياً.', 'route' => '#', 'icon' => 'today'],
                    ['key' => 'sales-product', 'name' => 'Sales by Product / Service', 'name_ar' => 'المبيعات حسب المنتج / الخدمة', 'desc' => 'Revenue by each product or service line.', 'desc_ar' => 'الإيرادات حسب كل سطر منتج أو خدمة.', 'route' => '#', 'icon' => 'sell'],
                    ['key' => 'sales-customer', 'name' => 'Sales by Customer', 'name_ar' => 'المبيعات حسب العميل', 'desc' => 'Sales revenue grouped by customer account.', 'desc_ar' => 'إيرادات المبيعات مجمعة حسب حساب العميل.', 'route' => '#', 'icon' => 'person_pin'],
                    ['key' => 'sales-class', 'name' => 'Sales by Class', 'name_ar' => 'المبيعات حسب الفئة', 'desc' => 'Sales performance segmented by class or tracking category.', 'desc_ar' => 'أداء المبيعات مقسم حسب الفئة أو فئة التتبع.', 'route' => '#', 'icon' => 'label'],
                    ['key' => 'sales-location', 'name' => 'Sales by Location', 'name_ar' => 'المبيعات حسب الموقع', 'desc' => 'Sales figures broken down by branch or location.', 'desc_ar' => 'أرقام المبيعات موزعة حسب الفرع أو الموقع.', 'route' => '#', 'icon' => 'location_on'],
                    ['key' => 'sales-payment', 'name' => 'Sales by Payment Method', 'name_ar' => 'المبيعات حسب طريقة الدفع', 'desc' => 'Distribution of sales across payment methods.', 'desc_ar' => 'توزيع المبيعات عبر طرق الدفع.', 'route' => '#', 'icon' => 'payment'],
                    ['key' => 'sales-tax-liability', 'name' => 'Sales Tax Liability', 'name_ar' => 'الالتزامات الضريبية للمبيعات', 'desc' => 'Calculated sales tax owed to tax authorities.', 'desc_ar' => 'الضريبة المسبقة المحسوبة المستحقة للسلطات الضريبية.', 'route' => '#', 'icon' => 'request_quote'],
                    ['key' => 'sales-tax-revenue', 'name' => 'Sales Tax Revenue Summary', 'name_ar' => 'ملخص إيرادات الضريبة على المبيعات', 'desc' => 'Summary of collected sales tax by jurisdiction.', 'desc_ar' => 'ملخص الضريبة على المبيعات المحصلة حسب الولاية القضائية.', 'route' => '#', 'icon' => 'price_check'],
                ],
            ],
            [
                'category' => 'Expenses & Payables Reports (A/P)',
                'category_ar' => 'تقارير المصروفات والذمم الدائنة',
                'reports' => [
                    ['key' => 'ap-aging-detail', 'name' => 'Accounts Payable Aging Detail', 'name_ar' => 'تفاصيل تقادم الذمم الدائنة', 'desc' => 'Detail of unpaid vendor bills by age bracket.', 'desc_ar' => 'تفاصيل فواتير الموردين غير المدفوعة حسب فئة التقادم.', 'route' => '#', 'icon' => 'timer'],
                    ['key' => 'ap-aging', 'name' => 'Accounts Payable Aging Summary', 'name_ar' => 'ملخص تقادم الذمم الدائنة', 'desc' => 'Summary of vendor balances by aging period.', 'desc_ar' => 'ملخص أرصدة الموردين حسب فترة التقادم.', 'route' => 'admin.reports.ap-aging', 'icon' => 'history'],
                    ['key' => 'bill-detail', 'name' => 'Bill Detail', 'name_ar' => 'تفاصيل الفواتير', 'desc' => 'Line-by-line details of all vendor bills.', 'desc_ar' => 'تفاصيل سطر بسطر لجميع فواتير الموردين.', 'route' => '#', 'icon' => 'feed'],
                    ['key' => 'bill-summary', 'name' => 'Bill Summary', 'name_ar' => 'ملخص الفواتير', 'desc' => 'Summary totals of vendor payables.', 'desc_ar' => 'ملخص إجمالي الذمم الدائنة للموردين.', 'route' => '#', 'icon' => 'dynamic_feed'],
                    ['key' => 'bills-payments', 'name' => 'Bills and Applied Payments', 'name_ar' => 'الفواتير والمدفوعات المطبقة', 'desc' => 'Trace bills with their corresponding payments.', 'desc_ar' => 'تتبع الفواتير مع مدفوعاتها المقابلة.', 'route' => '#', 'icon' => 'join_inner'],
                    ['key' => 'expenses-vendor-detail', 'name' => 'Expenses by Vendor Detail', 'name_ar' => 'تفاصيل المصروفات حسب المورد', 'desc' => 'Detailed expenses attributed to each vendor.', 'desc_ar' => 'مصروفات تفصيلية منسوبة إلى كل مورد.', 'route' => '#', 'icon' => 'local_shipping'],
                    ['key' => 'expenses-vendor-summary', 'name' => 'Expenses by Vendor Summary', 'name_ar' => 'ملخص المصروفات حسب المورد', 'desc' => 'Aggregated expense totals per vendor.', 'desc_ar' => 'إجمالي المصروفات المجمعة لكل مورد.', 'route' => '#', 'icon' => 'local_atm'],
                    ['key' => 'unpaid-bills', 'name' => 'Unpaid Bills', 'name_ar' => 'الفواتير غير المدفوعة', 'desc' => 'All vendor bills currently outstanding.', 'desc_ar' => 'جميع فواتير الموردين المستحقة حالياً.', 'route' => '#', 'icon' => 'error'],
                ],
            ],
            [
                'category' => 'Vendors & Purchases Reports',
                'category_ar' => 'تقارير الموردين والمشتريات',
                'reports' => [
                    ['key' => 'vendor-balance-detail', 'name' => 'Vendor Balance Detail', 'name_ar' => 'تفاصيل رصيد المورد', 'desc' => 'Transactions forming each vendor payable balance.', 'desc_ar' => 'المعاملات المكونة لرصيد كل مورد دائن.', 'route' => '#', 'icon' => 'fact_check'],
                    ['key' => 'vendor-balance-summary', 'name' => 'Vendor Balance Summary', 'name_ar' => 'ملخص رصيد المورد', 'desc' => 'Current payable balances by vendor.', 'desc_ar' => 'الأرصدة الدائنة الحالية حسب المورد.', 'route' => '#', 'icon' => 'wallet'],
                    ['key' => 'vendor-contact-list', 'name' => 'Vendor Contact List', 'name_ar' => 'قائمة جهات اتصال الموردين', 'desc' => 'Complete vendor contact directory.', 'desc_ar' => 'دليل اتصال الموردين الكامل.', 'route' => '#', 'icon' => 'contact_phone'],
                    ['key' => 'purchases-vendor-detail', 'name' => 'Purchases by Vendor Detail', 'name_ar' => 'تفاصيل المشتريات حسب المورد', 'desc' => 'Detailed purchase orders and bills by vendor.', 'desc_ar' => 'أوامر الشراء والفواتير التفصيلية حسب المورد.', 'route' => '#', 'icon' => 'add_shopping_cart'],
                    ['key' => 'purchases-vendor-summary', 'name' => 'Purchases by Vendor Summary', 'name_ar' => 'ملخص المشتريات حسب المورد', 'desc' => 'Total purchases from each vendor.', 'desc_ar' => 'إجمالي المشتريات من كل مورد.', 'route' => '#', 'icon' => 'shopping_bag'],
                    ['key' => 'purchases-product', 'name' => 'Purchases by Product / Service', 'name_ar' => 'المشتريات حسب المنتج / الخدمة', 'desc' => 'Purchase volumes by product or service item.', 'desc_ar' => 'أحجام الشراء حسب المنتج أو الخدمة.', 'route' => '#', 'icon' => 'production_quantity_limits'],
                ],
            ],
            [
                'category' => 'Payroll Reports',
                'category_ar' => 'تقارير الرواتب',
                'reports' => [
                    ['key' => 'employee-details', 'name' => 'Employee Details', 'name_ar' => 'تفاصيل الموظفين', 'desc' => 'Comprehensive employee personnel records.', 'desc_ar' => 'سجلات الموظفين الشخصية الشاملة.', 'route' => '#', 'icon' => 'badge'],
                    ['key' => 'employee-earnings', 'name' => 'Employee Earnings Summary', 'name_ar' => 'ملخص أرباح الموظفين', 'desc' => 'Breakdown of compensation by employee.', 'desc_ar' => 'تفصيل التعويضات حسب الموظف.', 'route' => '#', 'icon' => 'attach_money'],
                    ['key' => 'payroll-summary', 'name' => 'Payroll Summary', 'name_ar' => 'ملخص الرواتب', 'desc' => 'Aggregated payroll totals for the period.', 'desc_ar' => 'إجمالي الرواتب المجمعة للفترة.', 'route' => '#', 'icon' => 'assessment'],
                    ['key' => 'payroll-detail', 'name' => 'Payroll Detail', 'name_ar' => 'تفاصيل الرواتب', 'desc' => 'Itemized payroll entries with deductions.', 'desc_ar' => 'بنود الرواتب مفصلة مع الاستقطاعات.', 'route' => '#', 'icon' => 'reorder'],
                    ['key' => 'payroll-tax-liability', 'name' => 'Payroll Tax Liability', 'name_ar' => 'الالتزامات الضريبية للرواتب', 'desc' => 'Accrued payroll taxes due to authorities.', 'desc_ar' => 'ضرائب الرواتب المستحقة للسلطات.', 'route' => '#', 'icon' => 'gavel'],
                    ['key' => 'payroll-tax-payments', 'name' => 'Payroll Tax Payments', 'name_ar' => 'مدفوعات ضريبة الرواتب', 'desc' => 'Record of payroll tax remittances made.', 'desc_ar' => 'سجل تحويلات ضريبة الرواتب المنفذة.', 'route' => '#', 'icon' => 'account_circle'],
                    ['key' => 'time-activities', 'name' => 'Time Activities by Employee', 'name_ar' => 'أنشطة الوقت حسب الموظف', 'desc' => 'Timesheet and billable hours per employee.', 'desc_ar' => 'سجل الحضور وساعات الفوترة لكل موظف.', 'route' => '#', 'icon' => 'schedule_send'],
                    ['key' => 'vacation-sick', 'name' => 'Vacation and Sick Leave', 'name_ar' => 'الإجازات السنوية والمرضية', 'desc' => 'Accrued and used leave balances by employee.', 'desc_ar' => 'أرصدة الإجازات المستحقة والمستخدمة حسب الموظف.', 'route' => '#', 'icon' => 'beach_access'],
                ],
            ],
            [
                'category' => 'Inventory Reports',
                'category_ar' => 'تقارير المخزون',
                'reports' => [
                    ['key' => 'inventory-valuation-summary', 'name' => 'Inventory Valuation Summary', 'name_ar' => 'ملخص تقييم المخزون', 'desc' => 'Aggregated value of inventory on hand.', 'desc_ar' => 'القيمة المجمعة للمخزون المتوفر.', 'route' => 'admin.financial-reports.inventory-valuation-summary', 'icon' => 'warehouse'],
                    ['key' => 'inventory-valuation-detail', 'name' => 'Inventory Valuation Detail', 'name_ar' => 'تفاصيل تقييم المخزون', 'desc' => 'Item-level inventory valuation with costs.', 'desc_ar' => 'تقييم المخزون على مستوى الصنف مع التكاليف.', 'route' => '#', 'icon' => 'stacked_line_chart'],
                    ['key' => 'inventory-stock-status', 'name' => 'Inventory Stock Status by Item', 'name_ar' => 'حالة المخزون حسب الصنف', 'desc' => 'Current stock quantities and reorder points.', 'desc_ar' => 'الكميات الحالية ونقاط إعادة الطلب.', 'route' => '#', 'icon' => 'low_priority'],
                    ['key' => 'physical-inventory', 'name' => 'Physical Inventory Worksheet', 'name_ar' => 'ورقة عمل الجرد الفعلي', 'desc' => 'Worksheet for counting physical stock vs system.', 'desc_ar' => 'ورقة عمل لعد المخزون الفعلي مقابل النظام.', 'route' => '#', 'icon' => 'checklist'],
                    ['key' => 'product-list', 'name' => 'Product / Service List', 'name_ar' => 'قائمة المنتجات / الخدمات', 'desc' => 'Complete catalog of inventory items and services.', 'desc_ar' => 'كتالوج كامل لأصناف المخزون والخدمات.', 'route' => '#', 'icon' => 'list'],
                    ['key' => 'sales-product-inv', 'name' => 'Sales by Product', 'name_ar' => 'المبيعات حسب المنتج', 'desc' => 'Units sold and revenue per product.', 'desc_ar' => 'الوحدات المباعة والإيرادات لكل منتج.', 'route' => '#', 'icon' => 'producers'],
                    ['key' => 'purchases-product-inv', 'name' => 'Purchases by Product', 'name_ar' => 'المشتريات حسب المنتج', 'desc' => 'Units received and costs per product.', 'desc_ar' => 'الوحدات المستلمة والتكاليف لكل منتج.', 'route' => '#', 'icon' => 'add_circle'],
                ],
            ],
            [
                'category' => 'Accountant & Taxes Reports',
                'category_ar' => 'تقارير المحاسب والضرائب',
                'reports' => [
                    ['key' => 'chart-of-accounts', 'name' => 'Chart of Accounts', 'name_ar' => 'دليل الحسابات', 'desc' => 'Complete list of all general ledger accounts.', 'desc_ar' => 'قائمة كاملة بجميع حسابات دفتر الأستاذ العام.', 'route' => 'admin.financial-reports.coa', 'icon' => 'account_tree'],
                    ['key' => 'audit-log', 'name' => 'Audit Log', 'name_ar' => 'سجل التدقيق', 'desc' => 'Chronological record of all financial transactions.', 'desc_ar' => 'سجل زمني لجميع المعاملات المالية.', 'route' => '#', 'icon' => 'admin_panel_settings'],
                    ['key' => 'general-ledger', 'name' => 'General Ledger', 'name_ar' => 'دفتر الأستاذ العام', 'desc' => 'Complete transaction history for each GL account.', 'desc_ar' => 'سجل المعاملات الكامل لكل حساب في دفتر الأستاذ.', 'route' => 'admin.financial-reports.general-ledger', 'icon' => 'menu_book'],
                    ['key' => 'journal', 'name' => 'Journal', 'name_ar' => 'اليومية', 'desc' => 'Chronological journal entries posted to the ledger.', 'desc_ar' => 'قيود اليومية المسجلة في الدفتر بالترتيب الزمني.', 'route' => 'admin.financial-reports.journal', 'icon' => 'article'],
                    ['key' => 'transaction-detail', 'name' => 'Transaction Detail by Account', 'name_ar' => 'تفاصيل المعاملة حسب الحساب', 'desc' => 'Detailed transaction breakdown for any account.', 'desc_ar' => 'تفصيل تفصيلي للمعاملات لأي حساب.', 'route' => 'admin.reports.account-statement', 'icon' => 'view_list'],
                    ['key' => 'transaction-list-date', 'name' => 'Transaction List by Date', 'name_ar' => 'قائمة المعاملات حسب التاريخ', 'desc' => 'All transactions listed chronologically.', 'desc_ar' => 'جميع المعاملات مسجلة ترتيباً زمنياً.', 'route' => '#', 'icon' => 'date_range'],
                    ['key' => 'transaction-list-vendor', 'name' => 'Transaction List by Vendor', 'name_ar' => 'قائمة المعاملات حسب المورد', 'desc' => 'Transactions filtered and grouped by vendor.', 'desc_ar' => 'المعاملات مصفاة ومجمعة حسب المورد.', 'route' => '#', 'icon' => 'local_convenience_store'],
                    ['key' => 'transaction-list-splits', 'name' => 'Transaction List with Splits', 'name_ar' => 'قائمة المعاملات مع التوزيعات', 'desc' => 'Transactions showing split distributions to accounts.', 'desc_ar' => 'المعاملات التي تُظهر توزيعات التقسيم على الحسابات.', 'route' => '#', 'icon' => 'horizontal_split'],
                    ['key' => 'tax-summary', 'name' => 'Tax Summary', 'name_ar' => 'ملخص الضرائب', 'desc' => 'Aggregated tax obligations and collections summary.', 'desc_ar' => 'ملخص الالتزامات الضريبية والمحصلات المجمعة.', 'route' => '#', 'icon' => 'euro_symbol'],
                    ['key' => 'tax-detail', 'name' => 'Tax Detail', 'name_ar' => 'تفاصيل الضرائب', 'desc' => 'Line-item detail of all tax transactions.', 'desc_ar' => 'تفاصيل بنود جميع المعاملات الضريبية.', 'route' => '#', 'icon' => 'percent'],
                ],
            ],
            [
                'category' => 'Budget & Planning Reports',
                'category_ar' => 'تقارير الميزانية والتخطيط',
                'reports' => [
                    ['key' => 'budget-overview', 'name' => 'Budget Overview', 'name_ar' => 'نظرة عامة على الميزانية', 'desc' => 'High-level summary of approved budget amounts.', 'desc_ar' => 'ملخص رفيع المستوى لمبالغ الميزانية المعتمدة.', 'route' => '#', 'icon' => 'pie_chart'],
                    ['key' => 'budget-actual', 'name' => 'Budget vs Actual', 'name_ar' => 'الميزانية مقابل الفعلي', 'desc' => 'Compare budgeted figures to actual results.', 'desc_ar' => 'قارن الأرقام الم budgeting بالنتائج الفعلية.', 'route' => '#', 'icon' => 'insights'],
                    ['key' => 'budget-actual-class', 'name' => 'Budget vs Actual by Class', 'name_ar' => 'الميزانية مقابل الفعلي حسب الفئة', 'desc' => 'Budget variance analysis segmented by class.', 'desc_ar' => 'تحليل انحراف الميزانية مقسم حسب الفئة.', 'route' => '#', 'icon' => 'tune'],
                ],
            ],
        ];

        foreach ($definitions as $definition) {
            $category = $definition['category'];
            $categoryAr = $definition['category_ar'];

            foreach ($definition['reports'] as $index => $report) {
                FinancialReport::updateOrCreate(
                    ['report_key' => $report['key']],
                    [
                        'company_id' => null,
                        'report_name' => $report['name'],
                        'report_name_ar' => $report['name_ar'] ?? null,
                        'description' => $report['desc'] ?? null,
                        'description_ar' => $report['desc_ar'] ?? null,
                        'category' => $category,
                        'category_ar' => $categoryAr,
                        'route_name' => $report['route'],
                        'icon' => $report['icon'] ?? 'description',
                        'sort_order' => $index + 1,
                        'is_active' => true,
                    ],
                );
            }
        }
    }
}
