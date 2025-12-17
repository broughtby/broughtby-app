const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const reviewController = require('../controllers/reviewController');

// Create a new review
router.post('/', auth, reviewController.createReview);

// Get reviews for a specific booking
router.get('/booking/:bookingId', auth, reviewController.getBookingReviews);

// Get all reviews for a user
router.get('/user/:userId', reviewController.getUserReviews);

// Get completed bookings that need review
router.get('/needs-review', auth, reviewController.getBookingsNeedingReview);

module.exports = router;
