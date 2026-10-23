import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import SearchableComboBox from '../components/SearchableComboBox';
import { formatDate } from '@/utils/date';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';

/**
 * Sales Quotations.
 *
 * Pricing context comes from the server (per price list: sellable products
 * with their priced units and quantity-tier prices), so this page can:
 *   - gate the invoice items section until a customer AND one of that
 *     customer's eligible price lists are selected;
 *   - offer only products/units priced in the selected price list (variation
 *     children shown with their composite attribute names, never the variable
 *     parent template);
 *   - fill unit prices from the selected list's tiers and reject prices or
 *     quantities that do not match the authorized pricing.
 * The server re-validates everything independently on save.
 */

export default function SalesQuotations({
    quotations,
    customers,
    currencies,
    products,
    units,
    priceLists = [],
    priceListPricing = [],
    warehouses = [],
    salesAgents = []
}) {
    const [mode, setMode] = useState('list'); // list, create, edit
    const invoiceRef = useRef(null);
    const printRef = useRef(null);
    const { props } = usePage();
    const flash = (props && props.flash) ? props.flash : {};
    const { errors } = props;

    // Per-row validation messages (client side) + transient notices.
    const [itemErrors, setItemErrors] = useState({});
    const [formError, setFormError] = useState('');
    const [actionNotice, setActionNotice] = useState('');

    // Initial Form State
    const { data, setData, post, put, delete: destroy, processing, reset } = useForm({
        id: '',
        quotation_number: '',
        quotation_date: new Date().toISOString().split('T')[0],
        expiry_date: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
        valid_days: 30,
        customer_id: '',
        currency_id: '',
        exchange_rate: 1.000000,
        status: 'draft',

        // Sales Specific
        price_list_id: '',
        warehouse_id: '',
        sales_agent_id: '',
        probability_percentage: 0,
        followup_date: '',
        sent_date: '',
        sent_method: '',

        customer_notes: '',
        internal_notes: '',

        // Financials
        subtotal: 0,
        discount_percentage: 0,
        discount_amount: 0,
        tax_amount: 0,
        shipping_cost: 0,
        total_amount: 0,
        base_total: 0,

        // Items
        items: [],
    });

    // priceListPricing: [{ price_list_id, products: [...] }] -> lookup map.
    const pricingIndex = useMemo(() => {
        const index = {};
        (priceListPricing || []).forEach((entry) => {
            index[String(entry.price_list_id)] = entry.products || [];
        });
        return index;
    }, [priceListPricing]);

    const productMetaById = useMemo(() => {
        const map = {};
        (products || []).forEach((p) => {
            map[String(p.id)] = p;
        });
        return map;
    }, [products]);

    // ---------- date / eligibility helpers (mirror ProductPriceResolver) ----------
    const dateWithin = (dateStr, from, to) =>
        (!from || from <= dateStr) && (!to || to >= dateStr);

    const getEligiblePriceLists = (customerId, dateStr) => {
        if (!customerId) return [];
        const customer = (customers || []).find((c) => String(c.id) === String(customerId));
        if (!customer) return [];
        const assigned = [
            Number(customer.price_list_id),
            Number(customer.group && customer.group.price_list_id),
        ].filter((id) => id > 0);
        if (assigned.length === 0) return [];
        return (priceLists || []).filter(
            (pl) =>
                assigned.includes(Number(pl.id)) &&
                pl.is_active !== false &&
                dateWithin(dateStr, pl.valid_from, pl.valid_to)
        );
    };

    const eligiblePriceLists = useMemo(
        () => getEligiblePriceLists(data.customer_id, data.quotation_date),
         
        [customers, priceLists, data.customer_id, data.quotation_date]
    );

    const isEligiblePriceList = (plId) =>
        !!plId && eligiblePriceLists.some((pl) => String(pl.id) === String(plId));

    const activePricingProducts = useMemo(
        () => pricingIndex[String(data.price_list_id)] || [],
        [pricingIndex, data.price_list_id]
    );

    // The items section is usable only with a customer AND an eligible,
    // selected price list — enforced in the handlers, not just styling.
    const itemsEnabled =
        !!data.customer_id &&
        eligiblePriceLists.length > 0 &&
        isEligiblePriceList(data.price_list_id);

    const contextNotice = useMemo(() => {
        if (!data.customer_id) {
            return 'Select a customer to add quotation items.';
        }
        if (eligiblePriceLists.length === 0) {
            return 'This customer has no eligible price list. Assign a price list to the customer or their customer group to add quotation items.';
        }
        if (!isEligiblePriceList(data.price_list_id)) {
            return "Select one of this customer's price lists to add quotation items.";
        }
        if (activePricingProducts.length === 0) {
            return 'The selected price list has no products with valid prices.';
        }
        return '';
         
    }, [data.customer_id, data.price_list_id, eligiblePriceLists, activePricingProducts]);

    // ---------- options ----------
    const productOptions = useMemo(
        () =>
            activePricingProducts.map((p) => ({
                value: String(p.id),
                label: p.display_name || p.name || '',
                code: p.sku || undefined,
            })),
        [activePricingProducts]
    );

    const customerOptions = useMemo(() =>
        customers?.map(c => ({
            value: String(c.id),
            label: `${c.name_en} - ${c.name_ar}`
        })) || [],
    [customers]);

    const salesAgentOptions = useMemo(() =>
        salesAgents?.map(a => ({
            value: String(a.id),
            label: a.name_en || a.name || ''
        })) || [],
    [salesAgents]);

    const priceListOptions = useMemo(
        () =>
            eligiblePriceLists.map((pl) => ({
                value: String(pl.id),
                label: [pl.code, pl.name_en || pl.name_ar].filter(Boolean).join(' - '),
            })),
        [eligiblePriceLists]
    );

    const warehouseOptions = useMemo(() =>
        warehouses?.map(w => ({
            value: String(w.id),
            label: w.name || ''
        })) || [],
    [warehouses]);

    const currencyOptions = useMemo(() =>
        currencies?.map(c => ({
            value: String(c.id),
            label: `${c.code} - ${c.name}`
        })) || [],
    [currencies]);

    // Label maps for print/export: prefer the composite display names of the
    // priced catalog, fall back to the plain product/unit props.
    const productLabelById = useMemo(() => {
        const map = {};
        (products || []).forEach((p) => {
            map[String(p.id)] = p.name_en || p.name_ar || '';
        });
        Object.values(pricingIndex).forEach((rows) => {
            rows.forEach((row) => {
                if (row.display_name) map[String(row.id)] = row.display_name;
            });
        });
        return map;
    }, [products, pricingIndex]);

    const unitLabelById = useMemo(() => {
        const map = {};
        (units || []).forEach((u) => {
            map[String(u.id)] = u.name_en || u.name_ar || '';
        });
        Object.values(pricingIndex).forEach((rows) => {
            rows.forEach((row) => {
                (row.units || []).forEach((u) => {
                    map[String(u.id)] = u.display_name || u.name || map[String(u.id)];
                });
            });
        });
        return map;
    }, [units, pricingIndex]);

    // ---------- pricing resolution (client side, mirrors the server) ----------
    const pricingRowFor = (productId, plId) =>
        (pricingIndex[String(plId)] || []).find(
            (row) => String(row.id) === String(productId)
        ) || null;

    /**
     * Base units per selected unit (the unit's conversion factor, e.g.
     * 12 pieces per dozen). Price list tiers store min_quantity in BASE
     * units — the price list screen derives a unit's minimum from its
     * conversion factor — so tier matching converts the entered quantity
     * (which is in the selected unit) to base units. Line totals are NOT
     * affected: they keep using entered quantity x per-selected-unit price,
     * so the conversion factor is never applied twice.
     */
    const conversionFactorFor = (plId, productId, unitId) => {
        const row = pricingRowFor(productId, plId);
        const unit = (row?.units || []).find((u) => String(u.id) === String(unitId));
        const factor = Number(unit?.conversion_factor);
        return Number.isFinite(factor) && factor > 0 ? factor : 1;
    };

    /**
     * Authorized price for (price list, product, unit, quantity, date):
     * the highest min_quantity tier <= the entered quantity expressed in
     * base units among date-valid rows, exactly like ProductPriceResolver
     * picks its tier. The entered quantity is in the selected unit, so
     * 1 dozen (factor 12) matches a tier stored at min_quantity 12.
     */
    const authorizedPriceFor = (plId, productId, unitId, qtyValue, dateStr) => {
        const row = pricingRowFor(productId, plId);
        if (!row) return { status: 'product_unpriced' };
        const unit = (row.units || []).find((u) => String(u.id) === String(unitId));
        if (!unit) return { status: 'unit_invalid' };
        const tiers = (row.tiers || {})[String(unitId)] || [];
        const qty = Number(qtyValue);
        if (!Number.isFinite(qty)) return { status: 'no_tier' };
        const factor = Number(unit.conversion_factor);
        const baseQty = qty * (Number.isFinite(factor) && factor > 0 ? factor : 1);
        let best = null;
        tiers.forEach((tier) => {
            if (!dateWithin(dateStr, tier.effective_date, tier.expiry_date)) return;
            if (Number(tier.min_quantity) <= baseQty) {
                if (best === null || Number(tier.min_quantity) > Number(best.min_quantity)) {
                    best = tier;
                }
            }
        });
        if (!best) return { status: 'no_tier' };
        return { status: 'ok', price: best.final_price };
    };

    /**
     * Smallest base-unit quantity at which any tier exists for (price list,
     * product, unit), or null when the unit has no price rows at all. Used
     * to explain an empty price: "the unit IS priced, but from quantity X".
     */
    const lowestTierQuantityFor = (plId, productId, unitId) => {
        const row = pricingRowFor(productId, plId);
        const tiers = (row?.tiers || {})[String(unitId)] || [];
        if (tiers.length === 0) return null;
        const minima = tiers.map((t) => Number(t.min_quantity)).filter((n) => Number.isFinite(n));
        return minima.length > 0 ? Math.min(...minima) : null;
    };

    /**
     * Message for a unit/quantity pair without an applicable tier: when the
     * unit is priced only from a higher quantity, say exactly that — stated
     * in the SELECTED unit (a 24-piece tier on a dozen unit means "from
     * quantity 2"), not in base units; otherwise fall back to the generic
     * unpriced message.
     */
    const noTierMessageFor = (plId, productId, unitId, qtyValue) => {
        const minBase = lowestTierQuantityFor(plId, productId, unitId);
        const qty = Number(qtyValue);
        if (minBase !== null && Number.isFinite(qty)) {
            const minInUnit = Math.ceil(minBase / conversionFactorFor(plId, productId, unitId));
            if (qty < minInUnit) {
                return `This unit is priced from quantity ${minInUnit}. Increase the quantity.`;
            }
        }
        return 'No price list price applies for this quantity. Increase the quantity.';
    };

    const unitOptionsForProduct = (productId) => {
        const row = pricingRowFor(productId, data.price_list_id);
        return (row?.units || []).map((u) => ({
            value: String(u.id),
            label: u.display_name || u.name || String(u.id),
        }));
    };

    /**
     * Revalidate items against a price list.
     *  - dropInvalid (customer / price list / date changed): items that are no
     *    longer eligible are removed, valid ones keep refreshed prices.
     *  - otherwise (edit load): items are kept but priced rows are refreshed
     *    to the authorized price and invalid rows get a per-cell error that
     *    blocks saving until the user fixes or removes them.
     */
    const reconcileItems = (items, plId, dateStr, dropInvalid) => {
        const nextErrors = {};
        const kept = [];
        let removed = 0;

        items.forEach((item, index) => {
            if (!plId || !item.product_id) {
                kept.push(item);
                return;
            }

            const rowErrors = {};
            const row = pricingRowFor(item.product_id, plId);

            if (!row) {
                rowErrors.product_id = 'This product is not available in the selected price list.';
            } else if (!item.unit_id) {
                rowErrors.unit_id = 'Select a unit priced in the selected price list.';
            } else {
                const unit = (row.units || []).find(
                    (u) => String(u.id) === String(item.unit_id)
                );
                if (!unit) {
                    rowErrors.unit_id =
                        'This unit is not priced for the product in the selected price list.';
                } else {
                    const auth = authorizedPriceFor(
                        plId,
                        item.product_id,
                        item.unit_id,
                        item.quantity,
                        dateStr
                    );
                    if (auth.status !== 'ok') {
                        rowErrors.quantity = noTierMessageFor(
                            plId,
                            item.product_id,
                            item.unit_id,
                            item.quantity
                        );
                    } else if (Number(item.unit_price) !== Number(auth.price)) {
                        item = { ...item, unit_price: auth.price };
                    }
                }
            }

            const valid = Object.keys(rowErrors).length === 0;
            if (!valid && dropInvalid) {
                removed += 1;
                return;
            }
            if (!valid) {
                nextErrors[index] = rowErrors;
            }
            kept.push(item);
        });

        return { items: kept, errors: nextErrors, removed };
    };

    // Helper to calculate totals
    useEffect(() => {
        calculateTotals(data.items);
         
    }, [data.items, data.discount_amount, data.discount_percentage, data.shipping_cost, data.tax_amount]);

    const resetFormState = (overrides = {}) => {
        reset();
        setItemErrors({});
        setFormError('');
        setActionNotice('');
        const today = new Date();
        const expiry = new Date(new Date().setDate(today.getDate() + 30));
        setData((prev) => ({
            ...prev,
            quotation_date: today.toISOString().split('T')[0],
            expiry_date: expiry.toISOString().split('T')[0],
            valid_days: 30,
            // Items stay empty until a customer with an eligible price list
            // has been selected and the section is enabled.
            items: [],
            ...overrides,
        }));
    };

    const handleCreate = () => {
        resetFormState();
        setMode('create');
    };

    const handleEdit = (quotation) => {
        const toNum = (v) => (v === null || v === undefined ? 0 : Number(v));
        const dateStr = quotation.quotation_date
            ? quotation.quotation_date.split('T')[0]
            : new Date().toISOString().split('T')[0];

        const eligible = getEligiblePriceLists(quotation.customer_id, dateStr);
        let priceListId = quotation.price_list_id ? String(quotation.price_list_id) : '';
        if (!priceListId && eligible.length === 1) {
            priceListId = String(eligible[0].id);
        }

        const loadedItems = (quotation.items || []).map((it) => {
            const qtyNum = Number(it.quantity);
            const quantityIsInteger = Number.isInteger(qtyNum);

            return {
                ...it,
                quantity: quantityIsInteger ? String(qtyNum) : String(it.quantity),
                unit_price: it.unit_price,
                discount_percentage: toNum(it.discount_percentage),
                discount_amount: toNum(it.discount_amount),
                tax_id: it.tax_id,
                tax_amount: toNum(it.tax_amount),
                line_total: toNum(it.line_total),
                unit_id: it.unit_id !== null && it.unit_id !== undefined ? String(it.unit_id) : '',
                delivery_date: it.delivery_date ? it.delivery_date.split('T')[0] : '',
                notes: it.notes || '',
            };
        });

        // Refresh prices to the authorized price-list values and flag rows
        // that are no longer eligible (kept visible, save blocked until fixed).
        const reconciled = reconcileItems(loadedItems, priceListId, dateStr, false);
        const rowErrors = { ...reconciled.errors };
        loadedItems.forEach((it, index) => {
            if (it.product_id && !Number.isInteger(Number(it.quantity))) {
                rowErrors[index] = {
                    ...(rowErrors[index] || {}),
                    quantity: 'Quantity must be a whole number.',
                };
            }
        });

        setItemErrors(rowErrors);
        setFormError('');
        setActionNotice('');

        setData({
            ...quotation,
            price_list_id: priceListId,
            items: reconciled.items,
            quotation_date: dateStr,
            expiry_date: quotation.expiry_date ? quotation.expiry_date.split('T')[0] : '',
            followup_date: quotation.followup_date ? quotation.followup_date.split('T')[0] : '',
            sent_date: quotation.sent_date ? quotation.sent_date.split('T')[0] : '',
            subtotal: toNum(quotation.subtotal),
            discount_percentage: toNum(quotation.discount_percentage),
            discount_amount: toNum(quotation.discount_amount),
            tax_amount: toNum(quotation.tax_amount),
            shipping_cost: toNum(quotation.shipping_cost),
            total_amount: toNum(quotation.total_amount),
            base_total: toNum(quotation.base_total),
            exchange_rate: toNum(quotation.exchange_rate),
        });
        setMode('edit');
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this quotation?')) {
            destroy(route('admin.client-sales.quotations.destroy', { quotation: id }));
        }
    };

    const validateBeforeSubmit = () => {
        const rowErrors = {};
        let sectionError = '';

        if (!data.customer_id) {
            sectionError = 'Select a customer before saving the quotation.';
        } else if (eligiblePriceLists.length === 0) {
            sectionError =
                'The selected customer has no eligible price list, so quotation items cannot be priced.';
        } else if (!isEligiblePriceList(data.price_list_id)) {
            sectionError = 'Select one of the customer’s price lists before saving.';
        } else if (data.items.length === 0) {
            sectionError = 'Add at least one quotation item.';
        }

        data.items.forEach((item, index) => {
            const rowErr = {};

            if (!item.product_id) {
                rowErr.product_id = 'Select a product.';
            } else if (!pricingRowFor(item.product_id, data.price_list_id)) {
                rowErr.product_id = 'This product is not available in the selected price list.';
            }

            const qtyStr = String(item.quantity ?? '');
            const qtyValid = /^\d+$/.test(qtyStr) && parseInt(qtyStr, 10) >= 1;
            if (!qtyValid) {
                rowErr.quantity = 'Quantity must be a whole number of at least 1.';
            }

            if (!item.unit_id) {
                rowErr.unit_id = 'Select a unit.';
            }

            const priceNum = Number(item.unit_price);
            const priceRaw = item.unit_price;
            if (
                priceRaw === '' ||
                priceRaw === null ||
                priceRaw === undefined ||
                !Number.isFinite(priceNum) ||
                priceNum < 0
            ) {
                rowErr.unit_price = 'Enter a valid price (it cannot be negative).';
            } else if (item.product_id && item.unit_id && qtyValid) {
                const auth = authorizedPriceFor(
                    data.price_list_id,
                    item.product_id,
                    item.unit_id,
                    qtyStr,
                    data.quotation_date
                );
                if (auth.status === 'ok' && Number(auth.price) !== priceNum) {
                    rowErr.unit_price = `Unit price must match the selected price list (${auth.price}).`;
                }
            }

            if (Object.keys(rowErr).length > 0) {
                rowErrors[index] = rowErr;
            }
        });

        setItemErrors(rowErrors);
        setFormError(sectionError);

        return Object.keys(rowErrors).length === 0 && !sectionError;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!validateBeforeSubmit()) {
            return;
        }

        // The server resolves/validates the price list price and recomputes all
        // document totals. Validation failures come back as a redirect with
        // errors, so the form must stay open until the server accepted the doc.
        const options = {
            preserveScroll: true,
            onSuccess: (page) => {
                const pageErrors = page?.props?.errors || {};
                if (Object.keys(pageErrors).length > 0) {
                    return;
                }
                setMode('list');
            },
        };

        if (mode === 'create') {
            post(route('admin.client-sales.quotations.store'), options);
        } else {
            put(route('admin.client-sales.quotations.update', { quotation: data.id }), options);
        }
    };

    const handleDiscountPercentChange = (value) => {
        const percent = parseFloat(value) || 0;
        const subtotal = parseFloat(data.subtotal) || 0;
        const amount = (subtotal * percent) / 100;
        setData(prev => ({
            ...prev,
            discount_percentage: value,
            discount_amount: amount.toFixed(2)
        }));
    };

    // ---------- customer / price list context changes ----------
    const handleCustomerChange = (value) => {
        const customer = (customers || []).find((c) => String(c.id) === String(value));
        const eligible = getEligiblePriceLists(value, data.quotation_date);

        let priceListId = '';
        if (eligible.length === 1) {
            priceListId = String(eligible[0].id);
        } else if (isEligiblePriceListFor(eligible, data.price_list_id)) {
            priceListId = String(data.price_list_id);
        }

        const reconciled = reconcileItems(data.items, priceListId, data.quotation_date, true);

        setData((prev) => ({
            ...prev,
            customer_id: value,
            price_list_id: priceListId,
            currency_id: customer?.currency_id ? String(customer.currency_id) : prev.currency_id,
            items: reconciled.items,
        }));

        setItemErrors({});
        setFormError('');
        if (reconciled.removed > 0) {
            setActionNotice(
                `Removed ${reconciled.removed} item(s) that are not valid for the newly selected customer.`
            );
        } else if (eligible.length === 0 && value) {
            setActionNotice('The selected customer has no eligible price list.');
        } else {
            setActionNotice('');
        }
    };

    const isEligiblePriceListFor = (eligible, plId) =>
        !!plId && eligible.some((pl) => String(pl.id) === String(plId));

    const handlePriceListChange = (value) => {
        const reconciled = reconcileItems(data.items, value, data.quotation_date, true);

        setData((prev) => ({
            ...prev,
            price_list_id: value,
            items: reconciled.items,
        }));

        setItemErrors({});
        setFormError('');
        setActionNotice(
            reconciled.removed > 0
                ? `Removed ${reconciled.removed} item(s) that are not valid for the selected price list.`
                : ''
        );
    };

    const handleQuotationDateChange = (value) => {
        const eligible = getEligiblePriceLists(data.customer_id, value);
        const stillValid = isEligiblePriceListFor(eligible, data.price_list_id);
        const nextPriceList = stillValid ? data.price_list_id : '';

        let items = data.items;
        let removed = 0;
        if (stillValid) {
            const reconciled = reconcileItems(data.items, nextPriceList, value, true);
            items = reconciled.items;
            removed = reconciled.removed;
        } else {
            removed = data.items.filter((it) => it.product_id).length;
            items = data.items.filter((it) => !it.product_id);
        }

        setData((prev) => ({
            ...prev,
            quotation_date: value,
            price_list_id: nextPriceList,
            items,
        }));

        setItemErrors({});
        setFormError('');
        setActionNotice(
            removed > 0
                ? `Removed ${removed} item(s): the selected price list is not valid on the new quotation date.`
                : ''
        );
    };

    // Item Management
    const addItem = () => {
        if (!itemsEnabled) {
            setFormError('Select a customer and one of their price lists before adding items.');
            return;
        }
        setData('items', [
            ...data.items,
            {
                id: null,
                line_number: data.items.length + 1,
                product_id: '',
                item_name_ar: '',
                item_name_en: '',
                quantity: '1',
                unit_id: '',
                unit_price: '',
                discount_percentage: 0,
                discount_amount: 0,
                tax_id: '',
                tax_amount: 0,
                line_total: 0,
                delivery_date: '',
                notes: ''
            }
        ]);
    };

    const removeItem = (index) => {
        if (!itemsEnabled) return;
        const newItems = [...data.items];
        newItems.splice(index, 1);
        setData('items', newItems);
        setItemErrors((prev) => {
            const next = {};
            Object.keys(prev).forEach((key) => {
                const keyNum = Number(key);
                if (keyNum < index) next[key] = prev[key];
                if (keyNum > index) next[String(keyNum - 1)] = prev[key];
            });
            return next;
        });
        calculateTotals(newItems);
    };

    const clearRowError = (index, field) => {
        setItemErrors((prev) => {
            const row = prev[index];
            if (!row || !(field in row)) return prev;
            const nextRow = { ...row };
            delete nextRow[field];
            const next = { ...prev };
            if (Object.keys(nextRow).length === 0) {
                delete next[index];
            } else {
                next[index] = nextRow;
            }
            return next;
        });
    };

    const setRowError = (index, field, message) => {
        setItemErrors((prev) => ({
            ...prev,
            [index]: { ...(prev[index] || {}), [field]: message },
        }));
    };

    const handleItemChange = (index, field, value) => {
        if (!itemsEnabled) return;
        if (!data.items[index]) return;

        const newItems = data.items.map((item, i) => (i === index ? { ...item } : item));
        const item = newItems[index];
        const dateStr = data.quotation_date;

        if (field === 'product_id') {
            // Changing product invalidates unit + price: clear both, then load
            // fresh valid values for the NEW product only.
            item.product_id = value;
            item.unit_id = '';
            item.unit_price = '';

            const row = pricingRowFor(value, data.price_list_id);
            const meta = productMetaById[String(value)];
            item.item_name_en = row?.display_name || meta?.name_en || '';
            item.item_name_ar = meta?.name_ar || '';

            const pricedUnits = row?.units || [];
            let autoUnitNeedsTier = null;
            if (pricedUnits.length === 1) {
                const onlyUnit = pricedUnits[0];
                item.unit_id = String(onlyUnit.id);
                const auth = authorizedPriceFor(
                    data.price_list_id,
                    value,
                    onlyUnit.id,
                    item.quantity,
                    dateStr
                );
                item.unit_price = auth.status === 'ok' ? auth.price : '';
                if (auth.status !== 'ok') {
                    autoUnitNeedsTier = onlyUnit.id;
                }
            }

            setItemErrors((prev) => {
                const next = { ...prev };
                delete next[index];
                return next;
            });

            // A single priced unit is pre-selected, but if no tier applies at
            // the current quantity the price would stay empty in silence —
            // say why right away instead of waiting for the save attempt.
            if (autoUnitNeedsTier !== null) {
                setRowError(
                    index,
                    'quantity',
                    noTierMessageFor(
                        data.price_list_id,
                        value,
                        autoUnitNeedsTier,
                        item.quantity
                    )
                );
            }
        } else if (field === 'unit_id') {
            item.unit_id = value;
            if (item.product_id && value) {
                const auth = authorizedPriceFor(
                    data.price_list_id,
                    item.product_id,
                    value,
                    item.quantity,
                    dateStr
                );
                if (auth.status === 'ok') {
                    item.unit_price = auth.price;
                    clearRowError(index, 'unit_price');
                    clearRowError(index, 'quantity');
                } else {
                    item.unit_price = '';
                    if (lowestTierQuantityFor(data.price_list_id, item.product_id, value) !== null) {
                        // The unit IS priced, just not at this quantity.
                        setRowError(
                            index,
                            'quantity',
                            noTierMessageFor(
                                data.price_list_id,
                                item.product_id,
                                value,
                                item.quantity
                            )
                        );
                    } else {
                        setRowError(
                            index,
                            'unit_price',
                            'No price list price applies for this product and unit.'
                        );
                    }
                }
            } else {
                item.unit_price = '';
            }
            clearRowError(index, 'unit_id');
        } else if (field === 'quantity') {
            const raw = String(value);
            if (raw !== '' && !/^\d+$/.test(raw)) {
                // Reject decimals, negatives, NaN and other malformed values
                // before they can corrupt row state or totals.
                setRowError(
                    index,
                    'quantity',
                    'Quantity must be a non-negative whole number (decimals are not allowed).'
                );
                return;
            }
            item.quantity = raw;
            clearRowError(index, 'quantity');

            // Quantity can move the row to another price tier: refresh price.
            if (item.product_id && item.unit_id && raw !== '') {
                const auth = authorizedPriceFor(
                    data.price_list_id,
                    item.product_id,
                    item.unit_id,
                    raw,
                    dateStr
                );
                if (auth.status === 'ok') {
                    item.unit_price = auth.price;
                    clearRowError(index, 'unit_price');
                } else {
                    // No tier applies at this quantity anymore: the previous
                    // price is NOT authorized — clear it and explain instead
                    // of silently keeping a stale price in the row.
                    item.unit_price = '';
                    setRowError(
                        index,
                        'quantity',
                        noTierMessageFor(
                            data.price_list_id,
                            item.product_id,
                            item.unit_id,
                            raw
                        )
                    );
                }
            }
        } else if (field === 'unit_price') {
            const raw = String(value);
            if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) {
                // Negative or malformed prices never enter the row state.
                setRowError(
                    index,
                    'unit_price',
                    'Unit price must be a non-negative number.'
                );
                return;
            }
            item.unit_price = raw;
            clearRowError(index, 'unit_price');

            if (raw !== '' && item.product_id && item.unit_id) {
                const auth = authorizedPriceFor(
                    data.price_list_id,
                    item.product_id,
                    item.unit_id,
                    item.quantity,
                    data.quotation_date
                );
                if (auth.status === 'ok' && Number(auth.price) !== Number(raw)) {
                    setRowError(
                        index,
                        'unit_price',
                        `Unit price must match the selected price list (${auth.price}).`
                    );
                }
            }
        } else if (field === 'discount_percentage' || field === 'discount_amount') {
            const raw = String(value);
            if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) {
                setRowError(index, field, 'Discount must be a non-negative number.');
                return;
            }
            item[field] = raw;
            clearRowError(index, field);
        } else if (field === 'tax_amount') {
            const raw = String(value);
            if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) {
                setRowError(index, 'tax_amount', 'Tax must be a non-negative number.');
                return;
            }
            item.tax_amount = raw;
            clearRowError(index, 'tax_amount');
        } else {
            item[field] = value;
        }

        // Calculate Line Totals
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.unit_price) || 0;

        // Handle discount
        let discAmount = 0;
        if (field === 'discount_percentage') {
            const discPercent = parseFloat(value) || 0;
            discAmount = (qty * price) * (discPercent / 100);
            item.discount_amount = discAmount.toFixed(2);
        } else if (field === 'discount_amount') {
            discAmount = parseFloat(value) || 0;
            if (qty * price > 0) {
                item.discount_percentage = ((discAmount / (qty * price)) * 100).toFixed(2);
            }
        } else {
            discAmount = parseFloat(item.discount_amount) || 0;
            const discPercent = parseFloat(item.discount_percentage) || 0;
            if (discPercent > 0) {
                discAmount = (qty * price) * (discPercent / 100);
                item.discount_amount = discAmount.toFixed(2);
            }
        }

        const netPrice = (qty * price) - discAmount;

        // Handle Tax (manual tax amount; tax_id logic reserved for later)
        const taxValue = parseFloat(item.tax_amount) || 0;

        item.line_total = (netPrice + taxValue).toFixed(2);

        setData('items', newItems);
    };

    const calculateTotals = (items) => {
        const safeItems = Array.isArray(items) ? items : [];
        const subtotal = safeItems.reduce(
            (sum, item) => (parseFloat(item.quantity || 0) || 0) * (parseFloat(item.unit_price || 0) || 0) + sum,
            0
        );

        const itemDiscounts = safeItems.reduce(
            (sum, item) => sum + (parseFloat(item.discount_amount) || 0),
            0
        );
        const itemTaxes = safeItems.reduce(
            (sum, item) => sum + (parseFloat(item.tax_amount) || 0),
            0
        );

        // Global Discount
        const globalDiscount = parseFloat(data.discount_amount) || 0;
        const shipping = parseFloat(data.shipping_cost) || 0;

        // Logic: Subtotal - ItemDiscounts + ItemTaxes - GlobalDiscount + Shipping
        const totalAfterItemDisc = subtotal - itemDiscounts;
        const totalWithTax = totalAfterItemDisc + itemTaxes;

        const grandTotal = totalWithTax - globalDiscount + shipping;

        if (
            Math.abs(data.subtotal - subtotal) > 0.01 ||
            Math.abs(data.total_amount - grandTotal) > 0.01 ||
            Math.abs((parseFloat(data.tax_amount) || 0) - itemTaxes) > 0.01
        ) {
            setData(prev => ({
                ...prev,
                subtotal: subtotal,
                tax_amount: itemTaxes,
                total_amount: grandTotal,
                base_total: grandTotal * (parseFloat(prev.exchange_rate) || 0)
            }));
        }
    };

    // Export Features
    const handlePrint = () => {
        window.print();
    };

    const handleExportPDF = () => {
        const element = printRef.current;
        if (!element) return;

        const module = element.closest('.sales-quotations-module');
        if (module) module.classList.add('generating-pdf');

        const opt = {
            margin: [5, 5],
            filename: `SalesQuotation_${data.quotation_number || 'New'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save().then(() => {
            if (module) module.classList.remove('generating-pdf');
        });
    };

    const handleExportExcel = () => {
        const itemsData = data.items.map((item, index) => ({
            '#': index + 1,
            'Product': productLabelById[String(item.product_id)] || '',
            'Description': item.item_name_ar || '',
            'Quantity': Number(item.quantity),
            'Unit': unitLabelById[String(item.unit_id)] || '',
            'Price': Number(item.unit_price),
            'Discount': Number(item.discount_amount),
            'Tax Amount': Number(item.tax_amount),
            'Total': Number(item.line_total)
        }));

        itemsData.push({});
        itemsData.push({ 'Product': 'Subtotal', 'Total': Number(data.subtotal) });
        itemsData.push({ 'Product': 'Tax', 'Total': Number(data.tax_amount) });
        itemsData.push({ 'Product': 'Discount', 'Total': Number(data.discount_amount) });
        itemsData.push({ 'Product': 'Shipping', 'Total': Number(data.shipping_cost) });
        itemsData.push({ 'Product': 'Grand Total', 'Total': Number(data.total_amount) });

        const worksheet = XLSX.utils.json_to_sheet(itemsData);

        const wscols = [
            {wch: 5}, {wch: 20}, {wch: 30}, {wch: 10},
            {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 15}
        ];
        worksheet['!cols'] = wscols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Quotation");
        XLSX.writeFile(workbook, `SalesQuotation_${data.quotation_number || 'New'}.xlsx`);
    };

    // Server-side errors not rendered inline anywhere else, so backend
    // validation messages are never hidden from the user.
    const otherServerErrors = Object.entries(errors || {}).filter(
        ([key]) =>
            key !== 'customer_id' &&
            key !== 'price_list_id' &&
            !/^items\.\d+\./.test(key)
    );

    const rowErrorAt = (index, field) =>
        (itemErrors[index] && itemErrors[index][field]) ||
        (errors && errors[`items.${index}.${field}`]) ||
        '';

    const notice = actionNotice || contextNotice;

    return (
        <AdminLayout>
            <Head title="Sales Quotations" />

            <div className="sales-quotations-module">
                <div className="sales-quotations-module__header">
                    <h1>Sales Quotations</h1>
                    {mode === 'list' && (
                    <button className="btn-add" onClick={handleCreate}>
                        + Create Quotation
                    </button>
                )}
                {mode !== 'list' && (
                    <div className="header-actions" style={{display: 'flex', gap: '10px'}}>
                        <button type="button" className="btn-action btn-print" onClick={handlePrint} style={{padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'}}>
                            <span>🖨</span> Print
                        </button>
                        <button type="button" className="btn-action btn-pdf" onClick={handleExportPDF} style={{padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'}}>
                            <span>📄</span> PDF
                        </button>
                        <button type="button" className="btn-action btn-excel" onClick={handleExportExcel} style={{padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'}}>
                            <span>📊</span> Excel
                        </button>
                    </div>
                )}
            </div>

                {flash.success && (
                    <div className="alert alert-success">{flash.success}</div>
                )}
                {flash.error && (
                    <div className="alert alert-error" role="alert">{flash.error}</div>
                )}
                {otherServerErrors.length > 0 && (
                    <div className="alert alert-error" role="alert">
                        <ul style={{margin: 0, paddingLeft: '1.1rem'}}>
                            {otherServerErrors.map(([key, message]) => (
                                <li key={key}>{Array.isArray(message) ? message.join(' ') : message}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {mode === 'list' ? (
                    <div className="sales-quotations-module__table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Ref #</th>
                                    <th>Date</th>
                                    <th>Customer</th>
                                    <th>Status</th>
                                    <th>Total</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {quotations.data.map((q) => (
                                    <tr key={q.id}>
                                        <td>{q.quotation_number}</td>
                                        <td>{formatDate(q.quotation_date)}</td>
                                        <td>{q.customer?.name_en || q.customer?.name_ar}</td>
                                        <td>
                                            <span className={`status-badge status-${q.status}`}>
                                                {q.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td>{Number(q.total_amount).toFixed(2)} {q.currency?.code}</td>
                                        <td className="actions">
                                            <button className="edit" onClick={() => handleEdit(q)}>Edit</button>
                                            <button className="delete" onClick={() => handleDelete(q.id)}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                                {quotations.data.length === 0 && (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center' }}>No quotations found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <>
                    <form ref={invoiceRef} onSubmit={handleSubmit} className="invoice-container">

                        {/* 1. Invoice Header */}
                        <div className="invoice-header">
                            <div className="company-info">
                                <h2>SALES QUOTATION</h2>
                                <p>Zodic ERP System</p>
                            </div>
                            <div className="invoice-meta">
                                <label>Quotation #</label>
                                <input type="text" value={data.quotation_number} disabled placeholder="Auto-generated" />

                                <label>Date <span className="required">*</span></label>
                                <input
                                    type="date"
                                    value={data.quotation_date}
                                    onChange={e => handleQuotationDateChange(e.target.value)}
                                    className={errors.quotation_date ? 'error' : ''}
                                />

                                <label>Expiry Date</label>
                                <input
                                    type="date"
                                    value={data.expiry_date}
                                    onChange={e => setData('expiry_date', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* 2. Info Grid */}
                        <div className="invoice-info-grid">
                            <div className="info-section">
                                <h3>Customer Details</h3>
                                <div className="form-group">
                                    <label>Customer Name <span className="required">*</span></label>
                                    <SearchableComboBox
                                        options={customerOptions}
                                        value={data.customer_id ? String(data.customer_id) : ''}
                                        onChange={(val) => handleCustomerChange(val)}
                                        placeholder="Select Customer"
                                    />
                                    {errors.customer_id && <span className="error-msg">{errors.customer_id}</span>}
                                </div>

                                <div className="form-grid" style={{marginTop: '1rem'}}>
                                    <div className="form-group">
                                        <label>Sales Agent</label>
                                        <SearchableComboBox
                                            options={salesAgentOptions}
                                            value={data.sales_agent_id ? String(data.sales_agent_id) : ''}
                                            onChange={(val) => setData('sales_agent_id', val)}
                                            placeholder="Select Agent"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Price List <span className="required">*</span></label>
                                        <SearchableComboBox
                                            options={priceListOptions}
                                            value={data.price_list_id ? String(data.price_list_id) : ''}
                                            onChange={(val) => handlePriceListChange(val)}
                                            placeholder={
                                                !data.customer_id
                                                    ? 'Select Customer First'
                                                    : eligiblePriceLists.length === 0
                                                        ? 'No Eligible Price List'
                                                        : 'Select Price List'
                                            }
                                            disabled={
                                                !data.customer_id || eligiblePriceLists.length === 0
                                            }
                                        />
                                        {errors.price_list_id && <span className="error-msg">{errors.price_list_id}</span>}
                                    </div>
                                </div>

                                <div className="form-group" style={{marginTop: '1rem'}}>
                                    <label>Customer Notes</label>
                                    <textarea
                                        value={data.customer_notes}
                                        onChange={e => setData('customer_notes', e.target.value)}
                                        rows="2"
                                        placeholder="Notes for customer..."
                                    ></textarea>
                                </div>
                            </div>

                            <div className="info-section">
                                <h3>Settings & Status</h3>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Currency</label>
                                        <SearchableComboBox
                                            options={currencyOptions}
                                            value={data.currency_id ? String(data.currency_id) : ''}
                                            onChange={(val) => setData('currency_id', val)}
                                            placeholder="Select Currency"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Exchange Rate</label>
                                        <input type="number" step="0.000001" value={data.exchange_rate} onChange={e => setData('exchange_rate', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Status</label>
                                        <select value={data.status} onChange={e => setData('status', e.target.value)}>
                                            <option value="draft">Draft</option>
                                            <option value="sent">Sent</option>
                                            <option value="under_review">Under Review</option>
                                            <option value="accepted">Accepted</option>
                                            <option value="rejected">Rejected</option>
                                            <option value="expired">Expired</option>
                                            <option value="converted">Converted</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Warehouse</label>
                                        <SearchableComboBox
                                            options={warehouseOptions}
                                            value={data.warehouse_id ? String(data.warehouse_id) : ''}
                                            onChange={(val) => setData('warehouse_id', val)}
                                            placeholder="Select Warehouse"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Valid Days</label>
                                        <input type="number" value={data.valid_days} onChange={e => setData('valid_days', e.target.value)} />
                                    </div>
                                </div>
                                <div className="form-grid" style={{marginTop: '1rem'}}>
                                     <div className="form-group">
                                        <label>Probability %</label>
                                        <input type="number" value={data.probability_percentage} onChange={e => setData('probability_percentage', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Follow-up Date</label>
                                        <input type="date" value={data.followup_date} onChange={e => setData('followup_date', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Sent Date</label>
                                        <input type="date" value={data.sent_date} onChange={e => setData('sent_date', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Sent Method</label>
                                        <select value={data.sent_method} onChange={e => setData('sent_method', e.target.value)}>
                                            <option value="">Select Method</option>
                                            <option value="email">Email</option>
                                            <option value="whatsapp">WhatsApp</option>
                                            <option value="hand">Hand</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Items Table */}
                        <div className="invoice-items-section">
                            {notice && (
                                <div
                                    className={
                                        itemsEnabled && !actionNotice
                                            ? 'items-context-notice'
                                            : 'items-disabled-notice'
                                    }
                                >
                                    {notice}
                                </div>
                            )}
                            {formError && (
                                <div className="items-disabled-notice error" role="alert">{formError}</div>
                            )}
                            <div className="items-table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th style={{width: '30px'}}>#</th>
                                            <th style={{width: '200px'}}>Product</th>
                                            <th>Description</th>
                                            <th style={{width: '80px'}}>Qty</th>
                                            <th style={{width: '100px'}}>Unit</th>
                                            <th style={{width: '100px'}}>Price</th>
                                            <th style={{width: '80px'}}>Disc %</th>
                                            <th style={{width: '100px'}}>Disc Amt</th>
                                            <th style={{width: '100px'}}>Tax Amt</th>
                                            <th style={{width: '120px'}} className="text-right">Total</th>
                                            <th style={{width: '50px'}}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.items.length === 0 && (
                                            <tr>
                                                <td colSpan="11" className="items-empty-row">
                                                    {itemsEnabled
                                                        ? 'No items yet. Use "+ Add Item" to start.'
                                                        : 'Quotation items are disabled until a customer with an eligible price list is selected.'}
                                                </td>
                                            </tr>
                                        )}
                                        {data.items.map((item, index) => (
                                            <tr key={index}>
                                                <td>{index + 1}</td>
                                                <td>
                                                    <SearchableComboBox
                                                        options={productOptions}
                                                        value={item.product_id ? String(item.product_id) : ''}
                                                        onChange={(val) => handleItemChange(index, 'product_id', val)}
                                                        placeholder="Select Product"
                                                        disabled={!itemsEnabled}
                                                    />
                                                    {rowErrorAt(index, 'product_id') && (
                                                        <span className="error-msg">{rowErrorAt(index, 'product_id')}</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        value={item.item_name_ar}
                                                        onChange={e => handleItemChange(index, 'item_name_ar', e.target.value)}
                                                        placeholder="Description"
                                                        disabled={!itemsEnabled}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                                                        min="0"
                                                        step="1"
                                                        inputMode="numeric"
                                                        disabled={!itemsEnabled}
                                                    />
                                                    {rowErrorAt(index, 'quantity') && (
                                                        <span className="error-msg">{rowErrorAt(index, 'quantity')}</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <SearchableComboBox
                                                        options={unitOptionsForProduct(item.product_id)}
                                                        value={item.unit_id ? String(item.unit_id) : ''}
                                                        onChange={(val) => handleItemChange(index, 'unit_id', val)}
                                                        placeholder="Unit"
                                                        disabled={!itemsEnabled || !item.product_id}
                                                    />
                                                    {rowErrorAt(index, 'unit_id') && (
                                                        <span className="error-msg">{rowErrorAt(index, 'unit_id')}</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        value={item.unit_price}
                                                        onChange={e => handleItemChange(index, 'unit_price', e.target.value)}
                                                        min="0"
                                                        step="0.01"
                                                        inputMode="decimal"
                                                        disabled={!itemsEnabled}
                                                    />
                                                    {rowErrorAt(index, 'unit_price') && (
                                                        <span className="error-msg">{rowErrorAt(index, 'unit_price')}</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        value={item.discount_percentage}
                                                        onChange={e => handleItemChange(index, 'discount_percentage', e.target.value)}
                                                        min="0"
                                                        step="0.01"
                                                        inputMode="decimal"
                                                        disabled={!itemsEnabled}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        value={item.discount_amount}
                                                        onChange={e => handleItemChange(index, 'discount_amount', e.target.value)}
                                                        min="0"
                                                        step="0.01"
                                                        inputMode="decimal"
                                                        disabled={!itemsEnabled}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        value={item.tax_amount}
                                                        onChange={e => handleItemChange(index, 'tax_amount', e.target.value)}
                                                        min="0"
                                                        step="0.01"
                                                        inputMode="decimal"
                                                        disabled={!itemsEnabled}
                                                    />
                                                    {rowErrorAt(index, 'tax_amount') && (
                                                        <span className="error-msg">{rowErrorAt(index, 'tax_amount')}</span>
                                                    )}
                                                </td>
                                                <td className="text-right">
                                                    {Number(item.line_total || 0).toFixed(2)}
                                                </td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(index)}
                                                        disabled={!itemsEnabled}
                                                        style={{color: 'red'}}
                                                    >
                                                        ✕
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="add-item-row">
                                <button
                                    type="button"
                                    className="btn-add-item"
                                    onClick={addItem}
                                    disabled={!itemsEnabled}
                                >
                                    + Add Item
                                </button>
                            </div>
                        </div>

                        {/* 4. Footer Section */}
                        <div className="invoice-footer-section">
                            <div className="invoice-terms">
                                <h4>Internal Notes</h4>
                                <textarea
                                    value={data.internal_notes}
                                    onChange={e => setData('internal_notes', e.target.value)}
                                    placeholder="Internal notes only..."
                                ></textarea>
                            </div>

                            <div className="invoice-totals">
                                <div className="total-row">
                                    <span className="label">Subtotal</span>
                                    <span>{Number(data.subtotal || 0).toFixed(2)}</span>
                                </div>
                                <div className="total-row">
                                    <span className="label">Discount %</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={data.discount_percentage}
                                        onChange={e => handleDiscountPercentChange(e.target.value)}
                                    />
                                </div>
                                <div className="total-row">
                                    <span className="label">Discount Amount</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={data.discount_amount}
                                        onChange={e => setData('discount_amount', e.target.value)}
                                    />
                                </div>
                                <div className="total-row">
                                    <span className="label">Tax</span>
                                    <span>{Number(data.tax_amount || 0).toFixed(2)}</span>
                                </div>
                                <div className="total-row">
                                    <span className="label">Shipping</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={data.shipping_cost}
                                        onChange={e => setData('shipping_cost', e.target.value)}
                                    />
                                </div>
                                <div className="total-row grand-total">
                                    <span className="label">Total</span>
                                    <input
                                        type="number"
                                        value={data.total_amount}
                                        readOnly
                                    />
                                </div>
                            </div>
                        </div>

                    </form>

                    <div className="sticky-actions-footer">
                        <button type="button" className="btn btn-cancel" onClick={() => setMode('list')}>
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-save"
                            onClick={handleSubmit}
                            disabled={processing}
                        >
                            {processing ? 'Saving...' : 'Save Quotation'}
                        </button>
                    </div>

                    <div className="printable-invoice" ref={printRef}>
                        <div className="print-header">
                            <div className="company-branding">
                                <h1>Zodic ERP System</h1>
                                <p>Sales Quotation</p>
                            </div>
                            <div className="doc-info">
                                <h2>SALES QUOTATION</h2>
                                <div className="meta-row"><span className="label">Quotation #:</span> {data.quotation_number || 'DRAFT'}</div>
                                <div className="meta-row"><span className="label">Date:</span> {data.quotation_date}</div>
                                <div className="meta-row"><span className="label">Expiry:</span> {data.expiry_date}</div>
                            </div>
                        </div>

                        <div className="print-meta-grid">
                            <div className="meta-box">
                                <h3>Customer Details</h3>
                                <p><strong>Name:</strong> {customers.find(c => c.id == data.customer_id)?.name_en || 'N/A'}</p>
                                <p><strong>Phone:</strong> {customers.find(c => c.id == data.customer_id)?.phone || 'N/A'}</p>
                                <p><strong>Currency:</strong> {currencies.find(c => c.id == data.currency_id)?.code || 'N/A'}</p>
                            </div>
                            <div className="meta-box" style={{textAlign: 'right'}}>
                                <h3>Quotation Details</h3>
                                <p><strong>Status:</strong> <span style={{textTransform: 'uppercase'}}>{data.status}</span></p>
                                <p><strong>Exchange Rate:</strong> {data.exchange_rate}</p>
                                <p><strong>Sales Agent:</strong> {salesAgents.find(a => a.id == data.sales_agent_id)?.name_en || 'N/A'}</p>
                            </div>
                        </div>

                        <table className="print-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Product / Description</th>
                                    <th className="text-center">Qty</th>
                                    <th className="text-center">Unit</th>
                                    <th className="text-right">Price</th>
                                    <th className="text-right">Disc.</th>
                                    <th className="text-right">Tax</th>
                                    <th className="text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.items.map((item, index) => (
                                    <tr key={index}>
                                        <td>{index + 1}</td>
                                        <td>
                                            <div className="font-bold">{productLabelById[String(item.product_id)] || ''}</div>
                                            <div style={{fontSize: '9pt', color: '#666'}}>{item.item_name_ar}</div>
                                        </td>
                                        <td className="text-center">{Number(item.quantity || 0)}</td>
                                        <td className="text-center">{unitLabelById[String(item.unit_id)] || ''}</td>
                                        <td className="text-right">{Number(item.unit_price || 0).toFixed(2)}</td>
                                        <td className="text-right">{Number(item.discount_amount || 0).toFixed(2)}</td>
                                        <td className="text-right">{Number(item.tax_amount || 0).toFixed(2)}</td>
                                        <td className="text-right font-bold">{Number(item.line_total || 0).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="print-totals">
                            <div className="totals-box">
                                <div className="row">
                                    <span>Subtotal:</span>
                                    <span>{Number(data.subtotal || 0).toFixed(2)}</span>
                                </div>
                                <div className="row">
                                    <span>Tax:</span>
                                    <span>{Number(data.tax_amount || 0).toFixed(2)}</span>
                                </div>
                                <div className="row">
                                    <span>Discount:</span>
                                    <span>{Number(data.discount_amount || 0).toFixed(2)}</span>
                                </div>
                                <div className="row">
                                    <span>Shipping:</span>
                                    <span>{Number(data.shipping_cost || 0).toFixed(2)}</span>
                                </div>
                                <div className="row grand-total">
                                    <span>Total:</span>
                                    <span>{Number(data.total_amount || 0).toFixed(2)} {currencies.find(c => c.id == data.currency_id)?.code}</span>
                                </div>
                            </div>
                        </div>

                        <div className="print-footer">
                            <div className="notes-section">
                                <h4>Notes</h4>
                                <p>{data.customer_notes || ''}</p>
                                <p>{data.internal_notes || ''}</p>
                            </div>
                            <div className="signatures">
                                <div className="sign-box">Prepared By</div>
                                <div className="sign-box">Approved By</div>
                                <div className="sign-box">Customer Acceptance</div>
                            </div>
                        </div>
                    </div>
                    </>
                )}
            </div>
        </AdminLayout>
    );
}
