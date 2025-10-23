const db = require('../config/database');

const createMatch = async (req, res) => {
  try {
    const { brandId } = req.body;

    // Only ambassadors can create matches (by accepting likes)
    if (req.user.role !== 'ambassador') {
      return res.status(403).json({ error: 'Only ambassadors can create matches' });
    }

    // Verify a like exists from the brand to this ambassador
    const likeCheck = await db.query(
      'SELECT id FROM likes WHERE brand_id = $1 AND ambassador_id = $2',
      [brandId, req.user.userId]
    );

    if (likeCheck.rows.length === 0) {
      return res.status(400).json({ error: 'No like exists from this brand' });
    }

    // Create match
    const result = await db.query(
      `INSERT INTO matches (brand_id, ambassador_id)
       VALUES ($1, $2)
       ON CONFLICT (brand_id, ambassador_id) DO NOTHING
       RETURNING id, created_at`,
      [brandId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Match already exists' });
    }

    res.status(201).json({
      message: 'Match created successfully',
      match: result.rows[0],
    });
  } catch (error) {
    console.error('Create match error:', error);
    res.status(500).json({ error: 'Failed to create match' });
  }
};

const getMatches = async (req, res) => {
  try {
    let query;
    let params;

    if (req.user.role === 'brand') {
      // Get matches where user is the brand
      query = `
        SELECT m.id as match_id, m.created_at,
               u.id as user_id, u.name, u.profile_photo, u.bio, u.location,
               u.age, u.skills, u.hourly_rate, u.availability, u.rating,
               (SELECT content FROM messages WHERE match_id = m.id
                ORDER BY created_at DESC LIMIT 1) as last_message,
               (SELECT created_at FROM messages WHERE match_id = m.id
                ORDER BY created_at DESC LIMIT 1) as last_message_time
        FROM matches m
        JOIN users u ON m.ambassador_id = u.id
        WHERE m.brand_id = $1
        ORDER BY last_message_time DESC NULLS LAST, m.created_at DESC
      `;
      params = [req.user.userId];
    } else {
      // Get matches where user is the ambassador
      query = `
        SELECT m.id as match_id, m.created_at,
               u.id as user_id, u.name, u.profile_photo, u.bio, u.location, u.skills,
               (SELECT content FROM messages WHERE match_id = m.id
                ORDER BY created_at DESC LIMIT 1) as last_message,
               (SELECT created_at FROM messages WHERE match_id = m.id
                ORDER BY created_at DESC LIMIT 1) as last_message_time
        FROM matches m
        JOIN users u ON m.brand_id = u.id
        WHERE m.ambassador_id = $1
        ORDER BY last_message_time DESC NULLS LAST, m.created_at DESC
      `;
      params = [req.user.userId];
    }

    const result = await db.query(query, params);

    res.json({ matches: result.rows });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
};

module.exports = {
  createMatch,
  getMatches,
};
