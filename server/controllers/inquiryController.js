const db = require('../config/database');
const { sendInquiryNotificationEmail, sendInquiryResponseEmail } = require('../services/emailService');

// Create a new broadcast inquiry
const createInquiry = async (req, res) => {
  try {
    const {
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

    // Only brands can create inquiries
    if (req.user.role !== 'brand') {
      return res.status(403).json({ error: 'Only brands can create availability inquiries' });
    }

    const brandId = req.user.userId;

    // Validate event date is not in the past
    const eventDateObj = new Date(eventDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (eventDateObj < today) {
      return res.status(400).json({ error: 'Event date cannot be in the past' });
    }

    // Validate required fields
    if (!eventName || !eventDate || !startTime || !endTime || !eventLocation || !hourlyRate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create the inquiry
    const inquiryResult = await db.query(
      `INSERT INTO broadcast_inquiries
       (brand_id, event_name, event_date, start_time, end_time, duration, event_location, hourly_rate, total_cost, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [brandId, eventName, eventDate, startTime, endTime, duration, eventLocation, hourlyRate, totalCost, notes]
    );

    const inquiry = inquiryResult.rows[0];

    // Get all matched ambassadors for this brand
    const matchesResult = await db.query(
      `SELECT m.id as match_id, m.ambassador_id, u.name, u.email
       FROM matches m
       JOIN users u ON u.id = m.ambassador_id
       WHERE m.brand_id = $1 AND u.is_active = TRUE`,
      [brandId]
    );

    const matches = matchesResult.rows;

    if (matches.length === 0) {
      return res.status(400).json({ error: 'You have no matches to send this inquiry to' });
    }

    // Create pending responses for each matched ambassador
    const responsePromises = matches.map(match =>
      db.query(
        `INSERT INTO inquiry_responses (inquiry_id, ambassador_id, match_id, response)
         VALUES ($1, $2, $3, 'pending')`,
        [inquiry.id, match.ambassador_id, match.match_id]
      )
    );

    await Promise.all(responsePromises);

    // Get brand info for email notifications
    const brandResult = await db.query(
      'SELECT name, company_name FROM users WHERE id = $1',
      [brandId]
    );
    const brand = brandResult.rows[0];
    const brandName = brand.company_name || brand.name;

    // Send email notifications to all ambassadors (don't await - send async)
    matches.forEach(match => {
      sendInquiryNotificationEmail({
        ambassadorEmail: match.email,
        ambassadorName: match.name,
        brandName: brandName,
        eventName,
        eventDate,
        startTime,
        endTime,
        eventLocation,
        hourlyRate,
        totalCost,
        notes,
        inquiryId: inquiry.id
      }).catch(err => console.error('Error sending inquiry email:', err));
    });

    res.status(201).json({
      inquiry,
      ambassadorCount: matches.length,
      message: `Inquiry sent to ${matches.length} ambassador${matches.length > 1 ? 's' : ''}`
    });

  } catch (error) {
    console.error('Error creating inquiry:', error);
    res.status(500).json({ error: 'Failed to create inquiry' });
  }
};

// Get inquiries for the current user (different for brands vs ambassadors)
const getInquiries = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (userRole === 'brand') {
      // Brands see their sent inquiries with response counts
      const result = await db.query(
        `SELECT
          bi.*,
          COUNT(CASE WHEN ir.response = 'available' THEN 1 END) as available_count,
          COUNT(CASE WHEN ir.response = 'not_available' THEN 1 END) as not_available_count,
          COUNT(CASE WHEN ir.response = 'pending' THEN 1 END) as pending_count,
          COUNT(ir.id) as total_sent
         FROM broadcast_inquiries bi
         LEFT JOIN inquiry_responses ir ON ir.inquiry_id = bi.id
         WHERE bi.brand_id = $1
         GROUP BY bi.id
         ORDER BY bi.created_at DESC`,
        [userId]
      );

      res.json({ inquiries: result.rows });

    } else if (userRole === 'ambassador') {
      // Ambassadors see inquiries sent to them
      const result = await db.query(
        `SELECT
          bi.*,
          ir.response,
          ir.responded_at,
          ir.id as response_id,
          u.name as brand_name,
          u.company_name,
          u.company_logo
         FROM inquiry_responses ir
         JOIN broadcast_inquiries bi ON bi.id = ir.inquiry_id
         JOIN users u ON u.id = bi.brand_id
         WHERE ir.ambassador_id = $1
         ORDER BY bi.created_at DESC`,
        [userId]
      );

      res.json({ inquiries: result.rows });

    } else {
      res.status(403).json({ error: 'Unauthorized' });
    }

  } catch (error) {
    console.error('Error getting inquiries:', error);
    res.status(500).json({ error: 'Failed to get inquiries' });
  }
};

// Get responses for a specific inquiry (brand only)
const getInquiryResponses = async (req, res) => {
  try {
    const { inquiryId } = req.params;
    const userId = req.user.userId;

    // Verify the inquiry belongs to this brand
    const inquiryCheck = await db.query(
      'SELECT * FROM broadcast_inquiries WHERE id = $1 AND brand_id = $2',
      [inquiryId, userId]
    );

    if (inquiryCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Inquiry not found or you do not have access' });
    }

    const inquiry = inquiryCheck.rows[0];

    // Get all responses with ambassador details
    const responsesResult = await db.query(
      `SELECT
        ir.*,
        u.name,
        u.profile_photo,
        u.bio,
        u.location,
        u.skills,
        u.hourly_rate,
        u.rating,
        m.id as match_id
       FROM inquiry_responses ir
       JOIN users u ON u.id = ir.ambassador_id
       JOIN matches m ON m.id = ir.match_id
       WHERE ir.inquiry_id = $1
       ORDER BY
         CASE ir.response
           WHEN 'available' THEN 1
           WHEN 'pending' THEN 2
           WHEN 'not_available' THEN 3
           WHEN 'selected' THEN 4
           WHEN 'not_selected' THEN 5
         END,
         ir.responded_at ASC`,
      [inquiryId]
    );

    res.json({
      inquiry,
      responses: responsesResult.rows
    });

  } catch (error) {
    console.error('Error getting inquiry responses:', error);
    res.status(500).json({ error: 'Failed to get responses' });
  }
};

// Ambassador responds to an inquiry
const respondToInquiry = async (req, res) => {
  try {
    const { inquiryId } = req.params;
    const { response } = req.body; // 'available' or 'not_available'
    const ambassadorId = req.user.userId;

    // Only ambassadors can respond
    if (req.user.role !== 'ambassador') {
      return res.status(403).json({ error: 'Only ambassadors can respond to inquiries' });
    }

    // Validate response value
    if (!['available', 'not_available'].includes(response)) {
      return res.status(400).json({ error: 'Invalid response. Must be "available" or "not_available"' });
    }

    // Check if inquiry exists and is still open
    const inquiryCheck = await db.query(
      'SELECT * FROM broadcast_inquiries WHERE id = $1',
      [inquiryId]
    );

    if (inquiryCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Inquiry not found' });
    }

    const inquiry = inquiryCheck.rows[0];

    if (inquiry.status !== 'open') {
      return res.status(400).json({ error: 'This inquiry is no longer accepting responses' });
    }

    // Update the response
    const result = await db.query(
      `UPDATE inquiry_responses
       SET response = $1, responded_at = CURRENT_TIMESTAMP
       WHERE inquiry_id = $2 AND ambassador_id = $3
       RETURNING *`,
      [response, inquiryId, ambassadorId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Response not found. You may not have received this inquiry.' });
    }

    // Get ambassador and brand info for email notification
    const ambassadorResult = await db.query(
      'SELECT name FROM users WHERE id = $1',
      [ambassadorId]
    );
    const ambassadorName = ambassadorResult.rows[0].name;

    const brandResult = await db.query(
      'SELECT email, name, company_name FROM users WHERE id = $1',
      [inquiry.brand_id]
    );
    const brand = brandResult.rows[0];

    // Send email notification to brand (async)
    sendInquiryResponseEmail({
      brandEmail: brand.email,
      brandName: brand.company_name || brand.name,
      ambassadorName,
      response,
      eventName: inquiry.event_name,
      eventDate: inquiry.event_date,
      inquiryId: inquiry.id
    }).catch(err => console.error('Error sending response email:', err));

    res.json({
      message: 'Response recorded successfully',
      response: result.rows[0]
    });

  } catch (error) {
    console.error('Error responding to inquiry:', error);
    res.status(500).json({ error: 'Failed to record response' });
  }
};

// Brand selects an ambassador from available responses (creates booking)
const selectAmbassador = async (req, res) => {
  try {
    const { inquiryId } = req.params;
    const { ambassadorId } = req.body;
    const brandId = req.user.userId;

    // Only brands can select ambassadors
    if (req.user.role !== 'brand') {
      return res.status(403).json({ error: 'Only brands can select ambassadors' });
    }

    // Verify inquiry belongs to this brand
    const inquiryResult = await db.query(
      'SELECT * FROM broadcast_inquiries WHERE id = $1 AND brand_id = $2',
      [inquiryId, brandId]
    );

    if (inquiryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Inquiry not found or you do not have access' });
    }

    const inquiry = inquiryResult.rows[0];

    if (inquiry.status !== 'open') {
      return res.status(400).json({ error: 'This inquiry is no longer open' });
    }

    // Verify the ambassador responded as available
    const responseResult = await db.query(
      'SELECT * FROM inquiry_responses WHERE inquiry_id = $1 AND ambassador_id = $2 AND response = $3',
      [inquiryId, ambassadorId, 'available']
    );

    if (responseResult.rows.length === 0) {
      return res.status(400).json({ error: 'This ambassador did not respond as available' });
    }

    const selectedResponse = responseResult.rows[0];

    // Check for booking conflicts
    const conflictCheck = await db.query(
      `SELECT id FROM bookings
       WHERE ambassador_id = $1
         AND event_date = $2
         AND status IN ('confirmed', 'pending')
         AND (
           (start_time, end_time) OVERLAPS ($3::time, $4::time)
         )`,
      [ambassadorId, inquiry.event_date, inquiry.start_time, inquiry.end_time]
    );

    if (conflictCheck.rows.length > 0) {
      return res.status(400).json({
        error: 'This ambassador has a conflicting booking. Please select a different ambassador.'
      });
    }

    // Create the booking
    const bookingResult = await db.query(
      `INSERT INTO bookings
       (match_id, brand_id, ambassador_id, event_name, event_date, start_time, end_time,
        duration, event_location, hourly_rate, total_cost, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending')
       RETURNING *`,
      [
        selectedResponse.match_id,
        brandId,
        ambassadorId,
        inquiry.event_name,
        inquiry.event_date,
        inquiry.start_time,
        inquiry.end_time,
        inquiry.duration,
        inquiry.event_location,
        inquiry.hourly_rate,
        inquiry.total_cost,
        inquiry.notes
      ]
    );

    const booking = bookingResult.rows[0];

    // Update inquiry status to filled
    await db.query(
      'UPDATE broadcast_inquiries SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['filled', inquiryId]
    );

    // Mark selected response
    await db.query(
      `UPDATE inquiry_responses
       SET response = 'selected', booking_id = $1
       WHERE inquiry_id = $2 AND ambassador_id = $3`,
      [booking.id, inquiryId, ambassadorId]
    );

    // Mark other responses as not_selected
    await db.query(
      `UPDATE inquiry_responses
       SET response = 'not_selected'
       WHERE inquiry_id = $1 AND ambassador_id != $2 AND response = 'available'`,
      [inquiryId, ambassadorId]
    );

    res.json({
      message: 'Ambassador selected and booking request created',
      booking
    });

  } catch (error) {
    console.error('Error selecting ambassador:', error);
    res.status(500).json({ error: 'Failed to select ambassador' });
  }
};

// Cancel an inquiry (brand only)
const cancelInquiry = async (req, res) => {
  try {
    const { inquiryId } = req.params;
    const brandId = req.user.userId;

    // Only brands can cancel their inquiries
    if (req.user.role !== 'brand') {
      return res.status(403).json({ error: 'Only brands can cancel inquiries' });
    }

    // Verify inquiry belongs to this brand
    const inquiryCheck = await db.query(
      'SELECT * FROM broadcast_inquiries WHERE id = $1 AND brand_id = $2',
      [inquiryId, brandId]
    );

    if (inquiryCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Inquiry not found or you do not have access' });
    }

    // Update status to cancelled
    await db.query(
      'UPDATE broadcast_inquiries SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['cancelled', inquiryId]
    );

    res.json({ message: 'Inquiry cancelled successfully' });

  } catch (error) {
    console.error('Error cancelling inquiry:', error);
    res.status(500).json({ error: 'Failed to cancel inquiry' });
  }
};

module.exports = {
  createInquiry,
  getInquiries,
  getInquiryResponses,
  respondToInquiry,
  selectAmbassador,
  cancelInquiry,
};
