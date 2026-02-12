const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const actingAs = require('../middleware/actingAs');
const bookingController = require('../controllers/bookingController');

// Create a new booking
router.post('/', auth, actingAs, bookingController.createBooking);

// Get all bookings for the authenticated user
router.get('/', auth, bookingController.getBookings);

// Get a specific booking by ID
router.get('/:id', auth, bookingController.getBookingById);

// Update booking status
router.put('/:id/status', auth, bookingController.updateBookingStatus);

// Delete a booking
router.delete('/:id', auth, bookingController.deleteBooking);

// Time tracking endpoints
router.post('/:id/check-in', auth, bookingController.checkIn);
router.post('/:id/check-out', auth, bookingController.checkOut);
router.get('/:id/time-status', auth, bookingController.getTimeStatus);

module.exports = router;
