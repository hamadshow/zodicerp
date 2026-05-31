import { useCallback } from 'react';

export const useCodeGenerator = () => {
    const generateCode = useCallback((parent, children = [], options = {}) => {
        const {
            separator = '-',
            padding = 2,
            prefix = ''
        } = options;

        // Get the last sequence number from children
        let lastSequence = 0;
        if (children && children.length > 0) {
            const lastChild = children[children.length - 1];
            const codeParts = lastChild.code.split(separator);
            const lastPart = codeParts[codeParts.length - 1];
            lastSequence = parseInt(lastPart, 10) || 0;
        }

        const nextSequence = (lastSequence + 1).toString().padStart(padding, '0');
        
        if (!parent) {
            return `${prefix}${nextSequence}`;
        }

        return `${parent.code}${separator}${nextSequence}`;
    }, []);

    return { generateCode };
};
