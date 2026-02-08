const db = require('../config/database');

const createReview = async (req, res) => {
  try {
    const {
      bookingId,
      revieweeId,
      overallRating,
      wouldWorkAgain,
      comment,
      punctualityRating,
      professionalismRating,
      engagementRating,
      clearExpectationsRating,
      onsiteSupportRating,
      respectfulTreatmentRating,
    } = req.body;

    // Validate required fields
    if (!bookingId || !revieweeId || !overallRating) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify booking exists and user is part of it
    const bookingCheck = await db.query(
      `SELECT b.*,
              brand.name as brand_name, brand.email as brand_email,
              ambassador.name as ambassador_name, ambassador.email as ambassador_email
       FROM bookings b
       JOIN users brand ON b.brand_id = brand.id
       JOIN users ambassador ON b.ambassador_id = ambassador.id
       WHERE b.id = $1 AND (b.brand_id = $2 OR b.ambassador_id = $2)`,
      [bookingId, req.user.userId]
    );

    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found or you do not have access' });
    }

    const booking = bookingCheck.rows[0];

    // Only allow reviews for completed bookings
    if (booking.status !== 'completed') {
      return res.status(400).json({ error: 'Can only review completed bookings' });
    }

    // Verify reviewee is the other party in the booking
    const isReviewingAmbassador = booking.brand_id === req.user.userId && booking.ambassador_id === revieweeId;
    const isReviewingBrand = booking.ambassador_id === req.user.userId && booking.brand_id === revieweeId;

    if (!isReviewingAmbassador && !isReviewingBrand) {
      return res.status(400).json({ error: 'Invalid reviewee for this booking' });
    }

    // Check if user already reviewed this booking
    const existingReview = await db.query(
      'SELECT id FROM reviews WHERE booking_id = $1 AND reviewer_id = $2',
      [bookingId, req.user.userId]
    );

    if (existingReview.rows.length > 0) {
      return res.status(400).json({ error: 'You have already reviewed this booking' });
    }

    // Validate role-specific ratings
    if (req.user.role === 'brand') {
      // Brand reviewing ambassador - need punctuality, professionalism, engagement
      if (!punctualityRating || !professionalismRating || !engagementRating) {
        return res.status(400).json({ error: 'Missing required ratings for ambassador review' });
      }
    } else if (req.user.role === 'ambassador') {
      // Ambassador reviewing brand - need clear expectations, onsite support, respectful treatment
      if (!clearExpectationsRating || !onsiteSupportRating || !respectfulTreatmentRating) {
        return res.status(400).json({ error: 'Missing required ratings for brand review' });
      }
    }

    // Create review
    const result = await db.query(
      `INSERT INTO reviews (
        booking_id, reviewer_id, reviewee_id, reviewer_role,
        overall_rating, would_work_again, comment,
        punctuality_rating, professionalism_rating, engagement_rating,
        clear_expectations_rating, onsite_support_rating, respectful_treatment_rating
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        bookingId,
        req.user.userId,
        revieweeId,
        req.user.role,
        overallRating,
        wouldWorkAgain,
        comment,
        punctualityRating || null,
        professionalismRating || null,
        engagementRating || null,
        clearExpectationsRating || null,
        onsiteSupportRating || null,
        respectfulTreatmentRating || null,
      ]
    );

    // Update reviewee's average rating
    await updateUserRating(revieweeId);

    res.status(201).json({
      message: 'Review created successfully',
      review: result.rows[0],
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
};

const getBookingReviews = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Verify user has access to this booking
    const bookingCheck = await db.query(
      'SELECT id FROM bookings WHERE id = $1 AND (brand_id = $2 OR ambassador_id = $2)',
      [bookingId, req.user.userId]
    );

    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found or you do not have access' });
    }

    // Get all reviews for this booking
    const result = await db.query(
      `SELECT r.*,
              reviewer.name as reviewer_name,
              reviewer.profile_photo as reviewer_photo,
              reviewee.name as reviewee_name,
              reviewee.profile_photo as reviewee_photo
       FROM reviews r
       JOIN users reviewer ON r.reviewer_id = reviewer.id
       JOIN users reviewee ON r.reviewee_id = reviewee.id
       WHERE r.booking_id = $1
       ORDER BY r.created_at DESC`,
      [bookingId]
    );

    res.json({ reviews: result.rows });
  } catch (error) {
    console.error('Get booking reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

const getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get all reviews for a user (as reviewee)
    const result = await db.query(
      `SELECT r.*,
              reviewer.name as reviewer_name,
              reviewer.profile_photo as reviewer_photo,
              reviewer.role as reviewer_role,
              reviewer.company_name as reviewer_company_name,
              reviewer.company_logo as reviewer_company_logo,
              reviewer.is_test as reviewer_is_test,
              reviewer.is_preview as reviewer_is_preview,
              b.event_name,
              b.event_date
       FROM reviews r
       JOIN users reviewer ON r.reviewer_id = reviewer.id
       LEFT JOIN bookings b ON r.booking_id = b.id
       WHERE r.reviewee_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );

    // Get user's average rating and review count
    const stats = await db.query(
      `SELECT
        COUNT(*) as review_count,
        AVG(overall_rating)::numeric(3,2) as average_rating
       FROM reviews
       WHERE reviewee_id = $1`,
      [userId]
    );

    res.json({
      reviews: result.rows,
      reviewCount: parseInt(stats.rows[0].review_count),
      averageRating: parseFloat(stats.rows[0].average_rating) || 0,
    });
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch user reviews' });
  }
};

const getBookingsNeedingReview = async (req, res) => {
  try {
    let query;
    let params;

    if (req.user.role === 'brand') {
      // Get completed bookings where brand hasn't reviewed yet
      query = `
        SELECT b.*,
               u.name as ambassador_name,
               u.profile_photo as ambassador_photo,
               EXISTS(
                 SELECT 1 FROM reviews r
                 WHERE r.booking_id = b.id AND r.reviewer_id = $1
               ) as user_reviewed
        FROM bookings b
        JOIN users u ON b.ambassador_id = u.id
        WHERE b.brand_id = $1
        AND b.status = 'completed'
        AND NOT EXISTS(
          SELECT 1 FROM reviews r
          WHERE r.booking_id = b.id AND r.reviewer_id = $1
        )
        ORDER BY b.event_date DESC
      `;
      params = [req.user.userId];
    } else {
      // Get completed bookings where ambassador hasn't reviewed yet
      query = `
        SELECT b.*,
               u.name as brand_name,
               u.profile_photo as brand_photo,
               EXISTS(
                 SELECT 1 FROM reviews r
                 WHERE r.booking_id = b.id AND r.reviewer_id = $1
               ) as user_reviewed
        FROM bookings b
        JOIN users u ON b.brand_id = u.id
        WHERE b.ambassador_id = $1
        AND b.status = 'completed'
        AND NOT EXISTS(
          SELECT 1 FROM reviews r
          WHERE r.booking_id = b.id AND r.reviewer_id = $1
        )
        ORDER BY b.event_date DESC
      `;
      params = [req.user.userId];
    }

    const result = await db.query(query, params);

    res.json({ bookings: result.rows });
  } catch (error) {
    console.error('Get bookings needing review error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings needing review' });
  }
};

// Helper function to update user's average rating
async function updateUserRating(userId) {
  try {
    const result = await db.query(
      'SELECT AVG(overall_rating)::numeric(3,2) as avg_rating FROM reviews WHERE reviewee_id = $1',
      [userId]
    );

    const avgRating = result.rows[0].avg_rating || 0;

    await db.query(
      'UPDATE users SET rating = $1 WHERE id = $2',
      [avgRating, userId]
    );
  } catch (error) {
    console.error('Update user rating error:', error);
    // Don't throw error - this is a non-critical operation
  }
}

module.exports = {
  createReview,
  getBookingReviews,
  getUserReviews,
  getBookingsNeedingReview,
};
