/**
 * Script to recalculate all user ratings based on their reviews
 * Run this after making booking_id nullable or after backfilling reviews
 *
 * Usage: node server/db/recalculate-ratings.js
 */

const db = require('../config/database');

async function recalculateAllRatings() {
  try {
    console.log('🔄 Starting rating recalculation...');

    // Get all users who have received reviews
    const usersWithReviews = await db.query(
      `SELECT DISTINCT reviewee_id
       FROM reviews
       ORDER BY reviewee_id`
    );

    console.log(`📊 Found ${usersWithReviews.rows.length} users with reviews`);

    let updated = 0;
    let errors = 0;

    // Recalculate rating for each user
    for (const row of usersWithReviews.rows) {
      const userId = row.reviewee_id;

      try {
        // Calculate average rating from all reviews
        const result = await db.query(
          'SELECT AVG(overall_rating)::numeric(3,2) as avg_rating FROM reviews WHERE reviewee_id = $1',
          [userId]
        );

        const avgRating = result.rows[0].avg_rating || 0;

        // Update user's rating
        await db.query(
          'UPDATE users SET rating = $1 WHERE id = $2',
          [avgRating, userId]
        );

        // Get user info for logging
        const userInfo = await db.query(
          'SELECT name, role FROM users WHERE id = $1',
          [userId]
        );

        const userName = userInfo.rows[0]?.name || 'Unknown';
        const userRole = userInfo.rows[0]?.role || 'unknown';

        console.log(`✓ Updated ${userName} (${userRole}): rating = ${avgRating}`);
        updated++;
      } catch (error) {
        console.error(`✗ Failed to update user ${userId}:`, error.message);
        errors++;
      }
    }

    console.log('\n📈 Rating recalculation complete:');
    console.log(`   ✓ Successfully updated: ${updated}`);
    console.log(`   ✗ Errors: ${errors}`);

    // Also set rating to 0 for users with no reviews
    const noReviews = await db.query(
      `UPDATE users
       SET rating = 0
       WHERE id NOT IN (SELECT DISTINCT reviewee_id FROM reviews)
       AND rating IS NOT NULL
       RETURNING id, name, role`
    );

    if (noReviews.rows.length > 0) {
      console.log(`\n🔄 Reset rating to 0 for ${noReviews.rows.length} users with no reviews`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the recalculation
recalculateAllRatings();
