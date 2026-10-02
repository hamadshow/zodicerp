import React, { useEffect, useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import AdminLayout from '../../components/AdminLayout';
import { apiService } from '../../../../services/api';

const t = (key, fallback) => {
  const translations = {
    'accountant_and_taxes_reports': 'Accountant & Taxes Reports',
    'all_types': 'All Types',
    'all_status': 'All Status',
    'main': 'Main',
    'sub': 'Sub',
    'active': 'Active',
    'inactive': 'Inactive',
    'print': 'Print',
    'export': 'Export',
    'no_data': 'No accounts found matching your criteria.',
  };
  return translations[key] || fallback;
};

const ACCOUNT_TYPES = [
  { value: 0, label: 'Main' },
  { value: 1, label: 'Sub' },
];

const getAccountTypeLabel = (value) => {
  const found = ACCOUNT_TYPES.find((t) => t.value === Number(value));
  return found ? found.label : 'Unknown';
};

const flattenTree = (nodes, depth = 0, list = []) => {
  nodes.forEach((node) => {
    list.push({ ...node, depth });
    if (Array.isArray(node.children) && node.children.length > 0) {
      flattenTree(node.children, depth + 1, list);
    }
  });
  return list;
};

export default function COAReport() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/accounts/tree');
      const treeData = Array.isArray(response.data) ? response.data : [];
      const flatData = flattenTree(treeData);
      setAccounts(flatData);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      const matchesSearch =
        searchTerm === '' ||
        String(account.AccCode).toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(account.AccName).toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType =
        typeFilter === 'all' || String(account.AccType) === typeFilter;

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && !account.AccStopped) ||
        (statusFilter === 'inactive' && account.AccStopped);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [accounts, searchTerm, typeFilter, statusFilter]);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    alert('Export feature coming soon');
  };

  const calculateBalance = () => {
    return { debit: 0.00, credit: 0.00 };
  };

  return (
    <AdminLayout activeMenu="Financial Reports">
      <Head title="Chart of Accounts Report - ZodicERP" />
      <div className="fr-page">
        <div className="fr-breadcrumb">
          <Link href={route('admin.dashboard', { country: route().params.country || 'sa', lang: route().params.lang || 'en' })}>
            Dashboard
          </Link>
          <span className="fr-sep">/</span>
          <Link href={route('admin.financial-reports.index', { country: route().params.country || 'sa', lang: route().params.lang || 'en' })}>
            Financial Reports
          </Link>
          <span className="fr-sep">/</span>
          <span className="fr-current">{t('accountant_and_taxes_reports', 'Accountant & Taxes Reports')}</span>
        </div>

        <div className="fr-header-card">
          <div>
            <h1 className="fr-title">Chart of Accounts</h1>
            <p className="fr-subtitle">Account hierarchy with debit and credit balances.</p>
          </div>
        </div>

        <div className="fr-filters-card">
          <div className="fr-filters-grid">
            <div className="fr-form-group">
              <label htmlFor="fr-search">Search</label>
              <input
                id="fr-search"
                type="text"
                className="fr-input"
                placeholder="Search by Code or Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="fr-form-group">
              <label htmlFor="fr-type">Type</label>
              <select id="fr-type" className="fr-input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="all">{t('all_types', 'All Types')}</option>
                <option value="0">{t('main', 'Main')}</option>
                <option value="1">{t('sub', 'Sub')}</option>
              </select>
            </div>
            <div className="fr-form-group">
              <label htmlFor="fr-status">Status</label>
              <select id="fr-status" className="fr-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">{t('all_status', 'All Status')}</option>
                <option value="active">{t('active', 'Active')}</option>
                <option value="inactive">{t('inactive', 'Inactive')}</option>
              </select>
            </div>
          </div>
          <div className="fr-form-actions">
            <button type="button" className="btn btn-primary fr-btn" onClick={handlePrint}>
              <span className="material-icons-outlined">print</span>
              <span>{t('print', 'Print')}</span>
            </button>
            <button type="button" className="btn btn-excel fr-btn" onClick={handleExport}>
              <span className="material-icons-outlined">description</span>
              <span>{t('export', 'Export')}</span>
            </button>
          </div>
        </div>

        <div className="fr-table-card">
          <div className="fr-table-wrapper">
            <table className="fr-table">
              <thead>
                <tr>
                  <th className="fr-th">Account Code</th>
                  <th className="fr-th">Account Name</th>
                  <th className="fr-th">Type</th>
                  <th className="fr-th">Parent Account</th>
                  <th className="fr-th">Level</th>
                  <th className="fr-th fr-amount-header">Debit Balance</th>
                  <th className="fr-th fr-amount-header">Credit Balance</th>
                  <th className="fr-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="fr-empty-td">Loading chart of accounts...</td>
                  </tr>
                ) : filteredAccounts.length > 0 ? (
                  filteredAccounts.map((account) => {
                    const { debit, credit } = calculateBalance(account);
                    return (
                      <tr key={account.AccID}>
                        <td className="font-medium">{account.AccCode}</td>
                        <td>
                          <span style={{ paddingLeft: `${account.depth * 20}px` }}>
                            {account.depth > 0 && <span className="level-indicator"></span>}
                            {account.AccName}
                          </span>
                        </td>
                        <td>{getAccountTypeLabel(account.AccType)}</td>
                        <td>{account.AccParent || '-'}</td>
                        <td>{account.depth === 0 ? t('main', 'Main') : `Level ${account.depth}`}</td>
                        <td className="fr-amount">{debit.toFixed(2)}</td>
                        <td className="fr-amount">{credit.toFixed(2)}</td>
                        <td>
                          <span className={`fr-status-badge ${account.AccStopped ? 'fr-status-inactive' : 'fr-status-active'}`}>
                            {account.AccStopped ? t('inactive', 'Inactive') : t('active', 'Active')}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="fr-empty-state">
                      {t('no_data', 'No accounts found matching your criteria.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style jsx>{`{
        .fr-page { padding: 40px; background-color: #f9fafb; min-height: 100vh; }
        .rtl { direction: rtl; text-align: right; }
        .ltr { direction: ltr; text-align: left; }
        .fr-breadcrumb { margin-bottom: 16px; }
        .fr-header-card { margin-bottom: 18px; }
        .fr-filters-card { margin-bottom: 18px; }
        .fr-filters-grid { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; align-items: flex-end; }
        .fr-form-group label { font-size: 0.8rem; font-weight: 500; }
        .fr-input { font-size: 0.85rem; }
        .fr-form-actions { justify-content: flex-start; gap: 8px; }
        .fr-table { font-size: 0.85rem; }
        .fr-table th, .fr-table td { padding: 8px 10px; }
        .fr-table .fr-amount-header { text-align: right; }
        .fr-table .fr-amount { text-align: right; font-variant-numeric: tabular-nums; }
        .fr-status-badge {
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
        }
        .fr-status-active { background: #d4edda; color: #155724; }
        .fr-status-inactive { background: #f8d7da; color: #721c24; }
        .level-indicator {
          display: inline-block;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #94a3b8;
          margin-right: 6px;
        }
        .fr-empty-td { padding: 40px; color: var(--fr-text-lighter); }
        @media print {
          .fr-page { padding: 0; background: white; }
          .fr-breadcrumb, .fr-header-card, .fr-filters-card, .fr-form-actions { display: none !important; }
          .fr-table-card { box-shadow: none !important; margin: 0 !important; width: 100% !important; max-width: none !important; }
          body { background: white !important; }
        }
        .rtl .fr-breadcrumb { direction: rtl; }
      `}</style>
    </AdminLayout>
  );
}
