import React from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/04-Purchases/style.scss';

const Dashboard = () => {
  return (
    <AdminLayout activeMenu="Purchase Dashboard">
      <Head>
        <title>Purchase Dashboard</title>
        <link
            href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined"
            rel="stylesheet"
        />
      </Head>
      
      <div className="dashboard-container">
        <div className="content w-full">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Purchase Dashboard</h1>
                    <p className="text-gray-500 text-sm mt-1">Overview, Financial Summary & Recent Activities</p>
                </div>
                <div className="flex gap-2">
                     <button className="btn btn-outline">
                        <span className="material-icons-outlined">download</span> Export Report
                    </button>
                    <button className="btn btn-primary">
                        <span className="material-icons-outlined">add</span> New Purchase Order
                    </button>
                </div>
            </div>

            {/* Financial Summary */}
            <div className="stats-cards">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                        <span className="material-icons-outlined">shopping_cart</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">$124,500</div>
                        <div className="stat-label">Total Purchases</div>
                        <span className="text-green-500 text-xs font-semibold flex items-center mt-1">
                            <span className="material-icons-outlined text-sm mr-1">trending_up</span>
                            +12% from last month
                        </span>
                    </div>
                </div>
                
                <div className="stat-card">
                     <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                        <span className="material-icons-outlined">pending_actions</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">15</div>
                        <div className="stat-label">Pending Orders</div>
                         <span className="text-yellow-600 text-xs font-semibold flex items-center mt-1">
                            Requires attention
                        </span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                        <span className="material-icons-outlined">account_balance_wallet</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">$45,200</div>
                        <div className="stat-label">Outstanding Payables</div>
                        <span className="text-red-500 text-xs font-semibold flex items-center mt-1">
                             Due within 30 days
                        </span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                        <span className="material-icons-outlined">groups</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">128</div>
                        <div className="stat-label">Active Suppliers</div>
                        <span className="text-blue-500 text-xs font-semibold flex items-center mt-1">
                             8 new this month
                        </span>
                    </div>
                </div>
            </div>

            {/* Recent Activities & Charts Placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activities */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                        <span className="material-icons-outlined mr-2 text-blue-600">history</span>
                        Recent Activities
                    </h2>
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((item) => (
                            <div key={item} className="flex items-start pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 flex-shrink-0 ${item % 2 === 0 ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                                    <span className="material-icons-outlined text-sm">
                                        {item % 2 === 0 ? 'shopping_bag' : 'receipt_long'}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-800">
                                        {item % 2 === 0 ? 'New Purchase Order #PO-2024-001 created' : 'Invoice #INV-992 paid successfully'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        2 hours ago • by Admin User
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                        <button className="text-blue-600 text-sm font-medium hover:text-blue-800 transition-colors">
                            View All Activity
                        </button>
                    </div>
                </div>

                {/* Quick Actions / Mini Stats */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                     <h2 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h2>
                     <div className="space-y-3">
                        <button className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200 group">
                            <div className="flex items-center">
                                <span className="material-icons-outlined text-gray-500 mr-3 group-hover:text-blue-600">person_add</span>
                                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Add New Supplier</span>
                            </div>
                            <span className="material-icons-outlined text-gray-400 text-sm">chevron_right</span>
                        </button>
                        <button className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200 group">
                            <div className="flex items-center">
                                <span className="material-icons-outlined text-gray-500 mr-3 group-hover:text-blue-600">request_quote</span>
                                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Create Quotation</span>
                            </div>
                            <span className="material-icons-outlined text-gray-400 text-sm">chevron_right</span>
                        </button>
                        <button className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200 group">
                            <div className="flex items-center">
                                <span className="material-icons-outlined text-gray-500 mr-3 group-hover:text-blue-600">inventory</span>
                                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Record Goods Receipt</span>
                            </div>
                            <span className="material-icons-outlined text-gray-400 text-sm">chevron_right</span>
                        </button>
                     </div>

                     <div className="mt-8">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">Pending Approvals</h2>
                        <div className="space-y-3">
                             <div className="flex items-center justify-between p-3 rounded-lg border border-yellow-200 bg-yellow-50">
                                <div>
                                    <p className="text-sm font-medium text-yellow-800">PO #4459</p>
                                    <p className="text-xs text-yellow-600">$12,450.00</p>
                                </div>
                                <button className="text-xs bg-white border border-yellow-300 text-yellow-700 px-2 py-1 rounded hover:bg-yellow-100">
                                    Review
                                </button>
                             </div>
                        </div>
                     </div>
                </div>
            </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
