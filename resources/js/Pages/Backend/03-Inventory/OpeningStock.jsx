import React, { useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';

const makeRowId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createEmptyItem = () => ({
    rowId: makeRowId(),
    product_id: '',
    unit_id: '',
    quantity: '',
    cost_price: '',
});

export default function OpeningStock({ warehouses = [], products = [], units = [], openingStocks = [] }) {
    const page = usePage();
    const { errors, flash } = page.props;

    const pathname = window.location.pathname;
    const pathParts = pathname.split('/');
    const country = pathParts[1] || 'sar';
    const lang = pathParts[2] || 'ar';

    const [movementDate, setMovementDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [warehouseId, setWarehouseId] = useState('');
    const [notes, setNotes] = useState('');
    const [barcode, setBarcode] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [items, setItems] = useState([createEmptyItem()]);

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
        setItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    };

    const addRow = () => {
        setItems((prev) => [...prev, createEmptyItem()]);
    };

    const deleteRow = (index) => {
        setItems((prev) => {
            const next = prev.filter((_, i) => i !== index);
            return next.length ? next : [createEmptyItem()];
        });
    };

    const duplicateRow = (index) => {
        setItems((prev) => {
            const current = prev[index];
            const copy = { ...current, rowId: makeRowId() };
            return [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
        });
    };

    const addProductByBarcode = () => {
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
        if (!warehouseId) return false;
        const hasAtLeastOneRow = items.some((i) => i.product_id && i.unit_id && Number(i.quantity) > 0);
        if (!hasAtLeastOneRow) return false;
        const allComplete = items
            .filter((i) => i.product_id || i.unit_id || i.quantity || i.cost_price)
            .every((i) => i.product_id && i.unit_id && Number(i.quantity) > 0);
        return allComplete;
    }, [items, warehouseId]);

    const handleSave = () => {
        if (!canSave || isSaving) return;

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
                },
            }
        );
    };

    return (
        <AdminLayout>
            <Head title="Opening Stock" />

            <div className="opening-stock-page" dir="ltr" lang="en">
                <div className="page-header-section">
                    <div className="breadcrumb">
                        <a href={route('admin.inventory.products.index', { country, lang })}>Inventory</a>
                        <span>/</span>
                        <span className="current">Opening Stock</span>
                    </div>

                    <div className="opening-stock-titlebar">
                        <div>
                            <h1 className="page-title">Opening Stock</h1>
                            <div className="page-subtitle">Enter opening quantities for products in the warehouse</div>
                        </div>

                        <div className="opening-stock-actions">
                            <div className="opening-stock-pager">
                                <button type="button" className="btn btn-light" onClick={addRow}>
                                    Add row
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
                                            Saving...
                                        </span>
                                    ) : (
                                        'Save'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="opening-stock-stats">
                    <div className="opening-stock-stat-card">
                        <div className="opening-stock-stat-icon blue">
                            <span className="material-icons-outlined">format_list_numbered</span>
                        </div>
                        <div className="opening-stock-stat-content">
                            <div className="opening-stock-stat-value">{totals.totalLines}</div>
                            <div className="opening-stock-stat-label">Total items</div>
                        </div>
                    </div>

                    <div className="opening-stock-stat-card">
                        <div className="opening-stock-stat-icon green">
                            <span className="material-icons-outlined">inventory_2</span>
                        </div>
                        <div className="opening-stock-stat-content">
                            <div className="opening-stock-stat-value">{totals.totalQty.toLocaleString()}</div>
                            <div className="opening-stock-stat-label">Total quantity</div>
                        </div>
                    </div>

                    <div className="opening-stock-stat-card">
                        <div className="opening-stock-stat-icon purple">
                            <span className="material-icons-outlined">payments</span>
                        </div>
                        <div className="opening-stock-stat-content">
                            <div className="opening-stock-stat-value">{totals.totalValue.toLocaleString()}</div>
                            <div className="opening-stock-stat-label">Total cost</div>
                        </div>
                    </div>

                    <div className="opening-stock-stat-card">
                        <div className="opening-stock-stat-icon orange">
                            <span className="material-icons-outlined">warehouse</span>
                        </div>
                        <div className="opening-stock-stat-content">
                            <div className="opening-stock-stat-value">{selectedWarehouse?.name || '-'}</div>
                            <div className="opening-stock-stat-label">Warehouse</div>
                        </div>
                    </div>
                </div>

                <div className="opening-stock-card">
                    {flash?.success ? (
                        <div className="alert alert-success" role="alert">
                            {flash.success}
                        </div>
                    ) : null}

                    <div className="opening-stock-toolbar">
                        <div className="opening-stock-search">
                            <span className="material-icons-outlined">search</span>
                            <input
                                className="form-control"
                                type="text"
                                placeholder="Search products..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="opening-stock-barcode">
                            <input
                                className="form-control"
                                type="text"
                                placeholder="Barcode / SKU then press Enter"
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

                    <div className="opening-stock-header-grid">
                        <div>
                            <label className="form-label">Date</label>
                            <input
                                type="date"
                                className={`form-control ${errors?.movement_date ? 'is-invalid' : ''}`}
                                value={movementDate}
                                onChange={(e) => setMovementDate(e.target.value)}
                            />
                            {errors?.movement_date ? <div className="field-error">{errors.movement_date}</div> : null}
                        </div>

                        <div>
                            <label className="form-label">Warehouse</label>
                            <select
                                className={`form-select ${errors?.warehouse_id ? 'is-invalid' : ''}`}
                                value={warehouseId}
                                onChange={(e) => setWarehouseId(e.target.value)}
                            >
                                <option value="">Select warehouse</option>
                                {warehouses.map((w) => (
                                    <option key={w.id} value={w.id}>
                                        {w.name}
                                    </option>
                                ))}
                            </select>
                            {errors?.warehouse_id ? <div className="field-error">{errors.warehouse_id}</div> : null}
                        </div>

                        <div className="opening-stock-notes">
                            <label className="form-label">Notes</label>
                            <input
                                className={`form-control ${errors?.notes ? 'is-invalid' : ''}`}
                                type="text"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Optional"
                            />
                            {errors?.notes ? <div className="field-error">{errors.notes}</div> : null}
                        </div>

                        <div className="opening-stock-summary">
                            <div className="opening-stock-summary__label">Total cost</div>
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
                                    <th>Product</th>
                                    <th>Unit</th>
                                    <th>Quantity</th>
                                    <th>Cost Price</th>
                                    <th>Total</th>
                                    <th>Actions</th>
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
                                                        className={`form-select ${getItemError(index, 'product_id') ? 'is-invalid' : ''}`}
                                                        value={row.product_id}
                                                        onChange={(e) => updateItem(index, { product_id: e.target.value })}
                                                    >
                                                        <option value="">Select product</option>
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
                                                        className={`form-select ${getItemError(index, 'unit_id') ? 'is-invalid' : ''}`}
                                                        value={row.unit_id}
                                                        onChange={(e) => updateItem(index, { unit_id: e.target.value })}
                                                    >
                                                        <option value="">Select unit</option>
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
                                                        type="number"
                                                        step="0.001"
                                                        className={`form-control ${getItemError(index, 'cost_price') ? 'is-invalid' : ''}`}
                                                        value={row.cost_price}
                                                        onChange={(e) => updateItem(index, { cost_price: e.target.value })}
                                                        placeholder="0"
                                                    />
                                                    {getItemError(index, 'cost_price') ? (
                                                        <div className="field-error">{getItemError(index, 'cost_price')}</div>
                                                    ) : null}
                                                </td>
                                                <td className="total-cell">{total.toLocaleString()}</td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="icon-btn"
                                                        title="Duplicate"
                                                        onClick={() => duplicateRow(index)}
                                                    >
                                                        <span className="material-icons-outlined">content_copy</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="icon-btn danger"
                                                        title="Delete"
                                                        onClick={() => deleteRow(index)}
                                                    >
                                                        <span className="material-icons-outlined">delete</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="opening-stock-empty">
                                            No results
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan="4" className="footer-label">
                                        Total
                                    </td>
                                    <td className="footer-total">{totals.totalQty.toLocaleString()}</td>
                                    <td className="footer-total" colSpan="2">
                                        {totals.totalValue.toLocaleString()}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div className="opening-stock-footer">
                        <div className="opening-stock-footer-meta">
                            Saved records: {openingStocks.length.toLocaleString()}
                        </div>
                        <div className="opening-stock-actions">
                            <button type="button" className="btn btn-light" onClick={addRow}>
                                Add row
                            </button>
                            <button type="button" className="btn btn-primary" disabled={!canSave || isSaving} onClick={handleSave}>
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
