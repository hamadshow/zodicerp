import { Link, usePage, router } from '@inertiajs/react';

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

const Header = ({ isRtl }) => {
  const { auth, localization } = usePage().props;
  const user = auth.user;
  const currentLocale = localization?.current_locale || 'ar';

  const switchLanguage = (lang) => {
    // Current URL format: /{country}/{lang}/admin/...
    const currentPath = window.location.pathname;
    const pathSegments = currentPath.split('/').filter(Boolean);
    
    // Check if we are in the investing section
    const isInvesting = currentPath.includes('/admin/investing');
    
    if (isInvesting && pathSegments.length >= 2) {
      // Specifically handle the switch for investing routes to keep the same page
      pathSegments[1] = lang;
      const newPath = '/' + pathSegments.join('/') + window.location.search;
      router.visit(newPath);
    } else if (pathSegments.length >= 2) {
      // Default behavior for other routes
      pathSegments[1] = lang;
      const newPath = '/' + pathSegments.join('/') + window.location.search;
      router.visit(newPath);
    }
  };

  return (
    <header className="header">
      <div className="header-actions">
        <div className="language-switcher">
          <button 
            className={`lang-btn ${currentLocale === 'en' ? 'active' : ''}`}
            onClick={() => currentLocale !== 'en' && switchLanguage('en')}
            title="English"
          >
            EN
          </button>
          <button 
            className={`lang-btn ${currentLocale === 'ar' ? 'active' : ''}`}
            onClick={() => currentLocale !== 'ar' && switchLanguage('ar')}
            title="العربية"
          >
            AR
          </button>
        </div>
        <button className="action-btn">
          <span className="material-icons-outlined">dark_mode</span>
        </button>
        <button className="action-btn">
          <span className="material-icons-outlined">notifications</span>
          <span className="badge">2</span>
        </button>
        <button className="action-btn">
          <span className="material-icons-outlined">email</span>
          <span className="badge">10</span>
        </button>
        <button className="action-btn">
          <span className="material-icons-outlined">shopping_cart</span>
          <span className="badge">2</span>
        </button>
        <div className="user-profile">
          {user && user.avatar ? (
            <img
              src={resolveMediaUrl(user.avatar)}
              alt={user.name}
              className="avatar"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div className="avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
          )}
          <div className="user-info">
            <div>{user?.name || 'Guest'}</div>
            <div>{user?.email || ''}</div>
          </div>
          <button
            className="logout-btn"
            onClick={() => {
              document.getElementById('logout-form-header')?.submit();
            }}
            title={isRtl ? 'تسجيل الخروج' : 'Logout'}
          >
            <span 
              className="material-icons-outlined"
              style={isRtl ? { transform: 'rotate(180deg)' } : {}}
            >
              logout
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
