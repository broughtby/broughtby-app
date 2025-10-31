import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { bookingAPI, messageAPI } from '../services/api';
import './Calendar.css';

const Calendar = () => {
  const { user, isBrand, isAmbassador } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await bookingAPI.getBookings();
      setBookings(response.data.bookings);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (booking) => {
    try {
      await bookingAPI.updateBookingStatus(booking.id, 'confirmed');

      // Send confirmation message to chat
      const confirmMessage = `✅ Booking Confirmed!

${user.name} has confirmed the booking for:
Event: ${booking.event_type}
Date: ${new Date(booking.event_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Time: ${booking.start_time} - ${booking.end_time}
Location: ${booking.event_location}

Total Cost: $${parseFloat(booking.total_cost).toFixed(2)}

Status: ✅ Confirmed`;

      await messageAPI.createMessage(booking.match_id, confirmMessage);

      // Refresh bookings
      await fetchBookings();

      alert('Booking confirmed successfully!');
    } catch (error) {
      console.error('Failed to confirm booking:', error);
      alert('Failed to confirm booking. Please try again.');
    }
  };

  const handleDecline = async (booking) => {
    try {
      await bookingAPI.updateBookingStatus(booking.id, 'cancelled');

      // Send decline message to chat
      const declineMessage = `❌ Booking Declined

${user.name} has declined the booking request for:
Event: ${booking.event_type}
Date: ${new Date(booking.event_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

Please discuss alternative arrangements in the chat.`;

      await messageAPI.createMessage(booking.match_id, declineMessage);

      // Refresh bookings
      await fetchBookings();

      alert('Booking declined.');
    } catch (error) {
      console.error('Failed to decline booking:', error);
      alert('Failed to decline booking. Please try again.');
    }
  };

  const handleCancel = async (booking) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      await bookingAPI.updateBookingStatus(booking.id, 'cancelled');

      // Send cancellation message to chat
      const cancelMessage = `❌ Booking Cancelled

${user.name} has cancelled the booking:
Event: ${booking.event_type}
Date: ${new Date(booking.event_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

Status: Cancelled`;

      await messageAPI.createMessage(booking.match_id, cancelMessage);

      // Refresh bookings
      await fetchBookings();

      alert('Booking cancelled.');
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      alert('Failed to cancel booking. Please try again.');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'confirmed':
        return 'status-confirmed';
      case 'pending':
        return 'status-pending';
      case 'completed':
        return 'status-completed';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'confirmed':
        return '✅ Confirmed';
      case 'pending':
        return '⏳ Pending';
      case 'completed':
        return '✓ Completed';
      case 'cancelled':
        return '❌ Cancelled';
      default:
        return status;
    }
  };

  // Group bookings by status
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
  const pastBookings = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled');

  if (loading) {
    return (
      <div className="calendar-container">
        <div className="loading">Loading bookings...</div>
      </div>
    );
  }

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <h1>Calendar</h1>
        <p className="calendar-subtitle">
          {isBrand ? 'Manage your bookings with ambassadors' : 'View and confirm booking requests'}
        </p>
      </div>

      {bookings.length === 0 ? (
        <div className="empty-state">
          <p>No bookings yet. {isBrand ? 'Create a booking from the Matches page!' : 'Brands will send you booking requests.'}</p>
        </div>
      ) : (
        <>
          {/* Pending Bookings */}
          {pendingBookings.length > 0 && (
            <div className="bookings-section">
              <h2 className="section-title">
                ⏳ Pending Requests ({pendingBookings.length})
              </h2>
              <div className="bookings-grid">
                {pendingBookings.map((booking) => (
                  <div key={booking.id} className="booking-card pending">
                    <div className="booking-header">
                      <span className={`status-badge ${getStatusBadgeClass(booking.status)}`}>
                        {getStatusText(booking.status)}
                      </span>
                      <span className="booking-date">
                        {new Date(booking.event_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>

                    <div className="booking-body">
                      <h3 className="booking-title">{booking.event_type}</h3>
                      <div className="booking-details">
                        <div className="booking-detail">
                          <span className="detail-icon">👤</span>
                          <span>{isBrand ? booking.ambassador_name : booking.brand_name}</span>
                        </div>
                        <div className="booking-detail">
                          <span className="detail-icon">🕐</span>
                          <span>{booking.start_time} - {booking.end_time}</span>
                        </div>
                        <div className="booking-detail">
                          <span className="detail-icon">📍</span>
                          <span>{booking.event_location}</span>
                        </div>
                        <div className="booking-detail">
                          <span className="detail-icon">💰</span>
                          <span>${parseFloat(booking.total_cost).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="booking-actions">
                      {isAmbassador && (
                        <>
                          <button
                            className="action-btn decline-btn"
                            onClick={() => handleDecline(booking)}
                          >
                            Decline
                          </button>
                          <button
                            className="action-btn confirm-btn"
                            onClick={() => handleConfirm(booking)}
                          >
                            Confirm
                          </button>
                        </>
                      )}
                      {isBrand && (
                        <button
                          className="action-btn cancel-btn"
                          onClick={() => handleCancel(booking)}
                        >
                          Cancel Request
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confirmed Bookings */}
          {confirmedBookings.length > 0 && (
            <div className="bookings-section">
              <h2 className="section-title">
                ✅ Confirmed Bookings ({confirmedBookings.length})
              </h2>
              <div className="bookings-grid">
                {confirmedBookings.map((booking) => (
                  <div key={booking.id} className="booking-card confirmed">
                    <div className="booking-header">
                      <span className={`status-badge ${getStatusBadgeClass(booking.status)}`}>
                        {getStatusText(booking.status)}
                      </span>
                      <span className="booking-date">
                        {new Date(booking.event_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>

                    <div className="booking-body">
                      <h3 className="booking-title">{booking.event_type}</h3>
                      <div className="booking-details">
                        <div className="booking-detail">
                          <span className="detail-icon">👤</span>
                          <span>{isBrand ? booking.ambassador_name : booking.brand_name}</span>
                        </div>
                        <div className="booking-detail">
                          <span className="detail-icon">🕐</span>
                          <span>{booking.start_time} - {booking.end_time}</span>
                        </div>
                        <div className="booking-detail">
                          <span className="detail-icon">📍</span>
                          <span>{booking.event_location}</span>
                        </div>
                        <div className="booking-detail">
                          <span className="detail-icon">💰</span>
                          <span>${parseFloat(booking.total_cost).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="booking-actions">
                      <button
                        className="action-btn cancel-btn"
                        onClick={() => handleCancel(booking)}
                      >
                        Cancel Booking
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past Bookings */}
          {pastBookings.length > 0 && (
            <div className="bookings-section">
              <h2 className="section-title">
                📋 Past Bookings ({pastBookings.length})
              </h2>
              <div className="bookings-grid">
                {pastBookings.map((booking) => (
                  <div key={booking.id} className="booking-card past">
                    <div className="booking-header">
                      <span className={`status-badge ${getStatusBadgeClass(booking.status)}`}>
                        {getStatusText(booking.status)}
                      </span>
                      <span className="booking-date">
                        {new Date(booking.event_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>

                    <div className="booking-body">
                      <h3 className="booking-title">{booking.event_type}</h3>
                      <div className="booking-details">
                        <div className="booking-detail">
                          <span className="detail-icon">👤</span>
                          <span>{isBrand ? booking.ambassador_name : booking.brand_name}</span>
                        </div>
                        <div className="booking-detail">
                          <span className="detail-icon">🕐</span>
                          <span>{booking.start_time} - {booking.end_time}</span>
                        </div>
                        <div className="booking-detail">
                          <span className="detail-icon">📍</span>
                          <span>{booking.event_location}</span>
                        </div>
                        <div className="booking-detail">
                          <span className="detail-icon">💰</span>
                          <span>${parseFloat(booking.total_cost).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Calendar;
