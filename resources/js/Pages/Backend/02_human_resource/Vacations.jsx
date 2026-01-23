import React, { useEffect, useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/Vacations.scss';

/* =====================================================
   CONSTANT DATA (replace with API later)
===================================================== */

const EMPLOYEES = [
  { id: 1, name: 'Ahmed Mohamed', department: 'IT Department' },
  { id: 2, name: 'Sarah Johnson', department: 'Human Resources' },
  { id: 3, name: 'James Wilson', department: 'Sales' },
];

const LEAVE_TYPES = {
  annual: 'Annual Leave',
  sick: 'Sick Leave',
  maternity: 'Maternity Leave',
  unpaid: 'Unpaid Leave',
};

const STATUS_CLASS = {
  approved: 'status-approved',
  pending: 'status-pending',
  rejected: 'status-rejected',
};

/* =====================================================
   MAIN COMPONENT
===================================================== */

export default function VacationsManagement() {
  /* -------------------- STATE -------------------- */
  const [vacations, setVacations] = useState([]);
  const [filters] = useState({ search: '', status: '', type: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState(null);
  const [view, setView] = useState('list');

  /* -------------------- LOAD DATA -------------------- */
  useEffect(() => {
    fetch('/api/vacations')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setVacations(data))
      .catch(() => setVacations([]));
  }, []);

  /* -------------------- FILTERING -------------------- */
  const filtered = useMemo(() => {
    return vacations.filter(
      (v) =>
        (!filters.search ||
          v.employeeName.toLowerCase().includes(filters.search)) &&
        (!filters.status || v.status === filters.status) &&
        (!filters.type || v.leaveType === filters.type)
    );
  }, [vacations, filters]);

  /* -------------------- STATS -------------------- */
  const stats = useMemo(
    () => ({
      total: vacations.length,
      approved: vacations.filter((v) => v.status === 'approved').length,
      pending: vacations.filter((v) => v.status === 'pending').length,
      rejected: vacations.filter((v) => v.status === 'rejected').length,
    }),
    [vacations]
  );

  /* -------------------- HELPERS -------------------- */
  const toastMsg = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* -------------------- CRUD -------------------- */
  const saveVacation = (data) => {
    if (editing) {
      setVacations((v) => v.map((x) => (x.id === editing.id ? data : x)));
      toastMsg('Vacation updated', 'success');
    } else {
      setVacations((v) => [...v, { ...data, id: Date.now() }]);
      toastMsg('Vacation created', 'success');
    }
    setModalOpen(false);
  };

  const deleteVacation = (id) => {
    if (confirm('Delete vacation?')) {
      setVacations((v) => v.filter((x) => x.id !== id));
      toastMsg('Deleted', 'success');
    }
  };

  /* =====================================================
     RENDER
  ===================================================== */
  return (
    <AdminLayout activeMenu="Vacations">
      <Head title="Vacations Management" />

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

      {/* ================= MODAL ================= */}
      {modalOpen && (
        <VacationModal
          employees={EMPLOYEES}
          leaveTypes={LEAVE_TYPES}
          initial={editing}
          onClose={() => setModalOpen(false)}
          onSave={saveVacation}
        />
      )}

      <main className="content">
        {/* ================= HEADER ================= */}
        <div className="page-header">
          <h2>Vacations & Leave</h2>
          <div>
            <button onClick={() => setView('list')}>List</button>
            <button onClick={() => setView('calendar')}>Calendar</button>
          </div>
        </div>

        {/* ================= STATS ================= */}
        <div className="stats-cards">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Approved" value={stats.approved} />
          <StatCard label="Pending" value={stats.pending} />
          <StatCard label="Rejected" value={stats.rejected} />
        </div>

        {/* ================= LIST ================= */}
        {view === 'list' && (
          <div className="table-container">
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              New Request
            </button>

            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Dates</th>
                  <th>Days</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id}>
                    <td>{v.employeeName}</td>
                    <td>{LEAVE_TYPES[v.leaveType]}</td>
                    <td>
                      {v.startDate} → {v.endDate}
                    </td>
                    <td>{v.totalDays}</td>
                    <td>
                      <span className={STATUS_CLASS[v.status]}>{v.status}</span>
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setEditing(v);
                          setModalOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      <button onClick={() => deleteVacation(v.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </AdminLayout>
  );
}

/* =====================================================
   MODAL COMPONENT
===================================================== */

function VacationModal({ employees, leaveTypes, initial, onClose, onSave }) {
  const [form, setForm] = useState(
    initial || {
      employeeId: '',
      employeeName: '',
      leaveType: '',
      startDate: '',
      endDate: '',
      status: 'pending',
      totalDays: 0,
    }
  );

  useEffect(() => {
    if (form.startDate && form.endDate) {
      setForm((f) => ({
        ...f,
        totalDays:
          Math.ceil((new Date(f.endDate) - new Date(f.startDate)) / 86400000) +
          1,
      }));
    }
  }, [form.startDate, form.endDate]);

  const submit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>{initial ? 'Edit Vacation' : 'New Vacation'}</h3>

        <form onSubmit={submit}>
          <select
            value={form.employeeId}
            onChange={(e) => {
              const emp = employees.find((x) => x.id == e.target.value);
              setForm({ ...form, employeeId: emp.id, employeeName: emp.name });
            }}
            required
          >
            <option value="">Employee</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>

          <select
            value={form.leaveType}
            onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
            required
          >
            <option value="">Leave Type</option>
            {Object.entries(leaveTypes).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            required
          />

          <input
            type="date"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            required
          />

          <input value={form.totalDays} readOnly />

          <button type="submit" className="btn btn-primary">
            Save
          </button>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}

/* =====================================================
   STATS CARD
===================================================== */
function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
