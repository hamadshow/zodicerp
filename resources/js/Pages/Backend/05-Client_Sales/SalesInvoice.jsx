import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import BlankPage from '@/Components/BlankPage';
import SearchableComboBox from '../components/SearchableComboBox';
import Table from '../components/Table';
import { formatDate } from '@/utils/date';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';

export default function SalesInvoice({ invoices, customers, orders, currencies, products, salesAgents, units, warehouses, treasuries, filters = {} }) {
    const [mode, setMode] = useState('list');
    const invoiceRef = useRef(null);
    const printRef = useRef(null);
    const { props } = usePage();
    const { localization, errors } = props;
    const translations = localization?.translations || {};

    const getLocalizedRoute = (name, params = {}) => {
        return route(name, {
            country: localization?.country_code || 'sa',
            lang: localization?.current_locale || 'ar',
            ...params
        });
    };

    const t = (key, fallback) => {
        return translations[key] || translations[`SalesInvoice.${key}`] || translations[`common.${key}`] || fallback;
    };

    const aggregateStats = useMemo(() => {
        const rows = invoices?.data || [];
        let totalAmount = 0;
        let totalBalance = 0;
        let unpaid = 0;
        let partial = 0;
        let paid = 0;
        rows.forEach(inv => {
            totalAmount += parseFloat(inv.total_amount || 0);
            totalBalance += parseFloat(inv.balance_amount || 0);
            if (inv.payment_status === 'unpaid') unpaid++;
            else if (inv.payment_status === 'partial') partial++;
            else if (inv.payment_status === 'paid') paid++;
        });
        return {
            totalInvoices: rows.length,
            totalAmount,
            totalBalance,
            unpaid, partial, paid,
        };
    }, [invoices]);

    const breadcrumbs = [
        { label: t('sidebar.Dashboard', 'Dashboard'), href: getLocalizedRoute('admin.dashboard') },
        { label: t('sidebar.client_sales', 'Client Sales'), onClick: (e) => { e.preventDefault(); setMode('list'); } },
        { label: t('sidebar.sales_invoices', 'Sales Invoices') }
    ];
    if (mode === 'create') breadcrumbs.push({ label: t('common.create', 'Create') });
    if (mode === 'edit') breadcrumbs.push({ label: t('common.edit', 'Edit') });

    const statsContent = mode === 'list' && (
        <div className="stats-cards">
            <div className="stat-card">
                <div className="stat-icon" style={{ backgroundColor: 'var(--primary-color)' }}>
                    <span className="material-icons-outlined">receipt</span>
                </div>
                <div className="stat-content">
                    <div className="stat-value">{aggregateStats.totalInvoices.toLocaleString()}</div>
                    <div className="stat-label">{t('total_invoices', 'Total Invoices')}</div>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon" style={{ backgroundColor: 'var(--warning-color)' }}>
                    <span className="material-icons-outlined">savings</span>
                </div>
                <div className="stat-content">
                    <div className="stat-value">{Number(aggregateStats.totalBalance).toFixed(2)}</div>
                    <div className="stat-label">{t('balance_due', 'Balance Due')}</div>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon" style={{ backgroundColor: 'var(--success-color)' }}>
                    <span className="material-icons-outlined">paid</span>
                </div>
                <div className="stat-content">
                    <div className="stat-value">{Number(aggregateStats.totalAmount).toFixed(2)}</div>
                    <div className="stat-label">{t('total_amount', 'Total Amount')}</div>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon" style={{ backgroundColor: 'var(--info-color)' }}>
                    <span className="material-icons-outlined">checklist</span>
                </div>
                <div className="stat-content">
                    <div className="stat-value">
                        <span style={{ color: 'var(--error-color)' }}>{aggregateStats.unpaid}</span>
                        {' / '}
                        <span style={{ color: 'var(--warning-color)' }}>{aggregateStats.partial}</span>
                        {' / '}
                        <span style={{ color: 'var(--success-color)' }}>{aggregateStats.paid}</span>
                    </div>
                    <div className="stat-label">{t('unpaid_partial_paid', 'Unpaid / Partial / Paid')}</div>
                </div>
            </div>
        </div>
    );

    const tableColumns = useMemo(() => [
        {
            header: t('ref_no', 'Ref #'),
            key: 'invoice_number',
            sortable: true,
            width: '140px',
            render: (row) => <strong style={{ fontFamily: 'monospace' }}>{row.invoice_number || `#${row.id}`}</strong>,
        },
        {
            header: t('date', 'Date'),
            key: 'invoice_date',
            sortable: true,
            width: '130px',
            render: (row) => formatDate(row.invoice_date),
        },
        {
            header: t('customer', 'Customer'),
            key: 'customer_id',
            sortable: true,
            render: (row) => row?.customer?.name_en || row?.customer?.name_ar || row?.customer?.name || '-',
        },
        {
            header: t('type', 'Type'),
            key: 'invoice_type',
            sortable: false,
            width: '130px',
            render: (row) => (
                <span className={`status-badge type-${row.invoice_type}`}>
                    {(row.invoice_type || 'standard').replace('_', ' ')}
                </span>
            ),
        },
        {
            header: t('status', 'Status'),
            key: 'payment_status',
            sortable: true,
            width: '120px',
            render: (row) => (
                <span className={`status-badge status-${row.payment_status}`}>
                    {row.payment_status || 'unpaid'}
                </span>
            ),
        },
        {
            header: t('total', 'Total'),
            key: 'total_amount',
            sortable: true,
            width: '150px',
            render: (row) => (
                <span style={{ fontFamily: 'monospace' }}>
                    {Number(row.total_amount || 0).toFixed(2)} {row?.currency?.code || ''}
                </span>
            ),
        },
        {
            header: t('balance', 'Balance'),
            key: 'balance_amount',
            sortable: true,
            width: '150px',
            render: (row) => {
                const bal = Number(row.balance_amount || 0);
                return (
                    <span
                        style={{
                            fontFamily: 'monospace',
                            fontWeight: bal > 0 ? 'bold' : 'normal',
                            color: bal > 0 ? 'var(--error-color)' : 'inherit',
                        }}
                    >
                        {bal.toFixed(2)} {row?.currency?.code || ''}
                    </span>
                );
            },
        },
    ], []);

    const handleToolbarSearch = (searchText) => {
        router.get(getLocalizedRoute('admin.client-sales.invoices.index'), {
            ...filters,
            search: searchText,
            page: 1,
        }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const handleRefresh = () => {
        router.reload({ only: ['invoices', 'filters'], preserveState: true, preserveScroll: true });
    };

    const handleServerSort = (sortKey, sortDirection) => {
        const params = { ...filters };
        if (sortKey && sortDirection) {
            params.sort_by = sortKey;
            params.sort_dir = sortDirection;
        } else {
            delete params.sort_by;
            delete params.sort_dir;
        }
        params.page = 1;
        router.get(getLocalizedRoute('admin.client-sales.invoices.index'), params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const orderOptions = useMemo(() => {
        return (orders || []).map(o => ({
            value: String(o.id),
            label: o.order_number || String(o.id)
        }));
    }, [orders]);

    const currencyOptions = useMemo(() => {
        return (currencies || []).map(c => ({
            value: String(c.id),
            label: c.code
        }));
    }, [currencies]);

    const productOptions = useMemo(() => {
        return (products || []).map(p => ({
            value: String(p.id),
            label: p.name_en || p.name_ar || ''
        }));
    }, [products]);

    const unitOptions = useMemo(() => {
        return (units || []).map(u => ({
            value: String(u.id),
            label: u.name_en || u.name_ar || ''
        }));
    }, [units]);

    const warehouseOptions = useMemo(() => {
        return (warehouses || []).map(w => ({
            value: String(w.id),
            label: w.name_en || w.name_ar || ''
        }));
    }, [warehouses]);

    const treasuryOptions = useMemo(() => {
        return (treasuries || []).map(a => ({
            value: String(a.AccID),
            label: a.AccName
        }));
    }, [treasuries]);

    const { data, setData, post, put, delete: destroy, processing, reset } = useForm({
        id: '',
        invoice_number: '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: '',
        order_id: '',
        customer_id: '',
        currency_id: '',
        exchange_rate: 1.000000,
        invoice_type: 'standard',
        payment_status: 'unpaid',
        treasury_id: '',

        sales_agent_id: '',
        shipping_address_id: '',
        customer_notes: '',
        internal_notes: '',

        subtotal: 0,
        discount_amount: 0,
        tax_amount: 0,
        shipping_cost: 0,
        other_charges: 0,
        total_amount: 0,
        paid_amount: 0,
        balance_amount: 0,

        items: [],

        payment_terms: '',
    });

    useEffect(() => {
        calculateTotals(data.items);
    }, [data.items, data.discount_amount, data.shipping_cost, data.other_charges, data.tax_amount, data.paid_amount]);

    const handleCreate = () => {
        reset();
        const today = new Date();
        const due = new Date();
        due.setDate(today.getDate() + 30);

        const baseCurrency = (currencies || []).find(c => c.is_base == 1 || c.is_default == 1 || c.default == 1);
        const defaultCurrencyId = baseCurrency ? String(baseCurrency.id) : (currencies?.[0] ? String(currencies[0].id) : '');
        const defaultExchangeRate = baseCurrency ? Number(baseCurrency.rate || baseCurrency.exchange_rate || 1) : 1.000000;

        setData({
            id: '',
            invoice_number: '',
            invoice_date: today.toISOString().split('T')[0],
            due_date: due.toISOString().split('T')[0],
            order_id: '',
            customer_id: '',
            currency_id: defaultCurrencyId,
            exchange_rate: defaultExchangeRate,
            invoice_type: 'standard',
            payment_status: 'unpaid',
            treasury_id: treasuries?.[0]?.AccID || '',
            sales_agent_id: '',
            shipping_address_id: '',
            customer_notes: '',
            internal_notes: '',
            subtotal: 0,
            discount_amount: 0,
            tax_amount: 0,
            shipping_cost: 0,
            other_charges: 0,
            total_amount: 0,
            paid_amount: 0,
            balance_amount: 0,
            items: [{
                id: null,
                line_number: 1,
                product_id: '',
                item_name_ar: '',
                item_name_en: '',
                quantity: 1,
                unit_id: '',
                warehouse_id: warehouses?.[0]?.id || '',
                unit_price: 0,
                discount_amount: 0,
                tax_amount: 0,
                line_total: 0,
            }],
            payment_terms: '',
        });

        setMode('create');
    };

    const handleEdit = (invoice) => {
        const toNum = (v) => (v === null || v === undefined ? 0 : Number(v));
        setData({
            ...invoice,
            items: (invoice.details || []).map(it => {
                const qty = toNum(it.quantity);
                const unitPrice = toNum(it.unit_price);
                const discountAmount = toNum(it.discount_amount);
                const taxAmount = toNum(it.tax_amount);

                return {
                    ...it,
                    quantity: qty,
                    unit_price: unitPrice,
                    discount_amount: discountAmount,
                    tax_amount: taxAmount,
                    line_total: toNum(it.line_total),
                    unit_id: it.unit_id || it.product?.unit_id || '',
                    warehouse_id: it.warehouse_id || '',
                    item_name_ar: it.product?.name_ar || '',
                    item_name_en: it.product?.name_en || '',
                };
            }),
            invoice_date: invoice.invoice_date ? invoice.invoice_date.split('T')[0] : '',
            due_date: invoice.due_date ? invoice.due_date.split('T')[0] : '',
            subtotal: toNum(invoice.subtotal),
            tax_amount: toNum(invoice.tax_amount),
            discount_amount: toNum(invoice.discount_amount),
            shipping_cost: toNum(invoice.shipping_cost),
            other_charges: toNum(invoice.other_charges),
            total_amount: toNum(invoice.total_amount),
            paid_amount: toNum(invoice.paid_amount),
            balance_amount: toNum(invoice.balance_amount),
            exchange_rate: toNum(invoice.exchange_rate) || 1.000000,
            customer_id: invoice.customer_id || '',
            sales_agent_id: invoice.sales_agent_id || '',
            shipping_address_id: invoice.shipping_address_id || '',
            payment_terms: invoice.payment_terms || '',
            treasury_id: invoice.treasury_id || '',
        });
        setMode('edit');
    };

    const handleDelete = (id) => {
        if (confirm(t('delete_confirm', 'Are you sure you want to delete this invoice?'))) {
            destroy(getLocalizedRoute('admin.client-sales.invoices.destroy', { invoice: id }));
        }
    };

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        if (mode === 'create') {
            post(getLocalizedRoute('admin.client-sales.invoices.store'), {
                preserveScroll: true,
                onSuccess: () => {
                    setMode('list');
                    reset();
                },
            });
        } else {
            put(getLocalizedRoute('admin.client-sales.invoices.update', { invoice: data.id }), {
                preserveScroll: true,
                onSuccess: () => {
                    setMode('list');
                    reset();
                },
            });
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportPDF = () => {
        const element = printRef.current;
        if (!element) return;

        const module = element.closest('.sales-invoices-module');
        if (module) module.classList.add('generating-pdf');

        const opt = {
            margin: [5, 5],
            filename: `SalesInvoice_${data.invoice_number || 'New'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save().then(() => {
            if (module) module.classList.remove('generating-pdf');
        });
    };

    const handleExportExcel = () => {
        const itemsData = data.items.map((item, index) => ({
            '#': index + 1,
            'Product': products.find(p => p.id == item.product_id)?.name_en || '',
            'Description': item.item_name_ar || '',
            'Quantity': Number(item.quantity),
            'Price': Number(item.unit_price),
            'Discount': Number(item.discount_amount),
            'Tax Amount': Number(item.tax_amount),
            'Total': Number(item.line_total)
        }));

        itemsData.push({});
        itemsData.push({ 'Product': 'Subtotal', 'Total': Number(data.subtotal) });
        itemsData.push({ 'Product': 'Tax', 'Total': Number(data.tax_amount) });
        itemsData.push({ 'Product': 'Discount', 'Total': Number(data.discount_amount) });
        itemsData.push({ 'Product': 'Shipping', 'Total': Number(data.shipping_cost) });
        itemsData.push({ 'Product': 'Grand Total', 'Total': Number(data.total_amount) });

        const worksheet = XLSX.utils.json_to_sheet(itemsData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Invoice");
        XLSX.writeFile(workbook, `SalesInvoice_${data.invoice_number || 'New'}.xlsx`);
    };

    const addItem = () => {
        setData('items', [
            ...data.items,
            {
                id: null,
                line_number: data.items.length + 1,
                product_id: '',
                item_name_ar: '',
                item_name_en: '',
                quantity: 1,
                unit_id: '',
                warehouse_id: '',
                unit_price: 0,
                discount_amount: 0,
                tax_amount: 0,
                line_total: 0,
            }
        ]);
    };

    const removeItem = (index) => {
        const newItems = [...data.items];
        newItems.splice(index, 1);
        setData('items', newItems);
        calculateTotals(newItems);
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...data.items];
        newItems[index][field] = value;

        if (field === 'product_id') {
            const product = products.find(p => p.id == value);
            if (product) {
                newItems[index].item_name_ar = product.name_ar || product.name || '';
                newItems[index].item_name_en = product.name_en || product.name || '';
                newItems[index].unit_price = product.sale_price || 0;
                newItems[index].unit_id = product.unit_id || '';
                newItems[index].warehouse_id = newItems[index].warehouse_id || (warehouses?.[0]?.id || '');
            }
        }

        const qty = parseFloat(newItems[index].quantity) || 0;
        const price = parseFloat(newItems[index].unit_price) || 0;
        const discAmount = parseFloat(newItems[index].discount_amount) || 0;
        const taxVal = parseFloat(newItems[index].tax_amount) || 0;

        const netPrice = (qty * price) - discAmount;
        const total = netPrice + taxVal;

        newItems[index].line_total = total.toFixed(2);

        setData('items', newItems);
    };

    const calculateTotals = (items) => {
        const globalDiscount = parseFloat(data.discount_amount) || 0;
        const shipping = parseFloat(data.shipping_cost) || 0;
        const other = parseFloat(data.other_charges) || 0;

        let calculatedSubtotal = 0;
        let calculatedTax = 0;

        items.forEach(item => {
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.unit_price) || 0;
            const iDisc = parseFloat(item.discount_amount) || 0;
            const iTax = parseFloat(item.tax_amount) || 0;

            calculatedSubtotal += (qty * price) - iDisc;
            calculatedTax += iTax;
        });

        const totalAmount = calculatedSubtotal + calculatedTax - globalDiscount + shipping + other;
        const paid = parseFloat(data.paid_amount) || 0;
        const balance = totalAmount - paid;

        if (
            Math.abs(data.subtotal - calculatedSubtotal) > 0.01 ||
            Math.abs(data.tax_amount - calculatedTax) > 0.01 ||
            Math.abs(data.total_amount - totalAmount) > 0.01 ||
            Math.abs(data.balance_amount - balance) > 0.01
        ) {
            setData(prev => ({
                ...prev,
                subtotal: calculatedSubtotal,
                tax_amount: calculatedTax,
                total_amount: totalAmount,
                balance_amount: balance
            }));
        }
    };

    return (
        <AdminLayout activeMenu={t('sidebar.sales_invoices', 'Sales Invoices')}>
            <Head title={t('title', 'Sales Invoices Management')} />

            <BlankPage breadcrumbs={breadcrumbs} stats={mode === 'list' ? statsContent : undefined}>
                <div className="sales-invoices-module">

                    {mode === 'list' ? (
                        <div className="fade-in">
                            <Table
                                showToolbar={true}
                                toolbarSearch={true}
                                toolbarSearchValue={filters.search || ''}
                                onToolbarSearch={handleToolbarSearch}
                                toolbarSearchPlaceholder={t('search_placeholder', 'Search invoices...')}
                                showAddButton={true}
                                addButtonText={t('create_invoice', '+ Create Invoice')}
                                onAdd={handleCreate}
                                showRefreshButton={true}
                                onRefresh={handleRefresh}
                                tableData={invoices?.data || invoices || []}
                                columns={tableColumns}
                                onEdit={(row) => handleEdit(row)}
                                onDelete={(row) => handleDelete(row.id)}
                                onSort={handleServerSort}
                                serverSide={true}
                                sortKey={filters.sort_by}
                                sortDirection={filters.sort_dir}
                                currentPage={invoices?.current_page || 1}
                                totalPages={invoices?.last_page || 1}
                                totalRecords={invoices?.total || 0}
                                recordsPerPage={invoices?.per_page || 10}
                                onPageChange={(page) => {
                                    router.get(getLocalizedRoute('admin.client-sales.invoices.index'), { ...filters, page }, {
                                        preserveState: true,
                                        preserveScroll: true,
                                        replace: true,
                                    });
                                }}
                                onRecordsPerPageChange={(perPage) => {
                                    router.get(getLocalizedRoute('admin.client-sales.invoices.index'), { ...filters, page: 1, per_page: perPage }, {
                                        preserveState: true,
                                        preserveScroll: true,
                                        replace: true,
                                    });
                                }}
                            />
                        </div>
                    ) : (
                        <div className="fade-in">
                            <div className="card">
                                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <button type="button" className="btn btn-outline btn-sm" onClick={() => setMode('list')}>
                                            <span className="material-icons-outlined">arrow_back</span>
                                            <span>{t('common.back', 'Back')}</span>
                                        </button>
                                        <h2 style={{ margin: 0 }}>
                                            {mode === 'create' ? t('create_new_invoice', 'Create New Invoice') : t('edit_invoice', 'Edit Invoice')}
                                        </h2>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <button type="button" className="btn btn-outline btn-sm" onClick={handlePrint}>
                                            <span className="material-icons-outlined">print</span>
                                            <span>{t('print', 'Print')}</span>
                                        </button>
                                        <button type="button" className="btn btn-outline btn-sm" onClick={handleExportPDF}>
                                            <span className="material-icons-outlined">picture_as_pdf</span>
                                            <span>PDF</span>
                                        </button>
                                        <button type="button" className="btn btn-outline btn-sm" onClick={handleExportExcel}>
                                            <span className="material-icons-outlined">table_chart</span>
                                            <span>Excel</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="card-body" style={{ padding: '20px 30px' }}>
                                    <form ref={invoiceRef} onSubmit={handleSubmit} className="invoice-container">

                                        <div className="invoice-header">
                                            <div className="company-info">
                                                <h2>{t('document_title', 'SALES INVOICE').toUpperCase()}</h2>
                                                <p>Zodic ERP System</p>
                                            </div>
                                            <div className="invoice-meta">
                                                <label>{t('invoice_number', 'Invoice #')}</label>
                                                <input type="text" value={data.invoice_number} disabled placeholder={t('auto_generated', 'Auto-generated')} />

                                                <label>{t('date', 'Date')} <span className="required">*</span></label>
                                                <input
                                                    type="date"
                                                    value={data.invoice_date}
                                                    onChange={e => setData('invoice_date', e.target.value)}
                                                    className={errors.invoice_date ? 'error' : ''}
                                                />

                                                <label>{t('due_date', 'Due Date')}</label>
                                                <input
                                                    type="date"
                                                    value={data.due_date}
                                                    onChange={e => setData('due_date', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="invoice-info-grid">
                                            <div className="info-section">
                                                <h3>{t('customer_details', 'Customer Details')}</h3>
                                                <div className="form-group">
                                                    <label>{t('customer_name', 'Customer Name')} <span className="required">*</span></label>
                                                    <select
                                                        value={data.customer_id}
                                                        onChange={e => setData('customer_id', e.target.value)}
                                                        className={errors.customer_id ? 'error' : ''}
                                                    >
                                                        <option value="">{t('select_customer', 'Select Customer')}</option>
                                                        {customers?.map(c => (
                                                            <option key={c.id} value={c.id}>{c.name_en || c.name_ar}</option>
                                                        ))}
                                                    </select>
                                                    {errors.customer_id && <span className="error-msg">{errors.customer_id}</span>}
                                                </div>

                                                <div className="form-grid" style={{ marginTop: '1rem' }}>
                                                    <div className="form-group">
                                                        <label>{t('sales_agent', 'Sales Agent')}</label>
                                                        <select value={data.sales_agent_id} onChange={e => setData('sales_agent_id', e.target.value)}>
                                                            <option value="">{t('select_agent', 'Select Agent')}</option>
                                                            {salesAgents?.map(a => (
                                                                <option key={a.id} value={a.id}>{a.name_en || a.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="form-group">
                                                        <label>{t('link_order', 'Link Order')}</label>
                                                        <SearchableComboBox
                                                            options={orderOptions}
                                                            value={data.order_id ? String(data.order_id) : ''}
                                                            onChange={(val) => setData('order_id', val)}
                                                            placeholder={t('select_order', 'Select Order')}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="info-section">
                                                <h3>{t('invoice_settings', 'Invoice Settings')}</h3>
                                                <div className="form-grid">
                                                    <div className="form-group">
                                                        <label>{t('treasury', 'Treasury')} <span className="required">*</span></label>
                                                        <SearchableComboBox
                                                            options={treasuryOptions}
                                                            value={data.treasury_id ? String(data.treasury_id) : ''}
                                                            onChange={(val) => setData('treasury_id', val)}
                                                            placeholder={t('select_treasury', 'Select Treasury')}
                                                        />
                                                        {errors.treasury_id && <span className="error-msg">{errors.treasury_id}</span>}
                                                    </div>
                                                    <div className="form-group">
                                                        <label>{t('currency', 'Currency')}</label>
                                                        <SearchableComboBox
                                                            options={currencyOptions}
                                                            value={data.currency_id ? String(data.currency_id) : ''}
                                                            onChange={(val) => setData('currency_id', val)}
                                                            placeholder={t('select_currency', 'Select Currency')}
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>{t('exchange_rate', 'Exchange Rate')}</label>
                                                        <input
                                                            type="number"
                                                            step="0.000001"
                                                            value={data.exchange_rate}
                                                            onChange={e => setData('exchange_rate', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>{t('invoice_type', 'Type')}</label>
                                                        <select value={data.invoice_type} onChange={e => setData('invoice_type', e.target.value)}>
                                                            <option value="standard">{t('standard', 'Standard')}</option>
                                                            <option value="proforma">{t('proforma', 'Proforma')}</option>
                                                            <option value="credit_note">{t('credit_note', 'Credit Note')}</option>
                                                            <option value="debit_note">{t('debit_note', 'Debit Note')}</option>
                                                        </select>
                                                    </div>
                                                    <div className="form-group">
                                                        <label>{t('payment_status', 'Payment Status')}</label>
                                                        <select value={data.payment_status} onChange={e => setData('payment_status', e.target.value)}>
                                                            <option value="unpaid">{t('unpaid', 'Unpaid')}</option>
                                                            <option value="partial">{t('partial', 'Partial')}</option>
                                                            <option value="paid">{t('paid', 'Paid')}</option>
                                                            <option value="overdue">{t('overdue', 'Overdue')}</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="invoice-items-section">
                                            <div className="items-table-wrapper">
                                                <table>
                                                    <thead>
                                                        <tr>
                                                            <th style={{ width: '50px' }} className="text-center">#</th>
                                                            <th style={{ width: '25%' }}>{t('item', 'Item')}</th>
                                                            <th style={{ width: '10%' }}>{t('unit', 'Unit')}</th>
                                                            <th style={{ width: '15%' }}>{t('warehouse', 'Warehouse')}</th>
                                                            <th style={{ width: '10%' }} className="text-center">{t('quantity', 'Qty')}</th>
                                                            <th style={{ width: '15%' }} className="text-right">{t('price', 'Price')}</th>
                                                            <th style={{ width: '10%' }} className="text-right">{t('discount', 'Disc')}</th>
                                                            <th style={{ width: '10%' }} className="text-right">{t('tax', 'Tax')}</th>
                                                            <th style={{ width: '15%' }} className="text-right">{t('total', 'Total')}</th>
                                                            <th style={{ width: '50px' }}></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {data.items.map((item, index) => (
                                                            <tr key={index}>
                                                                <td className="text-center">{index + 1}</td>
                                                                <td>
                                                                    <div style={{ marginBottom: '5px' }}>
                                                                        <SearchableComboBox
                                                                            options={productOptions}
                                                                            value={item.product_id ? String(item.product_id) : ''}
                                                                            onChange={(val) => handleItemChange(index, 'product_id', val)}
                                                                            placeholder={t('select_product', 'Select Product')}
                                                                        />
                                                                    </div>
                                                                    <input
                                                                        type="text"
                                                                        placeholder={t('description', 'Description')}
                                                                        value={item.item_name_ar}
                                                                        onChange={e => handleItemChange(index, 'item_name_ar', e.target.value)}
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <select
                                                                        value={item.unit_id ? String(item.unit_id) : ''}
                                                                        onChange={e => handleItemChange(index, 'unit_id', e.target.value)}
                                                                    >
                                                                        <option value="">{t('select_unit', 'Select Unit')}</option>
                                                                        {unitOptions.map(unit => (
                                                                            <option key={unit.value} value={unit.value}>{unit.label}</option>
                                                                        ))}
                                                                    </select>
                                                                </td>
                                                                <td>
                                                                    <select
                                                                        value={item.warehouse_id ? String(item.warehouse_id) : ''}
                                                                        onChange={e => handleItemChange(index, 'warehouse_id', e.target.value)}
                                                                    >
                                                                        <option value="">{t('select_warehouse', 'Select Warehouse')}</option>
                                                                        {warehouseOptions.map(warehouse => (
                                                                            <option key={warehouse.value} value={warehouse.value}>{warehouse.label}</option>
                                                                        ))}
                                                                    </select>
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        value={item.quantity}
                                                                        onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                                                                        className="text-center"
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={item.unit_price}
                                                                        onChange={e => handleItemChange(index, 'unit_price', e.target.value)}
                                                                        className="text-right"
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={item.discount_amount}
                                                                        onChange={e => handleItemChange(index, 'discount_amount', e.target.value)}
                                                                        className="text-right"
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={item.tax_amount}
                                                                        onChange={e => handleItemChange(index, 'tax_amount', e.target.value)}
                                                                        className="text-right"
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        type="text"
                                                                        value={item.line_total}
                                                                        disabled
                                                                        className="text-right"
                                                                        style={{ fontWeight: 'bold' }}
                                                                    />
                                                                </td>
                                                                <td className="text-center">
                                                                    <button type="button" onClick={() => removeItem(index)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>
                                                                        ✕
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="add-item-row">
                                                <button type="button" className="btn-add-item" onClick={addItem}>
                                                    {t('add_line_item', '+ Add Line Item')}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="invoice-footer-section">
                                            <div className="invoice-terms">
                                                <div className="form-group">
                                                    <label>{t('customer_notes', 'Customer Notes')}</label>
                                                    <textarea
                                                        value={data.customer_notes}
                                                        onChange={e => setData('customer_notes', e.target.value)}
                                                        placeholder={t('customer_notes_placeholder', 'Notes visible to customer...')}
                                                    ></textarea>
                                                </div>
                                                <div className="form-group">
                                                    <label>{t('internal_notes', 'Internal Notes')}</label>
                                                    <textarea
                                                        value={data.internal_notes}
                                                        onChange={e => setData('internal_notes', e.target.value)}
                                                        placeholder={t('internal_notes_placeholder', 'Internal notes...')}
                                                        style={{ minHeight: '60px' }}
                                                    ></textarea>
                                                </div>
                                                <div className="form-group">
                                                    <label>{t('payment_terms', 'Payment Terms')}</label>
                                                    <textarea
                                                        value={data.payment_terms}
                                                        onChange={e => setData('payment_terms', e.target.value)}
                                                        placeholder={t('payment_terms_placeholder', 'Payment terms...')}
                                                        style={{ minHeight: '60px' }}
                                                    ></textarea>
                                                </div>
                                            </div>

                                            <div className="invoice-totals">
                                                <div className="total-row">
                                                    <span className="label">{t('subtotal', 'Subtotal')}</span>
                                                    <span>{Number(data.subtotal).toFixed(2)}</span>
                                                </div>
                                                <div className="total-row">
                                                    <span className="label">{t('global_discount', 'Global Discount')}</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={data.discount_amount}
                                                        onChange={e => setData('discount_amount', e.target.value)}
                                                    />
                                                </div>
                                                <div className="total-row">
                                                    <span className="label">{t('shipping', 'Shipping')}</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={data.shipping_cost}
                                                        onChange={e => setData('shipping_cost', e.target.value)}
                                                    />
                                                </div>
                                                <div className="total-row">
                                                    <span className="label">{t('extra_charges', 'Extra Charges')}</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={data.other_charges}
                                                        onChange={e => setData('other_charges', e.target.value)}
                                                    />
                                                </div>
                                                <div className="total-row">
                                                    <span className="label">{t('tax_total', 'Tax Total')}</span>
                                                    <span>{Number(data.tax_amount).toFixed(2)}</span>
                                                </div>
                                                <div className="total-row grand-total">
                                                    <span>{t('grand_total', 'Total Amount')}</span>
                                                    <span>{Number(data.total_amount).toFixed(2)}</span>
                                                </div>
                                                <div className="total-row">
                                                    <span className="label">{t('paid_amount', 'Paid Amount')}</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={data.paid_amount}
                                                        onChange={e => setData('paid_amount', e.target.value)}
                                                    />
                                                </div>
                                                <div className="total-row" style={{ color: 'red', fontWeight: 'bold' }}>
                                                    <span>{t('balance_due', 'Balance Due')}</span>
                                                    <span>{Number(data.balance_amount).toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                                <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', padding: '20px 30px', borderTop: '1px solid #eee' }}>
                                    <button type="button" className="btn btn-outline" onClick={() => setMode('list')}>{t('common.cancel', 'Cancel')}</button>
                                    <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={processing}>
                                        {processing ? t('common.saving', 'Saving...') : t('common.save', 'Save Invoice')}
                                    </button>
                                </div>
                            </div>

                            <div className="printable-invoice" ref={printRef}>
                                <div className="print-header">
                                    <div className="company-branding">
                                        <h1>ZODIC ERP</h1>
                                        <p>123 Business Street, City, Country</p>
                                        <p>Phone: +1 234 567 890</p>
                                    </div>
                                    <div className="doc-info">
                                        <h2>{t('document_title', 'SALES INVOICE').toUpperCase()}</h2>
                                        <div className="meta-row">
                                            <span className="label">{t('ref', 'Invoice #')}:</span>
                                            {data.invoice_number || 'DRAFT'}
                                        </div>
                                        <div className="meta-row">
                                            <span className="label">{t('date', 'Date')}:</span>
                                            {data.invoice_date}
                                        </div>
                                        <div className="meta-row">
                                            <span className="label">{t('due_date', 'Due Date')}:</span>
                                            {data.due_date}
                                        </div>
                                    </div>
                                </div>

                                <div className="print-meta-grid">
                                    <div className="meta-box">
                                        <h3>{t('bill_to', 'Bill To')}:</h3>
                                        <p><strong>{customers?.find(c => c.id == data.customer_id)?.name_en || t('customer_name', 'Customer Name')}</strong></p>
                                    </div>
                                    <div className="meta-box">
                                        <h3>{t('details', 'Details')}:</h3>
                                        <p><strong>{t('sales_agent', 'Sales Agent')}:</strong> {salesAgents?.find(a => a.id == data.sales_agent_id)?.name_en || '-'}</p>
                                        <p><strong>{t('order_ref', 'Order Ref')}:</strong> {orders?.find(o => o.id == data.order_id)?.order_number || '-'}</p>
                                    </div>
                                </div>

                                <table className="print-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>{t('description', 'Description')}</th>
                                            <th className="text-center">{t('quantity', 'Qty')}</th>
                                            <th className="text-right">{t('price', 'Price')}</th>
                                            <th className="text-right">{t('total', 'Total')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.items.map((item, index) => (
                                            <tr key={index}>
                                                <td>{index + 1}</td>
                                                <td>
                                                    <strong>{products?.find(p => p.id == item.product_id)?.name_en}</strong>
                                                    {item.item_name_ar && <div>{item.item_name_ar}</div>}
                                                </td>
                                                <td className="text-center">{item.quantity}</td>
                                                <td className="text-right">{Number(item.unit_price).toFixed(2)}</td>
                                                <td className="text-right">{Number(item.line_total).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <div className="print-totals">
                                    <div className="totals-box">
                                        <div className="row">
                                            <span>{t('subtotal', 'Subtotal')}:</span>
                                            <span>{Number(data.subtotal).toFixed(2)}</span>
                                        </div>
                                        <div className="row">
                                            <span>{t('discount', 'Discount')}:</span>
                                            <span>{Number(data.discount_amount).toFixed(2)}</span>
                                        </div>
                                        <div className="row">
                                            <span>{t('tax', 'Tax')}:</span>
                                            <span>{Number(data.tax_amount).toFixed(2)}</span>
                                        </div>
                                        <div className="row">
                                            <span>{t('shipping', 'Shipping')}:</span>
                                            <span>{Number(data.shipping_cost).toFixed(2)}</span>
                                        </div>
                                        <div className="row grand-total">
                                            <span>{t('grand_total', 'Total')}:</span>
                                            <span>{Number(data.total_amount).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="print-footer">
                                    {data.customer_notes && (
                                        <div className="notes-section">
                                            <h4>{t('notes', 'Notes')}:</h4>
                                            <p>{data.customer_notes}</p>
                                        </div>
                                    )}

                                    <div className="signatures">
                                        <div className="sign-box">{t('authorized_signature', 'Authorized Signature')}</div>
                                        <div className="sign-box">{t('customer_signature', 'Customer Signature')}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </BlankPage>
        </AdminLayout>
    );
}
