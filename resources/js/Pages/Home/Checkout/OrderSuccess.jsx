import React from 'react';
import { Head, Link } from '@inertiajs/react';
import Header from '../Components/Header';
import Footer from '../Components/Footer';
import { CheckCircle, Home, ShoppingBag } from 'lucide-react';
import '../../../../css/homepage/main.scss';
import { useCurrency } from '../../../Hooks/useCurrency';

export default function OrderSuccess({ order, categories = [] }) {
    const { localization } = useCurrency();

    const getLocalizedRoute = (name, params = {}) => {
        return route(name, {
            country: localization?.country_code || 'sa',
            lang: localization?.current_locale || 'ar',
            ...params
        });
    };

    console.log('OrderSuccess render, order:', order);

    if (!order) {
        return (
            <div className="app-layout homepage-layout">
                <Header categoriesData={categories} />
                <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}>
                    <h2>Order not found / الطلب غير موجود</h2>
                    <Link href={getLocalizedRoute('home')} className="btn btn-primary" style={{ marginTop: '20px' }}>
                        Return Home / العودة للرئيسية
                    </Link>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="app-layout homepage-layout">
            <Header categoriesData={categories} />
            <Head title="Order Successful | تم إتمام الطلب بنجاح" />
            
            <div className="order-success-page">
                <div className="container">
                    <div className="success-card">
                        <div className="success-header">
                            <div className="icon-wrapper">
                                <CheckCircle className="success-icon" />
                            </div>
                            <h1 className="success-title">
                                Thank You for Your Order!
                                <span className="arabic-text">شكراً لطلبكم!</span>
                            </h1>
                            <p className="success-subtitle">
                                Your order has been placed successfully and is being processed.
                                <span className="arabic-text">تم إرسال طلبكم بنجاح وجاري العمل على تجهيزه.</span>
                            </p>
                        </div>

                        <div className="order-info-section">
                            <div className="info-grid">
                                <div className="info-item">
                                    <span className="label">Order Number / رقم الطلب</span>
                                    <span className="value">#{order.number || 'N/A'}</span>
                                </div>
                                <div className="info-item">
                                    <span className="label">Date / التاريخ</span>
                                    <span className="value">{order.date || 'N/A'}</span>
                                </div>
                                <div className="info-item">
                                    <span className="label">Total / الإجمالي</span>
                                    <span className="value">{order.total || 0} EGP</span>
                                </div>
                                <div className="info-item">
                                    <span className="label">Email / البريد الإلكتروني</span>
                                    <span className="value">{order.email || 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="order-details-section">
                            <h3 className="section-title">
                                Order Summary / ملخص الطلب
                            </h3>
                            <div className="items-list">
                                {order.items && order.items.length > 0 ? (
                                    order.items.map((item, index) => (
                                        <div key={index} className="order-item">
                                            <div className="item-info">
                                                <span className="item-name">{item.name || 'Product'}</span>
                                                <span className="item-qty">Qty: {item.qty || 0}</span>
                                            </div>
                                            <div className="item-price">
                                                {item.total || 0} EGP
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="no-items">No items found / لا توجد عناصر</div>
                                )}
                            </div>
                        </div>

                        <div className="success-actions">
                            <Link href={getLocalizedRoute('home')} className="btn btn-primary">
                                <Home className="btn-icon" />
                                Return Home / العودة للرئيسية
                            </Link>
                            <Link href={getLocalizedRoute('products.index')} className="btn btn-outline">
                                <ShoppingBag className="btn-icon" />
                                Continue Shopping / متابعة التسوق
                            </Link>
                        </div>

                        <div className="support-notice">
                            <p>
                                If you have any questions, please contact our support.
                                <br />
                                <span className="arabic-text">إذا كان لديكم أي استفسار، يرجى التواصل مع الدعم الفني.</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}
