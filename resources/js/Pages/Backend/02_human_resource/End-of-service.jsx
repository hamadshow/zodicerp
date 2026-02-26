import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/main.scss';

const EndOfService = () => {
  const initialEos = [
    {
      id: 1,
      employee: 'John Doe',
      type: 'Resignation',
      date: '2023-11-30',
      reason: 'Moving to another city',
      amount: 5000,
      status: 'Processed'
    },
    {
      id: 2,
      employee: 'Jane Smith',
      type: 'Termination',
      date: '2023-10-15',
      reason: 'Performance issues',
      amount: 2500,
      status: 'Pending'
    },
    {
      id: 3,
      employee: 'Michael Brown',
      type: 'Contract End',
      date: '2023-12-31',
      reason: 'Contract expired',
      amount: 4000,
      status: 'Pending'
    }
  ];

  const [eosList, setEosList] = useState(initialEos);
  const [filteredEos, setFilteredEos] = useState(initialEos);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEos, setCurrentEos] = useState(null);

  useEffect(() => {
    const lowerSearch = searchTerm.toLowerCase();
    const filtered = eosList.filter(e => 
      e.employee.toLowerCase().includes(lowerSearch) ||
      e.type.toLowerCase().includes(lowerSearch)
    );
    setFilteredEos(filtered);
  }, [searchTerm, eosList]);

  const openModal = (eos = null) => {
    setCurrentEos(eos);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentEos(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newEos = {
      id: currentEos ? currentEos.id : Date.now(),
      employee: formData.get('employee'),
      type: formData.get('type'),
      date: formData.get('date'),
      reason: formData.get('reason'),
      amount: parseFloat(formData.get('amount')),
      status: formData.get('status')
    };

    if (currentEos) {
      setEosList(eosList.map(e => e.id === currentEos.id ? newEos : e));
    } else {
      setEosList([...eosList, newEos]);
    }
    closeModal();
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this record?')) {
      setEosList(eosList.filter(e => e.id !== id));
    }
  };

  return (
    <AdminLayout activeMenu="End of service">
      <Head title="End of Service" />
      
      <div className="eos-page">
        <div className="breadcrumb">
            <a href="#">Dashboard</a>
            <span>/</span>
            <a href="#">Human Resource</a>
            <span>/</span>
            <span>End of Service</span>
        </div>

        <div className="eos-card">
            <div className="eos-actions">
                <div className="search-bar light" style={{ marginRight: 'auto' }}>
                    <input 
                      type="text" 
                      placeholder="Search records..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button>
                        <span className="material-icons-outlined">search</span>
                    </button>
                </div>

                <button className="btn btn-primary" onClick={() => openModal()}>
                    <span className="material-icons-outlined">add</span>
                    <span>Add Record</span>
                </button>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>EMPLOYEE</th>
                            <th>TYPE</th>
                            <th>DATE</th>
                            <th>REASON</th>
                            <th>AMOUNT</th>
                            <th>STATUS</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEos.map(eos => (
                          <tr key={eos.id}>
                              <td>
                                  <div style={{ fontWeight: 600 }}>{eos.employee}</div>
                              </td>
                              <td>{eos.type}</td>
                              <td>{eos.date}</td>
                              <td>{eos.reason}</td>
                              <td>${eos.amount.toFixed(2)}</td>
                              <td>
                                  <span className={`status-badge status-${eos.status.toLowerCase()}`}>
                                      {eos.status}
                                  </span>
                              </td>
                              <td>
                                  <button className="icon-btn edit" onClick={() => openModal(eos)}>
                                      <span className="material-icons-outlined">edit</span>
                                  </button>
                                  <button className="icon-btn delete" onClick={() => handleDelete(eos.id)}>
                                      <span className="material-icons-outlined">delete</span>
                                  </button>
                              </td>
                          </tr>
                        ))}
                        {filteredEos.length === 0 && (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>No records found</td>
                          </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if(e.target === e.currentTarget) closeModal(); }}>
            <div className="modal">
                <div className="modal-header">
                    <h3 className="modal-title">{currentEos ? 'Edit Record' : 'Add New Record'}</h3>
                    <button className="modal-close" onClick={closeModal}>
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Employee Name</label>
                            <input type="text" className="form-control" name="employee" defaultValue={currentEos?.employee} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Type</label>
                            <select className="form-control" name="type" defaultValue={currentEos?.type || 'Resignation'}>
                                <option>Resignation</option>
                                <option>Termination</option>
                                <option>Contract End</option>
                                <option>Retirement</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Last Working Date</label>
                            <input type="date" className="form-control" name="date" defaultValue={currentEos?.date} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Amount ($)</label>
                            <input type="number" className="form-control" name="amount" defaultValue={currentEos?.amount} required step="0.01" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Reason</label>
                            <textarea className="form-control form-textarea" name="reason" defaultValue={currentEos?.reason}></textarea>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select className="form-control" name="status" defaultValue={currentEos?.status || 'Pending'}>
                                <option>Pending</option>
                                <option>Processed</option>
                                <option>Cancelled</option>
                            </select>
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn" onClick={closeModal}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Save Record</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default EndOfService;
