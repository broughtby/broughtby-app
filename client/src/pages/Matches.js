import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { matchAPI, likeAPI } from '../services/api';
import { getPhotoUrl } from '../services/upload';
import './Matches.css';

const Matches = () => {
  const { isAmbassador } = useAuth();
  const [matches, setMatches] = useState([]);
  const [likes, setLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('matches');
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
                <div
                  key={match.match_id}
                  className="match-card"
                  onClick={() => handleChatClick(match.match_id)}
                >
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
                  <div className="match-arrow">→</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Matches;
