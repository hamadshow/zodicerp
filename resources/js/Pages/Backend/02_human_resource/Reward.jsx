import React, { useState, useMemo } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import BlankPage from '@/Components/BlankPage';
import Table from '../components/Table';
import '../../../../css/backend/main.scss';

const Reward = ({ rewards: propRewards, employees }) => {
    const { props } = usePage();
    const localization = props.localization;
    const translations = localization?.translations || {};

    const getLocalizedRoute = (name, params = {}) => {
        return route(name, {
            country: localization?.country_code || 'sa',
            lang: localization?.current_locale || 'ar',
            ...params
        });
    };

    const rewardsData = propRewards?.data || (Array.isArray(propRewards) ? propRewards : []);
    const employeesData = employees?.data || (Array.isArray(employees) ? employees : []);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [currentReward, setCurrentReward] = useState(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        employee_id: '',
        reward_type: '',
        reward_value: '',
        category: '',
        award_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        badge: '',
        reason: '',
        awarded_by: '',
        points: '',
        notes: '',
    });

    const getTranslation = (key, fallback) => {
        return translations[`reward.${key}`] || translations[`common.${key}`] || fallback;
    };

    const filteredRewards = useMemo(() => {
        if (!searchTerm) return rewardsData;
        const lowerTerm = searchTerm.toLowerCase();
        return rewardsData.filter(r => 
            (r.employee_name && r.employee_name.toLowerCase().includes(lowerTerm)) ||
            (r.reward_type && r.reward_type.toLowerCase().includes(lowerTerm)) ||
            (r.category && r.category.toLowerCase().includes(lowerTerm))
        );
    }, [rewardsData, searchTerm]);

    const stats = {
        total: rewardsData.length,
        delivered: rewardsData.filter(r => r.status === 'delivered').length,
        totalPoints: rewardsData.reduce((acc, r) => acc + (parseInt(r.points) || 0), 0),
    };

    const openForm = (reward = null) => {
        clearErrors();
        if (reward) {
            setCurrentReward(reward);
            setData({
                employee_id: reward.employee_id || '',
                reward_type: reward.reward_type || '',
                reward_value: reward.reward_value || '',
                category: reward.category || '',
                award_date: reward.award_date || new Date().toISOString().split('T')[0],
                status: reward.status || 'pending',
                badge: reward.badge || '',
                reason: reward.reason || '',
                awarded_by: reward.awarded_by || '',
                points: reward.points || '',
                notes: reward.notes || '',
            });
        } else {
            setCurrentReward(null);
            reset();
        }
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setCurrentReward(null);
        reset();
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (currentReward) {
            put(getLocalizedRoute('admin.rewards.update', { reward: currentReward.id }), {
                onSuccess: () => closeForm(),
            });
        } else {
            post(getLocalizedRoute('admin.rewards.store'), {
                onSuccess: () => closeForm(),
            });
        }
    };

    const handleDelete = (id) => {
        if (window.confirm(translations['confirm.delete'] || translations['common.confirm_delete'] || 'Are you sure?')) {
            router.delete(getLocalizedRoute('admin.rewards.destroy', { reward: id }));
        }
    };

    const tableColumns = [
        { 
            header: 'ID', 
            key: 'id',
            sortable: true,
            render: (row) => row.id.toString().padStart(3, '0')
        },
        { 
            header: getTranslation('employee', 'EMPLOYEE'), 
            key: 'employee_name',
            sortable: true
        },
        { 
            header: getTranslation('type', 'TYPE'), 
            key: 'reward_type',
            sortable: true,
            render: (row) => (
                <span className="reward-type-tag">
                    {getTranslation(row.reward_type, row.reward_type)}
                </span>
            )
        },
        { 
            header: getTranslation('value', 'VALUE'), 
            key: 'reward_value',
            render: (row) => row.reward_value ? `${row.reward_value}` : 'N/A'
        },
        { 
            header: getTranslation('points', 'POINTS'), 
            key: 'points',
            sortable: true
        },
        { 
            header: getTranslation('status', 'STATUS'), 
            key: 'status',
            render: (row) => (
                <span className={`reward-status status-${row.status}`}>
                    {getTranslation(row.status, row.status)}
                </span>
            )
        },
    ];

    const breadcrumbs = [
        { label: translations['sidebar.Dashboard'] || 'Dashboard', href: getLocalizedRoute('admin.dashboard') },
        { label: translations['sidebar.hr'] || 'Human Resource', onClick: (e) => { e.preventDefault(); closeForm(); } },
        { label: translations['sidebar.rewards'] || 'Rewards' }
    ];

    if (showForm) {
        breadcrumbs.push({ 
            label: currentReward ? getTranslation('edit_reward', 'Edit Reward') : getTranslation('add_reward', 'Add Reward') 
        });
    }

    const statsContent = !showForm && (
        <div className="stats-cards">
            <div className="stat-card">
                <div className="stat-icon" style={{ backgroundColor: 'var(--primary-color)' }}>
                    <span className="material-icons-outlined">emoji_events</span>
                </div>
                <div className="stat-content">
                    <div className="stat-value">{stats.total}</div>
                    <div className="stat-label">{getTranslation('total_rewards', 'Total Rewards')}</div>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon" style={{ backgroundColor: 'var(--success-color)' }}>
                    <span className="material-icons-outlined">check_circle</span>
                </div>
                <div className="stat-content">
                    <div className="stat-value">{stats.delivered}</div>
                    <div className="stat-label">{getTranslation('delivered_rewards', 'Delivered')}</div>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon" style={{ backgroundColor: 'var(--info-color)' }}>
                    <span className="material-icons-outlined">stars</span>
                </div>
                <div className="stat-content">
                    <div className="stat-value">{stats.totalPoints}</div>
                    <div className="stat-label">{getTranslation('total_points', 'Total Points')}</div>
                </div>
            </div>
        </div>
    );

    return (
        <AdminLayout activeMenu={translations['sidebar.rewards'] || 'Reward'}>
            <Head title={getTranslation('title', 'Rewards Management')} />
            
            <BlankPage breadcrumbs={breadcrumbs} stats={statsContent}>
                {!showForm ? (
                    <div className="fade-in">
                        <Table
                            showToolbar={true}
                            toolbarSearch={true}
                            toolbarSearchValue={searchTerm}
                            onToolbarSearch={setSearchTerm}
                            toolbarSearchPlaceholder={getTranslation('search_placeholder', 'Search rewards...')}
                            showAddButton={true}
                            addButtonText={getTranslation('add_reward', 'Add Reward')}
                            onAdd={() => openForm()}
                            showRefreshButton={true}
                            onRefresh={() => router.reload()}
                            tableData={filteredRewards}
                            columns={tableColumns}
                            onEdit={(row) => openForm(row)}
                            onDelete={(row) => handleDelete(row.id)}
                        />
                    </div>
                ) : (
                    /* Reward Form View */
                    <div className="fade-in">
                        <div className="card">
                            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <button className="btn btn-outline btn-sm" onClick={closeForm}>
                                        <span className="material-icons-outlined">arrow_back</span>
                                        <span>{translations['common.back'] || 'Back'}</span>
                                    </button>
                                    <h2 style={{ margin: 0 }}>{currentReward ? getTranslation('edit_reward', 'Edit Reward') : getTranslation('add_reward', 'Add New Reward')}</h2>
                                </div>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="card-body" style={{ padding: '30px' }}>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">{getTranslation('employee', 'Employee')} *</label>
                                            <select 
                                                className="form-control" 
                                                value={data.employee_id}
                                                onChange={e => setData('employee_id', e.target.value)}
                                                required
                                            >
                                                <option value="">{getTranslation('select_employee', 'Select Employee')}</option>
                                                {employeesData.map(emp => (
                                                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                                                ))}
                                            </select>
                                            {errors.employee_id && <div className="text-error">{errors.employee_id}</div>}
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">{getTranslation('reward_type', 'Reward Type')} *</label>
                                            <select 
                                                className="form-control" 
                                                value={data.reward_type}
                                                onChange={e => setData('reward_type', e.target.value)}
                                                required
                                            >
                                                <option value="">{getTranslation('select_type', 'Select Type')}</option>
                                                <option value="monetary">{getTranslation('monetary', 'Monetary Bonus')}</option>
                                                <option value="points">{getTranslation('points', 'Reward Points')}</option>
                                                <option value="badge">{getTranslation('badge', 'Achievement Badge')}</option>
                                                <option value="certificate">{getTranslation('certificate', 'Certificate')}</option>
                                                <option value="gift">{getTranslation('gift', 'Gift Card')}</option>
                                            </select>
                                            {errors.reward_type && <div className="text-error">{errors.reward_type}</div>}
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">{getTranslation('reward_value', 'Value')}</label>
                                            <input 
                                                type="number" 
                                                className="form-control" 
                                                value={data.reward_value}
                                                onChange={e => setData('reward_value', e.target.value)}
                                                placeholder="e.g. 1000"
                                            />
                                            {errors.reward_value && <div className="text-error">{errors.reward_value}</div>}
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">{getTranslation('points', 'Points')}</label>
                                            <input 
                                                type="number" 
                                                className="form-control" 
                                                value={data.points}
                                                onChange={e => setData('points', e.target.value)}
                                                placeholder="e.g. 50"
                                            />
                                            {errors.points && <div className="text-error">{errors.points}</div>}
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">{getTranslation('award_date', 'Award Date')} *</label>
                                            <input 
                                                type="date" 
                                                className="form-control" 
                                                value={data.award_date}
                                                onChange={e => setData('award_date', e.target.value)}
                                                required 
                                            />
                                            {errors.award_date && <div className="text-error">{errors.award_date}</div>}
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">{translations['common.status'] || 'Status'}</label>
                                            <select 
                                                className="form-control" 
                                                value={data.status}
                                                onChange={e => setData('status', e.target.value)}
                                            >
                                                <option value="pending">{getTranslation('pending', 'Pending')}</option>
                                                <option value="approved">{getTranslation('approved', 'Approved')}</option>
                                                <option value="delivered">{getTranslation('delivered', 'Delivered')}</option>
                                                <option value="cancelled">{getTranslation('cancelled', 'Cancelled')}</option>
                                            </select>
                                            {errors.status && <div className="text-error">{errors.status}</div>}
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">{getTranslation('reason', 'Reason for Reward')} *</label>
                                        <textarea 
                                            className="form-control form-textarea" 
                                            value={data.reason}
                                            onChange={e => setData('reason', e.target.value)}
                                            rows="3"
                                            required
                                        ></textarea>
                                        {errors.reason && <div className="text-error">{errors.reason}</div>}
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">{getTranslation('notes', 'Notes')}</label>
                                        <textarea 
                                            className="form-control form-textarea" 
                                            value={data.notes}
                                            onChange={e => setData('notes', e.target.value)}
                                            rows="2"
                                        ></textarea>
                                        {errors.notes && <div className="text-error">{errors.notes}</div>}
                                    </div>
                                </div>
                                <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', padding: '20px 30px', borderTop: '1px solid #eee' }}>
                                    <button type="button" className="btn btn-outline" onClick={closeForm}>{translations['common.cancel'] || 'Cancel'}</button>
                                    <button type="submit" className="btn btn-primary" disabled={processing}>
                                        {currentReward ? translations['common.update'] || 'Update Reward' : translations['common.save'] || 'Save Reward'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </BlankPage>
        </AdminLayout>
    );
};

export default Reward;
