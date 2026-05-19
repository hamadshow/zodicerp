// Unified Admin Layout Component
// This component provides a consistent layout structure for all admin pages
// It includes the Header, Sidebar, and Footer components

import React, { useEffect, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { MobileBackendNav } from './MobileBackendNav';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AdminLayout = ({
  children,
  activeMenu: initialActiveMenu = 'Dashboard',
}) => {
  const page = usePage();
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
  const localization = props?.localization;
  const translations = localization?.translations || {};
  const isRtl = localization?.is_rtl;
  const flashSuccess = props?.flash?.success;
  const flashError = props?.flash?.error;

  useEffect(() => {
    if (flashSuccess) {
      toast.success(flashSuccess, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      });
    }
    if (flashError) {
      toast.error(flashError, {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      });
    }
  }, [flashSuccess, flashError]);

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
    { icon: 'home', label: translations['sidebar.Dashboard'] || 'Dashboard', href: getLocalizedRoute('admin.dashboard') },
    {
      icon: 'shopping_cart',
      label: translations['sidebar.essential_data'] || 'Essential Data',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'location_on', label: translations['sidebar.location'] || 'Location', href: getLocalizedRoute('admin.location.index') },
        { icon: 'monetization_on', label: translations['sidebar.currencies'] || 'Currencies', href: getLocalizedRoute('admin.currencies.index') },
        { icon: 'currency_exchange', label: translations['sidebar.exchange_rates'] || 'Exchange Rates', href: getLocalizedRoute('admin.exchange-rates.index') },
        { icon: 'assessment', label: translations['sidebar.companies'] || 'Companies', href: getLocalizedRoute('admin.companies.index') },
        { icon: 'store', label: translations['sidebar.branches'] || 'Branches', href: getLocalizedRoute('admin.branches.index') },
      ],
    },
    {
      icon: 'people',
      label: translations['sidebar.human_resources'] || 'Human Resources',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'dashboard', label: translations['sidebar.hr_dashboard'] || 'HR Dashboard', href: getLocalizedRoute('admin.hr.dashboard') },
        { icon: 'group', label: translations['sidebar.departments'] || 'Departments', href: getLocalizedRoute('admin.departments.index') },
        { icon: 'work', label: translations['sidebar.professions'] || 'Profession', href: getLocalizedRoute('admin.professions.index') },
        canViewNationalities && {
          icon: 'public',
          label: translations['sidebar.nationalities'] || 'Nationalities',
          href: getLocalizedRoute('admin.nationalities.index'),
        },
        { icon: 'person', label: translations['sidebar.employees'] || 'Employees', href: getLocalizedRoute('admin.employees.index') },
        {
          icon: 'admin_panel_settings',
          label: translations['sidebar.permissions'] || 'Permissions',
          href: '#',
        },
        { icon: 'access_time', label: translations['sidebar.attendance'] || 'Attendance', href: getLocalizedRoute('admin.attendance.index') },
        { icon: 'stars', label: translations['sidebar.reward'] || 'Reward', href: getLocalizedRoute('admin.reward.index') },
        { icon: 'schedule', label: translations['sidebar.overtime'] || 'OverTime', href: getLocalizedRoute('admin.overtime.index') },
        {
          icon: 'work_off',
          label: translations['sidebar.end_of_service'] || 'End-of-service',
          href: getLocalizedRoute('admin.end-of-service.index'),
        },
        {
          icon: 'payments',
          label: translations['sidebar.payroll_advance'] || 'Payroll Advance',
          href: getLocalizedRoute('admin.payroll-advance.index'),
        },
        { icon: 'remove_circle', label: translations['sidebar.deductions'] || 'Deductions', href: getLocalizedRoute('admin.deductions.index') },
        {
          icon: 'traffic',
          label: translations['sidebar.traffic_violations'] || 'Traffic Violations',
          href: getLocalizedRoute('admin.traffic-violations.index'),
        },
        { icon: 'card_travel', label: translations['sidebar.vacations'] || 'Vacations', href: getLocalizedRoute('admin.vacations.index') },
        {
          icon: 'receipt_long',
          label: translations['sidebar.salary_receipt'] || 'Salary Receipt',
          href: getLocalizedRoute('admin.salary-receipt.index'),
        },
      ].filter(Boolean),
    },
    {
      icon: 'work',
      label: translations['sidebar.recruitment'] || 'Recruitment',
      hasSubmenu: true,
      submenuItems: [
        {
          icon: 'work_outline',
          label: translations['sidebar.careers'] || 'Career',
          href: getLocalizedRoute('admin.careers.index'),
        },
        {
          icon: 'description',
          label: translations['sidebar.job_applications'] || 'Job Applications',
          href: getLocalizedRoute('admin.careers.applications'),
        },
      ],
    },
    {
      icon: 'account_balance',
      label: translations['sidebar.bank_cash'] || 'Bank and Cash',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'dashboard', label: translations['sidebar.treasury_dashboard'] || 'Dashboard', href: getLocalizedRoute('admin.treasury.dashboard') },
        { icon: 'account_balance_wallet', label: translations['sidebar.cash'] || 'Cash', href: getLocalizedRoute('admin.petty-cash.index') },
        { icon: 'account_balance', label: translations['sidebar.banks'] || 'Banks', href: getLocalizedRoute('admin.banks.index') },
        { icon: 'payments', label: translations['sidebar.cheque'] || 'Cheque', href: getLocalizedRoute('admin.cheques.index') },
        { icon: 'swap_horiz', label: translations['sidebar.bank_transactions'] || 'Bank Transactions', href: getLocalizedRoute('admin.bank-transactions.index') },
        { icon: 'receipt_long', label: translations['sidebar.payment_voucher'] || 'Payment Voucher', href: getLocalizedRoute('admin.payment-vouchers.index') },
      ],
    },
    {
      icon: 'inventory_2',
      label: translations['sidebar.inventory'] || 'Inventory',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'warehouse', label: translations['sidebar.warehouses'] || 'Warehouses', href: getLocalizedRoute('admin.inventory.warehouses.index') },
        { icon: 'straighten', label: translations['sidebar.item_units'] || 'Item Units', href: getLocalizedRoute('admin.inventory.item-units.index') },
        { icon: 'tune', label: translations['sidebar.item_attributes'] || 'Item Attributes', href: getLocalizedRoute('admin.inventory.item-attributes.index') },
        { icon: 'collections_bookmark', label: translations['sidebar.product_collections'] || 'Product Collections', href: getLocalizedRoute('admin.inventory.product-collections.index') },
        { icon: 'category', label: translations['sidebar.categories'] || 'Categories', href: getLocalizedRoute('admin.inventory.categories.index') },
        { icon: 'branding_watermark', label: translations['sidebar.brands'] || 'Brands', href: getLocalizedRoute('admin.inventory.brands.index') },
        { icon: 'inventory', label: translations['sidebar.products'] || 'Products', href: getLocalizedRoute('admin.inventory.products.index') },
        { icon: 'playlist_add', label: translations['sidebar.opening_stock'] || 'Opening Stock', href: getLocalizedRoute('admin.inventory.opening-stock.index') },
        { icon: 'swap_horiz', label: translations['sidebar.transfer_stock'] || 'Transfer Stock', href: getLocalizedRoute('admin.inventory.stock-transfers.index') },
        { icon: 'assignment', label: translations['sidebar.stock_adjustments'] || 'Stock Adjustments', href: getLocalizedRoute('admin.inventory.stock-adjustments.index') },
        { icon: 'report', label: translations['sidebar.inventory_reports'] || 'Inventory Reports', href: getLocalizedRoute('admin.inventory.reports.index') },
      ],
    },
    {
      icon: 'shopping_cart',
      label: translations['sidebar.supplier_purchase'] || 'Supplier & Purchase',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'dashboard', label: translations['sidebar.purchase_dashboard'] || 'Purchase Dashboard', href: getLocalizedRoute('admin.purchases.dashboard') },
        { icon: 'groups', label: translations['sidebar.supplier_groups'] || 'Supplier Groups', href: getLocalizedRoute('admin.purchases.supplier-groups.index') },
        { icon: 'people', label: translations['sidebar.suppliers'] || 'Suppliers', href: getLocalizedRoute('admin.purchases.suppliers.index') },
        { icon: 'request_quote', label: translations['sidebar.quotations'] || 'Quotations', href: getLocalizedRoute('admin.purchases.quotations.index') },
        { icon: 'shopping_bag', label: translations['sidebar.purchase_orders'] || 'Purchase Orders', href: getLocalizedRoute('admin.purchases.orders.index') },
        { icon: 'inventory', label: translations['sidebar.goods_receipts'] || 'Goods Receipts', href: getLocalizedRoute('admin.purchases.goods-receipts.index') },
        { icon: 'receipt', label: translations['sidebar.purchase_invoices'] || 'Purchase Invoices', href: getLocalizedRoute('admin.purchases.invoices.index') },
        { icon: 'keyboard_return', label: translations['sidebar.purchase_returns'] || 'Purchase Returns', href: getLocalizedRoute('admin.purchases.returns.index') },
      ],
    },
    {
      icon: 'point_of_sale',
      label: translations['sidebar.client_sales'] || 'Client & Sales',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'groups', label: translations['sidebar.customer_groups'] || 'Customers Group', href: getLocalizedRoute('admin.client-sales.customer-groups.index') },
        { icon: 'person_add', label: translations['sidebar.customers'] || 'Customers', href: getLocalizedRoute('admin.client-sales.customers.index') },
        { icon: 'request_quote', label: translations['sidebar.quotations'] || 'Sales Quotations', href: getLocalizedRoute('admin.client-sales.quotations.index') },
        { icon: 'receipt_long', label: translations['sidebar.orders'] || 'Sales Orders', href: getLocalizedRoute('admin.client-sales.orders.index') },
        { icon: 'receipt', label: translations['sidebar.invoices'] || 'Sales Invoices', href: getLocalizedRoute('admin.client-sales.invoices.index') },
      ],
    },
    {
      icon: 'business',
      label: translations['sidebar.fixed_assets'] || 'Fixed Assets',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'category', label: translations['sidebar.asset_categories'] || 'Asset Categories', href: getLocalizedRoute('admin.assets.categories.index') },
        { icon: 'tune', label: translations['sidebar.asset_attributes'] || 'Asset Attributes', href: getLocalizedRoute('admin.assets.asset-attributes.index') },
        { icon: 'web_asset', label: translations['sidebar.assets_register'] || 'Assets Register', href: getLocalizedRoute('admin.assets.register.index') },
        { icon: 'swap_horiz', label: translations['sidebar.asset_movements'] || 'Asset Movements', href: getLocalizedRoute('admin.assets.movements.index') },
        { icon: 'trending_up', label: translations['sidebar.asset_revaluation'] || 'Asset Revaluation', href: getLocalizedRoute('admin.assets.revaluation.index') },
        { icon: 'delete_forever', label: translations['sidebar.asset_disposal'] || 'Asset Disposal', href: getLocalizedRoute('admin.assets.disposal.index') },
        { icon: 'calculate', label: translations['sidebar.run_depr'] || 'Run Depr', href: getLocalizedRoute('admin.assets.depreciation.run') },
        { icon: 'calendar_today', label: translations['sidebar.depr_schedule'] || 'Depr Schedule', href: getLocalizedRoute('admin.assets.depreciation.schedule') },
        { icon: 'assessment', label: translations['sidebar.depr_report'] || 'Depr Report', href: getLocalizedRoute('admin.assets.depreciation.report') },
      ],
    },
    {
      icon: 'account_balance_wallet',
      label: translations['sidebar.accounting'] || 'Accounting',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'account_tree', label: translations['sidebar.chart_of_accounts'] || 'Chart of Accounts', href: getLocalizedRoute('admin.chart-of-accounts') },
        { icon: 'edit_note', label: translations['sidebar.journal_entries'] || 'Journal Entries', href: getLocalizedRoute('admin.journal-entries') },
        { icon: 'bar_chart', label: translations['sidebar.financial_reports'] || 'Financial Reports', href: getLocalizedRoute('admin.financial-reports.index') },
      ],
    },
    {
      icon: 'account_balance_wallet',
      label: translations['sidebar.budgeting'] || 'Budgeting',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'dashboard', label: translations['sidebar.budget_dashboard'] || 'Budget Dashboard', href: getLocalizedRoute('admin.budget.dashboard') },
        { icon: 'category', label: translations['sidebar.budget_categories'] || 'Budget Categories', href: getLocalizedRoute('admin.budget.categories.index') },
        { icon: 'list_alt', label: translations['sidebar.budgets_list'] || 'Budgets List', href: getLocalizedRoute('admin.budget.index') },
        { icon: 'list_alt', label: translations['sidebar.budget_items'] || 'Budget Items', href: getLocalizedRoute('admin.budget.items.index') },
        { icon: 'monitoring', label: translations['sidebar.budget_monitoring'] || 'Budget Monitoring', href: getLocalizedRoute('admin.budget.monitoring.index') },
        { icon: 'handshake', label: translations['sidebar.budget_commitments'] || 'Budget Commitments', href: getLocalizedRoute('admin.budget.commitments.index') },
        { icon: 'trending_up', label: translations['sidebar.budget_forecasts'] || 'Budget Forecasts', href: getLocalizedRoute('admin.budget.forecasts.index') },
        { icon: 'swap_horiz', label: translations['sidebar.budget_transfers'] || 'Budget Transfers', href: getLocalizedRoute('admin.budget.transfers.index') },
      ],
    },
    {
      icon: 'shopping_cart',
      label: translations['sidebar.ecommerce'] || 'E-Commerce',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'campaign', label: translations['sidebar.ads'] || 'Ads', href: getLocalizedRoute('admin.ecommerce.ads.index') },
        { icon: 'bolt', label: translations['sidebar.flash_sales'] || 'Flash Sales', href: getLocalizedRoute('admin.client-sales.flash-sales.index') },
      ],
    },
    {
            icon: 'percent',
            label: translations['sidebar.tax_vat'] || 'TAX & VAT',
            hasSubmenu: true,
            submenuItems: [
                { icon: 'settings', label: translations['sidebar.tax_types'] || 'Tax Types', href: getLocalizedRoute('admin.taxes.types.index') },
                { icon: 'settings', label: translations['sidebar.tax_settings'] || 'Tax Settings', href: getLocalizedRoute('admin.taxes.settings.index') },
                { icon: 'description', label: translations['sidebar.tax_reports'] || 'Tax Reports', href: getLocalizedRoute('admin.taxes.reports.index') },
            ],
        },
    {
      icon: 'insights',
      label: translations['sidebar.investing_stack'] || 'Investing Stack',
      hasSubmenu: true,
      submenuItems: [
        { icon: 'account_balance', label: translations['sidebar.wallet'] || 'Wallet', href: getLocalizedRoute('admin.investing.wallet.index') },
        { icon: 'business', label: translations['sidebar.industries'] || 'Industries', href: getLocalizedRoute('admin.investing.industries.index') },
        { icon: 'apartment', label: translations['sidebar.listed_companies'] || 'Listed Companies', href: getLocalizedRoute('admin.investing.companies.index') },
        { icon: 'handshake', label: translations['sidebar.brokers'] || 'Brokers', href: getLocalizedRoute('admin.investing.brokers.index') },
        { icon: 'trending_up', label: translations['sidebar.market_prices'] || 'Market Prices', href: getLocalizedRoute('admin.investing.prices.index') },
        { icon: 'shopping_cart', label: translations['sidebar.buy_shares'] || 'Buy Shares', href: getLocalizedRoute('admin.investing.buy-shares.index') },
        { icon: 'sell', label: translations['sidebar.sell_shares'] || 'Sell Shares', href: getLocalizedRoute('admin.investing.sell-shares.index') },
        { icon: 'account_balance_wallet', label: translations['sidebar.portfolio'] || 'Portfolio', href: getLocalizedRoute('admin.investing.portfolio.index') },
      ],
    },
    { icon: 'folder', label: translations['sidebar.media'] || 'Media', href: getLocalizedRoute('admin.media.index') },
    { icon: 'assignment', label: translations['sidebar.tasks'] || 'Tasks', href: getLocalizedRoute('admin.tasks.index') },
    // { icon: 'store', label: 'Marketplace' },
    { icon: 'settings', label: translations['sidebar.settings'] || 'Settings', href: getLocalizedRoute('admin.settings') },
    { icon: 'admin_panel_settings', label: translations['sidebar.platform_admin'] || 'Platform Admin', href: getLocalizedRoute('admin.platform-admin.index') },
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
          
          <ToastContainer rtl={isRtl} />

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
