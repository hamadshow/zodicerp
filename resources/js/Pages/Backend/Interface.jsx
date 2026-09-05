import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Head, usePage, Link } from '@inertiajs/react';
import AdminLayout from './components/AdminLayout';
import { apiService } from '../../services/api';

/**
 * Interface Component
 * A modern ERP Welcome Interface that acts as a landing page after login.
 */
const Interface = () => {
    const { props } = usePage();
    const user = props?.auth?.user;
    const localization = props?.localization;
    
    // --- Helper Functions ---
    
    const getLocalizedRoute = useCallback((name, params = {}) => {
        // Assuming route() is available globally via Ziggy
        try {
            return route(name, {
                country: localization?.country_code || 'sa',
                lang: localization?.current_locale || 'ar',
                ...params
            }, false);
        } catch {
            return '#';
        }
    }, [localization]);

    // --- State ---
    const [currentTime, setCurrentTime] = useState(new Date());
    const [stats, setStats] = useState({
        totalEmployees: 0,
        presentToday: 0,
        pendingTasks: 0,
        newSales: 0,
        openTickets: 0
    });
    const [activities, setActivities] = useState([]);
    const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

    // --- Data: Quotes ---
    const quotes = useMemo(() => [
        "Success is the sum of small efforts repeated day in and day out.",
        "Efficiency is doing things right; effectiveness is doing the right things.",
        "The best way to predict the future is to create it.",
        "Quality is not an act, it is a habit.",
        "Innovation distinguishes between a leader and a follower."
    ], []);

    // --- Data: Quick Access Modules ---
    const modules = useMemo(() => [
        { name: 'Employees', icon: 'bi-people', color: 'primary', route: 'admin.employees.index' },
        { name: 'HR', icon: 'bi-person-badge', color: 'success', route: 'admin.hr.dashboard' },
        { name: 'Attendance', icon: 'bi-calendar-check', color: 'info', route: 'admin.attendance.index' },
        { name: 'Payroll', icon: 'bi-cash-stack', color: 'warning', route: 'admin.payroll-advance.index' },
        { name: 'Inventory', icon: 'bi-box-seam', color: 'danger', route: 'admin.inventory.products.index' },
        { name: 'Sales', icon: 'bi-cart-check', color: 'primary', route: 'admin.client-sales.invoices.index' },
        { name: 'Purchases', icon: 'bi-bag-plus', color: 'success', route: 'admin.purchases.invoices.index' },
        { name: 'Accounting', icon: 'bi-calculator', color: 'info', route: 'admin.chart-of-accounts' },
        { name: 'Reports', icon: 'bi-graph-up', color: 'warning', route: 'admin.financial-reports.index' }
    ], []);

    // --- Effects ---
    
    // 1. Digital Clock Update
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // 2. Quote Rotation
    useEffect(() => {
        const quoteTimer = setInterval(() => {
            setCurrentQuoteIndex(prev => (prev + 1) % quotes.length);
        }, 10000);
        return () => clearInterval(quoteTimer);
    }, [quotes.length]);

    // 3. Fetch Stats and Activities
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, activityRes] = await Promise.all([
                    apiService.get('/dashboard/stats'),
                    apiService.get('/dashboard/recent-activity', { limit: 5 })
                ]);
                
                const statsData = statsRes.data?.data?.summary || {};
                setStats({
                    totalEmployees: statsData.total_users || 0,
                    presentToday: statsData.present_today || 0,
                    pendingTasks: statsData.pending_tasks || 0,
                    newSales: statsData.total_orders || 0,
                    openTickets: statsData.open_tickets || 0
                });

                setActivities(activityRes.data?.data || []);
            } catch (error) {
                console.error("Failed to fetch interface data:", error);
            }
        };
        fetchData();
    }, []);

    // --- Formatting ---
    const formatTime = (date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const formatSeconds = (date) => {
        return date.getSeconds().toString().padStart(2, '0');
    };

    const formatDate = (date) => {
        return date.toLocaleDateString(undefined, { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    };

    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    // --- Sub-components (Internal) ---
    const StatCard = ({ icon, label, value, colorClass }) => (
        <div className="glass-card stat-card">
            <div className={`stat-icon bg-grad-${colorClass}`}>
                <i className={`bi ${icon}`}></i>
            </div>
            <div className="stat-info">
                <span className="stat-value">{value}</span>
                <span className="stat-label">{label}</span>
            </div>
        </div>
    );

    return (
        <AdminLayout activeMenu="interface">
            <Head title="Welcome to Zodic ERP" />
            
            <div className="welcome-interface">
                {/* 1. Welcome Header */}
                <header className="welcome-header">
                    <div className="greeting-content">
                        <h1>{getGreeting()}, {user?.name || 'User'}</h1>
                        <p className="sub-welcome">Welcome back to <strong>Zodic ERP</strong></p>
                        <p className="text-muted small">Role: {user?.role_name || 'Administrator'} | {formatDate(currentTime)}</p>
                    </div>
                    <div className="company-badge">
                        <div className="logo-placeholder">
                            {props?.company?.logo ? <img src={props.company.logo} alt="Logo" /> : "Z"}
                        </div>
                        <div className="company-info-text">
                            <div className="fw-bold">{props?.company?.name || 'Zodic ERP System'}</div>
                            <div className="small opacity-75">{props?.branch?.name || 'Main Branch'}</div>
                        </div>
                    </div>
                </header>

                {/* 2. Digital Clock Section */}
                <section className="clock-section">
                    <div className="glass-card clock-card">
                        <div className="time-display">
                            {formatTime(currentTime).replace(/\s[AP]M/, '')}
                            <span className="seconds">:{formatSeconds(currentTime)}</span>
                            <small className="ms-2" style={{fontSize: '1.5rem'}}>{currentTime.getHours() >= 12 ? 'PM' : 'AM'}</small>
                        </div>
                        <div className="date-display">
                            {formatDate(currentTime)}
                        </div>
                    </div>
                </section>

                {/* 4. Today's Summary */}
                <h2 className="section-title"><i className="bi bi-lightning-charge"></i> Today's Summary</h2>
                <div className="summary-grid">
                    <StatCard icon="bi-people" label="Total Employees" value={stats.totalEmployees} colorClass="primary" />
                    <StatCard icon="bi-person-check" label="Present Today" value={stats.presentToday} colorClass="success" />
                    <StatCard icon="bi-list-task" label="Pending Tasks" value={stats.pendingTasks} colorClass="warning" />
                    <StatCard icon="bi-graph-up-arrow" label="New Sales" value={stats.newSales} colorClass="info" />
                    <StatCard icon="bi-ticket-perforated" label="Open Tickets" value={stats.openTickets} colorClass="danger" />
                </div>

                {/* 3. Quick Access Grid */}
                <h2 className="section-title"><i className="bi bi-grid-3x3-gap"></i> Quick Access</h2>
                <div className="quick-access-grid">
                    {modules.map((mod, idx) => (
                        <Link 
                            key={idx} 
                            href={getLocalizedRoute(mod.route)} 
                            className="glass-card access-card"
                        >
                            <div className="icon-wrapper">
                                <i className={`bi ${mod.icon}`}></i>
                            </div>
                            <span>{mod.name}</span>
                        </Link>
                    ))}
                </div>

                <div className="content-row">
                    {/* 5. Recent Activities */}
                    <div className="glass-card">
                        <h2 className="section-title"><i className="bi bi-clock-history"></i> Recent Activities</h2>
                        <div className="scroll-panel">
                            {activities.length > 0 ? (
                                <div className="timeline">
                                    {activities.map((act, idx) => (
                                        <div key={idx} className="timeline-item">
                                            <span className="item-time">{act.time || 'Just now'}</span>
                                            <p className="item-desc">{act.action} - <small>{act.user}</small></p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted text-center py-4">No recent activities found.</p>
                            )}
                        </div>
                    </div>

                    {/* 7. Productivity Section */}
                    <div className="glass-card">
                        <h2 className="section-title"><i className="bi bi-check2-square"></i> Productivity & Tasks</h2>
                        <div className="scroll-panel">
                            <div className="task-item">
                                <div className="task-status bg-grad-success"></div>
                                <span className="task-text">Complete monthly payroll review</span>
                                <span className="task-date">Today</span>
                            </div>
                            <div className="task-item">
                                <div className="task-status bg-grad-warning"></div>
                                <span className="task-text">Inventory audit for Warehouse A</span>
                                <span className="task-date">Tomorrow</span>
                            </div>
                            <div className="task-item">
                                <div className="task-status bg-grad-info"></div>
                                <span className="task-text">New employee onboarding</span>
                                <span className="task-date">Jun 10</span>
                            </div>
                            <div className="task-item">
                                <div className="task-status bg-grad-danger"></div>
                                <span className="task-text">Tax filing deadline</span>
                                <span className="task-date">Jun 15</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 6. Company Information (Floating/Bottom) */}
                <div className="glass-card mb-4">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                        <div>
                            <h3 className="h6 mb-1 text-uppercase text-muted fw-bold">Fiscal Year</h3>
                            <p className="mb-0 fw-bold">2026-2027</p>
                        </div>
                        <div>
                            <h3 className="h6 mb-1 text-uppercase text-muted fw-bold">Branch</h3>
                            <p className="mb-0 fw-bold">{props?.branch?.name || 'Headquarters'}</p>
                        </div>
                        <div>
                            <h3 className="h6 mb-1 text-uppercase text-muted fw-bold">Last Login</h3>
                            <p className="mb-0 fw-bold">{user?.last_login_at || 'Today'}</p>
                        </div>
                    </div>
                </div>

                {/* 8. Motivational Footer */}
                <footer className="motivational-footer">
                    <p className="quote-text">{quotes[currentQuoteIndex]}</p>
                </footer>
            </div>
        </AdminLayout>
    );
};

export default Interface;
