import React, { useMemo, useState, useEffect } from 'react';
import { Head, router, usePage, Link } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';

const makeRowId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createEmptyItem = () => ({
    rowId: makeRowId(),
    product_id: '',
    unit_id: '',
    quantity: '',
    cost_price: '',
});

export default function OpeningStock({ 
    warehouses = [], 
    products = [], 
    units = [], 
    openingStocks = [], 
    pagination = [],
    initialShowForm = false,
    viewing = false,
    openingStock = null 
}) {
    const page = usePage();
    const { errors, flash, auth } = page.props;

    const pathname = window.location.pathname;
    const pathParts = pathname.split('/');
    const country = pathParts[1] || 'sar';
    const lang = pathParts[2] || 'ar';
    const isRtl = lang === 'ar';

    const [showForm, setShowForm] = useState(initialShowForm);
    const [movementDate, setMovementDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [warehouseId, setWarehouseId] = useState('');
    const [notes, setNotes] = useState('');
    const [barcode, setBarcode] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [items, setItems] = useState([createEmptyItem()]);

    // Filtered opening stocks for the list view
    const filteredOpeningStocks = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return openingStocks;
        return openingStocks.filter(stock => 
            String(stock.id).includes(term) ||
            (stock.warehouse?.name || '').toLowerCase().includes(term) ||
            (stock.notes || '').toLowerCase().includes(term) ||
            (stock.creator?.name || '').toLowerCase().includes(term)
        );
    }, [openingStocks, searchTerm]);

    // Handle view mode (showing a specific opening stock)
    useEffect(() => {
        if (viewing && openingStock) {
            setShowForm(true);
            setMovementDate(openingStock.movement_date || '');
            setWarehouseId(openingStock.warehouse_id || '');
            setNotes(openingStock.notes || '');
            
            if (openingStock.items && openingStock.items.length > 0) {
                const mappedItems = openingStock.items.map(item => ({
                    rowId: makeRowId(),
                    product_id: item.product_id,
                    unit_id: item.unit_id,
                    quantity: item.quantity,
                    cost_price: item.cost_price,
                }));
                setItems(mappedItems);
            }
        }
    }, [viewing, openingStock]);

    const productsById = useMemo(() => {
        const map = new Map();
        products.forEach((p) => map.set(p.id, p));
        return map;
    }, [products]);

    const selectedWarehouse = useMemo(() => {
        const id = Number(warehouseId);
        return warehouses.find((w) => w.id === id) || null;
    }, [warehouseId, warehouses]);

    const totals = useMemo(() => {
        const validRows = items.filter((i) => i.product_id && i.unit_id && Number(i.quantity) > 0);
        const totalLines = validRows.length;
        const totalQty = validRows.reduce((sum, i) => sum + Number(i.quantity || 0), 0);
        const totalValue = validRows.reduce((sum, i) => sum + Number(i.quantity || 0) * Number(i.cost_price || 0), 0);
        return { totalLines, totalQty, totalValue };
    }, [items]);

    const getItemError = (index, field) => {
        const key = `items.${index}.${field}`;
        return errors?.[key] || null;
    };

    const visibleIndexes = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) {
            return items.map((_, index) => index);
        }

        return items
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => {
                const p = productsById.get(Number(item.product_id));
                const name = (p?.name || '').toLowerCase();
                const sku = (p?.sku || '').toLowerCase();
                const bc = (p?.barcode || '').toLowerCase();
                return name.includes(term) || sku.includes(term) || bc.includes(term);
            })
            .map(({ index }) => index);
    }, [items, productsById, searchTerm]);

    const updateItem = (index, patch) => {
        if (viewing) return;
        setItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    };

    const addRow = () => {
        if (viewing) return;
        setItems((prev) => [...prev, createEmptyItem()]);
    };

    const deleteRow = (index) => {
        if (viewing) return;
        setItems((prev) => {
            const next = prev.filter((_, i) => i !== index);
            return next.length ? next : [createEmptyItem()];
        });
    };

    const duplicateRow = (index) => {
        if (viewing) return;
        setItems((prev) => {
            const current = prev[index];
            const copy = { ...current, rowId: makeRowId() };
            return [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
        });
    };

    const addProductByBarcode = () => {
        if (viewing) return;
        const raw = barcode.trim();
        if (!raw) return;

        const match = products.find((p) => String(p.barcode || '').trim() === raw || String(p.sku || '').trim() === raw);
        if (!match) return;

        setItems((prev) => {
            const emptyIndex = prev.findIndex((r) => !r.product_id);
            if (emptyIndex !== -1) {
                const next = [...prev];
                const unitFallback = units[0]?.id || '';
                next[emptyIndex] = {
                    ...next[emptyIndex],
                    product_id: match.id,
                    unit_id: next[emptyIndex].unit_id || unitFallback,
                    quantity: next[emptyIndex].quantity || 1,
                };
                return next;
            }

            const unitFallback = units[0]?.id || '';
            return [
                ...prev,
                {
                    ...createEmptyItem(),
                    product_id: match.id,
                    unit_id: unitFallback,
                    quantity: 1,
                },
            ];
        });

        setBarcode('');
    };

    const canSave = useMemo(() => {
        if (viewing) return false;
        if (!warehouseId) return false;
        const hasAtLeastOneRow = items.some((i) => i.product_id && i.unit_id && Number(i.quantity) > 0);
        if (!hasAtLeastOneRow) return false;
        const allComplete = items
            .filter((i) => i.product_id || i.unit_id || i.quantity || i.cost_price)
            .every((i) => i.product_id && i.unit_id && Number(i.quantity) > 0);
        return allComplete;
    }, [items, warehouseId, viewing]);

    const handleSave = () => {
        if (!canSave || isSaving || viewing) return;

        const normalizedNotes = notes.trim();
        const finalNotes = normalizedNotes ? `OpeningStock - ${normalizedNotes}` : 'OpeningStock';

        const payloadItems = items
            .filter((i) => i.product_id && i.unit_id && Number(i.quantity) > 0)
            .map((i) => ({
                product_id: Number(i.product_id),
                unit_id: Number(i.unit_id),
                quantity: Number(i.quantity),
                cost_price: i.cost_price === '' ? 0 : Number(i.cost_price),
            }));

        setIsSaving(true);
        router.post(
            route('admin.inventory.opening-stock.store', { country, lang }),
            {
                movement_date: movementDate || null,
                warehouse_id: Number(warehouseId),
                notes: finalNotes,
                items: payloadItems,
            },
            {
                preserveScroll: true,
                onFinish: () => setIsSaving(false),
                onSuccess: () => {
                    setNotes('');
                    setItems([createEmptyItem()]);
                    setShowForm(false);
                },
            }
        );
    };

    const handleBackToList = () => {
        if (viewing) {
            router.get(route('admin.inventory.opening-stock.index', { country, lang }));
        } else {
            setShowForm(false);
        }
    };

    const handleAddNew = () => {
        setShowForm(true);
        setItems([createEmptyItem()]);
        setWarehouseId('');
        setNotes('');
        setMovementDate(new Date().toISOString().slice(0, 10));
    };

    const handleDelete = (id) => {
        if (confirm(isRtl ? 'هل أنت متأكد من حذف هذا السجل؟' : 'Are you sure you want to delete this record?')) {
            router.delete(route('admin.inventory.opening-stock.destroy', { country, lang, id }), {
                onSuccess: () => {
                    // Flash success message is already handled by Inertia and displayed in the layout
                }
            });
        }
    };

    const t = (ar, en) => isRtl ? ar : en;

    return (
        <AdminLayout activeMenu="Opening Stock">
            <Head title={showForm ? (viewing ? t("عرض مخزون افتتاحي", "View Opening Stock") : t("إضافة مخزون افتتاحي", "Add Opening Stock")) : t("قائمة المخزون الافتتاحي", "Opening Stock List")} />

            <div className="opening-stock-page" dir={isRtl ? "rtl" : "ltr"} lang={lang}>
                <div className="page-header-section">
                    <div className="breadcrumb">
                        <a href={route('admin.inventory.products.index', { country, lang })}>{t("المخزن", "Inventory")}</a>
                        <span>/</span>
                        {showForm ? (
                            <>
                                <button 
                                    className="link-btn" 
                                    onClick={handleBackToList}
                                    style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0 }}
                                >
                                    {t("المخزون الافتتاحي", "Opening Stock")}
                                </button>
                                <span>/</span>
                                <span className="current">{viewing ? t("عرض", "View") : t("إضافة جديد", "Add New")}</span>
                            </>
                        ) : (
                            <span className="current">{t("المخزون الافتتاحي", "Opening Stock")}</span>
                        )}
                    </div>

                    <div className="opening-stock-titlebar">
                        <div>
                            <h1 className="page-title">
                                {showForm ? (viewing ? t(`مخزون افتتاحي #${openingStock.id}`, `Opening Stock #${openingStock.id}`) : t("إضافة مخزون افتتاحي", "Add Opening Stock")) : t("قائمة المخزون الافتتاحي", "Opening Stock List")}
                            </h1>
                            <div className="page-subtitle">
                                {showForm 
                                    ? (viewing ? t("مراجعة تفاصيل المخزون الافتتاحي", "Review opening stock details") : t("أدخل كميات المخزون الافتتاحي للمنتجات في المستودع", "Enter opening quantities for products in the warehouse"))
                                    : t("عرض وإدارة سجلات المخزون الافتتاحي المحفوظة", "View and manage saved opening stock records")}
                            </div>
                        </div>

                        <div className="opening-stock-actions">
                            {!showForm ? (
                                <button 
                                    className="btn btn-primary" 
                                    onClick={handleAddNew}
                                >
                                    <span className="material-icons-outlined">add</span>
                                    {t("إضافة مخزون افتتاحي", "Add Opening Stock")}
                                </button>
                            ) : (
                                <div className="opening-stock-pager">
                                    <button type="button" className="btn btn-light" onClick={handleBackToList}>
                                        <span className="material-icons-outlined">arrow_back</span>
                                        {t("العودة للقائمة", "Back to List")}
                                    </button>
                                    {!viewing && (
                                        <>
                                            <button type="button" className="btn btn-light" onClick={addRow}>
                                                {t("إضافة سطر", "Add row")}
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-primary"
                                                disabled={!canSave || isSaving}
                                                onClick={handleSave}
                                            >
                                                {isSaving ? (
                                                    <span className="opening-stock-saving">
                                                        <span className="spinner" />
                                                        {t("جاري الحفظ...", "Saving...")}
                                                    </span>
                                                ) : (
                                                    t("حفظ", "Save")
                                                )}
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {showForm ? (
                    <div className="opening-stock-form-view">
                        <div className="opening-stock-stats">
                            <div className="opening-stock-stat-card">
                                <div className="opening-stock-stat-icon blue">
                                    <span className="material-icons-outlined">format_list_numbered</span>
                                </div>
                                <div className="opening-stock-stat-content">
                                    <div className="opening-stock-stat-value">{totals.totalLines}</div>
                                    <div className="opening-stock-stat-label">{t("إجمالي الأصناف", "Total items")}</div>
                                </div>
                            </div>

                            <div className="opening-stock-stat-card">
                                <div className="opening-stock-stat-icon green">
                                    <span className="material-icons-outlined">inventory_2</span>
                                </div>
                                <div className="opening-stock-stat-content">
                                    <div className="opening-stock-stat-value">{totals.totalQty.toLocaleString()}</div>
                                    <div className="opening-stock-stat-label">{t("إجمالي الكمية", "Total quantity")}</div>
                                </div>
                            </div>

                            <div className="opening-stock-stat-card">
                                <div className="opening-stock-stat-icon purple">
                                    <span className="material-icons-outlined">payments</span>
                                </div>
                                <div className="opening-stock-stat-content">
                                    <div className="opening-stock-stat-value">{totals.totalValue.toLocaleString()}</div>
                                    <div className="opening-stock-stat-label">{t("إجمالي التكلفة", "Total cost")}</div>
                                </div>
                            </div>

                            <div className="opening-stock-stat-card">
                                <div className="opening-stock-stat-icon orange">
                                    <span className="material-icons-outlined">warehouse</span>
                                </div>
                                <div className="opening-stock-stat-content">
                                    <div className="opening-stock-stat-value">{selectedWarehouse?.name || '-'}</div>
                                    <div className="opening-stock-stat-label">{t("المستودع", "Warehouse")}</div>
                                </div>
                            </div>
                        </div>

                        <div className="opening-stock-card">
                            {flash?.success ? (
                                <div className="alert alert-success" role="alert">
                                    {flash.success}
                                </div>
                            ) : null}

                            {!viewing && (
                                <div className="opening-stock-toolbar">
                                    <div className="opening-stock-search">
                                        <span className="material-icons-outlined">search</span>
                                        <input
                                            className="form-control"
                                            type="text"
                                            placeholder={t("البحث عن منتجات...", "Search products...")}
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>

                                    <div className="opening-stock-barcode">
                                        <input
                                            className="form-control"
                                            type="text"
                                            placeholder={t("الباركود / SKU ثم اضغط Enter", "Barcode / SKU then press Enter")}
                                            value={barcode}
                                            onChange={(e) => setBarcode(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addProductByBarcode();
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="opening-stock-header-grid">
                                <div>
                                    <label className="form-label">{t("التاريخ", "Date")}</label>
                                    <input
                                        type="date"
                                        disabled={viewing}
                                        className={`form-control ${errors?.movement_date ? 'is-invalid' : ''}`}
                                        value={movementDate}
                                        onChange={(e) => setMovementDate(e.target.value)}
                                    />
                                    {errors?.movement_date ? <div className="field-error">{errors.movement_date}</div> : null}
                                </div>

                                <div>
                                    <label className="form-label">{t("المستودع", "Warehouse")}</label>
                                    <select
                                        disabled={viewing}
                                        className={`form-select ${errors?.warehouse_id ? 'is-invalid' : ''}`}
                                        value={warehouseId}
                                        onChange={(e) => setWarehouseId(e.target.value)}
                                    >
                                        <option value="">{t("اختر المستودع", "Select warehouse")}</option>
                                        {warehouses.map((w) => (
                                            <option key={w.id} value={w.id}>
                                                {w.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors?.warehouse_id ? <div className="field-error">{errors.warehouse_id}</div> : null}
                                </div>

                                <div className="opening-stock-notes">
                                    <label className="form-label">{t("ملاحظات", "Notes")}</label>
                                    <input
                                        disabled={viewing}
                                        className={`form-control ${errors?.notes ? 'is-invalid' : ''}`}
                                        type="text"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder={t("اختياري", "Optional")}
                                    />
                                    {errors?.notes ? <div className="field-error">{errors.notes}</div> : null}
                                </div>

                                <div className="opening-stock-summary" style={{ display: 'block' }}>
                                    <div className="opening-stock-summary__label">{t("إجمالي التكلفة", "Total cost")}</div>
                                    <div className="opening-stock-summary__value">{totals.totalValue.toLocaleString()}</div>
                                </div>
                            </div>

                            {errors?.items ? (
                                <div className="alert alert-danger opening-stock-items-error" role="alert">
                                    {errors.items}
                                </div>
                            ) : null}

                            <div className="opening-stock-table-wrap">
                                <table className="opening-stock-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>{t("المنتج", "Product")}</th>
                                            <th>{t("الوحدة", "Unit")}</th>
                                            <th>{t("الكمية", "Quantity")}</th>
                                            <th>{t("سعر التكلفة", "Cost Price")}</th>
                                            <th>{t("الإجمالي", "Total")}</th>
                                            {!viewing && <th>{t("العمليات", "Actions")}</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visibleIndexes.length ? (
                                            visibleIndexes.map((index) => {
                                                const row = items[index];
                                                const total = Number(row.quantity || 0) * Number(row.cost_price || 0);

                                                return (
                                                    <tr key={row.rowId}>
                                                        <td>{index + 1}</td>
                                                        <td>
                                                            <select
                                                                disabled={viewing}
                                                                className={`form-select ${getItemError(index, 'product_id') ? 'is-invalid' : ''}`}
                                                                value={row.product_id}
                                                                onChange={(e) => updateItem(index, { product_id: e.target.value })}
                                                            >
                                                                <option value="">{t("اختر المنتج", "Select product")}</option>
                                                                {products.map((p) => (
                                                                    <option key={p.id} value={p.id}>
                                                                        {p.name} {p.sku ? `- ${p.sku}` : ''} {p.barcode ? `(${p.barcode})` : ''}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            {getItemError(index, 'product_id') ? (
                                                                <div className="field-error">{getItemError(index, 'product_id')}</div>
                                                            ) : null}
                                                        </td>
                                                        <td>
                                                            <select
                                                                disabled={viewing}
                                                                className={`form-select ${getItemError(index, 'unit_id') ? 'is-invalid' : ''}`}
                                                                value={row.unit_id}
                                                                onChange={(e) => updateItem(index, { unit_id: e.target.value })}
                                                            >
                                                                <option value="">{t("اختر الوحدة", "Select unit")}</option>
                                                                {units.map((u) => (
                                                                    <option key={u.id} value={u.id}>
                                                                        {u.name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            {getItemError(index, 'unit_id') ? (
                                                                <div className="field-error">{getItemError(index, 'unit_id')}</div>
                                                            ) : null}
                                                        </td>
                                                        <td>
                                                            <input
                                                                disabled={viewing}
                                                                type="number"
                                                                step="0.001"
                                                                className={`form-control ${getItemError(index, 'quantity') ? 'is-invalid' : ''}`}
                                                                value={row.quantity}
                                                                onChange={(e) => updateItem(index, { quantity: e.target.value })}
                                                                placeholder="0"
                                                            />
                                                            {getItemError(index, 'quantity') ? (
                                                                <div className="field-error">{getItemError(index, 'quantity')}</div>
                                                            ) : null}
                                                        </td>
                                                        <td>
                                                            <input
                                                                disabled={viewing}
                                                                type="number"
                                                                step="0.01"
                                                                className={`form-control ${getItemError(index, 'cost_price') ? 'is-invalid' : ''}`}
                                                                value={row.cost_price}
                                                                onChange={(e) => updateItem(index, { cost_price: e.target.value })}
                                                                placeholder="0.00"
                                                            />
                                                            {getItemError(index, 'cost_price') ? (
                                                                <div className="field-error">{getItemError(index, 'cost_price')}</div>
                                                            ) : null}
                                                        </td>
                                                        <td className="total-cell">{total.toLocaleString()}</td>
                                                        {!viewing && (
                                                            <td>
                                                                <div className="opening-stock-actions">
                                                                    <button
                                                                        type="button"
                                                                        className="icon-btn"
                                                                        onClick={() => duplicateRow(index)}
                                                                        title={t("تكرار", "Duplicate")}
                                                                    >
                                                                        <span className="material-icons-outlined">content_copy</span>
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="icon-btn danger"
                                                                        onClick={() => deleteRow(index)}
                                                                        title={t("حذف", "Delete")}
                                                                    >
                                                                        <span className="material-icons-outlined">delete</span>
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={viewing ? 6 : 7} className="opening-stock-empty">
                                                    {t("لا توجد أصناف.", "No items found.")}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan={3} className="footer-label">
                                                {t("الإجماليات", "TOTALS")}
                                            </td>
                                            <td className="footer-total">{totals.totalQty.toLocaleString()}</td>
                                            <td></td>
                                            <td className="footer-total">{totals.totalValue.toLocaleString()}</td>
                                            {!viewing && <td></td>}
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className="opening-stock-footer">
                                <div className="opening-stock-footer-meta">
                                    {t("إجمالي الأصناف:", "Total items:")} {totals.totalLines} | {t("المستخدم:", "User:")} {auth?.user?.name || 'Admin'}
                                </div>
                                {!viewing && (
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        disabled={!canSave || isSaving}
                                        onClick={handleSave}
                                    >
                                        {isSaving ? t("جاري الحفظ...", "Saving...") : t("تأكيد وحفظ", "Confirm & Save")}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="opening-stock-list-view fade-in">
                        <div className="opening-stock-card">
                            <div className="opening-stock-toolbar">
                                <div className="opening-stock-search">
                                    <span className="material-icons-outlined">search</span>
                                    <input
                                        className="form-control"
                                        type="text"
                                        placeholder={t("البحث حسب المستودع أو الملاحظات أو الرقم أو المستخدم...", "Search by warehouse, notes, ID, or user...")}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <button 
                                    className="btn btn-primary" 
                                    onClick={handleAddNew}
                                >
                                    <span className="material-icons-outlined">add</span>
                                    {t("إضافة جديد", "Add New")}
                                </button>
                            </div>

                            <div className="opening-stock-table-wrap">
                                <table className="opening-stock-table">
                                    <thead>
                                        <tr>
                                            <th>{t("الرقم", "ID")}</th>
                                            <th>{t("التاريخ", "Date")}</th>
                                            <th>{t("المستودع", "Warehouse")}</th>
                                            <th>{t("ملاحظات", "Notes")}</th>
                                            <th>{t("عدد الأصناف", "Items Count")}</th>
                                            <th>{t("بواسطة", "Created By")}</th>
                                            <th>{t("العمليات", "Actions")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredOpeningStocks.length > 0 ? (
                                            filteredOpeningStocks.map((stock) => (
                                                <tr key={stock.id}>
                                                    <td>#{stock.id}</td>
                                                    <td>{stock.movement_date || '-'}</td>
                                                    <td>{stock.warehouse?.name || '-'}</td>
                                                    <td>{stock.notes || '-'}</td>
                                                    <td>{stock.items?.length || 0} {t("أصناف", "items")}</td>
                                                    <td>{stock.creator?.name || '-'}</td>
                                                    <td>
                                                        <div className="opening-stock-actions">
                                                            <Link 
                                                                href={route('admin.inventory.opening-stock.show', { country, lang, id: stock.id })}
                                                                className="icon-btn"
                                                                title={t("عرض التفاصيل", "View Details")}
                                                            >
                                                                <span className="material-icons-outlined">visibility</span>
                                                            </Link>
                                                            <button
                                                                type="button"
                                                                className="icon-btn danger"
                                                                onClick={() => handleDelete(stock.id)}
                                                                title={t("حذف", "Delete")}
                                                            >
                                                                <span className="material-icons-outlined">delete</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="7" className="opening-stock-empty">
                                                    {t("لم يتم العثور على سجلات مخزون افتتاحي.", "No opening stock records found.")}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {pagination && pagination.length > 3 && (
                                <div className="opening-stock-footer" style={{ marginTop: '16px', justifyContent: 'center' }}>
                                    <div className="opening-stock-pager">
                                        {pagination.map((link, i) => (
                                            <Link
                                                key={i}
                                                href={link.url || '#'}
                                                className={`btn ${link.active ? 'btn-primary' : 'btn-light'} ${!link.url ? 'disabled' : ''}`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                                preserveScroll
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
