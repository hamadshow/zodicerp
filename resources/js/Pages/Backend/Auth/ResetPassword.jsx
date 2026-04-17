import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { FinanzaFooter, FinanzaHeader } from '@/Pages/Home/Home';
import { useTranslation } from '@/hooks/useTranslation';

export default function ResetPassword({ token, email }) {
  const { localization } = usePage().props;
  const { t } = useTranslation();
  const lang = localization?.current_locale || 'ar';
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const getLocalizedRoute = (name, params = {}) => {
    return route(name, {
      country: localization?.country_code || 'sa',
      lang: localization?.current_locale || 'ar',
      ...params
    });
  };

  const homeHref = getLocalizedRoute('home');
  const { data, setData, post, processing, errors, reset } = useForm({
    token: token,
    email: email,
    password: '',
    password_confirmation: '',
  });

  const submit = (e) => {
    e.preventDefault();

    post(getLocalizedRoute('password.store'), {
      onFinish: () => reset('password', 'password_confirmation'),
    });
  };

  return (
    <div id="top" className="finanza-landing" dir={dir}>
      <FinanzaHeader 
        variant="minimal" 
        homeHref={homeHref} 
        loginHref={getLocalizedRoute('login')} 
        registerHref={getLocalizedRoute('register')} 
      />
      <main id="main-content">
        <GuestLayout>
          <Head title={t('auth.reset_password_title', 'Reset Password')} />

          <form onSubmit={submit}>
            <div>
              <InputLabel htmlFor="email" value={t('auth.email', 'Email Address')} />

              <TextInput
                id="email"
                type="email"
                name="email"
                value={data.email}
                className="mt-1 block w-full"
                autoComplete="username"
                onChange={(e) => setData('email', e.target.value)}
              />

              <InputError message={errors.email} className="mt-2" />
            </div>

            <div className="mt-4">
              <InputLabel htmlFor="password" value={t('auth.password_label', 'Password')} />

              <TextInput
                id="password"
                type="password"
                name="password"
                value={data.password}
                className="mt-1 block w-full"
                autoComplete="new-password"
                isFocused={true}
                onChange={(e) => setData('password', e.target.value)}
              />

              <InputError message={errors.password} className="mt-2" />
            </div>

            <div className="mt-4">
              <InputLabel htmlFor="password_confirmation" value={t('auth.confirm_password', 'Confirm Password')} />

              <TextInput
                type="password"
                id="password_confirmation"
                name="password_confirmation"
                value={data.password_confirmation}
                className="mt-1 block w-full"
                autoComplete="new-password"
                onChange={(e) => setData('password_confirmation', e.target.value)}
              />

              <InputError message={errors.password_confirmation} className="mt-2" />
            </div>

            <div className="mt-4 flex items-center justify-end">
              <PrimaryButton className="ms-4" disabled={processing}>
                {t('auth.reset_password', 'Reset Password')}
              </PrimaryButton>
            </div>
          </form>
        </GuestLayout>
      </main>
      <FinanzaFooter />
    </div>
  );
}
