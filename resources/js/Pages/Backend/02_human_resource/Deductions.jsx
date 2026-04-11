import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/main.scss';
import { apiService } from '../../../services/api';


const Deductions = ({ employees: propEmployees }) => {
  const [dbEmployees, setDbEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const employees = propEmployees?.data || (Array.isArray(propEmployees) ? propEmployees : (Array.isArray(dbEmployees) ? dbEmployees : []));
  const [deductions, setDeductions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDeduction, setCurrentDeduction] = useState(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    type: 'Late Arrival',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    reason: '',
    status: 'Pending'
  });

  const fetchDeductions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/deductions');
      setDeductions(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching deductions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeductions();
  }, [fetchDeductions]);

  const filteredDeductions = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    return deductions.filter(d => 
      (d.employee_name || '').toLowerCase().includes(lowerSearch) ||
      (d.type || '').toLowerCase().includes(lowerSearch) ||
      (d.reason || '').toLowerCase().includes(lowerSearch)
    );
  }, [searchTerm, deductions]);

  const openModal = (deduction = null) => {
    setCurrentDeduction(deduction);
    if (deduction) {
      setFormData({
        employee_id: deduction.employee_id,
        type: deduction.type,
        amount: deduction.amount,
        date: deduction.date,
        reason: deduction.reason,
        status: deduction.status
      });
    } else {
      setFormData({
        employee_id: '',
        type: 'Late Arrival',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        reason: '',
        status: 'Pending'
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentDeduction(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (currentDeduction) {
        await apiService.put(`/deductions/${currentDeduction.id}`, formData);
      } else {
        await apiService.post('/deductions', formData);
      }
      fetchDeductions();
      closeModal();
    } catch (error) {
      console.error('Error saving deduction:', error);
      alert('Error saving deduction. Please check the fields and try again.');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this deduction?')) {
      try {
        await apiService.delete(`/deductions/${id}`);
        fetchDeductions();
      } catch (error) {
        console.error('Error deleting deduction:', error);
      }
    }
  };

  return (
    <AdminLayout activeMenu="Deductions">
      <Head title="Deductions" />
      
      <div className="deductions-page">
        <div className="breadcrumb">
            <a href="#">Dashboard</a>
            <span>/</span>
            <a href="#">Human Resource</a>
            <span>/</span>
            <span>Deductions</span>
        </div>

        <div className="deductions-card">
            <div className="deductions-actions">
                <div className="search-bar light" style={{ marginRight: 'auto' }}>
                    <input 
                      type="text" 
                      placeholder="Search deductions..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button>
                        <span className="material-icons-outlined">search</span>
                    </button>
                </div>

                <button className="btn btn-primary" onClick={() => openModal()}>
                    <span className="material-icons-outlined">add</span>
                    <span>Add Deduction</span>
                </button>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>EMPLOYEE</th>
                            <th>TYPE</th>
                            <th>AMOUNT</th>
                            <th>DATE</th>
                            <th>REASON</th>
                            <th>STATUS</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                          <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr>
                        ) : filteredDeductions.map(deduction => (
                          <tr key={deduction.id}>
                              <td>
                                  <div style={{ fontWeight: 600 }}>{deduction.employee_name}</div>
                              </td>
                              <td>{deduction.type}</td>
                              <td>${(deduction.amount || 0).toFixed(2)}</td>
                              <td>{deduction.date}</td>
                              <td>{deduction.reason}</td>
                              <td>
                                  <span className={`status-badge status-${(deduction.status || '').toLowerCase()}`}>
                                      {deduction.status}
                                  </span>
                              </td>
                              <td>
                                  <button className="icon-btn edit" onClick={() => openModal(deduction)}>
                                      <span className="material-icons-outlined">edit</span>
                                  </button>
                                  <button className="icon-btn delete" onClick={() => handleDelete(deduction.id)}>
                                      <span className="material-icons-outlined">delete</span>
                                  </button>
                              </td>
                          </tr>
                        ))}
                        {!loading && filteredDeductions.length === 0 && (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>No deductions found</td>
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
                    <h3 className="modal-title">{currentDeduction ? 'Edit Deduction' : 'Add New Deduction'}</h3>
                    <button className="modal-close" onClick={closeModal}>
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Employee Name</label>
                            <select 
                              className="form-control" 
                              name="employee_id" 
                              value={formData.employee_id} 
                              onChange={handleInputChange}
                              required
                            >
                                <option value="">Select Employee</option>
                                {Array.isArray(employees) && employees.map(e => (
                                  <option key={e.id} value={e.id}>{e.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Deduction Type</label>
                            <select 
                              className="form-control" 
                              name="type" 
                              value={formData.type}
                              onChange={handleInputChange}
                            >
                                <option value="Late Arrival">Late Arrival</option>
                                <option value="Absent">Absent</option>
                                <option value="Equipment Damage">Equipment Damage</option>
                                <option value="Loan Repayment">Loan Repayment</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Amount ($)</label>
                            <input 
                              type="number" 
                              className="form-control" 
                              name="amount" 
                              value={formData.amount}
                              onChange={handleInputChange}
                              required 
                              step="0.01" 
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Date</label>
                            <input 
                              type="date" 
                              className="form-control" 
                              name="date" 
                              value={formData.date}
                              onChange={handleInputChange}
                              required 
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Reason</label>
                            <textarea 
                              className="form-control form-textarea" 
                              name="reason" 
                              value={formData.reason}
                              onChange={handleInputChange}
                            ></textarea>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select 
                              className="form-control" 
                              name="status" 
                              value={formData.status}
                              onChange={handleInputChange}
                            >
                                <option value="Pending">Pending</option>
                                <option value="Approved">Approved</option>
                                <option value="Rejected">Rejected</option>
                            </select>
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn" onClick={closeModal}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Save Deduction</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Deductions;
