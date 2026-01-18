import React from 'react';
import CategoryCard from './CategoryCard';

export default function CategoryRail({ categories = [], onCategoryClick, trackRef }) {
  return (
    <div className="homepage__categories-rail" aria-label="Category navigation" ref={trackRef}>
      <div className="homepage__categories-rail-track" role="list">
        {categories.map((category, index) => (
          <div
            key={category?.id ?? category?.name ?? index}
            className="homepage__categories-item"
            role="listitem"
          >
            <CategoryCard category={category} onClick={onCategoryClick} />
          </div>
        ))}
      </div>
    </div>
  );
}
