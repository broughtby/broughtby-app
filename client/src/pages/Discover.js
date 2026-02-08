import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userAPI, likeAPI, reviewAPI, bookingAPI, messageAPI, matchAPI, previewAPI } from '../services/api';
import { getPhotoUrl } from '../services/upload';
import DisplayName from '../components/DisplayName';
import DisplayRate from '../components/DisplayRate';
import ReviewsList from '../components/ReviewsList';
import BrandAvatar from '../components/BrandAvatar';
import BookingModal from '../components/BookingModal';
import './Discover.css';

const Discover = () => {
  const navigate = useNavigate();
  const { isBrand, isAmbassador, demoMode, user, isPreview } = useAuth();
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
  const [matches, setMatches] = useState([]);
  const [bookingAmbassador, setBookingAmbassador] = useState(null);
  const [showPreviewToast, setShowPreviewToast] = useState(false);
  const [showAutoMatchToast, setShowAutoMatchToast] = useState(false);
  const [autoMatchedAmbassador, setAutoMatchedAmbassador] = useState(null);

  useEffect(() => {
    if (isBrand || isAmbassador) {
      fetchAmbassadors();
      if (isBrand) {
        fetchMatches();
      }
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
  }, [selectedLocation, ambassadors]);

  // Reset to first card only when location filter changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [selectedLocation]);

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

  const fetchMatches = async () => {
    try {
      const response = await matchAPI.getMatches();
      setMatches(response.data.matches);
    } catch (error) {
      console.error('Failed to fetch matches:', error);
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
Date: ${parseLocalDate(bookingData.eventDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Time: ${formatTime(bookingData.startTime)} - ${formatTime(bookingData.endTime)} CST (${bookingData.duration} hours)
Location: ${bookingData.eventLocation}${bookingData.notes ? `\nNotes: ${bookingData.notes}` : ''}

Rate: $${bookingData.hourlyRate}/hour
Total Cost: $${bookingData.estimatedCost.toFixed(2)}

Status: Pending confirmation`;

      await messageAPI.createMessage(match.match_id, bookingMessage);

      // Close modal and show success
      setBookingAmbassador(null);
      alert('Booking request sent! The ambassador has been notified and will review your request. Check the Calendar tab to view the status of your booking.');
    } catch (error) {
      console.error('Failed to create booking:', error);

      // Check if we have a specific error message from the backend
      const errorMessage = error.response?.data?.error || 'Failed to create booking. Please try again.';
      alert(errorMessage);
    }
  };

  // Helper function to get match for an ambassador
  const getMatchForAmbassador = (ambassadorId) => {
    return matches.find(m => m.user_id === ambassadorId);
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
        const response = await likeAPI.createLike(currentAmbassador.id);

        // Check if auto-matched in preview mode
        if (response.data.autoMatched) {
          // Update local state to reflect match status
          const updatedAmbassadors = ambassadors.map(a =>
            a.id === currentAmbassador.id ? { ...a, status: 'matched' } : a
          );
          setAmbassadors(updatedAmbassadors);

          // Show auto-match toast
          setAutoMatchedAmbassador(currentAmbassador);
          setShowAutoMatchToast(true);

          // Auto-hide toast after 5 seconds
          setTimeout(() => {
            setShowAutoMatchToast(false);
          }, 5000);
        } else {
          // Update local state to reflect pending status
          const updatedAmbassadors = ambassadors.map(a =>
            a.id === currentAmbassador.id ? { ...a, status: 'pending' } : a
          );
          setAmbassadors(updatedAmbassadors);
        }
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

  // Preview mode helpers
  const findPreviewAmbassador = () => {
    return filteredAmbassadors.find(a => a.is_preview_ambassador);
  };

  const scrollToPreviewAmbassador = () => {
    const previewAmbassador = findPreviewAmbassador();
    if (previewAmbassador) {
      const index = filteredAmbassadors.findIndex(a => a.id === previewAmbassador.id);
      if (index !== -1) {
        setCurrentIndex(index);
        // Close modal if open
        if (selectedAmbassador) {
          setSelectedAmbassador(null);
        }
      }
    }
  };

  const handlePreviewButtonClick = () => {
    const previewAmbassador = findPreviewAmbassador();
    const previewName = previewAmbassador?.name || 'Kim Kardashian';

    setShowPreviewToast(true);

    // Auto-hide toast after 5 seconds
    setTimeout(() => {
      setShowPreviewToast(false);
    }, 5000);
  };

  const handleResetPreview = async () => {
    const confirmed = window.confirm(
      'Reset your preview? This will clear all your matches, messages, and likes so you can start fresh.'
    );

    if (!confirmed) return;

    try {
      await previewAPI.resetPreview();
      // Refresh the page to reset the discover view
      window.location.reload();
    } catch (error) {
      console.error('Failed to reset preview:', error);
      alert('Failed to reset preview. Please try again.');
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
                      <span className="info-item rating">
                        {ambassador.rating && parseFloat(ambassador.rating) > 0
                          ? `${ambassador.rating} ⭐`
                          : 'No reviews yet'}
                      </span>
                    </div>
                    {ambassador.bio ? (
                      <div className="grid-card-bio">
                        {ambassador.bio}
                      </div>
                    ) : ambassador.skills && ambassador.skills.length > 0 && (
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
        {isBrand && user && (
          <div className="welcome-banner" onClick={() => navigate('/profile')}>
            <BrandAvatar
              companyLogo={user.company_logo || user.profile_photo}
              personPhoto={user.profile_photo}
              companyName={user.company_name}
              personName={user.name}
              size="large"
            />
            <div className="welcome-text">
              <h2>Welcome back, {user.company_name || user.name?.split(' ')[0]}!</h2>
              <p>Find your next brand ambassador</p>
            </div>
          </div>
        )}

        {/* Preview Mode Banner */}
        {isPreview && isBrand && (
          <div className="preview-banner">
            <div className="preview-banner-content">
              <span className="preview-icon">🎬</span>
              <p className="preview-text">
                <strong>Preview Mode</strong> — Browse real ambassadors, then book {findPreviewAmbassador()?.name || 'Kim Kardashian'} to try the full experience
              </p>
              <div className="preview-banner-actions">
                <button
                  className="preview-find-button"
                  onClick={scrollToPreviewAmbassador}
                >
                  Find {findPreviewAmbassador()?.name?.split(' ')[0] || 'Kim'}
                </button>
                <button
                  className="preview-reset-button"
                  onClick={handleResetPreview}
                >
                  ↺ Start Over
                </button>
              </div>
            </div>
          </div>
        )}

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
                    {currentAmbassador.rating && parseFloat(currentAmbassador.rating) > 0
                      ? `${currentAmbassador.rating} ⭐`
                      : 'No reviews yet'}
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
            {currentAmbassador.status === 'matched' && isBrand ? (
              <>
                <button
                  className="action-button message-button"
                  onClick={() => {
                    const match = getMatchForAmbassador(currentAmbassador.id);
                    if (match) {
                      navigate(`/chat/${match.match_id}`);
                    }
                  }}
                  style={{ marginBottom: '0.5rem' }}
                >
                  <span>Message</span>
                </button>
                <button
                  className="action-button request-button"
                  onClick={() => {
                    setBookingAmbassador({
                      id: currentAmbassador.id,
                      name: currentAmbassador.name,
                      hourly_rate: currentAmbassador.hourly_rate,
                      profile_photo: currentAmbassador.profile_photo,
                      is_test: currentAmbassador.is_test,
                    });
                  }}
                >
                  <span>Book Now</span>
                </button>
              </>
            ) : (
              <button
                className="action-button next-button"
                onClick={handleNext}
              >
                <span>Next Ambassador</span>
                <span className="action-icon">→</span>
              </button>
            )}
          </div>
        ) : (
          <div className="action-buttons">
            <button
              className="action-button request-button"
              onClick={() => {
                // In preview mode, only allow request for preview ambassador
                if (isPreview && !currentAmbassador.is_preview_ambassador) {
                  handlePreviewButtonClick();
                } else {
                  handleLike();
                }
              }}
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

        {/* Preview Mode Toast */}
        {showPreviewToast && isPreview && (
          <div className="preview-toast">
            <div className="preview-toast-content">
              <p className="preview-toast-text">
                <strong>This is a live preview</strong> — try booking {findPreviewAmbassador()?.name || 'Kim Kardashian'} to experience the full flow!
              </p>
              <button
                className="preview-toast-button"
                onClick={() => {
                  scrollToPreviewAmbassador();
                  setShowPreviewToast(false);
                }}
              >
                Find {findPreviewAmbassador()?.name?.split(' ')[0] || 'Kim'}
              </button>
              <button
                className="preview-toast-close"
                onClick={() => setShowPreviewToast(false)}
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Auto-Match Success Toast */}
        {showAutoMatchToast && autoMatchedAmbassador && (
          <div className="preview-toast">
            <div className="preview-toast-content" style={{ borderColor: '#10B981' }}>
              <p className="preview-toast-text">
                <strong>You've been matched!</strong> Start chatting with <DisplayName user={autoMatchedAmbassador} demoMode={demoMode} /> now
              </p>
              <button
                className="preview-toast-button"
                onClick={() => {
                  navigate('/matches');
                  setShowAutoMatchToast(false);
                }}
              >
                Go to Matches
              </button>
              <button
                className="preview-toast-close"
                onClick={() => setShowAutoMatchToast(false)}
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // DESKTOP/TABLET VIEW: Gallery grid
  return (
    <div className="discover-container brand-grid-view">
      {isBrand && user && (
        <div className="welcome-banner" onClick={() => navigate('/profile')}>
          <BrandAvatar
            companyLogo={user.company_logo || user.profile_photo}
            personPhoto={user.profile_photo}
            companyName={user.company_name}
            personName={user.name}
            size="large"
          />
          <div className="welcome-text">
            <h2>Welcome back, {user.company_name || user.name?.split(' ')[0]}!</h2>
            <p>Find your next brand ambassador</p>
          </div>
        </div>
      )}

      {/* Preview Mode Banner */}
      {isPreview && isBrand && (
        <div className="preview-banner">
          <div className="preview-banner-content">
            <span className="preview-icon">🎬</span>
            <p className="preview-text">
              <strong>Preview Mode</strong> — Browse real ambassadors, then book {findPreviewAmbassador()?.name || 'Kim Kardashian'} to try the full experience
            </p>
            <div className="preview-banner-actions">
              <button
                className="preview-find-button"
                onClick={scrollToPreviewAmbassador}
              >
                Find {findPreviewAmbassador()?.name?.split(' ')[0] || 'Kim'}
              </button>
              <button
                className="preview-reset-button"
                onClick={handleResetPreview}
              >
                ↺ Start Over
              </button>
            </div>
          </div>
        </div>
      )}
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
                <span className="info-item rating">
                  {ambassador.rating && parseFloat(ambassador.rating) > 0
                    ? `${ambassador.rating} ⭐`
                    : 'No reviews yet'}
                </span>
              </div>
              {ambassador.bio ? (
                <div className="grid-card-bio">
                  {ambassador.bio}
                </div>
              ) : ambassador.skills && ambassador.skills.length > 0 && (
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
                  <span className="stat-value">
                    {selectedAmbassador.rating && parseFloat(selectedAmbassador.rating) > 0
                      ? `${selectedAmbassador.rating} ⭐`
                      : 'No reviews yet'}
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

              {selectedAmbassador.status === 'matched' || selectedAmbassador.status === 'pending' || selectedAmbassador.status === 'passed' ? (
                <div style={{ marginTop: '1.5rem' }}>
                  {selectedAmbassador.status === 'matched' && isBrand ? (
                    <div className="action-buttons" style={{ display: 'flex', gap: '1rem' }}>
                      <button
                        className="action-button message-button"
                        onClick={() => {
                          const match = getMatchForAmbassador(selectedAmbassador.id);
                          if (match) {
                            navigate(`/chat/${match.match_id}`);
                          }
                        }}
                        style={{ flex: 1 }}
                      >
                        Message
                      </button>
                      <button
                        className="action-button request-button"
                        onClick={() => {
                          setBookingAmbassador({
                            id: selectedAmbassador.id,
                            name: selectedAmbassador.name,
                            hourly_rate: selectedAmbassador.hourly_rate,
                            profile_photo: selectedAmbassador.profile_photo,
                            is_test: selectedAmbassador.is_test,
                          });
                          setSelectedAmbassador(null);
                        }}
                        style={{ flex: 1 }}
                      >
                        Book Now
                      </button>
                    </div>
                  ) : (
                    <button
                      className="action-button next-button"
                      onClick={() => setSelectedAmbassador(null)}
                      style={{ width: '100%' }}
                    >
                      Close
                    </button>
                  )}
                </div>
              ) : (
                <div className="action-buttons single-button" style={{ marginTop: '1.5rem' }}>
                  <button
                    className="action-button request-button"
                    onClick={async () => {
                      // In preview mode, only allow request for preview ambassador
                      if (isPreview && !selectedAmbassador.is_preview_ambassador) {
                        handlePreviewButtonClick();
                        return;
                      }

                      try {
                        const response = await likeAPI.createLike(selectedAmbassador.id);

                        // Check if auto-matched in preview mode
                        if (response.data.autoMatched) {
                          const updatedAmbassadors = ambassadors.map(a =>
                            a.id === selectedAmbassador.id ? { ...a, status: 'matched' } : a
                          );
                          setAmbassadors(updatedAmbassadors);

                          // Show auto-match toast
                          setAutoMatchedAmbassador(selectedAmbassador);
                          setShowAutoMatchToast(true);

                          // Auto-hide toast after 5 seconds
                          setTimeout(() => {
                            setShowAutoMatchToast(false);
                          }, 5000);
                        } else {
                          const updatedAmbassadors = ambassadors.map(a =>
                            a.id === selectedAmbassador.id ? { ...a, status: 'pending' } : a
                          );
                          setAmbassadors(updatedAmbassadors);
                        }

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

      {/* Booking Modal */}
      {bookingAmbassador && (
        <BookingModal
          ambassador={bookingAmbassador}
          onClose={() => setBookingAmbassador(null)}
          onSubmit={handleBookingSubmit}
        />
      )}

      {/* Preview Mode Toast */}
      {showPreviewToast && isPreview && (
        <div className="preview-toast">
          <div className="preview-toast-content">
            <p className="preview-toast-text">
              <strong>This is a live preview</strong> — try booking {findPreviewAmbassador()?.name || 'Kim Kardashian'} to experience the full flow!
            </p>
            <button
              className="preview-toast-button"
              onClick={() => {
                scrollToPreviewAmbassador();
                setShowPreviewToast(false);
              }}
            >
              Find {findPreviewAmbassador()?.name?.split(' ')[0] || 'Kim'}
            </button>
            <button
              className="preview-toast-close"
              onClick={() => setShowPreviewToast(false)}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Auto-Match Success Toast */}
      {showAutoMatchToast && autoMatchedAmbassador && (
        <div className="preview-toast">
          <div className="preview-toast-content" style={{ borderColor: '#10B981' }}>
            <p className="preview-toast-text">
              <strong>You've been matched!</strong> Start chatting with <DisplayName user={autoMatchedAmbassador} demoMode={demoMode} /> now
            </p>
            <button
              className="preview-toast-button"
              onClick={() => {
                navigate('/matches');
                setShowAutoMatchToast(false);
              }}
            >
              Go to Matches
            </button>
            <button
              className="preview-toast-close"
              onClick={() => setShowAutoMatchToast(false)}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Discover;
