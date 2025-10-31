const db = require('../config/database');

const createBooking = async (req, res) => {
  try {
    const {
      matchId,
      ambassadorId,
      eventName,
      eventDate,
      startTime,
      endTime,
      duration,
      eventLocation,
      hourlyRate,
      totalCost,
      notes,
    } = req.body;

    // Only brands can create bookings
    if (req.user.role !== 'brand') {
      return res.status(403).json({ error: 'Only brands can create bookings' });
    }

    // Verify the match exists and the brand is part of it
    const matchCheck = await db.query(
      'SELECT id, brand_id, ambassador_id FROM matches WHERE id = $1 AND brand_id = $2',
      [matchId, req.user.userId]
    );

    if (matchCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found or you do not have access' });
    }

    const match = matchCheck.rows[0];

    // Verify the ambassador in the booking matches the match
    if (match.ambassador_id !== ambassadorId) {
      return res.status(400).json({ error: 'Ambassador does not match the partnership' });
    }

    // Validate event date is not in the past
    const eventDateObj = new Date(eventDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (eventDateObj < today) {
      return res.status(400).json({ error: 'Event date cannot be in the past' });
    }

    // Create booking
    const result = await db.query(
      `INSERT INTO bookings (
        match_id, brand_id, ambassador_id, event_name, event_date, start_time, end_time,
        duration, event_location, hourly_rate, total_cost, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        matchId,
        req.user.userId,
        ambassadorId,
        eventName,
        eventDate,
        startTime,
        endTime,
        duration,
        eventLocation,
        hourlyRate,
        totalCost,
        notes,
      ]
    );

    res.status(201).json({
      message: 'Booking created successfully',
      booking: result.rows[0],
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
};

const getBookings = async (req, res) => {
  try {
    let query;
    let params;

    if (req.user.role === 'brand') {
      // Get bookings where user is the brand
      query = `
        SELECT b.*,
               u.name as ambassador_name,
               u.profile_photo as ambassador_photo,
               u.email as ambassador_email
        FROM bookings b
        JOIN users u ON b.ambassador_id = u.id
        WHERE b.brand_id = $1
        ORDER BY b.event_date DESC, b.created_at DESC
      `;
      params = [req.user.userId];
    } else {
      // Get bookings where user is the ambassador
      query = `
        SELECT b.*,
               u.name as brand_name,
               u.profile_photo as brand_photo,
               u.email as brand_email
        FROM bookings b
        JOIN users u ON b.brand_id = u.id
        WHERE b.ambassador_id = $1
        ORDER BY b.event_date DESC, b.created_at DESC
      `;
      params = [req.user.userId];
    }

    const result = await db.query(query, params);

    res.json({ bookings: result.rows });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};

const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT b.*,
             brand.name as brand_name,
             brand.profile_photo as brand_photo,
             brand.email as brand_email,
             ambassador.name as ambassador_name,
             ambassador.profile_photo as ambassador_photo,
             ambassador.email as ambassador_email
      FROM bookings b
      JOIN users brand ON b.brand_id = brand.id
      JOIN users ambassador ON b.ambassador_id = ambassador.id
      WHERE b.id = $1
      AND (b.brand_id = $2 OR b.ambassador_id = $2)
    `;

    const result = await db.query(query, [id, req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({ booking: result.rows[0] });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
};

const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Check booking exists and user has access
    const bookingCheck = await db.query(
      'SELECT * FROM bookings WHERE id = $1 AND (brand_id = $2 OR ambassador_id = $2)',
      [id, req.user.userId]
    );

    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Update booking status
    const result = await db.query(
      `UPDATE bookings
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    res.json({
      message: 'Booking status updated successfully',
      booking: result.rows[0],
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ error: 'Failed to update booking status' });
  }
};

const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;

    // Only brands can delete bookings
    if (req.user.role !== 'brand') {
      return res.status(403).json({ error: 'Only brands can delete bookings' });
    }

    // Check booking exists and belongs to the brand
    const result = await db.query(
      'DELETE FROM bookings WHERE id = $1 AND brand_id = $2 RETURNING id',
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({ error: 'Failed to delete booking' });
  }
};

module.exports = {
  createBooking,
  getBookings,
  getBookingById,
  updateBookingStatus,
  deleteBooking,
};
