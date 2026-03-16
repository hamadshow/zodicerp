import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import '../../../../css/backend/main.scss';
import AdminLayout from '../components/AdminLayout';


const Reward = () => {
  // State management
  const [rewards, setRewards] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [selectedReward, setSelectedReward] = useState(null);
  const [formData, setFormData] = useState({
    employee: '',
    rewardType: '',
    rewardValue: '',
    category: '',
    awardDate: new Date().toISOString().split('T')[0],
    rewardStatus: 'pending',
    selectedBadge: '',
    reason: '',
    awardedBy: '',
    points: '',
    notes: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [toast, setToast] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentFilter, setCurrentFilter] = useState('all');

  // Additional state for enhanced functionality
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Employee data
  const employees = [
    {
      id: 1,
      name: 'Ahmed Mohamed',
      position: 'Software Engineer',
      department: 'IT',
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      position: 'HR Manager',
      department: 'Human Resources',
    },
    {
      id: 3,
      name: 'James Wilson',
      position: 'Sales Director',
      department: 'Sales',
    },
    {
      id: 4,
      name: 'Fatima Al-Mansour',
      position: 'Marketing Specialist',
      department: 'Marketing',
    },
    {
      id: 5,
      name: 'Mohammed Al-Farsi',
      position: 'Financial Analyst',
      department: 'Finance',
    },
    {
      id: 6,
      name: 'Priya Sharma',
      position: 'Support Manager',
      department: 'Customer Service',
    },
    {
      id: 7,
      name: 'Ali Khan',
      position: 'Operations Manager',
      department: 'Operations',
    },
    {
      id: 8,
      name: 'Marie Dubois',
      position: 'Lead Engineer',
      department: 'Engineering',
    },
  ];

  // Reward type configurations
  const rewardTypeConfig = {
    bonus: {
      name: 'Performance Bonus',
      class: 'type-bonus',
      icon: 'attach_money',
    },
    award: {
      name: 'Employee Award',
      class: 'type-award',
      icon: 'emoji_events',
    },
    gift: { name: 'Gift Card', class: 'type-gift', icon: 'card_giftcard' },
    recognition: {
      name: 'Special Recognition',
      class: 'type-recognition',
      icon: 'stars',
    },
    promotion: {
      name: 'Promotion',
      class: 'type-promotion',
      icon: 'trending_up',
    },
    badge: {
      name: 'Achievement Badge',
      class: 'type-award',
      icon: 'workspace_premium',
    },
    certificate: {
      name: 'Certificate',
      class: 'type-recognition',
      icon: 'description',
    },
  };

  // Reward templates for quick selection
  const rewardTemplates = [
    {
      id: 'excellent_performance',
      name: 'Excellent Performance',
      rewardType: 'bonus',
      rewardValue: 1000,
      category: 'performance',
      reason: 'Outstanding work performance and exceeding targets',
      points: 100,
    },
    {
      id: 'employee_of_month',
      name: 'Employee of the Month',
      rewardType: 'award',
      rewardValue: 0,
      category: 'leadership',
      reason: 'Employee of the month recognition for exceptional work',
      points: 150,
    },
    {
      id: 'innovation_award',
      name: 'Innovation Award',
      rewardType: 'award',
      rewardValue: 500,
      category: 'innovation',
      reason: 'Creative solution that improved efficiency',
      points: 75,
    },
    {
      id: 'teamwork_excellence',
      name: 'Teamwork Excellence',
      rewardType: 'badge',
      rewardValue: 0,
      category: 'teamwork',
      reason: 'Outstanding teamwork and collaboration',
      points: 50,
    },
  ];

  // State for reward templates
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  // Badge configurations
  const badgeConfig = {
    star_performer: { name: 'Star Performer', color: '#f59e0b', icon: 'stars' },
    team_player: { name: 'Team Player', color: '#3b82f6', icon: 'groups' },
    innovation: {
      name: 'Innovation Award',
      color: '#8b5cf6',
      icon: 'lightbulb',
    },
    leadership: { name: 'Leadership', color: '#10b981', icon: 'military_tech' },
  };

  // Badge items for selection
  const badgeItems = [
    {
      id: 'star_performer',
      name: 'Star Performer',
      description: 'Top performance',
      icon: 'stars',
    },
    {
      id: 'team_player',
      name: 'Team Player',
      description: 'Excellent teamwork',
      icon: 'groups',
    },
    {
      id: 'innovation',
      name: 'Innovation Award',
      description: 'Creative solutions',
      icon: 'lightbulb',
    },
    {
      id: 'leadership',
      name: 'Leadership',
      description: 'Outstanding leadership',
      icon: 'military_tech',
    },
  ];

  // Filter tabs
  const filterTabs = [
    { id: 'all', label: 'All Rewards' },
    { id: 'bonus', label: 'Bonuses' },
    { id: 'award', label: 'Awards' },
    { id: 'badge', label: 'Badges' },
    { id: 'pending', label: 'Pending' },
    { id: 'recent', label: 'Recent (30 days)' },
  ];

  // Sample data (in production, this would come from an API)
  const sampleRewards = [
    {
      id: 1,
      employeeId: 1,
      employeeName: 'Ahmed Mohamed',
      position: 'Software Engineer',
      rewardType: 'bonus',
      rewardValue: 2500,
      category: 'performance',
      awardDate: '2024-01-15',
      status: 'completed',
      badge: 'star_performer',
      reason: 'Outstanding Q4 performance, exceeded all targets by 25%',
      awardedBy: 'CTO',
      points: 100,
      notes: 'Quarterly performance bonus',
      createdAt: '2024-01-15',
    },
    {
      id: 2,
      employeeId: 2,
      employeeName: 'Sarah Johnson',
      position: 'HR Manager',
      rewardType: 'award',
      rewardValue: 0,
      category: 'leadership',
      awardDate: '2024-01-10',
      status: 'active',
      badge: 'leadership',
      reason: 'Employee of the Month for exceptional HR initiatives',
      awardedBy: 'CEO',
      points: 150,
      notes: '',
      createdAt: '2024-01-10',
    },
    {
      id: 3,
      employeeId: 3,
      employeeName: 'James Wilson',
      position: 'Sales Director',
      rewardType: 'bonus',
      rewardValue: 5000,
      category: 'sales',
      awardDate: '2024-01-05',
      status: 'completed',
      badge: '',
      reason: 'Record-breaking sales quarter, exceeded target by 40%',
      awardedBy: 'Sales VP',
      points: 200,
      notes: 'Sales performance bonus',
      createdAt: '2024-01-05',
    },
    {
      id: 4,
      employeeId: 4,
      employeeName: 'Fatima Al-Mansour',
      position: 'Marketing Specialist',
      rewardType: 'gift',
      rewardValue: 500,
      category: 'innovation',
      awardDate: '2023-12-20',
      status: 'completed',
      badge: 'innovation',
      reason: 'Innovative social media campaign increased engagement by 300%',
      awardedBy: 'Marketing Director',
      points: 75,
      notes: 'Amazon gift card',
      createdAt: '2023-12-20',
    },
    {
      id: 5,
      employeeId: 5,
      employeeName: 'Mohammed Al-Farsi',
      position: 'Financial Analyst',
      rewardType: 'recognition',
      rewardValue: 0,
      category: 'performance',
      awardDate: '2023-12-15',
      status: 'active',
      badge: '',
      reason: 'Exceptional work on annual financial reports',
      awardedBy: 'Finance Director',
      points: 50,
      notes: 'Special recognition award',
      createdAt: '2023-12-15',
    },
    {
      id: 6,
      employeeId: 6,
      employeeName: 'Priya Sharma',
      position: 'Support Manager',
      rewardType: 'badge',
      rewardValue: 0,
      category: 'customer_service',
      awardDate: '2023-12-10',
      status: 'completed',
      badge: 'team_player',
      reason: 'Highest customer satisfaction score (98%)',
      awardedBy: 'Customer Service Director',
      points: 100,
      notes: 'Team player badge awarded',
      createdAt: '2023-12-10',
    },
    {
      id: 7,
      employeeId: 7,
      employeeName: 'Ali Khan',
      position: 'Operations Manager',
      rewardType: 'promotion',
      rewardValue: 0,
      category: 'leadership',
      awardDate: '2023-12-01',
      status: 'active',
      badge: 'leadership',
      reason:
        'Promoted to Senior Operations Manager for outstanding performance',
      awardedBy: 'COO',
      points: 250,
      notes: 'Promotion effective January 2024',
      createdAt: '2023-12-01',
    },
    {
      id: 8,
      employeeId: 8,
      employeeName: 'Marie Dubois',
      position: 'Lead Engineer',
      rewardType: 'award',
      rewardValue: 1000,
      category: 'innovation',
      awardDate: '2023-11-25',
      status: 'completed',
      badge: 'innovation',
      reason: 'Patent filing for new algorithm development',
      awardedBy: 'Engineering Director',
      points: 150,
      notes: 'Innovation award',
      createdAt: '2023-11-25',
    },
  ];

  // Initialize component
  useEffect(() => {
    // Fetch data from Laravel backend
    const fetchRewards = async () => {
      try {
        const response = await fetch('/api/rewards');
        if (response.ok) {
          const data = await response.json();
          setRewards(data);
        } else {
          // Fallback to sample data if API call fails
          setRewards(sampleRewards);
        }
      } catch (error) {
        console.error('Error fetching rewards:', error);
        // Fallback to sample data if API call fails
        setRewards(sampleRewards);
      }
    };

    fetchRewards();
  }, []);

  // Calculate stats (moved to useMemo below)

  // Toast notification
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Modal handlers
  const openModal = useCallback((reward = null) => {
    setEditingReward(reward);
    if (reward) {
      setFormData({
        employee: reward.employeeId.toString(),
        rewardType: reward.rewardType,
        rewardValue: reward.rewardValue,
        category: reward.category,
        awardDate: reward.awardDate,
        rewardStatus: reward.status,
        selectedBadge: reward.badge || '',
        reason: reward.reason,
        awardedBy: reward.awardedBy || '',
        points: reward.points || '',
        notes: reward.notes || '',
      });
    } else {
      resetForm();
    }
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingReward(null);
    resetForm();
  }, []);

  const openViewModal = useCallback((reward) => {
    setSelectedReward(reward);
    setViewModalOpen(true);
  }, []);

  const closeViewModal = useCallback(() => {
    setViewModalOpen(false);
    setSelectedReward(null);
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      employee: '',
      rewardType: '',
      rewardValue: '',
      category: '',
      awardDate: new Date().toISOString().split('T')[0],
      rewardStatus: 'pending',
      selectedBadge: '',
      reason: '',
      awardedBy: '',
      points: '',
      notes: '',
    });
  }, []);

  // Form handlers
  const handleInputChange = useCallback((e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  }, []);

  const handleBadgeSelect = useCallback((badgeId) => {
    setFormData((prev) => ({
      ...prev,
      selectedBadge: badgeId === prev.selectedBadge ? '' : badgeId,
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      // Basic validation
      if (!formData.employee || !formData.rewardType || !formData.reason) {
        showToast('Please fill in all required fields', 'error');
        return;
      }

      try {
        const employee = employees.find(
          (e) => e.id === parseInt(formData.employee)
        );

        const rewardData = {
          employeeId: parseInt(formData.employee),
          employeeName: employee.name,
          position: employee.position,
          rewardType: formData.rewardType,
          rewardValue: parseFloat(formData.rewardValue) || 0,
          category: formData.category,
          awardDate: formData.awardDate,
          status: formData.rewardStatus,
          badge: formData.selectedBadge,
          reason: formData.reason,
          awardedBy: formData.awardedBy,
          points: parseInt(formData.points) || 0,
          notes: formData.notes,
        };

        if (editingReward) {
          // Update existing reward
          const updatedRewards = rewards.map((reward) =>
            reward.id === editingReward.id
              ? { ...reward, ...rewardData, id: editingReward.id }
              : reward
          );
          setRewards(updatedRewards);
          showToast('Reward updated successfully!', 'success');
        } else {
          // Add new reward
          const newReward = {
            ...rewardData,
            id:
              rewards.length > 0
                ? Math.max(...rewards.map((r) => r.id)) + 1
                : 1,
            createdAt: new Date().toISOString().split('T')[0],
          };
          setRewards((prev) => [...prev, newReward]);
          showToast('Reward added successfully!', 'success');
        }

        closeModal();
      } catch (error) {
        showToast('Error saving reward. Please try again.', 'error');
        console.error('Error saving reward:', error);
      }
    },
    [formData, editingReward, employees, rewards, closeModal]
  );

  // Reward operations
  const deleteReward = useCallback((id) => {
    if (
      window.confirm(
        'Are you sure you want to delete this reward? This action cannot be undone.'
      )
    ) {
      setRewards((prev) => prev.filter((reward) => reward.id !== id));
      showToast('Reward deleted successfully!', 'success');
    }
  }, []);

  const approveReward = useCallback((id) => {
    setRewards((prev) =>
      prev.map((reward) => {
        if (reward.id === id) {
          if (reward.status === 'pending') {
            return { ...reward, status: 'active' };
          } else if (reward.status === 'active') {
            return { ...reward, status: 'completed' };
          }
        }
        return reward;
      })
    );
    showToast('Reward status updated!', 'success');
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
        showToast('Please select at least one reward.', 'warning');
        return;
      }

      if (action === 'delete') {
        if (
          window.confirm(
            `Are you sure you want to delete ${selectedIds.length} selected reward(s)?`
          )
        ) {
          setRewards((prev) =>
            prev.filter((reward) => !selectedIds.includes(reward.id))
          );
          setSelectedIds([]);
          showToast(`${selectedIds.length} reward(s) deleted!`, 'success');
        }
        return;
      }

      setRewards((prev) =>
        prev.map((reward) => {
          if (selectedIds.includes(reward.id)) {
            if (action === 'approve' && reward.status === 'pending') {
              return { ...reward, status: 'active' };
            } else if (action === 'complete' && reward.status === 'active') {
              return { ...reward, status: 'completed' };
            }
          }
          return reward;
        })
      );
      setSelectedIds([]);
      showToast(`${selectedIds.length} reward(s) updated!`, 'success');
    },
    [selectedIds, rewards]
  );

  // Search and filter
  const filteredRewards = useMemo(() => {
    return rewards.filter((reward) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        reward.employeeName.toLowerCase().includes(searchLower) ||
        reward.position.toLowerCase().includes(searchLower) ||
        reward.reason.toLowerCase().includes(searchLower) ||
        reward.category.toLowerCase().includes(searchLower) ||
        rewardTypeConfig[reward.rewardType]?.name
          .toLowerCase()
          .includes(searchLower);

      if (currentFilter === 'all') return matchesSearch;
      if (currentFilter === 'recent') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return matchesSearch && new Date(reward.awardDate) >= thirtyDaysAgo;
      }
      return (
        matchesSearch &&
        (reward.rewardType === currentFilter || reward.status === currentFilter)
      );
    });
  }, [rewards, searchTerm, currentFilter, rewardTypeConfig]);

  // Bulk actions
  const handleSelectAll = useCallback(
    (checked) => {
      if (checked) {
        setSelectedIds(filteredRewards.map((reward) => reward.id));
      } else {
        setSelectedIds([]);
      }
    },
    [filteredRewards]
  );

  // Pagination
  const totalPages = useMemo(
    () => Math.ceil(filteredRewards.length / rowsPerPage),
    [filteredRewards, rowsPerPage]
  );
  const startIndex = useMemo(
    () => (currentPage - 1) * rowsPerPage,
    [currentPage, rowsPerPage]
  );
  const endIndex = useMemo(
    () => Math.min(startIndex + rowsPerPage, filteredRewards.length),
    [startIndex, rowsPerPage, filteredRewards.length]
  );
  const paginatedRewards = useMemo(
    () => filteredRewards.slice(startIndex, endIndex),
    [filteredRewards, startIndex, endIndex]
  );

  // Recent timeline
  const recentRewards = useMemo(() => {
    return [...rewards]
      .sort((a, b) => new Date(b.awardDate) - new Date(a.awardDate))
      .slice(0, 8);
  }, [rewards]);

  // Leaderboard calculation
  const leaderboard = useMemo(() => {
    return Object.values(
      rewards.reduce((acc, reward) => {
        if (!acc[reward.employeeId]) {
          acc[reward.employeeId] = {
            id: reward.employeeId,
            name: reward.employeeName,
            position: reward.position,
            points: 0,
            rewards: 0,
          };
        }
        acc[reward.employeeId].points += reward.points || 0;
        acc[reward.employeeId].rewards += 1;
        return acc;
      }, {})
    )
      .sort((a, b) => b.points - a.points)
      .slice(0, 5);
  }, [rewards]);

  // Export to CSV
  const exportToCSV = useCallback(() => {
    if (rewards.length === 0) {
      showToast('No rewards to export.', 'warning');
      return;
    }

    const headers = [
      'ID',
      'Employee',
      'Position',
      'Reward Type',
      'Value',
      'Category',
      'Award Date',
      'Status',
      'Reason',
      'Points',
    ];
    const csvRows = [
      headers.join(','),
      ...rewards.map((reward) =>
        [
          reward.id,
          `"${reward.employeeName}"`,
          `"${reward.position}"`,
          rewardTypeConfig[reward.rewardType]?.name || reward.rewardType,
          reward.rewardValue,
          reward.category,
          reward.awardDate,
          reward.status,
          `"${reward.reason.replace(/"/g, '""')}"`,
          reward.points || 0,
        ].join(',')
      ),
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rewards_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    showToast(`${rewards.length} reward(s) exported to CSV!`, 'success');
  }, [rewards, rewardTypeConfig]);

  // Format date helper
  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    return {
      totalRewards: rewards.length,
      totalValue: rewards.reduce((sum, r) => sum + r.rewardValue, 0),
      topPerformers: [
        ...new Set(
          rewards
            .filter((r) => r.rewardType === 'award' || r.badge)
            .map((r) => r.employeeId)
        ),
      ].length,
      badgesAwarded: rewards.filter((r) => r.badge).length,
    };
  }, [rewards]);

  // State for reward type configuration
  const [rewardTypeConfigModalOpen, setRewardTypeConfigModalOpen] =
    useState(false);
  const [customRewardTypes, setCustomRewardTypes] = useState(rewardTypeConfig);

  // Function to open reward type configuration modal
  const openRewardTypeConfigModal = () => {
    setRewardTypeConfigModalOpen(true);
  };

  // Function to close reward type configuration modal
  const closeRewardTypeConfigModal = () => {
    setRewardTypeConfigModalOpen(false);
  };

  // Function to handle changes to reward type configurations
  const handleRewardTypeConfigChange = (typeId, field, value) => {
    setCustomRewardTypes((prev) => ({
      ...prev,
      [typeId]: {
        ...prev[typeId],
        [field]: value,
      },
    }));
  };

  // Function to add a new reward type
  const addNewRewardType = () => {
    const newTypeId = `custom_${Date.now()}`;
    setCustomRewardTypes((prev) => ({
      ...prev,
      [newTypeId]: {
        name: 'New Reward Type',
        class: 'type-custom',
        icon: 'star',
      },
    }));
  };

  // Function to delete a reward type
  const deleteRewardType = (typeId) => {
    if (Object.keys(customRewardTypes).length <= 1) {
      showToast('You must have at least one reward type', 'error');
      return;
    }
    setCustomRewardTypes((prev) => {
      const newConfig = { ...prev };
      delete newConfig[typeId];
      return newConfig;
    });
  };

  // Function to save reward type configurations
  const saveRewardTypeConfig = () => {
    // In a real app, you would save this to a database
    // For now, just update the local rewardTypeConfig
    Object.assign(rewardTypeConfig, customRewardTypes);
    showToast('Reward type configurations saved successfully!', 'success');
    closeRewardTypeConfigModal();
  };

  // Function to open template selection modal
  const openTemplateModal = () => {
    setTemplateModalOpen(true);
  };

  // Function to close template selection modal
  const closeTemplateModal = () => {
    setTemplateModalOpen(false);
  };

  // Function to apply a template to the form
  const applyTemplate = (template) => {
    setFormData((prev) => ({
      ...prev,
      rewardType: template.rewardType,
      rewardValue: template.rewardValue,
      category: template.category,
      reason: template.reason,
      points: template.points,
    }));
    showToast(`Applied template: ${template.name}`, 'success');
    closeTemplateModal();
  };

  // Function to create a new template
  const createTemplateFromCurrentForm = () => {
    const newTemplate = {
      id: `template_${Date.now()}`,
      name: `Template ${Date.now()}`,
      rewardType: formData.rewardType,
      rewardValue: formData.rewardValue,
      category: formData.category,
      reason: formData.reason,
      points: formData.points,
    };
    // In a real app, you would save this to a database
    // For now, just add it to the local templates
    rewardTemplates.push(newTemplate);
    showToast('Template saved successfully!', 'success');
  };

  // Function to clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setShowNotifications(false);
  }, []);

  // Function to handle advanced search changes

  // Separate components for better maintainability
  const AddEditRewardModal = () => (
    <div className="modal-overlay active" onClick={closeModal}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {editingReward ? 'Edit Reward' : 'Add New Reward'}
          </h3>
          <button className="modal-close" onClick={closeModal}>
            <span className="material-icons-outlined">close</span>
          </button>
        </div>
        <div className="modal-body">
          <form id="rewardForm" onSubmit={handleSubmit}>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={openTemplateModal}
              >
                <span className="material-icons-outlined">inventory</span>
                Apply Template
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Employee *</label>
              <select
                className="form-control"
                id="employee"
                value={formData.employee}
                onChange={handleInputChange}
                required
              >
                <option value="">Select Employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} - {emp.position}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Reward Type *</label>
                <select
                  className="form-control"
                  id="rewardType"
                  value={formData.rewardType}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Type</option>
                  <option value="bonus">Performance Bonus</option>
                  <option value="award">Employee of the Month</option>
                  <option value="gift">Gift Card</option>
                  <option value="recognition">Special Recognition</option>
                  <option value="promotion">Promotion</option>
                  <option value="badge">Achievement Badge</option>
                  <option value="certificate">Certificate of Excellence</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Value ($)</label>
                <input
                  type="number"
                  className="form-control"
                  id="rewardValue"
                  value={formData.rewardValue}
                  onChange={handleInputChange}
                  placeholder="Enter reward value"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Award Date *</label>
                <input
                  type="date"
                  className="form-control"
                  id="awardDate"
                  value={formData.awardDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-control"
                  id="rewardStatus"
                  value={formData.rewardStatus}
                  onChange={handleInputChange}
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Achievement Badge</label>
              <div className="badges-grid">
                {badgeItems.map((badge) => (
                  <div
                    key={badge.id}
                    className={`badge-item ${formData.selectedBadge === badge.id ? 'selected' : ''}`}
                    onClick={() => handleBadgeSelect(badge.id)}
                  >
                    <div className="badge-icon-large">
                      <span className="material-icons-outlined">
                        {badge.icon}
                      </span>
                    </div>
                    <div className="badge-name">{badge.name}</div>
                    <div className="badge-desc">{badge.description}</div>
                  </div>
                ))}
              </div>
              <input
                type="hidden"
                id="selectedBadge"
                value={formData.selectedBadge}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-control"
                id="category"
                value={formData.category}
                onChange={handleInputChange}
              >
                <option value="">Select Category</option>
                <option value="performance">Performance</option>
                <option value="innovation">Innovation</option>
                <option value="teamwork">Teamwork</option>
                <option value="leadership">Leadership</option>
                <option value="customer_service">Customer Service</option>
                <option value="sales">Sales Excellence</option>
                <option value="safety">Safety</option>
                <option value="anniversary">Work Anniversary</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Reason for Reward *</label>
              <textarea
                className="form-control form-textarea"
                id="reason"
                value={formData.reason}
                onChange={handleInputChange}
                placeholder="Describe the achievement or reason for this reward..."
                required
                rows="3"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Awarded By</label>
              <input
                type="text"
                className="form-control"
                id="awardedBy"
                value={formData.awardedBy}
                onChange={handleInputChange}
                placeholder="Manager or department head"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Points Awarded</label>
              <input
                type="number"
                className="form-control"
                id="points"
                value={formData.points}
                onChange={handleInputChange}
                placeholder="Enter points (if applicable)"
                min="0"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                className="form-control form-textarea"
                id="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Any additional notes or comments"
                rows="3"
              />
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
            {editingReward ? 'Update' : 'Save'} Reward
          </button>
        </div>
      </div>
    </div>
  );

  const ViewRewardModal = () => (
    <div className="modal-overlay active" onClick={closeViewModal}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Reward Details</h3>
          <button className="modal-close" onClick={closeViewModal}>
            <span className="material-icons-outlined">close</span>
          </button>
        </div>
        <div className="modal-body">
          <div className="reward-details">
            <div className="detail-row">
              <span className="detail-label">Employee:</span>
              <span className="detail-value">
                {selectedReward.employeeName}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Position:</span>
              <span className="detail-value">{selectedReward.position}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Reward Type:</span>
              <span className="detail-value">
                {rewardTypeConfig[selectedReward.rewardType]?.name ||
                  selectedReward.rewardType}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Value:</span>
              <span className="detail-value">
                {selectedReward.rewardValue > 0
                  ? `$${selectedReward.rewardValue.toLocaleString()}`
                  : 'N/A'}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Category:</span>
              <span className="detail-value">
                {selectedReward.category.replace('_', ' ')}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Award Date:</span>
              <span className="detail-value">{selectedReward.awardDate}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Status:</span>
              <span className="detail-value">
                {selectedReward.status.charAt(0).toUpperCase() +
                  selectedReward.status.slice(1)}
              </span>
            </div>
            {selectedReward.badge && (
              <div className="detail-row">
                <span className="detail-label">Badge:</span>
                <span className="detail-value">
                  {badgeConfig[selectedReward.badge]?.name ||
                    selectedReward.badge}
                </span>
              </div>
            )}
            <div className="detail-row">
              <span className="detail-label">Reason:</span>
              <span className="detail-value">{selectedReward.reason}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Awarded By:</span>
              <span className="detail-value">
                {selectedReward.awardedBy || 'N/A'}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Points Awarded:</span>
              <span className="detail-value">{selectedReward.points || 0}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Notes:</span>
              <span className="detail-value">
                {selectedReward.notes || 'None'}
              </span>
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={closeViewModal}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

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

  const RewardRow = ({ reward }) => {
    const typeConfig = rewardTypeConfig[reward.rewardType] || {
      name: reward.rewardType,
      class: 'type-bonus',
      icon: 'stars',
    };

    return (
      <tr key={reward.id}>
        <td>
          <input
            type="checkbox"
            className="reward-checkbox"
            checked={selectedIds.includes(reward.id)}
            onChange={(e) => handleCheckboxChange(reward.id, e.target.checked)}
          />
        </td>
        <td>{reward.id.toString().padStart(3, '0')}</td>
        <td>
          <div className="employee-info">
            <div className="employee-avatar">
              <span
                className="material-icons-outlined"
                style={{ color: '#94a3b8' }}
              >
                person
              </span>
            </div>
            <div className="employee-details">
              <div className="employee-name">{reward.employeeName}</div>
              <div className="employee-position">{reward.position}</div>
            </div>
          </div>
        </td>
        <td>
          <span className={`reward-type ${typeConfig.class}`}>
            <span
              className="material-icons-outlined"
              style={{
                fontSize: '14px',
                verticalAlign: 'middle',
                marginRight: '4px',
              }}
            >
              {typeConfig.icon}
            </span>
            {typeConfig.name}
          </span>
          {reward.badge && (
            <span className="badge-icon">
              <span className="material-icons-outlined">workspace_premium</span>
            </span>
          )}
        </td>
        <td>
          {reward.rewardValue > 0 ? (
            <div className="reward-value">
              ${reward.rewardValue.toLocaleString()}
            </div>
          ) : (
            <div style={{ fontSize: '0.85rem', color: 'var(--gray-color)' }}>
              -
            </div>
          )}
        </td>
        <td>
          <span style={{ fontSize: '0.85rem', textTransform: 'capitalize' }}>
            {reward.category.replace('_', ' ')}
          </span>
        </td>
        <td>{reward.awardDate}</td>
        <td>
          <span className={`reward-status status-${reward.status}`}>
            {reward.status.charAt(0).toUpperCase() + reward.status.slice(1)}
          </span>
        </td>
        <td>
          <button className="icon-btn edit" onClick={() => openModal(reward)}>
            <span className="material-icons-outlined">edit</span>
          </button>
          <button
            className="icon-btn delete"
            onClick={() => deleteReward(reward.id)}
          >
            <span className="material-icons-outlined">delete</span>
          </button>
          <button
            className="icon-btn"
            style={{ color: 'var(--info-color)' }}
            onClick={() => openViewModal(reward)}
          >
            <span className="material-icons-outlined">visibility</span>
          </button>
          <button
            className="icon-btn"
            style={{ color: 'var(--success-color)' }}
            onClick={() => approveReward(reward.id)}
          >
            <span className="material-icons-outlined">check_circle</span>
          </button>
        </td>
      </tr>
    );
  };

  const TimelineItem = ({ reward, isAward = false, index = 0 }) => {
    let typeConfig, bgColor, iconColor;

    if (isAward) {
      // For leaderboard items
      typeConfig = {
        name: reward.rewardType,
        class: 'type-bonus',
        icon: 'stars',
      };
      bgColor = index === 0 ? '#fef3c7' : '#f8fafc';
      iconColor = index === 0 ? '#92400e' : '#475569';
    } else {
      // For reward timeline items
      typeConfig = rewardTypeConfig[reward.rewardType] || {
        name: reward.rewardType,
        class: 'type-bonus',
        icon: 'stars',
      };
      bgColor =
        {
          'type-bonus': '#dcfce7',
          'type-award': '#f0f9ff',
          'type-gift': '#fef3c7',
          'type-recognition': '#f3e8ff',
          'type-promotion': '#ffe4e6',
        }[typeConfig.class] || '#f8fafc';

      iconColor =
        {
          'type-bonus': '#166534',
          'type-award': '#075985',
          'type-gift': '#92400e',
          'type-recognition': '#6b21a8',
          'type-promotion': '#be123c',
        }[typeConfig.class] || '#475569';
    }

    return (
      <div key={reward.id || reward.id} className="timeline-item">
        <div
          className="timeline-icon"
          style={{ backgroundColor: bgColor, color: iconColor }}
        >
          {isAward ? (
            <span style={{ fontWeight: '600' }}>{index + 1}</span>
          ) : (
            <span className="material-icons-outlined">{typeConfig.icon}</span>
          )}
        </div>
        <div className="timeline-content">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div className="timeline-title">
                {isAward ? (
                  reward.name
                ) : (
                  <>
                    <strong>{reward.employeeName}</strong> received{' '}
                    {typeConfig.name.toLowerCase()}
                  </>
                )}
              </div>
              <div className="timeline-date">
                {isAward
                  ? reward.position
                  : `${formatDate(reward.awardDate)} • ${reward.reason.substring(0, 60)}${reward.reason.length > 60 ? '...' : ''}`}
              </div>
            </div>
            {isAward && (
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{ fontWeight: '600', color: 'var(--success-color)' }}
                >
                  {reward.points} pts
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-color)' }}>
                  {reward.rewards} rewards
                </div>
              </div>
            )}
          </div>
          {isAward && (
            <div className="progress-container">
              <div
                className="progress-bar"
                style={{
                  width: `${(reward.points / (leaderboard[0]?.points || 1)) * 100}%`,
                  backgroundColor: index === 0 ? '#f59e0b' : '#3b82f6',
                }}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  // Reward Type Configuration Modal
  const RewardTypeConfigModal = () => (
    <div className="modal-overlay active" onClick={closeRewardTypeConfigModal}>
      <div
        className="modal"
        style={{ width: '700px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">Configure Reward Types</h3>
          <button className="modal-close" onClick={closeRewardTypeConfigModal}>
            <span className="material-icons-outlined">close</span>
          </button>
        </div>
        <div className="modal-body">
          <div className="reward-type-config">
            <div className="config-actions">
              <button className="btn btn-primary" onClick={addNewRewardType}>
                <span className="material-icons-outlined">add</span>
                Add New Reward Type
              </button>
            </div>

            <div className="config-list">
              {Object.entries(customRewardTypes).map(([typeId, config]) => (
                <div key={typeId} className="config-item">
                  <div className="config-fields">
                    <div className="form-group">
                      <label className="form-label">Type ID</label>
                      <input
                        type="text"
                        className="form-control"
                        value={typeId}
                        disabled
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Display Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={config.name}
                        onChange={(e) =>
                          handleRewardTypeConfigChange(
                            typeId,
                            'name',
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">CSS Class</label>
                      <input
                        type="text"
                        className="form-control"
                        value={config.class}
                        onChange={(e) =>
                          handleRewardTypeConfigChange(
                            typeId,
                            'class',
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Icon</label>
                      <input
                        type="text"
                        className="form-control"
                        value={config.icon}
                        onChange={(e) =>
                          handleRewardTypeConfigChange(
                            typeId,
                            'icon',
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </div>
                  <button
                    className="btn btn-danger"
                    onClick={() => deleteRewardType(typeId)}
                    disabled={Object.keys(customRewardTypes).length <= 1}
                  >
                    <span className="material-icons-outlined">delete</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button
            type="button"
            className="btn"
            onClick={closeRewardTypeConfigModal}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={saveRewardTypeConfig}
          >
            Save Configurations
          </button>
        </div>
      </div>
    </div>
  );

  // Template Selection Modal
  const TemplateModal = () => (
    <div className="modal-overlay active" onClick={closeTemplateModal}>
      <div
        className="modal"
        style={{ width: '600px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">Select a Reward Template</h3>
          <button className="modal-close" onClick={closeTemplateModal}>
            <span className="material-icons-outlined">close</span>
          </button>
        </div>
        <div className="modal-body">
          <div className="template-list">
            {rewardTemplates.map((template) => (
              <div
                key={template.id}
                className="template-item"
                onClick={() => applyTemplate(template)}
              >
                <div className="template-header">
                  <h4>{template.name}</h4>
                  <span
                    className="reward-type-badge"
                    style={{
                      backgroundColor:
                        rewardTypeConfig[template.rewardType]?.class ===
                        'type-bonus'
                          ? '#dcfce7'
                          : rewardTypeConfig[template.rewardType]?.class ===
                              'type-award'
                            ? '#f0f9ff'
                            : rewardTypeConfig[template.rewardType]?.class ===
                                'type-gift'
                              ? '#fef3c7'
                              : rewardTypeConfig[template.rewardType]?.class ===
                                  'type-recognition'
                                ? '#f3e8ff'
                                : '#f8fafc',
                      color:
                        rewardTypeConfig[template.rewardType]?.class ===
                        'type-bonus'
                          ? '#166534'
                          : rewardTypeConfig[template.rewardType]?.class ===
                              'type-award'
                            ? '#075985'
                            : rewardTypeConfig[template.rewardType]?.class ===
                                'type-gift'
                              ? '#92400e'
                              : rewardTypeConfig[template.rewardType]?.class ===
                                  'type-recognition'
                                ? '#6b21a8'
                                : '#475569',
                    }}
                  >
                    {rewardTypeConfig[template.rewardType]?.name ||
                      template.rewardType}
                  </span>
                </div>
                <div className="template-details">
                  <p>{template.reason}</p>
                  {template.rewardValue > 0 && (
                    <span className="template-value">
                      ${template.rewardValue}
                    </span>
                  )}
                  <span className="template-points">{template.points} pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={closeTemplateModal}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={createTemplateFromCurrentForm}
          >
            Save Current as Template
          </button>
        </div>
      </div>
    </div>
  );

  // Notification Panel Component
  const NotificationPanel = () => (
    <div className={`notification-panel ${showNotifications ? 'show' : ''}`}>
      <div className="notification-header">
        <h4>Notifications</h4>
        <button className="notification-clear" onClick={clearNotifications}>
          <span className="material-icons-outlined">clear</span>
        </button>
      </div>
      <div className="notification-list">
        {notifications.length === 0 ? (
          <div className="notification-empty">No notifications</div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-item notification-${notification.type}`}
            >
              <div className="notification-content">
                <span className="notification-message">
                  {notification.message}
                </span>
                <span className="notification-time">
                  {notification.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>Rewards & Recognition Management</title>

      </Head>

      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      {/* Add/Edit Reward Modal */}
      {modalOpen && <AddEditRewardModal />}

      {/* View Reward Modal */}
      {viewModalOpen && selectedReward && <ViewRewardModal />}

      {/* Reward Type Configuration Modal */}
      {rewardTypeConfigModalOpen && <RewardTypeConfigModal />}

      {/* Template Selection Modal */}
      {templateModalOpen && <TemplateModal />}

      {/* Notification Panel */}
      <NotificationPanel />

      <AdminLayout activeMenu="Reward">
        <div className="breadcrumb">
          <a href="#">Dashboard</a>
          <span>/</span>
          <a href="#">Human Resources</a>
          <span>/</span>
          <span>Rewards & Recognition</span>
        </div>

        {/* Quick Stats */}
        <div className="stats-cards">
          <StatsCard
            icon="emoji_events"
            bgColor="#f59e0b"
            value={stats.totalRewards}
            label="Total Rewards Given"
          />
          <StatsCard
            icon="attach_money"
            bgColor="var(--success-color)"
            value={`$${stats.totalValue.toLocaleString()}`}
            label="Total Reward Value"
          />
          <StatsCard
            icon="stars"
            bgColor="var(--info-color)"
            value={stats.topPerformers}
            label="Top Performers"
          />
          <StatsCard
            icon="workspace_premium"
            bgColor="#8b5cf6"
            value={stats.badgesAwarded}
            label="Badges Awarded"
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

        {/* Main Card */}
        <div className="rewards-card fade-in">
          <div className="card-header">
            <div className="rewards-actions">
              <select
                className="btn btn-outline"
                id="bulkActions"
                onChange={(e) => applyBulkAction(e.target.value)}
              >
                <option value="">Bulk Actions</option>
                <option value="approve">Approve Selected</option>
                <option value="complete">Mark as Completed</option>
                <option value="delete">Delete Selected</option>
                <option value="export">Export to CSV</option>
              </select>
            </div>
            <div className="actions">
              <input
                type="text"
                className="search-input"
                placeholder="Search rewards..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ marginRight: '8px' }}
              />
              <button className="btn btn-primary" onClick={() => openModal()}>
                <span className="material-icons-outlined">add</span>
                <span>Add Reward</span>
              </button>
              <button
                className="btn btn-outline"
                onClick={() => showToast('Rewards list refreshed!', 'success')}
              >
                <span className="material-icons-outlined">refresh</span>
                <span>Refresh</span>
              </button>
              <button className="btn btn-outline" onClick={exportToCSV}>
                <span className="material-icons-outlined">download</span>
                <span>Export</span>
              </button>
              <button
                className="btn btn-outline"
                onClick={openRewardTypeConfigModal}
                title="Configure reward types"
              >
                <span className="material-icons-outlined">settings</span>
                <span>Configure</span>
              </button>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      id="selectAll"
                      checked={
                        selectedIds.length === paginatedRewards.length &&
                        paginatedRewards.length > 0
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th>ID</th>
                  <th>EMPLOYEE</th>
                  <th>REWARD TYPE</th>
                  <th>VALUE</th>
                  <th>CATEGORY</th>
                  <th>AWARD DATE</th>
                  <th>STATUS</th>
                  <th>OPERATIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRewards.length === 0 ? (
                  <tr>
                    <td
                      colSpan="9"
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
                        info
                      </span>
                      No rewards found
                    </td>
                  </tr>
                ) : (
                  paginatedRewards.map((reward) => (
                    <RewardRow key={reward.id} reward={reward} />
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <div className="pagination-info">
              <select
                className="select-dropdown"
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span>
                Show from {startIndex + 1} to {endIndex} in
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
                  {filteredRewards.length}
                </span>{' '}
                records
              </span>
            </div>
            <div className="pagination-controls">
              <button
                className="page-btn"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                « Previous
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                className="page-btn"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next »
              </button>
            </div>
          </div>
        </div>

        {/* Recent Awards Timeline */}
        <div className="rewards-card" style={{ marginTop: '24px' }}>
          <div className="card-header">
            <h3
              style={{
                margin: 0,
                fontSize: '1.1rem',
                color: 'var(--dark-color)',
              }}
            >
              <span
                className="material-icons-outlined"
                style={{ verticalAlign: 'middle', marginRight: '8px' }}
              >
                timeline
              </span>
              Recent Awards Timeline
            </h3>
          </div>
          <div>
            {recentRewards.map((reward) => (
              <TimelineItem key={reward.id} reward={reward} />
            ))}
          </div>
        </div>

        {/* Top Performers Leaderboard */}
        <div className="rewards-card" style={{ marginTop: '24px' }}>
          <div className="card-header">
            <h3
              style={{
                margin: 0,
                fontSize: '1.1rem',
                color: 'var(--dark-color)',
              }}
            >
              <span
                className="material-icons-outlined"
                style={{ verticalAlign: 'middle', marginRight: '8px' }}
              >
                leaderboard
              </span>
              Top Performers
            </h3>
          </div>
          <div>
            {leaderboard.map((emp, index) => (
              <TimelineItem
                key={emp.id}
                reward={emp}
                isAward={true}
                index={index}
              />
            ))}
          </div>
        </div>
      </AdminLayout>
    </>
  );
};

export default Reward;
