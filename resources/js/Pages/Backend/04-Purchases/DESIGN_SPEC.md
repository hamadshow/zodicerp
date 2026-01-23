# Purchase Module UI/UX Design Specification

## 1. System Overview
- **Platform**: Laravel (Backend) + React/Inertia.js (Frontend)
- **Design Standard**: Professional accounting system, consistent with global admin UI
- **Responsiveness**: Desktop, Tablet, Mobile
- **Layout Pattern**: `AdminLayout` (Header + Sidebar + Footer), design inspired by `Cheque.jsx` and `ChequeCE.jsx`
- **Scope Paths**:
  - UI: `resources/js/Pages/Backend/04-Purchases`
  - Controllers: `app/Http/Controllers/Purchases`
- **Data Schema**: Migrations listed in task request (suppliers, quotations, orders, invoices, payments, taxes, costing, expenses, landed costs)

## 2. Navigation Structure (Sidebar)
### 1. DASHBOARD
- Overview
- Financial Summary
- Recent Activities

### 2. SUPPLIERS & AP MANAGEMENT (Icon: users)
- Suppliers
  - All Suppliers
  - Add New Supplier
  - Supplier Groups
  - Supplier Categories
- Contacts Management
- Address Book
- Opening Balances
- Supplier Statements

### 3. PURCHASE MANAGEMENT (Icon: shopping-cart)
- Purchase Quotations
  - New Quotation
  - Quotation List
  - Quotation Approval
- Purchase Orders
  - Create PO
  - PO List
  - PO Tracking
- Purchase Invoices
  - Create Invoice
  - Invoice List
  - Pending Invoices
  - Overdue Invoices
- Goods Receipts
- Purchase Returns
- GRN Management

### 4. COSTING & EXPENSES (Icon: dollar-sign)
- Purchase Costing
- Expense Management
- Landed Costs
- Cost Allocation

## 3. UI Patterns and Layout
### A. List Views (Pattern: `Cheque.jsx`)
- Header with page title, breadcrumb, and primary CTA
- Stats cards for key metrics
- Search with debounce and advanced filter panel
- Table with sticky header, column sorting, and bulk actions
- Row actions: View, Edit, Delete
- Pagination and per-page selection

### B. Create/Edit Views (Pattern: `ChequeCE.jsx`)
- Two-column form grid with section headers
- Right-side summary card for status, totals, actions
- Tabs for complex records
- Inline field validation messages
- Primary and secondary actions in the footer

### C. State and Feedback
- Optimistic UI updates where safe
- Toasts for success/error
- Skeleton loading for large datasets
- Empty states with helpful CTAs

## 4. CRUD Coverage by Module
### 4.1 Supplier Groups
- Data source: `supplier_groups`
- List: code, name (AR/EN), parent, status, payment terms, credit limit
- Create/Edit: code, name_ar, name_en, parent_id, account_id, payment_terms, default_credit_limit, notes, is_active
- Actions: view tree, edit, delete, bulk status

### 4.2 Suppliers
- Data source: `suppliers`
- List columns: supplier_code, name_ar/name_en, group, contact, current_balance, credit_limit, is_active
- Detail tabs:
  - Basic Information
  - Addresses
  - Contacts
  - Financial Information
  - Documents
  - Activity Log
- Create/Edit fields: supplier_code, names, group, account, currency, credit_limit, payment_terms, default_payment_method, warehouse, phones, email, tax_number, commercial_register, notes, is_active

### 4.3 Supplier Addresses
- Data source: `supplier_addresses`
- List: supplier, address_type, city, district, email, phone, is_default
- Create/Edit: address_type, address_name, country_id, city_id, street, postal_code, phone, email, is_default, notes

### 4.4 Supplier Contacts
- Data source: `supplier_contacts`
- List: supplier, name_ar/name_en, department, phone, email, is_primary
- Create/Edit: name, position, department, phone/mobile/email, is_primary, receive_statements, receive_notifications

### 4.5 Supplier Opening Balances
- Data source: `supplier_opening_balances`
- List: supplier, financial_year, currency, debit, credit, net_balance
- Create/Edit: financial_year, opening_date, currency_id, exchange_rate, debit_amount, credit_amount, notes

### 4.6 Supplier Statements
- Data source: `supplier_statements` and `supplier_statement_details`
- List: statement_number, supplier, period, opening_balance, closing_balance, sent_status
- Detail: transaction grid with debit/credit, balance rollup
- Actions: print, email, export

### 4.7 Purchase Quotations
- Data source: `purchase_quotations`
- List columns: quotation_number, quotation_date, supplier, status, total_amount, expiry_date
- Create/Edit fields: supplier, currency, exchange_rate, quotation_date, expiry_date, valid_days, warehouse, discount, tax, shipping, notes
- Status flow: draft → sent → under_review → approved/rejected → converted/expired
- Approval view with audit notes and sent method/date

### 4.8 Purchase Orders
- Data source: `purchase_orders`
- List columns: order_number, supplier, order_date, expected_delivery_date, status, total_amount
- Create/Edit fields: supplier, quotation_id, currency, warehouse, discount, tax, shipping, total, priority, payment_terms
- Tracking view: expected vs actual delivery and GRN linkage

### 4.9 Purchase Invoices
- Data source: `purchase_invoices` and `purchase_invoice_details`
- List columns: invoice_number, supplier, invoice_date, due_date, payment_status, total_amount
- Create/Edit fields: supplier, order_id, currency, warehouse, discount, tax, shipping, other_costs, due_date, posting_date, notes
- Three-way matching UI between PO, GRN, and invoice lines

### 4.10 Goods Receipts
- Data source: `goods_receipts` and `goods_receipt_details`
- List: receipt_number, order, receipt_date, status, quality_status, total_items
- Create/Edit: order_id, invoice_id, warehouse_id, receipt_date/time, received_by, checked_by, receipt_type
- Detail: line items, batch/expiry, quality checks, accepted vs rejected

### 4.11 Purchase Returns
- Data source: `purchase_returns` and `purchase_return_details`
- List: return_number, supplier, return_date, status, refund_status, total_amount
- Create/Edit: invoice_id, supplier, warehouse, return_reason, return_type, notes
- Detail: item condition, inspection notes, refund tracking

### 4.12 Discounts & Taxes
- Data source: `purchase_discounts`, `purchase_discount_suppliers`, `purchase_taxes`
- Discount list: code, type, value, start/end, is_active
- Tax list: code, name, tax_rate, tax_type, calculation_method, is_active
- Calculation view: simulate tax/discount on selected invoices

### 4.13 Costing & Expenses
- Data source: `purchase_costings`, `purchase_expenses`, `landed_costs`, `landed_cost_details`, `landed_cost_allocations`
- Costing list: product, purchase_date, quantity, total_cost, costing_method
- Expense list: expense_number, supplier, expense_date, type, amount, allocation_status
- Landed cost list: reference_number, allocation_method, total_amount, remaining_to_allocate
- Allocation view: distribute landed costs by value/quantity/weight/manual

## 5. UX Requirements
### A. Performance
- Lazy loading for large datasets
- Optimistic updates for inline actions
- Caching of static lookups (suppliers, currencies, warehouses)
- Background refresh for list views

### B. Mobile Optimization
- Simplified forms and stacked grids
- Touch-friendly buttons and larger input targets
- Mobile-specific navigation and quick actions
- Offline data entry for drafts with local sync

## 6. Interaction Patterns
- Inline validation for required fields
- Bulk actions with confirmation dialog
- Export options (PDF/Excel) from list views
- Multi-step wizard for quotations and invoices
- Role-based access for approval steps
