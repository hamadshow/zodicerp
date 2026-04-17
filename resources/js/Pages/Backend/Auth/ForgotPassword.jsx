import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { FinanzaFooter, FinanzaHeader } from '@/Pages/Home/Home';
import { useTranslation } from '@/hooks/useTranslation';

export default function ForgotPassword({ status }) {
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
  const { data, setData, post, processing, errors } = useForm({
    email: '',
  });

  const submit = (e) => {
    e.preventDefault();

    post(getLocalizedRoute('password.email'));
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
          <Head title={t('auth.forgot_password_title', 'Forgot Password')} />

          <div className="mb-4 text-sm text-gray-600">
            {t('auth.forgot_password_subtitle', 'Forgot your password? No problem. Just let us know your email address and we will email you a password reset link that will allow you to choose a new one.')}
          </div>

          {status && <div className="mb-4 text-sm font-medium text-green-600">{status}</div>}

          <form onSubmit={submit}>
            <TextInput
              id="email"
              type="email"
              name="email"
              value={data.email}
              className="mt-1 block w-full"
              isFocused={true}
              placeholder={t('auth.email', 'Email Address')}
              onChange={(e) => setData('email', e.target.value)}
            />

            <InputError message={errors.email} className="mt-2" />

            <div className="mt-4 flex items-center justify-end">
              <PrimaryButton className="ms-4" disabled={processing}>
                {t('auth.email_password_reset_link', 'Email Password Reset Link')}
              </PrimaryButton>
            </div>
          </form>
        </GuestLayout>
      </main>
      <FinanzaFooter />
    </div>
  );
}
