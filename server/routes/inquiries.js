const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const inquiryController = require('../controllers/inquiryController');

// Create a new broadcast inquiry (brand only)
router.post('/', auth, inquiryController.createInquiry);

// Get all inquiries for the authenticated user
// - Brands see their sent inquiries with response counts
// - Ambassadors see inquiries they received
router.get('/', auth, inquiryController.getInquiries);

// Get all responses for a specific inquiry (brand only)
router.get('/:inquiryId/responses', auth, inquiryController.getInquiryResponses);

// Ambassador responds to an inquiry
router.post('/:inquiryId/respond', auth, inquiryController.respondToInquiry);

// Brand selects an ambassador from available responses (creates booking)
router.post('/:inquiryId/select', auth, inquiryController.selectAmbassador);

// Cancel an inquiry (brand only)
router.delete('/:inquiryId', auth, inquiryController.cancelInquiry);

module.exports = router;
