import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import Table from '../components/Table';
import BlankPage from '@/Components/BlankPage';
import '../../../../css/backend/main.scss';
import { apiService } from '../../../services/api';

const PayrollAdvance = ({ employees: propEmployees }) => {
    const { props } = usePage();
    const localization = props?.localization;
    const isArabic = localization?.current_locale === 'ar';
    const [dbEmployees, setDbEmployees] = useState([]);
    const [advances, setAdvances] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingAdvance, setEditingAdvance] = useState(null);
    const [toast, setToast] = useState(null);

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

    const employeesData = propEmployees?.data || (Array.isArray(propEmployees) ? propEmployees : (Array.isArray(dbEmployees) ? dbEmployees : []));

    const filteredAdvances = useMemo(() => {
        const lowerSearch = (searchTerm || '').toLowerCase();
        return (advances || []).filter(a => {
            const employeeName = (a.employee || '').toLowerCase();
            return employeeName.includes(lowerSearch);
        });
    }, [searchTerm, advances]);

    const stats = useMemo(() => {
        const total = advances.length;
        const totalAmount = advances.reduce((acc, a) => acc + (parseFloat(a.amount) || 0), 0);
        const pending = advances.filter(a => a.status === 'pending').length;
        const completed = advances.filter(a => a.status === 'completed').length;
        return { total, totalAmount, pending, completed };
    }, [advances]);

    const handleAdd = () => {
        setEditingAdvance(null);
        setFormData({
            employee_id: '',
            amount: '',
            date: new Date().toISOString().split('T')[0],
            repaymentPlan: '1 month',
            status: 'pending',
            notes: ''
        });
        setShowForm(true);
    };

    const handleEdit = (advance) => {
        setEditingAdvance(advance);
        setFormData({
            employee_id: advance.employee_id || '',
            amount: advance.amount || '',
            date: advance.date || new Date().toISOString().split('T')[0],
            repaymentPlan: advance.repaymentPlan || '1 month',
            status: advance.status || 'pending',
            notes: advance.notes || ''
        });
        setShowForm(true);
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingAdvance(null);
    };

    const [formData, setFormData] = useState({
        employee_id: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        repaymentPlan: '1 month',
        status: 'pending',
        notes: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const advanceData = {
            employee_id: formData.employee_id,
            amount: parseFloat(formData.amount),
            date: formData.date,
            repaymentPlan: formData.repaymentPlan,
            status: formData.status,
            notes: formData.notes || ''
        };

        if (editingAdvance) {
            apiService.put(`/payroll-advances/${editingAdvance.id}`, advanceData)
                .then(() => {
                    showToast('Advance updated successfully!', 'success');
                    fetchAdvances();
                    handleCancel();
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
                    handleCancel();
                })
                .catch(err => {
                    console.error(err);
                    showToast('Failed to request advance.', 'error');
                });
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this advance?')) {
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

    const columns = useMemo(() => [
        { 
            header: 'ID', 
            key: 'id', 
            sortable: true,
            render: (row) => row.id.toString().padStart(3, '0')
        },
        { 
            header: 'EMPLOYEE', 
            key: 'employee', 
            sortable: true,
            render: (row) => (
                <div className="employee-info">
                    <div className="employee-avatar">
                        <span className="material-icons-outlined" style={{ color: '#94a3b8' }}>person</span>
                    </div>
                    <div className="employee-details">
                        <div className="employee-name" style={{ fontWeight: 600 }}>{row.employee}</div>
                    </div>
                </div>
            )
        },
        { 
            header: 'AMOUNT', 
            key: 'amount', 
            sortable: true,
            render: (row) => <div className="salary-display">${parseFloat(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        },
        { header: 'DATE', key: 'date', sortable: true },
        { 
            header: 'PLAN', 
            key: 'repaymentPlan', 
            render: (row) => <span className="department-badge">{row.repaymentPlan}</span>
        },
        { 
            header: 'STATUS', 
            key: 'status', 
            sortable: true,
            render: (row) => (
                <span className={`employee-status status-${row.status.toLowerCase()}`}>
                    {row.status.charAt(0).toUpperCase() + row.status.slice(1).replace('_', ' ')}
                </span>
            )
        }
    ], []);

    const breadcrumbs = [
        { label: isArabic ? 'لوحة التحكم' : 'Dashboard', href: getLocalizedRoute('admin.dashboard') },
        { label: isArabic ? 'الموارد البشرية' : 'Human Resources', href: '#' },
        { label: isArabic ? 'سلف الرواتب' : 'Payroll Advance', active: true }
    ];

    return (
        <AdminLayout activeMenu="Payroll-Advance">
            <Head title="Payroll Advance" />
            
            {toast && (
                <div className={`toast toast-${toast.type}`}>{toast.message}</div>
            )}

            <BlankPage
                breadcrumbs={breadcrumbs}
                stats={!showForm && (
                    <div className="stats-cards">
                        <div className="stat-card">
                            <div className="stat-icon" style={{ backgroundColor: 'var(--info-color)' }}>
                                <span className="material-icons-outlined">payments</span>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stats.total}</div>
                                <div className="stat-label">Total Requests</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ backgroundColor: 'var(--primary-color)' }}>
                                <span className="material-icons-outlined">monetization_on</span>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">${stats.totalAmount.toLocaleString()}</div>
                                <div className="stat-label">Total Amount</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ backgroundColor: 'var(--warning-color)' }}>
                                <span className="material-icons-outlined">pending_actions</span>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stats.pending}</div>
                                <div className="stat-label">Pending Approval</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ backgroundColor: 'var(--success-color)' }}>
                                <span className="material-icons-outlined">check_circle</span>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stats.completed}</div>
                                <div className="stat-label">Completed</div>
                            </div>
                        </div>
                    </div>
                )}
            >
                {showForm ? (
                    <div className="employees-card fade-in">
                        <div className="card-header">
                            <h3>{editingAdvance ? 'Edit Advance Request' : 'New Advance Request'}</h3>
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
                                        >
                                            <option value="">Select Employee</option>
                                            {Array.isArray(employeesData) && employeesData.map(e => (
                                                <option key={e.id} value={e.id}>{e.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Advance Amount ($) *</label>
                                        <input 
                                            type="number" 
                                            className="form-control" 
                                            name="amount" 
                                            value={formData.amount} 
                                            onChange={handleInputChange}
                                            required 
                                            step="0.01" 
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Date *</label>
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
                                        <label className="form-label">Repayment Plan *</label>
                                        <select 
                                            className="form-control" 
                                            name="repaymentPlan" 
                                            value={formData.repaymentPlan} 
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="1 month">1 month</option>
                                            <option value="3 months">3 months</option>
                                            <option value="6 months">6 months</option>
                                            <option value="12 months">12 months</option>
                                        </select>
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
                                            <option value="approved">Approved</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="completed">Completed</option>
                                            <option value="defaulted">Defaulted</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Notes</label>
                                        <textarea 
                                            className="form-control form-textarea" 
                                            name="notes" 
                                            value={formData.notes} 
                                            onChange={handleInputChange}
                                            placeholder="Enter any additional notes..."
                                            style={{ minHeight: '100px' }}
                                        />
                                    </div>
                                </div>

                                <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                                    <button type="submit" className="btn btn-primary">
                                        {editingAdvance ? 'Update Request' : 'Submit Request'}
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
                            addButtonText="Request Advance"
                            onAdd={handleAdd}
                            showRefreshButton={true}
                            onRefresh={() => {
                                fetchAdvances();
                                showToast('Advances refreshed!', 'success');
                            }}
                            tableData={filteredAdvances}
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

export default PayrollAdvance;
