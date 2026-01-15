import React from 'react';
import { router, Link } from '@inertiajs/react';

export default function Header() {
  return (
    <header className="suppliers-header">
      <div className="suppliers-container">
        <div className="logo-text">noon</div>
        <nav className="main-nav">
          <a href="#" className="nav-link">
            Home
          </a>
          <a href="#" className="nav-link">
            How To Go Live
          </a>
          <a href="#" className="nav-link">
            Shipping & Fulfillment
          </a>
          <a href="#" className="nav-link">
            Grow Smarter
          </a>
          <Link href={route('supplier.login')} className="login-btn">
            Login
          </Link>
          <Link
            href={route('supplier.register')}
            className="cta-btn"
            style={{
              padding: '8px 24px',
              fontSize: '0.9rem',
              marginLeft: '16px',
              textDecoration: 'none',
              display: 'inline-block'
            }}
          >
            Sign Up
          </Link>
        </nav>
      </div>
    </header>
  );
}
