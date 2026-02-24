import React, { useState } from 'react';
import { Head, Link, usePage, router, useForm } from '@inertiajs/react';
import '../../../../css/homepage/main.scss';
import Header from '../Components/Header';
import Footer from '../Components/Footer';
import { useCurrency } from '../../../Hooks/useCurrency';

const menuItems = [
  { key: 'overview', label: 'Overview', icon: 'fas fa-home' },
  { key: 'orders', label: 'Orders', icon: 'fas fa-shopping-cart' },
  { key: 'reviews', label: 'Reviews', icon: 'fas fa-star' },
  { key: 'downloads', label: 'Downloads', icon: 'fas fa-download' },
  { key: 'returns', label: 'Order Return Requests', icon: 'fas fa-undo-alt' },
  { key: 'addresses', label: 'Addresses', icon: 'fas fa-map-marker-alt' },
  { key: 'account', label: 'Account Settings', icon: 'fas fa-cog' },
  { key: 'logout', label: 'Logout', icon: 'fas fa-sign-out-alt' },
];

export default function Dashboard({ categories = [], addresses = [], orders = [], countries = [], cities = [] }) {
  const { auth } = usePage().props;
  const { localization } = useCurrency();

  const getLocalizedRoute = (name, params = {}) => {
    return route(name, {
      country: localization?.country_code || 'sa',
      lang: localization?.current_locale || 'ar',
      ...params
    });
  };

  const user = auth.customer || auth.user;
  const displayName = user?.name || user?.email || 'Customer';
  const [activeTab, setActiveTab] = useState('overview');

  const { data, setData, post, put, delete: destroy, processing, errors, reset } = useForm({
    address_name: '',
    address_type: 'billing',
    country_id: '',
    city_id: '',
    district: '',
    street: '',
    building_number: '',
    postal_code: '',
    phone: '',
    mobile: '',
    email: '',
    is_default: false,
    is_default_billing: false,
    is_default_shipping: false,
    notes: '',
  });

  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);

  const handleLogout = () => {
    router.post(getLocalizedRoute('customer.logout'));
  };

  const openAddressForm = (address = null) => {
    if (address) {
      setEditingAddress(address);
      setData({
        address_name: address.address_name || '',
        address_type: address.address_type || 'billing',
        country_id: address.country_id || '',
        city_id: address.city_id || '',
        district: address.district || '',
        street: address.street || '',
        building_number: address.building_number || '',
        postal_code: address.postal_code || '',
        phone: address.phone || '',
        mobile: address.mobile || '',
        email: address.email || '',
        is_default: !!address.is_default,
        is_default_billing: !!address.is_default_billing,
        is_default_shipping: !!address.is_default_shipping,
        notes: address.notes || '',
      });
    } else {
      setEditingAddress(null);
      reset();
    }
    setIsAddingAddress(true);
  };

  const closeAddressForm = () => {
    setIsAddingAddress(false);
    setEditingAddress(null);
    reset();
  };

  const fillTestData = () => {
    setData({
      address_name: 'Home (Test)',
      address_type: 'home',
      country_id: countries[0]?.id || '',
      city_id: cities.find(c => !countries[0] || c.country_id == countries[0].id)?.id || '',
      district: 'Olaya',
      street: 'King Fahd Road',
      building_number: '1234',
      postal_code: '12211',
      mobile: '0501234567',
      is_default: true,
      notes: 'This is a test address for CUS-10001',
    });
  };

  const handleSaveAddress = (e) => {
    e.preventDefault();
    if (editingAddress) {
      put(getLocalizedRoute('customer.addresses.update', { address: editingAddress.id }), {
        onSuccess: () => closeAddressForm(),
      });
    } else {
      post(getLocalizedRoute('customer.addresses.store'), {
        onSuccess: () => closeAddressForm(),
      });
    }
  };

  const handleDeleteAddress = (id) => {
    if (confirm('Are you sure you want to delete this address?')) {
      destroy(getLocalizedRoute('customer.addresses.destroy', { address: id }));
    }
  };

  return (
    <div className="app-layout homepage-layout user-dashboard-page">
      <Head title="My Dashboard" />

      <Header categoriesData={categories} showAnnouncementBar={false} />

      <div className="product-details-container user-dashboard-container">
        <nav className="breadcrumb">
          <Link href="/">Home</Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">My Account</span>
        </nav>

        <div className="user-dashboard-layout">
          <aside className="user-dashboard-sidebar">
            <ul className="user-dashboard-nav">
              {menuItems.map((item) => {
                const isLogout = item.key === 'logout';
                const isActive = item.key === activeTab;
                const itemClassName = [
                  'user-dashboard-nav-item',
                  isActive ? 'is-active' : '',
                  isLogout ? 'logout' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                const content = (
                  <>
                    <div className="user-dashboard-nav-item-icon">
                      <i className={item.icon}></i>
                    </div>
                    <span className="user-dashboard-nav-item-label">{item.label}</span>
                  </>
                );

                return (
                  <li key={item.key}>
                    {isLogout ? (
                      <button type="button" className={itemClassName} onClick={handleLogout}>
                        {content}
                      </button>
                    ) : (
                      <button type="button" className={itemClassName} onClick={() => setActiveTab(item.key)}>
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </aside>

          <main className="user-dashboard-main">
            {activeTab === 'overview' && (
                <>
                    <section className="user-dashboard-welcome-card">
                      <div className="user-dashboard-welcome-header">
                        <div className="user-dashboard-avatar">
                          <span className="user-dashboard-avatar-initial">
                            {displayName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="user-dashboard-welcome-text">
                          <h1 className="user-dashboard-title">Welcome back, {displayName}!</h1>
                          <p className="user-dashboard-subtitle">
                            Manage your account, view orders, and update your preferences from your personal
                            dashboard.
                          </p>
                        </div>
                      </div>
                    </section>

                    <section className="user-dashboard-features">
                      <div className="user-dashboard-feature-card is-orders">
                        <div className="user-dashboard-feature-header">
                          <div className="user-dashboard-feature-icon">
                            <i className="fas fa-shopping-bag"></i>
                          </div>
                          <div>
                            <div className="user-dashboard-feature-title">View Orders</div>
                            <div className="user-dashboard-feature-description">
                              Track your recent orders and order history
                            </div>
                          </div>
                        </div>
                        <div className="user-dashboard-feature-footer">
                          <button type="button" className="user-dashboard-feature-button" onClick={() => setActiveTab('orders')}>
                            <span>View Orders</span>
                            <span>→</span>
                          </button>
                        </div>
                      </div>

                      <div className="user-dashboard-feature-card is-addresses">
                        <div className="user-dashboard-feature-header">
                          <div className="user-dashboard-feature-icon">
                            <i className="fas fa-map-marked-alt"></i>
                          </div>
                          <div>
                            <div className="user-dashboard-feature-title">Manage Addresses</div>
                            <div className="user-dashboard-feature-description">
                              Update your shipping and billing addresses
                            </div>
                          </div>
                        </div>
                        <div className="user-dashboard-feature-footer">
                          <button type="button" className="user-dashboard-feature-button" onClick={() => setActiveTab('addresses')}>
                            <span>Manage Addresses</span>
                            <span>→</span>
                          </button>
                        </div>
                      </div>

                      <div className="user-dashboard-feature-card is-account">
                        <div className="user-dashboard-feature-header">
                          <div className="user-dashboard-feature-icon">
                            <i className="fas fa-user-cog"></i>
                          </div>
                          <div>
                            <div className="user-dashboard-feature-title">Account Settings</div>
                            <div className="user-dashboard-feature-description">
                              Edit your profile and account details
                            </div>
                          </div>
                        </div>
                        <div className="user-dashboard-feature-footer">
                          <button type="button" className="user-dashboard-feature-button" onClick={() => setActiveTab('account')}>
                            <span>Edit Account</span>
                            <span>→</span>
                          </button>
                        </div>
                      </div>
                    </section>
                </>
            )}

            {activeTab === 'addresses' && (
                <div className="dashboard-content-section">
                    <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>My Addresses</h2>
                        {!isAddingAddress && (
                            <button 
                                className="btn-add-address" 
                                onClick={() => openAddressForm()}
                                style={{ padding: '8px 16px', background: '#0d6efd', color: '#fff', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                            >
                                + Add New Address
                            </button>
                        )}
                    </div>

                    {isAddingAddress ? (
                        <form onSubmit={handleSaveAddress} className="address-form" style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                                <button 
                                    type="button" 
                                    onClick={fillTestData}
                                    style={{ padding: '4px 12px', background: '#6f42c1', color: '#fff', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '12px' }}
                                >
                                    <i className="fas fa-magic" style={{ marginRight: '5px' }}></i>
                                    Fill Test Data (CUS-10001)
                                </button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Address Label</label>
                                    <input 
                                        type="text" 
                                        value={data.address_name} 
                                        onChange={(e) => setData('address_name', e.target.value)}
                                        required
                                        placeholder="e.g. Home, Office"
                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                                    />
                                    {errors.address_name && <div style={{ color: 'red', fontSize: '12px' }}>{errors.address_name}</div>}
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Address Type</label>
                                    <select 
                                        value={data.address_type} 
                                        onChange={(e) => setData('address_type', e.target.value)}
                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                                    >
                                        <option value="billing">Billing</option>
                                        <option value="shipping">Shipping</option>
                                        <option value="home">Home</option>
                                        <option value="work">Work</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Country</label>
                                    <select 
                                        value={data.country_id} 
                                        onChange={(e) => setData('country_id', e.target.value)}
                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                                    >
                                        <option value="">Select Country</option>
                                        {countries?.map(c => <option key={c.id} value={c.id}>{c.name_en || c.name}</option>)}
                                    </select>
                                    {errors.country_id && <div style={{ color: 'red', fontSize: '12px' }}>{errors.country_id}</div>}
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>City</label>
                                    <select 
                                        value={data.city_id} 
                                        onChange={(e) => setData('city_id', e.target.value)}
                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                                    >
                                        <option value="">Select City</option>
                                        {cities?.filter(c => !data.country_id || c.country_id == data.country_id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    {errors.city_id && <div style={{ color: 'red', fontSize: '12px' }}>{errors.city_id}</div>}
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>District</label>
                                    <input 
                                        type="text" 
                                        value={data.district} 
                                        onChange={(e) => setData('district', e.target.value)}
                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                                    />
                                    {errors.district && <div style={{ color: 'red', fontSize: '12px' }}>{errors.district}</div>}
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Street Address</label>
                                    <input 
                                        type="text" 
                                        value={data.street} 
                                        onChange={(e) => setData('street', e.target.value)}
                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                                    />
                                    {errors.street && <div style={{ color: 'red', fontSize: '12px' }}>{errors.street}</div>}
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Building Number</label>
                                    <input 
                                        type="text" 
                                        value={data.building_number} 
                                        onChange={(e) => setData('building_number', e.target.value)}
                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                                    />
                                    {errors.building_number && <div style={{ color: 'red', fontSize: '12px' }}>{errors.building_number}</div>}
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Postal Code</label>
                                    <input 
                                        type="text" 
                                        value={data.postal_code} 
                                        onChange={(e) => setData('postal_code', e.target.value)}
                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                                    />
                                    {errors.postal_code && <div style={{ color: 'red', fontSize: '12px' }}>{errors.postal_code}</div>}
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Mobile</label>
                                    <input 
                                        type="text" 
                                        value={data.mobile} 
                                        onChange={(e) => setData('mobile', e.target.value)}
                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                                    />
                                    {errors.mobile && <div style={{ color: 'red', fontSize: '12px' }}>{errors.mobile}</div>}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input 
                                        type="checkbox" 
                                        id="is_default"
                                        checked={data.is_default} 
                                        onChange={(e) => setData('is_default', e.target.checked)}
                                    />
                                    <label htmlFor="is_default" style={{ fontWeight: '500' }}>Set as default address</label>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button 
                                    type="submit" 
                                    disabled={processing}
                                    style={{ padding: '8px 20px', background: '#198754', color: '#fff', borderRadius: '4px', border: 'none', cursor: 'pointer', opacity: processing ? 0.7 : 1 }}
                                >
                                    {processing ? 'Saving...' : (editingAddress ? 'Update Address' : 'Save Address')}
                                </button>
                                <button 
                                    type="button" 
                                    onClick={closeAddressForm}
                                    style={{ padding: '8px 20px', background: '#6c757d', color: '#fff', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="addresses-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                            {addresses.map(addr => (
                                <div key={addr.id} className="address-card" style={{ border: '1px solid #dee2e6', borderRadius: '8px', padding: '20px', background: '#fff', position: 'relative' }}>
                                    {addr.is_default && (
                                        <span style={{ position: 'absolute', top: '10px', right: '10px', background: '#e7f1ff', color: '#0d6efd', fontSize: '10px', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>DEFAULT</span>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                        <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{addr.address_name}</span>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button 
                                                onClick={() => openAddressForm(addr)}
                                                style={{ background: 'none', border: 'none', color: '#0d6efd', cursor: 'pointer' }}
                                            >
                                                <i className="fas fa-edit"></i>
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteAddress(addr.id)}
                                                style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer' }}
                                            >
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <p style={{ margin: '0 0 5px 0', fontWeight: '500' }}>{addr.address_type.charAt(0).toUpperCase() + addr.address_type.slice(1)}</p>
                                    <p style={{ margin: '0 0 5px 0', color: '#6c757d' }}>{addr.street} {addr.building_number && `, Bldg ${addr.building_number}`}</p>
                                    <p style={{ margin: '0 0 5px 0', color: '#6c757d' }}>{addr.district && `${addr.district}, `}{addr.city?.name}</p>
                                    <p style={{ margin: '0', color: '#6c757d' }}>{addr.country?.name_en || addr.country?.name} {addr.postal_code && `- ${addr.postal_code}`}</p>
                                    <p style={{ margin: '10px 0 0 0', fontSize: '14px' }}><i className="fas fa-phone-alt" style={{ marginRight: '5px' }}></i> {addr.mobile || addr.phone}</p>
                                </div>
                            ))}
                            {addresses.length === 0 && (
                                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#6c757d', background: '#f8f9fa', borderRadius: '8px' }}>
                                    <i className="fas fa-map-marker-alt" style={{ fontSize: '32px', marginBottom: '15px', display: 'block', opacity: 0.5 }}></i>
                                    No addresses saved yet.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'orders' && (
                <div className="dashboard-content-section">
                    <div className="section-header" style={{ marginBottom: '20px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>My Orders / طلباتي</h2>
                    </div>

                    <div className="orders-table-container" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dee2e6', overflow: 'hidden' }}>
                        <table className="orders-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                                <tr>
                                    <th style={{ padding: '12px 15px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Order # / رقم الطلب</th>
                                    <th style={{ padding: '12px 15px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Date / التاريخ</th>
                                    <th style={{ padding: '12px 15px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Items / الأصناف</th>
                                    <th style={{ padding: '12px 15px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Total / الإجمالي</th>
                                    <th style={{ padding: '12px 15px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Status / الحالة</th>
                                    <th style={{ padding: '12px 15px', textAlign: 'center', fontSize: '14px', fontWeight: '600' }}>Action / إجراء</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map(order => (
                                    <tr key={order.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '12px 15px', fontSize: '14px' }}>#{order.number}</td>
                                        <td style={{ padding: '12px 15px', fontSize: '14px' }}>{order.date}</td>
                                        <td style={{ padding: '12px 15px', fontSize: '14px' }}>{order.items_count} items / أصناف</td>
                                        <td style={{ padding: '12px 15px', fontSize: '14px', fontWeight: '600' }}>{order.total} EGP / ج.م</td>
                                        <td style={{ padding: '12px 15px', fontSize: '14px' }}>
                                            <span className={`status-badge status-${order.status}`} style={{
                                                padding: '4px 10px',
                                                borderRadius: '20px',
                                                fontSize: '12px',
                                                fontWeight: '500',
                                                background: order.status === 'paid' ? '#d1e7dd' : (order.status === 'unpaid' ? '#fff3cd' : '#f8d7da'),
                                                color: order.status === 'paid' ? '#0f5132' : (order.status === 'unpaid' ? '#664d03' : '#842029')
                                            }}>
                                                {order.status === 'paid' ? 'Paid / مدفوع' : (order.status === 'unpaid' ? 'Unpaid / غير مدفوع' : order.status.toUpperCase())}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                                            <Link 
                                                href={getLocalizedRoute('checkout.success', { invoice: order.number })}
                                                className="btn-view-order"
                                                style={{ padding: '6px 12px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '12px', textDecoration: 'none', color: '#333' }}
                                            >
                                                View / عرض
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {orders.length === 0 && (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                                            <i className="fas fa-shopping-cart" style={{ fontSize: '32px', marginBottom: '15px', display: 'block', opacity: 0.5 }}></i>
                                            No orders found. / لا توجد طلبات.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}
