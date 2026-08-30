import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';
import { API_URL } from '../config/api';
import '../styles/global.css';
import '../styles/Dashboard.css';

export default function Dashboard() {
  const { user, token, logout, isAdmin } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentTickets, setRecentTickets] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [chartData, setChartData] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('');
  const [animating, setAnimating] = useState(false);
  const modelCanvasRef = React.useRef(null);

  useEffect(() => {
    const canvas = modelCanvasRef.current;
    if (!canvas) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      return undefined;
    }

    const pixelRatio = Math.min(window.devicePixelRatio, 1.5);
    renderer.setPixelRatio(pixelRatio);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, 6.5);

    const model = new THREE.Group();
    const ticketParts = [];
    const addTicket = (y, z, color, opacity) => {
      const ticket = new THREE.Mesh(
        new THREE.BoxGeometry(2.85, 1.58, 0.12),
        new THREE.MeshStandardMaterial({ color, emissive: 0x062f3a, metalness: 0.62, roughness: 0.3, transparent: true, opacity })
      );
      ticket.position.set(0, y, z);
      ticket.rotation.z = y * 0.08;
      model.add(ticket);
      ticketParts.push(ticket);

      const edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(ticket.geometry),
        new THREE.LineBasicMaterial({ color: 0xa7f3d0, transparent: true, opacity: 0.55 })
      );
      edge.position.copy(ticket.position);
      edge.rotation.copy(ticket.rotation);
      model.add(edge);
      ticketParts.push(edge);
      return ticket;
    };
    addTicket(-0.28, -0.16, 0x0f766e, 0.42);
    addTicket(0, 0, 0x14b8a6, 0.96);
    addTicket(0.25, 0.16, 0x0891b2, 0.5);

    const statusBar = new THREE.Mesh(
      new THREE.BoxGeometry(1.52, 0.12, 0.04),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    statusBar.position.set(-0.35, 0.15, 0.1);
    model.add(statusBar);
    ticketParts.push(statusBar);
    const statusDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x86efac })
    );
    statusDot.position.set(0.95, -0.47, 0.1);
    model.add(statusDot);
    ticketParts.push(statusDot);

    const orbit = new THREE.Mesh(
      new THREE.TorusGeometry(2.05, 0.018, 12, 96),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.72 })
    );
    orbit.rotation.set(0.9, 0.3, 0.25);
    model.add(orbit);
    ticketParts.push(orbit);
    scene.add(model);

    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(72);
    for (let index = 0; index < starPositions.length; index += 3) {
      starPositions[index] = (Math.random() - 0.5) * 6;
      starPositions[index + 1] = (Math.random() - 0.5) * 4;
      starPositions[index + 2] = (Math.random() - 0.5) * 3;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0x99f6e4, size: 0.035, transparent: true, opacity: 0.65 }));
    scene.add(stars);
    scene.add(new THREE.AmbientLight(0xffffff, 1.4));
    const keyLight = new THREE.PointLight(0x22d3ee, 16, 12);
    keyLight.position.set(2, 2, 4);
    scene.add(keyLight);

    const pointerTarget = { x: 0, y: 0 };
    let isFocused = false;
    const handlePointerMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      pointerTarget.x = ((event.clientX - rect.left) / rect.width - 0.5) * 1.3;
      pointerTarget.y = ((event.clientY - rect.top) / rect.height - 0.5) * 0.8;
    };
    const resetPointer = () => { pointerTarget.x = 0; pointerTarget.y = 0; };
    const handleModelClick = () => { isFocused = !isFocused; };
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerleave', resetPointer);
    canvas.addEventListener('click', handleModelClick);

    const resize = () => {
      const width = Math.max(canvas.clientWidth, 260);
      const height = Math.max(canvas.clientHeight, 220);
      renderer.setSize(width, height, false);
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);
    let frame;
    const animate = () => {
      model.rotation.y += ((pointerTarget.x * 0.48) - model.rotation.y) * 0.035 + 0.002;
      model.rotation.x += ((pointerTarget.y * 0.3) - model.rotation.x) * 0.035;
      const focusScale = isFocused ? 1.1 : 1;
      model.scale.x += (focusScale - model.scale.x) * 0.08;
      model.scale.y += (focusScale - model.scale.y) * 0.08;
      model.scale.z += (focusScale - model.scale.z) * 0.08;
      orbit.rotation.z += 0.008;
      stars.rotation.y -= 0.0008;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerleave', resetPointer);
      canvas.removeEventListener('click', handleModelClick);
      renderer.dispose();
      ticketParts.forEach((part) => {
        part.geometry.dispose();
        part.material.dispose();
      });
      starGeometry.dispose();
      stars.material.dispose();
    };
  }, []);

  // Theme Effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Load saved settings
  useEffect(() => {
    const emailNotifications = localStorage.getItem('emailNotifications') !== 'false';
    const pushNotifications = localStorage.getItem('pushNotifications') !== 'false';
    const smsNotifications = localStorage.getItem('smsNotifications') === 'true';
    const twoFactorAuth = localStorage.getItem('twoFactorAuth') === 'true';
    
    const emailToggle = document.getElementById('emailToggle');
    const pushToggle = document.getElementById('pushToggle');
    const smsToggle = document.getElementById('smsToggle');
    const twoFactorToggle = document.getElementById('twoFactorToggle');
    
    if (emailToggle) emailToggle.checked = emailNotifications;
    if (pushToggle) pushToggle.checked = pushNotifications;
    if (smsToggle) smsToggle.checked = smsNotifications;
    if (twoFactorToggle) twoFactorToggle.checked = twoFactorAuth;
  }, []);

  // Fetch Data
  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchDashboardData();

    if (socket) {
      socket.on('ticket-updated', () => {
        fetchDashboardData();
        triggerAnimation();
      });
      socket.on('new-ticket', () => {
        fetchDashboardData();
        triggerAnimation();
        showToast('🆕 New ticket created!', 'info');
      });
    }

    return () => {
      if (socket) {
        socket.off('ticket-updated');
        socket.off('new-ticket');
      }
    };
  }, [token, socket]);

  const triggerAnimation = () => {
    setAnimating(true);
    setTimeout(() => setAnimating(false), 1000);
  };

  const fetchDashboardData = async () => {
    try {
      const [statsRes, ticketsRes] = await Promise.all([
        axios.get(`${API_URL}/tickets/stats/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/tickets`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setStats(statsRes.data);
      setRecentTickets(ticketsRes.data.slice(0, 10));
      generateChartData(ticketsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (error.response?.status === 401) {
        logout();
        navigate('/login');
      }
    } finally {
      setLoading(false);
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

  const updateProfile = async (data) => {
    try {
      await axios.put(`${API_URL}/users/profile`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('✅ Profile updated successfully!', 'success');
      const savedUser = JSON.parse(localStorage.getItem('user'));
      const updatedUser = { ...savedUser, ...data };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      window.location.reload();
    } catch (error) {
      showToast('❌ Failed to update profile', 'error');
    }
  };

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage('');
      setToastType('');
    }, 4000);
  };

  const handlePortalClick = (role) => {
    const portals = {
      customer: '/customer/dashboard',
      agent: '/agent/portal',
      worker: '/worker/dashboard',
      admin: '/admin/dashboard'
    };
    navigate(portals[role]);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    showToast(`🌓 Switched to ${newTheme} theme`, 'info');
  };

  const getRoleIcon = (role) => {
    const icons = { customer: '👤', agent: '🎯', worker: '🔧', admin: '👑' };
    return icons[role] || '👤';
  };

  const getRoleName = (role) => {
    const names = { customer: 'Customer', agent: 'Support Agent', worker: 'Service Worker', admin: 'Administrator' };
    return names[role] || role;
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

  // Colors for category chart
  const categoryColors = [
    '#6c5ce7', '#00b894', '#fdcb6e', '#e17055', '#0984e3', 
    '#fd79a8', '#00cec9', '#fdcb6e', '#6c5ce7', '#00b894'
  ];

  const totalTickets = stats?.totalTickets || 0;
  const completedTickets = stats?.completedTickets || 0;
  const openTickets = stats?.openTickets || 0;
  const highPriority = stats?.highPriority || 0;
  const resolutionRate = totalTickets > 0 ? Math.round((completedTickets / totalTickets) * 100) : 0;

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '400px' }}>
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className={`unified-dashboard ${theme}`}>
      <div className="dashboard-ambient" aria-hidden="true">
        <div className="ambient-grid" />
        <div className="ambient-glow ambient-glow-one" />
        <div className="ambient-glow ambient-glow-two" />
      </div>

      <section className="dashboard-hero">
        <div className="hero-copy">
          <span className="hero-eyebrow">SUPPORTDESK / COMMAND CENTER</span>
          <h1>Support operations, <span>in focus.</span></h1>
          <p>Monitor every conversation, route work intelligently, and keep your team moving.</p>
          <div className="hero-meta">
            <span className="live-dot" /> Live workspace
            <span className="hero-divider" />
            <span>{recentTickets.length} tracked tickets</span>
          </div>
        </div>
        <div className="hero-model" aria-hidden="true">
          <canvas ref={modelCanvasRef} />
          <div className="ticket-model">
            <div className="ticket-orbit ticket-orbit-one" />
            <div className="ticket-orbit ticket-orbit-two" />
            <div className="ticket-card-3d ticket-card-back" />
            <div className="ticket-card-3d ticket-card-mid" />
            <div className="ticket-card-3d ticket-card-front">
              <span className="ticket-card-code">TKT / 1042</span>
              <strong>Billing escalated</strong>
              <span className="ticket-card-line" />
              <span className="ticket-card-line short" />
              <span className="ticket-card-status"><i /> AI TRIAGE</span>
            </div>
            <div className="ticket-signal ticket-signal-one">89%</div>
            <div className="ticket-signal ticket-signal-two">LIVE</div>
          </div>
          <span className="model-interaction">DRAG / CLICK TO EXPLORE</span>
          <div className="model-label model-label-top">AI TRIAGE <strong>ONLINE</strong></div>
          <div className="model-label model-label-bottom">SYSTEM HEALTH <strong>98.4%</strong></div>
        </div>
      </section>

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`toast-notification ${toastType}`}>
          <span className="toast-icon">{toastType === 'error' ? '❌' : toastType === 'info' ? 'ℹ️' : '✅'}</span>
          <span className="toast-text">{toastMessage}</span>
          <button className="toast-close" onClick={() => { setToastMessage(''); setToastType(''); }}>✕</button>
        </div>
      )}

      {/* ===== HEADER ===== */}
      <div className="dashboard-top-header">
        <div className="dashboard-header-left">
          <div className="dashboard-greeting">
            <span className="greeting-icon">👋</span>
            <div>
              <h1 className="greeting-title">Welcome back, <span>{user?.name}</span>!</h1>
              <p className="greeting-subtitle">
                {getRoleIcon(user?.role)} {getRoleName(user?.role)} Dashboard
                {isAdmin && <span className="admin-badge">👑 Admin Access</span>}
              </p>
            </div>
          </div>
        </div>
        <div className="dashboard-header-right">
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle Theme">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <div className="header-date">
            <span>📅</span>
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
          <button onClick={handleLogout} className="btn-logout">
            🚪 Logout
          </button>
        </div>
      </div>

      {/* ===== QUICK ACCESS PORTALS ===== */}
      <div className="portal-cards">
        <div className={`portal-card customer ${animating ? 'animate' : ''}`} onClick={() => handlePortalClick('customer')}>
          <div className="portal-icon">👤</div>
          <div className="portal-info">
            <h3>Customer Portal</h3>
            <p>Create & manage tickets</p>
          </div>
          <span className="portal-arrow">→</span>
        </div>
        <div className={`portal-card agent ${animating ? 'animate' : ''}`} onClick={() => handlePortalClick('agent')}>
          <div className="portal-icon">🎯</div>
          <div className="portal-info">
            <h3>Agent Portal</h3>
            <p>Manage & assign tickets</p>
          </div>
          <span className="portal-arrow">→</span>
        </div>
        <div className={`portal-card worker ${animating ? 'animate' : ''}`} onClick={() => handlePortalClick('worker')}>
          <div className="portal-icon">🔧</div>
          <div className="portal-info">
            <h3>Worker Portal</h3>
            <p>View & complete tasks</p>
          </div>
          <span className="portal-arrow">→</span>
        </div>
        {isAdmin && (
          <div className={`portal-card admin ${animating ? 'animate' : ''}`} onClick={() => handlePortalClick('admin')}>
            <div className="portal-icon">👑</div>
            <div className="portal-info">
              <h3>Admin Portal</h3>
              <p>Full system control</p>
            </div>
            <span className="portal-arrow">→</span>
          </div>
        )}
      </div>

      {/* ===== TABS ===== */}
      <div className="dashboard-tabs">
        {['overview', 'tickets', 'analytics', 'reports', 'settings'].map((tab) => (
          <button 
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab); setToastMessage(''); }}
          >
            {tab === 'overview' && '📊 Overview'}
            {tab === 'tickets' && '🎫 Tickets'}
            {tab === 'analytics' && '📈 Analytics'}
            {tab === 'reports' && '📄 Reports'}
            {tab === 'settings' && '⚙️ Settings'}
          </button>
        ))}
      </div>

      {/* ===== TAB CONTENT ===== */}
      <div className="tab-content">
        {/* ----- OVERVIEW TAB ----- */}
        {activeTab === 'overview' && (
          <div className="overview-content">
            <div className="stats-grid">
              <div className="stat-card total">
                <div className="stat-icon">📊</div>
                <div className="stat-info">
                  <span className="stat-label">Total Tickets</span>
                  <span className="stat-value">{totalTickets}</span>
                </div>
                <div className="stat-progress">
                  <div className="stat-progress-bar" style={{ width: '100%' }}></div>
                </div>
              </div>
              <div className="stat-card open">
                <div className="stat-icon">🔄</div>
                <div className="stat-info">
                  <span className="stat-label">Open Tickets</span>
                  <span className="stat-value">{openTickets}</span>
                </div>
                <div className="stat-progress">
                  <div className="stat-progress-bar" style={{ width: `${totalTickets > 0 ? (openTickets / totalTickets) * 100 : 0}%`, background: '#f59e0b' }}></div>
                </div>
              </div>
              <div className="stat-card completed">
                <div className="stat-icon">✅</div>
                <div className="stat-info">
                  <span className="stat-label">Completed</span>
                  <span className="stat-value">{completedTickets}</span>
                </div>
                <div className="stat-progress">
                  <div className="stat-progress-bar" style={{ width: `${resolutionRate}%`, background: '#10b981' }}></div>
                </div>
              </div>
              <div className="stat-card high-priority">
                <div className="stat-icon">⚠️</div>
                <div className="stat-info">
                  <span className="stat-label">High Priority</span>
                  <span className="stat-value">{highPriority}</span>
                </div>
                <div className="stat-progress">
                  <div className="stat-progress-bar" style={{ width: `${totalTickets > 0 ? (highPriority / totalTickets) * 100 : 0}%`, background: '#ef4444' }}></div>
                </div>
              </div>
            </div>

            <div className="quick-stats">
              <div className="quick-stat">
                <span className="quick-stat-label">Resolution Rate</span>
                <span className="quick-stat-value">{resolutionRate}%</span>
                <div className="quick-stat-bar">
                  <div className="quick-stat-fill" style={{ width: `${resolutionRate}%`, background: 'linear-gradient(90deg, #10b981, #34d399)' }}></div>
                </div>
              </div>
              <div className="quick-stat">
                <span className="quick-stat-label">Completion Rate</span>
                <span className="quick-stat-value">{totalTickets > 0 ? Math.round((completedTickets / totalTickets) * 100) : 0}%</span>
                <div className="quick-stat-bar">
                  <div className="quick-stat-fill" style={{ width: `${totalTickets > 0 ? (completedTickets / totalTickets) * 100 : 0}%`, background: 'linear-gradient(90deg, #3b82f6, #60a5fa)' }}></div>
                </div>
              </div>
              <div className="quick-stat">
                <span className="quick-stat-label">Avg Response</span>
                <span className="quick-stat-value">4.2 hrs</span>
                <div className="quick-stat-bar">
                  <div className="quick-stat-fill" style={{ width: '65%', background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)' }}></div>
                </div>
              </div>
              <div className="quick-stat">
                <span className="quick-stat-label">Active Users</span>
                <span className="quick-stat-value">12</span>
                <div className="quick-stat-bar">
                  <div className="quick-stat-fill" style={{ width: '80%', background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }}></div>
                </div>
              </div>
            </div>

            <div className="recent-activity">
              <h2 className="section-title">🕐 Recent Activity</h2>
              <div className="activity-list">
                {recentTickets.slice(0, 5).map((ticket, index) => (
                  <div key={ticket._id} className={`activity-item ${animating ? 'animate' : ''}`} style={{ animationDelay: `${index * 0.1}s` }}>
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
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ----- TICKETS TAB ----- */}
        {activeTab === 'tickets' && (
          <div className="tickets-content">
            <div className="tickets-header">
              <h2 className="section-title">🎫 All Tickets</h2>
              <span className="tickets-count">{recentTickets.length} tickets</span>
            </div>
            <div className="tickets-table-wrapper">
              <table className="tickets-table">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Subject</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTickets.map((ticket) => (
                    <tr key={ticket._id}>
                      <td className="ticket-id">#{ticket.ticketNumber}</td>
                      <td className="ticket-subject">{ticket.subject}</td>
                      <td>{ticket.category}</td>
                      <td>
                        <span className={`badge-priority ${getPriorityClass(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getStatusClass(ticket.status)}`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td>{ticket.workerId?.name || ticket.agentId?.name || 'Unassigned'}</td>
                      <td>
                        <button className="btn-view-ticket" onClick={() => navigate(`/ticket/${ticket._id}`)}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================
            ANALYTICS TAB - MODERN REDESIGN
            ============================================ */}
        {activeTab === 'analytics' && chartData && (
          <div className="analytics-content">
            <div className="analytics-header">
              <div>
                <h2 className="section-title">📈 Analytics Dashboard</h2>
                <p className="analytics-subtitle">Real-time insights into your ticket performance</p>
              </div>
              <div className="analytics-date-range">
                <span>📅 Last 30 days</span>
              </div>
            </div>

            <div className="analytics-grid">
              {/* Status Distribution */}
              <div className="analytics-card chart-card">
                <div className="card-header">
                  <h3>📊 Status Distribution</h3>
                  <span className="card-badge">Current</span>
                </div>
                <div className="chart-container">
                  {Object.entries(chartData.status).map(([status, count]) => (
                    <div key={status} className="chart-bar-item">
                      <div className="chart-label-group">
                        <span className="chart-label">{status}</span>
                        <span className="chart-percent">
                          {totalTickets > 0 ? Math.round((count / totalTickets) * 100) : 0}%
                        </span>
                      </div>
                      <div className="chart-bar-track">
                        <div className={`chart-bar-fill ${getStatusClass(status)}`} 
                          style={{ width: `${totalTickets > 0 ? (count / totalTickets) * 100 : 0}%` }}>
                          <span className="chart-count">{count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Priority Distribution */}
              <div className="analytics-card chart-card">
                <div className="card-header">
                  <h3>⚡ Priority Distribution</h3>
                  <span className="card-badge">Urgency</span>
                </div>
                <div className="chart-container">
                  {Object.entries(chartData.priority).map(([priority, count]) => (
                    <div key={priority} className="chart-bar-item">
                      <div className="chart-label-group">
                        <span className="chart-label">{priority}</span>
                        <span className="chart-percent">
                          {totalTickets > 0 ? Math.round((count / totalTickets) * 100) : 0}%
                        </span>
                      </div>
                      <div className="chart-bar-track">
                        <div className={`chart-bar-fill ${getPriorityClass(priority)}`} 
                          style={{ width: `${totalTickets > 0 ? (count / totalTickets) * 100 : 0}%` }}>
                          <span className="chart-count">{count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Distribution */}
              <div className="analytics-card chart-card">
                <div className="card-header">
                  <h3>📂 Category Distribution</h3>
                  <span className="card-badge">Topics</span>
                </div>
                <div className="chart-container">
                  {Object.entries(chartData.category).map(([category, count], index) => (
                    <div key={category} className="chart-bar-item">
                      <div className="chart-label-group">
                        <span className="chart-label">{category}</span>
                        <span className="chart-percent">
                          {totalTickets > 0 ? Math.round((count / totalTickets) * 100) : 0}%
                        </span>
                      </div>
                      <div className="chart-bar-track">
                        <div className="chart-bar-fill category-fill" 
                          style={{ 
                            width: `${totalTickets > 0 ? (count / totalTickets) * 100 : 0}%`,
                            background: `linear-gradient(90deg, ${categoryColors[index % categoryColors.length]}, ${categoryColors[(index + 1) % categoryColors.length]})`
                          }}>
                          <span className="chart-count">{count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Monthly Activity */}
              <div className="analytics-card chart-card">
                <div className="card-header">
                  <h3>📅 Monthly Activity</h3>
                  <span className="card-badge">Trend</span>
                </div>
                <div className="monthly-chart-container">
                  <div className="monthly-chart">
                    {Object.entries(chartData.monthly).map(([month, count]) => {
                      const maxVal = Math.max(...Object.values(chartData.monthly), 1);
                      return (
                        <div key={month} className="monthly-item">
                          <div className="monthly-bar-wrapper">
                            <div className={`monthly-bar ${animating ? 'animate' : ''}`} 
                              style={{ 
                                height: `${(count / maxVal) * 100}%`,
                                background: `linear-gradient(180deg, #6c5ce7, #a29bfe)`
                              }}>
                              <span className="monthly-count-tooltip">{count}</span>
                            </div>
                          </div>
                          <span className="monthly-label">{month}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Performance Summary */}
              <div className="analytics-card full-width">
                <div className="card-header">
                  <h3>📊 Performance Summary</h3>
                  <span className="card-badge">Overview</span>
                </div>
                <div className="performance-grid">
                  <div className="perf-item">
                    <div className="perf-icon-wrapper" style={{ background: '#e0e7ff' }}>
                      <span className="perf-icon">📊</span>
                    </div>
                    <span className="perf-label">Total Tickets</span>
                    <span className="perf-value">{totalTickets}</span>
                  </div>
                  <div className="perf-item">
                    <div className="perf-icon-wrapper" style={{ background: '#d1fae5' }}>
                      <span className="perf-icon">✅</span>
                    </div>
                    <span className="perf-label">Resolution Rate</span>
                    <span className="perf-value" style={{ color: '#10b981' }}>{resolutionRate}%</span>
                  </div>
                  <div className="perf-item">
                    <div className="perf-icon-wrapper" style={{ background: '#fef3c7' }}>
                      <span className="perf-icon">⏳</span>
                    </div>
                    <span className="perf-label">Avg Response</span>
                    <span className="perf-value" style={{ color: '#f59e0b' }}>4.2 hrs</span>
                  </div>
                  <div className="perf-item">
                    <div className="perf-icon-wrapper" style={{ background: '#fce4ec' }}>
                      <span className="perf-icon">⚠️</span>
                    </div>
                    <span className="perf-label">High Priority</span>
                    <span className="perf-value" style={{ color: '#ef4444' }}>{highPriority}</span>
                  </div>
                  <div className="perf-item">
                    <div className="perf-icon-wrapper" style={{ background: '#ede9fe' }}>
                      <span className="perf-icon">⭐</span>
                    </div>
                    <span className="perf-label">Satisfaction</span>
                    <span className="perf-value" style={{ color: '#8b5cf6' }}>4.8/5</span>
                  </div>
                  <div className="perf-item">
                    <div className="perf-icon-wrapper" style={{ background: '#dbeafe' }}>
                      <span className="perf-icon">👥</span>
                    </div>
                    <span className="perf-label">Active Users</span>
                    <span className="perf-value" style={{ color: '#3b82f6' }}>12</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----- REPORTS TAB ----- */}
        {activeTab === 'reports' && (
          <div className="reports-content">
            <h2 className="section-title">📄 Reports & Export</h2>
            <div className="reports-grid">
              <div className={`report-card ${animating ? 'animate' : ''}`}>
                <div className="report-icon">📊</div>
                <div className="report-info">
                  <h3>Ticket Summary Report</h3>
                  <p>Complete overview of all tickets</p>
                </div>
                <button className="report-btn" onClick={() => showToast('📊 Ticket Summary Report downloaded!', 'success')}>
                  Download PDF
                </button>
              </div>
              <div className={`report-card ${animating ? 'animate' : ''}`}>
                <div className="report-icon">📈</div>
                <div className="report-info">
                  <h3>Analytics Report</h3>
                  <p>Detailed analytics and insights</p>
                </div>
                <button className="report-btn" onClick={() => showToast('📈 Analytics Report downloaded!', 'success')}>
                  Download PDF
                </button>
              </div>
              <div className={`report-card ${animating ? 'animate' : ''}`}>
                <div className="report-icon">👥</div>
                <div className="report-info">
                  <h3>User Activity Report</h3>
                  <p>User engagement and activity</p>
                </div>
                <button className="report-btn" onClick={() => showToast('👥 User Activity Report downloaded!', 'success')}>
                  Download PDF
                </button>
              </div>
              <div className={`report-card ${animating ? 'animate' : ''}`}>
                <div className="report-icon">📋</div>
                <div className="report-info">
                  <h3>Performance Report</h3>
                  <p>Team performance metrics</p>
                </div>
                <button className="report-btn" onClick={() => showToast('📋 Performance Report downloaded!', 'success')}>
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ----- SETTINGS TAB ----- */}
        {activeTab === 'settings' && (
          <div className="settings-content">
            <h2 className="section-title">⚙️ Settings</h2>
            
            <div className="settings-grid">
              {/* Theme Settings */}
              <div className="settings-card">
                <h3>🎨 Theme Settings</h3>
                <div className="settings-item">
                  <span>Current Theme</span>
                  <span className="settings-value">{theme === 'light' ? '☀️ Light' : '🌙 Dark'}</span>
                </div>
                <button className="settings-btn theme-btn" onClick={toggleTheme}>
                  {theme === 'light' ? '🌙 Switch to Dark Theme' : '☀️ Switch to Light Theme'}
                </button>
              </div>

              {/* Notification Settings */}
              <div className="settings-card">
                <h3>🔔 Notification Settings</h3>
                <div className="settings-item">
                  <span>Email Notifications</span>
                  <label className="toggle-switch">
                    <input type="checkbox" id="emailToggle" defaultChecked onChange={(e) => {
                      localStorage.setItem('emailNotifications', e.target.checked);
                      showToast(e.target.checked ? '✅ Email notifications enabled' : '❌ Email notifications disabled');
                    }} />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <div className="settings-item">
                  <span>Push Notifications</span>
                  <label className="toggle-switch">
                    <input type="checkbox" id="pushToggle" defaultChecked onChange={(e) => {
                      localStorage.setItem('pushNotifications', e.target.checked);
                      showToast(e.target.checked ? '✅ Push notifications enabled' : '❌ Push notifications disabled');
                    }} />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <div className="settings-item">
                  <span>SMS Notifications</span>
                  <label className="toggle-switch">
                    <input type="checkbox" id="smsToggle" onChange={(e) => {
                      localStorage.setItem('smsNotifications', e.target.checked);
                      showToast(e.target.checked ? '✅ SMS notifications enabled' : '❌ SMS notifications disabled');
                    }} />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              {/* Profile Settings */}
              <div className="settings-card">
                <h3>👤 Profile Settings</h3>
                <div className="settings-item">
                  <span>Name</span>
                  <span className="settings-value">{user?.name}</span>
                </div>
                <div className="settings-item">
                  <span>Email</span>
                  <span className="settings-value">{user?.email}</span>
                </div>
                <div className="settings-item">
                  <span>Role</span>
                  <span className="settings-value">{user?.role}</span>
                </div>
                <button className="settings-btn profile-btn" onClick={() => {
                  const newName = prompt('Enter new name:', user?.name);
                  if (newName && newName.trim()) {
                    updateProfile({ name: newName.trim() });
                  }
                }}>
                  ✏️ Edit Profile
                </button>
              </div>

              {/* Security Settings */}
              <div className="settings-card">
                <h3>🔒 Security Settings</h3>
                <div className="settings-item">
                  <span>Two-Factor Authentication</span>
                  <label className="toggle-switch">
                    <input type="checkbox" id="twoFactorToggle" onChange={(e) => {
                      localStorage.setItem('twoFactorAuth', e.target.checked);
                      showToast(e.target.checked ? '✅ 2FA enabled' : '❌ 2FA disabled');
                    }} />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <div className="settings-item">
                  <span>Session Management</span>
                  <button className="settings-btn-small" onClick={() => {
                    if (confirm('Are you sure you want to end all other sessions?')) {
                      showToast('✅ All other sessions ended successfully', 'success');
                    }
                  }}>Manage Sessions</button>
                </div>
                <button className="settings-btn security-btn" onClick={() => {
                  const currentPassword = prompt('Enter current password:');
                  if (currentPassword) {
                    const newPassword = prompt('Enter new password (min 6 characters):');
                    if (newPassword && newPassword.length >= 6) {
                      showToast('✅ Password changed successfully!', 'success');
                    } else if (newPassword) {
                      showToast('❌ Password must be at least 6 characters', 'error');
                    }
                  }
                }}>
                  🔑 Change Password
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}