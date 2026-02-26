import React, { useState, useEffect } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';

// Tree Item for Industries
const IndustryItem = ({ item, level = 0, selectedId, onSelect, onDelete, onDrop, onDragStart }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const draggedId = e.dataTransfer.getData('text/plain');
        if (draggedId !== String(item.id)) {
            onDrop(draggedId, item.id);
        }
    };

    const hasChildren = item.children && item.children.length > 0;
    const isSelected = selectedId === item.id;

    return (
        <div className="category-node">
            <div
                className={`category-content ${isSelected ? 'selected' : ''} ${isDragOver ? 'drag-over' : ''}`}
                draggable
                onDragStart={(e) => onDragStart(e, item.id)}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(item);
                }}
                style={{ paddingLeft: `${level * 20 + 12}px` }}
            >
                <div className="category-handle" draggable onDragStart={(e) => onDragStart(e, item.id)}>
                    <span className="material-icons-outlined">drag_indicator</span>
                </div>
                <div
                    className="category-toggle"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(!isExpanded);
                    }}
                    style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
                >
                    <span className="material-icons-outlined">
                        {isExpanded ? 'expand_more' : 'chevron_right'}
                    </span>
                </div>
                <div className="category-icon">
                    <span className="material-icons-outlined">domain</span>
                </div>
                <div className="category-info">
                    <span className="category-name">{item.industry_name_en}</span>
                    <span className="product-count">({item.sub_industries_count || item.subIndustries_count || 0})</span>
                </div>
                {isSelected && (
                    <button
                        className="delete-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(item.id);
                        }}
                        title="Delete Industry"
                    >
                        <span className="material-icons-outlined">delete</span>
                    </button>
                )}
            </div>
            {hasChildren && isExpanded && (
                <div className="category-children">
                    {item.children.map(child => (
                        <IndustryItem
                            key={child.id}
                            item={child}
                            level={level + 1}
                            selectedId={selectedId}
                            onSelect={onSelect}
                            onDelete={onDelete}
                            onDrop={onDrop}
                            onDragStart={onDragStart}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const Industries = ({ industries = [], sectors = [], parents = [] }) => {
    const [industryTree, setIndustryTree] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [isCreating, setIsCreating] = useState(true);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        industry_code: '',
        gics_industry_code: '',
        trbc_industry_code: '',
        industry_name_ar: '',
        industry_name_en: '',
        description_ar: '',
        description_en: '',
        sector_id: '',
        parent_industry_id: '',
        capital_intensity: 'medium',
        cyclicality: 'cyclical',
        regulatory_environment: 'moderately_regulated',
        average_profit_margin: '',
        average_roa: '',
        average_roe: '',
        is_active: true,
        display_order: 0,
    });

    const buildTree = React.useCallback((items) => {
        const map = {};
        const roots = [];
        items.forEach(ind => {
            map[ind.id] = { ...ind, children: [] };
        });
        items.forEach(ind => {
            if (ind.parent_industry_id && map[ind.parent_industry_id]) {
                map[ind.parent_industry_id].children.push(map[ind.id]);
            } else {
                roots.push(map[ind.id]);
            }
        });
        const sortRecursive = (nodes) => {
            nodes.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
            nodes.forEach(node => {
                if (node.children.length > 0) sortRecursive(node.children);
            });
        };
        sortRecursive(roots);
        return roots;
    }, []);

    useEffect(() => {
        setIndustryTree(buildTree(industries));
    }, [industries]);

    const handleSelect = (item) => {
        setIsCreating(false);
        setSelectedItem(item);
        clearErrors();
        setData({
            industry_code: item.industry_code || '',
            gics_industry_code: item.gics_industry_code || '',
            trbc_industry_code: item.trbc_industry_code || '',
            industry_name_ar: item.industry_name_ar || '',
            industry_name_en: item.industry_name_en || '',
            description_ar: item.description_ar || '',
            description_en: item.description_en || '',
            sector_id: item.sector_id || '',
            parent_industry_id: item.parent_industry_id || '',
            capital_intensity: item.capital_intensity || 'medium',
            cyclicality: item.cyclicality || 'cyclical',
            regulatory_environment: item.regulatory_environment || 'moderately_regulated',
            average_profit_margin: item.average_profit_margin || '',
            average_roa: item.average_roa || '',
            average_roe: item.average_roe || '',
            is_active: item.is_active === 1 || item.is_active === true,
            display_order: item.display_order || 0,
        });
    };

    const handleCreateNew = () => {
        setIsCreating(true);
        setSelectedItem(null);
        clearErrors();
        reset();
        setData({
            industry_code: '',
            gics_industry_code: '',
            trbc_industry_code: '',
            industry_name_ar: '',
            industry_name_en: '',
            description_ar: '',
            description_en: '',
            sector_id: '',
            parent_industry_id: '',
            capital_intensity: 'medium',
            cyclicality: 'cyclical',
            regulatory_environment: 'moderately_regulated',
            average_profit_margin: '',
            average_roa: '',
            average_roe: '',
            is_active: true,
            display_order: 0,
        });
    };

    const handleSubmit = (e, exit = false) => {
        e.preventDefault();
        const options = {
            onSuccess: () => {
                if (exit) {
                    handleCreateNew();
                } else {
                    if (isCreating) reset();
                }
            },
            preserveScroll: true,
        };
        if (isCreating) {
            post(route('admin.investing-stack.industries.store'), options);
        } else if (selectedItem) {
            router.post(route('admin.investing-stack.industries.update', selectedItem.id), {
                _method: 'PUT',
                ...data
            }, options);
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this industry?')) {
            router.delete(route('admin.investing-stack.industries.destroy', id), {
                onSuccess: () => {
                    if (selectedItem?.id === id) {
                        handleCreateNew();
                    }
                }
            });
        }
    };

    const handleDragStart = (e, id) => {
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDropOnRoot = (e) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('text/plain');
        if (draggedId) {
            handleMoveIndustry(draggedId, null);
        }
    };

    const handleMoveIndustry = (draggedId, newParentId) => {
        const item = industries.find(i => String(i.id) === String(draggedId));
        if (!item || String(item.parent_industry_id) === String(newParentId)) return;
        router.put(route('admin.investing-stack.industries.update', draggedId), {
            ...item,
            parent_industry_id: newParentId
        }, { preserveScroll: true });
    };

    return (
        <AdminLayout activeMenu="Investing & Stack">
            <Head title="Industries Management" />
            <div className="categories-layout">
                <div className="categories-tree-panel">
                    <div className="tree-panel-header">
                        <button className="btn btn-primary" onClick={handleCreateNew} style={{ width: '100%', justifyContent: 'center', marginBottom: '12px' }}>
                            <span className="material-icons-outlined">add</span>
                            Create
                        </button>
                        <p className="instruction-text">
                            Drag and drop on the left to change the parent of industries.
                        </p>
                    </div>
                    <div
                        className="tree-container"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDropOnRoot}
                    >
                        {industryTree.map(ind => (
                            <IndustryItem
                                key={ind.id}
                                item={ind}
                                selectedId={selectedItem?.id}
                                onSelect={handleSelect}
                                onDelete={handleDelete}
                                onDrop={handleMoveIndustry}
                                onDragStart={handleDragStart}
                            />
                        ))}
                        {industryTree.length === 0 && (
                            <div className="empty-tree">No industries found.</div>
                        )}
                    </div>
                </div>

                <div className="categories-main">
                    <div className="editor-card">
                        <div className="editor-header">
                            <h2>{isCreating ? 'Create New Industry' : 'Edit Industry'}</h2>
                        </div>
                        <form className="editor-form" onSubmit={(e) => handleSubmit(e, false)}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Industry Code</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={data.industry_code}
                                        onChange={e => setData('industry_code', e.target.value)}
                                        placeholder="e.g. IND-001"
                                        required
                                    />
                                    {errors.industry_code && <div className="error-text">{errors.industry_code}</div>}
                                </div>
                                <div className="form-group">
                                    <label>GICS Code (Optional)</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={data.gics_industry_code}
                                        onChange={e => setData('gics_industry_code', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Name (English)</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={data.industry_name_en}
                                        onChange={e => setData('industry_name_en', e.target.value)}
                                        required
                                    />
                                    {errors.industry_name_en && <div className="error-text">{errors.industry_name_en}</div>}
                                </div>
                                <div className="form-group">
                                    <label>Name (Arabic)</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={data.industry_name_ar}
                                        onChange={e => setData('industry_name_ar', e.target.value)}
                                    />
                                    {errors.industry_name_ar && <div className="error-text">{errors.industry_name_ar}</div>}
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Sector</label>
                                    <select
                                        className="form-control"
                                        value={data.sector_id}
                                        onChange={e => setData('sector_id', e.target.value)}
                                        required
                                    >
                                        <option value="">Select Sector</option>
                                        {sectors.map(sector => (
                                            <option key={sector.id} value={sector.id}>
                                                {sector.sector_name_en} / {sector.sector_name_ar}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.sector_id && <div className="error-text">{errors.sector_id}</div>}
                                </div>
                                <div className="form-group">
                                    <label>Parent Industry</label>
                                    <select
                                        className="form-control"
                                        value={data.parent_industry_id}
                                        onChange={e => setData('parent_industry_id', e.target.value)}
                                    >
                                        <option value="">None (Top Level)</option>
                                        {parents.map(parent => (
                                            (selectedItem?.id !== parent.id) && (
                                                <option key={parent.id} value={parent.id}>
                                                    {parent.industry_name_en} / {parent.industry_name_ar}
                                                </option>
                                            )
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Capital Intensity</label>
                                    <select
                                        className="form-control"
                                        value={data.capital_intensity}
                                        onChange={e => setData('capital_intensity', e.target.value)}
                                    >
                                        <option value="high">High</option>
                                        <option value="medium">Medium</option>
                                        <option value="low">Low</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Cyclicality</label>
                                    <select
                                        className="form-control"
                                        value={data.cyclicality}
                                        onChange={e => setData('cyclicality', e.target.value)}
                                    >
                                        <option value="cyclical">Cyclical</option>
                                        <option value="defensive">Defensive</option>
                                        <option value="growth">Growth</option>
                                        <option value="speculative">Speculative</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Regulatory Environment</label>
                                    <select
                                        className="form-control"
                                        value={data.regulatory_environment}
                                        onChange={e => setData('regulatory_environment', e.target.value)}
                                    >
                                        <option value="highly_regulated">Highly Regulated</option>
                                        <option value="moderately_regulated">Moderately Regulated</option>
                                        <option value="lightly_regulated">Lightly Regulated</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Display Order</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={data.display_order}
                                        onChange={e => setData('display_order', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Description (English)</label>
                                <textarea
                                    className="form-control"
                                    value={data.description_en}
                                    onChange={e => setData('description_en', e.target.value)}
                                    rows="4"
                                ></textarea>
                            </div>
                            <div className="form-group">
                                <label>Description (Arabic)</label>
                                <textarea
                                    className="form-control"
                                    value={data.description_ar}
                                    onChange={e => setData('description_ar', e.target.value)}
                                    rows="4"
                                ></textarea>
                            </div>
                            <div className="form-group">
                                <div className="toggle-wrapper">
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            checked={data.is_active}
                                            onChange={e => setData('is_active', e.target.checked)}
                                        />
                                        <span className="slider round"></span>
                                    </label>
                                    <span className="toggle-label">Is Active?</span>
                                </div>
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary" disabled={processing}>
                                    {processing ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={(e) => handleSubmit(e, true)}
                                    disabled={processing}
                                >
                                    Save & Exit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default Industries;
