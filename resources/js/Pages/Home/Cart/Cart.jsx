import React, { useCallback, useMemo, useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import Header from '../Components/Header';
import Footer from '../Components/Footer';
import '../../../../css/homepage/main.scss';
import { useCurrency } from '../../../Hooks/useCurrency';

const CartItem = ({ item, currency, onIncrease, onDecrease, onRemove }) => {
  const lineTotal = useMemo(() => item.price * item.quantity, [item.price, item.quantity]);

  return (
    <div className="cart-item">
      <div className="cart-item-product">
        <div className="cart-item-image">
          {item.image && (
            <img
              src={item.image}
              alt={item.name}
              loading="lazy"
            />
          )}
        </div>
        <div className="cart-item-info">
          <div className="cart-item-name">{item.name}</div>
          {item.variants && Object.keys(item.variants).length > 0 && (
            <div className="cart-item-variants" style={{ fontSize: '0.9em', color: '#666', marginTop: '4px' }}>
              {Object.entries(item.variants).map(([key, value]) => (
                <div key={key} className="variant-row">
                  <span style={{ fontWeight: '500' }}>{key}: </span>
                  <span>{typeof value === 'object' ? JSON.stringify(value) : value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="cart-item-price">
        {currency}
        {item.price.toFixed(2)}
      </div>
      <div className="cart-item-quantity">
        <button
          type="button"
          className="qty-btn"
          onClick={() => onDecrease(item.itemKey)}
          disabled={item.quantity <= 1}
        >
          -
        </button>
        <span className="qty-value">{item.quantity}</span>
        <button
          type="button"
          className="qty-btn"
          onClick={() => onIncrease(item.itemKey)}
        >
          +
        </button>
      </div>
      <div className="cart-item-subtotal">
        {currency}
        {lineTotal.toFixed(2)}
      </div>
      <div className="cart-item-remove">
        <button
          type="button"
          className="remove-btn"
          onClick={() => onRemove(item.itemKey)}
          aria-label="Remove item"
        >
          x
        </button>
      </div>
    </div>
  );
};

const Cart = () => {
  const { props } = usePage();
  const { localization } = useCurrency();

  const getLocalizedRoute = (name, params = {}) => {
    return route(name, {
      country: localization?.country_code || 'sa',
      lang: localization?.current_locale || 'ar',
      ...params
    });
  };

  const initialItems = props.cartItems || [];
  const currency = props.currency || 'EGP ';
  const categories = props.categories || [];

  const [items, setItems] = useState(initialItems);

  const syncCartCount = useCallback((response) => {
    if (typeof response?.data?.cartCount === 'number') {
      window.dispatchEvent(
        new CustomEvent('cart:updated', { detail: { count: response.data.cartCount, version: response?.data?.cartVersion } })
      );
    }
  }, []);

  const updateCartQuantity = useCallback(async (itemKey, quantity) => {
    const response = await window.axios.post(getLocalizedRoute('cart.update'), {
      item_key: itemKey,
      quantity,
    });
    syncCartCount(response);
  }, [getLocalizedRoute, syncCartCount]);

  const removeCartItem = useCallback(async (itemKey) => {
    const response = await window.axios.post(getLocalizedRoute('cart.remove'), {
      item_key: itemKey,
    });
    syncCartCount(response);
  }, [getLocalizedRoute, syncCartCount]);

  const handleIncrease = (itemKey) => {
    const currentItem = items.find((item) => item.itemKey === itemKey);
    if (!currentItem) {
      return;
    }
    const nextQuantity = currentItem.quantity + 1;
    setItems((prev) =>
      prev.map((item) =>
        item.itemKey === itemKey ? { ...item, quantity: nextQuantity } : item
      )
    );
    updateCartQuantity(itemKey, nextQuantity);
  };

  const handleDecrease = (itemKey) => {
    const currentItem = items.find((item) => item.itemKey === itemKey);
    if (!currentItem || currentItem.quantity <= 1) {
      return;
    }
    const nextQuantity = currentItem.quantity - 1;
    setItems((prev) =>
      prev.map((item) =>
        item.itemKey === itemKey
          ? { ...item, quantity: nextQuantity }
          : item
      )
    );
    updateCartQuantity(itemKey, nextQuantity);
  };

  const handleRemove = (itemKey) => {
    setItems((prev) => prev.filter((item) => item.itemKey !== itemKey));
    removeCartItem(itemKey);
  };

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );
  const shipping = props.shippingTotal ?? 0;
  const tax = props.taxTotal ?? 0;
  const total = subtotal + shipping + tax;

  const isEmpty = items.length === 0;

  return (
    <>
      <Head title="Shopping Cart" />
      <div className="app-layout homepage-layout cart-page">
        <Header categoriesData={categories} />
        <main className="cart-container">
          <div className="container">
            <h1 className="cart-title">Shopping Cart</h1>
            <div className="cart-grid">
              <section className="cart-main">
                {isEmpty ? (
                  <div className="cart-empty">
                    <div className="cart-empty-icon">
                      <i className="fas fa-shopping-cart" />
                    </div>
                    <h2 className="cart-empty-title">Your cart is empty</h2>
                    <p className="cart-empty-text">
                      Browse our products and add items to your cart to see them here.
                    </p>
                  </div>
                ) : (
                  <div className="cart-table">
                    <div className="cart-header">
                      <div className="cart-col-product">Product</div>
                      <div className="cart-col-price">Price</div>
                      <div className="cart-col-quantity">Quantity</div>
                      <div className="cart-col-subtotal">Subtotal</div>
                      <div className="cart-col-remove" />
                    </div>
                    <div className="cart-body">
                      {items.map((item) => {
                        return (
                          <CartItem
                            key={item.itemKey}
                            item={item}
                            currency={currency}
                            onIncrease={handleIncrease}
                            onDecrease={handleDecrease}
                            onRemove={handleRemove}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

              <aside className="cart-summary-wrapper">
                <div className="cart-summary-card">
                  <h2 className="cart-summary-title">Order Summary</h2>
                  <div className="cart-summary-body">
                    <div className="cart-summary-row">
                      <span>Subtotal</span>
                      <span>
                        {currency}
                        {subtotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="cart-summary-row">
                      <span>Shipping</span>
                      <span>
                        {currency}
                        {shipping.toFixed(2)}
                      </span>
                    </div>
                    <div className="cart-summary-row">
                      <span>Tax</span>
                      <span>
                        {currency}
                        {tax.toFixed(2)}
                      </span>
                    </div>
                    <div className="cart-summary-row cart-summary-total">
                      <span>Total</span>
                      <span>
                        {currency}
                        {total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-primary cart-summary-checkout"
                    disabled={isEmpty}
                    onClick={() => router.visit(getLocalizedRoute('checkout'))}
                  >
                    Proceed to Checkout
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Cart;
