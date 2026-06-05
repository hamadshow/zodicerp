import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import Table from '../components/Table';
import BlankPage from '@/Components/BlankPage';
import '../../../../css/backend/main.scss';
import { apiService } from '../../../services/api';

const SalaryReceipt = ({ employees: propEmployees }) => {
  const { props } = usePage();
  const localization = props?.localization;
  const isArabic = localization?.current_locale === 'ar';
  
  const [dbEmployees, setDbEmployees] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [toast, setToast] = useState(null);

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

  const fetchReceipts = useCallback(async () => {
    try {
      const response = await apiService.get('/salary-receipts');
      setReceipts(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching receipts:', error);
      showToast('Error loading receipts', 'error');
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

  const stats = useMemo(() => {
    const total = receipts.length;
    const paid = receipts.filter(r => r.status.toLowerCase() === 'paid').length;
    const pending = receipts.filter(r => r.status.toLowerCase() === 'pending').length;
    const totalNetAmount = receipts.reduce((acc, r) => acc + (parseFloat(r.net_salary) || 0), 0);
    return { total, paid, pending, totalNetAmount };
  }, [receipts]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCalculate = async () => {
    if (!formData.employee_id || !formData.period) {
      showToast('Please select employee and period first', 'warning');
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
      showToast('Salary calculated successfully', 'success');
    } catch (error) {
      console.error('Calculation error:', error);
      showToast('Error calculating salary', 'error');
    } finally {
      setCalculating(false);
    }
  };

  const handleAdd = () => {
    setEditingId(null);
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
    setShowForm(true);
  };

  const handleEdit = (receipt) => {
    setEditingId(receipt.id);
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
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiService.put(`/salary-receipts/${editingId}`, formData);
        showToast('Receipt updated successfully', 'success');
      } else {
        await apiService.post('/salary-receipts', formData);
        showToast('Receipt generated successfully', 'success');
      }
      fetchReceipts();
      handleCancel();
    } catch (error) {
      console.error('Error saving receipt:', error);
      showToast('Error saving salary receipt', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this receipt?')) {
      try {
        await apiService.delete(`/salary-receipts/${id}`);
        showToast('Receipt deleted successfully', 'success');
        fetchReceipts();
      } catch (error) {
        console.error('Error deleting receipt:', error);
        showToast('Error deleting receipt', 'error');
      }
    }
  };

  const columns = useMemo(() => [
    { 
      header: 'RECEIPT NO', 
      key: 'receipt_no', 
      sortable: true,
      render: (row) => <div style={{ fontWeight: 600 }}>{row.receipt_no}</div>
    },
    { 
      header: 'EMPLOYEE', 
      key: 'employee_name', 
      sortable: true,
      render: (row) => (
        <div className="employee-info">
          <div className="employee-avatar">
            <span className="material-icons-outlined" style={{ color: '#94a3b8' }}>person</span>
          </div>
          <div className="employee-details">
            <div className="employee-name" style={{ fontWeight: 600 }}>{row.employee_name}</div>
            <div className="employee-position" style={{ fontSize: '0.8rem', color: '#64748b' }}>{row.position}</div>
          </div>
        </div>
      )
    },
    { header: 'PERIOD', key: 'period', sortable: true },
    { 
      header: 'GROSS', 
      key: 'gross_salary', 
      render: (row) => `$${(row.gross_salary || 0).toLocaleString()}`
    },
    { 
      header: 'NET SALARY', 
      key: 'net_salary', 
      sortable: true,
      render: (row) => (
        <div className="salary-display" style={{ fontWeight: 600, color: 'var(--primary-color)' }}>
          ${(row.net_salary || 0).toLocaleString()}
        </div>
      )
    },
    { 
      header: 'STATUS', 
      key: 'status', 
      sortable: true,
      render: (row) => (
        <span className={`employee-status status-${(row.status || '').toLowerCase()}`}>
          {row.status}
        </span>
      )
    }
  ], []);

  const breadcrumbs = [
    { label: isArabic ? 'لوحة التحكم' : 'Dashboard', href: getLocalizedRoute('admin.dashboard') },
    { label: isArabic ? 'الموارد البشرية' : 'Human Resources', href: '#' },
    { label: isArabic ? 'مسيرات الرواتب' : 'Salary Receipts', active: true }
  ];

  return (
    <AdminLayout activeMenu="Salary Receipts">
      <Head title="Salary Receipts" />
      
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      <BlankPage
        breadcrumbs={breadcrumbs}
        stats={!showForm && (
          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: 'var(--info-color)' }}>
                <span className="material-icons-outlined">receipt_long</span>
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">Total Receipts</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: 'var(--success-color)' }}>
                <span className="material-icons-outlined">check_circle</span>
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.paid}</div>
                <div className="stat-label">Paid</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: 'var(--warning-color)' }}>
                <span className="material-icons-outlined">pending_actions</span>
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.pending}</div>
                <div className="stat-label">Pending</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: 'var(--primary-color)' }}>
                <span className="material-icons-outlined">payments</span>
              </div>
              <div className="stat-content">
                <div className="stat-value">${stats.totalNetAmount.toLocaleString()}</div>
                <div className="stat-label">Total Net Amount</div>
              </div>
            </div>
          </div>
        )}
      >
        {showForm ? (
          <div className="employees-card fade-in">
            <div className="card-header">
              <h3>{editingId ? 'Edit Salary Receipt' : 'Generate New Receipt'}</h3>
              <button className="btn btn-outline" onClick={handleCancel}>
                <span className="material-icons-outlined">arrow_back</span>
                <span>Back to List</span>
              </button>
            </div>
            <div className="card-body" style={{ padding: '20px' }}>
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Employee *</label>
                    <select 
                      className="form-control" 
                      name="employee_id" 
                      value={formData.employee_id}
                      onChange={handleInputChange}
                      required
                      disabled={!!editingId}
                    >
                      <option value="">Select Employee</option>
                      {Array.isArray(employeesData) && employeesData.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Period (Month) *</label>
                    <input 
                      type="month" 
                      className="form-control" 
                      name="period" 
                      value={formData.period}
                      onChange={handleInputChange}
                      required
                      disabled={!!editingId}
                    />
                  </div>
                  {!editingId && (
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

                <div className="salary-breakdown-box" style={{ 
                  background: '#f8fafc', 
                  padding: '20px', 
                  borderRadius: '8px', 
                  marginBottom: '20px',
                  border: '1px solid #e2e8f0'
                }}>
                  <div className="breakdown-item" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span>Basic Salary (Gross)</span>
                    <strong style={{ fontWeight: 600 }}>${formData.gross_salary.toLocaleString()}</strong>
                  </div>
                  <div className="breakdown-item" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span>Total Rewards (+)</span>
                    <strong style={{ color: '#10b981', fontWeight: 600 }}>+${formData.total_rewards.toLocaleString()}</strong>
                  </div>
                  <div className="breakdown-item" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span>Total Deductions (-)</span>
                    <strong style={{ color: '#ef4444', fontWeight: 600 }}>-${formData.total_deductions.toLocaleString()}</strong>
                  </div>
                  <div className="breakdown-item" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span>Total Advances (-)</span>
                    <strong style={{ color: '#ef4444', fontWeight: 600 }}>-${formData.total_advances.toLocaleString()}</strong>
                  </div>
                  <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '15px 0' }} />
                  <div className="breakdown-item total" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                    <span style={{ fontWeight: 600 }}>Net Salary</span>
                    <strong style={{ color: 'var(--primary-color)', fontWeight: 700 }}>${formData.net_salary.toLocaleString()}</strong>
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
                      style={{ backgroundColor: '#f8fafc' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Date *</label>
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

                <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn btn-primary">
                    {editingId ? 'Update Receipt' : 'Save Receipt'}
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
              addButtonText="Generate Receipt"
              onAdd={handleAdd}
              showRefreshButton={true}
              onRefresh={() => {
                fetchReceipts();
                showToast('Receipts list refreshed!', 'success');
              }}
              tableData={filteredReceipts}
              columns={columns}
              onEdit={handleEdit}
              onDelete={(row) => handleDelete(row.id)}
            />
          </div>
        )}
      </BlankPage>
    </AdminLayout>
  );
};

export default SalaryReceipt;
