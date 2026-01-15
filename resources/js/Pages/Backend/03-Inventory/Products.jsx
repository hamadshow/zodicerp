import React, { useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import MediaPickerModal from '../Media/MediaPickerModal';
import '../../../../css/backend/Products.css';

const Products = ({ products, brands, categories, filters }) => {
    const { flash } = usePage().props;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);
    const [activeTab, setActiveTab] = useState('General');
    
    // Media Picker State
    const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
    const [mediaPickerMode, setMediaPickerMode] = useState('single'); // 'single' or 'multiple'

    const openMediaPicker = (mode) => {
        setMediaPickerMode(mode);
        setIsMediaPickerOpen(true);
    };

    const handleMediaSelect = (selected) => {
        const processPath = (path) => {
            // Remove /storage/ prefix if present to store relative path
            return path ? path.replace(/^\/storage\//, '') : '';
        };

        if (mediaPickerMode === 'single') {
            // selected is one item object {id, file_path, ...}
            setData('image', processPath(selected.file_path));
        } else {
            // selected is array of objects
            const newPaths = selected.map(item => processPath(item.file_path));
            setData('gallery', [...data.gallery, ...newPaths]);
        }
    };

    // Filter States
    const [filterParams, setFilterParams] = useState({
        search: filters.search || '',
        status: filters.status || '',
        brand_id: filters.brand_id || '',
        category_id: filters.category_id || '',
    });

    // Form Handling
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

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilterParams(prev => ({ ...prev, [name]: value }));
    };

    const applyFilters = () => {
        router.get(route('admin.products.index'), filterParams, { preserveState: true });
    };

    const openModal = (product = null) => {
        setCurrentProduct(product);
        clearErrors();
        setActiveTab('General');
        
        if (product) {
            setData({
                ...data,
                ...product,
                parent_id: product.parent_id || '',
                brand_id: product.brand_id || '',
                category_id: product.category_id || '',
                sku: product.sku || '',
                barcode: product.barcode || '',
                status: product.status || 'active',
                stock_status: product.stock_status || 'in_stock',
                product_type: product.product_type || 'simple',
                quantity: Number.isFinite(Number(product.quantity)) ? Number(product.quantity) : 0,
                minimum_order_quantity: Number.isFinite(Number(product.minimum_order_quantity)) ? Number(product.minimum_order_quantity) : 1,
                is_featured: Boolean(product.is_featured),
                price_includes_tax: Boolean(product.price_includes_tax),
                allow_checkout_when_out_of_stock: Boolean(product.allow_checkout_when_out_of_stock),
                with_storehouse_management: Boolean(product.with_storehouse_management),
                existing_images: product.images || [],
                delete_image: false,
                image: product.image || null,
                gallery: [],
            });
        } else {
            reset();
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentProduct(null);
        reset();
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (currentProduct) {
            post(route('admin.products.update', currentProduct.id), {
                onSuccess: () => closeModal(),
                forceFormData: true,
                transform: (data) => ({
                    ...data,
                    // Convert booleans to 1/0 for FormData consistency
                    is_featured: data.is_featured ? 1 : 0,
                    price_includes_tax: data.price_includes_tax ? 1 : 0,
                    allow_checkout_when_out_of_stock: data.allow_checkout_when_out_of_stock ? 1 : 0,
                    with_storehouse_management: data.with_storehouse_management ? 1 : 0,
                    delete_image: data.delete_image ? 1 : 0,
                }),
            });
        } else {
            post(route('admin.products.store'), {
                onSuccess: () => closeModal(),
                forceFormData: true,
                transform: (data) => ({
                    ...data,
                    // Convert booleans to 1/0
                    is_featured: data.is_featured ? 1 : 0,
                    price_includes_tax: data.price_includes_tax ? 1 : 0,
                    allow_checkout_when_out_of_stock: data.allow_checkout_when_out_of_stock ? 1 : 0,
                    with_storehouse_management: data.with_storehouse_management ? 1 : 0,
                }),
            });
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            router.delete(route('admin.products.destroy', id));
        }
    };

    // Render Tabs
    const renderTabs = () => (
        <div className="filter-tabs">
            {['General', 'Pricing', 'Inventory', 'Media', 'Shipping', 'SEO'].map(tab => (
                <div
                    key={tab}
                    className={`filter-tab ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                >
                    {tab}
                </div>
            ))}
        </div>
    );

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
                            <div className="stat-value">{products.total}</div>
                            <div className="stat-label">Total Products</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon green-gradient">
                            <span className="material-icons-outlined">category</span>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{categories.length}</div>
                            <div className="stat-label">Total Categories</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon indigo-gradient">
                            <span className="material-icons-outlined">branding_watermark</span>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{brands.length}</div>
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
                            <button className="btn btn-primary" onClick={() => openModal()}>
                                <span className="material-icons-outlined">add</span>
                                Add Product
                            </button>
                        </div>
                    </div>

                    <div className="filter-bar">
                        <select name="category_id" className="form-control filter-select" value={filterParams.category_id} onChange={handleFilterChange}>
                            <option value="">All Categories</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <select name="brand_id" className="form-control filter-select" value={filterParams.brand_id} onChange={handleFilterChange}>
                            <option value="">All Brands</option>
                            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
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
                                {products.data.length > 0 ? (
                                    products.data.map(product => (
                                        <tr key={product.id}>
                                            <td>
                                                <div className="product-cell">
                                                    {product.image ? (
                                                        <img src={`/storage/${product.image}`} alt={product.name} className="product-thumb" />
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
                                                    <button className="icon-btn edit" onClick={() => openModal(product)} title="Edit">
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
                    {products.links && (
                        <div className="pagination">
                            <div className="pagination-info">
                                Showing {products.from} to {products.to} of {products.total} results
                            </div>
                            <div className="pagination-controls">
                                {products.links.map((link, i) => (
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

            {/* Modal */}
            <div className={`modal-overlay ${isModalOpen ? 'active' : ''}`}>
                <div className="modal">
                    <div className="modal-header">
                        <h3 className="modal-title">{currentProduct ? 'Edit Product' : 'Add New Product'}</h3>
                        <button className="modal-close" onClick={closeModal}>
                            <span className="material-icons-outlined">close</span>
                        </button>
                    </div>
                    
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            {renderTabs()}

                            {activeTab === 'General' && (
                                <>
                                    <div className="form-group">
                                        <label className="form-label">Product Name *</label>
                                        <input 
                                            type="text" 
                                            className={`form-control ${errors.name ? 'border-red-500' : ''}`}
                                            value={data.name} 
                                            onChange={e => setData('name', e.target.value)} 
                                            required 
                                        />
                                        {errors.name && <div className="text-error">{errors.name}</div>}
                                    </div>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">SKU</label>
                                            <input type="text" className="form-control" value={data.sku} onChange={e => setData('sku', e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Barcode</label>
                                            <input type="text" className="form-control" value={data.barcode} onChange={e => setData('barcode', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">Category</label>
                                            <select className="form-control" value={data.category_id} onChange={e => setData('category_id', e.target.value)}>
                                                <option value="">Select Category</option>
                                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Brand</label>
                                            <select className="form-control" value={data.brand_id} onChange={e => setData('brand_id', e.target.value)}>
                                                <option value="">Select Brand</option>
                                                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Description</label>
                                        <textarea className="form-control form-textarea" rows="3" value={data.description} onChange={e => setData('description', e.target.value)}></textarea>
                                    </div>
                                </>
                            )}

                            {activeTab === 'Pricing' && (
                                <>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">Price *</label>
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                className={`form-control ${errors.price ? 'border-red-500' : ''}`}
                                                value={data.price} 
                                                onChange={e => setData('price', e.target.value)} 
                                                required 
                                            />
                                            {errors.price && <div className="text-error">{errors.price}</div>}
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Sale Price</label>
                                            <input type="number" step="0.01" className="form-control" value={data.sale_price} onChange={e => setData('sale_price', e.target.value)} />
                                            {errors.sale_price && <div className="text-error">{errors.sale_price}</div>}
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Cost Per Item</label>
                                        <input type="number" step="0.01" className="form-control" value={data.cost_per_item} onChange={e => setData('cost_per_item', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-checkbox-label">
                                            <input type="checkbox" checked={data.price_includes_tax} onChange={e => setData('price_includes_tax', e.target.checked)} />
                                            <span className="form-label form-checkbox-text">Price includes tax</span>
                                        </label>
                                    </div>
                                </>
                            )}

                            {activeTab === 'Inventory' && (
                                <>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">Quantity</label>
                                            <input type="number" className="form-control" value={data.quantity} onChange={e => setData('quantity', e.target.value)} />
                                            {errors.quantity && <div className="text-error">{errors.quantity}</div>}
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Stock Status</label>
                                            <select className="form-control" value={data.stock_status} onChange={e => setData('stock_status', e.target.value)}>
                                                <option value="in_stock">In Stock</option>
                                                <option value="out_of_stock">Out of Stock</option>
                                                <option value="on_backorder">On Backorder</option>
                                            </select>
                                            {errors.stock_status && <div className="text-error">{errors.stock_status}</div>}
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Minimum Order Qty</label>
                                        <input type="number" className="form-control" value={data.minimum_order_quantity} onChange={e => setData('minimum_order_quantity', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-checkbox-label">
                                            <input type="checkbox" checked={data.is_featured} onChange={e => setData('is_featured', e.target.checked)} />
                                            <span className="form-label form-checkbox-text">Is Featured?</span>
                                        </label>
                                    </div>
                                </>
                            )}

                            {activeTab === 'Media' && (
                                <>
                                    <div className="form-group">
                                        <label className="form-label">Main Image</label>
                                        <div className="d-flex align-items-start gap-4">
                                            <div className="flex-1">
                                                 <div className="input-group">
                                                    <input 
                                                        type="text" 
                                                        className="form-control" 
                                                        value={data.image ? (typeof data.image === 'string' ? data.image : data.image.name) : ''} 
                                                        readOnly 
                                                        placeholder="No file selected"
                                                    />
                                                    <button type="button" className="btn btn-outline" onClick={() => openMediaPicker('single')}>
                                                        Choose File
                                                    </button>
                                                 </div>
                                                 <div className="mt-2">
                                                     <small className="text-muted">Or upload new:</small>
                                                     <input type="file" className="form-control mt-2" onChange={e => setData('image', e.target.files[0])} accept="image/*" />
                                                 </div>
                                            </div>
                                            {/* Preview */}
                                            {(data.image || (currentProduct && currentProduct.image)) && (
                                                <div className="image-preview-box relative">
                                                    {data.image ? (
                                                        typeof data.image === 'string' ? (
                                                            <img src={`/storage/${data.image}`} alt="Preview" className="image-preview-full" />
                                                        ) : (
                                                            <img src={URL.createObjectURL(data.image)} alt="Preview" className="image-preview-full" />
                                                        )
                                                    ) : (
                                                        <img src={`/storage/${currentProduct.image}`} alt="Current" className="image-preview-full" />
                                                    )}
                                                    <button 
                                                        type="button"
                                                        className="gallery-remove-btn"
                                                        style={{ top: '5px', right: '5px' }}
                                                        onClick={() => setData(d => ({ ...d, image: null, delete_image: true }))}
                                                        title="Remove Image"
                                                    >
                                                        &times;
                                                    </button>
                                                </div>
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
                                                    onChange={e => setData('gallery', [...data.gallery, ...Array.from(e.target.files)])} 
                                                    multiple 
                                                    accept="image/*" 
                                                />
                                            </div>
                                        </div>
                                        
                                        {/* Display selected new gallery images */}
                                        <div className="gallery-container">
                                            {data.gallery.map((item, index) => (
                                                <div key={index} className="gallery-item">
                                                    {typeof item === 'string' ? (
                                                        <img src={`/storage/${item}`} alt={`Gallery ${index}`} className="gallery-image" />
                                                    ) : (
                                                        <img src={URL.createObjectURL(item)} alt={`Gallery ${index}`} className="gallery-image" />
                                                    )}
                                                    <button 
                                                        type="button"
                                                        onClick={() => {
                                                            const newGallery = [...data.gallery];
                                                            newGallery.splice(index, 1);
                                                            setData('gallery', newGallery);
                                                        }}
                                                        className="gallery-remove-btn"
                                                    >
                                                        &times;
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Display existing gallery images */}
                                        {data.existing_images && data.existing_images.length > 0 && (
                                            <div className="mt-4">
                                                <label className="form-label text-muted text-sm">Existing Gallery</label>
                                                <div className="gallery-container">
                                                    {data.existing_images.map((img, index) => (
                                                        <div key={`existing-${index}`} className="gallery-item">
                                                            <img src={`/storage/${img}`} alt={`Existing ${index}`} className="gallery-image" />
                                                            <button 
                                                                type="button"
                                                                onClick={() => {
                                                                    const newExisting = [...data.existing_images];
                                                                    newExisting.splice(index, 1);
                                                                    setData('existing_images', newExisting);
                                                                }}
                                                                className="gallery-remove-btn"
                                                            >
                                                                &times;
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {activeTab === 'Shipping' && (
                                <>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">Weight (kg)</label>
                                            <input type="number" step="0.01" className="form-control" value={data.weight} onChange={e => setData('weight', e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Dimensions (LxWxH)</label>
                                            <div className="dimensions-group">
                                                <input type="number" step="0.1" placeholder="L" className="form-control" value={data.length} onChange={e => setData('length', e.target.value)} />
                                                <input type="number" step="0.1" placeholder="W" className="form-control" value={data.wide} onChange={e => setData('wide', e.target.value)} />
                                                <input type="number" step="0.1" placeholder="H" className="form-control" value={data.height} onChange={e => setData('height', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                             {activeTab === 'SEO' && (
                                <>
                                    <div className="form-group">
                                        <label className="form-label">Meta Title</label>
                                        <input type="text" className="form-control" value={data.meta_title} onChange={e => setData('meta_title', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Meta Description</label>
                                        <textarea className="form-control form-textarea" rows="3" value={data.meta_description} onChange={e => setData('meta_description', e.target.value)}></textarea>
                                    </div>
                                </>
                            )}

                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={processing}>
                                {processing ? 'Saving...' : (currentProduct ? 'Update Product' : 'Save Product')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Media Picker Modal */}
            <MediaPickerModal 
                isOpen={isMediaPickerOpen}
                onClose={() => setIsMediaPickerOpen(false)}
                onSelect={handleMediaSelect}
                multiple={mediaPickerMode === 'multiple'}
            />
        </AdminLayout>
    );
};

export default Products;
