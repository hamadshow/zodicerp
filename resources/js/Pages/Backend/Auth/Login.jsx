import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import ApplicationLogo from '@/Components/ApplicationLogo';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FinanzaFooter, FinanzaHeader } from '@/Pages/Home/Home';

export default function Login({ status, canResetPassword }) {
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
    password: '',
    remember: false,
  });

  const submit = (e) => {
    e.preventDefault();

    post(getLocalizedRoute('login'), {
      onFinish: () => reset('password'),
    });
  };

  return (
    <div id="top" className="finanza-landing">
      <FinanzaHeader
        variant="minimal"
        homeHref={getLocalizedRoute('home')}
        loginHref={getLocalizedRoute('login')}
        registerHref={getLocalizedRoute('register')}
      />
      <main id="main-content" className="auth-page">
        <Head title="Log in" />
        <div className="auth-card">
          <div className="auth-card-header">
            <Link href={getLocalizedRoute('home')} className="auth-logo">
              <ApplicationLogo className="h-16 w-16 fill-current text-primary" />
            </Link>
            <div className="auth-heading">
              <h2 className="auth-title">مرحباً بك مجدداً</h2>
              <p className="auth-subtitle">الرجاء تسجيل الدخول للوصول إلى لوحة التحكم</p>
            </div>
          </div>

          <div className="auth-card-content">
            {status && <div className="login-status">{status}</div>}

            <form onSubmit={submit} className="login-form">
              <div className="login-field">
                <InputLabel htmlFor="email" value="البريد الإلكتروني" className="login-label" />
                <TextInput
                  id="email"
                  type="email"
                  name="email"
                  value={data.email}
                  className="login-input"
                  autoComplete="username"
                  isFocused={true}
                  placeholder="example@domain.com"
                  onChange={(e) => setData('email', e.target.value)}
                />
                <InputError message={errors.email} className="login-input-error" />
              </div>

              <div className="login-field">
                <InputLabel htmlFor="password" value="كلمة المرور" className="login-label" />
                <TextInput
                  id="password"
                  type="password"
                  name="password"
                  value={data.password}
                  className="login-input"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  onChange={(e) => setData('password', e.target.value)}
                />
                <InputError message={errors.password} className="login-input-error" />
              </div>

              <div className="login-options">
                <label className="login-remember-label">
                  <Checkbox name="remember" checked={data.remember} onChange={(e) => setData('remember', e.target.checked)} />
                  <span className="login-remember-text">تذكرني</span>
                </label>

                {canResetPassword && (
                  <Link href={getLocalizedRoute('password.request')} className="login-forgot">
                    نسيت كلمة المرور؟
                  </Link>
                )}
              </div>

              <div className="login-actions">
                <PrimaryButton className="login-submit-btn" disabled={processing}>
                  {processing ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      </main>
      <FinanzaFooter />
    </div>
  );
}
