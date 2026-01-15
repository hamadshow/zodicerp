import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import ApplicationLogo from '@/Components/ApplicationLogo';
import { Head, Link, useForm } from '@inertiajs/react';
import '../../../css/backend/login.css';

export default function Login({ status, canResetPassword }) {
  const { data, setData, post, processing, errors, reset } = useForm({
    email: '',
    password: '',
    remember: false,
  });

  const submit = (e) => {
    e.preventDefault();

    post(route('login'), {
      onFinish: () => reset('password'),
    });
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Head title="Log in" />

        <div className="auth-logo">
          <Link href="/">
            <ApplicationLogo className="h-12 w-12 fill-current text-gray-500" />
          </Link>
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
            {canResetPassword && (
              <Link href={route('password.request')} className="login-forgot">
                Forgot your password?
              </Link>
            )}

            <PrimaryButton className="login-submit" disabled={processing}>
              Log in
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
