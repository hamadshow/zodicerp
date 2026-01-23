import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/BranchInfo.scss';

const BranchInfo = ({ branches }) => {
    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this branch info?')) {
            router.delete(route('admin.branches.destroy', id));
        }
    };

    return (
        <AdminLayout activeMenu="Branch Info">
            <Head title="Branch Information" />
            <div className="Essential-Data-Container">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Branch Information</h1>
                    <Link
                        href={route('admin.branches.create')}
                        className="btn btn-primary no-underline"
                    >
                        Add Branch Info
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-100 border-b border-gray-200">
                                <th className="p-4 font-semibold text-gray-600">ID</th>
                                <th className="p-4 font-semibold text-gray-600">Branch Name</th>
                                <th className="p-4 font-semibold text-gray-600">Branch Code</th>
                                <th className="p-4 font-semibold text-gray-600">Company</th>
                                <th className="p-4 font-semibold text-gray-600">Type</th>
                                <th className="p-4 font-semibold text-gray-600">Country</th>
                                <th className="p-4 font-semibold text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {branches.length > 0 ? (
                                branches.map((branch) => (
                                    <tr key={branch.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="p-4 text-gray-700">#{branch.id}</td>
                                        <td className="p-4 font-medium text-gray-800">{branch.branch_name}</td>
                                        <td className="p-4 text-gray-600">{branch.branch_code || '-'}</td>
                                        <td className="p-4 text-gray-600">{branch.company?.company_name || '-'}</td>
                                        <td className="p-4 text-gray-600 capitalize">{branch.branch_type || '-'}</td>
                                        <td className="p-4 text-gray-600 uppercase">{branch.country_data?.name || branch.country || '-'}</td>
                                        <td className="p-4">
                                            <div className="flex gap-2">
                                                <Link
                                                    href={route('admin.branches.edit', branch.id)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                                    title="Edit"
                                                >
                                                    <span className="material-icons-outlined">edit</span>
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(branch.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
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
                                    <td colSpan="7" className="p-8 text-center text-gray-500">
                                        No branch information found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
};

export default BranchInfo;
