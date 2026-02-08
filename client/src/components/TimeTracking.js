import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { bookingAPI } from '../services/api';
import './TimeTracking.css';

const TimeTracking = ({ bookingId, bookingStatus, onUpdate, isPreview, onCheckoutComplete }) => {
  const { isAmbassador, isBrand } = useAuth();
  const [timeStatus, setTimeStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchTimeStatus();
  }, [bookingId]);

  const fetchTimeStatus = async () => {
    try {
      const response = await bookingAPI.getTimeStatus(bookingId);
      setTimeStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch time status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (processing) return;

    setProcessing(true);
    try {
      await bookingAPI.checkIn(bookingId);
      await fetchTimeStatus();
      if (onUpdate) onUpdate();
      alert('Checked in successfully!');
    } catch (error) {
      console.error('Check-in failed:', error);
      alert(error.response?.data?.error || 'Failed to check in. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckOut = async () => {
    if (processing) return;

    setProcessing(true);
    try {
      await bookingAPI.checkOut(bookingId);
      await fetchTimeStatus();
      if (onUpdate) onUpdate();

      // For preview brands, trigger review prompt after checkout
      if (isPreview && isBrand && onCheckoutComplete) {
        setTimeout(() => {
          onCheckoutComplete();
        }, 500); // Small delay for better UX
      } else {
        alert('Checked out successfully!');
      }
    } catch (error) {
      console.error('Check-out failed:', error);
      alert(error.response?.data?.error || 'Failed to check out. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatHours = (hours) => {
    if (!hours) return '0';
    return hours.toFixed(2);
  };

  if (loading) {
    return <div className="time-tracking-loading">Loading time tracking...</div>;
  }

  // Only show for confirmed and completed bookings (need to see hours for payroll)
  if (bookingStatus !== 'confirmed' && bookingStatus !== 'completed') {
    return null;
  }

  return (
    <div className="time-tracking-container">
      <div className="time-tracking-header">
        <span className="time-icon">⏱️</span>
        <h3>Time Tracking</h3>
      </div>

      <div className="time-tracking-content">
        {/* For Ambassadors */}
        {isAmbassador && (
          <>
            {!timeStatus.checkedIn && (
              <div className="time-action-section">
                <p className="time-instruction">Ready to start? Check in when you arrive!</p>
                {isPreview && (
                  <p className="preview-hint">
                    💡 Try it: Tap Check In to start tracking time, then Check Out when done.
                  </p>
                )}
                <button
                  className="time-btn check-in-btn"
                  onClick={handleCheckIn}
                  disabled={processing}
                >
                  {processing ? 'Checking In...' : '✓ Check In'}
                </button>
              </div>
            )}

            {timeStatus.checkedIn && !timeStatus.checkedOut && (
              <div className="time-action-section">
                <div className="time-status-active">
                  <span className="status-dot"></span>
                  <span>Currently Checked In</span>
                </div>
                <p className="time-detail">Checked in at: {formatDateTime(timeStatus.checkedInAt)}</p>
                <button
                  className="time-btn check-out-btn"
                  onClick={handleCheckOut}
                  disabled={processing}
                >
                  {processing ? 'Checking Out...' : '✓ Check Out'}
                </button>
              </div>
            )}

            {timeStatus.checkedOut && (
              <div className="time-complete-section">
                <div className="time-complete-badge">✅ Event Complete</div>
                {isPreview && (
                  <p className="preview-hint">
                    🎉 Nice! Now leave a review to complete the full booking cycle.
                  </p>
                )}
                <div className="time-summary">
                  <div className="time-summary-row">
                    <span className="summary-label">Check In:</span>
                    <span>{formatDateTime(timeStatus.checkedInAt)}</span>
                  </div>
                  <div className="time-summary-row">
                    <span className="summary-label">Check Out:</span>
                    <span>{formatDateTime(timeStatus.checkedOutAt)}</span>
                  </div>
                  <div className="time-summary-row highlight">
                    <span className="summary-label">Hours Worked:</span>
                    <span className="summary-value">{formatHours(timeStatus.actualHours)} hrs</span>
                  </div>
                  <div className="time-summary-row">
                    <span className="summary-label">Planned Hours:</span>
                    <span>{formatHours(timeStatus.plannedHours)} hrs</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* For Brands */}
        {isBrand && (
          <div className="time-status-section">
            {!timeStatus.checkedIn && (
              <>
                {isPreview ? (
                  <div className="time-action-section">
                    <p className="preview-hint">
                      💡 Demo Mode: Click below to simulate Allan checking in. The system automatically tracks hours worked.
                    </p>
                    <button
                      className="time-btn check-in-btn"
                      onClick={handleCheckIn}
                      disabled={processing}
                    >
                      {processing ? 'Checking In...' : '✓ Check In (as Allan)'}
                    </button>
                  </div>
                ) : (
                  <div className="brand-status-message">
                    <span className="status-icon">⏳</span>
                    <p>Waiting for ambassador to check in</p>
                  </div>
                )}
              </>
            )}

            {timeStatus.checkedIn && !timeStatus.checkedOut && (
              <>
                {isPreview ? (
                  <div className="time-action-section">
                    <div className="time-status-active">
                      <span className="status-dot"></span>
                      <span>Allan is Currently Checked In</span>
                    </div>
                    <p className="time-detail">Checked in at: {formatDateTime(timeStatus.checkedInAt)}</p>
                    <p className="preview-hint">
                      💡 Demo Mode: Click below to simulate Allan checking out. Hours worked will be calculated automatically.
                    </p>
                    <button
                      className="time-btn check-out-btn"
                      onClick={handleCheckOut}
                      disabled={processing}
                    >
                      {processing ? 'Checking Out...' : '✓ Check Out (as Allan)'}
                    </button>
                  </div>
                ) : (
                  <div className="brand-status-message active">
                    <span className="status-icon">✓</span>
                    <div>
                      <p className="status-title">Ambassador is currently checked in</p>
                      <p className="status-detail">Checked in at: {formatDateTime(timeStatus.checkedInAt)}</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {timeStatus.checkedOut && (
              <div className="time-complete-section">
                <div className="time-complete-badge">✅ Event Complete</div>
                {isPreview && (
                  <p className="preview-hint">
                    🎉 Nice! Allan checked out. Now you can leave a review to complete the booking cycle.
                  </p>
                )}
                <div className="time-summary">
                  <div className="time-summary-row">
                    <span className="summary-label">Check In:</span>
                    <span>{formatDateTime(timeStatus.checkedInAt)}</span>
                  </div>
                  <div className="time-summary-row">
                    <span className="summary-label">Check Out:</span>
                    <span>{formatDateTime(timeStatus.checkedOutAt)}</span>
                  </div>
                  <div className="time-summary-row highlight">
                    <span className="summary-label">Actual Hours:</span>
                    <span className="summary-value">{formatHours(timeStatus.actualHours)} hrs</span>
                  </div>
                  <div className="time-summary-row">
                    <span className="summary-label">Planned Hours:</span>
                    <span>{formatHours(timeStatus.plannedHours)} hrs</span>
                  </div>
                  {timeStatus.actualHours !== timeStatus.plannedHours && (
                    <div className="time-summary-row difference">
                      <span className="summary-label">Difference:</span>
                      <span className={timeStatus.actualHours > timeStatus.plannedHours ? 'over' : 'under'}>
                        {timeStatus.actualHours > timeStatus.plannedHours ? '+' : ''}
                        {formatHours(timeStatus.actualHours - timeStatus.plannedHours)} hrs
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeTracking;
