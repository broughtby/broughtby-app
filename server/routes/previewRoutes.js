const express = require('express');
const router = express.Router();
const { resetPreview } = require('../controllers/previewController');
const authMiddleware = require('../middleware/auth');

router.post('/reset', authMiddleware, resetPreview);

module.exports = router;
