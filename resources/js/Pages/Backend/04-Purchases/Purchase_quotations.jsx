import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';
import AdminLayout from '../components/AdminLayout';
import BlankPage from '@/Components/BlankPage';
import SearchableComboBox from '../components/SearchableComboBox';
import { formatDate } from '@/utils/date';

const STATUSES = [
    'draft',
    'pending_approval',
    'approved',
    'sent_to_vendor',
    'vendor_replied',
    'converted_to_po',
    'rejected',
    'cancelled',
    'expired',
];

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const ARABIC_LABELS = {
    'Purchase Quotations': 'عروض أسعار الشراء',
    'Create Quotation': 'إنشاء عرض سعر',
    'Edit Quotation': 'تعديل عرض السعر',
    'View Quotation': 'عرض السعر',
    'Search quotations': 'البحث في عروض الأسعار',
    'All statuses': 'كل الحالات',
    'Apply filters': 'تطبيق التصفية',
    'Page size': 'عدد السجلات',
    draft: 'مسودة',
    'pending approval': 'بانتظار الموافقة',
    approved: 'معتمد',
    'sent to vendor': 'مرسل للمورد',
    'vendor replied': 'تم الرد من المورد',
    'converted to po': 'تم التحويل لأمر شراء',
    rejected: 'مرفوض',
    cancelled: 'ملغي',
    expired: 'منتهي',
    low: 'منخفض',
    medium: 'متوسط',
    high: 'مرتفع',
    urgent: 'عاجل',
    product: 'منتج',
    service: 'خدمة',
    material: 'مواد',
    asset: 'أصل',
    expense: 'مصروف',
    other: 'أخرى',
    'Reference': 'المرجع',
    'Date': 'التاريخ',
    'Vendor': 'المورد',
    'Status': 'الحالة',
    'Priority': 'الأولوية',
    'Total': 'الإجمالي',
    'Actions': 'الإجراءات',
    'View': 'عرض',
    'Edit': 'تعديل',
    'Delete': 'حذف',
    'No quotations found.': 'لا توجد عروض أسعار.',
    'Showing': 'عرض',
    'of': 'من',
    'Previous': 'السابق',
    'Next': 'التالي',
    'Quotation details': 'بيانات عرض السعر',
    'Quotation number': 'رقم عرض السعر',
    'Expiry date': 'تاريخ الانتهاء',
    'Vendor details': 'بيانات المورد',
    'Contact person': 'الشخص المسؤول',
    'Phone': 'الهاتف',
    'Email': 'البريد الإلكتروني',
    'Currency': 'العملة',
    'Exchange rate': 'سعر الصرف',
    'Line items': 'بنود العرض',
    'Product / service': 'المنتج / الخدمة',
    'Item name (Arabic)': 'اسم البند (عربي)',
    'Item name (English)': 'اسم البند (إنجليزي)',
    'Description (Arabic)': 'الوصف (عربي)',
    'Description (English)': 'الوصف (إنجليزي)',
    'Type': 'النوع',
    'Quantity': 'الكمية',
    'Unit': 'الوحدة',
    'Unit price': 'سعر الوحدة',
    'Discount / unit': 'الخصم / الوحدة',
    'Discount %': 'الخصم %',
    'Tax %': 'الضريبة %',
    'Line total': 'إجمالي البند',
    'Required date': 'تاريخ الطلب',
    'Warehouse': 'المستودع',
    'Add line': 'إضافة بند',
    'Quotation terms': 'شروط عرض السعر',
    'Payment terms': 'شروط الدفع',
    'Delivery terms': 'شروط التسليم',
    'Shipping method': 'طريقة الشحن',
    'Shipping address': 'عنوان الشحن',
    'Notes': 'ملاحظات',
    'Internal notes': 'ملاحظات داخلية',
    'Terms and conditions': 'الشروط والأحكام',
    'Subtotal': 'المجموع الفرعي',
    'Tax': 'الضريبة',
    'Quotation discount': 'خصم العرض',
    'Shipping': 'الشحن',
    'Other charges': 'رسوم أخرى',
    'Grand total': 'الإجمالي النهائي',
    'Cancel': 'إلغاء',
    'Save quotation': 'حفظ عرض السعر',
    'Saving...': 'جارٍ الحفظ...',
    'Print': 'طباعة',
    'PDF': 'PDF',
    'Excel': 'Excel',
    'Select vendor': 'اختر المورد',
    'Select currency': 'اختر العملة',
    'Select product': 'اختر المنتج',
    'Select unit': 'اختر الوحدة',
    'Select warehouse': 'اختر المستودع',
    'No product selected': 'لم يتم اختيار منتج',
    'Create a purchase quotation': 'إنشاء عرض سعر شراء',
};

const emptyItem = () => ({
    id: null,
    item_type: 'product',
    product_id: '',
    item_name_ar: '',
    item_name_en: '',
    description_ar: '',
    description_en: '',
    quantity: 1,
    unit_id: '',
    unit_price: 0,
    discount_percent: 0,
    discount_amount: 0,
    tax_id: '',
    tax_amount: 0,
    required_date: '',
    promised_delivery_date: '',
    warehouse_id: '',
    notes: '',
    internal_comments: '',
});

const emptyQuotation = () => ({
    quotation_number: '',
    quotation_date: new Date().toISOString().slice(0, 10),
    expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    vendor_id: '',
    vendor_contact_person: '',
    vendor_phone: '',
    vendor_email: '',
    currency_id: '',
    exchange_rate: 1,
    status: 'draft',
    priority: 'medium',
    discount_amount: 0,
    discount_percent: 0,
    shipping_charges: 0,
    other_charges: 0,
    payment_terms_id: '',
    delivery_terms_id: '',
    shipping_method: '',
    shipping_address: '',
    notes: '',
    terms_and_conditions: '',
    internal_notes: '',
    items: [emptyItem()],
});

const numberValue = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
};

const quotationFormData = (quotation) => {
    if (!quotation) return emptyQuotation();

    return {
        ...emptyQuotation(),
        ...quotation,
        quotation_date: quotation.quotation_date?.slice(0, 10) || '',
        expiry_date: quotation.expiry_date?.slice(0, 10) || '',
        vendor_id: String(quotation.vendor_id ?? ''),
        currency_id: String(quotation.currency_id ?? ''),
        exchange_rate: numberValue(quotation.exchange_rate),
        discount_amount: numberValue(quotation.discount_amount),
        discount_percent: numberValue(quotation.discount_percent),
        shipping_charges: numberValue(quotation.shipping_charges),
        other_charges: numberValue(quotation.other_charges),
        payment_terms_id: quotation.payment_terms_id ? String(quotation.payment_terms_id) : '',
        delivery_terms_id: quotation.delivery_terms_id ? String(quotation.delivery_terms_id) : '',
        items: (quotation.items || []).map((item) => ({
            ...emptyItem(),
            ...item,
            id: item.id,
            item_type: item.item_type || 'product',
            product_id: item.product_id ? String(item.product_id) : '',
            unit_id: item.unit_id ? String(item.unit_id) : '',
            warehouse_id: item.warehouse_id ? String(item.warehouse_id) : '',
            quantity: numberValue(item.quantity),
            unit_price: numberValue(item.unit_price),
            discount_percent: numberValue(item.discount_percent),
            discount_amount: numberValue(item.discount_amount),
            tax_id: item.tax_id ? String(item.tax_id) : '',
            tax_amount: numberValue(item.tax_amount),
        })),
    };
};

const quotationTotals = (items, data) => {
    const lines = items.map((item) => {
        const quantity = numberValue(item.quantity);
        const netUnitPrice = Math.max(0, numberValue(item.unit_price) - numberValue(item.discount_amount));
        const subtotal = Math.round(quantity * netUnitPrice * 100) / 100;
        const tax = Math.round(subtotal * numberValue(item.tax_amount) / 100 * 100) / 100;

        return { subtotal, tax, total: subtotal + tax };
    });
    const subtotal = Math.round(lines.reduce((sum, line) => sum + line.subtotal, 0) * 100) / 100;
    const tax = Math.round(lines.reduce((sum, line) => sum + line.tax, 0) * 100) / 100;
    const discount = numberValue(data.discount_amount);

    return {
        lines,
        subtotal,
        tax,
        grandTotal: Math.round(
            (subtotal - discount + tax + numberValue(data.shipping_charges) + numberValue(data.other_charges)) * 100,
        ) / 100,
    };
};

export default function PurchaseQuotations({
    quotations,
    vendors = [],
    currencies = [],
    products = [],
    units = [],
    warehouses = [],
    paymentTerms = [],
    deliveryTerms = [],
    filters = {},
    initialMode = 'list',
    selectedQuotation = null,
}) {
    const { props } = usePage();
    const translations = props.localization?.translations || {};
    const locale = props.localization?.current_locale || (typeof document !== 'undefined' ? document.documentElement.lang : 'en');
    const isArabic = String(locale).startsWith('ar');
    const isRtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
    const text = (value) => translations[value] || (isArabic ? ARABIC_LABELS[value] || value : value);
    const flash = props.flash || {};
    const [mode, setMode] = useState(initialMode);
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [exportError, setExportError] = useState('');
    const printRef = useRef(null);
    const {
        data,
        setData,
        post,
        put,
        delete: destroy,
        processing,
        errors,
        transform,
    } = useForm(quotationFormData(selectedQuotation));

    useEffect(() => {
        if (selectedQuotation) {
            setData(quotationFormData(selectedQuotation));
            setMode(initialMode);
            return;
        }

        if (initialMode === 'create') {
            setData(emptyQuotation());
            setMode('create');
            return;
        }

        if (initialMode === 'list') {
            setMode('list');
        }
    }, [initialMode, selectedQuotation, setData]);

    const totals = useMemo(() => quotationTotals(data.items || [], data), [data.items, data.discount_amount, data.shipping_charges, data.other_charges]);
    const productOptions = useMemo(() => products.map((product) => ({
        value: String(product.id),
        label: product.display_name || product.name_en || product.name_ar || '',
    })), [products]);
    const vendorOptions = useMemo(() => vendors.map((vendor) => ({
        value: String(vendor.id),
        label: vendor.name_en && vendor.name_ar && vendor.name_en !== vendor.name_ar
            ? `${vendor.name_en} / ${vendor.name_ar}`
            : vendor.name_en || vendor.name_ar || '',
    })), [vendors]);
    const currencyOptions = useMemo(() => currencies.map((currency) => ({
        value: String(currency.id),
        label: [currency.code, currency.name].filter(Boolean).join(' - '),
    })), [currencies]);
    const warehouseOptions = useMemo(() => warehouses.map((warehouse) => ({
        value: String(warehouse.id),
        label: warehouse.name_en || warehouse.name_ar || '',
    })), [warehouses]);
    const list = quotations?.data || [];
    const currentPage = Number(quotations?.current_page || 1);
    const lastPage = Number(quotations?.last_page || 1);
    const pageSize = Number(quotations?.per_page || filters.per_page || 10);
    const from = quotations?.from || 0;
    const to = quotations?.to || 0;
    const totalCount = quotations?.total || 0;
    const readOnly = mode === 'view';

    const beginCreate = () => {
        setData(emptyQuotation());
        setExportError('');
        setMode('create');
    };

    const beginEdit = (quotation) => {
        setData(quotationFormData(quotation));
        setExportError('');
        setMode('edit');
    };

    const beginView = (quotation) => {
        setData(quotationFormData(quotation));
        setExportError('');
        setMode('view');
    };

    const returnToList = () => setMode('list');

    const updateLine = (index, field, value) => {
        const items = data.items.map((item, itemIndex) => {
            if (itemIndex !== index) return item;

            const next = { ...item, [field]: value };
            const product = field === 'product_id'
                ? products.find((entry) => String(entry.id) === String(value))
                : products.find((entry) => String(entry.id) === String(item.product_id));

            if (field === 'product_id') {
                next.item_type = product?.product_type === 'service' ? 'service' : 'product';
                next.item_name_ar = product?.name_ar || '';
                next.item_name_en = product?.name_en || '';
                next.unit_price = numberValue(product?.purchase_price);
                const selectedUnit = product?.units?.find((unit) => String(unit.id) === String(product.unit_id))
                    || product?.units?.[0];
                next.unit_id = selectedUnit ? String(selectedUnit.id) : '';
            }

            if (field === 'unit_price' || field === 'discount_amount') {
                const price = numberValue(field === 'unit_price' ? value : next.unit_price);
                const amount = numberValue(field === 'discount_amount' ? value : next.discount_amount);
                next.discount_percent = price > 0 ? Math.min(100, amount / price * 100) : 0;
            } else if (field === 'discount_percent') {
                next.discount_amount = numberValue(next.unit_price) * numberValue(value) / 100;
            }

            return next;
        });

        setData('items', items);
    };

    const selectVendor = (value) => {
        const vendor = vendors.find((entry) => String(entry.id) === String(value));
        setData((current) => ({
            ...current,
            vendor_id: value,
            vendor_contact_person: vendor?.contact_person || current.vendor_contact_person,
            vendor_phone: vendor?.phone || current.vendor_phone,
            vendor_email: vendor?.email || current.vendor_email,
            currency_id: current.currency_id || (vendor?.currency_id ? String(vendor.currency_id) : ''),
        }));
    };

    const removeLine = (index) => {
        if (data.items.length === 1) return;
        setData('items', data.items.filter((_, itemIndex) => itemIndex !== index));
    };

    const submitQuotation = (event) => {
        event.preventDefault();
        transform((formData) => ({
            ...formData,
            subtotal: totals.subtotal,
            tax_amount: totals.tax,
            grand_total: totals.grandTotal,
            items: formData.items.map((item) => ({
                ...item,
                discount_percent: numberValue(item.discount_percent),
            })),
        }));

        const options = {
            preserveScroll: true,
            onSuccess: () => setMode('list'),
        };

        if (mode === 'create') {
            post(route('admin.purchases.quotations.store'), options);
        } else {
            put(route('admin.purchases.quotations.update', { quotation: selectedQuotation?.id || data.id }), options);
        }
    };

    const deleteQuotation = (quotation) => {
        if (!window.confirm(text('Delete') + ` ${quotation.quotation_number}?`)) return;
        destroy(route('admin.purchases.quotations.destroy', { quotation: quotation.id }), {
            preserveScroll: true,
        });
    };

    const applyFilters = (event) => {
        event.preventDefault();
        router.get(route('admin.purchases.quotations.index'), {
            search: search || undefined,
            status: statusFilter || undefined,
            per_page: pageSize,
            page: 1,
        }, { preserveState: true, replace: true });
    };

    const changePage = (page) => {
        if (page < 1 || page > lastPage) return;
        router.get(route('admin.purchases.quotations.index'), {
            search: search || undefined,
            status: statusFilter || undefined,
            per_page: pageSize,
            page,
        }, { preserveState: true, replace: true });
    };

    const changePageSize = (event) => {
        const selectedSize = Number(event.target.value);
        router.get(route('admin.purchases.quotations.index'), {
            search: search || undefined,
            status: statusFilter || undefined,
            per_page: selectedSize,
            page: 1,
        }, { preserveState: true, replace: true });
    };

    const exportExcel = () => {
        const rows = data.items.map((item, index) => {
            const product = products.find((entry) => String(entry.id) === String(item.product_id));
            const unit = product?.units?.find((entry) => String(entry.id) === String(item.unit_id))
                || units.find((entry) => String(entry.id) === String(item.unit_id));

            return {
                '#': index + 1,
                Product: product?.display_name || item.item_name_en || item.item_name_ar || '',
                Description: isArabic ? item.description_ar : item.description_en,
                Quantity: numberValue(item.quantity),
                Unit: unit?.name || '',
                'Unit price': numberValue(item.unit_price),
                'Discount / unit': numberValue(item.discount_amount),
                'Tax %': numberValue(item.tax_amount),
                'Tax amount': totals.lines[index]?.tax || 0,
                Total: totals.lines[index]?.total || 0,
            };
        });
        rows.push(
            {},
            { Product: 'Subtotal', Total: totals.subtotal },
            { Product: 'Tax', Total: totals.tax },
            { Product: 'Discount', Total: numberValue(data.discount_amount) },
            { Product: 'Shipping', Total: numberValue(data.shipping_charges) },
            { Product: 'Other charges', Total: numberValue(data.other_charges) },
            { Product: 'Grand total', Total: totals.grandTotal },
        );

        const worksheet = XLSX.utils.json_to_sheet(rows);
        worksheet['!cols'] = [{ wch: 5 }, { wch: 28 }, { wch: 32 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 16 }];
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Quotation');
        XLSX.writeFile(workbook, `PurchaseQuotation_${data.quotation_number || 'New'}.xlsx`);
    };

    const exportPdf = async () => {
        setExportError('');
        try {
            await html2pdf().set({
                margin: 8,
                filename: `PurchaseQuotation_${data.quotation_number || 'New'}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            }).from(printRef.current).save();
        } catch (error) {
            console.error('Unable to export purchase quotation PDF.', error);
            setExportError('Unable to export the quotation PDF. Please try again.');
        }
    };

    const productLabel = (productId) => {
        const product = products.find((entry) => String(entry.id) === String(productId));
        return product?.display_name || product?.name_en || product?.name_ar || '';
    };
    const currencyCode = currencies.find((currency) => String(currency.id) === String(data.currency_id))?.code || '';
    const breadcrumbs = [
        { label: text('Purchase Quotations'), onClick: returnToList },
        ...(mode === 'create' ? [{ label: text('Create Quotation') }] : []),
        ...(mode === 'edit' ? [{ label: text('Edit Quotation') }] : []),
        ...(mode === 'view' ? [{ label: text('View Quotation') }] : []),
    ];

    const title = mode === 'create'
        ? text('Create Quotation')
        : mode === 'edit'
            ? text('Edit Quotation')
            : mode === 'view'
                ? text('View Quotation')
                : text('Purchase Quotations');

    const header = (
        <div className="purchase-quotations__heading">
            <div>
                <h1>{title}</h1>
                {mode === 'list' && <p>{text('Create a purchase quotation')}</p>}
            </div>
            <div className="purchase-quotations__heading-actions">
                {mode === 'list' ? (
                    <button type="button" className="pq-button pq-button--primary" onClick={beginCreate}>
                        <span className="material-icons-outlined" aria-hidden="true">add</span>
                        {text('Create Quotation')}
                    </button>
                ) : (
                    <>
                        <button type="button" className="pq-button" onClick={() => window.print()}>{text('Print')}</button>
                        <button type="button" className="pq-button" onClick={exportPdf}>{text('PDF')}</button>
                        <button type="button" className="pq-button" onClick={exportExcel}>{text('Excel')}</button>
                        {mode === 'view' && (
                            <button type="button" className="pq-button pq-button--primary" onClick={() => setMode('edit')}>
                                {text('Edit')}
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );

    return (
        <AdminLayout>
            <Head title={text('Purchase Quotations')} />
            <BlankPage breadcrumbs={breadcrumbs} filters={header}>
                <section className={`purchase-quotations${isRtl ? ' is-rtl' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
                    {flash.success && <div className="pq-alert pq-alert--success" role="status">{flash.success}</div>}
                    {flash.error && <div className="pq-alert pq-alert--error" role="alert">{flash.error}</div>}
                    {exportError && <div className="pq-alert pq-alert--error" role="alert">{exportError}</div>}

                    {mode === 'list' ? (
                        <>
                            <form className="pq-filters" onSubmit={applyFilters}>
                                <label className="pq-search">
                                    <span className="material-icons-outlined" aria-hidden="true">search</span>
                                    <input
                                        type="search"
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder={text('Search quotations')}
                                        aria-label={text('Search quotations')}
                                    />
                                </label>
                                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label={text('Status')}>
                                    <option value="">{text('All statuses')}</option>
                                    {STATUSES.map((status) => <option key={status} value={status}>{text(status.replaceAll('_', ' '))}</option>)}
                                </select>
                                <button type="submit" className="pq-button pq-button--primary">{text('Apply filters')}</button>
                            </form>

                            <div className="pq-table-card">
                                <div className="pq-table-scroll">
                                    <table className="pq-table">
                                        <thead>
                                            <tr>
                                                <th>{text('Reference')}</th>
                                                <th>{text('Date')}</th>
                                                <th>{text('Vendor')}</th>
                                                <th>{text('Status')}</th>
                                                <th>{text('Priority')}</th>
                                                <th className="is-number">{text('Total')}</th>
                                                <th>{text('Actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {list.map((quotation) => (
                                                <tr key={quotation.id}>
                                                    <td className="pq-reference">{quotation.quotation_number}</td>
                                                    <td>{formatDate(quotation.quotation_date)}</td>
                                                    <td>{quotation.vendor?.name_en || quotation.vendor?.name_ar || '—'}</td>
                                                    <td><span className={`pq-status pq-status--${quotation.status}`}>{text(quotation.status?.replaceAll('_', ' ') || '')}</span></td>
                                                    <td><span className={`pq-priority pq-priority--${quotation.priority}`}>{text(quotation.priority || '')}</span></td>
                                                    <td className="is-number">{numberValue(quotation.grand_total).toFixed(2)} {quotation.currency?.code}</td>
                                                    <td>
                                                        <div className="pq-row-actions">
                                                            <button type="button" onClick={() => beginView(quotation)}>{text('View')}</button>
                                                            <button type="button" onClick={() => beginEdit(quotation)}>{text('Edit')}</button>
                                                            <button type="button" className="is-danger" onClick={() => deleteQuotation(quotation)}>{text('Delete')}</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {list.length === 0 && (
                                                <tr><td className="pq-empty" colSpan="7">{text('No quotations found.')}</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="pq-pagination">
                                    <div className="pq-pagination__summary">
                                        {text('Showing')} {from}–{to} {text('of')} {totalCount}
                                        <label>
                                            <span>{text('Page size')}</span>
                                            <select value={pageSize} onChange={changePageSize}>
                                                {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
                                            </select>
                                        </label>
                                    </div>
                                    <div className="pq-pagination__controls">
                                        <button type="button" disabled={currentPage <= 1} onClick={() => changePage(currentPage - 1)}>{text('Previous')}</button>
                                        <span>{currentPage} / {lastPage}</span>
                                        <button type="button" disabled={currentPage >= lastPage} onClick={() => changePage(currentPage + 1)}>{text('Next')}</button>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <form className="pq-form" onSubmit={submitQuotation}>
                            <div className="pq-card pq-header-card">
                                <div className="pq-card__title">
                                    <div>
                                        <span className="pq-eyebrow">{text('Quotation details')}</span>
                                        <h2>{data.quotation_number || text('Create Quotation')}</h2>
                                    </div>
                                    {data.quotation_number && (
                                        <span className={`pq-status pq-status--${data.status}`}>{text(data.status?.replaceAll('_', ' ') || '')}</span>
                                    )}
                                </div>
                                <div className="pq-fields pq-fields--three">
                                    <label className="pq-field">
                                        <span>{text('Quotation number')}</span>
                                        <input value={data.quotation_number || ''} disabled placeholder="—" />
                                    </label>
                                    <label className="pq-field">
                                        <span>{text('Date')} <b>*</b></span>
                                        <input type="date" required disabled={readOnly} value={data.quotation_date} onChange={(event) => setData('quotation_date', event.target.value)} />
                                        {errors.quotation_date && <small className="pq-error">{errors.quotation_date}</small>}
                                    </label>
                                    <label className="pq-field">
                                        <span>{text('Expiry date')} <b>*</b></span>
                                        <input type="date" required disabled={readOnly} value={data.expiry_date} onChange={(event) => setData('expiry_date', event.target.value)} />
                                        {errors.expiry_date && <small className="pq-error">{errors.expiry_date}</small>}
                                    </label>
                                </div>
                            </div>

                            <div className="pq-section-grid">
                                <section className="pq-card">
                                    <div className="pq-section-heading">
                                        <span className="material-icons-outlined" aria-hidden="true">storefront</span>
                                        <h2>{text('Vendor details')}</h2>
                                    </div>
                                    <div className="pq-fields pq-fields--two">
                                        <label className="pq-field pq-field--wide">
                                            <span>{text('Vendor')} <b>*</b></span>
                                            <SearchableComboBox
                                                options={vendorOptions}
                                                value={data.vendor_id}
                                                onChange={selectVendor}
                                                placeholder={text('Select vendor')}
                                                disabled={readOnly}
                                                required
                                            />
                                            {errors.vendor_id && <small className="pq-error">{errors.vendor_id}</small>}
                                        </label>
                                        <label className="pq-field">
                                            <span>{text('Contact person')}</span>
                                            <input disabled={readOnly} value={data.vendor_contact_person || ''} onChange={(event) => setData('vendor_contact_person', event.target.value)} />
                                        </label>
                                        <label className="pq-field">
                                            <span>{text('Phone')}</span>
                                            <input disabled={readOnly} value={data.vendor_phone || ''} onChange={(event) => setData('vendor_phone', event.target.value)} />
                                        </label>
                                        <label className="pq-field pq-field--wide">
                                            <span>{text('Email')}</span>
                                            <input type="email" disabled={readOnly} value={data.vendor_email || ''} onChange={(event) => setData('vendor_email', event.target.value)} />
                                        </label>
                                    </div>
                                </section>

                                <section className="pq-card">
                                    <div className="pq-section-heading">
                                        <span className="material-icons-outlined" aria-hidden="true">tune</span>
                                        <h2>{text('Currency')} &amp; {text('Status')}</h2>
                                    </div>
                                    <div className="pq-fields pq-fields--two">
                                        <label className="pq-field">
                                            <span>{text('Currency')} <b>*</b></span>
                                            <SearchableComboBox
                                                options={currencyOptions}
                                                value={data.currency_id}
                                                onChange={(value) => setData('currency_id', value)}
                                                placeholder={text('Select currency')}
                                                disabled={readOnly}
                                                required
                                            />
                                            {errors.currency_id && <small className="pq-error">{errors.currency_id}</small>}
                                        </label>
                                        <label className="pq-field">
                                            <span>{text('Exchange rate')} <b>*</b></span>
                                            <input type="number" min="0.000001" step="0.000001" required disabled={readOnly} value={data.exchange_rate} onChange={(event) => setData('exchange_rate', event.target.value)} />
                                            {errors.exchange_rate && <small className="pq-error">{errors.exchange_rate}</small>}
                                        </label>
                                        <label className="pq-field">
                                            <span>{text('Status')}</span>
                                            <select disabled={readOnly} value={data.status} onChange={(event) => setData('status', event.target.value)}>
                                                {STATUSES.map((status) => <option key={status} value={status}>{text(status.replaceAll('_', ' '))}</option>)}
                                            </select>
                                        </label>
                                        <label className="pq-field">
                                            <span>{text('Priority')}</span>
                                            <select disabled={readOnly} value={data.priority} onChange={(event) => setData('priority', event.target.value)}>
                                                {PRIORITIES.map((priority) => <option key={priority} value={priority}>{text(priority)}</option>)}
                                            </select>
                                        </label>
                                    </div>
                                </section>
                            </div>

                            <section className="pq-card pq-lines-card">
                                <div className="pq-section-heading">
                                    <div>
                                        <span className="pq-eyebrow">{text('Line items')}</span>
                                        <h2>{text('Line items')}</h2>
                                    </div>
                                    {!readOnly && (
                                        <button type="button" className="pq-button" onClick={() => setData('items', [...data.items, emptyItem()])}>
                                            <span className="material-icons-outlined" aria-hidden="true">add</span>
                                            {text('Add line')}
                                        </button>
                                    )}
                                </div>
                                {errors.items && <small className="pq-error">{errors.items}</small>}
                                <div className="pq-lines-scroll">
                                    <table className="pq-lines-table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>{text('Product / service')}</th>
                                                <th>{text('Item name (Arabic)')}</th>
                                                <th>{text('Item name (English)')}</th>
                                                <th>{text('Description (Arabic)')}</th>
                                                <th>{text('Description (English)')}</th>
                                                <th>{text('Type')}</th>
                                                <th>{text('Quantity')}</th>
                                                <th>{text('Unit')}</th>
                                                <th>{text('Unit price')}</th>
                                                <th>{text('Discount / unit')}</th>
                                                <th>{text('Discount %')}</th>
                                                <th>{text('Tax %')}</th>
                                                <th>{text('Required date')}</th>
                                                <th>{text('Warehouse')}</th>
                                                <th className="is-number">{text('Line total')}</th>
                                                {!readOnly && <th />}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.items.map((item, index) => {
                                                const product = products.find((entry) => String(entry.id) === String(item.product_id));
                                                const itemUnits = product?.units || units;
                                                const selectedUnit = itemUnits.find((unit) => String(unit.id) === String(item.unit_id));
                                                const lineTotals = totals.lines[index] || { subtotal: 0, tax: 0, total: 0 };
                                                const unitOptions = itemUnits.map((unit) => ({ value: String(unit.id), label: unit.name }));

                                                return (
                                                    <tr key={item.id || `new-${index}`}>
                                                        <td>{index + 1}</td>
                                                        <td className="pq-product-cell">
                                                            <SearchableComboBox
                                                                options={productOptions}
                                                                value={item.product_id}
                                                                onChange={(value) => updateLine(index, 'product_id', value)}
                                                                placeholder={text('Select product')}
                                                                disabled={readOnly}
                                                            />
                                                            {item.product_id && <small>{product?.sku}</small>}
                                                            {errors[`items.${index}.product_id`] && <small className="pq-error">{errors[`items.${index}.product_id`]}</small>}
                                                        </td>
                                                        <td><input aria-label={text('Item name (Arabic)')} required disabled={readOnly} value={item.item_name_ar || ''} onChange={(event) => updateLine(index, 'item_name_ar', event.target.value)} /></td>
                                                        <td><input aria-label={text('Item name (English)')} disabled={readOnly} value={item.item_name_en || ''} onChange={(event) => updateLine(index, 'item_name_en', event.target.value)} /></td>
                                                        <td><input aria-label={text('Description (Arabic)')} disabled={readOnly} value={item.description_ar || ''} onChange={(event) => updateLine(index, 'description_ar', event.target.value)} /></td>
                                                        <td><input aria-label={text('Description (English)')} disabled={readOnly} value={item.description_en || ''} onChange={(event) => updateLine(index, 'description_en', event.target.value)} /></td>
                                                        <td>
                                                            <select disabled={readOnly} value={item.item_type} onChange={(event) => updateLine(index, 'item_type', event.target.value)}>
                                                                {['product', 'service', 'material', 'asset', 'expense', 'other'].map((type) => <option key={type} value={type}>{text(type)}</option>)}
                                                            </select>
                                                        </td>
                                                        <td><input type="number" min="0.001" step="0.001" required disabled={readOnly} value={item.quantity} onChange={(event) => updateLine(index, 'quantity', event.target.value)} /></td>
                                                        <td>
                                                            <SearchableComboBox
                                                                options={unitOptions}
                                                                value={item.unit_id}
                                                                onChange={(value) => updateLine(index, 'unit_id', value)}
                                                                placeholder={text('Select unit')}
                                                                disabled={readOnly || unitOptions.length === 0}
                                                            />
                                                            {errors[`items.${index}.unit_id`] && <small className="pq-error">{errors[`items.${index}.unit_id`]}</small>}
                                                            {selectedUnit && <small>{selectedUnit.name}</small>}
                                                        </td>
                                                        <td><input type="number" min="0" step="0.0001" required disabled={readOnly} value={item.unit_price} onChange={(event) => updateLine(index, 'unit_price', event.target.value)} /></td>
                                                        <td><input type="number" min="0" step="0.0001" disabled={readOnly} value={item.discount_amount} onChange={(event) => updateLine(index, 'discount_amount', event.target.value)} /></td>
                                                        <td><input type="number" min="0" max="100" step="0.01" disabled={readOnly} value={item.discount_percent} onChange={(event) => updateLine(index, 'discount_percent', event.target.value)} /></td>
                                                        <td><input type="number" min="0" max="1000" step="0.01" disabled={readOnly} value={item.tax_amount} onChange={(event) => updateLine(index, 'tax_amount', event.target.value)} /></td>
                                                        <td><input type="date" disabled={readOnly} value={item.required_date || ''} onChange={(event) => updateLine(index, 'required_date', event.target.value)} /></td>
                                                        <td>
                                                            <SearchableComboBox
                                                                options={warehouseOptions}
                                                                value={item.warehouse_id}
                                                                onChange={(value) => updateLine(index, 'warehouse_id', value)}
                                                                placeholder={text('Select warehouse')}
                                                                disabled={readOnly}
                                                            />
                                                        </td>
                                                        <td className="is-number pq-line-total">
                                                            {lineTotals.total.toFixed(2)}<small>{text('Tax')}: {lineTotals.tax.toFixed(2)}</small>
                                                        </td>
                                                        {!readOnly && (
                                                            <td>
                                                                <button type="button" className="pq-remove-line" aria-label={`${text('Delete')} ${index + 1}`} disabled={data.items.length === 1} onClick={() => removeLine(index)}>
                                                                    <span className="material-icons-outlined" aria-hidden="true">delete_outline</span>
                                                                </button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <div className="pq-bottom-grid">
                                <section className="pq-card">
                                    <div className="pq-section-heading">
                                        <span className="material-icons-outlined" aria-hidden="true">description</span>
                                        <h2>{text('Quotation terms')}</h2>
                                    </div>
                                    <div className="pq-fields pq-fields--two">
                                        <label className="pq-field">
                                            <span>{text('Payment terms')}</span>
                                            <select disabled={readOnly} value={data.payment_terms_id} onChange={(event) => setData('payment_terms_id', event.target.value)}>
                                                <option value="">—</option>
                                                {paymentTerms.map((term) => <option key={term.id} value={term.id}>{term.name}</option>)}
                                            </select>
                                        </label>
                                        <label className="pq-field">
                                            <span>{text('Delivery terms')}</span>
                                            <select disabled={readOnly} value={data.delivery_terms_id} onChange={(event) => setData('delivery_terms_id', event.target.value)}>
                                                <option value="">—</option>
                                                {deliveryTerms.map((term) => <option key={term.id} value={term.id}>{term.name}</option>)}
                                            </select>
                                        </label>
                                        <label className="pq-field">
                                            <span>{text('Shipping method')}</span>
                                            <input disabled={readOnly} value={data.shipping_method || ''} onChange={(event) => setData('shipping_method', event.target.value)} />
                                        </label>
                                        <label className="pq-field">
                                            <span>{text('Shipping address')}</span>
                                            <input disabled={readOnly} value={data.shipping_address || ''} onChange={(event) => setData('shipping_address', event.target.value)} />
                                        </label>
                                        <label className="pq-field pq-field--wide">
                                            <span>{text('Notes')}</span>
                                            <textarea rows="2" disabled={readOnly} value={data.notes || ''} onChange={(event) => setData('notes', event.target.value)} />
                                        </label>
                                        <label className="pq-field pq-field--wide">
                                            <span>{text('Internal notes')}</span>
                                            <textarea rows="2" disabled={readOnly} value={data.internal_notes || ''} onChange={(event) => setData('internal_notes', event.target.value)} />
                                        </label>
                                        <label className="pq-field pq-field--wide">
                                            <span>{text('Terms and conditions')}</span>
                                            <textarea rows="3" disabled={readOnly} value={data.terms_and_conditions || ''} onChange={(event) => setData('terms_and_conditions', event.target.value)} />
                                        </label>
                                    </div>
                                </section>

                                <section className="pq-card pq-totals-card">
                                    <div className="pq-section-heading">
                                        <span className="material-icons-outlined" aria-hidden="true">calculate</span>
                                        <h2>{text('Grand total')}</h2>
                                    </div>
                                    <div className="pq-total-row"><span>{text('Subtotal')}</span><strong>{totals.subtotal.toFixed(2)} {currencyCode}</strong></div>
                                    <div className="pq-total-row"><span>{text('Tax')}</span><strong>{totals.tax.toFixed(2)} {currencyCode}</strong></div>
                                    <label className="pq-total-row">
                                        <span>{text('Quotation discount')}</span>
                                        <input type="number" min="0" step="0.01" disabled={readOnly} value={data.discount_amount} onChange={(event) => setData('discount_amount', event.target.value)} />
                                    </label>
                                    {errors.discount_amount && <small className="pq-error">{errors.discount_amount}</small>}
                                    <label className="pq-total-row">
                                        <span>{text('Shipping')}</span>
                                        <input type="number" min="0" step="0.01" disabled={readOnly} value={data.shipping_charges} onChange={(event) => setData('shipping_charges', event.target.value)} />
                                    </label>
                                    <label className="pq-total-row">
                                        <span>{text('Other charges')}</span>
                                        <input type="number" min="0" step="0.01" disabled={readOnly} value={data.other_charges} onChange={(event) => setData('other_charges', event.target.value)} />
                                    </label>
                                    <div className="pq-total-row pq-total-row--grand"><span>{text('Grand total')}</span><strong>{totals.grandTotal.toFixed(2)} {currencyCode}</strong></div>
                                </section>
                            </div>

                            <div className="pq-form-actions">
                                <button type="button" className="pq-button" onClick={returnToList}>{text('Cancel')}</button>
                                {!readOnly && (
                                    <button type="submit" className="pq-button pq-button--primary" disabled={processing}>
                                        {processing ? text('Saving...') : text('Save quotation')}
                                    </button>
                                )}
                            </div>
                        </form>
                    )}

                    {mode !== 'list' && (
                        <div className="pq-print-document" ref={printRef}>
                            <div className="pq-print-header">
                                <div><h1>Zodic ERP</h1><p>{text('Purchase Quotations')}</p></div>
                                <div><h2>{text('Quotation number')}: {data.quotation_number || '—'}</h2><p>{text('Date')}: {data.quotation_date}</p><p>{text('Expiry date')}: {data.expiry_date}</p></div>
                            </div>
                            <div className="pq-print-vendor">
                                <strong>{text('Vendor')}:</strong> {vendorOptions.find((vendor) => vendor.value === String(data.vendor_id))?.label || '—'}
                                <span>{text('Currency')}: {currencyCode}</span>
                            </div>
                            <table>
                                <thead><tr><th>#</th><th>{text('Product / service')}</th><th>{text('Quantity')}</th><th>{text('Unit')}</th><th>{text('Unit price')}</th><th>{text('Line total')}</th></tr></thead>
                                <tbody>
                                    {data.items.map((item, index) => (
                                        <tr key={item.id || index}>
                                            <td>{index + 1}</td>
                                            <td>{productLabel(item.product_id) || item.item_name_en || item.item_name_ar}</td>
                                            <td>{numberValue(item.quantity)}</td>
                                            <td>{products.find((entry) => String(entry.id) === String(item.product_id))?.units?.find((unit) => String(unit.id) === String(item.unit_id))?.name || units.find((unit) => String(unit.id) === String(item.unit_id))?.name}</td>
                                            <td>{numberValue(item.unit_price).toFixed(2)}</td>
                                            <td>{totals.lines[index]?.total.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="pq-print-total">{text('Grand total')}: {totals.grandTotal.toFixed(2)} {currencyCode}</div>
                            {data.notes && <p>{text('Notes')}: {data.notes}</p>}
                            {data.terms_and_conditions && <p>{text('Terms and conditions')}: {data.terms_and_conditions}</p>}
                        </div>
                    )}
                </section>
            </BlankPage>
        </AdminLayout>
    );
}
