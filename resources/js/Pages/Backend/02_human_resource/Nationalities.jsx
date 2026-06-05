import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import BlankPage from '@/Components/BlankPage';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import StatsCards from '@/Components/stats-cards';
import Table from '@/Pages/Backend/components/Table';
import { toast } from 'react-toastify';
import axios from 'axios';

export default function Nationalities({ initialNationalities }) {
    const [nationalities, setNationalities] = useState(initialNationalities?.data || []);
    const [pagination, setPagination] = useState(initialNationalities || {});
    const [currencies, setCurrencies] = useState([]);
    const [countries, setCountries] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({
        name: '',
        country_code: '',
        region: '',
        currency: '',
        language: '',
        status: 'active',
    });

    const fetchNationalities = useCallback(async (page = 1, searchTerm = '') => {
        setLoading(true);
        try {
            const response = await axios.get(route('admin.nationalities.index'), {
                params: { page, search: searchTerm },
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            setNationalities(response.data.data);
            setPagination(response.data);
        } catch (error) {
            console.error('Error fetching nationalities:', error);
            toast.error('Failed to load nationalities');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchCurrencies = useCallback(async () => {
        try {
            const response = await axios.get('/api/currencies');
            setCurrencies(response.data);
        } catch (error) {
            console.error('Error fetching currencies:', error);
        }
    }, []);

    const fetchCountries = useCallback(async () => {
        try {
            const response = await axios.get('/api/locations/countries');
            setCountries(response.data.data || response.data);
        } catch (error) {
            console.error('Error fetching countries:', error);
        }
    }, []);

    useEffect(() => {
        fetchCurrencies();
        fetchCountries();
    }, [fetchCurrencies, fetchCountries]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (!showForm) {
                fetchNationalities(1, search);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [search, fetchNationalities, showForm]);

    const stats = useMemo(() => [
        { icon: 'public', bgColor: 'var(--primary-color)', value: pagination.total || 0, label: 'Total Nationalities' },
        { icon: 'language', bgColor: 'var(--info-color)', value: [...new Set(nationalities.map(n => n.language))].length, label: 'Current Languages' },
        { icon: 'map', bgColor: 'var(--warning-color)', value: [...new Set(nationalities.map(n => n.region))].length, label: 'Current Regions' },
        { icon: 'check_circle', bgColor: 'var(--success-color)', value: nationalities.filter(n => n.status === 'active').length, label: 'Active' },
    ], [nationalities, pagination.total]);

    const columns = useMemo(() => [
        { 
            header: 'ID', 
            key: 'id', 
            render: (row) => <span className="font-medium text-slate-900">#{row.id}</span> 
        },
        { 
            header: 'Nationality', 
            key: 'name' 
        },
        { 
            header: 'Country Code', 
            key: 'country_code',
            render: (row) => <span className="code-badge">{row.country_code}</span>
        },
        { 
            header: 'Region', 
            key: 'region',
            render: (row) => row.region || '-'
        },
        { 
            header: 'Currency', 
            key: 'currency',
            render: (row) => <span className="font-mono text-xs">{row.currency || '-'}</span>
        },
        { 
            header: 'Status', 
            key: 'status',
            render: (row) => (
                <span className={`status-badge status-badge--${row.status}`}>
                    {row.status}
                </span>
            )
        }
    ], []);

    const openForm = (nat = null) => {
        if (nat) {
            setEditing(nat.id);
            setForm({
                name: nat.name || '',
                country_code: nat.country_code || '',
                region: nat.region || '',
                currency: nat.currency || '',
                language: nat.language || '',
                status: nat.status || 'active',
            });
        } else {
            setEditing(null);
            setForm({
                name: '',
                country_code: '',
                region: '',
                currency: '',
                language: '',
                status: 'active',
            });
        }
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditing(null);
        setForm({
            name: '',
            country_code: '',
            region: '',
            currency: '',
            language: '',
            status: 'active',
        });
    };

    const breadcrumbs = [
        { label: 'Human Resource', href: '#' },
        { label: 'Nationalities', onClick: (e) => { e.preventDefault(); closeForm(); } }
    ];

    if (showForm) {
        breadcrumbs.push({ 
            label: editing ? 'Edit Nationality' : 'Add Nationality' 
        });
    }

    const saveNationality = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editing) {
                await axios.put(route('admin.nationalities.update', editing), form);
                toast.success('Nationality updated successfully');
            } else {
                await axios.post(route('admin.nationalities.store'), form);
                toast.success('Nationality created successfully');
            }
            closeForm();
            fetchNationalities(pagination.current_page, search);
        } catch (error) {
            console.error('Error saving nationality:', error);
            const message = error.response?.data?.message || 'Failed to save nationality';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const deleteNationality = async (id) => {
        if (window.confirm('Are you sure you want to delete this nationality?')) {
            setLoading(true);
            try {
                await axios.delete(route('admin.nationalities.destroy', id));
                toast.success('Nationality deleted successfully');
                fetchNationalities(pagination.current_page, search);
            } catch (error) {
                console.error('Error deleting nationality:', error);
                toast.error('Failed to delete nationality');
            } finally {
                setLoading(false);
            }
        }
    };

    const statsContent = !showForm && <StatsCards items={stats} />;

    return (
        <AdminLayout activeMenu="Human Resource">
            <Head title="Nationalities" />
            
            <BlankPage
                breadcrumbs={breadcrumbs}
                stats={statsContent}
                className="nationalities-page"
            >
                {!showForm ? (
                    <div className="fade-in">
                        <Table
                            tableData={nationalities}
                            columns={columns}
                            showToolbar={true}
                            toolbarSearch={true}
                            toolbarSearchValue={search}
                            onToolbarSearch={setSearch}
                            showAddButton={true}
                            addButtonText="Add Nationality"
                            onAdd={() => openForm()}
                            onEdit={(row) => openForm(row)}
                            onDelete={(row) => deleteNationality(row.id)}
                            currentPage={pagination.current_page}
                            totalPages={pagination.last_page}
                            totalRecords={pagination.total}
                            onPageChange={(page) => fetchNationalities(page, search)}
                            disabled={loading}
                        />
                    </div>
                ) : (
                    <div className="fade-in">
                        <div className="card">
                            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 30px', borderBottom: '1px solid #eee' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <button className="btn btn-outline btn-sm" onClick={closeForm} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 15px', borderRadius: '8px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>
                                        <span className="material-icons-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
                                        <span>Back</span>
                                    </button>
                                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>
                                        {editing ? 'Edit Nationality' : 'Add New Nationality'}
                                    </h2>
                                </div>
                            </div>
                            <form onSubmit={saveNationality}>
                                <div className="card-body" style={{ padding: '30px' }}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div className="form-group">
                                            <InputLabel htmlFor="name" value="Nationality Name" />
                                            <TextInput
                                                id="name"
                                                type="text"
                                                className="mt-1 block w-full"
                                                value={form.name}
                                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                                required
                                                placeholder="e.g. American"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <InputLabel htmlFor="country_code" value="Country Code (ISO)" />
                                            <TextInput
                                                id="country_code"
                                                type="text"
                                                className="mt-1 block w-full"
                                                value={form.country_code}
                                                onChange={(e) => setForm({ ...form, country_code: e.target.value })}
                                                required
                                                placeholder="e.g. US"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div className="form-group">
                                            <InputLabel htmlFor="region" value="Country (Region)" />
                                            <select
                                                id="region"
                                                className="mt-1 block w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
                                                style={{ height: '42px', padding: '0 15px' }}
                                                value={form.region}
                                                onChange={(e) => setForm({ ...form, region: e.target.value })}
                                                required
                                            >
                                                <option value="">Select Country</option>
                                                {countries.map(country => (
                                                    <option key={country.id} value={country.name_json?.en || country.name}>
                                                        {country.name_json?.en || country.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <InputLabel htmlFor="currency" value="Currency" />
                                            <select
                                                id="currency"
                                                className="mt-1 block w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
                                                style={{ height: '42px', padding: '0 15px' }}
                                                value={form.currency}
                                                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                                            >
                                                <option value="">Select Currency</option>
                                                {currencies.map(currency => (
                                                    <option key={currency.id} value={currency.code}>
                                                        {currency.code} - {currency.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="form-group">
                                            <InputLabel htmlFor="language" value="Primary Language" />
                                            <TextInput
                                                id="language"
                                                type="text"
                                                className="mt-1 block w-full"
                                                value={form.language}
                                                onChange={(e) => setForm({ ...form, language: e.target.value })}
                                                placeholder="e.g. English"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <InputLabel htmlFor="status" value="Status" />
                                            <select
                                                id="status"
                                                className="mt-1 block w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
                                                style={{ height: '42px', padding: '0 15px' }}
                                                value={form.status}
                                                onChange={(e) => setForm({ ...form, status: e.target.value })}
                                            >
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', padding: '20px 30px', borderTop: '1px solid #eee', background: '#fcfcfc' }}>
                                    <button type="button" className="px-6 py-2 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-colors" onClick={closeForm}>Cancel</button>
                                    <PrimaryButton type="submit" disabled={loading} style={{ padding: '10px 25px' }}>
                                        {loading ? 'Processing...' : (editing ? 'Update Nationality' : 'Create Nationality')}
                                    </PrimaryButton>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </BlankPage>
        </AdminLayout>
    );
}
