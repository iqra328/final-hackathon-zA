import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import { API_URL } from '../../config/api';
import '../../styles/global.css';
import '../../styles/AgentDashboard.css';

export default function AgentDashboard() {
  const { token, user, logout } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('assigned');
  const [notification, setNotification] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    fetchTickets();
    fetchStats();

    if (socket) {
      socket.on('new-ticket', () => {
        fetchTickets();
        fetchStats();
        showNotification('🆕 New ticket created!', 'info');
      });
      
      socket.on('ticket-status-changed', () => {
        fetchTickets();
        fetchStats();
      });
      
      socket.on('ticket-assigned', () => {
        fetchTickets();
        showNotification('📋 Ticket assigned to you!', 'info');
      });
    }

    return () => {
      if (socket) {
        socket.off('new-ticket');
        socket.off('ticket-status-changed');
        socket.off('ticket-assigned');
      }
    };
  }, [socket]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchTickets = async () => {
    try {
      const response = await axios.get(`${API_URL}/tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(response.data);
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

  const handleAssign = async (ticketId) => {
    try {
      await axios.put(
        `${API_URL}/tickets/${ticketId}/assign-agent`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchTickets();
      showNotification('✅ Ticket assigned to you!', 'success');
    } catch (error) {
      showNotification(error.response?.data?.error || 'Failed to assign ticket', 'error');
    }
  };

  const handleStatusUpdate = async (ticketId, status) => {
    try {
      await axios.put(
        `${API_URL}/tickets/${ticketId}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchTickets();
      showNotification(`✅ Status updated to ${status}!`, 'success');
    } catch (error) {
      showNotification(error.response?.data?.error || 'Failed to update status', 'error');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
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

  const filteredTickets = tickets.filter(ticket => {
    const matchesFilter = filter === 'all' || ticket.status === filter;
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Tab filters
  const getTabTickets = (tab) => {
    switch(tab) {
      case 'assigned':
        return filteredTickets.filter(t => t.agentId?._id === user?.id);
      case 'unassigned':
        return filteredTickets.filter(t => !t.agentId && t.status === 'New');
      case 'all':
        return filteredTickets;
      default:
        return filteredTickets;
    }
  };

  const displayTickets = getTabTickets(activeTab);

  // Stats
  const assignedCount = tickets.filter(t => t.agentId?._id === user?.id).length;
  const unassignedCount = tickets.filter(t => !t.agentId && t.status === 'New').length;
  const urgentCount = tickets.filter(t => t.priority === 'Urgent' || t.priority === 'High').length;

  if (loading) {
    return (
      <div className="agent-loading">
        <LoadingSpinner size="lg" text="Loading agent dashboard..." />
      </div>
    );
  }

  return (
    <div className="agent-dashboard">
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
      <div className="agent-header">
        <div className="agent-header-left">
          <div className="agent-avatar">
            <span>{user?.name?.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <h1 className="agent-title">🎯 Agent <span>Dashboard</span></h1>
            <p className="agent-subtitle">Welcome back, {user?.name} 👋</p>
          </div>
        </div>
        <div className="agent-header-right">
          <div className="agent-stats-badge">
            <span>📋 {assignedCount} Assigned</span>
            <span>🆕 {unassignedCount} Unassigned</span>
            <span>⚠️ {urgentCount} Urgent</span>
          </div>
          <button onClick={handleLogout} className="btn-logout">
            🚪 Logout
          </button>
        </div>
      </div>

      {/* ===== STATS ===== */}
      {stats && (
        <div className="agent-stats">
          <div className="agent-stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <span className="stat-label">Total Tickets</span>
              <span className="stat-value primary">{stats.totalTickets || 0}</span>
            </div>
          </div>
          <div className="agent-stat-card">
            <div className="stat-icon">🔄</div>
            <div className="stat-info">
              <span className="stat-label">Open</span>
              <span className="stat-value warning">{stats.openTickets || 0}</span>
            </div>
          </div>
          <div className="agent-stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <span className="stat-label">Completed</span>
              <span className="stat-value success">{stats.completedTickets || 0}</span>
            </div>
          </div>
          <div className="agent-stat-card">
            <div className="stat-icon">⚠️</div>
            <div className="stat-info">
              <span className="stat-label">High Priority</span>
              <span className="stat-value danger">{stats.highPriority || 0}</span>
            </div>
          </div>
          <div className="agent-stat-card">
            <div className="stat-icon">👤</div>
            <div className="stat-info">
              <span className="stat-label">Assigned to Me</span>
              <span className="stat-value primary">{assignedCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* ===== TABS ===== */}
      <div className="agent-tabs">
        <button 
          className={`tab-btn ${activeTab === 'assigned' ? 'active' : ''}`}
          onClick={() => { setActiveTab('assigned'); setFilter('all'); setSearchTerm(''); }}
        >
          📋 Assigned ({assignedCount})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'unassigned' ? 'active' : ''}`}
          onClick={() => { setActiveTab('unassigned'); setFilter('all'); setSearchTerm(''); }}
        >
          📌 Unassigned ({unassignedCount})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => { setActiveTab('all'); setFilter('all'); setSearchTerm(''); }}
        >
          🎫 All ({tickets.length})
        </button>
      </div>

      {/* ===== FILTERS ===== */}
      <div className="agent-filters">
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
        <button className="btn-refresh" onClick={() => { fetchTickets(); fetchStats(); }}>
          🔄 Refresh
        </button>
      </div>

      {/* ===== TICKETS LIST ===== */}
      {displayTickets.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-title">No Tickets Found</div>
          <div className="empty-state-text">
            {searchTerm ? 'No tickets match your search' : 
             activeTab === 'assigned' ? 'You have no assigned tickets' :
             activeTab === 'unassigned' ? 'All tickets are assigned' :
             'No tickets available'}
          </div>
        </div>
      ) : (
        <div className="agent-tickets-grid">
          {displayTickets.map((ticket) => (
            <div key={ticket._id} className="agent-ticket-card">
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
                  {ticket.description?.slice(0, 100)}
                  {ticket.description?.length > 100 && '...'}
                </p>
                <div className="ticket-meta">
                  <span className="ticket-meta-item">
                    <span className="meta-icon">👤</span> {ticket.customerId?.name}
                  </span>
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
                  {ticket.agentId ? (
                    <div className="assignee-info">
                      <span className="assignee-avatar">
                        {ticket.agentId.name?.charAt(0).toUpperCase()}
                      </span>
                      <span className="assignee-name">{ticket.agentId.name}</span>
                    </div>
                  ) : (
                    <span className="assignee-unassigned">⏳ Unassigned</span>
                  )}
                </div>
                <div className="ticket-actions">
                  {!ticket.agentId && ticket.status === 'New' && (
                    <button 
                      onClick={() => handleAssign(ticket._id)}
                      className="btn-assign"
                    >
                      Assign to Me
                    </button>
                  )}
                  {ticket.agentId?._id === user?.id && ticket.status !== 'Completed' && ticket.status !== 'Rejected' && (
                    <>
                      {ticket.status === 'Assigned' && (
                        <button 
                          onClick={() => handleStatusUpdate(ticket._id, 'In Progress')}
                          className="btn-progress"
                        >
                          ⏳ Start
                        </button>
                      )}
                      {ticket.status === 'In Progress' && (
                        <button 
                          onClick={() => handleStatusUpdate(ticket._id, 'Completed')}
                          className="btn-complete"
                        >
                          ✅ Complete
                        </button>
                      )}
                    </>
                  )}
                  <Link to={`/ticket/${ticket._id}`} className="btn-view">
                    View
                  </Link>
                  {ticket.status === 'Assigned' && ticket.agentId?._id === user?.id && (
                    <Link 
                      to={`/agent/assign/${ticket._id}`}
                      className="btn-assign-worker"
                    >
                      👷 Assign Worker
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}