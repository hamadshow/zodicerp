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
            pending: { class: 'bg-amber-100 text-amber-700', icon: Clock, label: t('TreasuryTransfer.statuses.pending') },
            approved: { class: 'bg-blue-100 text-blue-700', icon: CheckCircle2, label: t('TreasuryTransfer.statuses.approved') },
            completed: { class: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2, label: t('TreasuryTransfer.statuses.completed') },
            rejected: { class: 'bg-rose-100 text-rose-700', icon: XCircle, label: t('TreasuryTransfer.statuses.rejected') }
        };
        const s = statuses[status] || statuses.pending;
        const Icon = s.icon;
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.class}`}>
                <Icon size={12} />
                {s.label}
            </span>
        );
    };

    return (
        <AdminLayout activeMenu="Treasury">
            <Head title={`${t('TreasuryTransfer.title')} - ZodicERP`} />

            <div className="p-6 treasury-transfer">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                            <ArrowLeftRight className="text-primary" size={28} />
                            {t('TreasuryTransfer.title')}
                        </h1>
                        <p className="text-slate-500 mt-1">{t('TreasuryTransfer.subtitle')}</p>
                    </div>

                    {flash?.success && (
                        <div className="flex-1 max-w-md mx-4 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-lg flex items-center gap-2 animate-in slide-in-from-top-2">
                            <CheckCircle2 size={18} />
                            <span className="text-sm font-medium">{flash.success}</span>
                        </div>
                    )}

                    {flash?.error && (
                        <div className="flex-1 max-w-md mx-4 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2 rounded-lg flex items-center gap-2 animate-in slide-in-from-top-2">
                            <AlertCircle size={18} />
                            <span className="text-sm font-medium">{flash.error}</span>
                        </div>
                    )}

                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-primary/90 transition-all shadow-sm"
                    >
                        <Plus size={20} />
                        {t('TreasuryTransfer.new_transfer')}
                    </button>
                </div>

                {/* Filters & Search */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text"
                            placeholder={t('TreasuryTransfer.reference_number')}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Filter className="text-slate-400" size={18} />
                        <select 
                            className="flex-1 md:w-48 py-2 px-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20"
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
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left rtl:text-right">
                        <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">{t('TreasuryTransfer.reference_number')}</th>
                                <th className="px-6 py-4">{t('TreasuryTransfer.date')}</th>
                                <th className="px-6 py-4">{t('TreasuryTransfer.from_treasury')}</th>
                                <th className="px-6 py-4">{t('TreasuryTransfer.to_treasury')}</th>
                                <th className="px-6 py-4">{t('TreasuryTransfer.amount')}</th>
                                <th className="px-6 py-4">{t('TreasuryTransfer.status')}</th>
                                <th className="px-6 py-4 text-center">{t('TreasuryTransfer.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {transfers.data.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <FileText size={48} strokeWidth={1} />
                                            <p>{t('TreasuryTransfer.no_data') || 'No transfers found'}</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : transfers.data.map((transfer) => (
                                <tr key={transfer.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-6 py-4 font-mono font-bold text-primary">{transfer.reference_number}</td>
                                    <td className="px-6 py-4 text-slate-600">{transfer.transfer_date}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-semibold">{transfer.from_treasury.name}</span>
                                            <span className="text-xs text-slate-400">{transfer.from_treasury.account_code}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-semibold">{transfer.to_treasury.name}</span>
                                            <span className="text-xs text-slate-400">{transfer.to_treasury.account_code}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-900">
                                        {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(transfer.amount)} {transfer.currency}
                                    </td>
                                    <td className="px-6 py-4">{getStatusBadge(transfer.status)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <button 
                                            onClick={() => {
                                                setSelectedTransfer(transfer);
                                                setIsDetailsModalOpen(true);
                                            }}
                                            className="p-2 text-slate-400 hover:text-primary transition-colors"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Create Modal */}
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <Plus className="text-primary" />
                                    {t('TreasuryTransfer.new_transfer')}
                                </h3>
                                <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <XCircle size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleCreateSubmit} className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">{t('TreasuryTransfer.from_treasury')}</label>
                                        <select 
                                            className={`w-full p-2.5 rounded-lg border ${errors.from_treasury_id ? 'border-rose-500' : 'border-slate-200'} focus:ring-2 focus:ring-primary/20`}
                                            value={data.from_treasury_id}
                                            onChange={(e) => setData('from_treasury_id', e.target.value)}
                                        >
                                            <option value="">{t('TreasuryTransfer.select_treasury') || 'Select Treasury'}</option>
                                            {cashAccounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.name} ({acc.current_balance} EGP)</option>
                                            ))}
                                        </select>
                                        {errors.from_treasury_id && <p className="text-rose-500 text-xs mt-1">{errors.from_treasury_id}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">{t('TreasuryTransfer.to_treasury')}</label>
                                        <select 
                                            className={`w-full p-2.5 rounded-lg border ${errors.to_treasury_id ? 'border-rose-500' : 'border-slate-200'} focus:ring-2 focus:ring-primary/20`}
                                            value={data.to_treasury_id}
                                            onChange={(e) => setData('to_treasury_id', e.target.value)}
                                        >
                                            <option value="">{t('TreasuryTransfer.select_treasury') || 'Select Treasury'}</option>
                                            {cashAccounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                                            ))}
                                        </select>
                                        {errors.to_treasury_id && <p className="text-rose-500 text-xs mt-1">{errors.to_treasury_id}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">{t('TreasuryTransfer.amount')}</label>
                                        <div className="relative">
                                            <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input 
                                                type="number" step="0.01"
                                                className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${errors.amount ? 'border-rose-500' : 'border-slate-200'} focus:ring-2 focus:ring-primary/20`}
                                                value={data.amount}
                                                onChange={(e) => setData('amount', e.target.value)}
                                            />
                                        </div>
                                        {errors.amount && <p className="text-rose-500 text-xs mt-1">{errors.amount}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">{t('TreasuryTransfer.date')}</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input 
                                                type="date"
                                                className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${errors.transfer_date ? 'border-rose-500' : 'border-slate-200'} focus:ring-2 focus:ring-primary/20`}
                                                value={data.transfer_date}
                                                onChange={(e) => setData('transfer_date', e.target.value)}
                                            />
                                        </div>
                                        {errors.transfer_date && <p className="text-rose-500 text-xs mt-1">{errors.transfer_date}</p>}
                                    </div>
                                </div>
                                <div className="mb-6">
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">{t('TreasuryTransfer.notes')}</label>
                                    <textarea 
                                        className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20"
                                        rows="3"
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                    ></textarea>
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsCreateModalOpen(false)}
                                        className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
                                    >
                                        {t('cancel') || 'Cancel'}
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={processing}
                                        className="px-8 py-2.5 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="text-xl font-bold text-slate-900">{t('TreasuryTransfer.details')}</h3>
                                <button onClick={() => setIsDetailsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <XCircle size={24} />
                                </button>
                            </div>
                            <div className="p-6">
                                <div className="flex flex-col gap-4">
                                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                        <span className="text-slate-500">{t('TreasuryTransfer.reference_number')}</span>
                                        <span className="font-mono font-bold text-primary">{selectedTransfer.reference_number}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 border border-slate-100 rounded-lg">
                                            <span className="text-xs text-slate-400 block mb-1">{t('TreasuryTransfer.from_treasury')}</span>
                                            <span className="font-semibold">{selectedTransfer.from_treasury.name}</span>
                                        </div>
                                        <div className="p-3 border border-slate-100 rounded-lg">
                                            <span className="text-xs text-slate-400 block mb-1">{t('TreasuryTransfer.to_treasury')}</span>
                                            <span className="font-semibold">{selectedTransfer.to_treasury.name}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500">{t('TreasuryTransfer.amount')}</span>
                                        <span className="text-2xl font-black text-slate-900">
                                            {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(selectedTransfer.amount)} {selectedTransfer.currency}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500">{t('TreasuryTransfer.date')}</span>
                                        <span className="font-semibold">{selectedTransfer.transfer_date}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500">{t('TreasuryTransfer.status')}</span>
                                        {getStatusBadge(selectedTransfer.status)}
                                    </div>
                                    {selectedTransfer.notes && (
                                        <div className="p-3 bg-slate-50 rounded-lg">
                                            <span className="text-xs text-slate-400 block mb-1">{t('TreasuryTransfer.notes')}</span>
                                            <p className="text-sm text-slate-700">{selectedTransfer.notes}</p>
                                        </div>
                                    )}
                                    {selectedTransfer.status === 'rejected' && (
                                        <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg">
                                            <span className="text-xs text-rose-400 block mb-1">{t('TreasuryTransfer.rejection_reason')}</span>
                                            <p className="text-sm text-rose-700">{selectedTransfer.rejection_reason}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                {(selectedTransfer.status === 'pending' || selectedTransfer.status === 'approved') && (
                                    <div className="mt-8 flex gap-3">
                                        <button 
                                            onClick={() => setIsRejectModalOpen(true)}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-rose-200 text-rose-600 font-semibold hover:bg-rose-50 transition-colors"
                                        >
                                            <XCircle size={18} />
                                            {t('TreasuryTransfer.reject')}
                                        </button>
                                        <button 
                                            onClick={() => handleApprove(selectedTransfer.id)}
                                            className="flex-2 flex items-center justify-center gap-2 px-8 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-200"
                                        >
                                            <CheckCircle2 size={18} />
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
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95">
                            <div className="p-6 border-b border-slate-100">
                                <h3 className="text-lg font-bold text-slate-900">{t('TreasuryTransfer.rejection_reason')}</h3>
                            </div>
                            <form onSubmit={handleReject} className="p-6">
                                <textarea 
                                    required
                                    className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 mb-6"
                                    rows="4"
                                    placeholder={t('TreasuryTransfer.enter_rejection_reason') || 'Enter reason for rejection...'}
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                ></textarea>
                                <div className="flex justify-end gap-3">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsRejectModalOpen(false)}
                                        className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600"
                                    >
                                        {t('cancel') || 'Cancel'}
                                    </button>
                                    <button 
                                        type="submit"
                                        className="px-6 py-2 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700"
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
