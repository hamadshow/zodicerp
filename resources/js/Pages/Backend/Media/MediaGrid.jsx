import React from 'react';

export default function MediaGrid({ folders, files, selectedItems = [], onToggleSelect, onFolderClick, onFileClick, onRename, onDelete, onMove, viewMode = 'grid' }) {

  const isSelected = (id, type) => {
      return selectedItems.some(item => item.id === id && item.type === type);
  };
  
  const handleDragStart = (e, item, type) => {
    let itemsToDrag = [];
    if (isSelected(item.id, type)) {
        // If dragging a selected item, drag all selected items
        itemsToDrag = selectedItems;
    } else {
        // Otherwise drag just this item
        itemsToDrag = [{ type, id: item.id }];
    }
    
    const payload = JSON.stringify({ items: itemsToDrag });
    e.dataTransfer.setData('application/json', payload);
    e.dataTransfer.setData('text/plain', payload);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over-folder');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over-folder');
  };

  const handleDrop = (e, targetFolder) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over-folder');
    const data = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
    if (data) {
        try {
            const parsed = JSON.parse(data);
            if (onMove) {
                // Support both old format (single item) and new format (items array)
                if (parsed.items) {
                    onMove(parsed.items, targetFolder);
                } else if (parsed.item) {
                    onMove([{ type: parsed.type, id: parsed.item.id }], targetFolder);
                }
            }
        } catch (err) {
            console.error('Drop error', err);
        }
    }
  };

  const formatSize = (bytes) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleDateString();
  };

  if (viewMode === 'list') {
      return (
          <div className="media-list-view">
              <div className="media-list-header">
                  <div className="list-col checkbox-col">
                      {/* Select All checkbox could go here if passed from parent */}
                  </div>
                  <div className="list-col icon-col"></div>
                  <div className="list-col name-col">Name</div>
                  <div className="list-col size-col">Size</div>
                  <div className="list-col date-col">Date</div>
                  <div className="list-col actions-col">Actions</div>
              </div>
              <div className="media-list-body">
                  {folders.map(folder => (
                      <div 
                          key={folder.id} 
                          className={`media-list-item folder ${isSelected(folder.id, 'folder') ? 'selected' : ''}`}
                          onClick={() => onFolderClick(folder)}
                          draggable
                          onDragStart={(e) => handleDragStart(e, folder, 'folder')}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, folder)}
                      >
                          <div className="list-col checkbox-col" onClick={(e) => e.stopPropagation()}>
                              <input 
                                  type="checkbox" 
                                  checked={isSelected(folder.id, 'folder')}
                                  onChange={() => onToggleSelect(folder, 'folder')}
                              />
                          </div>
                          <div className="list-col icon-col">
                              <span className="material-icons-outlined icon-yellow">folder</span>
                          </div>
                          <div className="list-col name-col">
                              <span className="item-name">{folder.name}</span>
                          </div>
                          <div className="list-col size-col">-</div>
                          <div className="list-col date-col">{formatDate(folder.created_at)}</div>
                          <div className="list-col actions-col">
                              <button 
                                  onClick={(e) => { e.stopPropagation(); onRename(folder, 'folder'); }} 
                                  className="action-btn"
                                  title="Rename"
                              >
                                  <span className="material-icons-outlined icon-sm">edit</span>
                              </button>
                              <button 
                                  onClick={(e) => { e.stopPropagation(); onDelete(folder, 'folder'); }} 
                                  className="action-btn delete"
                                  title="Delete"
                              >
                                  <span className="material-icons-outlined icon-sm">delete</span>
                              </button>
                          </div>
                      </div>
                  ))}

                  {files.map(file => (
                      <div 
                          key={file.id} 
                          className={`media-list-item file ${isSelected(file.id, 'file') ? 'selected' : ''}`}
                          onClick={() => onFileClick(file)}
                          draggable
                          onDragStart={(e) => handleDragStart(e, file, 'file')}
                      >
                          <div className="list-col checkbox-col" onClick={(e) => e.stopPropagation()}>
                              <input 
                                  type="checkbox" 
                                  checked={isSelected(file.id, 'file')}
                                  onChange={() => onToggleSelect(file, 'file')}
                              />
                          </div>
                          <div className="list-col icon-col">
                              {file.file_type.includes('image') ? (
                                  <span className="material-icons-outlined icon-blue">image</span>
                              ) : (
                                  <span className="material-icons-outlined icon-gray">description</span>
                              )}
                          </div>
                          <div className="list-col name-col">
                              <span className="item-name" title={file.name}>{file.name}</span>
                          </div>
                          <div className="list-col size-col">{formatSize(file.size)}</div>
                          <div className="list-col date-col">{formatDate(file.created_at)}</div>
                          <div className="list-col actions-col">
                              <button 
                                  onClick={(e) => { e.stopPropagation(); onRename(file, 'file'); }} 
                                  className="action-btn"
                                  title="Rename"
                              >
                                  <span className="material-icons-outlined icon-sm">edit</span>
                              </button>
                              <button 
                                  onClick={(e) => { e.stopPropagation(); onDelete(file, 'file'); }} 
                                  className="action-btn delete"
                                  title="Delete"
                              >
                                  <span className="material-icons-outlined icon-sm">delete</span>
                              </button>
                          </div>
                      </div>
                  ))}
                  
                  {folders.length === 0 && files.length === 0 && (
                      <div className="empty-state-list">
                          <p>This folder is empty</p>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  return (
    <div className="media-grid">
      {folders.map(folder => (
        <div 
            key={folder.id} 
            className={`media-item folder ${isSelected(folder.id, 'folder') ? 'selected' : ''}`}
            onClick={() => onFolderClick(folder)}
            draggable
            onDragStart={(e) => handleDragStart(e, folder, 'folder')}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, folder)}
        >
          <div className="select-checkbox" onClick={(e) => e.stopPropagation()}>
              <input 
                  type="checkbox" 
                  checked={isSelected(folder.id, 'folder')}
                  onChange={() => onToggleSelect(folder, 'folder')}
              />
          </div>
          <div className="icon-wrapper">
             <span className="material-icons-outlined icon-folder-large">folder</span>
          </div>
          <span className="item-name">{folder.name}</span>
          
          <div className="item-actions">
              <button 
                  onClick={(e) => { e.stopPropagation(); onRename(folder, 'folder'); }} 
                  className="action-btn"
                  title="Rename"
              >
                  <span className="material-icons-outlined icon-sm">edit</span>
              </button>
              <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(folder, 'folder'); }} 
                  className="action-btn delete"
                  title="Delete"
              >
                  <span className="material-icons-outlined icon-sm">delete</span>
              </button>
          </div>
        </div>
      ))}

      {files.map(file => (
        <div 
            key={file.id} 
            className={`media-item file ${isSelected(file.id, 'file') ? 'selected' : ''}`}
            onClick={() => onFileClick(file)}
            draggable
            onDragStart={(e) => handleDragStart(e, file, 'file')}
        >
          <div className="select-checkbox" onClick={(e) => e.stopPropagation()}>
              <input 
                  type="checkbox" 
                  checked={isSelected(file.id, 'file')}
                  onChange={() => onToggleSelect(file, 'file')}
              />
          </div>
          <div className="preview-wrapper">
              {file.file_type.includes('image') ? (
                  <img src={file.file_url || `/media-files/${file.path}`} alt={file.name} />
              ) : (
                  <span className="material-icons-outlined icon-file-large">description</span>
              )}
          </div>
          <span className="item-name" title={file.name}>{file.name}</span>

          <div className="item-actions">
              <button 
                  onClick={(e) => { e.stopPropagation(); onRename(file, 'file'); }} 
                  className="action-btn"
                  title="Rename"
              >
                  <span className="material-icons-outlined icon-sm">edit</span>
              </button>
              <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(file, 'file'); }} 
                  className="action-btn delete"
                  title="Delete"
              >
                  <span className="material-icons-outlined icon-sm">delete</span>
              </button>
          </div>
        </div>
      ))}
      
      {folders.length === 0 && files.length === 0 && (
          <div className="empty-state">
              <span className="material-icons-outlined">folder_open</span>
              <p>This folder is empty</p>
          </div>
      )}
    </div>
  );
}
