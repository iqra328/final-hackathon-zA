import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { API_URL } from '../config/api';
import '../styles/global.css';
import '../styles/TicketDetail.css';

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user, isAgent } = useAuth();
  const socket = useSocket();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchTicket();

    if (socket) {
      socket.emit('join-ticket', id);
      
      socket.on('new-message', (data) => {
        if (data.ticketId === id) {
          fetchTicket();
        }
      });

      socket.on('ticket-updated', (data) => {
        if (data._id === id) {
          setTicket(data);
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('new-message');
        socket.off('ticket-updated');
      }
    };
  }, [id, socket]);

  useEffect(() => {
    scrollToBottom();
  }, [ticket?.messages]);

  const fetchTicket = async () => {
    try {
      const response = await axios.get(`${API_URL}/tickets/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTicket(response.data);
    } catch (error) {
      setError('Failed to load ticket');
      if (error.response?.status === 403) {
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    setError('');

    try {
      const response = await axios.post(
        `${API_URL}/tickets/${id}/message`,
        { message: newMessage.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setTicket(prev => ({
        ...prev,
        messages: [...prev.messages, response.data]
      }));
      setNewMessage('');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'Resolved' && !resolutionNote) {
      alert('Please provide a resolution note');
      return;
    }

    try {
      await axios.put(
        `${API_URL}/tickets/${id}/status`,
        { status: newStatus, resolutionNote },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchTicket();
      setResolutionNote('');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update status');
    }
  };

  const handleAssign = async () => {
    try {
      await axios.put(
        `${API_URL}/tickets/${id}/assign-agent`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchTicket();
    } catch (error) {
      alert('Failed to assign ticket');
    }
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '400px' }}>
        <LoadingSpinner size="lg" text="Loading ticket details..." />
      </div>
    );
  }

  if (error) {
    return <div className="alert-error" style={{ maxWidth: '600px', margin: '2rem auto' }}>
      ⚠️ {error}
    </div>;
  }

  if (!ticket) {
    return <div className="text-center" style={{ padding: '2rem' }}>Ticket not found</div>;
  }

  const canAssign = isAgent && !ticket.agentId && ticket.status !== 'Completed' && ticket.status !== 'Rejected';
  const isAssignedToMe = isAgent && ticket.agentId?._id === user?.id;
  const canEdit = isAssignedToMe || (isAgent && !ticket.agentId);
  const isResolved = ticket.status === 'Completed' || ticket.status === 'Rejected' || ticket.status === 'Cancelled';

  return (
    <div className="ticket-detail-page">
      <div className="ticket-detail-container">
        {/* ===== HEADER CARD ===== */}
        <div className="detail-header">
          {/* Top Row */}
          <div className="detail-header-top">
            <div className="detail-info">
              <div className="detail-badge-row">
                <span className="detail-ticket-id">#{ticket.ticketNumber}</span>
                <span className={`detail-status ${ticket.status.toLowerCase().replace(' ', '-')}`}>
                  {ticket.status}
                </span>
                <span className={`detail-priority ${ticket.priority.toLowerCase()}`}>
                  {ticket.priority} Priority
                </span>
              </div>
              <h1 className="detail-title">{ticket.subject}</h1>
              <div className="detail-meta">
                <span className="detail-meta-item">
                  <span className="meta-icon">👤</span>
                  <span className="meta-label">Customer:</span>
                  <span className="meta-value">{ticket.customerId?.name || 'Unknown'}</span>
                </span>
                <span className="detail-meta-item">
                  <span className="meta-icon">🤝</span>
                  <span className="meta-label">Agent:</span>
                  <span className="meta-value">{ticket.agentId?.name || 'Not assigned'}</span>
                </span>
                <span className="detail-meta-item">
                  <span className="meta-icon">📂</span>
                  <span className="meta-label">Category:</span>
                  <span className="meta-value">{ticket.category}</span>
                </span>
                <span className="detail-meta-item">
                  <span className="meta-icon">📅</span>
                  <span className="meta-label">Created:</span>
                  <span className="meta-value">{new Date(ticket.createdAt).toLocaleString()}</span>
                </span>
              </div>
            </div>

            <div className="detail-actions-top">
              {canAssign && (
                <button onClick={handleAssign} className="btn-assign">
                  📋 Assign to Me
                </button>
              )}
            </div>
          </div>

          {/* AI Suggestion */}
          {ticket.aiSuggestion && ticket.aiSuggestion.summary && (
            <div className="detail-ai-box">
              <div className="detail-ai-icon">🤖</div>
              <div className="detail-ai-content">
                <span className="detail-ai-label">AI Suggestion:</span>
                <span className="detail-ai-text">{ticket.aiSuggestion.summary}</span>
                <div className="detail-ai-tags">
                  <span className="ai-tag">Category: {ticket.aiSuggestion.category}</span>
                  <span className="ai-tag">Priority: {ticket.aiSuggestion.priority}</span>
                </div>
              </div>
            </div>
          )}

          {/* Resolution Note */}
          {isResolved && ticket.resolutionNote && (
            <div className="detail-resolution-box">
              <div className="detail-resolution-icon">✅</div>
              <div className="detail-resolution-content">
                <span className="detail-resolution-label">Resolution:</span>
                <span className="detail-resolution-text">{ticket.resolutionNote}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          {canEdit && !isResolved && (
            <div className="detail-actions">
              {ticket.status === 'New' && (
                <button 
                  onClick={() => handleStatusChange('Assigned')} 
                  className="btn-action btn-primary"
                >
                  ▶️ Start Working
                </button>
              )}
              {ticket.status === 'Assigned' && (
                <button 
                  onClick={() => handleStatusChange('In Progress')} 
                  className="btn-action btn-progress"
                >
                  ⏳ In Progress
                </button>
              )}
              {ticket.status === 'In Progress' && (
                <div className="detail-resolve-group">
                  <input
                    type="text"
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="Resolution note..."
                    className="detail-resolve-input"
                  />
                  <button 
                    onClick={() => handleStatusChange('Completed')} 
                    className="btn-action btn-complete"
                  >
                    ✅ Resolve
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ===== MESSAGES SECTION ===== */}
        <div className="detail-messages">
          <div className="detail-messages-header">
            <div className="detail-messages-title">
              <span className="msg-icon">💬</span>
              Conversation
              <span className="msg-count">{ticket.messages?.length || 0} messages</span>
            </div>
          </div>

          <div className="detail-messages-list">
            {ticket.messages?.map((msg, index) => {
              const isCustomer = msg.sender === 'customer';
              const senderName = isCustomer ? ticket.customerId?.name : 
                                msg.sender === 'agent' ? ticket.agentId?.name : 
                                'Worker';
              
              return (
                <div key={index} className={`detail-message ${isCustomer ? 'customer' : 'agent'}`}>
                  <div className="detail-message-avatar">
                    {senderName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="detail-message-bubble">
                    <div className="detail-message-sender">
                      {senderName || 'Unknown'}
                      <span className="sender-role">{isCustomer ? 'Customer' : msg.sender === 'agent' ? 'Agent' : 'Worker'}</span>
                    </div>
                    <div className="detail-message-text">{msg.message}</div>
                    <div className="detail-message-time">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          {!isResolved ? (
            <form onSubmit={handleSendMessage} className="detail-message-input">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="detail-input-field"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || !newMessage.trim()}
                className="detail-send-btn"
              >
                {sending ? <LoadingSpinner size="sm" /> : 'Send →'}
              </button>
            </form>
          ) : (
            <div className="detail-resolved-notice">
              <span className="notice-icon">🔒</span>
              <span className="notice-text">This ticket is resolved. Conversations are closed.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}