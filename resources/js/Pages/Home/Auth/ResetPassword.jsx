import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import '../../../../css/homepage/main.scss';

const ResetPassword = ({ email, token }) => {
  const { data, setData, post, processing, errors, reset } = useForm({
    token: token || '',
    email: email || '',
    password: '',
    password_confirmation: '',
  });

  const handleChange = (field) => (e) => {
    setData(field, e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    post(route('password.update'), {
      onSuccess: () => {
        reset('password', 'password_confirmation');
      },
    });
  };

  const hasClientValidationError =
    (data.password && data.password.length < 6) ||
    (data.password && data.password_confirmation && data.password !== data.password_confirmation);

  return (
    <div className="auth-page">
      <Head title="Reset Password" />

      <div className="auth-layout">
        <div className="auth-hero">
          <div className="auth-hero-card">
            <div className="auth-hero-content">
              <div className="auth-hero-badge">Secure reset</div>
              <h1 className="auth-hero-title">Set a new password</h1>
              <p className="auth-hero-subtitle">
                Choose a strong password to protect your ZodiMarket account and keep your orders and
                data safe.
              </p>
              <ul className="auth-hero-list">
                <li>Use at least 6 characters</li>
                <li>Avoid using old passwords</li>
                <li>Never share your password with others</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="auth-panel">
          <div className="auth-brand">
            <Link href="/" className="auth-brand-link">
              <div className="auth-brand-logo">
                <span>Z</span>
              </div>
              <span className="auth-brand-name">ZodiMarket</span>
            </Link>
            <h2 className="auth-title">Reset your password</h2>
            <p className="auth-subtitle">
              Enter your email and new password. After resetting, you will be able to log in with
              your new credentials.
            </p>
          </div>

          <div className="auth-card">
            <form onSubmit={handleSubmit} className="auth-form">
              <input type="hidden" name="token" value={data.token} />

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
                <label htmlFor="password" className="auth-label">
                  New password
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
                {data.password && data.password.length < 6 && (
                  <p className="auth-error">Password must be at least 6 characters.</p>
                )}
                {errors.password && <p className="auth-error">{errors.password}</p>}
              </div>

              <div className="auth-field">
                <label htmlFor="password_confirmation" className="auth-label">
                  Confirm new password
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
                {data.password &&
                  data.password_confirmation &&
                  data.password !== data.password_confirmation && (
                    <p className="auth-error">Passwords do not match.</p>
                  )}
                {errors.password_confirmation && (
                  <p className="auth-error">{errors.password_confirmation}</p>
                )}
              </div>

              <button
                type="submit"
                className="auth-submit-button"
                disabled={
                  processing ||
                  !data.email ||
                  !data.password ||
                  !data.password_confirmation ||
                  hasClientValidationError
                }
              >
                {processing ? 'Resetting password…' : 'Reset Password'}
              </button>

              <div className="auth-footer-text">
                <span>Remember your password? </span>
                <Link href={route('login')} className="auth-link">
                  Back to Login
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
