import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/main.scss';

export default function FinancialReports({ activeReport }) {
  const { props } = usePage();
  const localization = props.localization || {};
  const translations = localization.translations || {};
  const currentLocale = localization.current_locale || route().params.lang || 'en';
  const routeParams = {
    country: localization.country_code || route().params.country || 'sa',
    lang: currentLocale,
  };
  const reportRoutes = {
    'chart-of-accounts': 'admin.financial-reports.coa',
    'general-ledger': 'admin.financial-reports.general-ledger',
    'trial-balance': 'admin.financial-reports.trial-balance',
    journal: 'admin.financial-reports.journal',
    'balance-sheet': 'admin.financial-reports.balance-sheet',
    'balance-sheet-comparison': 'admin.financial-reports.balance-sheet-comparison',
    'balance-sheet-detail': 'admin.financial-reports.balance-sheet-detail',
    'profit-loss': 'admin.financial-reports.profit-loss',
    'profit-loss-class': 'admin.financial-reports.profit-loss-class',
    'profit-loss-customer': 'admin.financial-reports.profit-loss-customer',
    'profit-loss-month': 'admin.financial-reports.profit-loss-month',
    'profit-loss-comparison': 'admin.financial-reports.profit-loss-comparison',
    'profit-loss-detail': 'admin.financial-reports.profit-loss-detail',
    'inventory-valuation-summary': 'admin.financial-reports.inventory-valuation-summary',
    'cash-flow': 'admin.financial-reports.cash-flow',
  };

  const localizedRoute = (name) => route(name, routeParams, false);

  const t = (key, fallback, replacements = {}) => {
    let message = translations[`FinancialReports.${key}`] || fallback;
    Object.keys(replacements).forEach(r => {
      message = message.replace(`:${r}`, replacements[r]);
    });
    return message;
  };

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [collapsedCategories, setCollapsedCategories] = useState({});

  useEffect(() => {
    let isMounted = true;

    const fetchReports = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await window.axios.get('/api/financial-reports', {
          withCredentials: true,
        });

        if (!isMounted) {
          return;
        }

        const data = Array.isArray(response.data) ? response.data : [];
        setReports(data);
      } catch {
        if (!isMounted) {
          return;
        }

        setError(t('error_loading', 'Unable to load financial reports. Please try again.'));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchReports();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeReportId = useMemo(() => {
    if (!activeReport) {
      return null;
    }

    const match = reports.find(
      (report) => report.report_key === activeReport,
    );

    return match ? match.id : null;
  }, [activeReport, reports]);

  const favoriteReports = useMemo(
    () => reports.filter((report) => report.is_favorite),
    [reports],
  );

  const categories = useMemo(() => {
    const grouped = new Map();

    reports.forEach((report) => {
      let categoryName = currentLocale === 'ar' && report.category_ar 
        ? report.category_ar 
        : report.category || 'Other';
      
      // Fallback: If current locale is Arabic and no Arabic category name in DB,
      // try to translate it using the English category name as a key
      if (currentLocale === 'ar' && (!report.category_ar)) {
        categoryName = t(report.category || 'Other', categoryName);
      }
      
      if (!grouped.has(categoryName)) {
        grouped.set(categoryName, []);
      }
      grouped.get(categoryName).push(report);
    });

    return Array.from(grouped.entries())
      .map(([name, items]) => ({
        name,
        reports: items
          .slice()
          .sort((a, b) => {
            const orderA = typeof a.sort_order === 'number' ? a.sort_order : 0;
            const orderB = typeof b.sort_order === 'number' ? b.sort_order : 0;

            if (orderA !== orderB) {
              return orderA - orderB;
            }

            const nameA = currentLocale === 'ar' && a.report_name_ar ? a.report_name_ar : (a.report_name || '');
            const nameB = currentLocale === 'ar' && b.report_name_ar ? b.report_name_ar : (b.report_name || '');

            return String(nameA).localeCompare(String(nameB));
          }),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [reports, currentLocale]);

  const toggleCategory = (categoryName) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  };

  const toggleFavorite = async (reportId) => {
    setReports((prev) =>
      prev.map((report) =>
        report.id === reportId
          ? { ...report, is_favorite: !report.is_favorite }
          : report,
      ),
    );

    setTogglingId(reportId);

    try {
      const response = await window.axios.post(
        '/api/reports/favorite',
        {
          report_id: reportId,
        },
        {
          withCredentials: true,
        },
      );

      const isFavorite =
        response?.data && typeof response.data.is_favorite === 'boolean'
          ? response.data.is_favorite
          : null;

      if (typeof isFavorite === 'boolean') {
        setReports((prev) =>
          prev.map((report) =>
            report.id === reportId
              ? { ...report, is_favorite: isFavorite }
              : report,
          ),
        );
      }
    } catch {
      setReports((prev) =>
        prev.map((report) =>
          report.id === reportId
            ? { ...report, is_favorite: !report.is_favorite }
            : report,
        ),
      );
    } finally {
      setTogglingId(null);
    }
  };

  const renderReportCard = (report) => {
    const isActive = activeReportId != null && report.id === activeReportId;
    
    // Fallback route generation if API fails to provide a full URL
    const getReportHref = () => {
      if (report.route && report.route.startsWith('http')) {
        try {
          const url = new URL(report.route);
          return `${url.pathname}${url.search}${url.hash}`;
        } catch {
          return report.route;
        }
      }

      if (report.route && report.route.startsWith('/')) {
        return report.route;
      }

      if (reportRoutes[report.report_key]) {
        try {
          return localizedRoute(reportRoutes[report.report_key]);
        } catch (e) {
          console.error('Ziggy route generation failed for:', report.report_key, e);
        }
      }
      
      if (report.route && report.route !== '#' && /^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(report.route)) {
        try {
          return localizedRoute(report.route);
        } catch (e) {
          console.error('Ziggy route generation failed for:', report.route, e);
        }
      }

      return '#';
    };

    const href = getReportHref();

    const handleCardClick = (e) => {
      // If the click was on the favorite toggle, don't navigate
      if (e.target.closest('.report-favorite-toggle')) {
        return;
      }
      
      e.preventDefault();
      if (href && href !== '#') {
        router.visit(href);
      }
    };

    return (
      <a
        key={report.id}
        href={href}
        onClick={handleCardClick}
        className={`report-card ${isActive ? 'report-card-active' : ''}`}
      >
        <div className="report-card-main">
          <div className="report-icon">
            <span className="material-icons-outlined">
              {report.icon || 'description'}
            </span>
          </div>
          <div className="report-content">
            <div className="report-heading">
              <span className="report-name">
                {currentLocale === 'ar' 
                  ? (report.report_name_ar || t(report.report_key, report.report_name || report.report_key))
                  : (report.report_name || report.report_key)}
              </span>
            </div>
            <p className="report-description">
              {currentLocale === 'ar' 
                ? (report.description_ar || t(report.report_key + '_desc', report.description || t('fallback_description', `Financial report in the ${report.category || 'General'} category.`, { category: report.category || 'General' })))
                : (report.description || t('fallback_description', `Financial report in the ${report.category || 'General'} category.`, { category: report.category || 'General' }))}
            </p>
          </div>
          <button
            type="button"
            className={`report-favorite-toggle ${
              report.is_favorite ? 'report-favorite-active' : ''
            } ${
              togglingId === report.id ? 'report-favorite-loading' : ''
            }`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              toggleFavorite(report.id);
            }}
            aria-label={
              report.is_favorite
                ? t('remove_from_favorites', 'Remove from favorite reports')
                : t('add_to_favorites', 'Add to favorite reports')
            }
          >
            <span className="material-icons-outlined">
              {report.is_favorite ? 'star' : 'star_border'}
            </span>
          </button>
        </div>
        <div className="report-card-footer">
          <span className="report-link-label">{t('open_report', 'Open report')}</span>
          <span className="material-icons-outlined">arrow_forward</span>
        </div>
      </a>
    );
  };

  return (
    <AdminLayout activeMenu="Financial Reports">
      <div className="FinancialReports-page">
        <Head title={`${t('financial_reports', 'Financial Reports')} - ZodicERP`} />

        <div className="breadcrumb">
          <a href="#">{t('dashboard', 'Dashboard')}</a>
          <span>/</span>
          <a href="#">{t('accounting', 'Accounting')}</a>
          <span>/</span>
          <span>{t('financial_reports', 'Financial Reports')}</span>
        </div>

        <div className="reports-header">
          <div>
            <h1 className="reports-title">{t('financial_reports', 'Financial Reports')}</h1>
            <p className="reports-subtitle">
              {t('central_hub_desc', 'Central hub for core financial statements, ledger controls, and aging reports.')}
            </p>
          </div>
        </div>

        <div className="reports-layout">
          {loading && (
            <div className="reports-status reports-status-loading">
              {t('loading_reports', 'Loading financial reports...')}
            </div>
          )}

          {!loading && error && (
            <div className="reports-status reports-status-error">
              {error}
            </div>
          )}

          {!loading && !error && favoriteReports.length > 0 && (
            <section className="report-category favorites-category">
              <div className="report-category-header">
                <h2 className="report-category-title">{t('favorite_reports', 'Favorite Reports')}</h2>
                <p className="report-category-description">
                  {t('quick_access_desc', 'Quick access to your starred financial reports.')}
                </p>
              </div>
              <div className="report-cards">
                {favoriteReports.map((report) => renderReportCard(report))}
              </div>
            </section>
          )}

          {!loading && !error && categories.length === 0 && (
            <div className="reports-status reports-status-empty">
              {t('no_reports_available', 'No financial reports are available.')}
            </div>
          )}

          {!loading &&
            !error &&
            categories.map((category) => (
              <section key={category.name} className="report-category">
                <button
                  type="button"
                  className="report-category-toggle"
                  onClick={() => toggleCategory(category.name)}
                >
                  <div className="report-category-header">
                    <h2 className="report-category-title">
                      {category.name}
                    </h2>
                    <p className="report-category-description">
                      {t('reports_in_category', 'Reports available in this category.')}
                    </p>
                  </div>
                  <span
                    className={`material-icons-outlined report-category-toggle-icon ${
                      collapsedCategories[category.name]
                        ? 'report-category-toggle-icon-collapsed'
                        : ''
                    }`}
                  >
                    {collapsedCategories[category.name]
                      ? 'expand_more'
                      : 'expand_less'}
                  </span>
                </button>

                {!collapsedCategories[category.name] && (
                  <div className="report-cards">
                    {category.reports.map((report) =>
                      renderReportCard(report),
                    )}
                  </div>
                )}
              </section>
            ))}
        </div>
      </div>
    </AdminLayout>
  );
}
