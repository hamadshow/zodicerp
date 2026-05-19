import React, { useState } from 'react';
import { Link } from '@inertiajs/react';

export function MobileBackendNav({ 
  menuItems,
  translations = {},
  currentUrl
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [openAccordions, setOpenAccordions] = useState({});

  const toggleSidebar = () => setIsOpen(!isOpen);
  const toggleAccordion = (key) => {
    setOpenAccordions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const isUrlActive = (path) => {
    if (!path || path === '#') return false;
    try {
        const urlObj = new URL(path, window.location.origin);
        const currentPath = urlObj.pathname.replace(/\/$/, '');
        const normalizedUrl = currentUrl.split('?')[0].replace(/\/$/, '');
        return normalizedUrl === currentPath || normalizedUrl.startsWith(currentPath + '/');
    } catch {
        return false;
    }
  };

  return (
    <div className="backend-mobile-nav-wrapper mobile-only flex">
      {/* Backdrop */}
      <div 
        className={`mobile-sidebar-overlay ${isOpen ? 'open' : ''}`} 
        onClick={toggleSidebar}
      />

      {/* Sidebar Drawer */}
      <aside className={`mobile-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="mobile-sidebar-header">
          <h3>{translations['sidebar.menu'] || 'القائمة'}</h3>
        </div>

        <nav className="mobile-sidebar-nav">
          <ul>
            {menuItems.map((item, index) => {
              const menuKey = item.label.toLowerCase().replace(/\s+/g, '-');
              const hasSubmenu = item.hasSubmenu && item.submenuItems?.length > 0;
              const isActive = isUrlActive(item.href);
              const isExpanded = openAccordions[menuKey];

              if (hasSubmenu) {
                return (
                  <li key={index} className={`has-accordion ${isExpanded ? 'expanded' : ''}`}>
                    <div className="accordion-header" onClick={() => toggleAccordion(menuKey)}>
                      <span className="accordion-icon">{isExpanded ? '-' : '+'}</span>
                      <span className="accordion-title">{item.label}</span>
                    </div>
                    <ul className="accordion-body">
                      {item.submenuItems.map((sub, subIdx) => (
                        <li key={subIdx}>
                          <Link 
                            href={sub.href || '#'} 
                            onClick={toggleSidebar}
                            className={isUrlActive(sub.href) ? 'active' : ''}
                          >
                            {sub.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              }

              return (
                <li key={index}>
                  <Link 
                    href={item.href || '#'} 
                    onClick={toggleSidebar}
                    className={`${isActive ? 'active' : ''} ${item.isLogout ? 'logout-link' : ''}`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        <button type="button" className="bottom-nav-item">
          <span className="material-icons-outlined">shopping_bag</span>
          <span>{translations['mobile.cart'] || 'السلة'}</span>
        </button>
        <button type="button" className="bottom-nav-item">
          <span className="material-icons-outlined">search</span>
          <span>{translations['mobile.search'] || 'بحث'}</span>
        </button>
        <button type="button" className="bottom-nav-item">
          <span className="material-icons-outlined">grid_view</span>
          <span>{translations['mobile.categories'] || 'الفئات'}</span>
        </button>
        <button 
          type="button" 
          className={`bottom-nav-item ${isOpen ? 'active' : ''}`}
          onClick={toggleSidebar}
        >
          <span className="material-icons-outlined">menu</span>
          <span>{translations['sidebar.menu'] || 'القائمة'}</span>
        </button>
      </nav>
    </div>
  );
}
