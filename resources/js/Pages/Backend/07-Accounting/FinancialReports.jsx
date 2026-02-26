import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/main.scss';

export default function FinancialReports({ activeReport }) {
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

        setError('Unable to load financial reports. Please try again.');
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
      const key = report.category || 'Other';
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(report);
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

            return String(a.report_name || '').localeCompare(
              String(b.report_name || ''),
            );
          }),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [reports]);

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
    const href =
      report.route && typeof report.route === 'string' && report.route.length > 0
        ? report.route
        : '#';

    const isActive = activeReportId != null && report.id === activeReportId;

    return (
      <Link
        key={report.id}
        href={href}
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
                {report.report_name || report.report_key}
              </span>
            </div>
            <p className="report-description">
              Financial report in the {report.category || 'General'} category.
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
                ? 'Remove from favorite reports'
                : 'Add to favorite reports'
            }
          >
            <span className="material-icons-outlined">
              {report.is_favorite ? 'star' : 'star_border'}
            </span>
          </button>
        </div>
        <div className="report-card-footer">
          <span className="report-link-label">Open report</span>
          <span className="material-icons-outlined">arrow_forward</span>
        </div>
      </Link>
    );
  };

  return (
    <AdminLayout activeMenu="Financial Reports">
      <div className="FinancialReports-page">
        <Head title="Financial Reports - ZodicERP" />

        <div className="breadcrumb">
          <a href="#">Dashboard</a>
          <span>/</span>
          <a href="#">Accounting</a>
          <span>/</span>
          <span>Financial Reports</span>
        </div>

        <div className="reports-header">
          <div>
            <h1 className="reports-title">Financial Reports</h1>
            <p className="reports-subtitle">
              Central hub for core financial statements, ledger controls, and aging reports.
            </p>
          </div>
        </div>

        <div className="reports-layout">
          {loading && (
            <div className="reports-status reports-status-loading">
              Loading financial reports...
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
                <h2 className="report-category-title">Favorite Reports</h2>
                <p className="report-category-description">
                  Quick access to your starred financial reports.
                </p>
              </div>
              <div className="report-cards">
                {favoriteReports.map((report) => renderReportCard(report))}
              </div>
            </section>
          )}

          {!loading && !error && categories.length === 0 && (
            <div className="reports-status reports-status-empty">
              No financial reports are available.
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
                      Reports available in this category.
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
