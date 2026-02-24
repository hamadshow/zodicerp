import React, { useState, useEffect } from 'react';
import { Head, Link, router, usePage, useForm } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import MediaPickerModal from '../Media/MediaPickerModal';
import '../../../../css/backend/08-Assets/Assets.scss';

const resolveMediaUrl = (value) => {
    if (!value) {
        return null;
    }

    if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
        return value;
    }

    const withoutProtocol =
        typeof value === 'string' ? value.replace(/^https?:\/\/[^/]+/, '') : '';

    const relativePath = withoutProtocol.replace(
        /^\/?(files|storage|media-files)\//,
        ''
    );

    return `/media-files/${relativePath}`;
};

// ==========================================
// Helper Components
// ==========================================

const CategoryTreeItem = ({ category, selectedIds, onToggle, level = 0 }) => {
    const [isOpen, setIsOpen] = useState(false);
    const hasChildren = category.children && category.children.length > 0;
    
    const handleToggle = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    return (
        <div className="category-tree-item" style={{ '--level': level }}>
            <div className="category-row">
                {hasChildren ? (
                    <span 
                        className={`toggle-icon ${isOpen ? 'open' : ''}`}
                        onClick={handleToggle}
                    >
                        {isOpen ? '▼' : '▶'}
                    </span>
                ) : (
                    <span className="toggle-placeholder"></span>
                )}
                
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        value={category.id}
                        checked={selectedIds.includes(String(category.id))}
                        onChange={() => onToggle(String(category.id))}
                    />
                    <span className="category-name">{category.name}</span>
                </label>
            </div>

            <div className={`category-children ${isOpen ? 'expanded' : ''}`}>
                {hasChildren && category.children.map(child => (
                    <CategoryTreeItem
                        key={child.id}
                        category={child}
                        selectedIds={selectedIds}
                        onToggle={onToggle}
                        level={level + 1}
                    />
                ))}
            </div>
        </div>
    );
};

// ==========================================
// List Component
// ==========================================

const AssetsList = ({ assets, warehouses, categories, filters = {} }) => {
    const { flash } = usePage().props;
    const safeAssets = assets || { data: [], total: 0, from: 0, to: 0, links: [] };
    const safeWarehouses = Array.isArray(warehouses) ? warehouses : [];
    const safeCategories = Array.isArray(categories) ? categories : [];
    
    // Filter States
    const [filterParams, setFilterParams] = useState({
        search: filters.search || '',
        status: filters.status || '',
        warehouse_id: filters.warehouse_id || '',
        category_id: filters.category_id || '',
    });

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilterParams(prev => ({ ...prev, [name]: value }));
    };

    const applyFilters = () => {
        router.get(route('admin.assets.index'), filterParams, { preserveState: true });
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this asset?')) {
            router.delete(route('admin.assets.destroy', id));
        }
    };

    return (
        <AdminLayout activeMenu="Inventory">
            <Head title="Assets" />
            
            <div className="assets-page">
                <div className="content-area">
                <div className="page-header-section">
                    <div className="breadcrumb">
                        <Link href={route('admin.dashboard')}>Dashboard</Link>
                        <span>/</span>
                        <span>Inventory</span>
                        <span>/</span>
                        <span className="current">Assets</span>
                    </div>
                    <h1 className="page-title">Assets</h1>
                </div>

                {flash.success && (
                    <div className="alert alert-success">
                        {flash.success}
                    </div>
                )}
                {flash.error && (
                    <div className="alert alert-danger">
                        {flash.error}
                    </div>
                )}

                {/* Stats Cards */}
                <div className="stats-cards">
                    <div className="stat-card">
                        <div className="stat-icon blue-gradient">
                            <span className="material-icons-outlined">inventory_2</span>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{safeAssets.total}</div>
                            <div className="stat-label">Total Assets</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon green-gradient">
                            <span className="material-icons-outlined">category</span>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{safeCategories.length}</div>
                            <div className="stat-label">Total Categories</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon indigo-gradient">
                            <span className="material-icons-outlined">store</span>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{safeWarehouses.length}</div>
                            <div className="stat-label">Total Warehouses</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon amber-gradient">
                            <span className="material-icons-outlined">attach_money</span>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">$0.00</div>
                            <div className="stat-label">Total Value</div>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header d-flex justify-between align-items-center">
                        <h3>Assets List</h3>
                        <div className="card-actions d-flex gap-2">
                            <div className="search-bar">
                                <input 
                                    type="text" 
                                    name="search"
                                    placeholder="Search..." 
                                    value={filterParams.search}
                                    onChange={handleFilterChange}
                                />
                                <button onClick={applyFilters}>
                                    <span className="material-icons-outlined">search</span>
                                </button>
                            </div>
                            <Link className="btn btn-primary" href="/admin/assets/create">
                                <span className="material-icons-outlined">add</span>
                                Add Asset
                            </Link>
                        </div>
                    </div>

                    <div className="filter-bar">
                        <select name="category_id" className="form-control filter-select" value={filterParams.category_id} onChange={handleFilterChange}>
                            <option value="">All Categories</option>
                            {safeCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <select name="warehouse_id" className="form-control filter-select" value={filterParams.warehouse_id} onChange={handleFilterChange}>
                            <option value="">All Warehouses</option>
                            {safeWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                        <select name="status" className="form-control filter-select" value={filterParams.status} onChange={handleFilterChange}>
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="disposed">Disposed</option>
                        </select>
                        <button className="btn btn-outline" onClick={applyFilters}>Filter</button>
                    </div>

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Asset</th>
                                    <th>Asset #</th>
                                    <th>Serial</th>
                                    <th>Category</th>
                                    <th>Warehouse</th>
                                    <th>Unit Cost</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {safeAssets.data.length > 0 ? (
                                    safeAssets.data.map(asset => (
                                        <tr key={asset.id}>
                                            <td>
                                                <div className="asset-cell">
                                                    {asset.image_path ? (
                                                        <img src={resolveMediaUrl(asset.image_path)} alt={asset.name_en} className="asset-thumb" />
                                                    ) : (
                                                        <div className="asset-thumb-placeholder">
                                                            <span className="material-icons-outlined text-gray-light">image</span>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-semibold">{asset.name_en || asset.name}</div>
                                                        {asset.name_ar && <div className="text-muted text-sm">{asset.name_ar}</div>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{asset.asset_number || '-'}</td>
                                            <td>{asset.serial_number || '-'}</td>
                                            <td>{asset.category?.name || '-'}</td>
                                            <td>{asset.warehouse?.name || '-'}</td>
                                            <td>${asset.unit_cost || '0.00'}</td>
                                            <td>
                                                <span className={`status-badge status-${asset.status}`}>
                                                    {asset.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="actions-cell">
                                                    <button
                                                        className="icon-btn edit"
                                                        onClick={() => router.get(`/admin/assets/${asset.id}/edit`)}
                                                        title="Edit"
                                                    >
                                                        <span className="material-icons-outlined">edit</span>
                                                    </button>
                                                    <button className="icon-btn delete" onClick={() => handleDelete(asset.id)} title="Delete">
                                                        <span className="material-icons-outlined">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="empty-state">No assets found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {safeAssets.links && (
                        <div className="pagination">
                            <div className="pagination-info">
                                Showing {safeAssets.from} to {safeAssets.to} of {safeAssets.total} results
                            </div>
                            <div className="pagination-controls">
                                {safeAssets.links.map((link, i) => (
                                    <button
                                        key={i}
                                        className={`page-btn ${link.active ? 'active' : ''}`}
                                        onClick={() => link.url && router.get(link.url, filterParams, { preserveState: true })}
                                        disabled={!link.url}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    ></button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                </div>
            </div>
        </AdminLayout>
    );
};

// ==========================================
// Form Component (Create/Edit)
// ==========================================

const AssetsForm = ({ asset, categories, warehouses, units, employees }) => {
    const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
    
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        name_en: '',
        name_ar: '',
        asset_number: '',
        serial_number: '',
        barcode: '',
        category_id: '',
        warehouse_id: '',
        unit_id: '',
        employee_id: '',
        status: 'active',
        description: '',
        
        // Financials
        purchase_date: '',
        unit_cost: '',
        current_value: '',
        salvage_value: '',
        
        // Depreciation
        is_depreciable: false,
        depreciation_method: 'straight_line',
        depreciation_rate: '',
        useful_life_months: '',
        
        // Warranty
        warranty_expiry: '',
        
        // Media
        image: null,
        existing_image: null,
    });

    useEffect(() => {
        clearErrors();
        if (asset) {
            setData({
                ...data,
                ...asset,
                name_en: asset.name_en || asset.name || '',
                name_ar: asset.name_ar || '',
                asset_number: asset.asset_number || '',
                serial_number: asset.serial_number || '',
                barcode: asset.barcode || '',
                category_id: asset.category_id || '',
                warehouse_id: asset.warehouse_id || '',
                unit_id: asset.unit_id || '',
                employee_id: asset.employee_id || '',
                status: asset.status || 'active',
                description: asset.description || '',
                purchase_date: asset.purchase_date || '',
                unit_cost: asset.unit_cost || '',
                current_value: asset.current_value || '',
                salvage_value: asset.salvage_value || '',
                is_depreciable: Boolean(asset.is_depreciable),
                depreciation_method: asset.depreciation_method || 'straight_line',
                depreciation_rate: asset.depreciation_rate || '',
                useful_life_months: asset.useful_life_months || '',
                warranty_expiry: asset.warranty_expiry || '',
                image: null,
                existing_image: asset.image || null,
            });
        } else {
            reset();
        }
    }, [asset]);

    const handleMediaSelect = (selected) => {
        // Assume single selection for main image
        if (selected && selected.length > 0) {
            // If using Media Library which returns objects
            // setData('image', selected[0].path || selected[0].url);
            // But here we might just simulate file input if not using complex media lib
            // For now, let's assume we use standard file input for upload
            // or if MediaPicker returns a path string
            console.log("Selected media:", selected);
        }
        setIsMediaPickerOpen(false);
    };
    
    // File input handler for image
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setData('image', file);
        }
    };

    const submit = (e) => {
        e.preventDefault();
        if (asset) {
            router.post(route('admin.assets.update', asset.id), {
                _method: 'put',
                ...data
            });
        } else {
            post(route('admin.assets.store'));
        }
    };

    return (
        <AdminLayout activeMenu="Inventory">
            <Head title={asset ? `Edit Asset: ${data.name_en}` : "Create Asset"} />
            
            <div className="assets-ce-page">
                <form onSubmit={submit}>
                    <div className="assets-ce-header">
                        <h1 className="assets-ce-title">
                            {asset ? `Edit Asset: ${data.name_en}` : "Create New Asset"}
                        </h1>
                        <div className="assets-ce-actions">
                            <Link href="/admin/assets" className="btn btn-outline">Cancel</Link>
                            <button type="submit" className="btn btn-primary" disabled={processing}>
                                {processing ? 'Saving...' : (asset ? 'Update Asset' : 'Save Asset')}
                            </button>
                        </div>
                    </div>

                    <div className="assets-layout">
                        {/* Main Content */}
                        <div className="assets-main">
                            
                            {/* General Information */}
                            <div className="assets-section-card">
                                <div className="assets-section-header">
                                    <h3 className="assets-section-title">General Information</h3>
                                </div>
                                <div className="assets-section-content">
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">Name (English) <span className="text-error">*</span></label>
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                value={data.name_en}
                                                onChange={e => setData('name_en', e.target.value)}
                                            />
                                            {errors.name_en && <div className="text-error">{errors.name_en}</div>}
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Name (Arabic)</label>
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                value={data.name_ar}
                                                onChange={e => setData('name_ar', e.target.value)}
                                            />
                                            {errors.name_ar && <div className="text-error">{errors.name_ar}</div>}
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Description</label>
                                        <textarea 
                                            className="form-control form-textarea" 
                                            value={data.description}
                                            onChange={e => setData('description', e.target.value)}
                                        ></textarea>
                                        {errors.description && <div className="text-error">{errors.description}</div>}
                                    </div>
                                    
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">Category</label>
                                            <select 
                                                className="form-control"
                                                value={data.category_id}
                                                onChange={e => setData('category_id', e.target.value)}
                                            >
                                                <option value="">Select Category</option>
                                                {categories && categories.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                            {errors.category_id && <div className="text-error">{errors.category_id}</div>}
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Warehouse</label>
                                            <select 
                                                className="form-control"
                                                value={data.warehouse_id}
                                                onChange={e => setData('warehouse_id', e.target.value)}
                                            >
                                                <option value="">Select Warehouse</option>
                                                {warehouses && warehouses.map(w => (
                                                    <option key={w.id} value={w.id}>{w.name}</option>
                                                ))}
                                            </select>
                                            {errors.warehouse_id && <div className="text-error">{errors.warehouse_id}</div>}
                                        </div>
                                    </div>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">Unit</label>
                                            <select 
                                                className="form-control"
                                                value={data.unit_id}
                                                onChange={e => setData('unit_id', e.target.value)}
                                            >
                                                <option value="">Select Unit</option>
                                                {units && units.map(u => (
                                                    <option key={u.id} value={u.id}>{u.name}</option>
                                                ))}
                                            </select>
                                            {errors.unit_id && <div className="text-error">{errors.unit_id}</div>}
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Employee</label>
                                            <select 
                                                className="form-control"
                                                value={data.employee_id}
                                                onChange={e => setData('employee_id', e.target.value)}
                                            >
                                                <option value="">Select Employee</option>
                                                {employees && employees.map(e => (
                                                    <option key={e.id} value={e.id}>{e.name}</option>
                                                ))}
                                            </select>
                                            {errors.employee_id && <div className="text-error">{errors.employee_id}</div>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Identification */}
                            <div className="assets-section-card">
                                <div className="assets-section-header">
                                    <h3 className="assets-section-title">Identification</h3>
                                </div>
                                <div className="assets-section-content">
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">Asset Number <span className="text-error">*</span></label>
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                value={data.asset_number}
                                                onChange={e => setData('asset_number', e.target.value)}
                                            />
                                            {errors.asset_number && <div className="text-error">{errors.asset_number}</div>}
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Serial Number</label>
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                value={data.serial_number}
                                                onChange={e => setData('serial_number', e.target.value)}
                                            />
                                            {errors.serial_number && <div className="text-error">{errors.serial_number}</div>}
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Barcode</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            value={data.barcode}
                                            onChange={e => setData('barcode', e.target.value)}
                                        />
                                        {errors.barcode && <div className="text-error">{errors.barcode}</div>}
                                    </div>
                                </div>
                            </div>

                            {/* Financials */}
                            <div className="assets-section-card">
                                <div className="assets-section-header">
                                    <h3 className="assets-section-title">Financials</h3>
                                </div>
                                <div className="assets-section-content">
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">Purchase Date</label>
                                            <input 
                                                type="date" 
                                                className="form-control" 
                                                value={data.purchase_date}
                                                onChange={e => setData('purchase_date', e.target.value)}
                                            />
                                            {errors.purchase_date && <div className="text-error">{errors.purchase_date}</div>}
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Unit Cost</label>
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                className="form-control" 
                                                value={data.unit_cost}
                                                onChange={e => setData('unit_cost', e.target.value)}
                                            />
                                            {errors.unit_cost && <div className="text-error">{errors.unit_cost}</div>}
                                        </div>
                                    </div>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">Current Value</label>
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                className="form-control" 
                                                value={data.current_value}
                                                onChange={e => setData('current_value', e.target.value)}
                                            />
                                            {errors.current_value && <div className="text-error">{errors.current_value}</div>}
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Salvage Value</label>
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                className="form-control" 
                                                value={data.salvage_value}
                                                onChange={e => setData('salvage_value', e.target.value)}
                                            />
                                            {errors.salvage_value && <div className="text-error">{errors.salvage_value}</div>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Depreciation */}
                            <div className="assets-section-card">
                                <div className="assets-section-header">
                                    <h3 className="assets-section-title">Depreciation</h3>
                                </div>
                                <div className="assets-section-content">
                                    <div className="form-group">
                                        <label className="form-checkbox-label">
                                            <input 
                                                type="checkbox" 
                                                className="form-checkbox"
                                                checked={data.is_depreciable}
                                                onChange={e => setData('is_depreciable', e.target.checked)}
                                            />
                                            <span className="form-checkbox-text">Asset is depreciable</span>
                                        </label>
                                    </div>
                                    
                                    {data.is_depreciable && (
                                        <>
                                            <div className="form-grid">
                                                <div className="form-group">
                                                    <label className="form-label">Depreciation Method</label>
                                                    <select 
                                                        className="form-control"
                                                        value={data.depreciation_method}
                                                        onChange={e => setData('depreciation_method', e.target.value)}
                                                    >
                                                        <option value="straight_line">Straight Line</option>
                                                        <option value="declining_balance">Declining Balance</option>
                                                        <option value="sum_of_years">Sum of Years Digits</option>
                                                    </select>
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Useful Life (Months)</label>
                                                    <input 
                                                        type="number" 
                                                        className="form-control" 
                                                        value={data.useful_life_months}
                                                        onChange={e => setData('useful_life_months', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="assets-sidebar">
                            
                            {/* Status */}
                            <div className="sidebar-card">
                                <div className="sidebar-card-header">
                                    <h3 className="sidebar-card-title">Status</h3>
                                </div>
                                <div className="form-group">
                                    <select 
                                        className="form-control"
                                        value={data.status}
                                        onChange={e => setData('status', e.target.value)}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="maintenance">Maintenance</option>
                                        <option value="disposed">Disposed</option>
                                    </select>
                                </div>
                            </div>

                            {/* Image */}
                            <div className="sidebar-card">
                                <div className="sidebar-card-header">
                                    <h3 className="sidebar-card-title">Asset Image</h3>
                                </div>
                                <div className="form-group">
                                    {data.existing_image && !data.image && (
                                        <div className="mb-4">
                                            <img 
                                                src={resolveMediaUrl(data.existing_image)} 
                                                alt="Current" 
                                                className="w-full rounded-lg border border-gray-200" 
                                            />
                                        </div>
                                    )}
                                    {data.image && (
                                        <div className="mb-4">
                                            <img 
                                                src={URL.createObjectURL(data.image)} 
                                                alt="Preview" 
                                                className="w-full rounded-lg border border-gray-200" 
                                            />
                                        </div>
                                    )}
                                    <input 
                                        type="file" 
                                        className="form-control"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                    />
                                    <div className="mt-2 text-sm text-muted">
                                        Recommended size: 800x800px. Max: 2MB.
                                    </div>
                                </div>
                            </div>
                            
                            {/* Warranty */}
                            <div className="sidebar-card">
                                <div className="sidebar-card-header">
                                    <h3 className="sidebar-card-title">Warranty</h3>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Warranty Expiry</label>
                                    <input 
                                        type="date" 
                                        className="form-control" 
                                        value={data.warranty_expiry}
                                        onChange={e => setData('warranty_expiry', e.target.value)}
                                    />
                                </div>
                            </div>

                        </div>
                    </div>
                </form>
            </div>
            
            <MediaPickerModal 
                isOpen={isMediaPickerOpen} 
                onClose={() => setIsMediaPickerOpen(false)}
                onSelect={handleMediaSelect}
            />
        </AdminLayout>
    );
};

// ==========================================
// Main Component
// ==========================================

const Assets = (props) => {
    const { url } = usePage();
    const path = url?.split('?')[0] || '';
    const isCreate = path.endsWith('/admin/assets/create') || path.endsWith('/admin/assets/create/');
    const isEdit = /\/admin\/assets\/\d+\/edit\/?$/.test(path);
    const hasAssets = Boolean(props?.assets);

    if (isCreate || isEdit || !hasAssets) {
        return <AssetsForm {...props} />;
    }

    return <AssetsList {...props} />;
};

export default Assets;
