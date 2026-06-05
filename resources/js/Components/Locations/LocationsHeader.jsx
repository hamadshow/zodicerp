import React from 'react';
import LocationSearch from './LocationSearch';
import LocationToolbar from './LocationToolbar';

const LocationsHeader = ({ onSearch, onAdd, locale }) => {
    return (
        <div className="locations-header">
            <div className="locations-header__info">
                <h1>{locale === 'ar' ? 'دليل المواقع' : 'Locations Directory'}</h1>
                <p>{locale === 'ar' ? 'إدارة الدول والمحافظات والمدن' : 'Manage Countries, States and Cities'}</p>
            </div>
            
            <div className="locations-header__actions">
                <LocationToolbar 
                    onSearch={onSearch} 
                    onAdd={onAdd} 
                    locale={locale} 
                />
            </div>
        </div>
    );
};

export default React.memo(LocationsHeader);
