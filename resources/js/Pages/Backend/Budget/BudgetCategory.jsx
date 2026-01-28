import React, { useState, useEffect, useMemo } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/Budget/BudgetCategory.scss';

// --- View Section Component ---
const ViewSection = ({ categories, onEdit, onCreate, onDelete }) => {
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
                        <span className="stat-label">Total Categories</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">
                        <span className="material-icons-outlined">check_circle</span>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.active}</span>
                        <span className="stat-label">Active Categories</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon gray">
                        <span className="material-icons-outlined">cancel</span>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.inactive}</span>
                        <span className="stat-label">Inactive Categories</span>
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
                            placeholder="Search categories..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={onCreate}>
                        <span className="material-icons-outlined">add</span>
                        Add New Category
                    </button>
                </div>

                <div className="table-responsive">
                    <table className="professional-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Name (AR)</th>
                                <th>Name (EN)</th>
                                <th>Parent Category</th>
                                <th>Type</th>
                                <th>Account</th>
                                <th>Department</th>
                                <th>Status</th>
                                <th>Actions</th>
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
                                                {category.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button onClick={() => onEdit(category)} title="Edit">
                                                    <span className="material-icons-outlined">edit</span>
                                                </button>
                                                <button className="delete-btn" onClick={() => onDelete(category.id)} title="Delete">
                                                    <span className="material-icons-outlined">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>
                                        No budget categories found.
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
    const { errors } = usePage().props;
    
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
                        {isEdit ? 'Edit Budget Category' : 'Create New Budget Category'}
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Category Code</label>
                                <input
                                    type="text"
                                    name="code"
                                    defaultValue={initialData?.code}
                                    placeholder="Auto-generated (e.g., BC-001)"
                                    readOnly={true}
                                    style={{ backgroundColor: '#f3f4f6' }}
                                />
                                {errors.code && <div className="error-message">{errors.code}</div>}
                            </div>
                            <div className="form-group">
                                <label>Parent Category</label>
                                <select
                                    name="parent_id"
                                    defaultValue={initialData?.parent_id || ''}
                                >
                                    <option value="">None (Main Category)</option>
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
                                <label>Name (Arabic) <span style={{ color: 'red' }}>*</span></label>
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
                                <label>Name (English)</label>
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
                                <label>Category Type</label>
                                <input
                                    type="text"
                                    name="category_type"
                                    defaultValue={initialData?.category_type}
                                    placeholder="e.g. Capital, Operational"
                                />
                                {errors.category_type && <div className="error-message">{errors.category_type}</div>}
                            </div>
                            <div className="form-group">
                                <label>Status</label>
                                <select
                                    name="is_active"
                                    defaultValue={initialData ? (initialData.is_active ? '1' : '0') : '1'}
                                >
                                    <option value="1">Active</option>
                                    <option value="0">Inactive</option>
                                </select>
                                {errors.is_active && <div className="error-message">{errors.is_active}</div>}
                            </div>
                        </div>

                        <div className="form-grid">
                            <div className="form-group">
                                <label>GL Account</label>
                                <select
                                    name="account_id"
                                    defaultValue={initialData?.account_id || ''}
                                >
                                    <option value="">Select Account</option>
                                    {accounts.map(acc => (
                                        <option key={acc.AccID} value={acc.AccID}>
                                            {acc.AccName}
                                        </option>
                                    ))}
                                </select>
                                {errors.account_id && <div className="error-message">{errors.account_id}</div>}
                            </div>
                            <div className="form-group">
                                <label>Department</label>
                                <select
                                    name="department_id"
                                    defaultValue={initialData?.department_id || ''}
                                >
                                    <option value="">Select Department</option>
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
                            <label>Description</label>
                            <textarea
                                name="description"
                                defaultValue={initialData?.description}
                                placeholder="Additional description..."
                            ></textarea>
                            {errors.description && <div className="error-message">{errors.description}</div>}
                        </div>

                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={onBack}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary">
                                {isEdit ? 'Update Category' : 'Create Category'}
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
    const [mode, setMode] = useState('view'); // 'view' | 'create' | 'edit'
    const [selectedCategory, setSelectedCategory] = useState(null);
    const { flash } = usePage().props;

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
        if (window.confirm('Are you sure you want to delete this category?')) {
            router.delete(route('admin.budget.categories.destroy', id), {
                preserveScroll: true
            });
        }
    };

    return (
        <AdminLayout activeMenu="Budget">
            <Head title="Budget Categories - ZodicERP" />
            
            <div className="budget-categories-container">
                {/* Fixed Page Header Title based on Mode */}
                <div className="page-header">
                    <h1>
                        {mode === 'view' && 'Budget Categories'}
                        {mode === 'create' && 'New Budget Category'}
                        {mode === 'edit' && 'Edit Budget Category'}
                    </h1>
                    {mode !== 'view' && (
                        <button className="btn btn-secondary" onClick={handleBackClick}>
                            <span className="material-icons-outlined">arrow_back</span>
                            Back to List
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
