import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { inquiryAPI } from '../services/api';
import { getPhotoUrl } from '../services/upload';
import './InquiryResponsesView.css';

const InquiryResponsesView = () => {
  const { inquiryId } = useParams();
  const navigate = useNavigate();
  const [inquiry, setInquiry] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    fetchInquiryResponses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inquiryId]);

  const fetchInquiryResponses = async () => {
    try {
      setLoading(true);
      const response = await inquiryAPI.getInquiryResponses(inquiryId);
      setInquiry(response.data.inquiry);
      setResponses(response.data.responses);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch inquiry responses:', error);
      setError('Failed to load responses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAmbassador = async (ambassadorId) => {
    if (!window.confirm('Select this ambassador and send them a formal booking request?')) {
      return;
    }

    try {
      setSelecting(true);
      await inquiryAPI.selectAmbassador(inquiryId, ambassadorId);
      // Navigate back to inquiries list with success message
      navigate('/inquiries', {
        state: { message: 'Booking request sent to selected ambassador!' }
      });
    } catch (error) {
      console.error('Failed to select ambassador:', error);
      alert(error.response?.data?.error || 'Failed to select ambassador. They may have a conflicting booking.');
      // Refresh responses to get latest data
      await fetchInquiryResponses();
    } finally {
      setSelecting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

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
      <div className="inquiry-responses-page">
        <div className="loading">Loading responses...</div>
      </div>
    );
  }

  if (error || !inquiry) {
    return (
      <div className="inquiry-responses-page">
        <div className="error-state">
          <p>{error || 'Inquiry not found'}</p>
          <button onClick={() => navigate('/inquiries')}>Back to Inquiries</button>
        </div>
      </div>
    );
  }

  // Filter responses and ensure they have required data
  const availableResponses = responses.filter(r => r.response === 'available' && r.name);
  const notAvailableResponses = responses.filter(r => r.response === 'not_available' && r.name);
  const pendingResponses = responses.filter(r => r.response === 'pending' && r.name);

  return (
    <div className="inquiry-responses-page">
      <button className="btn-back" onClick={() => navigate('/inquiries')}>
        ← Back to Inquiries
      </button>

      {/* Inquiry Details Header */}
      <div className="inquiry-details-card">
        <h1>{inquiry.event_name}</h1>
        <div className="inquiry-details-grid">
          <div className="detail-item">
            <span className="detail-icon">📅</span>
            <div>
              <p className="detail-label">Date</p>
              <p className="detail-value">{formatDate(inquiry.event_date)}</p>
            </div>
          </div>
          <div className="detail-item">
            <span className="detail-icon">⏰</span>
            <div>
              <p className="detail-label">Time</p>
              <p className="detail-value">{formatTime(inquiry.start_time)} - {formatTime(inquiry.end_time)}</p>
            </div>
          </div>
          <div className="detail-item">
            <span className="detail-icon">📍</span>
            <div>
              <p className="detail-label">Location</p>
              <p className="detail-value">{inquiry.event_location}</p>
            </div>
          </div>
          <div className="detail-item">
            <span className="detail-icon">💰</span>
            <div>
              <p className="detail-label">Rate</p>
              <p className="detail-value">${inquiry.hourly_rate}/hour (${inquiry.total_cost} total)</p>
            </div>
          </div>
        </div>
        {inquiry.notes && (
          <div className="inquiry-notes">
            <p className="notes-label">Event Details:</p>
            <p>{inquiry.notes}</p>
          </div>
        )}
      </div>

      {/* Response Summary */}
      <div className="response-summary">
        <div className="summary-stat stat-available">
          <span className="summary-number">{availableResponses.length}</span>
          <span className="summary-label">Available</span>
        </div>
        <div className="summary-stat stat-not-available">
          <span className="summary-number">{notAvailableResponses.length}</span>
          <span className="summary-label">Not Available</span>
        </div>
        <div className="summary-stat stat-pending">
          <span className="summary-number">{pendingResponses.length}</span>
          <span className="summary-label">Pending</span>
        </div>
      </div>

      {/* Available Ambassadors */}
      {availableResponses.length > 0 && (
        <div className="responses-section">
          <h2 className="section-title">✅ Available Ambassadors</h2>
          <div className="ambassador-grid">
            {availableResponses.map((response) => (
              <div key={response.id} className="ambassador-card">
                <img
                  src={getPhotoUrl(response.profile_photo)}
                  alt={response.name || 'Ambassador'}
                  className="ambassador-photo"
                />
                <div className="ambassador-info">
                  <h3>
                    {response.name || 'Ambassador'}
                  </h3>
                  {response.location && <p className="ambassador-location">📍 {response.location}</p>}
                  {response.hourly_rate && (
                    <p className="ambassador-rate">
                      ${response.hourly_rate}/hour
                    </p>
                  )}
                  {response.rating && response.rating > 0 && (
                    <p className="ambassador-rating">⭐ {parseFloat(response.rating).toFixed(1)}</p>
                  )}
                  {response.bio && (
                    <p className="ambassador-bio">{response.bio}</p>
                  )}
                  {response.skills && response.skills.length > 0 && (
                    <div className="ambassador-skills">
                      {response.skills.slice(0, 3).map((skill, idx) => (
                        <span key={idx} className="skill-tag">{skill}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  className="btn-select-ambassador"
                  onClick={() => handleSelectAmbassador(response.ambassador_id)}
                  disabled={selecting}
                >
                  Select & Send Booking Request
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Not Available Ambassadors */}
      {notAvailableResponses.length > 0 && (
        <div className="responses-section">
          <h2 className="section-title section-title-muted">❌ Not Available</h2>
          <div className="not-available-list">
            {notAvailableResponses.map((response) => (
              <div key={response.id} className="not-available-item">
                <img
                  src={getPhotoUrl(response.profile_photo)}
                  alt={response.name || 'Ambassador'}
                  className="small-photo"
                />
                <span>{response.name || 'Ambassador'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Responses */}
      {pendingResponses.length > 0 && (
        <div className="responses-section">
          <h2 className="section-title section-title-muted">⏳ Waiting for Response</h2>
          <div className="not-available-list">
            {pendingResponses.map((response) => (
              <div key={response.id} className="not-available-item">
                <img
                  src={getPhotoUrl(response.profile_photo)}
                  alt={response.name || 'Ambassador'}
                  className="small-photo"
                />
                <span>{response.name || 'Ambassador'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Available Ambassadors */}
      {availableResponses.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <h2>No Available Ambassadors Yet</h2>
          <p>
            {pendingResponses.length > 0
              ? `Waiting for ${pendingResponses.length} ambassador${pendingResponses.length > 1 ? 's' : ''} to respond.`
              : 'All ambassadors have responded as not available for this event.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default InquiryResponsesView;
