import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { FinanzaFooter, FinanzaHeader } from '@/Pages/Home/Home';

export default function ConfirmPassword() {
  const { localization } = usePage().props;
  const country = localization?.country_code || localization?.current_country || 'sa';
  const lang = localization?.current_locale || 'ar';
  const homeHref = `/${country}/${lang}`;
  const { data, setData, post, processing, errors, reset } = useForm({
    password: '',
  });

  const submit = (e) => {
    e.preventDefault();

    post(route('password.confirm'), {
      onFinish: () => reset('password'),
    });
  };

  return (
    <div id="top" className="finanza-landing">
      <FinanzaHeader variant="minimal" homeHref={homeHref} loginHref={`${homeHref}/login`} registerHref={`${homeHref}/register`} />
      <main id="main-content">
        <GuestLayout>
          <Head title="Confirm Password" />

          <div className="mb-4 text-sm text-gray-600">
            This is a secure area of the application. Please confirm your password before continuing.
          </div>

          <form onSubmit={submit}>
            <div className="mt-4">
              <InputLabel htmlFor="password" value="Password" />

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
                Confirm
              </PrimaryButton>
            </div>
          </form>
        </GuestLayout>
      </main>
      <FinanzaFooter />
    </div>
  );
}
