import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const pageProps = {
    localization: { current_locale: 'en', country_code: 'sa', translations: {} },
    errors: {},
};
const postSpy = vi.fn();
const putSpy = vi.fn();

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
        router: { get: vi.fn(), reload: vi.fn(), delete: vi.fn() },
        usePage: () => ({ props: pageProps }),
        useForm: (initialData) => {
            const [data, setDataState] = ReactModule.useState(initialData);
            const setData = (key, value) => setDataState((previous) => {
                if (typeof key === 'function') return key(previous);
                if (typeof key === 'object') return { ...previous, ...key };
                return { ...previous, [key]: value };
            });

            return {
                data,
                setData,
                errors: pageProps.errors,
                processing: false,
                reset: () => setDataState(initialData),
                post: (url, options) => postSpy(url, data, options),
                put: (url, options) => putSpy(url, data, options),
                delete: vi.fn(),
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
    default: ({ onAdd, onEdit, tableData = [] }) => (
        <div>
            <button type="button" onClick={onAdd}>Create Opening Stock</button>
            {tableData.map((row) => (
                <div key={row.id}>
                    {row.voucher_num}
                    <button type="button" onClick={() => onEdit?.(row)}>Edit Opening Stock</button>
                </div>
            ))}
        </div>
    ),
}));

vi.mock('@/Pages/Backend/components/Pagination', () => ({
    default: () => null,
}));

globalThis.route = (name, params = {}) => `/${name}?${new URLSearchParams(params).toString()}`;

import OpeningStock from '@/Pages/Backend/03-Inventory/OpeningStock.jsx';

const products = [
    {
        id: 101,
        name: 'Variant SKU',
        display_name: 'Shirt / Black / XL / Adidas',
        sku: 'SKU-VARIANT',
        unit_id: 1,
        cost_per_item: '12.00',
        unit_options: [
            { id: 1, name: 'Piece', unit_type: 1, base_unit: null, conversion_factor: '1.0000' },
            { id: 2, name: 'Dozen', unit_type: 2, base_unit: 1, conversion_factor: '12.0000' },
        ],
    },
    {
        id: 202,
        name: 'Pair Product',
        display_name: 'Pair Product',
        sku: 'SKU-PAIR',
        unit_id: 3,
        cost_per_item: '4.00',
        unit_options: [
            { id: 3, name: 'Pair', unit_type: 1, base_unit: null, conversion_factor: '1.0000' },
        ],
    },
];

const renderPage = (openingStockRows = []) => render(
    <OpeningStock
        openingStocks={{
            data: openingStockRows,
            current_page: 1,
            last_page: 1,
            total: openingStockRows.length,
            per_page: 25,
        }}
        warehouses={[{ id: 55, name: 'Main Warehouse' }]}
        products={products}
    />
);

const chooseProduct = async (user, term, label) => {
    const search = screen.getByPlaceholderText('Select Product');
    await user.clear(search);
    await user.type(search, term);
    await waitFor(() => expect(document.querySelector('.searchable-combobox-option')).toBeInTheDocument());
    const option = [...document.querySelectorAll('.searchable-combobox-option')]
        .find((element) => element.textContent.replace(/\s+/g, ' ').trim() === label);
    expect(option).toBeTruthy();
    fireEvent.mouseDown(option);
};

describe('Opening Stock item form', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('keeps the document warehouse, selects child IDs, scopes units, and preserves line calculations', async () => {
        const user = userEvent.setup();
        renderPage();

        await user.click(screen.getByRole('button', { name: 'Create Opening Stock' }));

        const itemsTable = document.querySelector('.invoice-items-section table');
        expect(within(itemsTable).queryByRole('columnheader', { name: 'Warehouse' })).not.toBeInTheDocument();
        expect(within(itemsTable).getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
            '#', 'Item', 'Unit', 'Qty', 'Cost Price', 'Total', 'Actions',
        ]);

        const documentWarehouse = document.querySelector('.invoice-info-grid select');
        await user.selectOptions(documentWarehouse, '55');
        expect(documentWarehouse).toHaveValue('55');

        await chooseProduct(user, 'SKU-VARIANT', 'Shirt / Black / XL / Adidas (SKU-VARIANT)');
        const itemUnit = document.querySelectorAll('.invoice-items-section select')[1];
        expect([...itemUnit.options].map((option) => option.value)).toEqual(['', '1', '2']);
        await user.selectOptions(itemUnit, '2');

        await chooseProduct(user, 'SKU-PAIR', 'Pair Product (SKU-PAIR)');
        expect([...itemUnit.options].map((option) => option.value)).toEqual(['', '3']);
        expect(itemUnit).toHaveValue('3');

        await chooseProduct(user, 'SKU-VARIANT', 'Shirt / Black / XL / Adidas (SKU-VARIANT)');
        expect([...itemUnit.options].map((option) => option.value)).toEqual(['', '1', '2']);
        await user.selectOptions(itemUnit, '2');

        const numbers = document.querySelectorAll('.invoice-items-section input[type="number"]');
        fireEvent.change(numbers[0], { target: { value: '2' } });
        fireEvent.change(numbers[1], { target: { value: '12' } });
        await waitFor(() => expect(document.querySelector('.invoice-items-section input[disabled]')).toHaveValue('24.00'));
        expect(document.querySelector('.grand-total span:last-child')).toHaveTextContent('24.00');

        await user.click(screen.getByRole('button', { name: '+ Add Line Item' }));
        expect(within(itemsTable).getAllByRole('row')).toHaveLength(3);
        fireEvent.click(within(itemsTable).getAllByRole('button').at(-1));
        expect(within(itemsTable).getAllByRole('row')).toHaveLength(2);

        await user.click(screen.getByRole('button', { name: 'Save Opening Stock' }));
        await waitFor(() => expect(postSpy).toHaveBeenCalled());
        const [url, submitted] = postSpy.mock.calls[0];
        expect(url).toContain('admin.inventory.opening-stock.store');
        expect(submitted.warehouse_id).toBe('55');
        expect(submitted.items[0]).toMatchObject({
            product_id: '101',
            unit_id: '2',
            quantity: '2',
            cost_price: '12',
        });
        expect(submitted.items[0]).not.toHaveProperty('warehouse_id');
    }, 20000);

    it('loads saved document-unit quantity, cost, and unit when editing', async () => {
        const existingOpeningStock = {
            id: 77,
            voucher_num: 'OS-77',
            movement_date: '2026-01-15',
            warehouse_id: 55,
            items: [{
                id: 88,
                product_id: 101,
                unit_id: 2,
                quantity: '24.000000',
                original_quantity: '2.000000',
                conversion_factor_snapshot: '12.000000',
                cost_price: '1.000000',
                product: { name_en: 'Variant SKU' },
            }],
        };
        const user = userEvent.setup();
        renderPage([existingOpeningStock]);

        await user.click(screen.getByRole('button', { name: 'Edit Opening Stock' }));

        expect(document.querySelector('.invoice-info-grid select')).toHaveValue('55');
        expect(document.querySelectorAll('.invoice-items-section select')[1]).toHaveValue('2');
        const numericInputs = document.querySelectorAll('.invoice-items-section input[type="number"]');
        expect(numericInputs[0]).toHaveValue(2);
        expect(numericInputs[1]).toHaveValue(12);
        expect(document.querySelector('.invoice-items-section input[disabled]')).toHaveValue('24.00');

        await user.click(screen.getByRole('button', { name: 'Save Opening Stock' }));
        await waitFor(() => expect(putSpy).toHaveBeenCalled());
        const [url, submitted] = putSpy.mock.calls[0];
        expect(url).toContain('admin.inventory.opening-stock.update');
        expect(url).toContain('openingStock=77');
        expect(postSpy).not.toHaveBeenCalled();
        expect(submitted.items[0]).toMatchObject({
            product_id: 101,
            unit_id: '2',
            quantity: 2,
            cost_price: 12,
        });
    });
});
