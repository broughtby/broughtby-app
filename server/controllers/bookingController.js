const db = require('../config/database');
const { sendBookingRequestEmail, sendBookingConfirmedEmail, sendBookingTimesUpdatedEmail } = require('../services/emailService');

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
      brandId,
    } = req.body;

    // Only brands and account managers can create bookings
    if (req.user.role !== 'brand' && req.user.role !== 'account_manager') {
      return res.status(403).json({ error: 'Only brands and account managers can create bookings' });
    }

    // Determine effective brand ID
    // Account managers must provide brandId, brands use their own userId
    let effectiveBrandId;
    if (req.user.role === 'account_manager') {
      if (!brandId) {
        return res.status(400).json({ error: 'Account managers must specify a brand client' });
      }

      // Verify AM has an active engagement with this brand
      const engagementCheck = await db.query(
        `SELECT id FROM engagements
         WHERE brand_id = $1 AND account_manager_id = $2 AND status = 'active'`,
        [brandId, req.user.userId]
      );

      if (engagementCheck.rows.length === 0) {
        return res.status(403).json({ error: 'You do not have an active engagement with this brand' });
      }

      effectiveBrandId = brandId;
    } else {
      effectiveBrandId = req.user.userId;
    }

    // Verify the match exists and the user has access to it
    // For account managers: they must be the brand in the match (AM matched with ambassador)
    // For brands: they must be the brand in the match (brand matched with ambassador)
    const matchCheckBrandId = req.user.role === 'account_manager' ? req.user.userId : effectiveBrandId;

    const matchCheck = await db.query(
      'SELECT id, brand_id, ambassador_id FROM matches WHERE id = $1 AND brand_id = $2',
      [matchId, matchCheckBrandId]
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
      'SELECT hourly_rate, is_preview_ambassador FROM users WHERE id = $1 AND (role = $2 OR role = $3)',
      [ambassadorId, 'ambassador', 'account_manager']
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
      [effectiveBrandId]
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
        effectiveBrandId,
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

    // Send booking request email to ambassador (non-blocking, skip for preview bookings)
    if (!isPreviewBooking) {
      db.query(
        'SELECT email, name FROM users WHERE id = $1',
        [ambassadorId]
      ).then(ambassadorQuery => {
        if (ambassadorQuery.rows.length > 0) {
          db.query(
            'SELECT name FROM users WHERE id = $1',
            [effectiveBrandId]
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
    }

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
               u.is_test as ambassador_is_test,
               brand.company_name
        FROM bookings b
        JOIN users u ON b.ambassador_id = u.id
        JOIN users brand ON b.brand_id = brand.id
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
               u.is_test as brand_is_test,
               u.company_name,
               ambassador.name as ambassador_name,
               ambassador.profile_photo as ambassador_photo,
               ambassador.is_test as ambassador_is_test
        FROM bookings b
        JOIN users u ON b.brand_id = u.id
        JOIN users ambassador ON b.ambassador_id = ambassador.id
        WHERE b.ambassador_id = $1
          AND b.status != 'draft'
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
      AND (b.brand_id = $2 OR (b.ambassador_id = $2 AND b.status != 'draft'))
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

// Compute hours between two "HH:MM" or "HH:MM:SS" time strings
const hoursBetween = (startTime, endTime) => {
  const toMinutes = (t) => {
    const [h, m] = t.split(':');
    return parseInt(h, 10) * 60 + parseInt(m, 10);
  };
  return (toMinutes(endTime) - toMinutes(startTime)) / 60;
};

const updateBookingTimes = async (req, res) => {
  try {
    const { id } = req.params;
    const { eventDate, startTime, endTime } = req.body;

    // Only brands and account managers (the booking creators) can edit times
    if (req.user.role !== 'brand' && req.user.role !== 'account_manager') {
      return res.status(403).json({ error: 'Only brands and account managers can edit booking times' });
    }

    if (!startTime || !endTime) {
      return res.status(400).json({ error: 'Start time and end time are required' });
    }

    // Fetch the booking
    const bookingCheck = await db.query('SELECT * FROM bookings WHERE id = $1', [id]);

    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingCheck.rows[0];

    // Authorize: brand must own the booking; AM must have an active engagement with the brand
    if (req.user.role === 'brand') {
      if (booking.brand_id !== req.user.userId) {
        return res.status(403).json({ error: 'You do not have access to this booking' });
      }
    } else {
      const engagementCheck = await db.query(
        `SELECT id FROM engagements
         WHERE brand_id = $1 AND account_manager_id = $2 AND status = 'active'`,
        [booking.brand_id, req.user.userId]
      );
      if (engagementCheck.rows.length === 0) {
        return res.status(403).json({ error: 'You do not have access to this booking' });
      }
    }

    // Only pending or confirmed bookings can have their times edited
    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      return res.status(400).json({ error: `Cannot edit times for a ${booking.status} booking` });
    }

    // Validate end is after start
    const duration = hoursBetween(startTime, endTime);
    if (duration <= 0) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    // Validate the (possibly new) event date is not in the past
    const effectiveDate = eventDate || booking.event_date;
    const eventDateObj = new Date(effectiveDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (eventDateObj < today) {
      return res.status(400).json({ error: 'Event date cannot be in the past' });
    }

    // Recompute cost from the ambassador's stored hourly rate to keep data consistent
    const hourlyRate = parseFloat(booking.hourly_rate);
    const totalCost = Math.round(duration * hourlyRate * 100) / 100;

    const result = await db.query(
      `UPDATE bookings
       SET event_date = $1, start_time = $2, end_time = $3, duration = $4, total_cost = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [effectiveDate, startTime, endTime, duration, totalCost, id]
    );

    const updatedBooking = result.rows[0];

    // Notify the ambassador that the times changed (non-blocking)
    db.query(
      'SELECT email, name FROM users WHERE id = $1',
      [updatedBooking.ambassador_id]
    ).then(ambassadorQuery => {
      if (ambassadorQuery.rows.length > 0) {
        db.query(
          'SELECT name FROM users WHERE id = $1',
          [updatedBooking.brand_id]
        ).then(brandQuery => {
          if (brandQuery.rows.length > 0) {
            const ambassador = ambassadorQuery.rows[0];
            const brand = brandQuery.rows[0];

            sendBookingTimesUpdatedEmail({
              ambassadorEmail: ambassador.email,
              ambassadorName: ambassador.name,
              brandName: brand.name,
              eventName: updatedBooking.event_name,
              eventDate: updatedBooking.event_date,
              startTime: updatedBooking.start_time,
              endTime: updatedBooking.end_time,
              eventLocation: updatedBooking.event_location,
              totalCost: updatedBooking.total_cost,
            }).catch(error => console.error('Failed to send booking times updated email:', error));
          }
        }).catch(error => console.error('Failed to query brand info:', error));
      }
    }).catch(error => console.error('Failed to query ambassador info:', error));

    res.json({
      message: 'Booking times updated successfully',
      booking: updatedBooking,
    });
  } catch (error) {
    console.error('Update booking times error:', error);
    res.status(500).json({ error: 'Failed to update booking times' });
  }
};

// Authorize that the requester (brand or account manager) owns/created this
// booking. Mirrors the ownership rules used by createBooking.
const canManageBooking = async (req, booking) => {
  if (req.user.role === 'brand') {
    return booking.brand_id === req.user.userId;
  }
  if (req.user.role === 'account_manager') {
    const engagementCheck = await db.query(
      `SELECT id FROM engagements
       WHERE brand_id = $1 AND account_manager_id = $2 AND status = 'active'`,
      [booking.brand_id, req.user.userId]
    );
    return engagementCheck.rows.length > 0;
  }
  return false;
};

// Duplicate an existing booking into a private draft (copies event details,
// keeps the same ambassador/match initially; the brand can edit and reassign).
const duplicateBooking = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'brand' && req.user.role !== 'account_manager') {
      return res.status(403).json({ error: 'Only brands and account managers can duplicate bookings' });
    }

    const src = (await db.query('SELECT * FROM bookings WHERE id = $1', [id])).rows[0];
    if (!src) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (!(await canManageBooking(req, src))) {
      return res.status(403).json({ error: 'You do not have access to this booking' });
    }

    const result = await db.query(
      `INSERT INTO bookings (
        match_id, brand_id, ambassador_id, event_name, event_date, start_time, end_time,
        duration, event_location, hourly_rate, total_cost, notes, status
      )
      SELECT match_id, brand_id, ambassador_id, event_name, event_date, start_time, end_time,
             duration, event_location, hourly_rate, total_cost, notes, 'draft'
      FROM bookings WHERE id = $1
      RETURNING *`,
      [id]
    );

    res.status(201).json({ message: 'Draft created', booking: result.rows[0] });
  } catch (error) {
    console.error('Duplicate booking error:', error);
    res.status(500).json({ error: 'Failed to duplicate booking' });
  }
};

// Edit a draft booking, including reassigning it to a different (matched)
// ambassador. Recomputes duration and total cost.
const updateDraftBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { eventName, eventDate, startTime, endTime, eventLocation, notes, ambassadorId } = req.body;

    if (req.user.role !== 'brand' && req.user.role !== 'account_manager') {
      return res.status(403).json({ error: 'Only brands and account managers can edit drafts' });
    }

    const draft = (await db.query('SELECT * FROM bookings WHERE id = $1', [id])).rows[0];
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }
    if (draft.status !== 'draft') {
      return res.status(400).json({ error: 'Only drafts can be edited here' });
    }
    if (!(await canManageBooking(req, draft))) {
      return res.status(403).json({ error: 'You do not have access to this draft' });
    }

    // Resolve the (possibly new) ambassador, match and rate
    let matchId = draft.match_id;
    let effectiveAmbassadorId = draft.ambassador_id;
    let hourlyRate = parseFloat(draft.hourly_rate);

    if (ambassadorId && ambassadorId !== draft.ambassador_id) {
      const match = (await db.query(
        'SELECT id FROM matches WHERE brand_id = $1 AND ambassador_id = $2',
        [draft.brand_id, ambassadorId]
      )).rows[0];
      if (!match) {
        return res.status(400).json({ error: 'You are not matched with that ambassador' });
      }
      const amb = (await db.query(
        'SELECT hourly_rate FROM users WHERE id = $1 AND role = $2',
        [ambassadorId, 'ambassador']
      )).rows[0];
      if (!amb) {
        return res.status(404).json({ error: 'Ambassador not found' });
      }
      matchId = match.id;
      effectiveAmbassadorId = ambassadorId;
      if (amb.hourly_rate !== null && amb.hourly_rate !== undefined) {
        hourlyRate = parseFloat(amb.hourly_rate);
      }
    }

    const newStart = startTime || draft.start_time;
    const newEnd = endTime || draft.end_time;
    const duration = hoursBetween(newStart, newEnd);
    if (duration <= 0) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }
    const totalCost = Math.round(duration * hourlyRate * 100) / 100;

    const result = await db.query(
      `UPDATE bookings
       SET match_id = $1, ambassador_id = $2, event_name = $3, event_date = $4,
           start_time = $5, end_time = $6, duration = $7, event_location = $8,
           hourly_rate = $9, total_cost = $10, notes = $11, updated_at = CURRENT_TIMESTAMP
       WHERE id = $12
       RETURNING *`,
      [
        matchId,
        effectiveAmbassadorId,
        eventName !== undefined ? eventName : draft.event_name,
        eventDate || draft.event_date,
        newStart,
        newEnd,
        duration,
        eventLocation !== undefined ? eventLocation : draft.event_location,
        hourlyRate,
        totalCost,
        notes !== undefined ? notes : draft.notes,
        id,
      ]
    );

    res.json({ message: 'Draft updated', booking: result.rows[0] });
  } catch (error) {
    console.error('Update draft error:', error);
    res.status(500).json({ error: 'Failed to update draft' });
  }
};

// Send a draft: turn it into a real pending booking (or auto-confirm for
// preview) and notify the ambassador by email.
const sendDraftBooking = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'brand' && req.user.role !== 'account_manager') {
      return res.status(403).json({ error: 'Only brands and account managers can send drafts' });
    }

    const draft = (await db.query('SELECT * FROM bookings WHERE id = $1', [id])).rows[0];
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }
    if (draft.status !== 'draft') {
      return res.status(400).json({ error: 'This booking is not a draft' });
    }
    if (!(await canManageBooking(req, draft))) {
      return res.status(403).json({ error: 'You do not have access to this draft' });
    }

    // Event date must not be in the past
    const eventDateObj = new Date(draft.event_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (eventDateObj < today) {
      return res.status(400).json({ error: 'Update the event date before sending — it is in the past' });
    }

    // Preview bookings auto-confirm and skip the email
    const brandCheck = await db.query('SELECT is_preview, name FROM users WHERE id = $1', [draft.brand_id]);
    const ambCheck = await db.query(
      'SELECT email, name, is_preview_ambassador FROM users WHERE id = $1',
      [draft.ambassador_id]
    );
    const isPreviewBooking = brandCheck.rows[0]?.is_preview && ambCheck.rows[0]?.is_preview_ambassador;
    const newStatus = isPreviewBooking ? 'confirmed' : 'pending';

    const result = await db.query(
      `UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [newStatus, id]
    );
    const booking = result.rows[0];

    // Notify the ambassador (non-blocking, skip for preview)
    if (!isPreviewBooking && ambCheck.rows[0]) {
      sendBookingRequestEmail({
        ambassadorEmail: ambCheck.rows[0].email,
        ambassadorName: ambCheck.rows[0].name,
        brandName: brandCheck.rows[0]?.name,
        eventName: booking.event_name,
        eventDate: booking.event_date,
        startTime: booking.start_time,
        endTime: booking.end_time,
        eventLocation: booking.event_location,
        hourlyRate: booking.hourly_rate,
        totalCost: booking.total_cost,
        notes: booking.notes,
      }).catch(err => console.error('Failed to send booking request email:', err));
    }

    res.json({
      message: isPreviewBooking ? 'Booking confirmed' : 'Booking sent to ambassador',
      booking,
      autoConfirmed: isPreviewBooking,
    });
  } catch (error) {
    console.error('Send draft error:', error);
    res.status(500).json({ error: 'Failed to send draft' });
  }
};

const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;

    // Only brands and account managers can delete bookings
    if (req.user.role !== 'brand' && req.user.role !== 'account_manager') {
      return res.status(403).json({ error: 'Only brands and account managers can delete bookings' });
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

    // Check if user is a preview brand (for demo purposes)
    const userCheck = await db.query(
      'SELECT role, is_preview FROM users WHERE id = $1',
      [req.user.userId]
    );

    const isPreviewBrand = userCheck.rows[0]?.role === 'brand' && userCheck.rows[0]?.is_preview;

    // Only ambassadors and account managers can check in (or preview brands for demo)
    if (req.user.role !== 'ambassador' && req.user.role !== 'account_manager' && !isPreviewBrand) {
      return res.status(403).json({ error: 'Only ambassadors and account managers can check in' });
    }

    // Get the booking (allow preview brands to check in for their own bookings)
    const bookingQuery = isPreviewBrand
      ? 'SELECT * FROM bookings WHERE id = $1 AND brand_id = $2'
      : 'SELECT * FROM bookings WHERE id = $1 AND ambassador_id = $2';

    const bookingCheck = await db.query(bookingQuery, [id, req.user.userId]);

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

    // Check if user is a preview brand (for demo purposes)
    const userCheck = await db.query(
      'SELECT role, is_preview FROM users WHERE id = $1',
      [req.user.userId]
    );

    const isPreviewBrand = userCheck.rows[0]?.role === 'brand' && userCheck.rows[0]?.is_preview;

    // Only ambassadors and account managers can check out (or preview brands for demo)
    if (req.user.role !== 'ambassador' && req.user.role !== 'account_manager' && !isPreviewBrand) {
      return res.status(403).json({ error: 'Only ambassadors and account managers can check out' });
    }

    // Get the booking (allow preview brands to check out for their own bookings)
    const bookingQuery = isPreviewBrand
      ? 'SELECT * FROM bookings WHERE id = $1 AND brand_id = $2'
      : 'SELECT * FROM bookings WHERE id = $1 AND ambassador_id = $2';

    const bookingCheck = await db.query(bookingQuery, [id, req.user.userId]);

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
  updateBookingTimes,
  duplicateBooking,
  updateDraftBooking,
  sendDraftBooking,
  deleteBooking,
  checkIn,
  checkOut,
  getTimeStatus,
};
