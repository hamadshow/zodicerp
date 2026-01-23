import React, { useEffect, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '../../components/AdminLayout';
import '../../../../../css/backend/04-Purchases/style.scss';

const Index = ({ quotations, filters, stats }) => {
    const safeFilters = filters || {};
    const [searchTerm, setSearchTerm] = useState(safeFilters.search || '');
    const [status, setStatus] = useState(safeFilters.status || '');
    const [dateFrom, setDateFrom] = useState(safeFilters.date_from || '');
    const [dateTo, setDateTo] = useState(safeFilters.date_to || '');

    useEffect(() => {
        const timer = setTimeout(() => {
            router.get(
                route('admin.purchases.quotations.index'),
                {
                    search: searchTerm || undefined,
                    status: status || undefined,
                    date_from: dateFrom || undefined,
                    date_to: dateTo || undefined,
                },
                { preserveState: true, preserveScroll: true, replace: true }
            );
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm, status, dateFrom, dateTo]);

    const resetFilters = () => {
        setSearchTerm('');
        setStatus('');
        setDateFrom('');
        setDateTo('');
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this quotation?')) {
            router.delete(route('admin.purchases.quotations.destroy', id));
        }
    };

    const data = quotations?.data || [];

    return (
        <AdminLayout activeMenu="Purchase Management">
            <Head title="Purchase Quotations" />
            <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Purchase Quotations</h1>
                        <p className="text-sm text-gray-500">Manage supplier quotations and approvals</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('admin.purchases.quotations.create')}
                            className="btn btn-primary"
                        >
                            <span className="material-icons-outlined text-sm">add</span>
                            New Quotation
                        </Link>
                        <Link
                            href={route('admin.purchases.quotations.approval')}
                            className="btn btn-outline"
                        >
                            <span className="material-icons-outlined text-sm">fact_check</span>
                            Approvals
                        </Link>
                    </div>
                </div>

                <div className="stats-cards">
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                            <span className="material-icons-outlined">description</span>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{stats?.total || 0}</div>
                            <div className="stat-label">Total Quotations</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                            <span className="material-icons-outlined">edit_note</span>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{stats?.draft || 0}</div>
                            <div className="stat-label">Draft</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                            <span className="material-icons-outlined">verified</span>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{stats?.approved || 0}</div>
                            <div className="stat-label">Approved</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>
                            <span className="material-icons-outlined">payments</span>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{Number(stats?.total_amount || 0).toLocaleString()}</div>
                            <div className="stat-label">Total Amount</div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-4 border-b border-gray-200">
                        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                            <div className="relative w-full lg:w-64">
                                <span className="material-icons-outlined absolute left-3 top-2.5 text-gray-400 text-sm">search</span>
                                <input
                                    type="text"
                                    placeholder="Search quotation or supplier..."
                                    className="border rounded pl-10 pr-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Status</label>
                                    <select
                                        className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                    >
                                        <option value="">All</option>
                                        <option value="draft">Draft</option>
                                        <option value="sent">Sent</option>
                                        <option value="under_review">Under Review</option>
                                        <option value="approved">Approved</option>
                                        <option value="rejected">Rejected</option>
                                        <option value="expired">Expired</option>
                                        <option value="converted">Converted</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Date From</label>
                                    <input
                                        type="date"
                                        className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Date To</label>
                                    <input
                                        type="date"
                                        className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                    />
                                </div>
                            </div>
                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={resetFilters}
                            >
                                <span className="material-icons-outlined text-sm">refresh</span>
                                Reset
                            </button>
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Quotation #</th>
                                    <th>Date</th>
                                    <th>Supplier</th>
                                    <th>Status</th>
                                    <th>Total</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.length > 0 ? (
                                    data.map((quotation) => (
                                        <tr key={quotation.id}>
                                            <td>{quotation.quotation_number}</td>
                                            <td>{quotation.quotation_date}</td>
                                            <td>
                                                {quotation.supplier?.name_ar ||
                                                    quotation.supplier?.name_en ||
                                                    '-'}
                                            </td>
                                            <td>
                                                <span className={`status-badge status-${quotation.status}`}>
                                                    {quotation.status?.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td>{Number(quotation.total_amount || 0).toLocaleString()}</td>
                                            <td className="text-right">
                                                <Link
                                                    href={route('admin.purchases.quotations.show', quotation.id)}
                                                    className="text-blue-600 hover:text-blue-900 mr-3"
                                                    title="View"
                                                >
                                                    <span className="material-icons-outlined text-base">visibility</span>
                                                </Link>
                                                <Link
                                                    href={route('admin.purchases.quotations.edit', quotation.id)}
                                                    className="text-blue-600 hover:text-blue-900 mr-3"
                                                    title="Edit"
                                                >
                                                    <span className="material-icons-outlined text-base">edit</span>
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(quotation.id)}
                                                    className="text-red-600 hover:text-red-900"
                                                    title="Delete"
                                                >
                                                    <span className="material-icons-outlined text-base">delete</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="text-center text-sm text-gray-500 py-6">
                                            No quotations found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {quotations?.links?.length > 1 && (
                        <div className="px-6 py-4 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-600">
                                    Showing {quotations.from} to {quotations.to} of {quotations.total} results
                                </div>
                                <nav className="inline-flex rounded-md shadow-sm">
                                    {quotations.links.map((link, key) => (
                                        <Link
                                            key={key}
                                            href={link.url || '#'}
                                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                                link.active
                                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                            } ${!link.url && 'pointer-events-none opacity-50'} ${
                                                key === 0 && 'rounded-l-md'
                                            } ${key === quotations.links.length - 1 && 'rounded-r-md'}`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </nav>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};

export default Index;
