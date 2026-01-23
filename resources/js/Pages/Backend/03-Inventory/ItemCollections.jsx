import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/Warehouses.scss'; // Reusing Warehouses CSS for consistency

const ItemCollections = ({ collections = [] }) => {
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
        <AdminLayout activeMenu="Inventory">
            <Head title="Item Collections - ZodicERP" />
            <div className="breadcrumb">
                <Link href={route('admin')}>Dashboard</Link>
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
        </AdminLayout>
    );
};

export default ItemCollections;
