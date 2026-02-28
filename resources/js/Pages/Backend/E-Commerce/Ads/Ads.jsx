import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AdminLayout from '../../components/AdminLayout';
import { apiService } from '../../../../services/api';

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

const statusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Draft' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'expired', label: 'Expired' },
];

const Ads = () => {
    const [ads, setAds] = useState([]);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [filters, setFilters] = useState({
        search: '',
        status: '',
        location: '',
    });

    const pagesCount = useMemo(() => {
        if (!total || !perPage) {
            return 1;
        }
        return Math.max(1, Math.ceil(total / perPage));
    }, [total, perPage]);

    const loadAds = () => {
        setLoading(true);
        setError('');

        window.axios
            .get(route('admin.ecommerce.ads.index'), {
                params: {
                    page,
                    per_page: perPage,
                    search: filters.search || undefined,
                    status: filters.status || undefined,
                    location: filters.location || undefined,
                },
                headers: {
                    'Accept': 'application/json'
                }
            })
            .then((response) => {
                const payload = response.data;
                setAds(payload.data || []);
                setTotal(payload.total || 0);
                setPerPage(payload.per_page || perPage);
                setPage(payload.current_page || page);
                setSelectedIds([]);
            })
            .catch((err) => {
                console.error(err);
                setError('Failed to load ads. Please try again.');
            })
            .finally(() => {
                setLoading(false);
            });
    };

    useEffect(() => {
        loadAds();
    }, [page, perPage, filters.search, filters.status, filters.location]);

    const handleFilterChange = (event) => {
        const { name, value } = event.target;
        setFilters((prev) => ({
            ...prev,
            [name]: value,
        }));
        setPage(1);
    };

    const handleSelectAll = (event) => {
        if (event.target.checked) {
            const ids = ads.map((ad) => ad.id);
            setSelectedIds(ids);
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (id, checked) => {
        setSelectedIds((prev) => {
            if (checked) {
                if (prev.includes(id)) {
                    return prev;
                }
                return [...prev, id];
            }
            return prev.filter((x) => x !== id);
        });
    };

    const handleDelete = (id) => {
        if (!window.confirm('Delete this ad?')) {
            return;
        }

        window.axios
            .delete(route('admin.ecommerce.ads.destroy', id))
            .then(() => {
                loadAds();
            })
            .catch(() => {
                setError('Failed to delete ad.');
            });
    };

    const handleBulkDelete = () => {
        if (!selectedIds.length) {
            return;
        }
        if (!window.confirm('Delete selected ads?')) {
            return;
        }

        window.axios
            .post(route('admin.ecommerce.ads.bulk-delete'), { ids: selectedIds })
            .then(() => {
                loadAds();
            })
            .catch(() => {
                setError('Failed to delete selected ads.');
            });
    };

    const handleBulkStatus = (status) => {
        if (!selectedIds.length) {
            return;
        }

        window.axios
            .post(route('admin.ecommerce.ads.bulk-status'), {
                ids: selectedIds,
                status,
            })
            .then(() => {
                loadAds();
            })
            .catch(() => {
                setError('Failed to update status.');
            });
    };

    const publishedCount = useMemo(
        () => ads.filter((ad) => ad.status === 'published').length,
        [ads],
    );

    const totalClicks = useMemo(
        () =>
            ads.reduce((sum, ad) => {
                const value = typeof ad.clicked === 'number' ? ad.clicked : 0;
                return sum + value;
            }, 0),
        [ads],
    );

    const renderStatus = (ad) => {
        const base = 'ads-status-badge';
        if (ad.status === 'published') {
            return (
                <span className={`${base} ads-status-published`}>published</span>
            );
        }
        if (ad.status === 'draft') {
            return <span className={`${base} ads-status-draft`}>draft</span>;
        }
        if (ad.status === 'expired') {
            return <span className={`${base} ads-status-expired`}>expired</span>;
        }
        return <span className={`${base} ads-status-inactive`}>inactive</span>;
    };

    const renderImageCell = (ad) => {
        if (!ad.image) {
            return (
                <div className="ads-thumb">
                    <span className="material-icons-outlined">image</span>
                </div>
            );
        }

        const src = resolveMediaUrl(ad.image);

        return (
            <div className="ads-thumb">
                <img src={src} alt={ad.name} />
            </div>
        );
    };

    return (
        <AdminLayout activeMenu="Ads">
            <Head title="Ads Management - ZodicERP" />
            <div className="ads-page">
                <div className="ads-header">
                    <div>
                        <div className="breadcrumb">
                            <Link href={route('admin.dashboard')}>Dashboard</Link>
                            <span>/</span>
                            <span>E-Commerce</span>
                            <span>/</span>
                            <span className="current">Ads</span>
                        </div>
                        <h1 className="ads-header-title">Ads Management</h1>
                    </div>
                    <div className="ads-actions">
                        <Link
                            href={route('admin.ecommerce.ads.create')}
                            className="btn btn-primary"
                        >
                            <span className="material-icons-outlined">add</span>
                            <span>New Ad</span>
                        </Link>
                    </div>
                </div>

                <div className="stats-cards">
                    <div className="stat-card">
                        <div className="stat-icon blue-gradient">
                            <span className="material-icons-outlined">campaign</span>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{total}</div>
                            <div className="stat-label">Total Ads</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon green-gradient">
                            <span className="material-icons-outlined">check_circle</span>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{publishedCount}</div>
                            <div className="stat-label">Published</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon amber-gradient">
                            <span className="material-icons-outlined">mouse</span>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{totalClicks}</div>
                            <div className="stat-label">Clicks (current page)</div>
                        </div>
                    </div>
                </div>

                <div className="ads-card">
                    <div className="ads-filters">
                        <input
                            type="text"
                            name="search"
                            value={filters.search}
                            onChange={handleFilterChange}
                            placeholder="Search by name, key, url..."
                            className="filter-input"
                        />
                        <select
                            name="status"
                            value={filters.status}
                            onChange={handleFilterChange}
                            className="filter-select"
                        >
                            {statusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <input
                            type="text"
                            name="location"
                            value={filters.location}
                            onChange={handleFilterChange}
                            placeholder="Location key..."
                            className="filter-input"
                        />
                    </div>

                    <div className="ads-table-toolbar">
                        <div className="ads-bulk-actions">
                            <span>
                                Selected {selectedIds.length} of {ads.length}
                            </span>
                            <button
                                type="button"
                                className="btn btn-outline"
                                disabled={!selectedIds.length}
                                onClick={handleBulkDelete}
                            >
                                <span className="material-icons-outlined">delete</span>
                                <span>Delete</span>
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline"
                                disabled={!selectedIds.length}
                                onClick={() => handleBulkStatus('published')}
                            >
                                <span className="material-icons-outlined">check_circle</span>
                                <span>Publish</span>
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline"
                                disabled={!selectedIds.length}
                                onClick={() => handleBulkStatus('inactive')}
                            >
                                <span className="material-icons-outlined">pause_circle</span>
                                <span>Deactivate</span>
                            </button>
                        </div>
                        <div>
                            <select
                                className="filter-select"
                                value={perPage}
                                onChange={(event) => {
                                    const value = parseInt(event.target.value, 10);
                                    setPerPage(Number.isFinite(value) ? value : 10);
                                    setPage(1);
                                }}
                            >
                                <option value={10}>10 per page</option>
                                <option value={25}>25 per page</option>
                                <option value={50}>50 per page</option>
                            </select>
                        </div>
                    </div>

                    {error && (
                        <div className="alert alert-danger" style={{ marginBottom: 12 }}>
                            {error}
                        </div>
                    )}

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>
                                        <input
                                            type="checkbox"
                                            checked={
                                                ads.length > 0 &&
                                                selectedIds.length === ads.length
                                            }
                                            onChange={handleSelectAll}
                                        />
                                    </th>
                                    <th>Preview</th>
                                    <th>Ad</th>
                                    <th>Status</th>
                                    <th>Clicks</th>
                                    <th>Order</th>
                                    <th>Expires</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && (
                                    <tr>
                                        <td colSpan={8}>Loading ads...</td>
                                    </tr>
                                )}
                                {!loading && ads.length === 0 && (
                                    <tr>
                                        <td colSpan={8}>No ads found.</td>
                                    </tr>
                                )}
                                {!loading &&
                                    ads.map((ad) => (
                                        <tr key={ad.id}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(ad.id)}
                                                    onChange={(event) =>
                                                        handleSelectRow(
                                                            ad.id,
                                                            event.target.checked,
                                                        )
                                                    }
                                                />
                                            </td>
                                            <td>{renderImageCell(ad)}</td>
                                            <td>
                                                <div className="ads-meta">
                                                    <div>{ad.name}</div>
                                                    <div className="ads-meta-key">
                                                        Key: {ad.key}
                                                    </div>
                                                    {ad.location && (
                                                        <div className="ads-meta-location">
                                                            Location: {ad.location}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>{renderStatus(ad)}</td>
                                            <td>{ad.clicked ?? 0}</td>
                                            <td>{ad.order ?? 0}</td>
                                            <td>
                                                {ad.expired_at
                                                    ? new Date(
                                                          ad.expired_at,
                                                      ).toLocaleString()
                                                    : '-'}
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="icon-btn edit"
                                                    onClick={() =>
                                                        window.location.assign(
                                                            route(
                                                                'admin.ecommerce.ads.edit',
                                                                ad.id,
                                                            ),
                                                        )
                                                    }
                                                >
                                                    <span className="material-icons-outlined">
                                                        edit
                                                    </span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="icon-btn delete"
                                                    onClick={() => handleDelete(ad.id)}
                                                >
                                                    <span className="material-icons-outlined">
                                                        delete
                                                    </span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="ads-pagination">
                        <button
                            type="button"
                            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                            disabled={page <= 1}
                        >
                            Previous
                        </button>
                        <span>
                            Page {page} of {pagesCount}
                        </span>
                        <button
                            type="button"
                            onClick={() =>
                                setPage((prev) =>
                                    prev < pagesCount ? prev + 1 : prev,
                                )
                            }
                            disabled={page >= pagesCount}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default Ads;
