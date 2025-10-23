const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { createMatch, getMatches } = require('../controllers/matchController');

router.post('/', auth, createMatch);
router.get('/', auth, getMatches);

module.exports = router;
