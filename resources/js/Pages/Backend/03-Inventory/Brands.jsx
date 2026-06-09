import React, { useState, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import BlankPage from '@/Components/BlankPage';

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
        <div className="brand-node" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <div 
                className={`brand-content ${isDragOver ? 'drag-over' : ''}`}
                draggable
                onDragStart={(e) => onDragStart(e, brand.id)}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '12px 16px',
                    backgroundColor: isDragOver ? '#f8fafc' : 'transparent',
                    transition: 'all 0.2s'
                }}
            >
                <div className="brand-handle" style={{ color: '#94a3b8', cursor: 'grab', marginRight: '12px', display: 'flex' }}>
                    <span className="material-icons-outlined" style={{ fontSize: '20px' }}>drag_indicator</span>
                </div>
                
                <div 
                    className="brand-toggle" 
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={{ 
                        visibility: hasChildren ? 'visible' : 'hidden',
                        cursor: 'pointer',
                        color: '#64748b',
                        marginRight: '8px',
                        display: 'flex',
                        marginLeft: `${level * 24}px`
                    }}
                >
                    <span className="material-icons-outlined" style={{ fontSize: '20px' }}>
                        {isExpanded ? 'expand_more' : 'chevron_right'}
                    </span>
                </div>

                <div className="brand-info" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="brand-name" style={{ fontWeight: '500', color: '#1e293b' }}>{brand.name}</div>
                    {brand.brand_code && (
                        <span className="brand-code" style={{ 
                            fontSize: '12px', 
                            color: '#64748b', 
                            backgroundColor: '#f1f5f9', 
                            padding: '2px 8px', 
                            borderRadius: '4px' 
                        }}>{brand.brand_code}</span>
                    )}
                    <span className={`employee-status status-${brand.status}`} style={{ 
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        textTransform: 'capitalize',
                        fontWeight: '600',
                        backgroundColor: brand.status === 'active' ? '#ecfdf5' : '#fef2f2',
                        color: brand.status === 'active' ? '#059669' : '#dc2626'
                    }}>
                        {brand.status}
                    </span>
                </div>

                <div className="item-actions" style={{ display: 'flex', gap: '8px' }}>
                    <button 
                        className="btn-icon" 
                        onClick={() => onEdit(brand)} 
                        style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px' }}
                    >
                        <span className="material-icons-outlined" style={{ fontSize: '20px' }}>edit</span>
                    </button>
                    <button 
                        className="btn-icon" 
                        onClick={() => onDelete(brand.id)}
                        style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px' }}
                    >
                        <span className="material-icons-outlined" style={{ fontSize: '20px' }}>delete</span>
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
    const { props } = usePage();
    const { localization } = props;
    const isArabic = localization?.current_locale === 'ar';

    const getLocalizedRoute = (name, params = {}) => {
        return route(name, {
            country: localization?.country_code || 'sa',
            lang: localization?.current_locale || 'ar',
            ...params
        });
    };

    const [brandTree, setBrandTree] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
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
        
        items.forEach(item => {
            map[item.id] = { ...item, children: [] };
        });

        items.forEach(item => {
            if (item.parent_id && map[item.parent_id]) {
                map[item.parent_id].children.push(map[item.id]);
            } else {
                roots.push(map[item.id]);
            }
        });

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

    const handleAddEdit = (brand = null) => {
        setCurrentBrand(brand);
        setShowForm(true);
    };

    const handleCancel = () => {
        setShowForm(false);
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
            router.put(getLocalizedRoute('admin.inventory.brands.update', { brand: currentBrand.id }), data, {
                onSuccess: () => handleCancel(),
            });
        } else {
            router.post(getLocalizedRoute('admin.inventory.brands.store'), data, {
                onSuccess: () => handleCancel(),
            });
        }
    };

    const handleDelete = (id) => {
        if (window.confirm(isArabic ? 'هل أنت متأكد من حذف هذه الماركة؟' : 'Are you sure you want to delete this brand?')) {
            router.delete(getLocalizedRoute('admin.inventory.brands.destroy', { brand: id }));
        }
    };

    const handleDragStart = (e, id) => {
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDropOnRoot = (e) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('text/plain');
        if (draggedId) {
            handleMoveBrand(draggedId, null);
        }
    };

    const handleMoveBrand = (draggedId, newParentId) => {
        const brand = brands.find(b => String(b.id) === String(draggedId));
        if (!brand) return;
        if (String(brand.parent_id) === String(newParentId)) return;

        router.put(getLocalizedRoute('admin.inventory.brands.update', { brand: draggedId }), {
            ...brand,
            parent_id: newParentId
        }, {
            preserveScroll: true
        });
    };
    
    const handleExport = () => {
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

    const breadcrumbs = [
        { label: isArabic ? 'لوحة التحكم' : 'Dashboard', href: '#' },
        { label: isArabic ? 'المخزون' : 'Inventory', href: '#' },
        { label: isArabic ? 'الماركات' : 'Brands', active: true }
    ];

    const statsSection = (
        <div className="stats-cards">
            <div className="stat-card">
                <div className="stat-icon" style={{ backgroundColor: 'var(--info-color)' }}>
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
                <div className="stat-icon" style={{ backgroundColor: 'var(--primary-color)' }}>
                    <span className="material-icons-outlined">account_tree</span>
                </div>
                <div className="stat-content">
                    <div className="stat-value">{stats.topLevel}</div>
                    <div className="stat-label">Top Level</div>
                </div>
            </div>
        </div>
    );

    return (
        <AdminLayout activeMenu="Inventory">
            <Head title={isArabic ? 'الماركات - ZodicERP' : 'Brands - ZodicERP'} />
            
            {!showForm && (
                <BlankPage breadcrumbs={breadcrumbs} stats={statsSection}>
                    <div className="employees-card fade-in" style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                        <div className="card-header" style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                            <div className="header-left" style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '300px' }}>
                                <div className="search-bar light" style={{ position: 'relative', flex: 1 }}>
                                    <input 
                                        type="text" 
                                        className="form-control"
                                        style={{ paddingLeft: '40px', borderRadius: '8px', border: '1px solid #e2e8f0', height: '42px' }}
                                        placeholder={isArabic ? 'بحث الماركات...' : 'Search brands...'} 
                                        value={searchTerm}
                                        onChange={handleSearch}
                                    />
                                    <span className="material-icons-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>search</span>
                                </div>
                            </div>
                            <div className="header-right" style={{ display: 'flex', gap: '12px' }}>
                                <button className="btn btn-outline" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '42px' }}>
                                    <span className="material-icons-outlined">download</span>
                                    <span>{isArabic ? 'تقرير' : 'Report'}</span>
                                </button>
                                <button className="btn btn-primary" onClick={() => handleAddEdit()} style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '42px' }}>
                                    <span className="material-icons-outlined">add</span>
                                    <span>{isArabic ? 'إضافة ماركة' : 'Add Brand'}</span>
                                </button>
                            </div>
                        </div>

                        <div 
                            className="card-body" 
                            onDragOver={(e) => e.preventDefault()} 
                            onDrop={handleDropOnRoot}
                            style={{ minHeight: '300px', padding: '0' }}
                        >
                            {brandTree.length > 0 ? (
                                <div className="brand-tree">
                                    {brandTree.map(brand => (
                                        <BrandItem 
                                            key={brand.id} 
                                            brand={brand} 
                                            onEdit={handleAddEdit}
                                            onDelete={handleDelete}
                                            onDrop={handleMoveBrand}
                                            onDragStart={handleDragStart}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }}>inventory_2</span>
                                    <p>{searchTerm ? (isArabic ? 'لا توجد ماركات تطابق بحثك.' : 'No brands found matching your search.') : (isArabic ? 'لا توجد ماركات. أضف واحدة للبدء.' : 'No brands found. Add one to get started.')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </BlankPage>
            )}

            {showForm && (
                <div className="employees-card fade-in" style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', maxWidth: '800px', margin: '24px auto' }}>
                    <div className="card-header" style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>{currentBrand ? (isArabic ? 'تعديل الماركة' : 'Edit Brand') : (isArabic ? 'إضافة ماركة جديدة' : 'Add New Brand')}</h3>
                        <button className="btn btn-outline" onClick={handleCancel} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="material-icons-outlined">arrow_back</span>
                            <span>{isArabic ? 'العودة للقائمة' : 'Back to List'}</span>
                        </button>
                    </div>
                    <div className="card-body" style={{ padding: '24px' }}>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>{isArabic ? 'اسم الماركة' : 'Brand Name'} *</label>
                                <input 
                                    type="text" 
                                    name="name" 
                                    className="form-control" 
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                    defaultValue={currentBrand?.name}
                                    placeholder="e.g. Nike"
                                    required 
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>{isArabic ? 'الماركة الأب' : 'Parent Brand'}</label>
                                <select 
                                    name="parent_id" 
                                    className="form-control" 
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                    defaultValue={currentBrand?.parent_id || ''}
                                >
                                    <option value="">{isArabic ? 'بدون (مستوى أعلى)' : 'None (Top Level)'}</option>
                                    {parents.map(parent => (
                                        (!currentBrand || parent.id !== currentBrand.id) && (
                                            <option key={parent.id} value={parent.id}>
                                                {parent.name}
                                            </option>
                                        )
                                    ))}
                                </select>
                            </div>

                            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                                <div className="form-group">
                                    <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>{isArabic ? 'الترتيب' : 'Order'}</label>
                                    <input 
                                        type="number" 
                                        name="order" 
                                        className="form-control" 
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                        defaultValue={currentBrand?.order || 0}
                                        min="0"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>{isArabic ? 'الحالة' : 'Status'}</label>
                                    <select 
                                        name="status" 
                                        className="form-control" 
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                        defaultValue={currentBrand?.status || 'active'}
                                    >
                                        <option value="active">{isArabic ? 'نشط' : 'Active'}</option>
                                        <option value="inactive">{isArabic ? 'غير نشط' : 'Inactive'}</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '24px', borderTop: '1px solid #f1f5f9' }}>
                                <button type="button" className="btn btn-secondary" onClick={handleCancel}>{isArabic ? 'إلغاء' : 'Cancel'}</button>
                                <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px' }}>
                                    {currentBrand ? (isArabic ? 'تحديث الماركة' : 'Update Brand') : (isArabic ? 'حفظ الماركة' : 'Save Brand')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default Brands;
