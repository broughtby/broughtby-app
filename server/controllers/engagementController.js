const db = require('../config/database');
const { sendEngagementRequestEmail, sendEngagementAcceptedEmail } = require('../services/emailService');

const createEngagement = async (req, res) => {
  try {
    const { matchId, accountManagerId, monthlyRate, startDate, endDate, notes } = req.body;

    // Only brands can create engagements
    if (req.user.role !== 'brand') {
      return res.status(403).json({ error: 'Only brands can create engagements' });
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

    // Verify the account manager in the engagement matches the match
    if (match.ambassador_id !== accountManagerId) {
      return res.status(400).json({ error: 'Account manager does not match the partnership' });
    }

    // Verify the user is actually an account manager
    const amCheck = await db.query(
      'SELECT id, role, monthly_rate FROM users WHERE id = $1 AND role = $2',
      [accountManagerId, 'account_manager']
    );

    if (amCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Account manager not found' });
    }

    // Check if an active or pending engagement already exists
    const existingEngagement = await db.query(
      `SELECT id FROM engagements
       WHERE brand_id = $1 AND account_manager_id = $2
       AND status IN ('pending', 'active')`,
      [req.user.userId, accountManagerId]
    );

    if (existingEngagement.rows.length > 0) {
      return res.status(400).json({ error: 'An active engagement already exists with this account manager' });
    }

    // Validate start date is not in the past
    const startDateObj = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDateObj < today) {
      return res.status(400).json({ error: 'Start date cannot be in the past' });
    }

    // Validate end date is after start date (if provided)
    if (endDate) {
      const endDateObj = new Date(endDate);
      if (endDateObj <= startDateObj) {
        return res.status(400).json({ error: 'End date must be after start date' });
      }
    }

    // Create engagement
    const result = await db.query(
      `INSERT INTO engagements (
        match_id, brand_id, account_manager_id, monthly_rate, start_date, end_date, notes, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [matchId, req.user.userId, accountManagerId, monthlyRate, startDate, endDate || null, notes, 'pending']
    );

    const engagement = result.rows[0];

    // Send engagement request email to account manager (non-blocking)
    db.query(
      'SELECT name, email FROM users WHERE id = $1',
      [accountManagerId]
    ).then(amQuery => {
      if (amQuery.rows.length > 0) {
        const accountManager = amQuery.rows[0];

        // Get brand info for email
        db.query(
          'SELECT name, company_name FROM users WHERE id = $1',
          [req.user.userId]
        ).then(brandQuery => {
          if (brandQuery.rows.length > 0) {
            const brandName = brandQuery.rows[0].company_name || brandQuery.rows[0].name;

            sendEngagementRequestEmail({
              accountManagerEmail: accountManager.email,
              accountManagerName: accountManager.name,
              brandName,
              monthlyRate,
              startDate,
              notes,
            }).catch(error => console.error('Failed to send engagement request email:', error));
          }
        }).catch(error => console.error('Failed to query brand info:', error));
      }
    }).catch(error => console.error('Failed to query account manager info:', error));

    res.status(201).json({
      message: 'Engagement created successfully',
      engagement,
    });
  } catch (error) {
    console.error('Create engagement error:', error);
    res.status(500).json({ error: 'Failed to create engagement' });
  }
};

const getEngagements = async (req, res) => {
  try {
    let query;
    let params;

    if (req.user.role === 'brand') {
      // Get all engagements where user is the brand
      query = `
        SELECT e.*,
               u.name as account_manager_name,
               u.profile_photo as account_manager_photo,
               u.location as account_manager_location,
               u.email as account_manager_email
        FROM engagements e
        JOIN users u ON e.account_manager_id = u.id
        WHERE e.brand_id = $1
        ORDER BY e.created_at DESC
      `;
      params = [req.user.userId];
    } else if (req.user.role === 'account_manager') {
      // Get all engagements where user is the account manager
      query = `
        SELECT e.*,
               u.name as brand_name,
               u.profile_photo as brand_photo,
               u.location as brand_location,
               u.email as brand_email,
               u.company_name,
               u.company_logo
        FROM engagements e
        JOIN users u ON e.brand_id = u.id
        WHERE e.account_manager_id = $1
        ORDER BY e.created_at DESC
      `;
      params = [req.user.userId];
    } else {
      return res.status(403).json({ error: 'Only brands and account managers can view engagements' });
    }

    const result = await db.query(query, params);

    res.json({ engagements: result.rows });
  } catch (error) {
    console.error('Get engagements error:', error);
    res.status(500).json({ error: 'Failed to fetch engagements' });
  }
};

const updateEngagementStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'active', 'paused', 'ended', 'declined'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get the engagement
    const engagementCheck = await db.query(
      'SELECT * FROM engagements WHERE id = $1',
      [id]
    );

    if (engagementCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Engagement not found' });
    }

    const engagement = engagementCheck.rows[0];

    // Check if user has access to this engagement
    const hasAccess =
      (req.user.role === 'brand' && engagement.brand_id === req.user.userId) ||
      (req.user.role === 'account_manager' && engagement.account_manager_id === req.user.userId);

    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have access to this engagement' });
    }

    // Only account managers can accept or decline pending engagements
    if (engagement.status === 'pending' && (status === 'active' || status === 'declined')) {
      if (req.user.role !== 'account_manager') {
        return res.status(403).json({ error: 'Only account managers can accept or decline engagements' });
      }
    }

    // Update engagement status
    const result = await db.query(
      `UPDATE engagements
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    const updatedEngagement = result.rows[0];

    // Send engagement accepted email to brand if account manager accepted (non-blocking)
    if (engagement.status === 'pending' && status === 'active') {
      db.query(
        'SELECT name, email, company_name FROM users WHERE id = $1',
        [engagement.brand_id]
      ).then(brandQuery => {
        if (brandQuery.rows.length > 0) {
          const brand = brandQuery.rows[0];
          const brandName = brand.company_name || brand.name;

          // Get account manager info
          db.query(
            'SELECT name FROM users WHERE id = $1',
            [engagement.account_manager_id]
          ).then(amQuery => {
            if (amQuery.rows.length > 0) {
              const accountManagerName = amQuery.rows[0].name;

              sendEngagementAcceptedEmail({
                brandEmail: brand.email,
                brandName,
                accountManagerName,
                monthlyRate: engagement.monthly_rate,
                startDate: engagement.start_date,
              }).catch(error => console.error('Failed to send engagement accepted email:', error));
            }
          }).catch(error => console.error('Failed to query account manager info:', error));
        }
      }).catch(error => console.error('Failed to query brand info:', error));
    }

    res.json({
      message: 'Engagement status updated successfully',
      engagement: updatedEngagement,
    });
  } catch (error) {
    console.error('Update engagement status error:', error);
    res.status(500).json({ error: 'Failed to update engagement status' });
  }
};

const endEngagement = async (req, res) => {
  try {
    const { id } = req.params;
    const { endDate } = req.body;

    // Get the engagement
    const engagementCheck = await db.query(
      'SELECT * FROM engagements WHERE id = $1',
      [id]
    );

    if (engagementCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Engagement not found' });
    }

    const engagement = engagementCheck.rows[0];

    // Check if user has access (only brand can end engagement)
    if (req.user.role !== 'brand' || engagement.brand_id !== req.user.userId) {
      return res.status(403).json({ error: 'Only the brand can end an engagement' });
    }

    // Update engagement
    const result = await db.query(
      `UPDATE engagements
       SET status = 'ended', end_date = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [endDate || new Date(), id]
    );

    res.json({
      message: 'Engagement ended successfully',
      engagement: result.rows[0],
    });
  } catch (error) {
    console.error('End engagement error:', error);
    res.status(500).json({ error: 'Failed to end engagement' });
  }
};

const getAvailableBrands = async (req, res) => {
  try {
    // Only account managers can fetch their brand clients
    if (req.user.role !== 'account_manager') {
      return res.status(403).json({ error: 'Only account managers can access this endpoint' });
    }

    // Get all brands with active engagements for this AM
    const result = await db.query(
      `SELECT DISTINCT
         u.id,
         u.name,
         u.email,
         u.company_name,
         u.company_logo,
         u.profile_photo
       FROM engagements e
       JOIN users u ON e.brand_id = u.id
       WHERE e.account_manager_id = $1
       AND e.status = 'active'
       ORDER BY u.company_name, u.name`,
      [req.user.userId]
    );

    res.json({ brands: result.rows });
  } catch (error) {
    console.error('Get available brands error:', error);
    res.status(500).json({ error: 'Failed to fetch available brands' });
  }
};

module.exports = {
  createEngagement,
  getEngagements,
  updateEngagementStatus,
  endEngagement,
  getAvailableBrands,
};
