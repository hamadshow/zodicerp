import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import '../../../../css/backend/main.scss';


const Deductions = () => {
  const initialDeductions = [
    {
      id: 1,
      employee: 'John Doe',
      type: 'Late Arrival',
      amount: 50,
      date: '2023-10-15',
      reason: 'Arrived 1 hour late',
      status: 'Approved'
    },
    {
      id: 2,
      employee: 'Jane Smith',
      type: 'Equipment Damage',
      amount: 150,
      date: '2023-10-12',
      reason: 'Damaged keyboard',
      status: 'Pending'
    },
    {
      id: 3,
      employee: 'Michael Brown',
      type: 'Loan Repayment',
      amount: 200,
      date: '2023-10-01',
      reason: 'Monthly installment',
      status: 'Approved'
    }
  ];

  const [deductions, setDeductions] = useState(initialDeductions);
  const [filteredDeductions, setFilteredDeductions] = useState(initialDeductions);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDeduction, setCurrentDeduction] = useState(null);

  useEffect(() => {
    const lowerSearch = searchTerm.toLowerCase();
    const filtered = deductions.filter(d => 
      d.employee.toLowerCase().includes(lowerSearch) ||
      d.type.toLowerCase().includes(lowerSearch)
    );
    setFilteredDeductions(filtered);
  }, [searchTerm, deductions]);

  const openModal = (deduction = null) => {
    setCurrentDeduction(deduction);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentDeduction(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newDeduction = {
      id: currentDeduction ? currentDeduction.id : Date.now(),
      employee: formData.get('employee'),
      type: formData.get('type'),
      amount: parseFloat(formData.get('amount')),
      date: formData.get('date'),
      reason: formData.get('reason'),
      status: formData.get('status')
    };

    if (currentDeduction) {
      setDeductions(deductions.map(d => d.id === currentDeduction.id ? newDeduction : d));
    } else {
      setDeductions([...deductions, newDeduction]);
    }
    closeModal();
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this deduction?')) {
      setDeductions(deductions.filter(d => d.id !== id));
    }
  };

  return (
    <AdminLayout activeMenu="Deductions">
      <Head title="Deductions" />
      
      <div className="deductions-page">
        <div className="breadcrumb">
            <a href="#">Dashboard</a>
            <span>/</span>
            <a href="#">Human Resource</a>
            <span>/</span>
            <span>Deductions</span>
        </div>

        <div className="deductions-card">
            <div className="deductions-actions">
                <div className="search-bar light" style={{ marginRight: 'auto' }}>
                    <input 
                      type="text" 
                      placeholder="Search deductions..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button>
                        <span className="material-icons-outlined">search</span>
                    </button>
                </div>

                <button className="btn btn-primary" onClick={() => openModal()}>
                    <span className="material-icons-outlined">add</span>
                    <span>Add Deduction</span>
                </button>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>EMPLOYEE</th>
                            <th>TYPE</th>
                            <th>AMOUNT</th>
                            <th>DATE</th>
                            <th>REASON</th>
                            <th>STATUS</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredDeductions.map(deduction => (
                          <tr key={deduction.id}>
                              <td>
                                  <div style={{ fontWeight: 600 }}>{deduction.employee}</div>
                              </td>
                              <td>{deduction.type}</td>
                              <td>${deduction.amount.toFixed(2)}</td>
                              <td>{deduction.date}</td>
                              <td>{deduction.reason}</td>
                              <td>
                                  <span className={`status-badge status-${deduction.status.toLowerCase()}`}>
                                      {deduction.status}
                                  </span>
                              </td>
                              <td>
                                  <button className="icon-btn edit" onClick={() => openModal(deduction)}>
                                      <span className="material-icons-outlined">edit</span>
                                  </button>
                                  <button className="icon-btn delete" onClick={() => handleDelete(deduction.id)}>
                                      <span className="material-icons-outlined">delete</span>
                                  </button>
                              </td>
                          </tr>
                        ))}
                        {filteredDeductions.length === 0 && (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>No deductions found</td>
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
                    <h3 className="modal-title">{currentDeduction ? 'Edit Deduction' : 'Add New Deduction'}</h3>
                    <button className="modal-close" onClick={closeModal}>
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Employee Name</label>
                            <input type="text" className="form-control" name="employee" defaultValue={currentDeduction?.employee} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Deduction Type</label>
                            <select className="form-control" name="type" defaultValue={currentDeduction?.type || 'Late Arrival'}>
                                <option>Late Arrival</option>
                                <option>Absent</option>
                                <option>Equipment Damage</option>
                                <option>Loan Repayment</option>
                                <option>Other</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Amount ($)</label>
                            <input type="number" className="form-control" name="amount" defaultValue={currentDeduction?.amount} required step="0.01" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Date</label>
                            <input type="date" className="form-control" name="date" defaultValue={currentDeduction?.date} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Reason</label>
                            <textarea className="form-control form-textarea" name="reason" defaultValue={currentDeduction?.reason}></textarea>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select className="form-control" name="status" defaultValue={currentDeduction?.status || 'Pending'}>
                                <option>Pending</option>
                                <option>Approved</option>
                                <option>Rejected</option>
                            </select>
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn" onClick={closeModal}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Save Deduction</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Deductions;
