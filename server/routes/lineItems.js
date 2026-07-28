const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const lineItemController = require('../controllers/lineItemController');

// List line items for the authenticated user (brand or ambassador)
router.get('/', auth, lineItemController.getLineItems);

// Create a line item (brands only)
router.post('/', auth, lineItemController.createLineItem);

// Update / delete a line item (owning brand only)
router.put('/:id', auth, lineItemController.updateLineItem);
router.delete('/:id', auth, lineItemController.deleteLineItem);

module.exports = router;
