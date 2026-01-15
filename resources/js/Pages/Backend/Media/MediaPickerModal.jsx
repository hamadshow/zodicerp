import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import MediaSidebar from './MediaSidebar';
import MediaGrid from './MediaGrid';
import MediaToolbar from './MediaToolbar';
import Pagination from '../components/Pagination';
import '../../../../css/backend/Media.css';

export default function MediaPickerModal({ isOpen, onClose, onSelect, multiple = false, allowedTypes = ['image'] }) {
    const [loading, setLoading] = useState(false);
    const [folders, setFolders] = useState([]);
    const [files, setFiles] = useState([]);
    const [currentFolder, setCurrentFolder] = useState(null);
    const [breadcrumbs, setBreadcrumbs] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [storageUsage, setStorageUsage] = useState({ used: 0, total: 1073741824 });
    
    // Selection state
    const [selectedItems, setSelectedItems] = useState([]);
    
    // Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [sortBy, setSortBy] = useState('name');
    const [activeTab, setActiveTab] = useState('all');
    
    // File Upload
    const fileInputRef = useRef(null);
    const [uploadProgress, setUploadProgress] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchMedia();
            setSelectedItems([]);
        }
    }, [isOpen]);

    const fetchMedia = async (params = {}) => {
        setLoading(true);
        try {
            const queryParams = {
                folder_id: currentFolder?.id,
                search: searchQuery,
                sort_by: sortBy,
                type: activeTab,
                ...params
            };
            
            // If allowedTypes is only images, we might want to filter server-side
            if (allowedTypes.length === 1 && allowedTypes[0] === 'image') {
                queryParams.type = 'images';
            }

            const response = await axios.get(route('admin.media.index'), {
                params: queryParams,
                headers: { 'Accept': 'application/json' }
            });

            const data = response.data;
            setFolders(data.folders);
            setFiles(data.files.data || data.files);
            setPagination(data.files.data ? data.files : null);
            setCurrentFolder(data.currentFolder);
            setBreadcrumbs(data.breadcrumbs || []);
            setStorageUsage(data.storageUsage);
        } catch (error) {
            console.error("Error fetching media:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        // When changing tabs (filters), we usually want to reset to root folder or keep current?
        // Let's keep current folder but apply filter
        fetchMedia({ type: tab });
    };

    const handleFolderClick = (folder) => {
        setCurrentFolder(folder);
        // We need to fetch new data when folder changes, 
        // but since setCurrentFolder is async, we should call fetchMedia with the new ID
        // Or better, use useEffect on currentFolder? No, that might trigger on initial load.
        // Let's just call fetchMedia with explicit folder_id
        fetchMedia({ folder_id: folder.id });
    };

    const handleBreadcrumbClick = (folderId) => {
        fetchMedia({ folder_id: folderId });
    };

    const handleSearch = (e) => {
        setSearchQuery(e.target.value);
        // Debounce could be added here
        fetchMedia({ search: e.target.value });
    };

    const handleToggleSelect = (item, type) => {
        if (type === 'folder') return; // Don't select folders in picker mode usually?

        if (multiple) {
            setSelectedItems(prev => {
                const exists = prev.some(i => i.id === item.id);
                if (exists) {
                    return prev.filter(i => i.id !== item.id);
                } else {
                    return [...prev, { ...item, type }];
                }
            });
        } else {
            // Single selection
            setSelectedItems([{ ...item, type }]);
        }
    };

    const handleFileClick = (file) => {
        handleToggleSelect(file, 'file');
    };

    const handleConfirm = () => {
        if (selectedItems.length > 0) {
            if (multiple) {
                onSelect(selectedItems);
            } else {
                onSelect(selectedItems[0]);
            }
            onClose();
        }
    };

    const handleFileUpload = async (e) => {
        const filesToUpload = Array.from(e.target.files);
        if (filesToUpload.length === 0) return;

        const formData = new FormData();
        filesToUpload.forEach(file => {
            formData.append('files[]', file);
        });
        
        if (currentFolder) {
            formData.append('folder_id', currentFolder.id);
        }

        try {
            setUploadProgress(0);
            await axios.post(route('admin.media.store'), formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });
            
            setUploadProgress(null);
            fetchMedia(); // Refresh list
        } catch (error) {
            console.error("Upload failed", error);
            setUploadProgress(null);
            alert("Upload failed");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay active modal-overlay-picker">
            <div className="modal media-picker-modal">
                <div className="modal-header">
                    <h3 className="modal-title">Media Library</h3>
                    <button className="modal-close" onClick={onClose}>
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>

                <div className="media-layout-wrapper picker">
                    <MediaSidebar 
                        currentFolder={currentFolder}
                        folders={folders} 
                        onFolderClick={handleFolderClick}
                        storageUsage={storageUsage}
                        pickerMode={true}
                        activeTab={activeTab}
                        onTabChange={handleTabChange}
                    />

                    <div className="media-container picker">
                        <div className="media-header media-header-picker">
                            <div className="media-breadcrumbs media-breadcrumbs-picker">
                                <span 
                                    className="breadcrumb-item breadcrumb-item-picker" 
                                    onClick={() => handleBreadcrumbClick(null)}
                                >
                                    <span className="material-icons-outlined">home</span>
                                </span>
                                {breadcrumbs.map(folder => (
                                     <span key={folder.id} className="breadcrumb-wrapper">
                                        <span className="separator breadcrumb-separator">/</span>
                                        <span 
                                            className="breadcrumb-item breadcrumb-item-picker" 
                                            onClick={() => handleBreadcrumbClick(folder.id)}
                                        >
                                            {folder.name}
                                        </span>
                                     </span>
                                ))}
                                {currentFolder && (
                                    <span className="breadcrumb-wrapper">
                                        <span className="separator breadcrumb-separator">/</span>
                                        <span className="breadcrumb-item breadcrumb-item-picker active">{currentFolder.name}</span>
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="media-toolbar-wrapper">
                            <MediaToolbar 
                                onUploadClick={() => fileInputRef.current.click()}
                                onCreateFolderClick={() => {}} // Disabled in picker for simplicity
                                searchQuery={searchQuery}
                                onSearchChange={handleSearch}
                                viewMode={viewMode}
                                onViewModeChange={setViewMode}
                                sortBy={sortBy}
                                onSortChange={setSortBy}
                            />
                        </div>

                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden-input"
                            onChange={handleFileUpload} 
                            multiple
                        />

                        {uploadProgress !== null && (
                            <div className="upload-progress-container">
                                <div className="progress-bar-wrapper modal">
                                    <div className="progress-bar modal" style={{ width: `${uploadProgress}%` }}></div>
                                </div>
                                <div className="upload-text-modal">Uploading... {uploadProgress}%</div>
                            </div>
                        )}

                        <div className="media-content-wrapper modal">
                            {loading ? (
                                <div className="loading-spinner">
                                    <div className="spinner"></div>
                                    <p>Loading media...</p>
                                </div>
                            ) : (
                                <MediaGrid 
                                    folders={folders} 
                                    files={files} 
                                    selectedItems={selectedItems}
                                    onToggleSelect={handleToggleSelect}
                                    onFolderClick={handleFolderClick}
                                    onFileClick={handleFileClick}
                                    onRename={() => {}}
                                    onDelete={() => {}}
                                    onMove={() => {}}
                                    viewMode={viewMode}
                                />
                            )}
                        </div>

                        {pagination && (
                            <div className="pagination-container-modal">
                                <Pagination 
                                    currentPage={pagination.current_page}
                                    totalPages={pagination.last_page}
                                    totalRecords={pagination.total}
                                    recordsPerPage={pagination.per_page}
                                    onPageChange={(page) => fetchMedia({ page })}
                                    onRecordsPerPageChange={() => {}} 
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-actions picker-actions">
                    <div className="selected-info">
                        {selectedItems.length} items selected
                    </div>
                    <div className="action-buttons">
                        <button className="btn btn-outline" onClick={onClose}>Cancel</button>
                        <button 
                            className="btn btn-primary" 
                            onClick={handleConfirm}
                            disabled={selectedItems.length === 0}
                        >
                            Insert
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
