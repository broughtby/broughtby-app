import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { messageAPI, matchAPI, bookingAPI, engagementAPI } from '../services/api';
import socketService from '../services/socket';
import DisplayName from '../components/DisplayName';
import BookingModal from '../components/BookingModal';
import EngagementModal from '../components/EngagementModal';
import './Chat.css';

const Chat = () => {
  const { matchId } = useParams();
  const { user, demoMode, isBrand } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [matchData, setMatchData] = useState(null);
  const [bookingAmbassador, setBookingAmbassador] = useState(null);
  const [showBookingSuccess, setShowBookingSuccess] = useState(false);
  const [bookingAutoConfirmed, setBookingAutoConfirmed] = useState(false);
  const [engagementAccountManager, setEngagementAccountManager] = useState(null);
  const [showEngagementSuccess, setShowEngagementSuccess] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await messageAPI.getMessages(matchId);
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      if (error.response?.status === 403) {
        navigate('/matches');
      }
    } finally {
      setLoading(false);
    }
  }, [matchId, navigate]);

  const fetchMatchData = useCallback(async () => {
    try {
      const response = await matchAPI.getMatches();
      const match = response.data.matches.find(m => m.match_id === parseInt(matchId));
      setMatchData(match);
    } catch (error) {
      console.error('Failed to fetch match data:', error);
    }
  }, [matchId]);

  useEffect(() => {
    console.log('🔧 Setting up Chat component for match:', matchId);
    fetchMessages();
    fetchMatchData();
    socketService.joinMatch(matchId);

    // Set up socket listeners
    console.log('🎧 Setting up socket listeners...');
    socketService.onNewMessage(handleNewMessage);
    socketService.onUserTyping(handleUserTyping);
    socketService.onUserStopTyping(handleUserStopTyping);
    console.log('✓ Socket listeners configured');

    return () => {
      console.log('🔌 Cleaning up socket listeners for match:', matchId);
      socketService.leaveMatch(matchId);
      socketService.removeAllListeners();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, fetchMessages, fetchMatchData]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleNewMessage = (message) => {
    setMessages((prev) => [...prev, message]);
  };

  const handleUserTyping = (data) => {
    console.log('🔔 Received user_typing event:', data);
    console.log('   Current user ID:', user.id);
    console.log('   Typing user ID:', data.userId);

    // Only show typing indicator if it's the other person typing, not us
    if (data.userId !== user.id) {
      console.log('✓ Showing typing indicator');
      setIsTyping(true);
    } else {
      console.log('✗ Not showing typing indicator (same user)');
    }
  };

  const handleUserStopTyping = (data) => {
    console.log('🔔 Received user_stop_typing event:', data);

    // Only hide typing indicator if it's the other person who stopped typing
    if (data.userId !== user.id) {
      console.log('✓ Hiding typing indicator');
      setIsTyping(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);

    // Send typing indicator
    socketService.typing(matchId);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      socketService.stopTyping(matchId);
    }, 1000);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Stop typing indicator
    socketService.stopTyping(matchId);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      // Send via socket for real-time delivery
      socketService.sendMessage(matchId, messageContent);
    } catch (error) {
      console.error('Failed to send message:', error);
      setNewMessage(messageContent); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  // Format time from 24-hour to 12-hour format with AM/PM
  const formatTime24to12 = (time24) => {
    if (!time24) return '';

    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;

    return `${hour12}:${minutes} ${ampm}`;
  };

  // Parse date string as local date (not UTC) to prevent timezone shifting
  const parseLocalDate = (dateString) => {
    if (!dateString) {
      console.error('parseLocalDate: No date string provided');
      return new Date();
    }

    const dateOnly = dateString.split('T')[0];
    const [year, month, day] = dateOnly.split('-').map(Number);

    if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
      console.error('parseLocalDate: Invalid date string:', dateString);
      return new Date();
    }

    return new Date(year, month - 1, day);
  };

  const handleBookingSubmit = async (bookingData) => {
    try {
      if (!matchData) {
        alert('Error: Could not find match. Please try again.');
        return;
      }

      // Create booking in database
      const bookingPayload = {
        matchId: parseInt(matchId),
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

      const response = await bookingAPI.createBooking(bookingPayload);
      const isAutoConfirmed = response.data.autoConfirmed || false;

      // Send a message in the chat with booking details
      const bookingMessage = `📅 ${isAutoConfirmed ? 'Booking Confirmed!' : 'New Booking Request'}

Event: ${bookingData.eventName}
Date: ${parseLocalDate(bookingData.eventDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Time: ${formatTime24to12(bookingData.startTime)} - ${formatTime24to12(bookingData.endTime)} CST (${bookingData.duration} hours)
Location: ${bookingData.eventLocation}${bookingData.notes ? `\nNotes: ${bookingData.notes}` : ''}

Rate: $${bookingData.hourlyRate}/hour
Total Cost: $${bookingData.estimatedCost.toFixed(2)}

Status: ${isAutoConfirmed ? '✅ Confirmed' : 'Pending confirmation'}`;

      // Send via socket for real-time delivery
      socketService.sendMessage(parseInt(matchId), bookingMessage);

      // Close modal and show success
      setBookingAmbassador(null);
      setBookingAutoConfirmed(isAutoConfirmed);
      setShowBookingSuccess(true);
    } catch (error) {
      console.error('Failed to create booking:', error);

      const errorMessage = error.response?.data?.error || 'Failed to create booking. Please try again.';
      alert(errorMessage);
    }
  };

  const handleEngagementSubmit = async (engagementData) => {
    try {
      if (!matchData) {
        alert('Error: Could not find match. Please try again.');
        return;
      }

      // Create engagement in database
      const engagementPayload = {
        matchId: parseInt(matchId),
        accountManagerId: engagementData.accountManagerId,
        monthlyRate: engagementData.monthlyRate,
        startDate: engagementData.startDate,
        endDate: engagementData.endDate,
        notes: engagementData.notes,
      };

      await engagementAPI.createEngagement(engagementPayload);

      // Send a message in the chat with engagement details
      const engagementMessage = `💼 New Engagement Request

Monthly Retainer: $${engagementData.monthlyRate.toLocaleString()}/month
Start Date: ${new Date(engagementData.startDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}${engagementData.endDate ? `\nEnd Date: ${new Date(engagementData.endDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}` : ''}
${engagementData.notes ? `\nScope of Work: ${engagementData.notes}` : ''}

Status: Pending your acceptance`;

      // Send via socket for real-time delivery
      socketService.sendMessage(parseInt(matchId), engagementMessage);

      // Close modal and show success
      setEngagementAccountManager(null);
      setShowEngagementSuccess(true);
    } catch (error) {
      console.error('Failed to create engagement:', error);

      const errorMessage = error.response?.data?.error || 'Failed to create engagement. Please try again.';
      alert(errorMessage);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="chat-container">
        <div className="loading">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <button className="back-button" onClick={() => navigate('/matches')}>
          ← Back
        </button>
        <h2>Chat</h2>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isMine = message.sender_id === user.id;
              const isFirstMessage = index === 0;

              return (
                <div
                  key={message.id}
                  className={`message ${isMine ? 'mine' : 'theirs'}`}
                >
                  {!isMine && message.sender_photo && (
                    <img
                      src={message.sender_photo}
                      alt={message.sender_name}
                      className="message-avatar"
                    />
                  )}
                  <div className="message-content">
                    {!isMine && message.sender_name && (
                      <p className="message-sender">
                        <DisplayName
                          user={{ id: message.sender_id, name: message.sender_name, is_test: message.is_test }}
                          demoMode={demoMode}
                        />
                      </p>
                    )}
                    <div className="message-bubble">
                      <p>{message.content}</p>
                    </div>
                    <p className="message-time">{formatTime(message.created_at)}</p>
                    {isFirstMessage && (
                      <p className="auto-message-label">Sent automatically when matched</p>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}

        {isTyping && (
          <div className="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}

        {/* Debug indicator */}
        {isTyping && console.log('💬 Rendering typing indicator - isTyping:', isTyping)}
      </div>

      {/* Action Bar - Only show for brands */}
      {isBrand && matchData && (
        <div className="chat-action-bar">
          <button
            className="action-bar-button book-button"
            onClick={() => {
              if (matchData.role === 'account_manager') {
                setEngagementAccountManager({
                  id: matchData.user_id,
                  name: matchData.name,
                  monthly_rate: matchData.monthly_rate,
                  profile_photo: matchData.profile_photo,
                  location: matchData.location,
                });
              } else {
                setBookingAmbassador({
                  id: matchData.user_id,
                  name: matchData.name,
                  hourly_rate: matchData.hourly_rate,
                  profile_photo: matchData.profile_photo,
                  is_test: matchData.is_test,
                });
              }
            }}
          >
            <span className="action-icon">📅</span>
            Book Now
          </button>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="message-form">
        <input
          type="text"
          value={newMessage}
          onChange={handleInputChange}
          placeholder="Type a message..."
          className="message-input"
          disabled={sending}
        />
        <button
          type="submit"
          className="send-button"
          disabled={!newMessage.trim() || sending}
        >
          Send
        </button>
      </form>

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
                Stay in Chat
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
              Your engagement request has been sent and is pending acceptance from the account manager. You can track the status in your My Team page.
            </p>
            <div className="booking-success-actions">
              <button
                className="view-calendar-button"
                onClick={() => {
                  setShowEngagementSuccess(false);
                  navigate('/my-team');
                }}
              >
                View My Team
              </button>
              <button
                className="dismiss-button"
                onClick={() => setShowEngagementSuccess(false)}
              >
                Stay in Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
