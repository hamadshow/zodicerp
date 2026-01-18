import React, { useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/CompanyInfo.css';

const CompanyInfo = ({ companies }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this company info?')) {
            router.delete(route('admin.company_info.destroy', id));
        }
    };

    const stats = useMemo(() => {
        const totalCompanies = companies.length;
        const countriesSet = new Set();
        let withLogo = 0;
        let withContact = 0;

        companies.forEach((company) => {
            const countryName = company.country_data?.name || company.country;
            if (countryName) {
                countriesSet.add(countryName);
            }
            if (company.logo) {
                withLogo += 1;
            }
            if (company.email_address || company.official_email) {
                withContact += 1;
            }
        });

        return {
            totalCompanies,
            totalCountries: countriesSet.size,
            withLogo,
            withContact,
        };
    }, [companies]);

    const filteredCompanies = useMemo(() => {
        if (!searchTerm.trim()) {
            return companies;
        }

        const term = searchTerm.toLowerCase();

        return companies.filter((company) => {
            const name = company.company_name || '';
            const code = company.company_code || '';
            const type = company.company_type || '';
            const countryName = company.country_data?.name || company.country || '';

            return (
                name.toLowerCase().includes(term) ||
                String(code).toLowerCase().includes(term) ||
                type.toLowerCase().includes(term) ||
                String(countryName).toLowerCase().includes(term)
            );
        });
    }, [companies, searchTerm]);

    return (
        <AdminLayout activeMenu="Company Info">
            <Head title="Company Information" />
            <div className="Essential-Data-Container">
                <div className="page-header">
                    <h1 className="text-2xl font-bold text-gray-800">Company Information</h1>
                </div>

                <div className="stats-cards">
                    <div className="stat-card">
                        <div
                            className="stat-icon"
                            style={{ backgroundColor: 'var(--primary-color)' }}
                        >
                            <span className="material-icons-outlined">apartment</span>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.totalCompanies}</div>
                            <div className="stat-label">Total Companies</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div
                            className="stat-icon"
                            style={{ backgroundColor: 'var(--success-color)' }}
                        >
                            <span className="material-icons-outlined">public</span>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.totalCountries}</div>
                            <div className="stat-label">Countries</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div
                            className="stat-icon"
                            style={{ backgroundColor: 'var(--info-color)' }}
                        >
                            <span className="material-icons-outlined">image</span>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.withLogo}</div>
                            <div className="stat-label">With Logo</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div
                            className="stat-icon"
                            style={{ backgroundColor: 'var(--warning-color)' }}
                        >
                            <span className="material-icons-outlined">mark_email_read</span>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.withContact}</div>
                            <div className="stat-label">With Contact Email</div>
                        </div>
                    </div>
                </div>

                <div className="tasks-card">
                    <div className="card-header">
                        <div className="tasks-actions">
                            <div className="search-bar light">
                                <input
                                    type="text"
                                    placeholder="Search companies..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <button type="button">
                                    <span className="material-icons-outlined">search</span>
                                </button>
                            </div>
                        </div>
                        <div className="tasks-actions">
                            <Link
                                href={route('admin.company_info.create')}
                                className="btn btn-primary no-underline"
                            >
                                <span className="material-icons-outlined">add_business</span>
                                <span>Add Company</span>
                            </Link>
                        </div>
                    </div>

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>COMPANY NAME</th>
                                    <th>CODE</th>
                                    <th>TYPE</th>
                                    <th>COUNTRY</th>
                                    <th>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCompanies.length > 0 ? (
                                    filteredCompanies.map((company) => (
                                        <tr key={company.id}>
                                            <td>#{company.id}</td>
                                            <td>{company.company_name}</td>
                                            <td>{company.company_code || '-'}</td>
                                            <td className="capitalize">{company.company_type || '-'}</td>
                                            <td className="uppercase">
                                                {company.country_data?.name || company.country || '-'}
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="icon-btn edit"
                                                    title="Edit"
                                                    onClick={() =>
                                                        router.get(
                                                            route('admin.company_info.edit', company.id)
                                                        )
                                                    }
                                                >
                                                    <span className="material-icons-outlined">edit</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="icon-btn delete"
                                                    title="Delete"
                                                    onClick={() => handleDelete(company.id)}
                                                >
                                                    <span className="material-icons-outlined">delete</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="text-center text-gray-500 py-6">
                                            No company information found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="pagination">
                        <div className="pagination-info">
                            <span>
                                Showing{' '}
                                <strong>{filteredCompanies.length}</strong> of{' '}
                                <strong>{companies.length}</strong> companies
                            </span>
                        </div>
                        <div className="pagination-controls">
                            <button className="page-btn active" disabled>
                                1
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default CompanyInfo;
