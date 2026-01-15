import React from 'react';

export default function MediaToolbar({ 
    onUploadClick, 
    onCreateFolderClick, 
    searchQuery, 
    onSearchChange, 
    viewMode, 
    onViewModeChange,
    sortBy,
    onSortChange
}) {
  return (
    <div className="media-toolbar">
      <div className="toolbar-actions">
          <button type="button" className="btn btn-primary" onClick={onUploadClick}>
            <span className="material-icons-outlined">upload_file</span> <span className="btn-text">Upload</span>
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCreateFolderClick}>
            <span className="material-icons-outlined">create_new_folder</span> <span className="btn-text">New Folder</span>
          </button>
      </div>
      
      <div className="toolbar-controls">
          <div className="search-wrapper">
              <span className="material-icons-outlined search-icon">search</span>
              <input
                type="text"
                className="media-search"
                placeholder="Search files..."
                value={searchQuery}
                onChange={onSearchChange}
              />
          </div>

          <div className="view-toggles">
              <button 
                className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => onViewModeChange('grid')}
                title="Grid View"
              >
                  <span className="material-icons-outlined">grid_view</span>
              </button>
              <button 
                className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => onViewModeChange('list')}
                title="List View"
              >
                  <span className="material-icons-outlined">view_list</span>
              </button>
          </div>

          <div className="sort-dropdown">
              <select 
                value={sortBy} 
                onChange={(e) => onSortChange(e.target.value)}
                className="sort-select"
              >
                  <option value="name">Name</option>
                  <option value="created_at">Date</option>
                  <option value="size">Size</option>
                  <option value="file_type">Type</option>
              </select>
          </div>
      </div>
    </div>
  );
}
