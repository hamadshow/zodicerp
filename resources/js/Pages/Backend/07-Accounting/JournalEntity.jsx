import React, { useEffect, useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import '../../../../css/backend/JournalEntity.scss';
import AdminLayout from '../components/AdminLayout';
import { apiService } from '../../../services/api';

export default function JournalEntity() {
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ column: '', direction: '' });

  const loadJournals = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.get('/journals', {
        search,
        sort_column: sort.column || undefined,
        sort_direction: sort.direction || undefined,
      });
      const data = Array.isArray(response.data) ? response.data : [];
      setJournals(data);
    } catch (e) {
      console.error('Failed to load journals', e);
      setError('Failed to load journal entries.');
      setJournals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    setSort((prev) => {
      if (prev.column === field) {
        if (prev.direction === 'asc') {
          return { column: field, direction: 'desc' };
        }
        if (prev.direction === 'desc') {
          return { column: '', direction: '' };
        }
      }
      return { column: field, direction: 'asc' };
    });
  };

  const sortedJournals = useMemo(() => {
    const data = [...journals];
    if (!sort.column || !sort.direction) {
      return data;
    }
    return data.sort((a, b) => {
      const direction = sort.direction === 'asc' ? 1 : -1;
      if (sort.column === 'total_amount') {
        const aNum = Number(a.total_amount || 0);
        const bNum = Number(b.total_amount || 0);
        if (aNum < bNum) return -1 * direction;
        if (aNum > bNum) return 1 * direction;
        return 0;
      }
      const aVal = a[sort.column] ?? '';
      const bVal = b[sort.column] ?? '';
      const aStr = aVal.toString().toLowerCase();
      const bStr = bVal.toString().toLowerCase();
      if (aStr < bStr) return -1 * direction;
      if (aStr > bStr) return 1 * direction;
      return 0;
    });
  }, [journals, sort]);

  useEffect(() => {
    loadJournals();
  }, []);

  const handleDelete = async (qaidCode) => {
    if (!qaidCode) return;
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this journal entry? This action cannot be undone.',
    );
    if (!confirmDelete) return;
    try {
      setLoading(true);
      setError('');
      await apiService.delete(`/journals/${encodeURIComponent(qaidCode)}`);
      await loadJournals();
    } catch (e) {
      console.error('Failed to delete journal entry', e);
      const message =
        e?.response?.data?.message || 'Failed to delete journal entry.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const navigateToCreate = () => {
    router.get('/admin/journals/create');
  };

  const navigateToEdit = (qaidCode) => {
    router.get(`/admin/journals/${encodeURIComponent(qaidCode)}/edit`);
  };

  const navigateToView = (qaidCode) => {
    router.get(`/admin/journals/${encodeURIComponent(qaidCode)}`);
  };

  return (
    <AdminLayout activeMenu="Journal Entries">
      <Head title="Journal Entries - ZodicERP" />
      <div className="journal-page">
        <div className="breadcrumb">
          <a href="#">Dashboard</a>
          <span>/</span>
          <a href="#">Accounting</a>
          <span>/</span>
          <span>Journal Entries</span>
        </div>

        <div className="journal-header">
          <div className="journal-header-left">
            <h1 className="journal-title">Journal Entries</h1>
            <p className="journal-subtitle">
              Review, create, and manage general ledger journal entries.
            </p>
          </div>
          <div className="journal-header-right">
            <button
              type="button"
              className="btn btn-primary"
              onClick={navigateToCreate}
            >
              <span className="material-icons-outlined">add</span>
              <span>New Journal Entry</span>
            </button>
          </div>
        </div>

        <div className="journal-toolbar">
          <div className="search-bar light">
            <input
              type="text"
              placeholder="Search by code, type, reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="button" onClick={loadJournals}>
              <span className="material-icons-outlined">search</span>
            </button>
          </div>
          <button
            type="button"
            className="btn btn-outline"
            onClick={loadJournals}
          >
            <span className="material-icons-outlined">refresh</span>
            <span>Refresh</span>
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="journal-table-card fade-in">
          <table className="journal-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('entry_code')}>
                  <span className="sortable-header">
                    <span>Journal Code</span>
                    <span className="sort-icons">
                      <span
                        className={
                          'sort-icon' +
                          (sort.column === 'entry_code' &&
                          sort.direction === 'asc'
                            ? ' active'
                            : '')
                        }
                      >
                        ▲
                      </span>
                      <span
                        className={
                          'sort-icon' +
                          (sort.column === 'entry_code' &&
                          sort.direction === 'desc'
                            ? ' active'
                            : '')
                        }
                      >
                        ▼
                      </span>
                    </span>
                  </span>
                </th>
                <th onClick={() => handleSort('entry_type')}>
                  <span className="sortable-header">
                    <span>Type</span>
                    <span className="sort-icons">
                      <span
                        className={
                          'sort-icon' +
                          (sort.column === 'entry_type' &&
                          sort.direction === 'asc'
                            ? ' active'
                            : '')
                        }
                      >
                        ▲
                      </span>
                      <span
                        className={
                          'sort-icon' +
                          (sort.column === 'entry_type' &&
                          sort.direction === 'desc'
                            ? ' active'
                            : '')
                        }
                      >
                        ▼
                      </span>
                    </span>
                  </span>
                </th>
                <th onClick={() => handleSort('description')}>
                  <span className="sortable-header">
                    <span>Details</span>
                    <span className="sort-icons">
                      <span
                        className={
                          'sort-icon' +
                          (sort.column === 'description' &&
                          sort.direction === 'asc'
                            ? ' active'
                            : '')
                        }
                      >
                        ▲
                      </span>
                      <span
                        className={
                          'sort-icon' +
                          (sort.column === 'description' &&
                          sort.direction === 'desc'
                            ? ' active'
                            : '')
                        }
                      >
                        ▼
                      </span>
                    </span>
                  </span>
                </th>
                <th onClick={() => handleSort('date')}>
                  <span className="sortable-header">
                    <span>Date</span>
                    <span className="sort-icons">
                      <span
                        className={
                          'sort-icon' +
                          (sort.column === 'date' &&
                          sort.direction === 'asc'
                            ? ' active'
                            : '')
                        }
                      >
                        ▲
                      </span>
                      <span
                        className={
                          'sort-icon' +
                          (sort.column === 'date' &&
                          sort.direction === 'desc'
                            ? ' active'
                            : '')
                        }
                      >
                        ▼
                      </span>
                    </span>
                  </span>
                </th>
                <th onClick={() => handleSort('total_amount')}>
                  <span className="sortable-header">
                    <span>Total Amount</span>
                    <span className="sort-icons">
                      <span
                        className={
                          'sort-icon' +
                          (sort.column === 'total_amount' &&
                          sort.direction === 'asc'
                            ? ' active'
                            : '')
                        }
                      >
                        ▲
                      </span>
                      <span
                        className={
                          'sort-icon' +
                          (sort.column === 'total_amount' &&
                          sort.direction === 'desc'
                            ? ' active'
                            : '')
                        }
                      >
                        ▼
                      </span>
                    </span>
                  </span>
                </th>
                <th onClick={() => handleSort('status')}>
                  <span className="sortable-header">
                    <span>Status</span>
                    <span className="sort-icons">
                      <span
                        className={
                          'sort-icon' +
                          (sort.column === 'status' &&
                          sort.direction === 'asc'
                            ? ' active'
                            : '')
                        }
                      >
                        ▲
                      </span>
                      <span
                        className={
                          'sort-icon' +
                          (sort.column === 'status' &&
                          sort.direction === 'desc'
                            ? ' active'
                            : '')
                        }
                      >
                        ▼
                      </span>
                    </span>
                  </span>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="text-center">
                    Loading...
                  </td>
                </tr>
              )}
              {!loading && journals.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center">
                    No journal entries found.
                  </td>
                </tr>
              )}
              {!loading &&
                sortedJournals.map((journal) => (
                  <tr key={journal.id}>
                    <td>{journal.entry_code}</td>
                    <td>{journal.entry_type}</td>
                    <td>{journal.description}</td>
                    <td>
                      {journal.date
                        ? (() => {
                            const d = new Date(journal.date);
                            const day = String(d.getDate()).padStart(2, '0');
                            const month = String(d.getMonth() + 1).padStart(2, '0');
                            const year = d.getFullYear();
                            return `${day}-${month}-${year}`;
                          })()
                        : ''}
                    </td>
                    <td>{Number(journal.total_amount || 0).toFixed(2)}</td>
                    <td>
                      <span
                        className={`journal-status-pill ${
                          journal.status === 'Post' ||
                          journal.status === 'Posted'
                            ? 'status-posted'
                            : 'status-unpost'
                        }`}
                      >
                        {journal.status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="icon-btn view"
                        onClick={() => navigateToView(journal.entry_code)}
                      >
                        <span className="material-icons-outlined">visibility</span>
                      </button>
                      <button
                        type="button"
                        className="icon-btn edit"
                        onClick={() => navigateToEdit(journal.entry_code)}
                      >
                        <span className="material-icons-outlined">edit</span>
                      </button>
                      <button
                        type="button"
                        className="icon-btn delete"
                        onClick={() => handleDelete(journal.entry_code)}
                      >
                        <span className="material-icons-outlined">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
