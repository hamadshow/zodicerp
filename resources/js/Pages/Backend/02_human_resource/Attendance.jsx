import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/main.scss';


export default function Attendance() {
  const [attendanceRecords, setAttendanceRecords] = useState([
    {
      id: 1,
      employeeId: 1,
      employeeName: 'Ahmed Mohamed',
      employeeCode: 'IT001',
      department: 'IT Department',
      date: '2025-12-18',
      timeIn: '08:55',
      timeOut: '17:05',
      status: 'present',
      overtime: 0.5,
      notes: '',
      workHours: 8.2,
    },
    {
      id: 2,
      employeeId: 2,
      employeeName: 'Sarah Johnson',
      employeeCode: 'HR001',
      department: 'Human Resources',
      date: '2025-12-18',
      timeIn: '09:00',
      timeOut: '17:00',
      status: 'present',
      overtime: 0,
      notes: '',
      workHours: 8,
    },
    {
      id: 3,
      employeeId: 3,
      employeeName: 'James Wilson',
      employeeCode: 'SAL001',
      department: 'Sales',
      date: '2025-12-18',
      timeIn: '09:30',
      timeOut: '17:00',
      status: 'late',
      overtime: 0,
      notes: 'Traffic delay',
      workHours: 7.5,
    },
    {
      id: 4,
      employeeId: 4,
      employeeName: 'Fatima Al-Mansour',
      employeeCode: 'MKT001',
      department: 'Marketing',
      date: '2025-12-18',
      timeIn: '09:00',
      timeOut: '13:00',
      status: 'half-day',
      overtime: 0,
      notes: 'Medical appointment',
      workHours: 4,
    },
    {
      id: 5,
      employeeId: 5,
      employeeName: 'Mohammed Al-Farsi',
      employeeCode: 'FIN001',
      department: 'Finance',
      date: '2025-12-18',
      timeIn: null,
      timeOut: null,
      status: 'absent',
      overtime: 0,
      notes: 'Sick leave',
      workHours: 0,
    },
    {
      id: 6,
      employeeId: 6,
      employeeName: 'Priya Sharma',
      employeeCode: 'CS001',
      department: 'Customer Service',
      date: '2025-12-18',
      timeIn: null,
      timeOut: null,
      status: 'leave',
      overtime: 0,
      notes: 'Annual leave',
      workHours: 0,
    },
    {
      id: 7,
      employeeId: 7,
      employeeName: 'Ali Khan',
      employeeCode: 'OPS001',
      department: 'Operations',
      date: '2025-12-18',
      timeIn: '08:45',
      timeOut: '18:30',
      status: 'present',
      overtime: 1.5,
      notes: 'Project deadline',
      workHours: 9.75,
    },
    {
      id: 8,
      employeeId: 8,
      employeeName: 'Marie Dubois',
      employeeCode: 'ENG001',
      department: 'Engineering',
      date: '2025-12-18',
      timeIn: '09:15',
      timeOut: '17:00',
      status: 'late',
      overtime: 0,
      notes: '',
      workHours: 7.75,
    },
  ]);

  const employees = {
    1: { name: 'Ahmed Mohamed', code: 'IT001', department: 'IT Department' },
    2: { name: 'Sarah Johnson', code: 'HR001', department: 'Human Resources' },
    3: { name: 'James Wilson', code: 'SAL001', department: 'Sales' },
    4: { name: 'Fatima Al-Mansour', code: 'MKT001', department: 'Marketing' },
    5: { name: 'Mohammed Al-Farsi', code: 'FIN001', department: 'Finance' },
    6: { name: 'Priya Sharma', code: 'CS001', department: 'Customer Service' },
    7: { name: 'Ali Khan', code: 'OPS001', department: 'Operations' },
    8: { name: 'Marie Dubois', code: 'ENG001', department: 'Engineering' },
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentFilterStatus, setCurrentFilterStatus] = useState('all');
  const [currentFilterDate, setCurrentFilterDate] = useState('2025-12-18');
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({
    employee: '',
    attendanceDate: '',
    attendanceStatus: 'present',
    timeIn: '09:00',
    timeOut: '17:00',
    overtime: '',
    attendanceNotes: '',
  });

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setCurrentFilterDate(today);
    setFormData((prev) => ({ ...prev, attendanceDate: today }));
  }, []);

  const filteredRecords = attendanceRecords.filter((record) => {
    const matchesDate = record.date === currentFilterDate;
    const matchesStatus =
      currentFilterStatus === 'all' || record.status === currentFilterStatus;
    const matchesSearch =
      !searchTerm ||
      record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.department.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDate && matchesStatus && matchesSearch;
  });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      employee: '',
      attendanceDate: currentFilterDate,
      attendanceStatus: 'present',
      timeIn: '09:00',
      timeOut: '17:00',
      overtime: '',
      attendanceNotes: '',
    });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const saveAttendance = () => {
    const {
      employee,
      attendanceDate,
      attendanceStatus,
      timeIn,
      timeOut,
      overtime,
      attendanceNotes,
    } = formData;

    if (!employee || !attendanceDate || !attendanceStatus) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    const employeeData = employees[parseInt(employee)];
    let workHours = 0;

    if (timeIn && timeOut) {
      const [inHours, inMinutes] = timeIn.split(':').map(Number);
      const [outHours, outMinutes] = timeOut.split(':').map(Number);
      workHours = outHours + outMinutes / 60 - (inHours + inMinutes / 60);
      workHours = Math.max(0, workHours);
    }

    const attendanceData = {
      employeeId: parseInt(employee),
      employeeName: employeeData.name,
      employeeCode: employeeData.code,
      department: employeeData.department,
      date: attendanceDate,
      timeIn: timeIn || null,
      timeOut: timeOut || null,
      status: attendanceStatus,
      overtime: parseFloat(overtime) || 0,
      notes: attendanceNotes,
      workHours: workHours,
    };

    if (editingId) {
      setAttendanceRecords((prev) =>
        prev.map((record) =>
          record.id === editingId
            ? { ...attendanceData, id: editingId }
            : record
        )
      );
      showToast('Attendance updated successfully!', 'success');
    } else {
      const newId =
        attendanceRecords.length > 0
          ? Math.max(...attendanceRecords.map((r) => r.id)) + 1
          : 1;
      setAttendanceRecords((prev) => [
        ...prev,
        { ...attendanceData, id: newId },
      ]);
      showToast('Attendance marked successfully!', 'success');
    }

    closeModal();
  };

  const editAttendance = (id) => {
    const record = attendanceRecords.find((r) => r.id === id);
    if (!record) return;

    setEditingId(id);
    setFormData({
      employee: record.employeeId.toString(),
      attendanceDate: record.date,
      attendanceStatus: record.status,
      timeIn: record.timeIn || '',
      timeOut: record.timeOut || '',
      overtime: record.overtime.toString(),
      attendanceNotes: record.notes || '',
    });
    openModal();
  };

  const deleteAttendance = (id) => {
    if (
      window.confirm('Are you sure you want to delete this attendance record?')
    ) {
      setAttendanceRecords((prev) => prev.filter((record) => record.id !== id));
      showToast('Attendance record deleted successfully!', 'success');
    }
  };

  const viewNotes = (id) => {
    const record = attendanceRecords.find((r) => r.id === id);
    if (record && record.notes) {
      alert(
        `Notes for ${record.employeeName} on ${record.date}:\n\n${record.notes}`
      );
    }
  };

  const handleStatusFilter = (status) => {
    setCurrentFilterStatus(status);
  };

  const handleDateFilter = (e) => {
    setCurrentFilterDate(e.target.value);
  };

  const resetDateFilter = () => {
    const today = new Date().toISOString().split('T')[0];
    setCurrentFilterDate(today);
    showToast('Date filter reset to today', 'info');
  };

  const togglePunch = () => {
    const now = new Date();
    const timeString = now.toTimeString().split(' ')[0].substring(0, 5);

    if (!isPunchedIn) {
      showToast(`Punched in at ${timeString}`, 'success');
      setIsPunchedIn(true);
    } else {
      showToast(`Punched out at ${timeString}`, 'success');
      setIsPunchedIn(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRecords(filteredRecords.map((r) => r.id));
    } else {
      setSelectedRecords([]);
    }
  };

  const handleSelectRecord = (id) => {
    setSelectedRecords((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const applyBulkAction = () => {
    const action = document.getElementById('bulkActions').value;
    if (selectedRecords.length === 0) {
      alert('Please select at least one attendance record.');
      return;
    }

    if (action.startsWith('mark-')) {
      const status = action.split('-')[1];
      setAttendanceRecords((prev) =>
        prev.map((record) => {
          if (selectedRecords.includes(record.id)) {
            const updated = { ...record, status };
            if (status === 'present' || status === 'late') {
              if (!updated.timeIn)
                updated.timeIn = status === 'late' ? '09:30' : '09:00';
              if (!updated.timeOut) updated.timeOut = '17:00';
            } else {
              updated.timeIn = null;
              updated.timeOut = null;
            }
            return updated;
          }
          return record;
        })
      );
      showToast(
        `${selectedRecords.length} record(s) marked as ${status}!`,
        'success'
      );
    } else if (action === 'delete') {
      if (
        window.confirm(
          `Are you sure you want to delete ${selectedRecords.length} selected attendance record(s)?`
        )
      ) {
        setAttendanceRecords((prev) =>
          prev.filter((r) => !selectedRecords.includes(r.id))
        );
        showToast(`${selectedRecords.length} record(s) deleted!`, 'success');
      }
    }
    setSelectedRecords([]);
    document.getElementById('bulkActions').value = 'Bulk Actions';
  };

  const exportAttendance = () => {
    if (filteredRecords.length === 0) {
      alert('No attendance records to export for the selected date.');
      return;
    }

    let csv =
      'Employee ID,Employee Name,Department,Date,Time In,Time Out,Status,Work Hours,Overtime,Notes\n';
    filteredRecords.forEach((record) => {
      csv += `"${record.employeeCode}","${record.employeeName}","${record.department}","${record.date}","${record.timeIn || ''}","${record.timeOut || ''}","${record.status}",${record.workHours},${record.overtime},"${record.notes || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${currentFilterDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showToast('Attendance data exported successfully!', 'success');
  };

  const todayRecords = attendanceRecords.filter(
    (r) => r.date === currentFilterDate
  );
  const present = todayRecords.filter((r) => r.status === 'present').length;
  const absent = todayRecords.filter((r) => r.status === 'absent').length;
  const late = todayRecords.filter((r) => r.status === 'late').length;
  const leave = todayRecords.filter((r) => r.status === 'leave').length;

  return (
    <AdminLayout activeMenu="Attendance">
      <div className="breadcrumb">
        <a href="#">Dashboard</a>
        <span>/</span>
        <a href="#">Human Resources</a>
        <span>/</span>
        <span>Attendance</span>
      </div>

      {/* Quick Stats */}
      <div className="stats-cards">
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ backgroundColor: 'var(--success-color)' }}
          >
            <span className="material-icons-outlined">check_circle</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{present}</div>
            <div className="stat-label">Present Today</div>
          </div>
        </div>
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ backgroundColor: 'var(--danger-color)' }}
          >
            <span className="material-icons-outlined">cancel</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{absent}</div>
            <div className="stat-label">Absent Today</div>
          </div>
        </div>
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ backgroundColor: 'var(--warning-color)' }}
          >
            <span className="material-icons-outlined">schedule</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{late}</div>
            <div className="stat-label">Late Today</div>
          </div>
        </div>
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ backgroundColor: 'var(--info-color)' }}
          >
            <span className="material-icons-outlined">beach_access</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{leave}</div>
            <div className="stat-label">On Leave</div>
          </div>
        </div>
      </div>

      {/* Date Filter and Summary */}
      <div className="attendance-summary">
        <div className="date-filter">
          <span
            className="material-icons-outlined"
            style={{ color: 'var(--gray-color)' }}
          >
            calendar_today
          </span>
          <input
            type="date"
            value={currentFilterDate}
            onChange={handleDateFilter}
          />
          <button className="btn btn-sm btn-outline" onClick={() => {}}>
            Go
          </button>
          <button className="btn btn-sm btn-outline" onClick={resetDateFilter}>
            Today
          </button>
        </div>

        <div className="attendance-buttons">
          {['all', 'present', 'absent', 'late', 'leave'].map((status) => (
            <button
              key={status}
              className={`attendance-btn ${currentFilterStatus === status ? 'active' : ''}`}
              data-status={status}
              onClick={() => handleStatusFilter(status)}
            >
              <span
                className="material-icons-outlined"
                style={{ fontSize: '16px' }}
              >
                {status === 'all'
                  ? 'all_inclusive'
                  : status === 'present'
                    ? 'check_circle'
                    : status === 'absent'
                      ? 'cancel'
                      : status === 'late'
                        ? 'schedule'
                        : 'beach_access'}
              </span>
              {status === 'all'
                ? 'All'
                : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto' }}>
          <button
            className={`punch-btn ${isPunchedIn ? 'out' : ''}`}
            onClick={togglePunch}
          >
            <span className="material-icons-outlined">fingerprint</span>
            {isPunchedIn ? 'Punch Out' : 'Punch In'}
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="attendance-card fade-in">
        <div className="card-header">
          <div className="attendance-actions">
            <select className="btn btn-outline" id="bulkActions">
              <option>Bulk Actions</option>
              <option value="mark-present">Mark as Present</option>
              <option value="mark-absent">Mark as Absent</option>
              <option value="mark-late">Mark as Late</option>
              <option value="delete">Delete Selected</option>
            </select>
            <button className="btn btn-outline" onClick={applyBulkAction}>
              <span className="material-icons-outlined">play_arrow</span>
              <span>Apply</span>
            </button>
            <div className="search-bar light">
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && {}}
              />
              <button onClick={() => {}}>
                <span className="material-icons-outlined">search</span>
              </button>
            </div>
          </div>
          <div className="actions">
            <button className="btn btn-primary" onClick={openModal}>
              <span className="material-icons-outlined">add</span>
              <span>Add Attendance</span>
            </button>
            <button
              className="btn btn-outline"
              onClick={() => showToast('Attendance list refreshed!', 'success')}
            >
              <span className="material-icons-outlined">refresh</span>
              <span>Refresh</span>
            </button>
            <button className="btn btn-outline" onClick={exportAttendance}>
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
                  <input type="checkbox" onChange={handleSelectAll} />
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
                  EMPLOYEE{' '}
                  <span
                    className="material-icons-outlined"
                    style={{ fontSize: '16px' }}
                  >
                    arrow_drop_down
                  </span>
                </th>
                <th>
                  DEPARTMENT{' '}
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
                  TIME IN{' '}
                  <span
                    className="material-icons-outlined"
                    style={{ fontSize: '16px' }}
                  >
                    arrow_drop_down
                  </span>
                </th>
                <th>
                  TIME OUT{' '}
                  <span
                    className="material-icons-outlined"
                    style={{ fontSize: '16px' }}
                  >
                    arrow_drop_down
                  </span>
                </th>
                <th>
                  WORK HOURS{' '}
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
              {filteredRecords.map((record) => (
                <tr key={record.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedRecords.includes(record.id)}
                      onChange={() => handleSelectRecord(record.id)}
                    />
                  </td>
                  <td>{record.id.toString().padStart(3, '0')}</td>
                  <td>
                    <div className="employee-info">
                      <div className="employee-avatar">
                        <span
                          className="material-icons-outlined"
                          style={{ color: '#94a3b8' }}
                        >
                          person
                        </span>
                      </div>
                      <div className="employee-details">
                        <div className="employee-name">
                          {record.employeeName}
                        </div>
                        <div className="employee-id">{record.employeeCode}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="department-badge">
                      {record.department}
                    </span>
                  </td>
                  <td>{record.date}</td>
                  <td>
                    <div className="time-display time-in">
                      {record.timeIn || '--:--'}
                      {record.timeIn && record.timeIn > '09:00' && (
                        <span className="late-badge">Late</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="time-display time-out">
                      {record.timeOut || '--:--'}
                    </div>
                  </td>
                  <td>
                    <div className="work-hours">
                      {record.workHours.toFixed(1)}h
                      {record.overtime > 0 && (
                        <span className="overtime-badge">
                          +{record.overtime}h OT
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`attendance-status status-${record.status}`}
                    >
                      {record.status.charAt(0).toUpperCase() +
                        record.status.slice(1).replace('-', ' ')}
                    </span>
                  </td>
                  <td>
                    <button
                      className="icon-btn edit"
                      onClick={() => editAttendance(record.id)}
                    >
                      <span className="material-icons-outlined">edit</span>
                    </button>
                    <button
                      className="icon-btn delete"
                      onClick={() => deleteAttendance(record.id)}
                    >
                      <span className="material-icons-outlined">delete</span>
                    </button>
                    {record.notes && (
                      <button
                        className="icon-btn notes-indicator"
                        onClick={() => viewNotes(record.id)}
                        title="View notes"
                      >
                        <span className="material-icons-outlined">note</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <div className="pagination-info">
            <select className="select-dropdown" id="rowsPerPage">
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span>
              Show from 1 to {filteredRecords.length} in{' '}
              <span
                style={{
                  backgroundColor: '#64748b',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: '600',
                }}
              >
                {filteredRecords.length}
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

      {/* Add Attendance Modal */}
      {isModalOpen && (
        <div
          className="modal-overlay active"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingId ? 'Edit Attendance' : 'Mark Attendance'}
              </h3>
              <button className="modal-close" onClick={closeModal}>
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Employee *</label>
                <select
                  className="form-control"
                  name="employee"
                  value={formData.employee}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">Select Employee</option>
                  {Object.entries(employees).map(([id, emp]) => (
                    <option key={id} value={id}>
                      {emp.name} - {emp.code}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    name="attendanceDate"
                    value={formData.attendanceDate}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status *</label>
                  <select
                    className="form-control"
                    name="attendanceStatus"
                    value={formData.attendanceStatus}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                    <option value="leave">Leave</option>
                    <option value="half-day">Half Day</option>
                    <option value="holiday">Holiday</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Time In</label>
                  <input
                    type="time"
                    className="form-control"
                    name="timeIn"
                    value={formData.timeIn}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Time Out</label>
                  <input
                    type="time"
                    className="form-control"
                    name="timeOut"
                    value={formData.timeOut}
                    onChange={handleFormChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Overtime (hours)</label>
                <input
                  type="number"
                  className="form-control"
                  name="overtime"
                  min="0"
                  step="0.5"
                  placeholder="Enter overtime hours"
                  value={formData.overtime}
                  onChange={handleFormChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-control form-textarea"
                  name="attendanceNotes"
                  placeholder="Enter any notes..."
                  value={formData.attendanceNotes}
                  onChange={handleFormChange}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={closeModal}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={saveAttendance}
              >
                Save Attendance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </AdminLayout>
  );
}
