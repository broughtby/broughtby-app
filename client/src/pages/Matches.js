import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { matchAPI, likeAPI, bookingAPI, messageAPI, engagementAPI } from '../services/api';
import { getPhotoUrl } from '../services/upload';
import DisplayName from '../components/DisplayName';
import BookingModal from '../components/BookingModal';
import EngagementModal from '../components/EngagementModal';
import BrandAvatar from '../components/BrandAvatar';
import './Matches.css';

const Matches = () => {
  const { isAmbassador, isBrand, isAccountManager, demoMode, user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [likes, setLikes] = useState([]);
  const [engagements, setEngagements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingAmbassador, setBookingAmbassador] = useState(null);
  const [engagementAccountManager, setEngagementAccountManager] = useState(null);
  const [showBookingSuccess, setShowBookingSuccess] = useState(false);
  const [showEngagementSuccess, setShowEngagementSuccess] = useState(false);
  const [bookingAutoConfirmed, setBookingAutoConfirmed] = useState(false);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const matchesResponse = await matchAPI.getMatches();
      setMatches(matchesResponse.data.matches);

      if (isAmbassador) {
        const likesResponse = await likeAPI.getReceivedLikes();
        setLikes(likesResponse.data.likes);
      }

      // Fetch engagements for brands and account managers
      if (isBrand || isAccountManager) {
        try {
          const engagementsResponse = await engagementAPI.getEngagements();
          // Filter for active engagements only
          const activeEngagements = engagementsResponse.data.engagements.filter(
            engagement => engagement.status === 'active'
          );
          setEngagements(activeEngagements);
        } catch (error) {
          console.error('Failed to fetch engagements:', error);
          // Don't fail the whole page if engagements fail to load
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [isAmbassador, isBrand, isAccountManager]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Format time from 24-hour to 12-hour format with AM/PM
  const formatTime = (time24) => {
    if (!time24) return '';

    // Handle time format (HH:MM:SS or HH:MM)
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12; // Convert 0 to 12 for midnight

    return `${hour12}:${minutes} ${ampm}`;
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

  const handleAcceptRequest = async (brandId) => {
    try {
      await matchAPI.createMatch(brandId);
      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Failed to accept request:', error);
    }
  };

  const handleDeclineRequest = async (brandId) => {
    try {
      await likeAPI.declineLike(brandId);
      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Failed to decline request:', error);
    }
  };

  const handleChatClick = (matchId) => {
    navigate(`/chat/${matchId}`);
  };

  const handleBookingSubmit = async (bookingData) => {
    try {
      // Find the match for this ambassador
      const match = matches.find(m => m.user_id === bookingData.ambassadorId);

      if (!match) {
        alert('Error: Could not find match. Please try again.');
        return;
      }

      // Create booking in database
      const bookingPayload = {
        matchId: match.match_id,
        ambassadorId: bookingData.ambassadorId,
        eventName: bookingData.eventName,
        eventDate: bookingData.eventDate,
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
        duration: bookingData.duration,
        eventLocation: bookingData.eventLocation,
        hourlyRate: bookingData.hourlyRate,
        totalCost: bookingData.estimatedCost,
        notes: bookingData.notes,
        brandId: bookingData.brandId, // Include brandId for account managers
      };

      const response = await bookingAPI.createBooking(bookingPayload);
      const isAutoConfirmed = response.data.autoConfirmed || false;

      // Send a message in the chat with booking details
      const bookingMessage = `📅 ${isAutoConfirmed ? 'Booking Confirmed!' : 'New Booking Request'}

Event: ${bookingData.eventName}
Date: ${parseLocalDate(bookingData.eventDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Time: ${formatTime(bookingData.startTime)} - ${formatTime(bookingData.endTime)} CST (${bookingData.duration} hours)
Location: ${bookingData.eventLocation}${bookingData.notes ? `\nNotes: ${bookingData.notes}` : ''}

Rate: $${bookingData.hourlyRate}/hour
Total Cost: $${bookingData.estimatedCost.toFixed(2)}

Status: ${isAutoConfirmed ? '✅ Confirmed' : 'Pending confirmation'}`;

      await messageAPI.createMessage(match.match_id, bookingMessage);

      // Close modal and show success
      setBookingAmbassador(null);
      setBookingAutoConfirmed(isAutoConfirmed);
      setShowBookingSuccess(true);

      // Optionally navigate to the chat
      // navigate(`/chat/${match.match_id}`);
    } catch (error) {
      console.error('Failed to create booking:', error);

      // Check if we have a specific error message from the backend
      const errorMessage = error.response?.data?.error || 'Failed to create booking. Please try again.';
      alert(errorMessage);
    }
  };

  const handleEngagementSubmit = async (engagementData) => {
    try {
      // Find the match for this account manager
      const match = matches.find(m => m.user_id === engagementData.accountManagerId);

      if (!match) {
        alert('Error: Could not find match. Please try again.');
        return;
      }

      // Create engagement in database
      const engagementPayload = {
        matchId: match.match_id,
        accountManagerId: engagementData.accountManagerId,
        monthlyRate: engagementData.monthlyRate,
        startDate: engagementData.startDate,
        notes: engagementData.notes,
      };

      await engagementAPI.createEngagement(engagementPayload);

      // Send a message in the chat with engagement details
      const engagementMessage = `💼 New Engagement Request

Monthly Retainer: $${engagementData.monthlyRate.toLocaleString()}/month
Start Date: ${new Date(engagementData.startDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
${engagementData.notes ? `\nScope of Work: ${engagementData.notes}` : ''}

Status: Pending your acceptance`;

      await messageAPI.createMessage(match.match_id, engagementMessage);

      // Close modal and show success
      setEngagementAccountManager(null);
      setShowEngagementSuccess(true);

      // Refresh data to show updated engagement status
      await fetchData();
    } catch (error) {
      console.error('Failed to create engagement:', error);

      // Check if we have a specific error message from the backend
      const errorMessage = error.response?.data?.error || 'Failed to create engagement. Please try again.';
      alert(errorMessage);
    }
  };


  if (loading) {
    return (
      <div className="matches-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="matches-container container">
        <div className="matches-header">
          <h1>Matches</h1>
          {isAmbassador && (
            <p className="matches-subtitle">
              {likes.length > 0 && `${likes.length} pending • `}
              {matches.length} active
            </p>
          )}
        </div>

        <div className="matches-section">
        {/* For Account Managers: Only show Talent Pool (ambassadors they can book) */}
        {isAccountManager ? (
          <>
            {(() => {
              const talentMatches = matches.filter(m => m.role === 'ambassador' || m.role === 'account_manager');

              return talentMatches.length > 0 ? (
                <>
                  <div className="section-header">
                    <h2 className="section-title">Brand Ambassadors</h2>
                    <span className="section-count">{talentMatches.length}</span>
                  </div>
                  <div className="matches-grid">
                    {talentMatches.map((match) => (
                      <div key={match.match_id} className="match-card">
                        <img
                          src={getPhotoUrl(match.profile_photo)}
                          alt={match.name}
                          className="match-photo"
                        />
                        <div className="match-info">
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <h3><DisplayName user={match} demoMode={demoMode} /></h3>
                            <span className="active-badge">ACTIVE</span>
                          </div>
                          {match.location && <p className="match-location">{match.location}</p>}
                        </div>
                        <div className="match-actions">
                          <button
                            className="message-button"
                            onClick={() => handleChatClick(match.match_id)}
                          >
                            Message
                          </button>
                          <button
                            className="book-button-small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setBookingAmbassador({
                                id: match.user_id,
                                name: match.name,
                                hourly_rate: match.hourly_rate,
                                profile_photo: match.profile_photo,
                                is_test: match.is_test,
                              });
                            }}
                          >
                            Book Now
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="no-matches">No ambassadors matched yet. Browse and match with ambassadors in the Discover section.</p>
              );
            })()}
          </>
        ) : (
          <>
            {/* Active Partnerships Section for Ambassadors */}
            {isAmbassador && likes.length > 0 && matches.length > 0 && (
              <div className="section-header">
                <h2 className="section-title">Active</h2>
                <span className="section-count">{matches.length}</span>
              </div>
            )}

            {/* Regular matches for Brands and Ambassadors */}
            {matches.length > 0 && (
              <div className="matches-grid">
                {matches.map((match) => (
                  <div key={match.match_id} className="match-card">
                    <img
                      src={match.am_name ? getPhotoUrl(match.am_profile_photo) : getPhotoUrl(match.profile_photo)}
                      alt={match.am_name ? match.am_name : match.name}
                      className="match-photo"
                    />
                    <div className="match-info">
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {match.am_name ? (
                          <h3>{match.am_name}: {match.company_name || match.name}</h3>
                        ) : (
                          <h3><DisplayName user={match} demoMode={demoMode} /></h3>
                        )}
                        {match.matched_by_am_name && Number(match.matched_by_am_id) !== Number(user?.id) ? (
                          <span className="matched-by-am-badge">{match.matched_by_am_name} Matched</span>
                        ) : match.matched_by_am_name && Number(match.matched_by_am_id) === Number(user?.id) ? (
                          <span className="matched-by-am-badge">Matched</span>
                        ) : (
                          <span className="active-badge">ACTIVE</span>
                        )}
                      </div>
                      {match.location && <p className="match-location">{match.location}</p>}
                    </div>
                    <div className="match-actions">
                      <button
                        className="message-button"
                        onClick={() => handleChatClick(match.match_id)}
                      >
                        Message
                      </button>

                      {/* Booking/Engagement Creation for Brands */}
                      {isBrand && (
                        <button
                          className="book-button-small"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (match.role === 'account_manager') {
                              // Transform match object for EngagementModal
                              setEngagementAccountManager({
                                id: match.user_id,
                                name: match.name,
                                monthly_rate: match.monthly_rate,
                                profile_photo: match.profile_photo,
                                location: match.location,
                              });
                            } else {
                              // Transform match object to ambassador format for BookingModal
                              setBookingAmbassador({
                                id: match.user_id,
                                name: match.name,
                                hourly_rate: match.hourly_rate,
                                profile_photo: match.profile_photo,
                                is_test: match.is_test,
                              });
                            }
                          }}
                        >
                          Book Now
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Pending Requests Section (Ambassadors only) */}
        {isAmbassador && likes.length > 0 && (
          <>
            <div className="section-header">
              <h2 className="section-title">Pending</h2>
              <span className="section-count">{likes.length}</span>
            </div>
            <div className="likes-grid">
              {likes.map((like) => (
                <div key={like.id} className="like-card">
                  <img
                    src={like.created_by_am_id ? getPhotoUrl(like.am_profile_photo) : getPhotoUrl(like.profile_photo)}
                    alt={like.created_by_am_id ? like.am_name : like.name}
                    className="like-photo"
                  />
                  <div className="like-info">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {like.created_by_am_id ? (
                        <h3>{like.am_name}: {like.company_name || like.name}</h3>
                      ) : like.company_name ? (
                        <h3>{like.name}: {like.company_name}</h3>
                      ) : (
                        <h3><DisplayName user={like} demoMode={demoMode} /></h3>
                      )}
                      <span className="pending-badge">PENDING</span>
                    </div>
                    {like.location && <p className="like-location">{like.location}</p>}
                  </div>
                  <div className="request-actions">
                    <button
                      className="decline-button"
                      onClick={() => handleDeclineRequest(like.brand_id)}
                    >
                      Decline
                    </button>
                    <button
                      className="accept-button"
                      onClick={() => handleAcceptRequest(like.brand_id)}
                    >
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
          {/* Show Engagements Section for Brands */}
          {isBrand && engagements.length > 0 && (
            <div className="engagements-section">
              <h2 className="section-title">Your Account Manager</h2>
              <div className="engagements-grid">
                {engagements.map((engagement) => (
                  <div key={engagement.id} className="engagement-card">
                    <img
                      src={engagement.account_manager_photo ? getPhotoUrl(engagement.account_manager_photo) : 'https://via.placeholder.com/200'}
                      alt={engagement.account_manager_name}
                      className="engagement-photo"
                    />
                    <div className="engagement-info">
                      <h3>{engagement.account_manager_name}</h3>
                      <p className="engagement-meta">Active since {new Date(engagement.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                      <p className="engagement-rate">${engagement.monthly_rate.toLocaleString()}/month</p>
                    </div>
                    <div className="engagement-actions">
                      <button
                        className="message-button"
                        onClick={() => {
                          // Find the match for this engagement
                          const match = matches.find(m => m.user_id === engagement.account_manager_id);
                          if (match) {
                            handleChatClick(match.match_id);
                          } else if (engagement.match_id) {
                            handleChatClick(engagement.match_id);
                          }
                        }}
                      >
                        Message
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Show Engagements Section for Account Managers */}
          {isAccountManager && engagements.length > 0 && (
            <div className="engagements-section">
              <h2 className="section-title">Brand Clients</h2>
              <div className="engagements-grid">
                {engagements.map((engagement) => (
                  <div key={engagement.id} className="engagement-card">
                    <BrandAvatar
                      companyLogo={engagement.company_logo}
                      personPhoto={engagement.brand_photo}
                      companyName={engagement.company_name || engagement.brand_name}
                      personName={engagement.brand_name}
                      size="large"
                    />
                    <div className="engagement-info">
                      <h3>{engagement.company_name || engagement.brand_name}</h3>
                      <p className="engagement-meta">Active since {new Date(engagement.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                    </div>
                    <div className="engagement-actions">
                      <button
                        className="message-button"
                        onClick={() => {
                          // Find the match for this engagement
                          const match = matches.find(m => m.user_id === engagement.brand_id);
                          if (match) {
                            handleChatClick(match.match_id);
                          } else if (engagement.match_id) {
                            handleChatClick(engagement.match_id);
                          }
                        }}
                      >
                        Message
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Separator if there are engagements (brands only, not account managers) */}
          {isBrand && engagements.length > 0 && matches.length > 0 && (
            <div className="section-divider">
              <h2 className="section-title">Your Matches</h2>
            </div>
          )}

          {matches.length === 0 && likes.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🤝</div>
              <h2>No matches yet</h2>
              <p>
                {isAmbassador
                  ? 'Accept requests from brands to start messaging!'
                  : 'Request to work with ambassadors to get started!'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Booking Modal */}
      {bookingAmbassador && (
        <BookingModal
          ambassador={bookingAmbassador}
          onClose={() => setBookingAmbassador(null)}
          onSubmit={handleBookingSubmit}
        />
      )}

      {/* Engagement Modal */}
      {engagementAccountManager && (
        <EngagementModal
          accountManager={engagementAccountManager}
          onClose={() => setEngagementAccountManager(null)}
          onSubmit={handleEngagementSubmit}
        />
      )}

      {/* Booking Success Modal */}
      {showBookingSuccess && (
        <div className="booking-success-modal" onClick={() => setShowBookingSuccess(false)}>
          <div className="booking-success-content" onClick={(e) => e.stopPropagation()}>
            <div className="booking-success-icon">✅</div>
            <h2>{bookingAutoConfirmed ? 'Booking Confirmed!' : 'Booking Request Sent!'}</h2>
            <p>
              {bookingAutoConfirmed
                ? 'Your booking is confirmed! View in Calendar to manage the activation.'
                : 'Your booking request has been sent and is pending confirmation from the ambassador.'}
            </p>
            <div className="booking-success-actions">
              <button
                className="view-calendar-button"
                onClick={() => {
                  setShowBookingSuccess(false);
                  navigate('/calendar');
                }}
              >
                View in Calendar
              </button>
              <button
                className="dismiss-button"
                onClick={() => setShowBookingSuccess(false)}
              >
                Stay in Matches
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Engagement Success Modal */}
      {showEngagementSuccess && (
        <div className="booking-success-modal" onClick={() => setShowEngagementSuccess(false)}>
          <div className="booking-success-content" onClick={(e) => e.stopPropagation()}>
            <div className="booking-success-icon">💼</div>
            <h2>Engagement Request Sent!</h2>
            <p>
              Your engagement request has been sent and is pending acceptance from the account manager. View in Calendar to track the status.
            </p>
            <div className="booking-success-actions">
              <button
                className="view-calendar-button"
                onClick={() => {
                  setShowEngagementSuccess(false);
                  navigate('/calendar');
                }}
              >
                View in Calendar
              </button>
              <button
                className="dismiss-button"
                onClick={() => setShowEngagementSuccess(false)}
              >
                Stay in Matches
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Matches;
