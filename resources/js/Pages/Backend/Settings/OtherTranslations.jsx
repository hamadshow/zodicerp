import React, { useState, useEffect } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/Settings/_OtherTranslations.scss';

const OtherTranslations = ({ translations, groups, languages, filters }) => {
  const { localization } = usePage().props;
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [selectedGroup, setSelectedGroup] = useState(filters.group || 'all');
  const [selectedLang, setSelectedLang] = useState(filters.lang || localization?.current_locale || 'ar');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  // Handle Search & Filter
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== filters.search || selectedGroup !== filters.group || selectedLang !== filters.lang) {
        handleFilter();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedGroup, selectedLang]);

  const handleFilter = () => {
    router.get(getLocalizedRoute('admin.settings.other-translations.index'), {
      search: searchTerm,
      group: selectedGroup,
      lang: selectedLang
    }, {
      preserveState: true,
      replace: true
    });
  };

  const handleSync = () => {
    if (confirm('Are you sure you want to sync translations from files? This will update existing keys in the database.')) {
      router.post(getLocalizedRoute('admin.settings.other-translations.sync'));
    }
  };

  const startEditing = (item) => {
    setEditingId(item.id);
    setEditValue(item.text[selectedLang] || '');
  };

  const saveEdit = (id) => {
    router.put(getLocalizedRoute('admin.settings.other-translations.update', { languageLine: id }), {
      locale: selectedLang,
      value: editValue
    }, {
      onSuccess: () => setEditingId(null)
    });
  };

  const getLocalizedRoute = (name, params = {}) => {
    return route(name, {
      country: localization?.country_code || 'sa',
      lang: localization?.current_locale || 'ar',
      ...params
    });
  };

  return (
    <AdminLayout activeMenu="Settings">
      <Head title="Other Translations" />
      
      <div className="translations-page-container">
        {/* Breadcrumbs */}
        <nav className="translations-breadcrumbs">
          <Link href={getLocalizedRoute('admin.dashboard')}>DASHBOARD</Link>
          <span className="separator">/</span>
          <Link href={getLocalizedRoute('admin.settings')}>SETTINGS</Link>
          <span className="separator">/</span>
          <span className="current">OTHER TRANSLATIONS</span>
        </nav>

        {/* Info Alert */}
        <div className="info-alert">
          <span className="material-icons-outlined">info</span>
          <p>
            Click on text to translate. Do NOT translate variables, eg. :user_name, :query, :link...
          </p>
        </div>

        {/* Translation Header Info */}
        <div className="translation-header-info">
          <div className="translate-to">
            Translations: 
            <select 
              className="lang-select" 
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
            >
              {languages.map(lang => (
                <option key={lang.lang_id} value={lang.lang_code}>
                  {lang.lang_name} ({lang.lang_code.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Toolbar */}
        <div className="translations-toolbar">
          <div className="toolbar-filters">
            <div className="search-box">
              <span className="material-icons-outlined search-icon">search</span>
              <input 
                type="text" 
                placeholder="Search keys or values..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="group-filter"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
            >
              <option value="all">All Groups</option>
              {groups.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>

          <div className="toolbar-actions">
            <button className="toolbar-btn" onClick={() => alert('Exporting...')}>
              <span className="material-icons-outlined">export_notes</span>
              Export
            </button>
            <button className="toolbar-btn" onClick={() => alert('Importing...')}>
              <span className="material-icons-outlined">import_export</span>
              Import
            </button>
            <button className="toolbar-btn" onClick={handleSync}>
              <span className="material-icons-outlined">refresh</span>
              Reload (Sync)
            </button>
          </div>
        </div>

        {/* Translations Table */}
        <div className="translations-table-wrapper">
          <table className="translations-table">
            <thead>
              <tr>
                <th width="15%">GROUP</th>
                <th width="35%">KEY</th>
                <th width="50%">{selectedLang.toUpperCase()} VALUE</th>
              </tr>
            </thead>
            <tbody>
              {translations.data.length > 0 ? (
                translations.data.map((item) => (
                  <tr key={item.id}>
                    <td className="group-name">
                      <span className="group-badge">{item.group}</span>
                    </td>
                    <td className="source-text">{item.key}</td>
                    <td className="target-text">
                      {editingId === item.id ? (
                        <div className="edit-wrapper">
                          <textarea 
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            autoFocus
                            onBlur={() => {
                              if (editValue === (item.text[selectedLang] || '')) {
                                setEditingId(null);
                              }
                            }}
                          />
                          <div className="edit-actions">
                            <button onClick={() => saveEdit(item.id)} className="save-btn">
                              <span className="material-icons-outlined">done</span>
                            </button>
                            <button onClick={() => setEditingId(null)} className="cancel-btn">
                              <span className="material-icons-outlined">close</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="view-wrapper" onClick={() => startEditing(item)}>
                          <span className="text-content">
                            {item.text[selectedLang] || <em className="empty-text">Empty translation</em>}
                          </span>
                          <span className="material-icons-outlined edit-icon">edit</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="no-data">No translations found. Click "Reload" to sync from files.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {translations.links && translations.links.length > 3 && (
          <div className="translations-pagination">
            <div className="pagination-info">
              Showing {translations.from} to {translations.to} of {translations.total} entries
            </div>
            <div className="pagination-controls">
              {translations.links.map((link, index) => (
                link.url ? (
                  <Link
                    key={index}
                    href={link.url}
                    className={`page-btn ${link.active ? 'active' : ''}`}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                    preserveScroll
                  />
                ) : (
                  <span
                    key={index}
                    className="page-btn disabled"
                    dangerouslySetInnerHTML={{ __html: link.label }}
                  />
                )
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default OtherTranslations;
