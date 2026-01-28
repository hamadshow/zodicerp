import React, { useState, useEffect, useMemo } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/InvestingStack/Sectors.scss';

// --- View Section Component ---
const ViewSection = ({ sectors, onEdit, onCreate, onDelete }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredSectors, setFilteredSectors] = useState(sectors);

    // Update stats
    const stats = useMemo(() => {
        const total = filteredSectors.length;
        const active = filteredSectors.filter(s => s.is_active).length;
        const inactive = total - active;
        return { total, active, inactive };
    }, [filteredSectors]);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredSectors(sectors);
        } else {
            const lowerTerm = searchTerm.toLowerCase();
            setFilteredSectors(sectors.filter(s => 
                s.sector_name_ar.toLowerCase().includes(lowerTerm) ||
                (s.sector_name_en && s.sector_name_en.toLowerCase().includes(lowerTerm)) ||
                (s.sector_code && s.sector_code.toLowerCase().includes(lowerTerm)) ||
                (s.gics_sector_code && s.gics_sector_code.toLowerCase().includes(lowerTerm))
            ));
        }
    }, [searchTerm, sectors]);

    return (
        <div className="animate-fade-slide">
            {/* Quick Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon blue">
                        <span className="material-icons-outlined">category</span>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.total}</span>
                        <span className="stat-label">Total Sectors</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">
                        <span className="material-icons-outlined">check_circle</span>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.active}</span>
                        <span className="stat-label">Active Sectors</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon gray">
                        <span className="material-icons-outlined">cancel</span>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.inactive}</span>
                        <span className="stat-label">Inactive Sectors</span>
                    </div>
                </div>
            </div>

            {/* Content Card */}
            <div className="content-card">
                <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                    <div className="search-box">
                        <span className="material-icons-outlined search-icon">search</span>
                        <input
                            type="text"
                            placeholder="Search sectors..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={onCreate}>
                        <span className="material-icons-outlined">add</span>
                        Add New Sector
                    </button>
                </div>

                <div className="table-responsive">
                    <table className="professional-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Name (AR)</th>
                                <th>Name (EN)</th>
                                <th>Parent Sector</th>
                                <th>GICS Code</th>
                                <th>Growth</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSectors.length > 0 ? (
                                filteredSectors.map(sector => (
                                    <tr key={sector.id}>
                                        <td>{sector.sector_code}</td>
                                        <td>{sector.sector_name_ar}</td>
                                        <td>{sector.sector_name_en || '-'}</td>
                                        <td>{sector.parent?.sector_name_ar || sector.parent?.sector_name_en || '-'}</td>
                                        <td>{sector.gics_sector_code || '-'}</td>
                                        <td>{sector.growth_outlook ? sector.growth_outlook.charAt(0).toUpperCase() + sector.growth_outlook.slice(1) : '-'}</td>
                                        <td>
                                            <span className={`status-badge ${sector.is_active ? 'active' : 'inactive'}`}>
                                                {sector.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button onClick={() => onEdit(sector)} title="Edit">
                                                    <span className="material-icons-outlined">edit</span>
                                                </button>
                                                <button className="delete-btn" onClick={() => onDelete(sector.id)} title="Delete">
                                                    <span className="material-icons-outlined">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                                        No sectors found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- Form Section Component (Used for Create & Edit) ---
const FormSection = ({ mode, initialData, parentSectors, onBack, onSubmit }) => {
    const isEdit = mode === 'edit';
    const { errors } = usePage().props;
    
    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            sector_code: formData.get('sector_code'),
            sector_name_ar: formData.get('sector_name_ar'),
            sector_name_en: formData.get('sector_name_en'),
            parent_sector_id: formData.get('parent_sector_id'),
            gics_sector_code: formData.get('gics_sector_code'),
            trbc_sector_code: formData.get('trbc_sector_code'),
            growth_outlook: formData.get('growth_outlook'),
            description_ar: formData.get('description_ar'),
            description_en: formData.get('description_en'),
            is_active: formData.get('is_active') === '1',
        };
        onSubmit(data);
    };

    return (
        <div className="animate-fade-slide">
            <div className="content-card">
                <div className="form-container">
                    <div className="form-section-title">
                        {isEdit ? 'Edit Sector' : 'Create New Sector'}
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Sector Code *</label>
                                <input
                                    type="text"
                                    name="sector_code"
                                    defaultValue={initialData?.sector_code}
                                    placeholder="e.g., SECT-001"
                                    readOnly={isEdit}
                                    style={isEdit ? { backgroundColor: '#f3f4f6' } : {}}
                                    required
                                />
                                {errors.sector_code && <div className="error-message">{errors.sector_code}</div>}
                            </div>

                            <div className="form-group">
                                <label>Parent Sector</label>
                                <select
                                    name="parent_sector_id"
                                    defaultValue={initialData?.parent_sector_id || ''}
                                >
                                    <option value="">None (Main Sector)</option>
                                    {parentSectors.map(ps => (
                                        // Avoid selecting itself as parent
                                        initialData?.id !== ps.id && (
                                            <option key={ps.id} value={ps.id}>
                                                {ps.sector_name_ar} {ps.sector_name_en ? `/ ${ps.sector_name_en}` : ''}
                                            </option>
                                        )
                                    ))}
                                </select>
                                {errors.parent_sector_id && <div className="error-message">{errors.parent_sector_id}</div>}
                            </div>

                            <div className="form-group">
                                <label>Sector Name (AR) *</label>
                                <input
                                    type="text"
                                    name="sector_name_ar"
                                    defaultValue={initialData?.sector_name_ar}
                                    placeholder="Sector Name in Arabic"
                                    required
                                />
                                {errors.sector_name_ar && <div className="error-message">{errors.sector_name_ar}</div>}
                            </div>

                            <div className="form-group">
                                <label>Sector Name (EN)</label>
                                <input
                                    type="text"
                                    name="sector_name_en"
                                    defaultValue={initialData?.sector_name_en}
                                    placeholder="Sector Name in English"
                                />
                                {errors.sector_name_en && <div className="error-message">{errors.sector_name_en}</div>}
                            </div>

                            <div className="form-group">
                                <label>GICS Sector Code</label>
                                <input
                                    type="text"
                                    name="gics_sector_code"
                                    defaultValue={initialData?.gics_sector_code}
                                    placeholder="Global Industry Classification Standard Code"
                                />
                                {errors.gics_sector_code && <div className="error-message">{errors.gics_sector_code}</div>}
                            </div>

                            <div className="form-group">
                                <label>TRBC Sector Code</label>
                                <input
                                    type="text"
                                    name="trbc_sector_code"
                                    defaultValue={initialData?.trbc_sector_code}
                                    placeholder="Thomson Reuters Business Classification Code"
                                />
                                {errors.trbc_sector_code && <div className="error-message">{errors.trbc_sector_code}</div>}
                            </div>

                            <div className="form-group">
                                <label>Growth Outlook</label>
                                <select
                                    name="growth_outlook"
                                    defaultValue={initialData?.growth_outlook || 'medium'}
                                >
                                    <option value="high">High</option>
                                    <option value="medium">Medium</option>
                                    <option value="low">Low</option>
                                </select>
                                {errors.growth_outlook && <div className="error-message">{errors.growth_outlook}</div>}
                            </div>
                            
                            <div className="form-group checkbox-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="is_active"
                                        value="1"
                                        defaultChecked={initialData ? initialData.is_active : true}
                                    />
                                    Active Status
                                </label>
                            </div>

                             <div className="form-group full-width">
                                <label>Description (AR)</label>
                                <textarea
                                    name="description_ar"
                                    defaultValue={initialData?.description_ar}
                                    rows="2"
                                    placeholder="Description in Arabic..."
                                ></textarea>
                                {errors.description_ar && <div className="error-message">{errors.description_ar}</div>}
                            </div>

                            <div className="form-group full-width">
                                <label>Description (EN)</label>
                                <textarea
                                    name="description_en"
                                    defaultValue={initialData?.description_en}
                                    rows="2"
                                    placeholder="Description in English..."
                                ></textarea>
                                {errors.description_en && <div className="error-message">{errors.description_en}</div>}
                            </div>
                        </div>

                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={onBack}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary">
                                {isEdit ? 'Update Sector' : 'Create Sector'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// --- Main Page Component ---
const Sectors = ({ sectors, parentSectors }) => {
    const [viewMode, setViewMode] = useState('list'); // 'list', 'create', 'edit'
    const [selectedSector, setSelectedSector] = useState(null);

    const handleCreate = () => {
        setSelectedSector(null);
        setViewMode('create');
    };

    const handleEdit = (sector) => {
        setSelectedSector(sector);
        setViewMode('edit');
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this sector?')) {
            router.delete(route('admin.investing-stack.sectors.destroy', id), {
                preserveScroll: true,
                onSuccess: () => {
                    // Success notification handled by flash message in layout
                }
            });
        }
    };

    const handleSubmit = (data) => {
        if (viewMode === 'edit') {
            router.put(route('admin.investing-stack.sectors.update', selectedSector.id), data, {
                onSuccess: () => setViewMode('list'),
            });
        } else {
            router.post(route('admin.investing-stack.sectors.store'), data, {
                onSuccess: () => setViewMode('list'),
            });
        }
    };

    return (
        <AdminLayout>
            <Head title="Sectors" />
            <div className="sectors-container">
                <div className="page-header-title">
                    <h1>Sectors Management</h1>
                    <p>Manage market sectors and classifications</p>
                </div>

                {viewMode === 'list' && (
                    <ViewSection
                        sectors={sectors}
                        onEdit={handleEdit}
                        onCreate={handleCreate}
                        onDelete={handleDelete}
                    />
                )}

                {(viewMode === 'create' || viewMode === 'edit') && (
                    <FormSection
                        mode={viewMode}
                        initialData={selectedSector}
                        parentSectors={parentSectors}
                        onBack={() => setViewMode('list')}
                        onSubmit={handleSubmit}
                    />
                )}
            </div>
        </AdminLayout>
    );
};

export default Sectors;
