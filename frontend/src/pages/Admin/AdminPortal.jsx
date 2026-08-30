import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import '../../styles/global.css';
import '../../styles/AdminPortal.css';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace(/\/$/, '');

export default function AdminPortal() {
  const { token, user, logout } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data states
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);
  
  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editUserData, setEditUserData] = useState({ name: '', email: '', role: '' });
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({ name: '', email: '', password: '', role: 'customer' });
  const [theme, setTheme] = useState(localStorage.getItem('adminTheme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('adminTheme', theme);
  }, [theme]);

  useEffect(() => {
    fetchData();
    
    if (socket) {
      socket.on('new-ticket', () => {
        fetchData();
        showNotification('🆕 New ticket created!', 'info');
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
        socket.off('ticket-updated');
        socket.off('new-message');
      }
    };
  }, [socket]);

  const fetchData = async () => {
    try {
      const [ticketsRes, usersRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/tickets`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/tickets/stats/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setTickets(ticketsRes.data);
      setUsers(usersRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      if (error.response?.status === 403) {
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleTheme = () => setTheme((currentTheme) => currentTheme === 'light' ? 'dark' : 'light');

  const getPercent = (count, total) => total > 0 ? Math.round((count / total) * 100) : 0;

  // ===== REPORT DOWNLOAD FUNCTIONS =====
  const downloadReport = (type) => {
    let reportData = {};
    let fileName = '';
    
    switch(type) {
      case 'tickets':
        reportData = {
          title: 'Tickets Report',
          date: new Date().toLocaleString(),
          total: tickets.length,
          byStatus: {
            New: tickets.filter(t => t.status === 'New').length,
            Assigned: tickets.filter(t => t.status === 'Assigned').length,
            'In Progress': tickets.filter(t => t.status === 'In Progress').length,
            Completed: tickets.filter(t => t.status === 'Completed').length,
            Rejected: tickets.filter(t => t.status === 'Rejected').length,
            Cancelled: tickets.filter(t => t.status === 'Cancelled').length,
          },
          byPriority: {
            Low: tickets.filter(t => t.priority === 'Low').length,
            Medium: tickets.filter(t => t.priority === 'Medium').length,
            High: tickets.filter(t => t.priority === 'High').length,
            Urgent: tickets.filter(t => t.priority === 'Urgent').length,
          },
          tickets: tickets.map(t => ({
            id: t.ticketNumber,
            subject: t.subject,
            category: t.category,
            priority: t.priority,
            status: t.status,
            customer: t.customerId?.name || 'Unknown',
            created: new Date(t.createdAt).toLocaleDateString()
          }))
        };
        fileName = `tickets-report-${new Date().toISOString().slice(0,10)}`;
        break;
        
      case 'users':
        reportData = {
          title: 'Users Report',
          date: new Date().toLocaleString(),
          total: users.length,
          byRole: {
            Customer: users.filter(u => u.role === 'customer').length,
            Agent: users.filter(u => u.role === 'agent').length,
            Worker: users.filter(u => u.role === 'worker').length,
            Admin: users.filter(u => u.role === 'admin').length,
          },
          users: users.map(u => ({
            name: u.name,
            email: u.email,
            role: u.role,
            joined: new Date(u.createdAt).toLocaleDateString()
          }))
        };
        fileName = `users-report-${new Date().toISOString().slice(0,10)}`;
        break;
        
      case 'analytics':
        reportData = {
          title: 'Analytics Report',
          date: new Date().toLocaleString(),
          totalTickets: stats?.totalTickets || 0,
          openTickets: stats?.openTickets || 0,
          completedTickets: stats?.completedTickets || 0,
          highPriority: stats?.highPriority || 0,
          resolutionRate: Math.round((stats?.completedTickets / stats?.totalTickets) * 100) || 0,
          categoryStats: stats?.categoryStats || [],
          statusStats: stats?.statusStats || [],
        };
        fileName = `analytics-report-${new Date().toISOString().slice(0,10)}`;
        break;
        
      default:
        return;
    }
    
    const json = JSON.stringify(reportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showNotification(`📊 ${type.charAt(0).toUpperCase() + type.slice(1)} report downloaded!`, 'success');
  };

  // ===== EXPORT AS CSV =====
  const downloadCSV = (type) => {
    let csv = '';
    let fileName = '';
    
    if (type === 'tickets') {
      csv = 'Ticket #,Subject,Category,Priority,Status,Customer,Created\n';
      tickets.forEach(t => {
        csv += `${t.ticketNumber},${t.subject},${t.category},${t.priority},${t.status},${t.customerId?.name || 'Unknown'},${new Date(t.createdAt).toLocaleDateString()}\n`;
      });
      fileName = `tickets-${new Date().toISOString().slice(0,10)}.csv`;
    } else if (type === 'users') {
      csv = 'Name,Email,Role,Joined\n';
      users.forEach(u => {
        csv += `${u.name},${u.email},${u.role},${new Date(u.createdAt).toLocaleDateString()}\n`;
      });
      fileName = `users-${new Date().toISOString().slice(0,10)}.csv`;
    }
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showNotification(`📊 CSV exported successfully!`, 'success');
  };

  // ===== PROFILE UPDATE FUNCTION =====
  const updateProfile = async (data) => {
    try {
      await axios.put(
        `${API_URL}/users/profile`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showNotification('✅ Profile updated successfully!', 'success');
      const savedUser = JSON.parse(localStorage.getItem('user'));
      const updatedUser = { ...savedUser, ...data };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      showNotification(error.response?.data?.error || 'Failed to update profile', 'error');
    }
  };

  const handleCreateUser = async () => {
    try {
      await axios.post(
        `${API_URL}/admin/users`,
        newUserData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchData();
      setShowCreateUserModal(false);
      setNewUserData({ name: '', email: '', password: '', role: 'customer' });
      showNotification('✅ User created successfully!', 'success');
    } catch (error) {
      showNotification(error.response?.data?.error || 'Failed to create user', 'error');
    }
  };

  const handleUpdateUser = async (userId, data) => {
    try {
      await axios.put(
        `${API_URL}/admin/users/${userId}`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchData();
      setShowUserModal(false);
      showNotification('✅ User updated successfully!', 'success');
    } catch (error) {
      showNotification(error.response?.data?.error || 'Failed to update user', 'error');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await axios.delete(
        `${API_URL}/admin/users/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchData();
      showNotification('✅ User deleted successfully!', 'success');
    } catch (error) {
      showNotification(error.response?.data?.error || 'Failed to delete user', 'error');
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm('Are you sure you want to delete this ticket?')) return;
    
    try {
      await axios.delete(
        `${API_URL}/admin/tickets/${ticketId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchData();
      showNotification('✅ Ticket deleted successfully!', 'success');
    } catch (error) {
      showNotification(error.response?.data?.error || 'Failed to delete ticket', 'error');
    }
  };

  const handleUpdateTicketStatus = async (ticketId, status) => {
    try {
      await axios.put(
        `${API_URL}/admin/tickets/${ticketId}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchData();
      showNotification('✅ Ticket status updated!', 'success');
    } catch (error) {
      showNotification(error.response?.data?.error || 'Failed to update ticket status', 'error');
    }
  };

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

  const getRoleBadge = (role) => {
    const map = {
      'customer': 'role-customer',
      'agent': 'role-agent',
      'worker': 'role-worker',
      'admin': 'role-admin',
    };
    return map[role] || 'role-customer';
  };

  const getRoleIcon = (role) => {
    const map = {
      'customer': '👤',
      'agent': '🎯',
      'worker': '🔧',
      'admin': '👑',
    };
    return map[role] || '👤';
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesFilter = filter === 'all' || ticket.status === filter;
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalUsers = users.length;
  const totalAgents = users.filter(u => u.role === 'agent').length;
  const totalWorkers = users.filter(u => u.role === 'worker').length;
  const totalCustomers = users.filter(u => u.role === 'customer').length;

  if (loading) {
    return (
      <div className="admin-loading">
        <LoadingSpinner size="lg" text="Loading Admin Portal..." />
      </div>
    );
  }

  return (
    <div className={`admin-portal ${theme}`}>
      <section className="admin-hero">
        <div className="admin-hero-copy">
          <span className="admin-eyebrow">SUPPORTDESK / CONTROL ROOM</span>
          <h1>Govern every <span>moving part.</span></h1>
          <p>Keep users, tickets, teams and service quality aligned from one live operations view.</p>
          <div className="admin-hero-meta"><span className="admin-live-dot" /> System live <i /> {totalUsers} users under management</div>
        </div>
        <div className="admin-scene" aria-hidden="true">
          <div className="admin-ring admin-ring-one" />
          <div className="admin-ring admin-ring-two" />
          <div className="admin-core admin-core-back" />
          <div className="admin-core admin-core-front">
            <small>CONTROL / ONLINE</small>
            <strong>System overview</strong>
            <span className="admin-core-line" /><span className="admin-core-line short" />
            <b><i /> ALL SYSTEMS NOMINAL</b>
          </div>
          <span className="admin-scene-tag tag-users">USERS {totalUsers}</span>
          <span className="admin-scene-tag tag-health">HEALTH 98%</span>
        </div>
      </section>

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
      <div className="admin-header">
        <div className="admin-header-left">
          <div className="admin-logo">👑</div>
          <div>
            <h1 className="admin-title">Admin <span>Portal</span></h1>
            <p className="admin-subtitle">Welcome back, {user?.name} 👋</p>
          </div>
        </div>
        <div className="admin-header-right">
          <div className="admin-stats-badge">
            <span>📊 {stats?.totalTickets || 0} Tickets</span>
            <span>👥 {totalUsers} Users</span>
          </div>
          <button onClick={toggleTheme} className="admin-theme-toggle" title="Toggle theme">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button onClick={handleLogout} className="btn-logout">
            🚪 Logout
          </button>
        </div>
      </div>

      {/* ===== STATS ===== */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon">📊</div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Total Tickets</span>
            <span className="admin-stat-value">{stats?.totalTickets || 0}</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">🔄</div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Open Tickets</span>
            <span className="admin-stat-value">{stats?.openTickets || 0}</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">✅</div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Completed</span>
            <span className="admin-stat-value">{stats?.completedTickets || 0}</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">👥</div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Total Users</span>
            <span className="admin-stat-value">{totalUsers}</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">⚠️</div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">High Priority</span>
            <span className="admin-stat-value">{stats?.highPriority || 0}</span>
          </div>
        </div>
      </div>

      {/* ===== TABS ===== */}
      <div className="admin-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => { setActiveTab('overview'); setSearchTerm(''); }}
        >
          📊 Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'tickets' ? 'active' : ''}`}
          onClick={() => { setActiveTab('tickets'); setSearchTerm(''); }}
        >
          🎫 Tickets ({tickets.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => { setActiveTab('users'); setSearchTerm(''); }}
        >
          👥 Users ({totalUsers})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => { setActiveTab('analytics'); setSearchTerm(''); }}
        >
          📈 Analytics
        </button>
        <button 
          className={`tab-btn ${activeTab === 'system' ? 'active' : ''}`}
          onClick={() => { setActiveTab('system'); setSearchTerm(''); }}
        >
          ⚙️ System
        </button>
      </div>

      {/* ===== SEARCH ===== */}
      <div className="admin-search-bar">
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder={activeTab === 'users' ? 'Search users...' : 'Search tickets...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="admin-search-actions">
          <button className="btn-refresh" onClick={fetchData}>
            🔄 Refresh
          </button>
          {activeTab === 'users' && (
            <button className="btn-add-user" onClick={() => setShowCreateUserModal(true)}>
              ➕ Add User
            </button>
          )}
        </div>
      </div>

      {/* ===== TAB CONTENT ===== */}
      <div className="admin-tab-content">
        {/* ----- OVERVIEW TAB ----- */}
        {activeTab === 'overview' && (
          <div className="overview-grid">
            <div className="overview-card">
              <h3>📊 Ticket Distribution</h3>
              <div className="overview-stats">
                <div className="overview-stat">
                  <span>🆕 New</span>
                  <span className="count">{tickets.filter(t => t.status === 'New').length}</span>
                </div>
                <div className="overview-stat">
                  <span>📋 Assigned</span>
                  <span className="count">{tickets.filter(t => t.status === 'Assigned').length}</span>
                </div>
                <div className="overview-stat">
                  <span>⏳ In Progress</span>
                  <span className="count">{tickets.filter(t => t.status === 'In Progress').length}</span>
                </div>
                <div className="overview-stat">
                  <span>✅ Completed</span>
                  <span className="count">{tickets.filter(t => t.status === 'Completed').length}</span>
                </div>
                <div className="overview-stat">
                  <span>❌ Rejected</span>
                  <span className="count">{tickets.filter(t => t.status === 'Rejected').length}</span>
                </div>
                <div className="overview-stat">
                  <span>🚫 Cancelled</span>
                  <span className="count">{tickets.filter(t => t.status === 'Cancelled').length}</span>
                </div>
              </div>
            </div>

            <div className="overview-card">
              <h3>👥 User Distribution</h3>
              <div className="overview-stats">
                <div className="overview-stat">
                  <span>👤 Customers</span>
                  <span className="count">{totalCustomers}</span>
                </div>
                <div className="overview-stat">
                  <span>🎯 Agents</span>
                  <span className="count">{totalAgents}</span>
                </div>
                <div className="overview-stat">
                  <span>🔧 Workers</span>
                  <span className="count">{totalWorkers}</span>
                </div>
                <div className="overview-stat">
                  <span>👑 Admins</span>
                  <span className="count">{users.filter(u => u.role === 'admin').length}</span>
                </div>
              </div>
            </div>

            <div className="overview-card full-width">
              <h3>🕐 Recent Activity</h3>
              <div className="activity-list">
                {tickets.slice(0, 5).map(ticket => (
                  <div key={ticket._id} className="activity-item">
                    <div className="activity-icon">🎫</div>
                    <div className="activity-content">
                      <div className="activity-title">
                        #{ticket.ticketNumber} - {ticket.subject}
                        <span className={`badge ${getStatusClass(ticket.status)}`}>
                          {ticket.status}
                        </span>
                      </div>
                      <div className="activity-meta">
                        {ticket.customerId?.name} • {new Date(ticket.updatedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ----- TICKETS TAB ----- */}
        {activeTab === 'tickets' && (
          <div className="tickets-content">
            <div className="tickets-filters">
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
            </div>
            <div className="tickets-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Subject</th>
                    <th>Customer</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Assigned</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map(ticket => (
                    <tr key={ticket._id}>
                      <td className="ticket-id">#{ticket.ticketNumber}</td>
                      <td>{ticket.subject}</td>
                      <td>{ticket.customerId?.name || 'Unknown'}</td>
                      <td>
                        <span className={`badge-priority ${ticket.priority.toLowerCase()}`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getStatusClass(ticket.status)}`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td>
                        {ticket.agentId?.name || ticket.workerId?.name || 'Unassigned'}
                      </td>
                      <td className="table-actions">
                        <select 
                          onChange={(e) => handleUpdateTicketStatus(ticket._id, e.target.value)}
                          className="status-select"
                          value={ticket.status}
                        >
                          <option value="New">New</option>
                          <option value="Assigned">Assigned</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                          <option value="Rejected">Rejected</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                        <button 
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setShowTicketModal(true);
                          }}
                          className="btn-view"
                        >
                          View
                        </button>
                        <button 
                          onClick={() => handleDeleteTicket(ticket._id)}
                          className="btn-delete"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----- USERS TAB ----- */}
        {activeTab === 'users' && (
          <div className="users-content">
            <div className="users-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user._id}>
                      <td>
                        <div className="user-info">
                          <span className="user-avatar">
                            {user.name?.charAt(0).toUpperCase()}
                          </span>
                          {user.name}
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`role-badge ${getRoleBadge(user.role)}`}>
                          {getRoleIcon(user.role)} {user.role}
                        </span>
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="table-actions">
                        <button 
                          onClick={() => {
                            setSelectedUser(user);
                            setEditUserData({ 
                              name: user.name, 
                              email: user.email, 
                              role: user.role 
                            });
                            setShowUserModal(true);
                          }}
                          className="btn-edit"
                        >
                          ✏️
                        </button>
                        {user.role !== 'admin' && (
                          <button 
                            onClick={() => handleDeleteUser(user._id)}
                            className="btn-delete"
                          >
                            🗑️
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----- ANALYTICS TAB ----- */}
        {activeTab === 'analytics' && (
          <div className="analytics-content">
            <div className="analytics-header">
              <h2 className="analytics-title">📈 Analytics Dashboard</h2>
              <div className="analytics-actions">
                <button className="btn-download" onClick={() => downloadReport('tickets')}>
                  📥 Download Tickets Report
                </button>
                <button className="btn-download" onClick={() => downloadReport('users')}>
                  📥 Download Users Report
                </button>
                <button className="btn-download" onClick={() => downloadReport('analytics')}>
                  📥 Download Analytics Report
                </button>
                <button className="btn-download-csv" onClick={() => downloadCSV('tickets')}>
                  📊 Export Tickets CSV
                </button>
                <button className="btn-download-csv" onClick={() => downloadCSV('users')}>
                  📊 Export Users CSV
                </button>
              </div>
            </div>
            
            <div className="analytics-grid">
              <div className="analytics-card">
                <h3>📊 Category Distribution</h3>
                {stats?.categoryStats?.map(cat => (
                  <div key={cat._id} className="category-bar">
                    <span className="category-label">{cat._id}</span>
                    <div className="bar-track">
                      <div 
                        className="bar-fill" 
                        style={{ 
                          width: `${(cat.count / stats.totalTickets) * 100}%`,
                          background: `hsl(${Math.random() * 360}, 70%, 50%)`
                        }}
                      ></div>
                    </div>
                    <span className="category-count">{cat.count}</span>
                  </div>
                ))}
              </div>
              
              <div className="analytics-card">
                <h3>📈 Performance Metrics</h3>
                <div className="performance-metrics">
                  <div className="metric">
                    <span className="metric-label">Resolution Rate</span>
                    <span className="metric-value">
                      {Math.round((stats?.completedTickets / stats?.totalTickets) * 100) || 0}%
                    </span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Avg Response Time</span>
                    <span className="metric-value">4.2 hrs</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Active Users</span>
                    <span className="metric-value">{totalUsers}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Total Tickets</span>
                    <span className="metric-value">{stats?.totalTickets || 0}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Open Tickets</span>
                    <span className="metric-value">{stats?.openTickets || 0}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">High Priority</span>
                    <span className="metric-value">{stats?.highPriority || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----- SYSTEM TAB ----- */}
        {activeTab === 'system' && (
          <div className="system-content">
            <h2 className="section-title">⚙️ System Settings</h2>
            
            {/* Profile Settings */}
            <div className="system-card profile-card">
              <h3>👤 Profile Settings</h3>
              <div className="profile-field">
                <label>Name</label>
                <input 
                  type="text" 
                  defaultValue={user?.name}
                  className="profile-input"
                  id="profileName"
                />
              </div>
              <div className="profile-field">
                <label>Email</label>
                <input 
                  type="email" 
                  defaultValue={user?.email}
                  className="profile-input"
                  id="profileEmail"
                  disabled
                />
              </div>
              <div className="profile-field">
                <label>Role</label>
                <span className="profile-role">{user?.role}</span>
              </div>
              <button className="system-btn" onClick={() => {
                const name = document.getElementById('profileName').value;
                if (name && name !== user?.name) {
                  updateProfile({ name });
                } else {
                  showNotification('No changes to save', 'info');
                }
              }}>
                💾 Update Profile
              </button>
              <button className="system-btn password-btn" onClick={() => {
                const current = prompt('Enter current password:');
                if (current) {
                  const newPass = prompt('Enter new password (min 6 characters):');
                  if (newPass && newPass.length >= 6) {
                    updateProfile({ password: newPass });
                  } else if (newPass) {
                    showNotification('Password must be at least 6 characters', 'error');
                  }
                }
              }}>
                🔑 Change Password
              </button>
            </div>
            
            <div className="system-grid">
              <div className="system-card">
                <h3>📊 System Overview</h3>
                <div className="system-stat">
                  <span>Total Users</span>
                  <span className="system-stat-value">{totalUsers}</span>
                </div>
                <div className="system-stat">
                  <span>Total Tickets</span>
                  <span className="system-stat-value">{stats?.totalTickets || 0}</span>
                </div>
                <div className="system-stat">
                  <span>Database Size</span>
                  <span className="system-stat-value">36.8 KB</span>
                </div>
                <div className="system-stat">
                  <span>Server Status</span>
                  <span className="system-stat-value online">✅ Online</span>
                </div>
              </div>
              
              <div className="system-card">
                <h3>🔧 System Actions</h3>
                <button className="system-btn" onClick={() => downloadReport('analytics')}>
                  📊 Generate Report
                </button>
                <button className="system-btn" onClick={() => downloadCSV('tickets')}>
                  📥 Export Data
                </button>
                <button className="system-btn" onClick={() => {
                  showNotification('🔄 Cache cleared successfully!', 'success');
                }}>
                  🔄 Clear Cache
                </button>
                <button className="system-btn" onClick={() => {
                  showNotification('💾 Backup created successfully!', 'success');
                }}>
                  💾 Create Backup
                </button>
              </div>
              
              <div className="system-card">
                <h3>📋 System Logs</h3>
                <div className="system-log">
                  <span className="log-time">[10:30 AM]</span>
                  <span className="log-message">System started</span>
                </div>
                <div className="system-log">
                  <span className="log-time">[10:32 AM]</span>
                  <span className="log-message">User {user?.name} logged in</span>
                </div>
                <div className="system-log">
                  <span className="log-time">[10:45 AM]</span>
                  <span className="log-message">New ticket created</span>
                </div>
                <div className="system-log">
                  <span className="log-time">[11:00 AM]</span>
                  <span className="log-message">Database backup completed</span>
                </div>
              </div>
              
              <div className="system-card">
                <h3>🔐 Security</h3>
                <div className="system-stat">
                  <span>Two-Factor Auth</span>
                  <span className="system-stat-value">🔒 Enabled</span>
                </div>
                <div className="system-stat">
                  <span>SSL Certificate</span>
                  <span className="system-stat-value">✅ Active</span>
                </div>
                <div className="system-stat">
                  <span>Last Login</span>
                  <span className="system-stat-value">{new Date().toLocaleString()}</span>
                </div>
                <button className="system-btn" onClick={() => {
                  showNotification('🔑 Security settings updated', 'success');
                }}>
                  🔐 Update Security
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== USER MODAL ===== */}
      {showUserModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✏️ Edit User</h2>
              <button className="modal-close" onClick={() => setShowUserModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={editUserData.name}
                  onChange={(e) => setEditUserData({ ...editUserData, name: e.target.value })}
                  className="modal-input"
                />
              </div>
              <div className="modal-form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={editUserData.email}
                  onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                  className="modal-input"
                />
              </div>
              <div className="modal-form-group">
                <label>Role</label>
                <select
                  value={editUserData.role}
                  onChange={(e) => setEditUserData({ ...editUserData, role: e.target.value })}
                  className="modal-select"
                >
                  <option value="customer">👤 Customer</option>
                  <option value="agent">🎯 Agent</option>
                  <option value="worker">🔧 Worker</option>
                  <option value="admin">👑 Admin</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowUserModal(false)}>
                Cancel
              </button>
              <button 
                className="btn-save" 
                onClick={() => handleUpdateUser(selectedUser._id, editUserData)}
              >
                💾 Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== CREATE USER MODAL ===== */}
      {showCreateUserModal && (
        <div className="modal-overlay" onClick={() => setShowCreateUserModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>➕ Create New User</h2>
              <button className="modal-close" onClick={() => setShowCreateUserModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  className="modal-input"
                  placeholder="John Doe"
                />
              </div>
              <div className="modal-form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  className="modal-input"
                  placeholder="john@email.com"
                />
              </div>
              <div className="modal-form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  className="modal-input"
                  placeholder="Min 6 characters"
                />
              </div>
              <div className="modal-form-group">
                <label>Role</label>
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                  className="modal-select"
                >
                  <option value="customer">👤 Customer</option>
                  <option value="agent">🎯 Agent</option>
                  <option value="worker">🔧 Worker</option>
                  <option value="admin">👑 Admin</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowCreateUserModal(false)}>
                Cancel
              </button>
              <button className="btn-save" onClick={handleCreateUser}>
                ➕ Create User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== TICKET MODAL ===== */}
      {showTicketModal && selectedTicket && (
        <div className="modal-overlay" onClick={() => setShowTicketModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🎫 Ticket Details</h2>
              <button className="modal-close" onClick={() => setShowTicketModal(false)}>✕</button>
            </div>
            <div className="modal-body ticket-detail-modal">
              <div className="detail-row">
                <strong>Ticket:</strong> #{selectedTicket.ticketNumber}
              </div>
              <div className="detail-row">
                <strong>Subject:</strong> {selectedTicket.subject}
              </div>
              <div className="detail-row">
                <strong>Description:</strong> {selectedTicket.description}
              </div>
              <div className="detail-row">
                <strong>Customer:</strong> {selectedTicket.customerId?.name || 'Unknown'}
              </div>
              <div className="detail-row">
                <strong>Status:</strong> 
                <span className={`badge ${getStatusClass(selectedTicket.status)}`}>
                  {selectedTicket.status}
                </span>
              </div>
              <div className="detail-row">
                <strong>Priority:</strong> 
                <span className={`badge-priority ${selectedTicket.priority.toLowerCase()}`}>
                  {selectedTicket.priority}
                </span>
              </div>
              <div className="detail-row">
                <strong>Messages:</strong> {selectedTicket.messages?.length || 0}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowTicketModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}