const db = require('../config/database');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function cleanTestData() {
  console.log('\n⚠️  ═══════════════════════════════════════════════════════════════');
  console.log('⚠️  WARNING: DATABASE CLEANUP OPERATION');
  console.log('⚠️  ═══════════════════════════════════════════════════════════════');
  console.log('\n📋 This script will DELETE ALL:');
  console.log('   • Messages');
  console.log('   • Bookings');
  console.log('   • Matches');
  console.log('   • Likes (partnership requests)');
  console.log('   • Passes');
  console.log('\n✅ This script will PRESERVE:');
  console.log('   • All user profiles and accounts');
  console.log('\n⚠️  This operation CANNOT be undone!');
  console.log('⚠️  ═══════════════════════════════════════════════════════════════\n');

  // First confirmation
  const confirm1 = await question('Are you sure you want to continue? (yes/no): ');

  if (confirm1.toLowerCase() !== 'yes') {
    console.log('\n❌ Operation cancelled.');
    rl.close();
    process.exit(0);
  }

  // Second confirmation - must type exact phrase
  console.log('\n⚠️  FINAL CONFIRMATION REQUIRED');
  const confirm2 = await question('Type "DELETE ALL DATA" to proceed: ');

  if (confirm2 !== 'DELETE ALL DATA') {
    console.log('\n❌ Operation cancelled. Confirmation phrase did not match.');
    rl.close();
    process.exit(0);
  }

  rl.close();

  const client = await db.pool.connect();

  try {
    console.log('\n🔄 Starting database cleanup...\n');

    // Start transaction
    await client.query('BEGIN');

    // Count records before deletion
    const messageCount = await client.query('SELECT COUNT(*) FROM messages');
    const bookingCount = await client.query('SELECT COUNT(*) FROM bookings');
    const matchCount = await client.query('SELECT COUNT(*) FROM matches');
    const likeCount = await client.query('SELECT COUNT(*) FROM likes');
    const passCount = await client.query('SELECT COUNT(*) FROM passes');

    console.log('📊 Current record counts:');
    console.log(`   Messages: ${messageCount.rows[0].count}`);
    console.log(`   Bookings: ${bookingCount.rows[0].count}`);
    console.log(`   Matches: ${matchCount.rows[0].count}`);
    console.log(`   Likes: ${likeCount.rows[0].count}`);
    console.log(`   Passes: ${passCount.rows[0].count}`);
    console.log('\n🗑️  Deleting records...\n');

    // Delete in correct order to respect foreign key constraints

    // 1. Delete messages (depends on matches)
    console.log('   Deleting messages...');
    await client.query('DELETE FROM messages');
    console.log('   ✓ Deleted all messages');

    // 2. Delete bookings (depends on matches)
    console.log('   Deleting bookings...');
    await client.query('DELETE FROM bookings');
    console.log('   ✓ Deleted all bookings');

    // 3. Delete matches (depends on users)
    console.log('   Deleting matches...');
    await client.query('DELETE FROM matches');
    console.log('   ✓ Deleted all matches');

    // 4. Delete likes (depends on users)
    console.log('   Deleting likes...');
    await client.query('DELETE FROM likes');
    console.log('   ✓ Deleted all likes');

    // 5. Delete passes (depends on users)
    console.log('   Deleting passes...');
    await client.query('DELETE FROM passes');
    console.log('   ✓ Deleted all passes');

    // Commit transaction
    await client.query('COMMIT');

    // Verify deletion
    const finalMessageCount = await client.query('SELECT COUNT(*) FROM messages');
    const finalBookingCount = await client.query('SELECT COUNT(*) FROM bookings');
    const finalMatchCount = await client.query('SELECT COUNT(*) FROM matches');
    const finalLikeCount = await client.query('SELECT COUNT(*) FROM likes');
    const finalPassCount = await client.query('SELECT COUNT(*) FROM passes');
    const userCount = await client.query('SELECT COUNT(*) FROM users');

    console.log('\n✅ Database cleanup completed successfully!\n');
    console.log('📊 Final record counts:');
    console.log(`   Messages: ${finalMessageCount.rows[0].count}`);
    console.log(`   Bookings: ${finalBookingCount.rows[0].count}`);
    console.log(`   Matches: ${finalMatchCount.rows[0].count}`);
    console.log(`   Likes: ${finalLikeCount.rows[0].count}`);
    console.log(`   Passes: ${finalPassCount.rows[0].count}`);
    console.log(`   Users: ${userCount.rows[0].count} (preserved ✓)`);
    console.log('\n🎉 Your database is now clean and ready for production!\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error during cleanup:', error);
    console.error('🔄 Transaction rolled back - no data was deleted.');
    throw error;
  } finally {
    client.release();
    await db.pool.end();
  }
}

// Run cleanup if this file is executed directly
if (require.main === module) {
  cleanTestData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = cleanTestData;
