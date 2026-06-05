import React from 'react';

const LocationsTable = ({ locations, activeNode, onSelect, onEdit, onDelete, locale }) => {
    return (
        <div className="locations-list-card">
            <div className="locations-list-card__header">
                <h2>{locale === 'ar' ? 'جميع المواقع' : 'All Locations'}</h2>
                <span className="item-count">
                    {locations.length} {locale === 'ar' ? 'عنصر' : 'items'}
                </span>
            </div>

            <div className="locations-list-card__content">
                {locations.length > 0 ? (
                    locations.map((loc) => (
                        <div 
                            key={loc.id}
                            className={`location-row ${activeNode?.id === loc.id ? 'location-row--active' : ''}`}
                            onClick={() => onSelect(loc)}
                        >
                            <div className="location-row__info">
                                <div className="location-row__icon">
                                    {loc.code || loc.id}
                                </div>
                                <div className="location-row__details">
                                    <span className="name">
                                        {loc.name_json?.[locale] || loc.name}
                                    </span>
                                    <span className="type">
                                        {loc.location_type}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="location-row__actions">
                                <button 
                                    className="action-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelect(loc);
                                    }}
                                    title={locale === 'ar' ? 'عرض' : 'View'}
                                >
                                    <i className="fa-solid fa-eye"></i>
                                </button>
                                <button 
                                    className="action-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit(loc);
                                    }}
                                    title={locale === 'ar' ? 'تعديل' : 'Edit'}
                                >
                                    <i className="fa-solid fa-pen-to-square"></i>
                                </button>
                                <button 
                                    className="action-btn action-btn--delete"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(loc);
                                    }}
                                    title={locale === 'ar' ? 'حذف' : 'Delete'}
                                >
                                    <i className="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-8 text-center text-gray-500">
                        {locale === 'ar' ? 'لا توجد بيانات' : 'No data available'}
                    </div>
                )}
            </div>
        </div>
    );
};

export default React.memo(LocationsTable);
