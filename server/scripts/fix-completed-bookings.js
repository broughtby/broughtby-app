const db = require('../config/database');

async function fixCompletedBookings() {
  try {
    console.log('\n🔍 Checking for bookings that need status update...\n');

    // Find bookings that have been checked out but are not marked as completed
    const needsUpdate = await db.query(`
      SELECT id, status, event_date, checked_out_at
      FROM bookings
      WHERE checked_out_at IS NOT NULL
        AND status != 'completed'
      ORDER BY id
    `);

    if (needsUpdate.rows.length === 0) {
      console.log('✓ No bookings need updating. All checked-out bookings are already marked as completed.\n');
      return;
    }

    console.log(`Found ${needsUpdate.rows.length} booking(s) that need to be marked as completed:\n`);
    needsUpdate.rows.forEach(booking => {
      console.log(`  - Booking ID ${booking.id}`);
      console.log(`    Current status: ${booking.status}`);
      console.log(`    Checked out at: ${booking.checked_out_at}`);
      console.log('');
    });

    // Update the bookings
    console.log('Updating bookings to completed status...\n');

    const result = await db.query(`
      UPDATE bookings
      SET status = 'completed',
          updated_at = CURRENT_TIMESTAMP
      WHERE checked_out_at IS NOT NULL
        AND status != 'completed'
      RETURNING id, status
    `);

    console.log(`✓ Successfully updated ${result.rows.length} booking(s) to completed status:\n`);
    result.rows.forEach(booking => {
      console.log(`  - Booking ID ${booking.id} → ${booking.status}`);
    });
    console.log('');

  } catch (error) {
    console.error('❌ Error fixing completed bookings:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run the migration
fixCompletedBookings();
