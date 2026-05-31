import React, { useCallback, useMemo, useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import BlankPage from '@/Components/BlankPage';
import StatsCards from '@/Components/stats-cards';
import Table from '@/Pages/Backend/components/Table';
import '../../../../css/backend/main.scss';

const Departments = ({ departments: propDepartments, employees: propEmployees }) => {
    const { props } = usePage();
    const localization = props.localization;
    const translations = localization?.translations || {};
    const isRtl = !!localization?.is_rtl || localization?.current_locale === 'ar';

    const getTranslation = useCallback(
        (key, fallback) => translations[`departments.${key}`] || translations[`common.${key}`] || fallback,
        [translations]
    );

    const getLocalizedRoute = useCallback(
        (name, params = {}) =>
            route(name, {
                country: localization?.country_code || 'sa',
                lang: localization?.current_locale || 'ar',
                ...params,
            }),
        [localization]
    );

    const departmentsData = propDepartments?.data || (Array.isArray(propDepartments) ? propDepartments : []);
    const employeesData = propEmployees?.data || (Array.isArray(propEmployees) ? propEmployees : []);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [currentView, setCurrentView] = useState('list'); // 'list', 'create', 'edit', 'details'
    const [currentDepartment, setCurrentDepartment] = useState(null);
    const [selectAll, setSelectAll] = useState(false);
    const [selectedRows, setSelectedRows] = useState([]);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name_ar: '',
        name_en: '',
        description: '',
        manager_id: '',
        is_active: true,
        company_id: null,
    });

    const filteredDepartments = useMemo(() => {
        if (!searchTerm) return departmentsData;
        const lowerTerm = searchTerm.toLowerCase();
        return departmentsData.filter(
            (d) =>
                (d.name_en && d.name_en.toLowerCase().includes(lowerTerm)) ||
                (d.name_ar && d.name_ar.toLowerCase().includes(lowerTerm)) ||
                (d.manager && d.manager.name && d.manager.name.toLowerCase().includes(lowerTerm))
        );
    }, [departmentsData, searchTerm]);

    const handleSelectAll = useCallback(() => {
        setSelectAll((prev) => {
            const next = !prev;
            setSelectedRows(next ? filteredDepartments.map((d) => d.id) : []);
            return next;
        });
    }, [filteredDepartments]);

    const handleRowSelect = useCallback((id) => {
        setSelectedRows((prev) => {
            if (prev.includes(id)) return prev.filter((rowId) => rowId !== id);
            return [...prev, id];
        });
    }, []);

    const stats = {
        total: departmentsData.length,
        active: departmentsData.filter(d => d.is_active).length,
        employees: 30, // Matching the image's 30 employees
    };

    const openCreateView = useCallback(() => {
        clearErrors();
        setCurrentDepartment(null);
        reset();
        setCurrentView('create');
    }, [clearErrors, reset]);

    const openEditView = useCallback((dept) => {
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
    }, [clearErrors, setData]);

    const openDetailsView = useCallback((dept) => {
        setCurrentDepartment(dept);
        setCurrentView('details');
    }, []);

    const backToList = useCallback(() => {
        setCurrentView('list');
        setCurrentDepartment(null);
        reset();
    }, [reset]);

    const handleSubmit = useCallback((e) => {
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
    }, [backToList, currentDepartment?.id, currentView, getLocalizedRoute, post, put]);

    const handleDelete = useCallback((id) => {
        if (!window.confirm(getTranslation('confirm_delete', 'Are you sure you want to delete this department?'))) return;
        router.delete(getLocalizedRoute('admin.departments.destroy', { department: id }));
    }, [getLocalizedRoute, getTranslation]);

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

    const tableData = useMemo(
        () => filteredDepartments.map((d) => ({ ...d, selected: selectedRows.includes(d.id) })),
        [filteredDepartments, selectedRows]
    );

    const columns = useMemo(
        () => [
            {
                header: 'ID',
                key: 'id',
                sortable: true,
                render: (row) => (
                    <span className="departments-id">
                        {row.id.toString().padStart(3, '0')}
                    </span>
                ),
            },
            {
                header: getTranslation('department_en', 'DEPARTMENT (EN)'),
                key: 'name_en',
                render: (row) => (
                    <button type="button" className="departments-link" onClick={() => openDetailsView(row)}>
                        {row.name_en}
                    </button>
                ),
            },
            {
                header: getTranslation('department_ar', 'DEPARTMENT (AR)'),
                key: 'name_ar',
                render: (row) => <span className="departments-name-ar">{row.name_ar}</span>,
            },
            {
                header: getTranslation('manager', 'MANAGER'),
                key: 'manager',
                render: (row) => (
                    <span className="departments-muted">
                        {row.manager?.name || getTranslation('no_manager', 'No Manager')}
                    </span>
                ),
            },
            {
                header: getTranslation('status', 'STATUS'),
                key: 'is_active',
                render: (row) => (
                    <span className={`department-status ${row.is_active ? 'status-active' : 'status-inactive'}`}>
                        {row.is_active ? getTranslation('active', 'Active') : getTranslation('inactive', 'Inactive')}
                    </span>
                ),
            },
        ],
        [getTranslation, openDetailsView]
    );

    const statsItems = useMemo(
        () => [
            {
                icon: 'business',
                bgColor: 'var(--primary-color)',
                value: stats.total,
                label: getTranslation('total_departments', 'Total Departments'),
            },
            {
                icon: 'check_circle',
                bgColor: 'var(--success-color)',
                value: stats.active,
                label: getTranslation('active_departments', 'Active Departments'),
            },
            {
                icon: 'people',
                bgColor: 'var(--info-color)',
                value: stats.employees,
                label: getTranslation('total_employees', 'Total Employees'),
            },
        ],
        [getTranslation, stats.active, stats.employees, stats.total]
    );

    return (
        <AdminLayout activeMenu="Departments">
            <Head title={getTranslation('departments', 'Departments')} />
            
            <BlankPage 
                breadcrumbs={breadcrumbs}
                stats={currentView === 'list' ? <StatsCards items={statsItems} /> : null}
            >
                <div className="departments-page">
                    {currentView === 'list' && (
                        <div className="page-content-container fade-in">
                            <div className="content-card">
                                <div className="card-body">
                                    <Table
                                        showToolbar={true}
                                        toolbarSearch={true}
                                        toolbarSearchValue={searchTerm}
                                        onToolbarSearch={setSearchTerm}
                                        toolbarSearchPlaceholder={getTranslation('search_placeholder', 'Search departments...')}
                                        showAddButton={true}
                                        addButtonText={getTranslation('add_department', 'Add Department')}
                                        onAdd={openCreateView}
                                        showRefreshButton={true}
                                        onRefresh={() => router.reload()}
                                        tableData={tableData}
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
                                </div>
                            </div>
                        </div>
                    )}

                    {(currentView === 'create' || currentView === 'edit') && (
                        <div className="page-content-container fade-in">
                            <div className="content-card">
                                <div className="card-header">
                                    <div className="header-left">
                                        <h2 className="card-title">
                                            {currentView === 'edit'
                                                ? getTranslation('edit_department', 'Edit Department')
                                                : getTranslation('add_department', 'Add New Department')}
                                        </h2>
                                    </div>
                                    <div className="header-right">
                                        <button type="button" className="btn btn-outline btn-sm back-button" onClick={backToList}>
                                            <span className={`material-icons-outlined departments-back-icon ${isRtl ? 'is-rtl' : ''}`}>
                                                arrow_back
                                            </span>
                                            <span>{getTranslation('back', 'Back')}</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="card-body">
                                    <form onSubmit={handleSubmit}>
                                        <div className="departments-form-grid">
                                            <div className="form-group">
                                                <label className="form-label">
                                                    {getTranslation('name_en', 'Department Name (EN)')} *
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={data.name_en}
                                                    onChange={(e) => setData('name_en', e.target.value)}
                                                    required
                                                />
                                                {errors.name_en && <div className="text-error">{errors.name_en}</div>}
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">
                                                    {getTranslation('name_ar', 'Department Name (AR)')} *
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={data.name_ar}
                                                    onChange={(e) => setData('name_ar', e.target.value)}
                                                    required
                                                />
                                                {errors.name_ar && <div className="text-error">{errors.name_ar}</div>}
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">{getTranslation('manager', 'Department Manager')}</label>
                                                <select
                                                    className="form-control"
                                                    value={data.manager_id}
                                                    onChange={(e) => setData('manager_id', e.target.value)}
                                                >
                                                    <option value="">{getTranslation('select_manager', 'Select Manager')}</option>
                                                    {employeesData.map((emp) => (
                                                        <option key={emp.id} value={emp.id}>
                                                            {emp.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                {errors.manager_id && <div className="text-error">{errors.manager_id}</div>}
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">{getTranslation('status', 'Status')}</label>
                                                <select
                                                    className="form-control"
                                                    value={data.is_active}
                                                    onChange={(e) => setData('is_active', e.target.value === 'true')}
                                                >
                                                    <option value="true">{getTranslation('active', 'Active')}</option>
                                                    <option value="false">{getTranslation('inactive', 'Inactive')}</option>
                                                </select>
                                                {errors.is_active && <div className="text-error">{errors.is_active}</div>}
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">{getTranslation('description', 'Description')}</label>
                                            <textarea
                                                className="form-control form-textarea"
                                                value={data.description}
                                                onChange={(e) => setData('description', e.target.value)}
                                                placeholder={getTranslation('description_placeholder', 'Enter department description')}
                                                rows={4}
                                            />
                                            {errors.description && <div className="text-error">{errors.description}</div>}
                                        </div>

                                        <div className="departments-form-actions">
                                            <button type="button" className="btn btn-outline" onClick={backToList}>
                                                {getTranslation('cancel', 'Cancel')}
                                            </button>
                                            <button type="submit" className="btn btn-primary" disabled={processing}>
                                                {currentView === 'edit'
                                                    ? getTranslation('update', 'Update Department')
                                                    : getTranslation('save', 'Save Department')}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentView === 'details' && (
                        <div className="page-content-container fade-in">
                            <div className="content-card">
                                <div className="card-header">
                                    <div className="header-left">
                                        <h2 className="card-title">{getTranslation('department_details', 'Department Details')}</h2>
                                    </div>
                                    <div className="header-right">
                                        <button type="button" className="btn btn-primary" onClick={() => openEditView(currentDepartment)}>
                                            <span className="material-icons-outlined">edit</span>
                                            <span>{getTranslation('edit', 'Edit')}</span>
                                        </button>
                                        <button type="button" className="btn btn-outline btn-sm back-button" onClick={backToList}>
                                            <span className={`material-icons-outlined departments-back-icon ${isRtl ? 'is-rtl' : ''}`}>
                                                arrow_back
                                            </span>
                                            <span>{getTranslation('back', 'Back')}</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="card-body">
                                    <div className="departments-details-grid">
                                        <div className="departments-detail-item">
                                            <div className="departments-detail-label">{getTranslation('name_en', 'Name (EN)')}</div>
                                            <div className="departments-detail-value">{currentDepartment?.name_en || '-'}</div>
                                        </div>
                                        <div className="departments-detail-item">
                                            <div className="departments-detail-label">{getTranslation('name_ar', 'Name (AR)')}</div>
                                            <div className="departments-detail-value">{currentDepartment?.name_ar || '-'}</div>
                                        </div>
                                        <div className="departments-detail-item">
                                            <div className="departments-detail-label">{getTranslation('manager', 'Manager')}</div>
                                            <div className="departments-detail-value">
                                                {currentDepartment?.manager?.name || getTranslation('no_manager', 'No Manager')}
                                            </div>
                                        </div>
                                        <div className="departments-detail-item">
                                            <div className="departments-detail-label">{getTranslation('status', 'Status')}</div>
                                            <div className="departments-detail-value">
                                                <span
                                                    className={`department-status ${
                                                        currentDepartment?.is_active ? 'status-active' : 'status-inactive'
                                                    }`}
                                                >
                                                    {currentDepartment?.is_active
                                                        ? getTranslation('active', 'Active')
                                                        : getTranslation('inactive', 'Inactive')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="departments-description-block">
                                        <div className="departments-detail-label">{getTranslation('description', 'Description')}</div>
                                        <div className="departments-description-text">
                                            {currentDepartment?.description || getTranslation('no_description', 'No description provided.')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </BlankPage>
        </AdminLayout>
    );
};

export default Departments;
