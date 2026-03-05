import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import '../../../../css/suppliers/main.scss';

export default function SupplierRegister() {
  const { localization } = usePage().props;

  const getLocalizedRoute = (name, params = {}) => {
    return route(name, {
      country: localization?.country_code || 'sa',
      lang: localization?.current_locale || 'ar',
      ...params
    });
  };

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

    post(getLocalizedRoute('supplier.store'), {
      onFinish: () => reset('password', 'password_confirmation'),
    });
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <Head title="Supplier Register" />

        <div className="auth-header">
          <h2 className="auth-title">Supplier Registration</h2>
          <p className="auth-subtitle">Create your supplier account</p>
        </div>

        <form onSubmit={submit} className="auth-form">
          <div className="form-group">
            <InputLabel htmlFor="supplier_code" value="Supplier Code" className="form-label" />
            <TextInput
              id="supplier_code"
              name="supplier_code"
              value={data.supplier_code}
              className="form-input"
              isFocused={true}
              onChange={(e) => setData('supplier_code', e.target.value)}
              required
            />
            <InputError message={errors.supplier_code} className="error-message" />
          </div>

          <div className="form-group">
            <InputLabel htmlFor="name_ar" value="Name (Arabic)" className="form-label" />
            <TextInput
              id="name_ar"
              name="name_ar"
              value={data.name_ar}
              className="form-input"
              autoComplete="name"
              onChange={(e) => setData('name_ar', e.target.value)}
              required
            />
            <InputError message={errors.name_ar} className="error-message" />
          </div>

          <div className="form-group">
            <InputLabel htmlFor="name_en" value="Name (English) - Optional" className="form-label" />
            <TextInput
              id="name_en"
              name="name_en"
              value={data.name_en}
              className="form-input"
              autoComplete="name"
              onChange={(e) => setData('name_en', e.target.value)}
            />
            <InputError message={errors.name_en} className="error-message" />
          </div>

          <div className="form-group">
            <InputLabel htmlFor="email" value="Email" className="form-label" />
            <TextInput
              id="email"
              type="email"
              name="email"
              value={data.email}
              className="form-input"
              autoComplete="username"
              onChange={(e) => setData('email', e.target.value)}
              required
            />
            <InputError message={errors.email} className="error-message" />
          </div>

          <div className="form-group">
            <InputLabel htmlFor="password" value="Password" className="form-label" />
            <TextInput
              id="password"
              type="password"
              name="password"
              value={data.password}
              className="form-input"
              autoComplete="new-password"
              onChange={(e) => setData('password', e.target.value)}
              required
            />
            <InputError message={errors.password} className="error-message" />
          </div>

          <div className="form-group">
            <InputLabel
              htmlFor="password_confirmation"
              value="Confirm Password"
              className="form-label"
            />
            <TextInput
              id="password_confirmation"
              type="password"
              name="password_confirmation"
              value={data.password_confirmation}
              className="form-input"
              autoComplete="new-password"
              onChange={(e) => setData('password_confirmation', e.target.value)}
              required
            />
            <InputError message={errors.password_confirmation} className="error-message" />
          </div>

          <div className="mt-4">
            <button className="submit-btn" disabled={processing}>
              Register
            </button>
          </div>

          <div className="auth-footer">
            <Link
              href={getLocalizedRoute('supplier.login')}
              className="auth-link"
            >
              Already registered? Login here
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
