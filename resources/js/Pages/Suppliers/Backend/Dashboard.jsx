import React from 'react';
import { Head, Link } from '@inertiajs/react';
import SupplierLayout from './Layout/SupplierLayout';

const StatCard = ({ title, value, icon, color, trend }) => (
    <div className="stat-card">
        <div className={`icon-wrapper ${color}`}>
            <span className="material-icons">{icon}</span>
        </div>
        <div className="stat-content">
            <div className="label">{title}</div>
            <div className="value">{value}</div>
            {trend && (
                <div className={`trend ${trend > 0 ? 'up' : 'down'}`}>
                    <span className="material-icons text-xs">
                        {trend > 0 ? 'trending_up' : 'trending_down'}
                    </span>
                    {Math.abs(trend)}% vs last month
                </div>
            )}
        </div>
    </div>
);

const RecentOrders = ({ orders }) => (
    <div className="recent-orders">
        <div className="section-header">
            <h3>Recent Orders</h3>
            <Link href="#" className="view-all">View All</Link>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Order ID</th>
                    <th>Product</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                {orders && orders.length > 0 ? (
                    orders.map((order) => (
                        <tr key={order.id}>
                            <td>#{order.order_number}</td>
                            <td>{order.product_name}</td>
                            <td>{order.date}</td>
                            <td>{order.amount}</td>
                            <td>
                                <span className={`status-badge ${order.status.toLowerCase()}`}>
                                    {order.status}
                                </span>
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan="5" className="text-center py-4 text-gray-500">
                            No recent orders found.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
);

const Dashboard = ({ stats, recentOrders }) => {
    return (
        <SupplierLayout activeMenu="Dashboard">
            <Head title="Supplier Dashboard" />
            
            <div className="dashboard-overview">
                <div className="stats-grid">
                    <StatCard 
                        title="Total Products" 
                        value={stats.total_products} 
                        icon="inventory_2" 
                        color="blue" 
                    />
                    <StatCard 
                        title="Total Orders" 
                        value={stats.total_orders} 
                        icon="shopping_cart" 
                        color="green" 
                        trend={12}
                    />
                    <StatCard 
                        title="Pending Orders" 
                        value={stats.pending_orders} 
                        icon="hourglass_empty" 
                        color="orange" 
                    />
                    <StatCard 
                        title="Total Revenue" 
                        value={stats.total_revenue} 
                        icon="monetization_on" 
                        color="green" 
                        trend={8.5}
                    />
                </div>

                <div className="dashboard-charts">
                    <div className="chart-card">
                        <h3 className="text-lg font-semibold mb-4">Revenue Overview</h3>
                        <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                            <span className="text-gray-400">Chart Component Placeholder</span>
                        </div>
                    </div>
                    <div className="chart-card">
                        <h3 className="text-lg font-semibold mb-4">Best Selling</h3>
                        <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                            <span className="text-gray-400">Pie Chart Placeholder</span>
                        </div>
                    </div>
                </div>

                <RecentOrders orders={recentOrders} />
            </div>
        </SupplierLayout>
    );
};

export default Dashboard;
