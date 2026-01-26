import React, { useEffect, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/Products.scss';
import '../../../../css/backend/08-Assts/AssetAttribute.scss';

const AssetAttributesList = ({ attributes = [] }) => {
    const [filteredAttributes, setFilteredAttributes] = useState(attributes);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        inactive: 0
    });

    useEffect(() => {
        setFilteredAttributes(attributes);
    }, [attributes]);

    useEffect(() => {
        const total = filteredAttributes.length;
        const active = filteredAttributes.filter(a => a.is_active).length;
        const inactive = filteredAttributes.filter(a => !a.is_active).length;
        setStats({ total, active, inactive });
    }, [filteredAttributes]);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredAttributes(attributes);
            return;
        }
        const lowerTerm = searchTerm.toLowerCase();
        const filtered = attributes.filter(a => 
            a.name.toLowerCase().includes(lowerTerm) ||
            a.code?.toLowerCase().includes(lowerTerm) ||
            a.type.toLowerCase().includes(lowerTerm)
        );
        setFilteredAttributes(filtered);
    }, [searchTerm, attributes]);

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this attribute?')) {
            router.delete(route('admin.assets.asset-attributes.destroy', id));
        }
    };

    return (
        <>
            <Head title="Asset Attributes - ZodicERP" />
            <div className="breadcrumb">
                <Link href={route('admin')}>Dashboard</Link>
                <span>/</span>
                <a href="#">Fixed Assets</a>
                <span>/</span>
                <span>Asset Attributes</span>
            </div>

            <div className="stats-cards">
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--primary-color)' }}>
                        <span className="material-icons-outlined">tune</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">Total Attributes</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--success-color)' }}>
                        <span className="material-icons-outlined">check_circle</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.active}</div>
                        <div className="stat-label">Active</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: 'var(--warning-color)' }}>
                        <span className="material-icons-outlined">unpublished</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.inactive}</div>
                        <div className="stat-label">Inactive</div>
                    </div>
                </div>
            </div>

            <div className="warehouses-card fade-in">
                <div className="card-header">
                    <div className="warehouses-actions">
                        {/* Bulk actions could be implemented here */}
                        <div className="search-bar light">
                            <input 
                                type="text" 
                                placeholder="Search attributes..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <button>
                                <span className="material-icons-outlined">search</span>
                            </button>
                        </div>
                    </div>
                    <div className="actions">
                        <Link href={route('admin.assets.asset-attributes.create')} className="btn btn-primary">
                            <span className="material-icons-outlined">add</span>
                            <span>Add Attribute</span>
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
                                <th>TYPE <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>STATUS <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>OPERATIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAttributes.length > 0 ? (
                                filteredAttributes.map(attr => (
                                    <tr key={attr.id}>
                                        <td><input type="checkbox" className="warehouse-checkbox" /></td>
                                        <td>
                                            <div className="warehouse-info">
                                                <div className="warehouse-details">
                                                    <div className="warehouse-name">{attr.name}</div>
                                                    <div className="warehouse-description text-xs text-gray-500">{attr.code}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{attr.type}</td>
                                        <td>
                                            <span className={`warehouse-status status-${attr.is_active ? 'active' : 'inactive'}`}>
                                                {attr.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            <Link href={route('admin.assets.asset-attributes.edit', attr.id)} className="icon-btn edit">
                                                <span className="material-icons-outlined">edit</span>
                                            </Link>
                                            <button className="icon-btn delete" onClick={() => handleDelete(attr.id)}>
                                                <span className="material-icons-outlined">delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="text-center py-4">No attributes found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

const AssetAttributesForm = ({ attribute = null }) => {
    const isEdit = !!attribute;

    const { data, setData, post, put, processing, errors } = useForm({
        name: attribute?.name || '',
        code: attribute?.code || '',
        type: attribute?.type || 'text',
        is_active: attribute?.is_active ?? true,
        description: attribute?.description || '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isEdit) {
            put(route('admin.assets.asset-attributes.update', attribute.id));
        } else {
            post(route('admin.assets.asset-attributes.store'));
        }
    };

    const pageTitle = isEdit ? 'Edit Asset Attribute' : 'Create Asset Attribute';

    return (
        <>
            <Head title={`${pageTitle} - ZodicERP`} />
            <div className="products-ce-page">
                <div className="breadcrumb">
                    <Link href={route('admin')}>Dashboard</Link>
                    <span>/</span>
                    <a href="#">Fixed Assets</a>
                    <span>/</span>
                    <Link href={route('admin.assets.asset-attributes.index')}>Asset Attributes</Link>
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
                                        <div className="form-group">
                                            <label className="form-label">Attribute Name <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                                                value={data.name}
                                                onChange={e => setData('name', e.target.value)}
                                                placeholder="e.g. Serial Number, Warranty Date"
                                            />
                                            {errors.name && <div className="invalid-feedback text-error">{errors.name}</div>}
                                        </div>

                                        <div className="form-group mt-3">
                                            <label className="form-label">Attribute Code</label>
                                            <input
                                                type="text"
                                                className={`form-control ${errors.code ? 'is-invalid' : ''}`}
                                                value={data.code}
                                                onChange={e => setData('code', e.target.value)}
                                                placeholder="Leave empty to auto-generate"
                                            />
                                            {errors.code && <div className="invalid-feedback text-error">{errors.code}</div>}
                                        </div>

                                        <div className="form-group mt-3">
                                            <label className="form-label">Description</label>
                                            <textarea
                                                className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                                                value={data.description}
                                                onChange={e => setData('description', e.target.value)}
                                                rows="3"
                                            ></textarea>
                                            {errors.description && <div className="invalid-feedback text-error">{errors.description}</div>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="products-sidebar">
                                <div className="sidebar-card">
                                    <div className="sidebar-card-header">
                                        <h4 className="sidebar-card-title">Settings</h4>
                                    </div>
                                    <div className="sidebar-card-body">
                                        <div className="form-group mb-3">
                                            <label className="form-label">Input Type</label>
                                            <select
                                                className={`form-control ${errors.type ? 'is-invalid' : ''}`}
                                                value={data.type}
                                                onChange={e => setData('type', e.target.value)}
                                            >
                                                <option value="text">Text</option>
                                                <option value="number">Number</option>
                                                <option value="date">Date</option>
                                                <option value="boolean">Yes/No (Boolean)</option>
                                                <option value="select">Select (Dropdown)</option>
                                            </select>
                                            {errors.type && <div className="invalid-feedback text-error">{errors.type}</div>}
                                        </div>

                                        <div className="form-group mb-3">
                                            <label className="form-label">Status</label>
                                            <select
                                                className="form-control"
                                                value={data.is_active ? '1' : '0'}
                                                onChange={e => setData('is_active', e.target.value === '1')}
                                            >
                                                <option value="1">Active</option>
                                                <option value="0">Inactive</option>
                                            </select>
                                        </div>

                                        <div className="sidebar-button-group mt-4">
                                            <button
                                                type="submit"
                                                className="btn btn-primary btn-block"
                                                disabled={processing}
                                            >
                                                <span className="material-icons-outlined sidebar-button-icon">save</span>
                                                Save Attribute
                                            </button>
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

const AssetAttributePage = (props) => {
    // Determine which view to show based on props or route
    // Since we pass 'attributes' for index and 'attribute' for edit/create (or empty for create)
    // We can check if 'attributes' prop exists to decide list view
    
    // However, for cleaner separation, we can check if route is index
    const isList = route().current('admin.assets.asset-attributes.index');

    return (
        <AdminLayout activeMenu="Asset Attributes">
            {isList ? (
                <AssetAttributesList {...props} />
            ) : (
                <AssetAttributesForm {...props} />
            )}
        </AdminLayout>
    );
};

export default AssetAttributePage;
