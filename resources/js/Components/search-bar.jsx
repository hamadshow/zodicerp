import React from 'react';

const SearchBar = ({ 
    placeholder = "Search...", 
    value: propValue = "", 
    onChange, 
    onSearch,
    variant = "default", // 'default' or 'light'
    className = "",
    ...props 
}) => {
    const [localValue, setLocalValue] = React.useState(propValue);

    React.useEffect(() => {
        setLocalValue(propValue);
    }, [propValue]);

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        setLocalValue(newValue);
        if (onChange) {
            onChange(e);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && onSearch) {
            onSearch(localValue);
        }
    };

    return (
        <div className={`search-bar ${variant === 'light' ? 'light' : ''} ${className}`}>
            <input 
                type="text" 
                placeholder={placeholder} 
                value={localValue} 
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                {...props}
            />
            <button 
                type="button" 
                onClick={() => onSearch && onSearch(localValue)}
            >
                <span className="material-icons-outlined">search</span>
            </button>
        </div>
    );
};

export default SearchBar;
