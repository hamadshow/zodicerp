import React, { useMemo, useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '@/Pages/Backend/components/AdminLayout';
import BlankPage from '@/Components/BlankPage';
import Table from '@/Pages/Backend/components/Table';
import { formatDate } from '@/utils/date';
import '../../../../css/backend/main.scss';

// --- Sub-components ---

const ListView = ({ t, receipts, payments, transfers = [], activeTab, setActiveTab, searchTerm, setSearchTerm, openCreate, filtered, accountsMap, formatAmount, formatDate, openDetails, openEdit, handleDelete }) => {
    const columns = useMemo(() => [
        { 
            header: t('code', 'الكود'), 
            key: 'code',
            width: '120px',
            render: (item) => (
                <div className="code-cell">
                    <span className="code-value">{item.code}</span>
                    {item.reference && <span className="ref-hint">{item.reference}</span>}
                </div>
            )
        },
        { 
            header: t('type', 'النوع'), 
            key: 'type',
            width: '120px',
            render: (item) => (
                <span className={`type-badge type-${item.type}`}>
                    <span className="material-icons-outlined" style={{ fontSize: '14px', marginRight: '4px' }}>
                        {item.type === 'receipt' ? 'add_circle' : item.type === 'payment' ? 'remove_circle' : 'swap_horiz'}
                    </span>
                    {item.label}
                </span>
            )
        },
        { 
            header: t('date', 'التاريخ'), 
            key: 'date',
            width: '120px',
            render: (item) => formatDate(item.date)
        },
        { 
            header: t('accounts', 'الحسابات'), 
            key: 'accounts',
            render: (item) => {
                if (item.type === 'transfer') {
                    return (
                        <div className="transfer-cell">
                            <div className="acc-info">
                                <span className="acc-name">{item.from_account?.account_name || '-'}</span>
                                <span className="acc-type-badge">{t('from', 'من')}</span>
                            </div>
                            <span className="material-icons-outlined transfer-arrow">trending_flat</span>
                            <div className="acc-info">
                                <span className="acc-name">{item.to_account?.account_name || '-'}</span>
                                <span className="acc-type-badge destination">{t('to', 'إلى')}</span>
                            </div>
                        </div>
                    );
                }
                return (
                    <div className="single-account-cell">
                        <div style={{ fontWeight: '500' }}>{item.bank_account?.bank_name || '-'}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.bank_account?.account_number || ''}</div>
                    </div>
                );
            }
        },
        { 
            header: t('counterparty_or_transfer', 'الطرف المقابل / التحويل'), 
            key: 'counterparty_account_id',
            render: (item) => {
                if (item.type === 'transfer') {
                    return (
                        <div className="transfer-direction">
                            <span className="direction-label">{t('internal_transfer', 'تحويل داخلي')}</span>
                        </div>
                    );
                }
                return accountsMap.get(item.counterparty_account_id) || '-';
            }
        },
        { 
            header: t('amount', 'المبلغ'), 
            key: 'amount',
            width: '150px',
            render: (item) => (
                <div className="amount-cell">
                    <span className={`amount-value ${item.type}`}>
                        {item.type === 'payment' ? '-' : item.type === 'receipt' ? '+' : ''}
                        {formatAmount(item.amount)}
                    </span>
                </div>
            )
        },
        { 
            header: t('status', 'الحالة'), 
            key: 'status',
            width: '120px',
            render: (item) => (
                <span className={`status-badge status-${item.status}`}>{t(item.status, item.status)}</span>
            )
        }
    ], [t, accountsMap, formatAmount, formatDate]);

    const stats = (
        <section className="stats-cards"> 
            <div className="stat-card receipt"> 
                <div className="stat-content"> 
                    <div className="stat-value">{formatAmount(receipts.reduce((sum, r) => sum + Number(r.amount), 0))}</div> 
                    <div className="stat-label">{t('total_receipts', 'إجمالي المقبوضات')}</div> 
                </div> 
                <div className="stat-icon"> 
                    <span className="material-icons-outlined">trending_up</span>
                </div> 
            </div> 
            <div className="stat-card payment"> 
                <div className="stat-content"> 
                    <div className="stat-value">{formatAmount(payments.reduce((sum, p) => sum + Number(p.amount), 0))}</div> 
                    <div className="stat-label">{t('total_payments', 'إجمالي المدفوعات')}</div> 
                </div> 
                <div className="stat-icon"> 
                    <span className="material-icons-outlined">trending_down</span>
                </div> 
            </div> 
            <div className="stat-card transfer"> 
                <div className="stat-content"> 
                    <div className="stat-value">{formatAmount(transfers.reduce((sum, t) => sum + Number(t.amount), 0))}</div> 
                    <div className="stat-label">{t('total_transfers', 'إجمالي التحويلات')}</div> 
                </div> 
                <div className="stat-icon"> 
                    <span className="material-icons-outlined">swap_horiz</span>
                </div> 
            </div> 
        </section>
    );

    const filters = (
        <section className="filter-tabs"> 
            <button className={`filter-tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>{t('all', 'الكل')}</button> 
            <button className={`filter-tab ${activeTab === 'receipts' ? 'active' : ''}`} onClick={() => setActiveTab('receipts')}>{t('receipts', 'المقبوضات')}</button> 
            <button className={`filter-tab ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')}>{t('payments', 'المدفوعات')}</button> 
            <button className={`filter-tab ${activeTab === 'transfers' ? 'active' : ''}`} onClick={() => setActiveTab('transfers')}>{t('transfers', 'التحويلات')}</button> 
        </section>
    );

    return (
        <div className="fade-in bank-transactions-container">
            {stats}
            {filters}
            <Table
                showToolbar={true}
                toolbarSearch={true}
                toolbarSearchValue={searchTerm}
                onToolbarSearch={setSearchTerm}
                toolbarSearchPlaceholder={t('search_placeholder', 'بحث بالكود، البنك، المرجع...')}
                showAddButton={true}
                addButtonText={t('new_transaction', 'عملية جديدة')}
                onAdd={openCreate}
                showRefreshButton={true}
                onRefresh={() => router.reload()}
                tableData={filtered}
                columns={columns}
                onView={openDetails}
                onEdit={openEdit}
                onDelete={handleDelete}
            />
        </div>
    );
};

const FormView = ({ t, editingTransaction, backToList, handleSubmit, data, setData, errors, bankAccounts, filteredAccounts, processing }) => {
    const isEditing = !!editingTransaction;
    const isTransfer = data.type === 'transfer';

    return (
        <div className="fade-in data-section" style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div className="card-header">
                <h3>{isEditing ? t('edit_transaction', 'تعديل العملية') : t('create_transaction', 'إنشاء عملية جديدة')}</h3>
                <button className="btn-toolbar btn-refresh" onClick={backToList} title={t('back_to_list', 'العودة للقائمة')}>
                    <span className="material-icons-outlined">arrow_forward</span>
                </button>
            </div>

            <div className="card-body">
                <form onSubmit={handleSubmit} className="form-grid">
                    <div className="form-group full-width">
                        <label className="form-label">{t('transaction_type', 'نوع العملية')}</label>
                        <div className="type-selector">
                            <div 
                                className={`type-option receipt ${data.type === 'receipt' ? 'active' : ''}`} 
                                onClick={() => setData('type', 'receipt')}
                            >
                                <span className="material-icons-outlined">add_circle_outline</span>
                                <div className="option-text">
                                    <span className="main-label">{t('bank_receipt', 'قبض')}</span>
                                    <span className="sub-label">{t('receipt_hint', 'إيداع في الحساب')}</span>
                                </div>
                            </div>
                            <div 
                                className={`type-option payment ${data.type === 'payment' ? 'active' : ''}`} 
                                onClick={() => setData('type', 'payment')}
                            >
                                <span className="material-icons-outlined">remove_circle_outline</span>
                                <div className="option-text">
                                    <span className="main-label">{t('bank_payment', 'صرف')}</span>
                                    <span className="sub-label">{t('payment_hint', 'سحب من الحساب')}</span>
                                </div>
                            </div>
                            <div 
                                className={`type-option transfer ${data.type === 'transfer' ? 'active' : ''}`} 
                                onClick={() => setData('type', 'transfer')}
                            >
                                <span className="material-icons-outlined">swap_horiz</span>
                                <div className="option-text">
                                    <span className="main-label">{t('internal_transfer', 'تحويل')}</span>
                                    <span className="sub-label">{t('transfer_hint', 'بين الحسابات')}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label required">{t('date', 'التاريخ')}</label>
                        <input type="date" className="form-control" value={data.date} onChange={(e) => setData('date', e.target.value)} required />
                        {errors.date && <div className="error-message">{errors.date}</div>}
                    </div>

                    <div className="form-group">
                        <label className="form-label required">{t('amount', 'المبلغ')}</label>
                        <div className="amount-input-wrapper">
                            <input type="number" step="0.01" className="form-control amount-input" placeholder="0.00" value={data.amount} onChange={(e) => setData('amount', e.target.value)} required />
                            <span className="currency-label">{data.currency}</span>
                        </div>
                        {errors.amount && <div className="error-message">{errors.amount}</div>}
                    </div>

                    {isTransfer ? (
                        <>
                            <div className="form-group full-width transfer-accounts-grid">
                                <div className="account-select-box">
                                    <label className="form-label required">{t('from_account', 'من حساب (المصدر)')}</label>
                                    <select 
                                        className="form-control" 
                                        value={data.from_account_id} 
                                        onChange={(e) => setData('from_account_id', e.target.value)} 
                                        required
                                    >
                                        <option value="">{t('select_source_account', 'اختر حساب المصدر')}</option>
                                        {bankAccounts.map((account) => (
                                            <option key={account.id} value={account.id}>
                                                {account.account_name} ({account.account_number}) - {account.bank_name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.from_account_id && <div className="error-message">{errors.from_account_id}</div>}
                                </div>

                                <div className="transfer-arrow-icon">
                                    <span className="material-icons-outlined">double_arrow</span>
                                </div>

                                <div className="account-select-box">
                                    <label className="form-label required">{t('to_account', 'إلى حساب (الوجهة)')}</label>
                                    <select 
                                        className="form-control" 
                                        value={data.to_account_id} 
                                        onChange={(e) => setData('to_account_id', e.target.value)} 
                                        required
                                    >
                                        <option value="">{t('select_destination_account', 'اختر حساب الوجهة')}</option>
                                        {bankAccounts.map((account) => (
                                            <option key={account.id} value={account.id} disabled={String(account.id) === String(data.from_account_id)}>
                                                {account.account_name} ({account.account_number}) - {account.bank_name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.to_account_id && <div className="error-message">{errors.to_account_id}</div>}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="form-group">
                                <label className="form-label required">{t('bank_account', 'الحساب البنكي')}</label>
                                <select className="form-control" value={data.bank_account_id} onChange={(e) => setData('bank_account_id', e.target.value)} required>
                                    <option value="">{t('select_bank_account', 'اختر الحساب البنكي')}</option>
                                    {bankAccounts.map((account) => (
                                        <option key={account.id} value={account.id}>
                                            {account.account_name} ({account.account_number}) - {account.bank_name}
                                        </option>
                                    ))}
                                </select>
                                {errors.bank_account_id && <div className="error-message">{errors.bank_account_id}</div>}
                            </div>

                            <div className="form-group">
                                <label className="form-label required">{t('counterparty_account', 'الحساب المقابل')}</label>
                                <select className="form-control" value={data.counterparty_account_id} onChange={(e) => setData('counterparty_account_id', e.target.value)} required>
                                    <option value="">{t('select_account', 'اختر الحساب')}</option>
                                    {filteredAccounts.map((account) => (
                                        <option key={account.AccID} value={account.AccID}>{account.AccCode} - {account.AccName}</option>
                                    ))}
                                </select>
                                {errors.counterparty_account_id && <div className="error-message">{errors.counterparty_account_id}</div>}
                            </div>
                        </>
                    )}

                    <div className="form-group">
                        <label className="form-label">{t('status', 'الحالة')}</label>
                        <select className="form-control" value={data.status} onChange={(e) => setData('status', e.target.value)} required>
                            <option value="posted">{t('posted', 'مرحل')}</option>
                            <option value="draft">{t('draft', 'مسودة')}</option>
                            <option value="cancelled">{t('cancelled', 'ملغي')}</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">{t('reference', 'المرجع')}</label>
                        <input type="text" className="form-control" value={data.reference} onChange={(e) => setData('reference', e.target.value)} placeholder={t('enter_reference', 'أدخل رقم المرجع')} />
                    </div>

                    <div className="form-group full-width">
                        <label className="form-label">{t('notes', 'ملاحظات')}</label>
                        <textarea className="form-control" value={data.notes} onChange={(e) => setData('notes', e.target.value)} rows="2" placeholder={t('add_notes', 'أضف أي ملاحظات إضافية هنا...')} />
                    </div>

                    <div className="form-actions full-width">
                        <button type="submit" className="btn-submit" disabled={processing}>
                            <span className="material-icons-outlined">save</span>
                            {processing ? t('saving', 'جاري الحفظ...') : (isEditing ? t('update_transaction', 'تحديث العملية') : t('save_transaction', 'حفظ العملية'))}
                        </button>
                        <button type="button" className="btn-cancel" onClick={backToList}>
                            {t('cancel', 'إلغاء')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const DetailsView = ({ t, viewingTransaction, backToList, openEdit, accountsMap, formatAmount, formatDate }) => {
    const isTransfer = viewingTransaction?.type === 'transfer';

    return (
        <div className="fade-in data-section" style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div className="card-header">
                <h3>{t('transaction_details', 'تفاصيل العملية')}</h3>
                <div className="header-actions">
                    <button className="btn-toolbar btn-primary" onClick={() => openEdit(viewingTransaction)}>
                        <span className="material-icons-outlined">edit</span>
                        <span>{t('edit', 'تعديل')}</span>
                    </button>
                    <button className="btn-toolbar btn-refresh" onClick={backToList} title={t('back_to_list', 'العودة للقائمة')}>
                        <span className="material-icons-outlined">arrow_forward</span>
                    </button>
                </div>
            </div>

            <div className="card-body">
                <div className="details-summary">
                    <div className="summary-item">
                        <span className="label">{t('amount', 'المبلغ')}</span>
                        <span className={`value amount ${viewingTransaction?.type}`}>{formatAmount(viewingTransaction?.amount)}</span>
                    </div>
                    <div className="summary-item">
                        <span className="label">{t('status', 'الحالة')}</span>
                        <span className={`status-badge status-${viewingTransaction?.status}`}>{t(viewingTransaction?.status, viewingTransaction?.status)}</span>
                    </div>
                </div>

                {isTransfer ? (
                    <div className="transfer-visualization-card">
                        <div className="account-card from">
                            <span className="card-label">{t('from_account', 'من حساب')}</span>
                            <span className="account-name">{viewingTransaction?.from_account?.account_name}</span>
                            <span className="account-bank">{viewingTransaction?.from_account?.bank_name}</span>
                            <span className="account-number">{viewingTransaction?.from_account?.account_number}</span>
                        </div>
                        <div className="transfer-arrow-visual">
                            <span className="material-icons-outlined">double_arrow</span>
                        </div>
                        <div className="account-card to">
                            <span className="card-label">{t('to_account', 'إلى حساب')}</span>
                            <span className="account-name">{viewingTransaction?.to_account?.account_name}</span>
                            <span className="account-bank">{viewingTransaction?.to_account?.bank_name}</span>
                            <span className="account-number">{viewingTransaction?.to_account?.account_number}</span>
                        </div>
                    </div>
                ) : (
                    <div className="details-grid">
                        <div className="detail-item full-width">
                            <span className="detail-label">{t('bank_account', 'الحساب البنكي')}</span>
                            <span className="detail-value">{viewingTransaction?.bank_account?.bank_name} - {viewingTransaction?.bank_account?.account_name}</span>
                        </div>
                        <div className="detail-item full-width">
                            <span className="detail-label">{t('counterparty_account', 'الحساب المقابل')}</span>
                            <span className="detail-value">{accountsMap.get(viewingTransaction?.counterparty_account_id) || '-'}</span>
                        </div>
                    </div>
                )}

                <div className="details-grid" style={{ marginTop: '20px' }}>
                    <div className="detail-item">
                        <span className="detail-label">{t('code', 'الكود')}</span>
                        <span className="detail-value">{viewingTransaction?.code}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">{t('type', 'النوع')}</span>
                        <span className={`type-badge type-${viewingTransaction?.type}`}>{viewingTransaction?.label}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">{t('date', 'التاريخ')}</span>
                        <span className="detail-value">{formatDate(viewingTransaction?.date)}</span>
                    </div>
                    {viewingTransaction?.reference && (
                        <div className="detail-item">
                            <span className="detail-label">{t('reference', 'المرجع')}</span>
                            <span className="detail-value">{viewingTransaction.reference}</span>
                        </div>
                    )}
                    {viewingTransaction?.notes && (
                        <div className="detail-item full-width">
                            <span className="detail-label">{t('notes', 'ملاحظات')}</span>
                            <div className="notes-container">
                                {viewingTransaction.notes}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const BankTransactions = ({ payments = [], receipts = [], transfers = [], bankAccounts = [], accounts = [] }) => {
    const { props } = usePage();
    const { localization } = props;
    const translations = localization?.translations || {};

    const t = (key, fallback) => translations[`BankTransactions.${key}`] || fallback;

    // View States
    const [showForm, setShowForm] = useState(false);
    const [viewingTransaction, setViewingTransaction] = useState(null);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [toast, setToast] = useState(null);

    // Form Hook
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        id: null,
        type: 'receipt',
        original_type: null,
        code: '',
        bank_account_id: '',
        from_account_id: '',
        to_account_id: '',
        counterparty_account_id: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        status: 'posted',
        reference: '',
        notes: '',
        currency: 'EGP',
    });

    // --- Helpers & Memos ---
    
    const showToast = (message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const accountsMap = useMemo(() => {
        const map = new Map();
        accounts.forEach((acc) => {
            map.set(acc.AccID, `${acc.AccCode} - ${acc.AccName}`);
        });
        return map;
    }, [accounts]);

    const filteredAccounts = useMemo(() => {
        return accounts.filter(account => Number(account.AccType) === 1);
    }, [accounts]);

    const transactions = useMemo(() => {
        const all = [
            ...payments.map(p => ({ ...p, id: `payment_${p.id}`, type: 'payment', label: t('payment', 'سند صرف') })),
            ...receipts.map(r => ({ ...r, id: `receipt_${r.id}`, type: 'receipt', label: t('receipt', 'سند قبض') })),
            ...transfers.map(tr => ({ ...tr, id: `transfer_${tr.id}`, type: 'transfer', label: t('transfer', 'تحويل مالي') }))
        ];
        return all.sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [payments, receipts, transfers, t]);

    const filtered = useMemo(() => {
        return transactions.filter((item) => {
            const matchesTab =
                activeTab === 'all' ||
                (activeTab === 'payments' && item.type === 'payment') ||
                (activeTab === 'receipts' && item.type === 'receipt') ||
                (activeTab === 'transfers' && item.type === 'transfer');
            const term = searchTerm.trim().toLowerCase();
            const matchesSearch =
                !term ||
                item.code?.toLowerCase().includes(term) ||
                item.reference?.toLowerCase().includes(term) ||
                item.bank_account?.bank_name?.toLowerCase().includes(term) ||
                item.from_account?.account_name?.toLowerCase().includes(term) ||
                item.to_account?.account_name?.toLowerCase().includes(term);
            return matchesTab && matchesSearch;
        });
    }, [transactions, activeTab, searchTerm]);

    const populateFormFromTransaction = (item) => {
        // Extract numeric ID if it's prefixed (e.g., "transfer_5" -> 5)
        const rawId = typeof item.id === 'string' ? item.id.replace(/[^0-9]/g, '') : item.id;

        setData({
            id: rawId ?? null,
            type: item.type || 'receipt',
            original_type: item.type || 'receipt',
            code: item.code || '',
            bank_account_id: item.bank_account_id ? String(item.bank_account_id) : '',
            from_account_id: item.from_account_id ? String(item.from_account_id) : '',
            to_account_id: item.to_account_id ? String(item.to_account_id) : '',
            counterparty_account_id: item.counterparty_account_id ? String(item.counterparty_account_id) : '',
            amount: item.amount ?? '',
            date: item.date ? String(item.date).split('T')[0] : new Date().toISOString().split('T')[0],
            status: item.status || 'posted',
            reference: item.reference || '',
            notes: item.notes || '',
            currency: item.currency || 'EGP',
        });
        clearErrors();
    };

    // --- Handlers ---

    const backToList = () => {
        setShowForm(false);
        setEditingTransaction(null);
        setViewingTransaction(null);
        reset();
        clearErrors();
    };

    const openCreate = () => {
        setEditingTransaction(null);
        setViewingTransaction(null);
        setShowForm(true);
    };

    const openEdit = (item) => {
        populateFormFromTransaction(item);
        setEditingTransaction(item);
        setViewingTransaction(null);
        setShowForm(true);
    };

    const openDetails = (item) => {
        setViewingTransaction(item);
        setEditingTransaction(null);
        setShowForm(false);
    };

    const handleDelete = (item) => {
        if (confirm(t('delete_confirmation', 'هل أنت متأكد من حذف هذه العملية؟'))) {
            router.delete(route('admin.bank-transactions.destroy', { type: item.type, transaction: item.id }), {
                onSuccess: () => {
                    showToast(t('deleted_success', 'تم حذف العملية بنجاح'), 'success');
                    backToList();
                }
            });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingTransaction) {
            put(route('admin.bank-transactions.update', {
                type: data.original_type,
                transaction: data.id,
            }), {
                onSuccess: () => {
                    showToast(t('updated_success', 'تم الحفظ بنجاح'), 'success');
                    backToList();
                },
            });
            return;
        }

        post(route('admin.bank-transactions.store'), {
            onSuccess: () => {
                showToast(t('created_success', 'تم الحفظ بنجاح'), 'success');
                backToList();
            },
        });
    };

    const formatAmount = (amount) => {
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(Number(amount || 0));
    };

    const breadcrumbs = [
        { label: t('dashboard', 'لوحة التحكم'), href: route('admin.dashboard') },
        { label: t('cash_and_bank', 'النقدية والبنوك'), onClick: backToList },
        { label: t('bank_transactions', 'حركات البنوك'), active: !(showForm || viewingTransaction) }
    ];

    if (showForm || viewingTransaction) {
        breadcrumbs.push({
            label: editingTransaction ? t('edit_bank_transaction', 'تعديل حركة بنكية') : 
                   showForm ? t('create_bank_transaction', 'إنشاء حركة بنكية') : 
                   t('transaction_details', 'تفاصيل الحركة'),
            active: true
        });
    }

    return (
        <AdminLayout activeMenu="Bank Transactions">
            <Head title={t('bank_transactions', 'حركات البنوك')} />
            {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
            
            <BlankPage breadcrumbs={breadcrumbs}>
                {!showForm && !viewingTransaction && (
                    <ListView 
                        t={t}
                        receipts={receipts}
                        payments={payments}
                        transfers={transfers}
                        transactions={transactions}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        openCreate={openCreate}
                        filtered={filtered}
                        accountsMap={accountsMap}
                        formatAmount={formatAmount}
                        formatDate={formatDate}
                        openDetails={openDetails}
                        openEdit={openEdit}
                        handleDelete={handleDelete}
                    />
                )}
                {showForm && (
                    <FormView 
                        t={t}
                        editingTransaction={editingTransaction}
                        backToList={backToList}
                        handleSubmit={handleSubmit}
                        data={data}
                        setData={setData}
                        errors={errors}
                        bankAccounts={bankAccounts}
                        filteredAccounts={filteredAccounts}
                        processing={processing}
                    />
                )}
                {viewingTransaction && !showForm && (
                    <DetailsView 
                        t={t}
                        viewingTransaction={viewingTransaction}
                        backToList={backToList}
                        openEdit={openEdit}
                        accountsMap={accountsMap}
                        formatAmount={formatAmount}
                        formatDate={formatDate}
                    />
                )}
            </BlankPage>
        </AdminLayout>
    );
};

export default BankTransactions;

