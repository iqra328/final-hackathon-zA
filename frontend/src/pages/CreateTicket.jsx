import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { API_URL } from '../config/api';
import '../styles/global.css';
import '../styles/CreateTicket.css';

export default function CreateTicket() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [showAiReview, setShowAiReview] = useState(false);
  const [ticketId, setTicketId] = useState(null);
  const [error, setError] = useState('');
  const [aiReply, setAiReply] = useState('');
  const [showAiReply, setShowAiReply] = useState(false);
  const [quickReplies, setQuickReplies] = useState([
    'Thank you for your response. I will look into this and get back to you shortly.',
    'I appreciate your help with this issue. Please let me know if you need any more information.',
    'This is resolved now. Thank you for your assistance!',
    'I am following up on this issue. Is there any update?',
    'Could you please clarify this for me? I want to make sure I understand correctly.'
  ]);
  
  const [form, setForm] = useState({
    subject: '',
    description: '',
    category: 'General',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(
        `${API_URL}/tickets/create`,
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const ticket = response.data;
      setTicketId(ticket._id);
      
      if (ticket.aiSuggestion && !ticket.aiSuggestion.reviewed) {
        setAiSuggestion(ticket.aiSuggestion);
        setShowAiReview(true);
        // Generate AI reply suggestion
        generateAiReply(ticket.subject, ticket.description);
      } else {
        navigate(`/ticket/${ticket._id}`);
      }
    } catch (error) {
      console.error('Create ticket error:', error);
      setError(error.response?.data?.error || 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  const generateAiReply = (subject, description) => {
    // Simulate AI generating reply based on subject and description
    const replies = [
      `Thank you for reporting the issue regarding "${subject}". I have reviewed your description and will investigate this matter. I will get back to you with an update within 24 hours.`,
      
      `I understand your concern about "${subject}". Based on the details you provided, I am working on a solution. In the meantime, could you please share any additional information that might help us resolve this faster?`,
      
      `Thanks for reaching out about "${subject}". I have forwarded your request to our technical team. They will analyze the issue and get back to you shortly.`,
      
      `I have received your ticket regarding "${subject}". Our team is currently reviewing the details. We will provide you with a resolution as soon as possible.`,
      
      `Thank you for your patience regarding "${subject}". I would like to confirm that we are actively working on this issue and will update you once we have more information.`
    ];
    
    const randomReply = replies[Math.floor(Math.random() * replies.length)];
    setAiReply(randomReply);
    setShowAiReply(true);
  };

  const handleAiReview = async (approved) => {
    if (!ticketId) return;
    
    try {
      if (approved) {
        navigate(`/ticket/${ticketId}`);
      } else {
        const editedCategory = prompt('Edit Category:', aiSuggestion.category) || aiSuggestion.category;
        const editedPriority = prompt('Edit Priority (Low/Medium/High/Urgent):', aiSuggestion.priority) || aiSuggestion.priority;
        const editedSummary = prompt('Edit Summary:', aiSuggestion.summary) || aiSuggestion.summary;
        
        await axios.put(
          `${API_URL}/tickets/${ticketId}/ai-review`,
          {
            category: editedCategory,
            priority: editedPriority,
            summary: editedSummary,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        navigate(`/ticket/${ticketId}`);
      }
    } catch (error) {
      alert('Failed to review AI suggestion');
    }
  };

  const handleUseAiReply = () => {
    // Auto-fill the reply into description or message
    alert(`AI Suggested Reply:\n\n${aiReply}`);
  };

  const handleUseQuickReply = (reply) => {
    // Auto-fill the quick reply
    alert(`Quick Reply:\n\n${reply}`);
  };

  // AI Review Modal
  if (showAiReview && aiSuggestion) {
    return (
      <div className="create-ticket-page">
        <div className="create-ticket-container">
          <div className="ai-review-card">
            <div className="ai-review-header">
              <div className="ai-review-badge">
                <span className="ai-review-badge-icon">🤖</span>
                <span className="ai-review-badge-text">AI Analysis Complete</span>
              </div>
              <h2 className="ai-review-title">
                AI Suggestion <span>Review</span>
              </h2>
              <p className="ai-review-subtitle">
                Our AI has analyzed your ticket. Review the suggestions below before finalizing.
              </p>
            </div>

            {/* AI Suggestions */}
            <div className="ai-review-grid">
              <div className="ai-review-card-item category">
                <div className="ai-review-card-icon">📂</div>
                <div className="ai-review-card-content">
                  <span className="ai-review-card-label">Category</span>
                  <span className="ai-review-card-value">{aiSuggestion.category}</span>
                </div>
                <div className="ai-review-card-badge">AI Suggested</div>
              </div>

              <div className="ai-review-card-item priority">
                <div className="ai-review-card-icon">⚡</div>
                <div className="ai-review-card-content">
                  <span className="ai-review-card-label">Priority Level</span>
                  <span className={`ai-review-card-value priority-badge ${
                    aiSuggestion.priority === 'Urgent' ? 'priority-urgent' :
                    aiSuggestion.priority === 'High' ? 'priority-high' :
                    aiSuggestion.priority === 'Medium' ? 'priority-medium' :
                    'priority-low'
                  }`}>
                    {aiSuggestion.priority}
                  </span>
                </div>
                <div className="ai-review-card-badge">AI Suggested</div>
              </div>

              <div className="ai-review-card-item summary full-width">
                <div className="ai-review-card-icon">📝</div>
                <div className="ai-review-card-content">
                  <span className="ai-review-card-label">Summary</span>
                  <span className="ai-review-card-value summary-text">{aiSuggestion.summary}</span>
                </div>
                <div className="ai-review-card-badge">AI Generated</div>
              </div>
            </div>

            {/* AI Reply Suggestion */}
            {showAiReply && aiReply && (
              <div className="ai-reply-section">
                <div className="ai-reply-header">
                  <span className="ai-reply-icon">💬</span>
                  <span className="ai-reply-title">AI Suggested Reply</span>
                </div>
                <div className="ai-reply-content">
                  <p className="ai-reply-text">{aiReply}</p>
                </div>
                <div className="ai-reply-actions">
                  <button className="btn-use-reply" onClick={handleUseAiReply}>
                    📋 Use This Reply
                  </button>
                </div>
              </div>
            )}

            {/* Quick Replies */}
            <div className="quick-replies-section">
              <div className="quick-replies-header">
                <span className="quick-replies-icon">⚡</span>
                <span className="quick-replies-title">Quick Reply Templates</span>
              </div>
              <div className="quick-replies-grid">
                {quickReplies.map((reply, index) => (
                  <button 
                    key={index} 
                    className="quick-reply-btn"
                    onClick={() => handleUseQuickReply(reply)}
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="ai-review-actions">
              <button
                onClick={() => handleAiReview(true)}
                className="btn-approve"
              >
                <span className="btn-icon">✅</span>
                Approve & Continue
                <span className="btn-arrow">→</span>
              </button>
              <button
                onClick={() => handleAiReview(false)}
                className="btn-edit"
              >
                <span className="btn-icon">✏️</span>
                Edit Suggestions
              </button>
            </div>

            <div className="ai-review-footer">
              <span className="footer-icon">💡</span>
              <span className="footer-text">
                You can edit any suggestion before finalizing your ticket.
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="create-ticket-page">
      <div className="create-ticket-container">
        <div className="create-ticket-card">
          {/* Header */}
          <div className="create-ticket-header">
            <div className="header-icon-wrapper">
              <span className="header-icon">✍️</span>
            </div>
            <h1 className="create-ticket-title">
              Create New <span>Ticket</span>
            </h1>
            <p className="create-ticket-subtitle">
              Describe your issue and our AI will help triage it
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="alert-error">
              <span className="alert-icon">⚠️</span>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="create-ticket-form">
            <div className="form-group">
              <label className="form-label">
                Subject <span className="required-star">*</span>
              </label>
              <div className="input-wrapper">
                <span className="input-icon">📌</span>
                <input
                  type="text"
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  className="form-input"
                  required
                  placeholder="Brief subject of your issue"
                  maxLength="100"
                />
              </div>
              <div className={`character-counter ${form.subject.length > 80 ? 'warning' : ''}`}>
                {form.subject.length}/100
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Description <span className="required-star">*</span>
              </label>
              <div className="input-wrapper">
                <span className="input-icon textarea-icon">📝</span>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  className="form-textarea"
                  required
                  placeholder="Describe your issue in detail..."
                  maxLength="1000"
                  rows="6"
                />
              </div>
              <div className={`character-counter ${form.description.length > 800 ? 'warning' : ''}`}>
                {form.description.length}/1000
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Category <span className="optional-text">(Optional)</span>
              </label>
              <div className="input-wrapper">
                <span className="input-icon">📂</span>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="General">📋 General</option>
                  <option value="Plumbing">🔧 Plumbing</option>
                  <option value="Electrical">⚡ Electrical</option>
                  <option value="Carpentry">🪚 Carpentry</option>
                  <option value="Cleaning">🧹 Cleaning</option>
                  <option value="Painting">🎨 Painting</option>
                </select>
              </div>
              <p className="hint-text">🤖 AI will suggest category if left blank</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="submit-btn"
            >
              {loading ? (
                <LoadingSpinner size="sm" text="Analyzing with AI..." />
              ) : (
                <>
                  <span>🚀 Submit Ticket</span>
                  <span className="btn-arrow">→</span>
                </>
              )}
            </button>
          </form>

          {/* Features */}
          <div className="features-row">
            <div className="feature-item">
              <span className="feature-icon">🤖</span>
              <span>AI Powered Analysis</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">⚡</span>
              <span>Real-time Status Updates</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔒</span>
              <span>Secure & Private</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}