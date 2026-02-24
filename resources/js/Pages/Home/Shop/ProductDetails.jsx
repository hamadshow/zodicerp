import React, { useRef, useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Header from '../Components/Header';
import Footer from '../Components/Footer';
import '../../../../css/homepage/main.scss';
import { useCurrency } from '../../../Hooks/useCurrency';
import { useTranslation } from '../../../Hooks/useTranslation';

const getProductImageUrl = (image, fallback) => {
    if (!image) {
        return fallback;
    }

    if (typeof image === 'string' && /^https?:\/\//i.test(image)) {
        return image;
    }

    const withoutProtocol =
        typeof image === 'string' ? image.replace(/^https?:\/\/[^/]+/, '') : '';

    const relativePath = withoutProtocol.replace(
        /^\/?(files|storage|media-files)\//,
        ''
    );

    return `/media-files/${relativePath}`;
};

export default function ProductDetails({ product, categories = [] }) {
    const placeholderImage = 'https://via.placeholder.com/500x500';
    const { formatMoney, localization } = useCurrency();
    const { t } = useTranslation();

    const getLocalizedRoute = (name, params = {}) => {
        return route(name, {
            country: localization?.country_code || 'sa',
            lang: localization?.current_locale || 'ar',
            ...params
        });
    };

    if (!product) {
        return (
            <div className="app-layout homepage-layout product-details-page">
                <Head title={t('product.not_found', 'Product Not Found')} />
                <Header categoriesData={categories} showAnnouncementBar={false} />
                <div className="product-details-container">
                    <div className="product-not-found">
                        <i className="fas fa-search"></i>
                        <h2 className="product-not-found-title">{t('product.not_found', 'Product Not Found')}</h2>
                        <p className="product-not-found-text">{t('product.not_found_desc', 'The product you are looking for does not exist or has been removed.')}</p>
                        <Link href={getLocalizedRoute('home')} className="btn-buy-now product-not-found-link">{t('product.back_to_home', 'Back to Home')}</Link>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    const [selectedImage, setSelectedImage] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [selectedColor, setSelectedColor] = useState(0);
    const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || null);
    const [mainImageLoaded, setMainImageLoaded] = useState(false);
    const [actionFeedback, setActionFeedback] = useState(null);
    const feedbackTimerRef = useRef(null);

    useEffect(() => {
        setSelectedImage(0);
        setQuantity(1);
        setSelectedColor(0);
        setSelectedSize(product.sizes?.[0] || null);
        setMainImageLoaded(false);
        setActionFeedback(null);
    }, [product.id]);

    const handleImageSelect = (index) => {
        if (index !== selectedImage) {
            setSelectedImage(index);
            setMainImageLoaded(false);
        }
    };

    const selectedColorName = product.colors?.[selectedColor]?.name || null;
    
    let currentVariantKey = null;
    if (product.colors?.length && product.sizes?.length) {
         currentVariantKey = selectedColorName && selectedSize ? `${selectedColorName}-${selectedSize}` : null;
    } else if (product.colors?.length) {
         currentVariantKey = selectedColorName;
    } else if (product.sizes?.length) {
         currentVariantKey = selectedSize;
    }

    const currentVariant = currentVariantKey ? product.variants?.[currentVariantKey] : null;
    
    const displayPrice = currentVariant?.price || product.price;
    const displayOldPrice = currentVariant?.old_price || product.old_price;
    const hasDiscount = displayOldPrice && displayOldPrice > displayPrice;
    const discountPercentage = hasDiscount ? Math.round(((displayOldPrice - displayPrice) / displayOldPrice) * 100) : 0;

    const handleAddToCart = () => {
        setActionFeedback({ type: 'cart', message: 'Added to cart!' });
        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = setTimeout(() => setActionFeedback(null), 3000);
    };

    const handleAddToWishlist = () => {
        setActionFeedback({ type: 'wishlist', message: 'Added to wishlist!' });
        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = setTimeout(() => setActionFeedback(null), 3000);
    };

    const handleBuyNow = () => {
        handleAddToCart();
        router.visit(getLocalizedRoute('checkout.index'));
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: product.name,
                url: window.location.href
            }).catch(() => {
                setActionFeedback({ type: 'share', message: 'Link copied to clipboard!' });
            });
        } else {
            navigator.clipboard.writeText(window.location.href);
            setActionFeedback({ type: 'share', message: 'Link copied to clipboard!' });
        }
        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = setTimeout(() => setActionFeedback(null), 3000);
    };

    return (
        <div className="app-layout homepage-layout product-details-page">
            <Head title={`${product.name} | ZodiMarket`} />
            <Header categoriesData={categories} showAnnouncementBar={false} />
            
            <main className="product-details-container">
                {/* Breadcrumbs */}
                <nav className="product-breadcrumb">
                    <Link href={getLocalizedRoute('home')}>Home</Link>
                    <i className="fas fa-chevron-right"></i>
                    {product.categories?.[0] && (
                        <>
                            <Link href={getLocalizedRoute('products.index', { category: product.categories[0].slug })}>
                                {product.categories[0].name}
                            </Link>
                            <i className="fas fa-chevron-right"></i>
                        </>
                    )}
                    <span>{product.name}</span>
                </nav>

                <div className="product-details-grid">
                    {/* Image Gallery */}
                    <div className="product-gallery">
                        <div className="main-image-wrapper">
                            {!mainImageLoaded && <div className="image-skeleton"></div>}
                            <img 
                                src={getProductImageUrl(product.images?.[selectedImage], placeholderImage)} 
                                alt={product.name}
                                className={`main-image ${mainImageLoaded ? 'loaded' : ''}`}
                                onLoad={() => setMainImageLoaded(true)}
                            />
                            {hasDiscount && (
                                <div className="discount-badge">-{discountPercentage}%</div>
                            )}
                        </div>
                        <div className="thumbnail-list">
                            {product.images?.map((img, idx) => (
                                <button 
                                    key={idx}
                                    className={`thumbnail-item ${selectedImage === idx ? 'active' : ''}`}
                                    onClick={() => handleImageSelect(idx)}
                                >
                                    <img src={getProductImageUrl(img, placeholderImage)} alt={`${product.name} view ${idx + 1}`} />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Product Info */}
                    <div className="product-info">
                        <div className="product-header">
                            <h1 className="product-title">{product.name}</h1>
                            <div className="product-meta">
                                <div className="product-rating">
                                    <div className="stars">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <i key={star} className={`fas fa-star ${star <= (product.rating || 5) ? 'active' : ''}`}></i>
                                        ))}
                                    </div>
                                    <span className="rating-count">({product.reviews_count || 0} Reviews)</span>
                                </div>
                                <span className="product-sku">SKU: {product.sku || 'N/A'}</span>
                            </div>
                        </div>

                        <div className="product-pricing">
                            <span className="current-price">{formatMoney(displayPrice)}</span>
                            {hasDiscount && (
                                <div className="old-price-wrapper">
                                    <span className="old-price">{formatMoney(displayOldPrice)}</span>
                                    <span className="savings">Save {formatMoney(displayOldPrice - displayPrice)}</span>
                                </div>
                            )}
                        </div>

                        <p className="product-short-description">
                            {product.short_description || 'High-quality product from trusted suppliers.'}
                        </p>

                        <div className="product-options">
                            {/* Color Selection */}
                            {product.colors?.length > 0 && (
                                <div className="option-group">
                                    <label className="option-label">Color: <span>{product.colors[selectedColor].name}</span></label>
                                    <div className="color-options">
                                        {product.colors.map((color, idx) => (
                                            <button
                                                key={idx}
                                                className={`color-btn ${selectedColor === idx ? 'active' : ''}`}
                                                style={{ backgroundColor: color.hex }}
                                                onClick={() => setSelectedColor(idx)}
                                                title={color.name}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Size Selection */}
                            {product.sizes?.length > 0 && (
                                <div className="option-group">
                                    <label className="option-label">Size: <span>{selectedSize}</span></label>
                                    <div className="size-options">
                                        {product.sizes.map((size, idx) => (
                                            <button
                                                key={idx}
                                                className={`size-btn ${selectedSize === size ? 'active' : ''}`}
                                                onClick={() => setSelectedSize(size)}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Quantity Selection */}
                            <div className="option-group">
                                <label className="option-label">{t('product.quantity', 'Quantity')}</label>
                                <div className="quantity-selector">
                                    <button 
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        disabled={quantity <= 1}
                                    >
                                        <i className="fas fa-minus"></i>
                                    </button>
                                    <input 
                                        type="number" 
                                        value={quantity} 
                                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                        min="1"
                                    />
                                    <button onClick={() => setQuantity(quantity + 1)}>
                                        <i className="fas fa-plus"></i>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="product-actions">
                            <button className="btn-add-to-cart" onClick={handleAddToCart}>
                                <i className="fas fa-shopping-cart"></i> {t('cart.add_to_cart', 'Add to Cart')}
                            </button>
                            <button className="btn-buy-now" onClick={handleBuyNow}>{t('product.buy_now', 'Buy Now')}</button>
                            <div className="secondary-actions">
                                <button className="action-btn" onClick={handleAddToWishlist} title={t('cart.add_to_wishlist', 'Add to Wishlist')}>
                                    <i className="far fa-heart"></i>
                                </button>
                                <button className="action-btn" onClick={handleShare} title={t('product.share', 'Share')}>
                                    <i className="fas fa-share-alt"></i>
                                </button>
                            </div>
                        </div>

                        {actionFeedback && (
                            <div className={`action-feedback ${actionFeedback.type}`}>
                                <i className="fas fa-check-circle"></i>
                                {actionFeedback.message}
                            </div>
                        )}

                        <div className="product-summary-cards">
                            <div className="summary-card">
                                <i className="fas fa-truck"></i>
                                <div>
                                    <h6>{t('product.free_shipping', 'Free Shipping')}</h6>
                                    <p>{t('product.on_orders_over', 'On orders over')} {formatMoney(500)}</p>
                                </div>
                            </div>
                            <div className="summary-card">
                                <i className="fas fa-shield-alt"></i>
                                <div>
                                    <h6>{t('product.secure_payment', 'Secure Payment')}</h6>
                                    <p>{t('product.secure_payment_desc', '100% secure payment')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Product Tabs/Details */}
                <div className="product-details-tabs">
                    <div className="tabs-header">
                        <button className="tab-btn active">{t('product.description', 'Description')}</button>
                        <button className="tab-btn">{t('product.specifications', 'Specifications')}</button>
                        <button className="tab-btn">{t('product.reviews', 'Reviews')} ({product.reviews_count || 0})</button>
                    </div>
                    <div className="tab-content">
                        <div className="description-content" dangerouslySetInnerHTML={{ __html: product.description }}></div>
                    </div>
                </div>
            </main>

            <Footer />

            {/* Sticky Mobile Action Bar */}
            <div className="mobile-action-bar">
                <div className="summary-info">
                    <div className="summary-price">{formatMoney(displayPrice)}</div>
                    <div className="summary-stock">{t('product.in_stock', 'In Stock')}</div>
                </div>
                <button className="btn-buy-now" onClick={handleBuyNow}>{t('product.buy_now', 'Buy Now')}</button>
            </div>
        </div>
    );
}
