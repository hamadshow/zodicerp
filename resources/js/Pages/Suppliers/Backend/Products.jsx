import React, { useState, useMemo, useRef } from 'react';
import { Head, Link, usePage, useForm, router } from '@inertiajs/react';
import SupplierLayout from './Layout/SupplierLayout';
import ActionsCell from '@/Components/ActionsCell';
import '../../../../css/suppliers/Backend/main.scss';

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
        router.get(route('supplier.products'), filterParams, { preserveState: true });
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            router.delete(route('supplier.products.destroy', id));
        }
    };

    return (
        <SupplierLayout activeMenu="Products">
            <Head title="My Products" />
            
            <div className="products-page">
                <div className="content-area">
                <div className="page-header-section">
                    <div className="breadcrumb">
                        <Link href={route('supplier.dashboard')}>Dashboard</Link>
                        <span>/</span>
                        <span className="current">My Products</span>
                    </div>
                    <h1 className="page-title">My Products</h1>
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
                            <Link className="btn btn-primary" href={route('supplier.products.create')}>
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
                            <option value="published">Published</option>
                            <option value="draft">Draft</option>
                            <option value="pending">Pending</option>
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
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {safeProducts.data.length > 0 ? (
                                    safeProducts.data.map(product => (
                                        <tr key={product.id}>
                                            <td className="product-cell">
                                                {product.image ? (
                                                    <img src={`/storage/${product.image}`} alt={product.name} className="product-thumb" />
                                                ) : (
                                                    <div className="product-thumb-placeholder">
                                                        <span className="material-icons-outlined text-gray-light">image</span>
                                                    </div>
                                                )}
                                                <div className="product-info">
                                                    <div className="product-name">{product.name}</div>
                                                    <div className="product-code">{product.product_code}</div>
                                                </div>
                                            </td>
                                            <td>{product.sku || '-'}</td>
                                            <td>
                                                {product.categories && product.categories.map(c => c.name).join(', ')}
                                            </td>
                                            <td>{product.brand?.name || '-'}</td>
                                            <td>
                                                <div className="price-display">
                                                    {product.sale_price ? (
                                                        <>
                                                            <span className="original-price">${product.price}</span>
                                                            <span className="sale-price">${product.sale_price}</span>
                                                        </>
                                                    ) : (
                                                        <span>${product.price}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`status-badge status-${product.status}`}>
                                                    {product.status}
                                                </span>
                                            </td>
                                            <td>{new Date(product.created_at).toLocaleDateString()}</td>
                                            <td>
    <ActionsCell 
        onEdit={() => router.get(route('supplier.products.edit', product.id))}
        onDelete={() => handleDelete(product.id)}
        editTitle="Edit"
        deleteTitle="Delete"
    />
</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="text-center py-4">No products found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {safeProducts.links.length > 3 && (
                        <div className="pagination">
                            {safeProducts.links.map((link, i) => (
                                <Link
                                    key={i}
                                    href={link.url}
                                    className={`page-link ${link.active ? 'active' : ''} ${!link.url ? 'disabled' : ''}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    )}
                </div>
                </div>
            </div>
        </SupplierLayout>
    );
};

// ==========================================
// Form Component
// ==========================================

const ProductsForm = ({ product, brands, categories, itemAttributes }) => {
    const isEdit = !!product;
    const safeBrands = Array.isArray(brands) ? brands : [];
    const safeCategories = Array.isArray(categories) ? categories : [];
    const safeItemAttributes = Array.isArray(itemAttributes) ? itemAttributes : [];

    const { data, setData, post, processing, errors } = useForm({
        name: product?.name || '',
        sku: product?.sku || '',
        product_code: product?.product_code || '',
        description: product?.description || '',
        content: product?.content || '',
        status: product?.status || 'published',
        brand_id: product?.brand_id || '',
        is_featured: product?.is_featured ? true : false,
        price: product?.price || '',
        sale_price: product?.sale_price || '',
        cost_per_item: product?.cost_per_item || '',
        barcode: product?.barcode || '',
        with_storehouse_management: product?.with_storehouse_management ? true : false,
        quantity: product?.quantity || '',
        stock_status: product?.stock_status || 'in_stock',
        allow_checkout_when_out_of_stock: product?.allow_checkout_when_out_of_stock ? true : false,
        weight: product?.weight || '',
        length: product?.length || '',
        wide: product?.wide || '',
        height: product?.height || '',
        product_type: product?.product_type || 'simple',
        
        // Relations
        category_ids: product?.categories?.map(c => String(c.id)) || [],
        
        // Images
        image: null,
        delete_image: false,
        gallery: [],
        existing_images: product?.images || [],
        
        // Variations
        variations: (product?.variations || []).map((v) => {
            const variationProduct = v?.product || {};
            const items = Array.isArray(v?.items) ? v.items : [];

            return {
                id: v?.id ?? null,
                tempId: `existing-${v?.id ?? variationProduct?.id ?? Math.random().toString(36).slice(2)}`,
                is_default: !!v?.is_default,
                sku: variationProduct?.sku || '',
                price: variationProduct?.price ?? '',
                sale_price: variationProduct?.sale_price ?? '',
                stock: variationProduct?.quantity ?? '',
                stock_status: variationProduct?.stock_status || 'in_stock',
                cost_per_item: variationProduct?.cost_per_item ?? '',
                barcode: variationProduct?.barcode ?? '',
                weight: variationProduct?.weight ?? '',
                length: variationProduct?.length ?? '',
                wide: variationProduct?.wide ?? '',
                height: variationProduct?.height ?? '',
                image: null,
                existing_image: variationProduct?.image || '',
                images: Array.isArray(variationProduct?.images) ? variationProduct.images : [],
                attribute_values: items.reduce((acc, item) => {
                    acc[item.attribute_id] = item.attribute_value;
                    return acc;
                }, {})
            };
        }),

        // Save Action
        save_action: 'save'
    });

    const mainImageInputRef = useRef(null);
    const galleryInputRef = useRef(null);

    // Helper to organize categories hierarchically
    const categoryTree = useMemo(() => {
        const buildTree = (parentId = null) => {
            return safeCategories
                .filter(c => c.parent_id === parentId)
                .map(c => ({ ...c, children: buildTree(c.id) }));
        };
        return buildTree(null);
    }, [safeCategories]);

    // Handle Category Toggle
    const handleCategoryToggle = (id) => {
        const current = Array.isArray(data.category_ids) ? data.category_ids : [];
        if (current.includes(id)) {
            setData('category_ids', current.filter(cid => cid !== id));
            return;
        }
        setData('category_ids', [...current, id]);
    };

    // Tabs State
    const [activeTab, setActiveTab] = useState('general');

    // Variations Generation State
    const [selectedAttributeIds, setSelectedAttributeIds] = useState([]);
    const [selectedVariationOptions, setSelectedVariationOptions] = useState({});

    // Edit Variation Modal State
    const [isEditVariationModalOpen, setIsEditVariationModalOpen] = useState(false);
    const [editingVariationIndex, setEditingVariationIndex] = useState(null);
    const [editVariationForm, setEditVariationForm] = useState({
        sku: '',
        price: '',
        stock: '',
        sale_price: '',
        image: null,
        existing_image: ''
    });

    // Image Handlers
    const handleMainImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setData('image', file);
            setData('delete_image', false);
        }
    };

    const handleRemoveMainImage = () => {
        setData('image', null);
        setData('delete_image', true);
        if (mainImageInputRef.current) mainImageInputRef.current.value = '';
    };

    const handleGalleryChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            setData('gallery', [...data.gallery, ...files]);
        }
    };

    const handleRemoveGalleryImage = (index, isExisting) => {
        if (isExisting) {
            // Removing existing image
            const newExisting = data.existing_images.filter((_, i) => i !== index);
            setData('existing_images', newExisting);
        } else {
            // Removing new upload
            const newGallery = data.gallery.filter((_, i) => i !== index);
            setData('gallery', newGallery);
        }
    };

    // Variation Logic
    const toggleAttributeSelection = (id) => {
        setSelectedAttributeIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleVariationOption = (attrId, optionId) => {
        setSelectedVariationOptions(prev => {
            const current = prev[attrId] || [];
            const updated = current.includes(optionId) 
                ? current.filter(i => i !== optionId) 
                : [...current, optionId];
            return { ...prev, [attrId]: updated };
        });
    };

    const generateVariations = () => {
        const attrs = selectedAttributeIds
            .map(id => safeItemAttributes.find(a => a.id === id))
            .filter(Boolean)
            .map(attr => {
                const ids = selectedVariationOptions[attr.id] || [];
                const details = (attr.details || []).filter(d => ids.includes(d.id));
                return { attribute: attr, details };
            })
            .filter(group => group.details.length > 0);

        if (attrs.length === 0) {
            alert('Please select at least one attribute and one option.');
            return;
        }

        const arrays = attrs.map(group => group.details.map(d => ({ 
            attribute_id: group.attribute.id, 
            detail_id: d.id, 
            detail_name: d.title 
        })));

        const cartesian = (arrs) => arrs.reduce((acc, curr) => {
            if (acc.length === 0) return curr.map(x => [x]);
            const out = [];
            acc.forEach(a => curr.forEach(b => out.push([...a, b])));
            return out;
        }, []);

        const combos = cartesian(arrays);
        const basePrice = data.price ?? '';

        const newVariations = combos.map(combo => {
            const attribute_values = {};
            combo.forEach(({ attribute_id, detail_id }) => {
                attribute_values[attribute_id] = detail_id;
            });

            return {
                id: null,
                tempId: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                sku: '',
                price: basePrice,
                stock: '',
                stock_status: 'in_stock',
                is_default: false,
                image: null,
                existing_image: '',
                images: [],
                attribute_values,
                combo_desc: combo.map(c => c.detail_name).join(' / ')
            };
        });

        setData('variations', [...data.variations, ...newVariations]);
        setActiveTab('variations');
    };

    const removeVariation = (index) => {
        const newVars = data.variations.filter((_, i) => i !== index);
        setData('variations', newVars);
    };

    const openEditVariationModal = (index) => {
        const v = data.variations[index];
        setEditingVariationIndex(index);
        setEditVariationForm({
            sku: v.sku,
            price: v.price,
            stock: v.stock,
            sale_price: v.sale_price,
            image: null,
            existing_image: v.existing_image || (v.image && typeof v.image === 'string' ? v.image : '')
        });
        setIsEditVariationModalOpen(true);
    };

    const saveVariationChanges = () => {
        if (editingVariationIndex === null) return;
        
        const updatedVariations = [...data.variations];
        updatedVariations[editingVariationIndex] = {
            ...updatedVariations[editingVariationIndex],
            ...editVariationForm,
            // If image is null, keep existing. If it's a file, it will be uploaded.
        };
        
        setData('variations', updatedVariations);
        setIsEditVariationModalOpen(false);
        setEditingVariationIndex(null);
    };

    const handleVariationImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setEditVariationForm(prev => ({ ...prev, image: file }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Prepare FormData implicitly via useForm
        // However, we need to ensure correct method spoofing for update
        
        if (isEdit) {
            post(route('supplier.products.update', product.id), {
                forceFormData: true,
                onSuccess: () => {},
            });
        } else {
            post(route('supplier.products.store'), {
                forceFormData: true,
                onSuccess: () => {},
            });
        }
    };

    return (
        <SupplierLayout activeMenu="Products">
            <Head title={isEdit ? `Edit Product: ${product.name}` : "Add New Product"} />
            
            <div className="products-form-page">
                <div className="page-header-section">
                    <div className="breadcrumb">
                        <Link href={route('supplier.dashboard')}>Dashboard</Link>
                        <span>/</span>
                        <Link href={route('supplier.products')}>My Products</Link>
                        <span>/</span>
                        <span className="current">{isEdit ? 'Edit Product' : 'Add Product'}</span>
                    </div>
                    <div className="d-flex justify-between align-items-center">
                        <h1 className="page-title">{isEdit ? `Edit: ${product.name}` : 'Add New Product'}</h1>
                        <div className="actions">
                            <button 
                                type="button" 
                                onClick={handleSubmit} 
                                disabled={processing} 
                                className="btn btn-primary"
                            >
                                {processing ? 'Saving...' : 'Save Product'}
                            </button>
                        </div>
                    </div>
                </div>

                {Object.keys(errors).length > 0 && (
                    <div className="alert alert-danger">
                        Please correct the errors below.
                        <ul>
                            {Object.values(errors).map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="product-form-container">
                    <div className="form-main-column">
                        <div className="card">
                            <div className="form-group">
                                <label className="form-label required">Product Name</label>
                                <input 
                                    type="text" 
                                    className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                                    value={data.name}
                                    onChange={e => setData('name', e.target.value)}
                                    placeholder="Enter product name"
                                />
                                {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                            </div>
                            
                            <div className="form-group mt-3">
                                <label className="form-label">Description</label>
                                <textarea 
                                    className="form-control"
                                    rows="4"
                                    value={data.description}
                                    onChange={e => setData('description', e.target.value)}
                                ></textarea>
                            </div>

                            <div className="form-group mt-3">
                                <label className="form-label">Content (Details)</label>
                                <textarea 
                                    className="form-control"
                                    rows="6"
                                    value={data.content}
                                    onChange={e => setData('content', e.target.value)}
                                ></textarea>
                            </div>
                        </div>

                        {/* Images Section */}
                        <div className="card mt-4">
                            <h3 className="card-title">Product Images</h3>
                            
                            <div className="form-group">
                                <label className="form-label">Main Image</label>
                                <div className="image-upload-area" onClick={() => mainImageInputRef.current?.click()}>
                                    {data.image ? (
                                        <div className="image-preview-full-container">
                                            <img src={URL.createObjectURL(data.image)} alt="Preview" />
                                            <button 
                                                type="button" 
                                                className="btn-icon gallery-remove-btn"
                                                onClick={(e) => { e.stopPropagation(); handleRemoveMainImage(); }}
                                            >
                                                <span className="material-icons-outlined">close</span>
                                            </button>
                                        </div>
                                    ) : data.existing_images && !data.delete_image && product?.image ? (
                                         <div className="image-preview-full-container">
                                            <img src={`/storage/${product.image}`} alt="Current" />
                                            <button 
                                                type="button" 
                                                className="btn-icon gallery-remove-btn"
                                                onClick={(e) => { e.stopPropagation(); handleRemoveMainImage(); }}
                                            >
                                                <span className="material-icons-outlined">close</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="image-upload-icon">
                                                <span className="material-icons-outlined">cloud_upload</span>
                                            </div>
                                            <p>Click to upload main image</p>
                                        </>
                                    )}
                                    <input 
                                        type="file" 
                                        ref={mainImageInputRef} 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={handleMainImageChange}
                                    />
                                </div>
                            </div>

                            <div className="form-group mt-4">
                                <label className="form-label">Gallery Images</label>
                                <div className="gallery-upload-area">
                                    <div className="gallery-grid">
                                        {data.existing_images.map((img, idx) => (
                                            <div key={`existing-${idx}`} className="gallery-item">
                                                <img src={typeof img === 'string' ? `/storage/${img}` : URL.createObjectURL(img)} alt={`Gallery ${idx}`} />
                                                <button type="button" className="remove-btn" onClick={() => handleRemoveGalleryImage(idx, true)}>×</button>
                                            </div>
                                        ))}
                                        {data.gallery.map((file, idx) => (
                                            <div key={`new-${idx}`} className="gallery-item">
                                                <img src={URL.createObjectURL(file)} alt={`New ${idx}`} />
                                                <button type="button" className="remove-btn" onClick={() => handleRemoveGalleryImage(idx, false)}>×</button>
                                            </div>
                                        ))}
                                        <div className="add-gallery-btn" onClick={() => galleryInputRef.current?.click()}>
                                            <span className="material-icons-outlined">add_photo_alternate</span>
                                            <input 
                                                type="file" 
                                                ref={galleryInputRef} 
                                                className="hidden" 
                                                multiple 
                                                accept="image/*"
                                                onChange={handleGalleryChange}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tabs for Data */}
                        <div className="card mt-4 p-0">
                            <div className="tabs-header">
                                <button 
                                    type="button" 
                                    className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('general')}
                                >
                                    General
                                </button>
                                <button 
                                    type="button" 
                                    className={`tab-btn ${activeTab === 'advanced' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('advanced')}
                                >
                                    Advanced
                                </button>
                                {data.product_type === 'variable' && (
                                    <button 
                                        type="button" 
                                        className={`tab-btn ${activeTab === 'variations' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('variations')}
                                    >
                                        Variations
                                    </button>
                                )}
                            </div>

                            <div className="tab-content p-4">
                                {activeTab === 'general' && (
                                    <div className="general-tab">
                                        <div className="row">
                                            <div className="col-md-6 form-group">
                                                <label className="form-label">SKU</label>
                                                <input 
                                                    type="text" 
                                                    className="form-control"
                                                    value={data.sku}
                                                    onChange={e => setData('sku', e.target.value)}
                                                />
                                            </div>
                                            <div className="col-md-6 form-group">
                                                <label className="form-label">Price ($)</label>
                                                <input 
                                                    type="number" 
                                                    className="form-control"
                                                    value={data.price}
                                                    onChange={e => setData('price', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="row mt-3">
                                            <div className="col-md-6 form-group">
                                                <label className="form-label">Sale Price ($)</label>
                                                <input 
                                                    type="number" 
                                                    className="form-control"
                                                    value={data.sale_price}
                                                    onChange={e => setData('sale_price', e.target.value)}
                                                />
                                            </div>
                                            <div className="col-md-6 form-group">
                                                <label className="form-label">Cost Per Item ($)</label>
                                                <input 
                                                    type="number" 
                                                    className="form-control"
                                                    value={data.cost_per_item}
                                                    onChange={e => setData('cost_per_item', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="row mt-3">
                                            <div className="col-md-6 form-group">
                                                <label className="form-label">Quantity</label>
                                                <input 
                                                    type="number" 
                                                    className="form-control"
                                                    value={data.quantity}
                                                    onChange={e => setData('quantity', e.target.value)}
                                                />
                                            </div>
                                            <div className="col-md-6 form-group">
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
                                    </div>
                                )}

                                {activeTab === 'advanced' && (
                                    <div className="advanced-tab">
                                        <div className="form-group">
                                            <label className="form-label">Product Type</label>
                                            <select 
                                                className="form-control"
                                                value={data.product_type}
                                                onChange={e => setData('product_type', e.target.value)}
                                            >
                                                <option value="simple">Simple Product</option>
                                                <option value="variable">Variable Product</option>
                                            </select>
                                        </div>
                                        <div className="form-group mt-3">
                                            <label className="checkbox-label">
                                                <input 
                                                    type="checkbox" 
                                                    checked={data.with_storehouse_management}
                                                    onChange={e => setData('with_storehouse_management', e.target.checked)}
                                                />
                                                <span>With Storehouse Management</span>
                                            </label>
                                        </div>
                                        <div className="row mt-3">
                                            <div className="col-md-3 form-group">
                                                <label className="form-label">Weight (g)</label>
                                                <input type="number" className="form-control" value={data.weight} onChange={e => setData('weight', e.target.value)} />
                                            </div>
                                            <div className="col-md-3 form-group">
                                                <label className="form-label">Length (cm)</label>
                                                <input type="number" className="form-control" value={data.length} onChange={e => setData('length', e.target.value)} />
                                            </div>
                                            <div className="col-md-3 form-group">
                                                <label className="form-label">Wide (cm)</label>
                                                <input type="number" className="form-control" value={data.wide} onChange={e => setData('wide', e.target.value)} />
                                            </div>
                                            <div className="col-md-3 form-group">
                                                <label className="form-label">Height (cm)</label>
                                                <input type="number" className="form-control" value={data.height} onChange={e => setData('height', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'variations' && data.product_type === 'variable' && (
                                    <div className="variations-tab">
                                        <div className="variation-generator mb-4 p-3 bg-gray-50 border rounded">
                                            <h4>Generate Variations</h4>
                                            <div className="attributes-selection mt-3">
                                                {safeItemAttributes.map(attr => (
                                                    <div key={attr.id} className="attribute-group mb-3">
                                                        <label className="checkbox-label font-bold">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={selectedAttributeIds.includes(attr.id)}
                                                                onChange={() => toggleAttributeSelection(attr.id)}
                                                            />
                                                            {attr.title}
                                                        </label>
                                                        {selectedAttributeIds.includes(attr.id) && (
                                                            <div className="options-list ml-4 mt-2 d-flex flex-wrap gap-2">
                                                                {attr.details.map(opt => (
                                                                    <label key={opt.id} className="checkbox-label text-sm">
                                                                        <input 
                                                                            type="checkbox" 
                                                                            checked={(selectedVariationOptions[attr.id] || []).includes(opt.id)}
                                                                            onChange={() => toggleVariationOption(attr.id, opt.id)}
                                                                        />
                                                                        {opt.title}
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            <button 
                                                type="button" 
                                                className="btn btn-secondary mt-2"
                                                onClick={generateVariations}
                                            >
                                                Generate Variations
                                            </button>
                                        </div>

                                        <div className="variations-list">
                                            {data.variations.map((v, idx) => (
                                                <div key={v.tempId || v.id} className="variation-item p-3 border rounded mb-2 d-flex justify-between align-items-center">
                                                    <div className="v-info d-flex align-items-center gap-3">
                                                        {v.image || v.existing_image ? (
                                                            <img 
                                                                src={v.image ? URL.createObjectURL(v.image) : `/storage/${v.existing_image}`} 
                                                                alt="Var" 
                                                                className="w-10 h-10 object-cover rounded"
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 bg-gray-200 rounded d-flex align-items-center justify-center">
                                                                <span className="material-icons-outlined text-sm">image</span>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="font-bold">
                                                                {v.combo_desc || 
                                                                 Object.values(v.attribute_values)
                                                                    .map(valId => {
                                                                        // Reverse lookup for name (expensive, but okay for small lists)
                                                                        for(let a of safeItemAttributes) {
                                                                            const found = a.details.find(d => d.id === valId);
                                                                            if(found) return found.title;
                                                                        }
                                                                        return '??';
                                                                    })
                                                                    .join(' / ')
                                                                }
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                SKU: {v.sku || 'Auto'} | Price: ${v.price} | Stock: {v.stock}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="v-actions d-flex gap-2">
                                                        <button 
                                                            type="button" 
                                                            className="btn-icon" 
                                                            onClick={() => openEditVariationModal(idx)}
                                                        >
                                                            <span className="material-icons-outlined">edit</span>
                                                        </button>
                                                        <button 
                                                            type="button" 
                                                            className="btn-icon text-red-500" 
                                                            onClick={() => removeVariation(idx)}
                                                        >
                                                            <span className="material-icons-outlined">delete</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {data.variations.length === 0 && (
                                                <div className="text-center text-gray-500 py-4">
                                                    No variations generated yet.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="form-sidebar-column">
                        <div className="card">
                            <h3 className="card-title">Publish</h3>
                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select 
                                    className="form-control"
                                    value={data.status}
                                    onChange={e => setData('status', e.target.value)}
                                >
                                    <option value="published">Published</option>
                                    <option value="draft">Draft</option>
                                    <option value="pending">Pending</option>
                                </select>
                            </div>
                            <div className="form-group mt-3">
                                <label className="checkbox-label">
                                    <input 
                                        type="checkbox" 
                                        checked={data.is_featured}
                                        onChange={e => setData('is_featured', e.target.checked)}
                                    />
                                    <span>Is Featured?</span>
                                </label>
                            </div>
                            <div className="form-actions mt-4">
                                <button type="submit" disabled={processing} className="btn btn-primary w-100">
                                    {processing ? 'Saving...' : (isEdit ? 'Update' : 'Publish')}
                                </button>
                            </div>
                        </div>

                        <div className="card mt-4">
                            <h3 className="card-title">Categories</h3>
                            <div className="category-tree-container">
                                {categoryTree.map(cat => (
                                    <CategoryTreeItem 
                                        key={cat.id} 
                                        category={cat} 
                                        selectedIds={data.category_ids}
                                        onToggle={handleCategoryToggle}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="card mt-4">
                            <h3 className="card-title">Brand</h3>
                            <div className="form-group">
                                <select 
                                    className="form-control"
                                    value={data.brand_id}
                                    onChange={e => setData('brand_id', e.target.value)}
                                >
                                    <option value="">Select Brand</option>
                                    {safeBrands.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </form>

                {/* Edit Variation Modal */}
                {isEditVariationModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h3>Edit Variation</h3>
                                <button onClick={() => setIsEditVariationModalOpen(false)} className="close-btn">×</button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Image</label>
                                    <div className="d-flex align-items-center gap-3">
                                        {editVariationForm.image ? (
                                            <img src={URL.createObjectURL(editVariationForm.image)} alt="Preview" className="w-16 h-16 object-cover rounded" />
                                        ) : editVariationForm.existing_image ? (
                                            <img src={`/storage/${editVariationForm.existing_image}`} alt="Existing" className="w-16 h-16 object-cover rounded" />
                                        ) : (
                                            <div className="w-16 h-16 bg-gray-100 rounded"></div>
                                        )}
                                        <input type="file" onChange={handleVariationImageChange} accept="image/*" />
                                    </div>
                                </div>
                                <div className="row mt-3">
                                    <div className="col-md-6 form-group">
                                        <label className="form-label">SKU</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            value={editVariationForm.sku} 
                                            onChange={e => setEditVariationForm({...editVariationForm, sku: e.target.value})} 
                                        />
                                    </div>
                                    <div className="col-md-6 form-group">
                                        <label className="form-label">Price</label>
                                        <input 
                                            type="number" 
                                            className="form-control" 
                                            value={editVariationForm.price} 
                                            onChange={e => setEditVariationForm({...editVariationForm, price: e.target.value})} 
                                        />
                                    </div>
                                </div>
                                <div className="row mt-3">
                                    <div className="col-md-6 form-group">
                                        <label className="form-label">Sale Price</label>
                                        <input 
                                            type="number" 
                                            className="form-control" 
                                            value={editVariationForm.sale_price} 
                                            onChange={e => setEditVariationForm({...editVariationForm, sale_price: e.target.value})} 
                                        />
                                    </div>
                                    <div className="col-md-6 form-group">
                                        <label className="form-label">Stock</label>
                                        <input 
                                            type="number" 
                                            className="form-control" 
                                            value={editVariationForm.stock} 
                                            onChange={e => setEditVariationForm({...editVariationForm, stock: e.target.value})} 
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setIsEditVariationModalOpen(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={saveVariationChanges}>Save Changes</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </SupplierLayout>
    );
};

// ==========================================
// Main Entry Component
// ==========================================

export default function Products(props) {
    // Decision logic: If 'products' prop exists, render List, else render Form.
    // Also, if 'product' prop is present (even if null for create), it indicates Form mode in this specific controller setup,
    // but the controller passes 'products' for the index view and 'product' for create/edit view.
    
    if (props.products) {
        return <ProductsList {...props} />;
    }
    
    return <ProductsForm {...props} />;
}
