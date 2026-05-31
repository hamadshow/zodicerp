import React, { useState, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import { toast } from 'react-toastify';
import axios from 'axios';

// Hierarchy Framework Components
import HierarchyManager from '../../../Components/Hierarchy/HierarchyManager';
import HierarchyFormDrawer from '../../../Components/Hierarchy/HierarchyFormDrawer';

// Framework Hooks
import { useHierarchy } from '../../../hooks/useHierarchy';
import { useCodeGenerator } from '../../../hooks/useCodeGenerator';

const LocationManager = ({ initialLocations }) => {
    const fetchChildren = useCallback(async (parentId) => {
        try {
            const response = await axios.get(route('api.locations.index'), {
                params: { parent_id: parentId }
            });
            return response.data.data;
        } catch (error) {
            console.error('Error fetching children:', error);
            return [];
        }
    }, []);

    const hierarchy = useHierarchy(initialLocations.data, {
        onFetchChildren: fetchChildren
    });
    const { generateCode } = useCodeGenerator();
    
    const [loading, setLoading] = useState(false);
    const [showDrawer, setShowDrawer] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        parent_id: null,
        location_type: 'country',
        name_json: { ar: '', en: '' },
        status: true,
        sort_order: 0,
        code: ''
    });

    const locationTypes = ['country', 'state', 'city', 'district', 'area'];

    const config = {
        canAddRoot: true,
        getAddRootLabel: () => '+ Add Country',
        canAddChild: (node) => {
            const idx = locationTypes.indexOf(node.location_type);
            return idx !== -1 && idx < locationTypes.length - 1;
        },
        getAddChildLabel: (node) => {
            const idx = locationTypes.indexOf(node.location_type);
            const nextType = locationTypes[idx + 1];
            return `+ Add ${nextType.charAt(0).toUpperCase() + nextType.slice(1)}`;
        }
    };

    const handleAction = useCallback(async (action, node) => {
        if (action === 'add_root') {
            setIsEditing(false);
            setFormData({
                parent_id: null,
                location_type: 'country', // Correct type for root
                name_json: { ar: '', en: '' },
                status: true,
                sort_order: 0,
                code: generateCode(null, hierarchy.data.filter(n => !n.parent_id))
            });
            setShowDrawer(true);
        } else if (action === 'add_child') {
            setIsEditing(false);
            const idx = locationTypes.indexOf(node.location_type);
            const nextType = locationTypes[idx + 1] || 'area';
            setFormData({
                parent_id: node.id,
                location_type: nextType, // Correctly assign the next type in hierarchy
                name_json: { ar: '', en: '' },
                status: true,
                sort_order: (node.children?.length || 0) + 1,
                code: generateCode(node, node.children || [])
            });
            setShowDrawer(true);
        } else if (action === 'edit') {
            setIsEditing(true);
            setFormData({
                parent_id: node.parent_id,
                location_type: node.location_type,
                name_json: node.name_json || { ar: '', en: '' },
                status: node.status,
                sort_order: node.sort_order || 0,
                code: node.code
            });
            setShowDrawer(true);
        } else if (action === 'delete') {
            if (window.confirm('Are you sure you want to delete this location? All sub-locations will also be deleted.')) {
                try {
                    await axios.delete(route('api.locations.destroy', node.id));
                    toast.success('Location deleted successfully');
                    window.location.reload();
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
                window.location.reload();
            } catch {
                toast.error('Failed to update status');
            }
        } else if (action === 'expand_all') {
            hierarchy.expandAll(hierarchy.rawData);
        } else if (action === 'collapse_all') {
            hierarchy.collapseAll();
        }
    }, [hierarchy, generateCode]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEditing) {
                await axios.put(route('api.locations.update', hierarchy.selectedNode.id), formData);
                toast.success('Location updated successfully');
            } else {
                await axios.post(route('api.locations.store'), formData);
                toast.success('Location created successfully');
            }
            setShowDrawer(false);
            window.location.reload();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving location');
        } finally {
            setLoading(false);
        }
    };

    const locale = document.documentElement.lang || 'ar';

    return (
        <AdminLayout activeMenu="Location">
            <Head title="Geographic Hierarchy Manager" />
            
            <HierarchyManager 
                title="Geographic Hierarchy"
                data={hierarchy.data}
                expandedNodes={hierarchy.expandedNodes}
                onToggle={hierarchy.toggleNode}
                onSelect={hierarchy.selectNode}
                selectedNodes={hierarchy.selectedNodes}
                activeNode={hierarchy.activeNode}
                config={config}
                onAction={handleAction}
                searchQuery={hierarchy.searchQuery}
                onSearchChange={hierarchy.setSearchQuery}
                filters={hierarchy.filters}
                onFilterChange={hierarchy.updateFilters}
                locale={locale}
            />

            <HierarchyFormDrawer
                isOpen={showDrawer}
                onClose={() => setShowDrawer(false)}
                title={isEditing ? 'Edit Location' : 'Add New Location'}
                onSubmit={handleSubmit}
                loading={loading}
                tabs={[
                    { id: 'general', label: 'General' },
                    { id: 'translations', label: 'Translations' },
                    { id: 'advanced', label: 'Advanced' }
                ]}
            >
                {(activeTab) => (
                    <div className="hm-form-content">
                        {activeTab === 'general' && (
                            <>
                                <div className="form-group">
                                    <label>Location Type</label>
                                    <select 
                                        className="form-control"
                                        value={formData.location_type}
                                        disabled={isEditing}
                                        onChange={e => setFormData({ ...formData, location_type: e.target.value })}
                                    >
                                        {locationTypes.map(t => (
                                            <option key={t} value={t}>{t.toUpperCase()}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>System Code</label>
                                    <input 
                                        type="text" 
                                        className="form-control bg-light" 
                                        value={formData.code}
                                        readOnly
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Sort Order</label>
                                    <input 
                                        type="number" 
                                        className="form-control"
                                        value={formData.sort_order}
                                        onChange={e => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div className="form-check form-switch mt-3">
                                    <input 
                                        className="form-check-input" 
                                        type="checkbox" 
                                        checked={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.checked })}
                                    />
                                    <label className="form-check-label ms-2">Active Status</label>
                                </div>
                            </>
                        )}

                        {activeTab === 'translations' && (
                            <>
                                <div className="form-group">
                                    <label>Arabic Name</label>
                                    <input 
                                        type="text" 
                                        className="form-control font-arabic text-end"
                                        dir="rtl"
                                        value={formData.name_json.ar}
                                        onChange={e => setFormData({
                                            ...formData,
                                            name_json: { ...formData.name_json, ar: e.target.value }
                                        })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>English Name</label>
                                    <input 
                                        type="text" 
                                        className="form-control"
                                        value={formData.name_json.en}
                                        onChange={e => setFormData({
                                            ...formData,
                                            name_json: { ...formData.name_json, en: e.target.value }
                                        })}
                                    />
                                </div>
                            </>
                        )}

                        {activeTab === 'advanced' && (
                            <div className="alert alert-light border small">
                                <p className="mb-1"><strong>Parent ID:</strong> {formData.parent_id || 'ROOT'}</p>
                                <p className="mb-0 text-muted">Additional settings for hierarchical relationships can be configured here in the future.</p>
                            </div>
                        )}
                    </div>
                )}
            </HierarchyFormDrawer>
        </AdminLayout>
    );
};

export default LocationManager;
