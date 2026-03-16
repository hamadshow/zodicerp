import { useState, useEffect, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '../components/AdminLayout';
import { AddEditTaskModal, ViewTaskModal } from './TaskModals';
import { apiService } from '../../../services/api.js';

const resolveMediaUrl = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
    return value;
  }

  const withoutProtocol =
    typeof value === 'string' ? value.replace(/^https?:\/\/[^/]+/, '') : '';

  const relativePath = withoutProtocol.replace(
    /^\/?(files|storage|media-files)\//,
    ''
  );

  return `/media-files/${relativePath}`;
};

const TaskManager = () => {
  // State management
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDetails, setTaskDetails] = useState(null);
  const [taskComments, setTaskComments] = useState([]);
  const [taskAttachments, setTaskAttachments] = useState([]);
  const [taskHistory, setTaskHistory] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [attachmentLoading, setAttachmentLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    priority_id: '',
    status_id: '',
    due_date: '',
    assigned_users: [],
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [toast, setToast] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [statsData, setStatsData] = useState({
    totalTasks: 0,
    pendingTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
  });

  // Filter tabs
  const filterTabs = [
    { id: 'all', label: 'All Tasks' },
    { id: 'pending', label: 'Pending' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'completed', label: 'Completed' },
    { id: 'overdue', label: 'Overdue' },
  ];

  // Initialize component
  useEffect(() => {
    fetchData();
  }, []);

  // Fetch tasks when filters change
  useEffect(() => {
    if (categories.length > 0 || priorities.length > 0 || statuses.length > 0) {
      fetchTasks(1, rowsPerPage);
    }
  }, [
    searchTerm,
    statusFilter,
    priorityFilter,
    categoryFilter,
    assigneeFilter,
    rowsPerPage,
  ]);

  const fetchTasks = async (page = 1, perPage = rowsPerPage) => {
    setLoading(true);
    try {
      const params = {
        page: page,
        per_page: perPage,
        search: searchTerm,
        status_id: statusFilter,
        priority_id: priorityFilter,
        category_id: categoryFilter,
        assignee_id: assigneeFilter,
      };

      const response = await apiService.get('/tasks', params);
      const data = response.data;
      setTasks(data.data);
      setPagination(data);
      setCurrentPage(data.current_page);
    } catch {
      // Error handling is done in api.js interceptor, but we can add specific toast here if needed
      // console.error('Error fetching tasks:', error); // api.js already logs it
      showToast('Error loading tasks. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    const isJsonResponse = (res) => {
      const ct =
        res?.headers?.['content-type'] || res?.headers?.['Content-Type'] || '';
      return (
        typeof res?.data === 'object' || String(ct).includes('application/json')
      );
    };
    try {
      // Fetch data sequentially to avoid timeouts on single-threaded dev server
      
      const categoriesRes = await apiService.get('/tasks/categories');
      if (isJsonResponse(categoriesRes)) {
        const categoriesData = categoriesRes.data;
        setCategories(categoriesData.data || categoriesData);
      } else {
        console.error('Categories response is not JSON');
      }

      const prioritiesRes = await apiService.get('/tasks/priorities');
      if (isJsonResponse(prioritiesRes)) {
        const prioritiesData = prioritiesRes.data;
        setPriorities(prioritiesData.data || prioritiesData);
      } else {
        console.error('Priorities response is not JSON');
      }

      const statusesRes = await apiService.get('/tasks/statuses');
      if (isJsonResponse(statusesRes)) {
        const statusesData = statusesRes.data;
        setStatuses(statusesData.data || statusesData);
      } else {
        console.error('Statuses response is not JSON');
      }

      const employeesRes = await apiService.get('/employees', { params: { per_page: 1000 } });
      if (isJsonResponse(employeesRes)) {
        const employeesData = employeesRes.data;
        setEmployees(employeesData.data || employeesData);
      } else {
        console.error('Employees response is not JSON');
      }

      const statsRes = await apiService.get('/tasks/statistics');
      if (isJsonResponse(statsRes)) {
        const statsData = statsRes.data;
        setStatsData({
          totalTasks: statsData.total_tasks,
          pendingTasks: statsData.pending_tasks,
          completedTasks: statsData.completed_tasks,
          overdueTasks: statsData.overdue_tasks,
        });
      } else {
        console.error('Statistics response is not JSON');
      }

      await fetchTasks();
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Error loading data. Please try again.', 'error');
      setLoading(false);
    }
  };

  // Toast notification
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Modal handlers
  const openModal = useCallback((task = null) => {
    setEditingTask(task);
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        category_id: task.category_id.toString(),
        priority_id: task.priority_id.toString(),
        status_id: task.status_id.toString(),
        due_date: task.due_date || '',
        assigned_users: task.assignments
          ? task.assignments.map((a) => a.user_id.toString())
          : [],
      });
    } else {
      resetForm();
    }
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingTask(null);
    resetForm();
  }, []);

  const openViewModal = useCallback(async (task) => {
    setSelectedTask(task);
    setViewModalOpen(true);
    setDetailsLoading(true);

    try {
      const response = await apiService.get(`/tasks/${task.id}`);
      const detailedTask = response.data;
      setTaskDetails(detailedTask);
      setTaskComments(detailedTask.comments || []);
      setTaskAttachments(detailedTask.attachments || []);

      // Build history timeline
      const history = [];
      history.push({
        type: 'created',
        date: detailedTask.created_at,
        user: detailedTask.creator,
        description: 'Task created',
      });

      if (detailedTask.updated_at !== detailedTask.created_at) {
        history.push({
          type: 'updated',
          date: detailedTask.updated_at,
          user: detailedTask.creator,
          description: 'Task updated',
        });
      }

      // Add comments to history
      detailedTask.comments?.forEach((comment) => {
        history.push({
          type: 'comment',
          date: comment.created_at,
          user: comment.user,
          description: 'Added a comment',
          content: comment.comment,
        });
      });

      // Add attachments to history
      detailedTask.attachments?.forEach((attachment) => {
        history.push({
          type: 'attachment',
          date: attachment.created_at,
          user: detailedTask.creator, // Attachments don't have direct user, use task creator
          description: 'Uploaded attachment',
          content: attachment.file_name,
        });
      });

      // Sort history by date
      history.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTaskHistory(history);
    } catch {
      showToast('Error loading task details. Please try again.', 'error');
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  const closeViewModal = useCallback(() => {
    setViewModalOpen(false);
    setSelectedTask(null);
    setTaskDetails(null);
    setTaskComments([]);
    setTaskAttachments([]);
    setTaskHistory([]);
    setNewComment('');
  }, []);

  // Handle adding new comment
  const handleAddComment = useCallback(async () => {
    if (!newComment.trim() || !taskDetails) return;

    setCommentLoading(true);
    try {
      const response = await apiService.post('/comments', {
        task_id: taskDetails.id,
        comment: newComment.trim(),
      });

      const newCommentData = response.data;
      setTaskComments((prev) => [newCommentData, ...prev]);
      setTaskHistory((prev) => [
        {
          type: 'comment',
          date: newCommentData.created_at,
          user: newCommentData.user,
          description: 'Added a comment',
          content: newCommentData.comment,
        },
        ...prev,
      ]);
      setNewComment('');
      showToast('Comment added successfully!', 'success');
    } catch {
      showToast('Error adding comment. Please try again.', 'error');
    } finally {
      setCommentLoading(false);
    }
  }, [newComment, taskDetails]);

  // Handle file upload
  const handleFileUpload = useCallback(
    async (event) => {
      const file = event.target.files[0];
      if (!file || !taskDetails) return;

      setAttachmentLoading(true);
      const formData = new FormData();
      formData.append('task_id', taskDetails.id);
      formData.append('file', file);
      formData.append('file_name', file.name);

      try {
        // apiService.post handles FormData correctly if passed directly
        // axios automatically sets Content-Type to multipart/form-data when data is FormData
        const response = await apiService.post('/attachments', formData);
        const newAttachment = response.data;

        setTaskAttachments((prev) => [newAttachment, ...prev]);
        setTaskHistory((prev) => [
          {
            type: 'attachment',
            date: newAttachment.created_at,
            user: newAttachment.user || taskDetails.creator,
            description: 'Uploaded attachment',
            content: newAttachment.filename,
          },
          ...prev,
        ]);
        showToast('File uploaded successfully!', 'success');
      } catch {
        showToast('Error uploading file. Please try again.', 'error');
      } finally {
        setAttachmentLoading(false);
      }
    },
    [taskDetails]
  );

  const handleFileDownload = useCallback(
    async (attachment) => {
      try {
        const fileUrl = resolveMediaUrl(attachment.file_path);
        const link = document.createElement('a');
        link.href = fileUrl || '#';
        link.download = attachment.file_name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Error downloading file:', error);
        showToast('Error downloading file. Please try again.', 'error');
      }
    },
    []
  );

  const resetForm = useCallback(() => {
    setFormData({
      title: '',
      description: '',
      category_id: '',
      priority_id: '',
      status_id: '',
      due_date: '',
      assigned_users: [],
    });
  }, []);

  // Form handlers
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const handleAssignments = useCallback(async (taskId, assignedUserIds) => {
    try {
      // Get current assignments by fetching the task
      const taskRes = await apiService.get(`/tasks/${taskId}`);
      const currentAssignments = taskRes.data.assignments || [];

      const currentUserIds = currentAssignments.map((a) =>
        a.user_id.toString()
      );
      const newUserIds = assignedUserIds.filter(
        (id) => !currentUserIds.includes(id)
      );
      const removedAssignments = currentAssignments.filter(
        (a) => !assignedUserIds.includes(a.user_id.toString())
      );

      // Remove old assignments
      for (const assignment of removedAssignments) {
        await apiService.delete(`/assignments/${assignment.id}`);
      }

      // Add new assignments
      for (const userId of newUserIds) {
        await apiService.post('/assignments', {
          task_id: taskId,
          user_id: parseInt(userId),
        });
      }
    } catch (error) {
      console.error('Error handling assignments:', error);
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
      }
      showToast('Error updating assignments. Please try again.', 'error');
    }
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      // Basic validation
      if (
        !formData.title ||
        !formData.category_id ||
        !formData.priority_id ||
        !formData.status_id
      ) {
        showToast('Please fill in all required fields', 'error');
        return;
      }

      try {
        const taskData = {
          title: formData.title,
          description: formData.description,
          category_id: parseInt(formData.category_id),
          priority_id: parseInt(formData.priority_id),
          status_id: parseInt(formData.status_id),
          due_date: formData.due_date || null,
        };

        let response;
        if (editingTask) {
          // Update existing task
          response = await apiService.put(`/tasks/${editingTask.id}`, taskData);
        } else {
          // Create new task
          response = await apiService.post('/tasks', taskData);
        }

        const task = response.data;

        // Handle assignments
        await handleAssignments(task.id, formData.assigned_users);

        if (editingTask) {
          showToast('Task updated successfully!', 'success');
        } else {
          showToast('Task created successfully!', 'success');
        }
        closeModal();
        // Refetch tasks to get updated pagination
        fetchTasks(currentPage, rowsPerPage);
      } catch (error) {
        showToast('Error saving task. Please try again.', 'error');
        console.error('Error saving task:', error);
      }
    },
    [formData, editingTask, closeModal]
  );

  // Task operations
  const deleteTask = useCallback(async (id) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this task? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      await apiService.delete(`/tasks/${id}`);

      showToast('Task deleted successfully!', 'success');
      // Refetch tasks to get updated pagination
      fetchTasks(currentPage, rowsPerPage);
    } catch {
      showToast('Error deleting task. Please try again.', 'error');
    }
  }, []);

  const handleCheckboxChange = useCallback((id, checked) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((itemId) => itemId !== id));
    }
  }, []);

  const applyBulkAction = useCallback(
    (action) => {
      if (selectedIds.length === 0) {
        showToast('Please select at least one task.', 'warning');
        return;
      }

      if (action === 'delete') {
        if (
          window.confirm(
            `Are you sure you want to delete ${selectedIds.length} selected task(s)?`
          )
        ) {
          selectedIds.forEach((id) => deleteTask(id));
          setSelectedIds([]);
        }
        return;
      }

      showToast(`${action} action not implemented yet`, 'info');
    },
    [selectedIds, deleteTask]
  );

  // Bulk actions
  const handleSelectAll = useCallback(
    (checked) => {
      if (checked) {
        setSelectedIds(tasks.map((task) => task.id));
      } else {
        setSelectedIds([]);
      }
    },
    [tasks]
  );

  // Pagination from API
  const startIndex = pagination
    ? (pagination.current_page - 1) * pagination.per_page + 1
    : 1;
  const endIndex = pagination
    ? Math.min(pagination.current_page * pagination.per_page, pagination.total)
    : tasks.length;
  const paginatedTasks = tasks; // Tasks are already paginated from API

  // Format date helper
  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  // Use stats from API
  const stats = statsData;





  const StatsCard = ({ icon, bgColor, value, label }) => (
    <div className="stat-card">
      <div className="stat-icon" style={{ backgroundColor: bgColor }}>
        <span className="material-icons-outlined">{icon}</span>
      </div>
      <div className="stat-content">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );

  const FilterTab = ({ id, label, isActive, onClick }) => (
    <div
      className={`filter-tab ${isActive ? 'active' : ''}`}
      onClick={() => onClick(id)}
    >
      {label}
    </div>
  );

  const TaskRow = ({ task }) => {
    const isOverdue =
      task.due_date &&
      new Date(task.due_date) < new Date() &&
      task.status?.name !== 'Completed';

    return (
      <tr key={task.id} className={isOverdue ? 'overdue' : ''}>
        <td>
          <input
            type="checkbox"
            className="task-checkbox"
            checked={selectedIds.includes(task.id)}
            onChange={(e) => handleCheckboxChange(task.id, e.target.checked)}
          />
        </td>
        <td>{task.id.toString().padStart(3, '0')}</td>
        <td>
          <div className="task-info">
            <div className="task-title">{task.title}</div>
            <div className="task-description">
              {task.description
                ? task.description.substring(0, 50) +
                  (task.description.length > 50 ? '...' : '')
                : ''}
            </div>
          </div>
        </td>
        <td>{task.category?.name || 'N/A'}</td>
        <td>
          <span
            className={`priority-badge priority-${task.priority?.name.toLowerCase().replace(' ', '-') || 'medium'}`}
          >
            {task.priority?.name || 'Medium'}
          </span>
        </td>
        <td>
          <span
            className={`status-badge status-${task.status?.name.toLowerCase().replace(' ', '-') || 'pending'}`}
          >
            {task.status?.name || 'Pending'}
          </span>
        </td>
        <td>
          {task.assignments && task.assignments.length > 0
            ? task.assignments.map((a) => a.user?.name).join(', ')
            : 'Unassigned'}
        </td>
        <td>{formatDate(task.due_date)}</td>
        <td>{task.creator?.name || 'N/A'}</td>
        <td>
          <button
            className="icon-btn edit"
            onClick={() => openModal(task)}
            title="Edit task"
          >
            <span className="material-icons-outlined">edit</span>
          </button>
          <button
            className="icon-btn view"
            onClick={() => openViewModal(task)}
            title="View task details"
          >
            <span className="material-icons-outlined">visibility</span>
          </button>
          <button
            className="icon-btn delete"
            onClick={() => deleteTask(task.id)}
            title="Delete task"
          >
            <span className="material-icons-outlined">delete</span>
          </button>
        </td>
      </tr>
    );
  };

  return (
    <>
      <Head>
        <title>Task Management System</title>

      </Head>

      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      <AdminLayout activeMenu="Tasks">
        {/* Add/Edit Task Modal */}
        {modalOpen && (
          <AddEditTaskModal
            closeModal={closeModal}
            editingTask={editingTask}
            handleSubmit={handleSubmit}
            formData={formData}
            handleInputChange={handleInputChange}
            categories={categories}
            priorities={priorities}
            statuses={statuses}
            employees={employees}
            setFormData={setFormData}
          />
        )}

        {/* View Task Modal */}
        {viewModalOpen && selectedTask && (
          <ViewTaskModal
            closeViewModal={closeViewModal}
            taskDetails={taskDetails}
            detailsLoading={detailsLoading}
            openModal={openModal}
            deleteTask={deleteTask}
            formatDate={formatDate}
            taskComments={taskComments}
            newComment={newComment}
            setNewComment={setNewComment}
            handleAddComment={handleAddComment}
            commentLoading={commentLoading}
            taskAttachments={taskAttachments}
            handleFileUpload={handleFileUpload}
            attachmentLoading={attachmentLoading}
            handleFileDownload={handleFileDownload}
            taskHistory={taskHistory}
          />
        )}
        <div className="breadcrumb">
          <a href="#">Dashboard</a>
          <span>/</span>
          <span>Task Management</span>
        </div>

        {/* Quick Stats */}
        <div className="stats-cards">
          <StatsCard
            icon="assignment"
            bgColor="#3b82f6"
            value={stats.totalTasks}
            label="Total Tasks"
          />
          <StatsCard
            icon="schedule"
            bgColor="#f59e0b"
            value={stats.pendingTasks}
            label="Pending Tasks"
          />
          <StatsCard
            icon="check_circle"
            bgColor="#10b981"
            value={stats.completedTasks}
            label="Completed Tasks"
          />
          <StatsCard
            icon="warning"
            bgColor="#ef4444"
            value={stats.overdueTasks}
            label="Overdue Tasks"
          />
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs">
          {filterTabs.map((tab) => (
            <FilterTab
              key={tab.id}
              id={tab.id}
              label={tab.label}
              isActive={currentFilter === tab.id}
              onClick={setCurrentFilter}
            />
          ))}
        </div>

        {/* Advanced Filters */}
        <div className="advanced-filters">
          <div className="filter-row">
            <div className="filter-group">
              <label>Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="filter-select"
              >
                <option value="">All Statuses</option>
                {statuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="filter-select"
              >
                <option value="">All Priorities</option>
                {priorities.map((priority) => (
                  <option key={priority.id} value={priority.id}>
                    {priority.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="filter-select"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Assignee</label>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="filter-select"
              >
                <option value="">All Assignees</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <button
                className="btn btn-outline"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                  setPriorityFilter('');
                  setCategoryFilter('');
                  setAssigneeFilter('');
                  setCurrentPage(1);
                }}
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="tasks-card fade-in">
          <div className="card-header">
            <div className="tasks-actions">
              <select
                className="btn btn-outline"
                id="bulkActions"
                onChange={(e) => applyBulkAction(e.target.value)}
              >
                <option value="">Bulk Actions</option>
                <option value="delete">Delete Selected</option>
              </select>
              <div className="search-bar light">
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === 'Enter' && fetchTasks(1, rowsPerPage)
                  }
                />
                <button onClick={() => fetchTasks(1, rowsPerPage)}>
                  <span className="material-icons-outlined">search</span>
                </button>
              </div>
            </div>
            <div className="actions">
              <button className="btn btn-primary" onClick={() => openModal()}>
                <span className="material-icons-outlined">add</span>
                <span>Add Task</span>
              </button>
              <button
                className="btn btn-outline"
                onClick={() => {
                  fetchData();
                  showToast('Tasks refreshed!', 'success');
                }}
              >
                <span className="material-icons-outlined">refresh</span>
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <div className="table-container">
            {loading ? (
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Loading tasks...</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        id="selectAll"
                        checked={
                          selectedIds.length === paginatedTasks.length &&
                          paginatedTasks.length > 0
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>
                    <th>ID</th>
                    <th>TASK</th>
                    <th>CATEGORY</th>
                    <th>PRIORITY</th>
                    <th>STATUS</th>
                    <th>ASSIGNEE</th>
                    <th>DUE DATE</th>
                    <th>CREATED BY</th>
                    <th>OPERATIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTasks.length === 0 ? (
                    <tr>
                      <td
                        colSpan="10"
                        style={{
                          textAlign: 'center',
                          padding: '40px',
                          color: 'var(--gray-color)',
                        }}
                      >
                        <span
                          className="material-icons-outlined"
                          style={{
                            fontSize: '48px',
                            marginBottom: '16px',
                            display: 'block',
                            color: '#cbd5e1',
                          }}
                        >
                          assignment
                        </span>
                        No tasks found
                      </td>
                    </tr>
                  ) : (
                    paginatedTasks.map((task) => (
                      <TaskRow key={task.id} task={task} />
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {!loading && (
            <div className="pagination">
              <div className="pagination-info">
                <select
                  className="select-dropdown"
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value));
                    fetchTasks(1, parseInt(e.target.value));
                  }}
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <span>
                  Show from {startIndex} to {endIndex} in
                  <span
                    style={{
                      backgroundColor: '#64748b',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: '600',
                      marginLeft: '8px',
                    }}
                  >
                    {pagination ? pagination.total : 0}
                  </span>{' '}
                  records
                </span>
              </div>
              <div className="pagination-controls">
                <button
                  className="page-btn"
                  onClick={() => fetchTasks(currentPage - 1, rowsPerPage)}
                  disabled={!pagination || currentPage === 1}
                >
                  « Previous
                </button>
                {pagination &&
                  [...Array(Math.min(5, pagination.last_page))].map((_, i) => {
                    let pageNum;
                    if (pagination.last_page <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= pagination.last_page - 2) {
                      pageNum = pagination.last_page - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}
                        onClick={() => fetchTasks(pageNum, rowsPerPage)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                <button
                  className="page-btn"
                  onClick={() => fetchTasks(currentPage + 1, rowsPerPage)}
                  disabled={!pagination || currentPage === pagination.last_page}
                >
                  Next »
                </button>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    </>
  );
};

export default TaskManager;
