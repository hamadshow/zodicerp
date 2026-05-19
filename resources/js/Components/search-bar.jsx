import React from 'react';

const SearchBar = ({ 
    placeholder = "Search...", 
    value = "", 
    onChange, 
    onSearch,
    variant = "default", // 'default' or 'light'
    className = "",
    ...props 
}) => {
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && onSearch) {
            onSearch(value);
        }
    };

    return (
        <div className={`search-bar ${variant === 'light' ? 'light' : ''} ${className}`}>
            <input 
                type="text" 
                placeholder={placeholder} 
                value={value} 
                onChange={onChange}
                onKeyDown={handleKeyDown}
                {...props}
            />
            <button 
                type="button" 
                onClick={() => onSearch && onSearch(value)}
            >
                <span className="material-icons-outlined">search</span>
            </button>
        </div>
    );
};

export default SearchBar;
