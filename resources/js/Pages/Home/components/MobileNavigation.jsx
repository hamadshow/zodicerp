import React from 'react';
import { Link } from '@inertiajs/react';

export function MobileNavigation({ 
  t = (k, f) => f || k,
  countryCode,
  currentLocale,
  isOpen,
  onToggle,
  navLinks = []
}) {
  const toggleSidebar = onToggle || (() => {});

  const getLocalizedRoute = (hash) => {
    return `/${countryCode}/${currentLocale}${hash}`;
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`mobile-sidebar-overlay ${isOpen ? 'open' : ''}`} 
        onClick={toggleSidebar}
      />

      {/* Sidebar */}
      <aside className={`mobile-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="mobile-sidebar-header">
          <h3>{t('mobile_menu_title', 'القائمة')}</h3>
        </div>

        <nav className="mobile-sidebar-nav">
          <ul>
            {navLinks.map((link) => (
              <li key={link.name}>
                {link.type === 'hash' ? (
                  <Link href={getLocalizedRoute(link.href)} onClick={toggleSidebar}>
                    {link.name}
                  </Link>
                ) : (
                  <Link href={link.href} onClick={toggleSidebar}>
                    {link.name}
                  </Link>
                )}
              </li>
            ))}

            <li className="nav-divider" />

            <li>
              <Link href="#" onClick={toggleSidebar} className="nav-with-icon">
                <i className="fa-regular fa-square-check" />
                <span>{t('mobile_track_order', 'تتبع طلبك')}</span>
              </Link>
            </li>
            <li>
              <Link href="#" onClick={toggleSidebar} className="nav-with-icon">
                <i className="fa-solid fa-chart-simple" />
                <span>{t('mobile_compare', 'مقارنة')}</span>
              </Link>
            </li>
            <li>
              <Link href="#" onClick={toggleSidebar} className="nav-with-icon">
                <i className="fa-regular fa-heart" />
                <span>{t('mobile_wishlist', 'قائمة الرغبات')}</span>
              </Link>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <button type="button" className="bottom-nav-item">
          <i className="fa-solid fa-bag-shopping" />
          <span>{t('mobile_cart', 'السلة')}</span>
        </button>
        <button type="button" className="bottom-nav-item">
          <i className="fa-solid fa-magnifying-glass" />
          <span>{t('mobile_search', 'بحث')}</span>
        </button>
        <button type="button" className="bottom-nav-item">
          <i className="fa-solid fa-list-ul" />
          <span>{t('mobile_categories', 'الفئات')}</span>
        </button>
        <button 
          type="button" 
          className={`bottom-nav-item ${isOpen ? 'active' : ''}`}
          onClick={toggleSidebar}
        >
          <i className="fa-solid fa-bars" />
          <span>{t('mobile_menu', 'القائمة')}</span>
        </button>
      </nav>
    </>
  );
}
