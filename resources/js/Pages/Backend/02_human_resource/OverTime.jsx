import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
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
  const [filteredOvertime, setFilteredOvertime] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentOvertime, setCurrentOvertime] = useState(null);

  useEffect(() => {
    const lowerSearch = searchTerm.toLowerCase();
    const filtered = overtimeList.filter(o => 
      o.employee.toLowerCase().includes(lowerSearch) ||
      o.reason.toLowerCase().includes(lowerSearch)
    );
    setFilteredOvertime(filtered);
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

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this record?')) {
      setOvertimeList(overtimeList.filter(o => o.id !== id));
    }
  };

  return (
    <AdminLayout activeMenu="OverTime">
      <Head title="Overtime" />
      
      <div className="overtime-page">
        <div className="breadcrumb">
            <a href="#">Dashboard</a>
            <span>/</span>
            <a href="#">Human Resource</a>
            <span>/</span>
            <span>Overtime</span>
        </div>

        <div className="overtime-card">
            <div className="overtime-actions">
                <div className="search-bar light" style={{ marginRight: 'auto' }}>
                    <input 
                      type="text" 
                      placeholder="Search overtime..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button>
                        <span className="material-icons-outlined">search</span>
                    </button>
                </div>

                <button className="btn btn-primary" onClick={() => openModal()}>
                    <span className="material-icons-outlined">add</span>
                    <span>Add Overtime</span>
                </button>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>EMPLOYEE</th>
                            <th>DATE</th>
                            <th>HOURS</th>
                            <th>RATE</th>
                            <th>AMOUNT</th>
                            <th>REASON</th>
                            <th>STATUS</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOvertime.map(overtime => (
                          <tr key={overtime.id}>
                              <td>
                                  <div style={{ fontWeight: 600 }}>{overtime.employee}</div>
                              </td>
                              <td>{overtime.date}</td>
                              <td>{overtime.hours} hrs</td>
                              <td>{overtime.rate}x</td>
                              <td>${overtime.amount.toFixed(2)}</td>
                              <td>{overtime.reason}</td>
                              <td>
                                  <span className={`status-badge status-${overtime.status.toLowerCase()}`}>
                                      {overtime.status}
                                  </span>
                              </td>
                              <td>
                                  <button className="icon-btn edit" onClick={() => openModal(overtime)}>
                                      <span className="material-icons-outlined">edit</span>
                                  </button>
                                  <button className="icon-btn delete" onClick={() => handleDelete(overtime.id)}>
                                      <span className="material-icons-outlined">delete</span>
                                  </button>
                              </td>
                          </tr>
                        ))}
                        {filteredOvertime.length === 0 && (
                          <tr>
                            <td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>No records found</td>
                          </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

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
