import React, { useState, useEffect } from 'react';
import { Head, useForm, router, usePage, Link } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/main.scss';

const Departments = ({ departments: propDepartments, employees: propEmployees }) => {
    const { props } = usePage();
    const localization = props.localization;
    const translations = localization?.translations || {};

    const getTranslation = (key, fallback) => {
        return translations[`departments.${key}`] || translations[`common.${key}`] || fallback;
    };

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
    const [currentView, setCurrentView] = useState('list'); // 'list', 'create', 'edit', 'details'
    const [currentDepartment, setCurrentDepartment] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });

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
        let result = [...departmentsData];

        // Search filtering
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(d => 
                (d.name_en && d.name_en.toLowerCase().includes(lowerTerm)) ||
                (d.name_ar && d.name_ar.toLowerCase().includes(lowerTerm)) ||
                (d.manager && d.manager.name && d.manager.name.toLowerCase().includes(lowerTerm))
            );
        }

        // Sorting
        if (sortConfig.key) {
            result.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }

        setFilteredDepartments(result);
    }, [propDepartments, searchTerm, sortConfig]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const stats = {
        total: departmentsData.length,
        active: departmentsData.filter(d => d.is_active).length,
        employees: employeesData.length,
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const openCreateView = () => {
        clearErrors();
        setCurrentDepartment(null);
        reset();
        setCurrentView('create');
    };

    const openEditView = (dept) => {
        clearErrors();
        setCurrentDepartment(dept);
        setData({
            name_ar: dept.name_ar || '',
            name_en: dept.name_en || '',
            description: dept.description || '',
            manager_id: dept.manager_id || '',
            is_active: !!dept.is_active,
            company_id: dept.company_id || null,
        });
        setCurrentView('edit');
    };

    const openDetailsView = (dept) => {
        setCurrentDepartment(dept);
        setCurrentView('details');
    };

    const backToList = () => {
        setCurrentView('list');
        setCurrentDepartment(null);
        reset();
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (currentView === 'edit') {
            put(getLocalizedRoute('admin.departments.update', { department: currentDepartment.id }), {
                onSuccess: () => backToList(),
            });
        } else {
            post(getLocalizedRoute('admin.departments.store'), {
                onSuccess: () => backToList(),
            });
        }
    };

    const handleDelete = (id) => {
        if (window.confirm(getTranslation('confirm_delete', 'Are you sure you want to delete this department?'))) {
            router.delete(getLocalizedRoute('admin.departments.destroy', { department: id }));
        }
    };

    const renderBreadcrumbs = () => (
        <div className="breadcrumb">
            <Link href={getLocalizedRoute('admin.dashboard')}>{getTranslation('dashboard', 'Dashboard')}</Link>
            <span>/</span>
            <a href="#" onClick={(e) => { e.preventDefault(); backToList(); }}>{getTranslation('human_resources', 'Human Resources')}</a>
            <span>/</span>
            <span>{getTranslation('departments', 'Departments')}</span>
            {currentView !== 'list' && (
                <>
                    <span>/</span>
                    <span>
                        {currentView === 'create' ? getTranslation('add_department', 'Add Department') : 
                         currentView === 'edit' ? getTranslation('edit_department', 'Edit Department') : 
                         getTranslation('department_details', 'Department Details')}
                    </span>
                </>
            )}
        </div>
    );

    const renderListView = () => (
        <div className="fade-in">
            {/* Quick Stats */}
            <div className="stats-cards">
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--primary-color)' }}>
                        <span className="material-icons-outlined">business</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">{getTranslation('total_departments', 'Total Departments')}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--success-color)' }}>
                        <span className="material-icons-outlined">check_circle</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.active}</div>
                        <div className="stat-label">{getTranslation('active_departments', 'Active Departments')}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--info-color)' }}>
                        <span className="material-icons-outlined">people</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.employees}</div>
                        <div className="stat-label">{getTranslation('total_employees', 'Total Employees')}</div>
                    </div>
                </div>
            </div>

            {/* Main Card */}
            <div className="departments-card">
                <div className="card-header">
                    <div className="departments-actions">
                        <div className="search-bar light">
                            <input 
                                type="text" 
                                placeholder={getTranslation('search_placeholder', 'Search departments...')}
                                value={searchTerm}
                                onChange={handleSearch}
                            />
                            <button>
                                <span className="material-icons-outlined">search</span>
                            </button>
                        </div>
                    </div>
                    <div className="actions">
                        <button className="btn btn-primary" onClick={openCreateView}>
                            <span className="material-icons-outlined">add</span>
                            <span>{getTranslation('add_department', 'Add Department')}</span>
                        </button>
                        <button className="btn btn-outline" onClick={() => router.reload()}>
                            <span className="material-icons-outlined">refresh</span>
                            <span>{getTranslation('refresh', 'Refresh')}</span>
                        </button>
                    </div>
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th><input type="checkbox" /></th>
                                <th onClick={() => requestSort('id')} style={{ cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        ID
                                        <span className="material-icons-outlined" style={{ fontSize: '16px' }}>
                                            {sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'sort'}
                                        </span>
                                    </div>
                                </th>
                                <th>{getTranslation('department_en', 'DEPARTMENT (EN)')}</th>
                                <th>{getTranslation('department_ar', 'DEPARTMENT (AR)')}</th>
                                <th>{getTranslation('manager', 'MANAGER')}</th>
                                <th>{getTranslation('status', 'STATUS')}</th>
                                <th>{getTranslation('operations', 'OPERATIONS')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDepartments.map(dept => (
                                <tr key={dept.id}>
                                    <td><input type="checkbox" className="department-checkbox" /></td>
                                    <td>{dept.id.toString().padStart(3, '0')}</td>
                                    <td onClick={() => openDetailsView(dept)} style={{ cursor: 'pointer', color: 'var(--primary-color)' }}>
                                        {dept.name_en}
                                    </td>
                                    <td>{dept.name_ar}</td>
                                    <td>{dept.manager?.name || getTranslation('no_manager', 'No Manager')}</td>
                                    <td>
                                        <span className={`department-status status-${dept.is_active ? 'active' : 'inactive'}`}>
                                            {dept.is_active ? getTranslation('active', 'Active') : getTranslation('inactive', 'Inactive')}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="icon-btn view" onClick={() => openDetailsView(dept)}>
                                            <span className="material-icons-outlined">visibility</span>
                                        </button>
                                        <button className="icon-btn edit" onClick={() => openEditView(dept)}>
                                            <span className="material-icons-outlined">edit</span>
                                        </button>
                                        <button className="icon-btn delete" onClick={() => handleDelete(dept.id)}>
                                            <span className="material-icons-outlined">delete</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredDepartments.length === 0 && (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                                        {getTranslation('no_data', 'No departments found.')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderFormView = () => (
        <div className="fade-in">
            <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <button className="btn btn-outline btn-sm" onClick={backToList}>
                            <span className="material-icons-outlined">arrow_back</span>
                            <span>{getTranslation('back', 'Back')}</span>
                        </button>
                        <h2 style={{ margin: 0 }}>
                            {currentView === 'edit' ? getTranslation('edit_department', 'Edit Department') : getTranslation('add_department', 'Add New Department')}
                        </h2>
                    </div>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="card-body" style={{ padding: '30px' }}>
                        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                            <div className="form-group">
                                <label className="form-label">{getTranslation('name_en', 'Department Name (EN)')} *</label>
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
                                <label className="form-label">{getTranslation('name_ar', 'Department Name (AR)')} *</label>
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
                                <label className="form-label">{getTranslation('manager', 'Department Manager')}</label>
                                <select 
                                    className="form-control" 
                                    value={data.manager_id}
                                    onChange={e => setData('manager_id', e.target.value)}
                                >
                                    <option value="">{getTranslation('select_manager', 'Select Manager')}</option>
                                    {employeesData.map((emp) => (
                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                    ))}
                                </select>
                                {errors.manager_id && <div className="text-error">{errors.manager_id}</div>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">{getTranslation('status', 'Status')}</label>
                                <select 
                                    className="form-control" 
                                    value={data.is_active}
                                    onChange={e => setData('is_active', e.target.value === 'true')}
                                >
                                    <option value="true">{getTranslation('active', 'Active')}</option>
                                    <option value="false">{getTranslation('inactive', 'Inactive')}</option>
                                </select>
                                {errors.is_active && <div className="text-error">{errors.is_active}</div>}
                            </div>
                        </div>

                        <div className="form-group" style={{ marginTop: '20px' }}>
                            <label className="form-label">{getTranslation('description', 'Description')}</label>
                            <textarea 
                                className="form-control form-textarea" 
                                value={data.description}
                                onChange={e => setData('description', e.target.value)}
                                placeholder={getTranslation('description_placeholder', 'Enter department description')}
                                rows="4"
                            ></textarea>
                            {errors.description && <div className="text-error">{errors.description}</div>}
                        </div>
                    </div>
                    <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', padding: '20px 30px', borderTop: '1px solid #eee' }}>
                        <button type="button" className="btn btn-outline" onClick={backToList}>{getTranslation('cancel', 'Cancel')}</button>
                        <button type="submit" className="btn btn-primary" disabled={processing}>
                            {currentView === 'edit' ? getTranslation('update', 'Update Department') : getTranslation('save', 'Save Department')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    const renderDetailsView = () => (
        <div className="fade-in">
            <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <button className="btn btn-outline btn-sm" onClick={backToList}>
                            <span className="material-icons-outlined">arrow_back</span>
                            <span>{getTranslation('back', 'Back')}</span>
                        </button>
                        <h2 style={{ margin: 0 }}>{getTranslation('department_details', 'Department Details')}</h2>
                    </div>
                    <div className="actions">
                        <button className="btn btn-primary" onClick={() => openEditView(currentDepartment)}>
                            <span className="material-icons-outlined">edit</span>
                            <span>{getTranslation('edit', 'Edit')}</span>
                        </button>
                    </div>
                </div>
                <div className="card-body" style={{ padding: '30px' }}>
                    <div className="details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px' }}>
                        <div className="detail-item">
                            <label style={{ fontWeight: 'bold', color: '#666', display: 'block', marginBottom: '5px' }}>{getTranslation('name_en', 'Name (EN)')}</label>
                            <div style={{ fontSize: '1.1rem' }}>{currentDepartment?.name_en}</div>
                        </div>
                        <div className="detail-item">
                            <label style={{ fontWeight: 'bold', color: '#666', display: 'block', marginBottom: '5px' }}>{getTranslation('name_ar', 'Name (AR)')}</label>
                            <div style={{ fontSize: '1.1rem' }}>{currentDepartment?.name_ar}</div>
                        </div>
                        <div className="detail-item">
                            <label style={{ fontWeight: 'bold', color: '#666', display: 'block', marginBottom: '5px' }}>{getTranslation('manager', 'Manager')}</label>
                            <div style={{ fontSize: '1.1rem' }}>{currentDepartment?.manager?.name || getTranslation('no_manager', 'No Manager')}</div>
                        </div>
                        <div className="detail-item">
                            <label style={{ fontWeight: 'bold', color: '#666', display: 'block', marginBottom: '5px' }}>{getTranslation('status', 'Status')}</label>
                            <div>
                                <span className={`department-status status-${currentDepartment?.is_active ? 'active' : 'inactive'}`}>
                                    {currentDepartment?.is_active ? getTranslation('active', 'Active') : getTranslation('inactive', 'Inactive')}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="detail-item" style={{ marginTop: '30px' }}>
                        <label style={{ fontWeight: 'bold', color: '#666', display: 'block', marginBottom: '5px' }}>{getTranslation('description', 'Description')}</label>
                        <div style={{ lineHeight: '1.6', backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
                            {currentDepartment?.description || getTranslation('no_description', 'No description provided.')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <AdminLayout activeMenu="Departments">
            <Head title={getTranslation('departments', 'Departments')} />
            {renderBreadcrumbs()}

            {currentView === 'list' && renderListView()}
            {(currentView === 'create' || currentView === 'edit') && renderFormView()}
            {currentView === 'details' && renderDetailsView()}
        </AdminLayout>
    );
};

export default Departments;
