// Unified Admin Layout Component
// This component provides a consistent layout structure for all admin pages
// It includes the Header, Sidebar, and Footer components

import React, { useEffect, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import '../../../../css/backend/common/app.css';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';

const AdminLayout = ({
  children,
  activeMenu: initialActiveMenu = 'Dashboard',
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = window.localStorage.getItem('admin.sidebarCollapsed');
    return saved === '1';
  });
  const [activeMenu, setActiveMenu] = useState(initialActiveMenu);
  const [openSubmenus, setOpenSubmenus] = useState({});
  const { props, url } = usePage();
  const user = props?.auth?.user;
  const canViewNationalities = user?.role === 'admin';

  // Helper to determine if a menu item is active based on current URL
  const isUrlActive = (path) => {
    if (!path) return false;
    try {
        const currentPath = new URL(path, window.location.origin).pathname;
        return url === currentPath || url.startsWith(currentPath + '/');
    } catch {
        return false;
    }
  };

  const menuItems = [
    { icon: 'home', label: 'Dashboard', href: route('admin') },
    {
      icon: 'shopping_cart',
      label: 'Essential Data',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'location_on', label: 'Location', href: route('admin.location') },
        { icon: 'assessment', label: 'Company Info', href: route('admin.company_info.index') },
        { icon: 'receipt', label: 'Branch Info', href: route('admin.branch_info.index') },
      ],
    },
    {
      icon: 'people',
      label: 'Human Resources',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'dashboard', label: 'HR Dashboard', href: route('admin') }, // Using main admin for now
        { icon: 'group', label: 'Departments', href: route('admin.departments') },
        { icon: 'work', label: 'Profession', href: route('admin.profession') },
        canViewNationalities && {
          icon: 'public',
          label: 'Nationalities',
          href: route('admin.nationalities'),
        },
        { icon: 'person', label: 'Employees', href: route('admin.employees') },
        {
          icon: 'admin_panel_settings',
          label: 'Permissions',
          href: route('admin.permissions'),
        },
        { icon: 'access_time', label: 'Attendance', href: route('admin.attendance') },
        { icon: 'stars', label: 'Reward', href: route('admin.reward') },
        { icon: 'schedule', label: 'OverTime', href: route('admin.overtime') },
        {
          icon: 'work_off',
          label: 'End-of-service',
          href: route('admin.end-of-service'),
        },
        {
          icon: 'payments',
          label: 'Payroll Advance',
          href: route('admin.payroll-advance'),
        },
        { icon: 'remove_circle', label: 'Deductions', href: route('admin.deductions') },
        {
          icon: 'traffic',
          label: 'Traffic Violations',
          href: route('admin.traffic-violations'),
        },
        { icon: 'card_travel', label: 'Vacations', href: route('admin.vacations') },
        {
          icon: 'receipt_long',
          label: 'Salary Receipt',
          href: route('admin.salary-receipt'),
        },
        { icon: 'assignment', label: 'Tasks', href: route('admin.tasks') },
      ].filter(Boolean),
    },
    {
      icon: 'inventory_2',
      label: 'Inventory',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'warehouse', label: 'Warehouses', href: route('admin.warehouses') },
        { icon: 'category', label: 'Categories', href: route('admin.categories') },
        { icon: 'branding_watermark', label: 'Brands', href: route('admin.brands.index') },
        { icon: 'inventory', label: 'Products', href: route('admin.products.index') },
        // Items without routes commented out until implemented
        { icon: 'transfer_within_a_station', label: 'Stock Transfers' },
        { icon: 'assignment', label: 'Stock Adjustments' },
        { icon: 'report', label: 'Inventory Reports' },
      ],
    },
    {
      icon: 'shopping_bag',
      label: 'Purchases',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'person_add', label: 'Suppliers', href: route('admin.suppliers.index') },
        { icon: 'note_add', label: 'Purchases Request' },
        { icon: 'receipt_long', label: 'Purchases Orders' },
        { icon: 'receipt_long', label: 'Bill' },
        { icon: 'payment', label: 'Bill return' },
      ],
    },
    {
      icon: 'point_of_sale',
      label: 'Sales',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'person_add', label: 'Clients', href: route('customers.dashboard') },
        { icon: 'note_add', label: 'New Sale' },
        { icon: 'receipt_long', label: 'Sales Orders' },
        { icon: 'bolt', label: 'Flash Sales' },
      ],
    },
    {
      icon: 'account_balance',
      label: 'Bank and Cash',
      hasSubmenu: true,
      submenuItems: [
          { icon: 'account_balance_wallet', label: 'Accounts' }
      ],
    },
    {
      icon: 'account_balance_wallet',
      label: 'Accounting',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'account_tree', label: 'Chart of Accounts', href: route('admin.chart-of-accounts') },
        { icon: 'edit_note', label: 'Journal Entries', href: route('admin.journals.index') },
        { icon: 'bar_chart', label: 'Financial Reports', href: route('admin.reports.index') },
      ],
    },
    {
      icon: 'account_tree',
      label: 'Budgeting',
      hasSubmenu: true,
      submenuItems: [
        // { icon: 'show_chart', label: 'Budgets' },
        // { icon: 'insights', label: 'Budget Reports' },
      ],
    },
    {
      icon: 'shopping_cart',
      label: 'E-Commerce',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'campaign', label: 'Ads', href: '#' },
        { icon: 'bar_chart', label: 'Financial Reports', href: '#' },
      ],
    },
    // { icon: 'reviews', label: 'Reviews' },
    { icon: 'folder', label: 'Media', href: route('admin.media.index') },
    // { icon: 'store', label: 'Marketplace' },
    {
      icon: 'description',
      label: 'Pages',
      hasSubmenu: true,
      submenuItems: [
        // { icon: 'article', label: 'Blog' },
        // { icon: 'payments', label: 'Payments' },
        // { icon: 'campaign', label: 'Ads' },
        // { icon: 'contact_page', label: 'Contact' },
        // { icon: 'slideshow', label: 'Simple Sliders' },
        // { icon: 'help_center', label: 'FAQs' },
        // { icon: 'mail', label: 'Newsletters' },
        // { icon: 'image', label: 'Media' }, // Duplicate
        // { icon: 'palette', label: 'Appearance' },
        // { icon: 'extension', label: 'Plugins' },
        // { icon: 'build', label: 'Tools' },
        // { icon: 'chat', label: 'WhatsApp Floating Button' },
        // { icon: 'settings', label: 'Settings' },
        // { icon: 'admin_panel_settings', label: 'Platform Administration' },
      ],
    },
    { icon: 'logout', label: 'Logout', isLogout: true },
  ].filter(item => {
      // Filter out items with empty submenus if they are meant to be submenu parents
      if (item.hasSubmenu && (!item.submenuItems || item.submenuItems.length === 0)) {
          return false;
      }
      return true;
  });

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('admin.sidebarCollapsed', isSidebarCollapsed ? '1' : '0');
    
    // Trigger resize event for components like Maps or Charts
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300); // Wait for transition
  }, [isSidebarCollapsed]);

  const toggleSubmenu = (menuName) => {
    setOpenSubmenus((prev) => {
        // If the clicked menu is already open, close it
        if (prev[menuName]) {
            return {};
        }
        // Otherwise, close all others and open this one
        return { [menuName]: true };
    });
  };

  const handleMenuClick = (itemOrLabel) => {
    const label = itemOrLabel?.label || itemOrLabel;
    setActiveMenu(label);

    // Handle Logout
    if (label === 'Logout' || itemOrLabel?.isLogout) {
      document.getElementById('logout-form')?.submit();
      return;
    }

    // Handle Navigation via href
    if (itemOrLabel?.href) {
      router.visit(itemOrLabel.href);
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar
        sidebarOpen={sidebarOpen}
        isCollapsed={isSidebarCollapsed}
        toggleCollapse={toggleSidebarCollapse}
        menuItems={menuItems}
        activeMenu={activeMenu}
        openSubmenus={openSubmenus}
        handleMenuClick={handleMenuClick}
        toggleSubmenu={toggleSubmenu}
        toggleSidebar={toggleSidebar}
        isUrlActive={isUrlActive}
      />

      <div className={`main-wrapper ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="main-content">
          <Header toggleSidebar={toggleSidebar} />

          <main className="content">{children}</main>
        </div>

        <Footer />
      </div>

      <form
        id="logout-form"
        action={route('logout')}
        method="POST"
        style={{ display: 'none' }}
      >
        <input
          type="hidden"
          name="_token"
          value={
            document
              .querySelector('meta[name="csrf-token"]')
              ?.getAttribute('content') || ''
          }
        />
      </form>
      <form
        id="logout-form-header"
        action={route('logout')}
        method="POST"
        style={{ display: 'none' }}
      >
        <input
          type="hidden"
          name="_token"
          value={
            document
              .querySelector('meta[name="csrf-token"]')
              ?.getAttribute('content') || ''
          }
        />
      </form>
    </div>
  );
};

export default AdminLayout;
