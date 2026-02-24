import { usePage } from '@inertiajs/react';

export const useCurrency = () => {
    const { localization } = usePage().props;

    const formatMoney = (value) => {
        const numeric = typeof value === 'number' ? value : Number(value);
        const safe = Number.isFinite(numeric) ? numeric : 0;
        
        const locale = localization?.current_locale === 'ar' ? 'ar-SA' : 'en-US';
        const currency = localization?.currency_code || 'SAR';
        
        return new Intl.NumberFormat(locale, { 
            style: 'currency', 
            currency: currency,
            minimumFractionDigits: 2
        }).format(safe);
    };

    return { formatMoney, localization };
};
