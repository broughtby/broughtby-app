const express = require('express');
const router = express.Router();
const { resetPreview, togglePreviewAmbassador } = require('../controllers/previewController');
const { auth } = require('../middleware/auth');

router.post('/reset', auth, resetPreview);
router.post('/toggle-ambassador', auth, togglePreviewAmbassador);

module.exports = router;
