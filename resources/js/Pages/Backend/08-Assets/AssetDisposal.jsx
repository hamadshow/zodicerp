import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import Table from '../components/Table';
import BlankPage from '@/Components/BlankPage';
import Modal from '@/Components/Modal';
import { formatDate } from '@/utils/date';

const DISPOSAL_METHODS = ['sale', 'scrap', 'donation', 'loss', 'theft', 'exchange'];

const METHOD_LABELS = {
    sale: { en: 'Sale', ar: 'بيع' },
    scrap: { en: 'Scrap', ar: 'خردة' },
    donation: { en: 'Donation', ar: 'تبرع' },
    loss: { en: 'Loss', ar: 'فقد' },
    theft: { en: 'Theft', ar: 'سرقة' },
    exchange: { en: 'Exchange', ar: 'استبدال' },
};

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = () => ({
    asset_id: '',
    disposal_date: today(),
    disposal_method: 'sale',
    disposal_amount: '',
    disposal_currency_id: '',
    buyer_name: '',
    buyer_contact: '',
    invoice_number: '',
    notes: '',
});

export default function AssetDisposal({ disposals, assets, currencies }) {
    const { props } = usePage();
    const { localization } = props;
    const translations = localization?.translations || {};
    const isArabic = localization?.current_locale === 'ar';

    // Page-local translation lookup; falls back to the inline EN/AR strings.
    const __ = (key, fallback) => translations[`AssetDisposal.${key}`] || fallback;
    const t = (en, ar) => (isArabic ? ar : en);
    const methodLabel = (method) => {
        const entry = METHOD_LABELS[method];
        if (!entry) return method || '-';
        return isArabic ? entry.ar : entry.en;
    };

    // NOTE: flash success/error messages are surfaced by AdminLayout.

    // ----- pagination metadata (server-side, never re-sliced here) -----
    const rows = disposals?.data || [];
    const meta = disposals?.meta || disposals || {};
    const currentPage = meta.current_page || 1;
    const totalPages = meta.last_page || 1;
    const totalRecords = meta.total ?? rows.length;
    const perPage = meta.per_page || 10;

    const getLocalizedRoute = (name, params = {}) =>
        route(name, {
            country: localization?.country_code || 'sa',
            lang: localization?.current_locale || 'ar',
            ...params,
        }, false);

    const indexUrl = getLocalizedRoute('admin.assets.disposal.index');

    // ----- server-side list state (search / filters / sort) -----
    const [searchInput, setSearchInput] = useState(props?.search || '');
    const [assetFilter, setAssetFilter] = useState(props?.asset_id ? String(props.asset_id) : '');
    const [methodFilter, setMethodFilter] = useState(props?.disposal_method || '');
    const [sortState, setSortState] = useState({
        key: props?.sort_key || 'disposal_date',
        direction: props?.sort_dir || 'desc',
    });
    const searchTimer = useRef(null);
    useEffect(() => () => clearTimeout(searchTimer.current), []);

    const navigate = (overrides = {}, visitOptions = {}) => {
        const params = {
            search: searchInput.trim(),
            asset_id: assetFilter,
            disposal_method: methodFilter,
            sort_key: sortState.key,
            sort_dir: sortState.direction,
            page: currentPage,
            per_page: perPage,
            ...overrides,
        };
        Object.keys(params).forEach((key) => {
            if (params[key] === '' || params[key] === null || params[key] === undefined) {
                delete params[key];
            }
        });
        router.get(indexUrl, params, { preserveState: true, preserveScroll: true, ...visitOptions });
    };

    const handleSearchChange = (value) => {
        setSearchInput(value);
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => navigate({ search: value.trim(), page: 1 }), 400);
    };

    const handleAssetFilterChange = (value) => {
        setAssetFilter(value);
        navigate({ asset_id: value, page: 1 });
    };

    const handleMethodFilterChange = (value) => {
        setMethodFilter(value);
        navigate({ disposal_method: value, page: 1 });
    };

    const handleServerSort = (key, direction) => {
        setSortState({ key, direction: direction || 'desc' });
        navigate({ sort_key: key, sort_dir: direction || undefined, page: 1 });
    };

    // ----- modal state -----
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [viewing, setViewing] = useState(null);

    const { data, setData, post, put, processing, errors, reset, transform, clearErrors } =
        useForm(emptyForm());

    // Blank optional values must reach the backend as null, not ''.
    transform((payload) => ({
        ...payload,
        disposal_amount: payload.disposal_amount === '' ? null : payload.disposal_amount,
        disposal_currency_id: payload.disposal_currency_id === '' ? null : payload.disposal_currency_id,
    }));

    const selectedAsset = useMemo(
        () => (assets || []).find((a) => String(a.id) === String(data.asset_id)) || null,
        [assets, data.asset_id]
    );

    // Reference carrying values straight from the asset record (server recomputes the snapshot).
    const assetInfo = useMemo(() => {
        if (!selectedAsset) return null;
        const cost = Number(selectedAsset.total_cost ?? selectedAsset.unit_cost ?? 0) || 0;
        const accum = Number(selectedAsset.accumulated_depreciation ?? 0) || 0;
        return { cost, accum, nbv: cost - accum };
    }, [selectedAsset]);

    // Live estimate of the resulting gain/loss from the entered disposal amount.
    const estimatedGainLoss = useMemo(() => {
        if (!assetInfo || data.disposal_amount === '' || data.disposal_amount === null) return null;
        const amount = Number(data.disposal_amount);
        if (Number.isNaN(amount)) return null;
        return amount - assetInfo.nbv;
    }, [assetInfo, data.disposal_amount]);

    const openCreate = () => {
        setEditing(null);
        reset();
        clearErrors();
        setData('disposal_date', today());
        setShowForm(true);
    };

    const openEdit = (row) => {
        if (row.is_posted) return;
        setEditing(row);
        reset();
        clearErrors();
        setData({
            asset_id: String(row.asset_id),
            disposal_date: String(row.disposal_date || '').split('T')[0].split(' ')[0],
            disposal_method: row.disposal_method || 'sale',
            disposal_amount: row.disposal_amount ?? '',
            disposal_currency_id: row.disposal_currency_id ?? '',
            buyer_name: row.buyer_name || '',
            buyer_contact: row.buyer_contact || '',
            invoice_number: row.invoice_number || '',
            notes: row.notes || '',
        });
        setShowForm(true);
    };

    const closeModal = () => {
        setShowForm(false);
        setEditing(null);
        reset();
        clearErrors();
    };

    const submit = (event) => {
        event.preventDefault();
        if (editing) {
            put(getLocalizedRoute('admin.assets.disposal.update', { disposal: editing.id }), {
                preserveScroll: true,
                onSuccess: () => closeModal(),
            });
        } else {
            post(getLocalizedRoute('admin.assets.disposal.store'), {
                preserveScroll: true,
                onSuccess: () => closeModal(),
            });
        }
    };

    const handleDelete = (row) => {
        if (row.is_posted) return;
        if (window.confirm(t(
            'Are you sure you want to delete this disposal record?',
            'هل أنت متأكد من حذف سجل التخلص هذا؟'
        ))) {
            router.delete(getLocalizedRoute('admin.assets.disposal.destroy', { disposal: row.id }), {
                preserveScroll: true,
            });
        }
    };

    // ----- formatting -----
    const fmtAmount = (value) => {
        if (value === null || value === undefined || value === '') return '-';
        const number = Number(value);
        if (Number.isNaN(number)) return String(value);
        return number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    const fmtDate = (value) => formatDate(String(value || '').split('T')[0].split(' ')[0]) || '-';

    const columns = useMemo(() => [
        {
            header: __('disposal_date', t('Date', 'تاريخ التخلص')),
            key: 'disposal_date',
            sortable: true,
            render: (row) => <span className="asset-disposal__date">{fmtDate(row.disposal_date)}</span>,
        },
        {
            header: __('asset', t('Asset', 'الأصل')),
            key: 'asset_name',
            sortable: true,
            render: (row) => (
                <div className="asset-disposal__asset-cell">
                    <span className="asset-disposal__asset-icon">
                        <span className="material-icons-outlined">inventory_2</span>
                    </span>
                    <span className="asset-disposal__asset-meta">
                        <span className="asset-disposal__asset-name">{row.asset_name || '-'}</span>
                        {row.asset_number && (
                            <span className="asset-disposal__asset-number">#{row.asset_number}</span>
                        )}
                    </span>
                </div>
            ),
        },
        {
            header: __('method', t('Method', 'طريقة التخلص')),
            key: 'disposal_method',
            render: (row) => (
                <span className={`asset-disposal__badge asset-disposal__badge--method asset-disposal__badge--${row.disposal_method || 'sale'}`}>
                    {methodLabel(row.disposal_method)}
                </span>
            ),
        },
        {
            header: __('net_book_value', t('Net Book Value', 'القيمة الدفترية')),
            key: 'net_book_value',
            sortable: true,
            align: 'right',
            render: (row) => <span className="asset-disposal__amount">{fmtAmount(row.net_book_value)}</span>,
        },
        {
            header: __('disposal_amount', t('Disposal Amount', 'مبلغ التخلص')),
            key: 'disposal_amount',
            sortable: true,
            align: 'right',
            render: (row) => (
                <span className="asset-disposal__amount">
                    {fmtAmount(row.disposal_amount)}
                    {row.currency_code && row.disposal_amount !== null && (
                        <small className="asset-disposal__currency">{row.currency_code}</small>
                    )}
                </span>
            ),
        },
        {
            header: __('gain_loss', t('Gain / Loss', 'الربح / الخسارة')),
            key: 'gain_loss_amount',
            sortable: true,
            render: (row) => {
                if (row.gain_loss_amount === null || row.gain_loss_amount === undefined) {
                    return <span className="asset-disposal__amount">-</span>;
                }
                const gain = Number(row.gain_loss_amount) >= 0;
                return (
                    <span className={`asset-disposal__badge ${gain
                        ? 'asset-disposal__badge--gain'
                        : 'asset-disposal__badge--loss'}`}>
                        <span className="material-icons-outlined">{gain ? 'arrow_upward' : 'arrow_downward'}</span>
                        {gain ? '+' : '−'}{fmtAmount(Math.abs(Number(row.gain_loss_amount)))}
                    </span>
                );
            },
        },
        {
            header: __('status', t('Status', 'الحالة')),
            key: 'is_posted',
            render: (row) => (
                <span className={`asset-disposal__badge ${row.is_posted
                    ? 'asset-disposal__badge--posted'
                    : 'asset-disposal__badge--draft'}`}>
                    {row.is_posted ? t('Posted', 'مُرحّل') : t('Draft', 'مسودة')}
                </span>
            ),
        },
    ], [translations, isArabic]);

    const breadcrumbs = [
        { label: t('Dashboard', 'لوحة التحكم') },
        { label: t('Fixed Assets', 'الأصول الثابتة') },
        { label: t('Asset Disposal', 'التخلص من الأصول'), active: true },
    ];

    const fieldError = (key) => errors?.[key] && (
        <p className="asset-disposal__form-error">{errors[key]}</p>
    );

    return (
        <AdminLayout activeMenu="Fixed Assets">
            <Head title={t('Asset Disposal', 'التخلص من الأصول')} />

            <BlankPage className="asset-disposal" breadcrumbs={breadcrumbs}>
                {/* Page header */}
                <div className="asset-disposal__header">
                    <div className="asset-disposal__heading">
                        <h1 className="asset-disposal__title">{t('Asset Disposal', 'التخلص من الأصول')}</h1>
                        <p className="asset-disposal__subtitle">
                            {t(
                                'Record the retirement, sale or scrapping of fixed assets.',
                                'تسجيل التخلص من الأصول الثابتة أو بيعها أو تشليحها.'
                            )}
                        </p>
                    </div>
                    <div className="asset-disposal__actions">
                        <button type="button" className="btn btn-primary" onClick={openCreate}>
                            <span className="material-icons-outlined">add</span>
                            <span>{t('New Disposal', 'تخلص جديد')}</span>
                        </button>
                    </div>
                </div>

                {/* Table card */}
                <div className="asset-disposal__content">
                    <div className="asset-disposal__card">
                        <div className="asset-disposal__card-header">
                            <div className="asset-disposal__card-title-group">
                                <span className="asset-disposal__card-icon">
                                    <span className="material-icons-outlined">delete_forever</span>
                                </span>
                                <div>
                                    <h2 className="asset-disposal__card-title">
                                        {t('Disposal Records', 'سجل عمليات التخلص')}
                                    </h2>
                                    <p className="asset-disposal__card-desc">
                                        {t('All recorded asset disposals', 'جميع عمليات التخلص المسجلة')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Table
                            tableData={rows}
                            columns={columns}
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalRecords={totalRecords}
                            recordsPerPage={perPage}
                            serverSide={true}
                            onSort={handleServerSort}
                            sortKey={sortState.key}
                            sortDirection={sortState.direction}
                            onPageChange={(page) => navigate({ page })}
                            onRecordsPerPageChange={(size) => navigate({ per_page: size, page: 1 })}
                            onView={(row) => setViewing(row)}
                            onEdit={openEdit}
                            onDelete={handleDelete}
                            viewTitle={t('View', 'عرض')}
                            editTitle={t('Edit', 'تعديل')}
                            deleteTitle={t('Delete', 'حذف')}
                            emptyIcon="delete_forever"
                            emptyMessage={
                                <div className="asset-disposal__empty">
                                    <p>{t('No disposals recorded.', 'لا توجد عمليات تخليص مسجلة.')}</p>
                                </div>
                            }
                            showToolbar={true}
                            toolbarSearch={true}
                            toolbarSearchPlaceholder={t('Search...', 'بحث...')}
                            toolbarSearchValue={searchInput}
                            onToolbarSearch={handleSearchChange}
                            showRefreshButton={true}
                            onRefresh={() => navigate()}
                            toolbarActions={
                                <div className="asset-disposal__filters">
                                    <select
                                        className="asset-disposal__filter-select"
                                        value={assetFilter}
                                        onChange={(event) => handleAssetFilterChange(event.target.value)}
                                        aria-label={t('Filter by asset', 'تصفية حسب الأصل')}
                                    >
                                        <option value="">{t('All assets', 'كل الأصول')}</option>
                                        {(assets || []).map((asset) => (
                                            <option key={asset.id} value={asset.id}>
                                                {asset.name}{asset.asset_number ? ` (#${asset.asset_number})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        className="asset-disposal__filter-select"
                                        value={methodFilter}
                                        onChange={(event) => handleMethodFilterChange(event.target.value)}
                                        aria-label={t('Filter by method', 'تصفية حسب الطريقة')}
                                    >
                                        <option value="">{t('All methods', 'كل الطرق')}</option>
                                        {DISPOSAL_METHODS.map((method) => (
                                            <option key={method} value={method}>{methodLabel(method)}</option>
                                        ))}
                                    </select>
                                </div>
                            }
                        />
                    </div>
                </div>
            </BlankPage>

            {/* Create / Edit modal */}
            <Modal show={showForm} onClose={closeModal} maxWidth="lg">
                <form onSubmit={submit} className="asset-disposal__modal-body">
                    <div className="asset-disposal__modal-header">
                        <div className="asset-disposal__modal-title">
                            <span className="material-icons-outlined">delete_forever</span>
                            <h2>
                                {editing
                                    ? t('Edit Disposal', 'تعديل سجل التخلص')
                                    : t('New Disposal', 'تخلص جديد')}
                            </h2>
                        </div>
                        <button
                            type="button"
                            className="asset-disposal__modal-close"
                            onClick={closeModal}
                            aria-label={t('Close', 'إغلاق')}
                        >
                            <span className="material-icons-outlined">close</span>
                        </button>
                    </div>

                    <div className="asset-disposal__modal-form">
                        <div className="asset-disposal__field asset-disposal__field--full">
                            <label className="asset-disposal__label">{t('Asset', 'الأصل')} *</label>
                            <select
                                className="asset-disposal__input"
                                value={data.asset_id}
                                disabled={!!editing}
                                onChange={(event) => setData('asset_id', event.target.value)}
                                required
                            >
                                <option value="">{t('Select Asset', 'اختر الأصل')}</option>
                                {(assets || []).map((asset) => (
                                    <option key={asset.id} value={asset.id}>
                                        {asset.name}{asset.asset_number ? ` (#${asset.asset_number})` : ''}
                                    </option>
                                ))}
                            </select>
                            {fieldError('asset_id')}
                            {editing && (
                                <p className="asset-disposal__hint">
                                    {t(
                                        'The asset cannot be changed after creation.',
                                        'لا يمكن تغيير الأصل بعد الإنشاء.'
                                    )}
                                </p>
                            )}
                        </div>

                        {/* Asset reference values (system snapshot is recomputed server-side) */}
                        {assetInfo && !editing && (
                            <div className="asset-disposal__snapshot asset-disposal__field--full">
                                <p className="asset-disposal__snapshot-title">
                                    {t('Current asset carrying values', 'القيم الدفترية الحالية للأصل')}
                                </p>
                                <div className="asset-disposal__snapshot-grid">
                                    <div>
                                        <span>{t('Original Cost', 'التكلفة الأصلية')}</span>
                                        <strong>{fmtAmount(assetInfo.cost)}</strong>
                                    </div>
                                    <div>
                                        <span>{t('Accum. Depreciation', 'مجمع الإهلاك')}</span>
                                        <strong>{fmtAmount(assetInfo.accum)}</strong>
                                    </div>
                                    <div>
                                        <span>{t('Net Book Value', 'القيمة الدفترية')}</span>
                                        <strong>{fmtAmount(assetInfo.nbv)}</strong>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Immutable stored snapshot when editing */}
                        {editing && (
                            <div className="asset-disposal__snapshot asset-disposal__snapshot--locked asset-disposal__field--full">
                                <p className="asset-disposal__snapshot-title">
                                    {t('Recorded snapshot (immutable)', 'القيم المسجلة (غير قابلة للتعديل)')}
                                </p>
                                <div className="asset-disposal__snapshot-grid">
                                    <div>
                                        <span>{t('Original Cost', 'التكلفة الأصلية')}</span>
                                        <strong>{fmtAmount(editing.original_cost)}</strong>
                                    </div>
                                    <div>
                                        <span>{t('Accum. Depreciation', 'مجمع الإهلاك')}</span>
                                        <strong>{fmtAmount(editing.accumulated_depreciation)}</strong>
                                    </div>
                                    <div>
                                        <span>{t('Net Book Value', 'القيمة الدفترية')}</span>
                                        <strong>{fmtAmount(editing.net_book_value)}</strong>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="asset-disposal__field">
                            <label className="asset-disposal__label">
                                {t('Disposal Date', 'تاريخ التخلص')} *
                            </label>
                            <input
                                type="date"
                                className="asset-disposal__input"
                                value={data.disposal_date}
                                onChange={(event) => setData('disposal_date', event.target.value)}
                                required
                            />
                            {fieldError('disposal_date')}
                        </div>

                        <div className="asset-disposal__field">
                            <label className="asset-disposal__label">
                                {t('Disposal Method', 'طريقة التخلص')} *
                            </label>
                            <select
                                className="asset-disposal__input"
                                value={data.disposal_method}
                                onChange={(event) => setData('disposal_method', event.target.value)}
                                required
                            >
                                {DISPOSAL_METHODS.map((method) => (
                                    <option key={method} value={method}>{methodLabel(method)}</option>
                                ))}
                            </select>
                            {fieldError('disposal_method')}
                        </div>

                        <div className="asset-disposal__field">
                            <label className="asset-disposal__label">
                                {t('Disposal Amount', 'مبلغ التخلص')}
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.0001"
                                className="asset-disposal__input"
                                value={data.disposal_amount}
                                onChange={(event) => setData('disposal_amount', event.target.value)}
                                placeholder={t('Optional proceeds', 'المتحصلات (اختياري)')}
                            />
                            {fieldError('disposal_amount')}
                        </div>

                        <div className="asset-disposal__field">
                            <label className="asset-disposal__label">
                                {t('Currency', 'العملة')}
                            </label>
                            <select
                                className="asset-disposal__input"
                                value={data.disposal_currency_id}
                                onChange={(event) => setData('disposal_currency_id', event.target.value)}
                            >
                                <option value="">{t('Default currency', 'العملة الافتراضية')}</option>
                                {(currencies || []).map((currency) => (
                                    <option key={currency.id} value={currency.id}>
                                        {currency.code} — {currency.name}
                                    </option>
                                ))}
                            </select>
                            {fieldError('disposal_currency_id')}
                        </div>

                        {/* Live gain/loss estimate (authoritative value is computed on save) */}
                        {estimatedGainLoss !== null && (
                            <div className="asset-disposal__preview asset-disposal__field--full">
                                <span className="asset-disposal__preview-label">
                                    {t('Estimated Gain / Loss', 'الربح / الخسارة المتوقعة')}
                                </span>
                                <strong className={estimatedGainLoss >= 0
                                    ? 'asset-disposal__preview-value asset-disposal__preview-value--gain'
                                    : 'asset-disposal__preview-value asset-disposal__preview-value--loss'}>
                                    {estimatedGainLoss >= 0 ? '+' : '−'}{fmtAmount(Math.abs(estimatedGainLoss))}
                                </strong>
                            </div>
                        )}

                        <div className="asset-disposal__field">
                            <label className="asset-disposal__label">
                                {t('Buyer / Recipient', 'المشتري / المستلم')}
                            </label>
                            <input
                                type="text"
                                className="asset-disposal__input"
                                maxLength={200}
                                value={data.buyer_name}
                                onChange={(event) => setData('buyer_name', event.target.value)}
                            />
                            {fieldError('buyer_name')}
                        </div>

                        <div className="asset-disposal__field">
                            <label className="asset-disposal__label">
                                {t('Buyer Contact', 'بيانات الاتصال')}
                            </label>
                            <input
                                type="text"
                                className="asset-disposal__input"
                                maxLength={500}
                                value={data.buyer_contact}
                                onChange={(event) => setData('buyer_contact', event.target.value)}
                            />
                            {fieldError('buyer_contact')}
                        </div>

                        <div className="asset-disposal__field">
                            <label className="asset-disposal__label">
                                {t('Invoice Number', 'رقم الفاتورة')}
                            </label>
                            <input
                                type="text"
                                className="asset-disposal__input"
                                maxLength={100}
                                value={data.invoice_number}
                                onChange={(event) => setData('invoice_number', event.target.value)}
                            />
                            {fieldError('invoice_number')}
                        </div>

                        <div className="asset-disposal__field asset-disposal__field--full">
                            <label className="asset-disposal__label">
                                {t('Notes', 'ملاحظات')}
                            </label>
                            <textarea
                                className="asset-disposal__input asset-disposal__textarea"
                                rows={3}
                                maxLength={5000}
                                value={data.notes}
                                onChange={(event) => setData('notes', event.target.value)}
                            />
                            {fieldError('notes')}
                        </div>
                    </div>

                    <div className="asset-disposal__modal-footer">
                        <button type="button" className="btn btn-outline" onClick={closeModal}>
                            {t('Cancel', 'إلغاء')}
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={processing}>
                            {processing
                                ? t('Saving...', 'جارٍ الحفظ...')
                                : (editing
                                    ? t('Save Changes', 'حفظ التغييرات')
                                    : t('Record Disposal', 'تسجيل التخلص'))}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* View modal */}
            <Modal show={!!viewing} onClose={() => setViewing(null)} maxWidth="lg">
                {viewing && (
                    <div className="asset-disposal__modal-body">
                        <div className="asset-disposal__modal-header">
                            <div className="asset-disposal__modal-title">
                                <span className="material-icons-outlined">visibility</span>
                                <h2>{t('Disposal Details', 'تفاصيل التخلص')}</h2>
                            </div>
                            <button
                                type="button"
                                className="asset-disposal__modal-close"
                                onClick={() => setViewing(null)}
                                aria-label={t('Close', 'إغلاق')}
                            >
                                <span className="material-icons-outlined">close</span>
                            </button>
                        </div>

                        <div className="asset-disposal__view-grid">
                            <div className="asset-disposal__view-item asset-disposal__view-item--full">
                                <span>{t('Asset', 'الأصل')}</span>
                                <strong>
                                    {viewing.asset_name || '-'}
                                    {viewing.asset_number ? ` (#${viewing.asset_number})` : ''}
                                </strong>
                            </div>

                            <div className="asset-disposal__view-item">
                                <span>{t('Disposal Date', 'تاريخ التخلص')}</span>
                                <strong>{fmtDate(viewing.disposal_date)}</strong>
                            </div>
                            <div className="asset-disposal__view-item">
                                <span>{t('Disposal Method', 'طريقة التخلص')}</span>
                                <strong>{methodLabel(viewing.disposal_method)}</strong>
                            </div>
                            <div className="asset-disposal__view-item">
                                <span>{t('Status', 'الحالة')}</span>
                                <strong>
                                    <span className={`asset-disposal__badge ${viewing.is_posted
                                        ? 'asset-disposal__badge--posted'
                                        : 'asset-disposal__badge--draft'}`}>
                                        {viewing.is_posted ? t('Posted', 'مُرحّل') : t('Draft', 'مسودة')}
                                    </span>
                                </strong>
                            </div>

                            <div className="asset-disposal__view-item">
                                <span>{t('Original Cost', 'التكلفة الأصلية')}</span>
                                <strong>{fmtAmount(viewing.original_cost)}</strong>
                            </div>
                            <div className="asset-disposal__view-item">
                                <span>{t('Accum. Depreciation', 'مجمع الإهلاك')}</span>
                                <strong>{fmtAmount(viewing.accumulated_depreciation)}</strong>
                            </div>
                            <div className="asset-disposal__view-item">
                                <span>{t('Net Book Value', 'القيمة الدفترية')}</span>
                                <strong>{fmtAmount(viewing.net_book_value)}</strong>
                            </div>

                            <div className="asset-disposal__view-item">
                                <span>{t('Disposal Amount', 'مبلغ التخلص')}</span>
                                <strong>
                                    {fmtAmount(viewing.disposal_amount)}
                                    {viewing.currency_code ? ` ${viewing.currency_code}` : ''}
                                </strong>
                            </div>
                            <div className="asset-disposal__view-item">
                                <span>{t('Gain / Loss', 'الربح / الخسارة')}</span>
                                <strong>{viewing.gain_loss_amount === null
                                    ? '-'
                                    : fmtAmount(viewing.gain_loss_amount)}</strong>
                            </div>
                            <div className="asset-disposal__view-item">
                                <span>{t('Invoice Number', 'رقم الفاتورة')}</span>
                                <strong>{viewing.invoice_number || '-'}</strong>
                            </div>

                            <div className="asset-disposal__view-item">
                                <span>{t('Buyer / Recipient', 'المشتري / المستلم')}</span>
                                <strong>{viewing.buyer_name || '-'}</strong>
                            </div>
                            <div className="asset-disposal__view-item">
                                <span>{t('Buyer Contact', 'بيانات الاتصال')}</span>
                                <strong>{viewing.buyer_contact || '-'}</strong>
                            </div>
                            <div className="asset-disposal__view-item">
                                <span>{t('Journal Entry', 'القيد المحاسبي')}</span>
                                <strong>{viewing.journal_entry_id ?? '-'}</strong>
                            </div>

                            <div className="asset-disposal__view-item asset-disposal__view-item--full">
                                <span>{t('Notes', 'ملاحظات')}</span>
                                <strong>{viewing.notes || '-'}</strong>
                            </div>
                            <div className="asset-disposal__view-item">
                                <span>{t('Created By', 'أنشئ بواسطة')}</span>
                                <strong>{viewing.created_by_name || '-'}</strong>
                            </div>
                            <div className="asset-disposal__view-item">
                                <span>{t('Created At', 'تاريخ الإنشاء')}</span>
                                <strong>{fmtDate(viewing.created_at)}</strong>
                            </div>
                        </div>

                        <div className="asset-disposal__modal-footer">
                            <button type="button" className="btn btn-outline" onClick={() => setViewing(null)}>
                                {t('Close', 'إغلاق')}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </AdminLayout>
    );
}
