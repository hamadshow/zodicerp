import { useState, useEffect, useMemo, useRef } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/main.scss';
import * as XLSX from 'xlsx';

const Location = ({
  countries: initialCountries,
  cities: initialCities,
  areas: initialAreas,
}) => {
  const { props } = usePage();
  const localization = props?.localization;
  const getLocalizedRoute = (name, params = {}) => {
    return route(name, {
      country: localization?.country_code || 'sa',
      lang: localization?.current_locale || 'ar',
      ...params,
    });
  };

  // State for locations
  const [locations, setLocations] = useState({
    countries: [],
    cities: [],
    areas: [],
  });

  // State for UI
  const [currentMode, setCurrentMode] = useState('country'); // 'country', 'city', or 'area'
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [currentListView, setCurrentListView] = useState('countries');
  const [activeTab, setActiveTab] = useState('tree');
  const [viewMode, setViewMode] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [allSelected, setAllSelected] = useState(false);
  const [mapType, setMapType] = useState('cities');

  // Import/Export State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState('upload');
  const [importData, setImportData] = useState({ countries: [], cities: [], areas: [] });
  const [importStats, setImportStats] = useState({
    countries: { added: 0, updated: 0, skipped: 0, failed: 0 },
    cities: { added: 0, updated: 0, skipped: 0, failed: 0 },
    areas: { added: 0, updated: 0, skipped: 0, failed: 0 },
    errors: [],
    validationErrors: 0,
  });
  const [importOptions, setImportOptions] = useState({
    updateExisting: true,
    createMissingCountries: false,
    createMissingCities: false,
  });
  const [importProgress, setImportProgress] = useState(0);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    currency: '',
    timezone: '',
    phone_code: '',
    status: 'active',
    countryId: '',
    cityId: '',
  });

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

  const getEmptyImportStats = () => ({
    countries: { added: 0, updated: 0, skipped: 0, failed: 0 },
    cities: { added: 0, updated: 0, skipped: 0, failed: 0 },
    areas: { added: 0, updated: 0, skipped: 0, failed: 0 },
    errors: [],
    validationErrors: 0,
  });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const resetImportState = () => {
    setImportStep('upload');
    setImportData({ countries: [], cities: [], areas: [] });
    setImportStats(getEmptyImportStats());
    setImportProgress(0);
  };

  const openImportModal = () => {
    resetImportState();
    setShowImportModal(true);
  };

  const closeImportModal = (refresh = false) => {
    setShowImportModal(false);
    resetImportState();
    if (refresh) {
      router.reload({ only: ['countries', 'cities', 'areas'] });
    }
  };

  useEffect(() => {
    if (importStep !== 'processing') return;
    let progress = 10;
    setImportProgress(progress);
    const interval = setInterval(() => {
      progress = Math.min(progress + 10, 90);
      setImportProgress(progress);
    }, 400);
    return () => clearInterval(interval);
  }, [importStep]);

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
      phone_code: '',
      status: 'active',
      countryId: '',
      cityId: '',
    });
  };

  // Open modal for adding country
  const addCountry = () => {
    setShowImportModal(false);
    setViewMode('addForm');
    setCurrentMode('country');
    resetForm();
    setEditingId(null);
    setTimeout(() => {
      document.getElementById('locationEditor')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 0);
  };

  // Open modal for adding city
  const addCity = () => {
    setShowImportModal(false);
    setViewMode('addForm');
    setCurrentMode('city');
    resetForm();
    setEditingId(null);
    setTimeout(() => {
      document.getElementById('locationEditor')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 0);
  };

  // Open modal for adding area
  const addArea = () => {
    setShowImportModal(false);
    setViewMode('addForm');
    setCurrentMode('area');
    resetForm();
    setEditingId(null);
    setTimeout(() => {
      document.getElementById('locationEditor')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 0);
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
    };

    // Add type-specific fields
    if (currentMode === 'country') {
      locationData.currency = formData.currency || null;
      locationData.timezone = formData.timezone || null;
      locationData.phone_code = formData.phone_code || null;
    } else if (currentMode === 'city') {
      locationData.country_id = formData.countryId;
    } else if (currentMode === 'area') {
      locationData.city_id = formData.cityId;
      locationData.country_id = formData.countryId;
    }

    let endpoint = '';
    let method = editingId ? 'put' : 'post';

    if (currentMode === 'country') {
      endpoint = editingId
        ? getLocalizedRoute('admin.location.countries.update', {
            country: editingId,
          })
        : getLocalizedRoute('admin.location.countries.store');
    } else if (currentMode === 'city') {
      endpoint = editingId
        ? getLocalizedRoute('admin.location.cities.update', { city: editingId })
        : getLocalizedRoute('admin.location.cities.store');
    } else if (currentMode === 'area') {
      endpoint = editingId
        ? getLocalizedRoute('admin.location.areas.update', { area: editingId })
        : getLocalizedRoute('admin.location.areas.store');
    }

    router[method](endpoint, locationData, {
      onSuccess: () => {
        setViewMode('dashboard');
        resetForm();
        setEditingId(null);
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
    setShowImportModal(false);
    setViewMode('addForm');
    const location = findLocation(id, type);
    if (!location) return;

    setEditingId(id);
    setCurrentMode(type);

    setFormData({
      name: location.name,
      code: location.code || '',
      currency: location.currency || '',
      timezone: location.timezone || '',
      phone_code: location.phone_code || '',
      status: location.status || 'active',
      countryId: location.country_id || location.countryId || '',
      cityId: location.city_id || location.cityId || '',
    });

    setTimeout(() => {
      document.getElementById('locationEditor')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 0);
  };

  // Delete location
  const deleteLocation = (id, type) => {
    const label = type === 'country' ? 'country' : type === 'city' ? 'city' : 'area';
    if (!window.confirm(`Are you sure you want to delete this ${label}?`)) {
      return;
    }

    let endpoint = '';
    if (type === 'country') {
      endpoint = getLocalizedRoute('admin.location.countries.destroy', {
        country: id,
      });
    } else if (type === 'city') {
      endpoint = getLocalizedRoute('admin.location.cities.destroy', { city: id });
    } else if (type === 'area') {
      endpoint = getLocalizedRoute('admin.location.areas.destroy', { area: id });
    }

    router.delete(endpoint, {
      onSuccess: () => {
        showToast('Deleted successfully', 'success');
      },
      onError: (errors) => {
        console.error('Delete failed:', errors);
        showToast('Failed to delete location', 'error');
      },
    });
  };

  // Close modal
  const closeModal = () => {
    setViewMode('dashboard');
    resetForm();
    setEditingId(null);
  };

  // Switch tab
  const switchTab = (tabId) => {
    setActiveTab(tabId);
  };

  const resolveExportScope = () => {
    let countriesToExport = locations.countries;
    let citiesToExport = locations.cities;
    let areasToExport = locations.areas;

    if (selectedLocations.length > 0) {
      if (currentListView === 'countries') {
        countriesToExport = locations.countries.filter((c) =>
          selectedLocations.includes(c.id)
        );
        const countryIds = countriesToExport.map((c) => c.id);
        citiesToExport = locations.cities.filter((c) =>
          countryIds.includes(c.country_id)
        );
        const cityIds = citiesToExport.map((c) => c.id);
        areasToExport = locations.areas.filter((a) =>
          cityIds.includes(a.city_id)
        );
      } else if (currentListView === 'cities') {
        citiesToExport = locations.cities.filter((c) =>
          selectedLocations.includes(c.id)
        );
        const cityIds = citiesToExport.map((c) => c.id);
        areasToExport = locations.areas.filter((a) =>
          cityIds.includes(a.city_id)
        );
        const countryIds = [...new Set(citiesToExport.map((c) => c.country_id))];
        countriesToExport = locations.countries.filter((c) =>
          countryIds.includes(c.id)
        );
      } else if (currentListView === 'areas') {
        areasToExport = locations.areas.filter((a) =>
          selectedLocations.includes(a.id)
        );
        const cityIds = [...new Set(areasToExport.map((a) => a.city_id))];
        citiesToExport = locations.cities.filter((c) =>
          cityIds.includes(c.id)
        );
        const countryIds = [...new Set(citiesToExport.map((c) => c.country_id))];
        countriesToExport = locations.countries.filter((c) =>
          countryIds.includes(c.id)
        );
      }
    }

    return {
      countries: countriesToExport,
      cities: citiesToExport,
      areas: areasToExport,
    };
  };

  const handleExport = () => {
    const scope = resolveExportScope();
    const wb = XLSX.utils.book_new();

    const countriesData = scope.countries.map((c) => ({
      name: c.name,
      code: c.code,
      currency: c.currency,
      timezone: c.timezone,
      phone_code: c.phone_code,
      status: c.status,
    }));
    const citiesData = scope.cities.map((c) => ({
      name: c.name,
      code: c.code,
      country_code: c.country?.code || '',
      country_name: c.country?.name || '',
      status: c.status,
    }));
    const areasData = scope.areas.map((a) => ({
      name: a.name,
      code: a.code,
      city_name: a.city?.name || '',
      country_code: a.country?.code || '',
      country_name: a.country?.name || '',
      status: a.status,
    }));

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(countriesData), 'Countries');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(citiesData), 'Cities');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(areasData), 'Areas');
    XLSX.writeFile(wb, 'locations_export.xlsx');

    showToast('Export completed successfully', 'success');
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer ? e.dataTransfer.files[0] : e.target.files[0];
    if (file) processFile(file);
  };

  const processFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      const parsedData = { countries: [], cities: [], areas: [] };

      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);
        const lowerName = sheetName.toLowerCase();

        if (lowerName.includes('countr')) parsedData.countries = json;
        else if (lowerName.includes('cit') || lowerName.includes('state'))
          parsedData.cities = json;
        else if (lowerName.includes('area')) parsedData.areas = json;
      });

      if (workbook.SheetNames.length === 1 && parsedData.countries.length === 0) {
        const json = XLSX.utils.sheet_to_json(
          workbook.Sheets[workbook.SheetNames[0]]
        );
        if (json.length > 0) {
          const keys = Object.keys(json[0]).map((k) => k.toLowerCase());
          if (keys.includes('city_name') || keys.includes('city'))
            parsedData.areas = json;
          else if (keys.includes('country_name') || keys.includes('country'))
            parsedData.cities = json;
          else parsedData.countries = json;
        }
      }

      const normalize = (value) =>
        value === null || value === undefined
          ? ''
          : String(value).trim().toLowerCase();

      const seen = {
        countries: new Set(),
        cities: new Set(),
        areas: new Set(),
      };

      let errorCount = 0;
      ['countries', 'cities', 'areas'].forEach((type) => {
        parsedData[type] = parsedData[type].map((row) => {
          const errors = [];
          const name = normalize(row.name);
          const code = normalize(row.code);

          if (!name) errors.push('Name missing');
          if (type === 'cities' && !row.country_code && !row.country_name && !row.country_id)
            errors.push('Country missing');
          if (type === 'areas' && !row.city_name && !row.city_id)
            errors.push('City missing');

          const key = code ? `code:${code}` : name ? `name:${name}` : '';
          if (key) {
            if (seen[type].has(key)) errors.push('Duplicate in file');
            else seen[type].add(key);
          }

          if (errors.length > 0) errorCount++;
          return { ...row, _errors: errors };
        });
      });

      setImportData(parsedData);
      const nextStats = getEmptyImportStats();
      nextStats.validationErrors = errorCount;
      setImportStats(nextStats);
      setImportStep('preview');
    };
    reader.readAsArrayBuffer(file);
  };

  const submitImport = () => {
    setImportStep('processing');
    router.post(
      getLocalizedRoute('admin.location.bulk-import'),
      { ...importData, options: importOptions },
      {
        onSuccess: (page) => {
          const flash = page.props.flash || {};
          if (flash.importStats) {
            setImportStats({ ...flash.importStats, validationErrors: 0 });
          }
          setImportProgress(100);
          setImportStep('success');
          showToast('Import completed successfully', 'success');
        },
        onError: () => {
          setImportStep('preview');
          showToast('Import failed. Please review errors.', 'error');
        },
      }
    );
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        {
          name: 'Egypt',
          code: 'EG',
          currency: 'EGP',
          timezone: 'Africa/Cairo',
          phone_code: '20',
          status: 'active',
        },
      ]),
      'Countries'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([{ name: 'Cairo', code: 'CAI', country_code: 'EG', status: 'active' }]),
      'Cities'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([{ name: 'Nasr City', code: 'NC', city_name: 'Cairo', country_code: 'EG', status: 'active' }]),
      'Areas'
    );
    XLSX.writeFile(wb, 'location_import_template.xlsx');
  };

  // --- Render Components ---

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
        getLocalizedRoute('admin.location.bulk-delete'),
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
        getLocalizedRoute('admin.location.bulk-status'),
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
        <a href={getLocalizedRoute('admin.dashboard')}>Dashboard</a>
        <span>/</span>
        <a href={getLocalizedRoute('admin.location.index')}>Location Management</a>
      </div>

      {viewMode === 'dashboard' && (
        <>
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
              Add Country
            </button>
            <button className="btn btn-secondary" onClick={addCity}>
              <span className="material-icons-outlined">add</span>
              Add City
            </button>
            <button className="btn btn-secondary" onClick={addArea}>
              <span className="material-icons-outlined">add</span>
              Add Area
            </button>
            <div className="spacer"></div>
            <button className="btn btn-outline" onClick={openImportModal}>
              <span className="material-icons-outlined">upload</span>
              Import Excel
            </button>
            <button className="btn btn-outline" onClick={handleExport}>
              <span className="material-icons-outlined">download</span>
              Export Excel
            </button>
          </div>

          {/* Main Content */}
          <div className="card">
            <div className="card-header">
              <div className="tabs">
                <button
                  className={`tab ${activeTab === 'tree' ? 'active' : ''}`}
                  onClick={() => switchTab('tree')}
                >
                  <span className="material-icons-outlined">account_tree</span>
                  Tree View
                </button>
                <button
                  className={`tab ${activeTab === 'list' ? 'active' : ''}`}
                  onClick={() => switchTab('list')}
                >
                  <span className="material-icons-outlined">list</span>
                  List View
                </button>
                <button
                  className={`tab ${activeTab === 'map' ? 'active' : ''}`}
                  onClick={() => switchTab('map')}
                >
                  <span className="material-icons-outlined">public</span>
                  Map View
                </button>
              </div>
            </div>

            <div className="card-body">
              {activeTab === 'tree' && renderTreeView()}

              {activeTab === 'list' && (
            <div className="list-view">
              <div className="toolbar">
                <div className="search-box">
                  <span className="material-icons-outlined search-icon">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Search locations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="filter-group">
                  <select
                    value={currentListView}
                    onChange={(e) => {
                      setCurrentListView(e.target.value);
                      setCurrentPage(1);
                      setSelectedLocations([]);
                      setAllSelected(false);
                    }}
                  >
                    <option value="countries">Countries</option>
                    <option value="cities">Cities</option>
                    <option value="areas">Areas</option>
                  </select>
                </div>
                {selectedLocations.length > 0 && (
                  <div className="bulk-actions">
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => applyBulkAction('activate')}
                    >
                      Activate
                    </button>
                    <button
                      className="btn btn-sm btn-warning"
                      onClick={() => applyBulkAction('deactivate')}
                    >
                      Deactivate
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => applyBulkAction('delete')}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>
                        <input
                          type="checkbox"
                          className="location-checkbox"
                          checked={allSelected}
                          onChange={(e) => {
                            setAllSelected(e.target.checked);
                            if (e.target.checked) {
                              if (currentListView === 'countries')
                                setSelectedLocations(
                                  locations.countries.map((c) => c.id)
                                );
                              else if (currentListView === 'cities')
                                setSelectedLocations(
                                  locations.cities.map((c) => c.id)
                                );
                              else if (currentListView === 'areas')
                                setSelectedLocations(
                                  locations.areas.map((a) => a.id)
                                );
                            } else {
                              setSelectedLocations([]);
                            }
                          }}
                        />
                      </th>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Parent</th>
                      <th>Code</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>{renderListView()}</tbody>
                </table>
              </div>

              <div className="pagination">
                <div className="pagination-info">
                  Showing {paginationInfo.start} to {paginationInfo.end} of{' '}
                  {paginationInfo.total} entries
                </div>
                <div className="pagination-controls">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                  >
                    Previous
                  </button>
                  <button
                    disabled={
                      currentPage * pageSize >= paginationInfo.total
                    }
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
              )}

          {activeTab === 'map' && (
            <div className="map-view">
              <div className="map-controls">
                <select
                  value={mapType}
                  onChange={(e) => setMapType(e.target.value)}
                >
                  <option value="cities">Cities</option>
                </select>
              </div>
              <div className="map-container">
                <MapContainer
                  center={[30.0444, 31.2357]}
                  zoom={2}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  {mapType === 'cities' &&
                    locations.cities.map(
                      (city) =>
                        city.latitude &&
                        city.longitude && (
                          <Marker
                            key={city.id}
                            position={[city.latitude, city.longitude]}
                          >
                            <Popup>
                              <strong>{city.name}</strong>
                              <br />
                              Country: {city.country?.name}
                            </Popup>
                          </Marker>
                        )
                    )}
                </MapContainer>
              </div>
            </div>
          )}
            </div>
          </div>
        </>
      )}

      {/* Create/Edit */}
      {viewMode === 'addForm' && (
        <div id="locationEditor" className="location-editor">
          <div className="location-editor-header">
            <h3 className="location-editor-title">
              {editingId ? 'Edit' : 'Add'}{' '}
              {currentMode.charAt(0).toUpperCase() + currentMode.slice(1)}
            </h3>
            <button className="btn btn-text" onClick={closeModal}>
              <span className="material-icons-outlined">close</span>
              Close
            </button>
          </div>

          <div className="location-editor-body">
            <div className="form-columns">
              <div className="form-column">
                <div className="form-row">
                  <label className="form-label" htmlFor="name">
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    name="name"
                    className="form-input"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter name"
                  />
                </div>

                <div className="form-columns">
                  <div className="form-column">
                    <div className="form-row">
                      <label className="form-label" htmlFor="code">
                        Code
                      </label>
                      <input
                        id="code"
                        type="text"
                        name="code"
                        className="form-input"
                        value={formData.code}
                        onChange={handleInputChange}
                        placeholder="e.g. EG, CAI"
                      />
                    </div>
                  </div>
                  <div className="form-column">
                    <div className="form-row">
                      <label className="form-label" htmlFor="status">
                        Status
                      </label>
                      <select
                        id="status"
                        name="status"
                        className="form-select"
                        value={formData.status}
                        onChange={handleInputChange}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                {(currentMode === 'city' || currentMode === 'area') && (
                  <div className="form-row">
                    <label className="form-label" htmlFor="countryId">
                      Country
                    </label>
                    <select
                      id="countryId"
                      name="countryId"
                      className="form-select"
                      value={formData.countryId}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Country</option>
                      {locations.countries.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {currentMode === 'area' && (
                  <div className="form-row">
                    <label className="form-label" htmlFor="cityId">
                      City
                    </label>
                    <select
                      id="cityId"
                      name="cityId"
                      className="form-select"
                      value={formData.cityId}
                      onChange={handleInputChange}
                      disabled={!formData.countryId}
                    >
                      <option value="">Select City</option>
                      {locations.cities
                        .filter(
                          (c) => c.country_id === parseInt(formData.countryId)
                        )
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="form-column">
                {currentMode === 'country' && (
                  <>
                    <div className="form-row">
                      <label className="form-label" htmlFor="currency">
                        Currency
                      </label>
                      <input
                        id="currency"
                        type="text"
                        name="currency"
                        className="form-input"
                        value={formData.currency}
                        onChange={handleInputChange}
                        placeholder="e.g. EGP, USD"
                      />
                    </div>

                    <div className="form-row">
                      <label className="form-label" htmlFor="timezone">
                        Timezone
                      </label>
                      <input
                        id="timezone"
                        type="text"
                        name="timezone"
                        className="form-input"
                        value={formData.timezone}
                        onChange={handleInputChange}
                        placeholder="e.g. Africa/Cairo"
                      />
                    </div>

                    <div className="form-row">
                      <label className="form-label" htmlFor="phone_code">
                        Phone Code
                      </label>
                      <input
                        id="phone_code"
                        type="text"
                        name="phone_code"
                        className="form-input"
                        value={formData.phone_code}
                        onChange={handleInputChange}
                        placeholder="e.g. 20"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="location-editor-actions">
            <button className="btn btn-text" onClick={closeModal}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={saveLocation}>
              Save
            </button>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {viewMode === 'dashboard' && showImportModal && (
        <div className="location-import-panel">
          <div className="location-import-card">
            <div className="modal-header">
              <h3>Import Locations</h3>
              <button className="close-btn" onClick={() => closeImportModal(false)}>
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="steps-indicator mb-4" style={{display: 'flex', justifyContent: 'space-between', padding: '0 20px'}}>
                  <div className={`step ${importStep === 'upload' ? 'active' : 'completed'}`} style={{fontWeight: importStep === 'upload' ? 'bold' : 'normal'}}>1. Upload</div>
                  <div className={`step ${importStep === 'preview' ? 'active' : ''}`} style={{fontWeight: importStep === 'preview' ? 'bold' : 'normal'}}>2. Preview</div>
                  <div className={`step ${importStep === 'processing' ? 'active' : ''}`} style={{fontWeight: importStep === 'processing' ? 'bold' : 'normal'}}>3. Process</div>
                  <div className={`step ${importStep === 'success' ? 'active' : ''}`} style={{fontWeight: importStep === 'success' ? 'bold' : 'normal'}}>4. Result</div>
              </div>

              {importStep === 'upload' && (
                <div className="import-upload-step">
                  <div 
                    className="dropzone"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <span className="material-icons-outlined" style={{fontSize: '48px', color: '#cbd5e1'}}>cloud_upload</span>
                    <p>Drag & Drop your file here or click to browse</p>
                    <p className="text-muted text-sm">Supports .xlsx, .csv</p>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      style={{display: 'none'}} 
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileDrop}
                    />
                  </div>
                  <div className="text-center mt-4">
                    <p className="text-muted small mb-2">Need the correct format?</p>
                    <button className="btn btn-outline" onClick={downloadTemplate}>
                      <span className="material-icons-outlined">download</span>
                      Download Template
                    </button>
                  </div>
                </div>
              )}

              {importStep === 'preview' && (
                <div className="import-preview-step">
                  {importStats.validationErrors > 0 && (
                    <div className="alert alert-danger mb-3">
                      Found {importStats.validationErrors} validation errors. Please fix the file and try again.
                    </div>
                  )}

                  <div className="import-options mb-3">
                    <label className="import-option">
                      <input
                        type="checkbox"
                        checked={importOptions.updateExisting}
                        onChange={(e) =>
                          setImportOptions((prev) => ({
                            ...prev,
                            updateExisting: e.target.checked,
                          }))
                        }
                      />
                      Update existing records
                    </label>
                    <label className="import-option">
                      <input
                        type="checkbox"
                        checked={importOptions.createMissingCountries}
                        onChange={(e) =>
                          setImportOptions((prev) => ({
                            ...prev,
                            createMissingCountries: e.target.checked,
                          }))
                        }
                      />
                      Create missing countries
                    </label>
                    <label className="import-option">
                      <input
                        type="checkbox"
                        checked={importOptions.createMissingCities}
                        onChange={(e) =>
                          setImportOptions((prev) => ({
                            ...prev,
                            createMissingCities: e.target.checked,
                          }))
                        }
                      />
                      Create missing cities
                    </label>
                  </div>

                  <div className="preview-tabs" style={{maxHeight: '400px', overflowY: 'auto'}}>
                    {['countries', 'cities', 'areas'].map(type => (
                      importData[type].length > 0 && (
                        <div key={type} className="mb-4">
                          <h5 className="capitalize mb-2" style={{textTransform: 'capitalize'}}>{type} ({importData[type].length})</h5>
                          <div className="table-responsive">
                            <table className="table table-bordered table-sm">
                              <thead>
                                <tr>
                                  <th style={{width: '50px'}}>#</th>
                                  <th>Name</th>
                                  <th>Code</th>
                                  {type !== 'countries' && <th>Parent</th>}
                                  <th>Status</th>
                                  <th>Validation</th>
                                </tr>
                              </thead>
                              <tbody>
                                {importData[type].map((row, idx) => (
                                  <tr key={idx} className={row._errors && row._errors.length > 0 ? 'import-error-row' : ''}>
                                    <td>{idx + 1}</td>
                                    <td>{row.name}</td>
                                    <td>{row.code}</td>
                                    {type !== 'countries' && (
                                      <td>
                                        {type === 'cities' ? (row.country_code || row.country_name || row.country_id) : (row.city_name || row.city_id)}
                                      </td>
                                    )}
                                    <td>{row.status || 'active'}</td>
                                    <td>
                                      {row._errors && row._errors.length > 0 ? (
                                        <span className="text-danger small">{row._errors.join(', ')}</span>
                                      ) : (
                                        <span className="text-success small">OK</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )
                    ))}
                    {importData.countries.length === 0 && importData.cities.length === 0 && importData.areas.length === 0 && (
                        <div className="text-center text-muted">No valid data found in file.</div>
                    )}
                  </div>
                </div>
              )}

              {importStep === 'processing' && (
                <div className="import-processing-step text-center py-5">
                  <div className="spinner"></div>
                  <p className="mt-3">Processing import...</p>
                  <p className="text-muted small">This may take a moment. Do not close this window.</p>
                  <div className="progress mt-3">
                    <div className="progress-bar" style={{ width: `${importProgress}%` }}></div>
                  </div>
                  <div className="progress-value">{importProgress}%</div>
                </div>
              )}

              {importStep === 'success' && (
                <div className="import-success-step text-center">
                  <span className="material-icons-outlined text-success" style={{fontSize: '48px'}}>check_circle</span>
                  <h3>Import Successful!</h3>
                  
                  <div className="stats-summary mt-4">
                    <table className="table table-bordered">
                        <thead>
                            <tr>
                                <th>Entity</th>
                                <th>Added</th>
                                <th>Updated</th>
                                <th>Skipped</th>
                                <th>Failed</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Countries</td>
                                <td className="text-success">{importStats.countries?.added || 0}</td>
                                <td className="text-info">{importStats.countries?.updated || 0}</td>
                                <td className="text-warning">{importStats.countries?.skipped || 0}</td>
                                <td className="text-danger">{importStats.countries?.failed || 0}</td>
                            </tr>
                            <tr>
                                <td>Cities</td>
                                <td className="text-success">{importStats.cities?.added || 0}</td>
                                <td className="text-info">{importStats.cities?.updated || 0}</td>
                                <td className="text-warning">{importStats.cities?.skipped || 0}</td>
                                <td className="text-danger">{importStats.cities?.failed || 0}</td>
                            </tr>
                            <tr>
                                <td>Areas</td>
                                <td className="text-success">{importStats.areas?.added || 0}</td>
                                <td className="text-info">{importStats.areas?.updated || 0}</td>
                                <td className="text-warning">{importStats.areas?.skipped || 0}</td>
                                <td className="text-danger">{importStats.areas?.failed || 0}</td>
                            </tr>
                        </tbody>
                    </table>

                    {importStats.errors && importStats.errors.length > 0 && (
                        <div className="mt-3 text-left">
                            <h5 className="text-danger">Errors:</h5>
                            <ul className="text-danger small" style={{maxHeight: '150px', overflowY: 'auto', textAlign: 'left'}}>
                                {importStats.errors.map((err, i) => <li key={i}>{err}</li>)}
                            </ul>
                        </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-text" onClick={() => closeImportModal(importStep === 'success')}>
                {importStep === 'success' ? 'Close' : 'Cancel'}
              </button>
              
              {importStep === 'preview' && (
                <>
                    <button className="btn btn-secondary" onClick={() => setImportStep('upload')}>Back</button>
                    <button 
                        className="btn btn-primary" 
                        onClick={submitImport}
                        disabled={importStats.validationErrors > 0}
                    >
                      Confirm Import
                    </button>
                </>
              )}
              
              {importStep === 'success' && (
                  <button className="btn btn-primary" onClick={() => closeImportModal(true)}>
                      Done
                  </button>
              )}
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <span className="material-icons-outlined">
            {toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info'}
          </span>
          <span>{toast.message}</span>
        </div>
      )}
    </AdminLayout>
  );
};

export default Location;
