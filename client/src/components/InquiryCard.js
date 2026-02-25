import React, { useState } from 'react';
import BrandAvatar from './BrandAvatar';
import './InquiryCard.css';

const InquiryCard = ({ inquiry, onRespond, formatDate, formatTime }) => {
  const [responding, setResponding] = useState(false);

  const handleRespond = async (response) => {
    setResponding(true);
    try {
      await onRespond(inquiry.id, response);
    } catch (error) {
      console.error('Failed to respond:', error);
    } finally {
      setResponding(false);
    }
  };

  const hasResponded = inquiry.response && inquiry.response !== 'pending';
  const isAvailable = inquiry.response === 'available';
  const isNotAvailable = inquiry.response === 'not_available';
  const isSelected = inquiry.response === 'selected';
  const isNotSelected = inquiry.response === 'not_selected';

  return (
    <div className={`inquiry-card ${hasResponded ? 'inquiry-card-responded' : ''}`}>
      {/* Brand Info */}
      <div className="inquiry-card-brand-info">
        <BrandAvatar
          name={inquiry.company_name || inquiry.brand_name}
          logo={inquiry.company_logo}
          size="medium"
        />
        <div className="brand-details">
          <h3>{inquiry.company_name || inquiry.brand_name}</h3>
          <p className="inquiry-date">Sent {formatDate(inquiry.created_at)}</p>
        </div>
      </div>

      {/* Event Details */}
      <div className="inquiry-event-details">
        <h4 className="event-name">{inquiry.event_name}</h4>
        <div className="event-info">
          <div className="info-item">
            <span className="info-icon">📅</span>
            <span>{formatDate(inquiry.event_date)}</span>
          </div>
          <div className="info-item">
            <span className="info-icon">⏰</span>
            <span>{formatTime(inquiry.start_time)} - {formatTime(inquiry.end_time)}</span>
          </div>
          <div className="info-item">
            <span className="info-icon">📍</span>
            <span>{inquiry.event_location}</span>
          </div>
          <div className="info-item">
            <span className="info-icon">💰</span>
            <span>${inquiry.hourly_rate}/hour (${inquiry.total_cost} total)</span>
          </div>
        </div>

        {inquiry.notes && (
          <div className="event-notes">
            <p className="notes-label">Event Details:</p>
            <p className="notes-content">{inquiry.notes}</p>
          </div>
        )}
      </div>

      {/* Response Status or Actions */}
      {!hasResponded && (
        <div className="inquiry-actions">
          <p className="actions-prompt">Are you available for this event?</p>
          <div className="action-buttons">
            <button
              className="btn-not-available"
              onClick={() => handleRespond('not_available')}
              disabled={responding}
            >
              ❌ Not Available
            </button>
            <button
              className="btn-available"
              onClick={() => handleRespond('available')}
              disabled={responding}
            >
              ✅ Available
            </button>
          </div>
        </div>
      )}

      {hasResponded && (
        <div className="inquiry-response-status">
          {isAvailable && !isSelected && !isNotSelected && (
            <div className="status-badge status-available">
              ✅ You responded: Available
              <p className="status-note">Waiting for brand to select an ambassador</p>
            </div>
          )}
          {isNotAvailable && (
            <div className="status-badge status-not-available">
              ❌ You responded: Not Available
            </div>
          )}
          {isSelected && (
            <div className="status-badge status-selected">
              🎉 You were selected! The brand will send you a formal booking request.
            </div>
          )}
          {isNotSelected && (
            <div className="status-badge status-not-selected">
              The brand selected a different ambassador for this event.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InquiryCard;
