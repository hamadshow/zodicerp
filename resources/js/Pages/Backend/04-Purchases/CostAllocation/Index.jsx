import React from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '../../components/AdminLayout';

const Index = () => {
  return (
    <AdminLayout activeMenu="Costing & Expenses">
      <Head title="Cost Allocation" />
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Cost Allocation</h1>
        <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-500">Cost Allocation Tools Placeholder</p>
        </div>
      </div>
    </AdminLayout>
  );
};
export default Index;
