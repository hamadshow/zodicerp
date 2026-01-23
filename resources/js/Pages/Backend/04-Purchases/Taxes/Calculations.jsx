import React from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '../../components/AdminLayout';

const Calculations = () => {
  return (
    <AdminLayout activeMenu="Discounts & Taxes">
      <Head title="Tax Calculations" />
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Tax Calculations</h1>
        <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-500">Tax Calculation Tools Placeholder</p>
        </div>
      </div>
    </AdminLayout>
  );
};
export default Calculations;
