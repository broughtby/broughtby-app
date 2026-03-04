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

// Get all users with complete status information (admin only)
const getAllUsersWithStatus = async (req, res) => {
  try {
    const { role } = req.query; // Optional filter by role

    let query = `
      SELECT
        id,
        email,
        role,
        name,
        company_name,
        profile_photo,
        is_admin,
        is_active,
        is_test,
        is_preview,
        is_preview_ambassador,
        created_at
      FROM users
      ORDER BY created_at DESC
    `;

    const params = [];

    // Add role filter if provided
    if (role && ['brand', 'ambassador', 'account_manager'].includes(role)) {
      query = `
        SELECT
          id,
          email,
          role,
          name,
          company_name,
          profile_photo,
          is_admin,
          is_active,
          is_test,
          is_preview,
          is_preview_ambassador,
          created_at
        FROM users
        WHERE role = $1
        ORDER BY created_at DESC
      `;
      params.push(role);
    }

    const result = await db.query(query, params);

    const users = result.rows.map(user => ({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      company_name: user.company_name,
      profile_photo: user.profile_photo,
      createdAt: user.created_at,
      status: {
        isAdmin: user.is_admin || false,
        isActive: user.is_active !== false, // Default to true
        isTest: user.is_test || false,
        isPreview: user.is_preview || false,
        isPreviewAmbassador: user.is_preview_ambassador || false
      }
    }));

    res.json({ users });
  } catch (error) {
    console.error('Get all users with status error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
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

module.exports = {
  searchUsers,
  getAllUsersWithStatus,
  impersonateUser,
  stopImpersonation,
  resetDemoData
};
