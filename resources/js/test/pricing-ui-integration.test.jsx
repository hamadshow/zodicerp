import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
const routerSpy = { get: vi.fn(), visit: vi.fn(), delete: vi.fn(), reload: vi.fn() };

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
        router: {
            get: (...args) => routerSpy.get(...args),
            visit: (...args) => routerSpy.visit(...args),
            delete: (...args) => routerSpy.delete(...args),
            reload: (...args) => routerSpy.reload(...args),
        },
        usePage: () => ({ props: pageProps, url: '/sa/ar' }),
        useForm: (initial) => {
            const [data, setDataState] = ReactModule.useState(initial);

            // Mirrors @inertiajs/react: setData accepts a key/value pair, a partial object,
            // or an updater function.
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

vi.mock('@/Components/BlankPage', () => ({
    default: ({ children }) => <div>{children}</div>,
}));

vi.mock('@/Pages/Backend/components/Table', () => ({
    default: ({ tableData = [], onEdit }) => (
        <table>
            <tbody>
                {tableData.map((row) => (
                    <tr key={row.id}>
                        <td>{row.invoice_number || row.order_number}</td>
                        <td>
                            <button type="button" onClick={() => onEdit(row)}>
                                Edit
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    ),
}));

globalThis.route = (name) => `/${name}`;

import SalesOrders from '@/Pages/Backend/05-Client_Sales/Sales_Orders.jsx';
import SalesInvoice from '@/Pages/Backend/05-Client_Sales/SalesInvoice.jsx';

const PRODUCTS = [
    { id: 10, name_en: 'Simple Shirt', name_ar: 'قميص', sku: 'MEN-00099', sale_price: '120.00', price: '150.00', unit_id: 1 },
];
const CUSTOMERS = [{ id: 1, name_en: 'Acme', name_ar: 'أكمي', currency_id: 1 }];
const CURRENCIES = [{ id: 1, code: 'SAR', name: 'Saudi Riyal' }];
const UNITS = [{ id: 1, name_en: 'Piece', name_ar: 'قطعة' }];
const WAREHOUSES = [{ id: 1, name: 'Main', name_en: 'Main', name_ar: 'رئيسي' }];

const ORDER_ROW = {
    id: 7,
    order_number: 'SO-1',
    order_date: '2026-09-15',
    status: 'draft',
    priority: 'normal',
    currency: { code: 'SAR' },
    customer: { name_en: 'Acme' },
    // Stored (server) values deliberately different from anything the form would compute locally.
    subtotal: '300.00',
    discount_amount: '0.00',
    tax_amount: '20.00',
    shipping_cost: '30.00',
    total_amount: '350.00',
    exchange_rate: 1,
    items: [
        {
            id: 1,
            product_id: 10,
            item_name_ar: 'قميص',
            item_name_en: 'Simple Shirt',
            quantity: 1,
            unit_id: 1,
            unit_price: 999,
            discount_amount: 0,
            discount_percentage: 0,
            tax_amount: 0,
            line_total: 999,
        },
    ],
};

const INVOICE_ROW = {
    id: 5,
    invoice_number: 'SINV-1',
    invoice_date: '2026-09-15',
    due_date: '2026-10-15',
    invoice_type: 'standard',
    payment_status: 'unpaid',
    customer_id: 1,
    currency_id: 1,
    treasury_id: 1,
    exchange_rate: 1,
    subtotal: '300.00',
    discount_amount: '0.00',
    tax_amount: '20.00',
    shipping_cost: '30.00',
    other_charges: '0.00',
    total_amount: '350.00',
    balance_amount: '350.00',
    paid_amount: '0.00',
    details: [
        {
            id: 1,
            product_id: 10,
            warehouse_id: 1,
            quantity: 1,
            unit_id: 1,
            unit_price: 999,
            discount_amount: 0,
            tax_amount: 0,
            line_total: 999,
        },
    ],
};

const salesOrderProps = {
    orders: { data: [ORDER_ROW], current_page: 1, last_page: 1, total: 1, per_page: 10 },
    customers: CUSTOMERS,
    currencies: CURRENCIES,
    products: PRODUCTS,
    units: UNITS,
    warehouses: WAREHOUSES,
    customerAddresses: [],
};

const salesInvoiceProps = {
    invoices: { data: [INVOICE_ROW], current_page: 1, last_page: 1, total: 1, per_page: 10 },
    customers: CUSTOMERS,
    orders: [],
    currencies: CURRENCIES,
    products: PRODUCTS,
    salesAgents: [],
    units: UNITS,
    warehouses: WAREHOUSES,
    treasuries: [{ AccID: 1, AccName: 'Cash' }],
    filters: {},
};

describe('Sales Order pricing UI contract', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        pageProps.errors = {};
        pageProps.flash = {};
    });

    it('shows the backend rejection and keeps the form open when a product is refused', async () => {
        const user = userEvent.setup();
        const { rerender } = render(<SalesOrders {...salesOrderProps} />);

        await user.click(screen.getByRole('button', { name: /create order/i }));
        const saveButton = await screen.findByRole('button', { name: /save order/i });

        const backendMessage =
            'T-Shirt/SKU:MEN-00001 is a configurable parent product and cannot be sold directly. Please select one of its variant/SKU children.';

        postSpy.mockImplementation((url, options) => {
            pageProps.errors = { items: [backendMessage] };
            options?.onSuccess?.({ props: { errors: pageProps.errors } });
        });

        await user.click(saveButton);

        expect(postSpy).toHaveBeenCalledTimes(1);
        // Validation failure must not drop the user back into the list view.
        expect(screen.getByRole('button', { name: /save order/i })).toBeInTheDocument();

        rerender(<SalesOrders {...salesOrderProps} />);
        expect(screen.getByText(backendMessage)).toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveTextContent(/rejected this order/i);
    });

    it('labels grid prices as indicative and keeps server-resolved totals visible in edit mode', async () => {
        const user = userEvent.setup();
        render(<SalesOrders {...salesOrderProps} />);

        await user.click(screen.getByRole('button', { name: /^edit$/i }));

        expect(screen.getByText(/prices in this grid are indicative only/i)).toBeInTheDocument();
        expect(screen.getByText(/preview — calculated in this form, not final/i)).toBeInTheDocument();
        expect(screen.getByText(/saved totals — authoritative values returned by the server/i)).toBeInTheDocument();

        // Local preview is computed from the (stale, deliberately different) item price...
        expect(screen.getAllByText('999.00').length).toBeGreaterThan(0);
        // ...while the authoritative document total comes from the server props.
        expect(screen.getAllByText('350.00').length).toBeGreaterThan(0);
    });

    it('disambiguates products by SKU and marks the price input as indicative', async () => {
        const user = userEvent.setup();
        render(<SalesOrders {...salesOrderProps} />);

        await user.click(screen.getByRole('button', { name: /create order/i }));
        await screen.findByRole('button', { name: /save order/i });

        const optionTexts = Array.from(
            document.querySelectorAll('select.searchable-combobox-hidden-select option')
        ).map((option) => option.textContent);

        expect(optionTexts.some((text) => text.includes('MEN-00099'))).toBe(true);
        expect(document.querySelector('input.price-indicative')).not.toBeNull();
    });
});

describe('Sales Invoice pricing UI contract', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        pageProps.errors = {};
        pageProps.flash = {};
    });

    it('surfaces the backend rejection for a posted invoice instead of leaving the form silently', async () => {
        const user = userEvent.setup();
        const { rerender } = render(<SalesInvoice {...salesInvoiceProps} />);

        await user.click(screen.getByRole('button', { name: /^edit$/i }));
        const saveButton = await screen.findByRole('button', { name: /save invoice/i });

        const backendMessage = 'Posted sales invoices cannot be edited. Reverse and recreate the invoice instead.';

        putSpy.mockImplementation((url, options) => {
            pageProps.errors = { invoice: backendMessage };
            options?.onSuccess?.({ props: { errors: pageProps.errors } });
        });

        await user.click(saveButton);

        expect(putSpy).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('button', { name: /save invoice/i })).toBeInTheDocument();

        rerender(<SalesInvoice {...salesInvoiceProps} />);
        expect(screen.getByText(backendMessage)).toBeInTheDocument();
    });

    it('distinguishes the local preview from the saved server totals', async () => {
        const user = userEvent.setup();
        render(<SalesInvoice {...salesInvoiceProps} />);

        await user.click(screen.getByRole('button', { name: /^edit$/i }));

        expect(screen.getByText(/prices in this grid are indicative only/i)).toBeInTheDocument();
        expect(screen.getByText(/preview — calculated in this form, not final/i)).toBeInTheDocument();
        expect(screen.getByText(/saved totals — authoritative values returned by the server/i)).toBeInTheDocument();
        expect(screen.getAllByText('350.00').length).toBeGreaterThan(0);
    });
});
