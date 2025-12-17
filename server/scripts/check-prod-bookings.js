const { Pool } = require('pg');

const prodPool = new Pool({
  connectionString: 'postgresql://broughtby:Iw9r4UncZmcL0LMSi3II95inbEQgQ5Gd@dpg-d3ueuoeuk2gs73dqtcu0-a.ohio-postgres.render.com/broughtby',
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkProdBookings() {
  let client;
  try {
    client = await prodPool.connect();

    console.log('\n🔍 Checking PRODUCTION database...\n');

    // Get all bookings
    const result = await client.query(`
      SELECT
        id,
        event_name,
        event_date,
        status,
        checked_in_at,
        checked_out_at
      FROM bookings
      ORDER BY event_date DESC, id DESC
    `);

    console.log(`Total bookings: ${result.rows.length}\n`);

    if (result.rows.length === 0) {
      console.log('No bookings found in production database.\n');
      return;
    }

    console.log('=== All Bookings ===\n');
    result.rows.forEach(booking => {
      const statusEmoji = booking.status === 'completed' ? '✅' :
                         booking.status === 'confirmed' ? '⏳' :
                         booking.status === 'pending' ? '⏸️' : '❌';

      console.log(`${statusEmoji} Booking #${booking.id}: ${booking.event_name}`);
      console.log(`   Status: ${booking.status.toUpperCase()}`);
      console.log(`   Event Date: ${new Date(booking.event_date).toLocaleDateString()}`);
      console.log(`   Checked In: ${booking.checked_in_at ? 'Yes (' + new Date(booking.checked_in_at).toLocaleString() + ')' : 'No'}`);
      console.log(`   Checked Out: ${booking.checked_out_at ? 'Yes (' + new Date(booking.checked_out_at).toLocaleString() + ')' : 'No'}`);
      console.log('');
    });

    // Find bookings that need updating
    const needsUpdate = result.rows.filter(b =>
      b.checked_out_at !== null && b.status !== 'completed'
    );

    if (needsUpdate.length > 0) {
      console.log(`\n⚠️  Found ${needsUpdate.length} booking(s) that need to be marked as completed:\n`);
      needsUpdate.forEach(b => {
        console.log(`   - Booking #${b.id}: ${b.event_name} (currently: ${b.status})`);
      });
      console.log('\n💡 Run "node server/scripts/fix-prod-bookings.js" to fix these.');
    } else {
      console.log('✓ All checked-out bookings are already marked as completed!\n');
    }

    // Status breakdown
    const statusBreakdown = result.rows.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    }, {});

    console.log('\nStatus breakdown:');
    Object.entries(statusBreakdown).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    if (client) client.release();
    await prodPool.end();
    process.exit(0);
  }
}

checkProdBookings();
