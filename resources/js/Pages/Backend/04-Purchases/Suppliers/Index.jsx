import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '../../components/AdminLayout';
import '../../../../../css/backend/04-Purchases/style.css';

const Index = ({ suppliers, groups, filters, stats }) => {
    const safeFilters = filters || {};
    const [searchTerm, setSearchTerm] = useState(safeFilters.search || '');
    const [selectedGroup, setSelectedGroup] = useState(safeFilters.group || '');
    const [selectedStatus, setSelectedStatus] = useState(safeFilters.status || '');
    const [selectedIds, setSelectedIds] = useState([]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm !== (safeFilters.search || '')) {
                applyFilters({ search: searchTerm });
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    const applyFilters = (newFilters) => {
        router.get(
            route('admin.purchases.suppliers.index'),
            { ...safeFilters, ...newFilters, page: 1 },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const handleGroupChange = (e) => {
        const group = e.target.value;
        setSelectedGroup(group);
        applyFilters({ group });
    };

    const handleStatusChange = (status) => {
        setSelectedStatus(status);
        applyFilters({ status: status === 'all' ? '' : status });
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this supplier?')) {
            router.delete(route('admin.purchases.suppliers.destroy', id));
        }
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;
        if (confirm(`Are you sure you want to delete ${selectedIds.length} suppliers?`)) {
            // Implement bulk delete route if available, or loop (not ideal)
            // For now, just alert or log
            console.log('Bulk delete not implemented yet', selectedIds);
            alert('Bulk delete functionality to be implemented');
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(suppliers.data.map(s => s.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(sid => sid !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'SAR', // Assuming SAR, change as needed
            minimumFractionDigits: 2
        }).format(amount || 0);
    };

    return (
        <AdminLayout activeMenu="Suppliers & AP">
            <Head title="Suppliers Management" />
            
            <div className="dashboard-container">
                <div className="content">
                    {/* Stats Cards */}
                    <div className="stats-cards">
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                                <span className="material-icons-outlined">people</span>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stats?.total || 0}</div>
                                <div className="stat-label">Total Suppliers</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                                <span className="material-icons-outlined">check_circle</span>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stats?.active || 0}</div>
                                <div className="stat-label">Active Suppliers</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                                <span className="material-icons-outlined">block</span>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stats?.inactive || 0}</div>
                                <div className="stat-label">Inactive Suppliers</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                                <span className="material-icons-outlined">account_balance_wallet</span>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{formatCurrency(stats?.total_balance)}</div>
                                <div className="stat-label">Total Balance</div>
                            </div>
                        </div>
                    </div>

                    {/* Filters & Actions */}
                    <div className="bg-white rounded-lg shadow mb-6 p-4">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                                {/* Search */}
                                <div className="relative">
                                    <span className="material-icons-outlined absolute left-3 top-2.5 text-gray-400 text-sm">search</span>
                                    <input
                                        type="text"
                                        placeholder="Search suppliers..."
                                        className="border rounded-lg pl-10 pr-3 py-2 w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                {/* Group Filter */}
                                <select
                                    className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={selectedGroup}
                                    onChange={handleGroupChange}
                                >
                                    <option value="">All Groups</option>
                                    {groups.map(group => (
                                        <option key={group.id} value={group.id}>{group.name_en}</option>
                                    ))}
                                </select>

                                {/* Status Filter */}
                                <select
                                    className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={selectedStatus}
                                    onChange={(e) => handleStatusChange(e.target.value)}
                                >
                                    <option value="">All Statuses</option>
                                    <option value="1">Active</option>
                                    <option value="0">Inactive</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <Link
                                    href={route('admin.purchases.suppliers.create')}
                                    className="btn btn-primary"
                                >
                                    <span className="material-icons-outlined">add</span>
                                    Add Supplier
                                </Link>
                                <button className="btn btn-outline" title="Export to Excel">
                                    <span className="material-icons-outlined">file_download</span>
                                </button>
                                {selectedIds.length > 0 && (
                                    <button 
                                        onClick={handleBulkDelete}
                                        className="btn btn-danger"
                                    >
                                        <span className="material-icons-outlined">delete</span>
                                        Delete ({selectedIds.length})
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th className="w-4">
                                            <input 
                                                type="checkbox" 
                                                onChange={handleSelectAll}
                                                checked={suppliers.data.length > 0 && selectedIds.length === suppliers.data.length}
                                            />
                                        </th>
                                        <th>Code</th>
                                        <th>Supplier Name</th>
                                        <th>Group</th>
                                        <th>Contact Info</th>
                                        <th>Balance</th>
                                        <th>Credit Limit</th>
                                        <th>Status</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {suppliers.data.length > 0 ? (
                                        suppliers.data.map((supplier) => (
                                            <tr key={supplier.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <input 
                                                        type="checkbox"
                                                        checked={selectedIds.includes(supplier.id)}
                                                        onChange={() => handleSelectOne(supplier.id)}
                                                    />
                                                </td>
                                                <td className="font-medium text-gray-900">{supplier.supplier_code}</td>
                                                <td>
                                                    <div className="font-medium text-gray-900">{supplier.name_en}</div>
                                                    {supplier.name_ar && <div className="text-xs text-gray-500">{supplier.name_ar}</div>}
                                                </td>
                                                <td>
                                                    {supplier.group ? (
                                                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                                            {supplier.group.name_en}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td>
                                                    <div className="text-sm">{supplier.primary_phone || '-'}</div>
                                                    <div className="text-xs text-gray-500">{supplier.email || '-'}</div>
                                                </td>
                                                <td className="font-medium">
                                                    {formatCurrency(supplier.current_balance)}
                                                </td>
                                                <td className="text-gray-600">
                                                    {formatCurrency(supplier.credit_limit)}
                                                </td>
                                                <td>
                                                    <span className={`status-badge ${supplier.is_active ? 'status-active' : 'status-inactive'}`}>
                                                        {supplier.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Link
                                                            href={route('admin.purchases.suppliers.edit', supplier.id)}
                                                            className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded"
                                                            title="Edit"
                                                        >
                                                            <span className="material-icons-outlined text-base">edit</span>
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDelete(supplier.id)}
                                                            className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"
                                                            title="Delete"
                                                        >
                                                            <span className="material-icons-outlined text-base">delete</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="9" className="text-center py-8 text-gray-500">
                                                No suppliers found matching your criteria.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {suppliers.links && suppliers.links.length > 3 && (
                            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <div className="text-sm text-gray-600">
                                        Showing <span className="font-medium">{suppliers.from || 0}</span> to <span className="font-medium">{suppliers.to || 0}</span> of <span className="font-medium">{suppliers.total}</span> results
                                    </div>
                                    <div className="flex gap-1">
                                        {suppliers.links.map((link, key) => (
                                            <Link
                                                key={key}
                                                href={link.url || '#'}
                                                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                                    link.active
                                                        ? 'bg-blue-600 text-white'
                                                        : !link.url
                                                            ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                                                            : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-300'
                                                }`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default Index;