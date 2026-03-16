import React, { useState, useEffect } from 'react';
import { usePage, Link } from '@inertiajs/react';
import '../../../../../css/suppliers/Backend/main.scss';

const SupplierLayout = ({ children, activeMenu: initialActiveMenu = 'Dashboard' }) => {
    const { props } = usePage();
    const user = props?.auth?.supplier;
    const localization = props?.localization;
    const isRtl = localization?.is_rtl;
    
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [activeMenu, setActiveMenu] = useState(initialActiveMenu);

    useEffect(() => {
        document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
        document.documentElement.lang = localization?.current_locale || 'ar';
    }, [isRtl, localization?.current_locale]);

    const getLocalizedRoute = (name, params = {}) => {
        try {
            return route(name, {
                country: localization?.country_code || 'sa',
                lang: localization?.current_locale || 'ar',
                ...params
            });
        } catch {
            console.warn(`Route ${name} not found`);
            return '#';
        }
    };

    const menuItems = [
        { 
            icon: 'dashboard', 
            label: 'Dashboard', 
            href: getLocalizedRoute('supplier.dashboard'),
            id: 'Dashboard'
        },
        { 
            icon: 'inventory_2', 
            label: 'My Products', 
            href: getLocalizedRoute('supplier.products'),
            id: 'Products'
        },
        { 
            icon: 'shopping_cart', 
            label: 'Orders', 
            href: getLocalizedRoute('supplier.orders'),
            id: 'Orders'
        },
        { 
            icon: 'monetization_on', 
            label: 'Earnings', 
            href: getLocalizedRoute('supplier.earnings'),
            id: 'Earnings'
        },
        { 
            icon: 'star', 
            label: 'Reviews', 
            href: getLocalizedRoute('supplier.reviews'),
            id: 'Reviews'
        },
        { 
            icon: 'person', 
            label: 'Profile Settings', 
            href: getLocalizedRoute('supplier.profile'),
            id: 'Profile'
        },
    ];

    return (
        <div className="supplier-layout">
            {/* Sidebar */}
            <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
                <div className="logo-area">
                    <span className="material-icons logo-icon">storefront</span>
                    <span className="logo-text">{sidebarCollapsed ? '' : 'Supplier Panel'}</span>
                </div>
                
                <nav className="nav-menu">
                    {menuItems.map((item, index) => (
                        <Link
                            key={index}
                            href={item.href}
                            className={`nav-item ${activeMenu === item.id ? 'active' : ''}`}
                            onClick={() => setActiveMenu(item.id)}
                        >
                            <span className="material-icons icon">{item.icon}</span>
                            <span className="menu-text">{item.label}</span>
                        </Link>
                    ))}
                </nav>
                
                <div className="sidebar-footer">
                    &copy; {new Date().getFullYear()} Zodic ERP
                </div>
            </aside>

            {/* Main Content */}
            <div className="main-content">
                <header>
                    <div className="header-left">
                        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="menu-toggle">
                            <span className="material-icons">menu</span>
                        </button>
                        <h2 className="page-title">{activeMenu}</h2>
                    </div>

                    <div className="header-center">
                        <div className="search-bar">
                            <span className="material-icons">search</span>
                            <input type="text" placeholder="Search..." />
                        </div>
                    </div>

                    <div className="header-right">
                        <button className="icon-btn" title="Switch Language">
                            <span className="material-icons">language</span>
                        </button>

                        <button className="icon-btn relative">
                            <span className="material-icons">notifications</span>
                            <span className="badge"></span>
                        </button>
                        
                        <div className="user-profile">
                            <div className="avatar">
                                {user?.name_ar?.[0] || 'S'}
                            </div>
                            <div className="user-info hidden md:flex">
                                <span className="name">{user?.name_ar || 'Supplier'}</span>
                                <span className="role">Vendor</span>
                            </div>
                            <span className="material-icons text-gray-400">expand_more</span>
                        </div>
                    </div>
                </header>

                <main>
                    {children}
                </main>
            </div>
        </div>
    );
};

export default SupplierLayout;
