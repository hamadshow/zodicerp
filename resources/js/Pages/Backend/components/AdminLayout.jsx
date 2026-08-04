// Unified Admin Layout Component
// This component provides a consistent layout structure for all admin pages
// It includes the Header, Sidebar, and Footer components

import React, { useEffect, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { MobileBackendNav } from './MobileBackendNav';
import { useNotification } from '@/Components/Notifications/useNotification';

const AdminLayout = ({
  children,
  activeMenu: initialActiveMenu = '',
}) => {
  const page = usePage();
  const { showSuccess, showError } = useNotification();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = window.localStorage.getItem('admin.sidebarCollapsed');
    return saved === '1';
  });
  const [activeMenu, setActiveMenu] = useState(initialActiveMenu);
  const [openSubmenus, setOpenSubmenus] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  const { props, url } = page;

  // Handle screen resize to detect mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const user = props?.auth?.user;
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  
  const can = (permission) => {
    if (!permission) return true;
    if (permissions.includes('*')) return true;
    const normalizedPermission = permission.toLowerCase();
    return permissions.includes(normalizedPermission);
  };

  const localization = props?.localization;
  const translations = localization?.translations || {};
  const isRtl = localization?.is_rtl;
  const flashSuccess = props?.flash?.success;
  const flashError = props?.flash?.error;

  useEffect(() => {
    if (flashSuccess) {
      showSuccess(flashSuccess);
    }
    if (flashError) {
      showError(flashError);
    }
  }, [flashSuccess, flashError, showSuccess, showError]);

  useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = localization?.current_locale || 'ar';
  }, [isRtl, localization?.current_locale]);

  const canViewNationalities = can('settings.view');

  const getLocalizedRoute = (name, params = {}) => {
    return route(name, {
      country: localization?.country_code || 'sa',
      lang: localization?.current_locale || 'ar',
      ...params
    });
  };

  // Helper to determine if a menu item is active based on current URL
  const isUrlActive = (path, exact = false) => {
    if (!path || path === '#') return false;
    try {
        const urlObj = new URL(path, window.location.origin);
        const currentPath = urlObj.pathname.replace(/\/$/, '');
        const normalizedUrl = url.split('?')[0].replace(/\/$/, '');
        
        if (exact) {
            return normalizedUrl === currentPath;
        }
        return normalizedUrl === currentPath || normalizedUrl.startsWith(currentPath + '/');
    } catch {
        return false;
    }
  };

  const menuItems = [
    { 
        icon: 'home', 
        label: translations['sidebar.Workspace'] || 'Workspace', 
        href: getLocalizedRoute('admin.dashboard'),
        permission: 'dashboard.view'
    },
    { 
        icon: 'dashboard', 
        label: translations['sidebar.SystemDashboard'] || 'System Dashboard', 
        href: getLocalizedRoute('admin.system.dashboard'),
        permission: 'dashboard.view'
    },
    {
      icon: 'shopping_cart',
      label: translations['sidebar.essential_data'] || 'Essential Data',
      hasSubmenu: true,
      permission: 'settings.view',
      submenuItems: [
        { icon: 'location_on', label: translations['sidebar.location'] || 'Location', href: getLocalizedRoute('admin.location.index'), permission: 'location.view' },
        { icon: 'monetization_on', label: translations['sidebar.currencies'] || 'Currencies', href: getLocalizedRoute('admin.currencies.index'), permission: 'currencies.view' },
        { icon: 'currency_exchange', label: translations['sidebar.exchange_rates'] || 'Exchange Rates', href: getLocalizedRoute('admin.exchange-rates.index'), permission: 'currencies.view' },
        { icon: 'assessment', label: translations['sidebar.companies'] || 'Companies', href: getLocalizedRoute('admin.companies.index'), permission: 'settings.view' },
        { icon: 'store', label: translations['sidebar.branches'] || 'Branches', href: getLocalizedRoute('admin.branches.index'), permission: 'branches.view' },
      ],
    },
    {
      icon: 'people',
      label: translations['sidebar.human_resources'] || 'Human Resources',
      hasSubmenu: true,
      permission: 'employees.view',
      submenuItems: [
        { icon: 'dashboard', label: translations['sidebar.hr_dashboard'] || 'HR Dashboard', href: getLocalizedRoute('admin.hr.dashboard'), permission: 'employees.view' },
        { icon: 'group', label: translations['sidebar.departments'] || 'Departments', href: getLocalizedRoute('admin.departments.index'), permission: 'departments.view' },
        { icon: 'work', label: translations['sidebar.professions'] || 'Profession', href: getLocalizedRoute('admin.professions.index'), permission: 'employees.view' },
        canViewNationalities && {
          icon: 'public',
          label: translations['sidebar.nationalities'] || 'Nationalities',
          href: getLocalizedRoute('admin.nationalities.index'),
          permission: 'settings.view'
        },
        { icon: 'person', label: translations['sidebar.employees'] || 'Employees', href: getLocalizedRoute('admin.employees.index'), permission: 'employees.view' },
        { icon: 'access_time', label: translations['sidebar.attendance'] || 'Attendance', href: getLocalizedRoute('admin.attendance.index'), permission: 'attendance.view' },
        { icon: 'stars', label: translations['sidebar.reward'] || 'Reward', href: getLocalizedRoute('admin.rewards.index'), permission: 'employees.view' },
        {
          icon: 'work_off',
          label: translations['sidebar.end_of_service'] || 'End-of-service',
          href: getLocalizedRoute('admin.end-of-service.index'),
          permission: 'employees.view'
        },
        {
          icon: 'payments',
          label: translations['sidebar.payroll_advance'] || 'Payroll Advance',
          href: getLocalizedRoute('admin.payroll-advance.index'),
          permission: 'payroll.view'
        },
        { icon: 'remove_circle', label: translations['sidebar.deductions'] || 'Deductions', href: getLocalizedRoute('admin.deductions.index'), permission: 'employees.view' },
        {
          icon: 'traffic',
          label: translations['sidebar.traffic_violations'] || 'Traffic Violations',
          href: getLocalizedRoute('admin.traffic-violations.index'),
          permission: 'employees.view'
        },
        { icon: 'card_travel', label: translations['sidebar.vacations'] || 'Vacations', href: getLocalizedRoute('admin.vacations.index'), permission: 'attendance.view' },
        {
          icon: 'receipt_long',
          label: translations['sidebar.salary_receipt'] || 'Salary Receipt',
          href: getLocalizedRoute('admin.salary-receipt.index'),
          permission: 'payroll.view'
        },
      ].filter(Boolean),
    },
    {
      icon: 'work',
      label: translations['sidebar.recruitment'] || 'Recruitment',
      hasSubmenu: true,
      permission: 'employees.view',
      submenuItems: [
        {
          icon: 'work_outline',
          label: translations['sidebar.careers'] || 'Career',
          href: getLocalizedRoute('admin.careers.index'),
          permission: 'employees.view'
        },
        {
          icon: 'description',
          label: translations['sidebar.job_applications'] || 'Job Applications',
          href: getLocalizedRoute('admin.careers.applications'),
          permission: 'employees.view'
        },
      ],
    },
    {
      icon: 'account_balance',
      label: translations['sidebar.bank_cash'] || 'Bank and Cash',
      hasSubmenu: true,
      permission: 'banks.view',
      submenuItems: [
        { icon: 'dashboard', label: translations['sidebar.treasury_dashboard'] || 'Dashboard', href: getLocalizedRoute('admin.treasury.dashboard'), permission: 'banks.view' },
        { icon: 'account_balance', label: translations['sidebar.banks'] || 'Cash & Bank', href: getLocalizedRoute('admin.banks.index'), permission: 'banks.view' },
        { icon: 'payments', label: translations['sidebar.cheque'] || 'Cheque', href: getLocalizedRoute('admin.cheques.index'), permission: 'cheque.view' },
        { icon: 'swap_horiz', label: translations['sidebar.bank_transactions'] || 'Bank Transactions', href: getLocalizedRoute('admin.bank-transactions.index'), permission: 'banks.view' },
        { icon: 'receipt_long', label: translations['sidebar.payment_voucher'] || 'Payment Voucher', href: getLocalizedRoute('admin.payment-vouchers.index'), permission: 'banks.view' },
      ],
    },
    {
      icon: 'inventory_2',
      label: translations['sidebar.inventory'] || 'Inventory',
      hasSubmenu: true,
      permission: 'inventory.view',
      submenuItems: [
        { icon: 'warehouse', label: translations['sidebar.warehouses'] || 'Warehouses', href: getLocalizedRoute('admin.inventory.warehouses.index'), permission: 'warehouses.view' },
        { icon: 'straighten', label: translations['sidebar.item_units'] || 'Item Units', href: getLocalizedRoute('admin.inventory.item-units.index'), permission: 'item_units.view' },
        { icon: 'tune', label: translations['sidebar.item_attributes'] || 'Item Attributes', href: getLocalizedRoute('admin.inventory.item-attributes.index'), permission: 'item_attributes.view' },
        { icon: 'collections_bookmark', label: translations['sidebar.product_collections'] || 'Product Collections', href: getLocalizedRoute('admin.inventory.product-collections.index'), permission: 'product_collections.view' },
        { icon: 'category', label: translations['sidebar.categories'] || 'Categories', href: getLocalizedRoute('admin.inventory.categories.index'), permission: 'product_categories.view' },
        { icon: 'branding_watermark', label: translations['sidebar.brands'] || 'Brands', href: getLocalizedRoute('admin.inventory.brands.index'), permission: 'brands.view' },
        { icon: 'inventory', label: translations['sidebar.products'] || 'Products', href: getLocalizedRoute('admin.inventory.products.index'), permission: 'products.view' },
        { icon: 'playlist_add', label: translations['sidebar.opening_stock'] || 'Opening Stock', href: getLocalizedRoute('admin.inventory.opening-stock.index'), permission: 'inventory.view' },
        { icon: 'swap_horiz', label: translations['sidebar.transfer_stock'] || 'Transfer Stock', href: getLocalizedRoute('admin.inventory.stock-transfers.index'), permission: 'inventory.view' },
        { icon: 'assignment', label: translations['sidebar.stock_adjustments'] || 'Stock Adjustments', href: getLocalizedRoute('admin.inventory.stock-adjustments.index'), permission: 'inventory.view' },
        { icon: 'report', label: translations['sidebar.inventory_reports'] || 'Inventory Reports', href: getLocalizedRoute('admin.inventory.reports.index'), permission: 'inventory.view' },
      ],
    },
    {
      icon: 'shopping_cart',
      label: translations['sidebar.supplier_purchase'] || 'Supplier & Purchase',
      hasSubmenu: true,
      permission: 'suppliers.view',
      submenuItems: [
        { icon: 'dashboard', label: translations['sidebar.purchase_dashboard'] || 'Purchase Dashboard', href: getLocalizedRoute('admin.purchases.dashboard'), permission: 'suppliers.view' },
        { icon: 'groups', label: translations['sidebar.supplier_groups'] || 'Supplier Groups', href: getLocalizedRoute('admin.purchases.supplier-groups.index'), permission: 'supplier_groups.view' },
        { icon: 'people', label: translations['sidebar.suppliers'] || 'Suppliers', href: getLocalizedRoute('admin.purchases.suppliers.index'), permission: 'suppliers.view' },
        { icon: 'request_quote', label: translations['sidebar.quotations'] || 'Quotations', href: getLocalizedRoute('admin.purchases.quotations.index'), permission: 'purchase_orders.view' },
        { icon: 'shopping_bag', label: translations['sidebar.purchase_orders'] || 'Purchase Orders', href: getLocalizedRoute('admin.purchases.orders.index'), permission: 'purchase_orders.view' },
        { icon: 'inventory', label: translations['sidebar.goods_receipts'] || 'Goods Receipts', href: getLocalizedRoute('admin.purchases.goods-receipts.index'), permission: 'goods_receipts.view' },
        { icon: 'receipt', label: translations['sidebar.purchase_invoices'] || 'Purchase Invoices', href: getLocalizedRoute('admin.purchases.invoices.index'), permission: 'bills.view' },
        { icon: 'keyboard_return', label: translations['sidebar.purchase_returns'] || 'Purchase Returns', href: getLocalizedRoute('admin.purchases.returns.index'), permission: 'purchase_returns.view' },
      ],
    },
    {
      icon: 'point_of_sale',
      label: translations['sidebar.client_sales'] || 'Client & Sales',
      hasSubmenu: true,
      permission: 'customers.view',
      submenuItems: [
        { icon: 'groups', label: translations['sidebar.customer_groups'] || 'Customers Group', href: getLocalizedRoute('admin.client-sales.customer-groups.index'), permission: 'customer_group.view' },
        { icon: 'person_add', label: translations['sidebar.customers'] || 'Customers', href: getLocalizedRoute('admin.client-sales.customers.index'), permission: 'customers.view' },
        { icon: 'request_quote', label: translations['sidebar.quotations'] || 'Sales Quotations', href: getLocalizedRoute('admin.client-sales.quotations.index'), permission: 'quotations.view' },
        { icon: 'receipt_long', label: translations['sidebar.orders'] || 'Sales Orders', href: getLocalizedRoute('admin.client-sales.orders.index'), permission: 'orders.view' },
        { icon: 'receipt', label: translations['sidebar.invoices'] || 'Sales Invoices', href: getLocalizedRoute('admin.client-sales.invoices.index'), permission: 'invoices.view' },
        { icon: 'keyboard_return', label: translations['sidebar.sales_returns'] || 'Sales Returns', href: getLocalizedRoute('admin.client-sales.sales-returns.index'), permission: 'sales_returns.view' },
      ],
    },
    {
      icon: 'business',
      label: translations['sidebar.fixed_assets'] || 'Fixed Assets',
      hasSubmenu: true,
      permission: 'assets.view',
      submenuItems: [
        { icon: 'category', label: translations['sidebar.asset_categories'] || 'Asset Categories', href: getLocalizedRoute('admin.assets.categories.index'), permission: 'asset_categories.view' },
        { icon: 'tune', label: translations['sidebar.asset_attributes'] || 'Asset Attributes', href: getLocalizedRoute('admin.assets.asset-attributes.index'), permission: 'asset_attributes.view' },
        { icon: 'web_asset', label: translations['sidebar.assets_register'] || 'Assets Register', href: getLocalizedRoute('admin.assets.register.index'), permission: 'assets.view' },
        { icon: 'swap_horiz', label: translations['sidebar.asset_movements'] || 'Asset Movements', href: getLocalizedRoute('admin.assets.movements.index'), permission: 'assets.view' },
        { icon: 'trending_up', label: translations['sidebar.asset_revaluation'] || 'Asset Revaluation', href: getLocalizedRoute('admin.assets.revaluation.index'), permission: 'assets.view' },
        { icon: 'delete_forever', label: translations['sidebar.asset_disposal'] || 'Asset Disposal', href: getLocalizedRoute('admin.assets.disposal.index'), permission: 'assets.view' },
        { icon: 'calculate', label: translations['sidebar.run_depr'] || 'Run Depr', href: getLocalizedRoute('admin.assets.depreciation.run'), permission: 'assets.view' },
        { icon: 'calendar_today', label: translations['sidebar.depr_schedule'] || 'Depr Schedule', href: getLocalizedRoute('admin.assets.depreciation.schedule'), permission: 'assets.view' },
        { icon: 'assessment', label: translations['sidebar.depr_report'] || 'Depr Report', href: getLocalizedRoute('admin.assets.depreciation.report'), permission: 'assets.view' },
      ],
    },
    {
      icon: 'account_balance_wallet',
      label: translations['sidebar.accounting'] || 'Accounting',
      hasSubmenu: true,
      permission: 'accounting.view',
      submenuItems: [
        { icon: 'account_tree', label: translations['sidebar.chart_of_accounts'] || 'Chart of Accounts', href: getLocalizedRoute('admin.chart-of-accounts'), permission: 'chart_of_accounts.view' },
        { icon: 'edit_note', label: translations['sidebar.journal_entries'] || 'Journal Entries', href: getLocalizedRoute('admin.journal-entries'), permission: 'journal_entries.view' },
        { icon: 'bar_chart', label: translations['sidebar.financial_reports'] || 'Financial Reports', href: getLocalizedRoute('admin.financial-reports.index'), permission: 'financial_reports.view' },
      ],
    },
    {
      icon: 'account_balance_wallet',
      label: translations['sidebar.budgeting'] || 'Budgeting',
      hasSubmenu: true,
      permission: 'budgets.view',
      submenuItems: [
        { icon: 'dashboard', label: translations['sidebar.budget_dashboard'] || 'Budget Dashboard', href: getLocalizedRoute('admin.budget.dashboard'), permission: 'budgets.view' },
        { icon: 'category', label: translations['sidebar.budget_categories'] || 'Budget Categories', href: getLocalizedRoute('admin.budget.categories.index'), permission: 'budget_categories.view' },
        { icon: 'list_alt', label: translations['sidebar.budgets_list'] || 'Budgets List', href: getLocalizedRoute('admin.budget.index'), permission: 'budgets_list.view' },
        { icon: 'list_alt', label: translations['sidebar.budget_items'] || 'Budget Items', href: getLocalizedRoute('admin.budget.items.index'), permission: 'budget_items.view' },
        { icon: 'monitoring', label: translations['sidebar.budget_monitoring'] || 'Budget Monitoring', href: getLocalizedRoute('admin.budget.monitoring.index'), permission: 'budget_monitoring.view' },
        { icon: 'handshake', label: translations['sidebar.budget_commitments'] || 'Budget Commitments', href: getLocalizedRoute('admin.budget.commitments.index'), permission: 'budget_commitments.view' },
        { icon: 'trending_up', label: translations['sidebar.budget_forecasts'] || 'Budget Forecasts', href: getLocalizedRoute('admin.budget.forecasts.index'), permission: 'budget_forecasts.view' },
        { icon: 'swap_horiz', label: translations['sidebar.budget_transfers'] || 'Budget Transfers', href: getLocalizedRoute('admin.budget.transfers.index'), permission: 'budget_transfers.view' },
      ],
    },
    {
      icon: 'shopping_cart',
      label: translations['sidebar.ecommerce'] || 'E-Commerce',
      hasSubmenu: true,
      permission: 'products.view',
      submenuItems: [
        { icon: 'campaign', label: translations['sidebar.ads'] || 'Ads', href: getLocalizedRoute('admin.ecommerce.ads.index'), permission: 'media.view' },
        { icon: 'bolt', label: translations['sidebar.flash_sales'] || 'Flash Sales', href: getLocalizedRoute('admin.client-sales.flash-sales.index'), permission: 'flash_sales.view' },
      ],
    },
    {
            icon: 'percent',
            label: translations['sidebar.tax_vat'] || 'TAX & VAT',
            hasSubmenu: true,
            permission: 'settings.view',
            submenuItems: [
                { icon: 'settings', label: translations['sidebar.tax_types'] || 'Tax Types', href: getLocalizedRoute('admin.taxes.types.index'), permission: 'settings.view' },
                { icon: 'settings', label: translations['sidebar.tax_settings'] || 'Tax Settings', href: getLocalizedRoute('admin.taxes.settings.index'), permission: 'settings.view' },
                { icon: 'description', label: translations['sidebar.tax_reports'] || 'Tax Reports', href: getLocalizedRoute('admin.taxes.reports.index'), permission: 'settings.view' },
            ],
        },
    {
      icon: 'insights',
      label: translations['sidebar.investing_stack'] || 'Investing Stack',
      hasSubmenu: true,
      permission: 'settings.view',
      submenuItems: [
        { icon: 'account_balance', label: translations['sidebar.wallet'] || 'Wallet', href: getLocalizedRoute('admin.investing.wallet.index'), permission: 'settings.view' },
        { icon: 'business', label: translations['sidebar.industries'] || 'Industries', href: getLocalizedRoute('admin.investing.industries.index'), permission: 'settings.view' },
        { icon: 'apartment', label: translations['sidebar.listed_companies'] || 'Listed Companies', href: getLocalizedRoute('admin.investing.companies.index'), permission: 'settings.view' },
        { icon: 'handshake', label: translations['sidebar.brokers'] || 'Brokers', href: getLocalizedRoute('admin.investing.brokers.index'), permission: 'settings.view' },
        { icon: 'trending_up', label: translations['sidebar.market_prices'] || 'Market Prices', href: getLocalizedRoute('admin.investing.prices.index'), permission: 'settings.view' },
        { icon: 'shopping_cart', label: translations['sidebar.buy_shares'] || 'Buy Shares', href: getLocalizedRoute('admin.investing.buy-shares.index'), permission: 'settings.view' },
        { icon: 'sell', label: translations['sidebar.sell_shares'] || 'Sell Shares', href: getLocalizedRoute('admin.investing.sell-shares.index'), permission: 'settings.view' },
        { icon: 'account_balance_wallet', label: translations['sidebar.portfolio'] || 'Portfolio', href: getLocalizedRoute('admin.investing.portfolio.index'), permission: 'settings.view' },
      ],
    },
    { icon: 'folder', label: translations['sidebar.media'] || 'Media', href: getLocalizedRoute('admin.media.index'), permission: 'media.view' },
    { icon: 'assignment', label: translations['sidebar.tasks'] || 'Tasks', href: getLocalizedRoute('admin.tasks.index'), permission: 'dashboard.view' },
    // { icon: 'store', label: 'Marketplace' },
    { icon: 'settings', label: translations['sidebar.settings'] || 'Settings', href: getLocalizedRoute('admin.settings'), permission: 'settings.view' },
    { icon: 'admin_panel_settings', label: translations['sidebar.platform_admin'] || 'Platform Admin', href: getLocalizedRoute('admin.platform-admin.index'), permission: 'settings.view' },
  ].filter(item => {
      // 1. Check if user can view the main item
      if (item.permission && !can(item.permission)) {
          return false;
      }

      // 2. If it has submenu, filter submenu items
      if (item.hasSubmenu && item.submenuItems) {
          item.submenuItems = item.submenuItems.filter(sub => {
              if (sub.permission && !can(sub.permission)) {
                  return false;
              }
              return true;
          });

          // 3. Filter out items with empty submenus if they are meant to be submenu parents
          if (item.submenuItems.length === 0) {
              return false;
          }
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
          (sub) => isUrlActive(sub.href)
        );
        if (hasActiveChild) {
          const menuKey = item.label.toLowerCase().replace(/\s+/g, '-');
          setOpenSubmenus((prev) => ({ ...prev, [menuKey]: true }));
        }
      }
    });
  }, [url]);

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
      {/* Conditional Rendering: Desktop Sidebar vs Mobile Bottom Nav */}
      {!isMobile ? (
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
      ) : (
        <MobileBackendNav
          menuItems={menuItems}
          translations={translations}
          isRtl={isRtl}
          currentUrl={url}
        />
      )}

      <div className={`main-wrapper ${isSidebarCollapsed && !isMobile ? 'collapsed' : ''} ${isMobile ? 'mobile-view' : ''}`}>
        <div className="main-content">
          {/* Header is only for Desktop */}
          {!isMobile && <Header toggleSidebar={toggleSidebar} isRtl={isRtl} />}
          
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
