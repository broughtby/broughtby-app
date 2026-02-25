import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { inquiryAPI, matchAPI } from '../services/api';
import CreateInquiryModal from '../components/CreateInquiryModal';
import InquiryCard from '../components/InquiryCard';
import './Inquiries.css';

const Inquiries = () => {
  const { isBrand, isAmbassador } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const navigate = useNavigate();

  // Fetch inquiries based on user role
  const fetchInquiries = useCallback(async () => {
    try {
      setLoading(true);
      const response = await inquiryAPI.getInquiries();
      setInquiries(response.data.inquiries);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch inquiries:', error);
      setError('Failed to load inquiries. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch match count for brands
  const fetchMatchCount = useCallback(async () => {
    if (isBrand) {
      try {
        const response = await matchAPI.getMatches();
        setMatchCount(response.data.matches.length);
      } catch (error) {
        console.error('Failed to fetch match count:', error);
      }
    }
  }, [isBrand]);

  useEffect(() => {
    fetchInquiries();
    fetchMatchCount();
  }, [fetchInquiries, fetchMatchCount]);

  const handleCreateInquiry = async (formData) => {
    try {
      const response = await inquiryAPI.createInquiry(formData);
      setShowCreateModal(false);
      setSuccessMessage(response.data.message);
      // Refresh inquiries list
      await fetchInquiries();
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      console.error('Failed to create inquiry:', error);
      setError(error.response?.data?.error || 'Failed to create inquiry. Please try again.');
    }
  };

  const handleRespondToInquiry = async (inquiryId, response) => {
    try {
      await inquiryAPI.respondToInquiry(inquiryId, response);
      // Refresh inquiries list
      await fetchInquiries();
      setSuccessMessage(`Response recorded: ${response === 'available' ? 'Available' : 'Not Available'}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Failed to respond to inquiry:', error);
      setError(error.response?.data?.error || 'Failed to record response. Please try again.');
    }
  };

  const handleViewResponses = (inquiryId) => {
    navigate(`/inquiries/${inquiryId}/responses`);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format time from 24-hour to 12-hour format with AM/PM
  const formatTime = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="inquiries-page">
        <div className="loading">Loading inquiries...</div>
      </div>
    );
  }

  return (
    <div className="inquiries-page">
      <div className="inquiries-header">
        <div>
          <h1>{isBrand ? 'Availability Inquiries' : 'Availability Requests'}</h1>
          <p className="inquiries-subtitle">
            {isBrand
              ? 'Check who\'s available before sending booking requests'
              : 'Respond to availability checks from brands'}
          </p>
        </div>
        {isBrand && (
          <button
            className="btn-create-inquiry"
            onClick={() => setShowCreateModal(true)}
            disabled={matchCount === 0}
          >
            + New Inquiry
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          {successMessage}
          <button onClick={() => setSuccessMessage(null)}>&times;</button>
        </div>
      )}

      {matchCount === 0 && isBrand && (
        <div className="empty-state">
          <div className="empty-state-icon">🤝</div>
          <h2>No Matches Yet</h2>
          <p>You need to match with ambassadors before sending availability inquiries.</p>
          <button className="btn-primary" onClick={() => navigate('/discover')}>
            Discover Ambassadors
          </button>
        </div>
      )}

      {matchCount > 0 && inquiries.length === 0 && isBrand && (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h2>No Inquiries Yet</h2>
          <p>Create an inquiry to check who's available for your upcoming event.</p>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            Create Your First Inquiry
          </button>
        </div>
      )}

      {inquiries.length === 0 && isAmbassador && (
        <div className="empty-state">
          <div className="empty-state-icon">📬</div>
          <h2>No Inquiries Yet</h2>
          <p>When brands check your availability for events, they'll appear here.</p>
        </div>
      )}

      {/* Brand View: Sent Inquiries */}
      {isBrand && inquiries.length > 0 && (
        <div className="inquiries-list">
          {inquiries.map((inquiry) => (
            <div key={inquiry.id} className="inquiry-card-brand">
              <div className="inquiry-card-header">
                <div>
                  <h3>{inquiry.event_name}</h3>
                  <div className="inquiry-meta">
                    <span>📅 {formatDate(inquiry.event_date)}</span>
                    <span>⏰ {formatTime(inquiry.start_time)} - {formatTime(inquiry.end_time)}</span>
                    <span>📍 {inquiry.event_location}</span>
                  </div>
                </div>
                <span className={`inquiry-status status-${inquiry.status}`}>
                  {inquiry.status}
                </span>
              </div>

              <div className="inquiry-responses-summary">
                <div className="response-stat response-available">
                  <span className="stat-number">{inquiry.available_count || 0}</span>
                  <span className="stat-label">Available</span>
                </div>
                <div className="response-stat response-not-available">
                  <span className="stat-number">{inquiry.not_available_count || 0}</span>
                  <span className="stat-label">Not Available</span>
                </div>
                <div className="response-stat response-pending">
                  <span className="stat-number">{inquiry.pending_count || 0}</span>
                  <span className="stat-label">Pending</span>
                </div>
              </div>

              {inquiry.status === 'open' && (
                <button
                  className="btn-view-responses"
                  onClick={() => handleViewResponses(inquiry.id)}
                >
                  View Responses & Select Ambassador
                </button>
              )}
              {inquiry.status === 'filled' && (
                <div className="inquiry-filled-message">
                  ✓ Booking request sent to selected ambassador
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Ambassador View: Received Inquiries */}
      {isAmbassador && inquiries.length > 0 && (
        <div className="inquiries-list">
          {inquiries.map((inquiry) => (
            <InquiryCard
              key={inquiry.id}
              inquiry={inquiry}
              onRespond={handleRespondToInquiry}
              formatDate={formatDate}
              formatTime={formatTime}
            />
          ))}
        </div>
      )}

      {/* Create Inquiry Modal */}
      {showCreateModal && (
        <CreateInquiryModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateInquiry}
          matchCount={matchCount}
        />
      )}
    </div>
  );
};

export default Inquiries;
