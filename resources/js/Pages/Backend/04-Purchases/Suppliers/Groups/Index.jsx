import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '../../../components/AdminLayout';

const Index = ({ groups, filters }) => {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm !== (filters.search || '')) {
                router.get(
                    route('admin.purchases.supplier-groups.index'),
                    { search: searchTerm },
                    { preserveState: true, preserveScroll: true, replace: true }
                );
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this group?')) {
            router.delete(route('admin.purchases.supplier-groups.destroy', id));
        }
    };

    return (
        <AdminLayout activeMenu="Suppliers & AP">
            <Head title="Supplier Groups" />
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Supplier Groups</h1>
                    <Link
                        href={route('admin.purchases.supplier-groups.create')}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
                    >
                        <span className="material-icons-outlined text-sm">add</span>
                        Add Group
                    </Link>
                </div>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-4 border-b border-gray-200">
                        <div className="relative w-full md:w-64">
                            <span className="material-icons-outlined absolute left-3 top-2.5 text-gray-400 text-sm">search</span>
                            <input
                                type="text"
                                placeholder="Search groups..."
                                className="border rounded pl-10 pr-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name (EN)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name (AR)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit Limit</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {groups.data.length > 0 ? (
                                    groups.data.map((group) => (
                                        <tr key={group.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{group.code}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{group.name_en}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{group.name_ar || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{group.default_credit_limit || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${group.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {group.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <Link
                                                    href={route('admin.purchases.supplier-groups.edit', group.id)}
                                                    className="text-blue-600 hover:text-blue-900 mr-3"
                                                    title="Edit"
                                                >
                                                    <span className="material-icons-outlined text-base">edit</span>
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(group.id)}
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
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center" colSpan="6">
                                            No supplier groups found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination */}
                    {groups.links && groups.links.length > 3 && (
                        <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
                            <div className="flex-1 flex justify-between sm:hidden">
                                <Link
                                    href={groups.prev_page_url || '#'}
                                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${!groups.prev_page_url && 'pointer-events-none opacity-50'}`}
                                >
                                    Previous
                                </Link>
                                <Link
                                    href={groups.next_page_url || '#'}
                                    className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${!groups.next_page_url && 'pointer-events-none opacity-50'}`}
                                >
                                    Next
                                </Link>
                            </div>
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-700">
                                        Showing <span className="font-medium">{groups.from || 0}</span> to <span className="font-medium">{groups.to || 0}</span> of <span className="font-medium">{groups.total}</span> results
                                    </p>
                                </div>
                                <div>
                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                        {groups.links.map((link, key) => (
                                            <Link
                                                key={key}
                                                href={link.url || '#'}
                                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                                    link.active
                                                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                } ${!link.url && 'pointer-events-none opacity-50'} ${key === 0 && 'rounded-l-md'} ${key === groups.links.length - 1 && 'rounded-r-md'}`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        ))}
                                    </nav>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};

export default Index;
