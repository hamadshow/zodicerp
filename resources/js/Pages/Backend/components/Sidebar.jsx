import React, { useState, useEffect, useRef } from 'react';
import { Link, usePage } from '@inertiajs/react';

const Sidebar = ({
  sidebarOpen,
  isCollapsed,
  toggleCollapse,
  menuItems,
  activeMenu,
  openSubmenus,
  handleMenuClick,
  toggleSubmenu,
  toggleSidebar,
  isUrlActive,
}) => {
  const [floatingMenu, setFloatingMenu] = useState(null);
  const sidebarRef = useRef(null);
  const { localization } = usePage().props;
  const isRtl = localization?.is_rtl;

  // Close floating menu when sidebar collapse state changes
  useEffect(() => {
    setFloatingMenu(null);
  }, [isCollapsed]);

  // Handle clicking outside to close floating menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (floatingMenu && !event.target.closest('.floating-submenu') && !event.target.closest('.menu-item')) {
        setFloatingMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [floatingMenu]);

  const onMenuItemClick = (e, item) => {
    // If it's a link (has href), we let default behavior happen (unless in collapsed floating mode)
    // But if it's a submenu toggle, we prevent default.
    
    if (item.hasSubmenu) {
      e.preventDefault();
      
      if (isCollapsed) {
        if (floatingMenu?.label === item.label) {
          setFloatingMenu(null); // Toggle close
        } else {
          const rect = e.currentTarget.getBoundingClientRect();
          setFloatingMenu({
            label: item.label,
            items: item.submenuItems,
            top: rect.top,
            left: isRtl ? undefined : rect.right,
            right: isRtl ? (window.innerWidth - rect.left) : undefined
          });
        }
      } else {
        toggleSubmenu(item.label.toLowerCase().replace(/\s+/g, '-'));
      }
    } else {
        // Leaf node
        // If it has href, the Link component handles navigation.
        // We only need to close mobile sidebar if open
        if (window.innerWidth <= 768 && sidebarOpen) {
            toggleSidebar();
        }
        
        if (item.isLogout) {
            e.preventDefault();
            handleMenuClick(item);
        }
    }
  };

  const handleKeyDown = (e, item) => {
    if (e.key === 'Enter' || e.key === ' ') {
      // For accessibility, trigger click
      if (item.hasSubmenu) {
          e.preventDefault();
          onMenuItemClick(e, item);
      }
      // If it's a Link, Enter key works natively
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="mobile-overlay"
          id="mobileOverlay"
          onClick={toggleSidebar}
          style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
              background: 'rgba(0,0,0,0.5)', zIndex: 999
          }}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`new-sidebar ${isCollapsed ? 'collapsed' : ''} ${sidebarOpen ? 'mobile-open' : ''}`}
        id="sidebar"
        ref={sidebarRef}
      >
        {/* Header Section (Logo & Toggle) */}
        <div className="sidebar-header">
           <button 
              className="toggle-btn" 
              onClick={toggleCollapse}
              title={isCollapsed ? "Expand" : "Collapse"}
              aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
           >
              <span className="material-icons-outlined">menu</span>
           </button>

           <div className="brand-logo">
             <div className="brand-icon">
                <span className="material-icons-outlined" style={{ fontSize: '20px' }}>bolt</span>
             </div>
             <span className="brand-text">ZodicERP</span>
           </div>
        </div>

        {/* Menu Items */}
        <div className="sidebar-menu">
          {menuItems.map((item, index) => {
            const menuKey = item.label.toLowerCase().replace(/\s+/g, '-');
            const isActive = isUrlActive 
                ? isUrlActive(item.href, !item.hasSubmenu)
                : activeMenu === item.label;
            const isOpen = openSubmenus[menuKey];
            
            // Render logic: Link for leaf nodes, div for submenu parents
            const Component = item.hasSubmenu ? 'div' : Link;
            const componentProps = item.hasSubmenu ? {} : { href: item.href || '#' };

            return (
              <React.Fragment key={index}>
                <Component
                  className={`menu-item ${isActive ? 'active' : ''} ${isOpen ? 'menu-open' : ''}`}
                  onClick={(e) => onMenuItemClick(e, item)}
                  onKeyDown={(e) => handleKeyDown(e, item)}
                  title={isCollapsed ? item.label : ''}
                  role={item.hasSubmenu ? "button" : "link"}
                  tabIndex={0}
                  aria-expanded={item.hasSubmenu ? (isCollapsed ? floatingMenu?.label === item.label : isOpen) : undefined}
                  aria-haspopup={item.hasSubmenu}
                  {...componentProps}
                >
                  <div className="menu-icon">
                    <span className="material-icons-outlined">{item.icon}</span>
                  </div>
                  <span className="menu-label">{item.label}</span>
                  
                  {item.hasSubmenu && (
                    <span className={`material-icons-outlined menu-chevron ${isOpen ? 'rotated' : ''}`}>
                      expand_more
                    </span>
                  )}
                </Component>

                {/* Inline Submenu (Only when expanded) */}
                {item.hasSubmenu && !isCollapsed && (
                  <div className={`submenu ${isOpen ? 'show' : ''}`}>
                    {item.submenuItems.map((subItem, subIndex) => (
                      <Link
                        key={subIndex}
                        href={subItem.href || '#'}
                        className={`submenu-item ${isUrlActive ? (isUrlActive(subItem.href, true) ? 'active' : '') : (subItem.label === activeMenu ? 'active' : '')}`}
                        onClick={(e) => {
                            if (!subItem.href) {
                                e.preventDefault();
                            }
                            // Close mobile sidebar on navigation
                            if (window.innerWidth <= 768 && sidebarOpen && subItem.href) {
                                toggleSidebar();
                            }
                        }}
                      >
                         <span className="material-icons-outlined submenu-icon">
                            {subItem.icon}
                         </span>
                         <span>{subItem.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </aside>

      {/* Floating Submenu (Only when collapsed) */}
      {isCollapsed && floatingMenu && (
        <div 
          className="floating-submenu"
          style={{
            top: floatingMenu.top,
            left: floatingMenu.left,
            right: floatingMenu.right,
            position: 'fixed'
          }}
        >
          <div className="floating-header">{floatingMenu.label}</div>
          {floatingMenu.items.map((subItem, subIndex) => (
             <Link
                key={subIndex}
                href={subItem.href || '#'}
                className={`floating-item ${isUrlActive ? (isUrlActive(subItem.href, true) ? 'active' : '') : (subItem.label === activeMenu ? 'active' : '')}`}
                onClick={(e) => {
                    setFloatingMenu(null);
                    if (!subItem.href) {
                        e.preventDefault();
                        handleMenuClick(subItem);
                    }
                }}
              >
                 <span className="material-icons-outlined floating-icon">
                    {subItem.icon}
                 </span>
                 <span>{subItem.label}</span>
              </Link>
          ))}
        </div>
      )}
    </>
  );
};

export default Sidebar;
