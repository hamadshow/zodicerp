import React, { useEffect, useMemo } from 'react';
import { useForm, Head, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';

export default function TransferStock({ warehouses = [], products = [], units = [] }) {
    const page = usePage();
    const { errors: pageErrors } = page.props;

    /**
     * POST URL must match the current page: /{country}/{lang}/admin/inventory/stock-transfers
     * Relying only on session('country_code') or route() can produce a wrong Ziggy URL and break saves.
     */
    const storeUrl = useMemo(() => {
        const path = page.url?.split('?')[0] || (typeof window !== 'undefined' ? window.location.pathname : '');
        const parts = path.split('/').filter(Boolean);
        if (parts.length >= 3 && parts[2] === 'admin') {
            return `/${parts[0]}/${parts[1]}/admin/inventory/stock-transfers`;
        }
        const loc = page.props?.localization;
        const country = loc?.country_code || parts[0] || 'sa';
        const lang = loc?.current_locale || parts[1] || 'ar';
        try {
            return route('admin.inventory.stock-transfers.store', { country, lang });
        } catch {
            return `/${country}/${lang}/admin/inventory/stock-transfers`;
        }
    }, [page.url, page.props?.localization]);

    // Inertia useForm — persisted to stock_movements (from/to warehouses, notes tagged TransferStock on server)
    const { data, setData, post, processing, errors, reset, transform, hasErrors } = useForm({
        movement_date: new Date().toISOString().split('T')[0],
        from_warehouse_id: '',
        to_warehouse_id: '',
        notes: '',
        items: [
            { product_id: '', unit_id: '', quantity: 1 }
        ]
    });

    useEffect(() => {
        transform((payload) => ({
            ...payload,
            from_warehouse_id: payload.from_warehouse_id === '' ? '' : Number(payload.from_warehouse_id),
            to_warehouse_id: payload.to_warehouse_id === '' ? '' : Number(payload.to_warehouse_id),
            items: payload.items.map((item) => ({
                ...item,
                product_id: item.product_id === '' ? '' : Number(item.product_id),
                unit_id: item.unit_id === '' ? '' : Number(item.unit_id),
                quantity: item.quantity === '' ? '' : Number(item.quantity),
            })),
        }));
    }, [transform]);

    const addItem = () => {
        setData('items', [
            ...data.items,
            { product_id: '', unit_id: '', quantity: 1 }
        ]);
    };

    const removeItem = (index) => {
        const newItems = [...data.items];
        if (newItems.length > 1) {
            newItems.splice(index, 1);
            setData('items', newItems);
        }
    };

    const updateItem = (index, field, value) => {
        const newItems = [...data.items];
        newItems[index][field] = value;
        setData('items', newItems);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (data.from_warehouse_id === data.to_warehouse_id) {
            alert('You cannot transfer to the same warehouse.');
            return;
        }

        post(storeUrl, {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: () => {
                if (typeof console !== 'undefined' && console.warn) {
                    console.warn('[TransferStock] Save failed — check fields or warehouse/product company_id', storeUrl);
                }
            },
        });
    };

    return (
        <AdminLayout activeMenu="Inventory">
            <Head title="Stock transfer" />

            <div className="transfer-stock-container" dir="ltr" lang="en">
                <div className="page-header">
                    <h1>Add new stock transfer</h1>
                </div>

                {(pageErrors?.general || errors?.general) && (
                    <div className="error-message" style={{ marginBottom: '1rem' }}>
                        {pageErrors?.general || errors?.general}
                    </div>
                )}
                {(pageErrors?.auth || errors?.auth) && (
                    <div className="error-message" style={{ marginBottom: '1rem' }}>
                        {pageErrors?.auth || errors?.auth}
                    </div>
                )}

                {hasErrors && (
                    <div className="error-message" style={{ marginBottom: '1rem' }} role="alert">
                        Please fix the errors below (often a warehouse or product does not belong to your company).
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="card">
                        <h3 className="card-title">Transfer details</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Transfer date <span className="text-red-500">*</span></label>
                                <input
                                    type="date"
                                    value={data.movement_date}
                                    onChange={e => setData('movement_date', e.target.value)}
                                    required
                                />
                                {errors.movement_date && <div className="error-message">{errors.movement_date}</div>}
                            </div>

                            <div className="form-group">
                                <label>From warehouse <span className="text-red-500">*</span></label>
                                <select
                                    value={data.from_warehouse_id}
                                    onChange={e => setData('from_warehouse_id', e.target.value)}
                                    required
                                >
                                    <option value="">Select warehouse</option>
                                    {warehouses.map(w => (
                                        <option key={w.id} value={w.id}>{w.name || w.name_ar}</option>
                                    ))}
                                </select>
                                {errors.from_warehouse_id && <div className="error-message">{errors.from_warehouse_id}</div>}
                            </div>

                            <div className="form-group">
                                <label>To warehouse <span className="text-red-500">*</span></label>
                                <select
                                    value={data.to_warehouse_id}
                                    onChange={e => setData('to_warehouse_id', e.target.value)}
                                    required
                                >
                                    <option value="">Select warehouse</option>
                                    {warehouses.map(w => (
                                        <option
                                            key={w.id}
                                            value={w.id}
                                            disabled={w.id == data.from_warehouse_id}
                                        >
                                            {w.name || w.name_ar}
                                        </option>
                                    ))}
                                </select>
                                {errors.to_warehouse_id && <div className="error-message">{errors.to_warehouse_id}</div>}
                            </div>

                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label>Notes</label>
                                <textarea
                                    rows="2"
                                    value={data.notes}
                                    onChange={e => setData('notes', e.target.value)}
                                    placeholder="Any additional notes about the transfer…"
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="card-title">Line items</h3>

                        <div className="items-table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th style={{ width: '40%' }}>Product</th>
                                        <th style={{ width: '20%' }}>Unit</th>
                                        <th style={{ width: '20%' }}>Quantity</th>
                                        <th className="action-column">Remove</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map((item, index) => (
                                        <tr key={index}>
                                            <td>
                                                <select
                                                    className="w-full"
                                                    value={item.product_id}
                                                    onChange={e => updateItem(index, 'product_id', e.target.value)}
                                                    required
                                                >
                                                    <option value="">Select product</option>
                                                    {products.map(p => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.name || p.name_ar} ({p.code || p.sku})
                                                        </option>
                                                    ))}
                                                </select>
                                                {errors[`items.${index}.product_id`] &&
                                                    <div className="error-message">{errors[`items.${index}.product_id`]}</div>
                                                }
                                            </td>
                                            <td>
                                                <select
                                                    className="w-full"
                                                    value={item.unit_id}
                                                    onChange={e => updateItem(index, 'unit_id', e.target.value)}
                                                    required
                                                >
                                                    <option value="">Select unit</option>
                                                    {units.map(u => (
                                                        <option key={u.id} value={u.id}>{u.name || u.name_ar}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    min="0.001"
                                                    step="any"
                                                    className="w-full"
                                                    value={item.quantity}
                                                    onChange={e => updateItem(index, 'quantity', e.target.value)}
                                                    required
                                                />
                                                {errors[`items.${index}.quantity`] &&
                                                    <div className="error-message">{errors[`items.${index}.quantity`]}</div>
                                                }
                                            </td>
                                            <td className="action-column">
                                                {data.items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() => removeItem(index)}
                                                    >
                                                        X
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <button type="button" className="btn btn-add" onClick={addItem}>
                            + Add another line
                        </button>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => window.history.back()}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={processing}>Save transfer</button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
