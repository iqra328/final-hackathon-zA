import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import '../../styles/global.css';
import '../../styles/WorkerDashboard.css';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace(/\/$/, '');

export default function WorkerDashboard() {
  const { token, user, logout } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('tasks');
  const [notification, setNotification] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [profileData, setProfileData] = useState({ 
    name: user?.name || '', 
    currentPassword: '', 
    newPassword: '' 
  });

  useEffect(() => {
    fetchTasks();
    fetchStats();

    if (socket) {
      socket.on('new-task', () => {
        fetchTasks();
        fetchStats();
        showNotification('📋 New task assigned!', 'info');
      });
      socket.on('ticket-cancelled', () => {
        fetchTasks();
        fetchStats();
        showNotification('🚫 Task cancelled', 'info');
      });
    }

    return () => {
      if (socket) {
        socket.off('new-task');
        socket.off('ticket-cancelled');
      }
    };
  }, [socket]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API_URL}/tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const workerTasks = response.data.filter(t => t.workerId?._id === user?.id);
      setTasks(workerTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      if (error.response?.status === 401) {
        logout();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/tickets/stats/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const updateAvailability = async () => {
    try {
      setIsAvailable(!isAvailable);
      showNotification(`✅ Status updated to ${!isAvailable ? 'Available' : 'Unavailable'}`, 'success');
    } catch (error) {
      showNotification('Failed to update status', 'error');
    }
  };

  const handleStatusUpdate = async (taskId, newStatus) => {
    const note = newStatus === 'Rejected' 
      ? prompt('Please provide a reason for rejection:') 
      : newStatus === 'Completed' 
        ? prompt('Resolution note:') 
        : '';

    if (newStatus === 'Rejected' && !note) {
      showNotification('Rejection reason is required', 'error');
      return;
    }

    try {
      await axios.put(
        `${API_URL}/tickets/${taskId}/worker-status`,
        { 
          status: newStatus,
          resolutionNote: note 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchTasks();
      fetchStats();
      showNotification(`✅ Task ${newStatus.toLowerCase()}!`, 'success');
    } catch (error) {
      showNotification(error.response?.data?.error || 'Failed to update status', 'error');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleUpdateProfile = async () => {
    try {
      if (profileData.name && profileData.name !== user?.name) {
        await axios.put(
          `${API_URL}/users/profile`,
          { name: profileData.name },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const savedUser = JSON.parse(localStorage.getItem('user'));
        const updatedUser = { ...savedUser, name: profileData.name };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        showNotification('✅ Profile updated!', 'success');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        showNotification('No changes to save', 'info');
      }
    } catch (error) {
      showNotification('Failed to update profile', 'error');
    }
  };

  const handleChangePassword = async () => {
    if (!profileData.currentPassword || !profileData.newPassword) {
      showNotification('Please fill all fields', 'error');
      return;
    }
    if (profileData.newPassword.length < 6) {
      showNotification('Password must be 6+ characters', 'error');
      return;
    }
    try {
      await axios.put(
        `${API_URL}/users/profile`,
        { 
          currentPassword: profileData.currentPassword,
          password: profileData.newPassword 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showNotification('🔑 Password changed!', 'success');
      setProfileData({ ...profileData, currentPassword: '', newPassword: '' });
    } catch (error) {
      showNotification('Failed to change password', 'error');
    }
  };

  // ===== REPORT DOWNLOAD FUNCTIONS =====
  const downloadReport = (type) => {
    setReportLoading(true);
    
    const reportData = {
      title: 'Worker Performance Report',
      worker: user?.name,
      email: user?.email,
      date: new Date().toLocaleString(),
      availability: isAvailable ? 'Available' : 'Unavailable',
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'Completed').length,
      rejectedTasks: tasks.filter(t => t.status === 'Rejected').length,
      inProgressTasks: tasks.filter(t => t.status === 'In Progress').length,
      pendingTasks: tasks.filter(t => t.status === 'Assigned' || t.status === 'New').length,
      avgRating: user?.rating?.average || 0,
      totalReviews: user?.rating?.count || 0,
      tasks: tasks.map(t => ({
        id: t.ticketNumber,
        subject: t.subject,
        category: t.category,
        priority: t.priority,
        status: t.status,
        customer: t.customerId?.name || 'Unknown',
        created: new Date(t.createdAt).toLocaleDateString(),
        completedAt: t.completedAt ? new Date(t.completedAt).toLocaleDateString() : '-'
      }))
    };
    
    let content = '';
    let fileName = '';
    let mimeType = '';
    
    if (type === 'json') {
      content = JSON.stringify(reportData, null, 2);
      fileName = `worker-report-${new Date().toISOString().slice(0,10)}.json`;
      mimeType = 'application/json';
    } else if (type === 'csv') {
      let csv = 'Task #,Subject,Category,Priority,Status,Customer,Created,Completed\n';
      reportData.tasks.forEach(t => {
        csv += `${t.id},${t.subject},${t.category},${t.priority},${t.status},${t.customer},${t.created},${t.completedAt}\n`;
      });
      content = csv;
      fileName = `worker-tasks-${new Date().toISOString().slice(0,10)}.csv`;
      mimeType = 'text/csv';
    } else if (type === 'pdf' || type === 'text') {
      content = `
============================================
${reportData.title}
============================================

Worker: ${reportData.worker}
Email: ${reportData.email}
Date: ${reportData.date}
Status: ${reportData.availability}

============================================
PERFORMANCE SUMMARY
============================================
Total Tasks: ${reportData.totalTasks}
Completed: ${reportData.completedTasks}
In Progress: ${reportData.inProgressTasks}
Pending: ${reportData.pendingTasks}
Rejected: ${reportData.rejectedTasks}
Completion Rate: ${reportData.totalTasks > 0 ? Math.round((reportData.completedTasks / reportData.totalTasks) * 100) : 0}%
Average Rating: ${reportData.avgRating} / 5
Total Reviews: ${reportData.totalReviews}

============================================
TASK DETAILS
============================================
${reportData.tasks.map(t => 
  `Task #${t.id}
  Subject: ${t.subject}
  Category: ${t.category}
  Priority: ${t.priority}
  Status: ${t.status}
  Customer: ${t.customer}
  Created: ${t.created}
  Completed: ${t.completedAt}
  ------------------------------------------`
).join('\n')}

============================================
Generated on: ${new Date().toLocaleString()}
============================================
      `;
      fileName = `worker-report-${new Date().toISOString().slice(0,10)}.txt`;
      mimeType = 'text/plain';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setReportLoading(false);
    showNotification(`📊 Report downloaded!`, 'success');
    setShowReportModal(false);
  };

  const getStatusClass = (status) => {
    const map = {
      'New': 'badge-new',
      'Assigned': 'badge-assigned',
      'In Progress': 'badge-progress',
      'Completed': 'badge-completed',
      'Rejected': 'badge-rejected',
      'Cancelled': 'badge-cancelled',
    };
    return map[status] || 'badge-new';
  };

  const getPriorityClass = (priority) => {
    const map = {
      'Low': 'priority-low',
      'Medium': 'priority-medium',
      'High': 'priority-high',
      'Urgent': 'priority-urgent',
    };
    return map[priority] || 'priority-medium';
  };

  const getStatusIcon = (status) => {
    const map = {
      'New': '🆕',
      'Assigned': '📋',
      'In Progress': '⏳',
      'Completed': '✅',
      'Rejected': '❌',
      'Cancelled': '🚫',
    };
    return map[status] || '📌';
  };

  const filteredTasks = tasks.filter(task => {
    const matchesFilter = filter === 'all' || task.status === filter;
    const matchesSearch = task.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getTabTasks = (tab) => {
    switch(tab) {
      case 'pending':
        return filteredTasks.filter(t => t.status === 'Assigned' || t.status === 'New');
      case 'progress':
        return filteredTasks.filter(t => t.status === 'In Progress');
      case 'completed':
        return filteredTasks.filter(t => t.status === 'Completed');
      case 'rejected':
        return filteredTasks.filter(t => t.status === 'Rejected' || t.status === 'Cancelled');
      default:
        return filteredTasks;
    }
  };

  const displayTasks = getTabTasks(activeTab);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
  const pendingTasks = tasks.filter(t => t.status === 'Assigned' || t.status === 'New').length;
  const rejectedTasks = tasks.filter(t => t.status === 'Rejected' || t.status === 'Cancelled').length;

  // ===== FIXED: Monthly data for analytics =====
  const monthlyData = tasks.reduce((acc, task) => {
    const date = new Date(task.createdAt);
    const month = date.toLocaleString('default', { month: 'short' });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const sortedMonthly = {};
  monthOrder.forEach(m => {
    if (monthlyData[m]) sortedMonthly[m] = monthlyData[m];
  });

  const chartData = {
    status: {
      'New': tasks.filter(t => t.status === 'New').length,
      'Assigned': tasks.filter(t => t.status === 'Assigned').length,
      'In Progress': tasks.filter(t => t.status === 'In Progress').length,
      'Completed': tasks.filter(t => t.status === 'Completed').length,
      'Rejected': tasks.filter(t => t.status === 'Rejected').length,
      'Cancelled': tasks.filter(t => t.status === 'Cancelled').length,
    },
    priority: {
      'Low': tasks.filter(t => t.priority === 'Low').length,
      'Medium': tasks.filter(t => t.priority === 'Medium').length,
      'High': tasks.filter(t => t.priority === 'High').length,
      'Urgent': tasks.filter(t => t.priority === 'Urgent').length,
    },
    monthly: sortedMonthly  // <-- FIXED: Added monthly data
  };

  if (loading) {
    return (
      <div className="worker-loading">
        <LoadingSpinner size="lg" text="Loading your tasks..." />
      </div>
    );
  }

  return (
    <div className="worker-dashboard">
      {/* Notification */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          <span className="notification-icon">
            {notification.type === 'success' ? '✅' : 
             notification.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          <span className="notification-text">{notification.message}</span>
          <button className="notification-close" onClick={() => setNotification(null)}>✕</button>
        </div>
      )}

      {/* ===== HEADER ===== */}
      <div className="worker-header">
        <div className="worker-header-left">
          <div className="worker-avatar">
            <span>{user?.name?.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <h1 className="worker-title">🔧 Worker <span>Dashboard</span></h1>
            <p className="worker-subtitle">Welcome back, {user?.name} 👋</p>
          </div>
        </div>
        <div className="worker-header-right">
          <div 
            className={`availability-toggle ${isAvailable ? 'available' : 'unavailable'}`}
            onClick={updateAvailability}
          >
            <span className={`status-dot ${isAvailable ? 'available' : 'unavailable'}`}></span>
            {isAvailable ? '✅ Available' : '⛔ Unavailable'}
          </div>
          <div className="worker-rating-badge">
            <span>⭐ {user?.rating?.average || 0}/5</span>
            <span>({user?.rating?.count || 0} reviews)</span>
          </div>
          <div className="worker-stats-badge">
            <span>📋 {totalTasks} Tasks</span>
            <span>✅ {completedTasks} Done</span>
          </div>
          <button onClick={handleLogout} className="btn-logout">
            🚪 Logout
          </button>
        </div>
      </div>

      {/* ===== STATS ===== */}
      <div className="worker-stats">
        <div className="worker-stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-info">
            <span className="stat-label">Total Tasks</span>
            <span className="stat-value primary">{totalTasks}</span>
          </div>
        </div>
        <div className="worker-stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <span className="stat-label">In Progress</span>
            <span className="stat-value warning">{inProgressTasks}</span>
          </div>
        </div>
        <div className="worker-stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <span className="stat-label">Completed</span>
            <span className="stat-value success">{completedTasks}</span>
          </div>
        </div>
        <div className="worker-stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-info">
            <span className="stat-label">Rating</span>
            <span className="stat-value" style={{ color: '#eab308' }}>{user?.rating?.average || 0}/5</span>
          </div>
        </div>
        <div className="worker-stat-card">
          <div className="stat-icon">📌</div>
          <div className="stat-info">
            <span className="stat-label">Pending</span>
            <span className="stat-value danger">{pendingTasks}</span>
          </div>
        </div>
        <div className="worker-stat-card">
          <div className="stat-icon">❌</div>
          <div className="stat-info">
            <span className="stat-label">Rejected</span>
            <span className="stat-value" style={{ color: '#ef4444' }}>{rejectedTasks}</span>
          </div>
        </div>
      </div>

      {/* ===== TABS ===== */}
      <div className="worker-tabs">
        <button 
          className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => { setActiveTab('tasks'); setFilter('all'); setSearchTerm(''); }}
        >
          📋 All ({filteredTasks.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => { setActiveTab('pending'); setFilter('all'); setSearchTerm(''); }}
        >
          📌 Pending ({pendingTasks})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => { setActiveTab('progress'); setFilter('all'); setSearchTerm(''); }}
        >
          ⏳ In Progress ({inProgressTasks})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => { setActiveTab('completed'); setFilter('all'); setSearchTerm(''); }}
        >
          ✅ Completed ({completedTasks})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'rejected' ? 'active' : ''}`}
          onClick={() => { setActiveTab('rejected'); setFilter('all'); setSearchTerm(''); }}
        >
          ❌ Rejected ({rejectedTasks})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => { setActiveTab('analytics'); setFilter('all'); setSearchTerm(''); }}
        >
          📈 Analytics
        </button>
        <button 
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => { setActiveTab('settings'); setFilter('all'); setSearchTerm(''); }}
        >
          ⚙️ Settings
        </button>
      </div>

      {/* ===== FILTERS & SEARCH ===== */}
      {activeTab !== 'analytics' && activeTab !== 'settings' && (
        <div className="worker-filters">
          <div className="filters-left">
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="New">🆕 New</option>
              <option value="Assigned">📋 Assigned</option>
              <option value="In Progress">⏳ In Progress</option>
              <option value="Completed">✅ Completed</option>
              <option value="Rejected">❌ Rejected</option>
              <option value="Cancelled">🚫 Cancelled</option>
            </select>
            <div className="search-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
          <div className="worker-actions">
            <button className="btn-report" onClick={() => setShowReportModal(true)}>
              📊 Report
            </button>
            <button className="btn-refresh" onClick={() => { fetchTasks(); fetchStats(); }}>
              🔄 Refresh
            </button>
          </div>
        </div>
      )}

      {/* ============================================
          TASKS CONTENT
          ============================================ */}
      {activeTab !== 'analytics' && activeTab !== 'settings' && (
        <div className="tasks-content">
          {displayTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-title">No Tasks Found</div>
              <div className="empty-state-text">
                {searchTerm ? 'No tasks match your search' : 
                 activeTab === 'pending' ? 'No pending tasks' :
                 activeTab === 'progress' ? 'No tasks in progress' :
                 activeTab === 'completed' ? 'No completed tasks' :
                 activeTab === 'rejected' ? 'No rejected tasks' :
                 'You have no tasks assigned'}
              </div>
            </div>
          ) : (
            <div className="worker-tasks-grid">
              {displayTasks.map((task) => (
                <div key={task._id} className="worker-task-card">
                  <div className="task-card-header">
                    <div className="task-badges">
                      <span className={`status-badge ${getStatusClass(task.status)}`}>
                        {getStatusIcon(task.status)} {task.status}
                      </span>
                      <span className={`priority-badge ${getPriorityClass(task.priority)}`}>
                        ⚡ {task.priority}
                      </span>
                    </div>
                    <span className="task-number">#{task.ticketNumber}</span>
                  </div>

                  <div className="task-card-body">
                    <h3 className="task-title">{task.subject}</h3>
                    <p className="task-description">
                      {task.description?.slice(0, 100)}
                      {task.description?.length > 100 && '...'}
                    </p>
                    <div className="task-meta">
                      <span className="task-meta-item">
                        <span className="meta-icon">👤</span> {task.customerId?.name}
                      </span>
                      <span className="task-meta-item">
                        <span className="meta-icon">📂</span> {task.category}
                      </span>
                      <span className="task-meta-item">
                        <span className="meta-icon">📅</span> {new Date(task.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="task-card-footer">
                    <div className="task-assignee">
                      {task.workerId ? (
                        <div className="assignee-info">
                          <span className="assignee-avatar">
                            {task.workerId.name?.charAt(0).toUpperCase()}
                          </span>
                          <span className="assignee-name">{task.workerId.name}</span>
                        </div>
                      ) : (
                        <span className="assignee-unassigned">⏳ Not Assigned</span>
                      )}
                    </div>
                    <div className="task-actions">
                      {(task.status === 'Assigned' || task.status === 'New') && (
                        <>
                          <button 
                            onClick={() => handleStatusUpdate(task._id, 'Accepted')}
                            className="btn-accept"
                          >
                            ✅ Accept
                          </button>
                          <button 
                            onClick={() => handleStatusUpdate(task._id, 'Rejected')}
                            className="btn-reject"
                          >
                            ❌ Reject
                          </button>
                          <button 
                            onClick={() => handleStatusUpdate(task._id, 'In Progress')}
                            className="btn-progress"
                          >
                            ⏳ Start
                          </button>
                        </>
                      )}
                      {task.status === 'In Progress' && (
                        <button 
                          onClick={() => handleStatusUpdate(task._id, 'Completed')}
                          className="btn-complete"
                        >
                          ✅ Complete
                        </button>
                      )}
                      {(task.status === 'Completed' || task.status === 'Rejected' || task.status === 'Cancelled') && (
                        <span className="btn-disabled">
                          {task.status === 'Completed' ? '✅ Done' :
                           task.status === 'Rejected' ? '❌ Rejected' : '🚫 Cancelled'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================
          ANALYTICS TAB - FIXED
          ============================================ */}
      {activeTab === 'analytics' && (
        <div className="analytics-content">
          <h2 className="section-title">📈 Analytics Dashboard</h2>
          <p className="analytics-subtitle">Visual insights into your performance</p>
          
          {tasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <div className="empty-state-title">No Data Available</div>
              <div className="empty-state-text">
                Complete some tasks to see analytics and insights
              </div>
            </div>
          ) : (
            <div className="analytics-grid">
              {/* Status Distribution */}
              <div className="analytics-card">
                <h3>📊 Task Status Distribution</h3>
                {Object.entries(chartData.status).map(([status, count]) => (
                  <div key={status} className="chart-bar-item">
                    <span className="chart-label">{status}</span>
                    <div className="chart-bar-track">
                      <div className={`chart-bar-fill ${getStatusClass(status)}`} 
                        style={{ width: `${totalTasks > 0 ? (count / totalTasks) * 100 : 0}%` }} />
                    </div>
                    <span className="chart-count">{count}</span>
                  </div>
                ))}
              </div>

              {/* Priority Distribution */}
              <div className="analytics-card">
                <h3>⚡ Priority Distribution</h3>
                {Object.entries(chartData.priority).map(([priority, count]) => (
                  <div key={priority} className="chart-bar-item">
                    <span className="chart-label">{priority}</span>
                    <div className="chart-bar-track">
                      <div className={`chart-bar-fill ${getPriorityClass(priority)}`} 
                        style={{ width: `${totalTasks > 0 ? (count / totalTasks) * 100 : 0}%` }} />
                    </div>
                    <span className="chart-count">{count}</span>
                  </div>
                ))}
              </div>

              {/* Monthly Activity - FIXED */}
              <div className="analytics-card">
                <h3>📅 Monthly Activity</h3>
                {Object.keys(chartData.monthly).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--gray-500)' }}>
                    📭 No monthly data yet
                  </div>
                ) : (
                  <div className="monthly-chart">
                    {Object.entries(chartData.monthly).map(([month, count]) => {
                      const maxVal = Math.max(...Object.values(chartData.monthly), 1);
                      return (
                        <div key={month} className="monthly-item">
                          <div 
                            className="monthly-bar" 
                            style={{ 
                              height: `${(count / maxVal) * 100}%`,
                              background: 'linear-gradient(180deg, #6c5ce7, #a29bfe)'
                            }} 
                          />
                          <span className="monthly-label">{month}</span>
                          <span className="monthly-count">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Performance Summary */}
              <div className="analytics-card full-width">
                <h3>📊 Performance Summary</h3>
                <div className="performance-grid">
                  <div className="perf-item">
                    <span className="perf-label">Total Tasks</span>
                    <span className="perf-value">{totalTasks}</span>
                  </div>
                  <div className="perf-item">
                    <span className="perf-label">Completion Rate</span>
                    <span className="perf-value">
                      {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
                    </span>
                  </div>
                  <div className="perf-item">
                    <span className="perf-label">Avg Rating</span>
                    <span className="perf-value" style={{ color: '#eab308' }}>
                      ⭐ {user?.rating?.average || 0}/5
                    </span>
                  </div>
                  <div className="perf-item">
                    <span className="perf-label">Total Reviews</span>
                    <span className="perf-value">{user?.rating?.count || 0}</span>
                  </div>
                  <div className="perf-item">
                    <span className="perf-label">Pending Tasks</span>
                    <span className="perf-value" style={{ color: '#ef4444' }}>{pendingTasks}</span>
                  </div>
                  <div className="perf-item">
                    <span className="perf-label">Status</span>
                    <span className="perf-value" style={{ color: isAvailable ? '#22c55e' : '#ef4444' }}>
                      {isAvailable ? '✅ Available' : '⛔ Unavailable'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Report Section */}
              <div className="analytics-card full-width">
                <h3>📥 Download Reports</h3>
                <div className="report-buttons">
                  <button className="report-btn" onClick={() => downloadReport('json')}>
                    📄 JSON Report
                  </button>
                  <button className="report-btn success" onClick={() => downloadReport('csv')}>
                    📊 CSV Report
                  </button>
                  <button className="report-btn warning" onClick={() => downloadReport('text')}>
                    📋 Text Report
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================
          SETTINGS TAB
          ============================================ */}
      {activeTab === 'settings' && (
        <div className="settings-content">
          <h2 className="section-title">⚙️ Settings</h2>
          
          <div className="settings-grid">
            {/* Availability */}
            <div className="settings-card availability-card">
              <h3>🟢 Availability</h3>
              <div className="availability-status">
                <div className={`status-indicator ${isAvailable ? 'available' : 'unavailable'}`}>
                  <span className="status-dot-large"></span>
                  {isAvailable ? '✅ You are Available' : '⛔ You are Unavailable'}
                </div>
                <button className="settings-btn" onClick={updateAvailability}>
                  {isAvailable ? '⛔ Mark Unavailable' : '✅ Mark Available'}
                </button>
                <p className="status-hint">
                  {isAvailable ? 'You will receive new task assignments' : 'You will not receive new task assignments'}
                </p>
              </div>
            </div>

            {/* Profile */}
            <div className="settings-card profile-card">
              <h3>👤 Profile</h3>
              <div className="profile-field">
                <label>Name</label>
                <input 
                  type="text" 
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="profile-input"
                />
              </div>
              <div className="profile-field">
                <label>Email</label>
                <input 
                  type="email" 
                  value={user?.email}
                  className="profile-input"
                  disabled
                />
              </div>
              <div className="profile-field">
                <label>Role</label>
                <span className="profile-role">{user?.role}</span>
              </div>
              <button className="settings-btn profile-btn" onClick={handleUpdateProfile}>
                💾 Update
              </button>
            </div>

            {/* Security */}
            <div className="settings-card security-card">
              <h3>🔒 Security</h3>
              <div className="profile-field">
                <label>Current Password</label>
                <input 
                  type="password" 
                  placeholder="Enter current password"
                  className="profile-input"
                  value={profileData.currentPassword}
                  onChange={(e) => setProfileData({ ...profileData, currentPassword: e.target.value })}
                />
              </div>
              <div className="profile-field">
                <label>New Password</label>
                <input 
                  type="password" 
                  placeholder="Min 6 characters"
                  className="profile-input"
                  value={profileData.newPassword}
                  onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })}
                />
              </div>
              <button className="settings-btn password-btn" onClick={handleChangePassword}>
                🔑 Change
              </button>
            </div>

            {/* System */}
            <div className="settings-card system-card">
              <h3>📊 System Info</h3>
              <div className="system-stat">
                <span>Total Tasks</span>
                <span className="system-stat-value">{totalTasks}</span>
              </div>
              <div className="system-stat">
                <span>Completed</span>
                <span className="system-stat-value success">{completedTasks}</span>
              </div>
              <div className="system-stat">
                <span>In Progress</span>
                <span className="system-stat-value warning">{inProgressTasks}</span>
              </div>
              <div className="system-stat">
                <span>Rating</span>
                <span className="system-stat-value" style={{ color: '#eab308' }}>
                  ⭐ {user?.rating?.average || 0}/5
                </span>
              </div>
              <div className="system-stat">
                <span>Status</span>
                <span className={`system-stat-value ${isAvailable ? 'success' : 'danger'}`}>
                  {isAvailable ? '✅ Available' : '⛔ Unavailable'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== REPORT MODAL ===== */}
      {showReportModal && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📊 Download Report</h2>
              <button className="modal-close" onClick={() => setShowReportModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="modal-subtitle">Select report format:</p>
              <div className="report-options">
                <button 
                  className="report-option"
                  onClick={() => downloadReport('json')}
                  disabled={reportLoading}
                >
                  <span className="report-icon">📄</span>
                  <span>JSON Report</span>
                  <span className="report-desc">Detailed data</span>
                </button>
                <button 
                  className="report-option"
                  onClick={() => downloadReport('csv')}
                  disabled={reportLoading}
                >
                  <span className="report-icon">📊</span>
                  <span>CSV Report</span>
                  <span className="report-desc">Spreadsheet</span>
                </button>
                <button 
                  className="report-option"
                  onClick={() => downloadReport('text')}
                  disabled={reportLoading}
                >
                  <span className="report-icon">📋</span>
                  <span>Text Report</span>
                  <span className="report-desc">Printable</span>
                </button>
              </div>
              {reportLoading && <div className="report-loading">Generating...</div>}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowReportModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}