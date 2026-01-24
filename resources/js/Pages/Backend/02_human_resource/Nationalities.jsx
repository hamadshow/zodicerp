import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/Nationalities.scss';

const initialData = [
    {
        id: 1,
        name: 'American',
        countryCode: 'US',
        region: 'North America',
        currency: 'USD',
        language: 'English',
        status: 'active',
        employees: 18,
        createdAt: '2024-01-16',
    },
    // Add more mock data if needed
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

    const saveNationality = (e) => {
        e.preventDefault();
        if (editing) {
            setNationalities(nationalities.map(n => n.id === editing ? { ...form, id: editing } : n));
        } else {
            setNationalities([...nationalities, { ...form, id: Date.now(), createdAt: new Date().toISOString().split('T')[0] }]);
        }
        setModalOpen(false);
    };

    return (
        <AdminLayout activeMenu="Nationalities">
            <Head title="Nationalities" />
            
            <div className="nationalities-container">
                <div className="header-actions">
                    <h2 className="text-2xl font-bold">Nationalities</h2>
                    <button className="btn btn-primary" onClick={openAdd}>
                        <span className="material-icons-outlined">add</span>
                        Add Nationality
                    </button>
                </div>

                <div className="toolbar mt-4 mb-4">
                    <input
                        type="text"
                        placeholder="Search nationalities..."
                        className="form-input"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="table-container">
                    <table className="data-table w-full">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nationality</th>
                                <th>Country Code</th>
                                <th>Region</th>
                                <th>Currency</th>
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
                                    <td>{n.currency}</td>
                                    <td>{n.status}</td>
                                    <td>{n.createdAt}</td>
                                    <td>
                                        <button className="icon-btn text-blue-600" onClick={() => openEdit(n)}>
                                            <span className="material-icons-outlined">edit</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan="8" className="text-center p-4">No nationalities found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {modalOpen && (
                    <div className="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="modal bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                            <h3 className="text-xl font-bold mb-4">{editing ? 'Edit Nationality' : 'Add Nationality'}</h3>
                            <form onSubmit={saveNationality}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Nationality Name</label>
                                        <input
                                            type="text"
                                            className="form-input w-full mt-1 border rounded p-2"
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Country Code</label>
                                        <input
                                            type="text"
                                            className="form-input w-full mt-1 border rounded p-2"
                                            value={form.countryCode}
                                            onChange={(e) => setForm({ ...form, countryCode: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Region</label>
                                        <input
                                            type="text"
                                            className="form-input w-full mt-1 border rounded p-2"
                                            value={form.region}
                                            onChange={(e) => setForm({ ...form, region: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Currency</label>
                                        <input
                                            type="text"
                                            className="form-input w-full mt-1 border rounded p-2"
                                            value={form.currency}
                                            onChange={(e) => setForm({ ...form, currency: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Language</label>
                                        <input
                                            type="text"
                                            className="form-input w-full mt-1 border rounded p-2"
                                            value={form.language}
                                            onChange={(e) => setForm({ ...form, language: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="modal-actions mt-6 flex justify-end space-x-3">
                                    <button type="button" className="btn btn-secondary px-4 py-2 bg-gray-200 rounded" onClick={() => setModalOpen(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary px-4 py-2 bg-blue-600 text-white rounded">
                                        Save
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
