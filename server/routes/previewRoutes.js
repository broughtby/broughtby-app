const express = require('express');
const router = express.Router();
const { resetPreview, togglePreviewAmbassador, generateBrandMessage, generateEventDetails } = require('../controllers/previewController');
const { auth } = require('../middleware/auth');

router.post('/reset', auth, resetPreview);
router.post('/toggle-ambassador', auth, togglePreviewAmbassador);
router.post('/generate-brand-message', auth, generateBrandMessage);
router.post('/generate-event-details', auth, generateEventDetails);

module.exports = router;
