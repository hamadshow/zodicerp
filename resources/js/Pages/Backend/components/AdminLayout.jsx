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
        { icon: 'monetization_on', label: 'Currencies', href: route('admin.currencies.index') },
        { icon: 'currency_exchange', label: 'Exchange Rates', href: route('admin.exchange_rates.index') },
        { icon: 'assessment', label: 'Companies', href: route('admin.companies.index') },
        { icon: 'store', label: 'Branches', href: route('admin.branches.index') },
      ],
    },
    {
      icon: 'people',
      label: 'Human Resources',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'dashboard', label: 'HR Dashboard', href: '#' }, // Changed to placeholder
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
      ].filter(Boolean),
    },
    {
      icon: 'inventory_2',
      label: 'Inventory',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'warehouse', label: 'Warehouses', href: route('admin.warehouses') },
        { icon: 'straighten', label: 'Item Units', href: route('admin.item-units.index') },
        { icon: 'tune', label: 'Item Attributes', href: route('admin.item-attributes.index') },
        { icon: 'collections_bookmark', label: 'Item Collections', href: route('admin.item-collections.index') },
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
      icon: 'shopping_cart',
      label: 'Supplier & Purchase',
      hasSubmenu: true,
      submenuItems: [
        // { icon: 'dashboard', label: 'Purchase Dashboard', href: route('admin.purchases.dashboard') },
        { icon: 'groups', label: 'Supplier Groups', href: route('admin.purchases.supplier-groups.index') },
        { icon: 'people', label: 'Suppliers', href: route('admin.purchases.suppliers.index') },
        { icon: 'request_quote', label: 'Quotations', href: route('admin.purchases.quotations.index') },
        { icon: 'shopping_bag', label: 'Purchase Orders', href: route('admin.purchases.orders.index') },
        // { icon: 'inventory', label: 'Goods Receipts', href: route('admin.purchases.goods-receipts.index') },
        { icon: 'receipt', label: 'Purchase Invoices', href: route('admin.purchases.invoices.index') },
        // { icon: 'keyboard_return', label: 'Purchase Returns', href: route('admin.purchases.returns.index') },
      ],
    },

    {
      icon: 'percent',
      label: 'Discounts & Taxes',
      hasSubmenu: true,
      submenuItems: [
        // { icon: 'local_offer', label: 'Purchase Discounts', href: route('admin.purchases.discounts.index') },
        // { icon: 'rule', label: 'Discount Rules', href: route('admin.purchases.discounts.rules') },
        // { icon: 'gavel', label: 'Tax Management', href: route('admin.purchases.taxes.index') },
        // { icon: 'calculate', label: 'Tax Calculations', href: route('admin.purchases.taxes.calculations') },
      ],
    },
    {
      icon: 'monetization_on',
      label: 'Costing & Expenses',
      hasSubmenu: true,
      submenuItems: [
        // { icon: 'price_check', label: 'Purchase Costing', href: route('admin.purchases.costing.index') },
        // { icon: 'receipt_long', label: 'Expense Management', href: route('admin.purchases.expenses.index') },
        // { icon: 'flight_land', label: 'Landed Costs', href: route('admin.purchases.landed-costs.index') },
        // { icon: 'pie_chart', label: 'Cost Allocation', href: route('admin.purchases.cost-allocation.index') },
      ],
    },
    {
      icon: 'point_of_sale',
      label: 'Client & Sales',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'person_add', label: 'Clients', href: route('admin.client-sales.customers.index') },
        { icon: 'groups', label: 'Client Group', href: route('admin.client-sales.customer-groups.index') },
        { icon: 'request_quote', label: 'Sales Quotations', href: route('admin.client-sales.quotations.index') },
        { icon: 'receipt_long', label: 'Sales Orders', href: route('admin.client-sales.orders.index') },
        { icon: 'receipt', label: 'Sales Invoices', href: route('admin.client-sales.invoices.index') },
        { icon: 'bolt', label: 'Flash Sales' },
      ],
    },
    {
      icon: 'business',
      label: 'Fixed Assets',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'category', label: 'Asset Categories', href: route('admin.assets.asset-categories.index') },
        { icon: 'tune', label: 'Asset Attributes', href: route('admin.assets.asset-attributes.index') },
        { icon: 'web_asset', label: 'Assets Register', href: route('admin.assets.index') },
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
          { icon: 'account_balance_wallet', label: 'Cash', href: route('admin.petty-cash.index') },
          { icon: 'account_balance', label: 'Banks', href: route('admin.banks.index') },
          { icon: 'payments', label: 'Cheque', href: route('admin.cheques.index') },
          { icon: 'swap_horiz', label: 'Bank Transactions', href: route('admin.bank-transactions.index') }
      ],
    },
    {
            icon: 'percent',
            label: 'TAX & VAT',
            hasSubmenu: true,
            submenuItems: [
                { icon: 'settings', label: 'Tax Types', href: route('admin.taxes.tax-types.index') },
                { icon: 'settings', label: 'Tax Settings', href: '#' },
                { icon: 'description', label: 'Tax Reports', href: '#' },
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
        { icon: 'campaign', label: 'Ads', href: route('admin.ecommerce.ads') },
        { icon: 'bar_chart', label: 'Financial Reports', href: '#' },
      ],
    },
    // { icon: 'reviews', label: 'Reviews' },
    { icon: 'folder', label: 'Media', href: route('admin.media.index') },
    { icon: 'assignment', label: 'Tasks', href: route('admin.tasks') },
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
    { icon: 'settings', label: 'Settings', href: '#' },
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
