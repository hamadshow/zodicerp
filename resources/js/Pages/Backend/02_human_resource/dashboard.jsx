import React from 'react';
import { Head, usePage } from '@inertiajs/react';
import AdminLayout from '@/Pages/Backend/components/AdminLayout';
import '@/../css/backend/main.scss';

const HRDashboard = () => {
  const { props } = usePage();
  const localization = props.localization;
  const isArabic = localization?.current_locale === 'ar';

  const stats = [
    {
      title: isArabic ? 'إجمالي الموظفين' : 'Total Employees',
      value: '0',
      icon: 'people',
      color: '#4f46e5',
      link: '/admin/employees'
    },
    {
      title: isArabic ? 'الأقسام' : 'Departments',
      value: '0',
      icon: 'business',
      color: '#10b981',
      link: '/admin/departments'
    },
    {
      title: isArabic ? 'الوظائف' : 'Professions',
      value: '0',
      icon: 'work',
      color: '#f59e0b',
      link: '/admin/professions'
    },
    {
      title: isArabic ? 'طلبات التوظيف' : 'Job Applications',
      value: '0',
      icon: 'description',
      color: '#ef4444',
      link: '/admin/career-applications'
    }
  ];

  return (
    <AdminLayout>
      <Head title={isArabic ? 'لوحة تحكم الموارد البشرية' : 'HR Dashboard'} />
      
      <div className="dashboard-content">
        <div className="dashboard-header-custom">
          <h1 className="dashboard-title">
            {isArabic ? 'لوحة تحكم الموارد البشرية' : 'Human Resources Dashboard'}
          </h1>
          <p className="dashboard-subtitle">
            {isArabic ? 'نظرة عامة على حالة الموارد البشرية' : 'Overview of HR status and metrics'}
          </p>
        </div>

        <div className="stats-grid-custom">
          {stats.map((stat, index) => (
            <div key={index} className="stat-card-custom">
              <div className="stat-icon-wrapper" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
                <span className="material-icons-outlined">{stat.icon}</span>
              </div>
              <div className="stat-info">
                <h3 className="stat-value">{stat.value}</h3>
                <p className="stat-label">{stat.title}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="dashboard-sections-grid">
          <div className="dashboard-card-custom">
            <div className="card-header-custom">
              <h2 className="card-title">
                {isArabic ? 'الوصول السريع' : 'Quick Access'}
              </h2>
            </div>
            <div className="quick-links-grid">
              <a href="/admin/attendance" className="quick-link-item">
                <span className="material-icons-outlined">event_available</span>
                <span>{isArabic ? 'الحضور والانصراف' : 'Attendance'}</span>
              </a>
              <a href="/admin/payroll-advance" className="quick-link-item">
                <span className="material-icons-outlined">payments</span>
                <span>{isArabic ? 'السلف والرواتب' : 'Payroll Advance'}</span>
              </a>
              <a href="/admin/vacations" className="quick-link-item">
                <span className="material-icons-outlined">beach_access</span>
                <span>{isArabic ? 'الإجازات' : 'Vacations'}</span>
              </a>
              <a href="/admin/employees" className="quick-link-item">
                <span className="material-icons-outlined">person_add</span>
                <span>{isArabic ? 'إضافة موظف' : 'Add Employee'}</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .dashboard-content {
          padding: 24px;
        }
        .dashboard-header-custom {
          margin-bottom: 32px;
        }
        .dashboard-title {
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 8px;
        }
        .dashboard-subtitle {
          color: #64748b;
          font-size: 14px;
        }
        .stats-grid-custom {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }
        .stat-card-custom {
          background: white;
          padding: 24px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 20px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .stat-card-custom:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        .stat-icon-wrapper {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-icon-wrapper span {
          font-size: 32px;
        }
        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 4px;
        }
        .stat-label {
          color: #64748b;
          font-size: 14px;
          font-weight: 500;
        }
        .dashboard-card-custom {
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          padding: 24px;
        }
        .card-header-custom {
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #f1f5f9;
        }
        .card-title {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
        }
        .quick-links-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 16px;
        }
        .quick-link-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: #f8fafc;
          border-radius: 12px;
          text-decoration: none;
          color: #475569;
          transition: all 0.2s;
          border: 1px solid transparent;
        }
        .quick-link-item:hover {
          background: #f1f5f9;
          color: #4f46e5;
          border-color: #e2e8f0;
        }
        .quick-link-item span:first-child {
          font-size: 32px;
          margin-bottom: 12px;
        }
        .quick-link-item span:last-child {
          font-size: 14px;
          font-weight: 600;
        }
      `}} />
    </AdminLayout>
  );
};

export default HRDashboard;
