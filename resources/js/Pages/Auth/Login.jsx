import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import ApplicationLogo from '@/Components/ApplicationLogo';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import '../../../css/backend/login.scss';

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
    <div className="auth-page">
      <Head title="Log in" />
      
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <Link href={getLocalizedRoute('home')}>
              <ApplicationLogo className="h-16 w-16 fill-current text-primary" />
            </Link>
          </div>
          <h2 className="auth-title">مرحباً بك مجدداً</h2>
          <p className="auth-subtitle">الرجاء تسجيل الدخول للوصول إلى لوحة التحكم</p>
        </div>

        {status && <div className="login-status">{status}</div>}

        <form onSubmit={submit} className="login-form">
          <div className="login-field">
            <InputLabel htmlFor="email" value="البريد الإلكتروني" className="login-label" />

            <div className="input-with-icon">
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
            </div>

            <InputError message={errors.email} className="login-input-error" />
          </div>

          <div className="login-field">
            <InputLabel
              htmlFor="password"
              value="كلمة المرور"
              className="login-label"
            />

            <div className="input-with-icon">
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
            </div>

            <InputError
              message={errors.password}
              className="login-input-error"
            />
          </div>

          <div className="login-options">
            <div className="login-remember">
              <label className="login-remember-label">
                <Checkbox
                  name="remember"
                  checked={data.remember}
                  onChange={(e) => setData('remember', e.target.checked)}
                />
                <span className="login-remember-text">تذكرني</span>
              </label>
            </div>

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
  );
}
