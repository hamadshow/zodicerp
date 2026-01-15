import React from 'react';

const SupplierCard = ({ supplier }) => {
  return (
    <div className="supplier-card fade-in">
      <div className="supplier-logo">{supplier.name.charAt(0)}</div>
      <div className="supplier-info">
        <h3 className="supplier-name">{supplier.name}</h3>
        <div className="supplier-location">
          <i className="fas fa-map-marker-alt"></i>
          {supplier.location} • {supplier.years}
        </div>
        <div className="supplier-tags">
          {supplier.tags.map((tag, index) => (
            <span key={index} className="tag">
              {tag}
            </span>
          ))}
        </div>
        <div className="supplier-products">
          <i className="fas fa-box"></i> {supplier.products} Products
        </div>
      </div>
    </div>
  );
};

export default SupplierCard;
