const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { getMessages, createMessage } = require('../controllers/messageController');

router.get('/:matchId', auth, getMessages);
router.post('/', auth, createMessage);

module.exports = router;
