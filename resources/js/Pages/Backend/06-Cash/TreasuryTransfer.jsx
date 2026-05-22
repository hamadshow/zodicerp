// Transfer.jsx - معدل حسب هيكل جدولك

import React, { useState, useEffect, useMemo } from 'react';
import { Head, router, useForm, usePage, Link } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/main.scss';

const TRANSFER_METHODS = [
    { value: 'cash', label: 'نقدي', color: '#10b981' },
    { value: 'bank_transfer', label: 'تحويل بنكي', color: '#3b82f6' },
    { value: 'check', label: 'شيك', color: '#8b5cf6' },
    { value: 'internal', label: 'داخلي', color: '#f59e0b' },
];

const TRANSFER_STATUSES = [
    { value: 'draft', label: 'مسودة', color: 'gray' },
    { value: 'pending', label: 'قيد المراجعة', color: 'orange' },
    { value: 'approved', label: 'معتمد', color: 'blue' },
    { value: 'completed', label: 'منفذ', color: 'green' },
    { value: 'rejected', label: 'مرفوض', color: 'red' },
    { value: 'cancelled', label: 'ملغي', color: 'gray' },
];

const Transfer = ({ transfers = { data: [] }, filters = {}, stats = {} }) => {
    const { props } = usePage();
    const { localization, flash } = props;
    const [currentView, setCurrentView] = useState('list');
    const [selectedTransfer, setSelectedTransfer] = useState(null);
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');

    // جلب الحسابات من props
    const bankAccounts = props.bankAccounts || [];
    const cashAccounts = props.cashAccounts || [];

    // دمج الحسابات في قائمة واحدة للاختيار
    const allAccounts = useMemo(() => {
        const banks = bankAccounts.map(acc => ({
            id: acc.id,
            type: 'bank',
            typeLabel: '🏦 بنك',
            name: acc.bank_name || acc.account_name,
            account_number: acc.account_number,
            currency: acc.currency?.code || 'SAR',
            balance: acc.current_balance || 0,
            status: acc.status,
        }));
        
        const cash = cashAccounts.map(acc => ({
            id: acc.id,
            type: 'cash',
            typeLabel: '💰 صندوق',
            name: acc.name,
            account_number: acc.account_code,
            currency: acc.currency?.code || 'SAR',
            balance: acc.current_balance || 0,
            status: acc.status,
        }));
        
        return [...banks, ...cash];
    }, [bankAccounts, cashAccounts]);

    // نموذج التحويل (متوافق مع هيكل الجدول)
    const { data, setData, post, put, processing, errors, reset } = useForm({
        id: null,
        transfer_no: '',
        from_account_id: '',
        to_account_id: '',
        amount: '',
        transfer_date: new Date().toISOString().split('T')[0],
        method: 'internal',
        notes: '',
        status: 'draft',
    });

    // معالج التقديم
    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (currentView === 'edit') {
            put(route('admin.transfers.update', selectedTransfer?.id), {
                onSuccess: () => {
                    setCurrentView('list');
                    setSelectedTransfer(null);
                    reset();
                },
                onError: (err) => {
                    console.error('Update error:', err);
                }
            });
        } else {
            post(route('admin.transfers.store'), {
                onSuccess: () => {
                    setCurrentView('list');
                    reset();
                },
                onError: (err) => {
                    console.error('Store error:', err);
                }
            });
        }
    };

    // معالج الحذف (soft delete)
    const handleDelete = (id) => {
        if (confirm('هل أنت متأكد من حذف هذا التحويل؟')) {
            router.delete(route('admin.transfers.destroy', id), {
                onSuccess: () => {
                    if (currentView !== 'list') setCurrentView('list');
                }
            });
        }
    };

    // تغيير الحالة
    const handleStatusChange = (id, newStatus) => {
        router.patch(route('admin.transfers.status', id), { status: newStatus }, {
            onSuccess: () => {
                // تحديث القائمة
            }
        });
    };

    // البحث
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm !== (filters.search || '')) {
                router.get(route('admin.transfers.index'), {
                    search: searchTerm,
                    status: statusFilter === 'all' ? null : statusFilter,
                }, {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                });
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleStatusFilter = (status) => {
        setStatusFilter(status);
        router.get(route('admin.transfers.index'), {
            search: searchTerm,
            status: status === 'all' ? null : status,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    // الحصول على اسم الحساب من الـ ID
    const getAccountName = (accountId) => {
        const account = allAccounts.find(a => a.id == accountId);
        return account ? `${account.name} (${account.typeLabel})` : '-';
    };

    // الحصول على طريقة التحويل بالعربية
    const getMethodLabel = (method) => {
        return TRANSFER_METHODS.find(m => m.value === method)?.label || method;
    };

    // الحصول على حالة التحويل بالعربية
    const getStatusLabel = (status) => {
        return TRANSFER_STATUSES.find(s => s.value === status)?.label || status;
    };

    // عرض قائمة التحويلات
    const renderListView = () => (
        <div className="bank-card">
            <div className="card-header">
                <div className="search-bar light">
                    <input 
                        type="text" 
                        placeholder="بحث برقم التحويل أو الملاحظات..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button>
                        <span className="material-icons-outlined">search</span>
                    </button>
                </div>
                <div className="actions">
                    <button 
                        className="btn btn-primary" 
                        onClick={() => {
                            reset();
                            setSelectedTransfer(null);
                            setCurrentView('create');
                        }}
                    >
                        <span className="material-icons-outlined">swap_horiz</span>
                        تحويل جديد
                    </button>
                </div>
            </div>

            {/* فلتر الحالة */}
            <div className="filter-tabs" style={{ marginBottom: '20px' }}>
                {['all', 'draft', 'pending', 'approved', 'completed', 'rejected', 'cancelled'].map(status => (
                    <div
                        key={status}
                        className={`filter-tab ${statusFilter === status ? 'active' : ''}`}
                        onClick={() => handleStatusFilter(status)}
                    >
                        {status === 'all' ? 'الكل' : 
                         status === 'draft' ? 'مسودة' :
                         status === 'pending' ? 'قيد المراجعة' :
                         status === 'approved' ? 'معتمد' :
                         status === 'completed' ? 'منفذ' :
                         status === 'rejected' ? 'مرفوض' : 'ملغي'}
                    </div>
                ))}
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>رقم التحويل</th>
                            <th>من حساب</th>
                            <th>إلى حساب</th>
                            <th>المبلغ</th>
                            <th>التاريخ</th>
                            <th>طريقة التحويل</th>
                            <th>الحالة</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transfers.data?.length > 0 ? (
                            transfers.data.map((transfer, index) => (
                                <tr key={transfer.id}>
                                    <td>{(transfers.current_page - 1) * transfers.per_page + index + 1}</td>
                                    <td className="font-mono font-medium">{transfer.transfer_no}</td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                                <span className="material-icons-outlined text-sm">account_balance</span>
                                            </span>
                                            <span>{getAccountName(transfer.from_account_id)}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                                <span className="material-icons-outlined text-sm">account_balance_wallet</span>
                                            </span>
                                            <span>{getAccountName(transfer.to_account_id)}</span>
                                        </div>
                                    </td>
                                    <td className="font-bold text-blue-600">
                                        {Number(transfer.amount).toLocaleString()} ر.س
                                    </td>
                                    <td>{new Date(transfer.transfer_date).toLocaleDateString('ar-EG')}</td>
                                    <td>
                                        <span className="method-badge" style={{
                                            background: TRANSFER_METHODS.find(m => m.value === transfer.method)?.color + '20',
                                            color: TRANSFER_METHODS.find(m => m.value === transfer.method)?.color,
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '12px',
                                            fontWeight: 500
                                        }}>
                                            {getMethodLabel(transfer.method)}
                                        </span>
                                    </td>
                                    <td>
                                        <select
                                            value={transfer.status}
                                            onChange={(e) => handleStatusChange(transfer.id, e.target.value)}
                                            className="status-select"
                                            style={{
                                                padding: '4px 8px',
                                                borderRadius: '20px',
                                                border: 'none',
                                                fontSize: '12px',
                                                fontWeight: 500,
                                                background: transfer.status === 'completed' ? '#dcfce7' :
                                                          transfer.status === 'approved' ? '#dbeafe' :
                                                          transfer.status === 'pending' ? '#fed7aa' :
                                                          transfer.status === 'rejected' ? '#fee2e2' :
                                                          '#f3f4f6',
                                                color: transfer.status === 'completed' ? '#166534' :
                                                       transfer.status === 'approved' ? '#1e40af' :
                                                       transfer.status === 'pending' ? '#9a3412' :
                                                       transfer.status === 'rejected' ? '#991b1b' :
                                                       '#374151',
                                            }}
                                        >
                                            <option value="draft">مسودة</option>
                                            <option value="pending">قيد المراجعة</option>
                                            <option value="approved">معتمد</option>
                                            <option value="completed">منفذ</option>
                                            <option value="rejected">مرفوض</option>
                                            <option value="cancelled">ملغي</option>
                                        </select>
                                    </td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button 
                                                className="icon-btn view"
                                                onClick={() => {
                                                    setSelectedTransfer(transfer);
                                                    setCurrentView('view');
                                                }}
                                                title="عرض"
                                            >
                                                <span className="material-icons-outlined">visibility</span>
                                            </button>
                                            {transfer.status !== 'completed' && transfer.status !== 'cancelled' && (
                                                <>
                                                    <button 
                                                        className="icon-btn edit"
                                                        onClick={() => {
                                                            setSelectedTransfer(transfer);
                                                            setData({
                                                                id: transfer.id,
                                                                transfer_no: transfer.transfer_no,
                                                                from_account_id: transfer.from_account_id,
                                                                to_account_id: transfer.to_account_id,
                                                                amount: transfer.amount,
                                                                transfer_date: transfer.transfer_date?.split('T')[0],
                                                                method: transfer.method,
                                                                notes: transfer.notes || '',
                                                                status: transfer.status,
                                                            });
                                                            setCurrentView('edit');
                                                        }}
                                                        title="تعديل"
                                                    >
                                                        <span className="material-icons-outlined">edit</span>
                                                    </button>
                                                    <button 
                                                        className="icon-btn delete"
                                                        onClick={() => handleDelete(transfer.id)}
                                                        title="حذف"
                                                    >
                                                        <span className="material-icons-outlined">delete</span>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="9" className="text-center py-8 text-gray-500">
                                    <span className="material-icons-outlined text-4xl mb-2">swap_horiz</span>
                                    <p>لا توجد تحويلات</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {transfers.links && transfers.links.length > 3 && (
                <div className="pagination">
                    <div className="text-sm text-gray-500">
                        عرض {transfers.from} إلى {transfers.to} من {transfers.total} سجل
                    </div>
                    <div className="flex gap-1">
                        {transfers.links.map((link, i) => (
                            link.url ? (
                                <Link
                                    key={i}
                                    href={link.url}
                                    className={`page-btn ${link.active ? 'active' : ''}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ) : (
                                <span key={i} className="page-btn disabled" dangerouslySetInnerHTML={{ __html: link.label }} />
                            )
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    // نموذج إنشاء/تعديل التحويل
    const renderFormView = () => {
        const isEditing = currentView === 'edit';
        
        return (
            <div className="form-view-container fade-in">
                <div className="form-card">
                    <div className="form-card-header">
                        <div className="header-left">
                            <button className="back-button" onClick={() => {
                                setCurrentView('list');
                                reset();
                                setSelectedTransfer(null);
                            }}>
                                <span className="material-icons-outlined">arrow_back</span>
                            </button>
                            <h2 className="form-title">
                                {isEditing ? 'تعديل تحويل' : 'تحويل جديد بين الحسابات'}
                            </h2>
                        </div>
                        <button className="save-button" onClick={handleSubmit} disabled={processing}>
                            <span className="material-icons-outlined">save</span>
                            {processing ? 'جاري الحفظ...' : (isEditing ? 'تحديث' : 'حفظ')}
                        </button>
                    </div>

                    <div className="form-card-body">
                        {flash?.error && <div className="alert alert-error">{flash.error}</div>}
                        {flash?.success && <div className="alert alert-success">{flash.success}</div>}
                        
                        <div className="form-grid">
                            {/* رقم التحويل */}
                            <div className="form-group">
                                <label className="form-label">رقم التحويل</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={data.transfer_no}
                                    onChange={e => setData('transfer_no', e.target.value)}
                                    placeholder="يترك لتوليد تلقائي"
                                />
                                {errors.transfer_no && <span className="form-error">{errors.transfer_no}</span>}
                            </div>

                            {/* تاريخ التحويل */}
                            <div className="form-group">
                                <label className="form-label">تاريخ التحويل *</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={data.transfer_date}
                                    onChange={e => setData('transfer_date', e.target.value)}
                                    required
                                />
                                {errors.transfer_date && <span className="form-error">{errors.transfer_date}</span>}
                            </div>

                            {/* من حساب */}
                            <div className="form-group">
                                <label className="form-label">من حساب *</label>
                                <select
                                    className="form-select"
                                    value={data.from_account_id}
                                    onChange={e => setData('from_account_id', e.target.value)}
                                    required
                                    disabled={isEditing}
                                >
                                    <option value="">اختر الحساب المصدر</option>
                                    {allAccounts.map(acc => (
                                        <option key={`${acc.type}-${acc.id}`} value={acc.id}>
                                            {acc.typeLabel} : {acc.name} - الرصيد: {Number(acc.balance).toLocaleString()} {acc.currency}
                                        </option>
                                    ))}
                                </select>
                                {errors.from_account_id && <span className="form-error">{errors.from_account_id}</span>}
                            </div>

                            {/* إلى حساب */}
                            <div className="form-group">
                                <label className="form-label">إلى حساب *</label>
                                <select
                                    className="form-select"
                                    value={data.to_account_id}
                                    onChange={e => setData('to_account_id', e.target.value)}
                                    required
                                    disabled={isEditing}
                                >
                                    <option value="">اختر الحساب الهدف</option>
                                    {allAccounts
                                        .filter(acc => acc.id != data.from_account_id)
                                        .map(acc => (
                                            <option key={`${acc.type}-${acc.id}`} value={acc.id}>
                                                {acc.typeLabel} : {acc.name} - الرصيد: {Number(acc.balance).toLocaleString()} {acc.currency}
                                            </option>
                                        ))}
                                </select>
                                {errors.to_account_id && <span className="form-error">{errors.to_account_id}</span>}
                            </div>

                            {/* المبلغ */}
                            <div className="form-group">
                                <label className="form-label">المبلغ *</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="form-input"
                                        value={data.amount}
                                        onChange={e => setData('amount', e.target.value)}
                                        placeholder="0.00"
                                        required
                                    />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">ر.س</span>
                                </div>
                                {errors.amount && <span className="form-error">{errors.amount}</span>}
                            </div>

                            {/* طريقة التحويل */}
                            <div className="form-group">
                                <label className="form-label">طريقة التحويل *</label>
                                <select
                                    className="form-select"
                                    value={data.method}
                                    onChange={e => setData('method', e.target.value)}
                                    required
                                >
                                    {TRANSFER_METHODS.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                                {errors.method && <span className="form-error">{errors.method}</span>}
                            </div>

                            {/* الحالة */}
                            <div className="form-group">
                                <label className="form-label">الحالة</label>
                                <select
                                    className="form-select"
                                    value={data.status}
                                    onChange={e => setData('status', e.target.value)}
                                >
                                    <option value="draft">مسودة</option>
                                    <option value="pending">قيد المراجعة</option>
                                    <option value="approved">معتمد</option>
                                    <option value="completed">منفذ</option>
                                    <option value="rejected">مرفوض</option>
                                    <option value="cancelled">ملغي</option>
                                </select>
                            </div>

                            {/* ملاحظات */}
                            <div className="form-group full-width">
                                <label className="form-label">الملاحظات</label>
                                <textarea
                                    className="form-input"
                                    rows="4"
                                    value={data.notes}
                                    onChange={e => setData('notes', e.target.value)}
                                    placeholder="أضف أي ملاحظات إضافية هنا..."
                                />
                                {errors.notes && <span className="form-error">{errors.notes}</span>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // عرض تفاصيل التحويل
    const renderDetailsView = () => (
        <div className="view-card">
            <div className="internal-page-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => setCurrentView('list')}>
                        <span className="material-icons-outlined">arrow_back</span>
                        رجوع
                    </button>
                    <h2 className="view-title">تفاصيل التحويل #{selectedTransfer?.transfer_no}</h2>
                </div>
                <div className="header-actions">
                    {selectedTransfer?.status !== 'completed' && selectedTransfer?.status !== 'cancelled' && (
                        <>
                            <button className="btn btn-secondary" onClick={() => setCurrentView('edit')}>
                                <span className="material-icons-outlined">edit</span>
                                تعديل
                            </button>
                            <button className="btn btn-danger" onClick={() => handleDelete(selectedTransfer.id)}>
                                <span className="material-icons-outlined">delete</span>
                                حذف
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="p-8">
                <div className="max-w-4xl mx-auto">
                    {/* بطاقة المعلومات الأساسية */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="text-center">
                                <div className="text-sm text-gray-500 mb-2">من حساب</div>
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <span className="text-2xl">🏦</span>
                                    <span className="font-bold text-lg">{getAccountName(selectedTransfer?.from_account_id)}</span>
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-sm text-gray-500 mb-2">المبلغ المحول</div>
                                <div className="text-3xl font-bold text-blue-600">
                                    {Number(selectedTransfer?.amount).toLocaleString()} ر.س
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                    {getMethodLabel(selectedTransfer?.method)}
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-sm text-gray-500 mb-2">إلى حساب</div>
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <span className="text-2xl">💰</span>
                                    <span className="font-bold text-lg">{getAccountName(selectedTransfer?.to_account_id)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* باقي المعلومات */}
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                <span className="material-icons-outlined text-blue-500">info</span>
                                معلومات التحويل
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex justify-between py-2 border-b border-gray-50">
                                    <span className="text-gray-500">رقم التحويل:</span>
                                    <span className="font-mono font-medium">{selectedTransfer?.transfer_no}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-50">
                                    <span className="text-gray-500">التاريخ:</span>
                                    <span>{new Date(selectedTransfer?.transfer_date).toLocaleDateString('ar-EG')}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-50">
                                    <span className="text-gray-500">طريقة التحويل:</span>
                                    <span>{getMethodLabel(selectedTransfer?.method)}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-50">
                                    <span className="text-gray-500">الحالة:</span>
                                    <span className={`status-badge status-${selectedTransfer?.status}`}>
                                        {getStatusLabel(selectedTransfer?.status)}
                                    </span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-50">
                                    <span className="text-gray-500">تاريخ الإنشاء:</span>
                                    <span>{new Date(selectedTransfer?.created_at).toLocaleString('ar-EG')}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-50">
                                    <span className="text-gray-500">آخر تحديث:</span>
                                    <span>{new Date(selectedTransfer?.updated_at).toLocaleString('ar-EG')}</span>
                                </div>
                            </div>
                        </div>

                        {selectedTransfer?.notes && (
                            <div className="p-6">
                                <h3 className="font-bold mb-3 flex items-center gap-2">
                                    <span className="material-icons-outlined text-blue-500">notes</span>
                                    الملاحظات
                                </h3>
                                <div className="p-4 bg-gray-50 rounded-xl text-gray-700">
                                    {selectedTransfer.notes}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <AdminLayout activeMenu="Transfers">
            <Head title="تحويلات بين الحسابات" />
            
            <div className="blank-page">
                <div className="page-header">
                    <div className="breadcrumb">
                        <Link href={route('admin.dashboard')}>الرئيسية</Link>
                        <span>/</span>
                        <span>الخزينة والبنوك</span>
                        <span>/</span>
                        <span className="current">تحويلات بين الحسابات</span>
                    </div>
                </div>

                {/* إحصائيات سريعة */}
                {currentView === 'list' && (
                    <div className="stats-cards mb-4">
                        <div className="stat-card">
                            <div className="stat-icon" style={{ backgroundColor: '#3b82f6' }}>
                                <span className="material-icons-outlined">swap_horiz</span>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stats.total || transfers.total || 0}</div>
                                <div className="stat-label">إجمالي التحويلات</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ backgroundColor: '#10b981' }}>
                                <span className="material-icons-outlined">check_circle</span>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stats.completed || 0}</div>
                                <div className="stat-label">منفذة</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ backgroundColor: '#f59e0b' }}>
                                <span className="material-icons-outlined">pending</span>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stats.pending || 0}</div>
                                <div className="stat-label">قيد التنفيذ</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ backgroundColor: '#8b5cf6' }}>
                                <span className="material-icons-outlined">account_balance</span>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{allAccounts.length}</div>
                                <div className="stat-label">الحسابات</div>
                            </div>
                        </div>
                    </div>
                )}
                
                {currentView === 'list' && renderListView()}
                {(currentView === 'create' || currentView === 'edit') && renderFormView()}
                {currentView === 'view' && renderDetailsView()}
            </div>

            <style jsx>{`
                .full-width {
                    grid-column: 1 / -1;
                }
                .method-badge {
                    display: inline-block;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 500;
                }
                .status-select {
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .status-select:hover {
                    opacity: 0.8;
                }
                .icon-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 6px;
                    border-radius: 8px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .icon-btn.view { color: #3b82f6; }
                .icon-btn.edit { color: #f59e0b; }
                .icon-btn.delete { color: #ef4444; }
                .icon-btn:hover {
                    background: #f3f4f6;
                    transform: scale(1.05);
                }
                .alert {
                    padding: 12px 16px;
                    border-radius: 12px;
                    margin-bottom: 20px;
                }
                .alert-success {
                    background: #dcfce7;
                    color: #166534;
                    border: 1px solid #bbf7d0;
                }
                .alert-error {
                    background: #fee2e2;
                    color: #991b1b;
                    border: 1px solid #fecaca;
                }
            `}</style>
        </AdminLayout>
    );
};

export default TreasuryTransfer;
