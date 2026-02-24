import React, { useMemo, useRef, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import Header from '../Components/Header';
import Footer from '../Components/Footer';
import '../../../../css/homepage/main.scss';

const subcategoriesData = [
  { id: 1, name: 'Call of the Night', image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=240&h=240&fit=crop' },
  { id: 2, name: 'Shirts & Blouses', image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=240&h=240&fit=crop' },
  { id: 3, name: 'Women Pants', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=240&h=240&fit=crop' },
  { id: 4, name: 'Skirts', image: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=240&h=240&fit=crop' },
  { id: 5, name: 'Pullovers', image: 'https://images.unsplash.com/photo-1503342394128-c104d54dba01?w=240&h=240&fit=crop' },
  { id: 6, name: 'Dresses', image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=240&h=240&fit=crop' },
  { id: 7, name: 'Long Dresses', image: 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=240&h=240&fit=crop' },
  { id: 8, name: 'Jumpsuits', image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=240&h=240&fit=crop' },
  { id: 9, name: 'Accessories', image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=240&h=240&fit=crop' },
];

const productsData = [
  {
    id: 1,
    name: 'Graphic Night Tee - Limited',
    price: 8.45,
    oldPrice: 16.9,
    discount: 50,
    rating: 4.7,
    sold: '2.1k',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=480&h=480&fit=crop',
    tag: 'WELCOME DEAL',
  },
  {
    id: 2,
    name: 'Gothic Printed Street Top',
    price: 10.2,
    oldPrice: 19.4,
    discount: 47,
    rating: 4.6,
    sold: '1.6k',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=480&h=480&fit=crop',
    tag: 'FLASH DEAL',
  },
  {
    id: 3,
    name: 'Vintage Cargo Skirt',
    price: 12.9,
    oldPrice: 23.0,
    discount: 44,
    rating: 4.8,
    sold: '3.9k',
    image: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=480&h=480&fit=crop',
    tag: 'WELCOME DEAL',
  },
  {
    id: 4,
    name: 'Streetwear Crop Hoodie',
    price: 14.4,
    oldPrice: 24.9,
    discount: 42,
    rating: 4.5,
    sold: '980',
    image: 'https://images.unsplash.com/photo-1503342394128-c104d54dba01?w=480&h=480&fit=crop',
    tag: 'TRENDING',
  },
  {
    id: 5,
    name: 'Summer Floral Dress',
    price: 11.8,
    oldPrice: 21.2,
    discount: 44,
    rating: 4.9,
    sold: '4.3k',
    image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=480&h=480&fit=crop',
    tag: 'WELCOME DEAL',
  },
  {
    id: 6,
    name: 'Casual Knit Sweater',
    price: 9.9,
    oldPrice: 18.0,
    discount: 45,
    rating: 4.4,
    sold: '1.2k',
    image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=480&h=480&fit=crop',
    tag: 'HOT PICK',
  },
  {
    id: 7,
    name: 'Printed Long Sleeve Tee',
    price: 7.4,
    oldPrice: 14.9,
    discount: 50,
    rating: 4.6,
    sold: '2.7k',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=480&h=480&fit=crop',
    tag: 'WELCOME DEAL',
  },
  {
    id: 8,
    name: 'Minimalist Wide Pants',
    price: 13.3,
    oldPrice: 23.8,
    discount: 44,
    rating: 4.5,
    sold: '1.4k',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=480&h=480&fit=crop',
    tag: 'LIMITED',
  },
  {
    id: 9,
    name: 'Elegant Office Dress',
    price: 15.6,
    oldPrice: 27.5,
    discount: 43,
    rating: 4.8,
    sold: '3.1k',
    image: 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=480&h=480&fit=crop',
    tag: 'WELCOME DEAL',
  },
  {
    id: 10,
    name: 'Soft Cotton Jumpsuit',
    price: 12.2,
    oldPrice: 22.4,
    discount: 46,
    rating: 4.7,
    sold: '1.9k',
    image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=480&h=480&fit=crop',
    tag: 'HOT PICK',
  },
];

const filterGroups = [
  { key: 'deals', title: 'Deals & Discounts' },
  { key: 'delivery', title: 'Delivery & Service' },
  { key: 'quality', title: 'Quality & Trust' },
  { key: 'style', title: 'Style' },
  { key: 'festival', title: 'Festival' },
];

const styleOptions = [
  'Casual',
  'Sexy',
  'Gothic',
  'Vintage',
  'Streetwear',
  'Minimalist',
  'Preppy',
  'Korean',
  'Y2K',
  'Boho',
];

const festivalOptions = [
  'Valentine',
  'Summer',
  'Back to School',
  'Halloween',
  'Christmas',
  'New Year',
];

const ProductCard = ({ product }) => {
  return (
    <div className="category-product-card">
      <div className="category-product-media">
        <img src={product.image} alt={product.name} loading="lazy" />
        <span className="category-product-badge">{product.tag}</span>
        <button className="category-product-cart" type="button" aria-label="Add to cart">
          <i className="fas fa-shopping-cart" aria-hidden="true"></i>
        </button>
      </div>
      <div className="category-product-body">
        <div className="category-product-price">
          <span className="price-current">${product.price.toFixed(2)}</span>
          <span className="price-old">${product.oldPrice.toFixed(2)}</span>
          <span className="price-discount">-{product.discount}%</span>
        </div>
        <h3 className="category-product-title">{product.name}</h3>
        <div className="category-product-meta">
          <div className="rating">
            <i className="fas fa-star"></i>
            <span>{product.rating}</span>
          </div>
          <span className="sold">Sold {product.sold}</span>
        </div>
        <div className="category-product-shipping">Free Shipping</div>
      </div>
    </div>
  );
};

const FilterGroup = ({ title, isOpen, onToggle, children }) => (
  <div className="filter-group">
    <button className="filter-group-header" type="button" onClick={onToggle}>
      <span>{title}</span>
      <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`}></i>
    </button>
    {isOpen && <div className="filter-group-body">{children}</div>}
  </div>
);

const Categories = () => {
  const [openGroups, setOpenGroups] = useState(() =>
    filterGroups.reduce((acc, group) => {
      acc[group.key] = true;
      return acc;
    }, {})
  );
  const subcategoryRef = useRef(null);
  const products = useMemo(() => {
    return Array.from({ length: 20 }).flatMap(() => productsData).slice(0, 30);
  }, []);

  const handleScroll = (direction) => {
    if (!subcategoryRef.current) return;
    subcategoryRef.current.scrollBy({
      left: direction * 260,
      behavior: 'smooth',
    });
  };

  const toggleGroup = (key) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      <Head title="Category Marketplace" />
      <div className="app-layout homepage-layout categories-page categories-marketplace">
        <Header />

        <section className="subcategory-slider">
          <div className="container">
            <button className="slider-nav left" type="button" onClick={() => handleScroll(-1)}>
              <i className="fas fa-chevron-left"></i>
            </button>
            <div className="subcategory-track" ref={subcategoryRef}>
              {subcategoriesData.map(item => (
                <div key={item.id} className="subcategory-item">
                  <div className="subcategory-avatar">
                    <img src={item.image} alt={item.name} loading="lazy" />
                  </div>
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
            <button className="slider-nav right" type="button" onClick={() => handleScroll(1)}>
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </section>

        <main className="categories-main">
          <div className="container category-layout">
            <aside className="category-filters">
              {filterGroups.map(group => (
                <FilterGroup
                  key={group.key}
                  title={group.title}
                  isOpen={openGroups[group.key]}
                  onToggle={() => toggleGroup(group.key)}
                >
                  {group.key === 'deals' && (
                    <label className="filter-option">
                      <input type="checkbox" />
                      <span>Sale</span>
                    </label>
                  )}
                  {group.key === 'delivery' && (
                    <div className="filter-option-group">
                      <label className="filter-option">
                        <input type="checkbox" />
                        <span>Free Shipping</span>
                      </label>
                      <label className="filter-option">
                        <input type="checkbox" />
                        <span>Fast Delivery</span>
                      </label>
                      <label className="filter-option">
                        <input type="checkbox" />
                        <span>Local Pickup</span>
                      </label>
                    </div>
                  )}
                  {group.key === 'quality' && (
                    <div className="filter-option-group">
                      {[5, 4, 3].map(stars => (
                        <label key={stars} className="filter-option">
                          <input type="checkbox" />
                          <span className="stars">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <i
                                key={i}
                                className={`fas fa-star ${i < stars ? 'active' : ''}`}
                              ></i>
                            ))}
                          </span>
                          <span className="stars-text">& up</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {group.key === 'style' && (
                    <div className="filter-scroll">
                      {styleOptions.map(option => (
                        <label key={option} className="filter-option">
                          <input type="checkbox" />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {group.key === 'festival' && (
                    <div className="filter-scroll">
                      {festivalOptions.map(option => (
                        <label key={option} className="filter-option">
                          <input type="checkbox" />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </FilterGroup>
              ))}
            </aside>

            <section className="category-results">
              <div className="category-banner">
                <div className="banner-text">
                  <span className="banner-title">SPRING SALE</span>
                  <span className="banner-subtitle">Ends: Feb 24</span>
                </div>
                <div className="banner-timer">00:15:32</div>
              </div>

              <div className="category-toolbar">
                <div className="results-count">Showing 1-30 of 3,240 results</div>
                <div className="toolbar-actions">
                  <select>
                    <option>Best Match</option>
                    <option>Orders</option>
                    <option>Price: Low to High</option>
                    <option>Price: High to Low</option>
                  </select>
                </div>
              </div>

              <div className="category-products-grid">
                {products.map(product => (
                  <ProductCard key={`${product.id}-${product.name}`} product={product} />
                ))}
              </div>

              <div className="category-pagination">
                <button className="page-btn" type="button">1</button>
                <button className="page-btn active" type="button">2</button>
                <button className="page-btn" type="button">3</button>
                <span className="page-ellipsis">...</span>
                <button className="page-btn" type="button">12</button>
                <button className="page-btn" type="button">
                  Next
                </button>
              </div>
            </section>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Categories;
