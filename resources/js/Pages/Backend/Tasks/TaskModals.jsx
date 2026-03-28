import React from 'react';

export const AddEditTaskModal = ({
  closeModal,
  editingTask,
  handleSubmit,
  formData,
  handleInputChange,
  categories,
  priorities,
  statuses,
  employees,
  setFormData
}) => {
  const employeeList = employees || [];
  
  return (
    <div className="modal-overlay active" onClick={closeModal}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {editingTask ? 'Edit Task' : 'Add New Task'}
          </h3>
          <button className="modal-close" onClick={closeModal}>
            <span className="material-icons-outlined">close</span>
          </button>
        </div>
        <div className="modal-body">
          <form id="taskForm" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input
                type="text"
                className="form-control"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter task title"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-control form-textarea"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter task description"
                rows="3"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select
                  className="form-control"
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority *</label>
                <select
                  className="form-control"
                  name="priority_id"
                  value={formData.priority_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Priority</option>
                  {priorities.map((priority) => (
                    <option key={priority.id} value={priority.id}>
                      {priority.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Status *</label>
                <select
                  className="form-control"
                  name="status_id"
                  value={formData.status_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Status</option>
                  {statuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input
                  type="date"
                  className="form-control"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Assigned Employees</label>
              <select
                className="form-control"
                name="assigned_users"
                multiple
                value={formData.assigned_users}
                onChange={(e) => {
                  const selectedOptions = Array.from(
                    e.target.selectedOptions,
                    (option) => option.value
                  );
                  setFormData((prev) => ({
                    ...prev,
                    assigned_users: selectedOptions,
                  }));
                }}
              >
                {employeeList.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
              <small className="form-text text-muted">
                Hold Ctrl (Cmd on Mac) to select multiple users
              </small>
            </div>
          </form>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={closeModal}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
          >
            {editingTask ? 'Update' : 'Create'} Task
          </button>
        </div>
      </div>
    </div>
  );
};

export const ViewTaskModal = ({
  closeViewModal,
  taskDetails,
  detailsLoading,
  openModal,
  deleteTask,
  formatDate,
  taskComments,
  newComment,
  setNewComment,
  handleAddComment,
  commentLoading,
  taskAttachments,
  handleFileUpload,
  attachmentLoading,
  handleFileDownload,
  taskHistory
}) => (
  <div className="modal-overlay active" onClick={closeViewModal}>
    <div
      className="modal task-details-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="modal-header">
        <h3 className="modal-title">Task Details</h3>
        <div className="modal-actions-header">
          <button
            className="icon-btn edit"
            onClick={() => openModal(taskDetails)}
            title="Edit task"
          >
            <span className="material-icons-outlined">edit</span>
          </button>
          <button
            className="icon-btn delete"
            onClick={() => {
              if (
                window.confirm(
                  'Are you sure you want to delete this task? This action cannot be undone.'
                )
              ) {
                deleteTask(taskDetails.id);
                closeViewModal();
              }
            }}
            title="Delete task"
          >
            <span className="material-icons-outlined">delete</span>
          </button>
          <button className="modal-close" onClick={closeViewModal}>
            <span className="material-icons-outlined">close</span>
          </button>
        </div>
      </div>
      <div className="modal-body">
        {detailsLoading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading task details...</p>
          </div>
        ) : taskDetails ? (
          <div className="task-details-content">
            <div className="details-section">
              <h4 className="section-title">
                <span className="material-icons-outlined">info</span>
                Task Information
              </h4>
              <div className="task-info-grid">
                <div className="info-item">
                  <label>Title</label>
                  <span>{taskDetails.title}</span>
                </div>
                <div className="info-item">
                  <label>Description</label>
                  <span>{taskDetails.description || 'No description'}</span>
                </div>
                <div className="info-item">
                  <label>Category</label>
                  <span
                    className={`category-badge category-${taskDetails.category?.name.toLowerCase().replace(' ', '-') || 'default'}`}
                  >
                    {taskDetails.category?.name || 'N/A'}
                  </span>
                </div>
                <div className="info-item">
                  <label>Priority</label>
                  <span
                    className={`priority-badge priority-${taskDetails.priority?.name.toLowerCase().replace(' ', '-') || 'medium'}`}
                  >
                    {taskDetails.priority?.name || 'Medium'}
                  </span>
                </div>
                <div className="info-item">
                  <label>Status</label>
                  <span
                    className={`status-badge status-${taskDetails.status?.name.toLowerCase().replace(' ', '-') || 'todo'}`}
                  >
                    {taskDetails.status?.name || 'Todo'}
                  </span>
                </div>
                <div className="info-item">
                  <label>Due Date</label>
                  <span>{formatDate(taskDetails.due_date) || 'No date'}</span>
                </div>
                <div className="info-item">
                  <label>Created By</label>
                  <span>{taskDetails.creator?.name || 'Unknown'}</span>
                </div>
                <div className="info-item">
                  <label>Assigned To</label>
                  <div className="assignees-list">
                    {taskDetails.assignments && taskDetails.assignments.length > 0 ? (
                      taskDetails.assignments.map((assignment) => (
                        <span key={assignment.id} className="assignee-tag">
                          {assignment.employee?.name || 'Unknown'}
                        </span>
                      ))
                    ) : (
                      'No one assigned'
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="details-section">
              <h4 className="section-title">
                <span className="material-icons-outlined">attachment</span>
                Attachments ({taskAttachments.length})
              </h4>
              <div className="attachments-list">
                {taskAttachments.length > 0 ? (
                  taskAttachments.map((attachment) => (
                    <div key={attachment.id} className="attachment-item">
                      <span className="material-icons-outlined">description</span>
                      <span className="file-name">{attachment.file_name}</span>
                      <button
                        className="btn-link"
                        onClick={() => handleFileDownload(attachment)}
                      >
                        Download
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="no-data">No attachments yet</p>
                )}
                <div className="upload-section">
                  <input
                    type="file"
                    id="task-file-upload"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    disabled={attachmentLoading}
                  />
                  <label htmlFor="task-file-upload" className="btn btn-outline btn-sm">
                    {attachmentLoading ? 'Uploading...' : 'Upload File'}
                  </label>
                </div>
              </div>
            </div>

            <div className="details-section">
              <h4 className="section-title">
                <span className="material-icons-outlined">forum</span>
                Comments ({taskComments.length})
              </h4>
              <div className="comments-section">
                <div className="comments-list">
                  {taskComments.length > 0 ? (
                    taskComments.map((comment) => (
                      <div key={comment.id} className="comment-item">
                        <div className="comment-header">
                          <span className="comment-author">{comment.user?.name}</span>
                          <span className="comment-date">{formatDate(comment.created_at)}</span>
                        </div>
                        <div className="comment-body">{comment.comment}</div>
                      </div>
                    ))
                  ) : (
                    <p className="no-data">No comments yet</p>
                  )}
                </div>
                <div className="comment-input-area">
                  <textarea
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows="2"
                  ></textarea>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleAddComment}
                    disabled={commentLoading || !newComment.trim()}
                  >
                    {commentLoading ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              </div>
            </div>

            <div className="details-section">
              <h4 className="section-title">
                <span className="material-icons-outlined">history</span>
                Task History
              </h4>
              <div className="history-list">
                {taskHistory.length > 0 ? (
                  taskHistory.map((history) => (
                    <div key={history.id} className="history-item">
                      <span className="history-action">{history.action}</span>
                      <span className="history-date">{formatDate(history.created_at)}</span>
                    </div>
                  ))
                ) : (
                  <p className="no-data">No history recorded</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="error-state">
            <p>Task details not found.</p>
          </div>
        )}
      </div>
    </div>
  </div>
);
