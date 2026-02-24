import React, { useEffect, useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import AdminLayout from '../../components/AdminLayout';
import MediaPickerModal from '../../Media/MediaPickerModal';
import api from '../../../../services/api';
import '../../../../../css/backend/Ads.scss';

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

const AdsCE = () => {
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
                    expired_at: ad.expired_at || '',
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
                            <Link href={route('admin.ecommerce.ads')}>Ads</Link>
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
                                                onClick={() =>
                                                    openMediaPicker('tablet_image')
                                                }
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
                                                <img
                                                    src={preview.tablet_image}
                                                    alt="Tablet"
                                                />
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
                                                onClick={() =>
                                                    openMediaPicker('mobile_image')
                                                }
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
                                                <img
                                                    src={preview.mobile_image}
                                                    alt="Mobile"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="ads-form-actions">
                            <Link
                                href={route('admin.ecommerce.ads')}
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
                multiple={false}
                allowedTypes={['image']}
            />
        </AdminLayout>
    );
};

export default AdsCE;
