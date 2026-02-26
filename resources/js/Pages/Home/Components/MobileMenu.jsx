import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { useTranslation } from '../../../Hooks/useTranslation';

export default function MobileMenu({
  isOpen,
  onClose,
  categoriesData = [],
  localization,
  user,
  onLogout,
}) {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState(null);
  const [isLangOpen, setIsLangOpen] = useState(false);

  if (!isOpen) return null;

  const handleCategoryClick = (category) => {
    if (activeCategory?.id === category.id) {
      setActiveCategory(null);
    } else {
      setActiveCategory(category);
    }
  };

  const handleLocaleChange = (newLocale) => {
    const country = localization?.country_code || 'sa';
    router.get(`/${country}/${newLocale}`);
    onClose();
  };

  return (
    <div className={`mobile-menu-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}>
      <div className="mobile-menu-content" onClick={(e) => e.stopPropagation()}>
        <div className="mobile-menu-header">
          <div className="mobile-menu-title">{t('header.menu', 'Menu')}</div>
          <button className="mobile-menu-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="mobile-menu-body">
          {/* User Section */}
          <div className="mobile-user-section">
            {user ? (
              <div className="mobile-user-info">
                <div className="user-avatar">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} />
                  ) : (
                    <div className="avatar-placeholder">{user.name.charAt(0)}</div>
                  )}
                </div>
                <div className="user-details">
                  <span className="user-name">{user.name}</span>
                  <span className="user-email">{user.email}</span>
                </div>
              </div>
            ) : (
              <Link href={route('login')} className="mobile-login-btn">
                <i className="fas fa-user-circle"></i>
                <span>{t('header.sign_in_join', 'Sign In / Join')}</span>
              </Link>
            )}
          </div>

          {/* Navigation Links */}
          <div className="mobile-nav-links">
            <Link href="/" className="mobile-nav-item" onClick={onClose}>
              <i className="fas fa-home"></i>
              <span>{t('header.home', 'Home')}</span>
            </Link>
            {user && (
              <Link href={route('customer.dashboard')} className="mobile-nav-item" onClick={onClose}>
                <i className="fas fa-tachometer-alt"></i>
                <span>{t('header.dashboard', 'My Dashboard')}</span>
              </Link>
            )}
            <Link href={route('cart.index')} className="mobile-nav-item" onClick={onClose}>
              <i className="fas fa-shopping-cart"></i>
              <span>{t('header.cart', 'Cart')}</span>
            </Link>
             <Link href="#" className="mobile-nav-item" onClick={onClose}>
              <i className="fas fa-heart"></i>
              <span>{t('header.wishlist', 'Wishlist')}</span>
            </Link>
          </div>

          <div className="mobile-divider"></div>

          {/* Categories */}
          <div className="mobile-categories-title">{t('header.categories', 'Categories')}</div>
          <div className="mobile-categories-list">
            {categoriesData.map((category) => (
              <div key={category.id} className="mobile-category-item">
                <div 
                  className="mobile-category-header"
                  onClick={() => handleCategoryClick(category)}
                >
                  <span className="cat-name">
                    <i className={`fas ${category.icon || 'fa-folder'}`}></i>
                    {category.name}
                  </span>
                  {category.children && category.children.length > 0 && (
                    <i className={`fas fa-chevron-down ${activeCategory?.id === category.id ? 'rotate' : ''}`}></i>
                  )}
                </div>
                {activeCategory?.id === category.id && category.children && (
                  <div className="mobile-subcategories">
                    {category.children.map((sub) => (
                      <Link 
                        key={sub.id} 
                        href={`/category/${sub.slug}`}
                        className="mobile-subcategory-link"
                        onClick={onClose}
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mobile-divider"></div>

          {/* Settings */}
          <div className="mobile-settings">
            <div className="mobile-setting-item">
              <div className="setting-header" onClick={() => setIsLangOpen(!isLangOpen)}>
                <div className="setting-label">
                  <i className="fas fa-globe"></i>
                  <span>{t('header.language', 'Language')}</span>
                </div>
                <div className="setting-value">
                  {localization?.current_locale === 'ar' ? 'العربية' : 'English'}
                  <i className="fas fa-chevron-right"></i>
                </div>
              </div>
              {isLangOpen && (
                 <div className="mobile-setting-options">
                    {localization?.active_languages?.map((lang) => (
                        <button 
                            key={lang.lang_id}
                            className={`mobile-option-btn ${localization?.current_locale === lang.lang_code ? 'active' : ''}`}
                            onClick={() => handleLocaleChange(lang.lang_code)}
                        >
                            {lang.lang_name}
                        </button>
                    ))}
                 </div>
              )}
            </div>

            <div className="mobile-setting-item">
                <div className="setting-header">
                     <div className="setting-label">
                        <i className="fas fa-map-marker-alt"></i>
                        <span>{t('header.country', 'Country')}</span>
                    </div>
                    <div className="setting-value">
                        {localization?.current_country?.name || localization?.country_code?.toUpperCase()}
                    </div>
                </div>
            </div>
            
            <div className="mobile-setting-item">
                <div className="setting-header">
                     <div className="setting-label">
                        <i className="fas fa-money-bill-wave"></i>
                        <span>{t('header.currency', 'Currency')}</span>
                    </div>
                    <div className="setting-value">
                        {localization?.currency_code}
                    </div>
                </div>
            </div>
          </div>

          {user && (
            <div className="mobile-logout-section">
              <button onClick={onLogout} className="mobile-logout-btn">
                <i className="fas fa-sign-out-alt"></i>
                <span>{t('header.logout', 'Logout')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
