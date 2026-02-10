const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  createEngagement,
  getEngagements,
  updateEngagementStatus,
  endEngagement,
} = require('../controllers/engagementController');

// All routes require authentication
router.use(auth);

// Create a new engagement
router.post('/', createEngagement);

// Get all engagements for the authenticated user
router.get('/', getEngagements);

// Update engagement status (pending -> active, active -> paused, etc.)
router.patch('/:id/status', updateEngagementStatus);

// End an engagement
router.patch('/:id/end', endEngagement);

module.exports = router;
