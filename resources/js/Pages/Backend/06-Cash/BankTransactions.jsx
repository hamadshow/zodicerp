import React, { useMemo, useState, useEffect } from 'react';
import { Head, router, useForm, usePage, Link } from '@inertiajs/react';
import AdminLayout from '@/Pages/Backend/components/AdminLayout';
import '../../../../css/backend/main.scss';

// --- Styles from mockup ---
const mockupStyles = `
    :root { 
        --primary-blue: #2563eb; 
        --primary-hover: #1d4ed8; 
        --bg-main: #f0f4f9; 
        --card-bg: #ffffff; 
        --text-dark: #1e293b; 
        --text-muted: #64748b; 
        --border-light: #e2e8f0; 
        --green-accent: #10b981; 
        --red-accent: #ef4444; 
    }

    .bank-transactions-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
        padding: 5px;
        font-family: 'Tajawal', 'Cairo', sans-serif;
    }

    /* --- Breadcrumbs --- */
    .breadcrumbs-custom {
        font-size: 0.85rem;
        color: var(--text-muted);
        display: flex;
        gap: 5px;
        margin-bottom: 10px;
    }
    .breadcrumbs-custom span.current { color: var(--primary-blue); font-weight: 500; }
    .breadcrumbs-custom a { color: inherit; text-decoration: none; }
    .breadcrumbs-custom a:hover { color: var(--primary-blue); }

    /* --- Stats Grid --- */
    .stats-grid-custom { 
        display: grid; 
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); 
        gap: 15px; 
    } 

    .stat-card-custom { 
        background: var(--card-bg); 
        padding: 20px; 
        border-radius: 12px; 
        display: flex; 
        align-items: center; 
        justify-content: space-between; 
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); 
        border: 1px solid var(--border-light); 
        transition: transform 0.2s;
    } 
    .stat-card-custom:hover { transform: translateY(-2px); }

    .stat-info-custom h3 { 
        font-size: 1.8rem; 
        color: var(--text-dark); 
        font-weight: 700; 
        margin: 0;
    } 

    .stat-info-custom p { 
        font-size: 0.85rem; 
        color: var(--text-muted); 
        margin-top: 4px; 
    } 

    .stat-icon-custom { 
        width: 45px; 
        height: 45px; 
        border-radius: 10px; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        color: white; 
    } 
    .icon-blue-custom { background-color: var(--primary-blue); } 
    .icon-red-custom { background-color: var(--red-accent); } 
    .icon-green-custom { background-color: var(--green-accent); } 

    /* --- Filter Tabs --- */ 
    .filter-tabs-custom { 
        display: flex; 
        background: #fff; 
        padding: 6px; 
        border-radius: 10px; 
        border: 1px solid var(--border-light); 
        gap: 5px; 
    } 

    .tab-btn-custom { 
        flex: 1; 
        padding: 10px; 
        border: none; 
        background: transparent; 
        font-size: 0.95rem; 
        font-weight: 500; 
        color: var(--text-muted); 
        cursor: pointer; 
        border-radius: 8px; 
        transition: all 0.2s; 
        text-align: center; 
    } 

    .tab-btn-custom.active { 
        background-color: var(--primary-blue); 
        color: white; 
        font-weight: 700; 
    } 

    /* --- Data Section --- */ 
    .data-section-custom { 
        background: var(--card-bg); 
        border-radius: 12px; 
        padding: 20px; 
        border: 1px solid var(--border-light); 
        display: flex; 
        flex-direction: column; 
        gap: 20px; 
    } 

    .search-action-bar-custom { 
        display: flex; 
        flex-wrap: wrap; 
        justify-content: space-between; 
        align-items: center; 
        gap: 15px; 
    } 

    .search-box-custom { 
        position: relative; 
        width: 100%; 
        max-width: 320px; 
    } 

    .search-box-custom input { 
        width: 100%; 
        padding: 10px 35px 10px 15px; 
        border: 1px solid var(--border-light); 
        border-radius: 8px; 
        outline: none; 
        font-size: 0.9rem; 
    } 

    .search-box-custom .search-icon-custom { 
        position: absolute; 
        right: 12px; 
        top: 50%; 
        transform: translateY(-50%); 
        color: var(--text-muted); 
    } 

    .action-buttons-custom { 
        display: flex; 
        gap: 10px; 
    } 

    .btn-add-process-custom { 
        background: #fff; 
        color: var(--text-dark); 
        border: 1px solid #a8a8a8; 
        padding: 10px 16px; 
        border-radius: 8px; 
        font-weight: 500; 
        cursor: pointer; 
        display: flex; 
        align-items: center; 
        gap: 8px; 
        font-size: 0.9rem; 
        transition: background 0.2s; 
    } 
    .btn-add-process-custom:hover { background: #f8fafc; } 

    .btn-refresh-custom { 
        background: #fff; 
        border: 1px solid var(--border-light); 
        width: 40px; 
        height: 40px; 
        border-radius: 8px; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        cursor: pointer; 
        color: var(--text-dark); 
    } 
    .btn-refresh-custom:hover { background: #f8fafc; } 

    .section-title-custom { 
        font-size: 1.1rem; 
        font-weight: 700; 
        color: var(--text-dark); 
    } 

    /* --- Table --- */ 
    .table-container-custom { 
        width: 100%; 
        overflow-x: auto; 
        border: 1px solid var(--border-light); 
        border-radius: 8px; 
    } 

    .table-custom { 
        width: 100%; 
        border-collapse: collapse; 
        text-align: right; 
        font-size: 0.9rem; 
        min-width: 700px; 
    } 

    .table-custom th { 
        background-color: #f8fafc; 
        color: var(--text-muted); 
        padding: 14px; 
        font-weight: 500; 
        border-bottom: 2px solid var(--border-light); 
    } 

    .table-custom td { 
        padding: 14px; 
        border-bottom: 1px solid var(--border-light); 
        color: var(--text-dark); 
    } 

    /* Status Badges */
    .status-badge-custom {
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        display: inline-block;
    }
    .status-posted { background: #dcfce7; color: #166534; }
    .status-draft { background: #f1f5f9; color: #475569; }
    .status-cancelled { background: #fee2e2; color: #991b1b; }

    .type-badge-custom {
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 600;
        display: inline-block;
    }
    .type-receipt { background: #e0f2fe; color: #0369a1; }
    .type-payment { background: #fef3c7; color: #92400e; }

    /* Actions */
    .actions-group-custom {
        display: flex;
        gap: 8px;
    }
    .action-btn-custom {
        background: none;
        border: none;
        cursor: pointer;
        color: var(--text-muted);
        transition: color 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .action-btn-custom:hover { color: var(--primary-blue); }
    .action-btn-custom.delete:hover { color: var(--red-accent); }

    /* Empty State */
    .empty-state-row-custom { 
        text-align: center; 
        padding: 40px 20px !important; 
    } 

    .empty-state-content-custom { 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        justify-content: center; 
        gap: 12px; 
        color: var(--text-muted); 
    } 

    .empty-icon-circle-custom { 
        width: 50px; 
        height: 50px; 
        border-radius: 50%; 
        background-color: #f1f5f9; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        color: #94a3b8; 
        font-size: 1.5rem; 
        font-weight: bold; 
    }
`;

// --- Sub-components ---

const Breadcrumbs = ({ t, showForm, viewingTransaction, editingTransaction, backToList }) => (
    <div className="breadcrumbs-custom fade-in">
        <a href="#" onClick={(e) => { e.preventDefault(); router.visit(route('admin.dashboard')); }}>{t('dashboard', 'لوحة التحكم')}</a>
        <span>/</span>
        <a href="#" onClick={(e) => { e.preventDefault(); backToList(); }}>{t('cash_and_bank', 'النقدية والبنوك')}</a>
        <span>/</span>
        <span className={!(showForm || viewingTransaction) ? 'current' : ''}>{t('bank_transactions', 'حركات البنوك')}</span>
        {(showForm || viewingTransaction) && (
            <>
                <span>/</span>
                <span className="current">
                    {editingTransaction ? t('edit_bank_transaction', 'تعديل حركة بنكية') : 
                     showForm ? t('create_bank_transaction', 'إنشاء حركة بنكية') : 
                     t('transaction_details', 'تفاصيل الحركة')}
                </span>
            </>
        )}
    </div>
);

const ListView = ({ t, receipts, payments, transactions, activeTab, setActiveTab, searchTerm, setSearchTerm, openCreate, filtered, accountsMap, formatAmount, openDetails, openEdit, handleDelete }) => (
    <div className="fade-in bank-transactions-container">
        <section className="stats-grid-custom"> 
            <div className="stat-card-custom"> 
                <div className="stat-info-custom"> 
                    <h3>{formatAmount(receipts.reduce((sum, r) => sum + Number(r.amount), 0))}</h3> 
                    <p>{t('total_receipts', 'إجمالي المقبوضات')}</p> 
                </div> 
                <div className="stat-icon-custom icon-green-custom"> 
                    <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 11l3-3m0 0l3 3m-3-3v12M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> 
                </div> 
            </div> 
            <div className="stat-card-custom"> 
                <div className="stat-info-custom"> 
                    <h3>{formatAmount(payments.reduce((sum, p) => sum + Number(p.amount), 0))}</h3> 
                    <p>{t('total_payments', 'إجمالي المدفوعات')}</p> 
                </div> 
                <div className="stat-icon-custom icon-red-custom"> 
                    <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 13l-3 3m0 0l-3-3m3 3V8m9 4a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> 
                </div> 
            </div> 
            <div className="stat-card-custom"> 
                <div className="stat-info-custom"> 
                    <h3>{transactions.length}</h3> 
                    <p>{t('total_operations', 'إجمالي العمليات')}</p> 
                </div> 
                <div className="stat-icon-custom icon-blue-custom"> 
                    <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> 
                </div> 
            </div> 
        </section> 

        <section className="filter-tabs-custom"> 
            <button className={`tab-btn-custom ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>{t('all', 'الكل')}</button> 
            <button className={`tab-btn-custom ${activeTab === 'receipts' ? 'active' : ''}`} onClick={() => setActiveTab('receipts')}>{t('receipts', 'المقبوضات')}</button> 
            <button className={`tab-btn-custom ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')}>{t('payments', 'المدفوعات')}</button> 
        </section> 

        <section className="data-section-custom"> 
            <div className="search-action-bar-custom"> 
                <div className="search-box-custom"> 
                    <span className="search-icon-custom">&#128269;</span> 
                    <input 
                        type="text" 
                        placeholder={t('search_placeholder', 'بحث بالكود، البنك، المرجع...')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    /> 
                </div> 
                
                <div className="action-buttons-custom"> 
                    <button className="btn-add-process-custom" onClick={openCreate}> 
                        <span>&#65291;</span> {t('new_transaction', 'عملية جديدة')}
                    </button> 
                    <button className="btn-refresh-custom" onClick={() => router.reload()} title={t('refresh', 'تحديث البيانات')}> 
                        &#8635; 
                    </button> 
                </div> 
                
                <div className="section-title-custom">{t('bank_transactions', 'حركات البنوك')}</div> 
            </div> 

            <div className="table-container-custom"> 
                <table className="table-custom"> 
                    <thead> 
                        <tr> 
                            <th style={{ width: '40px', textAlign: 'center' }}><input type="checkbox" /></th> 
                            <th>{t('code', 'الكود')}</th> 
                            <th>{t('type', 'النوع')}</th> 
                            <th>{t('date', 'التاريخ')}</th> 
                            <th>{t('bank_account', 'الحساب البنكي')}</th> 
                            <th>{t('counterparty', 'طرف الآخر')}</th> 
                            <th>{t('amount', 'المبلغ')}</th> 
                            <th>{t('status', 'الحالة')}</th> 
                            <th>{t('actions', 'العمليات')}</th> 
                        </tr> 
                    </thead> 
                    <tbody> 
                        {filtered.length === 0 ? (
                            <tr> 
                                <td colSpan="9" className="empty-state-row-custom"> 
                                    <div className="empty-state-content-custom"> 
                                        <div className="empty-icon-circle-custom">i</div> 
                                        <p>{t('no_transactions_found', 'لم يتم العثور على عمليات.')}</p> 
                                    </div> 
                                </td> 
                            </tr> 
                        ) : (
                            filtered.map((item) => (
                                <tr key={`${item.type}-${item.id}`}>
                                    <td style={{ textAlign: 'center' }}><input type="checkbox" /></td>
                                    <td>{item.code}</td>
                                    <td>
                                        <span className={`type-badge-custom type-${item.type}`}>{item.label}</span>
                                    </td>
                                    <td>{item.date}</td>
                                    <td>
                                        <div style={{ fontWeight: '500' }}>{item.bank_account?.bank_name || '-'}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.bank_account?.account_number || ''}</div>
                                    </td>
                                    <td>{accountsMap.get(item.counterparty_account_id) || '-'}</td>
                                    <td style={{ fontWeight: '700' }}>{formatAmount(item.amount)}</td>
                                    <td>
                                        <span className={`status-badge-custom status-${item.status}`}>{t(item.status, item.status)}</span>
                                    </td>
                                    <td>
                                        <div className="actions-group-custom">
                                            <button onClick={() => openDetails(item)} className="action-btn-custom" title={t('view_details', 'عرض التفاصيل')}>
                                                <span className="material-icons-outlined">visibility</span>
                                            </button>
                                            <button onClick={() => openEdit(item)} className="action-btn-custom" title={t('edit', 'تعديل')}>
                                                <span className="material-icons-outlined">edit</span>
                                            </button>
                                            <button onClick={() => handleDelete(item)} className="action-btn-custom delete" title={t('delete', 'حذف')}>
                                                <span className="material-icons-outlined">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody> 
                </table> 
            </div> 
        </section> 
    </div>
);

const FormView = ({ t, editingTransaction, backToList, handleSubmit, data, setData, errors, bankAccounts, filteredAccounts, processing }) => {
    const isEditing = !!editingTransaction;
    return (
        <div className="fade-in bank-transactions-container">
            <section className="data-section-custom" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                <div className="search-action-bar-custom">
                    <div className="section-title-custom">
                        {isEditing ? t('edit_bank_transaction', 'تعديل حركة بنكية') : t('create_bank_transaction', 'إنشاء حركة بنكية')}
                    </div>
                    <button className="btn-add-process-custom" onClick={backToList}>
                        <span className="material-icons-outlined">arrow_forward</span>
                        {t('back_to_list', 'العودة للقائمة')}
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>{t('transaction_type', 'نوع العملية')}</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                                type="button"
                                className={`tab-btn-custom ${data.type === 'receipt' ? 'active' : ''}`} 
                                onClick={() => setData('type', 'receipt')}
                                style={{ flex: 1 }}
                            >
                                {t('bank_receipt', 'قبض بنكي')}
                            </button>
                            <button 
                                type="button"
                                className={`tab-btn-custom ${data.type === 'payment' ? 'active' : ''}`} 
                                onClick={() => setData('type', 'payment')}
                                style={{ flex: 1 }}
                            >
                                {t('bank_payment', 'صرف بنكي')}
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>{t('date', 'التاريخ')}</label>
                        <input type="date" className="form-control" value={data.date} onChange={(e) => setData('date', e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-light)' }} />
                        {errors.date && <div style={{ color: 'var(--red-accent)', fontSize: '0.75rem', marginTop: '4px' }}>{errors.date}</div>}
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>{t('bank_account', 'الحساب البنكي')}</label>
                        <select value={data.bank_account_id} onChange={(e) => setData('bank_account_id', e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                            <option value="">{t('select_bank_account', 'اختر الحساب البنكي')}</option>
                            {bankAccounts.map((account) => (
                                <option key={account.id} value={account.id}>{account.bank?.name} - {account.account_name} ({account.account_number})</option>
                            ))}
                        </select>
                        {errors.bank_account_id && <div style={{ color: 'var(--red-accent)', fontSize: '0.75rem', marginTop: '4px' }}>{errors.bank_account_id}</div>}
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>{t('counterparty_account', 'الحساب المقابل')}</label>
                        <select value={data.counterparty_account_id} onChange={(e) => setData('counterparty_account_id', e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                            <option value="">{t('select_account', 'اختر الحساب')}</option>
                            {filteredAccounts.map((account) => (
                                <option key={account.AccID} value={account.AccID}>{account.AccCode} - {account.AccName}</option>
                            ))}
                        </select>
                        {errors.counterparty_account_id && <div style={{ color: 'var(--red-accent)', fontSize: '0.75rem', marginTop: '4px' }}>{errors.counterparty_account_id}</div>}
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>{t('amount', 'المبلغ')}</label>
                        <input type="number" step="0.01" className="form-control" placeholder="0.00" value={data.amount} onChange={(e) => setData('amount', e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-light)' }} />
                        {errors.amount && <div style={{ color: 'var(--red-accent)', fontSize: '0.75rem', marginTop: '4px' }}>{errors.amount}</div>}
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>{t('status', 'الحالة')}</label>
                        <select value={data.status} onChange={(e) => setData('status', e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                            <option value="posted">{t('posted', 'مرحل')}</option>
                            <option value="draft">{t('draft', 'مسودة')}</option>
                            <option value="cancelled">{t('cancelled', 'ملغي')}</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>{t('reference', 'المرجع')}</label>
                        <input type="text" className="form-control" value={data.reference} onChange={(e) => setData('reference', e.target.value)} placeholder={t('enter_reference', 'أدخل رقم المرجع')} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-light)' }} />
                    </div>

                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>{t('notes', 'ملاحظات')}</label>
                        <textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} rows="3" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-light)' }} placeholder={t('add_notes', 'أضف أي ملاحظات إضافية هنا...')} />
                    </div>

                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button type="submit" className="btn-add-process-custom" style={{ background: 'var(--primary-blue)', color: 'white', border: 'none', flex: 1, justifyContent: 'center' }} disabled={processing}>
                            <span className="material-icons-outlined">save</span>
                            {processing ? t('saving', 'جاري الحفظ...') : (isEditing ? t('update_transaction', 'تحديث العملية') : t('save_transaction', 'حفظ العملية'))}
                        </button>
                        <button type="button" className="btn-add-process-custom" onClick={backToList} style={{ flex: 1, justifyContent: 'center' }}>
                            {t('cancel', 'إلغاء')}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
};

const DetailsView = ({ t, viewingTransaction, backToList, openEdit, accountsMap, formatAmount }) => (
    <div className="fade-in bank-transactions-container">
        <section className="data-section-custom" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
            <div className="search-action-bar-custom">
                <div className="section-title-custom">{t('transaction_details', 'تفاصيل العملية')}</div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-add-process-custom" onClick={() => openEdit(viewingTransaction)}>
                        <span className="material-icons-outlined">edit</span>
                        {t('edit', 'تعديل')}
                    </button>
                    <button className="btn-add-process-custom" onClick={backToList}>
                        <span className="material-icons-outlined">arrow_forward</span>
                        {t('back_to_list', 'العودة')}
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{t('code', 'الكود')}</span>
                    <span style={{ fontWeight: '600' }}>{viewingTransaction?.code}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{t('type', 'النوع')}</span>
                    <span className={`type-badge-custom type-${viewingTransaction?.type}`}>{viewingTransaction?.label}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{t('date', 'التاريخ')}</span>
                    <span>{viewingTransaction?.date}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{t('amount', 'المبلغ')}</span>
                    <span style={{ fontWeight: '700', color: 'var(--primary-blue)', fontSize: '1.1rem' }}>{formatAmount(viewingTransaction?.amount)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '12px', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{t('bank_account', 'الحساب البنكي')}</span>
                    <span style={{ fontWeight: '500' }}>{viewingTransaction?.bank_account?.bank_name} - {viewingTransaction?.bank_account?.account_name}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '12px', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{t('counterparty_account', 'الحساب المقابل')}</span>
                    <span style={{ fontWeight: '500' }}>{accountsMap.get(viewingTransaction?.counterparty_account_id) || '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{t('status', 'الحالة')}</span>
                    <span className={`status-badge-custom status-${viewingTransaction?.status}`}>{t(viewingTransaction?.status, viewingTransaction?.status)}</span>
                </div>
                {viewingTransaction?.notes && (
                    <div style={{ padding: '12px' }}>
                        <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>{t('notes', 'ملاحظات')}</span>
                        <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                            {viewingTransaction.notes}
                        </div>
                    </div>
                )}
            </div>
        </section>
    </div>
);

const BankTransactions = ({ payments = [], receipts = [], bankAccounts = [], accounts = [] }) => {
    const { props } = usePage();
    const { localization } = props;
    const translations = localization?.translations || {};

    const t = (key, fallback) => translations[`BankTransactions.${key}`] || fallback;

    // View States
    const [showForm, setShowForm] = useState(false);
    const [viewingTransaction, setViewingTransaction] = useState(null);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [toast, setToast] = useState(null);

    // Form Hook
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        id: null,
        type: 'receipt',
        code: '',
        bank_account_id: '',
        counterparty_account_id: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        status: 'posted',
        reference: '',
        notes: '',
    });

    // --- Helpers & Memos ---
    
    const showToast = (message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const accountsMap = useMemo(() => {
        const map = new Map();
        accounts.forEach((acc) => {
            map.set(acc.AccID, `${acc.AccCode} - ${acc.AccName}`);
        });
        return map;
    }, [accounts]);

    const filteredAccounts = useMemo(() => {
        return accounts.filter(account => Number(account.AccType) === 1);
    }, [accounts]);

    const transactions = useMemo(() => {
        const all = [...payments, ...receipts].map((item) => ({
            ...item,
            label: item.type === 'payment' ? t('payment', 'صرف بنكي') : t('receipt', 'قبض بنكي'),
        }));
        return all.sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [payments, receipts]);

    const filtered = useMemo(() => {
        return transactions.filter((item) => {
            const matchesTab =
                activeTab === 'all' ||
                (activeTab === 'payments' && item.type === 'payment') ||
                (activeTab === 'receipts' && item.type === 'receipt');
            const term = searchTerm.trim().toLowerCase();
            const matchesSearch =
                !term ||
                item.code?.toLowerCase().includes(term) ||
                item.reference?.toLowerCase().includes(term) ||
                item.bank_account?.bank_name?.toLowerCase().includes(term);
            return matchesTab && matchesSearch;
        });
    }, [transactions, activeTab, searchTerm]);

    // --- Side Effects ---

    useEffect(() => {
        if (editingTransaction) {
            setData({
                id: editingTransaction.id || null,
                type: editingTransaction.type || 'receipt',
                code: editingTransaction.code || '',
                bank_account_id: editingTransaction.bank_account_id || '',
                counterparty_account_id: editingTransaction.counterparty_account_id || '',
                amount: editingTransaction.amount || '',
                date: editingTransaction.date || new Date().toISOString().split('T')[0],
                status: editingTransaction.status || 'posted',
                reference: editingTransaction.reference || '',
                notes: editingTransaction.notes || '',
            });
        } else {
            reset();
            clearErrors();
        }
    }, [editingTransaction]);

    // --- Handlers ---

    const backToList = () => {
        setShowForm(false);
        setEditingTransaction(null);
        setViewingTransaction(null);
        reset();
        clearErrors();
    };

    const openCreate = () => {
        setEditingTransaction(null);
        setViewingTransaction(null);
        setShowForm(true);
    };

    const openEdit = (item) => {
        setEditingTransaction(item);
        setViewingTransaction(null);
        setShowForm(true);
    };

    const openDetails = (item) => {
        setViewingTransaction(item);
        setEditingTransaction(null);
        setShowForm(false);
    };

    const handleDelete = (item) => {
        if (confirm(t('delete_confirmation', 'هل أنت متأكد من حذف هذه العملية؟'))) {
            router.delete(route('admin.bank-transactions.destroy', item.id), {
                data: { type: item.type },
                onSuccess: () => {
                    showToast(t('deleted_success', 'تم حذف العملية بنجاح'), 'success');
                    backToList();
                }
            });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const routeName = editingTransaction ? 'admin.bank-transactions.update' : 'admin.bank-transactions.store';
        const method = editingTransaction ? put : post;
        
        method(route(routeName, data.id), {
            onSuccess: () => {
                showToast(t(editingTransaction ? 'updated_success' : 'created_success', 'تم الحفظ بنجاح'), 'success');
                backToList();
            }
        });
    };

    const formatAmount = (amount) => {
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(Number(amount || 0));
    };

    return (
        <AdminLayout activeMenu="Bank Transactions">
            <Head title={t('bank_transactions', 'حركات البنوك')} />
            <style dangerouslySetInnerHTML={{ __html: mockupStyles }} />
            {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
            <div className="bank-transactions-page">
                <Breadcrumbs 
                    t={t} 
                    showForm={showForm} 
                    viewingTransaction={viewingTransaction} 
                    editingTransaction={editingTransaction} 
                    backToList={backToList} 
                />
                {!showForm && !viewingTransaction && (
                    <ListView 
                        t={t}
                        receipts={receipts}
                        payments={payments}
                        transactions={transactions}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        openCreate={openCreate}
                        filtered={filtered}
                        accountsMap={accountsMap}
                        formatAmount={formatAmount}
                        openDetails={openDetails}
                        openEdit={openEdit}
                        handleDelete={handleDelete}
                    />
                )}
                {showForm && (
                    <FormView 
                        t={t}
                        editingTransaction={editingTransaction}
                        backToList={backToList}
                        handleSubmit={handleSubmit}
                        data={data}
                        setData={setData}
                        errors={errors}
                        bankAccounts={bankAccounts}
                        filteredAccounts={filteredAccounts}
                        processing={processing}
                    />
                )}
                {viewingTransaction && !showForm && (
                    <DetailsView 
                        t={t}
                        viewingTransaction={viewingTransaction}
                        backToList={backToList}
                        openEdit={openEdit}
                        accountsMap={accountsMap}
                        formatAmount={formatAmount}
                    />
                )}
            </div>
        </AdminLayout>
    );
};

export default BankTransactions;

