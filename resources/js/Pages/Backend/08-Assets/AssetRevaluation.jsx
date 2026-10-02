import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import Table from '../components/Table';
import BlankPage from '@/Components/BlankPage';
import Modal from '@/Components/Modal';
import { formatDate } from '@/utils/date';

const emptyForm = {
    asset_id: '',
    revaluation_date: new Date().toISOString().slice(0, 10),
    new_cost: '',
    new_accumulated_depreciation: '',
    reason: '',
    notes: '',
};

export default function AssetRevaluation({ revaluations, assets }) {
    const { props } = usePage();
    const { localization } = props;
    const translations = localization?.translations || {};
    const isArabic = localization?.current_locale === 'ar';

    const __ = (key, fallback) => translations[`AssetRevaluation.${key}`] || fallback;

    // NOTE: flash success/error notifications are displayed by AdminLayout (useNotification).

    const rows = revaluations?.data || [];
    const meta = revaluations?.meta || revaluations || {};
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

    const indexUrl = getLocalizedRoute('admin.assets.revaluation.index');

    // ----- server-side list state (search / asset filter / sort) -----
    const [searchInput, setSearchInput] = useState(props?.search || '');
    const [assetFilter, setAssetFilter] = useState(props?.asset_id ? String(props.asset_id) : '');
    const [sortState, setSortState] = useState({
        key: props?.sort_key || 'revaluation_date',
        direction: props?.sort_dir || 'desc',
    });
    const searchTimer = useRef(null);
    useEffect(() => () => clearTimeout(searchTimer.current), []);

    const navigate = (overrides = {}, visitOptions = {}) => {
        const params = {
            search: searchInput.trim(),
            asset_id: assetFilter,
            sort_key: sortState.key,
            sort_dir: sortState.direction,
            page: currentPage,
            per_page: perPage,
            ...overrides,
        };
        Object.keys(params).forEach((k) => {
            if (params[k] === '' || params[k] === null || params[k] === undefined) delete params[k];
        });
        router.get(indexUrl, params, { preserveState: true, preserveScroll: true, ...visitOptions });
    };

    const handleSearchChange = (value) => {
        setSearchInput(value);
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            navigate({ search: value.trim(), page: 1 });
        }, 400);
    };

    const handleAssetFilterChange = (value) => {
        setAssetFilter(value);
        navigate({ asset_id: value, page: 1 });
    };

    const handleServerSort = (key, direction) => {
        setSortState({ key, direction: direction || 'desc' });
        navigate({ sort_key: key, sort_dir: direction || undefined, page: 1 });
    };

    // ----- modal state -----
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null); // null = create, row = edit
    const [viewing, setViewing] = useState(null);

    const { data, setData, post, put, processing, errors, reset } = useForm({ ...emptyForm });

    const selectedAsset = useMemo(
        () => (assets || []).find((a) => String(a.id) === String(data.asset_id)) || null,
        [assets, data.asset_id]
    );

    // Current asset carrying values shown as read-only snapshot guidance.
    const assetSnapshot = useMemo(() => {
        if (!selectedAsset) return null;
        const cost = Number(selectedAsset.total_cost ?? 0) ||
            Number(selectedAsset.unit_cost ?? 0) * Number(selectedAsset.quantity ?? 1);
        const accum = Number(selectedAsset.accumulated_depreciation ?? 0);
        return {
            cost,
            accum,
            nbv: Number(selectedAsset.net_book_value ?? cost - accum),
        };
    }, [selectedAsset]);

    const openCreate = () => {
        setEditing(null);
        reset();
        setData('revaluation_date', new Date().toISOString().slice(0, 10));
        setShowForm(true);
    };

    const openEdit = (r) => {
        if (r.is_posted) return;
        setEditing(r);
        reset();
        setData({
            asset_id: String(r.asset_id),
            revaluation_date: (r.revaluation_date || '').split('T')[0].split(' ')[0],
            new_cost: r.new_cost ?? '',
            new_accumulated_depreciation: r.new_accumulated_depreciation ?? '',
            reason: r.reason || '',
            notes: r.notes || '',
        });
        setShowForm(true);
    };

    const closeModal = () => {
        setShowForm(false);
        setEditing(null);
        reset();
    };

    const submit = (e) => {
        e.preventDefault();
        if (editing) {
            put(getLocalizedRoute('admin.assets.revaluation.update', { revaluation: editing.id }), {
                onSuccess: () => closeModal(),
            });
        } else {
            post(getLocalizedRoute('admin.assets.revaluation.store'), {
                onSuccess: () => closeModal(),
            });
        }
    };

    const handleDelete = (r) => {
        if (r.is_posted) return;
        if (window.confirm(isArabic
            ? 'هل أنت متأكد من حذف هذا التقييم؟'
            : 'Are you sure you want to delete this revaluation?')) {
            router.delete(getLocalizedRoute('admin.assets.revaluation.destroy', { revaluation: r.id }), {
                preserveScroll: true,
            });
        }
    };

    // ----- formatting -----
    const currencyCode = localization?.currency_code || 'SAR';
    const fmtAmount = (v) => {
        if (v === null || v === undefined || v === '') return '-';
        const n = Number(v);
        if (Number.isNaN(n)) return String(v);
        return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    // formatDate expects a plain date (yyyy-mm-dd); DB datetimes are space-separated.
    const fmtDate = (v) => formatDate(String(v || '').split(' ')[0].split('T')[0]) || '-';

    const columns = useMemo(() => [
        {
            header: __('revaluation_date', isArabic ? 'تاريخ التقييم' : 'Date'),
            key: 'revaluation_date',
            sortable: true,
            render: (r) => <span className="asset-revaluation__date">{fmtDate(r.revaluation_date)}</span>,
        },
        {
            header: __('asset', isArabic ? 'الأصل' : 'Asset'),
            key: 'asset_name',
            sortable: true,
            render: (r) => (
                <div className="asset-revaluation__asset-cell">
                    <span className="asset-revaluation__asset-icon">
                        <span className="material-icons-outlined">inventory_2</span>
                    </span>
                    <span className="asset-revaluation__asset-meta">
                        <span className="asset-revaluation__asset-name">{r.asset_name || '-'}</span>
                        {r.asset_number && (
                            <span className="asset-revaluation__asset-number">#{r.asset_number}</span>
                        )}
                    </span>
                </div>
            ),
        },
        {
            header: __('new_cost', isArabic ? 'التكلفة الجديدة' : 'New Cost'),
            key: 'new_cost',
            sortable: true,
            align: 'right',
            render: (r) => <span className="asset-revaluation__amount">{fmtAmount(r.new_cost)}</span>,
        },
        {
            header: __('new_net_book_value', isArabic ? 'القيمة الدفترية الجديدة' : 'New NBV'),
            key: 'new_net_book_value',
            sortable: true,
            align: 'right',
            render: (r) => <span className="asset-revaluation__amount">{fmtAmount(r.new_net_book_value)}</span>,
        },
        {
            header: __('impact', isArabic ? 'الأثر' : 'Impact'),
            key: 'impact',
            render: (r) => {
                if (r.revaluation_surplus) {
                    return (
                        <span className="asset-revaluation__badge asset-revaluation__badge--surplus">
                            <span className="material-icons-outlined">arrow_upward</span>
                            +{fmtAmount(r.revaluation_surplus)}
                        </span>
                    );
                }
                if (r.revaluation_deficit) {
                    return (
                        <span className="asset-revaluation__badge asset-revaluation__badge--deficit">
                            <span className="material-icons-outlined">arrow_downward</span>
                            −{fmtAmount(r.revaluation_deficit)}
                        </span>
                    );
                }
                return <span className="asset-revaluation__amount">-</span>;
            },
        },
        {
            header: __('status', isArabic ? 'الحالة' : 'Status'),
            key: 'is_posted',
            render: (r) => (
                <span className={`asset-revaluation__badge ${r.is_posted
                    ? 'asset-revaluation__badge--posted'
                    : 'asset-revaluation__badge--draft'}`}>
                    {r.is_posted
                        ? (isArabic ? 'مُرحّل' : 'Posted')
                        : (isArabic ? 'مسودة' : 'Draft')}
                </span>
            ),
        },
    ], [translations, isArabic]);

    const breadcrumbs = [
        { label: isArabic ? 'لوحة التحكم' : 'Dashboard' },
        { label: isArabic ? 'الأصول الثابتة' : 'Fixed Assets' },
        { label: isArabic ? 'إعادة تقييم الأصول' : 'Asset Revaluation', active: true },
    ];

    const fieldError = (key) => errors?.[key] && (
        <p className="asset-revaluation__form-error">{errors[key]}</p>
    );

    return (
        <AdminLayout activeMenu="Fixed Assets">
            <Head title={isArabic ? 'إعادة تقييم الأصول' : 'Asset Revaluation'} />

            <BlankPage className="asset-revaluation" breadcrumbs={breadcrumbs}>
                {/* Page header */}
                <div className="asset-revaluation__header">
                    <div className="asset-revaluation__heading">
                        <h1 className="asset-revaluation__title">
                            {isArabic ? 'إعادة تقييم الأصول' : 'Asset Revaluation'}
                        </h1>
                        <p className="asset-revaluation__subtitle">
                            {isArabic
                                ? 'تعديل القيمة الدفترية للأصول لتعكس قيمتها العادلة.'
                                : 'Adjust the carrying amount of assets to their fair value.'}
                        </p>
                    </div>
                    <div className="asset-revaluation__actions">
                        <button type="button" className="btn btn-primary" onClick={openCreate}>
                            <span className="material-icons-outlined">add</span>
                            <span>{isArabic ? 'تقييم جديد' : 'New Revaluation'}</span>
                        </button>
                    </div>
                </div>

                {/* Table card */}
                <div className="asset-revaluation__content">
                    <div className="asset-revaluation__card">
                        <div className="asset-revaluation__card-header">
                            <div className="asset-revaluation__card-title-group">
                                <span className="asset-revaluation__card-icon">
                                    <span className="material-icons-outlined">trending_up</span>
                                </span>
                                <div>
                                    <h2 className="asset-revaluation__card-title">
                                        {isArabic ? 'سجل التقييمات' : 'Revaluation History'}
                                    </h2>
                                    <p className="asset-revaluation__card-desc">
                                        {isArabic
                                            ? 'جميع عمليات إعادة التقييم المسجلة'
                                            : 'All recorded asset revaluations'}
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
                            onView={(r) => setViewing(r)}
                            onEdit={openEdit}
                            onDelete={handleDelete}
                            editTitle={isArabic ? 'تعديل' : 'Edit'}
                            deleteTitle={isArabic ? 'حذف' : 'Delete'}
                            emptyIcon="trending_up"
                            emptyMessage={
                                <div className="asset-revaluation__empty">
                                    <span className="material-icons-outlined">trending_up</span>
                                    <p>{isArabic ? 'لا توجد تقييمات.' : 'No revaluations.'}</p>
                                </div>
                            }
                            showToolbar={true}
                            toolbarSearch={true}
                            toolbarSearchPlaceholder={isArabic ? 'بحث...' : 'Search...'}
                            toolbarSearchValue={searchInput}
                            onToolbarSearch={handleSearchChange}
                            showRefreshButton={true}
                            onRefresh={() => navigate()}
                            toolbarActions={
                                <select
                                    className="asset-revaluation__filter-select"
                                    value={assetFilter}
                                    onChange={(e) => handleAssetFilterChange(e.target.value)}
                                    aria-label={isArabic ? 'تصفية حسب الأصل' : 'Filter by asset'}
                                >
                                    <option value="">{isArabic ? 'كل الأصول' : 'All assets'}</option>
                                    {(assets || []).map((a) => (
                                        <option key={a.id} value={a.id}>
                                            {a.name}{a.asset_number ? ` (#${a.asset_number})` : ''}
                                        </option>
                                    ))}
                                </select>
                            }
                        />
                    </div>
                </div>
            </BlankPage>

            {/* Create / Edit modal — shared Modal renders via portal, styles are page-namespaced */}
            <Modal show={showForm} onClose={closeModal} maxWidth="lg">
                <form onSubmit={submit} className="asset-revaluation__modal-body">
                    <div className="asset-revaluation__modal-header">
                        <div className="asset-revaluation__modal-title">
                            <span className="material-icons-outlined">trending_up</span>
                            <h2>
                                {editing
                                    ? (isArabic ? 'تعديل إعادة التقييم' : 'Edit Revaluation')
                                    : (isArabic ? 'إعادة تقييم جديدة' : 'New Revaluation')}
                            </h2>
                        </div>
                        <button
                            type="button"
                            className="asset-revaluation__modal-close"
                            onClick={closeModal}
                            aria-label={isArabic ? 'إغلاق' : 'Close'}
                        >
                            <span className="material-icons-outlined">close</span>
                        </button>
                    </div>

                    <div className="asset-revaluation__modal-form">
                        <div className="asset-revaluation__field asset-revaluation__field--full">
                            <label className="asset-revaluation__label">
                                {isArabic ? 'الأصل' : 'Asset'} *
                            </label>
                            <select
                                className="asset-revaluation__input"
                                value={data.asset_id}
                                disabled={!!editing}
                                onChange={(e) => setData('asset_id', e.target.value)}
                                required
                            >
                                <option value="">{isArabic ? 'اختر الأصل' : 'Select Asset'}</option>
                                {(assets || []).map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.name}{a.asset_number ? ` (#${a.asset_number})` : ''}
                                    </option>
                                ))}
                            </select>
                            {fieldError('asset_id')}
                            {editing && (
                                <p className="asset-revaluation__hint">
                                    {isArabic
                                        ? 'لا يمكن تغيير الأصل بعد إنشاء التقييم.'
                                        : 'The asset cannot be changed after creation.'}
                                </p>
                            )}
                        </div>

                        {/* Snapshot of the asset's current carrying values (system-calculated) */}
                        {assetSnapshot && !editing && (
                            <div className="asset-revaluation__snapshot asset-revaluation__field--full">
                                <p className="asset-revaluation__snapshot-title">
                                    {isArabic ? 'القيم الحالية (تُسجَّل كقيم سابقة)' : 'Current values (recorded as previous)'}
                                </p>
                                <div className="asset-revaluation__snapshot-grid">
                                    <div>
                                        <span>{isArabic ? 'التكلفة' : 'Cost'}</span>
                                        <strong>{fmtAmount(assetSnapshot.cost.toFixed(4))}</strong>
                                    </div>
                                    <div>
                                        <span>{isArabic ? 'مجمع الإهلاك' : 'Accum. Depr.'}</span>
                                        <strong>{fmtAmount(assetSnapshot.accum.toFixed(4))}</strong>
                                    </div>
                                    <div>
                                        <span>{isArabic ? 'القيمة الدفترية' : 'Net Book Value'}</span>
                                        <strong>{fmtAmount(assetSnapshot.nbv.toFixed(4))}</strong>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Immutable snapshot when editing */}
                        {editing && (
                            <div className="asset-revaluation__snapshot asset-revaluation__field--full">
                                <p className="asset-revaluation__snapshot-title">
                                    {isArabic ? 'القيم السابقة (غير قابلة للتعديل)' : 'Previous values (immutable)'}
                                </p>
                                <div className="asset-revaluation__snapshot-grid">
                                    <div>
                                        <span>{isArabic ? 'التكلفة' : 'Cost'}</span>
                                        <strong>{fmtAmount(editing.previous_cost)}</strong>
                                    </div>
                                    <div>
                                        <span>{isArabic ? 'مجمع الإهلاك' : 'Accum. Depr.'}</span>
                                        <strong>{fmtAmount(editing.previous_accumulated_depreciation)}</strong>
                                    </div>
                                    <div>
                                        <span>{isArabic ? 'القيمة الدفترية' : 'Net Book Value'}</span>
                                        <strong>{fmtAmount(editing.previous_net_book_value)}</strong>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="asset-revaluation__field">
                            <label className="asset-revaluation__label">
                                {isArabic ? 'تاريخ التقييم' : 'Revaluation Date'} *
                            </label>
                            <input
                                type="date"
                                className="asset-revaluation__input"
                                value={data.revaluation_date}
                                onChange={(e) => setData('revaluation_date', e.target.value)}
                                required
                            />
                            {fieldError('revaluation_date')}
                        </div>

                        <div className="asset-revaluation__field">
                            <label className="asset-revaluation__label">
                                {isArabic ? 'التكلفة الجديدة' : 'New Cost'} *
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.0001"
                                className="asset-revaluation__input"
                                value={data.new_cost}
                                onChange={(e) => setData('new_cost', e.target.value)}
                                required
                            />
                            {fieldError('new_cost')}
                        </div>

                        <div className="asset-revaluation__field asset-revaluation__field--full">
                            <label className="asset-revaluation__label">
                                {isArabic ? 'مجمع الإهلاك الجديد' : 'New Accumulated Depreciation'} *
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.0001"
                                className="asset-revaluation__input"
                                value={data.new_accumulated_depreciation}
                                onChange={(e) => setData('new_accumulated_depreciation', e.target.value)}
                                required
                            />
                            {fieldError('new_accumulated_depreciation')}
                            <p className="asset-revaluation__hint">
                                {isArabic
                                    ? `القيمة الدفترية الجديدة = التكلفة − مجمع الإهلاك (${currencyCode})`
                                    : `New net book value = cost − accumulated depreciation (${currencyCode})`}
                            </p>
                        </div>

                        <div className="asset-revaluation__field asset-revaluation__field--full">
                            <label className="asset-revaluation__label">
                                {isArabic ? 'السبب' : 'Reason'}
                            </label>
                            <input
                                type="text"
                                className="asset-revaluation__input"
                                value={data.reason}
                                onChange={(e) => setData('reason', e.target.value)}
                            />
                            {fieldError('reason')}
                        </div>

                        <div className="asset-revaluation__field asset-revaluation__field--full">
                            <label className="asset-revaluation__label">
                                {isArabic ? 'ملاحظات' : 'Notes'}
                            </label>
                            <textarea
                                className="asset-revaluation__input asset-revaluation__textarea"
                                rows={3}
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                            />
                            {fieldError('notes')}
                        </div>
                    </div>

                    <div className="asset-revaluation__modal-footer">
                        <button type="button" className="btn btn-outline" onClick={closeModal}>
                            {isArabic ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={processing}>
                            {processing
                                ? (isArabic ? 'جارٍ الحفظ...' : 'Saving...')
                                : (editing
                                    ? (isArabic ? 'حفظ التغييرات' : 'Save Changes')
                                    : (isArabic ? 'تسجيل التقييم' : 'Record Revaluation'))}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* View modal */}
            <Modal show={!!viewing} onClose={() => setViewing(null)} maxWidth="lg">
                {viewing && (
                    <div className="asset-revaluation__modal-body">
                        <div className="asset-revaluation__modal-header">
                            <div className="asset-revaluation__modal-title">
                                <span className="material-icons-outlined">visibility</span>
                                <h2>{isArabic ? 'تفاصيل إعادة التقييم' : 'Revaluation Details'}</h2>
                            </div>
                            <button
                                type="button"
                                className="asset-revaluation__modal-close"
                                onClick={() => setViewing(null)}
                                aria-label={isArabic ? 'إغلاق' : 'Close'}
                            >
                                <span className="material-icons-outlined">close</span>
                            </button>
                        </div>

                        <div className="asset-revaluation__view-grid">
                            <div className="asset-revaluation__view-item asset-revaluation__view-item--full">
                                <span>{isArabic ? 'الأصل' : 'Asset'}</span>
                                <strong>
                                    {viewing.asset_name || '-'}
                                    {viewing.asset_number ? ` (#${viewing.asset_number})` : ''}
                                </strong>
                            </div>
                            <div className="asset-revaluation__view-item">
                                <span>{isArabic ? 'تاريخ التقييم' : 'Revaluation Date'}</span>
                                <strong>{fmtDate(viewing.revaluation_date)}</strong>
                            </div>
                            <div className="asset-revaluation__view-item">
                                <span>{isArabic ? 'الحالة' : 'Status'}</span>
                                <strong>
                                    <span className={`asset-revaluation__badge ${viewing.is_posted
                                        ? 'asset-revaluation__badge--posted'
                                        : 'asset-revaluation__badge--draft'}`}>
                                        {viewing.is_posted
                                            ? (isArabic ? 'مُرحّل' : 'Posted')
                                            : (isArabic ? 'مسودة' : 'Draft')}
                                    </span>
                                </strong>
                            </div>

                            <div className="asset-revaluation__view-item">
                                <span>{isArabic ? 'التكلفة السابقة' : 'Previous Cost'}</span>
                                <strong>{fmtAmount(viewing.previous_cost)}</strong>
                            </div>
                            <div className="asset-revaluation__view-item">
                                <span>{isArabic ? 'مجمع الإهلاك السابق' : 'Previous Accum. Depr.'}</span>
                                <strong>{fmtAmount(viewing.previous_accumulated_depreciation)}</strong>
                            </div>
                            <div className="asset-revaluation__view-item">
                                <span>{isArabic ? 'القيمة الدفترية السابقة' : 'Previous NBV'}</span>
                                <strong>{fmtAmount(viewing.previous_net_book_value)}</strong>
                            </div>

                            <div className="asset-revaluation__view-item">
                                <span>{isArabic ? 'التكلفة الجديدة' : 'New Cost'}</span>
                                <strong>{fmtAmount(viewing.new_cost)}</strong>
                            </div>
                            <div className="asset-revaluation__view-item">
                                <span>{isArabic ? 'مجمع الإهلاك الجديد' : 'New Accum. Depr.'}</span>
                                <strong>{fmtAmount(viewing.new_accumulated_depreciation)}</strong>
                            </div>
                            <div className="asset-revaluation__view-item">
                                <span>{isArabic ? 'القيمة الدفترية الجديدة' : 'New NBV'}</span>
                                <strong>{fmtAmount(viewing.new_net_book_value)}</strong>
                            </div>

                            <div className="asset-revaluation__view-item">
                                <span>{isArabic ? 'زيادة التكلفة' : 'Cost Increase'}</span>
                                <strong>{fmtAmount(viewing.cost_increase)}</strong>
                            </div>
                            <div className="asset-revaluation__view-item">
                                <span>{isArabic ? 'نقص التكلفة' : 'Cost Decrease'}</span>
                                <strong>{fmtAmount(viewing.cost_decrease)}</strong>
                            </div>
                            <div className="asset-revaluation__view-item">
                                <span>{isArabic ? 'فائض إعادة التقييم' : 'Revaluation Surplus'}</span>
                                <strong>{fmtAmount(viewing.revaluation_surplus)}</strong>
                            </div>
                            <div className="asset-revaluation__view-item">
                                <span>{isArabic ? 'عجز إعادة التقييم' : 'Revaluation Deficit'}</span>
                                <strong>{fmtAmount(viewing.revaluation_deficit)}</strong>
                            </div>

                            <div className="asset-revaluation__view-item asset-revaluation__view-item--full">
                                <span>{isArabic ? 'السبب' : 'Reason'}</span>
                                <strong>{viewing.reason || '-'}</strong>
                            </div>
                            <div className="asset-revaluation__view-item asset-revaluation__view-item--full">
                                <span>{isArabic ? 'ملاحظات' : 'Notes'}</span>
                                <strong>{viewing.notes || '-'}</strong>
                            </div>
                            <div className="asset-revaluation__view-item">
                                <span>{isArabic ? 'أنشئ بواسطة' : 'Created By'}</span>
                                <strong>{viewing.created_by_name || '-'}</strong>
                            </div>
                            <div className="asset-revaluation__view-item">
                                <span>{isArabic ? 'تاريخ الإنشاء' : 'Created At'}</span>
                                <strong>{fmtDate(viewing.created_at)}</strong>
                            </div>
                        </div>

                        <div className="asset-revaluation__modal-footer">
                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => setViewing(null)}
                            >
                                {isArabic ? 'إغلاق' : 'Close'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </AdminLayout>
    );
}
