import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import BlankPage from '@/Components/BlankPage';
import SearchableComboBox from '../components/SearchableComboBox';
import Table from '../components/Table';
import { formatDate } from '@/utils/date';
import { useNotification } from '@/Components/Notifications/useNotification';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';

export default function SalesReturn({ returns, customers, invoices, salesInvoices, products, units, warehouses, filters = {} }) {
    const [mode, setMode] = useState('list');
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [isInvoiceLoading, setIsInvoiceLoading] = useState(false);
    const [showInvoiceChangeDialog, setShowInvoiceChangeDialog] = useState(false);
    const [pendingInvoiceId, setPendingInvoiceId] = useState(null);
    const returnRef = useRef(null);
    const printRef = useRef(null);
    const { props } = usePage();
    const { showSuccess, showError, showWarning } = useNotification();
    const { localization } = props;
    const translations = localization?.translations || {};

    const getLocalizedRoute = (name, params = {}) => {
        return route(name, {
            country: localization?.country_code || 'sa',
            lang: localization?.current_locale || 'ar',
            ...params
        });
    };

    const t = (key, fallback) => {
        return translations[key] || translations[`sales_return.${key}`] || translations[`common.${key}`] || fallback;
    };

    const aggregateStats = useMemo(() => {
        const rows = returns?.data || [];
        let totalAmount = 0;
        let totalRefund = 0;
        let draft = 0;
        let pending = 0;
        let approved = 0;
        let completed = 0;
        rows.forEach(ret => {
            totalAmount += parseFloat(ret.total_amount || 0);
            totalRefund += parseFloat(ret.refund_amount || 0);
            if (ret.status === 'draft') draft++;
            else if (ret.status === 'requested') pending++;
            else if (ret.status === 'approved') approved++;
            else if (ret.status === 'completed') completed++;
        });
        return {
            totalReturns: rows.length,
            totalAmount,
            totalRefund,
            draft, pending, approved, completed,
        };
    }, [returns]);

    const breadcrumbs = [
        { label: t('sidebar.Dashboard', 'Dashboard'), href: getLocalizedRoute('admin.dashboard') },
        { label: t('sidebar.client_sales', 'Client Sales'), onClick: (e) => { e.preventDefault(); setMode('list'); } },
        { label: t('sidebar.sales_returns', 'Sales Returns') }
    ];
    if (mode === 'create') breadcrumbs.push({ label: t('common.create', 'Create') });
    if (mode === 'edit') breadcrumbs.push({ label: t('common.edit', 'Edit') });
    if (mode === 'view') breadcrumbs.push({ label: t('common.view', 'View') });

    const statsContent = mode === 'list' && (
        <div className="stats-cards">
            <div className="stat-card">
                <div className="stat-icon sales-return__stat-icon sales-return__stat-icon--primary">
                    <span className="material-icons-outlined">assignment_return</span>
                </div>
                <div className="stat-content">
                    <div className="stat-value">{aggregateStats.totalReturns.toLocaleString()}</div>
                    <div className="stat-label">{t('total_returns', 'Total Returns')}</div>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon sales-return__stat-icon sales-return__stat-icon--warning">
                    <span className="material-icons-outlined">undo</span>
                </div>
                <div className="stat-content">
                    <div className="stat-value">{Number(aggregateStats.totalAmount).toFixed(2)}</div>
                    <div className="stat-label">{t('total_return_value', 'Total Return Value')}</div>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon sales-return__stat-icon sales-return__stat-icon--success">
                    <span className="material-icons-outlined">payments</span>
                </div>
                <div className="stat-content">
                    <div className="stat-value">{Number(aggregateStats.totalRefund).toFixed(2)}</div>
                    <div className="stat-label">{t('total_refunded', 'Total Refunded')}</div>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon sales-return__stat-icon sales-return__stat-icon--info">
                    <span className="material-icons-outlined">checklist</span>
                </div>
                <div className="stat-content">
                    <div className="stat-value">
                        <span className="sales-return__muted">{aggregateStats.draft}</span>
                        {' / '}
                        <span className="sales-return__status-pill sales-return__status-pill--pending">{aggregateStats.pending}</span>
                        {' / '}
                        <span className="sales-return__status-pill sales-return__status-pill--approved">{aggregateStats.approved}</span>
                        {' / '}
                        <span className="sales-return__status-pill sales-return__status-pill--completed">{aggregateStats.completed}</span>
                    </div>
                    <div className="stat-label">{t('status_summary', 'Draft / Pending / Approved / Completed')}</div>
                </div>
            </div>
        </div>
    );

    const tableColumns = useMemo(() => [
        {
            header: t('return_number', 'Return #'),
            key: 'return_number',
            sortable: true,
            width: '140px',
            render: (row) => <strong className="sales-return__mono">{row.return_number || `#${row.id}`}</strong>,
        },
        {
            header: t('date', 'Date'),
            key: 'return_date',
            sortable: true,
            width: '130px',
            render: (row) => formatDate(row.return_date),
        },
        {
            header: t('customer', 'Customer'),
            key: 'customer_id',
            sortable: true,
            render: (row) => row?.customer?.name_en || row?.customer?.name_ar || row?.customer?.name || '-',
        },
        {
            header: t('sales_invoice', 'Sales Invoice'),
            key: 'invoice_id',
            sortable: true,
            render: (row) => row?.invoice?.invoice_number || row?.invoice_id || '-',
        },
        {
            header: t('warehouse', 'Warehouse'),
            key: 'warehouse_id',
            sortable: false,
            render: (row) => row?.warehouse?.name_en || row?.warehouse?.name_ar || '-',
        },
        {
            header: t('return_type', 'Return Type'),
            key: 'return_type',
            sortable: false,
            width: '120px',
            render: (row) => {
                const valids = ['full_return', 'partial_return', 'exchange'];
                const rt = valids.includes(row.return_type) ? row.return_type : 'partial_return';
                return (
                    <span className={`status-badge type-${rt}`}>
                        {rt.replace('_', ' ')}
                    </span>
                );
            },
        },
        {
            header: t('refund_status', 'Refund Status'),
            key: 'refund_status',
            sortable: true,
            width: '120px',
            render: (row) => (
                <span className={`status-badge status-${row.refund_status || 'pending'}`}>
                    {row.refund_status || 'pending'}
                </span>
            ),
        },
        {
            header: t('status', 'Status'),
            key: 'status',
            sortable: true,
            width: '130px',
            render: (row) => (
                <span className={`status-badge status-${row.status || 'draft'}`}>
                    {(row.status || 'draft').replace('_', ' ')}
                </span>
            ),
        },
        {
            header: t('total', 'Total Amount'),
            key: 'total_amount',
            sortable: true,
            width: '150px',
            render: (row) => (
                <span className="sales-return__mono">
                    {Number(row.total_amount || 0).toFixed(2)}
                </span>
            ),
        },
    ], []);

    const handleToolbarSearch = (searchText) => {
        router.get(getLocalizedRoute('admin.client-sales.sales-returns.index'), {
            ...filters,
            search: searchText,
            page: 1,
        }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const handleRefresh = () => {
        router.reload({ only: ['returns', 'filters'], preserveState: true, preserveScroll: true });
    };

    const handleServerSort = (sortKey, sortDirection) => {
        const params = { ...filters };
        if (sortKey && sortDirection) {
            params.sort_by = sortKey;
            params.sort_dir = sortDirection;
        } else {
            delete params.sort_by;
            delete params.sort_dir;
        }
        params.page = 1;
        router.get(getLocalizedRoute('admin.client-sales.sales-returns.index'), params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const invoiceOptions = useMemo(() => {
        return (salesInvoices || invoices || []).map(inv => ({
            value: String(inv.id),
            label: inv.invoice_number || String(inv.id)
        }));
    }, [salesInvoices, invoices]);

    const unitOptions = useMemo(() => {
        return (units || []).map(u => ({
            value: String(u.id),
            label: u.name_en || u.name_ar || ''
        }));
    }, [units]);

    const warehouseOptions = useMemo(() => {
        return (warehouses || []).map(w => ({
            value: String(w.id),
            label: w.name_en || w.name_ar || ''
        }));
    }, [warehouses]);

    const customerOptions = useMemo(() => {
        return (customers || []).map(c => ({
            value: String(c.id),
            label: c.name_en || c.name_ar || c.name || ''
        }));
    }, [customers]);

    const conditionOptions = useMemo(() => [
        { value: 'new', label: t('condition_new', 'New') },
        { value: 'used', label: t('condition_used', 'Used') },
        { value: 'damaged', label: t('condition_damaged', 'Damaged') },
        { value: 'defective', label: t('condition_defective', 'Defective') },
    ], [translations]);

    const returnReasonOptions = useMemo(() => [
        { value: 'damaged', label: t('reason_damaged', 'Damaged Goods') },
        { value: 'defective', label: t('reason_defective', 'Defective / Faulty') },
        { value: 'wrong_item', label: t('reason_wrong_item', 'Wrong Item Received') },
        { value: 'excess', label: t('reason_excess', 'Excess Quantity') },
    ], [translations]);

    const { data, setData, post, put, delete: destroy, processing, reset } = useForm({
        id: '',
        return_number: '',
        invoice_id: '',
        customer_id: '',
        warehouse_id: '',
        return_date: new Date().toISOString().split('T')[0],
        return_reason: 'damaged',
        return_type: 'partial_return',
        status: 'draft',
        refund_status: 'pending',
        received_by: '',
        received_date: '',
        approval_notes: '',
        customer_notes: '',
        internal_notes: '',
        inspection_notes: '',
        subtotal: 0,
        tax_amount: 0,
        restocking_fee: 0,
        total_amount: 0,
        refund_amount: 0,
        items: [],
    });

    const hasInvoice = useCallback(() => Boolean(data.invoice_id), [data.invoice_id]);

    useEffect(() => {
        calculateTotals(data.items);
    }, [data.items, data.restocking_fee]);

    const loadInvoiceData = useCallback((invoiceId) => {
        if (!invoiceId) return;
        setIsInvoiceLoading(true);

        const inv = (salesInvoices || invoices || []).find(i => String(i.id) === String(invoiceId));
        if (!inv) {
            setIsInvoiceLoading(false);
            return;
        }

        setSelectedInvoice(inv);

        setData('customer_id', inv.customer_id || '');
        setData('warehouse_id', inv.warehouse_id || '');

        const invItems = (inv.details || inv.items || []).map((detail, idx) => {
            const invoiceQty = parseFloat(detail.invoice_qty ?? detail.quantity ?? 0);
            const alreadyReturned = parseFloat(detail.returned_qty ?? 0);
            const availableQty = Math.max(0, parseFloat(detail.available_qty ?? (invoiceQty - alreadyReturned)));

            return {
                id: null,
                line_number: idx + 1,
                invoice_detail_id: detail.id || '',
                product_id: detail.product_id || '',
                item_name_ar: detail.item_name_ar || detail.product?.name_ar || '',
                item_name_en: detail.item_name_en || detail.product?.name_en || '',
                invoice_qty: invoiceQty,
                returned_qty: alreadyReturned,
                available_qty: availableQty,
                return_qty: 0,
                unit_id: detail.unit_id || detail.product?.unit_id || '',
                unit_price: parseFloat(detail.unit_price || 0),
                tax_percentage: parseFloat(detail.tax_percentage || detail.tax_rate || 0),
                tax_amount: 0,
                line_total: 0,
                batch_number: detail.batch_number || '',
                serial_number: detail.serial_number || '',
                return_reason_details: '',
                condition: 'new',
                inspection_notes: '',
                notes: '',
            };
        });

        setData('items', invItems);
        setTimeout(() => setIsInvoiceLoading(false), 150);
    }, [salesInvoices, invoices, setData]);

    const handleInvoiceChange = (invoiceId) => {
        const currentInvoiceId = data.invoice_id;
        const hasItems = data.items && data.items.some(it => parseFloat(it.return_qty || 0) > 0);
        const isEditingExisting = mode === 'edit' && Boolean(data.id);

        if (!invoiceId) {
            if (currentInvoiceId && (hasItems || isEditingExisting)) {
                if (!confirm(t('confirm_clear_invoice', 'Clearing the Sales Invoice will remove all return lines and reset the document. Continue?'))) {
                    return;
                }
            }
            setData('invoice_id', '');
            setSelectedInvoice(null);
            setData('customer_id', '');
            setData('warehouse_id', '');
            setData('items', []);
            calculateTotals([]);
            return;
        }

        if (currentInvoiceId && String(currentInvoiceId) !== String(invoiceId)) {
            if (hasItems || isEditingExisting) {
                setPendingInvoiceId(invoiceId);
                setShowInvoiceChangeDialog(true);
                return;
            }
        }

        setData('invoice_id', invoiceId);
        loadInvoiceData(invoiceId);
    };

    const confirmInvoiceChange = () => {
        const invoiceId = pendingInvoiceId;
        setShowInvoiceChangeDialog(false);
        setPendingInvoiceId(null);
        setData('invoice_id', invoiceId || '');
        setData('items', []);
        if (invoiceId) {
            loadInvoiceData(invoiceId);
        } else {
            setSelectedInvoice(null);
            setData('customer_id', '');
            setData('warehouse_id', '');
            calculateTotals([]);
        }
    };

    const cancelInvoiceChange = () => {
        setShowInvoiceChangeDialog(false);
        setPendingInvoiceId(null);
    };

    const handleCreate = () => {
        reset();
        const today = new Date();
        setData(prev => ({
            ...prev,
            return_date: today.toISOString().split('T')[0],
            received_date: today.toISOString().split('T')[0],
            status: 'draft',
            refund_status: 'pending',
            return_reason: 'damaged',
            return_type: 'partial_return',
            warehouse_id: warehouses?.[0]?.id || '',
            items: [],
        }));
        setSelectedInvoice(null);
        setMode('create');
    };

    const handleEdit = (ret) => {
        const toNum = (v) => (v === null || v === undefined ? 0 : Number(v));
        const validReturnReasons = ['damaged', 'defective', 'wrong_item', 'excess'];
        const validReturnTypes = ['full_return', 'partial_return', 'exchange'];
        const validStatuses = ['draft', 'requested', 'approved', 'completed', 'cancelled'];
        const validRefundStatuses = ['pending', 'partial', 'completed', 'cancelled'];
        const validConditions = ['new', 'used', 'damaged', 'defective'];

        const allReturnedMap = {};
        const allReturns = returns?.data || [];
        allReturns.forEach(r => {
            if (String(r.invoice_id) === String(ret.invoice_id) && String(r.id) !== String(ret.id) && r.status !== 'rejected' && r.status !== 'cancelled') {
                (r.details || r.items || []).forEach(d => {
                    const key = d.invoice_detail_id || d.product_id;
                    if (key) {
                        allReturnedMap[key] = (allReturnedMap[key] || 0) + parseFloat(d.quantity || d.return_qty || 0);
                    }
                });
            }
        });

        const retDetailMap = {};
        (ret.details || ret.items || []).forEach(d => {
            const key = d.invoice_detail_id || d.product_id;
            if (key) {
                retDetailMap[key] = parseFloat(d.quantity || d.return_qty || 0);
            }
        });

        const inv = (salesInvoices || invoices || []).find(i => String(i.id) === String(ret.invoice_id));
        const invDetailsMap = {};
        if (inv) {
            (inv.details || inv.items || []).forEach(d => {
                invDetailsMap[d.id || d.product_id] = d;
            });
        }

        setData({
            ...ret,
            return_reason: validReturnReasons.includes(ret.return_reason) ? ret.return_reason : 'damaged',
            return_type: validReturnTypes.includes(ret.return_type) ? ret.return_type : 'partial_return',
            status: validStatuses.includes(ret.status) ? ret.status : 'draft',
            refund_status: validRefundStatuses.includes(ret.refund_status) ? ret.refund_status : 'pending',
            items: (ret.details || ret.items || []).map((it, idx) => {
                const qty = toNum(it.quantity || it.return_qty);
                const unitPrice = toNum(it.unit_price);
                const taxAmount = toNum(it.tax_amount);
                const rawCond = validConditions.includes(it.condition) ? it.condition : 'new';

                const key = it.invoice_detail_id || it.product_id;
                const invDetail = invDetailsMap[key];
                const invoiceQty = toNum(it.invoice_qty ?? invDetail?.invoice_qty ?? invDetail?.quantity ?? 0);
                const prevReturnedOthers = allReturnedMap[key] || 0;
                const availableQty = Math.max(0, invoiceQty - prevReturnedOthers);

                return {
                    id: it.id,
                    line_number: idx + 1,
                    invoice_detail_id: it.invoice_detail_id || '',
                    product_id: it.product_id || '',
                    item_name_ar: it.product?.name_ar || it.item_name_ar || '',
                    item_name_en: it.product?.name_en || it.item_name_en || '',
                    invoice_qty: invoiceQty,
                    returned_qty: prevReturnedOthers,
                    available_qty: availableQty,
                    return_qty: qty,
                    unit_id: it.unit_id || it.product?.unit_id || '',
                    unit_price: unitPrice,
                    tax_percentage: toNum(it.tax_percentage || 0),
                    tax_amount: taxAmount,
                    line_total: toNum(it.line_total),
                    batch_number: it.batch_number || '',
                    serial_number: it.serial_number || '',
                    return_reason_details: it.return_reason_details || '',
                    condition: rawCond,
                    inspection_notes: it.inspection_notes || '',
                    notes: it.notes || '',
                };
            }),
            return_date: ret.return_date ? (typeof ret.return_date === 'string' ? ret.return_date.split('T')[0] : ret.return_date) : '',
            received_date: ret.received_date ? (typeof ret.received_date === 'string' ? ret.received_date.split('T')[0] : ret.received_date) : '',
            subtotal: toNum(ret.subtotal),
            tax_amount: toNum(ret.tax_amount),
            restocking_fee: toNum(ret.restocking_fee),
            total_amount: toNum(ret.total_amount),
            refund_amount: toNum(ret.refund_amount),
            customer_id: ret.customer_id || '',
            warehouse_id: ret.warehouse_id || '',
        });
        if (ret.invoice_id) {
            const invRec = (salesInvoices || invoices || []).find(i => String(i.id) === String(ret.invoice_id));
            setSelectedInvoice(invRec || null);
        }
        setMode('edit');
    };

    const handleView = (ret) => {
        handleEdit(ret);
        setMode('view');
    };

    const handleDelete = (id) => {
        if (confirm(t('delete_confirm', 'Are you sure you want to delete this return?'))) {
            destroy(getLocalizedRoute('admin.client-sales.sales-returns.destroy', { return: id }));
        }
    };

    const handleSubmit = (e) => {
        if (e) e.preventDefault();

        if (!data.invoice_id) {
            showWarning(t('error_invoice_required', 'Please select a Sales Invoice'));
            return;
        }
        if (!data.customer_id) {
            showWarning(t('error_customer_required', 'Customer must be populated from the selected Sales Invoice'));
            return;
        }
        if (!data.warehouse_id) {
            showWarning(t('error_warehouse_required', 'Warehouse must be populated from the selected Sales Invoice'));
            return;
        }

        const validItems = data.items.filter(item => parseFloat(item.return_qty || 0) > 0);
        if (validItems.length === 0) {
            showWarning(t('error_items_required', 'Please set at least one return quantity greater than 0'));
            return;
        }

        const errorMessages = [];
        validItems.forEach((item, i) => {
            const rq = parseFloat(item.return_qty || 0);
            const av = parseFloat(item.available_qty || 0);
            const name = item.item_name_en || item.item_name_ar || `Line ${i + 1}`;
            if (rq <= 0) {
                errorMessages.push(`${name}: Return quantity must be greater than 0`);
            }
            if (rq > av + 0.00001) {
                errorMessages.push(`${name}: Return quantity (${rq}) exceeds remaining available (${av})`);
            }
        });

        if (errorMessages.length > 0) {
            showError(errorMessages.join('\n'));
            return;
        }

        const submissionPayload = {
            ...data,
            items: validItems,
            received_by: data.received_by ? String(data.received_by) : null,
            received_date: data.received_date || null,
        };

        const submissionOptions = {
            preserveScroll: true,
            data: submissionPayload,
            onSuccess: () => {
                setMode('list');
                reset();
                setSelectedInvoice(null);
                showSuccess(t('success_save', 'Sales Return saved successfully.'));
            },
            onError: (errorsBag) => {
                setData('items', data.items);
                const firstKey = Object.keys(errorsBag || {})[0];
                if (firstKey) {
                    const firstMsg = Array.isArray(errorsBag[firstKey]) ? errorsBag[firstKey][0] : errorsBag[firstKey];
                    showError(`${firstKey}: ${firstMsg}`);
                } else {
                    showError(t('error_save', 'An error occurred while saving the Sales Return.'));
                }
            },
            onFinish: () => {
            },
        };

        if (mode === 'create') {
            post(getLocalizedRoute('admin.client-sales.sales-returns.store'), submissionOptions);
        } else {
            put(getLocalizedRoute('admin.client-sales.sales-returns.update', { return: data.id }), submissionOptions);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportPDF = () => {
        const element = printRef.current;
        if (!element) return;

        const module = element.closest('.sales-return');
        if (module) module.classList.add('generating-pdf');

        const opt = {
            margin: [5, 5],
            filename: `SalesReturn_${data.return_number || 'New'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save().then(() => {
            if (module) module.classList.remove('generating-pdf');
        });
    };

    const handleExportExcel = () => {
        const itemsData = data.items
            .filter(item => parseFloat(item.return_qty || 0) > 0)
            .map((item, index) => ({
                '#': index + 1,
                'Product': products.find(p => p.id == item.product_id)?.name_en || item.item_name_en || '',
                'Description': item.item_name_ar || item.return_reason_details || '',
                'Invoice Qty': Number(item.invoice_qty),
                'Prev Returned': Number(item.returned_qty),
                'Available Qty': Number(item.available_qty),
                'Return Qty': Number(item.return_qty),
                'Unit Price': Number(item.unit_price),
                'Tax %': Number(item.tax_percentage),
                'Tax Amount': Number(item.tax_amount),
                'Condition': item.condition,
                'Return Reason': item.return_reason_details,
                'Batch #': item.batch_number,
                'Serial #': item.serial_number,
                'Line Total': Number(item.line_total)
            }));

        itemsData.push({});
        itemsData.push({ 'Product': 'Subtotal', 'Line Total': Number(data.subtotal) });
        itemsData.push({ 'Product': 'Tax', 'Line Total': Number(data.tax_amount) });
        itemsData.push({ 'Product': 'Restocking Fee', 'Line Total': -Number(data.restocking_fee) });
        itemsData.push({ 'Product': 'Grand Total', 'Line Total': Number(data.total_amount) });
        itemsData.push({ 'Product': 'Refund Amount', 'Line Total': Number(data.refund_amount) });

        const worksheet = XLSX.utils.json_to_sheet(itemsData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Return");
        XLSX.writeFile(workbook, `SalesReturn_${data.return_number || 'New'}.xlsx`);
    };

    const removeItem = (index) => {
        const newItems = [...data.items];
        newItems.splice(index, 1);
        setData('items', newItems);
        calculateTotals(newItems);
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...data.items];
        newItems[index][field] = value;

        if (['return_qty'].includes(field)) {
            const returnQty = parseFloat(newItems[index].return_qty) || 0;
            const availableQty = parseFloat(newItems[index].available_qty) || 0;

            if (returnQty > availableQty + 0.00001) {
                newItems[index].return_qty = availableQty;
            }
            if (returnQty < 0) {
                newItems[index].return_qty = 0;
            }

            const actualReturnQty = parseFloat(newItems[index].return_qty) || 0;
            const price = parseFloat(newItems[index].unit_price) || 0;
            const taxPct = parseFloat(newItems[index].tax_percentage) || 0;

            const netAmount = actualReturnQty * price;
            const taxAmount = netAmount * (taxPct / 100);
            const lineTotal = netAmount + taxAmount;

            newItems[index].tax_amount = Number(taxAmount.toFixed(2));
            newItems[index].line_total = Number(lineTotal.toFixed(2));
        }

        setData('items', newItems);
    };

    const calculateTotals = (items) => {
        const restockingFee = parseFloat(data.restocking_fee) || 0;

        let calculatedSubtotal = 0;
        let calculatedTax = 0;

        items.forEach(item => {
            const returnQty = parseFloat(item.return_qty) || 0;
            if (returnQty <= 0) return;
            calculatedSubtotal += (returnQty * parseFloat(item.unit_price || 0));
            calculatedTax += parseFloat(item.tax_amount || 0);
        });

        const totalAmount = calculatedSubtotal + calculatedTax - restockingFee;
        const refundAmount = totalAmount;

        if (
            Math.abs(data.subtotal - calculatedSubtotal) > 0.01 ||
            Math.abs(data.tax_amount - calculatedTax) > 0.01 ||
            Math.abs(data.total_amount - totalAmount) > 0.01 ||
            Math.abs(data.refund_amount - refundAmount) > 0.01
        ) {
            setData(prev => ({
                ...prev,
                subtotal: Number(calculatedSubtotal.toFixed(2)),
                tax_amount: Number(calculatedTax.toFixed(2)),
                total_amount: Number(Math.max(0, totalAmount).toFixed(2)),
                refund_amount: Number(Math.max(0, refundAmount).toFixed(2)),
            }));
        }
    };

    const isViewMode = mode === 'view';
    const invoiceLocked = hasInvoice();
    const formDisabled = isViewMode || processing;

    const pageTitleText = isViewMode
        ? t('view_return', 'View Sales Return')
        : mode === 'create'
            ? t('create_new_return', 'Create New Sales Return')
            : t('edit_return', 'Edit Sales Return');

    const printCustomerName = useMemo(() => {
        const c = customers?.find(x => String(x.id) === String(data.customer_id));
        return c ? (c.name_en || c.name_ar || c.name || '-') : '-';
    }, [customers, data.customer_id]);

    const printInvoiceNumber = useMemo(() => {
        const i = (salesInvoices || invoices || []).find(x => String(x.id) === String(data.invoice_id));
        return i ? (i.invoice_number || String(i.id)) : '-';
    }, [salesInvoices, invoices, data.invoice_id]);

    const printWarehouseName = useMemo(() => {
        const w = warehouses?.find(x => String(x.id) === String(data.warehouse_id));
        return w ? (w.name_en || w.name_ar || '-') : '-';
    }, [warehouses, data.warehouse_id]);

    const renderDisabledTooltip = (reason) => ({ title: reason });

    return (
        <AdminLayout activeMenu={t('sidebar.sales_returns', 'Sales Returns')}>
            <Head title={t('title', 'Sales Returns Management')} />

            <BlankPage breadcrumbs={breadcrumbs} stats={mode === 'list' ? statsContent : undefined}>
                <div className="sales-return">

                    {showInvoiceChangeDialog && (
                        <div className="sales-return__modal-backdrop" onClick={cancelInvoiceChange}>
                            <div className="sales-return__modal" onClick={(e) => e.stopPropagation()}>
                                <div className="sales-return__modal-icon sales-return__modal-icon--warn">
                                    <span className="material-icons-outlined">warning</span>
                                </div>
                                <h3 className="sales-return__modal-title">
                                    {t('confirm_change_invoice_title', 'Change Sales Invoice?')}
                                </h3>
                                <p className="sales-return__modal-text">
                                    {t('confirm_change_invoice_body', 'Changing the Sales Invoice will remove all current return lines and reload data from the newly selected invoice. This action cannot be undone.')}
                                </p>
                                <div className="sales-return__modal-actions">
                                    <button
                                        type="button"
                                        className="sales-return__btn sales-return__btn--ghost"
                                        onClick={cancelInvoiceChange}
                                    >
                                        <span className="material-icons-outlined">cancel</span>
                                        {t('common.cancel', 'Cancel')}
                                    </button>
                                    <button
                                        type="button"
                                        className="sales-return__btn sales-return__btn--danger"
                                        onClick={confirmInvoiceChange}
                                    >
                                        <span className="material-icons-outlined">swap_horiz</span>
                                        {t('common.continue', 'Continue')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {mode === 'list' ? (
                        <div className="fade-in">
                            <Table
                                showToolbar={true}
                                toolbarSearch={true}
                                toolbarSearchValue={filters.search || ''}
                                onToolbarSearch={handleToolbarSearch}
                                toolbarSearchPlaceholder={t('search_placeholder', 'Search returns...')}
                                showAddButton={true}
                                addButtonText={t('create_return', '+ Create Return')}
                                onAdd={handleCreate}
                                showRefreshButton={true}
                                onRefresh={handleRefresh}
                                showViewButton={true}
                                tableData={returns?.data || returns || []}
                                columns={tableColumns}
                                onView={(row) => handleView(row)}
                                onEdit={(row) => handleEdit(row)}
                                onDelete={(row) => handleDelete(row.id)}
                                onSort={handleServerSort}
                                serverSide={true}
                                sortKey={filters.sort_by}
                                sortDirection={filters.sort_dir}
                                currentPage={returns?.current_page || 1}
                                totalPages={returns?.last_page || 1}
                                totalRecords={returns?.total || 0}
                                recordsPerPage={returns?.per_page || 10}
                                onPageChange={(page) => {
                                    router.get(getLocalizedRoute('admin.client-sales.sales-returns.index'), { ...filters, page }, {
                                        preserveState: true,
                                        preserveScroll: true,
                                        replace: true,
                                    });
                                }}
                                onRecordsPerPageChange={(perPage) => {
                                    router.get(getLocalizedRoute('admin.client-sales.sales-returns.index'), { ...filters, page: 1, per_page: perPage }, {
                                        preserveState: true,
                                        preserveScroll: true,
                                        replace: true,
                                    });
                                }}
                            />
                        </div>
                    ) : (
                        <div className="fade-in">
                            <div className="sales-return__card">
                                <div className="sales-return__doc-header">
                                    <div className="sales-return__header-group">
                                        <button type="button" className="sales-return__back-btn" onClick={() => setMode('list')} disabled={processing}>
                                            <span className="material-icons-outlined">arrow_back</span>
                                            <span>{t('common.back', 'Back')}</span>
                                        </button>
                                        <div className="sales-return__title-block">
                                            <h2 className="sales-return__title">{pageTitleText}</h2>
                                            <p className="sales-return__subtitle">{t('sales_return_subtitle', 'Returns are always generated from a Sales Invoice. Select an invoice to auto-populate all fields.')}</p>
                                        </div>
                                    </div>
                                    <div className="sales-return__action-bar">
                                        {!isViewMode && (
                                            <>
                                                <button type="button" className="sales-return__action-btn" onClick={handlePrint}>
                                                    <span className="material-icons-outlined">print</span>
                                                    <span>{t('print', 'Print')}</span>
                                                </button>
                                                <button type="button" className="sales-return__action-btn" onClick={handleExportPDF}>
                                                    <span className="material-icons-outlined">picture_as_pdf</span>
                                                    <span>PDF</span>
                                                </button>
                                                <button type="button" className="sales-return__action-btn" onClick={handleExportExcel}>
                                                    <span className="material-icons-outlined">table_chart</span>
                                                    <span>Excel</span>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="sales-return__body">
                                    <form ref={returnRef} onSubmit={handleSubmit} className="sales-return__form">

                                        <div className="sales-return__card">
                                            <h3 className="sales-return__section-title">
                                                <span className="material-icons-outlined">description</span>
                                                {t('document_information', 'Document Information')}
                                            </h3>
                                            <div className="sales-return__section-body">
                                                <div className="sales-return__grid sales-return__grid--doc">
                                                    <div className="sales-return__field">
                                                        <label className="sales-return__label">{t('return_number', 'Return #')}</label>
                                                        <input type="text" value={data.return_number} disabled placeholder={t('auto_generated', 'Auto-generated')} />
                                                    </div>
                                                    <div className="sales-return__field">
                                                        <label className="sales-return__label">{t('return_date', 'Return Date')} <span className="sales-return__required">*</span></label>
                                                        <input type="date" value={data.return_date} onChange={e => setData('return_date', e.target.value)} readOnly={formDisabled} />
                                                    </div>
                                                    <div className="sales-return__field">
                                                        <label className="sales-return__label">{t('return_type', 'Return Type')}</label>
                                                        <select value={data.return_type} onChange={e => setData('return_type', e.target.value)} disabled={formDisabled}>
                                                            <option value="partial_return">{t('rt_partial', 'Partial Return')}</option>
                                                            <option value="full_return">{t('rt_full', 'Full Return')}</option>
                                                            <option value="exchange">{t('rt_exchange', 'Exchange')}</option>
                                                        </select>
                                                    </div>
                                                    <div className="sales-return__field">
                                                        <label className="sales-return__label">{t('status', 'Status')}</label>
                                                        <select value={data.status} onChange={e => setData('status', e.target.value)} disabled={formDisabled}>
                                                            <option value="draft">{t('status_draft', 'Draft')}</option>
                                                            <option value="requested">{t('status_requested', 'Requested')}</option>
                                                            <option value="approved">{t('status_approved', 'Approved')}</option>
                                                            <option value="completed">{t('status_completed', 'Completed')}</option>
                                                            <option value="cancelled">{t('status_cancelled', 'Cancelled')}</option>
                                                        </select>
                                                    </div>
                                                    <div className="sales-return__field">
                                                        <label className="sales-return__label">{t('refund_status', 'Refund Status')}</label>
                                                        <select value={data.refund_status} onChange={e => setData('refund_status', e.target.value)} disabled={formDisabled}>
                                                            <option value="pending">{t('refund_pending', 'Pending')}</option>
                                                            <option value="partial">{t('refund_partial', 'Partial')}</option>
                                                            <option value="completed">{t('refund_completed', 'Completed')}</option>
                                                            <option value="cancelled">{t('refund_cancelled', 'Cancelled')}</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="sales-return__card">
                                            <h3 className="sales-return__section-title">
                                                <span className="material-icons-outlined">local_shipping</span>
                                                {t('customer_and_invoice', 'Customer & Invoice')}
                                                {selectedInvoice ? (
                                                    <span className="sales-return__section-hint">
                                                        <span className="material-icons-outlined" style={{ fontSize: '14px', color: 'var(--sr-success)', marginInlineEnd: '4px' }}>check_circle</span>
                                                        {t('hint_invoice_loaded', 'Loaded from:')}{' '}
                                                        <strong style={{ color: 'var(--sr-text-secondary)' }}>
                                                            {selectedInvoice.invoice_number || `#${selectedInvoice.id}`}
                                                        </strong>
                                                        {(selectedInvoice.customer_name_en || selectedInvoice.customer_name_ar) && (
                                                            <>
                                                                {' · '}
                                                                {selectedInvoice.customer_name_en || selectedInvoice.customer_name_ar}
                                                            </>
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="sales-return__section-hint">
                                                        {t('hint_invoice_source', 'Select a Sales Invoice first. All other fields will sync automatically.')}
                                                    </span>
                                                )}
                                            </h3>
                                            <div className="sales-return__section-body">
                                                <div className="sales-return__grid sales-return__grid--party">
                                                    <div className="sales-return__field">
                                                        <label className="sales-return__label">
                                                            {t('sales_invoice', 'Sales Invoice')} <span className="sales-return__required">*</span>
                                                        </label>
                                                        <div className={isInvoiceLoading ? 'sales-return__loading-wrap' : ''}>
                                                            <SearchableComboBox
                                                                options={invoiceOptions}
                                                                value={data.invoice_id ? String(data.invoice_id) : ''}
                                                                onChange={(val) => !formDisabled && handleInvoiceChange(val)}
                                                                disabled={formDisabled}
                                                                placeholder={t('select_invoice', 'Select Sales Invoice...')}
                                                            />
                                                            {isInvoiceLoading && (
                                                                <span className="sales-return__loading-indicator">
                                                                    <span className="material-icons-outlined sales-return__spin">sync</span>
                                                                    {t('loading_invoice', 'Loading invoice data...')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="sales-return__field" {...renderDisabledTooltip(invoiceLocked ? t('customer_locked_reason', 'Customer is locked because it must match the Sales Invoice') : '')}>
                                                        <label className="sales-return__label">
                                                            {t('customer', 'Customer')} <span className="sales-return__required">*</span>
                                                            {invoiceLocked && <span className="sales-return__lock-icon" title={t('customer_locked_reason', 'Locked to match Sales Invoice')}>🔒</span>}
                                                        </label>
                                                        <SearchableComboBox
                                                            options={customerOptions}
                                                            value={data.customer_id ? String(data.customer_id) : ''}
                                                            onChange={() => {}}
                                                            disabled={formDisabled || invoiceLocked}
                                                            placeholder={invoiceLocked ? '' : t('customer_loaded_automatically', 'Loaded when Invoice is selected')}
                                                        />
                                                    </div>
                                                    <div className="sales-return__field" {...renderDisabledTooltip(invoiceLocked ? t('warehouse_locked_reason', 'Warehouse is locked because returns must go back to the original invoice warehouse') : '')}>
                                                        <label className="sales-return__label">
                                                            {t('warehouse', 'Warehouse')} <span className="sales-return__required">*</span>
                                                            {invoiceLocked && <span className="sales-return__lock-icon" title={t('warehouse_locked_reason', 'Locked to match Sales Invoice warehouse')}>🔒</span>}
                                                        </label>
                                                        <SearchableComboBox
                                                            options={warehouseOptions}
                                                            value={data.warehouse_id ? String(data.warehouse_id) : ''}
                                                            onChange={() => {}}
                                                            disabled={formDisabled || invoiceLocked}
                                                            placeholder={invoiceLocked ? '' : t('warehouse_loaded_automatically', 'Loaded when Invoice is selected')}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="sales-return__card">
                                            <h3 className="sales-return__section-title">
                                                <span className="material-icons-outlined">assignment_returned</span>
                                                {t('return_information', 'Return Information')}
                                            </h3>
                                            <div className="sales-return__section-body">
                                                <div className="sales-return__grid sales-return__grid--return">
                                                    <div className="sales-return__field sales-return__span-full">
                                                        <label className="sales-return__label">{t('return_reason', 'Return Reason')} <span className="sales-return__required">*</span></label>
                                                        <select value={data.return_reason} onChange={e => setData('return_reason', e.target.value)} disabled={formDisabled} className="sales-return__select">
                                                            {returnReasonOptions.map(o => (
                                                                <option key={o.value} value={o.value}>{o.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="sales-return__field">
                                                        <label className="sales-return__label">{t('received_by', 'Received By')}</label>
                                                        <input type="number" value={data.received_by} onChange={e => setData('received_by', e.target.value)} readOnly={formDisabled} />
                                                    </div>
                                                    <div className="sales-return__field">
                                                        <label className="sales-return__label">{t('received_date', 'Received Date')}</label>
                                                        <input type="date" value={data.received_date} onChange={e => setData('received_date', e.target.value)} readOnly={formDisabled} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="sales-return__items">
                                            <div className="sales-return__items-header">
                                                <h3>
                                                    <span className="material-icons-outlined">inventory_2</span>
                                                    {t('returned_items', 'Returned Items')}
                                                </h3>
                                                <div className="sales-return__items-header-hint">
                                                    {!invoiceLocked
                                                        ? t('hint_no_invoice_items', 'Select a Sales Invoice above to load returnable items.')
                                                        : t('hint_invoice_items_locked', 'Items are loaded from Invoice. Edit only Return Qty and Condition.')}
                                                </div>
                                            </div>
                                            <div className="sales-return__table-wrap">
                                                <table className="sales-return__table">
                                                    <thead>
                                                        <tr>
                                                            <th className="sales-return__table__col-num">#</th>
                                                            <th className="sales-return__table__col-item">{t('item', 'Item')}</th>
                                                            <th className="sales-return__table__col-qty">{t('invoice_qty', 'Invoice Qty')}</th>
                                                            <th className="sales-return__table__col-qty">{t('prev_returned', 'Prev. Returned')}</th>
                                                            <th className="sales-return__table__col-qty">{t('available_qty', 'Available')}</th>
                                                            <th className="sales-return__table__col-qty">{t('return_qty', 'Return Qty')}*</th>
                                                            <th className="sales-return__table__col-unit">{t('unit', 'Unit')}</th>
                                                            <th className="sales-return__table__col-price">{t('price', 'Price')}</th>
                                                            <th className="sales-return__table__col-pct">{t('tax_pct', 'Tax %')}</th>
                                                            <th className="sales-return__table__col-tax">{t('tax_amount', 'Tax')}</th>
                                                            <th className="sales-return__table__col-cond">{t('condition', 'Condition')}</th>
                                                            <th className="sales-return__table__col-batch">{t('batch', 'Batch')}</th>
                                                            <th className="sales-return__table__col-serial">{t('serial', 'Serial')}</th>
                                                            <th className="sales-return__table__col-total">{t('total', 'Total')}</th>
                                                            <th className="sales-return__table__col-action"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {data.items.length === 0 && (
                                                            <tr className="is-empty-row">
                                                                <td colSpan={15}>
                                                                    <div className="sales-return__empty-state">
                                                                        <span className="material-icons-outlined">assignment_return</span>
                                                                        <p>
                                                                            {!invoiceLocked
                                                                                ? t('empty_items_hint', 'Select a Sales Invoice above to automatically load returnable items.')
                                                                                : t('empty_all_returned', 'All quantities on this invoice have already been returned.')}
                                                                        </p>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                        {data.items.map((item, index) => {
                                                            const rq = parseFloat(item.return_qty || 0);
                                                            const av = parseFloat(item.available_qty || 0);
                                                            const qtyWarning = rq > 0 && rq > av + 0.00001;
                                                            return (
                                                                <tr key={index} className={qtyWarning ? 'sales-return__row--warn' : ''}>
                                                                    <td className="sales-return__table__col-num">{index + 1}</td>
                                                                    <td className="sales-return__table__col-item">
                                                                        <div className="sales-return__item-name">
                                                                            <input
                                                                                type="text"
                                                                                value={item.item_name_en || item.item_name_ar || products.find(p => p.id == item.product_id)?.name_en || ''}
                                                                                readOnly
                                                                                className="sales-return__item-name-input sales-return__read-only"
                                                                                title={t('item_locked', 'Item is locked from the Sales Invoice')}
                                                                            />
                                                                            <input
                                                                                type="text"
                                                                                className="sales-return__item-desc"
                                                                                placeholder={t('reason_details', 'Reason details / Description')}
                                                                                value={item.return_reason_details}
                                                                                onChange={e => handleItemChange(index, 'return_reason_details', e.target.value)}
                                                                                readOnly={formDisabled}
                                                                            />
                                                                        </div>
                                                                    </td>
                                                                    <td className="sales-return__table__col-qty">
                                                                        <input type="number" value={Number(item.invoice_qty).toFixed(2)} readOnly className="sales-return__read-only" title={t('invoice_qty_locked', 'Invoice quantity - locked')} />
                                                                    </td>
                                                                    <td className="sales-return__table__col-qty">
                                                                        <input type="number" value={Number(item.returned_qty).toFixed(2)} readOnly className="sales-return__read-only" title={t('returned_qty_locked', 'Already returned on other documents')} />
                                                                    </td>
                                                                    <td className="sales-return__table__col-qty">
                                                                        <input type="number" value={Number(item.available_qty).toFixed(2)} readOnly className="sales-return__read-only" title={t('available_qty_locked', 'Remaining quantity available to return')} />
                                                                    </td>
                                                                    <td className="sales-return__table__col-qty">
                                                                        <input
                                                                            type="number"
                                                                            value={item.return_qty}
                                                                            onChange={e => handleItemChange(index, 'return_qty', e.target.value)}
                                                                            readOnly={formDisabled}
                                                                            min="0"
                                                                            step="0.0001"
                                                                            max={item.available_qty}
                                                                            className={qtyWarning ? 'sales-return__input--warn' : ''}
                                                                            title={rq <= 0 ? t('hint_enter_return_qty', 'Enter return quantity > 0 to include this line') : ''}
                                                                        />
                                                                    </td>
                                                                    <td className="sales-return__table__col-unit">
                                                                        <select
                                                                            value={item.unit_id ? String(item.unit_id) : ''}
                                                                            onChange={() => {}}
                                                                            disabled={true}
                                                                            className="sales-return__read-only"
                                                                            title={t('unit_locked_reason', 'Unit is locked from Sales Invoice')}
                                                                        >
                                                                            <option value="">{t('select_unit', 'Select Unit')}</option>
                                                                            {unitOptions.map(unit => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
                                                                        </select>
                                                                    </td>
                                                                    <td className="sales-return__table__col-price">
                                                                        <input
                                                                            type="number"
                                                                            value={Number(item.unit_price).toFixed(4)}
                                                                            readOnly
                                                                            className="sales-return__read-only"
                                                                            title={t('price_locked_reason', 'Price is locked from Sales Invoice')}
                                                                        />
                                                                    </td>
                                                                    <td className="sales-return__table__col-pct">
                                                                        <input
                                                                            type="number"
                                                                            value={Number(item.tax_percentage).toFixed(2)}
                                                                            readOnly
                                                                            className="sales-return__read-only"
                                                                            title={t('tax_locked_reason', 'Tax % is locked from Sales Invoice')}
                                                                        />
                                                                    </td>
                                                                    <td className="sales-return__table__col-tax">
                                                                        <input type="text" value={Number(item.tax_amount).toFixed(2)} readOnly />
                                                                    </td>
                                                                    <td className="sales-return__table__col-cond">
                                                                        <select
                                                                            value={item.condition}
                                                                            onChange={e => handleItemChange(index, 'condition', e.target.value)}
                                                                            disabled={formDisabled}
                                                                        >
                                                                            {conditionOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                                        </select>
                                                                    </td>
                                                                    <td className="sales-return__table__col-batch">
                                                                        <input
                                                                            type="text"
                                                                            value={item.batch_number}
                                                                            readOnly
                                                                            className="sales-return__read-only"
                                                                            title={t('batch_locked_reason', 'Batch # is copied from Sales Invoice')}
                                                                        />
                                                                    </td>
                                                                    <td className="sales-return__table__col-serial">
                                                                        <input
                                                                            type="text"
                                                                            value={item.serial_number}
                                                                            readOnly
                                                                            className="sales-return__read-only"
                                                                            title={t('serial_locked_reason', 'Serial # is copied from Sales Invoice')}
                                                                        />
                                                                    </td>
                                                                    <td className="sales-return__table__col-total">
                                                                        <input type="text" value={Number(item.line_total).toFixed(2)} readOnly />
                                                                    </td>
                                                                    <td className="sales-return__table__col-action">
                                                                        {!formDisabled && (
                                                                            <button
                                                                                type="button"
                                                                                className="sales-return__row-del"
                                                                                onClick={() => removeItem(index)}
                                                                                aria-label={t('remove_line', 'Remove line')}
                                                                                title={t('remove_line_hint', 'Exclude this item from the return document')}
                                                                            >
                                                                                <span className="material-icons-outlined">delete_outline</span>
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        <div className="sales-return__footer-grid">
                                            <div className="sales-return__notes-col">
                                                <div className="sales-return__card">
                                                    <h3 className="sales-return__section-title">
                                                        <span className="material-icons-outlined">fact_check</span>
                                                        {t('approval_notes', 'Approval Notes')}
                                                    </h3>
                                                    <div className="sales-return__section-body">
                                                        <div className="sales-return__field">
                                                            <textarea className="sales-return__textarea" value={data.approval_notes} onChange={e => setData('approval_notes', e.target.value)} readOnly={formDisabled} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="sales-return__card">
                                                    <h3 className="sales-return__section-title">
                                                        <span className="material-icons-outlined">edit_note</span>
                                                        {t('internal_notes', 'Internal Notes')}
                                                    </h3>
                                                    <div className="sales-return__section-body">
                                                        <div className="sales-return__field">
                                                            <textarea className="sales-return__textarea sales-return__textarea--lg" value={data.internal_notes} onChange={e => setData('internal_notes', e.target.value)} readOnly={formDisabled} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="sales-return__summary">
                                                <div className="sales-return__summary-head">
                                                    <h3>
                                                        <span className="material-icons-outlined">payments</span>
                                                        {t('financial_summary', 'Financial Summary')}
                                                    </h3>
                                                </div>
                                                <div className="sales-return__summary-body">
                                                    <div className="sales-return__summary-row">
                                                        <span className="sales-return__summary-label">{t('subtotal', 'Subtotal')}</span>
                                                        <span className="sales-return__summary-value sales-return__mono">{Number(data.subtotal).toFixed(2)}</span>
                                                    </div>
                                                    <div className="sales-return__summary-row">
                                                        <span className="sales-return__summary-label">{t('tax_total', 'Tax Total')}</span>
                                                        <span className="sales-return__summary-value sales-return__mono">{Number(data.tax_amount).toFixed(2)}</span>
                                                    </div>
                                                    <div className="sales-return__summary-row sales-return__summary-row--subtle">
                                                        <span className="sales-return__summary-label">{t('restocking_fee', 'Restocking Fee')}</span>
                                                        <input type="number" value={data.restocking_fee} onChange={e => setData('restocking_fee', e.target.value)} readOnly={formDisabled} min="0" step="0.01" />
                                                    </div>
                                                    <div className="sales-return__summary-row sales-return__summary-row--total">
                                                        <span className="sales-return__summary-label">{t('grand_total', 'Total Amount')}</span>
                                                        <span className="sales-return__summary-value sales-return__mono">{Number(data.total_amount).toFixed(2)}</span>
                                                    </div>
                                                    <div className="sales-return__summary-row sales-return__summary-row--refund">
                                                        <span className="sales-return__summary-label">{t('refund_amount', 'Refund Amount')}</span>
                                                        <span className="sales-return__summary-value sales-return__mono">{Number(data.refund_amount).toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </form>
                                </div>

                                {!isViewMode && (
                                    <div className="sales-return__footer">
                                        <button type="button" className="sales-return__btn sales-return__btn--ghost" onClick={() => setMode('list')} disabled={processing}>
                                            <span className="material-icons-outlined">cancel</span>
                                            {t('common.cancel', 'Cancel')}
                                        </button>
                                        <button type="button" className="sales-return__btn sales-return__btn--primary" onClick={handleSubmit} disabled={processing || !invoiceLocked}>
                                            <span className="material-icons-outlined">save</span>
                                            {t('save_return', 'Save Return')}
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="sales-return__print" ref={printRef}>
                                <div className="sr-print__company">
                                    <div className="sr-print__company-brand">
                                        <h1>ZODIC ERP</h1>
                                        <p>123 Business Street, City, Country</p>
                                        <p>Phone: +1 234 567 890</p>
                                        <p>Email: info@zodicerp.com</p>
                                    </div>
                                    <div className="sr-print__company-doc">
                                        <h2>{t('sales_return', 'Sales Return').toUpperCase()}</h2>
                                        <div className="sr-print__meta-item sr-print__meta-item--end sr-print__meta-item--mt1">
                                            <span className="label">{t('return_number', 'Return #')}:</span>
                                            <span className="value sr-print__value--strong">{data.return_number || 'DRAFT'}</span>
                                        </div>
                                        <div className="sr-print__meta-item sr-print__meta-item--end sr-print__meta-item--mt05">
                                            <span className="label">{t('return_date', 'Return Date')}:</span>
                                            <span className="value">{data.return_date}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="sr-print__meta-grid">
                                    <div className="sr-print__meta-item">
                                        <span className="label">{t('customer', 'Customer')}</span>
                                        <span className="value">{printCustomerName}</span>
                                    </div>
                                    <div className="sr-print__meta-item">
                                        <span className="label">{t('sales_invoice', 'Sales Invoice')}</span>
                                        <span className="value">{printInvoiceNumber}</span>
                                    </div>
                                    <div className="sr-print__meta-item">
                                        <span className="label">{t('warehouse', 'Warehouse')}</span>
                                        <span className="value">{printWarehouseName}</span>
                                    </div>
                                    <div className="sr-print__meta-item">
                                        <span className="label">{t('status', 'Status')}</span>
                                        <span className="value">{(data.status || 'draft').replace('_', ' ')}</span>
                                    </div>
                                    <div className="sr-print__meta-item">
                                        <span className="label">{t('refund_status', 'Refund Status')}</span>
                                        <span className="value">{(data.refund_status || 'pending').replace('_', ' ')}</span>
                                    </div>
                                    <div className="sr-print__meta-item">
                                        <span className="label">{t('return_type', 'Return Type')}</span>
                                        <span className="value">{(data.return_type || 'standard').replace('_', ' ')}</span>
                                    </div>
                                </div>

                                <table className="sr-print__table">
                                    <thead>
                                        <tr>
                                            <th className="sr-print__th-num">#</th>
                                            <th>{t('description', 'Description')}</th>
                                            <th className="sr-print__th-qty ctr">{t('return_qty', 'Qty')}</th>
                                            <th className="sr-print__th-price num">{t('price', 'Price')}</th>
                                            <th className="sr-print__th-tax num">{t('tax_amount', 'Tax')}</th>
                                            <th className="sr-print__th-total num">{t('total', 'Total')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.items.filter(i => parseFloat(i.return_qty || 0) > 0).map((item, index) => (
                                            <tr key={index}>
                                                <td>{index + 1}</td>
                                                <td>
                                                    <div className="product-name">{products?.find(p => p.id == item.product_id)?.name_en || item.item_name_en || products?.find(p => p.id == item.product_id)?.name_ar || item.item_name_ar || '-'}</div>
                                                    {item.return_reason_details && <div className="product-meta">{t('reason', 'Reason')}: {item.return_reason_details}</div>}
                                                    {item.condition && item.condition !== 'good' && <div className="product-meta">{t('condition', 'Condition')}: {item.condition}</div>}
                                                    {(item.batch_number || item.serial_number) && (
                                                        <div className="product-meta">
                                                            {item.batch_number && `Batch: ${item.batch_number}`}
                                                            {item.batch_number && item.serial_number && ' · '}
                                                            {item.serial_number && `Serial: ${item.serial_number}`}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="ctr">{item.return_qty}</td>
                                                <td className="num">{Number(item.unit_price).toFixed(2)}</td>
                                                <td className="num">{Number(item.tax_amount).toFixed(2)}</td>
                                                <td className="num strong">{Number(item.line_total).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                        {data.items.filter(i => parseFloat(i.return_qty || 0) > 0).length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="sr-print__empty-row">
                                                    {t('no_items_to_print', 'No items recorded for this return')}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>

                                <div className="sr-print__totals">
                                    <div className="sr-print__totals-row">
                                        <span className="sr-print__totals-label">{t('subtotal', 'Subtotal')}:</span>
                                        <span className="sr-print__totals-value">{Number(data.subtotal).toFixed(2)}</span>
                                    </div>
                                    <div className="sr-print__totals-row">
                                        <span className="sr-print__totals-label">{t('tax_total', 'Tax')}:</span>
                                        <span className="sr-print__totals-value">{Number(data.tax_amount).toFixed(2)}</span>
                                    </div>
                                    {parseFloat(data.restocking_fee || 0) > 0 && (
                                        <div className="sr-print__totals-row sr-print__totals-row--subtle">
                                            <span className="sr-print__totals-label">{t('restocking_fee', 'Restocking Fee')}:</span>
                                            <span className="sr-print__totals-value">-{Number(data.restocking_fee).toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="sr-print__totals-row sr-print__totals-row--total">
                                        <span className="sr-print__totals-label">{t('grand_total', 'Grand Total')}:</span>
                                        <span className="sr-print__totals-value sr-print__totals-value--strong">{Number(data.total_amount).toFixed(2)}</span>
                                    </div>
                                    <div className="sr-print__totals-row sr-print__totals-row--refund">
                                        <span className="sr-print__totals-label">{t('refund_amount', 'Refund Amount')}:</span>
                                        <span className="sr-print__totals-value sr-print__totals-value--strong">{Number(data.refund_amount).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </BlankPage>
        </AdminLayout>
    );
}