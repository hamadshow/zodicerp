import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ---------------------------------------------------------------------------
// Mutable Inertia page props: mutated per test to emulate a redirect-back
// response carrying server-side validation errors.
// ---------------------------------------------------------------------------
const pageProps = {
    localization: { current_locale: 'en', translations: {}, country_code: 'sa' },
    flash: {},
    errors: {},
    auth: { user: { name: 'Admin' } },
};

const postSpy = vi.fn();
const putSpy = vi.fn();
const deleteSpy = vi.fn();

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
        Link: ({ children, href }) => ReactModule.createElement('a', { href }, children),
        router: { get: vi.fn(), visit: vi.fn(), delete: vi.fn(), reload: vi.fn() },
        usePage: () => ({ props: pageProps, url: '/sa/ar' }),
        useForm: (initial) => {
            const [data, setDataState] = ReactModule.useState(initial);

            // Mirrors @inertiajs/react: setData accepts a key/value pair, a
            // partial object, or an updater function.
            const setData = (key, value) => {
                setDataState((prev) => {
                    if (typeof key === 'function') {
                        return key(prev);
                    }

                    if (typeof key === 'object' && key !== null) {
                        return { ...prev, ...key };
                    }

                    return { ...prev, [key]: value };
                });
            };

            return {
                data,
                setData,
                errors: pageProps.errors,
                processing: false,
                recentlySuccessful: false,
                post: (...args) => postSpy(...args),
                put: (...args) => putSpy(...args),
                delete: (...args) => deleteSpy(...args),
                reset: () => setDataState(initial),
                transform: () => {},
                clearErrors: () => {},
                setError: () => {},
            };
        },
    };
});

vi.mock('@/Pages/Backend/components/AdminLayout', () => ({
    default: ({ children }) => <div>{children}</div>,
}));

globalThis.route = (name) => `/${name}`;

import SalesQuotations from '@/Pages/Backend/05-Client_Sales/Sales_Quotations.jsx';

// Full-page render with portaled comboboxes is heavier than a unit render.
vi.setConfig({ testTimeout: 30000 });

// ---------------------------------------------------------------------------
// Fixtures mirroring the server contract: customers carry their price list
// linkage, priceLists are the active company lists, priceListPricing holds
// the sellable priced products (with priced units and quantity tiers) of
// each list.
// ---------------------------------------------------------------------------
const CUSTOMERS = [
    { id: 1, name_en: 'Acme Corp', name_ar: 'أكمي', currency_id: 1, price_list_id: 6, customer_group_id: null, group: null },
    { id: 2, name_en: 'No List Customer', name_ar: 'بدون قائمة', currency_id: 1, price_list_id: null, customer_group_id: null, group: null },
    { id: 3, name_en: 'Multi List Customer', name_ar: 'متعدد', currency_id: 1, price_list_id: 6, customer_group_id: 5, group: { id: 5, name_en: 'Group PL', price_list_id: 7 } },
];

const PRICE_LISTS = [
    { id: 6, code: 'PL-A', name_en: 'Retail', name_ar: 'تجزئة', price_type: 'retail', currency_id: 1, currency_code: 'SAR', valid_from: '2020-01-01', valid_to: null, is_active: true },
    { id: 7, code: 'PL-B', name_en: 'Wholesale', name_ar: 'جملة', price_type: 'wholesale', currency_id: 1, currency_code: 'SAR', valid_from: '2020-01-01', valid_to: '2027-12-31', is_active: true },
];

const PRICE_LIST_PRICING = [
    {
        price_list_id: 6,
        products: [
            {
                id: 10,
                name: 'Shirt Child',
                sku: 'SHIRT-1',
                product_type: 'simple',
                parent_id: 2,
                display_name: 'Shirt Parent, Black, XL, Adidas',
                unit_id: 1,
                units: [
                    { id: 3, name: 'قطعة', unit_type: 2, base_unit: 1, conversion_factor: '1.0000', display_name: 'قطعة' },
                    { id: 4, name: 'دستة', unit_type: 2, base_unit: 1, conversion_factor: '12.0000', display_name: 'دستة' },
                ],
                tiers: {
                    3: [{ min_quantity: '1.0000', final_price: '500.0000', effective_date: null, expiry_date: null }],
                    // min_quantity is stored in BASE pieces: 12 = 1 dozen,
                    // 24 = 2 dozen (the price list derives it from the unit's
                    // conversion factor).
                    4: [
                        { min_quantity: '12.0000', final_price: '2500.0000', effective_date: null, expiry_date: null },
                        { min_quantity: '24.0000', final_price: '2400.0000', effective_date: null, expiry_date: null },
                    ],
                },
            },
            {
                id: 20,
                name: 'Service Call',
                sku: 'SVC-1',
                product_type: 'service',
                parent_id: null,
                display_name: 'Service Call',
                unit_id: 3,
                units: [
                    { id: 3, name: 'قطعة', unit_type: 2, base_unit: 1, conversion_factor: '1.0000', display_name: 'قطعة' },
                ],
                tiers: {
                    3: [{ min_quantity: '1.0000', final_price: '200.0000', effective_date: null, expiry_date: null }],
                },
            },
        ],
    },
    {
        price_list_id: 7,
        products: [
            {
                id: 30,
                name: 'Bulk Item',
                sku: 'BULK-1',
                product_type: 'simple',
                parent_id: null,
                display_name: 'Bulk Item',
                unit_id: 3,
                units: [
                    { id: 3, name: 'قطعة', unit_type: 2, base_unit: 1, conversion_factor: '1.0000', display_name: 'قطعة' },
                ],
                tiers: {
                    3: [{ min_quantity: '1.0000', final_price: '50.0000', effective_date: null, expiry_date: null }],
                },
            },
            {
                // A single priced unit with a genuine minimum above one
                // unit: 24 base pieces = 2 cartons, so quantity 1 carton
                // is below the tier while the conversion factor (12) is not
                // the reason.
                id: 40,
                name: 'Carton Only',
                sku: 'CARTON-1',
                product_type: 'simple',
                parent_id: null,
                display_name: 'Carton Only',
                unit_id: 5,
                units: [
                    { id: 5, name: 'كرتونة', unit_type: 2, base_unit: 1, conversion_factor: '12.0000', display_name: 'كرتونة (12 قطعة)' },
                ],
                tiers: {
                    5: [{ min_quantity: '24.0000', final_price: '300.0000', effective_date: null, expiry_date: null }],
                },
            },
        ],
    },
];

const PRODUCTS = [
    { id: 10, name_en: 'Shirt Child', name_ar: 'قميص', sku: 'SHIRT-1', sale_price: 480, price: 520, unit_id: 1 },
    { id: 20, name_en: 'Service Call', name_ar: 'خدمة', sku: 'SVC-1', sale_price: 180, price: 220, unit_id: 3 },
    { id: 30, name_en: 'Bulk Item', name_ar: 'بضاعة', sku: 'BULK-1', sale_price: 45, price: 60, unit_id: 3 },
];
const UNITS = [
    { id: 3, name_en: 'قطعة', name_ar: 'قطعة' },
    { id: 4, name_en: 'دستة', name_ar: 'دستة' },
    { id: 5, name_en: 'Carton', name_ar: 'كرتونة' },
];
const CURRENCIES = [{ id: 1, code: 'SAR', name: 'Saudi Riyal' }];

const page = {
    quotations: { data: [], current_page: 1, last_page: 1, total: 0, per_page: 10 },
    customers: CUSTOMERS,
    currencies: CURRENCIES,
    products: PRODUCTS,
    units: UNITS,
    priceLists: PRICE_LISTS,
    priceListPricing: PRICE_LIST_PRICING,
    warehouses: [],
    salesAgents: [],
    customerAddresses: [],
    filters: {},
};

// ---------------------------------------------------------------------------
// Interaction helpers.
// ---------------------------------------------------------------------------
const hiddenSelects = () =>
    Array.from(document.querySelectorAll('select.searchable-combobox-hidden-select'));

const selectContaining = (text) =>
    hiddenSelects().find((s) =>
        Array.from(s.options).some((o) => (o.textContent || '').includes(text))
    );

const itemRows = () =>
    Array.from(document.querySelectorAll('.invoice-items-section tbody tr'));

const rowSelect = (rowIndex, comboIndex) =>
    itemRows()[rowIndex].querySelectorAll('select.searchable-combobox-hidden-select')[comboIndex];

const rowNumberInputs = (rowIndex) =>
    Array.from(itemRows()[rowIndex].querySelectorAll('input[type="number"]')); // qty, price, disc%, disc amt, tax

const rowOptionTexts = (rowIndex, comboIndex) =>
    Array.from(rowSelect(rowIndex, comboIndex).options).map((o) => o.textContent || '');

const openCreateForm = async (user) => {
    const utils = render(<SalesQuotations {...page} />);
    await user.click(screen.getByRole('button', { name: /create quotation/i }));
    await screen.findByRole('button', { name: /save quotation/i });

    return utils;
};

const startQuotationFor = async (user, customerId) => {
    const utils = await openCreateForm(user);
    const customerSelect = selectContaining('Acme');
    fireEvent.change(customerSelect, { target: { value: String(customerId) } });

    return utils;
};

describe('Sales Quotations pricing UI contract', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        pageProps.errors = {};
        pageProps.flash = {};
    });

    it('keeps the items section unusable until a customer is selected', async () => {
        const user = userEvent.setup();
        await openCreateForm(user);

        expect(
            screen.getByText(/select a customer to add quotation items/i)
        ).toBeInTheDocument();

        // No rows exist and none can be added; the product picker only
        // appears once the section is enabled.
        expect(screen.queryByPlaceholderText('Select Product')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /add item/i })).toBeDisabled();
        expect(screen.getByPlaceholderText('Select Customer First')).toBeDisabled();

        // Saving without a customer is blocked client side.
        await user.click(screen.getByRole('button', { name: /save quotation/i }));
        expect(postSpy).not.toHaveBeenCalled();
        expect(screen.getByRole('alert')).toHaveTextContent(/select a customer before saving/i);
    });

    it('disables items for a customer without any eligible price list', async () => {
        const user = userEvent.setup();
        await startQuotationFor(user, 2);

        expect(
            screen.getByText(/has no eligible price list/i)
        ).toBeInTheDocument();
        expect(screen.getByPlaceholderText('No Eligible Price List')).toBeDisabled();
        expect(screen.getByRole('button', { name: /add item/i })).toBeDisabled();
    });

    it('offers only the priced, sellable catalog of the selected price list', async () => {
        const user = userEvent.setup();
        await startQuotationFor(user, 1);
        await user.click(screen.getByRole('button', { name: /add item/i }));

        // Products: variation child (composite name) + service; nothing else.
        const productOptions = rowOptionTexts(0, 0);
        expect(productOptions).toEqual([
            'Select',
            'Shirt Parent, Black, XL, Adidas',
            'Service Call',
        ]);

        // Units stay empty until a product is picked.
        expect(rowSelect(0, 1).options).toHaveLength(1);

        fireEvent.change(rowSelect(0, 0), { target: { value: '10' } });

        // Only the units priced for THIS product in THIS list are offered.
        expect(rowOptionTexts(0, 1)).toEqual(['Select', 'قطعة', 'دستة']);
    });

    it('clears stale unit and price on product change and loads fresh values', async () => {
        const user = userEvent.setup();
        await startQuotationFor(user, 1);
        await user.click(screen.getByRole('button', { name: /add item/i }));

        fireEvent.change(rowSelect(0, 0), { target: { value: '10' } });
        // Two priced units: nothing auto-selected, no stale price.
        expect(rowSelect(0, 1).value).toBe('');
        expect(rowNumberInputs(0)[1].value).toBe('');

        fireEvent.change(rowSelect(0, 1), { target: { value: '3' } });
        expect(rowNumberInputs(0)[1].value).toBe('500.0000');

        // Switching to the service product reloads ITS unit and price only.
        fireEvent.change(rowSelect(0, 0), { target: { value: '20' } });
        expect(rowSelect(0, 1).value).toBe('3');
        expect(rowNumberInputs(0)[1].value).toBe('200.0000');
        expect(rowOptionTexts(0, 1)).toEqual(['Select', 'قطعة']);
    });

    it('prices a converted unit from quantity 1 and steps tiers in base quantity', async () => {
        const user = userEvent.setup();
        await startQuotationFor(user, 1);
        await user.click(screen.getByRole('button', { name: /add item/i }));
        fireEvent.change(rowSelect(0, 0), { target: { value: '10' } });

        // دستة (factor 12): the tier stored at min_quantity 12 means
        // "from 1 dozen" — quantity 1 is valid and priced immediately;
        // the conversion factor is never a minimum the user must enter.
        fireEvent.change(rowSelect(0, 1), { target: { value: '4' } });
        expect(rowNumberInputs(0)[1].value).toBe('2500.0000');
        expect(screen.queryByText(/priced from quantity/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/no price list price applies/i)).not.toBeInTheDocument();

        // 2 dozen = 24 base pieces reach the next stored tier.
        fireEvent.change(rowNumberInputs(0)[0], { target: { value: '2' } });
        expect(rowNumberInputs(0)[1].value).toBe('2400.0000');

        // Line total = entered quantity x price per dozen (2 x 2400):
        // the conversion factor is not applied a second time.
        expect(screen.getAllByText('4800.00').length).toBeGreaterThan(0);
    });

    it('never treats the conversion factor as a minimum quantity', async () => {
        const user = userEvent.setup();
        await startQuotationFor(user, 1);
        await user.click(screen.getByRole('button', { name: /add item/i }));
        fireEvent.change(rowSelect(0, 0), { target: { value: '10' } });
        fireEvent.change(rowSelect(0, 1), { target: { value: '4' } }); // dozen, factor 12

        const [qtyInput, priceInput] = rowNumberInputs(0);

        // 1, 2 and 11 dozen all stay valid: no minimum-quantity error is
        // caused by the conversion factor, and 12 is never demanded.
        for (const qty of ['1', '2', '11']) {
            fireEvent.change(qtyInput, { target: { value: qty } });
            expect(priceInput.value).not.toBe('');
            expect(screen.queryByText(/priced from quantity/i)).not.toBeInTheDocument();
            expect(screen.queryByText(/no price list price applies/i)).not.toBeInTheDocument();
        }

        // The piece unit keeps its existing behavior (factor 1, min 1).
        fireEvent.change(rowSelect(0, 1), { target: { value: '3' } });
        expect(priceInput.value).toBe('500.0000');
        fireEvent.change(qtyInput, { target: { value: '1' } });
        expect(screen.queryByText(/priced from quantity/i)).not.toBeInTheDocument();
    });

    it('explains the empty price when a single priced unit is auto-selected below its tier', async () => {
        const user = userEvent.setup();
        await startQuotationFor(user, 3);
        const priceListSelect = selectContaining('PL-B');
        fireEvent.change(priceListSelect, { target: { value: '7' } });
        await user.click(screen.getByRole('button', { name: /add item/i }));

        fireEvent.change(rowSelect(0, 0), { target: { value: '40' } });

        // One priced unit: it is pre-selected, but its tier starts at 24
        // base pieces (2 cartons). The row must say WHY the price is empty,
        // stated in the selected unit — not blame the conversion factor.
        expect(rowSelect(0, 1).value).toBe('5');
        expect(rowNumberInputs(0)[1].value).toBe('');
        expect(screen.getByText(/priced from quantity 2/i)).toBeInTheDocument();

        fireEvent.change(rowNumberInputs(0)[0], { target: { value: '2' } });
        expect(rowNumberInputs(0)[1].value).toBe('300.0000');
        expect(screen.queryByText(/priced from quantity 2/i)).not.toBeInTheDocument();
    });

    it('clears a stale price when the quantity drops below the priced tier', async () => {
        const user = userEvent.setup();
        await startQuotationFor(user, 3);
        const priceListSelect = selectContaining('PL-B');
        fireEvent.change(priceListSelect, { target: { value: '7' } });
        await user.click(screen.getByRole('button', { name: /add item/i }));
        fireEvent.change(rowSelect(0, 0), { target: { value: '40' } });

        fireEvent.change(rowNumberInputs(0)[0], { target: { value: '2' } });
        expect(rowNumberInputs(0)[1].value).toBe('300.0000');

        // Dropping below the genuine tier (24 base pieces = 2 cartons) must
        // not silently keep the old price.
        fireEvent.change(rowNumberInputs(0)[0], { target: { value: '1' } });
        expect(rowNumberInputs(0)[1].value).toBe('');
        expect(screen.getByText(/priced from quantity 2/i)).toBeInTheDocument();

        // And the unpriced row blocks saving instead of posting a zero price.
        await user.click(screen.getByRole('button', { name: /save quotation/i }));
        expect(postSpy).not.toHaveBeenCalled();
    });

    it('rejects negative prices, fractional quantities and mismatched prices', async () => {
        const user = userEvent.setup();
        await startQuotationFor(user, 1);
        await user.click(screen.getByRole('button', { name: /add item/i }));
        fireEvent.change(rowSelect(0, 0), { target: { value: '20' } }); // service, price 200

        const [qtyInput, priceInput] = rowNumberInputs(0);
        expect(priceInput.value).toBe('200.0000');

        fireEvent.change(priceInput, { target: { value: '-5' } });
        expect(priceInput.value).toBe('200.0000');
        expect(screen.getByText(/must be a non-negative number/i)).toBeInTheDocument();

        fireEvent.change(qtyInput, { target: { value: '1.5' } });
        expect(qtyInput.value).toBe('1');
        expect(screen.getByText(/whole number/i)).toBeInTheDocument();

        fireEvent.change(priceInput, { target: { value: '999' } });
        expect(
            screen.getByText(/must match the selected price list \(200\.0000\)/i)
        ).toBeInTheDocument();

        // Correcting the price clears the mismatch error and the form can post.
        fireEvent.change(priceInput, { target: { value: '200.0000' } });
        expect(
            screen.queryByText(/must match the selected price list/i)
        ).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /save quotation/i }));
        expect(postSpy).toHaveBeenCalledTimes(1);
        expect(postSpy.mock.calls[0][0]).toBe('/admin.client-sales.quotations.store');
    });

    it('requires an eligible price list when the customer has several', async () => {
        const user = userEvent.setup();
        await startQuotationFor(user, 3);

        // Two eligible lists: nothing preselected, section stays disabled.
        expect(screen.getByText(/select one of this customer's price lists/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /add item/i })).toBeDisabled();

        const priceListSelect = selectContaining('PL-A');
        expect(Array.from(priceListSelect.options).map((o) => o.value)).toEqual(['', '6', '7']);

        fireEvent.change(priceListSelect, { target: { value: '6' } });
        expect(screen.getByRole('button', { name: /add item/i })).toBeEnabled();

        await user.click(screen.getByRole('button', { name: /add item/i }));
        fireEvent.change(rowSelect(0, 0), { target: { value: '20' } });
        expect(rowNumberInputs(0)[1].value).toBe('200.0000');

        // Switching to the other eligible list clears items not priced there.
        fireEvent.change(priceListSelect, { target: { value: '7' } });
        expect(screen.getByText(/removed 1 item/i)).toBeInTheDocument();
        expect(itemRows()).toHaveLength(1); // empty-state row only

        await user.click(screen.getByRole('button', { name: /add item/i }));
        expect(rowOptionTexts(0, 0)).toContain('Bulk Item');
        expect(rowOptionTexts(0, 0)).not.toContain('Service Call');
    });

    it('recalculates totals and keeps the form open with server errors visible', async () => {
        const user = userEvent.setup();
        const { rerender } = await startQuotationFor(user, 1);
        await user.click(screen.getByRole('button', { name: /add item/i }));
        fireEvent.change(rowSelect(0, 0), { target: { value: '20' } });

        expect(screen.getAllByText('200.00').length).toBeGreaterThan(0);

        // Shipping flows into the grand total (200 + 30). Footer inputs are
        // Discount %, Discount Amount, Shipping, Total(read-only).
        const shippingInput = document.querySelectorAll('.invoice-totals input')[2];
        fireEvent.change(shippingInput, { target: { value: '30' } });
        expect(screen.getByDisplayValue('230')).toBeInTheDocument();
        expect(screen.getAllByText(/^230\.00/).length).toBeGreaterThan(0);

        // Backend validation failure must keep the form open and be visible.
        postSpy.mockImplementation((url, options) => {
            pageProps.errors = { items: ['The product no longer has a valid price.'] };
            options?.onSuccess?.({ props: { errors: pageProps.errors } });
        });

        await user.click(screen.getByRole('button', { name: /save quotation/i }));
        expect(postSpy).toHaveBeenCalledTimes(1);
        // Form stays open instead of silently returning to the list.
        expect(screen.getByRole('button', { name: /save quotation/i })).toBeInTheDocument();

        // A redirect-back response re-renders the page with the errors bag.
        rerender(<SalesQuotations {...page} />);
        expect(
            screen.getByText(/the product no longer has a valid price/i)
        ).toBeInTheDocument();
    });
});
