import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from './components/AdminLayout';
import Table from './components/Table';
import Pagination from './components/Pagination';
import { apiService } from '../../services/api';

const Dashboard = () => {
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectAll, setSelectAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Dashboard statistics data
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
  });

  // Recent activity data
  const [recentActivity, setRecentActivity] = useState([]);

  // Fetch dashboard data from API
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch dashboard statistics
        const statsResponse = await apiService.get('/dashboard/stats');
        setStats(
          statsResponse.data || {
            totalUsers: 124,
            totalOrders: 56,
            totalRevenue: 12450,
            totalProducts: 89,
          }
        );

        // Fetch recent activity
        const activityResponse = await apiService.get('/dashboard/activity');
        setRecentActivity(
          activityResponse.data || [
            {
              id: 1,
              action: 'New user registered',
              user: 'John Doe',
              time: '2 minutes ago',
            },
            {
              id: 2,
              action: 'Order placed',
              user: 'Jane Smith',
              time: '15 minutes ago',
            },
            {
              id: 3,
              action: 'Product updated',
              user: 'Admin',
              time: '1 hour ago',
            },
            {
              id: 4,
              action: 'Payment received',
              user: 'Mike Johnson',
              time: '3 hours ago',
            },
          ]
        );

        // Fetch table data (pages)
        const response = await apiService.get('/pages', {
          page: currentPage,
          per_page: recordsPerPage,
        });

        const data = response.data.data || response.data; // Handle pagination structure
        const total = response.data.total || data.length;

        // Calculate total records and pages
        setTotalRecords(total);
        setTotalPages(Math.ceil(total / recordsPerPage));

        // Set the current page data
        setTableData(data.map((item) => ({ ...item, selected: false })));
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);

        // Fallback to mock data if there's an error
        setStats({
          totalUsers: 124,
          totalOrders: 56,
          totalRevenue: 12450,
          totalProducts: 89,
        });

        setRecentActivity([
          {
            id: 1,
            action: 'New user registered',
            user: 'John Doe',
            time: '2 minutes ago',
          },
          {
            id: 2,
            action: 'Order placed',
            user: 'Jane Smith',
            time: '15 minutes ago',
          },
          {
            id: 3,
            action: 'Product updated',
            user: 'Admin',
            time: '1 hour ago',
          },
          {
            id: 4,
            action: 'Payment received',
            user: 'Mike Johnson',
            time: '3 hours ago',
          },
        ]);

        const mockData = Array.from({ length: 50 }, (_, i) => ({
          id: i + 1,
          name: `Page ${i + 1}`,
          template: i % 3 === 0 ? 'Default' : i % 3 === 1 ? 'Blog' : 'Custom',
          createdAt: new Date(
            Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000
          )
            .toISOString()
            .split('T')[0],
          status: i % 4 === 0 ? 'Draft' : 'Published',
          selected: false,
        }));

        setTotalRecords(mockData.length);
        setTotalPages(Math.ceil(mockData.length / recordsPerPage));

        const startIndex = (currentPage - 1) * recordsPerPage;
        const endIndex = startIndex + recordsPerPage;
        setTableData(mockData.slice(startIndex, endIndex));
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentPage, recordsPerPage]);

  const handleRowSelect = (id) => {
    setTableData((prevData) =>
      prevData.map((row) =>
        row.id === id ? { ...row, selected: !row.selected } : row
      )
    );
  };

  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setTableData((prevData) =>
      prevData.map((row) => ({ ...row, selected: newSelectAll }))
    );
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleRecordsPerPageChange = (newRecordsPerPage) => {
    setRecordsPerPage(newRecordsPerPage);
    setCurrentPage(1); // Reset to first page when changing records per page
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <AdminLayout activeMenu="Dashboard">
      <Head>
        <title>Admin Dashboard</title>
      </Head>

      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header">
          <h1>Admin Dashboard</h1>
        </div>
        <div className="card-body">
          <p>Welcome, Admin. Use the sidebar to navigate.</p>
        </div>
      </div>
      {/* Dashboard Statistics Cards */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon bg-blue-500">
            <span className="material-icons-outlined">people</span>
          </div>
          <div className="stat-info">
            <h3>{stats.totalUsers}</h3>
            <p>Users</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-green-500">
            <span className="material-icons-outlined">shopping_cart</span>
          </div>
          <div className="stat-info">
            <h3>{stats.totalOrders}</h3>
            <p>Orders</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-purple-500">
            <span className="material-icons-outlined">payments</span>
          </div>
          <div className="stat-info">
            <h3>${stats.totalRevenue.toLocaleString()}</h3>
            <p>Revenue</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-orange-500">
            <span className="material-icons-outlined">inventory</span>
          </div>
          <div className="stat-info">
            <h3>{stats.totalProducts}</h3>
            <p>Products</p>
          </div>
        </div>
      </div>

      {/* Recent Activity and Pages Table */}
      <div className="dashboard-grid">
        <div className="activity-section">
          <div className="section-header">
            <h2>Recent Activity</h2>
          </div>

          <div className="activity-list">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="activity-item">
                <div className="activity-icon">
                  <span className="material-icons-outlined">
                    notifications
                  </span>
                </div>
                <div className="activity-content">
                  <p>
                    <strong>{activity.action}</strong> by {activity.user}
                  </p>
                  <span className="activity-time">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pages-section">
          <div className="section-header">
            <h2>Recent Pages</h2>
            <a href="/admin/pages">View All</a>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="actions">
                <select className="btn btn-outline">
                  <option>Bulk Actions</option>
                  <option>Publish Selected</option>
                  <option>Move to Draft</option>
                  <option>Delete Selected</option>
                </select>
                <button className="btn btn-outline">
                  <span className="material-icons-outlined">
                    filter_list
                  </span>
                  <span>Filters</span>
                </button>
                <div className="search-bar light">
                  <input type="text" placeholder="Search pages..." />
                  <button>
                    <span className="material-icons-outlined">
                      search
                    </span>
                  </button>
                </div>
              </div>
              <div className="actions">
                <button className="btn btn-primary">
                  <span className="material-icons-outlined">add</span>
                  <span>Create Page</span>
                </button>
                <button className="btn btn-outline">
                  <span className="material-icons-outlined">refresh</span>
                  <span>Reload</span>
                </button>
              </div>
            </div>

            <Table
              tableData={tableData}
              handleRowSelect={handleRowSelect}
              selectAll={selectAll}
              handleSelectAll={handleSelectAll}
            />

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalRecords={totalRecords}
              recordsPerPage={recordsPerPage}
              onPageChange={handlePageChange}
              onRecordsPerPageChange={handleRecordsPerPageChange}
            />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
