import React, { useState, useEffect } from 'react';
import { Head, Link, usePage, router, useForm } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import Pagination from '../components/Pagination';
import SearchableComboBox from '../components/SearchableComboBox';
import axios from 'axios';
import '../../../../css/backend/main.scss';

export default function FlashSales({ flashSales, flashSale, selectedProducts, view = 'list' }) {
    const { props } = usePage();
    const localization = props.localization || {};
    
    const getLocalizedRoute = (name, params = {}) => {
        return route(name, {
            country: localization.country_code || 'sa',
            lang: localization.current_locale || 'ar',
            ...params
        });
    };

    // Form Handling
    const isEdit = view === 'edit';
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        end_date: '',
        status: 'published',
        products: [],
    });

    useEffect(() => {
        if (view === 'edit' && flashSale) {
            setData({
                name: flashSale.name || '',
                end_date: flashSale.end_date ? flashSale.end_date.substring(0, 16).replace(' ', 'T') : '',
                status: flashSale.status || 'published',
                products: selectedProducts || [],
            });
        } else if (view === 'create') {
            reset();
            setData({
                name: '',
                end_date: '',
                status: 'published',
                products: [],
            });
            clearErrors();
        }
    }, [view, flashSale, selectedProducts]);

    // Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [resetKey, setResetKey] = useState(0);

    // Search Effect
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchTerm.length > 1) {
                setIsSearching(true);
                try {
                    const url = getLocalizedRoute('admin.client-sales.flash-sales.search-products');
                    axios.get(url, { params: { query: searchTerm } })
                        .then(response => {
                            setSearchResults(response.data);
                            setIsSearching(false);
                        })
                        .catch(err => {
                            console.error(err);
                            setIsSearching(false);
                        });
                } catch (e) {
                    console.error("Route generation error", e);
                }
            } else {
                setSearchResults([]);
            }
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const handleAddProduct = (product) => {
        if (data.products.some(p => p.id === product.id)) {
            alert('Product already added');
            return;
        }
        const newProduct = {
            id: product.id,
            name: product.name,
            image: product.image,
            price: product.price || 0,
            quantity: 1,
        };
        setData('products', [...data.products, newProduct]);
        setSearchTerm('');
        setResetKey(prev => prev + 1);
    };

    const handleUpdateProduct = (index, field, value) => {
        const newProducts = [...data.products];
        newProducts[index][field] = value;
        setData('products', newProducts);
    };

    const handleRemoveProduct = (index) => {
        const newProducts = [...data.products];
        newProducts.splice(index, 1);
        setData('products', newProducts);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isEdit) {
            put(getLocalizedRoute('admin.client-sales.flash-sales.update', { flash_sale: flashSale.id }));
        } else {
            post(getLocalizedRoute('admin.client-sales.flash-sales.store'));
        }
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this flash sale?')) {
            router.delete(getLocalizedRoute('admin.client-sales.flash-sales.destroy', { flash_sale: id }));
        }
    };

    return (
        <AdminLayout>
            <Head title={view === 'list' ? "Flash Sales" : (isEdit ? "Edit Flash Sale" : "Create Flash Sale")} />
            
            {view === 'list' ? (
                <div className="flash-sales-page">
                    <div className="page-header d-flex justify-content-between align-items-center mb-4">
                        <h1 className="h3">Flash Sales</h1>
                        <Link 
                            href={getLocalizedRoute('admin.client-sales.flash-sales.create')} 
                            className="btn btn-primary"
                        >
                            <i className="material-icons">add</i> New Flash Sale
                        </Link>
                    </div>

                    <div className="card shadow-sm">
                        <div className="card-body">
                            <div className="table-responsive">
                                <table className="table table-hover">
                                    <thead className="thead-light">
                                        <tr>
                                            <th>ID</th>
                                            <th>Name</th>
                                            <th>End Date</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {flashSales.data && flashSales.data.length > 0 ? (
                                            flashSales.data.map(sale => (
                                                <tr key={sale.id}>
                                                    <td>{sale.id}</td>
                                                    <td>{sale.name}</td>
                                                    <td>{new Date(sale.end_date).toLocaleString()}</td>
                                                    <td>
                                                        <span className={`badge badge-${sale.status === 'published' ? 'success' : 'secondary'}`}>
                                                            {sale.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="btn-group">
                                                            <Link 
                                                                href={getLocalizedRoute('admin.client-sales.flash-sales.edit', { flash_sale: sale.id })}
                                                                className="btn btn-sm btn-info"
                                                                title="Edit"
                                                            >
                                                                <i className="material-icons" style={{fontSize: '16px'}}>edit</i>
                                                            </Link>
                                                            <button 
                                                                onClick={() => handleDelete(sale.id)}
                                                                className="btn btn-sm btn-danger"
                                                                title="Delete"
                                                            >
                                                                <i className="material-icons" style={{fontSize: '16px'}}>delete</i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="text-center py-4">No flash sales found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            
                            {flashSales.last_page > 1 && (
                                <div className="mt-4">
                                    <Pagination 
                                        currentPage={flashSales.current_page}
                                        totalPages={flashSales.last_page}
                                        totalRecords={flashSales.total}
                                        recordsPerPage={flashSales.per_page}
                                        onPageChange={(page) => router.visit(flashSales.path + '?page=' + page)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flash-sales-create-page">
                    <div className="page-header mb-4">
                        <h1 className="h3">{isEdit ? "Edit Flash Sale" : "Create New Flash Sale"}</h1>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="row">
                            <div className="col-md-8">
                                <div className="card shadow-sm mb-4">
                                    <div className="card-header bg-white">
                                        <h5 className="mb-0">Basic Information</h5>
                                    </div>
                                    <div className="card-body">
                                        <div className="form-group mb-3">
                                            <label htmlFor="name" className="form-label">Flash Sale Name</label>
                                            <input
                                                type="text"
                                                id="name"
                                                className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                                                value={data.name}
                                                onChange={e => setData('name', e.target.value)}
                                                placeholder="e.g. Summer Sale 2024"
                                            />
                                            {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                                        </div>

                                        <div className="row">
                                            <div className="col-md-6">
                                                <div className="form-group mb-3">
                                                    <label htmlFor="end_date" className="form-label">End Date & Time</label>
                                                    <input
                                                        type="datetime-local"
                                                        id="end_date"
                                                        className={`form-control ${errors.end_date ? 'is-invalid' : ''}`}
                                                        value={data.end_date}
                                                        onChange={e => setData('end_date', e.target.value)}
                                                    />
                                                    {errors.end_date && <div className="invalid-feedback">{errors.end_date}</div>}
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="form-group mb-3">
                                                    <label htmlFor="status" className="form-label">Status</label>
                                                    <select
                                                        id="status"
                                                        className={`form-control ${errors.status ? 'is-invalid' : ''}`}
                                                        value={data.status}
                                                        onChange={e => setData('status', e.target.value)}
                                                    >
                                                        <option value="published">Published</option>
                                                        <option value="draft">Draft</option>
                                                        <option value="archived">Archived</option>
                                                    </select>
                                                    {errors.status && <div className="invalid-feedback">{errors.status}</div>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="card shadow-sm">
                                    <div className="card-header bg-white d-flex justify-content-between align-items-center">
                                        <h5 className="mb-0">Products</h5>
                                    </div>
                                    <div className="card-body">
                                        <div className="mb-4 position-relative">
                                            <label className="form-label">Add Product</label>
                                            <SearchableComboBox
                                                key={resetKey}
                                                options={searchResults.map(p => ({
                                                    value: p.id,
                                                    label: p.name,
                                                    ...p
                                                }))}
                                                value=""
                                                onChange={(val) => {
                                                    const product = searchResults.find(p => p.id == val);
                                                    if (product) handleAddProduct(product);
                                                }}
                                                onSearch={setSearchTerm}
                                                disableFiltering={true}
                                                placeholder="Search for products..."
                                                renderOption={(opt) => (
                                                    <div className="d-flex align-items-center">
                                                         {opt.image ? (
                                                             <img 
                                                                 src={`/storage/${opt.image}`} 
                                                                 alt={opt.name} 
                                                                 className="rounded me-2" 
                                                                 style={{width: '40px', height: '40px', objectFit: 'cover'}} 
                                                                 onError={(e) => {e.target.style.display = 'none'}}
                                                             />
                                                         ) : (
                                                             <div className="bg-light rounded me-2 d-flex align-items-center justify-content-center" style={{width: '40px', height: '40px'}}>
                                                                 <i className="material-icons text-muted" style={{fontSize: '20px'}}>image</i>
                                                             </div>
                                                         )}
                                                         <div>
                                                             <div className="fw-bold">{opt.name}</div>
                                                             <div className="small text-muted">Price: {opt.price}</div>
                                                         </div>
                                                    </div>
                                                )}
                                            />
                                            {isSearching && <div className="text-muted small mt-1 position-absolute" style={{right: 0, top: 0}}>Searching...</div>}
                                        </div>

                                        {data.products.length > 0 ? (
                                            <div className="table-responsive">
                                                <table className="table table-bordered">
                                                    <thead className="thead-light">
                                                        <tr>
                                                            <th style={{width: '80px'}}>Image</th>
                                                            <th>Product Name</th>
                                                            <th style={{width: '150px'}}>Price</th>
                                                            <th style={{width: '120px'}}>Quantity</th>
                                                            <th style={{width: '80px'}}>Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {data.products.map((product, index) => (
                                                            <tr key={index}>
                                                                <td className="align-middle text-center">
                                                                    {product.image ? (
                                                                        <img 
                                                                            src={`/storage/${product.image}`} 
                                                                            alt={product.name} 
                                                                            className="rounded" 
                                                                            style={{width: '50px', height: '50px', objectFit: 'cover'}} 
                                                                            onError={(e) => {e.target.style.display = 'none'}}
                                                                        />
                                                                    ) : (
                                                                        <div className="bg-light rounded d-flex align-items-center justify-content-center mx-auto" style={{width: '50px', height: '50px'}}>
                                                                            <i className="material-icons text-muted">image</i>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="align-middle">
                                                                    {product.name}
                                                                    {errors[`products.${index}.id`] && <div className="text-danger small">{errors[`products.${index}.id`]}</div>}
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        type="number"
                                                                        className={`form-control form-control-sm ${errors[`products.${index}.price`] ? 'is-invalid' : ''}`}
                                                                        value={product.price}
                                                                        onChange={e => handleUpdateProduct(index, 'price', e.target.value)}
                                                                        min="0"
                                                                        step="0.01"
                                                                    />
                                                                    {errors[`products.${index}.price`] && <div className="invalid-feedback">{errors[`products.${index}.price`]}</div>}
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        type="number"
                                                                        className={`form-control form-control-sm ${errors[`products.${index}.quantity`] ? 'is-invalid' : ''}`}
                                                                        value={product.quantity}
                                                                        onChange={e => handleUpdateProduct(index, 'quantity', e.target.value)}
                                                                        min="1"
                                                                    />
                                                                    {errors[`products.${index}.quantity`] && <div className="invalid-feedback">{errors[`products.${index}.quantity`]}</div>}
                                                                </td>
                                                                <td className="text-center">
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-outline-danger"
                                                                        onClick={() => handleRemoveProduct(index)}
                                                                    >
                                                                        <i className="material-icons" style={{fontSize: '18px'}}>close</i>
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="text-center py-4 text-muted border rounded bg-light">
                                                No products added yet. Search and add products above.
                                                {errors.products && <div className="text-danger mt-2">{errors.products}</div>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="col-md-4">
                                <div className="card shadow-sm">
                                    <div className="card-body">
                                        <button
                                            type="submit"
                                            className="btn btn-primary w-100 mb-3"
                                            disabled={processing}
                                        >
                                            {processing ? 'Saving...' : (isEdit ? 'Update Flash Sale' : 'Create Flash Sale')}
                                        </button>
                                        <Link
                                            href={getLocalizedRoute('admin.client-sales.flash-sales.index')}
                                            className="btn btn-outline-secondary w-100"
                                        >
                                            Cancel
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            )}
        </AdminLayout>
    );
}