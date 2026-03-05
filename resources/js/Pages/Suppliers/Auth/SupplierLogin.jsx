import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import ApplicationLogo from '@/Components/ApplicationLogo';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import '../../../../css/suppliers/main.scss';

export default function SupplierLogin({ status }) {
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

    post(getLocalizedRoute('supplier.authenticate'), {
      onFinish: () => reset('password'),
    });
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Head title="Supplier Log in" />

        <div className="auth-logo">
          <Link href={getLocalizedRoute('home')}>
            <ApplicationLogo className="h-12 w-12 fill-current text-gray-500" />
          </Link>
          <h2 className="mt-4 text-center text-xl font-bold text-gray-700">Supplier Login</h2>
        </div>

        {status && <div className="login-status">{status}</div>}

        <form onSubmit={submit} className="login-form">
          <div className="login-field">
            <InputLabel htmlFor="email" value="Email" className="login-label" />

            <TextInput
              id="email"
              type="email"
              name="email"
              value={data.email}
              className="login-input"
              autoComplete="username"
              isFocused={true}
              onChange={(e) => setData('email', e.target.value)}
            />

            <InputError message={errors.email} className="login-input-error" />
          </div>

          <div className="login-field">
            <InputLabel
              htmlFor="password"
              value="Password"
              className="login-label"
            />

            <TextInput
              id="password"
              type="password"
              name="password"
              value={data.password}
              className="login-input"
              autoComplete="current-password"
              onChange={(e) => setData('password', e.target.value)}
            />

            <InputError
              message={errors.password}
              className="login-input-error"
            />
          </div>

          <div className="login-remember">
            <label className="login-remember-label">
              <Checkbox
                name="remember"
                checked={data.remember}
                onChange={(e) => setData('remember', e.target.checked)}
              />
              <span className="login-remember-text">Remember me</span>
            </label>
          </div>

          <div className="login-actions">
            <Link
                href={getLocalizedRoute('supplier.register')}
                className="rounded-md text-sm text-gray-600 underline hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
                Register as Supplier
            </Link>

            <PrimaryButton className="login-submit ml-4" disabled={processing}>
              Log in
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
