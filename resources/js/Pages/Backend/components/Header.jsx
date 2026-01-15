import { Link, usePage } from '@inertiajs/react';

const Header = ({ toggleSidebar }) => {
  const { auth } = usePage().props;
  const user = auth.user;

  return (
    <header className="header">
      <button
        className="mobile-menu-toggle"
        id="mobileMenuToggle"
        onClick={toggleSidebar}
      >
        <span className="material-icons-outlined">menu</span>
      </button>

      <div className="header-actions">
        <a href="/" className="action-btn" target="_blank" rel="noopener noreferrer">
          <span className="material-icons-outlined">public</span>
          <span>View website</span>
        </a>
        <button className="action-btn">
          <span className="material-icons-outlined">dark_mode</span>
        </button>
        <button className="action-btn">
          <span className="material-icons-outlined">notifications</span>
          <span className="badge">2</span>
        </button>
        <button className="action-btn">
          <span className="material-icons-outlined">email</span>
          <span className="badge">10</span>
        </button>
        <button className="action-btn">
          <span className="material-icons-outlined">shopping_cart</span>
          <span className="badge">2</span>
        </button>
        <div className="user-profile">
          {user && user.avatar ? (
            <img
              src={`/storage/${user.avatar}`}
              alt={user.name}
              className="avatar"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div className="avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
          )}
          <div className="user-info">
            <div>{user?.name || 'Guest'}</div>
            <div>{user?.email || ''}</div>
          </div>
          <button
            className="logout-btn"
            onClick={() => {
              document.getElementById('logout-form-header')?.submit();
            }}
          >
            <span className="material-icons-outlined">logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
