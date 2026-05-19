import React, { useState, useEffect, useMemo } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import Table from '../components/Table';
import BlankPage from '@/Components/BlankPage';
import '../../../../css/backend/main.scss';
import { apiService } from '../../../services/api';
import { formatDate } from '@/utils/date';

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

const EmployeesManagement = () => {
  // Admin layout state - Removed redundant state
  const page = usePage();
  const localization = page?.props?.localization;
  const isArabic = localization?.current_locale === 'ar';

  // State management
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
    department: '',
    position: '',
    hire_date: '',
    salary: '',
    nationality: '',
    status: 'active',
    address: '',
    notes: '',
    avatar: null,
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [toast, setToast] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [professions, setProfessions] = useState([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');

  // Department and nationality mappings
  const departmentNames = {
    it: 'IT Department',
    hr: 'Human Resources',
    sales: 'Sales',
    marketing: 'Marketing',
    finance: 'Finance',
    operations: 'Operations',
    'customer-service': 'Customer Service',
    engineering: 'Engineering',
  };

  const nationalityNames = {
    egyptian: 'Egyptian',
    american: 'American',
    british: 'British',
    saudi: 'Saudi Arabian',
    emirati: 'Emirati',
    indian: 'Indian',
    pakistani: 'Pakistani',
    french: 'French',
  };

  // Sample data (in production, this would come from an API)
  const sampleEmployees = [];

  // Menu items - Removed redundant configuration

  // Fetch employees from API
  const fetchEmployees = async (page = 1, search = '') => {
    try {
      // loading indicator removed
      const response = await apiService.get('/employees', {
        page,
        per_page: rowsPerPage,
        search,
      });
      const data = response.data;
      setEmployees(Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []));
      // totalEmployees state removed
      setCurrentPage(data.current_page || 1);
    } catch (error) {
      console.error('Error fetching employees:', error);
      showToast('Error loading employees', 'error');
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

  useEffect(() => {
    apiService
      .get('/departments')
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setDepartments(data);
      })
      .catch(() => setDepartments([]));
  }, []);

  useEffect(() => {
    if (!showForm) return;
    if (!formData.department || selectedDepartmentId) return;
    const match = departments.find(
      (d) => (isArabic ? d.name_ar : d.name_en) === formData.department
    );
    if (match) {
      const id = String(match.id);
      setSelectedDepartmentId(id);
      apiService
        .get('/professions', { department_id: id })
        .then((res) => {
          const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
          setProfessions(data);
        })
        .catch(() => setProfessions([]));
    }
  }, [departments, showForm, formData.department, selectedDepartmentId, isArabic]);

  const handleDepartmentSelect = async (e) => {
    const deptId = e.target.value;
    setSelectedDepartmentId(deptId);
    const dept = departments.find((d) => String(d.id) === String(deptId));
    const deptName = dept ? (isArabic ? dept.name_ar : dept.name_en) : '';
    setFormData((prev) => ({ ...prev, department: deptName, position: '' }));
    if (deptId) {
      try {
        const res = await apiService.get('/professions', { department_id: deptId });
        const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setProfessions(data);
      } catch {
        setProfessions([]);
      }
    } else {
      setProfessions([]);
    }
  };
  // Update submenu state initialization - Removed

  // Reset current page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Filter employees based on search term
  const filteredEmployees = (employees || []).filter(
    (emp) =>
      emp.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.position?.toLowerCase().includes(searchTerm.toLowerCase())
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
    totalDepartments: [...new Set((employees || []).map((e) => e.department))].length,
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
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email,
        phone: employee.phone || '',
        role: employee.role || 'employee',
        department: employee.department,
        position: employee.position,
        hire_date: employee.hire_date ? employee.hire_date.split('T')[0] : '',
        salary: employee.salary || '',
        nationality: employee.nationality || '',
        status: employee.status,
        address: employee.address || '',
        notes: employee.notes || '',
        avatar: employee.avatar,
      });
      setAvatarPreview(employee.avatar);
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
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      phone: '',
      role: 'employee',
      department: '',
      position: '',
      hire_date: new Date().toISOString().split('T')[0],
      salary: '',
      nationality: '',
      status: 'active',
      address: '',
      notes: '',
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
      !formData.first_name ||
      !formData.last_name ||
      !formData.email ||
      !formData.department ||
      !formData.position ||
      !formData.hire_date
    ) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    if (!editingEmployee) {
      if (!formData.password) {
        showToast('Password is required for new employees', 'error');
        return;
      }
      if (formData.password.length < 8) {
        showToast('Password must be at least 8 characters', 'error');
        return;
      }
    } else if (formData.password && formData.password.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }

    try {
      const submitData = new FormData();
      submitData.append('first_name', formData.first_name);
      submitData.append('last_name', formData.last_name);
      submitData.append('email', formData.email);
      if (formData.password) submitData.append('password', formData.password);
      if (formData.phone) submitData.append('phone', formData.phone);
      if (formData.role) submitData.append('role', formData.role);
      submitData.append('department', formData.department);
      submitData.append('position', formData.position);
      submitData.append('hire_date', formData.hire_date);
      if (formData.salary) submitData.append('salary', formData.salary);
      if (formData.nationality)
        submitData.append('nationality', formData.nationality);
      submitData.append('status', formData.status);
      if (formData.address) submitData.append('address', formData.address);
      if (formData.notes) submitData.append('notes', formData.notes);
      if (avatarFile) submitData.append('avatar', avatarFile);

      let response;
      if (editingEmployee) {
        submitData.append('_method', 'PUT');
        response = await apiService.post(`/employees/${editingEmployee.id}`, submitData);
      } else {
        response = await apiService.post('/employees', submitData);
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
      const status = error?.response?.status;
      if (status === 422) {
        const errs = error?.response?.data?.errors || {};
        const msg =
          (Array.isArray(errs.password) && errs.password[0]) ||
          (Array.isArray(errs.email) && errs.email[0]) ||
          (Array.isArray(errs.first_name) && errs.first_name[0]) ||
          (Array.isArray(errs.last_name) && errs.last_name[0]) ||
          'Validation error';
        showToast(msg, 'error');
      } else {
        showToast('Error saving employee', 'error');
      }
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
      const response = await apiService.delete(`/employees/${deleteItem.id}`);
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
  const handleSelectAll = () => {
    if (selectedIds.length === (paginatedEmployees || []).length && (paginatedEmployees || []).length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds((paginatedEmployees || []).map((emp) => emp.id));
    }
  };

  const handleRowSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const columns = useMemo(() => [
    { 
      header: 'ID', 
      key: 'id', 
      sortable: true,
      render: (emp) => emp.id.toString().padStart(3, '0')
    },
    { 
      header: 'EMPLOYEE', 
      key: 'employee', 
      sortable: true,
      render: (emp) => (
        <div className="employee-info">
          <div className="employee-avatar">
            {emp.avatar ? (
              <img
                src={resolveMediaUrl(emp.avatar)}
                alt={`${emp.first_name} ${emp.last_name}`}
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
              {emp.first_name} {emp.last_name}
            </div>
            <div className="employee-position">{emp.email}</div>
          </div>
        </div>
      )
    },
    { 
      header: 'ROLE', 
      key: 'role', 
      sortable: true,
      render: (emp) => <span style={{ textTransform: 'capitalize' }}>{emp.role || 'Employee'}</span>
    },
    { 
      header: 'DEPARTMENT', 
      key: 'department', 
      sortable: true,
      render: (emp) => (
        <span className="department-badge">
          {departmentNames[emp.department] || emp.department}
        </span>
      )
    },
    { header: 'POSITION', key: 'position', sortable: true },
    { 
      header: 'SALARY', 
      key: 'salary', 
      sortable: true,
      render: (emp) => (
        <div className="salary-display">
          ${emp.salary?.toLocaleString() || '0'}
        </div>
      )
    },
    { 
      header: 'STATUS', 
      key: 'status', 
      sortable: true,
      render: (emp) => (
        <span className={`employee-status status-${emp.status}`}>
          {emp.status === 'active'
            ? 'Active'
            : emp.status === 'inactive'
              ? 'Inactive'
              : emp.status === 'on-leave'
                ? 'On Leave'
                : 'Terminated'}
        </span>
      )
    },
    { 
      header: 'HIRE DATE', 
      key: 'hire_date', 
      sortable: true,
      render: (emp) => formatDate(emp.hire_date)
    }
  ], [isArabic, departmentNames]);

  const tableData = useMemo(() => {
    return (paginatedEmployees || []).map(emp => ({
      ...emp,
      selected: selectedIds.includes(emp.id)
    }));
  }, [paginatedEmployees, selectedIds]);

  const applyBulkAction = async (action) => {
    if (!action) return;

    if (selectedIds.length === 0) {
      showToast('Please select at least one employee.', 'warning');
      document.getElementById('bulkActions').value = '';
      return;
    }

    if (action === 'delete') {
      if (
        window.confirm(
          `Are you sure you want to delete ${selectedIds.length} selected employee(s)?`
        )
      ) {
        try {
          const response = await apiService.post('/employees/bulk-delete', {
            ids: selectedIds,
          });
          const result = response.data;

          if (result.success) {
            showToast(result.message, 'success');
            setSelectedIds([]);
            fetchEmployees(currentPage, searchTerm);
          } else {
            showToast('Error deleting employees', 'error');
          }
        } catch (error) {
          showToast('Error deleting employees', 'error');
          console.error('Error deleting employees:', error);
        }
      }
      document.getElementById('bulkActions').value = '';
      return;
    }

    try {
      const response = await apiService.post('/employees/bulk-update-status', {
        ids: selectedIds,
        status: action === 'activate' ? 'active' : 'inactive',
      });
      const result = response.data;

      if (result.success) {
        showToast(result.message, 'success');
        setSelectedIds([]);
        fetchEmployees(currentPage, searchTerm);
      } else {
        showToast('Error updating employee status', 'error');
      }
    } catch (error) {
      showToast('Error updating employee status', 'error');
      console.error('Error updating employee status:', error);
    } finally {
      document.getElementById('bulkActions').value = '';
    }
  };

  // Sidebar functions - Removed

  const breadcrumbs = [
    { label: isArabic ? 'لوحة التحكم' : 'Dashboard', href: '#' },
    { label: isArabic ? 'الموارد البشرية' : 'Human Resources', href: '#' },
    { label: isArabic ? 'الموظفين' : 'Employees', active: true }
  ];

  const statsSection = (
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
          <div className="stat-label">Total Employees</div>
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
          <div className="stat-label">Active Employees</div>
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
          <span className="material-icons-outlined">business</span>
        </div>
        <div className="stat-content">
          <div className="stat-value">{stats.totalDepartments}</div>
          <div className="stat-label">Departments</div>
        </div>
      </div>
    </div>
  );
  
  return (
    <AdminLayout activeMenu="Employees">
      <Head title={isArabic ? 'إدارة الموظفين' : 'Employees Management'} />

      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="employees-card fade-in">
          <div className="card-header">
            <h3>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</h3>
            <button className="btn btn-outline" onClick={handleCancel}>
              <span className="material-icons-outlined">arrow_back</span>
              <span>Back to List</span>
            </button>
          </div>
          <div className="card-body" style={{ padding: '20px' }}>
            <form id="employeeForm" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">First Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    placeholder="Enter first name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    placeholder="Enter last name"
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
                    {!['admin', 'supplier', 'customer', 'employee'].includes(formData.role) && formData.role && (
                      <option value={formData.role}>{formData.role}</option>
                    )}
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                    <option value="supplier">Supplier</option>
                    <option value="customer">Customer</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <select
                    className="form-control"
                    id="department"
                    value={selectedDepartmentId}
                    onChange={handleDepartmentSelect}
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {isArabic ? d.name_ar : d.name_en}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Position *</label>
                  <select
                    className="form-control"
                    id="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    required
                    disabled={professions.length === 0}
                  >
                    <option value="">Select Position</option>
                    {professions.map((p) => (
                      <option key={p.id} value={p.profession_name}>
                        {p.profession_name}
                      </option>
                    ))}
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
                  <label className="form-label">Salary ($)</label>
                  <input
                    type="number"
                    className="form-control"
                    id="salary"
                    value={formData.salary}
                    onChange={handleInputChange}
                    placeholder="Enter salary"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nationality</label>
                  <select
                    className="form-control"
                    id="nationality"
                    value={formData.nationality}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Nationality</option>
                    <option value="egyptian">Egyptian</option>
                    <option value="american">American</option>
                    <option value="british">British</option>
                    <option value="saudi">Saudi Arabian</option>
                    <option value="emirati">Emirati</option>
                    <option value="indian">Indian</option>
                    <option value="pakistani">Pakistani</option>
                    <option value="french">French</option>
                  </select>
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

              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea
                  className="form-control form-textarea"
                  id="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter address"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-control form-textarea"
                  id="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Enter any additional notes"
                  rows="3"
                />
              </div>
              
              <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn" onClick={handleCancel}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  {editingEmployee ? 'Update' : 'Save'} Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Employee Modal */}
      {viewModalOpen && viewingEmployee && (
        <div className="modal-overlay active">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Employee Details</h3>
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
                        alt={`${viewingEmployee.first_name} ${viewingEmployee.last_name}`}
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
                    <h4>
                      {viewingEmployee.first_name} {viewingEmployee.last_name}
                    </h4>
                    <p>{viewingEmployee.position}</p>
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
                    <span className="detail-label">Department:</span>
                    <span className="detail-value">
                      {departmentNames[viewingEmployee.department] ||
                        viewingEmployee.department}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Hire Date:</span>
                    <span className="detail-value">
                      {formatDate(viewingEmployee.hire_date)}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Salary:</span>
                    <span className="detail-value">
                      ${viewingEmployee.salary?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Nationality:</span>
                    <span className="detail-value">
                      {nationalityNames[viewingEmployee.nationality] ||
                        viewingEmployee.nationality ||
                        'N/A'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Address:</span>
                    <span className="detail-value">
                      {viewingEmployee.address || 'N/A'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Notes:</span>
                    <span className="detail-value">
                      {viewingEmployee.notes || 'None'}
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
                Edit Employee
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
                Are you sure you want to delete employee "
                {deleteItem.first_name} {deleteItem.last_name}"? This action
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
                Delete Employee
              </button>
            </div>
          </div>
        </div>
      )}

      {!showForm && (
        <BlankPage 
          breadcrumbs={breadcrumbs}
          stats={statsSection}
        >

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
                placeholder="Search employees..."
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
              <span>Add Employee</span>
            </button>
            <button
              className="btn btn-outline"
              onClick={() => showToast('Employees list refreshed!', 'success')}
            >
              <span className="material-icons-outlined">refresh</span>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <Table 
          tableData={tableData}
          columns={columns}
          handleRowSelect={handleRowSelect}
          selectAll={selectedIds.length === (paginatedEmployees || []).length && (paginatedEmployees || []).length > 0}
          handleSelectAll={handleSelectAll}
          onView={(emp) => viewEmployee(emp)}
          onEdit={(emp) => handleAddEdit(emp)}
          onDelete={(emp) => deleteEmployee(emp)}
          viewTitle={isArabic ? "عرض" : "View"}
          editTitle={isArabic ? "تعديل" : "Edit"}
          deleteTitle={isArabic ? "حذف" : "Delete"}
        />

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
    </BlankPage>
  )}
</AdminLayout>
);
};

export default EmployeesManagement;
