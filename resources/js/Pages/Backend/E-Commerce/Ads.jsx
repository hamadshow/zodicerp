import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import MediaPickerModal from '../Media/MediaPickerModal';
import Modal from '../../../Components/Modal';
import api from '../../../services/api';

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

const initialFormState = {
    name: '',
    key: '',
    location: '',
    url: '',
    status: 'published',
    order: '',
    expired_at: '',
    open_in_new_tab: true,
    ads_type: '',
    google_adsense_slot_id: '',
    image: null,
    tablet_image: null,
    mobile_image: null,
};

const AdsList = () => {
    const [ads, setAds] = useState([]);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [showPreview, setShowPreview] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');
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
                                                    {ad.url && (
                                                        <div className="ads-meta-url">
                                                            <a
                                                                href="#"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    setPreviewUrl(ad.url);
                                                                    setShowPreview(true);
                                                                }}
                                                                className="text-primary hover:underline text-sm"
                                                            >
                                                                Preview URL (Iframe)
                                                            </a>
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
                            onClick={() => setPage((prev) => Math.min(pagesCount, prev + 1))}
                            disabled={page >= pagesCount}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            <Modal show={showPreview} onClose={() => setShowPreview(false)} maxWidth="2xl">
                <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Ad Preview
                    </h3>
                    <div className="mt-2 relative h-96 border rounded bg-gray-100">
                        {previewUrl ? (
                            <iframe
                                src={previewUrl}
                                className="w-full h-full border-0"
                                title="Ad Preview"
                                onError={(e) => console.error('Iframe error:', e)}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">
                                No URL to preview
                            </div>
                        )}
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setShowPreview(false)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
};

const AdsForm = () => {
    const { props } = usePage();
    const mode = props.mode || 'create';
    const adId = props.adId || null;

    const [form, setForm] = useState(initialFormState);
    const [preview, setPreview] = useState({
        image: null,
        tablet_image: null,
        mobile_image: null,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
    const [mediaPickerField, setMediaPickerField] = useState(null);

    const isEdit = mode === 'edit' && adId;

    useEffect(() => {
        if (!isEdit) {
            return;
        }

        setLoading(true);
        api
            .get(`/ads/${adId}`)
            .then((response) => {
                const ad = response.data;
                setForm({
                    name: ad.name || '',
                    key: ad.key || '',
                    location: ad.location || '',
                    url: ad.url || '',
                    status: ad.status || 'published',
                    order:
                        typeof ad.order === 'number' && Number.isFinite(ad.order)
                            ? String(ad.order)
                            : '',
                    expired_at: ad.expired_at ? ad.expired_at.substring(0, 16).replace(' ', 'T') : '',
                    open_in_new_tab: Boolean(ad.open_in_new_tab),
                    ads_type: ad.ads_type || '',
                    google_adsense_slot_id: ad.google_adsense_slot_id || '',
                    image: null,
                    tablet_image: null,
                    mobile_image: null,
                });

                setPreview({
                    image: ad.image ? resolveMediaUrl(ad.image) : null,
                    tablet_image: ad.tablet_image
                        ? resolveMediaUrl(ad.tablet_image)
                        : null,
                    mobile_image: ad.mobile_image
                        ? resolveMediaUrl(ad.mobile_image)
                        : null,
                });
            })
            .catch(() => {
                setError('Failed to load ad details.');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [isEdit, adId]);

    const openMediaPicker = (field) => {
        setMediaPickerField(field);
        setIsMediaPickerOpen(true);
    };

    const handleMediaSelect = (selected) => {
        if (!mediaPickerField || !selected) {
            return;
        }

        const processPath = (path) => {
            if (!path) {
                return '';
            }
            const withoutProtocol =
                typeof path === 'string'
                    ? path.replace(/^https?:\/\/[^/]+/, '')
                    : '';

            return withoutProtocol.replace(
                /^\/?(files|storage|media-files)\//,
                ''
            );
        };

        const relativePath = processPath(selected.file_path);

        setForm((prev) => ({
            ...prev,
            [mediaPickerField]: relativePath,
        }));

        setPreview((prev) => ({
            ...prev,
            [mediaPickerField]: resolveMediaUrl(relativePath),
        }));
    };

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleFileChange = (field) => (event) => {
        const file = event.target.files && event.target.files[0] ? event.target.files[0] : null;
        setForm((prev) => ({
            ...prev,
            [field]: file,
        }));

        if (file) {
            const url = URL.createObjectURL(file);
            setPreview((prev) => ({
                ...prev,
                [field]: url,
            }));
        }
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        if (!form.name.trim() || !form.key.trim()) {
            setError('Name and Key are required.');
            return;
        }

        const formData = new FormData();
        formData.append('name', form.name);
        formData.append('key', form.key);
        formData.append('location', form.location || '');
        formData.append('url', form.url || '');
        if (form.status) {
            formData.append('status', form.status);
        }
        if (form.order !== '') {
            formData.append('order', String(form.order));
        }
        if (form.expired_at) {
            formData.append('expired_at', form.expired_at);
        }
        formData.append('open_in_new_tab', form.open_in_new_tab ? '1' : '0');
        if (form.ads_type) {
            formData.append('ads_type', form.ads_type);
        }
        if (form.google_adsense_slot_id) {
            formData.append(
                'google_adsense_slot_id',
                form.google_adsense_slot_id,
            );
        }

        if (form.image instanceof File) {
            formData.append('image', form.image);
        } else if (typeof form.image === 'string' && form.image.trim() !== '') {
            formData.append('image_path', form.image);
        }
        if (form.tablet_image instanceof File) {
            formData.append('tablet_image', form.tablet_image);
        } else if (
            typeof form.tablet_image === 'string' &&
            form.tablet_image.trim() !== ''
        ) {
            formData.append('tablet_image_path', form.tablet_image);
        }
        if (form.mobile_image instanceof File) {
            formData.append('mobile_image', form.mobile_image);
        } else if (
            typeof form.mobile_image === 'string' &&
            form.mobile_image.trim() !== ''
        ) {
            formData.append('mobile_image_path', form.mobile_image);
        }

        setLoading(true);
        const request = isEdit
            ? api.post(`/ads/${adId}`, formData, {
                  headers: { 'Content-Type': 'multipart/form-data' },
              })
            : api.post('/ads', formData, {
                  headers: { 'Content-Type': 'multipart/form-data' },
              });

        request
            .then(() => {
                setSuccess('Ad saved successfully.');
                if (!isEdit) {
                    setForm(initialFormState);
                    setPreview({
                        image: null,
                        tablet_image: null,
                        mobile_image: null,
                    });
                }
            })
            .catch((e) => {
                const data = e.response && e.response.data ? e.response.data : null;
                if (data && data.errors) {
                    const messages = Object.values(data.errors)
                        .flat()
                        .join(' ');
                    setError(messages || 'Failed to save ad.');
                } else if (data && data.message) {
                    setError(data.message);
                } else {
                    setError('Failed to save ad.');
                }
            })
            .finally(() => {
                setLoading(false);
            });
    };

    const pageTitle = isEdit ? 'Edit Ad' : 'Create Ad';

    return (
        <AdminLayout activeMenu="Ads">
            <Head title={pageTitle} />
            <div className="ads-page">
                <div className="ads-header">
                    <div>
                        <div className="breadcrumb">
                            <Link href={route('admin.dashboard')}>Dashboard</Link>
                            <span>/</span>
                            <span>E-Commerce</span>
                            <span>/</span>
                            <Link href={route('admin.ecommerce.ads.index')}>Ads</Link>
                            <span>/</span>
                            <span className="current">{pageTitle}</span>
                        </div>
                        <h1 className="ads-header-title">{pageTitle}</h1>
                    </div>
                </div>

                <div className="ads-card">
                    {error && (
                        <div className="alert alert-danger" style={{ marginBottom: 12 }}>
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="alert alert-success" style={{ marginBottom: 12 }}>
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="ads-form">
                        <div className="ads-form-grid">
                            <div className="ads-form-group">
                                <label className="ads-form-label">Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    className="ads-form-control"
                                    required
                                />
                            </div>
                            <div className="ads-form-group">
                                <label className="ads-form-label">Key</label>
                                <input
                                    type="text"
                                    name="key"
                                    value={form.key}
                                    onChange={handleChange}
                                    className="ads-form-control"
                                    required
                                />
                            </div>
                            <div className="ads-form-group">
                                <label className="ads-form-label">Location</label>
                                <input
                                    type="text"
                                    name="location"
                                    value={form.location}
                                    onChange={handleChange}
                                    className="ads-form-control"
                                    placeholder="homepage_slider, homepage_side, sidebar_right"
                                />
                                <span className="ads-form-helper">
                                    Use &quot;homepage_slider&quot; for the main homepage slider and
                                    &quot;homepage_side&quot; for the left column ads.
                                </span>
                            </div>
                            <div className="ads-form-group">
                                <label className="ads-form-label">Target URL</label>
                                <input
                                    type="url"
                                    name="url"
                                    value={form.url}
                                    onChange={handleChange}
                                    className="ads-form-control"
                                    placeholder="https://example.com"
                                />
                            </div>
                            <div className="ads-form-group">
                                <label className="ads-form-label">Status</label>
                                <select
                                    name="status"
                                    value={form.status}
                                    onChange={handleChange}
                                    className="ads-form-control"
                                >
                                    <option value="published">Published</option>
                                    <option value="draft">Draft</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            <div className="ads-form-group">
                                <label className="ads-form-label">Display Order</label>
                                <input
                                    type="number"
                                    name="order"
                                    value={form.order}
                                    onChange={handleChange}
                                    className="ads-form-control"
                                    min="0"
                                    placeholder="Auto if empty"
                                />
                            </div>
                            <div className="ads-form-group">
                                <label className="ads-form-label">Expire At</label>
                                <input
                                    type="datetime-local"
                                    name="expired_at"
                                    value={form.expired_at || ''}
                                    onChange={handleChange}
                                    className="ads-form-control"
                                />
                            </div>
                            <div className="ads-form-group">
                                <label className="ads-form-label">Ads Type</label>
                                <select
                                    name="ads_type"
                                    value={form.ads_type}
                                    onChange={handleChange}
                                    className="ads-form-control"
                                >
                                    <option value="">Select type</option>
                                    <option value="image">Image</option>
                                    <option value="google_adsense">Google AdSense</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>
                            <div className="ads-form-group">
                                <label className="ads-form-label">
                                    Google AdSense Slot ID
                                </label>
                                <input
                                    type="text"
                                    name="google_adsense_slot_id"
                                    value={form.google_adsense_slot_id}
                                    onChange={handleChange}
                                    className="ads-form-control"
                                    placeholder="ca-pub-xxxxxxxx"
                                />
                            </div>
                        </div>

                        <div className="ads-checkbox-row">
                            <input
                                type="checkbox"
                                id="open_in_new_tab"
                                name="open_in_new_tab"
                                checked={form.open_in_new_tab}
                                onChange={handleChange}
                            />
                            <label htmlFor="open_in_new_tab">Open in new tab</label>
                        </div>

                        <div style={{ marginTop: 24 }}>
                            <h3 className="ads-form-label">Images</h3>
                            <div className="ads-form-grid">
                                <div className="ads-form-group">
                                    <label className="ads-form-label">
                                        Desktop Image (main)
                                    </label>
                                    <div>
                                        <div className="input-group">
                                            <input
                                                type="text"
                                                className="ads-form-control"
                                                value={
                                                    form.image
                                                        ? form.image instanceof File
                                                            ? form.image.name
                                                            : form.image
                                                        : ''
                                                }
                                                readOnly
                                                placeholder="No file selected"
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-outline"
                                                onClick={() => openMediaPicker('image')}
                                            >
                                                Choose from Media
                                            </button>
                                        </div>
                                        <div style={{ marginTop: 8 }}>
                                            <small>Or upload new:</small>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange('image')}
                                                className="ads-file-input"
                                            />
                                        </div>
                                    </div>
                                    {preview.image && (
                                        <div className="ads-preview-row">
                                            <div className="ads-preview-item">
                                                <img src={preview.image} alt="Desktop" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="ads-form-group">
                                    <label className="ads-form-label">Tablet Image</label>
                                    <div>
                                        <div className="input-group">
                                            <input
                                                type="text"
                                                className="ads-form-control"
                                                value={
                                                    form.tablet_image
                                                        ? form.tablet_image instanceof File
                                                            ? form.tablet_image.name
                                                            : form.tablet_image
                                                        : ''
                                                }
                                                readOnly
                                                placeholder="No file selected"
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-outline"
                                                onClick={() => openMediaPicker('tablet_image')}
                                            >
                                                Choose from Media
                                            </button>
                                        </div>
                                        <div style={{ marginTop: 8 }}>
                                            <small>Or upload new:</small>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange('tablet_image')}
                                                className="ads-file-input"
                                            />
                                        </div>
                                    </div>
                                    {preview.tablet_image && (
                                        <div className="ads-preview-row">
                                            <div className="ads-preview-item">
                                                <img src={preview.tablet_image} alt="Tablet" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="ads-form-group">
                                    <label className="ads-form-label">Mobile Image</label>
                                    <div>
                                        <div className="input-group">
                                            <input
                                                type="text"
                                                className="ads-form-control"
                                                value={
                                                    form.mobile_image
                                                        ? form.mobile_image instanceof File
                                                            ? form.mobile_image.name
                                                            : form.mobile_image
                                                        : ''
                                                }
                                                readOnly
                                                placeholder="No file selected"
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-outline"
                                                onClick={() => openMediaPicker('mobile_image')}
                                            >
                                                Choose from Media
                                            </button>
                                        </div>
                                        <div style={{ marginTop: 8 }}>
                                            <small>Or upload new:</small>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange('mobile_image')}
                                                className="ads-file-input"
                                            />
                                        </div>
                                    </div>
                                    {preview.mobile_image && (
                                        <div className="ads-preview-row">
                                            <div className="ads-preview-item">
                                                <img src={preview.mobile_image} alt="Mobile" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="ads-form-actions">
                            <Link
                                href={route('admin.ecommerce.ads.index')}
                                className="btn btn-outline"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                            >
                                {loading ? 'Saving...' : 'Save Ad'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <MediaPickerModal
                isOpen={isMediaPickerOpen}
                onClose={() => setIsMediaPickerOpen(false)}
                onSelect={handleMediaSelect}
            />
        </AdminLayout>
    );
};

const Ads = () => {
    const { props } = usePage();
    const mode = props.mode;

    if (mode === 'create' || mode === 'edit') {
        return <AdsForm />;
    }

    return <AdsList />;
};

export default Ads;