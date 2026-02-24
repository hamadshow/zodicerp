import React, { useEffect, useRef, useState } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import '../../../../css/homepage/main.scss';
import SearchBar from './SearchBar';
import { useCurrency } from '../../../Hooks/useCurrency';
import { useTranslation } from '../../../Hooks/useTranslation';

const resolveMediaUrl = (value) => {
  if (!value) return null;

  if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
    return value;
  }

  const withoutProtocol =
    typeof value === 'string' ? value.replace(/^https?:\/\/[^/]+/, '') : '';

  const relativePath = withoutProtocol.replace(
    /^\/?(files|storage|media-files)\//,
    ''
  );

  return relativePath ? `/media-files/${relativePath}` : null;
};

export default function HeaderTop({
  categoriesData = [],
  query,
  setQuery,
  onSearch,
  cartCount = 0,
  cartVersion = 0,
}) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [miniCart, setMiniCart] = useState({ items: [], subTotal: 0, tax: 0, total: 0 });
  const [miniCartError, setMiniCartError] = useState(null);
  const closeTimerRef = useRef(null);
  const lastFetchedVersionRef = useRef(null);

  const fetchMiniCart = async (force = false) => {
    if (isCartLoading) return;
    if (!force && lastFetchedVersionRef.current === cartVersion) return;

    setIsCartLoading(true);
    setMiniCartError(null);
    try {
      const response = await window.axios.get(getLocalizedRoute('cart.mini'));
      setMiniCart({
        items: response?.data?.items || [],
        subTotal: response?.data?.subTotal || 0,
        tax: response?.data?.tax || 0,
        total: response?.data?.total || 0,
      });
      lastFetchedVersionRef.current = response?.data?.cartVersion ?? cartVersion;
    } catch (error) {
      console.error('Failed to load mini cart', error);
      setMiniCartError('Failed to load cart.');
    } finally {
      setIsCartLoading(false);
    }
  };

  const onCartEnter = () => {
    window.clearTimeout(closeTimerRef.current);
    setIsCartOpen(true);
    fetchMiniCart(false);
  };

  const onCartLeave = () => {
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => setIsCartOpen(false), 180);
  };

  useEffect(() => {
    if (isCartOpen) {
      fetchMiniCart(false);
    }
  }, [cartVersion]);

  const removeItem = async (itemKey) => {
    try {
      const response = await window.axios.post(getLocalizedRoute('cart.remove'), { item_key: itemKey });
      if (typeof response?.data?.cartCount === 'number') {
        window.dispatchEvent(
          new CustomEvent('cart:updated', { detail: { count: response.data.cartCount, version: response?.data?.cartVersion } })
        );
      }
      await fetchMiniCart(true);
    } catch (error) {
      console.error('Failed to remove cart item', error);
      setMiniCartError('Failed to update cart.');
    }
  };

  const { formatMoney, localization } = useCurrency();
  const { t } = useTranslation();

  const getLocalizedRoute = (name, params = {}) => {
    return route(name, {
      country: localization?.country_code || 'sa',
      lang: localization?.current_locale || 'ar',
      ...params
    });
  };

  const handleLocaleChange = (newLocale) => {
    const country = localization?.country_code || 'sa';
    router.get(`/${country}/${newLocale}`);
  };

  const handleCountryChange = (newCountry) => {
    const locale = localization?.current_locale || 'ar';
    router.get(`/${newCountry}/${locale}`);
  };

  const totalQuantity = miniCart.items.reduce(
    (sum, item) => sum + (item.quantity || 0),
    0
  );

  const user = usePage().props.auth?.user;

  const handleUserButtonClick = () => {
    if (!user) {
      window.location.href = getLocalizedRoute('login');
    }
  };

  const handleLogout = () => {
    router.post(getLocalizedRoute('customer.logout'));
  };

  const handleDashboard = () => {
    if (user?.role === 'customer') {
      router.visit(getLocalizedRoute('customer.dashboard'));
    }
  };

  return (
    <div className="header-top">
      <Link href="/" className="logo" aria-label="ZodiMarket Home">
        <div className="logo-icon">Z</div>
        <div className="logo-text">odiMarket</div>
      </Link>
      <SearchBar
        categoriesData={categoriesData}
        query={query}
        setQuery={setQuery}
        onSearch={onSearch}
      />
      <div className="header-actions">
        <div className="language-selector-wrapper">
          <div 
            className="language-selector" 
            onClick={() => setIsLangOpen(!isLangOpen)}
          >
            <i className="fas fa-globe"></i>
            <span>
              {localization?.active_languages?.find(l => l.lang_code === localization?.current_locale)?.lang_name || 
               (localization?.current_locale === 'ar' ? 'العربية' : 'English')}
            </span>
            <i className={`fas fa-chevron-down ${isLangOpen ? 'rotate' : ''}`}></i>
          </div>
          
          {isLangOpen && (
            <div className="language-dropdown">
              {localization?.active_languages?.map((lang) => (
                <div 
                  key={lang.lang_id}
                  className={`lang-item ${localization?.current_locale === lang.lang_code ? 'active' : ''}`}
                  onClick={() => {
                    handleLocaleChange(lang.lang_code);
                    setIsLangOpen(false);
                  }}
                >
                  {lang.lang_flag && (
                    <span className={`flag-icon flag-icon-${lang.lang_flag}`}></span>
                  )}
                  {lang.lang_name}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="country-selector" onClick={() => handleCountryChange(localization?.country_code === 'sa' ? 'eg' : 'sa')}>
          <i className="fas fa-map-marker-alt"></i>
          <span>{localization?.current_country?.name || localization?.country_code?.toUpperCase()}</span>
        </div>
        <div className="currency-selector">
          <i className="fas fa-money-bill-wave"></i>
          <span>{localization?.currency_code}</span>
        </div>
        <div className="user-menu">
          <div className="menu-item help-center">
            <i className="fas fa-question-circle"></i>
            <span>{t('header.help_center', 'Help Center')}</span>
          </div>
          {user ? (
            <div className="menu-item user-account-block">
              <i className="fas fa-user"></i>
              <div className="user-account-text">
                <span className="user-account-name" onClick={handleDashboard}>
                  {user.name}
                </span>
                <button
                  type="button"
                  className="user-account-logout"
                  onClick={handleLogout}
                >
                  {t('header.logout', 'Logout')}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="menu-item sign-in"
              onClick={handleUserButtonClick}
            >
              <i className="fas fa-user"></i>
              <span>{t('header.sign_in', 'Sign In')}</span>
            </button>
          )}
          <div
            className="menu-item cart-badge"
            onMouseEnter={onCartEnter}
            onMouseLeave={onCartLeave}
          >
            <div className="icon-wrapper">
              <i className="fas fa-shopping-cart"></i>
              <div className="badge">{cartCount}</div>
            </div>
            <span>{totalQuantity > 0 ? `${t('header.cart', 'Cart')} (${totalQuantity})` : t('header.cart', 'Cart')}</span>

            {isCartOpen && (
              <div
                className="mini-cart-dropdown"
                onMouseEnter={onCartEnter}
                onMouseLeave={onCartLeave}
              >
                <div className="mini-cart-panel">
                  <div className="mini-cart-items">
                    {isCartLoading && <div className="mini-cart-loading">{t('cart.loading', 'Loading...')}</div>}
                    {!isCartLoading && miniCartError && (
                      <div className="mini-cart-error">{miniCartError}</div>
                    )}
                    {!isCartLoading && !miniCartError && miniCart.items.length === 0 && (
                      <div className="mini-cart-empty">{t('cart.empty', 'Your cart is empty.')}</div>
                    )}
                    {!isCartLoading &&
                      !miniCartError &&
                      miniCart.items.map((item) => (
                        <div key={item.itemKey} className="mini-cart-item">
                          <img
                            className="mini-cart-thumb"
                            src={resolveMediaUrl(item.image) || item.image}
                            alt={item.name}
                            loading="lazy"
                          />
                          <div className="mini-cart-item-info">
                            <Link
                              href={getLocalizedRoute('product.details', { identifier: item.productId })}
                              className="mini-cart-item-title"
                            >
                              {item.name}
                            </Link>
                            {item.variants && Object.keys(item.variants).length > 0 && (
                                <div className="mini-cart-item-variants" style={{ fontSize: '0.85em', color: '#666', marginTop: '4px' }}>
                                    {Object.entries(item.variants).map(([key, value]) => (
                                        <div key={key} className="variant-row">
                                            <span style={{ fontWeight: '500' }}>{key}: </span>
                                            <span>{typeof value === 'object' ? JSON.stringify(value) : value}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="mini-cart-item-meta">
                              {item.quantity} x {formatMoney(item.unitPrice)}
                            </div>
                            <div className="mini-cart-item-supplier">{t('cart.sold_by', 'Sold by:')} {item.supplier}</div>
                          </div>
                          <button
                            type="button"
                            className="mini-cart-remove"
                            aria-label="Remove item"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              removeItem(item.itemKey);
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                  </div>

                  <div className="mini-cart-summary">
                    <div className="mini-cart-row">
                      <span>{t('cart.sub_total', 'Sub Total:')}</span>
                      <span>{formatMoney(miniCart.subTotal)}</span>
                    </div>
                    <div className="mini-cart-row">
                      <span>{t('cart.tax', 'Tax:')}</span>
                      <span>{formatMoney(miniCart.tax)}</span>
                    </div>
                    <div className="mini-cart-row total">
                      <span>{t('cart.total', 'Total:')}</span>
                      <span>{formatMoney(miniCart.total)}</span>
                    </div>
                  </div>

                  <div className="mini-cart-actions">
                    <button
                      type="button"
                      className="mini-cart-btn secondary"
                      onClick={() => {
                        setIsCartOpen(false);
                        router.visit(getLocalizedRoute('cart.index'));
                      }}
                    >
                      {t('cart.view_cart', 'View Cart')}
                    </button>
                    <button
                      type="button"
                      className="mini-cart-btn primary"
                      onClick={() => {
                        setIsCartOpen(false);
                        router.visit(getLocalizedRoute('checkout'));
                      }}
                    >
                      {t('cart.checkout', 'Checkout')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
