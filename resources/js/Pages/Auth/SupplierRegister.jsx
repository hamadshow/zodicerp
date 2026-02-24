import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function SupplierRegister() {
  const { data, setData, post, processing, errors, reset } = useForm({
    supplier_code: '',
    name_ar: '',
    name_en: '',
    email: '',
    password: '',
    password_confirmation: '',
  });

  const submit = (e) => {
    e.preventDefault();

    post(route('supplier.store'), {
      onFinish: () => reset('password', 'password_confirmation'),
    });
  };

  return (
    <GuestLayout>
      <Head title="Supplier Register" />

      <h2 className="mb-4 text-center text-xl font-bold text-gray-700">Supplier Registration</h2>

      <form onSubmit={submit}>
        <div>
            <InputLabel htmlFor="supplier_code" value="Supplier Code" />
            <TextInput
                id="supplier_code"
                name="supplier_code"
                value={data.supplier_code}
                className="mt-1 block w-full"
                isFocused={true}
                onChange={(e) => setData('supplier_code', e.target.value)}
                required
            />
            <InputError message={errors.supplier_code} className="mt-2" />
        </div>

        <div className="mt-4">
          <InputLabel htmlFor="name_ar" value="Name (Arabic)" />
          <TextInput
            id="name_ar"
            name="name_ar"
            value={data.name_ar}
            className="mt-1 block w-full"
            autoComplete="name"
            onChange={(e) => setData('name_ar', e.target.value)}
            required
          />
          <InputError message={errors.name_ar} className="mt-2" />
        </div>

        <div className="mt-4">
          <InputLabel htmlFor="name_en" value="Name (English) - Optional" />
          <TextInput
            id="name_en"
            name="name_en"
            value={data.name_en}
            className="mt-1 block w-full"
            autoComplete="name"
            onChange={(e) => setData('name_en', e.target.value)}
          />
          <InputError message={errors.name_en} className="mt-2" />
        </div>

        <div className="mt-4">
          <InputLabel htmlFor="email" value="Email" />
          <TextInput
            id="email"
            type="email"
            name="email"
            value={data.email}
            className="mt-1 block w-full"
            autoComplete="username"
            onChange={(e) => setData('email', e.target.value)}
            required
          />
          <InputError message={errors.email} className="mt-2" />
        </div>

        <div className="mt-4">
          <InputLabel htmlFor="password" value="Password" />
          <TextInput
            id="password"
            type="password"
            name="password"
            value={data.password}
            className="mt-1 block w-full"
            autoComplete="new-password"
            onChange={(e) => setData('password', e.target.value)}
            required
          />
          <InputError message={errors.password} className="mt-2" />
        </div>

        <div className="mt-4">
          <InputLabel
            htmlFor="password_confirmation"
            value="Confirm Password"
          />
          <TextInput
            id="password_confirmation"
            type="password"
            name="password_confirmation"
            value={data.password_confirmation}
            className="mt-1 block w-full"
            autoComplete="new-password"
            onChange={(e) => setData('password_confirmation', e.target.value)}
            required
          />
          <InputError message={errors.password_confirmation} className="mt-2" />
        </div>

        <div className="mt-4 flex items-center justify-end">
          <Link
            href={route('supplier.login')}
            className="rounded-md text-sm text-gray-600 underline hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Already registered?
          </Link>

          <PrimaryButton className="ms-4" disabled={processing}>
            Register
          </PrimaryButton>
        </div>
      </form>
    </GuestLayout>
  );
}
