import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import Table from '../components/Table';
import BlankPage from '@/Components/BlankPage';
import '../../../../css/backend/main.scss';
import { apiService } from '../../../services/api';

const Deductions = ({ employees: propEmployees }) => {
    const { props } = usePage();
    const localization = props?.localization;
    const isArabic = localization?.current_locale === 'ar';
    const [dbEmployees, setDbEmployees] = useState([]);
    const [deductions, setDeductions] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingDeduction, setEditingDeduction] = useState(null);
    const [toast, setToast] = useState(null);

    const [formData, setFormData] = useState({
        employee_id: '',
        type: 'Late Arrival',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        reason: '',
        status: 'Pending'
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

    const fetchDeductions = useCallback(async () => {
        try {
            const response = await apiService.get('/deductions');
            setDeductions(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Error fetching deductions:', error);
            showToast('Error loading deductions', 'error');
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

    const stats = useMemo(() => {
        const total = deductions.length;
        const totalAmount = deductions.reduce((acc, d) => acc + (parseFloat(d.amount) || 0), 0);
        const pending = deductions.filter(d => d.status === 'Pending').length;
        const approved = deductions.filter(d => d.status === 'Approved').length;
        return { total, totalAmount, pending, approved };
    }, [deductions]);

    const handleAdd = () => {
        setEditingDeduction(null);
        setFormData({
            employee_id: '',
            type: 'Late Arrival',
            amount: '',
            date: new Date().toISOString().split('T')[0],
            reason: '',
            status: 'Pending'
        });
        setShowForm(true);
    };

    const handleEdit = (deduction) => {
        setEditingDeduction(deduction);
        setFormData({
            employee_id: deduction.employee_id,
            type: deduction.type,
            amount: deduction.amount,
            date: deduction.date,
            reason: deduction.reason,
            status: deduction.status
        });
        setShowForm(true);
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingDeduction(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingDeduction) {
                await apiService.put(`/deductions/${editingDeduction.id}`, formData);
                showToast('Deduction updated successfully', 'success');
            } else {
                await apiService.post('/deductions', formData);
                showToast('Deduction added successfully', 'success');
            }
            fetchDeductions();
            handleCancel();
        } catch (error) {
            console.error('Error saving deduction:', error);
            showToast('Error saving deduction', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this deduction?')) {
            try {
                await apiService.delete(`/deductions/${id}`);
                showToast('Deduction deleted successfully', 'success');
                fetchDeductions();
            } catch (error) {
                console.error('Error deleting deduction:', error);
                showToast('Error deleting deduction', 'error');
            }
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
            key: 'employee_name', 
            sortable: true,
            render: (row) => (
                <div className="employee-info">
                    <div className="employee-avatar">
                        <span className="material-icons-outlined" style={{ color: '#94a3b8' }}>person</span>
                    </div>
                    <div className="employee-details">
                        <div className="employee-name" style={{ fontWeight: 600 }}>{row.employee_name}</div>
                    </div>
                </div>
            )
        },
        { 
            header: 'TYPE', 
            key: 'type', 
            sortable: true,
            render: (row) => <span className="department-badge">{row.type}</span>
        },
        { 
            header: 'AMOUNT', 
            key: 'amount', 
            sortable: true,
            render: (row) => <div className="salary-display">${parseFloat(row.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        },
        { header: 'DATE', key: 'date', sortable: true },
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
        { label: isArabic ? 'الخصومات' : 'Deductions', active: true }
    ];

    return (
        <AdminLayout activeMenu="Deductions">
            <Head title="Deductions" />
            
            {toast && (
                <div className={`toast toast-${toast.type}`}>{toast.message}</div>
            )}

            <BlankPage
                breadcrumbs={breadcrumbs}
                stats={!showForm && (
                    <div className="stats-cards">
                        <div className="stat-card">
                            <div className="stat-icon" style={{ backgroundColor: 'var(--info-color)' }}>
                                <span className="material-icons-outlined">remove_circle</span>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stats.total}</div>
                                <div className="stat-label">Total Deductions</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ backgroundColor: 'var(--danger-color)' }}>
                                <span className="material-icons-outlined">payments</span>
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
                                <div className="stat-value">{stats.approved}</div>
                                <div className="stat-label">Approved</div>
                            </div>
                        </div>
                    </div>
                )}
            >
                {showForm ? (
                    <div className="employees-card fade-in">
                        <div className="card-header">
                            <h3>{editingDeduction ? 'Edit Deduction' : 'Add New Deduction'}</h3>
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
                                        <label className="form-label">Deduction Type *</label>
                                        <select 
                                            className="form-control" 
                                            name="type" 
                                            value={formData.type}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="Late Arrival">Late Arrival</option>
                                            <option value="Absent">Absent</option>
                                            <option value="Equipment Damage">Equipment Damage</option>
                                            <option value="Loan Repayment">Loan Repayment</option>
                                            <option value="Other">Other</option>
                                        </select>
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
                                        <label className="form-label">Amount ($) *</label>
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
                                    <div className="form-group">
                                        <label className="form-label">Reason</label>
                                        <textarea 
                                            className="form-control form-textarea" 
                                            name="reason" 
                                            value={formData.reason}
                                            onChange={handleInputChange}
                                            placeholder="Enter reason for deduction..."
                                            style={{ minHeight: '100px' }}
                                        ></textarea>
                                    </div>
                                </div>

                                <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                                    <button type="submit" className="btn btn-primary">
                                        {editingDeduction ? 'Update Deduction' : 'Save Deduction'}
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
                            addButtonText="Add Deduction"
                            onAdd={handleAdd}
                            showRefreshButton={true}
                            onRefresh={() => {
                                fetchDeductions();
                                showToast('Deductions list refreshed!', 'success');
                            }}
                            tableData={filteredDeductions}
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

export default Deductions;
