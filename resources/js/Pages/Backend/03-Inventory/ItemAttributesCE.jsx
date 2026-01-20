import React from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/ProductsCE.css';

const ItemAttributesCE = ({ attribute = null }) => {
    const isEdit = !!attribute;
    
    const { data, setData, post, put, processing, errors } = useForm({
        title: attribute?.title || '',
        display_layout: attribute?.display_layout || 'dropdown',
        status: attribute?.status || 'published',
        order: attribute?.order || 0,
        is_searchable: attribute?.is_searchable ?? true,
        is_comparable: attribute?.is_comparable ?? true,
        is_use_in_product_listing: attribute?.is_use_in_product_listing ?? false,
        use_image_from_product_variation: attribute?.use_image_from_product_variation ?? false,
        details: attribute?.details || [],
    });

    const submitWithAction = () => {
        if (isEdit) {
            put(route('admin.item-attributes.update', attribute.id));
        } else {
            post(route('admin.item-attributes.store'));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        submitWithAction('save');
    };

    const handleAddDetail = () => {
        setData('details', [
            ...data.details,
            {
                id: null,
                title: '',
                color: '#ffffff',
                image: '',
                is_default: false,
                order: data.details.length
            }
        ]);
    };

    const handleRemoveDetail = (index) => {
        const newDetails = [...data.details];
        newDetails.splice(index, 1);
        setData('details', newDetails);
    };

    const handleDetailChange = (index, field, value) => {
        const newDetails = [...data.details];
        newDetails[index][field] = value;
        setData('details', newDetails);
    };

    const handleDefaultChange = (index) => {
        const newDetails = data.details.map((detail, i) => ({
            ...detail,
            is_default: i === index
        }));
        setData('details', newDetails);
    };

    const pageTitle = isEdit ? 'Edit Attribute' : 'Create New Attribute';

    return (
        <AdminLayout activeMenu="Inventory">
            <Head title={`${pageTitle} - ZodicERP`} />
            
            <div className="products-ce-page">
                <div className="breadcrumb">
                    <Link href={route('admin')}>Dashboard</Link>
                    <span>/</span>
                    <a href="#">Inventory</a>
                    <span>/</span>
                    <Link href={route('admin.item-attributes.index')}>Item Attributes</Link>
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
                                        {/* Title */}
                                        <div className="form-group">
                                            <label className="form-label">Attribute Title <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                                                value={data.title}
                                                onChange={e => setData('title', e.target.value)}
                                                placeholder="e.g. Color, Size, Material"
                                            />
                                            {errors.title && <div className="invalid-feedback text-error">{errors.title}</div>}
                                        </div>
                                    </div>
                                </div>

                                {/* Attributes List Section */}
                                <div className="products-section-card">
                                    <div className="products-section-header flex justify-between items-center">
                                        <h4 className="products-section-title">Attributes list</h4>
                                        <button 
                                            type="button" 
                                            className="btn btn-outline"
                                            onClick={handleAddDetail}
                                        >
                                            Add new attribute
                                        </button>
                                    </div>
                                    <div className="products-section-content">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase">
                                                        <th className="py-2 px-3">#</th>
                                                        <th className="py-2 px-3">Is Default?</th>
                                                        <th className="py-2 px-3 w-1/3">Title</th>
                                                        <th className="py-2 px-3">Color</th>
                                                        <th className="py-2 px-3">Image</th>
                                                        <th className="py-2 px-3 text-center">Remove</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {data.details.map((detail, index) => (
                                                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                                                            <td className="py-3 px-3">{index + 1}</td>
                                                            <td className="py-3 px-3">
                                                                <input
                                                                    type="radio"
                                                                    name="default_attribute"
                                                                    checked={detail.is_default}
                                                                    onChange={() => handleDefaultChange(index)}
                                                                    className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                                                                />
                                                            </td>
                                                            <td className="py-3 px-3">
                                                                <input
                                                                    type="text"
                                                                    className="form-control"
                                                                    value={detail.title}
                                                                    onChange={(e) => handleDetailChange(index, 'title', e.target.value)}
                                                                    placeholder="Value title"
                                                                />
                                                            </td>
                                                            <td className="py-3 px-3">
                                                                <input
                                                                    type="color"
                                                                    className="h-9 w-16 p-1 rounded border border-gray-300"
                                                                    value={detail.color || '#ffffff'}
                                                                    onChange={(e) => handleDetailChange(index, 'color', e.target.value)}
                                                                />
                                                            </td>
                                                            <td className="py-3 px-3">
                                                                {/* Image Placeholder - simplified for now */}
                                                                <div className="w-9 h-9 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-gray-400">
                                                                    <span className="material-icons-outlined text-sm">image</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-3 text-center">
                                                                <button
                                                                    type="button"
                                                                    className="text-red-500 hover:text-red-700"
                                                                    onClick={() => handleRemoveDetail(index)}
                                                                >
                                                                    <span className="material-icons-outlined">delete_outline</span>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {data.details.length === 0 && (
                                                        <tr>
                                                            <td colSpan="6" className="py-4 text-center text-gray-500">
                                                                No attributes added yet. Click "Add new attribute" to start.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
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
                                            <Link href={route('admin.item-attributes.index')} className="btn btn-outline w-full text-center block">
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
                                        <h4 className="sidebar-card-title">Display Layout <span className="text-red-500">*</span></h4>
                                    </div>
                                    <div className="sidebar-card-body">
                                        <select
                                            className={`form-control ${errors.display_layout ? 'is-invalid' : ''}`}
                                            value={data.display_layout}
                                            onChange={e => setData('display_layout', e.target.value)}
                                        >
                                            <option value="dropdown">Dropdown</option>
                                            <option value="visual">Visual Swatch</option>
                                            <option value="text">Text Swatch</option>
                                            <option value="image">Image Swatch</option>
                                        </select>
                                        {errors.display_layout && <div className="invalid-feedback text-error">{errors.display_layout}</div>}
                                    </div>
                                </div>

                                <div className="sidebar-card">
                                    <div className="sidebar-card-header">
                                        <h4 className="sidebar-card-title">Configuration</h4>
                                    </div>
                                    <div className="sidebar-card-body">
                                        <div className="form-check mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Searchable</label>
                                            <label className="toggle-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={data.is_searchable}
                                                    onChange={e => setData('is_searchable', e.target.checked)}
                                                />
                                                <span className="toggle-slider" />
                                            </label>
                                        </div>

                                        <div className="form-check mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Comparable</label>
                                            <label className="toggle-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={data.is_comparable}
                                                    onChange={e => setData('is_comparable', e.target.checked)}
                                                />
                                                <span className="toggle-slider" />
                                            </label>
                                        </div>

                                        <div className="form-check mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Used in product listing</label>
                                            <label className="toggle-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={data.is_use_in_product_listing}
                                                    onChange={e => setData('is_use_in_product_listing', e.target.checked)}
                                                />
                                                <span className="toggle-slider" />
                                            </label>
                                        </div>

                                        <div className="form-check">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Use Image from Variation</label>
                                            <label className="toggle-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={data.use_image_from_product_variation}
                                                    onChange={e => setData('use_image_from_product_variation', e.target.checked)}
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

export default ItemAttributesCE;
