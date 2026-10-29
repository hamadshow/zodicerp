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
            setDataState((previous) => {
                if (typeof key === 'function') return key(previous);
                return typeof key === 'object' ? { ...previous, ...key } : { ...previous, [key]: value };
            });
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

vi.mock('@/Components/Notifications/useNotification', () => ({
    useNotification: () => ({
        showSuccess: vi.fn(),
        showError: vi.fn(),
        showInfo: vi.fn(),
    }),
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
    'PriceLists.price_status': 'Price Status',
    'PriceLists.with_price': 'With Price',
    'PriceLists.without_price': 'Without Price',
    'PriceLists.filter_unit': 'Filter Unit',
    'PriceLists.clear_filters': 'Clear filters',
    'PriceLists.search_lists': 'Search price lists',
    'PriceLists.create_list': 'Create Price List',
    'PriceLists.edit_list': 'Edit Price List',
    'PriceLists.manage_items': 'Pricing Items',
    'PriceLists.pricing_items_count_value': ':count pricing records',
    'PriceLists.pricing_records': 'Pricing Records',
    'PriceLists.manage_prices': 'Manage Prices',
    'PriceLists.excel': 'Excel',
    'PriceLists.import_excel': 'Import from Excel',
    'PriceLists.export_excel': 'Export to Excel',
    'PriceLists.download_template': 'Download Template',
    'PriceLists.import_title': 'Import Price List Items from Excel',
    'PriceLists.import_hint': 'Upload pricing tiers for this price list.',
    'PriceLists.click_to_upload': 'Click to upload or drag and drop',
    'PriceLists.excel_only': 'Excel files only (.xlsx, .xls)',
    'PriceLists.confirm_import': 'Confirm Import',
    'PriceLists.discount': 'Discount',
    'PriceLists.actions': 'Actions',
    'PriceLists.loading_pricing_records': 'Loading pricing records...',
    'PriceLists.pricing_records_load_failed': 'Unable to load pricing records. Please try again.',
    'PriceLists.no_product_prices': 'No pricing records for this product in the current price list.',
    'PriceLists.product_search_failed': 'Unable to load product options. Please try again.',
    'PriceLists.loading_products': 'Loading products and pricing records...',
    'PriceLists.add_product_price': 'Add Pricing Item',
    'PriceLists.no_products_match': 'No eligible products match the current filters.',
    'PriceLists.add_item': 'Add Pricing Item',
    'PriceLists.edit_item': 'Edit pricing item',
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
    'PriceLists.no_product_units': 'No subunits available for this product.',
    'PriceLists.no_subunits': 'No subunits',
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
    'PriceLists.valid': 'Valid',
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
        unit_id: 8,
        unit_options: [
            { id: 9, name: 'Carton', display_name: 'Carton', unit_type: 2, base_unit: 8, conversion_factor: '10.0000', parent: { id: 8, name: 'Piece', conversion_factor: '1.0000' } },
        ],
        is_parent_with_children: false,
        children_count: 0,
    },
    unit: {
        id: 9,
        name: 'Carton',
        conversion_factor: '10.0000',
        base_unit: 8,
        parent: { id: 8, name: 'Piece', conversion_factor: '1.0000' },
    },
};

const unifiedProductRow = {
    id: 5,
    name: 'Test Product',
    display_name: 'Test Product',
    sku: 'SKU-5',
    unit_id: 8,
    unit: { id: 8, name: 'Piece', conversion_factor: '1.0000' },
    unit_options: itemRow.product.unit_options,
    price_status: 'with_price',
    pricing_items_count: 1,
    total_pricing_records_count: 1,
    pricing_items: [{
        id: itemRow.id,
        unit_id: itemRow.unit_id,
        unit: itemRow.unit,
        min_quantity: itemRow.min_quantity,
        unit_price: itemRow.unit_price,
        discount_percentage: itemRow.discount_percentage,
        discount_amount: itemRow.discount_amount,
        final_price: itemRow.final_price,
        effective_date: itemRow.effective_date,
        expiry_date: itemRow.expiry_date,
        status: itemRow.status,
        product: {
            id: itemRow.product.id,
            name: itemRow.product.name,
            display_name: itemRow.product.name,
            sku: itemRow.product.sku,
            unit_id: itemRow.product.unit_id,
            unit_options: itemRow.product.unit_options,
        },
    }],
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

const selectProductOption = (label) => {
    const option = [...document.querySelectorAll('.searchable-combobox-option')].find((element) =>
        element.textContent.includes(label)
    );
    expect(option).toBeTruthy();
    fireEvent.mouseDown(option);
};

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

    it('keeps the product table compact and opens all pricing records in Manage Prices', async () => {
        const user = userEvent.setup();
        const secondPricingRecord = {
            ...unifiedProductRow.pricing_items[0],
            id: 43,
            unit_id: 22,
            unit: { id: 22, name: 'Crate', conversion_factor: '24.0000' },
            min_quantity: '24.0000',
            final_price: '80.0000',
            status: 'scheduled',
        };
        const productRow = {
            ...unifiedProductRow,
            pricing_items_count: 2,
            total_pricing_records_count: 2,
        };
        window.axios = {
            get: vi.fn().mockResolvedValue({
                data: { items: [...unifiedProductRow.pricing_items, secondPricingRecord] },
            }),
        };

        renderPage(
            baseProps({
                mode: 'detail',
                priceList: { ...priceListRow, currency: { id: 1, code: 'EGP', name: 'Egyptian Pound' } },
                products: { data: [productRow], current_page: 1, last_page: 1, total: 1, per_page: 10 },
                units: [
                    { id: 9, name: 'Box', unit_type: 2, base_unit: 8, conversion_factor: '10.0000', active: true, parent: { id: 8, name: 'Piece', conversion_factor: '1.0000' } },
                ],
                assigned: { customers: 2, groups: 1 },
                stats: { tiers: 1, products: 1, active: 1, expired: 0 },
                filters: { search: '', product_id: '5', unit_id: '', item_status: '', sort_by: 'name', sort_dir: 'asc', per_page: 10 },
            })
        );

        expect(screen.getAllByText('Test Product')).toHaveLength(1);
        expect(screen.getByRole('heading', { name: 'Pricing Items' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Product Catalog' })).not.toBeInTheDocument();
        expect(screen.getAllByText('With Price').length).toBeGreaterThan(0);
        expect(screen.getByText('2 pricing records')).toBeInTheDocument();
        expect(screen.queryByText('Crate')).not.toBeInTheDocument();
        expect(screen.queryByText(/90\.00 EGP/)).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /Manage Prices/ }));
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByRole('heading', { name: 'Manage Prices' })).toBeInTheDocument();
        expect(within(dialog).getByText('Crate')).toBeInTheDocument();
        expect(within(dialog).getAllByTitle('Edit pricing item')).toHaveLength(2);
        expect(within(dialog).getByText('2 pricing records')).toBeInTheDocument();
        expect(window.axios.get).toHaveBeenCalledWith(
            '/admin.inventory.price-lists.products.items?country=sa&lang=en&price_list=7&product=5'
        );
    });

    it('shows the Price List Excel menu and opens its dedicated import workflow', () => {
        renderPage(baseProps({
            mode: 'detail',
            priceList: priceListRow,
            products: { data: [], current_page: 1, last_page: 1, total: 0, per_page: 10 },
            units: [],
            assigned: { customers: 0, groups: 0 },
            stats: { tiers: 0, products: 0, active: 0, expired: 0 },
            filters: { search: '', product_id: '', unit_id: '', item_status: '', sort_by: 'name', sort_dir: 'asc', per_page: 10 },
        }));

        fireEvent.click(screen.getByRole('button', { name: /Excel/ }));
        fireEvent.click(screen.getByRole('button', { name: /Import from Excel/ }));

        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByRole('heading', { name: 'Import Price List Items from Excel' })).toBeInTheDocument();
        expect(within(dialog).getByText('Excel files only (.xlsx, .xls)')).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: 'Confirm Import' })).toBeDisabled();
    }, 20000);

    it('filters the product catalog by price status and clears the filter', async () => {
        const user = userEvent.setup();

        renderPage(
            baseProps({
                mode: 'detail',
                priceList: priceListRow,
                products: { data: [], current_page: 1, last_page: 1, total: 0, per_page: 10 },
                filters: {
                    search: '',
                    product_id: '',
                    price_status: '',
                    unit_id: '',
                    item_status: '',
                    sort_by: 'name',
                    sort_dir: 'asc',
                    per_page: 10,
                },
            })
        );

        await user.selectOptions(screen.getByLabelText('Price Status'), 'without_price');
        expect(getSpy).toHaveBeenCalled();
        const filterRequest = () => getSpy.mock.calls[getSpy.mock.calls.length - 1][1];
        expect(filterRequest()).toMatchObject({ price_status: 'without_price', page: 1 });

        await user.click(screen.getByRole('button', { name: /clear filters/i }));
        expect(filterRequest()).not.toHaveProperty('price_status');
        expect(filterRequest()).not.toHaveProperty('product_id');
        expect(filterRequest()).not.toHaveProperty('unit_id');
        expect(filterRequest()).not.toHaveProperty('item_status');
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
                products: { data: [unifiedProductRow], current_page: 1, last_page: 1, total: 1, per_page: 10 },
                units: [],
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
        window.axios = {
            get: vi.fn().mockResolvedValue({ data: { items: [unifiedProductRow.pricing_items[0]] } }),
        };

        renderPage(
            baseProps({
                mode: 'detail',
                priceList: priceListRow,
                products: { data: [unifiedProductRow], current_page: 1, last_page: 1, total: 1, per_page: 10 },
                units: [],
                filters: { search: '', product_id: '', unit_id: '', item_status: '', sort_by: '', sort_dir: '', per_page: 10 },
            })
        );

        await user.click(screen.getByRole('button', { name: /Manage Prices/ }));
        const dialog = await screen.findByRole('dialog');
        await user.click(within(dialog).getByTitle('Delete this pricing item?'));

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
                products: { data: [], current_page: 1, last_page: 1, total: 0, per_page: 10 },
                units: [{ id: 9, name: 'Box', unit_type: 2, base_unit: null, conversion_factor: '1.0000', active: true }],
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

    it('opens Add Pricing Item for the selected unpriced product with its unit preselected', async () => {
        const user = userEvent.setup();
        const unpricedProduct = {
            ...unifiedProductRow,
            price_status: 'without_price',
            pricing_items_count: 0,
            total_pricing_records_count: 0,
        };

        renderPage(
            baseProps({
                mode: 'detail',
                priceList: priceListRow,
                products: { data: [unpricedProduct], current_page: 1, last_page: 1, total: 1, per_page: 10 },
                units: [],
                filters: { search: '', product_id: '', unit_id: '', item_status: '', sort_by: '', sort_dir: '', per_page: 10 },
            })
        );

        const addButtons = screen.getAllByRole('button', { name: /Add Pricing Item/ });
        await user.click(addButtons[addButtons.length - 1]);
        expect(await screen.findByRole('heading', { name: 'Add Pricing Item' })).toBeInTheDocument();
        expect(document.querySelector('#pli_unit').value).toBe('9');
    });

    it('adds a pricing item using the products.id identity and the tier inputs', async () => {
        const user = userEvent.setup();

        const searchableProducts = [
            {
                id: 5,
                name: 'Test Product',
                sku: 'SKU-5',
                unit_id: 8,
                unit_options: [
                    { id: 9, name: 'Carton', display_name: 'Carton', unit_type: 2, base_unit: 8, conversion_factor: '10.0000', parent: { id: 8, name: 'Piece', conversion_factor: '1.0000' } },
                ],
                unit: { id: 8, name: 'Piece', base_unit: null, conversion_factor: '1.0000' },
                children_count: 0,
            },
        ];
        window.axios = {
            get: vi.fn().mockResolvedValue({ data: { products: searchableProducts } }),
        };

        renderPage(
            baseProps({
                mode: 'detail',
                priceList: priceListRow,
                products: { data: [], current_page: 1, last_page: 1, total: 0, per_page: 10 },
                units: [
                    { id: 9, name: 'Box', unit_type: 2, base_unit: 8, conversion_factor: '10.0000', active: true, parent: { id: 8, name: 'Piece', conversion_factor: '1.0000' } },
                ],
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
        expect(screen.queryByText(/Indicative product price/)).not.toBeInTheDocument();
        selectProductOption('Test Product (SKU-5)');

        await waitFor(() => expect(document.querySelector('#pli_unit').value).toBe(''));
        await user.selectOptions(document.querySelector('#pli_unit'), '9');
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

        const searchableProducts = [
            {
                id: 5,
                name: 'Test Product',
                sku: 'SKU-5',
                unit_id: 9,
                unit_options: [
                    { id: 21, name: 'Carton', display_name: 'Carton', unit_type: 2, base_unit: 9, conversion_factor: '12.0000', parent: { id: 9, name: 'Box', conversion_factor: '10.0000' } },
                    { id: 22, name: 'Crate', display_name: 'Crate', unit_type: 2, base_unit: 9, conversion_factor: '24.0000', parent: { id: 9, name: 'Box', conversion_factor: '10.0000' } },
                    { id: 23, name: 'Pallet', display_name: 'Pallet', unit_type: 2, base_unit: 9, conversion_factor: '48.0000', parent: { id: 9, name: 'Box', conversion_factor: '10.0000' } },
                ],
                unit: { id: 9, name: 'Box', base_unit: 8, conversion_factor: '10.0000' },
                children_count: 0,
            },
            {
                id: 6,
                name: 'Second Product',
                sku: 'SKU-6',
                unit_id: 8,
                unit_options: [
                    { id: 24, name: 'Pack', display_name: 'Pack', unit_type: 2, base_unit: 8, conversion_factor: '6.0000', parent: { id: 8, name: 'Piece', conversion_factor: '1.0000' } },
                ],
                unit: { id: 8, name: 'Piece', base_unit: null, conversion_factor: '1.0000' },
                children_count: 0,
            },
        ];
        window.axios = {
            get: vi.fn((url, { params } = {}) => Promise.resolve({
                data: {
                    products: searchableProducts.filter((product) =>
                        !params?.query || product.name.includes(params.query)
                    ),
                },
            })),
        };

        renderPage(
            baseProps({
                mode: 'detail',
                priceList: priceListRow,
                products: { data: [], current_page: 1, last_page: 1, total: 0, per_page: 10 },
                units: [
                    { id: 8, name: 'Piece', unit_type: 1, base_unit: null, conversion_factor: '1.0000', active: true, parent: null },
                    { id: 9, name: 'Box', unit_type: 2, base_unit: 8, conversion_factor: '10.0000', active: true, parent: { id: 8, name: 'Piece', conversion_factor: '1.0000' } },
                    { id: 21, name: 'Carton', unit_type: 2, base_unit: 9, conversion_factor: '12.0000', active: true, parent: { id: 9, name: 'Box', conversion_factor: '10.0000' } },
                ],
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

        // Only subunits are selectable; the product's head unit is excluded.
        selectProductOption('Test Product (SKU-5)');
        await waitFor(() => expect(unitSelect.value).toBe(''));
        expect([...unitSelect.options].map((option) => option.value)).toEqual(['', '21', '22', '23']);
        expect([...unitSelect.options].map((option) => option.textContent)).not.toContain('Box');
        expect([...unitSelect.options].map((option) => option.textContent)).not.toContain('Piece');
        await user.selectOptions(unitSelect, '21');
        await waitFor(() => expect(unitSelect.value).toBe('21'));
        await waitFor(() => expect(document.querySelector('#pli_min_quantity').value).toBe('12'));
        expect(document.querySelector('#pli_min_quantity')).toHaveAttribute('readonly');

        // The backend returns only this product's associated subunits.
        const optionNames = [...unitSelect.options].map((o) => o.textContent);
        expect(optionNames).toContain('Carton');
        expect(optionNames).toContain('Crate');
        expect(optionNames).toContain('Pallet');

        // Switching the unit re-derives Min Qty from that unit's factor.
        await user.selectOptions(unitSelect, '21');
        await waitFor(() => expect(document.querySelector('#pli_min_quantity').value).toBe('12'));

        // Changing the product resets the previous product's unit state.
        window.axios.get.mockResolvedValue({ data: { products: [searchableProducts[1]] } });
        const comboInput = screen.getByPlaceholderText('Search product');
        await user.clear(comboInput);
        await user.type(comboInput, 'Second');
        await waitFor(() =>
            expect(
                [...document.querySelectorAll('.searchable-combobox-option')].some((option) =>
                    option.textContent.includes('Second Product (SKU-6)')
                )
            ).toBe(true)
        );
        await user.keyboard('{ArrowDown}{Enter}');

        await waitFor(() => expect(unitSelect.value).toBe(''));
        expect([...unitSelect.options].map((option) => option.value)).toEqual(['', '24']);
        await waitFor(() => expect(document.querySelector('#pli_min_quantity').value).toBe(''));
        expect([...unitSelect.options].map((option) => option.textContent)).not.toContain('Piece');
    });

    it('shows a clear empty subunit state when a product has no subunits', async () => {
        const user = userEvent.setup();
        window.axios = {
            get: vi.fn().mockResolvedValue({
                data: {
                    products: [
                        {
                            id: 7,
                            name: 'Unitless Product',
                            sku: 'SKU-7',
                            unit_id: 30,
                            unit_options: [],
                        },
                    ],
                },
            }),
        };

        renderPage(
            baseProps({
                mode: 'detail',
                priceList: priceListRow,
                products: { data: [], current_page: 1, last_page: 1, total: 0, per_page: 10 },
                units: [{ id: 99, name: 'Unrelated unit', unit_type: 1, base_unit: null, conversion_factor: '1.0000', active: true }],
                filters: { search: '', product_id: '', unit_id: '', item_status: '', sort_by: '', sort_dir: '', per_page: 10 },
            })
        );

        await user.click(screen.getAllByRole('button', { name: /add pricing item/i })[0]);
        await user.type(screen.getByPlaceholderText('Search product'), 'Unitless');
        await screen.findAllByText('Unitless Product (SKU-7)');
        selectProductOption('Unitless Product (SKU-7)');

        const unitSelect = document.querySelector('#pli_unit');
        await waitFor(() => expect(unitSelect).toBeDisabled());
        expect([...unitSelect.options].map((option) => option.textContent)).toEqual([
            'No subunits available for this product.',
        ]);
        expect([...unitSelect.options].some((option) => option.textContent === 'Unrelated unit')).toBe(false);
    });

    it('loads the saved unit ID when editing an existing pricing item', async () => {
        const user = userEvent.setup();
        window.axios = {
            get: vi.fn().mockResolvedValue({ data: { items: [unifiedProductRow.pricing_items[0]] } }),
        };
        renderPage(
            baseProps({
                mode: 'detail',
                priceList: priceListRow,
                products: { data: [unifiedProductRow], current_page: 1, last_page: 1, total: 1, per_page: 10 },
                units: [],
                filters: { search: '', product_id: '', unit_id: '', item_status: '', sort_by: '', sort_dir: '', per_page: 10 },
            })
        );

        await user.click(screen.getByRole('button', { name: /Manage Prices/ }));
        const pricesDialog = await screen.findByRole('dialog');
        await user.click(within(pricesDialog).getByTitle('Edit pricing item'));
        const unitSelect = document.querySelector('#pli_unit');
        expect(unitSelect.value).toBe('9');
        expect([...unitSelect.options].map((option) => option.value)).toContain('9');

        await user.clear(document.querySelector('#pli_unit_price'));
        await user.type(document.querySelector('#pli_unit_price'), '110');
        await user.click(screen.getByRole('button', { name: /^save$/i }));
        await waitFor(() => expect(putSpy).toHaveBeenCalledTimes(1));
        expect(putSpy.mock.calls[0][0]).toContain('/admin.inventory.price-lists.items.update');
        expect(putSpy.mock.calls[0][0]).toContain('item=42');
    });

    it('shows duplicate-tier validation returned by the server inside the item form', async () => {
        formErrors = { min_quantity: 'A pricing item with the same product already exists in this list.' };
        const user = userEvent.setup();

        renderPage(
            baseProps({
                mode: 'detail',
                priceList: priceListRow,
                products: { data: [], current_page: 1, last_page: 1, total: 0, per_page: 10 },
                units: [],
                filters: { search: '', product_id: '', unit_id: '', item_status: '', sort_by: '', sort_dir: '', per_page: 10 },
            })
        );

        await user.click(screen.getAllByRole('button', { name: /add pricing item/i })[0]);

        expect(
            await screen.findByText('A pricing item with the same product already exists in this list.')
        ).toBeInTheDocument();
    });
});
