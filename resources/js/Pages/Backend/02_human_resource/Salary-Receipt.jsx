import React, { useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';

const DEPARTMENTS = {
  it: 'IT Department',
  hr: 'Human Resources',
  sales: 'Sales',
  marketing: 'Marketing',
  finance: 'Finance',
  operations: 'Operations',
  'customer-service': 'Customer Service',
  engineering: 'Engineering',
};

const STATUS_NAMES = {
  paid: 'Paid',
  pending: 'Pending',
  processing: 'Processing',
  cancelled: 'Cancelled',
};

const initialReceipts = [
  {
    id: 1,
    receiptNo: 'SLR-2024-12-001',
    employeeId: 'EMP-001',
    employeeName: 'Ahmed Mohamed',
    position: 'Software Engineer',
    department: 'it',
    period: 'December 2024',
    grossSalary: 6000,
    deductions: 1300,
    netSalary: 4700,
    paymentDate: '2024-12-31',
    status: 'paid',
    paymentMethod: 'Bank Transfer',
    bankAccount: '**** 1234',
  },
  {
    id: 2,
    receiptNo: 'SLR-2024-12-002',
    employeeId: 'EMP-002',
    employeeName: 'Sarah Johnson',
    position: 'HR Manager',
    department: 'hr',
    period: 'December 2024',
    grossSalary: 7500,
    deductions: 1500,
    netSalary: 6000,
    paymentDate: '2024-12-31',
    status: 'paid',
    paymentMethod: 'Bank Transfer',
    bankAccount: '**** 5678',
  },
  {
    id: 3,
    receiptNo: 'SLR-2024-12-003',
    employeeId: 'EMP-003',
    employeeName: 'James Wilson',
    position: 'Sales Director',
    department: 'sales',
    period: 'December 2024',
    grossSalary: 9000,
    deductions: 1800,
    netSalary: 7200,
    paymentDate: '2024-12-31',
    status: 'paid',
    paymentMethod: 'Bank Transfer',
    bankAccount: '**** 9012',
  },
  {
    id: 4,
    receiptNo: 'SLR-2024-12-004',
    employeeId: 'EMP-004',
    employeeName: 'Fatima Al-Mansour',
    position: 'Marketing Specialist',
    department: 'marketing',
    period: 'December 2024',
    grossSalary: 5500,
    deductions: 1100,
    netSalary: 4400,
    paymentDate: '2024-12-31',
    status: 'pending',
    paymentMethod: 'Bank Transfer',
    bankAccount: '**** 3456',
  },
  {
    id: 5,
    receiptNo: 'SLR-2024-12-005',
    employeeId: 'EMP-005',
    employeeName: 'Mohammed Al-Farsi',
    position: 'Financial Analyst',
    department: 'finance',
    period: 'December 2024',
    grossSalary: 6500,
    deductions: 1300,
    netSalary: 5200,
    paymentDate: '2024-12-31',
    status: 'processing',
    paymentMethod: 'Cash',
    bankAccount: 'N/A',
  },
  {
    id: 6,
    receiptNo: 'SLR-2024-12-006',
    employeeId: 'EMP-006',
    employeeName: 'Priya Sharma',
    position: 'Support Manager',
    department: 'customer-service',
    period: 'December 2024',
    grossSalary: 5000,
    deductions: 1000,
    netSalary: 4000,
    paymentDate: '2024-12-31',
    status: 'cancelled',
    paymentMethod: 'Bank Transfer',
    bankAccount: '**** 7890',
  },
  {
    id: 7,
    receiptNo: 'SLR-2024-12-007',
    employeeId: 'EMP-007',
    employeeName: 'Ali Khan',
    position: 'Operations Manager',
    department: 'operations',
    period: 'December 2024',
    grossSalary: 7000,
    deductions: 1400,
    netSalary: 5600,
    paymentDate: '2024-12-31',
    status: 'paid',
    paymentMethod: 'Bank Transfer',
    bankAccount: '**** 2345',
  },
  {
    id: 8,
    receiptNo: 'SLR-2024-12-008',
    employeeId: 'EMP-008',
    employeeName: 'Marie Dubois',
    position: 'Lead Engineer',
    department: 'engineering',
    period: 'December 2024',
    grossSalary: 8500,
    deductions: 1700,
    netSalary: 6800,
    paymentDate: '2024-12-31',
    status: 'pending',
    paymentMethod: 'Bank Transfer',
    bankAccount: '**** 6789',
  },
];

export default function SalaryReceipt() {
  const [receipts, setReceipts] = useState(initialReceipts);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    department: '',
    status: '',
  });
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewing, setViewing] = useState(null);

  const filteredReceipts = useMemo(() => {
    const lower = searchTerm.trim().toLowerCase();
    return receipts.filter((r) => {
      const matchesSearch =
        !lower ||
        r.receiptNo.toLowerCase().includes(lower) ||
        r.employeeName.toLowerCase().includes(lower) ||
        r.employeeId.toLowerCase().includes(lower);

      const matchesDepartment =
        !filters.department || r.department === filters.department;
      const matchesStatus = !filters.status || r.status === filters.status;

      const matchesStart =
        !filters.startDate || r.paymentDate >= filters.startDate;
      const matchesEnd = !filters.endDate || r.paymentDate <= filters.endDate;

      return (
        matchesSearch &&
        matchesDepartment &&
        matchesStatus &&
        matchesStart &&
        matchesEnd
      );
    });
  }, [receipts, searchTerm, filters]);

  const stats = useMemo(() => {
    const totalReceipts = receipts.length;
    const paidCount = receipts.filter((r) => r.status === 'paid').length;
    const pendingCount = receipts.filter((r) => r.status === 'pending').length;
    const processingCount = receipts.filter(
      (r) => r.status === 'processing'
    ).length;
    const totalNetSalary = receipts.reduce((sum, r) => sum + r.netSalary, 0);
    return {
      totalReceipts,
      paidCount,
      pendingCount,
      processingCount,
      totalNetSalary,
    };
  }, [receipts]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredReceipts.length / rowsPerPage)
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageRows = filteredReceipts.slice(
    (safeCurrentPage - 1) * rowsPerPage,
    safeCurrentPage * rowsPerPage
  );

  const toggleSelectAll = (checked) => {
    setSelectedIds(checked ? pageRows.map((r) => r.id) : []);
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const applyBulkAction = () => {
    if (!bulkAction) {
      alert('Please choose a bulk action.');
      return;
    }
    if (selectedIds.length === 0) {
      alert('Please select at least one receipt.');
      return;
    }

    if (bulkAction === 'mark-paid') {
      setReceipts((prev) =>
        prev.map((r) =>
          selectedIds.includes(r.id) ? { ...r, status: 'paid' } : r
        )
      );
    }
    if (bulkAction === 'mark-processing') {
      setReceipts((prev) =>
        prev.map((r) =>
          selectedIds.includes(r.id) ? { ...r, status: 'processing' } : r
        )
      );
    }
    if (bulkAction === 'mark-cancelled') {
      setReceipts((prev) =>
        prev.map((r) =>
          selectedIds.includes(r.id) ? { ...r, status: 'cancelled' } : r
        )
      );
    }
    if (bulkAction === 'delete') {
      if (!confirm(`Delete ${selectedIds.length} receipt(s)?`)) return;
      setReceipts((prev) => prev.filter((r) => !selectedIds.includes(r.id)));
    }

    setSelectedIds([]);
    setBulkAction('');
  };

  const markViewingAsPaid = () => {
    if (!viewing) return;
    setReceipts((prev) =>
      prev.map((r) => (r.id === viewing.id ? { ...r, status: 'paid' } : r))
    );
    setViewing((prev) => (prev ? { ...prev, status: 'paid' } : prev));
  };

  return (
    <AdminLayout activeMenu="Salary Receipt">
      <Head title="Salary Receipt" />

      <div className="breadcrumb">
        <a href="#">Dashboard</a>
        <span>/</span>
        <a href="#">Human Resources</a>
        <span>/</span>
        <span>Salary Receipt</span>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            <span className="material-icons-outlined">receipt_long</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalReceipts}</div>
            <div className="stat-label">Total Receipts</div>
          </div>
        </div>
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ backgroundColor: 'var(--success-color)' }}
          >
            <span className="material-icons-outlined">check_circle</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.paidCount}</div>
            <div className="stat-label">Paid</div>
          </div>
        </div>
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ backgroundColor: 'var(--warning-color)' }}
          >
            <span className="material-icons-outlined">schedule</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.pendingCount}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ backgroundColor: 'var(--info-color)' }}
          >
            <span className="material-icons-outlined">autorenew</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.processingCount}</div>
            <div className="stat-label">Processing</div>
          </div>
        </div>
      </div>

      <div className="salary-card">
        <div className="filter-section">
          <div className="filter-grid">
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                className="form-control"
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, startDate: e.target.value }))
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input
                className="form-control"
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, endDate: e.target.value }))
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <select
                className="form-control"
                value={filters.department}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, department: e.target.value }))
                }
              >
                <option value="">All Departments</option>
                {Object.entries(DEPARTMENTS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-control"
                value={filters.status}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, status: e.target.value }))
                }
              >
                <option value="">All Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="salary-actions">
          <select
            className="btn btn-outline"
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
          >
            <option value="">Bulk Actions</option>
            <option value="mark-paid">Mark as Paid</option>
            <option value="mark-processing">Mark as Processing</option>
            <option value="mark-cancelled">Mark as Cancelled</option>
            <option value="delete">Delete Selected</option>
          </select>
          <button className="btn btn-outline" type="button" onClick={applyBulkAction}>
            <span className="material-icons-outlined">play_arrow</span>
            <span>Apply</span>
          </button>

          <div className="search-bar light" style={{ marginLeft: 'auto' }}>
            <input
              type="text"
              placeholder="Search receipts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="button" onClick={() => {}}>
              <span className="material-icons-outlined">search</span>
            </button>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={
                      pageRows.length > 0 &&
                      selectedIds.length === pageRows.length
                    }
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                  />
                </th>
                <th>RECEIPT NO</th>
                <th>EMPLOYEE</th>
                <th>PERIOD</th>
                <th>GROSS SALARY</th>
                <th>DEDUCTIONS</th>
                <th>NET SALARY</th>
                <th>PAYMENT DATE</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(r.id)}
                      onChange={() => toggleSelectOne(r.id)}
                    />
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--primary-color)' }}>
                      {r.receiptNo}
                    </div>
                  </td>
                  <td>
                    <div className="employee-info">
                      <div className="employee-avatar">
                        <span
                          className="material-icons-outlined"
                          style={{ color: '#94a3b8' }}
                        >
                          person
                        </span>
                      </div>
                      <div className="employee-details">
                        <div className="employee-name">{r.employeeName}</div>
                        <div className="employee-position">{r.position}</div>
                      </div>
                    </div>
                  </td>
                  <td>{r.period}</td>
                  <td>
                    <div className="salary-amount">
                      ${r.grossSalary.toLocaleString()}
                    </div>
                  </td>
                  <td>
                    <div className="salary-deduction">
                      ${r.deductions.toLocaleString()}
                    </div>
                  </td>
                  <td>
                    <div className="salary-net">${r.netSalary.toLocaleString()}</div>
                  </td>
                  <td>{r.paymentDate}</td>
                  <td>
                    <span className={`receipt-status status-${r.status}`}>
                      {STATUS_NAMES[r.status] || r.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="icon-btn"
                      style={{ color: 'var(--info-color)' }}
                      type="button"
                      onClick={() => setViewing(r)}
                    >
                      <span className="material-icons-outlined">visibility</span>
                    </button>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: 20 }}>
                    No receipts found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <div className="pagination-info">
            <select
              className="select-dropdown"
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
                setSelectedIds([]);
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>
              Show from {(safeCurrentPage - 1) * rowsPerPage + 1} to{' '}
              {Math.min(safeCurrentPage * rowsPerPage, filteredReceipts.length)} in{' '}
              <span
                style={{
                  backgroundColor: '#64748b',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontWeight: 600,
                }}
              >
                {filteredReceipts.length}
              </span>{' '}
              records
            </span>
          </div>
          <div className="pagination-controls">
            <button
              className="page-btn"
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
            >
              « Previous
            </button>
            <button className="page-btn active" type="button">
              {safeCurrentPage}
            </button>
            <button
              className="page-btn"
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
            >
              Next »
            </button>
          </div>
        </div>
      </div>

      {viewing && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewing(null);
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Salary Receipt: {viewing.receiptNo}</h3>
              <button
                className="modal-close"
                type="button"
                onClick={() => setViewing(null)}
              >
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="receipt-header">
                <h3>SALARY PAYSLIP</h3>
                <p>RIGHTEG COMPANY LTD.</p>
                <p>
                  Period: <span>{viewing.period}</span>
                </p>
              </div>

              <div className="receipt-info">
                <div>
                  <h4>Employee Information</h4>
                  <p>
                    <strong>Name:</strong> <span>{viewing.employeeName}</span>
                  </p>
                  <p>
                    <strong>Employee ID:</strong> <span>{viewing.employeeId}</span>
                  </p>
                  <p>
                    <strong>Position:</strong> <span>{viewing.position}</span>
                  </p>
                  <p>
                    <strong>Department:</strong>{' '}
                    <span>
                      {DEPARTMENTS[viewing.department] || viewing.department}
                    </span>
                  </p>
                </div>
                <div>
                  <h4>Payment Details</h4>
                  <p>
                    <strong>Receipt No:</strong> <span>{viewing.receiptNo}</span>
                  </p>
                  <p>
                    <strong>Payment Date:</strong> <span>{viewing.paymentDate}</span>
                  </p>
                  <p>
                    <strong>Payment Method:</strong> <span>{viewing.paymentMethod}</span>
                  </p>
                  <p>
                    <strong>Bank Account:</strong> <span>{viewing.bankAccount}</span>
                  </p>
                </div>
              </div>

              <div className="receipt-section">
                <h4>Summary</h4>
                <table className="salary-breakdown">
                  <tbody>
                    <tr>
                      <td>
                        <strong>Gross Salary</strong>
                      </td>
                      <td>
                        <strong>${viewing.grossSalary.toLocaleString()}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Total Deductions</strong>
                      </td>
                      <td>
                        <strong>${viewing.deductions.toLocaleString()}</strong>
                      </td>
                    </tr>
                    <tr className="total-row">
                      <td>
                        <strong>NET SALARY</strong>
                      </td>
                      <td>
                        <strong
                          style={{
                            fontSize: '1.1rem',
                            color: 'var(--success-color)',
                          }}
                        >
                          ${viewing.netSalary.toLocaleString()}
                        </strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn"
                onClick={() => setViewing(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="print-receipt"
                onClick={() => window.print()}
              >
                <span className="material-icons-outlined">print</span>
                Print Receipt
              </button>
              <button
                type="button"
                className="btn btn-success"
                onClick={markViewingAsPaid}
              >
                <span className="material-icons-outlined">check_circle</span>
                Mark as Paid
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

