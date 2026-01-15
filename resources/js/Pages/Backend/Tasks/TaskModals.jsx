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
}) => (
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
            <label className="form-label">Assigned Users</label>
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
              {employees.map((employee) => (
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
            {/* Task Information */}
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
                    className={`status-badge status-${taskDetails.status?.name.toLowerCase().replace(' ', '-') || 'pending'}`}
                  >
                    {taskDetails.status?.name || 'Pending'}
                  </span>
                </div>
                <div className="info-item">
                  <label>Due Date</label>
                  <span>{formatDate(taskDetails.due_date)}</span>
                </div>
                <div className="info-item">
                  <label>Assigned Users</label>
                  <span>
                    {taskDetails.assignments &&
                    taskDetails.assignments.length > 0
                      ? taskDetails.assignments
                          .map((a) => a.user?.name)
                          .join(', ')
                      : 'Unassigned'}
                  </span>
                </div>
                <div className="info-item">
                  <label>Created By</label>
                  <span>{taskDetails.creator?.name || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Created At</label>
                  <span>{formatDate(taskDetails.created_at)}</span>
                </div>
                <div className="info-item">
                  <label>Last Updated</label>
                  <span>{formatDate(taskDetails.updated_at)}</span>
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div className="details-section">
              <h4 className="section-title">
                <span className="material-icons-outlined">comment</span>
                Comments ({taskComments.length})
              </h4>
              <div className="comments-section">
                <div className="add-comment">
                  <textarea
                    className="comment-input"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows="3"
                  />
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || commentLoading}
                  >
                    {commentLoading ? 'Adding...' : 'Add Comment'}
                  </button>
                </div>
                <div className="comments-list">
                  {taskComments.length === 0 ? (
                    <p className="no-comments">No comments yet.</p>
                  ) : (
                    taskComments.map((comment) => (
                      <div key={comment.id} className="comment-item">
                        <div className="comment-header">
                          <span className="comment-author">
                            {comment.user?.name || 'Unknown'}
                          </span>
                          <span className="comment-date">
                            {formatDate(comment.created_at)}
                          </span>
                        </div>
                        <div className="comment-content">
                          {comment.comment}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Attachments Section */}
            <div className="details-section">
              <h4 className="section-title">
                <span className="material-icons-outlined">attach_file</span>
                Attachments ({taskAttachments.length})
              </h4>
              <div className="attachments-section">
                <div className="upload-section">
                  <input
                    type="file"
                    id="file-upload"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="file-upload" className="upload-btn">
                    <span className="material-icons-outlined">
                      cloud_upload
                    </span>
                    {attachmentLoading ? 'Uploading...' : 'Upload File'}
                  </label>
                </div>
                <div className="attachments-list">
                  {taskAttachments.length === 0 ? (
                    <p className="no-attachments">No attachments yet.</p>
                  ) : (
                    taskAttachments.map((attachment) => (
                      <div key={attachment.id} className="attachment-item">
                        <div className="attachment-info">
                          <span className="material-icons-outlined">
                            insert_drive_file
                          </span>
                          <span className="attachment-name">
                            {attachment.file_name}
                          </span>
                          <span className="attachment-date">
                            {formatDate(attachment.created_at)}
                          </span>
                        </div>
                        <button
                          className="download-btn"
                          onClick={() => handleFileDownload(attachment)}
                          title="Download"
                        >
                          <span className="material-icons-outlined">
                            download
                          </span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* History/Timeline Section */}
            <div className="details-section">
              <h4 className="section-title">
                <span className="material-icons-outlined">timeline</span>
                Activity Timeline
              </h4>
              <div className="timeline">
                {taskHistory.map((item, index) => (
                  <div key={index} className="timeline-item">
                    <div className="timeline-marker">
                      <span
                        className={`material-icons-outlined timeline-icon ${item.type}`}
                      >
                        {item.type === 'created'
                          ? 'add_circle'
                          : item.type === 'updated'
                            ? 'edit'
                            : item.type === 'comment'
                              ? 'comment'
                              : item.type === 'attachment'
                                ? 'attach_file'
                                : 'info'}
                      </span>
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="timeline-user">
                          {item.user?.name || 'System'}
                        </span>
                        <span className="timeline-date">
                          {formatDate(item.date)}
                        </span>
                      </div>
                      <div className="timeline-description">
                        {item.description}
                      </div>
                      {item.content && (
                        <div className="timeline-content-preview">
                          {item.type === 'comment'
                            ? item.content
                            : item.type === 'attachment'
                              ? `File: ${item.content}`
                              : ''}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="error-state">
            <span className="material-icons-outlined">error</span>
            <p>Failed to load task details.</p>
          </div>
        )}
      </div>
    </div>
  </div>
);
