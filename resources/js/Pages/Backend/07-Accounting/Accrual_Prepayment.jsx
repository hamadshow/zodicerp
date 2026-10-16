import React, { useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import BlankPage from '@/Components/BlankPage';
import Modal from '@/Components/Modal';
import Table from '../components/Table';
import '../../../../css/backend/main.scss';

const emptyForm = {
    adjustment_type: 'prepayment',
    description: '',
    period_start: '',
    period_end: '',
    recognition_method: 'monthly',
    report_date: '',
    total_amount: '',
    recognized_amount: '0',
    expense_account_id: '',
    prepaid_account_id: '',
    accrued_account_id: '',
};

const currency = (value, locale) => new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    style: 'currency', currency: 'EGP', minimumFractionDigits: 2, maximumFractionDigits: 3,
}).format(Number(value || 0));

const dateLabel = (value, locale) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB').format(date);
};

const typeIcon = (type) => (type === 'prepayment' ? 'schedule' : 'event_repeat');

export default function AccrualPrepayment() {
    const { props } = usePage();
    const locale = props?.localization?.current_locale || 'en';
    const translations = props?.localization?.translations || {};
    const t = (key, fallback) => translations[`Accrual_Prepayment.${key}`] || fallback;
    const entries = props.entries || [];
    const accounts = props.accounts || [];
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [busy, setBusy] = useState(false);
    const errors = props.errors || {};

    const filteredEntries = useMemo(() => entries.filter((entry) => {
        const matchesType = typeFilter === 'all' || entry.adjustment_type === typeFilter;
        const haystack = `${entry.id} ${entry.description || ''} ${entry.adjustment_type || ''}`.toLowerCase();
        return matchesType && haystack.includes(search.trim().toLowerCase());
    }), [entries, search, typeFilter]);

    const totals = useMemo(() => ({
        prepayments: entries.filter((row) => row.adjustment_type === 'prepayment').length,
        accruals: entries.filter((row) => row.adjustment_type === 'accrual').length,
        remaining: entries.reduce((sum, row) => sum + Number(row.remaining_balance || 0), 0),
    }), [entries]);

    const accountName = (account) => account ? `${account.AccCode} — ${account.AccName}` : '—';
    const openCreate = () => { setEditingId(null); setForm({ ...emptyForm, expense_account_id: accounts[0]?.AccID ? String(accounts[0].AccID) : '' }); setModalOpen(true); };
    const openEdit = (row) => {
        setEditingId(row.id);
        setForm({
            adjustment_type: row.adjustment_type,
            description: row.description || '',
            period_start: String(row.period_start || '').slice(0, 10),
            period_end: String(row.period_end || '').slice(0, 10),
            recognition_method: row.recognition_method || 'monthly',
            report_date: String(row.report_date || '').slice(0, 10),
            total_amount: String(row.total_amount ?? ''),
            recognized_amount: String(row.recognized_amount ?? '0'),
            expense_account_id: String(row.expense_account_id || ''),
            prepaid_account_id: String(row.prepaid_account_id || ''),
            accrued_account_id: String(row.accrued_account_id || ''),
        });
        setModalOpen(true);
    };
    const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));
    const submit = (event) => {
        event.preventDefault();
        setBusy(true);
        const options = { preserveScroll: true, onFinish: () => setBusy(false), onSuccess: () => setModalOpen(false) };
        if (editingId) router.put(route('admin.accrual-prepayment.update', editingId), form, options);
        else router.post(route('admin.accrual-prepayment.store'), form, options);
    };
    const remove = (row) => {
        if (window.confirm(t('confirm_delete', 'Delete this adjustment?'))) {
            router.delete(route('admin.accrual-prepayment.destroy', row.id), { preserveScroll: true });
        }
    };

    // Column widths keep the table inside the content area; description and
    // accounts are the flexible columns that absorb remaining space. They
    // render page-scoped spans so long text wraps cleanly instead of pushing
    // the row out of view.
    const columns = [
        { header: t('reference', 'Reference'), key: 'id', width: '110px', render: (row) => <span className="accrual-prepayment__reference">{`EA-${String(row.id).padStart(5, '0')}`}</span> },
        { header: t('type', 'Type'), key: 'adjustment_type', width: '130px', render: (row) => (
            <span className={`accrual-prepayment__badge accrual-prepayment__badge--${row.adjustment_type}`}>
                <i className="material-icons-outlined" aria-hidden="true">{typeIcon(row.adjustment_type)}</i>
                {row.adjustment_type === 'prepayment' ? t('prepayment', 'Prepayment') : t('accrual', 'Accrual')}
            </span>
        ) },
        { header: t('description', 'Description'), key: 'description', width: '280px', render: (row) => <span className="accrual-prepayment__cell-text">{row.description || '—'}</span> },
        { header: t('start_date', 'Start Date'), key: 'period_start', width: '115px', render: (row) => dateLabel(row.period_start, locale) },
        { header: t('end_date', 'End Date'), key: 'period_end', width: '115px', render: (row) => dateLabel(row.period_end, locale) },
        { header: t('total_amount', 'Total Amount'), key: 'total_amount', width: '135px', render: (row) => <span className="accrual-prepayment__amount">{currency(row.total_amount, locale)}</span> },
        { header: t('recognized_amount', 'Recognized'), key: 'recognized_amount', width: '135px', render: (row) => <span className="accrual-prepayment__amount accrual-prepayment__amount--muted">{currency(row.recognized_amount, locale)}</span> },
        { header: t('remaining_amount', 'Remaining'), key: 'remaining_balance', width: '135px', render: (row) => <span className="accrual-prepayment__amount accrual-prepayment__amount--strong">{currency(row.remaining_balance, locale)}</span> },
        { header: t('accounts', 'Accounts'), key: 'expense_account', width: '240px', render: (row) => (
            <span className="accrual-prepayment__cell-text accrual-prepayment__account">
                <span>{accountName(row.expense_account)}</span>
                <span className="accrual-prepayment__account-secondary">
                    <i className="material-icons-outlined" aria-hidden="true">subdirectory_arrow_right</i>
                    {row.adjustment_type === 'prepayment' ? accountName(row.prepaid_account) : accountName(row.accrued_account)}
                </span>
            </span>
        ) },
    ];

    return (
        <AdminLayout activeMenu="Accrual & Prepayment">
            <Head title={t('new_title', 'Accrual / Prepayment')} />
            <div className="accrual-prepayment-page">
                <BlankPage
                    breadcrumbs={[{ label: t('dashboard', 'Dashboard') }, { label: t('accounting', 'Accounting') }, { label: t('new_title', 'Accrual / Prepayment') }]}
                    stats={(
                        <div className="accrual-prepayment__stats">
                            <div className="accrual-prepayment__stat">
                                <span className="accrual-prepayment__stat-icon accrual-prepayment__stat-icon--prepayment">
                                    <i className="material-icons-outlined" aria-hidden="true">schedule</i>
                                </span>
                                <div>
                                    <span className="accrual-prepayment__stat-label">{t('prepayments', 'Prepayments')}</span>
                                    <strong>{totals.prepayments}</strong>
                                </div>
                            </div>
                            <div className="accrual-prepayment__stat">
                                <span className="accrual-prepayment__stat-icon accrual-prepayment__stat-icon--accrual">
                                    <i className="material-icons-outlined" aria-hidden="true">event_repeat</i>
                                </span>
                                <div>
                                    <span className="accrual-prepayment__stat-label">{t('accruals', 'Accruals')}</span>
                                    <strong>{totals.accruals}</strong>
                                </div>
                            </div>
                            <div className="accrual-prepayment__stat accrual-prepayment__stat--highlight">
                                <span className="accrual-prepayment__stat-icon accrual-prepayment__stat-icon--remaining">
                                    <i className="material-icons-outlined" aria-hidden="true">account_balance_wallet</i>
                                </span>
                                <div>
                                    <span className="accrual-prepayment__stat-label">{t('to_recognize', 'Remaining Balance')}</span>
                                    <strong>{currency(totals.remaining, locale)}</strong>
                                </div>
                            </div>
                        </div>
                    )}
                    filters={(
                        <div className="accrual-prepayment__filters">
                            <div className="accrual-prepayment__filter-field accrual-prepayment__filter-field--search">
                                <label>{t('search', 'Search')}</label>
                                <div className="accrual-prepayment__search-box">
                                    <i className="material-icons-outlined" aria-hidden="true">search</i>
                                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('search_placeholder', 'Search description')} />
                                </div>
                            </div>
                            <div className="accrual-prepayment__filter-field accrual-prepayment__filter-field--type">
                                <label>{t('type', 'Type')}</label>
                                <select className="form-select" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                                    <option value="all">{t('all', 'All')}</option>
                                    <option value="prepayment">{t('prepayment', 'Prepayment')}</option>
                                    <option value="accrual">{t('accrual', 'Accrual')}</option>
                                </select>
                            </div>
                        </div>
                    )}
                >
                    <div className="accrual-prepayment__card">
                        <div className="accrual-prepayment__header">
                            <div>
                                <h2>{t('new_title', 'Accrual / Prepayment')}</h2>
                                <p>{t('subtitle', 'Manage prepaid and accrued expense adjustments.')}</p>
                            </div>
                            <button type="button" className="btn btn-primary accrual-prepayment__add-button" onClick={openCreate}>
                                <i className="material-icons-outlined" aria-hidden="true">add</i> {t('add', 'Add')}
                            </button>
                        </div>
                        <div className="accrual-prepayment__table-wrap">
                            <Table tableData={filteredEntries} columns={columns} onEdit={openEdit} onDelete={remove} editTitle={t('edit', 'Edit')} deleteTitle={t('delete', 'Delete')} emptyIcon="fact_check" emptyMessage={t('no_records', 'No expense adjustments found.')} totalRecords={filteredEntries.length} totalPages={1} currentPage={1} recordsPerPage={10} />
                        </div>
                    </div>
                </BlankPage>
            </div>
            <Modal show={modalOpen} maxWidth="lg" onClose={() => setModalOpen(false)}>
                <form className="accrual-prepayment__modal" onSubmit={submit}>
                    <div className="accrual-prepayment__modal-header">
                        <h3>{editingId ? t('edit', 'Edit Adjustment') : t('create', 'New Adjustment')}</h3>
                        <button type="button" className="btn btn-link" onClick={() => setModalOpen(false)}>{t('close', 'Close')}</button>
                    </div>
                    {Object.keys(errors).length > 0 && <div className="alert alert-danger">{Object.values(errors).join(' ')}</div>}
                    <div className="accrual-prepayment__form-grid">
                        <div className="accrual-prepayment__field"><label>{t('type', 'Type')}</label><select className="form-select" value={form.adjustment_type} onChange={(event) => updateField('adjustment_type', event.target.value)}><option value="prepayment">{t('prepayment', 'Prepayment')}</option><option value="accrual">{t('accrual', 'Accrual')}</option></select></div>
                        <div className="accrual-prepayment__field"><label>{t('recognition_method', 'Recognition Method')}</label><select className="form-select" value={form.recognition_method} onChange={(event) => updateField('recognition_method', event.target.value)}><option value="monthly">{t('monthly', 'Monthly')}</option><option value="daily_proration">{t('daily_proration', 'Daily Proration')}</option></select></div>
                        <div className="accrual-prepayment__field accrual-prepayment__field--full"><label>{t('description', 'Description')}</label><input required maxLength="400" className="form-control" value={form.description} onChange={(event) => updateField('description', event.target.value)} /></div>
                        <div className="accrual-prepayment__field"><label>{t('expense_account', 'Expense Account')}</label><select required className="form-select" value={form.expense_account_id} onChange={(event) => updateField('expense_account_id', event.target.value)}><option value="">{t('select_account', 'Select Account')}</option>{accounts.map((account) => <option key={account.AccID} value={account.AccID}>{account.AccCode} — {account.AccName}</option>)}</select></div>
                        {form.adjustment_type === 'prepayment' ? <div className="accrual-prepayment__field"><label>{t('prepaid_account', 'Prepaid Account')}</label><select required className="form-select" value={form.prepaid_account_id} onChange={(event) => updateField('prepaid_account_id', event.target.value)}><option value="">{t('select_account', 'Select Account')}</option>{accounts.map((account) => <option key={account.AccID} value={account.AccID}>{account.AccCode} — {account.AccName}</option>)}</select></div> : <div className="accrual-prepayment__field"><label>{t('accrued_account', 'Accrued Expense Account')}</label><select required className="form-select" value={form.accrued_account_id} onChange={(event) => updateField('accrued_account_id', event.target.value)}><option value="">{t('select_account', 'Select Account')}</option>{accounts.map((account) => <option key={account.AccID} value={account.AccID}>{account.AccCode} — {account.AccName}</option>)}</select></div>}
                        <div className="accrual-prepayment__field"><label>{t('start_date', 'Period Start')}</label><input required type="date" className="form-control" value={form.period_start} onChange={(event) => updateField('period_start', event.target.value)} /></div>
                        <div className="accrual-prepayment__field"><label>{t('end_date', 'Period End')}</label><input required type="date" min={form.period_start || undefined} className="form-control" value={form.period_end} onChange={(event) => updateField('period_end', event.target.value)} /></div>
                        <div className="accrual-prepayment__field"><label>{t('total_amount', 'Total Amount')}</label><input required type="number" min="0.001" step="0.001" className="form-control" value={form.total_amount} onChange={(event) => updateField('total_amount', event.target.value)} /></div>
                        <div className="accrual-prepayment__field"><label>{t('recognized_amount', 'Recognized Amount')}</label><input type="number" min="0" step="0.001" max={form.total_amount || undefined} className="form-control" value={form.recognized_amount} onChange={(event) => updateField('recognized_amount', event.target.value)} /></div>
                        <div className="accrual-prepayment__field"><label>{t('report_date', 'Report Date (optional)')}</label><input type="date" min={form.period_start || undefined} className="form-control" value={form.report_date} onChange={(event) => updateField('report_date', event.target.value)} /></div>
                    </div>
                    <div className="accrual-prepayment__modal-actions"><button type="button" className="btn btn-outline-secondary" onClick={() => setModalOpen(false)}>{t('close', 'Cancel')}</button><button disabled={busy} type="submit" className="btn btn-primary">{busy ? t('saving', 'Saving…') : t('save', 'Save')}</button></div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
