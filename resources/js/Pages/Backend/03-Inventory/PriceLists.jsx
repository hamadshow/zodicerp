import React, { useMemo, useRef, useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
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
            <div className="price-lists-product__name">{product.name}</div>
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
    usePage();

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
                    <div>
                        <h2 className="price-lists-form-page__title">
                            {isEdit ? __('edit_list') : __('create_list')}
                        </h2>
                        <div className="price-lists-form-page__subtitle">
                            {isEdit
                                ? __('edit_list_hint', 'Edit the price list header details below.')
                                : __('create_list_hint', 'Create a new price list header below.')}
                        </div>
                    </div>
                    <button type="button" className="price-lists-btn price-lists-btn--ghost" onClick={goBack}>
                        <span className="material-icons-outlined">arrow_back</span>
                        {__('back_to_list', 'Back to Price Lists')}
                    </button>
                </div>

                <div className="price-lists-form-page__card">
                    <form onSubmit={submit} className="price-lists-form">
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
                                {processing
                                    ? __('saving')
                                    : isEdit
                                    ? __('update_list', 'Update Price List')
                                    : __('save_list', 'Save Price List')}
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
    units = [],
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
        product_id: item?.product_id || '',
        unit_id: item?.unit_id || '',
        min_quantity: item?.min_quantity ?? 1,
        unit_price: item?.unit_price ?? '',
        discount_percentage: item?.discount_percentage ?? 0,
        discount_amount: item?.discount_amount ?? 0,
        effective_date: item?.effective_date ? String(item.effective_date).slice(0, 10) : '',
        expiry_date: item?.expiry_date ? String(item.expiry_date).slice(0, 10) : '',
        notes: item?.notes || '',
    });

    const { data, setData, errors, processing } = form;

    const [selectedProduct, setSelectedProduct] = useState(item?.product || null);
    const [productOptions, setProductOptions] = useState(() =>
        item?.product
            ? [
                  {
                      value: item.product_id,
                      label: item.product.sku ? `${item.product.name} (${item.product.sku})` : item.product.name,
                      product: item.product,
                  },
              ]
            : []
    );
    const [searching, setSearching] = useState(false);
    const searchTimer = useRef(null);

    const unitOptions = useMemo(() => units || [], [units]);

    const selectedUnit = useMemo(
        () => unitOptions.find((unit) => String(unit.id) === String(data.unit_id)) || null,
        [unitOptions, data.unit_id]
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
                        label: product.sku ? `${product.name} (${product.sku})` : product.name,
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

    const handleProductChange = (value) => {
        setData('product_id', value);

        const option = productOptions.find((entry) => String(entry.value) === String(value));
        const product = option?.product || null;
        setSelectedProduct(product);

        if (product?.unit_id && unitOptions.some((unit) => String(unit.id) === String(product.unit_id))) {
            setData('unit_id', product.unit_id);
        }
    };

    const submit = (event) => {
        event.preventDefault();

        const options = { preserveScroll: true, onSuccess: () => onClose() };

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
                                                {option.product.sale_price || option.product.price ? (
                                                    <span>
                                                        {__('indicative_product_price')}:{' '}
                                                        {formatMoney(
                                                            option.product.sale_price || option.product.price,
                                                            currencyCode
                                                        )}
                                                    </span>
                                                ) : null}
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
                                onChange={(event) => setData('unit_id', event.target.value)}
                            >
                                <option value="">{__('select_unit', 'Select a unit')}</option>
                                {unitOptions.map((unit) => (
                                    <option key={unit.id} value={unit.id}>
                                        {unit.name}
                                    </option>
                                ))}
                            </select>
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
                                type="number"
                                step="0.0001"
                                min="0"
                                className={`form-control ${errors.min_quantity ? 'is-invalid' : ''}`}
                                value={data.min_quantity}
                                onChange={(event) => setData('min_quantity', event.target.value)}
                            />
                            <div className="price-lists-form__hint">
                                {interpolate(__('tier_label', ':quantity+'), {
                                    quantity: trimNumber(data.min_quantity) || '—',
                                })}
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
                        onAdd={() => router.get(getRoute('admin.inventory.price-lists.create'))}
                        onView={(row) =>
                            router.get(getRoute('admin.inventory.price-lists.show', { price_list: row.id }))
                        }
                        onEdit={(row) =>
                            router.get(getRoute('admin.inventory.price-lists.edit', { price_list: row.id }))
                        }
                        onDelete={(row) => deleteRow(row)}
                        viewTitle={__('view_items')}
                        editTitle={__('edit_list')}
                        deleteTitle={__('delete_confirm')}
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
    items,
    units = [],
    tierProducts = [],
    tierLadder = [],
    assigned = { customers: 0, groups: 0 },
    stats = {},
    filters = {},
    getRoute,
    __,
}) => {
    const { props } = usePage();
    const pageErrors = props.errors || {};

    const currencyCode = priceList?.currency?.code || '';
    const [itemFormState, setItemFormState] = useState({ open: false, item: null });

    const navigate = (params = {}) =>
        router.get(
            getRoute('admin.inventory.price-lists.show', { price_list: priceList.id }),
            cleanParams({ ...filters, page: 1, ...params }),
            { preserveState: true, preserveScroll: true, replace: true }
        );

    const unitOptions = useMemo(() => {
        const usedIds = new Set(tierProducts.map((row) => String(row.unit_id)));
        const used = units.filter((unit) => usedIds.has(String(unit.id)));

        return (used.length > 0 ? used : units).map((unit) => ({
            value: unit.id,
            label: unit.name,
            unit,
        }));
    }, [units, tierProducts]);

    const productFilterOptions = useMemo(
        () =>
            tierProducts.map((row) => ({
                value: row.product_id,
                label: row.product_sku ? `${row.product_name} (${row.product_sku})` : row.product_name,
            })),
        [tierProducts]
    );

    const columns = useMemo(
        () => [
            {
                header: __('product'),
                key: 'product_id',
                sortable: true,
                render: (row) => <ProductCell product={row.product} __={__} />,
            },
            {
                header: __('sku'),
                key: 'sku',
                render: (row) => row.product?.sku || '—',
            },
            {
                header: __('unit'),
                key: 'unit_id',
                render: (row) => <UnitCell unit={row.unit} __={__} />,
            },
            {
                header: __('min_quantity'),
                key: 'min_quantity',
                sortable: true,
                render: (row) => (
                    <span className="price-lists-tier" title={__('tier_ladder')}>
                        {interpolate(__('tier_label', ':quantity+'), {
                            quantity: trimNumber(row.min_quantity),
                        })}
                    </span>
                ),
            },
            {
                header: __('unit_price'),
                key: 'unit_price',
                sortable: true,
                render: (row) => (
                    <span className="price-lists-num">{formatMoney(row.unit_price, currencyCode)}</span>
                ),
            },
            {
                header: __('discount_percentage'),
                key: 'discount_percentage',
                render: (row) => (
                    <span className="price-lists-num">
                        {Number(row.discount_percentage) > 0
                            ? `${trimNumber(row.discount_percentage)}%`
                            : '—'}
                    </span>
                ),
            },
            {
                header: __('discount_amount'),
                key: 'discount_amount',
                render: (row) => (
                    <span className="price-lists-num">
                        {Number(row.discount_amount) > 0 ? formatMoney(row.discount_amount, currencyCode) : '—'}
                    </span>
                ),
            },
            {
                header: __('final_price'),
                key: 'final_price',
                sortable: true,
                render: (row) => (
                    <span className="price-lists-num price-lists-num--strong">
                        {formatMoney(row.final_price, currencyCode)}
                    </span>
                ),
            },
            {
                header: __('effective_date'),
                key: 'effective_date',
                sortable: true,
                render: (row) => formatDate(row.effective_date),
            },
            {
                header: __('expiry_date'),
                key: 'expiry_date',
                sortable: true,
                render: (row) => formatDate(row.expiry_date),
            },
            {
                header: __('item_status'),
                key: 'status',
                render: (row) => <StatusBadge status={row.status} label={__(row.status, row.status)} />,
            },
        ],
        [__, currencyCode]
    );

    const deleteItem = (row) => {
        if (!window.confirm(__('delete_item_confirm'))) return;

        router.delete(
            getRoute('admin.inventory.price-lists.items.destroy', {
                price_list: priceList.id,
                item: row.id,
            }),
            { preserveScroll: true }
        );
    };

    const deleteList = () => {
        const message = interpolate(
            assigned.customers || assigned.groups
                ? __('delete_confirm_assigned', 'Delete this price list?')
                : __('delete_confirm', 'Delete this price list?'),
            { customers: assigned.customers ?? 0, groups: assigned.groups ?? 0 }
        );

        if (window.confirm(message)) {
            router.delete(getRoute('admin.inventory.price-lists.destroy', { price_list: priceList.id }));
        }
    };

    const listName = priceList?.name_en || priceList?.name_ar;

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
                                <h2>{listName}</h2>
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

                            <div className="price-lists-detail-header__meta">
                                <span>
                                    <span className="material-icons-outlined">sell</span>
                                    {__(priceList?.price_type, priceList?.price_type)}
                                </span>
                                <span>
                                    <span className="material-icons-outlined">payments</span>
                                    {priceList?.currency?.code || '—'}
                                </span>
                                <span>
                                    <span className="material-icons-outlined">event</span>
                                    {__('validity_period')}: {formatDate(priceList?.valid_from)} —{' '}
                                    {formatDate(priceList?.valid_to)}
                                </span>
                                <span>
                                    <span className="material-icons-outlined">person</span>
                                    {__('assigned_customers')}: {assigned.customers ?? 0}
                                </span>
                                <span>
                                    <span className="material-icons-outlined">groups</span>
                                    {__('assigned_groups')}: {assigned.groups ?? 0}
                                </span>
                            </div>

                            <div className="price-lists-detail-header__hint">
                                <span className="material-icons-outlined">link</span>
                                {__('assignments_hint')}
                            </div>
                        </div>

                        <div className="price-lists-detail-header__actions">
                            <button
                                type="button"
                                className="price-lists-btn price-lists-btn--primary"
                                onClick={() => setItemFormState({ open: true, item: null })}
                            >
                                <span className="material-icons-outlined">add</span>
                                {__('add_item')}
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
                                {__('delete_confirm', 'Delete')}
                            </button>
                        </div>
                    </div>

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
                                name="product_filter"
                                placeholder={__('filter_product')}
                            />
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
                                navigate({ search: '', product_id: '', unit_id: '', item_status: '', page: 1 })
                            }
                        >
                            <span className="material-icons-outlined">filter_alt_off</span>
                            {__('clear_filters')}
                        </button>
                    </div>

                    {filters.product_id !== '' && filters.product_id !== undefined && (
                        <div className="price-lists-tiers">
                            <div className="price-lists-tiers__header">
                                <span className="material-icons-outlined">stairs</span>
                                <div>
                                    <div className="price-lists-tiers__title">{__('tier_ladder')}</div>
                                    <div className="price-lists-tiers__hint">{__('tier_ladder_hint')}</div>
                                </div>
                            </div>

                            {tierLadder.length === 0 ? (
                                <div className="price-lists-tiers__empty">{__('tier_ladder_empty')}</div>
                            ) : (
                                <div className="price-lists-tiers__items">
                                    {tierLadder.map((tier) => (
                                        <div className="price-lists-tiers__item" key={tier.id}>
                                            <span className="price-lists-tier">
                                                {interpolate(__('tier_label', ':quantity+'), {
                                                    quantity: trimNumber(tier.min_quantity),
                                                })}
                                            </span>
                                            <span className="material-icons-outlined">trending_flat</span>
                                            <span className="price-lists-num price-lists-num--strong">
                                                {formatMoney(tier.final_price, currencyCode)}
                                            </span>
                                            <span className="price-lists-tiers__unit">
                                                / {tier.unit_name || '—'}
                                            </span>
                                            {Number(tier.discount_percentage) > 0 && (
                                                <span className="price-lists-badge price-lists-badge--type">
                                                    -{trimNumber(tier.discount_percentage)}%
                                                </span>
                                            )}
                                            <StatusBadge status={tier.status} label={__(tier.status, tier.status)} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <Table
                        tableData={items?.data || []}
                        columns={columns}
                        currentPage={items?.current_page || 1}
                        totalPages={items?.last_page || 1}
                        totalRecords={items?.total || 0}
                        recordsPerPage={items?.per_page || 10}
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
                        onRefresh={() => router.reload({ only: ['items', 'stats', 'filters', 'tierProducts', 'tierLadder'] })}
                        showAddButton={true}
                        addButtonText={__('add_item')}
                        onAdd={() => setItemFormState({ open: true, item: null })}
                        onEdit={(row) => setItemFormState({ open: true, item: row })}
                        onDelete={(row) => deleteItem(row)}
                        editTitle={__('edit_item')}
                        deleteTitle={__('delete_item_confirm')}
                    />
                </div>
            </BlankPage>

            {itemFormState.open && (
                <PriceItemFormModal
                    key={itemFormState.item?.id || 'new'}
                    show={itemFormState.open}
                    priceList={priceList}
                    item={itemFormState.item}
                    units={units}
                    getRoute={getRoute}
                    onClose={() => setItemFormState({ open: false, item: null })}
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
    items,
    units = [],
    currencies = [],
    priceTypes = [],
    roundingMethods = [],
    stats = {},
    nextCode = '',
    filters = {},
    tierProducts = [],
    tierLadder = [],
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
                    items={items}
                    units={units}
                    tierProducts={tierProducts}
                    tierLadder={tierLadder}
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
                    roundingMethods={roundingMethods}
                    stats={stats}
                    nextCode={nextCode}
                    filters={filters}
                    getRoute={getRoute}
                    __={__}
                />
            )}
        </AdminLayout>
    );
};

export default PriceLists;
