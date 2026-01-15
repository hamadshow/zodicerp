import React, { useEffect } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import '../../../../css/suppliers/Auth/Register.css';

const Register = () => {
    const { data, setData, post, processing, errors, reset } = useForm({
        supplier_name: '',
        company_name: '',
        email: '',
        password: '',
        password_confirmation: '',
        phone: '',
    });

    useEffect(() => {
        return () => {
            reset('password', 'password_confirmation');
        };
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('supplier.store'));
    };

    return (
        <div className="auth-container">
            <Head title="Supplier Registration" />
            
            <div className="auth-card">
                <div className="auth-header">
                    <h1 className="auth-title">Supplier Registration</h1>
                    <p className="auth-subtitle">Join our network of trusted suppliers</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {/* Supplier Name Field */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="supplier_name">
                            Supplier Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="supplier_name"
                            name="supplier_name"
                            value={data.supplier_name}
                            className={`form-input ${errors.supplier_name ? 'error' : ''}`}
                            onChange={(e) => setData('supplier_name', e.target.value)}
                            required
                            autoComplete="name"
                            autoFocus
                        />
                        {errors.supplier_name && <div className="error-message">{errors.supplier_name}</div>}
                    </div>

                    {/* Company Name Field */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="company_name">
                            Company Name
                        </label>
                        <input
                            type="text"
                            id="company_name"
                            name="company_name"
                            value={data.company_name}
                            className={`form-input ${errors.company_name ? 'error' : ''}`}
                            onChange={(e) => setData('company_name', e.target.value)}
                            autoComplete="organization"
                        />
                        {errors.company_name && <div className="error-message">{errors.company_name}</div>}
                    </div>

                    {/* Phone Field */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="phone">
                            Phone
                        </label>
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={data.phone}
                            className={`form-input ${errors.phone ? 'error' : ''}`}
                            onChange={(e) => setData('phone', e.target.value)}
                            autoComplete="tel"
                        />
                        {errors.phone && <div className="error-message">{errors.phone}</div>}
                    </div>

                    {/* Email Field */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="email">
                            Email Address <span className="text-red-500">*</span>
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
                        />
                        {errors.email && <div className="error-message">{errors.email}</div>}
                    </div>

                    {/* Password Field */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="password">
                            Password <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={data.password}
                            className={`form-input ${errors.password ? 'error' : ''}`}
                            onChange={(e) => setData('password', e.target.value)}
                            required
                            autoComplete="new-password"
                        />
                        {errors.password && <div className="error-message">{errors.password}</div>}
                    </div>

                    {/* Confirm Password Field */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="password_confirmation">
                            Confirm Password <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="password"
                            id="password_confirmation"
                            name="password_confirmation"
                            value={data.password_confirmation}
                            className={`form-input ${errors.password_confirmation ? 'error' : ''}`}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            required
                            autoComplete="new-password"
                        />
                        {errors.password_confirmation && <div className="error-message">{errors.password_confirmation}</div>}
                    </div>

                    <button type="submit" className="submit-btn" disabled={processing}>
                        {processing ? 'Registering...' : 'Register'}
                    </button>
                </form>

                <div className="auth-footer">
                    Already have an account?{' '}
                    <Link href={route('supplier.login')} className="auth-link">
                        Log in
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
