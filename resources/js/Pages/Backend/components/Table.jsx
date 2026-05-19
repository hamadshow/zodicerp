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
  viewTitle = "عرض",
  editTitle = "تعديل",
  deleteTitle = "حذف",
  disabled = false
}) => {
  const { props } = usePage();
  const isArabic = props.localization?.current_locale === 'ar';
  const textAlign = isArabic ? 'right' : 'left';

  return (
    <div className="table-container">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign }}>
              <input
                type="checkbox"
                id="selectAll"
                onChange={handleSelectAll}
                checked={selectAll}
              />
            </th>
            {columns.map((column, index) => (
              <th key={index} style={{ textAlign }}>
                {column.header}
                {column.sortable && (
                  <span className="material-icons-outlined table-header-icon">
                    arrow_drop_down
                  </span>
                )}
              </th>
            ))}
            <th style={{ textAlign }}>OPERATIONS</th>
          </tr>
        </thead>
        <tbody>
          {tableData.length > 0 ? (
            tableData.map((row, rowIndex) => (
              <tr key={row.id || rowIndex}>
                <td style={{ textAlign }}>
                  <input
                    type="checkbox"
                    checked={row.selected || false}
                    onChange={() => handleRowSelect(row.id || rowIndex)}
                  />
                </td>
                {columns.map((column, colIndex) => (
                  <td key={colIndex} style={{ textAlign }}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
                <td style={{ textAlign }}>
                  <div className="actions-cell" style={{ justifyContent: isArabic ? 'flex-start' : 'flex-start' }}>
                    {onView && (
                      <button 
                        type="button"
                        className="action-btn btn-view" 
                        title={viewTitle} 
                        onClick={() => onView(row)}
                        disabled={disabled}
                      >
                        <i className="fa-solid fa-eye"></i>
                      </button>
                    )}
                    
                    {onEdit && (
                      <button 
                        type="button"
                        className="action-btn btn-edit" 
                        title={editTitle} 
                        onClick={() => onEdit(row)}
                        disabled={disabled}
                      >
                        <i className="fa-solid fa-pen-to-square"></i>
                      </button>
                    )}
                    
                    {onDelete && (
                      <button 
                        type="button"
                        className="action-btn btn-delete" 
                        title={deleteTitle} 
                        onClick={() => onDelete(row)}
                        disabled={disabled}
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length + 2} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                {isArabic ? 'لا توجد بيانات متاحة' : 'No data available'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
