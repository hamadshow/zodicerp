import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';

const PayrollAdvance = ({ employees: propEmployees }) => {
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
  const [advances, setAdvances] = useState([]);
  const [filteredAdvances, setFilteredAdvances] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAdvance, setCurrentAdvance] = useState(null);

  useEffect(() => {
    const lowerSearch = searchTerm.toLowerCase();
    const filtered = advances.filter(a => 
      a.employee.toLowerCase().includes(lowerSearch)
    );
    setFilteredAdvances(filtered);
  }, [searchTerm, advances]);

  const openModal = (advance = null) => {
    setCurrentAdvance(advance);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentAdvance(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newAdvance = {
      id: currentAdvance ? currentAdvance.id : Date.now(),
      employee: formData.get('employee'),
      amount: parseFloat(formData.get('amount')),
      date: formData.get('date'),
      repaymentPlan: formData.get('repaymentPlan'),
      status: formData.get('status')
    };

    if (currentAdvance) {
      setAdvances(advances.map(a => a.id === currentAdvance.id ? newAdvance : a));
    } else {
      setAdvances([...advances, newAdvance]);
    }
    closeModal();
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this advance?')) {
      setAdvances(advances.filter(a => a.id !== id));
    }
  };

  return (
    <AdminLayout activeMenu="Payroll-Advance">
      <Head title="Payroll Advance" />
      
      <div className="payroll-advance-page">
        <div className="breadcrumb">
            <a href="#">Dashboard</a>
            <span>/</span>
            <a href="#">Human Resource</a>
            <span>/</span>
            <span>Payroll Advance</span>
        </div>

        <div className="payroll-advance-card">
            <div className="payroll-advance-actions">
                <div className="search-bar light" style={{ marginRight: 'auto' }}>
                    <input 
                      type="text" 
                      placeholder="Search advances..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button>
                        <span className="material-icons-outlined">search</span>
                    </button>
                </div>

                <button className="btn btn-primary" onClick={() => openModal()}>
                    <span className="material-icons-outlined">add</span>
                    <span>Request Advance</span>
                </button>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>EMPLOYEE</th>
                            <th>AMOUNT</th>
                            <th>DATE</th>
                            <th>REPAYMENT PLAN</th>
                            <th>STATUS</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAdvances.map(advance => (
                          <tr key={advance.id}>
                              <td>
                                  <div style={{ fontWeight: 600 }}>{advance.employee}</div>
                              </td>
                              <td>${advance.amount.toFixed(2)}</td>
                              <td>{advance.date}</td>
                              <td>{advance.repaymentPlan}</td>
                              <td>
                                  <span className={`status-badge status-${advance.status.toLowerCase()}`}>
                                      {advance.status}
                                  </span>
                              </td>
                              <td>
                                  <button className="icon-btn edit" onClick={() => openModal(advance)}>
                                      <span className="material-icons-outlined">edit</span>
                                  </button>
                                  <button className="icon-btn delete" onClick={() => handleDelete(advance.id)}>
                                      <span className="material-icons-outlined">delete</span>
                                  </button>
                              </td>
                          </tr>
                        ))}
                        {filteredAdvances.length === 0 && (
                          <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No advances found</td>
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
                    <h3 className="modal-title">{currentAdvance ? 'Edit Advance' : 'Request Advance'}</h3>
                    <button className="modal-close" onClick={closeModal}>
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Employee Name</label>
                            <select className="form-control" name="employee" defaultValue={currentAdvance?.employee || ''} required>
                                <option value="">Select Employee</option>
                                {Array.isArray(employees) && employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Amount ($)</label>
                            <input type="number" className="form-control" name="amount" defaultValue={currentAdvance?.amount} required step="0.01" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Date</label>
                            <input type="date" className="form-control" name="date" defaultValue={currentAdvance?.date} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Repayment Plan</label>
                            <select className="form-control" name="repaymentPlan" defaultValue={currentAdvance?.repaymentPlan || '1 month'}>
                                <option>1 month</option>
                                <option>3 months</option>
                                <option>6 months</option>
                                <option>12 months</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select className="form-control" name="status" defaultValue={currentAdvance?.status || 'Pending'}>
                                <option>Pending</option>
                                <option>Approved</option>
                                <option>Rejected</option>
                            </select>
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn" onClick={closeModal}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Save Request</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default PayrollAdvance;
