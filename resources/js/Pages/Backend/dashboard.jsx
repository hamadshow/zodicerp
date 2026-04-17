import React, { useState, useEffect, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, Legend 
} from 'recharts';
import AdminLayout from './components/AdminLayout';
import Table from './components/Table';
import Pagination from './components/Pagination';
import { apiService } from '../../services/api';

const Dashboard = () => {
  const today = new Date().toISOString().slice(0, 10);

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectAll, setSelectAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [appliedDateFrom, setAppliedDateFrom] = useState(today);
  const [appliedDateTo, setAppliedDateTo] = useState(today);

  // Dashboard statistics data
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    totalNetPurchases: 0,
  });

  // New state variables for charts and alerts
  const [salesData, setSalesData] = useState([]);
  const [distributionData, setDistributionData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [categoryTree, setCategoryTree] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  // Fetch all dashboard data from API
  const fetchDashboardData = useCallback(async (from = appliedDateFrom, to = appliedDateTo, page = currentPage) => {
    setLoading(true);

    const dashboardFilterParams = {
      date_from: from || undefined,
      date_to: to || undefined,
    };

    let statsData = {};

    try {
      const statsRes = await apiService.get('/dashboard/stats', dashboardFilterParams);
      statsData = statsRes.data?.data ?? {};
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }

    setStats({
      totalUsers: statsData.summary?.total_users ?? 0,
      totalNetPurchases: statsData.summary?.total_net_purchases ?? 0,
      totalOrders: statsData.summary?.total_orders ?? 0,
      totalRevenue: statsData.summary?.total_revenue ?? 0,
      totalProducts: statsData.summary?.total_products ?? 0,
    });

    try {
      const [
        activityRes,
        ordersRes,
        salesRes,
        distRes,
        topProdRes,
        lowStockRes,
        categoryRes
      ] = await Promise.all([
        apiService.get('/dashboard/recent-activity', { limit: 10, ...dashboardFilterParams }),
        apiService.get('/orders', { page: page, per_page: recordsPerPage, search: searchQuery || undefined, ...dashboardFilterParams }),
        apiService.get('/dashboard/sales-chart', { months: 12, ...dashboardFilterParams }),
        apiService.get('/dashboard/order-status-distribution', dashboardFilterParams),
        apiService.get('/dashboard/top-selling-products', { limit: 5, ...dashboardFilterParams }),
        apiService.get('/dashboard/low-stock-alerts'),
        apiService.get('/categories/tree')
      ]);

      setRecentActivity(activityRes.data?.data ?? []);

      const ordersData = ordersRes.data?.data ?? [];
      const ordersTotal = ordersRes.data?.pagination?.total ?? ordersData.length;
      setTotalRecords(ordersTotal);
      setTotalPages(Math.max(1, Math.ceil(ordersTotal / recordsPerPage)));
      setTableData(ordersData.map(item => ({ ...item, selected: false })));

      const salesDataRaw = salesRes.data?.data ?? {};
      setSalesData(
        (salesDataRaw.labels ?? []).map((label, index) => ({
          name: label,
          sales: salesDataRaw.orders?.[index] ?? 0,
          revenue: salesDataRaw.revenue?.[index] ?? 0,
        }))
      );

      const distributionDataRaw = distRes.data?.data ?? {};
      setDistributionData(
        (distributionDataRaw.labels ?? []).map((label, index) => ({
          name: label,
          value: distributionDataRaw.data?.[index] ?? 0,
        }))
      );

      setTopProducts(topProdRes.data?.data ?? []);
      setLowStockAlerts(lowStockRes.data?.data ?? []);
      setCategoryTree(categoryRes.data?.data ?? []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);

      setSalesData([
        { name: 'Jan', sales: 4000, revenue: 2400 },
        { name: 'Feb', sales: 3000, revenue: 1398 },
        { name: 'Mar', sales: 2000, revenue: 9800 },
        { name: 'Apr', sales: 2780, revenue: 3908 },
        { name: 'May', sales: 1890, revenue: 4800 },
        { name: 'Jun', sales: 2390, revenue: 3800 },
      ]);

      setDistributionData([
        { name: 'Pending', value: 400 },
        { name: 'Processing', value: 300 },
        { name: 'Shipped', value: 300 },
        { name: 'Delivered', value: 200 },
      ]);

      setTopProducts([
        { id: 1, name: 'Premium Coffee Beans', sales: 154, stock: 45 },
        { id: 2, name: 'Espresso Machine', sales: 84, stock: 12 },
        { id: 3, name: 'Organic Green Tea', sales: 210, stock: 8 },
      ]);

      setLowStockAlerts([
        { id: 3, name: 'Organic Green Tea', stock: 8, threshold: 10 },
        { id: 5, name: 'Sugar Packets', stock: 50, threshold: 100 },
      ]);

      setCategoryTree([
        { id: 1, name: 'Electronics', count: 45 },
        { id: 2, name: 'Furniture', count: 12 },
        { id: 3, name: 'Apparel', count: 32 },
      ]);

      setRecentActivity([
        { id: 1, action: 'Order placed', user: 'Jane Smith', time: '2 mins ago' },
        { id: 2, action: 'New product added', user: 'Admin', time: '1 hour ago' },
      ]);

      const mockOrders = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        order_number: `ORD-${1000 + i}`,
        customer: { name: `Customer ${i + 1}` },
        total_amount: (Math.random() * 500 + 50).toFixed(2),
        created_at: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
        status: ['pending', 'processing', 'shipped', 'delivered'][i % 4],
        selected: false,
      }));

      const filteredMockData = searchQuery 
        ? mockOrders.filter(o => o.order_number.includes(searchQuery) || o.customer.name.includes(searchQuery))
        : mockOrders;

      setTotalRecords(filteredMockData.length);
      setTotalPages(Math.ceil(filteredMockData.length / recordsPerPage));
      setTableData(filteredMockData.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage));
    }

    setLoading(false);
  }, [currentPage, recordsPerPage, searchQuery, appliedDateFrom, appliedDateTo]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRowSelect = (idOrIndex) => {
    setTableData(prev => prev.map((row, idx) => (row.id === idOrIndex || idx === idOrIndex) ? { ...row, selected: !row.selected } : row));
  };

  const handleSelectAll = () => {
    const newVal = !selectAll;
    setSelectAll(newVal);
    setTableData(prev => prev.map(row => ({ ...row, selected: newVal })));
  };

  const handlePageChange = (p) => p >= 1 && p <= totalPages && setCurrentPage(p);
  const handleRecordsPerPageChange = (n) => { setRecordsPerPage(n); setCurrentPage(1); };
  const handleSearchChange = (e) => { setSearchQuery(e.target.value); setCurrentPage(1); };
  const handleReload = () => fetchDashboardData();
  const handleCreateOrder = () => router.visit('/admin/orders/create');
  const handleEditOrder = (o) => router.visit(`/admin/orders/${o.id}/edit`);
  
  const handleDeleteOrder = async (order) => {
    if (confirm(`Are you sure you want to delete order "${order.order_number}"?`)) {
      try {
        await apiService.delete(`/orders/${order.id}`);
        fetchDashboardData();
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  const handleBulkAction = async (action) => {
    const selectedIds = tableData.filter(row => row.selected).map(row => row.id);
    if (selectedIds.length === 0) return;

    try {
      if (action === 'delete') {
        if (confirm(`Delete ${selectedIds.length} orders?`)) {
          await apiService.post('/orders/bulk-delete', { ids: selectedIds });
        }
      } else if (action === 'ship' || action === 'cancel') {
        const status = action === 'ship' ? 'shipped' : 'cancelled';
        await apiService.post('/orders/bulk-update-status', { ids: selectedIds, status });
      }
      fetchDashboardData();
      setSelectAll(false);
    } catch (error) {
      console.error('Bulk action error:', error);
    }
  };

  const handleApplyDateRange = async () => {
    const selectedFrom = dateFrom || today;
    const selectedTo = dateTo || today;
    setAppliedDateFrom(selectedFrom);
    setAppliedDateTo(selectedTo);
    const nextPage = 1;
    setCurrentPage(nextPage);
    await fetchDashboardData(selectedFrom, selectedTo, nextPage);
  };

  const columns = [
    { header: 'ID', key: 'id', sortable: true },
    { header: 'ORDER #', key: 'order_number', sortable: true, render: (row) => <a href={`/admin/orders/${row.id}`} className="table-link">{row.order_number}</a> },
    { header: 'CUSTOMER', key: 'customer', render: (row) => row.customer?.name || 'N/A' },
    { header: 'TOTAL', key: 'total_amount', sortable: true, render: (row) => `$${row.total_amount}` },
    { header: 'DATE', key: 'created_at', sortable: true },
    { header: 'STATUS', key: 'status', sortable: true, render: (row) => <span className={`status status-${row.status.toLowerCase()}`}>{row.status}</span> }
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  if (loading && tableData.length === 0) {
    return <div className="loading-container"><div className="spinner"></div><p>Loading...</p></div>;
  }

  return (
    <AdminLayout activeMenu="Dashboard">
      <Head><title>Admin Dashboard</title></Head>

      <div className="dashboard-filters" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label htmlFor="dashboard-from-date" style={{ fontSize: '0.85rem', marginBottom: '4px', color: '#4b5563' }}>From</label>
          <input
            id="dashboard-from-date"
            type="date"
            className="form-control"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label htmlFor="dashboard-to-date" style={{ fontSize: '0.85rem', marginBottom: '4px', color: '#4b5563' }}>To</label>
          <input
            id="dashboard-to-date"
            type="date"
            className="form-control"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>

        <button
          type="button"
          className="btn btn-outline"
          onClick={() => { setDateFrom(today); setDateTo(today); setCurrentPage(1); }}
          style={{ height: '38px' }}
        >
          Reset to today
        </button>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleApplyDateRange}
          style={{ height: '38px' }}
        >
          Apply range
        </button>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-stats" style={{ marginBottom: '24px' }}>
        {[
          { icon: 'payments', color: 'bg-purple-500', label: 'Revenue', val: `$${stats.totalRevenue.toLocaleString()}` },
          { icon: 'inventory_2', color: 'bg-blue-500', label: 'Net Purchases', val: `$${stats.totalNetPurchases.toLocaleString()}` },
          { icon: 'shopping_cart', color: 'bg-green-500', label: 'Orders', val: stats.totalOrders },
          { icon: 'inventory', color: 'bg-orange-500', label: 'Products', val: stats.totalProducts }
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-icon ${s.color}`}><span className="material-icons-outlined">{s.icon}</span></div>
            <div className="stat-info"><h3>{s.val}</h3><p>{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="dashboard-grid charts-grid" style={{ marginBottom: '24px' }}>
        <div className="card chart-card">
          <div className="card-header"><h2>Sales & Revenue Overview</h2></div>
          <div className="card-body" style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sales" stroke="#8884d8" activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="revenue" stroke="#82ca9d" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card">
          <div className="card-header"><h2>Order Distribution</h2></div>
          <div className="card-body" style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distributionData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {distributionData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Categories and Management Grid */}
      <div className="dashboard-grid triple-grid" style={{ marginBottom: '24px' }}>
        <div className="card">
          <div className="card-header">
            <h2>Product Categories</h2>
            <a href="/admin/categories" className="text-sm">Manage</a>
          </div>
          <div className="card-body">
            <div className="simple-list">
              {categoryTree.slice(0, 5).map(cat => (
                <div key={cat.id} className="list-item">
                  <div className="item-info">
                    <strong>{cat.name}</strong>
                    <p>{cat.count || 0} Products</p>
                  </div>
                  <span className="material-icons-outlined text-gray-400">chevron_right</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h2>Top Selling Products</h2></div>
          <div className="card-body">
            <div className="simple-list">
              {topProducts.map(p => (
                <div key={p.id} className="list-item">
                  <div className="item-info"><strong>{p.name}</strong><p>{p.sales} units sold</p></div>
                  <div className={`item-badge ${p.stock < 10 ? 'badge-danger' : 'badge-success'}`}>{p.stock} in stock</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h2>Low Stock Alerts</h2></div>
          <div className="card-body">
            <div className="simple-list">
              {lowStockAlerts.map(p => (
                <div key={p.id} className="list-item alert-item">
                  <span className="material-icons-outlined text-danger">warning</span>
                  <div className="item-info"><strong>{p.name}</strong><p>Only {p.stock} remaining (Threshold: {p.threshold})</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Activity and Management Grid */}
      <div className="dashboard-grid charts-grid" style={{ marginBottom: '24px' }}>
        <div className="card">
          <div className="card-header"><h2>Recent Activity</h2></div>
          <div className="card-body">
            <div className="activity-list">
              {recentActivity.map(a => (
                <div key={a.id} className="activity-item">
                  <div className="activity-icon"><span className="material-icons-outlined">notifications</span></div>
                  <div className="activity-content"><p><strong>{a.action}</strong> by {a.user}</p><span className="activity-time">{a.time}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h2>System Management</h2></div>
          <div className="card-body">
            <div className="simple-list">
              {[
                { label: 'User Management', icon: 'person', href: '/admin/users' },
                { label: 'Roles & Permissions', icon: 'security', href: '/admin/roles' },
                { label: 'Inventory Control', icon: 'inventory_2', href: '/admin/inventory' }
              ].map((item, idx) => (
                <a key={idx} href={item.href} className="list-item" style={{ textDecoration: 'none' }}>
                  <div className="item-info" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="material-icons-outlined" style={{ color: '#6366f1' }}>{item.icon}</span>
                    <strong>{item.label}</strong>
                  </div>
                  <span className="material-icons-outlined text-gray-400">arrow_forward</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="pages-section">
        <div className="section-header"><h2>Recent Orders</h2><a href="/admin/orders">View All</a></div>
        <div className="card">
          <div className="card-header">
            <div className="actions">
              <select 
                className="btn btn-outline"
                onChange={(e) => handleBulkAction(e.target.value)}
                value=""
              >
                <option value="" disabled>Bulk Actions</option>
                <option value="ship">Ship Selected</option>
                <option value="cancel">Cancel Selected</option>
                <option value="delete">Delete Selected</option>
              </select>
              <button className="btn btn-outline"><span className="material-icons-outlined">filter_list</span><span>Filters</span></button>
              <div className="search-bar light"><input type="text" placeholder="Search orders..." value={searchQuery} onChange={handleSearchChange} /><button><span className="material-icons-outlined">search</span></button></div>
            </div>
            <div className="actions">
              <button className="btn btn-primary" onClick={handleCreateOrder}><span className="material-icons-outlined">add</span><span>Create Order</span></button>
              <button className="btn btn-outline" onClick={handleReload}><span className="material-icons-outlined">refresh</span><span>Reload</span></button>
            </div>
          </div>
          <Table tableData={tableData} columns={columns} handleRowSelect={handleRowSelect} selectAll={selectAll} handleSelectAll={handleSelectAll} onEdit={handleEditOrder} onDelete={handleDeleteOrder} />
          <Pagination currentPage={currentPage} totalPages={totalPages} totalRecords={totalRecords} recordsPerPage={recordsPerPage} onPageChange={handlePageChange} onRecordsPerPageChange={handleRecordsPerPageChange} />
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
