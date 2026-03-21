import React, { useEffect, useMemo, useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/main.scss';

const buildLocalizedRoute = (name, localization, params = {}) =>
  route(name, {
    country: localization?.country_code || 'sa',
    lang: localization?.current_locale || 'ar',
    ...params,
  });

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
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

const newRow = (defaultUnitId = '') => ({
  product_id: '',
  unit_id: defaultUnitId ? String(defaultUnitId) : '',
  quantity: '',
});

const ViewSection = ({ transfers, onCreate, onDelete, localization }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransfers = useMemo(() => {
    const term = String(searchTerm || '').trim().toLowerCase();
    if (!term) return transfers;
    return (transfers || []).filter((row) => {
      const haystack = [
        row.voucher_num,
        row.movement_date,
        row.from_warehouse_name,
        row.to_warehouse_name,
        row.notes,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [transfers, searchTerm]);

  return (
    <div className="stock-transfers-page">
      <div className="stock-transfers-card">
        <div className="stock-transfers-toolbar">
          <div className="stock-transfers-search">
             <input
              type="text"
              className="form-control"
              placeholder="بحث في التحويلات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={onCreate}>
            إضافة تحويل مخزني
          </button>
        </div>

        <div className="stock-transfers-table-wrap">
          <table className="stock-transfers-table">
            <thead>
              <tr>
                <th>رقم السند</th>
                <th>التاريخ</th>
                <th>من مخزن</th>
                <th>إلى مخزن</th>
                <th>الكمية الإجمالية</th>
                <th>ملاحظات</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {(filteredTransfers || []).map((row) => (
                <tr key={row.id}>
                  <td>{row.voucher_num}</td>
                  <td>{row.movement_date}</td>
                  <td>{row.from_warehouse_name}</td>
                  <td>{row.to_warehouse_name}</td>
                  <td>{row.total_quantity}</td>
                  <td>{row.notes}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="icon-btn danger" onClick={() => onDelete(row.id)}>
                        <span className="material-icons-outlined">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!filteredTransfers || filteredTransfers.length === 0) && (
                <tr>
                  <td colSpan="7" className="text-center p-4">لا توجد تحويلات مخزنية.</td>
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
  data,
  setData,
  products,
  units,
  warehouses,
  processing,
  errors,
  onBack,
  onSubmit,
  addRow,
  removeRow,
  updateRow,
}) => {
  const canSubmit = useMemo(() => {
    if (!data.date) return false;
    if (!data.from_warehouse_id) return false;
    if (!data.to_warehouse_id) return false;
    if (data.from_warehouse_id === data.to_warehouse_id) return false;
    const items = data.items || [];
    if (items.length === 0) return false;
    return items.every((r) => r.product_id && r.unit_id && toNumber(r.quantity) > 0);
  }, [data]);

  return (
    <div className="stock-transfers-page">
      <div className="stock-transfers-card">
        <h3 className="mb-4">إضافة تحويل مخزني جديد</h3>
        {Object.keys(errors).length > 0 && !errors.items && (
          <div className="alert alert-danger mb-4">
            يرجى تصحيح الأخطاء أدناه والمحاولة مرة أخرى.
          </div>
        )}
        <form onSubmit={onSubmit}>
          <div className="stock-transfers-header-grid">
            <div className="form-group">
              <label>التاريخ <span className="text-danger">*</span></label>
              <input
                type="date"
                className="form-control"
                value={data.date}
                onChange={(e) => setData('date', e.target.value)}
                required
              />
              {errors.date && <div className="field-error">{errors.date}</div>}
            </div>

            <div className="form-group">
              <label>من مخزن <span className="text-danger">*</span></label>
              <select
                className="form-control"
                value={data.from_warehouse_id}
                onChange={(e) => setData('from_warehouse_id', e.target.value)}
                required
              >
                <option value="">اختر المخزن</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              {errors.from_warehouse_id && <div className="field-error">{errors.from_warehouse_id}</div>}
            </div>

            <div className="form-group">
              <label>إلى مخزن <span className="text-danger">*</span></label>
              <select
                className="form-control"
                value={data.to_warehouse_id}
                onChange={(e) => setData('to_warehouse_id', e.target.value)}
                required
              >
                <option value="">اختر المخزن</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              {errors.to_warehouse_id && <div className="field-error">{errors.to_warehouse_id}</div>}
              {data.from_warehouse_id && data.to_warehouse_id && data.from_warehouse_id === data.to_warehouse_id && (
                <div className="field-error">لا يمكن التحويل لنفس المخزن.</div>
              )}
            </div>
          </div>

          <div className="form-group mb-4">
            <label>ملاحظات</label>
            <textarea
              className="form-control"
              value={data.notes}
              onChange={(e) => setData('notes', e.target.value)}
              rows="2"
            />
          </div>

          <div className="mb-3 d-flex justify-content-between align-items-center">
            <h5>الأصناف المحولة</h5>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addRow}>
              إضافة صنف
            </button>
          </div>
          {errors.items && <div className="alert alert-danger p-2 mb-3">{errors.items}</div>}

          <div className="stock-transfers-table-wrap mb-4">
            <table className="stock-transfers-table">
              <thead>
                <tr>
                  <th>الصنف</th>
                  <th>الوحدة</th>
                  <th>الكمية</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <select
                        className={`form-control ${errors[`items.${index}.product_id`] ? 'is-invalid' : ''}`}
                        value={item.product_id}
                        onChange={(e) => updateRow(index, 'product_id', e.target.value)}
                        required
                      >
                        <option value="">اختر الصنف</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name} ({p.product_code})</option>
                        ))}
                      </select>
                      {errors[`items.${index}.product_id`] && (
                        <div className="field-error">{errors[`items.${index}.product_id`]}</div>
                      )}
                    </td>
                    <td>
                      <select
                        className={`form-control ${errors[`items.${index}.unit_id`] ? 'is-invalid' : ''}`}
                        value={item.unit_id}
                        onChange={(e) => updateRow(index, 'unit_id', e.target.value)}
                        required
                      >
                        <option value="">الوحدة</option>
                        {units.map((u) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                      {errors[`items.${index}.unit_id`] && (
                        <div className="field-error">{errors[`items.${index}.unit_id`]}</div>
                      )}
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.001"
                        className={`form-control ${errors[`items.${index}.quantity`] ? 'is-invalid' : ''}`}
                        value={item.quantity}
                        onChange={(e) => updateRow(index, 'quantity', sanitizeDecimal(e.target.value))}
                        required
                      />
                      {errors[`items.${index}.quantity`] && (
                        <div className="field-error">{errors[`items.${index}.quantity`]}</div>
                      )}
                    </td>
                    <td>
                      <button type="button" className="icon-btn danger" onClick={() => removeRow(index)}>
                        <span className="material-icons-outlined">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={processing || !canSubmit}>
              {processing ? 'جاري الحفظ...' : 'حفظ التحويل'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onBack}>
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const StockTransfers = () => {
  const { products, units, warehouses, transfers, localization, defaultDate } = usePage().props;
  const [mode, setMode] = useState('view');

  const defaultUnitId = units?.[0]?.id ? String(units[0].id) : '';

  const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
    date: defaultDate || new Date().toISOString().slice(0, 10),
    from_warehouse_id: '',
    to_warehouse_id: '',
    notes: '',
    items: [newRow(defaultUnitId)],
  });

  const handleAddRow = () => {
    setData('items', [...data.items, newRow(defaultUnitId)]);
  };

  const handleRemoveRow = (index) => {
    if (data.items.length > 1) {
      const newItems = [...data.items];
      newItems.splice(index, 1);
      setData('items', newItems);
    }
  };

  const handleUpdateRow = (index, field, value) => {
    const newItems = [...data.items];
    newItems[index][field] = value;
    setData('items', newItems);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    post(buildLocalizedRoute('admin.inventory.stock-transfers.store', localization), {
      onSuccess: () => {
        setMode('view');
        reset();
      },
    });
  };

  const handleDelete = (id) => {
    if (confirm('هل أنت متأكد من حذف هذا التحويل؟')) {
      router.delete(buildLocalizedRoute('admin.inventory.stock-transfers.destroy', localization, { 'stock-transfer': id }));
    }
  };

  return (
    <AdminLayout>
      <Head title="التحويلات المخزنية" />
      <div className="p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="mb-1">التحويلات المخزنية</h2>
            <p className="text-muted">إدارة تحويل الأصناف بين المستودعات</p>
          </div>
        </div>

        {mode === 'view' ? (
          <ViewSection
            transfers={transfers}
            onCreate={() => setMode('add')}
            onDelete={handleDelete}
            localization={localization}
          />
        ) : (
          <FormSection
            data={data}
            setData={setData}
            products={products}
            units={units}
            warehouses={warehouses}
            processing={processing}
            errors={errors}
            onBack={() => setMode('view')}
            onSubmit={handleSubmit}
            addRow={handleAddRow}
            removeRow={handleRemoveRow}
            updateRow={handleUpdateRow}
          />
        )}
      </div>
    </AdminLayout>
  );
};

export default StockTransfers;
