import React, { useState, useEffect, useMemo } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import Table from '../components/Table';
import BlankPage from '@/Components/BlankPage';
import '../../../../css/backend/main.scss';
import { apiService } from '../../../services/api';

const EndOfService = ({ employees: propEmployees }) => {
    const { props } = usePage();
    const localization = props?.localization;
    const isArabic = localization?.current_locale === 'ar';
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

    const employeesData = propEmployees?.data || (Array.isArray(propEmployees) ? propEmployees : (Array.isArray(dbEmployees) ? dbEmployees : []));
    
    const [eosList, setEosList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [toast, setToast] = useState(null);

    const TYPE_MAP = {
        Resignation: 'resignation',
        Termination: 'termination',
        'Contract End': 'contract_end',
        Retirement: 'retirement',
    };

    const TYPE_LABELS = {
        resignation: 'Resignation',
        termination: 'Termination',
        contract_end: 'Contract End',
        retirement: 'Retirement',
    };

    const STATUS_MAP = { Pending: 'pending', Processed: 'processed', Cancelled: 'cancelled' };
    const STATUS_LABELS = { pending: 'Pending', processed: 'Processed', cancelled: 'Cancelled' };

    const [formData, setFormData] = useState({
        employee: '',
        type: 'resignation',
        date: new Date().toISOString().split('T')[0],
        reason: '',
        amount: '',
        status: 'pending'
    });

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchEos = () => {
        apiService.get('/end-of-service')
            .then(response => {
                setEosList(Array.isArray(response.data) ? response.data : []);
            })
            .catch(() => {
                setEosList([]);
            });
    };

    useEffect(() => {
        fetchEos();
    }, []);

    const filteredEos = useMemo(() => {
        const lowerSearch = (searchTerm || '').toLowerCase();
        return eosList.filter(e =>
            (e.employee || '').toLowerCase().includes(lowerSearch) ||
            (e.type || '').toLowerCase().includes(lowerSearch) ||
            (e.reason || '').toLowerCase().includes(lowerSearch)
        );
    }, [searchTerm, eosList]);

    const stats = useMemo(() => ({
        total: eosList.length,
        processed: eosList.filter(e => e.statusRaw === 'processed').length,
        pending: eosList.filter(e => e.statusRaw === 'pending').length,
        totalAmount: eosList.reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0)
    }), [eosList]);

    const handleAdd = () => {
        setEditingId(null);
        setFormData({
            employee: '',
            type: 'resignation',
            date: new Date().toISOString().split('T')[0],
            reason: '',
            amount: '',
            status: 'pending'
        });
        setShowForm(true);
    };

    const handleEdit = (record) => {
        setEditingId(record.id);
        setFormData({
            employee: String(record.employeeId ?? ''),
            type: record.typeRaw || record.type,
            date: record.date,
            reason: record.reason || '',
            amount: record.amount,
            status: record.statusRaw || record.status
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
        if (!formData.employee || !formData.amount || !formData.date) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        const payload = {
            employeeId: formData.employee,
            type: TYPE_MAP[formData.type] || formData.type,
            date: formData.date,
            reason: formData.reason,
            amount: parseFloat(formData.amount),
            status: STATUS_MAP[formData.status] || formData.status,
        };

        try {
            if (editingId) {
                await apiService.put(`/end-of-service/${editingId}`, payload);
                showToast('Record updated successfully', 'success');
            } else {
                await apiService.post('/end-of-service', payload);
                showToast('Record added successfully', 'success');
            }
            fetchEos();
            setShowForm(false);
            setEditingId(null);
        } catch (error) {
            console.error('Error saving end-of-service record:', error);
            showToast(error?.response?.data?.message || 'Error saving record', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this record?')) {
            try {
                await apiService.delete(`/end-of-service/${id}`);
                showToast('Record deleted successfully', 'success');
                fetchEos();
            } catch (error) {
                console.error('Error deleting record:', error);
                showToast('Error deleting record', 'error');
            }
        }
    };

    const columns = [
        { 
            header: 'ID', 
            key: 'id', 
            sortable: true,
            render: (record) => record.id.toString().slice(-3).padStart(3, '0')
        },
        { 
            header: 'EMPLOYEE', 
            key: 'employee', 
            sortable: true,
            render: (record) => (
                <div className="employee-info">
                    <div className="employee-avatar">
                        <span className="material-icons-outlined" style={{ color: '#94a3b8' }}>person</span>
                    </div>
                    <div className="employee-details">
                        <div className="employee-name" style={{ fontWeight: 600 }}>{record.employee}</div>
                    </div>
                </div>
            )
        },
        { 
            header: 'TYPE', 
            key: 'type', 
            sortable: true,
            render: (record) => <span className="department-badge">{record.type}</span>
        },
        { header: 'DATE', key: 'date', sortable: true },
        { 
            header: 'AMOUNT', 
            key: 'amount', 
            sortable: true,
            render: (record) => <div className="salary-display">${record.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        },
        { 
            header: 'STATUS', 
            key: 'status', 
            sortable: true,
            render: (record) => (
                <span className={`employee-status status-${record.status.toLowerCase()}`}>
                    {record.status}
                </span>
            )
        }
    ];

    const breadcrumbs = [
        { label: isArabic ? 'لوحة التحكم' : 'Dashboard', href: '#' },
        { label: isArabic ? 'الموارد البشرية' : 'Human Resources', href: '#' },
        { label: isArabic ? 'نهاية الخدمة' : 'End of Service', active: true }
    ];

    return (
        <AdminLayout activeMenu="End of service">
            <Head title="End of Service" />
            
            {toast && (
                <div className={`toast toast-${toast.type}`}>{toast.message}</div>
            )}

            <BlankPage
                breadcrumbs={breadcrumbs}
                stats={!showForm && (
                    <div className="stats-cards">
                        <div className="stat-card">
                            <div className="stat-icon" style={{ backgroundColor: 'var(--info-color)' }}>
                                <span className="material-icons-outlined">assignment_return</span>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stats.total}</div>
                                <div className="stat-label">Total Records</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ backgroundColor: 'var(--success-color)' }}>
                                <span className="material-icons-outlined">check_circle</span>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stats.processed}</div>
                                <div className="stat-label">Processed</div>
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
                            <div className="stat-icon" style={{ backgroundColor: 'var(--primary-color)' }}>
                                <span className="material-icons-outlined">payments</span>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">${stats.totalAmount.toLocaleString()}</div>
                                <div className="stat-label">Total Amount</div>
                            </div>
                        </div>
                    </div>
                )}
            >
                {showForm ? (
                    <div className="employees-card fade-in">
                        <div className="card-header">
                            <h3>{editingId ? 'Edit EOS Record' : 'Add New EOS Record'}</h3>
                            <button className="btn btn-outline" onClick={handleCancel}>
                                <span className="material-icons-outlined">arrow_back</span>
                                <span>Back to List</span>
                            </button>
                        </div>
                        <div className="card-body" style={{ padding: '20px' }}>
                            <form onSubmit={handleSubmit}>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Employee Name *</label>
                                        <select 
                                            className="form-control" 
                                            name="employee" 
                                            value={formData.employee} 
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
                                        <label className="form-label">Type *</label>
                                        <select 
                                            className="form-control" 
                                            name="type" 
                                            value={formData.type} 
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="resignation">Resignation</option>
                                            <option value="termination">Termination</option>
                                            <option value="contract_end">Contract End</option>
                                            <option value="retirement">Retirement</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Last Working Date *</label>
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
                                        <label className="form-label">Settlement Amount ($) *</label>
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
                                            <option value="processed">Processed</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Reason</label>
                                        <textarea 
                                            className="form-control form-textarea" 
                                            name="reason" 
                                            value={formData.reason} 
                                            onChange={handleInputChange}
                                            placeholder="Enter reason for end of service..."
                                            style={{ minHeight: '100px' }}
                                        ></textarea>
                                    </div>
                                </div>

                                <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                                    <button type="submit" className="btn btn-primary">
                                        {editingId ? 'Update Record' : 'Save Record'}
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
                            addButtonText="Add Record"
                            onAdd={handleAdd}
                            tableData={filteredEos}
                            columns={columns}
                            onEdit={handleEdit}
                            onDelete={(record) => handleDelete(record.id)}
                        />
                    </div>
                )}
            </BlankPage>
        </AdminLayout>
    );
};

export default EndOfService;
