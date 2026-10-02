import React, { useState, useMemo } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import Table from '../components/Table';
import BlankPage from '@/Components/BlankPage';
import { formatDate } from '@/utils/date';

const today = () => new Date().toISOString().slice(0, 10);

const fmtAmount = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    const number = Number(value);
    if (Number.isNaN(number)) return String(value);
    return number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtDate = (value) => formatDate(String(value || '').split('T')[0].split(' ')[0]) || '-';

const fmtPeriod = (year, month) => `${String(month).padStart(2, '0')}/${year}`;

export default function DepreciationSchedule({ assets, schedule, yearlySchedule, view, as_of_date, filters }) {
    const { props } = usePage();
    const { localization } = props;
    const translations = localization?.translations || {};
    const isArabic = localization?.current_locale === 'ar';

    // Page-local translation lookup (lang/{en,ar}/DepreciationSchedule.php),
    // falling back to the inline EN/AR strings.
    const __ = (key, fallback) => translations[`DepreciationSchedule.${key}`] || fallback;
    const t = (en, ar) => (isArabic ? ar : en);

    const getLocalizedRoute = (name, params = {}) =>
        route(name, {
            country: localization?.country_code || 'sa',
            lang: localization?.current_locale || 'ar',
            ...params,
        }, false);

    const indexUrl = getLocalizedRoute('admin.assets.depreciation.schedule');
    const postUrl = getLocalizedRoute('admin.assets.depreciation.post');
    const reverseUrl = getLocalizedRoute('admin.assets.depreciation.reverse');
    const bulkUrl = getLocalizedRoute('admin.assets.depreciation.run.post');

    // ----- filter state (server-driven) -----
    const initialAsset = filters?.asset_id ? String(filters.asset_id) : '';
    const [assetId, setAssetId] = useState(initialAsset);
    const [asOfDate, setAsOfDate] = useState(as_of_date || today());
    const [viewMode, setViewMode] = useState(view || 'monthly');

    const navigate = (overrides = {}, visitOptions = {}) => {
        const params = {
            asset_id: assetId,
            as_of_date: asOfDate,
            view: viewMode,
            ...overrides,
        };
        Object.keys(params).forEach((key) => {
            if (params[key] === '' || params[key] === null || params[key] === undefined) {
                delete params[key];
            }
        });
        router.get(indexUrl, params, { preserveState: true, preserveScroll: true, ...visitOptions });
    };

    const handleAssetChange = (value) => {
        setAssetId(value);
        navigate({ asset_id: value });
    };

    const handleDateChange = (value) => {
        setAsOfDate(value);
        if (assetId) {
            navigate({ as_of_date: value });
        }
    };

    const handleViewChange = (mode) => {
        setViewMode(mode);
        navigate({ view: mode });
    };

    // ----- write operations (feedback via AdminLayout flash toasts) -----
    const [processing, setProcessing] = useState(false);

    const handlePost = () => {
        if (!assetId || processing) return;
        if (!window.confirm(__('post_confirm', t('Post the calculated depreciation for this asset as of the selected date?', 'ترحيل الإهلاك المحسوب لهذا الأصل حتى التاريخ المحدد؟')))) {
            return;
        }
        setProcessing(true);
        router.post(postUrl, { asset_id: assetId, as_of_date: asOfDate }, {
            preserveScroll: true,
            onFinish: () => setProcessing(false),
        });
    };

    const handleBulk = () => {
        if (!window.confirm(__('bulk_confirm', t('Run depreciation for all eligible assets of your company as of the selected date?', 'تشغيل الإهلاك لجميع أصول الشركة المؤهلة حتى التاريخ المحدد؟')))) {
            return;
        }
        router.post(bulkUrl, { as_of_date: asOfDate }, { preserveScroll: true });
    };

    const handleReverse = (row) => {
        if (!window.confirm(__('reverse_confirm', t('Reverse this posted depreciation? A reversal journal entry will be created and the original entry preserved.', 'عكس هذا الإهلاك المُرحّل؟ سيتم إنشاء قيد عكسي مع الاحتفاظ بالقيد الأصلي.')))) {
            return;
        }
        router.post(reverseUrl, { depreciation_id: row.depreciation_id }, { preserveScroll: true });
    };

    // ----- schedule data -----
    const summary = schedule?.summary || null;
    const assetInfo = schedule?.asset || null;
    const scheduleError = schedule?.error || null;
    const isYearly = viewMode === 'yearly';
    const rows = isYearly
        ? (yearlySchedule?.rows || [])
        : (schedule?.rows || []);

    // Monthly rows are paginated client-side by the shared Table (the whole
    // useful life of an asset is a bounded dataset, e.g. 60 rows for 5 years).
    const monthlyColumns = useMemo(() => [
        {
            header: __('period', t('Period', 'الفترة')),
            key: 'period',
            render: (row) => fmtPeriod(row.year, row.month),
        },
        {
            header: __('date', t('Date', 'التاريخ')),
            key: 'depreciation_date',
            render: (row) => <span className="depr-schedule__date">{fmtDate(row.depreciation_date)}</span>,
        },
        {
            header: __('opening_value', t('Opening Value', 'القيمة الافتتاحية')),
            key: 'net_book_value_before',
            align: 'right',
            render: (row) => <span className="depr-schedule__amount">{fmtAmount(row.net_book_value_before)}</span>,
        },
        {
            header: __('depreciation', t('Depreciation', 'الإهلاك')),
            key: 'depreciation_amount',
            align: 'right',
            render: (row) => <span className="depr-schedule__amount depr-schedule__amount--dep">{fmtAmount(row.depreciation_amount)}</span>,
        },
        {
            header: __('accumulated', t('Accumulated', 'المجمع')),
            key: 'accumulated_depreciation',
            align: 'right',
            render: (row) => <span className="depr-schedule__amount">{fmtAmount(row.accumulated_depreciation)}</span>,
        },
        {
            header: __('closing_value', t('Closing Value', 'القيمة الختامية')),
            key: 'net_book_value_after',
            align: 'right',
            render: (row) => <span className="depr-schedule__amount">{fmtAmount(row.net_book_value_after)}</span>,
        },
        {
            header: __('state', t('State', 'الحالة')),
            key: 'source',
            render: (row) => {
                if (row.source === 'posted') {
                    return (
                        <span className="depr-schedule__badge depr-schedule__badge--posted">
                            {__('posted', t('Posted', 'مُرحّل'))}
                        </span>
                    );
                }
                if (row.source === 'gap') {
                    return (
                        <span className="depr-schedule__badge depr-schedule__badge--gap">
                            {__('gap', t('Not Posted', 'غير مُرحّل'))}
                        </span>
                    );
                }
                return (
                    <span className="depr-schedule__badge depr-schedule__badge--projected">
                        {__('projected', t('Projected', 'متوقع'))}
                    </span>
                );
            },
        },
        {
            header: __('journal', t('Journal', 'القيد')),
            key: 'journal_entry_id',
            render: (row) => (
                <span className="depr-schedule__journal-cell">
                    {row.journal_entry_id ? `#${row.journal_entry_id}` : '-'}
                    {row.source === 'posted' && row.depreciation_id && (
                        <button
                            type="button"
                            className="depr-schedule__reverse-btn"
                            title={__('reverse', t('Reverse', 'عكس'))}
                            onClick={() => handleReverse(row)}
                        >
                            <span className="material-icons-outlined">undo</span>
                        </button>
                    )}
                </span>
            ),
        },
    ], [translations, isArabic]);

    const yearlyColumns = useMemo(() => [
        {
            header: __('year', t('Year', 'السنة')),
            key: 'year',
        },
        {
            header: __('opening_value', t('Opening Value', 'القيمة الافتتاحية')),
            key: 'opening_book_value',
            align: 'right',
            render: (row) => <span className="depr-schedule__amount">{fmtAmount(row.opening_book_value)}</span>,
        },
        {
            header: __('depreciation', t('Depreciation', 'الإهلاك')),
            key: 'depreciation',
            align: 'right',
            render: (row) => <span className="depr-schedule__amount depr-schedule__amount--dep">{fmtAmount(row.depreciation)}</span>,
        },
        {
            header: __('accumulated', t('Accumulated', 'المجمع')),
            key: 'accumulated_depreciation',
            align: 'right',
            render: (row) => <span className="depr-schedule__amount">{fmtAmount(row.accumulated_depreciation)}</span>,
        },
        {
            header: __('closing_value', t('Closing Value', 'القيمة الختامية')),
            key: 'closing_book_value',
            align: 'right',
            render: (row) => <span className="depr-schedule__amount">{fmtAmount(row.closing_book_value)}</span>,
        },
        {
            header: __('state', t('State', 'الحالة')),
            key: 'months_posted',
            render: (row) => (
                <span className="depr-schedule__months">
                    {row.months_posted || 0} {__('months_posted', t('posted', 'مُرحّل'))} · {row.months_projected || 0} {__('months_projected', t('projected', 'متوقع'))}
                </span>
            ),
        },
    ], [translations, isArabic]);

    const selectedAsset = (assets || []).find((a) => String(a.id) === String(assetId));

    const summaryItems = summary ? [
        { label: __('cost', t('Cost', 'التكلفة')), value: fmtAmount(summary.cost) },
        { label: __('salvage_value', t('Salvage Value', 'قيمة الإنقاذ')), value: fmtAmount(summary.salvage_value) },
        { label: __('depreciable_amount', t('Depreciable Amount', 'المبلغ القابل للإهلاك')), value: fmtAmount(summary.depreciable_amount) },
        { label: __('monthly_depreciation', t('Monthly Depreciation', 'الإهلاك الشهري')), value: fmtAmount(summary.monthly_depreciation) },
        { label: __('useful_life', t('Useful Life (years)', 'العمر الإنتاجي (سنوات)')), value: assetInfo?.useful_life_years ?? '-' },
        { label: __('start_date', t('Depreciation Start', 'بداية الإهلاك')), value: assetInfo?.depreciation_start_date ? fmtDate(assetInfo.depreciation_start_date) : '-' },
        { label: __('total_to_date', t('Depreciation to Date', 'الإهلاك حتى تاريخه')), value: fmtAmount(summary.total_depreciation_to_date) },
        { label: __('accumulated_posted', t('Accumulated (Posted)', 'المجمع (المُرحّل)')), value: fmtAmount(summary.accumulated_depreciation_posted) },
        { label: __('remaining_to_post', t('Remaining to Post', 'المتبقي للترحيل')), value: fmtAmount(summary.remaining_to_post) },
        { label: __('book_value', t('Current Book Value', 'القيمة الدفترية الحالية')), value: fmtAmount(summary.book_value) },
        { label: __('projected_book_value', t('Projected Book Value', 'القيمة الدفترية المتوقعة')), value: fmtAmount(summary.projected_book_value) },
        { label: __('posted_months', t('Posted Months', 'الأشهر المُرحّلة')), value: summary.posted_months },
    ] : [];

    const breadcrumbs = [
        { label: t('Dashboard', 'لوحة التحكم') },
        { label: t('Fixed Assets', 'الأصول الثابتة') },
        { label: __('title', t('Depreciation Schedule', 'جدول الإهلاك')), active: true },
    ];

    const hasSelection = Boolean(assetId && !scheduleError);
    const emptyKey = !assetId ? 'select_asset_prompt' : 'no_schedule';

    return (
        <AdminLayout activeMenu="Fixed Assets">
            <Head title={__('title', t('Depreciation Schedule', 'جدول الإهلاك'))} />

            <BlankPage className="depr-schedule" breadcrumbs={breadcrumbs}>
                {/* Page header */}
                <div className="depr-schedule__header">
                    <div className="depr-schedule__heading">
                        <h1 className="depr-schedule__title">{__('title', t('Depreciation Schedule', 'جدول الإهلاك'))}</h1>
                        <p className="depr-schedule__subtitle">
                            {__('subtitle', t('Project and post monthly asset depreciation, and track what has been posted versus what is expected.', 'إسقاط وترحيل إهلاك الأصول شهرياً، ومتابعة ما تم ترحيله مقابل المتوقع.'))}
                        </p>
                    </div>
                    <div className="depr-schedule__actions">
                        <button type="button" className="btn btn-primary" onClick={handleBulk}>
                            <span className="material-icons-outlined">play_arrow</span>
                            <span>{__('run_bulk', t('Run Bulk Depreciation', 'تشغيل إهلاك جماعي'))}</span>
                        </button>
                        <button
                            type="button"
                            className="btn btn-success"
                            onClick={handlePost}
                            disabled={!hasSelection || processing}
                            title={selectedAsset ? selectedAsset.name : ''}
                        >
                            <span className="material-icons-outlined">post_add</span>
                            <span>{__('post_depreciation', t('Post Depreciation', 'ترحيل الإهلاك'))}</span>
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="depr-schedule__filters-bar">
                    <div className="depr-schedule__field">
                        <label className="depr-schedule__label">{__('asset', t('Asset', 'الأصل'))}</label>
                        <select
                            className="depr-schedule__input"
                            value={assetId}
                            onChange={(event) => handleAssetChange(event.target.value)}
                            aria-label={__('asset', t('Asset', 'الأصل'))}
                        >
                            <option value="">{__('select_asset', t('Select Asset', 'اختر الأصل'))}</option>
                            {(assets || []).map((asset) => (
                                <option key={asset.id} value={asset.id}>
                                    {asset.name}{asset.asset_number ? ` (#${asset.asset_number})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="depr-schedule__field">
                        <label className="depr-schedule__label">{__('as_of_date', t('As of Date', 'حتى تاريخ'))}</label>
                        <input
                            type="date"
                            className="depr-schedule__input"
                            value={asOfDate}
                            onChange={(event) => handleDateChange(event.target.value)}
                            aria-label={__('as_of_date', t('As of Date', 'حتى تاريخ'))}
                        />
                    </div>

                    <div className="depr-schedule__field depr-schedule__field--tabs">
                        <div className="depr-schedule__tabs">
                            <button
                                type="button"
                                className={`depr-schedule__tab ${viewMode === 'monthly' ? 'depr-schedule__tab--active' : ''}`}
                                onClick={() => handleViewChange('monthly')}
                            >
                                {__('view_monthly', t('Monthly', 'شهري'))}
                            </button>
                            <button
                                type="button"
                                className={`depr-schedule__tab ${viewMode === 'yearly' ? 'depr-schedule__tab--active' : ''}`}
                                onClick={() => handleViewChange('yearly')}
                            >
                                {__('view_yearly', t('Yearly', 'سنوي'))}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Summary */}
                {summary && (
                    <div className="depr-schedule__summary">
                        {summaryItems.map((item) => (
                            <div key={item.label} className="depr-schedule__summary-item">
                                <span className="depr-schedule__summary-label">{item.label}</span>
                                <span className="depr-schedule__summary-value">{item.value}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Schedule error (configuration problem) */}
                {scheduleError && (
                    <div className="depr-schedule__alert depr-schedule__alert--error">
                        <span className="material-icons-outlined">error_outline</span>
                        <div>
                            <strong>{__('schedule_error', t('Schedule unavailable', 'الجدول غير متاح'))}</strong>
                            <p>{scheduleError}</p>
                        </div>
                    </div>
                )}

                {/* Table card */}
                <div className="depr-schedule__content">
                    <div className="depr-schedule__card">
                        <div className="depr-schedule__card-header">
                            <div className="depr-schedule__card-title-group">
                                <span className="depr-schedule__card-icon">
                                    <span className="material-icons-outlined">calendar_today</span>
                                </span>
                                <div>
                                    <h2 className="depr-schedule__card-title">
                                        {isYearly
                                            ? __('view_yearly', t('Yearly', 'سنوي'))
                                            : __('view_monthly', t('Monthly', 'شهري'))}
                                    </h2>
                                    <p className="depr-schedule__card-desc">
                                        {assetInfo
                                            ? `${assetInfo.name}${assetInfo.asset_number ? ` (#${assetInfo.asset_number})` : ''} — ${__('as_of_date', t('as of', 'حتى تاريخ'))} ${fmtDate(asOfDate)}`
                                            : __('card_desc', t('Select an asset and an as-of date to build the depreciation projection', 'اختر أصلاً وتاريخاً لبناء إسقاط الإهلاك'))}
                                    </p>
                                </div>
                            </div>

                            {!isYearly && rows.length > 0 && (
                                <div className="depr-schedule__legend">
                                    <span className="depr-schedule__badge depr-schedule__badge--posted">{__('legend_posted', t('Posted', 'مُرحّل'))}</span>
                                    <span className="depr-schedule__badge depr-schedule__badge--gap">{__('legend_gap', t('Calculated but not posted', 'محسوب وغير مُرحّل'))}</span>
                                    <span className="depr-schedule__badge depr-schedule__badge--projected">{__('legend_projected', t('Projected (future)', 'متوقع (مستقبلي)'))}</span>
                                </div>
                            )}
                        </div>

                        <Table
                            tableData={rows}
                            columns={isYearly ? yearlyColumns : monthlyColumns}
                            recordsPerPage={12}
                            emptyIcon="calendar_today"
                            emptyMessage={
                                <div className="depr-schedule__empty">
                                    <p>{__(emptyKey, t(
                                        assetId ? 'No depreciation schedule available for this asset.' : 'Select an asset to view its depreciation schedule.',
                                        assetId ? 'لا يوجد جدول إهلاك لهذا الأصل.' : 'اختر أصلاً لعرض جدول إهلاكه.'
                                    ))}</p>
                                </div>
                            }
                        />
                    </div>
                </div>

                {/* Posted rows carry a reverse action inside the Journal column */}
            </BlankPage>
        </AdminLayout>
    );
}
