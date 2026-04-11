import React, { useState, useEffect } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/main.scss';

const Departments = ({ departments: propDepartments, employees: propEmployees }) => {
    const { props } = usePage();
    const localization = props.localization;

    const getLocalizedRoute = (name, params = {}) => {
        return route(name, {
            country: localization?.country_code || 'sa',
            lang: localization?.current_locale || 'ar',
            ...params
        });
    };

    const departmentsData = propDepartments?.data || (Array.isArray(propDepartments) ? propDepartments : []);
    const employeesData = propEmployees?.data || (Array.isArray(propEmployees) ? propEmployees : []);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentDepartment, setCurrentDepartment] = useState(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name_ar: '',
        name_en: '',
        description: '',
        manager_id: '',
        is_active: true,
        company_id: null,
    });

    const [filteredDepartments, setFilteredDepartments] = useState(departmentsData);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredDepartments(departmentsData);
            return;
        }
        const lowerTerm = searchTerm.toLowerCase();
        const filtered = departmentsData.filter(d => 
            (d.name_en && d.name_en.toLowerCase().includes(lowerTerm)) ||
            (d.name_ar && d.name_ar.toLowerCase().includes(lowerTerm)) ||
            (d.manager && d.manager.name && d.manager.name.toLowerCase().includes(lowerTerm))
        );
        setFilteredDepartments(filtered);
    }, [propDepartments, searchTerm]);

    const stats = {
        total: departmentsData.length,
        active: departmentsData.filter(d => d.is_active).length,
        employees: employeesData.length,
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const openModal = (dept = null) => {
        clearErrors();
        if (dept) {
            setCurrentDepartment(dept);
            setData({
                name_ar: dept.name_ar || '',
                name_en: dept.name_en || '',
                description: dept.description || '',
                manager_id: dept.manager_id || '',
                is_active: !!dept.is_active,
                company_id: dept.company_id || null,
            });
        } else {
            setCurrentDepartment(null);
            reset();
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentDepartment(null);
        reset();
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (currentDepartment) {
            put(getLocalizedRoute('admin.departments.update', { department: currentDepartment.id }), {
                onSuccess: () => closeModal(),
            });
        } else {
            post(getLocalizedRoute('admin.departments.store'), {
                onSuccess: () => closeModal(),
            });
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this department?')) {
            router.delete(getLocalizedRoute('admin.departments.destroy', { department: id }));
        }
    };

    return (
        <AdminLayout activeMenu="Departments">
            <Head title="Departments" />
            <div className="breadcrumb">
                <a href="#">Dashboard</a>
                <span>/</span>
                <a href="#">Human Resources</a>
                <span>/</span>
                <span>Departments</span>
            </div>

            {/* Quick Stats */}
            <div className="stats-cards">
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--primary-color)' }}>
                        <span className="material-icons-outlined">business</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">Total Departments</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--success-color)' }}>
                        <span className="material-icons-outlined">check_circle</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.active}</div>
                        <div className="stat-label">Active Departments</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--info-color)' }}>
                        <span className="material-icons-outlined">people</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.employees}</div>
                        <div className="stat-label">Total Employees</div>
                    </div>
                </div>
            </div>

            {/* Main Card */}
            <div className="departments-card fade-in">
                <div className="card-header">
                    <div className="departments-actions">
                        <div className="search-bar light">
                            <input 
                                type="text" 
                                placeholder="Search departments..." 
                                value={searchTerm}
                                onChange={handleSearch}
                            />
                            <button>
                                <span className="material-icons-outlined">search</span>
                            </button>
                        </div>
                    </div>
                    <div className="actions">
                        <button className="btn btn-primary" onClick={() => openModal()}>
                            <span className="material-icons-outlined">add</span>
                            <span>Add Department</span>
                        </button>
                        <button className="btn btn-outline" onClick={() => router.reload()}>
                            <span className="material-icons-outlined">refresh</span>
                            <span>Refresh</span>
                        </button>
                    </div>
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th><input type="checkbox" /></th>
                                <th>ID</th>
                                <th>DEPARTMENT (EN)</th>
                                <th>DEPARTMENT (AR)</th>
                                <th>MANAGER</th>
                                <th>STATUS</th>
                                <th>OPERATIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDepartments.map(dept => (
                                <tr key={dept.id}>
                                    <td><input type="checkbox" className="department-checkbox" /></td>
                                    <td>{dept.id.toString().padStart(3, '0')}</td>
                                    <td>{dept.name_en}</td>
                                    <td>{dept.name_ar}</td>
                                    <td>{dept.manager?.name || 'No Manager'}</td>
                                    <td>
                                        <span className={`department-status status-${dept.is_active ? 'active' : 'inactive'}`}>
                                            {dept.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="icon-btn edit" onClick={() => openModal(dept)}>
                                            <span className="material-icons-outlined">edit</span>
                                        </button>
                                        <button className="icon-btn delete" onClick={() => handleDelete(dept.id)}>
                                            <span className="material-icons-outlined">delete</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Overlay */}
            <div className={`modal-overlay ${isModalOpen ? 'active' : ''}`} onClick={(e) => { if(e.target.className.includes('modal-overlay')) closeModal(); }}>
                <div className="modal">
                    <div className="modal-header">
                        <h3 className="modal-title">{currentDepartment ? 'Edit Department' : 'Add New Department'}</h3>
                        <button className="modal-close" onClick={closeModal}>
                            <span className="material-icons-outlined">close</span>
                        </button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Department Name (EN) *</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={data.name_en}
                                    onChange={e => setData('name_en', e.target.value)}
                                    required 
                                />
                                {errors.name_en && <div className="text-error">{errors.name_en}</div>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Department Name (AR) *</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={data.name_ar}
                                    onChange={e => setData('name_ar', e.target.value)}
                                    required 
                                />
                                {errors.name_ar && <div className="text-error">{errors.name_ar}</div>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Department Manager</label>
                                <select 
                                    className="form-control" 
                                    value={data.manager_id}
                                    onChange={e => setData('manager_id', e.target.value)}
                                >
                                    <option value="">Select Manager</option>
                                    {employeesData.map((emp) => (
                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                    ))}
                                </select>
                                {errors.manager_id && <div className="text-error">{errors.manager_id}</div>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select 
                                    className="form-control" 
                                    value={data.is_active}
                                    onChange={e => setData('is_active', e.target.value === 'true')}
                                >
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </select>
                                {errors.is_active && <div className="text-error">{errors.is_active}</div>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea 
                                    className="form-control form-textarea" 
                                    value={data.description}
                                    onChange={e => setData('description', e.target.value)}
                                    placeholder="Enter department description"
                                ></textarea>
                                {errors.description && <div className="text-error">{errors.description}</div>}
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn" onClick={closeModal}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={processing}>
                                {currentDepartment ? 'Update Department' : 'Save Department'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
};

export default Departments;
