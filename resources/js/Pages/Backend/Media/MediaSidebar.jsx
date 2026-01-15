import React, { useRef } from 'react';
import { Link, usePage } from '@inertiajs/react';

export default function MediaSidebar({ 
    currentFolder, 
    folders, 
    onFolderClick, 
    storageUsage = { used: 0, total: 1073741824 },
    onMove,
    pickerMode = false,
    activeTab = 'all',
    onTabChange
}) {
    const { url } = usePage();
    const lastDropAtRef = useRef(0);

    const isActive = (path) => {
        if (pickerMode) {
            // In picker mode, we match against activeTab
            // path is expected to be 'all', 'images', 'videos', 'documents'
            return activeTab === path;
        }

        // Standard mode: check URL
        if (path === '/admin/media' && (url === '/admin/media' || url === '/admin/media/')) return true;
        return url.startsWith(path);
    };

    const extractItems = (e) => {
        const raw = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
        if (!raw) return null;
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed.items)) return parsed.items;
            if (parsed.item && parsed.type) return [{ type: parsed.type, id: parsed.item.id }];
            return null;
        } catch {
            return null;
        }
    };

    const handleDragStartFolder = (e, folder) => {
        const payload = JSON.stringify({ items: [{ type: 'folder', id: folder.id }] });
        e.dataTransfer.setData('application/json', payload);
        e.dataTransfer.setData('text/plain', payload);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDropToFolder = (e, folder) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('drag-over-folder');
        lastDropAtRef.current = Date.now();
        const items = extractItems(e);
        if (!items || !onMove) return;
        onMove(items, folder);
    };

    const handleDropToRoot = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('drag-over-folder');
        lastDropAtRef.current = Date.now();
        const items = extractItems(e);
        if (!items || !onMove) return;
        onMove(items, null);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over-folder');
    };

    const handleDragLeave = (e) => {
        e.currentTarget.classList.remove('drag-over-folder');
    };

    const handleFolderClick = (folder) => {
        if (Date.now() - lastDropAtRef.current < 250) return;
        onFolderClick(folder);
    };

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const percentage = Math.min((storageUsage.used / storageUsage.total) * 100, 100);

    return (
        <div className="media-sidebar">
            <div className="sidebar-section">
                <h3 className="sidebar-title">Library</h3>
                <div className="sidebar-menu">
                    {pickerMode ? (
                        <>
                            <div
                                className={`sidebar-item cursor-pointer ${isActive('all') ? 'active' : ''}`}
                                onClick={() => onTabChange && onTabChange('all')}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDropToRoot}
                            >
                                <span className="material-icons-outlined">dashboard</span>
                                <span>All Media</span>
                            </div>
                            <div 
                                className={`sidebar-item cursor-pointer ${isActive('images') ? 'active' : ''}`}
                                onClick={() => onTabChange && onTabChange('images')}
                            >
                                <span className="material-icons-outlined">image</span>
                                <span>Images</span>
                            </div>
                            <div 
                                className={`sidebar-item cursor-pointer ${isActive('videos') ? 'active' : ''}`}
                                onClick={() => onTabChange && onTabChange('videos')}
                            >
                                <span className="material-icons-outlined">videocam</span>
                                <span>Videos</span>
                            </div>
                            <div 
                                className={`sidebar-item cursor-pointer ${isActive('documents') ? 'active' : ''}`}
                                onClick={() => onTabChange && onTabChange('documents')}
                            >
                                <span className="material-icons-outlined">description</span>
                                <span>Documents</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <Link
                                href={route('admin.media.index')}
                                className={`sidebar-item ${isActive('/admin/media') && !url.includes('/images') && !url.includes('/videos') && !url.includes('/documents') ? 'active' : ''}`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDropToRoot}
                            >
                                <span className="material-icons-outlined">dashboard</span>
                                <span>All Media</span>
                            </Link>
                            <Link 
                                href={route('admin.media.index', { tab: 'images' })} 
                                className={`sidebar-item ${isActive('/admin/media/images') || url.includes('tab=images') ? 'active' : ''}`}
                            >
                                <span className="material-icons-outlined">image</span>
                                <span>Images</span>
                            </Link>
                            <Link 
                                href={route('admin.media.index', { tab: 'videos' })} 
                                className={`sidebar-item ${isActive('/admin/media/videos') || url.includes('tab=videos') ? 'active' : ''}`}
                            >
                                <span className="material-icons-outlined">videocam</span>
                                <span>Videos</span>
                            </Link>
                            <Link 
                                href={route('admin.media.index', { tab: 'documents' })} 
                                className={`sidebar-item ${isActive('/admin/media/documents') || url.includes('tab=documents') ? 'active' : ''}`}
                            >
                                <span className="material-icons-outlined">description</span>
                                <span>Documents</span>
                            </Link>
                        </>
                    )}
                </div>
            </div>

            <div className="sidebar-section">
                <h3 className="sidebar-title">Folders</h3>
                <div className="folder-tree">
                    {folders.map(folder => (
                        <div 
                            key={folder.id} 
                            className={`tree-item ${currentFolder?.id === folder.id ? 'active' : ''}`}
                            onClick={() => handleFolderClick(folder)}
                            draggable
                            onDragStart={(e) => handleDragStartFolder(e, folder)}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDropToFolder(e, folder)}
                        >
                            <span className="material-icons-outlined">folder</span>
                            <span className="folder-name">{folder.name}</span>
                        </div>
                    ))}
                    {folders.length === 0 && (
                        <div className="empty-tree">No subfolders</div>
                    )}
                </div>
            </div>

            <div className="sidebar-section mt-auto">
                <h3 className="sidebar-title">Storage</h3>
                <div className="storage-widget">
                    <div className="storage-info">
                        <span>{formatSize(storageUsage.used)} used</span>
                        <span>{formatSize(storageUsage.total)}</span>
                    </div>
                    <div className="progress-bar-wrapper">
                        <div 
                            className={`progress-bar ${percentage > 90 ? 'danger' : ''}`} 
                            style={{ width: `${percentage}%` }}
                        ></div>
                    </div>
                    <p className="storage-text">{percentage.toFixed(1)}% of 1 GB used</p>
                </div>
            </div>
        </div>
    );
}
