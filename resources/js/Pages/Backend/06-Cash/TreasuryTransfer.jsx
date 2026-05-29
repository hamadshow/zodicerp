import React, { useState, useEffect, useMemo } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import AdminLayout from '@/Pages/Backend/components/AdminLayout';
import { 
    ArrowLeftRight, Plus, Search, Filter, Eye, CheckCircle2, 
    XCircle, Clock, Calendar, Wallet, FileText, X, AlertCircle, Loader2,
    ArrowLeft, Save, Trash2, Edit
} from 'lucide-react';
import { format } from 'date-fns';
import '../../../../css/backend/main.scss';
import SearchableComboBox from '../components/SearchableComboBox';

const TreasuryTransfer = ({ transfers, filters, cashAccounts }) => {
    const { props } = usePage();
    const { localization, flash, errors: pageErrors = {} } = props;
    const translations = localization?.translations || {};
    const t = (key, fallback) => translations[key] || fallback;

    const getLocalizedRoute = (name, params = {}) => {
        return route(name, {
            country: localization?.country_code || 'sa',
            lang: localization?.current_locale || 'ar',
            ...params
        });
    };

    // --- State Management ---
    const [mode, setMode] = useState('list'); // 'list', 'create', 'view'
    const [selectedTransfer, setSelectedTransfer] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isRejecting, setIsRejecting] = useState(false);
    
    // Filter State
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');

    // --- Form Handling ---
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        from_treasury_id: '',
        to_treasury_id: '',
        amount: '',
        transfer_date: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
        currency: 'EGP'
    });

    const allErrors = { ...pageErrors, ...errors };

    const selectedFromAccount = useMemo(() => {
        return (cashAccounts || []).find(acc => String(acc.id) === String(data.from_treasury_id));
    }, [cashAccounts, data.from_treasury_id]);

    const accountOptions = useMemo(() => {
        return (cashAccounts || []).map(acc => ({
            value: String(acc.id),
            label: `${acc.bank_name || ''} - ${acc.account_name} (${acc.account_number})`.replace(/^ - /, '')
        }));
    }, [cashAccounts]);

    // --- Effects ---
    useEffect(() => {
        if (flash?.success || flash?.error) {
            const timer = setTimeout(() => {
                router.reload({ only: ['flash'] });
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [flash]);

    // --- Handlers ---
    const handleCreate = () => {
        reset();
        clearErrors();
        setMode('create');
    };

    const handleBackToList = () => {
        setMode('list');
        setSelectedTransfer(null);
        reset();
        clearErrors();
    };

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(getLocalizedRoute('admin.treasury-transfers.index'), {
            search: searchQuery,
            status: statusFilter
        }, { preserveState: true, preserveScroll: true });
    };

    const handleCreateSubmit = (e) => {
        e.preventDefault();
        if (mode === 'edit') {
            router.put(getLocalizedRoute('admin.treasury-transfers.update', { id: selectedTransfer.id }), data, {
                onSuccess: () => {
                    setMode('list');
                    reset();
                    setSelectedTransfer(null);
                },
                preserveScroll: true
            });
        } else {
            post(getLocalizedRoute('admin.treasury-transfers.store'), {
                onSuccess: () => {
                    setMode('list');
                    reset();
                },
                preserveScroll: true
            });
        }
    };

    const handleViewDetails = (transfer) => {
        setSelectedTransfer(transfer);
        setMode('view');
    };

    const handleEdit = (transfer) => {
        if (transfer.status !== 'pending') {
            alert(t('TreasuryTransfer.errors.cannot_edit_completed_transfer', 'Only pending transfers can be edited.'));
            return;
        }
        setSelectedTransfer(transfer);
        setData({
            from_treasury_id: transfer.from_treasury.id,
            to_treasury_id: transfer.to_treasury.id,
            amount: transfer.amount,
            transfer_date: transfer.transfer_date,
            notes: transfer.notes || '',
            currency: transfer.currency
        });
        setMode('edit');
    };

    const handleApprove = (id) => {
        if (!window.confirm(t('common.confirm_approve', 'Are you sure you want to approve this transfer?'))) return;
        
        router.post(getLocalizedRoute('admin.treasury-transfers.approve', { id }), {}, {
            onSuccess: () => {
                setMode('list');
                setSelectedTransfer(null);
            },
            preserveScroll: true
        });
    };

    const handleRejectSubmit = (e) => {
        e.preventDefault();
        if (!rejectionReason.trim()) return;

        router.post(getLocalizedRoute('admin.treasury-transfers.reject', { id: selectedTransfer.id }), {
            reason: rejectionReason
        }, {
            onSuccess: () => {
                setIsRejecting(false);
                setMode('list');
                setSelectedTransfer(null);
                setRejectionReason('');
            },
            preserveScroll: true
        });
    };

    // --- UI Helpers ---
    const getStatusBadge = (status) => {
        const statuses = {
            pending: { label: t('TreasuryTransfer.statuses.pending', 'Pending'), class: 'status-pending' },
            approved: { label: t('TreasuryTransfer.statuses.approved', 'Approved'), class: 'status-posted' },
            completed: { label: t('TreasuryTransfer.statuses.completed', 'Completed'), class: 'status-posted' },
            rejected: { label: t('TreasuryTransfer.statuses.rejected', 'Rejected'), class: 'status-cancelled' }
        };
        const s = statuses[status] || { label: status, class: 'status-draft' };
        return <span className={`status-badge ${s.class}`}>{s.label}</span>;
    };

    return (
        <AdminLayout activeMenu="Treasury Transfer">
            <Head title={`${t('TreasuryTransfer.title', 'Treasury Transfer')} - ZodicERP`} />

            <div className="payment-voucher-module treasury-transfer-module">
                {/* Header Section */}
                <div className="payment-voucher-module__header">
                    <div className="header-title-area">
                        {mode !== 'list' && (
                            <button type="button" className="btn-back" onClick={handleBackToList}>
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <div>
                            <h1>{t('TreasuryTransfer.title', 'Treasury Transfer')}</h1>
                            <p className="header-subtitle">
                                {mode === 'create' ? t('TreasuryTransfer.new_transfer', 'Create New Transfer') : 
                                 mode === 'edit' ? t('TreasuryTransfer.edit_transfer', 'Edit Transfer') :
                                 mode === 'view' ? t('TreasuryTransfer.details', 'Transfer Details') :
                                 t('TreasuryTransfer.subtitle', 'Manage internal cash transfers between treasuries')}
                            </p>
                        </div>
                    </div>
                    {mode === 'list' && (
                        <button 
                            type="button" 
                            className="btn-add" 
                            onClick={handleCreate}
                        >
                            <Plus size={18} />
                            {t('TreasuryTransfer.new_transfer', 'New Transfer')}
                        </button>
                    )}
                </div>

                {/* Flash Messages */}
                {flash?.success && (
                    <div className="alert alert-success">
                        <CheckCircle2 size={18} />
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="alert alert-error">
                        <AlertCircle size={18} />
                        {flash.error}
                    </div>
                )}

                {/* Main Content Areas */}
                {mode === 'list' ? (
                    <>
                        {/* Filters Section */}
                        <div className="table-filters">
                            <form className="table-filters__form" onSubmit={handleSearch}>
                                <div className="search-box">
                                    <Search className="search-icon" size={18} />
                                    <input 
                                        type="text"
                                        className="form-input"
                                        placeholder={t('TreasuryTransfer.search_placeholder', 'Search reference...')}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                
                                <select 
                                    className="form-select"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="all">{t('TreasuryTransfer.statuses.all', 'All Statuses')}</option>
                                    <option value="pending">{t('TreasuryTransfer.statuses.pending', 'Pending')}</option>
                                    <option value="completed">{t('TreasuryTransfer.statuses.completed', 'Completed')}</option>
                                    <option value="rejected">{t('TreasuryTransfer.statuses.rejected', 'Rejected')}</option>
                                </select>

                                <button type="submit" className="btn-secondary">
                                    {t('common.search', 'Search')}
                                </button>
                            </form>
                        </div>

                        {/* Data Table */}
                        <div className="payment-voucher-module__table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>{t('TreasuryTransfer.reference_number', 'Reference')}</th>
                                        <th>{t('TreasuryTransfer.date', 'Date')}</th>
                                        <th>{t('TreasuryTransfer.from_treasury', 'From')}</th>
                                        <th>{t('TreasuryTransfer.to_treasury', 'To')}</th>
                                        <th>{t('TreasuryTransfer.amount', 'Amount')}</th>
                                        <th>{t('TreasuryTransfer.status', 'Status')}</th>
                                        <th className="actions-header">{t('TreasuryTransfer.actions', 'Actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transfers.data.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="empty-cell">
                                                <div className="empty-state">
                                                    <FileText size={48} opacity={0.5} />
                                                    <p>{t('TreasuryTransfer.no_data', 'No transfers found')}</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : transfers.data.map((transfer) => (
                                        <tr key={transfer.id}>
                                            <td className="ref-cell">{transfer.reference_number}</td>
                                            <td className="date-cell">{transfer.transfer_date}</td>
                                            <td>
                                                <div className="account-info">
                                                    <span className="account-name">{transfer.from_treasury?.name}</span>
                                                    <span className="account-code">{transfer.from_treasury?.account_code}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="account-info">
                                                    <span className="account-name">{transfer.to_treasury?.name}</span>
                                                    <span className="account-code">{transfer.to_treasury?.account_code}</span>
                                                </div>
                                            </td>
                                            <td className="amount-cell">
                                                {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(transfer.amount)} 
                                                <span className="currency">{transfer.currency}</span>
                                            </td>
                                            <td>{getStatusBadge(transfer.status)}</td>
                                            <td className="actions">
                                                <button 
                                                    type="button"
                                                    onClick={() => handleViewDetails(transfer)}
                                                    className="view"
                                                    title={t('common.view', 'View')}
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                {transfer.status === 'pending' && (
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleEdit(transfer)}
                                                        className="edit"
                                                        title={t('common.edit', 'Edit')}
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (mode === 'create' || mode === 'edit') ? (
                    <div className="payment-voucher-module__form-container">
                        <form onSubmit={handleCreateSubmit}>
                            <div className="form-section">
                                <h3 className="section-title">
                                    {mode === 'edit' ? t('TreasuryTransfer.edit_transfer_info', 'Edit Transfer Information') : t('TreasuryTransfer.transfer_info', 'Transfer Information')}
                                </h3>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>{t('TreasuryTransfer.from_treasury', 'From Treasury')}</label>
                                            <SearchableComboBox 
                                                options={accountOptions}
                                                value={data.from_treasury_id}
                                                onChange={(val) => setData('from_treasury_id', val)}
                                                placeholder={t('TreasuryTransfer.select_treasury', 'Select Treasury')}
                                                disabled={processing}
                                            />
                                        {selectedFromAccount && (
                                            <div className="account-balance-info mt-1">
                                                <span className="text-sm text-gray-500">
                                                    {t('TreasuryTransfer.current_balance', 'Current Balance')}: 
                                                    <span className={`font-semibold ml-1 ${selectedFromAccount.balance < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                                        {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(selectedFromAccount.balance)} {selectedFromAccount.currency}
                                                    </span>
                                                </span>
                                            </div>
                                        )}
                                        {allErrors.from_treasury_id && <div className="error-msg">{allErrors.from_treasury_id}</div>}
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>{t('TreasuryTransfer.to_treasury', 'To Treasury')}</label>
                                            <SearchableComboBox 
                                                options={accountOptions}
                                                value={data.to_treasury_id}
                                                onChange={(val) => setData('to_treasury_id', val)}
                                                placeholder={t('TreasuryTransfer.select_treasury', 'Select Treasury')}
                                                disabled={processing}
                                            />
                                        {allErrors.to_treasury_id && <div className="error-msg">{allErrors.to_treasury_id}</div>}
                                    </div>

                                    <div className="form-group">
                                        <label>{t('TreasuryTransfer.amount', 'Amount')}</label>
                                        <div className="input-with-icon">
                                            <input 
                                                type="number" step="0.01"
                                                className={`form-input ${allErrors.amount ? 'error' : ''}`}
                                                value={data.amount}
                                                onChange={(e) => setData('amount', e.target.value)}
                                                required
                                            />
                                            <Wallet size={16} className="input-icon" />
                                        </div>
                                        {selectedFromAccount && data.amount > selectedFromAccount.balance && (
                                            <div className="warning-msg flex items-center gap-1 mt-1 text-orange-500 text-sm">
                                                <AlertCircle size={14} />
                                                {t('TreasuryTransfer.errors.insufficient_balance_warning', 'Warning: Amount exceeds available balance.')}
                                            </div>
                                        )}
                                        {allErrors.amount && <div className="error-msg">{allErrors.amount}</div>}
                                    </div>

                                    <div className="form-group">
                                        <label>{t('TreasuryTransfer.date', 'Date')}</label>
                                        <input 
                                            type="date"
                                            className={`form-input ${allErrors.transfer_date ? 'error' : ''}`}
                                            value={data.transfer_date}
                                            onChange={(e) => setData('transfer_date', e.target.value)}
                                            required
                                        />
                                        {allErrors.transfer_date && <div className="error-msg">{allErrors.transfer_date}</div>}
                                    </div>

                                    <div className="form-group full-width">
                                        <label>{t('TreasuryTransfer.notes', 'Notes')}</label>
                                        <textarea 
                                            rows="4"
                                            className="form-input"
                                            value={data.notes}
                                            onChange={(e) => setData('notes', e.target.value)}
                                            placeholder={t('TreasuryTransfer.notes_placeholder', 'Enter any additional notes here...')}
                                        ></textarea>
                                    </div>
                                </div>
                            </div>

                            <div className="form-actions">
                                <button type="button" onClick={handleBackToList} className="btn-cancel">
                                    {t('common.cancel', 'Cancel')}
                                </button>
                                <button type="submit" disabled={processing} className="btn-submit">
                                    {processing ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                    {processing ? t('common.saving', 'Saving...') : t('common.save', 'Save Transfer')}
                                </button>
                            </div>
                        </form>
                    </div>
                ) : mode === 'view' && selectedTransfer && (
                    <div className="payment-voucher-module__details-container">
                        <div className="details-card-main">
                            <div className="details-header">
                                <div className="ref-info">
                                    <span className="label">{t('TreasuryTransfer.reference_number', 'Reference Number')}</span>
                                    <h2 className="ref-value">{selectedTransfer.reference_number}</h2>
                                </div>
                                <div className="status-info">
                                    {getStatusBadge(selectedTransfer.status)}
                                </div>
                            </div>

                            <div className="details-grid-main">
                                <div className="info-block">
                                    <div className="block-item">
                                        <span className="label">{t('TreasuryTransfer.from_treasury', 'From Treasury')}</span>
                                        <span className="value">{selectedTransfer.from_treasury?.name}</span>
                                        <span className="sub-value">{selectedTransfer.from_treasury?.account_code}</span>
                                    </div>
                                    <div className="block-item">
                                        <span className="label">{t('TreasuryTransfer.to_treasury', 'To Treasury')}</span>
                                        <span className="value">{selectedTransfer.to_treasury?.name}</span>
                                        <span className="sub-value">{selectedTransfer.to_treasury?.account_code}</span>
                                    </div>
                                </div>

                                <div className="info-block highlighted">
                                    <div className="block-item amount">
                                        <span className="label">{t('TreasuryTransfer.amount', 'Amount')}</span>
                                        <span className="value">
                                            {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(selectedTransfer.amount)} 
                                            <span className="currency">{selectedTransfer.currency}</span>
                                        </span>
                                    </div>
                                    <div className="block-item">
                                        <span className="label">{t('TreasuryTransfer.date', 'Date')}</span>
                                        <span className="value">{selectedTransfer.transfer_date}</span>
                                    </div>
                                </div>
                            </div>

                            {selectedTransfer.notes && (
                                <div className="details-notes">
                                    <span className="label">{t('TreasuryTransfer.notes', 'Notes')}</span>
                                    <p className="notes-text">{selectedTransfer.notes}</p>
                                </div>
                            )}

                            {selectedTransfer.status === 'rejected' && (
                                <div className="details-rejection">
                                    <span className="label">{t('TreasuryTransfer.rejection_reason', 'Rejection Reason')}</span>
                                    <p className="rejection-text">{selectedTransfer.rejection_reason}</p>
                                </div>
                            )}

                            {isRejecting && (
                                <div className="rejection-form-area">
                                    <textarea 
                                        className="form-input"
                                        rows="3"
                                        placeholder={t('TreasuryTransfer.enter_rejection_reason', 'Enter reason for rejection...')}
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        autoFocus
                                    ></textarea>
                                    <div className="rejection-actions">
                                        <button onClick={() => setIsRejecting(false)} className="btn-cancel-sm">
                                            {t('common.cancel', 'Cancel')}
                                        </button>
                                        <button onClick={handleRejectSubmit} className="btn-danger-sm">
                                            {t('TreasuryTransfer.confirm_reject', 'Confirm Reject')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="details-actions">
                                <div className="left-actions">
                                    {selectedTransfer.status === 'pending' && !isRejecting && (
                                        <>
                                            <button 
                                                onClick={() => setIsRejecting(true)}
                                                className="btn-danger-outline"
                                            >
                                                <XCircle size={18} />
                                                {t('TreasuryTransfer.reject', 'Reject')}
                                            </button>
                                            <button 
                                                onClick={() => handleApprove(selectedTransfer.id)}
                                                className="btn-success"
                                            >
                                                <CheckCircle2 size={18} />
                                                {t('TreasuryTransfer.approve', 'Approve')}
                                            </button>
                                        </>
                                    )}
                                </div>
                                <button type="button" onClick={handleBackToList} className="btn-secondary">
                                    {t('common.back_to_list', 'Back to List')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default TreasuryTransfer;
