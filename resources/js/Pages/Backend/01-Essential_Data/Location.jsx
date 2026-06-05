import React, { useState, useCallback, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import { toast } from 'react-toastify';
import axios from 'axios';

// Components
import LocationsHeader from '@/Components/Locations/LocationsHeader';
import LocationsTable from '@/Components/Locations/LocationsTable';
import LocationsTree from '@/Components/Locations/LocationsTree';

// Hooks
import { useCodeGenerator } from '@/Hooks/useCodeGenerator';

const LocationManager = ({ initialRootLocations }) => {
    const [currentParent, setCurrentParent] = useState(null);
    const [locations, setLocations] = useState(initialRootLocations?.data ?? initialRootLocations ?? []);
    const [treeData, setTreeData] = useState([]);
    const [activeNode, setActiveNode] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        parent_id: null,
        location_type: 'country',
        name_json: { ar: '', en: '' },
        status: true,
        sort_order: 0,
        code: ''
    });

    const locale = document.documentElement.lang || 'ar';
    const { generateCode } = useCodeGenerator();

    // Initialize Tree Data with roots
    useEffect(() => {
        if (initialRootLocations) {
            setTreeData(initialRootLocations.data ?? initialRootLocations);
        }
    }, [initialRootLocations]);

    // Tree building helper (Recursive function to update tree nodes with children)
    const updateTreeData = useCallback((list, id, children) => {
        return list.map(node => {
            if (node.id === id) {
                return { ...node, children };
            }
            if (node.children) {
                return { ...node, children: updateTreeData(node.children, id, children) };
            }
            return node;
        });
    }, []);

    const loadLevel = useCallback(async (parentId = null) => {
        setLoading(true);
        try {
            if (parentId === null) {
                const { data } = await axios.get(route('api.locations.roots'));
                const roots = data.data ?? data;
                setLocations(roots);
                setTreeData(roots);
                setCurrentParent(null);
            } else {
                const { data } = await axios.get(route('api.locations.children', parentId));
                const childList = data.children?.data ?? data.children ?? [];
                setLocations(childList);
                setCurrentParent(data.parent);
                
                // Update tree data with newly fetched children
                setTreeData(prev => updateTreeData(prev, parentId, childList));
            }
        } catch {
            toast.error('Failed to load locations');
        } finally {
            setLoading(false);
        }
    }, [updateTreeData]);

    const handleSearch = useCallback(async (term) => {
        if (term.trim().length > 1) {
            setLoading(true);
            try {
                const { data } = await axios.get(route('api.locations.search', { search: term }));
                setLocations(data.data ?? data);
            } catch {
                toast.error('Search failed');
            } finally {
                setLoading(false);
            }
        } else if (term.trim().length === 0) {
            loadLevel(currentParent?.id || null);
        }
    }, [currentParent, loadLevel]);

    const handleSelectNode = useCallback((node) => {
        setActiveNode(node);
        loadLevel(node.id);
    }, [loadLevel]);

    const handleAdd = useCallback(() => {
        setIsEditing(false);
        const nextType = currentParent ? getNextType(currentParent.location_type) : 'country';
        setFormData({
            parent_id: currentParent?.id || null,
            location_type: nextType,
            name_json: { ar: '', en: '' },
            status: true,
            sort_order: locations.length + 1,
            code: generateCode(currentParent, locations)
        });
        setShowForm(true);
    }, [currentParent, locations, generateCode]);

    const handleEdit = useCallback((node) => {
        setIsEditing(true);
        setActiveNode(node);
        setFormData({
            parent_id: node.parent_id,
            location_type: node.location_type,
            name_json: node.name_json || { ar: '', en: '' },
            status: node.status,
            sort_order: node.sort_order || 0,
            code: node.code
        });
        setShowForm(true);
    }, []);

    const handleDelete = useCallback(async (node) => {
        if (window.confirm(locale === 'ar' ? 'هل أنت متأكد من حذف هذا الموقع؟' : 'Are you sure you want to delete this location?')) {
            try {
                await axios.delete(route('api.locations.destroy', node.id));
                toast.success(locale === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully');
                loadLevel(currentParent?.id || null);
            } catch {
                toast.error('Delete failed');
            }
        }
    }, [currentParent, loadLevel, locale]);

    const getNextType = (type) => {
        const map = { 'country': 'state', 'state': 'city', 'city': 'district', 'district': 'area' };
        return map[type] || 'country';
    };

    return (
        <AdminLayout activeMenu="Location">
            <Head title={locale === 'ar' ? 'دليل المواقع' : 'Locations Directory'} />

            <div className={`locations-page ${locale === 'ar' ? 'rtl' : 'ltr'}`} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                <div className="locations-page__header">
                    <LocationsHeader 
                        onSearch={handleSearch}
                        onAdd={handleAdd}
                        locale={locale}
                    />
                </div>

                <div className="locations-page__grid">
                    <div className="locations-page__list-card">
                        <LocationsTable 
                            locations={locations}
                            activeNode={activeNode}
                            onSelect={handleSelectNode}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            locale={locale}
                        />
                    </div>

                    <div className="locations-page__tree-card">
                        <LocationsTree 
                            treeData={treeData}
                            activeNode={activeNode}
                            onSelect={handleSelectNode}
                            locale={locale}
                        />
                    </div>
                </div>

                {/* Form Popup */}
                {showForm && (
                    <div className="location-popup">
                        <div className="location-popup__content">
                            <div className="location-popup__header">
                                <h3>
                                    {isEditing ? (locale === 'ar' ? 'تعديل موقع' : 'Edit Location') : (locale === 'ar' ? 'إضافة موقع جديد' : 'Add New Location')}
                                </h3>
                                <button onClick={() => setShowForm(false)} className="close-btn">
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            </div>
                            
                            <form className="location-popup__body" onSubmit={async (e) => {
                                e.preventDefault();
                                setLoading(true);
                                try {
                                    if (isEditing) {
                                        await axios.put(route('api.locations.update', activeNode.id), formData);
                                    } else {
                                        await axios.post(route('api.locations.store'), formData);
                                    }
                                    toast.success(locale === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully');
                                    setShowForm(false);
                                    loadLevel(currentParent?.id || null);
                                } catch (error) {
                                    toast.error(error.response?.data?.message || 'Error saving');
                                } finally {
                                    setLoading(false);
                                }
                            }}>
                                <div className="form-group">
                                    <label>{locale === 'ar' ? 'الاسم بالعربية' : 'Arabic Name'}</label>
                                    <input 
                                        type="text" 
                                        value={formData.name_json.ar}
                                        onChange={e => setFormData({ ...formData, name_json: { ...formData.name_json, ar: e.target.value } })}
                                        dir="rtl"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>{locale === 'ar' ? 'الاسم بالإنجليزية' : 'English Name'}</label>
                                    <input 
                                        type="text" 
                                        value={formData.name_json.en}
                                        onChange={e => setFormData({ ...formData, name_json: { ...formData.name_json, en: e.target.value } })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <div className="grid-row">
                                        <div>
                                            <label>{locale === 'ar' ? 'النوع' : 'Type'}</label>
                                            <select 
                                                value={formData.location_type}
                                                onChange={e => setFormData({ ...formData, location_type: e.target.value })}
                                                disabled={isEditing}
                                            >
                                                <option value="country">Country</option>
                                                <option value="state">State</option>
                                                <option value="city">City</option>
                                                <option value="district">District</option>
                                                <option value="area">Area</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label>{locale === 'ar' ? 'الكود' : 'Code'}</label>
                                            <input 
                                                type="text" 
                                                className="bg-gray-50"
                                                value={formData.code}
                                                readOnly
                                            />
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="location-popup__footer">
                                    <button 
                                        type="submit"
                                        disabled={loading}
                                        className="btn btn--primary"
                                    >
                                        {loading ? (locale === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (locale === 'ar' ? 'حفظ' : 'Save')}
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="btn btn--secondary"
                                    >
                                        {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            </div>
        </AdminLayout>
    );
};

export default LocationManager;
