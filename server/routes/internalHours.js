const express = require('express');
const router = express.Router();
const { auth, requireAdmin } = require('../middleware/auth');
const internalHoursController = require('../controllers/internalHoursController');

// All internal-hours routes are admin-only
router.use(auth);
router.use(requireAdmin);

router.get('/', internalHoursController.getInternalHours);
router.post('/', internalHoursController.createInternalHours);
router.put('/:id', internalHoursController.updateInternalHours);
router.delete('/:id', internalHoursController.deleteInternalHours);

module.exports = router;
