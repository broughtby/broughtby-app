const db = require('../config/database');

const createLike = async (req, res) => {
  try {
    const { ambassadorId } = req.body;

    // Only brands can like ambassadors
    if (req.user.role !== 'brand') {
      return res.status(403).json({ error: 'Only brands can like ambassadors' });
    }

    // Verify ambassador exists and is actually an ambassador
    const ambassadorCheck = await db.query(
      'SELECT id, role FROM users WHERE id = $1',
      [ambassadorId]
    );

    if (ambassadorCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Ambassador not found' });
    }

    if (ambassadorCheck.rows[0].role !== 'ambassador') {
      return res.status(400).json({ error: 'User is not an ambassador' });
    }

    // Create request (like with pending status)
    const result = await db.query(
      `INSERT INTO likes (brand_id, ambassador_id, status)
       VALUES ($1, $2, 'pending')
       ON CONFLICT (brand_id, ambassador_id) DO NOTHING
       RETURNING id, created_at`,
      [req.user.userId, ambassadorId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Request already exists' });
    }

    res.status(201).json({
      message: 'Partnership request sent successfully',
      like: result.rows[0],
    });
  } catch (error) {
    console.error('Create like error:', error);
    res.status(500).json({ error: 'Failed to create like' });
  }
};

const getReceivedLikes = async (req, res) => {
  try {
    // Only ambassadors can see who liked them
    if (req.user.role !== 'ambassador') {
      return res.status(403).json({ error: 'Only ambassadors can view received likes' });
    }

    const result = await db.query(
      `SELECT l.id, l.created_at, l.status,
              u.id as brand_id, u.name, u.profile_photo, u.bio, u.location, u.skills
       FROM likes l
       JOIN users u ON l.brand_id = u.id
       WHERE l.ambassador_id = $1
       AND l.status = 'pending'
       ORDER BY l.created_at DESC`,
      [req.user.userId]
    );

    res.json({ likes: result.rows });
  } catch (error) {
    console.error('Get received likes error:', error);
    res.status(500).json({ error: 'Failed to fetch likes' });
  }
};

const declineLike = async (req, res) => {
  try {
    const { brandId } = req.body;

    // Only ambassadors can decline partnership requests
    if (req.user.role !== 'ambassador') {
      return res.status(403).json({ error: 'Only ambassadors can decline requests' });
    }

    // Update the like status to declined
    const result = await db.query(
      `UPDATE likes
       SET status = 'declined'
       WHERE brand_id = $1 AND ambassador_id = $2 AND status = 'pending'
       RETURNING id`,
      [brandId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pending request not found' });
    }

    res.json({
      message: 'Partnership request declined',
    });
  } catch (error) {
    console.error('Decline request error:', error);
    res.status(500).json({ error: 'Failed to decline request' });
  }
};

const createPass = async (req, res) => {
  try {
    const { ambassadorId } = req.body;

    // Only brands can pass on ambassadors
    if (req.user.role !== 'brand') {
      return res.status(403).json({ error: 'Only brands can pass on ambassadors' });
    }

    // Verify ambassador exists and is actually an ambassador
    const ambassadorCheck = await db.query(
      'SELECT id, role FROM users WHERE id = $1',
      [ambassadorId]
    );

    if (ambassadorCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Ambassador not found' });
    }

    if (ambassadorCheck.rows[0].role !== 'ambassador') {
      return res.status(400).json({ error: 'User is not an ambassador' });
    }

    // Create pass
    const result = await db.query(
      `INSERT INTO passes (brand_id, ambassador_id)
       VALUES ($1, $2)
       ON CONFLICT (brand_id, ambassador_id) DO NOTHING
       RETURNING id, created_at`,
      [req.user.userId, ambassadorId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Pass already exists' });
    }

    res.status(201).json({
      message: 'Pass created successfully',
      pass: result.rows[0],
    });
  } catch (error) {
    console.error('Create pass error:', error);
    res.status(500).json({ error: 'Failed to create pass' });
  }
};

module.exports = {
  createLike,
  createPass,
  getReceivedLikes,
  declineLike,
};
