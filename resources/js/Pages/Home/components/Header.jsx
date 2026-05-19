import { Link, usePage } from '@inertiajs/react';
import React from 'react';

export function FinanzaHeader({
  variant = 'full',
  isScrolled = false,
  isMobileMenuOpen = false,
  onToggleMobileMenu,
  loginHref = '/login',
  registerHref = '/register',
  logoutHref = '/logout',
  dashboardHref = '/dashboard',
  customerFirstName = null,
  homeHref,
  t = (k, f) => f || k,
  navLinks = []
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

  const localization = page.props.localization;
  const countryCode = 
    localization?.country_code || 
    (typeof localization?.current_country === 'string' 
      ? localization.current_country 
      : localization?.current_country?.code?.toLowerCase?.()) || 
    'sa';
  const currentLocale = localization?.current_locale || 'en';

  const isHomePage = route().current('home');

  const brandHref = homeHref || (isHomePage ? '#top' : route('home', { country: countryCode, lang: currentLocale }));

  const resolvedLogoutHref = logoutHref !== '/logout' 
    ? logoutHref 
    : route('logout', { country: countryCode, lang: currentLocale });

  const getNavLink = (hash) => {
    return isHomePage ? hash : `${route('home', { country: countryCode, lang: currentLocale })}${hash}`;
  };

  return (
    <>
      <header className={`finanza-header ${isScrolled ? 'finanza-header--scrolled' : ''}`}>
        <div className="container-fluid finanza-header-inner">
          <Link className="finanza-brand" href={brandHref} aria-label="Finanza home">
            ZodicERP
          </Link>
          {showFullNav ? (
            <nav className={`finanza-nav ${isMobileMenuOpen ? 'finanza-nav--open' : ''}`} aria-label="Primary">
              {navLinks.map((link) => (
                link.type === 'hash' ? (
                  <a key={link.name} className="finanza-nav-link" href={getNavLink(link.href)}>
                    {link.name}
                  </a>
                ) : (
                  <Link key={link.name} className="finanza-nav-link" href={link.href}>
                    {link.name}
                  </Link>
                )
              ))}
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
                    href={resolvedLogoutHref}
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
    </>
  );
}
