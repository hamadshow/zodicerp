import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.setConfig({ testTimeout: 30000 });

const mocks = vi.hoisted(() => ({
    pageProps: {
        localization: { current_locale: 'en', country_code: 'eg', translations: {} },
        flash: {},
        errors: {},
    },
    postSpy: vi.fn(),
    putSpy: vi.fn(),
    deleteSpy: vi.fn(),
    getSpy: vi.fn(),
}));

vi.mock('@inertiajs/react', async () => {
    const ReactModule = await import('react');
    return {
        Head: () => null,
        router: {
            get: mocks.getSpy,
            post: vi.fn(),
            delete: mocks.deleteSpy,
        },
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
                processing: false,
                errors: mocks.pageProps.errors,
            };
        },
    };
});

vi.mock('../Pages/Backend/components/AdminLayout', () => ({
    default: ({ children }) => <div data-testid="existing-admin-layout"><aside>ERP Sidebar</aside>{children}</div>,
}));

vi.mock('@/Components/BlankPage', () => ({
    default: ({ children }) => <>{children}</>,
}));

globalThis.route = (name, parameters = {}) => `/${name}/${parameters.goodsReceipt || ''}`;

import GoodsReceipt from '../Pages/Backend/04-Purchases/GoodsReceipt.jsx';

const pageData = {
    receipts: {
        data: [{
            id: 1,
            receipt_number: 'GRN-20261031-0001',
            order_id: 10,
            receipt_date: '2026-10-31',
            total_items: 1,
            total_quantity: 5,
            total_value: 50,
            status: 'draft',
            order: {
                po_number: 'PO-10',
                vendor: { name_en: 'North Supplier' },
            },
            warehouse: { name: 'Main Warehouse' },
        }],
        current_page: 1,
        last_page: 1,
        per_page: 25,
        total: 1,
        from: 1,
        to: 1,
    },
    purchaseOrders: [{
        id: 10,
        po_number: 'PO-10',
        status: 'approved',
        vendor: { name_en: 'North Supplier' },
        items: [{
            id: 50,
            product_id: 12,
            unit_id: 1,
            item_type: 'product',
            item_name_en: 'Shirt, Black',
            ordered_quantity: 5,
            pending_quantity: 5,
            unit_price: 10,
            product: { sku: 'SH-12' },
            unit_options: [
                { id: 1, name: 'Piece', conversion_factor: '1.000000' },
                { id: 2, name: 'Dozen', conversion_factor: '12.000000' },
            ],
        }],
    }],
    warehouses: [{ id: 7, name: 'Main Warehouse' }],
    filters: {},
};

describe('Goods Receipts In page', () => {
    beforeEach(() => {
        mocks.pageProps.localization.current_locale = 'en';
        mocks.pageProps.flash = {};
        mocks.pageProps.errors = {};
        mocks.postSpy.mockClear();
        mocks.putSpy.mockClear();
        mocks.deleteSpy.mockClear();
        mocks.getSpy.mockClear();
    });

    it('keeps the normal ERP layout and lists receipts with their workflow actions', () => {
        render(<GoodsReceipt {...pageData} />);

        expect(screen.getByTestId('existing-admin-layout')).toBeInTheDocument();
        expect(screen.getByText('ERP Sidebar')).toBeInTheDocument();
        expect(screen.getByText('GRN-20261031-0001')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'View' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    });

    it('loads PO lines and offers one searchable arrow per dropdown', async () => {
        const user = userEvent.setup();
        render(<GoodsReceipt {...pageData} />);

        await user.click(screen.getByRole('button', { name: 'New Receipt' }));
        const orderInput = screen.getByPlaceholderText('Select purchase order');
        await user.click(orderInput);
        await user.click(await screen.findByText(/PO-10 · North Supplier/, { selector: '.searchable-combobox-option' }));

        expect(screen.getByPlaceholderText('Select product')).toHaveValue('Shirt, Black (SH-12)');
        expect(screen.getByPlaceholderText('Select unit')).toHaveValue('Piece');
        expect(screen.getAllByText('5').length).toBeGreaterThan(0);

        const comboBoxes = document.querySelectorAll('.searchable-combobox-input-wrapper');
        const arrows = document.querySelectorAll('.searchable-combobox-arrow');
        expect(arrows).toHaveLength(comboBoxes.length);
    });

    it('converts the displayed unit cost when switching a row unit', async () => {
        const user = userEvent.setup();
        render(<GoodsReceipt {...pageData} />);

        await user.click(screen.getByRole('button', { name: 'New Receipt' }));
        await user.click(screen.getByPlaceholderText('Select purchase order'));
        await user.click(await screen.findByText(/PO-10 · North Supplier/, { selector: '.searchable-combobox-option' }));

        const unitInput = screen.getByPlaceholderText('Select unit');
        await user.click(unitInput);
        await user.click(await screen.findByText('Dozen', { selector: '.searchable-combobox-option' }));

        const unitRow = unitInput.closest('tr');
        expect(within(unitRow).getByDisplayValue('120')).toBeInTheDocument();
    });

    it('submits the selected receipt data to the existing store endpoint', async () => {
        const user = userEvent.setup();
        render(<GoodsReceipt {...pageData} />);

        await user.click(screen.getByRole('button', { name: 'New Receipt' }));
        await user.click(screen.getByPlaceholderText('Select purchase order'));
        await user.click(await screen.findByText(/PO-10 · North Supplier/, { selector: '.searchable-combobox-option' }));
        await user.click(screen.getByPlaceholderText('Select warehouse'));
        await user.click(await screen.findByText('Main Warehouse', { selector: '.searchable-combobox-option' }));

        const saveButton = screen.getByRole('button', { name: 'Save receipt' });
        fireEvent.submit(saveButton.closest('form'));
        expect(mocks.postSpy).toHaveBeenCalledWith(
            '/admin.purchases.goods-receipts.store/',
            expect.objectContaining({ preserveScroll: true, onSuccess: expect.any(Function) }),
        );
    });
});
