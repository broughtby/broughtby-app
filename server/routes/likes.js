const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { createLike, createPass, getReceivedLikes, declineLike } = require('../controllers/likeController');

router.post('/', auth, createLike);
router.post('/pass', auth, createPass);
router.post('/decline', auth, declineLike);
router.get('/received', auth, getReceivedLikes);

module.exports = router;
