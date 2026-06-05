import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import Table from '../components/Table';
import BlankPage from '@/Components/BlankPage';
import '../../../../css/backend/main.scss';
import { apiService } from '../../../services/api';

const TrafficViolations = ({ employees: propEmployees }) => {
  const { props } = usePage();
  const localization = props?.localization;
  const isArabic = localization?.current_locale === 'ar';
  const [dbEmployees, setDbEmployees] = useState([]);
  const [violations, setViolations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  // Form data state
  const [formData, setFormData] = useState({
    employee_id: '',
    vehiclePlate: '',
    vehicleType: '',
    driverLicense: '',
    violationType: '',
    severity: 'medium',
    violationDate: new Date().toISOString().slice(0, 16),
    fineAmount: '',
    location: '',
    officerId: '',
    status: 'pending',
    points: '',
    description: '',
    evidenceNotes: '',
  });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getLocalizedRoute = useCallback((name, params = {}) => {
    try {
      return route(name, {
        country: localization?.country_code || 'sa',
        lang: localization?.current_locale || 'ar',
        ...params
      });
    } catch {
      return '#';
    }
  }, [localization]);

  useEffect(() => {
    const propData = propEmployees?.data || propEmployees;
    if (!propData || !Array.isArray(propData) || propData.length === 0) {
      apiService.get('/employees')
        .then(response => {
          const data = response.data;
          const employeeData = data.data || data;
          setDbEmployees(Array.isArray(employeeData) ? employeeData : []);
        })
        .catch(error => console.error('Error fetching employees:', error));
    }
  }, [propEmployees]);

  const employeesData = propEmployees?.data || (Array.isArray(propEmployees) ? propEmployees : (Array.isArray(dbEmployees) ? dbEmployees : []));

  const fetchViolations = useCallback(async () => {
    try {
      const response = await apiService.get('/traffic-violations');
      setViolations(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching violations:', error);
      showToast('Error loading violations data', 'error');
    }
  }, []);

  useEffect(() => {
    fetchViolations();
  }, [fetchViolations]);

  const filteredViolations = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    return violations.filter(v =>
      v.vehiclePlate.toLowerCase().includes(lowerSearch) ||
      (v.driverName || '').toLowerCase().includes(lowerSearch) ||
      v.location.toLowerCase().includes(lowerSearch)
    );
  }, [searchTerm, violations]);

  const stats = useMemo(() => ({
    total: violations.length,
    pending: violations.filter(v => v.status === 'pending').length,
    highSeverity: violations.filter(v => v.severity === 'high').length,
    totalFines: violations.reduce((sum, v) => sum + (parseFloat(v.fineAmount) || 0), 0)
  }), [violations]);

  const handleAdd = () => {
    setEditingId(null);
    setFormData({
      employee_id: '',
      vehiclePlate: '',
      vehicleType: '',
      driverLicense: '',
      violationType: '',
      severity: 'medium',
      violationDate: new Date().toISOString().slice(0, 16),
      fineAmount: '',
      location: '',
      officerId: '',
      status: 'pending',
      points: '',
      description: '',
      evidenceNotes: '',
    });
    setShowForm(true);
  };

  const handleEdit = (violation) => {
    setEditingId(violation.id);
    setFormData({
      employee_id: violation.employee_id,
      vehiclePlate: violation.vehiclePlate,
      vehicleType: violation.vehicleType,
      driverLicense: violation.driverLicense || '',
      violationType: violation.violationType,
      severity: violation.severity,
      violationDate: violation.violationDate,
      fineAmount: violation.fineAmount || '',
      location: violation.location,
      officerId: violation.officerId || '',
      status: violation.status,
      points: violation.points || '',
      description: violation.description || '',
      evidenceNotes: violation.evidenceNotes || '',
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.vehiclePlate || !formData.employee_id || !formData.violationType || !formData.location) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      if (editingId) {
        await apiService.put(`/traffic-violations/${editingId}`, formData);
        showToast('Violation updated successfully!', 'success');
      } else {
        await apiService.post('/traffic-violations', formData);
        showToast('Violation added successfully!', 'success');
      }
      fetchViolations();
      handleCancel();
    } catch (error) {
      console.error('Error saving violation:', error);
      showToast('Error saving violation record', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this violation record?')) {
      try {
        await apiService.delete(`/traffic-violations/${id}`);
        showToast('Violation deleted successfully!', 'success');
        fetchViolations();
      } catch (error) {
        console.error('Error deleting violation:', error);
        showToast('Error deleting violation record', 'error');
      }
    }
  };

  const handleRowSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredViolations.length && filteredViolations.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredViolations.map(v => v.id));
    }
  };

  const columns = useMemo(() => [
    { 
      header: 'ID', 
      key: 'id', 
      sortable: true,
      render: (row) => row.id.toString().padStart(3, '0')
    },
    { 
      header: 'VEHICLE', 
      key: 'vehiclePlate', 
      sortable: true,
      render: (row) => (
        <div className="employee-info">
          <div className="employee-avatar">
            <span className="material-icons-outlined" style={{ color: '#94a3b8' }}>
              {row.vehicleType === 'motorcycle' ? 'two_wheeler' : 'directions_car'}
            </span>
          </div>
          <div className="employee-details">
            <div className="employee-name" style={{ fontWeight: 600 }}>{row.vehiclePlate}</div>
            <div className="employee-position" style={{ fontSize: '0.8rem', color: '#64748b' }}>{row.vehicleType}</div>
          </div>
        </div>
      )
    },
    { 
      header: 'DRIVER', 
      key: 'driverName', 
      sortable: true,
      render: (row) => (
        <div className="employee-details">
          <div className="employee-name">{row.driverName}</div>
          <div className="employee-position" style={{ fontSize: '0.8rem', color: '#64748b' }}>{row.driverLicense || 'No license'}</div>
        </div>
      )
    },
    { 
      header: 'VIOLATION', 
      key: 'violationType', 
      render: (row) => <span className="department-badge">{row.violationType}</span>
    },
    { 
      header: 'SEVERITY', 
      key: 'severity', 
      render: (row) => (
        <span className={`employee-status status-${row.severity}`}>
          {row.severity.charAt(0).toUpperCase() + row.severity.slice(1)}
        </span>
      )
    },
    { 
      header: 'FINE', 
      key: 'fineAmount', 
      sortable: true,
      render: (row) => <div className="salary-display">${(row.fineAmount || 0).toLocaleString()}</div>
    },
    { 
      header: 'STATUS', 
      key: 'status', 
      sortable: true,
      render: (row) => (
        <span className={`employee-status status-${row.status.toLowerCase()}`}>
          {row.status}
        </span>
      )
    }
  ], []);

  const breadcrumbs = [
    { label: isArabic ? 'لوحة التحكم' : 'Dashboard', href: getLocalizedRoute('admin.dashboard') },
    { label: isArabic ? 'إدارة المرور' : 'Traffic Management', href: '#' },
    { label: isArabic ? 'المخالفات' : 'Violations', active: true }
  ];

  return (
    <AdminLayout activeMenu="Traffic Violations">
      <Head title="Traffic Violations" />
      
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      <BlankPage
        breadcrumbs={breadcrumbs}
        stats={!showForm && (
          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: 'var(--info-color)' }}>
                <span className="material-icons-outlined">local_police</span>
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">Total Violations</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: 'var(--warning-color)' }}>
                <span className="material-icons-outlined">pending</span>
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.pending}</div>
                <div className="stat-label">Pending</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: 'var(--danger-color)' }}>
                <span className="material-icons-outlined">warning</span>
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.highSeverity}</div>
                <div className="stat-label">High Severity</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: 'var(--success-color)' }}>
                <span className="material-icons-outlined">attach_money</span>
              </div>
              <div className="stat-content">
                <div className="stat-value">${stats.totalFines.toLocaleString()}</div>
                <div className="stat-label">Total Fines</div>
              </div>
            </div>
          </div>
        )}
      >
        {showForm ? (
          <div className="employees-card fade-in">
            <div className="card-header">
              <h3>{editingId ? 'Edit Violation Record' : 'Add New Violation'}</h3>
              <button className="btn btn-outline" onClick={handleCancel}>
                <span className="material-icons-outlined">arrow_back</span>
                <span>Back to List</span>
              </button>
            </div>
            <div className="card-body" style={{ padding: '20px' }}>
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Vehicle Plate *</label>
                    <input
                      type="text"
                      className="form-control"
                      name="vehiclePlate"
                      value={formData.vehiclePlate}
                      onChange={handleInputChange}
                      placeholder="e.g., ABC-123"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vehicle Type *</label>
                    <select
                      className="form-control"
                      name="vehicleType"
                      value={formData.vehicleType}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Type</option>
                      <option value="car">Car</option>
                      <option value="truck">Truck</option>
                      <option value="motorcycle">Motorcycle</option>
                      <option value="bus">Bus</option>
                      <option value="van">Van</option>
                      <option value="taxi">Taxi</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Driver Name *</label>
                    <select
                      className="form-control"
                      name="employee_id"
                      value={formData.employee_id}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Employee</option>
                      {Array.isArray(employeesData) && employeesData.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Driver License</label>
                    <input
                      type="text"
                      className="form-control"
                      name="driverLicense"
                      value={formData.driverLicense}
                      onChange={handleInputChange}
                      placeholder="Enter license number"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Violation Type *</label>
                    <select
                      className="form-control"
                      name="violationType"
                      value={formData.violationType}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Type</option>
                      <option value="speeding">Speeding</option>
                      <option value="red-light">Red Light Violation</option>
                      <option value="parking">Illegal Parking</option>
                      <option value="seatbelt">No Seatbelt</option>
                      <option value="license">License Violation</option>
                      <option value="phone">Mobile Phone Use</option>
                      <option value="dui">DUI</option>
                      <option value="reckless">Reckless Driving</option>
                      <option value="equipment">Equipment Violation</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Severity *</label>
                    <select
                      className="form-control"
                      name="severity"
                      value={formData.severity}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Violation Date *</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      name="violationDate"
                      value={formData.violationDate}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fine Amount ($) *</label>
                    <input
                      type="number"
                      className="form-control"
                      name="fineAmount"
                      value={formData.fineAmount}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Location *</label>
                    <input
                      type="text"
                      className="form-control"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="Enter violation location"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-control"
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="disputed">Disputed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control form-textarea"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter violation details..."
                    style={{ minHeight: '100px' }}
                  />
                </div>

                <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn btn-primary">
                    {editingId ? 'Update Violation' : 'Save Violation'}
                  </button>
                  <button type="button" className="btn btn-outline" onClick={handleCancel}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="employees-card fade-in">
            <Table
              showToolbar={true}
              toolbarSearch={true}
              toolbarSearchValue={searchTerm}
              onToolbarSearch={setSearchTerm}
              showAddButton={true}
              addButtonText="Add Violation"
              onAdd={handleAdd}
              showRefreshButton={true}
              onRefresh={() => {
                fetchViolations();
                showToast('Violations list refreshed!', 'success');
              }}
              tableData={filteredViolations}
              columns={columns}
              handleRowSelect={handleRowSelect}
              selectAll={selectedIds.length === filteredViolations.length && filteredViolations.length > 0}
              handleSelectAll={handleSelectAll}
              onEdit={handleEdit}
              onDelete={(row) => handleDelete(row.id)}
            />
          </div>
        )}
      </BlankPage>
    </AdminLayout>
  );
};

export default TrafficViolations;
