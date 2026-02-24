import { usePage } from '@inertiajs/react';

export const useTranslation = () => {
    const { localization } = usePage().props;
    const translations = localization?.translations || {};

    const t = (key, fallback = null) => {
        // key can be 'group.key' or just 'key'
        return translations[key] || fallback || key;
    };

    return { t, translations };
};
