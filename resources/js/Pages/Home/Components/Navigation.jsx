import React, { useState, useEffect, useRef } from 'react';
import '../../../../css/homepage/header.css';

export default function Navigation({
  items = [
    'Home',
    'Consumer Electronics',
    'Computer & Office',
    'Home & Garden',
    'Apparel',
    'Toys & Hobbies',
    'Automobiles',
    'Jewelry & Timepieces',
  ],
  activeIndex = 0,
  categoriesData = [],
}) {
  const [activeCategory, setActiveCategory] = useState(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!activeCategory && categoriesData.length > 0) {
      setActiveCategory(categoriesData[0]);
    }
  }, [categoriesData, activeCategory]);

  useEffect(() => {
    function handleClickOutside(event) {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setShowCategoryDropdown(false);
        }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  const handleCategoryHover = (category) => {
    setActiveCategory(category);
  };

  return (
    <div className="main-nav">
      <div className="header-container">
        <div className="nav-wrapper">
            <div className="category-selector-nav" ref={dropdownRef}>
                <button
                    type="button"
                    className="category-btn-nav"
                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                >
                    <i className="fas fa-bars"></i>
                    <span>All Categories</span>
                </button>
                {showCategoryDropdown && (
                    <div className="category-dropdown-nav active">
                        <div className="mobile-dropdown-header">
                            <span className="mobile-dropdown-title">All Categories</span>
                            <button className="mobile-dropdown-close" onClick={() => setShowCategoryDropdown(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="category-columns">
                            <div className="main-categories">
                                {categoriesData.map((category) => (
                                    <div
                                        key={category.id}
                                        className={`category-item ${activeCategory?.id === category.id ? 'active' : ''}`}
                                        onMouseEnter={() => handleCategoryHover(category)}
                                        onClick={() => {
                                            setActiveCategory(category);
                                        }}
                                    >
                                        <span className="cat-name">
                                            <i className={`fas ${category.icon || 'fa-folder'} category-icon`}></i>
                                            {category.name}
                                        </span>
                                        <i className="fas fa-chevron-right arrow-icon"></i>
                                    </div>
                                ))}
                            </div>
                            {activeCategory && (
                                <div className="sub-categories">
                                    <div className="sub-header">
                                        <h3>{activeCategory.name}</h3>
                                        <a href={`/category/${activeCategory.slug}`} className="browse-link">Browse featured selections</a>
                                    </div>
                                    <div className="subcategory-grid">
                                        {activeCategory.children?.map((sub, index) => (
                                            <div
                                                key={sub.id || index}
                                                className="subcategory-card"
                                                onClick={() => setShowCategoryDropdown(false)}
                                            >
                                                <div className="sub-img-wrapper">
                                                    {sub.image ? (
                                                        <img src={`/storage/${sub.image}`} alt={sub.name} />
                                                    ) : (
                                                        <div className="placeholder-img">
                                                            <i className="fas fa-box-open"></i>
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="sub-name">{sub.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <nav className="nav-menu" aria-label="Primary">
            {items.map((label, index) => (
                <a
                key={label}
                href="#"
                className={`nav-item ${index === activeIndex ? 'active' : ''}`}
                aria-current={index === activeIndex ? 'page' : undefined}
                >
                {label}
                </a>
            ))}
            </nav>
        </div>
      </div>
    </div>
  );
}
