import { Head, Link, useForm, usePage } from '@inertiajs/react';
import React, { useEffect, useMemo, useState } from 'react';
import { FinanzaFooter, FinanzaHeader } from '@/Pages/Home/Home';

export default function Register() {
  const { localization } = usePage().props;
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

  const { data, setData, post, processing, errors, reset, transform } = useForm({
    name: '',
    username: '',
    email: '',
    phone_country_code: '+20',
    phone_number: '',
    password: '',
    password_confirmation: '',
    terms: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);

  const languageValue = useMemo(() => (lang === 'ar' ? 'ar' : 'en'), [lang]);

  useEffect(() => {
    transform((formData) => {
      const number = String(formData.phone_number || '').trim();
      const code = String(formData.phone_country_code || '').trim();
      const phone = number ? `${code}${number}`.replace(/\s+/g, '') : '';
      return {
        ...formData,
        phone,
      };
    });
  }, [transform]);

  const submit = (e) => {
    e.preventDefault();

    post(getLocalizedRoute('register'), {
      onFinish: () => reset('password', 'password_confirmation'),
    });
  };

  return (
    <div id="top" className="finanza-landing" dir={dir}>
      <Head title="Register" />
      <div className="registerShell">
        <FinanzaHeader
          variant="minimal"
          homeHref={getLocalizedRoute('home')}
          loginHref={getLocalizedRoute('login')}
          registerHref={getLocalizedRoute('register')}
          dashboardHref={getLocalizedRoute('dashboard')}
          logoutHref={getLocalizedRoute('logout')}
        />

        <main id="main-content" className="auth-page registerPage">
          <div className="registerPage-grid">
            <div className="registerPage-visual" aria-hidden="true" />

            <section className="registerPage-panel" aria-label="Register">
              <div className="registerPage-lang">
                <select
                  className="registerLangSelect"
                  value={languageValue}
                  onChange={(e) => {
                    const next = e.target.value;
                    window.location.href = `/${country}/${next}/register`;
                  }}
                  aria-label="Language"
                >
                  <option value="en">English</option>
                  <option value="ar">العربية</option>
                </select>
                <span className="material-icons-outlined registerLangIcon" aria-hidden="true">
                  expand_more
                </span>
              </div>

              <div className="registerCard">
                <div className="registerCard-title">Get Started Now!</div>
                <div className="registerCard-subtitle">Please enter the following information</div>

                <form onSubmit={submit} className="registerForm" noValidate>
              <div className="registerField">
                <input
                  type="text"
                  className={`registerInput ${errors.name ? 'is-invalid' : ''}`}
                  placeholder="Full Name*"
                  value={data.name}
                  onChange={(e) => setData('name', e.target.value)}
                  required
                  autoComplete="name"
                />
                {errors.name ? <div className="registerError">{errors.name}</div> : null}
              </div>

              <div className="registerField">
                <input
                  type="text"
                  className={`registerInput ${errors.username ? 'is-invalid' : ''}`}
                  placeholder="Username*"
                  value={data.username}
                  onChange={(e) => setData('username', e.target.value)}
                  required
                  autoComplete="username"
                />
                {errors.username ? <div className="registerError">{errors.username}</div> : null}
              </div>

              <div className="registerField">
                <input
                  type="email"
                  className={`registerInput ${errors.email ? 'is-invalid' : ''}`}
                  placeholder="Email Address*"
                  value={data.email}
                  onChange={(e) => setData('email', e.target.value)}
                  required
                  autoComplete="email"
                />
                {errors.email ? <div className="registerError">{errors.email}</div> : null}
              </div>

              <div className="registerField registerField--phone">
                <select
                  className="registerPhoneCode"
                  value={data.phone_country_code}
                  onChange={(e) => setData('phone_country_code', e.target.value)}
                  aria-label="Country code"
                >
                  <option value="+20">🇪🇬 +20</option>
                  <option value="+966">🇸🇦 +966</option>
                  <option value="+971">🇦🇪 +971</option>
                  <option value="+965">🇰🇼 +965</option>
                  <option value="+974">🇶🇦 +974</option>
                  <option value="+973">🇧🇭 +973</option>
                  <option value="+968">🇴🇲 +968</option>
                </select>
                <input
                  type="tel"
                  className={`registerInput ${errors.phone ? 'is-invalid' : ''}`}
                  placeholder="Phone Number*"
                  value={data.phone_number}
                  onChange={(e) => setData('phone_number', e.target.value)}
                  required
                  autoComplete="tel"
                />
                {errors.phone ? <div className="registerError">{errors.phone}</div> : null}
              </div>

              <div className="registerField registerField--password">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`registerInput ${errors.password ? 'is-invalid' : ''}`}
                  placeholder="Password *"
                  value={data.password}
                  onChange={(e) => setData('password', e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="registerPasswordToggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-icons-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
                {errors.password ? <div className="registerError">{errors.password}</div> : null}
              </div>

              <div className="registerField registerField--password">
                <input
                  type={showPasswordConfirmation ? 'text' : 'password'}
                  className={`registerInput ${errors.password_confirmation ? 'is-invalid' : ''}`}
                  placeholder="Confirm Password*"
                  value={data.password_confirmation}
                  onChange={(e) => setData('password_confirmation', e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="registerPasswordToggle"
                  onClick={() => setShowPasswordConfirmation((v) => !v)}
                  aria-label={showPasswordConfirmation ? 'Hide password confirmation' : 'Show password confirmation'}
                >
                  <span className="material-icons-outlined">{showPasswordConfirmation ? 'visibility_off' : 'visibility'}</span>
                </button>
                {errors.password_confirmation ? (
                  <div className="registerError">{errors.password_confirmation}</div>
                ) : null}
              </div>

              <label className="registerTerms">
                <input
                  type="checkbox"
                  checked={Boolean(data.terms)}
                  onChange={(e) => setData('terms', e.target.checked)}
                  required
                />
                <span>
                  By continuing, I agree to Mubasher.info's{' '}
                  <a className="registerTermsLink" href="#" onClick={(e) => e.preventDefault()}>
                    Terms And Conditions
                  </a>
                </span>
              </label>

              <button className="registerSubmit" type="submit" disabled={processing}>
                Verify and Continue
              </button>

              <div className="registerBottom">
                <span>Already registered?</span>
                <Link className="registerBottomLink" href={getLocalizedRoute('auth.login')}>
                  Login
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
