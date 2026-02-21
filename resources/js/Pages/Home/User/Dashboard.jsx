import React from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import '../../../../css/homepage/main.scss';
import Header from '../Components/Header';
import Footer from '../Components/Footer';

const menuItems = [
  { key: 'overview', label: 'Overview', icon: 'fas fa-home' },
  { key: 'orders', label: 'Orders', icon: 'fas fa-shopping-cart' },
  { key: 'reviews', label: 'Reviews', icon: 'fas fa-star' },
  { key: 'downloads', label: 'Downloads', icon: 'fas fa-download' },
  { key: 'returns', label: 'Order Return Requests', icon: 'fas fa-undo-alt' },
  { key: 'addresses', label: 'Addresses', icon: 'fas fa-map-marker-alt' },
  { key: 'account', label: 'Account Settings', icon: 'fas fa-cog' },
  { key: 'logout', label: 'Logout', icon: 'fas fa-sign-out-alt' },
];

export default function Dashboard({ categories = [] }) {
  const user = usePage().props.auth?.user;
  const displayName = user?.name || 'Ahmed';

  const handleLogout = () => {
    router.post(route('logout'));
  };

  return (
    <div className="app-layout homepage-layout user-dashboard-page">
      <Head title="My Dashboard" />

      <Header categoriesData={categories} showAnnouncementBar={false} />

      <div className="product-details-container user-dashboard-container">
        <nav className="breadcrumb">
          <Link href="/">Home</Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">My Account</span>
        </nav>

        <div className="user-dashboard-layout">
          <aside className="user-dashboard-sidebar">
            <ul className="user-dashboard-nav">
              {menuItems.map((item) => {
                const isLogout = item.key === 'logout';
                const isActive = item.key === 'overview';
                const itemClassName = [
                  'user-dashboard-nav-item',
                  isActive ? 'is-active' : '',
                  isLogout ? 'logout' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                const content = (
                  <>
                    <div className="user-dashboard-nav-item-icon">
                      <i className={item.icon}></i>
                    </div>
                    <span className="user-dashboard-nav-item-label">{item.label}</span>
                  </>
                );

                return (
                  <li key={item.key}>
                    {isLogout ? (
                      <button type="button" className={itemClassName} onClick={handleLogout}>
                        {content}
                      </button>
                    ) : (
                      <button type="button" className={itemClassName}>
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </aside>

          <main className="user-dashboard-main">
            <section className="user-dashboard-welcome-card">
              <div className="user-dashboard-welcome-header">
                <div className="user-dashboard-avatar">
                  <span className="user-dashboard-avatar-initial">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="user-dashboard-welcome-text">
                  <h1 className="user-dashboard-title">Welcome back, {displayName}!</h1>
                  <p className="user-dashboard-subtitle">
                    Manage your account, view orders, and update your preferences from your personal
                    dashboard.
                  </p>
                </div>
              </div>
            </section>

            <section className="user-dashboard-features">
              <div className="user-dashboard-feature-card is-orders">
                <div className="user-dashboard-feature-header">
                  <div className="user-dashboard-feature-icon">
                    <i className="fas fa-shopping-bag"></i>
                  </div>
                  <div>
                    <div className="user-dashboard-feature-title">View Orders</div>
                    <div className="user-dashboard-feature-description">
                      Track your recent orders and order history
                    </div>
                  </div>
                </div>
                <div className="user-dashboard-feature-footer">
                  <button type="button" className="user-dashboard-feature-button">
                    <span>View Orders</span>
                    <span>→</span>
                  </button>
                </div>
              </div>

              <div className="user-dashboard-feature-card is-addresses">
                <div className="user-dashboard-feature-header">
                  <div className="user-dashboard-feature-icon">
                    <i className="fas fa-map-marked-alt"></i>
                  </div>
                  <div>
                    <div className="user-dashboard-feature-title">Manage Addresses</div>
                    <div className="user-dashboard-feature-description">
                      Update your shipping and billing addresses
                    </div>
                  </div>
                </div>
                <div className="user-dashboard-feature-footer">
                  <button type="button" className="user-dashboard-feature-button">
                    <span>Manage Addresses</span>
                    <span>→</span>
                  </button>
                </div>
              </div>

              <div className="user-dashboard-feature-card is-account">
                <div className="user-dashboard-feature-header">
                  <div className="user-dashboard-feature-icon">
                    <i className="fas fa-user-cog"></i>
                  </div>
                  <div>
                    <div className="user-dashboard-feature-title">Account Settings</div>
                    <div className="user-dashboard-feature-description">
                      Edit your profile and account details
                    </div>
                  </div>
                </div>
                <div className="user-dashboard-feature-footer">
                  <button type="button" className="user-dashboard-feature-button">
                    <span>Edit Account</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}
