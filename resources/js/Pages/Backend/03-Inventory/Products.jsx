import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Head, Link, usePage, useForm, router } from '@inertiajs/react';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/main.scss';
import MediaPickerModal from '../Media/MediaPickerModal';

// ==========================================
// Helper Components
// ==========================================

const CategoryTreeItem = ({ category, selectedIds, onToggle, level = 0, search = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const hasChildren = category.children && category.children.length > 0;
    
    const matchesSearch = search 
        ? category.name.toLowerCase().includes(search.toLowerCase()) || 
          (hasChildren && category.children.some(child => child.name.toLowerCase().includes(search.toLowerCase())))
        : true;

    // Auto-open if children match search
    useEffect(() => {
        if (search && hasChildren && category.children.some(child => child.name.toLowerCase().includes(search.toLowerCase()))) {
            setIsOpen(true);
        }
    }, [search, hasChildren, category.children]);

    if (!matchesSearch && search !== '') return null;
    
    const handleToggle = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    const isSelected = selectedIds.includes(String(category.id));

    return (
        <div className="category-tree-item" style={{ '--level': level }}>
            <div className={`category-row ${isSelected ? 'selected' : ''}`}>
                <div className="category-row-inner" onClick={() => onToggle(String(category.id))}>
                    {hasChildren ? (
                        <span 
                            className={`toggle-icon ${isOpen ? 'open' : ''}`}
                            onClick={handleToggle}
                        >
                            <span className="material-icons-outlined">
                                chevron_right
                            </span>
                        </span>
                    ) : (
                        <span className="toggle-placeholder"></span>
                    )}
                    
                    <div className="checkbox-custom">
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggle(String(category.id))}
                        />
                        <span className="checkmark"></span>
                    </div>
                    <span className="category-name">{category.name}</span>
                </div>
            </div>

            {hasChildren && (
                <div className={`category-children ${isOpen ? 'expanded' : ''}`}>
                    {category.children.map(child => (
                        <CategoryTreeItem
                            key={child.id}
                            category={child}
                            selectedIds={selectedIds}
                            onToggle={onToggle}
                            level={level + 1}
                            search={search}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// ==========================================
// List Component
// ==========================================

const ProductsList = ({ products, brands, categories, units, filters = {} }) => {
    const { props } = usePage();
    const { flash, localization } = props;

    const getLocalizedRoute = (name, params = {}) => {
        return route(name, {
            country: localization?.country_code || 'sa',
            lang: localization?.current_locale || 'ar',
            ...params
        });
    };

    const safeProducts = (products && Array.isArray(products.data)) 
        ? products 
        : (Array.isArray(products) ? { data: products, total: products.length, from: 1, to: products.length, links: [] } : { data: [], total: 0, from: 0, to: 0, links: [] });
    const safeBrands = Array.isArray(brands) ? brands : [];
    const safeCategories = Array.isArray(categories) ? categories : [];
    const safeUnits = Array.isArray(units) ? units : [];
    
    // Filter States
    const [filterParams, setFilterParams] = useState({
        search: filters.search || '',
        status: filters.status || '',
        brand_id: filters.brand_id || '',
        category_id: filters.category_id || '',
        unit_id: filters.unit_id || '',
    });

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
        if (flash?.success) {
            toast.success(flash.success);
            setShowImport(false);
            setExcelRows([]);
            setInvalidRows([]);
            setImportSummary({});
            setImportProgress(0);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilterParams(prev => ({ ...prev, [name]: value }));
    };

    const applyFilters = () => {
        router.get(getLocalizedRoute('admin.inventory.products.index'), filterParams, { preserveState: true });
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            router.delete(getLocalizedRoute('admin.inventory.products.destroy', { product: id }));
        }
    };

    const downloadTemplate = () => {
        const headers = ['product_code', 'name', 'sku', 'barcode', 'price', 'sale_price', 'cost_price', 'quantity', 'brand', 'categories', 'unit', 'description', 'status', 'order', 'is_featured', 'is_default'];
        const sample = ['PRD-0001', 'Sample Product', 'SKU-001', '123456789', '100', '90', '70', '50', 'Brand Name', 'Category1, Category2', 'Each', 'Product description here', 'active', '1', '1', '0'];
        const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "products_template.xlsx");
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
            'name': headers.findIndex(h => h === 'name' || h === 'product name'),
            'sku': headers.indexOf('sku'),
            'barcode': headers.indexOf('barcode'),
            'price': headers.indexOf('price'),
            'sale_price': headers.findIndex(h => h === 'sale_price' || h === 'sale price'),
            'cost_price': headers.findIndex(h => h === 'cost_price' || h === 'cost price'),
            'quantity': headers.indexOf('quantity'),
            'brand': headers.indexOf('brand'),
            'unit': headers.indexOf('unit'),
            'categories': headers.indexOf('categories'),
            'description': headers.indexOf('description'),
            'status': headers.indexOf('status'),
            'order': headers.indexOf('order'),
            'is_featured': headers.findIndex(h => h === 'is_featured' || h === 'is featured'),
            'is_default': headers.findIndex(h => h === 'is_default' || h === 'is default'),
            'product_code': headers.findIndex(h => h === 'product_code' || h === 'product code'),
        };

        dataRows.forEach((row) => {
            const getVal = (key) => {
                const colIdx = map[key];
                return colIdx !== -1 && row[colIdx] !== undefined ? String(row[colIdx]).trim() : '';
            };

            const item = {
                name: getVal('name'),
                product_code: getVal('product_code'),
                sku: getVal('sku'),
                barcode: getVal('barcode'),
                price: getVal('price'),
                sale_price: getVal('sale_price'),
                cost_price: getVal('cost_price'),
                quantity: getVal('quantity'),
                brand: getVal('brand'),
                unit: getVal('unit'),
                categories: getVal('categories'),
                description: getVal('description'),
                status: getVal('status') || 'active',
                order: getVal('order') || '0',
                is_featured: getVal('is_featured') === '1' || getVal('is_featured') === 'yes',
                is_default: getVal('is_default') === '1' || getVal('is_default') === 'yes',
                _errors: []
            };

            if (!item.name) {
                item._errors.push('Name is required');
            }

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
        const batchSize = 50;
        const batches = [];
        
        for (let i = 0; i < totalRows; i += batchSize) {
            batches.push(excelRows.slice(i, i + batchSize));
        }

        try {
            for (let i = 0; i < batches.length; i++) {
                // استخدام axios لضمان استمرار الحلقة دون تداخل مع دورة حياة Inertia
                await axios.post(getLocalizedRoute('admin.inventory.products.bulkImport'), {
                    rows: batches[i],
                });
                
                const progress = Math.min(Math.round(((i + 1) / batches.length) * 100), 100);
                setImportProgress(progress);
            }
            
            toast.success('تم استيراد جميع المنتجات بنجاح');
            setShowImport(false);
            setExcelRows([]);
            setInvalidRows([]);
            setImportSummary({});
            setImportProgress(0);
            router.reload({ only: ['products'] });
        } catch (err) {
            setImportError('فشل الاستيراد. قد لا تكون بعض الصفوف قد تمت معالجتها: ' + (err.response?.data?.message || err.message));
            console.error(err);
        } finally {
            setImportLoading(false);
        }
    };

    const handleExportExcel = () => {
        try {
            // التحقق من وجود مسار التصدير
            if (typeof route === 'function') {
                window.location.href = getLocalizedRoute('admin.inventory.products.export');
                toast.info('جاري بدء عملية تصدير جميع المنتجات...');
                setShowExcelMenu(false);
            } else {
                toast.error('لا يمكن العثور على مسار التصدير');
            }
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
                        <h3 className="modal-title">Import Products from Excel</h3>
                        <button className="modal-close" onClick={() => setShowImport(false)}>&times;</button>
                    </div>
                    <div className="modal-body">
                        {!excelRows.length && !invalidRows.length ? (
                            <div 
                                className={`import-dropzone ${importLoading ? 'loading' : ''}`}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleFileDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept=".xlsx, .xls"
                                    onChange={(e) => handleFileUpload(e.target.files[0])}
                                />
                                <span className="material-icons-outlined drop-icon">cloud_upload</span>
                                <p>Drag and drop Excel file or click to browse</p>
                                <span className="file-hint">Only .xlsx and .xls files are supported</span>
                                {importLoading && <div className="loader"></div>}
                            </div>
                        ) : (
                            <div className="import-preview">
                                <div className="summary-cards">
                                    <div className="summary-card total">
                                        <span className="label">Total Rows</span>
                                        <span className="value">{importSummary.total}</span>
                                    </div>
                                    <div className="summary-card valid">
                                        <span className="label">Valid</span>
                                        <span className="value">{importSummary.valid}</span>
                                    </div>
                                    <div className="summary-card invalid">
                                        <span className="label">Invalid</span>
                                        <span className="value">{importSummary.invalid}</span>
                                    </div>
                                    <button className="btn btn-outline ml-auto" onClick={() => { setExcelRows([]); setInvalidRows([]); }}>
                                        Upload Different File
                                    </button>
                                </div>

                                {importLoading && (
                                    <div className="import-progress-wrapper mt-3">
                                        <div className="progress-info d-flex justify-content-between mb-2">
                                            <span className="progress-label">جاري استيراد المنتجات...</span>
                                            <span className="progress-percentage">{importProgress}%</span>
                                        </div>
                                        <div className="custom-progress-bar" style={{
                                            height: '10px',
                                            backgroundColor: '#e2e8f0',
                                            borderRadius: '5px',
                                            overflow: 'hidden',
                                            width: '100%'
                                        }}>
                                            <div 
                                                className="progress-fill" 
                                                style={{ 
                                                    width: `${importProgress}%`,
                                                    height: '100%',
                                                    backgroundColor: '#3b82f6',
                                                    transition: 'width 0.3s ease',
                                                    boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
                                                }}
                                            ></div>
                                        </div>
                                        <div className="progress-subtext text-muted mt-1 small">
                                            يرجى عدم إغلاق النافذة حتى اكتمال العملية
                                        </div>
                                    </div>
                                )}

                                {excelRows.length > 0 && (
                                    <div className="import-section mt-4">
                                        <h4>Valid Rows ({excelRows.length})</h4>
                                        <div className="table-mini-container">
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th>Name</th>
                                                        <th>SKU</th>
                                                        <th>Unit</th>
                                                        <th>Price</th>
                                                        <th></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {excelRows.slice(0, 50).map((row, i) => (
                                                        <tr key={i}>
                                                            <td>{row.name}</td>
                                                            <td>{row.sku || '-'}</td>
                                                            <td>{row.unit || '-'}</td>
                                                            <td>{row.price || '-'}</td>
                                                            <td>
                                                                <button className="btn-remove" onClick={() => removeImportRow(i)}>&times;</button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {excelRows.length > 50 && <p className="text-muted mt-2">... and {excelRows.length - 50} more rows</p>}
                                        </div>
                                    </div>
                                )}

                                {invalidRows.length > 0 && (
                                    <div className="invalid-rows-section mt-4">
                                        <h4>Invalid Rows (Will be skipped)</h4>
                                        <div className="table-mini-container">
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th>Name</th>
                                                        <th>Errors</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {invalidRows.map((row, i) => (
                                                        <tr key={i}>
                                                            <td>{row.name || 'Empty'}</td>
                                                            <td className="text-danger">
                                                                {row._errors.map((err, idx) => (
                                                                    <div key={idx}>{err}</div>
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
                        )}
                        {importError && <div className="alert alert-danger mt-3">{importError}</div>}

                        <div className="import-instructions mt-4">
                            <h4>Instructions:</h4>
                            <ul>
                                <li>Download the template to ensure correct column mapping.</li>
                                <li><b>name:</b> Required.</li>
                                <li><b>sku:</b> Product SKU (Stock Keeping Unit).</li>
                                <li><b>price:</b> Selling price.</li>
                                <li><b>status:</b> active or inactive.</li>
                                <li><b>brand:</b> Optional. Must match an existing brand name.</li>
                                <li><b>categories:</b> Optional. Comma-separated category names.</li>
                                <li><b>unit:</b> Optional. Must match an existing unit name.</li>
                            </ul>
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button className="btn-cancel" onClick={() => setShowImport(false)} disabled={importLoading}>Cancel</button>
                        {excelRows.length > 0 && (
                            <button 
                                className="btn-primary" 
                                onClick={submitImport}
                                disabled={importLoading}
                            >
                                {importLoading ? 'Importing...' : `Import ${excelRows.length} Products`}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <AdminLayout activeMenu="Inventory">
            <Head title="Products" />
            <ToastContainer position="top-right" autoClose={3000} />
            {renderImportModal()}
            
            <div className="products-page">
                <div className="content-area">
                <div className="page-header-section">
                    <div className="breadcrumb">
                        <Link href={getLocalizedRoute('admin.dashboard')}>Dashboard</Link>
                        <span>/</span>
                        <span>Inventory</span>
                        <span>/</span>
                        <span className="current">Products</span>
                    </div>
                    <h1 className="page-title">Products</h1>
                </div>

                {flash.success && (
                    <div className="alert alert-success">
                        {flash.success}
                    </div>
                )}
                {flash.error && (
                    <div className="alert alert-danger">
                        {flash.error}
                    </div>
                )}

                {/* Stats Cards */}
                <div className="stats-cards">
                    <div className="stat-card">
                        <div className="stat-icon blue-gradient">
                            <span className="material-icons-outlined">inventory_2</span>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{safeProducts.total}</div>
                            <div className="stat-label">Total Products</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon green-gradient">
                            <span className="material-icons-outlined">category</span>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{safeCategories.length}</div>
                            <div className="stat-label">Total Categories</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon indigo-gradient">
                            <span className="material-icons-outlined">branding_watermark</span>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{safeBrands.length}</div>
                            <div className="stat-label">Total Brands</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon amber-gradient">
                            <span className="material-icons-outlined">attach_money</span>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">$0.00</div>
                            <div className="stat-label">Total Value</div>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header d-flex justify-between align-items-center">
                        <h3>Products List</h3>
                        <div className="card-actions d-flex gap-2">
                            <div className="search-bar">
                                <input 
                                    type="text" 
                                    name="search"
                                    placeholder="Search..." 
                                    value={filterParams.search}
                                    onChange={handleFilterChange}
                                />
                                <button onClick={applyFilters}>
                                    <span className="material-icons-outlined">search</span>
                                </button>
                            </div>
                            
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

                            <Link className="btn btn-primary" href={getLocalizedRoute('admin.inventory.products.create')}>
                                <span className="material-icons-outlined">add</span>
                                Add Product
                            </Link>
                        </div>
                    </div>

                    <div className="filter-bar">
                        <select name="category_id" className="form-control filter-select" value={filterParams.category_id} onChange={handleFilterChange}>
                            <option value="">All Categories</option>
                            {safeCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <select name="brand_id" className="form-control filter-select" value={filterParams.brand_id} onChange={handleFilterChange}>
                                        <option value="">All Brands</option>
                                        {safeBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>

                                    <select name="unit_id" className="form-control filter-select" value={filterParams.unit_id} onChange={handleFilterChange}>
                                        <option value="">All Units</option>
                                        {safeUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>

                                    <select name="status" className="form-control filter-select" value={filterParams.status} onChange={handleFilterChange}>
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="draft">Draft</option>
                        </select>
                        <button className="btn btn-outline" onClick={applyFilters}>Filter</button>
                    </div>

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>SKU</th>
                                    <th>Category</th>
                                    <th>Brand</th>
                                    <th>Unit</th>
                                    <th>Price</th>
                                    <th>Stock</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {safeProducts.data.length > 0 ? (
                                    safeProducts.data.map(product => (
                                        <tr key={product.id}>
                                            <td>
                                                <div className="product-cell">
                                                    {product.image ? (
                                                        <img src={`/media-files/${product.image}`} alt={product.name} className="product-thumb" />
                                                    ) : (
                                                        <div className="product-thumb-placeholder">
                                                            <span className="material-icons-outlined text-gray-light">image</span>
                                                        </div>
                                                    )}
                                                    <div className="product-info">
                                                        <div className="product-name">{product?.name || 'No Name'}</div>
                                                        <div className="product-code">{product?.product_code || ''}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{product.sku || '-'}</td>
                                            <td>{(product.categories && product.categories.length > 0 ? product.categories[0].name : null) || '-'}</td>
                                            <td>{product.brand?.name || '-'}</td>
                                            <td>{product.unit?.name || '-'}</td>
                                            <td>${product.price || '0.00'}</td>
                                            <td>
                                                <span className={`status-badge ${product.quantity > 0 ? 'status-active' : 'status-error'}`}>
                                                    {product.quantity}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`status-badge status-${product.status}`}>
                                                    {product.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="actions-cell">
                                                    <button
                                                        className="icon-btn edit"
                                                        onClick={() => router.get(getLocalizedRoute('admin.inventory.products.edit', { product: product.id }))}
                                                        title="Edit"
                                                    >
                                                        <span className="material-icons-outlined">edit</span>
                                                    </button>
                                                    <button className="icon-btn delete" onClick={() => handleDelete(product.id)} title="Delete">
                                                        <span className="material-icons-outlined">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="9" className="empty-state">No products found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {safeProducts.links && (
                        <div className="pagination">
                            <div className="pagination-info">
                                Showing {safeProducts.from} to {safeProducts.to} of {safeProducts.total} results
                            </div>
                            <div className="pagination-controls">
                                {safeProducts.links.map((link, i) => (
                                    <button
                                        key={i}
                                        className={`page-btn ${link.active ? 'active' : ''}`}
                                        onClick={() => link.url && router.get(link.url, filterParams, { preserveState: true })}
                                        disabled={!link.url}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    ></button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </AdminLayout>
    );
};

// ==========================================
// Form Component (Create/Edit)
// ==========================================

const ProductsForm = ({ product, categories, brands, units = [], itemAttributes = [], suppliers = [] }) => {
    const { props } = usePage();
    const { localization } = props;

    const getLocalizedRoute = (name, params = {}) => {
        return route(name, {
            country: localization?.country_code || 'sa',
            lang: localization?.current_locale || 'ar',
            ...params
        });
    };

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        name: '',
        parent_id: '',
        status: 'active',
        order: 0,
        description: '',
        content: '',
        sku: '',
        barcode: '',
        brand_id: '',
        unit_id: '',
        category_ids: [],
        product_type: 'simple',
        supplier_code: '',
        is_variation: false,
        is_featured: 0,
        variations: [],
        price: '',
        sale_price: '',
        cost_per_item: '',
        tax_id: '',
        price_includes_tax: false,
        quantity: 0,
        stock_status: 'in_stock',
        allow_checkout_when_out_of_stock: false,
        with_storehouse_management: false,
        minimum_order_quantity: 1,
        maximum_order_quantity: '',
        weight: '',
        length: '',
        wide: '',
        height: '',
        meta_title: '',
        meta_description: '',
        image: null,
        gallery: [],
        existing_images: [],
        delete_image: false,
        ...(product ? { _method: 'PUT' } : {}),
    });
    const submitLockRef = useRef(false);
    const [submitLock, setSubmitLock] = useState(false);
    const requestKeyRef = useRef(`${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
    const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
    const [mediaPickerMode, setMediaPickerMode] = useState('single');
    const [isVariationModalOpen, setIsVariationModalOpen] = useState(false);
    const [variationForm, setVariationForm] = useState({
        color: '',
        size: '',
        sku: '',
        price: '',
        stock: '',
        sale_price: '',
        cost_per_item: '',
        barcode: '',
        stock_status: 'in_stock',
        weight: '',
        length: '',
        wide: '',
        height: '',
    });
    const [newVariationImages, setNewVariationImages] = useState([]);
    const [currentVariationImageTarget, setCurrentVariationImageTarget] = useState(null);
    const [selectedAttributeIds, setSelectedAttributeIds] = useState([]);
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [selectedVariationOptions, setSelectedVariationOptions] = useState({});
    const [variationAttributeValues, setVariationAttributeValues] = useState({});
    const [variationsSearch, setVariationsSearch] = useState('');
    const [isEditVariationModalOpen, setIsEditVariationModalOpen] = useState(false);
    const [editingVariationId, setEditingVariationId] = useState(null);
    const [editVariationForm, setEditVariationForm] = useState({
        sku: '',
        price: '',
        stock: '',
        sale_price: '',
        cost_per_item: '',
        barcode: '',
        stock_status: 'in_stock',
        weight: '',
        length: '',
        wide: '',
        height: '',
        attribute_values: {},
    });

    const [permalink, setPermalink] = useState('');
    const [showContentEditor, setShowContentEditor] = useState(true);
    const [showSeoMeta, setShowSeoMeta] = useState(false);
    const [specTable, setSpecTable] = useState('none');
    const [store, setStore] = useState('');
    const [categorySearch, setCategorySearch] = useState('');
    const [taxOption, setTaxOption] = useState('none');
    const [isAttributesExpanded, setIsAttributesExpanded] = useState(false);
    void showSeoMeta;
    void setShowSeoMeta;
    void specTable;
    void setSpecTable;
    void store;
    void setStore;
    void setCategorySearch;
    void taxOption;
    void setTaxOption;

    const handleVariationChange = (field, value) => {
        setVariationForm(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const closeVariationModal = () => {
        setIsVariationModalOpen(false);
    };

    const toggleAttributeSelection = (id) => {
        setSelectedAttributeIds(prev =>
            prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
        );
    };

    const openGenerateModal = () => {
        if (!selectedAttributeIds.length) {
            window.alert('Please select attributes first.');
            return;
        }

        const initial = {};
        itemAttributes
            .filter(attr => selectedAttributeIds.includes(attr.id))
            .forEach(attr => {
                const details = Array.isArray(attr.details) ? attr.details : [];
                initial[attr.id] = details.map(d => d.id);
            });

        setSelectedVariationOptions(initial);
        setIsGenerateModalOpen(true);
    };

    const generateVariationsFromSelections = () => {
        const attrs = selectedAttributeIds
            .map(id => itemAttributes.find(a => a.id === id))
            .filter(Boolean)
            .map(attr => {
                const ids = selectedVariationOptions[attr.id] || [];
                const details = (attr.details || []).filter(d => ids.includes(d.id));
                return { attribute: attr, details };
            })
            .filter(group => group.details.length > 0);

        if (attrs.length === 0) return;

        const arrays = attrs.map(group => group.details.map(d => ({ attribute_id: group.attribute.id, detail_id: d.id })));
        const cartesian = (arrs) => arrs.reduce((acc, curr) => {
            if (acc.length === 0) return curr.map(x => [x]);
            const out = [];
            acc.forEach(a => curr.forEach(b => out.push([...a, b])));
            return out;
        }, []);

        const combos = cartesian(arrays);
        const basePrice = data.price ?? '';

        combos.forEach(combo => {
            const attribute_values = {};
            combo.forEach(({ attribute_id, detail_id }) => {
                attribute_values[attribute_id] = detail_id;
            });

            addVariation({
                id: null,
                tempId: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                sku: '',
                price: basePrice,
                stock: '',
                is_default: false,
                image: '',
                attribute_values,
            });
        });
    };

    const toggleAllOptions = (attributeId, details) => {
        setSelectedVariationOptions(prev => {
            const allIds = details.map(d => d.id);
            const current = prev[attributeId] || [];
            const isAllSelected = current.length === allIds.length;
            return {
                ...prev,
                [attributeId]: isAllSelected ? [] : allIds,
            };
        });
    };

    const hasSelectedAttributes = selectedAttributeIds.length > 0;

    const hasSelectedVariationValues = Object.values(selectedVariationOptions || {}).some(
        (ids) => Array.isArray(ids) && ids.length > 0
    );

    const shouldHideGlobalSections = useMemo(() => {
        return (
            (Array.isArray(data.variations) && data.variations.length > 0) ||
            data.product_type === 'variable' ||
            hasSelectedAttributes
        );
    }, [data.variations, data.product_type, hasSelectedAttributes]);

    const toggleOption = (attributeId, detailId) => {
        setSelectedVariationOptions(prev => {
            const current = prev[attributeId] || [];
            const exists = current.includes(detailId);
            return {
                ...prev,
                [attributeId]: exists
                    ? current.filter(id => id !== detailId)
                    : [...current, detailId],
            };
        });
    };

    const handleVariationAttributeChange = (attributeId, detailId) => {
        setVariationAttributeValues(prev => ({
            ...prev,
            [attributeId]: detailId,
        }));
    };
    
    const handleNewVariationFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            setNewVariationImages(prev => [...prev, ...files]);
        }
    };

    const handleEditVariationFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        setData(curr => {
            const list = Array.isArray(curr.variations) ? curr.variations.slice() : [];
            const updated = list.map(v => {
                if (v.tempId !== editingVariationId) return v;
                const existing = Array.isArray(v.images) ? v.images : (v.image ? [v.image] : []);
                const merged = [...existing, ...files];
                // Ensure image (primary) is set if it was empty
                const primary = v.image || (merged[0] instanceof File ? '' : merged[0]) || ''; 
                // Note: if merged[0] is File, we can't easily set 'image' string yet, 
                // but the backend handles 'images' array which contains the File.
                // For display, we handle File objects.
                return { ...v, images: merged, image: primary };
            });
            return { ...curr, variations: updated };
        });
    };

    const addVariationFromModal = () => {
        const missing = selectedAttributeIds.some(id => !variationAttributeValues[id]);
        if (missing) {
            window.alert('Please select all attribute values.');
            return;
        }
        const attribute_values = {};
        selectedAttributeIds.forEach(id => {
            attribute_values[id] = variationAttributeValues[id];
        });
        addVariation({
            id: null,
            tempId: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            sku: variationForm.sku || '',
            price: variationForm.price || (data.price ?? ''),
            stock: variationForm.stock || '',
            is_default: false,
            image: (newVariationImages && newVariationImages[0]) ? newVariationImages[0] : '',
            images: Array.isArray(newVariationImages) ? newVariationImages.slice() : [],
            attribute_values,
        });
        setVariationForm(v => ({ ...v, sku: '', price: '', stock: '', sale_price: '', cost_per_item: '', barcode: '', weight: '', length: '', wide: '', height: '' }));
        setVariationAttributeValues({});
        setNewVariationImages([]);
        setIsVariationModalOpen(false);
    };

    const attrById = useMemo(() => {
        const map = {};
        (Array.isArray(itemAttributes) ? itemAttributes : []).forEach(attr => {
            const detailsMap = {};
            (Array.isArray(attr.details) ? attr.details : []).forEach(d => {
                detailsMap[d.id] = d;
            });
            map[attr.id] = { ...attr, detailsMap };
        });
        return map;
    }, [itemAttributes]);

    const makeAttributesKey = useCallback((attributeValues) => {
        const ids = Object.keys(attributeValues || {}).map(id => String(id)).sort((a, b) => Number(a) - Number(b));
        return ids.map(id => `${id}:${attributeValues[id]}`).join('|');
    }, []);

    const formatAttributes = useCallback((attributeValues) => {
        const parts = [];
        Object.entries(attributeValues || {}).forEach(([attrId, detailId]) => {
            const a = attrById[attrId];
            if (!a) return;
            const d = a.detailsMap?.[detailId];
            parts.push(`${a.title}: ${d ? d.title : detailId}`);
        });
        return parts.join(', ');
    }, [attrById]);

    const addVariation = useCallback((variation) => {
        setData(curr => {
            const list = Array.isArray(curr.variations) ? curr.variations.slice() : [];
            const key = variation.attributes_key || makeAttributesKey(variation.attribute_values || {});
            const exists = list.some(v => (v.attributes_key || makeAttributesKey(v.attribute_values || {})) === key);
            if (exists) return { ...curr, variations: list };
            const newItem = { ...variation, attributes_key: key };
            list.push(newItem);
            if (!list.some(v => v.is_default)) {
                list[0].is_default = true;
            }
            return { ...curr, variations: list };
        });
    }, [setData, makeAttributesKey]);

    const updateVariationField = useCallback((tempId, field, value) => {
        setData(curr => {
            const list = Array.isArray(curr.variations) ? curr.variations : [];
            const updated = list.map(v => v.tempId === tempId ? { ...v, [field]: value } : v);
            return { ...curr, variations: updated };
        });
    }, [setData]);

    const removeVariation = useCallback((tempId) => {
        setData(curr => {
            const list = Array.isArray(curr.variations) ? curr.variations : [];
            const updated = list.filter(v => v.tempId !== tempId);
            return { ...curr, variations: updated };
        });
    }, [setData]);

    const setDefaultVariation = useCallback((tempId) => {
        setData(curr => {
            const list = Array.isArray(curr.variations) ? curr.variations : [];
            const updated = list.map(v => ({ ...v, is_default: v.tempId === tempId }));
            return { ...curr, variations: updated };
        });
    }, [setData]);

    const currentEditingVariation = useMemo(() => {
        const list = Array.isArray(data.variations) ? data.variations : [];
        return list.find(v => v.tempId === editingVariationId) || null;
    }, [data.variations, editingVariationId]);

    const openEditVariationModal = (tempId) => {
        const list = Array.isArray(data.variations) ? data.variations : [];
        const v = list.find(x => x.tempId === tempId);
        if (!v) return;
        setEditingVariationId(tempId);
        setEditVariationForm({
            sku: v.sku || '',
            price: v.price ?? '',
            stock: v.stock ?? '',
            sale_price: v.sale_price ?? '',
            cost_per_item: v.cost_per_item ?? '',
            barcode: v.barcode || '',
            stock_status: v.stock_status || 'in_stock',
            weight: v.weight ?? '',
            length: v.length ?? '',
            wide: v.wide ?? '',
            height: v.height ?? '',
            attribute_values: { ...(v.attribute_values || {}) },
            images: Array.isArray(v.images) ? [...v.images] : (v.image ? [v.image] : []),
        });
        setIsEditVariationModalOpen(true);
    };

    const closeEditVariationModal = () => {
        setIsEditVariationModalOpen(false);
        setEditingVariationId(null);
    };

    const handleEditVariationChange = (field, value) => {
        setEditVariationForm(prev => ({ ...prev, [field]: value }));
    };

    const handleEditVariationAttributeChange = (attributeId, detailId) => {
        setEditVariationForm(prev => ({
            ...prev,
            attribute_values: { ...(prev.attribute_values || {}), [attributeId]: detailId },
        }));
    };

    const saveEditVariation = () => {
        const editIds = Object.keys(editVariationForm.attribute_values || {});
        const missing = editIds.some(id => !editVariationForm.attribute_values?.[id]);
        if (missing) {
            window.alert('Please select all attribute values.');
            return;
        }
        const newKey = makeAttributesKey(editVariationForm.attribute_values || {});
        setData(curr => {
            const list = Array.isArray(curr.variations) ? curr.variations.slice() : [];
            const dup = list.find(v => (v.attributes_key || makeAttributesKey(v.attribute_values || {})) === newKey && v.tempId !== editingVariationId);
            if (dup) {
                window.alert('A variation with the same properties already exists.');
                return curr;
            }
            const updated = list.map(v => v.tempId === editingVariationId ? {
                ...v,
                sku: editVariationForm.sku || '',
                price: editVariationForm.price === '' ? '' : editVariationForm.price,
                stock: editVariationForm.stock === '' ? '' : editVariationForm.stock,
                sale_price: editVariationForm.sale_price ?? v.sale_price,
                cost_per_item: editVariationForm.cost_per_item ?? v.cost_per_item,
                barcode: editVariationForm.barcode || '',
                stock_status: editVariationForm.stock_status || v.stock_status,
                weight: editVariationForm.weight === '' ? '' : editVariationForm.weight,
                length: editVariationForm.length === '' ? '' : editVariationForm.length,
                wide: editVariationForm.wide === '' ? '' : editVariationForm.wide,
                height: editVariationForm.height === '' ? '' : editVariationForm.height,
                attribute_values: { ...(editVariationForm.attribute_values || {}) },
                attributes_key: newKey,
            } : v);
            return { ...curr, variations: updated };
        });
        setIsEditVariationModalOpen(false);
        setEditingVariationId(null);
    };

    const filteredVariations = useMemo(() => {
        const list = Array.isArray(data.variations) ? data.variations : [];
        if (!variationsSearch) return list;
        const q = variationsSearch.toLowerCase();
        return list.filter(v => {
            const props = formatAttributes(v.attribute_values || {}).toLowerCase();
            return (v.sku || '').toLowerCase().includes(q) || props.includes(q);
        });
    }, [data.variations, variationsSearch, formatAttributes]);

    const categoryTree = useMemo(() => {
        if (!categories) return [];
        const map = {};
        const roots = [];
        // Create a deep copy to avoid mutating props directly if needed, 
        // though mapping usually creates new objects.
        const cats = categories.map(c => ({ ...c, children: [] }));
        
        cats.forEach(c => map[c.id] = c);
        
        cats.forEach(c => {
            if (c.parent_id && map[c.parent_id]) {
                map[c.parent_id].children.push(c);
            } else {
                roots.push(c);
            }
        });
        
        return roots;
    }, [categories]);

    const handleCategoryToggle = (id) => {
        const currentIds = Array.isArray(data.category_ids) ? data.category_ids : [];
        const newIds = currentIds.includes(id)
            ? currentIds.filter(cId => cId !== id)
            : [...currentIds, id];
        setData('category_ids', newIds);
    };

    useEffect(() => {
        clearErrors();
        if (product) {
            const initialCategoryIds =
                product.categories && Array.isArray(product.categories) && product.categories.length > 0
                    ? product.categories.map(c => String(c.id))
                    : [];

            setData({
                ...data,
                ...product,
                name: product.name || '',
                parent_id: product.parent_id || '',
                supplier_code: product.supplier_code || '',
                description: product.description || '',
                content: product.content || '',
                brand_id: product.brand_id || '',
                unit_id: product.unit_id || '',
                category_ids: initialCategoryIds,
                sku: product.sku || '',
                barcode: product.barcode || '',
                status: product.status || 'active',
                stock_status: product.stock_status || 'in_stock',
                product_type: product.product_type || 'simple',
                is_variation: Boolean(product.is_variation),
                quantity: Number.isFinite(Number(product.quantity)) ? Number(product.quantity) : 0,
                minimum_order_quantity: Number.isFinite(Number(product.minimum_order_quantity)) ? Number(product.minimum_order_quantity) : 1,
                maximum_order_quantity: product.maximum_order_quantity || '',
                is_featured: (product.is_featured === 1 || product.is_featured === true || product.is_featured === '1' || product.is_featured === 'true') ? 1 : 0,
                price: product.price || '',
                sale_price: product.sale_price || '',
                cost_per_item: product.cost_per_item || '',
                tax_id: product.tax_id || '',
                price_includes_tax: Boolean(product.price_includes_tax),
                allow_checkout_when_out_of_stock: Boolean(product.allow_checkout_when_out_of_stock),
                with_storehouse_management: Boolean(product.with_storehouse_management),
                weight: product.weight || '',
                length: product.length || '',
                wide: product.wide || '',
                height: product.height || '',
                meta_title: product.meta_title || '',
                meta_description: product.meta_description || '',
                existing_images: product.images || [],
                delete_image: false,
                image: product.image || null,
                gallery: [],
                variations: Array.isArray(product.variations)
                    ? product.variations.map(v => {
                        const child = v.product || {};
                        const attrs = Array.isArray(v.items)
                            ? v.items.reduce((acc, it) => {
                                acc[it.attribute_id] = it.attribute_value;
                                return acc;
                            }, {})
                            : (v.attribute_values || {});
                        return {
                            id: v.id || null,
                            tempId: `v-${v.id || Math.random().toString(36).slice(2)}`,
                            sku: child.sku || '',
                            price: child.price ?? '',
                            sale_price: child.sale_price ?? '',
                            cost_per_item: child.cost_per_item ?? '',
                            barcode: child.barcode || '',
                            stock: child.quantity ?? '',
                            stock_status: child.stock_status || 'in_stock',
                            weight: child.weight ?? '',
                            length: child.length ?? '',
                            wide: child.wide ?? '',
                            height: child.height ?? '',
                            is_default: Boolean(v.is_default),
                            image: child.image || '',
                            images: (Array.isArray(child.images) && child.images.length > 0) ? child.images : (child.image ? [child.image] : []),
                            attribute_values: attrs,
                            attributes_key: makeAttributesKey(attrs),
                        };
                    })
                    : [],
                _method: 'PUT',
            });
        } else {
            reset();
        }
    }, [product, makeAttributesKey]);

    const normalizeMediaPath = (path) => {
        if (!path) return '';
        const withoutProtocol = path.replace(/^https?:\/\/[^/]+/, '');
        return withoutProtocol.replace(/^\/?(files|storage|media-files)\//, '');
    };

    const getMainImageUrl = () => {
        if (data.image instanceof File) {
            return URL.createObjectURL(data.image);
        }

        const basePath =
            (typeof data.image === 'string' && data.image) ||
            (!data.delete_image && product && product.image) ||
            '';

        if (!basePath) {
            return '';
        }

        const relativePath = normalizeMediaPath(basePath);
        return `/media-files/${relativePath}`;
    };

    const openMediaPicker = (mode) => {
        setMediaPickerMode(mode);
        setIsMediaPickerOpen(true);
    };

    const handleMediaSelect = (selected) => {
        if (mediaPickerMode === 'single') {
            const item = Array.isArray(selected) ? selected[0] : selected;
            if (item && item.file_path) {
                setData('image', normalizeMediaPath(item.file_path));
            }
            return;
        }

        const items = Array.isArray(selected) ? selected : [selected];
        const newPaths = items
            .map(item => (item && item.file_path ? normalizeMediaPath(item.file_path) : ''))
            .filter(Boolean);

        if (newPaths.length === 0) return;

        if (mediaPickerMode === 'multiple') {
            setData('gallery', [...data.gallery, ...newPaths]);
        } else if (mediaPickerMode === 'variation-row') {
            setData(curr => {
                const list = Array.isArray(curr.variations) ? curr.variations : [];
                const updated = list.map(v => {
                    if (v.tempId !== currentVariationImageTarget) return v;
                    const existing = Array.isArray(v.images) ? v.images : (v.image ? [v.image] : []);
                    const merged = [...existing, ...newPaths];
                    return { ...v, image: v.image || (merged[0] || ''), images: merged };
                });
                return { ...curr, variations: updated };
            });
            setCurrentVariationImageTarget(null);
        } else if (mediaPickerMode === 'variation-new') {
            setNewVariationImages(prev => [...prev, ...newPaths]);
        }
    };

    const openVariationImagePickerForRow = (tempId) => {
        setCurrentVariationImageTarget(tempId);
        openMediaPicker('variation-row');
    };
    const openVariationImagePickerForNew = () => {
        openMediaPicker('variation-new');
    };

    const submitWithAction = (action) => {
        if (processing || submitLockRef.current) return;
        submitLockRef.current = true;
        setSubmitLock(true);
        const options = {
            forceFormData: true,
            transform: (payload) => {
                if (payload instanceof FormData) {
                    payload.set('save_action', action);
                    payload.set('dedupe_key', requestKeyRef.current);
                    if (product) {
                        payload.set('_method', 'PUT');
                    }
                    return payload;
                }

                return {
                    ...payload,
                    save_action: action,
                    dedupe_key: requestKeyRef.current,
                    ...(product ? { _method: 'PUT' } : {}),
                };
            },
            headers: {
                'X-Request-Id': requestKeyRef.current,
                ...(product ? { 'X-HTTP-Method-Override': 'PUT' } : {}),
            },
            onFinish: () => {
                submitLockRef.current = false;
                setSubmitLock(false);
                requestKeyRef.current = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
            }
        };

        if (product) {
            post(getLocalizedRoute('admin.inventory.products.update', { product: product.id }), options);
        } else {
            post(getLocalizedRoute('admin.inventory.products.store'), options);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        submitWithAction('save');
    };

    const pageTitle = product ? 'Edit Product' : 'Add New Product';

    return (
        <AdminLayout activeMenu="Inventory">
            <Head title={`${pageTitle} - ZodicERP`} />
            <div className="products-ce-page">
                <div className="breadcrumb">
                    <Link href={getLocalizedRoute('admin.dashboard')}>Dashboard</Link>
                    <span>/</span>
                    <span>Inventory</span>
                    <span>/</span>
                    <Link href={getLocalizedRoute('admin.inventory.products.index')}>
                        Products
                    </Link>
                    <span>/</span>
                    <span>{pageTitle}</span>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="products-ce-card">
                        <div className="products-ce-header">
                            <h3 className="products-ce-title">{pageTitle}</h3>
                            <div className="products-ce-actions">
                                <Link
                                    href={getLocalizedRoute('admin.inventory.products.index')}
                                    className="btn btn-outline-danger"
                                >
                                    Back to List
                                </Link>
                                <button
                                    type="submit"
                                    className="btn btn-secondary"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        submitWithAction('save_and_exit');
                                    }}
                                    disabled={processing || submitLock}
                                >
                                    Save & Exit
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={processing || submitLock}
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="products-ce-body">
                        <div className="products-layout">
                            <div className="products-main">
                                <div className="products-section-card">
                                    <div className="products-section-header">
                                        <h4 className="products-section-title">Basic Info</h4>
                                    </div>
                                    <div className="products-section-content">
                                        <div className="form-group">
                                            <label className="form-label">Name *</label>
                                            <textarea
                                                className={`form-control ${errors.name ? 'border-red-500' : ''}`}
                                                value={data.name}
                                                onChange={e => setData('name', e.target.value)}
                                                required
                                                rows="2"
                                                placeholder="Product Name"
                                            ></textarea>
                                            {errors.name && <div className="text-error">{errors.name}</div>}
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Simple Description</label>
                                            <textarea
                                                className="form-control form-textarea rich-textarea"
                                                rows="3"
                                                value={data.description}
                                                onChange={e => setData('description', e.target.value)}
                                                placeholder="Short description displayed before price"
                                            ></textarea>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Permalink</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={permalink}
                                                onChange={e => setPermalink(e.target.value)}
                                                placeholder="product-slug"
                                            />
                                            <div className="permalink-preview">
                                                <span className="permalink-base">https://yourstore.com/products/</span>
                                                <span className="permalink-slug">
                                                    {permalink || 'your-product-slug'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="products-section-card">
                                    <div 
                                        className="products-section-header d-flex justify-between align-items-center" 
                                        onClick={() => setIsAttributesExpanded(!isAttributesExpanded)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <h4 className="products-section-title">Product Attributes (Optional)</h4>
                                        <span className="material-icons-outlined toggle-icon-attributes">
                                            {isAttributesExpanded ? 'expand_less' : 'expand_more'}
                                        </span>
                                    </div>
                                    {isAttributesExpanded && (
                                        <div className="products-section-content">
                                            <div className="attributes-selection-grid">
                                                {itemAttributes.map(attr => (
                                                    <label
                                                        key={attr.id}
                                                        className={`checkbox-option attribute-checkbox ${selectedAttributeIds.includes(attr.id) ? 'selected' : ''}`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedAttributeIds.includes(attr.id)}
                                                            onChange={() => {
                                                                toggleAttributeSelection(attr.id);
                                                                // Auto-update product type
                                                                const willBeSelected = !selectedAttributeIds.includes(attr.id);
                                                                const anySelected = willBeSelected || selectedAttributeIds.some(id => id !== attr.id);
                                                                
                                                                if (!anySelected) {
                                                                    setSelectedVariationOptions({});
                                                                    setVariationAttributeValues({});
                                                                    setData(curr => ({
                                                                        ...curr,
                                                                        product_type: 'simple',
                                                                        is_variation: false,
                                                                        variations: [],
                                                                    }));
                                                                } else {
                                                                    setData(curr => ({
                                                                        ...curr,
                                                                        product_type: 'variable',
                                                                        is_variation: true,
                                                                    }));
                                                                }
                                                            }}
                                                        />
                                                        <span className="checkbox-custom-mark"></span>
                                                        <span className="attribute-title">{attr.title}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            {itemAttributes.length === 0 && (
                                                <div className="empty-attributes-msg">No attributes available.</div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="products-section-card">
                                    <div className="products-section-header">
                                        <h4 className="products-section-title">Detailed Description</h4>
                                            <button
                                                type="button"
                                                className="btn btn-outline-secondary"
                                                onClick={() => setShowContentEditor(value => !value)}
                                            >
                                                {showContentEditor ? 'Hide Editor' : 'Show Editor'}
                                            </button>
                                            <button type="button" className="btn btn-outline-secondary">
                                                Add media
                                            </button>
                                            <button type="button" className="btn btn-outline-secondary">
                                                UI Blocks
                                            </button>
                                        </div>
                                    <div className="products-section-content">
                                        {showContentEditor && (
                                            <textarea
                                                className="form-control form-textarea rich-textarea"
                                                rows="5"
                                                value={data.content}
                                                onChange={e => setData('content', e.target.value)}
                                            ></textarea>
                                        )}
                                    </div>
                                </div>

                                <div className="products-section-card">
                                    <div className="products-section-header">
                                        <h4 className="products-section-title">Images</h4>
                                    </div>
                                    <div className="products-section-content">
                                        <div className="form-group">
                                            <div
                                                className="image-upload-area"
                                                onClick={() => openMediaPicker('single')}
                                            >
                                                {getMainImageUrl() ? (
                                                    <div className="image-preview-full-container" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                                        <img
                                                            src={getMainImageUrl()}
                                                            alt="Main Product"
                                                            style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }}
                                                        />
                                                        <button
                                                            type="button"
                                                            className="gallery-remove-btn"
                                                            style={{ top: '10px', right: '10px' }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setData(d => ({ ...d, image: null, delete_image: true }));
                                                            }}
                                                            title="Remove Image"
                                                        >
                                                            &times;
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="material-icons-outlined image-upload-icon">add_photo_alternate</span>
                                                        <div>
                                                            <div className="image-upload-title">Click to set Main Image</div>
                                                            <div className="image-upload-subtitle">Drag & drop or choose from media.</div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Gallery Images</label>
                                            <div className="d-flex gap-2 mb-4">
                                                <button type="button" className="btn btn-outline" onClick={() => openMediaPicker('multiple')}>
                                                    Add from Media
                                                </button>
                                                <div className="relative overflow-hidden inline-block">
                                                    <button type="button" className="btn btn-outline">Upload New</button>
                                                    <input
                                                        type="file"
                                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                        multiple
                                                        onChange={(e) => {
                                                            const files = Array.from(e.target.files);
                                                            setData('gallery', [...data.gallery, ...files]);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="gallery-grid">
                                                {/* Display Existing Gallery Images */}
                                                {data.existing_images && data.existing_images.map((img, index) => (
                                                    <div key={`existing-${index}`} className="gallery-item">
                                                        <img src={`/media-files/${img}`} alt={`Gallery ${index}`} />
                                                        <button
                                                            type="button"
                                                            className="gallery-remove-btn"
                                                            onClick={() => {
                                                                const newExisting = data.existing_images.filter((_, i) => i !== index);
                                                                setData('existing_images', newExisting);
                                                            }}
                                                        >
                                                            &times;
                                                        </button>
                                                    </div>
                                                ))}
                                                
                                                {/* Display New Gallery Images/Paths */}
                                                {data.gallery && data.gallery.map((item, index) => {
                                                    let src = '';
                                                    if (typeof item === 'string') {
                                                        src = `/media-files/${item}`;
                                                    } else if (item instanceof File) {
                                                        src = URL.createObjectURL(item);
                                                    }
                                                    
                                                    return (
                                                        <div key={`new-${index}`} className="gallery-item">
                                                            <img src={src} alt={`New Gallery ${index}`} />
                                                            <button
                                                                type="button"
                                                                className="gallery-remove-btn"
                                                                onClick={() => {
                                                                    const newGallery = data.gallery.filter((_, i) => i !== index);
                                                                    setData('gallery', newGallery);
                                                                }}
                                                            >
                                                                &times;
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="products-section-card">
                                    <div className="products-section-header products-variations-header">
                                        <h4 className="products-section-title">Product has variations</h4>
                                        <div className="products-variations-actions">
                                            <button
                                                type="button"
                                                className="btn btn-outline"
                                                onClick={() => {
                                                    setIsAttributesExpanded(true);
                                                    // scroll to attributes section if needed
                                                    document.querySelector('.attributes-selection-grid')?.scrollIntoView({ behavior: 'smooth' });
                                                }}
                                            >
                                                Select attribute
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-outline"
                                                onClick={openGenerateModal}
                                                disabled={!hasSelectedAttributes}
                                            >
                                                Generate variations
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-primary"
                                                onClick={() => setIsVariationModalOpen(true)}
                                            >
                                                Add new variation
                                            </button>
                                        </div>
                                    </div>
                                    <div className="products-section-content">
                                        <div className="product-variations-toolbar">
                                            <input
                                                type="text"
                                                className="form-control product-variations-search"
                                                placeholder="Search variations..."
                                                value={variationsSearch}
                                                onChange={(e) => setVariationsSearch(e.target.value)}
                                            />
                                        </div>
                                        <div className="product-variations-table-wrapper">
                                            <table className="product-variations-table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: '40px' }}>
                                                            <input type="checkbox" disabled />
                                                        </th>
                                                        <th>Image</th>
                                                        <th>Properties</th>
                                                        <th>SKU</th>
                                                        <th>Price</th>
                                                        <th>Stock</th>
                                                        <th>Default</th>
                                                        <th>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredVariations.map((v, idx) => (
                                                        <tr key={v.tempId || v.attributes_key || v.id || idx}>
                                                            <td>
                                                                <input type="checkbox" />
                                                            </td>
                                                            <td>
                                                                <div className="variation-image-cell">
                                                                    {(() => {
                                                                        const imgToShow = v.image || (Array.isArray(v.images) && v.images.length > 0 ? v.images[0] : null);
                                                                        if (imgToShow) {
                                                                            let src = '';
                                                                            if (imgToShow instanceof File) {
                                                                                src = URL.createObjectURL(imgToShow);
                                                                            } else if (typeof imgToShow === 'string') {
                                                                                 src = `/media-files/${imgToShow.replace(/^\/?(files|storage|media-files)\//, '')}`;
                                                                            }
                                                                            return (
                                                                                <img
                                                                                    src={src}
                                                                                    alt="Variation"
                                                                                    className="variation-image-thumb"
                                                                                    onClick={() => openVariationImagePickerForRow(v.tempId)}
                                                                                    style={{ cursor: 'pointer' }}
                                                                                />
                                                                            );
                                                                        } else {
                                                                            return (
                                                                                <button
                                                                                    type="button"
                                                                                    className="btn btn-outline btn-sm"
                                                                                    onClick={() => openVariationImagePickerForRow(v.tempId)}
                                                                                >
                                                                                    Add Image
                                                                                </button>
                                                                            );
                                                                        }
                                                                    })()}
                                                                </div>
                                                            </td>
                                                            <td>{formatAttributes(v.attribute_values || {}) || '-'}</td>
                                                            <td style={{ minWidth: 140 }}>
                                                                <input
                                                                    type="text"
                                                                    className="form-control"
                                                                    value={v.sku || ''}
                                                                    onChange={(e) => updateVariationField(v.tempId, 'sku', e.target.value)}
                                                                />
                                                            </td>
                                                            <td style={{ width: 120 }}>
                                                                <input
                                                                    type="number"
                                                                    className="form-control"
                                                                    value={v.price ?? ''}
                                                                    onChange={(e) => updateVariationField(v.tempId, 'price', e.target.value)}
                                                                />
                                                            </td>
                                                            <td style={{ width: 120 }}>
                                                                <input
                                                                    type="number"
                                                                    className="form-control"
                                                                    value={v.stock ?? ''}
                                                                    onChange={(e) => updateVariationField(v.tempId, 'stock', e.target.value)}
                                                                />
                                                            </td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                <input
                                                                    type="radio"
                                                                    name="is_default_variation"
                                                                    checked={Boolean(v.is_default)}
                                                                    onChange={() => setDefaultVariation(v.tempId)}
                                                                />
                                                            </td>
                                                            <td>
                                                                <div className="variation-actions">
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-primary btn-icon"
                                                                        onClick={() => openEditVariationModal(v.tempId)}
                                                                        style={{ marginRight: '6px' }}
                                                                    >
                                                                        <span className="material-icons-outlined">edit</span>
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-danger btn-icon"
                                                                        onClick={() => removeVariation(v.tempId)}
                                                                    >
                                                                        <span className="material-icons-outlined">delete</span>
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {(!Array.isArray(data.variations) || data.variations.length === 0) && (
                                                        <tr>
                                                            <td colSpan="8" className="empty-state">No variations yet.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                            <div className="product-variations-footer">
                                                <span>
                                                    {Array.isArray(data.variations) ? data.variations.length : 0} variation(s)
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {!shouldHideGlobalSections && (
                                <div className="products-section-card">
                                    <div className="products-section-header">
                                        <h4 className="products-section-title">Pricing</h4>
                                    </div>
                                    <div className="products-section-content">
                                        <div className="form-row">
                                            <div className="form-group half">
                                                <label className="form-label">Price</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    placeholder="$ 0.00"
                                                    value={data.price}
                                                    onChange={e => setData('price', e.target.value)}
                                                />
                                            </div>
                                            <div className="form-group half">
                                                <label className="form-label">Sale Price</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    placeholder="$ 0.00"
                                                    value={data.sale_price}
                                                    onChange={e => setData('sale_price', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group half">
                                                <label className="form-label">Cost per item</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    placeholder="$ 0.00"
                                                    value={data.cost_per_item}
                                                    onChange={e => setData('cost_per_item', e.target.value)}
                                                />
                                                <small className="text-gray-medium">Customers won't see this</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                )}

                                {!shouldHideGlobalSections && (
                                <div className="products-section-card">
                                    <div className="products-section-header">
                                        <h4 className="products-section-title">Inventory</h4>
                                    </div>
                                    <div className="products-section-content">
                                        <div className="form-row">
                                            <div className="form-group half">
                                                <label className="form-label">SKU (Stock Keeping Unit)</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={data.sku}
                                                    onChange={e => setData('sku', e.target.value)}
                                                />
                                            </div>
                                            <div className="form-group half">
                                                <label className="form-label">Barcode (ISBN, UPC, GTIN, etc.)</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={data.barcode}
                                                    onChange={e => setData('barcode', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="checkbox-option">
                                                <input
                                                    type="checkbox"
                                                    checked={data.with_storehouse_management}
                                                    onChange={e => setData('with_storehouse_management', e.target.checked)}
                                                />
                                                <span>Track inventory</span>
                                            </label>
                                        </div>
                                        {data.with_storehouse_management && (
                                            <div className="form-row">
                                                <div className="form-group half">
                                                    <label className="form-label">Quantity</label>
                                                    <input
                                                        type="number"
                                                        className="form-control"
                                                        value={data.quantity}
                                                        onChange={e => setData('quantity', e.target.value)}
                                                    />
                                                </div>
                                                <div className="form-group half">
                                                    <label className="form-label">Stock Status</label>
                                                    <select
                                                        className="form-control"
                                                        value={data.stock_status}
                                                        onChange={e => setData('stock_status', e.target.value)}
                                                    >
                                                        <option value="in_stock">In Stock</option>
                                                        <option value="out_of_stock">Out of Stock</option>
                                                        <option value="on_backorder">On Backorder</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                )}

                                {!shouldHideGlobalSections && (
                                <div className="products-section-card">
                                    <div className="products-section-header">
                                        <h4 className="products-section-title">Shipping</h4>
                                    </div>
                                    <div className="products-section-content">
                                        <div className="form-group">
                                            <label className="form-label">Weight (kg)</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={data.weight}
                                                onChange={e => setData('weight', e.target.value)}
                                            />
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group third">
                                                <label className="form-label">Length (cm)</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={data.length}
                                                    onChange={e => setData('length', e.target.value)}
                                                />
                                            </div>
                                            <div className="form-group third">
                                                <label className="form-label">Wide (cm)</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={data.wide}
                                                    onChange={e => setData('wide', e.target.value)}
                                                />
                                            </div>
                                            <div className="form-group third">
                                                <label className="form-label">Height (cm)</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={data.height}
                                                    onChange={e => setData('height', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                )}
                            </div>

                            <div className="products-sidebar">
                                <div className="products-section-card">
                                    <div className="products-section-header">
                                        <h4 className="products-section-title">Publish</h4>
                                    </div>
                                    <div className="products-section-content">
                                        <div className="form-group">
                                            <label className="form-label">Status</label>
                                            <select
                                                className="form-control"
                                                value={data.status}
                                                onChange={e => setData('status', e.target.value)}
                                            >
                                                <option value="active">Published</option>
                                                <option value="draft">Draft</option>
                                                <option value="pending">Pending</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="checkbox-option">
                                                <input
                                                    type="checkbox"
                                                    checked={!!data.is_featured}
                                                    onChange={e => setData('is_featured', e.target.checked ? 1 : 0)}
                                                />
                                                <span>Is Featured</span>
                                            </label>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Supplier</label>
                                            <select
                                                className="form-control"
                                                value={data.supplier_code}
                                                onChange={e => setData('supplier_code', e.target.value)}
                                            >
                                                <option value="">Select a supplier...</option>
                                                {Array.isArray(suppliers) && suppliers.map(s => (
                                                    <option key={s.supplier_code} value={s.supplier_code}>
                                                        {s.name_en}
                                                    </option>
                                                ))}
                                            </select>
                                            {errors.supplier_code && <div className="error-msg">{errors.supplier_code}</div>}
                                        </div>
                                    </div>
                                </div>

                                <div className="products-section-card">
                                    <div className="products-section-header">
                                        <h4 className="products-section-title">Organization</h4>
                                    </div>
                                    <div className="products-section-content">
                                        <div className="form-group">
                                            <label className="form-label">Brand</label>
                                            <select
                                                className="form-control"
                                                value={data.brand_id}
                                                onChange={e => setData('brand_id', e.target.value)}
                                            >
                                                <option value="">Select Brand</option>
                                                {brands && brands.map(b => (
                                                    <option key={b.id} value={b.id}>{b.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Unit</label>
                                            <select
                                                className="form-control"
                                                value={data.unit_id}
                                                onChange={e => setData('unit_id', e.target.value)}
                                            >
                                                <option value="">Select Unit</option>
                                                {units && units.map(u => (
                                                    <option key={u.id} value={u.id}>{u.name}</option>
                                                ))}
                                            </select>
                                            {errors.unit_id && <div className="error-msg">{errors.unit_id}</div>}
                                        </div>
                                        
                                        <div className="form-group categories-section">
                                            <label className="form-label">Categories</label>
                                            
                                            {/* Category Search and Selected Chips */}
                                            <div className="category-search-wrapper">
                                                <div className="search-input-container">
                                                    <span className="material-icons-outlined search-icon">search</span>
                                                    <input 
                                                        type="text" 
                                                        className="category-search-input" 
                                                        placeholder="Search categories..." 
                                                        value={categorySearch}
                                                        onChange={(e) => setCategorySearch(e.target.value)}
                                                    />
                                                    {categorySearch && (
                                                        <button 
                                                            type="button" 
                                                            className="clear-search"
                                                            onClick={() => setCategorySearch('')}
                                                        >
                                                            <span className="material-icons-outlined">close</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {Array.isArray(data.category_ids) && data.category_ids.length > 0 && (
                                                <div className="selected-categories-chips">
                                                    {data.category_ids.map(id => {
                                                        const cat = categories.find(c => String(c.id) === String(id));
                                                        if (!cat) return null;
                                                        return (
                                                            <div key={id} className="category-chip">
                                                                <span>{cat.name}</span>
                                                                <button 
                                                                    type="button" 
                                                                    className="remove-chip"
                                                                    onClick={() => handleCategoryToggle(String(id))}
                                                                >
                                                                    <span className="material-icons-outlined">close</span>
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            <div className="category-tree-container">
                                                {categoryTree.map(category => (
                                                    <CategoryTreeItem
                                                        key={category.id}
                                                        category={category}
                                                        selectedIds={Array.isArray(data.category_ids) ? data.category_ids : []}
                                                        onToggle={handleCategoryToggle}
                                                        search={categorySearch}
                                                    />
                                                ))}
                                                {categoryTree.length === 0 && (
                                                    <div className="empty-tree">No categories found</div>
                                                )}
                                            </div>
                                            <div className="category-actions mt-2">
                                                <Link 
                                                    href={getLocalizedRoute('admin.inventory.categories.create')} 
                                                    className="add-new-category-link"
                                                >
                                                    <span className="material-icons-outlined">add</span>
                                                    Add new category
                                                </Link>
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Product Collections</label>
                                            <input type="text" className="form-control" placeholder="Search collections..." />
                                        </div>
                                        
                                        <div className="form-group">
                                            <label className="form-label">Labels</label>
                                            <input type="text" className="form-control" placeholder="Search labels..." />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {isVariationModalOpen && (
                            <div className="modal-overlay active">
                                <div className="modal">
                                    <div className="modal-header">
                                        <h3 className="modal-title">Add new variation</h3>
                                        <button
                                            type="button"
                                            className="modal-close"
                                            onClick={closeVariationModal}
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <div className="modal-body">
                                        <div className="attributes-container mb-4">
                                            {itemAttributes
                                                .filter(attr => selectedAttributeIds.includes(attr.id))
                                                .map(attr => {
                                                    const details = Array.isArray(attr.details)
                                                        ? attr.details
                                                        : [];
                                                    const selected = variationAttributeValues[attr.id] || '';
                                                    return (
                                                        <div key={attr.id} className="attribute-item">
                                                            <div className="attribute-label">
                                                                {attr.title}
                                                            </div>
                                                            <div className="attribute-value-wrapper">
                                                                {details.map(detail => (
                                                                    <button
                                                                        key={detail.id}
                                                                        type="button"
                                                                        className={`attribute-value-btn ${String(selected) === String(detail.id) ? 'active' : ''}`}
                                                                        onClick={() => handleVariationAttributeChange(attr.id, detail.id)}
                                                                    >
                                                                        {detail.title}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>

                                        <div className="form-grid">
                                            <div className="form-group">
                                                <label className="form-label">SKU</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={variationForm.sku}
                                                    onChange={e =>
                                                        handleVariationChange('sku', e.target.value)
                                                    }
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Price</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={variationForm.price}
                                                    onChange={e =>
                                                        handleVariationChange('price', e.target.value)
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div className="form-grid">
                                            <div className="form-group">
                                                <label className="checkbox-option">
                                                    <input type="checkbox" />
                                                    <span>Auto generate SKU?</span>
                                                </label>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Price sale</label>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <input
                                                        type="number"
                                                        className="form-control"
                                                        value={variationForm.sale_price}
                                                        onChange={e =>
                                                            handleVariationChange(
                                                                'sale_price',
                                                                e.target.value
                                                            )
                                                        }
                                                    />
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline"
                                                        style={{ whiteSpace: 'nowrap' }}
                                                    >
                                                        Choose Discount Period
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="form-grid">
                                            <div className="form-group">
                                                <label className="form-label">Cost per item</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={variationForm.cost_per_item}
                                                    onChange={e =>
                                                        handleVariationChange(
                                                            'cost_per_item',
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">
                                                    Barcode (ISBN, UPC, GTIN, etc.)
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={variationForm.barcode}
                                                    onChange={e =>
                                                        handleVariationChange(
                                                            'barcode',
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Stock status</label>
                                            <div className="d-flex gap-4">
                                                <label className="checkbox-option">
                                                    <input
                                                        type="radio"
                                                        name="variation_stock_status"
                                                        checked={
                                                            variationForm.stock_status === 'in_stock'
                                                        }
                                                        onChange={() =>
                                                            handleVariationChange(
                                                                'stock_status',
                                                                'in_stock'
                                                            )
                                                        }
                                                    />
                                                    <span>In stock</span>
                                                </label>
                                                <label className="checkbox-option">
                                                    <input
                                                        type="radio"
                                                        name="variation_stock_status"
                                                        checked={
                                                            variationForm.stock_status ===
                                                            'out_of_stock'
                                                        }
                                                        onChange={() =>
                                                            handleVariationChange(
                                                                'stock_status',
                                                                'out_of_stock'
                                                            )
                                                        }
                                                    />
                                                    <span>Out of stock</span>
                                                </label>
                                                <label className="checkbox-option">
                                                    <input
                                                        type="radio"
                                                        name="variation_stock_status"
                                                        checked={
                                                            variationForm.stock_status ===
                                                            'on_backorder'
                                                        }
                                                        onChange={() =>
                                                            handleVariationChange(
                                                                'stock_status',
                                                                'on_backorder'
                                                            )
                                                        }
                                                    />
                                                    <span>On backorder</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="products-section-card">
                                            <div className="products-section-header">
                                                <h4 className="products-section-title">Shipping</h4>
                                            </div>
                                            <div className="products-section-content">
                                                <div className="form-row">
                                                    <div className="form-group half">
                                                        <label className="form-label">
                                                            Weight (g)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            className="form-control"
                                                            value={variationForm.weight}
                                                            onChange={e =>
                                                                handleVariationChange(
                                                                    'weight',
                                                                    e.target.value
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                                <div className="form-row">
                                                    <div className="form-group third">
                                                        <label className="form-label">
                                                            Length (cm)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            className="form-control"
                                                            value={variationForm.length}
                                                            onChange={e =>
                                                                handleVariationChange(
                                                                    'length',
                                                                    e.target.value
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                    <div className="form-group third">
                                                        <label className="form-label">
                                                            Wide (cm)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            className="form-control"
                                                            value={variationForm.wide}
                                                            onChange={e =>
                                                                handleVariationChange(
                                                                    'wide',
                                                                    e.target.value
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                    <div className="form-group third">
                                                        <label className="form-label">
                                                            Height (cm)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            className="form-control"
                                                            value={variationForm.height}
                                                            onChange={e =>
                                                                handleVariationChange(
                                                                    'height',
                                                                    e.target.value
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="products-section-card">
                                            <div className="products-section-content">
                                                <div
                                                    className="image-upload-area"
                                                    style={{ minHeight: '120px' }}
                                                    onClick={openVariationImagePickerForNew}
                                                >
                                                    {Array.isArray(newVariationImages) && newVariationImages.length > 0 ? (
                                                        <div className="gallery-grid">
                                                            {newVariationImages.map((img, idx) => {
                                                                let src = '';
                                                                if (img instanceof File) {
                                                                    src = URL.createObjectURL(img);
                                                                } else {
                                                                    src = `/media-files/${img}`;
                                                                }
                                                                return (
                                                                <div key={`nvimg-${idx}`} className="gallery-item">
                                                                    <img src={src} alt={`Variation ${idx+1}`} />
                                                                    <button
                                                                        type="button"
                                                                        className="gallery-remove-btn"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setNewVariationImages(prev => prev.filter((_, i) => i !== idx));
                                                                        }}
                                                                    >
                                                                        &times;
                                                                    </button>
                                                                </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div className="image-preview-full-container">
                                                            <span className="material-icons-outlined image-upload-icon">
                                                                add_photo_alternate
                                                            </span>
                                                            <div>
                                                                <div className="image-upload-title">
                                                                    Click here to add an image.
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="d-flex gap-2 mt-2">
                                                    <button type="button" className="btn btn-outline" onClick={openVariationImagePickerForNew}>
                                                        Add images from Media
                                                    </button>
                                                    <div className="relative overflow-hidden inline-block">
                                                        <button type="button" className="btn btn-outline">Upload images</button>
                                                        <input
                                                            type="file"
                                                            multiple
                                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                            onChange={handleNewVariationFileChange}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="modal-actions">
                                        <button
                                            type="button"
                                            className="btn btn-outline"
                                            onClick={closeVariationModal}
                                        >
                                            Close
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={addVariationFromModal}
                                        >
                                            Save variation
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isEditVariationModalOpen && (
                            <div className="modal-overlay active">
                                <div className="modal">
                                    <div className="modal-header">
                                        <h3 className="modal-title">Edit variation</h3>
                                        <button
                                            type="button"
                                            className="modal-close"
                                            onClick={closeEditVariationModal}
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <div className="modal-body">
                                        <div className="attributes-container mb-4">
                                            {itemAttributes
                                                .filter(attr => {
                                                    const ids = Object.keys(editVariationForm.attribute_values || {}).map(Number);
                                                    return ids.length ? ids.includes(Number(attr.id)) : selectedAttributeIds.includes(attr.id);
                                                })
                                                .map(attr => {
                                                    const details = Array.isArray(attr.details)
                                                        ? attr.details
                                                        : [];
                                                    const selected = (editVariationForm.attribute_values || {})[attr.id] || '';
                                                    return (
                                                        <div key={attr.id} className="attribute-item">
                                                            <div className="attribute-label">
                                                                {attr.title}
                                                            </div>
                                                            <div className="attribute-value-wrapper">
                                                                {details.map(detail => (
                                                                    <button
                                                                        key={detail.id}
                                                                        type="button"
                                                                        className={`attribute-value-btn ${String(selected) === String(detail.id) ? 'active' : ''}`}
                                                                        onClick={() => handleEditVariationAttributeChange(attr.id, detail.id)}
                                                                    >
                                                                        {detail.title}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>

                                        <div className="form-grid">
                                            <div className="form-group">
                                                <label className="form-label">SKU</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={editVariationForm.sku}
                                                    onChange={e =>
                                                        handleEditVariationChange('sku', e.target.value)
                                                    }
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Price</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={editVariationForm.price}
                                                    onChange={e =>
                                                        handleEditVariationChange('price', e.target.value)
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div className="form-grid">
                                            <div className="form-group">
                                                <label className="form-label">Price sale</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={editVariationForm.sale_price}
                                                    onChange={e =>
                                                        handleEditVariationChange('sale_price', e.target.value)
                                                    }
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Cost per item</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={editVariationForm.cost_per_item}
                                                    onChange={e =>
                                                        handleEditVariationChange('cost_per_item', e.target.value)
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div className="form-grid">
                                            <div className="form-group">
                                                <label className="form-label">
                                                    Barcode (ISBN, UPC, GTIN, etc.)
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={editVariationForm.barcode}
                                                    onChange={e =>
                                                        handleEditVariationChange('barcode', e.target.value)
                                                    }
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Stock</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={editVariationForm.stock}
                                                    onChange={e =>
                                                        handleEditVariationChange('stock', e.target.value)
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Stock status</label>
                                            <div className="d-flex gap-4">
                                                <label className="checkbox-option">
                                                    <input
                                                        type="radio"
                                                        name="edit_variation_stock_status"
                                                        checked={editVariationForm.stock_status === 'in_stock'}
                                                        onChange={() =>
                                                            handleEditVariationChange('stock_status', 'in_stock')
                                                        }
                                                    />
                                                    <span>In stock</span>
                                                </label>
                                                <label className="checkbox-option">
                                                    <input
                                                        type="radio"
                                                        name="edit_variation_stock_status"
                                                        checked={editVariationForm.stock_status === 'out_of_stock'}
                                                        onChange={() =>
                                                            handleEditVariationChange('stock_status', 'out_of_stock')
                                                        }
                                                    />
                                                    <span>Out of stock</span>
                                                </label>
                                                <label className="checkbox-option">
                                                    <input
                                                        type="radio"
                                                        name="edit_variation_stock_status"
                                                        checked={editVariationForm.stock_status === 'on_backorder'}
                                                        onChange={() =>
                                                            handleEditVariationChange('stock_status', 'on_backorder')
                                                        }
                                                    />
                                                    <span>On backorder</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="products-section-card">
                                            <div className="products-section-header">
                                                <h4 className="products-section-title">Shipping</h4>
                                            </div>
                                            <div className="products-section-content">
                                                <div className="form-row">
                                                    <div className="form-group half">
                                                        <label className="form-label">Weight (g)</label>
                                                        <input
                                                            type="number"
                                                            className="form-control"
                                                            value={editVariationForm.weight}
                                                            onChange={e =>
                                                                handleEditVariationChange('weight', e.target.value)
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                                <div className="form-row">
                                                    <div className="form-group third">
                                                        <label className="form-label">Length (cm)</label>
                                                        <input
                                                            type="number"
                                                            className="form-control"
                                                            value={editVariationForm.length}
                                                            onChange={e =>
                                                                handleEditVariationChange('length', e.target.value)
                                                            }
                                                        />
                                                    </div>
                                                    <div className="form-group third">
                                                        <label className="form-label">Wide (cm)</label>
                                                        <input
                                                            type="number"
                                                            className="form-control"
                                                            value={editVariationForm.wide}
                                                            onChange={e =>
                                                                handleEditVariationChange('wide', e.target.value)
                                                            }
                                                        />
                                                    </div>
                                                    <div className="form-group third">
                                                        <label className="form-label">Height (cm)</label>
                                                        <input
                                                            type="number"
                                                            className="form-control"
                                                            value={editVariationForm.height}
                                                            onChange={e =>
                                                                handleEditVariationChange('height', e.target.value)
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="products-section-card">
                                            <div className="products-section-content">
                                                <div
                                                    className="image-upload-area"
                                                    style={{ minHeight: '120px' }}
                                                    onClick={() => {
                                                        if (editingVariationId) {
                                                            openVariationImagePickerForRow(editingVariationId);
                                                        }
                                                    }}
                                                >
                                                    {currentEditingVariation && (Array.isArray(currentEditingVariation.images) ? currentEditingVariation.images.length > 0 : Boolean(currentEditingVariation.image)) ? (
                                                        <div className="gallery-grid">
                                                            {(Array.isArray(currentEditingVariation.images) && currentEditingVariation.images.length > 0
                                                                ? currentEditingVariation.images
                                                                : [currentEditingVariation.image]
                                                            ).map((img, idx) => {
                                                                let src = '';
                                                                if (img instanceof File) {
                                                                    src = URL.createObjectURL(img);
                                                                } else if (typeof img === 'string') {
                                                                    src = `/media-files/${img.replace(/^\/?(files|storage|media-files)\//, '')}`;
                                                                }
                                                                return (
                                                                <div key={`edit-vimg-${idx}`} className="gallery-item">
                                                                    <img src={src} alt={`Variation ${idx+1}`} />
                                                                    <button
                                                                        type="button"
                                                                        className="gallery-remove-btn"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setData(curr => {
                                                                                const list = Array.isArray(curr.variations) ? curr.variations.slice() : [];
                                                                                const updated = list.map(v => {
                                                                                    if (v.tempId !== editingVariationId) return v;
                                                                                    const imgs = Array.isArray(v.images) ? v.images.slice() : (v.image ? [v.image] : []);
                                                                                    imgs.splice(idx, 1);
                                                                                    const newPrimary = imgs[0] || '';
                                                                                    return { ...v, images: imgs, image: newPrimary };
                                                                                });
                                                                                return { ...curr, variations: updated };
                                                                            });
                                                                        }}
                                                                    >
                                                                        &times;
                                                                    </button>
                                                                </div>
                                                            ); })}
                                                        </div>
                                                    ) : (
                                                        <div className="image-preview-full-container">
                                                            <span className="material-icons-outlined image-upload-icon">
                                                                add_photo_alternate
                                                            </span>
                                                            <div>
                                                                <div className="image-upload-title">
                                                                    Click here to add an image.
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="d-flex gap-2 mt-2">
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline"
                                                        onClick={() => {
                                                            if (editingVariationId) {
                                                                openVariationImagePickerForRow(editingVariationId);
                                                            }
                                                        }}
                                                    >
                                                        Add images from Media
                                                    </button>
                                                    <div className="relative overflow-hidden inline-block">
                                                        <button type="button" className="btn btn-outline">Upload images</button>
                                                        <input
                                                            type="file"
                                                            multiple
                                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                            onChange={handleEditVariationFileChange}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="modal-actions">
                                        <button
                                            type="button"
                                            className="btn btn-outline"
                                            onClick={closeEditVariationModal}
                                        >
                                            Close
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={saveEditVariation}
                                        >
                                            Save changes
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isGenerateModalOpen && (
                            <div className="modal-overlay active">
                                <div className="modal">
                                    <div className="modal-header">
                                        <h3 className="modal-title">Generate variations</h3>
                                        <button
                                            type="button"
                                            className="modal-close"
                                            onClick={() => setIsGenerateModalOpen(false)}
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <div className="modal-body">
                                        <p className="mb-3">Select attributes to create variations:</p>
                                        <div className="attributes-container">
                                            {itemAttributes
                                                .filter(attr => selectedAttributeIds.includes(attr.id))
                                                .map(attr => {
                                                    const details = Array.isArray(attr.details)
                                                        ? attr.details
                                                        : [];
                                                    const currentIds =
                                                        selectedVariationOptions[attr.id] || [];
                                                    const allSelected =
                                                        details.length > 0 &&
                                                        currentIds.length === details.length;
                                                    return (
                                                        <div key={attr.id} className="attribute-item">
                                                            <div className="attribute-label">
                                                                {attr.title}
                                                            </div>
                                                            <div className="attribute-value-wrapper">
                                                                <button
                                                                    type="button"
                                                                    className={`attribute-value-btn ${allSelected ? 'active' : ''}`}
                                                                    onClick={() => toggleAllOptions(attr.id, details)}
                                                                >
                                                                    All
                                                                </button>
                                                                {details.map(detail => (
                                                                    <button
                                                                        key={detail.id}
                                                                        type="button"
                                                                        className={`attribute-value-btn ${currentIds.includes(detail.id) ? 'active' : ''}`}
                                                                        onClick={() => toggleOption(attr.id, detail.id)}
                                                                    >
                                                                        {detail.title}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                    <div className="modal-actions">
                                        <button
                                            type="button"
                                            className="btn btn-outline"
                                            onClick={() => setIsGenerateModalOpen(false)}
                                        >
                                            Close
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={() => {
                                                generateVariationsFromSelections();
                                                setIsGenerateModalOpen(false);
                                            }}
                                            disabled={!hasSelectedVariationValues}
                                        >
                                            Continue
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </form>

                <MediaPickerModal
                    isOpen={isMediaPickerOpen}
                    onClose={() => setIsMediaPickerOpen(false)}
                    onSelect={handleMediaSelect}
                    multiple={mediaPickerMode !== 'single'}
                    allowedTypes={['image']}
                />
            </div>
        </AdminLayout>
    );
};

// ==========================================
// Main Component
// ==========================================

const Products = (props) => {
    const { products, product } = props;

    // If products (plural) is provided AND we're not explicitly on an edit page
    // (Inertia might provide both in some scenarios depending on how props are shared)
    if (products && !product) {
        return <ProductsList {...props} />;
    }

    // Otherwise, we are on create or edit page
    return <ProductsForm {...props} />;
};

export default Products;
