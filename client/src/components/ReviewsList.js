import React from 'react';
import { getPhotoUrl } from '../services/upload';
import DisplayName from './DisplayName';
import BrandAvatar from './BrandAvatar';
import './ReviewsList.css';

const ReviewsList = ({ reviews, reviewCount, averageRating, demoMode }) => {

  const renderStars = (rating) => {
    return (
      <span className="review-stars">
        {[1, 2, 3, 4, 5].map(star => (
          <span key={star} className={star <= rating ? 'star filled' : 'star empty'}>
            ★
          </span>
        ))}
      </span>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!reviews || reviews.length === 0) {
    return (
      <div className="reviews-empty">
        <p>No reviews yet</p>
      </div>
    );
  }

  return (
    <div className="reviews-list-container">
      <div className="reviews-summary">
        <div className="summary-rating">
          <div className="rating-number">{averageRating.toFixed(1)}</div>
          <div className="rating-stars-large">
            {renderStars(Math.round(averageRating))}
          </div>
          <div className="rating-count">{reviewCount} review{reviewCount !== 1 ? 's' : ''}</div>
        </div>
      </div>

      <div className="reviews-list">
        {reviews.map((review) => (
          <div key={review.id} className="review-card">
            <div className="review-header">
              <div className="reviewer-info">
                {review.reviewer_role === 'brand' ? (
                  <BrandAvatar
                    companyLogo={review.reviewer_company_logo}
                    personPhoto={review.reviewer_photo}
                    companyName={review.reviewer_company_name}
                    personName={review.reviewer_name}
                    size="medium"
                  />
                ) : (
                  review.reviewer_photo && (
                    <img
                      src={getPhotoUrl(review.reviewer_photo)}
                      alt={review.reviewer_name}
                      className="reviewer-photo"
                    />
                  )
                )}
                <div className="reviewer-details">
                  <h4 className="reviewer-name">
                    {review.reviewer_role === 'brand' && review.reviewer_company_name ? (
                      <>
                        <DisplayName
                          user={{
                            name: review.reviewer_name,
                            is_test: review.reviewer_is_test
                          }}
                          demoMode={demoMode}
                        />
                        {' from '}
                        <DisplayName
                          user={{
                            name: review.reviewer_company_name,
                            is_test: review.reviewer_is_test
                          }}
                          demoMode={demoMode}
                        />
                      </>
                    ) : (
                      <DisplayName
                        user={{
                          name: review.reviewer_name,
                          is_test: review.reviewer_is_test
                        }}
                        demoMode={demoMode}
                      />
                    )}
                  </h4>
                  <span className="reviewer-role">{review.reviewer_role === 'brand' ? 'Brand' : 'Ambassador'}</span>
                </div>
              </div>
              <div className="review-meta">
                <div className="review-date">{formatDate(review.created_at)}</div>
              </div>
            </div>

            <div className="review-body">
              <div className="review-rating">
                {renderStars(review.overall_rating)}
                <span className="rating-text">{review.overall_rating}/5</span>
              </div>

              {review.comment && (
                <p className="review-comment">{review.comment}</p>
              )}

              {review.would_work_again !== null && (
                <div className="would-work-again">
                  {review.would_work_again ? (
                    <span className="badge badge-positive">✓ Would work together again</span>
                  ) : (
                    <span className="badge badge-negative">Would not work together again</span>
                  )}
                </div>
              )}

              {/* Detailed ratings - Always visible */}
              <div className="review-details">
                {review.reviewer_role === 'brand' && (
                  <div className="detail-ratings">
                    <div className="detail-rating">
                      <span className="detail-label">Punctuality:</span>
                      {renderStars(review.punctuality_rating)}
                      <span className="rating-text">{review.punctuality_rating}/5</span>
                    </div>
                    <div className="detail-rating">
                      <span className="detail-label">Professionalism:</span>
                      {renderStars(review.professionalism_rating)}
                      <span className="rating-text">{review.professionalism_rating}/5</span>
                    </div>
                    <div className="detail-rating">
                      <span className="detail-label">Engagement:</span>
                      {renderStars(review.engagement_rating)}
                      <span className="rating-text">{review.engagement_rating}/5</span>
                    </div>
                  </div>
                )}

                {review.reviewer_role === 'ambassador' && (
                  <div className="detail-ratings">
                    <div className="detail-rating">
                      <span className="detail-label">Clear Expectations:</span>
                      {renderStars(review.clear_expectations_rating)}
                      <span className="rating-text">{review.clear_expectations_rating}/5</span>
                    </div>
                    <div className="detail-rating">
                      <span className="detail-label">On-site Support:</span>
                      {renderStars(review.onsite_support_rating)}
                      <span className="rating-text">{review.onsite_support_rating}/5</span>
                    </div>
                    <div className="detail-rating">
                      <span className="detail-label">Respectful Treatment:</span>
                      {renderStars(review.respectful_treatment_rating)}
                      <span className="rating-text">{review.respectful_treatment_rating}/5</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="review-event-info">
                <span className="event-name">{review.event_name}</span>
                <span className="event-date">
                  {new Date(review.event_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewsList;
