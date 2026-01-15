import React from 'react';
import { useForm } from '@inertiajs/react';
import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';

// Login Form Component
const LoginForm = ({ onClose, onSwitchToRegister }) => {
  const { data, setData, post, processing, errors, reset } = useForm({
    email: '',
    password: '',
    remember: false,
  });

  const submit = (e) => {
    e.preventDefault();
    post(route('login'), {
      onFinish: () => reset('password'),
      onSuccess: () => onClose(),
    });
  };

  return (
    <div className="auth-modal">
      <div className="auth-modal-content">
        <div className="auth-modal-header">
          <h2>Sign In</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={submit}>
          <div>
            <InputLabel htmlFor="email" value="Email" />
            <TextInput
              id="email"
              type="email"
              name="email"
              value={data.email}
              className="mt-1 block w-full"
              autoComplete="username"
              isFocused={true}
              onChange={(e) => setData('email', e.target.value)}
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
              autoComplete="current-password"
              onChange={(e) => setData('password', e.target.value)}
            />
            <InputError message={errors.password} className="mt-2" />
          </div>
          <div className="mt-4 block">
            <label className="flex items-center">
              <Checkbox
                name="remember"
                checked={data.remember}
                onChange={(e) => setData('remember', e.target.checked)}
              />
              <span className="ms-2 text-sm text-gray-600">Remember me</span>
            </label>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              className="text-sm text-blue-600 hover:text-blue-800"
              onClick={onSwitchToRegister}
            >
              Don't have an account? Register
            </button>
            <PrimaryButton disabled={processing}>Log in</PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
