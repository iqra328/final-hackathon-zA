import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import '../../styles/global.css';
import '../../styles/AgentPortal.css';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace(/\/$/, '');

export default function AgentPortal() {
  const { token, user, logout } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('tickets');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('agentTheme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('agentTheme', theme);
  }, [theme]);

  useEffect(() => {
    fetchData();

    if (socket) {
      socket.on('new-ticket', () => {
        fetchData();
      });
      socket.on('ticket-status-changed', () => {
        fetchData();
      });
      socket.on('ticket-updated', () => {
        fetchData();
      });
        socket.on('new-message', () => {
          fetchData();
        });
    }

    return () => {
      if (socket) {
        socket.off('new-ticket');
        socket.off('ticket-status-changed');
        socket.off('ticket-updated');
        socket.off('new-message');
      }
    };
  }, [socket]);

  const fetchData = async () => {
    try {
      const [ticketsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/tickets`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/tickets/stats/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setTickets(ticketsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (ticketId) => {
    try {
      await axios.put(
        `${API_URL}/tickets/${ticketId}/assign-agent`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to assign ticket');
    }
  };

  const handleStatusUpdate = async (ticketId, newStatus) => {
    try {
      await axios.put(
        `${API_URL}/tickets/${ticketId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update status');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleTheme = () => setTheme((currentTheme) => currentTheme === 'light' ? 'dark' : 'light');

  const getPercent = (count, total = tickets.length) => total > 0 ? Math.round((count / total) * 100) : 0;

  const getStatusClass = (status) => {
    const map = {
      'New': 'status-new',
      'Assigned': 'status-assigned',
      'In Progress': 'status-progress',
      'Completed': 'status-completed',
      'Rejected': 'status-rejected',
      'Cancelled': 'status-cancelled',
    };
    return map[status] || 'status-new';
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

  const assignedTickets = filteredTickets.filter(t => t.agentId?._id === user?.id);
  const unassignedTickets = filteredTickets.filter(t => !t.agentId);

  if (loading) {
    return (
      <div className="portal-loading">
        <LoadingSpinner size="lg" text="Loading Agent Portal..." />
      </div>
    );
  }

  return (
    <div className={`agent-portal ${theme}`}>
      <section className="agent-hero">
        <div className="agent-hero-copy">
          <span className="agent-eyebrow">SUPPORTDESK / AGENT OPS</span>
          <h1>Resolve with <span>clarity.</span></h1>
          <p>Prioritize customer needs, coordinate the team, and move every ticket toward resolution.</p>
          <div className="agent-hero-meta"><span className="agent-live-dot" /> Live queue <i /> {unassignedTickets.length} tickets need ownership</div>
        </div>
        <div className="agent-scene" aria-hidden="true">
          <div className="agent-ring agent-ring-one" />
          <div className="agent-ring agent-ring-two" />
          <div className="agent-console agent-console-back" />
          <div className="agent-console agent-console-front">
            <small>QUEUE / ACTIVE</small>
            <strong>Ticket command</strong>
            <span className="agent-console-line" /><span className="agent-console-line short" />
            <b><i /> AGENT ONLINE</b>
          </div>
          <span className="agent-scene-tag tag-sla">SLA 94%</span>
          <span className="agent-scene-tag tag-focus">FOCUS MODE</span>
        </div>
      </section>

      {/* ===== HEADER ===== */}
      <div className="portal-header">
        <div className="portal-header-left">
          <div className="portal-logo">🎯</div>
          <div>
            <h1 className="portal-title">Agent Portal</h1>
            <p className="portal-subtitle">Welcome back, {user?.name} 👋</p>
          </div>
        </div>
        <div className="portal-header-right">
          <div className="portal-stats-badge">
            <span>📋 {assignedTickets.length} Assigned</span>
            <span>🆕 {unassignedTickets.length} Unassigned</span>
          </div>
          <button onClick={toggleTheme} className="agent-theme-toggle" title="Toggle theme">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button onClick={handleLogout} className="btn-logout">
            🚪 Logout
          </button>
        </div>
      </div>

      {/* ===== STATS CARDS ===== */}
      <div className="portal-stats">
        <div className="stat-card total">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <span className="stat-label">Total Tickets</span>
            <span className="stat-value">{stats?.totalTickets || 0}</span>
          </div>
        </div>
        <div className="stat-card open">
          <div className="stat-icon">🔄</div>
          <div className="stat-info">
            <span className="stat-label">Open</span>
            <span className="stat-value">{stats?.openTickets || 0}</span>
          </div>
        </div>
        <div className="stat-card completed">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <span className="stat-label">Completed</span>
            <span className="stat-value">{stats?.completedTickets || 0}</span>
          </div>
        </div>
        <div className="stat-card high-priority">
          <div className="stat-icon">⚠️</div>
          <div className="stat-info">
            <span className="stat-label">High Priority</span>
            <span className="stat-value">{stats?.highPriority || 0}</span>
          </div>
        </div>
      </div>

      {/* ===== TABS ===== */}
      <div className="portal-tabs">
        <button 
          className={`tab-btn ${activeTab === 'tickets' ? 'active' : ''}`}
          onClick={() => setActiveTab('tickets')}
        >
          🎫 All Tickets
        </button>
        <button 
          className={`tab-btn ${activeTab === 'assigned' ? 'active' : ''}`}
          onClick={() => setActiveTab('assigned')}
        >
          📋 Assigned to Me ({assignedTickets.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'unassigned' ? 'active' : ''}`}
          onClick={() => setActiveTab('unassigned')}
        >
          📌 Unassigned ({unassignedTickets.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📈 Analytics
        </button>
      </div>

      {/* ===== FILTERS & SEARCH ===== */}
      <div className="portal-filters">
        <div className="filter-group">
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
          <input
            type="text"
            placeholder="🔍 Search tickets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-actions">
          <button className="btn-refresh" onClick={fetchData}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* ===== TICKETS CONTENT ===== */}
      {activeTab !== 'analytics' && (
        <div className="tickets-content">
          {filteredTickets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <div className="empty-title">No Tickets Found</div>
              <div className="empty-text">No tickets match your current filters</div>
            </div>
          ) : (
            <div className="tickets-grid">
              {(activeTab === 'assigned' ? assignedTickets : 
                activeTab === 'unassigned' ? unassignedTickets : 
                filteredTickets).map((ticket) => (
                <div key={ticket._id} className="ticket-card">
                  <div className="ticket-header">
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
                  
                  <div className="ticket-body">
                    <h3 className="ticket-title">{ticket.subject}</h3>
                    <p className="ticket-description">{ticket.description?.slice(0, 100)}...</p>
                    <div className="ticket-meta">
                      <span>👤 {ticket.customerId?.name || 'Unknown'}</span>
                      <span>📂 {ticket.category}</span>
                      <span>💬 {ticket.messages?.length || 0}</span>
                    </div>
                  </div>

                  <div className="ticket-footer">
                    <div className="ticket-assignee">
                      {ticket.agentId ? (
                        <span className="assigned-user">
                          👤 {ticket.agentId.name}
                        </span>
                      ) : (
                        <span className="unassigned">⏳ Unassigned</span>
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
                              Start Working
                            </button>
                          )}
                          {ticket.status === 'In Progress' && (
                            <button 
                              onClick={() => handleStatusUpdate(ticket._id, 'Completed')}
                              className="btn-complete"
                            >
                              Complete
                            </button>
                          )}
                        </>
                      )}
                      <Link 
                        to={`/ticket/${ticket._id}`}
                        className="btn-view"
                      >
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
      )}

      {/* ===== ANALYTICS TAB ===== */}
      {activeTab === 'analytics' && (
        <div className="analytics-content">
          <div className="analytics-grid">
            <div className="analytics-card">
              <h3>📊 Category Distribution</h3>
              <div className="category-chart">
                {stats?.categoryStats?.map((cat) => (
                  <div key={cat._id} className="category-bar">
                    <span className="category-label">{cat._id}</span>
                    <div className="bar-track">
                      <div 
                        className="bar-fill" 
                        style={{ 
                          width: `${getPercent(cat.count, stats.totalTickets)}%`,
                          background: `hsl(${Math.random() * 360}, 70%, 50%)`
                        }}
                      ></div>
                    </div>
                    <span className="category-count">{cat.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="analytics-card">
              <h3>📈 Status Distribution</h3>
              <div className="status-distribution">
                {stats?.statusStats?.map((stat) => (
                  <div key={stat._id} className="status-item">
                    <span className={`status-dot ${getStatusClass(stat._id)}`}></span>
                    <span className="status-name">{stat._id}</span>
                    <span className="status-count">{stat.count}</span>
                    <span className="status-percent">
                      {getPercent(stat.count, stats.totalTickets)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="analytics-card full-width">
              <h3>📊 Performance Overview</h3>
              <div className="performance-grid">
                <div className="perf-item">
                  <span className="perf-label">Total Tickets</span>
                  <span className="perf-value">{stats?.totalTickets || 0}</span>
                </div>
                <div className="perf-item">
                  <span className="perf-label">Resolution Rate</span>
                  <span className="perf-value">
                    {getPercent(stats?.completedTickets || 0, stats?.totalTickets || 0)}%
                  </span>
                </div>
                <div className="perf-item">
                  <span className="perf-label">Avg Response Time</span>
                  <span className="perf-value">4.2 hrs</span>
                </div>
                <div className="perf-item">
                  <span className="perf-label">Active Tickets</span>
                  <span className="perf-value">{stats?.openTickets || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}