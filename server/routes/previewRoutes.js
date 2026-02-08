const express = require('express');
const router = express.Router();
const { resetPreview } = require('../controllers/previewController');
const { auth } = require('../middleware/auth');

router.post('/reset', auth, resetPreview);

module.exports = router;
