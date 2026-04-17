import React, { useEffect, useMemo, useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/main.scss';
import Pagination from '../components/Pagination';

const PAYMENT_METHODS = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'check', label: 'Check' },
    { value: 'credit_card', label: 'Card' },
    { value: 'other', label: 'Other' },
];

const PAYMENT_TYPES = [
    { value: 'invoice_payment', label: 'Standard' },
    { value: 'advance_payment', label: 'Advance' },
    { value: 'credit_payment', label: 'Credit Payment' },
    { value: 'adjustment', label: 'Adjustment' },
];

const STATUSES = [
    { value: 'draft', label: 'Draft' },
    { value: 'posted', label: 'Posted' },
    { value: 'reconciled', label: 'Reconciled' },
    { value: 'cancelled', label: 'Cancelled' },
];

const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toISOString().split('T')[0];
};

const formatDisplayDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

const getOptionLabel = (options, value) =>
    options.find((option) => option.value === value)?.label || value || '-';

const numberOrZero = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const getInvoiceOutstandingAmount = (invoice) =>
    numberOrZero(
        invoice?.balance_amount || invoice?.remaining_amount || invoice?.due_amount || invoice?.total_amount
    );

const getRouteParams = (localization, params = {}) => ({
    country: localization?.country_code || 'sa',
    lang: localization?.current_locale || 'ar',
    ...params,
});

const hasNamedRoute = (name) => {
    try {
        if (typeof route !== 'function') return false;
        const routeObject = route();
        if (!routeObject || typeof routeObject.has !== 'function') return true;
        return routeObject.has(name);
    } catch {
        return true;
    }
};

const buildLocalizedRoute = (name, localization, params = {}) =>
    route(name, getRouteParams(localization, params));

const BANK_PAYMENT_METHODS = ['bank_transfer', 'check'];

export default function PaymentVoucher({
    vouchers,
    suppliers = [],
    currencies = [],
    bankAccounts = [],
    openInvoices = [],
    filters = {},
}) {
    const { props } = usePage();
    const { localization, flash, errors: pageErrors = {} } = props;
    const [mode, setMode] = useState('list');
    const [activeTab, setActiveTab] = useState('general');
    const [search, setSearch] = useState(filters?.search || '');
    const [status, setStatus] = useState(filters?.status || '');
    const [supplierFilter, setSupplierFilter] = useState(filters?.supplier_id || '');

    const emptyAllocation = () => ({
        id: null,
        invoice_id: '',
        invoice_number: '',
        allocated_amount: 0,
        base_allocated_amount: 0,
        discount_given: 0,
        notes: '',
        company_id: '',
        payment_date: new Date().toISOString().split('T')[0],
    });

    const { data, setData, post, put, delete: destroy, processing, errors, reset } = useForm({
        id: '',
        payment_number: '',
        supplier_id: '',
        currency_id: '',
        exchange_rate: 1,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash',
        amount: 0,
        base_amount: 0,
        payment_type: 'invoice_payment',
        bank_account_id: '',
        check_number: '',
        check_date: '',
        check_due_date: '',
        reference_number: '',
        description: '',
        status: 'draft',
        is_posted: false,
        posted_at: '',
        posted_by: '',
        reconciled_at: '',
        reconciled_by: '',
        notes: '',
        created_by: '',
        company_id: '',
        allocations: [emptyAllocation()],
    });

    const safeErrors = { ...pageErrors, ...errors };

    const defaultCurrencyId = useMemo(() => {
        if (!Array.isArray(currencies) || currencies.length === 0) return '';

        const preferredCurrency = currencies.find(
            (currency) => String(currency?.code || '').toUpperCase() === 'EGP'
        );

        return String(preferredCurrency?.id || currencies[0]?.id || '');
    }, [currencies]);

    const invoiceBalanceAmount = (invoice) => {
        return numberOrZero(invoice?.balance_amount) ||
            numberOrZero(invoice?.due_amount) ||
            numberOrZero(invoice?.remaining_amount) ||
            numberOrZero(invoice?.total_amount);
    };

    const invoiceCurrencyCode = (invoice) => {
        return invoice?.currency?.code || 'EGP';
    };

    const totals = useMemo(() => {
        const totalAllocated = (data.allocations || []).reduce(
            (sum, row) => sum + numberOrZero(row.allocated_amount),
            0
        );
        const totalDiscount = (data.allocations || []).reduce(
            (sum, row) => sum + numberOrZero(row.discount_given),
            0
        );
        const exchangeRate = numberOrZero(data.exchange_rate) || 1;
        return {
            totalAllocated,
            totalDiscount,
            totalPayment: totalAllocated,
            totalBasePayment: totalAllocated * exchangeRate,
        };
    }, [data.allocations, data.exchange_rate]);

    const isBankMethod = useMemo(
        () => BANK_PAYMENT_METHODS.includes(data.payment_method),
        [data.payment_method]
    );

    const supplierInvoices = useMemo(
        () =>
            (openInvoices || []).filter(
                (invoice) => String(invoice?.supplier_id || '') === String(data.supplier_id || '')
            ),
        [openInvoices, data.supplier_id]
    );

    const bankAccountOptions = useMemo(
        () =>
            bankAccounts || [],
        [bankAccounts]
    );

    useEffect(() => {
        const currentAmount = numberOrZero(data.amount);
        const currentBaseAmount = numberOrZero(data.base_amount);
        if (
            Math.abs(currentAmount - totals.totalPayment) > 0.0001 ||
            Math.abs(currentBaseAmount - totals.totalBasePayment) > 0.0001
        ) {
            setData((prev) => ({
                ...prev,
                amount: totals.totalPayment.toFixed(2),
                base_amount: totals.totalBasePayment.toFixed(2),
            }));
        }
    }, [totals.totalPayment, totals.totalBasePayment]);

    useEffect(() => {
        if (data.payment_method !== 'check') {
            setData((prev) => ({
                ...prev,
                check_number: '',
                check_date: '',
                check_due_date: '',
            }));
        }
    }, [data.payment_method]);

    useEffect(() => {
        if (!isBankMethod && data.bank_account_id) {
            setData('bank_account_id', '');
        }
    }, [isBankMethod, data.bank_account_id]);

    useEffect(() => {
        if (!data.currency_id && defaultCurrencyId) {
            setData('currency_id', defaultCurrencyId);
        }
    }, [data.currency_id, defaultCurrencyId]);

    const refreshList = (extra = {}) => {
        if (!hasNamedRoute('admin.payment-vouchers.index')) return;
        router.get(
            buildLocalizedRoute('admin.payment-vouchers.index', localization),
            {
                search,
                status,
                supplier_id: supplierFilter,
                ...extra,
            },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleSearch = (event) => {
        event.preventDefault();
        refreshList({ page: 1 });
    };

    const handleCreate = () => {
        reset();
        setData((prev) => ({
            ...prev,
            payment_date: new Date().toISOString().split('T')[0],
            currency_id: defaultCurrencyId,
            payment_method: 'cash',
            payment_type: 'invoice_payment',
            status: 'draft',
            exchange_rate: 1,
            allocations: [emptyAllocation()],
        }));
        setMode('create');
        setActiveTab('general');
    };

    const handleEdit = (voucher) => {
        const exchangeRate = numberOrZero(voucher?.exchange_rate) || 1;
        setData({
            id: voucher?.id || '',
            payment_number: voucher?.payment_number || '',
            supplier_id: String(voucher?.supplier_id || ''),
            currency_id: String(voucher?.currency_id || ''),
            exchange_rate: exchangeRate,
            payment_date: formatDate(voucher?.payment_date),
            payment_method: voucher?.payment_method || 'cash',
            amount: numberOrZero(voucher?.amount).toFixed(2),
            base_amount: numberOrZero(voucher?.base_amount).toFixed(2),
            payment_type: voucher?.payment_type || 'standard',
            bank_account_id: String(voucher?.bank_account_id || ''),
            check_number: voucher?.check_number || '',
            check_date: formatDate(voucher?.check_date) === '-' ? '' : formatDate(voucher?.check_date),
            check_due_date:
                formatDate(voucher?.check_due_date) === '-' ? '' : formatDate(voucher?.check_due_date),
            reference_number: voucher?.reference_number || '',
            description: voucher?.description || '',
            status: voucher?.status || 'draft',
            is_posted: Boolean(voucher?.is_posted),
            posted_at: formatDate(voucher?.posted_at) === '-' ? '' : formatDate(voucher?.posted_at),
            posted_by: String(voucher?.posted_by || ''),
            reconciled_at:
                formatDate(voucher?.reconciled_at) === '-' ? '' : formatDate(voucher?.reconciled_at),
            reconciled_by: String(voucher?.reconciled_by || ''),
            notes: voucher?.notes || '',
            created_by: String(voucher?.created_by || ''),
            company_id: String(voucher?.company_id || ''),
            allocations:
                voucher?.allocations?.length > 0
                    ? voucher.allocations.map((row) => ({
                          id: row?.id || null,
                          invoice_id: String(row?.invoice_id || ''),
                          invoice_number: row?.invoice?.invoice_number || row?.invoice?.reference_number || `INV-${row?.invoice_id}`,
                          allocated_amount: numberOrZero(row?.allocated_amount).toFixed(2),
                          base_allocated_amount: numberOrZero(row?.base_allocated_amount).toFixed(2),
                          discount_given: numberOrZero(row?.discount_given).toFixed(2),
                          notes: row?.notes || '',
                          company_id: String(row?.company_id || ''),
                          payment_date: formatDate(row?.invoice?.invoice_date || row?.payment_date) === '-' ? formatDate(voucher?.payment_date) : formatDate(row?.invoice?.invoice_date || row?.payment_date),
                      }))
                    : [emptyAllocation()],
        });
        setMode('edit');
        setActiveTab('general');
    };

    const handleDelete = (id) => {
        if (!hasNamedRoute('admin.payment-vouchers.destroy')) return;
        if (!window.confirm('Are you sure you want to delete this payment voucher?')) return;
        destroy(buildLocalizedRoute('admin.payment-vouchers.destroy', localization, { voucher: id }));
    };

    const allocationErrorExists = Object.keys(safeErrors).some((key) => key.startsWith('allocations.'));

    const handleSubmit = (event) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => setMode('list'),
            onError: (submitErrors) => {
                if (Object.keys(submitErrors).some((key) => key.startsWith('allocations.'))) {
                    setActiveTab('allocations');
                    return;
                }
                setActiveTab('general');
            },
        };

        if (mode === 'create') {
            if (!hasNamedRoute('admin.payment-vouchers.store')) return;
            post(buildLocalizedRoute('admin.payment-vouchers.store', localization), options);
            return;
        }

        if (!hasNamedRoute('admin.payment-vouchers.update')) return;
        put(buildLocalizedRoute('admin.payment-vouchers.update', localization, { voucher: data.id }), options);
    };

    const removeAllocation = (index) => {
        const next = [...(data.allocations || [])];
        next.splice(index, 1);
        setData('allocations', next.length ? next : [emptyAllocation()]);
    };

    const updateAllocation = (index, field, value) => {
        const next = [...(data.allocations || [])];
        next[index] = { ...next[index], [field]: value };

        if (field === 'allocated_amount') {
            const exchangeRate = numberOrZero(data.exchange_rate) || 1;
            next[index].base_allocated_amount = (numberOrZero(value) * exchangeRate).toFixed(2);
        }

        if (field === 'invoice_id') {
            const selectedInvoice = openInvoices.find((invoice) => String(invoice.id) === String(value));
            if (selectedInvoice) {
                const suggested = numberOrZero(
                    selectedInvoice.balance_amount ||
                        selectedInvoice.remaining_amount ||
                        selectedInvoice.due_amount
                );
                next[index].allocated_amount = suggested.toFixed(2);
                next[index].base_allocated_amount = (
                    suggested * (numberOrZero(data.exchange_rate) || 1)
                ).toFixed(2);
            }
        }

        setData('allocations', next);
    };

    const toggleAllAllocations = (checked) => {
        const next = (data.allocations || []).map((row) => {
            const selectedInvoice = openInvoices.find(
                (invoice) => String(invoice.id) === String(row.invoice_id)
            );
            const exchangeRate = numberOrZero(data.exchange_rate) || 1;
            
            if (checked && selectedInvoice) {
                const outstanding = getInvoiceOutstandingAmount(selectedInvoice);
                return {
                    ...row,
                    allocated_amount: outstanding.toFixed(2),
                    base_allocated_amount: (outstanding * exchangeRate).toFixed(2),
                };
            } else {
                return {
                    ...row,
                    allocated_amount: '0.00',
                    base_allocated_amount: '0.00',
                };
            }
        });
        setData('allocations', next);
    };

    const toggleAllocationPay = (index, checked) => {
        const next = [...(data.allocations || [])];
        const row = next[index];
        if (!row) return;

        const selectedInvoice = supplierInvoices.find(
            (invoice) => String(invoice.id) === String(row.invoice_id)
        );
        const exchangeRate = numberOrZero(data.exchange_rate) || 1;

        if (checked) {
            const outstanding = getInvoiceOutstandingAmount(selectedInvoice);
            row.allocated_amount = outstanding.toFixed(2);
            row.base_allocated_amount = (outstanding * exchangeRate).toFixed(2);
        } else {
            row.allocated_amount = '0.00';
            row.base_allocated_amount = '0.00';
        }

        next[index] = { ...row };
        setData('allocations', next);
    };

    const vouchersData = vouchers?.data || [];

    return (
        <AdminLayout>
            <Head title="Payment Voucher" />

            <div className="payment-voucher-module">
                <div className="payment-voucher-module__header">
                    <h1>Payment Voucher</h1>
                    {mode === 'list' && (
                        <button type="button" className="btn-add" onClick={handleCreate}>
                            + Create Payment Voucher
                        </button>
                    )}
                </div>

                {flash?.success && <div className="alert alert-success">{flash.success}</div>}
                {flash?.error && <div className="alert alert-error">{flash.error}</div>}

                {mode === 'list' ? (
                    <>
                        <div className="table-filters">
                            <form className="table-filters__form" onSubmit={handleSearch}>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Search payment number or reference..."
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                />
                                <select
                                    className="form-select"
                                    value={status}
                                    onChange={(event) => setStatus(event.target.value)}
                                >
                                    <option value="">All Statuses</option>
                                    {STATUSES.map((item) => (
                                        <option key={item.value} value={item.value}>
                                            {item.label}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    className="form-select"
                                    value={supplierFilter}
                                    onChange={(event) => setSupplierFilter(event.target.value)}
                                >
                                    <option value="">All Suppliers</option>
                                    {suppliers.map((supplier) => (
                                        <option key={supplier.id} value={supplier.id}>
                                            {supplier.name_en || supplier.name_ar}
                                        </option>
                                    ))}
                                </select>
                                <button type="submit" className="btn-secondary">
                                    Search
                                </button>
                            </form>
                        </div>

                        <div className="payment-voucher-module__table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Voucher #</th>
                                        <th>Date</th>
                                        <th>Supplier</th>
                                        <th>Method</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vouchersData.map((voucher) => (
                                        <tr key={voucher.id}>
                                            <td>{voucher.payment_number || `PV-${voucher.id}`}</td>
                                            <td>{formatDate(voucher.payment_date)}</td>
                                            <td>{voucher?.supplier?.name_en || voucher?.supplier?.name_ar || '-'}</td>
                                            <td>{getOptionLabel(PAYMENT_METHODS, voucher.payment_method)}</td>
                                            <td>
                                                {numberOrZero(voucher.amount).toFixed(2)}{' '}
                                                {voucher?.currency?.code || ''}
                                            </td>
                                            <td>
                                                <span className={`status-badge status-${voucher.status || 'draft'}`}>
                                                    {getOptionLabel(STATUSES, voucher.status || 'draft')}
                                                </span>
                                            </td>
                                            <td className="actions">
                                                <button
                                                    type="button"
                                                    className="edit"
                                                    onClick={() => handleEdit(voucher)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    className="delete"
                                                    onClick={() => handleDelete(voucher.id)}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {vouchersData.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="empty-cell">
                                                No payment vouchers found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {vouchers && (
                            <Pagination
                                currentPage={vouchers.current_page}
                                totalPages={vouchers.last_page}
                                totalRecords={vouchers.total}
                                recordsPerPage={vouchers.per_page}
                                onPageChange={(page) => refreshList({ page })}
                                onRecordsPerPageChange={(perPage) =>
                                    refreshList({ page: 1, per_page: perPage })
                                }
                            />
                        )}
                    </>
                ) : (
                    <form onSubmit={handleSubmit} className="payment-voucher-module__form-container">
                        <div className="payment-voucher-module__tabs">
                            <button
                                type="button"
                                className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
                                onClick={() => setActiveTab('general')}
                            >
                                General
                            </button>
                            <button
                                type="button"
                                className={`tab-btn ${activeTab === 'allocations' ? 'active' : ''}`}
                                onClick={() => setActiveTab('allocations')}
                            >
                                Allocations
                            </button>
                            <button
                                type="button"
                                className={`tab-btn ${activeTab === 'additional' ? 'active' : ''}`}
                                onClick={() => setActiveTab('additional')}
                            >
                                Additional
                            </button>
                        </div>

                        {activeTab === 'general' && (
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Payment Number</label>
                                    <input
                                        type="text"
                                        className={`form-input ${safeErrors.payment_number ? 'error' : ''}`}
                                        value={data.payment_number}
                                        placeholder="Auto-generated if empty"
                                        onChange={(event) => setData('payment_number', event.target.value)}
                                    />
                                    {safeErrors.payment_number && (
                                        <div className="error-msg">{safeErrors.payment_number}</div>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label>Payment Date</label>
                                    <input
                                        type="date"
                                        className={`form-input ${safeErrors.payment_date ? 'error' : ''}`}
                                        value={data.payment_date}
                                        onChange={(event) => {
                                            const newDate = event.target.value;
                                            setData((prev) => ({
                                                ...prev,
                                                payment_date: newDate,
                                                allocations: prev.allocations.map((row) => ({
                                                    ...row,
                                                    payment_date: newDate,
                                                })),
                                            }));
                                        }}
                                    />
                                    {safeErrors.payment_date && (
                                        <div className="error-msg">{safeErrors.payment_date}</div>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label>Supplier</label>
                                    <select
                                        className={`form-select ${safeErrors.supplier_id ? 'error' : ''}`}
                                        value={data.supplier_id}
                                        onChange={(event) => {
                                            const supplierId = event.target.value;
                                            const relatedInvoices = (openInvoices || []).filter(
                                                (inv) => String(inv.supplier_id) === String(supplierId)
                                            );

                                            const exchangeRate = numberOrZero(data.exchange_rate) || 1;
                                            const newAllocations = relatedInvoices.map((inv) => {
                                                const outstanding = getInvoiceOutstandingAmount(inv);
                                                return {
                                                    ...emptyAllocation(),
                                                    invoice_id: String(inv.id),
                                                    allocated_amount: outstanding.toFixed(2),
                                                    base_allocated_amount: (outstanding * exchangeRate).toFixed(2),
                                                    discount_given: 0,
                                                    notes: '',
                                                    company_id: String(inv.company_id || ''),
                                                    invoice_number: inv.invoice_number || inv.reference_number || `INV-${inv.id}`,
                                                    payment_date: formatDate(inv.invoice_date) === '-' ? data.payment_date : formatDate(inv.invoice_date),
                                                };
                                            });

                                            setData((prev) => ({
                                                ...prev,
                                                supplier_id: supplierId,
                                                allocations: newAllocations.length > 0 ? newAllocations : [emptyAllocation()],
                                            }));
                                        }}
                                    >
                                        <option value="">Select Supplier</option>
                                        {suppliers.map((supplier) => (
                                            <option key={supplier.id} value={supplier.id}>
                                                {supplier.name_en || supplier.name_ar}
                                            </option>
                                        ))}
                                    </select>
                                    {safeErrors.supplier_id && (
                                        <div className="error-msg">{safeErrors.supplier_id}</div>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label>Currency</label>
                                    <select
                                        className={`form-select ${safeErrors.currency_id ? 'error' : ''}`}
                                        value={data.currency_id}
                                        onChange={(event) => setData('currency_id', event.target.value)}
                                    >
                                        <option value="">Select Currency</option>
                                        {currencies.map((currency) => (
                                            <option key={currency.id} value={currency.id}>
                                                {currency.code} - {currency.name}
                                            </option>
                                        ))}
                                    </select>
                                    {safeErrors.currency_id && (
                                        <div className="error-msg">{safeErrors.currency_id}</div>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label>Exchange Rate</label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        className="form-input"
                                        value={data.exchange_rate}
                                        onChange={(event) => setData('exchange_rate', event.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Payment Method</label>
                                    <select
                                        className={`form-select ${safeErrors.payment_method ? 'error' : ''}`}
                                        value={data.payment_method}
                                        onChange={(event) => setData('payment_method', event.target.value)}
                                    >
                                        {PAYMENT_METHODS.map((method) => (
                                            <option key={method.value} value={method.value}>
                                                {method.label}
                                            </option>
                                        ))}
                                    </select>
                                    {safeErrors.payment_method && (
                                        <div className="error-msg">{safeErrors.payment_method}</div>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label>Payment Type</label>
                                    <select
                                        className={`form-select ${safeErrors.payment_type ? 'error' : ''}`}
                                        value={data.payment_type}
                                        onChange={(event) => setData('payment_type', event.target.value)}
                                    >
                                        {PAYMENT_TYPES.map((type) => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {isBankMethod && (
                                    <div className="form-group">
                                        <label>Bank Account</label>
                                        <select
                                            className={`form-select ${safeErrors.bank_account_id ? 'error' : ''}`}
                                            value={data.bank_account_id}
                                            onChange={(event) => setData('bank_account_id', event.target.value)}
                                        >
                                            <option value="">Select Bank Account</option>
                                            {bankAccountOptions.map((account) => (
                                                <option key={account.id} value={account.id}>
                                                    {account.account_number ? `${account.account_number} - ` : ''}
                                                    {account.account_name || `Account ${account.id}`}
                                                </option>
                                            ))}
                                        </select>
                                        {safeErrors.bank_account_id && (
                                            <div className="error-msg">{safeErrors.bank_account_id}</div>
                                        )}
                                    </div>
                                )}

                                <div className="form-group">
                                    <label>Status</label>
                                    <select
                                        className={`form-select ${safeErrors.status ? 'error' : ''}`}
                                        value={data.status}
                                        onChange={(event) => setData('status', event.target.value)}
                                    >
                                        {STATUSES.map((item) => (
                                            <option key={item.value} value={item.value}>
                                                {item.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {activeTab === 'allocations' && (
                            <div className="allocations-section">
                                <div className="allocations-section__header">
                                    <h3>Supplier Invoice Allocations</h3>
                                </div>

                                <div className="table-responsive">
                                    <table className="allocation-table">
                                        <thead>
                                            <tr>
                                                <th>INVOICE</th>
                                                <th>OUTSTANDING</th>
                                                <th>ALLOCATED AMOUNT</th>
                                                <th>BASE ALLOCATED</th>
                                                <th>DISCOUNT GIVEN</th>
                                                <th>NOTES</th>
                                                <th>Date</th>
                                                <th style={{ textAlign: 'center' }}>
                                                    <label className="header-pay-wrapper">
                                                        <span>PAY</span>
                                                        <input
                                                            type="checkbox"
                                                            className="pay-checkbox"
                                                            checked={data.allocations.length > 0 && data.allocations.every(row => numberOrZero(row.allocated_amount) > 0)}
                                                            onChange={(e) => toggleAllAllocations(e.target.checked)}
                                                        />
                                                    </label>
                                                </th>
                                                <th className="action-header">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(data.allocations || []).map((row, index) => {
                                                const selectedInvoice = openInvoices.find(
                                                    (invoice) => String(invoice.id) === String(row.invoice_id)
                                                );
                                                return (
                                                    <tr key={index}>
                                                        <td>
                                                            <div className="invoice-number-display">
                                                                {row.invoice_number || '-'}
                                                            </div>
                                                            {safeErrors[`allocations.${index}.invoice_id`] && (
                                                                <div className="error-msg">
                                                                    {safeErrors[`allocations.${index}.invoice_id`]}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="outstanding-cell">
                                                            {selectedInvoice ? (
                                                                <>
                                                                    {invoiceBalanceAmount(selectedInvoice).toFixed(2)}
                                                                    <span>{invoiceCurrencyCode(selectedInvoice)}</span>
                                                                </>
                                                            ) : (
                                                                '-'
                                                            )}
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                className={`form-input ${
                                                                    safeErrors[
                                                                        `allocations.${index}.allocated_amount`
                                                                    ]
                                                                        ? 'error'
                                                                        : ''
                                                                }`}
                                                                value={row.allocated_amount}
                                                                onChange={(event) =>
                                                                    updateAllocation(
                                                                        index,
                                                                        'allocated_amount',
                                                                        event.target.value
                                                                    )
                                                                }
                                                            />
                                                            {safeErrors[`allocations.${index}.allocated_amount`] && (
                                                                <div className="error-msg">
                                                                    {
                                                                        safeErrors[
                                                                            `allocations.${index}.allocated_amount`
                                                                        ]
                                                                    }
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                className="form-input"
                                                                value={row.base_allocated_amount}
                                                                onChange={(event) =>
                                                                    updateAllocation(
                                                                        index,
                                                                        'base_allocated_amount',
                                                                        event.target.value
                                                                    )
                                                                }
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                className="form-input"
                                                                value={row.discount_given}
                                                                onChange={(event) =>
                                                                    updateAllocation(
                                                                        index,
                                                                        'discount_given',
                                                                        event.target.value
                                                                    )
                                                                }
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="text"
                                                                className="form-input"
                                                                value={row.notes || ''}
                                                                onChange={(event) =>
                                                                    updateAllocation(index, 'notes', event.target.value)
                                                                }
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="text"
                                                                className="form-input"
                                                                readOnly
                                                                value={formatDisplayDate(row.payment_date) || ''}
                                                            />
                                                        </td>
                                                        <td className="pay-checkbox-wrapper">
                                                            <input
                                                                type="checkbox"
                                                                className="pay-checkbox"
                                                                checked={numberOrZero(row.allocated_amount) > 0}
                                                                onChange={(event) =>
                                                                    toggleAllocationPay(
                                                                        index,
                                                                        event.target.checked
                                                                    )
                                                                }
                                                            />
                                                        </td>
                                                        <td className="action-button-cell">
                                                            <button
                                                                type="button"
                                                                className="btn-remove-item"
                                                                onClick={() => removeAllocation(index)}
                                                            >
                                                                Remove
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="allocation-summary">
                                    <div className="summary-card">
                                        <span>Total Allocated</span>
                                        <strong>{totals.totalAllocated.toFixed(2)}</strong>
                                    </div>
                                    <div className="summary-card">
                                        <span>Total Discount</span>
                                        <strong>{totals.totalDiscount.toFixed(2)}</strong>
                                    </div>
                                    <div className="summary-card">
                                        <span>Voucher Amount</span>
                                        <strong>{totals.totalPayment.toFixed(2)}</strong>
                                    </div>
                                    <div className="summary-card">
                                        <span>Base Amount</span>
                                        <strong>{totals.totalBasePayment.toFixed(2)}</strong>
                                    </div>
                                </div>

                                {allocationErrorExists && (
                                    <div className="error-msg">
                                        Please review allocation rows. Some values are invalid.
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'additional' && (
                            <div className="form-grid">
                                {data.payment_method === 'check' && (
                                    <>
                                        <div className="form-group">
                                            <label>Check Number</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={data.check_number}
                                                onChange={(event) => setData('check_number', event.target.value)}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Check Date</label>
                                            <input
                                                type="date"
                                                className="form-input"
                                                value={data.check_date}
                                                onChange={(event) => setData('check_date', event.target.value)}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Check Due Date</label>
                                            <input
                                                type="date"
                                                className="form-input"
                                                value={data.check_due_date}
                                                onChange={(event) => setData('check_due_date', event.target.value)}
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="form-group">
                                    <label>Reference Number</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={data.reference_number}
                                        onChange={(event) => setData('reference_number', event.target.value)}
                                    />
                                </div>

                                <div className="form-group full-width">
                                    <label>Description</label>
                                    <textarea
                                        rows="3"
                                        className="form-input"
                                        value={data.description}
                                        onChange={(event) => setData('description', event.target.value)}
                                    />
                                </div>

                                <div className="form-group full-width">
                                    <label>Notes</label>
                                    <textarea
                                        rows="3"
                                        className="form-input"
                                        value={data.notes}
                                        onChange={(event) => setData('notes', event.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="form-actions">
                            <button type="button" className="btn-cancel" onClick={() => setMode('list')}>
                                Cancel
                            </button>
                            <button type="submit" className="btn-submit" disabled={processing}>
                                {processing
                                    ? 'Saving...'
                                    : mode === 'create'
                                      ? 'Create Voucher'
                                      : 'Update Voucher'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </AdminLayout>
    );
}
