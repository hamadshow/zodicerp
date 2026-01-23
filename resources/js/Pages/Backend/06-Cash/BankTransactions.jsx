import React, { useMemo, useState, useEffect } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AdminLayout from '@/Pages/Backend/components/AdminLayout';
import '../../../../css/backend/BankTransactions.scss';

const TransactionModal = ({ isOpen, onClose, initialData, bankAccounts, accounts, isEditing }) => {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        id: initialData?.id || null,
        type: initialData?.type || 'receipt',
        code: initialData?.code || '',
        bank_account_id: initialData?.bank_account_id || '',
        counterparty_account_id: initialData?.counterparty_account_id || '',
        amount: initialData?.amount || '',
        date: initialData?.date || new Date().toISOString().split('T')[0],
        status: initialData?.status || 'posted',
        reference: initialData?.reference || '',
        notes: initialData?.notes || '',
    });

    useEffect(() => {
        if (initialData) {
            setData({
                id: initialData.id || null,
                type: initialData.type || 'receipt',
                code: initialData.code || '',
                bank_account_id: initialData.bank_account_id || '',
                counterparty_account_id: initialData.counterparty_account_id || '',
                amount: initialData.amount || '',
                date: initialData.date || new Date().toISOString().split('T')[0],
                status: initialData.status || 'posted',
                reference: initialData.reference || '',
                notes: initialData.notes || '',
            });
        } else {
            reset();
            setData({
                id: null,
                type: 'receipt',
                code: '',
                bank_account_id: '',
                counterparty_account_id: '',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                status: 'posted',
                reference: '',
                notes: '',
            });
        }
    }, [initialData, isOpen]);

    const filteredAccounts = useMemo(() => {
        return accounts.filter(account => Number(account.AccType) === 1);
    }, [accounts]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isEditing) {
            put(route('admin.bank-transactions.update', data.id), {
                onSuccess: onClose,
            });
        } else {
            post(route('admin.bank-transactions.store'), {
                onSuccess: onClose,
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay active">
            <div className="modal-card">
                <div className="ce-header">
                    <div className="ce-title">
                        {isEditing ? (
                            <>
                                <span className="text-blue-600">Edit Bank Transaction</span>
                                <span className="text-slate-400 text-lg">{data.code}</span>
                            </>
                        ) : (
                            <span>Create Bank Transaction</span>
                        )}
                    </div>
                    <button className="back-btn" type="button" onClick={onClose}>
                        <span className="material-icons-outlined">close</span> Close
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-card">
                        <div className="form-section-title">Transaction Details</div>

                        <div className="form-grid">
                            <div className="input-group full-width">
                                <label className="input-label">Transaction Type <span className="required">*</span></label>
                                <div className="type-selector">
                                    <div
                                        className={`type-option ${data.type === 'receipt' ? 'active' : ''}`}
                                        onClick={() => setData('type', 'receipt')}
                                    >
                                        Bank Receipt
                                    </div>
                                    <div
                                        className={`type-option ${data.type === 'payment' ? 'active' : ''}`}
                                        onClick={() => setData('type', 'payment')}
                                    >
                                        Bank Payment
                                    </div>
                                </div>
                                {errors.type && <div className="error-message">{errors.type}</div>}
                            </div>

                            <div className="input-group">
                                <label className="input-label">Transaction Code</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={data.code || 'Auto'}
                                    disabled
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label">Date <span className="required">*</span></label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={data.date}
                                    onChange={(e) => setData('date', e.target.value)}
                                />
                                {errors.date && <div className="error-message">{errors.date}</div>}
                            </div>

                            <div className="input-group">
                                <label className="input-label">Bank Account <span className="required">*</span></label>
                                <select
                                    className="form-select"
                                    value={data.bank_account_id}
                                    onChange={(e) => setData('bank_account_id', e.target.value)}
                                >
                                    <option value="">Select bank account</option>
                                    {bankAccounts.map((account) => (
                                        <option key={account.id} value={account.id}>
                                            {account.bank?.name} - {account.account_name} ({account.account_number})
                                        </option>
                                    ))}
                                </select>
                                {errors.bank_account_id && <div className="error-message">{errors.bank_account_id}</div>}
                            </div>

                            <div className="input-group">
                                <label className="input-label">Counterparty Account <span className="required">*</span></label>
                                <select
                                    className="form-select"
                                    value={data.counterparty_account_id}
                                    onChange={(e) => setData('counterparty_account_id', e.target.value)}
                                >
                                    <option value="">Select account</option>
                                    {filteredAccounts.map((account) => (
                                        <option key={account.AccID} value={account.AccID}>
                                            {account.AccCode} - {account.AccName}
                                        </option>
                                    ))}
                                </select>
                                {errors.counterparty_account_id && <div className="error-message">{errors.counterparty_account_id}</div>}
                            </div>

                            <div className="input-group">
                                <label className="input-label">Amount <span className="required">*</span></label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="form-input"
                                    value={data.amount}
                                    onChange={(e) => setData('amount', e.target.value)}
                                    placeholder="0.00"
                                />
                                {errors.amount && <div className="error-message">{errors.amount}</div>}
                            </div>

                            <div className="input-group">
                                <label className="input-label">Status <span className="required">*</span></label>
                                <select
                                    className="form-select"
                                    value={data.status}
                                    onChange={(e) => setData('status', e.target.value)}
                                >
                                    <option value="posted">Posted</option>
                                    <option value="draft">Draft</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                                {errors.status && <div className="error-message">{errors.status}</div>}
                            </div>

                            <div className="input-group">
                                <label className="input-label">Reference</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={data.reference}
                                    onChange={(e) => setData('reference', e.target.value)}
                                />
                                {errors.reference && <div className="error-message">{errors.reference}</div>}
                            </div>

                            <div className="input-group full-width">
                                <label className="input-label">Notes</label>
                                <textarea
                                    className="form-textarea"
                                    rows="3"
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                />
                                {errors.notes && <div className="error-message">{errors.notes}</div>}
                            </div>
                        </div>

                        <div className="form-actions">
                            <button type="button" className="btn-cancel" onClick={onClose}>
                                Cancel
                            </button>
                            <button type="submit" className="btn-submit" disabled={processing}>
                                <div className="flex items-center gap-2">
                                    <span className="material-icons-outlined">save</span>
                                    {processing ? 'Saving...' : (isEditing ? 'Update Transaction' : 'Save Transaction')}
                                </div>
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

const BankTransactions = ({ payments = [], receipts = [], bankAccounts = [], accounts = [] }) => {
    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const accountsMap = useMemo(() => {
        const map = new Map();
        accounts.forEach((acc) => {
            map.set(acc.AccID, `${acc.AccCode} - ${acc.AccName}`);
        });
        return map;
    }, [accounts]);

    const transactions = useMemo(() => {
        const all = [...payments, ...receipts].map((item) => ({
            ...item,
            label: item.type === 'payment' ? 'Payment' : 'Receipt',
        }));
        return all.sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [payments, receipts]);

    const filtered = useMemo(() => {
        return transactions.filter((item) => {
            const matchesTab =
                activeTab === 'all' ||
                (activeTab === 'payments' && item.type === 'payment') ||
                (activeTab === 'receipts' && item.type === 'receipt');
            const term = searchTerm.trim().toLowerCase();
            const matchesSearch =
                !term ||
                item.code?.toLowerCase().includes(term) ||
                item.reference?.toLowerCase().includes(term) ||
                item.bank_account?.bank_name?.toLowerCase().includes(term);
            return matchesTab && matchesSearch;
        });
    }, [transactions, activeTab, searchTerm]);

    const openCreate = () => {
        setEditing(null);
        setModalOpen(true);
    };

    const openEdit = (item) => {
        setEditing(item);
        setModalOpen(true);
    };

    const handleDelete = (item) => {
        if (confirm('Are you sure you want to delete this transaction?')) {
            router.delete(route('admin.bank-transactions.destroy', item.id), {
                data: { type: item.type },
            });
        }
    };

    const formatAmount = (amount) => {
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(Number(amount || 0));
    };

    return (
        <AdminLayout activeMenu="Bank Transactions">
            <Head title="Bank Transactions" />

            <div className="cheque-ce-container bank-transactions-page">
                <div className="ce-header">
                    <div className="ce-title">
                        <span>Bank Transactions</span>
                    </div>
                    <button className="back-btn" type="button" onClick={openCreate}>
                        <span className="material-icons-outlined">add</span> New Transaction
                    </button>
                </div>

                <div className="transactions-toolbar">
                    <div className="filter-tabs">
                        <button
                            type="button"
                            className={`filter-tab ${activeTab === 'all' ? 'active' : ''}`}
                            onClick={() => setActiveTab('all')}
                        >
                            All
                        </button>
                        <button
                            type="button"
                            className={`filter-tab ${activeTab === 'receipts' ? 'active' : ''}`}
                            onClick={() => setActiveTab('receipts')}
                        >
                            Receipts
                        </button>
                        <button
                            type="button"
                            className={`filter-tab ${activeTab === 'payments' ? 'active' : ''}`}
                            onClick={() => setActiveTab('payments')}
                        >
                            Payments
                        </button>
                    </div>
                    <div className="search-bar">
                        <span className="material-icons-outlined">search</span>
                        <input
                            type="text"
                            placeholder="Search by code, bank, reference..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="transactions-card">
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Type</th>
                                    <th>Date</th>
                                    <th>Bank Account</th>
                                    <th>Counterparty</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="text-center text-gray-500 py-6">
                                            No transactions found.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((item) => (
                                        <tr key={`${item.type}-${item.id}`}>
                                            <td>{item.code}</td>
                                            <td>
                                                <span className={`status-pill ${item.type === 'receipt' ? 'status-receipt' : 'status-payment'}`}>
                                                    {item.label}
                                                </span>
                                            </td>
                                            <td>{item.date}</td>
                                            <td>
                                                <div className="bank-info">
                                                    <div className="bank-name">{item.bank_account?.bank_name || '-'}</div>
                                                    <div className="bank-sub">{item.bank_account?.account_number || ''}</div>
                                                </div>
                                            </td>
                                            <td>{accountsMap.get(item.counterparty_account_id) || '-'}</td>
                                            <td className="amount-cell">{formatAmount(item.amount)}</td>
                                            <td>
                                                <span className={`status-pill status-${item.status}`}>{item.status}</span>
                                            </td>
                                            <td>
                                                <div className="actions-group">
                                                    <button className="icon-btn edit" onClick={() => openEdit(item)}>
                                                        <span className="material-icons-outlined">edit</span>
                                                    </button>
                                                    <button className="icon-btn delete" onClick={() => handleDelete(item)}>
                                                        <span className="material-icons-outlined">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <TransactionModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                initialData={editing}
                isEditing={!!editing}
                bankAccounts={bankAccounts}
                accounts={accounts}
            />
        </AdminLayout>
    );
};

export default BankTransactions;
