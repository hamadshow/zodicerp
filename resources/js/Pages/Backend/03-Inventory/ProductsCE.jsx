import React, { useState, useEffect, useMemo } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import MediaPickerModal from '../Media/MediaPickerModal';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/ProductsCE.scss';

const CategoryTreeItem = ({ category, selectedIds, onToggle, search }) => {
    const hasChildren = category.children && category.children.length > 0;
    
    return (
        <div className="category-tree-node">
            <label className="checkbox-option">
                <input
                    type="checkbox"
                    value={category.id}
                    checked={selectedIds.includes(String(category.id))}
                    onChange={() => onToggle(String(category.id))}
                />
                <span>{category.name}</span>
            </label>
            {hasChildren && (
                <div className="category-tree-children" style={{ paddingLeft: '20px' }}>
                    {category.children.map(child => (
                        <CategoryTreeItem
                            key={child.id}
                            category={child}
                            selectedIds={selectedIds}
                            onToggle={onToggle}
                            search={search}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const ProductsCE = () => {
    const { product, categories, brands } = usePage().props;
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
                    <a href="#">Dashboard</a>
                    <span>/</span>
                    <a href="#">Inventory</a>
                    <span>/</span>
                    <a href="#" onClick={() => router.get('/admin/products')}>
                        Products
                    </a>
                    <span>/</span>
                    <span>{pageTitle}</span>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="products-ce-card">
                        <div className="products-ce-header">
                            <h3 className="products-ce-title">{pageTitle}</h3>
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
                                                {(data.image || (product && product.image)) ? (
                                                    <div className="image-preview-full-container" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <img
                                                            src={data.image ? (typeof data.image === 'string' ? `/storage/${data.image}` : URL.createObjectURL(data.image)) : `/storage/${product.image}`}
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
                                                        onChange={e => setData('gallery', [...data.gallery, ...Array.from(e.target.files)])}
                                                        multiple
                                                        accept="image/*"
                                                    />
                                                </div>
                                            </div>

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

                                        <div className="form-group">
                                            <label className="form-label">Video</label>
                                            <button type="button" className="btn btn-outline">
                                                Add new
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="products-section-card">
                                    <div className="products-section-header">
                                        <h4 className="products-section-title">Specification Tables</h4>
                                    </div>
                                    <div className="products-section-content">
                                        <div className="form-group">
                                            <label className="form-label">Specification table</label>
                                            <select
                                                className="form-control"
                                                value={specTable}
                                                onChange={e => setSpecTable(e.target.value)}
                                            >
                                                <option value="none">None</option>
                                                <option value="tech">Technical specifications</option>
                                                <option value="size">Size guide</option>
                                            </select>
                                            <small className="text-muted text-sm">
                                                Select the specification table to display in this product.
                                            </small>
                                        </div>
                                    </div>
                                </div>

                                <div className="products-section-card">
                                    <div className="products-section-header">
                                        <h4 className="products-section-title">Overview</h4>
                                    </div>
                                    <div className="products-section-content">
                                        <div className="form-grid">
                                            <div className="form-group">
                                                <label className="form-label">SKU</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={data.sku}
                                                    onChange={e => setData('sku', e.target.value)}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Price</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className={`form-control ${errors.price ? 'border-red-500' : ''}`}
                                                    value={data.price}
                                                    onChange={e => setData('price', e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="form-grid">
                                            <div className="form-group">
                                                <label className="form-label">Price sale</label>
                                                <div className="d-flex align-items-center gap-2">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="form-control"
                                                        value={data.sale_price}
                                                        onChange={e => setData('sale_price', e.target.value)}
                                                    />
                                                    <button type="button" className="btn btn-link">
                                                        Choose Discount Period
                                                    </button>
                                                </div>
                                                {errors.sale_price && <div className="text-error">{errors.sale_price}</div>}
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Cost per item</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="form-control"
                                                    value={data.cost_per_item}
                                                    onChange={e => setData('cost_per_item', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="form-grid">
                                            <div className="form-group">
                                                <label className="form-label">Barcode</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="Enter barcode"
                                                    value={data.barcode}
                                                    onChange={e => setData('barcode', e.target.value)}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-checkbox-label">
                                                    <input
                                                        type="checkbox"
                                                        checked={data.with_storehouse_management}
                                                        onChange={e => setData('with_storehouse_management', e.target.checked)}
                                                    />
                                                    <span className="form-label form-checkbox-text">
                                                        With storehouse management
                                                    </span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Stock status</label>
                                            <select
                                                className="form-control"
                                                value={data.stock_status}
                                                onChange={e => setData('stock_status', e.target.value)}
                                            >
                                                <option value="in_stock">In stock</option>
                                                <option value="out_of_stock">Out of stock</option>
                                                <option value="on_backorder">On backorder</option>
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Shipping</label>
                                            <div className="form-grid">
                                                <div className="form-group">
                                                    <label className="form-label">Weight (g)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="form-control"
                                                        value={data.weight}
                                                        onChange={e => setData('weight', e.target.value)}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Length (cm)</label>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        className="form-control"
                                                        value={data.length}
                                                        onChange={e => setData('length', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="form-grid">
                                                <div className="form-group">
                                                    <label className="form-label">Width (cm)</label>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        className="form-control"
                                                        value={data.wide}
                                                        onChange={e => setData('wide', e.target.value)}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Height (cm)</label>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        className="form-control"
                                                        value={data.height}
                                                        onChange={e => setData('height', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="products-section-card">
                                    <div className="products-section-header">
                                        <h4 className="products-section-title">Attributes</h4>
                                    </div>
                                    <div className="products-section-content">
                                        <div className="form-group">
                                            <button type="button" className="btn btn-outline">
                                                Add new attributes
                                            </button>
                                            <small className="text-muted text-sm">
                                                Adding new attributes helps the product to have many options, such as size or
                                                color.
                                            </small>
                                        </div>
                                    </div>
                                </div>

                                <div className="products-section-card">
                                    <div className="products-section-header">
                                        <h4 className="products-section-title">Product options</h4>
                                    </div>
                                    <div className="products-section-content">
                                        <div className="form-group product-options-actions">
                                            <button type="button" className="btn btn-outline">
                                                Add new option
                                            </button>
                                            <button type="button" className="btn btn-outline">
                                                Select Global Option
                                            </button>
                                            <button type="button" className="btn btn-outline">
                                                Add Global Option
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="products-section-card">
                                    <div className="products-section-header">
                                        <h4 className="products-section-title">Related products & Cross-selling</h4>
                                    </div>
                                    <div className="products-section-content">
                                        <div className="form-group">
                                            <label className="form-label">Related products</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Search for products"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Cross-selling products</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Search for products"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="products-section-card">
                                    <div className="products-section-header">
                                        <h4 className="products-section-title">Product FAQs</h4>
                                    </div>
                                    <div className="products-section-content">
                                        <div className="form-group product-faq-actions">
                                            <button type="button" className="btn btn-outline">
                                                Add new
                                            </button>
                                            <button type="button" className="btn btn-outline">
                                                Select from existing FAQs
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="products-section-card">
                                    <div className="products-section-header">
                                        <h4 className="products-section-title">Search Engine Optimize</h4>
                                        <button
                                            type="button"
                                            className="btn btn-link"
                                            onClick={() => setShowSeoMeta(value => !value)}
                                        >
                                            {showSeoMeta ? 'Hide SEO meta' : 'Edit SEO meta'}
                                        </button>
                                    </div>
                                    <div className="products-section-content">
                                        <p className="text-muted text-sm">
                                            Setup meta title & description to make your site easy to discovered on search
                                            engines such as Google.
                                        </p>
                                        {showSeoMeta && (
                                            <>
                                                <div className="form-group">
                                                    <label className="form-label">Meta Title</label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={data.meta_title}
                                                        onChange={e => setData('meta_title', e.target.value)}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Meta Description</label>
                                                    <textarea
                                                        className="form-control form-textarea"
                                                        rows="3"
                                                        value={data.meta_description}
                                                        onChange={e => setData('meta_description', e.target.value)}
                                                    ></textarea>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="products-sidebar">
                                <div className="sidebar-card">
                                    <div className="sidebar-card-header">
                                        <h4 className="sidebar-card-title">Publish</h4>
                                    </div>
                                    <div className="sidebar-card-body">
                                        <div className="sidebar-button-group">
                                            <button 
                                                type="button" 
                                                className="btn btn-primary" 
                                                disabled={processing}
                                                onClick={() => submitWithAction('save')}
                                            >
                                                <span className="material-icons-outlined sidebar-button-icon">save</span>
                                                <span>{product ? 'Update' : 'Save'}</span>
                                            </button>
                                            <button 
                                                type="button" 
                                                className="btn btn-outline" 
                                                disabled={processing}
                                                onClick={() => submitWithAction('save_and_exit')}
                                            >
                                                <span className="material-icons-outlined sidebar-button-icon">logout</span>
                                                <span>{product ? 'Update & Exit' : 'Save & Exit'}</span>
                                            </button>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Status</label>
                                            <select
                                                className="form-control"
                                                value={data.status}
                                                onChange={e => setData('status', e.target.value)}
                                            >
                                                <option value="active">Published</option>
                                                <option value="inactive">Draft</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Store</label>
                                            <select
                                                className="form-control"
                                                value={store}
                                                onChange={e => setStore(e.target.value)}
                                            >
                                                <option value="">Select a store...</option>
                                                <option value="default">Default store</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Is featured?</label>
                                            <label className="toggle-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={data.is_featured}
                                                    onChange={e => setData('is_featured', e.target.checked)}
                                                />
                                                <span className="toggle-slider" />
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="sidebar-card">
                                    <div className="sidebar-card-header">
                                        <h4 className="sidebar-card-title">Categories</h4>
                                    </div>
                                    <div className="sidebar-card-body">
                                        <div className="form-group">
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Search categories"
                                                value={categorySearch}
                                                onChange={e => setCategorySearch(e.target.value)}
                                            />
                                        </div>
                                        <div className="sidebar-list">
                                            {categorySearch ? (
                                                // Flat list when searching for easier discovery
                                                categories
                                                    .filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()))
                                                    .map(c => (
                                                        <label key={c.id} className="checkbox-option">
                                                            <input
                                                                type="checkbox"
                                                                value={c.id}
                                                                checked={Array.isArray(data.category_ids) && data.category_ids.includes(String(c.id))}
                                                                onChange={() => handleCategoryToggle(String(c.id))}
                                                            />
                                                            <span>{c.name}</span>
                                                        </label>
                                                    ))
                                            ) : (
                                                // Tree view when not searching
                                                categoryTree.map(c => (
                                                    <CategoryTreeItem
                                                        key={c.id}
                                                        category={c}
                                                        selectedIds={Array.isArray(data.category_ids) ? data.category_ids : []}
                                                        onToggle={handleCategoryToggle}
                                                        search={categorySearch}
                                                    />
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="sidebar-card">
                                    <div className="sidebar-card-header">
                                        <h4 className="sidebar-card-title">Brand</h4>
                                    </div>
                                    <div className="sidebar-card-body">
                                        <div className="form-group">
                                            <select
                                                className="form-control"
                                                value={data.brand_id}
                                                onChange={e => setData('brand_id', e.target.value)}
                                            >
                                                <option value="">Select a brand...</option>
                                                {brands.map(b => (
                                                    <option key={b.id} value={b.id}>
                                                        {b.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>



                                <div className="sidebar-card">
                                    <div className="sidebar-card-header">
                                        <h4 className="sidebar-card-title">Product collections</h4>
                                    </div>
                                    <div className="sidebar-card-body">
                                        <div className="sidebar-list">
                                            <label className="checkbox-option">
                                                <input type="checkbox" />
                                                <span>New Arrival</span>
                                            </label>
                                            <label className="checkbox-option">
                                                <input type="checkbox" />
                                                <span>Best Sellers</span>
                                            </label>
                                            <label className="checkbox-option">
                                                <input type="checkbox" />
                                                <span>Special Offer</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="sidebar-card">
                                    <div className="sidebar-card-header">
                                        <h4 className="sidebar-card-title">Labels</h4>
                                    </div>
                                    <div className="sidebar-card-body">
                                        <div className="sidebar-list">
                                            <label className="checkbox-option">
                                                <input type="checkbox" />
                                                <span>Hot</span>
                                            </label>
                                            <label className="checkbox-option">
                                                <input type="checkbox" />
                                                <span>New</span>
                                            </label>
                                            <label className="checkbox-option">
                                                <input type="checkbox" />
                                                <span>Sale</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="sidebar-card">
                                    <div className="sidebar-card-header">
                                        <h4 className="sidebar-card-title">Taxes</h4>
                                    </div>
                                    <div className="sidebar-card-body">
                                        <div className="sidebar-list">
                                            <label className="checkbox-option">
                                                <input
                                                    type="radio"
                                                    name="tax_option"
                                                    value="none"
                                                    checked={taxOption === 'none'}
                                                    onChange={e => setTaxOption(e.target.value)}
                                                />
                                                <span>None (0%)</span>
                                            </label>
                                            <label className="checkbox-option">
                                                <input
                                                    type="radio"
                                                    name="tax_option"
                                                    value="vat"
                                                    checked={taxOption === 'vat'}
                                                    onChange={e => setTaxOption(e.target.value)}
                                                />
                                                <span>VAT (10%)</span>
                                            </label>
                                            <label className="checkbox-option">
                                                <input
                                                    type="radio"
                                                    name="tax_option"
                                                    value="import"
                                                    checked={taxOption === 'import'}
                                                    onChange={e => setTaxOption(e.target.value)}
                                                />
                                                <span>Import Tax (15%)</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="sidebar-card">
                                    <div className="sidebar-card-header">
                                        <h4 className="sidebar-card-title">Order quantities</h4>
                                    </div>
                                    <div className="sidebar-card-body">
                                        <div className="form-group">
                                            <label className="form-label">Minimum order quantity</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={data.minimum_order_quantity}
                                                onChange={e => setData('minimum_order_quantity', e.target.value)}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Maximum order quantity</label>
                                            <div className="d-flex align-items-center gap-2">
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={data.maximum_order_quantity}
                                                    onChange={e => setData('maximum_order_quantity', e.target.value)}
                                                />
                                                <span className="material-icons-outlined quantity-valid-icon">
                                                    check_circle
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="sidebar-card">
                                    <div className="sidebar-card-header">
                                        <h4 className="sidebar-card-title">Tags</h4>
                                    </div>
                                    <div className="sidebar-card-body">
                                        <div className="form-group">
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Write some tags"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="sidebar-footer">
                                    <span>Page loaded in 0.87 seconds</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions removed as requested, moved to sidebar */}
                </form>

                <MediaPickerModal
                    isOpen={isMediaPickerOpen}
                    onClose={() => setIsMediaPickerOpen(false)}
                    onSelect={handleMediaSelect}
                    multiple={mediaPickerMode === 'multiple'}
                />
            </div>
        </AdminLayout>
    );
};

export default ProductsCE;
