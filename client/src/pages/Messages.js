import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { matchAPI } from '../services/api';
import { getPhotoUrl } from '../services/upload';
import DisplayName from '../components/DisplayName';
import './Messages.css';

const Messages = () => {
  const { demoMode } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await matchAPI.getMatches();
        setConversations(response.data.matches);
      } catch (error) {
        console.error('Failed to fetch conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  const handleConversationClick = (matchId) => {
    navigate(`/chat/${matchId}`);
  };

  const truncateMessage = (message, maxLength = 80) => {
    if (!message) return 'No messages yet';
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="messages-container">
        <div className="loading">Loading conversations...</div>
      </div>
    );
  }

  return (
    <div className="messages-container container">
      <div className="messages-header">
        <h1>Messages</h1>
        <p className="messages-subtitle">
          {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
        </p>
      </div>

      {conversations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <h2>No conversations yet</h2>
          <p>
            Start connecting with people to begin messaging. Check out your matches to
            see your connections.
          </p>
        </div>
      ) : (
        <div className="conversations-list">
          {conversations.map((conversation) => (
            <div
              key={conversation.match_id}
              className="conversation-row"
              onClick={() => handleConversationClick(conversation.match_id)}
            >
              <div className="conversation-photo">
                {(conversation.am_profile_photo || conversation.profile_photo) ? (
                  <img
                    src={getPhotoUrl(conversation.am_profile_photo || conversation.profile_photo)}
                    alt={conversation.am_name || conversation.name}
                  />
                ) : (
                  <div className="photo-placeholder">
                    {(conversation.am_name || conversation.name).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="conversation-details">
                <div className="conversation-header">
                  <h3 className="conversation-name">
                    {conversation.am_name ? (
                      <>{conversation.am_name}: {conversation.company_name || conversation.name}</>
                    ) : (
                      <DisplayName user={conversation} demoMode={demoMode} />
                    )}
                  </h3>
                  {conversation.location && (
                    <span className="conversation-location">
                      {conversation.location}
                    </span>
                  )}
                </div>
                <p className="conversation-preview">
                  {truncateMessage(conversation.last_message)}
                </p>
              </div>

              <div className="conversation-arrow">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7.5 15L12.5 10L7.5 5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Messages;
