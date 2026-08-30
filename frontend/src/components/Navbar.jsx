import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/global.css';
import '../styles/Navbar.css';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout, isAuthenticated, isAgent, isAdmin, isWorker } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  // ✅ HIDE NAVBAR ON LOGIN & REGISTER PAGES
  const hideNavbar = location.pathname === '/login' || location.pathname === '/register';
  
  if (hideNavbar) {
    return null; // ← Navbar completely hidden
  }

  const getRoleDisplay = () => {
    if (user?.role === 'admin') return 'Admin';
    if (user?.role === 'agent') return 'Agent';
    if (user?.role === 'worker') return 'Worker';
    return 'Customer';
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/dashboard" className="navbar-logo" onClick={() => setIsOpen(false)}>
          <span className="navbar-logo-icon">🎫</span>
          <div className="navbar-logo-text">
            <span>SupportDesk</span>
            <span>AI Powered Support</span>
          </div>
        </Link>

        {/* Mobile Toggle */}
        <button 
          className={`navbar-mobile-toggle ${isOpen ? 'active' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Navigation Links */}
        <div className={`navbar-links ${isOpen ? 'open' : ''}`}>
          {isAuthenticated ? (
            <>
              {/* Dashboard */}
              <Link 
                to="/dashboard" 
                className={`navbar-link ${isActive('/dashboard') ? 'active' : ''}`}
                onClick={() => setIsOpen(false)}
              >
                <span className="link-icon">🏠</span> Dashboard
              </Link>

              {/* Admin */}
              {isAdmin && (
                <Link 
                  to="/admin/dashboard" 
                  className={`navbar-link ${isActive('/admin/dashboard') ? 'active' : ''}`}
                  onClick={() => setIsOpen(false)}
                >
                  <span className="link-icon">👑</span> Admin Panel
                </Link>
              )}
              
              {/* Agent */}
              {isAgent && (
                <Link 
                  to="/agent/dashboard" 
                  className={`navbar-link ${isActive('/agent/dashboard') ? 'active' : ''}`}
                  onClick={() => setIsOpen(false)}
                >
                  <span className="link-icon">🎯</span> Agent Panel
                </Link>
              )}
              
              {/* Worker */}
              {isWorker && (
                <Link 
                  to="/worker/dashboard" 
                  className={`navbar-link ${isActive('/worker/dashboard') ? 'active' : ''}`}
                  onClick={() => setIsOpen(false)}
                >
                  <span className="link-icon">🔧</span> Worker Panel
                </Link>
              )}

              {/* Customer */}
              {!isAgent && !isAdmin && !isWorker && (
                <Link 
                  to="/create-ticket" 
                  className="navbar-link navbar-link-primary"
                  onClick={() => setIsOpen(false)}
                >
                  <span className="link-icon">✚</span> New Ticket
                </Link>
              )}

              {/* User Info */}
              <div className="navbar-user">
                <span className="navbar-user-avatar">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
                <span className="navbar-user-name">{user?.name}</span>
                <span className="navbar-user-role">{getRoleDisplay()}</span>
              </div>

              {/* Logout */}
              <button onClick={handleLogout} className="navbar-btn-danger">
                <span>🚪</span> Logout
              </button>
            </>
          ) : (
            <div className="navbar-auth">
              <Link to="/login" className="navbar-auth-login" onClick={() => setIsOpen(false)}>
                Sign In
              </Link>
              <Link to="/register" className="navbar-auth-register" onClick={() => setIsOpen(false)}>
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;