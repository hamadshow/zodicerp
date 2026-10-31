import React, { useEffect, useMemo, useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import SearchableComboBox from '../components/SearchableComboBox';
import BlankPage from '@/Components/BlankPage';
import { formatDate } from '@/utils/date';

const STATUSES = ['draft', 'received', 'checked', 'approved', 'cancelled'];
const RECEIPT_TYPES = ['partial', 'full', 'return_receipt'];
const QUALITY_STATUSES = ['good', 'damaged', 'expired', 'defective'];

const ARABIC_LABELS = {
    'Goods Receipts In': 'إيصالات استلام البضائع',
    'Purchases': 'المشتريات',
    'Record, inspect and post goods received against purchase orders.': 'سجل وافحص واعتمد البضائع المستلمة مقابل أوامر الشراء.',
    'New Receipt': 'إيصال جديد',
    'Create Receipt': 'إنشاء إيصال',
    'Edit Receipt': 'تعديل الإيصال',
    'Receipt details': 'بيانات الإيصال',
    'Receipt number': 'رقم الإيصال',
    'Purchase Order': 'أمر الشراء',
    'Select purchase order': 'اختر أمر الشراء',
    'Supplier': 'المورد',
    'Warehouse': 'المستودع',
    'Select warehouse': 'اختر المستودع',
    'Receipt date': 'تاريخ الاستلام',
    'Receipt time': 'وقت الاستلام',
    'Receipt type': 'نوع الاستلام',
    'partial': 'جزئي',
    'full': 'كامل',
    'return receipt': 'استلام مرتجع',
    'Items': 'الأصناف',
    'Add item': 'إضافة صنف',
    'Product': 'المنتج',
    'Select product': 'اختر المنتج',
    'Unit': 'الوحدة',
    'Select unit': 'اختر الوحدة',
    'PO quantity': 'كمية أمر الشراء',
    'Received quantity': 'الكمية المستلمة',
    'Accepted': 'المقبول',
    'Rejected': 'المرفوض',
    'Unit cost': 'تكلفة الوحدة',
    'Line value': 'قيمة الصنف',
    'Quality': 'الجودة',
    'good': 'جيد',
    'damaged': 'تالف',
    'expired': 'منتهي الصلاحية',
    'defective': 'معيب',
    'Batch number': 'رقم الدفعة',
    'Serial number': 'الرقم التسلسلي',
    'Production date': 'تاريخ الإنتاج',
    'Expiry date': 'تاريخ الانتهاء',
    'Shelf location': 'موقع التخزين',
    'Quality notes': 'ملاحظات الجودة',
    'Rejection reason': 'سبب الرفض',
    'Line notes': 'ملاحظات الصنف',
    'Receipt notes': 'ملاحظات الإيصال',
    'Inspection notes': 'ملاحظات الفحص',
    'Summary': 'الملخص',
    'Lines': 'الأسطر',
    'Total received': 'إجمالي المستلم',
    'Total value': 'القيمة الإجمالية',
    'Search receipts': 'البحث في الإيصالات',
    'All statuses': 'كل الحالات',
    'Apply filters': 'تطبيق التصفية',
    'Reference': 'المرجع',
    'Date': 'التاريخ',
    'Status': 'الحالة',
    'Value': 'القيمة',
    'Actions': 'الإجراءات',
    'View': 'عرض',
    'Edit': 'تعديل',
    'Delete': 'حذف',
    'Receive': 'استلام',
    'Approve': 'اعتماد',
    'Cancel receipt': 'إلغاء الإيصال',
    'Reverse': 'عكس القيد',
    'No goods receipts found.': 'لا توجد إيصالات استلام.',
    'No items have been added.': 'لم تتم إضافة أصناف.',
    'Select a purchase order to load its pending product lines.': 'اختر أمر شراء لتحميل الأصناف المتبقية.',
    'No eligible product lines are available for this order.': 'لا توجد أصناف منتجات متاحة لهذا الأمر.',
    'No valid units are configured for this product.': 'لا توجد وحدات صالحة لهذا المنتج.',
    'Saving...': 'جارٍ الحفظ...',
    'Save receipt': 'حفظ الإيصال',
    'Update receipt': 'تحديث الإيصال',
    'Cancel': 'إلغاء',
    'Back to receipts': 'العودة إلى الإيصالات',
    'Previous': 'السابق',
    'Next': 'التالي',
    'Showing': 'عرض',
    'of': 'من',
    'records': 'سجل',
    'Page size': 'عدد السجلات',
    'Draft': 'مسودة',
    'Received': 'مستلم',
    'Checked': 'تم الفحص',
    'Approved': 'معتمد',
    'Cancelled': 'ملغي',
    'Quality status': 'حالة الجودة',
    'Pending': 'قيد الانتظار',
    'Passed': 'ناجح',
    'Failed': 'راسب',
    'Partial': 'جزئي',
    'Created by': 'أنشأه',
    'pending': 'قيد الانتظار',
    'passed': 'ناجح',
    'failed': 'راسب',
    'Accepted quantity and rejected quantity must equal received quantity.': 'يجب أن يساوي مجموع الكمية المقبولة والمرفوضة الكمية المستلمة.',
    'Only draft receipts can be edited.': 'يمكن تعديل الإيصالات المسودة فقط.',
    'Confirm delete': 'هل تريد حذف هذا الإيصال؟',
    'Confirm approve': 'اعتماد هذا الإيصال سيحدّث المخزون. هل تريد المتابعة؟',
    'Confirm reverse': 'سيتم عكس حركة المخزون. هل تريد المتابعة؟',
    'Please review the highlighted fields and try again.': 'يرجى مراجعة الحقول المحددة والمحاولة مرة أخرى.',
    'Accepted and rejected quantities must add up to the received quantity.': 'يجب أن يساوي مجموع الكمية المقبولة والمرفوضة الكمية المستلمة.',
};

const today = () => {
    const date = new Date();
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - (offset * 60 * 1000)).toISOString().slice(0, 10);
};

const emptyItem = (source = null) => {
    const pending = source
        ? Number(source.pending_quantity ?? source.ordered_quantity ?? 0)
        : 0;
    const quantity = Math.max(0, pending);
    const sourceUnitId = source?.unit_id ? String(source.unit_id) : '';
    const firstUnitId = source?.unit_options?.[0]?.id ? String(source.unit_options[0].id) : sourceUnitId;

    return {
        row_key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        purchase_order_item_id: source?.id ? String(source.id) : '',
        invoice_detail_id: '',
        product_id: source?.product_id ? String(source.product_id) : '',
        unit_id: sourceUnitId || firstUnitId,
        quantity_received: quantity,
        accepted_quantity: quantity,
        rejected_quantity: 0,
        unit_cost: Number(source?.unit_price || 0),
        quality_status: 'good',
        batch_number: '',
        serial_number: '',
        production_date: '',
        expiry_date: '',
        shelf_location: '',
        quality_notes: '',
        rejection_reason: '',
        notes: '',
    };
};

const emptyReceipt = () => ({
    order_id: '',
    invoice_id: '',
    warehouse_id: '',
    receipt_date: today(),
    receipt_time: new Date().toTimeString().slice(0, 5),
    receipt_type: 'partial',
    notes: '',
    inspection_notes: '',
    items: [],
});

const numberValue = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

export default function GoodsReceipt({
    receipts = {},
    purchaseOrders = [],
    warehouses = [],
    filters = {},
    initialMode = 'list',
    selectedReceipt = null,
}) {
    const { props } = usePage();
    const localization = props.localization || {};
    const translations = localization.translations || {};
    const locale = localization.current_locale || 'en';
    const isArabic = String(locale).startsWith('ar');
    const isRtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
    const flash = props.flash || {};
    const { errors: pageErrors = {} } = props;
    const text = (value) => translations[value]
        || translations[`goods_receipts.${value}`]
        || translations[`common.${value}`]
        || (isArabic ? ARABIC_LABELS[value] || value : value);
    const routeFor = (name, parameters = {}) => route(name, {
        country: localization.country_code || 'eg',
        lang: localization.current_locale || 'en',
        ...parameters,
    });

    const [mode, setMode] = useState(initialMode);
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [expandedRows, setExpandedRows] = useState({});
    const {
        data,
        setData,
        post,
        put,
        processing,
        errors,
    } = useForm(emptyReceipt());

    useEffect(() => {
        setMode(initialMode);
        if (selectedReceipt) {
            const orderId = String(selectedReceipt.order_id || '');
            const order = purchaseOrders.find((entry) => String(entry.id) === orderId);
            const orderItems = order?.items || [];
            setData({
                order_id: orderId,
                invoice_id: selectedReceipt.invoice_id ? String(selectedReceipt.invoice_id) : '',
                warehouse_id: selectedReceipt.warehouse_id ? String(selectedReceipt.warehouse_id) : '',
                receipt_date: selectedReceipt.receipt_date?.slice(0, 10) || today(),
                receipt_time: selectedReceipt.receipt_time?.slice(0, 5) || '',
                receipt_type: selectedReceipt.receipt_type || 'partial',
                notes: selectedReceipt.notes || '',
                inspection_notes: selectedReceipt.inspection_notes || '',
                items: (selectedReceipt.details || []).map((detail) => {
                    const match = orderItems.find((item) => (
                        String(item.product_id) === String(detail.product_id)
                        && String(item.unit_id) === String(detail.unit_id)
                    )) || orderItems.find((item) => String(item.product_id) === String(detail.product_id));
                    return {
                        ...emptyItem(match || null),
                        row_key: String(detail.id),
                        purchase_order_item_id: match?.id ? String(match.id) : '',
                        invoice_detail_id: detail.invoice_detail_id ? String(detail.invoice_detail_id) : '',
                        product_id: detail.product_id ? String(detail.product_id) : '',
                        unit_id: detail.unit_id ? String(detail.unit_id) : '',
                        quantity_received: numberValue(detail.quantity_received),
                        accepted_quantity: numberValue(detail.accepted_quantity),
                        rejected_quantity: numberValue(detail.rejected_quantity),
                        unit_cost: numberValue(detail.unit_cost),
                        quality_status: detail.quality_status || 'good',
                        batch_number: detail.batch_number || '',
                        serial_number: detail.serial_number || '',
                        production_date: detail.production_date?.slice(0, 10) || '',
                        expiry_date: detail.expiry_date?.slice(0, 10) || '',
                        shelf_location: detail.shelf_location || '',
                        quality_notes: detail.quality_notes || '',
                        rejection_reason: detail.rejection_reason || '',
                        notes: detail.notes || '',
                    };
                }),
            });
        } else if (initialMode === 'list') {
            setData(emptyReceipt());
        }
    }, [selectedReceipt, initialMode, purchaseOrders]);

    useEffect(() => {
        setSearch(filters.search || '');
        setStatusFilter(filters.status || '');
    }, [filters.search, filters.status]);

    const receiptPage = Array.isArray(receipts)
        ? { data: receipts, current_page: 1, last_page: 1, total: receipts.length, per_page: 25, from: 1, to: receipts.length }
        : receipts;
    const receiptRows = receiptPage.data || [];
    const currentOrder = purchaseOrders.find((order) => String(order.id) === String(data.order_id));
    const orderItems = (currentOrder?.items || []).filter((item) => item.product_id);
    const warehouseOptions = useMemo(() => warehouses.map((warehouse) => ({
        value: String(warehouse.id),
        label: warehouse.name_en || warehouse.name_ar || warehouse.name || `#${warehouse.id}`,
    })), [warehouses]);
    const purchaseOrderOptions = useMemo(() => purchaseOrders.map((order) => ({
        value: String(order.id),
        label: `${order.po_number || `PO-${order.id}`} · ${order.vendor?.name_en || order.vendor?.name_ar || ''}`,
    })), [purchaseOrders]);

    const summary = useMemo(() => data.items.reduce((totals, item) => {
        const quantity = numberValue(item.quantity_received);
        totals.quantity += quantity;
        totals.value += quantity * numberValue(item.unit_cost);
        return totals;
    }, { quantity: 0, value: 0 }), [data.items]);

    const breadcrumbs = [
        { label: translations['sidebar.Dashboard'] || 'Dashboard', href: routeFor('admin.dashboard') },
        { label: translations['sidebar.purchases'] || 'Purchases' },
        { label: text('Goods Receipts In'), onClick: (event) => { event.preventDefault(); returnToList(); } },
        ...(mode === 'create' ? [{ label: text('Create Receipt') }] : []),
        ...(mode === 'edit' ? [{ label: text('Edit Receipt') }] : []),
        ...(mode === 'view' ? [{ label: selectedReceipt?.receipt_number || text('View') }] : []),
    ];

    function returnToList() {
        router.get(routeFor('admin.purchases.goods-receipts.index'), {}, {
            preserveScroll: true,
        });
    }

    const startCreate = () => {
        setData(emptyReceipt());
        setExpandedRows({});
        setMode('create');
    };

    const changeOrder = (orderId) => {
        const order = purchaseOrders.find((entry) => String(entry.id) === String(orderId));
        const items = (order?.items || [])
            .filter((item) => item.product_id && item.unit_id && Number(item.pending_quantity ?? item.ordered_quantity) > 0)
            .map((item) => emptyItem(item));
        setData((previous) => ({
            ...previous,
            order_id: orderId,
            items,
        }));
        setExpandedRows({});
    };

    const updateRow = (index, key, value) => {
        setData((previous) => ({
            ...previous,
            items: previous.items.map((item, rowIndex) => (
                rowIndex === index ? { ...item, [key]: value } : item
            )),
        }));
    };

    const selectOrderItem = (index, orderItemId) => {
        const source = orderItems.find((item) => String(item.id) === String(orderItemId));
        setData((previous) => ({
            ...previous,
            items: previous.items.map((item, rowIndex) => (
                rowIndex === index ? { ...emptyItem(source || null), row_key: item.row_key } : item
            )),
        }));
    };

    const changeUnit = (index, unitId) => {
        const row = data.items[index];
        const source = orderItems.find((item) => String(item.id) === String(row.purchase_order_item_id));
        const options = source?.unit_options || [];
        const previousFactor = numberValue(options.find((unit) => String(unit.id) === String(row.unit_id))?.conversion_factor) || 1;
        const nextFactor = numberValue(options.find((unit) => String(unit.id) === String(unitId))?.conversion_factor) || 1;
        const adjustedCost = previousFactor > 0
            ? numberValue(row.unit_cost) * (nextFactor / previousFactor)
            : numberValue(row.unit_cost);
        setData((previous) => ({
            ...previous,
            items: previous.items.map((item, rowIndex) => (
                rowIndex === index
                    ? { ...item, unit_id: unitId, unit_cost: Number(adjustedCost.toFixed(4)) }
                    : item
            )),
        }));
    };

    const addRow = () => {
        setData((previous) => ({ ...previous, items: [...previous.items, emptyItem()] }));
    };

    const removeRow = (index) => {
        setData((previous) => ({
            ...previous,
            items: previous.items.filter((_, rowIndex) => rowIndex !== index),
        }));
    };

    const updateQuantity = (index, key, rawValue) => {
        const value = Math.max(0, numberValue(rawValue));
        setData((previous) => ({
            ...previous,
            items: previous.items.map((item, rowIndex) => {
                if (rowIndex !== index) return item;
                const next = { ...item, [key]: value };
                if (key === 'quantity_received') {
                    next.accepted_quantity = Math.min(numberValue(item.accepted_quantity), value);
                    next.rejected_quantity = value - next.accepted_quantity;
                } else if (key === 'accepted_quantity') {
                    next.accepted_quantity = Math.min(value, numberValue(item.quantity_received));
                    next.rejected_quantity = numberValue(item.quantity_received) - next.accepted_quantity;
                } else {
                    next.rejected_quantity = Math.min(value, numberValue(item.quantity_received));
                    next.accepted_quantity = numberValue(item.quantity_received) - next.rejected_quantity;
                }
                return next;
            }),
        }));
    };

    const itemOptions = (index) => {
        const selectedByOtherRows = new Set(data.items
            .filter((_, rowIndex) => rowIndex !== index)
            .map((item) => String(item.purchase_order_item_id))
            .filter(Boolean));
        const selectedId = String(data.items[index]?.purchase_order_item_id || '');
        return orderItems
            .filter((item) => (
                (Number(item.pending_quantity ?? item.ordered_quantity) > 0 || String(item.id) === selectedId)
                && (!selectedByOtherRows.has(String(item.id)) || String(item.id) === selectedId)
            ))
            .map((item) => ({
                value: String(item.id),
                label: `${item.display_name || item.item_name_en || item.item_name_ar || `Product ${item.product_id}`}${item.product?.sku ? ` (${item.product.sku})` : ''}`,
            }));
    };

    const applyFilters = (event) => {
        event.preventDefault();
        router.get(routeFor('admin.purchases.goods-receipts.index'), {
            search,
            status: statusFilter,
            per_page: receiptPage.per_page || 25,
            page: 1,
        }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const goToPage = (page) => {
        router.get(routeFor('admin.purchases.goods-receipts.index'), {
            ...filters,
            page,
            per_page: receiptPage.per_page || 25,
        }, { preserveState: true, preserveScroll: true });
    };

    const changePageSize = (event) => {
        router.get(routeFor('admin.purchases.goods-receipts.index'), {
            ...filters,
            page: 1,
            per_page: Number(event.target.value),
        }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const submitReceipt = (event) => {
        event.preventDefault();
        const onSuccess = () => setMode(isEditing ? 'view' : 'list');
        if (mode === 'edit' && selectedReceipt?.id) {
            put(routeFor('admin.purchases.goods-receipts.update', { goodsReceipt: selectedReceipt.id }), {
                preserveScroll: true,
                onSuccess,
            });
        } else {
            post(routeFor('admin.purchases.goods-receipts.store'), {
                preserveScroll: true,
                onSuccess,
            });
        }
    };

    const runAction = (action, receipt) => {
        const messages = {
            approve: text('Confirm approve'),
            reverse: text('Confirm reverse'),
            destroy: text('Confirm delete'),
        };
        if (messages[action] && !window.confirm(messages[action])) return;

        if (action === 'destroy') {
            router.delete(routeFor('admin.purchases.goods-receipts.destroy', { goodsReceipt: receipt.id }), {
                preserveScroll: true,
                onSuccess: returnToList,
            });
        } else {
            router.post(routeFor(`admin.purchases.goods-receipts.${action}`, { goodsReceipt: receipt.id }), {}, {
                preserveScroll: true,
            });
        }
    };

    const openReceipt = (receipt) => {
        router.get(routeFor('admin.purchases.goods-receipts.show', { goodsReceipt: receipt.id }));
    };

    const statusClass = (status) => `gr-status gr-status--${status || 'draft'}`;
    const statusLabel = (status) => text(String(status || 'draft').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()));
    const isReadOnly = mode === 'view';
    const isEditing = mode === 'edit';
    const vendor = currentOrder?.vendor;

    return (
        <AdminLayout activeMenu={text('Goods Receipts In')}>
            <Head title={text('Goods Receipts In')} />
            <BlankPage breadcrumbs={breadcrumbs}>
                <main className={`goods-receipt-module${isRtl ? ' is-rtl' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
                    <header className="gr-header">
                        <div>
                            <span className="gr-eyebrow">{text('Purchases')}</span>
                            <h1>{text('Goods Receipts In')}</h1>
                            <p>{text('Record, inspect and post goods received against purchase orders.')}</p>
                        </div>
                        {mode === 'list' ? (
                            <button type="button" className="gr-button gr-button--primary" onClick={startCreate}>
                                <span className="material-icons-outlined" aria-hidden="true">add</span>
                                {text('New Receipt')}
                            </button>
                        ) : (
                            <div className="gr-header__actions">
                                {mode === 'view' && selectedReceipt?.status === 'draft' && (
                                    <button type="button" className="gr-button gr-button--primary" onClick={() => setMode('edit')}>
                                        <span className="material-icons-outlined" aria-hidden="true">edit</span>
                                        {text('Edit')}
                                    </button>
                                )}
                                <button type="button" className="gr-button" onClick={returnToList}>
                                    {text('Back to receipts')}
                                </button>
                            </div>
                        )}
                    </header>

                    {(flash.success || flash.error || Object.keys(pageErrors).length > 0) && (
                        <div className="gr-alerts">
                            {flash.success && <div className="gr-alert gr-alert--success" role="status">{flash.success}</div>}
                            {flash.error && <div className="gr-alert gr-alert--error" role="alert">{flash.error}</div>}
                            {Object.keys(pageErrors).length > 0 && (
                                <div className="gr-alert gr-alert--error" role="alert">{text('Please review the highlighted fields and try again.')}</div>
                            )}
                        </div>
                    )}

                    {mode === 'list' ? (
                        <>
                            <section className="gr-summary" aria-label={text('Summary')}>
                                <div className="gr-summary-card">
                                    <span className="material-icons-outlined" aria-hidden="true">receipt_long</span>
                                    <div><small>{text('Goods Receipts In')}</small><strong>{Number(receiptPage.total || 0).toLocaleString()}</strong></div>
                                </div>
                                <div className="gr-summary-card">
                                    <span className="material-icons-outlined" aria-hidden="true">inventory_2</span>
                                    <div><small>{text('Lines')}</small><strong>{receiptRows.reduce((count, row) => count + numberValue(row.total_items), 0).toLocaleString()}</strong></div>
                                </div>
                                <div className="gr-summary-card">
                                    <span className="material-icons-outlined" aria-hidden="true">payments</span>
                                    <div><small>{text('Total value')}</small><strong>{receiptRows.reduce((value, row) => value + numberValue(row.total_value), 0).toFixed(2)}</strong></div>
                                </div>
                            </section>

                            <form className="gr-filters" onSubmit={applyFilters}>
                                <label className="gr-search">
                                    <span className="material-icons-outlined" aria-hidden="true">search</span>
                                    <input
                                        type="search"
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder={text('Search receipts')}
                                        aria-label={text('Search receipts')}
                                    />
                                </label>
                                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label={text('Status')}>
                                    <option value="">{text('All statuses')}</option>
                                    {STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                                </select>
                                <button type="submit" className="gr-button gr-button--primary">{text('Apply filters')}</button>
                            </form>

                            <section className="gr-table-card">
                                <div className="gr-table-scroll">
                                    <table className="gr-table">
                                        <thead>
                                            <tr>
                                                <th>{text('Reference')}</th>
                                                <th>{text('Purchase Order')}</th>
                                                <th>{text('Supplier')}</th>
                                                <th>{text('Warehouse')}</th>
                                                <th>{text('Date')}</th>
                                                <th className="is-number">{text('Items')}</th>
                                                <th className="is-number">{text('Total received')}</th>
                                                <th className="is-number">{text('Value')}</th>
                                                <th>{text('Status')}</th>
                                                <th>{text('Actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {receiptRows.map((receipt) => (
                                                <tr key={receipt.id}>
                                                    <td className="gr-reference">{receipt.receipt_number}</td>
                                                    <td>{receipt.order?.po_number || '—'}</td>
                                                    <td>{receipt.order?.vendor?.name_en || receipt.order?.vendor?.name_ar || '—'}</td>
                                                    <td>{receipt.warehouse?.name_en || receipt.warehouse?.name_ar || receipt.warehouse?.name || '—'}</td>
                                                    <td>{receipt.receipt_date ? formatDate(receipt.receipt_date) : '—'}</td>
                                                    <td className="is-number">{numberValue(receipt.total_items)}</td>
                                                    <td className="is-number">{numberValue(receipt.total_quantity).toLocaleString()}</td>
                                                    <td className="is-number">{numberValue(receipt.total_value).toFixed(2)}</td>
                                                    <td><span className={statusClass(receipt.status)}>{statusLabel(receipt.status)}</span></td>
                                                    <td>
                                                        <div className="gr-row-actions">
                                                            <button type="button" onClick={() => openReceipt(receipt)}>{text('View')}</button>
                                                            {receipt.status === 'draft' && (
                                                                <>
                                                                    <button type="button" onClick={() => runAction('receive', receipt)}>{text('Receive')}</button>
                                                                </>
                                                            )}
                                                            {['draft', 'received', 'checked'].includes(receipt.status) && (
                                                                <button type="button" onClick={() => runAction('approve', receipt)}>{text('Approve')}</button>
                                                            )}
                                                            {receipt.status !== 'approved' && (
                                                                <button type="button" className="is-danger" onClick={() => runAction('destroy', receipt)}>{text('Delete')}</button>
                                                            )}
                                                            {['received', 'draft', 'checked'].includes(receipt.status) && (
                                                                <button type="button" onClick={() => runAction('cancel', receipt)}>{text('Cancel receipt')}</button>
                                                            )}
                                                            {receipt.status === 'approved' && (
                                                                <button type="button" className="is-warning" onClick={() => runAction('reverse', receipt)}>{text('Reverse')}</button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {receiptRows.length === 0 && (
                                                <tr><td className="gr-empty" colSpan={10}>{text('No goods receipts found.')}</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <footer className="gr-pagination">
                                    <label>
                                        {text('Page size')}
                                        <select value={receiptPage.per_page || 25} onChange={changePageSize}>
                                            {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
                                        </select>
                                    </label>
                                    <span>
                                        {text('Showing')} {receiptPage.from || 0}–{receiptPage.to || 0} {text('of')} {receiptPage.total || 0} {text('records')}
                                    </span>
                                    <div className="gr-page-buttons">
                                        <button type="button" disabled={(receiptPage.current_page || 1) <= 1} onClick={() => goToPage((receiptPage.current_page || 1) - 1)}>{text('Previous')}</button>
                                        <span>{receiptPage.current_page || 1} / {receiptPage.last_page || 1}</span>
                                        <button type="button" disabled={(receiptPage.current_page || 1) >= (receiptPage.last_page || 1)} onClick={() => goToPage((receiptPage.current_page || 1) + 1)}>{text('Next')}</button>
                                    </div>
                                </footer>
                            </section>
                        </>
                    ) : mode === 'view' ? (
                        <section className="gr-document">
                            <div className="gr-document__heading">
                                <div>
                                    <span className="gr-eyebrow">{text('Receipt details')}</span>
                                    <h2>{selectedReceipt?.receipt_number || '—'}</h2>
                                </div>
                                <span className={statusClass(selectedReceipt?.status)}>{statusLabel(selectedReceipt?.status)}</span>
                            </div>
                            <div className="gr-info-grid">
                                <InfoField label={text('Purchase Order')} value={selectedReceipt?.order?.po_number} />
                                <InfoField label={text('Supplier')} value={selectedReceipt?.order?.vendor?.name_en || selectedReceipt?.order?.vendor?.name_ar} />
                                <InfoField label={text('Warehouse')} value={selectedReceipt?.warehouse?.name_en || selectedReceipt?.warehouse?.name_ar || selectedReceipt?.warehouse?.name} />
                                <InfoField label={text('Receipt date')} value={selectedReceipt?.receipt_date ? formatDate(selectedReceipt.receipt_date) : ''} />
                                <InfoField label={text('Receipt time')} value={selectedReceipt?.receipt_time} />
                                <InfoField label={text('Receipt type')} value={text(String(selectedReceipt?.receipt_type || '').replaceAll('_', ' '))} />
                                <InfoField label={text('Quality status')} value={text(selectedReceipt?.quality_status || 'pending')} />
                                <InfoField label={text('Created by')} value={selectedReceipt?.creator?.fullname || selectedReceipt?.creator?.username} />
                                <InfoField label={text('Receipt notes')} value={selectedReceipt?.notes} wide />
                                <InfoField label={text('Inspection notes')} value={selectedReceipt?.inspection_notes} wide />
                            </div>
                            <div className="gr-section-heading"><h3>{text('Items')}</h3></div>
                            <div className="gr-table-scroll">
                                <table className="gr-table gr-table--items">
                                    <thead><tr>
                                        <th>{text('Product')}</th><th>{text('Unit')}</th>
                                        <th className="is-number">{text('Received quantity')}</th>
                                        <th className="is-number">{text('Accepted')}</th>
                                        <th className="is-number">{text('Rejected')}</th>
                                        <th className="is-number">{text('Unit cost')}</th>
                                        <th>{text('Quality')}</th><th>{text('Batch number')}</th><th>{text('Expiry date')}</th>
                                    </tr></thead>
                                    <tbody>
                                        {(selectedReceipt?.details || []).map((item) => (
                                            <tr key={item.id}>
                                                <td>{item.product?.name_en || item.product?.name_ar || item.product?.name || `#${item.product_id}`}</td>
                                                <td>{item.unit?.name || '—'}</td>
                                                <td className="is-number">{numberValue(item.quantity_received).toLocaleString()}</td>
                                                <td className="is-number">{numberValue(item.accepted_quantity).toLocaleString()}</td>
                                                <td className="is-number">{numberValue(item.rejected_quantity).toLocaleString()}</td>
                                                <td className="is-number">{numberValue(item.unit_cost).toFixed(4)}</td>
                                                <td>{text(item.quality_status || '')}</td>
                                                <td>{item.batch_number || '—'}</td>
                                                <td>{item.expiry_date ? formatDate(item.expiry_date) : '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="gr-total-strip">
                                <span>{text('Total received')}: <strong>{numberValue(selectedReceipt?.total_quantity).toLocaleString()}</strong></span>
                                <span>{text('Total value')}: <strong>{numberValue(selectedReceipt?.total_value).toFixed(2)}</strong></span>
                            </div>
                            {selectedReceipt?.status === 'draft' && (
                                <div className="gr-workflow-actions">
                                    <button type="button" className="gr-button" onClick={() => runAction('receive', selectedReceipt)}>{text('Receive')}</button>
                                </div>
                            )}
                            {['draft', 'received', 'checked'].includes(selectedReceipt?.status) && (
                                <div className="gr-workflow-actions">
                                    <button type="button" className="gr-button gr-button--primary" onClick={() => runAction('approve', selectedReceipt)}>{text('Approve')}</button>
                                    <button type="button" className="gr-button gr-button--danger" onClick={() => runAction('destroy', selectedReceipt)}>{text('Delete')}</button>
                                </div>
                            )}
                            {['received', 'draft', 'checked', 'cancelled'].includes(selectedReceipt?.status) && (
                                <div className="gr-workflow-actions">
                                    {selectedReceipt?.status !== 'cancelled' && (
                                        <button type="button" className="gr-button gr-button--danger" onClick={() => runAction('cancel', selectedReceipt)}>{text('Cancel receipt')}</button>
                                    )}
                                    {selectedReceipt?.status === 'cancelled' && (
                                        <button type="button" className="gr-button gr-button--danger" onClick={() => runAction('destroy', selectedReceipt)}>{text('Delete')}</button>
                                    )}
                                </div>
                            )}
                            {selectedReceipt?.status === 'approved' && (
                                <div className="gr-workflow-actions">
                                    <button type="button" className="gr-button gr-button--danger" onClick={() => runAction('reverse', selectedReceipt)}>{text('Reverse')}</button>
                                </div>
                            )}
                        </section>
                    ) : (
                        <form className="gr-document" onSubmit={submitReceipt}>
                            <div className="gr-document__heading">
                                <div>
                                    <span className="gr-eyebrow">{text('Receipt details')}</span>
                                    <h2>{selectedReceipt?.receipt_number || text(isEditing ? 'Edit Receipt' : 'New Receipt')}</h2>
                                </div>
                                {selectedReceipt?.status && <span className={statusClass(selectedReceipt.status)}>{statusLabel(selectedReceipt.status)}</span>}
                            </div>
                            <section className="gr-card">
                                <div className="gr-section-heading">
                                    <span className="material-icons-outlined" aria-hidden="true">description</span>
                                    <h3>{text('Receipt details')}</h3>
                                </div>
                                <div className="gr-form-grid">
                                    <label className="gr-field">
                                        <span>{text('Receipt number')}</span>
                                        <input value={selectedReceipt?.receipt_number || text('Auto-generated')} disabled />
                                    </label>
                                    <label className="gr-field">
                                        <span>{text('Purchase Order')} <b>*</b></span>
                                        <SearchableComboBox
                                            options={purchaseOrderOptions}
                                            value={data.order_id}
                                            onChange={changeOrder}
                                            placeholder={text('Select purchase order')}
                                            required
                                        />
                                        {errors.order_id && <small className="gr-error">{errors.order_id}</small>}
                                    </label>
                                    <label className="gr-field">
                                        <span>{text('Supplier')}</span>
                                        <input value={vendor?.name_en || vendor?.name_ar || ''} disabled />
                                    </label>
                                    <label className="gr-field">
                                        <span>{text('Warehouse')} <b>*</b></span>
                                        <SearchableComboBox
                                            options={warehouseOptions}
                                            value={data.warehouse_id}
                                            onChange={(value) => setData('warehouse_id', value)}
                                            placeholder={text('Select warehouse')}
                                            disabled={isReadOnly}
                                            required
                                        />
                                        {errors.warehouse_id && <small className="gr-error">{errors.warehouse_id}</small>}
                                    </label>
                                    <label className="gr-field">
                                        <span>{text('Receipt date')} <b>*</b></span>
                                        <input type="date" required disabled={isReadOnly} value={data.receipt_date} onChange={(event) => setData('receipt_date', event.target.value)} />
                                        {errors.receipt_date && <small className="gr-error">{errors.receipt_date}</small>}
                                    </label>
                                    <label className="gr-field">
                                        <span>{text('Receipt time')}</span>
                                        <input type="time" disabled={isReadOnly} value={data.receipt_time} onChange={(event) => setData('receipt_time', event.target.value)} />
                                        {errors.receipt_time && <small className="gr-error">{errors.receipt_time}</small>}
                                    </label>
                                    <label className="gr-field">
                                        <span>{text('Receipt type')}</span>
                                        <select disabled={isReadOnly} value={data.receipt_type} onChange={(event) => setData('receipt_type', event.target.value)}>
                                            {RECEIPT_TYPES.map((type) => <option key={type} value={type}>{text(type.replaceAll('_', ' '))}</option>)}
                                        </select>
                                    </label>
                                    <label className="gr-field gr-field--wide">
                                        <span>{text('Receipt notes')}</span>
                                        <textarea rows="2" disabled={isReadOnly} value={data.notes} onChange={(event) => setData('notes', event.target.value)} />
                                    </label>
                                    <label className="gr-field gr-field--wide">
                                        <span>{text('Inspection notes')}</span>
                                        <textarea rows="2" disabled={isReadOnly} value={data.inspection_notes} onChange={(event) => setData('inspection_notes', event.target.value)} />
                                    </label>
                                </div>
                            </section>

                            <section className="gr-card gr-items-card">
                                <div className="gr-section-heading gr-section-heading--split">
                                    <div>
                                        <span className="material-icons-outlined" aria-hidden="true">inventory_2</span>
                                        <h3>{text('Items')}</h3>
                                    </div>
                                    {!isReadOnly && (
                                        <button type="button" className="gr-button gr-button--small" onClick={addRow} disabled={!data.order_id}>
                                            <span className="material-icons-outlined" aria-hidden="true">add</span>
                                            {text('Add item')}
                                        </button>
                                    )}
                                </div>
                                {!data.order_id ? (
                                    <div className="gr-empty-state">{text('Select a purchase order to load its pending product lines.')}</div>
                                ) : orderItems.length === 0 ? (
                                    <div className="gr-empty-state">{text('No eligible product lines are available for this order.')}</div>
                                ) : data.items.length === 0 ? (
                                    <div className="gr-empty-state">{text('No items have been added.')}</div>
                                ) : (
                                    <div className="gr-table-scroll">
                                        <table className="gr-table gr-table--editor">
                                            <thead><tr>
                                                <th>{text('Product')}</th>
                                                <th>{text('Unit')}</th>
                                                <th className="is-number">{text('PO quantity')}</th>
                                                <th className="is-number">{text('Received quantity')}</th>
                                                <th className="is-number">{text('Accepted')}</th>
                                                <th className="is-number">{text('Rejected')}</th>
                                                <th className="is-number">{text('Unit cost')}</th>
                                                <th>{text('Quality')}</th>
                                                <th>{text('Batch number')}</th>
                                                <th>{text('Serial number')}</th>
                                                <th>{text('Production date')}</th>
                                                <th>{text('Expiry date')}</th>
                                                <th>{text('Shelf location')}</th>
                                                <th className="is-number">{text('Line value')}</th>
                                                {!isReadOnly && <th aria-label={text('Actions')} />}
                                            </tr></thead>
                                            <tbody>
                                                {data.items.map((item, index) => {
                                                    const source = orderItems.find((entry) => String(entry.id) === String(item.purchase_order_item_id));
                                                    const unitOptions = (source?.unit_options || []).map((unit) => ({
                                                        value: String(unit.id),
                                                        label: unit.name,
                                                    }));
                                                    const rowErrors = (field) => errors[`items.${index}.${field}`];
                                                    return (
                                                        <React.Fragment key={item.row_key || index}>
                                                            <tr>
                                                                <td className="gr-product-cell">
                                                                    <SearchableComboBox
                                                                        options={itemOptions(index)}
                                                                        value={item.purchase_order_item_id}
                                                                        onChange={(value) => selectOrderItem(index, value)}
                                                                        placeholder={text('Select product')}
                                                                        disabled={isReadOnly}
                                                                        required
                                                                    />
                                                                    {rowErrors('product_id') && <small className="gr-error">{rowErrors('product_id')}</small>}
                                                                </td>
                                                                <td className="gr-unit-cell">
                                                                    <SearchableComboBox
                                                                        options={unitOptions}
                                                                        value={item.unit_id}
                                                                        onChange={(value) => changeUnit(index, value)}
                                                                        placeholder={text('Select unit')}
                                                                        disabled={isReadOnly || unitOptions.length === 0}
                                                                        required
                                                                    />
                                                                    {unitOptions.length === 0 && <small className="gr-error">{text('No valid units are configured for this product.')}</small>}
                                                                    {rowErrors('unit_id') && <small className="gr-error">{rowErrors('unit_id')}</small>}
                                                                </td>
                                                                <td className="is-number">{numberValue(source?.ordered_quantity).toLocaleString()}</td>
                                                                <td><NumberInput disabled={isReadOnly} value={item.quantity_received} onChange={(value) => updateQuantity(index, 'quantity_received', value)} error={rowErrors('quantity_received')} min="0.001" /></td>
                                                                <td><NumberInput disabled={isReadOnly} value={item.accepted_quantity} onChange={(value) => updateQuantity(index, 'accepted_quantity', value)} error={rowErrors('accepted_quantity')} min="0" /></td>
                                                                <td><NumberInput disabled={isReadOnly} value={item.rejected_quantity} onChange={(value) => updateQuantity(index, 'rejected_quantity', value)} error={rowErrors('rejected_quantity')} min="0" /></td>
                                                                <td><NumberInput disabled={isReadOnly} value={item.unit_cost} onChange={(value) => updateRow(index, 'unit_cost', numberValue(value))} error={rowErrors('unit_cost')} min="0" /></td>
                                                                <td>
                                                                    <select disabled={isReadOnly} value={item.quality_status} onChange={(event) => updateRow(index, 'quality_status', event.target.value)}>
                                                                        {QUALITY_STATUSES.map((quality) => <option key={quality} value={quality}>{text(quality)}</option>)}
                                                                    </select>
                                                                </td>
                                                                <td><input disabled={isReadOnly} value={item.batch_number} onChange={(event) => updateRow(index, 'batch_number', event.target.value)} /></td>
                                                                <td><input disabled={isReadOnly} value={item.serial_number} onChange={(event) => updateRow(index, 'serial_number', event.target.value)} /></td>
                                                                <td><input type="date" disabled={isReadOnly} value={item.production_date} onChange={(event) => updateRow(index, 'production_date', event.target.value)} /></td>
                                                                <td><input type="date" disabled={isReadOnly} value={item.expiry_date} onChange={(event) => updateRow(index, 'expiry_date', event.target.value)} /></td>
                                                                <td><input disabled={isReadOnly} value={item.shelf_location} onChange={(event) => updateRow(index, 'shelf_location', event.target.value)} /></td>
                                                                <td className="is-number gr-line-value">{(numberValue(item.quantity_received) * numberValue(item.unit_cost)).toFixed(2)}</td>
                                                                {!isReadOnly && (
                                                                    <td>
                                                                        <button type="button" className="gr-icon-button is-danger" onClick={() => removeRow(index)} aria-label={text('Delete')}>
                                                                            <span className="material-icons-outlined" aria-hidden="true">delete_outline</span>
                                                                        </button>
                                                                    </td>
                                                                )}
                                                            </tr>
                                                            <tr className="gr-extra-row">
                                                                <td colSpan={isReadOnly ? 14 : 15}>
                                                                    <button type="button" className="gr-detail-toggle" onClick={() => setExpandedRows((previous) => ({ ...previous, [item.row_key]: !previous[item.row_key] }))}>
                                                                        {expandedRows[item.row_key] ? '−' : '+'} {text('Line notes')}
                                                                    </button>
                                                                    {expandedRows[item.row_key] && (
                                                                        <div className="gr-extra-fields">
                                                                            <label className="gr-field"><span>{text('Quality notes')}</span><textarea rows="2" disabled={isReadOnly} value={item.quality_notes} onChange={(event) => updateRow(index, 'quality_notes', event.target.value)} /></label>
                                                                            <label className="gr-field"><span>{text('Rejection reason')}</span><textarea rows="2" disabled={isReadOnly} value={item.rejection_reason} onChange={(event) => updateRow(index, 'rejection_reason', event.target.value)} /></label>
                                                                            <label className="gr-field"><span>{text('Line notes')}</span><textarea rows="2" disabled={isReadOnly} value={item.notes} onChange={(event) => updateRow(index, 'notes', event.target.value)} /></label>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                {errors.items && <small className="gr-error">{errors.items}</small>}
                            </section>

                            <section className="gr-total-strip">
                                <span>{text('Lines')}: <strong>{data.items.length}</strong></span>
                                <span>{text('Total received')}: <strong>{summary.quantity.toLocaleString()}</strong></span>
                                <span>{text('Total value')}: <strong>{summary.value.toFixed(2)}</strong></span>
                            </section>
                            {!isReadOnly && (
                                <footer className="gr-form-actions">
                                    <button type="button" className="gr-button" onClick={returnToList}>{text('Cancel')}</button>
                                    <button type="submit" className="gr-button gr-button--primary" disabled={processing || data.items.length === 0}>
                                        <span className="material-icons-outlined" aria-hidden="true">save</span>
                                        {processing ? text('Saving...') : text(isEditing ? 'Update receipt' : 'Save receipt')}
                                    </button>
                                </footer>
                            )}
                        </form>
                    )}
                </main>
            </BlankPage>
        </AdminLayout>
    );
}

function InfoField({ label, value, wide = false }) {
    return (
        <div className={`gr-info-field${wide ? ' gr-info-field--wide' : ''}`}>
            <small>{label}</small>
            <span>{value || '—'}</span>
        </div>
    );
}

function NumberInput({ value, onChange, disabled, error, min }) {
    return (
        <label className="gr-number-input">
            <input
                type="number"
                min={min}
                step="0.0001"
                value={value}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
            />
            {error && <small className="gr-error">{error}</small>}
        </label>
    );
}
