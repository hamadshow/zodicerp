import { Link, usePage } from '@inertiajs/react';
import React from 'react';

export function FinanzaHeader({
  variant = 'full',
  isScrolled = false,
  isMobileMenuOpen = false,
  onToggleMobileMenu,
  onCloseMobileMenu,
  onOpenAuth,
  loginHref = '/login',
  registerHref = '/register',
  logoutHref = '/logout',
  dashboardHref = '/dashboard',
  customerFirstName = null,
  homeHref,
  t = (k, f) => f || k,
}) {
  const page = usePage();
  const auth = page?.props?.auth || null;
  const authUser = auth?.user || null;
  const authCustomer = auth?.customer || null;
  const authSupplier = auth?.supplier || null;
  const resolvedName =
    authUser?.name ||
    authCustomer?.name_ar ||
    authCustomer?.name_en ||
    authSupplier?.name_ar ||
    authSupplier?.name_en ||
    customerFirstName ||
    null;
  const resolvedEmail = authUser?.email || authCustomer?.email || authSupplier?.email || null;
  const avatarLetter = (resolvedName || resolvedEmail || 'U')
    .trim()
    .charAt(0)
    .toUpperCase();
  const isAuthenticated = Boolean(authUser || authCustomer || authSupplier || customerFirstName);
  const showFullNav = variant === 'full';
  const toggleMobileMenu = onToggleMobileMenu || (() => {});
  const closeMobileMenu = onCloseMobileMenu || (() => {});
  const brandHref = homeHref || (showFullNav ? '#top' : '/');

  return (
    <>
      <header className={`finanza-header ${isScrolled ? 'finanza-header--scrolled' : ''}`}>
        <div className="container-fluid finanza-header-inner">
          <a className="finanza-brand" href={brandHref} aria-label="Finanza home">
            ZodicERP
          </a>
          {showFullNav ? (
            <nav className={`finanza-nav ${isMobileMenuOpen ? 'finanza-nav--open' : ''}`} aria-label="Primary">
              <a className="finanza-nav-link finanza-nav-link--active" href="#top" aria-current="page">
                {t('header_home', 'Home')}
              </a>
              <a className="finanza-nav-link" href="#about">
                {t('header_about', 'About')}
              </a>
              <a className="finanza-nav-link" href="#services">
                {t('header_services', 'Services')}
              </a>
              <a className="finanza-nav-link" href="#projects">
                {t('header_projects', 'Projects')}
              </a>
              <a className="finanza-nav-link" href="#contact">
                {t('header_contact', 'Contact')}
              </a>
            </nav>
          ) : null}
          <div className="finanza-header-actions" aria-label="Actions">
            <div className="finanza-auth-actions">
              {isAuthenticated ? (
                <div className="finanza-userChip">
                  <Link className="finanza-userChip-main" href={dashboardHref} aria-label="Open dashboard">
                    <span className="finanza-userChip-avatar" aria-hidden="true">
                      {avatarLetter}
                    </span>
                    <span className="finanza-userChip-meta">
                      <span className="finanza-userChip-name">{resolvedName || t('header_dashboard', 'Dashboard')}</span>
                      {resolvedEmail ? <span className="finanza-userChip-email">{resolvedEmail}</span> : null}
                    </span>
                  </Link>
                  <Link
                    className="finanza-userChip-logout"
                    href={logoutHref}
                    method="post"
                    as="button"
                    type="button"
                    aria-label={t('header_logout', 'Logout')}
                  >
                    <i className="fa-solid fa-right-from-bracket" />
                  </Link>
                </div>
              ) : (
                <>
                  <Link className="finanza-btn finanza-btn--ghost" href={loginHref}>
                    {t('header_login', 'Login')}
                  </Link>
                  <Link className="finanza-btn finanza-btn--primary finanza-btn--sm" href={registerHref}>
                    {t('header_register', 'Register')}
                  </Link>
                </>
              )}
            </div>


            {showFullNav ? (
              <button
                type="button"
                className="finanza-burger"
                aria-label="Open menu"
                aria-expanded={isMobileMenuOpen}
                onClick={toggleMobileMenu}
              >
                <span />
                <span />
                <span />
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {showFullNav && isMobileMenuOpen ? (
        <div
          className="finanza-mobileMenu"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile menu"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeMobileMenu();
          }}
        >
          <div className="finanza-mobileMenu-panel">
            <div className="finanza-mobileMenu-top">
              <div className="finanza-mobileMenu-title">Menu</div>
              <button type="button" className="finanza-mobileMenu-close" aria-label="Close menu" onClick={closeMobileMenu}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <a className="finanza-mobileMenu-link" href="#top" onClick={closeMobileMenu}>
              {t('header_home', 'Home')}
            </a>
            <a className="finanza-mobileMenu-link" href="#about" onClick={closeMobileMenu}>
              {t('header_about', 'About')}
            </a>
            <a className="finanza-mobileMenu-link" href="#services" onClick={closeMobileMenu}>
              {t('header_services', 'Services')}
            </a>
            <a className="finanza-mobileMenu-link" href="#projects" onClick={closeMobileMenu}>
              {t('header_projects', 'Projects')}
            </a>
            <a className="finanza-mobileMenu-link" href="#contact" onClick={closeMobileMenu}>
              {t('header_contact', 'Contact')}
            </a>

            <div className="finanza-mobileMenu-actions">
              {isAuthenticated ? (
                <>
                  <a className="finanza-btn finanza-btn--ghost" href={dashboardHref}>
                    {t('header_dashboard', 'Dashboard')}
                  </a>
                  <Link className="finanza-btn finanza-btn--primary" href={logoutHref} method="post" as="button" type="button">
                    {t('header_logout', 'Logout')}
                  </Link>
                </>
              ) : (
                <>
                  <button type="button" className="finanza-btn finanza-btn--ghost" onClick={() => onOpenAuth?.('login')}>
                    {t('header_login', 'Login')}
                  </button>
                  <button type="button" className="finanza-btn finanza-btn--primary" onClick={() => onOpenAuth?.('register')}>
                    {t('header_register', 'Register')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
