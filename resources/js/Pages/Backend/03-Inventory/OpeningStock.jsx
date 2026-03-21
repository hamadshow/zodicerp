import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import * as XLSX from 'xlsx';
import '../../../../css/backend/main.scss';

const formatMoney = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0.00';
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const toNumber = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return num;
};

const sanitizeDecimal = (value, maxDecimals = 3) => {
  const raw = String(value ?? '').replace(',', '.');
  let cleaned = raw.replace(/[^\d.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
    const decimals = cleaned.slice(firstDot + 1);
    cleaned = cleaned.slice(0, firstDot + 1) + decimals.slice(0, maxDecimals);
  }
  if (cleaned.startsWith('.')) cleaned = `0${cleaned}`;
  return cleaned;
};

const padOp = (referenceId) => {
  const str = String(referenceId ?? '').trim();
  const num = Number(str);
  if (!Number.isFinite(num) || num <= 0) return 'OP-0000';
  return `OP-${String(num).padStart(4, '0')}`;
};

const buildLocalizedRoute = (name, localization, params = {}) =>
  route(name, {
    country: localization?.country_code || 'sa',
    lang: localization?.current_locale || 'ar',
    ...params,
  });

const newRow = (defaultUnitId = '') => ({
  product_id: '',
  unit_id: defaultUnitId ? String(defaultUnitId) : '',
  quantity: '',
  cost_base: '',
  cost_price: '',
});

const ViewSection = ({ lines, onCreate, onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLines = useMemo(() => {
    const term = String(searchTerm || '').trim().toLowerCase();
    if (!term) return lines;
    return (lines || []).filter((row) => {
      const haystack = [
        row.voucher_num,
        row.movement_date,
        row.warehouse_name,
        row.warehouse_code,
        row.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [lines, searchTerm]);

  const stats = useMemo(() => {
    const total = filteredLines.length;
    const active = filteredLines.length; // Can be adjusted based on header status if added later
    const totalQuantity = filteredLines.reduce((sum, r) => sum + toNumber(r.total_quantity), 0);
    const totalCost = filteredLines.reduce((sum, r) => sum + toNumber(r.total_cost), 0);
    return { total, active, totalQuantity, totalCost };
  }, [filteredLines]);

  return (
    <div className="animate-fade-slide">
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#3b82f6' }}>
            <span className="material-icons-outlined">inventory_2</span>
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.total}</span>
            <div className="stat-label">Total Lines</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#10b981' }}>
            <span className="material-icons-outlined">check_circle</span>
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.active}</span>
            <div className="stat-label">Valid Lines</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#8b5cf6' }}>
            <span className="material-icons-outlined">scale</span>
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalQuantity.toLocaleString()}</span>
            <div className="stat-label">Total Quantity</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#f59e0b' }}>
            <span className="material-icons-outlined">payments</span>
          </div>
          <div className="stat-content">
            <span className="stat-value">{formatMoney(stats.totalCost)}</span>
            <div className="stat-label">Total Cost</div>
          </div>
        </div>
      </div>

      <div className="content-card">
        <div className="page-header" style={{ marginBottom: '1.5rem' }}>
          <div className="search-box">
            <span className="material-icons-outlined search-icon">search</span>
            <input
              type="text"
              placeholder="Search opening stock..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={onCreate}>
            <span className="material-icons-outlined">add</span>
            Add Opening Stock
          </button>
        </div>

        <div className="table-responsive">
          <table className="professional-table">
            <thead>
              <tr>
                <th>Voucher</th>
                <th>Date</th>
                <th>Warehouse</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLines.length > 0 ? (
                filteredLines.map((row) => {
                  return (
                    <tr key={`header-${row.id}`}>
                      <td>{row.voucher_num || '-'}</td>
                      <td>{row.movement_date || '-'}</td>
                      <td>{row.warehouse_name || '-'}</td>
                      <td>{row.notes || '-'}</td>
                      <td>
                        <div className="action-buttons">
                          <button onClick={() => onEdit(row.id)} title="Edit">
                            <span className="material-icons-outlined">edit</span>
                          </button>
                          <button className="delete-btn" onClick={() => onDelete(row.id)} title="Delete">
                            <span className="material-icons-outlined">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                    No opening stock lines found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const FormSection = ({
  mode,
  data,
  setData,
  products,
  units,
  warehouses,
  processing,
  errors,
  onBack,
  onSubmit,
  fileInputRef,
  barcodeInputRef,
  barcode,
  setBarcode,
  onBarcodeSubmit,
  onImportClick,
  onImportFileChange,
  addRow,
  removeRow,
  updateRow,
}) => {
  const isEdit = mode === 'edit';
  return (
    <div className="animate-fade-slide">
      <div className="content-card">
        <div className="form-container">
          <div className="form-section-title">{isEdit ? 'Edit Opening Stock' : 'Create New Opening Stock'}</div>

          <form onSubmit={onSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>
                  Date <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={data.date}
                  onChange={(e) => setData('date', e.target.value)}
                  required
                  disabled={processing}
                />
                {errors.date && <div className="error-message">{errors.date}</div>}
              </div>

              <div className="form-group">
                <label>Reference</label>
                <input type="text" className="form-control" value={data.reference_no} readOnly />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>
                  Warehouse <span style={{ color: 'red' }}>*</span>
                </label>
                <select
                  className="form-control"
                  value={data.warehouse_id ? String(data.warehouse_id) : ''}
                  onChange={(e) => setData('warehouse_id', e.target.value)}
                  required
                  disabled={processing}
                >
                  <option value="" disabled>
                    Select Warehouse
                  </option>
                  {(warehouses || []).map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
                {errors.warehouse_id && <div className="error-message">{errors.warehouse_id}</div>}
              </div>

              <div className="form-group">
                <label>Notes</label>
                <input
                  type="text"
                  className="form-control"
                  value={data.notes}
                  onChange={(e) => setData('notes', e.target.value)}
                  placeholder="Optional notes"
                  disabled={processing}
                />
                {errors.notes && <div className="error-message">{errors.notes}</div>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Barcode / SKU / Code</label>
                <input
                  ref={barcodeInputRef}
                  type="text"
                  className="form-control"
                  placeholder="Scan barcode / SKU / Code"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={onBarcodeSubmit}
                  disabled={processing}
                />
              </div>
              <div className="form-group">
                <label>Import</label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="d-none"
                    onChange={onImportFileChange}
                  />
                  <button type="button" className="btn btn-secondary" onClick={onImportClick} disabled={processing}>
                    <span className="material-icons-outlined">upload_file</span>
                    Import Excel
                  </button>
                  <button type="button" className="btn btn-primary" onClick={addRow} disabled={processing}>
                    <span className="material-icons-outlined">add</span>
                    Add Row
                  </button>
                </div>
              </div>
            </div>

            <div className="table-responsive" style={{ marginTop: '1rem' }}>
              <table className="professional-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Unit</th>
                    <th>Quantity</th>
                    <th>Cost Price</th>
                    <th>Total</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.items || []).map((row, index) => {
                    const qty = toNumber(row.quantity);
                    const cost = toNumber(row.cost_price);
                    const total = qty * cost;

                    return (
                      <tr key={index} data-opening-stock-row={index}>
                        <td>
                          <select
                            className="form-control"
                            value={row.product_id ? String(row.product_id) : ''}
                            onChange={(e) => updateRow(index, 'product_id', e.target.value)}
                            disabled={processing}
                          >
                            <option value="">Select Product</option>
                            {(products || []).map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} {p.product_code ? `(${p.product_code})` : ''}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            className="form-control"
                            value={row.unit_id ? String(row.unit_id) : ''}
                            onChange={(e) => updateRow(index, 'unit_id', e.target.value)}
                            disabled={processing}
                          >
                            <option value="">Unit</option>
                            {(units || []).map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            name="qty"
                            type="number"
                            step="0.001"
                            min="0"
                            inputMode="decimal"
                            className="form-control"
                            value={row.quantity}
                            onChange={(e) => updateRow(index, 'quantity', sanitizeDecimal(e.target.value, 3))}
                            onKeyDown={(e) => {
                              if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                                e.preventDefault();
                              }
                            }}
                            disabled={processing}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            className="form-control"
                            value={row.cost_price}
                            onChange={(e) => updateRow(index, 'cost_price', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                                e.preventDefault();
                              }
                            }}
                            disabled={processing}
                          />
                        </td>
                        <td>{formatMoney(total)}</td>
                        <td>
                          <div className="action-buttons">
                            <button type="button" onClick={() => removeRow(index)} title="Delete">
                              <span className="material-icons-outlined">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={onBack} disabled={processing}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={processing}>
                {processing ? 'Saving...' : isEdit ? 'Update Opening Stock' : 'Create Opening Stock'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const OpeningStock = () => {
  const page = usePage();
  const { products = [], units = [], warehouses = [], defaultDate, referenceId, referenceNo, openingStockLines = [], editingMovement } =
    page.props || {};
  const localization = page.props?.localization;
  const flash = page.props?.flash || {};

  const fileInputRef = useRef(null);
  const barcodeInputRef = useRef(null);
  const [barcode, setBarcode] = useState('');
  const [mode, setMode] = useState('view');
  const [editingId, setEditingId] = useState(null);
  const [localSuccess, setLocalSuccess] = useState('');
  const [localError, setLocalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const defaultUnitId = units?.[0]?.id ? String(units[0].id) : '';
  const defaultWarehouseId = warehouses?.[0]?.id ? String(warehouses[0].id) : '';

  const {
    data,
    setData,
    processing,
    errors,
    setError,
    reset,
    clearErrors,
  } = useForm({
    date: defaultDate || new Date().toISOString().slice(0, 10),
    reference_id: referenceId || 1,
    reference_no: referenceNo || padOp(referenceId || 1),
    warehouse_id: defaultWarehouseId,
    notes: '',
    items: [newRow(defaultUnitId)],
  });

  const busy = processing || submitting;

  useEffect(() => {
    setData((prev) => ({
      ...prev,
      date: defaultDate || prev.date,
      reference_id: referenceId || prev.reference_id,
      reference_no: referenceNo || padOp(referenceId || prev.reference_id),
      warehouse_id: prev.warehouse_id || defaultWarehouseId,
      items: (prev.items || []).map((row) => ({
        ...row,
        unit_id: row.unit_id || defaultUnitId,
      })),
    }));
  }, [defaultDate, referenceId, referenceNo, defaultWarehouseId, defaultUnitId, setData]);

  useEffect(() => {
    if (flash?.success) {
      setLocalSuccess(String(flash.success));
      setLocalError('');
      const t = setTimeout(() => setLocalSuccess(''), 3500);
      return () => clearTimeout(t);
    }
  }, [flash?.success]);

  useEffect(() => {
    if (flash?.error) {
      setLocalError(String(flash.error));
      setLocalSuccess('');
      const t = setTimeout(() => setLocalError(''), 5000);
      return () => clearTimeout(t);
    }
  }, [flash?.error]);

  useEffect(() => {
    const first = Object.values(errors || {}).find(Boolean);
    if (!first) return;
    const message = Array.isArray(first) ? first[0] : first;
    if (!message) return;
    setLocalError(String(message));
    setLocalSuccess('');
  }, [errors]);

  const unitFactorById = useMemo(() => {
    const map = new Map();
    for (const u of units || []) {
      const raw = u?.conversion_factor ?? 1;
      const factor = toNumber(raw);
      map.set(String(u.id), factor > 0 ? factor : 1);
    }
    return map;
  }, [units]);

  const computeCostPrice = (baseCost, unitId) => {
    const factor = unitFactorById.get(String(unitId || '')) ?? 1;
    const val = toNumber(baseCost) * toNumber(factor);
    if (!Number.isFinite(val)) return '';
    return String(Number(val.toFixed(3)));
  };

  const selectedProductIds = useMemo(() => {
    return (data.items || [])
      .map((r) => String(r.product_id || ''))
      .filter(Boolean);
  }, [data.items]);

  const focusRow = (index) => {
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-opening-stock-row="${index}"] select`);
      if (el) el.focus();
    });
  };

  const addRow = () => {
    setData('items', [...data.items, newRow(defaultUnitId)]);
    clearErrors('items');
    requestAnimationFrame(() => {
      const idx = data.items.length;
      const el = document.querySelector(`[data-opening-stock-row="${idx}"] select`);
      if (el) el.focus();
    });
  };

  const removeRow = (index) => {
    const next = data.items.filter((_, i) => i !== index);
    setData('items', next.length ? next : [newRow(defaultUnitId)]);
    clearErrors('items');
  };

  const updateRow = (index, key, value) => {
    const next = data.items.map((row, i) => (i === index ? { ...row, [key]: value } : row));
    setData('items', next);
  };

  const handleBackClick = () => {
    setEditingId(null);
    setMode('view');
    router.get(buildLocalizedRoute('admin.inventory.opening-stock.index', localization), {}, { preserveScroll: true });
  };

  const handleCreateClick = () => {
    setMode('create');
    setEditingId(null);
    setLocalError('');
    setLocalSuccess('');
    reset();
    setData('date', defaultDate || new Date().toISOString().slice(0, 10));
    setData('reference_id', referenceId || 1);
    setData('reference_no', referenceNo || padOp(referenceId || 1));
    setData('warehouse_id', defaultWarehouseId);
    setData('notes', '');
    setData('items', [newRow(defaultUnitId)]);
    requestAnimationFrame(() => {
      if (barcodeInputRef.current) barcodeInputRef.current.focus();
    });
  };

  const handleEditClick = (stockMovementId) => {
    router.get(
      buildLocalizedRoute('admin.inventory.opening-stock.index', localization),
      { edit: stockMovementId },
      { preserveScroll: true },
    );
  };

  const handleDelete = (stockMovementId) => {
    if (!window.confirm('Are you sure you want to delete this opening stock voucher?')) return;
    setLocalSuccess('');
    setLocalError('');
    setSubmitting(true);
    try {
      router.post(
        buildLocalizedRoute('admin.inventory.opening-stock.destroy', localization, { opening_stock: stockMovementId }),
        { _method: 'delete' },
        {
          preserveScroll: true,
          onError: (errs) => {
            setError(errs || {});
            const allMessages = Object.values(errs || {})
              .flatMap((v) => (Array.isArray(v) ? v : [v]))
              .filter(Boolean)
              .map((v) => String(v).trim())
              .filter(Boolean);
            setLocalError(allMessages.length ? allMessages.join(' | ') : 'تعذر الحذف، تحقق من البيانات وحاول مرة أخرى.');
          },
          onFinish: () => {
            setSubmitting(false);
          },
        },
      );
    } catch {
      setSubmitting(false);
      setLocalError('تعذر تنفيذ الحذف بسبب خطأ في بناء الرابط.');
    }
  };

  const canSubmit = useMemo(() => {
    if (!data.date) return false;
    if (!data.warehouse_id) return false;
    const items = data.items || [];
    if (items.length === 0) return false;
    const hasAny = items.some((r) => r.product_id && r.unit_id && toNumber(r.quantity) > 0);
    if (!hasAny) return false;
    const ids = items.map((r) => String(r.product_id || '')).filter(Boolean);
    if (ids.length !== new Set(ids).size) return false;
    return true;
  }, [data.date, data.warehouse_id, data.items]);

  useEffect(() => {
    if (flash?.success) {
      setMode('view');
    }
  }, [flash?.success]);

  useEffect(() => {
    if (!editingMovement?.id) return;
    setEditingId(editingMovement.id);
    setMode('edit');
    setData('date', editingMovement.movement_date || defaultDate || new Date().toISOString().slice(0, 10));
    setData('reference_id', editingMovement.reference_id || referenceId || 1);
    setData('reference_no', editingMovement.voucher_num || padOp(editingMovement.reference_id || referenceId || 1));
    setData('warehouse_id', editingMovement.warehouse_id ? String(editingMovement.warehouse_id) : defaultWarehouseId);
    setData('notes', editingMovement.notes || '');
    setData(
      'items',
      (editingMovement.details || []).length
        ? (editingMovement.details || []).map((d) => ({
            product_id: d.product_id ? String(d.product_id) : '',
            unit_id: d.unit_id ? String(d.unit_id) : '',
            quantity: d.quantity != null ? String(d.quantity) : '',
            cost_base: '',
            cost_price: d.cost_price != null ? String(d.cost_price) : '',
          }))
        : [newRow(defaultUnitId)],
    );
    requestAnimationFrame(() => {
      focusRow(0);
    });
  }, [editingMovement, defaultDate, defaultUnitId, defaultWarehouseId, referenceId, setData]);

  const submit = (e) => {
    e.preventDefault();
    setLocalSuccess('');
    setLocalError('');

    if (!canSubmit) {
      setLocalError('تعذر الحفظ: تأكد من اختيار المخزن وإدخال صنف واحد على الأقل بكمية أكبر من صفر.');
      return;
    }

    const isEdit = mode === 'edit' && editingId;
    const payload = {
      ...(isEdit ? { _method: 'put' } : {}),
      date: data.date,
      warehouse_id: Number(data.warehouse_id),
      notes: data.notes,
      items: (data.items || [])
        .filter((r) => r.product_id && r.unit_id && toNumber(r.quantity) > 0)
        .map((r) => ({
          product_id: Number(r.product_id),
          unit_id: Number(r.unit_id),
          quantity: Number(r.quantity),
          cost_price: Number(r.cost_price || 0),
        })),
    };

    const targetRoute =
      isEdit
        ? buildLocalizedRoute('admin.inventory.opening-stock.update', localization, { opening_stock: editingId })
        : buildLocalizedRoute('admin.inventory.opening-stock.store', localization);

    setSubmitting(true);
    try {
      router.post(targetRoute, payload, {
        preserveScroll: true,
        onSuccess: (page) => {
          const flashError = page?.props?.flash?.error ? String(page.props.flash.error) : '';
          if (flashError) {
            setLocalError(flashError);
            return;
          }
          setMode('view');
          setEditingId(null);
          reset();
          setData('date', defaultDate || new Date().toISOString().slice(0, 10));
          setData('reference_id', referenceId || 1);
          setData('reference_no', referenceNo || padOp(referenceId || 1));
          setData('warehouse_id', defaultWarehouseId);
          setData('notes', '');
          setData('items', [newRow(defaultUnitId)]);
          setBarcode('');
        },
        onError: (errs) => {
          setError(errs || {});
          const allMessages = Object.values(errs || {})
            .flatMap((v) => (Array.isArray(v) ? v : [v]))
            .filter(Boolean)
            .map((v) => String(v).trim())
            .filter(Boolean);
          const message = allMessages.length ? allMessages.join(' | ') : 'تعذر الحفظ، تحقق من البيانات وحاول مرة أخرى.';
          setLocalError(message);
        },
        onFinish: () => {
          setSubmitting(false);
        },
      });
    } catch {
      setSubmitting(false);
      setLocalError('تعذر تنفيذ الحفظ بسبب خطأ في بناء الرابط.');
    }
  };

  const importExcel = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!firstSheet) return;
    const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

    const byBarcode = new Map(
      (products || [])
        .filter((p) => p.barcode)
        .map((p) => [String(p.barcode).trim(), p]),
    );
    const byCode = new Map(
      (products || [])
        .filter((p) => p.product_code)
        .map((p) => [String(p.product_code).trim().toLowerCase(), p]),
    );
    const byName = new Map((products || []).map((p) => [String(p.name).trim().toLowerCase(), p]));
    const unitByName = new Map((units || []).map((u) => [String(u.name).trim().toLowerCase(), u]));

    const nextItems = [];

    for (const r of rows) {
      const barcodeVal = String(r.barcode || r.Barcode || r.BARCODE || '').trim();
      const codeVal = String(r.product_code || r.ProductCode || r.code || r.Code || '').trim();
      const nameVal = String(r.name || r.Product || r.product || r.ProductName || '').trim();
      const unitVal = String(r.unit || r.Unit || r.unit_name || '').trim();
      const qtyVal = r.quantity ?? r.qty ?? r.Qty ?? r.QUANTITY ?? '';
      const costVal = r.cost_price ?? r.cost ?? r.Cost ?? r.unit_cost ?? '';

      const product =
        (barcodeVal && byBarcode.get(barcodeVal)) ||
        (codeVal && byCode.get(codeVal.toLowerCase())) ||
        (nameVal && byName.get(nameVal.toLowerCase()));

      if (!product) continue;

      const unit =
        (unitVal && unitByName.get(unitVal.toLowerCase())) ||
        units?.[0] ||
        null;

      if (!unit) continue;

      const baseCost = product?.cost_per_item ?? '';
      const computedCost = computeCostPrice(baseCost, unit.id);
      const importedCost = toNumber(costVal) > 0 ? String(toNumber(costVal)) : '';

      nextItems.push({
        product_id: String(product.id),
        unit_id: String(unit.id),
        quantity: String(toNumber(qtyVal) || ''),
        cost_base: String(baseCost ?? ''),
        cost_price: importedCost || computedCost || '',
      });
    }

    const unique = [];
    const seen = new Set();
    for (const item of nextItems) {
      const pid = String(item.product_id || '');
      if (!pid || seen.has(pid)) continue;
      seen.add(pid);
      unique.push(item);
    }

    setData('items', unique.length ? unique : [newRow(defaultUnitId)]);
    clearErrors('items');
  };

  const handleImportClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleBarcodeSubmit = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const code = String(barcode || '').trim();
    if (!code) return;

    const match =
      (products || []).find((p) => String(p.barcode || '').trim() === code) ||
      (products || []).find((p) => String(p.sku || '').trim() === code) ||
      (products || []).find((p) => String(p.product_code || '').trim() === code);

    if (!match) return;

    const exists = selectedProductIds.includes(String(match.id));
    if (exists) {
      setBarcode('');
      return;
    }

    const next = [...data.items];
    const emptyIndex = next.findIndex((r) => !r.product_id);
    const idx = emptyIndex >= 0 ? emptyIndex : next.length;
    if (emptyIndex < 0) {
      next.push(newRow(defaultUnitId));
    }
    const unitId = next[idx].unit_id || (units?.[0] ? String(units[0].id) : '');
    const baseCost = match?.cost_per_item ?? '';
    next[idx] = {
      ...next[idx],
      product_id: String(match.id),
      unit_id: unitId,
      cost_base: String(baseCost ?? ''),
      cost_price: computeCostPrice(baseCost, unitId) || next[idx].cost_price || '',
    };
    setData('items', next);
    setBarcode('');
    requestAnimationFrame(() => {
      const qtyEl = document.querySelector(`[data-opening-stock-row="${idx}"] input[name="qty"]`);
      if (qtyEl) qtyEl.focus();
    });
  };

  return (
    <AdminLayout activeMenu="Inventory">
      <Head title="Opening Stock - ZodicERP" />

      <div className="warehouses-container">
        <div className="page-header">
          <h1>{mode === 'view' ? 'Opening Stock' : mode === 'edit' ? 'Edit Opening Stock' : 'New Opening Stock'}</h1>
          {mode !== 'view' && (
            <button className="btn btn-secondary" onClick={handleBackClick} disabled={busy}>
              <span className="material-icons-outlined">arrow_back</span>
              Back to List
            </button>
          )}
        </div>

        {localSuccess && <div className="alert alert-success">{localSuccess}</div>}
        {localError && <div className="alert alert-danger">{localError}</div>}

        {mode === 'view' && (
          <ViewSection
            lines={openingStockLines || []}
            onCreate={handleCreateClick}
            onEdit={handleEditClick}
            onDelete={handleDelete}
          />
        )}

        {mode !== 'view' && (
          <FormSection
            mode={mode}
            data={data}
            setData={setData}
            products={products}
            units={units}
            warehouses={warehouses}
            processing={busy}
            errors={errors}
            onBack={handleBackClick}
            onSubmit={submit}
            fileInputRef={fileInputRef}
            barcodeInputRef={barcodeInputRef}
            barcode={barcode}
            setBarcode={setBarcode}
            onBarcodeSubmit={handleBarcodeSubmit}
            onImportClick={handleImportClick}
            onImportFileChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              importExcel(file);
              e.target.value = '';
            }}
            addRow={addRow}
            removeRow={removeRow}
            updateRow={updateRow}
          />
        )}
      </div>
    </AdminLayout>
  );
};

export default OpeningStock;
