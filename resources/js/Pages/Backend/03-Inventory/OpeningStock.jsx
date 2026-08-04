import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import SearchableComboBox from '../components/SearchableComboBox';
import Table from '../components/Table';
import Pagination from '../components/Pagination';
import BlankPage from '@/Components/BlankPage';
import { formatDate } from '@/utils/date';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';

export default function OpeningStock({ openingStocks, warehouses, products, units, filters = {} }) {
    const [mode, setMode] = useState('list'); 
    const openingStockRef = useRef(null);
    const printRef = useRef(null);
    const { props } = usePage();
    const { localization, errors } = props;
    const translations = localization?.translations || {};

    const getLocalizedRoute = (name, params = {}) => {
        return route(name, {
            country: localization?.country_code || 'sa',
            lang: localization?.current_locale || 'ar',
            ...params
        });
    };

    const t = (key, fallback) => {
        return translations[key] || translations[`opening_stock.${key}`] || translations[`common.${key}`] || fallback;
    };

    const computeLineTotals = (items) => {
        const list = Array.isArray(items) ? items : [];
        let totalLines = 0;
        let totalQty = 0;
        let totalValue = 0;
        list.forEach((item) => {
            const qty = parseFloat(item?.quantity || 0) || 0;
            const price = parseFloat(item?.cost_price || 0) || 0;
            if (qty > 0) {
                totalLines++;
                totalQty += qty;
                totalValue += qty * price;
            }
        });
        return { totalLines, totalQty, totalValue };
    };

    const safeOpeningStocks = useMemo(() => {
        if (openingStocks && Array.isArray(openingStocks)) {
            return {
                data: openingStocks,
                current_page: 1,
                last_page: 1,
                total: openingStocks.length,
                per_page: openingStocks.length || 25,
                from: 1,
                to: openingStocks.length,
            };
        }
        return openingStocks || {
            data: [],
            current_page: 1,
            last_page: 1,
            total: 0,
            per_page: 25,
            from: 0,
            to: 0,
        };
    }, [openingStocks]);

    const aggregateStats = useMemo(() => {
        const rows = safeOpeningStocks?.data || [];
        let totalQty = 0;
        let totalValue = 0;
        rows.forEach(row => {
            const { totalQty: q, totalValue: v } = computeLineTotals(row.items);
            totalQty += q;
            totalValue += v;
        });
        return {
            totalVouchers: rows.length,
            totalQty,
            totalValue,
        };
    }, [safeOpeningStocks]);

    const breadcrumbs = [
        { label: t('sidebar.Dashboard', 'Dashboard'), href: getLocalizedRoute('admin.dashboard') },
        { label: t('sidebar.inventory', 'Inventory'), onClick: (e) => { e.preventDefault(); setMode('list'); } },
        { label: t('sidebar.opening_stock', 'Opening Stock') }
    ];
    if (mode === 'create') {
        breadcrumbs.push({ label: t('common.create', 'Create') });
    } else if (mode === 'edit') {
        breadcrumbs.push({ label: t('common.edit', 'Edit') });
    }

    const statsContent = mode === 'list' && (
        <div className="stats-cards">
            <div className="stat-card">
                <div className="stat-icon" style={{ backgroundColor: 'var(--primary-color)' }}>
                    <span className="material-icons-outlined">receipt_long</span>
                </div>
                <div className="stat-content">
                    <div className="stat-value">{aggregateStats.totalVouchers.toLocaleString()}</div>
                    <div className="stat-label">{t('total_vouchers', 'Total Vouchers')}</div>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon" style={{ backgroundColor: 'var(--info-color)' }}>
                    <span className="material-icons-outlined">inventory_2</span>
                </div>
                <div className="stat-content">
                    <div className="stat-value">{aggregateStats.totalQty.toLocaleString()}</div>
                    <div className="stat-label">{t('total_quantity', 'Total Quantity')}</div>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon" style={{ backgroundColor: 'var(--success-color)' }}>
                    <span className="material-icons-outlined">payments</span>
                </div>
                <div className="stat-content">
                    <div className="stat-value">{Number(aggregateStats.totalValue).toFixed(2)}</div>
                    <div className="stat-label">{t('total_value', 'Total Value')}</div>
                </div>
            </div>
        </div>
    );

    const columns = useMemo(() => [
        {
            header: 'Ref #',
            key: 'id',
            sortable: true,
            width: '100px',
            render: (row) => (
                <strong style={{ fontFamily: 'monospace' }}>#{row.id}</strong>
            ),
        },
        {
            header: 'Voucher',
            key: 'voucher_num',
            sortable: false,
            width: '180px',
            render: (row) => (
                <span className="status-badge status-active" style={{ fontFamily: 'monospace' }}>
                    {row.voucher_num || '-'}
                </span>
            ),
        },
        {
            header: 'Date',
            key: 'movement_date',
            sortable: true,
            width: '130px',
            render: (row) => formatDate(row.movement_date),
        },
        {
            header: 'Warehouse',
            key: 'warehouse_id',
            sortable: true,
            render: (row) => row?.warehouse?.name_en || row?.warehouse?.name_ar || row?.warehouse?.name || '-',
        },
        {
            header: 'Items',
            key: 'items_count',
            sortable: false,
            width: '90px',
            render: (row) => {
                const count = Array.isArray(row?.items) ? row.items.length : 0;
                return <span className="badge-count">{count}</span>;
            },
        },
        {
            header: 'Total Qty',
            key: 'total_quantity',
            sortable: false,
            width: '130px',
            render: (row) => {
                const { totalQty } = computeLineTotals(row.items);
                return Number(totalQty).toLocaleString();
            },
        },
        {
            header: 'Total Value',
            key: 'total_value',
            sortable: false,
            width: '140px',
            render: (row) => {
                const { totalValue } = computeLineTotals(row.items);
                return Number(totalValue).toFixed(2);
            },
        },
        {
            header: 'Created',
            key: 'created_at',
            sortable: true,
            width: '150px',
            render: (row) => (row?.created_at ? formatDate(row.created_at) : '-'),
        },
    ], []);

    const handleToolbarSearch = (searchText) => {
        router.get(getLocalizedRoute('admin.inventory.opening-stock.index'), {
            ...filters,
            search: searchText,
            page: 1,
        }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const handleRefresh = () => {
        router.reload({ only: ['openingStocks', 'filters'], preserveState: true, preserveScroll: true });
    };

    const handleServerSort = (sortKey, sortDirection) => {
        const params = { ...filters };
        if (sortKey && sortDirection) {
            params.sort_by = sortKey;
            params.sort_dir = sortDirection;
        } else {
            delete params.sort_by;
            delete params.sort_dir;
        }
        params.page = 1;
        router.get(getLocalizedRoute('admin.inventory.opening-stock.index'), params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handlePageChange = (page) => {
        router.get(getLocalizedRoute('admin.inventory.opening-stock.index'), { ...filters, page }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handlePerPageChange = (perPage) => {
        router.get(getLocalizedRoute('admin.inventory.opening-stock.index'), { ...filters, page: 1, per_page: perPage }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const warehouseOptions = useMemo(() => {
        return (warehouses || []).map(w => ({
            value: String(w.id),
            label: w.name_en || w.name_ar || w.name || ''
        }));
    }, [warehouses]);

    const productOptions = useMemo(() => {
        return (products || []).map(p => ({
            value: String(p.id),
            label: p.name_en || p.name_ar || p.name || ''
        }));
    }, [products]);

    const unitOptions = useMemo(() => {
        return (units || []).map(u => ({
            value: String(u.id),
            label: u.name_en || u.name_ar || u.name || ''
        }));
    }, [units]);

    const { data, setData, post, put, delete: destroy, processing, reset } = useForm({
        id: '',
        movement_date: new Date().toISOString().split('T')[0],
        warehouse_id: '',
        notes: '',
        internal_notes: '',
        total_lines: 0,
        total_quantity: 0,
        total_value: 0,
        items: [],
    });

    useEffect(() => {
        calculateTotals(data.items);
    }, [data.items]);

    const handleCreate = () => {
        reset();
        setData(prev => ({
            ...prev,
            movement_date: new Date().toISOString().split('T')[0],
            items: [{
                id: null,
                line_number: 1,
                product_id: '',
                item_name_ar: '',
                item_name_en: '',
                quantity: 1,
                unit_id: '',
                warehouse_id: '',
                cost_price: 0,
                line_total: 0,
            }]
        }));
        setMode('create');
    };

    const handleEdit = (openingStock) => {
        const toNum = (v) => (v === null || v === undefined ? 0 : Number(v));
        setData({
            ...openingStock,
            items: (openingStock.items || []).map(it => {
                const qty = toNum(it.quantity);
                const costPrice = toNum(it.cost_price);
                
                return {
                    ...it,
                    quantity: qty,
                    cost_price: costPrice,
                    line_total: toNum(it.line_total),
                    unit_id: it.unit_id || it.product?.unit_id || '',
                    warehouse_id: it.warehouse_id || '',
                    item_name_ar: it.product?.name_ar || '',
                    item_name_en: it.product?.name_en || '',
                };
            }),
            movement_date: openingStock.movement_date ? openingStock.movement_date.split('T')[0] : '',
            total_lines: toNum(openingStock.total_lines),
            total_quantity: toNum(openingStock.total_quantity),
            total_value: toNum(openingStock.total_value),
            warehouse_id: openingStock.warehouse_id || '',
        });
        setMode('edit');
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this opening stock?')) {
            destroy(getLocalizedRoute('admin.inventory.opening-stock.destroy', { openingStock: id }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (mode === 'create') {
            post(getLocalizedRoute('admin.inventory.opening-stock.store'), {
                preserveScroll: true,
                onSuccess: () => setMode('list'),
            });
        } else {
            put(getLocalizedRoute('admin.inventory.opening-stock.update', { openingStock: data.id }), {
                preserveScroll: true,
                onSuccess: () => setMode('list'),
            });
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportPDF = () => {
        const element = printRef.current;
        if (!element) return;
        
        const module = element.closest('.opening-stock-module');
        if (module) module.classList.add('generating-pdf');
        
        const opt = {
            margin: [5, 5],
            filename: `OpeningStock_${data.id || 'New'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save().then(() => {
            if (module) module.classList.remove('generating-pdf');
        });
    };

    const handleExportExcel = () => {
        const itemsData = data.items.map((item, index) => ({
            '#': index + 1,
            'Product': products.find(p => p.id == item.product_id)?.name_en || '',
            'Description': item.item_name_ar || '',
            'Quantity': Number(item.quantity),
            'Cost Price': Number(item.cost_price),
            'Total': Number(item.line_total)
        }));

        itemsData.push({});
        itemsData.push({ 'Product': 'Total Quantity', 'Total': Number(data.total_quantity) });
        itemsData.push({ 'Product': 'Total Value', 'Total': Number(data.total_value) });

        const worksheet = XLSX.utils.json_to_sheet(itemsData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Opening Stock");
        XLSX.writeFile(workbook, `OpeningStock_${data.id || 'New'}.xlsx`);
    };

    const addItem = () => {
        setData('items', [
            ...data.items,
            {
                id: null,
                line_number: data.items.length + 1,
                product_id: '',
                item_name_ar: '',
                item_name_en: '',
                quantity: 1,
                unit_id: '',
                warehouse_id: '',
                cost_price: 0,
                line_total: 0,
            }
        ]);
    };

    const removeItem = (index) => {
        const newItems = [...data.items];
        newItems.splice(index, 1);
        setData('items', newItems);
        calculateTotals(newItems);
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...data.items];
        newItems[index][field] = value;

        if (field === 'product_id') {
            const product = products.find(p => p.id == value);
            if (product) {
                newItems[index].item_name_ar = product.name_ar || product.name || '';
                newItems[index].item_name_en = product.name_en || product.name || '';
                newItems[index].cost_price = product.cost_per_item || product.purchase_price || 0;
                newItems[index].unit_id = product.unit_id || '';
                newItems[index].warehouse_id = newItems[index].warehouse_id || (warehouses?.[0]?.id || '');
            }
        }

        const qty = parseFloat(newItems[index].quantity) || 0;
        const price = parseFloat(newItems[index].cost_price) || 0;
        const total = qty * price;
        
        newItems[index].line_total = total.toFixed(2);

        setData('items', newItems);
    };

    const calculateTotals = (items) => {
        let calculatedTotalLines = 0;
        let calculatedTotalQty = 0;
        let calculatedTotalValue = 0;
        
        items.forEach(item => {
             const qty = parseFloat(item.quantity) || 0;
             const price = parseFloat(item.cost_price) || 0;
             
             if (qty > 0) {
                 calculatedTotalLines++;
                 calculatedTotalQty += qty;
                 calculatedTotalValue += qty * price;
             }
        });

        if (
            Math.abs(data.total_lines - calculatedTotalLines) > 0.01 ||
            Math.abs(data.total_quantity - calculatedTotalQty) > 0.01 ||
            Math.abs(data.total_value - calculatedTotalValue) > 0.01
        ) {
             setData(prev => ({
                ...prev,
                total_lines: calculatedTotalLines,
                total_quantity: calculatedTotalQty,
                total_value: calculatedTotalValue
            }));
        }
    };

    return (
        <AdminLayout activeMenu={t('sidebar.opening_stock', 'Opening Stock')}>
            <Head title={t('title', 'Opening Stock')} />
            
            <BlankPage breadcrumbs={breadcrumbs} stats={statsContent}>
                <div className="opening-stock-module">
                <div className="opening-stock-module__header">
                    <h1>Opening Stock</h1>
                    {mode !== 'list' && (
                        <div className="header-actions" style={{display: 'flex', gap: '10px'}}>
                            <button type="button" className="btn-action btn-print" onClick={handlePrint} style={{padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'}}>
                                <span>🖨</span> Print
                            </button>
                            <button type="button" className="btn-action btn-pdf" onClick={handleExportPDF} style={{padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'}}>
                                <span>📄</span> PDF
                            </button>
                            <button type="button" className="btn-action btn-excel" onClick={handleExportExcel} style={{padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'}}>
                                <span>📊</span> Excel
                            </button>
                        </div>
                    )}
                </div>

                {mode === 'list' ? (
                    <div className="opening-stock-module__table-container">
                        <Table
                            tableData={safeOpeningStocks.data || []}
                            columns={columns}

                            currentPage={safeOpeningStocks.current_page || 1}
                            totalPages={safeOpeningStocks.last_page || 1}
                            totalRecords={safeOpeningStocks.total || 0}
                            recordsPerPage={safeOpeningStocks.per_page || 25}

                            onPageChange={handlePageChange}
                            onRecordsPerPageChange={handlePerPageChange}

                            serverSide={true}
                            onSort={handleServerSort}
                            sortKey={filters?.sort_by || null}
                            sortDirection={filters?.sort_dir || null}

                            showToolbar={true}
                            toolbarSearch={true}
                            toolbarSearchPlaceholder="Search by voucher, warehouse, product, notes..."
                            toolbarSearchValue={filters?.search || ''}
                            onToolbarSearch={handleToolbarSearch}
                            showRefreshButton={true}
                            onRefresh={handleRefresh}
                            showAddButton={true}
                            addButtonText="Create Opening Stock"
                            onAdd={handleCreate}

                            onEdit={(row) => handleEdit(row)}
                            onDelete={(row) => handleDelete(row.id)}
                            viewTitle="View"
                            editTitle="Edit"
                            deleteTitle="Delete"
                        />
                    </div>
                ) : (
                    <>
                    <form ref={openingStockRef} onSubmit={handleSubmit} className="invoice-container">
                        
                        <div className="invoice-header">
                            <div className="company-info">
                                <h2>OPENING STOCK</h2>
                                <p>Zodic ERP System</p>
                            </div>
                            <div className="invoice-meta">
                                <label>Stock #</label>
                                <input type="text" value={data.id} disabled placeholder="Auto-generated" />
                                
                                <label>Date <span className="required">*</span></label>
                                <input 
                                    type="date" 
                                    value={data.movement_date} 
                                    onChange={e => setData('movement_date', e.target.value)}
                                    className={errors.movement_date ? 'error' : ''}
                                />
                            </div>
                        </div>

                        <div className="invoice-info-grid">
                            <div className="info-section">
                                <h3>Warehouse Details</h3>
                                <div className="form-group">
                                    <label>Warehouse <span className="required">*</span></label>
                                    <select 
                                        value={data.warehouse_id} 
                                        onChange={e => setData('warehouse_id', e.target.value)}
                                        className={errors.warehouse_id ? 'error' : ''}
                                    >
                                        <option value="">Select Warehouse</option>
                                        {warehouses?.map(w => (
                                            <option key={w.id} value={w.id}>{w.name_en || w.name_ar || w.name}</option>
                                        ))}
                                    </select>
                                    {errors.warehouse_id && <span className="error-msg">{errors.warehouse_id}</span>}
                                </div>
                            </div>

                            <div className="info-section">
                                <h3>Stock Summary</h3>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Total Items</label>
                                        <input 
                                            type="text" 
                                            value={data.total_lines} 
                                            disabled 
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Total Quantity</label>
                                        <input 
                                            type="text" 
                                            value={Number(data.total_quantity).toLocaleString()} 
                                            disabled 
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Total Value</label>
                                        <input 
                                            type="text" 
                                            value={Number(data.total_value).toFixed(2)} 
                                            disabled 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="invoice-items-section">
                            <div className="items-table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th style={{width: '50px'}} className="text-center">#</th>
                                            <th style={{width: '25%'}}>Item</th>
                                            <th style={{width: '10%'}}>Unit</th>
                                            <th style={{width: '15%'}}>Warehouse</th>
                                            <th style={{width: '10%'}} className="text-center">Qty</th>
                                            <th style={{width: '15%'}} className="text-right">Cost Price</th>
                                            <th style={{width: '15%'}} className="text-right">Total</th>
                                            <th style={{width: '50px'}}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.items.map((item, index) => (
                                            <tr key={index}>
                                                <td className="text-center">{index + 1}</td>
                                                <td>
                                                    <div style={{ marginBottom: '5px' }}>
                                                        <SearchableComboBox
                                                            options={productOptions}
                                                            value={item.product_id ? String(item.product_id) : ''}
                                                            onChange={(val) => handleItemChange(index, 'product_id', val)}
                                                            placeholder="Select Product"
                                                        />
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Description"
                                                        value={item.item_name_ar}
                                                        onChange={e => handleItemChange(index, 'item_name_ar', e.target.value)}
                                                    />
                                                </td>
                                                <td>
                                                    <select
                                                        value={item.unit_id ? String(item.unit_id) : ''}
                                                        onChange={e => handleItemChange(index, 'unit_id', e.target.value)}
                                                    >
                                                        <option value="">Select Unit</option>
                                                        {unitOptions.map(unit => (
                                                            <option key={unit.value} value={unit.value}>{unit.label}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td>
                                                    <select
                                                        value={item.warehouse_id ? String(item.warehouse_id) : ''}
                                                        onChange={e => handleItemChange(index, 'warehouse_id', e.target.value)}
                                                    >
                                                        <option value="">Select Warehouse</option>
                                                        {warehouseOptions.map(warehouse => (
                                                            <option key={warehouse.value} value={warehouse.value}>{warehouse.label}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td>
                                                    <input 
                                                        type="number" 
                                                        min="1"
                                                        value={item.quantity} 
                                                        onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                                                        className="text-center"
                                                    />
                                                </td>
                                                <td>
                                                    <input 
                                                        type="number" 
                                                        step="0.01"
                                                        value={item.cost_price} 
                                                        onChange={e => handleItemChange(index, 'cost_price', e.target.value)}
                                                        className="text-right"
                                                    />
                                                </td>
                                                <td>
                                                    <input 
                                                        type="text" 
                                                        value={item.line_total} 
                                                        disabled 
                                                        className="text-right"
                                                        style={{fontWeight: 'bold'}}
                                                    />
                                                </td>
                                                <td className="text-center">
                                                    <button type="button" onClick={() => removeItem(index)} style={{color: 'red', background: 'none', border: 'none', cursor: 'pointer'}}>
                                                        ✕
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="add-item-row">
                                <button type="button" className="btn-add-item" onClick={addItem}>
                                    + Add Line Item
                                </button>
                            </div>
                        </div>

                        <div className="invoice-footer-section">
                            <div className="invoice-terms">
                                <div className="form-group">
                                    <label>Notes</label>
                                    <textarea 
                                        value={data.notes} 
                                        onChange={e => setData('notes', e.target.value)}
                                        placeholder="Notes visible..."
                                    ></textarea>
                                </div>
                                <div className="form-group">
                                    <label>Internal Notes</label>
                                    <textarea 
                                        value={data.internal_notes} 
                                        onChange={e => setData('internal_notes', e.target.value)}
                                        placeholder="Internal notes..."
                                        style={{minHeight: '60px'}}
                                    ></textarea>
                                </div>
                            </div>

                            <div className="invoice-totals">
                                <div className="total-row">
                                    <span className="label">Total Items</span>
                                    <span>{data.total_lines}</span>
                                </div>
                                <div className="total-row">
                                    <span className="label">Total Quantity</span>
                                    <span>{Number(data.total_quantity).toLocaleString()}</span>
                                </div>
                                <div className="total-row grand-total">
                                    <span>Total Value</span>
                                    <span>{Number(data.total_value).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </form>

                    <div className="sticky-actions-footer">
                        <button type="button" className="btn btn-cancel" onClick={() => setMode('list')}>
                            Cancel
                        </button>
                        <button type="button" className="btn btn-save" onClick={handleSubmit} disabled={processing}>
                            {processing ? 'Saving...' : 'Save Opening Stock'}        
                        </button>
                    </div>

                    <div className="printable-invoice" ref={printRef}>
                        <div className="print-header">
                            <div className="company-branding">
                                <h1>ZODIC ERP</h1>
                                <p>123 Business Street, City, Country</p>      
                                <p>Phone: +1 234 567 890</p>
                            </div>
                            <div className="doc-info">
                                <h2>OPENING STOCK</h2>
                                <div className="meta-row">
                                    <span className="label">Stock #:</span>  
                                    <span>{data.id || '-'} </span> 
                                </div>
                                <div className="meta-row">
                                    <span className="label">Date:</span>       
                                    <span>{data.movement_date}</span>
                                </div>
                            </div>
                        </div>

                        <div className="print-meta-grid">
                            <div className="meta-box">
                                <h3>Warehouse</h3>
                                <p><strong>Name:</strong> {warehouses?.find(w => w.id == data.warehouse_id)?.name_en || warehouses?.find(w => w.id == data.warehouse_id)?.name_ar || '-'}</p>
                            </div>
                        </div>

                        <table className="print-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Description</th>
                                    <th>Qty</th>
                                    <th className="text-right">Cost Price</th>      
                                    <th className="text-right">Total</th>      
                                </tr>
                            </thead>
                            <tbody>
                                {data.items.map((item, index) => (
                                    <tr key={index}>
                                        <td>{index + 1}</td>
                                        <td>{products.find(p => p.id == item.product_id)?.name_en || item.item_name_ar || '-'}</td>
                                        <td>{Number(item.quantity)}</td>       
                                        <td className="text-right">{Number(item.cost_price).toFixed(2)}</td>
                                        <td className="text-right">{Number(item.line_total).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="print-totals">
                            <div className="totals-box">
                                <div className="row">
                                    <span>Total Quantity:</span>
                                    <span>{Number(data.total_quantity).toLocaleString()}</span>
                                </div>
                                <div className="row grand-total">
                                    <span>Total Value:</span>
                                    <span>{Number(data.total_value).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="print-footer">
                            <div className="notes-section">
                                <h4>Notes</h4>
                                <p>{data.internal_notes || '-'}</p>
                            </div>
                            <div className="signatures">
                                <div className="sign-box">
                                    Warehouse Signature
                                </div>
                                <div className="sign-box">
                                    Authorized Signature
                                </div>
                            </div>
                        </div>
                    </div>
                    </>
                )}
                </div>
            </BlankPage>
        </AdminLayout>
    );
}
