import React, { useRef, useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Header from '../Components/Header';
import Footer from '../Components/Footer';
import '../../../../css/homepage/main.scss';

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

    if (!product) {
        return (
            <div className="app-layout homepage-layout product-details-page">
                <Head title="Product Not Found" />
                <Header categoriesData={categories} showAnnouncementBar={false} />
                <div className="product-details-container">
                    <div className="product-not-found">
                        <i className="fas fa-search"></i>
                        <h2 className="product-not-found-title">Product Not Found</h2>
                        <p className="product-not-found-text">The product you are looking for does not exist or has been removed.</p>
                        <Link href="/" className="btn-buy-now product-not-found-link">Back to Home</Link>
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

    const formatPrice = (price) => {
        const numeric = typeof price === 'number' ? price : Number(price);
        const safe = Number.isFinite(numeric) ? numeric : 0;
        return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(safe);
    };

    const baseImages =
        Array.isArray(product.images) && product.images.length > 0
            ? product.images
            : product.image
                ? [product.image]
                : [placeholderImage];

    const images = baseImages.map((img) =>
        getProductImageUrl(img, placeholderImage)
    );

    useEffect(() => {
        if (selectedImage > images.length - 1) {
            setSelectedImage(0);
        }
    }, [images.length, selectedImage]);

    const selectedColorName = product.colors?.[selectedColor]?.name || null;
    const currentVariantKey =
        selectedColorName && selectedSize ? `${selectedColorName}-${selectedSize}` : null;

    const currentVariant = currentVariantKey ? product.variants?.[currentVariantKey] : null;
    const displayPrice = currentVariant?.price ?? product.price;
    const displayStockRaw = currentVariant ? currentVariant.stock : product.stock;
    const displayStock = Number.isFinite(Number(displayStockRaw)) ? Number(displayStockRaw) : 0;
    const displaySku = currentVariant?.sku ?? (product.sku || 'N/A');

    useEffect(() => {
        if (displayStock > 0 && quantity > displayStock) {
            setQuantity(displayStock);
        }
        if (displayStock <= 0 && quantity !== 1) {
            setQuantity(1);
        }
    }, [displayStock, quantity]);

    const discountPercentage =
        product.old_price && Number(product.old_price) > Number(displayPrice)
            ? Math.round(((Number(product.old_price) - Number(displayPrice)) / Number(product.old_price)) * 100)
            : 0;

    const showFeedback = (type, message) => {
        setActionFeedback({ type, message });
        window.clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = window.setTimeout(() => setActionFeedback(null), 2500);
    };

    const handleAddToCart = () => {
        if (displayStock <= 0) {
            showFeedback('error', 'This item is out of stock.');
            return;
        }

        if (!Number.isFinite(quantity) || quantity < 1) {
            setQuantity(1);
            showFeedback('error', 'Please select a valid quantity.');
            return;
        }

        if (quantity > displayStock) {
            showFeedback('error', `Only ${displayStock} available for this selection.`);
            return;
        }

        const variants = {};
        if (selectedColorName) variants.color = selectedColorName;
        if (selectedSize) variants.size = selectedSize;

        window.axios
            .post('/cart/add', {
                product_id: product.id,
                quantity,
                variants,
            })
            .then((response) => {
                if (typeof response?.data?.cartCount === 'number') {
                    window.dispatchEvent(
                        new CustomEvent('cart:updated', { detail: { count: response.data.cartCount, version: response?.data?.cartVersion } })
                    );
                }
                showFeedback('success', 'Added to cart.');
            })
            .catch((error) => {
                const message =
                    error?.response?.data?.message ||
                    error?.message ||
                    'Failed to add to cart. Please try again.';
                showFeedback('error', message);
            });
    };

    const handleBuyNow = () => {
        if (displayStock <= 0) {
            showFeedback('error', 'This item is out of stock.');
            return;
        }

        if (!Number.isFinite(quantity) || quantity < 1) {
            setQuantity(1);
            showFeedback('error', 'Please select a valid quantity.');
            return;
        }

        if (quantity > displayStock) {
            showFeedback('error', `Only ${displayStock} available for this selection.`);
            return;
        }

        const variants = {};
        if (selectedColorName) variants.color = selectedColorName;
        if (selectedSize) variants.size = selectedSize;

        window.axios
            .post('/cart/add', {
                product_id: product.id,
                quantity,
                variants,
            })
            .then((response) => {
                if (typeof response?.data?.cartCount === 'number') {
                    window.dispatchEvent(
                        new CustomEvent('cart:updated', { detail: { count: response.data.cartCount, version: response?.data?.cartVersion } })
                    );
                }
                router.visit(route('checkout'));
            })
            .catch((error) => {
                const message =
                    error?.response?.data?.message ||
                    error?.message ||
                    'Failed to proceed to checkout. Please try again.';
                showFeedback('error', message);
            });
    };

    return (
        <div className="app-layout homepage-layout product-details-page">
            <Head title={product.name || 'Product Details'} />
            
            <Header categoriesData={categories} showAnnouncementBar={false} />

            <div className="product-details-container">
                <nav className="breadcrumb">
                    <Link href="/">Home</Link>
                    <span className="breadcrumb-separator">/</span>
                    <Link href="/">Products</Link>
                    <span className="breadcrumb-separator">/</span>
                    <span className="breadcrumb-current">{product.name}</span>
                </nav>

                <main className="product-main-layout">
                    <div className="product-gallery">
                        <div className="gallery-thumbnails">
                            {images.map((img, index) => (
                                <button
                                    key={index}
                                    className={`thumbnail-btn ${selectedImage === index ? 'active' : ''}`}
                                    onClick={() => handleImageSelect(index)}
                                    aria-label={`View image ${index + 1}`}
                                >
                                    <img src={img} alt={`Thumbnail ${index + 1}`} className="thumbnail-img" />
                                </button>
                            ))}
                        </div>
                        <div className="main-image-wrapper">
                            {!mainImageLoaded && (
                                <div className="main-image-skeleton skeleton-loader" aria-hidden="true"></div>
                            )}
                            <img 
                                src={images[selectedImage] || placeholderImage} 
                                alt={product.name} 
                                className={`main-img ${mainImageLoaded ? 'loaded' : ''}`}
                                onLoad={() => setMainImageLoaded(true)}
                                onError={(e) => {
                                    if (e.currentTarget.src !== placeholderImage) {
                                        e.currentTarget.src = placeholderImage;
                                    }
                                }}
                            />
                        </div>
                    </div>

                    <div className="product-info">
                        <h1 className="product-title">{product.name}</h1>
                        
                        <a href={product.store_url} className="store-link">
                            Visit {product.store_name}
                        </a>

                        <div className="rating-section">
                            <div className="stars">
                                {'★'.repeat(Math.floor(product.rating || 0))}
                                {'☆'.repeat(5 - Math.floor(product.rating || 0))}
                            </div>
                            <span className="review-count">({product.reviews || 0} Reviews)</span>
                            <span className="social-proof">100+ bought in past month</span>
                        </div>

                        {product.description && (
                            <div className="product-simple-description">
                                {product.description.split('\n').some(line => line.trim().startsWith('[') || line.trim().startsWith('-') || line.trim().startsWith('•')) ? (
                                    <div className="product-features-section">
                                        <h3 className="features-title">About this item</h3>
                                        <ul className="product-features-list">
                                            {product.description.split('\n').filter(line => line.trim()).map((line, i) => {
                                                const match = line.match(/^(\[.*?\])(.*)/);
                                                if (match) {
                                                    return (
                                                        <li key={i}>
                                                            <span className="feature-label">{match[1].replace(/[[\]]/g, '')}: </span>
                                                            <span className="feature-text">{match[2]}</span>
                                                        </li>
                                                    );
                                                }
                                                return <li key={i}>{line.replace(/^[-•]\s*/, '')}</li>;
                                            })}
                                        </ul>
                                    </div>
                                ) : (
                                    product.description
                                )}
                            </div>
                        )}

                        <div className="price-section">
                            <span className="current-price">{formatPrice(displayPrice)}</span>
                            {product.old_price && Number(product.old_price) > Number(displayPrice) && (
                                <>
                                    <span className="old-price">{formatPrice(product.old_price)}</span>
                                    <span className="discount-badge">
                                        -{discountPercentage}%
                                    </span>
                                </>
                            )}
                        </div>

                        <div className="variations-section">
                            {product.colors && product.colors.length > 0 && (
                                <div className="variation-group">
                                    <span className="variation-label">Color: {product.colors[selectedColor]?.name}</span>
                                    <div className="color-options">
                                        {product.colors.map((color, index) => (
                                            <button
                                                key={index}
                                                className={`color-btn ${selectedColor === index ? 'active' : ''}`}
                                                style={{ '--swatch-color': color.value }}
                                                onClick={() => setSelectedColor(index)}
                                                aria-label={`Select color ${color.name}`}
                                                title={color.name}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {product.sizes && product.sizes.length > 0 && (
                                <div className="variation-group">
                                    <span className="variation-label">Size: {selectedSize}</span>
                                    <div className="size-options">
                                        {product.sizes.map((size) => (
                                            <button
                                                key={size}
                                                className={`size-btn ${selectedSize === size ? 'active' : ''}`}
                                                onClick={() => setSelectedSize(size)}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="product-meta">
                            <span>SKU: {displaySku}</span>
                            <span>Category: {product.category_name || 'General'}</span>
                        </div>
                    </div>

                    <div className="purchase-box">
                        <div className="purchase-summary">
                            <div className="summary-price">{formatPrice(displayPrice)}</div>
                            <div className="delivery-info">
                                <span className="material-icons-outlined delivery-icon">local_shipping</span>
                                Free Delivery by {new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                            </div>
                            <div className={`stock-status ${displayStock > 0 ? 'stock-in' : 'stock-out'}`}>
                                {displayStock > 0 ? `In Stock (${displayStock} available)` : 'Out of Stock'}
                            </div>
                        </div>

                        <div className="quantity-control">
                            <label className="qty-label">Quantity:</label>
                            <select 
                                className="qty-select"
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
                                disabled={displayStock <= 0}
                            >
                                {[1, 2, 3, 4, 5, 10]
                                    .filter((num) => num <= Math.max(displayStock, 1))
                                    .map((num) => (
                                        <option key={num} value={num} disabled={num > displayStock}>{num}</option>
                                    ))}
                            </select>
                        </div>

                        {actionFeedback && (
                            <div className={`purchase-feedback ${actionFeedback.type}`}>
                                {actionFeedback.message}
                            </div>
                        )}

                        <div className="action-buttons">
                            <button 
                                className="btn-add-cart" 
                                disabled={displayStock <= 0}
                                onClick={handleAddToCart}
                            >
                                Add to Cart
                            </button>
                            <button 
                                className="btn-buy-now"
                                disabled={displayStock <= 0}
                                onClick={handleBuyNow}
                            >
                                Buy Now
                            </button>
                        </div>
                    </div>
                </main>

                {product.content && (
                    <section className="product-detailed-content">
                        <h2 className="section-title">Product Description</h2>
                        <div className="content-body">
                            {product.content}
                        </div>
                    </section>
                )}

            </div>

            <Footer />
        </div>
    );
}
