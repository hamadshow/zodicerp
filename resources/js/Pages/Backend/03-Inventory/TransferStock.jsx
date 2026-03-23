import React, { useEffect, useMemo, useState } from 'react';
import { useForm, Head, usePage, Link, router } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';

export default function TransferStock({
    transferStocks = [],
    pagination = [],
    warehouses = [],
    products = [],
    units = [],
    initialShowForm = false,
    viewing = false,
    transfer = null
}) {
    const page = usePage();
    const { errors: pageErrors, auth } = page.props;

    const pathname = window.location.pathname;
    const pathParts = pathname.split('/').filter(Boolean);
    const country = pathParts[0] || 'sa';
    const lang = pathParts[1] || 'ar';
    const isRtl = lang === 'ar';

    const [showForm, setShowForm] = useState(initialShowForm);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const t = (ar, en) => isRtl ? ar : en;

    const storeUrl = useMemo(() => {
        return `/${country}/${lang}/admin/inventory/stock-transfers`;
    }, [country, lang]);

    const { data, setData, post, processing, errors, reset, transform } = useForm({
        movement_date: transfer?.movement_date || new Date().toISOString().split('T')[0],
        from_warehouse_id: transfer?.from_warehouse_id || '',
        to_warehouse_id: transfer?.to_warehouse_id || '',
        notes: transfer?.notes?.replace('TransferStock | ', '')?.replace('TransferStock', '') || '',
        items: transfer?.items?.map(item => ({
            product_id: item.product_id,
            unit_id: item.unit_id,
            quantity: item.quantity
        })) || [
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
        if (viewing) return;
        setData('items', [
            ...data.items,
            { product_id: '', unit_id: '', quantity: 1 }
        ]);
    };

    const removeItem = (index) => {
        if (viewing) return;
        const newItems = [...data.items];
        if (newItems.length > 1) {
            newItems.splice(index, 1);
            setData('items', newItems);
        }
    };

    const updateItem = (index, field, value) => {
        if (viewing) return;
        const newItems = [...data.items];
        newItems[index][field] = value;
        setData('items', newItems);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (viewing || isSaving) return;

        if (data.from_warehouse_id === data.to_warehouse_id) {
            alert(t('لا يمكن التحويل لنفس المستودع.', 'You cannot transfer to the same warehouse.'));
            return;
        }

        setIsSaving(true);
        post(storeUrl, {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setShowForm(false);
                setIsSaving(false);
            },
            onError: () => {
                setIsSaving(false);
            },
            onFinish: () => setIsSaving(false)
        });
    };

    const handleDelete = (id) => {
        if (confirm(t('هل أنت متأكد من حذف هذا التحويل؟', 'Are you sure you want to delete this transfer?'))) {
            router.delete(`/${country}/${lang}/admin/inventory/stock-transfers/${id}`, {
                preserveScroll: true
            });
        }
    };

    const filteredTransfers = useMemo(() => {
        if (!searchTerm) return transferStocks;
        const s = searchTerm.toLowerCase();
        return transferStocks.filter(t =>
            String(t.id).includes(s) ||
            (t.from_warehouse?.name || '').toLowerCase().includes(s) ||
            (t.to_warehouse?.name || '').toLowerCase().includes(s) ||
            (t.notes || '').toLowerCase().includes(s)
        );
    }, [searchTerm, transferStocks]);

    const handleBackToList = () => {
        if (viewing) {
            router.visit(`/${country}/${lang}/admin/inventory/stock-transfers`);
        } else {
            setShowForm(false);
        }
    };

    const ListView = () => (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '300px' }}>
                    <input
                        type="text"
                        placeholder={t("البحث عن تحويل...", "Search transfers...")}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="form-control"
                        style={{ paddingLeft: '35px' }}
                    />
                    <span className="material-icons-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>search</span>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        reset();
                        setShowForm(true);
                    }}
                >
                    <span className="material-icons-outlined" style={{ verticalAlign: 'middle', marginRight: '5px' }}>add</span>
                    {t('إضافة تحويل جديد', 'Add New Transfer')}
                </button>
            </div>

            <div className="items-table-container">
                <table>
                    <thead>
                        <tr>
                            <th>{t('رقم', 'ID')}</th>
                            <th>{t('التاريخ', 'Date')}</th>
                            <th>{t('من مستودع', 'From Warehouse')}</th>
                            <th>{t('إلى مستودع', 'To Warehouse')}</th>
                            <th>{t('ملاحظات', 'Notes')}</th>
                            <th>{t('بواسطة', 'By')}</th>
                            <th className="action-column">{t('إجراءات', 'Actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTransfers.length > 0 ? (
                            filteredTransfers.map((stock) => (
                                <tr key={stock.id}>
                                    <td>#{stock.id}</td>
                                    <td>{stock.movement_date}</td>
                                    <td>{stock.from_warehouse?.name || stock.from_warehouse?.name_ar || '-'}</td>
                                    <td>{stock.to_warehouse?.name || stock.to_warehouse?.name_ar || '-'}</td>
                                    <td>{stock.notes?.replace('TransferStock | ', '')?.replace('TransferStock', '') || '-'}</td>
                                    <td>{stock.creator?.name || '-'}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            <Link
                                                href={`/${country}/${lang}/admin/inventory/stock-transfers/${stock.id}`}
                                                style={{ color: '#3b82f6' }}
                                                title={t("عرض", "View")}
                                            >
                                                <span className="material-icons-outlined">visibility</span>
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(stock.id)}
                                                style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
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
                                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                    {t('لم يتم العثور على سجلات.', 'No records found.')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {pagination && pagination.length > 3 && (
                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '5px' }}>
                    {pagination.map((link, i) => (
                        <Link
                            key={i}
                            href={link.url || '#'}
                            className={`btn ${link.active ? 'btn-primary' : 'btn-secondary'} ${!link.url ? 'disabled' : ''}`}
                            style={{ padding: '5px 12px', fontSize: '14px' }}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                            preserveScroll
                        />
                    ))}
                </div>
            )}
        </div>
    );

    const FormView = () => (
        <form onSubmit={handleSubmit}>
            <div className="card">
                <div className="form-grid">
                    <div className="form-group">
                        <label>{t('تاريخ التحويل', 'Transfer date')} <span className="text-red-500">*</span></label>
                        <input
                            type="date"
                            className={errors.movement_date ? 'is-invalid' : ''}
                            value={data.movement_date}
                            onChange={e => setData('movement_date', e.target.value)}
                            required
                            disabled={viewing}
                        />
                        {errors.movement_date && <div className="error-message">{errors.movement_date}</div>}
                    </div>

                    <div className="form-group">
                        <label>{t('من مستودع', 'From warehouse')} <span className="text-red-500">*</span></label>
                        <select
                            className={errors.from_warehouse_id ? 'is-invalid' : ''}
                            value={data.from_warehouse_id}
                            onChange={e => setData('from_warehouse_id', e.target.value)}
                            required
                            disabled={viewing}
                        >
                            <option value="">{t('اختر المستودع', 'Select warehouse')}</option>
                            {warehouses.map(w => (
                                <option key={w.id} value={w.id}>{w.name || w.name_ar}</option>
                            ))}
                        </select>
                        {errors.from_warehouse_id && <div className="error-message">{errors.from_warehouse_id}</div>}
                    </div>

                    <div className="form-group">
                        <label>{t('إلى مستودع', 'To warehouse')} <span className="text-red-500">*</span></label>
                        <select
                            className={errors.to_warehouse_id ? 'is-invalid' : ''}
                            value={data.to_warehouse_id}
                            onChange={e => setData('to_warehouse_id', e.target.value)}
                            required
                            disabled={viewing}
                        >
                            <option value="">{t('اختر المستودع', 'Select warehouse')}</option>
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

                    <div className="form-group">
                        <label>{t('ملاحظات', 'Notes')}</label>
                        <input
                            type="text"
                            value={data.notes}
                            onChange={e => setData('notes', e.target.value)}
                            placeholder={t("أي ملاحظات إضافية...", "Any additional notes...")}
                            disabled={viewing}
                        />
                    </div>
                </div>

                <div className="items-table-container" style={{ marginTop: '20px' }}>
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: '40%' }}>{t('المنتج', 'Product')}</th>
                                <th style={{ width: '25%' }}>{t('الوحدة', 'Unit')}</th>
                                <th style={{ width: '25%' }}>{t('الكمية', 'Quantity')}</th>
                                {!viewing && <th className="action-column">{t('حذف', 'Remove')}</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.map((item, index) => (
                                <tr key={index}>
                                    <td>
                                        <select
                                            className={errors[`items.${index}.product_id`] ? 'is-invalid' : ''}
                                            value={item.product_id}
                                            onChange={e => updateItem(index, 'product_id', e.target.value)}
                                            required
                                            disabled={viewing}
                                            style={{ width: '100%' }}
                                        >
                                            <option value="">{t('اختر المنتج', 'Select product')}</option>
                                            {products.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name || p.name_ar} ({p.sku || p.barcode})
                                                </option>
                                            ))}
                                        </select>
                                        {errors[`items.${index}.product_id`] &&
                                            <div className="error-message">{errors[`items.${index}.product_id`]}</div>
                                        }
                                    </td>
                                    <td>
                                        <select
                                            value={item.unit_id}
                                            onChange={e => updateItem(index, 'unit_id', e.target.value)}
                                            required
                                            disabled={viewing}
                                            style={{ width: '100%' }}
                                        >
                                            <option value="">{t('اختر الوحدة', 'Select unit')}</option>
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
                                            className={errors[`items.${index}.quantity`] ? 'is-invalid' : ''}
                                            value={item.quantity}
                                            onChange={e => updateItem(index, 'quantity', e.target.value)}
                                            required
                                            disabled={viewing}
                                            style={{ width: '100%' }}
                                        />
                                        {errors[`items.${index}.quantity`] &&
                                            <div className="error-message">{errors[`items.${index}.quantity`]}</div>
                                        }
                                    </td>
                                    {!viewing && (
                                        <td className="action-column">
                                            {data.items.length > 1 && (
                                                <button
                                                    type="button"
                                                    style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}
                                                    onClick={() => removeItem(index)}
                                                    title={t("حذف", "Remove")}
                                                >
                                                    <span className="material-icons-outlined">delete</span>
                                                </button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="form-actions">
                    <div style={{ marginRight: 'auto', color: '#64748b', fontSize: '14px' }}>
                        {t("إجمالي الأصناف:", "Total items:")} {data.items.length} | {t("المستخدم:", "User:")} {auth?.user?.name || 'Admin'}
                    </div>
                    {!viewing && (
                        <>
                            <button type="button" className="btn btn-secondary" onClick={addItem}>
                                {t('+ إضافة صنف', '+ Add line')}
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={processing}>
                                {processing ? t('جاري الحفظ...', 'Saving...') : t('حفظ التحويل', 'Save Transfer')}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </form>
    );

    return (
        <AdminLayout activeMenu="Inventory">
            <Head title={showForm ? (viewing ? t("عرض تحويل مخزني", "View Stock Transfer") : t("إضافة تحويل مخزني", "Add Stock Transfer")) : t("قائمة التحويلات المخزنية", "Stock Transfers List")} />

            <div className="transfer-stock-container" dir={isRtl ? 'rtl' : 'ltr'} lang={lang}>
                <div className="page-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#64748b', marginBottom: '10px' }}>
                        <Link href={`/${country}/${lang}/admin/inventory/products`} style={{ color: '#3b82f6' }}>{t("المخزن", "Inventory")}</Link>
                        <span>/</span>
                        {showForm ? (
                            <>
                                <button
                                    onClick={handleBackToList}
                                    style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0, fontSize: '14px' }}
                                >
                                    {t("التحويلات المخزنية", "Stock Transfers")}
                                </button>
                                <span>/</span>
                                <span style={{ color: '#111827', fontWeight: '600' }}>{viewing ? t("عرض", "View") : t("إضافة جديد", "Add New")}</span>
                            </>
                        ) : (
                            <span style={{ color: '#111827', fontWeight: '600' }}>{t("التحويلات المخزنية", "Stock Transfers")}</span>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h1>
                                {showForm ? (viewing ? t(`تحويل مخزني #${transfer.id}`, `Stock Transfer #${transfer.id}`) : t("إضافة تحويل مخزني", "Add Stock Transfer")) : t("قائمة التحويلات المخزنية", "Stock Transfers List")}
                            </h1>
                            <div style={{ color: '#64748b', fontSize: '14px' }}>
                                {showForm
                                    ? (viewing ? t("مراجعة تفاصيل التحويل المخزني", "Review stock transfer details") : t("أدخل بيانات التحويل المخزني بين المستودعات", "Enter stock transfer details between warehouses"))
                                    : t("عرض وإدارة عمليات التحويل المخزني المحفوظة", "View and manage saved stock transfer operations")}
                            </div>
                        </div>

                        {showForm && (
                            <button type="button" className="btn btn-secondary" onClick={handleBackToList}>
                                <span className="material-icons-outlined" style={{ verticalAlign: 'middle', marginRight: '5px' }}>arrow_back</span>
                                {t("العودة للقائمة", "Back to List")}
                            </button>
                        )}
                    </div>
                </div>

                {(pageErrors?.general || errors?.general) && (
                    <div style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '12px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #fecaca' }}>
                        {pageErrors?.general || errors?.general}
                    </div>
                )}

                {showForm ? <FormView /> : <ListView />}
            </div>
        </AdminLayout>
    );
}
