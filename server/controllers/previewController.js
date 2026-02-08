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

    res.json({
      message: 'Preview reset successfully',
    });
  } catch (error) {
    console.error('Preview reset error:', error);
    res.status(500).json({ error: 'Failed to reset preview' });
  }
};

module.exports = {
  resetPreview,
};
