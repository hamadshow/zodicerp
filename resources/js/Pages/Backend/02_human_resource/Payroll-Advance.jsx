import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import { apiService } from '../../../services/api';

const PayrollAdvance = ({ employees: propEmployees }) => {
  const [dbEmployees, setDbEmployees] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [filteredAdvances, setFilteredAdvances] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAdvance, setCurrentAdvance] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchAdvances();
  }, []);

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

  const fetchAdvances = () => {
    apiService.get('/payroll-advances')
      .then(response => {
        const data = response.data;
        if (Array.isArray(data)) {
          setAdvances(data);
        } else if (data && data.error) {
          showToast(data.error, 'error');
          setAdvances([]);
        } else {
          setAdvances([]);
        }
      })
      .catch(error => {
        console.error('Error fetching advances:', error);
        showToast('Failed to load advances', 'error');
      });
  };

  const employees = propEmployees?.data || (Array.isArray(propEmployees) ? propEmployees : (Array.isArray(dbEmployees) ? dbEmployees : []));

  useEffect(() => {
    const lowerSearch = (searchTerm || '').toLowerCase();
    const filtered = (advances || []).filter(a => {
      const employeeName = (a.employee || '').toLowerCase();
      return employeeName.includes(lowerSearch);
    });
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
    const advanceData = {
      employee_id: formData.get('employee_id'),
      amount: parseFloat(formData.get('amount')),
      date: formData.get('date'),
      repaymentPlan: formData.get('repaymentPlan'),
      status: formData.get('status'),
      notes: formData.get('notes') || ''
    };

    if (currentAdvance) {
      apiService.put(`/payroll-advances/${currentAdvance.id}`, advanceData)
        .then(() => {
          showToast('Advance updated successfully!', 'success');
          fetchAdvances();
          closeModal();
        })
        .catch(err => {
          console.error(err);
          showToast('Failed to update advance.', 'error');
        });
    } else {
      apiService.post('/payroll-advances', advanceData)
        .then(() => {
          showToast('Advance requested successfully!', 'success');
          fetchAdvances();
          closeModal();
        })
        .catch(err => {
          console.error(err);
          showToast('Failed to request advance.', 'error');
        });
    }
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this advance?')) {
      apiService.delete(`/payroll-advances/${id}`)
        .then(() => {
          showToast('Advance deleted successfully!', 'success');
          fetchAdvances();
        })
        .catch(err => {
          console.error(err);
          showToast('Failed to delete advance.', 'error');
        });
    }
  };

  return (
    <AdminLayout activeMenu="Payroll-Advance">
      <Head title="Payroll Advance" />
      
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

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

                <div className="actions" style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-outline" onClick={() => { fetchAdvances(); showToast('Refreshing advances...', 'info'); }}>
                        <span className="material-icons-outlined">refresh</span>
                        <span>Refresh</span>
                    </button>
                    <button className="btn btn-primary" onClick={() => openModal()}>
                        <span className="material-icons-outlined">add</span>
                        <span>Request Advance</span>
                    </button>
                </div>
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
        <div className="modal-overlay active" onClick={(e) => { if(e.target === e.currentTarget) closeModal(); }}>
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
                            <select className="form-control" name="employee_id" defaultValue={currentAdvance?.employee_id || ''} required>
                                <option value="">Select Employee</option>
                                {Array.isArray(employees) && employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
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
                            <select className="form-control" name="status" defaultValue={currentAdvance?.status || 'pending'}>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="defaulted">Defaulted</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <textarea className="form-control" name="notes" defaultValue={currentAdvance?.notes} rows="3"></textarea>
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
