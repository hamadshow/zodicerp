import React, { useEffect, useMemo, useState } from 'react';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import SearchableComboBox from '../components/SearchableComboBox';
import Table from '../components/Table';
import { formatDate } from '@/utils/date';

/**
 * Stock Transfers (Phase 5 rebuild).
 *
 * Follows the StockAdjustment page conventions: AdminLayout shell, shared
 * serverSide Table, useForm (Inertia handles CSRF), localized labels, BEM
 * module classes. The view modal is an Inertia partial reload
 * (only=['transferView']) — no raw fetch. One transfer document records the
 * outbound and the matching inbound; quantities are entered in the selected
 * unit and normalized to the base unit by the server.
 */
export default function TransferStock({
    transfers,
    warehouses = [],
    products = [],
    units = [],
    filters = {},
    transferView = null,
}) {
    const [mode, setMode] = useState('list'); // 'list' | 'create' | 'edit'
    const [editing, setEditing] = useState(null); // transfer object when mode==='edit'
    const [viewOpen, setViewOpen] = useState(false);
    const [viewLoading, setViewLoading] = useState(false);
    const [viewError, setViewError] = useState('');
    const [viewIntent, setViewIntent] = useState('view'); // 'view' | 'edit'

    const { props } = usePage();
    const { localization, errors: pageErrors = {} } = props;
    const translations = localization?.translations || {};

    const t = (key, fallback) =>
        translations[key] || translations[`stock_transfer.${key}`] || translations[`common.${key}`] || fallback;

    const getLocalizedRoute = (name, params = {}) =>
        route(name, {
            country: localization?.country_code || 'sa',
            lang: localization?.current_locale || 'ar',
            ...params,
        });

    const safeTransfers = transfers || {
        data: [], total: 0, per_page: 15, current_page: 1,
    };
    const rows = safeTransfers.data || [];

    const { data, setData, post, put, processing, reset, errors: formErrors } = useForm({
        movement_date: new Date().toISOString().split('T')[0],
        from_warehouse_id: '',
        to_warehouse_id: '',
        notes: '',
        items: [{ product_id: '', unit_id: '', quantity: 1 }],
    });

    const mergedErrors = { ...pageErrors, ...formErrors };

    useEffect(() => {
        if (!transferView) return;
        setViewLoading(false);

        if (viewIntent === 'edit') {
            const tv = transferView.transfer;
            setEditing(tv);
            setData({
                movement_date: tv.movement_date || new Date().toISOString().split('T')[0],
                from_warehouse_id: tv.from_warehouse_id ? String(tv.from_warehouse_id) : '',
                to_warehouse_id: tv.to_warehouse_id ? String(tv.to_warehouse_id) : '',
                notes: (tv.notes || '').replace('TransferStock | ', '').replace('TransferStock', ''),
                items: (transferView.lines || []).length
                    ? transferView.lines.map((l) => ({
                        product_id: String(l.product_id),
                        unit_id: String(l.unit_id),
                        quantity: l.original_quantity ?? l.quantity,
                    }))
                    : [{ product_id: '', unit_id: '', quantity: 1 }],
            });
            setMode('edit');
            setViewOpen(false);
        }
    }, [transferView, viewIntent, setData]);

    const addItem = () =>
        setData('items', [...data.items, { product_id: '', unit_id: '', quantity: 1 }]);

    const removeItem = (index) => {
        const items = data.items.filter((_, i) => i !== index);
        setData('items', items.length ? items : [{ product_id: '', unit_id: '', quantity: 1 }]);
    };

    const updateItem = (index, field, value) => {
        const items = data.items.map((item, i) => {
            if (i !== index) return item;
            const next = { ...item, [field]: value };
            if (field === 'product_id') {
                const product = products.find((p) => String(p.id) === String(value));
                if (product) {
                    next.unit_id = product.unit_id || '';
                }
            }
            return next;
        });
        setData('items', items);
    };

    const startCreate = () => {
        setEditing(null);
        reset();
        setMode('create');
    };

    /**
     * View modal + edit both go through the same partial reload: the index
     * rows do not carry lines, so the form is filled when transferView lands.
     */
    const loadTransferView = (id, intent = 'view') => {
        setViewIntent(intent);
        setViewOpen(intent === 'view');
        setViewError('');
        setViewLoading(true);
        router.get(
            getLocalizedRoute('admin.inventory.stock-transfers.index'),
            { transfer_view_id: id },
            {
                only: ['transferView'],
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onFinish: () => setViewLoading(false),
                onError: () => setViewError(t('transfer_view_error', 'Failed to load the transfer.')),
            }
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (mode === 'edit' && editing) {
            put(getLocalizedRoute('admin.inventory.stock-transfers.update', { stock_transfer: editing.id }), {
                preserveScroll: true,
                onSuccess: () => {
                    setMode('list');
                    setEditing(null);
                    reset();
                },
            });
            return;
        }
        post(getLocalizedRoute('admin.inventory.stock-transfers.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setMode('list');
                reset();
            },
        });
    };

    const cancelTransfer = (id) => {
        if (window.confirm(t('confirm_cancel_transfer', 'Cancel this transfer? The stock returns to the source warehouse and the cost entries are reversed exactly.'))) {
            router.post(getLocalizedRoute('admin.inventory.stock-transfers.cancel', { id }), {}, { preserveScroll: true });
        }
    };

    const deleteTransfer = (id) => {
        if (window.confirm(t('confirm_delete_transfer', 'Delete this unposted draft transfer?'))) {
            router.delete(getLocalizedRoute('admin.inventory.stock-transfers.destroy', { stock_transfer: id }), { preserveScroll: true });
        }
    };

    const openView = (id) => loadTransferView(id, 'view');

    const isCancelled = (row) => (row.notes || '').includes('[CANCELLED');

    const columns = useMemo(() => [
        {
            header: t('voucher', 'Voucher #'),
            key: 'voucher_num',
            render: (row) => <span className="stock-transfer-module__number">{row.voucher_num}</span>,
        },
        {
            header: t('date', 'Date'),
            key: 'movement_date',
            render: (row) => (row.movement_date ? formatDate(row.movement_date) : '-'),
        },
        {
            header: t('from_warehouse', 'From'),
            key: 'from_warehouse_id',
            render: (row) => row.from_warehouse?.name || '-',
        },
        {
            header: t('to_warehouse', 'To'),
            key: 'to_warehouse_id',
            render: (row) => row.to_warehouse?.name || '-',
        },
        {
            header: t('notes', 'Notes'),
            key: 'notes',
            render: (row) => (row.notes || '').replace('TransferStock | ', '').replace('[CANCELLED', '').trim() || '-',
        },
        {
            header: t('status', 'Status'),
            key: 'status',
            render: (row) => (
                isCancelled(row)
                    ? <span className="badge badge-danger">{t('cancelled', 'Cancelled')}</span>
                    : <span className="badge badge-success">{t('applied', 'Applied')}</span>
            ),
        },
        {
            header: t('actions', 'Actions'),
            key: 'actions',
            sortable: false,
            render: (row) => {
                const viewable = !isCancelled(row);
                const editable = viewable && !row.posted;
                return (
                    <div className="stock-transfer-module__row-actions">
                        {viewable && (
                            <button
                                type="button"
                                className="action-btn"
                                title={t('view', 'View')}
                                onClick={() => openView(row.id)}
                            >
                                <span className="material-icons-outlined">visibility</span>
                            </button>
                        )}
                        {viewable && (
                            <button
                                type="button"
                                className="action-btn success"
                                title={t('cancel_transfer', 'Cancel (reverse)')}
                                onClick={() => cancelTransfer(row.id)}
                            >
                                <span className="material-icons-outlined">undo</span>
                            </button>
                        )}
                        {editable && (
                            <button
                                type="button"
                                className="action-btn"
                                title={t('edit', 'Edit')}
                                onClick={() => loadTransferView(row.id, 'edit')}
                            >
                                <span className="material-icons-outlined">edit</span>
                            </button>
                        )}
                        {editable && (
                            <button
                                type="button"
                                className="action-btn delete"
                                title={t('delete', 'Delete')}
                                onClick={() => deleteTransfer(row.id)}
                            >
                                <span className="material-icons-outlined">delete</span>
                            </button>
                        )}
                    </div>
                );
            },
        },
    ], [rows, products, translations, pageErrors, formErrors]);

    const warehouseOptions = (warehouses || []).map((w) => ({
        value: String(w.id),
        label: w.name || '',
    }));
    const productOptions = (products || []).map((p) => ({
        value: String(p.id),
        label: p.name || '',
    }));

    const handleToolbarSearch = (searchText) => {
        router.get(getLocalizedRoute('admin.inventory.stock-transfers.index'), {
            search: searchText, page: 1,
        }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const handlePageChange = (page) => {
        router.get(getLocalizedRoute('admin.inventory.stock-transfers.index'), { ...filters, page }, {
            preserveState: true, preserveScroll: true, replace: true,
        });
    };

    const handlePerPageChange = (perPage) => {
        router.get(getLocalizedRoute('admin.inventory.stock-transfers.index'), { ...filters, page: 1, per_page: perPage }, {
            preserveState: true, preserveScroll: true, replace: true,
        });
    };

    return (
        <AdminLayout activeMenu={t('stock_transfers', 'Stock Transfers')}>
            <Head title={t('stock_transfers', 'Stock Transfers')} />

            <div className="stock-transfer-module">
                <div className="stock-transfer-module__header">
                    <div>
                        <h1>{t('stock_transfers', 'Stock Transfers')}</h1>
                        <p className="stock-transfer-module__subtitle">
                            {t('stock_transfers_subtitle', 'Move stock between warehouses — costs travel with the stock')}
                        </p>
                    </div>
                    <div className="stock-transfer-module__actions">
                        {mode !== 'create' && (
                            <button type="button" className="btn btn--primary" onClick={startCreate}>
                                + {t('new_transfer', 'New Transfer')}
                            </button>
                        )}
                    </div>
                </div>

                {(mergedErrors.general || mergedErrors['items']) && (
                    <div className="stock-transfer-module__alert stock-transfer-module__alert--error">
                        {mergedErrors.general || mergedErrors['items']}
                    </div>
                )}

                {mode === 'list' ? (
                    <div className="stock-transfer-module__table-container">
                        <Table
                            tableData={rows}
                            columns={columns}

                            currentPage={safeTransfers.current_page || 1}
                            totalPages={Math.max(1, Math.ceil((safeTransfers.total || 0) / (safeTransfers.per_page || 15)))}
                            totalRecords={safeTransfers.total || 0}
                            recordsPerPage={safeTransfers.per_page || 15}

                            onPageChange={handlePageChange}
                            onRecordsPerPageChange={handlePerPageChange}

                            serverSide={true}
                            showToolbar={true}
                            toolbarSearch={true}
                            toolbarSearchPlaceholder={t('search_transfers', 'Search transfers...')}
                            toolbarSearchValue={filters?.search || ''}
                            onToolbarSearch={handleToolbarSearch}
                        />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="stock-transfer-module__form">
                        <div className="stock-transfer-module__section">
                            <h3>{t('transfer_details', 'Transfer Details')}</h3>
                            <div className="stock-transfer-module__grid stock-transfer-module__grid--three">
                                <div className="form-group">
                                    <label>{t('date', 'Date')} <span className="required">*</span></label>
                                    <input
                                        type="date"
                                        value={data.movement_date}
                                        onChange={(e) => setData('movement_date', e.target.value)}
                                        className={mergedErrors.movement_date ? 'error' : ''}
                                    />
                                    {mergedErrors.movement_date && <span className="error-msg">{mergedErrors.movement_date}</span>}
                                </div>
                                <div className="form-group">
                                    <label>{t('from_warehouse', 'From Warehouse')} <span className="required">*</span></label>
                                    <SearchableComboBox
                                        options={warehouseOptions}
                                        value={data.from_warehouse_id ? String(data.from_warehouse_id) : ''}
                                        onChange={(val) => setData('from_warehouse_id', val)}
                                        placeholder={t('select_warehouse', 'Select source warehouse')}
                                    />
                                    {mergedErrors.from_warehouse_id && <span className="error-msg">{mergedErrors.from_warehouse_id}</span>}
                                </div>
                                <div className="form-group">
                                    <label>{t('to_warehouse', 'To Warehouse')} <span className="required">*</span></label>
                                    <SearchableComboBox
                                        options={warehouseOptions.filter((w) => String(w.value) !== String(data.from_warehouse_id))}
                                        value={data.to_warehouse_id ? String(data.to_warehouse_id) : ''}
                                        onChange={(val) => setData('to_warehouse_id', val)}
                                        placeholder={t('select_warehouse', 'Select destination warehouse')}
                                    />
                                    {mergedErrors.to_warehouse_id && <span className="error-msg">{mergedErrors.to_warehouse_id}</span>}
                                </div>
                            </div>
                            <div className="form-group">
                                <label>{t('notes', 'Notes')}</label>
                                <textarea
                                    rows={2}
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="stock-transfer-module__section">
                            <div className="stock-transfer-module__section-header">
                                <h3>{t('items', 'Items')}</h3>
                                <button type="button" className="btn btn--secondary btn--sm" onClick={addItem}>
                                    + {t('add_item', 'Add Item')}
                                </button>
                            </div>

                            <p className="stock-transfer-module__hint">
                                {t('transfer_hint', 'Quantities are entered in the selected unit and converted to the base unit on save. Saving applies the ledger immediately — edit/delete is only possible while the transfer has not touched costing.')}
                            </p>

                            {data.items.map((item, index) => (
                                <div key={index} className="stock-transfer-module__item-row">
                                    <div className="form-group">
                                        <label>{t('product', 'Product')} <span className="required">*</span></label>
                                        <SearchableComboBox
                                            options={productOptions}
                                            value={item.product_id ? String(item.product_id) : ''}
                                            onChange={(val) => updateItem(index, 'product_id', val)}
                                            placeholder={t('select_product', 'Select product')}
                                        />
                                        {mergedErrors[`items.${index}.product_id`] && (
                                            <span className="error-msg">{mergedErrors[`items.${index}.product_id`]}</span>
                                        )}
                                    </div>
                                    <div className="form-group">
                                        <label>{t('unit', 'Unit')} <span className="required">*</span></label>
                                        <select
                                            value={item.unit_id}
                                            onChange={(e) => updateItem(index, 'unit_id', e.target.value)}
                                        >
                                            <option value="">{t('select_unit', 'Select unit')}</option>
                                            {units.map((u) => (
                                                <option key={u.id} value={u.id}>{u.name}</option>
                                            ))}
                                        </select>
                                        {mergedErrors[`items.${index}.unit_id`] && (
                                            <span className="error-msg">{mergedErrors[`items.${index}.unit_id`]}</span>
                                        )}
                                    </div>
                                    <div className="form-group">
                                        <label>{t('quantity', 'Quantity')} <span className="required">*</span></label>
                                        <input
                                            type="number"
                                            step="any"
                                            min="0.001"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                            className={mergedErrors[`items.${index}.quantity`] ? 'error' : ''}
                                        />
                                        {mergedErrors[`items.${index}.quantity`] && (
                                            <span className="error-msg">{mergedErrors[`items.${index}.quantity`]}</span>
                                        )}
                                    </div>
                                    <button type="button" className="btn btn--danger btn--sm" onClick={() => removeItem(index)}>
                                        {t('remove', 'Remove')}
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="stock-transfer-module__form-actions">
                            <button type="button" className="btn btn--secondary" onClick={() => { setMode('list'); setEditing(null); }}>
                                {t('cancel', 'Back')}
                            </button>
                            <button type="submit" className="btn btn--primary" disabled={processing}>
                                {processing
                                    ? t('saving', 'Saving...')
                                    : (mode === 'edit' ? t('update_transfer', 'Update Transfer') : t('save_transfer', 'Save Transfer'))}
                            </button>
                        </div>
                    </form>
                )}

                {viewOpen && (
                    <div className="stock-transfer-module__modal-overlay" onClick={() => setViewOpen(false)}>
                        <div className="stock-transfer-module__modal" onClick={(e) => e.stopPropagation()}>
                            <div className="stock-transfer-module__modal-header">
                                <h2>
                                    {t('transfer', 'Transfer')}
                                    {' '}
                                    {transferView?.transfer?.voucher_num || ''}
                                </h2>
                                <button type="button" className="stock-transfer-module__modal-close" onClick={() => setViewOpen(false)}>×</button>
                            </div>

                            {viewError && (
                                <div className="stock-transfer-module__alert stock-transfer-module__alert--error">{viewError}</div>
                            )}

                            {viewLoading && (
                                <div className="stock-transfer-module__loading">{t('loading', 'Loading...')}</div>
                            )}

                            {!viewLoading && transferView && (
                                <>
                                    <div className="stock-transfer-module__modal-meta">
                                        <div>
                                            <strong>{t('date', 'Date')}:</strong> {formatDate(transferView.transfer.movement_date)}
                                        </div>
                                        <div>
                                            <strong>{t('from_warehouse', 'From')}:</strong> {transferView.transfer.from_warehouse?.name || '-'}
                                        </div>
                                        <div>
                                            <strong>{t('to_warehouse', 'To')}:</strong> {transferView.transfer.to_warehouse?.name || '-'}
                                        </div>
                                        <div>
                                            <strong>{t('status', 'Status')}:</strong>{' '}
                                            {transferView.cancelled
                                                ? <span className="badge badge-danger">{t('cancelled', 'Cancelled')}</span>
                                                : <span className="badge badge-success">{t('applied', 'Applied')}</span>}
                                        </div>
                                    </div>

                                    <table className="stock-transfer-module__table">
                                        <thead>
                                            <tr>
                                                <th>{t('product', 'Product')}</th>
                                                <th className="text-end">{t('quantity', 'Quantity (base)')}</th>
                                                <th className="text-end">{t('original_quantity', 'Entered')}</th>
                                                <th className="text-end">{t('unit_cost', 'Unit Cost')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(transferView.lines || []).map((line) => (
                                                <tr key={line.id}>
                                                    <td>
                                                        {products.find((p) => String(p.id) === String(line.product_id))?.name
                                                            || `#${line.product_id}`}
                                                    </td>
                                                    <td className="text-end">{Number(line.quantity).toLocaleString()}</td>
                                                    <td className="text-end">
                                                        {line.original_quantity != null ? Number(line.original_quantity).toLocaleString() : '-'}
                                                    </td>
                                                    <td className="text-end">{Number(line.cost_price || 0).toFixed(3)}</td>
                                                </tr>
                                            ))}
                                            {(transferView.lines || []).length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="text-center">
                                                        {t('no_lines', 'No lines recorded.')}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </>
                            )}

                            {!viewLoading && !transferView && !viewError && (
                                <div className="stock-transfer-module__empty">
                                    {t('select_transfer_prompt', 'Select a transfer to view its details.')}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
