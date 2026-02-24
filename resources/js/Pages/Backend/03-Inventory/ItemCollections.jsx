import React, { useState, useEffect } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/Warehouses.scss';
import '../../../../css/backend/main.scss';

const ItemCollectionsList = ({ collections = [] }) => {
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
            router.delete(route('admin.item-collections.destroy', id));
        }
    };

    return (
        <>
            <Head title="Item Collections - ZodicERP" />
            <div className="breadcrumb">
                <Link href={route('admin.dashboard')}>Dashboard</Link>
                <span>/</span>
                <a href="#">Inventory</a>
                <span>/</span>
                <span>Item Collections</span>
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
                        <Link href={route('admin.item-collections.create')} className="btn btn-primary">
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
                                <th>PARENT <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
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
                                            {collection.parent ? collection.parent.name : <span className="text-gray-400">-</span>}
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
                                            <Link href={route('admin.item-collections.edit', collection.id)} className="icon-btn edit">
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
                                    <td colSpan="6" className="text-center py-4">No collections found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

const ItemCollectionsForm = ({ collection = null, collections = [] }) => {
    const isEdit = !!collection;
    
    const { data, setData, post, put, processing, errors } = useForm({
        name: collection?.name || '',
        slug: collection?.slug || '',
        description: collection?.description || '',
        status: collection?.status || 'published',
        parent_id: collection?.parent_id || '',
        image: collection?.image || '',
        is_featured: collection?.is_featured ?? false,
    });

    const submitWithAction = () => {
        if (isEdit) {
            put(route('admin.item-collections.update', collection.id));
        } else {
            post(route('admin.item-collections.store'));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        submitWithAction('save');
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
                    <Link href={route('admin.item-collections.index')}>Item Collections</Link>
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
                            {/* Main Column */}
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
                                                rows="4"
                                                placeholder="Collection description..."
                                            />
                                            {errors.description && <div className="invalid-feedback text-error">{errors.description}</div>}
                                        </div>
                                    </div>
                                </div>

                                <div className="products-section-card">
                                    <div className="products-section-header">
                                        <h4 className="products-section-title">Hierarchy</h4>
                                    </div>
                                    <div className="products-section-content">
                                        {/* Parent Collection */}
                                        <div className="form-group">
                                            <label className="form-label">Parent Collection</label>
                                            <select
                                                className={`form-control ${errors.parent_id ? 'is-invalid' : ''}`}
                                                value={data.parent_id}
                                                onChange={e => setData('parent_id', e.target.value)}
                                            >
                                                <option value="">None</option>
                                                {collections.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                            {errors.parent_id && <div className="invalid-feedback text-error">{errors.parent_id}</div>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar Column */}
                            <div className="products-sidebar">
                                <div className="sidebar-card">
                                    <div className="sidebar-card-header">
                                        <h4 className="sidebar-card-title">Publish</h4>
                                    </div>
                                    <div className="sidebar-card-body">
                                        <div className="sidebar-button-group">
                                            <button 
                                                type="submit" 
                                                className="btn btn-primary w-full" 
                                                disabled={processing}
                                            >
                                                <span className="material-icons-outlined sidebar-button-icon">save</span>
                                                <span>{isEdit ? 'Update' : 'Save'}</span>
                                            </button>
                                        </div>
                                        <div className="mt-3">
                                            <Link href={route('admin.item-collections.index')} className="btn btn-outline w-full text-center block">
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
                                        <h4 className="sidebar-card-title">Image</h4>
                                    </div>
                                    <div className="sidebar-card-body">
                                        {/* Simplified Image Input - In real app, use Media Manager */}
                                        <div className="form-group">
                                            <input
                                                type="text"
                                                className={`form-control ${errors.image ? 'is-invalid' : ''}`}
                                                value={data.image}
                                                onChange={e => setData('image', e.target.value)}
                                                placeholder="Image URL"
                                            />
                                            {data.image && (
                                                <div className="mt-2">
                                                    <img src={data.image} alt="Preview" className="w-full h-auto rounded border border-gray-200" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="sidebar-card">
                                    <div className="sidebar-card-header">
                                        <h4 className="sidebar-card-title">Configuration</h4>
                                    </div>
                                    <div className="sidebar-card-body">
                                        <div className="form-check mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Is Featured?</label>
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

const ItemCollectionsPage = (props) => {
    const isList = route().current('admin.item-collections.index');

    return (
        <AdminLayout activeMenu="Inventory">
            {isList ? (
                <ItemCollectionsList {...props} />
            ) : (
                <ItemCollectionsForm {...props} />
            )}
        </AdminLayout>
    );
};

export default ItemCollectionsPage;
