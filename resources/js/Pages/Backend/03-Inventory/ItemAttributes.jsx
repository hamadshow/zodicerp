import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/Warehouses.scss'; // Reusing Warehouses CSS for consistency

const ItemAttributes = ({ attributes = [] }) => {
    const [filteredAttributes, setFilteredAttributes] = useState(attributes);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({
        total: 0,
        published: 0,
        draft: 0
    });

    useEffect(() => {
        setFilteredAttributes(attributes);
    }, [attributes]);

    useEffect(() => {
        updateStats();
        filterAttributes();
    }, [filteredAttributes, searchTerm]);

    const updateStats = () => {
        const total = filteredAttributes.length;
        const published = filteredAttributes.filter(a => a.status === 'published').length;
        const draft = filteredAttributes.filter(a => a.status === 'draft').length;

        setStats({ total, published, draft });
    };

    const filterAttributes = () => {
        if (!searchTerm) {
            setFilteredAttributes(attributes);
            return;
        }
        const lowerTerm = searchTerm.toLowerCase();
        const filtered = attributes.filter(a => 
            a.title.toLowerCase().includes(lowerTerm) ||
            a.display_layout.toLowerCase().includes(lowerTerm) ||
            a.status.toLowerCase().includes(lowerTerm)
        );
        setFilteredAttributes(filtered);
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this attribute?')) {
            router.delete(route('admin.item-attributes.destroy', id));
        }
    };

    return (
        <AdminLayout activeMenu="Inventory">
            <Head title="Item Attributes - ZodicERP" />
            <div className="breadcrumb">
                <a href="#">Dashboard</a>
                <span>/</span>
                <a href="#">Inventory</a>
                <span>/</span>
                <span>Item Attributes</span>
            </div>

            {/* Quick Stats */}
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
                                placeholder="Search attributes..." 
                                value={searchTerm}
                                onChange={handleSearch}
                            />
                            <button>
                                <span className="material-icons-outlined">search</span>
                            </button>
                        </div>
                    </div>
                    <div className="actions">
                        <Link href={route('admin.item-attributes.create')} className="btn btn-primary">
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
                                <th>TITLE <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
                                <th>LAYOUT <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span></th>
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
                                                    <div className="warehouse-name">{attr.title}</div>
                                                    <div className="warehouse-description text-xs text-gray-500">{attr.slug}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{attr.display_layout}</td>
                                        <td>
                                            <span className={`warehouse-status status-${attr.status === 'published' ? 'active' : 'inactive'}`}>
                                                {attr.status.charAt(0).toUpperCase() + attr.status.slice(1)}
                                            </span>
                                        </td>
                                        <td>
                                            <Link href={route('admin.item-attributes.edit', attr.id)} className="icon-btn edit">
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
        </AdminLayout>
    );
};

export default ItemAttributes;
