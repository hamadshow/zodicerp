import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Inventory -> Price Lists screen.
 *
 * These tests only assert how the UI consumes the existing backend contract:
 * listing/пagination props, server-resolved prices, server-derived validity
 * status, and that writes are posted to the real endpoints. No pricing logic of
 * its own is expected from the screen.
 */

const getSpy = vi.fn();
const postSpy = vi.fn();
const putSpy = vi.fn();
const deleteSpy = vi.fn();
const reloadSpy = vi.fn();

let pageProps = {};
let formErrors = {};

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({ children }) => <span>{children}</span>,
    router: {
        get: (...args) => getSpy(...args),
        post: (...args) => postSpy(...args),
        put: (...args) => putSpy(...args),
        delete: (...args) => deleteSpy(...args),
        reload: (...args) => reloadSpy(...args),
        visit: vi.fn(),
    },
    usePage: () => ({ props: pageProps }),
    useForm: (initialData) => {
        const [data, setDataState] = React.useState(initialData);

        const setData = React.useCallback((key, value) => {
            setDataState((previous) =>
                typeof key === 'object' ? { ...previous, ...key } : { ...previous, [key]: value }
            );
        }, []);

        return {
            data,
            setData,
            errors: formErrors,
            processing: false,
            progress: null,
            reset: () => setDataState(initialData),
            post: (...args) => postSpy(...args),
            put: (...args) => putSpy(...args),
            delete: (...args) => deleteSpy(...args),
            patch: vi.fn(),
            transform: vi.fn(),
        };
    },
}));

vi.mock('@/Pages/Backend/components/AdminLayout', () => ({
    default: ({ children }) => <div>{children}</div>,
}));

globalThis.route = (name, params = {}) => {
    const query = Object.keys(params).length > 0 ? `?${new URLSearchParams(params).toString()}` : '';

    return `/${name}${query}`;
};

import PriceLists from '@/Pages/Backend/03-Inventory/PriceLists.jsx';

const translations = {
    'PriceLists.title': 'Price Lists',
    'PriceLists.server_note': 'Final selling prices are always resolved on the server',
    'PriceLists.total_lists': 'Price Lists',
    'PriceLists.active_lists': 'Active',
    'PriceLists.scheduled_lists': 'Scheduled',
    'PriceLists.total_tiers': 'Pricing Items',
    'PriceLists.code': 'Code',
    'PriceLists.name': 'Name',
    'PriceLists.price_type': 'Price Type',
    'PriceLists.currency': 'Currency',
    'PriceLists.valid_from': 'Valid From',
    'PriceLists.valid_to': 'Valid To',
    'PriceLists.status': 'Status',
    'PriceLists.items_count': 'Items',
    'PriceLists.assigned_to': 'Assigned To',
    'PriceLists.retail': 'Retail',
    'PriceLists.wholesale': 'Wholesale',
    'PriceLists.inactive': 'Inactive',
    'PriceLists.all': 'All',
    'PriceLists.filter_status': 'Filter Status',
    'PriceLists.filter_price_type': 'Filter Price Type',
    'PriceLists.filter_currency': 'Filter Currency',
    'PriceLists.filter_validity': 'Filter Validity',
    'PriceLists.filter_product': 'Filter Product',
    'PriceLists.filter_unit': 'Filter Unit',
    'PriceLists.clear_filters': 'Clear filters',
    'PriceLists.search_lists': 'Search price lists',
    'PriceLists.create_list': 'Create Price List',
    'PriceLists.edit_list': 'Edit Price List',
    'PriceLists.manage_items': 'Pricing Items',
    'PriceLists.add_item': 'Add Pricing Item',
    'PriceLists.save': 'Save',
    'PriceLists.saving': 'Saving...',
    'PriceLists.cancel': 'Cancel',
    'PriceLists.close': 'Close',
    'PriceLists.name_ar': 'Name (Arabic)',
    'PriceLists.name_en': 'Name (English)',
    'PriceLists.code_hint': 'Leave empty to auto-generate',
    'PriceLists.rounding_method': 'Rounding Method',
    'PriceLists.rounding_factor': 'Rounding Factor',
    'PriceLists.rounding_none': 'None',
    'PriceLists.rounding_up': 'Up',
    'PriceLists.rounding': 'Rounding',
    'PriceLists.subtitle': 'Define quantity-tier pricing per product, unit and validity period.',
    'PriceLists.empty': 'No price lists found. Create the first one to define quantity-tier pricing.',
    'PriceLists.empty_filtered': 'No price lists match the current filters.',
    'PriceLists.section_information': 'Price List Information',
    'PriceLists.save_list': 'Save Price List',
    'PriceLists.update_list': 'Update Price List',
    'PriceLists.back_to_list': 'Back to Price Lists',
    'PriceLists.delete_list': 'Delete',
    'PriceLists.validation_summary': 'Please correct the highlighted fields and try again.',
    'PriceLists.is_active': 'Active',
    'PriceLists.is_default': 'Default price list',
    'PriceLists.notes': 'Notes',
    'PriceLists.product': 'Product',
    'PriceLists.sku': 'SKU',
    'PriceLists.unit': 'Unit',
    'PriceLists.min_quantity': 'Min Qty',
    'PriceLists.unit_price': 'Unit Price',
    'PriceLists.discount_percentage': 'Discount %',
    'PriceLists.discount_amount': 'Discount Amount',
    'PriceLists.final_price': 'Final Price',
    'PriceLists.effective_date': 'Effective Date',
    'PriceLists.expiry_date': 'Expiry Date',
    'PriceLists.item_status': 'Validity',
    'PriceLists.tier_label': ':quantity+',
    'PriceLists.conversion_hint': '1 :unit = :factor :base',
    'PriceLists.tier_ladder': 'Quantity Tiers',
    'PriceLists.tier_ladder_hint': 'Configured steps for the selected product.',
    'PriceLists.search_product': 'Search product',
    'PriceLists.select_unit': 'Select a unit',
    'PriceLists.indicative_product_price': 'Indicative product price',
    'PriceLists.estimated_final': 'Estimated (saved value is authoritative)',
    'PriceLists.assignment_hint': 'Assign from customers screen',
    'PriceLists.assignments_hint': 'Assign this price list from the Customers screen',
    'PriceLists.validity_period': 'Validity',
    'PriceLists.products_priced': 'Products Priced',
    'PriceLists.active_tiers': 'Active Items',
    'PriceLists.expired_tiers': 'Expired Items',
    'PriceLists.delete_confirm': 'Delete this price list?',
    'PriceLists.delete_confirm_assigned': 'Delete this price list? :customers customers, :groups groups',
    'PriceLists.delete_item_confirm': 'Delete this pricing item?',
    'PriceLists.created_success': 'created',
};

const priceListRow = {
    id: 7,
    code: 'PL-0007',
    name_ar: 'قائمة الجملة',
    name_en: 'Wholesale List',
    currency_id: 1,
    price_type: 'wholesale',
    valid_from: '2026-01-01',
    valid_to: '2026-12-31',
    is_active: true,
    is_default: false,
    items_count: 7,
    assigned_customers_count: 2,
    assigned_groups_count: 1,
    currency: { id: 1, code: 'EGP', name: 'Egyptian Pound' },
};

const priceListsPaginator = {
    data: [priceListRow],
    current_page: 1,
    last_page: 3,
    total: 25,
    per_page: 10,
};

const itemRow = {
    id: 42,
    price_list_id: 7,
    product_id: 5,
    unit_id: 9,
    min_quantity: '10.0000',
    unit_price: '100.0000',
    discount_percentage: '10.00',
    discount_amount: '0.00',
    final_price: '90.0000',
    effective_date: '2026-01-01',
    expiry_date: null,
    status: 'active',
    product: {
        id: 5,
        name: 'Test Product',
        sku: 'SKU-5',
        product_type: 'simple',
        is_parent_with_children: false,
        children_count: 0,
    },
    unit: {
        id: 9,
        name: 'Box',
        conversion_factor: '10.0000',
        base_unit: 8,
        parent: { id: 8, name: 'Piece', conversion_factor: '1.0000' },
    },
};

const baseProps = (overrides = {}) => ({
    mode: 'list',
    priceLists: priceListsPaginator,
    currencies: [{ id: 1, code: 'EGP', name: 'Egyptian Pound' }],
    priceTypes: ['retail', 'wholesale'],
    roundingMethods: ['none', 'up'],
    stats: { total: 3, active: 2, scheduled: 1, expired: 0, items: 7 },
    nextCode: 'PL-0008',
    filters: { search: '', status: '', price_type: '', currency_id: '', validity: '', sort_by: '', sort_dir: '', per_page: 10 },
    ...overrides,
});

const renderPage = (props) =>
    render(
        <PriceLists
            {...props}
        />
    );

describe('Price Lists screen (Inventory)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        formErrors = {};
        pageProps = {
            localization: { current_locale: 'en', country_code: 'sa', translations },
            errors: {},
            flash: {},
        };
        window.confirm = vi.fn(() => true);
        window.axios = { get: vi.fn().mockResolvedValue({ data: { products: [] } }) };
    });

    it('renders the paginated list with server totals, statuses and item counts', () => {
        renderPage(baseProps());

        expect(screen.getByText('PL-0007')).toBeInTheDocument();
        expect(screen.getByText('Wholesale List')).toBeInTheDocument();
        expect(screen.getAllByText('EGP').length).toBeGreaterThan(0);
        expect(screen.getAllByText('7').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
        expect(screen.getByText('25', { selector: '.record-count-badge' })).toBeInTheDocument();
        expect(screen.getByText('Show from 1 to 10 in', { exact: false })).toBeInTheDocument();
        expect(screen.getByText(/resolved on the server/)).toBeInTheDocument();
    });

    it('requests page 2 from the server when the shared pagination control is used', async () => {
        const user = userEvent.setup();
        renderPage(baseProps());

        await user.click(screen.getByRole('button', { name: /next/i }));

        expect(getSpy).toHaveBeenCalled();
        expect(getSpy.mock.calls[0][0]).toContain('/admin.inventory.price-lists.index');
        expect(getSpy.mock.calls[0][1]).toMatchObject({ page: 2 });
    });

    it('sends status filter changes to the server instead of filtering in the browser', async () => {
        const user = userEvent.setup();
        renderPage(baseProps());

        await user.selectOptions(document.querySelector('#plf_status'), 'active');

        expect(getSpy.mock.calls[0][1]).toMatchObject({ status: 'active', page: 1 });
    });

    it('opens a dedicated create page instead of a modal from the list', async () => {
        const user = userEvent.setup();
        renderPage(baseProps());

        await user.click(screen.getAllByRole('button', { name: /create price list/i })[0]);

        expect(getSpy).toHaveBeenCalledTimes(1);
        expect(getSpy.mock.calls[0][0]).toContain('/admin.inventory.price-lists.create');
    });

    it('opens the dedicated edit page from the list row action', async () => {
        const user = userEvent.setup();
        renderPage(baseProps());

        await user.click(screen.getByTitle('Edit Price List'));

        expect(getSpy.mock.calls[0][0]).toContain('/admin.inventory.price-lists.edit');
        expect(getSpy.mock.calls[0][0]).toContain('price_list=7');
    });

    it('renders the dedicated create page and posts the entered values to the store endpoint', async () => {
        const user = userEvent.setup();
        renderPage(baseProps({ mode: 'create', nextCode: 'PL-0008' }));

        expect(screen.getByRole('heading', { name: 'Create Price List' })).toBeInTheDocument();

        await user.type(document.querySelector('#pl_name_ar'), 'قائمة تجزئة');
        await user.type(document.querySelector('#pl_name_en'), 'Retail List');
        await user.click(screen.getByRole('button', { name: /save price list/i }));

        await waitFor(() => expect(postSpy).toHaveBeenCalled());
        expect(postSpy.mock.calls[0][0]).toContain('/admin.inventory.price-lists.store');
    });

    it('renders the dedicated edit page pre-filled and updates through the update endpoint', async () => {
        const user = userEvent.setup();
        renderPage(baseProps({ mode: 'edit', priceList: priceListRow }));

        expect(screen.getByRole('heading', { name: 'Edit Price List' })).toBeInTheDocument();
        expect(document.querySelector('#pl_code').value).toBe('PL-0007');

        await user.click(screen.getByRole('button', { name: /update price list/i }));

        await waitFor(() => expect(putSpy).toHaveBeenCalled());
        const [url] = putSpy.mock.calls[0];
        expect(url).toContain('/admin.inventory.price-lists.update');
        expect(url).toContain('price_list=7');
    });

    it('keeps server validation feedback on the dedicated create page', () => {
        formErrors = { name_ar: 'The name (Arabic) field is required.' };

        renderPage(baseProps({ mode: 'create' }));

        expect(screen.getByText('The name (Arabic) field is required.')).toBeInTheDocument();
        expect(
            screen.getByText('Please correct the highlighted fields and try again.')
        ).toBeInTheDocument();
        expect(document.querySelector('#pl_name_ar').className).toContain('is-invalid');
    });

    it('shows the module empty state with the supported create action', async () => {
        const user = userEvent.setup();

        renderPage(
            baseProps({
                priceLists: { data: [], current_page: 1, last_page: 1, total: 0, per_page: 10 },
                stats: { total: 0, active: 0, scheduled: 0, expired: 0, items: 0 },
            })
        );

        expect(
            screen.getByText('No price lists found. Create the first one to define quantity-tier pricing.')
        ).toBeInTheDocument();

        const emptyAction = document.querySelector('.price-lists-empty-action');
        expect(emptyAction).not.toBeNull();

        await user.click(within(emptyAction).getByRole('button', { name: /create price list/i }));

        expect(getSpy.mock.calls[0][0]).toContain('/admin.inventory.price-lists.create');
    });

    it('shows backend validation errors coming from the server response', async () => {
        pageProps = {
            ...pageProps,
            errors: { price_list: 'This price list is referenced by existing sales documents.' },
        };

        renderPage(baseProps());

        expect(
            screen.getByText('This price list is referenced by existing sales documents.')
        ).toBeInTheDocument();
    });

    it('renders pricing items with server price, unit conversion hint and validity status', () => {
        renderPage(
            baseProps({
                mode: 'detail',
                priceList: { ...priceListRow, currency: { id: 1, code: 'EGP', name: 'Egyptian Pound' } },
                items: { data: [itemRow], current_page: 1, last_page: 1, total: 1, per_page: 10 },
                units: [
                    { id: 9, name: 'Box', unit_type: 2, base_unit: 8, conversion_factor: '10.0000', active: true, parent: { id: 8, name: 'Piece', conversion_factor: '1.0000' } },
                ],
                tierProducts: [
                    { product_id: 5, product_name: 'Test Product', product_sku: 'SKU-5', unit_id: 9, tiers_count: 1, min_quantity_from: '10.0000' },
                ],
                tierLadder: [
                    {
                        id: 42,
                        unit_id: 9,
                        unit_name: 'Box',
                        min_quantity: '10.0000',
                        unit_price: '100.0000',
                        discount_percentage: '10.00',
                        discount_amount: '0.00',
                        final_price: '90.0000',
                        status: 'active',
                    },
                ],
                assigned: { customers: 2, groups: 1 },
                stats: { tiers: 1, products: 1, active: 1, expired: 0 },
                filters: { search: '', product_id: '5', unit_id: '', item_status: '', sort_by: 'min_quantity', sort_dir: 'asc', per_page: 10 },
            })
        );

        expect(screen.getByText('Test Product')).toBeInTheDocument();
        expect(screen.getAllByText('SKU-5').length).toBeGreaterThan(0);
        expect(screen.getByText('1 Box = 10 Piece')).toBeInTheDocument();
        expect(screen.getAllByText('10+').length).toBeGreaterThan(0);
        expect(screen.getAllByText(/90\.00 EGP/).length).toBeGreaterThan(0);
        expect(screen.getByText('Quantity Tiers')).toBeInTheDocument();
    });

    it('shows the price list information separately from the items and links to the edit page', async () => {
        const user = userEvent.setup();

        renderPage(
            baseProps({
                mode: 'detail',
                priceList: {
                    ...priceListRow,
                    rounding_method: 'up',
                    rounding_factor: '0.05',
                    notes: 'Q1 wholesale contract',
                },
                items: { data: [itemRow], current_page: 1, last_page: 1, total: 1, per_page: 10 },
                units: [],
                tierProducts: [],
                assigned: { customers: 2, groups: 1 },
                stats: { tiers: 1, products: 1, active: 1, expired: 0 },
                filters: { search: '', product_id: '', unit_id: '', item_status: '', sort_by: '', sort_dir: '', per_page: 10 },
            })
        );

        expect(screen.getByRole('heading', { name: 'Price List Information' })).toBeInTheDocument();
        expect(screen.getByText('Q1 wholesale contract')).toBeInTheDocument();
        expect(screen.getByText('Up · 0.05')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Pricing Items' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /edit price list/i }));

        expect(getSpy.mock.calls[0][0]).toContain('/admin.inventory.price-lists.edit');
        expect(getSpy.mock.calls[0][0]).toContain('price_list=7');
    });

    it('deletes a pricing item with the confirmation flow and its own id', async () => {
        const user = userEvent.setup();

        renderPage(
            baseProps({
                mode: 'detail',
                priceList: priceListRow,
                items: { data: [itemRow], current_page: 1, last_page: 1, total: 1, per_page: 10 },
                units: [],
                tierProducts: [],
                filters: { search: '', product_id: '', unit_id: '', item_status: '', sort_by: '', sort_dir: '', per_page: 10 },
            })
        );

        await user.click(screen.getByTitle('Delete this pricing item?'));

        expect(window.confirm).toHaveBeenCalledWith('Delete this pricing item?');
        expect(deleteSpy).toHaveBeenCalled();
        const deleteUrl = deleteSpy.mock.calls[0][0];
        expect(deleteUrl).toContain('/admin.inventory.price-lists.items.destroy');
        expect(deleteUrl).toContain('price_list=7');
        expect(deleteUrl).toContain('item=42');
    });

    it('opens the existing pricing item dialog in #modal and closes it with cancel', async () => {
        const user = userEvent.setup();

        renderPage(
            baseProps({
                mode: 'detail',
                priceList: priceListRow,
                items: { data: [], current_page: 1, last_page: 1, total: 0, per_page: 10 },
                units: [{ id: 9, name: 'Box', unit_type: 2, base_unit: null, conversion_factor: '1.0000', active: true }],
                tierProducts: [],
                filters: { search: '', product_id: '', unit_id: '', item_status: '', sort_by: '', sort_dir: '', per_page: 10 },
            })
        );

        // User-visible contract: before the click there is no dialog in the DOM.
        expect(document.querySelector('#modal')).toBeNull();

        await user.click(screen.getAllByRole('button', { name: /add pricing item/i })[0]);

        // The shared Modal renders through the Headless UI #modal container.
        const modal = await screen.findByRole('dialog');
        expect(modal.closest('#modal')).not.toBeNull();
        expect(within(modal).getByRole('heading', { name: 'Add Pricing Item' })).toBeInTheDocument();

        // Cancel closes the dialog again.
        await user.click(within(modal).getByRole('button', { name: /^cancel$/i }));
        expect(document.querySelector('#modal')).toBeNull();
    });

    it('adds a pricing item using the products.id identity and the tier inputs', async () => {
        const user = userEvent.setup();

        window.axios = {
            get: vi.fn().mockResolvedValue({
                data: {
                    products: [
                        {
                            id: 5,
                            name: 'Test Product',
                            sku: 'SKU-5',
                            unit_id: 9,
                            unit: { id: 9, name: 'Box', base_unit: 8, conversion_factor: '10.0000' },
                            price: '120.00',
                            sale_price: null,
                            children_count: 0,
                        },
                    ],
                },
            }),
        };

        renderPage(
            baseProps({
                mode: 'detail',
                priceList: priceListRow,
                items: { data: [], current_page: 1, last_page: 1, total: 0, per_page: 10 },
                units: [
                    { id: 9, name: 'Box', unit_type: 2, base_unit: 8, conversion_factor: '10.0000', active: true, parent: { id: 8, name: 'Piece', conversion_factor: '1.0000' } },
                ],
                tierProducts: [],
                filters: { search: '', product_id: '', unit_id: '', item_status: '', sort_by: '', sort_dir: '', per_page: 10 },
            })
        );

        await user.click(screen.getAllByRole('button', { name: /add pricing item/i })[0]);
        expect(await screen.findByRole('heading', { name: 'Add Pricing Item' })).toBeInTheDocument();

        await user.type(screen.getByPlaceholderText('Search product'), 'Test');

        await waitFor(() => expect(window.axios.get).toHaveBeenCalled());
        const [searchUrl] = window.axios.get.mock.calls[0];
        expect(searchUrl).toContain('/admin.inventory.price-lists.search-products');

        await screen.findAllByText('Test Product (SKU-5)');
        fireEvent.mouseDown(document.querySelector('.searchable-combobox-option'));

        await waitFor(() => expect(document.querySelector('#pli_unit').value).toBe('9'));

        // Min Qty is derived read-only from the selected unit's conversion factor.
        await waitFor(() => expect(document.querySelector('#pli_min_quantity').value).toBe('10'));
        expect(document.querySelector('#pli_min_quantity')).toHaveAttribute('readonly');

        await user.type(document.querySelector('#pli_unit_price'), '95');
        await user.click(screen.getByRole('button', { name: /^save$/i }));

        await waitFor(() => expect(postSpy).toHaveBeenCalled());
        const storeUrl = postSpy.mock.calls[0][0];
        expect(storeUrl).toContain('/admin.inventory.price-lists.items.store');
        expect(storeUrl).toContain('price_list=7');
    });

    it('scopes unit options to the selected product family, derives Min Qty read-only, and resets on product change', async () => {
        const user = userEvent.setup();

        window.axios = {
            get: vi.fn().mockResolvedValue({
                data: {
                    products: [
                        {
                            id: 5,
                            name: 'Test Product',
                            sku: 'SKU-5',
                            unit_id: 9,
                            unit: { id: 9, name: 'Box', base_unit: 8, conversion_factor: '10.0000' },
                            price: '120.00',
                            sale_price: null,
                            children_count: 0,
                        },
                        {
                            id: 6,
                            name: 'Second Product',
                            sku: 'SKU-6',
                            unit_id: 8,
                            unit: { id: 8, name: 'Piece', base_unit: null, conversion_factor: '1.0000' },
                            price: '50.00',
                            sale_price: null,
                            children_count: 0,
                        },
                    ],
                },
            }),
        };

        renderPage(
            baseProps({
                mode: 'detail',
                priceList: priceListRow,
                items: { data: [], current_page: 1, last_page: 1, total: 0, per_page: 10 },
                units: [
                    { id: 8, name: 'Piece', unit_type: 1, base_unit: null, conversion_factor: '1.0000', active: true, parent: null },
                    { id: 9, name: 'Box', unit_type: 2, base_unit: 8, conversion_factor: '10.0000', active: true, parent: { id: 8, name: 'Piece', conversion_factor: '1.0000' } },
                    { id: 21, name: 'Carton', unit_type: 2, base_unit: 9, conversion_factor: '12.0000', active: true, parent: { id: 9, name: 'Box', conversion_factor: '10.0000' } },
                ],
                tierProducts: [],
                filters: { search: '', product_id: '', unit_id: '', item_status: '', sort_by: '', sort_dir: '', per_page: 10 },
            })
        );

        await user.click(screen.getAllByRole('button', { name: /add pricing item/i })[0]);
        await user.type(screen.getByPlaceholderText('Search product'), 'Test');
        await screen.findAllByText('Test Product (SKU-5)');

        // Before a product is selected the unit select is disabled with a
        // "Select a product" placeholder and exposes no unit options.
        const unitSelect = document.querySelector('#pli_unit');
        expect(unitSelect).toBeDisabled();
        expect([...unitSelect.options].map((o) => o.textContent)).toEqual(['Select a product']);

        // Selecting the product pre-selects its base unit (Box) and derives Min Qty.
        fireEvent.mouseDown(document.querySelector('.searchable-combobox-option'));
        await waitFor(() => expect(unitSelect.value).toBe('9'));
        await waitFor(() => expect(document.querySelector('#pli_min_quantity').value).toBe('10'));
        expect(document.querySelector('#pli_min_quantity')).toHaveAttribute('readonly');

        // Unit options are scoped to the product's own unit family:
        // its base unit (Box) plus the children of that base unit (Carton).
        // The parent unit (Piece) and unrelated units are never offered.
        const optionNames = [...unitSelect.options].map((o) => o.textContent);
        expect(optionNames).toContain('Box');
        expect(optionNames).toContain('Carton');
        expect(optionNames).not.toContain('Piece');

        // Switching the unit re-derives Min Qty from that unit's factor.
        await user.selectOptions(unitSelect, '21');
        await waitFor(() => expect(document.querySelector('#pli_min_quantity').value).toBe('12'));

        // Changing the product resets the previous product's unit state.
        const comboInput = screen.getByPlaceholderText('Search product');
        await user.clear(comboInput);
        await user.type(comboInput, 'Second');
        await screen.findAllByText('Second Product (SKU-6)');
        const secondOption = [...document.querySelectorAll('.searchable-combobox-option')].find((o) =>
            o.textContent.includes('Second Product (SKU-6)')
        );
        fireEvent.mouseDown(secondOption);

        await waitFor(() => expect(unitSelect.value).toBe('8'));
        await waitFor(() => expect(document.querySelector('#pli_min_quantity').value).toBe('1'));
    });

    it('shows duplicate-tier validation returned by the server inside the item form', async () => {
        formErrors = { min_quantity: 'A pricing item with the same product already exists in this list.' };
        const user = userEvent.setup();

        renderPage(
            baseProps({
                mode: 'detail',
                priceList: priceListRow,
                items: { data: [], current_page: 1, last_page: 1, total: 0, per_page: 10 },
                units: [],
                tierProducts: [],
                filters: { search: '', product_id: '', unit_id: '', item_status: '', sort_by: '', sort_dir: '', per_page: 10 },
            })
        );

        await user.click(screen.getAllByRole('button', { name: /add pricing item/i })[0]);

        expect(
            await screen.findByText('A pricing item with the same product already exists in this list.')
        ).toBeInTheDocument();
    });
});
