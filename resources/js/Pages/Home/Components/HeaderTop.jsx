import React, { useEffect, useRef, useState } from 'react';
import { Link } from '@inertiajs/react';
import '../../../../css/homepage/header.css';
import SearchBar from './SearchBar';

export default function HeaderTop({
  categoriesData = [],
  query,
  setQuery,
  onSearch,
  cartCount = 0,
  cartVersion = 0,
}) {
  const [isCartOpen, setIsCartOpen] = useState(false);
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
      const response = await window.axios.get('/cart/mini');
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
      const response = await window.axios.post('/cart/remove', { item_key: itemKey });
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

  const formatMoney = (value) => {
    const numeric = typeof value === 'number' ? value : Number(value);
    const safe = Number.isFinite(numeric) ? numeric : 0;
    return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(safe);
  };

  const totalQuantity = miniCart.items.reduce(
    (sum, item) => sum + (item.quantity || 0),
    0
  );

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
        <div className="language-selector">
          <i className="fas fa-globe"></i>
          <span>English</span>
          <i className="fas fa-chevron-down"></i>
        </div>
        <div className="currency-selector">
          <i className="fas fa-dollar-sign"></i>
          <span>USD</span>
          <i className="fas fa-chevron-down"></i>
        </div>
        <div className="user-menu">
          <div className="menu-item help-center">
            <i className="fas fa-question-circle"></i>
            <span>Help Center</span>
          </div>
          <button className="menu-item sign-in">
            <i className="fas fa-user"></i>
            <span>Sign In</span>
          </button>
          <div
            className="menu-item cart-badge"
            onMouseEnter={onCartEnter}
            onMouseLeave={onCartLeave}
          >
            <div className="icon-wrapper">
              <i className="fas fa-shopping-cart"></i>
              <div className="badge">{cartCount}</div>
            </div>
            <span>{totalQuantity > 0 ? `Cart (${totalQuantity})` : 'Cart'}</span>

            {isCartOpen && (
              <div
                className="mini-cart-dropdown"
                onMouseEnter={onCartEnter}
                onMouseLeave={onCartLeave}
              >
                <div className="mini-cart-panel">
                  <div className="mini-cart-items">
                    {isCartLoading && <div className="mini-cart-loading">Loading...</div>}
                    {!isCartLoading && miniCartError && (
                      <div className="mini-cart-error">{miniCartError}</div>
                    )}
                    {!isCartLoading && !miniCartError && miniCart.items.length === 0 && (
                      <div className="mini-cart-empty">Your cart is empty.</div>
                    )}
                    {!isCartLoading &&
                      !miniCartError &&
                      miniCart.items.map((item) => (
                        <div key={item.itemKey} className="mini-cart-item">
                          <img
                            className="mini-cart-thumb"
                            src={item.image}
                            alt={item.name}
                            loading="lazy"
                          />
                          <div className="mini-cart-item-info">
                            <a className="mini-cart-item-title" href={`/product/${item.productId}`}>
                              {item.name}
                            </a>
                            <div className="mini-cart-item-meta">
                              {item.quantity} x {formatMoney(item.unitPrice)}
                            </div>
                            <div className="mini-cart-item-supplier">Sold by: {item.supplier}</div>
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
                      <span>Sub Total:</span>
                      <span>{formatMoney(miniCart.subTotal)}</span>
                    </div>
                    <div className="mini-cart-row">
                      <span>Tax:</span>
                      <span>{formatMoney(miniCart.tax)}</span>
                    </div>
                    <div className="mini-cart-row total">
                      <span>Total:</span>
                      <span>{formatMoney(miniCart.total)}</span>
                    </div>
                  </div>

                  <div className="mini-cart-actions">
                    <button type="button" className="mini-cart-btn secondary">
                      View Cart
                    </button>
                    <button type="button" className="mini-cart-btn primary">
                      Checkout
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
