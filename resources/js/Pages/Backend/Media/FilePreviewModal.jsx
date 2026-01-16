import React from 'react';

export default function FilePreviewModal({ file, isOpen, onClose }) {
    if (!isOpen || !file) return null;

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(file.file_path);
        // You might want to show a toast here
        alert('Link copied to clipboard!');
    };

    const renderPreview = () => {
        if (file.file_type.includes('image')) {
            return (
                <div className="preview-image-container">
                    <img src={file.file_path} alt={file.name} className="preview-img" />
                </div>
            );
        } else if (file.file_type.includes('video')) {
            return (
                <div className="preview-video-container">
                    <video controls className="preview-video">
                        <source src={file.file_path} type={file.file_type} />
                        Your browser does not support the video tag.
                    </video>
                </div>
            );
        } else if (file.file_type.includes('pdf')) {
            return (
                <div className="preview-pdf-container">
                    <iframe src={file.file_path} className="preview-iframe" title={file.name}></iframe>
                </div>
            );
        } else {
            return (
                <div className="preview-generic-container preview-generic">
                    <span className="material-icons-outlined preview-generic-icon">description</span>
                    <p className="preview-generic-text">No preview available</p>
                    <a href={file.file_path} target="_blank" rel="noopener noreferrer" className="btn btn-primary preview-download-link">
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
                                            value={file.file_path} 
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
                    <a href={file.file_path} download className="btn btn-primary">
                        <span className="material-icons-outlined download-icon">download</span> Download
                    </a>
                </div>
            </div>
        </div>
    );
}
