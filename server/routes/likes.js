const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { createLike, createPass, getReceivedLikes } = require('../controllers/likeController');

router.post('/', auth, createLike);
router.post('/pass', auth, createPass);
router.get('/received', auth, getReceivedLikes);

module.exports = router;
