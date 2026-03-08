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
    store_name_json: '',
    primary_phone: '',
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
          {/* Supplier Code is auto-generated */}

          <div className="form-group">
            <InputLabel htmlFor="name_ar" value="Name" className="form-label" />
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
            <InputLabel htmlFor="store_name_json" value="Store Name" className="form-label" />
            <TextInput
              id="store_name_json"
              name="store_name_json"
              value={data.store_name_json}
              className="form-input"
              autoComplete="organization"
              onChange={(e) => setData('store_name_json', e.target.value)}
            />
            <InputError message={errors.store_name_json} className="error-message" />
          </div>

          <div className="form-group">
            <InputLabel htmlFor="primary_phone" value="Mobile" className="form-label" />
            <TextInput
              id="primary_phone"
              name="primary_phone"
              value={data.primary_phone}
              className="form-input"
              autoComplete="tel"
              onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                  setData('primary_phone', value);
              }}
              required
            />
            <InputError message={errors.primary_phone} className="error-message" />
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
