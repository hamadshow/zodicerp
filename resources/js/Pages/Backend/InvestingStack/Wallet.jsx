import React, { useState, useMemo, useEffect } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import { debounce } from 'lodash';

export default function Wallet({ transactions, currencies, brokers = [], balance, filters = {} }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [typeFilter, setTypeFilter] = useState(filters.type || '');

    const { data, setData, post, put, delete: destroy, processing, reset, errors } = useForm({
        id: '',
        transaction_type: 'DEPOSIT',
        amount: '',
        currency_id: '',
        broker_id: '',
        exchange_rate: 1,
        reference_id: '',
        description: '',
        status: 'COMPLETED',
        transaction_date: new Date().toISOString().slice(0, 16),
    });

    const handleSearch = useMemo(
        () => debounce((search, type) => {
            router.get(
                route('admin.investing.wallet.index'),
                { search, type },
                { preserveState: true, replace: true }
            );
        }, 300),
        []
    );

    useEffect(() => {
        handleSearch(searchTerm, typeFilter);
    }, [searchTerm, typeFilter]);

    const openModal = (transaction = null, type = 'DEPOSIT') => {
        if (transaction) {
            setEditMode(true);
            setData({
                id: transaction.id,
                transaction_type: transaction.transaction_type,
                amount: transaction.amount,
                currency_id: transaction.currency_id || '',
                broker_id: transaction.broker_id || '',
                exchange_rate: transaction.exchange_rate,
                reference_id: transaction.reference_id || '',
                description: transaction.description || '',
                status: transaction.status,
                transaction_date: new Date(transaction.transaction_date).toISOString().slice(0, 16),
            });
        } else {
            setEditMode(false);
            reset();
            setData(prev => ({
                ...prev,
                transaction_type: type,
                transaction_date: new Date().toISOString().slice(0, 16),
            }));
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        reset();
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route('admin.investing.wallet.update', data.id), {
                onSuccess: () => closeModal(),
            });
        } else {
            post(route('admin.investing.wallet.store'), {
                onSuccess: () => closeModal(),
            });
        }
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this transaction?')) {
            destroy(route('admin.investing.wallet.destroy', id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Wallet Transactions" />

            <div className="wallet-module">
                <div className="wallet-module__header">
                    <h1>Wallet Management</h1>
                </div>

                <div className="wallet-module__balance-card">
                    <div className="balance-label">Current Balance</div>
                    <div className="balance-amount">${parseFloat(balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    <div className="balance-actions">
                        <button type="button" className="deposit" onClick={() => openModal(null, 'DEPOSIT')}>
                            <span className="material-icons-outlined">add</span> Deposit
                        </button>
                        <button type="button" className="withdraw" onClick={() => openModal(null, 'WITHDRAW')}>
                            <span className="material-icons-outlined">remove</span> Withdraw
                        </button>
                    </div>
                </div>

                <div className="wallet-module__filters">
                    <div className="search-box">
                        <span className="material-icons-outlined">search</span>
                        <input
                            type="text"
                            placeholder="Search by reference or description..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                        <option value="">All Types</option>
                        <option value="DEPOSIT">Deposits</option>
                        <option value="WITHDRAW">Withdrawals</option>
                    </select>
                </div>

                <div className="wallet-module__table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Broker</th>
                                <th>Reference</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.data.map((tx) => (
                                <tr key={tx.id}>
                                    <td>{new Date(tx.transaction_date).toLocaleString()}</td>
                                    <td>
                                        <span className={`type-badge ${tx.transaction_type.toLowerCase()}`}>
                                            {tx.transaction_type}
                                        </span>
                                    </td>
                                    <td>{tx.broker?.id ? tx.broker.id : '-'}</td>
                                    <td>{tx.reference_id || '-'}</td>
                                    <td style={{ fontWeight: '700' }}>
                                        {tx.transaction_type === 'DEPOSIT' ? '+' : '-'}${parseFloat(tx.amount).toFixed(2)}
                                    </td>
                                    <td>
                                        <span className={`status-badge ${tx.status.toLowerCase()}`}>
                                            {tx.status}
                                        </span>
                                    </td>
                                    <td className="actions">
                                        <button onClick={() => openModal(tx)}>
                                            <span className="material-icons-outlined">edit</span>
                                        </button>
                                        <button onClick={() => handleDelete(tx.id)}>
                                            <span className="material-icons-outlined">delete</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {transactions.data.length === 0 && (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#718096' }}>
                                        No transactions found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className={`modal-overlay ${isModalOpen ? 'active' : ''}`} onClick={(e) => { if (e.target.className.includes('modal-overlay')) closeModal(); }}>
                    <div className="modal-content">
                        <h2>{editMode ? 'Edit Transaction' : 'New Transaction'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Transaction Type</label>
                                <select 
                                    value={data.transaction_type} 
                                    onChange={e => setData('transaction_type', e.target.value)}
                                    disabled={editMode}
                                >
                                    <option value="DEPOSIT">Deposit</option>
                                    <option value="WITHDRAW">Withdraw</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Amount</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    value={data.amount} 
                                    onChange={e => setData('amount', e.target.value)}
                                    required
                                />
                                {errors.amount && <div className="error">{errors.amount}</div>}
                            </div>

                            <div className="form-group">
                                <label>Currency</label>
                                <select value={data.currency_id} onChange={e => setData('currency_id', e.target.value)}>
                                    <option value="">Default Currency</option>
                                    {currencies.map(c => (
                                        <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Broker</label>
                                <select value={data.broker_id} onChange={e => setData('broker_id', e.target.value)}>
                                    <option value="">Select Broker</option>
                                    {brokers.map(broker => (
                                        <option key={broker.id} value={broker.id}>
                                            {broker.id} - {broker.broker_code}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Date & Time</label>
                                <input 
                                    type="datetime-local" 
                                    value={data.transaction_date} 
                                    onChange={e => setData('transaction_date', e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Reference ID</label>
                                <input 
                                    type="text" 
                                    value={data.reference_id} 
                                    onChange={e => setData('reference_id', e.target.value)}
                                    placeholder="e.g. Bank Ref, Check #"
                                />
                            </div>

                            <div className="form-group">
                                <label>Status</label>
                                <select value={data.status} onChange={e => setData('status', e.target.value)}>
                                    <option value="PENDING">Pending</option>
                                    <option value="COMPLETED">Completed</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <textarea 
                                    value={data.description} 
                                    onChange={e => setData('description', e.target.value)}
                                    rows="3"
                                ></textarea>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn-cancel" onClick={closeModal}>Cancel</button>
                                <button type="submit" className="btn-save" disabled={processing}>
                                    {editMode ? 'Update' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
