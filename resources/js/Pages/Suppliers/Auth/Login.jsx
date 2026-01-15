import React, { useEffect } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import '../../../../css/suppliers/Auth/Login.css';

const Login = () => {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    useEffect(() => {
        return () => {
            reset('password');
        };
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('supplier.authenticate'));
    };

    return (
        <div className="auth-container">
            <Head title="Supplier Login" />
            
            <div className="auth-card">
                <div className="auth-header">
                    <h1 className="auth-title">Supplier Login</h1>
                    <p className="auth-subtitle">Please sign in to your supplier account</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form" noValidate>
                    {/* Email Field */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="email">
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={data.email}
                            className={`form-input ${errors.email ? 'error' : ''}`}
                            onChange={(e) => setData('email', e.target.value)}
                            required
                            autoComplete="username"
                            autoFocus
                            aria-invalid={errors.email ? 'true' : 'false'}
                            aria-describedby={errors.email ? 'email-error' : undefined}
                        />
                        {errors.email && (
                            <div id="email-error" className="error-message">
                                {errors.email}
                            </div>
                        )}
                    </div>

                    {/* Password Field */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="password">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={data.password}
                            className={`form-input ${errors.password ? 'error' : ''}`}
                            onChange={(e) => setData('password', e.target.value)}
                            required
                            autoComplete="current-password"
                            aria-invalid={errors.password ? 'true' : 'false'}
                            aria-describedby={errors.password ? 'password-error' : undefined}
                        />
                        {errors.password && (
                            <div id="password-error" className="error-message">
                                {errors.password}
                            </div>
                        )}
                    </div>

                    {/* Remember Me & Forgot Password */}
                    <div className="auth-footer" style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                        <div className="checkbox-group">
                            <input
                                type="checkbox"
                                id="remember"
                                name="remember"
                                checked={data.remember}
                                onChange={(e) => setData('remember', e.target.checked)}
                                className="checkbox-input"
                            />
                            <label htmlFor="remember" className="form-label" style={{ marginBottom: 0 }}>
                                Remember me
                            </label>
                        </div>
                        
                        <Link
                            href={route('password.request')}
                            className="auth-link"
                        >
                            Forgot Password?
                        </Link>
                    </div>

                    <button type="submit" className="submit-btn" disabled={processing}>
                        {processing ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>

                <div className="divider">
                    <span>Or continue with</span>
                </div>

                <div className="social-buttons">
                    {/* Social buttons kept from original */}
                    <a href="/auth/google" className="social-btn">
                         <svg className="social-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Google
                    </a>
                </div>

                <div className="auth-footer" style={{ display: 'block', textAlign: 'center' }}>
                    Don't have an account?{' '}
                    <Link href={route('supplier.register')} className="auth-link">
                        Sign Up
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
