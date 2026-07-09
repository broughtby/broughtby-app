import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { bookingAPI, messageAPI, reviewAPI, matchAPI } from '../services/api';
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
  const [editBooking, setEditBooking] = useState(null);
  const [editForm, setEditForm] = useState({ eventDate: '', startTime: '', endTime: '' });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [detailBookingId, setDetailBookingId] = useState(null);
  const [showCancelled, setShowCancelled] = useState(false);
  const [matches, setMatches] = useState([]); // matched ambassadors, for draft reassignment
  const [draftBooking, setDraftBooking] = useState(null); // draft open in the editor
  const [draftForm, setDraftForm] = useState(null);
  const [draftSubmitting, setDraftSubmitting] = useState(false);

  useEffect(() => {
    fetchBookings();
    // Brands/AMs need their matched ambassadors to reassign a draft
    if (isBrand || isAccountManager) {
      matchAPI.getMatches()
        .then((res) => setMatches(res.data.matches || []))
        .catch((err) => console.error('Failed to fetch matches:', err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Normalize a DB time value (HH:MM:SS) to the HH:MM that <input type="time"> expects
  const toTimeInputValue = (time) => (time ? time.slice(0, 5) : '');

  // Open the edit-times modal, prefilled with the booking's current schedule
  const handleOpenEdit = (booking) => {
    setEditBooking(booking);
    setEditForm({
      eventDate: booking.event_date ? booking.event_date.split('T')[0] : '',
      startTime: toTimeInputValue(booking.start_time),
      endTime: toTimeInputValue(booking.end_time),
    });
  };

  const handleCloseEdit = () => {
    setEditBooking(null);
    setEditSubmitting(false);
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();

    if (!editForm.startTime || !editForm.endTime) {
      alert('Please enter both a start and end time.');
      return;
    }
    if (editForm.endTime <= editForm.startTime) {
      alert('End time must be after start time.');
      return;
    }

    setEditSubmitting(true);
    try {
      const response = await bookingAPI.updateBookingTimes(editBooking.id, editForm);
      const updated = response.data.booking;

      // Post an update message to the chat, mirroring the other booking actions
      const updateMessage = `🕐 Event Times Updated

${user.name} has updated the schedule for:
Event: ${updated.event_name}
Date: ${parseLocalDate(updated.event_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
New Time: ${formatTime(updated.start_time)} - ${formatTime(updated.end_time)} CST

Total Cost: $${parseFloat(updated.total_cost).toFixed(2)}`;

      await messageAPI.createMessage(updated.match_id, updateMessage);

      await fetchBookings();
      handleCloseEdit();
      alert('Event times updated. The brand ambassador has been notified by email.');
    } catch (error) {
      console.error('Failed to update booking times:', error);
      alert(error.response?.data?.error || 'Failed to update times. Please try again.');
      setEditSubmitting(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'draft':
        return 'status-draft';
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
      case 'draft':
        return '📝 Draft';
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

  // Sort helpers for the list view
  const byDateAsc = (a, b) =>
    parseLocalDate(a.event_date) - parseLocalDate(b.event_date) ||
    String(a.start_time).localeCompare(String(b.start_time));
  const byDateDesc = (a, b) =>
    parseLocalDate(b.event_date) - parseLocalDate(a.event_date) ||
    String(b.start_time).localeCompare(String(a.start_time));

  // Group bookings for the list view by DATE (not just status):
  //  - Upcoming: not cancelled, not completed, and the event date hasn't passed
  //  - Past: everything else that isn't cancelled (completed, or date already passed)
  //  - Cancelled: shown in a separate collapsible section so it doesn't clog the list
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const isPastDate = (b) => parseLocalDate(b.event_date) < todayStart;

  const isActionable = (b) => b.status !== 'cancelled' && b.status !== 'draft';
  const upcomingItems = bookings
    .filter((b) => isActionable(b) && b.status !== 'completed' && !isPastDate(b))
    .sort(byDateAsc);
  const pastItems = bookings
    .filter((b) => isActionable(b) && (b.status === 'completed' || isPastDate(b)))
    .sort(byDateDesc);
  const cancelledItems = bookings
    .filter((b) => b.status === 'cancelled')
    .sort(byDateDesc);
  // Drafts are private to the brand and shown in their own section at the top
  const draftItems = bookings
    .filter((b) => b.status === 'draft')
    .sort(byDateAsc);

  const listGroups = [
    { key: 'upcoming', label: 'Upcoming', items: upcomingItems },
    { key: 'past', label: 'Past', items: pastItems },
  ];

  // The booking currently open in the detail modal (derived from bookings so it
  // stays fresh after actions like confirm/cancel/check-in refetch the list)
  const detailBooking = detailBookingId
    ? bookings.find((b) => b.id === detailBookingId) || null
    : null;

  const handleCloseDetail = () => setDetailBookingId(null);

  // Clicking a row: drafts open the editor, everything else opens read-only detail
  const handleRowClick = (item) => {
    if (item.status === 'draft') {
      openDraftEditor(item);
    } else {
      setDetailBookingId(item.id);
    }
  };

  const openDraftEditor = (booking) => {
    setDraftBooking(booking);
    setDraftForm({
      ambassadorId: booking.ambassador_id,
      eventName: booking.event_name || '',
      eventDate: booking.event_date ? booking.event_date.split('T')[0] : '',
      startTime: toTimeInputValue(booking.start_time),
      endTime: toTimeInputValue(booking.end_time),
      eventLocation: booking.event_location || '',
      notes: booking.notes || '',
    });
  };

  const closeDraftEditor = () => {
    setDraftBooking(null);
    setDraftForm(null);
    setDraftSubmitting(false);
  };

  // Duplicate any booking into a draft, then open it in the editor
  const handleDuplicate = async (booking) => {
    try {
      const res = await bookingAPI.duplicateBooking(booking.id);
      const draft = res.data.booking;
      await fetchBookings();
      handleCloseDetail();
      openDraftEditor(draft);
    } catch (error) {
      console.error('Failed to duplicate booking:', error);
      alert(error.response?.data?.error || 'Failed to duplicate booking. Please try again.');
    }
  };

  const handleSaveDraft = async (e) => {
    if (e) e.preventDefault();
    if (draftForm.endTime <= draftForm.startTime) {
      alert('End time must be after start time.');
      return;
    }
    setDraftSubmitting(true);
    try {
      const res = await bookingAPI.updateDraftBooking(draftBooking.id, draftForm);
      await fetchBookings();
      setDraftBooking(res.data.booking);
      setDraftSubmitting(false);
      alert('Draft saved.');
    } catch (error) {
      console.error('Failed to save draft:', error);
      alert(error.response?.data?.error || 'Failed to save draft. Please try again.');
      setDraftSubmitting(false);
    }
  };

  const handleSendDraft = async () => {
    const ambName = matches.find((m) => m.user_id === draftForm.ambassadorId)?.name || 'this ambassador';
    if (!window.confirm(`Save and send this booking request to ${ambName}?`)) return;
    setDraftSubmitting(true);
    try {
      // Persist any pending edits first, then send
      await bookingAPI.updateDraftBooking(draftBooking.id, draftForm);
      await bookingAPI.sendDraftBooking(draftBooking.id);
      await fetchBookings();
      closeDraftEditor();
      alert('Booking sent. The ambassador has been notified by email.');
    } catch (error) {
      console.error('Failed to send draft:', error);
      alert(error.response?.data?.error || 'Failed to send draft. Please try again.');
      setDraftSubmitting(false);
    }
  };

  const handleDeleteDraft = async () => {
    if (!window.confirm('Delete this draft? This cannot be undone.')) return;
    setDraftSubmitting(true);
    try {
      await bookingAPI.deleteBooking(draftBooking.id);
      await fetchBookings();
      closeDraftEditor();
    } catch (error) {
      console.error('Failed to delete draft:', error);
      alert(error.response?.data?.error || 'Failed to delete draft. Please try again.');
      setDraftSubmitting(false);
    }
  };

  // A single compact, clickable list row (shared by every list section)
  const renderBookingRow = (item) => {
    const partner = getBookingPartner(item);
    const d = parseLocalDate(item.event_date);
    return (
      <button
        key={item.id}
        className={`booking-row status-${item.status}`}
        onClick={() => handleRowClick(item)}
      >
        <span className="row-date" aria-hidden="true">
          <span className="row-date-month">
            {d.toLocaleDateString('en-US', { month: 'short' })}
          </span>
          <span className="row-date-day">{d.getDate()}</span>
        </span>
        <span className="row-main">
          <span className="row-title">{item.event_name}</span>
          <span className="row-sub">
            <DisplayName user={partner} demoMode={demoMode} />
            <span className="row-dot">·</span>
            {formatTime(item.start_time)} – {formatTime(item.end_time)}
          </span>
        </span>
        <span className="row-right">
          <span className={`status-badge ${getStatusBadgeClass(item.status)}`}>
            {getStatusText(item.status)}
          </span>
          <span className="row-chevron" aria-hidden="true">›</span>
        </span>
      </button>
    );
  };

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
                              {(isBrand || isAccountManager) && (
                                <>
                                  <button
                                    className="action-btn edit-btn"
                                    onClick={() => handleOpenEdit(booking)}
                                  >
                                    Edit Times
                                  </button>
                                  <button
                                    className="action-btn cancel-btn"
                                    onClick={() => handleCancel(booking)}
                                  >
                                    Cancel Request
                                  </button>
                                </>
                              )}
                            </div>
                          )}

                          {booking.status === 'confirmed' && (
                            <div className="booking-actions">
                              {(isBrand || isAccountManager) && (
                                <button
                                  className="action-btn edit-btn"
                                  onClick={() => handleOpenEdit(booking)}
                                >
                                  Edit Times
                                </button>
                              )}
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
            <div className="bookings-list-view">
              {(isBrand || isAccountManager) && draftItems.length > 0 && (
                <div className="list-section">
                  <h2 className="list-section-title">
                    Drafts
                    <span className="list-section-count">{draftItems.length}</span>
                  </h2>
                  <p className="list-section-hint">
                    Only you can see drafts. Edit one to change details or the ambassador, then send it.
                  </p>
                  <div className="bookings-list">
                    {draftItems.map(renderBookingRow)}
                  </div>
                </div>
              )}

              {listGroups.map((group) =>
                group.items.length === 0 ? null : (
                  <div key={group.key} className="list-section">
                    <h2 className="list-section-title">
                      {group.label}
                      <span className="list-section-count">{group.items.length}</span>
                    </h2>
                    <div className="bookings-list">
                      {group.items.map(renderBookingRow)}
                    </div>
                  </div>
                )
              )}

              {cancelledItems.length > 0 && (
                <div className="list-section">
                  <button
                    type="button"
                    className="list-section-title list-section-toggle"
                    onClick={() => setShowCancelled((v) => !v)}
                    aria-expanded={showCancelled}
                  >
                    <span
                      className={`section-caret ${showCancelled ? 'open' : ''}`}
                      aria-hidden="true"
                    >
                      ›
                    </span>
                    Cancelled
                    <span className="list-section-count">{cancelledItems.length}</span>
                  </button>
                  {showCancelled && (
                    <div className="bookings-list">
                      {cancelledItems.map(renderBookingRow)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Booking Detail Modal */}
      {detailBooking && (
        <div className="detail-modal" onClick={handleCloseDetail}>
          <div className="detail-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="detail-close"
              onClick={handleCloseDetail}
              aria-label="Close"
            >
              ×
            </button>

            <span className={`status-badge ${getStatusBadgeClass(detailBooking.status)}`}>
              {getStatusText(detailBooking.status)}
            </span>
            <h2 className="detail-title">{detailBooking.event_name}</h2>

            <div className="detail-grid">
              {(detailBooking.brand_company_name || detailBooking.company_name) && (
                <div className="detail-row">
                  <span className="detail-ic">🏢</span>
                  <span>{detailBooking.brand_company_name || detailBooking.company_name}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-ic">👤</span>
                <span>
                  <DisplayName user={getBookingPartner(detailBooking)} demoMode={demoMode} />
                </span>
              </div>
              {detailBooking.booked_by_am_name && (
                <div className="detail-row">
                  <span className="detail-ic">👔</span>
                  <span>Booked by {detailBooking.booked_by_am_name}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-ic">📅</span>
                <span>
                  {parseLocalDate(detailBooking.event_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-ic">🕐</span>
                <span>
                  {formatTime(detailBooking.start_time)} – {formatTime(detailBooking.end_time)} CST
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-ic">📍</span>
                <span>{detailBooking.event_location}</span>
              </div>
              {detailBooking.notes && (
                <div className="detail-row">
                  <span className="detail-ic">📝</span>
                  <span>{detailBooking.notes}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-ic">💵</span>
                <span className="detail-cost">${parseFloat(detailBooking.total_cost).toFixed(2)}</span>
              </div>
            </div>

            <div className="booking-actions detail-actions">
              {(isBrand || isAccountManager) && (
                <button className="action-btn edit-btn" onClick={() => handleDuplicate(detailBooking)}>
                  Duplicate
                </button>
              )}
              {detailBooking.status === 'pending' && isAmbassador && (
                <>
                  <button className="action-btn decline-btn" onClick={() => handleDecline(detailBooking)}>
                    Decline
                  </button>
                  <button className="action-btn confirm-btn" onClick={() => handleConfirm(detailBooking)}>
                    Confirm
                  </button>
                </>
              )}
              {(detailBooking.status === 'pending' || detailBooking.status === 'confirmed') &&
                (isBrand || isAccountManager) && (
                  <button className="action-btn edit-btn" onClick={() => handleOpenEdit(detailBooking)}>
                    Edit Times
                  </button>
                )}
              {detailBooking.status === 'pending' && isBrand && (
                <button className="action-btn cancel-btn" onClick={() => handleCancel(detailBooking)}>
                  Cancel Request
                </button>
              )}
              {detailBooking.status === 'confirmed' && (
                <button className="action-btn cancel-btn" onClick={() => handleCancel(detailBooking)}>
                  Cancel Booking
                </button>
              )}
              {detailBooking.status === 'completed' && !bookingReviews[detailBooking.id] && (
                <button className="action-btn review-btn" onClick={() => handleOpenReview(detailBooking)}>
                  Leave Review
                </button>
              )}
              {detailBooking.status === 'completed' && bookingReviews[detailBooking.id] && (
                <span className="reviewed-badge">✓ Reviewed</span>
              )}
            </div>

            <TimeTracking
              bookingId={detailBooking.id}
              bookingStatus={detailBooking.status}
              onUpdate={fetchBookings}
              isPreview={user?.isPreview}
              onCheckoutComplete={() => handleCheckoutComplete(detailBooking)}
              ambassadorName={detailBooking.ambassador_name}
              demoMode={demoMode}
            />
          </div>
        </div>
      )}

      {/* Draft Editor Modal */}
      {draftBooking && draftForm && (
        <div className="edit-times-modal" onClick={closeDraftEditor}>
          <div className="edit-times-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="edit-times-title">Edit Draft</h2>
            <p className="edit-times-note">
              Drafts are private to you. Change any details or the ambassador, then send when ready —
              the cost updates automatically for the selected ambassador.
            </p>
            <form onSubmit={handleSaveDraft}>
              <label className="edit-times-label">
                Ambassador
                <select
                  value={draftForm.ambassadorId}
                  onChange={(e) => setDraftForm({ ...draftForm, ambassadorId: Number(e.target.value) })}
                >
                  {!matches.some((m) => m.user_id === draftForm.ambassadorId) && (
                    <option value={draftForm.ambassadorId}>
                      {draftBooking.ambassador_name || 'Current ambassador'}
                    </option>
                  )}
                  {matches.map((m) => (
                    <option key={m.user_id} value={m.user_id}>{m.name}</option>
                  ))}
                </select>
              </label>

              <label className="edit-times-label">
                Event Name
                <input
                  type="text"
                  value={draftForm.eventName}
                  onChange={(e) => setDraftForm({ ...draftForm, eventName: e.target.value })}
                  required
                />
              </label>

              <label className="edit-times-label">
                Date
                <input
                  type="date"
                  value={draftForm.eventDate}
                  onChange={(e) => setDraftForm({ ...draftForm, eventDate: e.target.value })}
                  required
                />
              </label>

              <div className="edit-times-row">
                <label className="edit-times-label">
                  Start Time
                  <input
                    type="time"
                    value={draftForm.startTime}
                    onChange={(e) => setDraftForm({ ...draftForm, startTime: e.target.value })}
                    required
                  />
                </label>
                <label className="edit-times-label">
                  End Time
                  <input
                    type="time"
                    value={draftForm.endTime}
                    onChange={(e) => setDraftForm({ ...draftForm, endTime: e.target.value })}
                    required
                  />
                </label>
              </div>

              <label className="edit-times-label">
                Location
                <input
                  type="text"
                  value={draftForm.eventLocation}
                  onChange={(e) => setDraftForm({ ...draftForm, eventLocation: e.target.value })}
                  required
                />
              </label>

              <label className="edit-times-label">
                Notes
                <textarea
                  rows={3}
                  value={draftForm.notes}
                  onChange={(e) => setDraftForm({ ...draftForm, notes: e.target.value })}
                />
              </label>

              <div className="draft-actions">
                <button
                  type="button"
                  className="action-btn cancel-btn"
                  onClick={handleDeleteDraft}
                  disabled={draftSubmitting}
                >
                  Delete
                </button>
                <div className="draft-actions-right">
                  <button type="submit" className="action-btn edit-btn" disabled={draftSubmitting}>
                    {draftSubmitting ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button
                    type="button"
                    className="action-btn confirm-btn"
                    onClick={handleSendDraft}
                    disabled={draftSubmitting}
                  >
                    Send
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Times Modal */}
      {editBooking && (
        <div className="edit-times-modal" onClick={handleCloseEdit}>
          <div className="edit-times-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="edit-times-title">Edit Event Times</h2>
            <p className="edit-times-subtitle">{editBooking.event_name}</p>
            <p className="edit-times-note">
              The brand ambassador will be emailed about the new times. Cost is recalculated automatically.
            </p>
            <form onSubmit={handleSubmitEdit}>
              <label className="edit-times-label">
                Date
                <input
                  type="date"
                  value={editForm.eventDate}
                  onChange={(e) => setEditForm({ ...editForm, eventDate: e.target.value })}
                  required
                />
              </label>
              <div className="edit-times-row">
                <label className="edit-times-label">
                  Start Time
                  <input
                    type="time"
                    value={editForm.startTime}
                    onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                    required
                  />
                </label>
                <label className="edit-times-label">
                  End Time
                  <input
                    type="time"
                    value={editForm.endTime}
                    onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                    required
                  />
                </label>
              </div>
              <div className="edit-times-actions">
                <button
                  type="button"
                  className="action-btn cancel-btn"
                  onClick={handleCloseEdit}
                  disabled={editSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="action-btn confirm-btn"
                  disabled={editSubmitting}
                >
                  {editSubmitting ? 'Saving...' : 'Save & Notify'}
                </button>
              </div>
            </form>
          </div>
        </div>
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
