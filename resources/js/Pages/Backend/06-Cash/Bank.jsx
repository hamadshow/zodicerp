import React, { useState, useEffect, useCallback } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/main.scss';


const resolveMediaUrl = (value) => {
    if (!value) {
        return null;
    }

    if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
        return value;
    }

    const withoutProtocol =
        typeof value === 'string' ? value.replace(/^https?:\/\/[^/]+/, '') : '';

    const relativePath = withoutProtocol.replace(
        /^\/?(files|storage|media-files)\//,
        ''
    );

    return `/media-files/${relativePath}`;
};

// --- Components ---

const StatsCard = ({ icon, bgColor, value, label }) => (
    <div className="stat-card">
        <div className="stat-icon" style={{ backgroundColor: bgColor }}>
            <span className="material-icons-outlined">{icon}</span>
        </div>
        <div className="stat-content">
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
        </div>
    </div>
);

const FilterTab = ({ id, label, isActive, onClick }) => (
    <div
        className={`filter-tab ${isActive ? 'active' : ''}`}
        onClick={() => onClick(id)}
    >
        {label}
    </div>
);

// --- Modals ---

const AddEditBankModal = ({ isOpen, onClose, bank, isEditing, currencies }) => {
    const { props } = usePage();
    const localization = props.localization;
    const translations = localization?.translations || {};
    const t = (key, fallback) => translations[`Bank.${key}`] || translations[`common.${key}`] || fallback;

    const getLocalizedRoute = (name, params = {}) => {
        return route(name, {
            country: localization?.country_code || 'sa',
            lang: localization?.current_locale || 'ar',
            ...params
        });
    };

    const { data, setData, post, processing, errors, reset } = useForm({
        bank_code: '',
        name: '',
        short_name: '',
        swift_code: '',
        iban_prefix: '',
        country: '',
        currency: '',
        status: 'active',
        logo: null,
    });

    useEffect(() => {
        if (bank) {
            setData({
                bank_code: bank.bank_code || '',
                name: bank.name || '',
                short_name: bank.short_name || '',
                swift_code: bank.swift_code || '',
                iban_prefix: bank.iban_prefix || '',
                country: bank.country || '',
                currency: bank.currency || '',
                status: bank.status || 'active',
                logo: null, // Don't set file input value
            });
        } else {
            reset();
        }
    }, [bank, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isEditing) {
            // Use router.post with _method: put for file upload support in Inertia
            router.post(getLocalizedRoute('admin.banks.update', { bank: bank.id }), {
                _method: 'put',
                ...data,
            }, {
                onSuccess: onClose,
            });
        } else {
            post(getLocalizedRoute('admin.banks.store'), {
                onSuccess: onClose,
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className={`modal-overlay ${isOpen ? 'active' : ''}`}>
            <div className="modal-content">
                <div className="modal-header">
                    <h2>{isEditing ? t('edit_bank', 'Edit Bank') : t('add_new_bank', 'Add New Bank')}</h2>
                    <button className="close-btn" onClick={onClose}>
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">{t('bank_code', 'Bank Code')}</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={data.bank_code}
                                    onChange={e => setData('bank_code', e.target.value)}
                                    placeholder="e.g. BNK001"
                                />
                                {errors.bank_code && <div className="text-red-500 text-xs mt-1">{errors.bank_code}</div>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('short_name', 'Short Name')}</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={data.short_name}
                                    onChange={e => setData('short_name', e.target.value)}
                                    placeholder="e.g. Chase"
                                />
                                {errors.short_name && <div className="text-red-500 text-xs mt-1">{errors.short_name}</div>}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">{t('bank_name', 'Bank Name')}</label>
                            <input
                                type="text"
                                className="form-input"
                                value={data.name}
                                onChange={e => setData('name', e.target.value)}
                                placeholder="Full Bank Name"
                            />
                            {errors.name && <div className="text-red-500 text-xs mt-1">{errors.name}</div>}
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">{t('swift_code', 'SWIFT Code')}</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={data.swift_code}
                                    onChange={e => setData('swift_code', e.target.value)}
                                />
                                {errors.swift_code && <div className="text-red-500 text-xs mt-1">{errors.swift_code}</div>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('iban_prefix', 'IBAN Prefix')}</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={data.iban_prefix}
                                    onChange={e => setData('iban_prefix', e.target.value)}
                                />
                                {errors.iban_prefix && <div className="text-red-500 text-xs mt-1">{errors.iban_prefix}</div>}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">{t('country', 'Country')}</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={data.country}
                                    onChange={e => setData('country', e.target.value)}
                                />
                                {errors.country && <div className="text-red-500 text-xs mt-1">{errors.country}</div>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('currency', 'Currency')}</label>
                                <select
                                    className="form-select"
                                    value={data.currency}
                                    onChange={e => setData('currency', e.target.value)}
                                >
                                    <option value="">{t('select_currency', 'Select Currency')}</option>
                                    {currencies && currencies.map(curr => (
                                        <option key={curr.id} value={curr.code}>
                                            {curr.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.currency && <div className="text-red-500 text-xs mt-1">{errors.currency}</div>}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">{t('status', 'Status')}</label>
                                <select
                                    className="form-select"
                                    value={data.status}
                                    onChange={e => setData('status', e.target.value)}
                                >
                                    <option value="active">{t('active', 'Active')}</option>
                                    <option value="inactive">{t('inactive', 'Inactive')}</option>
                                </select>
                                {errors.status && <div className="text-red-500 text-xs mt-1">{errors.status}</div>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('logo', 'Logo')}</label>
                                <input
                                    type="file"
                                    className="form-input"
                                    onChange={e => setData('logo', e.target.files[0])}
                                    accept="image/*"
                                />
                                {errors.logo && <div className="text-red-500 text-xs mt-1">{errors.logo}</div>}
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>{t('cancel', 'Cancel')}</button>
                        <button type="submit" className="btn btn-primary" disabled={processing}>
                            {processing ? t('saving', 'Saving...') : (isEditing ? t('update_bank', 'Update Bank') : t('save_bank', 'Save Bank'))}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AddEditAccountModal = ({ isOpen, onClose, bankId, account, isEditing, glAccounts, onSuccess, currencies }) => {
    const { props } = usePage();
    const localization = props.localization;
    const translations = localization?.translations || {};
    const t = (key, fallback) => translations[`Bank.${key}`] || translations[`common.${key}`] || fallback;

    const getLocalizedRoute = (name, params = {}) => {
        return route(name, {
            country: localization?.country_code || 'sa',
            lang: localization?.current_locale || 'ar',
            ...params
        });
    };

    const { data, setData, post, put, processing, errors, reset } = useForm({
        bank_id: bankId,
        account_name: '',
        account_number: '',
        iban: '',
        currency: '',
        opening_balance: 0,
        current_balance: 0,
        gl_account_id: '',
        is_default: false,
        status: 'active',
    });

    useEffect(() => {
        if (account) {
            setData({
                bank_id: account.bank_id,
                account_name: account.account_name || '',
                account_number: account.account_number || '',
                iban: account.iban || '',
                currency: account.currency || '',
                opening_balance: account.opening_balance || 0,
                current_balance: account.current_balance || 0,
                gl_account_id: account.gl_account_id || '',
                is_default: account.is_default || false,
                status: account.status || 'active',
            });
        } else {
            reset();
            setData('bank_id', bankId);
            setData('currency', '');
        }
    }, [account, bankId, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const options = {
            onSuccess: () => {
                onSuccess();
                onClose();
            },
            preserveScroll: true,
        };

        if (isEditing) {
            put(getLocalizedRoute('admin.banks.accounts.update', { bankAccount: account.id }), options);
        } else {
            post(getLocalizedRoute('admin.banks.accounts.store'), options);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={`modal-overlay ${isOpen ? 'active' : ''}`} style={{ zIndex: 1100 }}>
            <div className="modal-content">
                <div className="modal-header">
                    <h2>{isEditing ? t('edit_account', 'Edit Account') : t('add_bank_account', 'Add Bank Account')}</h2>
                    <button className="close-btn" onClick={onClose}>
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">{t('account_name', 'Account Name')}</label>
                            <input
                                type="text"
                                className="form-input"
                                value={data.account_name}
                                onChange={e => setData('account_name', e.target.value)}
                                placeholder="e.g. Corporate Checking"
                            />
                            {errors.account_name && <div className="text-red-500 text-xs mt-1">{errors.account_name}</div>}
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">{t('account_number', 'Account Number')}</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={data.account_number}
                                    onChange={e => setData('account_number', e.target.value)}
                                />
                                {errors.account_number && <div className="text-red-500 text-xs mt-1">{errors.account_number}</div>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('currency', 'Currency')}</label>
                                <select
                                    className="form-select"
                                    value={data.currency}
                                    onChange={e => setData('currency', e.target.value)}
                                >
                                    <option value="">{t('select_currency', 'Select Currency')}</option>
                                    {currencies && currencies.map(curr => (
                                        <option key={curr.id} value={curr.id}>
                                            {curr.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.currency && <div className="text-red-500 text-xs mt-1">{errors.currency}</div>}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">{t('iban', 'IBAN')}</label>
                            <input
                                type="text"
                                className="form-input"
                                value={data.iban}
                                onChange={e => setData('iban', e.target.value)}
                            />
                            {errors.iban && <div className="text-red-500 text-xs mt-1">{errors.iban}</div>}
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">{t('opening_balance', 'Opening Balance')}</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="form-input"
                                    value={data.opening_balance}
                                    onChange={e => setData('opening_balance', e.target.value)}
                                />
                                {errors.opening_balance && <div className="text-red-500 text-xs mt-1">{errors.opening_balance}</div>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('current_balance', 'Current Balance')}</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="form-input"
                                    value={data.current_balance}
                                    onChange={e => setData('current_balance', e.target.value)}
                                />
                                {errors.current_balance && <div className="text-red-500 text-xs mt-1">{errors.current_balance}</div>}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">{t('linked_gl_account', 'Linked GL Account')}</label>
                            <select
                                className="form-select"
                                value={data.gl_account_id}
                                onChange={e => setData('gl_account_id', e.target.value)}
                            >
                                <option value="">{t('select_account', 'Select Account')}</option>
                                {glAccounts.map(acc => (
                                    <option key={acc.AccID} value={acc.AccID}>
                                        {acc.AccCode} - {acc.AccName}
                                    </option>
                                ))}
                            </select>
                            {errors.gl_account_id && <div className="text-red-500 text-xs mt-1">{errors.gl_account_id}</div>}
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">{t('status', 'Status')}</label>
                                <select
                                    className="form-select"
                                    value={data.status}
                                    onChange={e => setData('status', e.target.value)}
                                >
                                    <option value="active">{t('active', 'Active')}</option>
                                    <option value="inactive">{t('inactive', 'Inactive')}</option>
                                </select>
                            </div>
                            <div className="form-group flex items-end mb-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data.is_default}
                                        onChange={e => setData('is_default', e.target.checked)}
                                    />
                                    <span>{t('default_account', 'Default Account')}</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>{t('cancel', 'Cancel')}</button>
                        <button type="submit" className="btn btn-primary" disabled={processing}>
                            {processing ? t('saving', 'Saving...') : (isEditing ? t('update_account', 'Update Account') : t('save_account', 'Save Account'))}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ViewBankModal = ({ isOpen, onClose, bank, glAccounts, currencies }) => {
    const { props } = usePage();
    const localization = props.localization;
    const translations = localization?.translations || {};
    const t = (key, fallback) => translations[`Bank.${key}`] || translations[`common.${key}`] || fallback;

    const getLocalizedRoute = (name, params = {}) => {
        return route(name, {
            country: localization?.country_code || 'sa',
            lang: localization?.current_locale || 'ar',
            ...params
        });
    };

    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [accountModalOpen, setAccountModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);

    const fetchAccounts = useCallback(async () => {
        if (!bank) return;
        setLoading(true);
        try {
            const response = await fetch(getLocalizedRoute('admin.banks.accounts.index', { bank: bank.id }));
            if (response.ok) {
                const data = await response.json();
                setAccounts(data);
            }
        } catch (error) {
            console.error('Error fetching accounts:', error);
        } finally {
            setLoading(false);
        }
    }, [bank]);

    useEffect(() => {
        if (isOpen && bank) {
            fetchAccounts();
        }
    }, [isOpen, bank, fetchAccounts]);

    const handleAddAccount = () => {
        setEditingAccount(null);
        setAccountModalOpen(true);
    };

    const handleEditAccount = (account) => {
        setEditingAccount(account);
        setAccountModalOpen(true);
    };

    const handleDeleteAccount = (id) => {
        if (confirm(t('delete_account_confirm', 'Are you sure you want to delete this account?'))) {
            router.delete(getLocalizedRoute('admin.banks.accounts.destroy', { bankAccount: id }), {
                onSuccess: () => fetchAccounts(),
                preserveScroll: true,
            });
        }
    };

    if (!isOpen || !bank) return null;

    return (
        <>
            <div className={`modal-overlay ${isOpen ? 'active' : ''}`}>
                <div className="modal-content large">
                    <div className="modal-header">
                        <h2>{bank.name} - {t('bank_details_accounts', 'Details & Accounts')}</h2>
                        <button className="close-btn" onClick={onClose}>
                            <span className="material-icons-outlined">close</span>
                        </button>
                    </div>
                    <div className="modal-body">
                        <div className="bank-details-grid">
                            <div className="bank-info-sidebar">
                                <div className="bank-logo-preview">
                                    {bank.logo ? (
                                        <img src={resolveMediaUrl(bank.logo)} alt={bank.name} />
                                    ) : (
                                        <span className="material-icons-outlined text-4xl text-gray-300">account_balance</span>
                                    )}
                                </div>
                                <div className="info-item">
                                    <div className="info-label">{t('bank_code', 'Bank Code')}</div>
                                    <div className="info-value">{bank.bank_code}</div>
                                </div>
                                <div className="info-item">
                                    <div className="info-label">{t('swift_code', 'Swift Code')}</div>
                                    <div className="info-value">{bank.swift_code || '-'}</div>
                                </div>
                                <div className="info-item">
                                    <div className="info-label">{t('country', 'Country')}</div>
                                    <div className="info-value">{bank.country || '-'}</div>
                                </div>
                                <div className="info-item">
                                    <div className="info-label">{t('currency', 'Currency')}</div>
                                    <div className="info-value">{bank.currency}</div>
                                </div>
                                <div className="info-item">
                                    <div className="info-label">{t('status', 'Status')}</div>
                                    <span className={`status-badge status-${bank.status}`}>
                                        {bank.status === 'active' ? t('active', 'Active') : t('inactive', 'Inactive')}
                                    </span>
                                </div>
                            </div>

                            <div className="accounts-section">
                                <div className="section-header">
                                    <div className="section-title">{t('bank_accounts', 'Bank Accounts')}</div>
                                    <button className="btn btn-primary" onClick={handleAddAccount} style={{ padding: '6px 12px', fontSize: '12px' }}>
                                        <span className="material-icons-outlined" style={{ fontSize: '16px' }}>add</span>
                                        {t('add_account', 'Add Account')}
                                    </button>
                                </div>

                                {loading ? (
                                    <div className="loading-spinner">
                                        <div className="spinner"></div>
                                        <p>{t('loading_accounts', 'Loading accounts...')}</p>
                                    </div>
                                ) : (
                                    <table className="accounts-table">
                                        <thead>
                                            <tr>
                                                <th>{t('account_name', 'Account Name')}</th>
                                                <th>{t('number_iban', 'Number / IBAN')}</th>
                                                <th>{t('currency', 'Currency')}</th>
                                                <th>{t('balance', 'Balance')}</th>
                                                <th>{t('status', 'Status')}</th>
                                                <th>{t('actions', 'Actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {accounts.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" className="text-center text-gray-500 py-4">
                                                        {t('no_accounts_found', 'No accounts found.')}
                                                    </td>
                                                </tr>
                                            ) : (
                                                accounts.map(acc => (
                                                    <tr key={acc.id}>
                                                        <td>
                                                            <div className="font-medium">{acc.account_name}</div>
                                                            {acc.is_default && (
                                                                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">{t('default', 'Default')}</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <div className="text-sm">{acc.account_number}</div>
                                                            <div className="text-xs text-gray-500">{acc.iban}</div>
                                                        </td>
                                                        <td>
                                                            <span className="currency-badge">{acc.currency_info?.code || acc.currency}</span>
                                                        </td>
                                                        <td>
                                                            <div className="balance-value">{new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(acc.current_balance)}</div>
                                                        </td>
                                                        <td>
                                                            <span className={`status-badge status-${acc.status}`}>
                                                                {acc.status === 'active' ? t('active', 'Active') : t('inactive', 'Inactive')}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div className="flex gap-2">
                                                                <button className="icon-btn edit" onClick={() => handleEditAccount(acc)}>
                                                                    <span className="material-icons-outlined" style={{ fontSize: '18px' }}>edit</span>
                                                                </button>
                                                                <button className="icon-btn delete" onClick={() => handleDeleteAccount(acc.id)}>
                                                                    <span className="material-icons-outlined" style={{ fontSize: '18px' }}>delete</span>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <AddEditAccountModal
                isOpen={accountModalOpen}
                onClose={() => setAccountModalOpen(false)}
                bankId={bank?.id}
                account={editingAccount}
                isEditing={!!editingAccount}
                glAccounts={glAccounts}
                onSuccess={fetchAccounts}
                currencies={currencies}
            />
        </>
    );
};

// --- Main Page Component ---

const Bank = ({ banks, currencies, glAccounts }) => {
    const { props } = usePage();
    const localization = props.localization;
    const translations = localization?.translations || {};
    const t = (key, fallback) => translations[`Bank.${key}`] || translations[`common.${key}`] || fallback;

    const getLocalizedRoute = (name, params = {}) => {
        return route(name, {
            country: localization?.country_code || 'sa',
            lang: localization?.current_locale || 'ar',
            ...params
        });
    };

    const banksData = banks?.data || (Array.isArray(banks) ? banks : []);
    const [searchTerm, setSearchTerm] = useState('');
    const [isBankModalOpen, setIsBankModalOpen] = useState(false);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [currentBank, setCurrentBank] = useState(null);
    const [currentAccount, setCurrentAccount] = useState(null);
    const [selectedBankId, setSelectedBankId] = useState(null);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });

    const [filteredBanks, setFilteredBanks] = useState(banksData);

    useEffect(() => {
        let result = [...banksData];
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(b => 
                (b.name && b.name.toLowerCase().includes(lowerTerm)) ||
                (b.bank_code && b.bank_code.toLowerCase().includes(lowerTerm)) ||
                (b.short_name && b.short_name.toLowerCase().includes(lowerTerm))
            );
        }

        if (sortConfig.key) {
            result.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        setFilteredBanks(result);
    }, [banks, searchTerm, sortConfig]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const fetchBankAccounts = async (bankId) => {
        setLoadingAccounts(true);
        try {
            const response = await fetch(getLocalizedRoute('admin.banks.accounts.index', { bank: bankId }));
            const data = await response.json();
            setBankAccounts(data);
        } catch (error) {
            console.error('Error fetching accounts:', error);
        } finally {
            setLoadingAccounts(false);
        }
    };

    const handleBankDelete = (id) => {
        if (window.confirm(t('delete_bank_confirm', 'Are you sure you want to delete this bank? All associated accounts will also be deleted.'))) {
            router.delete(getLocalizedRoute('admin.banks.destroy', { bank: id }));
        }
    };

    const handleAccountDelete = (id) => {
        if (window.confirm(t('delete_account_confirm', 'Are you sure you want to delete this account?'))) {
            router.delete(getLocalizedRoute('admin.banks.accounts.destroy', { bankAccount: id }), {
                onSuccess: () => fetchBankAccounts(selectedBankId)
            });
        }
    };

    const stats = {
        total: banksData.length,
        active: banksData.filter(b => b.status === 'active').length,
        accounts: banksData.reduce((acc, b) => acc + (b.accounts_count || 0), 0)
    };

    return (
        <AdminLayout activeMenu="Cash">
            <Head title={t('title', 'Bank Management')} />
            
            <div className="breadcrumb">
                <Link href={getLocalizedRoute('admin.dashboard')}>{t('dashboard', 'Dashboard')}</Link>
                <span>/</span>
                <span>{t('title', 'Bank Management')}</span>
            </div>

            <div className="stats-cards">
                <div className="stat-card">
                    <div className="stat-icon bg-blue-500"><span className="material-icons-outlined">account_balance</span></div>
                    <div className="stat-info">
                        <h3>{stats.total}</h3>
                        <p>{t('total_banks', 'Total Banks')}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon bg-green-500"><span className="material-icons-outlined">check_circle</span></div>
                    <div className="stat-info">
                        <h3>{stats.active}</h3>
                        <p>{t('active_page', 'Active (Page)')}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon bg-purple-500"><span className="material-icons-outlined">account_balance_wallet</span></div>
                    <div className="stat-info">
                        <h3>{stats.accounts}</h3>
                        <p>{t('total_accounts_page', 'Total Accounts (Page)')}</p>
                    </div>
                </div>
            </div>

            <div className="bank-management-container">
                <div className="banks-section card">
                    <div className="card-header">
                        <h2>{t('all_banks', 'All Banks')}</h2>
                        <div className="header-actions">
                            <div className="search-bar light">
                                <input 
                                    type="text" 
                                    placeholder={t('search_banks', 'Search banks...')} 
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                                <button><span className="material-icons-outlined">search</span></button>
                            </div>
                            <button className="btn btn-primary" onClick={() => { setCurrentBank(null); setIsBankModalOpen(true); }}>
                                <span className="material-icons-outlined">add</span>
                                <span>{t('add_bank', 'Add Bank')}</span>
                            </button>
                        </div>
                    </div>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th onClick={() => requestSort('id')} className="cursor-pointer">
                                        <div className="flex items-center gap-1">
                                            ID
                                            <span className="material-icons-outlined text-xs">
                                                {sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'sort'}
                                            </span>
                                        </div>
                                    </th>
                                    <th>{t('bank', 'Bank')}</th>
                                    <th>{t('code', 'Code')}</th>
                                    <th>{t('swift_iban_prefix', 'Swift / IBAN Prefix')}</th>
                                    <th>{t('status', 'Status')}</th>
                                    <th>{t('actions', 'Actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBanks.map(bank => (
                                    <tr key={bank.id} className={selectedBankId === bank.id ? 'selected-row' : ''}>
                                        <td>{bank.id}</td>
                                        <td>
                                            <div className="bank-info" onClick={() => { setSelectedBankId(bank.id); fetchBankAccounts(bank.id); }}>
                                                {bank.logo ? <img src={resolveMediaUrl(bank.logo)} alt="" className="bank-logo" /> : <span className="material-icons-outlined">account_balance</span>}
                                                <div className="bank-name-details">
                                                    <strong>{bank.name}</strong>
                                                    <span>{bank.short_name}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{bank.bank_code}</td>
                                        <td>
                                            <div className="prefix-info">
                                                <span>{bank.swift_code || '-'}</span>
                                                <small>{bank.iban_prefix || '-'}</small>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${bank.status}`}>
                                                {bank.status === 'active' ? t('active', 'Active') : t('inactive', 'Inactive')}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button className="icon-btn edit" onClick={() => { setCurrentBank(bank); setIsBankModalOpen(true); }}><span className="material-icons-outlined">edit</span></button>
                                                <button className="icon-btn delete" onClick={() => handleBankDelete(bank.id)}><span className="material-icons-outlined">delete</span></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredBanks.length === 0 && (
                                    <tr><td colSpan="6" className="text-center py-8">{t('no_banks_found', 'No banks found.')}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="accounts-section card">
                    <div className="card-header">
                        <h2>{t('bank_accounts', 'Bank Accounts')}</h2>
                        {selectedBankId && (
                            <button className="btn btn-sm btn-primary" onClick={() => { setCurrentAccount(null); setIsAccountModalOpen(true); }}>
                                <span className="material-icons-outlined">add</span>
                                <span>{t('add_account', 'Add Account')}</span>
                            </button>
                        )}
                    </div>
                    <div className="table-container">
                        {loadingAccounts ? (
                            <div className="loading-state py-8 text-center">{t('loading_accounts', 'Loading accounts...')}</div>
                        ) : selectedBankId ? (
                            <table>
                                <thead>
                                    <tr>
                                        <th>{t('account_name', 'Account Name')}</th>
                                        <th>{t('number_iban', 'Number / IBAN')}</th>
                                        <th>{t('balance', 'Balance')}</th>
                                        <th>{t('actions', 'Actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bankAccounts.map(account => (
                                        <tr key={account.id}>
                                            <td>
                                                <div className="account-info">
                                                    <strong>{account.account_name}</strong>
                                                    {account.is_default && <span className="default-tag">{t('default', 'Default')}</span>}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="number-info">
                                                    <span>{account.account_number}</span>
                                                    <small>{account.iban || '-'}</small>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="balance-info">
                                                    <strong>{account.current_balance.toLocaleString()} {account.currency_info?.code || account.currency}</strong>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button className="icon-btn edit" onClick={() => { setCurrentAccount(account); setIsAccountModalOpen(true); }}><span className="material-icons-outlined">edit</span></button>
                                                    <button className="icon-btn delete" onClick={() => handleAccountDelete(account.id)}><span className="material-icons-outlined">delete</span></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {bankAccounts.length === 0 && (
                                        <tr><td colSpan="4" className="text-center py-8">{t('no_accounts_found', 'No accounts found.')}</td></tr>
                                    )}
                                </tbody>
                            </table>
                        ) : (
                            <div className="select-bank-prompt py-12 text-center text-gray-500">
                                <span className="material-icons-outlined text-4xl mb-2">touch_app</span>
                                <p>{t('select_bank_to_view_accounts', 'Select a bank to view its accounts')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AddEditBankModal 
                isOpen={isBankModalOpen} 
                onClose={() => setIsBankModalOpen(false)} 
                bank={currentBank} 
                isEditing={!!currentBank}
                currencies={currencies}
            />

            <AddEditAccountModal 
                isOpen={isAccountModalOpen} 
                onClose={() => setIsAccountModalOpen(false)} 
                bankId={selectedBankId}
                account={currentAccount}
                isEditing={!!currentAccount}
                glAccounts={glAccounts}
                currencies={currencies}
                onSuccess={() => fetchBankAccounts(selectedBankId)}
            />
        </AdminLayout>
    );
};

export default Bank;
