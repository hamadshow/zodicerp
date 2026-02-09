import React, { useState, useEffect, useMemo } from 'react';
import { Head, router, usePage, Link } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/InvestingStack/Brokers.scss';
import { debounce } from 'lodash';

const ViewSection = ({ brokers, filters, onEdit, onCreate, onDelete }) => {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');

    const handleSearch = useMemo(
        () => debounce((value) => {
            router.get(
                route('admin.investing-stack.brokers.index'),
                { search: value },
                { preserveState: true, replace: true }
            );
        }, 300),
        []
    );

    useEffect(() => {
        handleSearch(searchTerm);
    }, [searchTerm]);

    const stats = useMemo(() => {
        const total = brokers.total;
        const currentData = brokers.data || [];
        const active = currentData.filter(b => b.status === 'active').length;
        const inactive = currentData.length - active; 
        return { total, active, inactive };
    }, [brokers]);

    return (
        <div className="animate-fade-slide">
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon blue">
                        <span className="material-icons-outlined">handshake</span>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.total}</span>
                        <span className="stat-label">Total Brokers</span>
                    </div>
                </div>
            </div>

            <div className="content-card">
                <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                    <div className="search-box">
                        <span className="material-icons-outlined search-icon">search</span>
                        <input
                            type="text"
                            placeholder="Search brokers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={onCreate}>
                        <span className="material-icons-outlined">add</span>
                        Add New Broker
                    </button>
                </div>

                <div className="table-responsive">
                    <table className="professional-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Name (AR)</th>
                                <th>Name (EN)</th>
                                <th>Type</th>
                                <th>Country</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {brokers.data && brokers.data.length > 0 ? (
                                brokers.data.map(broker => (
                                    <tr key={broker.id}>
                                        <td>{broker.broker_code}</td>
                                        <td>{broker.broker_name_ar}</td>
                                        <td>{broker.broker_name_en || '-'}</td>
                                        <td style={{ textTransform: 'capitalize' }}>{broker.broker_type?.replace('_', ' ') || '-'}</td>
                                        <td>{broker.country?.name || broker.country?.name_en || broker.country?.name_ar || '-'}</td>
                                        <td>
                                            <span className={`status-badge ${broker.status === 'active' ? 'active' : 'inactive'}`}>
                                                {broker.status ? broker.status.charAt(0).toUpperCase() + broker.status.slice(1) : '-'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button onClick={() => onEdit(broker)} title="Edit">
                                                    <span className="material-icons-outlined">edit</span>
                                                </button>
                                                <button className="delete-btn" onClick={() => onDelete(broker.id)} title="Delete">
                                                    <span className="material-icons-outlined">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                                        No brokers found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {brokers.links && brokers.links.length > 3 && (
                    <div className="pagination-container" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                        {brokers.links.map((link, key) => (
                            link.url === null ? (
                                <div 
                                    key={key} 
                                    className="pagination-link disabled"
                                    style={{ padding: '0.5rem 1rem', border: '1px solid #ddd', borderRadius: '4px', color: '#999' }}
                                    dangerouslySetInnerHTML={{ __html: link.label }} 
                                />
                            ) : (
                                <Link
                                    key={key}
                                    href={link.url}
                                    className={`pagination-link ${link.active ? 'active' : ''}`}
                                    style={{ 
                                        padding: '0.5rem 1rem', 
                                        border: '1px solid #ddd', 
                                        borderRadius: '4px', 
                                        color: link.active ? '#fff' : '#333',
                                        backgroundColor: link.active ? '#007bff' : '#fff',
                                        textDecoration: 'none'
                                    }}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            )
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const FormSection = ({ mode, initialData, countries, onBack, onSubmit }) => {
    const isEdit = mode === 'edit';
    const { errors } = usePage().props;
    
    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        // Handle checkbox explicitly
        const isRegulatedCheckbox = e.target.querySelector('input[name="is_regulated"]');
        if (isRegulatedCheckbox) {
             data.is_regulated = isRegulatedCheckbox.checked;
        }
        
        onSubmit(data);
    };

    return (
        <div className="animate-fade-slide">
            <div className="content-card">
                <div className="form-container">
                    <div className="form-section-title">
                        {isEdit ? 'Edit Broker' : 'Create New Broker'}
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Broker Code *</label>
                                <input
                                    type="text"
                                    name="broker_code"
                                    defaultValue={initialData?.broker_code}
                                    placeholder="e.g., BRK-001"
                                    required
                                    readOnly={isEdit}
                                    style={isEdit ? { backgroundColor: '#f3f4f6' } : {}}
                                />
                                {errors.broker_code && <div className="error-message">{errors.broker_code}</div>}
                            </div>

                            <div className="form-group">
                                <label>Broker Name (AR) *</label>
                                <input
                                    type="text"
                                    name="broker_name_ar"
                                    defaultValue={initialData?.broker_name_ar}
                                    placeholder="Broker Name in Arabic"
                                    required
                                />
                                {errors.broker_name_ar && <div className="error-message">{errors.broker_name_ar}</div>}
                            </div>

                            <div className="form-group">
                                <label>Broker Name (EN)</label>
                                <input
                                    type="text"
                                    name="broker_name_en"
                                    defaultValue={initialData?.broker_name_en}
                                    placeholder="Broker Name in English"
                                />
                                {errors.broker_name_en && <div className="error-message">{errors.broker_name_en}</div>}
                            </div>

                            <div className="form-group">
                                <label>Broker Type *</label>
                                <select
                                    name="broker_type"
                                    defaultValue={initialData?.broker_type || ''}
                                    required
                                >
                                    <option value="">Select Type</option>
                                    <option value="stock">Stock</option>
                                    <option value="forex">Forex</option>
                                    <option value="commodities">Commodities</option>
                                    <option value="crypto">Crypto</option>
                                    <option value="full_service">Full Service</option>
                                    <option value="discount">Discount</option>
                                    <option value="online">Online</option>
                                    <option value="institutional">Institutional</option>
                                </select>
                                {errors.broker_type && <div className="error-message">{errors.broker_type}</div>}
                            </div>

                            <div className="form-group">
                                <label>Country *</label>
                                <select
                                    name="country_id"
                                    defaultValue={initialData?.country_id || ''}
                                    required
                                >
                                    <option value="">Select Country</option>
                                    {countries.map(country => (
                                        <option key={country.id} value={country.id}>
                                            {country.name} ({country.code})
                                        </option>
                                    ))}
                                </select>
                                {errors.country_id && <div className="error-message">{errors.country_id}</div>}
                            </div>

                            <div className="form-group">
                                <label>Status</label>
                                <select
                                    name="status"
                                    defaultValue={initialData?.status || 'active'}
                                >
                                    <option value="active">Active</option>
                                    <option value="suspended">Suspended</option>
                                    <option value="revoked">Revoked</option>
                                    <option value="blacklisted">Blacklisted</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                                {errors.status && <div className="error-message">{errors.status}</div>}
                            </div>

                            <div className="form-group">
                                <label>License Number</label>
                                <input
                                    type="text"
                                    name="license_number"
                                    defaultValue={initialData?.license_number}
                                    placeholder="License / Registration No."
                                />
                                {errors.license_number && <div className="error-message">{errors.license_number}</div>}
                            </div>

                             <div className="form-group">
                                <label>Phone</label>
                                <input
                                    type="text"
                                    name="phone"
                                    defaultValue={initialData?.phone}
                                    placeholder="Contact Phone"
                                />
                                {errors.phone && <div className="error-message">{errors.phone}</div>}
                            </div>

                             <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    defaultValue={initialData?.email}
                                    placeholder="Contact Email"
                                />
                                {errors.email && <div className="error-message">{errors.email}</div>}
                            </div>

                             <div className="form-group">
                                <label>Website</label>
                                <input
                                    type="url"
                                    name="website"
                                    defaultValue={initialData?.website}
                                    placeholder="https://example.com"
                                />
                                {errors.website && <div className="error-message">{errors.website}</div>}
                            </div>

                            <div className="form-group checkbox-group full-width">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="is_regulated"
                                        value="1"
                                        defaultChecked={initialData ? initialData.is_regulated : true}
                                    />
                                    Is Regulated
                                </label>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={onBack}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary">
                                {isEdit ? 'Update Broker' : 'Create Broker'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

const Brokers = () => {
    const { brokers, countries, filters } = usePage().props;
    const [mode, setMode] = useState('view'); // view, create, edit
    const [currentBroker, setCurrentBroker] = useState(null);

    const handleCreate = () => {
        setCurrentBroker(null);
        setMode('create');
    };

    const handleEdit = (broker) => {
        setCurrentBroker(broker);
        setMode('edit');
    };

    const handleBack = () => {
        setMode('view');
        setCurrentBroker(null);
    };

    const handleSubmit = (data) => {
        if (mode === 'create') {
            router.post(route('admin.investing-stack.brokers.store'), data, {
                onSuccess: () => setMode('view'),
            });
        } else if (mode === 'edit') {
            router.put(route('admin.investing-stack.brokers.update', currentBroker.id), data, {
                onSuccess: () => setMode('view'),
            });
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this broker?')) {
            router.delete(route('admin.investing-stack.brokers.destroy', id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Brokers Management" />
            <div className="brokers-container">
                <div className="page-header">
                    <h1>Brokers Management</h1>
                </div>

                {mode === 'view' ? (
                    <ViewSection 
                        brokers={brokers} 
                        filters={filters}
                        onCreate={handleCreate} 
                        onEdit={handleEdit} 
                        onDelete={handleDelete}
                    />
                ) : (
                    <FormSection 
                        mode={mode} 
                        initialData={currentBroker} 
                        countries={countries}
                        onBack={handleBack} 
                        onSubmit={handleSubmit}
                    />
                )}
            </div>
        </AdminLayout>
    );
};

export default Brokers;
