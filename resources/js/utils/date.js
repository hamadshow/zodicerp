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

/**
 * Converts dd/mm/yyyy format to yyyy-mm-dd format for HTML date inputs.
 * @param {string} dateString - The date string in dd/mm/yyyy format (e.g., "12/04/2026").
 * @returns {string} - The formatted date string in yyyy-mm-dd format (e.g., "2026-04-12").
 */
export const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
        const parts = dateString.split('/');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
    } catch {
        return dateString;
    }
    return dateString;
};

/**
 * Converts yyyy-mm-dd format to dd/mm/yyyy format for display.
 * @param {string} dateString - The date string in yyyy-mm-dd format (e.g., "2026-04-12").
 * @returns {string} - The formatted date string in dd/mm/yyyy format (e.g., "12/04/2026").
 */
export const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    try {
        const parts = dateString.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
    } catch {
        return dateString;
    }
    return dateString;
};

/**
 * Validates if a string is in dd/MM/yyyy format with valid date values.
 * @param {string} dateString - The date string to validate.
 * @returns {boolean} - True if valid dd/MM/yyyy format with valid day/month/year, false otherwise.
 */
export const isValidDdMmYyyy = (dateString) => {
    if (!dateString || typeof dateString !== 'string') return false;
    
    // Check format pattern: dd/MM/yyyy
    const pattern = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!pattern.test(dateString)) return false;
    
    // Parse and validate date values
    const parts = dateString.split('/');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    // Validate month range (01-12)
    if (month < 1 || month > 12) return false;
    
    // Validate day range (01-31, considering month-specific limits)
    if (day < 1 || day > 31) return false;
    
    // Validate year range (reasonable years: 2000-2100)
    if (year < 2000 || year > 2100) return false;
    
    // Check for invalid date combinations (e.g., 31/02/2026)
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day > daysInMonth) return false;
    
    return true;
};

/**
 * Gets current date in dd/mm/yyyy format.
 * @returns {string} - Current date in dd/mm/yyyy format.
 */
export const getCurrentDateDdMmYyyy = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
};

/**
 * Gets current date in yyyy-mm-dd format for HTML date inputs.
 * @returns {string} - Current date in yyyy-mm-dd format.
 */
export const getCurrentDateYyyyMmDd = () => {
    return new Date().toISOString().slice(0, 10);
};

/**
 * Parses dd/MM/yyyy date string to Date object.
 * @param {string} dateString - Date in dd/MM/yyyy format.
 * @returns {Date|null} - Date object or null if invalid.
 */
export const parseDdMmYyyy = (dateString) => {
    if (!isValidDdMmYyyy(dateString)) return null;
    
    const parts = dateString.split('/');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-indexed
    const year = parseInt(parts[2], 10);
    
    return new Date(year, month, day);
};

/**
 * Compares two dd/MM/yyyy dates.
 * @param {string} date1 - First date in dd/MM/yyyy format.
 * @param {string} date2 - Second date in dd/MM/yyyy format.
 * @returns {number} - -1 if date1 < date2, 0 if equal, 1 if date1 > date2.
 */
export const compareDdMmYyyyDates = (date1, date2) => {
    const parsedDate1 = parseDdMmYyyy(date1);
    const parsedDate2 = parseDdMmYyyy(date2);
    
    if (!parsedDate1 || !parsedDate2) return 0;
    
    const time1 = parsedDate1.getTime();
    const time2 = parsedDate2.getTime();
    
    if (time1 < time2) return -1;
    if (time1 > time2) return 1;
    return 0;
};

/**
 * Formats Date object to dd/MM/yyyy string.
 * @param {Date} date - Date object.
 * @returns {string} - Formatted date string in dd/MM/yyyy format.
 */
export const formatDateToDdMmYyyy = (date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) return '';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
};
