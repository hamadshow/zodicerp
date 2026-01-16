import React, { useEffect, useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import AdminLayout from '../../components/AdminLayout';
import { apiService } from '../../../../services/api';
import '../../../../../css/backend/Reports/COAReport.css';

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
    // Placeholder for export functionality
    alert('Export feature coming soon');
  };

  // Mock balance calculation (since API doesn't provide it yet)
  // In a real scenario, we would map these from the API response
  const calculateBalance = (account) => {
    // Placeholder: Return 0.00 as requested if data is missing
    // Ideally this comes from account.Balance or similar
    return { debit: 0.00, credit: 0.00 };
  };

  return (
    <AdminLayout activeMenu="Financial Reports">
      <div className="COAReport-page">
        <Head title="Chart of Accounts Report - ZodicERP" />

        <div className="breadcrumb">
          <Link href={route('admin')}>Dashboard</Link>
          <span>/</span>
          <Link href={route('admin.reports.index')}>Financial Reports</Link>
          <span>/</span>
          <span>Accountant & Taxes Reports</span>
          <span>/</span>
          <span>Chart of Accounts</span>
        </div>

        <div className="report-header">
          <div className="report-title-section">
            <h1>Chart of Accounts</h1>
            <p className="report-subtitle">Report generated on {new Date().toLocaleDateString()}</p>
          </div>
          <div className="report-actions">
            <button className="btn btn-outline" onClick={handlePrint}>
              <span className="material-icons-outlined">print</span>
              Print
            </button>
            <button className="btn btn-primary" onClick={handleExport}>
              <span className="material-icons-outlined">download</span>
              Export
            </button>
          </div>
        </div>

        <div className="filters-bar">
          <div className="search-input-wrapper">
            <span className="material-icons-outlined search-icon">search</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search by Code or Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="0">Main</option>
            <option value="1">Sub</option>
          </select>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="report-table-container">
          <table className="report-table">
            <thead>
              <tr>
                <th>Account Code</th>
                <th>Account Name</th>
                <th>Type</th>
                <th>Parent Account</th>
                <th>Level</th>
                <th className="text-right">Debit Balance</th>
                <th className="text-right">Credit Balance</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center" style={{ padding: '40px' }}>
                    Loading chart of accounts...
                  </td>
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
                      <td>{account.depth === 0 ? 'Main' : `Level ${account.depth}`}</td>
                      <td className="text-right">{debit.toFixed(2)}</td>
                      <td className="text-right">{credit.toFixed(2)}</td>
                      <td className="text-center">
                        <span className={`status-badge ${account.AccStopped ? 'status-inactive' : 'status-active'}`}>
                          {account.AccStopped ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="empty-state">
                    No accounts found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
