import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useNotification } from '@/Components/Notifications/useNotification';
import AdminLayout from '../components/AdminLayout';
import Pagination from '../components/Pagination';
import MediaToolbar from "./MediaToolbar";
import MediaGrid from "./MediaGrid";
import MediaSidebar from "./MediaSidebar";
import FilePreviewModal from "./FilePreviewModal";

export default function MediaIndex({ folders, files, currentFolder, breadcrumbs = [], filters = {}, storageUsage }) {
    const { 
        showSuccess, 
        showError
    } = useNotification();

    const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(null);
    const [selectedItems, setSelectedItems] = useState([]); // Array of {type: 'folder'|'file', id: number}
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [viewMode, setViewMode] = useState('grid');
    const activeFilter = filters.type || 'all';
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importFiles, setImportFiles] = useState([]);
    const [importProgress, setImportProgress] = useState(null);
    const [importSummary, setImportSummary] = useState(null);
    const [importErrors, setImportErrors] = useState([]);
    const [navigatingFolderId, setNavigatingFolderId] = useState(null);
    
    const fileInputRef = useRef(null);
    const importInputRef = useRef(null);
    
    // Use local file list to handle pagination data structure
    const fileList = files.data || files;
    const pagination = files.data ? files : null;

    // --- Forms ---

    const { data: folderData, setData: setFolderData, post: postFolder, processing: folderProcessing, reset: resetFolder, errors: folderErrors } = useForm({
        name: '',
        parent_id: currentFolder ? currentFolder.id : null,
    });

    const { data: renameData, setData: setRenameData, post: postRename, processing: renameProcessing, reset: resetRename, errors: renameErrors } = useForm({
        type: '',
        id: '',
        name: '',
    });

    const { data: deleteData, setData: setDeleteData, post: postDelete, processing: deleteProcessing, reset: resetDelete } = useForm({
        items: [],
    });

    // Update parent_id when currentFolder changes
    useEffect(() => {
        setFolderData('parent_id', currentFolder ? currentFolder.id : null);
    }, [currentFolder]);

    // --- Navigation & Filtering Handlers ---

    const buildIndexUrl = (params = {}) => {
        const routeParams = activeFilter !== 'all' ? { tab: activeFilter } : {};
        return route('admin.media.index', { ...routeParams, ...params });
    };

    const handleSearch = (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        
        router.get(buildIndexUrl(), { 
            folder_id: currentFolder?.id,
            search: query,
            sort_by: filters.sort_by,
            sort_order: filters.sort_order
        }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const handleSort = (sortBy) => {
        const currentSort = filters.sort_by || 'name';
        const currentOrder = filters.sort_order || 'asc';
        let newOrder = 'asc';
        
        if (currentSort === sortBy) {
            newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
        }

        router.get(buildIndexUrl(), {
            folder_id: currentFolder?.id,
            search: searchQuery,
            sort_by: sortBy,
            sort_order: newOrder
        }, { preserveState: true, preserveScroll: true });
    };

    const navigateToFolder = (folderId) => {
        if (navigatingFolderId === folderId) return; // Prevent double-click navigation to same folder
        
        setNavigatingFolderId(folderId);
        router.get(buildIndexUrl(), { 
            folder_id: folderId,
            sort_by: filters.sort_by,
            sort_order: filters.sort_order,
            search: searchQuery
        }, { 
            preserveState: true, 
            preserveScroll: true,
            onFinish: () => setNavigatingFolderId(null)
        });
    };

    const handlePageChange = (page) => {
        router.get(buildIndexUrl(), {
            folder_id: currentFolder?.id,
            search: searchQuery,
            sort_by: filters.sort_by,
            sort_order: filters.sort_order,
            page: page
        }, { preserveState: true, preserveScroll: true });
    };

    // --- Action Handlers ---

    const handleCreateFolder = (e) => {
        e.preventDefault();
        postFolder(route('admin.media.folder.store'), {
            onSuccess: () => {
                setIsCreateFolderModalOpen(false);
                resetFolder();
            }
        });
    };

    const handleRenameClick = (item, type) => {
        setRenameData({
            type: type,
            id: item.id,
            name: item.name
        });
        setIsRenameModalOpen(true);
    };

    const handleRenameSubmit = (e) => {
        e.preventDefault();
        postRename(route('admin.media.rename'), {
            onSuccess: () => {
                setIsRenameModalOpen(false);
                resetRename();
            }
        });
    };

    const handleDeleteClick = (item, type) => {
        setDeleteData({
            items: [{ type, id: item.id }]
        });
        setIsDeleteModalOpen(true);
    };

    const handleDeleteSubmit = (e) => {
        e.preventDefault();
        postDelete(route('admin.media.destroy'), {
            onSuccess: () => {
                setIsDeleteModalOpen(false);
                resetDelete();
                setSelectedItems([]); // Clear selection after delete
            }
        });
    };

    const handleMove = (items, targetFolder) => {
        const destinationFolderId = targetFolder ? targetFolder.id : null;
        const validItems = targetFolder
            ? items.filter(item => !(item.type === 'folder' && item.id === targetFolder.id))
            : items;
        
        if (validItems.length === 0) return;

        router.post(route('admin.media.move'), {
            items: validItems,
            destination_folder_id: destinationFolderId
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setSelectedItems([]);
            }
        });
    };

    // --- Upload Handlers ---

    const uploadFiles = (files) => {
        if (files && files.length > 0) {
            router.post(route('admin.media.store'), {
                files: Array.from(files),
                folder_id: currentFolder ? currentFolder.id : null
            }, {
                forceFormData: true,
                onProgress: (progress) => {
                    setUploadProgress(progress.percentage);
                },
                onSuccess: () => {
                    setUploadProgress(null);
                },
                onError: () => {
                    setUploadProgress(null);
                }
            });
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files.length > 0) {
            uploadFiles(e.target.files);
        }
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDragging) setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Only disable if we're leaving the container entirely
        if (e.currentTarget.contains(e.relatedTarget)) {
            return;
        }
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles.length > 0) {
            uploadFiles(droppedFiles);
        }
    };

    const openImportModal = () => {
        setIsImportModalOpen(true);
        setImportFiles([]);
        setImportProgress(null);
        setImportSummary(null);
        setImportErrors([]);
    };

    const handleImportFolderChange = (e) => {
        const files = Array.from(e.target.files || []);
        const allowed = ['jpg', 'jpeg', 'png', 'gif'];
        const filtered = files.filter(file => {
            const ext = file.name.split('.').pop()?.toLowerCase();
            return allowed.includes(ext);
        });
        setImportFiles(filtered);
    };

    const startImport = async () => {
        if (importFiles.length === 0) return;
        const formData = new FormData();
        importFiles.forEach(file => {
            formData.append('files[]', file);
            formData.append('paths[]', file.webkitRelativePath || file.name);
        });
        try {
            setImportProgress(0);
            setImportSummary(null);
            setImportErrors([]);
            const response = await axios.post(route('admin.media.import-products'), formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setImportProgress(percent);
                }
            });
            setImportProgress(null);
            setImportSummary(response.data);
            showSuccess('Import completed successfully');
        } catch (error) {
            setImportProgress(null);
            const message = error?.response?.data?.message || 'Import failed';
            const details = error?.response?.data?.errors || [];
            setImportErrors(Array.isArray(details) ? details : [message]);
            showError(message);
        }
    };

    // --- Selection Handlers ---

    const handleToggleSelect = (item, type) => {
        setSelectedItems(prev => {
            const exists = prev.find(i => i.id === item.id && i.type === type);
            if (exists) {
                return prev.filter(i => !(i.id === item.id && i.type === type));
            } else {
                return [...prev, { type, id: item.id }];
            }
        });
    };

    const handleSelectAll = () => {
        if (selectedItems.length === folders.length + fileList.length) {
            setSelectedItems([]);
        } else {
            const allItems = [
                ...folders.map(f => ({ type: 'folder', id: f.id })),
                ...fileList.map(f => ({ type: 'file', id: f.id }))
            ];
            setSelectedItems(allItems);
        }
    };

    const handleBulkDelete = () => {
        if (selectedItems.length === 0) return;
        setDeleteData({
            items: selectedItems
        });
        setIsDeleteModalOpen(true);
    };

    const handleFileClick = (file) => {
        setSelectedFile(file);
    };

    return (
        <AdminLayout activeMenu="Media">
            <div className="media-page">
                <Head title="Media Manager" />
                
                <div className="breadcrumb">
                    <Link href={route('admin.dashboard')}>Dashboard</Link>
                    <span>/</span>
                    <Link href={route('admin.media.index')}>Media Manager</Link>
                    {breadcrumbs && breadcrumbs.map(folder => (
                        <React.Fragment key={folder.id}>
                            <span>/</span>
                            <Link href={buildIndexUrl({ folder_id: folder.id })}>
                                {folder.name}
                            </Link>
                        </React.Fragment>
                    ))}
                    {currentFolder && (
                        <React.Fragment>
                            <span>/</span>
                            <span>{currentFolder.name}</span>
                        </React.Fragment>
                    )}
                </div>
                
                <div className="media-wrapper">
                    <MediaSidebar 
                        currentFolder={currentFolder}
                        folders={folders} 
                        onFolderClick={(folder) => navigateToFolder(folder.id)}
                        storageUsage={storageUsage}
                        onMove={handleMove}
                    />

                    <div 
                        className={`media-container ${isDragging ? 'dragging' : ''}`}
                        onDragEnter={handleDragEnter}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        {isDragging && (
                            <div className="drag-overlay">
                                <span className="material-icons-outlined">cloud_upload</span>
                                <h3>Drop files to upload</h3>
                            </div>
                        )}

                        <div className="media-content-wrapper">
                            {selectedItems.length > 0 ? (
                                <div className="bulk-actions-toolbar">
                                    <div className="selected-count">
                                        <strong>{selectedItems.length}</strong> items selected
                                        <button type="button" className="btn btn-sm btn-link" onClick={handleSelectAll}>
                                            {selectedItems.length === folders.length + fileList.length ? 'Deselect All' : 'Select All'}
                                        </button>
                                    </div>
                                    <div className="bulk-actions">
                                        <button type="button" className="btn btn-danger bulk-delete-btn" onClick={handleBulkDelete}>
                                            <span className="material-icons-outlined action-icon-small">delete</span> Delete
                                        </button>
                                        <button type="button" className="btn btn-secondary bulk-cancel-btn" onClick={() => setSelectedItems([])}>
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <MediaToolbar 
                                    onUploadClick={() => fileInputRef.current.click()}
                                    onImportClick={openImportModal}
                                    onCreateFolderClick={() => setIsCreateFolderModalOpen(true)}
                                    searchQuery={searchQuery}
                                    onSearchChange={handleSearch}
                                    viewMode={viewMode}
                                    onViewModeChange={setViewMode}
                                    sortBy={filters.sort_by || 'name'}
                                    onSortChange={handleSort}
                                />
                            )}
                            
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden-input" 
                                onChange={handleFileChange} 
                                multiple
                            />

                            {uploadProgress !== null && (
                                <div className="upload-progress-container upload-progress-index">
                                    <div className="progress-bar-wrapper large">
                                        <div className="progress-bar" style={{ 
                                            width: `${uploadProgress}%`
                                        }}></div>
                                    </div>
                                    <div className="upload-status-text">
                                        Uploading... {uploadProgress}%
                                    </div>
                                </div>
                            )}

                            <MediaGrid 
                                folders={folders} 
                                files={fileList} 
                                selectedItems={selectedItems}
                                onToggleSelect={handleToggleSelect}
                                onFolderClick={(folder) => navigateToFolder(folder.id)}
                                onFileClick={handleFileClick}
                                onRename={handleRenameClick}
                                onDelete={handleDeleteClick}
                                onMove={handleMove}
                                viewMode={viewMode}
                            />

                            {pagination && (
                                <Pagination 
                                    currentPage={pagination.current_page}
                                    totalPages={pagination.last_page}
                                    totalRecords={pagination.total}
                                    recordsPerPage={pagination.per_page}
                                    onPageChange={handlePageChange}
                                    onRecordsPerPageChange={() => {}} 
                                />
                            )}
                        </div>
                    </div>
                </div>

            {isImportModalOpen && (
                <div className="modal-overlay active">
                    <div className="modal-card">
                        <div className="modal-header">
                            <h3>Import Product Images</h3>
                            <button className="close-btn" onClick={() => setIsImportModalOpen(false)}>
                                <span className="material-icons-outlined">close</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Select Folders</label>
                                <div className="d-flex gap-2 align-items-center">
                                    <button type="button" className="btn btn-outline" onClick={() => importInputRef.current.click()}>
                                        Choose Folders
                                    </button>
                                    <span>{importFiles.length} files ready</span>
                                </div>
                            </div>
                            <input
                                type="file"
                                ref={importInputRef}
                                className="hidden-input"
                                onChange={handleImportFolderChange}
                                multiple
                                webkitdirectory="true"
                                directory="true"
                            />
                            {importProgress !== null && (
                                <div className="upload-progress-container upload-progress-index">
                                    <div className="progress-bar-wrapper large">
                                        <div className="progress-bar" style={{ width: `${importProgress}%` }}></div>
                                    </div>
                                    <div className="upload-status-text">
                                        Importing... {importProgress}%
                                    </div>
                                </div>
                            )}
                            {importErrors.length > 0 && (
                                <div className="alert alert-danger">
                                    {importErrors.slice(0, 3).map((err, i) => (
                                        <div key={i}>{String(err)}</div>
                                    ))}
                                </div>
                            )}
                            {importSummary && (
                                <div className="alert alert-success">
                                    <div>Copied: {importSummary.copied}</div>
                                    <div>Skipped: {importSummary.skipped}</div>
                                    <div>Errors: {importSummary.errors?.length || 0}</div>
                                    {importSummary.mapping_url && (
                                        <div>
                                            <a href={importSummary.mapping_url} target="_blank" rel="noreferrer">Download Mapping</a>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-outline" onClick={() => setIsImportModalOpen(false)}>Close</button>
                            <button type="button" className="btn btn-primary" onClick={startImport} disabled={importFiles.length === 0 || importProgress !== null}>
                                Start Import
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isCreateFolderModalOpen && (
                <div className="modal-overlay active">
                    <div className="modal-card">
                        <div className="modal-header">
                            <h3>Create New Folder</h3>
                            <button className="close-btn" onClick={() => setIsCreateFolderModalOpen(false)}>
                                <span className="material-icons-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleCreateFolder}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Folder Name</label>
                                    <input 
                                        type="text" 
                                        value={folderData.name}
                                        onChange={e => setFolderData('name', e.target.value)}
                                        placeholder="Enter folder name"
                                        className={`form-control ${folderErrors.name ? 'is-invalid' : ''}`}
                                        autoFocus
                                    />
                                    {folderErrors.name && <div className="text-danger-custom">{folderErrors.name}</div>}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={() => setIsCreateFolderModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={folderProcessing}>Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Rename Modal */}
            {isRenameModalOpen && (
                <div className="modal-overlay active">
                    <div className="modal-card">
                        <div className="modal-header">
                            <h3>Rename Item</h3>
                            <button className="close-btn" onClick={() => setIsRenameModalOpen(false)}>
                                <span className="material-icons-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleRenameSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Name</label>
                                    <input 
                                        type="text" 
                                        value={renameData.name}
                                        onChange={e => setRenameData('name', e.target.value)}
                                        className="form-control"
                                        autoFocus
                                    />
                                    {renameErrors.name && <div className="text-danger-custom">{renameErrors.name}</div>}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={() => setIsRenameModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={renameProcessing}>Rename</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {isDeleteModalOpen && (
                <div className="modal-overlay active">
                    <div className="modal-card">
                        <div className="modal-header">
                            <h3>Delete Item</h3>
                            <button className="close-btn" onClick={() => setIsDeleteModalOpen(false)}>
                                <span className="material-icons-outlined">close</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you want to delete {deleteData.items.length > 1 ? `${deleteData.items.length} items` : 'this item'}?</p>
                            <p className="delete-warning-text">This action cannot be undone.</p>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</button>
                            <button type="button" className="btn btn-danger" onClick={handleDeleteSubmit} disabled={deleteProcessing}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* File Preview Modal */}
            {selectedFile && (
                <FilePreviewModal 
                    file={selectedFile} 
                    isOpen={true}
                    onClose={() => setSelectedFile(null)} 
                />
            )}
            </div>
        </AdminLayout>
    );
}
