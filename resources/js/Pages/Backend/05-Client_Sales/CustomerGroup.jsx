import React, { useState, useEffect, useMemo } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import BlankPage from '@/Components/BlankPage';

// --- View Section Component ---
const ViewSection = ({ groups, onEdit, onCreate, onDelete }) => {
    return (
        <div className="animate-fade-slide">
            {/* Content Card */}
            <div className="content-card">
                <div className="table-responsive">
                    <table className="professional-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Name (AR)</th>
                                <th>Name (EN)</th>
                                <th>Parent Group</th>
                                <th>Discount %</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groups.length > 0 ? (
                                groups.map(group => (
                                    <tr key={group.id}>
                                        <td>{group.code}</td>
                                        <td>{group.name_ar}</td>
                                        <td>{group.name_en || '-'}</td>
                                        <td>{group.parent?.name_ar || '-'}</td>
                                        <td>{group.discount_percentage ? `${group.discount_percentage}%` : '-'}</td>
                                        <td>
                                            <span className={`status-badge ${group.is_active ? 'active' : 'inactive'}`}>
                                                {group.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button onClick={() => onEdit(group)} title="Edit">
                                                    <span className="material-icons-outlined">edit</span>
                                                </button>
                                                <button className="delete-btn" onClick={() => onDelete(group.id)} title="Delete">
                                                    <span className="material-icons-outlined">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                                        No customer groups found.
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
const FormSection = ({ mode, initialData, parentGroups, onBack, onSubmit }) => {
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
            payment_terms: formData.get('payment_terms'),
            credit_limit: formData.get('credit_limit'),
            discount_percentage: formData.get('discount_percentage'),
            notes: formData.get('notes'),
            is_active: formData.get('is_active') === '1',
        };
        onSubmit(data);
    };

    return (
        <div className="animate-fade-slide">
            <div className="content-card">
                <div className="form-container">
                    <div className="form-section-title">
                        {isEdit ? 'Edit Customer Group' : 'Create New Customer Group'}
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Group Code</label>
                                <input
                                    type="text"
                                    name="code"
                                    defaultValue={initialData?.code}
                                    placeholder="Auto-generated (e.g., GRP-001)"
                                    readOnly={true}
                                    style={{ backgroundColor: '#f3f4f6' }}
                                />
                                {errors.code && <div className="error-message">{errors.code}</div>}
                            </div>
                            <div className="form-group">
                                <label>Parent Group</label>
                                <select
                                    name="parent_id"
                                    defaultValue={initialData?.parent_id || ''}
                                >
                                    <option value="">None (Main Group)</option>
                                    {parentGroups.map(pg => (
                                        <option key={pg.id} value={pg.id}>{pg.name_ar}</option>
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
                                <label>Payment Terms (Days)</label>
                                <input
                                    type="number"
                                    name="payment_terms"
                                    defaultValue={initialData?.payment_terms || 30}
                                    min="0"
                                />
                                {errors.payment_terms && <div className="error-message">{errors.payment_terms}</div>}
                            </div>
                            <div className="form-group">
                                <label>Default Credit Limit</label>
                                <input
                                    type="number"
                                    name="credit_limit"
                                    defaultValue={initialData?.credit_limit || 0}
                                    step="0.01"
                                    min="0"
                                />
                                {errors.credit_limit && <div className="error-message">{errors.credit_limit}</div>}
                            </div>
                        </div>

                        <div className="form-grid">
                            <div className="form-group">
                                <label>Discount Percentage (%)</label>
                                <input
                                    type="number"
                                    name="discount_percentage"
                                    defaultValue={initialData?.discount_percentage || 0}
                                    step="0.01"
                                    min="0"
                                    max="100"
                                />
                                {errors.discount_percentage && <div className="error-message">{errors.discount_percentage}</div>}
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

                        <div className="form-group">
                            <label>Notes</label>
                            <textarea
                                name="notes"
                                defaultValue={initialData?.notes}
                                placeholder="Additional notes..."
                            ></textarea>
                            {errors.notes && <div className="error-message">{errors.notes}</div>}
                        </div>

                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={onBack}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary">
                                {isEdit ? 'Update Group' : 'Create Group'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// --- Main Container Component ---
const CustomerGroups = ({ groups = [], parentGroups = [] }) => {
    const { flash, localization } = usePage().props;

    const [mode, setMode] = useState('view'); // 'view', 'create', 'edit'
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const getLocalizedRoute = (name, params = {}) => {
        return route(name, {
            country: localization?.country_code || 'sa',
            lang: localization?.current_locale || 'ar',
            ...params
          });
    };

    // Reset mode to view on successful Inertia navigation
    useEffect(() => {
        if (flash?.success) {
            setMode('view');
            setSelectedGroup(null);
        }
    }, [flash, groups]);

    const filteredGroups = useMemo(() => {
        if (!searchTerm) return groups;
        const lowerTerm = searchTerm.toLowerCase();
        return groups.filter(g => 
            g.name_ar.toLowerCase().includes(lowerTerm) ||
            (g.name_en && g.name_en.toLowerCase().includes(lowerTerm)) ||
            (g.code && g.code.toLowerCase().includes(lowerTerm))
        );
    }, [searchTerm, groups]);

    const stats = useMemo(() => {
        const total = filteredGroups.length;
        const active = filteredGroups.filter(g => g.is_active).length;
        const inactive = total - active;
        return { total, active, inactive };
    }, [filteredGroups]);

    const handleCreateClick = () => {
        setMode('create');
        setSelectedGroup(null);
    };

    const handleEditClick = (group) => {
        setMode('edit');
        setSelectedGroup(group);
    };

    const handleBackClick = () => {
        setMode('view');
        setSelectedGroup(null);
    };

    const handleFormSubmit = (data) => {
        if (mode === 'edit' && selectedGroup) {
            router.put(getLocalizedRoute('admin.client-sales.customer-groups.update', { customer_group: selectedGroup.id }), data, {
                preserveScroll: true,
                onSuccess: () => {
                    setMode('view');
                    setSelectedGroup(null);
                }
            });
        } else {
            router.post(getLocalizedRoute('admin.client-sales.customer-groups.store'), data, {
                preserveScroll: true,
                onSuccess: () => {
                    setMode('view');
                }
            });
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this group?')) {
            router.delete(getLocalizedRoute('admin.client-sales.customer-groups.destroy', { customer_group: id }), {
                preserveScroll: true
            });
        }
    };

    const breadcrumbs = [
        { label: 'Dashboard', href: getLocalizedRoute('admin.dashboard') },
        { label: 'Client & Sales', href: '#' },
        { label: 'Customer Groups', onClick: handleBackClick }
    ];

    if (mode === 'create') breadcrumbs.push({ label: 'New Group' });
    if (mode === 'edit') breadcrumbs.push({ label: 'Edit Group' });

    const statsContent = mode === 'view' && (
        <div className="stats-grid">
            <div className="stat-card">
                <div className="stat-icon blue">
                    <span className="material-icons-outlined">groups</span>
                </div>
                <div className="stat-info">
                    <span className="stat-value">{stats.total}</span>
                    <span className="stat-label">Total Groups</span>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon green">
                    <span className="material-icons-outlined">check_circle</span>
                </div>
                <div className="stat-info">
                    <span className="stat-value">{stats.active}</span>
                    <span className="stat-label">Active Groups</span>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon gray">
                    <span className="material-icons-outlined">cancel</span>
                </div>
                <div className="stat-info">
                    <span className="stat-value">{stats.inactive}</span>
                    <span className="stat-label">Inactive Groups</span>
                </div>
            </div>
        </div>
    );

    const filtersContent = mode === 'view' && (
        <div className="page-header" style={{ marginBottom: '0' }}>
            <div className="search-box">
                <span className="material-icons-outlined search-icon">search</span>
                <input
                    type="text"
                    placeholder="Search groups..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <button className="btn btn-primary" onClick={handleCreateClick}>
                <span className="material-icons-outlined">add</span>
                Add New Group
            </button>
        </div>
    );

    return (
        <AdminLayout activeMenu="Customer Groups">
            <Head title="Customer Groups - ZodicERP" />
            
            <BlankPage 
                breadcrumbs={breadcrumbs} 
                stats={statsContent}
                filters={filtersContent}
            >
                <div className="customer-groups-container">
                    {/* Main Content Area with Transitions */}
                    {mode === 'view' && (
                        <ViewSection 
                            groups={filteredGroups} 
                            onCreate={handleCreateClick} 
                            onEdit={handleEditClick}
                            onDelete={handleDelete}
                        />
                    )}

                    {mode === 'create' && (
                        <FormSection 
                            mode="create" 
                            parentGroups={parentGroups} 
                            onBack={handleBackClick} 
                            onSubmit={handleFormSubmit}
                        />
                    )}

                    {mode === 'edit' && (
                        <FormSection 
                            mode="edit" 
                            initialData={selectedGroup} 
                            parentGroups={parentGroups} 
                            onBack={handleBackClick} 
                            onSubmit={handleFormSubmit}
                        />
                    )}
                </div>
            </BlankPage>
        </AdminLayout>
    );
};

export default CustomerGroups;
