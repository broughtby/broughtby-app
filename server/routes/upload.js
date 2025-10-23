const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { optionalAuth } = require('../middleware/auth');

// Upload profile photo - allows unauthenticated uploads for registration
router.post('/photo', optionalAuth, upload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Return the file path that will be accessible via the server
    const filePath = `/uploads/${req.file.filename}`;

    res.json({
      message: 'File uploaded successfully',
      filePath: filePath,
      fileName: req.file.filename,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  next();
});

module.exports = router;
