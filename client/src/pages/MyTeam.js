import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { engagementAPI } from '../services/api';
import { getPhotoUrl } from '../services/upload';
import DisplayName from '../components/DisplayName';
import './MyTeam.css';

const MyTeam = () => {
  const { user, demoMode } = useAuth();
  const [engagements, setEngagements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEngagement, setSelectedEngagement] = useState(null);
  const [showEndModal, setShowEndModal] = useState(false);
  const [endDate, setEndDate] = useState('');

  const isBrand = user?.role === 'brand';
  const isAccountManager = user?.role === 'account_manager';

  useEffect(() => {
    fetchEngagements();
  }, []);

  const fetchEngagements = async () => {
    try {
      setLoading(true);
      const response = await engagementAPI.getEngagements();
      setEngagements(response.data.engagements || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load engagements');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptEngagement = async (engagementId) => {
    try {
      await engagementAPI.updateEngagementStatus(engagementId, 'active');
      fetchEngagements();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to accept engagement');
    }
  };

  const handleDeclineEngagement = async (engagementId) => {
    try {
      await engagementAPI.updateEngagementStatus(engagementId, 'declined');
      fetchEngagements();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to decline engagement');
    }
  };

  const handlePauseEngagement = async (engagementId) => {
    try {
      await engagementAPI.updateEngagementStatus(engagementId, 'paused');
      fetchEngagements();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to pause engagement');
    }
  };

  const handleResumeEngagement = async (engagementId) => {
    try {
      await engagementAPI.updateEngagementStatus(engagementId, 'active');
      fetchEngagements();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resume engagement');
    }
  };

  const handleEndEngagement = async () => {
    if (!selectedEngagement || !endDate) return;

    try {
      await engagementAPI.endEngagement(selectedEngagement.id, endDate);
      setShowEndModal(false);
      setSelectedEngagement(null);
      setEndDate('');
      fetchEngagements();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to end engagement');
    }
  };

  const openEndModal = (engagement) => {
    setSelectedEngagement(engagement);
    setShowEndModal(true);
    // Default to today's date
    setEndDate(new Date().toISOString().split('T')[0]);
  };

  const closeEndModal = () => {
    setShowEndModal(false);
    setSelectedEngagement(null);
    setEndDate('');
  };

  const groupEngagementsByStatus = () => {
    const pending = engagements.filter(e => e.status === 'pending');
    const active = engagements.filter(e => e.status === 'active');
    const paused = engagements.filter(e => e.status === 'paused');
    const ended = engagements.filter(e => e.status === 'ended' || e.status === 'declined');

    return { pending, active, paused, ended };
  };

  const renderEngagementCard = (engagement) => {
    const partner = isBrand ? {
      id: engagement.account_manager_id,
      name: engagement.account_manager_name,
      photo: engagement.account_manager_photo,
      location: engagement.account_manager_location,
    } : {
      id: engagement.brand_id,
      name: engagement.brand_name,
      photo: engagement.brand_photo,
      location: engagement.brand_location,
    };

    const isPending = engagement.status === 'pending';
    const isActive = engagement.status === 'active';
    const isPaused = engagement.status === 'paused';
    const isEnded = engagement.status === 'ended' || engagement.status === 'declined';

    return (
      <div key={engagement.id} className={`engagement-card ${engagement.status}`}>
        <div className="engagement-header">
          <img
            src={partner.photo ? getPhotoUrl(partner.photo) : 'https://via.placeholder.com/60'}
            alt={partner.name}
            className="partner-photo"
          />
          <div className="partner-info">
            <h3>
              <DisplayName
                user={partner}
                name={partner.name}
                demoMode={demoMode}
              />
            </h3>
            {partner.location && <p className="location">{partner.location}</p>}
          </div>
          <div className="engagement-status-badge">
            {engagement.status}
          </div>
        </div>

        <div className="engagement-details">
          <div className="detail-row">
            <span className="label">Monthly Rate:</span>
            <span className="value">${parseFloat(engagement.monthly_rate).toLocaleString()}/month</span>
          </div>
          <div className="detail-row">
            <span className="label">Start Date:</span>
            <span className="value">{new Date(engagement.start_date).toLocaleDateString()}</span>
          </div>
          {engagement.end_date && (
            <div className="detail-row">
              <span className="label">End Date:</span>
              <span className="value">{new Date(engagement.end_date).toLocaleDateString()}</span>
            </div>
          )}
          {engagement.notes && (
            <div className="detail-row notes">
              <span className="label">Scope:</span>
              <p className="value">{engagement.notes}</p>
            </div>
          )}
        </div>

        <div className="engagement-actions">
          {/* Account Manager actions on pending */}
          {isAccountManager && isPending && (
            <>
              <button
                onClick={() => handleAcceptEngagement(engagement.id)}
                className="btn-accept"
              >
                Accept
              </button>
              <button
                onClick={() => handleDeclineEngagement(engagement.id)}
                className="btn-decline"
              >
                Decline
              </button>
            </>
          )}

          {/* Brand actions on pending */}
          {isBrand && isPending && (
            <p className="pending-note">Awaiting account manager acceptance</p>
          )}

          {/* Active engagement actions */}
          {isActive && (
            <>
              <button
                onClick={() => handlePauseEngagement(engagement.id)}
                className="btn-secondary"
              >
                Pause
              </button>
              <button
                onClick={() => openEndModal(engagement)}
                className="btn-end"
              >
                End Engagement
              </button>
            </>
          )}

          {/* Paused engagement actions */}
          {isPaused && (
            <>
              <button
                onClick={() => handleResumeEngagement(engagement.id)}
                className="btn-primary"
              >
                Resume
              </button>
              <button
                onClick={() => openEndModal(engagement)}
                className="btn-end"
              >
                End Engagement
              </button>
            </>
          )}

          {/* No actions for ended engagements */}
          {isEnded && (
            <p className="ended-note">
              {engagement.status === 'declined' ? 'Declined' : 'Engagement ended'}
            </p>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="my-team-page">
        <div className="loading">Loading your team...</div>
      </div>
    );
  }

  const { pending, active, paused, ended } = groupEngagementsByStatus();

  return (
    <div className="my-team-page">
      <div className="page-header">
        <h1>My Team</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {engagements.length === 0 && !isBrand ? (
        // Account Manager with no engagements
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <h2>No client engagements yet</h2>
          <p>When brands hire you, your client engagements will appear here.</p>
        </div>
      ) : (
        <>
          {/* Show empty state for Account Managers if no engagements */}
          {engagements.length === 0 && isBrand && (
            <div className="empty-sections">
              <div className="empty-state">
                <div className="empty-icon">👔</div>
                <h2>Account Managers</h2>
                <p>No account managers hired yet</p>
              </div>
              <div className="empty-state">
                <div className="empty-icon">⭐</div>
                <h2>Your Crew</h2>
                <p>When you find brand ambassadors that you love and want to rebook, add them to Your Crew (Coming Soon)</p>
              </div>
            </div>
          )}

          {/* Account Managers section (when there are engagements) */}
          {engagements.length > 0 && isBrand && (
            <div className="team-section">
              <h2 className="section-title">
                Account Managers
              </h2>
            </div>
          )}

          {/* Pending Engagements */}
          {pending.length > 0 && (
            <div className="engagement-section">
              <h2 className="section-title">
                Pending {isAccountManager ? 'Requests' : 'Engagements'}
                <span className="count">{pending.length}</span>
              </h2>
              <div className="engagement-list">
                {pending.map(renderEngagementCard)}
              </div>
            </div>
          )}

          {/* Active Engagements */}
          {active.length > 0 && (
            <div className="engagement-section">
              <h2 className="section-title">
                Active Engagements
                <span className="count">{active.length}</span>
              </h2>
              <div className="engagement-list">
                {active.map(renderEngagementCard)}
              </div>
            </div>
          )}

          {/* Paused Engagements */}
          {paused.length > 0 && (
            <div className="engagement-section">
              <h2 className="section-title">
                Paused Engagements
                <span className="count">{paused.length}</span>
              </h2>
              <div className="engagement-list">
                {paused.map(renderEngagementCard)}
              </div>
            </div>
          )}

          {/* Ended Engagements */}
          {ended.length > 0 && (
            <div className="engagement-section">
              <h2 className="section-title">
                Past Engagements
                <span className="count">{ended.length}</span>
              </h2>
              <div className="engagement-list">
                {ended.map(renderEngagementCard)}
              </div>
            </div>
          )}

          {/* Always show Your Crew empty state for brands */}
          {isBrand && engagements.length > 0 && (
            <div className="empty-state" style={{ marginTop: '3rem' }}>
              <div className="empty-icon">⭐</div>
              <h2>Your Crew</h2>
              <p>When you find brand ambassadors that you love and want to rebook, add them to Your Crew (Coming Soon)</p>
            </div>
          )}
        </>
      )}

      {/* End Engagement Modal */}
      {showEndModal && (
        <div className="modal-overlay" onClick={closeEndModal}>
          <div className="modal-content end-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeEndModal}>×</button>
            <h2>End Engagement</h2>
            <p>Select the end date for this engagement:</p>

            <div className="form-group">
              <label htmlFor="endDate">End Date</label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={selectedEngagement?.start_date?.split('T')[0]}
                max={new Date().toISOString().split('T')[0]}
              />
              <span className="helper-text">
                End date must be between the start date and today.
              </span>
            </div>

            <div className="modal-actions">
              <button onClick={closeEndModal} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleEndEngagement}
                className="btn-primary"
                disabled={!endDate}
              >
                End Engagement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTeam;
