import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Matches from './Matches';
import Messages from './Messages';
import './Connections.css';

const Connections = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab from URL path
  const getActiveTabFromPath = () => {
    if (location.pathname.includes('/connections/messages')) {
      return 'messages';
    }
    return 'matches'; // default to matches
  };

  const [activeTab, setActiveTab] = useState(getActiveTabFromPath());

  // Update active tab when URL changes
  useEffect(() => {
    setActiveTab(getActiveTabFromPath());
  }, [location.pathname]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Update URL without full page reload
    navigate(`/connections/${tab}`, { replace: true });
  };

  return (
    <div className="connections-page">
      <div className="connections-header">
        <h1>Connections</h1>
        <div className="connections-tabs">
          <button
            className={`tab-button ${activeTab === 'matches' ? 'active' : ''}`}
            onClick={() => handleTabChange('matches')}
          >
            Matches
          </button>
          <button
            className={`tab-button ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => handleTabChange('messages')}
          >
            Messages
          </button>
        </div>
      </div>

      <div className="connections-content">
        {activeTab === 'matches' ? <Matches /> : <Messages />}
      </div>
    </div>
  );
};

export default Connections;
