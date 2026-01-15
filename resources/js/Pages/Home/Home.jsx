import React, { useCallback, useState } from 'react';
import '../../../css/homepage/home.css';
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



const Home = ({ featuredProducts, categories = [] }) => {
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

  // Flash Sale Timer
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 45, seconds: 18 });

  React.useEffect(() => {
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
        {/* Hero Banner - Moved to top for better hierarchy */}
        <section className="homepage__hero">
          <div className="container">
            <div className="homepage__hero-content">
              <h1 className="homepage__hero-title">
                Discover Quality Products from Verified Global Suppliers
              </h1>
              <p className="homepage__hero-subtitle">
                ZodiMarket connects businesses worldwide with trusted suppliers
                for wholesale procurement and sustainable growth
              </p>
              <div className="homepage__hero-buttons">
                <button
                  type="button"
                  className="homepage__btn homepage__btn--primary homepage__btn--large"
                  onClick={() => showToast('Shopping flow is coming soon.', 'info')}
                >
                  <i className="fas fa-shopping-bag" aria-hidden="true"></i>
                  Start Shopping
                </button>
                <button
                  type="button"
                  className="homepage__btn homepage__btn--secondary homepage__btn--large"
                  onClick={() => showToast('Supplier onboarding is coming soon.', 'info')}
                >
                  <i className="fas fa-store" aria-hidden="true"></i>
                  Become a Supplier
                </button>
              </div>

              <div className="homepage__hero-stats">
                <div className="homepage__stat-item">
                  <div className="homepage__stat-number">200M+</div>
                  <div className="homepage__stat-label">Products</div>
                </div>
                <div className="homepage__stat-item">
                  <div className="homepage__stat-number">150K+</div>
                  <div className="homepage__stat-label">Suppliers</div>
                </div>
                <div className="homepage__stat-item">
                  <div className="homepage__stat-number">190+</div>
                  <div className="homepage__stat-label">Countries</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Section - Moved up for navigation */}
        <section className="homepage__categories-section">
          <div className="container">
            <div className="homepage__section-header">
              <h2 className="homepage__section-title">Top Categories</h2>
              <button
                type="button"
                className="homepage__view-all"
                onClick={handleViewAllCategories}
              >
                View All Categories
                <i className="fas fa-arrow-right" aria-hidden="true"></i>
              </button>
            </div>
            <CategoryRail
              categories={categories}
              onCategoryClick={(category) =>
                showToast(`Category "${category.name}" is coming soon.`, 'info')
              }
            />
          </div>
        </section>

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

        {/* Ads Section */}
        <section className="homepage__ads-section">
          <div className="container">
            <div className="homepage__ads-grid">
              {/* Left Side: Large Banner */}
              <div className="homepage__ads-main">
                <div className="homepage__ads-banner homepage__ads-banner--large">
                    <img 
                        src="https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80" 
                        alt="Main Ad" 
                        className="ads-image" 
                    />
                    <div className="ads-content-overlay">
                        <span className="ads-subtitle">Trending Brands</span>
                        <h3 className="ads-title">80% <small>OFF</small></h3>
                        <p className="ads-description">EXCLUSIVE BRANDS FOR LESS</p>
                    </div>
                </div>
              </div>

              {/* Right Side: 3 Small Banners */}
              <div className="homepage__ads-side">
                <div className="homepage__ads-banner homepage__ads-banner--small">
                    <img 
                        src="https://images.unsplash.com/photo-1483985988355-763728e1935b?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80" 
                        alt="Ad 1" 
                        className="ads-image" 
                    />
                    <div className="ads-brand-overlay">ROMWE</div>
                </div>
                <div className="homepage__ads-banner homepage__ads-banner--small">
                    <img 
                        src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80" 
                        alt="Ad 2" 
                        className="ads-image" 
                    />
                    <div className="ads-brand-overlay">EMERY ROSE</div>
                </div>
                <div className="homepage__ads-banner homepage__ads-banner--small">
                    <img 
                        src="https://images.unsplash.com/photo-1529139574466-a302d2052574?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80" 
                        alt="Ad 3" 
                        className="ads-image" 
                    />
                    <div className="ads-brand-overlay">MOTF</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trending Products */}
        <section className="homepage__trending-section">
          <div className="container">
            <div className="homepage__section-header">
              <h2 className="homepage__section-title">Trending Products</h2>
              <button
                type="button"
                className="homepage__view-all"
                onClick={() => showToast('Trending products page is coming soon.', 'info')}
              >
                View All
              </button>
            </div>
            <div className="homepage__products-grid">
              {productsData.slice(0, 6).map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                  onWishlistToggle={handleWishlistToggle}
                  isInWishlist={isInWishlist}
                  onQuickView={handleQuickView}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Recommended For You - Moved down */}
        <section className="homepage__products-section">
          <div className="container">
            <div className="homepage__section-header">
              <h2 className="homepage__section-title">Recommended For You</h2>
              <button
                type="button"
                className="homepage__view-all"
                onClick={() => showToast('Recommendations page is coming soon.', 'info')}
              >
                View All
              </button>
            </div>
            <div className="homepage__products-grid">
              {productsData.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                  onWishlistToggle={handleWishlistToggle}
                  isInWishlist={isInWishlist}
                  onQuickView={handleQuickView}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Featured Products Section */}
        <section className="homepage__products-section">
          <div className="container">
            <div className="homepage__section-header">
              <h2 className="homepage__section-title">Featured Products</h2>
              <button
                type="button"
                className="homepage__view-all"
                onClick={handleViewAllProducts}
              >
                View All Products
                <i className="fas fa-arrow-right" aria-hidden="true"></i>
              </button>
            </div>
            <div className="homepage__products-grid">
              {featuredProducts && featuredProducts.length > 0 ? (
                featuredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddToCart}
                    onWishlistToggle={handleWishlistToggle}
                    isInWishlist={isInWishlist}
                  />
                ))
              ) : (
                <div className="homepage__empty-state">
                  No featured products available at the moment.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Top Brands Section */}
        <section className="homepage__brands-section">
          <div className="container">
            <div className="homepage__section-header">
              <h2 className="homepage__section-title">Top Brands</h2>
              <button
                type="button"
                className="homepage__view-all"
                onClick={() => showToast('Brands page is coming soon.', 'info')}
              >
                View All
              </button>
            </div>
            <div className="homepage__brands-grid">
              <div className="homepage__brand-card">
                <div className="homepage__brand-logo">S</div>
                <h3 className="homepage__brand-name">Samsung</h3>
                <p className="homepage__brand-products">12,500+ products</p>
              </div>
              <div className="homepage__brand-card">
                <div className="homepage__brand-logo">A</div>
                <h3 className="homepage__brand-name">Apple</h3>
                <p className="homepage__brand-products">8,200+ products</p>
              </div>
              <div className="homepage__brand-card">
                <div className="homepage__brand-logo">X</div>
                <h3 className="homepage__brand-name">Xiaomi</h3>
                <p className="homepage__brand-products">15,800+ products</p>
              </div>
              <div className="homepage__brand-card">
                <div className="homepage__brand-logo">L</div>
                <h3 className="homepage__brand-name">LG</h3>
                <p className="homepage__brand-products">9,600+ products</p>
              </div>
              <div className="homepage__brand-card">
                <div className="homepage__brand-logo">T</div>
                <h3 className="homepage__brand-name">TCL</h3>
                <p className="homepage__brand-products">7,300+ products</p>
              </div>
              <div className="homepage__brand-card">
                <div className="homepage__brand-logo">H</div>
                <h3 className="homepage__brand-name">HP</h3>
                <p className="homepage__brand-products">11,400+ products</p>
              </div>
            </div>
          </div>
        </section>

        {/* Top Suppliers Section */}
        <section className="homepage__suppliers-section">
          <div className="container">
            <div className="homepage__section-header">
              <h2 className="homepage__section-title">
                Top Verified Suppliers
              </h2>
              <button
                type="button"
                className="homepage__view-all"
                onClick={handleViewAllSuppliers}
              >
                View All Suppliers
                <i className="fas fa-arrow-right" aria-hidden="true"></i>
              </button>
            </div>
            <div className="homepage__suppliers-grid">
              {suppliersData.map((supplier) => (
                <SupplierCard key={supplier.id} supplier={supplier} />
              ))}
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default Home;
