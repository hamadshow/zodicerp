import React, { useState } from 'react';
import { Head, Link, usePage, useForm } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';

const Locales = () => {
  const { localization, locales_data } = usePage().props;
  const [editingId, setEditingId] = useState(null);
  
  const { data, setData, post, put, delete: destroy, processing, reset, errors } = useForm({
    lang_name: '',
    lang_locale: '',
    lang_code: '',
    lang_flag: '',
    lang_is_rtl: false
  });

  const getLocalizedRoute = (name, params = {}) => {
    return route(name, {
      country: localization?.country_code || 'sa',
      lang: localization?.current_locale || 'ar',
      ...params
    });
  };

  const availableLocales = [
    { name: 'French', locale: 'fr_FR', code: 'fr', flag: 'fr' },
    { name: 'Spanish', locale: 'es_ES', code: 'es', flag: 'es' },
    { name: 'German', locale: 'de_DE', code: 'de', flag: 'de' },
    { name: 'Arabic', locale: 'ar_SA', code: 'ar', flag: 'sa' },
    { name: 'English', locale: 'en_US', code: 'en', flag: 'us' },
    { name: 'Turkish', locale: 'tr_TR', code: 'tr', flag: 'tr' },
  ];

  const handleSelectLocale = (e) => {
    const selected = availableLocales.find(l => l.code === e.target.value);
    if (selected) {
      setData({
        ...data,
        lang_name: selected.name,
        lang_locale: selected.locale,
        lang_code: selected.code,
        lang_flag: selected.flag
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingId) {
      put(getLocalizedRoute('admin.settings.locales.update', { id: editingId }), {
        onSuccess: () => {
          setEditingId(null);
          reset();
        }
      });
    } else {
      post(getLocalizedRoute('admin.settings.locales.store'), {
        onSuccess: () => reset()
      });
    }
  };

  const handleEdit = (locale) => {
    setEditingId(locale.lang_id);
    setData({
      lang_name: locale.lang_name,
      lang_locale: locale.lang_locale,
      lang_code: locale.lang_code,
      lang_flag: locale.lang_flag,
      lang_is_rtl: !!locale.lang_is_rtl
    });
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this language?')) {
      destroy(getLocalizedRoute('admin.settings.locales.destroy', { id }));
    }
  };

  const handleSetDefault = (id) => {
    post(getLocalizedRoute('admin.settings.locales.set-default', { id }));
  };

  return (
    <AdminLayout activeMenu="Settings">
      <Head title="Locales" />
      
      <div className="locales-page-container">
        {/* Breadcrumbs */}
        <nav className="locales-breadcrumbs">
          <Link href={getLocalizedRoute('admin.dashboard')}>DASHBOARD</Link>
          <span className="separator">/</span>
          <Link href={getLocalizedRoute('admin.settings')}>SETTINGS</Link>
          <span className="separator">/</span>
          <span className="current">LOCALES</span>
        </nav>

        <div className="locales-content-grid">
          {/* Add/Edit Locale Section */}
          <div className="locales-card add-locale-card">
            <div className="card-header">
              <h3 className="card-title">{editingId ? 'Edit Locale' : 'Add Locale'}</h3>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Select from list</label>
                  <div className="select-wrapper">
                    <select 
                      onChange={handleSelectLocale}
                      className="locale-select"
                      defaultValue=""
                    >
                      <option value="" disabled>Select locale</option>
                      {availableLocales.map(l => (
                        <option key={l.code} value={l.code}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group mt-3">
                  <label className="form-label">Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={data.lang_name}
                    onChange={e => setData('lang_name', e.target.value)}
                  />
                  {errors.lang_name && <div className="text-danger small">{errors.lang_name}</div>}
                </div>

                <div className="form-group mt-3">
                  <label className="form-label">Locale (e.g. en_US)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={data.lang_locale}
                    onChange={e => setData('lang_locale', e.target.value)}
                  />
                  {errors.lang_locale && <div className="text-danger small">{errors.lang_locale}</div>}
                </div>

                <div className="form-group mt-3">
                  <label className="form-label">Code (e.g. en)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={data.lang_code}
                    onChange={e => setData('lang_code', e.target.value)}
                  />
                  {errors.lang_code && <div className="text-danger small">{errors.lang_code}</div>}
                </div>

                <div className="form-group mt-3">
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={data.lang_is_rtl}
                      onChange={e => setData('lang_is_rtl', e.target.checked)}
                    />
                    <span>Is RTL?</span>
                  </label>
                </div>

                <div className="form-actions mt-4">
                  <button type="submit" className="btn-add-locale" disabled={processing}>
                    {editingId ? 'Update locale' : 'Add new locale'}
                  </button>
                  {editingId && (
                    <button 
                      type="button" 
                      className="btn-cancel ms-2" 
                      onClick={() => { setEditingId(null); reset(); }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Locales List Table Section */}
          <div className="locales-card locales-list-card">
            <div className="card-header">
              <h3 className="card-title">Locales</h3>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="locales-table">
                  <thead>
                    <tr>
                      <th>NAME</th>
                      <th>LOCALE</th>
                      <th>IS DEFAULT?</th>
                      <th className="text-center">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locales_data && locales_data.map((locale) => (
                      <tr key={locale.lang_id}>
                        <td className="font-medium">
                          <div className="d-flex align-items-center">
                            {locale.lang_flag && (
                              <span className={`flag-icon flag-icon-${locale.lang_flag} me-2`}></span>
                            )}
                            {locale.lang_name}
                            {locale.lang_is_rtl ? <span className="badge bg-info ms-2">RTL</span> : ''}
                          </div>
                        </td>
                        <td>{locale.lang_locale}</td>
                        <td>
                          {locale.lang_is_default ? (
                            <span className="text-success fw-bold">Yes</span>
                          ) : (
                            <button 
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => handleSetDefault(locale.lang_id)}
                            >
                              Set Default
                            </button>
                          )}
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="action-btn edit-btn" 
                              title="Edit"
                              onClick={() => handleEdit(locale)}
                            >
                              <span className="material-icons-outlined">edit</span>
                            </button>
                            {!locale.lang_is_default && (
                              <button 
                                className="action-btn delete-btn" 
                                title="Delete"
                                onClick={() => handleDelete(locale.lang_id)}
                              >
                                <span className="material-icons-outlined">delete_outline</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(!locales_data || locales_data.length === 0) && (
                      <tr>
                        <td colSpan="4" className="text-center py-4">No locales found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Locales;
