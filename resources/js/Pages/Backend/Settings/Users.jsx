import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/main.scss';
import { apiService } from '../../../services/api';

const resolveMediaUrl = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
    return value;
  }

  const withoutProtocol =
    typeof value === 'string' ? value.replace(/^https?:\/\/[^/]+/, '') : '';

  const relativePath = withoutProtocol.replace(
    /^\/?(files|storage|media-files)\//,
    ''
  );

  return `/media-files/${relativePath}`;
};

const UsersManagement = () => {
  // Admin layout state - Removed redundant state


  // State management
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [formData, setFormData] = useState({
    fullname: '',
    email: '',
    password: '',
    phone: '',
    hire_date: '',
    status: 'active',
    avatar: null,
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [toast, setToast] = useState(null);

  // Sample data (in production, this would come from an API)
  const sampleEmployees = [
    {
      id: 1,
      name: 'Ahmed Mohamed',
      fullname: 'Ahmed Mohamed',
      email: 'ahmed.mohamed@company.com',
      phone: '+201234567890',
      hire_date: '2023-01-15',
      status: 'active',
      address: 'Cairo, Egypt',
      notes: 'Excellent performance',
      avatar: null,
      created_at: '2023-01-15',
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      fullname: 'Sarah Johnson',
      email: 'sarah.j@company.com',
      phone: '+12025550123',
      hire_date: '2022-03-10',
      status: 'active',
      address: 'New York, USA',
      notes: '',
      avatar: null,
      created_at: '2022-03-10',
    },
    {
      id: 3,
      name: 'James Wilson',
      fullname: 'James Wilson',
      email: 'james.w@company.com',
      phone: '+442012345678',
      hire_date: '2021-11-20',
      status: 'active',
      address: 'London, UK',
      notes: 'Top performer',
      avatar: null,
      created_at: '2021-11-20',
    },
    {
      id: 4,
      name: 'Fatima Al-Mansour',
      fullname: 'Fatima Al-Mansour',
      email: 'fatima.am@company.com',
      phone: '+966501234567',
      hire_date: '2023-06-05',
      status: 'active',
      address: 'Riyadh, Saudi Arabia',
      notes: '',
      avatar: null,
      created_at: '2023-06-05',
    },
    {
      id: 5,
      name: 'Mohammed Al-Farsi',
      fullname: 'Mohammed Al-Farsi',
      email: 'mohammed.af@company.com',
      phone: '+971501234567',
      hire_date: '2022-09-12',
      status: 'active',
      address: 'Dubai, UAE',
      notes: 'CPA certified',
      avatar: null,
      created_at: '2022-09-12',
    },
    {
      id: 6,
      name: 'Priya Sharma',
      fullname: 'Priya Sharma',
      email: 'priya.s@company.com',
      phone: '+919876543210',
      hire_date: '2023-02-28',
      status: 'on-leave',
      address: 'Mumbai, India',
      notes: 'On maternity leave',
      avatar: null,
      created_at: '2023-02-28',
    },
    {
      id: 7,
      name: 'Ali Khan',
      fullname: 'Ali Khan',
      email: 'ali.k@company.com',
      phone: '+923001234567',
      hire_date: '2021-08-15',
      status: 'active',
      address: 'Karachi, Pakistan',
      notes: '',
      avatar: null,
      created_at: '2021-08-15',
    },
    {
      id: 8,
      name: 'Marie Dubois',
      fullname: 'Marie Dubois',
      email: 'marie.d@company.com',
      phone: '+33123456789',
      hire_date: '2020-12-01',
      status: 'inactive',
      address: 'Paris, France',
      notes: 'Left the company',
      avatar: null,
      created_at: '2020-12-01',
    },
  ];

  // Menu items - Removed redundant configuration

  // Fetch employees from API
  const fetchEmployees = async (page = 1, search = '') => {
    try {
      // loading indicator removed
      const response = await apiService.get('/users', {
        page,
        per_page: rowsPerPage,
        search,
      });
      const data = response.data;
      setEmployees(Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []));
      // totalEmployees state removed
      setCurrentPage(data.current_page || 1);
    } catch (error) {
      console.error('Error fetching users:', error);
      showToast('Error loading users', 'error');
      setEmployees(Array.isArray(sampleEmployees) ? sampleEmployees : []);
      // totalEmployees state removed
    } finally {
      // loading indicator removed
    }
  };

  // Initialize component
  useEffect(() => {
    fetchEmployees();
  }, []);

  // Update submenu state initialization - Removed

  // Reset current page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Filter employees based on search term
  const filteredEmployees = (employees || []).filter(
    (emp) =>
      (emp.fullname || emp.username || emp.name)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil((filteredEmployees || []).length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, (filteredEmployees || []).length);
  const paginatedEmployees = (filteredEmployees || []).slice(startIndex, endIndex);

  // Calculate stats
  const stats = {
    totalEmployees: (employees || []).length,
    activeEmployees: (employees || []).filter((e) => e.status === 'active').length,
    onLeaveEmployees: (employees || []).filter((e) => e.status === 'on-leave').length,
    inactiveEmployees: (employees || []).filter((e) => e.status === 'inactive').length,
  };

  // Toast notification
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Form toggle handlers
  const handleAddEdit = (employee = null) => {
    setEditingEmployee(employee);
    if (employee) {
      setFormData({
        fullname: employee.fullname || employee.username || employee.name || '',
        email: employee.email,
        password: '',
        phone: employee.phone || '',
        role: employee.role || 'employee',
        hire_date: employee.hire_date || '',
        status: employee.status || 'active',
        avatar: employee.avatar,
      });
      setAvatarPreview(resolveMediaUrl(employee.avatar));
    } else {
      resetForm();
    }
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingEmployee(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      fullname: '',
      email: '',
      password: '',
      phone: '',
      role: 'employee',
      hire_date: new Date().toISOString().split('T')[0],
      status: 'active',
      avatar: null,
    });
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  // Form handlers
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.match('image.*')) {
        showToast('Please select an image file (JPG, PNG, GIF, etc.)', 'error');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showToast('Profile photo should be less than 5MB', 'error');
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (
      !formData.fullname ||
      !formData.email ||
      !formData.hire_date
    ) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    if (!editingEmployee && !formData.password) {
      showToast('Password is required for new users', 'error');
      return;
    }

    try {
      const submitData = new FormData();
      submitData.append('fullname', formData.fullname);
      submitData.append('email', formData.email);
      if (formData.password) submitData.append('password', formData.password);
      if (formData.phone) submitData.append('phone', formData.phone);
      if (formData.role) submitData.append('role', formData.role);
      submitData.append('hire_date', formData.hire_date);
      submitData.append('status', formData.status);
      if (avatarFile) submitData.append('avatar', avatarFile);

      let response;
      if (editingEmployee) {
        submitData.append('_method', 'PUT');
        response = await apiService.post(`/users/${editingEmployee.id}`, submitData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        response = await apiService.post('/users', submitData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      const result = response.data;

      if (result.success) {
        showToast(result.message, 'success');
        handleCancel();
        fetchEmployees(currentPage, searchTerm);
      } else {
        showToast('Error saving employee', 'error');
      }
    } catch (error) {
      showToast('Error saving employee', 'error');
      console.error('Error saving employee:', error);
    }
  };

  // Employee operations
  const deleteEmployee = (employee) => {
    setDeleteItem(employee);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;

    try {
      const response = await apiService.delete(`/users/${deleteItem.id}`);
      const result = response.data;

      if (result.success) {
        showToast(result.message, 'success');
        setShowDeleteModal(false);
        setDeleteItem(null);
        fetchEmployees(currentPage, searchTerm);
      } else {
        showToast('Error deleting employee', 'error');
      }
    } catch (error) {
      showToast('Error deleting employee', 'error');
      console.error('Error deleting employee:', error);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteItem(null);
  };

  const viewEmployee = (employee) => {
    setViewingEmployee(employee);
    setViewModalOpen(true);
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setViewingEmployee(null);
  };

  // Bulk actions
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(filteredEmployees.map((emp) => emp.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleCheckboxChange = (id, checked) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((itemId) => itemId !== id));
    }
  };

  const applyBulkAction = async (action) => {
    if (!action) return;

    if (selectedIds.length === 0) {
      showToast('Please select at least one user.', 'warning');
      document.getElementById('bulkActions').value = '';
      return;
    }

    if (action === 'delete') {
      if (
        window.confirm(
          `Are you sure you want to delete ${selectedIds.length} selected user(s)?`
        )
      ) {
        try {
          const response = await apiService.post('/users/bulk-delete', {
            ids: selectedIds,
          });
          const result = response.data;

          if (result.success) {
            showToast(result.message, 'success');
            setSelectedIds([]);
            fetchEmployees(currentPage, searchTerm);
          } else {
            showToast('Error deleting users', 'error');
          }
        } catch (error) {
          showToast('Error deleting users', 'error');
          console.error('Error deleting users:', error);
        }
      }
      document.getElementById('bulkActions').value = '';
      return;
    }

    try {
      const response = await apiService.post('/users/bulk-update-status', {
        ids: selectedIds,
        status: action === 'activate' ? 'active' : 'inactive',
      });
      const result = response.data;

      if (result.success) {
        showToast(result.message, 'success');
        setSelectedIds([]);
        fetchEmployees(currentPage, searchTerm);
      } else {
      showToast('Error updating user status', 'error');
      }
    } catch (error) {
      showToast('Error updating user status', 'error');
      console.error('Error updating user status:', error);
    } finally {
      document.getElementById('bulkActions').value = '';
    }
  };

  // Sidebar functions - Removed
  
  return (
    <AdminLayout activeMenu="Users">
      <Head title="Users" />

      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="employees-card fade-in">
          <div className="card-header">
            <h3>{editingEmployee ? 'Edit User' : 'Add New User'}</h3>
            <button className="btn btn-outline" onClick={handleCancel}>
              <span className="material-icons-outlined">arrow_back</span>
              <span>Back to List</span>
            </button>
          </div>
          <div className="card-body" style={{ padding: '20px' }}>
            <form id="employeeForm" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="fullname"
                    value={formData.fullname}
                    onChange={handleInputChange}
                    placeholder="Enter full name"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    className="form-control"
                    id="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter email address"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Password {editingEmployee ? '' : '*'}
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    id="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder={
                      editingEmployee
                        ? 'Leave blank to keep current password'
                        : 'Enter password'
                    }
                    required={!editingEmployee}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    type="tel"
                    className="form-control"
                    id="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <select
                    className="form-control"
                    id="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                    <option value="supplier">Supplier</option>
                    <option value="customer">Customer</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Hire Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    id="hire_date"
                    value={formData.hire_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-control"
                    id="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="on-leave">On Leave</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Profile Photo</label>
                <div className="avatar-upload-container">
                  <div className="avatar-preview">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar preview" />
                    ) : (
                      <span
                        className="material-icons-outlined"
                        style={{ color: '#94a3b8' }}
                      >
                        person
                      </span>
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      id="avatarUpload"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleAvatarChange}
                    />
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() =>
                        document.getElementById('avatarUpload').click()
                      }
                    >
                      <span
                        className="material-icons-outlined"
                        style={{ fontSize: '18px' }}
                      >
                        upload
                      </span>
                      Upload Photo
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn" onClick={handleCancel}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  {editingEmployee ? 'Update' : 'Save'} User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View User Modal */}
      {viewModalOpen && viewingEmployee && (
        <div className="modal-overlay active">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">User Details</h3>
              <button className="modal-close" onClick={closeViewModal}>
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="employee-details-modal">
                <div className="employee-header">
                  <div className="employee-avatar-large">
                    {viewingEmployee.avatar ? (
                      <img
                        src={resolveMediaUrl(viewingEmployee.avatar)}
                        alt={viewingEmployee.fullname || viewingEmployee.username || viewingEmployee.name}
                      />
                    ) : (
                      <span
                        className="material-icons-outlined"
                        style={{ fontSize: '48px', color: '#94a3b8' }}
                      >
                        person
                      </span>
                    )}
                  </div>
                  <div className="employee-info-large">
                    <h4>{viewingEmployee.fullname || viewingEmployee.username || viewingEmployee.name}</h4>
                    <span
                      className={`employee-status status-${viewingEmployee.status}`}
                    >
                      {viewingEmployee.status === 'active'
                        ? 'Active'
                        : viewingEmployee.status === 'inactive'
                          ? 'Inactive'
                          : viewingEmployee.status === 'on-leave'
                            ? 'On Leave'
                            : 'Terminated'}
                    </span>
                  </div>
                </div>
                <div className="employee-details-grid">
                  <div className="detail-row">
                    <span className="detail-label">Email:</span>
                    <span className="detail-value">
                      {viewingEmployee.email}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Phone:</span>
                    <span className="detail-value">
                      {viewingEmployee.phone || 'N/A'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Role:</span>
                    <span className="detail-value" style={{ textTransform: 'capitalize' }}>
                      {viewingEmployee.role || 'Employee'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Hire Date:</span>
                    <span className="detail-value">
                      {viewingEmployee.hire_date}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={closeViewModal}>
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  closeViewModal();
                  handleAddEdit(viewingEmployee);
                }}
              >
                Edit User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteItem && (
        <div className="modal-overlay active">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Confirm Delete</h3>
              <button className="modal-close" onClick={cancelDelete}>
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete user "
                {deleteItem.fullname || deleteItem.username || deleteItem.name}"? This action
                cannot be undone.
              </p>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={cancelDelete}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmDelete}
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {!showForm && (
        <>
          <div className="breadcrumb">
            <a href="#">Dashboard</a>
            <span>/</span>
            <a href="#">Settings</a>
            <span>/</span>
            <span>Users</span>
          </div>

      {/* Quick Stats */}
      <div className="stats-cards">
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ backgroundColor: 'var(--info-color)' }}
          >
            <span className="material-icons-outlined">people</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalEmployees}</div>
            <div className="stat-label">Total Users</div>
          </div>
        </div>
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ backgroundColor: 'var(--success-color)' }}
          >
            <span className="material-icons-outlined">check_circle</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.activeEmployees}</div>
            <div className="stat-label">Active Users</div>
          </div>
        </div>
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ backgroundColor: 'var(--warning-color)' }}
          >
            <span className="material-icons-outlined">flight_takeoff</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.onLeaveEmployees}</div>
            <div className="stat-label">On Leave</div>
          </div>
        </div>
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            <span className="material-icons-outlined">person_off</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.inactiveEmployees}</div>
            <div className="stat-label">Inactive Users</div>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="employees-card fade-in">
        <div className="card-header">
          <div className="employees-actions">
            <select
              className="btn btn-outline"
              id="bulkActions"
              onChange={(e) => applyBulkAction(e.target.value)}
            >
              <option value="">Bulk Actions</option>
              <option value="activate">Activate Selected</option>
              <option value="deactivate">Deactivate Selected</option>
              <option value="delete">Delete Selected</option>
            </select>
            <div className="search-bar light">
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button
                onClick={() =>
                  showToast(`Searching for "${searchTerm}"`, 'info')
                }
              >
                <span className="material-icons-outlined">search</span>
              </button>
            </div>
          </div>
          <div className="actions">
            <button className="btn btn-primary" onClick={() => handleAddEdit()}>
              <span className="material-icons-outlined">add</span>
              <span>Add User</span>
            </button>
            <button
              className="btn btn-outline"
              onClick={() => showToast('Users list refreshed!', 'success')}
            >
              <span className="material-icons-outlined">refresh</span>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    id="selectAll"
                    checked={
                      selectedIds.length === (paginatedEmployees || []).length &&
                      (paginatedEmployees || []).length > 0
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th>ID</th>
                <th>USER</th>
                <th>ROLE</th>
                <th>STATUS</th>
                <th>HIRE DATE</th>
                <th>OPERATIONS</th>
              </tr>
            </thead>
            <tbody>
              {(paginatedEmployees || []).length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    style={{
                      textAlign: 'center',
                      padding: '40px',
                      color: 'var(--gray-color)',
                    }}
                  >
                    <span
                      className="material-icons-outlined"
                      style={{
                        fontSize: '48px',
                        marginBottom: '16px',
                        display: 'block',
                        color: '#cbd5e1',
                      }}
                    >
                      info
                    </span>
                    No users found
                  </td>
                </tr>
              ) : (
                (paginatedEmployees || []).map((emp) => (
                  <tr key={emp.id}>
                    <td>
                      <input
                        type="checkbox"
                        className="employee-checkbox"
                        checked={selectedIds.includes(emp.id)}
                        onChange={(e) =>
                          handleCheckboxChange(emp.id, e.target.checked)
                        }
                      />
                    </td>
                    <td>{emp.id.toString().padStart(3, '0')}</td>
                    <td>
                      <div className="employee-info">
                        <div className="employee-avatar">
                          {emp.avatar ? (
                            <img
                              src={resolveMediaUrl(emp.avatar)}
                              alt={emp.fullname || emp.username || emp.name}
                            />
                          ) : (
                            <span
                              className="material-icons-outlined"
                              style={{ color: '#94a3b8' }}
                            >
                              person
                            </span>
                          )}
                        </div>
                        <div className="employee-details">
                          <div className="employee-name">
                            {emp.fullname || emp.username || emp.name}
                          </div>
                          <div className="employee-position">{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>
                      {emp.role || 'Employee'}
                    </td>
                    <td>
                      <span className={`employee-status status-${emp.status}`}>
                        {emp.status === 'active'
                          ? 'Active'
                          : emp.status === 'inactive'
                            ? 'Inactive'
                            : emp.status === 'on-leave'
                              ? 'On Leave'
                              : 'Terminated'}
                      </span>
                    </td>
                    <td>{emp.hire_date}</td>
                    <td>
                      <button
                        className="icon-btn edit"
                        onClick={() => handleAddEdit(emp)}
                      >
                        <span className="material-icons-outlined">edit</span>
                      </button>
                      <button
                        className="icon-btn delete"
                        onClick={() => deleteEmployee(emp)}
                      >
                        <span className="material-icons-outlined">delete</span>
                      </button>
                      <button
                        className="icon-btn"
                        style={{ color: 'var(--info-color)' }}
                        onClick={() => viewEmployee(emp)}
                      >
                        <span className="material-icons-outlined">
                          visibility
                        </span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <div className="pagination-info">
            <select
              className="select-dropdown"
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(parseInt(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span>
              Show from {startIndex + 1} to {endIndex} in
              <span
                style={{
                  backgroundColor: '#64748b',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: '600',
                  marginLeft: '8px',
                }}
              >
                {(filteredEmployees || []).length}
              </span>{' '}
              records
            </span>
          </div>
          <div className="pagination-controls">
            <button
              className="page-btn"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              « Previous
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button
              className="page-btn"
              onClick={() =>
                setCurrentPage((prev) =>
                  Math.min(Math.max(totalPages, 1), prev + 1)
                )
              }
              disabled={currentPage >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>
        </>
      )}
    </AdminLayout>
  );
};

export default UsersManagement;
