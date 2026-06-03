import React, { useState, useCallback, useRef } from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import { toast } from 'react-toastify';
import axios from 'axios';

// Framework Hooks
import { useCodeGenerator } from '../../../Hooks/useCodeGenerator';

// Helper functions
const getNextLocationType = (type) => {
    const map = {
        'country': 'state',
        'state': 'city',
        'city': 'district',
        'district': 'area',
        'area': null
    };
    return map[type] ?? null;
};

const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};

const LocationManager = ({ initialRootLocations }) => {
    console.log('[LocationManager] initialRootLocations:', initialRootLocations);
    const [currentParent, setCurrentParent] = useState(null);
    const [children, setChildren] = useState(initialRootLocations?.data ?? initialRootLocations ?? []);
    const [activeNode, setActiveNode] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    const [formData, setFormData] = useState({
        parent_id: null,
        location_type: 'country',
        name_json: { ar: '', en: '' },
        status: true,
        sort_order: 0,
        code: ''
    });
    const [formErrors, setFormErrors] = useState({});

    // Cache to avoid duplicate API calls
    const locationChildrenCache = useRef({});

    const { generateCode } = useCodeGenerator();
    const locale = document.documentElement.lang || 'ar';
    const locationTypes = ['country', 'state', 'city', 'district', 'area'];

    // Load locations either from cache or API
    const loadLocations = useCallback(async (parentId = null) => {
        if (parentId === null) {
            if (locationChildrenCache.current['root']) {
                return locationChildrenCache.current['root'];
            }
            const { data } = await axios.get(route('api.locations.roots'));
            const result = data?.data ?? data;
            locationChildrenCache.current['root'] = result;
            return result;
        } else {
            if (locationChildrenCache.current[parentId]) {
                return locationChildrenCache.current[parentId];
            }
            const { data } = await axios.get(route('api.locations.children', parentId));
            const result = { parent: data.parent, children: data.children?.data ?? data.children ?? [] };
            locationChildrenCache.current[parentId] = result;
            return result;
        }
    }, []);

    const navigateToLocation = useCallback(async (location) => {
        if (!location) {
            setCurrentParent(null);
            const locations = await loadLocations(null);
            setChildren(locations);
            setActiveNode(null);
        } else {
            const { parent, children: childLocations } = await loadLocations(location.id);
            setCurrentParent(parent || location);
            setChildren(childLocations);
            setActiveNode(null);
        }
    }, [loadLocations]);

    const navigateBack = useCallback(async () => {
        if (!currentParent) return;
        
        const parentId = currentParent.parent_id;
        
        if (!parentId) {
            setCurrentParent(null);
            const locations = await loadLocations(null);
            setChildren(locations);
        } else {
            const { parent, children: childLocations } = await loadLocations(parentId);
            setCurrentParent(parent);
            setChildren(childLocations);
        }
        setActiveNode(null);
    }, [currentParent, loadLocations]);

    const handleAction = useCallback(async (action, node) => {
        if (action === 'add_root') {
            setIsEditing(false);
            setActiveNode(null);
            setFormData({
                parent_id: null,
                location_type: 'country',
                name_json: { ar: '', en: '' },
                status: true,
                sort_order: 0,
                code: generateCode(null, children)
            });
            setActiveTab('general');
            setFormErrors({});
            setShowForm(true);
        } else if (action === 'add_child') {
            setIsEditing(false);
            const nextType = getNextLocationType(node.location_type);
            if (!nextType) return;
            
            setActiveNode(null);
            setFormData({
                parent_id: node.id,
                location_type: nextType,
                name_json: { ar: '', en: '' },
                status: true,
                sort_order: (node.children_count ?? 0) + 1,
                code: generateCode(node, [])
            });
            setActiveTab('general');
            setFormErrors({});
            setShowForm(true);
        } else if (action === 'edit') {
            setIsEditing(true);
            setActiveNode(node);
            setFormData({
                parent_id: node.parent_id,
                location_type: node.location_type,
                name_json: node.name_json ?? { ar: '', en: '' },
                status: node.status,
                sort_order: node.sort_order ?? 0,
                code: node.code
            });
            setActiveTab('general');
            setFormErrors({});
            setShowForm(true);
        } else if (action === 'delete') {
            if (window.confirm('Are you sure you want to delete this location? All sub-locations will also be deleted.')) {
                try {
                    await axios.delete(route('api.locations.destroy', node.id));
                    toast.success('Location deleted successfully');
                    locationChildrenCache.current = {};
                    await navigateToLocation(currentParent);
                } catch {
                    toast.error('Failed to delete location');
                }
            }
        } else if (action === 'activate' || action === 'deactivate') {
            try {
                await axios.put(route('api.locations.update', node.id), {
                    ...node,
                    status: action === 'activate'
                });
                toast.success(`Location ${action === 'activate' ? 'activated' : 'deactivated'}`);
                await navigateToLocation(currentParent);
            } catch {
                toast.error('Failed to update status');
            }
        }
    }, [children, generateCode, currentParent, navigateToLocation]);

    const handleCancel = () => {
        setShowForm(false);
        setActiveNode(null);
        setIsEditing(false);
        setFormErrors({});
    };

    const validateForm = () => {
        const errors = {};
        if (!formData.name_json.ar?.trim()) {
            errors.ar = 'Arabic name is required';
        }
        if (!formData.name_json.en?.trim()) {
            errors.en = 'English name is required';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            if (isEditing) {
                await axios.put(route('api.locations.update', activeNode.id), formData);
                toast.success('Location updated successfully');
            } else {
                await axios.post(route('api.locations.store'), formData);
                toast.success('Location created successfully');
            }
            setShowForm(false);
            locationChildrenCache.current = {};
            await navigateToLocation(currentParent);
        } catch (error) {
            toast.error(error.response?.data?.message ?? 'Error saving location');
        } finally {
            setLoading(false);
        }
    };

    const getPageTitle = () => {
        if (!currentParent) {
            return 'Geographic Hierarchy';
        }
        return currentParent.name_json?.[locale === 'ar' ? 'ar' : 'en'] ?? currentParent.name;
    };

    const getAddButtonLabel = () => {
        if (!currentParent) {
            return 'Add Country';
        }
        const nextType = getNextLocationType(currentParent.location_type);
        if (!nextType) return null;
        return `Add ${capitalize(nextType)}`;
    };

    const addButtonLabel = getAddButtonLabel();

    return (
        <AdminLayout activeMenu="Location">
            <Head title="Geographic Hierarchy Manager" />

            <div className="hierarchy-manager d-flex">
                {/* Tree Panel */}
                <div 
                    className={`hierarchy-tree-panel ${showForm ? 'form-open' : 'form-closed'}`}
                >
                    <div className="panel-header">
                        <h3>{getPageTitle()}</h3>
                    </div>

                    <div className="p-3 border-bottom">
                        <div className="d-flex align-items-center">
                            {currentParent && (
                                <button
                                    className="btn btn-light btn-sm"
                                    onClick={navigateBack}
                                >
                                    <i className="fas fa-arrow-left me-1"></i> Back
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="tree-content d-flex flex-column">
                        {children.map(node => (
                            <div
                                key={node.id}
                                className={`tree-row ${activeNode?.id === node.id ? 'active' : ''}`}
                                onClick={() => {
                                    setActiveNode(node);
                                    navigateToLocation(node);
                                }}
                            >
                                <div className="child-connector-line"></div>
                                <div className="row-id">#{node.id}</div>
                                <div className="row-icon">
                                    <i className={((node.children_count ?? 0) > 0) ? 'fas fa-folder' : 'far fa-folder'}></i>
                                </div>
                                <div className="row-label">
                                    <span className="main-text">
                                        {node.name_json?.[locale === 'ar' ? 'ar' : 'en'] ?? node.name}
                                    </span>
                                    <span className="sub-text">({node.location_type})</span>
                                </div>
                                <div className="row-meta">
                                    <span className="badge">{node.children_count ?? 0}</span>
                                    <span className="ms-1">ITEMS</span>
                                </div>
                                <div className="row-actions">
                                    <div className="hierarchy-dropdown">
                                        <button
                                            className="dropdown-toggle-btn"
                                            type="button"
                                            title="Actions"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleAction('edit', node);
                                            }}
                                        >
                                            <i className="fas fa-ellipsis-v"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {addButtonLabel && (
                            <div
                                className="add-new-node-btn"
                                onClick={() => {
                                    if (!currentParent) {
                                        handleAction('add_root');
                                    } else {
                                        handleAction('add_child', currentParent);
                                    }
                                }}
                            >
                                <i className={`fas fa-plus-square ${locale === 'ar' ? 'ms-1' : 'me-1'}`}></i>
                                {addButtonLabel}
                            </div>
                        )}

                        {children.length === 0 && (
                            <div className="text-center py-5">
                                <i className="fas fa-sitemap d-block mb-3 text-muted"></i>
                                <p className="mb-3 text-muted">{locale === 'ar' ? 'لا توجد مواقع' : 'No Locations Found'}</p>
                                {addButtonLabel && (
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => {
                                            if (!currentParent) {
                                                handleAction('add_root');
                                            } else {
                                                handleAction('add_child', currentParent);
                                            }
                                        }}
                                    >
                                        {addButtonLabel}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Form Panel */}
                {showForm && (
                    <div className="form-panel">
                        {/* Form Header */}
                        <div className="p-4 border-bottom">
                            <div className="d-flex justify-content-between align-items-center">
                                <h4 className="mb-0 fw-bold">
                                    <i className={`fas fa-${isEditing ? 'edit' : 'plus'} me-2`}></i>
                                    {isEditing ? 'Edit Location' : 'Add New Location'}
                                </h4>
                                <button 
                                    className="btn btn-light btn-sm"
                                    onClick={handleCancel}
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="d-flex border-bottom bg-white px-4">
                            {['general', 'translations', 'advanced'].map(tab => (
                                <button
                                    key={tab}
                                    className={`px-4 py-3 border-0 bg-transparent text-decoration-none fw-semibold ${activeTab === tab ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>

                        {/* Form Content */}
                        <div className="p-4 overflow-auto">
                            {activeTab === 'general' && (
                                <div className="card border shadow-sm mb-4">
                                    <div className="card-body">
                                        <div className="row g-3">
                                            <div className="col-md-12">
                                                <div className="form-group">
                                                    <label className="form-label fw-semibold">Location Type</label>
                                                    <select
                                                        className={`form-select ${formErrors.location_type ? 'is-invalid' : ''}`}
                                                        value={formData.location_type}
                                                        disabled={isEditing}
                                                        onChange={e => setFormData({ ...formData, location_type: e.target.value })}
                                                    >
                                                        {locationTypes.map(t => (
                                                            <option key={t} value={t}>{t.toUpperCase()}</option>
                                                        ))}
                                                    </select>
                                                    {formErrors.location_type && (
                                                        <div className="invalid-feedback">{formErrors.location_type}</div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="col-md-12">
                                                <div className="form-group">
                                                    <label className="form-label fw-semibold">
                                                        System Code
                                                        <span className="ms-2 badge bg-info text-white">Auto-generated</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="form-control bg-light"
                                                        value={formData.code}
                                                        readOnly
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="form-group">
                                                    <label className="form-label fw-semibold">Sort Order</label>
                                                    <input
                                                        type="number"
                                                        className={`form-control ${formErrors.sort_order ? 'is-invalid' : ''}`}
                                                        value={formData.sort_order}
                                                        onChange={e => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                                                    />
                                                    {formErrors.sort_order && (
                                                        <div className="invalid-feedback">{formErrors.sort_order}</div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="col-md-6 d-flex align-items-end">
                                                <div className="form-group w-100">
                                                    <div className="form-check form-switch">
                                                        <input
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            role="switch"
                                                            id="statusSwitch"
                                                            checked={formData.status}
                                                            onChange={e => setFormData({ ...formData, status: e.target.checked })}
                                                        />
                                                        <label className="form-check-label ms-2 fw-semibold" htmlFor="statusSwitch">Active Status</label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'translations' && (
                                <div className="card border shadow-sm mb-4">
                                    <div className="card-body">
                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <div className="form-group">
                                                    <label className="form-label fw-semibold">
                                                        <i className="fas fa-flag me-2"></i>
                                                        Arabic Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className={`form-control font-arabic text-end ${formErrors.ar ? 'is-invalid' : ''}`}
                                                        dir="rtl"
                                                        value={formData.name_json.ar}
                                                        onChange={e => setFormData({
                                                            ...formData,
                                                            name_json: { ...formData.name_json, ar: e.target.value }
                                                        })}
                                                        placeholder="Enter Arabic name"
                                                    />
                                                    {formErrors.ar && (
                                                        <div className="invalid-feedback">{formErrors.ar}</div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="form-group">
                                                    <label className="form-label fw-semibold">
                                                        <i className="fas fa-flag-usa me-2"></i>
                                                        English Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className={`form-control ${formErrors.en ? 'is-invalid' : ''}`}
                                                        value={formData.name_json.en}
                                                        onChange={e => setFormData({
                                                            ...formData,
                                                            name_json: { ...formData.name_json, en: e.target.value }
                                                        })}
                                                        placeholder="Enter English name"
                                                    />
                                                    {formErrors.en && (
                                                        <div className="invalid-feedback">{formErrors.en}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'advanced' && (
                                <div className="card border shadow-sm mb-4">
                                    <div className="card-body">
                                        <div className="alert alert-light border small">
                                            <p className="mb-1"><strong>Parent ID:</strong> {formData.parent_id ?? 'ROOT'}</p>
                                            <p className="mb-0 text-muted">Additional settings for hierarchical relationships can be configured here in the future.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Form Footer */}
                        <div className="p-4 border-top bg-white">
                            <button 
                                className="btn btn-light px-4"
                                onClick={handleCancel}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn btn-primary px-4"
                                onClick={handleSubmit}
                                disabled={loading}
                            >
                                {loading ? <i className="fas fa-spinner fa-spin me-2"></i> : null}
                                Save Changes
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default LocationManager;
