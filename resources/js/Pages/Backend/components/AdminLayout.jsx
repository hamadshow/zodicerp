// Unified Admin Layout Component
// This component provides a consistent layout structure for all admin pages
// It includes the Header, Sidebar, and Footer components

import React, { useEffect, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
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
        { icon: 'currency_exchange', label: 'Exchange Rates', href: getLocalizedRoute('admin.exchange-rates.index') },
        { icon: 'assessment', label: 'Companies', href: getLocalizedRoute('admin.companies.index') },
        { icon: 'store', label: 'Branches', href: getLocalizedRoute('admin.branches.index') },
      ],
    },
    {
      icon: 'people',
      label: 'Human Resources',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'dashboard', label: 'HR Dashboard', href: getLocalizedRoute('admin.hr.dashboard') },
        { icon: 'group', label: 'Departments', href: getLocalizedRoute('admin.departments.index') },
        { icon: 'work', label: 'Profession', href: getLocalizedRoute('admin.profession.index') },
        canViewNationalities && {
          icon: 'public',
          label: 'Nationalities',
          href: getLocalizedRoute('admin.nationalities.index'),
        },
        { icon: 'person', label: 'Employees', href: getLocalizedRoute('admin.employees.index') },
        {
          icon: 'admin_panel_settings',
          label: 'Permissions',
          href: '#',
        },
        { icon: 'access_time', label: 'Attendance', href: getLocalizedRoute('admin.attendance.index') },
        { icon: 'stars', label: 'Reward', href: getLocalizedRoute('admin.reward.index') },
        { icon: 'schedule', label: 'OverTime', href: getLocalizedRoute('admin.overtime.index') },
        {
          icon: 'work_off',
          label: 'End-of-service',
          href: getLocalizedRoute('admin.end-of-service.index'),
        },
        {
          icon: 'payments',
          label: 'Payroll Advance',
          href: getLocalizedRoute('admin.payroll-advance.index'),
        },
        { icon: 'remove_circle', label: 'Deductions', href: getLocalizedRoute('admin.deductions.index') },
        {
          icon: 'traffic',
          label: 'Traffic Violations',
          href: getLocalizedRoute('admin.traffic-violations.index'),
        },
        { icon: 'card_travel', label: 'Vacations', href: getLocalizedRoute('admin.vacations.index') },
        {
          icon: 'receipt_long',
          label: 'Salary Receipt',
          href: getLocalizedRoute('admin.salary-receipt.index'),
        },
      ].filter(Boolean),
    },
    {
      icon: 'inventory_2',
      label: 'Inventory',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'warehouse', label: 'Warehouses', href: getLocalizedRoute('admin.warehouses.index') },
        { icon: 'straighten', label: 'Item Units', href: getLocalizedRoute('admin.item-units.index') },
        { icon: 'tune', label: 'Item Attributes', href: getLocalizedRoute('admin.item-attributes.index') },
        { icon: 'collections_bookmark', label: 'Product Collections', href: getLocalizedRoute('admin.product-collections.index') },
        { icon: 'category', label: 'Categories', href: getLocalizedRoute('admin.categories.index') },
        { icon: 'branding_watermark', label: 'Brands', href: getLocalizedRoute('admin.brands.index') },
        { icon: 'inventory', label: 'Products', href: getLocalizedRoute('admin.products.index') },
        { icon: 'playlist_add', label: 'Opening Stock', href: getLocalizedRoute('admin.opening-stock.index') },
        // Items without routes commented out until implemented
        { icon: 'transfer_within_a_station', label: 'Stock Transfers', href: getLocalizedRoute('admin.inventory.stock-transfers.index') },
        { icon: 'assignment', label: 'Stock Adjustments', href: getLocalizedRoute('admin.inventory.stock-adjustments.index') },
        { icon: 'report', label: 'Inventory Reports', href: getLocalizedRoute('admin.inventory.reports.index') },
      ],
    },
    {
      icon: 'shopping_cart',
      label: 'Supplier & Purchase',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'dashboard', label: 'Purchase Dashboard', href: getLocalizedRoute('admin.purchases.dashboard') },
        { icon: 'groups', label: 'Supplier Groups', href: getLocalizedRoute('admin.purchases.supplier-groups.index') },
        { icon: 'people', label: 'Suppliers', href: getLocalizedRoute('admin.purchases.suppliers.index') },
        { icon: 'request_quote', label: 'Quotations', href: getLocalizedRoute('admin.purchases.quotations.index') },
        { icon: 'shopping_bag', label: 'Purchase Orders', href: getLocalizedRoute('admin.purchases.orders.index') },
        { icon: 'inventory', label: 'Goods Receipts', href: getLocalizedRoute('admin.purchases.goods-receipts.index') },
        { icon: 'receipt', label: 'Purchase Invoices', href: getLocalizedRoute('admin.purchases.invoices.index') },
        { icon: 'keyboard_return', label: 'Purchase Returns', href: getLocalizedRoute('admin.purchases.returns.index') },
      ],
    },

    {
      icon: 'percent',
      label: 'Discounts & Taxes',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'local_offer', label: 'Purchase Discounts', href: getLocalizedRoute('admin.purchases.discounts.index') },
        { icon: 'rule', label: 'Discount Rules', href: getLocalizedRoute('admin.purchases.discounts.rules') },
        { icon: 'gavel', label: 'Tax Management', href: getLocalizedRoute('admin.purchases.taxes.index') },
        { icon: 'calculate', label: 'Tax Calculations', href: getLocalizedRoute('admin.purchases.taxes.calculations') },
      ],
    },
    {
      icon: 'monetization_on',
      label: 'Costing & Expenses',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'price_check', label: 'Purchase Costing', href: getLocalizedRoute('admin.purchases.costing.index') },
        { icon: 'receipt_long', label: 'Expense Management', href: getLocalizedRoute('admin.purchases.expenses.index') },
        { icon: 'flight_land', label: 'Landed Costs', href: getLocalizedRoute('admin.purchases.landed-costs.index') },
        { icon: 'pie_chart', label: 'Cost Allocation', href: getLocalizedRoute('admin.purchases.cost-allocation.index') },
      ],
    },
    {
      icon: 'shopping_cart',
      label: 'E-Commerce',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'campaign', label: 'Ads', href: getLocalizedRoute('admin.ecommerce.ads.index') },
        { icon: 'bolt', label: 'Flash Sales', href: getLocalizedRoute('admin.client-sales.flash-sales.index') },
      ],
    },
    {
      icon: 'point_of_sale',
      label: 'Client & Sales',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'groups', label: 'Customers Group', href: getLocalizedRoute('admin.client-sales.customer-groups.index') },
        { icon: 'person_add', label: 'Customers', href: getLocalizedRoute('admin.client-sales.customers.index') },
        { icon: 'request_quote', label: 'Sales Quotations', href: getLocalizedRoute('admin.client-sales.quotations.index') },
        { icon: 'receipt_long', label: 'Sales Orders', href: getLocalizedRoute('admin.client-sales.orders.index') },
        { icon: 'receipt', label: 'Sales Invoices', href: getLocalizedRoute('admin.client-sales.invoices.index') },
      ],
    },
    {
      icon: 'business',
      label: 'Fixed Assets',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'category', label: 'Asset Categories', href: getLocalizedRoute('admin.assets.categories.index') },
        { icon: 'tune', label: 'Asset Attributes', href: getLocalizedRoute('admin.assets.attributes.index') },
        { icon: 'web_asset', label: 'Assets Register', href: getLocalizedRoute('admin.assets.register.index') },
        { icon: 'swap_horiz', label: 'Asset Movements', href: getLocalizedRoute('admin.assets.movements.index') },
        { icon: 'trending_up', label: 'Asset Revaluation', href: getLocalizedRoute('admin.assets.revaluation.index') },
        { icon: 'delete_forever', label: 'Asset Disposal', href: getLocalizedRoute('admin.assets.disposal.index') },
        { icon: 'calculate', label: 'Run Depr', href: getLocalizedRoute('admin.assets.depreciation.run') },
        { icon: 'calendar_today', label: 'Depr Schedule', href: getLocalizedRoute('admin.assets.depreciation.schedule') },
        { icon: 'assessment', label: 'Depr Report', href: getLocalizedRoute('admin.assets.depreciation.report') },
      ],
    },
    {
      icon: 'account_balance',
      label: 'Bank and Cash',
      hasSubmenu: true,
      submenuItems: [
          { icon: 'account_balance_wallet', label: 'Cash', href: getLocalizedRoute('admin.petty-cash.index') },
          { icon: 'account_balance', label: 'Banks', href: getLocalizedRoute('admin.banks.index') },
          { icon: 'payments', label: 'Cheque', href: getLocalizedRoute('admin.cheques.index') },
          { icon: 'swap_horiz', label: 'Bank Transactions', href: getLocalizedRoute('admin.bank-transactions.index') }
      ],
    },
    {
            icon: 'percent',
            label: 'TAX & VAT',
            hasSubmenu: true,
            submenuItems: [
                { icon: 'settings', label: 'Tax Types', href: getLocalizedRoute('admin.taxes.types.index') },
                { icon: 'settings', label: 'Tax Settings', href: getLocalizedRoute('admin.taxes.settings.index') },
                { icon: 'description', label: 'Tax Reports', href: getLocalizedRoute('admin.taxes.reports.index') },
            ],
        },
    {
      icon: 'account_balance_wallet',
      label: 'Accounting',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'account_tree', label: 'Chart of Accounts', href: getLocalizedRoute('admin.chart-of-accounts') },
        { icon: 'edit_note', label: 'Journal Entries', href: getLocalizedRoute('admin.journal-entries') },
        { icon: 'bar_chart', label: 'Financial Reports', href: getLocalizedRoute('admin.financial-reports.index') },
      ],
    },
    {
      icon: 'account_tree',
      label: 'Plugin',
      href: getLocalizedRoute('admin.pages.plugins.index'),
    },

    {
      icon: 'insights',
      label: 'Investing Stack',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'business', label: 'Industries', href: getLocalizedRoute('admin.investing.industries.index') },
        { icon: 'apartment', label: 'Listed Companies', href: getLocalizedRoute('admin.investing.companies.index') },
        { icon: 'handshake', label: 'Brokers', href: getLocalizedRoute('admin.investing.brokers.index') },
        { icon: 'trending_up', label: 'Market Prices', href: getLocalizedRoute('admin.investing.prices.index') },
      ],
    },
    { icon: 'folder', label: 'Media', href: getLocalizedRoute('admin.media.index') },
    { icon: 'assignment', label: 'Tasks', href: getLocalizedRoute('admin.tasks.index') },
    // { icon: 'store', label: 'Marketplace' },
    { icon: 'settings', label: 'Settings', href: getLocalizedRoute('admin.settings') },
    { icon: 'admin_panel_settings', label: 'Platform Admin', href: getLocalizedRoute('admin.platform-admin.index') },
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
