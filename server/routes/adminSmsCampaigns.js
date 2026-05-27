const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const ctrl = require('../controllers/smsCampaignAdminController');

// All routes require auth. The controller enforces:
//  - Brands can read/create/update their OWN campaigns
//  - Admins can do all of the above for any campaign
//  - Sensitive operations (manual code assignment, bulk coupon upload)
//    stay admin-only via per-handler guards.
router.use(auth);

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
