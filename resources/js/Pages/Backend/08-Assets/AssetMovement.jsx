import React, { useState, useMemo } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import Table from '../components/Table';
import BlankPage from '@/Components/BlankPage';
import Modal from '@/Components/Modal';

export default function AssetMovement({ movements, assets, warehouses }) {
    const { props } = usePage();
    const { localization } = props;
    const translations = localization?.translations || {};

    const __ = (key, fallback) => translations[`AssetMovement.${key}`] || fallback;

    const isArabic = localization?.current_locale === 'ar';

    // NOTE: flash success/error notifications are displayed by AdminLayout
    // (useNotification), exactly as this page has always relied on.

    const [showCreate, setShowCreate] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        asset_id: '',
        movement_date: new Date().toISOString().split('T')[0],
        to_warehouse_id: '',
        reason: '',
        notes: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.assets.movements.store'), {
            onSuccess: () => { setShowCreate(false); reset(); },
        });
    };

    const closeModal = () => {
        setShowCreate(false);
        reset();
    };

    const rows = movements?.data || [];

    const columns = useMemo(() => [
        {
            header: __('movement_date', 'Date'),
            key: 'movement_date',
            sortable: true,
            render: (m) => <span className="asset-movements__date">{m.movement_date || '-'}</span>,
        },
        {
            header: __('asset', 'Asset'),
            key: 'name',
            sortable: true,
            render: (m) => (
                <div className="asset-movements__asset-cell">
                    <span className="asset-movements__asset-icon">
                        <span className="material-icons-outlined">inventory_2</span>
                    </span>
                    <span className="asset-movements__asset-name">{m.name || '-'}</span>
                </div>
            ),
        },
        {
            header: __('to_warehouse', 'To Warehouse'),
            key: 'to_warehouse_id',
            render: (m) => (
                <span className="asset-movements__warehouse">
                    <span className="material-icons-outlined">warehouse</span>
                    <span>{m.to_warehouse_name || m.to_warehouse_id || '-'}</span>
                </span>
            ),
        },
        {
            header: __('reason', 'Reason'),
            key: 'reason',
            render: (m) => <span className="asset-movements__reason">{m.reason || '-'}</span>,
        },
    ], [translations]);

    const breadcrumbs = [
        { label: isArabic ? 'لوحة التحكم' : 'Dashboard' },
        { label: isArabic ? 'الأصول الثابتة' : 'Fixed Assets' },
        { label: isArabic ? 'حركات الأصول' : 'Asset Movements', active: true },
    ];

    return (
        <AdminLayout activeMenu="Fixed Assets">
            <Head title="Asset Movements" />

            <BlankPage
                className="asset-movements"
                breadcrumbs={breadcrumbs}
            >
                {/* Page header */}
                <div className="asset-movements__header">
                    <div className="asset-movements__heading">
                        <h1 className="asset-movements__title">
                            {isArabic ? 'حركات الأصول' : 'Asset Movements'}
                        </h1>
                        <p className="asset-movements__subtitle">
                            {isArabic
                                ? 'تتبع نقل الأصول بين المخازن والأقسام.'
                                : 'Track asset transfers between warehouses and departments.'}
                        </p>
                    </div>
                    <div className="asset-movements__actions">
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => setShowCreate(true)}
                        >
                            <span className="material-icons-outlined">add</span>
                            <span>{isArabic ? 'حركة جديدة' : 'New Movement'}</span>
                        </button>
                    </div>
                </div>

                {/* Table card */}
                <div className="asset-movements__content">
                    <div className="asset-movements__card">
                        <div className="asset-movements__card-header">
                            <div className="asset-movements__card-title-group">
                                <span className="asset-movements__card-icon">
                                    <span className="material-icons-outlined">swap_horiz</span>
                                </span>
                                <div>
                                    <h2 className="asset-movements__card-title">
                                        {isArabic ? 'سجل الحركات' : 'Movement History'}
                                    </h2>
                                    <p className="asset-movements__card-desc">
                                        {isArabic
                                            ? 'جميع حركات الأصول المسجلة'
                                            : 'All recorded asset movements'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Table
                            tableData={rows}
                            columns={columns}
                            emptyIcon="swap_horiz"
                            emptyMessage={
                                <div className="asset-movements__empty">
                                    <span className="material-icons-outlined">swap_horiz</span>
                                    <p>No movements.</p>
                                </div>
                            }
                            showToolbar={false}
                        />
                    </div>
                </div>
            </BlankPage>

            {/* Create modal (shared Modal component) — same submit handler & payload as before */}
            <Modal show={showCreate} onClose={closeModal} maxWidth="lg">
                <form onSubmit={submit} className="asset-movements__modal-body">
                    <div className="asset-movements__modal-header">
                        <div className="asset-movements__modal-title">
                            <span className="material-icons-outlined">swap_horiz</span>
                            <h2>Record Asset Movement</h2>
                        </div>
                        <button
                            type="button"
                            className="asset-movements__modal-close"
                            onClick={closeModal}
                            aria-label="Close"
                        >
                            <span className="material-icons-outlined">close</span>
                        </button>
                    </div>

                    <div className="asset-movements__modal-form">
                        <div className="asset-movements__field asset-movements__field--full">
                            <label className="asset-movements__label">Asset *</label>
                            <select
                                className="asset-movements__input"
                                value={data.asset_id}
                                onChange={e => setData('asset_id', e.target.value)}
                            >
                                <option value="">Select Asset</option>
                                {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                            {errors.asset_id && <p className="asset-movements__form-error">{errors.asset_id}</p>}
                        </div>

                        <div className="asset-movements__field">
                            <label className="asset-movements__label">Date *</label>
                            <input
                                type="date"
                                className="asset-movements__input"
                                value={data.movement_date}
                                onChange={e => setData('movement_date', e.target.value)}
                            />
                            {errors.movement_date && <p className="asset-movements__form-error">{errors.movement_date}</p>}
                        </div>

                        <div className="asset-movements__field">
                            <label className="asset-movements__label">To Warehouse</label>
                            <select
                                className="asset-movements__input"
                                value={data.to_warehouse_id}
                                onChange={e => setData('to_warehouse_id', e.target.value)}
                            >
                                <option value="">Select</option>
                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>

                        <div className="asset-movements__field asset-movements__field--full">
                            <label className="asset-movements__label">Reason</label>
                            <input
                                type="text"
                                className="asset-movements__input"
                                value={data.reason}
                                onChange={e => setData('reason', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="asset-movements__modal-footer">
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => { setShowCreate(false); reset(); }}
                        >
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={processing}>
                            {processing ? 'Recording...' : 'Record Movement'}
                        </button>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
