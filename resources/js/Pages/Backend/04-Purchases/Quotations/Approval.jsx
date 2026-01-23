import React from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '../../components/AdminLayout';

const Approval = () => {
  return (
    <AdminLayout activeMenu="Purchase Management">
      <Head title="Quotation Approval" />
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Quotation Approval</h1>
        <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-500">Pending Approvals List Placeholder</p>
            {/* Logic for approving quotations would go here */}
        </div>
      </div>
    </AdminLayout>
  );
};
export default Approval;
