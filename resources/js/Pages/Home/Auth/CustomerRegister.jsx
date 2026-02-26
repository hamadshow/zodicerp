import React, { useEffect, useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import '../../../../css/homepage/main.scss';

const Register = () => {
  const { localization } = usePage().props;

  const getLocalizedRoute = (name, params = {}) => {
    return route(name, {
      country: localization?.country_code || 'sa',
      lang: localization?.current_locale || 'ar',
      ...params
    });
  };

  const [globalError, setGlobalError] = useState('');

  const { data, setData, post, processing, errors, reset } = useForm({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
    terms: false,
  });

  useEffect(() => {
    return () => {
      reset('password', 'password_confirmation');
    };
  }, []);

  useEffect(() => {
    if (
      errors.first_name ||
      errors.last_name ||
      errors.email ||
      errors.phone ||
      errors.password ||
      errors.password_confirmation
    ) {
      setGlobalError('Please correct the highlighted fields and try again.');
    } else {
      setGlobalError('');
    }
  }, [
    errors.first_name,
    errors.last_name,
    errors.email,
    errors.phone,
    errors.password,
    errors.password_confirmation,
  ]);

  const handleChange = (field) => (e) => {
    const value = field === 'terms' ? e.target.checked : e.target.value;
    setData(field, value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!data.terms) {
      setGlobalError('You must agree to the Terms & Conditions to create an account.');
      return;
    }

    if (data.password && data.password.length < 6) {
      setGlobalError('Password must be at least 6 characters.');
      return;
    }

    if (data.password !== data.password_confirmation) {
      setGlobalError('Password and confirmation do not match.');
      return;
    }

    setGlobalError('');

    post(getLocalizedRoute('customer.store'), {
      onFinish: () => reset('password', 'password_confirmation'),
    });
  };

  const isSubmitDisabled =
    processing ||
    !data.first_name ||
    !data.last_name ||
    !data.email ||
    !data.password ||
    !data.password_confirmation ||
    !data.terms;

  return (
    <div className="auth-page">
      <Head title="Create Account" />

      <div className="auth-layout">
        <div className="auth-hero">
          <div className="auth-hero-card">
            <div className="auth-hero-content">
              <div className="auth-hero-badge">New to ZodiMarket</div>
              <h1 className="auth-hero-title">Create your free business account</h1>
              <p className="auth-hero-subtitle">
                Access verified suppliers, manage your orders, and grow your ecommerce business with
                confidence.
              </p>
              <ul className="auth-hero-list">
                <li>Verified global suppliers</li>
                <li>Secure payments and checkout</li>
                <li>Order tracking and history</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="auth-panel">
          <div className="auth-brand">
            <Link href={getLocalizedRoute('home')} className="auth-brand-link">
              <div className="auth-brand-logo">
                <span>Z</span>
              </div>
              <span className="auth-brand-name">ZodiMarket</span>
            </Link>
            <h2 className="auth-title">Create your account</h2>
            <p className="auth-subtitle">
              Already have an account?{' '}
              <Link href={getLocalizedRoute('customer.login')} className="auth-link">
                Sign in
              </Link>
            </p>
          </div>

          <div className="auth-card">
            {globalError && <div className="auth-global-error">{globalError}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-form-row">
                <div className="auth-field">
                  <label htmlFor="first_name" className="auth-label">
                    First Name
                  </label>
                  <input
                    id="first_name"
                    type="text"
                    name="first_name"
                    value={data.first_name}
                    onChange={handleChange('first_name')}
                    className="auth-input"
                    autoComplete="given-name"
                    required
                  />
                  {errors.first_name && <p className="auth-error">{errors.first_name}</p>}
                </div>

                <div className="auth-field">
                  <label htmlFor="last_name" className="auth-label">
                    Last Name
                  </label>
                  <input
                    id="last_name"
                    type="text"
                    name="last_name"
                    value={data.last_name}
                    onChange={handleChange('last_name')}
                    className="auth-input"
                    autoComplete="family-name"
                    required
                  />
                  {errors.last_name && <p className="auth-error">{errors.last_name}</p>}
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="email" className="auth-label">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={data.email}
                  onChange={handleChange('email')}
                  className="auth-input"
                  autoComplete="email"
                  required
                />
                {errors.email && <p className="auth-error">{errors.email}</p>}
              </div>

              <div className="auth-field">
                <label htmlFor="phone" className="auth-label">
                  Phone number
                </label>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={data.phone}
                  onChange={handleChange('phone')}
                  className="auth-input"
                  autoComplete="tel"
                />
                {errors.phone && <p className="auth-error">{errors.phone}</p>}
              </div>

              <div className="auth-form-row">
                <div className="auth-field">
                  <label htmlFor="password" className="auth-label">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    name="password"
                    value={data.password}
                    onChange={handleChange('password')}
                    className="auth-input"
                    autoComplete="new-password"
                    required
                  />
                  {errors.password && <p className="auth-error">{errors.password}</p>}
                </div>

                <div className="auth-field">
                  <label htmlFor="password_confirmation" className="auth-label">
                    Confirm Password
                  </label>
                  <input
                    id="password_confirmation"
                    type="password"
                    name="password_confirmation"
                    value={data.password_confirmation}
                    onChange={handleChange('password_confirmation')}
                    className="auth-input"
                    autoComplete="new-password"
                    required
                  />
                  {errors.password_confirmation && (
                    <p className="auth-error">{errors.password_confirmation}</p>
                  )}
                </div>
              </div>

              <div className="auth-terms">
                <input
                  id="terms"
                  type="checkbox"
                  name="terms"
                  checked={data.terms}
                  onChange={handleChange('terms')}
                  className="auth-terms-checkbox"
                />
                <label htmlFor="terms" className="auth-terms-label">
                  I agree to the{' '}
                  <Link href="/terms" className="auth-link">
                    Terms & Conditions
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="auth-link">
                    Privacy Policy
                  </Link>
                  .
                </label>
              </div>

              <button
                type="submit"
                className="auth-submit-button"
                disabled={isSubmitDisabled}
              >
                {processing ? 'Creating account…' : 'Create Account'}
              </button>

              <p className="auth-footer-text">
                By creating an account, you agree to our Terms & Conditions and Privacy Policy.
                Already have an account?{' '}
                <Link href={getLocalizedRoute('customer.login')} className="auth-link">
                  Sign in
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
