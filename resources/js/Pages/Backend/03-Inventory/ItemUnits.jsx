import React, { useState, useEffect } from 'react';
import { Head, router, useForm, Link } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import IconPicker from '../../../Components/IconPicker';
import MediaPickerModal from '../Media/MediaPickerModal';

// --- Recursive Item Unit Tree Item ---
const ItemUnitItem = ({ unit, level = 0, selectedId, onSelect, onDelete, onDrop, onDragStart }) => {
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
        if (draggedId !== String(unit.id)) {
            onDrop(draggedId, unit.id);
        }
    };

    const hasChildren = unit.children && unit.children.length > 0;
    const isSelected = selectedId === unit.id;

    return (
        <div className="category-node">
            <div 
                className={`category-content ${isSelected ? 'selected' : ''} ${isDragOver ? 'drag-over' : ''}`}
                draggable
                onDragStart={(e) => onDragStart(e, unit.id)}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(unit);
                }}
                style={{ paddingLeft: `${level * 20 + 12}px` }}
            >
                <div className="category-handle" draggable onDragStart={(e) => onDragStart(e, unit.id)}>
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
                     <span className="material-icons-outlined">straighten</span>
                </div>

                <div className="category-info">
                    <span className="category-name">{unit.name}</span>
                    <span className="product-count">({unit.conversion_factor})</span>
                </div>

                {isSelected && (
                    <button 
                        className="delete-btn" 
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(unit.id);
                        }}
                        title="Delete Unit"
                    >
                        <span className="material-icons-outlined">delete</span>
                    </button>
                )}
            </div>

            {hasChildren && isExpanded && (
                <div className="category-children">
                    {unit.children.map(child => (
                        <ItemUnitItem 
                            key={child.id} 
                            unit={child} 
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
const ItemUnits = ({ units = [], parents = [] }) => {
    const [unitTree, setUnitTree] = useState([]);
    const [selectedUnit, setSelectedUnit] = useState(null); // null means "Create New" mode or nothing selected
    const [isCreating, setIsCreating] = useState(true); // explicit flag for Create Mode

    // Form handling using Inertia's useForm
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        unit_type: 1, // 1=Main, 2=Sub
        base_unit: '',
        conversion_factor: 1,
        active: true,
    });

    // Helper to build tree
    const buildTree = React.useCallback((items) => {
        const map = {};
        const roots = [];
        items.forEach(item => {
            map[item.id] = { ...item, children: [] };
        });
        items.forEach(item => {
            if (item.base_unit && map[item.base_unit]) {
                map[item.base_unit].children.push(map[item.id]);
            } else {
                roots.push(map[item.id]);
            }
        });
        return roots;
    }, []);

    useEffect(() => {
        setUnitTree(buildTree(units));
    }, [units]);

    // Handle Selection
    const handleSelectUnit = (unit) => {
        setIsCreating(false);
        setSelectedUnit(unit);
        clearErrors();
        setData({
            name: unit.name || '',
            unit_type: unit.unit_type || 1,
            base_unit: unit.base_unit || '',
            conversion_factor: unit.conversion_factor || 1,
            active: unit.active !== undefined ? Boolean(unit.active) : true,
        });
    };

    // Handle Create Mode
    const handleCreateNew = () => {
        setIsCreating(true);
        setSelectedUnit(null);
        clearErrors();
        reset();
        setData({
            name: '',
            unit_type: 1,
            base_unit: '',
            conversion_factor: 1,
            active: true,
        });
    };

    // Handle Save
    const handleSubmit = (e, exit = false) => {
        e.preventDefault();
        
        const options = {
            onSuccess: () => {
                if (exit) {
                    handleCreateNew(); // Reset to create mode
                } else {
                    if (isCreating) reset();
                }
            },
            preserveScroll: true,
        };

        if (isCreating) {
            post(route('admin.item-units.store'), options);
        } else if (selectedUnit) {
            put(route('admin.item-units.update', selectedUnit.id), options);
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this unit?')) {
            router.delete(route('admin.item-units.destroy', id), {
                onSuccess: () => {
                    if (selectedUnit?.id === id) {
                        handleCreateNew();
                    }
                }
            });
        }
    };

    // Drag & Drop
    const handleDragStart = (e, id) => {
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDropOnRoot = (e) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('text/plain');
        if (draggedId) {
            handleMoveUnit(draggedId, null);
        }
    };

    const handleMoveUnit = (draggedId, newParentId) => {
        const unit = units.find(u => String(u.id) === String(draggedId));
        // If moving to root, unit_type becomes 1 (Main), otherwise 2 (Sub)
        // If it was already main and staying main (root), no change needed unless base_unit changes
        if (!unit || String(unit.base_unit) === String(newParentId)) return;
        
        const newType = newParentId ? 2 : 1;
        const newFactor = newParentId ? unit.conversion_factor : 1; // Main units usually factor 1

        router.put(route('admin.item-units.update', draggedId), {
            ...unit,
            base_unit: newParentId,
            unit_type: newType,
            conversion_factor: newFactor
        }, { preserveScroll: true });
    };

    return (
        <AdminLayout activeMenu="Inventory">
            <Head title="Units Management" />
            
            <div className="categories-layout">
                {/* LEFT COLUMN: Tree View */}
                <div className="categories-tree-panel">
                    <div className="tree-panel-header">
                        <button className="btn btn-primary" onClick={handleCreateNew} style={{ width: '100%', justifyContent: 'center', marginBottom: '12px' }}>
                            <span className="material-icons-outlined">add</span>
                            Create
                        </button>
                        <p className="instruction-text">
                            Drag and drop on the left to change hierarchy. Main units have no parent.
                        </p>
                    </div>

                    <div 
                        className="tree-container"
                        onDragOver={(e) => e.preventDefault()} 
                        onDrop={handleDropOnRoot}
                    >
                        {unitTree.map(unit => (
                            <ItemUnitItem 
                                key={unit.id} 
                                unit={unit} 
                                selectedId={selectedUnit?.id}
                                onSelect={handleSelectUnit}
                                onDelete={handleDelete}
                                onDrop={handleMoveUnit}
                                onDragStart={handleDragStart}
                            />
                        ))}
                        {unitTree.length === 0 && (
                            <div className="empty-tree">No units found.</div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: Editor Panel */}
                <div className="categories-main">
                    <div className="editor-card">
                        <div className="editor-header">
                            <h2>{isCreating ? 'Create New Unit' : 'Edit Unit'}</h2>
                        </div>
                        
                        <form className="editor-form" onSubmit={(e) => handleSubmit(e, false)}>
                            {/* Name */}
                            <div className="form-group">
                                <label>Name</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={data.name}
                                    onChange={e => setData('name', e.target.value)}
                                    placeholder="Unit Name (e.g., Kilogram, Box)"
                                    required
                                />
                                {errors.name && <div className="error-text">{errors.name}</div>}
                            </div>

                            {/* Unit Type & Parent */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Unit Type</label>
                                    <select 
                                        className="form-control"
                                        value={data.unit_type}
                                        onChange={e => {
                                            const val = parseInt(e.target.value);
                                            setData(d => ({
                                                ...d,
                                                unit_type: val,
                                                base_unit: val === 1 ? '' : d.base_unit,
                                                conversion_factor: val === 1 ? 1 : d.conversion_factor
                                            }));
                                        }}
                                    >
                                        <option value={1}>Main Unit</option>
                                        <option value={2}>Sub Unit</option>
                                    </select>
                                    {errors.unit_type && <div className="error-text">{errors.unit_type}</div>}
                                </div>

                                <div className="form-group">
                                    <label>Base Unit (Parent)</label>
                                    <select 
                                        className="form-control"
                                        value={data.base_unit}
                                        onChange={e => setData('base_unit', e.target.value)}
                                        disabled={data.unit_type === 1}
                                    >
                                        <option value="">None (Top Level)</option>
                                        {parents.map(parent => (
                                            (selectedUnit?.id !== parent.id) && (
                                                <option key={parent.id} value={parent.id}>{parent.name}</option>
                                            )
                                        ))}
                                    </select>
                                    {errors.base_unit && <div className="error-text">{errors.base_unit}</div>}
                                </div>
                            </div>

                            {/* Conversion Factor */}
                            <div className="form-group">
                                <label>Conversion Factor</label>
                                <input 
                                    type="number" 
                                    step="0.0001"
                                    className="form-control"
                                    value={data.conversion_factor}
                                    onChange={e => setData('conversion_factor', e.target.value)}
                                    placeholder="e.g. 1000 for Kg to Gram"
                                    disabled={data.unit_type === 1} // Main units are always 1
                                    required
                                />
                                <small className="helper-text">
                                    {data.unit_type === 1 
                                        ? "Main units always have a factor of 1." 
                                        : "How many of this unit make 1 Base Unit? (e.g. 1000 Grams = 1 Kg)"}
                                </small>
                                {errors.conversion_factor && <div className="error-text">{errors.conversion_factor}</div>}
                            </div>

                            {/* Active Toggle */}
                            <div className="form-group">
                                <div className="toggle-wrapper">
                                    <label className="switch">
                                        <input 
                                            type="checkbox" 
                                            checked={data.active}
                                            onChange={e => setData('active', e.target.checked)}
                                        />
                                        <span className="slider round"></span>
                                    </label>
                                    <span className="toggle-label">Active</span>
                                </div>
                            </div>

                            {/* Actions */}
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

export default ItemUnits;
