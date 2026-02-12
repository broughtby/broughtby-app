const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { resetUserDataById } = require('../db/reset-user-data');

// Search users by email or name (admin only)
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    let result;

    // If no search query, return all users (for admin dropdowns)
    if (!q || q.trim().length === 0) {
      result = await db.query(
        `SELECT id, email, role, name, profile_photo, is_admin, company_name
         FROM users
         WHERE is_active = TRUE
         ORDER BY role ASC, name ASC
         LIMIT 100`,
        []
      );
    } else {
      // Search by email or name
      const searchTerm = `%${q.trim().toLowerCase()}%`;

      result = await db.query(
        `SELECT id, email, role, name, profile_photo, is_admin, company_name
         FROM users
         WHERE (LOWER(email) LIKE $1 OR LOWER(name) LIKE $1)
         AND is_active = TRUE
         ORDER BY name ASC
         LIMIT 20`,
        [searchTerm]
      );
    }

    const users = result.rows.map(user => ({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      company_name: user.company_name,
      profile_photo: user.profile_photo,
      isAdmin: user.is_admin || false
    }));

    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
};

// Impersonate a user (admin only)
const impersonateUser = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Fetch the user to impersonate
    const result = await db.query(
      `SELECT id, email, role, name, profile_photo, bio, location, age,
              skills, hourly_rate, availability, rating, is_admin
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetUser = result.rows[0];

    // Generate new JWT for impersonated user with originalAdminId
    const token = jwt.sign(
      {
        userId: targetUser.id,
        email: targetUser.email,
        role: targetUser.role,
        isAdmin: targetUser.is_admin || false,
        originalAdminId: req.user.userId, // Store original admin ID
        isImpersonating: true
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Impersonation started',
      token,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        role: targetUser.role,
        name: targetUser.name,
        profile_photo: targetUser.profile_photo,
        bio: targetUser.bio,
        location: targetUser.location,
        age: targetUser.age,
        skills: targetUser.skills,
        hourly_rate: targetUser.hourly_rate,
        availability: targetUser.availability,
        rating: targetUser.rating,
        isAdmin: targetUser.is_admin || false,
      },
      originalAdminId: req.user.userId
    });
  } catch (error) {
    console.error('Impersonate user error:', error);
    res.status(500).json({ error: 'Failed to impersonate user' });
  }
};

// Stop impersonation and return to admin view
const stopImpersonation = async (req, res) => {
  try {
    // Check if currently impersonating
    if (!req.user.isImpersonating || !req.user.originalAdminId) {
      return res.status(400).json({ error: 'Not currently impersonating' });
    }

    const originalAdminId = req.user.originalAdminId;

    // Fetch original admin user
    const result = await db.query(
      `SELECT id, email, role, name, profile_photo, bio, location, age,
              skills, hourly_rate, availability, rating, is_admin
       FROM users WHERE id = $1`,
      [originalAdminId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Original admin user not found' });
    }

    const adminUser = result.rows[0];

    // Generate new JWT for original admin
    const token = jwt.sign(
      {
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        isAdmin: adminUser.is_admin || false
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Impersonation stopped',
      token,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        name: adminUser.name,
        profile_photo: adminUser.profile_photo,
        bio: adminUser.bio,
        location: adminUser.location,
        age: adminUser.age,
        skills: adminUser.skills,
        hourly_rate: adminUser.hourly_rate,
        availability: adminUser.availability,
        rating: adminUser.rating,
        isAdmin: adminUser.is_admin || false,
      }
    });
  } catch (error) {
    console.error('Stop impersonation error:', error);
    res.status(500).json({ error: 'Failed to stop impersonation' });
  }
};

// Reset demo data for a specific user (admin only)
const resetDemoData = async (req, res) => {
  try {
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required' });
    }

    // Verify the target user exists first
    const userCheck = await db.query(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [targetUserId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    const targetUser = userCheck.rows[0];

    // Log the action (who performed it and when)
    const adminInfo = req.user.isImpersonating
      ? `Admin ID ${req.user.originalAdminId} (impersonating user ${req.user.userId})`
      : `Admin ID ${req.user.userId}`;

    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`🔄 ADMIN ACTION: Reset Demo Data`);
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    console.log(`👤 Performed by: ${adminInfo}`);
    console.log(`🎯 Target user: ${targetUser.name} (${targetUser.email}) [ID: ${targetUser.id}]`);
    console.log(`📋 Role: ${targetUser.role}`);
    console.log('═══════════════════════════════════════════════════════════════');

    // Execute the reset
    const result = await resetUserDataById(targetUserId);

    // Log the results
    console.log('✅ Reset completed successfully');
    console.log(`📊 Deleted: ${result.deleted.messages} messages, ${result.deleted.bookings} bookings, ${result.deleted.matches} matches, ${result.deleted.likes} likes, ${result.deleted.passes} passes`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    res.json({
      success: true,
      message: 'Demo data reset successfully',
      user: result.user,
      deleted: result.deleted
    });

  } catch (error) {
    console.error('Reset demo data error:', error);
    res.status(500).json({
      error: 'Failed to reset demo data',
      details: error.message
    });
  }
};

// Admin-only: Create engagement (auto-assigns AM to brand)
const createEngagement = async (req, res) => {
  try {
    const { brandId, accountManagerId, monthlyRate, startDate, endDate, notes } = req.body;

    // Validate required fields
    if (!brandId || !accountManagerId || !monthlyRate || !startDate) {
      return res.status(400).json({ error: 'Brand ID, Account Manager ID, monthly rate, and start date are required' });
    }

    // Verify brand exists and is actually a brand
    const brandCheck = await db.query(
      'SELECT id, role FROM users WHERE id = $1 AND role = $2',
      [brandId, 'brand']
    );

    if (brandCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    // Verify account manager exists and is actually an account manager
    const amCheck = await db.query(
      'SELECT id, role FROM users WHERE id = $1 AND role = $2',
      [accountManagerId, 'account_manager']
    );

    if (amCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Account manager not found' });
    }

    // Check if an active engagement already exists
    const existingEngagement = await db.query(
      `SELECT id FROM engagements
       WHERE brand_id = $1 AND account_manager_id = $2
       AND status = 'active'`,
      [brandId, accountManagerId]
    );

    if (existingEngagement.rows.length > 0) {
      return res.status(400).json({ error: 'An active engagement already exists between this brand and account manager' });
    }

    // First, check if a match already exists
    let matchId;
    const matchCheck = await db.query(
      `SELECT id FROM matches
       WHERE brand_id = $1 AND ambassador_id = $2`,
      [brandId, accountManagerId]
    );

    if (matchCheck.rows.length > 0) {
      matchId = matchCheck.rows[0].id;
    } else {
      // Auto-create match to enable messaging
      const matchResult = await db.query(
        `INSERT INTO matches (brand_id, ambassador_id)
         VALUES ($1, $2)
         RETURNING id`,
        [brandId, accountManagerId]
      );
      matchId = matchResult.rows[0].id;
    }

    // Create engagement with status = 'active' (no pending state)
    const result = await db.query(
      `INSERT INTO engagements (
        match_id, brand_id, account_manager_id, monthly_rate, start_date, end_date, notes, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
      RETURNING *`,
      [matchId, brandId, accountManagerId, monthlyRate, startDate, endDate || null, notes || null]
    );

    const engagement = result.rows[0];

    // Send notification emails (non-blocking)
    const { sendEngagementCreatedEmail } = require('../services/emailService');

    Promise.all([
      db.query('SELECT name, email FROM users WHERE id = $1', [brandId]),
      db.query('SELECT name, email FROM users WHERE id = $1', [accountManagerId])
    ]).then(([brandQuery, amQuery]) => {
      if (brandQuery.rows.length > 0 && amQuery.rows.length > 0) {
        const brand = brandQuery.rows[0];
        const am = amQuery.rows[0];

        sendEngagementCreatedEmail({
          brandEmail: brand.email,
          brandName: brand.name,
          amEmail: am.email,
          amName: am.name,
          monthlyRate,
          startDate
        }).catch(error => console.error('Failed to send engagement created emails:', error));
      }
    }).catch(error => console.error('Failed to query user info for emails:', error));

    res.status(201).json({
      message: 'Engagement created successfully',
      engagement,
    });
  } catch (error) {
    console.error('Create engagement error:', error);
    res.status(500).json({ error: 'Failed to create engagement' });
  }
};

// Admin-only: Get all engagements
const getAllEngagements = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT e.*,
              b.name as brand_name,
              b.company_name as brand_company_name,
              b.email as brand_email,
              b.profile_photo as brand_photo,
              am.name as account_manager_name,
              am.email as account_manager_email,
              am.profile_photo as account_manager_photo
       FROM engagements e
       JOIN users b ON e.brand_id = b.id
       JOIN users am ON e.account_manager_id = am.id
       ORDER BY e.created_at DESC`
    );

    res.json({ engagements: result.rows });
  } catch (error) {
    console.error('Get all engagements error:', error);
    res.status(500).json({ error: 'Failed to fetch engagements' });
  }
};

// Admin-only: Update engagement
const updateEngagement = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, endDate, monthlyRate, notes } = req.body;

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (status && ['active', 'paused', 'ended'].includes(status)) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (endDate !== undefined) {
      updates.push(`end_date = $${paramCount}`);
      values.push(endDate);
      paramCount++;
    }

    if (monthlyRate !== undefined) {
      updates.push(`monthly_rate = $${paramCount}`);
      values.push(monthlyRate);
      paramCount++;
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramCount}`);
      values.push(notes);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE engagements
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Engagement not found' });
    }

    res.json({
      message: 'Engagement updated successfully',
      engagement: result.rows[0],
    });
  } catch (error) {
    console.error('Update engagement error:', error);
    res.status(500).json({ error: 'Failed to update engagement' });
  }
};

module.exports = {
  searchUsers,
  impersonateUser,
  stopImpersonation,
  resetDemoData,
  createEngagement,
  getAllEngagements,
  updateEngagement
};
