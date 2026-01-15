import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import '../../../../css/backend/Nationalities.css';
import AdminLayout from '../components/AdminLayout';

const initialData = [
  {
    id: 1,
    name: 'Egyptian',
    countryCode: 'EG',
    region: 'Africa',
    currency: 'EGP',
    language: 'Arabic',
    status: 'active',
    employees: 45,
    createdAt: '2024-01-15',
  },
  {
    id: 2,
    name: 'American',
    countryCode: 'US',
    region: 'North America',
    currency: 'USD',
    language: 'English',
    status: 'active',
    employees: 18,
    createdAt: '2024-01-16',
  },
];

export default function Nationalities() {
  const [nationalities, setNationalities] = useState(initialData);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '',
    countryCode: '',
    region: '',
    currency: '',
    language: '',
    status: 'active',
  });

  const filtered = nationalities.filter((n) =>
    n.name.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditing(null);
    setForm({
      name: '',
      countryCode: '',
      region: '',
      currency: '',
      language: '',
      status: 'active',
    });
    setModalOpen(true);
  };

  const openEdit = (nat) => {
    setEditing(nat.id);
    setForm(nat);
    setModalOpen(true);
  };

  const saveNationality = () => {
    if (editing) {
      setNationalities((prev) =>
        prev.map((n) => (n.id === editing ? { ...form, id: editing } : n))
      );
    } else {
      setNationalities((prev) => [
        ...prev,
        {
          ...form,
          id: Date.now(),
          employees: 0,
          createdAt: new Date().toISOString().split('T')[0],
        },
      ]);
    }
    setModalOpen(false);
  };

  return (
    <>
      <Head title="Nationalities" />
      <AdminLayout activeMenu="Nationalities">
        <div className="nationalities-page">
          <div className="page-header">
            <h2>Nationalities</h2>
            <button className="btn primary" onClick={openAdd}>
              + Add Nationality
            </button>
          </div>

          <div className="toolbar">
            <input
              type="text"
              placeholder="Search nationalities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nationality</th>
                <th>Country</th>
                <th>Region</th>
                <th>Employees</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((n) => (
                <tr key={n.id}>
                  <td>{n.id}</td>
                  <td>{n.name}</td>
                  <td>{n.countryCode}</td>
                  <td>{n.region}</td>
                  <td>{n.employees}</td>
                  <td>
                    <span className={`status ${n.status}`}>{n.status}</span>
                  </td>
                  <td>{n.createdAt}</td>
                  <td>
                    <button className="icon-btn" onClick={() => openEdit(n)}>
                      ✏️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {modalOpen && (
            <div className="modal-overlay">
              <div className="modal">
                <h3>{editing ? 'Edit Nationality' : 'Add Nationality'}</h3>

                <input
                  placeholder="Nationality Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <input
                  placeholder="Country Code"
                  value={form.countryCode}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      countryCode: e.target.value.toUpperCase(),
                    })
                  }
                />
                <input
                  placeholder="Region"
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                />
                <input
                  placeholder="Currency"
                  value={form.currency}
                  onChange={(e) =>
                    setForm({ ...form, currency: e.target.value.toUpperCase() })
                  }
                />
                <input
                  placeholder="Language"
                  value={form.language}
                  onChange={(e) =>
                    setForm({ ...form, language: e.target.value })
                  }
                />

                <div className="modal-actions">
                  <button className="btn" onClick={() => setModalOpen(false)}>
                    Cancel
                  </button>
                  <button className="btn primary" onClick={saveNationality}>
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    </>
  );
}
