import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/main.scss';
import { apiService } from '../../../services/api';


const SalaryReceipt = ({ employees: propEmployees }) => {
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

  // State management
  const [receipts, setReceipts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);
  const [calculating, setCalculating] = useState(false);

  const [formData, setFormData] = useState({
    employee_id: '',
    period: new Date().toISOString().slice(0, 7), // YYYY-MM
    receipt_no: '',
    gross_salary: 0,
    total_deductions: 0,
    total_advances: 0,
    total_rewards: 0,
    net_salary: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Bank Transfer',
    bank_account: '',
    status: 'pending'
  });

  const [searchTerm, setSearchTerm] = useState('');

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/salary-receipts');
      setReceipts(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching receipts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const filteredReceipts = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    return receipts.filter(r => 
      (r.employee_name || '').toLowerCase().includes(lowerSearch) ||
      (r.receipt_no || '').toLowerCase().includes(lowerSearch) ||
      (r.period || '').toLowerCase().includes(lowerSearch)
    );
  }, [searchTerm, receipts]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCalculate = async () => {
    if (!formData.employee_id || !formData.period) {
      alert('Please select employee and period first');
      return;
    }

    setCalculating(true);
    try {
      const response = await apiService.post('/salary-receipts/calculate', {
        employee_id: formData.employee_id,
        period: formData.period
      });
      
      const data = response.data;
      setFormData(prev => ({
        ...prev,
        gross_salary: data.gross_salary,
        total_deductions: data.total_deductions,
        total_advances: data.total_advances,
        total_rewards: data.total_rewards,
        net_salary: data.net_salary,
        receipt_no: data.receipt_no
      }));
    } catch (error) {
      console.error('Calculation error:', error);
      alert('Error calculating salary');
    } finally {
      setCalculating(false);
    }
  };

  const openModal = (receipt = null) => {
    if (receipt) {
      setCurrentReceipt(receipt);
      setFormData({
        employee_id: receipt.employee_id,
        period: receipt.period,
        receipt_no: receipt.receipt_no,
        gross_salary: receipt.gross_salary,
        total_deductions: receipt.total_deductions,
        total_advances: receipt.total_advances,
        total_rewards: receipt.total_rewards,
        net_salary: receipt.net_salary,
        payment_date: receipt.payment_date || new Date().toISOString().split('T')[0],
        payment_method: receipt.payment_method,
        bank_account: receipt.bank_account || '',
        status: receipt.status
      });
    } else {
      setCurrentReceipt(null);
      setFormData({
        employee_id: '',
        period: new Date().toISOString().slice(0, 7),
        receipt_no: '',
        gross_salary: 0,
        total_deductions: 0,
        total_advances: 0,
        total_rewards: 0,
        net_salary: 0,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'Bank Transfer',
        bank_account: '',
        status: 'pending'
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentReceipt(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (currentReceipt) {
        await apiService.put(`/salary-receipts/${currentReceipt.id}`, formData);
      } else {
        await apiService.post('/salary-receipts', formData);
      }
      fetchReceipts();
      closeModal();
    } catch (error) {
      console.error('Error saving receipt:', error);
      alert('Error saving salary receipt');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this receipt?')) {
      try {
        await apiService.delete(`/salary-receipts/${id}`);
        fetchReceipts();
      } catch (error) {
        console.error('Error deleting receipt:', error);
      }
    }
  };

  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'paid': return 'status-paid';
      case 'processing': return 'status-processing';
      case 'pending': return 'status-pending';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  };

  return (
    <AdminLayout activeMenu="Salary Receipts">
      <Head title="Salary Receipts" />
      
      <div className="salary-receipt-page">
        <div className="breadcrumb">
            <a href="#">Dashboard</a>
            <span>/</span>
            <a href="#">Human Resource</a>
            <span>/</span>
            <span>Salary Receipts</span>
        </div>

        <div className="salary-receipt-card">
            <div className="salary-receipt-actions">
                <div className="search-bar light" style={{ marginRight: 'auto' }}>
                    <input 
                      type="text" 
                      placeholder="Search receipts..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button>
                        <span className="material-icons-outlined">search</span>
                    </button>
                </div>

                <button className="btn btn-primary" onClick={() => openModal()}>
                    <span className="material-icons-outlined">add</span>
                    <span>Generate Receipt</span>
                </button>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>RECEIPT NO</th>
                            <th>EMPLOYEE</th>
                            <th>PERIOD</th>
                            <th>GROSS</th>
                            <th>DEDUCTIONS</th>
                            <th>REWARDS</th>
                            <th>NET SALARY</th>
                            <th>STATUS</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                          <tr><td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>Loading receipts...</td></tr>
                        ) : filteredReceipts.map(receipt => (
                          <tr key={receipt.id}>
                              <td>
                                  <div style={{ fontWeight: 600 }}>{receipt.receipt_no}</div>
                              </td>
                              <td>
                                  <div style={{ fontWeight: 500 }}>{receipt.employee_name}</div>
                                  <div style={{ fontSize: '0.8rem', color: '#666' }}>{receipt.position}</div>
                              </td>
                              <td>{receipt.period}</td>
                              <td>${(receipt.gross_salary || 0).toLocaleString()}</td>
                              <td>-${(receipt.total_deductions + receipt.total_advances || 0).toLocaleString()}</td>
                              <td>+${(receipt.total_rewards || 0).toLocaleString()}</td>
                              <td>
                                  <div style={{ fontWeight: 600, color: 'var(--primary-color)' }}>
                                      ${(receipt.net_salary || 0).toLocaleString()}
                                  </div>
                              </td>
                              <td>
                                  <span className={`status-badge ${getStatusClass(receipt.status)}`}>
                                      {receipt.status}
                                  </span>
                              </td>
                              <td>
                                  <button className="icon-btn edit" onClick={() => openModal(receipt)}>
                                      <span className="material-icons-outlined">edit</span>
                                  </button>
                                  <button className="icon-btn delete" onClick={() => handleDelete(receipt.id)}>
                                      <span className="material-icons-outlined">delete</span>
                                  </button>
                              </td>
                          </tr>
                        ))}
                        {!loading && filteredReceipts.length === 0 && (
                          <tr>
                            <td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>No receipts found</td>
                          </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay active" onClick={(e) => { if(e.target === e.currentTarget) closeModal(); }}>
            <div className="modal modal-lg">
                <div className="modal-header">
                    <h3 className="modal-title">{currentReceipt ? 'Edit Receipt' : 'Generate New Receipt'}</h3>
                    <button className="modal-close" onClick={closeModal}>
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Employee</label>
                                <select 
                                  className="form-control" 
                                  name="employee_id" 
                                  value={formData.employee_id}
                                  onChange={handleInputChange}
                                  required
                                  disabled={!!currentReceipt}
                                >
                                    <option value="">Select Employee</option>
                                    {Array.isArray(employees) && employees.map(e => (
                                      <option key={e.id} value={e.id}>{e.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Period (Month)</label>
                                <input 
                                  type="month" 
                                  className="form-control" 
                                  name="period" 
                                  value={formData.period}
                                  onChange={handleInputChange}
                                  required
                                  disabled={!!currentReceipt}
                                />
                            </div>
                            {!currentReceipt && (
                              <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                                <button 
                                  type="button" 
                                  className="btn btn-secondary" 
                                  onClick={handleCalculate}
                                  disabled={calculating}
                                  style={{ width: '100%' }}
                                >
                                  {calculating ? 'Calculating...' : 'Fetch Data & Calculate'}
                                </button>
                              </div>
                            )}
                        </div>

                        <div className="salary-breakdown-box">
                            <div className="breakdown-item">
                                <span>Basic Salary (Gross)</span>
                                <strong>${formData.gross_salary.toLocaleString()}</strong>
                            </div>
                            <div className="breakdown-item">
                                <span>Total Rewards (+)</span>
                                <strong style={{ color: 'green' }}>+${formData.total_rewards.toLocaleString()}</strong>
                            </div>
                            <div className="breakdown-item">
                                <span>Total Deductions (-)</span>
                                <strong style={{ color: 'red' }}>-${formData.total_deductions.toLocaleString()}</strong>
                            </div>
                            <div className="breakdown-item">
                                <span>Total Advances (-)</span>
                                <strong style={{ color: 'red' }}>-${formData.total_advances.toLocaleString()}</strong>
                            </div>
                            <hr />
                            <div className="breakdown-item total">
                                <span>Net Salary</span>
                                <strong>${formData.net_salary.toLocaleString()}</strong>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Receipt Number</label>
                                <input 
                                  type="text" 
                                  className="form-control" 
                                  name="receipt_no" 
                                  value={formData.receipt_no}
                                  readOnly
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Payment Date</label>
                                <input 
                                  type="date" 
                                  className="form-control" 
                                  name="payment_date" 
                                  value={formData.payment_date}
                                  onChange={handleInputChange}
                                  required
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Payment Method</label>
                                <select 
                                  className="form-control" 
                                  name="payment_method" 
                                  value={formData.payment_method}
                                  onChange={handleInputChange}
                                >
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Cash">Cash</option>
                                    <option value="Cheque">Cheque</option>
                                </select>
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
                                    <option value="processing">Processing</option>
                                    <option value="paid">Paid</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn" onClick={closeModal}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Save Receipt</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default SalaryReceipt;

