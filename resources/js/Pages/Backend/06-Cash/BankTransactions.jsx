import React, { useMemo, useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '@/Pages/Backend/components/AdminLayout';
import BlankPage from '@/Components/BlankPage';
import Table from '@/Pages/Backend/components/Table';
import { formatDate } from '@/utils/date';
import '../../../../css/backend/main.scss';

// --- Sub-components ---

const ListView = ({ t, receipts, payments, transfers = [], transactions, activeTab, setActiveTab, searchTerm, setSearchTerm, openCreate, filtered, accountsMap, formatAmount, formatDate, openDetails, openEdit, handleDelete }) => {
    const columns = useMemo(() => [
        { 
            header: t('code', 'الكود'), 
            key: 'code',
            width: '120px'
        },
        { 
            header: t('type', 'النوع'), 
            key: 'type',
            width: '120px',
            render: (item) => (
                <span className={`type-badge type-${item.type}`}>{item.label}</span>
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
                        <div className="transfer-accounts-cell">
                            <div className="account-info from">
                                <span className="label-xs">{t('from', 'من')}:</span>
                                <span className="name">{item.from_account?.name}</span>
                            </div>
                            <div className="transfer-arrow">
                                <span className="material-icons-outlined">arrow_forward</span>
                            </div>
                            <div className="account-info to">
                                <span className="label-xs">{t('to', 'إلى')}:</span>
                                <span className="name">{item.to_account?.name}</span>
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
            header: t('counterparty', 'الطرف المقابل'), 
            key: 'counterparty_account_id',
            render: (item) => {
                if (item.type === 'transfer') return <span className="text-muted">-</span>;
                return accountsMap.get(item.counterparty_account_id) || '-';
            }
        },
        { 
            header: t('amount', 'المبلغ'), 
            key: 'amount',
            width: '150px',
            render: (item) => <span style={{ fontWeight: '700' }}>{formatAmount(item.amount)}</span>
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
            <div className="stat-card"> 
                <div className="stat-content"> 
                    <div className="stat-value">{formatAmount(receipts.reduce((sum, r) => sum + Number(r.amount), 0))}</div> 
                    <div className="stat-label">{t('total_receipts', 'إجمالي المقبوضات')}</div> 
                </div> 
                <div className="stat-icon" style={{ backgroundColor: 'var(--success-color)' }}> 
                    <span className="material-icons-outlined">trending_up</span>
                </div> 
            </div> 
            <div className="stat-card"> 
                <div className="stat-content"> 
                    <div className="stat-value">{formatAmount(payments.reduce((sum, p) => sum + Number(p.amount), 0))}</div> 
                    <div className="stat-label">{t('total_payments', 'إجمالي المدفوعات')}</div> 
                </div> 
                <div className="stat-icon" style={{ backgroundColor: 'var(--danger-color)' }}> 
                    <span className="material-icons-outlined">trending_down</span>
                </div> 
            </div> 
            <div className="stat-card"> 
                <div className="stat-content"> 
                    <div className="stat-value">{formatAmount(transfers.reduce((sum, t) => sum + Number(t.amount), 0))}</div> 
                    <div className="stat-label">{t('total_transfers', 'إجمالي التحويلات')}</div> 
                </div> 
                <div className="stat-icon" style={{ backgroundColor: 'var(--primary-color)' }}> 
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
        <div className="fade-in data-section" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="card-header">
                <h3>{isEditing ? t('edit_bank_transaction', 'تعديل حركة بنكية') : t('create_bank_transaction', 'إنشاء حركة بنكية')}</h3>
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
                                className={`type-option ${data.type === 'receipt' ? 'active' : ''}`} 
                                onClick={() => setData('type', 'receipt')}
                            >
                                <span className="material-icons-outlined">add_circle_outline</span>
                                {t('bank_receipt', 'قبض بنكي')}
                            </div>
                            <div 
                                className={`type-option ${data.type === 'payment' ? 'active' : ''}`} 
                                onClick={() => setData('type', 'payment')}
                            >
                                <span className="material-icons-outlined">remove_circle_outline</span>
                                {t('bank_payment', 'صرف بنكي')}
                            </div>
                            <div 
                                className={`type-option ${data.type === 'transfer' ? 'active' : ''}`} 
                                onClick={() => setData('type', 'transfer')}
                            >
                                <span className="material-icons-outlined">swap_horiz</span>
                                {t('transfer', 'تحويل')}
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label required">{t('date', 'التاريخ')}</label>
                        <input type="date" className="form-control" value={data.date} onChange={(e) => setData('date', e.target.value)} required />
                        {errors.date && <div className="error-message">{errors.date}</div>}
                    </div>

                    {!isTransfer ? (
                        <>
                            <div className="form-group">
                                <label className="form-label required">{t('bank_account', 'الحساب البنكي')}</label>
                                <select className="form-control" value={data.bank_account_id} onChange={(e) => setData('bank_account_id', e.target.value)} required>
                                    <option value="">{t('select_bank_account', 'اختر الحساب البنكي')}</option>
                                    {bankAccounts.map((account) => (
                                        <option key={account.id} value={account.id}>
                                            {account.bank_name} - {account.account_name} ({account.account_number})
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
                    ) : (
                        <>
                            <div className="form-group">
                                <label className="form-label required">{t('from_account', 'من حساب')}</label>
                                <select className="form-control" value={data.from_account_id} onChange={(e) => setData('from_account_id', e.target.value)} required>
                                    <option value="">{t('select_source_account', 'اختر حساب المصدر')}</option>
                                    {bankAccounts.map((account) => (
                                        <option key={account.id} value={account.id}>
                                            {account.bank_name} - {account.account_name} ({account.account_number})
                                        </option>
                                    ))}
                                </select>
                                {errors.from_account_id && <div className="error-message">{errors.from_account_id}</div>}
                            </div>

                            <div className="form-group">
                                <label className="form-label required">{t('to_account', 'إلى حساب')}</label>
                                <select className="form-control" value={data.to_account_id} onChange={(e) => setData('to_account_id', e.target.value)} required>
                                    <option value="">{t('select_destination_account', 'اختر حساب الوجهة')}</option>
                                    {bankAccounts.filter(acc => String(acc.id) !== String(data.from_account_id)).map((account) => (
                                        <option key={account.id} value={account.id}>
                                            {account.bank_name} - {account.account_name} ({account.account_number})
                                        </option>
                                    ))}
                                </select>
                                {errors.to_account_id && <div className="error-message">{errors.to_account_id}</div>}
                            </div>
                        </>
                    )}

                    <div className="form-group">
                        <label className="form-label required">{t('amount', 'المبلغ')}</label>
                        <input type="number" step="0.01" className="form-control" placeholder="0.00" value={data.amount} onChange={(e) => setData('amount', e.target.value)} required />
                        {errors.amount && <div className="error-message">{errors.amount}</div>}
                    </div>

                    <div className="form-group">
                        <label className="form-label">{t('status', 'الحالة')}</label>
                        <select className="form-control" value={data.status} onChange={(e) => setData('status', e.target.value)} required>
                            <option value="posted">{t('posted', 'مرحل')}</option>
                            <option value="draft">{t('draft', 'مسودة')}</option>
                            <option value="cancelled">{t('cancelled', 'ملغي')}</option>
                        </select>
                    </div>

                    {!isTransfer && (
                        <div className="form-group">
                            <label className="form-label">{t('reference', 'المرجع')}</label>
                            <input type="text" className="form-control" value={data.reference} onChange={(e) => setData('reference', e.target.value)} placeholder={t('enter_reference', 'أدخل رقم المرجع')} />
                        </div>
                    )}

                    <div className="form-group full-width">
                        <label className="form-label">{t('notes', 'ملاحظات')}</label>
                        <textarea className="form-control" value={data.notes} onChange={(e) => setData('notes', e.target.value)} rows="3" placeholder={t('add_notes', 'أضف أي ملاحظات إضافية هنا...')} />
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
        <div className="fade-in data-section" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="card-header">
                <h3>{t('transaction_details', 'تفاصيل العملية')}</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
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
                <div className="details-grid">
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
                    <div className="detail-item">
                        <span className="detail-label">{t('amount', 'المبلغ')}</span>
                        <span className="detail-value" style={{ color: 'var(--primary-color)', fontSize: '1.2rem' }}>{formatAmount(viewingTransaction?.amount)}</span>
                    </div>
                    
                    {!isTransfer ? (
                        <>
                            <div className="detail-item full-width">
                                <span className="detail-label">{t('bank_account', 'الحساب البنكي')}</span>
                                <span className="detail-value">{viewingTransaction?.bank_account?.bank_name} - {viewingTransaction?.bank_account?.account_name}</span>
                            </div>
                            <div className="detail-item full-width">
                                <span className="detail-label">{t('counterparty_account', 'الحساب المقابل')}</span>
                                <span className="detail-value">{accountsMap.get(viewingTransaction?.counterparty_account_id) || '-'}</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="detail-item full-width">
                                <div className="transfer-details-box">
                                    <div className="transfer-side from">
                                        <span className="side-label">{t('from_account', 'من حساب')}</span>
                                        <span className="side-value">{viewingTransaction?.from_account?.name}</span>
                                        <span className="side-code">{viewingTransaction?.from_account?.code}</span>
                                    </div>
                                    <div className="transfer-icon-box">
                                        <span className="material-icons-outlined">swap_horiz</span>
                                    </div>
                                    <div className="transfer-side to">
                                        <span className="side-label">{t('to_account', 'إلى حساب')}</span>
                                        <span className="side-value">{viewingTransaction?.to_account?.name}</span>
                                        <span className="side-code">{viewingTransaction?.to_account?.code}</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="detail-item">
                        <span className="detail-label">{t('status', 'الحالة')}</span>
                        <span className={`status-badge status-${viewingTransaction?.status}`}>{t(viewingTransaction?.status, viewingTransaction?.status)}</span>
                    </div>
                    {viewingTransaction?.reference && !isTransfer && (
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
            ...payments.map(p => ({ ...p, type: 'payment', label: t('payment', 'صرف بنكي') })),
            ...receipts.map(r => ({ ...r, type: 'receipt', label: t('receipt', 'قبض بنكي') })),
            ...transfers.map(tr => ({ ...tr, type: 'transfer', label: t('transfer', 'تحويل') }))
        ];
        return all.sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [payments, receipts, transfers]);

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
                item.from_account?.name?.toLowerCase().includes(term) ||
                item.to_account?.name?.toLowerCase().includes(term);
            return matchesTab && matchesSearch;
        });
    }, [transactions, activeTab, searchTerm]);

    const populateFormFromTransaction = (item) => {
        setData({
            id: item.id ?? null,
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

