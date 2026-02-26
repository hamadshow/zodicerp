import React from 'react';
import AdminLayout from './components/AdminLayout';
import { Head } from '@inertiajs/react';

const ComingSoon = ({ title = 'Coming Soon' }) => {
  return (
    <AdminLayout>
      <Head title={title} />
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-lg w-full">
          <div className="mb-6">
            <span className="material-icons text-6xl text-blue-500 animate-pulse">
              engineering
            </span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
            {title}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg mb-8">
            This module is currently under development. check back later!
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-4">
            <div className="bg-blue-600 h-2.5 rounded-full w-[45%]"></div>
          </div>
          <p className="text-sm text-gray-500">Progress: 45%</p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ComingSoon;
