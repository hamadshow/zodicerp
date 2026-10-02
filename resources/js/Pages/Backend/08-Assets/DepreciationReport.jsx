import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import Table from '../components/Table';
import BlankPage from '@/Components/BlankPage';

const STATUSES = ['active', 'idle', 'under_maintenance', 'disposed', 'sold', 'transferred'];

export default function DepreciationReport({ report, filters }) {
    const { props } = usePage();
    const { localization } = props;
    const translations = localization?.translations || {};
    const isArabic = localization?.current_locale === 'ar';

    const __ = (key, fallback) => translations[`DepreciationSchedule.${key}`] || fallback;
    const t = (en, ar) => (isArabic ? ar : en);

    const getLocalizedRoute = (name, params = {}) =>
        route(name, {
            country: localization?.country_code || 'sa',
            lang: localization?.current_locale || 'ar',
            ...params,
        }, false);

    const indexUrl = getLocalizedRoute('admin.assets.depreciation.report');

    // ----- server-side filter state -----
    const [searchInput, setSearchInput] = useState(filters?.search || '');
    const [statusFilter, setStatusFilter] = useState(filters?.status || '');
    const searchTimer = useRef(null);
    useEffect(() => () => clearTimeout(searchTimer.current), []);

    const navigate = (overrides = {}) => {
        const params = {
            search: searchInput.trim(),
            status: statusFilter,
            ...overrides,
        };
        Object.keys(params).forEach((key) => {
            if (params[key] === '' || params[key] === null || params[key] === undefined) {
                delete params[key];
            }
        });
        router.get(indexUrl, params, { preserveState: true, preserveScroll: true });
    };

    const handleSearchChange = (value) => {
        setSearchInput(value);
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => navigate({ search: value.trim() }), 400);
    };

    const handleStatusChange = (value) => {
        setStatusFilter(value);
        navigate({ status: value });
    };

    const rows = report || [];

    const columns = useMemo(() => [
        {
            header: __('asset', t('Asset', 'الأصل')),
            key: 'asset_name',
            render: (row) => (
                <span className="depr-report__asset">
                    {row.asset_name}
                    {row.asset_number ? <small className="depr-report__asset-number">#{row.asset_number}</small> : null}
                </span>
            ),
        },
        {
            header: __('cost', t('Cost', 'التكلفة')),
            key: 'cost',
            align: 'right',
            render: (row) => <span className="depr-report__amount">{fmtAmount(row.cost)}</span>,
        },
        {
            header: __('accumulated', t('Total Depreciation', 'إجمالي الإهلاك')),
            key: 'total_depreciation',
            align: 'right',
            render: (row) => (
                <span className="depr-report__amount depr-report__amount--dep">
                    {fmtAmount(row.total_depreciation)}
                </span>
            ),
        },
        {
            header: __('closing_value', t('Book Value', 'القيمة الدفترية')),
            key: 'book_value',
            align: 'right',
            render: (row) => (
                <span className="depr-report__amount depr-report__amount--nbv">{fmtAmount(row.book_value)}</span>
            ),
        },
        {
            header: __('posted_months', t('Posted Months', 'الأشهر المُرحّلة')),
            key: 'posted_months',
            align: 'center',
            render: (row) => row.posted_months || 0,
        },
        {
            header: __('status', t('Status', 'الحالة')),
            key: 'status',
            render: (row) => <span className="depr-report__badge">{row.status || '—'}</span>,
        },
    ], [translations, isArabic]);

    // Totals row — computed from the same server data (one source of truth).
    const totals = useMemo(() => {
        return rows.reduce(
            (acc, row) => ({
                cost: acc.cost + Number(row.cost || 0),
                total_depreciation: acc.total_depreciation + Number(row.total_depreciation || 0),
                book_value: acc.book_value + Number(row.book_value || 0),
            }),
            { cost: 0, total_depreciation: 0, book_value: 0 }
        );
    }, [rows]);

    const fmtAmount = (value) => {
        const number = Number(value);
        if (Number.isNaN(number)) return String(value);
        return number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const breadcrumbs = [
        { label: t('Dashboard', 'لوحة التحكم') },
        { label: t('Fixed Assets', 'الأصول الثابتة') },
        { label: t('Depreciation Report', 'تقرير الإهلاك'), active: true },
    ];

    return (
        <AdminLayout activeMenu="Fixed Assets">
            <Head title={t('Depreciation Report', 'تقرير الإهلاك')} />

            <BlankPage className="depr-report" breadcrumbs={breadcrumbs}>
                <div className="depr-report__header">
                    <div className="depr-report__heading">
                        <h1 className="depr-report__title">{t('Depreciation Report', 'تقرير الإهلاك')}</h1>
                        <p className="depr-report__subtitle">
                            {t(
                                'Posted depreciation totals per asset, with book value derived from the unified depreciation engine.',
                                'إجماليات الإهلاك المُرحّل لكل أصل، مع القيمة الدفترية المحسوبة من محرك الإهلاك الموحد.'
                            )}
                        </p>
                    </div>
                </div>

                <div className="depr-report__content">
                    <div className="depr-report__card">
                        <div className="depr-report__card-header">
                            <div className="depr-report__card-title-group">
                                <span className="depr-report__card-icon">
                                    <span className="material-icons-outlined">assessment</span>
                                </span>
                                <div>
                                    <h2 className="depr-report__card-title">{t('Depreciation by Asset', 'الإهلاك حسب الأصل')}</h2>
                                    <p className="depr-report__card-desc">
                                        {t('All assets of your company', 'جميع أصول شركتك')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Table
                            tableData={rows}
                            columns={columns}
                            recordsPerPage={15}
                            emptyIcon="assessment"
                            emptyMessage={
                                <div className="depr-report__empty">
                                    <p>{t('No assets found for this filter.', 'لا توجد أصول مطابقة لهذا الفلتر.')}</p>
                                </div>
                            }
                            showToolbar={true}
                            toolbarSearch={true}
                            toolbarSearchPlaceholder={t('Search...', 'بحث...')}
                            toolbarSearchValue={searchInput}
                            onToolbarSearch={handleSearchChange}
                            toolbarActions={
                                <select
                                    className="depr-report__filter-select"
                                    value={statusFilter}
                                    onChange={(event) => handleStatusChange(event.target.value)}
                                    aria-label={t('Filter by status', 'تصفية حسب الحالة')}
                                >
                                    <option value="">{t('All statuses', 'كل الحالات')}</option>
                                    {STATUSES.map((status) => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                            }
                        />

                        {rows.length > 0 && (
                            <div className="depr-report__totals">
                                <div className="depr-report__totals-item">
                                    <span>{t('Total Cost', 'إجمالي التكلفة')}</span>
                                    <strong>{fmtAmount(totals.cost)}</strong>
                                </div>
                                <div className="depr-report__totals-item">
                                    <span>{t('Total Depreciation', 'إجمالي الإهلاك')}</span>
                                    <strong>{fmtAmount(totals.total_depreciation)}</strong>
                                </div>
                                <div className="depr-report__totals-item">
                                    <span>{t('Total Book Value', 'إجمالي القيمة الدفترية')}</span>
                                    <strong>{fmtAmount(totals.book_value)}</strong>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </BlankPage>
        </AdminLayout>
    );
}
