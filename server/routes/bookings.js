const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const bookingController = require('../controllers/bookingController');

// Create a new booking
router.post('/', auth, bookingController.createBooking);

// Get all bookings for the authenticated user
router.get('/', auth, bookingController.getBookings);

// Get a specific booking by ID
router.get('/:id', auth, bookingController.getBookingById);

// Update booking status
router.put('/:id/status', auth, bookingController.updateBookingStatus);

// Update booking times (creator only)
router.put('/:id/times', auth, bookingController.updateBookingTimes);

// Draft workflow: duplicate a booking into a draft, edit it, then send it
router.post('/:id/duplicate', auth, bookingController.duplicateBooking);
router.put('/:id/draft', auth, bookingController.updateDraftBooking);
router.post('/:id/send', auth, bookingController.sendDraftBooking);

// Delete a booking
router.delete('/:id', auth, bookingController.deleteBooking);

// Time tracking endpoints
router.post('/:id/check-in', auth, bookingController.checkIn);
router.post('/:id/check-out', auth, bookingController.checkOut);
router.get('/:id/time-status', auth, bookingController.getTimeStatus);

module.exports = router;
