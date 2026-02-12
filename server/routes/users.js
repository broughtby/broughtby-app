const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const actingAs = require('../middleware/actingAs');
const { getProfile, updateProfile, getAmbassadors } = require('../controllers/userController');

router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfile);
router.get('/ambassadors', auth, actingAs, getAmbassadors);

module.exports = router;
