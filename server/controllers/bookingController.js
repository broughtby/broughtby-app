const db = require('../config/database');
const { sendBookingRequestEmail, sendBookingConfirmedEmail } = require('../services/emailService');

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

    // Check if ambassador has set their hourly rate and get preview status
    const ambassadorCheck = await db.query(
      'SELECT hourly_rate, is_preview_ambassador FROM users WHERE id = $1 AND role = $2',
      [ambassadorId, 'ambassador']
    );

    if (ambassadorCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Ambassador not found' });
    }

    if (ambassadorCheck.rows[0].hourly_rate === null || ambassadorCheck.rows[0].hourly_rate === undefined) {
      return res.status(400).json({ error: "Booking unavailable: This ambassador hasn't set their hourly rate yet. Send them a message to set their rate first." });
    }

    // Check if brand is a preview account
    const brandCheck = await db.query(
      'SELECT is_preview FROM users WHERE id = $1',
      [req.user.userId]
    );

    const isPreviewBooking = brandCheck.rows[0]?.is_preview && ambassadorCheck.rows[0]?.is_preview_ambassador;

    // Validate event date is not in the past
    const eventDateObj = new Date(eventDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (eventDateObj < today) {
      return res.status(400).json({ error: 'Event date cannot be in the past' });
    }

    // Create booking (auto-confirm for preview mode)
    const bookingStatus = isPreviewBooking ? 'confirmed' : 'pending';
    const result = await db.query(
      `INSERT INTO bookings (
        match_id, brand_id, ambassador_id, event_name, event_date, start_time, end_time,
        duration, event_location, hourly_rate, total_cost, notes, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
        bookingStatus,
      ]
    );

    // Send booking request email to ambassador (non-blocking)
    db.query(
      'SELECT email, name FROM users WHERE id = $1',
      [ambassadorId]
    ).then(ambassadorQuery => {
      if (ambassadorQuery.rows.length > 0) {
        db.query(
          'SELECT name FROM users WHERE id = $1',
          [req.user.userId]
        ).then(brandQuery => {
          if (brandQuery.rows.length > 0) {
            const ambassador = ambassadorQuery.rows[0];
            const brand = brandQuery.rows[0];

            sendBookingRequestEmail({
              ambassadorEmail: ambassador.email,
              ambassadorName: ambassador.name,
              brandName: brand.name,
              eventName,
              eventDate,
              startTime,
              endTime,
              eventLocation,
              hourlyRate,
              totalCost,
              notes,
            }).catch(error => console.error('Failed to send booking request email:', error));
          }
        }).catch(error => console.error('Failed to query brand info:', error));
      }
    }).catch(error => console.error('Failed to query ambassador info:', error));

    res.status(201).json({
      message: isPreviewBooking ? 'Booking confirmed! You can now check in when your activation begins.' : 'Booking created successfully',
      booking: result.rows[0],
      autoConfirmed: isPreviewBooking,
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
               u.email as ambassador_email,
               u.is_test as ambassador_is_test
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
               u.email as brand_email,
               u.is_test as brand_is_test
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

    // Send booking confirmed email to brand if ambassador confirms (non-blocking)
    if (status === 'confirmed' && req.user.role === 'ambassador') {
      const booking = result.rows[0];

      db.query(
        'SELECT email, name FROM users WHERE id = $1',
        [booking.brand_id]
      ).then(brandQuery => {
        if (brandQuery.rows.length > 0) {
          db.query(
            'SELECT name FROM users WHERE id = $1',
            [booking.ambassador_id]
          ).then(ambassadorQuery => {
            if (ambassadorQuery.rows.length > 0) {
              const brand = brandQuery.rows[0];
              const ambassador = ambassadorQuery.rows[0];

              sendBookingConfirmedEmail({
                brandEmail: brand.email,
                brandName: brand.name,
                ambassadorName: ambassador.name,
                eventName: booking.event_name,
                eventDate: booking.event_date,
                startTime: booking.start_time,
                endTime: booking.end_time,
                eventLocation: booking.event_location,
                totalCost: booking.total_cost,
              }).catch(error => console.error('Failed to send booking confirmed email:', error));
            }
          }).catch(error => console.error('Failed to query ambassador info:', error));
        }
      }).catch(error => console.error('Failed to query brand info:', error));
    }

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

const checkIn = async (req, res) => {
  try {
    const { id } = req.params;

    // Only ambassadors can check in
    if (req.user.role !== 'ambassador') {
      return res.status(403).json({ error: 'Only ambassadors can check in' });
    }

    // Get the booking
    const bookingCheck = await db.query(
      'SELECT * FROM bookings WHERE id = $1 AND ambassador_id = $2',
      [id, req.user.userId]
    );

    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found or you do not have access' });
    }

    const booking = bookingCheck.rows[0];

    // Booking must be confirmed
    if (booking.status !== 'confirmed') {
      return res.status(400).json({ error: 'Only confirmed bookings can be checked in' });
    }

    // Prevent double check-in
    if (booking.checked_in_at) {
      return res.status(400).json({ error: 'Already checked in' });
    }

    // Record check-in timestamp
    const result = await db.query(
      `UPDATE bookings
       SET checked_in_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    res.json({
      message: 'Checked in successfully',
      booking: result.rows[0],
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Failed to check in' });
  }
};

const checkOut = async (req, res) => {
  try {
    const { id } = req.params;

    // Only ambassadors can check out
    if (req.user.role !== 'ambassador') {
      return res.status(403).json({ error: 'Only ambassadors can check out' });
    }

    // Get the booking
    const bookingCheck = await db.query(
      'SELECT * FROM bookings WHERE id = $1 AND ambassador_id = $2',
      [id, req.user.userId]
    );

    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found or you do not have access' });
    }

    const booking = bookingCheck.rows[0];

    // Must have checked in first
    if (!booking.checked_in_at) {
      return res.status(400).json({ error: 'Must check in before checking out' });
    }

    // Prevent double check-out
    if (booking.checked_out_at) {
      return res.status(400).json({ error: 'Already checked out' });
    }

    // Calculate actual hours from check-in to check-out and mark as completed
    const result = await db.query(
      `UPDATE bookings
       SET checked_out_at = CURRENT_TIMESTAMP,
           actual_hours = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - checked_in_at)) / 3600,
           status = 'completed',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    res.json({
      message: 'Checked out successfully and booking marked as completed',
      booking: result.rows[0],
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ error: 'Failed to check out' });
  }
};

const getTimeStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Get the booking
    const result = await db.query(
      `SELECT id, duration as planned_hours, actual_hours,
              checked_in_at, checked_out_at
       FROM bookings
       WHERE id = $1
       AND (brand_id = $2 OR ambassador_id = $2)`,
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = result.rows[0];

    res.json({
      plannedHours: parseFloat(booking.planned_hours),
      actualHours: booking.actual_hours ? parseFloat(booking.actual_hours) : null,
      checkedIn: !!booking.checked_in_at,
      checkedOut: !!booking.checked_out_at,
      checkedInAt: booking.checked_in_at,
      checkedOutAt: booking.checked_out_at,
    });
  } catch (error) {
    console.error('Get time status error:', error);
    res.status(500).json({ error: 'Failed to fetch time status' });
  }
};

module.exports = {
  createBooking,
  getBookings,
  getBookingById,
  updateBookingStatus,
  deleteBooking,
  checkIn,
  checkOut,
  getTimeStatus,
};
