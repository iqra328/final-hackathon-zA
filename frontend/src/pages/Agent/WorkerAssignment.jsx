import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import { API_URL } from '../../config/api';
import '../../styles/global.css';
import '../../styles/AgentDashboard.css';

export default function WorkerAssignment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchTicketAndSuggestions();
  }, [id]);

  const fetchTicketAndSuggestions = async () => {
    try {
      const [ticketRes, suggestionsRes] = await Promise.all([
        axios.get(`${API_URL}/tickets/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/tickets/${id}/worker-suggestions`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setTicket(ticketRes.data);
      setSuggestions(suggestionsRes.data.suggestions || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignWorker = async (workerId) => {
    if (!window.confirm('Assign this worker to the ticket?')) return;

    setAssigning(true);
    try {
      await axios.put(
        `${API_URL}/tickets/${id}/assign-worker`,
        { workerId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Worker assigned successfully!');
      navigate('/agent/dashboard');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to assign worker');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '300px' }}>
        <LoadingSpinner size="lg" text="Loading suggestions..." />
      </div>
    );
  }

  return (
    <div className="agent-dashboard">
      <div className="agent-dashboard-header">
        <h1 className="agent-dashboard-title">
          Worker Assignment
          <span style={{ fontSize: '0.8rem', fontWeight: '400', color: '#64748b', marginLeft: '1rem' }}>
            Ticket #{ticket?.ticketNumber}
          </span>
        </h1>
        <button 
          onClick={() => navigate('/agent/dashboard')}
          className="btn btn-outline"
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Ticket Info */}
      {ticket && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3>{ticket.subject}</h3>
          <p style={{ color: '#64748b', marginTop: '0.3rem' }}>
            Category: {ticket.category} • Priority: {ticket.priority}
          </p>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
            {ticket.description}
          </p>
        </div>
      )}

      {/* AI Worker Suggestions */}
      <div className="agent-worker-suggestions">
        <div className="agent-worker-suggestions-title">
          🤖 AI Suggested Workers
          <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '400' }}>
            ({suggestions.length} workers available)
          </span>
        </div>

        {suggestions.length === 0 ? (
          <div className="customer-empty" style={{ padding: '1.5rem' }}>
            <div className="customer-empty-text">No workers available for this category</div>
          </div>
        ) : (
          <div className="agent-worker-list">
            {suggestions.map((worker, index) => (
              <div key={worker.workerId || index} className="agent-worker-item">
                <div className="agent-worker-info">
                  <span className="agent-worker-avatar">
                    {worker.name?.charAt(0).toUpperCase() || 'W'}
                  </span>
                  <div>
                    <div className="agent-worker-name">
                      {worker.name || 'Unknown Worker'}
                      <span className="agent-worker-skill">
                        {worker.skills?.join(', ') || 'General'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      ⭐ {worker.rating || 'New'} • {worker.completedTasks || 0} tasks completed
                    </div>
                  </div>
                </div>
                <div className="agent-worker-actions">
                  <button
                    onClick={() => handleAssignWorker(worker.workerId)}
                    disabled={assigning}
                    className="agent-worker-btn agent-worker-btn-assign"
                  >
                    {assigning ? 'Assigning...' : 'Assign'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}