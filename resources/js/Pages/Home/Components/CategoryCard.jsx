import React from 'react';

const CategoryCard = ({ category, onClick }) => {
  return (
    <button
      type="button"
      className="category-card fade-in"
      onClick={() => onClick && onClick(category)}
      aria-label={category?.name ? `Open category ${category.name}` : 'Open category'}
    >
      <div className="category-icon-large">
        <i className={`fas ${category.icon || 'fa-folder'}`} aria-hidden="true"></i>
      </div>
      <h3 className="category-name">{category.name}</h3>
    </button>
  );
};

export default CategoryCard;
