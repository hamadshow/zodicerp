import React, { useState, useEffect, useMemo } from 'react';
import { Head, Link, router, usePage, useForm } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import MediaPickerModal from '../Media/MediaPickerModal';
import '../../../../css/backend/Products.scss';

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

const ProductsList = ({ products, brands, categories, filters = {} }) => {
    const { flash } = usePage().props;
    const safeProducts = products || { data: [], total: 0, from: 0, to: 0, links: [] };
    const safeBrands = Array.isArray(brands) ? brands : [];
    const safeCategories = Array.isArray(categories) ? categories : [];
    
    // Filter States
    const [filterParams, setFilterParams] = useState({
        search: filters.search || '',
        status: filters.status || '',
        brand_id: filters.brand_id || '',
        category_id: filters.category_id || '',
    });

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilterParams(prev => ({ ...prev, [name]: value }));
    };

    const applyFilters = () => {
        router.get(route('admin.products.index'), filterParams, { preserveState: true });
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            router.delete(route('admin.products.destroy', id));
        }
    };

    return (
        <AdminLayout activeMenu="Inventory">
            <Head title="Products" />
            
            <div className="products-page">
                <div className="content-area">
                <div className="page-header-section">
                    <div className="breadcrumb">
                        <Link href={route('admin')}>Dashboard</Link>
                        <span>/</span>
                        <span>Inventory</span>
                        <span>/</span>
                        <span className="current">Products</span>
                    </div>
                    <h1 className="page-title">Products</h1>
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
                            <div className="stat-value">{safeProducts.total}</div>
                            <div className="stat-label">Total Products</div>
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
                            <span className="material-icons-outlined">branding_watermark</span>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{safeBrands.length}</div>
                            <div className="stat-label">Total Brands</div>
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
                        <h3>Products List</h3>
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
                            <Link className="btn btn-primary" href="/admin/products/create">
                                <span className="material-icons-outlined">add</span>
                                Add Product
                            </Link>
                        </div>
                    </div>

                    <div className="filter-bar">
                        <select name="category_id" className="form-control filter-select" value={filterParams.category_id} onChange={handleFilterChange}>
                            <option value="">All Categories</option>
                            {safeCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <select name="brand_id" className="form-control filter-select" value={filterParams.brand_id} onChange={handleFilterChange}>
                            <option value="">All Brands</option>
                            {safeBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                        <select name="status" className="form-control filter-select" value={filterParams.status} onChange={handleFilterChange}>
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="draft">Draft</option>
                        </select>
                        <button className="btn btn-outline" onClick={applyFilters}>Filter</button>
                    </div>

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>SKU</th>
                                    <th>Category</th>
                                    <th>Brand</th>
                                    <th>Price</th>
                                    <th>Stock</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {safeProducts.data.length > 0 ? (
                                    safeProducts.data.map(product => (
                                        <tr key={product.id}>
                                            <td>
                                                <div className="product-cell">
                                                    {product.image ? (
                                                        <img src={`/media-files/${product.image}`} alt={product.name} className="product-thumb" />
                                                    ) : (
                                                        <div className="product-thumb-placeholder">
                                                            <span className="material-icons-outlined text-gray-light">image</span>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-semibold">{product.name}</div>
                                                        <small className="text-gray-medium">{product.product_code}</small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{product.sku || '-'}</td>
                                            <td>{product.category?.name || '-'}</td>
                                            <td>{product.brand?.name || '-'}</td>
                                            <td>${product.price || '0.00'}</td>
                                            <td>
                                                <span className={`status-badge ${product.quantity > 0 ? 'status-active' : 'status-error'}`}>
                                                    {product.quantity}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`status-badge status-${product.status}`}>
                                                    {product.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="actions-cell">
                                                    <button
                                                        className="icon-btn edit"
                                                        onClick={() => router.get(`/admin/products/${product.id}/edit`)}
                                                        title="Edit"
                                                    >
                                                        <span className="material-icons-outlined">edit</span>
                                                    </button>
                                                    <button className="icon-btn delete" onClick={() => handleDelete(product.id)} title="Delete">
                                                        <span className="material-icons-outlined">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="empty-state">No products found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {safeProducts.links && (
                        <div className="pagination">
                            <div className="pagination-info">
                                Showing {safeProducts.from} to {safeProducts.to} of {safeProducts.total} results
                            </div>
                            <div className="pagination-controls">
                                {safeProducts.links.map((link, i) => (
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

const ProductsForm = ({ product, categories, brands }) => {
    const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
    const [mediaPickerMode, setMediaPickerMode] = useState('single');

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        name: '',
        parent_id: '',
        status: 'active',
        order: 0,
        description: '',
        content: '',
        sku: '',
        barcode: '',
        brand_id: '',
        category_id: '',
        category_ids: [],
        product_type: 'simple',
        is_featured: false,
        
        // Pricing
        price: '',
        sale_price: '',
        cost_per_item: '',
        tax_id: '',
        price_includes_tax: false,
        
        // Inventory
        quantity: 0,
        stock_status: 'in_stock',
        allow_checkout_when_out_of_stock: false,
        with_storehouse_management: false,
        minimum_order_quantity: 1,
        maximum_order_quantity: '',
        
        // Shipping
        weight: '',
        length: '',
        wide: '',
        height: '',
        
        // SEO
        meta_title: '',
        meta_description: '',
        
        // Media
        image: null,
        gallery: [],
        existing_images: [],
        delete_image: false,
    });

    const [permalink, setPermalink] = useState('');
    const [showContentEditor, setShowContentEditor] = useState(true);
    const [showSeoMeta, setShowSeoMeta] = useState(false);
    const [specTable, setSpecTable] = useState('none');
    const [store, setStore] = useState('');
    const [categorySearch, setCategorySearch] = useState('');
    const [taxOption, setTaxOption] = useState('none');
    void showSeoMeta;
    void setShowSeoMeta;
    void specTable;
    void setSpecTable;
    void store;
    void setStore;
    void setCategorySearch;
    void taxOption;
    void setTaxOption;

    const categoryTree = useMemo(() => {
        if (!categories) return [];
        const map = {};
        const roots = [];
        // Create a deep copy to avoid mutating props directly if needed, 
        // though mapping usually creates new objects.
        const cats = categories.map(c => ({ ...c, children: [] }));
        
        cats.forEach(c => map[c.id] = c);
        
        cats.forEach(c => {
            if (c.parent_id && map[c.parent_id]) {
                map[c.parent_id].children.push(c);
            } else {
                roots.push(c);
            }
        });
        
        return roots;
    }, [categories]);

    const handleCategoryToggle = (id) => {
        const currentIds = Array.isArray(data.category_ids) ? data.category_ids : [];
        const newIds = currentIds.includes(id)
            ? currentIds.filter(cId => cId !== id)
            : [...currentIds, id];
        setData('category_ids', newIds);
    };

    useEffect(() => {
        clearErrors();
        if (product) {
            const initialCategoryIds =
                product.categories && Array.isArray(product.categories) && product.categories.length > 0
                    ? product.categories.map(c => String(c.id))
                    : product.category_id
                        ? [String(product.category_id)]
                        : [];

            setData({
                ...data,
                ...product,
                name: product.name || '',
                parent_id: product.parent_id || '',
                description: product.description || '',
                content: product.content || '',
                brand_id: product.brand_id || '',
                category_id: product.category_id || '',
                category_ids: initialCategoryIds,
                sku: product.sku || '',
                barcode: product.barcode || '',
                status: product.status || 'active',
                stock_status: product.stock_status || 'in_stock',
                product_type: product.product_type || 'simple',
                quantity: Number.isFinite(Number(product.quantity)) ? Number(product.quantity) : 0,
                minimum_order_quantity: Number.isFinite(Number(product.minimum_order_quantity)) ? Number(product.minimum_order_quantity) : 1,
                maximum_order_quantity: product.maximum_order_quantity || '',
                is_featured: Boolean(product.is_featured),
                price: product.price || '',
                sale_price: product.sale_price || '',
                cost_per_item: product.cost_per_item || '',
                tax_id: product.tax_id || '',
                price_includes_tax: Boolean(product.price_includes_tax),
                allow_checkout_when_out_of_stock: Boolean(product.allow_checkout_when_out_of_stock),
                with_storehouse_management: Boolean(product.with_storehouse_management),
                weight: product.weight || '',
                length: product.length || '',
                wide: product.wide || '',
                height: product.height || '',
                meta_title: product.meta_title || '',
                meta_description: product.meta_description || '',
                existing_images: product.images || [],
                delete_image: false,
                image: product.image || null,
                gallery: [],
            });
        } else {
            reset();
        }
    }, [product]);

    const normalizeMediaPath = (path) => {
        if (!path) return '';
        const withoutProtocol = path.replace(/^https?:\/\/[^/]+/, '');
        return withoutProtocol.replace(/^\/?(files|storage|media-files)\//, '');
    };

    const getMainImageUrl = () => {
        if (data.image instanceof File) {
            return URL.createObjectURL(data.image);
        }

        const basePath =
            (typeof data.image === 'string' && data.image) ||
            (!data.delete_image && product && product.image) ||
            '';

        if (!basePath) {
            return '';
        }

        const relativePath = normalizeMediaPath(basePath);
        return `/media-files/${relativePath}`;
    };

    const openMediaPicker = (mode) => {
        setMediaPickerMode(mode);
        setIsMediaPickerOpen(true);
    };

    const handleMediaSelect = (selected) => {
        if (mediaPickerMode === 'single') {
            const item = Array.isArray(selected) ? selected[0] : selected;
            if (item && item.file_path) {
                setData('image', normalizeMediaPath(item.file_path));
            }
        } else {
            const items = Array.isArray(selected) ? selected : [selected];
            const newPaths = items
                .map(item => (item && item.file_path ? normalizeMediaPath(item.file_path) : ''))
                .filter(Boolean);
            if (newPaths.length > 0) {
                setData('gallery', [...data.gallery, ...newPaths]);
            }
        }
    };

    const submitWithAction = (action) => {
        const options = {
            forceFormData: true,
            transform: (data) => ({
                ...data,
                save_action: action,
                // Convert booleans to 1/0 for FormData consistency
                is_featured: data.is_featured ? 1 : 0,
                price_includes_tax: data.price_includes_tax ? 1 : 0,
                allow_checkout_when_out_of_stock: data.allow_checkout_when_out_of_stock ? 1 : 0,
                with_storehouse_management: data.with_storehouse_management ? 1 : 0,
                delete_image: data.delete_image ? 1 : 0,
                
                // Convert empty strings to null for numeric fields
                price: data.price === '' ? null : data.price,
                sale_price: data.sale_price === '' ? null : data.sale_price,
                cost_per_item: data.cost_per_item === '' ? null : data.cost_per_item,
                quantity: data.quantity === '' ? null : data.quantity,
                minimum_order_quantity: data.minimum_order_quantity === '' ? null : data.minimum_order_quantity,
                maximum_order_quantity: data.maximum_order_quantity === '' ? null : data.maximum_order_quantity,
                weight: data.weight === '' ? null : data.weight,
                length: data.length === '' ? null : data.length,
                wide: data.wide === '' ? null : data.wide,
                height: data.height === '' ? null : data.height,
                tax_id: data.tax_id === '' ? null : data.tax_id,
                brand_id: data.brand_id === '' ? null : data.brand_id,
                category_id: data.category_id === '' ? null : data.category_id,
                parent_id: data.parent_id === '' ? null : data.parent_id,
                store_id: data.store_id === '' ? null : data.store_id,
                order: data.order === '' ? 0 : data.order,
            }),
        };

        if (product) {
            post(route('admin.products.update', product.id), options);
        } else {
            post(route('admin.products.store'), options);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        submitWithAction('save');
    };

    const pageTitle = product ? 'Edit Product' : 'Add New Product';

    return (
        <AdminLayout activeMenu="Inventory">
            <Head title={`${pageTitle} - ZodicERP`} />
            <div className="products-ce-page">
                <div className="breadcrumb">
                    <Link href={route('admin')}>Dashboard</Link>
                    <span>/</span>
                    <span>Inventory</span>
                    <span>/</span>
                    <Link href={route('admin.products.index')}>
                        Products
                    </Link>
                    <span>/</span>
                    <span>{pageTitle}</span>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="products-ce-card">
                        <div className="products-ce-header">
                            <h3 className="products-ce-title">{pageTitle}</h3>
                            <div className="products-ce-actions">
                                <button
                                    type="button"
                                    className="btn btn-outline-danger"
                                    onClick={() => router.visit(route('admin.products.index'))}
                                >
                                    Back to List
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-secondary"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        submitWithAction('save_and_exit');
                                    }}
                                    disabled={processing}
                                >
                                    Save & Exit
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={processing}
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="products-ce-body">
                        <div className="products-layout">
                            <div className="products-main">
                                <div className="products-section-card">
                                    <div className="products-section-header">
                                        <h4 className="products-section-title">Basic Info</h4>
                                    </div>
                                    <div className="products-section-content">
                                        <div className="form-group">
                                            <label className="form-label">Name *</label>
                                            <textarea
                                                className={`form-control ${errors.name ? 'border-red-500' : ''}`}
                                                value={data.name}
                                                onChange={e => setData('name', e.target.value)}
                                                required
                                                rows="2"
                                                placeholder="Product Name"
                                            ></textarea>
                                            {errors.name && <div className="text-error">{errors.name}</div>}
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Simple Description</label>
                                            <textarea
                                                className="form-control form-textarea rich-textarea"
                                                rows="3"
                                                value={data.description}
                                                onChange={e => setData('description', e.target.value)}
                                                placeholder="Short description displayed before price"
                                            ></textarea>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Permalink</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={permalink}
                                                onChange={e => setPermalink(e.target.value)}
                                                placeholder="product-slug"
                                            />
                                            <div className="permalink-preview">
                                                <span className="permalink-base">https://yourstore.com/products/</span>
                                                <span className="permalink-slug">
                                                    {permalink || 'your-product-slug'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="products-section-card">
                                    <div className="products-section-header">
                                        <h4 className="products-section-title">Detailed Description</h4>
                                        <div className="products-section-actions">
                                            <button
                                                type="button"
                                                className="btn btn-outline-secondary"
                                                onClick={() => setShowContentEditor(value => !value)}
                                            >
                                                {showContentEditor ? 'Hide Editor' : 'Show Editor'}
                                            </button>
                                            <button type="button" className="btn btn-outline-secondary">
                                                Add media
                                            </button>
                                            <button type="button" className="btn btn-outline-secondary">
                                                UI Blocks
                                            </button>
                                        </div>
                                    </div>
                                    <div className="products-section-content">
                                        {showContentEditor && (
                                            <textarea
                                                className="form-control form-textarea rich-textarea"
                                                rows="5"
                                                value={data.content}
                                                onChange={e => setData('content', e.target.value)}
                                            ></textarea>
                                        )}
                                    </div>
                                </div>

                                <div className="products-section-card">
                                    <div className="products-section-header">
                                        <h4 className="products-section-title">Images</h4>
                                    </div>
                                    <div className="products-section-content">
                                        <div className="form-group">
                                            <div
                                                className="image-upload-area"
                                                onClick={() => openMediaPicker('single')}
                                            >
                                                {getMainImageUrl() ? (
                                                    <div className="image-preview-full-container" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                                        <img
                                                            src={getMainImageUrl()}
                                                            alt="Main Product"
                                                            style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }}
                                                        />
                                                        <button
                                                            type="button"
                                                            className="gallery-remove-btn"
                                                            style={{ top: '10px', right: '10px' }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setData(d => ({ ...d, image: null, delete_image: true }));
                                                            }}
                                                            title="Remove Image"
                                                        >
                                                            &times;
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="material-icons-outlined image-upload-icon">add_photo_alternate</span>
                                                        <div>
                                                            <div className="image-upload-title">Click to set Main Image</div>
                                                            <div className="image-upload-subtitle">Drag & drop or choose from media.</div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Gallery Images</label>
                                            <div className="d-flex gap-2 mb-4">
                                                <button type="button" className="btn btn-outline" onClick={() => openMediaPicker('multiple')}>
                                                    Add from Media
                                                </button>
                                                <div className="relative overflow-hidden inline-block">
                                                    <button type="button" className="btn btn-outline">Upload New</button>
                                                    <input
                                                        type="file"
                                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                        multiple
                                                        onChange={(e) => {
                                                            const files = Array.from(e.target.files);
                                                            setData('gallery', [...data.gallery, ...files]);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="gallery-grid">
                                                {/* Display Existing Gallery Images */}
                                                {data.existing_images && data.existing_images.map((img, index) => (
                                                    <div key={`existing-${index}`} className="gallery-item">
                                                        <img src={`/media-files/${img}`} alt={`Gallery ${index}`} />
                                                        <button
                                                            type="button"
                                                            className="gallery-remove-btn"
                                                            onClick={() => {
                                                                const newExisting = data.existing_images.filter((_, i) => i !== index);
                                                                setData('existing_images', newExisting);
                                                            }}
                                                        >
                                                            &times;
                                                        </button>
                                                    </div>
                                                ))}
                                                
                                                {/* Display New Gallery Images/Paths */}
                                                {data.gallery && data.gallery.map((item, index) => {
                                                    let src = '';
                                                    if (typeof item === 'string') {
                                                        src = `/media-files/${item}`;
                                                    } else if (item instanceof File) {
                                                        src = URL.createObjectURL(item);
                                                    }
                                                    
                                                    return (
                                                        <div key={`new-${index}`} className="gallery-item">
                                                            <img src={src} alt={`New Gallery ${index}`} />
                                                            <button
                                                                type="button"
                                                                className="gallery-remove-btn"
                                                                onClick={() => {
                                                                    const newGallery = data.gallery.filter((_, i) => i !== index);
                                                                    setData('gallery', newGallery);
                                                                }}
                                                            >
                                                                &times;
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="products-section-card">
                                    <div className="products-section-header">
                                        <h4 className="products-section-title">Pricing</h4>
                                    </div>
                                    <div className="products-section-content">
                                        <div className="form-row">
                                            <div className="form-group half">
                                                <label className="form-label">Price</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    placeholder="$ 0.00"
                                                    value={data.price}
                                                    onChange={e => setData('price', e.target.value)}
                                                />
                                            </div>
                                            <div className="form-group half">
                                                <label className="form-label">Sale Price</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    placeholder="$ 0.00"
                                                    value={data.sale_price}
                                                    onChange={e => setData('sale_price', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group half">
                                                <label className="form-label">Cost per item</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    placeholder="$ 0.00"
                                                    value={data.cost_per_item}
                                                    onChange={e => setData('cost_per_item', e.target.value)}
                                                />
                                                <small className="text-gray-medium">Customers won't see this</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="products-section-card">
                                    <div className="products-section-header">
                                        <h4 className="products-section-title">Inventory</h4>
                                    </div>
                                    <div className="products-section-content">
                                        <div className="form-row">
                                            <div className="form-group half">
                                                <label className="form-label">SKU (Stock Keeping Unit)</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={data.sku}
                                                    onChange={e => setData('sku', e.target.value)}
                                                />
                                            </div>
                                            <div className="form-group half">
                                                <label className="form-label">Barcode (ISBN, UPC, GTIN, etc.)</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={data.barcode}
                                                    onChange={e => setData('barcode', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="checkbox-option">
                                                <input
                                                    type="checkbox"
                                                    checked={data.with_storehouse_management}
                                                    onChange={e => setData('with_storehouse_management', e.target.checked)}
                                                />
                                                <span>Track inventory</span>
                                            </label>
                                        </div>
                                        {data.with_storehouse_management && (
                                            <div className="form-row">
                                                <div className="form-group half">
                                                    <label className="form-label">Quantity</label>
                                                    <input
                                                        type="number"
                                                        className="form-control"
                                                        value={data.quantity}
                                                        onChange={e => setData('quantity', e.target.value)}
                                                    />
                                                </div>
                                                <div className="form-group half">
                                                    <label className="form-label">Stock Status</label>
                                                    <select
                                                        className="form-control"
                                                        value={data.stock_status}
                                                        onChange={e => setData('stock_status', e.target.value)}
                                                    >
                                                        <option value="in_stock">In Stock</option>
                                                        <option value="out_of_stock">Out of Stock</option>
                                                        <option value="on_backorder">On Backorder</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="products-section-card">
                                    <div className="products-section-header">
                                        <h4 className="products-section-title">Shipping</h4>
                                    </div>
                                    <div className="products-section-content">
                                        <div className="form-group">
                                            <label className="form-label">Weight (kg)</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={data.weight}
                                                onChange={e => setData('weight', e.target.value)}
                                            />
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group third">
                                                <label className="form-label">Length (cm)</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={data.length}
                                                    onChange={e => setData('length', e.target.value)}
                                                />
                                            </div>
                                            <div className="form-group third">
                                                <label className="form-label">Wide (cm)</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={data.wide}
                                                    onChange={e => setData('wide', e.target.value)}
                                                />
                                            </div>
                                            <div className="form-group third">
                                                <label className="form-label">Height (cm)</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={data.height}
                                                    onChange={e => setData('height', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="products-sidebar">
                                <div className="products-section-card">
                                    <div className="products-section-header">
                                        <h4 className="products-section-title">Publish</h4>
                                    </div>
                                    <div className="products-section-content">
                                        <div className="form-group">
                                            <label className="form-label">Status</label>
                                            <select
                                                className="form-control"
                                                value={data.status}
                                                onChange={e => setData('status', e.target.value)}
                                            >
                                                <option value="active">Published</option>
                                                <option value="draft">Draft</option>
                                                <option value="pending">Pending</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="checkbox-option">
                                                <input
                                                    type="checkbox"
                                                    checked={data.is_featured}
                                                    onChange={e => setData('is_featured', e.target.checked)}
                                                />
                                                <span>Is Featured?</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="products-section-card">
                                    <div className="products-section-header">
                                        <h4 className="products-section-title">Organization</h4>
                                    </div>
                                    <div className="products-section-content">
                                        <div className="form-group">
                                            <label className="form-label">Brand</label>
                                            <select
                                                className="form-control"
                                                value={data.brand_id}
                                                onChange={e => setData('brand_id', e.target.value)}
                                            >
                                                <option value="">Select Brand</option>
                                                {brands && brands.map(b => (
                                                    <option key={b.id} value={b.id}>{b.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div className="form-group">
                                            <label className="form-label">Categories</label>
                                            <div className="category-tree-container">
                                                {categoryTree.map(category => (
                                                    <CategoryTreeItem
                                                        key={category.id}
                                                        category={category}
                                                        selectedIds={Array.isArray(data.category_ids) ? data.category_ids : []}
                                                        onToggle={handleCategoryToggle}
                                                        search={categorySearch}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Product Collections</label>
                                            <input type="text" className="form-control" placeholder="Search collections..." />
                                        </div>
                                        
                                        <div className="form-group">
                                            <label className="form-label">Labels</label>
                                            <input type="text" className="form-control" placeholder="Search labels..." />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>

                <MediaPickerModal
                    isOpen={isMediaPickerOpen}
                    onClose={() => setIsMediaPickerOpen(false)}
                    onSelect={handleMediaSelect}
                    multiple={mediaPickerMode !== 'single'}
                    allowedTypes={['image']}
                />
            </div>
        </AdminLayout>
    );
};

// ==========================================
// Main Component
// ==========================================

const Products = (props) => {
    const { url } = usePage();
    const path = url?.split('?')[0] || '';
    const isCreate = path.endsWith('/admin/products/create') || path.endsWith('/admin/products/create/');
    const isEdit = /\/admin\/products\/\d+\/edit\/?$/.test(path);
    const hasProducts = Boolean(props?.products);

    if (isCreate || isEdit || !hasProducts) {
        return <ProductsForm {...props} />;
    }

    return <ProductsList {...props} />;
};

export default Products;
