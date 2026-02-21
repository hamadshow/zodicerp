import React from 'react';

const resolveMediaUrl = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
    return value;
  }

  const withoutProtocol =
    typeof value === 'string' ? value.replace(/^https?:\/\/[^/]+/, '') : '';

  const relativePath = withoutProtocol.replace(
    /^\/?(files|storage|media-files)\//,
    ''
  );

  return `/media-files/${relativePath}`;
};

const CategoryCard = ({ category, onClick }) => {
  const imageUrl = category?.image ? resolveMediaUrl(category.image) : null;

  return (
    <button
      type="button"
      className="category-card fade-in"
      onClick={() => onClick && onClick(category)}
      aria-label={category?.name ? `Open category ${category.name}` : 'Open category'}
    >
      <div className="category-icon-large">
        {imageUrl ? (
          <img src={imageUrl} alt={category.name} className="category-image" />
        ) : (
          <i className={`fas ${category.icon || 'fa-folder'}`} aria-hidden="true"></i>
        )}
      </div>
      <h3 className="category-name">{category.name}</h3>
    </button>
  );
};

export default CategoryCard;
