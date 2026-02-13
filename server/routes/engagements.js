const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  createEngagement,
  getEngagements,
  updateEngagementStatus,
  endEngagement,
  getAvailableBrands,
} = require('../controllers/engagementController');

// All routes require authentication
router.use(auth);

// Create a new engagement
router.post('/', createEngagement);

// Get all engagements for the authenticated user
router.get('/', getEngagements);

// Get available brands for account managers
router.get('/available-brands', getAvailableBrands);

// Update engagement status (pending -> active, active -> paused, etc.)
router.patch('/:id/status', updateEngagementStatus);

// End an engagement
router.patch('/:id/end', endEngagement);

module.exports = router;
