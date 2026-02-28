import React, { useState, useEffect } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import SearchableComboBox from '../components/SearchableComboBox';
import '../../../../css/backend/main.scss';

const ProductCollectionsList = ({ collections = [] }) => {
    const [filteredCollections, setFilteredCollections] = useState(collections);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({
        total: 0,
        published: 0,
        draft: 0
    });

    useEffect(() => {
        setFilteredCollections(collections);
    }, [collections]);

    useEffect(() => {
        updateStats();
        filterCollections();
    }, [filteredCollections, searchTerm]);

    const updateStats = () => {
        const total = filteredCollections.length;
        const published = filteredCollections.filter(c => c.status === 'published').length;
        const draft = filteredCollections.filter(c => c.status === 'draft').length;

        setStats({ total, published, draft });
    };

    const filterCollections = () => {
        if (!searchTerm) {
            setFilteredCollections(collections);
            return;
        }
        const lowerTerm = searchTerm.toLowerCase();
        const filtered = collections.filter(c => 
            c.name.toLowerCase().includes(lowerTerm) ||
            (c.slug && c.slug.toLowerCase().includes(lowerTerm)) ||
            c.status.toLowerCase().includes(lowerTerm)
        );
        setFilteredCollections(filtered);
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this collection?')) {
            router.delete(route('admin.product-collections.destroy', id));
        }
    };

    return (
        <>
            <Head title="Product Collections - ZodicERP" />
            
            <div className="breadcrumb">
                <Link href={route('admin.dashboard')}>Dashboard</Link>
                <span>/</span>
                <a href="#">Inventory</a>
                <span>/</span>
                <span>Product Collections</span>
            </div>

            {/* Quick Stats */}
            <div className="stats-cards">
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--primary-color)' }}>
                        <span className="material-icons-outlined">collections_bookmark</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">Total Collections</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--success-color)' }}>
                        <span className="material-icons-outlined">check_circle</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.published}</div>
                        <div className="stat-label">Published</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--warning-color)' }}>
                        <span className="material-icons-outlined">drafts</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.draft}</div>
                        <div className="stat-label">Drafts</div>
                    </div>
                </div>
            </div>

            {/* Main Card */}
            <div className="warehouses-card fade-in">
                <div className="card-header">
                    <div className="warehouses-actions">
                        <select className="btn btn-outline" defaultValue="">
                            <option disabled value="">Bulk Actions</option>
                            <option value="activate">Publish Selected</option>
                            <option value="deactivate">Draft Selected</option>
                            <option value="delete">Delete Selected</option>
                        </select>
                        <button className="btn btn-outline">
                            <span className="material-icons-outlined">play_arrow</span>
                            <span>Apply</span>
                        </button>
                        <div className="search-bar light">
                            <input 
                                type="text" 
                                placeholder="Search collections..." 
                                value={searchTerm}
                                onChange={handleSearch}
                            />
                            <button>
                                <span className="material-icons-outlined">search</span>
                            </button>
                        </div>
                    </div>
                    <div className="actions">
                        <Link href={route('admin.product-collections.create')} className="btn btn-primary">
                            <span className="material-icons-outlined">add</span>
                            <span>Add Collection</span>
                        </Link>
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
                                <th>NAME <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>STATUS <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>FEATURED</th>
                                <th>OPERATIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCollections.length > 0 ? (
                                filteredCollections.map(collection => (
                                    <tr key={collection.id}>
                                        <td><input type="checkbox" className="warehouse-checkbox" /></td>
                                        <td>
                                            <div className="warehouse-info">
                                                {collection.image && (
                                                    <img src={collection.image} alt={collection.name} className="w-10 h-10 rounded mr-2 object-cover" />
                                                )}
                                                <div className="warehouse-details">
                                                    <div className="warehouse-name">{collection.name}</div>
                                                    <div className="warehouse-description text-xs text-gray-500">{collection.slug}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`warehouse-status status-${collection.status === 'published' ? 'active' : 'inactive'}`}>
                                                {collection.status.charAt(0).toUpperCase() + collection.status.slice(1)}
                                            </span>
                                        </td>
                                        <td>
                                            {collection.is_featured ? (
                                                <span className="material-icons-outlined text-yellow-500">star</span>
                                            ) : (
                                                <span className="material-icons-outlined text-gray-300">star_border</span>
                                            )}
                                        </td>
                                        <td>
                                            <Link href={route('admin.product-collections.edit', collection.id)} className="icon-btn edit">
                                                <span className="material-icons-outlined">edit</span>
                                            </Link>
                                            <button className="icon-btn delete" onClick={() => handleDelete(collection.id)}>
                                                <span className="material-icons-outlined">delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="text-center py-4">No collections found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

const ProductCollectionsForm = ({ collection = null }) => {
    const isEdit = !!collection;
    const { props } = usePage();
    const localization = props.localization || {};
    
    const { data, setData, post, put, processing, errors } = useForm({
        name: collection?.name || '',
        slug: collection?.slug || '',
        description: collection?.description || '',
        status: collection?.status || 'published',
        image: collection?.image || '',
        is_featured: collection?.is_featured ?? false,
        products: collection?.products?.map(p => p.id) || [],
    });

    // Products selection state
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedProducts, setSelectedProducts] = useState(collection?.products || []);
    const [isSearching, setIsSearching] = useState(false);
    const [resetKey, setResetKey] = useState(0);

    // Helper for localization
    const getLocalizedRoute = (name, params = {}) => {
        return route(name, {
            country: localization.country_code || 'sa',
            lang: localization.current_locale || 'ar',
            ...params
        });
    };

    // Search products
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchTerm.length > 1) {
                setIsSearching(true);
                try {
                    // Try to use localized route if available, fallback to standard route
                    let url;
                    try {
                        url = getLocalizedRoute('admin.product-collections.get-products');
                    } catch (e) {
                        url = route('admin.product-collections.get-products');
                    }
                    
                    window.axios.get(url, { params: { query: searchTerm } })
                        .then(response => {
                            setSearchResults(response.data);
                            setIsSearching(false);
                        })
                        .catch(error => {
                            console.error("Error searching products:", error);
                            setIsSearching(false);
                        });
                } catch (e) {
                    console.error("Route generation error", e);
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const handleSelectProduct = (product) => {
        if (!selectedProducts.find(p => p.id === product.id)) {
            const newSelected = [...selectedProducts, product];
            setSelectedProducts(newSelected);
            setData('products', newSelected.map(p => p.id));
        }
        setSearchTerm('');
        setSearchResults([]);
        setResetKey(prev => prev + 1);
    };

    const handleRemoveProduct = (productId) => {
        const newSelected = selectedProducts.filter(p => p.id !== productId);
        setSelectedProducts(newSelected);
        setData('products', newSelected.map(p => p.id));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (isEdit) {
            put(route('admin.product-collections.update', collection.id));
        } else {
            post(route('admin.product-collections.store'));
        }
    };

    const pageTitle = isEdit ? 'Edit Collection' : 'Create New Collection';

    return (
        <>
            <Head title={`${pageTitle} - ZodicERP`} />
            <div className="products-ce-page">
                <div className="breadcrumb">
                    <Link href={route('admin.dashboard')}>Dashboard</Link>
                    <span>/</span>
                    <a href="#">Inventory</a>
                    <span>/</span>
                    <Link href={route('admin.product-collections.index')}>Product Collections</Link>
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
                                        <h4 className="products-section-title">Basic Information</h4>
                                    </div>
                                    <div className="products-section-content">
                                        {/* Name */}
                                        <div className="form-group">
                                            <label className="form-label">Name <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                                                value={data.name}
                                                onChange={e => setData('name', e.target.value)}
                                                placeholder="e.g. Summer Collection"
                                            />
                                            {errors.name && <div className="invalid-feedback text-error">{errors.name}</div>}
                                        </div>

                                        {/* Slug */}
                                        <div className="form-group mt-4">
                                            <label className="form-label">Slug</label>
                                            <input
                                                type="text"
                                                className={`form-control ${errors.slug ? 'is-invalid' : ''}`}
                                                value={data.slug}
                                                onChange={e => setData('slug', e.target.value)}
                                                placeholder="Leave blank to auto-generate"
                                            />
                                            {errors.slug && <div className="invalid-feedback text-error">{errors.slug}</div>}
                                        </div>

                                        {/* Description */}
                                        <div className="form-group mt-4">
                                            <label className="form-label">Description</label>
                                            <textarea
                                                className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                                                value={data.description}
                                                onChange={e => setData('description', e.target.value)}
                                                rows="3"
                                                placeholder="Collection description..."
                                            />
                                            {errors.description && <div className="invalid-feedback text-error">{errors.description}</div>}
                                        </div>

                                        {/* Image URL */}
                                        <div className="form-group mt-4">
                                            <label className="form-label">Image URL</label>
                                            <input
                                                type="text"
                                                className={`form-control ${errors.image ? 'is-invalid' : ''}`}
                                                value={data.image}
                                                onChange={e => setData('image', e.target.value)}
                                                placeholder="https://example.com/image.jpg"
                                            />
                                            {data.image && (
                                                <div className="mt-2">
                                                    <img src={data.image} alt="Preview" className="h-20 w-auto rounded border border-gray-200 object-cover" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="products-section-card mt-4">
                                    <div className="products-section-header">
                                        <h4 className="products-section-title">Products</h4>
                                    </div>
                                    <div className="products-section-content">
                                        <div className="form-group position-relative">
                                            <label className="form-label">Add Product</label>
                                            <SearchableComboBox
                                                key={resetKey}
                                                options={searchResults.map(p => ({
                                                    value: p.id,
                                                    label: p.name,
                                                    ...p
                                                }))}
                                                value=""
                                                onChange={(val) => {
                                                    const product = searchResults.find(p => p.id == val);
                                                    if (product) handleSelectProduct(product);
                                                }}
                                                onSearch={setSearchTerm}
                                                disableFiltering={true}
                                                placeholder="Search for products..."
                                                renderOption={(opt) => (
                                                    <div className="d-flex align-items-center">
                                                         {(opt.image && typeof opt.image === 'string') ? (
                                                             <img 
                                                                 src={opt.image.startsWith('http') ? opt.image : `/storage/${opt.image}`} 
                                                                 alt={opt.name} 
                                                                 className="rounded me-2" 
                                                                 style={{width: '40px', height: '40px', objectFit: 'cover'}} 
                                                                 onError={(e) => {e.target.style.display = 'none'}}
                                                             />
                                                         ) : (
                                                             <div className="bg-light rounded me-2 d-flex align-items-center justify-content-center" style={{width: '40px', height: '40px'}}>
                                                                 <span className="material-icons-outlined text-muted" style={{fontSize: '20px'}}>image</span>
                                                             </div>
                                                         )}
                                                         <div>
                                                             <div className="fw-bold">{opt.name}</div>
                                                             {opt.price && <div className="small text-muted">Price: {opt.price}</div>}
                                                         </div>
                                                    </div>
                                                )}
                                            />
                                            {isSearching && <div className="text-muted small mt-1 position-absolute" style={{right: 0, top: 0}}>Searching...</div>}
                                        </div>

                                        <div className="mt-4">
                                            <label className="form-label mb-2">Selected Products</label>
                                        <div className="table-responsive mt-3">
                                            <table className="table align-middle">
                                                <thead className="table-light">
                                                    <tr>
                                                        <th style={{ width: '80px' }}>IMAGE</th>
                                                        <th>PRODUCT NAME</th>
                                                        <th style={{ width: '150px' }}>PRICE</th>
                                                        <th style={{ width: '100px' }}>ACTION</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedProducts.length > 0 ? (
                                                        selectedProducts.map(product => (
                                                            <tr key={product.id}>
                                                                <td>
                                                                    {(product.image && typeof product.image === 'string') ? (
                                                                        <img 
                                                                            src={product.image.startsWith('http') ? product.image : `/storage/${product.image}`} 
                                                                            alt={product.name} 
                                                                            className="rounded" 
                                                                            style={{ width: 40, height: 40, objectFit: 'cover' }} 
                                                                            onError={(e) => {e.target.style.display = 'none'}}
                                                                        />
                                                                    ) : (
                                                                        <div className="bg-light rounded d-flex align-items-center justify-content-center" style={{width: '40px', height: '40px'}}>
                                                                            <span className="material-icons-outlined text-muted" style={{fontSize: '20px'}}>image</span>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td>{product.name}</td>
                                                                <td>
                                                                    {product.price || '-'}
                                                                </td>
                                                                <td>
                                                                    <button 
                                                                        type="button" 
                                                                        className="btn btn-sm btn-outline-danger d-flex align-items-center justify-content-center"
                                                                        style={{ width: '32px', height: '32px' }}
                                                                        onClick={() => handleRemoveProduct(product.id)}
                                                                    >
                                                                        <span className="material-icons-outlined" style={{ fontSize: '18px' }}>close</span>
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="4" className="text-center text-muted py-4">
                                                                No products added yet.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                        </div>
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
                                                type="submit"
                                                className="btn btn-primary btn-block"
                                                disabled={processing}
                                            >
                                                <span className="material-icons-outlined sidebar-button-icon">save</span>
                                                <span>{isEdit ? 'Update' : 'Save'}</span>
                                            </button>
                                        </div>
                                        <div className="mt-3">
                                            <Link href={route('admin.product-collections.index')} className="btn btn-outline btn-block text-center">
                                                Cancel
                                            </Link>
                                        </div>
                                    </div>
                                </div>

                                <div className="sidebar-card">
                                    <div className="sidebar-card-header">
                                        <h4 className="sidebar-card-title">Status <span className="text-red-500">*</span></h4>
                                    </div>
                                    <div className="sidebar-card-body">
                                        <select
                                            className={`form-control ${errors.status ? 'is-invalid' : ''}`}
                                            value={data.status}
                                            onChange={e => setData('status', e.target.value)}
                                        >
                                            <option value="published">Published</option>
                                            <option value="draft">Draft</option>
                                            <option value="pending">Pending</option>
                                        </select>
                                        {errors.status && <div className="invalid-feedback text-error">{errors.status}</div>}
                                    </div>
                                </div>

                                <div className="sidebar-card">
                                    <div className="sidebar-card-header">
                                        <h4 className="sidebar-card-title">Settings</h4>
                                    </div>
                                    <div className="sidebar-card-body">
                                        <div className="sidebar-field">
                                            <label className="sidebar-label">Featured Collection</label>
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
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
};

const ProductCollectionsPage = ({ collections = [], collection = null, mode = null }) => {
    // Check if we are in create or edit mode based on route or props
    const isCreateRoute = typeof route === 'function' && route().current('admin.product-collections.create');
    const isEditRoute = typeof route === 'function' && route().current('admin.product-collections.edit');
    const isFormMode = mode === 'create' || mode === 'edit' || isCreateRoute || isEditRoute || !!collection;

    return (
        <AdminLayout activeMenu="Inventory">
            {isFormMode ? (
                <ProductCollectionsForm collection={collection} />
            ) : (
                <ProductCollectionsList collections={collections} />
            )}
        </AdminLayout>
    );
};

export default ProductCollectionsPage;
