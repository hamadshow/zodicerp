import Checkbox from '@/Components/Checkbox';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import React, { useMemo, useState } from 'react';
import { FinanzaFooter } from '@/Pages/Home/components/Footer';
import { FinanzaHeader } from '@/Pages/Home/components/Header';
import { useTranslation } from '@/Hooks/useTranslation';

export default function Login({ status, canResetPassword }) {
  const { localization } = usePage().props;
  const { t } = useTranslation();
  const country = localization?.country_code || 'sa';
  const lang = localization?.current_locale || 'en';
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

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

  const [showPassword, setShowPassword] = useState(false);
  const languageValue = useMemo(() => (lang === 'ar' ? 'ar' : 'en'), [lang]);

  const submit = (e) => {
    e.preventDefault();

    post(getLocalizedRoute('auth.login.store'), {
      onFinish: () => reset('password'),
    });
  };

  return (
    <div id="top" className="finanza-landing" dir={dir}>
      <Head title={t('auth.login', 'Log in')} />
      <div className="loginShell">
        <FinanzaHeader
          variant="minimal"
          homeHref={getLocalizedRoute('home')}
          loginHref={getLocalizedRoute('login')}
          registerHref={getLocalizedRoute('register')}
          dashboardHref={getLocalizedRoute('dashboard')}
          logoutHref={getLocalizedRoute('logout')}
        />

        <main id="main-content" className="auth-page loginPage">
          <div className="loginPage-grid">
            <div 
              className="loginPage-visual" 
              aria-hidden="true" 
              style={{ backgroundImage: `url('/storage/images/login-${lang === 'ar' ? 'ar' : 'en'}.jpg')` }}
            />
          
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

                {status && <div className="login-status mb-4">{status}</div>}

                <form onSubmit={submit} className="loginForm" noValidate method="post">
                  <div className="loginField">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      className={`loginInput ${errors.email ? 'is-invalid' : ''}`}
                      placeholder={t('auth.email', 'Email Address*')}
                      value={data.email}
                      onChange={(e) => setData('email', e.target.value)}
                      required
                      autoComplete="email"
                    />
                    {errors.email ? <div className="loginError">{errors.email}</div> : null}
                  </div>

                  <div className="loginField loginField--password">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      className={`loginInput ${errors.password ? 'is-invalid' : ''}`}
                      placeholder={t('auth.password_label', 'Password *')}
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
                      <span className="material-icons-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                    {errors.password ? <div className="loginError">{errors.password}</div> : null}
                  </div>

                  <div className="loginOptions">
                    <label className="loginRemember">
                      <Checkbox
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
                    {t('auth.login', 'Login')}
                  </button>

                  <div className="loginBottom">
                    <span>{t('auth.no_account', "Don't have an account?")}</span>
                    <Link className="loginBottomLink" href={getLocalizedRoute('register')}>
                      {t('auth.register_here', 'Register Here')}
                    </Link>
                  </div>
                </form>
              </div>
            </section>
          </div>
        </main>

        <FinanzaFooter />
      </div>
    </div>
  );
}
