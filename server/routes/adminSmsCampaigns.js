const express = require('express');
const router = express.Router();
const { auth, requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/smsCampaignAdminController');

// All routes require admin authentication
router.use(auth);
router.use(requireAdmin);

router.get('/', ctrl.listCampaigns);
router.post('/', ctrl.createCampaign);
router.get('/:id', ctrl.getCampaign);
router.patch('/:id', ctrl.updateCampaign);

router.get('/:id/submissions', ctrl.listSubmissions);
router.get('/:id/export', ctrl.exportSubmissionsCsv);

router.get('/:id/coupons', ctrl.getCouponPool);
router.post('/:id/coupons', ctrl.uploadCoupons);

router.post('/:id/manual-assign', ctrl.manualAssign);

module.exports = router;
