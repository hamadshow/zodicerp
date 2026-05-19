import React from 'react';

/**
 * ActionsCell Component
 * A reusable component for table row actions (View, Edit, Delete).
 * 
 * @param {Function} onView - Callback for view action
 * @param {Function} onEdit - Callback for edit action
 * @param {Function} onDelete - Callback for delete action
 * @param {string} viewTitle - Tooltip title for view button
 * @param {string} editTitle - Tooltip title for edit button
 * @param {string} deleteTitle - Tooltip title for delete button
 * @param {React.ReactNode} viewIcon - Custom icon for view button
 * @param {React.ReactNode} editIcon - Custom icon for edit button
 * @param {React.ReactNode} deleteIcon - Custom icon for delete button
 * @param {boolean} disabled - Disable all buttons
 */
const ActionsCell = ({ 
    onView, 
    onEdit, 
    onDelete, 
    viewTitle = "عرض", 
    editTitle = "تعديل", 
    deleteTitle = "حذف",
    viewIcon = <i className="fa-solid fa-eye"></i>,
    editIcon = <i className="fa-solid fa-pen-to-square"></i>,
    deleteIcon = <i className="fa-solid fa-trash-can"></i>,
    disabled = false
}) => {
    return (
        <div className="actions-cell">
            {onView && (
                <button 
                    type="button"
                    className="action-btn btn-view" 
                    title={viewTitle} 
                    onClick={onView}
                    disabled={disabled}
                >
                    {viewIcon}
                </button>
            )}
            
            {onEdit && (
                <button 
                    type="button"
                    className="action-btn btn-edit" 
                    title={editTitle} 
                    onClick={onEdit}
                    disabled={disabled}
                >
                    {editIcon}
                </button>
            )}
            
            {onDelete && (
                <button 
                    type="button"
                    className="action-btn btn-delete" 
                    title={deleteTitle} 
                    onClick={onDelete}
                    disabled={disabled}
                >
                    {deleteIcon}
                </button>
            )}
        </div>
    );
};

export default ActionsCell;
