import React, { useCallback, useState, useEffect, useRef } from 'react';
import '../../../css/homepage/home.scss';
import Header from './Components/Header';
import Footer from './Components/Footer';
import ProductCard from './Components/ProductCard';
import CategoryRail from './Components/CategoryRail';
import SupplierCard from './Components/SupplierCard';

const productsData = [
  {
    id: 1,
    name: 'Industrial Bluetooth Headsets (Bulk Pack)',
    price: '15.99',
    moq: '500 pcs',
    orders: '5.2K+',
    image:
      'https://images.unsplash.com/photo-1583947581924-860bda6a26df?w=300&h=200&fit=crop',
    badge: 'Hot',
    verified: true,
    supplier: 'Shenzhen Tech Manufacturing',
  },
  {
    id: 2,
    name: 'Medical Grade Face Masks (Wholesale)',
    price: '12.50',
    moq: '1000 pcs',
    orders: '8.7K+',
    image:
      'https://images.unsplash.com/photo-1583947581924-860bda6a26df?w=300&h=200&fit=crop',
    badge: 'Certified',
    verified: true,
    supplier: 'Global Health Supplies Co.',
  },
  {
    id: 3,
    name: 'Commercial Stainless Steel Containers',
    price: '6.25',
    moq: '1000 pcs',
    orders: '12.3K+',
    image:
      'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=300&h=200&fit=crop',
    badge: 'Premium',
    verified: true,
    supplier: 'Industrial Metals Ltd.',
  },
  {
    id: 4,
    name: 'Enterprise Fitness Tracking Devices',
    price: '28.99',
    moq: '200 pcs',
    orders: '6.8K+',
    image:
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=200&fit=crop',
    badge: 'Best Seller',
    verified: true,
    supplier: 'Advanced Electronics Corp.',
  },
  {
    id: 5,
    name: 'Wireless Charging Pads (Bulk)',
    price: '8.99',
    moq: '300 pcs',
    orders: '4.1K+',
    image:
      'https://images.unsplash.com/photo-1585155770447-2f66e2a397b5?w=300&h=200&fit=crop',
    badge: 'New',
    verified: true,
    supplier: 'Tech Innovations Ltd.',
  },
  {
    id: 6,
    name: 'Professional LED Desk Lamps',
    price: '22.49',
    moq: '100 pcs',
    orders: '3.7K+',
    image:
      'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=300&h=200&fit=crop',
    badge: 'Trending',
    verified: true,
    supplier: 'Lighting Solutions Inc.',
  },
];

const suppliersData = [
  {
    id: 1,
    name: 'Shenzhen Advanced Electronics',
    location: 'Shenzhen, China',
    years: '18+ Years',
    tags: ['Verified', 'Trade Assurance', 'Gold Supplier'],
    products: '15,200+',
  },
  {
    id: 2,
    name: 'Hangzhou Textile Solutions',
    location: 'Hangzhou, China',
    years: '22+ Years',
    tags: ['Verified', 'Assessed Supplier', 'Quality Inspection'],
    products: '9,800+',
  },
  {
    id: 3,
    name: 'Shanghai Precision Manufacturing',
    location: 'Shanghai, China',
    years: '14+ Years',
    tags: ['Verified', 'Trade Assurance', 'Fast Delivery'],
    products: '18,500+',
  },
  {
    id: 4,
    name: 'Global Trading Corporation',
    location: 'Guangzhou, China',
    years: '12+ Years',
    tags: ['Verified', 'Gold Supplier', 'Fast Delivery'],
    products: '22,100+',
  },
];

const brandData = [
  { id: 1, name: 'Samsung', products: '12,500+' },
  { id: 2, name: 'Apple', products: '8,200+' },
  { id: 3, name: 'Xiaomi', products: '15,800+' },
  { id: 4, name: 'LG', products: '9,600+' },
  { id: 5, name: 'TCL', products: '7,300+' },
  { id: 6, name: 'HP', products: '11,400+' },
];

const useHorizontalSlider = () => {
  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  const scrollByDirection = useCallback((direction) => {
    const el = trackRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: direction * amount, behavior: 'smooth' });
  }, []);

  const scrollLeft = useCallback(() => {
    scrollByDirection(-1);
  }, [scrollByDirection]);

  const scrollRight = useCallback(() => {
    scrollByDirection(1);
  }, [scrollByDirection]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [update]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onWheel = (event) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        return;
      }
      if (el.scrollWidth <= el.clientWidth) {
        return;
      }
      event.preventDefault();
      el.scrollBy({
        left: event.deltaY,
        behavior: 'smooth',
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, []);

  return { trackRef, canScrollLeft, canScrollRight, scrollLeft, scrollRight };
};

const SectionHeaderWithSlider = ({
  title,
  onViewAll,
  viewAllLabel,
  viewAllAriaLabel,
  onPrev,
  onNext,
  canScrollLeft,
  canScrollRight,
}) => {
  return (
    <div className="homepage__section-header">
      <h2 className="homepage__section-title">{title}</h2>
      <div className="homepage__section-actions">
        {onViewAll && (
          <button
            type="button"
            className="homepage__view-all"
            onClick={onViewAll}
            aria-label={viewAllAriaLabel}
          >
            {viewAllLabel}
            <i className="fas fa-arrow-right" aria-hidden="true"></i>
          </button>
        )}
        <div className="homepage__slider-arrows">
          <button
            type="button"
            className="slider-arrow slider-arrow--left"
            onClick={onPrev}
            disabled={!canScrollLeft}
            aria-label="Scroll left"
          >
            <i className="fas fa-chevron-left" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            className="slider-arrow slider-arrow--right"
            onClick={onNext}
            disabled={!canScrollRight}
            aria-label="Scroll right"
          >
            <i className="fas fa-chevron-right" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

const HeroSection = ({ heroAds = [], sideAds = [], onSectionClick, onImageError, onShopNow }) => {
  const hasHeroAds = heroAds && heroAds.length > 0;
  const hasSideAds = sideAds && sideAds.length > 0;

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!hasHeroAds) {
      return;
    }
    setCurrentIndex(0);
  }, [hasHeroAds, heroAds]);

  useEffect(() => {
    if (!hasHeroAds) {
      return;
    }
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (!heroAds || heroAds.length === 0) {
          return 0;
        }
        return (prev + 1) % heroAds.length;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [hasHeroAds, heroAds]);

  const currentHero = hasHeroAds ? heroAds[currentIndex] : null;

  const defaultHeroImage =
    'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&h=700&q=80';

  const heroImageSrc = currentHero && currentHero.image ? currentHero.image : defaultHeroImage;
  const heroAlt = currentHero && currentHero.name ? currentHero.name : 'Main Ad';

  const fallbackSideAds = [
    {
      image:
        'https://images.unsplash.com/photo-1483985988355-763728e1935b?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&h=200&q=80',
      name: 'ROMWE',
    },
    {
      image:
        'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&h=200&q=80',
      name: 'EMERY ROSE',
    },
    {
      image:
        'https://images.unsplash.com/photo-1529139574466-a302d2052574?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&h=200&q=80',
      name: 'MOTF',
    },
  ];

  const sideItems = hasSideAds ? sideAds.slice(0, 3) : fallbackSideAds;

  const handleHeroClick = (event) => {
    if (currentHero && currentHero.url) {
      event.preventDefault();
      if (currentHero.open_in_new_tab) {
        window.open(currentHero.url, '_blank');
      } else {
        window.location.href = currentHero.url;
      }
      return;
    }
    if (onSectionClick) {
      onSectionClick(event);
    }
  };

  const handleSideAdClick = (ad, event) => {
    if (ad && ad.url) {
      event.preventDefault();
      if (ad.open_in_new_tab) {
        window.open(ad.url, '_blank');
      } else {
        window.location.href = ad.url;
      }
    }
  };

  return (
    <section className="homepage__ads-section" onClick={onSectionClick}>
      <div className="container">
        <div className="homepage__ads-grid">
          <div className="homepage__ads-main">
            <div
              className="homepage__ads-banner homepage__ads-banner--large"
              tabIndex={0}
              aria-label="Main promotional banner"
              onClick={handleHeroClick}
            >
              <img
                src={heroImageSrc}
                alt={heroAlt}
                className="ads-image"
                loading="lazy"
                onError={onImageError}
              />
              <div className="ads-content-overlay">
                <span className="ads-subtitle">Trending Brands</span>
                <h3 className="ads-title">
                  80% <small>OFF</small>
                </h3>
                <p className="ads-description">EXCLUSIVE BRANDS FOR LESS</p>
                <button
                  type="button"
                  className="ads-cta"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (onShopNow) {
                      onShopNow(currentHero);
                    }
                  }}
                  aria-label="Shop Now"
                >
                  Shop Now
                </button>
              </div>
            </div>
          </div>
          <div className="homepage__ads-side">
            {sideItems.map((ad, index) => {
              const imageSrc =
                ad && ad.image
                  ? ad.image
                  : fallbackSideAds[index] && fallbackSideAds[index].image;
              const name =
                ad && ad.name ? ad.name : fallbackSideAds[index] && fallbackSideAds[index].name;

              return (
                <div
                  key={ad && ad.id ? ad.id : index}
                  className="homepage__ads-banner homepage__ads-banner--small"
                  tabIndex={0}
                  aria-label={name ? name + ' ad banner' : 'Ad banner'}
                  onClick={(event) => handleSideAdClick(ad, event)}
                >
                  <img
                    src={imageSrc}
                    alt={name || 'Ad'}
                    className="ads-image"
                    loading="lazy"
                    onError={onImageError}
                  />
                  <div className="ads-brand-overlay">{name}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

const CategorySlider = ({ categories, onViewAll, onCategoryClick }) => {
  const { trackRef, canScrollLeft, canScrollRight, scrollLeft, scrollRight } =
    useHorizontalSlider();

  return (
    <section className="homepage__categories-section">
      <div className="container">
        <SectionHeaderWithSlider
          title="Top Categories"
          onViewAll={onViewAll}
          viewAllLabel="View All Categories"
          viewAllAriaLabel="View all categories"
          onPrev={scrollLeft}
          onNext={scrollRight}
          canScrollLeft={canScrollLeft}
          canScrollRight={canScrollRight}
        />
        <CategoryRail
          categories={categories}
          onCategoryClick={onCategoryClick}
          trackRef={trackRef}
        />
      </div>
    </section>
  );
};

const ProductSlider = ({
  title,
  products,
  onViewAll,
  viewAllLabel,
  viewAllAriaLabel,
  onAddToCart,
  onWishlistToggle,
  isInWishlist,
  onQuickView,
}) => {
  const { trackRef, canScrollLeft, canScrollRight, scrollLeft, scrollRight } =
    useHorizontalSlider();

  return (
    <section className="homepage__products-section">
      <div className="container">
        <SectionHeaderWithSlider
          title={title}
          onViewAll={onViewAll}
          viewAllLabel={viewAllLabel}
          viewAllAriaLabel={viewAllAriaLabel}
          onPrev={scrollLeft}
          onNext={scrollRight}
          canScrollLeft={canScrollLeft}
          canScrollRight={canScrollRight}
        />
        <div className="homepage__products-grid" ref={trackRef}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={onAddToCart}
              onWishlistToggle={onWishlistToggle}
              isInWishlist={isInWishlist}
              onQuickView={onQuickView}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

const FeaturedProducts = ({
  products,
  onViewAll,
  onAddToCart,
  onWishlistToggle,
  isInWishlist,
}) => {
  const hasProducts = products && products.length > 0;
  const { trackRef, canScrollLeft, canScrollRight, scrollLeft, scrollRight } =
    useHorizontalSlider();

  return (
    <section className="homepage__products-section">
      <div className="container">
        <SectionHeaderWithSlider
          title="Featured Products"
          onViewAll={onViewAll}
          viewAllLabel="View All Products"
          viewAllAriaLabel="View all products"
          onPrev={scrollLeft}
          onNext={scrollRight}
          canScrollLeft={canScrollLeft}
          canScrollRight={canScrollRight}
        />
        {hasProducts ? (
          <div className="homepage__products-grid" ref={trackRef}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={onAddToCart}
                onWishlistToggle={onWishlistToggle}
                isInWishlist={isInWishlist}
              />
            ))}
          </div>
        ) : (
          <div className="homepage__empty-state">
            No featured products available at the moment.
          </div>
        )}
      </div>
    </section>
  );
};

const BrandsSlider = () => {
  const { trackRef, canScrollLeft, canScrollRight, scrollLeft, scrollRight } =
    useHorizontalSlider();

  return (
    <section className="homepage__brands-section">
      <div className="container">
        <SectionHeaderWithSlider
          title="Top Brands"
          onViewAll={null}
          viewAllLabel=""
          viewAllAriaLabel=""
          onPrev={scrollLeft}
          onNext={scrollRight}
          canScrollLeft={canScrollLeft}
          canScrollRight={canScrollRight}
        />
        <div className="homepage__brands-grid" ref={trackRef}>
          {brandData.map((brand) => (
            <div key={brand.id} className="homepage__brand-card">
              <div className="homepage__brand-logo">
                {brand.name.charAt(0)}
              </div>
              <h3 className="homepage__brand-name">{brand.name}</h3>
              <p className="homepage__brand-products">
                {brand.products} products
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const SuppliersSection = ({ suppliers, onViewAll }) => {
  const { trackRef, canScrollLeft, canScrollRight, scrollLeft, scrollRight } =
    useHorizontalSlider();

  return (
    <section className="homepage__suppliers-section">
      <div className="container">
        <SectionHeaderWithSlider
          title="Top Verified Suppliers"
          onViewAll={onViewAll}
          viewAllLabel="View All Suppliers"
          viewAllAriaLabel="View all suppliers"
          onPrev={scrollLeft}
          onNext={scrollRight}
          canScrollLeft={canScrollLeft}
          canScrollRight={canScrollRight}
        />
        <div className="homepage__suppliers-grid" ref={trackRef}>
          {suppliers.map((supplier) => (
            <SupplierCard key={supplier.id} supplier={supplier} />
          ))}
        </div>
      </div>
    </section>
  );
};

const useCart = (initialCart = []) => {
  const [cartItems, setCartItems] = useState(initialCart);
  const addToCart = (item) => {
    setCartItems((prev) => {
      const existingItem = prev.find((cartItem) => cartItem.id === item.id);
      if (existingItem) {
        return prev.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };
  const removeFromCart = (itemId) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId));
  };
  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity } : item))
    );
  };
  const getCartCount = () =>
    cartItems.reduce((sum, item) => sum + item.quantity, 0);
  return {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    getCartCount,
  };
};

const useWishlist = (initialWishlist = []) => {
  const [wishlistItems, setWishlistItems] = useState(initialWishlist);
  const toggleWishlist = (item) => {
    setWishlistItems((prev) => {
      const existingItem = prev.find(
        (wishlistItem) => wishlistItem.id === item.id
      );
      if (existingItem) {
        return prev.filter((wishlistItem) => wishlistItem.id !== item.id);
      }
      return [...prev, item];
    });
  };
  const isInWishlist = (itemId) => {
    return wishlistItems.some((item) => item.id === itemId);
  };
  return {
    wishlistItems,
    toggleWishlist,
    isInWishlist,
  };
};



const Home = ({ featuredProducts, categories = [], heroAds = [], sideAds = [] }) => {
  const [showAnnouncementBar] = useState(true);
  const { addToCart } = useCart();

  // Map categories to add icons if missing (optional, can be done in component)
  // For now we pass raw categories
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleAddToCart = useCallback(
    async (product) => {
      try {
        const response = await window.axios.post('/cart/add', {
          product_id: product.id,
          quantity: 1,
          variants: {},
        });

        addToCart(product);

        if (typeof response?.data?.cartCount === 'number') {
          window.dispatchEvent(
            new CustomEvent('cart:updated', { detail: { count: response.data.cartCount, version: response?.data?.cartVersion } })
          );
        }

        showToast(`Added ${product.name} to cart`, 'success');
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          'Failed to add to cart. Please try again.';
        showToast(message, 'error');
        throw error;
      }
    },
    [addToCart, showToast]
  );

  const handleQuickView = useCallback((product) => {
    showToast(`Quick view for ${product.name} would open here`, 'info');
  }, [showToast]);

  const handleWishlistToggle = useCallback(
    (product) => {
      toggleWishlist(product);
      // Notification handled by Header component
    },
    [toggleWishlist]
  );

  const handleViewAllProducts = useCallback(() => {
    showToast('Products page is coming soon.', 'info');
  }, [showToast]);

  const handleViewAllCategories = useCallback(() => {
    showToast('Categories page is coming soon.', 'info');
  }, [showToast]);

  const handleViewAllSuppliers = useCallback(() => {
    showToast('Suppliers page is coming soon.', 'info');
  }, [showToast]);

  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 45, seconds: 18 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (num) => num.toString().padStart(2, '0');
  
  const handleAdsImageError = useCallback((e) => {
    e.target.onerror = null;
    const isLarge = !!e.target.closest('.homepage__ads-banner--large');
    e.target.src = isLarge
      ? 'https://picsum.photos/1200/700?random=1069'
      : 'https://picsum.photos/300/200?random=1011';
  }, []);
  
  const handleAdsSectionClick = useCallback((e) => {
    const img = e.target.closest('.ads-image');
    if (img) {
      const alt = img.getAttribute('alt') || 'Ad';
      showToast(`Ad clicked: ${alt}`, 'info');
    }
  }, [showToast]);

  return (
    <div className="app-layout homepage-layout">
      {toast && (
        <div
          className={`notification-toast ${toast.type}`}
          role={toast.type === 'error' ? 'alert' : 'status'}
          aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
          aria-atomic="true"
        >
          {toast.type === 'success' && <i className="fas fa-check-circle" aria-hidden="true"></i>}
          {toast.message}
        </div>
      )}
      <Header
        categoriesData={categories}
        showAnnouncementBar={showAnnouncementBar}
      />
      <div className="homepage">
        <HeroSection
          heroAds={heroAds}
          sideAds={sideAds}
          onSectionClick={handleAdsSectionClick}
          onImageError={handleAdsImageError}
          onShopNow={(ad) => {
            if (ad && ad.url) {
              if (ad.open_in_new_tab) {
                window.open(ad.url, '_blank');
              } else {
                window.location.href = ad.url;
              }
              return;
            }
            showToast('Shop Now', 'info');
          }}
        />

        

        <CategorySlider
          categories={categories}
          onViewAll={handleViewAllCategories}
          onCategoryClick={(category) =>
            showToast(`Category "${category.name}" is coming soon.`, 'info')
          }
        />

        {/* Flash Sale Banner */}
        <section className="homepage__flash-sale">
          <div className="container">
            <div className="homepage__flash-sale-content">
              <div className="homepage__flash-sale-header">
                <h2 className="homepage__flash-sale-title">Flash Sale</h2>
                <div className="homepage__flash-sale-timer">
                  <span className="homepage__timer-label">Ends in:</span>
                  <div className="homepage__timer">
                    <span className="homepage__time-unit">{formatTime(timeLeft.hours)}</span>
                    <span className="homepage__time-separator">:</span>
                    <span className="homepage__time-unit">{formatTime(timeLeft.minutes)}</span>
                    <span className="homepage__time-separator">:</span>
                    <span className="homepage__time-unit">{formatTime(timeLeft.seconds)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="homepage__view-all"
                  onClick={() => showToast('Flash sale page is coming soon.', 'info')}
                aria-label="View all flash sale items"
                >
                  View All
                </button>
              </div>

              <div className="homepage__flash-sale-products">
                {productsData.slice(0, 4).map((product) => (
                  <ProductCard
                    key={product.id}
                    product={{
                      ...product,
                      badge: '-30%',
                      originalPrice: (parseFloat(product.price) * 1.4).toFixed(2),
                    }}
                    onAddToCart={handleAddToCart}
                    onWishlistToggle={handleWishlistToggle}
                    isInWishlist={isInWishlist}
                    onQuickView={handleQuickView}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>


        <ProductSlider
          title="Trending Products"
          products={productsData.slice(0, 6)}
          onViewAll={() =>
            showToast('Trending products page is coming soon.', 'info')
          }
          viewAllLabel="View All"
          viewAllAriaLabel="View all trending products"
          onAddToCart={handleAddToCart}
          onWishlistToggle={handleWishlistToggle}
          isInWishlist={isInWishlist}
          onQuickView={handleQuickView}
        />

        <ProductSlider
          title="Recommended For You"
          products={productsData}
          onViewAll={() =>
            showToast('Recommendations page is coming soon.', 'info')
          }
          viewAllLabel="View All"
          viewAllAriaLabel="View all recommendations"
          onAddToCart={handleAddToCart}
          onWishlistToggle={handleWishlistToggle}
          isInWishlist={isInWishlist}
          onQuickView={handleQuickView}
        />

        <FeaturedProducts
          products={featuredProducts}
          onViewAll={handleViewAllProducts}
          onAddToCart={handleAddToCart}
          onWishlistToggle={handleWishlistToggle}
          isInWishlist={isInWishlist}
        />

        <BrandsSlider />

        <SuppliersSection
          suppliers={suppliersData}
          onViewAll={handleViewAllSuppliers}
        />
      </div>
      <Footer />
    </div>
  );
};

export default Home;
