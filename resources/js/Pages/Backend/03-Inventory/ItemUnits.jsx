import React, { useState, useEffect, useRef } from 'react';
import { Head, router, useForm, Link, usePage } from '@inertiajs/react';
import * as XLSX from 'xlsx';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AdminLayout from '../components/AdminLayout';
import IconPicker from '../../../Components/IconPicker';
import MediaPickerModal from '../Media/MediaPickerModal';

// --- Recursive Item Unit Tree Item ---
const ItemUnitItem = ({ unit, treeVersion, level = 0, selectedId, onSelect, onDelete, onDrop, onDragStart }) => {
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
                    }}
                    style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
                >
                    <span className="material-icons-outlined">
                        {hasChildren ? 'expand_more' : 'chevron_right'}
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

            {hasChildren && (
                <div className="category-children">
                    {unit.children.map(child => (
                        <ItemUnitItem 
                            key={`${treeVersion}-${child.id}`} 
                            unit={child} 
                            treeVersion={treeVersion}
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
    const { props } = usePage();
    const { localization } = props;
    const translations = localization?.translations || {};

    const __ = (key, replacements = {}) => {
        let text = translations[`ItemUnits.${key}`] || key;
        Object.keys(replacements).forEach(r => {
            text = text.replace(`:${r}`, replacements[r]);
        });
        return text;
    };

    const getLocalizedRoute = (name, params = {}) => {
        return route(name, {
            country: localization?.country_code || 'sa',
            lang: localization?.current_locale || 'ar',
            ...params
        });
    };

    const [unitTree, setUnitTree] = useState([]);
    const [treeVersion, setTreeVersion] = useState(0);
    const [selectedUnit, setSelectedUnit] = useState(null); // null means "Create New" mode or nothing selected
    const [isCreating, setIsCreating] = useState(true); // explicit flag for Create Mode
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
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        unit_type: 1, // 1=Main, 2=Sub
        base_unit: '',
        conversion_factor: 1,
        active: true,
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
        setTreeVersion((v) => v + 1);
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
            post(getLocalizedRoute('admin.inventory.item-units.store'), options);
        } else if (selectedUnit) {
            put(getLocalizedRoute('admin.inventory.item-units.update', { item_unit: selectedUnit.id }), options);
        }
    };

    const handleDelete = (id) => {
        if (window.confirm(__('delete_confirm'))) {
            router.delete(getLocalizedRoute('admin.inventory.item-units.destroy', { item_unit: id }), {
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

        router.put(getLocalizedRoute('admin.inventory.item-units.update', { item_unit: draggedId }), {
            ...unit,
            base_unit: newParentId,
            unit_type: newType,
            conversion_factor: newFactor
        }, { preserveScroll: true });
    };

    // UPDATED IMPORT/EXPORT SECTION
    const downloadTemplate = () => {
        const headers = ['name', 'unit_type', 'base_unit_name', 'conversion_factor', 'active'];
        const sample = ['Box', '2', 'Kilogram', '10', '1'];
        const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "item_units_template.xlsx");
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
            'unit_type': headers.indexOf('unit_type'),
            'base_unit_name': headers.indexOf('base_unit_name'),
            'conversion_factor': headers.indexOf('conversion_factor'),
            'active': headers.indexOf('active'),
        };

        dataRows.forEach((row) => {
            const getVal = (key) => {
                const colIdx = map[key];
                return colIdx !== -1 && row[colIdx] !== undefined ? String(row[colIdx]).trim() : '';
            };

            const item = {
                name: getVal('name'),
                unit_type: getVal('unit_type') || '1',
                base_unit_name: getVal('base_unit_name'),
                conversion_factor: getVal('conversion_factor') || '1',
                active: getVal('active') === '0' ? false : true,
                _errors: []
            };

            // Client-side Validation
            if (!item.name) item._errors.push(__('name_required'));
            
            // Check duplicates in current batch
            if (valid.find(v => v.name === item.name && item.name)) {
                item._errors.push(__('duplicate_name'));
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
        const batchSize = 50;
        const batches = [];
        
        for (let i = 0; i < totalRows; i += batchSize) {
            batches.push(excelRows.slice(i, i + batchSize));
        }

        try {
            for (let i = 0; i < batches.length; i++) {
                await new Promise((resolve, reject) => {
                    router.post(getLocalizedRoute('admin.inventory.item-units.bulkImport'), {
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
            router.reload({ only: ['units', 'parents'] });
        } catch (err) {
            setImportError('Failed to import. Some rows may not have been processed.');
            console.error(err);
        } finally {
            setImportLoading(false);
        }
    };

    const handleExportExcel = () => {
        try {
            const dataToExport = units.map(unit => ({
                [__('unit_name')]: unit.name,
                [__('unit_type')]: unit.unit_type === 1 ? __('main_unit') : __('sub_unit'),
                [__('base_unit')]: unit.base_unit_name || (unit.base_unit ? parents.find(p => p.id === unit.base_unit)?.name : ''),
                [__('conversion_factor')]: unit.conversion_factor || 1,
                [__('active')]: unit.active ? __('yes') : __('no')
            }));

            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "ItemUnits");

            const wscols = [
                { wch: 30 }, // Name
                { wch: 15 }, // Type
                { wch: 20 }, // Base Unit
                { wch: 20 }, // Factor
                { wch: 10 }  // Active
            ];
            worksheet['!cols'] = wscols;

            XLSX.writeFile(workbook, `ItemUnits_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success(localization?.current_locale === 'ar' ? 'تم تصدير البيانات بنجاح' : 'Data exported successfully');
        } catch (err) {
            console.error('Export failed:', err);
            toast.error(localization?.current_locale === 'ar' ? 'فشل عملية التصدير' : 'Export failed');
        }
    };

    const renderImportModal = () => {
        if (!showImport) return null;

        return (
            <div className="modal-overlay active" onClick={() => !importLoading && setShowImport(false)}>
                <div className="modal import-modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3 className="modal-title">{__('import_title')}</h3>
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
                                <p>{__('click_to_upload')}</p>
                                <span>{__('excel_only')}</span>
                                <button className="btn-template" onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}>
                                    {__('download_template')}
                                </button>
                            </div>
                        ) : (
                            <div className="import-preview-container">
                                <div className="preview-stats">
                                    <span className="stat-badge total">{__('total')}: {importSummary.total}</span>
                                    <span className="stat-badge valid">{__('valid')}: {importSummary.valid}</span>
                                    <span className="stat-badge invalid">{__('invalid')}: {importSummary.invalid}</span>
                                    <button className="btn-reset" onClick={() => { setExcelRows([]); setInvalidRows([]); }}>
                                        {__('upload_different_file')}
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
                                        <div className="progress-text">{__('import_progress', { progress: importProgress })}</div>
                                    </div>
                                )}

                                <div className="import-tables">
                                    {excelRows.length > 0 && (
                                        <div className="import-section">
                                            <h4>{__('valid_rows', { count: excelRows.length })}</h4>
                                            <div className="table-responsive">
                                                <table className="data-table preview-table">
                                                    <thead>
                                                        <tr>
                                                            <th>{__('unit_name')}</th>
                                                            <th>{__('unit_type')}</th>
                                                            <th>{__('base_unit')}</th>
                                                            <th>{__('conversion_factor')}</th>
                                                            <th></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {excelRows.map((row, idx) => (
                                                            <tr key={idx}>
                                                                <td>{row.name}</td>
                                                                <td>{row.unit_type === '1' ? __('main_unit') : __('sub_unit')}</td>
                                                                <td>{row.base_unit_name || '-'}</td>
                                                                <td>{row.conversion_factor}</td>
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
                                            <h4>{__('invalid_rows', { count: invalidRows.length })}</h4>
                                            <div className="table-responsive">
                                                <table className="data-table preview-table">
                                                    <thead>
                                                        <tr>
                                                            <th>{__('unit_name')}</th>
                                                            <th>{__('errors')}</th>
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
                            <h4>{__('instructions')}</h4>
                            <ul>
                                <li>{__('instruction_template')}</li>
                                <li><b>{__('instruction_name')}</b></li>
                                <li><b>{__('instruction_unit_type')}</b></li>
                                <li><b>{__('instruction_base_unit')}</b></li>
                                <li><b>{__('instruction_factor')}</b></li>
                                <li><b>{__('instruction_active')}</b></li>
                            </ul>
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button className="btn-cancel" onClick={() => setShowImport(false)}>{__('cancel')}</button>
                        <button 
                            className="btn-primary" 
                            onClick={submitImport}
                            disabled={excelRows.length === 0 || importLoading}
                        >
                            {importLoading ? __('importing') : __('import_button', { count: excelRows.length })}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <AdminLayout activeMenu="Inventory">
            <Head title={__('title')} />
            <ToastContainer position="top-right" autoClose={3000} />
            {renderImportModal()}

            <div className="categories-actions-header">
                <div className="excel-dropdown-container" ref={excelMenuRef}>
                    <button 
                        className="btn btn-outline excel-btn" 
                        onClick={() => setShowExcelMenu(!showExcelMenu)}
                    >
                        <i className="material-icons-outlined">grid_on</i>
                        <span>{__('excel')}</span>
                        <i className="material-icons-outlined">expand_more</i>
                    </button>
                    
                    {showExcelMenu && (
                        <div className="excel-dropdown-menu">
                            <button className="excel-menu-item" onClick={() => { setShowExcelMenu(false); setShowImport(true); }}>
                                <i className="material-icons-outlined">upload</i>
                                <span>{__('import_from_excel')}</span>
                            </button>
                            <button className="excel-menu-item" onClick={() => { setShowExcelMenu(false); handleExportExcel(); }}>
                                <i className="material-icons-outlined">download</i>
                                <span>{__('export_to_excel')}</span>
                            </button>
                            <button className="excel-menu-item" onClick={() => { setShowExcelMenu(false); downloadTemplate(); }}>
                                <i className="material-icons-outlined">description</i>
                                <span>{__('download_template')}</span>
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
                            {__('create_new')}
                        </button>
                        <p className="instruction-text">
                            {__('instruction_drag_drop')}
                        </p>
                    </div>

                    <div 
                        className="tree-container"
                        onDragOver={(e) => e.preventDefault()} 
                        onDrop={handleDropOnRoot}
                    >
                        {unitTree.map(unit => (
                            <ItemUnitItem 
                                key={`${treeVersion}-${unit.id}`} 
                                unit={unit} 
                                treeVersion={treeVersion}
                                selectedId={selectedUnit?.id}
                                onSelect={handleSelectUnit}
                                onDelete={handleDelete}
                                onDrop={handleMoveUnit}
                                onDragStart={handleDragStart}
                            />
                        ))}
                        {unitTree.length === 0 && (
                            <div className="empty-tree">{__('no_units_found')}</div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: Editor Panel */}
                <div className="categories-main">
                    <div className="editor-card">
                        <div className="editor-header">
                            <h2>{isCreating ? __('create_new_unit') : __('edit_unit')}</h2>
                        </div>
                        
                        <form className="editor-form" onSubmit={(e) => handleSubmit(e, false)}>
                            {/* Name */}
                            <div className="form-group">
                                <label>{__('unit_name')}</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={data.name}
                                    onChange={e => setData('name', e.target.value)}
                                    placeholder={__('unit_name')}
                                    required
                                />
                                {errors.name && <div className="error-text">{errors.name}</div>}
                            </div>

                            {/* Unit Type & Parent */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label>{__('unit_type')}</label>
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
                                        <option value={1}>{__('main_unit')}</option>
                                        <option value={2}>{__('sub_unit')}</option>
                                    </select>
                                    {errors.unit_type && <div className="error-text">{errors.unit_type}</div>}
                                </div>

                                <div className="form-group">
                                    <label>{__('base_unit')}</label>
                                    <select 
                                        className="form-control"
                                        value={data.base_unit}
                                        onChange={e => setData('base_unit', e.target.value)}
                                        disabled={data.unit_type === 1}
                                    >
                                        <option value="">{__('none_top_level')}</option>
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
                                <label>{__('conversion_factor')}</label>
                                <input 
                                    type="number" 
                                    step="0.0001"
                                    className="form-control"
                                    value={data.conversion_factor}
                                    onChange={e => setData('conversion_factor', e.target.value)}
                                    placeholder={__('conversion_factor')}
                                    disabled={data.unit_type === 1} // Main units are always 1
                                    required
                                />
                                <small className="helper-text">
                                    {data.unit_type === 1 
                                        ? __('conversion_factor_helper_main')
                                        : __('conversion_factor_helper_sub')}
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
                                    <span className="toggle-label">{__('active')}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary" disabled={processing}>
                                    {processing ? __('saving') : __('save')}
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-secondary" 
                                    onClick={(e) => handleSubmit(e, true)}
                                    disabled={processing}
                                >
                                    {__('save_and_exit')}
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
