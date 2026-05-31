import React, { useState, useEffect, useMemo } from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '@/Pages/Backend/components/AdminLayout';
import BlankPage from '@/Components/BlankPage';
import Table from '@/Pages/Backend/components/Table';
import '../../../../css/backend/main.scss';

const OverTime = ({ employees: propEmployees }) => {
  const [dbEmployees, setDbEmployees] = useState([]);

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

  const employees = propEmployees?.data || (Array.isArray(propEmployees) ? propEmployees : (Array.isArray(dbEmployees) ? dbEmployees : []));
  const [overtimeList, setOvertimeList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentOvertime, setCurrentOvertime] = useState(null);

  const filteredOvertime = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    return overtimeList.filter(o => 
      o.employee.toLowerCase().includes(lowerSearch) ||
      o.reason.toLowerCase().includes(lowerSearch)
    );
  }, [searchTerm, overtimeList]);

  const openModal = (overtime = null) => {
    setCurrentOvertime(overtime);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentOvertime(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const hours = parseFloat(formData.get('hours'));
    const rate = parseFloat(formData.get('rate'));
    
    // Assume base rate is 20 for simplicity if not calculated
    // In real app, amount should probably be calculated on backend or with employee's salary
    // Here we'll just take amount as user input or calculate roughly
    const amount = parseFloat(formData.get('amount')) || (hours * 20 * rate);

    const newOvertime = {
      id: currentOvertime ? currentOvertime.id : Date.now(),
      employee: formData.get('employee'),
      date: formData.get('date'),
      hours: hours,
      rate: rate,
      amount: amount,
      reason: formData.get('reason'),
      status: formData.get('status')
    };

    if (currentOvertime) {
      setOvertimeList(overtimeList.map(o => o.id === currentOvertime.id ? newOvertime : o));
    } else {
      setOvertimeList([...overtimeList, newOvertime]);
    }
    closeModal();
  };

  const handleDelete = (record) => {
    if (confirm('Are you sure you want to delete this record?')) {
      setOvertimeList(overtimeList.filter(o => o.id !== record.id));
    }
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '#' },
    { label: 'Human Resource', href: '#' },
    { label: 'Overtime', href: null },
  ];

  const columns = useMemo(() => [
    { 
      header: 'EMPLOYEE', 
      key: 'employee', 
      render: (record) => <div style={{ fontWeight: 600 }}>{record.employee}</div>
    },
    { header: 'DATE', key: 'date' },
    { 
      header: 'HOURS', 
      key: 'hours',
      render: (record) => `${record.hours} hrs`
    },
    { 
      header: 'RATE', 
      key: 'rate',
      render: (record) => `${record.rate}x`
    },
    { 
      header: 'AMOUNT', 
      key: 'amount',
      render: (record) => `$${record.amount.toFixed(2)}`
    },
    { header: 'REASON', key: 'reason' },
    { 
      header: 'STATUS', 
      key: 'status',
      render: (record) => (
        <span className={`status-badge status-${record.status.toLowerCase()}`}>
          {record.status}
        </span>
      )
    }
  ], []);

  return (
    <AdminLayout activeMenu="OverTime">
      <Head title="Overtime" />
      
      <BlankPage breadcrumbs={breadcrumbs}>
        <Table
          showToolbar={true}
          toolbarSearch={true}
          toolbarSearchValue={searchTerm}
          onToolbarSearch={setSearchTerm}
          showAddButton={true}
          addButtonText="Add Overtime"
          onAdd={() => openModal()}
          tableData={filteredOvertime}
          columns={columns}
          onEdit={(record) => openModal(record)}
          onDelete={(record) => handleDelete(record)}
        />
      </BlankPage>

      {isModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if(e.target === e.currentTarget) closeModal(); }}>
            <div className="modal">
                <div className="modal-header">
                    <h3 className="modal-title">{currentOvertime ? 'Edit Overtime' : 'Add New Overtime'}</h3>
                    <button className="modal-close" onClick={closeModal}>
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Employee Name</label>
                            <select className="form-control" name="employee" defaultValue={currentOvertime?.employee || ''} required>
                                <option value="">Select Employee</option>
                                {Array.isArray(employees) && employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Date</label>
                            <input type="date" className="form-control" name="date" defaultValue={currentOvertime?.date} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Hours</label>
                            <input type="number" className="form-control" name="hours" defaultValue={currentOvertime?.hours} required step="0.5" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Rate Multiplier</label>
                            <input type="number" className="form-control" name="rate" defaultValue={currentOvertime?.rate || 1.5} required step="0.1" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Amount ($) (Optional - Calculated automatically)</label>
                            <input type="number" className="form-control" name="amount" defaultValue={currentOvertime?.amount} step="0.01" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Reason</label>
                            <textarea className="form-control form-textarea" name="reason" defaultValue={currentOvertime?.reason}></textarea>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select className="form-control" name="status" defaultValue={currentOvertime?.status || 'Pending'}>
                                <option>Pending</option>
                                <option>Approved</option>
                                <option>Rejected</option>
                            </select>
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn" onClick={closeModal}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Save Overtime</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default OverTime;
