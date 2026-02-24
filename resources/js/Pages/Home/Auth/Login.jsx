import React, { useEffect, useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import '../../../../css/homepage/main.scss';

const Login = ({ status }) => {
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
    email: '',
    password: '',
    remember: false,
  });

  useEffect(() => {
    return () => {
      reset('password');
    };
  }, []);

  useEffect(() => {
    if (errors.email || errors.password) {
      setGlobalError('The provided credentials are incorrect. Please try again.');
    } else {
      setGlobalError('');
    }
  }, [errors.email, errors.password]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setGlobalError('');

    post(getLocalizedRoute('customer.authenticate'), {
      onFinish: () => reset('password'),
    });
  };

  return (
    <div className="auth-page">
      <Head title="Login" />

      <div className="auth-layout">
        <div className="auth-hero">
          <div className="auth-hero-card">
            <div className="auth-hero-content">
              <div className="auth-hero-badge">ZodiMarket</div>
              <h1 className="auth-hero-title">Welcome back to ZodiMarket</h1>
              <p className="auth-hero-subtitle">
                Sign in to access secure checkout, track orders, and manage your business purchases
                from trusted suppliers.
              </p>
              <ul className="auth-hero-list">
                <li>Secure checkout with encrypted payments</li>
                <li>Real-time order tracking and updates</li>
                <li>Personalized recommendations for your business</li>
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
            <h2 className="auth-title">Sign in to your account</h2>
            <p className="auth-subtitle">
              New to ZodiMarket?{' '}
              <Link href={getLocalizedRoute('customer.register')} className="auth-link">
                Create an account
              </Link>
            </p>
          </div>

          <div className="auth-card">
            {status && <div className="auth-success">{status}</div>}

            {globalError && <div className="auth-global-error">{globalError}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label htmlFor="email" className="auth-label">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={data.email}
                  onChange={(e) => setData('email', e.target.value)}
                  autoComplete="username"
                  required
                  className="auth-input"
                />
                {errors.email && <p className="auth-error">{errors.email}</p>}
              </div>

              <div className="auth-field">
                <label htmlFor="password" className="auth-label">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={data.password}
                  onChange={(e) => setData('password', e.target.value)}
                  autoComplete="current-password"
                  required
                  className="auth-input"
                />
                {errors.password && <p className="auth-error">{errors.password}</p>}
              </div>

              <div className="auth-row-between">
                <label className="auth-checkbox-label">
                  <input
                    type="checkbox"
                    name="remember"
                    checked={data.remember}
                    onChange={(e) => setData('remember', e.target.checked)}
                    className="auth-checkbox"
                  />
                  <span>Remember me</span>
                </label>
                <Link href={route('password.request')} className="auth-link">
                  Forgot password?
                </Link>
              </div>

              <button type="submit" disabled={processing} className="auth-submit-button">
                {processing ? 'Signing in...' : 'Login'}
              </button>

              <div className="auth-footer-text">
                <span>By continuing, you agree to our </span>
                <Link href="/terms" className="auth-link">
                  Terms
                </Link>
                <span> and </span>
                <Link href="/privacy" className="auth-link">
                  Privacy Policy
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

