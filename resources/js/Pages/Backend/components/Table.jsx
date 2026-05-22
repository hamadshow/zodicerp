import React from 'react';
import { usePage } from '@inertiajs/react';

const Table = ({ 
  tableData, 
  columns, 
  handleRowSelect, 
  selectAll, 
  handleSelectAll,
  onView,
  onEdit,
  onDelete,
  viewTitle = "View",
  editTitle = "Edit",
  deleteTitle = "Delete",
  disabled = false
}) => {
  const { props } = usePage();
  const isArabic = props.localization?.current_locale === 'ar';
  
  return (
    <div className="table-container">
      <table className="table-custom">
        <thead>
          <tr>
            <th style={{ width: '40px', textAlign: 'center' }}>
              <input
                type="checkbox"
                id="selectAll"
                onChange={handleSelectAll}
                checked={selectAll}
              />
            </th>
            {columns.map((column, index) => (
              <th key={index} style={{ width: column.width }}>
                {column.header}
                {column.sortable && (
                  <span className="material-icons-outlined table-header-icon">
                    arrow_drop_down
                  </span>
                )}
              </th>
            ))}
            <th style={{ width: '120px' }}>{isArabic ? 'العمليات' : 'OPERATIONS'}</th>
          </tr>
        </thead>
        <tbody>
          {tableData.length > 0 ? (
            tableData.map((row, rowIndex) => (
              <tr key={row.id || rowIndex}>
                <td style={{ textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={row.selected || false}
                    onChange={() => handleRowSelect(row.id || rowIndex)}
                  />
                </td>
                {columns.map((column, colIndex) => (
                  <td key={colIndex}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
                <td>
                  <div className="actions-cell">
                    {onView && (
                      <button 
                        type="button"
                        className="action-btn" 
                        title={viewTitle} 
                        onClick={() => onView(row)}
                        disabled={disabled}
                      >
                        <span className="material-icons-outlined">visibility</span>
                      </button>
                    )}
                    
                    {onEdit && (
                      <button 
                        type="button"
                        className="action-btn" 
                        title={editTitle} 
                        onClick={() => onEdit(row)}
                        disabled={disabled}
                      >
                        <span className="material-icons-outlined">edit</span>
                      </button>
                    )}
                    
                    {onDelete && (
                      <button 
                        type="button"
                        className="action-btn delete" 
                        title={deleteTitle} 
                        onClick={() => onDelete(row)}
                        disabled={disabled}
                      >
                        <span className="material-icons-outlined">delete</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length + 2} className="empty-state-row">
                <span className="material-icons-outlined empty-icon">inventory_2</span>
                <div>{isArabic ? 'لا توجد بيانات متاحة' : 'No data available'}</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
