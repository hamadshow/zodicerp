import React, { useState, useEffect } from 'react';

export default function FilePreviewModal({ file, isOpen, onClose }) {
    const [pdfError, setPdfError] = useState(false);

    const getFileUrl = () => {
        if (!file) return '';
        if (file.file_url) return file.file_url;
        const basePath = file.file_path || file.path || '';
        return basePath ? `/media-files/${basePath.replace(/^\/?(storage|media-files)\//, '')}` : '';
    };

    useEffect(() => {
        if (file && file.file_type && file.file_type.includes('pdf')) {
            setPdfError(false);
            fetch(getFileUrl(), { method: 'HEAD' })
                .then(res => {
                    if (!res.ok) setPdfError(true);
                })
                .catch(() => setPdfError(true));
        }
    }, [file]);

    if (!isOpen || !file) return null;

    const fileUrl = getFileUrl();

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const copyToClipboard = () => {
        if (!fileUrl) return;
        navigator.clipboard.writeText(fileUrl);
        alert('Link copied to clipboard!');
    };

    const renderPreview = () => {
        if (file.file_type.includes('image')) {
            return (
                <div className="preview-image-container">
                    <img src={fileUrl} alt={file.name} className="preview-img" />
                </div>
            );
        } else if (file.file_type.includes('video')) {
            return (
                <div className="preview-video-container">
                    <video controls className="preview-video">
                        <source src={fileUrl} type={file.file_type} />
                        Your browser does not support the video tag.
                    </video>
                </div>
            );
        } else if (file.file_type.includes('pdf')) {
            if (pdfError) {
                return (
                    <div className="preview-generic-container preview-generic">
                        <span className="material-icons-outlined preview-generic-icon" style={{color: '#ef4444'}}>error_outline</span>
                        <p className="preview-generic-text">Failed to load PDF preview (File not found or inaccessible)</p>
                        <div className="pdf-actions" style={{ marginTop: '15px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                                <span className="material-icons-outlined" style={{ fontSize: '18px' }}>open_in_new</span>
                                Open in New Tab
                            </a>
                            <a href={fileUrl} download className="btn btn-secondary">
                                <span className="material-icons-outlined" style={{ fontSize: '18px' }}>download</span>
                                Download
                            </a>
                        </div>
                    </div>
                );
            }
            return (
                <div className="preview-pdf-container">
                    <iframe src={fileUrl} className="preview-iframe" title={file.name} onError={() => setPdfError(true)}>
                        <p>Your browser does not support iframes.</p>
                    </iframe>
                    <div className="pdf-actions" style={{ marginTop: '15px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                            <span className="material-icons-outlined" style={{ fontSize: '18px' }}>open_in_new</span>
                            Open in New Tab
                        </a>
                        <a href={fileUrl} download className="btn btn-secondary">
                            <span className="material-icons-outlined" style={{ fontSize: '18px' }}>download</span>
                            Download
                        </a>
                    </div>
                </div>
            );
        } else {
            return (
                <div className="preview-generic-container preview-generic">
                    <span className="material-icons-outlined preview-generic-icon">description</span>
                    <p className="preview-generic-text">No preview available</p>
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary preview-download-link">
                        Download File
                    </a>
                </div>
            );
        }
    };

    return (
        <div className="media-page modal-overlay active z-index-9999" onClick={onClose}>
            <div className="modal-card max-w-800" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>File Details</h3>
                    <button className="close-btn" onClick={onClose}>
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>
                <div className="modal-body flex-col-gap">
                    <div className="preview-section-container">
                        {renderPreview()}
                    </div>
                    
                    <div className="details-section">
                        <table className="details-table">
                            <tbody>
                                <tr>
                                    <td className="details-label">Name:</td>
                                    <td className="details-value bold">{file.name}</td>
                                </tr>
                                <tr>
                                    <td className="details-label">Type:</td>
                                    <td className="details-value">{file.file_type}</td>
                                </tr>
                                <tr>
                                    <td className="details-label">Size:</td>
                                    <td className="details-value">{formatSize(file.size)}</td>
                                </tr>
                                <tr>
                                    <td className="details-label">Uploaded:</td>
                                    <td className="details-value">{new Date(file.created_at).toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td className="details-label">URL:</td>
                                    <td className="url-cell">
                                        <input 
                                            type="text" 
                                            readOnly 
                                            value={fileUrl} 
                                            className="url-input"
                                        />
                                        <button 
                                            className="btn btn-outline btn-sm" 
                                            onClick={copyToClipboard}
                                            title="Copy Link"
                                        >
                                            <span className="material-icons-outlined copy-icon">content_copy</span>
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
                    <a href={fileUrl} download className="btn btn-primary">
                        <span className="material-icons-outlined download-icon">download</span> Download
                    </a>
                </div>
            </div>
        </div>
    );
}
