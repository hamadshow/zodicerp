import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { useNotification } from '@/Components/Notifications/useNotification';
import AdminLayout from '../components/AdminLayout';
import Table from '../components/Table';
import SearchableComboBox from '../components/SearchableComboBox';
import BlankPage from '@/Components/BlankPage';
import Modal from '@/Components/Modal';

/**
 * Inventory -> Price Lists
 *
 * Administration screen for the existing pricing data (price_lists +
 * price_list_items). It only writes/reads pricing configuration; the selling
 * price is always resolved on the server by ProductPriceResolver and unit
 * conversion stays in UnitConversionService.
 */

/* ------------------------------------------------------------------ *
 * Formatting helpers (display only - no pricing/conversion arithmetic)
 * ------------------------------------------------------------------ */

const interpolate = (text, replacements = {}) =>
    Object.entries(replacements).reduce(
        (result, [key, value]) => result.split(`:${key}`).join(String(value)),
        text
    );

const trimNumber = (value) => {
    if (value === null || value === undefined || value === '') return '';
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return String(value);
    return String(numeric);
};

// Western digits / 2 decimals, matching the backend's number_format() money output.
const formatMoney = (value, currencyCode = '') => {
    if (value === null || value === undefined || value === '') return '—';
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return '—';
    const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(numeric);

    return currencyCode ? `${formatted} ${currencyCode}` : formatted;
};

const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleDateString();
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const cleanParams = (params) =>
    Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined)
    );

const priceListImportColumns = [
    'product_id',
    'product_code',
    'product_name',
    'sku',
    'unit_id',
    'unit',
    'min_quantity',
    'unit_price',
    'discount_percentage',
    'discount_amount',
    'effective_date',
    'expiry_date',
    'notes',
];

/* ------------------------------------------------------------------ *
 * Small presentational pieces
 * ------------------------------------------------------------------ */

const StatusBadge = ({ status, label }) => (
    <span className={`price-lists-badge price-lists-badge--${status}`}>{label}</span>
);

const ProductCell = ({ product, __ }) => {
    if (!product) return <span className="price-lists-muted">—</span>;

    const isParent = Boolean(product.is_parent_with_children);

    return (
        <div className="price-lists-product">
            <div className="price-lists-product__name">{product.display_name || product.name}</div>
            {isParent && (
                <div className="price-lists-product__meta">
                    <span className="price-lists-badge price-lists-badge--parent" title={__('parent_product_hint')}>
                        {__('parent_product')}
                    </span>
                </div>
            )}
        </div>
    );
};

const UnitCell = ({ unit, __ }) => {
    if (!unit) return <span className="price-lists-muted">—</span>;

    return (
        <div className="price-lists-unit">
            <span className="price-lists-unit__name">{unit.name}</span>
            {unit.parent && (
                <span className="price-lists-unit__conversion">
                    {interpolate(__('conversion_hint', '1 :unit = :factor :base'), {
                        unit: unit.name,
                        factor: trimNumber(unit.conversion_factor),
                        base: unit.parent.name,
                    })}
                </span>
            )}
        </div>
    );
};

const StatsCards = ({ cards }) => (
    <div className="stats-cards">
        {cards.map((card) => (
            <div className="stat-card" key={card.label}>
                <div className="stat-icon" style={{ backgroundColor: card.color }}>
                    <span className="material-icons-outlined">{card.icon}</span>
                </div>
                <div className="stat-content">
                    <span className="stat-value">{card.value}</span>
                    <div className="stat-label">{card.label}</div>
                </div>
            </div>
        ))}
    </div>
);

const ServerNote = ({ __ }) => (
    <div className="price-lists-note">
        <span className="material-icons-outlined">info</span>
        <span>{__('server_note')}</span>
    </div>
);

const FormError = ({ message }) =>
    message ? (
        <div className="price-lists-form__error" role="alert">
            {message}
        </div>
    ) : null;

/* ------------------------------------------------------------------ *
 * Price list header form (create / edit) - DEDICATED FULL PAGE
 * ------------------------------------------------------------------ */

const PriceListFormPage = ({
    mode,
    priceList = null,
    currencies = [],
    priceTypes = [],
    roundingMethods = [],
    nextCode = '',
    getRoute,
    __,
}) => {
    const isEdit = mode === 'edit';

    const form = useForm({
        code: priceList?.code || '',
        name_ar: priceList?.name_ar || '',
        name_en: priceList?.name_en || '',
        currency_id: priceList?.currency_id || currencies[0]?.id || '',
        price_type: priceList?.price_type || 'retail',
        valid_from: priceList?.valid_from ? String(priceList.valid_from).slice(0, 10) : todayIso(),
        valid_to: priceList?.valid_to ? String(priceList.valid_to).slice(0, 10) : '',
        rounding_method: priceList?.rounding_method || 'none',
        rounding_factor: priceList?.rounding_factor ?? 0.05,
        is_default: Boolean(priceList?.is_default),
        is_active: priceList ? Boolean(priceList.is_active) : true,
        notes: priceList?.notes || '',
    });

    const { data, setData, errors, processing } = form;
    const hasErrors = Object.keys(errors).length > 0;

    const goBack = () => router.get(getRoute('admin.inventory.price-lists.index'));

    const submit = (event) => {
        event.preventDefault();

        const options = { preserveScroll: true };

        if (isEdit) {
            form.put(getRoute('admin.inventory.price-lists.update', { price_list: priceList.id }), options);
        } else {
            form.post(getRoute('admin.inventory.price-lists.store'), options);
        }
    };

    const breadcrumbs = [
        { label: 'Dashboard', href: getRoute('admin.dashboard') },
        { label: 'Inventory', href: getRoute('admin.inventory.products.index') },
        { label: __('title'), href: getRoute('admin.inventory.price-lists.index') },
        { label: isEdit ? __('edit_list') : __('create_list') },
    ];

    return (
        <BlankPage breadcrumbs={breadcrumbs}>
            <div className="price-lists-form-page">
                <div className="price-lists-form-page__header">
                    <div className="price-lists-form-page__identity">
                        <div className="price-lists-form-page__eyebrow">{__('title')}</div>
                        <h1 className="price-lists-form-page__title">
                            {isEdit ? __('edit_list') : __('create_list')}
                        </h1>
                        <p className="price-lists-form-page__subtitle">
                            {isEdit ? __('edit_list_hint') : __('create_list_hint')}
                        </p>
                    </div>
                    <button type="button" className="price-lists-btn price-lists-btn--ghost" onClick={goBack}>
                        <span className="material-icons-outlined">arrow_back</span>
                        {__('back_to_list')}
                    </button>
                </div>

                <div className="price-lists-form-page__card">
                    <form onSubmit={submit} className="price-lists-form">
                        {hasErrors && (
                            <div className="price-lists-alert" role="alert">
                                <span className="material-icons-outlined">error_outline</span>
                                <span>{__('validation_summary')}</span>
                            </div>
                        )}

                        <div className="price-lists-form__section">{__('section_information')}</div>

                        <div className="price-lists-form__row">
                            <div className="form-group">
                                <label className="form-label" htmlFor="pl_code">
                                    {__('code')}
                                </label>
                                <input
                                    id="pl_code"
                                    type="text"
                                    name="code"
                                    className={`form-control ${errors.code ? 'is-invalid' : ''}`}
                                    value={data.code}
                                    onChange={(event) => setData('code', event.target.value)}
                                    placeholder={nextCode}
                                    maxLength={20}
                                />
                                <div className="price-lists-form__hint">{__('code_hint')}</div>
                                <FormError message={errors.code} />
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="pl_price_type">
                                    {__('price_type')} <span className="price-lists-required">*</span>
                                </label>
                                <select
                                    id="pl_price_type"
                                    className={`form-control ${errors.price_type ? 'is-invalid' : ''}`}
                                    value={data.price_type}
                                    onChange={(event) => setData('price_type', event.target.value)}
                                >
                                    {priceTypes.map((type) => (
                                        <option key={type} value={type}>
                                            {__(type, type)}
                                        </option>
                                    ))}
                                </select>
                                <FormError message={errors.price_type} />
                            </div>
                        </div>

                        <div className="price-lists-form__row">
                            <div className="form-group">
                                <label className="form-label" htmlFor="pl_name_ar">
                                    {__('name_ar')} <span className="price-lists-required">*</span>
                                </label>
                                <input
                                    id="pl_name_ar"
                                    type="text"
                                    name="name_ar"
                                    className={`form-control ${errors.name_ar ? 'is-invalid' : ''}`}
                                    value={data.name_ar}
                                    onChange={(event) => setData('name_ar', event.target.value)}
                                    maxLength={100}
                                />
                                <FormError message={errors.name_ar} />
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="pl_name_en">
                                    {__('name_en')}
                                </label>
                                <input
                                    id="pl_name_en"
                                    type="text"
                                    name="name_en"
                                    className={`form-control ${errors.name_en ? 'is-invalid' : ''}`}
                                    value={data.name_en}
                                    onChange={(event) => setData('name_en', event.target.value)}
                                    maxLength={100}
                                />
                                <FormError message={errors.name_en} />
                            </div>
                        </div>

                        <div className="price-lists-form__section">{__('section_pricing')}</div>

                        <div className="price-lists-form__row">
                            <div className="form-group">
                                <label className="form-label" htmlFor="pl_currency_id">
                                    {__('currency')} <span className="price-lists-required">*</span>
                                </label>
                                <select
                                    id="pl_currency_id"
                                    className={`form-control ${errors.currency_id ? 'is-invalid' : ''}`}
                                    value={data.currency_id}
                                    onChange={(event) => setData('currency_id', event.target.value)}
                                >
                                    <option value="">{__('currency')}</option>
                                    {currencies.map((currency) => (
                                        <option key={currency.id} value={currency.id}>
                                            {currency.code} — {currency.name}
                                        </option>
                                    ))}
                                </select>
                                <FormError message={errors.currency_id} />
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="pl_rounding_method">
                                    {__('rounding_method')}
                                </label>
                                <select
                                    id="pl_rounding_method"
                                    className="form-control"
                                    value={data.rounding_method}
                                    onChange={(event) => setData('rounding_method', event.target.value)}
                                >
                                    {roundingMethods.map((method) => (
                                        <option key={method} value={method}>
                                            {__(`rounding_${method}`, method)}
                                        </option>
                                    ))}
                                </select>
                                <FormError message={errors.rounding_method} />
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="pl_rounding_factor">
                                    {__('rounding_factor')}
                                </label>
                                <input
                                    id="pl_rounding_factor"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className={`form-control ${errors.rounding_factor ? 'is-invalid' : ''}`}
                                    value={data.rounding_factor}
                                    onChange={(event) => setData('rounding_factor', event.target.value)}
                                />
                                <FormError message={errors.rounding_factor} />
                            </div>
                        </div>

                        <div className="price-lists-form__section">{__('section_validity')}</div>

                        <div className="price-lists-form__row">
                            <div className="form-group">
                                <label className="form-label" htmlFor="pl_valid_from">
                                    {__('valid_from')} <span className="price-lists-required">*</span>
                                </label>
                                <input
                                    id="pl_valid_from"
                                    type="date"
                                    className={`form-control ${errors.valid_from ? 'is-invalid' : ''}`}
                                    value={data.valid_from}
                                    onChange={(event) => setData('valid_from', event.target.value)}
                                />
                                <FormError message={errors.valid_from} />
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="pl_valid_to">
                                    {__('valid_to')}
                                </label>
                                <input
                                    id="pl_valid_to"
                                    type="date"
                                    className={`form-control ${errors.valid_to ? 'is-invalid' : ''}`}
                                    value={data.valid_to}
                                    onChange={(event) => setData('valid_to', event.target.value)}
                                />
                                <FormError message={errors.valid_to} />
                            </div>
                        </div>

                        <div className="price-lists-form__switches">
                            <label className="price-lists-switch" htmlFor="pl_is_active">
                                <input
                                    id="pl_is_active"
                                    type="checkbox"
                                    checked={data.is_active}
                                    onChange={(event) => setData('is_active', event.target.checked)}
                                />
                                <span>{__('is_active')}</span>
                            </label>

                            <label className="price-lists-switch" htmlFor="pl_is_default">
                                <input
                                    id="pl_is_default"
                                    type="checkbox"
                                    checked={data.is_default}
                                    onChange={(event) => setData('is_default', event.target.checked)}
                                />
                                <span>{__('is_default')}</span>
                            </label>
                        </div>

                        <div className="price-lists-form__section">{__('section_notes')}</div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="pl_notes">
                                {__('notes')}
                            </label>
                            <textarea
                                id="pl_notes"
                                className={`form-control form-textarea ${errors.notes ? 'is-invalid' : ''}`}
                                rows={3}
                                value={data.notes}
                                onChange={(event) => setData('notes', event.target.value)}
                            />
                            <FormError message={errors.notes} />
                        </div>

                        <div className="price-lists-form-page__actions">
                            <button type="button" className="price-lists-btn" onClick={goBack} disabled={processing}>
                                {__('cancel')}
                            </button>
                            <button
                                type="submit"
                                className="price-lists-btn price-lists-btn--primary"
                                disabled={processing}
                            >
                                {processing ? __('saving') : isEdit ? __('update_list') : __('save_list')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </BlankPage>
    );
};

/* ------------------------------------------------------------------ *
 * Pricing item form (quantity tier)
 * ------------------------------------------------------------------ */

const PriceItemFormModal = ({
    show,
    priceList,
    item = null,
    product = null,
    getRoute,
    onClose,
}) => {
    const { props } = usePage();
    const translations = props.localization?.translations || {};
    const __ = (key, fallback = key, replacements = {}) =>
        interpolate(translations[`PriceLists.${key}`] || fallback, replacements);

    const isEdit = Boolean(item);
    const currencyCode = priceList?.currency?.code || '';

    const form = useForm({
        product_id: item?.product_id || product?.id || '',
        unit_id: item?.unit_id || product?.unit_id || '',
        min_quantity: item?.min_quantity ?? product?.unit?.conversion_factor ?? 1,
        unit_price: item?.unit_price ?? '',
        discount_percentage: item?.discount_percentage ?? 0,
        discount_amount: item?.discount_amount ?? 0,
        effective_date: item?.effective_date ? String(item.effective_date).slice(0, 10) : '',
        expiry_date: item?.expiry_date ? String(item.expiry_date).slice(0, 10) : '',
        notes: item?.notes || '',
    });

    const { data, setData, errors, processing } = form;

    const selectedInitialProduct = item?.product || product;
    const [selectedProduct, setSelectedProduct] = useState(selectedInitialProduct || null);
    const [productOptions, setProductOptions] = useState(() =>
        selectedInitialProduct
            ? [
                  {
                      value: item?.product_id || selectedInitialProduct.id,
                      label: selectedInitialProduct.sku
                          ? `${selectedInitialProduct.display_name || selectedInitialProduct.name} (${selectedInitialProduct.sku})`
                          : selectedInitialProduct.display_name || selectedInitialProduct.name,
                      product: selectedInitialProduct,
                  },
              ]
            : []
    );
    const [searching, setSearching] = useState(false);
    const searchTimer = useRef(null);

    const productUnits = selectedProduct?.unit_options || [];

    const selectedUnit = useMemo(
        () => productUnits.find((unit) => String(unit.id) === String(data.unit_id)) || null,
        [productUnits, data.unit_id]
    );

    const handleProductSearch = (term) => {
        if (searchTimer.current) {
            clearTimeout(searchTimer.current);
        }

        searchTimer.current = setTimeout(async () => {
            if (!window.axios) return;

            setSearching(true);
            try {
                const response = await window.axios.get(
                    getRoute('admin.inventory.price-lists.search-products'),
                    { params: { query: term } }
                );

                const products = response?.data?.products || [];
                setProductOptions(
                    products.map((product) => ({
                        value: product.id,
                        label: product.sku
                            ? `${product.display_name || product.name} (${product.sku})`
                            : product.display_name || product.name,
                        product,
                    }))
                );
            } catch {
                setProductOptions([]);
            } finally {
                setSearching(false);
            }
        }, 350);
    };

    const handleUnitChange = (value) => {
        // Min Qty mirrors the selected subunit's conversion quantity.
        const factor = trimNumber(
            productUnits.find((unit) => String(unit.id) === String(value))?.conversion_factor
        );
        setData('unit_id', value);
        setData('min_quantity', value === '' ? 1 : factor || 1);
    };

    const handleProductChange = (value) => {
        const option = productOptions.find((entry) => String(entry.value) === String(value));
        const product = option?.product || null;
        setSelectedProduct(product);
        setData((current) => ({
            ...current,
            product_id: value,
            unit_id: '',
            min_quantity: 1,
        }));
    };

    const submit = (event) => {
        event.preventDefault();

        const options = { preserveScroll: true, onSuccess: () => onClose(true) };

        if (isEdit) {
            form.put(
                getRoute('admin.inventory.price-lists.items.update', {
                    price_list: priceList.id,
                    item: item.id,
                }),
                options
            );
        } else {
            form.post(
                getRoute('admin.inventory.price-lists.items.store', { price_list: priceList.id }),
                options
            );
        }
    };

    // Preview only: mirrors the stored generated column
    // (unit_price - unit_price * discount_percentage / 100 - discount_amount).
    // The persisted value returned by the server stays authoritative.
    const previewFinalPrice = useMemo(() => {
        const price = Number(data.unit_price);
        if (!data.unit_price || Number.isNaN(price)) return null;

        const percentage = Number(data.discount_percentage) || 0;
        const amount = Number(data.discount_amount) || 0;
        const final = price - (price * percentage) / 100 - amount;

        return final < 0 ? 0 : final;
    }, [data.unit_price, data.discount_percentage, data.discount_amount]);

    return (
        <Modal show={show} onClose={onClose} maxWidth="2xl">
            <div className="price-lists-modal">
                <div className="modal-header">
                    <h3 className="modal-title">{isEdit ? __('edit_item') : __('add_item')}</h3>
                    <button type="button" className="modal-close" onClick={onClose} aria-label={__('close')}>
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={submit} className="price-lists-form">
                    <FormError message={errors.item} />

                    <div className="price-lists-form__row">
                        <div className="form-group">
                            <label className="form-label" htmlFor="pli_product">
                                {__('product')} <span className="price-lists-required">*</span>
                            </label>
                            <SearchableComboBox
                                options={productOptions}
                                value={data.product_id}
                                onChange={handleProductChange}
                                onSearch={handleProductSearch}
                                name="product_id"
                                placeholder={__('search_product', 'Search product...')}
                                renderOption={(option) => (
                                    <div className="price-lists-picker-option">
                                        <div className="price-lists-picker-option__label">{option.label}</div>
                                        {option.product && (
                                            <div className="price-lists-picker-option__meta">
                                                {option.product.children_count > 0 && (
                                                    <span className="price-lists-badge price-lists-badge--parent">
                                                        {__('parent_product')}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            />
                            {searching && <div className="price-lists-form__hint">{__('search_product')}</div>}
                            <FormError message={errors.product_id} />
                            {selectedProduct?.children_count > 0 && (
                                <div className="price-lists-form__hint price-lists-form__hint--warning">
                                    {__('parent_product_hint')}
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="pli_unit">
                                {__('unit')} <span className="price-lists-required">*</span>
                            </label>
                            <select
                                id="pli_unit"
                                name="unit_id"
                                className={`form-control ${errors.unit_id ? 'is-invalid' : ''}`}
                                value={data.unit_id}
                                onChange={(event) => handleUnitChange(event.target.value)}
                                disabled={!selectedProduct || productUnits.length === 0}
                            >
                                <option value="">
                                    {!selectedProduct
                                        ? __('select_product', 'Select a product')
                                        : productUnits.length === 0
                                          ? __('no_product_units')
                                          : __('select_unit', 'Select a unit')}
                                </option>
                                {productUnits.map((unit) => (
                                    <option key={unit.id} value={unit.id}>
                                        {unit.display_name || unit.name}
                                    </option>
                                ))}
                            </select>
                            {selectedProduct && productUnits.length === 0 && (
                                <div className="price-lists-form__hint" role="status">
                                    {__('no_product_units')}
                                </div>
                            )}
                            {selectedUnit?.parent && (
                                <div className="price-lists-form__hint">
                                    {interpolate(__('conversion_hint', '1 :unit = :factor :base'), {
                                        unit: selectedUnit.name,
                                        factor: trimNumber(selectedUnit.conversion_factor),
                                        base: selectedUnit.parent.name,
                                    })}
                                </div>
                            )}
                            <FormError message={errors.unit_id} />
                        </div>
                    </div>

                    <div className="price-lists-form__row">
                        <div className="form-group">
                            <label className="form-label" htmlFor="pli_min_quantity">
                                {__('min_quantity')} <span className="price-lists-required">*</span>
                            </label>
                            <input
                                id="pli_min_quantity"
                                type="text"
                                inputMode="decimal"
                                className={`price-lists-readonly ${errors.min_quantity ? 'is-invalid' : ''}`}
                                value={selectedUnit ? trimNumber(data.min_quantity) : ''}
                                placeholder="—"
                                readOnly
                                aria-readonly="true"
                                tabIndex={-1}
                            />
                            <div className="price-lists-form__hint">
                                {selectedUnit
                                    ? interpolate(__('tier_label', ':quantity+'), {
                                          quantity: trimNumber(data.min_quantity) || '—',
                                      })
                                    : __('min_quantity_derived_hint')}
                            </div>
                            <FormError message={errors.min_quantity} />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="pli_unit_price">
                                {__('unit_price')} <span className="price-lists-required">*</span>
                            </label>
                            <input
                                id="pli_unit_price"
                                type="number"
                                step="0.0001"
                                min="0"
                                className={`form-control ${errors.unit_price ? 'is-invalid' : ''}`}
                                value={data.unit_price}
                                onChange={(event) => setData('unit_price', event.target.value)}
                            />
                            <FormError message={errors.unit_price} />
                        </div>
                    </div>

                    <div className="price-lists-form__row">
                        <div className="form-group">
                            <label className="form-label" htmlFor="pli_discount_percentage">
                                {__('discount_percentage')}
                            </label>
                            <input
                                id="pli_discount_percentage"
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                className={`form-control ${errors.discount_percentage ? 'is-invalid' : ''}`}
                                value={data.discount_percentage}
                                onChange={(event) => setData('discount_percentage', event.target.value)}
                            />
                            <FormError message={errors.discount_percentage} />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="pli_discount_amount">
                                {__('discount_amount')}
                            </label>
                            <input
                                id="pli_discount_amount"
                                type="number"
                                step="0.01"
                                min="0"
                                className={`form-control ${errors.discount_amount ? 'is-invalid' : ''}`}
                                value={data.discount_amount}
                                onChange={(event) => setData('discount_amount', event.target.value)}
                            />
                            <FormError message={errors.discount_amount} />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="pli_final_price">
                                {__('final_price')}
                            </label>
                            <input
                                id="pli_final_price"
                                type="text"
                                className="form-control"
                                value={previewFinalPrice === null ? '—' : formatMoney(previewFinalPrice, currencyCode)}
                                readOnly
                            />
                            <div className="price-lists-form__hint">{__('estimated_final')}</div>
                        </div>
                    </div>

                    <div className="price-lists-form__row">
                        <div className="form-group">
                            <label className="form-label" htmlFor="pli_effective_date">
                                {__('effective_date')}
                            </label>
                            <input
                                id="pli_effective_date"
                                type="date"
                                className={`form-control ${errors.effective_date ? 'is-invalid' : ''}`}
                                value={data.effective_date}
                                onChange={(event) => setData('effective_date', event.target.value)}
                            />
                            <FormError message={errors.effective_date} />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="pli_expiry_date">
                                {__('expiry_date')}
                            </label>
                            <input
                                id="pli_expiry_date"
                                type="date"
                                className={`form-control ${errors.expiry_date ? 'is-invalid' : ''}`}
                                value={data.expiry_date}
                                onChange={(event) => setData('expiry_date', event.target.value)}
                            />
                            <FormError message={errors.expiry_date} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="pli_notes">
                            {__('notes')}
                        </label>
                        <textarea
                            id="pli_notes"
                            className={`form-control form-textarea ${errors.notes ? 'is-invalid' : ''}`}
                            rows={2}
                            value={data.notes}
                            onChange={(event) => setData('notes', event.target.value)}
                        />
                        <FormError message={errors.notes} />
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="price-lists-btn" onClick={onClose}>
                            {__('cancel')}
                        </button>
                        <button
                            type="submit"
                            className="price-lists-btn price-lists-btn--primary"
                            disabled={processing}
                        >
                            {processing ? __('saving') : __('save')}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

const ManageProductPricesModal = ({
    show,
    priceList,
    product,
    items,
    loading,
    error,
    currencyCode,
    __,
    onClose,
    onAdd,
    onEdit,
    onDelete,
}) => (
    <Modal show={show} onClose={onClose} maxWidth="2xl">
        <div className="price-lists-modal price-lists-manage-modal">
            <div className="modal-header">
                <div>
                    <h3 className="modal-title">{__('manage_prices')}</h3>
                    <div className="price-lists-manage-modal__product">
                        <strong>{product?.display_name || product?.name}</strong>
                        {product?.sku && <span>{__('sku')}: {product.sku}</span>}
                    </div>
                    <div className="price-lists-manage-modal__list">
                        {priceList?.name_en || priceList?.name_ar} · {priceList?.code}
                    </div>
                </div>
                <button type="button" className="modal-close" onClick={onClose} aria-label={__('close')}>
                    <span className="material-icons-outlined">close</span>
                </button>
            </div>

            <div className="price-lists-manage-modal__toolbar">
                <span className="price-lists-badge price-lists-badge--type">
                    {interpolate(__('pricing_items_count_value', ':count pricing records'), {
                        count: items.length,
                    })}
                </span>
                <button type="button" className="price-lists-btn price-lists-btn--primary" onClick={onAdd}>
                    <span className="material-icons-outlined">add</span>
                    {__('add_item')}
                </button>
            </div>

            {error && (
                <div className="price-lists-alert" role="alert">
                    <span className="material-icons-outlined">error_outline</span>
                    <span>{error}</span>
                </div>
            )}

            {loading ? (
                <div className="price-lists-note" role="status">
                    <span className="material-icons-outlined">hourglass_top</span>
                    <span>{__('loading_pricing_records')}</span>
                </div>
            ) : !error && items.length === 0 ? (
                <div className="price-lists-empty-state">{__('no_product_prices')}</div>
            ) : !error && (
                <div className="price-lists-manage-modal__table-wrap">
                    <table className="price-lists-manage-table">
                        <thead>
                            <tr>
                                <th>{__('unit')}</th>
                                <th>{__('min_quantity')}</th>
                                <th>{__('unit_price')}</th>
                                <th>{__('discount')}</th>
                                <th>{__('final_price')}</th>
                                <th>{__('effective_date')}</th>
                                <th>{__('expiry_date')}</th>
                                <th>{__('item_status')}</th>
                                <th>{__('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <tr key={item.id}>
                                    <td><UnitCell unit={item.unit} __={__} /></td>
                                    <td>{trimNumber(item.min_quantity)}</td>
                                    <td>{formatMoney(item.unit_price, currencyCode)}</td>
                                    <td>
                                        {Number(item.discount_percentage) > 0 && (
                                            <span>{trimNumber(item.discount_percentage)}%</span>
                                        )}
                                        {Number(item.discount_amount) > 0 && (
                                            <span>{Number(item.discount_percentage) > 0 ? ' + ' : ''}{formatMoney(item.discount_amount, currencyCode)}</span>
                                        )}
                                        {Number(item.discount_percentage) <= 0 && Number(item.discount_amount) <= 0 && '—'}
                                    </td>
                                    <td className="price-lists-manage-table__final">
                                        {formatMoney(item.final_price, currencyCode)}
                                    </td>
                                    <td>{formatDate(item.effective_date)}</td>
                                    <td>{formatDate(item.expiry_date)}</td>
                                    <td>
                                        <StatusBadge status={item.status} label={__(item.status, item.status)} />
                                    </td>
                                    <td>
                                        <div className="price-lists-manage-table__actions">
                                            <button
                                                type="button"
                                                className="price-lists-btn price-lists-btn--ghost"
                                                onClick={() => onEdit(item)}
                                                aria-label={__('edit_item')}
                                                title={__('edit_item')}
                                            >
                                                <span className="material-icons-outlined">edit</span>
                                            </button>
                                            <button
                                                type="button"
                                                className="price-lists-btn price-lists-btn--ghost price-lists-btn--danger"
                                                onClick={() => onDelete(item)}
                                                aria-label={__('delete_item_confirm')}
                                                title={__('delete_item_confirm')}
                                            >
                                                <span className="material-icons-outlined">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    </Modal>
);

/* ------------------------------------------------------------------ *
 * Price list table (list mode)
 * ------------------------------------------------------------------ */

const PriceListsList = ({
    priceLists,
    currencies = [],
    priceTypes = [],
    stats = {},
    filters = {},
    getRoute,
    __,
}) => {
    const { props } = usePage();
    const pageErrors = props.errors || {};

    // Filters always restart from page 1 unless an explicit page is requested.
    const navigate = (params = {}) =>
        router.get(
            getRoute('admin.inventory.price-lists.index'),
            cleanParams({ ...filters, page: 1, ...params }),
            { preserveState: true, preserveScroll: true, replace: true }
        );

    const columns = useMemo(
        () => [
            {
                header: __('code'),
                key: 'code',
                sortable: true,
                render: (row) => (
                    <div className="price-lists-code">
                        <span className="price-lists-code__value">{row.code}</span>
                        {row.is_default && (
                            <span className="price-lists-badge price-lists-badge--default">
                                {__('default_list')}
                            </span>
                        )}
                    </div>
                ),
            },
            {
                header: __('name'),
                key: 'name_en',
                sortable: true,
                render: (row) => (
                    <div className="price-lists-name">
                        <div className="price-lists-name__main">{row.name_en || row.name_ar}</div>
                        {row.name_en && row.name_ar && (
                            <div className="price-lists-name__alt">{row.name_ar}</div>
                        )}
                    </div>
                ),
            },
            {
                header: __('price_type'),
                key: 'price_type',
                sortable: true,
                render: (row) => (
                    <span className="price-lists-badge price-lists-badge--type">
                        {__(row.price_type, row.price_type)}
                    </span>
                ),
            },
            {
                header: __('currency'),
                key: 'currency_id',
                render: (row) => row.currency?.code || '—',
            },
            {
                header: __('valid_from'),
                key: 'valid_from',
                sortable: true,
                render: (row) => formatDate(row.valid_from),
            },
            {
                header: __('valid_to'),
                key: 'valid_to',
                sortable: true,
                render: (row) => formatDate(row.valid_to),
            },
            {
                header: __('items_count'),
                key: 'items_count',
                sortable: true,
                render: (row) => <span className="price-lists-num">{row.items_count ?? 0}</span>,
            },
            {
                header: __('assigned_to'),
                key: 'assigned_customers_count',
                render: (row) => (
                    <div className="price-lists-assigned">
                        <span title={__('assigned_customers')}>
                            <span className="material-icons-outlined">person</span>
                            {row.assigned_customers_count ?? 0}
                        </span>
                        <span title={__('assigned_groups')}>
                            <span className="material-icons-outlined">groups</span>
                            {row.assigned_groups_count ?? 0}
                        </span>
                    </div>
                ),
            },
            {
                header: __('status'),
                key: 'is_active',
                sortable: true,
                render: (row) => (
                    <StatusBadge
                        status={row.is_active ? 'active' : 'inactive'}
                        label={row.is_active ? __('active_lists') : __('inactive')}
                    />
                ),
            },
        ],
        [__]
    );

    const deleteRow = (row) => {
        const message = interpolate(
            row.assigned_customers_count || row.assigned_groups_count
                ? __('delete_confirm_assigned', 'Delete this price list?')
                : __('delete_confirm', 'Delete this price list?'),
            {
                customers: row.assigned_customers_count ?? 0,
                groups: row.assigned_groups_count ?? 0,
            }
        );

        if (window.confirm(message)) {
            router.delete(getRoute('admin.inventory.price-lists.destroy', { price_list: row.id }), {
                preserveScroll: true,
            });
        }
    };

    const hasActiveFilters = Boolean(
        filters.search || filters.status || filters.price_type || filters.currency_id || filters.validity
    );

    const goToCreate = () => router.get(getRoute('admin.inventory.price-lists.create'));

    return (
        <>
            <BlankPage
                breadcrumbs={[
                    { label: 'Dashboard', href: getRoute('admin.dashboard') },
                    { label: 'Inventory', href: getRoute('admin.inventory.products.index') },
                    { label: __('title') },
                ]}
                stats={
                    <StatsCards
                        cards={[
                            {
                                label: __('total_lists'),
                                value: stats.total ?? 0,
                                icon: 'sell',
                                color: '#3b82f6',
                            },
                            {
                                label: __('active_lists'),
                                value: stats.active ?? 0,
                                icon: 'check_circle',
                                color: '#10b981',
                            },
                            {
                                label: __('scheduled_lists'),
                                value: stats.scheduled ?? 0,
                                icon: 'schedule',
                                color: '#f59e0b',
                            },
                            {
                                label: __('total_tiers'),
                                value: stats.items ?? 0,
                                icon: 'list_alt',
                                color: '#8b5cf6',
                            },
                        ]}
                    />
                }
            >
                <div className="price-lists-module">
                    <div className="price-lists-module__header">
                        <div>
                            <h1 className="price-lists-module__title">{__('title')}</h1>
                            <p className="price-lists-module__subtitle">{__('subtitle')}</p>
                        </div>
                    </div>

                    <ServerNote __={__} />

                    {pageErrors.price_list && (
                        <div className="price-lists-alert" role="alert">
                            <span className="material-icons-outlined">error_outline</span>
                            <span>{pageErrors.price_list}</span>
                        </div>
                    )}

                    <div className="price-lists-filters">
                        <div className="price-lists-filters__group">
                            <label className="price-lists-filters__label" htmlFor="plf_status">
                                {__('filter_status')}
                            </label>
                            <select
                                id="plf_status"
                                className="form-control"
                                value={filters.status || ''}
                                onChange={(event) => navigate({ status: event.target.value })}
                            >
                                <option value="">{__('all')}</option>
                                <option value="active">{__('active_lists')}</option>
                                <option value="inactive">{__('inactive')}</option>
                            </select>
                        </div>

                        <div className="price-lists-filters__group">
                            <label className="price-lists-filters__label" htmlFor="plf_price_type">
                                {__('filter_price_type')}
                            </label>
                            <select
                                id="plf_price_type"
                                className="form-control"
                                value={filters.price_type || ''}
                                onChange={(event) => navigate({ price_type: event.target.value })}
                            >
                                <option value="">{__('all')}</option>
                                {priceTypes.map((type) => (
                                    <option key={type} value={type}>
                                        {__(type, type)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="price-lists-filters__group">
                            <label className="price-lists-filters__label" htmlFor="plf_currency">
                                {__('filter_currency')}
                            </label>
                            <select
                                id="plf_currency"
                                className="form-control"
                                value={filters.currency_id || ''}
                                onChange={(event) => navigate({ currency_id: event.target.value })}
                            >
                                <option value="">{__('all')}</option>
                                {currencies.map((currency) => (
                                    <option key={currency.id} value={currency.id}>
                                        {currency.code}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="price-lists-filters__group">
                            <label className="price-lists-filters__label" htmlFor="plf_validity">
                                {__('filter_validity')}
                            </label>
                            <select
                                id="plf_validity"
                                className="form-control"
                                value={filters.validity || ''}
                                onChange={(event) => navigate({ validity: event.target.value })}
                            >
                                <option value="">{__('all')}</option>
                                <option value="valid">{__('valid')}</option>
                                <option value="scheduled">{__('scheduled')}</option>
                                <option value="expired">{__('expired')}</option>
                            </select>
                        </div>

                        <button
                            type="button"
                            className="price-lists-btn price-lists-btn--ghost"
                            onClick={() =>
                                navigate({
                                    search: '',
                                    status: '',
                                    price_type: '',
                                    currency_id: '',
                                    validity: '',
                                    page: 1,
                                })
                            }
                        >
                            <span className="material-icons-outlined">filter_alt_off</span>
                            {__('clear_filters')}
                        </button>
                    </div>

                    <Table
                        tableData={priceLists?.data || []}
                        columns={columns}
                        currentPage={priceLists?.current_page || 1}
                        totalPages={priceLists?.last_page || 1}
                        totalRecords={priceLists?.total || 0}
                        recordsPerPage={priceLists?.per_page || 10}
                        onPageChange={(page) => navigate({ page })}
                        onRecordsPerPageChange={(perPage) => navigate({ per_page: perPage, page: 1 })}
                        serverSide={true}
                        onSort={(key, direction) =>
                            navigate(
                                direction
                                    ? { sort_by: key, sort_dir: direction, page: 1 }
                                    : { sort_by: '', sort_dir: '' }
                            )
                        }
                        sortKey={filters.sort_by || null}
                        sortDirection={filters.sort_dir || null}
                        showToolbar={true}
                        toolbarSearch={true}
                        toolbarSearchPlaceholder={__('search_lists')}
                        toolbarSearchValue={filters.search || ''}
                        onToolbarSearch={(value) => navigate({ search: value, page: 1 })}
                        showRefreshButton={true}
                        onRefresh={() => router.reload({ only: ['priceLists', 'stats', 'filters'] })}
                        showAddButton={true}
                        addButtonText={__('create_list')}
                        onAdd={goToCreate}
                        emptyIcon="sell"
                        emptyMessage={hasActiveFilters ? __('empty_filtered') : __('empty')}
                        emptyAction={
                            <div className="price-lists-empty-action">
                                <button
                                    type="button"
                                    className="price-lists-btn price-lists-btn--primary"
                                    onClick={goToCreate}
                                >
                                    <span className="material-icons-outlined">add</span>
                                    {__('create_list')}
                                </button>
                            </div>
                        }
                        onView={(row) =>
                            router.get(getRoute('admin.inventory.price-lists.show', { price_list: row.id }))
                        }
                        onEdit={(row) =>
                            router.get(getRoute('admin.inventory.price-lists.edit', { price_list: row.id }))
                        }
                        onDelete={(row) => deleteRow(row)}
                        viewTitle={__('view_items')}
                        editTitle={__('edit_list')}
                        deleteTitle={__('delete_list')}
                    />
                </div>
            </BlankPage>
        </>
    );
};

/* ------------------------------------------------------------------ *
 * Price list detail: pricing items
 * ------------------------------------------------------------------ */

const PriceListDetail = ({
    priceList,
    products,
    productFilterProduct = null,
    units = [],
    assigned = { customers: 0, groups: 0 },
    stats = {},
    filters = {},
    getRoute,
    __,
}) => {
    const { props } = usePage();
    const pageErrors = props.errors || {};
    const { showSuccess, showError, showInfo } = useNotification();

    const currencyCode = priceList?.currency?.code || '';
    const [itemFormState, setItemFormState] = useState({
        open: false,
        item: null,
        product: null,
        returnToManage: false,
    });
    const [managePricesProduct, setManagePricesProduct] = useState(null);
    const [managedItems, setManagedItems] = useState([]);
    const [loadingManagedItems, setLoadingManagedItems] = useState(false);
    const [managedItemsError, setManagedItemsError] = useState('');
    const managedItemsRequestId = useRef(0);
    const [productFilterOptions, setProductFilterOptions] = useState([]);
    const [productFilterSearchError, setProductFilterSearchError] = useState('');
    const [loadingProducts, setLoadingProducts] = useState(false);
    const productFilterSearchTimer = useRef(null);
    const excelMenuRef = useRef(null);
    const importFileRef = useRef(null);
    const [showExcelMenu, setShowExcelMenu] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importRows, setImportRows] = useState([]);
    const [importFileName, setImportFileName] = useState('');
    const [importError, setImportError] = useState('');
    const [importLoading, setImportLoading] = useState(false);

    useEffect(() => {
        const closeExcelMenu = (event) => {
            if (excelMenuRef.current && !excelMenuRef.current.contains(event.target)) {
                setShowExcelMenu(false);
            }
        };
        document.addEventListener('mousedown', closeExcelMenu);
        return () => document.removeEventListener('mousedown', closeExcelMenu);
    }, []);

    useEffect(() => {
        if (!showImportModal) return undefined;

        const preventFileDropNavigation = (event) => {
            if (Array.from(event.dataTransfer?.types || []).includes('Files')) {
                event.preventDefault();
            }
        };
        window.addEventListener('dragover', preventFileDropNavigation);
        window.addEventListener('drop', preventFileDropNavigation);
        return () => {
            window.removeEventListener('dragover', preventFileDropNavigation);
            window.removeEventListener('drop', preventFileDropNavigation);
        };
    }, [showImportModal]);

    const navigate = (params = {}) =>
        router.get(
            getRoute('admin.inventory.price-lists.show', { price_list: priceList.id }),
            cleanParams({ ...filters, page: 1, ...params }),
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => setLoadingProducts(true),
                onFinish: () => setLoadingProducts(false),
            }
        );

    useEffect(() => {
        setProductFilterOptions(
            productFilterProduct
                ? [{
                      value: productFilterProduct.id,
                      label: productFilterProduct.sku
                          ? `${productFilterProduct.display_name} (${productFilterProduct.sku})`
                          : productFilterProduct.display_name,
                  }]
                : []
        );
    }, [productFilterProduct]);

    useEffect(
        () => () => {
            if (productFilterSearchTimer.current) {
                clearTimeout(productFilterSearchTimer.current);
            }
        },
        []
    );

    const unitOptions = useMemo(() => {
        return units.map((unit) => ({
            value: unit.id,
            label: unit.name,
            unit,
        }));
    }, [units]);

    const searchProductFilter = (term) => {
        if (productFilterSearchTimer.current) {
            clearTimeout(productFilterSearchTimer.current);
        }

        if (!term.trim()) {
            setProductFilterOptions(
                productFilterProduct
                    ? [{
                          value: productFilterProduct.id,
                          label: productFilterProduct.sku
                              ? `${productFilterProduct.display_name} (${productFilterProduct.sku})`
                              : productFilterProduct.display_name,
                      }]
                    : []
            );
            setProductFilterSearchError('');
            return;
        }

        productFilterSearchTimer.current = setTimeout(async () => {
            try {
                if (!window.axios) {
                    throw new Error('Product search is unavailable.');
                }
                const response = await window.axios.get(
                    getRoute('admin.inventory.price-lists.search-products'),
                    { params: { query: term } }
                );
                setProductFilterOptions((response?.data?.products || []).map((product) => ({
                    value: product.id,
                    label: product.sku
                        ? `${product.display_name || product.name} (${product.sku})`
                        : product.display_name || product.name,
                })));
                setProductFilterSearchError('');
            } catch (error) {
                console.error('Unable to search products for the price list filter.', error);
                setProductFilterSearchError(__('product_search_failed'));
            }
        }, 300);
    };

    const openAddPrice = (product) => {
        const availableUnits = product.unit_options || [];
        const filteredUnit = availableUnits.find(
            (unit) => String(unit.id) === String(filters.unit_id || '')
        );
        const selectedUnit = filteredUnit || (availableUnits.length === 1 ? availableUnits[0] : null);
        setItemFormState({
            open: true,
            item: null,
            product: { ...product, unit_id: selectedUnit?.id || '' },
            returnToManage: false,
        });
    };

    const loadManagedItems = async (productId) => {
        const requestId = ++managedItemsRequestId.current;
        setLoadingManagedItems(true);
        setManagedItemsError('');

        try {
            if (!window.axios) {
                throw new Error('Pricing record loading is unavailable.');
            }
            const response = await window.axios.get(
                getRoute('admin.inventory.price-lists.products.items', {
                    price_list: priceList.id,
                    product: productId,
                })
            );
            if (requestId === managedItemsRequestId.current) {
                setManagedItems(response?.data?.items || []);
            }
        } catch (error) {
            console.error('Unable to load pricing records for the selected product.', error);
            if (requestId === managedItemsRequestId.current) {
                setManagedItems([]);
                setManagedItemsError(__('pricing_records_load_failed'));
            }
        } finally {
            if (requestId === managedItemsRequestId.current) {
                setLoadingManagedItems(false);
            }
        }
    };

    const openManagePrices = (product) => {
        setManagePricesProduct(product);
        setManagedItems([]);
        void loadManagedItems(product.id);
    };

    const resetImport = () => {
        setImportRows([]);
        setImportFileName('');
        setImportError('');
        if (importFileRef.current) importFileRef.current.value = '';
    };

    const downloadPriceListTemplate = () => {
        const workbook = XLSX.utils.book_new();
        const dataSheet = XLSX.utils.aoa_to_sheet([priceListImportColumns]);
        const instructionsSheet = XLSX.utils.aoa_to_sheet([
            [__('template_instructions_title')],
            [__('template_required_columns')],
            ['product_id', __('template_product_id')],
            ['unit_id', __('template_unit_id')],
            ['min_quantity', __('template_min_quantity')],
            ['unit_price', __('template_unit_price')],
            [__('template_optional_columns')],
            ['discount_percentage', __('discount_percentage')],
            ['discount_amount', __('discount_amount')],
            ['effective_date', __('effective_date')],
            ['expiry_date', __('expiry_date')],
            ['notes', __('notes')],
            [__('template_identifier_hint')],
        ]);
        XLSX.utils.book_append_sheet(workbook, dataSheet, 'Price List Items');
        XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');
        XLSX.writeFile(workbook, `price-list-${priceList.id}-template.xlsx`);
    };

    const handlePriceListFileUpload = (file) => {
        if (!file) return;
        if (!/\.(xlsx|xls)$/i.test(file.name)) {
            resetImport();
            setImportError(__('invalid_excel_file'));
            return;
        }

        setImportFileName(file.name);
        setImportError('');
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const workbook = XLSX.read(new Uint8Array(event.target.result), { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                if (!firstSheet) {
                    throw new Error(__('empty_excel_file'));
                }

                const sheetRows = XLSX.utils.sheet_to_json(firstSheet, {
                    header: 1,
                    raw: false,
                    defval: '',
                });
                if (sheetRows.length < 2) {
                    throw new Error(__('empty_excel_file'));
                }

                const headers = sheetRows[0].map((header) =>
                    String(header).trim().toLowerCase().replace(/[\s-]+/g, '_')
                );
                const requiredColumns = ['product_id', 'unit_id', 'min_quantity', 'unit_price'];
                const missingColumns = requiredColumns.filter((column) => !headers.includes(column));
                if (missingColumns.length) {
                    throw new Error(interpolate(__('missing_excel_columns'), {
                        columns: missingColumns.join(', '),
                    }));
                }

                const columnIndexes = Object.fromEntries(
                    priceListImportColumns.map((column) => [column, headers.indexOf(column)])
                );
                const parsedRows = sheetRows.slice(1)
                    .filter((row) => row.some((value) => String(value).trim() !== ''))
                    .map((row) => Object.fromEntries(
                        priceListImportColumns.map((column) => {
                            const index = columnIndexes[column];
                            return [column, index >= 0 ? String(row[index] ?? '').trim() : ''];
                        })
                    ));

                if (!parsedRows.length) {
                    throw new Error(__('empty_excel_file'));
                }

                setImportRows(parsedRows);
                setImportError('');
            } catch (error) {
                setImportRows([]);
                setImportError(error.message || __('excel_read_failed'));
            }
        };
        reader.onerror = () => {
            setImportRows([]);
            setImportError(__('excel_read_failed'));
        };
        reader.readAsArrayBuffer(file);
    };

    const submitPriceListImport = async () => {
        if (importLoading || !importRows.length) return;
        setImportLoading(true);
        setImportError('');

        try {
            const response = await axios.post(
                getRoute('admin.inventory.price-lists.items.import', { price_list: priceList.id }),
                { rows: importRows }
            );
            showSuccess(response.data?.message || interpolate(__('import_success'), {
                count: response.data?.imported ?? importRows.length,
            }));
            setShowImportModal(false);
            resetImport();
            router.reload({ only: ['products', 'stats', 'filters'] });
        } catch (error) {
            const responseErrors = error.response?.data?.errors;
            const message = responseErrors
                ? Object.values(responseErrors).flat(Infinity).join(' ')
                : error.response?.data?.message || error.message || __('import_failed');
            setImportError(message);
            showError(message);
        } finally {
            setImportLoading(false);
        }
    };

    const exportPriceList = () => {
        window.location.href = getRoute('admin.inventory.price-lists.items.export', {
            price_list: priceList.id,
        });
        showInfo(__('export_started'));
    };

    const renderPriceListImportModal = () => showImportModal ? (
        <Modal show onClose={() => !importLoading && setShowImportModal(false)} maxWidth="2xl">
            <div className="price-lists-import-modal">
                <div className="modal-header">
                    <h3 className="modal-title">{__('import_title')}</h3>
                    <button
                        type="button"
                        className="modal-close"
                        onClick={() => !importLoading && setShowImportModal(false)}
                        aria-label={__('close')}
                    >
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>
                <div className="modal-body">
                    <p className="price-lists-import-hint">{__('import_hint')}</p>
                    <input
                        ref={importFileRef}
                        className="price-lists-import-file-input"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(event) => handlePriceListFileUpload(event.target.files?.[0])}
                    />
                    <button
                        type="button"
                        className="price-lists-import-dropzone"
                        disabled={importLoading}
                        onClick={() => importFileRef.current?.click()}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                            event.preventDefault();
                            handlePriceListFileUpload(event.dataTransfer.files?.[0]);
                        }}
                    >
                        <span className="material-icons-outlined">cloud_upload</span>
                        <strong>{__('click_to_upload')}</strong>
                        <span>{__('excel_only')}</span>
                    </button>
                    {importFileName && (
                        <div className="price-lists-import-filename">
                            {__('selected_file')}: {importFileName}
                        </div>
                    )}
                    {importRows.length > 0 && (
                        <div className="price-lists-import-summary" role="status">
                            {interpolate(__('import_rows_ready'), { count: importRows.length })}
                            <button type="button" className="price-lists-btn price-lists-btn--ghost" onClick={resetImport}>
                                {__('upload_different_file')}
                            </button>
                        </div>
                    )}
                    {importError && <div className="price-lists-alert" role="alert">{importError}</div>}
                </div>
                <div className="price-lists-import-actions">
                    <button
                        type="button"
                        className="price-lists-btn"
                        onClick={() => setShowImportModal(false)}
                        disabled={importLoading}
                    >
                        {__('cancel')}
                    </button>
                    <button
                        type="button"
                        className="price-lists-btn price-lists-btn--primary"
                        onClick={submitPriceListImport}
                        disabled={importLoading || importRows.length === 0}
                    >
                        {importLoading ? __('importing') : __('confirm_import')}
                    </button>
                </div>
            </div>
        </Modal>
    ) : null;

    const openManageItemForm = (item = null) => {
        const availableUnits = managePricesProduct?.unit_options || [];
        const filterUnit = availableUnits.find(
            (unit) => String(unit.id) === String(filters.unit_id || '')
        );
        const defaultUnit = filterUnit || (availableUnits.length === 1 ? availableUnits[0] : null);
        const product = item
            ? { ...managePricesProduct, unit_id: item.unit_id || managePricesProduct?.unit_id }
            : { ...managePricesProduct, unit_id: defaultUnit?.id || '' };
        setItemFormState({
            open: true,
            item: item ? { ...item, product } : null,
            product,
            returnToManage: true,
        });
    };

    const columns = useMemo(
        () => [
            {
                header: __('product'),
                key: 'name',
                sortable: true,
                render: (row) => <ProductCell product={row} __={__} />,
            },
            {
                header: __('sku'),
                key: 'sku',
                sortable: true,
                render: (row) => row.sku || '—',
            },
            {
                header: __('unit'),
                key: 'unit_id',
                render: (row) => <UnitCell unit={row.unit} __={__} />,
            },
            {
                header: __('price_status'),
                key: 'pricing_items_count',
                sortable: true,
                render: (row) => (
                    <StatusBadge
                        status={row.price_status}
                        label={__(row.price_status, row.price_status)}
                    />
                ),
            },
            {
                header: __('pricing_records'),
                key: 'pricing_records_count',
                render: (row) => interpolate(__('pricing_items_count_value', ':count pricing records'), {
                    count: row.total_pricing_records_count ?? row.pricing_items_count ?? 0,
                }),
            },
            {
                header: __('actions'),
                key: 'manage_prices',
                render: (row) => (
                    <button
                        type="button"
                        className={`price-lists-btn ${row.total_pricing_records_count > 0 ? 'price-lists-btn--ghost' : 'price-lists-btn--primary'}`}
                        onClick={() =>
                            row.total_pricing_records_count > 0 ? openManagePrices(row) : openAddPrice(row)
                        }
                    >
                        <span className="material-icons-outlined">
                            {row.total_pricing_records_count > 0 ? 'tune' : 'add'}
                        </span>
                        {row.total_pricing_records_count > 0 ? __('manage_prices') : __('add_product_price')}
                    </button>
                ),
            },
        ],
        [__, openAddPrice, openManagePrices]
    );

    function deleteItem(row) {
        if (!window.confirm(__('delete_item_confirm'))) return;

        router.delete(
            getRoute('admin.inventory.price-lists.items.destroy', {
                price_list: priceList.id,
                item: row.id,
            }),
            {
                preserveScroll: true,
                onSuccess: () => setManagedItems((current) => current.filter((item) => item.id !== row.id)),
            }
        );
    }

    const deleteList = () => {
        const message = interpolate(
            assigned.customers || assigned.groups
                ? __('delete_confirm_assigned', 'Delete this price list?')
                : __('delete_confirm', 'Delete this price list?'),
            { customers: assigned.customers ?? 0, groups: assigned.groups ?? 0 }
        );

        if (window.confirm(message)) {
            // The record stops existing after this call, so the user must not be
            // left on its (now stale) detail URL - go back to the list instead.
            router.delete(getRoute('admin.inventory.price-lists.destroy', { price_list: priceList.id }), {
                onSuccess: () =>
                    router.get(getRoute('admin.inventory.price-lists.index')),
            });
        }
    };

    const listName = priceList?.name_en || priceList?.name_ar;

    // Display-only summary of the rounding configuration stored on the record
    // (the sales pricing engine remains the only authority on price values).
    const roundingMethod = priceList?.rounding_method || 'none';
    const roundingSummary =
        roundingMethod === 'none'
            ? __('rounding_none')
            : `${__(`rounding_${roundingMethod}`, roundingMethod)} · ${trimNumber(priceList?.rounding_factor)}`;

    return (
        <>
            <BlankPage
                breadcrumbs={[
                    { label: 'Dashboard', href: getRoute('admin.dashboard') },
                    { label: 'Inventory', href: getRoute('admin.inventory.products.index') },
                    {
                        label: __('title'),
                        onClick: () => router.get(getRoute('admin.inventory.price-lists.index')),
                    },
                    { label: listName },
                ]}
                stats={
                    <StatsCards
                        cards={[
                            {
                                label: __('products_priced'),
                                value: stats.products ?? 0,
                                icon: 'inventory_2',
                                color: '#3b82f6',
                            },
                            {
                                label: __('total_tiers'),
                                value: stats.tiers ?? 0,
                                icon: 'list_alt',
                                color: '#8b5cf6',
                            },
                            {
                                label: __('active_tiers'),
                                value: stats.active ?? 0,
                                icon: 'check_circle',
                                color: '#10b981',
                            },
                            {
                                label: __('expired_tiers'),
                                value: stats.expired ?? 0,
                                icon: 'event_busy',
                                color: '#ef4444',
                            },
                        ]}
                    />
                }
            >
                <div className="price-lists-module">
                    <div className="price-lists-detail-header">
                        <div className="price-lists-detail-header__main">
                            <div className="price-lists-detail-header__title">
                                <h1>{listName}</h1>
                                <span className="price-lists-code__value">{priceList?.code}</span>
                                <StatusBadge
                                    status={priceList?.is_active ? 'active' : 'inactive'}
                                    label={priceList?.is_active ? __('active_lists') : __('inactive')}
                                />
                                {priceList?.is_default && (
                                    <span className="price-lists-badge price-lists-badge--default">
                                        {__('default_list')}
                                    </span>
                                )}
                            </div>

                            <div className="price-lists-detail-header__hint">
                                <span className="material-icons-outlined">link</span>
                                {__('assignments_hint')}
                            </div>
                        </div>

                        <div className="price-lists-detail-header__actions">
                            <div className="price-lists-excel-dropdown" ref={excelMenuRef}>
                                <button
                                    type="button"
                                    className="price-lists-excel-button"
                                    onClick={() => setShowExcelMenu((visible) => !visible)}
                                    aria-expanded={showExcelMenu}
                                >
                                    <span className="material-icons-outlined">grid_on</span>
                                    <span>{__('excel')}</span>
                                    <span className="material-icons-outlined">expand_more</span>
                                </button>
                                {showExcelMenu && (
                                    <div className="price-lists-excel-menu">
                                        <button
                                            type="button"
                                            className="price-lists-excel-menu__item"
                                            onClick={() => {
                                                setShowExcelMenu(false);
                                                resetImport();
                                                setShowImportModal(true);
                                            }}
                                        >
                                            <span className="material-icons-outlined">upload</span>
                                            {__('import_excel')}
                                        </button>
                                        <button
                                            type="button"
                                            className="price-lists-excel-menu__item"
                                            onClick={() => {
                                                setShowExcelMenu(false);
                                                exportPriceList();
                                            }}
                                        >
                                            <span className="material-icons-outlined">download</span>
                                            {__('export_excel')}
                                        </button>
                                        <button
                                            type="button"
                                            className="price-lists-excel-menu__item"
                                            onClick={() => {
                                                setShowExcelMenu(false);
                                                downloadPriceListTemplate();
                                            }}
                                        >
                                            <span className="material-icons-outlined">description</span>
                                            {__('download_template')}
                                        </button>
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                className="price-lists-btn price-lists-btn--primary"
                                onClick={() => setItemFormState({
                                    open: true,
                                    item: null,
                                    product: null,
                                    returnToManage: false,
                                })}
                            >
                                <span className="material-icons-outlined">add</span>
                                {__('add_item')}
                            </button>
                            <button
                                type="button"
                                className="price-lists-btn"
                                onClick={() =>
                                    router.get(
                                        getRoute('admin.inventory.price-lists.edit', {
                                            price_list: priceList.id,
                                        })
                                    )
                                }
                            >
                                <span className="material-icons-outlined">edit</span>
                                {__('edit_list')}
                            </button>
                            <button
                                type="button"
                                className="price-lists-btn"
                                onClick={() => router.get(getRoute('admin.inventory.price-lists.index'))}
                            >
                                <span className="material-icons-outlined">arrow_back</span>
                                {__('title')}
                            </button>
                            <button type="button" className="price-lists-btn price-lists-btn--danger" onClick={deleteList}>
                                <span className="material-icons-outlined">delete</span>
                                {__('delete_list')}
                            </button>
                        </div>
                    </div>

                    <section className="price-lists-info">
                        <div className="price-lists-section__header">
                            <h2 className="price-lists-section__title">{__('section_information')}</h2>
                        </div>

                        <dl className="price-lists-info__grid">
                            <div className="price-lists-info__item">
                                <dt>{__('price_type')}</dt>
                                <dd>{__(priceList?.price_type, priceList?.price_type)}</dd>
                            </div>
                            <div className="price-lists-info__item">
                                <dt>{__('currency')}</dt>
                                <dd>{priceList?.currency?.code || '—'}</dd>
                            </div>
                            <div className="price-lists-info__item">
                                <dt>{__('validity_period')}</dt>
                                <dd>
                                    {formatDate(priceList?.valid_from)} — {formatDate(priceList?.valid_to)}
                                </dd>
                            </div>
                            <div className="price-lists-info__item">
                                <dt>{__('rounding')}</dt>
                                <dd>{roundingSummary}</dd>
                            </div>
                            <div className="price-lists-info__item">
                                <dt>{__('assigned_customers')}</dt>
                                <dd>{assigned.customers ?? 0}</dd>
                            </div>
                            <div className="price-lists-info__item">
                                <dt>{__('assigned_groups')}</dt>
                                <dd>{assigned.groups ?? 0}</dd>
                            </div>
                            <div className="price-lists-info__item price-lists-info__item--wide">
                                <dt>{__('notes')}</dt>
                                <dd>{priceList?.notes || '—'}</dd>
                            </div>
                        </dl>
                    </section>

                    {!priceList?.is_active && (
                        <div className="price-lists-alert price-lists-alert--warning" role="alert">
                            <span className="material-icons-outlined">warning_amber</span>
                            <span>{__('inactive_list_warning')}</span>
                        </div>
                    )}

                    <ServerNote __={__} />

                    {pageErrors.item && (
                        <div className="price-lists-alert" role="alert">
                            <span className="material-icons-outlined">error_outline</span>
                            <span>{pageErrors.item}</span>
                        </div>
                    )}

                    <div className="price-lists-filters">
                        <div className="price-lists-filters__group price-lists-filters__group--wide">
                            <label className="price-lists-filters__label" htmlFor="plif_product">
                                {__('filter_product')}
                            </label>
                            <SearchableComboBox
                                options={productFilterOptions}
                                value={filters.product_id || ''}
                                onChange={(value) => navigate({ product_id: value, page: 1 })}
                                onSearch={searchProductFilter}
                                disableFiltering={true}
                                name="product_filter"
                                placeholder={__('filter_product')}
                            />
                        </div>

                        <div className="price-lists-filters__group">
                            <label className="price-lists-filters__label" htmlFor="plif_price_status">
                                {__('price_status', 'Price Status')}
                            </label>
                            <select
                                id="plif_price_status"
                                className="form-control"
                                value={filters.price_status || ''}
                                onChange={(event) => navigate({ price_status: event.target.value, page: 1 })}
                            >
                                <option value="">{__('all')}</option>
                                <option value="with_price">{__('with_price')}</option>
                                <option value="without_price">{__('without_price')}</option>
                            </select>
                        </div>

                        <div className="price-lists-filters__group">
                            <label className="price-lists-filters__label" htmlFor="plif_unit">
                                {__('filter_unit')}
                            </label>
                            <select
                                id="plif_unit"
                                className="form-control"
                                value={filters.unit_id || ''}
                                onChange={(event) => navigate({ unit_id: event.target.value, page: 1 })}
                            >
                                <option value="">{__('all')}</option>
                                {unitOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="price-lists-filters__group">
                            <label className="price-lists-filters__label" htmlFor="plif_status">
                                {__('item_status')}
                            </label>
                            <select
                                id="plif_status"
                                className="form-control"
                                value={filters.item_status || ''}
                                onChange={(event) => navigate({ item_status: event.target.value, page: 1 })}
                            >
                                <option value="">{__('all')}</option>
                                <option value="active">{__('valid')}</option>
                                <option value="scheduled">{__('scheduled')}</option>
                                <option value="expired">{__('expired')}</option>
                            </select>
                        </div>

                        <button
                            type="button"
                            className="price-lists-btn price-lists-btn--ghost"
                            onClick={() =>
                                navigate({
                                    search: '',
                                    product_id: '',
                                    price_status: '',
                                    unit_id: '',
                                    item_status: '',
                                    page: 1,
                                })
                            }
                        >
                            <span className="material-icons-outlined">filter_alt_off</span>
                            {__('clear_filters')}
                        </button>
                    </div>

                    {productFilterSearchError && (
                        <div className="price-lists-alert" role="alert">
                            <span className="material-icons-outlined">error_outline</span>
                            <span>{productFilterSearchError}</span>
                        </div>
                    )}
                    {loadingProducts && (
                        <div className="price-lists-note" role="status">
                            <span className="material-icons-outlined">hourglass_top</span>
                            <span>{__('loading_products')}</span>
                        </div>
                    )}

                    <div className="price-lists-section__header price-lists-section__header--standalone">
                        <h2 className="price-lists-section__title">{__('manage_items')}</h2>
                    </div>

                    <Table
                        tableData={products?.data || []}
                        columns={columns}
                        currentPage={products?.current_page || 1}
                        totalPages={products?.last_page || 1}
                        totalRecords={products?.total || 0}
                        recordsPerPage={products?.per_page || 10}
                        onPageChange={(page) => navigate({ page })}
                        onRecordsPerPageChange={(perPage) => navigate({ per_page: perPage, page: 1 })}
                        serverSide={true}
                        onSort={(key, direction) =>
                            navigate(
                                direction
                                    ? { sort_by: key, sort_dir: direction, page: 1 }
                                    : { sort_by: '', sort_dir: '' }
                            )
                        }
                        sortKey={filters.sort_by || null}
                        sortDirection={filters.sort_dir || null}
                        showToolbar={true}
                        toolbarSearch={true}
                        toolbarSearchPlaceholder={__('search_items')}
                        toolbarSearchValue={filters.search || ''}
                        onToolbarSearch={(value) => navigate({ search: value, page: 1 })}
                        showRefreshButton={true}
                        onRefresh={() =>
                            router.reload({
                                only: ['products', 'productFilterProduct', 'stats', 'filters'],
                            })
                        }
                        showAddButton={true}
                        addButtonText={__('add_item')}
                        onAdd={() => setItemFormState({
                            open: true,
                            item: null,
                            product: null,
                            returnToManage: false,
                        })}
                        emptyIcon="inventory_2"
                        emptyMessage={__('no_products_match')}
                    />
                </div>
            </BlankPage>

            {renderPriceListImportModal()}

            {managePricesProduct && !itemFormState.open && (
                <ManageProductPricesModal
                    show={true}
                    priceList={priceList}
                    product={managePricesProduct}
                    items={managedItems}
                    loading={loadingManagedItems}
                    error={managedItemsError}
                    currencyCode={currencyCode}
                    __={__}
                    onClose={() => {
                        managedItemsRequestId.current += 1;
                        setManagePricesProduct(null);
                    }}
                    onAdd={() => openManageItemForm()}
                    onEdit={(item) => openManageItemForm(item)}
                    onDelete={deleteItem}
                />
            )}

            {itemFormState.open && (
                <PriceItemFormModal
                    key={itemFormState.item?.id || itemFormState.product?.id || 'new'}
                    show={itemFormState.open}
                    priceList={priceList}
                    item={itemFormState.item}
                    product={itemFormState.product}
                    getRoute={getRoute}
                    onClose={(saved = false) => {
                        const returnToManage = itemFormState.returnToManage && managePricesProduct;
                        setItemFormState({
                            open: false,
                            item: null,
                            product: null,
                            returnToManage: false,
                        });
                        if (saved && returnToManage) {
                            void loadManagedItems(returnToManage.id);
                        }
                    }}
                />
            )}
        </>
    );
};

/* ------------------------------------------------------------------ *
 * Page entry
 * ------------------------------------------------------------------ */

const PriceLists = ({
    mode = 'list',
    priceLists,
    priceList,
    products,
    productFilterProduct,
    units = [],
    currencies = [],
    priceTypes = [],
    roundingMethods = [],
    stats = {},
    nextCode = '',
    filters = {},
    assigned = { customers: 0, groups: 0 },
}) => {
    const { props } = usePage();
    const localization = props.localization || {};
    const translations = localization.translations || {};

    const getRoute = (name, params = {}) =>
        route(name, {
            country: localization.country_code || 'sa',
            lang: localization.current_locale || 'ar',
            ...params,
        });

    const __ = (key, fallback = key, replacements = {}) =>
        interpolate(translations[`PriceLists.${key}`] || fallback, replacements);

    return (
        <AdminLayout activeMenu="Inventory">
            <Head title={`${__('title', 'Price Lists')} - ZodicERP`} />

            {mode === 'create' ? (
                <PriceListFormPage
                    mode="create"
                    currencies={currencies}
                    priceTypes={priceTypes}
                    roundingMethods={roundingMethods}
                    nextCode={nextCode}
                    getRoute={getRoute}
                    __={__}
                />
            ) : mode === 'edit' ? (
                <PriceListFormPage
                    mode="edit"
                    priceList={priceList}
                    currencies={currencies}
                    priceTypes={priceTypes}
                    roundingMethods={roundingMethods}
                    getRoute={getRoute}
                    __={__}
                />
            ) : mode === 'detail' ? (
                <PriceListDetail
                    priceList={priceList}
                    products={products}
                    productFilterProduct={productFilterProduct}
                    units={units}
                    assigned={assigned}
                    stats={stats}
                    filters={filters}
                    getRoute={getRoute}
                    __={__}
                />
            ) : (
                <PriceListsList
                    priceLists={priceLists}
                    currencies={currencies}
                    priceTypes={priceTypes}
                    stats={stats}
                    filters={filters}
                    getRoute={getRoute}
                    __={__}
                />
            )}
        </AdminLayout>
    );
};

export default PriceLists;
