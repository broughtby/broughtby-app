const db = require('../config/database');

const getProfile = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, email, role, name, profile_photo, bio, location, age,
              skills, hourly_rate, availability, rating, created_at
       FROM users WHERE id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, profile_photo, bio, location, age, skills, hourly_rate, availability } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (profile_photo !== undefined) {
      updates.push(`profile_photo = $${paramCount++}`);
      values.push(profile_photo);
    }
    if (bio !== undefined) {
      updates.push(`bio = $${paramCount++}`);
      values.push(bio);
    }
    if (location !== undefined) {
      updates.push(`location = $${paramCount++}`);
      values.push(location);
    }
    if (age !== undefined) {
      updates.push(`age = $${paramCount++}`);
      values.push(age);
    }
    if (skills !== undefined) {
      updates.push(`skills = $${paramCount++}`);
      values.push(skills);
    }
    if (hourly_rate !== undefined) {
      updates.push(`hourly_rate = $${paramCount++}`);
      values.push(hourly_rate);
    }
    if (availability !== undefined) {
      updates.push(`availability = $${paramCount++}`);
      values.push(availability);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(req.user.userId);

    const query = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, role, name, profile_photo, bio, location, age,
                skills, hourly_rate, availability, rating
    `;

    const result = await db.query(query, values);

    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

const getAmbassadors = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    if (req.user.role === 'brand') {
      // Brands browse all ambassadors with status indicators
      const result = await db.query(
        `SELECT u.id, u.name, u.profile_photo, u.bio, u.location, u.age,
                u.skills, u.hourly_rate, u.availability, u.rating,
                l.id as like_id,
                m.id as match_id,
                p.id as pass_id
         FROM users u
         LEFT JOIN likes l ON l.ambassador_id = u.id AND l.brand_id = $1
         LEFT JOIN matches m ON (m.ambassador_id = u.id AND m.brand_id = $1)
         LEFT JOIN passes p ON p.ambassador_id = u.id AND p.brand_id = $1
         WHERE u.role = 'ambassador'
         ORDER BY u.rating DESC, u.created_at DESC
         LIMIT $2 OFFSET $3`,
        [req.user.userId, limit, offset]
      );

      // Add status to each ambassador
      const ambassadors = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        profile_photo: row.profile_photo,
        bio: row.bio,
        location: row.location,
        age: row.age,
        skills: row.skills,
        hourly_rate: row.hourly_rate,
        availability: row.availability,
        rating: row.rating,
        status: row.match_id ? 'matched' : (row.like_id ? 'pending' : (row.pass_id ? 'passed' : 'available'))
      }));

      return res.json({ ambassadors });
    } else if (req.user.role === 'ambassador') {
      // Ambassadors browse other ambassadors (excluding themselves) - community view
      const result = await db.query(
        `SELECT u.id, u.name, u.profile_photo, u.bio, u.location, u.age,
                u.skills, u.hourly_rate, u.availability, u.rating
         FROM users u
         WHERE u.role = 'ambassador'
         AND u.id != $1
         ORDER BY u.rating DESC, u.created_at DESC
         LIMIT $2 OFFSET $3`,
        [req.user.userId, limit, offset]
      );

      return res.json({ ambassadors: result.rows });
    } else {
      return res.status(403).json({ error: 'Invalid user role' });
    }
  } catch (error) {
    console.error('Get ambassadors error:', error);
    res.status(500).json({ error: 'Failed to fetch ambassadors' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getAmbassadors,
};
