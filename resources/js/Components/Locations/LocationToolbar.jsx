import React from 'react';
import LocationSearch from './LocationSearch';

const LocationToolbar = ({ onSearch, onAdd, locale }) => {
    return (
        <div className="locations-toolbar">
            <div className="locations-toolbar__branch-badge">
                {locale === 'ar' ? 'الفرع الرئيسي' : 'Main Branch'}
            </div>
            
            <LocationSearch onSearch={onSearch} locale={locale} />

            <button 
                onClick={onAdd}
                className="locations-toolbar__add-btn"
            >
                <i className="fa-solid fa-plus"></i>
                {locale === 'ar' ? 'إضافة موقع جديد' : 'Add New Location'}
            </button>
        </div>
    );
};

export default React.memo(LocationToolbar);
