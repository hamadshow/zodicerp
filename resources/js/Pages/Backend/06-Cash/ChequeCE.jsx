import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AdminLayout from '@/Pages/Backend/components/AdminLayout';
import '../../../../css/backend/ChequeCE.scss';

const ChequeCE = ({ cheque, accounts }) => {
    const isEditing = !!cheque;

    const { data, setData, post, put, processing, errors } = useForm({
        cheque_no: cheque?.cheque_no || '',
        bank_name: cheque?.bank_name || '',
        account_id: cheque?.account_id || '',
        owner_name: cheque?.owner_name || '',
        cheque_type: cheque?.cheque_type || 'received',
        amount: cheque?.amount || '',
        issue_date: cheque?.issue_date || new Date().toISOString().split('T')[0],
        due_date: cheque?.due_date || '',
        status: cheque?.status || 'pending',
        reference_no: cheque?.reference_no || '',
        notes: cheque?.notes || '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isEditing) {
            put(route('admin.cheques.update', cheque.id));
        } else {
            post(route('admin.cheques.store'));
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    };

    const formatAmount = (amount) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(Number(amount || 0));
    };

    return (
        <>
            <Head>
                <title>
                    {isEditing ? `Edit Cheque #${cheque.cheque_no}` : 'Create New Cheque'}
                </title>
                <link
                    href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined"
                    rel="stylesheet"
                />
            </Head>
            <AdminLayout>
                <div className="cheque-ce-container">
                    <div className="ce-header">
                    <div className="ce-title">
                        {isEditing ? (
                            <>
                                <span className="text-blue-600">Edit Cheque</span>
                                <span className="text-slate-400 text-lg">#{cheque.cheque_no}</span>
                            </>
                        ) : (
                            <span>Create New Cheque</span>
                        )}
                    </div>
                    <Link href={route('admin.cheques.index')} className="back-btn">
                        <span className="material-icons-outlined">arrow_back</span> Back to List
                    </Link>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-card">
                        <div className="form-section-title">Cheque Information</div>
                        
                        <div className="form-grid">
                            <div className="input-group full-width">
                                <label className="input-label">Cheque Type <span className="required">*</span></label>
                                <div className="type-selector">
                                    <div 
                                        className={`type-option ${data.cheque_type === 'received' ? 'active' : ''}`}
                                        onClick={() => setData('cheque_type', 'received')}
                                    >
                                        Receivable (Received)
                                    </div>
                                    <div 
                                        className={`type-option ${data.cheque_type === 'issued' ? 'active' : ''}`}
                                        onClick={() => setData('cheque_type', 'issued')}
                                    >
                                        Payable (Issued)
                                    </div>
                                </div>
                                {errors.cheque_type && <div className="error-message">{errors.cheque_type}</div>}
                            </div>

                            <div className="input-group">
                                <label className="input-label">Cheque Number <span className="required">*</span></label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    value={data.cheque_no}
                                    onChange={e => setData('cheque_no', e.target.value)}
                                    placeholder="Enter cheque number"
                                />
                                {errors.cheque_no && <div className="error-message">{errors.cheque_no}</div>}
                            </div>

                            <div className="input-group">
                                <label className="input-label">Amount <span className="required">*</span></label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    className="form-input" 
                                    value={data.amount}
                                    onChange={e => setData('amount', e.target.value)}
                                    placeholder="0.00"
                                />
                                {errors.amount && <div className="error-message">{errors.amount}</div>}
                            </div>

                            <div className="input-group">
                                <label className="input-label">Bank Name <span className="required">*</span></label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    value={data.bank_name}
                                    onChange={e => setData('bank_name', e.target.value)}
                                    placeholder="e.g. Bank of America"
                                />
                                {errors.bank_name && <div className="error-message">{errors.bank_name}</div>}
                            </div>

                            <div className="input-group">
                                <label className="input-label">{data.cheque_type === 'in' ? 'Drawer Name' : 'Payee Name'} <span className="required">*</span></label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    value={data.owner_name}
                                    onChange={e => setData('owner_name', e.target.value)}
                                    placeholder="Enter name"
                                />
                                {errors.owner_name && <div className="error-message">{errors.owner_name}</div>}
                            </div>

                            <div className="input-group">
                                <label className="input-label">Issue Date <span className="required">*</span></label>
                                <input 
                                    type="date" 
                                    className="form-input" 
                                    value={data.issue_date}
                                    onChange={e => setData('issue_date', e.target.value)}
                                />
                                {errors.issue_date && <div className="error-message">{errors.issue_date}</div>}
                            </div>

                            <div className="input-group">
                                <label className="input-label">Due Date</label>
                                <input 
                                    type="date" 
                                    className="form-input" 
                                    value={data.due_date}
                                    onChange={e => setData('due_date', e.target.value)}
                                />
                                {errors.due_date && <div className="error-message">{errors.due_date}</div>}
                            </div>

                            <div className="input-group">
                                <label className="input-label">Status <span className="required">*</span></label>
                                <select 
                                    className="form-select" 
                                    value={data.status}
                                    onChange={e => setData('status', e.target.value)}
                                >
                                    <option value="pending">Pending</option>
                                    <option value="collected">Collected</option>
                                    <option value="bounced">Bounced</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                                {errors.status && <div className="error-message">{errors.status}</div>}
                            </div>

                            <div className="input-group">
                                <label className="input-label">Linked Account</label>
                                <select 
                                    className="form-select" 
                                    value={data.account_id}
                                    onChange={e => setData('account_id', e.target.value)}
                                >
                                    <option value="">-- Select Account (Optional) --</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.name} ({acc.account_code})
                                        </option>
                                    ))}
                                </select>
                                {errors.account_id && <div className="error-message">{errors.account_id}</div>}
                            </div>

                            <div className="input-group">
                                <label className="input-label">Reference No</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    value={data.reference_no}
                                    onChange={e => setData('reference_no', e.target.value)}
                                    placeholder="Optional reference"
                                />
                                {errors.reference_no && <div className="error-message">{errors.reference_no}</div>}
                            </div>

                            <div className="input-group full-width">
                                <label className="input-label">Notes</label>
                                <textarea 
                                    className="form-textarea" 
                                    rows="3"
                                    value={data.notes}
                                    onChange={e => setData('notes', e.target.value)}
                                    placeholder="Add any additional notes here..."
                                ></textarea>
                                {errors.notes && <div className="error-message">{errors.notes}</div>}
                            </div>
                        </div>

                        <div className="form-actions">
                            <Link href={route('admin.cheques.index')} className="btn-cancel">
                                Cancel
                            </Link>
                            <button type="submit" className="btn-submit" disabled={processing}>
                                <div className="flex items-center gap-2">
                                    <span className="material-icons-outlined">save</span>
                                    {processing ? 'Saving...' : (isEditing ? 'Update Cheque' : 'Save Cheque')}
                                </div>
                            </button>
                        </div>
                    </div>
                </form>

                {isEditing && cheque.transactions && cheque.transactions.length > 0 && (
                    <div className="history-section">
                        <div className="flex items-center gap-2 mb-4 text-slate-700 font-bold text-lg">
                            <span className="material-icons-outlined">history</span> Transaction History
                        </div>
                        <div className="timeline">
                            {cheque.transactions.map((transaction, index) => (
                                <div key={transaction.id || index} className="timeline-item">
                                    <div className="timeline-dot"></div>
                                    <div className="timeline-content">
                                        <div className="timeline-header">
                                            <div className="timeline-action">
                                                {transaction.action.replace('_', ' ')}
                                            </div>
                                            <div className="timeline-date">
                                                {formatDate(transaction.created_at || transaction.action_date)}
                                            </div>
                                        </div>
                                        {transaction.notes && (
                                            <div className="timeline-notes">
                                                {transaction.notes}
                                            </div>
                                        )}
                                        <div className="timeline-meta">
                                            <span>Amount: {formatAmount(transaction.amount)}</span>
                                            {transaction.creator && (
                                                <span>• By: {transaction.creator.name}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                </div>
            </AdminLayout>
        </>
    );
};

export default ChequeCE;
