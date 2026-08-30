import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import { API_URL } from '../../config/api';
import '../../styles/global.css';
import '../../styles/CustomerDashboard.css';

export default function CustomerDashboard() {
  const { token, user, logout } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  
  // State
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [notification, setNotification] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [notificationsEnabled, setNotificationsEnabled] = useState(localStorage.getItem('customerNotifications') !== 'false');
  const [autoRefresh, setAutoRefresh] = useState(localStorage.getItem('customerAutoRefresh') !== 'false');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const refreshTimer = setInterval(() => {
      fetchTickets();
      fetchStats();
    }, 30000);
    return () => clearInterval(refreshTimer);
  }, [autoRefresh]);

  // Fetch Data
  useEffect(() => {
    fetchTickets();
    fetchStats();

    if (socket) {
      socket.on('ticket-updated', () => {
        fetchTickets();
        fetchStats();
        showNotification('🔄 Ticket updated!', 'info');
      });
      socket.on('new-message', () => {
        fetchTickets();
        showNotification('💬 New message received!', 'info');
      });
    }

    return () => {
      if (socket) {
        socket.off('ticket-updated');
        socket.off('new-message');
      }
    };
  }, [socket]);

  const fetchTickets = async () => {
    try {
      const response = await axios.get(`${API_URL}/tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(response.data);
      generateChartData(response.data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
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

  const generateChartData = (ticketsData) => {
    const statusCount = {};
    const priorityCount = {};
    const categoryCount = {};
    const monthlyData = {};

    ticketsData.forEach(ticket => {
      statusCount[ticket.status] = (statusCount[ticket.status] || 0) + 1;
      priorityCount[ticket.priority] = (priorityCount[ticket.priority] || 0) + 1;
      categoryCount[ticket.category] = (categoryCount[ticket.category] || 0) + 1;
      const month = new Date(ticket.createdAt).toLocaleString('default', { month: 'short' });
      monthlyData[month] = (monthlyData[month] || 0) + 1;
    });

    setChartData({
      status: statusCount,
      priority: priorityCount,
      category: categoryCount,
      monthly: monthlyData
    });
  };

  const showNotification = (message, type = 'success') => {
    if (!notificationsEnabled && type !== 'error') return;
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleCancelTicket = async (ticketId) => {
    try {
      await axios.put(
        `${API_URL}/tickets/${ticketId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowCancelModal(false);
      fetchTickets();
      fetchStats();
      showNotification('✅ Ticket cancelled successfully!', 'success');
    } catch (error) {
      showNotification(error.response?.data?.error || 'Failed to cancel ticket', 'error');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleTheme = () => setTheme((currentTheme) => currentTheme === 'light' ? 'dark' : 'light');

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

  const filteredTickets = tickets.filter(ticket => {
    const matchesFilter = filter === 'all' || ticket.status === filter;
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTickets = filteredTickets.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const allCount = tickets.length;
  const openCount = tickets.filter(t => t.status === 'New' || t.status === 'Assigned' || t.status === 'In Progress').length;
  const completedCount = tickets.filter(t => t.status === 'Completed').length;
  const cancelledCount = tickets.filter(t => t.status === 'Rejected' || t.status === 'Cancelled').length;

  const getStatusPercent = (count) => {
    return tickets.length > 0 ? Math.round((count / tickets.length) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="customer-loading">
        <LoadingSpinner size="lg" text="Loading your dashboard..." />
      </div>
    );
  }

  return (
    <div className={`customer-dashboard ${theme}`}>
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

      <section className="customer-hero">
        <div className="customer-hero-copy">
          <span className="customer-eyebrow">CUSTOMER CARE / LIVE DESK</span>
          <h1>Your support, <span>moving forward.</span></h1>
          <p>Track requests in real time, see every update, and keep help within reach.</p>
          <div className="customer-hero-meta"><span className="customer-live-dot" /> Workspace online <span className="customer-meta-divider" /> {openCount} active requests</div>
        </div>
        <div className="customer-ticket-scene" aria-hidden="true">
          <div className="customer-orbit customer-orbit-one" />
          <div className="customer-orbit customer-orbit-two" />
          <div className="customer-ticket customer-ticket-back" />
          <div className="customer-ticket customer-ticket-front">
            <small>TICKET / LIVE</small>
            <strong>Support request</strong>
            <span className="customer-ticket-line" />
            <span className="customer-ticket-line short" />
            <b><i /> IN PROGRESS</b>
          </div>
          <span className="customer-scene-badge badge-sla">SLA 98%</span>
          <span className="customer-scene-badge badge-ai">AI READY</span>
        </div>
      </section>

      {/* ===== HEADER ===== */}
      <div className="dashboard-header">
        <div className="dashboard-header-left">
          <div className="dashboard-avatar">
            <span>{user?.name?.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <h1 className="dashboard-title">
              Welcome back, <span>{user?.name}</span>
            </h1>
            <p className="dashboard-subtitle">
              Manage your support tickets and track their status
            </p>
          </div>
        </div>
        <div className="dashboard-header-right">
          <button onClick={toggleTheme} className="btn-theme" title="Toggle theme">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button onClick={handleLogout} className="btn-logout">
            <span>🚪</span> Logout
          </button>
          <Link to="/create-ticket" className="btn-primary">
            <span>✚</span> New Ticket
          </Link>
        </div>
      </div>

      {/* ===== STATS CARDS ===== */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card total">
            <div className="stat-card-icon">📊</div>
            <div className="stat-card-info">
              <span className="stat-card-label">Total Tickets</span>
              <span className="stat-card-value">{stats.totalTickets || 0}</span>
            </div>
          </div>
          <div className="stat-card open">
            <div className="stat-card-icon">🔄</div>
            <div className="stat-card-info">
              <span className="stat-card-label">Open</span>
              <span className="stat-card-value">{stats.openTickets || 0}</span>
            </div>
          </div>
          <div className="stat-card completed">
            <div className="stat-card-icon">✅</div>
            <div className="stat-card-info">
              <span className="stat-card-label">Completed</span>
              <span className="stat-card-value">{stats.completedTickets || 0}</span>
            </div>
          </div>
          <div className="stat-card cancelled">
            <div className="stat-card-icon">🚫</div>
            <div className="stat-card-info">
              <span className="stat-card-label">Cancelled</span>
              <span className="stat-card-value">{stats.cancelledTickets || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* ===== TABS ===== */}
      <div className="dashboard-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => { setActiveTab('overview'); setCurrentPage(1); }}
        >
          📊 Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'tickets' ? 'active' : ''}`}
          onClick={() => { setActiveTab('tickets'); setCurrentPage(1); }}
        >
          🎫 All Tickets ({allCount})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'open' ? 'active' : ''}`}
          onClick={() => { setActiveTab('open'); setCurrentPage(1); setFilter('all'); }}
        >
          🔄 Open ({openCount})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => { setActiveTab('completed'); setCurrentPage(1); setFilter('all'); }}
        >
          ✅ Completed ({completedCount})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => { setActiveTab('analytics'); setCurrentPage(1); }}
        >
          📈 Analytics
        </button>
        <button 
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => { setActiveTab('settings'); setCurrentPage(1); }}
        >
          ⚙️ Settings
        </button>
      </div>

      {/* ===== OVERVIEW TAB ===== */}
      {activeTab === 'overview' && (
        <>
          <div className="quick-stats">
            <div className="quick-stat">
              <span className="quick-stat-label">All Tickets</span>
              <span className="quick-stat-value">{allCount}</span>
              <div className="quick-stat-bar">
                <div className="quick-stat-fill" style={{ width: '100%', background: '#2563eb' }}></div>
              </div>
            </div>
            <div className="quick-stat">
              <span className="quick-stat-label">Open</span>
              <span className="quick-stat-value">{openCount}</span>
              <div className="quick-stat-bar">
                <div className="quick-stat-fill" style={{ width: `${getStatusPercent(openCount)}%`, background: '#eab308' }}></div>
              </div>
            </div>
            <div className="quick-stat">
              <span className="quick-stat-label">Completed</span>
              <span className="quick-stat-value">{completedCount}</span>
              <div className="quick-stat-bar">
                <div className="quick-stat-fill" style={{ width: `${getStatusPercent(completedCount)}%`, background: '#22c55e' }}></div>
              </div>
            </div>
            <div className="quick-stat">
              <span className="quick-stat-label">Cancelled</span>
              <span className="quick-stat-value">{cancelledCount}</span>
              <div className="quick-stat-bar">
                <div className="quick-stat-fill" style={{ width: `${getStatusPercent(cancelledCount)}%`, background: '#ef4444' }}></div>
              </div>
            </div>
          </div>

          <div className="recent-activity">
            <h2 className="section-title">🕐 Recent Activity</h2>
            <div className="activity-list">
              {tickets.slice(0, 5).map((ticket) => (
                <Link key={ticket._id} to={`/ticket/${ticket._id}`} className="activity-item">
                  <div className="activity-icon">🎫</div>
                  <div className="activity-content">
                    <div className="activity-title">
                      {ticket.subject}
                      <span className={`badge ${getStatusClass(ticket.status)}`}>
                        {ticket.status}
                      </span>
                      <span className={`badge-priority ${getPriorityClass(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <div className="activity-meta">
                      #{ticket.ticketNumber} • {ticket.category} • 
                      {new Date(ticket.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ===== TICKETS TAB ===== */}
      {(activeTab === 'tickets' || activeTab === 'open' || activeTab === 'completed') && (
        <>
          <div className="filters-section">
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
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>
            <div className="filters-right">
              <button className="btn-refresh" onClick={() => { fetchTickets(); fetchStats(); }}>
                🔄 Refresh
              </button>
            </div>
          </div>

          {(() => {
            let displayTickets = filteredTickets;
            if (activeTab === 'open') {
              displayTickets = filteredTickets.filter(t => t.status === 'New' || t.status === 'Assigned' || t.status === 'In Progress');
            } else if (activeTab === 'completed') {
              displayTickets = filteredTickets.filter(t => t.status === 'Completed');
            }
            
            const displayCurrentTickets = displayTickets.slice(indexOfFirstItem, indexOfLastItem);
            const displayTotalPages = Math.ceil(displayTickets.length / itemsPerPage);

            return (
              <div className="tickets-content">
                {displayTickets.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📭</div>
                    <div className="empty-state-title">No Tickets Found</div>
                    <div className="empty-state-text">
                      {searchTerm ? 'No tickets match your search criteria' : 'Create your first ticket to get started'}
                    </div>
                    {!searchTerm && (
                      <Link to="/create-ticket" className="btn-primary empty-btn">
                        ✚ Create Ticket
                      </Link>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="tickets-grid">
                      {displayCurrentTickets.map((ticket) => (
                        <div key={ticket._id} className="ticket-card">
                          <div className="ticket-card-header">
                            <div className="ticket-badges">
                              <span className={`status-badge ${getStatusClass(ticket.status)}`}>
                                {getStatusIcon(ticket.status)} {ticket.status}
                              </span>
                              <span className={`priority-badge ${getPriorityClass(ticket.priority)}`}>
                                ⚡ {ticket.priority}
                              </span>
                            </div>
                            <span className="ticket-number">#{ticket.ticketNumber}</span>
                          </div>

                          <div className="ticket-card-body">
                            <h3 className="ticket-title">{ticket.subject}</h3>
                            <p className="ticket-description">
                              {ticket.description?.slice(0, 120)}
                              {ticket.description?.length > 120 && '...'}
                            </p>
                            <div className="ticket-meta">
                              <span className="ticket-meta-item">
                                <span className="meta-icon">📂</span> {ticket.category}
                              </span>
                              <span className="ticket-meta-item">
                                <span className="meta-icon">💬</span> {ticket.messages?.length || 0}
                              </span>
                              <span className="ticket-meta-item">
                                <span className="meta-icon">📅</span> {new Date(ticket.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          <div className="ticket-card-footer">
                            <div className="ticket-assignee">
                              {ticket.workerId ? (
                                <div className="assignee-avatar">
                                  <span>{ticket.workerId.name?.charAt(0).toUpperCase()}</span>
                                  <span className="assignee-name">{ticket.workerId.name}</span>
                                </div>
                              ) : ticket.agentId ? (
                                <span className="assignee-agent">👤 Agent Assigned</span>
                              ) : (
                                <span className="assignee-waiting">⏳ Waiting for Assignment</span>
                              )}
                            </div>
                            <div className="ticket-actions">
                              <Link to={`/ticket/${ticket._id}`} className="btn-view">
                                View
                              </Link>
                              {(ticket.status === 'New' || ticket.status === 'Assigned' || ticket.status === 'In Progress') && (
                                <button 
                                  className="btn-cancel"
                                  onClick={() => {
                                    setSelectedTicket(ticket);
                                    setShowCancelModal(true);
                                  }}
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {displayTotalPages > 1 && (
                      <div className="pagination">
                        <button 
                          className="pagination-btn"
                          onClick={() => paginate(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          ← Prev
                        </button>
                        {[...Array(displayTotalPages)].map((_, i) => (
                          <button
                            key={i}
                            className={`pagination-btn ${currentPage === i + 1 ? 'active' : ''}`}
                            onClick={() => paginate(i + 1)}
                          >
                            {i + 1}
                          </button>
                        ))}
                        <button 
                          className="pagination-btn"
                          onClick={() => paginate(currentPage + 1)}
                          disabled={currentPage === displayTotalPages}
                        >
                          Next →
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })()}
        </>
      )}

      {/* ===== ANALYTICS TAB ===== */}
      {activeTab === 'analytics' && chartData && (
        <div className="analytics-content">
          <div className="analytics-header">
            <h2 className="analytics-title">📈 Ticket Analytics</h2>
            <p className="analytics-subtitle">Visual insights into your support activity</p>
          </div>

          <div className="analytics-grid">
            <div className="analytics-card">
              <h3>📊 Status Distribution</h3>
              <div className="chart-status">
                {Object.entries(chartData.status).map(([status, count]) => (
                  <div key={status} className="chart-bar-item">
                    <div className="chart-bar-label">
                      <span className={`status-dot ${getStatusClass(status)}`}></span>
                      <span>{status}</span>
                      <span className="chart-bar-count">{count}</span>
                    </div>
                    <div className="chart-bar-track">
                      <div 
                        className={`chart-bar-fill ${getStatusClass(status)}`}
                        style={{ width: `${getStatusPercent(count)}%` }}
                      ></div>
                    </div>
                    <span className="chart-bar-percent">
                      {getStatusPercent(count)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="analytics-card">
              <h3>⚡ Priority Distribution</h3>
              <div className="chart-priority">
                {Object.entries(chartData.priority).map(([priority, count]) => (
                  <div key={priority} className="chart-donut-item">
                    <div className="chart-donut-label">
                      <span className={`priority-dot ${getPriorityClass(priority)}`}></span>
                      <span>{priority}</span>
                    </div>
                    <div className="chart-donut-bar">
                      <div 
                        className={`chart-donut-fill ${getPriorityClass(priority)}`}
                        style={{ width: `${getStatusPercent(count)}%` }}
                      ></div>
                    </div>
                    <span className="chart-donut-count">{count}</span>
                  </div>
                ))}
              </div>
              <div className="chart-summary">
                <div className="chart-summary-item">
                  <span>High Priority</span>
                  <span className="chart-summary-value">
                    {Object.entries(chartData.priority)
                      .filter(([p]) => p === 'High' || p === 'Urgent')
                      .reduce((sum, [_, count]) => sum + count, 0)}
                  </span>
                </div>
                <div className="chart-summary-item">
                  <span>Medium Priority</span>
                  <span className="chart-summary-value">
                    {chartData.priority['Medium'] || 0}
                  </span>
                </div>
                <div className="chart-summary-item">
                  <span>Low Priority</span>
                  <span className="chart-summary-value">
                    {chartData.priority['Low'] || 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="analytics-card">
              <h3>📂 Category Distribution</h3>
              <div className="chart-category">
                {Object.entries(chartData.category).map(([category, count]) => (
                  <div key={category} className="chart-category-item">
                    <span className="chart-category-label">{category}</span>
                    <div className="chart-category-bar">
                      <div 
                        className="chart-category-fill"
                        style={{ 
                          width: `${getStatusPercent(count)}%`,
                          background: `hsl(${Math.random() * 360}, 70%, 50%)`
                        }}
                      ></div>
                    </div>
                    <span className="chart-category-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="analytics-card">
              <h3>📅 Monthly Activity</h3>
              <div className="chart-monthly">
                <div className="chart-monthly-bars">
                  {Object.entries(chartData.monthly).map(([month, count]) => (
                    <div key={month} className="chart-monthly-item">
                      <div 
                        className="chart-monthly-bar"
                        style={{ 
                          height: `${(count / Math.max(...Object.values(chartData.monthly), 1)) * 100}%`,
                          background: `linear-gradient(180deg, #2563eb, #7c3aed)`
                        }}
                      ></div>
                      <span className="chart-monthly-label">{month}</span>
                      <span className="chart-monthly-count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="analytics-card full-width">
              <h3>📊 Summary Statistics</h3>
              <div className="summary-grid">
                <div className="summary-item">
                  <span className="summary-icon">📊</span>
                  <div>
                    <span className="summary-label">Total Tickets</span>
                    <span className="summary-value">{tickets.length}</span>
                  </div>
                </div>
                <div className="summary-item">
                  <span className="summary-icon">✅</span>
                  <div>
                    <span className="summary-label">Completion Rate</span>
                    <span className="summary-value">
                      {tickets.length > 0 ? Math.round((completedCount / tickets.length) * 100) : 0}%
                    </span>
                  </div>
                </div>
                <div className="summary-item">
                  <span className="summary-icon">⏳</span>
                  <div>
                    <span className="summary-label">Avg Response Time</span>
                    <span className="summary-value">4.2 hrs</span>
                  </div>
                </div>
                <div className="summary-item">
                  <span className="summary-icon">💬</span>
                  <div>
                    <span className="summary-label">Total Messages</span>
                    <span className="summary-value">
                      {tickets.reduce((sum, t) => sum + (t.messages?.length || 0), 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="customer-settings-content">
          <div className="settings-heading">
            <div>
              <span className="customer-eyebrow">WORKSPACE PREFERENCES</span>
              <h2 className="analytics-title">Settings & preferences</h2>
              <p className="analytics-subtitle">Tune how your support workspace behaves.</p>
            </div>
            <span className="settings-saved">● Preferences saved locally</span>
          </div>
          <div className="customer-settings-grid">
            <div className="customer-setting-card">
              <span className="setting-card-icon">◐</span>
              <div><h3>Appearance</h3><p>Choose the workspace contrast for your shift.</p></div>
              <button className="setting-action" onClick={toggleTheme}>{theme === 'light' ? 'Switch to dark' : 'Switch to light'} {theme === 'light' ? '◐' : '○'}</button>
            </div>
            <div className="customer-setting-card">
              <span className="setting-card-icon">◌</span>
              <div><h3>Ticket alerts</h3><p>Show updates when your ticket receives a response.</p></div>
              <label className="customer-toggle"><input type="checkbox" checked={notificationsEnabled} onChange={(event) => { setNotificationsEnabled(event.target.checked); localStorage.setItem('customerNotifications', event.target.checked); }} /><span /></label>
            </div>
            <div className="customer-setting-card">
              <span className="setting-card-icon">↻</span>
              <div><h3>Auto refresh</h3><p>Sync tickets automatically every 30 seconds.</p></div>
              <label className="customer-toggle"><input type="checkbox" checked={autoRefresh} onChange={(event) => { setAutoRefresh(event.target.checked); localStorage.setItem('customerAutoRefresh', event.target.checked); }} /><span /></label>
            </div>
          </div>
        </div>
      )}

      {/* ===== CANCEL MODAL ===== */}
      {showCancelModal && selectedTicket && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Cancel Ticket</h2>
              <button className="modal-close" onClick={() => setShowCancelModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-icon">⚠️</div>
              <p className="modal-title">Are you sure?</p>
              <p className="modal-text">
                You are about to cancel ticket <strong>#{selectedTicket.ticketNumber}</strong>.
                This action cannot be undone.
              </p>
              <div className="modal-ticket-info">
                <span><strong>Subject:</strong> {selectedTicket.subject}</span>
                <span><strong>Status:</strong> {selectedTicket.status}</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel-modal" onClick={() => setShowCancelModal(false)}>
                Keep Ticket
              </button>
              <button className="btn-confirm-cancel" onClick={() => handleCancelTicket(selectedTicket._id)}>
                Yes, Cancel Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}