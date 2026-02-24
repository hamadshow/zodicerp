// Unified Admin Layout Component
// This component provides a consistent layout structure for all admin pages
// It includes the Header, Sidebar, and Footer components

import React, { useEffect, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import '../../../../css/backend/common/app.scss';
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
  const localization = props?.localization;
  const isRtl = localization?.is_rtl;

  useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = localization?.current_locale || 'ar';
  }, [isRtl, localization?.current_locale]);

  const canViewNationalities = user?.role === 'admin';

  const getLocalizedRoute = (name, params = {}) => {
    return route(name, {
      country: localization?.country_code || 'sa',
      lang: localization?.current_locale || 'ar',
      ...params
    });
  };

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
    { icon: 'home', label: 'Dashboard', href: getLocalizedRoute('admin.dashboard') },
    {
      icon: 'shopping_cart',
      label: 'Essential Data',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'location_on', label: 'Location', href: getLocalizedRoute('admin.location.index') },
        { icon: 'monetization_on', label: 'Currencies', href: getLocalizedRoute('admin.currencies.index') },
        { icon: 'currency_exchange', label: 'Exchange Rates', href: '#' },
        { icon: 'assessment', label: 'Companies', href: '#' },
        { icon: 'store', label: 'Branches', href: '#' },
      ],
    },
    {
      icon: 'people',
      label: 'Human Resources',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'dashboard', label: 'HR Dashboard', href: '#' }, // Changed to placeholder
        { icon: 'group', label: 'Departments', href: '#' },
        { icon: 'work', label: 'Profession', href: '#' },
        canViewNationalities && {
          icon: 'public',
          label: 'Nationalities',
          href: '#',
        },
        { icon: 'person', label: 'Employees', href: '#' },
        {
          icon: 'admin_panel_settings',
          label: 'Permissions',
          href: '#',
        },
        { icon: 'access_time', label: 'Attendance', href: '#' },
        { icon: 'stars', label: 'Reward', href: '#' },
        { icon: 'schedule', label: 'OverTime', href: '#' },
        {
          icon: 'work_off',
          label: 'End-of-service',
          href: '#',
        },
        {
          icon: 'payments',
          label: 'Payroll Advance',
          href: '#',
        },
        { icon: 'remove_circle', label: 'Deductions', href: '#' },
        {
          icon: 'traffic',
          label: 'Traffic Violations',
          href: '#',
        },
        { icon: 'card_travel', label: 'Vacations', href: '#' },
        {
          icon: 'receipt_long',
          label: 'Salary Receipt',
          href: '#',
        },
      ].filter(Boolean),
    },
    {
      icon: 'inventory_2',
      label: 'Inventory',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'warehouse', label: 'Warehouses', href: getLocalizedRoute('admin.warehouses.index') },
        { icon: 'straighten', label: 'Item Units', href: '#' },
        { icon: 'tune', label: 'Item Attributes', href: '#' },
        { icon: 'collections_bookmark', label: 'Item Collections', href: '#' },
        { icon: 'category', label: 'Categories', href: getLocalizedRoute('admin.categories.index') },
        { icon: 'branding_watermark', label: 'Brands', href: getLocalizedRoute('admin.brands.index') },
        { icon: 'inventory', label: 'Products', href: getLocalizedRoute('admin.products.index') },
        // Items without routes commented out until implemented
        { icon: 'transfer_within_a_station', label: 'Stock Transfers' },
        { icon: 'assignment', label: 'Stock Adjustments' },
        { icon: 'report', label: 'Inventory Reports' },
      ],
    },
    {
      icon: 'shopping_cart',
      label: 'Supplier & Purchase',
      hasSubmenu: true,
      submenuItems: [
        // { icon: 'dashboard', label: 'Purchase Dashboard', href: getLocalizedRoute('admin.purchases.dashboard') },
        { icon: 'groups', label: 'Supplier Groups', href: '#' },
        { icon: 'people', label: 'Suppliers', href: '#' },
        { icon: 'request_quote', label: 'Quotations', href: '#' },
        { icon: 'shopping_bag', label: 'Purchase Orders', href: '#' },
        // { icon: 'inventory', label: 'Goods Receipts', href: getLocalizedRoute('admin.purchases.goods-receipts.index') },
        { icon: 'receipt', label: 'Purchase Invoices', href: '#' },
        // { icon: 'keyboard_return', label: 'Purchase Returns', href: getLocalizedRoute('admin.purchases.returns.index') },
      ],
    },

    {
      icon: 'percent',
      label: 'Discounts & Taxes',
      hasSubmenu: true,
      submenuItems: [
        // { icon: 'local_offer', label: 'Purchase Discounts', href: getLocalizedRoute('admin.purchases.discounts.index') },
        // { icon: 'rule', label: 'Discount Rules', href: getLocalizedRoute('admin.purchases.discounts.rules') },
        // { icon: 'gavel', label: 'Tax Management', href: getLocalizedRoute('admin.purchases.taxes.index') },
        // { icon: 'calculate', label: 'Tax Calculations', href: getLocalizedRoute('admin.purchases.taxes.calculations') },
      ],
    },
    {
      icon: 'monetization_on',
      label: 'Costing & Expenses',
      hasSubmenu: true,
      submenuItems: [
        // { icon: 'price_check', label: 'Purchase Costing', href: getLocalizedRoute('admin.purchases.costing.index') },
        // { icon: 'receipt_long', label: 'Expense Management', href: getLocalizedRoute('admin.purchases.expenses.index') },
        // { icon: 'flight_land', label: 'Landed Costs', href: getLocalizedRoute('admin.purchases.landed-costs.index') },
        // { icon: 'pie_chart', label: 'Cost Allocation', href: getLocalizedRoute('admin.purchases.cost-allocation.index') },
      ],
    },
    {
      icon: 'point_of_sale',
      label: 'Client & Sales',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'person_add', label: 'Clients', href: '#' },
        { icon: 'groups', label: 'Client Group', href: '#' },
        { icon: 'request_quote', label: 'Sales Quotations', href: '#' },
        { icon: 'receipt_long', label: 'Sales Orders', href: '#' },
        { icon: 'receipt', label: 'Sales Invoices', href: '#' },
        { icon: 'bolt', label: 'Flash Sales' },
      ],
    },
    {
      icon: 'business',
      label: 'Fixed Assets',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'category', label: 'Asset Categories', href: '#' },
        { icon: 'tune', label: 'Asset Attributes', href: '#' },
        { icon: 'web_asset', label: 'Assets Register', href: '#' },
        { icon: 'swap_horiz', label: 'Asset Movements', href: '#' },
        { icon: 'trending_up', label: 'Asset Revaluation', href: '#' },
        { icon: 'delete_forever', label: 'Asset Disposal', href: '#' },
        { icon: 'calculate', label: 'Run Depr', href: '#' },
        { icon: 'calendar_today', label: 'Depr Schedule', href: '#' },
        { icon: 'assessment', label: 'Depr Report', href: '#' },
      ],
    },
    {
      icon: 'account_balance',
      label: 'Bank and Cash',
      hasSubmenu: true,
      submenuItems: [
          { icon: 'account_balance_wallet', label: 'Cash', href: '#' },
          { icon: 'account_balance', label: 'Banks', href: '#' },
          { icon: 'payments', label: 'Cheque', href: '#' },
          { icon: 'swap_horiz', label: 'Bank Transactions', href: '#' }
      ],
    },
    {
            icon: 'percent',
            label: 'TAX & VAT',
            hasSubmenu: true,
            submenuItems: [
                { icon: 'settings', label: 'Tax Types', href: '#' },
                { icon: 'settings', label: 'Tax Settings', href: '#' },
                { icon: 'description', label: 'Tax Reports', href: '#' },
            ],
        },
    {
      icon: 'account_balance_wallet',
      label: 'Accounting',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'account_tree', label: 'Chart of Accounts', href: getLocalizedRoute('admin.chart-of-accounts') },
        { icon: 'edit_note', label: 'Journal Entries', href: '#' },
        { icon: 'bar_chart', label: 'Financial Reports', href: '#' },
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
    {
      icon: 'monetization_on',
      label: 'Budget',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'dashboard', label: 'Budget Dashboard', href: '#' },
        { icon: 'category', label: 'Budget Categories', href: '#' },
        { icon: 'list', label: 'Budget', href: '#' },
        { icon: 'trending_up', label: 'Budget Forecasts', href: '#' },
        { icon: 'monitor_heart', label: 'Budget Monitoring', href: '#' },
        { icon: 'swap_horiz', label: 'Budget Transfers', href: '#' },
        { icon: 'assignment_turned_in', label: 'Budget Commitments', href: '#' },
      ],
    },
    {
      icon: 'insights',
      label: 'Investing Stack',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'business', label: 'Industries', href: '#' },
        { icon: 'apartment', label: 'Listed Companies', href: '#' },
        { icon: 'handshake', label: 'Brokers', href: '#' },
        { icon: 'trending_up', label: 'Market Prices', href: '#' },
      ],
    },
    { icon: 'folder', label: 'Media', href: getLocalizedRoute('admin.media.index') },
    { icon: 'assignment', label: 'Tasks', href: '#' },
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
    { icon: 'settings', label: 'Settings', href: getLocalizedRoute('admin.settings') },
    { icon: 'admin_panel_settings', label: 'Platform Admin', href: '#' },
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
    // Auto-open submenu if active item is inside it
    menuItems.forEach((item) => {
      if (item.hasSubmenu && item.submenuItems) {
        const hasActiveChild = item.submenuItems.some(
          (sub) => sub.label === activeMenu || isUrlActive(sub.href)
        );
        if (hasActiveChild) {
          const menuKey = item.label.toLowerCase().replace(/\s+/g, '-');
          setOpenSubmenus((prev) => ({ ...prev, [menuKey]: true }));
        }
      }
    });
  }, [activeMenu, url]);

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

    // Handle Navigation via href
    if (itemOrLabel?.href) {
      router.visit(itemOrLabel.href);
    }
  };

  return (
    <div className={`dashboard-container ${isRtl ? 'is-rtl' : ''}`}>
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
        isRtl={isRtl}
      />

      <div className={`main-wrapper ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="main-content">
          <Header toggleSidebar={toggleSidebar} isRtl={isRtl} />

          <main className="content">{children}</main>
        </div>

        <Footer />
      </div>

      {/* Desktop/Mobile Hidden Forms */}
      <form
        id="logout-form"
        action={getLocalizedRoute('logout')}
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
        action={getLocalizedRoute('logout')}
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
