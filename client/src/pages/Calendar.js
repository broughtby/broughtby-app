import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { bookingAPI, messageAPI, reviewAPI } from '../services/api';
import ReactCalendar from 'react-calendar';
import { format, isSameDay } from 'date-fns';
import TimeTracking from '../components/TimeTracking';
import DisplayName from '../components/DisplayName';
import ReviewModal from '../components/ReviewModal';
import 'react-calendar/dist/Calendar.css';
import './Calendar.css';

const Calendar = () => {
  const { user, isBrand, isAmbassador, isAccountManager, demoMode } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('list'); // 'calendar' or 'list'
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState(null);
  const [bookingReviews, setBookingReviews] = useState({}); // Map of booking ID to review status
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);
  const [promptBooking, setPromptBooking] = useState(null);
  const [talentType, setTalentType] = useState('ambassador'); // 'ambassador' or 'account_manager'
  const [hasAccountManagers, setHasAccountManagers] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await bookingAPI.getBookings();
      const bookingsData = response.data.bookings;
      setBookings(bookingsData);

      // Fetch review status for completed bookings
      const completedBookings = bookingsData.filter(b => b.status === 'completed');
      const reviewStatuses = {};

      for (const booking of completedBookings) {
        try {
          const reviewResponse = await reviewAPI.getBookingReviews(booking.id);
          const userReview = reviewResponse.data.reviews.find(r => r.reviewer_id === user.userId);
          reviewStatuses[booking.id] = !!userReview;
        } catch (error) {
          reviewStatuses[booking.id] = false;
        }
      }

      setBookingReviews(reviewStatuses);
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

  // Get user object for booking partner based on user role
  const getBookingPartner = (booking) => {
    if (isBrand) {
      // Brand sees ambassador
      return {
        id: booking.ambassador_id,
        name: booking.ambassador_name,
        profile_photo: booking.ambassador_photo,
        is_test: booking.ambassador_is_test
      };
    } else {
      // Ambassador sees brand (AM info shown separately as "Booked by")
      return {
        id: booking.brand_id,
        name: booking.brand_name,
        profile_photo: booking.brand_photo,
        is_test: booking.brand_is_test,
        company_name: booking.company_name
      };
    }
  };

  // Parse date string as local date (not UTC) to prevent timezone shifting
  const parseLocalDate = (dateString) => {
    if (!dateString) {
      console.error('parseLocalDate: No date string provided');
      return new Date();
    }

    // Handle both YYYY-MM-DD and full timestamp formats
    const dateOnly = dateString.split('T')[0]; // Get just the date part if it's a timestamp
    const [year, month, day] = dateOnly.split('-').map(Number);

    // Validate the parsed values
    if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
      console.error('parseLocalDate: Invalid date string:', dateString);
      return new Date();
    }

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

  // Handle opening review modal
  const handleOpenReview = (booking) => {
    setSelectedBookingForReview(booking);
    setShowReviewModal(true);
  };

  // Handle closing review modal
  const handleCloseReview = () => {
    setShowReviewModal(false);
    setSelectedBookingForReview(null);
  };

  // Handle review submission
  const handleSubmitReview = async (reviewData) => {
    try {
      await reviewAPI.createReview(reviewData);
      alert('Review submitted successfully!');
      handleCloseReview();
      handleCloseReviewPrompt();
      await fetchBookings(); // Refresh to update review status
    } catch (error) {
      console.error('Failed to submit review:', error);
      alert(error.response?.data?.error || 'Failed to submit review. Please try again.');
    }
  };

  // Handle checkout complete (triggers review prompt for preview users)
  const handleCheckoutComplete = (booking) => {
    setPromptBooking(booking);
    setShowReviewPrompt(true);
  };

  // Handle opening review from prompt
  const handleOpenReviewFromPrompt = () => {
    setShowReviewPrompt(false);
    setSelectedBookingForReview(promptBooking);
    setShowReviewModal(true);
  };

  // Handle closing review prompt
  const handleCloseReviewPrompt = () => {
    setShowReviewPrompt(false);
    setPromptBooking(null);
  };

  // Get items based on current talent type
  const getUnifiedItems = () => {
    const items = [];

    // Show only bookings (brand ambassadors)
    bookings.forEach(booking => {
      items.push({
        ...booking,
        itemType: 'booking',
        sortDate: booking.event_date
      });
    });

    // Sort by date (most recent first)
    return items.sort((a, b) => new Date(b.sortDate) - new Date(a.sortDate));
  };

  const filteredItems = getUnifiedItems();

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
            className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            List View
          </button>
          <button
            className={`toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
            onClick={() => setViewMode('calendar')}
          >
            Calendar View
          </button>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h2>No bookings yet</h2>
          <p>
            {isBrand
              ? 'Create bookings from the Matches page!'
              : 'Brands will send you booking requests.'}
          </p>
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
                              {(booking.brand_company_name || booking.company_name) && (
                                <div className="booking-detail" style={{ fontWeight: '600', color: '#0A2540' }}>
                                  <span className="detail-icon">🏢</span>
                                  <span>{booking.brand_company_name || booking.company_name}</span>
                                </div>
                              )}
                              <div className="booking-detail">
                                <span className="detail-icon">👤</span>
                                <span>
                                  <DisplayName
                                    user={{
                                      id: booking.ambassador_id,
                                      name: booking.ambassador_name,
                                      profile_photo: booking.ambassador_photo,
                                      is_test: booking.ambassador_is_test
                                    }}
                                    demoMode={demoMode}
                                  />
                                </span>
                              </div>
                              {booking.booked_by_am_name && (
                                <div className="booking-detail" style={{ fontStyle: 'italic', color: '#6B7280' }}>
                                  <span className="detail-icon">👔</span>
                                  <span>Booked by {booking.booked_by_am_name}</span>
                                </div>
                              )}
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

                          {booking.status === 'completed' && !bookingReviews[booking.id] && (
                            <div className="booking-actions">
                              <button
                                className="action-btn review-btn"
                                onClick={() => handleOpenReview(booking)}
                              >
                                Leave Review
                              </button>
                            </div>
                          )}

                          {booking.status === 'completed' && bookingReviews[booking.id] && (
                            <div className="booking-actions">
                              <span className="reviewed-badge">✓ Reviewed</span>
                            </div>
                          )}

                          {/* Time Tracking */}
                          <TimeTracking
                            bookingId={booking.id}
                            bookingStatus={booking.status}
                            onUpdate={fetchBookings}
                            isPreview={user?.isPreview}
                            onCheckoutComplete={() => handleCheckoutComplete(booking)}
                            ambassadorName={booking.ambassador_name}
                            demoMode={demoMode}
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
              {/* Items List */}
              {isBrand && bookings.length > 0 && (
                <h2 className="section-title">Brand Ambassadors</h2>
              )}

              {filteredItems.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📅</div>
                  <h2>No bookings yet</h2>
                  <p>Your bookings with brand ambassadors will appear here</p>
                </div>
              ) : (
                <div className="bookings-grid">
                  {filteredItems.map((item) => {
                    const isBooking = item.itemType === 'booking';

                    return (
                      <div
                        key={`${item.itemType}-${item.id}`}
                        className={`booking-card ${item.status}`}
                      >
                        <div className="booking-header">
                          <span className={`status-badge ${getStatusBadgeClass(item.status)}`}>
                            {getStatusText(item.status)}
                          </span>
                          <span className="booking-date">
                            {parseLocalDate(item.sortDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>

                        <div className="booking-body">
                          <h3 className="booking-title">
                            {isBooking ? item.event_name : `${isBrand ? item.account_manager_name : item.brand_name}`}
                          </h3>
                          <div className="booking-details">
                            {isBooking && (item.brand_company_name || item.company_name) && (
                              <div className="booking-detail" style={{ fontWeight: '600', color: '#0A2540' }}>
                                <span className="detail-icon">🏢</span>
                                <span>{item.brand_company_name || item.company_name}</span>
                              </div>
                            )}
                            <div className="booking-detail">
                              <span className="detail-icon">👤</span>
                              <span>
                                {isBooking ? (
                                  <DisplayName
                                    user={{
                                      id: item.ambassador_id,
                                      name: item.ambassador_name,
                                      profile_photo: item.ambassador_photo,
                                      is_test: item.ambassador_is_test
                                    }}
                                    demoMode={demoMode}
                                  />
                                ) : (
                                  <DisplayName
                                    user={{
                                      id: isBrand ? item.account_manager_id : item.brand_id,
                                      name: isBrand ? item.account_manager_name : item.brand_name,
                                      is_test: false
                                    }}
                                    demoMode={demoMode}
                                  />
                                )}
                              </span>
                            </div>
                            {isBooking && item.booked_by_am_name && (
                              <div className="booking-detail" style={{ fontStyle: 'italic', color: '#6B7280' }}>
                                <span className="detail-icon">👔</span>
                                <span>Booked by {item.booked_by_am_name}</span>
                              </div>
                            )}
                            {isBooking ? (
                              <>
                                <div className="booking-detail">
                                  <span className="detail-icon">🕐</span>
                                  <span>{formatTime(item.start_time)} - {formatTime(item.end_time)} CST</span>
                                </div>
                                <div className="booking-detail">
                                  <span className="detail-icon">📍</span>
                                  <span>{item.event_location}</span>
                                </div>
                                {item.notes && (
                                  <div className="booking-detail">
                                    <span className="detail-icon">📝</span>
                                    <span>{item.notes}</span>
                                  </div>
                                )}
                                <div className="booking-detail">
                                  <span className="detail-label">Total Cost:</span>
                                  <span>${parseFloat(item.total_cost).toFixed(2)}</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="booking-detail">
                                  <span className="detail-icon">💰</span>
                                  <span>${parseFloat(item.monthly_rate).toLocaleString()}/month</span>
                                </div>
                                <div className="booking-detail">
                                  <span className="detail-icon">📅</span>
                                  <span>
                                    Started: {new Date(item.start_date).toLocaleDateString()}
                                    {item.end_date && ` • Ended: ${new Date(item.end_date).toLocaleDateString()}`}
                                  </span>
                                </div>
                                {item.notes && (
                                  <div className="booking-detail">
                                    <span className="detail-icon">📝</span>
                                    <span>{item.notes}</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="booking-actions">
                          {item.status === 'pending' && isAmbassador && (
                            <>
                              <button className="action-btn decline-btn" onClick={() => handleDecline(item)}>
                                Decline
                              </button>
                              <button className="action-btn confirm-btn" onClick={() => handleConfirm(item)}>
                                Confirm
                              </button>
                            </>
                          )}
                          {item.status === 'pending' && isBrand && (
                            <button className="action-btn cancel-btn" onClick={() => handleCancel(item)}>
                              Cancel Request
                            </button>
                          )}
                          {item.status === 'confirmed' && (
                            <button className="action-btn cancel-btn" onClick={() => handleCancel(item)}>
                              Cancel Booking
                            </button>
                          )}
                          {item.status === 'completed' && !bookingReviews[item.id] && (
                            <button className="action-btn review-btn" onClick={() => handleOpenReview(item)}>
                              Leave Review
                            </button>
                          )}
                          {item.status === 'completed' && bookingReviews[item.id] && (
                            <span className="reviewed-badge">✓ Reviewed</span>
                          )}
                        </div>

                        {/* Time Tracking for bookings */}
                        {isBooking && (
                          <TimeTracking
                            bookingId={item.id}
                            bookingStatus={item.status}
                            onUpdate={fetchBookings}
                            isPreview={user?.isPreview}
                            onCheckoutComplete={() => handleCheckoutComplete(item)}
                            ambassadorName={item.ambassador_name}
                            demoMode={demoMode}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Review Prompt Modal */}
      {showReviewPrompt && promptBooking && (
        <div className="review-prompt-modal" onClick={handleCloseReviewPrompt}>
          <div className="review-prompt-content" onClick={(e) => e.stopPropagation()}>
            <div className="review-prompt-icon">⭐</div>
            <h2>What did you think of <DisplayName user={getBookingPartner(promptBooking)} demoMode={demoMode} />?</h2>
            <p>Share your experience to help other brands discover great ambassadors!</p>
            <div className="review-prompt-actions">
              <button
                className="leave-review-button"
                onClick={handleOpenReviewFromPrompt}
              >
                Leave a Review
              </button>
              <button
                className="skip-review-button"
                onClick={handleCloseReviewPrompt}
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedBookingForReview && (
        <ReviewModal
          booking={selectedBookingForReview}
          partnerInfo={getBookingPartner(selectedBookingForReview)}
          onClose={handleCloseReview}
          onSubmit={handleSubmitReview}
          isPreview={user?.isPreview}
        />
      )}
    </div>
  );
};

export default Calendar;
