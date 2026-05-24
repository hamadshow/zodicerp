import { Head, Link, useForm, usePage } from '@inertiajs/react';
import React, { useMemo, useState } from 'react';
import { FinanzaFooter } from '@/Pages/Home/components/Footer';
import { FinanzaHeader } from '@/Pages/Home/components/Header';
import { useTranslation } from '@/hooks/useTranslation';
import '../../../../css/homepage/rtl.scss';

export default function Login({ status, canResetPassword }) {
  const { localization } = usePage().props;
  const { t } = useTranslation();
  const country = localization?.country_code || 'sa';
  const lang = localization?.current_locale || 'en';
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const [showPassword, setShowPassword] = useState(false);

  const getLocalizedRoute = (name, params = {}) => {
    return route(name, {
      country: localization?.country_code || 'sa',
      lang: localization?.current_locale || 'ar',
      ...params
    });
  };

  const { data, setData, post, processing, errors, reset } = useForm({
    email: '',
    password: '',
    remember: false,
  });

  const languageValue = useMemo(() => (lang === 'ar' ? 'ar' : 'en'), [lang]);

  const submit = (e) => {
    e.preventDefault();
    post(getLocalizedRoute('auth.login.store'), {
      onFinish: () => reset('password'),
    });
  };

  return (
    <div id="top" className="finanza-landing" dir={dir}>
      <Head title={`${t('auth.login', 'Log in')} - ZodiERP`} />
      
      <div className="loginShell">
        <FinanzaHeader
          variant="minimal"
          homeHref={getLocalizedRoute('home')}
          loginHref={getLocalizedRoute('login')}
          registerHref={getLocalizedRoute('register')}
          dashboardHref={getLocalizedRoute('dashboard')}
          logoutHref={getLocalizedRoute('logout')}
          t={t}
        />

        <main id="main-content" className="auth-page loginPage">
          <div className="loginPage-grid">
            <div className="loginPage-visual" aria-hidden="true">
              <div className="visual-content" style={{ padding: '40px', color: '#fff', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
                <div className="brand-logo" style={{ fontSize: '48px', fontWeight: '800', marginBottom: '20px' }}>ZodiERP</div>
                <p className="brand-description" style={{ fontSize: '18px', lineHeight: '1.6', opacity: '0.9', maxWidth: '400px', margin: '0 auto' }}>
                  {t('auth.visual_description', 'The most powerful ERP system for managing your business with ease and professionalism.')}
                </p>
              </div>
            </div>

            <section className="loginPage-panel" aria-label="Login">
              <div className="loginPage-lang">
                <select
                  className="loginLangSelect"
                  value={languageValue}
                  onChange={(e) => {
                    const next = e.target.value;
                    window.location.href = `/${country}/${next}/login`;
                  }}
                  aria-label="Language"
                >
                  <option value="en">English</option>
                  <option value="ar">العربية</option>
                </select>
                <span className="material-icons-outlined loginLangIcon" aria-hidden="true">
                  expand_more
                </span>
              </div>

              <div className="loginCard">
                <div className="loginCard-title">{t('auth.login_title', 'Welcome Back!')}</div>
                <div className="loginCard-subtitle">{t('auth.login_subtitle', 'Please enter your details to login.')}</div>

                {status && (
                  <div className="login-status">
                    <span className="material-icons-outlined">check_circle</span>
                    {status}
                  </div>
                )}

                <form onSubmit={submit} className="loginForm" noValidate>
                  <div className="loginField">
                    <input
                      type="email"
                      className={`loginInput ${errors.email ? 'is-invalid' : ''}`}
                      placeholder={t('auth.email_placeholder', 'Email Address*')}
                      value={data.email}
                      onChange={(e) => setData('email', e.target.value)}
                      required
                      autoComplete="email"
                      autoFocus
                    />
                    {errors.email && <div className="loginError">{errors.email}</div>}
                  </div>

                  <div className="loginField loginField--password">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className={`loginInput ${errors.password ? 'is-invalid' : ''}`}
                      placeholder={t('auth.password_label', 'Password*')}
                      value={data.password}
                      onChange={(e) => setData('password', e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="loginPasswordToggle"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? t('auth.hide_password', 'Hide password') : t('auth.show_password', 'Show password')}
                    >
                      <span className="material-icons-outlined">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                    {errors.password && <div className="loginError">{errors.password}</div>}
                  </div>

                  <div className="loginOptions">
                    <label className="loginRemember">
                      <input
                        type="checkbox"
                        name="remember"
                        checked={data.remember}
                        onChange={(e) => setData('remember', e.target.checked)}
                      />
                      <span>{t('auth.remember_me', 'Remember Me')}</span>
                    </label>

                    {canResetPassword && (
                      <Link href={getLocalizedRoute('password.request')} className="loginForgot">
                        {t('auth.forgot_password', 'Forgot Password?')}
                      </Link>
                    )}
                  </div>

                  <button className="loginSubmit" type="submit" disabled={processing}>
                    {processing ? (
                      <div className="loader"></div>
                    ) : (
                      <span>{t('auth.login_btn', 'Login')}</span>
                    )}
                  </button>

                  <div className="loginBottom">
                    <span>{t('auth.no_account', "Don't have an account?")}</span>
                    <Link className="loginBottomLink" href={getLocalizedRoute('register')}>
                      {t('auth.register_here', 'Create an account')}
                    </Link>
                  </div>
                </form>
              </div>
            </section>
          </div>
        </main>

        <FinanzaFooter t={t} />
      </div>
    </div>
  );
}
