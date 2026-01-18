import React from 'react';

const Table = ({ tableData, handleRowSelect, selectAll, handleSelectAll }) => {
  const handleEdit = () => {
    // Navigate to edit page
    // In a real app, you would use navigate() from react-router-dom
  };

  const handleDelete = () => {
    // Handle delete action
    // In a real app, you would implement delete logic here
  };

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
            <th>
              ID{' '}
              <span className="material-icons-outlined table-header-icon">
                arrow_drop_down
              </span>
            </th>
            <th>
              NAME{' '}
              <span className="material-icons-outlined table-header-icon">
                arrow_drop_down
              </span>
            </th>
            <th>
              TEMPLATE{' '}
              <span className="material-icons-outlined table-header-icon">
                arrow_drop_down
              </span>
            </th>
            <th>
              CREATED AT{' '}
              <span className="material-icons-outlined table-header-icon">
                arrow_drop_down
              </span>
            </th>
            <th>
              STATUS{' '}
              <span className="material-icons-outlined table-header-icon">
                arrow_drop_down
              </span>
            </th>
            <th>
              <div className="language-flags">
                <div className="flag eg" title="Arabic"></div>
                <div className="flag us" title="English"></div>
              </div>
            </th>
            <th>OPERATIONS</th>
          </tr>
        </thead>
        <tbody>
          {tableData.map((row, index) => (
            <tr key={row.id || index}>
              <td>
                <input
                  type="checkbox"
                  checked={row.selected || false}
                  onChange={() => handleRowSelect(row.id || index)}
                />
              </td>
              <td>{row.id}</td>
              <td>
                <a href={`/admin/pages/${row.id}`} className="table-link">
                  {row.name}
                </a>
              </td>
              <td>{row.template}</td>
              <td>{row.createdAt}</td>
              <td>
                <span className="status status-published">{row.status}</span>
              </td>
              <td>
                <span className="material-icons-outlined status-icon success">
                  check_circle
                </span>
                <span className="material-icons-outlined status-icon info">
                  edit
                </span>
              </td>
              <td>
                <button
                  className="icon-btn edit"
                  onClick={handleEdit}
                >
                  <span className="material-icons-outlined">edit</span>
                </button>
                <button
                  className="icon-btn delete"
                  onClick={handleDelete}
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
