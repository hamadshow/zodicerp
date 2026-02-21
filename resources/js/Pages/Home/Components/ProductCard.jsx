import React, { useState } from 'react';
import { Link } from '@inertiajs/react';

const FALLBACK_IMAGE = 'https://via.placeholder.com/300x200';

const getProductImageUrl = (image) => {
  if (!image) return FALLBACK_IMAGE;

  if (typeof image === 'string' && /^https?:\/\//i.test(image)) {
    return image;
  }

  const withoutProtocol =
    typeof image === 'string' ? image.replace(/^https?:\/\/[^/]+/, '') : '';

  const relativePath = withoutProtocol.replace(
    /^\/?(files|storage|media-files)\//,
    ''
  );

  const url = relativePath ? `/media-files/${relativePath}` : '';
  return url || FALLBACK_IMAGE;
};

const ProductCard = ({
  product,
  onAddToCart,
  onWishlistToggle,
  isInWishlist,
  onQuickView,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAddToCart = async () => {
    if (isAdding) return;
    setIsAdding(true);
    try {
      if (onAddToCart) {
        await onAddToCart(product);
      }
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1200);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div
      className="product-card fade-in"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link
        href={route('product.details', product.id)}
        className="product-card-link-overlay"
        aria-label={`View ${product.name}`}
      />

      {product.badge && (
        <div className={`product-badge ${product.badge.toLowerCase()}`}>
          {product.badge}
        </div>
      )}
      <div className={`product-image-container ${!imageLoaded ? 'loading' : ''}`}>
        {!imageLoaded && <div className="skeleton-loader" />}
        <img
          src={getProductImageUrl(product.image)}
          alt={product.name}
          loading="lazy"
          className={`product-image ${imageLoaded ? 'loaded' : ''}`}
          onLoad={() => setImageLoaded(true)}
        />
        {isHovered && (
          <div className="product-overlay">
            <button className="quick-view-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onQuickView && onQuickView(product); }}>
              <i className="fas fa-eye"></i> Quick View
            </button>
          </div>
        )}
      </div>
      <div className="product-details">
        <h3 className="product-title">{product.name}</h3>
        <div className="product-price">
          ${product.price}
          {product.originalPrice && (
            <span className="product-original-price">
              ${product.originalPrice}
            </span>
          )}
        </div>
        <div className="product-info">
          <span className="product-moq">MOQ: {product.moq}</span>
          <span className="product-orders">Orders: {product.orders}</span>
        </div>
        <div className="product-meta">
          <span className="product-supplier">{product.supplier}</span>
          {product.verified && (
            <span className="verified-badge">
              <i className="fas fa-check-circle"></i> Verified
            </span>
          )}
        </div>
      <div className="product-actions">
          <button
            className="btn btn-primary"
            onClick={handleAddToCart}
            disabled={isAdding}
          >
            <i className="fas fa-shopping-cart"></i>
            {isAdding ? 'Adding...' : added ? 'Added' : 'Add to Cart'}
          </button>
          <button
            className={`btn btn-outline ${isInWishlist && isInWishlist(product.id) ? 'active' : ''}`}
            onClick={() => onWishlistToggle && onWishlistToggle(product)}
            title={
              isInWishlist && isInWishlist(product.id)
                ? 'Remove from wishlist'
                : 'Add to wishlist'
            }
          >
            <i
              className={`fas fa-heart ${isInWishlist && isInWishlist(product.id) ? 'filled' : ''}`}
            ></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
