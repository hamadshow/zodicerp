import React, { useState, useEffect, useMemo } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';

const ViewSection = ({ warehouses, onEdit, onCreate, onDelete }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredWarehouses, setFilteredWarehouses] = useState(warehouses);

    // Update stats
    const stats = useMemo(() => {
        const total = filteredWarehouses.length;
        const active = filteredWarehouses.filter(w => w.status === 'active').length;
        const totalCapacity = filteredWarehouses.reduce((sum, w) => sum + (w.capacity || 0), 0);
        const usedCapacity = filteredWarehouses.reduce((sum, w) => sum + (w.used_capacity || 0), 0);
        const utilization = totalCapacity > 0 ? Math.round((usedCapacity / totalCapacity) * 100) : 0;
        
        return { total, active, totalCapacity, utilization };
    }, [filteredWarehouses]);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredWarehouses(warehouses);
        } else {
            const lowerTerm = searchTerm.toLowerCase();
            setFilteredWarehouses(warehouses.filter(w => 
                w.name.toLowerCase().includes(lowerTerm) ||
                (w.warehouse_code && w.warehouse_code.toLowerCase().includes(lowerTerm)) ||
                (w.manager && w.manager.toLowerCase().includes(lowerTerm)) ||
                (w.location && w.location.toLowerCase().includes(lowerTerm))
            ));
        }
    }, [searchTerm, warehouses]);

    return (
        <div className="animate-fade-slide">
            {/* Quick Stats */}
            <div className="stats-cards">
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#3b82f6' }}>
                        <span className="material-icons-outlined">warehouse</span>
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.total}</span>
                        <div className="stat-label">Total Warehouses</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#10b981' }}>
                        <span className="material-icons-outlined">check_circle</span>
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.active}</span>
                        <div className="stat-label">Active Warehouses</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#8b5cf6' }}>
                        <span className="material-icons-outlined">inventory_2</span>
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.totalCapacity.toLocaleString()}</span>
                        <div className="stat-label">Total Capacity</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#f59e0b' }}>
                        <span className="material-icons-outlined">pie_chart</span>
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.utilization}%</span>
                        <div className="stat-label">Utilization</div>
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
                            placeholder="Search warehouses..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={onCreate}>
                        <span className="material-icons-outlined">add</span>
                        Add New Warehouse
                    </button>
                </div>

                <div className="table-responsive">
                    <table className="professional-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Name</th>
                                <th>Manager</th>
                                <th>Capacity</th>
                                <th>Utilization</th>
                                <th>Location</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredWarehouses.length > 0 ? (
                                filteredWarehouses.map(wh => (
                                    <tr key={wh.id}>
                                        <td>{wh.warehouse_code || wh.id}</td>
                                        <td>
                                            <div className="warehouse-info">
                                                <div className="warehouse-icon" style={{ 
                                                    backgroundColor: wh.color || '#3b82f6', 
                                                }}>
                                                    <span className="material-icons-outlined">{wh.icon || 'warehouse'}</span>
                                                </div>
                                                <div className="warehouse-details">
                                                    <div className="warehouse-name">{wh.name}</div>
                                                    <div className="warehouse-description text-xs text-gray-500">{wh.description}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{wh.manager || '-'}</td>
                                        <td>{wh.capacity.toLocaleString()} units</td>
                                        <td>
                                            <div className="flex flex-col" style={{ minWidth: '100px' }}>
                                                <div className="utilization-display text-xs mb-1">
                                                    {wh.capacity > 0 ? Math.round((wh.used_capacity / wh.capacity) * 100) : 0}%
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                    <div
                                                        className="bg-blue-600 h-1.5 rounded-full"
                                                        style={{ width: `${wh.capacity > 0 ? (wh.used_capacity / wh.capacity) * 100 : 0}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{wh.location || '-'}</td>
                                        <td>
                                            <span className={`status-badge ${wh.status === 'active' ? 'active' : 'inactive'}`}>
                                                {wh.status.charAt(0).toUpperCase() + wh.status.slice(1)}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button onClick={() => onEdit(wh)} title="Edit">
                                                    <span className="material-icons-outlined">edit</span>
                                                </button>
                                                <button className="delete-btn" onClick={() => onDelete(wh.id)} title="Delete">
                                                    <span className="material-icons-outlined">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                                        No warehouses found.
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

// --- Form Section Component ---
const FormSection = ({ mode, initialData, branches, onBack, onSubmit }) => {
    const isEdit = mode === 'edit';
    const { errors } = usePage().props;
    const [selectedIcon, setSelectedIcon] = useState(initialData?.icon || 'warehouse');
    const [selectedColor, setSelectedColor] = useState(initialData?.color || '#3b82f6');

    const icons = [
        { icon: 'warehouse', name: 'Warehouse' },
        { icon: 'store', name: 'Store' },
        { icon: 'inventory_2', name: 'Inventory' },
        { icon: 'local_shipping', name: 'Shipping' },
        { icon: 'ac_unit', name: 'Cold Storage' },
        { icon: 'pallet', name: 'Pallet' },
        { icon: 'factory', name: 'Factory' },
        { icon: 'assignment_return', name: 'Returns' },
        { icon: 'shelves', name: 'Shelves' },
        { icon: 'garage', name: 'Garage' }
    ];

    const colors = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
        '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'
    ];

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            name: formData.get('name'),
            branch_id: formData.get('branch_id'),
            manager: formData.get('manager'),
            location: formData.get('location'),
            capacity: formData.get('capacity'),
            status: formData.get('status'),
            icon: selectedIcon,
            color: selectedColor,
            description: formData.get('description'),
        };
        onSubmit(data);
    };

    return (
        <div className="animate-fade-slide">
            <div className="content-card">
                <div className="form-container">
                    <div className="form-section-title">
                        {isEdit ? 'Edit Warehouse' : 'Create New Warehouse'}
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Warehouse Name <span style={{ color: 'red' }}>*</span></label>
                                <input
                                    type="text"
                                    name="name"
                                    className="form-control"
                                    defaultValue={initialData?.name}
                                    placeholder="e.g. Main Distribution Center"
                                    required
                                />
                                {errors.name && <div className="error-message">{errors.name}</div>}
                            </div>
                            <div className="form-group">
                                <label>Branch <span style={{ color: 'red' }}>*</span></label>
                                <select
                                    name="branch_id"
                                    className="form-control"
                                    defaultValue={initialData?.branch_id || ''}
                                    required
                                >
                                    <option value="" disabled>Select Branch</option>
                                    {branches.map(branch => (
                                        <option key={branch.id} value={branch.id}>{branch.branch_name}</option>
                                    ))}
                                </select>
                                {errors.branch_id && <div className="error-message">{errors.branch_id}</div>}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Manager</label>
                                <input
                                    type="text"
                                    name="manager"
                                    className="form-control"
                                    defaultValue={initialData?.manager}
                                    placeholder="Warehouse Manager Name"
                                />
                                {errors.manager && <div className="error-message">{errors.manager}</div>}
                            </div>
                            <div className="form-group">
                                <label>Location</label>
                                <input
                                    type="text"
                                    name="location"
                                    className="form-control"
                                    defaultValue={initialData?.location}
                                    placeholder="Specific location (e.g. Zone A)"
                                />
                                {errors.location && <div className="error-message">{errors.location}</div>}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Capacity <span style={{ color: 'red' }}>*</span></label>
                                <input
                                    type="number"
                                    name="capacity"
                                    className="form-control"
                                    defaultValue={initialData?.capacity}
                                    placeholder="Total capacity"
                                    required
                                    min="0"
                                />
                                {errors.capacity && <div className="error-message">{errors.capacity}</div>}
                            </div>
                            <div className="form-group">
                                <label>Status</label>
                                <select
                                    name="status"
                                    className="form-control"
                                    defaultValue={initialData?.status || 'active'}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="maintenance">Maintenance</option>
                                </select>
                                {errors.status && <div className="error-message">{errors.status}</div>}
                            </div>
                        </div>

                        {initialData && (
                            <div className="form-group">
                                <label>Warehouse Code</label>
                                <input
                                    type="text"
                                    defaultValue={initialData.warehouse_code}
                                    readOnly
                                    style={{ backgroundColor: '#f3f4f6' }}
                                />
                            </div>
                        )}

                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                name="description"
                                className="form-control form-textarea"
                                defaultValue={initialData?.description}
                                placeholder="Enter warehouse description..."
                                rows="3"
                            ></textarea>
                            {errors.description && <div className="error-message">{errors.description}</div>}
                        </div>

                        <div className="form-group">
                            <label>Icon</label>
                            <div className="icon-selector">
                                {icons.map(item => (
                                    <div
                                        key={item.icon}
                                        className={`icon-option ${selectedIcon === item.icon ? 'selected' : ''}`}
                                        onClick={() => setSelectedIcon(item.icon)}
                                    >
                                        <span className="material-icons-outlined">{item.icon}</span>
                                        <span className="icon-name">{item.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Color Theme</label>
                            <div className="color-picker">
                                {colors.map(color => (
                                    <div
                                        key={color}
                                        className={`color-option ${selectedColor === color ? 'selected' : ''}`}
                                        style={{ backgroundColor: color }}
                                        onClick={() => setSelectedColor(color)}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={onBack}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary">
                                {isEdit ? 'Update Warehouse' : 'Create Warehouse'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// --- Main Container Component ---
const Warehouses = ({ warehouses = [], branches = [] }) => {
    const [mode, setMode] = useState('view'); // 'view' | 'create' | 'edit'
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);
    const { flash } = usePage().props;

    useEffect(() => {
        if (flash?.success) {
            setMode('view');
            setSelectedWarehouse(null);
        }
    }, [flash, warehouses]);

    const handleCreateClick = () => {
        setSelectedWarehouse(null);
        setMode('create');
    };

    const handleEditClick = (warehouse) => {
        setSelectedWarehouse(warehouse);
        setMode('edit');
    };

    const handleBackClick = () => {
        setMode('view');
        setSelectedWarehouse(null);
    };

    const handleFormSubmit = (data) => {
        if (mode === 'edit' && selectedWarehouse) {
            router.put(route('admin.warehouses.update', selectedWarehouse.id), data, {
                preserveScroll: true,
                onSuccess: () => {
                    setMode('view');
                    setSelectedWarehouse(null);
                }
            });
        } else {
            router.post(route('admin.warehouses.store'), data, {
                preserveScroll: true,
                onSuccess: () => {
                    setMode('view');
                    setSelectedWarehouse(null);
                }
            });
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this warehouse?')) {
            router.delete(route('admin.warehouses.destroy', id), {
                preserveScroll: true
            });
        }
    };

    return (
        <AdminLayout activeMenu="Warehouses">
            <Head title="Warehouses - ZodicERP" />
            
            <div className="warehouses-container">
                {/* Fixed Page Header Title based on Mode */}
                <div className="page-header">
                    <h1>
                        {mode === 'view' && 'Warehouses'}
                        {mode === 'create' && 'New Warehouse'}
                        {mode === 'edit' && 'Edit Warehouse'}
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
                        warehouses={warehouses} 
                        onCreate={handleCreateClick} 
                        onEdit={handleEditClick}
                        onDelete={handleDelete}
                    />
                )}

                {mode === 'create' && (
                    <FormSection 
                        mode="create" 
                        branches={branches}
                        onBack={handleBackClick} 
                        onSubmit={handleFormSubmit}
                    />
                )}

                {mode === 'edit' && (
                    <FormSection 
                        mode="edit" 
                        initialData={selectedWarehouse} 
                        branches={branches}
                        onBack={handleBackClick} 
                        onSubmit={handleFormSubmit}
                    />
                )}
            </div>
        </AdminLayout>
    );
};

export default Warehouses;
