import React, { useState, useEffect } from 'react';
import '../../../../css/homepage/header.scss';

export default function SearchBar({
  categoriesData = [],
  query,
  setQuery,
  onSearch,
}) {
  const [activeCategory, setActiveCategory] = useState(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!activeCategory && categoriesData.length > 0) {
      setActiveCategory(categoriesData[0]);
    }
  }, [categoriesData, activeCategory]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') onSearch();
  };

  return (
    <div className="search-section">
      <div className="search-container">
        <div className="search-input-group">
          <input
            type="text"
            className={`search-input ${focused ? 'focused' : ''}`}
            placeholder="Search for products, suppliers, or categories..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            aria-label="Search input"
          />
          <button
            type="button"
            className="search-btn"
            onClick={onSearch}
            aria-label="Search"
          >
            <i className="fas fa-search"></i>
            Search
          </button>
        </div>
      </div>
    </div>
  );
}
