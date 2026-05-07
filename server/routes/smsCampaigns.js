const express = require('express');
const router = express.Router();
const { handleInboundMms } = require('../controllers/smsCampaignController');

// Twilio inbound MMS webhook — Twilio POSTs to this when a customer texts
// the campaign phone number. No auth middleware: signature validation
// happens inside the controller.
router.post('/inbound', handleInboundMms);

module.exports = router;
