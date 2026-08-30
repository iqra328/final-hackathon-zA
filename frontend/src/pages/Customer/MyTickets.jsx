import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import { API_URL } from '../../config/api';
import '../../styles/global.css';
import '../../styles/CustomerDashboard.css';

export default function MyTickets() {
  const { token } = useAuth();
  const socket = useSocket();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchTickets();

    if (socket) {
      socket.on('ticket-updated', () => {
        fetchTickets();
      });
    }

    return () => {
      if (socket) {
        socket.off('ticket-updated');
      }
    };
  }, [socket]);

  const fetchTickets = async () => {
    try {
      const response = await axios.get(`${API_URL}/tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(response.data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (ticketId) => {
    if (!window.confirm('Are you sure you want to cancel this ticket?')) return;

    try {
      await axios.put(
        `${API_URL}/tickets/${ticketId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchTickets();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to cancel ticket');
    }
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

  const filteredTickets = filter === 'all' 
    ? tickets 
    : tickets.filter(t => t.status === filter);

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '300px' }}>
        <LoadingSpinner size="lg" text="Loading your tickets..." />
      </div>
    );
  }

  return (
    <div className="customer-dashboard">
      <div className="customer-dashboard-header">
        <h1 className="customer-dashboard-title">My <span>Tickets</span></h1>
        <Link to="/create-ticket" className="btn btn-primary">
          + New Ticket
        </Link>
      </div>

      {/* Filter */}
      <div className="customer-filter">
        <span className="customer-filter-label">Filter:</span>
        <button 
          className={`customer-filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button 
          className={`customer-filter-btn ${filter === 'New' ? 'active' : ''}`}
          onClick={() => setFilter('New')}
        >
          New
        </button>
        <button 
          className={`customer-filter-btn ${filter === 'Assigned' ? 'active' : ''}`}
          onClick={() => setFilter('Assigned')}
        >
          Assigned
        </button>
        <button 
          className={`customer-filter-btn ${filter === 'In Progress' ? 'active' : ''}`}
          onClick={() => setFilter('In Progress')}
        >
          In Progress
        </button>
        <button 
          className={`customer-filter-btn ${filter === 'Completed' ? 'active' : ''}`}
          onClick={() => setFilter('Completed')}
        >
          Completed
        </button>
        <button 
          className={`customer-filter-btn ${filter === 'Rejected' ? 'active' : ''}`}
          onClick={() => setFilter('Rejected')}
        >
          Rejected
        </button>
      </div>

      {/* Tickets */}
      {filteredTickets.length === 0 ? (
        <div className="customer-empty">
          <div className="customer-empty-icon">📭</div>
          <div className="customer-empty-title">No Tickets Found</div>
          <div className="customer-empty-text">No tickets match your filter</div>
        </div>
      ) : (
        <div className="customer-ticket-list">
          {filteredTickets.map((ticket) => (
            <div key={ticket._id} className="customer-ticket-item">
              <div className="customer-ticket-top">
                <div>
                  <div className="customer-ticket-badges">
                    <span className={`customer-ticket-badge ${getStatusClass(ticket.status)}`}>
                      {ticket.status}
                    </span>
                    <span className={`customer-ticket-badge ${getPriorityClass(ticket.priority)}`}>
                      ⚡ {ticket.priority}
                    </span>
                  </div>
                  <div className="customer-ticket-title">{ticket.subject}</div>
                  <div className="customer-ticket-meta">
                    <span className="customer-ticket-meta-item">
                      #{ticket.ticketNumber}
                    </span>
                    <span className="customer-ticket-meta-item">
                      📂 {ticket.category}
                    </span>
                    <span className="customer-ticket-meta-item">
                      💬 {ticket.messages?.length || 0}
                    </span>
                  </div>
                </div>
              </div>
              <div className="customer-ticket-footer">
                <div className="customer-ticket-worker">
                  {ticket.workerId ? (
                    <>
                      <span className="customer-ticket-worker-avatar">
                        {ticket.workerId.name?.charAt(0).toUpperCase()}
                      </span>
                      {ticket.workerId.name}
                    </>
                  ) : ticket.agentId ? (
                    '👤 Agent assigned'
                  ) : (
                    '⏳ Waiting for assignment'
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <Link 
                    to={`/ticket/${ticket._id}`}
                    className="btn btn-outline"
                    style={{ padding: '0.2rem 0.8rem', fontSize: '0.7rem' }}
                  >
                    View
                  </Link>
                  {ticket.status !== 'Completed' && ticket.status !== 'Rejected' && ticket.status !== 'Cancelled' && (
                    <button
                      onClick={() => handleCancel(ticket._id)}
                      className="btn btn-danger"
                      style={{ padding: '0.2rem 0.8rem', fontSize: '0.7rem' }}
                    >
                      Cancel
                    </button>
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