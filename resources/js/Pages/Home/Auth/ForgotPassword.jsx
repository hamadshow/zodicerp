import React, { useEffect } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import '../../../../css/homepage/main.scss';

const ForgotPassword = ({ status }) => {
  const { localization } = usePage().props;

  const getLocalizedRoute = (name, params = {}) => {
    return route(name, {
      country: localization?.country_code || 'sa',
      lang: localization?.current_locale || 'ar',
      ...params
    });
  };

  const { data, setData, post, processing, errors, reset } = useForm({
    email: '',
  });

  useEffect(() => {
    return () => {
      reset('email');
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    post(getLocalizedRoute('password.email'), {
      onFinish: () => {},
    });
  };

  const hasValidationError = !!errors.email;

  return (
    <div className="auth-page">
      <Head title="Forgot Password" />

      <div className="auth-layout">
        <div className="auth-hero">
          <div className="auth-hero-card">
            <div className="auth-hero-content">
              <div className="auth-hero-badge">Account security</div>
              <h1 className="auth-hero-title">Reset your ZodiMarket password</h1>
              <p className="auth-hero-subtitle">
                Enter your email address and we&apos;ll send you a secure link to reset your
                password and regain access to your account.
              </p>
              <ul className="auth-hero-list">
                <li>We never share your email with third parties</li>
                <li>Reset link expires for your security</li>
                <li>Contact support if you no longer have access</li>
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
            <h2 className="auth-title">Forgot your password?</h2>
            <p className="auth-subtitle">
              No problem. Just let us know your email address and we will email you a password reset
              link.
            </p>
          </div>

          <div className="auth-card">
            {status && <div className="auth-success">{status}</div>}

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
                  className="auth-input"
                  autoComplete="email"
                  required
                />
                {errors.email && <p className="auth-error">{errors.email}</p>}
              </div>

              <button
                type="submit"
                className="auth-submit-button"
                disabled={processing || !data.email || hasValidationError}
              >
                {processing ? 'Sending reset link…' : 'Send Reset Link'}
              </button>

              <div className="auth-footer-text">
                <span>Remember your password? </span>
                <Link href={getLocalizedRoute('login')} className="auth-link">
                  Back to Login
                </Link>
              </div>

              <div className="auth-footer-text">
                <span>New to ZodiMarket? </span>
                <Link href={getLocalizedRoute('register')} className="auth-link">
                  Create Account
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
