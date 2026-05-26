const express = require('express');
const router = express.Router();
const multer = require('multer');
const ctrl = require('../controllers/publicSubmissionController');

// Memory storage; we stream the buffer straight to Cloudinary. 10MB cap covers
// most phone photos including HEIC.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if ((file.mimetype || '').toLowerCase().startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

router.get('/campaigns/:eventCode', ctrl.getPublicCampaign);
router.post('/submissions', upload.single('photo'), ctrl.submitPublic);

module.exports = router;
