const db = require('../config/database');

const resetPreview = async (req, res) => {
  try {
    // Verify user is a preview account
    const userCheck = await db.query(
      'SELECT is_preview FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!userCheck.rows[0].is_preview) {
      return res.status(403).json({ error: 'Only preview accounts can reset' });
    }

    // Delete all messages associated with matches where the brand is the preview user
    await db.query(
      `DELETE FROM messages
       WHERE match_id IN (
         SELECT id FROM matches WHERE brand_id = $1
       )`,
      [req.user.userId]
    );

    // Delete all matches where the brand is the preview user
    await db.query(
      'DELETE FROM matches WHERE brand_id = $1',
      [req.user.userId]
    );

    // Delete all likes where the brand is the preview user
    await db.query(
      'DELETE FROM likes WHERE brand_id = $1',
      [req.user.userId]
    );

    // Delete all passes where the brand is the preview user
    await db.query(
      'DELETE FROM passes WHERE brand_id = $1',
      [req.user.userId]
    );

    // Delete all reviews where the brand left a review
    await db.query(
      'DELETE FROM reviews WHERE reviewer_id = $1',
      [req.user.userId]
    );

    // Delete all bookings where the brand is the preview user
    await db.query(
      'DELETE FROM bookings WHERE brand_id = $1',
      [req.user.userId]
    );

    res.json({
      message: 'Preview reset successfully',
    });
  } catch (error) {
    console.error('Preview reset error:', error);
    res.status(500).json({ error: 'Failed to reset preview' });
  }
};

const togglePreviewAmbassador = async (req, res) => {
  try {
    const { ambassadorId, enabled } = req.body;

    if (!ambassadorId || typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'ambassadorId and enabled (boolean) are required' });
    }

    // Verify caller is a preview brand or admin
    const userCheck = await db.query(
      'SELECT is_preview, is_admin FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { is_preview, is_admin } = userCheck.rows[0];
    if (!is_preview && !is_admin) {
      return res.status(403).json({ error: 'Only preview accounts or admins can toggle preview ambassadors' });
    }

    // Verify target is an ambassador
    const ambassadorCheck = await db.query(
      'SELECT id, name, role FROM users WHERE id = $1',
      [ambassadorId]
    );

    if (ambassadorCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Ambassador not found' });
    }

    if (ambassadorCheck.rows[0].role !== 'ambassador') {
      return res.status(400).json({ error: 'User is not an ambassador' });
    }

    // Toggle the flag
    await db.query(
      'UPDATE users SET is_preview_ambassador = $1 WHERE id = $2',
      [enabled, ambassadorId]
    );

    const ambassador = ambassadorCheck.rows[0];
    res.json({
      message: `${ambassador.name} preview mode ${enabled ? 'enabled' : 'disabled'}`,
      ambassadorId,
      enabled,
    });
  } catch (error) {
    console.error('Toggle preview ambassador error:', error);
    res.status(500).json({ error: 'Failed to toggle preview ambassador' });
  }
};

module.exports = {
  resetPreview,
  togglePreviewAmbassador,
};
