import React from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/ProductsCE.css';

const ItemCollectionsCE = ({ collection = null, collections = [] }) => {
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
        <AdminLayout activeMenu="Inventory">
            <Head title={`${pageTitle} - ZodicERP`} />
            
            <div className="products-ce-page">
                <div className="breadcrumb">
                    <Link href={route('admin')}>Dashboard</Link>
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
        </AdminLayout>
    );
};

export default ItemCollectionsCE;
