import React, { useState, useEffect, useRef } from 'react';
import { Head, router, useForm, Link, usePage } from '@inertiajs/react';
import * as XLSX from 'xlsx';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AdminLayout from '../components/AdminLayout';
import IconPicker from '../../../Components/IconPicker';
import MediaPickerModal from '../Media/MediaPickerModal';

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
    const [isDragOver, setIsDragOver] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true); // Default to expanded

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

    const isRtl = document.dir === 'rtl' || document.documentElement.dir === 'rtl' || document.body.dir === 'rtl';

    return (
        <div className="category-tree-node">
            <div 
                className={`category-tree-item ${isSelected ? 'selected' : ''} ${isDragOver ? 'drag-over' : ''}`}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(category);
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {/* Drag Handle */}
                <div 
                    className="drag-handle" 
                    draggable 
                    onDragStart={(e) => onDragStart(e, category.id)}
                    onClick={(e) => e.stopPropagation()} // Prevent selection when trying to drag
                >
                    <span className="material-icons-outlined">drag_indicator</span>
                </div>
                
                {/* Toggle Icon */}
                <div 
                    className={`toggle-icon ${hasChildren ? 'visible' : 'hidden'}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (hasChildren) {
                            setIsExpanded(!isExpanded);
                        }
                    }}
                >
                    {hasChildren && (
                        <span className="material-icons-outlined" style={{ 
                            transform: isExpanded ? 'rotate(90deg)' : (isRtl ? 'rotate(180deg)' : 'rotate(0deg)'),
                            transition: 'transform 0.2s ease'
                        }}>
                            chevron_right
                        </span>
                    )}
                </div>

                {/* Folder Icon */}
                <div className="folder-icon">
                     <span className="material-icons-outlined">
                        {isExpanded && hasChildren ? 'folder_open' : 'folder'}
                     </span>
                </div>

                {/* Info */}
                <div className="category-info">
                    <span className="category-name">{category.name}</span>
                    <span className="category-count">({category.products_count || 0})</span>
                </div>

                {/* Delete Button */}
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

            {/* Children Container */}
            {hasChildren && isExpanded && (
                <div className="category-children-container">
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
const Categories = ({ categories = [], categoryTree: categoryTreeFromServer = [] }) => {
    const { props } = usePage();
    const [categoryTree, setCategoryTree] = useState([]);
    const [treeVersion, setTreeVersion] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState(null); // null means "Create New" mode or nothing selected
    const [isCreating, setIsCreating] = useState(true); // explicit flag for Create Mode
    const [showMediaPicker, setShowMediaPicker] = useState(false); // Media Picker Modal State
    const [duplicateOrderError, setDuplicateOrderError] = useState(null);
    const fileInputRef = useRef(null);

    // Import System State
    const [showImport, setShowImport] = useState(false);
    const [excelRows, setExcelRows] = useState([]);
    const [invalidRows, setInvalidRows] = useState([]);
    const [importSummary, setImportSummary] = useState({});
    const [importLoading, setImportLoading] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importError, setImportError] = useState(null);
    const [showExcelMenu, setShowExcelMenu] = useState(false);
    const excelMenuRef = useRef(null);

    // Form handling using Inertia's useForm
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        name: '',
        slug: '',
        parent_id: 0,
        description: '',
        status: 'active',
        image: null,
        icon: '',
        is_featured: false,
        is_default: false,
        order: 0,
    });

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (excelMenuRef.current && !excelMenuRef.current.contains(event.target)) {
                setShowExcelMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (props.flash?.success) {
            toast.success(props.flash.success);
            setShowImport(false);
            setExcelRows([]);
            setInvalidRows([]);
            setImportSummary({});
        }
        if (props.flash?.error) {
            toast.error(props.flash.error);
        }
    }, [props.flash]);

    // Helper to build tree
    const buildTree = React.useCallback((cats) => {
        if (!cats || cats.length === 0) return [];
        
        // 1. Create a map of all categories
        const map = {};
        const roots = [];
        
        // Initialize map with normalized IDs and children array
        cats.forEach(cat => {
            map[String(cat.id)] = { ...cat, children: [] };
        });
        
        // 2. Build the tree structure
        cats.forEach(cat => {
            const currentItem = map[String(cat.id)];
            
            // Normalize parentId: null, undefined, "0", 0 -> "0"
            let parentId = cat.parent_id;
            if (parentId === null || parentId === undefined || parentId === 0 || parentId === "0" || parentId === "") {
                parentId = "0";
            } else {
                parentId = String(parentId);
            }

            // Check if parent exists in map (prevent orphans from disappearing)
            if (parentId !== "0" && map[parentId]) {
                // Check for circular reference (basic check: parent cannot be itself)
                if (parentId !== String(currentItem.id)) {
                     map[parentId].children.push(currentItem);
                } else {
                     // Self-referencing, treat as root
                     roots.push(currentItem);
                }
            } else {
                // If parentId is "0" OR parent doesn't exist (orphan), add to roots
                roots.push(currentItem);
            }
        });
        
        // 3. Sort recursively
        const sortRecursive = (nodes) => {
            // Sort by order (asc), then by name (asc) as fallback
            nodes.sort((a, b) => {
                const orderA = Number(a.order) || 0;
                const orderB = Number(b.order) || 0;
                if (orderA !== orderB) return orderA - orderB;
                
                return (a.name || '').localeCompare(b.name || '');
            });

            nodes.forEach(node => {
                if (node.children && node.children.length > 0) {
                    sortRecursive(node.children);
                }
            });
        };
        
        sortRecursive(roots);
        return roots;
    }, []);

    useEffect(() => {
        if (Array.isArray(categoryTreeFromServer) && categoryTreeFromServer.length > 0) {
            setCategoryTree(categoryTreeFromServer);
            setTreeVersion((v) => v + 1);
            return;
        }

        setCategoryTree(buildTree(categories));
        setTreeVersion((v) => v + 1);
    }, [categoryTreeFromServer, categories, buildTree]);

    // Handle Selection
    const handleSelectCategory = (category) => {
        const fullCategory = categories.find(c => Number(c.id) === Number(category.id)) || category;
        setIsCreating(false);
        setSelectedCategory(fullCategory);
        clearErrors();
        setData({
            name: fullCategory.name || '',
            slug: fullCategory.slug || '',
            parent_id: fullCategory.parent_id !== undefined && fullCategory.parent_id !== null ? Number(fullCategory.parent_id) : 0,
            description: fullCategory.description || '',
            status: fullCategory.status || 'active',
            image: fullCategory.image || null,
            icon: fullCategory.icon || '',
            is_featured: !!fullCategory.is_featured,
            is_default: !!fullCategory.is_default,
            order: fullCategory.order || 0,
        });
    };

    // Handle Create Mode
    const handleCreateNew = () => {
        setIsCreating(true);
        setSelectedCategory(null);
        reset();
        setData({
            name: '',
            slug: '',
            parent_id: 0,
            description: '',
            status: 'active',
            image: null,
            icon: '',
            is_featured: false,
            is_default: false,
            order: 0,
        });
        clearErrors();
        setDuplicateOrderError(null);
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
            post(route('admin.inventory.categories.store'), options);
        } else if (selectedCategory) {
            // Use router.post with _method: 'PUT' for file uploads if needed, 
            // but Inertia's put usually handles it unless files are involved. 
            // Laravel requires POST with _method=PUT for FormData with files.
            router.post(route('admin.inventory.categories.update', selectedCategory.id), {
                _method: 'PUT',
                ...data
            }, options);
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this category?')) {
            router.delete(route('admin.inventory.categories.destroy', id), {
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
        
        router.put(route('admin.inventory.categories.update', draggedId), {
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

    // Helper to get hierarchical options for the select dropdown
    const renderParentOptions = (nodes, level = 0) => {
        return nodes.reduce((acc, node) => {
            // Skip the currently selected category and its descendants to avoid circular parenting
            if (selectedCategory?.id === node.id) return acc;
            
            const prefix = level > 0 ? '\u00A0\u00A0'.repeat(level) + '↳ ' : '';
            acc.push(
                <option key={node.id} value={node.id}>
                    {prefix}{node.name}
                </option>
            );
            
            if (node.children && node.children.length > 0) {
                acc.push(...renderParentOptions(node.children, level + 1));
            }
            
            return acc;
        }, []);
    };

    const downloadTemplate = () => {
        const headers = ['name', 'slug', 'parent_name', 'description', 'status', 'order', 'is_featured', 'is_default', 'icon'];
        const sample = ['Electronics', 'electronics', '', 'All electronic items', 'active', '1', '1', '0', 'devices'];
        const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "categories_template.xlsx");
    };

    const handleFileUpload = (file) => {
        if (!file) return;
        setImportLoading(true);
        setImportError(null);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                processExcelData(jsonData);
            } catch (err) {
                setImportError(err?.message || 'Error reading file');
                setImportLoading(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleFileDrop = (e) => {
        e.preventDefault();
        setImportError(null);
        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
            handleFileUpload(file);
        } else {
            setImportError('Please upload a valid Excel file (.xlsx, .xls)');
        }
    };

    const processExcelData = (rows) => {
        if (rows.length < 2) {
            setImportError('File is empty or missing headers');
            setImportLoading(false);
            return;
        }

        const headers = rows[0].map(h => String(h).trim().toLowerCase());
        const dataRows = rows.slice(1);
        const valid = [];
        const invalid = [];

        // Column mapping
        const map = {
            'name': headers.indexOf('name'),
            'slug': headers.indexOf('slug'),
            'parent_name': headers.indexOf('parent_name'),
            'description': headers.indexOf('description'),
            'status': headers.indexOf('status'),
            'order': headers.indexOf('order'),
            'is_featured': headers.indexOf('is_featured'),
            'is_default': headers.indexOf('is_default'),
            'icon': headers.indexOf('icon'),
        };

        dataRows.forEach((row) => {
            const getVal = (key) => {
                const colIdx = map[key];
                return colIdx !== -1 && row[colIdx] !== undefined ? String(row[colIdx]).trim() : '';
            };

            const item = {
                name: getVal('name'),
                slug: getVal('slug'),
                parent_name: getVal('parent_name'),
                description: getVal('description'),
                status: getVal('status') || 'active',
                order: getVal('order') || '0',
                is_featured: getVal('is_featured') === '1',
                is_default: getVal('is_default') === '1',
                icon: getVal('icon'),
                _errors: []
            };

            // Client-side Validation
            if (!item.name) item._errors.push('Name is required');
            
            // Check duplicates in current batch
            if (valid.find(v => v.name === item.name && item.name)) {
                item._errors.push('Duplicate Name in file');
            }

            if (item._errors.length > 0) {
                invalid.push(item);
            } else {
                valid.push(item);
            }
        });

        setExcelRows(valid);
        setInvalidRows(invalid);
        setImportSummary({
            total: dataRows.length,
            valid: valid.length,
            invalid: invalid.length
        });
        setImportLoading(false);
    };

    const removeImportRow = (index) => {
        const rows = [...excelRows];
        rows.splice(index, 1);
        setExcelRows(rows);
        setImportSummary(prev => ({ ...prev, valid: rows.length }));
    };

    const submitImport = async () => {
        if (excelRows.length === 0) return;
        setImportError(null);
        setImportLoading(true);
        setImportProgress(0);

        const totalRows = excelRows.length;
        const batchSize = 50; // Process 50 rows at a time
        const batches = [];
        
        for (let i = 0; i < totalRows; i += batchSize) {
            batches.push(excelRows.slice(i, i + batchSize));
        }

        try {
            for (let i = 0; i < batches.length; i++) {
                await new Promise((resolve, reject) => {
                    router.post(route('admin.inventory.categories.bulkImport'), {
                        rows: batches[i],
                    }, {
                        preserveScroll: true,
                        preserveState: true,
                        onSuccess: () => {
                            const progress = Math.min(Math.round(((i + 1) / batches.length) * 100), 100);
                            setImportProgress(progress);
                            resolve();
                        },
                        onError: (err) => {
                            reject(err);
                        }
                    });
                });
            }
            
            setShowImport(false);
            setExcelRows([]);
            setInvalidRows([]);
            setImportSummary({});
            setImportProgress(0);
            router.reload({ only: ['categories', 'categoryTree', 'parents'] });
        } catch (err) {
            setImportError('Failed to import. Some rows may not have been processed.');
            console.error(err);
        } finally {
            setImportLoading(false);
        }
    };

    const handleExportExcel = () => {
        try {
            const dataToExport = categories.map(cat => ({
                'Name': cat.name,
                'Slug': cat.slug,
                'Parent ID': cat.parent_id || '',
                'Description': cat.description || '',
                'Status': cat.status || 'active',
                'Order': cat.order || 0,
                'Featured': cat.is_featured ? 'Yes' : 'No',
                'Default': cat.is_default ? 'Yes' : 'No',
                'Icon': cat.icon || ''
            }));

            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Categories");

            const wscols = [
                { wch: 30 }, // Name
                { wch: 30 }, // Slug
                { wch: 10 }, // Parent
                { wch: 40 }, // Description
                { wch: 10 }, // Status
                { wch: 10 }, // Order
                { wch: 10 }, // Featured
                { wch: 10 }, // Default
                { wch: 20 }  // Icon
            ];
            worksheet['!cols'] = wscols;

            XLSX.writeFile(workbook, `Categories_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success('تم تصدير البيانات بنجاح');
        } catch (err) {
            console.error('Export failed:', err);
            toast.error('فشل عملية التصدير');
        }
    };

    const renderImportModal = () => {
        if (!showImport) return null;

        return (
            <div className="modal-overlay active" onClick={() => !importLoading && setShowImport(false)}>
                <div className="modal import-modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3 className="modal-title">Import Categories from Excel</h3>
                        <button className="modal-close" onClick={() => setShowImport(false)}>&times;</button>
                    </div>

                    <div className="modal-body">
                        {!excelRows.length && !invalidRows.length ? (
                            <div 
                                className="drop-zone"
                                onDragOver={e => e.preventDefault()}
                                onDrop={handleFileDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={e => handleFileUpload(e.target.files[0])} 
                                    accept=".xlsx, .xls"
                                    style={{ display: 'none' }}
                                />
                                <i className="material-icons-outlined" style={{ fontSize: '48px', color: '#3b82f6' }}>cloud_upload</i>
                                <p>Click to upload or drag and drop</p>
                                <span>Excel files only (.xlsx, .xls)</span>
                                <button className="btn-template" onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}>
                                    Download Template
                                </button>
                            </div>
                        ) : (
                            <div className="import-preview-container">
                                <div className="preview-stats">
                                    <span className="stat-badge total">Total: {importSummary.total}</span>
                                    <span className="stat-badge valid">Valid: {importSummary.valid}</span>
                                    <span className="stat-badge invalid">Invalid: {importSummary.invalid}</span>
                                    <button className="btn-reset" onClick={() => { setExcelRows([]); setInvalidRows([]); }}>
                                        Upload Different File
                                    </button>
                                </div>

                                {importLoading && (
                                    <div className="progress-bar-container">
                                        <div className="progress-bar">
                                            <div 
                                                className="progress-bar__fill" 
                                                style={{ width: `${importProgress}%` }}
                                            ></div>
                                        </div>
                                        <div className="progress-text">جاري الاستيراد: {importProgress}%</div>
                                    </div>
                                )}

                                <div className="import-tables">
                                    {excelRows.length > 0 && (
                                        <div className="import-section">
                                            <h4>Valid Rows ({excelRows.length})</h4>
                                            <div className="table-responsive">
                                                <table className="data-table preview-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Name</th>
                                                            <th>Slug</th>
                                                            <th>Parent</th>
                                                            <th>Status</th>
                                                            <th></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {excelRows.map((row, idx) => (
                                                            <tr key={idx}>
                                                                <td>{row.name}</td>
                                                                <td>{row.slug}</td>
                                                                <td>{row.parent_name || '-'}</td>
                                                                <td>{row.status}</td>
                                                                <td>
                                                                    <button className="btn-remove" onClick={() => removeImportRow(idx)}>&times;</button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {invalidRows.length > 0 && (
                                        <div className="import-section invalid">
                                            <h4>Invalid Rows ({invalidRows.length})</h4>
                                            <div className="table-responsive">
                                                <table className="data-table preview-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Name</th>
                                                            <th>Errors</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {invalidRows.map((row, idx) => (
                                                            <tr key={idx} className="invalid-row">
                                                                <td>{row.name || '-'}</td>
                                                                <td>
                                                                    {row._errors.map((err, i) => (
                                                                        <span key={i} className="row-error">{err}</span>
                                                                    ))}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {importError && (
                            <div className="alert alert--error" style={{ marginTop: '20px' }}>
                                {importError}
                            </div>
                        )}

                        <div className="import-instructions">
                            <h4>Instructions:</h4>
                            <ul>
                                <li>Download the template to ensure correct column mapping.</li>
                                <li><b>name:</b> Required.</li>
                                <li><b>slug:</b> Optional. Auto-generated from name if empty.</li>
                                <li><b>parent_name:</b> Optional. Must match an existing category name.</li>
                                <li><b>status:</b> active or inactive.</li>
                                <li><b>order:</b> Numeric value for sorting.</li>
                                <li><b>is_featured:</b> 1 for yes, 0 for no.</li>
                                <li><b>is_default:</b> 1 for yes, 0 for no.</li>
                            </ul>
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button className="btn-cancel" onClick={() => setShowImport(false)}>Cancel</button>
                        <button 
                            className="btn-primary" 
                            onClick={submitImport}
                            disabled={excelRows.length === 0 || importLoading}
                        >
                            {importLoading ? 'Importing...' : `Import ${excelRows.length} Categories`}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <AdminLayout activeMenu="Inventory">
            <Head title="Categories Management" />
            <ToastContainer position="top-right" autoClose={3000} />
            {renderImportModal()}

            <div className="categories-actions-header">
                <div className="excel-dropdown-container" ref={excelMenuRef}>
                    <button 
                        className="btn btn-outline excel-btn" 
                        onClick={() => setShowExcelMenu(!showExcelMenu)}
                    >
                        <i className="material-icons-outlined">grid_on</i>
                        <span>Excel</span>
                        <i className="material-icons-outlined">expand_more</i>
                    </button>
                    
                    {showExcelMenu && (
                        <div className="excel-dropdown-menu">
                            <button className="excel-menu-item" onClick={() => { setShowExcelMenu(false); setShowImport(true); }}>
                                <i className="material-icons-outlined">upload</i>
                                <span>Import from Excel</span>
                            </button>
                            <button className="excel-menu-item" onClick={() => { setShowExcelMenu(false); handleExportExcel(); }}>
                                <i className="material-icons-outlined">download</i>
                                <span>Export to Excel</span>
                            </button>
                            <button className="excel-menu-item" onClick={() => { setShowExcelMenu(false); downloadTemplate(); }}>
                                <i className="material-icons-outlined">description</i>
                                <span>Download Template</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

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
                                key={`${treeVersion}-${cat.id}`} 
                                category={cat} 
                                treeVersion={treeVersion}
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
                                        className={`form-control ${errors.parent_id ? 'is-invalid' : ''}`}
                                        value={data.parent_id || 0}
                                        onChange={e => setData('parent_id', Number(e.target.value))}
                                    >
                                        <option value={0}>None (Top Level)</option>
                                        {renderParentOptions(categoryTree)}
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
