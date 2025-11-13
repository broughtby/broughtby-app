const db = require('../config/database');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function resetUserData() {
  // Get email from command line argument or use default
  const userEmail = process.argv[2] || 'brooke+doggie@broughtby.co';

  console.log('\n🔄 ═══════════════════════════════════════════════════════════════');
  console.log('🔄 RESET USER DATA');
  console.log('🔄 ═══════════════════════════════════════════════════════════════');
  console.log(`\n📧 User: ${userEmail}`);
  console.log('\n📋 This script will DELETE:');
  console.log('   • All messages sent by this user');
  console.log('   • All bookings involving this user');
  console.log('   • All matches involving this user');
  console.log('   • All likes/partnership requests involving this user');
  console.log('   • All passes involving this user');
  console.log('\n✅ This script will PRESERVE:');
  console.log('   • User profile (name, bio, photo, skills, etc.)');
  console.log('   • User account credentials');
  console.log('\n⚠️  This operation CANNOT be undone!');
  console.log('⚠️  ═══════════════════════════════════════════════════════════════\n');

  const client = await db.pool.connect();

  try {
    // Find the user
    const userResult = await client.query(
      'SELECT id, email, name, role FROM users WHERE email = $1',
      [userEmail]
    );

    if (userResult.rows.length === 0) {
      console.log(`❌ Error: User with email "${userEmail}" not found.`);
      rl.close();
      await client.release();
      await db.pool.end();
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log(`✓ Found user: ${user.name} (${user.role})\n`);

    // Confirmation
    const confirm = await question('Are you sure you want to reset this user\'s data? (yes/no): ');

    if (confirm.toLowerCase() !== 'yes') {
      console.log('\n❌ Operation cancelled.');
      rl.close();
      await client.release();
      await db.pool.end();
      process.exit(0);
    }

    rl.close();

    console.log('\n🔄 Starting data reset...\n');

    // Start transaction
    await client.query('BEGIN');

    // Count records before deletion
    const messageCounts = await client.query(
      'SELECT COUNT(*) FROM messages WHERE sender_id = $1',
      [user.id]
    );

    const bookingCounts = await client.query(
      'SELECT COUNT(*) FROM bookings WHERE brand_id = $1 OR ambassador_id = $1',
      [user.id]
    );

    const matchCounts = await client.query(
      'SELECT COUNT(*) FROM matches WHERE brand_id = $1 OR ambassador_id = $1',
      [user.id]
    );

    const likeCounts = await client.query(
      'SELECT COUNT(*) FROM likes WHERE brand_id = $1 OR ambassador_id = $1',
      [user.id]
    );

    const passCounts = await client.query(
      'SELECT COUNT(*) FROM passes WHERE brand_id = $1 OR ambassador_id = $1',
      [user.id]
    );

    console.log('📊 Found:');
    console.log(`   Messages: ${messageCounts.rows[0].count}`);
    console.log(`   Bookings: ${bookingCounts.rows[0].count}`);
    console.log(`   Matches: ${matchCounts.rows[0].count}`);
    console.log(`   Likes: ${likeCounts.rows[0].count}`);
    console.log(`   Passes: ${passCounts.rows[0].count}`);
    console.log('\n🗑️  Deleting records...\n');

    // Delete in correct order to respect foreign key constraints

    // 1. Delete messages where user is sender
    console.log('   Deleting messages...');
    await client.query('DELETE FROM messages WHERE sender_id = $1', [user.id]);
    console.log('   ✓ Deleted messages');

    // 2. Delete bookings involving this user
    console.log('   Deleting bookings...');
    await client.query(
      'DELETE FROM bookings WHERE brand_id = $1 OR ambassador_id = $1',
      [user.id]
    );
    console.log('   ✓ Deleted bookings');

    // 3. Delete matches involving this user
    console.log('   Deleting matches...');
    await client.query(
      'DELETE FROM matches WHERE brand_id = $1 OR ambassador_id = $1',
      [user.id]
    );
    console.log('   ✓ Deleted matches');

    // 4. Delete likes involving this user
    console.log('   Deleting likes...');
    await client.query(
      'DELETE FROM likes WHERE brand_id = $1 OR ambassador_id = $1',
      [user.id]
    );
    console.log('   ✓ Deleted likes');

    // 5. Delete passes involving this user
    console.log('   Deleting passes...');
    await client.query(
      'DELETE FROM passes WHERE brand_id = $1 OR ambassador_id = $1',
      [user.id]
    );
    console.log('   ✓ Deleted passes');

    // Commit transaction
    await client.query('COMMIT');

    // Verify user profile still exists
    const verifyUser = await client.query(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [user.id]
    );

    console.log('\n✅ User data reset completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   Deleted ${messageCounts.rows[0].count} messages`);
    console.log(`   Deleted ${bookingCounts.rows[0].count} bookings`);
    console.log(`   Deleted ${matchCounts.rows[0].count} matches`);
    console.log(`   Deleted ${likeCounts.rows[0].count} likes`);
    console.log(`   Deleted ${passCounts.rows[0].count} passes`);
    console.log(`\n✓ User profile preserved: ${verifyUser.rows[0].name} (${verifyUser.rows[0].email})`);
    console.log('\n🎬 Ready for demo recording!\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error during reset:', error);
    console.error('🔄 Transaction rolled back - no data was deleted.');
    throw error;
  } finally {
    client.release();
    await db.pool.end();
  }
}

/**
 * Reusable function to reset user data by userId
 * Can be called from API endpoints without CLI interface
 * @param {number} userId - The user ID to reset
 * @returns {Promise<Object>} - Summary of deleted records
 */
async function resetUserDataById(userId) {
  const client = await db.pool.connect();

  try {
    // Find the user
    const userResult = await client.query(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const user = userResult.rows[0];

    // Start transaction
    await client.query('BEGIN');

    // Count records before deletion
    const messageCounts = await client.query(
      'SELECT COUNT(*) FROM messages WHERE sender_id = $1',
      [user.id]
    );

    const bookingCounts = await client.query(
      'SELECT COUNT(*) FROM bookings WHERE brand_id = $1 OR ambassador_id = $1',
      [user.id]
    );

    const matchCounts = await client.query(
      'SELECT COUNT(*) FROM matches WHERE brand_id = $1 OR ambassador_id = $1',
      [user.id]
    );

    const likeCounts = await client.query(
      'SELECT COUNT(*) FROM likes WHERE brand_id = $1 OR ambassador_id = $1',
      [user.id]
    );

    const passCounts = await client.query(
      'SELECT COUNT(*) FROM passes WHERE brand_id = $1 OR ambassador_id = $1',
      [user.id]
    );

    // Delete in correct order to respect foreign key constraints

    // 1. Delete messages where user is sender
    await client.query('DELETE FROM messages WHERE sender_id = $1', [user.id]);

    // 2. Delete bookings involving this user
    await client.query(
      'DELETE FROM bookings WHERE brand_id = $1 OR ambassador_id = $1',
      [user.id]
    );

    // 3. Delete matches involving this user
    await client.query(
      'DELETE FROM matches WHERE brand_id = $1 OR ambassador_id = $1',
      [user.id]
    );

    // 4. Delete likes involving this user
    await client.query(
      'DELETE FROM likes WHERE brand_id = $1 OR ambassador_id = $1',
      [user.id]
    );

    // 5. Delete passes involving this user
    await client.query(
      'DELETE FROM passes WHERE brand_id = $1 OR ambassador_id = $1',
      [user.id]
    );

    // Commit transaction
    await client.query('COMMIT');

    // Return summary
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      deleted: {
        messages: parseInt(messageCounts.rows[0].count),
        bookings: parseInt(bookingCounts.rows[0].count),
        matches: parseInt(matchCounts.rows[0].count),
        likes: parseInt(likeCounts.rows[0].count),
        passes: parseInt(passCounts.rows[0].count)
      }
    };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Run reset if this file is executed directly
if (require.main === module) {
  resetUserData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { resetUserData, resetUserDataById };
