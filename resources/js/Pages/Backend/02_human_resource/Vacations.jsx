import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import Table from '../components/Table';
import BlankPage from '@/Components/BlankPage';
import '../../../../css/backend/main.scss';
import { apiService } from '../../../services/api';

const LEAVE_TYPES = {
    annual: 'Annual Leave',
    sick: 'Sick Leave',
    maternity: 'Maternity Leave',
    unpaid: 'Unpaid Leave',
};

const VacationsManagement = ({ employees: propEmployees }) => {
    const { props } = usePage();
    const localization = props?.localization;
    const isArabic = localization?.current_locale === 'ar';
    const [dbEmployees, setDbEmployees] = useState([]);
    const [vacations, setVacations] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingVacation, setEditingVacation] = useState(null);
    const [toast, setToast] = useState(null);

    const [formData, setFormData] = useState({
        employeeId: '',
        employeeName: '',
        leaveType: '',
        startDate: '',
        endDate: '',
        status: 'pending',
        totalDays: 0,
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
        fetchVacations();
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

    const fetchVacations = () => {
        apiService.get('/vacations')
            .then(response => {
                setVacations(Array.isArray(response.data) ? response.data : []);
            })
            .catch(() => {
                setVacations([]);
            });
    };

    const employeesData = propEmployees?.data || (Array.isArray(propEmployees) ? propEmployees : (Array.isArray(dbEmployees) ? dbEmployees : []));

    useEffect(() => {
        if (formData.startDate && formData.endDate) {
            const start = new Date(formData.startDate);
            const end = new Date(formData.endDate);
            const days = Math.ceil((end - start) / 86400000) + 1;
            setFormData(prev => ({ ...prev, totalDays: days > 0 ? days : 0 }));
        }
    }, [formData.startDate, formData.endDate]);

    const filteredVacations = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        return vacations.filter(v =>
            (v.employeeName || '').toLowerCase().includes(lowerSearch) ||
            (LEAVE_TYPES[v.leaveType] || '').toLowerCase().includes(lowerSearch)
        );
    }, [searchTerm, vacations]);

    const stats = useMemo(() => ({
        total: vacations.length,
        approved: vacations.filter(v => v.status === 'approved').length,
        pending: vacations.filter(v => v.status === 'pending').length,
        rejected: vacations.filter(v => v.status === 'rejected').length,
    }), [vacations]);

    const handleAdd = () => {
        setEditingVacation(null);
        setFormData({
            employeeId: '',
            employeeName: '',
            leaveType: '',
            startDate: '',
            endDate: '',
            status: 'pending',
            totalDays: 0,
        });
        setShowForm(true);
    };

    const handleEdit = (vacation) => {
        setEditingVacation(vacation);
        setFormData({
            employeeId: vacation.employeeId,
            employeeName: vacation.employeeName,
            leaveType: vacation.leaveType,
            startDate: vacation.startDate,
            endDate: vacation.endDate,
            status: vacation.status,
            totalDays: vacation.totalDays,
        });
        setShowForm(true);
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingVacation(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'employeeId') {
            const emp = employeesData.find(x => x.id == value);
            setFormData(prev => ({ ...prev, employeeId: value, employeeName: emp ? emp.name : '' }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingVacation) {
                await apiService.put(`/vacations/${editingVacation.id}`, formData);
                showToast('Vacation updated successfully', 'success');
            } else {
                await apiService.post('/vacations', formData);
                showToast('Vacation request submitted', 'success');
            }
            fetchVacations();
            handleCancel();
        } catch {
            showToast('Error saving vacation request', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this vacation request?')) {
            try {
                await apiService.delete(`/vacations/${id}`);
                showToast('Vacation deleted successfully', 'success');
                fetchVacations();
            } catch {
                showToast('Error deleting vacation', 'error');
            }
        }
    };

    const columns = [
        { 
            header: 'ID', 
            key: 'id', 
            sortable: true,
            render: (row) => row.id.toString().slice(-3).padStart(3, '0')
        },
        { 
            header: 'EMPLOYEE', 
            key: 'employeeName', 
            sortable: true,
            render: (row) => (
                <div className="employee-info">
                    <div className="employee-avatar">
                        <span className="material-icons-outlined" style={{ color: '#94a3b8' }}>person</span>
                    </div>
                    <div className="employee-details">
                        <div className="employee-name" style={{ fontWeight: 600 }}>{row.employeeName}</div>
                    </div>
                </div>
            )
        },
        { 
            header: 'TYPE', 
            key: 'leaveType', 
            render: (row) => <span className="department-badge">{LEAVE_TYPES[row.leaveType] || row.leaveType}</span>
        },
        { 
            header: 'DATES', 
            key: 'dates',
            render: (row) => `${row.startDate} → ${row.endDate}`
        },
        { header: 'DAYS', key: 'totalDays', sortable: true },
        { 
            header: 'STATUS', 
            key: 'status', 
            sortable: true,
            render: (row) => (
                <span className={`employee-status status-${row.status.toLowerCase()}`}>
                    {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                </span>
            )
        }
    ];

    const breadcrumbs = [
        { label: isArabic ? 'لوحة التحكم' : 'Dashboard', href: getLocalizedRoute('admin.dashboard') },
        { label: isArabic ? 'الموارد البشرية' : 'Human Resources', href: '#' },
        { label: isArabic ? 'الإجازات' : 'Vacations', active: true }
    ];

    return (
        <AdminLayout activeMenu="Vacations">
            <Head title="Vacations Management" />
            
            {toast && (
                <div className={`toast toast-${toast.type}`}>{toast.message}</div>
            )}

            <BlankPage
                breadcrumbs={breadcrumbs}
                stats={!showForm && (
                    <div className="stats-cards">
                        <div className="stat-card">
                            <div className="stat-icon" style={{ backgroundColor: 'var(--info-color)' }}>
                                <span className="material-icons-outlined">flight_takeoff</span>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stats.total}</div>
                                <div className="stat-label">Total Requests</div>
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
                            <div className="stat-icon" style={{ backgroundColor: 'var(--danger-color)' }}>
                                <span className="material-icons-outlined">cancel</span>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stats.rejected}</div>
                                <div className="stat-label">Rejected</div>
                            </div>
                        </div>
                    </div>
                )}
            >
                {showForm ? (
                    <div className="employees-card fade-in">
                        <div className="card-header">
                            <h3>{editingVacation ? 'Edit Vacation Request' : 'New Vacation Request'}</h3>
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
                                            name="employeeId" 
                                            value={formData.employeeId} 
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
                                        <label className="form-label">Leave Type *</label>
                                        <select 
                                            className="form-control" 
                                            name="leaveType" 
                                            value={formData.leaveType} 
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="">Select Type</option>
                                            {Object.entries(LEAVE_TYPES).map(([k, v]) => (
                                                <option key={k} value={k}>{v}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Start Date *</label>
                                        <input 
                                            type="date" 
                                            className="form-control" 
                                            name="startDate" 
                                            value={formData.startDate} 
                                            onChange={handleInputChange}
                                            required 
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">End Date *</label>
                                        <input 
                                            type="date" 
                                            className="form-control" 
                                            name="endDate" 
                                            value={formData.endDate} 
                                            onChange={handleInputChange}
                                            required 
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Total Days</label>
                                        <input 
                                            type="number" 
                                            className="form-control" 
                                            value={formData.totalDays} 
                                            readOnly 
                                            style={{ backgroundColor: '#f8fafc' }}
                                        />
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
                                            <option value="approved">Approved</option>
                                            <option value="rejected">Rejected</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                                    <button type="submit" className="btn btn-primary">
                                        {editingVacation ? 'Update Request' : 'Submit Request'}
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
                            addButtonText="New Request"
                            onAdd={handleAdd}
                            showRefreshButton={true}
                            onRefresh={() => {
                                fetchVacations();
                                showToast('Vacations refreshed!', 'success');
                            }}
                            tableData={filteredVacations}
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

export default VacationsManagement;
