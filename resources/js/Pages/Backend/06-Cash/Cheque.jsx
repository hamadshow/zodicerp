import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/Pages/Backend/components/AdminLayout';
import '../../../../css/backend/main.scss';


const Cheque = ({ cheques, filters, stats }) => {
    const safeFilters = filters || {};
    const [searchTerm, setSearchTerm] = useState(safeFilters.search || '');
    const [activeTab, setActiveTab] = useState(safeFilters.status || 'all');

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm !== (safeFilters.search || '')) {
                router.get(
                    route('admin.cheques.index'),
                    { ...safeFilters, search: searchTerm, page: 1 },
                    { preserveState: true, preserveScroll: true, replace: true }
                );
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleTabChange = (status) => {
        setActiveTab(status);
        const newFilters = { ...safeFilters, status: status === 'all' ? null : status, page: 1 };
        Object.keys(newFilters).forEach(key => newFilters[key] === null && delete newFilters[key]);
        
        router.get(route('admin.cheques.index'), newFilters, {
            preserveState: true,
            preserveScroll: true
        });
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this cheque?')) {
            router.delete(route('admin.cheques.destroy', id));
        }
    };

    const formatAmount = (amount) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(Number(amount || 0));
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString();
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'pending': return 'status-badge pending';
            case 'collected': return 'status-badge collected';
            case 'bounced': return 'status-badge bounced';
            case 'cancelled': return 'status-badge cancelled';
            default: return 'status-badge';
        }
    };

    const getTypeBadgeClass = (type) => {
        return type === 'received' ? 'type-badge received' : 'type-badge issued';
    };

    return (
        <>
            <Head>
                <title>Cheque Management</title>
                <link
                    href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined"
                    rel="stylesheet"
                />
            </Head>
            <AdminLayout>
                <div className="dashboard-container">
                    <div className="content">
                        <div className="stats-cards">
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                                <span className="material-icons-outlined">payments</span>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stats.total}</div>
                                <div className="stat-label">Total Cheques</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                                <span className="material-icons-outlined">schedule</span>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stats.pending}</div>
                                <div className="stat-label">Pending</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                                <span className="material-icons-outlined">check_circle</span>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stats.collected}</div>
                                <div className="stat-label">Collected</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                                <span className="material-icons-outlined">error</span>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stats.bounced}</div>
                                <div className="stat-label">Bounced</div>
                            </div>
                        </div>
                    </div>

                    <div className="filter-tabs">
                        <div
                            className={`filter-tab ${activeTab === 'all' ? 'active' : ''}`}
                            onClick={() => handleTabChange('all')}
                        >
                            All Cheques
                        </div>
                        <div
                            className={`filter-tab ${activeTab === 'pending' ? 'active' : ''}`}
                            onClick={() => handleTabChange('pending')}
                        >
                            Pending
                        </div>
                        <div
                            className={`filter-tab ${activeTab === 'collected' ? 'active' : ''}`}
                            onClick={() => handleTabChange('collected')}
                        >
                            Collected
                        </div>
                        <div
                            className={`filter-tab ${activeTab === 'bounced' ? 'active' : ''}`}
                            onClick={() => handleTabChange('bounced')}
                        >
                            Bounced
                        </div>
                        <div
                            className={`filter-tab ${activeTab === 'cancelled' ? 'active' : ''}`}
                            onClick={() => handleTabChange('cancelled')}
                        >
                            Cancelled
                        </div>
                    </div>

                    <div className="cheques-card">
                        <div className="card-header">
                            <div className="search-box">
                                <div className="input-icon-wrapper">
                                    <span className="material-icons-outlined search-icon">search</span>
                                    <input 
                                        type="text" 
                                        placeholder="Search cheques..." 
                                        className="search-input"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="cheques-actions">
                                <Link href={route('admin.cheques.create')} className="btn btn-primary">
                                    <span className="material-icons-outlined">add</span> Add New Cheque
                                </Link>
                            </div>
                        </div>

                        <div className="table-responsive">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Cheque No</th>
                                        <th>Bank / Owner</th>
                                        <th>Type</th>
                                        <th>Amount</th>
                                        <th>Issue Date</th>
                                        <th>Due Date</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cheques.data.length > 0 ? (
                                        cheques.data.map((cheque) => (
                                            <tr key={cheque.id}>
                                                <td>
                                                    <span className="font-medium text-slate-700">{cheque.cheque_no}</span>
                                                    {cheque.reference_no && (
                                                        <div className="text-xs text-slate-500">Ref: {cheque.reference_no}</div>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="font-medium">{cheque.bank_name}</div>
                                                    <div className="text-sm text-slate-500">{cheque.owner_name}</div>
                                                </td>
                                                <td>
                                                    <span className={getTypeBadgeClass(cheque.cheque_type)}>
                                                        {cheque.cheque_type === 'received' ? 'Receivable' : 'Payable'}
                                                    </span>
                                                </td>
                                                <td className="font-bold text-slate-700">
                                                    {formatAmount(cheque.amount)}
                                                </td>
                                                <td>{formatDate(cheque.issue_date)}</td>
                                                <td>
                                                    <span className={cheque.due_date && new Date(cheque.due_date) < new Date() && cheque.status === 'pending' ? 'text-red-600 font-medium' : ''}>
                                                        {formatDate(cheque.due_date)}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={getStatusBadgeClass(cheque.status)}>
                                                        {cheque.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="actions-group">
                                                        <Link 
                                                            href={route('admin.cheques.edit', cheque.id)} 
                                                            className="action-btn edit"
                                                            title="Edit"
                                                        >
                                                            <span className="material-icons-outlined">edit</span>
                                                        </Link>
                                                        <button 
                                                            onClick={() => handleDelete(cheque.id)} 
                                                            className="action-btn delete"
                                                            title="Delete"
                                                        >
                                                            <span className="material-icons-outlined">delete</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="8" className="text-center py-8 text-slate-500">
                                                No cheques found matching your criteria.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        {cheques.links && cheques.links.length > 3 && (
                            <div className="pagination-container p-4 border-t border-slate-100">
                                <div className="flex justify-center gap-1">
                                    {cheques.links.map((link, key) => (
                                        <Link
                                            key={key}
                                            href={link.url}
                                            className={`px-3 py-1 rounded text-sm ${
                                                link.active 
                                                    ? 'bg-blue-600 text-white' 
                                                    : link.url 
                                                        ? 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200' 
                                                        : 'text-slate-400 cursor-not-allowed'
                                            }`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    </div>
                </div>
            </AdminLayout>
        </>
    );
};

export default Cheque;
