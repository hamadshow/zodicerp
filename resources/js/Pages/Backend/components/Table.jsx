import React from 'react';

const Table = ({ 
  tableData, 
  columns, 
  handleRowSelect, 
  selectAll, 
  handleSelectAll,
  onEdit,
  onDelete
}) => {
  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                id="selectAll"
                onChange={handleSelectAll}
                checked={selectAll}
              />
            </th>
            {columns.map((column, index) => (
              <th key={index}>
                {column.header}
                {column.sortable && (
                  <span className="material-icons-outlined table-header-icon">
                    arrow_drop_down
                  </span>
                )}
              </th>
            ))}
            <th>OPERATIONS</th>
          </tr>
        </thead>
        <tbody>
          {tableData.map((row, rowIndex) => (
            <tr key={row.id || rowIndex}>
              <td>
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
                <button
                  className="icon-btn edit"
                  onClick={() => onEdit && onEdit(row)}
                >
                  <span className="material-icons-outlined">edit</span>
                </button>
                <button
                  className="icon-btn delete"
                  onClick={() => onDelete && onDelete(row)}
                >
                  <span className="material-icons-outlined">delete</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
