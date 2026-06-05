import React from 'react';

const LocationSearch = ({ onSearch, locale }) => {
    return (
        <div className="locations-toolbar__search">
            <input 
                type="text" 
                onChange={(e) => onSearch(e.target.value)}
                placeholder={locale === 'ar' ? 'البحث بالاسم أو الكود...' : 'Search by name or code...'}
            />
            <i className="fa-solid fa-magnifying-glass"></i>
        </div>
    );
};

export default React.memo(LocationSearch);
