import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';

const PlatformAdmin = () => {
  const { localization } = usePage().props;

  const getLocalizedRoute = (name, params = {}) => {
    // Fallback to '#' if route is not defined yet
    try {
      return route(name, {
        country: localization?.country_code || 'sa',
        lang: localization?.current_locale || 'ar',
        ...params
      });
    } catch {
      console.warn(`Route ${name} not found`);
      return '#';
    }
  };

  const systemSections = [
    {
      title: 'System',
      items: [
        {
          id: 'users',
          icon: 'people',
          title: 'Users',
          description: 'View and update your system users',
          href: getLocalizedRoute('admin.users.index')
        },
        {
          id: 'roles',
          icon: 'verified_user',
          title: 'Roles And Permissions',
          description: 'View and update your roles and permissions',
          href: getLocalizedRoute('admin.roles.index')
        },
        {
          id: 'activity-logs',
          icon: 'receipt_long',
          title: 'Activity Logs',
          description: 'View and delete your system activity logs',
          href: getLocalizedRoute('admin.activity-logs.index')
        },
        {
          id: 'backup',
          icon: 'backup',
          title: 'Backup',
          description: 'Backup database and uploads folder.',
          href: getLocalizedRoute('admin.backups.index')
        },
        {
          id: 'cronjob',
          icon: 'schedule',
          title: 'Cronjob',
          description: 'Cronjob allow you to automate certain commands or scripts on your site.',
          href: getLocalizedRoute('admin.cronjobs.index')
        },
        {
          id: 'cache',
          icon: 'cached',
          title: 'Cache Management',
          description: 'Clear cache to make your site up to date.',
          href: getLocalizedRoute('admin.cache.index')
        },
        {
          id: 'cleanup',
          icon: 'cleaning_services',
          title: 'Cleanup System',
          description: 'Cleanup your unused data in database',
          href: getLocalizedRoute('admin.cleanup.index')
        },
        {
          id: 'system-info',
          icon: 'info',
          title: 'System Information',
          description: 'All information about current system configuration.',
          href: getLocalizedRoute('admin.system-info.index')
        }
      ]
    }
  ];

  return (
    <AdminLayout activeMenu="Platform Admin">
      <Head title="Platform Admin" />
      
      <div className="platform-admin-page">
        {systemSections.map((section, idx) => (
          <div key={idx} className="platform-admin-card">
            <div className="platform-admin-card__header">
              <h3 className="platform-admin-card__title">{section.title}</h3>
            </div>
            <div className="platform-admin-card__body">
              <div className="platform-admin-grid">
                {section.items.map((item) => (
                  <Link key={item.id} href={item.href} className="platform-admin-item">
                    <div className="platform-admin-item__icon">
                      <span className="material-icons-outlined">{item.icon}</span>
                    </div>
                    <div className="platform-admin-item__content">
                      <h4 className="platform-admin-item__title">{item.title}</h4>
                      <p className="platform-admin-item__description">{item.description}</p>
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

export default PlatformAdmin;
