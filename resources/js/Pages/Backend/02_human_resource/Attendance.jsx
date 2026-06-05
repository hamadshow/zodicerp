import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { usePage } from '@inertiajs/react';
import AdminLayout from '@/Pages/Backend/components/AdminLayout';
import Table from '@/Pages/Backend/components/Table';
import BlankPage from '@/Components/BlankPage';
import '@/../css/backend/main.scss';
import { apiService } from '@/services/api';


export default function Attendance({ employees: propEmployees }) {
  const { props } = usePage();
  const localization = props?.localization;
  const [dbEmployees, setDbEmployees] = useState([]);

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
      fetch('/api/employees')
        .then(response => response.json())
        .then(data => {
          const employeeData = data.data || data;
          setDbEmployees(Array.isArray(employeeData) ? employeeData : []);
        })
        .catch(error => console.error('Error fetching employees:', error));
    }
  }, [propEmployees]);

  const employeesData = Array.isArray(propEmployees?.data) && propEmployees.data.length > 0 
    ? propEmployees.data 
    : (Array.isArray(propEmployees) && propEmployees.length > 0 
      ? propEmployees 
      : (Array.isArray(dbEmployees) ? dbEmployees : []));

  const employees = Array.isArray(employeesData) 
    ? employeesData.reduce((acc, emp) => {
        acc[emp.id] = { name: emp.name, code: emp.position || 'EMP', department: emp.department || '-' };
        return acc;
    }, {}) 
    : {};

  const [attendanceRecords, setAttendanceRecords] = useState([]);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = () => {
    apiService.get('/attendances')
      .then(response => {
        setAttendanceRecords(response.data || []);
      })
      .catch(error => {
        console.error('Error fetching attendance:', error);
        setAttendanceRecords([]);
      });
  };

  const [showForm, setShowForm] = useState(false);
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

  const handleAdd = () => {
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
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

    let workHours = 0;

    if (timeIn && timeOut) {
      const [inHours, inMinutes] = timeIn.split(':').map(Number);
      const [outHours, outMinutes] = timeOut.split(':').map(Number);
      workHours = outHours + outMinutes / 60 - (inHours + inMinutes / 60);
      workHours = Math.max(0, workHours);
    }

    const attendanceData = {
      employeeId: parseInt(employee),
      date: attendanceDate,
      timeIn: timeIn || null,
      timeOut: timeOut || null,
      status: attendanceStatus,
      overtime: parseFloat(overtime) || 0,
      notes: attendanceNotes,
      workHours: workHours,
    };

    if (editingId) {
      apiService.put(`/attendances/${editingId}`, attendanceData)
        .then(() => {
          showToast('Attendance updated successfully!', 'success');
          fetchAttendance();
          handleCancel();
        })
        .catch(err => {
          console.error(err);
          showToast('Failed to update attendance.', 'error');
        });
    } else {
      apiService.post('/attendances', attendanceData)
        .then(() => {
          showToast('Attendance marked successfully!', 'success');
          fetchAttendance();
          handleCancel();
        })
        .catch(err => {
          console.error(err);
          showToast('Failed to mark attendance.', 'error');
        });
    }
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
    setShowForm(true);
  };

  const deleteAttendance = (id) => {
    if (
      window.confirm('Are you sure you want to delete this attendance record?')
    ) {
      apiService.delete(`/attendances/${id}`)
        .then(() => {
          showToast('Attendance record deleted successfully!', 'success');
          fetchAttendance();
        })
        .catch(err => {
          console.error(err);
          showToast('Failed to delete attendance record.', 'error');
        });
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
      
      const updates = selectedRecords.map(id => {
        const record = attendanceRecords.find(r => r.id === id);
        const updated = { ...record, status, employeeId: record.employeeId };
        if (status === 'present' || status === 'late') {
          if (!updated.timeIn)
            updated.timeIn = status === 'late' ? '09:30' : '09:00';
          if (!updated.timeOut) updated.timeOut = '17:00';
        } else {
          updated.timeIn = null;
          updated.timeOut = null;
        }
        return apiService.put(`/attendances/${id}`, updated);
      });

      Promise.all(updates)
        .then(() => {
          showToast(`${selectedRecords.length} record(s) marked as ${status}!`, 'success');
          fetchAttendance();
          setSelectedRecords([]);
          document.getElementById('bulkActions').value = 'Bulk Actions';
        })
        .catch(err => {
          console.error(err);
          showToast('Failed to update some records.', 'error');
        });

    } else if (action === 'delete') {
      if (
        window.confirm(
          `Are you sure you want to delete ${selectedRecords.length} selected attendance record(s)?`
        )
      ) {
        const deletions = selectedRecords.map(id => apiService.delete(`/attendances/${id}`));
        
        Promise.all(deletions)
          .then(() => {
            showToast(`${selectedRecords.length} record(s) deleted!`, 'success');
            fetchAttendance();
            setSelectedRecords([]);
            document.getElementById('bulkActions').value = 'Bulk Actions';
          })
          .catch(err => {
            console.error(err);
            showToast('Failed to delete some records.', 'error');
          });
      }
    }
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

  const columns = useMemo(() => [
    { 
      header: 'ID', 
      key: 'id', 
      sortable: true,
      render: (record) => record.id.toString().padStart(3, '0')
    },
    { 
      header: 'EMPLOYEE', 
      key: 'employeeName', 
      sortable: true,
      render: (record) => (
        <div className="employee-info">
          <div className="employee-avatar">
            <span className="material-icons-outlined" style={{ color: '#94a3b8' }}>person</span>
          </div>
          <div className="employee-details">
            <div className="employee-name">{record.employeeName}</div>
            <div className="employee-id">{record.employeeCode}</div>
          </div>
        </div>
      )
    },
    { header: 'DEPARTMENT', key: 'department', sortable: true },
    { header: 'DATE', key: 'date', sortable: true },
    { 
      header: 'TIME IN', 
      key: 'timeIn', 
      sortable: true,
      render: (record) => (
        <div className="time-display time-in">
          {record.timeIn || '--:--'}
          {record.timeIn && record.timeIn > '09:00' && (
            <span className="late-badge">Late</span>
          )}
        </div>
      )
    },
    { 
      header: 'TIME OUT', 
      key: 'timeOut', 
      sortable: true,
      render: (record) => <div className="time-display time-out">{record.timeOut || '--:--'}</div>
    },
    { 
      header: 'WORK HOURS', 
      key: 'workHours', 
      sortable: true,
      render: (record) => (
        <div className="work-hours">
          {record.workHours.toFixed(1)}h
          {record.overtime > 0 && (
            <span className="overtime-badge">+{record.overtime}h OT</span>
          )}
        </div>
      )
    },
    { 
      header: 'STATUS', 
      key: 'status', 
      sortable: true,
      render: (record) => (
        <span className={`attendance-status status-${record.status}`}>
          {record.status.charAt(0).toUpperCase() + record.status.slice(1).replace('-', ' ')}
        </span>
      )
    }
  ], []);

  const tableData = useMemo(() => {
    return filteredRecords.map(record => ({
      ...record,
      selected: selectedRecords.includes(record.id)
    }));
  }, [filteredRecords, selectedRecords]);

  return (
    <AdminLayout activeMenu="Attendance">
      <BlankPage
        breadcrumbs={[
          { label: 'Dashboard', href: getLocalizedRoute('admin.dashboard') },
          { label: 'Human Resources', href: '#' },
          { label: 'Attendance', href: '#' }
        ]}
        stats={
          !showForm && (
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
          )
        }
        filters={
          !showForm && (
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
          )
        }
      >
        {showForm ? (
          <div className="attendance-card fade-in">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '10px' }}>
              <h3 className="card-title" style={{ margin: 0 }}>
                {editingId ? 'Edit Attendance' : 'Mark Attendance'}
              </h3>
              <button className="btn btn-outline" onClick={handleCancel}>
                <span className="material-icons-outlined">arrow_back</span>
                <span>Back to List</span>
              </button>
            </div>
            <div className="card-body" style={{ padding: '20px' }}>
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
                  style={{ minHeight: '100px' }}
                />
              </div>
              
              <div className="form-actions" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={saveAttendance}
                >
                  {editingId ? 'Update Attendance' : 'Save Attendance'}
                </button>
                <button type="button" className="btn btn-outline" onClick={handleCancel}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="attendance-card fade-in">
            <Table
              showToolbar={true}
              toolbarSearch={true}
              toolbarSearchValue={searchTerm}
              onToolbarSearch={setSearchTerm}
              showAddButton={true}
              addButtonText="Add Attendance"
              onAdd={handleAdd}
              showRefreshButton={true}
              onRefresh={() => {
                fetchAttendance();
                showToast('Attendance list refreshed!', 'success');
              }}
              showExportButton={true}
              onExport={exportAttendance}
              toolbarActions={
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select className="btn-toolbar btn-refresh" id="bulkActions" style={{ height: '42px' }}>
                    <option>Bulk Actions</option>
                    <option value="mark-present">Mark as Present</option>
                    <option value="mark-absent">Mark as Absent</option>
                    <option value="mark-late">Mark as Late</option>
                    <option value="delete">Delete Selected</option>
                  </select>
                  <button className="btn-toolbar btn-refresh" onClick={applyBulkAction}>
                    <span className="material-icons-outlined">play_arrow</span>
                    <span>Apply</span>
                  </button>
                </div>
              }
              tableData={tableData}
              columns={columns}
              handleRowSelect={handleSelectRecord}
              selectAll={selectedRecords.length === filteredRecords.length && filteredRecords.length > 0}
              handleSelectAll={handleSelectAll}
              onEdit={(record) => editAttendance(record.id)}
              onDelete={(record) => deleteAttendance(record.id)}
              onView={(record) => {
                if (record.notes) {
                  viewNotes(record.id);
                } else {
                  showToast('No notes for this record', 'info');
                }
              }}
            />
          </div>
        )}
      </BlankPage>

      {/* Toast */}
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </AdminLayout>
  );
}
