import { useState, useEffect, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import '../../../../css/backend/Location.css';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import AdminLayout from '../components/AdminLayout';

const Location = ({
  countries: initialCountries,
  cities: initialCities,
  areas: initialAreas,
}) => {
  // Admin layout state - Removed redundant state


  // State for locations
  const [locations, setLocations] = useState({
    countries: [],
    cities: [],
    areas: [],
  });

  // State for UI
  const [currentMode, setCurrentMode] = useState('country'); // 'country', 'city', or 'area'
  const [editingId, setEditingId] = useState(null);
  const [editingType, setEditingType] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [currentListView, setCurrentListView] = useState('countries');
  const [activeTab, setActiveTab] = useState('tree');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [allSelected, setAllSelected] = useState(false);
  const [mapType, setMapType] = useState('countries');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    currency: '',
    timezone: '',
    phoneCode: '',
    latitude: '',
    longitude: '',
    status: 'active',
    countryId: '',
    cityId: '',
  });

  // Admin layout functions - Removed

  // Initialize data from props
  useEffect(() => {
    setLocations({
      countries: initialCountries || [],
      cities: initialCities || [],
      areas: initialAreas || [],
    });
  }, [initialCountries, initialCities, initialAreas]);

  // Calculate stats
  const stats = useMemo(() => {
    const activeCount = [
      ...locations.countries.filter((c) => c.status === 'active'),
      ...locations.cities.filter((c) => c.status === 'active'),
      ...locations.areas.filter((a) => a.status === 'active'),
    ].length;

    return {
      totalCountries: locations.countries.length,
      totalCities: locations.cities.length,
      totalAreas: locations.areas.length,
      activeLocations: activeCount,
    };
  }, [locations]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      currency: '',
      timezone: '',
      phoneCode: '',
      latitude: '',
      longitude: '',
      status: 'active',
      countryId: '',
      cityId: '',
    });
  };

  // Open modal for adding country
  const addCountry = () => {
    setCurrentMode('country');
    resetForm();
    setEditingId(null);
    setEditingType(null);
    setShowModal(true);
  };

  // Open modal for adding city
  const addCity = () => {
    setCurrentMode('city');
    resetForm();
    setEditingId(null);
    setEditingType(null);
    setShowModal(true);
  };

  // Open modal for adding area
  const addArea = () => {
    setCurrentMode('area');
    resetForm();
    setEditingId(null);
    setEditingType(null);
    setShowModal(true);
  };

  // Handle save location
  const saveLocation = () => {
    if (!formData.name.trim()) {
      alert('Please enter a name');
      return;
    }

    if (currentMode === 'city' && !formData.countryId) {
      alert('Please select a country.');
      return;
    } else if (
      currentMode === 'area' &&
      (!formData.cityId || !formData.countryId)
    ) {
      alert('Please select both country and city.');
      return;
    }

    const locationData = {
      name: formData.name,
      code: formData.code,
      status: formData.status,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
    };

    // Add type-specific fields
    if (currentMode === 'country') {
      locationData.currency = formData.currency;
      locationData.timezone = formData.timezone;
      locationData.phone_code = formData.phoneCode;
    } else if (currentMode === 'city') {
      locationData.country_id = formData.countryId;
    } else if (currentMode === 'area') {
      locationData.city_id = formData.cityId;
      locationData.country_id = formData.countryId;
    }

    const endpoint = editingId
      ? `/admin/location/${currentMode === 'country' ? 'countries' : currentMode === 'city' ? 'cities' : 'areas'}/${editingId}`
      : `/admin/location/${currentMode === 'country' ? 'countries' : currentMode === 'city' ? 'cities' : 'areas'}`;

    const method = editingId ? 'put' : 'post';

    router[method](endpoint, locationData, {
      onSuccess: () => {
        setShowModal(false);
        resetForm();
        setEditingId(null);
        setEditingType(null);
      },
      onError: (errors) => {
        console.error('Save failed:', errors);
        alert('Failed to save location. Please check the form data.');
      },
    });
  };

  // Find location by ID and type
  const findLocation = (id, type) => {
    if (type === 'country') {
      return locations.countries.find((c) => c.id === id);
    } else if (type === 'city') {
      return locations.cities.find((c) => c.id === id);
    } else if (type === 'area') {
      return locations.areas.find((a) => a.id === id);
    }
    return null;
  };

  // Edit location
  const editLocation = (id, type) => {
    const location = findLocation(id, type);
    if (!location) return;

    setEditingId(id);
    setEditingType(type);
    setCurrentMode(type);

    setFormData({
      name: location.name,
      code: location.code || '',
      currency: location.currency || '',
      timezone: location.timezone || '',
      phoneCode: location.phone_code || '',
      latitude: location.latitude || '',
      longitude: location.longitude || '',
      status: location.status || 'active',
      countryId: location.country_id || location.countryId || '',
      cityId: location.city_id || location.cityId || '',
    });

    setShowModal(true);
  };

  // Delete location
  const deleteLocation = (id, type) => {
    setDeleteItem({ id, type });
    setShowDeleteModal(true);
  };

  // Confirm delete
  const confirmDelete = () => {
    if (!deleteItem) return;

    const { id, type } = deleteItem;
    const endpoint = `/admin/location/${type === 'country' ? 'countries' : type === 'city' ? 'cities' : 'areas'}/${id}`;

    router.delete(endpoint, {
      onSuccess: () => {
        setShowDeleteModal(false);
        setDeleteItem(null);
      },
      onError: (errors) => {
        console.error('Delete failed:', errors);
        alert('Failed to delete location.');
        setShowDeleteModal(false);
        setDeleteItem(null);
      },
    });
  };

  // Cancel delete
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteItem(null);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    resetForm();
    setEditingId(null);
    setEditingType(null);
  };

  // Switch tab
  const switchTab = (tabId) => {
    setActiveTab(tabId);
  };

  // Render tree view
  const renderTreeView = () => {
    if (locations.countries.length === 0) {
      return (
        <div className="empty-state">
          <span className="material-icons-outlined empty-state-icon">
            public
          </span>
          <div className="empty-state-title">No Countries Added</div>
          <div className="empty-state-description">
            Add your first country to get started
          </div>
          <button className="btn btn-primary" onClick={addCountry}>
            Add Country
          </button>
        </div>
      );
    }

    return (
      <div id="locationTree">
        {locations.countries.map((country) => {
          const countryCities = locations.cities.filter(
            (city) => city.country_id === country.id
          );
          return (
            <TreeViewItem
              key={country.id}
              type="country"
              item={country}
              childCount={countryCities.length}
              onEdit={editLocation}
              onDelete={deleteLocation}
              level={0}
            >
              {countryCities.map((city) => {
                const cityAreas = locations.areas.filter(
                  (area) => area.city_id === city.id
                );
                return (
                  <TreeViewItem
                    key={city.id}
                    type="city"
                    item={city}
                    childCount={cityAreas.length}
                    onEdit={editLocation}
                    onDelete={deleteLocation}
                    level={1}
                  >
                    {cityAreas.map((area) => (
                      <TreeViewItem
                        key={area.id}
                        type="area"
                        item={area}
                        childCount={0}
                        onEdit={editLocation}
                        onDelete={deleteLocation}
                        level={2}
                      />
                    ))}
                  </TreeViewItem>
                );
              })}
            </TreeViewItem>
          );
        })}
      </div>
    );
  };

  // Tree view item component
  const TreeViewItem = ({
    type,
    item,
    childCount,
    onEdit,
    onDelete,
    level,
    children,
  }) => {
    const [isExpanded, setIsExpanded] = useState(level === 0); // Expand top level by default

    const getIcon = () => {
      if (type === 'city') return 'location_city';
      if (type === 'area') return 'map';
      return 'public';
    };

    return (
      <div
        className={`tree-item ${childCount > 0 ? 'has-children' : ''}`}
        data-id={item.id}
        data-type={type}
      >
        {childCount > 0 ? (
          <span
            className={`tree-toggle ${isExpanded ? 'rotated' : ''}`}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <span className="material-icons-outlined">chevron_right</span>
          </span>
        ) : (
          <span className="tree-toggle" style={{ visibility: 'hidden' }}></span>
        )}
        <span className="material-icons-outlined tree-icon">{getIcon()}</span>
        <div className="tree-content">
          <div>
            <strong>{item.name}</strong>
            {item.code && <span className="tree-badge">{item.code}</span>}
            <span className={`status status-${item.status}`}>
              {item.status}
            </span>
            {childCount > 0 && (
              <span className="child-count">{childCount}</span>
            )}
          </div>
          <div className="tree-actions">
            <button
              className="icon-btn edit-tree-item"
              style={{ color: 'var(--info-color)' }}
              onClick={() => onEdit(item.id, type)}
            >
              <span className="material-icons-outlined">edit</span>
            </button>
            <button
              className="icon-btn delete-tree-item"
              style={{ color: 'var(--danger-color)' }}
              onClick={() => onDelete(item.id, type)}
            >
              <span className="material-icons-outlined">delete</span>
            </button>
          </div>
        </div>
        {childCount > 0 && isExpanded && (
          <div className={`tree-children ${isExpanded ? 'expanded' : ''}`}>
            {children}
          </div>
        )}
      </div>
    );
  };

  // Render list view
  const renderListView = () => {
    let items = [];
    if (currentListView === 'countries') {
      items = locations.countries;
    } else if (currentListView === 'cities') {
      items = locations.cities;
    } else if (currentListView === 'areas') {
      items = locations.areas;
    }

    // Apply search filter
    if (searchTerm) {
      items = items.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Calculate pagination
    const start = (currentPage - 1) * pageSize;
    const end = Math.min(start + pageSize, items.length);
    const paginatedItems = items.slice(start, end);

    if (paginatedItems.length === 0) {
      return (
        <tr>
          <td
            colSpan="8"
            style={{
              textAlign: 'center',
              padding: '40px',
              color: 'var(--gray-color)',
            }}
          >
            <span
              className="material-icons-outlined"
              style={{
                fontSize: '48px',
                marginBottom: '16px',
                display: 'block',
                color: '#cbd5e1',
              }}
            >
              info
            </span>
            No {currentListView} found
          </td>
        </tr>
      );
    }

    return paginatedItems.map((item) => {
      let parentName = '-';
      let typeText =
        currentListView.slice(0, -1).charAt(0).toUpperCase() +
        currentListView.slice(0, -1).slice(1);

      if (currentListView === 'cities') {
        parentName = item.country ? item.country.name : 'Unknown';
      } else if (currentListView === 'areas') {
        parentName = item.city ? item.city.name : 'Unknown';
      }

      const isSelected = selectedLocations.includes(item.id);

      return (
        <tr key={item.id}>
          <td>
            <input
              type="checkbox"
              className="location-checkbox"
              value={item.id}
              checked={isSelected}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedLocations((prev) => [...prev, item.id]);
                } else {
                  setSelectedLocations((prev) =>
                    prev.filter((id) => id !== item.id)
                  );
                }
              }}
            />
          </td>
          <td>{item.id}</td>
          <td>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div
                className={`flag flag-${item.code ? item.code.toLowerCase() : 'default'}`}
                style={{ marginRight: '8px' }}
              ></div>
              {item.name}
            </div>
          </td>
          <td>{typeText}</td>
          <td>{parentName}</td>
          <td>{item.code || '-'}</td>
          <td>
            <span className={`status status-${item.status}`}>
              {item.status}
            </span>
          </td>
          <td>
            <button
              className="icon-btn edit"
              onClick={() =>
                editLocation(item.id, currentListView.slice(0, -1))
              }
            >
              <span className="material-icons-outlined">edit</span>
            </button>
            <button
              className="icon-btn delete"
              onClick={() =>
                deleteLocation(item.id, currentListView.slice(0, -1))
              }
            >
              <span className="material-icons-outlined">delete</span>
            </button>
          </td>
        </tr>
      );
    });
  };

  // Update pagination info
  const updatePagination = () => {
    let total = 0;
    if (currentListView === 'countries') total = locations.countries.length;
    else if (currentListView === 'cities') total = locations.cities.length;
    else if (currentListView === 'areas') total = locations.areas.length;

    if (searchTerm) {
      if (currentListView === 'countries')
        total = locations.countries.filter((item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase())
        ).length;
      else if (currentListView === 'cities')
        total = locations.cities.filter((item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase())
        ).length;
      else if (currentListView === 'areas')
        total = locations.areas.filter((item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase())
        ).length;
    }

    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, total);

    return { total, start, end };
  };

  // Apply bulk action
  const applyBulkAction = (action) => {
    if (selectedLocations.length === 0) {
      alert('Please select at least one location.');
      return;
    }

    if (action === 'delete') {
      if (
        !window.confirm(
          `Are you sure you want to delete ${selectedLocations.length} selected location(s)?`
        )
      ) {
        return;
      }
      router.post(
        '/admin/location/bulk-delete',
        {
          type: currentListView,
          ids: selectedLocations,
        },
        {
          onSuccess: () => {
            setSelectedLocations([]);
            setAllSelected(false);
          },
          onError: (errors) => {
            console.error('Bulk delete failed:', errors);
            alert('Failed to delete selected locations.');
          },
        }
      );
    } else {
      const status = action === 'activate' ? 'active' : 'inactive';
      router.post(
        '/admin/location/bulk-status',
        {
          type: currentListView,
          ids: selectedLocations,
          status: status,
        },
        {
          onSuccess: () => {
            setSelectedLocations([]);
            setAllSelected(false);
          },
          onError: (errors) => {
            console.error('Bulk status update failed:', errors);
            alert('Failed to update status of selected locations.');
          },
        }
      );
    }
  };

  const paginationInfo = updatePagination();

  return (
    <AdminLayout activeMenu={'Location'}>

      <Head title="Location Management" />
      <div className="breadcrumb">
        <a href="/admin">Dashboard</a>
        <span>/</span>
        <a href="/admin/location">Location Management</a>
      </div>

      {/* Quick Stats */}
      <div className="stats-cards">
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            <span className="material-icons-outlined">public</span>
          </div>
          <div className="stat-content">
            <div className="stat-value" id="totalCountries">
              {stats.totalCountries}
            </div>
            <div className="stat-label">Countries</div>
          </div>
        </div>
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ backgroundColor: 'var(--success-color)' }}
          >
            <span className="material-icons-outlined">location_city</span>
          </div>
          <div className="stat-content">
            <div className="stat-value" id="totalCities">
              {stats.totalCities}
            </div>
            <div className="stat-label">Cities</div>
          </div>
        </div>
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ backgroundColor: 'var(--info-color)' }}
          >
            <span className="material-icons-outlined">map</span>
          </div>
          <div className="stat-content">
            <div className="stat-value" id="totalAreas">
              {stats.totalAreas}
            </div>
            <div className="stat-label">Areas</div>
          </div>
        </div>
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ backgroundColor: 'var(--warning-color)' }}
          >
            <span className="material-icons-outlined">check_circle</span>
          </div>
          <div className="stat-content">
            <div className="stat-value" id="activeLocations">
              {stats.activeLocations}
            </div>
            <div className="stat-label">Active Locations</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button className="btn btn-primary" onClick={addCountry}>
          <span className="material-icons-outlined">add</span>
          <span>Add Country</span>
        </button>
        <button className="btn btn-outline" onClick={addCity}>
          <span className="material-icons-outlined">location_city</span>
          <span>Add City</span>
        </button>
        <button className="btn btn-outline" onClick={addArea}>
          <span className="material-icons-outlined">map</span>
          <span>Add Area</span>
        </button>
        <button
          className="btn btn-outline"
          onClick={() => {
            // Refresh functionality
          }}
        >
          <span className="material-icons-outlined">refresh</span>
          <span>Refresh</span>
        </button>
        <button
          className="btn btn-outline"
          onClick={() => {
            // Export functionality
            const data = {
              countries: locations.countries,
              cities: locations.cities,
              areas: locations.areas,
            };

            const dataStr = JSON.stringify(data, null, 2);
            const dataUri =
              'data:application/json;charset=utf-8,' +
              encodeURIComponent(dataStr);

            const exportFileDefaultName = `locations_${new Date().toISOString().split('T')[0]}.json`;

            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
          }}
        >
          <span className="material-icons-outlined">download</span>
          <span>Export</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <div
          className={`tab ${activeTab === 'tree' ? 'active' : ''}`}
          data-tab="tree"
          onClick={() => switchTab('tree')}
        >
          Tree View
        </div>
        <div
          className={`tab ${activeTab === 'list' ? 'active' : ''}`}
          data-tab="list"
          onClick={() => switchTab('list')}
        >
          List View
        </div>
        <div
          className={`tab ${activeTab === 'map' ? 'active' : ''}`}
          data-tab="map"
          onClick={() => switchTab('map')}
        >
          Map View
        </div>
      </div>

      {/* Tree View Tab */}
      <div
        id="treeTab"
        className={`tab-content ${activeTab === 'tree' ? 'active' : ''}`}
      >
        <div className="tree-view">{renderTreeView()}</div>
      </div>

      {/* List View Tab */}
      <div
        id="listTab"
        className={`tab-content ${activeTab === 'list' ? 'active' : ''}`}
      >
        <div className="card fade-in">
          <div className="card-header">
            <div className="actions">
              <select
                className="btn btn-outline"
                id="bulkActions"
                onChange={(e) => {
                  if (e.target.value !== 'Bulk Actions') {
                    applyBulkAction(e.target.value);
                    e.target.value = 'Bulk Actions';
                  }
                }}
              >
                <option>Bulk Actions</option>
                <option value="activate">Activate Selected</option>
                <option value="deactivate">Deactivate Selected</option>
                <option value="delete">Delete Selected</option>
              </select>
              <div className="search-bar light">
                <input
                  type="text"
                  id="searchLocations"
                  placeholder="Search locations..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1); // Reset to first page when searching
                  }}
                />
                <select
                  className="btn btn-outline"
                  id="viewType"
                  value={currentListView}
                  onChange={(e) => {
                    setCurrentListView(e.target.value);
                    setCurrentPage(1); // Reset to first page when changing view
                    setSelectedLocations([]); // Clear selections
                    setAllSelected(false);
                  }}
                >
                  <option value="countries">Countries</option>
                  <option value="cities">Cities</option>
                  <option value="areas">Areas</option>
                </select>
              </div>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      id="selectAllList"
                      checked={allSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          let items = [];
                          if (currentListView === 'countries')
                            items = locations.countries;
                          else if (currentListView === 'cities')
                            items = locations.cities;
                          else if (currentListView === 'areas')
                            items = locations.areas;

                          if (searchTerm) {
                            items = items.filter((item) =>
                              item.name
                                .toLowerCase()
                                .includes(searchTerm.toLowerCase())
                            );
                          }

                          setSelectedLocations(items.map((item) => item.id));
                          setAllSelected(true);
                        } else {
                          setSelectedLocations([]);
                          setAllSelected(false);
                        }
                      }}
                    />
                  </th>
                  <th>ID</th>
                  <th>NAME</th>
                  <th>TYPE</th>
                  <th>PARENT</th>
                  <th>CODE</th>
                  <th>STATUS</th>
                  <th>OPERATIONS</th>
                </tr>
              </thead>
              <tbody id="locationTable">{renderListView()}</tbody>
            </table>
          </div>

          <div className="pagination">
            <div className="pagination-info">
              <select
                className="select-dropdown"
                id="rowsPerPage"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1); // Reset to first page when changing page size
                }}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
              <span>
                Show from <span id="pageStart">{paginationInfo.start}</span> to{' '}
                <span id="pageEnd">{paginationInfo.end}</span> in{' '}
                <span
                  style={{
                    backgroundColor: '#64748b',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: '600',
                  }}
                  id="totalRecords"
                >
                  {paginationInfo.total}
                </span>{' '}
                records
              </span>
            </div>
            <div className="pagination-controls">
              <button
                className="page-btn"
                onClick={() => {
                  if (currentPage > 1) setCurrentPage(currentPage - 1);
                }}
                disabled={currentPage === 1}
              >
                « Previous
              </button>

              {/* Page buttons would go here */}

              <button
                className="page-btn"
                onClick={() => {
                  const totalPages = Math.ceil(paginationInfo.total / pageSize);
                  if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                }}
                disabled={
                  currentPage >= Math.ceil(paginationInfo.total / pageSize)
                }
              >
                Next »
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Map View Tab */}
      <div
        id="mapTab"
        className={`tab-content ${activeTab === 'map' ? 'active' : ''}`}
      >
        <div className="card fade-in">
          <div className="card-header">
            <div className="actions">
              <select
                className="btn btn-outline"
                id="mapType"
                value={mapType}
                onChange={(e) => setMapType(e.target.value)}
              >
                <option value="countries">Countries</option>
                <option value="cities">Cities</option>
                <option value="areas">Areas</option>
              </select>
            </div>
          </div>
          <div
            style={{ height: '500px', borderRadius: '8px', overflow: 'hidden' }}
          >
            <MapComponent locations={locations} mapType={mapType} />
          </div>
        </div>
      </div>

      {/* Location Modal */}
      {showModal && (
        <div className="modal-overlay active" id="locationModal">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title" id="modalTitle">
                {editingId
                  ? `Edit ${editingType.charAt(0).toUpperCase() + editingType.slice(1)}`
                  : `Add ${currentMode.charAt(0).toUpperCase() + currentMode.slice(1)}`}
              </h3>
              <button
                className="modal-close"
                id="modalClose"
                onClick={closeModal}
              >
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            <div className="modal-body">
              <form id="locationForm">
                <div className="form-group">
                  <label className="form-label" htmlFor="parentType">
                    Parent Type
                  </label>
                  <select
                    className="form-select"
                    id="parentType"
                    disabled
                    value={currentMode}
                  >
                    <option value="country">Country</option>
                    <option value="city">City</option>
                    <option value="area">Area</option>
                  </select>
                </div>

                {(currentMode === 'city' || currentMode === 'area') && (
                  <div className="form-group" id="countryField">
                    <label className="form-label" htmlFor="countrySelect">
                      Country *
                    </label>
                    <select
                      className="form-select"
                      id="countrySelect"
                      name="countryId"
                      value={formData.countryId}
                      onChange={handleInputChange}
                      required={
                        currentMode === 'city' || currentMode === 'area'
                      }
                    >
                      <option value="">Select Country</option>
                      {locations.countries.map((country) => (
                        <option key={country.id} value={country.id}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {currentMode === 'area' && (
                  <div className="form-group" id="cityField">
                    <label className="form-label" htmlFor="citySelect">
                      City *
                    </label>
                    <select
                      className="form-select"
                      id="citySelect"
                      name="cityId"
                      value={formData.cityId}
                      onChange={handleInputChange}
                      required={currentMode === 'area'}
                    >
                      <option value="">Select City</option>
                      {locations.cities
                        .filter(
                          (city) =>
                            !formData.countryId ||
                            city.country_id === parseInt(formData.countryId)
                        )
                        .map((city) => (
                          <option key={city.id} value={city.id}>
                            {city.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="name">
                    Name *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="code">
                    Code
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="code"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="e.g., EG, US, CA"
                  />
                </div>

                {currentMode === 'country' && (
                  <>
                    <div className="form-group">
                      <label className="form-label" htmlFor="currency">
                        Currency
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="currency"
                        name="currency"
                        value={formData.currency}
                        onChange={handleInputChange}
                        placeholder="e.g., EGP, USD, EUR"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="timezone">
                        Timezone
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="timezone"
                        name="timezone"
                        value={formData.timezone}
                        onChange={handleInputChange}
                        placeholder="e.g., Africa/Cairo, America/New_York"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="phoneCode">
                        Phone Code
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="phoneCode"
                        name="phoneCode"
                        value={formData.phoneCode}
                        onChange={handleInputChange}
                        placeholder="e.g., +20, +1"
                      />
                    </div>
                  </>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="latitude">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      className="form-control"
                      id="latitude"
                      name="latitude"
                      value={formData.latitude}
                      onChange={handleInputChange}
                      placeholder="e.g., 30.0444"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="longitude">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      className="form-control"
                      id="longitude"
                      name="longitude"
                      value={formData.longitude}
                      onChange={handleInputChange}
                      placeholder="e.g., 31.2357"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="status">
                    Status
                  </label>
                  <select
                    className="form-select"
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </form>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={closeModal}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={saveLocation}
              >
                Save Location
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay active">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Confirm Delete</h3>
              <button className="modal-close" onClick={cancelDelete}>
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete this {deleteItem?.type}? This
                will also delete all child locations.
              </p>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={cancelDelete}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

// Map Component
const MapComponent = ({ locations, mapType }) => {
  const getMapData = () => {
    switch (mapType) {
      case 'countries':
        return locations.countries.filter(
          (country) => country.latitude && country.longitude
        );
      case 'cities':
        return locations.cities.filter(
          (city) => city.latitude && city.longitude
        );
      case 'areas':
        return locations.areas.filter(
          (area) => area.latitude && area.longitude
        );
      default:
        return [];
    }
  };

  const mapData = getMapData();

  // Default center (Egypt)
  const defaultCenter = [26.096306, 30.128669];
  const defaultZoom = 3;

  // Calculate center based on available data
  const getCenter = () => {
    if (mapData.length > 0) {
      const avgLat =
        mapData.reduce((sum, item) => sum + parseFloat(item.latitude), 0) /
        mapData.length;
      const avgLng =
        mapData.reduce((sum, item) => sum + parseFloat(item.longitude), 0) /
        mapData.length;
      return [avgLat, avgLng];
    }
    return defaultCenter;
  };

  const getZoom = () => {
    if (mapData.length === 1) return 8;
    if (mapData.length <= 3) return 5;
    return defaultZoom;
  };

  const getIcon = (type) => {
    const iconUrl =
      type === 'countries'
        ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png'
        : type === 'cities'
          ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png'
          : 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png';

    return L.icon({
      iconUrl: iconUrl,
      shadowUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
  };

  if (mapData.length === 0) {
    return (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          flexDirection: 'column',
        }}
      >
        <span
          className="material-icons-outlined"
          style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '16px' }}
        >
          location_off
        </span>
        <h3 style={{ color: 'var(--dark-color)', marginBottom: '8px' }}>
          No Locations with Coordinates
        </h3>
        <p style={{ color: 'var(--gray-color)', textAlign: 'center' }}>
          Add latitude and longitude coordinates to {mapType} to see them on the
          map.
        </p>
      </div>
    );
  }

  return (
    <MapContainer
      center={getCenter()}
      zoom={getZoom()}
      style={{ height: '100%', width: '100%', minHeight: '400px' }}
      scrollWheelZoom={true}
      whenReady={() => {
        // Force map to invalidate size after render
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
        }, 100);
      }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {mapData.map((item) => (
        <Marker
          key={`${mapType}-${item.id}`}
          position={[parseFloat(item.latitude), parseFloat(item.longitude)]}
          icon={getIcon(mapType)}
        >
          <Popup>
            <div
              style={{ minWidth: '200px', fontFamily: 'Segoe UI, sans-serif' }}
            >
              <h4
                style={{
                  margin: '0 0 8px 0',
                  color: 'var(--dark-color)',
                  fontSize: '1.1rem',
                }}
              >
                {item.name}
              </h4>
              {item.code && (
                <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>
                  <strong>Code:</strong> {item.code}
                </p>
              )}
              {mapType === 'countries' && item.currency && (
                <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>
                  <strong>Currency:</strong> {item.currency}
                </p>
              )}
              {mapType === 'countries' && item.phone_code && (
                <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>
                  <strong>Phone:</strong> {item.phone_code}
                </p>
              )}
              <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>
                <strong>Status:</strong>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    backgroundColor:
                      item.status === 'active' ? '#10b981' : '#ef4444',
                    color: 'white',
                    marginLeft: '8px',
                  }}
                >
                  {item.status}
                </span>
              </p>
              <p
                style={{
                  margin: '4px 0',
                  fontSize: '0.8rem',
                  color: 'var(--gray-color)',
                }}
              >
                Lat: {parseFloat(item.latitude).toFixed(4)}, Lng:{' '}
                {parseFloat(item.longitude).toFixed(4)}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default Location;
