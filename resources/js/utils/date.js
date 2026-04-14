/**
 * Formats a date string to dd/mm/yyyy format.
 * @param {string} dateString - The date string to format (e.g., "2026-04-12T00:00:00.000000Z").
 * @returns {string} - The formatted date string (e.g., "12/04/2026").
 */
export const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
        const datePart = dateString.split('T')[0];
        const parts = datePart.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
    } catch {
        return dateString;
    }
    return dateString;
};
