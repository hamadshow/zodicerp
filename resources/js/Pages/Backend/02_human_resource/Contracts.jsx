import React, { useState, useEffect, useMemo } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import Table from '../components/Table';
import BlankPage from '@/Components/BlankPage';
import '../../../../css/backend/main.scss';
import { apiService } from '../../../services/api';

const CONTRACT_TYPE_LABELS = {
    full_time: 'Full Time',
    part_time: 'Part Time',
    temporary: 'Temporary',
    probation: 'Probation',
};

const CONTRACT_STATUS_LABELS = {
    active: 'Active',
    expired: 'Expired',
    terminated: 'Terminated',
};

const Contracts = ({ employees: propEmployees }) => {
    const { props } = usePage();
    const localization = props?.localization;
    const isArabic = localization?.current_locale === 'ar';
    const [dbEmployees, setDbEmployees] = useState([]);

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

    const [contracts, setContracts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [toast, setToast] = useState(null);

    const [formData, setFormData] = useState({
        employee_id: '',
        contract_type: 'full_time',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        salary: '',
        status: 'active',
        notes: '',
    });

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchContracts = () => {
        apiService.get('/employee-contracts')
            .then(response => {
                setContracts(Array.isArray(response.data) ? response.data : []);
            })
            .catch(error => {
                console.error('Error fetching contracts:', error);
                setContracts([]);
            });
    };

    useEffect(() => {
        fetchContracts();
    }, []);

    const filteredContracts = useMemo(() => {
        const lowerSearch = (searchTerm || '').toLowerCase();
        return contracts.filter(c =>
            (c.employee_name || '').toLowerCase().includes(lowerSearch) ||
            (CONTRACT_TYPE_LABELS[c.contract_type] || c.contract_type || '').toLowerCase().includes(lowerSearch) ||
            (c.status || '').toLowerCase().includes(lowerSearch)
        );
    }, [searchTerm, contracts]);

    const stats = useMemo(() => ({
        total: contracts.length,
        active: contracts.filter(c => c.status === 'active' && !c.expired).length,
        expiring: contracts.filter(c => c.status === 'active' && c.days_until_expiry !== null && c.days_until_expiry >= 0 && c.days_until_expiry <= 30).length,
        expiredCount: contracts.filter(c => c.expired || c.status === 'expired').length,
    }), [contracts]);

    const handleAdd = () => {
        setEditingId(null);
        setFormData({
            employee_id: '',
            contract_type: 'full_time',
            start_date: new Date().toISOString().split('T')[0],
            end_date: '',
            salary: '',
            status: 'active',
            notes: '',
        });
        setShowForm(true);
    };

    const handleEdit = (contract) => {
        setEditingId(contract.id);
        setFormData({
            employee_id: String(contract.employee_id ?? ''),
            contract_type: contract.contract_type || 'full_time',
            start_date: contract.start_date || '',
            end_date: contract.end_date || '',
            salary: contract.salary ?? '',
            status: contract.status || 'active',
            notes: contract.notes || '',
        });
        setShowForm(true);
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingId(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.employee_id || !formData.start_date) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        const payload = {
            employee_id: formData.employee_id,
            contract_type: formData.contract_type,
            start_date: formData.start_date,
            end_date: formData.end_date || null,
            salary: formData.salary === '' ? null : parseFloat(formData.salary),
            status: formData.status,
            notes: formData.notes,
        };

        try {
            if (editingId) {
                await apiService.put(`/employee-contracts/${editingId}`, payload);
                showToast('Contract updated successfully', 'success');
            } else {
                await apiService.post('/employee-contracts', payload);
                showToast('Contract created successfully', 'success');
            }
            fetchContracts();
            handleCancel();
        } catch (error) {
            console.error('Error saving contract:', error);
            showToast(error?.response?.data?.message || 'Error saving contract', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this contract?')) {
            try {
                await apiService.delete(`/employee-contracts/${id}`);
                showToast('Contract deleted successfully', 'success');
                fetchContracts();
            } catch (error) {
                console.error('Error deleting contract:', error);
                showToast(error?.response?.data?.message || 'Error deleting contract', 'error');
            }
        }
    };

    const columns = [
        {
            header: 'ID',
            key: 'id',
            sortable: true,
            render: (record) => record.id.toString().padStart(3, '0')
        },
        {
            header: 'EMPLOYEE',
            key: 'employee_name',
            sortable: true,
            render: (record) => (
                <div className="employee-info">
                    <div className="employee-avatar">
                        <span className="material-icons-outlined" style={{ color: '#94a3b8' }}>person</span>
                    </div>
                    <div className="employee-details">
                        <div className="employee-name" style={{ fontWeight: 600 }}>{record.employee_name}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'TYPE',
            key: 'contract_type',
            sortable: true,
            render: (record) => <span className="department-badge">{CONTRACT_TYPE_LABELS[record.contract_type] || record.contract_type}</span>
        },
        { header: 'START', key: 'start_date', sortable: true },
        { header: 'END', key: 'end_date', sortable: true },
        {
            header: 'SALARY',
            key: 'salary',
            sortable: true,
            render: (record) => (
                <div className="salary-display">
                    {record.salary ? `$${Number(record.salary).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                </div>
            )
        },
        {
            header: 'STATUS',
            key: 'status',
            sortable: true,
            render: (record) => {
                if (record.expired) {
                    return <span className="employee-status status-terminated">Expired</span>;
                }
                const days = record.days_until_expiry;
                const expiringSoon = record.status === 'active' && days !== null && days >= 0 && days <= 30;
                return (
                    <span className={`employee-status status-${record.status}`}>
                        {CONTRACT_STATUS_LABELS[record.status] || record.status}
                        {expiringSoon && <span style={{ marginLeft: '6px', fontSize: '0.75rem' }}>({days}d)</span>}
                    </span>
                );
            }
        }
    ];

    const tableData = useMemo(() => filteredContracts, [filteredContracts]);

    const breadcrumbs = [
        { label: isArabic ? 'لوحة التحكم' : 'Dashboard', href: '#' },
        { label: isArabic ? 'الموارد البشرية' : 'Human Resources', href: '#' },
        { label: isArabic ? 'العقود' : 'Contracts', active: true }
    ];

    return (
        <AdminLayout activeMenu="Contracts">
            <Head title="Employee Contracts" />

            {toast && (
                <div className={`toast toast-${toast.type}`}>{toast.message}</div>
            )}

            <BlankPage
                breadcrumbs={breadcrumbs}
                stats={!showForm && (
                    <div className="stats-cards">
                        <div className="stat-card">
                            <div className="stat-icon" style={{ backgroundColor: 'var(--info-color)' }}>
                                <span className="material-icons-outlined">history_edu</span>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stats.total}</div>
                                <div className="stat-label">Total Contracts</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ backgroundColor: 'var(--success-color)' }}>
                                <span className="material-icons-outlined">check_circle</span>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stats.active}</div>
                                <div className="stat-label">Active</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ backgroundColor: 'var(--warning-color)' }}>
                                <span className="material-icons-outlined">schedule</span>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stats.expiring}</div>
                                <div className="stat-label">Expiring (30d)</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ backgroundColor: 'var(--danger-color)' }}>
                                <span className="material-icons-outlined">event_busy</span>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stats.expiredCount}</div>
                                <div className="stat-label">Expired</div>
                            </div>
                        </div>
                    </div>
                )}
            >
                {showForm ? (
                    <div className="employees-card fade-in">
                        <div className="card-header">
                            <h3>{editingId ? 'Edit Contract' : 'Add New Contract'}</h3>
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
                                        <label className="form-label">Contract Type *</label>
                                        <select
                                            className="form-control"
                                            name="contract_type"
                                            value={formData.contract_type}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="full_time">Full Time</option>
                                            <option value="part_time">Part Time</option>
                                            <option value="temporary">Temporary</option>
                                            <option value="probation">Probation</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Start Date *</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            name="start_date"
                                            value={formData.start_date}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">End Date</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            name="end_date"
                                            value={formData.end_date}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Salary ($)</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            name="salary"
                                            value={formData.salary}
                                            onChange={handleInputChange}
                                            min="0"
                                            step="0.01"
                                            placeholder="Leave empty if not applicable"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Status</label>
                                        <select
                                            className="form-control"
                                            name="status"
                                            value={formData.status}
                                            onChange={handleInputChange}
                                            disabled={!!editingId}
                                        >
                                            <option value="active">Active</option>
                                            <option value="expired">Expired</option>
                                            <option value="terminated">Terminated</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Notes</label>
                                    <textarea
                                        className="form-control form-textarea"
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleInputChange}
                                        placeholder="Contract terms, conditions, etc."
                                        style={{ minHeight: '100px' }}
                                    />
                                </div>

                                <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                                    <button type="submit" className="btn btn-primary">
                                        {editingId ? 'Update Contract' : 'Save Contract'}
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
                            addButtonText={isArabic ? 'عقد جديد' : 'Add Contract'}
                            onAdd={handleAdd}
                            showRefreshButton={true}
                            onRefresh={() => {
                                fetchContracts();
                                showToast('Contracts refreshed', 'success');
                            }}
                            tableData={tableData}
                            columns={columns}
                            onEdit={(record) => handleEdit(record)}
                            onDelete={(record) => handleDelete(record.id)}
                            emptyMessage={isArabic ? 'لا توجد عقود مسجلة' : 'No contracts found. Add the first employee contract.'}
                            viewTitle={isArabic ? 'عرض' : 'View'}
                            editTitle={isArabic ? 'تعديل' : 'Edit'}
                            deleteTitle={isArabic ? 'حذف' : 'Delete'}
                        />
                    </div>
                )}
            </BlankPage>
        </AdminLayout>
    );
};

export default Contracts;
