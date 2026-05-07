const express = require('express');
const router = express.Router();
const { auth, requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/smsCampaignAdminController');

// All routes require auth. Reads are role-aware (brand sees own campaigns).
// Writes are admin-only.
router.use(auth);

router.get('/', ctrl.listCampaigns);
router.post('/', requireAdmin, ctrl.createCampaign);
router.get('/:id', ctrl.getCampaign);
router.patch('/:id', requireAdmin, ctrl.updateCampaign);

router.get('/:id/submissions', ctrl.listSubmissions);
router.get('/:id/export', ctrl.exportSubmissionsCsv);

router.get('/:id/coupons', ctrl.getCouponPool);
router.post('/:id/coupons', requireAdmin, ctrl.uploadCoupons);

router.post('/:id/manual-assign', requireAdmin, ctrl.manualAssign);

module.exports = router;
