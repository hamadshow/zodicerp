import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';

const Settings = () => {
  const { localization } = usePage().props;

  const getLocalizedRoute = (name, params = {}) => {
    return route(name, {
      country: localization?.country_code || 'sa',
      lang: localization?.current_locale || 'ar',
      ...params
    });
  };

  const settingsSections = [
    {
      title: 'Localization',
      items: [
        {
          id: 'locales',
          icon: 'language',
          title: 'Locales',
          description: 'View, download and import locales',
          href: getLocalizedRoute('admin.settings.locales.index')
        },
        {
          id: 'theme-translations',
          icon: 'translate',
          title: 'Theme Translations',
          description: 'Manage the theme translations',
          href: getLocalizedRoute('admin.settings.theme-translations.index')
        },
        {
          id: 'other-translations',
          icon: 'forum',
          title: 'Other Translations',
          description: 'Manage the other translations (admin, plugins, packages...)',
          href: getLocalizedRoute('admin.settings.other-translations.index')
        }
      ]
    }
  ];

  return (
    <AdminLayout activeMenu="Settings">
      <Head title="Settings" />
      
      <div className="settings-container">
        {settingsSections.map((section, idx) => (
          <div key={idx} className="settings-card">
            <div className="settings-card-header">
              <h3 className="settings-card-title">{section.title}</h3>
            </div>
            <div className="settings-card-body">
              <div className="settings-grid">
                {section.items.map((item) => (
                  <Link key={item.id} href={item.href} className="settings-item">
                    <div className="settings-item-icon">
                      <span className="material-icons-outlined">{item.icon}</span>
                    </div>
                    <div className="settings-item-content">
                      <h4 className="settings-item-title">{item.title}</h4>
                      <p className="settings-item-description">{item.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default Settings;
