const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { createLike, createPass, getReceivedLikes, declineLike, demoAcceptLike } = require('../controllers/likeController');

router.post('/', auth, createLike);
router.post('/pass', auth, createPass);
router.post('/decline', auth, declineLike);
router.post('/demo-accept', auth, demoAcceptLike);
router.get('/received', auth, getReceivedLikes);

module.exports = router;
