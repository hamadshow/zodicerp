import React, { useState, useEffect, useRef } from 'react';
import { Head, router, useForm, Link } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import IconPicker from '../../../Components/IconPicker';
import MediaPickerModal from '../Media/MediaPickerModal';
import '../../../../css/backend/Categories.scss';

const resolveMediaUrl = (value) => {
    if (!value) {
        return null;
    }

    if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
        return value;
    }

    const withoutProtocol =
        typeof value === 'string' ? value.replace(/^https?:\/\/[^/]+/, '') : '';

    const relativePath = withoutProtocol.replace(
        /^\/?(files|storage|media-files)\//,
        ''
    );

    return `/media-files/${relativePath}`;
};

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
                    <span className="category-name">{category.name}</span>
                    <span className="product-count">({category.products_count || 0})</span>
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
const Categories = ({ categories = [], parents = [] }) => {
    const [categoryTree, setCategoryTree] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null); // null means "Create New" mode or nothing selected
    const [isCreating, setIsCreating] = useState(true); // explicit flag for Create Mode
    const [showMediaPicker, setShowMediaPicker] = useState(false); // Media Picker Modal State
    const [duplicateOrderError, setDuplicateOrderError] = useState(null);

    // Form handling using Inertia's useForm
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        name: '',
        slug: '',
        parent_id: '',
        description: '',
        status: 'active',
        image: null,
        icon: '',
        is_featured: false,
        is_default: false,
        order: 0,
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
            nodes.sort((a, b) => a.order - b.order);
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
            name: category.name || '',
            slug: category.slug || '',
            parent_id: category.parent_id || '',
            description: category.description || '',
            status: category.status || 'active',
            image: category.image || null, // Load existing image
            icon: category.icon || '',
            is_featured: !!category.is_featured,
            is_default: !!category.is_default,
            order: category.order || 0,
        });
    };

    // Handle Create Mode
    const handleCreateNew = () => {
        setIsCreating(true);
        setSelectedCategory(null);
        clearErrors();
        setDuplicateOrderError(null);
        reset();
        setData({
            name: '',
            slug: '',
            parent_id: '',
            description: '',
            status: 'active',
            image: null,
            icon: '',
            is_featured: false,
            is_default: false,
            order: 0,
        });
    };

    // Handle Media Selection
    const handleMediaSelect = (files) => {
        const file = Array.isArray(files) ? files[0] : files;
        if (file && file.path) {
            setData('image', file.path);
        }
    };

    // Handle Save
    const handleSubmit = (e, exit = false) => {
        e.preventDefault();
        
        const options = {
            onSuccess: () => {
                if (exit) {
                    // Maybe clear selection or show success message
                    handleCreateNew(); // Reset to create mode
                } else {
                    // If created, we might want to switch to edit mode for the new item, 
                    // but for now let's just reset if it was create mode
                    if (isCreating) reset();
                }
            },
            preserveScroll: true,
        };

        if (isCreating) {
            post(route('admin.categories.store'), options);
        } else if (selectedCategory) {
            // Use router.post with _method: 'PUT' for file uploads if needed, 
            // but Inertia's put usually handles it unless files are involved. 
            // Laravel requires POST with _method=PUT for FormData with files.
            router.post(route('admin.categories.update', selectedCategory.id), {
                _method: 'PUT',
                ...data
            }, options);
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this category?')) {
            router.delete(route('admin.categories.destroy', id), {
                onSuccess: () => {
                    if (selectedCategory?.id === id) {
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
            handleMoveCategory(draggedId, null);
        }
    };

    const handleMoveCategory = (draggedId, newParentId) => {
        const category = categories.find(c => String(c.id) === String(draggedId));
        if (!category || String(category.parent_id) === String(newParentId)) return;
        
        router.put(route('admin.categories.update', draggedId), {
            ...category,
            parent_id: newParentId
        }, { preserveScroll: true });
    };

    // Auto-generate slug from name
    const generateSlug = (text) => {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')        // Replace spaces with -
            .replace(/[^\w-]+/g, '')     // Remove all non-word chars
            .replace(/--+/g, '-')        // Replace multiple - with single -
            .replace(/^-+/, '')          // Trim - from start of text
            .replace(/-+$/, '');         // Trim - from end of text
    };

    const handleNameChange = (e) => {
        const name = e.target.value;
        setData(data => ({
            ...data,
            name: name,
            slug: generateSlug(name)
        }));
    };

    // Rich Text Editor Logic
    const textareaRef = useRef(null);

    const insertTag = (tag) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value || ''; // Ensure text is string
        const before = text.substring(0, start);
        const selection = text.substring(start, end);
        const after = text.substring(end);

        let newText = text;
        
        switch(tag) {
            case 'bold':
                newText = `${before}<b>${selection}</b>${after}`;
                break;
            case 'italic':
                newText = `${before}<i>${selection}</i>${after}`;
                break;
            case 'list':
                newText = `${before}\n<ul>\n  <li>${selection}</li>\n</ul>\n${after}`;
                break;
            case 'link':
                 newText = `${before}<a href="#">${selection}</a>${after}`;
                 break;
            case 'image':
                 newText = `${before}<img src="" alt="" />${after}`;
                 break;
        }
        
        setData('description', newText);
    };

    return (
        <AdminLayout activeMenu="Inventory">
            <Head title="Categories Management" />
            
            <div className="categories-layout">
                {/* LEFT COLUMN: Tree View */}
                <div className="categories-tree-panel">
                    <div className="tree-panel-header">
                        <button className="btn btn-primary" onClick={handleCreateNew} style={{ width: '100%', justifyContent: 'center', marginBottom: '12px' }}>
                            <span className="material-icons-outlined">add</span>
                            Create
                        </button>
                        <p className="instruction-text">
                            Drag and drop on the left to change the order or parent of the categories.
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
                            <h2>{isCreating ? 'Create New Category' : 'Edit Category'}</h2>
                        </div>
                        
                        <form className="editor-form" onSubmit={(e) => handleSubmit(e, false)}>
                            {/* Name & Permalink */}
                            <div className="form-group">
                                <label>Name</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={data.name}
                                    onChange={handleNameChange}
                                    placeholder="Category Name"
                                    required
                                />
                                {errors.name && <div className="error-text">{errors.name}</div>}
                            </div>

                            <div className="form-group">
                                <label>Permalink</label>
                                <div className="permalink-input">
                                    <span className="base-url">{window.location.origin}/category/</span>
                                    <input 
                                        type="text" 
                                        className="form-control"
                                        value={data.slug}
                                        onChange={e => setData('slug', e.target.value)}
                                        placeholder="slug-url"
                                    />
                                </div>
                                {data.slug && (
                                    <a href={`${window.location.origin}/category/${data.slug}`} target="_blank" className="preview-link">
                                        Preview
                                    </a>
                                )}
                                {errors.slug && <div className="error-text">{errors.slug}</div>}
                            </div>

                            {/* Parent & Status */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Parent</label>
                                    <select 
                                        className="form-control"
                                        value={data.parent_id}
                                        onChange={e => setData('parent_id', e.target.value)}
                                    >
                                        <option value="">None (Top Level)</option>
                                        {parents.map(parent => (
                                            (selectedCategory?.id !== parent.id) && (
                                                <option key={parent.id} value={parent.id}>{parent.name}</option>
                                            )
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Status</label>
                                    <select 
                                        className="form-control"
                                        value={data.status}
                                        onChange={e => setData('status', e.target.value)}
                                    >
                                        <option value="active">Published</option>
                                        <option value="inactive">Draft</option>
                                    </select>
                                </div>
                            </div>

                            {/* Order Input */}
                            <div className="form-group">
                                <label>Order (Sort Index)</label>
                                <input 
                                    type="number" 
                                    className={`form-control ${errors.order || duplicateOrderError ? 'border-red-500' : ''}`}
                                    value={data.order}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setData('order', val);
                                        
                                        // Real-time duplicate check
                                        const isDup = categories.some(c => 
                                            String(c.order) === String(val) && 
                                            String(c.id) !== String(selectedCategory?.id)
                                        );
                                        setDuplicateOrderError(isDup ? 'This order value is already taken.' : null);
                                    }}
                                    onKeyDown={(e) => {
                                        // Block invalid chars (e, E, +, -, .)
                                        if (['e', 'E', '+', '-', '.'].includes(e.key)) {
                                            e.preventDefault();
                                        }
                                    }}
                                    placeholder="Unique sort order"
                                    required
                                />
                                {duplicateOrderError && <div className="error-text">{duplicateOrderError}</div>}
                                {errors.order && <div className="error-text">{errors.order}</div>}
                            </div>

                            {/* Rich Text Editor Stub */}
                            <div className="form-group">
                                <label>Description</label>
                                <div className="rich-text-editor">
                                    <div className="rte-toolbar">
                                        <button type="button" title="Bold" onClick={() => insertTag('bold')}><b>B</b></button>
                                        <button type="button" title="Italic" onClick={() => insertTag('italic')}><i>I</i></button>
                                        <button type="button" title="List" onClick={() => insertTag('list')}><span className="material-icons-outlined" style={{fontSize: 16}}>format_list_bulleted</span></button>
                                        <button type="button" title="Link" onClick={() => insertTag('link')}><span className="material-icons-outlined" style={{fontSize: 16}}>link</span></button>
                                        <button type="button" title="Image" onClick={() => insertTag('image')}><span className="material-icons-outlined" style={{fontSize: 16}}>image</span></button>
                                    </div>
                                    <textarea 
                                        ref={textareaRef}
                                        className="rte-content"
                                        value={data.description}
                                        onChange={e => setData('description', e.target.value)}
                                        placeholder="Add a description..."
                                        rows="5"
                                    ></textarea>
                                </div>
                            </div>

                            {/* Icon & Image */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Icon (Class)</label>
                                    <IconPicker 
                                        value={data.icon} 
                                        onChange={(val) => setData('icon', val)}
                                    />
                                    <small className="helper-text">Preview only works if icon font is loaded.</small>
                                </div>
                                
                                <div className="form-group">
                                    <label>Icon Image</label>
                                    
                                    <div className="image-input-container">
                                        {/* Preview Area */}
                                        <div className="image-preview-box">
                                            {data.image ? (
                                                typeof data.image === 'string' ? (
                                                    <img src={resolveMediaUrl(data.image)} alt="Selection" />
                                                ) : (
                                                    <img src={URL.createObjectURL(data.image)} alt="Upload Preview" />
                                                )
                                            ) : (
                                                <div className="placeholder">
                                                    <span className="material-icons-outlined">image</span>
                                                    <span>No Image</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="image-actions">
                                            <button 
                                                type="button" 
                                                className="btn btn-outline btn-sm"
                                                onClick={() => setShowMediaPicker(true)}
                                            >
                                                <span className="material-icons-outlined">perm_media</span>
                                                Choose from Media
                                            </button>
                                            
                                            <div className="file-upload-wrapper">
                                                <input 
                                                    type="file" 
                                                    id="cat-image-upload"
                                                    onChange={e => setData('image', e.target.files[0])}
                                                    accept="image/*"
                                                    style={{ display: 'none' }}
                                                />
                                                <label htmlFor="cat-image-upload" className="btn btn-outline btn-sm">
                                                    <span className="material-icons-outlined">upload_file</span>
                                                    Upload
                                                </label>
                                            </div>

                                            {data.image && (
                                                <button 
                                                    type="button" 
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => setData('image', null)}
                                                >
                                                    <span className="material-icons-outlined">close</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <small className="helper-text">It will replace Icon Font if present.</small>
                                </div>
                            </div>

                            {/* Toggles */}
                            <div className="form-group">
                                <div className="toggle-wrapper">
                                    <label className="switch">
                                        <input 
                                            type="checkbox" 
                                            checked={data.is_featured}
                                            onChange={e => setData('is_featured', e.target.checked)}
                                        />
                                        <span className="slider round"></span>
                                    </label>
                                    <span className="toggle-label">Is Featured?</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary" disabled={processing || duplicateOrderError}>
                                    {processing ? 'Saving...' : 'Save'}
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-secondary" 
                                    onClick={(e) => handleSubmit(e, true)}
                                    disabled={processing || duplicateOrderError}
                                >
                                    Save & Exit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            {/* Media Picker Modal */}
            <MediaPickerModal 
                isOpen={showMediaPicker}
                onClose={() => setShowMediaPicker(false)}
                onSelect={handleMediaSelect}
                allowedTypes={['image']}
                multiple={false}
            />
        </AdminLayout>
    );
};

export default Categories;
