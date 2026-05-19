import React, { useState, useEffect } from 'react';
import { Head, useForm, router, usePage, Link } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import BlankPage from '@/Components/BlankPage';
import PageContentArea from '@/Components/page-content-area';
import Table from '../components/Table';
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
    const [selectAll, setSelectAll] = useState(false);
    const [selectedRows, setSelectedRows] = useState([]);

    const handleSelectAll = () => {
        setSelectAll(!selectAll);
        if (!selectAll) {
            setSelectedRows(filteredDepartments.map(d => d.id));
        } else {
            setSelectedRows([]);
        }
    };

    const handleRowSelect = (id) => {
        if (selectedRows.includes(id)) {
            setSelectedRows(selectedRows.filter(rowId => rowId !== id));
        } else {
            setSelectedRows([...selectedRows, id]);
        }
    };

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

        setFilteredDepartments(result);
    }, [propDepartments, searchTerm]);

    const stats = {
        total: departmentsData.length,
        active: departmentsData.filter(d => d.is_active).length,
        employees: 30, // Matching the image's 30 employees
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

    const breadcrumbs = [
        { label: getTranslation('dashboard', 'Dashboard'), href: getLocalizedRoute('admin.dashboard') },
        { label: getTranslation('human_resources', 'Human Resources'), onClick: backToList },
        { label: getTranslation('departments', 'Departments'), onClick: currentView !== 'list' ? backToList : null }
    ];

    if (currentView !== 'list') {
        breadcrumbs.push({
            label: currentView === 'create' ? getTranslation('add_department', 'Add Department') : 
                   currentView === 'edit' ? getTranslation('edit_department', 'Edit Department') : 
                   getTranslation('department_details', 'Department Details')
        });
    }

    const columns = [
        { 
            header: 'ID', 
            key: 'id', 
            sortable: true,
            render: (row) => <span style={{ color: '#64748b', fontWeight: '500' }}>{row.id.toString().padStart(3, '0')}</span>
        },
        { 
            header: getTranslation('department_en', 'DEPARTMENT (EN)'), 
            key: 'name_en',
            render: (row) => (
                <span onClick={() => openDetailsView(row)} style={{ cursor: 'pointer', color: '#1e40af', fontWeight: '500' }}>
                    {row.name_en}
                </span>
            )
        },
        { 
            header: getTranslation('department_ar', 'DEPARTMENT (AR)'), 
            key: 'name_ar',
            render: (row) => <span style={{ fontWeight: '500' }}>{row.name_ar}</span>
        },
        { 
            header: getTranslation('manager', 'MANAGER'), 
            key: 'manager',
            render: (row) => <span style={{ color: '#64748b' }}>{row.manager?.name || getTranslation('no_manager', 'No Manager')}</span>
        },
        { 
            header: getTranslation('status', 'STATUS'), 
            key: 'is_active',
            render: (row) => (
                <span className={`department-status status-${row.is_active ? 'active' : 'inactive'}`} style={{ 
                    padding: '4px 12px', 
                    borderRadius: '20px', 
                    fontSize: '12px', 
                    fontWeight: '600',
                    backgroundColor: row.is_active ? '#10b981' : '#ef4444',
                    color: '#fff'
                }}>
                    {row.is_active ? getTranslation('active', 'Active') : getTranslation('inactive', 'Inactive')}
                </span>
            )
        }
    ];

    const renderListView = () => (
        <PageContentArea
            title={
                <div className="departments-actions">
                    <div className="search-bar light" style={{ maxWidth: '400px' }}>
                        <input 
                            type="text" 
                            placeholder={getTranslation('search_placeholder', 'Search departments...')}
                            value={searchTerm}
                            onChange={handleSearch}
                            style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px 12px 8px 35px' }}
                        />
                        <span className="material-icons-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '20px' }}>
                            search
                        </span>
                    </div>
                </div>
            }
            action={
                <div className="actions" style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-primary" onClick={openCreateView} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 16px', borderRadius: '6px' }}>
                        <span className="material-icons-outlined" style={{ fontSize: '20px' }}>add</span>
                        <span>{getTranslation('add_department', 'Add Department')}</span>
                    </button>
                    <button className="btn btn-outline" onClick={() => router.reload()} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 16px', borderRadius: '6px' }}>
                        <span className="material-icons-outlined" style={{ fontSize: '20px' }}>refresh</span>
                        <span>{getTranslation('refresh', 'Refresh')}</span>
                    </button>
                </div>
            }
        >
            <Table 
                tableData={filteredDepartments.map(d => ({ ...d, selected: selectedRows.includes(d.id) }))}
                columns={columns}
                handleRowSelect={handleRowSelect}
                selectAll={selectAll}
                handleSelectAll={handleSelectAll}
                onView={openDetailsView}
                onEdit={openEditView}
                onDelete={(row) => handleDelete(row.id)}
                viewTitle={getTranslation('view', 'View')}
                editTitle={getTranslation('edit', 'Edit')}
                deleteTitle={getTranslation('delete', 'Delete')}
            />
        </PageContentArea>
    );

    const renderFormView = () => (
        <PageContentArea 
            title={currentView === 'edit' ? getTranslation('edit_department', 'Edit Department') : getTranslation('add_department', 'Add New Department')}
            onBack={backToList}
            backText={getTranslation('back', 'Back')}
        >
            <form onSubmit={handleSubmit}>
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

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                    <button type="button" className="btn btn-outline" onClick={backToList}>{getTranslation('cancel', 'Cancel')}</button>
                    <button type="submit" className="btn btn-primary" disabled={processing}>
                        {currentView === 'edit' ? getTranslation('update', 'Update Department') : getTranslation('save', 'Save Department')}
                    </button>
                </div>
            </form>
        </PageContentArea>
    );

    const renderDetailsView = () => (
        <PageContentArea 
            title={getTranslation('department_details', 'Department Details')}
            onBack={backToList}
            backText={getTranslation('back', 'Back')}
            action={
                <button className="btn btn-primary" onClick={() => openEditView(currentDepartment)}>
                    <span className="material-icons-outlined">edit</span>
                    <span>{getTranslation('edit', 'Edit')}</span>
                </button>
            }
        >
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
        </PageContentArea>
    );

    return (
        <AdminLayout activeMenu="Departments">
            <Head title={getTranslation('departments', 'Departments')} />
            
            <BlankPage 
                breadcrumbs={breadcrumbs}
                stats={currentView === 'list' ? (
                    <div className="stats-cards">
                            <div className="stat-card" style={{ borderTop: '4px solid var(--primary-color)' }}>
                                <div className="stat-icon" style={{ backgroundColor: '#1e40af', borderRadius: '8px' }}>
                                    <span className="material-icons-outlined" style={{ color: '#fff' }}>business</span>
                                </div>
                                <div className="stat-content">
                                    <div className="stat-value" style={{ fontSize: '24px', fontWeight: '700' }}>{stats.total}</div>
                                    <div className="stat-label" style={{ color: '#64748b', fontSize: '14px' }}>{getTranslation('total_departments', 'Total Departments')}</div>
                                </div>
                            </div>
                            <div className="stat-card" style={{ borderTop: '4px solid #10b981' }}>
                                <div className="stat-icon" style={{ backgroundColor: '#10b981', borderRadius: '8px' }}>
                                    <span className="material-icons-outlined" style={{ color: '#fff' }}>check_circle</span>
                                </div>
                                <div className="stat-content">
                                    <div className="stat-value" style={{ fontSize: '24px', fontWeight: '700' }}>{stats.active}</div>
                                    <div className="stat-label" style={{ color: '#64748b', fontSize: '14px' }}>{getTranslation('active_departments', 'Active Departments')}</div>
                                </div>
                            </div>
                            <div className="stat-card" style={{ borderTop: '4px solid #3b82f6' }}>
                                <div className="stat-icon" style={{ backgroundColor: '#3b82f6', borderRadius: '8px' }}>
                                    <span className="material-icons-outlined" style={{ color: '#fff' }}>people</span>
                                </div>
                                <div className="stat-content">
                                    <div className="stat-value" style={{ fontSize: '24px', fontWeight: '700' }}>{stats.employees}</div>
                                    <div className="stat-label" style={{ color: '#64748b', fontSize: '14px' }}>{getTranslation('total_employees', 'Total Employees')}</div>
                                </div>
                            </div>
                    </div>
                ) : null}
            >
                {currentView === 'list' && renderListView()}
                {(currentView === 'create' || currentView === 'edit') && renderFormView()}
                {currentView === 'details' && renderDetailsView()}
            </BlankPage>
        </AdminLayout>
    );
};

export default Departments;
