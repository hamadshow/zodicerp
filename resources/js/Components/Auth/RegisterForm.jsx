import React from 'react';
import { useForm, usePage } from '@inertiajs/react';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';

// Register Form Component
const RegisterForm = ({ onClose, onSwitchToLogin }) => {
  const { localization } = usePage().props;

  const getLocalizedRoute = (name, params = {}) => {
    return route(name, {
      country: localization?.country_code || 'sa',
      lang: localization?.current_locale || 'ar',
      ...params
    });
  };

  const { data, setData, post, processing, errors, reset } = useForm({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });

  const submit = (e) => {
    e.preventDefault();
    post(getLocalizedRoute('register'), {
      onFinish: () => reset('password', 'password_confirmation'),
      onSuccess: () => onClose(),
    });
  };

  return (
    <div className="auth-modal">
      <div className="auth-modal-content">
        <div className="auth-modal-header">
          <h2>Register</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={submit}>
          <div>
            <InputLabel htmlFor="name" value="Name" />
            <TextInput
              id="name"
              name="name"
              value={data.name}
              className="mt-1 block w-full"
              autoComplete="name"
              isFocused={true}
              onChange={(e) => setData('name', e.target.value)}
              required
            />
            <InputError message={errors.name} className="mt-2" />
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
            <InputError
              message={errors.password_confirmation}
              className="mt-2"
            />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              className="text-sm text-blue-600 hover:text-blue-800"
              onClick={onSwitchToLogin}
            >
              Already have an account? Sign In
            </button>
            <PrimaryButton disabled={processing}>Register</PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterForm;
