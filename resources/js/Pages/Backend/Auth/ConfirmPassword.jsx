import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { FinanzaFooter, FinanzaHeader } from '@/Pages/Home/Home';
import { useTranslation } from '@/Hooks/useTranslation';

export default function ConfirmPassword() {
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
    password: '',
  });

  const submit = (e) => {
    e.preventDefault();

    post(getLocalizedRoute('password.confirm'), {
      onFinish: () => reset('password'),
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
          <Head title={t('auth.confirm_password_title', 'Confirm Password')} />

          <div className="mb-4 text-sm text-gray-600">
            {t('auth.confirm_password_subtitle', 'This is a secure area of the application. Please confirm your password before continuing.')}
          </div>

          <form onSubmit={submit}>
            <div className="mt-4">
              <InputLabel htmlFor="password" value={t('auth.password_label', 'Password')} />

              <TextInput
                id="password"
                type="password"
                name="password"
                value={data.password}
                className="mt-1 block w-full"
                isFocused={true}
                onChange={(e) => setData('password', e.target.value)}
              />

              <InputError message={errors.password} className="mt-2" />
            </div>

            <div className="mt-4 flex items-center justify-end">
              <PrimaryButton className="ms-4" disabled={processing}>
                {t('auth.confirm', 'Confirm')}
              </PrimaryButton>
            </div>
          </form>
        </GuestLayout>
      </main>
      <FinanzaFooter />
    </div>
  );
}
