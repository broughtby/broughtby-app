import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { messageAPI } from '../services/api';
import socketService from '../services/socket';
import './Chat.css';

const Chat = () => {
  const { matchId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    socketService.joinMatch(matchId);

    // Set up socket listeners
    socketService.onNewMessage(handleNewMessage);
    socketService.onUserTyping(handleUserTyping);
    socketService.onUserStopTyping(handleUserStopTyping);

    return () => {
      socketService.leaveMatch(matchId);
      socketService.removeAllListeners();
    };
  }, [matchId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
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
  };

  const handleNewMessage = (message) => {
    setMessages((prev) => [...prev, message]);
  };

  const handleUserTyping = () => {
    setIsTyping(true);
  };

  const handleUserStopTyping = () => {
    setIsTyping(false);
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
            {messages.map((message) => {
              const isMine = message.sender_id === user.id;

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
                      <p className="message-sender">{message.sender_name}</p>
                    )}
                    <div className="message-bubble">
                      <p>{message.content}</p>
                    </div>
                    <p className="message-time">{formatTime(message.created_at)}</p>
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
      </div>

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
    </div>
  );
};

export default Chat;
