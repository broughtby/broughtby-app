import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { bookingAPI, messageAPI } from '../services/api';
import ReactCalendar from 'react-calendar';
import { format, isSameDay } from 'date-fns';
import TimeTracking from '../components/TimeTracking';
import 'react-calendar/dist/Calendar.css';
import './Calendar.css';

const Calendar = () => {
  const { user, isBrand, isAmbassador } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'list'
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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

  // Format time from 24-hour to 12-hour format with AM/PM
  const formatTime = (time24) => {
    if (!time24) return '';

    // Handle time format from database (HH:MM:SS or HH:MM)
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12; // Convert 0 to 12 for midnight

    return `${hour12}:${minutes} ${ampm}`;
  };

  // Parse date string as local date (not UTC) to prevent timezone shifting
  const parseLocalDate = (dateString) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const handleConfirm = async (booking) => {
    try {
      await bookingAPI.updateBookingStatus(booking.id, 'confirmed');

      // Send confirmation message to chat
      const confirmMessage = `✅ Booking Confirmed!

${user.name} has confirmed the booking for:
Event: ${booking.event_name}
Date: ${parseLocalDate(booking.event_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Time: ${formatTime(booking.start_time)} - ${formatTime(booking.end_time)} CST
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
Event: ${booking.event_name}
Date: ${parseLocalDate(booking.event_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Time: ${formatTime(booking.start_time)} - ${formatTime(booking.end_time)} CST

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
Event: ${booking.event_name}
Date: ${parseLocalDate(booking.event_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Time: ${formatTime(booking.start_time)} - ${formatTime(booking.end_time)} CST

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

  // Get bookings for a specific date
  const getBookingsForDate = (date) => {
    return bookings.filter(booking => {
      const bookingDate = parseLocalDate(booking.event_date);
      return isSameDay(bookingDate, date);
    });
  };

  // Render tile content for calendar (indicators)
  const tileContent = ({ date, view }) => {
    if (view !== 'month') return null;

    const dayBookings = getBookingsForDate(date);
    if (dayBookings.length === 0) return null;

    // Count bookings by status
    const pendingCount = dayBookings.filter(b => b.status === 'pending').length;
    const confirmedCount = dayBookings.filter(b => b.status === 'confirmed').length;

    return (
      <div className="calendar-tile-indicators">
        {pendingCount > 0 && (
          <span className="indicator indicator-pending" title={`${pendingCount} pending`}>
            {pendingCount}
          </span>
        )}
        {confirmedCount > 0 && (
          <span className="indicator indicator-confirmed" title={`${confirmedCount} confirmed`}>
            {confirmedCount}
          </span>
        )}
      </div>
    );
  };

  // Handle date click
  const handleDateClick = (date) => {
    setSelectedDate(date);
    setMobileSidebarOpen(true); // Open sidebar on mobile when date is selected
  };

  // Close mobile sidebar
  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
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

  // Get bookings for selected date
  const selectedDateBookings = getBookingsForDate(selectedDate);

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <div className="header-left">
          <h1>Calendar</h1>
          <p className="calendar-subtitle">
            {isBrand ? 'Manage your bookings with ambassadors' : 'View and confirm booking requests'}
          </p>
          <p className="timezone-info">🕐 All bookings shown in Central Time (Chicago)</p>
        </div>
        <div className="view-toggle">
          <button
            className={`toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
            onClick={() => setViewMode('calendar')}
          >
            Calendar View
          </button>
          <button
            className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            List View
          </button>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="empty-state">
          <p>No bookings yet. {isBrand ? 'Create a booking from the Matches page!' : 'Brands will send you booking requests.'}</p>
        </div>
      ) : (
        <>
          {/* Calendar View */}
          {viewMode === 'calendar' && (
            <div className="calendar-view">
              <div className="calendar-navigation">
                <button
                  className="today-btn"
                  onClick={() => setSelectedDate(new Date())}
                >
                  Today
                </button>
              </div>

              <div className="calendar-grid-container">
                <div className="calendar-grid">
                  <ReactCalendar
                    onChange={handleDateClick}
                    value={selectedDate}
                    tileContent={tileContent}
                    className="custom-calendar"
                  />
                </div>

                <div className={`day-detail-sidebar ${mobileSidebarOpen ? 'mobile-sidebar-open' : ''}`}>
                  <div className="day-detail-title">
                    <button
                      className="close-sidebar-btn"
                      onClick={closeMobileSidebar}
                      aria-label="Close sidebar"
                    >
                      ← Back to Calendar
                    </button>
                    <h2 className="day-detail-title-text">
                      {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                    </h2>
                  </div>

                  {selectedDateBookings.length === 0 ? (
                    <div className="no-bookings-message">
                      <p>No bookings scheduled for this day.</p>
                    </div>
                  ) : (
                    <div className="day-bookings-list">
                      {selectedDateBookings.map((booking) => (
                        <div key={booking.id} className={`day-booking-card ${booking.status}`}>
                          <div className="booking-header">
                            <span className={`status-badge ${getStatusBadgeClass(booking.status)}`}>
                              {getStatusText(booking.status)}
                            </span>
                          </div>

                          <div className="booking-body">
                            <h3 className="booking-title">{booking.event_name}</h3>
                            <div className="booking-details">
                              <div className="booking-detail">
                                <span className="detail-icon">👤</span>
                                <span>{isBrand ? booking.ambassador_name : booking.brand_name}</span>
                              </div>
                              <div className="booking-detail">
                                <span className="detail-icon">🕐</span>
                                <span>{formatTime(booking.start_time)} - {formatTime(booking.end_time)} CST</span>
                              </div>
                              <div className="booking-detail">
                                <span className="detail-icon">📍</span>
                                <span>{booking.event_location}</span>
                              </div>
                              {booking.notes && (
                                <div className="booking-detail">
                                  <span className="detail-icon">📝</span>
                                  <span>{booking.notes}</span>
                                </div>
                              )}
                              <div className="booking-detail">
                                <span className="detail-label">Total Cost:</span>
                                <span>${parseFloat(booking.total_cost).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>

                          {booking.status === 'pending' && (
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
                          )}

                          {booking.status === 'confirmed' && (
                            <div className="booking-actions">
                              <button
                                className="action-btn cancel-btn"
                                onClick={() => handleCancel(booking)}
                              >
                                Cancel Booking
                              </button>
                            </div>
                          )}

                          {/* Time Tracking */}
                          <TimeTracking
                            bookingId={booking.id}
                            bookingStatus={booking.status}
                            onUpdate={fetchBookings}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
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
                        {parseLocalDate(booking.event_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>

                    <div className="booking-body">
                      <h3 className="booking-title">{booking.event_name}</h3>
                      <div className="booking-details">
                        <div className="booking-detail">
                          <span className="detail-icon">👤</span>
                          <span>{isBrand ? booking.ambassador_name : booking.brand_name}</span>
                        </div>
                        <div className="booking-detail">
                          <span className="detail-icon">🕐</span>
                          <span>{formatTime(booking.start_time)} - {formatTime(booking.end_time)} CST</span>
                        </div>
                        <div className="booking-detail">
                          <span className="detail-icon">📍</span>
                          <span>{booking.event_location}</span>
                        </div>
                        {booking.notes && (
                          <div className="booking-detail">
                            <span className="detail-icon">📝</span>
                            <span>{booking.notes}</span>
                          </div>
                        )}
                        <div className="booking-detail">
                          <span className="detail-label">Total Cost:</span>
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
                        {parseLocalDate(booking.event_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>

                    <div className="booking-body">
                      <h3 className="booking-title">{booking.event_name}</h3>
                      <div className="booking-details">
                        <div className="booking-detail">
                          <span className="detail-icon">👤</span>
                          <span>{isBrand ? booking.ambassador_name : booking.brand_name}</span>
                        </div>
                        <div className="booking-detail">
                          <span className="detail-icon">🕐</span>
                          <span>{formatTime(booking.start_time)} - {formatTime(booking.end_time)} CST</span>
                        </div>
                        <div className="booking-detail">
                          <span className="detail-icon">📍</span>
                          <span>{booking.event_location}</span>
                        </div>
                        {booking.notes && (
                          <div className="booking-detail">
                            <span className="detail-icon">📝</span>
                            <span>{booking.notes}</span>
                          </div>
                        )}
                        <div className="booking-detail">
                          <span className="detail-label">Total Cost:</span>
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

                    {/* Time Tracking */}
                    <TimeTracking
                      bookingId={booking.id}
                      bookingStatus={booking.status}
                      onUpdate={fetchBookings}
                    />
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
                        {parseLocalDate(booking.event_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>

                    <div className="booking-body">
                      <h3 className="booking-title">{booking.event_name}</h3>
                      <div className="booking-details">
                        <div className="booking-detail">
                          <span className="detail-icon">👤</span>
                          <span>{isBrand ? booking.ambassador_name : booking.brand_name}</span>
                        </div>
                        <div className="booking-detail">
                          <span className="detail-icon">🕐</span>
                          <span>{formatTime(booking.start_time)} - {formatTime(booking.end_time)} CST</span>
                        </div>
                        <div className="booking-detail">
                          <span className="detail-icon">📍</span>
                          <span>{booking.event_location}</span>
                        </div>
                        {booking.notes && (
                          <div className="booking-detail">
                            <span className="detail-icon">📝</span>
                            <span>{booking.notes}</span>
                          </div>
                        )}
                        <div className="booking-detail">
                          <span className="detail-label">Total Cost:</span>
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
        </>
      )}
    </div>
  );
};

export default Calendar;
