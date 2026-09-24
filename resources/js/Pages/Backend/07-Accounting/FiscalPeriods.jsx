import React, { useState, useEffect, useMemo } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import BlankPage from '@/Components/BlankPage';
import Modal from '@/Components/Modal';
import Table from '../components/Table';
import { toast } from 'react-toastify';

export default function FiscalPeriods({ fiscalYears = [], periods = [] }) {
    const { props } = usePage();

    // Flash messages via the project toast system (same as other ERP pages).
    useEffect(() => {
        if (props.flash?.success) toast.success(props.flash.success);
        if (props.flash?.error) toast.error(props.flash.error);
    }, [props.flash]);

    const [showCreate, setShowCreate] = useState(false);
    const [editingYear, setEditingYear] = useState(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        start_date: '',
        end_date: '',
        regenerate_periods: false,
    });

    const openEdit = (fy) => {
        setEditingYear(fy);
        setData({ name: fy.name || '', start_date: fy.start_date || '', end_date: fy.end_date || '', regenerate_periods: false });
    };

    const closeEdit = () => {
        setEditingYear(null);
        reset();
    };

    const submitCreate = (e) => {
        e.preventDefault();
        post(route('admin.fiscal-periods.store'), {
            onSuccess: () => { setShowCreate(false); reset(); },
        });
    };

    const submitEdit = (e) => {
        e.preventDefault();
        router.put(route('admin.fiscal-periods.update', editingYear.id), data, {
            onSuccess: closeEdit,
        });
    };

    const confirmAction = (message, action) => {
        if (window.confirm(message)) action();
    };

    const statusPill = (status) => (
        <span className={`fiscal-status-pill fiscal-status-${status || 'draft'}`}>
            {status || 'draft'}
        </span>
    );

    // Fiscal Years columns — actions rendered via the shared Table's custom
    // column render API (same pattern the rest of the ERP uses for inline actions).
    const fiscalYearColumns = useMemo(() => [
        {
            header: 'Name',
            key: 'name',
            render: (fy) => <span className="fiscal-year-name">{fy.name}</span>,
        },
        { header: 'Start', key: 'start_date' },
        { header: 'End', key: 'end_date' },
        {
            header: 'Status',
            key: 'status',
            render: (fy) => statusPill(fy.status),
        },
        {
            header: 'Actions',
            key: 'actions',
            sortable: false,
            render: (fy) => (
                <div className="fiscal-row-actions">
                    <button
                        type="button"
                        className="btn btn-outline fiscal-btn-compact"
                        onClick={() => openEdit(fy)}
                    >
                        <i className="material-icons-outlined">edit</i>
                        <span>Edit</span>
                    </button>
                    {fy.status === 'draft' && (
                        <button
                            type="button"
                            className="btn btn-outline fiscal-btn-compact fiscal-action-open"
                            onClick={() => confirmAction(
                                `Open fiscal year ${fy.name}? Posting will be allowed for its periods.`,
                                () => router.post(route('admin.fiscal-periods.open', fy.id)),
                            )}
                        >
                            <i className="material-icons-outlined">lock_open</i>
                            <span>Open</span>
                        </button>
                    )}
                    {fy.status === 'open' && (
                        <button
                            type="button"
                            className="btn btn-outline fiscal-btn-compact fiscal-action-close"
                            onClick={() => confirmAction(
                                `Close fiscal year ${fy.name}? All periods will be locked and posting will be blocked.`,
                                () => router.post(route('admin.fiscal-periods.close', fy.id)),
                            )}
                        >
                            <i className="material-icons-outlined">lock</i>
                            <span>Close</span>
                        </button>
                    )}
                </div>
            ),
        },
    ], [fiscalYears]);

    // Accounting Periods columns.
    const periodColumns = useMemo(() => [
        {
            header: 'Period',
            key: 'name',
            render: (p) => <span className="fiscal-period-name">{p.name}</span>,
        },
        { header: 'Start', key: 'start_date' },
        { header: 'End', key: 'end_date' },
        {
            header: 'Status',
            key: 'status',
            render: (p) => statusPill(p.status),
        },
        {
            header: 'Actions',
            key: 'actions',
            sortable: false,
            render: (p) => (
                <div className="fiscal-row-actions">
                    {p.status === 'open' ? (
                        <button
                            type="button"
                            className="btn btn-outline fiscal-btn-compact fiscal-action-close"
                            onClick={() => confirmAction(
                                `Close period ${p.name}? Posting into this period will be blocked.`,
                                () => router.post(route('admin.fiscal-periods.period.close', p.id)),
                            )}
                        >
                            <i className="material-icons-outlined">lock</i>
                            <span>Close</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="btn btn-outline fiscal-btn-compact fiscal-action-open"
                            onClick={() => confirmAction(
                                `Reopen period ${p.name}? Posting into this period will be allowed again.`,
                                () => router.post(route('admin.fiscal-periods.period.reopen', p.id)),
                            )}
                        >
                            <i className="material-icons-outlined">lock_open</i>
                            <span>Reopen</span>
                        </button>
                    )}
                </div>
            ),
        },
    ], [periods]);

    return (
        <AdminLayout activeMenu="Fiscal Periods">
            <Head title="Fiscal Periods - ZodicERP" />

            <BlankPage
                className="fiscal-periods-page"
                breadcrumbs={[
                    { label: 'Dashboard' },
                    { label: 'Accounting' },
                    { label: 'Fiscal Periods' },
                ]}
            >
                {/* Page header */}
                <div className="fiscal-header">
                    <div className="fiscal-header-left">
                        <h1 className="fiscal-title">Fiscal Periods</h1>
                        <p className="fiscal-subtitle">
                            {fiscalYears.length > 0
                                ? `Manage fiscal years and accounting periods. Latest year: ${fiscalYears[0]?.name || ''}`
                                : 'Manage fiscal years and accounting periods.'}
                        </p>
                    </div>
                    <div className="fiscal-header-actions">
                        <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
                            <i className="material-icons-outlined">add</i>
                            <span>New Fiscal Year</span>
                        </button>
                    </div>
                </div>

                {/* Fiscal Years card */}
                <div className="fiscal-card fade-in">
                    <div className="fiscal-card-header">
                        <div className="fiscal-card-title-group">
                            <span className="fiscal-card-icon">
                                <i className="material-icons-outlined">event_repeat</i>
                            </span>
                            <div>
                                <h2 className="fiscal-card-title">Fiscal Years</h2>
                                <p className="fiscal-card-desc">Accounting years controlling posting permissions</p>
                            </div>
                        </div>
                    </div>

                    <Table
                        tableData={fiscalYears}
                        columns={fiscalYearColumns}
                        emptyIcon="event_repeat"
                        emptyMessage={
                            <div className="fiscal-empty">
                                <span className="material-icons-outlined">event_repeat</span>
                                <p>No fiscal years created yet.</p>
                            </div>
                        }
                        showToolbar={false}
                    />
                </div>

                {/* Accounting Periods card */}
                <div className="fiscal-card fade-in">
                    <div className="fiscal-card-header">
                        <div className="fiscal-card-title-group">
                            <span className="fiscal-card-icon">
                                <i className="material-icons-outlined">date_range</i>
                            </span>
                            <div>
                                <h2 className="fiscal-card-title">Accounting Periods</h2>
                                <p className="fiscal-card-desc">Monthly periods — close to lock posting, reopen to allow it again</p>
                            </div>
                        </div>
                    </div>

                    <Table
                        tableData={periods}
                        columns={periodColumns}
                        emptyIcon="date_range"
                        emptyMessage={
                            <div className="fiscal-empty">
                                <span className="material-icons-outlined">date_range</span>
                                <p>No accounting periods available.</p>
                            </div>
                        }
                        showToolbar={false}
                    />
                </div>
            </BlankPage>

            {/* Create modal (shared Modal component) */}
            <Modal show={showCreate} onClose={() => setShowCreate(false)} maxWidth="md">
                <form onSubmit={submitCreate} className="fiscal-modal-body">
                    <div className="fiscal-modal-header">
                        <h2 className="fiscal-modal-title">New Fiscal Year</h2>
                        <button type="button" className="fiscal-modal-close" onClick={() => setShowCreate(false)}>
                            <i className="material-icons-outlined">close</i>
                        </button>
                    </div>
                    <div className="fiscal-modal-form">
                        <div className="fiscal-form-group">
                            <label className="fiscal-form-label">Name *</label>
                            <input
                                type="text"
                                className="fiscal-form-input"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="e.g. FY 2026"
                            />
                            {errors.name && <p className="fiscal-form-error">{errors.name}</p>}
                        </div>
                        <div className="fiscal-form-grid">
                            <div className="fiscal-form-group">
                                <label className="fiscal-form-label">Start Date *</label>
                                <input
                                    type="date"
                                    className="fiscal-form-input"
                                    value={data.start_date}
                                    onChange={(e) => setData('start_date', e.target.value)}
                                />
                            </div>
                            <div className="fiscal-form-group">
                                <label className="fiscal-form-label">End Date *</label>
                                <input
                                    type="date"
                                    className="fiscal-form-input"
                                    value={data.end_date}
                                    onChange={(e) => setData('end_date', e.target.value)}
                                />
                            </div>
                        </div>
                        <p className="fiscal-form-hint">
                            Creating a fiscal year automatically generates its monthly accounting periods.
                        </p>
                    </div>
                    <div className="fiscal-modal-footer">
                        <button type="button" className="btn btn-outline" onClick={() => { setShowCreate(false); reset(); }}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={processing}>
                            {processing ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Edit modal */}
            <Modal show={!!editingYear} onClose={closeEdit} maxWidth="md">
                <form onSubmit={submitEdit} className="fiscal-modal-body">
                    <div className="fiscal-modal-header">
                        <h2 className="fiscal-modal-title">Edit Fiscal Year</h2>
                        <button type="button" className="fiscal-modal-close" onClick={closeEdit}>
                            <i className="material-icons-outlined">close</i>
                        </button>
                    </div>
                    <div className="fiscal-modal-form">
                        <div className="fiscal-form-group">
                            <label className="fiscal-form-label">Name *</label>
                            <input
                                type="text"
                                className="fiscal-form-input"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                            />
                            {errors.name && <p className="fiscal-form-error">{errors.name}</p>}
                        </div>
                        <div className="fiscal-form-grid">
                            <div className="fiscal-form-group">
                                <label className="fiscal-form-label">Start Date *</label>
                                <input
                                    type="date"
                                    className="fiscal-form-input"
                                    value={data.start_date}
                                    onChange={(e) => setData('start_date', e.target.value)}
                                />
                            </div>
                            <div className="fiscal-form-group">
                                <label className="fiscal-form-label">End Date *</label>
                                <input
                                    type="date"
                                    className="fiscal-form-input"
                                    value={data.end_date}
                                    onChange={(e) => setData('end_date', e.target.value)}
                                />
                            </div>
                        </div>
                        <p className="fiscal-form-hint">
                            Changing dates does not create, delete, or regenerate accounting periods.
                        </p>
                        <label className="fiscal-form-check">
                            <input
                                type="checkbox"
                                checked={data.regenerate_periods}
                                onChange={(e) => setData('regenerate_periods', e.target.checked)}
                            />
                            <span>
                                Regenerate monthly periods to match the new dates
                                (replaces this year's periods with fresh OPEN months —
                                existing overlapping periods are kept otherwise)
                            </span>
                        </label>
                    </div>
                    <div className="fiscal-modal-footer">
                        <button type="button" className="btn btn-outline" onClick={closeEdit}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={processing}>
                            {processing ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
