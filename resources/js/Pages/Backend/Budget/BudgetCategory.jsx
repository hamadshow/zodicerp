import React, { useState, useEffect, useMemo } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/main.scss';


// --- View Section Component ---
const ViewSection = ({ categories, onEdit, onCreate, onDelete }) => {
    const { props } = usePage();
    const localization = props.localization || {};
    const translations = localization.translations || {};

    const t = (key, fallback) => {
        return translations[`BudgetCategory.${key}`] || fallback;
    };

    const [searchTerm, setSearchTerm] = useState('');
    const [filteredCategories, setFilteredCategories] = useState(categories);

    // Update stats
    const stats = useMemo(() => {
        const total = filteredCategories.length;
        const active = filteredCategories.filter(c => c.is_active).length;
        const inactive = total - active;
        return { total, active, inactive };
    }, [filteredCategories]);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredCategories(categories);
        } else {
            const lowerTerm = searchTerm.toLowerCase();
            setFilteredCategories(categories.filter(c => 
                c.name_ar.toLowerCase().includes(lowerTerm) ||
                (c.name_en && c.name_en.toLowerCase().includes(lowerTerm)) ||
                (c.code && c.code.toLowerCase().includes(lowerTerm))
            ));
        }
    }, [searchTerm, categories]);

    return (
        <div className="animate-fade-slide">
            {/* Quick Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon blue">
                        <span className="material-icons-outlined">category</span>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.total}</span>
                        <span className="stat-label">{t('total_categories', 'Total Categories')}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">
                        <span className="material-icons-outlined">check_circle</span>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.active}</span>
                        <span className="stat-label">{t('active_categories', 'Active Categories')}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon gray">
                        <span className="material-icons-outlined">cancel</span>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.inactive}</span>
                        <span className="stat-label">{t('inactive_categories', 'Inactive Categories')}</span>
                    </div>
                </div>
            </div>

            {/* Content Card */}
            <div className="content-card">
                <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                    <div className="search-box">
                        <span className="material-icons-outlined search-icon">search</span>
                        <input
                            type="text"
                            placeholder={t('search_categories', 'Search categories...')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={onCreate}>
                        <span className="material-icons-outlined">add</span>
                        {t('add_new_category', 'Add New Category')}
                    </button>
                </div>

                <div className="table-responsive">
                    <table className="professional-table">
                        <thead>
                            <tr>
                                <th>{t('code', 'Code')}</th>
                                <th>{t('name_ar', 'Name (AR)')}</th>
                                <th>{t('name_en', 'Name (EN)')}</th>
                                <th>{t('parent_category', 'Parent Category')}</th>
                                <th>{t('type', 'Type')}</th>
                                <th>{t('account', 'Account')}</th>
                                <th>{t('department', 'Department')}</th>
                                <th>{t('status', 'Status')}</th>
                                <th>{t('actions', 'Actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCategories.length > 0 ? (
                                filteredCategories.map(category => (
                                    <tr key={category.id}>
                                        <td>{category.code}</td>
                                        <td>{category.name_ar}</td>
                                        <td>{category.name_en || '-'}</td>
                                        <td>{category.parent?.name_ar || '-'}</td>
                                        <td>{category.category_type || '-'}</td>
                                        <td>{category.account?.AccName || '-'}</td>
                                        <td>{category.department?.name_ar || category.department?.name_en || '-'}</td>
                                        <td>
                                            <span className={`status-badge ${category.is_active ? 'active' : 'inactive'}`}>
                                                {category.is_active ? t('active', 'Active') : t('inactive', 'Inactive')}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button onClick={() => onEdit(category)} title={t('edit', 'Edit')}>
                                                    <span className="material-icons-outlined">edit</span>
                                                </button>
                                                <button className="delete-btn" onClick={() => onDelete(category.id)} title={t('delete', 'Delete')}>
                                                    <span className="material-icons-outlined">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>
                                        {t('no_categories_found', 'No budget categories found.')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- Form Section Component (Used for Create & Edit) ---
const FormSection = ({ mode, initialData, parentCategories, accounts, departments, onBack, onSubmit }) => {
    const isEdit = mode === 'edit';
    const { props } = usePage();
    const { errors } = props;
    const localization = props.localization || {};
    const translations = localization.translations || {};

    const t = (key, fallback) => {
        return translations[`BudgetCategory.${key}`] || fallback;
    };
    
    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            code: formData.get('code'),
            name_ar: formData.get('name_ar'),
            name_en: formData.get('name_en'),
            parent_id: formData.get('parent_id'),
            category_type: formData.get('category_type'),
            account_id: formData.get('account_id'),
            department_id: formData.get('department_id'),
            description: formData.get('description'),
            is_active: formData.get('is_active') === '1',
        };
        onSubmit(data);
    };

    return (
        <div className="animate-fade-slide">
            <div className="content-card">
                <div className="form-container">
                    <div className="form-section-title">
                        {isEdit ? t('edit_budget_category', 'Edit Budget Category') : t('create_new_budget_category', 'Create New Budget Category')}
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>{t('category_code', 'Category Code')}</label>
                                <input
                                    type="text"
                                    name="code"
                                    defaultValue={initialData?.code}
                                    placeholder={t('auto_generated', 'Auto-generated (e.g., BC-001)')}
                                    readOnly={true}
                                    style={{ backgroundColor: '#f3f4f6' }}
                                />
                                {errors.code && <div className="error-message">{errors.code}</div>}
                            </div>
                            <div className="form-group">
                                <label>{t('parent_category', 'Parent Category')}</label>
                                <select
                                    name="parent_id"
                                    defaultValue={initialData?.parent_id || ''}
                                >
                                    <option value="">{t('none_main', 'None (Main Category)')}</option>
                                    {parentCategories.map(pc => (
                                        // Avoid selecting itself as parent
                                        initialData?.id !== pc.id && (
                                            <option key={pc.id} value={pc.id}>{pc.name_ar}</option>
                                        )
                                    ))}
                                </select>
                                {errors.parent_id && <div className="error-message">{errors.parent_id}</div>}
                            </div>
                        </div>

                        <div className="form-grid">
                            <div className="form-group">
                                <label>{t('name_ar', 'Name (Arabic)')} <span style={{ color: 'red' }}>*</span></label>
                                <input
                                    type="text"
                                    name="name_ar"
                                    defaultValue={initialData?.name_ar}
                                    required
                                    placeholder="Enter Arabic Name"
                                />
                                {errors.name_ar && <div className="error-message">{errors.name_ar}</div>}
                            </div>
                            <div className="form-group">
                                <label>{t('name_en', 'Name (English)')}</label>
                                <input
                                    type="text"
                                    name="name_en"
                                    defaultValue={initialData?.name_en}
                                    placeholder="Enter English Name"
                                />
                                {errors.name_en && <div className="error-message">{errors.name_en}</div>}
                            </div>
                        </div>

                        <div className="form-grid">
                            <div className="form-group">
                                <label>{t('type', 'Category Type')} <span style={{ color: 'red' }}>*</span></label>
                                <input
                                    type="text"
                                    name="category_type"
                                    defaultValue={initialData?.category_type || 'Operational'}
                                    placeholder="e.g. Capital, Operational"
                                    required
                                />
                                {errors.category_type && <div className="error-message">{errors.category_type}</div>}
                            </div>
                            <div className="form-group">
                                <label>{t('status', 'Status')}</label>
                                <select
                                    name="is_active"
                                    defaultValue={initialData ? (initialData.is_active ? '1' : '0') : '1'}
                                >
                                    <option value="1">{t('active', 'Active')}</option>
                                    <option value="0">{t('inactive', 'Inactive')}</option>
                                </select>
                                {errors.is_active && <div className="error-message">{errors.is_active}</div>}
                            </div>
                        </div>

                        <div className="form-grid">
                            <div className="form-group">
                                <label>{t('account', 'GL Account')}</label>
                                <select
                                    name="account_id"
                                    defaultValue={initialData?.account_id || ''}
                                >
                                    <option value="">{t('select_account', 'Select Account')}</option>
                                    {accounts.map(acc => (
                                        <option key={acc.AccID} value={acc.AccID}>
                                            {acc.AccName}
                                        </option>
                                    ))}
                                </select>
                                {errors.account_id && <div className="error-message">{errors.account_id}</div>}
                            </div>
                            <div className="form-group">
                                <label>{t('department', 'Department')}</label>
                                <select
                                    name="department_id"
                                    defaultValue={initialData?.department_id || ''}
                                >
                                    <option value="">{t('select_department', 'Select Department')}</option>
                                    {departments.map(dept => (
                                        <option key={dept.id} value={dept.id}>
                                            {dept.name_ar} ({dept.name_en})
                                        </option>
                                    ))}
                                </select>
                                {errors.department_id && <div className="error-message">{errors.department_id}</div>}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>{t('description', 'Description')}</label>
                            <textarea
                                name="description"
                                defaultValue={initialData?.description}
                                placeholder="Additional description..."
                            ></textarea>
                            {errors.description && <div className="error-message">{errors.description}</div>}
                        </div>

                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={onBack}>
                                {t('cancel', 'Cancel')}
                            </button>
                            <button type="submit" className="btn btn-primary">
                                {isEdit ? t('update_category', 'Update Category') : t('create_category', 'Create Category')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// --- Main Container Component ---
const BudgetCategory = ({ categories = [], parentCategories = [], accounts = [], departments = [] }) => {
    const { props } = usePage();
    const localization = props.localization || {};
    const translations = localization.translations || {};

    const t = (key, fallback) => {
        return translations[`BudgetCategory.${key}`] || fallback;
    };

    const [mode, setMode] = useState('view'); // 'view' | 'create' | 'edit'
    const [selectedCategory, setSelectedCategory] = useState(null);
    const { flash } = props;

    useEffect(() => {
        if (flash?.success) {
            setMode('view');
            setSelectedCategory(null);
        }
    }, [flash, categories]);

    const handleCreateClick = () => {
        setSelectedCategory(null);
        setMode('create');
    };

    const handleEditClick = (category) => {
        setSelectedCategory(category);
        setMode('edit');
    };

    const handleBackClick = () => {
        setMode('view');
        setSelectedCategory(null);
    };

    const handleFormSubmit = (data) => {
        if (mode === 'edit' && selectedCategory) {
            router.put(route('admin.budget.categories.update', selectedCategory.id), data, {
                preserveScroll: true,
                onSuccess: () => {
                    setMode('view');
                    setSelectedCategory(null);
                }
            });
        } else {
            router.post(route('admin.budget.categories.store'), data, {
                preserveScroll: true,
                onSuccess: () => {
                    setMode('view');
                    setSelectedCategory(null);
                }
            });
        }
    };

    const handleDelete = (id) => {
        if (window.confirm(t('delete_confirm', 'Are you sure you want to delete this category?'))) {
            router.delete(route('admin.budget.categories.destroy', id), {
                preserveScroll: true
            });
        }
    };

    return (
        <AdminLayout activeMenu="Budget">
            <Head title={`${t('budget_categories', 'Budget Categories')} - ZodicERP`} />
            
            <div className="budget-categories-container">
                {/* Fixed Page Header Title based on Mode */}
                <div className="page-header">
                    <h1>
                        {mode === 'view' && t('budget_categories', 'Budget Categories')}
                        {mode === 'create' && t('create_new_budget_category', 'New Budget Category')}
                        {mode === 'edit' && t('edit_budget_category', 'Edit Budget Category')}
                    </h1>
                    {mode !== 'view' && (
                        <button className="btn btn-secondary" onClick={handleBackClick}>
                            <span className="material-icons-outlined">arrow_back</span>
                            {t('back_to_list', 'Back to List')}
                        </button>
                    )}
                </div>

                {/* Main Content Area with Transitions */}
                {mode === 'view' && (
                    <ViewSection 
                        categories={categories} 
                        onCreate={handleCreateClick} 
                        onEdit={handleEditClick}
                        onDelete={handleDelete}
                    />
                )}

                {mode === 'create' && (
                    <FormSection 
                        mode="create" 
                        parentCategories={parentCategories}
                        accounts={accounts}
                        departments={departments}
                        onBack={handleBackClick} 
                        onSubmit={handleFormSubmit}
                    />
                )}

                {mode === 'edit' && (
                    <FormSection 
                        mode="edit" 
                        initialData={selectedCategory} 
                        parentCategories={parentCategories}
                        accounts={accounts}
                        departments={departments}
                        onBack={handleBackClick} 
                        onSubmit={handleFormSubmit}
                    />
                )}
            </div>
        </AdminLayout>
    );
};

export default BudgetCategory;
