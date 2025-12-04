const db = require('../config/database');

const getMessages = async (req, res) => {
  try {
    const { matchId } = req.params;

    // Verify user is part of this match
    const matchCheck = await db.query(
      'SELECT id FROM matches WHERE id = $1 AND (brand_id = $2 OR ambassador_id = $2)',
      [matchId, req.user.userId]
    );

    if (matchCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this match' });
    }

    // Get messages
    const result = await db.query(
      `SELECT m.id, m.content, m.sender_id, m.read, m.created_at,
              u.name as sender_name, u.profile_photo as sender_photo, u.is_test
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.match_id = $1
       ORDER BY m.created_at ASC`,
      [matchId]
    );

    // Mark messages as read
    await db.query(
      'UPDATE messages SET read = true WHERE match_id = $1 AND sender_id != $2',
      [matchId, req.user.userId]
    );

    res.json({ messages: result.rows });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

const createMessage = async (req, res) => {
  try {
    const { matchId, content } = req.body;

    // Verify user is part of this match
    const matchCheck = await db.query(
      'SELECT id FROM matches WHERE id = $1 AND (brand_id = $2 OR ambassador_id = $2)',
      [matchId, req.user.userId]
    );

    if (matchCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this match' });
    }

    // Create message
    const result = await db.query(
      `INSERT INTO messages (match_id, sender_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, match_id, sender_id, content, read, created_at`,
      [matchId, req.user.userId, content]
    );

    res.status(201).json({
      message: 'Message sent successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

module.exports = {
  getMessages,
  createMessage,
};
