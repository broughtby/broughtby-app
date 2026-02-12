const db = require('../config/database');

/**
 * Middleware to handle "acting as" mode for account managers
 * Allows account managers to perform actions on behalf of their brands
 */
const actingAs = async (req, res, next) => {
  try {
    // Check if the X-Acting-As-Brand header is present
    const actingAsBrandId = req.header('X-Acting-As-Brand') || req.query.actingAsBrandId;

    if (actingAsBrandId && req.user.role === 'account_manager') {
      // Verify this AM has an active engagement with this brand
      const engagement = await db.query(
        `SELECT id FROM engagements
         WHERE account_manager_id = $1 AND brand_id = $2 AND status = 'active'`,
        [req.user.userId, actingAsBrandId]
      );

      if (engagement.rows.length > 0) {
        // Set acting as context
        req.actingAsBrandId = parseInt(actingAsBrandId);
        req.effectiveBrandId = parseInt(actingAsBrandId); // Use this instead of req.user.userId for brand operations
        req.isActingAs = true;
      } else {
        return res.status(403).json({ error: 'No active engagement with this brand' });
      }
    }

    next();
  } catch (error) {
    console.error('Acting as middleware error:', error);
    return res.status(500).json({ error: 'Failed to process acting as request' });
  }
};

module.exports = actingAs;
