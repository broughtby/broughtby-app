const express = require('express');
const router = express.Router();
const { auth, requireAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

// All admin routes require authentication and admin privileges
router.use(auth);
router.use(requireAdmin);

// Search users by email or name
router.get('/users/search', adminController.searchUsers);

// Impersonate a user
router.post('/impersonate', adminController.impersonateUser);

// Stop impersonation
router.post('/stop-impersonation', auth, adminController.stopImpersonation);

module.exports = router;
