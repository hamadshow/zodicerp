import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/Brands.css';

// Recursive Brand Item Component
const BrandItem = ({ brand, level = 0, onEdit, onDelete, onDrop, onDragStart }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const draggedId = e.dataTransfer.getData('text/plain');
        if (draggedId !== String(brand.id)) {
            onDrop(draggedId, brand.id);
        }
    };

    const hasChildren = brand.children && brand.children.length > 0;

    return (
        <div className="brand-node">
            <div 
                className={`brand-content ${isDragOver ? 'drag-over' : ''}`}
                draggable
                onDragStart={(e) => onDragStart(e, brand.id)}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{ marginLeft: `${level * 0}px` }}
            >
                <div className="brand-handle">
                    <span className="material-icons-outlined">drag_indicator</span>
                </div>
                
                <div 
                    className="brand-toggle" 
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
                >
                    <span className="material-icons-outlined">
                        {isExpanded ? 'expand_more' : 'chevron_right'}
                    </span>
                </div>

                <div className="brand-info">
                    <div className="brand-name">{brand.name}</div>
                    {brand.brand_code && (
                        <span className="brand-code">{brand.brand_code}</span>
                    )}
                    <span className={`brand-status ${brand.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                        {brand.status}
                    </span>
                </div>

                <div className="item-actions">
                    <button className="icon-btn" onClick={() => onEdit(brand)} title="Edit">
                        <span className="material-icons-outlined">edit</span>
                    </button>
                    <button className="icon-btn delete" onClick={() => onDelete(brand.id)} title="Delete">
                        <span className="material-icons-outlined">delete</span>
                    </button>
                </div>
            </div>

            {hasChildren && isExpanded && (
                <div className="brand-children">
                    {brand.children.map(child => (
                        <BrandItem 
                            key={child.id} 
                            brand={child} 
                            level={level + 1}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onDrop={onDrop}
                            onDragStart={onDragStart}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const Brands = ({ brands = [], parents = [] }) => {
    const [brandTree, setBrandTree] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentBrand, setCurrentBrand] = useState(null);
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        topLevel: 0
    });

    // Build tree structure from flat list
    const buildTree = (items) => {
        const map = {};
        const roots = [];
        
        // First pass: create map and initialize children array
        items.forEach(item => {
            map[item.id] = { ...item, children: [] };
        });

        // Second pass: link children to parents
        items.forEach(item => {
            if (item.parent_id && map[item.parent_id]) {
                map[item.parent_id].children.push(map[item.id]);
            } else {
                roots.push(map[item.id]);
            }
        });

        // Sort by order
        const sortRecursive = (nodes) => {
            nodes.sort((a, b) => a.order - b.order);
            nodes.forEach(node => {
                if (node.children.length > 0) {
                    sortRecursive(node.children);
                }
            });
        };
        
        sortRecursive(roots);
        return roots;
    };

    useEffect(() => {
        // Filter first if search term exists
        let filtered = brands;
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            filtered = brands.filter(b => 
                b.name.toLowerCase().includes(lowerTerm) ||
                (b.brand_code && b.brand_code.toLowerCase().includes(lowerTerm))
            );
            setBrandTree(filtered.map(b => ({...b, children: []}))); 
        } else {
            setBrandTree(buildTree(brands));
        }
        
        updateStats();
    }, [brands, searchTerm]);

    const updateStats = () => {
        const total = brands.length;
        const active = brands.filter(b => b.status === 'active').length;
        const topLevel = brands.filter(b => !b.parent_id).length;

        setStats({ total, active, topLevel });
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const openModal = (brand = null) => {
        setCurrentBrand(brand);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentBrand(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const data = {
            name: formData.get('name'),
            parent_id: formData.get('parent_id'),
            status: formData.get('status'),
            order: formData.get('order'),
        };

        if (currentBrand) {
            router.put(route('admin.brands.update', currentBrand.id), data, {
                onSuccess: () => closeModal(),
            });
        } else {
            router.post(route('admin.brands.store'), data, {
                onSuccess: () => closeModal(),
            });
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this brand?')) {
            router.delete(route('admin.brands.destroy', id));
        }
    };

    // Drag and Drop Handlers
    const handleDragStart = (e, id) => {
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDropOnRoot = (e) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('text/plain');
        if (draggedId) {
            // Move to root (parent_id = null)
            handleMoveBrand(draggedId, null);
        }
    };

    const handleMoveBrand = (draggedId, newParentId) => {
        // Find the dragged brand to get its current data
        const brand = brands.find(b => String(b.id) === String(draggedId));
        if (!brand) return;
        
        // Prevent moving to self or own child (circular reference check needed ideally)
        if (String(brand.parent_id) === String(newParentId)) return; // No change

        router.put(route('admin.brands.update', draggedId), {
            ...brand,
            parent_id: newParentId
        }, {
            preserveScroll: true,
            onSuccess: () => {
                // Optional: Show notification
            }
        });
    };
    
    const handleExport = () => {
        // Simple CSV export
        const headers = ['ID', 'Name', 'Code', 'Parent ID', 'Status', 'Order'];
        const csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n"
            + brands.map(e => [
                e.id, 
                `"${e.name}"`, 
                e.brand_code, 
                e.parent_id || '', 
                e.status, 
                e.order
            ].join(",")).join("\n");
            
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "brands_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <AdminLayout activeMenu="Inventory">
            <Head title="Brands - ZodicERP" />
            <div className="breadcrumb">
                <a href="#">Dashboard</a>
                <span>/</span>
                <a href="#">Inventory</a>
                <span>/</span>
                <span>Brands</span>
            </div>

            {/* Quick Stats */}
            <div className="stats-cards">
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--primary-color)' }}>
                        <span className="material-icons-outlined">branding_watermark</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">Total Brands</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--success-color)' }}>
                        <span className="material-icons-outlined">check_circle</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.active}</div>
                        <div className="stat-label">Active Brands</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--info-color)' }}>
                        <span className="material-icons-outlined">account_tree</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.topLevel}</div>
                        <div className="stat-label">Top Level Brands</div>
                    </div>
                </div>
            </div>

            {/* Main Card */}
            <div className="brands-card fade-in">
                <div className="card-header">
                    <div className="brands-actions">
                        <div className="search-bar light">
                            <input 
                                type="text" 
                                placeholder="Search brands..." 
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
                            <span>Add Brand</span>
                        </button>
                        <button className="btn btn-outline" onClick={handleExport}>
                            <span className="material-icons-outlined">download</span>
                            <span>Report</span>
                        </button>
                    </div>
                </div>

                <div 
                    className="tree-container" 
                    onDragOver={(e) => e.preventDefault()} 
                    onDrop={handleDropOnRoot}
                    style={{ minHeight: '200px', paddingBottom: '50px' }}
                >
                    {brandTree.length > 0 ? (
                        <div className="brand-tree">
                            {brandTree.map(brand => (
                                <BrandItem 
                                    key={brand.id} 
                                    brand={brand} 
                                    onEdit={openModal}
                                    onDelete={handleDelete}
                                    onDrop={handleMoveBrand}
                                    onDragStart={handleDragStart}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-4 text-gray-500">
                            {searchTerm ? 'No brands found matching your search.' : 'No brands found. Add one to get started.'}
                        </div>
                    )}
                </div>
            </div>


            {/* Modal */}
            <div className={`modal-overlay ${isModalOpen ? 'active' : ''}`} onClick={(e) => {
                if(e.target.className.includes('modal-overlay')) closeModal();
            }}>
                <div className="modal">
                    <div className="modal-header">
                        <div className="modal-title">{currentBrand ? 'Edit Brand' : 'Add New Brand'}</div>
                        <button className="modal-close" onClick={closeModal}>
                            <span className="material-icons-outlined">close</span>
                        </button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Brand Name</label>
                                <input 
                                    type="text" 
                                    name="name" 
                                    className="form-control" 
                                    defaultValue={currentBrand?.name}
                                    placeholder="e.g. Nike"
                                    required 
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Parent Brand</label>
                                <select 
                                    name="parent_id" 
                                    className="form-control" 
                                    defaultValue={currentBrand?.parent_id || ''}
                                >
                                    <option value="">None (Top Level)</option>
                                    {parents.map(parent => (
                                        // Prevent selecting self as parent
                                        (!currentBrand || parent.id !== currentBrand.id) && (
                                            <option key={parent.id} value={parent.id}>
                                                {parent.name}
                                            </option>
                                        )
                                    ))}
                                </select>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Order</label>
                                    <input 
                                        type="number" 
                                        name="order" 
                                        className="form-control" 
                                        defaultValue={currentBrand?.order || 0}
                                        min="0"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select 
                                        name="status" 
                                        className="form-control" 
                                        defaultValue={currentBrand?.status || 'active'}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
                            <button type="submit" className="btn btn-primary">
                                {currentBrand ? 'Update Brand' : 'Save Brand'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
};

export default Brands;
