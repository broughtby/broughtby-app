import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI, likeAPI, reviewAPI } from '../services/api';
import { getPhotoUrl } from '../services/upload';
import DisplayName from '../components/DisplayName';
import DisplayRate from '../components/DisplayRate';
import ReviewsList from '../components/ReviewsList';
import './Discover.css';

const Discover = () => {
  const { isBrand, isAmbassador, demoMode } = useAuth();
  const [ambassadors, setAmbassadors] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [liking, setLiking] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [selectedAmbassador, setSelectedAmbassador] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [filteredAmbassadors, setFilteredAmbassadors] = useState([]);
  const [selectedAmbassadorReviews, setSelectedAmbassadorReviews] = useState([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showMobileReviews, setShowMobileReviews] = useState(false);
  const [mobileReviewsAmbassador, setMobileReviewsAmbassador] = useState(null);

  useEffect(() => {
    if (isBrand || isAmbassador) {
      fetchAmbassadors();
    }
  }, [isBrand, isAmbassador]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filter ambassadors by location
  useEffect(() => {
    if (selectedLocation === 'all') {
      setFilteredAmbassadors(ambassadors);
    } else {
      setFilteredAmbassadors(
        ambassadors.filter(ambassador => ambassador.location === selectedLocation)
      );
    }
    // Reset to first card when filter changes
    setCurrentIndex(0);
  }, [selectedLocation, ambassadors]);

  const fetchAmbassadors = async () => {
    try {
      const response = await userAPI.getAmbassadors();
      setAmbassadors(response.data.ambassadors);
    } catch (error) {
      console.error('Failed to fetch ambassadors:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAmbassadorReviews = async (ambassadorId) => {
    setLoadingReviews(true);
    try {
      const response = await reviewAPI.getUserReviews(ambassadorId);
      setSelectedAmbassadorReviews(response.data.reviews);
      setReviewCount(response.data.reviewCount);
      setAverageRating(response.data.averageRating);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      setSelectedAmbassadorReviews([]);
      setReviewCount(0);
      setAverageRating(0);
    } finally {
      setLoadingReviews(false);
    }
  };

  // Fetch reviews when an ambassador is selected
  useEffect(() => {
    if (selectedAmbassador) {
      fetchAmbassadorReviews(selectedAmbassador.id);
    }
  }, [selectedAmbassador]);

  // Fetch reviews for mobile bottom sheet
  useEffect(() => {
    if (mobileReviewsAmbassador) {
      fetchAmbassadorReviews(mobileReviewsAmbassador.id);
    }
  }, [mobileReviewsAmbassador]);

  // Handle opening mobile reviews bottom sheet
  const handleOpenMobileReviews = (ambassador) => {
    setMobileReviewsAmbassador(ambassador);
    setShowMobileReviews(true);
  };

  // Handle closing mobile reviews bottom sheet
  const handleCloseMobileReviews = () => {
    setShowMobileReviews(false);
    setTimeout(() => {
      setMobileReviewsAmbassador(null);
    }, 300); // Wait for animation to complete
  };

  // Get unique locations from ambassadors
  const getUniqueLocations = () => {
    const locations = ambassadors
      .map(ambassador => ambassador.location)
      .filter(location => location); // Remove null/undefined
    return [...new Set(locations)].sort();
  };

  const handleLike = async () => {
    if (liking || filteredAmbassadors.length === 0) return;

    const currentAmbassador = filteredAmbassadors[currentIndex % filteredAmbassadors.length];

    // Don't allow liking if already matched
    if (currentAmbassador.status === 'matched') return;

    setLiking(true);
    setSwipeDirection('right');

    try {
      // Only send like request if not already liked
      if (currentAmbassador.status === 'available') {
        await likeAPI.createLike(currentAmbassador.id);

        // Update local state to reflect new status - update by ID to handle filtered arrays
        const updatedAmbassadors = ambassadors.map(a =>
          a.id === currentAmbassador.id ? { ...a, status: 'pending' } : a
        );
        setAmbassadors(updatedAmbassadors);
      }

      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
        setSwipeDirection(null);
        setLiking(false);
      }, 300);
    } catch (error) {
      console.error('Failed to like ambassador:', error);
      setSwipeDirection(null);
      setLiking(false);
    }
  };

  const handleNext = () => {
    if (filteredAmbassadors.length === 0) return;

    setSwipeDirection('right');

    setTimeout(() => {
      setCurrentIndex(currentIndex + 1);
      setSwipeDirection(null);
    }, 300);
  };

  const handlePrevious = () => {
    if (filteredAmbassadors.length === 0) return;

    setSwipeDirection('left');

    setTimeout(() => {
      // Go to previous, but handle wrapping (allow cycling through)
      setCurrentIndex(currentIndex - 1 < 0 ? filteredAmbassadors.length - 1 : currentIndex - 1);
      setSwipeDirection(null);
    }, 300);
  };

  const handleDemoAccept = async (ambassadorId) => {
    try {
      await likeAPI.demoAcceptLike(ambassadorId);

      // Update local state to reflect match status
      const updatedAmbassadors = ambassadors.map(a =>
        a.id === ambassadorId ? { ...a, status: 'matched' } : a
      );
      setAmbassadors(updatedAmbassadors);
    } catch (error) {
      console.error('Failed to demo accept:', error);
      alert('Failed to accept request. Make sure this is a test account.');
    }
  };

  if (loading) {
    return (
      <div className="discover-container">
        <div className="loading">Loading ambassadors...</div>
      </div>
    );
  }

  // For ambassadors, show gallery view
  if (isAmbassador) {
    return (
      <div className="discover-container community-view">
        <div className="discover-header">
          <h1>Community</h1>
          <p className="community-subtitle">
            Explore fellow brand ambassadors and discover the community
          </p>
          <span className="view-only-badge">View Only</span>
        </div>

        {ambassadors.length === 0 ? (
          <div className="message-card">
            <h2>No Ambassadors Yet</h2>
            <p>Check back later to explore the community!</p>
          </div>
        ) : (
          <>
            <div className="ambassadors-grid">
              {ambassadors.map((ambassador) => (
                <div
                  key={ambassador.id}
                  className="ambassador-grid-card"
                  onClick={() => setSelectedAmbassador(ambassador)}
                >
                  <div className="grid-card-image">
                    <img
                      src={ambassador.profile_photo ? getPhotoUrl(ambassador.profile_photo) : 'https://via.placeholder.com/400'}
                      alt={ambassador.name}
                    />
                    <div className="grid-card-overlay">
                      <h3><DisplayName user={ambassador} demoMode={demoMode} /></h3>
                      {ambassador.location && <p>{ambassador.location}</p>}
                    </div>
                  </div>
                  <div className="grid-card-content">
                    <div className="grid-card-info">
                      {ambassador.age && <span className="info-item">Age {ambassador.age}</span>}
                      {ambassador.rating && (
                        <span className="info-item rating">
                          {ambassador.rating} ⭐
                        </span>
                      )}
                    </div>
                    {ambassador.skills && ambassador.skills.length > 0 && (
                      <div className="grid-card-skills">
                        {ambassador.skills.slice(0, 3).map((skill, index) => (
                          <span key={index} className="skill-badge">
                            {skill}
                          </span>
                        ))}
                        {ambassador.skills.length > 3 && (
                          <span className="skill-badge more">
                            +{ambassador.skills.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Profile Modal */}
            {selectedAmbassador && (
              <div className="profile-modal" onClick={() => setSelectedAmbassador(null)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <button className="modal-close" onClick={() => setSelectedAmbassador(null)}>
                    ×
                  </button>
                  <div className="modal-image">
                    <img
                      src={selectedAmbassador.profile_photo ? getPhotoUrl(selectedAmbassador.profile_photo) : 'https://via.placeholder.com/600'}
                      alt={selectedAmbassador.name}
                    />
                  </div>
                  <div className="modal-body">
                    <h2><DisplayName user={selectedAmbassador} demoMode={demoMode} /></h2>
                    {selectedAmbassador.location && (
                      <p className="modal-location">{selectedAmbassador.location}</p>
                    )}

                    {selectedAmbassador.bio && (
                      <div className="modal-section">
                        <h3>About</h3>
                        <p>{selectedAmbassador.bio}</p>
                      </div>
                    )}

                    {selectedAmbassador.skills && selectedAmbassador.skills.length > 0 && (
                      <div className="modal-section">
                        <h3>Skills</h3>
                        <div className="skills-list">
                          {selectedAmbassador.skills.map((skill, index) => (
                            <span key={index} className="skill-tag">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="modal-stats">
                      <div className="stat">
                        <span className="stat-label">Age</span>
                        <span className="stat-value">{selectedAmbassador.age || 'N/A'}</span>
                      </div>
                      <div className="stat">
                        <span className="stat-label">Availability</span>
                        <span className="stat-value">{selectedAmbassador.availability || 'N/A'}</span>
                      </div>
                      <div className="stat">
                        <span className="stat-label">Hourly Rate</span>
                        <span className="stat-value">
                          <DisplayRate user={selectedAmbassador} rate={selectedAmbassador.hourly_rate} demoMode={demoMode} suffix="/hr" />
                        </span>
                      </div>
                    </div>

                    {/* Reviews Section */}
                    <div className="modal-section">
                      <h3>Reviews</h3>
                      {loadingReviews ? (
                        <p className="loading-reviews">Loading reviews...</p>
                      ) : (
                        <ReviewsList
                          reviews={selectedAmbassadorReviews}
                          reviewCount={reviewCount}
                          averageRating={averageRating}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // For brands, check if there are any ambassadors at all
  if (ambassadors.length === 0) {
    return (
      <div className="discover-container">
        <div className="message-card">
          <h2>No Ambassadors Available</h2>
          <p>Check back later for brand ambassadors!</p>
        </div>
      </div>
    );
  }

  // Location Filter Component (for brands only)
  const LocationFilter = () => {
    const uniqueLocations = getUniqueLocations();

    return (
      <div className="location-filter">
        <label htmlFor="location-select" className="filter-label">
          <span className="filter-icon">📍</span>
          Location:
        </label>
        <select
          id="location-select"
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="location-select"
        >
          <option value="all">All Locations</option>
          {uniqueLocations.map(location => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </select>
        {selectedLocation !== 'all' && (
          <button
            className="clear-filter"
            onClick={() => setSelectedLocation('all')}
            title="Clear filter"
          >
            ✕
          </button>
        )}
      </div>
    );
  };

  // Check if filtered results are empty
  if (filteredAmbassadors.length === 0) {
    return (
      <div className="discover-container">
        <div className="discover-header">
          <h1>Discover Ambassadors</h1>
          <LocationFilter />
        </div>
        <div className="message-card">
          <h2>No Ambassadors Found</h2>
          <p>No ambassadors found in {selectedLocation}. Try selecting a different location.</p>
          <button
            className="action-button like"
            onClick={() => setSelectedLocation('all')}
            style={{ marginTop: '1rem' }}
          >
            View All Locations
          </button>
        </div>
      </div>
    );
  }

  // MOBILE VIEW: Swipeable card stack
  if (isMobile) {
    const currentAmbassador = filteredAmbassadors[currentIndex % filteredAmbassadors.length];
    const displayIndex = (currentIndex % filteredAmbassadors.length) + 1;

    return (
      <div className="discover-container">
        <div className="discover-header">
          <h1>Discover Ambassadors</h1>
          <LocationFilter />
          <p className="ambassador-count">
            {displayIndex} / {filteredAmbassadors.length}
          </p>
        </div>

        <div className="card-container-with-nav">
          {/* Navigation Arrows */}
          <button
            className="nav-arrow nav-arrow-left"
            onClick={handlePrevious}
            aria-label="Previous ambassador"
          >
            ‹
          </button>

          <div className={`card-stack ${swipeDirection ? `swipe-${swipeDirection}` : ''}`}>
            <div className="ambassador-card">
              <div className="card-image-container">
                <img
                  src={currentAmbassador.profile_photo ? getPhotoUrl(currentAmbassador.profile_photo) : 'https://via.placeholder.com/400'}
                  alt={currentAmbassador.name}
                  className="card-image"
                />
                <div className="card-overlay">
                  <h2 className="card-name"><DisplayName user={currentAmbassador} demoMode={demoMode} /></h2>
                  {currentAmbassador.location && (
                    <p className="card-location">{currentAmbassador.location}</p>
                  )}
                </div>
                {currentAmbassador.status && currentAmbassador.status !== 'available' && (
                  <div className={`status-badge status-${currentAmbassador.status}`}>
                    {currentAmbassador.status === 'matched' ? '✓ Matched' : currentAmbassador.status === 'pending' ? 'Request Pending' : 'Passed'}
                  </div>
                )}
              </div>

            <div className="card-content">
              {currentAmbassador.bio && (
                <div className="card-section">
                  <h3>About</h3>
                  <p>{currentAmbassador.bio}</p>
                </div>
              )}

              {currentAmbassador.skills && currentAmbassador.skills.length > 0 && (
                <div className="card-section">
                  <h3>Skills</h3>
                  <div className="skills-list">
                    {currentAmbassador.skills.map((skill, index) => (
                      <span key={index} className="skill-tag">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="card-stats">
                <div className="stat">
                  <span className="stat-label">Rate</span>
                  <span className="stat-value">
                    <DisplayRate user={currentAmbassador} rate={currentAmbassador.hourly_rate} demoMode={demoMode} />
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">Availability</span>
                  <span className="stat-value">{currentAmbassador.availability}</span>
                </div>
                <div
                  className="stat stat-clickable"
                  onClick={() => handleOpenMobileReviews(currentAmbassador)}
                  title="Tap to view reviews"
                >
                  <span className="stat-label">Rating</span>
                  <span className="stat-value">
                    {currentAmbassador.rating} ⭐
                    <span className="tap-indicator">›</span>
                  </span>
                  <span className="tap-hint">Tap to view</span>
                </div>
              </div>
            </div>
          </div>
          </div>

          <button
            className="nav-arrow nav-arrow-right"
            onClick={handleNext}
            aria-label="Next ambassador"
          >
            ›
          </button>
        </div>

        {currentAmbassador.status === 'matched' || currentAmbassador.status === 'pending' || currentAmbassador.status === 'passed' ? (
          <div className="action-buttons">
            {currentAmbassador.status === 'pending' && currentAmbassador.is_test && isBrand && (
              <button
                className="action-button demo-accept-button"
                onClick={() => handleDemoAccept(currentAmbassador.id)}
                style={{ marginBottom: '0.5rem', background: '#10B981', border: '2px solid #059669' }}
              >
                <span>⚡ Demo: Accept Now</span>
              </button>
            )}
            <button
              className="action-button next-button"
              onClick={handleNext}
            >
              <span>Next Ambassador</span>
              <span className="action-icon">→</span>
            </button>
          </div>
        ) : (
          <div className="action-buttons">
            <button
              className="action-button request-button"
              onClick={handleLike}
              disabled={liking}
            >
              <span>Request to Work Together</span>
            </button>
          </div>
        )}

        {/* Mobile Reviews Bottom Sheet */}
        {showMobileReviews && mobileReviewsAmbassador && (
          <div className="reviews-bottom-sheet-overlay" onClick={handleCloseMobileReviews}>
            <div
              className={`reviews-bottom-sheet ${showMobileReviews ? 'open' : ''}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bottom-sheet-header">
                <div className="bottom-sheet-handle"></div>
                <h3>
                  <DisplayName user={mobileReviewsAmbassador} demoMode={demoMode} />
                  's Reviews
                </h3>
                <button className="bottom-sheet-close" onClick={handleCloseMobileReviews}>
                  ×
                </button>
              </div>
              <div className="bottom-sheet-content">
                {loadingReviews ? (
                  <p className="loading-reviews">Loading reviews...</p>
                ) : (
                  <ReviewsList
                    reviews={selectedAmbassadorReviews}
                    reviewCount={reviewCount}
                    averageRating={averageRating}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // DESKTOP/TABLET VIEW: Gallery grid
  return (
    <div className="discover-container brand-grid-view">
      <div className="discover-header">
        <h1>Discover Ambassadors</h1>
        <p className="community-subtitle">
          Browse and connect with brand ambassadors
        </p>
        <LocationFilter />
      </div>

      <div className="ambassadors-grid">
        {filteredAmbassadors.map((ambassador) => (
          <div
            key={ambassador.id}
            className="ambassador-grid-card brand-card"
          >
            <div className="grid-card-image" onClick={() => setSelectedAmbassador(ambassador)}>
              <img
                src={ambassador.profile_photo ? getPhotoUrl(ambassador.profile_photo) : 'https://via.placeholder.com/400'}
                alt={ambassador.name}
              />
              {ambassador.status && ambassador.status !== 'available' && (
                <div className={`status-badge status-${ambassador.status}`}>
                  {ambassador.status === 'matched' ? '✓ Matched' : ambassador.status === 'pending' ? 'Request Pending' : 'Passed'}
                </div>
              )}
              <div className="grid-card-overlay">
                <h3><DisplayName user={ambassador} demoMode={demoMode} /></h3>
                {ambassador.location && <p>{ambassador.location}</p>}
              </div>
            </div>
            <div className="grid-card-content">
              <div className="grid-card-info">
                {ambassador.age && <span className="info-item">Age {ambassador.age}</span>}
                {ambassador.rating && (
                  <span className="info-item rating">
                    {ambassador.rating} ⭐
                  </span>
                )}
              </div>
              {ambassador.skills && ambassador.skills.length > 0 && (
                <div className="grid-card-skills">
                  {ambassador.skills.slice(0, 3).map((skill, index) => (
                    <span key={index} className="skill-badge">
                      {skill}
                    </span>
                  ))}
                  {ambassador.skills.length > 3 && (
                    <span className="skill-badge more">
                      +{ambassador.skills.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Profile Modal */}
      {selectedAmbassador && (
        <div className="profile-modal" onClick={() => setSelectedAmbassador(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedAmbassador(null)}>
              ×
            </button>
            <div className="modal-image">
              <img
                src={selectedAmbassador.profile_photo ? getPhotoUrl(selectedAmbassador.profile_photo) : 'https://via.placeholder.com/600'}
                alt={selectedAmbassador.name}
              />
              {selectedAmbassador.status && selectedAmbassador.status !== 'available' && (
                <div className={`status-badge status-${selectedAmbassador.status}`}>
                  {selectedAmbassador.status === 'matched' ? '✓ Matched' : selectedAmbassador.status === 'pending' ? 'Request Pending' : 'Passed'}
                </div>
              )}
            </div>
            <div className="modal-body">
              <h2><DisplayName user={selectedAmbassador} demoMode={demoMode} /></h2>
              {selectedAmbassador.location && (
                <p className="modal-location">{selectedAmbassador.location}</p>
              )}

              {selectedAmbassador.bio && (
                <div className="modal-section">
                  <h3>About</h3>
                  <p>{selectedAmbassador.bio}</p>
                </div>
              )}

              {selectedAmbassador.skills && selectedAmbassador.skills.length > 0 && (
                <div className="modal-section">
                  <h3>Skills</h3>
                  <div className="skills-list">
                    {selectedAmbassador.skills.map((skill, index) => (
                      <span key={index} className="skill-tag">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="modal-stats">
                <div className="stat">
                  <span className="stat-label">Age</span>
                  <span className="stat-value">{selectedAmbassador.age || 'N/A'}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Rate</span>
                  <span className="stat-value">
                    <DisplayRate user={selectedAmbassador} rate={selectedAmbassador.hourly_rate} demoMode={demoMode} />
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">Availability</span>
                  <span className="stat-value">{selectedAmbassador.availability}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Rating</span>
                  <span className="stat-value">{selectedAmbassador.rating} ⭐</span>
                </div>
              </div>

              {/* Reviews Section */}
              <div className="modal-section">
                <h3>Reviews</h3>
                {loadingReviews ? (
                  <p className="loading-reviews">Loading reviews...</p>
                ) : (
                  <ReviewsList
                    reviews={selectedAmbassadorReviews}
                    reviewCount={reviewCount}
                    averageRating={averageRating}
                  />
                )}
              </div>

              {selectedAmbassador.status === 'matched' || selectedAmbassador.status === 'pending' || selectedAmbassador.status === 'passed' ? (
                <div style={{ marginTop: '1.5rem' }}>
                  {selectedAmbassador.status === 'pending' && selectedAmbassador.is_test && isBrand && (
                    <button
                      className="action-button demo-accept-button"
                      onClick={async () => {
                        await handleDemoAccept(selectedAmbassador.id);
                        setSelectedAmbassador(null);
                      }}
                      style={{ marginBottom: '0.5rem', background: '#10B981', border: '2px solid #059669', width: '100%' }}
                    >
                      <span>⚡ Demo: Accept Now</span>
                    </button>
                  )}
                  <button
                    className="action-button next-button"
                    onClick={() => setSelectedAmbassador(null)}
                    style={{ width: '100%' }}
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="action-buttons single-button" style={{ marginTop: '1.5rem' }}>
                  <button
                    className="action-button request-button"
                    onClick={async () => {
                      try {
                        await likeAPI.createLike(selectedAmbassador.id);
                        const updatedAmbassadors = ambassadors.map(a =>
                          a.id === selectedAmbassador.id ? { ...a, status: 'pending' } : a
                        );
                        setAmbassadors(updatedAmbassadors);
                        setSelectedAmbassador(null);
                      } catch (error) {
                        console.error('Failed to send request:', error);
                      }
                    }}
                  >
                    <span>Request to Work Together</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Discover;
