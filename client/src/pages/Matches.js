import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { matchAPI, likeAPI, bookingAPI, messageAPI } from '../services/api';
import { getPhotoUrl } from '../services/upload';
import BookingModal from '../components/BookingModal';
import './Matches.css';

const Matches = () => {
  const { isAmbassador, isBrand } = useAuth();
  const [matches, setMatches] = useState([]);
  const [likes, setLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('matches');
  const [bookingAmbassador, setBookingAmbassador] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const matchesResponse = await matchAPI.getMatches();
      setMatches(matchesResponse.data.matches);

      if (isAmbassador) {
        const likesResponse = await likeAPI.getReceivedLikes();
        setLikes(likesResponse.data.likes);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleAcceptRequest = async (brandId) => {
    try {
      await matchAPI.createMatch(brandId);
      // Refresh data
      await fetchData();
      setActiveTab('matches');
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
      };

      await bookingAPI.createBooking(bookingPayload);

      // Send a message in the chat with booking details
      const bookingMessage = `📅 New Booking Request

Event: ${bookingData.eventName}
Date: ${new Date(bookingData.eventDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Time: ${formatTime(bookingData.startTime)} - ${formatTime(bookingData.endTime)} CST (${bookingData.duration} hours)
Location: ${bookingData.eventLocation}${bookingData.notes ? `\nNotes: ${bookingData.notes}` : ''}

Rate: $${bookingData.hourlyRate}/hour
Total Cost: $${bookingData.estimatedCost.toFixed(2)}

Status: Pending confirmation`;

      await messageAPI.createMessage(match.match_id, bookingMessage);

      // Close modal and show success
      setBookingAmbassador(null);
      alert('Booking request sent successfully! The ambassador will be notified.');

      // Optionally navigate to the chat
      // navigate(`/chat/${match.match_id}`);
    } catch (error) {
      console.error('Failed to create booking:', error);
      alert('Failed to create booking. Please try again.');
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
    <div className="matches-container container">
      <div className="matches-header">
        <h1>Connections</h1>

        {isAmbassador && (
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'matches' ? 'active' : ''}`}
              onClick={() => setActiveTab('matches')}
            >
              Partnerships ({matches.length})
            </button>
            <button
              className={`tab ${activeTab === 'likes' ? 'active' : ''}`}
              onClick={() => setActiveTab('likes')}
            >
              Requests ({likes.length})
            </button>
          </div>
        )}
      </div>

      {/* Requests Tab (Ambassadors only) */}
      {isAmbassador && activeTab === 'likes' && (
        <div className="likes-section">
          {likes.length === 0 ? (
            <div className="empty-state">
              <p>No partnership requests yet. Brands will discover you soon!</p>
            </div>
          ) : (
            <div className="likes-grid">
              {likes.map((like) => (
                <div key={like.id} className="like-card">
                  <img
                    src={like.profile_photo ? getPhotoUrl(like.profile_photo) : 'https://via.placeholder.com/200'}
                    alt={like.name}
                    className="like-photo"
                  />
                  <div className="like-info">
                    <h3>{like.name}</h3>
                    {like.location && <p className="like-location">{like.location}</p>}
                    {like.bio && <p className="like-bio">{like.bio}</p>}
                    {like.skills && like.skills.length > 0 && (
                      <div className="like-skills">
                        {like.skills.slice(0, 3).map((skill, index) => (
                          <span key={index} className="skill-tag-small">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
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
          )}
        </div>
      )}

      {/* Matches Tab */}
      {activeTab === 'matches' && (
        <div className="matches-section">
          {matches.length === 0 ? (
            <div className="empty-state">
              <p>
                {isAmbassador
                  ? 'No partnerships yet. Accept requests from brands to start messaging!'
                  : 'No partnerships yet. Request to work with ambassadors to get started!'}
              </p>
            </div>
          ) : (
            <div className="matches-grid">
              {matches.map((match) => (
                <div key={match.match_id} className="match-card">
                  <img
                    src={match.profile_photo ? getPhotoUrl(match.profile_photo) : 'https://via.placeholder.com/200'}
                    alt={match.name}
                    className="match-photo"
                  />
                  <div className="match-info">
                    <h3>{match.name}</h3>
                    {match.location && <p className="match-location">{match.location}</p>}
                    {match.last_message && (
                      <p className="last-message">{match.last_message}</p>
                    )}
                  </div>
                  <div className="match-actions">
                    <button
                      className="message-button"
                      onClick={() => handleChatClick(match.match_id)}
                    >
                      Message
                    </button>
                    {isBrand && (
                      <button
                        className="book-button-small"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Transform match object to ambassador format for BookingModal
                          setBookingAmbassador({
                            id: match.user_id,
                            name: match.name,
                            hourly_rate: match.hourly_rate,
                            profile_photo: match.profile_photo,
                          });
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
        </div>
      )}

      {/* Booking Modal */}
      {bookingAmbassador && (
        <BookingModal
          ambassador={bookingAmbassador}
          onClose={() => setBookingAmbassador(null)}
          onSubmit={handleBookingSubmit}
        />
      )}
    </div>
  );
};

export default Matches;
