import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/TrafficViolations.css';

// Toast component
const Toast = ({ toasts, removeToast }) => {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          style={{
            animation: 'slideIn 0.3s ease, fadeOut 0.5s ease 2.5s forwards',
          }}
        >
          {toast.message}
          <button className="toast-close" onClick={() => removeToast(toast.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

const TrafficViolations = () => {
  // State for modal visibility
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingViolationId, setEditingViolationId] = useState(null);
  const [violations, setViolations] = useState([
    {
      id: 1,
      vehiclePlate: 'ABC-123',
      vehicleType: 'car',
      driverName: 'Ahmed Mohamed',
      driverLicense: 'DL-7890123',
      violationType: 'speeding',
      severity: 'high',
      violationDate: '2024-01-15T14:30:00',
      fineAmount: 150,
      location: 'Main Street, Downtown',
      officerId: 'OFF-456',
      status: 'pending',
      points: 4,
      description: 'Exceeded speed limit by 25 km/h in school zone',
      evidenceNotes: 'Radar gun reading: 75 km/h in 50 km/h zone',
      createdAt: '2024-01-15',
    },
    {
      id: 2,
      vehiclePlate: 'XYZ-789',
      vehicleType: 'truck',
      driverName: 'Sarah Johnson',
      driverLicense: 'DL-4567890',
      violationType: 'red-light',
      severity: 'high',
      violationDate: '2024-01-14T09:15:00',
      fineAmount: 200,
      location: 'Central Intersection',
      officerId: 'OFF-123',
      status: 'paid',
      points: 6,
      description: 'Ran red light at busy intersection',
      evidenceNotes: 'Traffic camera footage available',
      createdAt: '2024-01-14',
    },
    {
      id: 3,
      vehiclePlate: 'DEF-456',
      vehicleType: 'motorcycle',
      driverName: 'James Wilson',
      driverLicense: 'DL-1234567',
      violationType: 'parking',
      severity: 'low',
      violationDate: '2024-01-13T16:45:00',
      fineAmount: 75,
      location: 'No Parking Zone, Market St.',
      officerId: 'OFF-789',
      status: 'paid',
      points: 1,
      description: 'Illegal parking in no parking zone',
      evidenceNotes: 'Photo evidence taken',
      createdAt: '2024-01-13',
    },
    {
      id: 4,
      vehiclePlate: 'GHI-789',
      vehicleType: 'car',
      driverName: 'Fatima Al-Mansour',
      driverLicense: 'DL-8901234',
      violationType: 'seatbelt',
      severity: 'medium',
      violationDate: '2024-01-12T11:20:00',
      fineAmount: 100,
      location: 'Highway 1, Exit 5',
      officerId: 'OFF-234',
      status: 'disputed',
      points: 2,
      description: 'Driver not wearing seatbelt',
      evidenceNotes: 'Driver claims medical exemption',
      createdAt: '2024-01-12',
    },
    {
      id: 5,
      vehiclePlate: 'JKL-012',
      vehicleType: 'bus',
      driverName: 'Mohammed Al-Farsi',
      driverLicense: 'DL-5678901',
      violationType: 'license',
      severity: 'high',
      violationDate: '2024-01-11T08:45:00',
      fineAmount: 300,
      location: 'Bus Terminal',
      officerId: 'OFF-567',
      status: 'pending',
      points: 8,
      description: 'Expired commercial license',
      evidenceNotes: 'License expired 3 months ago',
      createdAt: '2024-01-11',
    },
    {
      id: 6,
      vehiclePlate: 'MNO-345',
      vehicleType: 'car',
      driverName: 'Priya Sharma',
      driverLicense: 'DL-2345678',
      violationType: 'phone',
      severity: 'medium',
      violationDate: '2024-01-10T17:30:00',
      fineAmount: 125,
      location: 'City Center Roundabout',
      officerId: 'OFF-890',
      status: 'paid',
      points: 3,
      description: 'Using mobile phone while driving',
      evidenceNotes: 'Clear visual confirmation',
      createdAt: '2024-01-10',
    },
    {
      id: 7,
      vehiclePlate: 'PQR-678',
      vehicleType: 'van',
      driverName: 'Ali Khan',
      driverLicense: 'DL-9012345',
      violationType: 'dui',
      severity: 'high',
      violationDate: '2024-01-09T22:15:00',
      fineAmount: 500,
      location: 'Nightclub District',
      officerId: 'OFF-345',
      status: 'pending',
      points: 12,
      description: 'Driving under influence',
      evidenceNotes: 'Breathalyzer test positive',
      createdAt: '2024-01-09',
    },
    {
      id: 8,
      vehiclePlate: 'STU-901',
      vehicleType: 'taxi',
      driverName: 'Marie Dubois',
      driverLicense: 'DL-6789012',
      violationType: 'insurance',
      severity: 'medium',
      violationDate: '2024-01-08T13:10:00',
      fineAmount: 250,
      location: 'Airport Taxi Stand',
      officerId: 'OFF-678',
      status: 'cancelled',
      points: 4,
      description: 'No valid insurance proof',
      evidenceNotes: 'Insurance found valid upon review',
      createdAt: '2024-01-08',
    },
  ]);

  // State for form data
  const [formData, setFormData] = useState({
    vehiclePlate: '',
    vehicleType: '',
    driverName: '',
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

  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedViolations, setSelectedViolations] = useState([]);
  const [bulkAction, setBulkAction] = useState('Bulk Actions');

  // State for toast notifications
  const [toasts, setToasts] = useState([]);
  let toastId = 0;

  // Violation type names mapping
  const violationTypeNames = {
    speeding: 'Speeding',
    'red-light': 'Red Light',
    parking: 'Illegal Parking',
    seatbelt: 'No Seatbelt',
    license: 'License Violation',
    insurance: 'No Insurance',
    phone: 'Mobile Phone Use',
    dui: 'DUI',
    reckless: 'Reckless Driving',
    equipment: 'Equipment Violation',
  };

  // Toast notification functions
  const showToast = (message, type = 'info') => {
    const id = toastId++;
    const newToast = { id, message, type };
    setToasts((prev) => [...prev, newToast]);

    // Auto remove toast after 3 seconds
    setTimeout(() => {
      removeToast(id);
    }, 3000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Vehicle type names mapping
  const vehicleTypeNames = {
    car: 'Car',
    truck: 'Truck',
    motorcycle: 'Motorcycle',
    bus: 'Bus',
    van: 'Van',
    taxi: 'Taxi',
  };

  // Status names mapping
  const statusNames = {
    pending: 'Pending',
    paid: 'Paid',
    disputed: 'Disputed',
    cancelled: 'Cancelled',
  };

  // Initialize the page
  useEffect(() => {
    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  // Calculate statistics
  const totalViolations = violations.length;
  const pendingViolations = violations.filter(
    (v) => v.status === 'pending'
  ).length;
  const highSeverity = violations.filter((v) => v.severity === 'high').length;
  const totalFines = violations.reduce((sum, v) => sum + v.fineAmount, 0);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Open modal for adding new violation
  const openAddModal = () => {
    setEditingViolationId(null);
    setFormData({
      vehiclePlate: '',
      vehicleType: '',
      driverName: '',
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
    setIsModalOpen(true);
  };

  // Open modal for editing violation
  const openEditModal = (violation) => {
    setEditingViolationId(violation.id);
    setFormData({
      vehiclePlate: violation.vehiclePlate,
      vehicleType: violation.vehicleType,
      driverName: violation.driverName,
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
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Save violation (add or update)
  const saveViolation = () => {
    if (
      !formData.vehiclePlate ||
      !formData.driverName ||
      !formData.violationType ||
      !formData.location
    ) {
      showToast(
        'Please fill in all required fields: Vehicle Plate, Driver Name, Violation Type, and Location',
        'error'
      );
      return;
    }

    if (editingViolationId) {
      // Update existing violation
      setViolations((prev) =>
        prev.map((v) =>
          v.id === editingViolationId
            ? { ...formData, id: editingViolationId }
            : v
        )
      );
      showToast('Violation updated successfully!', 'success');
    } else {
      // Add new violation
      const newId =
        violations.length > 0
          ? Math.max(...violations.map((v) => v.id)) + 1
          : 1;
      setViolations((prev) => [...prev, { ...formData, id: newId }]);
      showToast('Violation added successfully!', 'success');
    }

    closeModal();
  };

  // Delete violation
  const deleteViolation = (id) => {
    if (
      window.confirm(
        'Are you sure you want to delete this violation record? This action cannot be undone.'
      )
    ) {
      setViolations((prev) => prev.filter((v) => v.id !== id));
      showToast('Violation deleted successfully!', 'success');
    }
  };

  // Mark violation as paid
  const markAsPaid = (id) => {
    setViolations((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: 'paid' } : v))
    );
  };

  // View violation details
  const viewViolation = (id) => {
    const violation = violations.find((v) => v.id === id);
    if (violation) {
      const violationDate = new Date(violation.violationDate);
      const formattedDate =
        violationDate.toLocaleDateString() +
        ' ' +
        violationDate.toLocaleTimeString();

      const details =
        `ID: ${violation.id}\n` +
        `Vehicle: ${violation.vehiclePlate} (${vehicleTypeNames[violation.vehicleType]})\n` +
        `Driver: ${violation.driverName}\n` +
        `License: ${violation.driverLicense || 'N/A'}\n` +
        `Violation: ${violationTypeNames[violation.violationType]}\n` +
        `Severity: ${violation.severity}\n` +
        `Date & Time: ${formattedDate}\n` +
        `Location: ${violation.location}\n` +
        `Fine: $${violation.fineAmount.toLocaleString()}\n` +
        `Points Deducted: ${violation.points}\n` +
        `Status: ${statusNames[violation.status]}\n` +
        `Officer ID: ${violation.officerId || 'N/A'}\n\n` +
        `Description: ${violation.description || 'No description'}\n\n` +
        `Evidence/Notes: ${violation.evidenceNotes || 'No additional notes'}`;

      // Show details in a toast
      showToast('Violation details logged to console', 'info');
    }
  };

  // Handle bulk action
  const handleBulkAction = () => {
    if (selectedViolations.length === 0) {
      showToast('Please select at least one violation.', 'error');
      return;
    }

    if (bulkAction.startsWith('mark-')) {
      const newStatus = bulkAction.replace('mark-', '');
      setViolations((prev) =>
        prev.map((v) =>
          selectedViolations.includes(v.id) ? { ...v, status: newStatus } : v
        )
      );
      showToast(
        `${selectedViolations.length} violation(s) marked as ${newStatus}!`,
        'success'
      );
    } else if (bulkAction === 'delete') {
      if (
        window.confirm(
          `Are you sure you want to delete ${selectedViolations.length} selected violation(s)?`
        )
      ) {
        setViolations((prev) =>
          prev.filter((v) => !selectedViolations.includes(v.id))
        );
        showToast(
          `${selectedViolations.length} violation(s) deleted!`,
          'success'
        );
      } else {
        return;
      }
    }

    setSelectedViolations([]);
    setBulkAction('Bulk Actions');
  };

  // Handle search
  const handleSearch = () => {
    // Search functionality is handled in the filteredViolations calculation
  };

  // Handle date filter
  const handleDateFilter = () => {
    // Date filter functionality is handled in the filteredViolations calculation
  };

  // Clear date filter
  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  // Toggle select all violations
  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedViolations(filteredViolations.map((v) => v.id));
    } else {
      setSelectedViolations([]);
    }
  };

  // Toggle individual violation selection
  const toggleSelectViolation = (id) => {
    setSelectedViolations((prev) =>
      prev.includes(id) ? prev.filter((vId) => vId !== id) : [...prev, id]
    );
  };

  // Filter violations based on search term and date range
  const filteredViolations = violations.filter((violation) => {
    // Apply search filter
    const matchesSearch =
      !searchTerm ||
      violation.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      violation.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      violation.driverLicense
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      violation.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (violationTypeNames[violation.violationType] &&
        violationTypeNames[violation.violationType]
          .toLowerCase()
          .includes(searchTerm.toLowerCase()));

    // Apply date filter
    const violationDate = new Date(violation.violationDate);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const matchesDate =
      (!start || violationDate >= start) &&
      (!end || violationDate <= new Date(end + 'T23:59:59'));

    return matchesSearch && matchesDate;
  });

  // Render violation severity badge
  const renderSeverityBadge = (severity) => {
    let className = 'violation-severity ';
    switch (severity) {
      case 'low':
        className += 'severity-low';
        break;
      case 'medium':
        className += 'severity-medium';
        break;
      case 'high':
        className += 'severity-high';
        break;
      default:
        className += 'severity-low';
    }
    return (
      <span className={className}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </span>
    );
  };

  // Render violation status badge
  const renderStatusBadge = (status) => {
    let className = 'violation-status ';
    switch (status) {
      case 'pending':
        className += 'status-pending';
        break;
      case 'paid':
        className += 'status-paid';
        break;
      case 'disputed':
        className += 'status-disputed';
        break;
      case 'cancelled':
        className += 'status-cancelled';
        break;
      default:
        className += 'status-pending';
    }
    return <span className={className}>{statusNames[status] || status}</span>;
  };

  // Render violation type badge
  const renderViolationTypeBadge = (type) => {
    let className = `violation-type-badge type-${type}`;
    return (
      <span className={className}>{violationTypeNames[type] || type}</span>
    );
  };

  return (
    <AdminLayout activeMenu="Traffic Violations">
      {/* Content */}
      <main className="content">
        <div className="breadcrumb">
          <a href="#">Dashboard</a>
          <span>/</span>
          <a href="#">Traffic Management</a>
          <span>/</span>
          <span>Violations</span>
        </div>

        {/* Quick Stats */}
        <div className="stats-cards">
          <div className="stat-card">
            <div
              className="stat-icon"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              <span className="material-icons-outlined">local_police</span>
            </div>
            <div className="stat-content">
              <div className="stat-value">{totalViolations}</div>
              <div className="stat-label">Total Violations</div>
            </div>
          </div>
          <div className="stat-card">
            <div
              className="stat-icon"
              style={{ backgroundColor: 'var(--warning-color)' }}
            >
              <span className="material-icons-outlined">pending</span>
            </div>
            <div className="stat-content">
              <div className="stat-value">{pendingViolations}</div>
              <div className="stat-label">Pending</div>
            </div>
          </div>
          <div className="stat-card">
            <div
              className="stat-icon"
              style={{ backgroundColor: 'var(--danger-color)' }}
            >
              <span className="material-icons-outlined">warning</span>
            </div>
            <div className="stat-content">
              <div className="stat-value">{highSeverity}</div>
              <div className="stat-label">High Severity</div>
            </div>
          </div>
          <div className="stat-card">
            <div
              className="stat-icon"
              style={{ backgroundColor: 'var(--success-color)' }}
            >
              <span className="material-icons-outlined">attach_money</span>
            </div>
            <div className="stat-content">
              <div className="stat-value">${totalFines.toLocaleString()}</div>
              <div className="stat-label">Total Fines</div>
            </div>
          </div>
        </div>

        {/* Date Filter */}
        <div
          className="violations-card"
          style={{ marginBottom: '16px', padding: '16px' }}
        >
          <div className="date-filter">
            <span style={{ fontWeight: 500, color: 'var(--dark-color)' }}>
              Filter by Date:
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <button className="btn btn-outline" onClick={handleDateFilter}>
              <span className="material-icons-outlined">filter_alt</span>
              <span>Apply Filter</span>
            </button>
            <button className="btn" onClick={clearDateFilter}>
              <span className="material-icons-outlined">clear</span>
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Main Card */}
        <div className="violations-card fade-in">
          <div className="card-header">
            <div className="violations-actions">
              <select
                className="btn btn-outline"
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
              >
                <option>Bulk Actions</option>
                <option value="mark-paid">Mark as Paid</option>
                <option value="mark-disputed">Mark as Disputed</option>
                <option value="mark-pending">Mark as Pending</option>
                <option value="delete">Delete Selected</option>
              </select>
              <button className="btn btn-outline" onClick={handleBulkAction}>
                <span className="material-icons-outlined">play_arrow</span>
                <span>Apply</span>
              </button>
              <div className="search-bar light">
                <input
                  type="text"
                  placeholder="Search violations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button onClick={handleSearch}>
                  <span className="material-icons-outlined">search</span>
                </button>
              </div>
            </div>
            <div className="actions">
              <button className="btn btn-primary" onClick={openAddModal}>
                <span className="material-icons-outlined">add</span>
                <span>Add Violation</span>
              </button>
              <button className="btn btn-outline">
                <span className="material-icons-outlined">refresh</span>
                <span>Refresh</span>
              </button>
              <button className="btn btn-outline">
                <span className="material-icons-outlined">download</span>
                <span>Export</span>
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
                      checked={
                        selectedViolations.length ===
                          filteredViolations.length &&
                        filteredViolations.length > 0
                      }
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th>
                    ID{' '}
                    <span
                      className="material-icons-outlined"
                      style={{ fontSize: '16px' }}
                    >
                      arrow_drop_down
                    </span>
                  </th>
                  <th>
                    VEHICLE{' '}
                    <span
                      className="material-icons-outlined"
                      style={{ fontSize: '16px' }}
                    >
                      arrow_drop_down
                    </span>
                  </th>
                  <th>
                    DRIVER{' '}
                    <span
                      className="material-icons-outlined"
                      style={{ fontSize: '16px' }}
                    >
                      arrow_drop_down
                    </span>
                  </th>
                  <th>
                    VIOLATION{' '}
                    <span
                      className="material-icons-outlined"
                      style={{ fontSize: '16px' }}
                    >
                      arrow_drop_down
                    </span>
                  </th>
                  <th>
                    LOCATION{' '}
                    <span
                      className="material-icons-outlined"
                      style={{ fontSize: '16px' }}
                    >
                      arrow_drop_down
                    </span>
                  </th>
                  <th>
                    SEVERITY{' '}
                    <span
                      className="material-icons-outlined"
                      style={{ fontSize: '16px' }}
                    >
                      arrow_drop_down
                    </span>
                  </th>
                  <th>
                    FINE{' '}
                    <span
                      className="material-icons-outlined"
                      style={{ fontSize: '16px' }}
                    >
                      arrow_drop_down
                    </span>
                  </th>
                  <th>
                    DATE{' '}
                    <span
                      className="material-icons-outlined"
                      style={{ fontSize: '16px' }}
                    >
                      arrow_drop_down
                    </span>
                  </th>
                  <th>
                    STATUS{' '}
                    <span
                      className="material-icons-outlined"
                      style={{ fontSize: '16px' }}
                    >
                      arrow_drop_down
                    </span>
                  </th>
                  <th>OPERATIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredViolations.map((violation) => {
                  const violationDate = new Date(violation.violationDate);
                  const formattedDate =
                    violationDate.toLocaleDateString() +
                    ' ' +
                    violationDate.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                  return (
                    <tr key={violation.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedViolations.includes(violation.id)}
                          onChange={() => toggleSelectViolation(violation.id)}
                        />
                      </td>
                      <td>{violation.id.toString().padStart(3, '0')}</td>
                      <td>
                        <div className="vehicle-info">
                          <div className="vehicle-icon">
                            <span className="material-icons-outlined">
                              {violation.vehicleType === 'motorcycle'
                                ? 'two_wheeler'
                                : 'directions_car'}
                            </span>
                          </div>
                          <div className="vehicle-details">
                            <div className="vehicle-plate">
                              {violation.vehiclePlate}
                            </div>
                            <div className="vehicle-type">
                              {vehicleTypeNames[violation.vehicleType] ||
                                violation.vehicleType}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>
                          {violation.driverName}
                        </div>
                        <div
                          style={{
                            fontSize: '0.8rem',
                            color: 'var(--gray-color)',
                          }}
                        >
                          {violation.driverLicense || 'No license'}
                        </div>
                      </td>
                      <td>
                        {renderViolationTypeBadge(violation.violationType)}
                      </td>
                      <td>
                        <span className="location-badge">
                          {violation.location}
                        </span>
                      </td>
                      <td>{renderSeverityBadge(violation.severity)}</td>
                      <td>
                        <div className="fine-display">
                          ${violation.fineAmount.toLocaleString()}
                        </div>
                      </td>
                      <td>{formattedDate}</td>
                      <td>{renderStatusBadge(violation.status)}</td>
                      <td>
                        <button
                          className="icon-btn edit"
                          onClick={() => openEditModal(violation)}
                        >
                          <span className="material-icons-outlined">edit</span>
                        </button>
                        <button
                          className="icon-btn delete"
                          onClick={() => deleteViolation(violation.id)}
                        >
                          <span className="material-icons-outlined">
                            delete
                          </span>
                        </button>
                        <button
                          className="icon-btn"
                          style={{ color: 'var(--info-color)' }}
                          onClick={() => viewViolation(violation.id)}
                        >
                          <span className="material-icons-outlined">
                            visibility
                          </span>
                        </button>
                        {violation.status === 'pending' && (
                          <button
                            className="icon-btn"
                            style={{ color: 'var(--success-color)' }}
                            onClick={() => markAsPaid(violation.id)}
                          >
                            <span className="material-icons-outlined">
                              check_circle
                            </span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <div className="pagination-info">
              <select className="select-dropdown">
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span>
                Show from 1 to {Math.min(10, filteredViolations.length)} in
                <span
                  style={{
                    backgroundColor: '#64748b',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 600,
                  }}
                >
                  {filteredViolations.length}
                </span>{' '}
                records
              </span>
            </div>
            <div className="pagination-controls">
              <button className="page-btn">« Previous</button>
              <button className="page-btn active">1</button>
              <button className="page-btn">2</button>
              <button className="page-btn">Next »</button>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="modal-overlay active">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingViolationId ? 'Edit Violation' : 'Add New Violation'}
              </h3>
              <button className="modal-close" onClick={closeModal}>
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            <div className="modal-body">
              <form id="violationForm">
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
                    <input
                      type="text"
                      className="form-control"
                      name="driverName"
                      value={formData.driverName}
                      onChange={handleInputChange}
                      placeholder="Enter driver name"
                      required
                    />
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
                      <option value="insurance">No Insurance</option>
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
                    <label className="form-label">Fine Amount ($)</label>
                    <input
                      type="number"
                      className="form-control"
                      name="fineAmount"
                      value={formData.fineAmount}
                      onChange={handleInputChange}
                      placeholder="Enter fine amount"
                      min="0"
                      step="0.01"
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
                    <label className="form-label">Officer ID</label>
                    <input
                      type="text"
                      className="form-control"
                      name="officerId"
                      value={formData.officerId}
                      onChange={handleInputChange}
                      placeholder="Enter officer ID"
                    />
                  </div>
                </div>

                <div className="form-row">
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
                  <div className="form-group">
                    <label className="form-label">Points Deducted</label>
                    <input
                      type="number"
                      className="form-control"
                      name="points"
                      value={formData.points}
                      onChange={handleInputChange}
                      placeholder="License points"
                      min="0"
                      max="12"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control form-textarea"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter violation details"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Evidence Notes</label>
                  <textarea
                    className="form-control form-textarea"
                    name="evidenceNotes"
                    value={formData.evidenceNotes}
                    onChange={handleInputChange}
                    placeholder="Enter evidence or notes"
                  />
                </div>
              </form>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={closeModal}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={saveViolation}
              >
                Save Violation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <Toast toasts={toasts} removeToast={removeToast} />
    </AdminLayout>
  );
};

export default TrafficViolations;
