import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPhotoUrl } from '../services/upload';
import DisplayName from './DisplayName';
import './ReviewModal.css';

const ReviewModal = ({ booking, partnerInfo, onClose, onSubmit, isPreview }) => {
  const { user, demoMode } = useAuth();

  // Determine if user is reviewing as the hirer (brand/AM who booked) or as the hired (ambassador/AM who was booked)
  const isReviewingAsHirer = user.role === 'brand' || (user.role === 'account_manager' && booking.brand_id === user.id);

  // Pre-populate with positive review for preview users
  const getDefaultComment = () => {
    if (!isPreview) return '';
    if (isReviewingAsHirer) {
      return 'Allan was fantastic! He showed up on time, engaged with all the founders, and made sure everyone signed up for our newsletter. He represented our brand perfectly and got so much great product feedback on our coffee. Would definitely book again for future YCBuzz events!';
    }
    return '';
  };

  const [formData, setFormData] = useState({
    overallRating: isPreview ? 5 : 0,
    wouldWorkAgain: true,
    comment: getDefaultComment(),
    // Brand ratings for ambassador
    punctualityRating: isPreview ? 5 : 0,
    professionalismRating: isPreview ? 5 : 0,
    engagementRating: isPreview ? 5 : 0,
    // Ambassador ratings for brand
    clearExpectationsRating: isPreview ? 5 : 0,
    onsiteSupportRating: isPreview ? 5 : 0,
    respectfulTreatmentRating: isPreview ? 5 : 0,
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error when user changes value
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleRatingChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: parseInt(value)
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.overallRating || formData.overallRating < 1) {
      newErrors.overallRating = 'Please select a rating';
    }

    // Brands and account managers (when booking) review with brand criteria
    // Ambassadors and account managers (when booked) review with ambassador criteria
    if (isReviewingAsHirer) {
      if (!formData.punctualityRating || formData.punctualityRating < 1) {
        newErrors.punctualityRating = 'Please select a rating';
      }
      if (!formData.professionalismRating || formData.professionalismRating < 1) {
        newErrors.professionalismRating = 'Please select a rating';
      }
      if (!formData.engagementRating || formData.engagementRating < 1) {
        newErrors.engagementRating = 'Please select a rating';
      }
    } else {
      if (!formData.clearExpectationsRating || formData.clearExpectationsRating < 1) {
        newErrors.clearExpectationsRating = 'Please select a rating';
      }
      if (!formData.onsiteSupportRating || formData.onsiteSupportRating < 1) {
        newErrors.onsiteSupportRating = 'Please select a rating';
      }
      if (!formData.respectfulTreatmentRating || formData.respectfulTreatmentRating < 1) {
        newErrors.respectfulTreatmentRating = 'Please select a rating';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      const reviewData = {
        bookingId: booking.id,
        revieweeId: isReviewingAsHirer ? booking.ambassador_id : booking.brand_id,
        overallRating: formData.overallRating,
        wouldWorkAgain: formData.wouldWorkAgain,
        comment: formData.comment,
      };

      if (isReviewingAsHirer) {
        reviewData.punctualityRating = formData.punctualityRating;
        reviewData.professionalismRating = formData.professionalismRating;
        reviewData.engagementRating = formData.engagementRating;
      } else {
        reviewData.clearExpectationsRating = formData.clearExpectationsRating;
        reviewData.onsiteSupportRating = formData.onsiteSupportRating;
        reviewData.respectfulTreatmentRating = formData.respectfulTreatmentRating;
      }

      onSubmit(reviewData);
    }
  };

  const renderClickableStars = (name, rating) => {
    return (
      <div className="clickable-stars">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            className={`star-btn ${star <= rating ? 'filled' : 'empty'}`}
            onClick={() => handleRatingChange(name, star)}
            aria-label={`${star} stars`}
          >
            ★
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="review-modal" onClick={onClose}>
      <div className="review-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="review-modal-header">
          <h1 className="review-modal-title">Leave Review</h1>
          <button className="review-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Partner Info */}
        <div className="review-partner-info">
          {partnerInfo.profile_photo && (
            <img
              src={getPhotoUrl(partnerInfo.profile_photo)}
              alt={partnerInfo.name}
              className="review-partner-photo"
            />
          )}
          <div className="review-partner-details">
            <h2><DisplayName user={partnerInfo} demoMode={demoMode} /></h2>
            <p className="review-event-name">{booking.event_name}</p>
            <p className="review-event-date">
              {new Date(booking.event_date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="review-form">
          {/* Role-specific ratings */}
          {isReviewingAsHirer ? (
            <>
              <div className="form-group">
                <label htmlFor="punctualityRating">
                  Punctuality <span className="required">*</span>
                </label>
                <p className="rating-description">Arrived on time and ready to work</p>
                {renderClickableStars('punctualityRating', formData.punctualityRating)}
                {errors.punctualityRating && <span className="error-message">{errors.punctualityRating}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="professionalismRating">
                  Professionalism <span className="required">*</span>
                </label>
                <p className="rating-description">Appearance, attitude, and demeanor</p>
                {renderClickableStars('professionalismRating', formData.professionalismRating)}
                {errors.professionalismRating && <span className="error-message">{errors.professionalismRating}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="engagementRating">
                  Engagement <span className="required">*</span>
                </label>
                <p className="rating-description">Energy and interaction while on-site</p>
                {renderClickableStars('engagementRating', formData.engagementRating)}
                {errors.engagementRating && <span className="error-message">{errors.engagementRating}</span>}
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="clearExpectationsRating">
                  Clear Expectations <span className="required">*</span>
                </label>
                <p className="rating-description">Instructions and event details were well-communicated</p>
                {renderClickableStars('clearExpectationsRating', formData.clearExpectationsRating)}
                {errors.clearExpectationsRating && <span className="error-message">{errors.clearExpectationsRating}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="onsiteSupportRating">
                  On-site Support <span className="required">*</span>
                </label>
                <p className="rating-description">Point of contact was available and helpful</p>
                {renderClickableStars('onsiteSupportRating', formData.onsiteSupportRating)}
                {errors.onsiteSupportRating && <span className="error-message">{errors.onsiteSupportRating}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="respectfulTreatmentRating">
                  Respectful Treatment <span className="required">*</span>
                </label>
                <p className="rating-description">Professional and respectful work environment</p>
                {renderClickableStars('respectfulTreatmentRating', formData.respectfulTreatmentRating)}
                {errors.respectfulTreatmentRating && <span className="error-message">{errors.respectfulTreatmentRating}</span>}
              </div>
            </>
          )}

          {/* Overall Rating */}
          <div className="form-group">
            <label htmlFor="overallRating">
              Overall Rating <span className="required">*</span>
            </label>
            {renderClickableStars('overallRating', formData.overallRating)}
            {errors.overallRating && <span className="error-message">{errors.overallRating}</span>}
          </div>

          {/* Would Work Again Toggle */}
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="wouldWorkAgain"
                checked={formData.wouldWorkAgain}
                onChange={handleChange}
              />
              I would work with this {isReviewingAsHirer ? 'ambassador' : 'brand'} again
            </label>
          </div>

          {/* Comment */}
          <div className="form-group">
            <label htmlFor="comment">Additional Comments (Optional)</label>
            <textarea
              id="comment"
              name="comment"
              value={formData.comment}
              onChange={handleChange}
              placeholder={`Share your experience working with ${partnerInfo.name}...`}
              rows="4"
            />
          </div>

          {/* Buttons */}
          <div className="review-modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Submit Review
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;
