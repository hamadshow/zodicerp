import React, { useState, useMemo } from 'react';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import SearchableComboBox from '../components/SearchableComboBox';
import Table from '../components/Table';
import { formatDate } from '@/utils/date';

/**
 * Stock Adjustments (Phase 4 rebuild).
 *
 * Follows the OpeningStock page conventions: AdminLayout shell, shared
 * serverSide Table, useForm (Inertia handles CSRF), localized labels, BEM
 * module classes, loading/empty/error states. Stock card is an Inertia
 * partial-reload modal — no raw fetch.
 */
export default function StockAdjustment({ adjustments, warehouses = [], products = [], units = [], filters = {}, stockCard = null }) {
    const [mode, setMode] = useState('list');
    const [stockCardOpen, setStockCardOpen] = useState(false);
    const [stockCardProduct, setStockCardProduct] = useState('');
    const [stockCardWarehouse, setStockCardWarehouse] = useState('');
    const [stockCardLoading, setStockCardLoading] = useState(false);
    const [stockCardError, setStockCardError] = useState('');

    const { props } = usePage();
    const { localization, errors = {} } = props;
    const translations = localization?.translations || {};

    const t = (key, fallback) =>
        translations[key] || translations[`stock_adjustment.${key}`] || translations[`common.${key}`] || fallback;

    const getLocalizedRoute = (name, params = {}) =>
        route(name, {
            country: localization?.country_code || 'sa',
            lang: localization?.current_locale || 'ar',
            ...params,
        });

    const safeAdjustments = adjustments || {
        data: [], total: 0, per_page: 15, current_page: 1,
    };

    const statusBadge = (status) => {
        const map = {
            draft: 'badge-secondary',
            approved: 'badge-success',
            cancelled: 'badge-danger',
        };
        return map[status] || 'badge-secondary';
    };

    const reasonOptions = [
        { value: 'correction', label: t('reason_correction', 'Correction') },
        { value: 'damage', label: t('reason_damage', 'Damage') },
        { value: 'expiring', label: t('reason_expiring', 'Expiring') },
        { value: 'found', label: t('reason_found', 'Found') },
        { value: 'lost', label: t('reason_lost', 'Lost') },
        { value: 'theft', label: t('reason_theft', 'Theft') },
        { value: 'count', label: t('reason_count', 'Count Difference') },
        { value: 'other', label: t('reason_other', 'Other') },
    ];

    const { data, setData, post, processing, reset, errors: formErrors } = useForm({
        warehouse_id: '',
        adjustment_date: new Date().toISOString().split('T')[0],
        reason: 'correction',
        description: '',
        items: [
            { product_id: '', unit_id: '', adjustment_quantity: 0, unit_cost: 0, reason: '', notes: '' },
        ],
    });

    const mergedErrors = { ...errors, ...formErrors };

    const addItem = () =>
        setData('items', [
            ...data.items,
            { product_id: '', unit_id: '', adjustment_quantity: 0, unit_cost: 0, reason: '', notes: '' },
        ]);

    const removeItem = (index) => {
        const items = data.items.filter((_, i) => i !== index);
        setData('items', items.length ? items : [{ product_id: '', unit_id: '', adjustment_quantity: 0, unit_cost: 0, reason: '', notes: '' }]);
    };

    const updateItem = (index, field, value) => {
        const items = data.items.map((item, i) => {
            if (i !== index) return item;
            const next = { ...item, [field]: value };
            if (field === 'product_id') {
                const product = products.find((p) => String(p.id) === String(value));
                if (product) {
                    next.unit_id = product.unit_id || '';
                    next.unit_cost = product.cost_per_item || 0;
                }
            }
            return next;
        });
        setData('items', items);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post(getLocalizedRoute('admin.inventory.stock-adjustments.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setMode('list');
                reset();
            },
        });
    };

    const approveAdjustment = (id) => {
        if (window.confirm(t('confirm_approve', 'Approve this adjustment? This will modify stock and cost ledgers.'))) {
            router.post(getLocalizedRoute('admin.inventory.stock-adjustments.approve', { id }), {}, { preserveScroll: true });
        }
    };

    const cancelAdjustment = (id) => {
        if (window.confirm(t('confirm_cancel', 'Cancel this adjustment? Approved adjustments will be reversed from the ledgers.'))) {
            router.post(getLocalizedRoute('admin.inventory.stock-adjustments.cancel', { id }), {}, { preserveScroll: true });
        }
    };

    const deleteAdjustment = (id) => {
        if (window.confirm(t('confirm_delete', 'Delete this draft adjustment?'))) {
            router.delete(getLocalizedRoute('admin.inventory.stock-adjustments.destroy', { id }), { preserveScroll: true });
        }
    };

    /**
     * Stock card lives on the INDEX route as the 'stockCard' prop. Partial
     * reload keeps the page mounted (routing to the JSON stock-card endpoint
     * would replace the page). Both params go in one request — no setTimeout
     * state-race around the warehouse select.
     */
    const loadStockCard = (productId, warehouseId = stockCardWarehouse) => {
        setStockCardProduct(productId);
        setStockCardWarehouse(warehouseId);
        setStockCardError('');
        if (!productId) return;

        setStockCardLoading(true);
        router.get(
            getLocalizedRoute('admin.inventory.stock-adjustments.index'),
            {
                stock_card_product: productId,
                stock_card_warehouse: warehouseId || undefined,
            },
            {
                only: ['stockCard'],
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onFinish: () => setStockCardLoading(false),
                onError: () => {
                    setStockCardError(t('stock_card_error', 'Failed to load the stock card.'));
                },
            }
        );
    };

    // Prop-driven rows: the partial reload swaps the 'stockCard' prop and the
    // modal renders it — no local mirror state to desynchronize.
    const stockCardRows = stockCard || [];

    const columns = useMemo(() => [
        {
            header: t('adjustment_number', 'Adjustment #'),
            key: 'adjustment_number',
            sortable: true,
            render: (row) => <span className="stock-adjustment-module__number">{row.adjustment_number}</span>,
        },
        {
            header: t('date', 'Date'),
            key: 'adjustment_date',
            sortable: true,
            render: (row) => (row.adjustment_date ? formatDate(row.adjustment_date) : '-'),
        },
        {
            header: t('reason', 'Reason'),
            key: 'reason',
            render: (row) => {
                const match = reasonOptions.find((r) => r.value === row.reason);
                return match ? match.label : row.reason;
            },
        },
        {
            header: t('warehouse', 'Warehouse'),
            key: 'warehouse_id',
            render: (row) => warehouses.find((w) => String(w.id) === String(row.warehouse_id))?.name_ar || '-',
        },
        {
            header: t('items', 'Items'),
            key: 'items_count',
            render: (row) => (row.items_count ?? '-'),
        },
        {
            header: t('status', 'Status'),
            key: 'status',
            render: (row) => (
                <span className={`badge ${statusBadge(row.status)}`}>
                    {t(`status_${row.status}`, row.status)}
                </span>
            ),
        },
        {
            header: t('actions', 'Actions'),
            key: 'actions',
            sortable: false,
            render: (row) => (
                <div className="stock-adjustment-module__row-actions">
                    {row.status === 'draft' && (
                        <button
                            type="button"
                            className="action-btn success"
                            title={t('approve', 'Approve')}
                            onClick={() => approveAdjustment(row.id)}
                        >
                            <span className="material-icons-outlined">check_circle</span>
                        </button>
                    )}
                    {(row.status === 'draft' || row.status === 'approved') && (
                        <button
                            type="button"
                            className="action-btn"
                            title={t('cancel_adjustment', 'Cancel')}
                            onClick={() => cancelAdjustment(row.id)}
                        >
                            <span className="material-icons-outlined">undo</span>
                        </button>
                    )}
                    {row.status === 'draft' && (
                        <button
                            type="button"
                            className="action-btn delete"
                            title={t('delete', 'Delete')}
                            onClick={() => deleteAdjustment(row.id)}
                        >
                            <span className="material-icons-outlined">delete</span>
                        </button>
                    )}
                </div>
            ),
        },
    ], [warehouses, translations]);

    const breadcrumbs = [
        { label: t('sidebar.Dashboard', 'Dashboard'), href: getLocalizedRoute('admin.dashboard') },
        { label: t('sidebar.inventory', 'Inventory'), onClick: (e) => { e.preventDefault(); setMode('list'); } },
        { label: t('stock_adjustments', 'Stock Adjustments') },
    ];
    if (mode === 'create') breadcrumbs.push({ label: t('common.create', 'Create') });

    const warehouseOptions = (warehouses || []).map((w) => ({
        value: String(w.id),
        label: w.name_ar || w.name || '',
    }));
    const productOptions = (products || []).map((p) => ({
        value: String(p.id),
        label: p.name_ar || p.name || '',
    }));

    const handleToolbarSearch = (searchText) => {
        router.get(getLocalizedRoute('admin.inventory.stock-adjustments.index'), {
            ...filters, search: searchText, page: 1,
        }, { preserveState: true, preserveScroll: true, replace: true });
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
        router.get(getLocalizedRoute('admin.inventory.stock-adjustments.index'), params, {
            preserveState: true, preserveScroll: true, replace: true,
        });
    };

    const handlePageChange = (page) => {
        router.get(getLocalizedRoute('admin.inventory.stock-adjustments.index'), { ...filters, page }, {
            preserveState: true, preserveScroll: true, replace: true,
        });
    };

    const handlePerPageChange = (perPage) => {
        router.get(getLocalizedRoute('admin.inventory.stock-adjustments.index'), { ...filters, page: 1, per_page: perPage }, {
            preserveState: true, preserveScroll: true, replace: true,
        });
    };

    return (
        <AdminLayout activeMenu={t('stock_adjustments', 'Stock Adjustments')}>
            <Head title={t('stock_adjustments', 'Stock Adjustments')} />

            <div className="stock-adjustment-module">
                <div className="stock-adjustment-module__header">
                    <div>
                        <h1>{t('stock_adjustments', 'Stock Adjustments')}</h1>
                        <p className="stock-adjustment-module__subtitle">
                            {t('stock_adjustments_subtitle', 'Corrections, damages and count differences — fully ledgered')}
                        </p>
                    </div>
                    <div className="stock-adjustment-module__actions">
                        <button
                            type="button"
                            className="btn btn--secondary"
                            onClick={() => { setStockCardOpen(true); }}
                        >
                            {t('stock_card', 'Stock Card')}
                        </button>
                        {mode !== 'create' && (
                            <button
                                type="button"
                                className="btn btn--primary"
                                onClick={() => { reset(); setMode('create'); }}
                            >
                                + {t('new_adjustment', 'New Adjustment')}
                            </button>
                        )}
                    </div>
                </div>

                {mergedErrors.general && (
                    <div className="stock-adjustment-module__alert stock-adjustment-module__alert--error">
                        {mergedErrors.general}
                    </div>
                )}

                {mode === 'list' ? (
                    <div className="stock-adjustment-module__table-container">
                        <Table
                            tableData={safeAdjustments.data || []}
                            columns={columns}

                            currentPage={safeAdjustments.current_page || 1}
                            totalPages={Math.max(1, Math.ceil((safeAdjustments.total || 0) / (safeAdjustments.per_page || 15)))}
                            totalRecords={safeAdjustments.total || 0}
                            recordsPerPage={safeAdjustments.per_page || 15}

                            onPageChange={handlePageChange}
                            onRecordsPerPageChange={handlePerPageChange}

                            serverSide={true}
                            onSort={handleServerSort}
                            sortKey={filters?.sort_by || null}
                            sortDirection={filters?.sort_dir || null}

                            showToolbar={true}
                            toolbarSearch={true}
                            toolbarSearchPlaceholder={t('search_adjustments', 'Search adjustments...')}
                            toolbarSearchValue={filters?.search || ''}
                            onToolbarSearch={handleToolbarSearch}

                        />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="stock-adjustment-module__form">
                        <div className="stock-adjustment-module__section">
                            <h3>{t('adjustment_details', 'Adjustment Details')}</h3>
                            <div className="stock-adjustment-module__grid stock-adjustment-module__grid--three">
                                <div className="form-group">
                                    <label>{t('warehouse', 'Warehouse')} <span className="required">*</span></label>
                                    <SearchableComboBox
                                        options={warehouseOptions}
                                        value={data.warehouse_id ? String(data.warehouse_id) : ''}
                                        onChange={(val) => setData('warehouse_id', val)}
                                        placeholder={t('select_warehouse', 'Select warehouse')}
                                    />
                                    {mergedErrors.warehouse_id && <span className="error-msg">{mergedErrors.warehouse_id}</span>}
                                </div>
                                <div className="form-group">
                                    <label>{t('date', 'Date')} <span className="required">*</span></label>
                                    <input
                                        type="date"
                                        value={data.adjustment_date}
                                        onChange={(e) => setData('adjustment_date', e.target.value)}
                                        className={mergedErrors.adjustment_date ? 'error' : ''}
                                    />
                                    {mergedErrors.adjustment_date && <span className="error-msg">{mergedErrors.adjustment_date}</span>}
                                </div>
                                <div className="form-group">
                                    <label>{t('reason', 'Reason')} <span className="required">*</span></label>
                                    <select
                                        value={data.reason}
                                        onChange={(e) => setData('reason', e.target.value)}
                                        className={mergedErrors.reason ? 'error' : ''}
                                    >
                                        {reasonOptions.map((r) => (
                                            <option key={r.value} value={r.value}>{r.label}</option>
                                        ))}
                                    </select>
                                    {mergedErrors.reason && <span className="error-msg">{mergedErrors.reason}</span>}
                                </div>
                            </div>
                            <div className="form-group">
                                <label>{t('description', 'Description')}</label>
                                <textarea
                                    rows={2}
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="stock-adjustment-module__section">
                            <div className="stock-adjustment-module__section-header">
                                <h3>{t('items', 'Items')}</h3>
                                <button type="button" className="btn btn--secondary btn--sm" onClick={addItem}>
                                    + {t('add_item', 'Add Item')}
                                </button>
                            </div>

                            {mergedErrors.items && (
                                <div className="stock-adjustment-module__alert stock-adjustment-module__alert--error">
                                    {mergedErrors.items}
                                </div>
                            )}

                            {data.items.map((item, index) => (
                                <div key={index} className="stock-adjustment-module__item-row">
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
                                                <option key={u.id} value={u.id}>{u.name_ar || u.name}</option>
                                            ))}
                                        </select>
                                        {mergedErrors[`items.${index}.unit_id`] && (
                                            <span className="error-msg">{mergedErrors[`items.${index}.unit_id`]}</span>
                                        )}
                                    </div>
                                    <div className="form-group">
                                        <label>{t('quantity', 'Quantity (+/-)')} <span className="required">*</span></label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            value={item.adjustment_quantity}
                                            onChange={(e) => updateItem(index, 'adjustment_quantity', e.target.value)}
                                            className={mergedErrors[`items.${index}.adjustment_quantity`] ? 'error' : ''}
                                        />
                                        {mergedErrors[`items.${index}.adjustment_quantity`] && (
                                            <span className="error-msg">{mergedErrors[`items.${index}.adjustment_quantity`]}</span>
                                        )}
                                    </div>
                                    <div className="form-group">
                                        <label>{t('unit_cost', 'Unit Cost')}</label>
                                        <input
                                            type="number"
                                            step="0.0001"
                                            min="0"
                                            value={item.unit_cost}
                                            onChange={(e) => updateItem(index, 'unit_cost', e.target.value)}
                                        />
                                    </div>
                                    <button type="button" className="btn btn--danger btn--sm" onClick={() => removeItem(index)}>
                                        {t('remove', 'Remove')}
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="stock-adjustment-module__form-actions">
                            <button type="button" className="btn btn--secondary" onClick={() => setMode('list')}>
                                {t('cancel', 'Cancel')}
                            </button>
                            <button type="submit" className="btn btn--primary" disabled={processing}>
                                {processing ? t('saving', 'Saving...') : t('create_adjustment', 'Create Adjustment')}
                            </button>
                        </div>
                    </form>
                )}

                {stockCardOpen && (
                    <div className="stock-adjustment-module__modal-overlay" onClick={() => setStockCardOpen(false)}>
                        <div className="stock-adjustment-module__modal" onClick={(e) => e.stopPropagation()}>
                            <div className="stock-adjustment-module__modal-header">
                                <h2>{t('stock_card', 'Stock Card')}</h2>
                                <button type="button" className="stock-adjustment-module__modal-close" onClick={() => setStockCardOpen(false)}>×</button>
                            </div>

                            <div className="stock-adjustment-module__modal-filters">
                                <div className="form-group">
                                    <label>{t('product', 'Product')}</label>
                                    <SearchableComboBox
                                        options={productOptions}
                                        value={stockCardProduct ? String(stockCardProduct) : ''}
                                        onChange={loadStockCard}
                                        placeholder={t('select_product', 'Select product')}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>{t('warehouse', 'Warehouse')}</label>
                                    <select
                                        value={stockCardWarehouse}
                                        onChange={(e) => {
                                            if (stockCardProduct) {
                                                loadStockCard(stockCardProduct, e.target.value);
                                            } else {
                                                setStockCardWarehouse(e.target.value);
                                            }
                                        }}
                                    >
                                        <option value="">{t('all_warehouses', 'All warehouses')}</option>
                                        {warehouses.map((w) => (
                                            <option key={w.id} value={w.id}>{w.name_ar || w.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {stockCardError && (
                                <div className="stock-adjustment-module__alert stock-adjustment-module__alert--error">
                                    {stockCardError}
                                </div>
                            )}

                            {stockCardLoading && (
                                <div className="stock-adjustment-module__loading">{t('loading', 'Loading...')}</div>
                            )}

                            {!stockCardLoading && stockCardRows.length > 0 && (
                                <table className="stock-adjustment-module__table">
                                    <thead>
                                        <tr>
                                            <th>{t('date', 'Date')}</th>
                                            <th>{t('type', 'Type')}</th>
                                            <th>{t('reference', 'Reference')}</th>
                                            <th className="text-end">{t('in', 'In')}</th>
                                            <th className="text-end">{t('out', 'Out')}</th>
                                            <th className="text-end">{t('unit_cost', 'Unit Cost')}</th>
                                            <th className="text-end">{t('balance', 'Balance')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stockCardRows.map((row, idx) => (
                                            <tr key={idx}>
                                                <td>{row.date ? formatDate(row.date) : '-'}</td>
                                                <td>{row.type}</td>
                                                <td>{row.reference}</td>
                                                <td className="text-end text-success">{row.quantity_in > 0 ? Number(row.quantity_in).toLocaleString() : ''}</td>
                                                <td className="text-end text-danger">{row.quantity_out > 0 ? Number(row.quantity_out).toLocaleString() : ''}</td>
                                                <td className="text-end">{Number(row.unit_cost || 0).toFixed(3)}</td>
                                                <td className="text-end">{Number(row.balance).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {!stockCardLoading && stockCardProduct && stockCardRows.length === 0 && (
                                <div className="stock-adjustment-module__empty">
                                    {t('no_movements', 'No movements found for this selection.')}
                                </div>
                            )}
                            {!stockCardProduct && !stockCardLoading && (
                                <div className="stock-adjustment-module__empty">
                                    {t('select_product_prompt', 'Select a product to view its stock card.')}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
