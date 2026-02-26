import React, { useState, useEffect } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';

// --- Recursive Category Tree Item ---
const CategoryItem = ({ category, level = 0, selectedId, onSelect, onDelete, onDrop, onDragStart }) => {
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
        if (draggedId !== String(category.id)) {
            onDrop(draggedId, category.id);
        }
    };

    const hasChildren = category.children && category.children.length > 0;
    const isSelected = selectedId === category.id;

    return (
        <div className="category-node">
            <div 
                className={`category-content ${isSelected ? 'selected' : ''} ${isDragOver ? 'drag-over' : ''}`}
                draggable
                onDragStart={(e) => onDragStart(e, category.id)}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(category);
                }}
                style={{ paddingLeft: `${level * 20 + 12}px` }}
            >
                <div className="category-handle" draggable onDragStart={(e) => onDragStart(e, category.id)}>
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
                     <span className="material-icons-outlined">folder</span>
                </div>

                <div className="category-info">
                    <span className="category-name">{category.name_en} ({category.code})</span>
                </div>

                {isSelected && (
                    <button 
                        className="delete-btn" 
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(category.id);
                        }}
                        title="Delete Category"
                    >
                        <span className="material-icons-outlined">delete</span>
                    </button>
                )}
            </div>

            {hasChildren && isExpanded && (
                <div className="category-children">
                    {category.children.map(child => (
                        <CategoryItem 
                            key={child.id} 
                            category={child} 
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

// --- Main Component ---
const AssetCategory = ({ categories = [], parents = [], accounts = [] }) => {
    const [categoryTree, setCategoryTree] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null); // null means "Create New" mode or nothing selected
    const [isCreating, setIsCreating] = useState(true); // explicit flag for Create Mode

    // Form handling using Inertia's useForm
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        parent_id: '',
        name_ar: '',
        name_en: '',
        description: '',
        depreciation_method: 'straight_line',
        useful_life_years: 0,
        salvage_value_rate: 0,
        account_purchase_id: '',
        account_depreciation_id: '',
        account_accumulated_depreciation_id: '',
        account_disposal_gain_id: '',
        account_disposal_loss_id: '',
        is_active: true,
    });

    // Helper to build tree
    const buildTree = React.useCallback((cats) => {
        const map = {};
        const roots = [];
        cats.forEach(cat => {
            map[cat.id] = { ...cat, children: [] };
        });
        cats.forEach(cat => {
            if (cat.parent_id && map[cat.parent_id]) {
                map[cat.parent_id].children.push(map[cat.id]);
            } else {
                roots.push(map[cat.id]);
            }
        });
        const sortRecursive = (nodes) => {
            nodes.sort((a, b) => a.code - b.code);
            nodes.forEach(node => {
                if (node.children.length > 0) sortRecursive(node.children);
            });
        };
        sortRecursive(roots);
        return roots;
    }, []);

    useEffect(() => {
        setCategoryTree(buildTree(categories));
    }, [categories]);

    // Handle Selection
    const handleSelectCategory = (category) => {
        setIsCreating(false);
        setSelectedCategory(category);
        clearErrors();
        setData({
            parent_id: category.parent_id || '',
            name_ar: category.name_ar || '',
            name_en: category.name_en || '',
            description: category.description || '',
            depreciation_method: category.depreciation_method || 'straight_line',
            useful_life_years: category.useful_life_years || 0,
            salvage_value_rate: category.salvage_value_rate || 0,
            account_purchase_id: category.account_purchase_id || '',
            account_depreciation_id: category.account_depreciation_id || '',
            account_accumulated_depreciation_id: category.account_accumulated_depreciation_id || '',
            account_disposal_gain_id: category.account_disposal_gain_id || '',
            account_disposal_loss_id: category.account_disposal_loss_id || '',
            is_active: !!category.is_active,
        });
    };

    // Handle Create Mode
    const handleCreateNew = () => {
        setIsCreating(true);
        setSelectedCategory(null);
        clearErrors();
        reset();
        setData({
            parent_id: '',
            name_ar: '',
            name_en: '',
            description: '',
            depreciation_method: 'straight_line',
            useful_life_years: 0,
            salvage_value_rate: 0,
            account_purchase_id: '',
            account_depreciation_id: '',
            account_accumulated_depreciation_id: '',
            account_disposal_gain_id: '',
            account_disposal_loss_id: '',
            is_active: true,
        });
    };

    // Handle Save
    const handleSubmit = (e) => {
        e.preventDefault();
        
        const options = {
            onSuccess: () => {
                if (isCreating) reset();
            },
            preserveScroll: true,
        };

        if (isCreating) {
            post(route('admin.assets.asset-categories.store'), options);
        } else if (selectedCategory) {
            put(route('admin.assets.asset-categories.update', selectedCategory.id), options);
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this category?')) {
            router.delete(route('admin.assets.asset-categories.destroy', id), {
                onSuccess: () => {
                    if (selectedCategory?.id === id) {
                        handleCreateNew();
                    }
                }
            });
        }
    };

    // Drag & Drop (Moves parent)
    const handleDragStart = (e, id) => {
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDropOnRoot = (e) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('text/plain');
        if (draggedId) {
            handleMoveCategory(draggedId, null);
        }
    };

    const handleMoveCategory = (draggedId, newParentId) => {
        const category = categories.find(c => String(c.id) === String(draggedId));
        if (!category || String(category.parent_id) === String(newParentId)) return;
        
        router.put(route('admin.assets.asset-categories.update', draggedId), {
            ...category,
            parent_id: newParentId
        }, { preserveScroll: true });
    };

    return (
        <AdminLayout activeMenu="Assets">
            <Head title="Asset Categories" />
            
            <div className="categories-layout">
                {/* LEFT COLUMN: Tree View */}
                <div className="categories-tree-panel">
                    <div className="tree-panel-header">
                        <button className="btn btn-primary" onClick={handleCreateNew} style={{ width: '100%', justifyContent: 'center', marginBottom: '12px' }}>
                            <span className="material-icons-outlined">add</span>
                            Create New Category
                        </button>
                        <p className="instruction-text">
                            Drag and drop to change the hierarchy of categories.
                        </p>
                    </div>

                    <div 
                        className="tree-container"
                        onDragOver={(e) => e.preventDefault()} 
                        onDrop={handleDropOnRoot}
                    >
                        {categoryTree.map(cat => (
                            <CategoryItem 
                                key={cat.id} 
                                category={cat} 
                                selectedId={selectedCategory?.id}
                                onSelect={handleSelectCategory}
                                onDelete={handleDelete}
                                onDrop={handleMoveCategory}
                                onDragStart={handleDragStart}
                            />
                        ))}
                        {categoryTree.length === 0 && (
                            <div className="empty-tree">No categories found.</div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: Editor Panel */}
                <div className="categories-main">
                    <div className="editor-card">
                        <div className="editor-header">
                            <h2>{isCreating ? 'Create New Asset Category' : `Edit Category: ${selectedCategory?.name_en}`}</h2>
                        </div>
                        
                        <form className="editor-form" onSubmit={handleSubmit}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Name (EN) <span style={{color: 'red'}}>*</span></label>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        value={data.name_en}
                                        onChange={e => setData('name_en', e.target.value)}
                                        required
                                    />
                                    {errors.name_en && <div className="error-text">{errors.name_en}</div>}
                                </div>
                                <div className="form-group">
                                    <label>Name (AR)</label>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        value={data.name_ar}
                                        onChange={e => setData('name_ar', e.target.value)}
                                    />
                                    {errors.name_ar && <div className="error-text">{errors.name_ar}</div>}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Parent Category</label>
                                    <select 
                                        className="form-control"
                                        value={data.parent_id}
                                        onChange={e => setData('parent_id', e.target.value)}
                                    >
                                        <option value="">None (Top Level)</option>
                                        {parents.map(parent => (
                                            (selectedCategory?.id !== parent.id) && (
                                                <option key={parent.id} value={parent.id}>{parent.name_en} ({parent.code})</option>
                                            )
                                        ))}
                                    </select>
                                    {errors.parent_id && <div className="error-text">{errors.parent_id}</div>}
                                </div>
                                <div className="form-group">
                                    <label>Status</label>
                                    <div className="toggle-wrapper" style={{marginTop: '10px'}}>
                                        <label className="switch">
                                            <input 
                                                type="checkbox" 
                                                checked={data.is_active}
                                                onChange={e => setData('is_active', e.target.checked)}
                                            />
                                            <span className="slider round"></span>
                                        </label>
                                        <span className="toggle-label">{data.is_active ? 'Active' : 'Inactive'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <textarea 
                                    className="form-control"
                                    value={data.description}
                                    onChange={e => setData('description', e.target.value)}
                                    rows="3"
                                ></textarea>
                            </div>

                            <hr style={{margin: '20px 0', border: '0', borderTop: '1px solid #e2e8f0'}} />
                            <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '15px'}}>Depreciation Settings</h3>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Method</label>
                                    <select 
                                        className="form-control"
                                        value={data.depreciation_method}
                                        onChange={e => setData('depreciation_method', e.target.value)}
                                    >
                                        <option value="straight_line">Straight Line</option>
                                        <option value="declining_balance">Declining Balance</option>
                                        <option value="units_of_production">Units of Production</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Useful Life (Years)</label>
                                    <input 
                                        type="number" 
                                        className="form-control"
                                        value={data.useful_life_years}
                                        onChange={e => setData('useful_life_years', e.target.value)}
                                        min="0"
                                        step="0.1"
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Salvage Value Rate (%)</label>
                                <input 
                                    type="number" 
                                    className="form-control"
                                    value={data.salvage_value_rate}
                                    onChange={e => setData('salvage_value_rate', e.target.value)}
                                    min="0"
                                    max="100"
                                    step="0.01"
                                />
                            </div>

                            <hr style={{margin: '20px 0', border: '0', borderTop: '1px solid #e2e8f0'}} />
                            <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '15px'}}>GL Accounts</h3>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Fixed Asset Account</label>
                                    <select 
                                        className="form-control"
                                        value={data.account_purchase_id}
                                        onChange={e => setData('account_purchase_id', e.target.value)}
                                    >
                                        <option value="">Select Account</option>
                                        {accounts.map(acc => (
                                            <option key={acc.AccID} value={acc.AccID}>{acc.AccCode} - {acc.AccName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Depreciation Expense Account</label>
                                    <select 
                                        className="form-control"
                                        value={data.account_depreciation_id}
                                        onChange={e => setData('account_depreciation_id', e.target.value)}
                                    >
                                        <option value="">Select Account</option>
                                        {accounts.map(acc => (
                                            <option key={acc.AccID} value={acc.AccID}>{acc.AccCode} - {acc.AccName}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Accumulated Depreciation Account</label>
                                    <select 
                                        className="form-control"
                                        value={data.account_accumulated_depreciation_id}
                                        onChange={e => setData('account_accumulated_depreciation_id', e.target.value)}
                                    >
                                        <option value="">Select Account</option>
                                        {accounts.map(acc => (
                                            <option key={acc.AccID} value={acc.AccID}>{acc.AccCode} - {acc.AccName}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary" disabled={processing}>
                                    {processing ? 'Saving...' : 'Save Category'}
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-secondary" 
                                    onClick={handleCreateNew}
                                    disabled={processing}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AssetCategory;
