import React, { useMemo, useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import BlankPage from '@/Components/BlankPage';
import Modal from '@/Components/Modal';
import Table from '../components/Table';
import '../../../../css/backend/main.scss';

const mockEntries = [
    {
        id: 'AP-001',
        reference: 'PRE-0001',
        type: 'prepayment',
        description: 'Office rent advance',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        total_amount: 120000,
        recognized_amount: 30000,
        remaining_amount: 90000,
        status: 'active',
    },
    {
        id: 'AP-002',
        reference: 'ACC-0001',
        type: 'accrual',
        description: 'Electricity expense',
        start_date: '2026-03-01',
        end_date: '2026-03-31',
        total_amount: 20000,
        recognized_amount: 20000,
        remaining_amount: 0,
        status: 'completed',
    },
    {
        id: 'AP-003',
        reference: 'ADV-0001',
        type: 'supplier_advance',
        description: 'Supplier deposit for office fit-out',
        start_date: '2026-02-01',
        end_date: '2026-02-28',
        total_amount: 50000,
        recognized_amount: 0,
        remaining_amount: 50000,
        status: 'pending',
    },
    {
        id: 'AP-004',
        reference: 'PRE-0002',
        type: 'prepayment',
        description: 'Insurance premium',
        start_date: '2026-04-01',
        end_date: '2026-06-30',
        total_amount: 18000,
        recognized_amount: 15000,
        remaining_amount: 3000,
        status: 'draft',
    },
    {
        id: 'AP-005',
        reference: 'ACC-0002',
        type: 'accrual',
        description: 'Maintenance service fee',
        start_date: '2026-05-01',
        end_date: '2026-05-31',
        total_amount: 16000,
        recognized_amount: 4000,
        remaining_amount: 12000,
        status: 'pending',
    },
    {
        id: 'AP-006',
        reference: 'ADV-0002',
        type: 'supplier_advance',
        description: 'Air-conditioner installation deposit',
        start_date: '2026-06-01',
        end_date: '2026-06-15',
        total_amount: 12000,
        recognized_amount: 12000,
        remaining_amount: 0,
        status: 'completed',
    },
];

const defaultFormState = {
    reference: '',
    type: 'prepayment',
    description: '',
    expense_account_id: '1210',
    prepaid_account_id: '1410',
    start_date: '',
    end_date: '',
    total_amount: '',
    recognized_amount: '0',
    remaining_amount: '',
    status: 'draft',
};

const formatDate = (value, locale = 'en') => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    const formatter = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });

    return formatter.format(date);
};

const formatCurrency = (value, locale = 'en') => {
    const currency = locale === 'ar' ? 'EGP' : 'EGP';
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number(value || 0));
};

const typeLabelMap = {
    prepayment: 'Prepayment',
    accrual: 'Accrual',
    supplier_advance: 'Supplier Advance',
};

const statusLabelMap = {
    draft: 'Draft',
    active: 'Active',
    pending: 'Pending',
    completed: 'Completed',
};

const accountOptions = [
    { id: '1010', name: 'Cash in Bank' },
    { id: '1210', name: 'Office Rent Expense' },
    { id: '1410', name: 'Prepaid Insurance' },
    { id: '1500', name: 'Accrued Utilities' },
    { id: '2100', name: 'Accounts Payable' },
    { id: '4000', name: 'Operating Expenses' },
];

export default function AccrualPrepayment() {
    const { props } = usePage();
    const localization = props?.localization || {};
    const currentLocale = localization.current_locale || 'en';
    const translations = localization.translations || {};

    const t = (key, fallback) => {
        return translations[`Accrual_Prepayment.${key}`] || fallback;
    };

    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [entries, setEntries] = useState(mockEntries);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [formState, setFormState] = useState(defaultFormState);

    const filteredEntries = useMemo(() => {
        const term = search.trim().toLowerCase();

        return entries.filter((entry) => {
            const matchesSearch =
                !term ||
                [entry.reference, entry.description, entry.type]
                    .join(' ')
                    .toLowerCase()
                    .includes(term);

            const matchesType = typeFilter === 'all' || entry.type === typeFilter;
            const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
            const matchesFromDate = !fromDate || entry.start_date >= fromDate;
            const matchesToDate = !toDate || entry.end_date <= toDate;

            return matchesSearch && matchesType && matchesStatus && matchesFromDate && matchesToDate;
        });
    }, [entries, search, typeFilter, statusFilter, fromDate, toDate]);

    const totals = useMemo(() => {
        const totalActive = filteredEntries.filter((entry) => entry.status === 'active').length;
        const totalPrepayments = filteredEntries.filter((entry) => entry.type === 'prepayment').length;
        const totalAccruals = filteredEntries.filter((entry) => entry.type === 'accrual').length;
        const totalSupplierAdvances = filteredEntries.filter((entry) => entry.type === 'supplier_advance').length;
        const totalToRecognize = filteredEntries.reduce((sum, entry) => sum + Number(entry.remaining_amount || 0), 0);

        return {
            totalActive,
            totalPrepayments,
            totalAccruals,
            totalSupplierAdvances,
            totalToRecognize,
        };
    }, [filteredEntries]);

    const summaryCards = (
        <div className="row g-3 accrual-prepayment__stats">
            <div className="col-xl-2 col-lg-3 col-md-6 col-sm-6">
                <div className="accrual-prepayment__stat accrual-prepayment__stat--primary">
                    <span className="accrual-prepayment__stat-label">{t('active_items', 'Active Items')}</span>
                    <strong>{totals.totalActive}</strong>
                </div>
            </div>
            <div className="col-xl-2 col-lg-3 col-md-6 col-sm-6">
                <div className="accrual-prepayment__stat">
                    <span className="accrual-prepayment__stat-label">{t('prepayments', 'Prepayments')}</span>
                    <strong>{totals.totalPrepayments}</strong>
                </div>
            </div>
            <div className="col-xl-2 col-lg-3 col-md-6 col-sm-6">
                <div className="accrual-prepayment__stat">
                    <span className="accrual-prepayment__stat-label">{t('accruals', 'Accruals')}</span>
                    <strong>{totals.totalAccruals}</strong>
                </div>
            </div>
            <div className="col-xl-2 col-lg-3 col-md-6 col-sm-6">
                <div className="accrual-prepayment__stat">
                    <span className="accrual-prepayment__stat-label">{t('supplier_advances', 'Supplier Advances')}</span>
                    <strong>{totals.totalSupplierAdvances}</strong>
                </div>
            </div>
            <div className="col-xl-4 col-lg-6 col-md-12">
                <div className="accrual-prepayment__stat accrual-prepayment__stat--highlight">
                    <span className="accrual-prepayment__stat-label">{t('to_recognize', 'To Recognize')}</span>
                    <strong>{formatCurrency(totals.totalToRecognize, currentLocale)}</strong>
                </div>
            </div>
        </div>
    );

    const openScheduleModal = (entry) => {
        setSelectedEntry(entry);
        setScheduleModalOpen(true);
    };

    const openPreviewModal = (entry) => {
        setSelectedEntry(entry);
        setPreviewModalOpen(true);
    };

    const handleCreateEntry = (event) => {
        event.preventDefault();

        const nextReference = formState.reference || `AUTO-${entries.length + 1}`;
        const totalAmount = Number(formState.total_amount || 0);
        const recognizedAmount = Number(formState.recognized_amount || 0);
        const remainingAmount = Number(formState.remaining_amount || Math.max(totalAmount - recognizedAmount, 0));

        const expenseAccount = accountOptions.find((account) => account.id === formState.expense_account_id);
        const prepaidAccount = accountOptions.find((account) => account.id === formState.prepaid_account_id);

        const newItem = {
            id: `AP-${String(entries.length + 1).padStart(3, '0')}`,
            reference: nextReference,
            type: formState.type,
            description: formState.description || 'New local entry',
            expense_account_id: formState.expense_account_id,
            prepaid_account_id: formState.prepaid_account_id,
            expense_account_name: expenseAccount?.name || 'Expense Account',
            prepaid_account_name: prepaidAccount?.name || 'Prepaid Account',
            start_date: formState.start_date,
            end_date: formState.end_date,
            total_amount: totalAmount,
            recognized_amount: recognizedAmount,
            remaining_amount: remainingAmount,
            status: formState.status,
        };

        setEntries((currentEntries) => [newItem, ...currentEntries]);
        setFormState(defaultFormState);
        setCreateModalOpen(false);
    };

    const columns = useMemo(
        () => [
            { header: t('reference', 'Reference'), key: 'reference' },
            {
                header: t('type', 'Type'),
                key: 'type',
                render: (row) => (
                    <span className={`accrual-prepayment__badge accrual-prepayment__badge--${row.type}`}>
                        {t(row.type, typeLabelMap[row.type] || row.type)}
                    </span>
                ),
            },
            { header: t('description', 'Description'), key: 'description' },
            {
                header: t('start_date', 'Start Date'),
                key: 'start_date',
                render: (row) => formatDate(row.start_date, currentLocale),
            },
            {
                header: t('end_date', 'End Date'),
                key: 'end_date',
                render: (row) => formatDate(row.end_date, currentLocale),
            },
            {
                header: t('total_amount', 'Total Amount'),
                key: 'total_amount',
                render: (row) => formatCurrency(row.total_amount, currentLocale),
            },
            {
                header: t('recognized_amount', 'Recognized'),
                key: 'recognized_amount',
                render: (row) => formatCurrency(row.recognized_amount, currentLocale),
            },
            {
                header: t('remaining_amount', 'Remaining'),
                key: 'remaining_amount',
                render: (row) => formatCurrency(row.remaining_amount, currentLocale),
            },
            {
                header: t('status', 'Status'),
                key: 'status',
                render: (row) => (
                    <span className={`accrual-prepayment__badge accrual-prepayment__badge--status accrual-prepayment__badge--${row.status}`}>
                        {t(row.status, statusLabelMap[row.status] || row.status)}
                    </span>
                ),
            },
            {
                header: t('actions', 'Actions'),
                key: 'actions',
                sortable: false,
                render: (row) => (
                    <div className="accrual-prepayment__actions">
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => openPreviewModal(row)}>
                            {t('view', 'View')}
                        </button>
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => openScheduleModal(row)}>
                            {t('schedule', 'Schedule')}
                        </button>
                    </div>
                ),
            },
        ],
        [currentLocale, t],
    );

    const scheduleRows = selectedEntry
        ? [
            { period: 'Jan 2026', amount: selectedEntry.total_amount / 4, status: 'Recognized' },
            { period: 'Feb 2026', amount: selectedEntry.total_amount / 4, status: 'Recognized' },
            { period: 'Mar 2026', amount: selectedEntry.total_amount / 4, status: 'Current' },
            { period: 'Apr 2026', amount: selectedEntry.total_amount / 4, status: 'Pending' },
        ]
        : [];

    const previewLines = selectedEntry
        ? selectedEntry.type === 'accrual'
            ? [
                { label: 'Debit', value: 'Electricity Expense', amount: selectedEntry.total_amount },
                { label: 'Credit', value: 'Accrued Expenses', amount: selectedEntry.total_amount },
            ]
            : [
                { label: 'Debit', value: 'Prepaid Expenses', amount: selectedEntry.total_amount },
                { label: 'Credit', value: 'Cash / Bank', amount: selectedEntry.total_amount },
            ]
        : [];

    const filterSection = (
        <div className="accrual-prepayment__filters">
            <div className="accrual-prepayment__filter-field accrual-prepayment__filter-field--search">
                <label>{t('search', 'Search')}</label>
                <input
                    type="search"
                    className="form-control"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t('search_placeholder', 'Search reference or description')}
                />
            </div>

            <div className="accrual-prepayment__filter-field">
                <label>{t('type', 'Type')}</label>
                <select className="form-select" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                    <option value="all">{t('all', 'All')}</option>
                    <option value="prepayment">{t('prepayment', 'Prepayment')}</option>
                    <option value="accrual">{t('accrual', 'Accrual')}</option>
                    <option value="supplier_advance">{t('supplier_advance', 'Supplier Advance')}</option>
                </select>
            </div>

            <div className="accrual-prepayment__filter-field">
                <label>{t('status', 'Status')}</label>
                <select className="form-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    <option value="all">{t('all', 'All')}</option>
                    <option value="draft">{t('draft', 'Draft')}</option>
                    <option value="active">{t('active', 'Active')}</option>
                    <option value="pending">{t('pending', 'Pending')}</option>
                    <option value="completed">{t('completed', 'Completed')}</option>
                </select>
            </div>

            <div className="accrual-prepayment__filter-field">
                <label>{t('from_date', 'From Date')}</label>
                <input type="date" className="form-control" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            </div>

            <div className="accrual-prepayment__filter-field">
                <label>{t('to_date', 'To Date')}</label>
                <input type="date" className="form-control" value={toDate} onChange={(event) => setToDate(event.target.value)} />
            </div>

            <div className="accrual-prepayment__filter-actions">
                <button type="button" className="btn btn-primary btn-sm" onClick={() => {}}>
                    {t('apply', 'Apply')}
                </button>
                <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => {
                        setSearch('');
                        setTypeFilter('all');
                        setStatusFilter('all');
                        setFromDate('');
                        setToDate('');
                    }}
                >
                    {t('reset', 'Reset')}
                </button>
            </div>
        </div>
    );

    return (
        <AdminLayout activeMenu="Accrual & Prepayment">
            <Head title={t('new_title', 'New Accrual / Prepayment')} />

            <BlankPage
                breadcrumbs={[
                    { label: t('dashboard', 'Dashboard') },
                    { label: t('accounting', 'Accounting') },
                    { label: t('new_title', 'New Accrual / Prepayment') },
                ]}
                stats={summaryCards}
                filters={filterSection}
            >
                <div className="accrual-prepayment__card">
                    <div className="accrual-prepayment__header">
                        <div>
                            <h2>{t('new_title', 'New Accrual / Prepayment')}</h2>
                            <p>{t('subtitle', 'Track accruals, prepayments, and supplier advances before final recognition.')}</p>
                        </div>
                        <button
                            type="button"
                            className="btn btn-primary accrual-prepayment__add-button"
                            onClick={() => setCreateModalOpen(true)}
                            aria-label={t('create', 'New Accrual / Prepayment')}
                        >
                            <i className="material-icons-outlined" aria-hidden="true">add</i>
                            <span>{t('add', 'Add')}</span>
                        </button>
                    </div>

                    <div className="accrual-prepayment__table-wrap">
                        <Table
                            tableData={filteredEntries}
                            columns={columns}
                            emptyMessage={t('no_records', 'No matching accrual or prepayment records found.')}
                            totalRecords={filteredEntries.length}
                            totalPages={1}
                            currentPage={1}
                            recordsPerPage={10}
                        />
                    </div>
                </div>
            </BlankPage>

            <Modal show={createModalOpen} maxWidth="lg" onClose={() => setCreateModalOpen(false)}>
                <form className="accrual-prepayment__modal" onSubmit={handleCreateEntry}>
                    <div className="accrual-prepayment__modal-header">
                        <h3>{t('create', 'New Accrual / Prepayment')}</h3>
                        <button type="button" className="btn btn-link" onClick={() => setCreateModalOpen(false)}>
                            {t('close', 'Close')}
                        </button>
                    </div>

                    <div className="accrual-prepayment__form-grid">
                        <div className="accrual-prepayment__field">
                            <label htmlFor="ap-reference">{t('reference', 'Reference')}</label>
                            <input
                                id="ap-reference"
                                type="text"
                                className="form-control"
                                value={formState.reference}
                                onChange={(event) => setFormState((current) => ({ ...current, reference: event.target.value }))}
                                placeholder="PRE-0003"
                            />
                        </div>

                        <div className="accrual-prepayment__field">
                            <label htmlFor="ap-type">{t('type', 'Type')}</label>
                            <select
                                id="ap-type"
                                className="form-select"
                                value={formState.type}
                                onChange={(event) => setFormState((current) => ({ ...current, type: event.target.value }))}
                            >
                                <option value="prepayment">{t('prepayment', 'Prepayment')}</option>
                                <option value="accrual">{t('accrual', 'Accrual')}</option>
                                <option value="supplier_advance">{t('supplier_advance', 'Supplier Advance')}</option>
                            </select>
                        </div>

                        <div className="accrual-prepayment__field accrual-prepayment__field--full">
                            <label htmlFor="ap-description">{t('description', 'Description')}</label>
                            <input
                                id="ap-description"
                                type="text"
                                className="form-control"
                                value={formState.description}
                                onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
                                placeholder={t('search_placeholder', 'Search reference or description')}
                            />
                        </div>

                        <div className="accrual-prepayment__field">
                            <label htmlFor="ap-expense-account">{t('expense_account', 'Expense Account')}</label>
                            <select
                                id="ap-expense-account"
                                className="form-select"
                                value={formState.expense_account_id}
                                onChange={(event) => setFormState((current) => ({ ...current, expense_account_id: event.target.value }))}
                            >
                                <option value="">{t('select_account', 'Select Account')}</option>
                                {accountOptions.map((account) => (
                                    <option key={account.id} value={account.id}>
                                        {account.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="accrual-prepayment__field">
                            <label htmlFor="ap-prepaid-account">{t('prepaid_account', 'Prepaid Account')}</label>
                            <select
                                id="ap-prepaid-account"
                                className="form-select"
                                value={formState.prepaid_account_id}
                                onChange={(event) => setFormState((current) => ({ ...current, prepaid_account_id: event.target.value }))}
                            >
                                <option value="">{t('select_account', 'Select Account')}</option>
                                {accountOptions.map((account) => (
                                    <option key={account.id} value={account.id}>
                                        {account.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="accrual-prepayment__field">
                            <label htmlFor="ap-start-date">{t('start_date', 'Start Date')}</label>
                            <input
                                id="ap-start-date"
                                type="date"
                                className="form-control"
                                value={formState.start_date}
                                onChange={(event) => setFormState((current) => ({ ...current, start_date: event.target.value }))}
                            />
                        </div>

                        <div className="accrual-prepayment__field">
                            <label htmlFor="ap-end-date">{t('end_date', 'End Date')}</label>
                            <input
                                id="ap-end-date"
                                type="date"
                                className="form-control"
                                value={formState.end_date}
                                onChange={(event) => setFormState((current) => ({ ...current, end_date: event.target.value }))}
                            />
                        </div>

                        <div className="accrual-prepayment__field">
                            <label htmlFor="ap-total-amount">{t('total_amount', 'Total Amount')}</label>
                            <input
                                id="ap-total-amount"
                                type="number"
                                min="0"
                                step="0.01"
                                className="form-control"
                                value={formState.total_amount}
                                onChange={(event) => setFormState((current) => ({ ...current, total_amount: event.target.value }))}
                            />
                        </div>

                        <div className="accrual-prepayment__field">
                            <label htmlFor="ap-recognized-amount">{t('recognized_amount', 'Recognized')}</label>
                            <input
                                id="ap-recognized-amount"
                                type="number"
                                min="0"
                                step="0.01"
                                className="form-control"
                                value={formState.recognized_amount}
                                onChange={(event) => setFormState((current) => ({ ...current, recognized_amount: event.target.value }))}
                            />
                        </div>

                        <div className="accrual-prepayment__field">
                            <label htmlFor="ap-status">{t('status', 'Status')}</label>
                            <select
                                id="ap-status"
                                className="form-select"
                                value={formState.status}
                                onChange={(event) => setFormState((current) => ({ ...current, status: event.target.value }))}
                            >
                                <option value="draft">{t('draft', 'Draft')}</option>
                                <option value="active">{t('active', 'Active')}</option>
                                <option value="pending">{t('pending', 'Pending')}</option>
                                <option value="completed">{t('completed', 'Completed')}</option>
                            </select>
                        </div>
                    </div>

                    <div className="accrual-prepayment__modal-actions">
                        <button type="button" className="btn btn-outline-secondary" onClick={() => setCreateModalOpen(false)}>
                            {t('close', 'Close')}
                        </button>
                        <button type="submit" className="btn btn-primary">
                            {t('add', 'Add')}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal show={scheduleModalOpen} maxWidth="lg" onClose={() => setScheduleModalOpen(false)}>
                <div className="accrual-prepayment__modal">
                    <div className="accrual-prepayment__modal-header">
                        <h3>{t('schedule', 'Schedule')}</h3>
                        <button type="button" className="btn btn-link" onClick={() => setScheduleModalOpen(false)}>
                            {t('close', 'Close')}
                        </button>
                    </div>

                    <div className="table-responsive mt-3">
                        <table className="table table-sm align-middle mb-0">
                            <thead>
                                <tr>
                                    <th>{t('period', 'Period')}</th>
                                    <th>{t('amount', 'Amount')}</th>
                                    <th>{t('status', 'Status')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {scheduleRows.map((row) => (
                                    <tr key={row.period}>
                                        <td>{row.period}</td>
                                        <td>{formatCurrency(row.amount, currentLocale)}</td>
                                        <td>
                                            <span className="accrual-prepayment__badge accrual-prepayment__badge--status accrual-prepayment__badge--pending">
                                                {row.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Modal>

            <Modal show={previewModalOpen} maxWidth="md" onClose={() => setPreviewModalOpen(false)}>
                <div className="accrual-prepayment__modal">
                    <div className="accrual-prepayment__modal-header">
                        <h3>{t('preview', 'Preview')}</h3>
                        <button type="button" className="btn btn-link" onClick={() => setPreviewModalOpen(false)}>
                            {t('close', 'Close')}
                        </button>
                    </div>

                    <div className="accrual-prepayment__preview">
                        <h4>{t('adjustment_preview', 'Adjustment Preview')}</h4>
                        <div className="accrual-prepayment__preview-box">
                            {previewLines.map((line) => (
                                <div key={`${line.label}-${line.value}`} className="accrual-prepayment__preview-row">
                                    <div>
                                        <strong>{line.label}</strong>
                                        <span>{line.value}</span>
                                    </div>
                                    <strong>{formatCurrency(line.amount, currentLocale)}</strong>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}
