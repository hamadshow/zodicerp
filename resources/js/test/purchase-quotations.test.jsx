import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.setConfig({ testTimeout: 30000 });

const mocks = vi.hoisted(() => ({
    pageProps: {
        localization: { current_locale: 'en', translations: {} },
        flash: {},
        errors: {},
    },
    postSpy: vi.fn(),
    putSpy: vi.fn(),
    deleteSpy: vi.fn(),
    getSpy: vi.fn(),
}));

vi.mock('xlsx', () => ({
    utils: {
        json_to_sheet: vi.fn(() => ({})),
        book_new: vi.fn(() => ({})),
        book_append_sheet: vi.fn(),
    },
    writeFile: vi.fn(),
}));

vi.mock('html2pdf.js', () => ({
    default: () => ({ set: () => ({ from: () => ({ save: () => Promise.resolve() }) }) }),
}));

vi.mock('@inertiajs/react', async () => {
    const ReactModule = await import('react');
    return {
        Head: () => null,
        router: { get: mocks.getSpy, delete: mocks.deleteSpy },
        usePage: () => ({ props: mocks.pageProps }),
        useForm: (initial) => {
            const [data, setDataState] = ReactModule.useState(initial);
            const setData = ReactModule.useCallback((key, value) => {
                setDataState((previous) => {
                    if (typeof key === 'function') return key(previous);
                    if (typeof key === 'object' && key !== null) return { ...previous, ...key };
                    return { ...previous, [key]: value };
                });
            }, []);

            return {
                data,
                setData,
                post: (...args) => mocks.postSpy(...args),
                put: (...args) => mocks.putSpy(...args),
                delete: (...args) => mocks.deleteSpy(...args),
                processing: false,
                errors: mocks.pageProps.errors,
                transform: () => {},
            };
        },
    };
});

vi.mock('../Pages/Backend/components/AdminLayout', () => ({
    default: ({ children }) => <div>{children}</div>,
}));

vi.mock('@/Components/BlankPage', () => ({
    default: ({ children, filters }) => <><header>{filters}</header>{children}</>,
}));

globalThis.route = (name, parameters = {}) => `/${name}/${parameters.quotation || ''}`;

import PurchaseQuotations from '../Pages/Backend/04-Purchases/Purchase_quotations.jsx';

const pageData = {
    quotations: { data: [], current_page: 1, last_page: 1, per_page: 10, total: 0, from: null, to: null },
    vendors: [{ id: 1, name_en: 'North Supplier', name_ar: 'المورد' }],
    currencies: [{ id: 1, name: 'Egyptian Pound', code: 'EGP' }],
    products: [{
        id: 12,
        display_name: 'Shirt, Black',
        name_en: 'Shirt',
        name_ar: 'قميص',
        sku: 'SH-12',
        purchase_price: 25,
        unit_id: 1,
        product_type: 'simple',
        units: [{ id: 1, name: 'Piece' }, { id: 2, name: 'Dozen' }],
    }],
    units: [{ id: 1, name: 'Piece' }, { id: 2, name: 'Dozen' }, { id: 99, name: 'Unrelated unit' }],
    warehouses: [],
    paymentTerms: [],
    deliveryTerms: [],
    filters: {},
};

describe('Purchase quotations page', () => {
    beforeEach(() => {
        mocks.pageProps.localization.current_locale = 'en';
        mocks.pageProps.flash = {};
        mocks.pageProps.errors = {};
        mocks.postSpy.mockClear();
        mocks.putSpy.mockClear();
        mocks.deleteSpy.mockClear();
        mocks.getSpy.mockClear();
    });

    it('offers product-specific units after choosing a sellable product', async () => {
        const user = userEvent.setup();
        render(<PurchaseQuotations {...pageData} />);

        await user.click(screen.getByRole('button', { name: /Create Quotation/i }));

        const productInput = screen.getByPlaceholderText('Select product');
        await user.click(productInput);
        await user.click(await screen.findByText('Shirt, Black', { selector: '.searchable-combobox-option' }));

        await waitFor(() => expect(screen.getByPlaceholderText('Select unit')).toHaveValue('Piece'));
        const unitInput = screen.getByPlaceholderText('Select unit');
        await user.click(unitInput);
        fireEvent.change(unitInput, { target: { value: '' } });

        expect(await screen.findByText('Dozen', { selector: '.searchable-combobox-option' })).toBeInTheDocument();
        expect(screen.queryByText('Unrelated unit')).not.toBeInTheDocument();
    });

    it('resets to page one and preserves the chosen filters when page size changes', async () => {
        const user = userEvent.setup();
        render(<PurchaseQuotations {...pageData} filters={{ search: 'shirt', status: 'draft', per_page: 25 }} quotations={{ ...pageData.quotations, current_page: 2, last_page: 3, per_page: 25, total: 62 }} />);

        const pageSize = screen.getByRole('combobox', { name: 'Page size' });
        await user.selectOptions(pageSize, '50');

        expect(mocks.getSpy).toHaveBeenCalledWith(
            '/admin.purchases.quotations.index/',
            { search: 'shirt', status: 'draft', per_page: 50, page: 1 },
            { preserveState: true, replace: true },
        );
    });

    it('loads a quotation opened directly in read-only mode', async () => {
        const user = userEvent.setup();
        const quotation = {
            id: 8,
            quotation_number: 'PQ-TEST-8',
            quotation_date: '2026-05-01',
            expiry_date: '2026-05-31',
            vendor_id: 1,
            currency_id: 1,
            exchange_rate: 1,
            status: 'draft',
            priority: 'medium',
            items: [{
                id: 31,
                item_type: 'product',
                product_id: 12,
                item_name_ar: 'قميص',
                item_name_en: 'Shirt',
                quantity: 1,
                unit_id: 1,
                unit_price: 25,
                discount_amount: 0,
                discount_percent: 0,
                tax_amount: 0,
            }],
        };

        render(<PurchaseQuotations {...pageData} initialMode="view" selectedQuotation={quotation} />);

        expect(await screen.findByDisplayValue('PQ-TEST-8')).toBeDisabled();
        expect(screen.getByLabelText('Item name (Arabic)')).toBeDisabled();
        await user.click(screen.getByRole('button', { name: 'Edit' }));
        expect(screen.getByLabelText('Item name (Arabic)')).not.toBeDisabled();
    });
});
