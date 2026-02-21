import React from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import Header from '../Components/Header';
import Footer from '../Components/Footer';
import '../../../../css/homepage/main.scss';

const Checkout = () => {
  const { props } = usePage();
  const cartItems = props.cartItems || [];
  const currency = props.currency || '$';
  const categories = props.categories || [];

  const computedSubtotal = cartItems.reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
    0
  );

  const shipping = props.shippingTotal ?? 0;
  const tax = props.taxTotal ?? 0;
  const subtotal = props.subtotal ?? computedSubtotal;
  const total = props.total ?? subtotal + shipping + tax;

  const {
    data,
    setData,
    post,
    processing,
    errors,
    reset,
  } = useForm({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    payment_method: 'cod',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData(name, value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    post(route('checkout.store'), {
      preserveScroll: true,
      onSuccess: () => {
        reset();
      },
    });
  };

  return (
    <>
      <Head title="Checkout" />
      <div className="app-layout homepage-layout checkout-page">
        <Header categoriesData={categories} />
        <main className="checkout-container">
          <div className="container">
            <div className="checkout-grid">
              <section className="checkout-main">
                <h1 className="checkout-title">Checkout</h1>
                <form className="checkout-form" onSubmit={handleSubmit}>
                  <div className="checkout-card">
                    <h2 className="checkout-card-title">Shipping Information</h2>
                    <div className="checkout-card-body">
                      <div className="form-group">
                        <label htmlFor="full_name">Full Name</label>
                        <input
                          id="full_name"
                          type="text"
                          name="full_name"
                          value={data.full_name}
                          onChange={handleChange}
                          autoComplete="name"
                          className={errors.full_name ? 'input error' : 'input'}
                          disabled={processing}
                        />
                        {errors.full_name && (
                          <div className="input-error">{errors.full_name}</div>
                        )}
                      </div>

                      <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                          id="email"
                          type="email"
                          name="email"
                          value={data.email}
                          onChange={handleChange}
                          autoComplete="email"
                          className={errors.email ? 'input error' : 'input'}
                          disabled={processing}
                        />
                        {errors.email && (
                          <div className="input-error">{errors.email}</div>
                        )}
                      </div>

                      <div className="form-group">
                        <label htmlFor="phone">Phone</label>
                        <input
                          id="phone"
                          type="tel"
                          name="phone"
                          value={data.phone}
                          onChange={handleChange}
                          autoComplete="tel"
                          className={errors.phone ? 'input error' : 'input'}
                          disabled={processing}
                        />
                        {errors.phone && (
                          <div className="input-error">{errors.phone}</div>
                        )}
                      </div>

                      <div className="form-group">
                        <label htmlFor="address">Address</label>
                        <textarea
                          id="address"
                          name="address"
                          value={data.address}
                          onChange={handleChange}
                          rows={3}
                          className={errors.address ? 'textarea error' : 'textarea'}
                          disabled={processing}
                        />
                        {errors.address && (
                          <div className="input-error">{errors.address}</div>
                        )}
                      </div>

                      <div className="form-grid">
                        <div className="form-group">
                          <label htmlFor="city">City</label>
                          <input
                            id="city"
                            type="text"
                            name="city"
                            value={data.city}
                            onChange={handleChange}
                            className={errors.city ? 'input error' : 'input'}
                            disabled={processing}
                          />
                          {errors.city && (
                            <div className="input-error">{errors.city}</div>
                          )}
                        </div>

                        <div className="form-group">
                          <label htmlFor="country">Country</label>
                          <input
                            id="country"
                            type="text"
                            name="country"
                            value={data.country}
                            onChange={handleChange}
                            className={errors.country ? 'input error' : 'input'}
                            disabled={processing}
                          />
                          {errors.country && (
                            <div className="input-error">{errors.country}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="checkout-card">
                    <h2 className="checkout-card-title">Payment Method</h2>
                    <div className="checkout-card-body">
                      <div className="payment-options">
                        <label className="payment-option">
                          <input
                            type="radio"
                            name="payment_method"
                            value="cod"
                            checked={data.payment_method === 'cod'}
                            onChange={handleChange}
                            disabled={processing}
                          />
                          <div className="payment-option-content">
                            <span className="payment-option-title">
                              Cash on Delivery
                            </span>
                            <span className="payment-option-subtitle">
                              Pay with cash when your order is delivered
                            </span>
                          </div>
                        </label>

                        <label className="payment-option disabled">
                          <input
                            type="radio"
                            name="payment_method"
                            value="card"
                            checked={data.payment_method === 'card'}
                            onChange={handleChange}
                            disabled
                          />
                          <div className="payment-option-content">
                            <span className="payment-option-title">
                              Credit Card
                            </span>
                            <span className="payment-option-subtitle">
                              Coming soon
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="checkout-actions">
                    <button
                      type="submit"
                      className="btn-primary checkout-submit"
                      disabled={processing || cartItems.length === 0}
                    >
                      {processing ? 'Placing Order...' : 'Place Order'}
                    </button>
                    {cartItems.length === 0 && (
                      <div className="input-error">
                        Your cart is empty.
                      </div>
                    )}
                  </div>
                </form>
              </section>

              <aside className="checkout-summary-wrapper">
                <div className="checkout-card checkout-summary">
                  <h2 className="checkout-card-title">Order Summary</h2>
                  <div className="checkout-card-body">
                    <div className="summary-items">
                      {cartItems.length === 0 && (
                        <div className="summary-empty">
                          No items in your cart.
                        </div>
                      )}
                      {cartItems.map((item) => (
                        <div key={item.id} className="summary-item">
                          <div className="summary-item-image">
                            {item.image && (
                              <img
                                src={item.image}
                                alt={item.name}
                              />
                            )}
                          </div>
                          <div className="summary-item-info">
                            <div className="summary-item-name">
                              {item.name}
                            </div>
                            <div className="summary-item-meta">
                              Qty: {item.quantity || 1}
                            </div>
                          </div>
                          <div className="summary-item-price">
                            {currency}
                            {(item.price || 0).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="summary-totals">
                      <div className="summary-row">
                        <span>Subtotal</span>
                        <span>
                          {currency}
                          {subtotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="summary-row">
                        <span>Shipping</span>
                        <span>
                          {currency}
                          {shipping.toFixed(2)}
                        </span>
                      </div>
                      <div className="summary-row">
                        <span>Tax</span>
                        <span>
                          {currency}
                          {tax.toFixed(2)}
                        </span>
                      </div>
                      <div className="summary-row summary-row-total">
                        <span>Total</span>
                        <span>
                          {currency}
                          {total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
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

export default Checkout;
