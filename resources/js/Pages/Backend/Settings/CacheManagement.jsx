import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function CacheManagement({ logs }) {
    const [loading, setLoading] = useState({
        app: false,
        config: false,
        route: false,
        view: false,
        all: false
    });

    const clearCache = async (type, label) => {
        if (type === 'all' && !confirm('Are you sure you want to clear ALL system caches? This might temporarily slow down the site.')) {
            return;
        }

        setLoading(prev => ({ ...prev, [type]: true }));

        try {
            const res = await axios.post(`/api/cache/clear-${type}`);
            if (res.data.status === 'success') {
                toast.success(res.data.message);
                // Optionally reload to update logs, but Inertia doesn't auto-refresh non-Inertia requests
                // We can use router.reload() if we want to see the new log immediately
                import('@inertiajs/react').then(({ router }) => router.reload({ only: ['logs'] }));
            } else {
                toast.error(res.data.message || 'Error clearing cache');
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || `Failed to clear ${label}`);
        } finally {
            setLoading(prev => ({ ...prev, [type]: true })); // Keep it true for a bit or just false
            setLoading(prev => ({ ...prev, [type]: false }));
        }
    };

    const cacheActions = [
        { id: 'app', label: 'App Cache', description: 'Clear application data cache', icon: 'storage', color: 'blue' },
        { id: 'config', label: 'Config Cache', description: 'Clear compiled configuration files', icon: 'settings', color: 'blue' },
        { id: 'route', label: 'Route Cache', description: 'Clear registered route cache', icon: 'alt_route', color: 'blue' },
        { id: 'view', label: 'View Cache', description: 'Clear compiled blade templates', icon: 'visibility', color: 'blue' },
    ];

    return (
        <AdminLayout>
            <Head title="Cache Management" />
            <ToastContainer position="top-right" autoClose={3000} />

            <div className="cache-management">
                <div className="cache-management__header">
                    <h1>Cache Management</h1>
                    <p>Optimize your application performance by managing system caches.</p>
                </div>

                <div className="cache-management__grid">
                    {cacheActions.map((action) => (
                        <div key={action.id} className="cache-card">
                            <div className="cache-card__icon">
                                <span className="material-icons-outlined">{action.icon}</span>
                            </div>
                            <div className="cache-card__content">
                                <h3>{action.label}</h3>
                                <p>{action.description}</p>
                                <button 
                                    className={`btn btn-${action.color}`}
                                    onClick={() => clearCache(action.id, action.label)}
                                    disabled={loading[action.id] || loading.all}
                                >
                                    {loading[action.id] ? (
                                        <span className="spinner"></span>
                                    ) : (
                                        <>Clear {action.label}</>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="cache-management__all-cache">
                    <div className="all-cache-card">
                        <div className="all-cache-card__info">
                            <h3>Full System Cleanup</h3>
                            <p>This will clear app, config, route, and view caches at once. Recommended after major updates.</p>
                        </div>
                        <button 
                            className="btn btn-red"
                            onClick={() => clearCache('all', 'All Caches')}
                            disabled={loading.all || Object.values(loading).some(v => v)}
                        >
                            {loading.all ? (
                                <span className="spinner"></span>
                            ) : (
                                <>
                                    <span className="material-icons-outlined">delete_forever</span>
                                    Clear All System Caches
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="cache-management__logs">
                    <h2>Recent Cache Actions</h2>
                    <div className="logs-table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Action</th>
                                    <th>Status</th>
                                    <th>Message</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr key={log.id}>
                                        <td>{log.action}</td>
                                        <td>
                                            <span className={`status-badge ${log.status}`}>
                                                {log.status}
                                            </span>
                                        </td>
                                        <td>{log.message}</td>
                                        <td>{new Date(log.created_at).toLocaleString()}</td>
                                    </tr>
                                ))}
                                {logs.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="text-center">No logs found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
