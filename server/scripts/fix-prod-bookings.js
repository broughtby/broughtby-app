const { Pool } = require('pg');

const prodPool = new Pool({
  connectionString: 'postgresql://broughtby:Iw9r4UncZmcL0LMSi3II95inbEQgQ5Gd@dpg-d3ueuoeuk2gs73dqtcu0-a.ohio-postgres.render.com/broughtby',
  ssl: {
    rejectUnauthorized: false
  }
});

async function fixProdBookings() {
  let client;
  try {
    client = await prodPool.connect();

    console.log('\n🔧 Fixing PRODUCTION database bookings...\n');

    // Find bookings that need updating
    const checkResult = await client.query(`
      SELECT
        id,
        event_name,
        status,
        checked_out_at
      FROM bookings
      WHERE checked_out_at IS NOT NULL
        AND status != 'completed'
      ORDER BY id
    `);

    if (checkResult.rows.length === 0) {
      console.log('✓ No bookings need updating. All checked-out bookings are already marked as completed.\n');
      return;
    }

    console.log(`Found ${checkResult.rows.length} booking(s) to update:\n`);
    checkResult.rows.forEach(b => {
      console.log(`  - Booking #${b.id}: ${b.event_name}`);
      console.log(`    Current status: ${b.status}`);
      console.log(`    Checked out at: ${new Date(b.checked_out_at).toLocaleString()}`);
      console.log('');
    });

    console.log('Updating bookings to "completed" status...\n');

    // Update the bookings
    const updateResult = await client.query(`
      UPDATE bookings
      SET status = 'completed',
          updated_at = CURRENT_TIMESTAMP
      WHERE checked_out_at IS NOT NULL
        AND status != 'completed'
      RETURNING id, event_name, status
    `);

    console.log(`✅ Successfully updated ${updateResult.rows.length} booking(s):\n`);
    updateResult.rows.forEach(b => {
      console.log(`  ✓ Booking #${b.id}: ${b.event_name} → ${b.status}`);
    });
    console.log('');
    console.log('🎉 Done! Users can now leave reviews for these bookings.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    if (client) client.release();
    await prodPool.end();
    process.exit(0);
  }
}

fixProdBookings();
