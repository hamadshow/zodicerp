import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/Warehouses.scss';

const Warehouses = ({ warehouses = [], branches = [] }) => {
    const [filteredWarehouses, setFilteredWarehouses] = useState(warehouses);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentWarehouse, setCurrentWarehouse] = useState(null);
    const [selectedIcon, setSelectedIcon] = useState('warehouse');
    const [selectedColor, setSelectedColor] = useState('#3b82f6');
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        totalCapacity: 0,
        utilization: 0
    });

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

    useEffect(() => {
        setFilteredWarehouses(warehouses);
    }, [warehouses]);

    useEffect(() => {
        updateStats();
        filterWarehouses();
    }, [filteredWarehouses, searchTerm]);

    const updateStats = () => {
        const total = filteredWarehouses.length;
        const active = filteredWarehouses.filter(w => w.status === 'active').length;
        const totalCapacity = filteredWarehouses.reduce((sum, w) => sum + (w.capacity || 0), 0);
        const usedCapacity = filteredWarehouses.reduce((sum, w) => sum + (w.used_capacity || 0), 0);
        const utilization = totalCapacity > 0 ? Math.round((usedCapacity / totalCapacity) * 100) : 0;

        setStats({ total, active, totalCapacity, utilization });
    };

    const filterWarehouses = () => {
        if (!searchTerm) {
            setFilteredWarehouses(warehouses);
            return;
        }
        const lowerTerm = searchTerm.toLowerCase();
        const filtered = warehouses.filter(w => 
            w.name.toLowerCase().includes(lowerTerm) ||
            (w.warehouse_code && w.warehouse_code.toLowerCase().includes(lowerTerm)) ||
            (w.manager && w.manager.toLowerCase().includes(lowerTerm)) ||
            (w.location && w.location.toLowerCase().includes(lowerTerm))
        );
        setFilteredWarehouses(filtered);
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const openModal = (wh = null) => {
        if (wh) {
            setCurrentWarehouse(wh);
            setSelectedIcon(wh.icon || 'warehouse');
            setSelectedColor(wh.color || '#3b82f6');
        } else {
            setCurrentWarehouse(null);
            setSelectedIcon('warehouse');
            setSelectedColor('#3b82f6');
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentWarehouse(null);
    };

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

        if (currentWarehouse) {
            router.put(route('admin.warehouses.update', currentWarehouse.id), data, {
                onSuccess: () => closeModal(),
            });
        } else {
            router.post(route('admin.warehouses.store'), data, {
                onSuccess: () => closeModal(),
            });
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this warehouse?')) {
            router.delete(route('admin.warehouses.destroy', id));
        }
    };

    return (
        <AdminLayout activeMenu="Warehouses">
            <Head title="Warehouses - ZodicERP" />
            <div className="breadcrumb">
                <a href="#">Dashboard</a>
                <span>/</span>
                <a href="#">Inventory</a>
                <span>/</span>
                <span>Warehouses</span>
            </div>

            {/* Quick Stats */}
            <div className="stats-cards">
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--primary-color)' }}>
                        <span className="material-icons-outlined">warehouse</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">Total Warehouses</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--success-color)' }}>
                        <span className="material-icons-outlined">check_circle</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.active}</div>
                        <div className="stat-label">Active Warehouses</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--info-color)' }}>
                        <span className="material-icons-outlined">inventory_2</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.totalCapacity.toLocaleString()}</div>
                        <div className="stat-label">Total Capacity</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--warning-color)' }}>
                        <span className="material-icons-outlined">pie_chart</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.utilization}%</div>
                        <div className="stat-label">Space Utilization</div>
                    </div>
                </div>
            </div>

            {/* Main Card */}
            <div className="warehouses-card fade-in">
                <div className="card-header">
                    <div className="warehouses-actions">
                        <select className="btn btn-outline" defaultValue="">
                            <option disabled value="">Bulk Actions</option>
                            <option value="activate">Activate Selected</option>
                            <option value="deactivate">Deactivate Selected</option>
                            <option value="maintenance">Set Maintenance</option>
                            <option value="delete">Delete Selected</option>
                        </select>
                        <button className="btn btn-outline">
                            <span className="material-icons-outlined">play_arrow</span>
                            <span>Apply</span>
                        </button>
                        <div className="search-bar light">
                            <input 
                                type="text" 
                                placeholder="Search warehouses..." 
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
                            <span>Add Warehouse</span>
                        </button>
                        <button className="btn btn-outline" onClick={() => window.location.reload()}>
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
                                <th>ID <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>WAREHOUSE <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>MANAGER <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>CAPACITY <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>UTILIZATION <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>LOCATION <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>STATUS <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>OPERATIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredWarehouses.length > 0 ? (
                                filteredWarehouses.map(wh => (
                                    <tr key={wh.id}>
                                        <td><input type="checkbox" className="warehouse-checkbox" /></td>
                                        <td>{wh.warehouse_code || wh.id}</td>
                                        <td>
                                            <div className="warehouse-info">
                                                <div className="warehouse-icon" style={{ backgroundColor: wh.color }}>
                                                    <span className="material-icons-outlined">{wh.icon}</span>
                                                </div>
                                                <div className="warehouse-details">
                                                    <div className="warehouse-name">{wh.name}</div>
                                                    <div className="warehouse-description text-xs text-gray-500">{wh.description}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{wh.manager || '-'}</td>
                                        <td>
                                            <span className="capacity-badge">{wh.capacity.toLocaleString()} units</span>
                                        </td>
                                        <td>
                                            <div className="flex flex-col">
                                                <div className="utilization-display">{wh.capacity > 0 ? Math.round((wh.used_capacity / wh.capacity) * 100) : 0}%</div>
                                                <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-1">
                                                    <div 
                                                        className="bg-blue-600 h-1.5 rounded-full" 
                                                        style={{ width: `${wh.capacity > 0 ? (wh.used_capacity / wh.capacity) * 100 : 0}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{wh.location || '-'}</td>
                                        <td>
                                            <span className={`warehouse-status status-${wh.status}`}>
                                                {wh.status.charAt(0).toUpperCase() + wh.status.slice(1)}
                                            </span>
                                        </td>
                                        <td>
                                            <button className="icon-btn edit" onClick={() => openModal(wh)}>
                                                <span className="material-icons-outlined">edit</span>
                                            </button>
                                            <button className="icon-btn delete" onClick={() => handleDelete(wh.id)}>
                                                <span className="material-icons-outlined">delete</span>
                                            </button>
                                            <button className="icon-btn" style={{ color: 'var(--info-color)' }}>
                                                <span className="material-icons-outlined">visibility</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="9" className="text-center py-4">No warehouses found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            <div className={`modal-overlay ${isModalOpen ? 'active' : ''}`} onClick={(e) => {
                if(e.target.className.includes('modal-overlay')) closeModal();
            }}>
                <div className="modal">
                    <div className="modal-header">
                        <div className="modal-title">{currentWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}</div>
                        <button className="modal-close" onClick={closeModal}>
                            <span className="material-icons-outlined">close</span>
                        </button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Warehouse Name</label>
                                <input 
                                    type="text" 
                                    name="name" 
                                    className="form-control" 
                                    defaultValue={currentWarehouse?.name}
                                    placeholder="e.g. Main Distribution Center"
                                    required 
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Branch</label>
                                    <select 
                                        name="branch_id" 
                                        className="form-control" 
                                        defaultValue={currentWarehouse?.branch_id || ''}
                                        required
                                    >
                                        <option value="" disabled>Select Branch</option>
                                        {branches.map(branch => (
                                            <option key={branch.id} value={branch.id}>{branch.branch_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Capacity</label>
                                    <input 
                                        type="number" 
                                        name="capacity" 
                                        className="form-control" 
                                        defaultValue={currentWarehouse?.capacity}
                                        placeholder="Total capacity"
                                        required 
                                    />
                                </div>
                            </div>

                            {currentWarehouse && (
                                <div className="form-group">
                                    <label className="form-label">Warehouse Code</label>
                                    <input 
                                        type="text" 
                                        name="code" 
                                        className="form-control" 
                                        defaultValue={currentWarehouse?.warehouse_code}
                                        disabled
                                    />
                                </div>
                            )}

                            {currentWarehouse && (
                                <div className="mb-4">
                                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                                        <span>Capacity Utilization</span>
                                        <span className="font-medium">{currentWarehouse.capacity > 0 ? Math.round((currentWarehouse.used_capacity / currentWarehouse.capacity) * 100) : 0}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div 
                                            className="bg-blue-600 h-2 rounded-full" 
                                            style={{ width: `${currentWarehouse.capacity > 0 ? (currentWarehouse.used_capacity / currentWarehouse.capacity) * 100 : 0}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>{currentWarehouse.used_capacity.toLocaleString()} used</span>
                                        <span>{currentWarehouse.capacity.toLocaleString()} total</span>
                                    </div>
                                </div>
                            )}

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Manager</label>
                                    <input 
                                        type="text" 
                                        name="manager" 
                                        className="form-control" 
                                        defaultValue={currentWarehouse?.manager}
                                        placeholder="Warehouse Manager Name"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Location Details</label>
                                    <input 
                                        type="text" 
                                        name="location" 
                                        className="form-control" 
                                        defaultValue={currentWarehouse?.location}
                                        placeholder="Specific location (e.g. Zone A)"
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select 
                                    name="status" 
                                    className="form-control" 
                                    defaultValue={currentWarehouse?.status || 'active'}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="maintenance">Maintenance</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea 
                                    name="description" 
                                    className="form-control form-textarea" 
                                    defaultValue={currentWarehouse?.description}
                                    placeholder="Enter warehouse description..."
                                ></textarea>
                            </div>
                            
                            <div className="form-group">
                                <label className="form-label">Icon</label>
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
                                <label className="form-label">Color Theme</label>
                                <div className="color-picker">
                                    {colors.map(color => (
                                        <div 
                                            key={color}
                                            className={`color-option ${selectedColor === color ? 'selected' : ''}`}
                                            style={{ backgroundColor: color }}
                                            onClick={() => setSelectedColor(color)}
                                        ></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
                            <button type="submit" className="btn btn-primary">
                                {currentWarehouse ? 'Update Warehouse' : 'Create Warehouse'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
};

export default Warehouses;
