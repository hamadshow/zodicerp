import React, { useCallback, useMemo, useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import BlankPage from '@/Components/BlankPage';
import StatsCards from '@/Components/stats-cards';
import Table from '@/Pages/Backend/components/Table';
import '../../../../css/backend/main.scss';

const Profession = ({ professions = [], departments = [] }) => {
    const { props } = usePage();
    const localization = props.localization;
    const isArabic = localization?.current_locale === 'ar';
    const translations = localization?.translations || {};

    const t = useCallback(
        (key, fallback) => translations[`profession.${key}`] || translations[`common.${key}`] || fallback,
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

    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProfession, setCurrentProfession] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);

    const { data, setData, post, put, processing, errors, reset } = useForm({
        company_id: 1, // Default company_id
        profession_name: '',
        profession_code: '',
        category: '',
        description: '',
        min_salary: 0,
        max_salary: 0,
        required_experience: 0,
        education_level: 'Bachelor',
        key_skills: '',
        status: 'active',
        sort_order: 0,
    });

    const departmentNameById = useMemo(() => {
        const map = new Map();
        departments.forEach((dept) => {
            map.set(dept.id, isArabic ? dept.name_ar : dept.name_en);
        });
        return map;
    }, [departments, isArabic]);

    const getDepartmentName = useCallback(
        (deptId) => {
            const normalizedId = Number.parseInt(deptId, 10);
            if (Number.isNaN(normalizedId)) return deptId || '';
            return departmentNameById.get(normalizedId) || deptId || '';
        },
        [departmentNameById]
    );

    const filteredProfessions = useMemo(() => {
        if (!searchTerm) return professions;
        const lowerTerm = searchTerm.toLowerCase();
        return professions.filter((p) =>
            (p.profession_name || '').toLowerCase().includes(lowerTerm) ||
            (p.profession_code || '').toLowerCase().includes(lowerTerm) ||
            getDepartmentName(p.category).toLowerCase().includes(lowerTerm)
        );
    }, [getDepartmentName, professions, searchTerm]);

    const stats = useMemo(() => {
        const total = professions.length;
        const active = professions.filter((p) => p.status === 'active').length;
        const employees = professions.reduce((sum, p) => sum + (p.employees || 0), 0);
        const vacant = professions.filter((p) => (p.employees || 0) === 0 && p.status === 'active').length;
        return { total, active, employees, vacant };
    }, [professions]);

    const statsItems = useMemo(
        () => [
            {
                icon: 'work',
                bgColor: 'var(--info-color)',
                value: stats.total,
                label: t('total_professions', isArabic ? 'إجمالي المهن' : 'Total Professions'),
            },
            {
                icon: 'check_circle',
                bgColor: 'var(--success-color)',
                value: stats.active,
                label: t('active_professions', isArabic ? 'المهن النشطة' : 'Active Professions'),
            },
            {
                icon: 'people',
                bgColor: 'var(--warning-color)',
                value: stats.employees,
                label: t('total_employees', isArabic ? 'إجمالي الموظفين' : 'Total Employees'),
            },
            {
                icon: 'warning',
                bgColor: 'var(--danger-color)',
                value: stats.vacant,
                label: t('vacant_positions', isArabic ? 'الوظائف الشاغرة' : 'Vacant Positions'),
            },
        ],
        [isArabic, stats.active, stats.employees, stats.total, stats.vacant, t]
    );

    const selectAll = useMemo(
        () => filteredProfessions.length > 0 && selectedIds.length === filteredProfessions.length,
        [filteredProfessions.length, selectedIds.length]
    );

    const handleRowSelect = useCallback((id) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    }, []);

    const handleSelectAll = useCallback(() => {
        setSelectedIds(selectAll ? [] : filteredProfessions.map((p) => p.id));
    }, [filteredProfessions, selectAll]);

    const columns = useMemo(() => [
        { 
            header: 'ID', 
            key: 'id', 
            sortable: true,
            render: (row) => row.id.toString().padStart(3, '0')
        },
        { 
            header: 'PROFESSION', 
            key: 'profession_name', 
            sortable: true,
            render: (row) => (
                <div className="profession-info">
                    <div className="profession-icon">
                        <span className="material-icons-outlined">work</span>
                    </div>
                    <div className="profession-details">
                        <div className="profession-name">{row.profession_name}</div>
                        <div className="profession-category">{getDepartmentName(row.category)}</div>
                    </div>
                </div>
            )
        },
        { 
            header: 'CODE', 
            key: 'profession_code', 
            sortable: true,
            render: (row) => <strong>{row.profession_code}</strong>
        },
        { 
            header: 'EMPLOYEES', 
            key: 'employees', 
            sortable: true,
            render: (row) => (
                <div className="employee-count">
                    <span className="material-icons-outlined employee-count-icon">people</span>
                    {row.employees || 0}
                </div>
            )
        },
        { 
            header: 'SALARY RANGE', 
            key: 'salary_range', 
            sortable: true,
            render: (row) => (
                <div className="salary-range">
                    ${row.min_salary ? parseFloat(row.min_salary).toLocaleString() : '0'} - ${row.max_salary ? parseFloat(row.max_salary).toLocaleString() : '0'}
                </div>
            )
        },
        { 
            header: 'STATUS', 
            key: 'status', 
            sortable: true,
            render: (row) => (
                <span className={`profession-status ${row.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                    {row.status === 'active' ? t('active', isArabic ? 'نشط' : 'Active') : t('inactive', isArabic ? 'غير نشط' : 'Inactive')}
                </span>
            )
        },
        { 
            header: 'CREATED AT', 
            key: 'created_at', 
            sortable: true,
            render: (row) => new Date(row.created_at).toLocaleDateString()
        }
    ], [getDepartmentName, isArabic, t]);

    const tableData = useMemo(() => {
        return filteredProfessions.map(p => ({
            ...p,
            selected: selectedIds.includes(p.id)
        }));
    }, [filteredProfessions, selectedIds]);

    const openModal = useCallback((prof = null) => {
        if (prof) {
            setCurrentProfession(prof);
            setData({
                company_id: prof.company_id || 1,
                profession_name: prof.profession_name,
                profession_code: prof.profession_code,
                category: prof.category || '',
                description: prof.description || '',
                min_salary: prof.min_salary || 0,
                max_salary: prof.max_salary || 0,
                required_experience: prof.required_experience || 0,
                education_level: prof.education_level || 'Bachelor',
                key_skills: prof.key_skills || '',
                status: prof.status || 'active',
                sort_order: prof.sort_order || 0,
            });
        } else {
            setCurrentProfession(null);
            reset();
        }
        setIsModalOpen(true);
    }, [reset, setData]);

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setCurrentProfession(null);
        reset();
    }, [reset]);

    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        
        if (currentProfession) {
            put(getLocalizedRoute('admin.professions.update', { profession: currentProfession.id }), {
                onSuccess: () => closeModal(),
            });
        } else {
            post(getLocalizedRoute('admin.professions.store'), {
                onSuccess: () => closeModal(),
            });
        }
    }, [closeModal, currentProfession, getLocalizedRoute, post, put]);

    const handleDelete = useCallback((id) => {
        if (!window.confirm(t('confirm_delete', isArabic ? 'هل أنت متأكد من حذف هذه المهنة؟' : 'Are you sure you want to delete this profession?'))) return;
        router.delete(getLocalizedRoute('admin.professions.destroy', { profession: id }));
    }, [getLocalizedRoute, isArabic, t]);

    const breadcrumbs = useMemo(
        () => [
            { label: t('dashboard', isArabic ? 'لوحة التحكم' : 'Dashboard'), href: getLocalizedRoute('admin.dashboard') },
            { label: t('human_resources', isArabic ? 'الموارد البشرية' : 'Human Resources') },
            { label: t('professions', isArabic ? 'المهن' : 'Professions') },
        ],
        [getLocalizedRoute, isArabic, t]
    );

    return (
        <AdminLayout activeMenu="Profession">
            <Head title={t('professions', isArabic ? 'المهن' : 'Professions')} />

            <BlankPage breadcrumbs={breadcrumbs} stats={<StatsCards items={statsItems} />}>
                <div className="profession-page">
                    <Table
                        showToolbar={true}
                        toolbarSearch={true}
                        toolbarSearchValue={searchTerm}
                        onToolbarSearch={setSearchTerm}
                        toolbarSearchPlaceholder={t('search_placeholder', isArabic ? 'ابحث في المهن...' : 'Search professions...')}
                        showAddButton={true}
                        addButtonText={t('add_profession', isArabic ? 'إضافة مهنة' : 'Add Profession')}
                        onAdd={() => openModal()}
                        showRefreshButton={true}
                        onRefresh={() => router.get(getLocalizedRoute('admin.professions.index'))}
                        tableData={tableData}
                        columns={columns}
                        handleRowSelect={handleRowSelect}
                        selectAll={selectAll}
                        handleSelectAll={handleSelectAll}
                        onEdit={(row) => openModal(row)}
                        onDelete={(row) => handleDelete(row.id)}
                        editTitle={t('edit', isArabic ? 'تعديل' : 'Edit')}
                        deleteTitle={t('delete', isArabic ? 'حذف' : 'Delete')}
                    />

                    <div
                        className={`modal-overlay ${isModalOpen ? 'active' : ''}`}
                        onClick={(e) => {
                            if (e.target === e.currentTarget) closeModal();
                        }}
                    >
                        <div className="modal">
                            <div className="modal-header">
                                <h3 className="modal-title">
                                    {currentProfession
                                        ? t('edit_profession', isArabic ? 'تعديل المهنة' : 'Edit Profession')
                                        : t('add_new_profession', isArabic ? 'إضافة مهنة جديدة' : 'Add New Profession')}
                                </h3>
                                <button type="button" className="modal-close" onClick={closeModal}>
                                    <span className="material-icons-outlined">close</span>
                                </button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label className="form-label">
                                            {t('profession_name', isArabic ? 'اسم المهنة' : 'Profession Name')} *
                                        </label>
                                        <input
                                            type="text"
                                            className={`form-control ${errors.profession_name ? 'is-invalid' : ''}`}
                                            value={data.profession_name}
                                            onChange={(e) => setData('profession_name', e.target.value)}
                                            placeholder={t('profession_name_placeholder', isArabic ? 'أدخل اسم المهنة' : 'Enter profession name')}
                                            required
                                        />
                                        {errors.profession_name && <div className="invalid-feedback">{errors.profession_name}</div>}
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">
                                                {t('profession_code', isArabic ? 'رمز المهنة' : 'Profession Code')} *
                                            </label>
                                            <input
                                                type="text"
                                                className={`form-control ${errors.profession_code ? 'is-invalid' : ''}`}
                                                value={data.profession_code}
                                                onChange={(e) => setData('profession_code', e.target.value.toUpperCase())}
                                                placeholder={t('profession_code_placeholder', isArabic ? 'أدخل رمز المهنة' : 'Enter profession code')}
                                                required
                                            />
                                            {errors.profession_code && <div className="invalid-feedback">{errors.profession_code}</div>}
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">
                                                {t('category_department', isArabic ? 'القسم' : 'Category (Department)')}
                                            </label>
                                            <select
                                                className="form-control"
                                                value={data.category}
                                                onChange={(e) => setData('category', e.target.value)}
                                            >
                                                <option value="">{t('select_department', isArabic ? 'اختر القسم' : 'Select Department')}</option>
                                                {departments.map((dept) => (
                                                    <option key={dept.id} value={dept.id}>
                                                        {isArabic ? dept.name_ar : dept.name_en}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">{t('description', isArabic ? 'الوصف' : 'Description')}</label>
                                        <textarea
                                            className="form-control form-textarea"
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            placeholder={t('description_placeholder', isArabic ? 'أدخل وصف المهنة' : 'Enter profession description')}
                                        />
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">{t('min_salary', isArabic ? 'الحد الأدنى للراتب' : 'Minimum Salary')}</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={data.min_salary}
                                                onChange={(e) => setData('min_salary', e.target.value)}
                                                placeholder={t('min_salary_placeholder', isArabic ? 'أدخل الحد الأدنى للراتب' : 'Enter minimum salary')}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">{t('max_salary', isArabic ? 'الحد الأعلى للراتب' : 'Maximum Salary')}</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={data.max_salary}
                                                onChange={(e) => setData('max_salary', e.target.value)}
                                                placeholder={t('max_salary_placeholder', isArabic ? 'أدخل الحد الأعلى للراتب' : 'Enter maximum salary')}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">
                                                {t('required_experience', isArabic ? 'الخبرة المطلوبة (سنوات)' : 'Required Experience (Years)')}
                                            </label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={data.required_experience}
                                                onChange={(e) => setData('required_experience', e.target.value)}
                                                placeholder={t('required_experience_placeholder', isArabic ? 'سنوات الخبرة' : 'Years of experience')}
                                                min="0"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">{t('education_level', isArabic ? 'المستوى التعليمي' : 'Education Level')}</label>
                                            <select
                                                className="form-control"
                                                value={data.education_level}
                                                onChange={(e) => setData('education_level', e.target.value)}
                                            >
                                                <option value="High School">{t('high_school', isArabic ? 'ثانوي' : 'High School')}</option>
                                                <option value="Diploma">{t('diploma', isArabic ? 'دبلوم' : 'Diploma')}</option>
                                                <option value="Bachelor">{t('bachelor', isArabic ? 'بكالوريوس' : "Bachelor's Degree")}</option>
                                                <option value="Master">{t('master', isArabic ? 'ماجستير' : "Master's Degree")}</option>
                                                <option value="PhD">{t('phd', isArabic ? 'دكتوراه' : 'PhD')}</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">{t('key_skills', isArabic ? 'المهارات الرئيسية' : 'Key Skills (comma separated)')}</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={data.key_skills}
                                            onChange={(e) => setData('key_skills', e.target.value)}
                                            placeholder={t(
                                                'key_skills_placeholder',
                                                isArabic ? 'مثال: التواصل، القيادة، إدارة المشاريع' : 'e.g., Communication, Leadership, Project Management'
                                            )}
                                        />
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">{t('status', isArabic ? 'الحالة' : 'Status')}</label>
                                            <select className="form-control" value={data.status} onChange={(e) => setData('status', e.target.value)}>
                                                <option value="active">{t('active', isArabic ? 'نشط' : 'Active')}</option>
                                                <option value="inactive">{t('inactive', isArabic ? 'غير نشط' : 'Inactive')}</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">{t('sort_order', isArabic ? 'ترتيب العرض' : 'Sort Order')}</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={data.sort_order}
                                                onChange={(e) => setData('sort_order', e.target.value)}
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="btn" onClick={closeModal}>
                                        {t('cancel', isArabic ? 'إلغاء' : 'Cancel')}
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={processing}>
                                        {processing ? t('saving', isArabic ? 'جارٍ الحفظ...' : 'Saving...') : t('save_profession', isArabic ? 'حفظ المهنة' : 'Save Profession')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </BlankPage>
        </AdminLayout>
    );
};

export default Profession;
