import React, { useState, useEffect, useMemo } from 'react';
import { Head, router, usePage, useForm } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';

// --- View Section Component ---
const ViewSection = ({ groups, onEdit, onCreate, onDelete }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredGroups, setFilteredGroups] = useState(groups);
    const { auth } = usePage().props;
    const isRtl = auth?.user?.lang === 'ar' || document.dir === 'rtl';
    const t = (ar, en) => isRtl ? ar : en;

    // Update stats
    const stats = useMemo(() => {
        const total = groups.length;
        const active = groups.filter(g => g.is_active).length;
        const inactive = total - active;
        return { total, active, inactive };
    }, [groups]);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredGroups(groups);
        } else {
            const lowerTerm = searchTerm.toLowerCase();
            setFilteredGroups(groups.filter(g => 
                g.name_ar.toLowerCase().includes(lowerTerm) ||
                (g.name_en && g.name_en.toLowerCase().includes(lowerTerm)) ||
                (g.code && g.code.toLowerCase().includes(lowerTerm))
            ));
        }
    }, [searchTerm, groups]);

    return (
        <div className="animate-fade-slide">
            {/* Quick Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon blue">
                        <span className="material-icons-outlined">groups</span>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.total}</span>
                        <span className="stat-label">{t('إجمالي المجموعات', 'Total Groups')}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">
                        <span className="material-icons-outlined">check_circle</span>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.active}</span>
                        <span className="stat-label">{t('المجموعات النشطة', 'Active Groups')}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon gray">
                        <span className="material-icons-outlined">cancel</span>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.inactive}</span>
                        <span className="stat-label">{t('المجموعات غير النشطة', 'Inactive Groups')}</span>
                    </div>
                </div>
            </div>

            {/* Content Card */}
            <div className="content-card">
                <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                    <div className="search-box">
                        <span className="material-icons-outlined search-icon">search</span>
                        <input
                            type="text"
                            placeholder={t('البحث في المجموعات...', 'Search groups...')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={onCreate}>
                        <span className="material-icons-outlined">add</span>
                        {t('إضافة مجموعة جديدة', 'Add New Group')}
                    </button>
                </div>

                <div className="table-responsive">
                    <table className="professional-table">
                        <thead>
                            <tr>
                                <th>{t('الكود', 'Code')}</th>
                                <th>{t('الاسم (عربي)', 'Name (AR)')}</th>
                                <th>{t('الاسم (إنجليزي)', 'Name (EN)')}</th>
                                <th>{t('المجموعة الأم', 'Parent')}</th>
                                <th>{t('الحساب', 'Account')}</th>
                                <th>{t('الحالة', 'Status')}</th>
                                <th>{t('الإجراءات', 'Actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredGroups.length > 0 ? (
                                filteredGroups.map(group => (
                                    <tr key={group.id}>
                                        <td>{group.code}</td>
                                        <td>{group.name_ar}</td>
                                        <td>{group.name_en || '-'}</td>
                                        <td>{group.parent?.name_ar || '-'}</td>
                                        <td>
                                            {group.account ? (
                                                <div className="account-info">
                                                    <small className="account-code">{group.account.AccCode}</small>
                                                    <span className="account-name"> - {isRtl ? group.account.AccNameAR : group.account.AccNameEN}</span>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td>
                                            <span className={`status-badge ${group.is_active ? 'active' : 'inactive'}`}>
                                                {group.is_active ? t('نشط', 'Active') : t('غير نشط', 'Inactive')}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button onClick={() => onEdit(group)} title={t('تعديل', 'Edit')}>
                                                    <span className="material-icons-outlined">edit</span>
                                                </button>
                                                <button className="delete-btn" onClick={() => onDelete(group.id)} title={t('حذف', 'Delete')}>
                                                    <span className="material-icons-outlined">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                                        {t('لم يتم العثور على مجموعات موردين.', 'No supplier groups found.')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- Form Section Component (Used for Create & Edit) ---
const FormSection = ({ mode, initialData, parentGroups, accounts = [], onBack, onSuccess }) => {
    const isEdit = mode === 'edit';
    const { auth } = usePage().props;
    const isRtl = auth?.user?.lang === 'ar' || document.dir === 'rtl';
    const t = (ar, en) => isRtl ? ar : en;

    const { data, setData, post, put, processing, errors, reset } = useForm({
        code: initialData?.code || '',
        name_ar: initialData?.name_ar || '',
        name_en: initialData?.name_en || '',
        parent_id: initialData?.parent_id || '',
        account_id: initialData?.account_id || '',
        payment_terms: initialData?.payment_terms || 30,
        default_credit_limit: initialData?.default_credit_limit || 0,
        notes: initialData?.notes || '',
        is_active: initialData ? (initialData.is_active ? '1' : '0') : '1',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onSuccess();
            },
        };

        if (isEdit) {
            put(route('admin.purchases.supplier-groups.update', initialData.id), options);
        } else {
            post(route('admin.purchases.supplier-groups.store'), options);
        }
    };

    return (
        <div className="animate-fade-slide">
            <div className="content-card">
                <div className="form-container">
                    <div className="form-section-title">
                        {isEdit ? t('تعديل مجموعة موردين', 'Edit Supplier Group') : t('إنشاء مجموعة موردين جديدة', 'Create New Supplier Group')}
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>{t('كود المجموعة', 'Group Code')}</label>
                                <input
                                    type="text"
                                    value={data.code}
                                    onChange={e => setData('code', e.target.value)}
                                    placeholder={t('يتم إنشاؤه تلقائياً (مثال: GRS-10001)', 'Auto-generated (e.g., GRS-10001)')}
                                    readOnly={!isEdit}
                                    style={{ backgroundColor: !isEdit ? '#f3f4f6' : 'white' }}
                                />
                                {errors.code && <div className="error-message">{errors.code}</div>}
                            </div>
                            <div className="form-group">
                                <label>{t('المجموعة الأم', 'Parent Group')}</label>
                                <select
                                    value={data.parent_id}
                                    onChange={e => setData('parent_id', e.target.value)}
                                >
                                    <option value="">{t('لا يوجد (مجموعة رئيسية)', 'None (Main Group)')}</option>
                                    {parentGroups.filter(pg => pg.id !== initialData?.id).map(pg => (
                                        <option key={pg.id} value={pg.id}>{pg.name_ar}</option>
                                    ))}
                                </select>
                                {errors.parent_id && <div className="error-message">{errors.parent_id}</div>}
                            </div>
                        </div>

                        <div className="form-grid">
                            <div className="form-group">
                                <label>{t('الاسم (بالعربي)', 'Name (Arabic)')} <span style={{ color: 'red' }}>*</span></label>
                                <input
                                    type="text"
                                    value={data.name_ar}
                                    onChange={e => setData('name_ar', e.target.value)}
                                    required
                                    placeholder={t('أدخل الاسم بالعربي', 'Enter Arabic Name')}
                                />
                                {errors.name_ar && <div className="error-message">{errors.name_ar}</div>}
                            </div>
                            <div className="form-group">
                                <label>{t('الاسم (بالإنجليزي)', 'Name (English)')}</label>
                                <input
                                    type="text"
                                    value={data.name_en}
                                    onChange={e => setData('name_en', e.target.value)}
                                    placeholder={t('أدخل الاسم بالإنجليزي', 'Enter English Name')}
                                />
                                {errors.name_en && <div className="error-message">{errors.name_en}</div>}
                            </div>
                        </div>

                        <div className="form-grid">
                            <div className="form-group">
                                <label>{t('حساب الأستاذ العام', 'General Ledger Account')}</label>
                                <select
                                    value={data.account_id}
                                    onChange={e => setData('account_id', e.target.value)}
                                >
                                    <option value="">{t('اختر الحساب...', 'Select Account...')}</option>
                                    {accounts.map(acc => (
                                        <option key={acc.AccID} value={acc.AccID}>
                                            {acc.AccCode} - {isRtl ? acc.AccNameAR : acc.AccNameEN}
                                        </option>
                                    ))}
                                </select>
                                {errors.account_id && <div className="error-message">{errors.account_id}</div>}
                            </div>
                            <div className="form-group">
                                <label>{t('الحالة', 'Status')}</label>
                                <select
                                    value={data.is_active}
                                    onChange={e => setData('is_active', e.target.value)}
                                >
                                    <option value="1">{t('نشط', 'Active')}</option>
                                    <option value="0">{t('غير نشط', 'Inactive')}</option>
                                </select>
                                {errors.is_active && <div className="error-message">{errors.is_active}</div>}
                            </div>
                        </div>

                        <div className="form-grid">
                            <div className="form-group">
                                <label>{t('شروط الدفع (أيام)', 'Payment Terms (Days)')}</label>
                                <input
                                    type="number"
                                    value={data.payment_terms}
                                    onChange={e => setData('payment_terms', e.target.value)}
                                    min="0"
                                />
                                {errors.payment_terms && <div className="error-message">{errors.payment_terms}</div>}
                            </div>
                            <div className="form-group">
                                <label>{t('الحد الائتماني الافتراضي', 'Default Credit Limit')}</label>
                                <input
                                    type="number"
                                    value={data.default_credit_limit}
                                    onChange={e => setData('default_credit_limit', e.target.value)}
                                    step="0.01"
                                    min="0"
                                />
                                {errors.default_credit_limit && <div className="error-message">{errors.default_credit_limit}</div>}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>{t('ملاحظات', 'Notes')}</label>
                            <textarea
                                value={data.notes}
                                onChange={e => setData('notes', e.target.value)}
                                placeholder={t('ملاحظات إضافية...', 'Additional notes...')}
                            ></textarea>
                            {errors.notes && <div className="error-message">{errors.notes}</div>}
                        </div>

                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={onBack} disabled={processing}>
                                {t('إلغاء', 'Cancel')}
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={processing}>
                                {processing ? t('جاري الحفظ...', 'Saving...') : (isEdit ? t('تحديث المجموعة', 'Update Group') : t('إنشاء المجموعة', 'Create Group'))}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// --- Main Container Component ---
const SupplierGroups = ({ groups = [], parentGroups = [], accounts = [] }) => {
    const [mode, setMode] = useState('view'); // 'view' | 'create' | 'edit'
    const [selectedGroup, setSelectedGroup] = useState(null);
    const { flash, auth } = usePage().props;
    const isRtl = auth?.user?.lang === 'ar' || document.dir === 'rtl';
    const t = (ar, en) => isRtl ? ar : en;

    // Reset mode to view on successful Inertia navigation if strictly needed, 
    // but we control mode locally for smoother experience.
    // However, since Inertia reloads props, we might want to watch for success messages.
    useEffect(() => {
        if (flash?.success) {
            setMode('view');
            setSelectedGroup(null);
        }
    }, [flash, groups]); // groups dependency ensures we update when data changes

    const handleCreateClick = () => {
        setSelectedGroup(null);
        setMode('create');
    };

    const handleEditClick = (group) => {
        setSelectedGroup(group);
        setMode('edit');
    };

    const handleBackClick = () => {
        setMode('view');
        setSelectedGroup(null);
    };

    const handleSuccess = () => {
        setMode('view');
        setSelectedGroup(null);
    };

    const handleDelete = (id) => {
        if (window.confirm(t('هل أنت متأكد من حذف هذه المجموعة؟', 'Are you sure you want to delete this group?'))) {
            router.delete(route('admin.purchases.supplier-groups.destroy', id), {
                preserveScroll: true
            });
        }
    };

    return (
        <AdminLayout activeMenu="Supplier Groups">
            <Head title={t('مجموعات الموردين - ZodicERP', 'Supplier Groups - ZodicERP')} />
            
            <div className="supplier-groups-container">
                {/* Fixed Page Header Title based on Mode */}
                <div className="page-header">
                    <h1>
                        {mode === 'view' && t('مجموعات الموردين', 'Supplier Groups')}
                        {mode === 'create' && t('مجموعة موردين جديدة', 'New Supplier Group')}
                        {mode === 'edit' && t('تعديل مجموعة موردين', 'Edit Supplier Group')}
                    </h1>
                    {mode !== 'view' && (
                        <button className="btn btn-secondary" onClick={handleBackClick}>
                            <span className="material-icons-outlined">arrow_back</span>
                            {t('العودة للقائمة', 'Back to List')}
                        </button>
                    )}
                </div>

                {/* Main Content Area with Transitions */}
                {mode === 'view' && (
                    <ViewSection 
                        groups={groups} 
                        onCreate={handleCreateClick} 
                        onEdit={handleEditClick}
                        onDelete={handleDelete}
                    />
                )}

                {mode === 'create' && (
                    <FormSection 
                        mode="create" 
                        parentGroups={parentGroups} 
                        accounts={accounts}
                        onBack={handleBackClick} 
                        onSuccess={handleSuccess}
                    />
                )}

                {mode === 'edit' && (
                    <FormSection 
                        mode="edit" 
                        initialData={selectedGroup} 
                        parentGroups={parentGroups} 
                        accounts={accounts}
                        onBack={handleBackClick} 
                        onSuccess={handleSuccess}
                    />
                )}
            </div>
        </AdminLayout>
    );
};

export default SupplierGroups;
