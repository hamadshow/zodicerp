import React, { useState } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import AdminLayout from '@/Pages/Backend/components/AdminLayout';
import { 
    ArrowLeftRight, Plus, Search, Filter, Eye, CheckCircle2, 
    XCircle, Clock, Calendar, Wallet, FileText, AlertCircle,
    ChevronRight, MoreHorizontal
} from 'lucide-react';
import { format } from 'date-fns';

const TreasuryTransfer = ({ transfers, filters, cashAccounts }) => {
    const { props } = usePage();
    const { localization, flash } = props;
    const translations = localization?.translations || {};
    const t = (key, fallback) => translations[key] || fallback;

    const getLocalizedRoute = (name, params = {}) => {
        return route(name, {
            country: localization?.country_code || 'eg',
            lang: localization?.current_locale || 'en',
            ...params
        });
    };

    // Auto-dismiss Flash Messages
    React.useEffect(() => {
        if (flash?.success || flash?.error) {
            const timer = setTimeout(() => {
                router.reload({ only: ['flash'] });
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [flash]);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedTransfer, setSelectedTransfer] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

    // Filter State
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');

    const { data, setData, post, processing, errors, reset } = useForm({
        from_treasury_id: '',
        to_treasury_id: '',
        amount: '',
        transfer_date: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
        currency: 'EGP'
    });

    const handleCreateSubmit = (e) => {
        e.preventDefault();
        post(getLocalizedRoute('admin.treasury-transfers.store'), {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                reset();
            },
        });
    };

    const handleApprove = (id) => {
        router.post(getLocalizedRoute('admin.treasury-transfers.approve', { id }), {
            onSuccess: () => {
                setIsDetailsModalOpen(false);
            },
        });
    };

    const handleReject = (e) => {
        e.preventDefault();
        router.post(getLocalizedRoute('admin.treasury-transfers.reject', { id: selectedTransfer.id }), {
            reason: rejectionReason
        }, {
            onSuccess: () => {
                setIsRejectModalOpen(false);
                setIsDetailsModalOpen(false);
                setRejectionReason('');
            },
        });
    };

    const getStatusBadge = (status) => {
        const statuses = {
            pending: { icon: Clock, label: t('TreasuryTransfer.statuses.pending') },
            approved: { icon: CheckCircle2, label: t('TreasuryTransfer.statuses.approved') },
            completed: { icon: CheckCircle2, label: t('TreasuryTransfer.statuses.completed') },
            rejected: { icon: XCircle, label: t('TreasuryTransfer.statuses.rejected') }
        };
        const s = statuses[status] || statuses.pending;
        const Icon = s.icon;
        return (
            <span className={`status-badge ${status}`}>
                <Icon size={12} />
                {s.label}
            </span>
        );
    };

    return (
        <AdminLayout activeMenu="Treasury">
            <Head title={`${t('TreasuryTransfer.title')} - ZodicERP`} />

            <div className="treasury-transfer">
                {/* Header */}
                <div className="header">
                    <div className="title-wrapper">
                        <h1>
                            <ArrowLeftRight size={28} />
                            {t('TreasuryTransfer.title')}
                        </h1>
                        <p>{t('TreasuryTransfer.subtitle')}</p>
                    </div>

                    <div className="actions">
                        {flash?.success && (
                            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-200 animate-in slide-in-from-top-2">
                                <CheckCircle2 size={18} />
                                <span className="text-sm font-medium">{flash.success}</span>
                            </div>
                        )}
                        <button 
                            onClick={() => setIsCreateModalOpen(true)}
                            className="btn-new-transfer"
                        >
                            <Plus size={20} />
                            {t('TreasuryTransfer.new_transfer')}
                        </button>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="filters-bar">
                    <div className="search-box">
                        <Search size={18} />
                        <input 
                            type="text"
                            placeholder={t('TreasuryTransfer.reference_number')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="filter-actions">
                        <Filter className="text-slate-400" size={18} />
                        <select 
                            className="status-select"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">{t('TreasuryTransfer.statuses.all') || 'All Statuses'}</option>
                            <option value="pending">{t('TreasuryTransfer.statuses.pending')}</option>
                            <option value="completed">{t('TreasuryTransfer.statuses.completed')}</option>
                            <option value="rejected">{t('TreasuryTransfer.statuses.rejected')}</option>
                        </select>
                    </div>
                </div>

                {/* Data Table */}
                <div className="data-table-container">
                    <div className="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>{t('TreasuryTransfer.reference_number')}</th>
                                    <th>{t('TreasuryTransfer.date')}</th>
                                    <th>{t('TreasuryTransfer.from_treasury')}</th>
                                    <th>{t('TreasuryTransfer.to_treasury')}</th>
                                    <th>{t('TreasuryTransfer.amount')}</th>
                                    <th>{t('TreasuryTransfer.status')}</th>
                                    <th className="text-center">{t('TreasuryTransfer.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transfers.data.length === 0 ? (
                                    <tr>
                                        <td colSpan="7">
                                            <div className="empty-state">
                                                <FileText size={48} strokeWidth={1} className="icon mx-auto" />
                                                <p>{t('TreasuryTransfer.no_data') || 'No transfers found'}</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : transfers.data.map((transfer) => (
                                    <tr key={transfer.id}>
                                        <td><span className="ref-number">{transfer.reference_number}</span></td>
                                        <td>{transfer.transfer_date}</td>
                                        <td>
                                            <div className="treasury-info">
                                                <span className="name">{transfer.from_treasury.name}</span>
                                                <span className="code">{transfer.from_treasury.account_code}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="treasury-info">
                                                <span className="name">{transfer.to_treasury.name}</span>
                                                <span className="code">{transfer.to_treasury.account_code}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="amount">
                                                {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(transfer.amount)} {transfer.currency}
                                            </span>
                                        </td>
                                        <td>{getStatusBadge(transfer.status)}</td>
                                        <td className="text-center">
                                            <button 
                                                onClick={() => {
                                                    setSelectedTransfer(transfer);
                                                    setIsDetailsModalOpen(true);
                                                }}
                                                className="btn-view"
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Create Modal */}
                {isCreateModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content modal-lg">
                            <div className="modal-header">
                                <h3>
                                    <Plus />
                                    {t('TreasuryTransfer.new_transfer')}
                                </h3>
                                <button onClick={() => setIsCreateModalOpen(false)} className="btn-close">
                                    <XCircle size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleCreateSubmit}>
                                <div className="modal-body">
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label>{t('TreasuryTransfer.from_treasury')}</label>
                                            <div className="input-wrapper">
                                                <select 
                                                    className={errors.from_treasury_id ? 'border-rose-500' : ''}
                                                    value={data.from_treasury_id}
                                                    onChange={(e) => setData('from_treasury_id', e.target.value)}
                                                >
                                                    <option value="">{t('TreasuryTransfer.select_treasury') || 'Select Treasury'}</option>
                                                    {cashAccounts.map(acc => (
                                                        <option key={acc.id} value={acc.id}>{acc.name} ({acc.current_balance} EGP)</option>
                                                    ))}
                                                </select>
                                            </div>
                                            {errors.from_treasury_id && <p className="error-msg">{errors.from_treasury_id}</p>}
                                        </div>
                                        <div className="form-group">
                                            <label>{t('TreasuryTransfer.to_treasury')}</label>
                                            <div className="input-wrapper">
                                                <select 
                                                    className={errors.to_treasury_id ? 'border-rose-500' : ''}
                                                    value={data.to_treasury_id}
                                                    onChange={(e) => setData('to_treasury_id', e.target.value)}
                                                >
                                                    <option value="">{t('TreasuryTransfer.select_treasury') || 'Select Treasury'}</option>
                                                    {cashAccounts.map(acc => (
                                                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            {errors.to_treasury_id && <p className="error-msg">{errors.to_treasury_id}</p>}
                                        </div>
                                        <div className="form-group">
                                            <label>{t('TreasuryTransfer.amount')}</label>
                                            <div className="input-wrapper">
                                                <Wallet className="has-icon" size={18} />
                                                <input 
                                                    type="number" step="0.01"
                                                    className={`has-icon ${errors.amount ? 'border-rose-500' : ''}`}
                                                    value={data.amount}
                                                    onChange={(e) => setData('amount', e.target.value)}
                                                />
                                            </div>
                                            {errors.amount && <p className="error-msg">{errors.amount}</p>}
                                        </div>
                                        <div className="form-group">
                                            <label>{t('TreasuryTransfer.date')}</label>
                                            <div className="input-wrapper">
                                                <Calendar className="has-icon" size={18} />
                                                <input 
                                                    type="date"
                                                    className={`has-icon ${errors.transfer_date ? 'border-rose-500' : ''}`}
                                                    value={data.transfer_date}
                                                    onChange={(e) => setData('transfer_date', e.target.value)}
                                                />
                                            </div>
                                            {errors.transfer_date && <p className="error-msg">{errors.transfer_date}</p>}
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>{t('TreasuryTransfer.notes')}</label>
                                        <div className="input-wrapper">
                                            <textarea 
                                                rows="3"
                                                value={data.notes}
                                                onChange={(e) => setData('notes', e.target.value)}
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsCreateModalOpen(false)}
                                        className="btn btn-cancel"
                                    >
                                        {t('cancel') || 'Cancel'}
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={processing}
                                        className="btn btn-submit"
                                    >
                                        {processing ? t('saving') || 'Saving...' : t('TreasuryTransfer.new_transfer')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Details Modal */}
                {isDetailsModalOpen && selectedTransfer && (
                    <div className="modal-overlay">
                        <div className="modal-content modal-sm">
                            <div className="modal-header">
                                <h3>{t('TreasuryTransfer.details')}</h3>
                                <button onClick={() => setIsDetailsModalOpen(false)} className="btn-close">
                                    <XCircle size={24} />
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="details-list">
                                    <div className="detail-item">
                                        <span className="label">{t('TreasuryTransfer.reference_number')}</span>
                                        <span className="value ref">{selectedTransfer.reference_number}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="detail-item flex-col items-start gap-1">
                                            <span className="label">{t('TreasuryTransfer.from_treasury')}</span>
                                            <span className="value">{selectedTransfer.from_treasury.name}</span>
                                        </div>
                                        <div className="detail-item flex-col items-start gap-1">
                                            <span className="label">{t('TreasuryTransfer.to_treasury')}</span>
                                            <span className="value">{selectedTransfer.to_treasury.name}</span>
                                        </div>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">{t('TreasuryTransfer.amount')}</span>
                                        <span className="value amount text-primary">
                                            {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(selectedTransfer.amount)} {selectedTransfer.currency}
                                        </span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">{t('TreasuryTransfer.date')}</span>
                                        <span className="value">{selectedTransfer.transfer_date}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">{t('TreasuryTransfer.status')}</span>
                                        {getStatusBadge(selectedTransfer.status)}
                                    </div>
                                    {selectedTransfer.notes && (
                                        <div className="notes-box">
                                            <span className="label">{t('TreasuryTransfer.notes')}</span>
                                            <p>{selectedTransfer.notes}</p>
                                        </div>
                                    )}
                                    {selectedTransfer.status === 'rejected' && (
                                        <div className="reason-box">
                                            <span className="label">{t('TreasuryTransfer.rejection_reason')}</span>
                                            <p>{selectedTransfer.rejection_reason}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                {(selectedTransfer.status === 'pending' || selectedTransfer.status === 'approved') && (
                                    <div className="mt-8 flex gap-3">
                                        <button 
                                            onClick={() => setIsRejectModalOpen(true)}
                                            className="btn btn-cancel border-rose-200 text-rose-600 hover:bg-rose-50 flex-1"
                                        >
                                            <XCircle size={18} className="inline mr-2" />
                                            {t('TreasuryTransfer.reject')}
                                        </button>
                                        <button 
                                            onClick={() => handleApprove(selectedTransfer.id)}
                                            className="btn btn-submit bg-emerald-600 hover:bg-emerald-700 flex-2"
                                        >
                                            <CheckCircle2 size={18} className="inline mr-2" />
                                            {t('TreasuryTransfer.approve')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Reject Reason Modal */}
                {isRejectModalOpen && (
                    <div className="modal-overlay" style={{ zIndex: 70 }}>
                        <div className="modal-content modal-sm">
                            <div className="modal-header">
                                <h3 className="text-danger">{t('TreasuryTransfer.rejection_reason')}</h3>
                            </div>
                            <form onSubmit={handleReject}>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <textarea 
                                            required
                                            className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                                            rows="4"
                                            placeholder={t('TreasuryTransfer.enter_rejection_reason') || 'Enter reason for rejection...'}
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                        ></textarea>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsRejectModalOpen(false)}
                                        className="btn btn-cancel"
                                    >
                                        {t('cancel') || 'Cancel'}
                                    </button>
                                    <button 
                                        type="submit"
                                        className="btn btn-submit bg-rose-600 hover:bg-rose-700"
                                    >
                                        {t('TreasuryTransfer.reject')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default TreasuryTransfer;
